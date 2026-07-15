#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import {
  buildGapJudgmentSummary,
  renderGapJudgmentSummary,
  selectGapReviewCandidates,
} from "./gap-judge-core.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function parseArgs(argv) {
  const flags = { perRule: 3, includeDeferred: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") flags.report = argv[(index += 1)];
    else if (arg === "--corpus") flags.corpus = argv[(index += 1)];
    else if (arg === "--rule-map") flags.ruleMap = argv[(index += 1)];
    else if (arg === "--output") flags.output = argv[(index += 1)];
    else if (arg === "--judgments") flags.judgments = argv[(index += 1)];
    else if (arg === "--per-rule") flags.perRule = Number.parseInt(argv[(index += 1)], 10);
    else if (arg === "--include-deferred") flags.includeDeferred = true;
    else throw new Error(`redesign-gap-review: unknown argument "${arg}".`);
  }

  return flags;
}

function readJson(path, label) {
  if (!existsSync(path)) throw new Error(`redesign-gap-review: ${label} not found at ${path}.`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function safeRepoPath(root, path) {
  if (typeof path !== "string" || path.length === 0 || isAbsolute(path)) return undefined;
  const candidate = resolve(root, path);
  const rel = relative(root, candidate);
  if (rel === "" || rel === ".." || rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) return undefined;
  if (!existsSync(candidate)) return undefined;
  const realRoot = realpathSync(root);
  const realCandidate = realpathSync(candidate);
  const realRel = relative(realRoot, realCandidate);
  if (realRel === ".." || realRel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) return undefined;
  return realCandidate;
}

function excerptSource(root, path, issue) {
  const absolute = safeRepoPath(root, path);
  if (!absolute) return { path, status: "missing-or-outside-root" };

  const content = readFileSync(absolute, "utf8");
  const lines = content.split(/\r?\n/);
  const declaredLine = Number.isInteger(issue.details?.line) && issue.details.line > 0 ? issue.details.line : undefined;
  const searchTerms = [
    issue.details?.stubName,
    issue.details?.capability,
    ...[...issue.description.matchAll(/["'`]([^"'`]{3,80})["'`]/g)].map((match) => match[1]),
  ].filter((value) => typeof value === "string" && value.length >= 3);
  const matchedLine = searchTerms
    .map((term) => lines.findIndex((line) => line.includes(term)))
    .find((line) => line >= 0);
  const center = declaredLine ? declaredLine - 1 : matchedLine ?? 0;
  const start = Math.max(0, center - 30);
  const end = Math.min(lines.length, start + 90);

  return {
    path,
    status: "read",
    lineStart: start + 1,
    lineEnd: end,
    excerpt: lines.slice(start, end).map((line, offset) => `${String(start + offset + 1).padStart(5)} ${line}`).join("\n"),
  };
}

function latestArtifact(root, type) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  if (!existsSync(indexPath)) return undefined;
  const entries = readJson(indexPath, "artifact index")
    .filter((entry) => entry.type === type || entry.artifactType === type)
    .sort((left, right) => String(right.writtenAt ?? "").localeCompare(String(left.writtenAt ?? "")));
  const path = entries[0]?.path;
  const absolute = safeRepoPath(root, path);
  return absolute ? readJson(absolute, type) : undefined;
}

function relevantRecords(root, files) {
  const targets = new Set(files);
  const findings = latestArtifact(root, "FindingReport")?.findings ?? [];
  const assessments = latestArtifact(root, "AssessmentReport")?.assessments ?? [];
  const select = (record) => (record.files ?? []).some((path) => targets.has(path))
    || (record.subjects ?? []).some((subject) => targets.has(subject));
  const compact = (record) => ({
    id: record.id,
    ruleId: record.ruleId ?? record.type,
    ...(record.kind ? { kind: record.kind } : {}),
    ...(record.severity ? { severity: record.severity } : {}),
    ...(record.title ? { title: record.title } : {}),
    ...(record.description ? { description: record.description } : {}),
    files: record.files ?? [],
    subjects: record.subjects ?? [],
    ...(record.rootCauseKey ? { rootCauseKey: record.rootCauseKey } : {}),
  });

  return {
    findings: findings.filter(select).map(compact),
    assessments: assessments.filter(select).map(compact),
  };
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const reportPath = resolve(flags.report ?? join(repoRoot, "tests/bench/output/report.json"));
  const report = readJson(reportPath, "detailed parity report");
  const corpusRoot = resolve(flags.corpus ?? report.corpusRoot ?? "");
  const manifest = readJson(join(corpusRoot, "corpus.json"), "corpus manifest");
  const ruleMap = readJson(resolve(flags.ruleMap ?? join(repoRoot, "tests/bench/rule-map.json")), "rule map");
  const outputPath = resolve(flags.output ?? join(repoRoot, "tests/bench/output/redesign-gap-review.json"));
  const manifestById = new Map(manifest.repos.map((entry) => [entry.id, entry]));
  const issuesByRepo = {};

  for (const entry of manifest.repos) {
    const classicRoot = resolve(corpusRoot, entry.classicOutput);
    issuesByRepo[entry.id] = readJson(join(classicRoot, "issues.json"), `${entry.id} classic issues`).issues;
  }

  const classifications = flags.includeDeferred
    ? ["missed-redesigned", "missed-deferred"]
    : ["missed-redesigned"];
  const candidates = selectGapReviewCandidates({
    report,
    issuesByRepo,
    ruleMap,
    perRule: flags.perRule,
    classifications,
  });
  const records = candidates.map((candidate) => {
    const manifestEntry = manifestById.get(candidate.repoId);
    const root = resolve(corpusRoot, manifestEntry.root);
    return {
      ...candidate,
      source: candidate.classic.files.slice(0, 3).map((path) => excerptSource(root, path, candidate.classic)),
      currentRekonOutput: relevantRecords(root, candidate.classic.files),
    };
  });
  const packet = {
    schemaVersion: "1.0.0",
    kind: "rekon-redesign-gap-review",
    generatedAt: new Date().toISOString(),
    parityReportGeneratedAt: report.generatedAt,
    sampling: {
      perRule: flags.perRule,
      classifications,
      method: "severity-first, deterministic, round-robin across repositories",
    },
    records,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`);
  process.stdout.write(`redesign-gap-review: wrote ${records.length} local review records to ${outputPath}.\n`);

  if (flags.judgments) {
    const judgments = readJson(resolve(flags.judgments), "gap judgments");
    const summary = buildGapJudgmentSummary(packet, judgments);
    const summaryBase = outputPath.endsWith(".json") ? outputPath.slice(0, -5) : outputPath;
    writeFileSync(`${summaryBase}.summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(`${summaryBase}.summary.md`, renderGapJudgmentSummary(summary));
    process.stdout.write(
      `redesign-gap-review: adjudicated ${summary.adjudicated}/${summary.sampled}; summary at ${summaryBase}.summary.md.\n`,
    );
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import {
  identityHistoryKey,
  selectManifestRepositoriesForReport,
  selectQualityReviewCandidates,
} from "./quality-review-core.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const MAX_SOURCE_BYTES = 2_000_000;

function parseArgs(argv) {
  const flags = { perRule: 5 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") flags.report = argv[(index += 1)];
    else if (arg === "--corpus") flags.corpus = argv[(index += 1)];
    else if (arg === "--output") flags.output = argv[(index += 1)];
    else if (arg === "--per-rule") flags.perRule = Number.parseInt(argv[(index += 1)], 10);
    else throw new Error(`emission-quality-review: unknown argument "${arg}".`);
  }
  return flags;
}

function readJson(path, label) {
  if (!existsSync(path)) throw new Error(`emission-quality-review: ${label} not found at ${path}.`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function safeRepoPath(root, path) {
  if (typeof path !== "string" || path.length === 0 || isAbsolute(path)) return undefined;
  const candidate = resolve(root, path);
  const lexical = relative(root, candidate);
  if (lexical === ".." || lexical.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) return undefined;
  if (!existsSync(candidate)) return undefined;
  const realRoot = realpathSync(root);
  const realCandidate = realpathSync(candidate);
  const physical = relative(realRoot, realCandidate);
  if (physical === ".." || physical.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) return undefined;
  return realCandidate;
}

function artifactEntries(root, type) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  return readJson(indexPath, "artifact index")
    .filter((entry) => entry.type === type || entry.artifactType === type)
    .sort((left, right) => String(right.writtenAt ?? "").localeCompare(String(left.writtenAt ?? "")));
}

function latestArtifact(root, type) {
  const absolute = safeRepoPath(root, artifactEntries(root, type)[0]?.path);
  return absolute ? readJson(absolute, type) : undefined;
}

function buildIdentityHistory(root, type, collection) {
  const history = new Map();
  for (const entry of artifactEntries(root, type)) {
    const absolute = safeRepoPath(root, entry.path);
    if (!absolute) continue;
    const artifact = readJson(absolute, type);
    for (const record of artifact[collection] ?? []) {
      if (typeof record.rootCauseKey !== "string" || typeof record.id !== "string") continue;
      const key = identityHistoryKey(record);
      const values = history.get(key) ?? [];
      values.push({
        recordId: record.id,
        reportId: artifact.header?.artifactId,
        writtenAt: entry.writtenAt,
      });
      history.set(key, values);
    }
  }
  return history;
}

function sourcePaths(record) {
  return [...new Set([
    ...(record.files ?? []),
    ...(record.subjects ?? []).map((subject) => String(subject).split("#")[0]),
  ])].filter((path) => typeof path === "string" && path.length > 0).slice(0, 3);
}

function sourceLine(record) {
  const candidates = [
    record.details?.line,
    record.details?.location?.line,
    record.details?.locations?.[0]?.line,
    record.payload?.line,
  ];
  return candidates.find((value) => Number.isInteger(value) && value > 0);
}

function searchTerms(record) {
  const candidates = [
    record.details?.functionName,
    record.details?.symbol,
    record.details?.stubName,
    record.details?.capability,
    ...(record.payload?.unreferencedExports ?? []),
    ...[...String(record.description ?? "").matchAll(/["'`]([^"'`]{3,100})["'`]/g)].map((match) => match[1]),
  ];
  return [...new Set(candidates.filter((value) => typeof value === "string" && value.length >= 3))];
}

function excerptSource(root, path, record) {
  const absolute = safeRepoPath(root, path);
  if (!absolute) return { path, status: "missing-or-outside-root" };
  const stat = statSync(absolute);
  if (!stat.isFile()) return { path, status: "not-a-file" };
  if (stat.size > MAX_SOURCE_BYTES) return { path, status: "too-large" };

  const lines = readFileSync(absolute, "utf8").split(/\r?\n/);
  const declaredLine = sourceLine(record);
  const matchedLine = searchTerms(record)
    .map((term) => lines.findIndex((line) => line.includes(term)))
    .find((line) => line >= 0);
  const center = declaredLine ? declaredLine - 1 : matchedLine ?? 0;
  const start = Math.max(0, center - 20);
  const end = Math.min(lines.length, start + 60);
  return {
    path,
    status: "read",
    lineStart: start + 1,
    lineEnd: end,
    excerpt: lines.slice(start, end)
      .map((line, offset) => `${String(start + offset + 1).padStart(5)} ${line}`)
      .join("\n"),
  };
}

function matchesTarget(value, targets) {
  if (typeof value !== "string") return false;
  return targets.some((target) => value === target || value.startsWith(`${target}#`) || value.includes(target));
}

function evidenceContext(root, record) {
  const targets = sourcePaths(record);
  return (record.evidence ?? []).slice(0, 3).map((ref) => {
    const absolute = safeRepoPath(root, ref.path);
    if (!absolute) return { ref, status: "missing-or-outside-root" };
    const artifact = readJson(absolute, ref.type ?? "evidence artifact");
    const facts = (artifact.facts ?? []).filter((fact) => (
      matchesTarget(fact.subject, targets) || matchesTarget(fact.provenance?.file, targets)
    )).slice(0, 12);
    const nodes = (artifact.nodes ?? []).filter((node) => matchesTarget(node.id, targets)).slice(0, 12);
    const edges = (artifact.edges ?? []).filter((edge) => (
      matchesTarget(edge.source, targets) || matchesTarget(edge.target, targets)
    )).slice(0, 12);
    const relevantRows = {};
    for (const [key, value] of Object.entries(artifact)) {
      if (!Array.isArray(value) || key === "facts" || key === "nodes" || key === "edges") continue;
      const matches = value.filter((row) => targets.some((target) => JSON.stringify(row).includes(target))).slice(0, 8);
      if (matches.length > 0) relevantRows[key] = matches;
    }
    return {
      ref,
      status: "read",
      artifactType: artifact.header?.artifactType ?? ref.type,
      ...(facts.length > 0 ? { facts } : {}),
      ...(nodes.length > 0 ? { nodes } : {}),
      ...(edges.length > 0 ? { edges } : {}),
      ...(Object.keys(relevantRows).length > 0 ? { relevantRows } : {}),
    };
  });
}

function compactRecord(record) {
  return {
    id: record.id,
    ruleId: record.ruleId ?? record.type,
    ...(record.kind ? { kind: record.kind } : {}),
    ...(record.severity ? { severity: record.severity } : {}),
    ...(record.impact ? { impact: record.impact } : {}),
    title: record.title,
    description: record.description,
    subjects: record.subjects ?? [],
    files: record.files ?? [],
    suggestedAction: record.suggestedAction,
    rootCauseKey: record.rootCauseKey,
    ...(record.confidence ? { confidence: record.confidence } : {}),
    ...(record.details ? { details: record.details } : {}),
    ...(record.payload ? { payload: record.payload } : {}),
  };
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const reportPath = resolve(flags.report ?? join(repoRoot, "tests/bench/output/report.json"));
  const report = readJson(reportPath, "detailed parity report");
  const corpusRoot = resolve(flags.corpus ?? report.corpusRoot ?? "");
  const manifest = readJson(join(corpusRoot, "corpus.json"), "corpus manifest");
  const outputPath = resolve(flags.output ?? join(repoRoot, "tests/bench/output/emission-quality-review.json"));
  const roots = new Map();
  const identityHistories = new Map();
  const selectedManifestRepos = selectManifestRepositoriesForReport(manifest.repos, report.repos);
  const repos = selectedManifestRepos.map((entry) => {
    const root = resolve(corpusRoot, entry.root);
    roots.set(entry.id, root);
    identityHistories.set(entry.id, {
      finding: buildIdentityHistory(root, "FindingReport", "findings"),
      assessment: buildIdentityHistory(root, "AssessmentReport", "assessments"),
    });
    return {
      id: entry.id,
      findings: latestArtifact(root, "FindingReport")?.findings ?? [],
      assessments: latestArtifact(root, "AssessmentReport")?.assessments ?? [],
    };
  });
  const selected = selectQualityReviewCandidates({ repos, perRule: flags.perRule });
  const records = selected.map((entry) => {
    const root = roots.get(entry.repoId);
    const observations = identityHistories.get(entry.repoId)?.[entry.recordType]
      .get(identityHistoryKey(entry.record)) ?? [];
    return {
      repoId: entry.repoId,
      recordType: entry.recordType,
      ruleId: entry.ruleId,
      record: compactRecord(entry.record),
      source: sourcePaths(entry.record).map((path) => excerptSource(root, path, entry.record)),
      evidence: evidenceContext(root, entry.record),
      identityHistory: {
        observations: observations.length,
        distinctRecordIds: [...new Set(observations.map((observation) => observation.recordId))],
        stableAcrossObservedReports: observations.length >= 2
          ? new Set(observations.map((observation) => observation.recordId)).size === 1
          : null,
        recent: observations.slice(0, 8),
      },
      judgmentTemplate: {
        repoId: entry.repoId,
        recordType: entry.recordType,
        recordId: entry.record.id,
        ruleId: entry.ruleId,
        judgment: entry.recordType === "finding" ? "valid|invalid" : "useful|not_useful",
        severity: "accurate|overstated|understated",
        identityStable: "boolean",
        rationale: "source- and evidence-grounded reason",
      },
    };
  });
  const packet = {
    schemaVersion: "1.0.0",
    kind: "rekon-emission-quality-review",
    generatedAt: new Date().toISOString(),
    parityReportGeneratedAt: report.generatedAt,
    sampling: {
      perRuleAndRecordType: flags.perRule,
      method: "impact-first deterministic round-robin across repositories",
    },
    records,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`);
  process.stdout.write(`emission-quality-review: wrote ${records.length} local review records to ${outputPath}.\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

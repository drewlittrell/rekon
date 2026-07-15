#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import {
  applyDefectPairAdjudications,
  buildDefectPairSummary,
  compareDefectPairEmissions,
  validateDefectPairAdjudications,
  validateDefectPairCatalog,
} from "./defect-pair-core.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function parseArgs(argv) {
  const flags = { pairs: [], full: false, skipRefresh: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--corpus") flags.corpus = argv[(index += 1)];
    else if (arg === "--output") flags.output = argv[(index += 1)];
    else if (arg === "--adjudications") flags.adjudications = argv[(index += 1)];
    else if (arg === "--pair") flags.pairs.push(argv[(index += 1)]);
    else if (arg === "--full") flags.full = true;
    else if (arg === "--skip-refresh") flags.skipRefresh = true;
    else throw new Error(`defect-pair-bench: unknown argument "${arg}".`);
  }
  return flags;
}

function parseJson(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch {
    const start = stdout.indexOf("{");
    const end = stdout.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(stdout.slice(start, end + 1));
    throw new Error(`defect-pair-bench: could not parse JSON output for ${label}.`);
  }
}

function runCli(args, label, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      `defect-pair-bench: ${label} failed (exit ${result.status}).\n${(result.stderr || result.stdout || "").slice(-3000)}`,
    );
  }
  return result;
}

function runRefresh(root, pair, mode) {
  const args = ["refresh", "--root", root, "--skip-publish", "--json"];
  if (mode === "focused") {
    for (const path of [...pair.affectedPaths, ...(pair.testPaths ?? [])]) {
      args.push("--changed-file", path);
    }
  }
  const result = runCli(args, `refresh ${pair.id} ${mode}`, { allowFailure: true });
  const parsed = parseJson(result.stdout, `refresh ${pair.id} ${mode}`);
  if (result.status !== 0 && parsed.status !== "partial") {
    throw new Error(
      `defect-pair-bench: refresh ${pair.id} ${mode} failed (exit ${result.status}).\n${(result.stderr || result.stdout || "").slice(-3000)}`,
    );
  }
  return parsed;
}

function latestArtifactBody(root, type) {
  const result = runCli(
    ["artifacts", "latest", "--root", root, "--type", type, "--allow-missing", "--json"],
    `latest ${type}`,
  );
  const parsed = parseJson(result.stdout, `latest ${type}`);
  if (!parsed.artifact) return undefined;
  const artifactPath = parsed.artifact.path;
  const candidates = [
    isAbsolute(artifactPath) ? artifactPath : undefined,
    resolve(root, artifactPath),
    resolve(root, ".rekon", artifactPath),
    resolve(root, ".rekon/artifacts", artifactPath),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return JSON.parse(readFileSync(candidate, "utf8"));
  }
  throw new Error(`defect-pair-bench: could not read ${type} at ${artifactPath}.`);
}

function validateArtifacts(root, label) {
  const result = runCli(["artifacts", "validate", "--root", root, "--json"], `validate ${label}`);
  const parsed = parseJson(result.stdout, `validate ${label}`);
  if (parsed.valid !== true) throw new Error(`defect-pair-bench: artifact validation failed for ${label}.`);
  return parsed;
}

function resolveCorpusRoot(flags) {
  const value = flags.corpus ?? process.env.REKON_DEFECT_PAIR_CORPUS_ROOT;
  if (!value) return undefined;
  return resolve(value);
}

function loadCorpus(root) {
  const path = join(root, "defect-pairs.json");
  if (!existsSync(path)) throw new Error(`defect-pair-bench: no defect-pairs.json at ${root}.`);
  return validateDefectPairCatalog(JSON.parse(readFileSync(path, "utf8")));
}

function renderMarkdown(report) {
  const lines = [
    "# Public Defect-Pair Bench",
    "",
    `Mode: ${report.mode}`,
    `Pairs: ${report.summary.total}`,
    `Captured before the fix: ${report.summary.captured}`,
    `Adjudication required: ${report.summary.adjudicationRequired}`,
    "",
    "| Pair | Category | Status | Coverage | Next action | Before | After |",
    "| --- | --- | --- | --- | --- | ---: | ---: |",
  ];
  for (const row of report.rows) {
    lines.push(
      `| ${row.pairId} | ${row.claim.category} | ${row.status} | ${row.adjudication?.coverage ?? "pending"} | ${row.adjudication?.recommendedAction ?? "pending"} | ${row.before.total} | ${row.after.total} |`,
    );
  }
  lines.push("", "Statuses are measurements. Coverage and next action are source-grounded agent adjudications.", "");
  if (report.summary.adjudicationRequired > 0) {
    lines.push(`${report.summary.adjudicationRequired} row(s) still require adjudication.`, "");
  }
  return lines.join("\n");
}

const flags = parseArgs(process.argv.slice(2));
const corpusRoot = resolveCorpusRoot(flags);
if (!corpusRoot) {
  process.stdout.write(
    "defect-pair-bench: skipped; pass --corpus <path> or set REKON_DEFECT_PAIR_CORPUS_ROOT.\n",
  );
  process.exit(0);
}
if (!existsSync(cliPath)) {
  throw new Error("defect-pair-bench: build Rekon first so packages/cli/dist/index.js exists.");
}

const manifest = loadCorpus(corpusRoot);
const selected = flags.pairs.length > 0
  ? manifest.pairs.filter((pair) => flags.pairs.includes(pair.id))
  : manifest.pairs;
const missing = flags.pairs.filter((id) => !manifest.pairs.some((pair) => pair.id === id));
if (missing.length > 0) throw new Error(`defect-pair-bench: unknown pair(s): ${missing.join(", ")}.`);

const mode = flags.full ? "full" : "focused";
const rows = [];
for (const pair of selected) {
  if (typeof pair.beforeRoot !== "string" || typeof pair.afterRoot !== "string") {
    throw new Error(
      `defect-pair-bench: ${pair.id} has no checkout roots; run bench:defect-pairs:setup first.`,
    );
  }
  const beforeRoot = resolve(corpusRoot, pair.beforeRoot);
  const afterRoot = resolve(corpusRoot, pair.afterRoot);
  if (!flags.skipRefresh) {
    runRefresh(beforeRoot, pair, mode);
    runRefresh(afterRoot, pair, mode);
  }
  validateArtifacts(beforeRoot, `${pair.id} before`);
  validateArtifacts(afterRoot, `${pair.id} after`);

  const beforeFindings = latestArtifactBody(beforeRoot, "FindingReport")?.findings ?? [];
  const beforeAssessments = latestArtifactBody(beforeRoot, "AssessmentReport")?.assessments ?? [];
  const afterFindings = latestArtifactBody(afterRoot, "FindingReport")?.findings ?? [];
  const afterAssessments = latestArtifactBody(afterRoot, "AssessmentReport")?.assessments ?? [];
  rows.push({
    ...compareDefectPairEmissions({
      pair,
      beforeFindings,
      beforeAssessments,
      afterFindings,
      afterAssessments,
    }),
    upstream: pair.upstream,
    revisions: { buggy: pair.buggyCommit, fixed: pair.fixedCommit },
  });
  process.stdout.write(`defect-pair-bench: ${pair.id} -> ${rows.at(-1).status}.\n`);
}

const adjudications = flags.adjudications
  ? validateDefectPairAdjudications(
    JSON.parse(readFileSync(resolve(flags.adjudications), "utf8")),
    manifest,
  )
  : undefined;
const adjudicatedRows = adjudications ? applyDefectPairAdjudications(rows, adjudications) : rows;
const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  mode,
  summary: buildDefectPairSummary(adjudicatedRows),
  rows: adjudicatedRows,
};
const outputRoot = resolve(flags.output ?? join(repoRoot, "tests/bench/output/public-defect-pairs"));
mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(join(outputRoot, "report.md"), renderMarkdown(report), "utf8");
process.stdout.write(`defect-pair-bench: wrote ${join(outputRoot, "report.json")} and report.md.\n`);

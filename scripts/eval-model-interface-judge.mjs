#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateModelInterfaceFixture } from "./lib/model-interface-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const fixturePath = resolve(root, options.fixture);
const judgmentsPath = resolve(root, options.judgments);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const judgments = JSON.parse(await readFile(judgmentsPath, "utf8"));
const deterministic = evaluateModelInterfaceFixture(fixture);
const judgmentById = new Map(judgments.cases.map((entry) => [entry.id, entry]));
const fixtureIds = new Set(deterministic.cases.map((entry) => entry.id));
const issues = [];
const cases = deterministic.cases.map((entry) => {
  const judgment = judgmentById.get(entry.id);
  const caseIssues = validateJudgment(entry, judgment);
  issues.push(...caseIssues.map((issue) => `${entry.id}: ${issue}`));
  return {
    id: entry.id,
    shape: entry.shape,
    deterministicPassed: entry.passed,
    selectionDigest: entry.selectionDigest,
    selection: entry.selection,
    metrics: entry.metrics,
    judgment: judgment ?? null,
    valid: entry.passed && caseIssues.length === 0 && judgment?.verdict === "keep"
      && judgment.contextSufficient === true && judgment.pactSufficient === true,
  };
});
for (const judgment of judgments.cases) {
  if (!fixtureIds.has(judgment.id)) issues.push(`${judgment.id}: judgment has no matching fixture case`);
}

const generatedAt = new Date().toISOString();
const acceptedCases = cases.filter((entry) => entry.valid).length;
const report = {
  schemaVersion: "1.0.0",
  generatedAt,
  modelCalls: 0,
  sourceRetention: "none",
  fixture: relative(root, fixturePath),
  judgments: relative(root, judgmentsPath),
  reviewer: judgments.reviewer,
  policyHypothesis: judgments.policyHypothesis,
  gitCommit: gitCommit(),
  passed: deterministic.passed && issues.length === 0 && acceptedCases === cases.length,
  summary: {
    cases: cases.length,
    acceptedCases,
    failedCases: cases.length - acceptedCases,
    staleJudgments: issues.filter((issue) => issue.includes("digest")).length,
    toleratedAvoidableRefs: cases.reduce(
      (count, entry) => count + (entry.judgment?.avoidableRefs?.length ?? 0),
      0,
    ),
    deterministic: deterministic.summary,
  },
  issues,
  cases,
};

if (!options.noRecord) {
  const outputPath = resolve(root, options.output);
  const ledgerPath = resolve(root, options.ledger);
  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(dirname(ledgerPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  await appendFile(ledgerPath, `${JSON.stringify({
    generatedAt,
    gitCommit: report.gitCommit,
    reviewer: report.reviewer,
    policyHypothesis: report.policyHypothesis,
    passed: report.passed,
    summary: report.summary,
    cases: report.cases.map((entry) => ({
      id: entry.id,
      selectionDigest: entry.selectionDigest,
      verdict: entry.judgment?.verdict,
      metrics: entry.metrics,
      avoidableRefs: entry.judgment?.avoidableRefs ?? [],
    })),
    report: relative(root, outputPath),
  })}\n`);
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;

function validateJudgment(evaluation, judgment) {
  if (!judgment) return ["missing Codex judgment"];
  const result = [];
  if (judgment.selectionDigest !== evaluation.selectionDigest) {
    result.push(`selection digest is stale (${judgment.selectionDigest} != ${evaluation.selectionDigest})`);
  }
  if (judgment.verdict !== "keep" && judgment.verdict !== "adjust") result.push("invalid verdict");
  if (typeof judgment.contextSufficient !== "boolean") result.push("contextSufficient must be boolean");
  if (typeof judgment.pactSufficient !== "boolean") result.push("pactSufficient must be boolean");
  if (!Array.isArray(judgment.missingRefs)) result.push("missingRefs must be an array");
  if (!Array.isArray(judgment.avoidableRefs)) result.push("avoidableRefs must be an array");
  if (typeof judgment.note !== "string" || judgment.note.trim().length === 0) result.push("note is required");
  for (const ref of judgment.avoidableRefs ?? []) {
    if (!evaluation.selection.selectedRefs.includes(ref)) result.push(`avoidable ref is not selected: ${ref}`);
  }
  for (const ref of judgment.missingRefs ?? []) {
    if (evaluation.selection.selectedRefs.includes(ref)) result.push(`missing ref is already selected: ${ref}`);
  }
  return result;
}

function parseArgs(args) {
  const options = {
    fixture: "tests/fixtures/model-interface-eval/cases.json",
    judgments: "tests/fixtures/model-interface-eval/judgments.json",
    output: ".rekon-dev/evals/model-interface-judge-latest.json",
    ledger: ".rekon-dev/evals/model-interface-agent-ledger.jsonl",
    noRecord: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--no-record") options.noRecord = true;
    else if (arg === "--fixture") options.fixture = requiredValue(args, ++index, arg);
    else if (arg === "--judgments") options.judgments = requiredValue(args, ++index, arg);
    else if (arg === "--output") options.output = requiredValue(args, ++index, arg);
    else if (arg === "--ledger") options.ledger = requiredValue(args, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function requiredValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

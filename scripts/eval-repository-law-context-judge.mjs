#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { evaluateRepositoryLawContextFixture } from "./lib/repository-law-context-eval.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const fixtureRoot = resolve(root, "tests/fixtures/repository-law-context-eval");
const fixture = JSON.parse(await readFile(resolve(fixtureRoot, "cases.json"), "utf8"));
const judgments = JSON.parse(await readFile(resolve(fixtureRoot, "judgments.json"), "utf8"));
const evaluation = evaluateRepositoryLawContextFixture(fixture);
const issues = [];

for (const entry of evaluation.cases) {
  const judgment = judgments.judgments.find((candidate) => candidate.caseId === entry.id);
  if (!judgment) {
    issues.push({ caseId: entry.id, code: "judgment-missing" });
    continue;
  }
  if (judgment.selectionDigest !== entry.selectionDigest) {
    issues.push({ caseId: entry.id, code: "selection-digest-mismatch" });
  }
  if (judgment.verdict !== "accepted") {
    issues.push({ caseId: entry.id, code: "judgment-not-accepted" });
  }
  if (!Array.isArray(judgment.reasons) || judgment.reasons.length === 0) {
    issues.push({ caseId: entry.id, code: "judgment-reasons-missing" });
  }
}

const report = {
  passed: evaluation.passed && issues.length === 0,
  summary: {
    modelCalls: 0,
    cases: evaluation.cases.length,
    currentJudgments: evaluation.cases.length - issues.filter((issue) => issue.code === "selection-digest-mismatch").length,
    accepted: evaluation.cases.length - issues.filter((issue) => issue.code === "judgment-not-accepted").length,
    issues: issues.length,
  },
  issues,
};

console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;

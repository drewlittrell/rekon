// Docs tests for the Plan Actionability Answer / Merge-Back Decision (slice 133).

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}
function normalized(rel) {
  return read(rel).replace(/[`*]/g, "").replace(/\s+/g, " ").toLowerCase();
}

const memo = "docs/strategy/plan-actionability-answer-merge-back-decision.md";
const reviewPacket = ".rekon-dev/review-packets/plan-actionability-answer-merge-back-decision.md";
const changelog = "CHANGELOG.md";

const doc = () => normalized(memo);

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "# Plan Actionability Answer / Merge-Back Decision",
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Gap",
    "## Options Considered",
    "## Recommendation",
    "## Report Revision Model",
    "## Answer Shape Model",
    "## Merge-Back Model",
    "## Re-Evaluation Model",
    "## CLI Model",
    "## Boundary Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  const text = read(memo);
  for (const h of headings) assert.ok(text.includes(h), `missing heading: ${h}`);
});

// ---------- 3 ----------
test("doc selects new report revision", () => {
  assert.ok(doc().includes("new report revision | selected"));
});

// ---------- 4 ----------
test("doc says answer/merge-back creates a new IntentPlanActionabilityReport revision rather than mutating the existing report", () => {
  assert.ok(doc().includes("answer/merge-back creates a new intentplanactionabilityreport revision rather than mutating the existing report"));
});

// ---------- 5 ----------
test("doc says answer/merge-back does not write to the source plan file", () => {
  assert.ok(doc().includes("answer/merge-back does not write to the source plan file"));
});

// ---------- 6 ----------
test("doc says answers are tied to existing elicitationQuestions by question id", () => {
  assert.ok(doc().includes("answers are tied to existing elicitationquestions by question id"));
});

// ---------- 7 ----------
test("doc says merge-back re-runs actionability checks after applying answers", () => {
  assert.ok(doc().includes("merge-back re-runs actionability checks after applying answers"));
});

// ---------- 8 ----------
test("doc says incomplete answers keep the report needs-revision or blocked", () => {
  assert.ok(doc().includes("incomplete answers keep the report needs-revision or blocked"));
});

// ---------- 9 ----------
test("doc says answer/merge-back does not approve plans", () => {
  assert.ok(doc().includes("answer/merge-back does not approve plans"));
});

// ---------- 10 ----------
test("doc says answer/merge-back creates no PreparedIntentPlan", () => {
  assert.ok(doc().includes("answer/merge-back creates no preparedintentplan"));
});

// ---------- 11 ----------
test("doc says answer/merge-back creates no WorkOrder", () => {
  assert.ok(doc().includes("answer/merge-back creates no workorder"));
});

// ---------- 12 ----------
test("doc says answer/merge-back creates no VerificationPlan", () => {
  assert.ok(doc().includes("answer/merge-back creates no verificationplan"));
});

// ---------- 13 ----------
test("doc says answer/merge-back executes no commands", () => {
  assert.ok(doc().includes("answer/merge-back executes no commands"));
});

// ---------- 14 ----------
test("doc says answer/merge-back writes no source files", () => {
  assert.ok(doc().includes("answer/merge-back writes no source files"));
});

// ---------- 15 ----------
test("doc says answer/merge-back runs no Circe", () => {
  assert.ok(doc().includes("answer/merge-back runs no circe"));
});

// ---------- 16 ----------
test("doc says intent:go remains deferred", () => {
  assert.ok(doc().includes("intent:go remains deferred"));
});

// ---------- 17 ----------
test("doc includes option table", () => {
  assert.ok(doc().includes("| option | decision | reason |"));
});

// ---------- 18 ----------
test("doc includes answer mapping table", () => {
  assert.ok(doc().includes("| answer shape | merge target |"));
});

// ---------- 19 ----------
test("doc includes boundary table", () => {
  assert.ok(doc().includes("| boundary | decision |"));
});

// ---------- 20 ----------
test("doc includes sequence table", () => {
  assert.ok(doc().includes("| step | result |"));
});

// ---------- 21 ----------
test("CHANGELOG mentions Plan Actionability Answer / Merge-Back Decision", () => {
  assert.ok(normalized(changelog).includes("plan actionability answer / merge-back decision"));
});

// ---------- 22 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

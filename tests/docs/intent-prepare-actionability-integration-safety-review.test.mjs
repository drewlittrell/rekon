// Docs tests for the Intent Prepare Actionability Integration Safety Review (slice 132).

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

const memo = "docs/strategy/intent-prepare-actionability-integration-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/intent-prepare-actionability-integration-safety-review.md";
const changelog = "CHANGELOG.md";

const doc = () => normalized(memo);
const raw = () => read(memo);

// ---------- 1 ----------
test("safety review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "# Intent Prepare Actionability Integration Safety Review",
    "## Decision Summary",
    "## Why This Review Exists",
    "## Implementation Reviewed",
    "## Non-Actionable Report Path Review",
    "## Actionable Report Path Review",
    "## Prepared Plan Mapping Review",
    "## CLI Review",
    "## Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  const text = raw();
  for (const h of headings) assert.ok(text.includes(h), `missing heading: ${h}`);
});

// ---------- 3 ----------
test("doc says intent prepare respects IntentPlanActionabilityReport", () => {
  assert.ok(doc().includes("intent prepare respects intentplanactionabilityreport"));
});

// ---------- 4 ----------
test("doc says non-actionable reports block preparation", () => {
  assert.ok(doc().includes("non-actionable reports block preparation"));
});

// ---------- 5 ----------
test("doc says blocked preparation writes no PreparedIntentPlan", () => {
  assert.ok(doc().includes("blocked preparation writes no preparedintentplan"));
});

// ---------- 6 ----------
test("doc says blocked preparation preserves revisionPrompt", () => {
  assert.ok(doc().includes("blocked preparation preserves revisionprompt"));
});

// ---------- 7 ----------
test("doc says actionable reports may feed PreparedIntentPlan generation", () => {
  assert.ok(doc().includes("actionable reports may feed preparedintentplan generation"));
});

// ---------- 8 ----------
test("doc says PreparedIntentPlan records the IntentPlanActionabilityReport ref", () => {
  assert.ok(doc().includes("preparedintentplan records the intentplanactionabilityreport ref"));
});

// ---------- 9 ----------
test("doc says prepare does not auto-approve", () => {
  assert.ok(doc().includes("prepare does not auto-approve"));
});

// ---------- 10 ----------
test("doc says prepare creates no WorkOrder", () => {
  assert.ok(doc().includes("prepare creates no workorder"));
});

// ---------- 11 ----------
test("doc says prepare creates no VerificationPlan", () => {
  assert.ok(doc().includes("prepare creates no verificationplan"));
});

// ---------- 12 ----------
test("doc says prepare creates no VerificationRun or VerificationResult", () => {
  assert.ok(doc().includes("prepare creates no verificationrun or verificationresult"));
});

// ---------- 13 ----------
test("doc says prepare executes no commands", () => {
  assert.ok(doc().includes("prepare executes no commands"));
});

// ---------- 14 ----------
test("doc says prepare writes no source files", () => {
  assert.ok(doc().includes("prepare writes no source files"));
});

// ---------- 15 ----------
test("doc says prepare runs no Circe", () => {
  assert.ok(doc().includes("prepare runs no circe"));
});

// ---------- 16 ----------
test("doc says intent:go remains deferred", () => {
  assert.ok(doc().includes("intent:go remains deferred"));
});

// ---------- 17 ----------
test("doc says answer/merge-back remains deferred", () => {
  assert.ok(doc().includes("answer/merge-back remains deferred"));
});

// ---------- 18 ----------
test("doc includes surface table", () => {
  assert.ok(doc().includes("| surface | status | safety finding |"));
});

// ---------- 19 ----------
test("doc includes mapping table", () => {
  assert.ok(doc().includes("| report field | preparedintentplan mapping |"));
});

// ---------- 20 ----------
test("doc includes boundary table", () => {
  assert.ok(doc().includes("| boundary | decision |"));
});

// ---------- 21 ----------
test("doc includes option table", () => {
  assert.ok(doc().includes("| option | decision | reason |"));
});

// ---------- 22 ----------
test("CHANGELOG mentions Intent Prepare Actionability Integration Safety Review", () => {
  assert.ok(normalized(changelog).includes("intent prepare actionability integration safety review"));
});

// ---------- 23 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

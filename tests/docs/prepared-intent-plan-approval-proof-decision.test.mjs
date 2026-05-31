// Docs tests for the PreparedIntentPlan Approval / Proof Model Decision
// (eighty-second slice on the capability-ontology track). Strategy /
// architecture-decision batch: amends the PreparedIntentPlan architecture to
// require an approval/proof envelope. No artifact is implemented or changed.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const memo = "docs/strategy/prepared-intent-plan-approval-proof-decision.md";
const reviewPacket = ".rekon-dev/review-packets/prepared-intent-plan-approval-proof-decision.md";

const REQUIRED_HEADINGS = [
  "# PreparedIntentPlan Approval / Proof Model Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Classic Proof Discipline",
  "## Current PreparedIntentPlan Boundary",
  "## Options Considered",
  "## Recommendation",
  "## Approval Model",
  "## Proof Model",
  "## Prepared Status Rule",
  "## Approval Policy",
  "## Plan Structure Proof",
  "## Verification Proof",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*PreparedIntentPlan Approval \/ Proof Model Decision/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("memo selects the required approval/proof envelope", () => {
  assert.match(normalize(read(memo)), /selects the required approval\/proof envelope/);
});

// ---------- 4 ----------
test("memo says PreparedIntentPlan must be proof-approved, not merely generated", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan must be proof-approved, not merely generated\./);
});

// ---------- 5 ----------
test("memo says prepared requires approval.status approved", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan\.status\.value can be prepared only when approval\.status is approved\./);
});

// ---------- 6 ----------
test("memo says a plan with phases but without approval is not prepared", () => {
  assert.match(normalize(read(memo)), /A plan with phases but without approval is not prepared\./);
});

// ---------- 7 ----------
test("memo says verification requirements are proof obligations, not VerificationPlan", () => {
  assert.match(normalize(read(memo)), /Verification requirements are proof obligations, not VerificationPlan\./);
});

// ---------- 8 ----------
test("memo says PreparedIntentPlan does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not create WorkOrder or VerificationPlan\./);
});

// ---------- 9 ----------
test("memo says PreparedIntentPlan does not execute commands", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not execute commands\./);
});

// ---------- 10 ----------
test("memo says PreparedIntentPlan does not write source files", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not write source files\./);
});

// ---------- 11 ----------
test("memo says intent:go remains deferred", () => {
  assert.match(normalize(read(memo)), /intent:go remains deferred\./);
});

// ---------- 12 ----------
test("memo includes option table with the selected option", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /required approval\/proof envelope \| selected \| preserves classic plan authorization/);
});

// ---------- 13 ----------
test("memo includes approval table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Condition \| Approval Decision \|/);
  assert.match(text, /assessment ready-for-prepare and proof passes \| approved/);
});

// ---------- 14 ----------
test("memo includes proof table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Proof Area \| Required Evidence \|/);
  assert.match(text, /assessment \| IntentAssessmentReport ref \+ readiness/);
});

// ---------- 15 ----------
test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /approval vs WorkOrder \| no work artifact creation/);
});

// ---------- 16 ----------
test("CHANGELOG ships the PreparedIntentPlan Approval / Proof Model Decision entry", () => {
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the PreparedIntentPlan Approval \/ Proof Model Decision/);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

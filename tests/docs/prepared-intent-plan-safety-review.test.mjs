// Docs tests for the PreparedIntentPlan Safety Review (eighty-fourth slice on
// the capability-ontology track). Strategy / safety-review batch: reviews the
// amended PreparedIntentPlan v1 implementation. No artifact or runtime behavior
// is changed.

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

const memo = "docs/strategy/prepared-intent-plan-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/prepared-intent-plan-safety-review.md";

const REQUIRED_HEADINGS = [
  "# PreparedIntentPlan Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Artifact And CLI Reviewed",
  "## Approval / Proof Envelope Review",
  "## Prepared Status Rule Review",
  "## Plan Structure Proof Review",
  "## Verification Requirement Review",
  "## WorkOrder / VerificationPlan Boundary Review",
  "## Command / Source-Write Boundary Review",
  "## Intent Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

// ---------- 1 ----------
test("safety review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*PreparedIntentPlan Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("doc says PreparedIntentPlan must be proof-approved, not merely generated", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan must be proof-approved, not merely generated\./);
});

// ---------- 4 ----------
test("doc says status.value can be prepared only when approval.status is approved", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan\.status\.value can be prepared only when approval\.status is approved\./);
});

// ---------- 5 ----------
test("doc says a plan with phases but without approval is not prepared", () => {
  assert.match(normalize(read(memo)), /A plan with phases but without approval is not prepared\./);
});

// ---------- 6 ----------
test("doc says verification requirements are proof obligations, not VerificationPlan", () => {
  assert.match(normalize(read(memo)), /Verification requirements are proof obligations, not VerificationPlan\./);
});

// ---------- 7 ----------
test("doc says PreparedIntentPlan does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not create WorkOrder or VerificationPlan\./);
});

// ---------- 8 ----------
test("doc says PreparedIntentPlan does not create VerificationRun or VerificationResult", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not create VerificationRun or VerificationResult\./);
});

// ---------- 9 ----------
test("doc says PreparedIntentPlan does not execute commands", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not execute commands\./);
});

// ---------- 10 ----------
test("doc says PreparedIntentPlan does not write source files", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not write source files\./);
});

// ---------- 11 ----------
test("doc says IntentStatusReport remains the next layer after preparation", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport remains the next layer after preparation\./);
});

// ---------- 12 ----------
test("doc says intent:go remains deferred", () => {
  assert.match(normalize(read(memo)), /intent:go remains deferred\./);
});

// ---------- 13 ----------
test("doc includes surface table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Surface \| Status \| Boundary \|/);
  assert.match(text, /PreparedIntentPlan artifact \| shipped \| proof-approved preparation/);
});

// ---------- 14 ----------
test("doc includes approval table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Condition \| V1 Behavior \|/);
  assert.match(text, /ready-for-prepare \+ proof passes \| approved/);
});

// ---------- 15 ----------
test("doc includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /PreparedIntentPlan vs WorkOrder \| phase\/gate preparation vs implementation guidance/);
});

// ---------- 16 ----------
test("doc includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /declare v1 safe\/stable proof-approved preparation \| selected \| approval envelope enforces proof/);
});

// ---------- 17 ----------
test("CHANGELOG mentions PreparedIntentPlan safety review", () => {
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the PreparedIntentPlan safety review/);
});

// ---------- 18 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

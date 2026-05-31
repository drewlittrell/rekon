// Docs tests for the IntentStatusReport Safety Review (eighty-seventh slice on
// the capability-ontology track). Strategy / safety-review batch: reviews the
// shipped IntentStatusReport v1. No artifact or runtime behavior is changed.

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

const memo = "docs/strategy/intent-status-report-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/intent-status-report-safety-review.md";

const REQUIRED_HEADINGS = [
  "# IntentStatusReport Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Artifact And CLI Reviewed",
  "## Status Model Review",
  "## Proof Rollup Review",
  "## Prepared Plan Approval Boundary Review",
  "## WorkOrder / VerificationPlan Boundary Review",
  "## Verification Boundary Review",
  "## Command / Source-Write Boundary Review",
  "## Intent Go Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

// ---------- 1 ----------
test("safety review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*IntentStatusReport Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("doc says IntentStatusReport is status reporting, not VerificationResult", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport is status reporting, not VerificationResult\./);
});

// ---------- 4 ----------
test("doc says IntentStatusReport is not WorkOrder", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport is not WorkOrder\./);
});

// ---------- 5 ----------
test("doc says IntentStatusReport does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport does not create WorkOrder or VerificationPlan\./);
});

// ---------- 6 ----------
test("doc says IntentStatusReport does not create VerificationRun or VerificationResult", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport does not create VerificationRun or VerificationResult\./);
});

// ---------- 7 ----------
test("doc says IntentStatusReport does not execute commands", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport does not execute commands\./);
});

// ---------- 8 ----------
test("doc says IntentStatusReport does not write source files", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport does not write source files\./);
});

// ---------- 9 ----------
test("doc says IntentStatusReport does not implement intent:go", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport does not implement intent:go\./);
});

// ---------- 10 ----------
test("doc says IntentStatusReport reports PreparedIntentPlan approval state but does not approve plans", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport reports PreparedIntentPlan approval state but does not approve plans\./);
});

// ---------- 11 ----------
test("doc says VerificationResult is an input to status, not the status artifact itself", () => {
  assert.match(normalize(read(memo)), /VerificationResult is an input to status, not the status artifact itself\./);
});

// ---------- 12 ----------
test("doc says WorkOrder / VerificationPlan generation remains deferred to a separate decision", () => {
  assert.match(normalize(read(memo)), /WorkOrder \/ VerificationPlan generation remains deferred to a separate decision\./);
});

// ---------- 13 ----------
test("doc includes surface table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Surface \| Status \| Boundary \|/);
  assert.match(text, /IntentStatusReport artifact \| shipped \| read-only status rollup/);
});

// ---------- 14 ----------
test("doc includes status table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Status Area \| V1 Behavior \|/);
  assert.match(text, /preparation \| reports status and approvalStatus/);
});

// ---------- 15 ----------
test("doc includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /IntentStatusReport vs WorkOrder \| reports work state, creates nothing/);
});

// ---------- 16 ----------
test("doc includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /declare v1 safe\/stable status rollup \| selected \| read-only reporting holds/);
});

// ---------- 17 ----------
test("CHANGELOG mentions IntentStatusReport safety review", () => {
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the IntentStatusReport safety review/);
});

// ---------- 18 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

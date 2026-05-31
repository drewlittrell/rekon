// Docs tests for the IntentAssessmentReport safety review (seventy-ninth slice
// on the capability-ontology track). Strategy / safety-review batch: read-only
// review of the shipped IntentAssessmentReport v1; no runtime behavior change.

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

const memo = "docs/strategy/intent-assessment-report-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/intent-assessment-report-safety-review.md";

const REQUIRED_HEADINGS = [
  "# IntentAssessmentReport Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Artifact And CLI Reviewed",
  "## Request / Scope Review",
  "## Readiness Model Review",
  "## Blocker Model Review",
  "## Matched Context Review",
  "## Runtime Drift Dependency Review",
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
  assert.match(read(memo), /#\s*IntentAssessmentReport Safety Review/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("memo says IntentAssessmentReport is assessment, not WorkOrder", () => {
  assert.match(normalize(read(memo)), /IntentAssessmentReport is assessment, not WorkOrder\./);
});

// ---------- 4 ----------
test("memo says IntentAssessmentReport does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /IntentAssessmentReport does not create WorkOrder or VerificationPlan\./);
});

// ---------- 5 ----------
test("memo says IntentAssessmentReport does not create VerificationRun or VerificationResult", () => {
  assert.match(normalize(read(memo)), /IntentAssessmentReport does not create VerificationRun or VerificationResult\./);
});

// ---------- 6 ----------
test("memo says IntentAssessmentReport does not execute commands", () => {
  assert.match(normalize(read(memo)), /IntentAssessmentReport does not execute commands\./);
});

// ---------- 7 ----------
test("memo says IntentAssessmentReport does not write source files", () => {
  assert.match(normalize(read(memo)), /IntentAssessmentReport does not write source files\./);
});

// ---------- 8 ----------
test("memo says PreparedIntentPlan remains the next layer after assessment", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan remains the next layer after assessment\./);
});

// ---------- 9 ----------
test("memo says IntentStatusReport remains deferred", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport remains deferred\./);
});

// ---------- 10 ----------
test("memo says intent:go remains deferred", () => {
  assert.match(normalize(read(memo)), /intent:go remains deferred\./);
});

// ---------- 11 ----------
test("memo says RuntimeGraphDriftReport is an input to readiness, not the intent system itself", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport is an input to readiness, not the intent system itself\./);
});

// ---------- 12 ----------
test("memo includes surface table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Surface \| Status \| Boundary \|/);
  assert.match(text, /IntentAssessmentReport artifact \| shipped \| read-only assessment/);
});

// ---------- 13 ----------
test("memo includes readiness table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Readiness \| V1 Meaning \|/);
  assert.match(text, /ready-for-prepare \| enough context to prepare safely/);
});

// ---------- 14 ----------
test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /IntentAssessmentReport vs WorkOrder \| assessment vs implementation guidance/);
});

// ---------- 15 ----------
test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /declare v1 safe\/stable assessment \| selected/);
});

// ---------- 16 ----------
test("CHANGELOG ships the IntentAssessmentReport safety review entry", () => {
  // Tightened past the slice-78 "next slice" forward pointer.
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the IntentAssessmentReport safety review/);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

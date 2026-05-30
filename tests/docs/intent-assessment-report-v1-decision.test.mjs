// Docs tests for the IntentAssessmentReport v1 decision (seventy-seventh slice
// on the capability-ontology track). Strategy / architecture-decision batch:
// fixes the v1 shape, inputs, readiness model, and blocker model for the first
// artifact of the staged Rekon intent spine. No artifact is implemented here.

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

const memo = "docs/strategy/intent-assessment-report-v1-decision.md";
const reviewPacket = ".rekon-dev/review-packets/intent-assessment-report-v1-decision.md";

const REQUIRED_HEADINGS = [
  "# IntentAssessmentReport v1 Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Boundary",
  "## Options Considered",
  "## Recommendation",
  "## Request / Scope Model",
  "## Input Model",
  "## Readiness Model",
  "## Blocker Model",
  "## Matched Context Model",
  "## Boundary Model",
  "## Follow-On Artifacts",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*IntentAssessmentReport v1 Decision/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("memo selects the artifact-backed readiness assessment", () => {
  assert.match(normalize(read(memo)), /selects the artifact-backed readiness assessment/);
});

// ---------- 4 ----------
test("memo says IntentAssessmentReport is assessment, not WorkOrder", () => {
  assert.match(normalize(read(memo)), /IntentAssessmentReport is assessment, not WorkOrder\./);
});

// ---------- 5 ----------
test("memo says IntentAssessmentReport does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /IntentAssessmentReport does not create WorkOrder or VerificationPlan\./);
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
test("memo includes option table with the selected option", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /artifact-backed readiness assessment \| selected \| preserves gate\/staleness behavior/);
});

// ---------- 13 ----------
test("memo includes input table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Input \| V1 Decision \|/);
  assert.match(text, /user request \/ goal \| required/);
});

// ---------- 14 ----------
test("memo includes readiness table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Readiness \| Meaning \|/);
  assert.match(text, /ready-for-prepare \| enough context to prepare safely/);
});

// ---------- 15 ----------
test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /IntentAssessmentReport vs WorkOrder \| assessment vs implementation guidance/);
});

// ---------- 16 ----------
test("CHANGELOG ships the IntentAssessmentReport v1 decision entry", () => {
  // Tightened past the slice-76 "next slice" forward pointer so this gates the
  // actual slice-77 entry, not the prior slice's recommendation.
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the IntentAssessmentReport v1 decision/);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

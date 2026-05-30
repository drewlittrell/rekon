// Docs tests for the Intent Capability Spine Integration Review (seventy-sixth
// slice on the capability-ontology track). Strategy / architecture-review
// batch: maps classic intent surfaces onto the Rekon artifact spine and
// selects the next implementation slice. No intent is implemented here.

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

const memo = "docs/strategy/intent-capability-spine-integration-review.md";
const reviewPacket = ".rekon-dev/review-packets/intent-capability-spine-integration-review.md";

const REQUIRED_HEADINGS = [
  "# Intent Capability Spine Integration Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Classic Intent Source Reviewed",
  "## Classic Intent Surfaces",
  "## Current Rekon Spine",
  "## Gap Matrix",
  "## Options Considered",
  "## Recommendation",
  "## IntentAssessmentReport Model",
  "## PreparedIntentPlan Model",
  "## IntentStatusReport Model",
  "## Intent Go Boundary",
  "## Runtime Drift / Handoff Dependency",
  "## WorkOrder / Verification Boundary",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1 ----------
test("integration review memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*Intent Capability Spine Integration Review/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("classic surface table maps intent:assess to IntentAssessmentReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Classic Surface \| Role \| Rekon Mapping \|/);
  assert.match(text, /intent:assess \| read-only classification \| IntentAssessmentReport/);
});

// ---------- 4 ----------
test("classic surface table maps intent:prepare to PreparedIntentPlan", () => {
  assert.match(normalize(read(memo)), /intent:prepare \| phase artifact generation \| PreparedIntentPlan/);
});

// ---------- 5 ----------
test("classic surface table maps intent:status to IntentStatusReport", () => {
  assert.match(normalize(read(memo)), /intent:status \| read-only lifecycle inspection \| IntentStatusReport/);
});

// ---------- 6 ----------
test("memo says intent:go remains deferred", () => {
  assert.match(normalize(read(memo)), /intent:go remains deferred\./);
});

// ---------- 7 ----------
test("memo says IntentAssessmentReport is not WorkOrder", () => {
  assert.match(normalize(read(memo)), /IntentAssessmentReport is not WorkOrder\./);
});

// ---------- 8 ----------
test("memo says PreparedIntentPlan is not source-write execution", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan is not source-write execution\./);
});

// ---------- 9 ----------
test("memo says IntentStatusReport is not VerificationResult", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport is not VerificationResult\./);
});

// ---------- 10 ----------
test("memo says RuntimeGraphDriftReport is an input to intent readiness, not the intent system itself", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport is an input to intent readiness, not the intent system itself\./);
});

// ---------- 11 ----------
test("memo says intent parity depends on the full graph spine", () => {
  assert.match(normalize(read(memo)), /Intent parity depends on StepCapabilityGraph, HandoffContract, HandoffCoverageReport, RuntimeGraphObservationReport, and RuntimeGraphDriftReport\./);
});

// ---------- 12 ----------
test("memo says no source-write behavior ships in this review", () => {
  assert.match(normalize(read(memo)), /No source-write behavior ships in this review\./);
});

// ---------- 13 ----------
test("memo includes input dependency table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Rekon Artifact \| Intent Use \|/);
  assert.match(text, /HandoffCoverageReport \| handoff coverage readiness/);
});

// ---------- 14 ----------
test("memo includes option table with Option B selected", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /staged intent artifact spine \| selected/);
});

// ---------- 15 ----------
test("memo includes implementation sequence table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Stage \| Next Role \|/);
  assert.match(text, /IntentAssessmentReport \| first implementation target/);
});

// ---------- 16 ----------
test("recommendation ships IntentAssessmentReport first", () => {
  assert.match(normalize(read(memo)), /ship IntentAssessmentReport first/);
});

// ---------- 17 ----------
test("CHANGELOG ships the Intent Capability Spine Integration Review entry", () => {
  // Tightened past the slice-75 "Recommended next slice" reference so this
  // gates the actual slice-76 entry, not the prior slice's forward pointer.
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the Intent Capability Spine Integration Review/);
});

// ---------- 18 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

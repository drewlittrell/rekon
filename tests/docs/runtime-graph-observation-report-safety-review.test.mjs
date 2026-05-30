// Docs tests for the RuntimeGraphObservationReport safety review
// (seventy-second slice on the capability-ontology track).

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

const memo = "docs/strategy/runtime-graph-observation-report-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/runtime-graph-observation-report-safety-review.md";

const REQUIRED_HEADINGS = [
  "# RuntimeGraphObservationReport Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Artifact And CLI Reviewed",
  "## Event Input Review",
  "## Observation Model Review",
  "## Aggregation Review",
  "## Boundary From Coverage Review",
  "## Runtime Drift Boundary Review",
  "## WorkOrder / VerificationPlan Boundary Review",
  "## Intent Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

// ---------- 1 ----------
test("safety review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*RuntimeGraphObservationReport Safety Review/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("memo says RuntimeGraphObservationReport is observed runtime graph, not declared topology", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport is observed runtime graph, not declared topology/);
});

// ---------- 4 ----------
test("memo says RuntimeGraphObservationReport is not HandoffCoverageReport", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport is not HandoffCoverageReport/);
});

// ---------- 5 ----------
test("memo says RuntimeGraphObservationReport v1 does not evaluate declared handoff coverage", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport v1 does not evaluate declared handoff coverage/);
});

// ---------- 6 ----------
test("memo says RuntimeGraphObservationReport v1 does not detect runtime graph drift", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport v1 does not detect runtime graph drift/);
});

// ---------- 7 ----------
test("memo says RuntimeGraphObservationReport v1 does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport v1 does not create WorkOrder or VerificationPlan/);
});

// ---------- 8 ----------
test("memo says intent implementation remains deferred", () => {
  assert.match(normalize(read(memo)), /Intent implementation remains deferred/);
});

// ---------- 9 ----------
test("memo says RuntimeGraphDriftReport remains the next layer after runtime observation", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport remains the next layer after runtime observation/);
});

// ---------- 10 ----------
test("memo includes surface table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Surface \| Status \| Boundary \|/);
  assert.match(text, /RuntimeGraphObservationReport artifact \| shipped \| observed runtime graph/);
});

// ---------- 11 ----------
test("memo includes observation table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Event Case \| V1 Behavior \|/);
  assert.match(text, /missing event log \| zero nodes \/ zero edges/);
});

// ---------- 12 ----------
test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /RuntimeGraphObservationReport vs RuntimeGraphDriftReport \| no drift detection/);
});

// ---------- 13 ----------
test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /RuntimeGraphDriftReport decision next \| selected/);
});

// ---------- 14 ----------
test("CHANGELOG mentions RuntimeGraphObservationReport safety review", () => {
  assert.match(normalize(read("CHANGELOG.md")), /RuntimeGraphObservationReport safety review/i);
});

// ---------- 15 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

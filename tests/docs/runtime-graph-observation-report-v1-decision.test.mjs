// Docs tests for the RuntimeGraphObservationReport v1 decision (seventieth
// slice on the capability-ontology track).

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

const memo = "docs/strategy/runtime-graph-observation-report-v1-decision.md";
const reviewPacket = ".rekon-dev/review-packets/runtime-graph-observation-report-v1-decision.md";

const REQUIRED_HEADINGS = [
  "# RuntimeGraphObservationReport v1 Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Boundary",
  "## Options Considered",
  "## Recommendation",
  "## Event Input Model",
  "## Artifact Model",
  "## V1 Observation Policy",
  "## Boundary Model",
  "## Follow-On Artifacts",
  "## Intent Impact",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*RuntimeGraphObservationReport v1 Decision/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("memo selects raw handoff_event log to observed graph", () => {
  const text = normalize(read(memo));
  assert.match(text, /raw handoff_event log to observed graph \| selected/);
  assert.match(text, /Select Option B/);
});

// ---------- 4 ----------
test("memo mentions .rekon/handoff-events.jsonl", () => {
  assert.match(normalize(read(memo)), /\.rekon\/handoff-events\.jsonl/);
});

// ---------- 5 ----------
test("memo says RuntimeGraphObservationReport is observed runtime graph, not declared topology", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport is observed runtime graph, not declared topology/);
});

// ---------- 6 ----------
test("memo says RuntimeGraphObservationReport is not HandoffCoverageReport", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport is not HandoffCoverageReport/);
});

// ---------- 7 ----------
test("memo says RuntimeGraphObservationReport v1 does not evaluate declared handoff coverage", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport v1 does not evaluate declared handoff coverage/);
});

// ---------- 8 ----------
test("memo says RuntimeGraphObservationReport v1 does not detect runtime graph drift", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport v1 does not detect runtime graph drift/);
});

// ---------- 9 ----------
test("memo says RuntimeGraphDriftReport remains the next layer after runtime observation", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport remains the next layer after runtime observation/);
});

// ---------- 10 ----------
test("memo says RuntimeGraphObservationReport v1 does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport v1 does not create WorkOrder or VerificationPlan/);
});

// ---------- 11 ----------
test("memo says intent implementation remains deferred", () => {
  assert.match(normalize(read(memo)), /Intent implementation remains deferred/);
});

// ---------- 12 ----------
test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /full runtime tracing now \| rejected\/deferred/);
});

// ---------- 13 ----------
test("memo includes input table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Input \| V1 Decision \|/);
  assert.match(text, /\.rekon\/handoff-events\.jsonl \| consumed/);
});

// ---------- 14 ----------
test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /RuntimeGraphObservationReport vs RuntimeGraphDriftReport \| no drift detection/);
});

// ---------- 15 ----------
test("memo includes follow-on table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Future Artifact \| Dependency On RuntimeGraphObservationReport \|/);
  assert.match(text, /RuntimeGraphDriftReport \| compares expected vs observed graph/);
});

// ---------- 16 ----------
test("CHANGELOG mentions RuntimeGraphObservationReport v1 decision", () => {
  assert.match(normalize(read("CHANGELOG.md")), /RuntimeGraphObservationReport v1 decision/i);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

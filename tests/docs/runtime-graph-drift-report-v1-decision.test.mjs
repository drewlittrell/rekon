// Docs tests for the RuntimeGraphDriftReport v1 decision (seventy-third
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

const memo = "docs/strategy/runtime-graph-drift-report-v1-decision.md";
const reviewPacket = ".rekon-dev/review-packets/runtime-graph-drift-report-v1-decision.md";

const REQUIRED_HEADINGS = [
  "# RuntimeGraphDriftReport v1 Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Boundary",
  "## Options Considered",
  "## Recommendation",
  "## Input Model",
  "## Drift Model",
  "## V1 Drift Policy",
  "## Severity Policy",
  "## Boundary Model",
  "## Follow-On Artifacts",
  "## Intent Impact",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*RuntimeGraphDriftReport v1 Decision/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("memo selects compare existing graph artifacts", () => {
  const text = normalize(read(memo));
  assert.match(text, /compare existing graph artifacts \| selected/);
  assert.match(text, /Select Option B/);
});

// ---------- 4 ----------
test("memo says RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not runtime observation", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not runtime observation/);
});

// ---------- 5 ----------
test("memo says RuntimeGraphDriftReport is not HandoffCoverageReport", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport is not HandoffCoverageReport/);
});

// ---------- 6 ----------
test("memo says RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage freshness", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage freshness/);
});

// ---------- 7 ----------
test("memo says RuntimeGraphDriftReport v1 does not read raw handoff event logs directly", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport v1 does not read raw handoff event logs directly/);
});

// ---------- 8 ----------
test("memo says RuntimeGraphDriftReport v1 does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport v1 does not create WorkOrder or VerificationPlan/);
});

// ---------- 9 ----------
test("memo says intent implementation remains deferred", () => {
  assert.match(normalize(read(memo)), /Intent implementation remains deferred/);
});

// ---------- 10 ----------
test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /read raw event logs directly \| rejected/);
});

// ---------- 11 ----------
test("memo includes input table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Input \| V1 Decision \|/);
  assert.match(text, /\.rekon\/handoff-events\.jsonl \| not read directly/);
});

// ---------- 12 ----------
test("memo includes status table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Status \| Meaning \|/);
  assert.match(text, /missing-expected \| expected runtime edge absent from observation/);
});

// ---------- 13 ----------
test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /RuntimeGraphDriftReport vs PathFreshnessReport \| runtime topology divergence vs working-tree freshness/);
});

// ---------- 14 ----------
test("CHANGELOG mentions RuntimeGraphDriftReport v1 decision", () => {
  assert.match(normalize(read("CHANGELOG.md")), /RuntimeGraphDriftReport v1 decision/i);
});

// ---------- 15 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

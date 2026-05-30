// Docs tests for the RuntimeGraphDriftReport safety review (seventy-fifth
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

const memo = "docs/strategy/runtime-graph-drift-report-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/runtime-graph-drift-report-safety-review.md";

const REQUIRED_HEADINGS = [
  "# RuntimeGraphDriftReport Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Artifact And CLI Reviewed",
  "## Input Boundary Review",
  "## Drift Model Review",
  "## Observation Boundary Review",
  "## Coverage Boundary Review",
  "## Freshness Boundary Review",
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
  assert.match(read(memo), /#\s*RuntimeGraphDriftReport Safety Review/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("memo says RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not runtime observation", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not runtime observation/);
});

// ---------- 4 ----------
test("memo says RuntimeGraphDriftReport is not HandoffCoverageReport", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport is not HandoffCoverageReport/);
});

// ---------- 5 ----------
test("memo says RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage freshness", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage freshness/);
});

// ---------- 6 ----------
test("memo says RuntimeGraphDriftReport v1 does not read raw handoff event logs directly", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport v1 does not read raw handoff event logs directly/);
});

// ---------- 7 ----------
test("memo says RuntimeGraphDriftReport v1 does not re-evaluate handoff coverage from events", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport v1 does not re-evaluate handoff coverage from events/);
});

// ---------- 8 ----------
test("memo says RuntimeGraphDriftReport v1 does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport v1 does not create WorkOrder or VerificationPlan/);
});

// ---------- 9 ----------
test("memo says RuntimeGraphDriftReport v1 does not implement intent", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport v1 does not implement intent/);
});

// ---------- 10 ----------
test("memo says classic spine is complete enough to unblock intent architecture work", () => {
  assert.match(normalize(read(memo)), /classic step\/handoff\/runtime-drift spine is (now )?complete enough to unblock intent architecture work/);
});

// ---------- 11 ----------
test("memo includes surface table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Surface \| Status \| Boundary \|/);
  assert.match(text, /RuntimeGraphDriftReport artifact \| shipped \| expected-vs-observed drift/);
});

// ---------- 12 ----------
test("memo includes status mapping table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Input Signal \| V1 Drift Row \|/);
  assert.match(text, /covered coverage row \| in-sync/);
});

// ---------- 13 ----------
test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /RuntimeGraphDriftReport vs PathFreshnessReport \| runtime topology divergence vs working-tree freshness/);
});

// ---------- 14 ----------
test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /unblock intent architecture work \| selected/);
});

// ---------- 15 ----------
test("CHANGELOG mentions RuntimeGraphDriftReport safety review", () => {
  assert.match(normalize(read("CHANGELOG.md")), /RuntimeGraphDriftReport safety review/i);
});

// ---------- 16 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

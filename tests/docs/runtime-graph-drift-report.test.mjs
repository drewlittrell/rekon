// Docs tests for RuntimeGraphDriftReport v1 (seventy-fourth slice on the
// capability-ontology track).

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

const artifactDoc = "docs/artifacts/runtime-graph-drift-report.md";
const conceptDoc = "docs/concepts/runtime-graph-drift.md";
const reviewPacket = ".rekon-dev/review-packets/runtime-graph-drift-report-v1.md";

function docs() {
  return normalize(read(artifactDoc) + "\n" + read(conceptDoc));
}

// ---------- 1-2 ----------
test("artifact doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, artifactDoc)));
  assert.match(read(artifactDoc), /#\s*RuntimeGraphDriftReport/);
});

test("concept doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, conceptDoc)));
  assert.match(read(conceptDoc), /#\s*Runtime Graph Drift/);
});

// ---------- 3 ----------
test("docs say RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not runtime observation", () => {
  assert.match(docs(), /RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not runtime observation/);
});

// ---------- 4 ----------
test("docs say RuntimeGraphDriftReport is not HandoffCoverageReport", () => {
  assert.match(docs(), /RuntimeGraphDriftReport is not HandoffCoverageReport/);
});

// ---------- 5 ----------
test("docs say RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage freshness", () => {
  assert.match(docs(), /RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage freshness/);
});

// ---------- 6 ----------
test("docs say RuntimeGraphDriftReport v1 does not read raw handoff event logs directly", () => {
  assert.match(docs(), /RuntimeGraphDriftReport v1 does not read raw handoff event logs directly/);
});

// ---------- 7 ----------
test("docs say RuntimeGraphDriftReport v1 does not create WorkOrder / VerificationPlan", () => {
  assert.match(docs(), /RuntimeGraphDriftReport v1 does not create WorkOrder \/ VerificationPlan/);
});

// ---------- 8 ----------
test("docs say intent implementation remains deferred", () => {
  assert.match(docs(), /Intent implementation remains deferred/i);
});

// ---------- 9 ----------
test("CHANGELOG mentions RuntimeGraphDriftReport v1", () => {
  assert.match(normalize(read("CHANGELOG.md")), /RuntimeGraphDriftReport v1/);
});

// ---------- 10 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

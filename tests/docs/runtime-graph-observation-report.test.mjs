// Docs tests for RuntimeGraphObservationReport v1 (seventy-first slice on
// the capability-ontology track).

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

const artifactDoc = "docs/artifacts/runtime-graph-observation-report.md";
const conceptDoc = "docs/concepts/runtime-graph-observation.md";
const reviewPacket = ".rekon-dev/review-packets/runtime-graph-observation-report-v1.md";

function docs() {
  return normalize(read(artifactDoc) + "\n" + read(conceptDoc));
}

// ---------- 1-2 ----------
test("artifact doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, artifactDoc)));
  assert.match(read(artifactDoc), /#\s*RuntimeGraphObservationReport/);
});

test("concept doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, conceptDoc)));
  assert.match(read(conceptDoc), /#\s*Runtime Graph Observation/);
});

// ---------- 3 ----------
test("docs say RuntimeGraphObservationReport is observed runtime graph, not declared topology", () => {
  assert.match(docs(), /RuntimeGraphObservationReport is observed runtime graph, not declared topology/);
});

// ---------- 4 ----------
test("docs say RuntimeGraphObservationReport is not HandoffCoverageReport", () => {
  assert.match(docs(), /RuntimeGraphObservationReport is not HandoffCoverageReport/);
});

// ---------- 5 ----------
test("docs say RuntimeGraphObservationReport v1 does not evaluate declared handoff coverage", () => {
  assert.match(docs(), /RuntimeGraphObservationReport v1 does not evaluate declared handoff coverage/);
});

// ---------- 6 ----------
test("docs say RuntimeGraphObservationReport v1 does not detect runtime graph drift", () => {
  assert.match(docs(), /RuntimeGraphObservationReport v1 does not detect runtime graph drift/);
});

// ---------- 7 ----------
test("docs say RuntimeGraphDriftReport remains the next layer after runtime observation", () => {
  assert.match(docs(), /RuntimeGraphDriftReport remains the next layer after runtime observation/);
});

// ---------- 8 ----------
test("docs say RuntimeGraphObservationReport v1 does not create WorkOrder / VerificationPlan", () => {
  assert.match(docs(), /RuntimeGraphObservationReport v1 does not create WorkOrder \/ VerificationPlan/);
});

// ---------- 9 ----------
test("docs say intent implementation remains deferred", () => {
  assert.match(docs(), /Intent implementation remains deferred/i);
});

// ---------- 10 ----------
test("CHANGELOG mentions RuntimeGraphObservationReport v1", () => {
  assert.match(normalize(read("CHANGELOG.md")), /RuntimeGraphObservationReport v1/);
});

// ---------- 11 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

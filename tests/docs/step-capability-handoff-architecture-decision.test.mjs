// Docs tests for the StepCapabilityGraph / HandoffContract architecture
// decision (sixtieth slice on the capability-ontology track).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const memo = "docs/strategy/step-capability-handoff-architecture-decision.md";
const reviewPacket =
  ".rekon-dev/review-packets/step-capability-handoff-architecture-decision.md";

const REQUIRED_HEADINGS = [
  "# StepCapabilityGraph / HandoffContract Architecture Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Classic Audit Findings",
  "## Current Rekon Boundary",
  "## Options Considered",
  "## Recommendation",
  "## StepCapabilityGraph Model",
  "## HandoffContract Model",
  "## HandoffCoverageReport Model",
  "## RuntimeGraphObservationReport Model",
  "## RuntimeGraphDriftReport Model",
  "## Intent Impact",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1: memo exists ----------

test("decision memo exists", () => {
  const text = read(memo);
  assert.match(
    text,
    /#\s*StepCapabilityGraph \/ HandoffContract Architecture Decision/,
  );
});

// ---------- 2: required headings ----------

test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: selects staged spine ----------

test("memo selects staged step/handoff/runtime graph spine", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /select(s|ed)?[^.]*staged step\/handoff\/runtime graph spine/i,
  );
});

// ---------- 4: StepCapabilityGraph != CapabilityMap v2 ----------

test("memo says StepCapabilityGraph is workflow topology, not CapabilityMap v2", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /StepCapabilityGraph is workflow topology, not CapabilityMap v2/,
  );
});

// ---------- 5: HandoffContract != WorkOrder ----------

test("memo says HandoffContract is declared baton policy, not WorkOrder", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /HandoffContract is declared baton policy, not WorkOrder/,
  );
});

// ---------- 6: HandoffCoverageReport != VerificationRun ----------

test("memo says HandoffCoverageReport is handoff-event coverage, not VerificationRun command success", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /HandoffCoverageReport is handoff-event coverage, not VerificationRun command success/,
  );
});

// ---------- 7: RuntimeGraphDriftReport != freshness ----------

test("memo says RuntimeGraphDriftReport is runtime graph drift, not PathFreshnessReport or artifact lineage freshness", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /RuntimeGraphDriftReport is runtime graph drift, not PathFreshnessReport or artifact lineage freshness/,
  );
});

// ---------- 8: intent parity dependency ----------

test("memo says intent parity depends on the four layers", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Intent parity depends on StepCapabilityGraph, HandoffContract, HandoffCoverageReport, and RuntimeGraphDriftReport/,
  );
});

// ---------- 9: no runtime behavior changes ----------

test("memo says no runtime behavior changes ship in this decision", () => {
  const text = normalize(read(memo));
  assert.match(text, /No runtime behavior changes ship in this decision/);
});

// ---------- 10: option table ----------

test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(
    text,
    /staged step\/handoff\/runtime graph spine \| selected/,
  );
});

// ---------- 11: artifact sequence table ----------

test("memo includes artifact sequence table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Artifact \| Sequence \| Reason \|/);
  assert.match(text, /RuntimeGraphDriftReport \| 5 \| expected-vs-observed drift/);
});

// ---------- 12: boundary table ----------

test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(
    text,
    /RuntimeGraphDriftReport vs PathFreshnessReport \| runtime graph drift vs working-tree freshness/,
  );
});

// ---------- 13: intent impact table ----------

test("memo includes intent impact table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Intent Surface \| Impact \|/);
  assert.match(
    text,
    /intent:go \| must gate execution when unresolved runtime drift exists/,
  );
});

// ---------- 14: CHANGELOG mention ----------

test("CHANGELOG mentions StepCapabilityGraph / HandoffContract architecture decision", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(
    text,
    /StepCapabilityGraph \/ HandoffContract architecture decision/i,
  );
});

// ---------- 15: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(reviewPacket);
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

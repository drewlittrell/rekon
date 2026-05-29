// Docs tests for the classic step-capability / handoff / runtime drift
// parity audit (fifty-ninth slice on the capability-ontology track).

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

const memo = "docs/strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md";
const reviewPacket =
  ".rekon-dev/review-packets/classic-step-capability-handoff-runtime-drift-parity-audit.md";

const REQUIRED_HEADINGS = [
  "# Classic Step-Capability / Handoff / Runtime Drift Parity Audit",
  "## Decision Summary",
  "## Why This Audit Exists",
  "## Classic Source Reviewed",
  "## Classic Step-Capability Graph",
  "## Classic Baton / Handoff System",
  "## Classic Handoff Coverage",
  "## Classic Step-Handler Validation",
  "## Classic Derive Validation",
  "## Classic Runtime Graph Drift / Delta",
  "## Classic Watcher / Continuity Surface",
  "## Current Rekon Equivalent",
  "## Gap Matrix",
  "## Methods To Repeat",
  "## Methods To Adapt",
  "## Methods To Reject",
  "## Proposed Rekon Artifact Spine Additions",
  "## Impact On Intent Work",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

// ---------- 1: memo exists ----------

test("audit memo exists", () => {
  const text = read(memo);
  assert.match(
    text,
    /#\s*Classic Step-Capability \/ Handoff \/ Runtime Drift Parity Audit/,
  );
});

// ---------- 2: required headings ----------

test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: adjacent foundations but not accounted for ----------

test("memo says Rekon has adjacent foundations but classic system is not yet fully accounted for", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Rekon has adjacent foundations, but the classic step-capability \/ handoff \/ runtime drift system is not yet fully accounted for/,
  );
});

// ---------- 4: runtime graph drift != path freshness ----------

test("memo says runtime graph drift is not PathFreshnessReport or artifact lineage freshness", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Runtime graph drift is not the same as PathFreshnessReport or artifact lineage freshness/,
  );
});

// ---------- 5: handoff coverage != VerificationRun command success ----------

test("memo says handoff coverage is not VerificationRun command success", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Handoff coverage is not the same as VerificationRun command success/,
  );
});

// ---------- 6: StepCapabilityGraph != CapabilityMap v2 ----------

test("memo says StepCapabilityGraph is not CapabilityMap v2", () => {
  const text = normalize(read(memo));
  assert.match(text, /StepCapabilityGraph is not the same as CapabilityMap v2/);
});

// ---------- 7: intent parity dependency ----------

test("memo says intent parity depends on step-capability, handoff, and runtime drift surfaces", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Intent parity depends on step-capability, handoff, and runtime drift surfaces/,
  );
});

// ---------- 8-12: reserved artifacts ----------

test("memo reserves StepCapabilityGraph", () => {
  const text = normalize(read(memo));
  assert.match(text, /reserve StepCapabilityGraph/);
});

test("memo reserves HandoffContract", () => {
  const text = normalize(read(memo));
  assert.match(text, /reserve HandoffContract/);
});

test("memo reserves HandoffCoverageReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /reserve HandoffCoverageReport/);
});

test("memo reserves RuntimeGraphObservationReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /reserve RuntimeGraphObservationReport/);
});

test("memo reserves RuntimeGraphDriftReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /reserve RuntimeGraphDriftReport/);
});

// ---------- 13-14: evaluated validation reports ----------

test("memo mentions DerivedGraphValidationReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /DerivedGraphValidationReport/);
});

test("memo mentions StepHandlerValidationReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /StepHandlerValidationReport/);
});

// ---------- 15: classic source table ----------

test("memo includes classic source table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Classic Surface \| Source Evidence \| Finding \|/);
});

// ---------- 16: gap matrix ----------

test("memo includes gap matrix", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /\| Classic Capability \| Rekon Current Equivalent \| Gap \| Decision \|/,
  );
});

// ---------- 17: proposed artifact table ----------

test("memo includes proposed artifact table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Proposed Artifact \| Purpose \| First Consumer \|/);
});

// ---------- 18: intent impact table ----------

test("memo includes intent impact table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Intent Surface \| Dependency On This Audit \|/);
});

// ---------- 19: CHANGELOG mention ----------

test("CHANGELOG mentions classic step-capability / handoff / runtime drift parity audit", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(
    text,
    /classic step-capability \/ handoff \/ runtime drift parity audit/i,
  );
});

// ---------- 20: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(reviewPacket);
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

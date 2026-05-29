// Docs tests for the StepCapabilityGraph v1 decision
// (sixty-first slice on the capability-ontology track).

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

const memo = "docs/strategy/step-capability-graph-v1-decision.md";
const reviewPacket =
  ".rekon-dev/review-packets/step-capability-graph-v1-decision.md";

const REQUIRED_HEADINGS = [
  "# StepCapabilityGraph v1 Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Architecture Context",
  "## What StepCapabilityGraph v1 Is",
  "## Options Considered",
  "## v1 Inputs",
  "## v1 Node / Edge Shape",
  "## What v1 Does Not Model",
  "## Optional Operator Config",
  "## Intent Impact (Deferred)",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1: memo exists ----------

test("v1 decision memo exists", () => {
  assert.match(read(memo), /#\s*StepCapabilityGraph v1 Decision/);
});

// ---------- 2: required headings ----------

test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: decision = projection + optional config ----------

test("memo selects projection + optional config", () => {
  const text = normalize(read(memo));
  assert.match(text, /Decision: projection \+ optional config/);
  assert.match(text, /projection \+ optional config \| selected/);
});

// ---------- 4: expected workflow topology graph ----------

test("memo says StepCapabilityGraph v1 is an expected workflow topology graph", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /StepCapabilityGraph v1 is an expected workflow topology graph/,
  );
});

// ---------- 5: not runtime truth / coverage / execution readiness ----------

test("memo says v1 does not model runtime truth, handoff coverage, or execution readiness", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /does not model runtime truth, handoff coverage, or execution readiness/i,
  );
});

// ---------- 6: workflow topology, not CapabilityMap v2 ----------

test("memo says StepCapabilityGraph is workflow topology, not CapabilityMap v2", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /StepCapabilityGraph is workflow topology, not CapabilityMap v2/,
  );
});

// ---------- 7: optional config not admin-heavy ----------

test("memo says the optional config is optional grouping and labeling, not a manual-admin-heavy system", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /optional grouping and labeling, not a manual-admin-heavy system/,
  );
});

// ---------- 8: projection from the three governed artifacts ----------

test("memo says v1 is derived by projection from EvidenceGraph, CapabilityMap v2, and CapabilityPhraseReport", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /derived by projection from[^.]*EvidenceGraph, CapabilityMap v2, and CapabilityPhraseReport/,
  );
});

// ---------- 9: optional config path ----------

test("memo names the optional .rekon/step-capability-map.json config", () => {
  const text = normalize(read(memo));
  assert.match(text, /\.rekon\/step-capability-map\.json/);
});

// ---------- 10: reserved (not populated in v1) ----------

test("memo reserves expected-handoff and runtime-grounding fields in v1", () => {
  const text = normalize(read(memo));
  assert.match(text, /reserved \(not populated in v1\)/);
});

// ---------- 11: no runtime behavior changes ----------

test("memo says no runtime behavior changes ship in this decision", () => {
  const text = normalize(read(memo));
  assert.match(text, /No runtime behavior changes ship in this decision/);
});

// ---------- 12: options table ----------

test("memo includes options table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /runtime-grounded v1 \| rejected/);
});

// ---------- 13: inputs table ----------

test("memo includes inputs table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Input \| Role \| Required\? \|/);
});

// ---------- 14: node / edge shape table ----------

test("memo includes node / edge shape table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Element \| Kind \| v1 status \|/);
});

// ---------- 15: CHANGELOG mention ----------

test("CHANGELOG mentions StepCapabilityGraph v1 decision", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /StepCapabilityGraph v1 decision/i);
});

// ---------- 16: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(reviewPacket);
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

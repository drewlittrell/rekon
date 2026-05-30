// Docs tests for the StepCapabilityGraph safety review (sixty-third
// slice on the capability-ontology track).

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

const memo = "docs/strategy/step-capability-graph-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/step-capability-graph-safety-review.md";

const REQUIRED_HEADINGS = [
  "# StepCapabilityGraph Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Artifact And CLI Reviewed",
  "## Projection / Topology Boundary Review",
  "## Optional Config Review",
  "## Matching And Unresolved Capability Review",
  "## Handoff / Runtime Boundary Review",
  "## Intent Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

test("safety review doc exists", () => {
  assert.match(read(memo), /#\s*StepCapabilityGraph Safety Review/);
});

test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

test("memo says StepCapabilityGraph is expected workflow topology, not runtime truth", () => {
  const text = normalize(read(memo));
  assert.match(text, /StepCapabilityGraph is expected workflow topology, not runtime truth/);
});

test("memo says StepCapabilityGraph is workflow topology, not CapabilityMap v2", () => {
  const text = normalize(read(memo));
  assert.match(text, /StepCapabilityGraph is workflow topology, not CapabilityMap v2/);
});

test("memo says optional config is grouping/labeling only", () => {
  const text = normalize(read(memo));
  assert.match(text, /Optional \.rekon\/step-capability-map\.json config is grouping\/labeling only/);
});

test("memo says v1 does not create HandoffContract", () => {
  const text = normalize(read(memo));
  assert.match(text, /StepCapabilityGraph v1 does not create HandoffContract/);
});

test("memo says v1 does not model handoff coverage", () => {
  const text = normalize(read(memo));
  assert.match(text, /StepCapabilityGraph v1 does not model handoff coverage/);
});

test("memo says v1 does not detect runtime graph drift", () => {
  const text = normalize(read(memo));
  assert.match(text, /StepCapabilityGraph v1 does not detect runtime graph drift/);
});

test("memo says v1 does not create WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(text, /StepCapabilityGraph v1 does not create WorkOrder or VerificationPlan/);
});

test("memo says intent implementation remains deferred", () => {
  const text = normalize(read(memo));
  assert.match(text, /Intent implementation remains deferred/);
});

test("memo includes surface table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Surface \| Status \| Boundary \|/);
  assert.match(text, /handoff placeholders \| reserved \| no declared handoffs/);
});

test("memo includes matching table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Rule \| V1 Behavior \|/);
  assert.match(text, /unsafe assignment \| unresolvedCapabilities/);
});

test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /StepCapabilityGraph vs HandoffContract \| no declared baton policy/);
});

test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /HandoffContract decision next \| selected/);
});

test("CHANGELOG mentions StepCapabilityGraph safety review", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /StepCapabilityGraph safety review/i);
});

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

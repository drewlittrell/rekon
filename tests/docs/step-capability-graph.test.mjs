// Docs tests for StepCapabilityGraph v1 (sixty-second slice on the
// capability-ontology track).

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

const artifactDoc = "docs/artifacts/step-capability-graph.md";
const conceptDoc = "docs/concepts/step-capability-graph.md";
const reviewPacket = ".rekon-dev/review-packets/step-capability-graph-v1.md";

test("artifact doc exists", () => {
  assert.match(read(artifactDoc), /#\s*StepCapabilityGraph/);
});

test("concept doc exists", () => {
  assert.match(read(conceptDoc), /step[- ]capability graph/i);
});

test("docs say StepCapabilityGraph v1 is expected workflow topology", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /StepCapabilityGraph v1 is expected workflow topology/);
});

test("docs say it is not CapabilityMap v2", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /(it is not|is not) CapabilityMap v2/i);
});

test("docs say it does not model runtime handoff coverage", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /does not model runtime handoff coverage/);
});

test("docs say it does not detect runtime graph drift", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /does not detect runtime graph drift/);
});

test("docs say it does not create HandoffContract", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /does not create HandoffContract/);
});

test("docs say it does not create WorkOrder / VerificationPlan", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /does not create WorkOrder \/ VerificationPlan/);
});

test("docs say it does not implement intent", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /does not implement intent/);
});

test("docs say optional config is grouping/labeling only", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /Optional config is grouping\/labeling only/);
});

test("CHANGELOG mentions StepCapabilityGraph v1", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /StepCapabilityGraph v1/);
});

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

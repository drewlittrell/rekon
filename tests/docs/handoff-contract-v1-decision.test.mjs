// Docs tests for the HandoffContract v1 decision (sixty-fourth slice on
// the capability-ontology track).

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

const memo = "docs/strategy/handoff-contract-v1-decision.md";
const reviewPacket = ".rekon-dev/review-packets/handoff-contract-v1-decision.md";

const REQUIRED_HEADINGS = [
  "# HandoffContract v1 Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Boundary",
  "## Options Considered",
  "## Recommendation",
  "## Config Model",
  "## Artifact Model",
  "## V1 Resolution Policy",
  "## Boundary Model",
  "## Follow-On Artifacts",
  "## Intent Impact",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

test("decision memo exists", () => {
  assert.match(read(memo), /#\s*HandoffContract v1 Decision/);
});

test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

test("memo selects config + artifact effective contract", () => {
  const text = normalize(read(memo));
  assert.match(text, /config \+ artifact effective contract/);
  assert.match(text, /config \+ artifact effective contract \| selected/);
});

test("memo mentions .rekon/handoff-contracts.json", () => {
  const text = normalize(read(memo));
  assert.match(text, /\.rekon\/handoff-contracts\.json/);
});

test("memo says HandoffContract is declared baton policy, not StepCapabilityGraph topology", () => {
  const text = normalize(read(memo));
  assert.match(text, /HandoffContract is declared baton policy, not StepCapabilityGraph topology/);
});

test("memo says HandoffContract v1 does not evaluate handoff coverage", () => {
  const text = normalize(read(memo));
  assert.match(text, /HandoffContract v1 does not evaluate handoff coverage/);
});

test("memo says HandoffContract v1 does not read runtime events", () => {
  const text = normalize(read(memo));
  assert.match(text, /HandoffContract v1 does not read runtime events/);
});

test("memo says HandoffContract v1 does not detect runtime graph drift", () => {
  const text = normalize(read(memo));
  assert.match(text, /HandoffContract v1 does not detect runtime graph drift/);
});

test("memo says HandoffCoverageReport remains the next layer after HandoffContract", () => {
  const text = normalize(read(memo));
  assert.match(text, /HandoffCoverageReport remains the next layer after HandoffContract/);
});

test("memo says RuntimeGraphObservationReport and RuntimeGraphDriftReport remain deferred", () => {
  const text = normalize(read(memo));
  assert.match(text, /RuntimeGraphObservationReport and RuntimeGraphDriftReport remain deferred/);
});

test("memo says HandoffContract does not create WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(text, /HandoffContract does not create WorkOrder or VerificationPlan/);
});

test("memo says intent implementation remains deferred", () => {
  const text = normalize(read(memo));
  assert.match(text, /Intent implementation remains deferred/);
});

test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /derive handoffs automatically \| rejected/);
});

test("memo includes input table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Input \| V1 Decision \|/);
  assert.match(text, /runtime handoff events \| deferred/);
});

test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /HandoffContract vs StepCapabilityGraph \| declared baton policy vs topology/);
});

test("memo includes follow-on table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Future Artifact \| Dependency On HandoffContract \|/);
  assert.match(text, /HandoffCoverageReport \| compares declared handoffs to observed events/);
});

test("CHANGELOG mentions HandoffContract v1 decision", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /HandoffContract v1 decision/i);
});

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

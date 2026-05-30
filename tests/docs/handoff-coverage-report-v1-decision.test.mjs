// Docs tests for the HandoffCoverageReport v1 decision (sixty-seventh
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

const memo = "docs/strategy/handoff-coverage-report-v1-decision.md";
const reviewPacket = ".rekon-dev/review-packets/handoff-coverage-report-v1-decision.md";

const REQUIRED_HEADINGS = [
  "# HandoffCoverageReport v1 Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Boundary",
  "## Options Considered",
  "## Recommendation",
  "## Event Input Model",
  "## Artifact Model",
  "## V1 Coverage Policy",
  "## Boundary Model",
  "## Follow-On Artifacts",
  "## Intent Impact",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

test("decision memo exists", () => {
  assert.match(read(memo), /#\s*HandoffCoverageReport v1 Decision/);
});

test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

test("memo selects HandoffContract + raw handoff event log", () => {
  const text = normalize(read(memo));
  assert.match(text, /comparing HandoffContract against an optional raw handoff event log/);
  assert.match(text, /HandoffContract \+ raw event log \| selected/);
});

test("memo mentions .rekon/handoff-events.jsonl", () => {
  assert.match(normalize(read(memo)), /\.rekon\/handoff-events\.jsonl/);
});

test("memo says HandoffCoverageReport is handoff-event coverage, not VerificationRun command success", () => {
  assert.match(normalize(read(memo)), /HandoffCoverageReport is handoff-event coverage, not VerificationRun command success/);
});

test("memo says HandoffCoverageReport v1 does not create RuntimeGraphObservationReport", () => {
  assert.match(normalize(read(memo)), /HandoffCoverageReport v1 does not create RuntimeGraphObservationReport/);
});

test("memo says HandoffCoverageReport v1 does not detect runtime graph drift", () => {
  assert.match(normalize(read(memo)), /HandoffCoverageReport v1 does not detect runtime graph drift/);
});

test("memo says HandoffCoverageReport v1 does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /HandoffCoverageReport v1 does not create WorkOrder or VerificationPlan/);
});

test("memo says RuntimeGraphObservationReport remains the next runtime layer after coverage", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport remains the next runtime layer after coverage/);
});

test("memo says RuntimeGraphDriftReport remains deferred", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphDriftReport remains deferred/);
});

test("memo says intent implementation remains deferred", () => {
  assert.match(normalize(read(memo)), /Intent implementation remains deferred/);
});

test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /use VerificationRun as coverage \| rejected/);
});

test("memo includes input table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Input \| V1 Decision \|/);
  assert.match(text, /\.rekon\/handoff-events\.jsonl \| optional/);
});

test("memo includes status table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Status \| Meaning \|/);
  assert.match(text, /not-evaluated \| no event log \/ insufficient observation input/);
});

test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /HandoffCoverageReport vs VerificationRun \| event coverage, not command success/);
});

test("CHANGELOG mentions HandoffCoverageReport v1 decision", () => {
  assert.match(normalize(read("CHANGELOG.md")), /HandoffCoverageReport v1 decision/i);
});

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

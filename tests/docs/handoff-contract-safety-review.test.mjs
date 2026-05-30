// Docs tests for the HandoffContract safety review (sixty-sixth slice on
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

const memo = "docs/strategy/handoff-contract-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/handoff-contract-safety-review.md";

const REQUIRED_HEADINGS = [
  "# HandoffContract Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Artifact And CLI Reviewed",
  "## Config Review",
  "## Resolution Review",
  "## Declared Policy Boundary Review",
  "## Coverage / Runtime Boundary Review",
  "## WorkOrder / VerificationPlan Boundary Review",
  "## Intent Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

test("safety review doc exists", () => {
  assert.match(read(memo), /#\s*HandoffContract Safety Review/);
});

test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

test("memo says HandoffContract is declared baton policy, not StepCapabilityGraph topology", () => {
  assert.match(normalize(read(memo)), /HandoffContract is declared baton policy, not StepCapabilityGraph topology/);
});

test("memo says HandoffContract v1 does not evaluate handoff coverage", () => {
  assert.match(normalize(read(memo)), /HandoffContract v1 does not evaluate handoff coverage/);
});

test("memo says HandoffContract v1 does not read runtime events", () => {
  assert.match(normalize(read(memo)), /HandoffContract v1 does not read runtime events/);
});

test("memo says HandoffContract v1 does not detect runtime graph drift", () => {
  assert.match(normalize(read(memo)), /HandoffContract v1 does not detect runtime graph drift/);
});

test("memo says HandoffContract v1 does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /HandoffContract v1 does not create WorkOrder or VerificationPlan/);
});

test("memo says HandoffContract v1 does not implement intent", () => {
  assert.match(normalize(read(memo)), /HandoffContract v1 does not implement intent/);
});

test("memo says HandoffCoverageReport remains the next layer after HandoffContract", () => {
  assert.match(normalize(read(memo)), /HandoffCoverageReport remains the next layer after HandoffContract/);
});

test("memo says RuntimeGraphObservationReport and RuntimeGraphDriftReport remain deferred", () => {
  assert.match(normalize(read(memo)), /RuntimeGraphObservationReport and RuntimeGraphDriftReport remain deferred/);
});

test("memo includes surface table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Surface \| Status \| Boundary \|/);
  assert.match(text, /needs-review status \| reserved \| no v1 emission/);
});

test("memo includes resolution table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Case \| V1 Behavior \|/);
  assert.match(text, /both step ids missing \| unresolved-step/);
});

test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /HandoffContract vs HandoffCoverageReport \| no coverage evaluation/);
});

test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /HandoffCoverageReport decision next \| selected/);
});

test("CHANGELOG mentions HandoffContract safety review", () => {
  assert.match(normalize(read("CHANGELOG.md")), /HandoffContract safety review/i);
});

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

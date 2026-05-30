// Docs tests for the HandoffCoverageReport safety review (sixty-ninth
// slice on the capability-ontology track).

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

const memo = "docs/strategy/handoff-coverage-report-safety-review.md";
const reviewPacket = ".rekon-dev/review-packets/handoff-coverage-report-safety-review.md";

const REQUIRED_HEADINGS = [
  "# HandoffCoverageReport Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Artifact And CLI Reviewed",
  "## Event Input Review",
  "## Matching Policy Review",
  "## Missing Log / Uncovered Boundary Review",
  "## Parse Error Review",
  "## Added Observed Review",
  "## Runtime Graph Boundary Review",
  "## WorkOrder / VerificationPlan Boundary Review",
  "## Intent Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

// ---------- 1 ----------
test("safety review doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*HandoffCoverageReport Safety Review/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("memo says HandoffCoverageReport is handoff-event coverage, not VerificationRun command success", () => {
  assert.match(normalize(read(memo)), /HandoffCoverageReport is handoff-event coverage, not VerificationRun command success/);
});

// ---------- 4 ----------
test("memo says missing event log means not-evaluated, not uncovered", () => {
  assert.match(normalize(read(memo)), /Missing event log means not-evaluated, not uncovered/);
});

// ---------- 5 ----------
test("memo says present event log without a matching declared handoff means uncovered", () => {
  assert.match(normalize(read(memo)), /Present event log without a matching declared handoff means uncovered/);
});

// ---------- 6 ----------
test("memo says added-observed rows are unmatched observed handoff_event rows", () => {
  assert.match(normalize(read(memo)), /added-observed rows are unmatched observed handoff_event rows/);
});

// ---------- 7 ----------
test("memo says invalid event-log lines count parseErrors without aborting the report", () => {
  assert.match(normalize(read(memo)), /Invalid event-log lines count parseErrors without aborting the report/);
});

// ---------- 8 ----------
test("memo says HandoffCoverageReport v1 does not create RuntimeGraphObservationReport", () => {
  assert.match(normalize(read(memo)), /HandoffCoverageReport v1 does not create RuntimeGraphObservationReport/);
});

// ---------- 9 ----------
test("memo says HandoffCoverageReport v1 does not detect runtime graph drift", () => {
  assert.match(normalize(read(memo)), /HandoffCoverageReport v1 does not detect runtime graph drift/);
});

// ---------- 10 ----------
test("memo says HandoffCoverageReport v1 does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /HandoffCoverageReport v1 does not create WorkOrder or VerificationPlan/);
});

// ---------- 11 ----------
test("memo says intent implementation remains deferred", () => {
  assert.match(normalize(read(memo)), /Intent implementation remains deferred/);
});

// ---------- 12 ----------
test("memo includes surface table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Surface \| Status \| Boundary \|/);
  assert.match(text, /HandoffCoverageReport artifact \| shipped \| handoff-event coverage/);
});

// ---------- 13 ----------
test("memo includes matching table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Matching Case \| V1 Behavior \|/);
  assert.match(text, /unmatched observed handoff_event \| added-observed/);
});

// ---------- 14 ----------
test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /HandoffCoverageReport vs VerificationRun \| event coverage, not command success/);
});

// ---------- 15 ----------
test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /RuntimeGraphObservationReport decision next \| selected/);
});

// ---------- 16 ----------
test("CHANGELOG mentions HandoffCoverageReport safety review", () => {
  assert.match(normalize(read("CHANGELOG.md")), /HandoffCoverageReport safety review/i);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

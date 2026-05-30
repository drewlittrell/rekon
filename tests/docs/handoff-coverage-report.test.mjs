// Docs tests for HandoffCoverageReport v1 (sixty-eighth slice on the
// capability-ontology track).

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

const artifactDoc = "docs/artifacts/handoff-coverage-report.md";
const conceptDoc = "docs/concepts/handoff-coverage.md";
const reviewPacket = ".rekon-dev/review-packets/handoff-coverage-report-v1.md";

// Combined, normalized text of both new docs for boundary-phrase checks.
function docs() {
  return normalize(read(artifactDoc) + "\n" + read(conceptDoc));
}

// ---------- 1-2: docs exist ----------
test("artifact doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, artifactDoc)));
  assert.match(read(artifactDoc), /#\s*HandoffCoverageReport/);
});

test("concept doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, conceptDoc)));
  assert.match(read(conceptDoc), /#\s*Handoff Coverage/);
});

// ---------- 3: coverage, not VerificationRun command success ----------
test("docs say HandoffCoverageReport is handoff-event coverage, not VerificationRun command success", () => {
  assert.match(docs(), /HandoffCoverageReport is handoff-event coverage, not VerificationRun command success/);
});

// ---------- 4: reads HandoffContract + optional event log ----------
test("docs say it reads HandoffContract and optional .rekon/handoff-events.jsonl", () => {
  assert.match(docs(), /reads HandoffContract and optional \.rekon\/handoff-events\.jsonl/);
});

// ---------- 5: missing log -> not-evaluated, not uncovered ----------
test("docs say missing event log means not-evaluated, not uncovered", () => {
  assert.match(docs(), /Missing event log means not-evaluated, not uncovered/);
});

// ---------- 6: present log without a match -> uncovered ----------
test("docs say present log without a match means uncovered", () => {
  assert.match(docs(), /Present log without a match means uncovered/);
});

// ---------- 7: added observed = unmatched observed handoff_event rows ----------
test("docs say added observed events are unmatched observed handoff_event rows", () => {
  assert.match(docs(), /Added observed events are unmatched observed handoff_event rows/);
});

// ---------- 8: invalid lines count parseErrors without aborting ----------
test("docs say invalid lines count parseErrors without aborting the report", () => {
  assert.match(docs(), /Invalid lines count parseErrors without aborting the report/);
});

// ---------- 9: no RuntimeGraphObservationReport / RuntimeGraphDriftReport ----------
test("docs say no RuntimeGraphObservationReport / RuntimeGraphDriftReport", () => {
  assert.match(docs(), /no RuntimeGraphObservationReport \/ RuntimeGraphDriftReport/);
});

// ---------- 10: no WorkOrder / VerificationPlan ----------
test("docs say no WorkOrder / VerificationPlan", () => {
  assert.match(docs(), /no WorkOrder \/ VerificationPlan/);
});

// ---------- 11: no intent implementation ----------
test("docs say no intent implementation", () => {
  assert.match(docs(), /no intent implementation/i);
});

// ---------- 12: CHANGELOG mentions HandoffCoverageReport v1 ----------
test("CHANGELOG mentions HandoffCoverageReport v1", () => {
  assert.match(normalize(read("CHANGELOG.md")), /HandoffCoverageReport v1/);
});

// ---------- 13: review packet exists + PURPOSE PRESERVATION CHECK ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

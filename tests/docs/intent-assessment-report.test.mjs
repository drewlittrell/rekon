// Docs tests for IntentAssessmentReport v1 (seventy-eighth slice on the
// capability-ontology track). Product-capability batch: registers + implements
// the read-only readiness assessment artifact and the `rekon intent assess`
// CLI command.

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

const artifactDoc = "docs/artifacts/intent-assessment-report.md";
const conceptDoc = "docs/concepts/intent-assessment.md";
const reviewPacket = ".rekon-dev/review-packets/intent-assessment-report-v1.md";

const docs = () => `${normalize(read(artifactDoc))}\n${normalize(read(conceptDoc))}`;

// ---------- 1 ----------
test("artifact doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, artifactDoc)));
  assert.match(read(artifactDoc), /#\s*IntentAssessmentReport/);
});

// ---------- 2 ----------
test("concept doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, conceptDoc)));
  assert.match(read(conceptDoc), /#\s*Intent Assessment/);
});

// ---------- 3 ----------
test("docs say IntentAssessmentReport is assessment, not WorkOrder", () => {
  assert.match(docs(), /IntentAssessmentReport is assessment, not WorkOrder\./);
});

// ---------- 4 ----------
test("docs say it does not create WorkOrder or VerificationPlan", () => {
  assert.match(docs(), /IntentAssessmentReport does not create WorkOrder or VerificationPlan\./);
});

// ---------- 5 ----------
test("docs say it does not execute commands", () => {
  assert.match(docs(), /IntentAssessmentReport does not execute commands\./);
});

// ---------- 6 ----------
test("docs say it does not write source files", () => {
  assert.match(docs(), /IntentAssessmentReport does not write source files\./);
});

// ---------- 7 ----------
test("docs say RuntimeGraphDriftReport is an input to readiness, not the intent system itself", () => {
  assert.match(docs(), /RuntimeGraphDriftReport is an input to readiness, not the intent system itself\./);
});

// ---------- 8 ----------
test("docs say PreparedIntentPlan remains the next layer after assessment", () => {
  assert.match(docs(), /PreparedIntentPlan remains the next layer after assessment\./);
});

// ---------- 9 ----------
test("docs say IntentStatusReport remains deferred", () => {
  assert.match(docs(), /IntentStatusReport remains deferred\./);
});

// ---------- 10 ----------
test("docs say intent:go remains deferred", () => {
  assert.match(docs(), /intent:go remains deferred\./);
});

// ---------- 11 ----------
test("CHANGELOG mentions IntentAssessmentReport v1", () => {
  // Tightened past the slice-77 "IntentAssessmentReport v1 decision" entry so
  // this gates the slice-78 implementation entry.
  assert.match(normalize(read("CHANGELOG.md")), /Shipped IntentAssessmentReport v1/);
});

// ---------- 12 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

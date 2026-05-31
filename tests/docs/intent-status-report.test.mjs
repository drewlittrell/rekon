// Docs tests for IntentStatusReport v1 (eighty-sixth slice on the
// capability-ontology track). Product-capability batch: registers + implements
// the read-only rollup status report artifact and the `rekon intent status` CLI
// command.

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

const artifactDoc = "docs/artifacts/intent-status-report.md";
const conceptDoc = "docs/concepts/intent-status.md";
const reviewPacket = ".rekon-dev/review-packets/intent-status-report-v1.md";

const docs = () => `${normalize(read(artifactDoc))}\n${normalize(read(conceptDoc))}`;

// ---------- 1 ----------
test("artifact doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, artifactDoc)));
  assert.match(read(artifactDoc), /#\s*IntentStatusReport/);
});

// ---------- 2 ----------
test("concept doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, conceptDoc)));
  assert.match(read(conceptDoc), /#\s*Intent Status/);
});

// ---------- 3 ----------
test("docs say IntentStatusReport is status reporting, not VerificationResult", () => {
  assert.match(docs(), /IntentStatusReport is status reporting, not VerificationResult\./);
});

// ---------- 4 ----------
test("docs say IntentStatusReport is not WorkOrder", () => {
  assert.match(docs(), /IntentStatusReport is not WorkOrder\./);
});

// ---------- 5 ----------
test("docs say IntentStatusReport does not create WorkOrder or VerificationPlan", () => {
  assert.match(docs(), /IntentStatusReport does not create WorkOrder or VerificationPlan\./);
});

// ---------- 6 ----------
test("docs say IntentStatusReport does not execute commands", () => {
  assert.match(docs(), /IntentStatusReport does not execute commands\./);
});

// ---------- 7 ----------
test("docs say IntentStatusReport does not write source files", () => {
  assert.match(docs(), /IntentStatusReport does not write source files\./);
});

// ---------- 8 ----------
test("docs say IntentStatusReport does not implement intent:go", () => {
  assert.match(docs(), /IntentStatusReport does not implement intent:go\./);
});

// ---------- 9 ----------
test("docs say IntentStatusReport reports PreparedIntentPlan approval state but does not approve plans", () => {
  assert.match(docs(), /IntentStatusReport reports PreparedIntentPlan approval state but does not approve plans\./);
});

// ---------- 10 ----------
test("docs say VerificationResult is an input to status, not the status artifact itself", () => {
  assert.match(docs(), /VerificationResult is an input to status, not the status artifact itself\./);
});

// ---------- 11 ----------
test("CHANGELOG mentions IntentStatusReport v1", () => {
  assert.match(normalize(read("CHANGELOG.md")), /Shipped IntentStatusReport v1/);
});

// ---------- 12 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

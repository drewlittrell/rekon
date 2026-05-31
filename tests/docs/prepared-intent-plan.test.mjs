// Docs tests for PreparedIntentPlan v1 (eighty-first slice on the
// capability-ontology track). Product-capability batch: registers + implements
// the read-only phase/gate preparation artifact and the `rekon intent prepare`
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

const artifactDoc = "docs/artifacts/prepared-intent-plan.md";
const conceptDoc = "docs/concepts/prepared-intent-plan.md";
const reviewPacket = ".rekon-dev/review-packets/prepared-intent-plan-v1.md";
const approvalReviewPacket = ".rekon-dev/review-packets/prepared-intent-plan-v1-approval-envelope.md";

const docs = () => `${normalize(read(artifactDoc))}\n${normalize(read(conceptDoc))}`;

// ---------- 1 ----------
test("artifact doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, artifactDoc)));
  assert.match(read(artifactDoc), /#\s*PreparedIntentPlan/);
});

// ---------- 2 ----------
test("concept doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, conceptDoc)));
  assert.match(read(conceptDoc), /#\s*Prepared Intent Plan/);
});

// ---------- 3 ----------
test("docs say PreparedIntentPlan is phase/gate preparation, not WorkOrder", () => {
  assert.match(docs(), /PreparedIntentPlan is phase\/gate preparation, not WorkOrder\./);
});

// ---------- 4 ----------
test("docs say it does not create WorkOrder or VerificationPlan", () => {
  assert.match(docs(), /PreparedIntentPlan does not create WorkOrder or VerificationPlan\./);
});

// ---------- 5 ----------
test("docs say it does not execute commands", () => {
  assert.match(docs(), /PreparedIntentPlan does not execute commands\./);
});

// ---------- 6 ----------
test("docs say it does not write source files", () => {
  assert.match(docs(), /PreparedIntentPlan does not write source files\./);
});

// ---------- 7 ----------
test("docs say verification requirements are not VerificationPlan", () => {
  assert.match(docs(), /Verification requirements are not VerificationPlan\./);
});

// ---------- 8 ----------
test("docs say IntentStatusReport remains the next layer after preparation", () => {
  assert.match(docs(), /IntentStatusReport remains the next layer after preparation\./);
});

// ---------- 9 ----------
test("docs say intent:go remains deferred", () => {
  assert.match(docs(), /intent:go remains deferred\./);
});

// ---------- 10 ----------
test("docs say source-write behavior remains unavailable", () => {
  assert.match(docs(), /Source-write behavior remains unavailable\./);
});

// ---------- 11 ----------
test("CHANGELOG ships the PreparedIntentPlan approval/proof envelope", () => {
  // Tightened past the slice-81 "Shipped PreparedIntentPlan v1" entry to gate
  // the slice-83 approval/proof amendment.
  assert.match(normalize(read("CHANGELOG.md")), /Amended PreparedIntentPlan v1 with the required approval\/proof envelope/);
});

// ---------- 12 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

// ---------- 13 ----------
test("docs say PreparedIntentPlan must be proof-approved, not merely generated", () => {
  assert.match(docs(), /PreparedIntentPlan must be proof-approved, not merely generated\./);
});

// ---------- 14 ----------
test("docs say status.value can be prepared only when approval.status is approved", () => {
  assert.match(docs(), /PreparedIntentPlan\.status\.value can be prepared only when approval\.status is approved\./);
});

// ---------- 15 ----------
test("docs say a plan with phases but without approval is not prepared", () => {
  assert.match(docs(), /A plan with phases but without approval is not prepared\./);
});

// ---------- 16 ----------
test("docs say verification requirements are proof obligations, not VerificationPlan", () => {
  assert.match(docs(), /Verification requirements are proof obligations, not VerificationPlan\./);
});

// ---------- 17 ----------
test("approval-envelope review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, approvalReviewPacket)));
  assert.match(read(approvalReviewPacket), /PURPOSE PRESERVATION CHECK/);
});

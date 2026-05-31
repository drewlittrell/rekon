// Docs tests for the Intent VerificationPlan Handoff capability (slice 93).
//
// Gate the concept doc, CHANGELOG entry, and review packet. The CHANGELOG
// assertion fails until the bulk doc update lands the real entry.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const concept = norm(read("docs/concepts/intent-verification-plan-handoff.md"));
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-verification-plan-handoff-v1.md");

// ---------- 1 ----------
test("concept doc exists with title", () => {
  assert.match(concept, /Intent VerificationPlan Handoff/);
});

// ---------- 2 ----------
test("doc says generation only from a proof-approved PreparedIntentPlan", () => {
  assert.match(concept, /Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan/);
});

// ---------- 3 ----------
test("doc says generation must require PreparedIntentPlan verification requirements", () => {
  assert.match(concept, /VerificationPlan generation must require PreparedIntentPlan verification requirements/);
});

// ---------- 4 ----------
test("doc says IntentStatusReport gates but does not generate VerificationPlan", () => {
  assert.match(concept, /IntentStatusReport gates generation but does not generate VerificationPlan/);
});

// ---------- 5 ----------
test("doc says WorkOrder is optional in v1 and cited when available", () => {
  assert.match(concept, /WorkOrder is optional in v1 and cited when available/);
});

// ---------- 6 ----------
test("doc says freshness and runtime drift are rechecked at handoff time", () => {
  assert.match(concept, /Freshness and runtime drift are rechecked at handoff time/);
});

// ---------- 7 ----------
test("doc says generated VerificationPlan traces back to PreparedIntentPlan", () => {
  assert.match(concept, /Generated VerificationPlan traces back to PreparedIntentPlan/);
});

// ---------- 8 ----------
test("doc says generation does not create WorkOrder", () => {
  assert.match(concept, /VerificationPlan generation does not create WorkOrder/);
});

// ---------- 9 ----------
test("doc says generation does not create VerificationRun or VerificationResult", () => {
  assert.match(concept, /VerificationPlan generation does not create VerificationRun or VerificationResult/);
});

// ---------- 10 ----------
test("doc says generation does not execute commands", () => {
  assert.match(concept, /VerificationPlan generation does not execute commands/);
});

// ---------- 11 ----------
test("doc says generation does not write source files", () => {
  assert.match(concept, /VerificationPlan generation does not write source files/);
});

// ---------- 12 ----------
test("doc says intent:go remains deferred", () => {
  assert.match(concept, /intent:go remains deferred/);
});

// ---------- 13 ----------
test("CHANGELOG records the Intent VerificationPlan Handoff Implementation", () => {
  assert.match(changelog, /Intent VerificationPlan Handoff Implementation/);
  assert.match(changelog, /intent verification-plan generate/);
});

// ---------- 14 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

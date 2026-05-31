// Docs tests for the Intent WorkOrder Handoff capability (slice 90).
//
// These gate the concept doc, the CHANGELOG entry, and the README pointer for the
// `rekon intent work-order generate` handoff. The CHANGELOG / README assertions
// fail until the bulk doc update lands the real entries.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const concept = norm(read("docs/concepts/intent-work-order-handoff.md"));
const changelog = norm(read("CHANGELOG.md"));
const readme = norm(read("README.md"));

// ---------- 1 ----------
test("concept doc has the Intent WorkOrder Handoff title", () => {
  assert.match(concept, /Intent WorkOrder Handoff/);
});

// ---------- 2 ----------
test("concept doc states it is WorkOrder generation, not intent:go", () => {
  assert.match(concept, /WorkOrder artifact generation, not intent:go/);
});

// ---------- 3 ----------
test("concept doc states generation requires a proof-approved PreparedIntentPlan", () => {
  assert.match(concept, /requires a proof-approved PreparedIntentPlan/);
});

// ---------- 4 ----------
test("concept doc states IntentStatusReport gates but does not generate WorkOrder", () => {
  assert.match(concept, /IntentStatusReport gates WorkOrder generation but does not generate WorkOrder/);
});

// ---------- 5 ----------
test("concept doc states the handoff rechecks freshness and drift", () => {
  assert.match(concept, /rechecks freshness and runtime drift at handoff time/);
});

// ---------- 6 ----------
test("concept doc states generated WorkOrder traces back to PreparedIntentPlan", () => {
  assert.match(concept, /Generated WorkOrder traces back to PreparedIntentPlan/);
});

// ---------- 7 ----------
test("concept doc carries the three non-action boundary statements", () => {
  assert.match(concept, /WorkOrder generation does not create VerificationPlan/);
  assert.match(concept, /WorkOrder generation does not execute commands/);
  assert.match(concept, /WorkOrder generation does not write source files/);
});

// ---------- 8 ----------
test("concept doc states intent:go remains deferred", () => {
  assert.match(concept, /intent:go remains deferred/);
});

// ---------- 9 ----------
test("concept doc documents the generate CLI and blocked behavior", () => {
  assert.match(concept, /rekon intent work-order generate/);
  assert.match(concept, /exits non-zero, and writes no WorkOrder/);
});

// ---------- 10 ----------
test("CHANGELOG records the intent work-order generate handoff", () => {
  assert.match(changelog, /intent work-order generate/);
  assert.match(changelog, /writes exactly one WorkOrder/);
});

// ---------- 11 ----------
test("README points at the intent work-order generate handoff", () => {
  assert.match(readme, /intent work-order generate/);
});

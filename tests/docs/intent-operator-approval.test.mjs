// Docs: Intent Operator Approval / Proof Acceptance Implementation (slice 123).
//
// Verifies the implementation memo records the shipped command, its boundary,
// the approval gate, the accepted-gap model, and the CLI surface, and that the
// change is announced in the CHANGELOG and README.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel) => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoPath = "docs/strategy/intent-operator-approval-proof-acceptance-implementation.md";
const memoRaw = read(memoPath);
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const readme = norm(read("README.md"));

test("1. implementation memo has the expected title", () => {
  assert.match(memoRaw, /^# Intent Operator Approval \/ Proof Acceptance Implementation/m);
});

test("2. memo states approval writes a new revision and never mutates the source", () => {
  assert.ok(memo.includes("writes a new approved PreparedIntentPlan revision; it never mutates the source draft in place"));
});

test("3. memo states approval is never automatic", () => {
  assert.ok(memo.includes("Approval is never automatic"));
});

test("4. memo states approval enables but does not create the handoffs", () => {
  assert.ok(memo.includes("Approval enables but does not create the WorkOrder / VerificationPlan handoffs"));
});

test("5. memo states it creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult", () => {
  assert.ok(memo.includes("Approval creates no WorkOrder, VerificationPlan, VerificationRun, or VerificationResult"));
});

test("6. memo states it executes no commands and writes no source", () => {
  assert.ok(memo.includes("Approval executes no commands and writes no source files"));
});

test("7. memo states intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

test("8. memo includes the approval gate blocker table", () => {
  assert.match(memoRaw, /\| Blocker category \| Raised when \|/);
  assert.match(memoRaw, /`missing-required-accepted-gap`/);
  assert.match(memoRaw, /`plan-already-approved`/);
});

test("9. memo includes the accepted-gap table", () => {
  assert.match(memoRaw, /\| Accepted gap \(`--accept`\) \| Meaning \| Required when source reason is \|/);
  assert.match(memoRaw, /`verification-proof-missing`/);
  assert.match(memoRaw, /`runtime-drift-unresolved`/);
});

test("10. memo documents the rekon intent approve CLI surface", () => {
  assert.ok(memo.includes("rekon intent approve"));
  assert.ok(memo.includes("--accept <gap>"));
  assert.ok(memo.includes("--reason <text>"));
});

test("11. CHANGELOG and README announce rekon intent approve", () => {
  assert.ok(changelog.includes("rekon intent approve"));
  assert.ok(readme.includes("rekon intent approve"));
});

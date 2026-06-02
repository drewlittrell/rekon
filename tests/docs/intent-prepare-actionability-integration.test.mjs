// Docs tests for Intent Prepare Integration With Actionability Report (slice 131).

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

function normalized(rel) {
  return read(rel).replace(/[`*]/g, "").replace(/\s+/g, " ").toLowerCase();
}

const memo = "docs/strategy/intent-prepare-actionability-integration.md";
const reviewPacket = ".rekon-dev/review-packets/intent-prepare-actionability-integration.md";
const changelog = "CHANGELOG.md";

const doc = () => normalized(memo);

// ---------- 1 ----------
test("docs say intent prepare respects IntentPlanActionabilityReport", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.ok(doc().includes("intent prepare respects intentplanactionabilityreport"));
});

// ---------- 2 ----------
test("docs say actionable reports may feed PreparedIntentPlan generation", () => {
  assert.ok(doc().includes("actionable reports may feed preparedintentplan generation"));
});

// ---------- 3 ----------
test("docs say blocked or needs-revision reports prevent or downgrade preparation", () => {
  assert.ok(doc().includes("blocked or needs-revision reports prevent or downgrade preparation"));
});

// ---------- 4 ----------
test("docs say revision guidance is preserved", () => {
  assert.ok(doc().includes("revision guidance is preserved"));
});

// ---------- 5 ----------
test("docs say non-actionable plans are not silently prepared for approval", () => {
  assert.ok(doc().includes("non-actionable plans are not silently prepared for approval"));
});

// ---------- 6 ----------
test("docs say prepare does not auto-approve", () => {
  assert.ok(doc().includes("prepare does not auto-approve"));
});

// ---------- 7 ----------
test("docs say prepare creates no WorkOrder or VerificationPlan", () => {
  assert.ok(doc().includes("prepare creates no workorder or verificationplan"));
});

// ---------- 8 ----------
test("docs say prepare executes no commands", () => {
  assert.ok(doc().includes("prepare executes no commands"));
});

// ---------- 9 ----------
test("docs say prepare writes no source files", () => {
  assert.ok(doc().includes("prepare writes no source files"));
});

// ---------- 10 ----------
test("docs say intent:go remains deferred", () => {
  assert.ok(doc().includes("intent:go remains deferred"));
});

// ---------- 11 ----------
test("CHANGELOG mentions Intent Prepare Integration With Actionability Report", () => {
  assert.ok(normalized(changelog).includes("intent prepare integration with actionability report"));
});

// ---------- 12 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

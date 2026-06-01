// Docs tests for the Fresh Repo Intent Readiness Safety Review.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/fresh-repo-intent-readiness-safety-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/fresh-repo-intent-readiness-safety-review.md");

// ---------- 1 ----------
test("safety review doc exists with title", () => {
  assert.match(memoRaw, /# Fresh Repo Intent Readiness Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Helper And CLI Reviewed",
    "## Root Cause Review",
    "## Context Preparation Review",
    "## Artifact Producer Review",
    "## Intent Assessment Review",
    "## Runtime / Handoff Honesty Review",
    "## Fresh Repo Acceptance Proof",
    "## Phase-Level Verification Finding",
    "## Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc says fresh repo intent readiness now has a public context-prep path", () => {
  assert.ok(memo.includes("Fresh repo intent readiness now has a public context-prep path."));
});

// ---------- 4 ----------
test("doc says context prepare uses existing producer commands in dependency order", () => {
  assert.ok(memo.includes("rekon intent context prepare uses existing producer commands in dependency order."));
});

// ---------- 5 ----------
test("doc says rekon scan remains unchanged", () => {
  assert.ok(memo.includes("rekon scan remains unchanged."));
});

// ---------- 6 ----------
test("doc says rekon refresh remains unchanged", () => {
  assert.ok(memo.includes("rekon refresh remains unchanged."));
});

// ---------- 7 ----------
test("doc says missing runtime evidence is not-evaluated / observation-missing, not false success", () => {
  assert.ok(memo.includes("Missing runtime evidence is represented as not-evaluated / observation-missing, not false success."));
});

// ---------- 8 ----------
test("doc says intent assess is no longer blocked after context prep", () => {
  assert.ok(memo.includes("rekon intent assess is no longer blocked by missing StepCapabilityGraph / RuntimeGraphDriftReport after context prep."));
});

// ---------- 9 ----------
test("doc says the fresh-repo path does not require private artifact seeding", () => {
  assert.ok(memo.includes("The fresh-repo path does not require private artifact seeding."));
});

// ---------- 10 ----------
test("doc says Rekon does not run Circe in this path", () => {
  assert.ok(memo.includes("Rekon does not run Circe in this path."));
});

// ---------- 11 ----------
test("doc says Rekon does not write source files in this path", () => {
  assert.ok(memo.includes("Rekon does not write source files in this path."));
});

// ---------- 12 ----------
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred."));
});

// ---------- 13 ----------
test("doc says phase-level VerificationPlan behavior remains a recorded follow-up", () => {
  assert.ok(memo.includes("Phase-level VerificationPlan behavior remains a recorded follow-up."));
});

// ---------- 14 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Safety Finding \|/);
});

// ---------- 15 ----------
test("doc includes the producer table", () => {
  assert.match(memoRaw, /\| Artifact \| Producer Command \| Fresh Repo Behavior \|/);
});

// ---------- 16 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 17 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 18 ----------
test("CHANGELOG mentions Fresh Repo Intent Readiness Safety Review", () => {
  assert.ok(changelog.includes("Fresh Repo Intent Readiness Safety Review"));
});

// ---------- 19 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

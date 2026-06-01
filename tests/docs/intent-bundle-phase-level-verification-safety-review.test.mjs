// Docs tests for the Intent Bundle Phase-Level Verification Safety Review (slice 116).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/intent-bundle-phase-level-verification-safety-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-bundle-phase-level-verification-safety-review.md");

// ---------- 1 ----------
test("safety review doc exists with title", () => {
  assert.match(memoRaw, /# Intent Bundle Phase-Level Verification Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Implementation Reviewed",
    "## Phase Posture Review",
    "## Per-Phase VerificationPlan Review",
    "## Human / Agent Bundle Review",
    "## Circe Projection Review",
    "## Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const h of headings) assert.ok(memoRaw.includes(h), `missing heading: ${h}`);
});

// ---------- 3 ----------
test("doc says every phase has explicit verification posture", () => {
  assert.ok(memo.includes("Every phase has explicit verification posture."));
});

// ---------- 4 ----------
test("doc says phase-modify gets executable verification when safe requirements exist", () => {
  assert.ok(memo.includes("phase-modify gets executable verification when safe requirements exist."));
});

// ---------- 5 ----------
test("doc says phase-refactor gets executable verification when safe requirements exist", () => {
  assert.ok(memo.includes("phase-refactor gets executable verification when safe requirements exist."));
});

// ---------- 6 ----------
test("doc says phase-verify carries final verification", () => {
  assert.ok(memo.includes("phase-verify carries final verification."));
});

// ---------- 7 ----------
test("doc says phase-investigate and phase-review may be manual/reviewer-gated", () => {
  assert.ok(memo.includes("phase-investigate and phase-review may be manual/reviewer-gated."));
});

// ---------- 8 ----------
test("doc says manual-only phases are explicit", () => {
  assert.ok(memo.includes("Manual-only phases are explicit."));
});

// ---------- 9 ----------
test("doc says a phase without executable verification is never silently treated as verified", () => {
  assert.ok(memo.includes("A phase without executable verification is never silently treated as verified."));
});

// ---------- 10 ----------
test("doc says skipped verification is not proof", () => {
  assert.ok(memo.includes("Skipped verification is not proof."));
});

// ---------- 11 ----------
test("doc says phase-level verification posture is projection metadata, not VerificationRun", () => {
  assert.ok(memo.includes("Phase-level verification posture is projection metadata, not VerificationRun."));
});

// ---------- 12 ----------
test("doc says no commands are executed", () => {
  assert.ok(memo.includes("No commands are executed."));
});

// ---------- 13 ----------
test("doc says no VerificationRun or VerificationResult is created", () => {
  assert.ok(memo.includes("No VerificationRun or VerificationResult is created."));
});

// ---------- 14 ----------
test("doc says no source files are written", () => {
  assert.ok(memo.includes("No source files are written."));
});

// ---------- 15 ----------
test("doc says Rekon does not run Circe", () => {
  assert.ok(memo.includes("Rekon does not run Circe."));
});

// ---------- 16 ----------
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred."));
});

// ---------- 17 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Safety Finding \|/);
});

// ---------- 18 ----------
test("doc includes the posture table", () => {
  assert.match(memoRaw, /\| Phase Kind \| V1 Posture \|/);
});

// ---------- 19 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 20 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 21 ----------
test("CHANGELOG mentions Intent Bundle Phase-Level Verification Safety Review", () => {
  assert.ok(changelog.includes("Intent Bundle Phase-Level Verification Safety Review"));
});

// ---------- 22 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

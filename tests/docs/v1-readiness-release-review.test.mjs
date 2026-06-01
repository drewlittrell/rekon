// Docs tests for the V1 Readiness / Release Review.
//
// Gate the readiness memo's headings, the pinned boundary statements, the five
// decision tables, the CHANGELOG mention, and the review packet.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/v1-readiness-release-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/v1-readiness-release-review.md");

// ---------- 1 ----------
test("review doc exists with title", () => {
  assert.match(memoRaw, /# V1 Readiness \/ Release Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## V1 Scope",
    "## Included Surfaces",
    "## Included Commands",
    "## Proof Reviewed",
    "## Rekon / Circe Boundary",
    "## Excluded From V1",
    "## Known Limitations",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc says V1 means prepare/prove/package/export, not Rekon-side execution", () => {
  assert.ok(memo.includes("V1 means prepare/prove/package/export, not Rekon-side execution."), memo.slice(0, 0));
});

// ---------- 4 ----------
test("doc says Circe owns orchestration for V1", () => {
  assert.ok(memo.includes("Circe owns orchestration for V1."));
});

// ---------- 5 ----------
test("doc says intent:go remains deferred beyond V1", () => {
  assert.ok(memo.includes("intent:go remains deferred beyond V1."));
});

// ---------- 6 ----------
test("doc says Rekon does not execute commands in V1", () => {
  assert.ok(memo.includes("Rekon does not execute commands in V1."));
});

// ---------- 7 ----------
test("doc says Rekon does not write source files in V1", () => {
  assert.ok(memo.includes("Rekon does not write source files in V1."));
});

// ---------- 8 ----------
test("doc says VerificationRun and VerificationResult generation remain deferred beyond V1", () => {
  assert.ok(memo.includes("VerificationRun and VerificationResult generation remain deferred beyond V1."));
});

// ---------- 9 ----------
test("doc says the Circe proof/gate projection carries Rekon approval/proof state", () => {
  assert.ok(memo.includes("The Circe proof/gate projection carries Rekon approval/proof state"));
});

// ---------- 10 ----------
test("doc says top-level Rekon help lists the rich intent workflow", () => {
  assert.ok(memo.includes("Top-level Rekon help lists the rich intent workflow."));
});

// ---------- 11 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| V1 Decision \|/);
});

// ---------- 12 ----------
test("doc includes the command table", () => {
  assert.match(memoRaw, /\| Command \| V1 Decision \|/);
});

// ---------- 13 ----------
test("doc includes the proof table", () => {
  assert.match(memoRaw, /\| Proof \| Result \|/);
});

// ---------- 14 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| V1 Decision \|/);
});

// ---------- 15 ----------
test("doc includes the limitation table", () => {
  assert.match(memoRaw, /\| Limitation \| V1 Handling \|/);
});

// ---------- 16 ----------
test("CHANGELOG mentions the V1 Readiness / Release Review", () => {
  assert.match(changelog, /V1 Readiness \/ Release Review/);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

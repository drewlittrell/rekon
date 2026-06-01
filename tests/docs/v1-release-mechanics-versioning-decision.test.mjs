// Docs tests for the V1 Release Mechanics / Versioning Decision.
//
// Gate the decision memo's headings, the selected option, the pinned boundary
// statements, the four tables, the CHANGELOG mention, and the review packet.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/v1-release-mechanics-versioning-decision.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/v1-release-mechanics-versioning-decision.md");

// ---------- 1 ----------
test("decision memo exists with title", () => {
  assert.match(memoRaw, /# V1 Release Mechanics \/ Versioning Decision/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Release State",
    "## Package State Reviewed",
    "## Options Considered",
    "## Recommendation",
    "## Release Gate Model",
    "## Package Versioning Model",
    "## Tagging Model",
    "## Publish Model",
    "## Release Notes Model",
    "## Migration Notes Model",
    "## Boundary Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc selects staged release mechanics", () => {
  assert.ok(memo.includes("staged V1 release mechanics"), "missing staged release mechanics");
  assert.ok(memo.includes("Select Option B"), "does not select Option B");
});

// ---------- 4 ----------
test("doc says V1 release mechanics do not publish to npm in this slice", () => {
  assert.ok(memo.includes("V1 release mechanics do not publish to npm in this slice."));
});

// ---------- 5 ----------
test("doc says V1 release mechanics do not bump versions in this slice", () => {
  assert.ok(memo.includes("V1 release mechanics do not bump versions in this slice."));
});

// ---------- 6 ----------
test("doc says V1 means prepare/prove/package/export, not Rekon-side execution", () => {
  assert.ok(memo.includes("V1 means prepare/prove/package/export, not Rekon-side execution."));
});

// ---------- 7 ----------
test("doc says Circe owns orchestration for V1", () => {
  assert.ok(memo.includes("Circe owns orchestration for V1."));
});

// ---------- 8 ----------
test("doc says intent:go remains deferred beyond V1", () => {
  assert.ok(memo.includes("intent:go remains deferred beyond V1."));
});

// ---------- 9 ----------
test("doc says Rekon does not execute commands in V1", () => {
  assert.ok(memo.includes("Rekon does not execute commands in V1."));
});

// ---------- 10 ----------
test("doc says Rekon does not write source files in V1", () => {
  assert.ok(memo.includes("Rekon does not write source files in V1."));
});

// ---------- 11 ----------
test("doc says VerificationRun and VerificationResult generation remain deferred beyond V1", () => {
  assert.ok(memo.includes("VerificationRun and VerificationResult generation remain deferred beyond V1."));
});

// ---------- 12 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 13 ----------
test("doc includes the gate table", () => {
  assert.match(memoRaw, /\| Gate \| Required Before \|/);
});

// ---------- 14 ----------
test("doc includes the package table", () => {
  assert.match(memoRaw, /\| Package Surface \| Decision \|/);
});

// ---------- 15 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| V1 Decision \|/);
});

// ---------- 16 ----------
test("CHANGELOG mentions the V1 Release Mechanics / Versioning Decision", () => {
  assert.match(changelog, /V1 Release Mechanics \/ Versioning Decision/);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

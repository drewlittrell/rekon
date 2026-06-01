// Docs tests for the V1 Tagging Decision.
//
// These run BEFORE the v1.0.0 tag is created in this slice, so they intentionally do
// not assert the tag exists — only the decision memo, tables, CHANGELOG, and packet.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/v1-tagging-decision.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/v1-tagging.md");

// ---------- 1 ----------
test("tagging memo exists with title", () => {
  assert.match(memoRaw, /# V1 Tagging Decision/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Tagging Exists",
    "## Current Version State",
    "## Options Considered",
    "## Recommendation",
    "## Tag Model",
    "## Gate Model",
    "## Publish Boundary",
    "## Boundary Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("memo selects an annotated v1.0.0 tag", () => {
  assert.ok(memo.includes("annotated v1.0.0 git tag"), "missing annotated v1.0.0 git tag");
  assert.ok(memo.includes("Select Option B"), "does not select Option B");
});

// ---------- 4 ----------
test("memo says npm publish does not occur in this slice", () => {
  assert.ok(memo.includes("npm publish does not occur in this slice."));
});

// ---------- 5 ----------
test("memo says package versions remain 1.0.0", () => {
  assert.ok(memo.includes("package versions remain 1.0.0."));
});

// ---------- 6 ----------
test("memo says V1 means prepare/prove/package/export, not Rekon-side execution", () => {
  assert.ok(memo.includes("V1 means prepare/prove/package/export, not Rekon-side execution."));
});

// ---------- 7 ----------
test("memo says Circe owns orchestration for V1", () => {
  assert.ok(memo.includes("Circe owns orchestration for V1."));
});

// ---------- 8 ----------
test("memo says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred."));
});

// ---------- 9 ----------
test("memo includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 10 ----------
test("memo includes the gate table", () => {
  assert.match(memoRaw, /\| Gate \| Required Before Tag \|/);
});

// ---------- 11 ----------
test("memo includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 12 ----------
test("CHANGELOG mentions V1 Tagging", () => {
  assert.match(changelog, /V1 Tagging/);
});

// ---------- 13 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

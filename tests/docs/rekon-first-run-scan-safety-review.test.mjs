// Docs tests for the Rekon First-Run Scan Safety Review.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/rekon-first-run-scan-safety-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/rekon-first-run-scan-safety-review.md");

// ---------- 1 ----------
test("safety review doc exists with title", () => {
  assert.match(memoRaw, /# Rekon First-Run Scan Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Command Reviewed",
    "## Workspace State Review",
    "## First-Run Behavior Review",
    "## Repeat-Scan Behavior Review",
    "## Help Surface Review",
    "## Config Normalization Review",
    "## Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc says rekon scan is the canonical first-run command", () => {
  assert.ok(memo.includes("rekon scan is the canonical first-run command."));
});

// ---------- 4 ----------
test("doc says rekon scan works before .rekon/ exists", () => {
  assert.ok(memo.includes("rekon scan works before .rekon/ exists."));
});

// ---------- 5 ----------
test("doc says rekon scan creates the first repository intelligence substrate", () => {
  assert.ok(memo.includes("rekon scan creates the first repository intelligence substrate."));
});

// ---------- 6 ----------
test("doc says rekon scan works repeatedly after the first scan", () => {
  assert.ok(memo.includes("rekon scan works repeatedly after the first scan."));
});

// ---------- 7 ----------
test("doc says refresh remains an expert or compatibility term", () => {
  assert.ok(memo.includes("refresh remains an expert or compatibility term, not the first-run UX."));
});

// ---------- 8 ----------
test("doc says docs generation is not offered before the first scan", () => {
  assert.ok(memo.includes("Docs generation is not offered before the first scan."));
});

// ---------- 9 ----------
test("doc says agent handoff generation is not offered before the first scan", () => {
  assert.ok(memo.includes("Agent handoff generation is not offered before the first scan."));
});

// ---------- 10 ----------
test("doc says verification planning is not offered before the first scan", () => {
  assert.ok(memo.includes("Verification planning is not offered before the first scan."));
});

// ---------- 11 ----------
test("doc says rekon scan --json emits no ASCII art", () => {
  assert.ok(memo.includes("rekon scan --json emits no ASCII art."));
});

// ---------- 12 ----------
test("doc says rekon scan does not execute commands or write source files", () => {
  assert.ok(memo.includes("rekon scan does not execute commands or write source files."));
});

// ---------- 13 ----------
test("doc says rekon scan does not implement intent:go", () => {
  assert.ok(memo.includes("rekon scan does not implement intent:go."));
});

// ---------- 14 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Boundary \|/);
});

// ---------- 15 ----------
test("doc includes the state table", () => {
  assert.match(memoRaw, /\| State \| V1 Behavior \|/);
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
test("CHANGELOG mentions Rekon First-Run Scan Safety Review", () => {
  assert.ok(changelog.includes("Rekon First-Run Scan Safety Review"));
});

// ---------- 19 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

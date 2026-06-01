// Docs tests for the Rekon First-Run Scan / Install Onboarding Decision.
//
// Decision-only batch: asserts the memo, tables, boundary statements, CHANGELOG entry,
// and review packet. It does NOT assert any `rekon scan` implementation, since this slice
// decides the model only and does not implement the command.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/rekon-first-run-scan-onboarding-decision.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/rekon-first-run-scan-onboarding-decision.md");

// ---------- 1 ----------
test("decision memo exists with title", () => {
  assert.match(memoRaw, /# Rekon First-Run Scan \/ Install Onboarding Decision/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Onboarding Gap",
    "## Options Considered",
    "## Recommendation",
    "## Workspace State Model",
    "## Command Requirement Model",
    "## First-Run UX",
    "## Post-Scan UX",
    "## ASCII Art And Branding Model",
    "## Resource Plan",
    "## Boundary Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("memo selects scan first (Option B)", () => {
  assert.ok(memo.includes("Select Option B"), "does not select Option B");
  assert.ok(memo.includes("scan the canonical first-run command"), "does not pin scan as canonical first-run");
});

// ---------- 4 ----------
test("memo says first-run onboarding must start with scan, not refresh", () => {
  assert.ok(memo.includes("First-run onboarding must start with scan, not refresh."));
});

// ---------- 5 ----------
test("memo says docs generation is not offered before the first scan", () => {
  assert.ok(memo.includes("Docs generation is not offered before the first scan."));
});

// ---------- 6 ----------
test("memo says agent handoff generation is not offered before the first scan", () => {
  assert.ok(memo.includes("Agent handoff generation is not offered before the first scan."));
});

// ---------- 7 ----------
test("memo says verification planning is not offered before the first scan", () => {
  assert.ok(memo.includes("Verification planning is not offered before the first scan."));
});

// ---------- 8 ----------
test("memo says rekon scan creates the first repository intelligence substrate", () => {
  assert.ok(memo.includes("rekon scan creates the first repository intelligence substrate."));
});

// ---------- 9 ----------
test("memo says refresh remains an expert or compatibility term, not the first-run UX", () => {
  assert.ok(memo.includes("refresh remains an expert or compatibility term, not the first-run UX."));
});

// ---------- 10 ----------
test("memo says ASCII art must never appear in --json output", () => {
  assert.ok(memo.includes("ASCII art must never appear in --json output."));
});

// ---------- 11 ----------
test("memo says onboarding must not imply Rekon executes commands or writes source files", () => {
  assert.ok(memo.includes("Onboarding must not imply Rekon executes commands or writes source files."));
});

// ---------- 12 ----------
test("memo includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 13 ----------
test("memo includes the state table", () => {
  assert.match(memoRaw, /\| State \| Meaning \| Allowed Next Action \|/);
});

// ---------- 14 ----------
test("memo includes the command table", () => {
  assert.match(memoRaw, /\| Command Surface \| First-Run Decision \|/);
});

// ---------- 15 ----------
test("memo includes the branding table", () => {
  assert.match(memoRaw, /\| Surface \| Branding Decision \|/);
});

// ---------- 16 ----------
test("CHANGELOG mentions Rekon First-Run Scan / Install Onboarding Decision", () => {
  assert.ok(changelog.includes("Rekon First-Run Scan / Install Onboarding Decision"));
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

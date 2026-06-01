// Docs tests for the Rekon Install / Setup / ASCII Art UX Decision (slice 117).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/rekon-install-setup-ascii-ux-decision.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/rekon-install-setup-ascii-ux-decision.md");

// ---------- 1 ----------
test("decision memo exists with title", () => {
  assert.match(memoRaw, /# Rekon Install \/ Setup \/ ASCII Art UX Decision/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Install Surface",
    "## Current First-Run Surface",
    "## Options Considered",
    "## Recommendation",
    "## Install Model",
    "## Setup Model",
    "## First-Run Prompt Model",
    "## Post-Scan Prompt Model",
    "## ASCII Art And Branding Model",
    "## Resource Plan",
    "## Boundary Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const h of headings) assert.ok(memoRaw.includes(h), `missing heading: ${h}`);
});

// ---------- 3 ----------
test("doc selects staged install/setup polish", () => {
  assert.ok(memo.includes("staged install/setup polish"));
  assert.ok(memo.includes("Select Option B"));
});

// ---------- 4 ----------
test("doc says install must not run onboarding automatically", () => {
  assert.ok(memo.includes("Install must not run onboarding automatically."));
});

// ---------- 5 ----------
test("doc says first-run setup must start with scan", () => {
  assert.ok(memo.includes("First-run setup must start with scan."));
});

// ---------- 6 ----------
test("doc says docs generation is not offered before the first scan", () => {
  assert.ok(memo.includes("Docs generation is not offered before the first scan."));
});

// ---------- 7 ----------
test("doc says agent handoff generation is not offered before the first scan", () => {
  assert.ok(memo.includes("Agent handoff generation is not offered before the first scan."));
});

// ---------- 8 ----------
test("doc says verification planning is not offered before the first scan", () => {
  assert.ok(memo.includes("Verification planning is not offered before the first scan."));
});

// ---------- 9 ----------
test("doc says ASCII art must never appear in --json output", () => {
  assert.ok(memo.includes("ASCII art must never appear in --json output."));
});

// ---------- 10 ----------
test("doc says non-TTY setup must not prompt", () => {
  assert.ok(memo.includes("Non-TTY setup must not prompt."));
});

// ---------- 11 ----------
test("doc says onboarding must not imply Rekon executes commands or writes source files", () => {
  assert.ok(memo.includes("Onboarding must not imply Rekon executes commands or writes source files."));
});

// ---------- 12 ----------
test("doc says onboarding must not imply Rekon runs Circe", () => {
  assert.ok(memo.includes("Onboarding must not imply Rekon runs Circe."));
});

// ---------- 13 ----------
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred."));
});

// ---------- 14 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 15 ----------
test("doc includes the install table", () => {
  assert.match(memoRaw, /\| Surface \| Decision \|/);
});

// ---------- 16 ----------
test("doc includes the setup table", () => {
  assert.match(memoRaw, /\| Stage \| Allowed Prompt \|/);
});

// ---------- 17 ----------
test("doc includes the branding table", () => {
  assert.match(memoRaw, /\| Surface \| Branding Decision \|/);
});

// ---------- 18 ----------
test("doc includes the resource table", () => {
  assert.match(memoRaw, /\| Resource \| Use \|/);
});

// ---------- 19 ----------
test("CHANGELOG mentions Rekon Install / Setup / ASCII Art UX Decision", () => {
  assert.ok(changelog.includes("Rekon Install / Setup / ASCII Art UX Decision"));
});

// ---------- 20 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

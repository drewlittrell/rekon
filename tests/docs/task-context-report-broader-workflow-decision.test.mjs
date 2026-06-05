// Docs tests for the TaskContextReport Broader Workflow Decision (slice 176).
// Locks in the decision: TaskContextReport becomes the standard pre-intent /
// pre-work context substrate — a context substrate, not a proof artifact — while
// every approval / proof / execution / source-write boundary stays separate.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (relativePath) => readFileSync(resolve(repoRoot, relativePath), "utf8");
const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

const MEMO = "docs/strategy/task-context-report-broader-workflow-decision.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-broader-workflow-decision.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Broader Workflow Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Task Context Surface",
  "## Options Considered",
  "## Recommendation",
  "## Workflow Model",
  "## Human And Agent Output",
  "## Bundle And Handoff Model",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// 1
test("decision memo exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("doc contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
  }
});

// 3
test("doc says TaskContextReport is a context substrate, not a proof artifact", () => {
  assert.ok(memo.includes("taskcontextreport is a context substrate, not a proof artifact"));
});

// 4
test("doc says TaskContextReport may guide humans and agents, but must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport may guide humans and agents, but must not approve plans"));
});

// 5
test("doc says TaskContextReport must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport must not execute commands"));
});

// 6
test("doc says TaskContextReport must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport must not write source files"));
});

// 7
test("doc says TaskContextReport must not create WorkOrder or VerificationPlan", () => {
  assert.ok(memo.includes("taskcontextreport must not create workorder or verificationplan"));
});

// 8
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 9
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 10
test("doc says TaskContextReport consumption remains explicit unless a future decision changes it", () => {
  assert.ok(memo.includes("taskcontextreport consumption remains explicit unless a future decision changes it"));
});

// 11
test("doc says intent prepare / approve / status / handoff remain separately gated", () => {
  assert.ok(memo.includes("intent prepare / approve / status / handoff remain separately gated"));
});

// 12
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 13
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("### Option table"));
  assert.ok(memo.includes("standard pre-work context substrate"));
});

// 14
test("doc includes workflow table", () => {
  assert.ok(memoRaw.includes("### Workflow table"));
  assert.ok(memo.includes("build graph / evidence"));
});

// 15
test("doc includes output table", () => {
  assert.ok(memoRaw.includes("### Output table"));
  assert.ok(memo.includes("structured source of truth"));
});

// 16
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("### Boundary table"));
  assert.ok(memo.includes("task context vs proof"));
});

// 17
test("CHANGELOG mentions TaskContextReport Broader Workflow Decision", () => {
  assert.ok(changelog.includes("taskcontextreport broader workflow decision"));
});

// 18
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

// Docs tests for the TaskContextReport Workflow Integration Decision (slice 179).
// Locks in the decision: context-first workflow policy — TaskContextReport is the
// standard pre-work context substrate (recommended, not required, not automatic),
// consumed explicitly, with proof / approval / execution / source-write / bundle /
// intent:go boundaries preserved.

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

const MEMO = "docs/strategy/task-context-report-workflow-integration-decision.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-workflow-integration-decision.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Workflow Integration Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Workflow Surface",
  "## Options Considered",
  "## Recommendation",
  "## Context-First Workflow",
  "## Human And Agent Policy",
  "## Intent Workflow Relationship",
  "## Bundle And Handoff Context",
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
test("doc says TaskContextReport is the standard pre-work context substrate, not a proof artifact", () => {
  assert.ok(memo.includes("taskcontextreport is the standard pre-work context substrate, not a proof artifact"));
});

// 4
test("doc says context-first means context before planning or editing, not context as approval", () => {
  assert.ok(memo.includes("context-first means context before planning or editing, not context as approval"));
});

// 5
test("doc says humans should read the markdown brief before editing", () => {
  assert.ok(memo.includes("humans should read the markdown brief before editing"));
});

// 6
test("doc says agents should consume agentContext before editing", () => {
  assert.ok(memo.includes("agents should consume agentcontext before editing"));
});

// 7
test("doc says TaskContextReport must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport must not approve plans"));
});

// 8
test("doc says TaskContextReport must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport must not execute commands"));
});

// 9
test("doc says TaskContextReport must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport must not write source files"));
});

// 10
test("doc says TaskContextReport must not create WorkOrder or VerificationPlan", () => {
  assert.ok(memo.includes("taskcontextreport must not create workorder or verificationplan"));
});

// 11
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 12
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 13
test("doc says TaskContextReport consumption remains explicit unless a future decision changes it", () => {
  assert.ok(memo.includes("taskcontextreport consumption remains explicit unless a future decision changes it"));
});

// 14
test("doc says prepare / approve / status / handoff remain separately gated", () => {
  assert.ok(memo.includes("prepare / approve / status / handoff remain separately gated"));
});

// 15
test("doc says TaskContextReport may be included in bundles only as optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport may be included in bundles only as optional context, not proof"));
});

// 16
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 17
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("| Option | Decision | Reason |"));
});

// 18
test("doc includes workflow table", () => {
  assert.ok(memoRaw.includes("| Workflow Step | Decision |"));
});

// 19
test("doc includes human/agent table", () => {
  assert.ok(memoRaw.includes("| Consumer | Uses |"));
});

// 20
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("| Boundary | Decision |"));
});

// 21
test("CHANGELOG mentions TaskContextReport Workflow Integration Decision", () => {
  assert.ok(changelog.includes("taskcontextreport workflow integration decision"));
});

// 22
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

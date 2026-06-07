// Docs tests for the TaskContextReport Bundle Handoff Guidance Safety Review (slice 189).
// Locks the review conclusion + boundary language for the slice-188 agent-facing
// handoff guidance: optional context, not proof; agent files promote the sidecars
// only when present; agent/context.json metadata is additive and preserves existing
// fields; gates stay authoritative; Circe handoff stays the machine contract;
// intent:go deferred.

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

const MEMO = "docs/strategy/task-context-report-bundle-handoff-guidance-safety-review.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-handoff-guidance-safety-review.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Bundle Handoff Guidance Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Implementation Reviewed",
  "## Agent Instructions Review",
  "## Agent Handoff Review",
  "## Agent Context Metadata Review",
  "## Without-Context Bundle Review",
  "## Circe Boundary Review",
  "## Gate Review",
  "## Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

// 1
test("safety review doc exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("doc contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
  }
});

// 3
test("doc says TaskContextReport sidecars are optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport sidecars are optional context, not proof"));
});

// 4
test("doc says agent/instructions.md promotes optional task context only when sidecars are present", () => {
  assert.ok(memo.includes("agent/instructions.md promotes optional task context only when sidecars are present"));
});

// 5
test("doc says agent/handoff.md promotes optional task context only when sidecars are present", () => {
  assert.ok(memo.includes("agent/handoff.md promotes optional task context only when sidecars are present"));
});

// 6
test("doc says agent/context.json carries additive taskContext metadata when sidecars are present", () => {
  assert.ok(memo.includes("agent/context.json carries additive taskcontext metadata when sidecars are present"));
});

// 7
test("doc says agent/context.json preserves existing fields", () => {
  assert.ok(memo.includes("agent/context.json preserves existing fields"));
});

// 8
test("doc says taskContext metadata marks proof:false", () => {
  assert.ok(memo.includes("taskcontext metadata marks proof:false"));
});

// 9
test("doc says taskContext metadata marks role optional-agent-context", () => {
  assert.ok(memo.includes("taskcontext metadata marks role optional-agent-context"));
});

// 10
test("doc says agents should read context/task-context.agent.json when it is present in a bundle", () => {
  assert.ok(memo.includes("agents should read context/task-context.agent.json when it is present in a bundle"));
});

// 11
test("doc says humans should inspect context/task-context.md when it is present in a bundle", () => {
  assert.ok(memo.includes("humans should inspect context/task-context.md when it is present in a bundle"));
});

// 12
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 13
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 14
test("doc says WorkOrder and VerificationPlan gates remain authoritative", () => {
  assert.ok(memo.includes("workorder and verificationplan gates remain authoritative"));
});

// 15
test("doc says phase gates remain authoritative", () => {
  assert.ok(memo.includes("phase gates remain authoritative"));
});

// 16
test("doc says Circe handoff JSON remains the machine handoff contract", () => {
  assert.ok(memo.includes("circe handoff json remains the machine handoff contract"));
});

// 17
test("doc says Circe should not be required to understand TaskContextReport internals", () => {
  assert.ok(memo.includes("circe should not be required to understand taskcontextreport internals"));
});

// 18
test("doc says TaskContextReport sidecars must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not approve plans"));
});

// 19
test("doc says TaskContextReport sidecars must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not execute commands"));
});

// 20
test("doc says TaskContextReport sidecars must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not write source files"));
});

// 21
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 22
test("doc includes surface table", () => {
  assert.ok(memoRaw.includes("| Surface | Status | Safety Finding |"));
});

// 23
test("doc includes agent surface table", () => {
  assert.ok(memoRaw.includes("| Agent Surface | Review Finding |"));
});

// 24
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("| Boundary | Decision |"));
});

// 25
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("| Option | Decision | Reason |"));
});

// 26
test("CHANGELOG mentions TaskContextReport Bundle Handoff Guidance Safety Review", () => {
  assert.ok(changelog.includes("taskcontextreport bundle handoff guidance safety review"));
});

// 27
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

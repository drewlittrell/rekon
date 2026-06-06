// Docs tests for the TaskContextReport Bundle Handoff Guidance Implementation (slice 188).
// Locks the boundary language for the promoted agent-facing handoff guidance:
// optional context, not proof; humans read the markdown brief, agents read the agent
// JSON; verification hints stay hints; do-not-touch stays guidance; gates stay
// authoritative; Circe handoff stays the machine contract; intent:go deferred.

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

const MEMO = "docs/strategy/task-context-report-bundle-handoff-guidance-implementation.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-handoff-guidance-v1.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("implementation memo exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("doc says TaskContextReport sidecars are optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport sidecars are optional context, not proof"));
});

// 3
test("doc says humans should inspect context/task-context.md when present", () => {
  assert.ok(memo.includes("humans should inspect context/task-context.md when present"));
});

// 4
test("doc says agents should read context/task-context.agent.json when present", () => {
  assert.ok(memo.includes("agents should read context/task-context.agent.json when present"));
});

// 5
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 6
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 7
test("doc says WorkOrder and VerificationPlan gates remain authoritative", () => {
  assert.ok(memo.includes("workorder and verificationplan gates remain authoritative"));
});

// 8
test("doc says phase gates remain authoritative", () => {
  assert.ok(memo.includes("phase gates remain authoritative"));
});

// 9
test("doc says Circe handoff JSON remains the machine handoff contract", () => {
  assert.ok(memo.includes("circe handoff json remains the machine handoff contract"));
});

// 10
test("doc says Circe should not be required to understand TaskContextReport internals", () => {
  assert.ok(memo.includes("circe should not be required to understand taskcontextreport internals"));
});

// 11
test("doc says TaskContextReport sidecars must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not approve plans"));
});

// 12
test("doc says TaskContextReport sidecars must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not execute commands"));
});

// 13
test("doc says TaskContextReport sidecars must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport sidecars must not write source files"));
});

// 14
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 15
test("CHANGELOG mentions TaskContextReport Bundle Handoff Guidance Implementation", () => {
  assert.ok(changelog.includes("taskcontextreport bundle handoff guidance implementation"));
});

// 16
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

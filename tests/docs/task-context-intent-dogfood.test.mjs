// Docs tests for the TaskContextReport Intent Dogfood (slice 173). Locks in the
// dogfood narrative: task context usefully grounds matchedContext / revisionPrompt
// while every readiness / actionability / approval / status / handoff gate holds and
// no source/plan file is written.

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

const MEMO = "docs/strategy/task-context-report-intent-dogfood.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-intent-dogfood.md";

const memo = norm(read(MEMO));
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("dogfood review doc exists", () => {
  assert.ok(read(MEMO).length > 0);
  assert.ok(memo.includes("taskcontextreport intent dogfood"));
});

// 2
test("docs say TaskContextReport improved matchedContext", () => {
  assert.ok(memo.includes("taskcontextreport improved matchedcontext"));
});

// 3
test("docs say TaskContextReport improved revisionPrompt", () => {
  assert.ok(memo.includes("taskcontextreport improved revisionprompt"));
});

// 4
test("docs say do-not-touch guidance survived into plan review", () => {
  assert.ok(memo.includes("do-not-touch guidance survived into plan review"));
});

// 5
test("docs say verification-hint guidance survived into plan review", () => {
  assert.ok(memo.includes("verification-hint guidance survived into plan review"));
});

// 6
test("docs say task context did not make readiness ready by itself", () => {
  assert.ok(memo.includes("task context did not make readiness ready by itself"));
});

// 7
test("docs say task context did not make actionability actionable by itself", () => {
  assert.ok(memo.includes("task context did not make actionability actionable by itself"));
});

// 8
test("docs say prepare remained lineage-only", () => {
  assert.ok(memo.includes("prepare remained lineage-only"));
});

// 9
test("docs say approval still required explicit accepted risks", () => {
  assert.ok(memo.includes("approval still required explicit accepted risks"));
});

// 10
test("docs say WorkOrder / VerificationPlan generated only after approve + work-ready status", () => {
  assert.ok(memo.includes("workorder / verificationplan generated only after approve + work-ready status"));
});

// 11
test("docs say bundle write emitted handoff paths", () => {
  assert.ok(memo.includes("bundle write emitted handoff paths"));
});

// 12
test("docs say source and plan files were unchanged", () => {
  assert.ok(memo.includes("source and plan files were unchanged"));
});

// 13
test("docs say no commands were executed", () => {
  assert.ok(memo.includes("no commands were executed"));
});

// 14
test("docs say intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 15
test("CHANGELOG mentions TaskContextReport Intent Dogfood", () => {
  assert.ok(changelog.includes("taskcontextreport intent dogfood"));
});

// 16
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

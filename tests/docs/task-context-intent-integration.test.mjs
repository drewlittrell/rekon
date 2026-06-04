// Docs tests for the TaskContextReport Intent Integration Implementation (slice
// 171). Locks in the boundary narrative for the shipped assess/plan-review
// consumption: task context stays proposal/context (never proof), consumption is
// explicit, prepare receives it only by lineage, and no boundary is crossed.

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

const MEMO = "docs/strategy/task-context-report-intent-integration-implementation.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-intent-integration-v1.md";

const memo = norm(read(MEMO));
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("implementation doc exists", () => {
  assert.ok(read(MEMO).length > 0);
  assert.ok(memo.includes("taskcontextreport intent integration implementation"));
});

// 2
test("docs say TaskContextReport is proposal/context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport is proposal/context, not proof"));
});

// 3
test("docs say TaskContextReport consumption is explicit, not automatic", () => {
  assert.ok(memo.includes("taskcontextreport consumption is explicit, not automatic"));
});

// 4
test("docs say TaskContextReport must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport must not approve plans"));
});

// 5
test("docs say TaskContextReport must not satisfy proof gates by itself", () => {
  assert.ok(memo.includes("taskcontextreport must not satisfy proof gates by itself"));
});

// 6
test("docs say TaskContextReport must not replace deterministic evidence artifacts", () => {
  assert.ok(memo.includes("taskcontextreport must not replace deterministic evidence artifacts"));
});

// 7
test("docs say TaskContextReport must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport must not execute commands"));
});

// 8
test("docs say TaskContextReport must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport must not write source files"));
});

// 9
test("docs say TaskContextReport must not create WorkOrder or VerificationPlan", () => {
  assert.ok(memo.includes("taskcontextreport must not create workorder or verificationplan"));
});

// 10
test("docs say TaskContextReport must not run Circe", () => {
  assert.ok(memo.includes("taskcontextreport must not run circe"));
});

// 11
test("docs say verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 12
test("docs say do-not-touch zones are constraints/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones are constraints/context, not enforcement"));
});

// 13
test("docs say retrieval-low-signal remains a warning, not an approval blocker", () => {
  assert.ok(memo.includes("retrieval-low-signal remains a warning, not an approval blocker"));
});

// 14
test("docs say PreparedIntentPlan receives TaskContextReport only by lineage, not direct proof", () => {
  assert.ok(memo.includes("preparedintentplan receives taskcontextreport only by lineage, not direct proof"));
});

// 15
test("docs say intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 16
test("CHANGELOG mentions TaskContextReport Intent Integration Implementation", () => {
  assert.ok(changelog.includes("taskcontextreport intent integration implementation"));
});

// 17
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

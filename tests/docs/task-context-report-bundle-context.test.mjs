// Docs tests for the TaskContextReport Bundle Context Implementation (slice 183).
// Locks in the boundary language for the shipped feature: `rekon intent bundle
// write --task-context-ref` attaches a TaskContextReport as OPTIONAL bundle
// context (additive manifest.context + context/ sidecars), never proof, with the
// Circe handoff projection unchanged and every approval / gate / execution /
// source-write / intent:go boundary preserved.

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

const MEMO = "docs/strategy/task-context-report-bundle-context-implementation.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-context-v1.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("implementation memo exists", () => {
  assert.ok(memoRaw.length > 0);
});

// 2
test("doc says TaskContextReport may be included in bundles only as optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport may be included in bundles only as optional context, not proof"));
});

// 3
test("doc says TaskContextReport must not be required to write an intent bundle", () => {
  assert.ok(memo.includes("taskcontextreport must not be required to write an intent bundle"));
});

// 4
test("doc says TaskContextReport must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport must not approve plans"));
});

// 5
test("doc says TaskContextReport must not satisfy WorkOrder or VerificationPlan gates", () => {
  assert.ok(memo.includes("taskcontextreport must not satisfy workorder or verificationplan gates"));
});

// 6
test("doc says TaskContextReport must not change phase gates", () => {
  assert.ok(memo.includes("taskcontextreport must not change phase gates"));
});

// 7
test("doc says TaskContextReport must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport must not execute commands"));
});

// 8
test("doc says TaskContextReport must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport must not write source files"));
});

// 9
test("doc says TaskContextReport must not run Circe", () => {
  assert.ok(memo.includes("taskcontextreport must not run circe"));
});

// 10
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 11
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 12
test("doc says Circe handoff JSON is unchanged in v1", () => {
  assert.ok(memo.includes("circe handoff json is unchanged in v1"));
});

// 13
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 14
test("CHANGELOG mentions TaskContextReport Bundle Context Implementation", () => {
  assert.ok(changelog.includes("taskcontextreport bundle context implementation"));
});

// 15
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

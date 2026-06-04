// Docs tests for the TaskContextReport Selection Quality Fix (slice 169). Locks in
// the fix narrative: free-form verification intent now creates hints without
// inventing commands; verification hints stay hints (never executed); weak
// retrieval neighbors are labelled supporting context or excluded with a warning;
// retrieval-low-signal stays visible; and no boundary is crossed.

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

const MEMO = "docs/strategy/task-context-report-selection-quality-fix.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-selection-quality-fix.md";

const memo = norm(read(MEMO));
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

// 1
test("quality fix doc exists and is titled", () => {
  assert.ok(read(MEMO).length > 0);
  assert.ok(memo.includes("taskcontextreport selection quality fix"));
});

// 2
test("docs say free-form verification intent creates hints without inventing commands", () => {
  assert.ok(memo.includes("free-form verification intent creates verification hints without inventing commands"));
});

// 3
test("docs say verification hints are hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints are hints, not executed commands"));
});

// 4
test("docs say weak retrieval neighbors are labelled supporting context or excluded with a warning", () => {
  assert.ok(memo.includes("weak retrieval neighbors are labelled supporting context or excluded with a warning"));
});

// 5
test("docs say retrieval-low-signal remains visible", () => {
  assert.ok(memo.includes("retrieval-low-signal remains visible"));
});

// 6
test("docs say source files are not written", () => {
  assert.ok(memo.includes("source files are not written"));
});

// 7
test("docs say no commands are executed", () => {
  assert.ok(memo.includes("no commands are executed"));
});

// 8
test("docs say no WorkOrder or VerificationPlan is created", () => {
  assert.ok(memo.includes("no workorder or verificationplan is created"));
});

// 9
test("docs say no Circe is run", () => {
  assert.ok(memo.includes("no circe is run"));
});

// 10
test("docs say intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 11
test("CHANGELOG mentions TaskContextReport Selection Quality Fix", () => {
  assert.ok(changelog.includes("taskcontextreport selection quality fix"));
});

// 12
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

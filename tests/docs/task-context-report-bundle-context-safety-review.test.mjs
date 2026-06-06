// Docs tests for the TaskContextReport Bundle Context Safety Review (slice 184).
// Locks the safety-review conclusion + boundary language for the shipped slice-183
// bundle-context implementation: optional context, not proof; additive
// manifest.context + context/ sidecars only; Circe handoff unchanged; WorkOrder /
// VerificationPlan / phase gates unchanged; no approval / execution / source-write /
// intent:go.

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

const MEMO = "docs/strategy/task-context-report-bundle-context-safety-review.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-bundle-context-safety-review.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Bundle Context Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Implementation Reviewed",
  "## Manifest Context Review",
  "## Sidecar Review",
  "## Circe Handoff Review",
  "## Gate Review",
  "## CLI Review",
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
test("doc says TaskContextReport may be included in bundles only as optional context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport may be included in bundles only as optional context, not proof"));
});

// 4
test("doc says TaskContextReport is not required to write an intent bundle", () => {
  assert.ok(memo.includes("taskcontextreport is not required to write an intent bundle"));
});

// 5
test("doc says manifest.context.taskContextReports marks proof:false", () => {
  assert.ok(memo.includes("manifest.context.taskcontextreports marks proof:false"));
});

// 6
test("doc says manifest.context.taskContextReports marks role optional-agent-context", () => {
  assert.ok(memo.includes("manifest.context.taskcontextreports marks role optional-agent-context"));
});

// 7
test("doc says context/task-context.md is optional guidance, not proof", () => {
  assert.ok(memo.includes("context/task-context.md is optional guidance, not proof"));
});

// 8
test("doc says context/task-context.agent.json carries all-false boundaries", () => {
  assert.ok(memo.includes("context/task-context.agent.json carries all-false boundaries"));
});

// 9
test("doc says context/task-context.refs.json carries refs and proof:false", () => {
  assert.ok(memo.includes("context/task-context.refs.json carries refs and proof:false"));
});

// 10
test("doc says Circe handoff JSON is unchanged in v1", () => {
  assert.ok(memo.includes("circe handoff json is unchanged in v1"));
});

// 11
test("doc says TaskContextReport must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport must not approve plans"));
});

// 12
test("doc says TaskContextReport must not satisfy WorkOrder or VerificationPlan gates", () => {
  assert.ok(memo.includes("taskcontextreport must not satisfy workorder or verificationplan gates"));
});

// 13
test("doc says TaskContextReport must not change phase gates", () => {
  assert.ok(memo.includes("taskcontextreport must not change phase gates"));
});

// 14
test("doc says TaskContextReport must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport must not execute commands"));
});

// 15
test("doc says TaskContextReport must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport must not write source files"));
});

// 16
test("doc says TaskContextReport must not run Circe", () => {
  assert.ok(memo.includes("taskcontextreport must not run circe"));
});

// 17
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 18
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 19
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 20
test("doc includes surface table", () => {
  assert.ok(memoRaw.includes("| Surface | Status | Safety Finding |"));
});

// 21
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("| Boundary | Decision |"));
});

// 22
test("doc includes failure table", () => {
  assert.ok(memoRaw.includes("| Failure Case | Review Finding |"));
});

// 23
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("| Option | Decision | Reason |"));
});

// 24
test("CHANGELOG mentions TaskContextReport Bundle Context Safety Review", () => {
  assert.ok(changelog.includes("taskcontextreport bundle context safety review"));
});

// 25
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

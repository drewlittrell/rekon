// Docs tests for the TaskContextReport Intent Integration Safety Review (slice
// 172). Locks in the boundary narrative for the reviewed assess/plan-review
// consumption: additive context only, never proof/approval/execution; prepare by
// lineage only; every trust boundary intact.

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

const MEMO = "docs/strategy/task-context-report-intent-integration-safety-review.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-intent-integration-safety-review.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Intent Integration Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Implementation Reviewed",
  "## Selection Model Review",
  "## Intent Assessment Review",
  "## Plan Actionability Review",
  "## Prepared Plan Lineage Review",
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
test("doc says TaskContextReport is proposal/context, not proof", () => {
  assert.ok(memo.includes("taskcontextreport is proposal/context, not proof"));
});

// 4
test("doc says TaskContextReport consumption is explicit, not automatic", () => {
  assert.ok(memo.includes("taskcontextreport consumption is explicit, not automatic"));
});

// 5
test("doc says TaskContextReport must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport must not approve plans"));
});

// 6
test("doc says TaskContextReport must not satisfy proof gates by itself", () => {
  assert.ok(memo.includes("taskcontextreport must not satisfy proof gates by itself"));
});

// 7
test("doc says TaskContextReport must not replace deterministic evidence artifacts", () => {
  assert.ok(memo.includes("taskcontextreport must not replace deterministic evidence artifacts"));
});

// 8
test("doc says TaskContextReport must not suppress deterministic blockers", () => {
  assert.ok(memo.includes("taskcontextreport must not suppress deterministic blockers"));
});

// 9
test("doc says IntentAssessmentReport readiness remains governed by existing readiness gates", () => {
  assert.ok(memo.includes("intentassessmentreport readiness remains governed by existing readiness gates"));
});

// 10
test("doc says IntentPlanActionabilityReport status remains governed by plan actionability, not task context alone", () => {
  assert.ok(memo.includes("intentplanactionabilityreport status remains governed by plan actionability, not task context alone"));
});

// 11
test("doc says TaskContextReport enrichment is additive after readiness/status decisions", () => {
  assert.ok(memo.includes("taskcontextreport enrichment is additive after readiness/status decisions"));
});

// 12
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 13
test("doc says do-not-touch zones are constraints/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones are constraints/context, not enforcement"));
});

// 14
test("doc says retrieval-low-signal remains a warning, not an approval blocker", () => {
  assert.ok(memo.includes("retrieval-low-signal remains a warning, not an approval blocker"));
});

// 15
test("doc says missing explicit task-context refs fail cleanly", () => {
  assert.ok(memo.includes("missing explicit task-context refs fail cleanly"));
});

// 16
test("doc says stale or irrelevant task context is not consumed silently", () => {
  assert.ok(memo.includes("stale or irrelevant task context is not consumed silently"));
});

// 17
test("doc says PreparedIntentPlan receives TaskContextReport only by lineage, not direct proof", () => {
  assert.ok(memo.includes("preparedintentplan receives taskcontextreport only by lineage, not direct proof"));
});

// 18
test("doc says intent prepare has no direct task-context flag", () => {
  assert.ok(memo.includes("intent prepare has no direct task-context flag"));
});

// 19
test("doc says TaskContextReport creates no PreparedIntentPlan", () => {
  assert.ok(memo.includes("taskcontextreport creates no preparedintentplan"));
});

// 20
test("doc says TaskContextReport creates no WorkOrder", () => {
  assert.ok(memo.includes("taskcontextreport creates no workorder"));
});

// 21
test("doc says TaskContextReport creates no VerificationPlan", () => {
  assert.ok(memo.includes("taskcontextreport creates no verificationplan"));
});

// 22
test("doc says TaskContextReport executes no commands", () => {
  assert.ok(memo.includes("taskcontextreport executes no commands"));
});

// 23
test("doc says TaskContextReport writes no source files", () => {
  assert.ok(memo.includes("taskcontextreport writes no source files"));
});

// 24
test("doc says TaskContextReport runs no Circe", () => {
  assert.ok(memo.includes("taskcontextreport runs no circe"));
});

// 25
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 26
test("doc includes surface table", () => {
  assert.ok(memoRaw.includes("### Surface table"));
  assert.ok(memo.includes("explicit opt-in"));
  assert.ok(memo.includes("boundary + relevance gated"));
});

// 27
test("doc includes consumer table", () => {
  assert.ok(memoRaw.includes("### Consumer table"));
  assert.ok(memo.includes("context enrichment after readiness"));
});

// 28
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("### Boundary table"));
  assert.ok(memo.includes("task context vs proof"));
});

// 29
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("### Options Considered") || memoRaw.includes("## Options Considered"));
  assert.ok(memo.includes("declare integration safe/stable"));
});

// 30
test("CHANGELOG mentions TaskContextReport Intent Integration Safety Review", () => {
  assert.ok(changelog.includes("taskcontextreport intent integration safety review"));
});

// 31
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

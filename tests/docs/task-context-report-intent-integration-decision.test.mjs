// Docs tests for the TaskContextReport Intent Integration Decision (slice 170).
// Locks in the decision: explicit (opt-in) TaskContextReport consumption by intent
// assess + plan review; prepare receives it by lineage only; it stays
// proposal/context (never proof) and crosses no boundary.

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

const MEMO = "docs/strategy/task-context-report-intent-integration-decision.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-intent-integration-decision.md";

const memo = norm(read(MEMO));
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const HEADINGS = [
  "## decision summary",
  "## why this decision exists",
  "## current task context surface",
  "## options considered",
  "## recommendation",
  "## intent assessment consumption",
  "## plan actionability consumption",
  "## prepared plan lineage",
  "## staleness and relevance model",
  "## cli surface",
  "## boundary model",
  "## what this does not do",
  "## implementation sequence",
];

// 1
test("decision memo exists", () => {
  assert.ok(read(MEMO).length > 0);
  assert.ok(memo.includes("taskcontextreport intent integration decision"));
});

// 2
test("doc contains all required headings", () => {
  for (const heading of HEADINGS) {
    assert.ok(memo.includes(heading), `missing heading: ${heading}`);
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
test("doc says TaskContextReport must not run Circe", () => {
  assert.ok(memo.includes("taskcontextreport must not run circe"));
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
test("doc says PreparedIntentPlan should receive TaskContextReport only by lineage, not direct proof", () => {
  assert.ok(memo.includes("preparedintentplan should receive taskcontextreport only by lineage, not direct proof"));
});

// 16
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 17
test("doc includes the option table", () => {
  assert.ok(memo.includes("automatic latest consumption | rejected"));
  assert.ok(memo.includes("context as proof | rejected"));
});

// 18
test("doc includes the consumer table", () => {
  assert.ok(memo.includes("intent plan review | allowed explicit context"));
  assert.ok(memo.includes("intent prepare | lineage only, no direct consumption"));
});

// 19
test("doc includes the mapping table", () => {
  assert.ok(memo.includes("matchedcontext / plan grounding"));
  assert.ok(memo.includes("donottouch | non-goals / constraints"));
});

// 20
test("doc includes the boundary table", () => {
  assert.ok(memo.includes("task context vs proof | proposal/context"));
  assert.ok(memo.includes("intent:go | deferred"));
});

// 21
test("CHANGELOG mentions TaskContextReport Intent Integration Decision", () => {
  assert.ok(changelog.includes("taskcontextreport intent integration decision"));
});

// 22
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

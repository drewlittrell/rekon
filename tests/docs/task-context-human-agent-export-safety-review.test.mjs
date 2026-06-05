// Docs tests for the TaskContextReport Human/Agent Export Safety Review (slice
// 178). Locks in the review's conclusion and every boundary statement: the
// slice-177 export is presentation only — human markdown is a rendered view, the
// agentContext JSON is additive and preserves existing fields, hints stay hints,
// do-not-touch stays guidance, evidence is preserved, boundaries stay all-false,
// and no approval / execution / source write / WorkOrder / VerificationPlan /
// Circe / intent:go is introduced.

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

const MEMO = "docs/strategy/task-context-human-agent-export-safety-review.md";
const PACKET = ".rekon-dev/review-packets/task-context-human-agent-export-safety-review.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Human/Agent Export Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Implementation Reviewed",
  "## Human Markdown Review",
  "## Agent JSON Review",
  "## Evidence Review",
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
test("doc says TaskContextReport artifact is canonical", () => {
  assert.ok(memo.includes("taskcontextreport artifact is canonical"));
});

// 4
test("doc says human markdown is a rendered view", () => {
  assert.ok(memo.includes("human markdown is a rendered view"));
});

// 5
test("doc says agent JSON is the structured source of truth", () => {
  assert.ok(memo.includes("agent json is the structured source of truth"));
});

// 6
test('doc says the human view says "Read this before editing."', () => {
  assert.ok(memo.includes('the human view says "read this before editing."'));
});

// 7
test("doc says agentContext is additive and preserves existing top-level JSON fields", () => {
  assert.ok(memo.includes("agentcontext is additive and preserves existing top-level json fields"));
});

// 8
test("doc says verification hints remain hints, not executed commands", () => {
  assert.ok(memo.includes("verification hints remain hints, not executed commands"));
});

// 9
test("doc says agentContext verification hints carry executed:false", () => {
  assert.ok(memo.includes("agentcontext verification hints carry executed:false"));
});

// 10
test("doc says do-not-touch zones remain guidance/context, not enforcement", () => {
  assert.ok(memo.includes("do-not-touch zones remain guidance/context, not enforcement"));
});

// 11
test("doc says agentContext do-not-touch zones carry enforced:false", () => {
  assert.ok(memo.includes("agentcontext do-not-touch zones carry enforced:false"));
});

// 12
test("doc says evidence refs are preserved", () => {
  assert.ok(memo.includes("evidence refs are preserved"));
});

// 13
test("doc says agentContext includes all-false boundaries", () => {
  assert.ok(memo.includes("agentcontext includes all-false boundaries"));
});

// 14
test("doc says TaskContextReport must not approve plans", () => {
  assert.ok(memo.includes("taskcontextreport must not approve plans"));
});

// 15
test("doc says TaskContextReport must not execute commands", () => {
  assert.ok(memo.includes("taskcontextreport must not execute commands"));
});

// 16
test("doc says TaskContextReport must not write source files", () => {
  assert.ok(memo.includes("taskcontextreport must not write source files"));
});

// 17
test("doc says TaskContextReport must not create WorkOrder or VerificationPlan", () => {
  assert.ok(memo.includes("taskcontextreport must not create workorder or verificationplan"));
});

// 18
test("doc says TaskContextReport must not run Circe", () => {
  assert.ok(memo.includes("taskcontextreport must not run circe"));
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
test("doc includes output table", () => {
  assert.ok(memoRaw.includes("| Output | Review Finding |"));
});

// 22
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("| Boundary | Decision |"));
});

// 23
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("| Option | Decision | Reason |"));
});

// 24
test("CHANGELOG mentions TaskContextReport Human/Agent Export Safety Review", () => {
  assert.ok(changelog.includes("taskcontextreport human/agent export safety review"));
});

// 25
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

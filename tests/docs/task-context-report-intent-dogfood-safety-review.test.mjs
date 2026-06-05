// Docs tests for the TaskContextReport Intent Dogfood Safety Review (slice 174).
// Locks in the review narrative: the slice-173 dogfood path is safe/stable because the
// existing readiness / actionability / approval / status / handoff / proof gates held,
// not because task context weakened any boundary.

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

const MEMO = "docs/strategy/task-context-report-intent-dogfood-safety-review.md";
const PACKET = ".rekon-dev/review-packets/task-context-report-intent-dogfood-safety-review.md";

const memoRaw = read(MEMO);
const memo = norm(memoRaw);
const packet = read(PACKET);
const changelog = norm(read("CHANGELOG.md"));

const REQUIRED_HEADINGS = [
  "# TaskContextReport Intent Dogfood Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Dogfood Reviewed",
  "## Assess Result Review",
  "## Plan Review Result Review",
  "## Plan Answer Result Review",
  "## Prepare Result Review",
  "## Approval And Status Review",
  "## WorkOrder / Verification Result Review",
  "## Bundle Result Review",
  "## Retrieval-Assisted Context Review",
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
test("doc says TaskContextReport improved matchedContext without making readiness ready by itself", () => {
  assert.ok(memo.includes("taskcontextreport improved matchedcontext without making readiness ready by itself"));
});

// 5
test("doc says TaskContextReport improved revisionPrompt without making actionability actionable by itself", () => {
  assert.ok(memo.includes("taskcontextreport improved revisionprompt without making actionability actionable by itself"));
});

// 6
test("doc says do-not-touch guidance survived into plan review", () => {
  assert.ok(memo.includes("do-not-touch guidance survived into plan review"));
});

// 7
test("doc says verification-hint guidance survived into plan review as hints, not executed commands", () => {
  assert.ok(memo.includes("verification-hint guidance survived into plan review as hints, not executed commands"));
});

// 8
test("doc says plan answer became actionable only after explicit operator answers", () => {
  assert.ok(memo.includes("plan answer became actionable only after explicit operator answers"));
});

// 9
test("doc says prepare remained lineage-only", () => {
  assert.ok(memo.includes("prepare remained lineage-only"));
});

// 10
test("doc says prepare approval remained needs-review before explicit approval", () => {
  assert.ok(memo.includes("prepare approval remained needs-review before explicit approval"));
});

// 11
test("doc says approval required explicit accepted risks", () => {
  assert.ok(memo.includes("approval required explicit accepted risks"));
});

// 12
test("doc says status transition required explicit work-ready transition", () => {
  assert.ok(memo.includes("status transition required explicit work-ready transition"));
});

// 13
test("doc says WorkOrder and VerificationPlan generated only after approve plus work-ready status", () => {
  assert.ok(memo.includes("workorder and verificationplan generated only after approve plus work-ready status"));
});

// 14
test("doc says bundle write emitted handoff paths", () => {
  assert.ok(memo.includes("bundle write emitted handoff paths"));
});

// 15
test("doc says source and plan files were unchanged", () => {
  assert.ok(memo.includes("source and plan files were unchanged"));
});

// 16
test("doc says no commands were executed", () => {
  assert.ok(memo.includes("no commands were executed"));
});

// 17
test("doc says no VerificationRun or VerificationResult was created", () => {
  assert.ok(memo.includes("no verificationrun or verificationresult was created"));
});

// 18
test("doc says Rekon did not run Circe", () => {
  assert.ok(memo.includes("rekon did not run circe"));
});

// 19
test("doc says intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// 20
test("doc says the context task provider-default finding is non-blocking but should be fixed before broader workflow use", () => {
  assert.ok(memo.includes("the context task provider-default finding is non-blocking but should be fixed before broader workflow use"));
});

// 21
test("doc includes surface table", () => {
  assert.ok(memoRaw.includes("### Surface table"));
  assert.ok(memo.includes("produced taskcontextreport"));
});

// 22
test("doc includes boundary table", () => {
  assert.ok(memoRaw.includes("### Boundary table"));
  assert.ok(memo.includes("task context vs proof"));
});

// 23
test("doc includes finding table", () => {
  assert.ok(memoRaw.includes("### Finding table"));
  assert.ok(memo.includes("provider-default missing-key behavior"));
});

// 24
test("doc includes option table", () => {
  assert.ok(memoRaw.includes("### Option table"));
  assert.ok(memo.includes("declare dogfood safe/stable"));
});

// 25
test("CHANGELOG mentions TaskContextReport Intent Dogfood Safety Review", () => {
  assert.ok(changelog.includes("taskcontextreport intent dogfood safety review"));
});

// 26
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.length > 0);
  assert.ok(packet.includes("PURPOSE PRESERVATION CHECK"));
});

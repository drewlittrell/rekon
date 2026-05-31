// Docs tests for the Intent VerificationPlan Handoff Safety Review (slice 94).
//
// Gate the safety-review memo's required headings, boundary statements, and
// tables, plus the CHANGELOG entry and review packet. The CHANGELOG assertion
// fails until the bulk doc update lands the real entry.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/intent-verification-plan-handoff-safety-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-verification-plan-handoff-safety-review.md");

// ---------- 1 ----------
test("safety review doc exists with title", () => {
  assert.match(memoRaw, /# Intent VerificationPlan Handoff Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Helper And CLI Reviewed",
    "## Gate Review",
    "## Blocked Path Review",
    "## Generated VerificationPlan Review",
    "## Command Safety Review",
    "## Traceability Review",
    "## Freshness / Drift Recheck Review",
    "## WorkOrder Boundary Review",
    "## VerificationRun / VerificationResult Boundary Review",
    "## Command / Source-Write Boundary Review",
    "## Intent Go Boundary Review",
    "## Next Phase Plan: Plan Bundle And Agent Handoff",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc says VerificationPlan artifact generation, not intent:go", () => {
  assert.match(memo, /Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go/);
});

// ---------- 4 ----------
test("doc says generation requires a proof-approved PreparedIntentPlan", () => {
  assert.match(memo, /VerificationPlan generation requires a proof-approved PreparedIntentPlan/);
});

// ---------- 5 ----------
test("doc says generation requires PreparedIntentPlan verification requirements", () => {
  assert.match(memo, /VerificationPlan generation requires PreparedIntentPlan verification requirements/);
});

// ---------- 6 ----------
test("doc says IntentStatusReport gates but does not generate VerificationPlan", () => {
  assert.match(memo, /IntentStatusReport gates VerificationPlan generation but does not generate VerificationPlan/);
});

// ---------- 7 ----------
test("doc says WorkOrder is optional in v1 and cited when available", () => {
  assert.match(memo, /WorkOrder is optional in v1 and cited when available/);
});

// ---------- 8 ----------
test("doc says blocked handoff writes no VerificationPlan", () => {
  assert.match(memo, /Blocked handoff writes no VerificationPlan/);
});

// ---------- 9 ----------
test("doc says generated VerificationPlan must trace back to PreparedIntentPlan", () => {
  assert.match(memo, /Generated VerificationPlan must trace back to PreparedIntentPlan/);
});

// ---------- 10 ----------
test("doc says generation does not create WorkOrder", () => {
  assert.match(memo, /VerificationPlan generation does not create WorkOrder/);
});

// ---------- 11 ----------
test("doc says generation does not create VerificationRun or VerificationResult", () => {
  assert.match(memo, /VerificationPlan generation does not create VerificationRun or VerificationResult/);
});

// ---------- 12 ----------
test("doc says generation does not execute commands", () => {
  assert.match(memo, /VerificationPlan generation does not execute commands/);
});

// ---------- 13 ----------
test("doc says generation does not write source files", () => {
  assert.match(memo, /VerificationPlan generation does not write source files/);
});

// ---------- 14 ----------
test("doc says intent:go remains deferred", () => {
  assert.match(memo, /intent:go remains deferred/);
});

// ---------- 15 ----------
test("doc says plan bundle / agent handoff is deferred to the next phase plan", () => {
  assert.match(memo, /Plan bundle \/ LLM-agent handoff directory work is deferred to the next phase plan/);
});

// ---------- 16 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Boundary \|/);
});

// ---------- 17 ----------
test("doc includes the gate table", () => {
  assert.match(memoRaw, /\| Gate \| Required State \|/);
});

// ---------- 18 ----------
test("doc includes the command safety table", () => {
  assert.match(memoRaw, /\| Command Class \| V1 Behavior \|/);
});

// ---------- 19 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 20 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 21 ----------
test("CHANGELOG mentions the Intent VerificationPlan Handoff Safety Review", () => {
  assert.match(changelog, /Intent VerificationPlan Handoff Safety Review/);
});

// ---------- 22 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

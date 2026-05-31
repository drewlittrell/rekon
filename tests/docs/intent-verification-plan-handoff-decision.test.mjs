// Docs tests for the Intent VerificationPlan Handoff Decision (slice 92).
//
// Gate the decision memo's headings, selection, boundary statements, and tables,
// plus the CHANGELOG entry and review packet. The CHANGELOG assertion fails until
// the bulk doc update lands the real entry.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoRaw = read("docs/strategy/intent-verification-plan-handoff-decision.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-verification-plan-handoff-decision.md");

// ---------- 1 ----------
test("decision memo exists with title", () => {
  assert.match(memoRaw, /# Intent VerificationPlan Handoff Decision/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Boundary",
    "## Options Considered",
    "## Recommendation",
    "## VerificationPlan Generation Gate",
    "## Blocks VerificationPlan Generation",
    "## Freshness And Drift Recheck",
    "## Verification Requirement Mapping",
    "## Traceability Model",
    "## Verification Command Safety",
    "## Boundary Model",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc selects the explicit gated VerificationPlan generator", () => {
  assert.match(memo, /selects the explicit gated VerificationPlan generator/);
  assert.match(memo, /Option B — explicit gated VerificationPlan generator/);
});

// ---------- 4 ----------
test("doc says VerificationPlan artifact generation, not intent:go", () => {
  assert.match(memo, /Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go/);
});

// ---------- 5 ----------
test("doc says generation must require a proof-approved PreparedIntentPlan", () => {
  assert.match(memo, /VerificationPlan generation must require a proof-approved PreparedIntentPlan/);
});

// ---------- 6 ----------
test("doc says generation must require PreparedIntentPlan verification requirements", () => {
  assert.match(memo, /VerificationPlan generation must require PreparedIntentPlan verification requirements/);
});

// ---------- 7 ----------
test("doc says IntentStatusReport gates but does not generate VerificationPlan", () => {
  assert.match(memo, /IntentStatusReport gates VerificationPlan generation but does not generate VerificationPlan/);
});

// ---------- 8 ----------
test("doc says generated VerificationPlan must trace back to PreparedIntentPlan", () => {
  assert.match(memo, /Generated VerificationPlan must trace back to PreparedIntentPlan/);
});

// ---------- 9 ----------
test("doc says generation does not create WorkOrder", () => {
  assert.match(memo, /VerificationPlan generation does not create WorkOrder/);
});

// ---------- 10 ----------
test("doc says generation does not create VerificationRun or VerificationResult", () => {
  assert.match(memo, /VerificationPlan generation does not create VerificationRun or VerificationResult/);
});

// ---------- 11 ----------
test("doc says generation does not execute commands", () => {
  assert.match(memo, /VerificationPlan generation does not execute commands/);
});

// ---------- 12 ----------
test("doc says generation does not write source files", () => {
  assert.match(memo, /VerificationPlan generation does not write source files/);
});

// ---------- 13 ----------
test("doc says intent:go remains deferred", () => {
  assert.match(memo, /intent:go remains deferred/);
});

// ---------- 14 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 15 ----------
test("doc includes the gate table", () => {
  assert.match(memoRaw, /\| Gate \| Required State \|/);
});

// ---------- 16 ----------
test("doc includes the mapping table", () => {
  assert.match(memoRaw, /\| PreparedIntentPlan Surface \| VerificationPlan Mapping \|/);
});

// ---------- 17 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 18 ----------
test("CHANGELOG mentions the Intent VerificationPlan Handoff Decision", () => {
  assert.match(changelog, /Intent VerificationPlan Handoff Decision/);
});

// ---------- 19 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

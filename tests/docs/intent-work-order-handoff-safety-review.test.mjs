// Docs tests for the Intent WorkOrder Handoff Safety Review (slice 91).
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

const memoRaw = read("docs/strategy/intent-work-order-handoff-safety-review.md");
const memo = norm(memoRaw);
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/intent-work-order-handoff-safety-review.md");

// ---------- 1 ----------
test("safety review doc exists with title", () => {
  assert.match(memoRaw, /# Intent WorkOrder Handoff Safety Review/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Helper And CLI Reviewed",
    "## Gate Review",
    "## Blocked Path Review",
    "## Generated WorkOrder Review",
    "## Traceability Review",
    "## Freshness / Drift Recheck Review",
    "## VerificationPlan Boundary Review",
    "## Command / Source-Write Boundary Review",
    "## Intent Go Boundary Review",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) assert.ok(memoRaw.includes(heading), `missing heading: ${heading}`);
});

// ---------- 3 ----------
test("doc says WorkOrder artifact generation, not intent:go", () => {
  assert.match(memo, /Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go/);
});

// ---------- 4 ----------
test("doc says generation requires a proof-approved PreparedIntentPlan", () => {
  assert.match(memo, /WorkOrder generation requires a proof-approved PreparedIntentPlan/);
});

// ---------- 5 ----------
test("doc says IntentStatusReport gates but does not generate WorkOrder", () => {
  assert.match(memo, /IntentStatusReport gates WorkOrder generation but does not generate WorkOrder/);
});

// ---------- 6 ----------
test("doc says blocked handoff writes no WorkOrder", () => {
  assert.match(memo, /Blocked handoff writes no WorkOrder/);
});

// ---------- 7 ----------
test("doc says generated WorkOrder must trace back to PreparedIntentPlan", () => {
  assert.match(memo, /Generated WorkOrder must trace back to PreparedIntentPlan/);
});

// ---------- 8 ----------
test("doc says generation does not create VerificationPlan", () => {
  assert.match(memo, /WorkOrder generation does not create VerificationPlan/);
});

// ---------- 9 ----------
test("doc says generation does not create VerificationRun or VerificationResult", () => {
  assert.match(memo, /WorkOrder generation does not create VerificationRun or VerificationResult/);
});

// ---------- 10 ----------
test("doc says generation does not execute commands", () => {
  assert.match(memo, /WorkOrder generation does not execute commands/);
});

// ---------- 11 ----------
test("doc says generation does not write source files", () => {
  assert.match(memo, /WorkOrder generation does not write source files/);
});

// ---------- 12 ----------
test("doc says intent:go remains deferred", () => {
  assert.match(memo, /intent:go remains deferred/);
});

// ---------- 13 ----------
test("doc includes the surface table", () => {
  assert.match(memoRaw, /\| Surface \| Status \| Boundary \|/);
});

// ---------- 14 ----------
test("doc includes the gate table", () => {
  assert.match(memoRaw, /\| Gate \| Required State \|/);
});

// ---------- 15 ----------
test("doc includes the boundary table", () => {
  assert.match(memoRaw, /\| Boundary \| Decision \|/);
});

// ---------- 16 ----------
test("doc includes the option table", () => {
  assert.match(memoRaw, /\| Option \| Decision \| Reason \|/);
});

// ---------- 17 ----------
test("CHANGELOG mentions the Intent WorkOrder Handoff Safety Review", () => {
  assert.match(changelog, /Intent WorkOrder Handoff Safety Review/);
});

// ---------- 18 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

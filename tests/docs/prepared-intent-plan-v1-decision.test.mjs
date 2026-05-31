// Docs tests for the PreparedIntentPlan v1 decision (eightieth slice on the
// capability-ontology track). Strategy / architecture-decision batch: fixes the
// v1 shape, inputs, status, phase, obligation, and verification-requirement
// models for the layer after IntentAssessmentReport. No artifact is implemented.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const memo = "docs/strategy/prepared-intent-plan-v1-decision.md";
const reviewPacket = ".rekon-dev/review-packets/prepared-intent-plan-v1-decision.md";

const REQUIRED_HEADINGS = [
  "# PreparedIntentPlan v1 Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Boundary",
  "## Options Considered",
  "## Recommendation",
  "## Input Model",
  "## Prepared Status Model",
  "## Phase Model",
  "## Obligation Model",
  "## Verification Requirement Model",
  "## Boundary Model",
  "## Follow-On Artifacts",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*PreparedIntentPlan v1 Decision/);
});

// ---------- 2 ----------
test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("memo selects the artifact-backed PreparedIntentPlan", () => {
  assert.match(normalize(read(memo)), /selects the artifact-backed PreparedIntentPlan/);
});

// ---------- 4 ----------
test("memo says PreparedIntentPlan is phase/gate preparation, not WorkOrder", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan is phase\/gate preparation, not WorkOrder\./);
});

// ---------- 5 ----------
test("memo says PreparedIntentPlan does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not create WorkOrder or VerificationPlan\./);
});

// ---------- 6 ----------
test("memo says PreparedIntentPlan does not execute commands", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not execute commands\./);
});

// ---------- 7 ----------
test("memo says PreparedIntentPlan does not write source files", () => {
  assert.match(normalize(read(memo)), /PreparedIntentPlan does not write source files\./);
});

// ---------- 8 ----------
test("memo says verification requirements are not VerificationPlan", () => {
  assert.match(normalize(read(memo)), /Verification requirements are not VerificationPlan\./);
});

// ---------- 9 ----------
test("memo says IntentStatusReport remains the next layer after preparation", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport remains the next layer after preparation\./);
});

// ---------- 10 ----------
test("memo says intent:go remains deferred", () => {
  assert.match(normalize(read(memo)), /intent:go remains deferred\./);
});

// ---------- 11 ----------
test("memo says source-write behavior remains unavailable", () => {
  assert.match(normalize(read(memo)), /Source-write behavior remains unavailable\./);
});

// ---------- 12 ----------
test("memo includes option table with the selected option", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /artifact-backed PreparedIntentPlan \| selected \| preserves assess→prepare boundary/);
});

// ---------- 13 ----------
test("memo includes input table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Input \| V1 Decision \|/);
  assert.match(text, /IntentAssessmentReport \| required/);
});

// ---------- 14 ----------
test("memo includes prepared status table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Prepared Status \| Meaning \|/);
  assert.match(text, /prepared \| safe to create downstream work guidance/);
});

// ---------- 15 ----------
test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /PreparedIntentPlan vs WorkOrder \| phase\/gate plan vs implementation guidance/);
});

// ---------- 16 ----------
test("CHANGELOG ships the PreparedIntentPlan v1 decision entry", () => {
  // Tightened past the slice-79 "next slice" forward pointer.
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the PreparedIntentPlan v1 decision/);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

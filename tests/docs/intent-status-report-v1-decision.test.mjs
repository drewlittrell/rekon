// Docs tests for the IntentStatusReport v1 Decision (eighty-fifth slice on the
// capability-ontology track). Strategy / architecture-decision batch: pins the
// IntentStatusReport v1 artifact shape, inputs, status model, proof rollup, and
// boundaries. No artifact is implemented or registered.

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

const memo = "docs/strategy/intent-status-report-v1-decision.md";
const reviewPacket = ".rekon-dev/review-packets/intent-status-report-v1-decision.md";

const REQUIRED_HEADINGS = [
  "# IntentStatusReport v1 Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Boundary",
  "## Options Considered",
  "## Recommendation",
  "## Input Model",
  "## Status Model",
  "## Proof Rollup Model",
  "## Blocker / Warning Model",
  "## Boundary Model",
  "## Follow-On Artifacts",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*IntentStatusReport v1 Decision/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("doc selects artifact-backed status rollup", () => {
  assert.match(normalize(read(memo)), /selects the artifact-backed status rollup/);
});

// ---------- 4 ----------
test("doc says IntentStatusReport is status reporting, not VerificationResult", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport is status reporting, not VerificationResult\./);
});

// ---------- 5 ----------
test("doc says IntentStatusReport is not WorkOrder", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport is not WorkOrder\./);
});

// ---------- 6 ----------
test("doc says IntentStatusReport does not create WorkOrder or VerificationPlan", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport does not create WorkOrder or VerificationPlan\./);
});

// ---------- 7 ----------
test("doc says IntentStatusReport does not execute commands", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport does not execute commands\./);
});

// ---------- 8 ----------
test("doc says IntentStatusReport does not write source files", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport does not write source files\./);
});

// ---------- 9 ----------
test("doc says IntentStatusReport does not implement intent:go", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport does not implement intent:go\./);
});

// ---------- 10 ----------
test("doc says IntentStatusReport reports PreparedIntentPlan approval state but does not approve plans", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport reports PreparedIntentPlan approval state but does not approve plans\./);
});

// ---------- 11 ----------
test("doc says VerificationResult is an input to status, not the status artifact itself", () => {
  assert.match(normalize(read(memo)), /VerificationResult is an input to status, not the status artifact itself\./);
});

// ---------- 12 ----------
test("doc includes option table with the selected option", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /artifact-backed status rollup \| selected \| reports across intent\/work\/proof spine/);
});

// ---------- 13 ----------
test("doc includes input table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Input \| V1 Decision \|/);
  assert.match(text, /PreparedIntentPlan \| consumed when available/);
});

// ---------- 14 ----------
test("doc includes status table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Status \| Meaning \|/);
  assert.match(text, /prepared \| approved prepared plan exists/);
});

// ---------- 15 ----------
test("doc includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /IntentStatusReport vs WorkOrder \| status reports work, does not create it/);
});

// ---------- 16 ----------
test("CHANGELOG ships the IntentStatusReport v1 decision entry", () => {
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the IntentStatusReport v1 [Dd]ecision/);
});

// ---------- 17 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

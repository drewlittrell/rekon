// Docs tests for the Intent WorkOrder Handoff Decision (eighty-ninth slice on
// the capability-ontology track). Strategy / architecture-decision batch: pins
// the WorkOrder generator shape, gate, traceability, and content mapping for
// generating a WorkOrder from a proof-approved PreparedIntentPlan. No generator
// is implemented.

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

const memo = "docs/strategy/intent-work-order-handoff-decision.md";
const reviewPacket = ".rekon-dev/review-packets/intent-work-order-handoff-decision.md";

const REQUIRED_HEADINGS = [
  "# Intent WorkOrder Handoff Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Boundary",
  "## Options Considered",
  "## Recommendation",
  "## WorkOrder Generation Gate",
  "## Blocks WorkOrder Generation",
  "## Freshness And Drift Recheck",
  "## Traceability Model",
  "## WorkOrder Content Mapping",
  "## Verification Requirement Boundary",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*Intent WorkOrder Handoff Decision/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("doc selects explicit gated WorkOrder generator", () => {
  assert.match(normalize(read(memo)), /selects the explicit gated WorkOrder generator/);
});

// ---------- 4 ----------
test("doc says Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go", () => {
  assert.match(normalize(read(memo)), /Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go\./);
});

// ---------- 5 ----------
test("doc says WorkOrder generation must require a proof-approved PreparedIntentPlan", () => {
  assert.match(normalize(read(memo)), /WorkOrder generation must require a proof-approved PreparedIntentPlan\./);
});

// ---------- 6 ----------
test("doc says IntentStatusReport gates WorkOrder generation but does not generate WorkOrder", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport gates WorkOrder generation but does not generate WorkOrder\./);
});

// ---------- 7 ----------
test("doc says WorkOrder generation must recheck freshness and runtime drift at handoff time", () => {
  assert.match(normalize(read(memo)), /WorkOrder generation must recheck freshness and runtime drift at handoff time\./);
});

// ---------- 8 ----------
test("doc says generated WorkOrder must trace back to PreparedIntentPlan", () => {
  assert.match(normalize(read(memo)), /Generated WorkOrder must trace back to PreparedIntentPlan\./);
});

// ---------- 9 ----------
test("doc says WorkOrder generation does not create VerificationPlan", () => {
  assert.match(normalize(read(memo)), /WorkOrder generation does not create VerificationPlan\./);
});

// ---------- 10 ----------
test("doc says WorkOrder generation does not execute commands", () => {
  assert.match(normalize(read(memo)), /WorkOrder generation does not execute commands\./);
});

// ---------- 11 ----------
test("doc says WorkOrder generation does not write source files", () => {
  assert.match(normalize(read(memo)), /WorkOrder generation does not write source files\./);
});

// ---------- 12 ----------
test("doc says intent:go remains deferred", () => {
  assert.match(normalize(read(memo)), /intent:go remains deferred\./);
});

// ---------- 13 ----------
test("doc includes option table with the selected option", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /explicit gated WorkOrder generator \| selected \| completes proof-approved preparation to work guidance/);
});

// ---------- 14 ----------
test("doc includes gate table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Gate \| Required State \|/);
  assert.match(text, /PreparedIntentPlan approval \| approval\.status approved/);
});

// ---------- 15 ----------
test("doc includes mapping table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| PreparedIntentPlan Surface \| WorkOrder Mapping \|/);
  assert.match(text, /phases \| ordered implementation guidance/);
});

// ---------- 16 ----------
test("doc includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /WorkOrder handoff vs intent:go \| artifact generation, not execution/);
});

// ---------- 17 ----------
test("CHANGELOG ships the Intent WorkOrder Handoff Decision entry", () => {
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the Intent WorkOrder Handoff Decision/);
});

// ---------- 18 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

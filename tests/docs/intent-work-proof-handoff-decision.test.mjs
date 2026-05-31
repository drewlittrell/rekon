// Docs tests for the Intent Work / Proof Handoff Decision (eighty-eighth slice
// on the capability-ontology track). Strategy / architecture-decision batch:
// pins how a proof-approved PreparedIntentPlan may lead to downstream WorkOrder
// and VerificationPlan artifacts. No generator is implemented.

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

const memo = "docs/strategy/intent-work-proof-handoff-decision.md";
const reviewPacket = ".rekon-dev/review-packets/intent-work-proof-handoff-decision.md";

const REQUIRED_HEADINGS = [
  "# Intent Work / Proof Handoff Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Boundary",
  "## Options Considered",
  "## Recommendation",
  "## WorkOrder Handoff Gate",
  "## VerificationPlan Handoff Gate",
  "## Freshness And Drift Recheck",
  "## Traceability Model",
  "## WorkOrder Generation Model",
  "## VerificationPlan Generation Model",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, memo)));
  assert.match(read(memo), /#\s*Intent Work \/ Proof Handoff Decision/);
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3 ----------
test("doc selects separate gated generators", () => {
  assert.match(normalize(read(memo)), /selects separate, explicit, gated generators/);
});

// ---------- 4 ----------
test("doc says Intent work/proof handoff is artifact generation, not intent:go", () => {
  assert.match(normalize(read(memo)), /Intent work\/proof handoff is artifact generation, not intent:go\./);
});

// ---------- 5 ----------
test("doc says WorkOrder generation must require a proof-approved PreparedIntentPlan", () => {
  assert.match(normalize(read(memo)), /WorkOrder generation must require a proof-approved PreparedIntentPlan\./);
});

// ---------- 6 ----------
test("doc says VerificationPlan generation must require PreparedIntentPlan verification requirements", () => {
  assert.match(normalize(read(memo)), /VerificationPlan generation must require PreparedIntentPlan verification requirements\./);
});

// ---------- 7 ----------
test("doc says IntentStatusReport gates handoff but does not generate downstream artifacts", () => {
  assert.match(normalize(read(memo)), /IntentStatusReport gates handoff but does not generate downstream artifacts\./);
});

// ---------- 8 ----------
test("doc says WorkOrder and VerificationPlan generation must be separate explicit steps", () => {
  assert.match(normalize(read(memo)), /WorkOrder and VerificationPlan generation must be separate explicit steps\./);
});

// ---------- 9 ----------
test("doc says generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan", () => {
  assert.match(normalize(read(memo)), /Generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan\./);
});

// ---------- 10 ----------
test("doc says handoff generation does not execute commands", () => {
  assert.match(normalize(read(memo)), /Handoff generation does not execute commands\./);
});

// ---------- 11 ----------
test("doc says handoff generation does not write source files", () => {
  assert.match(normalize(read(memo)), /Handoff generation does not write source files\./);
});

// ---------- 12 ----------
test("doc says intent:go remains deferred", () => {
  assert.match(normalize(read(memo)), /intent:go remains deferred\./);
});

// ---------- 13 ----------
test("doc includes option table with the selected option", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(text, /separate gated generators \| selected \| separates work guidance from proof planning/);
});

// ---------- 14 ----------
test("doc includes gate table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Gate \| Required State \|/);
  assert.match(text, /WorkOrder generation \| approved PreparedIntentPlan \+ work-ready status/);
});

// ---------- 15 ----------
test("doc includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /handoff vs intent:go \| artifact generation, not execution/);
});

// ---------- 16 ----------
test("doc includes sequence table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Future Slice \| Role \|/);
  assert.match(text, /Intent WorkOrder Handoff Decision \| decide WorkOrder generator shape/);
});

// ---------- 17 ----------
test("CHANGELOG ships the Intent Work / Proof Handoff Decision entry", () => {
  assert.match(normalize(read("CHANGELOG.md")), /Shipped the Intent Work \/ Proof Handoff Decision/);
});

// ---------- 18 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
  assert.match(read(reviewPacket), /PURPOSE PRESERVATION CHECK/);
});

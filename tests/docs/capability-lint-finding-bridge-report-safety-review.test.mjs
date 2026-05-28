// Docs tests for the CapabilityLintFindingBridgeReport safety
// review (forty-fourth slice on the capability-ontology track).
//
// Confirms the safety-review memo exists, carries every
// required heading + table + pinned statement, that the
// CHANGELOG names the slice, and that the review packet exists
// with a PURPOSE PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

// Collapse markdown emphasis markers, backticks, and runs of
// whitespace so wrapped prose matches.
function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const memo = "docs/strategy/capability-lint-finding-bridge-report-safety-review.md";

// ---------- 1: memo exists ----------

test("safety review doc exists", () => {
  const text = read(memo);
  assert.match(text, /#\s*CapabilityLintFindingBridgeReport Safety Review/);
});

// ---------- 2: all required headings ----------

test("doc contains all required headings", () => {
  const text = read(memo);
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Artifact And CLI Reviewed",
    "## Eligibility Rule Review",
    "## Duplicate Handling Review",
    "## Proposed Finding Id Review",
    "## Governance Mutation Boundary",
    "## WorkOrder / VerificationPlan Boundary",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: preview, not FindingReport ----------

test("doc says CapabilityLintFindingBridgeReport is preview, not FindingReport", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /CapabilityLintFindingBridgeReport is preview,?\s+not\s+FindingReport/i,
  );
});

// ---------- 4: no FindingReport entries in v1 ----------

test("doc says no FindingReport entries are written in v1", () => {
  const text = normalize(read(memo));
  assert.match(text, /No FindingReport entries are written in v1/i);
});

// ---------- 5: no governance mutation ----------

test("doc says it does not mutate FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(text, /does\s+not\s+mutate/i);
  assert.match(text, /FindingFilterReport/);
  assert.match(text, /FindingLifecycleReport/);
  assert.match(text, /IssueAdjudicationReport/);
  assert.match(text, /CoherencyDelta/);
});

// ---------- 6: no WorkOrder / VerificationPlan creation ----------

test("doc says it does not create WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /does\s+not\s+create\s+WorkOrder\s+or\s+VerificationPlan/i,
  );
});

// ---------- 7: only a later explicit writer decision ----------

test("doc says only a later explicit writer decision may allow eligible bridge candidates to become governed findings", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Only a later explicit writer decision may allow eligible bridge candidates to become governed findings/i,
  );
});

// ---------- 8: publication surfacing may be next but must not write findings ----------

test("doc says publication surfacing may be next but must not write findings", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /next slice may surface CapabilityLintFindingBridgeReport in publications,?\s+but must not write findings/i,
  );
});

// ---------- 9: surface table ----------

test("doc includes surface table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Surface\s*\|\s*Status\s*\|\s*Boundary\s*\|/);
});

// ---------- 10: eligibility table ----------

test("doc includes eligibility table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Rule\s*\|\s*V1 Behavior\s*\|/);
});

// ---------- 11: boundary table ----------

test("doc includes boundary table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Boundary\s*\|\s*Decision\s*\|/);
});

// ---------- 12: option table ----------

test("doc includes option table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/);
});

// ---------- 13: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions CapabilityLintFindingBridgeReport safety review", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /CapabilityLintFindingBridgeReport safety review/i);
});

// ---------- 14: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/capability-lint-finding-bridge-report-safety-review.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

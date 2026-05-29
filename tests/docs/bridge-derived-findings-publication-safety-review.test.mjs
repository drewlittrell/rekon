// Docs tests for the bridge-derived findings publication safety
// review (fifty-fifth slice on the capability-ontology track).
//
// Confirms the safety-review memo exists, carries every required
// heading + table + pinned statement, that the CHANGELOG names the
// slice, and that the review packet exists with a PURPOSE
// PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const memo = "docs/strategy/bridge-derived-findings-publication-safety-review.md";

// ---------- 1: memo exists ----------

test("safety review doc exists", () => {
  const text = read(memo);
  assert.match(text, /#\s*Bridge-Derived Findings Publication Safety Review/);
});

// ---------- 2: all required headings ----------

test("doc contains all required headings", () => {
  const text = read(memo);
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Publication Surfaces Reviewed",
    "## Source Identification Review",
    "## Read-Only Guarantee",
    "## Boundary Statement Review",
    "## Agent Contract Do Not Do Review",
    "## Proof Report Deferral",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: read-only visibility ----------

test("doc says bridge-derived findings publication surfacing is read-only visibility", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Bridge-derived findings publication surfacing is read-only visibility/i,
  );
});

// ---------- 4: governed FindingReport entries, not lifecycle status ----------

test("doc says bridge-derived findings are governed FindingReport entries, not FindingLifecycleReport status", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Bridge-derived findings are governed FindingReport entries, not FindingLifecycleReport status/i,
  );
});

// ---------- 5: no governance mutation ----------

test("doc says publication surfacing does not mutate FindingReport / FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Publication surfacing does not mutate FindingReport, FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta/i,
  );
});

// ---------- 6: no WorkOrder / VerificationPlan creation ----------

test("doc says publication surfacing does not create WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Publication surfacing does not create WorkOrder or VerificationPlan/i,
  );
});

// ---------- 7: no resolver routing / verification planning / refactor / source-write ----------

test("doc says surfacing does not imply resolver routing, verification planning, RefactorPreservationContract behavior, or source-write permission", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Publication surfacing does not imply resolver routing, verification planning, RefactorPreservationContract behavior, or source-write permission/i,
  );
});

// ---------- 8: proof report deferred ----------

test("doc says proof report surfacing remains deferred", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Proof report surfacing remains deferred because bridge-derived findings are governance context, not verification proof/i,
  );
});

// ---------- 9: lifecycle / CoherencyDelta decision may begin next ----------

test("doc says lifecycle / CoherencyDelta integration decision work may begin after this safety review", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Lifecycle \/ CoherencyDelta integration decision work may begin after this safety review/i,
  );
});

// ---------- 10: surface table ----------

test("doc includes surface table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Surface\s*\|\s*Status\s*\|\s*Boundary\s*\|/);
});

// ---------- 11: source-identification table ----------

test("doc includes source-identification table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Signal\s*\|\s*Decision\s*\|/);
});

// ---------- 12: boundary table ----------

test("doc includes boundary table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Overclaim Risk\s*\|\s*Guardrail\s*\|/);
});

// ---------- 13: option table ----------

test("doc includes option table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/);
});

// ---------- 14: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions bridge-derived findings publication safety review", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /bridge-derived findings publication safety review/i);
});

// ---------- 15: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/bridge-derived-findings-publication-safety-review.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

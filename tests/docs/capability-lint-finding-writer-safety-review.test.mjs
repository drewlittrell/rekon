// Docs tests for the CapabilityLintFindingBridgeReport ->
// FindingReport writer safety review (fifty-second slice on the
// capability-ontology track).
//
// Confirms the safety-review memo exists, carries every required
// heading + table + pinned statement, that the CHANGELOG names
// the slice, and that the review packet exists with a PURPOSE
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

const memo = "docs/strategy/capability-lint-finding-writer-safety-review.md";

// ---------- 1: memo exists ----------

test("safety review doc exists", () => {
  const text = read(memo);
  assert.match(
    text,
    /#\s*CapabilityLintFindingBridgeReport → FindingReport Writer Safety Review/,
  );
});

// ---------- 2: all required headings ----------

test("doc contains all required headings", () => {
  const text = read(memo);
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Writer Mode Reviewed",
    "## Dry-Run Preservation Review",
    "## Confirmation Gate Review",
    "## FindingReport Write Model Review",
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

// ---------- 3: opt-in + --confirm-finding-write ----------

test("doc says writer mode is opt-in and requires --confirm-finding-write", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /FindingReport writer mode is opt-in and requires --confirm-finding-write/i,
  );
});

// ---------- 4: dry-run preview-only ----------

test("doc says dry-run behavior remains preview-only and writes nothing", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Dry-run behavior remains preview-only and writes nothing/i,
  );
});

// ---------- 5: one new FindingReport ----------

test("doc says writer mode writes exactly one new FindingReport artifact on success", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Writer mode writes exactly one new FindingReport artifact on success/i,
  );
});

// ---------- 6: no in-place mutation ----------

test("doc says writer mode does not mutate existing FindingReport artifacts in place", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Writer mode does not mutate existing FindingReport artifacts in place/i,
  );
});

// ---------- 7: no governance mutation ----------

test("doc says writer mode does not mutate FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Writer mode does not mutate FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta/i,
  );
});

// ---------- 8: no WorkOrder / VerificationPlan ----------

test("doc says writer mode does not create WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(text, /Writer mode does not create WorkOrder or VerificationPlan/i);
});

// ---------- 9: no source writes ----------

test("doc says writer mode writes no source files", () => {
  const text = normalize(read(memo));
  assert.match(text, /Writer mode writes no source files/i);
});

// ---------- 10: lifecycle / CoherencyDelta downstream ----------

test("doc says lifecycle and CoherencyDelta integration remain downstream", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Lifecycle and CoherencyDelta integration remain downstream/i,
  );
});

// ---------- 11: surface table ----------

test("doc includes surface table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Surface\s*\|\s*Status\s*\|\s*Boundary\s*\|/);
});

// ---------- 12: boundary table ----------

test("doc includes boundary table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Boundary\s*\|\s*Decision\s*\|/);
});

// ---------- 13: option table ----------

test("doc includes option table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/);
});

// ---------- 14: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions FindingReport writer safety review", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /FindingReport writer safety review/i);
});

// ---------- 15: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/capability-lint-finding-writer-safety-review.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

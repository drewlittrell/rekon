// Docs tests for the CapabilityLintFindingBridgeReport ->
// FindingReport writer dry-run safety review (forty-ninth slice
// on the capability-ontology track).
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

const memo = "docs/strategy/capability-lint-finding-writer-dry-run-safety-review.md";

// ---------- 1: memo exists ----------

test("safety review doc exists", () => {
  const text = read(memo);
  assert.match(
    text,
    /#\s*CapabilityLintFindingBridgeReport → FindingReport Writer Dry-Run Safety Review/,
  );
});

// ---------- 2: all required headings ----------

test("doc contains all required headings", () => {
  const text = read(memo);
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Helper And CLI Reviewed",
    "## Dry-Run Requirement Review",
    "## Write-Ish Flag Rejection Review",
    "## Proposed FindingReport Body Review",
    "## Governance Mutation Boundary",
    "## Artifact Index Boundary",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: preview-only ----------

test("doc says FindingReport writer dry-run is preview-only", () => {
  const text = normalize(read(memo));
  assert.match(text, /FindingReport writer dry-run is preview-only/i);
});

// ---------- 4: --dry-run required ----------

test("doc says --dry-run is required", () => {
  const text = normalize(read(memo));
  assert.match(text, /--dry-run is required/i);
});

// ---------- 5: write-ish flags rejected ----------

test("doc says write-ish flags are rejected", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /--confirm-finding-write, --write, --send, and --execute are rejected/i,
  );
});

// ---------- 6: no FindingReport write/mutation ----------

test("doc says dry-run writes no FindingReport and mutates no existing FindingReport", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Dry-run writes no FindingReport and mutates no existing FindingReport/i,
  );
});

// ---------- 7: no governance mutation ----------

test("doc says dry-run mutates no FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Dry-run mutates no FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta/i,
  );
});

// ---------- 8: no WorkOrder / VerificationPlan ----------

test("doc says dry-run creates no WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(text, /Dry-run creates no WorkOrder or VerificationPlan/i);
});

// ---------- 9: no artifact index mutation ----------

test("doc says dry-run does not mutate the artifact index", () => {
  const text = normalize(read(memo));
  assert.match(text, /Dry-run does not mutate the artifact index/i);
});

// ---------- 10: write mode deferred ----------

test("doc says write mode remains deferred to a later explicit decision", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Write mode remains deferred to a later explicit decision/i,
  );
});

// ---------- 11: surface table ----------

test("doc includes surface table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Surface\s*\|\s*Status\s*\|\s*Boundary\s*\|/);
});

// ---------- 12: flag table ----------

test("doc includes flag table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Flag\s*\|\s*V1 Behavior\s*\|/);
});

// ---------- 13: boundary table ----------

test("doc includes boundary table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Boundary\s*\|\s*Decision\s*\|/);
});

// ---------- 14: option table ----------

test("doc includes option table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/);
});

// ---------- 15: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions FindingReport writer dry-run safety review", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /FindingReport writer dry-run safety review/i);
});

// ---------- 16: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/capability-lint-finding-writer-dry-run-safety-review.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

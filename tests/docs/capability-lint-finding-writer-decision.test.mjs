// Docs tests for the CapabilityLintFindingBridgeReport ->
// FindingReport writer decision (forty-seventh slice on the
// capability-ontology track).
//
// Confirms the decision memo exists, carries every required
// heading + table + pinned boundary statement, selects the opt-in
// writer posture, that the CHANGELOG names the slice, and that the
// review packet exists with a PURPOSE PRESERVATION CHECK.

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

const memo = "docs/strategy/capability-lint-finding-writer-decision.md";

// ---------- 1: decision memo exists ----------

test("decision memo exists", () => {
  const text = read(memo);
  assert.match(
    text,
    /#\s*CapabilityLintFindingBridgeReport → FindingReport Writer Decision/,
  );
});

// ---------- 2: all required headings ----------

test("doc contains all required headings", () => {
  const text = read(memo);
  const headings = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Boundary",
    "## Options Considered",
    "## Recommendation",
    "## Writer Model",
    "## Eligibility Policy",
    "## Finding Id Policy",
    "## FindingReport Write Model",
    "## Governance Boundary",
    "## Future Sequence",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: selects opt-in writer with dry-run + explicit confirmation ----------

test("doc selects opt-in writer with dry-run + explicit confirmation", () => {
  const text = normalize(read(memo));
  assert.match(text, /opt-in/i);
  assert.match(text, /dry-run/i);
  assert.match(text, /explicit confirmation/i);
  // Option B is the selected option in the option table.
  assert.match(
    text,
    /opt-in writer with dry-run \+ explicit confirmation \| selected/i,
  );
});

// ---------- 4: no FindingReport entries written in this decision slice ----------

test("doc says no FindingReport entries are written in this decision slice", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /No FindingReport entries are written in this decision slice/i,
  );
});

// ---------- 5: future writer must support dry-run preview before write mode ----------

test("doc says a future writer must support dry-run preview before write mode", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /A future writer must support dry-run preview before write mode/i,
  );
});

// ---------- 6: future writer must require explicit confirmation before writing FindingReport ----------

test("doc says a future writer must require explicit confirmation before writing FindingReport", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /A future writer must require explicit confirmation before writing FindingReport/i,
  );
});

// ---------- 7: writer must write a new FindingReport artifact, not mutate in place ----------

test("doc says writer must write a new FindingReport artifact, not mutate an existing FindingReport in place", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /The writer must write a new FindingReport artifact, not mutate an existing FindingReport in place/i,
  );
});

// ---------- 8: filters / lifecycle / adjudication / CoherencyDelta remain downstream ----------

test("doc says FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta remain downstream and are not mutated by the writer", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, and CoherencyDelta remain downstream and are not mutated by the writer/i,
  );
});

// ---------- 9: WorkOrder / VerificationPlan creation remain downstream ----------

test("doc says WorkOrder and VerificationPlan creation remain downstream and are not part of the writer", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /WorkOrder and VerificationPlan creation remain downstream and are not part of the writer/i,
  );
});

// ---------- 10: source writes remain unavailable ----------

test("doc says source writes remain unavailable", () => {
  const text = normalize(read(memo));
  assert.match(text, /Source writes remain unavailable/i);
});

// ---------- 11: option table ----------

test("doc includes option table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/);
});

// ---------- 12: eligibility table ----------

test("doc includes eligibility table", () => {
  const text = read(memo);
  assert.match(
    text,
    /\|\s*Candidate Property\s*\|\s*Writer Decision\s*\|/,
  );
});

// ---------- 13: boundary table ----------

test("doc includes boundary table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Boundary\s*\|\s*Decision\s*\|/);
});

// ---------- 14: future sequence table ----------

test("doc includes future sequence table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Step\s*\|\s*Gate\s*\|/);
});

// ---------- 15: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions CapabilityLintFindingBridgeReport to FindingReport writer decision", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(
    text,
    /CapabilityLintFindingBridgeReport → FindingReport writer decision/i,
  );
});

// ---------- 16: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/capability-lint-finding-writer-decision.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

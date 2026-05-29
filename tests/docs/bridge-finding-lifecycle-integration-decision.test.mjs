// Docs tests for the bridge-derived findings lifecycle /
// CoherencyDelta integration decision (fifty-sixth slice on the
// capability-ontology track).
//
// Confirms the decision memo exists, carries every required heading +
// table + pinned statement, selects the
// BridgeFindingLifecycleIntegrationReport preview artifact first,
// that the CHANGELOG names the slice, and that the review packet
// exists with a PURPOSE PRESERVATION CHECK.

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

const memo = "docs/strategy/bridge-finding-lifecycle-integration-decision.md";

// ---------- 1: decision memo exists ----------

test("decision memo exists", () => {
  const text = read(memo);
  assert.match(
    text,
    /#\s*Bridge-Derived Findings Lifecycle \/ CoherencyDelta Integration Decision/,
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
    "## Preview Artifact Model",
    "## Filtering Boundary",
    "## Lifecycle Boundary",
    "## Adjudication Boundary",
    "## CoherencyDelta Boundary",
    "## WorkOrder / VerificationPlan Boundary",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: selects preview artifact first ----------

test("doc selects BridgeFindingLifecycleIntegrationReport preview artifact first", () => {
  const text = normalize(read(memo));
  assert.match(text, /preview artifact first/i);
  assert.match(text, /BridgeFindingLifecycleIntegrationReport/);
});

// ---------- 4: preview, not FindingLifecycleReport ----------

test("doc says BridgeFindingLifecycleIntegrationReport is preview, not FindingLifecycleReport", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /BridgeFindingLifecycleIntegrationReport is preview, not FindingLifecycleReport/i,
  );
});

// ---------- 5: no governance mutation in this decision slice ----------

test("doc says no FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta mutation occurs in this decision slice", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /No FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta mutation occurs in this decision slice/i,
  );
});

// ---------- 6: CoherencyDelta downstream of lifecycle + adjudication ----------

test("doc says CoherencyDelta integration remains downstream of lifecycle and adjudication", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /CoherencyDelta integration remains downstream of lifecycle and adjudication/i,
  );
});

// ---------- 7: WorkOrder / VerificationPlan downstream of CoherencyDelta ----------

test("doc says WorkOrder and VerificationPlan creation remain downstream of CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /WorkOrder and VerificationPlan creation remain downstream of CoherencyDelta/i,
  );
});

// ---------- 8: source writes unavailable ----------

test("doc says source writes remain unavailable", () => {
  const text = normalize(read(memo));
  assert.match(text, /Source writes remain unavailable/i);
});

// ---------- 9: option table ----------

test("doc includes option table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/);
});

// ---------- 10: sequence table ----------

test("doc includes sequence table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Stage\s*\|\s*Decision\s*\|/);
});

// ---------- 11: boundary table ----------

test("doc includes boundary table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Boundary\s*\|\s*Decision\s*\|/);
});

// ---------- 12: lifecycle table ----------

test("doc includes lifecycle table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Case\s*\|\s*V1 Preview Decision\s*\|/);
});

// ---------- 13: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions bridge-derived findings lifecycle / CoherencyDelta integration decision", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(
    text,
    /bridge-derived findings lifecycle \/ CoherencyDelta integration decision/i,
  );
});

// ---------- 14: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/bridge-finding-lifecycle-integration-decision.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

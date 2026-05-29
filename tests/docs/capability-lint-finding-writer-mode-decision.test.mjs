// Docs tests for the CapabilityLintFindingBridgeReport ->
// FindingReport writer mode decision (fiftieth slice on the
// capability-ontology track).
//
// Confirms the decision memo exists, carries every required
// heading + table + pinned boundary statement, selects the
// opt-in write mode posture, that the CHANGELOG names the slice,
// and that the review packet exists with a PURPOSE PRESERVATION
// CHECK.

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

const memo = "docs/strategy/capability-lint-finding-writer-mode-decision.md";

// ---------- 1: decision memo exists ----------

test("decision memo exists", () => {
  const text = read(memo);
  assert.match(
    text,
    /#\s*CapabilityLintFindingBridgeReport → FindingReport Writer Mode Decision/,
  );
});

// ---------- 2: all required headings ----------

test("doc contains all required headings", () => {
  const text = read(memo);
  const headings = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Dry-Run Boundary",
    "## Options Considered",
    "## Recommendation",
    "## Proposed Write Mode",
    "## Confirmation Policy",
    "## Governance Boundary",
    "## Safety Checks",
    "## Future Sequence",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: selects opt-in writer with --confirm-finding-write ----------

test("doc selects opt-in writer with --confirm-finding-write", () => {
  const text = normalize(read(memo));
  assert.match(text, /opt-in/i);
  assert.match(text, /--confirm-finding-write/);
  assert.match(
    text,
    /opt-in writer with --confirm-finding-write \| selected/i,
  );
});

// ---------- 4: no FindingReport written in this decision slice ----------

test("doc says no FindingReport entries are written in this decision slice", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /No FindingReport entries are written in this decision slice/i,
  );
});

// ---------- 5: future write mode requires --confirm-finding-write ----------

test("doc says future write mode must require --confirm-finding-write", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Future write mode must require --confirm-finding-write/i,
  );
});

// ---------- 6: write-ish aliases remain rejected ----------

test("doc says --write, --send, and --execute remain rejected", () => {
  const text = normalize(read(memo));
  assert.match(text, /--write, --send, and --execute remain rejected/i);
});

// ---------- 7: new FindingReport, not in-place mutation ----------

test("doc says future write mode writes a new FindingReport artifact, not an existing FindingReport in place", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Future write mode writes a new FindingReport artifact, not an existing FindingReport in place/i,
  );
});

// ---------- 8: no governance mutation ----------

test("doc says future write mode does not mutate FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Future write mode does not mutate FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta/i,
  );
});

// ---------- 9: no WorkOrder / VerificationPlan ----------

test("doc says future write mode does not create WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Future write mode does not create WorkOrder or VerificationPlan/i,
  );
});

// ---------- 10: source writes unavailable ----------

test("doc says source writes remain unavailable", () => {
  const text = normalize(read(memo));
  assert.match(text, /Source writes remain unavailable/i);
});

// ---------- 11: option table ----------

test("doc includes option table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/);
});

// ---------- 12: confirmation table ----------

test("doc includes confirmation table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Flag\s*\|\s*Decision\s*\|/);
});

// ---------- 13: boundary table ----------

test("doc includes boundary table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Boundary\s*\|\s*Decision\s*\|/);
});

// ---------- 14: safety-check table ----------

test("doc includes safety-check table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Check\s*\|\s*Timing\s*\|/);
});

// ---------- 15: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions FindingReport writer mode decision", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /FindingReport writer mode decision/i);
});

// ---------- 16: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/capability-lint-finding-writer-mode-decision.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

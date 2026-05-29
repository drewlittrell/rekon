// Docs tests for the bridge-derived findings publication / operator-
// surface decision (fifty-third slice on the capability-ontology
// track).
//
// Confirms the decision memo exists, carries every required heading +
// table + pinned statement, selects the architecture summary + agent
// contract surface first, defers the proof report, that the CHANGELOG
// names the slice, and that the review packet exists with a PURPOSE
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

const memo = "docs/strategy/bridge-derived-findings-publication-decision.md";

// ---------- 1: decision memo exists ----------

test("decision memo exists", () => {
  const text = read(memo);
  assert.match(text, /#\s*Bridge-Derived Findings Publication Decision/);
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
    "## Publication Model",
    "## Source Identification Policy",
    "## Citation Policy",
    "## Governance Boundary",
    "## Future Sequence",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: selects architecture summary + agent contract first ----------

test("doc selects architecture summary + agent contract first", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /architecture summary and the agent operating contract first/i,
  );
});

// ---------- 4: proof report surfacing remains deferred ----------

test("doc says proof report surfacing remains deferred", () => {
  const text = normalize(read(memo));
  assert.match(text, /Proof report surfacing remains deferred/i);
});

// ---------- 5: governed FindingReport entries, not lifecycle status ----------

test("doc says bridge-derived findings are governed FindingReport entries, not lifecycle status", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Bridge-derived findings are governed FindingReport entries, not lifecycle status/i,
  );
});

// ---------- 6: no FindingReport mutation ----------

test("doc says publication surfacing does not mutate FindingReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /Publication surfacing does not mutate FindingReport/i);
});

// ---------- 7: no lifecycle / adjudication / coherency mutation ----------

test("doc says publication surfacing does not mutate FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Publication surfacing does not mutate FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta/i,
  );
});

// ---------- 8: no WorkOrder / VerificationPlan creation ----------

test("doc says publication surfacing does not create WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Publication surfacing does not create WorkOrder or VerificationPlan/i,
  );
});

// ---------- 9: lifecycle / CoherencyDelta downstream ----------

test("doc says lifecycle and CoherencyDelta integration remain downstream", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Lifecycle and CoherencyDelta integration remain downstream/i,
  );
});

// ---------- 10: option table ----------

test("doc includes option table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/);
});

// ---------- 11: surface table ----------

test("doc includes surface table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Surface\s*\|\s*Decision\s*\|/);
});

// ---------- 12: boundary table ----------

test("doc includes boundary table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Boundary\s*\|\s*Decision\s*\|/);
});

// ---------- 13: source-identification table ----------

test("doc includes source-identification table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Signal\s*\|\s*Use\s*\|/);
});

// ---------- 14: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions bridge-derived findings publication decision", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /bridge-derived findings publication decision/i);
});

// ---------- 15: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/bridge-derived-findings-publication-decision.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

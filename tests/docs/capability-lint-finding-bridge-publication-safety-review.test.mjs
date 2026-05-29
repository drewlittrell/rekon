// Docs tests for the CapabilityLintFindingBridgeReport
// publication safety review (forty-sixth slice on the
// capability-ontology track).
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

function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const memo = "docs/strategy/capability-lint-finding-bridge-publication-safety-review.md";

// ---------- 1: memo exists ----------

test("safety review doc exists", () => {
  const text = read(memo);
  assert.match(text, /#\s*CapabilityLintFindingBridgeReport Publication Safety Review/);
});

// ---------- 2: all required headings ----------

test("doc contains all required headings", () => {
  const text = read(memo);
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Publication Surfaces Reviewed",
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

test("doc says CapabilityLintFindingBridgeReport publication surfacing is read-only visibility", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /CapabilityLintFindingBridgeReport publication surfacing is read-only visibility/i,
  );
});

// ---------- 4: preview, not FindingReport ----------

test("doc says CapabilityLintFindingBridgeReport is preview, not FindingReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /CapabilityLintFindingBridgeReport is preview,?\s+not\s+FindingReport/i);
});

// ---------- 5: proposedFinding preview-only ----------

test("doc says proposedFinding is preview-only and writes no FindingReport", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /proposedFinding is preview-only and writes no FindingReport/i,
  );
});

// ---------- 6: surfacing does not imply the full list ----------

test("doc says surfacing does not imply FindingReport / lifecycle / adjudication / CoherencyDelta mutation, WorkOrder / VerificationPlan creation, resolver routing, verification planning, RefactorPreservationContract, or source-write permission", () => {
  const text = normalize(read(memo));
  assert.match(text, /does not imply/i);
  for (const needle of [
    "FindingReport mutation",
    "FindingLifecycleReport mutation",
    "IssueAdjudicationReport mutation",
    "CoherencyDelta mutation",
    "WorkOrder creation",
    "VerificationPlan creation",
    "resolver routing",
    "verification planning",
    "RefactorPreservationContract",
    "source-write permission",
  ]) {
    assert.ok(text.includes(needle), `boundary list missing: ${needle}`);
  }
});

// ---------- 7: read latest + never run bridge-findings ----------

test("doc says publications read the latest CapabilityLintFindingBridgeReport and never run rekon capability lint bridge-findings", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Publications read the latest CapabilityLintFindingBridgeReport; they never run rekon capability lint bridge-findings/i,
  );
});

// ---------- 8: proof report deferral ----------

test("doc says proof report surfacing remains deferred", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Proof report surfacing remains deferred because CapabilityLintFindingBridgeReport is preview\s*\/\s*governance-candidate context, not verification proof/i,
  );
});

// ---------- 9: FindingReport writer decision may begin ----------

test("doc says FindingReport writer decision work may begin after this safety review", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /FindingReport writer decision work may begin after this safety review/i,
  );
});

// ---------- 10: surface table ----------

test("doc includes surface table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Surface\s*\|\s*Status\s*\|\s*Boundary\s*\|/);
});

// ---------- 11: boundary table ----------

test("doc includes boundary table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Overclaim Risk\s*\|\s*Guardrail\s*\|/);
});

// ---------- 12: option table ----------

test("doc includes option table", () => {
  const text = read(memo);
  assert.match(text, /\|\s*Option\s*\|\s*Decision\s*\|\s*Reason\s*\|/);
});

// ---------- 13: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions CapabilityLintFindingBridgeReport publication safety review", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /CapabilityLintFindingBridgeReport publication safety review/i);
});

// ---------- 14: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/capability-lint-finding-bridge-publication-safety-review.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

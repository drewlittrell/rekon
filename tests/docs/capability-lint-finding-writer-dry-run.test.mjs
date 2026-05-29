// Docs tests for the CapabilityLintFindingBridgeReport ->
// FindingReport writer dry-run helper / CLI (forty-eighth slice
// on the capability-ontology track).
//
// Confirms the writer-decision memo documents the shipped
// dry-run helper / CLI with the required boundary statements,
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

const memo = "docs/strategy/capability-lint-finding-writer-decision.md";

// ---------- 1: docs mention the dry-run helper / CLI ----------

test("docs mention the FindingReport writer dry-run helper / CLI", () => {
  const text = normalize(read(memo));
  assert.match(text, /FindingReport writer dry-run helper \/ CLI/i);
  assert.match(text, /rekon capability lint write-findings/);
});

// ---------- 2: dry-run writes no FindingReport ----------

test("docs say the dry-run writes no FindingReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /dry-run writes no FindingReport/i);
});

// ---------- 3: write mode is deferred ----------

test("docs say write mode is deferred", () => {
  const text = normalize(read(memo));
  assert.match(text, /Write mode is deferred/i);
});

// ---------- 4: --dry-run is required ----------

test("docs say --dry-run is required", () => {
  const text = normalize(read(memo));
  assert.match(text, /--dry-run is required/i);
});

// ---------- 5: write-ish flags are rejected ----------

test("docs say --confirm-finding-write / --write / --send / --execute are rejected", () => {
  const text = normalize(read(memo));
  assert.match(text, /rejected/i);
  for (const flag of ["--confirm-finding-write", "--write", "--send", "--execute"]) {
    assert.ok(text.includes(flag), `missing rejected flag: ${flag}`);
  }
});

// ---------- 6: governance artifacts not mutated ----------

test("docs say FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta are not mutated", () => {
  const text = normalize(read(memo));
  assert.match(text, /are not\s+mutated/i);
  for (const needle of [
    "FindingFilterReport",
    "FindingLifecycleReport",
    "IssueAdjudicationReport",
    "CoherencyDelta",
  ]) {
    assert.ok(text.includes(needle), `missing governance artifact: ${needle}`);
  }
});

// ---------- 7: WorkOrder / VerificationPlan not created ----------

test("docs say WorkOrder / VerificationPlan are not created", () => {
  const text = normalize(read(memo));
  assert.match(text, /WorkOrder and VerificationPlan are not created/i);
});

// ---------- 8: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions the FindingReport writer dry-run", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /FindingReport writer dry-run/i);
});

// ---------- 9: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/capability-lint-finding-writer-dry-run.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

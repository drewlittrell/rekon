// Docs tests for the BridgeFindingLifecycleIntegrationReport safety
// review (fifty-eighth slice on the capability-ontology track).

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

const memo = "docs/strategy/bridge-finding-lifecycle-integration-report-safety-review.md";
const reviewPacket =
  ".rekon-dev/review-packets/bridge-finding-lifecycle-integration-report-safety-review.md";

const REQUIRED_HEADINGS = [
  "# BridgeFindingLifecycleIntegrationReport Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Artifact And CLI Reviewed",
  "## Classification Review",
  "## Initial Lifecycle Status Review",
  "## Governance Mutation Boundary",
  "## CoherencyDelta Boundary",
  "## WorkOrder / VerificationPlan Boundary",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

// ---------- 1: memo exists ----------

test("safety review doc exists", () => {
  const text = read(memo);
  assert.match(text, /#\s*BridgeFindingLifecycleIntegrationReport Safety Review/);
});

// ---------- 2: required headings ----------

test("memo contains all required headings", () => {
  const text = normalize(read(memo));
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(text.includes(heading), `missing heading: ${heading}`);
  }
});

// ---------- 3: preview, not FindingLifecycleReport ----------

test("memo says BridgeFindingLifecycleIntegrationReport is preview, not FindingLifecycleReport", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /BridgeFindingLifecycleIntegrationReport is preview, not FindingLifecycleReport\./,
  );
});

// ---------- 4: initialLifecycleStatus modeled only ----------

test("memo says initialLifecycleStatus is modeled status only and does not mutate FindingLifecycleReport", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /initialLifecycleStatus is modeled status only and does not mutate FindingLifecycleReport\./,
  );
});

// ---------- 5: no governance mutation ----------

test("memo says it does not mutate FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /does not mutate FindingFilterReport \/ FindingLifecycleReport \/ IssueAdjudicationReport \/ CoherencyDelta/,
  );
});

// ---------- 6: no WorkOrder / VerificationPlan creation ----------

test("memo says it does not create WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(text, /does not create WorkOrder or VerificationPlan/);
});

// ---------- 7: no source writes ----------

test("memo says it does not write source files", () => {
  const text = normalize(read(memo));
  assert.match(text, /does not write source files/);
});

// ---------- 8: CoherencyDelta downstream of lifecycle + adjudication ----------

test("memo says CoherencyDelta integration remains downstream of lifecycle and adjudication", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /CoherencyDelta integration remains downstream of lifecycle and adjudication/,
  );
});

// ---------- 9: WorkOrder/VerificationPlan downstream of CoherencyDelta ----------

test("memo says WorkOrder and VerificationPlan creation remain downstream of CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /WorkOrder and VerificationPlan creation remain downstream of CoherencyDelta/,
  );
});

// ---------- 10: publication surfacing may be next but must not mutate ----------

test("memo says publication surfacing may be next but must not mutate lifecycle or CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /next slice may surface BridgeFindingLifecycleIntegrationReport in publications, but must not mutate lifecycle or CoherencyDelta/,
  );
});

// ---------- 11: surface table ----------

test("memo includes surface table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Surface \| Status \| Boundary \|/);
  assert.match(text, /publication surfacing \| deferred \| visibility only/);
});

// ---------- 12: classification table ----------

test("memo includes classification table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Case \| V1 Behavior \|/);
  assert.match(text, /duplicate finding id \| duplicate \/ no status/);
});

// ---------- 13: boundary table ----------

test("memo includes boundary table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Boundary \| Decision \|/);
  assert.match(text, /preview vs CoherencyDelta \| no remediation mutation/);
});

// ---------- 14: option table ----------

test("memo includes option table", () => {
  const text = normalize(read(memo));
  assert.match(text, /\| Option \| Decision \| Reason \|/);
  assert.match(
    text,
    /declare v1 safe\/stable preview artifact \| selected/,
  );
});

// ---------- 15: CHANGELOG mention ----------

test("CHANGELOG mentions BridgeFindingLifecycleIntegrationReport safety review", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /BridgeFindingLifecycleIntegrationReport safety review/i);
});

// ---------- 16: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(reviewPacket);
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

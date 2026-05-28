// Docs tests for the CapabilityArchitectureLintReport
// Safety Review (thirty-ninth slice on the
// capability-ontology track).
//
// Verifies that the safety-review memo exists, contains
// all required headings + tables, pins the boundary
// statements verbatim, and that CHANGELOG + review packet
// are updated alongside.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(
  repoRoot,
  "docs/strategy/capability-architecture-lint-report-safety-review.md",
);
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");
const REVIEW_PACKET = resolve(
  repoRoot,
  ".rekon-dev/review-packets/capability-architecture-lint-report-safety-review.md",
);

async function read(path) {
  return readFile(path, "utf8");
}

function collapse(text) {
  return text.replace(/\s+/g, " ");
}

// ---------- 1 ----------

test("safety review doc exists", async () => {
  const text = await read(MEMO);
  assert.ok(text.length > 0);
  assert.match(text, /# CapabilityArchitectureLintReport Safety Review/);
});

// ---------- 2 ----------

test("doc contains all required headings", async () => {
  const text = await read(MEMO);
  const headings = [
    "## Decision Summary",
    "## Why This Review Exists",
    "## Artifact And CLI Reviewed",
    "## Rule Evaluation Review",
    "## Preview Finding Boundary",
    "## Governance Mutation Boundary",
    "## Resolver / Verification Boundary",
    "## Options Considered",
    "## Recommendation",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of headings) {
    assert.ok(text.includes(heading), `expected heading: ${heading}`);
  }
});

// ---------- 3 ----------

test("doc says CapabilityArchitectureLintReport is evaluation, not enforcement", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /CapabilityArchitectureLintReport`? is evaluation, not\s+enforcement/i,
  );
});

// ---------- 4 ----------

test("doc says findingCandidate is preview-only and does not write FindingReport", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /findingCandidate`? is preview-only and does not write\s+`?FindingReport/i,
  );
});

// ---------- 5 ----------

test("doc says it does not mutate FindingFilterReport, FindingLifecycleReport, or CoherencyDelta", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /does\s+(?:\*\*)?not(?:\*\*)? mutate `?FindingFilterReport`?,\s*`?FindingLifecycleReport`?, or `?CoherencyDelta/i,
  );
});

// ---------- 6 ----------

test("doc says it does not implement resolver routing, verification planning, RefactorPreservationContract, or source writes", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /does\s+(?:\*\*)?not(?:\*\*)? implement\s+resolver routing, verification planning,\s*`?RefactorPreservationContract`?, or source\s+writes/i,
  );
});

// ---------- 7 ----------

test("doc says publication surfacing may be next but must not bridge to findings yet", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /may surface\s+`?CapabilityArchitectureLintReport`? in\s+publications, but\s+must not bridge to findings yet/i,
  );
});

// ---------- 8 ----------

test("doc includes surface table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Surface | Status | Boundary |"));
  assert.ok(text.includes("CapabilityArchitectureLintReport artifact"));
});

// ---------- 9 ----------

test("doc includes rule table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Rule | V1 Behavior |"));
  assert.ok(/allowed-system \| not-evaluated unless deterministic system exists/.test(text));
});

// ---------- 10 ----------

test("doc includes boundary table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Boundary | Decision |"));
  assert.ok(text.includes("lint report vs FindingReport"));
});

// ---------- 11 ----------

test("doc includes option table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("declare v1 safe/stable evaluation artifact"));
});

// ---------- 12 ----------

test("CHANGELOG mentions CapabilityArchitectureLintReport safety review", async () => {
  const text = collapse(await read(CHANGELOG));
  assert.match(text, /CapabilityArchitectureLintReport safety review/i);
});

// ---------- 13 ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(REVIEW_PACKET);
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
  assert.match(text, /CapabilityArchitectureLintReport/);
});

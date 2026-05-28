// Docs tests for the CapabilityArchitectureLintReport
// Publication Safety Review (forty-first slice on the
// capability-ontology track).
//
// Verifies the safety-review memo exists, contains all
// required headings + tables, pins the boundary
// statements verbatim, documents the proof-report
// deferral + finding-bridge-next recommendation, and that
// CHANGELOG + review packet are updated alongside.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(
  repoRoot,
  "docs/strategy/capability-architecture-lint-publication-safety-review.md",
);
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");
const REVIEW_PACKET = resolve(
  repoRoot,
  ".rekon-dev/review-packets/capability-architecture-lint-publication-safety-review.md",
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
  assert.match(
    text,
    /# CapabilityArchitectureLintReport Publication Safety Review/,
  );
});

// ---------- 2 ----------

test("doc contains all required headings", async () => {
  const text = await read(MEMO);
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
    assert.ok(text.includes(heading), `expected heading: ${heading}`);
  }
});

// ---------- 3 ----------

test("doc says publication surfacing is read-only visibility", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /CapabilityArchitectureLintReport`? publication surfacing is read-only visibility/i,
  );
});

// ---------- 4 ----------

test("doc says CapabilityArchitectureLintReport is evaluation, not enforcement", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /CapabilityArchitectureLintReport`? is evaluation, not\s+enforcement/i,
  );
});

// ---------- 5 ----------

test("doc says findingCandidate is preview-only and writes no FindingReport", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /findingCandidate`? is preview-only and writes no\s+`?FindingReport/i,
  );
});

// ---------- 6 ----------

test("doc says surfacing does not imply FindingReport / lifecycle / CoherencyDelta mutation, routing, planning, preservation, or source writes", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /does not imply\s+`?FindingReport`? mutation,\s*`?FindingLifecycleReport`?\s+mutation,\s*`?CoherencyDelta`?\s+mutation, resolver routing, verification planning,\s*`?RefactorPreservationContract`? behavior, or source-write\s+permission/i,
  );
});

// ---------- 7 ----------

test("doc says publications read latest report and never run lint generation", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /read the latest\s+`?CapabilityArchitectureLintReport`?;? they never run\s+`?rekon capability lint architecture/i,
  );
});

// ---------- 8 ----------

test("doc says proof report surfacing remains deferred", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /[Pp]roof report surfacing remains deferred/,
  );
});

// ---------- 9 ----------

test("doc says finding-bridge decision work may begin after this safety review", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /[Ff]inding-bridge decision work may begin after this\s+safety review/,
  );
});

// ---------- 10 ----------

test("doc includes surface table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Surface | Status | Boundary |"));
  assert.ok(text.includes("architecture summary"));
  assert.ok(text.includes("proof report"));
});

// ---------- 11 ----------

test("doc includes boundary table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Overclaim Risk | Guardrail |"));
  assert.ok(/treated as FindingReport mutation/.test(text));
});

// ---------- 12 ----------

test("doc includes option table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("declare surfacing safe/stable"));
});

// ---------- 13 ----------

test("CHANGELOG mentions CapabilityArchitectureLintReport publication safety review", async () => {
  const text = collapse(await read(CHANGELOG));
  assert.match(text, /CapabilityArchitectureLintReport publication safety review/i);
});

// ---------- 14 ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(REVIEW_PACKET);
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
  assert.match(text, /CapabilityArchitectureLintReport/);
});

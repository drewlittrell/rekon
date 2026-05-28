// Docs tests for the CapabilityArchitectureLintReport →
// FindingReport Bridge Decision (forty-second slice on
// the capability-ontology track).
//
// Verifies the decision memo exists, contains all
// required headings + tables, selects Option B (bridge
// report first), rejects the direct FindingReport writer
// for v1, pins the governance boundary statements, and
// that CHANGELOG + review packet are updated alongside.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(
  repoRoot,
  "docs/strategy/capability-lint-finding-bridge-decision.md",
);
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");
const REVIEW_PACKET = resolve(
  repoRoot,
  ".rekon-dev/review-packets/capability-lint-finding-bridge-decision.md",
);

async function read(path) {
  return readFile(path, "utf8");
}

function collapse(text) {
  return text.replace(/\s+/g, " ");
}

// ---------- 1 ----------

test("decision memo exists", async () => {
  const text = await read(MEMO);
  assert.ok(text.length > 0);
  assert.match(
    text,
    /# CapabilityArchitectureLintReport → FindingReport Bridge Decision/,
  );
});

// ---------- 2 ----------

test("doc contains all required headings", async () => {
  const text = await read(MEMO);
  const headings = [
    "## Decision Summary",
    "## Why This Decision Exists",
    "## Current Boundary",
    "## Options Considered",
    "## Recommendation",
    "## Bridge Artifact Model",
    "## Eligibility Policy",
    "## Finding Id Policy",
    "## Governance Boundary",
    "## Future Sequence",
    "## What This Does Not Do",
    "## Implementation Sequence",
  ];
  for (const heading of headings) {
    assert.ok(text.includes(heading), `expected heading: ${heading}`);
  }
});

// ---------- 3 ----------

test("doc selects bridge report first (Option B)", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /Select Option B: introduce an intermediate\s+`?CapabilityLintFindingBridgeReport`? first/i,
  );
});

// ---------- 4 ----------

test("doc rejects direct FindingReport writer for v1", async () => {
  const text = await read(MEMO);
  assert.match(
    text,
    /\|\s*direct FindingReport writer\s*\|\s*rejected\s*\|/i,
  );
});

// ---------- 5 ----------

test("doc says CapabilityLintFindingBridgeReport is preview, not FindingReport", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /`?CapabilityLintFindingBridgeReport`? is preview,?\s+(?:not|rather than).{0,20}`?FindingReport/i,
  );
});

// ---------- 6 ----------

test("doc says no FindingReport entries are written in v1", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /does not write\s+`?FindingReport`? in v1|No `?FindingReport`? entries are written in v1/i,
  );
});

// ---------- 7 ----------

test("doc says no FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta mutation occurs in v1", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /does not mutate\s+`?FindingFilterReport`?,\s*`?FindingLifecycleReport`?,\s*`?IssueAdjudicationReport`?, or `?CoherencyDelta/i,
  );
});

// ---------- 8 ----------

test("doc says only a later explicit writer decision may allow bridge candidates to become governed findings", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /[Oo]nly a later explicit writer decision may allow bridge\s+candidates to become\s+(?:`?FindingReport`? entries|governed findings)/i,
  );
});

// ---------- 9 ----------

test("doc says finding lifecycle and CoherencyDelta remain downstream of governed findings", async () => {
  const text = collapse(await read(MEMO));
  assert.match(
    text,
    /lifecycle.{0,80}downstream|downstream lifecycle stages|remain downstream of governed findings/i,
  );
});

// ---------- 10 ----------

test("doc includes option table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Option | Decision | Reason |"));
  assert.ok(text.includes("bridge report first"));
});

// ---------- 11 ----------

test("doc includes eligibility table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Row Property | V1 Decision |"));
  assert.ok(/status violation \| required/.test(text));
});

// ---------- 12 ----------

test("doc includes governance boundary table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Boundary | Decision |"));
  assert.ok(text.includes("bridge report vs FindingReport"));
});

// ---------- 13 ----------

test("doc includes future sequence table", async () => {
  const text = await read(MEMO);
  assert.ok(text.includes("| Step | Gate |"));
  assert.ok(/CapabilityLintFindingBridgeReport v1 \| preview artifact only/.test(text));
});

// ---------- 14 ----------

test("CHANGELOG mentions CapabilityArchitectureLintReport to FindingReport bridge decision", async () => {
  const text = collapse(await read(CHANGELOG));
  assert.match(
    text,
    /CapabilityArchitectureLintReport → FindingReport bridge decision/i,
  );
});

// ---------- 15 ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(REVIEW_PACKET);
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
  assert.match(text, /CapabilityLintFindingBridgeReport/);
});

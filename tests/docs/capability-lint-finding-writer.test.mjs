// Docs tests for the CapabilityLintFindingBridgeReport ->
// FindingReport writer implementation (fifty-first slice on the
// capability-ontology track).
//
// Confirms the writer-mode-decision memo documents the shipped
// writer implementation with the required boundary statements,
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

const memo = "docs/strategy/capability-lint-finding-writer-mode-decision.md";

// ---------- 1: mentions writer implementation ----------

test("docs mention the FindingReport writer implementation", () => {
  const text = normalize(read(memo));
  assert.match(text, /FindingReport writer implementation/i);
  assert.match(text, /rekon capability lint write-findings/);
});

// ---------- 2: write mode requires --confirm-finding-write ----------

test("docs say write mode requires --confirm-finding-write", () => {
  const text = normalize(read(memo));
  assert.match(text, /Write mode requires --confirm-finding-write/i);
});

// ---------- 3: mutually exclusive ----------

test("docs say --dry-run and --confirm-finding-write are mutually exclusive", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /--dry-run and --confirm-finding-write are mutually exclusive/i,
  );
});

// ---------- 4: write-ish aliases rejected ----------

test("docs say --write / --send / --execute are rejected", () => {
  const text = normalize(read(memo));
  assert.match(text, /rejected/i);
  for (const flag of ["--write", "--send", "--execute"]) {
    assert.ok(text.includes(flag), `missing rejected flag: ${flag}`);
  }
});

// ---------- 5: writes a new FindingReport artifact ----------

test("docs say write mode writes a new FindingReport artifact", () => {
  const text = normalize(read(memo));
  assert.match(text, /Write mode writes a new FindingReport artifact/i);
});

// ---------- 6: existing FindingReport not mutated in place ----------

test("docs say existing FindingReport is not mutated in place", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /existing FindingReport is not mutated in place/i,
  );
});

// ---------- 7: governance artifacts not mutated ----------

test("docs say FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta are not mutated", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, and CoherencyDelta are not\s+mutated/i,
  );
});

// ---------- 8: WorkOrder / VerificationPlan not created ----------

test("docs say WorkOrder and VerificationPlan are not created", () => {
  const text = normalize(read(memo));
  assert.match(text, /WorkOrder and VerificationPlan are not created/i);
});

// ---------- 9: source writes unavailable ----------

test("docs say source writes remain unavailable", () => {
  const text = normalize(read(memo));
  assert.match(text, /Source writes remain unavailable/i);
});

// ---------- 10: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions the FindingReport writer implementation", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /FindingReport writer implementation/i);
});

// ---------- 11: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/capability-lint-finding-writer.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

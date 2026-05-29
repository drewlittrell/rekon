// Docs tests for the bridge-derived findings publication surfacing
// slice (fifty-fourth slice on the capability-ontology track).
//
// Confirms the docs record that the architecture summary + agent
// contract surface bridge-derived findings, that proof-report
// surfacing is deferred, the read-only guarantees, and the governance
// boundary; that the CHANGELOG names the slice; and that the review
// packet exists with a PURPOSE PRESERVATION CHECK.

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

// ---------- 1: architecture summary surfacing ----------

test("docs mention architecture summary surfacing", () => {
  const text = normalize(read(memo));
  assert.match(text, /architecture summary surfaces bridge-derived findings/i);
});

// ---------- 2: agent contract surfacing ----------

test("docs mention agent contract surfacing", () => {
  const text = normalize(read(memo));
  assert.match(text, /agent operating contract surfaces bridge-derived findings/i);
});

// ---------- 3: proof report deferred ----------

test("docs say proof report surfacing is deferred", () => {
  const text = normalize(read(memo));
  assert.match(text, /Proof report surfacing remains deferred/i);
});

// ---------- 4: publications read latest FindingReport ----------

test("docs say publications read latest FindingReport", () => {
  const text = normalize(read(memo));
  assert.match(text, /Publications read the latest FindingReport/i);
});

// ---------- 5: publications do not run bridge writer ----------

test("docs say publications do not run the bridge writer", () => {
  const text = normalize(read(memo));
  assert.match(text, /Publications do not run the bridge writer/i);
});

// ---------- 6: publications do not mutate governance artifacts ----------

test("docs say publications do not mutate FindingReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Publications do not mutate FindingReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta/i,
  );
});

// ---------- 7: publications do not create WorkOrder / VerificationPlan ----------

test("docs say publications do not create WorkOrder or VerificationPlan", () => {
  const text = normalize(read(memo));
  assert.match(text, /Publications do not create WorkOrder or VerificationPlan/i);
});

// ---------- 8: governed FindingReport entries, not lifecycle status ----------

test("docs say bridge-derived findings are governed FindingReport entries, not lifecycle status", () => {
  const text = normalize(read(memo));
  assert.match(
    text,
    /Bridge-derived findings are governed FindingReport entries, not lifecycle status/i,
  );
});

// ---------- 9: lifecycle / CoherencyDelta downstream ----------

test("docs say lifecycle and CoherencyDelta integration remain downstream", () => {
  const text = normalize(read(memo));
  assert.match(text, /Lifecycle and CoherencyDelta integration remain downstream/i);
});

// ---------- 10: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions bridge-derived findings publication surfacing", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /bridge-derived findings publication surfacing/i);
});

// ---------- 11: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/bridge-derived-findings-publications.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

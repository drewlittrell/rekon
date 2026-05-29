// Docs tests for the CapabilityLintFindingBridgeReport
// publication surfacing slice (forty-fifth slice on the
// capability-ontology track).
//
// Confirms the bridge artifact + concept docs document the
// architecture-summary / agent-contract surfacing, the
// read-only boundary, the proof-report deferral, and that the
// CHANGELOG + review packet exist.

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

// Combined surfacing-doc corpus: the bridge artifact + concept
// docs both carry the publication-surfacing section.
function surfacingCorpus() {
  return normalize(
    read("docs/artifacts/capability-lint-finding-bridge-report.md")
    + "\n"
    + read("docs/concepts/capability-lint-finding-bridge.md"),
  );
}

// ---------- 1: architecture summary surfacing ----------

test("docs mention architecture summary surfacing", () => {
  assert.match(surfacingCorpus(), /architecture summary/i);
});

// ---------- 2: agent contract surfacing ----------

test("docs mention agent contract surfacing", () => {
  assert.match(surfacingCorpus(), /agent contract/i);
});

// ---------- 3: proof report surfacing deferred ----------

test("docs say proof report surfacing is deferred", () => {
  const text = surfacingCorpus();
  assert.match(
    text,
    /proof[- ]?report[^.]*defer|defer[^.]*proof[- ]?report/i,
  );
});

// ---------- 4: publications read latest bridge report ----------

test("docs say publications read latest CapabilityLintFindingBridgeReport", () => {
  assert.match(
    surfacingCorpus(),
    /read[^.]*latest[^.]*CapabilityLintFindingBridgeReport|publications read the latest/i,
  );
});

// ---------- 5: publications do not run bridge generation ----------

test("docs say publications do not run bridge generation", () => {
  assert.match(
    surfacingCorpus(),
    /never run[^.]*bridge|do not run[^.]*bridge|never run `?rekon capability lint bridge-findings/i,
  );
});

// ---------- 6: publications do not mutate FindingReport / FindingLifecycleReport / CoherencyDelta ----------

test("docs say publications do not mutate FindingReport / FindingLifecycleReport / CoherencyDelta", () => {
  const text = surfacingCorpus();
  assert.match(text, /does not write FindingReport|do not write FindingReport|never write FindingReport|not write FindingReport/i);
  assert.match(text, /FindingLifecycleReport/);
  assert.match(text, /CoherencyDelta/);
});

// ---------- 7: publications do not create WorkOrder or VerificationPlan ----------

test("docs say publications do not create WorkOrder or VerificationPlan", () => {
  const text = surfacingCorpus();
  assert.match(text, /WorkOrder/);
  assert.match(text, /VerificationPlan/);
  assert.match(text, /create/i);
});

// ---------- 8: proposedFinding preview-only ----------

test("docs say proposedFinding is preview-only", () => {
  assert.match(surfacingCorpus(), /proposedFinding is preview-only/i);
});

// ---------- 9: surfacing does not imply source writes ----------

test("docs say surfacing does not imply source writes", () => {
  assert.match(surfacingCorpus(), /(write source files|source[- ]write)/i);
});

// ---------- 10: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions CapabilityLintFindingBridgeReport publication surfacing", () => {
  assert.match(
    normalize(read("CHANGELOG.md")),
    /CapabilityLintFindingBridgeReport publication surfacing/i,
  );
});

// ---------- 11: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(".rekon-dev/review-packets/capability-lint-finding-bridge-publications.md");
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

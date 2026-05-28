// Docs tests for the CapabilityLintFindingBridgeReport v1
// artifact (forty-third slice on the capability-ontology
// track).
//
// Confirms the artifact + concept docs exist and pin the
// preview / governance boundary, that the CHANGELOG names the
// slice, and that the review packet exists with a PURPOSE
// PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

// Collapse markdown emphasis markers, backticks, and runs of
// whitespace (including line wraps) so wrapped prose matches.
function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const artifactDoc = "docs/artifacts/capability-lint-finding-bridge-report.md";
const conceptDoc = "docs/concepts/capability-lint-finding-bridge.md";

// ---------- 1: artifact doc exists ----------

test("artifact doc exists", () => {
  const text = read(artifactDoc);
  assert.match(text, /#\s*CapabilityLintFindingBridgeReport/);
});

// ---------- 2: concept doc exists ----------

test("concept doc exists", () => {
  const text = read(conceptDoc);
  assert.match(text, /#\s*Capability Lint Finding Bridge/);
});

// ---------- 3: preview, not FindingReport ----------

test("docs say CapabilityLintFindingBridgeReport is preview, not FindingReport", () => {
  for (const rel of [artifactDoc, conceptDoc]) {
    const text = normalize(read(rel));
    assert.match(
      text,
      /CapabilityLintFindingBridgeReport is preview,?\s+not\s+FindingReport/i,
      `${rel} must state the report is preview, not FindingReport`,
    );
  }
});

// ---------- 4: bridge does not write FindingReport ----------

test("docs say the bridge does not write FindingReport", () => {
  for (const rel of [artifactDoc, conceptDoc]) {
    const text = normalize(read(rel));
    assert.match(
      text,
      /does\s+not\s+write\s+FindingReport/i,
      `${rel} must state the bridge does not write FindingReport`,
    );
  }
});

// ---------- 5: bridge does not mutate governance artifacts ----------

test("docs say the bridge does not mutate FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta", () => {
  for (const rel of [artifactDoc, conceptDoc]) {
    const text = normalize(read(rel));
    assert.match(text, /does\s+not\s+mutate/i, `${rel} must state non-mutation`);
    assert.match(text, /FindingFilterReport/, `${rel} must name FindingFilterReport`);
    assert.match(text, /FindingLifecycleReport/, `${rel} must name FindingLifecycleReport`);
    assert.match(text, /IssueAdjudicationReport/, `${rel} must name IssueAdjudicationReport`);
    assert.match(text, /CoherencyDelta/, `${rel} must name CoherencyDelta`);
  }
});

// ---------- 6: only a later explicit writer decision may promote ----------

test("docs say only a later explicit writer decision may allow eligible bridge candidates to become governed findings", () => {
  for (const rel of [artifactDoc, conceptDoc]) {
    const text = normalize(read(rel));
    assert.match(
      text,
      /Only a later explicit writer decision may allow eligible bridge candidates to become governed findings/i,
      `${rel} must pin the explicit-writer-decision gate`,
    );
  }
});

// ---------- 7: WorkOrder / VerificationPlan creation not included ----------

test("docs say WorkOrder / VerificationPlan creation is not included", () => {
  for (const rel of [artifactDoc, conceptDoc]) {
    const text = normalize(read(rel));
    assert.match(
      text,
      /WorkOrder\s*\/\s*VerificationPlan creation is not included/i,
      `${rel} must state WorkOrder / VerificationPlan creation is not included`,
    );
  }
});

// ---------- 8: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions CapabilityLintFindingBridgeReport v1", () => {
  const text = read("CHANGELOG.md");
  assert.match(text, /CapabilityLintFindingBridgeReport v1/);
});

// ---------- 9: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(".rekon-dev/review-packets/capability-lint-finding-bridge-report-v1.md");
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

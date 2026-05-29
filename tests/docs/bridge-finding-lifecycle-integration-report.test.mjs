// Docs tests for BridgeFindingLifecycleIntegrationReport v1
// (fifty-seventh slice on the capability-ontology track).

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

const artifactDoc = "docs/artifacts/bridge-finding-lifecycle-integration-report.md";
const conceptDoc = "docs/concepts/bridge-finding-lifecycle-integration.md";

// ---------- 1: artifact doc exists ----------

test("artifact doc exists", () => {
  const text = read(artifactDoc);
  assert.match(text, /#\s*BridgeFindingLifecycleIntegrationReport/);
});

// ---------- 2: concept doc exists ----------

test("concept doc exists", () => {
  const text = read(conceptDoc);
  assert.match(text, /bridge[- ]finding lifecycle integration/i);
});

// ---------- 3: preview, not FindingLifecycleReport ----------

test("docs say BridgeFindingLifecycleIntegrationReport is preview, not FindingLifecycleReport", () => {
  const text = normalize(read(artifactDoc));
  assert.match(
    text,
    /BridgeFindingLifecycleIntegrationReport is preview, not FindingLifecycleReport/i,
  );
});

// ---------- 4: identifies from FindingReport trace fields ----------

test("docs say V1 identifies bridge-derived findings from FindingReport trace fields", () => {
  const text = normalize(read(artifactDoc));
  assert.match(
    text,
    /identifies bridge-derived findings from .*FindingReport.* trace fields/i,
  );
});

// ---------- 5: ready rows -> proposed initial status new ----------

test("docs say ready-for-lifecycle rows receive proposed initial status new", () => {
  const text = normalize(read(artifactDoc));
  assert.match(
    text,
    /ready-for-lifecycle rows receive (a )?proposed initial status new/i,
  );
});

// ---------- 6: duplicates / missing not promoted ----------

test("docs say duplicates / missing evidence / missing trace are not automatically promoted", () => {
  const text = normalize(read(artifactDoc));
  assert.match(
    text,
    /duplicates \/ missing evidence \/ missing trace are not automatically promoted/i,
  );
});

// ---------- 7: no governance mutation ----------

test("docs say no FindingFilterReport / FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta mutation", () => {
  const text = normalize(read(artifactDoc));
  assert.match(
    text,
    /no FindingFilterReport \/ FindingLifecycleReport \/ IssueAdjudicationReport \/ CoherencyDelta mutation/i,
  );
});

// ---------- 8: no WorkOrder / VerificationPlan creation ----------

test("docs say no WorkOrder / VerificationPlan creation", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /no WorkOrder \/ VerificationPlan creation/i);
});

// ---------- 9: source writes unavailable ----------

test("docs say source writes remain unavailable", () => {
  const text = normalize(read(artifactDoc));
  assert.match(text, /source writes remain unavailable/i);
});

// ---------- 10: CHANGELOG mentions the slice ----------

test("CHANGELOG mentions BridgeFindingLifecycleIntegrationReport v1", () => {
  const text = normalize(read("CHANGELOG.md"));
  assert.match(text, /BridgeFindingLifecycleIntegrationReport v1/i);
});

// ---------- 11: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  const text = read(
    ".rekon-dev/review-packets/bridge-finding-lifecycle-integration-report-v1.md",
  );
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
});

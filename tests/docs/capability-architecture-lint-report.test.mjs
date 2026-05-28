// Docs tests for CapabilityArchitectureLintReport v1
// (thirty-eighth slice on the capability-ontology
// track).
//
// Verifies that the new artifact doc + concept doc
// exist, pin the boundary statements verbatim, and that
// CHANGELOG / review packet are updated alongside.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const ARTIFACT_DOC = resolve(
  repoRoot,
  "docs/artifacts/capability-architecture-lint-report.md",
);
const CONCEPT_DOC = resolve(
  repoRoot,
  "docs/concepts/capability-aware-architecture-linting.md",
);
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");
const REVIEW_PACKET = resolve(
  repoRoot,
  ".rekon-dev/review-packets/capability-architecture-lint-report-v1.md",
);

async function read(path) {
  return readFile(path, "utf8");
}

function collapse(text) {
  return text.replace(/\s+/g, " ");
}

// ---------- 1 ----------

test("artifact doc exists", async () => {
  const text = await read(ARTIFACT_DOC);
  assert.ok(text.length > 0);
  assert.match(text, /# CapabilityArchitectureLintReport/);
});

// ---------- 2 ----------

test("concept doc exists", async () => {
  const text = await read(CONCEPT_DOC);
  assert.ok(text.length > 0);
  assert.match(text, /# Capability-Aware Architecture Linting/);
});

// ---------- 3 ----------

test("docs say CapabilityArchitectureLintReport is evaluation, not FindingReport", async () => {
  const artifact = collapse(await read(ARTIFACT_DOC));
  const concept = collapse(await read(CONCEPT_DOC));
  assert.ok(
    /evaluation, not enforcement/i.test(artifact)
    || /evaluation, not enforcement/i.test(concept),
  );
  // After whitespace collapse, blockquote prefixes (`>`)
  // remain. The artifact doc says (collapsed):
  //   "`CapabilityArchitectureLintReport` is **not** >
  //    `FindingReport` in v1"
  // The concept doc says (collapsed):
  //   "It is an evaluation layer... is **not**
  //    `FindingReport` in v1"
  const combined = `${artifact}\n${concept}`;
  assert.ok(
    /not.{0,20}`FindingReport`.{0,20}in v1/i.test(combined)
    || /not\s+a\s+`FindingReport`/i.test(combined)
    || /not\s+`FindingReport`/i.test(combined),
    "expected docs to say the lint report is not FindingReport in v1",
  );
});

// ---------- 4 ----------

test("docs say V1 evaluates configured CapabilityContract rows only", async () => {
  const artifact = collapse(await read(ARTIFACT_DOC));
  const concept = collapse(await read(CONCEPT_DOC));
  assert.ok(
    /configured.*CapabilityContract.*rows/i.test(artifact)
    || /configured.*CapabilityContract.*rows/i.test(concept)
    || /V1 evaluates \*\*configured\*\*/i.test(concept),
    "expected docs to state V1 evaluates configured rows only",
  );
});

// ---------- 5 ----------

test("docs say V1 evaluates allowed/forbidden layer and system rules only", async () => {
  const artifact = collapse(await read(ARTIFACT_DOC));
  const concept = collapse(await read(CONCEPT_DOC));
  for (const rule of ["allowed-layer", "forbidden-layer", "allowed-system", "forbidden-system"]) {
    assert.ok(
      artifact.includes(rule) || concept.includes(rule),
      `expected docs to mention ${rule}`,
    );
  }
});

// ---------- 6 ----------

test("docs say neighbor and preservation rules are deferred", async () => {
  const artifact = collapse(await read(ARTIFACT_DOC));
  const concept = collapse(await read(CONCEPT_DOC));
  assert.ok(
    /Neighbor and preservation rules are deferred/i.test(artifact)
    || /Neighbor and preservation rules are deferred/i.test(concept)
    || /requiredNeighbors.*deferred|preservationRules.*deferred/i.test(concept),
  );
});

// ---------- 7 ----------

test("docs say FindingReport / FindingLifecycleReport / CoherencyDelta are not mutated", async () => {
  const artifact = collapse(await read(ARTIFACT_DOC));
  const concept = collapse(await read(CONCEPT_DOC));
  for (const symbol of [
    "FindingReport",
    "FindingLifecycleReport",
    "CoherencyDelta",
  ]) {
    assert.ok(
      artifact.includes(symbol) && concept.includes(symbol),
      `expected both docs to mention ${symbol}`,
    );
  }
  assert.ok(
    /does\s+\*?\*?not\*?\*?\s+(mutate|write)\s+`?FindingReport|does\s+\*?\*?not\*?\*?\s+mutate.*FindingLifecycleReport|does\s+\*?\*?not\*?\*?\s+mutate.*CoherencyDelta/i.test(
      artifact,
    )
      || /does\s+\*?\*?not\*?\*?\s+(mutate|write).*FindingReport/i.test(concept),
  );
});

// ---------- 8 ----------

test("docs say resolver routing does not ship", async () => {
  const artifact = collapse(await read(ARTIFACT_DOC));
  const concept = collapse(await read(CONCEPT_DOC));
  assert.ok(
    /Resolver routing does not ship/i.test(artifact)
    || /does \*\*not\*\* add resolver routing/i.test(artifact)
    || /does\s+\*?\*?not\*?\*?\s+add resolver routing/i.test(concept),
  );
});

// ---------- 9 ----------

test("docs say verification planning does not ship", async () => {
  const artifact = collapse(await read(ARTIFACT_DOC));
  const concept = collapse(await read(CONCEPT_DOC));
  assert.ok(
    /Verification planning does not ship/i.test(artifact)
    || /does \*\*not\*\* add verification planning/i.test(artifact)
    || /does\s+\*?\*?not\*?\*?\s+add verification planning/i.test(concept),
  );
});

// ---------- 10 ----------

test("docs say source writes do not ship", async () => {
  const artifact = collapse(await read(ARTIFACT_DOC));
  const concept = collapse(await read(CONCEPT_DOC));
  assert.ok(
    /Source writes do not ship/i.test(artifact)
    || /does \*\*not\*\* add source writes/i.test(artifact)
    || /does\s+\*?\*?not\*?\*?\s+add source writes/i.test(concept),
  );
});

// ---------- 11 ----------

test("CHANGELOG mentions CapabilityArchitectureLintReport v1", async () => {
  const text = collapse(await read(CHANGELOG));
  assert.match(text, /CapabilityArchitectureLintReport/);
  assert.match(text, /v1|thirty-eighth|capability-aware architecture linting/i);
});

// ---------- 12 ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(REVIEW_PACKET);
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
  assert.match(text, /CapabilityArchitectureLintReport/);
});

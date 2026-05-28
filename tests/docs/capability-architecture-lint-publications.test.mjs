// Docs tests for CapabilityArchitectureLintReport
// publication surfacing (fortieth slice on the
// capability-ontology track).
//
// Verifies the docs describe the read-only surfacing of
// CapabilityArchitectureLintReport in the architecture
// summary + agent contract, pin the boundary statements,
// document the proof-report deferral, and that CHANGELOG +
// review packet are updated alongside.

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
  ".rekon-dev/review-packets/capability-architecture-lint-publications.md",
);

async function read(path) {
  return readFile(path, "utf8");
}

function collapse(text) {
  return text.replace(/\s+/g, " ");
}

async function readAllCollapsed() {
  const artifact = collapse(await read(ARTIFACT_DOC));
  const concept = collapse(await read(CONCEPT_DOC));
  return `${artifact}\n${concept}`;
}

// ---------- 1 ----------

test("docs mention architecture summary surfacing", async () => {
  const text = await readAllCollapsed();
  assert.match(text, /architecture summary.{0,80}surface.{0,80}CapabilityArchitectureLintReport|CapabilityArchitectureLintReport.{0,120}architecture summary/i);
});

// ---------- 2 ----------

test("docs mention agent contract surfacing", async () => {
  const text = await readAllCollapsed();
  assert.match(text, /agent contract/i);
  assert.match(text, /Capability Architecture Linting/);
});

// ---------- 3 ----------

test("docs say proof report surfacing is deferred", async () => {
  const text = await readAllCollapsed();
  assert.match(
    text,
    /Proof-report surfacing is deferred|proof-report publication does not surface/i,
  );
});

// ---------- 4 ----------

test("docs say publications read latest CapabilityArchitectureLintReport", async () => {
  const text = await readAllCollapsed();
  assert.match(text, /read the latest|reads? the latest|read the latest lint report|read the latest `?CapabilityArchitectureLintReport/i);
});

// ---------- 5 ----------

test("docs say publications do not run lint generation", async () => {
  const text = await readAllCollapsed();
  assert.match(
    text,
    /never[\s*]+run `?rekon capability lint architecture/i,
  );
});

// ---------- 6 ----------

test("docs say publications do not mutate FindingReport / FindingLifecycleReport / CoherencyDelta", async () => {
  const text = await readAllCollapsed();
  for (const symbol of ["FindingReport", "FindingLifecycleReport", "CoherencyDelta"]) {
    assert.ok(text.includes(symbol), `expected docs to mention ${symbol}`);
  }
  assert.match(text, /never.{0,40}mutate|does not.{0,40}mutate|not mutated/i);
});

// ---------- 7 ----------

test("docs say findingCandidate is preview-only", async () => {
  const text = await readAllCollapsed();
  assert.match(text, /findingCandidate.{0,40}preview-only|preview-only.{0,40}findingCandidate/i);
});

// ---------- 8 ----------

test("docs say surfacing does not imply resolver routing, verification planning, RefactorPreservationContract, or source writes", async () => {
  const text = await readAllCollapsed();
  assert.match(text, /resolver routing/i);
  assert.match(text, /verification planning/i);
  assert.match(text, /RefactorPreservationContract/);
  assert.match(text, /source writes/i);
});

// ---------- 9 ----------

test("CHANGELOG mentions CapabilityArchitectureLintReport publication surfacing", async () => {
  const text = collapse(await read(CHANGELOG));
  assert.match(text, /CapabilityArchitectureLintReport publication surfacing/i);
});

// ---------- 10 ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(REVIEW_PACKET);
  assert.match(text, /PURPOSE PRESERVATION CHECK/);
  assert.match(text, /CapabilityArchitectureLintReport/);
});

// Docs test for the capability ontology suggestion
// publication surfacing slice. Pins the canonical guidance
// across concept doc, artifact references, and the
// publication-side docs so future edits cannot silently
// drop the read-only contract (no config mutation, no
// CapabilityMap mutation, suggestions are not applied
// vocabulary, proof report surfacing remains deferred).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(relative) {
  return readFile(resolve(repoRoot, relative), "utf8");
}

// ---------- 1: docs mention architecture summary surfacing ----------

test("docs mention architecture summary surfacing of CapabilityOntologySuggestionReport", async () => {
  const concept = await read("docs/concepts/capability-ontology.md");
  const artifact = await read(
    "docs/artifacts/capability-ontology-suggestion-report.md",
  );
  const archConcept = await read(
    "docs/concepts/architecture-summary-publication.md",
  );
  assert.ok(concept.includes("architecture summary"));
  assert.ok(
    artifact.includes("architecture summary"),
    "artifact reference must mention architecture summary surfacing",
  );
  assert.ok(
    archConcept.includes("CapabilityOntologySuggestionReport"),
    "architecture summary concept doc must mention the suggestion report",
  );
});

// ---------- 2: docs mention agent contract surfacing ----------

test("docs mention agent contract surfacing of CapabilityOntologySuggestionReport", async () => {
  const artifact = await read(
    "docs/artifacts/capability-ontology-suggestion-report.md",
  );
  const agentConcept = await read("docs/concepts/agent-operating-contract.md");
  assert.ok(
    artifact.includes("agent contract"),
    "artifact reference must mention agent contract surfacing",
  );
  assert.ok(
    agentConcept.includes("CapabilityOntologySuggestionReport"),
    "agent operating contract concept doc must mention the suggestion report",
  );
});

// ---------- 3: docs say proof report surfacing is deferred ----------

test("docs say proof report surfacing is deferred / optional", async () => {
  const artifact = await read(
    "docs/artifacts/capability-ontology-suggestion-report.md",
  );
  const collapsed = artifact.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Proof report surfacing is deliberately deferred")
    || collapsed.includes("proof report surfacing is deliberately deferred")
    || collapsed.includes("Proof report surfacing is deferred")
    || collapsed.includes("proof report surfacing is deferred")
    || collapsed.includes("proof report surfacing remains deferred"),
    "artifact reference must say proof report surfacing is deferred",
  );
});

// ---------- 4: docs say publications read latest CapabilityOntologySuggestionReport ----------

test("docs say publications read the latest CapabilityOntologySuggestionReport", async () => {
  const artifact = await read(
    "docs/artifacts/capability-ontology-suggestion-report.md",
  );
  const plain = artifact.replace(/\s+/g, " ");
  assert.ok(
    plain.includes("read the latest `CapabilityOntologySuggestionReport`")
    || plain.includes("read the latest CapabilityOntologySuggestionReport"),
    "artifact reference must say publications read the latest report",
  );
});

// ---------- 5: docs say publications do not mutate ontology config ----------

test("docs say publications do not mutate ontology config", async () => {
  const artifact = await read(
    "docs/artifacts/capability-ontology-suggestion-report.md",
  );
  const plain = artifact.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    plain.includes("do not mutate `.rekon/capability-ontology.json`")
    || plain.includes("do not mutate .rekon/capability-ontology.json")
    || plain.includes("never mutate the config"),
    "artifact reference must pin no-config-mutation by publications",
  );
});

// ---------- 6: docs say publications do not mutate CapabilityMap ----------

test("docs say publications do not mutate CapabilityMap", async () => {
  const artifact = await read(
    "docs/artifacts/capability-ontology-suggestion-report.md",
  );
  const plain = artifact.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    plain.includes("does not mutate `CapabilityMap`")
    || plain.includes("do not mutate `CapabilityMap`")
    || plain.includes("does not mutate CapabilityMap")
    || plain.includes("do not mutate CapabilityMap")
    || plain.includes("CapabilityMap is not mutated")
    || plain.includes("never mutates `CapabilityMap`"),
    "artifact reference must pin no-CapabilityMap-mutation by publications",
  );
});

// ---------- 7: docs say suggestions are not applied vocabulary ----------

test("docs say suggestions are not applied vocabulary", async () => {
  const agentArtifact = await read("docs/artifacts/agent-contract-publication.md");
  const plain = agentArtifact.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    plain.includes("not applied vocabulary")
    || plain.includes("not be treated as applied vocabulary")
    || plain.includes("treat CapabilityOntologySuggestionReport entries as applied")
    || plain.includes("treat suggestions as applied"),
    "agent contract artifact doc must say suggestions are not applied vocabulary",
  );
});

// ---------- 8: CHANGELOG mentions surfacing ----------

test("CHANGELOG mentions ontology suggestion publication surfacing", async () => {
  const text = await read("CHANGELOG.md");
  const collapsed = text.replace(/\s+/g, " ");
  assert.ok(
    collapsed.includes("Capability ontology suggestion publication surfacing"),
    "CHANGELOG must mention the surfacing batch",
  );
  assert.ok(text.includes("CapabilityOntologySuggestionReport"));
});

// ---------- 9: review packet exists + contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(
    ".rekon-dev/review-packets/capability-ontology-suggestion-publications.md",
  );
  assert.ok(text.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(text.includes("PUBLICATION SURFACES"));
});

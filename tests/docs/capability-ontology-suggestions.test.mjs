// Docs test for the capability ontology vocabulary expansion
// v1 slice (CapabilityOntologySuggestionReport). Pins the
// canonical guidance docs + cross-link surface so future
// edits cannot silently drop the v1 constraints (preview-only,
// no automatic config mutation, candidate-level decisions
// skipped, CapabilityMap deferred).

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

async function read(relative) {
  return readFile(resolve(repoRoot, relative), "utf8");
}

const artifactDocPath =
  "docs/artifacts/capability-ontology-suggestion-report.md";

// ---------- 1: artifact doc exists ----------

test("suggestion report artifact reference exists", async () => {
  const text = await read(artifactDocPath);
  assert.ok(text.includes("# `CapabilityOntologySuggestionReport` Artifact"));
});

// ---------- 2: concept doc mentions the suggestion report ----------

test("concept doc mentions CapabilityOntologySuggestionReport", async () => {
  const text = await read("docs/concepts/capability-ontology.md");
  assert.ok(text.includes("CapabilityOntologySuggestionReport"));
});

// ---------- 3: docs say suggestions are preview-only ----------

test("docs say suggestions are preview-only", async () => {
  const artifactDoc = await read(artifactDocPath);
  const concept = await read("docs/concepts/capability-ontology.md");
  const plainArtifact = artifactDoc.replace(/\*\*/g, "").replace(/\s+/g, " ");
  const plainConcept = concept.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    plainArtifact.includes("preview-only")
    || plainArtifact.includes("preview only"),
    "artifact reference must say the report is preview-only",
  );
  assert.ok(
    plainConcept.includes("preview-only")
    || plainConcept.includes("preview only"),
    "concept doc must say the suggestion surface is preview-only",
  );
});

// ---------- 4: docs say config is not mutated automatically ----------

test("docs say `.rekon/capability-ontology.json` is not mutated automatically", async () => {
  const text = await read(artifactDocPath);
  const plain = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(text.includes(".rekon/capability-ontology.json"));
  assert.ok(
    plain.includes("does not mutate `.rekon/capability-ontology.json`")
    || plain.includes("does not mutate .rekon/capability-ontology.json")
    || plain.includes("not mutated automatically"),
    "artifact reference must explicitly pin the no-auto-config-mutation rule",
  );
});

// ---------- 5: docs mention extend-ontology decisions ----------

test("docs mention extend-ontology decisions as the input source", async () => {
  const text = await read(artifactDocPath);
  assert.ok(text.includes("extend-ontology"));
});

// ---------- 6: docs mention candidate-level decisions are skipped in v1 ----------

test("docs say candidate-level decisions are skipped in v1", async () => {
  const text = await read(artifactDocPath);
  const plain = text.replace(/\*\*/g, "").replace(/\s+/g, " ");
  assert.ok(
    plain.includes("candidate-level decisions require manual ontology editing")
    || plain.includes("candidate-level decisions are skipped")
    || plain.includes("skipped in v1"),
    "artifact reference must say candidate-level decisions are skipped in v1",
  );
});

// ---------- 7: docs say CapabilityMap integration remains deferred ----------

test("docs say CapabilityMap integration remains deferred", async () => {
  const text = await read(artifactDocPath);
  const plain = text.replace(/\s+/g, " ");
  assert.ok(
    plain.includes("`CapabilityMap` integration (Layer 6) remains deferred")
    || plain.includes("`CapabilityMap` integration remains deferred")
    || plain.includes("CapabilityMap integration remains deferred"),
    "artifact reference must say CapabilityMap integration remains deferred",
  );
});

// ---------- 8: CHANGELOG mentions CapabilityOntologySuggestionReport ----------

test("CHANGELOG mentions CapabilityOntologySuggestionReport", async () => {
  const text = await read("CHANGELOG.md");
  assert.ok(text.includes("CapabilityOntologySuggestionReport"));
  assert.ok(text.includes("rekon capability ontology suggestions"));
});

// ---------- 9: review packet exists + contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  const text = await read(
    ".rekon-dev/review-packets/capability-ontology-suggestions.md",
  );
  assert.ok(text.includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(text.includes("PREVIEW MODEL"));
});

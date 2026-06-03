// Docs tests for the CapabilityEvidenceGraph v1 substrate
// (capability-evidence-graph-v1).
//
// These assertions pin the *purpose* of the artifact into the
// documentation so the substrate cannot drift away from its
// stated boundaries: deterministic facts are the substrate,
// LLM/embedding outputs are evidence-backed inferences (not
// proof), verb:noun stays a shorthand, files stay containers,
// symbols become first-class nodes, and v1 generates no
// embeddings, runs no LLM, executes no commands, writes no
// source, and leaves intent:go deferred.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const ARTIFACT_DOC = resolve(repoRoot, "docs/artifacts/capability-evidence-graph.md");
const CONCEPT_DOC = resolve(repoRoot, "docs/concepts/capability-evidence-graph.md");
const STRATEGY_DOC = resolve(repoRoot, "docs/strategy/capability-evidence-graph-v1.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/capability-evidence-graph-v1.md");

// Standard normalizer: strip line-leading `>`, lowercase, drop
// backticks/asterisks, collapse whitespace. Keeps #, /, :, |, ,, -.
const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

function read(path) {
  return existsSync(path) ? norm(readFileSync(path, "utf8")) : "";
}

const artifact = read(ARTIFACT_DOC);
const concept = read(CONCEPT_DOC);
const strategy = read(STRATEGY_DOC);
const changelog = read(CHANGELOG);
const packet = read(REVIEW_PACKET);

// Concatenation of the three new docs — most conceptual phrases
// may live in any of them.
const newDocs = [artifact, concept, strategy].join("\n");

// ---------- 1: artifact doc exists ----------
test("artifact doc exists", () => {
  assert.ok(existsSync(ARTIFACT_DOC), "docs/artifacts/capability-evidence-graph.md must exist");
});

// ---------- 2: concept doc exists ----------
test("concept doc exists", () => {
  assert.ok(existsSync(CONCEPT_DOC), "docs/concepts/capability-evidence-graph.md must exist");
});

// ---------- 3: strategy doc exists ----------
test("strategy doc exists", () => {
  assert.ok(existsSync(STRATEGY_DOC), "docs/strategy/capability-evidence-graph-v1.md must exist");
});

// ---------- 4: evidence-backed context, not proof ----------
test("docs frame the graph as evidence-backed context, not proof by itself", () => {
  assert.ok(
    newDocs.includes(norm("is evidence-backed context, not proof by itself")),
    "expected: '... is evidence-backed context, not proof by itself'",
  );
});

// ---------- 5: deterministic facts are the substrate ----------
test("docs state deterministic facts are the substrate", () => {
  assert.ok(
    newDocs.includes(norm("deterministic facts are the substrate")),
    "expected: 'deterministic facts are the substrate'",
  );
});

// ---------- 6: LLM and embedding outputs are evidence-backed inferences ----------
test("docs state LLM and embedding outputs are evidence-backed inferences", () => {
  assert.ok(
    newDocs.includes(norm("llm and embedding outputs are evidence-backed inferences")),
    "expected: 'LLM and embedding outputs are evidence-backed inferences'",
  );
});

// ---------- 7: verb:noun remains shorthand ----------
test("docs state verb:noun remains shorthand, not the whole capability model", () => {
  assert.ok(
    newDocs.includes(norm("verb:noun remains shorthand, not the whole capability model")),
    "expected: 'verb:noun remains shorthand, not the whole capability model'",
  );
});

// ---------- 8: files remain containers ----------
test("docs state files remain containers", () => {
  assert.ok(newDocs.includes(norm("files remain containers")), "expected: 'files remain containers'");
});

// ---------- 9: symbols are first-class intelligence nodes ----------
test("docs state symbols are first-class intelligence nodes", () => {
  assert.ok(
    newDocs.includes(norm("symbols are first-class intelligence nodes")),
    "expected: 'symbols are first-class intelligence nodes'",
  );
});

// ---------- 10: no embeddings are generated in v1 ----------
test("docs state no embeddings are generated in v1", () => {
  assert.ok(
    newDocs.includes(norm("no embeddings are generated in v1")),
    "expected: 'no embeddings are generated in v1'",
  );
});

// ---------- 11: no LLM is used in v1 ----------
test("docs state no LLM is used in v1", () => {
  assert.ok(newDocs.includes(norm("no llm is used in v1")), "expected: 'no LLM is used in v1'");
});

// ---------- 12: must not execute commands ----------
test("docs state semantic intelligence must not execute commands", () => {
  assert.ok(
    newDocs.includes(norm("semantic intelligence must not execute commands")),
    "expected: 'semantic intelligence must not execute commands'",
  );
});

// ---------- 13: must not write source files ----------
test("docs state semantic intelligence must not write source files", () => {
  assert.ok(
    newDocs.includes(norm("semantic intelligence must not write source files")),
    "expected: 'semantic intelligence must not write source files'",
  );
});

// ---------- 14: intent:go remains deferred ----------
test("docs state intent:go remains deferred", () => {
  assert.ok(newDocs.includes(norm("intent:go remains deferred")), "expected: 'intent:go remains deferred'");
});

// ---------- 15: CHANGELOG + review packet ----------
test("CHANGELOG mentions Capability Evidence Graph v1 and review packet has a purpose preservation check", () => {
  assert.ok(
    changelog.includes(norm("capability evidence graph v1")),
    "CHANGELOG must mention Capability Evidence Graph v1",
  );
  assert.ok(existsSync(REVIEW_PACKET), "review packet must exist");
  assert.ok(packet.includes(norm("purpose preservation check")), "review packet needs a PURPOSE PRESERVATION CHECK");
});

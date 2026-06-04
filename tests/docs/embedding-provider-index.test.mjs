// Docs tests for Embedding Provider / Index v1 (slice 159).
//
// Pins the twelve verbatim boundary statements in the concept doc, the
// CHANGELOG mention, and the review packet's PURPOSE PRESERVATION CHECK, so the
// embedding capability cannot drift from proposal/context into proof.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const CONCEPT = resolve(repoRoot, "docs/concepts/embedding-provider-index.md");
const MEMO = resolve(repoRoot, "docs/strategy/embedding-provider-index-v1.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/embedding-provider-index-v1.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

// Standard normalizer: strip line-leading `>`, lowercase, drop
// backticks/asterisks, collapse whitespace. Keeps #, /, :, |, ,, -, ..
const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

function read(path) {
  return existsSync(path) ? norm(readFileSync(path, "utf8")) : "";
}

const concept = read(CONCEPT);
const packet = read(REVIEW_PACKET);
const changelog = read(CHANGELOG);

// The twelve verbatim boundary statements (exact terminal punctuation).
const BOUNDARY_STATEMENTS = [
  "Embedding similarity is proposal/context, not proof.",
  "Embeddings must not approve plans.",
  "Embeddings must not execute commands.",
  "Embeddings must not write source files.",
  "Embeddings must not run Circe.",
  "Raw vectors are cache/index data, not canonical proof artifacts.",
  "No stale embedding is used silently.",
  "CapabilityEvidenceGraph remains the evidence substrate.",
  "Deterministic facts remain stronger than embedding similarity.",
  "Voyage is the first real embedding provider.",
  "OpenAI embeddings are deferred.",
  "intent:go remains deferred.",
];

test("the two new docs and the review packet exist", () => {
  assert.ok(existsSync(CONCEPT), "concept doc should exist");
  assert.ok(existsSync(MEMO), "strategy memo should exist");
  assert.ok(existsSync(REVIEW_PACKET), "review packet should exist");
});

for (const statement of BOUNDARY_STATEMENTS) {
  test(`concept doc states verbatim: ${statement}`, () => {
    assert.ok(
      concept.includes(norm(statement)),
      `concept doc is missing the verbatim boundary statement: "${statement}"`,
    );
  });
}

test("CHANGELOG mentions Embedding Provider / Index v1", () => {
  assert.ok(changelog.includes(norm("Embedding Provider / Index v1")));
});

test("review packet contains a PURPOSE PRESERVATION CHECK", () => {
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")));
});

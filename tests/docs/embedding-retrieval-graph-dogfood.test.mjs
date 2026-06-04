// Docs tests for the Embedding Retrieval / Graph Dogfood Review (slice 161).
//
// Pins the dogfood review's boundary statements, the CHANGELOG mention, and the
// review packet's PURPOSE PRESERVATION CHECK, so embedding retrieval cannot drift
// from proposal/context into proof.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(repoRoot, "docs/strategy/embedding-retrieval-graph-dogfood-review.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/embedding-retrieval-graph-dogfood-review.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

// Standard normalizer: strip line-leading `>`, lowercase, drop
// backticks/asterisks, collapse whitespace.
const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

function read(path) {
  return existsSync(path) ? norm(readFileSync(path, "utf8")) : "";
}

const memo = read(MEMO);
const packet = read(REVIEW_PACKET);
const changelog = read(CHANGELOG);

const STATEMENTS = [
  "Embedding retrieval is proposal/context, not proof.",
  "embedding_similarity enters CapabilityEvidenceGraph as evidence.",
  "Embedding claims are inference claims, not facts.",
  "Raw vectors remain cache/index data.",
  "generatedEmbeddings remains false when graph build reads cache.",
  "usedLlm remains false.",
  "Source files are unchanged.",
  "No WorkOrder or VerificationPlan is created.",
  "No Circe is run.",
  "intent:go remains deferred.",
];

// 1
test("dogfood review doc exists", () => {
  assert.ok(existsSync(MEMO), "expected docs/strategy/embedding-retrieval-graph-dogfood-review.md");
});

// 2-11
for (const statement of STATEMENTS) {
  test(`memo states verbatim: ${statement}`, () => {
    assert.ok(memo.includes(norm(statement)), `memo missing verbatim statement: "${statement}"`);
  });
}

// 12
test("CHANGELOG mentions Embedding Retrieval / Graph Dogfood Review", () => {
  assert.ok(changelog.includes(norm("Embedding Retrieval / Graph Dogfood Review")));
});

// 13
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet should exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")));
});

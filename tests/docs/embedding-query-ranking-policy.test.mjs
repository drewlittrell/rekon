// Docs tests for the Embedding Query Input-Type / Ranking Policy Implementation
// (slice 164). Pins the implementation memo's input-type, top-k, score-band, and
// boundary statements, the CHANGELOG mention, and the review packet's PURPOSE
// PRESERVATION CHECK — so the shipped policy stays explainable and retrieval
// stays proposal/context, not proof.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(repoRoot, "docs/strategy/embedding-query-input-type-ranking-policy-implementation.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/embedding-query-input-type-ranking-policy-v1.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

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
  "Query embeddings use input_type=query.",
  "Index embeddings use input_type=document.",
  "The default top-k is 8.",
  "The maximum top-k is 20.",
  "A score of 0.78 or higher is a strong semantic neighbor.",
  "A score from 0.65 to 0.78 is a useful contextual neighbor.",
  "A score from 0.50 to 0.65 is a weak / needs-review neighbor.",
  "A score below 0.50 is ignored by default.",
  "Retrieval output is proposal/context, not proof.",
  "Task-shaped context remains the first selected consumer but is not implemented in this slice.",
  "Duplicate detection and canonical recommendations are deferred.",
  "Deterministic facts remain stronger than embedding similarity.",
  "This slice executes no commands.",
  "This slice writes no source files.",
  "This slice runs no Circe.",
  "intent:go remains deferred.",
];

// 1
test("implementation doc exists", () => {
  assert.ok(existsSync(MEMO), "expected docs/strategy/embedding-query-input-type-ranking-policy-implementation.md");
});

// 2-17
for (const statement of STATEMENTS) {
  test(`memo states verbatim: ${statement}`, () => {
    assert.ok(memo.includes(norm(statement)), `memo missing verbatim statement: "${statement}"`);
  });
}

// 18
test("CHANGELOG mentions Embedding Query Input-Type / Ranking Policy Implementation", () => {
  assert.ok(changelog.includes(norm("Embedding Query Input-Type / Ranking Policy Implementation")));
});

// 19
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet should exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")));
});

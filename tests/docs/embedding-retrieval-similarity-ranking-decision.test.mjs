// Docs tests for the Embedding Retrieval / Similarity Ranking Decision (slice 163).
//
// Pins the decision memo's required headings, boundary statements, the five
// required tables, the CHANGELOG mention, and the review packet's PURPOSE
// PRESERVATION CHECK — so the ranking policy stays explicit and graph-first and
// cannot drift from proposal/context into proof.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(repoRoot, "docs/strategy/embedding-retrieval-similarity-ranking-decision.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/embedding-retrieval-similarity-ranking-decision.md");
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

const HEADINGS = [
  "# Embedding Retrieval / Similarity Ranking Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## North Star Alignment",
  "## Live Dogfood Evidence",
  "## Options Considered",
  "## Recommendation",
  "## Ranking Policy",
  "## Query And Document Input Types",
  "## Explanation Model",
  "## Staleness And Policy Model",
  "## First Consumer",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

const STATEMENTS = [
  "Embedding retrieval is proposal/context, not proof.",
  "Embedding retrieval must not approve plans.",
  "Embedding retrieval must not execute commands.",
  "Embedding retrieval must not write source files.",
  "Embedding retrieval must not run Circe.",
  "Similarity thresholds are policy, not proof.",
  "Query embeddings should use input_type=query.",
  "Index embeddings should use input_type=document.",
  "Task-shaped context is the first selected consumer.",
  "Duplicate detection is deferred until stronger precision evidence exists.",
  "Canonical recommendations are deferred until similarity is combined with deterministic ownership/fan-in/runtime evidence.",
  "Linear scan remains acceptable for v1.",
  "CapabilityEvidenceGraph remains the evidence substrate.",
  "Ranking policy must describe how retrieval results become graph evidence or graph-adjacent context, not just CLI search output.",
  "intent:go remains deferred.",
];

const TABLE_HEADERS = {
  "option table": "| Option | Decision | Reason |",
  "threshold table": "| Score Band | Meaning | Default Use |",
  "surface table": "| Surface | Retrieval Policy |",
  "input-type table": "| Operation | Input Type |",
  "boundary table": "| Boundary | Decision |",
};

// 1
test("decision memo exists", () => {
  assert.ok(existsSync(MEMO), "expected docs/strategy/embedding-retrieval-similarity-ranking-decision.md");
});

// 2
test("memo contains all required headings", () => {
  for (const heading of HEADINGS) {
    assert.ok(memo.includes(norm(heading)), `memo missing heading: "${heading}"`);
  }
});

// 3-17
for (const statement of STATEMENTS) {
  test(`memo states verbatim: ${statement}`, () => {
    assert.ok(memo.includes(norm(statement)), `memo missing verbatim statement: "${statement}"`);
  });
}

// 18-22
for (const [label, header] of Object.entries(TABLE_HEADERS)) {
  test(`memo includes ${label}`, () => {
    assert.ok(memo.includes(norm(header)), `memo missing ${label} (header "${header}")`);
  });
}

// 23
test("CHANGELOG mentions Embedding Retrieval / Similarity Ranking Decision", () => {
  assert.ok(changelog.includes(norm("Embedding Retrieval / Similarity Ranking Decision")));
});

// 24
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet should exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")));
});

// Docs tests for the Embedding Provider / Index Safety Review (slice 160).
//
// Pins the safety-review memo's required headings, the twenty-one verbatim
// boundary statements, and the five required tables, plus the CHANGELOG mention
// and the review packet's PURPOSE PRESERVATION CHECK. Strategy-only batch: no
// runtime/source change is asserted here.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(repoRoot, "docs/strategy/embedding-provider-index-safety-review.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/embedding-provider-index-safety-review.md");
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

const memo = read(MEMO);
const packet = read(REVIEW_PACKET);
const changelog = read(CHANGELOG);

const REQUIRED_HEADINGS = [
  "# Embedding Provider / Index Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Implementation Reviewed",
  "## Provider Review",
  "## Cache And Index Review",
  "## Retrieval Review",
  "## Graph Integration Review",
  "## Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

const REQUIRED_STATEMENTS = [
  "Embedding similarity is proposal/context, not proof.",
  "Retrieval output is proposal/context, not proof.",
  "Raw vectors are cache/index data, not canonical proof artifacts.",
  "No stale embedding is used silently.",
  "Embedding provider calls are explicit or configured, never surprising defaults.",
  "Voyage missing-key behavior fails cleanly without a network call.",
  "Live embedding tests are gated by environment variables.",
  "Embedding index writes only under .rekon/cache/embeddings.",
  "CapabilityEvidenceGraph remains the evidence substrate.",
  "Embedding similarity enters CapabilityEvidenceGraph as embedding_similarity evidence.",
  "Embedding claims are inference claims, not facts.",
  "Deterministic facts remain stronger than embedding similarity.",
  "Capability graph build does not generate embeddings.",
  "CapabilityEvidenceGraph.generatedEmbeddings remains false when graph build reads cached embeddings.",
  "CapabilityEvidenceGraph.usedLlm remains false for embedding graph integration.",
  "Embeddings must not approve plans.",
  "Embeddings must not execute commands.",
  "Embeddings must not write source files.",
  "Embeddings must not create WorkOrder or VerificationPlan.",
  "Embeddings must not run Circe.",
  "intent:go remains deferred.",
];

const REQUIRED_TABLES = [
  ["surface table", "| Surface | Status | Safety Finding |"],
  ["provider table", "| Provider Path | Review Finding |"],
  ["cache table", "| Cache Concern | Review Finding |"],
  ["boundary table", "| Boundary | Decision |"],
  ["option table", "| Option | Decision | Reason |"],
];

// 1: doc exists.
test("safety review doc exists", () => {
  assert.ok(existsSync(MEMO), "expected docs/strategy/embedding-provider-index-safety-review.md");
});

// 2: all required headings present.
test("memo contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memo.includes(norm(heading)), `memo missing heading: ${heading}`);
  }
});

// 3-23: the twenty-one verbatim boundary statements.
for (const statement of REQUIRED_STATEMENTS) {
  test(`memo states verbatim: ${statement}`, () => {
    assert.ok(memo.includes(norm(statement)), `memo missing verbatim statement: "${statement}"`);
  });
}

// 24-28: the five required tables.
for (const [label, header] of REQUIRED_TABLES) {
  test(`memo includes the ${label}`, () => {
    assert.ok(memo.includes(norm(header)), `memo missing ${label} (${header})`);
  });
}

// 29: CHANGELOG mention.
test("CHANGELOG mentions Embedding Provider / Index Safety Review", () => {
  assert.ok(changelog.includes(norm("Embedding Provider / Index Safety Review")));
});

// 30: review packet exists and contains PURPOSE PRESERVATION CHECK.
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet should exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")));
});

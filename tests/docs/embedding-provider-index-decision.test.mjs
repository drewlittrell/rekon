// Docs tests for the Embedding Provider / Index Decision (slice 158). Pins the
// memo headings, the 11 boundary statements, the five required tables, the
// CHANGELOG entry, and the review packet's purpose preservation check, so the
// pinned embeddings posture can never silently drift.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) =>
  text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const memo = read("docs/strategy/embedding-provider-index-decision.md");
const memoNorm = norm(memo);
const reviewPacket = read(".rekon-dev/review-packets/embedding-provider-index-decision.md");
const changelog = read("CHANGELOG.md");

// 1. memo exists.
test("decision memo exists", () => {
  assert.ok(memo.length > 0);
});

// 2. required headings.
const REQUIRED_HEADINGS = [
  "# Embedding Provider / Index Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Evidence Graph Substrate",
  "## Options Considered",
  "## Recommendation",
  "## Provider Decision",
  "## Chunk Model",
  "## Storage And Index Model",
  "## Retrieval Model",
  "## Staleness Model",
  "## Privacy And Opt-In Model",
  "## Graph Integration Model",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];
test("doc contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memo.includes(heading), `missing heading: ${heading}`);
  }
});

// 3-13. the 11 boundary statements.
const STATEMENTS = [
  "Embedding similarity is proposal/context, not proof.",
  "Embeddings must not approve plans.",
  "Embeddings must not execute commands.",
  "Embeddings must not write source files.",
  "Embeddings must not run Circe.",
  "Embedding provider calls are explicit or configured, never surprising defaults.",
  "Raw vectors are cache/index data, not canonical proof artifacts.",
  "No stale embedding is used silently.",
  "CapabilityEvidenceGraph remains the evidence substrate.",
  "Deterministic facts remain stronger than embedding similarity.",
  "intent:go remains deferred.",
];
for (const statement of STATEMENTS) {
  test(`doc says: ${statement}`, () => {
    assert.ok(memoNorm.includes(norm(statement)), `memo missing statement: ${statement}`);
  });
}

// 14-18. the five required tables.
test("doc includes option table", () => {
  assert.match(memo, /\| Option \| Decision \| Reason \|/);
});
test("doc includes provider table", () => {
  assert.match(memo, /\| Provider \| Decision \| Reason \|/);
});
test("doc includes storage table", () => {
  assert.match(memo, /\| Item \| Decision \|/);
});
test("doc includes use-case table", () => {
  assert.match(memo, /\| Use Case \| Embedding Role \|/);
});
test("doc includes boundary table", () => {
  assert.match(memo, /\| Boundary \| Decision \|/);
});

// 19. CHANGELOG.
test("CHANGELOG mentions the Embedding Provider / Index Decision", () => {
  assert.match(changelog, /Embedding Provider \/ Index Decision/, "CHANGELOG missing the decision entry");
});

// 20. review packet.
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(reviewPacket, /PURPOSE PRESERVATION CHECK/);
});

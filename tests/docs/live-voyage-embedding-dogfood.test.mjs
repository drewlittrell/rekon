// Docs tests for the Live Voyage Embedding Dogfood (slice 162).
//
// Pins the live dogfood memo's boundary statements — including the new key-safety
// and env-gating guarantees — plus the CHANGELOG mention, the review packet's
// PURPOSE PRESERVATION CHECK, the packet's key-safety claim, and the honest
// input_type follow-up. These keep the live Voyage dogfood from drifting:
// embeddings stay proposal/context not proof, and the API key stays env-only.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(repoRoot, "docs/strategy/live-voyage-embedding-dogfood.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/live-voyage-embedding-dogfood.md");
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
  "Live Voyage embedding retrieval is proposal and context, not proof.",
  "Embedding claims are inference claims, never facts.",
  "Deterministic facts remain stronger than embedding similarity.",
  "Raw vectors are regenerable cache and index data, never canonical.",
  "The Voyage API key is read from the environment only and is never committed.",
  "Live embedding tests are gated by environment variables.",
  "The committed test suite runs without any API key.",
  "The graph build generates no embeddings, so generatedEmbeddings stays false.",
  "The graph build calls no provider, so usedLlm stays false.",
  "The Voyage dogfood writes no source files.",
  "The Voyage dogfood creates no WorkOrder and no VerificationPlan.",
  "The Voyage dogfood runs no Circe.",
  "intent:go remains deferred.",
];

// 1
test("live Voyage dogfood memo exists", () => {
  assert.ok(existsSync(MEMO), "expected docs/strategy/live-voyage-embedding-dogfood.md");
});

// 2-14
for (const statement of STATEMENTS) {
  test(`memo states verbatim: ${statement}`, () => {
    assert.ok(memo.includes(norm(statement)), `memo missing verbatim statement: "${statement}"`);
  });
}

// 15
test("CHANGELOG mentions Live Voyage Embedding Dogfood", () => {
  assert.ok(changelog.includes(norm("Live Voyage Embedding Dogfood")));
});

// 16
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet should exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")));
});

// 17
test("review packet pins key safety: the key never entered the repo or commits", () => {
  assert.ok(
    packet.includes(norm("never written to any repo file, never committed")),
    "review packet should state the key was never written to any repo file and never committed",
  );
});

// 18
test("memo records the honest input_type follow-up", () => {
  assert.ok(
    memo.includes(norm("input_type")) && memo.includes(norm("quality opportunity, not a defect")),
    "memo should record the input_type=query nuance as a quality opportunity, not a defect",
  );
});

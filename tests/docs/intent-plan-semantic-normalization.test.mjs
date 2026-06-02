// Docs coverage for Intent Plan Compiler Semantic Normalization / Dogfood
// (slice 139). Pins the documented provider selection, semantic modes, and the
// proposal-not-proof boundary.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const doc = norm(read("docs/strategy/intent-plan-compiler-semantic-normalization-dogfood.md"));
const changelog = read("CHANGELOG.md");
const packet = read(".rekon-dev/review-packets/intent-plan-compiler-semantic-normalization.md");

test("1. docs say semantic normalization can use a routed provider", () => {
  assert.ok(doc.includes("semantic normalization can use a routed provider"));
});

test("2. docs say provider selection uses --llm-provider / --llm-model", () => {
  assert.ok(doc.includes("provider selection uses --llm-provider / --llm-model"));
});

test("3. docs say environment variables can select provider/model", () => {
  assert.ok(doc.includes("environment variables can select provider/model"));
});

test("4. docs say API keys are not stored in repo config", () => {
  assert.ok(doc.includes("api keys are not stored in repo config"));
});

test("5. docs say --semantic off is deterministic", () => {
  assert.ok(doc.includes("--semantic off is deterministic"));
});

test("6. docs say --semantic auto falls back when unavailable", () => {
  assert.ok(doc.includes("--semantic auto falls back when unavailable"));
});

test("7. docs say --semantic required fails when unavailable", () => {
  assert.ok(doc.includes("--semantic required fails when unavailable"));
});

test("8. docs say LLM output is proposal, not proof", () => {
  assert.ok(doc.includes("llm output is proposal, not proof"));
});

test("9. docs say LLM output is schema-validated and deterministically re-checked", () => {
  assert.ok(doc.includes("llm output is schema-validated and deterministically re-checked"));
});

test("10. docs say semantic normalization executes no commands", () => {
  assert.ok(doc.includes("semantic normalization executes no commands"));
});

test("11. docs say semantic normalization writes no source files", () => {
  assert.ok(doc.includes("semantic normalization writes no source files"));
});

test("12. docs say semantic normalization runs no Circe", () => {
  assert.ok(doc.includes("semantic normalization runs no circe"));
});

test("13. docs say intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("14. CHANGELOG mentions Intent Plan Compiler Semantic Normalization", () => {
  assert.match(changelog, /Intent Plan Compiler Semantic Normalization/);
});

test("15. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

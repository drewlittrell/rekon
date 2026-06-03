// Documentation coverage for the Classic LLM Semantic Parsing Parity Audit /
// Completion Decision (slice 143). Pins the decision memo's boundary statements,
// the four required tables, the CHANGELOG entry, and the review packet's
// PURPOSE PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC_PATH = "docs/strategy/classic-llm-semantic-parsing-parity-decision.md";
const PACKET_PATH = ".rekon-dev/review-packets/classic-llm-semantic-parsing-parity-decision.md";
const doc = norm(read(DOC_PATH));
const changelog = read("CHANGELOG.md");
const packet = read(PACKET_PATH);

test("1. decision memo exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC_PATH)));
});

test("2. doc says LLM semantic output is proposal, not proof", () => {
  assert.ok(doc.includes("llm semantic output is proposal, not proof"));
});

test("3. doc says semantic parsing must not approve plans", () => {
  assert.ok(doc.includes("semantic parsing must not approve plans"));
});

test("4. doc says semantic parsing must not execute commands", () => {
  assert.ok(doc.includes("semantic parsing must not execute commands"));
});

test("5. doc says semantic parsing must not write source files", () => {
  assert.ok(doc.includes("semantic parsing must not write source files"));
});

test("6. doc says semantic parsing must not run Circe", () => {
  assert.ok(doc.includes("semantic parsing must not run circe"));
});

test("7. doc says provider calls must be explicit or configured, not surprising defaults", () => {
  assert.ok(doc.includes("provider calls must be explicit or configured, not surprising defaults"));
});

test("8. doc says source text privacy must be an explicit policy decision", () => {
  assert.ok(doc.includes("source text privacy must be an explicit policy decision"));
});

test("9. doc says embeddings are intentionally deferred to a separate track", () => {
  assert.ok(doc.includes("embeddings are intentionally deferred to a separate track"));
});

test("10. doc says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("11. doc includes the option table", () => {
  assert.ok(doc.includes("stop at plan-review semantics | rejected | old parity is broader"));
  assert.ok(doc.includes("finish llm semantic parsing before embeddings | selected"));
});

test("12. doc includes the semantic surface table", () => {
  assert.ok(doc.includes("per-file semantic scan | audit and prioritize"));
  assert.ok(doc.includes("embeddings | separate track"));
});

test("13. doc includes the boundary table", () => {
  assert.ok(doc.includes("semantic output vs proof | proposal only"));
  assert.ok(doc.includes("intent:go | deferred"));
});

test("14. doc includes the follow-up table", () => {
  assert.ok(doc.includes("semantic file understanding v1 | per-file scan"));
  assert.ok(doc.includes("embeddings parity audit | separate track after llm semantic parsing scope"));
});

test("15. CHANGELOG mentions Classic LLM Semantic Parsing Parity Decision", () => {
  assert.match(changelog, /Classic LLM Semantic Parsing Parity Decision/);
});

test("16. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

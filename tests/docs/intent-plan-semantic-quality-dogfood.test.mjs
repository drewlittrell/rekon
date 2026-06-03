// Documentation coverage for the Intent Plan Compiler Semantic Normalization
// Quality Dogfood (slice 141). Pins the strategy doc's required guarantees and
// the embedded safety-review boundary statement, plus the CHANGELOG entry and
// the review packet's PURPOSE PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
// Strip line-leading blockquote markers (`> `) before collapsing whitespace so
// quoted statements join cleanly; keep `->` arrows intact (those `>` are mid-line).
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const DOC_PATH = "docs/strategy/intent-plan-semantic-quality-dogfood.md";
const PACKET_PATH = ".rekon-dev/review-packets/intent-plan-semantic-quality-dogfood.md";
const doc = norm(read(DOC_PATH));
const changelog = read("CHANGELOG.md");
const packet = read(PACKET_PATH);

test("1. dogfood doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, DOC_PATH)));
});

test("2. doc says LLM-backed semantic normalization quality is evaluated separately from Circe handoff", () => {
  assert.ok(doc.includes("llm-backed semantic normalization quality is evaluated separately from circe handoff"));
});

test("3. doc says semantic output is a proposal, not proof", () => {
  assert.ok(doc.includes("semantic output is a proposal, not proof"));
});

test("4. doc says semantic output is schema-validated and deterministically rechecked", () => {
  assert.ok(doc.includes("semantic output is schema-validated and deterministically rechecked"));
});

test("5. doc says no-key fallback is safety behavior, not semantic quality proof", () => {
  assert.ok(doc.includes("no-key fallback is safety behavior, not semantic quality proof"));
});

test("6. doc says live provider dogfood is required to call semantic quality proven", () => {
  assert.ok(doc.includes("live provider dogfood is required to call semantic quality proven"));
});

test("7. doc says semantic normalization executes no commands", () => {
  assert.ok(doc.includes("semantic normalization executes no commands"));
});

test("8. doc says semantic normalization writes no source files", () => {
  assert.ok(doc.includes("semantic normalization writes no source files"));
});

test("9. doc says semantic normalization runs no Circe", () => {
  assert.ok(doc.includes("semantic normalization runs no circe"));
});

test("10. doc says intent:go remains deferred", () => {
  assert.ok(doc.includes("intent:go remains deferred"));
});

test("11. doc carries the embedded safety-review boundary statement", () => {
  assert.ok(
    doc.includes(
      "this semantic quality dogfood does not introduce a new execution/source-write/circe boundary; it evaluates provider-backed text transformation under the already-shipped proposal-not-proof model",
    ),
  );
});

test("12. CHANGELOG mentions Intent Plan Semantic Quality Dogfood", () => {
  assert.match(changelog, /Intent Plan Semantic Quality Dogfood/);
});

test("13. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});

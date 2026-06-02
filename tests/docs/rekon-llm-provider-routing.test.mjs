// Documentation coverage for Rekon LLM Provider Routing (slice 138).

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const path = (rel) => resolve(repoRoot, rel);
const read = (rel) => readFileSync(path(rel), "utf8");
const norm = (rel) => read(rel).replace(/[`*]/g, "").replace(/\s+/g, " ").toLowerCase();

const DOC = "docs/concepts/rekon-llm-provider-routing.md";
const IMPL = "docs/strategy/rekon-llm-provider-routing-implementation.md";
const PACKET = ".rekon-dev/review-packets/rekon-llm-provider-routing-v1.md";
const CHANGELOG = "CHANGELOG.md";

test("1. providers may read/transform/critique text", () => {
  assert.ok(norm(DOC).includes("may read / transform / critique text"));
});
test("2. providers may not approve plans", () => {
  assert.ok(norm(DOC).includes("may not approve plans"));
});
test("3. providers may not execute commands", () => {
  assert.ok(norm(DOC).includes("may not execute commands"));
});
test("4. providers may not write source files", () => {
  assert.ok(norm(DOC).includes("may not write source files"));
});
test("5. providers may not run Circe", () => {
  assert.ok(norm(DOC).includes("may not run circe"));
});
test("6. providers may not implement intent:go", () => {
  assert.ok(norm(DOC).includes("may not implement intent:go"));
});
test("7. LLM output is proposal, not proof", () => {
  assert.ok(norm(DOC).includes("llm output is proposal, not proof"));
});
test("8. LLM output is schema-validated and deterministically re-checked", () => {
  assert.ok(norm(DOC).includes("schema-validated and deterministically re-checked"));
});
test("9. docs mention RekonLlmProvider", () => {
  assert.ok(norm(DOC).includes("rekonllmprovider"));
});
test("10. docs mention RekonEmbeddingProvider", () => {
  assert.ok(norm(DOC).includes("rekonembeddingprovider"));
});
test("11. docs mention task routes", () => {
  const n = norm(DOC);
  assert.ok(n.includes("routed by task"));
  assert.ok(n.includes("plan.semantic-normalize"));
});
test("12. docs mention --llm-provider", () => {
  assert.ok(norm(DOC).includes("--llm-provider"));
});
test("13. docs mention --llm-model", () => {
  assert.ok(norm(DOC).includes("--llm-model"));
});
test("14. CHANGELOG mentions Rekon LLM Provider Routing Implementation", () => {
  assert.ok(read(CHANGELOG).includes("Rekon LLM Provider Routing Implementation"));
});
test("15. review packet exists and contains PURPOSE PRESERVATION CHECK; impl doc exists", () => {
  assert.ok(existsSync(path(PACKET)));
  assert.ok(read(PACKET).includes("PURPOSE PRESERVATION CHECK"));
  assert.ok(existsSync(path(IMPL)));
});

// Documentation coverage for Rekon LLM Provider Routing / Semantic Normalization Decision.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const path = (rel) => resolve(repoRoot, rel);
const read = (rel) => readFileSync(path(rel), "utf8");
const norm = (rel) => read(rel).replace(/[`*]/g, "").replace(/\s+/g, " ").toLowerCase();

const DOC = "docs/strategy/rekon-llm-provider-routing-semantic-normalization-decision.md";
const PACKET = ".rekon-dev/review-packets/rekon-llm-provider-routing-semantic-normalization-decision.md";
const CHANGELOG = "CHANGELOG.md";

test("1. decision doc exists", () => {
  assert.ok(existsSync(path(DOC)));
});
test("2. selects Option B — shared provider router with task-specific routes and injected adapters", () => {
  assert.ok(norm(DOC).includes("option b — a shared provider router with task-specific routes and injected adapters"));
});
test("3. forbids direct LLM calls inside IntentPlanActionabilityReport logic", () => {
  assert.ok(norm(DOC).includes("direct llm calls do not go inside intentplanactionabilityreport logic"));
});
test("4. model may read / transform / critique text", () => {
  assert.ok(norm(DOC).includes("may read / transform / critique text"));
});
test("5. providers may not approve / run Circe", () => {
  const n = norm(DOC);
  assert.ok(n.includes("may not approve plans"));
  assert.ok(n.includes("may not run circe"));
  assert.ok(n.includes("may not implement intent:go"));
});
test("6. LLM output is proposal, not proof", () => {
  assert.ok(norm(DOC).includes("llm output is proposal, not proof"));
});
test("7. output must be schema-validated and deterministically re-checked", () => {
  assert.ok(norm(DOC).includes("schema-validated and deterministically re-checked"));
});
test("8. completion and embedding providers are separate", () => {
  assert.ok(norm(DOC).includes("completion providers and embedding providers are separate"));
});
test("9. minimum task routes are named", () => {
  const n = norm(DOC);
  for (const route of ["plan.semantic-normalize", "plan.answer-merge", "plan.critique", "plan.revision-prompt", "artifact.summary", "intent.classify"]) {
    assert.ok(n.includes(route), `missing route ${route}`);
  }
});
test("10. routing priority is CLI flags → repo config → environment defaults → built-in disabled/fallback", () => {
  assert.ok(norm(DOC).includes("cli flags → repo config → environment defaults → built-in disabled/fallback"));
});
test("11. secrets never live in repo config", () => {
  assert.ok(norm(DOC).includes("secrets never live in repo config"));
});
test("12. CLI controls add --llm-provider / --llm-model beside --semantic off|auto|required", () => {
  const n = norm(DOC);
  assert.ok(n.includes("--llm-provider"));
  assert.ok(n.includes("--llm-model"));
  assert.ok(n.includes("--semantic off|auto|required"));
});
test("13. provenance recorded via semantic-llm and deterministic-fallback", () => {
  const n = norm(DOC);
  assert.ok(n.includes("semantic-llm"));
  assert.ok(n.includes("deterministic-fallback"));
});
test("14. package placement: packages/llm-provider new, capability-model stays pure", () => {
  const n = norm(DOC);
  assert.ok(n.includes("packages/llm-provider"));
  assert.ok(n.includes("no environment reads, no network calls"));
});
test("15. the existing injectable adapter seam is preserved, not replaced", () => {
  assert.ok(norm(DOC).includes("the injectable seam already exists and is preserved, not replaced"));
});
test("16. recommends Provider Routing Implementation; packet exists; CHANGELOG names the decision", () => {
  assert.ok(norm(DOC).includes("rekon llm provider routing implementation"));
  assert.ok(existsSync(path(PACKET)));
  assert.ok(read(CHANGELOG).includes("Rekon LLM Provider Routing / Semantic Normalization Decision"));
});

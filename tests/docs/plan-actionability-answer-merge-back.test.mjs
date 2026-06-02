// Documentation coverage for Plan Actionability Answer / Merge-Back (slice 134).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (rel) => read(rel).replace(/[`*]/g, "").replace(/\s+/g, " ").toLowerCase();

const IMPL = "docs/strategy/plan-actionability-answer-merge-back-implementation.md";
const DECISION = "docs/strategy/plan-actionability-answer-merge-back-decision.md";
const CONCEPT = "docs/concepts/intent-plan-compiler.md";
const PACKET = ".rekon-dev/review-packets/plan-actionability-answer-merge-back-v1.md";
const CHANGELOG = "CHANGELOG.md";
const README = "README.md";

test("implementation memo names the command", () => {
  assert.ok(norm(IMPL).includes("rekon intent plan answer"));
});

test("implementation memo describes deterministic merge-back", () => {
  const t = norm(IMPL);
  assert.ok(t.includes("deterministic"));
  assert.ok(t.includes("merge-back") || t.includes("merge back"));
});

test("implementation memo states one new report revision", () => {
  assert.ok(norm(IMPL).includes("exactly one") && norm(IMPL).includes("intentplanactionabilityreport revision".replace(/ /g, " ")));
});

test("implementation memo states source report is not mutated", () => {
  assert.ok(norm(IMPL).includes("does not mutate the source report"));
});

test("implementation memo states the source plan file is not edited", () => {
  assert.ok(norm(IMPL).includes("does not edit the source plan file"));
});

test("implementation memo documents the answerTrace field", () => {
  assert.ok(norm(IMPL).includes("answertrace"));
});

test("implementation memo lists the blocker categories", () => {
  const t = norm(IMPL);
  for (const cat of ["unknown-question", "empty-answer", "duplicate-answer", "no-applicable-phase", "invalid-answer-shape", "missing-report"]) {
    assert.ok(t.includes(cat), `missing ${cat}`);
  }
});

test("implementation memo documents the canonical answer flow", () => {
  assert.ok(norm(IMPL).includes("intent plan review → intent plan answer → intent prepare".toLowerCase()));
});

test("implementation memo keeps the downstream artifact boundary", () => {
  const t = norm(IMPL);
  assert.ok(t.includes("creates no preparedintentplan") || t.includes("no preparedintentplan"));
  assert.ok(t.includes("workorder"));
  assert.ok(t.includes("verificationplan"));
});

test("implementation memo keeps the Circe / intent:go boundary", () => {
  const t = norm(IMPL);
  assert.ok(t.includes("circe"));
  assert.ok(t.includes("intent:go"));
});

test("implementation memo states the merge is not LLM-only", () => {
  assert.ok(norm(IMPL).includes("never performs an llm-only merge-back") || norm(IMPL).includes("llm-only"));
});

test("decision memo cross-references the implementation", () => {
  assert.ok(norm(DECISION).includes("plan-actionability-answer-merge-back-implementation"));
});

test("intent-plan-compiler concept doc mentions the answer command", () => {
  assert.ok(norm(CONCEPT).includes("rekon intent plan answer"));
});

test("review packet carries the boundary model section", () => {
  const t = norm(PACKET);
  assert.ok(t.includes("boundary model"));
  assert.ok(t.includes("answer trace model"));
});

test("CHANGELOG and README record the implementation", () => {
  assert.ok(norm(CHANGELOG).includes("plan actionability answer / merge-back implementation"));
  assert.ok(norm(README).includes("intent plan answer"));
});

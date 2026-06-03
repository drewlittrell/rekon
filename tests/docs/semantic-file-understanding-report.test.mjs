// Documentation coverage for Semantic File Understanding v1 (slice 144). Pins the
// concept doc's boundary statements, the artifact + concept docs' existence, the
// CHANGELOG entry, and the review packet's PURPOSE PRESERVATION CHECK.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const ARTIFACT_DOC = "docs/artifacts/semantic-file-understanding-report.md";
const CONCEPT_DOC = "docs/concepts/semantic-file-understanding.md";
const PACKET = ".rekon-dev/review-packets/semantic-file-understanding-v1.md";
const concept = norm(read(CONCEPT_DOC));
const changelog = read("CHANGELOG.md");

test("1. artifact doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, ARTIFACT_DOC)));
});

test("2. concept doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, CONCEPT_DOC)));
});

test("3. docs say semantic file understanding is proposal/context, not proof", () => {
  assert.ok(concept.includes("semantic file understanding is proposal/context, not proof"));
});

test("4. docs say provider output is schema-validated and deterministically rechecked", () => {
  assert.ok(concept.includes("provider output is schema-validated and deterministically rechecked"));
});

test("5. docs say semantic file understanding executes no commands", () => {
  assert.ok(concept.includes("semantic file understanding executes no commands"));
});

test("6. docs say semantic file understanding writes no source files", () => {
  assert.ok(concept.includes("semantic file understanding writes no source files"));
});

test("7. docs say semantic file understanding generates no embeddings", () => {
  assert.ok(concept.includes("semantic file understanding generates no embeddings"));
});

test("8. docs say semantic file understanding creates no PreparedIntentPlan", () => {
  assert.ok(concept.includes("semantic file understanding creates no preparedintentplan"));
});

test("9. docs say semantic file understanding creates no WorkOrder or VerificationPlan", () => {
  assert.ok(concept.includes("semantic file understanding creates no workorder or verificationplan"));
});

test("10. docs say intent:go remains deferred", () => {
  assert.ok(concept.includes("intent:go remains deferred"));
});

test("11. CHANGELOG mentions Semantic File Understanding v1", () => {
  assert.match(changelog, /Semantic File Understanding v1/);
});

test("12. review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(resolve(repoRoot, PACKET)));
  assert.match(read(PACKET), /PURPOSE PRESERVATION CHECK/);
});

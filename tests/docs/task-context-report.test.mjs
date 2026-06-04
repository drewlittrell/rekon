// Docs tests for TaskContextReport v1 (slice 166). Pins the artifact + concept +
// strategy docs' verbatim boundary statements, the CHANGELOG mention, and the
// review packet's PURPOSE PRESERVATION CHECK — so task-shaped context stays
// proposal/context, not proof, with deterministic facts outranking similarity.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const ARTIFACT_DOC = resolve(repoRoot, "docs/artifacts/task-context-report.md");
const CONCEPT_DOC = resolve(repoRoot, "docs/concepts/task-shaped-context.md");
const STRATEGY_DOC = resolve(repoRoot, "docs/strategy/task-context-report-v1.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/task-context-report-v1.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

const norm = (text) =>
  text
    .replace(/^>\s?/gm, "")
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ");

function read(path) {
  return existsSync(path) ? norm(readFileSync(path, "utf8")) : "";
}

const docsCorpus = [ARTIFACT_DOC, CONCEPT_DOC, STRATEGY_DOC].map(read).join("\n");
const packet = read(REVIEW_PACKET);
const changelog = read(CHANGELOG);

const STATEMENTS = [
  "task-shaped context is proposal/context, not proof.",
  "embedding retrieval is proposal/context, not proof.",
  "CapabilityEvidenceGraph remains the evidence substrate.",
  "deterministic graph facts outrank embedding similarity.",
  "task context must not approve plans.",
  "task context must not execute commands.",
  "task context must not write source files.",
  "task context must not create WorkOrder or VerificationPlan.",
  "task context must not run Circe.",
  "task context must preserve evidence refs.",
  "verification hints are hints, not executed commands.",
  "duplicate detection remains deferred.",
  "canonical recommendations remain deferred.",
  "intent:go remains deferred.",
];

// 1
test("artifact doc exists", () => {
  assert.ok(existsSync(ARTIFACT_DOC), "expected docs/artifacts/task-context-report.md");
});

// 2
test("concept doc exists", () => {
  assert.ok(existsSync(CONCEPT_DOC), "expected docs/concepts/task-shaped-context.md");
});

// 3-16
for (const statement of STATEMENTS) {
  test(`docs say verbatim: ${statement}`, () => {
    assert.ok(docsCorpus.includes(norm(statement)), `docs missing verbatim statement: "${statement}"`);
  });
}

// 17
test("CHANGELOG mentions TaskContextReport v1", () => {
  assert.ok(changelog.includes(norm("TaskContextReport v1")));
});

// 18
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet should exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")));
});

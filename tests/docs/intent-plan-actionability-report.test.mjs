// Docs tests for IntentPlanActionabilityReport v1 (Intent Plan Actionability /
// Compiler, slice 129). Product-capability batch: registers + implements the
// plan-review artifact and the `rekon intent plan review` CLI command.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

function read(rel) {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

function normalize(text) {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ");
}

const artifactDoc = "docs/artifacts/intent-plan-actionability-report.md";
const conceptDoc = "docs/concepts/intent-plan-compiler.md";
const strategyDoc = "docs/strategy/intent-plan-actionability-report-implementation.md";
const reviewPacket = ".rekon-dev/review-packets/intent-plan-actionability-report-v1.md";

const corpus = () =>
  `${normalize(read(artifactDoc))}\n${normalize(read(conceptDoc))}\n${normalize(read(strategyDoc))}`;

// ---------- 1 ----------
test("artifact doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, artifactDoc)));
  assert.match(read(artifactDoc), /#\s*IntentPlanActionabilityReport/);
});

// ---------- 2 ----------
test("concept doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, conceptDoc)));
  assert.match(read(conceptDoc), /#\s*Intent Plan Compiler/);
});

// ---------- 3 ----------
test("implementation strategy doc exists", () => {
  assert.ok(existsSync(resolve(repoRoot, strategyDoc)));
  assert.match(read(strategyDoc), /Intent Plan Actionability Report/);
});

// ---------- 4 ----------
test("review packet exists", () => {
  assert.ok(existsSync(resolve(repoRoot, reviewPacket)));
});

// ---------- 5 ----------
test("docs say the report is a review, not an approval", () => {
  assert.match(normalize(read(artifactDoc)), /review, not an approval/i);
});

// ---------- 6 ----------
test("docs state the report executes no commands and writes no source", () => {
  const text = corpus();
  assert.match(text, /executes no commands/i);
  assert.match(text, /writes no source/i);
});

// ---------- 7 ----------
test("docs state no PreparedIntentPlan / WorkOrder / VerificationPlan / Circe / intent:go", () => {
  const text = corpus();
  assert.match(text, /creates no PreparedIntentPlan/i);
  assert.match(text, /creates no WorkOrder/i);
  assert.match(text, /runs no Circe/i);
  assert.match(text, /does not implement intent:go/i);
});

// ---------- 8 ----------
test("docs describe the raw-plan → normalization → revision-feedback loop", () => {
  const text = corpus();
  assert.match(text, /normalization/i);
  assert.match(text, /phase decomposition/i);
  assert.match(text, /actionability checks/i);
  assert.match(text, /revision feedback/i);
});

// ---------- 9 ----------
test("docs document the critical ambiguity-clearance requirement", () => {
  const text = corpus();
  assert.match(text, /ambiguity-clearance/i);
  assert.match(text, /TODO/);
  assert.match(text, /blocked/i);
});

// ---------- 10 ----------
test("docs document deterministic-first parsing that never invents paths", () => {
  const text = corpus();
  assert.match(text, /deterministic-first/i);
  assert.match(text, /never invent/i);
});

// ---------- 11 ----------
test("docs document the bounded, provenance-tagged semantic adapter + fallback", () => {
  const text = corpus();
  assert.match(text, /semantic normalization/i);
  assert.match(text, /provenance-tagged/i);
  assert.match(text, /deterministic-fallback/i);
});

// ---------- 12 ----------
test("docs document the CLI command + the deferred answer/merge-back", () => {
  const text = corpus();
  assert.match(text, /rekon intent plan review --plan/);
  assert.match(text, /merge[- ]back/i);
});

// Docs tests for the Capability Evidence Graph Safety Review
// (capability-evidence-graph-safety-review).
//
// Pins the safety-review memo's required headings, the 20 verbatim
// boundary/posture statements, and the four required tables, plus the
// CHANGELOG mention and the review packet's PURPOSE PRESERVATION CHECK.
// Strategy-only batch: no runtime/source change is asserted here.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(repoRoot, "docs/strategy/capability-evidence-graph-safety-review.md");
const REVIEW_PACKET = resolve(repoRoot, ".rekon-dev/review-packets/capability-evidence-graph-safety-review.md");
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

// Standard normalizer: strip line-leading `>`, lowercase, drop
// backticks/asterisks, collapse whitespace. Keeps #, /, :, |, ,, -, ..
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

const REQUIRED_HEADINGS = [
  "# Capability Evidence Graph Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Implementation Reviewed",
  "## Artifact Model Review",
  "## Claim Model Review",
  "## Builder Review",
  "## CLI Review",
  "## Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];

const REQUIRED_STATEMENTS = [
  "CapabilityEvidenceGraph is evidence-backed context, not proof by itself.",
  "Deterministic facts are the only v1 source.",
  "File nodes and symbol nodes are first-class graph nodes.",
  "Capability nodes are richer than verb:noun.",
  "Capability nodes are heuristic inferences, not facts.",
  "Every claim carries evidence/provenance/confidence.",
  "Confidence values are validated to 0..1.",
  "Summary counts are recomputed by the factory.",
  "Boundaries are forced false by the factory.",
  "The validator rejects non-false boundaries.",
  "CapabilityEvidenceGraph v1 uses no LLM.",
  "CapabilityEvidenceGraph v1 generates no embeddings.",
  "Capability graph build executes no commands.",
  "Capability graph build writes no source files.",
  "Capability graph build creates no PreparedIntentPlan.",
  "Capability graph build creates no WorkOrder.",
  "Capability graph build creates no VerificationPlan.",
  "Capability graph build runs no Circe.",
  "intent:go remains deferred.",
  "Semantic file integration and embeddings remain follow-up work.",
];

// ---------- 1 ----------
test("safety review doc exists", () => {
  assert.ok(existsSync(MEMO), "docs/strategy/capability-evidence-graph-safety-review.md must exist");
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memo.includes(norm(heading)), `missing heading: ${heading}`);
  }
});

// ---------- 3..22 ----------
for (let i = 0; i < REQUIRED_STATEMENTS.length; i += 1) {
  const statement = REQUIRED_STATEMENTS[i];
  test(`doc states (#${i + 3}): ${statement}`, () => {
    assert.ok(memo.includes(norm(statement)), `missing statement: ${statement}`);
  });
}

// ---------- 23 ----------
test("doc includes surface table", () => {
  assert.ok(memo.includes(norm("| Surface | Status | Safety Finding |")), "missing surface table header");
});

// ---------- 24 ----------
test("doc includes claim table", () => {
  assert.ok(memo.includes(norm("| Claim Kind | V1 Source | Confidence Posture |")), "missing claim table header");
});

// ---------- 25 ----------
test("doc includes boundary table", () => {
  assert.ok(memo.includes(norm("| Boundary | Decision |")), "missing boundary table header");
});

// ---------- 26 ----------
test("doc includes option table", () => {
  assert.ok(memo.includes(norm("| Option | Decision | Reason |")), "missing option table header");
});

// ---------- 27 ----------
test("CHANGELOG mentions Capability Evidence Graph Safety Review", () => {
  assert.ok(
    changelog.includes(norm("Capability Evidence Graph Safety Review")),
    "CHANGELOG must mention the Capability Evidence Graph Safety Review",
  );
});

// ---------- 28 ----------
test("review packet exists and contains a PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet must exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")), "review packet needs a PURPOSE PRESERVATION CHECK");
});

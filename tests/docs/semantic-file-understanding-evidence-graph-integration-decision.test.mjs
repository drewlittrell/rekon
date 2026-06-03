// Docs tests for the Semantic File Understanding -> Evidence Graph
// Integration Decision (decision-only batch).
//
// Pins the decision memo's required headings, the 14 verbatim boundary
// statements, and the four required tables, plus the CHANGELOG mention and
// the review packet's PURPOSE PRESERVATION CHECK. No runtime/source change
// is asserted here.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

const MEMO = resolve(repoRoot, "docs/strategy/semantic-file-understanding-evidence-graph-integration-decision.md");
const REVIEW_PACKET = resolve(
  repoRoot,
  ".rekon-dev/review-packets/semantic-file-understanding-evidence-graph-integration-decision.md",
);
const CHANGELOG = resolve(repoRoot, "CHANGELOG.md");

// Standard normalizer: strip line-leading `>`, lowercase, drop
// backticks/asterisks, collapse whitespace. Keeps #, /, :, |, ,, -, ., →.
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
  "# Semantic File Understanding → Evidence Graph Integration Decision",
  "## Decision Summary",
  "## Why This Decision Exists",
  "## Current Surfaces",
  "## Options Considered",
  "## Recommendation",
  "## Mapping Model",
  "## Conflict Model",
  "## Staleness Model",
  "## CLI Surface",
  "## Boundary Model",
  "## What This Does Not Do",
  "## Implementation Sequence",
];

const REQUIRED_STATEMENTS = [
  "CapabilityEvidenceGraph remains deterministic by default.",
  "SemanticFileUnderstandingReport contributes inference claims, not fact claims.",
  "Semantic report evidence is proposal/context, not proof.",
  "Deterministic facts win over semantic claims.",
  "Semantic claims must preserve provider/model/provenance.",
  "Unsupported semantic claims become needs-review or conflicted claims.",
  "Stale semantic reports must not be consumed silently.",
  "Semantic report integration must not approve plans.",
  "Semantic report integration must not execute commands.",
  "Semantic report integration must not write source files.",
  "Semantic report integration must not create WorkOrder or VerificationPlan.",
  "Semantic report integration must not run Circe.",
  "Embeddings remain deferred to a separate track.",
  "intent:go remains deferred.",
];

// ---------- 1 ----------
test("decision memo exists", () => {
  assert.ok(existsSync(MEMO), "decision memo must exist");
});

// ---------- 2 ----------
test("doc contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memo.includes(norm(heading)), `missing heading: ${heading}`);
  }
});

// ---------- 3..16 ----------
for (let i = 0; i < REQUIRED_STATEMENTS.length; i += 1) {
  const statement = REQUIRED_STATEMENTS[i];
  test(`doc states (#${i + 3}): ${statement}`, () => {
    assert.ok(memo.includes(norm(statement)), `missing statement: ${statement}`);
  });
}

// ---------- 17 ----------
test("doc includes option table", () => {
  assert.ok(memo.includes(norm("| Option | Decision | Reason |")), "missing option table header");
});

// ---------- 18 ----------
test("doc includes mapping table", () => {
  assert.ok(memo.includes(norm("| Semantic Report Field | Graph Mapping |")), "missing mapping table header");
});

// ---------- 19 ----------
test("doc includes boundary table", () => {
  assert.ok(memo.includes(norm("| Boundary | Decision |")), "missing boundary table header");
});

// ---------- 20 ----------
test("doc includes status table", () => {
  assert.ok(
    memo.includes(norm("| Semantic Claim Condition | Graph Claim Status |")),
    "missing status table header",
  );
});

// ---------- 21 ----------
test("CHANGELOG mentions the Semantic File Understanding → Evidence Graph Integration Decision", () => {
  assert.ok(
    changelog.includes(norm("Semantic File Understanding → Evidence Graph Integration Decision")),
    "CHANGELOG must mention the decision",
  );
});

// ---------- 22 ----------
test("review packet exists and contains a PURPOSE PRESERVATION CHECK", () => {
  assert.ok(existsSync(REVIEW_PACKET), "review packet must exist");
  assert.ok(packet.includes(norm("PURPOSE PRESERVATION CHECK")), "review packet needs a PURPOSE PRESERVATION CHECK");
});

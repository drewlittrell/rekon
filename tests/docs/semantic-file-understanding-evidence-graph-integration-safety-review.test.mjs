// Docs tests for the Semantic File Understanding -> Evidence Graph Integration
// Safety Review (slice 157). Pins the memo headings, the 16 boundary statements,
// the four required tables, the CHANGELOG entry, and the review packet's purpose
// preservation check, so the reviewed safety posture can never silently drift.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) =>
  text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const memoPath = "docs/strategy/semantic-file-understanding-evidence-graph-integration-safety-review.md";
const reviewPacketPath = ".rekon-dev/review-packets/semantic-file-understanding-evidence-graph-integration-safety-review.md";
const memo = read(memoPath);
const memoNorm = norm(memo);
const reviewPacket = read(reviewPacketPath);
const changelog = read("CHANGELOG.md");

// 1. memo exists (read above would throw otherwise).
test("safety review doc exists", () => {
  assert.ok(memo.length > 0);
});

// 2. all required headings.
const REQUIRED_HEADINGS = [
  "# Semantic File Understanding → Evidence Graph Integration Safety Review",
  "## Decision Summary",
  "## Why This Review Exists",
  "## Implementation Reviewed",
  "## Evidence Mapping Review",
  "## Claim Mapping Review",
  "## Conflict Model Review",
  "## Stale Report Review",
  "## CLI Review",
  "## Boundary Review",
  "## Options Considered",
  "## Recommendation",
  "## What This Does Not Do",
  "## Follow-Up Work",
];
test("doc contains all required headings", () => {
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(memo.includes(heading), `missing heading: ${heading}`);
  }
});

// 3-18. the 16 boundary statements.
const STATEMENTS = [
  "CapabilityEvidenceGraph remains deterministic by default.",
  "SemanticFileUnderstandingReport contributes inference claims, not fact claims.",
  "Semantic report evidence is proposal/context, not proof.",
  "Deterministic facts win over semantic claims.",
  "Semantic claims preserve provider/model/provenance through evidence and claim text where the current graph shape allows.",
  "Unsupported semantic claims become needs-review or conflicted claims.",
  "Stale semantic reports are not consumed silently.",
  "Graph build itself calls no LLM providers.",
  "CapabilityEvidenceGraph.usedLlm remains false because the graph builder reads stored reports rather than calling providers.",
  "Semantic report integration does not approve plans.",
  "Semantic report integration executes no commands.",
  "Semantic report integration writes no source files.",
  "Semantic report integration creates no WorkOrder or VerificationPlan.",
  "Semantic report integration runs no Circe.",
  "Embeddings remain deferred to a separate track.",
  "intent:go remains deferred.",
];
for (const statement of STATEMENTS) {
  test(`doc says: ${statement}`, () => {
    assert.ok(memoNorm.includes(norm(statement)), `memo missing statement: ${statement}`);
  });
}

// 19-22. the four required tables.
test("doc includes surface table", () => {
  assert.match(memo, /\| Surface \| Status \| Safety Finding \|/);
});
test("doc includes mapping table", () => {
  assert.match(memo, /\| Semantic Report Field \| Review Finding \|/);
});
test("doc includes boundary table", () => {
  assert.match(memo, /\| Boundary \| Decision \|/);
});
test("doc includes option table", () => {
  assert.match(memo, /\| Option \| Decision \| Reason \|/);
});

// 23. CHANGELOG.
test("CHANGELOG mentions the Semantic File Understanding -> Evidence Graph Integration Safety Review", () => {
  assert.match(
    changelog,
    /Semantic File Understanding\s*(?:→|->|-&gt;)\s*Evidence Graph Integration Safety Review/,
    "CHANGELOG missing the safety-review entry",
  );
});

// 24. review packet.
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(reviewPacket, /PURPOSE PRESERVATION CHECK/);
});

// Docs tests for the Semantic File Understanding -> Evidence Graph Integration
// Implementation (slice 156). Pins the 14 boundary statements in the
// implementation memo, the CHANGELOG entry, and the review packet's purpose
// preservation check, so the shipped boundaries can never silently drift.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) =>
  text.replace(/^>\s?/gm, "").toLowerCase().replace(/[`*]/g, "").replace(/\s+/g, " ");

const memo = read("docs/strategy/semantic-file-understanding-evidence-graph-integration-implementation.md");
const reviewPacket = read(".rekon-dev/review-packets/semantic-file-understanding-evidence-graph-integration-v1.md");
const changelog = read("CHANGELOG.md");

const memoNorm = norm(memo);

const BOUNDARY_STATEMENTS = [
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

for (const statement of BOUNDARY_STATEMENTS) {
  test(`implementation memo pins boundary: ${statement}`, () => {
    assert.ok(memoNorm.includes(norm(statement)), `memo missing boundary statement: ${statement}`);
  });
}

test("CHANGELOG records the Semantic File Understanding -> Evidence Graph Integration Implementation", () => {
  assert.match(
    changelog,
    /Semantic File Understanding\s*(?:→|->|-&gt;)\s*Evidence Graph Integration Implementation/,
    "CHANGELOG missing the implementation entry",
  );
});

test("review packet includes a PURPOSE PRESERVATION CHECK section", () => {
  assert.match(reviewPacket, /PURPOSE PRESERVATION CHECK/, "review packet missing PURPOSE PRESERVATION CHECK");
});

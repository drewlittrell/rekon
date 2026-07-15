import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGapJudgmentSummary,
  renderGapJudgmentSummary,
  selectGapReviewCandidates,
  validateGapJudgments,
} from "./gap-judge-core.mjs";

const ruleMap = {
  architecture: {
    status: "redesigned",
    citation: "docs/strategy/detection-quality.md#declared-architecture",
    rekonRuleId: "grammar.divergence",
  },
  tech_debt: {
    status: "redesigned",
    citation: "docs/strategy/detection-quality.md#debt-and-semantic-judgment",
    rekonRuleId: "debt.semantic",
  },
};

const issue = (id, type, severity = "medium") => ({
  id,
  type,
  severity,
  files: [`src/${id}.ts`],
  description: `Specific ${type} claim for ${id}.`,
  details: {},
});

const report = {
  generatedAt: "2026-07-13T00:00:00.000Z",
  repos: [
    {
      id: "one",
      rows: [
        { classicId: "a-high", ruleId: "architecture", fireCount: 2, classification: "missed-redesigned", citation: ruleMap.architecture.citation },
        { classicId: "a-low", ruleId: "architecture", fireCount: 1, classification: "missed-redesigned", citation: ruleMap.architecture.citation },
        { classicId: "matched", ruleId: "architecture", fireCount: 1, classification: "matched" },
        { classicId: "debt-one", ruleId: "tech_debt", fireCount: 1, classification: "missed-redesigned", citation: ruleMap.tech_debt.citation },
      ],
    },
    {
      id: "two",
      rows: [
        { classicId: "a-two", ruleId: "architecture", fireCount: 1, classification: "missed-redesigned", citation: ruleMap.architecture.citation },
        { classicId: "debt-two", ruleId: "tech_debt", fireCount: 1, classification: "missed-redesigned", citation: ruleMap.tech_debt.citation },
      ],
    },
  ],
};

const issuesByRepo = {
  one: [issue("a-high", "architecture", "high"), issue("a-low", "architecture", "low"), issue("matched", "architecture"), issue("debt-one", "tech_debt")],
  two: [issue("a-two", "architecture", "medium"), issue("debt-two", "tech_debt")],
};

test("gap review samples deterministically across repositories and ignores matched rows", () => {
  const first = selectGapReviewCandidates({ report, issuesByRepo, ruleMap, perRule: 2 });
  const second = selectGapReviewCandidates({ report, issuesByRepo, ruleMap, perRule: 2 });

  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.deepEqual(
    new Set(first.filter((record) => record.classic.ruleId === "architecture").map((record) => record.repoId)),
    new Set(["one", "two"]),
  );
  assert.equal(first.some((record) => record.classic.id === "matched"), false);
});

test("gap review rejects missing source issue bodies", () => {
  assert.throws(
    () => selectGapReviewCandidates({ report, issuesByRepo: { ...issuesByRepo, two: [] }, ruleMap, perRule: 2 }),
    /could not find classic issue two:a-two/,
  );
});

test("gap judgments enforce evidence-backed verdict and action pairs", () => {
  const packet = {
    generatedAt: "2026-07-13T00:00:00.000Z",
    records: selectGapReviewCandidates({ report, issuesByRepo, ruleMap, perRule: 1 }),
  };
  const reviewId = packet.records[0].reviewId;

  assert.throws(
    () => validateGapJudgments({
      schemaVersion: "1.0.0",
      records: [{
        reviewId,
        verdict: "classic-noise",
        action: "emitter-gap",
        confidence: 0.9,
        rationale: "This pairing is deliberately invalid.",
        sourceRefs: ["src/a.ts:1"],
      }],
    }, packet),
    /cannot pair verdict classic-noise with action emitter-gap/,
  );
  assert.throws(
    () => validateGapJudgments({
      schemaVersion: "1.0.0",
      records: [{
        reviewId: "unknown",
        verdict: "classic-noise",
        action: "no-change",
        confidence: 0.9,
        rationale: "The source disproves the historical claim.",
        sourceRefs: ["src/a.ts:1"],
      }],
    }, packet),
    /unknown reviewId/,
  );
});

test("gap judgment summary keeps engineering actions separate from verdicts", () => {
  const packet = {
    generatedAt: "2026-07-13T00:00:00.000Z",
    records: selectGapReviewCandidates({ report, issuesByRepo, ruleMap, perRule: 1 }),
  };
  const judgments = {
    schemaVersion: "1.0.0",
    records: [
      {
        reviewId: packet.records[0].reviewId,
        verdict: "valid-missed-signal",
        action: "evidence-gap",
        confidence: 0.9,
        rationale: "The cited source proves the claim, but Rekon lacks the declaration evidence needed to emit it.",
        sourceRefs: [packet.records[0].classic.files[0]],
      },
      {
        reviewId: packet.records[1].reviewId,
        verdict: "classic-noise",
        action: "no-change",
        confidence: 0.95,
        rationale: "The source shows an intentional framework convention rather than an actionable defect.",
        sourceRefs: [packet.records[1].classic.files[0]],
      },
    ],
  };
  const summary = buildGapJudgmentSummary(packet, judgments);

  assert.equal(summary.sampled, 2);
  assert.equal(summary.adjudicated, 2);
  assert.deepEqual(summary.actions, { "evidence-gap": 1, "no-change": 1 });
  assert.deepEqual(summary.verdicts, { "classic-noise": 1, "valid-missed-signal": 1 });
  assert.match(renderGapJudgmentSummary(summary), /evidence-gap=1/);
});

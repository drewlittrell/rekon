import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAssessmentJudgmentEvalCases,
  sourceChangeAnchor,
  summarizeAssessmentJudgmentRuns,
} from "./assessment-judgment-eval-core.mjs";

const catalog = {
  version: "1.0.0",
  repositories: [
    { id: "vitest", url: "https://github.com/vitest-dev/vitest.git" },
    { id: "example", url: "https://github.com/example/example.git" },
  ],
  pairs: [
    {
      id: "vitest-typecheck-worker-off",
      repository: "vitest",
      buggyCommit: "buggy-a",
      fixedCommit: "fixed-a",
      upstream: { summary: "A teardown method registered another listener." },
      claim: { category: "listener-lifecycle", proof: "upstream-reproduction", summary: "Teardown added a listener." },
      affectedPaths: ["src/worker.ts"],
    },
    {
      id: "example-gap",
      repository: "example",
      buggyCommit: "buggy-b",
      fixedCommit: "fixed-b",
      upstream: { summary: "An option was dropped." },
      claim: { category: "option-propagation", proof: "upstream-test", summary: "A required option was lost." },
      affectedPaths: ["src/options.ts"],
    },
  ],
};
const adjudications = {
  schemaVersion: "1.0.0",
  records: [
    { pairId: "vitest-typecheck-worker-off", claimVerdict: "valid", coverage: "captured" },
    { pairId: "example-gap", claimVerdict: "valid", coverage: "unrelated-signal" },
  ],
};

test("builds paired buggy/fixed cases while preserving emitter-gap identity", () => {
  const cases = buildAssessmentJudgmentEvalCases(catalog, adjudications);
  assert.equal(cases.length, 4);
  assert.deepEqual(cases.map((entry) => entry.expectedDisposition), ["retain", "reject", "retain", "reject"]);
  assert.equal(cases[0].assessment.ruleId, "events.inverseListenerDelegation");
  assert.equal(cases[2].assessment.ruleId, "semantic.problemCandidate");
  assert.equal(cases[2].emitterCoverage, "emitter-gap");
  assert.throws(
    () => buildAssessmentJudgmentEvalCases(catalog, adjudications, ["missing"]),
    /Unknown defect-pair ids/,
  );
});

test("summarizes safe deferrals, unsafe decisions, token cost, and missing emitter classes", () => {
  const configs = [{ id: "model-a", provider: "mock", model: "model-a" }];
  const base = {
    modelConfigId: "model-a",
    status: "ok",
    usage: { inputTokens: 100, outputTokens: 20 },
    latencyMs: 10,
    currentCostUsd: 0.01,
    steadyStateCostUsd: 0.02,
  };
  const runs = [
    { ...base, caseId: "a:buggy", revision: "buggy", candidateClass: "listener-lifecycle", emitterCoverage: "detector-backed", verdict: "confirmed" },
    { ...base, caseId: "a:fixed", revision: "fixed", candidateClass: "listener-lifecycle", emitterCoverage: "detector-backed", verdict: "rejected" },
    { ...base, caseId: "b:buggy", revision: "buggy", candidateClass: "option-propagation", emitterCoverage: "emitter-gap", verdict: "verification_required" },
    { ...base, caseId: "b:fixed", revision: "fixed", candidateClass: "option-propagation", emitterCoverage: "emitter-gap", verdict: "confirmed" },
  ];

  const result = summarizeAssessmentJudgmentRuns(runs, configs);
  const summary = result.summaries[0];
  assert.equal(summary.expectationAccuracy, 0.75);
  assert.equal(summary.decisiveAccuracy, 0.6667);
  assert.equal(summary.unsafeDecisionRate, 0.25);
  assert.equal(summary.buggy.confirmationRate, 0.5);
  assert.equal(summary.buggy.safeDeferralRate, 0.5);
  assert.equal(summary.fixed.rejectionRate, 0.5);
  assert.equal(summary.fixed.incorrectConfirmationRate, 0.5);
  assert.equal(summary.usage.inputTokens, 400);
  assert.equal(summary.currentCostUsd, 0.04);
  assert.deepEqual(result.emitterCoverage.emitterGapClasses, ["option-propagation"]);
});

test("locates the first changed source line without retaining a diff", () => {
  assert.equal(sourceChangeAnchor("a\nbuggy\nc", "a\nfixed\nc"), 2);
  assert.equal(sourceChangeAnchor("a\nb", "a\nb"), undefined);
  assert.equal(sourceChangeAnchor("a", "a\nadded"), 1);
});

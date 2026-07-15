import assert from "node:assert/strict";
import test from "node:test";

import {
  identityHistoryKey,
  selectManifestRepositoriesForReport,
  selectQualityReviewCandidates,
} from "./quality-review-core.mjs";

function record(id, ruleId, impact = "medium") {
  return { id, ruleId, impact };
}

test("quality review samples each output class independently per rule", () => {
  const selected = selectQualityReviewCandidates({
    perRule: 2,
    repos: [{
      id: "repo-a",
      findings: [record("finding-a", "mixed.rule"), record("finding-b", "mixed.rule")],
      assessments: [record("assessment-a", "mixed.rule"), record("assessment-b", "mixed.rule")],
    }],
  });

  assert.deepEqual(
    selected.map((entry) => `${entry.recordType}:${entry.record.id}`),
    ["assessment:assessment-a", "assessment:assessment-b", "finding:finding-a", "finding:finding-b"],
  );
});

test("quality review is deterministic and round-robins across repositories", () => {
  const input = {
    perRule: 3,
    repos: [
      { id: "repo-b", findings: [record("b-high", "rule", "high"), record("b-low", "rule", "low")] },
      { id: "repo-a", findings: [record("a-medium", "rule"), record("a-low", "rule", "low")] },
    ],
  };

  const selected = selectQualityReviewCandidates(input);
  assert.deepEqual(selected.map((entry) => entry.record.id), ["a-medium", "b-high", "a-low"]);
  assert.deepEqual(
    selected.map((entry) => entry.record.id),
    selectQualityReviewCandidates(input).map((entry) => entry.record.id),
  );
});

test("quality review rejects an invalid sample size", () => {
  assert.throws(
    () => selectQualityReviewCandidates({ repos: [], perRule: 0 }),
    /positive integer/,
  );
});

test("identity history scopes contract migrations without discarding legacy history", () => {
  const base = { rootCauseKey: "architecture:src/handler.ts:line:14" };
  assert.equal(identityHistoryKey(base), "architecture:src/handler.ts:line:14\0legacy");
  assert.equal(
    identityHistoryKey({ ...base, details: { identityVersion: "semantic-claim-v2" } }),
    "architecture:src/handler.ts:line:14\0semantic-claim-v2",
  );
});

test("quality review scopes the corpus manifest to repositories in the selected report", () => {
  const selected = selectManifestRepositoriesForReport(
    [{ id: "private" }, { id: "public-a" }, { id: "public-b" }],
    [{ id: "public-b" }, { id: "public-a" }],
  );
  assert.deepEqual(selected.map((entry) => entry.id), ["public-a", "public-b"]);
  assert.throws(
    () => selectManifestRepositoriesForReport([{ id: "public-a" }], [{ id: "missing" }]),
    /missing from the corpus manifest: missing/,
  );
});

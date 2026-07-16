import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

import {
  applyDefectPairAdjudications,
  buildDefectPairSummary,
  compareDefectPairEmissions,
  validateDefectPairAdjudications,
  validateDefectPairCatalog,
} from "./defect-pair-core.mjs";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const catalog = JSON.parse(readFileSync(join(repoRoot, "tests/bench/public-defect-pairs.sources.json"), "utf8"));

function pair(overrides = {}) {
  return {
    id: "example-fix",
    repository: "example",
    affectedPaths: ["src/example.ts"],
    claim: { category: "example", proof: "upstream-regression-test", summary: "Example defect." },
    ...overrides,
  };
}

function assessment(overrides = {}) {
  return {
    id: "assessment-1",
    ruleId: "typescript.errorSuppression",
    type: "error_suppression",
    kind: "risk",
    files: ["src/example.ts"],
    ...overrides,
  };
}

function finding(overrides = {}) {
  return {
    id: "finding-1",
    ruleId: "repository.checkFailure",
    type: "repository_check_failure",
    files: ["src/example.ts"],
    ...overrides,
  };
}

test("public defect-pair catalog pins eighteen authoritative before/after cases", () => {
  assert.equal(validateDefectPairCatalog(catalog), catalog);
  assert.equal(catalog.repositories.length, 14);
  assert.equal(catalog.pairs.length, 18);
  assert.equal(new Set(catalog.pairs.map((entry) => entry.id)).size, 18);
  assert.ok(catalog.pairs.every((entry) => entry.upstream.fixUrl.includes("/pull/")));
  assert.ok(catalog.pairs.every((entry) => entry.affectedPaths.length > 0));
});

test("catalog rejects path traversal and unknown repositories", () => {
  const invalidPath = structuredClone(catalog);
  invalidPath.pairs[0].affectedPaths = ["../outside.ts"];
  assert.throws(() => validateDefectPairCatalog(invalidPath), /repository-relative POSIX paths/);

  const unknownRepo = structuredClone(catalog);
  unknownRepo.pairs[0].repository = "missing";
  assert.throws(() => validateDefectPairCatalog(unknownRepo), /unknown repository/);
});

test("a finding present only before the fix is finding-captured", () => {
  const result = compareDefectPairEmissions({
    pair: pair(),
    beforeFindings: [finding()],
  });
  assert.equal(result.status, "finding-captured");
  assert.equal(result.resolved.length, 1);
});

test("an assessment present only before the fix is assessment-captured", () => {
  const result = compareDefectPairEmissions({
    pair: pair(),
    beforeAssessments: [assessment()],
  });
  assert.equal(result.status, "assessment-captured");
});

test("the same rule and affected path on both revisions is signal-persistent", () => {
  const result = compareDefectPairEmissions({
    pair: pair(),
    beforeAssessments: [assessment({ id: "before" })],
    afterAssessments: [assessment({ id: "after" })],
  });
  assert.equal(result.status, "signal-persistent");
  assert.equal(result.persistent.length, 1);
});

test("an after-only signal is introduced-after", () => {
  const result = compareDefectPairEmissions({
    pair: pair(),
    afterAssessments: [assessment()],
  });
  assert.equal(result.status, "introduced-after");
});

test("unrelated records do not count as defect capture", () => {
  const result = compareDefectPairEmissions({
    pair: pair(),
    beforeAssessments: [assessment({ files: ["src/other.ts"] })],
  });
  assert.equal(result.status, "uncaptured");
  assert.equal(result.before.total, 0);
});

test("summary keeps capture classes separate and requires adjudication", () => {
  const rows = [
    compareDefectPairEmissions({ pair: pair({ id: "finding" }), beforeFindings: [finding()] }),
    compareDefectPairEmissions({ pair: pair({ id: "assessment" }), beforeAssessments: [assessment()] }),
    compareDefectPairEmissions({ pair: pair({ id: "missing" }) }),
  ];
  const summary = buildDefectPairSummary(rows);
  assert.equal(summary.total, 3);
  assert.equal(summary.captured, 2);
  assert.equal(summary.adjudicationRequired, 3);
  assert.equal(summary.byStatus.uncaptured, 1);
});

test("agent adjudication distinguishes unrelated signals from real capture", () => {
  const rows = [compareDefectPairEmissions({ pair: pair() })];
  const adjudications = {
    schemaVersion: "1.0.0",
    records: [{
      pairId: "example-fix",
      claimVerdict: "valid",
      coverage: "unrelated-signal",
      recommendedAction: "emitter-candidate",
      rationale: "The current signal describes a different condition on the same file.",
    }],
  };
  const miniCatalog = {
    version: "1.0.0",
    repositories: [{ id: "example", directory: "example", url: "https://github.com/example/example", license: "MIT" }],
    pairs: [{
      ...pair(),
      buggyCommit: "a".repeat(40),
      fixedCommit: "b".repeat(40),
      upstream: { fixUrl: "https://github.com/example/example/pull/1", summary: "Fix." },
      testPaths: [],
    }],
  };
  validateDefectPairCatalog(miniCatalog);
  validateDefectPairAdjudications(adjudications, miniCatalog);
  const applied = applyDefectPairAdjudications(rows, adjudications);
  const summary = buildDefectPairSummary(applied);
  assert.equal(applied[0].requiresAdjudication, false);
  assert.equal(summary.adjudicated, 1);
  assert.equal(summary.adjudicationRequired, 0);
  assert.equal(summary.byCoverage["unrelated-signal"], 1);
  assert.equal(summary.byRecommendedAction["emitter-candidate"], 1);
});

test("adjudications reject stale pair ids and duplicate judgments", () => {
  assert.throws(
    () => validateDefectPairAdjudications({
      schemaVersion: "1.0.0",
      records: [{
        pairId: "missing",
        claimVerdict: "valid",
        coverage: "not-captured",
        recommendedAction: "evidence-source",
        rationale: "Missing.",
      }],
    }, catalog),
    /unknown pair/,
  );
});

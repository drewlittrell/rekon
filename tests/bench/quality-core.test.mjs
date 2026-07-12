import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQualitySummary,
  buildSanitizedBenchReport,
  validateQualityAdjudications,
  validateQualityThresholds,
} from "./quality-core.mjs";

const ref = { type: "EvidenceGraph", id: "evidence-1", schemaVersion: "1.0.0" };
const thresholds = validateQualityThresholds({
  schemaVersion: "1.0.0",
  defaults: {
    minimumAdjudications: 2,
    minimumEvidenceCompleteness: 1,
    maximumDuplicateRemediationRate: 0,
    minimumIdentityStability: 1,
  },
  rules: {
    "rule.finding": { minimumPrecision: 0.9 },
    "rule.risk": { minimumUsefulness: 0.75 },
  },
}, ["rule.finding", "rule.risk"]);

const repos = [{
  id: "private-repo",
  rekonFindings: [
    { id: "finding-1", ruleId: "rule.finding", evidence: [ref], rootCauseKey: "root-1" },
    { id: "finding-2", ruleId: "rule.finding", evidence: [ref], rootCauseKey: "root-2" },
  ],
  assessments: [
    { id: "risk-1", kind: "risk", ruleId: "rule.risk", evidence: [ref], applicableLaw: { id: "law" }, rootCauseKey: "root-3" },
    { id: "risk-2", kind: "risk", ruleId: "rule.risk", evidence: [ref], applicableLaw: { id: "law" }, rootCauseKey: "root-4" },
  ],
}];

const adjudications = validateQualityAdjudications({
  schemaVersion: "1.0.0",
  records: [
    { repoId: "private-repo", recordType: "finding", recordId: "finding-1", ruleId: "rule.finding", judgment: "valid", severity: "accurate", identityStable: true },
    { repoId: "private-repo", recordType: "finding", recordId: "finding-2", ruleId: "rule.finding", judgment: "valid", severity: "accurate", identityStable: true },
    { repoId: "private-repo", recordType: "assessment", recordId: "risk-1", ruleId: "rule.risk", judgment: "useful", severity: "accurate", identityStable: true },
    { repoId: "private-repo", recordType: "assessment", recordId: "risk-2", ruleId: "rule.risk", judgment: "not_useful", severity: "overstated", identityStable: true },
  ],
});

test("quality summary separates finding precision from assessment usefulness", () => {
  const quality = buildQualitySummary({ repos, adjudications, thresholds });

  assert.equal(quality.findingQuality.precision, 1);
  assert.equal(quality.assessmentUtility.usefulness, 0.5);
  assert.equal(quality.rules["rule.finding"].thresholdStatus, "passed");
  assert.equal(quality.rules["rule.risk"].thresholdStatus, "failed");
  assert.deepEqual(quality.rules["rule.risk"].severityCalibration.byJudgment, { accurate: 1, overstated: 1 });
});

test("quality summary reports insufficient evidence instead of inventing precision", () => {
  const quality = buildQualitySummary({ repos, adjudications: [], thresholds });

  assert.equal(quality.findingQuality.precision, null);
  assert.equal(quality.assessmentUtility.usefulness, null);
  assert.equal(quality.rules["rule.finding"].thresholdStatus, "insufficient-evidence");
  assert.equal(quality.rules["rule.risk"].thresholdStatus, "insufficient-evidence");
});

test("quality adjudications reject unknown records", () => {
  assert.throws(
    () => buildQualitySummary({
      repos,
      thresholds,
      adjudications: [{ repoId: "private-repo", recordType: "finding", recordId: "missing", ruleId: "rule.finding", judgment: "valid" }],
    }),
    /unknown record/,
  );
});

test("sanitized report excludes repository ids, roots, finding ids, and paths", () => {
  const quality = buildQualitySummary({ repos, adjudications, thresholds });
  const report = buildSanitizedBenchReport({
    bench: "parity",
    version: 1,
    generatedAt: "2026-07-11T00:00:00.000Z",
    corpusRoot: "/private/corpus",
    aggregate: { recall: 0.5, creditedWeight: 1, totalWeight: 2, classified: {}, newFindings: 2 },
    repos: [{ id: "private-repo", rows: [{ files: ["private/path.ts"] }] }],
    gapQueue: [{ ruleId: "rule.finding", fireCount: 2, repos: ["private-repo"] }],
    redesignQueue: [],
    deferred: [],
    rejected: [],
    coverage: [],
    precision: [],
    overruled: [{ classicId: "private-id", files: ["private/path.ts"] }],
  }, quality);
  const serialized = JSON.stringify(report);

  assert.equal(report.repositoryCount, 1);
  assert.equal(report.gapQueue.rules, 1);
  assert.equal(report.gapQueue.fireCount, 2);
  for (const privateValue of ["private-repo", "/private/corpus", "private/path.ts", "private-id", "finding-1", "risk-1"]) {
    assert.equal(serialized.includes(privateValue), false, `sanitized report leaked ${privateValue}`);
  }
});

test("threshold validation requires every declared emitter", () => {
  assert.throws(
    () => validateQualityThresholds({ schemaVersion: "1.0.0", defaults: { minimumAdjudications: 1 }, rules: {} }, ["missing.rule"]),
    /missing rule/,
  );
});

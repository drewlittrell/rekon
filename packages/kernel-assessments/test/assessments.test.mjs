import assert from "node:assert/strict";
import test from "node:test";

import {
  createAssessmentReport,
  evaluateFindingPromotion,
  measureDetectionQuality,
  validateAssessmentReport,
} from "../dist/index.js";

const evidence = { type: "EvidenceGraph", id: "evidence-1", schemaVersion: "0.1.0" };
const header = {
  artifactType: "AssessmentReport",
  artifactId: "assessment-report-1",
  schemaVersion: "0.1.0",
  generatedAt: "2026-07-10T00:00:00.000Z",
  subject: { repoId: "fixture" },
  producer: { id: "test", version: "1.0.0" },
  inputRefs: [evidence],
};

test("creates a normalized assessment report", () => {
  const report = createAssessmentReport({
    header,
    assessments: [{
      id: "claim:b",
      kind: "semantic_claim",
      type: "tech_debt",
      impact: "medium",
      title: "Possible debt",
      description: "The provider may be missing error handling.",
      subjects: ["src/b.ts", "src/b.ts"],
      files: ["src/b.ts"],
      evidence: [evidence, evidence],
      rootCauseKey: "tech_debt:src/b.ts:error-handling",
      confidence: { score: 0.62, basis: "semantic", verification: "unverified" },
    }],
  });

  assert.equal(report.summary.total, 1);
  assert.equal(report.summary.byKind.semantic_claim, 1);
  assert.deepEqual(report.assessments[0].subjects, ["src/b.ts"]);
  assert.equal(report.assessments[0].evidence.length, 1);
  assert.equal(validateAssessmentReport(report).ok, true);
});

test("rejects assessments without evidence or root-cause identity", () => {
  const result = validateAssessmentReport({
    header,
    summary: { total: 1, byKind: {}, byImpact: {}, byType: {} },
    assessments: [{
      id: "bad",
      kind: "risk",
      type: "architecture",
      impact: "medium",
      title: "Risk",
      description: "Unverified risk.",
      subjects: ["src/a.ts"],
      evidence: [],
      rootCauseKey: "",
      confidence: { score: 2, basis: "semantic", verification: "unverified" },
    }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path.endsWith(".evidence")));
  assert.ok(result.issues.some((issue) => issue.path.endsWith(".rootCauseKey")));
  assert.ok(result.issues.some((issue) => issue.path.endsWith(".confidence.score")));
});

test("fuses detector outputs by remediation root cause", () => {
  const base = {
    type: "capability_overlap",
    impact: "medium",
    title: "Overlap",
    description: "Two systems implement one capability.",
    subjects: ["capability:x"],
    evidence: [evidence],
    rootCauseKey: "capability_overlap:x",
    confidence: { score: 0.6, basis: "semantic", verification: "unverified" },
  };
  const report = createAssessmentReport({
    header,
    assessments: [
      { ...base, id: "semantic:x", kind: "semantic_claim" },
      {
        ...base,
        id: "structural:x",
        kind: "opportunity",
        confidence: { score: 0.8, basis: "deterministic", verification: "verified" },
      },
    ],
  });

  assert.equal(report.summary.total, 1);
  assert.equal(report.assessments[0].kind, "opportunity");
  assert.equal(report.assessments[0].confidence.basis, "mixed");
  assert.equal(report.assessments[0].supportingSignals.length, 2);
});

test("promotion rules reject raw claims and accept grounded corroboration", () => {
  const claim = {
    id: "claim:x",
    kind: "semantic_claim",
    type: "architecture",
    impact: "high",
    title: "Boundary claim",
    description: "Possible boundary violation.",
    subjects: ["src/x.ts"],
    evidence: [evidence],
    rootCauseKey: "architecture:src/x.ts",
    confidence: { score: 0.7, basis: "semantic", verification: "unverified" },
  };
  assert.equal(evaluateFindingPromotion(claim).eligible, false);
  assert.equal(evaluateFindingPromotion({
    ...claim,
    applicableLaw: { id: "architecture.boundary" },
    confidence: { score: 0.9, basis: "mixed", verification: "corroborated" },
  }).eligible, true);
});

test("quality metrics expose missing evidence and duplicate remediation units", () => {
  const metrics = measureDetectionQuality({
    findings: [
      { id: "finding-a", rootCauseKey: "root:a", evidence: [evidence] },
      { id: "finding-b", rootCauseKey: "root:a", evidence: [] },
    ],
    assessments: [],
  });

  assert.equal(metrics.totalRecords, 2);
  assert.equal(metrics.evidenceCompleteness, 0.5);
  assert.equal(metrics.rootCauseCompleteness, 1);
  assert.equal(metrics.duplicateRemediationCount, 1);
  assert.equal(metrics.duplicateRemediationRate, 0.5);
});

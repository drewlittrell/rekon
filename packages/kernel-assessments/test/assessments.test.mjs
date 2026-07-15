import assert from "node:assert/strict";
import test from "node:test";

import {
  assessmentJudgmentSignature,
  assessmentLifecycleState,
  createAssessmentJudgmentReport,
  createAssessmentReport,
  evaluateFindingPromotion,
  measureDetectionQuality,
  validateAssessmentJudgmentReport,
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
  assert.equal(report.summary.byState.model_proposed, 1);
  assert.equal(report.assessments[0].state, "model_proposed");
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
  assert.equal(report.assessments[0].state, "opportunity_only");
});

test("does not fuse an identical root-cause string across unrelated types or files", () => {
  const base = {
    kind: "risk",
    impact: "medium",
    title: "Risk",
    description: "Observed risk.",
    evidence: [evidence],
    rootCauseKey: "malformed-shared-key",
    confidence: { score: 0.7, basis: "deterministic", verification: "unverified" },
  };
  const report = createAssessmentReport({
    header,
    assessments: [
      { ...base, id: "a", type: "reliability", subjects: ["src/a.ts"], files: ["src/a.ts"] },
      { ...base, id: "b", type: "security", subjects: ["src/a.ts"], files: ["src/a.ts"] },
      { ...base, id: "c", type: "reliability", subjects: ["src/b.ts"], files: ["src/b.ts"] },
    ],
  });
  assert.equal(report.assessments.length, 3);
  assert.equal(report.assessments.every((assessment) => assessment.supportingSignals === undefined), true);
});

test("derives explicit lifecycle states from kind and verification", () => {
  const base = { kind: "risk", confidence: { basis: "deterministic", verification: "unverified" } };
  assert.equal(assessmentLifecycleState(base), "evidence_observed");
  assert.equal(assessmentLifecycleState({ ...base, confidence: { basis: "deterministic", verification: "corroborated" } }), "tool_corroborated");
  assert.equal(assessmentLifecycleState({ ...base, confidence: { basis: "mixed", verification: "independently_confirmed" } }), "independently_confirmed");
  assert.equal(assessmentLifecycleState({ ...base, confidence: { basis: "operator", verification: "operator_confirmed" } }), "operator_confirmed");
  assert.equal(assessmentLifecycleState({ ...base, kind: "semantic_claim", confidence: { basis: "semantic", verification: "unverified" } }), "model_proposed");
  assert.equal(assessmentLifecycleState({ ...base, kind: "opportunity" }), "opportunity_only");
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
  assert.equal(evaluateFindingPromotion({
    ...claim,
    confidence: { score: 0.95, basis: "mixed", verification: "independently_confirmed" },
  }).eligible, false, "independent model confirmation without law or reproducible proof remains an assessment");
  assert.equal(evaluateFindingPromotion({
    ...claim,
    applicableLaw: { id: "architecture.boundary" },
    confidence: { score: 0.95, basis: "mixed", verification: "independently_confirmed" },
  }).eligible, true);
});

test("creates a source-grounded assessment judgment report with stable signatures", () => {
  const assessment = createAssessmentReport({
    header,
    assessments: [{
      id: "risk:listener",
      kind: "risk",
      type: "events.inverseListenerDelegation",
      impact: "high",
      title: "Listener cleanup registers another listener",
      description: "The cleanup wrapper delegates to addEventListener.",
      subjects: ["src/listener.ts"],
      files: ["src/listener.ts"],
      evidence: [evidence],
      rootCauseKey: "events:src/listener.ts:cleanup",
      confidence: { score: 0.8, basis: "deterministic", verification: "unverified" },
    }],
  }).assessments[0];
  const sourceAssessmentRef = { type: "AssessmentReport", id: "assessment-report-1", schemaVersion: "0.1.0" };
  const judgmentHeader = {
    artifactType: "AssessmentJudgmentReport",
    artifactId: "assessment-judgment-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-15T00:00:00.000Z",
    subject: { repoId: "fixture" },
    producer: { id: "test.judge", version: "1.0.0" },
    inputRefs: [sourceAssessmentRef, evidence],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.9 },
  };
  const report = createAssessmentJudgmentReport({
    header: judgmentHeader,
    sourceAssessmentRef,
    policy: {
      mode: "auto",
      provider: "mock",
      model: "mock-judge",
      promptVersion: "assessment-judge-v1",
      coercionVersion: "assessment-judgment-v1",
      maxCandidates: 12,
      maxSourceChars: 24000,
    },
    summary: {
      candidates: 1,
      selected: 1,
      confirmed: 1,
      rejected: 0,
      insufficientEvidence: 0,
      verificationRequired: 0,
      failed: 0,
      skipped: 0,
      inputTokens: 120,
      outputTokens: 40,
    },
    judgments: [{
      assessmentId: assessment.id,
      assessmentSignature: assessmentJudgmentSignature(assessment),
      rootCauseKey: assessment.rootCauseKey,
      verdict: "confirmed",
      rationale: "The cleanup function calls the registration API instead of the removal API.",
      confidence: 0.97,
      evidence: [{
        path: "src/listener.ts",
        sha256: "abc123",
        lineStart: 4,
        lineEnd: 4,
        excerpt: "target.addEventListener(type, listener);",
      }],
    }],
  });

  assert.equal(validateAssessmentJudgmentReport(report).ok, true);
  assert.equal(report.judgments[0].assessmentSignature, assessmentJudgmentSignature(assessment));
  assert.deepEqual(report.boundaries, {
    executedCommands: false,
    wroteSourceFiles: false,
    mutatedEvidence: false,
    promotedFindings: false,
  });

  const tampered = structuredClone(report);
  tampered.summary.confirmed = 0;
  const tamperedValidation = validateAssessmentJudgmentReport(tampered);
  assert.equal(tamperedValidation.ok, false);
  assert.ok(tamperedValidation.issues.some((issue) => issue.path === "$.summary.confirmed"));
});

test("rejects decisive judgments without source evidence or source-report lineage", () => {
  const sourceAssessmentRef = { type: "AssessmentReport", id: "assessment-report-1", schemaVersion: "0.1.0" };
  const result = validateAssessmentJudgmentReport({
    header: {
      artifactType: "AssessmentJudgmentReport",
      artifactId: "assessment-judgment-bad",
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-15T00:00:00.000Z",
      subject: { repoId: "fixture" },
      producer: { id: "test.judge", version: "1.0.0" },
      inputRefs: [],
    },
    sourceAssessmentRef,
    policy: {
      mode: "auto",
      provider: "mock",
      model: "mock-judge",
      promptVersion: "assessment-judge-v1",
      coercionVersion: "assessment-judgment-v1",
      maxCandidates: 1,
      maxSourceChars: 1000,
    },
    summary: {
      candidates: 1,
      selected: 1,
      confirmed: 1,
      rejected: 0,
      insufficientEvidence: 0,
      verificationRequired: 0,
      failed: 0,
      skipped: 0,
    },
    judgments: [{
      assessmentId: "risk:x",
      assessmentSignature: "signature",
      rootCauseKey: "risk:x",
      verdict: "confirmed",
      rationale: "Confirmed without proof.",
      confidence: 0.9,
      evidence: [],
    }],
    boundaries: {
      executedCommands: false,
      wroteSourceFiles: false,
      mutatedEvidence: false,
      promotedFindings: false,
    },
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.header.inputRefs"));
  assert.ok(result.issues.some((issue) => issue.path.endsWith(".evidence")));
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

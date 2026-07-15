import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import policyCapability, {
  SEMANTIC_CACHE_INTEGRITY_RULE_ID,
  SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
  SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
  SEMANTIC_PROBLEM_CANDIDATE_RULE_ID,
  applyAssessmentJudgments,
  evaluateDependencyAuditReports,
  evaluateSemanticFileCandidates,
} from "../dist/index.js";
import {
  assessmentJudgmentSignature,
  createAssessmentJudgmentReport,
} from "@rekon/kernel-assessments";
import { createRuntime } from "@rekon/runtime";

const silentLogger = { info() {}, warn() {}, error() {} };

test("policy evaluator emits a FindingReport from EvidenceGraph", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-policy-"));

  try {
    const runtime = await createRuntime({ repoRoot: root, repoId: "fixture", capabilities: [policyCapability], logger: silentLogger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-test",
        schemaVersion: "0.1.0",
        generatedAt: "2026-05-13T17:00:00.000Z",
        subject: { repoId: "fixture" },
        producer: { id: "test", version: "0.1.0" },
        inputRefs: [],
      },
      facts: [
        {
          kind: "typescript:diagnostic",
          subject: "src/index.ts:2322:1:14",
          value: { path: "src/index.ts", code: 2322, category: "error", phase: "semantic", message: "Type 'number' is not assignable to type 'string'.", line: 1, column: 14 },
          confidence: 1,
        },
        {
          kind: "file",
          subject: "src/index.ts",
          value: { path: "src/index.ts" },
          confidence: 1,
        },
        {
          kind: "import",
          subject: "src/index.ts:../dist/index.js",
          value: { source: "src/index.ts", target: "../dist/index.js" },
          confidence: 0.9,
        },
        {
          kind: "import",
          subject: "src/index.ts:../node_modules/legacy-package",
          value: { source: "src/index.ts", target: "../node_modules/legacy-package" },
          confidence: 0.9,
        },
        {
          kind: "import",
          subject: "tests/fixture.test.ts:../node_modules/fixture-package",
          value: { source: "tests/fixture.test.ts", target: "../node_modules/fixture-package" },
          confidence: 0.9,
        },
        {
          kind: "ownership_hint",
          subject: "src/index.ts",
          value: { path: "src/index.ts", system: "unknown" },
          confidence: 0.5,
        },
        {
          kind: "content_signal",
          subject: "src/log.ts",
          value: { signal: "consoleLogging" },
          confidence: 1,
        },
        {
          kind: "file",
          subject: "src/StringUtils.ts",
          value: { path: "src/StringUtils.ts" },
          confidence: 1,
        },
      ],
    });

    const refs = await runtime.runEvaluate();
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport"));
    const assessments = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));

    assert.equal(report.header.artifactType, "FindingReport");
    assert.equal(report.summary.total, 3);
    assert.deepEqual(report.findings.map((finding) => finding.ruleId).sort(), [
      "imports.noDistImports",
      "imports.noNodeModulesRelativeImports",
      "typescript.compilerDiagnostic",
    ]);
    assert.equal(assessments.header.artifactType, "AssessmentReport");
    assert.equal(assessments.summary.total, 1);
    assert.deepEqual(
      assessments.assessments.map((assessment) => [assessment.ruleId, assessment.kind]).sort(),
      [
        ["architecture.noUnknownSystemForSourceFile", "model_diagnostic"],
      ],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dependency advisory impact preserves scanner severity while accounting for repository exposure", async () => {
  const evidenceRef = { type: "EvidenceGraph", id: "evidence-current", schemaVersion: "0.1.0" };
  const reportRef = { type: "DependencyAuditReport", id: "audit-current", schemaVersion: "0.1.0" };
  const vulnerability = (id, scope, direct) => ({
    id: `dependency-vulnerability-${id}`,
    packageName: `package-${id}`,
    severity: "critical",
    affectedRange: "<2.0.0",
    advisories: [{ id: `GHSA-${id}` }],
    paths: [{
      nodePath: `node_modules/package-${id}`,
      dependencyPath: direct ? [`package-${id}`] : ["tooling", `package-${id}`],
      installedVersion: "1.0.0",
      scope,
      direct,
    }],
    fixAvailable: true,
  });
  const report = {
    header: { inputRefs: [evidenceRef] },
    status: { complete: true },
    vulnerabilities: [
      vulnerability("production", "production", false),
      vulnerability("dev-direct", "development", true),
      vulnerability("dev-transitive", "development", false),
      vulnerability("unknown", "unknown", false),
      { ...vulnerability("umbrella", "production", true), advisories: [] },
    ],
  };
  const artifacts = {
    async list(type) {
      return type === "DependencyAuditReport" ? [reportRef] : [];
    },
    async read(ref) {
      assert.deepEqual(ref, reportRef);
      return report;
    },
  };

  const result = await evaluateDependencyAuditReports(artifacts, evidenceRef);
  const byPackage = new Map(result.assessments.map((assessment) => [assessment.details.packageName, assessment]));

  assert.equal(byPackage.get("package-production").impact, "critical");
  assert.equal(byPackage.get("package-dev-direct").impact, "high");
  assert.equal(byPackage.get("package-dev-transitive").impact, "medium");
  assert.equal(byPackage.get("package-unknown").impact, "high");
  assert.equal(byPackage.get("package-dev-transitive").details.advisorySeverity, "critical");
  assert.equal(byPackage.get("package-dev-transitive").details.direct, false);
  assert.equal(byPackage.get("package-dev-transitive").details.developmentOnly, true);
  assert.match(byPackage.get("package-dev-transitive").confidence.rationale, /caps repository impact at medium/);
  assert.equal(byPackage.has("package-umbrella"), false, "an umbrella row without its own advisory is evidence, not another risk");
});

test("semantic file findings become candidates only when their digest and excerpts match current source", () => {
  const text = "export function valid(value) {\n  return value.length > 0;\n}\n";
  const source = {
    path: "src/valid.ts",
    text,
    sha256: createHash("sha256").update(text).digest("hex"),
  };
  const ref = { type: "SemanticFileUnderstandingReport", id: "semantic-current", schemaVersion: "0.1.0" };
  const report = {
    header: { generatedAt: "2026-07-15T00:00:00.000Z" },
    file: { path: source.path, sha256: source.sha256 },
    normalizationTrace: { method: "semantic-llm", provider: "mock", model: "mock-model" },
    findings: [{
      id: "possible-empty-input",
      severity: "medium",
      message: "The function assumes value has a length property.",
      sourceEvidence: ["return value.length > 0;"],
      suggestedFollowUp: "Verify the caller contract.",
    }],
  };

  const assessments = evaluateSemanticFileCandidates(report, ref, source);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].kind, "semantic_claim");
  assert.equal(assessments[0].details.sourceEvidence[0].lineStart, 2);
  assert.equal(evaluateSemanticFileCandidates({ ...report, file: { ...report.file, sha256: "stale" } }, ref, source).length, 0);
  assert.equal(evaluateSemanticFileCandidates({
    ...report,
    findings: [{ ...report.findings[0], sourceEvidence: ["invented source"] }],
  }, ref, source).length, 0);
});

test("semantic problem classes map to stable assessment rules without changing generic fallback", () => {
  const text = [
    "for (const provider of providers) {",
    "  selected = provider;",
    "}",
    "const cachedCode = readFileSync(codePath, 'utf8');",
    "await Promise.all(cleanupHandlers);",
    "return cachedCode;",
  ].join("\n");
  const source = {
    path: "src/resolution.ts",
    text,
    sha256: createHash("sha256").update(text).digest("hex"),
  };
  const ref = { type: "SemanticFileUnderstandingReport", id: "semantic-classes", schemaVersion: "0.1.0" };
  const baseFinding = {
    severity: "high",
    message: "Candidate requires independent judgment.",
  };
  const report = {
    header: { generatedAt: "2026-07-15T00:00:00.000Z" },
    file: { path: source.path, sha256: source.sha256 },
    normalizationTrace: { method: "semantic-llm", provider: "mock", model: "mock-model" },
    findings: [
      {
        ...baseFinding,
        id: "dependency-precedence",
        problemClass: "dependency-resolution",
        sourceEvidence: ["selected = provider;"],
      },
      {
        ...baseFinding,
        id: "cache-read",
        problemClass: "cache-integrity",
        sourceEvidence: ["const cachedCode = readFileSync(codePath, 'utf8');"],
      },
      {
        ...baseFinding,
        id: "cleanup-fail-fast",
        problemClass: "cleanup-completeness",
        sourceEvidence: ["await Promise.all(cleanupHandlers);"],
      },
      {
        ...baseFinding,
        id: "other",
        problemClass: "other",
        sourceEvidence: ["return cachedCode;"],
      },
    ],
  };

  const assessments = evaluateSemanticFileCandidates(report, ref, source);
  assert.deepEqual(assessments.map((assessment) => assessment.ruleId).sort(), [
    SEMANTIC_CACHE_INTEGRITY_RULE_ID,
    SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
    SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
    SEMANTIC_PROBLEM_CANDIDATE_RULE_ID,
  ].sort());
  assert.equal(
    assessments.find((assessment) => assessment.ruleId === SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID).details.problemClass,
    "dependency-resolution",
  );
  assert.equal(
    assessments.find((assessment) => assessment.ruleId === SEMANTIC_CACHE_INTEGRITY_RULE_ID).type,
    SEMANTIC_CACHE_INTEGRITY_RULE_ID,
  );
  assert.equal(
    assessments.find((assessment) => assessment.ruleId === SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID).type,
    SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
  );
});

test("current high-confidence judgments confirm or reject matching candidates without mutating unrelated assessments", () => {
  const evidence = { type: "EvidenceGraph", id: "evidence-1", schemaVersion: "0.1.0" };
  const sourceAssessmentRef = { type: "AssessmentReport", id: "assessment-source", schemaVersion: "0.1.0" };
  const judgmentRef = { type: "AssessmentJudgmentReport", id: "judgment-1", schemaVersion: "0.1.0" };
  const base = {
    kind: "risk",
    type: "events.inverseListenerDelegation",
    impact: "high",
    title: "Cleanup registers another listener",
    description: "The cleanup wrapper calls the registration API.",
    subjects: ["src/listener.ts"],
    files: ["src/listener.ts"],
    evidence: [evidence],
    confidence: { score: 0.8, basis: "deterministic", verification: "unverified" },
  };
  const confirmed = { ...base, id: "risk:confirmed", rootCauseKey: "events:confirmed" };
  const rejected = { ...base, id: "risk:rejected", rootCauseKey: "events:rejected" };
  const unrelated = { ...base, id: "risk:unrelated", rootCauseKey: "events:unrelated" };
  const sourceEvidence = {
    path: "src/listener.ts",
    sha256: "abc123",
    lineStart: 4,
    lineEnd: 4,
    excerpt: "target.addEventListener(type, listener);",
  };
  const report = createAssessmentJudgmentReport({
    header: {
      artifactType: "AssessmentJudgmentReport",
      artifactId: judgmentRef.id,
      schemaVersion: "0.1.0",
      generatedAt: "2026-07-15T00:00:00.000Z",
      subject: { repoId: "fixture" },
      producer: { id: "mock.judge", version: "1.0.0" },
      inputRefs: [sourceAssessmentRef, evidence],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.9 },
    },
    sourceAssessmentRef,
    policy: {
      mode: "auto",
      provider: "mock",
      model: "mock-model",
      promptVersion: "assessment-judge-v2",
      coercionVersion: "assessment-judgment-v2",
      maxCandidates: 3,
      maxSourceChars: 24000,
    },
    summary: {
      candidates: 3,
      selected: 2,
      confirmed: 1,
      rejected: 1,
      insufficientEvidence: 0,
      verificationRequired: 0,
      failed: 0,
      skipped: 1,
    },
    judgments: [
      {
        assessmentId: confirmed.id,
        assessmentSignature: assessmentJudgmentSignature(confirmed),
        rootCauseKey: confirmed.rootCauseKey,
        verdict: "confirmed",
        rationale: "The inverse operation calls addEventListener.",
        confidence: 0.96,
        evidence: [sourceEvidence],
      },
      {
        assessmentId: rejected.id,
        assessmentSignature: assessmentJudgmentSignature(rejected),
        rootCauseKey: rejected.rootCauseKey,
        verdict: "rejected",
        rationale: "The wrapper is a registration helper, not cleanup.",
        confidence: 0.92,
        evidence: [sourceEvidence],
      },
    ],
  });

  const applied = applyAssessmentJudgments([confirmed, rejected, unrelated], report, judgmentRef);
  assert.deepEqual(applied.applied, [confirmed.id]);
  assert.deepEqual(applied.rejected, [rejected.id]);
  assert.equal(applied.assessments.length, 2);
  assert.equal(applied.assessments.find((entry) => entry.id === confirmed.id).confidence.verification, "independently_confirmed");
  assert.equal(applied.assessments.find((entry) => entry.id === unrelated.id).confidence.verification, "unverified");

  const changed = { ...confirmed, description: "Changed candidate meaning." };
  const stale = applyAssessmentJudgments([changed], report, judgmentRef);
  assert.equal(stale.assessments[0].confidence.verification, "unverified");
  assert.deepEqual(stale.ignored, [confirmed.id]);
});

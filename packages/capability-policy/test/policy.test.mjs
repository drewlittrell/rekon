import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import policyCapability, { evaluateDependencyAuditReports } from "../dist/index.js";
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

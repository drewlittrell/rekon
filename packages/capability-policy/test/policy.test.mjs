import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import policyCapability from "../dist/index.js";
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
          kind: "ownership_hint",
          subject: "src/index.ts",
          value: { path: "src/index.ts", system: "unknown" },
          confidence: 0.5,
        },
      ],
    });

    const refs = await runtime.runEvaluate();
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport"));
    const assessments = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));

    assert.equal(report.header.artifactType, "FindingReport");
    assert.equal(report.summary.total, 2);
    assert.deepEqual(report.findings.map((finding) => finding.ruleId).sort(), ["imports.noDistImports", "typescript.compilerDiagnostic"]);
    assert.equal(assessments.header.artifactType, "AssessmentReport");
    assert.equal(assessments.summary.total, 1);
    assert.equal(assessments.assessments[0].kind, "model_diagnostic");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

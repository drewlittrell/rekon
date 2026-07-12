import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import policyCapability from "../../packages/capability-policy/dist/index.js";
import { validateAssessmentReport } from "../../packages/kernel-assessments/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const logger = { info() {}, warn() {}, error() {} };

test("policy keeps proven violations in findings and uncertain signals in assessments", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-detection-quality-"));
  try {
    const runtime = await createRuntime({ repoRoot: root, repoId: "fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-quality",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-10T00:00:00.000Z",
        subject: { repoId: "fixture" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
      },
      facts: [
        { kind: "file", subject: "src/index.ts", value: { path: "src/index.ts" }, confidence: 1 },
        { kind: "file", subject: "src/orphan.ts", value: { path: "src/orphan.ts" }, confidence: 1 },
        {
          kind: "import",
          subject: "src/index.ts:../dist/index.js",
          value: { source: "src/index.ts", target: "../dist/index.js" },
          confidence: 1,
        },
        {
          kind: "ownership_hint",
          subject: "src/index.ts",
          value: { path: "src/index.ts", system: "unknown" },
          confidence: 0.5,
        },
        {
          kind: "debt_marker",
          subject: "src/index.ts",
          value: { marker: "TODO", detail: "TODO: revisit" },
          confidence: 1,
        },
        {
          kind: "export",
          subject: "src/orphan.ts",
          value: { name: "unused", kind: "function" },
          confidence: 1,
        },
      ],
    });

    const refs = await runtime.runEvaluate();
    const findingRef = refs.find((ref) => ref.type === "FindingReport");
    const assessmentRef = refs.find((ref) => ref.type === "AssessmentReport");
    assert.ok(findingRef);
    assert.ok(assessmentRef);

    const findings = await runtime.artifacts.read(findingRef);
    const assessments = await runtime.artifacts.read(assessmentRef);
    assert.deepEqual(findings.findings.map((finding) => finding.ruleId), ["imports.noDistImports"]);
    assert.equal(validateAssessmentReport(assessments).ok, true);
    assert.deepEqual(
      assessments.assessments.map((assessment) => assessment.kind).sort(),
      ["model_diagnostic", "opportunity", "risk"],
    );
    assert.equal(assessments.assessments.every((assessment) => assessment.evidence.length > 0), true);
    assert.equal(assessments.assessments.every((assessment) => assessment.rootCauseKey.length > 0), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

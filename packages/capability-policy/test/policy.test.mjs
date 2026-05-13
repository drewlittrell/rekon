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
      facts: [{
        kind: "import",
        subject: "src/index.ts:../dist/index.js",
        value: { source: "src/index.ts", target: "../dist/index.js" },
        confidence: 0.9,
      }],
    });

    const refs = await runtime.runEvaluate();
    const report = await runtime.artifacts.read(refs[0]);

    assert.equal(report.header.artifactType, "FindingReport");
    assert.equal(report.summary.total, 1);
    assert.equal(report.findings[0].ruleId, "imports.noDistImports");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

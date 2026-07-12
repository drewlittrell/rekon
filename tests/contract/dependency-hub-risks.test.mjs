import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  DEPENDENCY_HUB_RULE_ID,
  evaluateDependencyHubs,
} from "../../packages/capability-policy/dist/index.js";
import policyCapability from "../../packages/capability-policy/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const graphRef = { type: "GraphSlice", id: "import-graph-hub", schemaVersion: "0.1.0" };
const logger = { info() {}, warn() {}, error() {} };

function hubEdges(path = "src/hub.ts") {
  return [
    ...Array.from({ length: 5 }, (_, index) => ({ source: `src/caller-${index}.ts`, target: path, kind: "imports" })),
    ...Array.from({ length: 5 }, (_, index) => ({ source: path, target: `src/dependency-${index}.ts`, kind: "imports" })),
  ];
}

test("requires both incoming and outgoing dependency pressure", () => {
  const assessments = evaluateDependencyHubs({
    edges: [
      ...hubEdges(),
      ...Array.from({ length: 10 }, (_, index) => ({ source: `src/consumer-${index}.ts`, target: "src/facade.ts", kind: "imports" })),
      ...Array.from({ length: 10 }, (_, index) => ({ source: "src/orchestrator.ts", target: `src/leaf-${index}.ts`, kind: "imports" })),
      ...hubEdges("tests/test-hub.test.ts"),
    ],
  }, graphRef);

  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, DEPENDENCY_HUB_RULE_ID);
  assert.equal(assessments[0].kind, "risk");
  assert.equal(assessments[0].impact, "medium");
  assert.equal(assessments[0].details.incoming, 5);
  assert.equal(assessments[0].details.outgoing, 5);
});

test("policy evaluator consumes the import graph hub as an assessment", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-dependency-hub-"));
  try {
    const runtime = await createRuntime({ repoRoot: root, repoId: "hub-fixture", capabilities: [policyCapability], logger });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "hub-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:00:00.000Z",
        subject: { repoId: "hub-fixture" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
      },
      facts: [],
    });
    const writtenGraphRef = await runtime.artifacts.write({
      header: {
        artifactType: "GraphSlice",
        artifactId: "import-graph-hub",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:00:01.000Z",
        subject: { repoId: "hub-fixture" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
        provenance: { confidence: 1, notes: ["import-graph"] },
      },
      producer: "test",
      nodes: [],
      edges: hubEdges().map((edge) => ({ ...edge, evidence: [] })),
    });

    const refs = await runtime.runEvaluate();
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const hubs = report.assessments.filter((assessment) => assessment.ruleId === DEPENDENCY_HUB_RULE_ID);

    assert.equal(hubs.length, 1);
    assert.equal(hubs[0].evidence[0].id, writtenGraphRef.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

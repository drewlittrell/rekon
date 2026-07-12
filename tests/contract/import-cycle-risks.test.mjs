import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import graphCapability from "../../packages/capability-graph/dist/index.js";
import { jsTsProvider } from "../../packages/capability-js-ts/dist/index.js";
import {
  IMPORT_CYCLE_RULE_ID,
  evaluateImportCycleGraph,
} from "../../packages/capability-policy/dist/index.js";
import policyCapability from "../../packages/capability-policy/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

const graphRef = { type: "GraphSlice", id: "import-graph-test", schemaVersion: "0.1.0" };
const logger = { info() {}, warn() {}, error() {} };

test("reports one strongly connected component and ignores type-only and test cycles", () => {
  const assessments = evaluateImportCycleGraph({
    header: { artifactId: "import-graph-test", provenance: { notes: ["import-graph"] } },
    edges: [
      { source: "src/a.ts", target: "src/b.ts", kind: "imports" },
      { source: "src/b.ts", target: "src/c.ts", kind: "imports" },
      { source: "src/c.ts", target: "src/a.ts", kind: "imports" },
      { source: "src/types-a.ts", target: "src/types-b.ts", kind: "imports", metadata: { importKind: "type-only" } },
      { source: "src/types-b.ts", target: "src/types-a.ts", kind: "imports", metadata: { typeOnly: true } },
      { source: "tests/a.test.ts", target: "tests/b.test.ts", kind: "imports" },
      { source: "tests/b.test.ts", target: "tests/a.test.ts", kind: "imports" },
      { source: "src/entry.ts", target: "src/leaf.ts", kind: "imports" },
    ],
  }, graphRef);

  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ruleId, IMPORT_CYCLE_RULE_ID);
  assert.equal(assessments[0].kind, "risk");
  assert.deepEqual(assessments[0].details.modules, ["src/a.ts", "src/b.ts", "src/c.ts"]);
  assert.equal(assessments[0].details.edges.length, 3);
  assert.equal(assessments[0].confidence.verification, "verified");
});

test("resolved import graph drives an import-cycle risk without creating a finding", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-import-cycle-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "a.ts"), "import { b } from './b.js';\nexport const a = b + 1;\n", "utf8");
    await writeFile(join(root, "src", "b.ts"), "import { c } from './c.js';\nexport const b = c + 1;\n", "utf8");
    await writeFile(join(root, "src", "c.ts"), "import { a } from './a.js';\nexport const c = a + 1;\n", "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "cycle-fixture",
      capabilities: [graphCapability, policyCapability],
      logger,
    });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "cycle-evidence",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-11T00:00:00.000Z",
        subject: { repoId: "cycle-fixture" },
        producer: { id: "@rekon/capability-js-ts", version: "1.0.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
        provenance: { confidence: 1 },
      },
      facts,
    });

    const graphRefs = await runtime.runProject({ projectorId: "@rekon/capability-graph.projector" });
    const importGraph = await runtime.artifacts.read(graphRefs[0]);
    assert.deepEqual(importGraph.edges.map((edge) => [edge.source, edge.target]), [
      ["src/a.ts", "src/b.ts"],
      ["src/b.ts", "src/c.ts"],
      ["src/c.ts", "src/a.ts"],
    ]);

    const refs = await runtime.runEvaluate();
    const findings = await runtime.artifacts.read(refs.find((ref) => ref.type === "FindingReport"));
    const report = await runtime.artifacts.read(refs.find((ref) => ref.type === "AssessmentReport"));
    const cycles = report.assessments.filter((assessment) => assessment.ruleId === IMPORT_CYCLE_RULE_ID);

    assert.equal(findings.summary.total, 0);
    assert.equal(cycles.length, 1);
    assert.equal(cycles[0].evidence[0].id, graphRefs[0].id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

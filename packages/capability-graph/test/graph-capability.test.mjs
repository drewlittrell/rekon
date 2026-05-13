import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import graphCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

test("graph capability projects import, symbol, and ownership slices", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-graph-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [graphCapability],
    });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-1",
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "repo" },
        producer: { id: "test", version: "0.1.0" },
        inputRefs: [],
      },
      facts: [
        { kind: "file", subject: "src/index.ts", value: {}, confidence: 1 },
        { kind: "import", subject: "src/index.ts", value: { target: "src/util.ts" }, confidence: 1 },
        { kind: "export", subject: "src/index.ts", value: { name: "value" }, confidence: 1 },
        { kind: "ownership_hint", subject: "src/index.ts", value: { path: "src/index.ts", system: "src" }, confidence: 0.8 },
      ],
    });

    const refs = await runtime.runProject({
      projectorId: "@rekon/capability-graph.projector",
    });

    assert.deepEqual(refs.map((ref) => ref.type), ["GraphSlice", "GraphSlice", "GraphSlice"]);

    const importGraph = await runtime.artifacts.read(refs[0]);
    assert.equal(importGraph.edges[0].kind, "imports");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

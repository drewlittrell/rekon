import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import modelCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

const silentLogger = {
  info() {},
  warn() {},
  error() {},
};

test("model capability projects EvidenceGraph into repo model artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-model-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [modelCapability],
      logger: silentLogger,
    });
    await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-test",
        schemaVersion: "0.1.0",
        generatedAt: "2026-05-13T17:00:00.000Z",
        subject: {
          repoId: "fixture",
        },
        producer: {
          id: "test",
          version: "0.1.0",
        },
        inputRefs: [],
      },
      facts: [
        {
          kind: "ownership_hint",
          subject: "src/index.ts",
          value: {
            path: "src/index.ts",
            system: "src",
            layer: "source",
          },
          confidence: 0.9,
        },
        {
          kind: "capability_hint",
          subject: "src/index.ts",
          value: {
            path: "src/index.ts",
            capability: "cli",
          },
          confidence: 0.8,
        },
      ],
    });

    const refs = await runtime.runProject();
    const types = refs.map((ref) => ref.type).sort();
    const snapshotRef = await runtime.runSnapshot();
    const snapshot = await runtime.artifacts.read(snapshotRef);

    assert.deepEqual(types, ["CapabilityMap", "ObservedRepo", "OwnershipMap"]);
    assert.equal(snapshot.projections.ObservedRepo.length, 1);
    assert.equal(snapshot.projections.OwnershipMap.length, 1);
    assert.equal(snapshot.projections.CapabilityMap.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

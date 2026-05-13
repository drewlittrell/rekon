import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import resolverCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

const silentLogger = {
  info() {},
  warn() {},
  error() {},
};

test("preflight resolver writes a typed resolver packet", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-resolver-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [resolverCapability],
      logger: silentLogger,
    });
    const evidenceRef = await runtime.artifacts.write({
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
      facts: [{
        kind: "ownership_hint",
        subject: "src/index.ts",
        value: {
          path: "src/index.ts",
          system: "src",
        },
        confidence: 0.9,
      }],
    });
    const snapshotRef = await runtime.artifacts.write({
      header: {
        artifactType: "IntelligenceSnapshot",
        artifactId: "snapshot-test",
        schemaVersion: "0.1.0",
        generatedAt: "2026-05-13T17:00:00.000Z",
        subject: {
          repoId: "fixture",
        },
        producer: {
          id: "test",
          version: "0.1.0",
        },
        inputRefs: [evidenceRef],
      },
      repo: {
        id: "fixture",
        root,
      },
      inputs: {
        EvidenceGraph: [evidenceRef],
      },
      projections: {},
      evaluations: {},
      publications: {},
      actions: {},
      status: {
        freshness: "fresh",
        warnings: [],
        blockedReasons: [],
      },
    }, { category: "snapshots" });

    const refs = await runtime.runResolve({
      resolverId: "resolve.preflight",
      input: {
        snapshotRef,
        path: "src/index.ts",
        goal: "modify bootstrap",
      },
    });
    const packet = await runtime.artifacts.read(refs[0]);

    assert.equal(packet.header.artifactType, "ResolverPacket");
    assert.equal(packet.goal, "modify bootstrap");
    assert.deepEqual(packet.ownerSystems, ["src"]);
    assert.equal(packet.risk.tier, "high");
    assert.deepEqual(packet.requiredChecks, ["npm run typecheck", "npm run test", "npm run build"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

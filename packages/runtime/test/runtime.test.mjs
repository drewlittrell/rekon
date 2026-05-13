import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { defineCapability } from "@rekon/sdk";
import {
  createLocalArtifactStore,
  createRuntime,
} from "../dist/index.js";

const silentLogger = {
  info() {},
  warn() {},
  error() {},
};

test("local artifact store writes, reads, and lists artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));

  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const artifact = {
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-test",
        schemaVersion: "0.1.0",
        generatedAt: "2026-05-13T17:00:00.000Z",
        subject: {
          repoId: "fixture",
        },
        producer: {
          id: "@rekon/runtime-test",
          version: "0.1.0",
        },
        inputRefs: [],
      },
      facts: [],
    };
    const ref = await store.write(artifact);

    assert.equal(ref.type, "EvidenceGraph");
    assert.equal(ref.id, "evidence-test");
    assert.match(ref.path, /\.rekon\/artifacts\/evidence\/EvidenceGraph-evidence-test\.json/);
    assert.equal(typeof ref.digest, "string");
    assert.deepEqual(await store.read(ref), artifact);
    assert.deepEqual(await store.readById("EvidenceGraph", "evidence-test"), artifact);
    assert.equal((await store.list("EvidenceGraph")).length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runtime runs evidence providers and creates a snapshot", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));

  try {
    await writeFile(join(root, "index.ts"), "export const value = 1;\n", "utf8");
    const capability = defineCapability({
      manifest: {
        id: "@rekon/capability-test",
        name: "Runtime Test",
        version: "0.1.0",
        roles: ["evidence-provider"],
        consumes: ["SourceFile"],
        produces: ["EvidenceGraph"],
        permissions: ["read:source", "write:artifacts"],
        compatibility: {
          rekon: "^0.1.0",
        },
      },
      register(registry) {
        registry.evidenceProvider({
          id: "runtime-test.provider",
          kind: "repo",
          supports() {
            return true;
          },
          async extract() {
            return [{
              id: "fact-file-index",
              kind: "file",
              subject: "index.ts",
              value: {
                path: "index.ts",
              },
              confidence: 1,
              provenance: {
                source: "repo",
                pack: "@rekon/capability-test",
                file: "index.ts",
                extractorVersion: "0.1.0",
              },
            }];
          },
        });
      },
    });

    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [capability],
      logger: silentLogger,
    });
    const evidenceRef = await runtime.runObserve();
    const snapshotRef = await runtime.runSnapshot();
    const evidence = await runtime.artifacts.read(evidenceRef);
    const snapshot = await runtime.artifacts.read(snapshotRef);

    assert.equal(evidence.header.artifactType, "EvidenceGraph");
    assert.equal(evidence.facts.length, 1);
    assert.equal(snapshot.header.artifactType, "IntelligenceSnapshot");
    assert.equal(snapshot.inputs.EvidenceGraph[0].id, evidenceRef.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runtime denies source-writing capabilities unless configured", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));

  try {
    const capability = defineCapability({
      manifest: {
        id: "@rekon/capability-writer",
        name: "Writer",
        version: "0.1.0",
        roles: ["evidence-provider"],
        consumes: ["SourceFile"],
        produces: ["EvidenceGraph"],
        permissions: ["read:source", "write:source"],
        compatibility: {
          rekon: "^0.1.0",
        },
      },
      register(registry) {
        registry.evidenceProvider({
          id: "writer.provider",
          kind: "repo",
          supports() {
            return true;
          },
          async extract() {
            return [];
          },
        });
      },
    });

    await assert.rejects(
      () => createRuntime({ repoRoot: root, capabilities: [capability], logger: silentLogger }),
      /denied permission write:source/,
    );

    await createRuntime({
      repoRoot: root,
      capabilities: [capability],
      permissions: {
        "@rekon/capability-writer": ["read:source", "write:source"],
      },
      logger: silentLogger,
    });

    const config = JSON.parse(await readFile(join(root, ".rekon", "config.json"), "utf8"));
    assert.deepEqual(config, { capabilities: [], permissions: {} });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { defineCapability } from "@rekon/sdk";
import { digestJson } from "@rekon/kernel-artifacts";
import {
  createLocalArtifactStore,
  createRuntime,
  validateArtifactIndex,
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

test("artifact index validation checks paths, headers, digests, and duplicates", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));

  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const artifact = evidenceArtifact("evidence-test");
    const ref = await store.write(artifact);

    assert.deepEqual(await validateArtifactIndex(store), {
      valid: true,
      issues: [],
    });

    const indexPath = join(root, ".rekon/registry/artifacts.index.json");
    const index = JSON.parse(await readFile(indexPath, "utf8"));
    const originalEntry = { ...index[0] };
    index[0].digest = "wrong";
    index[0].schemaVersion = "9.9.9";
    index[0].artifactType = "Other";
    index.push({ ...originalEntry });
    index.push({
      ...originalEntry,
      id: "outside",
      artifactId: "outside",
      path: "../outside.json",
    });
    await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

    const result = await validateArtifactIndex(store);

    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.code === "index.entry.duplicate"));
    assert.ok(result.issues.some((issue) => issue.code === "index.entry.outside_artifacts"));
    assert.ok(result.issues.some((issue) => issue.code === "index.entry.outside_repo"));
    assert.ok(result.issues.some((issue) => issue.code === "index.entry.artifact_type_mismatch"));
    assert.ok(result.issues.some((issue) => issue.code === "artifact.header.schema_version_mismatch"));
    assert.ok(result.issues.some((issue) => issue.code === "artifact.digest_mismatch"));
    assert.equal(ref.type, "EvidenceGraph");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("artifact reads reject forged outside paths and symlinked artifact bodies", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));
  const outside = await mkdtemp(join(tmpdir(), "rekon-runtime-outside-"));

  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const artifact = evidenceArtifact("evidence-test");
    const ref = await store.write(artifact);
    const outsideArtifact = evidenceArtifact("evidence-outside");
    const outsidePath = join(outside, "outside.json");
    await writeFile(outsidePath, `${JSON.stringify(outsideArtifact, null, 2)}\n`, "utf8");

    await assert.rejects(
      () => store.read({
        type: "EvidenceGraph",
        id: "evidence-outside",
        schemaVersion: "0.1.0",
        path: "../outside.json",
        digest: digestJson(outsideArtifact),
      }),
      /Artifact index entries must point under \.rekon\/artifacts|Path must stay inside/,
    );

    const artifactPath = join(root, ref.path);
    await rm(artifactPath);
    await symlink(outsidePath, artifactPath, "file");

    await assert.rejects(
      () => store.read(ref),
      /must not be a symlink/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("runtime initialization refuses a symlinked .rekon workspace", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));
  const outside = await mkdtemp(join(tmpdir(), "rekon-runtime-workspace-"));

  try {
    await symlink(outside, join(root, ".rekon"), "dir");
    const store = createLocalArtifactStore(root);

    await assert.rejects(
      () => store.init(),
      /workspace root must be a regular directory/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
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

test("snapshot status is unknown when no evidence is indexed", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      logger: silentLogger,
    });
    const snapshotRef = await runtime.runSnapshot();
    const snapshot = await runtime.artifacts.read(snapshotRef);

    assert.equal(snapshot.status.freshness, "unknown");
    assert.ok(snapshot.status.warnings.includes("No EvidenceGraph artifacts are indexed."));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("snapshot status is fresh after observe only", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [evidenceCapability()],
      logger: silentLogger,
    });

    await runtime.runObserve();
    const snapshotRef = await runtime.runSnapshot();
    const snapshot = await runtime.artifacts.read(snapshotRef);

    assert.equal(snapshot.status.freshness, "fresh");
    assert.deepEqual(snapshot.status.warnings, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("snapshot status is partial when projection families are incomplete", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [evidenceCapability()],
      logger: silentLogger,
    });

    const evidenceRef = await runtime.runObserve();
    await runtime.artifacts.write({
      header: testHeader("ObservedRepo", "observed-test", [evidenceRef]),
      repository: {
        id: "fixture",
        root,
      },
      systems: [],
      layers: [],
      capabilities: [],
    }, { category: "projections" });

    const snapshotRef = await runtime.runSnapshot();
    const snapshot = await runtime.artifacts.read(snapshotRef);

    assert.equal(snapshot.status.freshness, "partial");
    assert.ok(snapshot.status.warnings.includes("Missing expected projection artifact OwnershipMap after projection started."));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("snapshot status reports malformed index entries", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [evidenceCapability()],
      logger: silentLogger,
    });

    await runtime.runObserve();
    const indexPath = join(root, ".rekon/registry/artifacts.index.json");
    const index = JSON.parse(await readFile(indexPath, "utf8"));
    index[0].digest = "wrong";
    await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

    const snapshotRef = await runtime.runSnapshot();
    const snapshot = await runtime.artifacts.read(snapshotRef);

    assert.equal(snapshot.status.freshness, "partial");
    assert.ok(snapshot.status.warnings.some((warning) => warning.includes("artifact.digest_mismatch")));
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

test("runtime gates artifact handler access by declared capability permissions", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-"));

  try {
    const capability = defineCapability({
      manifest: {
        id: "@rekon/capability-artifact-gate",
        name: "Artifact Gate",
        version: "0.1.0",
        roles: ["resolver"],
        consumes: ["IntelligenceSnapshot"],
        produces: ["ResolverPacket"],
        permissions: ["write:artifacts"],
        compatibility: {
          rekon: "^0.1.0",
        },
      },
      register(registry) {
        registry.resolver({
          id: "artifact-gate.resolver",
          produces: ["ResolverPacket"],
          async resolve({ artifacts }) {
            await artifacts.list();
            return [];
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

    await assert.rejects(
      () => runtime.runResolve({ resolverId: "artifact-gate.resolver" }),
      /did not declare required permission read:artifacts/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function evidenceCapability() {
  return defineCapability({
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
}

function evidenceArtifact(id) {
  return {
    header: testHeader("EvidenceGraph", id, []),
    facts: [],
  };
}

function testHeader(artifactType, artifactId, inputRefs) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-13T17:00:00.000Z",
    subject: {
      repoId: "fixture",
    },
    producer: {
      id: "@rekon/runtime-test",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 1,
    },
  };
}

test("runObserve completes when a provider emits ~200k facts (spread-overflow regression)", async () => {
  // Regression for the WO-2 stack overflow: `facts.push(...await
  // provider.extract(...))` in runObserve threw "Maximum call stack size
  // exceeded" once a repo emitted more than ~10^5 evidence facts (every
  // spread element becomes a stack-allocated argument; mentor-family-mvp
  // emitted 107,158). The fixed code appends facts one-by-one, so this
  // synthetic 200k-fact provider must complete and lose nothing.
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-scale-"));

  try {
    const FACT_COUNT = 200_000;
    const capability = defineCapability({
      manifest: {
        id: "@rekon/capability-scale-test",
        name: "Scale Test",
        version: "0.1.0",
        roles: ["evidence-provider"],
        consumes: ["SourceFile"],
        produces: ["EvidenceGraph"],
        permissions: ["read:source", "write:artifacts"],
        compatibility: { rekon: "^0.1.0" },
      },
      register(registry) {
        registry.evidenceProvider({
          id: "scale-test.provider",
          kind: "repo",
          supports() {
            return true;
          },
          async extract() {
            const facts = [];

            for (let index = 0; index < FACT_COUNT; index += 1) {
              facts.push({
                id: `scale-fact-${index}`,
                kind: "file",
                subject: `src/file-${index}.ts`,
                value: { path: `src/file-${index}.ts` },
                confidence: 1,
                provenance: {
                  source: "repo",
                  pack: "@rekon/capability-scale-test",
                  file: `src/file-${index}.ts`,
                  extractorVersion: "0.1.0",
                },
              });
            }

            return facts;
          },
        });
      },
    });

    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "scale-fixture",
      capabilities: [capability],
      logger: silentLogger,
    });
    const evidenceRef = await runtime.runObserve();
    const evidence = await runtime.artifacts.read(evidenceRef);

    assert.equal(evidence.facts.length, FACT_COUNT);
    assert.equal(evidence.facts[0].id, "scale-fact-0");
    assert.equal(evidence.facts.at(-1).id, `scale-fact-${FACT_COUNT - 1}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

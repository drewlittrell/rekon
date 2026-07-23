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
  runSnapshot,
  validateArtifactIndex,
  validateArtifactFreshness,
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

test("artifact listing applies chronological order before its limit", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-order-"));

  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    await store.write(evidenceArtifact("a-old"));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
    await store.write(evidenceArtifact("z-new"));

    assert.deepEqual(
      (await store.list("EvidenceGraph", { order: "newest", limit: 1 })).map((entry) => entry.id),
      ["z-new"],
    );
    assert.deepEqual(
      (await store.list("EvidenceGraph", { order: "oldest", limit: 1 })).map((entry) => entry.id),
      ["a-old"],
    );
    await assert.rejects(
      store.list("EvidenceGraph", { order: "newest", limit: 0 }),
      /positive integer/u,
    );
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

test("artifact index records and validates supersession identity with legacy compatibility", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-index-supersession-"));

  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const artifact = {
      header: {
        ...testHeader("GraphSlice", "graph-import", []),
        supersession: { key: "import-graph" },
      },
      sliceType: "import-graph",
      producer: "runtime-test",
      nodes: [],
      edges: [],
    };
    const ref = await store.write(artifact, { category: "graphs" });
    const indexPath = join(root, ".rekon/registry/artifacts.index.json");
    const index = JSON.parse(await readFile(indexPath, "utf8"));

    assert.equal(index[0].supersessionKey, "import-graph");
    assert.deepEqual(await validateArtifactIndex(store), { valid: true, issues: [] });

    index[0].supersessionKey = "ownership-graph";
    await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    const mismatch = await validateArtifactIndex(store);
    assert.equal(mismatch.valid, false);
    assert.ok(mismatch.issues.some((issue) =>
      issue.code === "artifact.header.supersession_key_mismatch"),
    );
    await assert.rejects(
      () => store.read(ref),
      (error) => error?.code === "artifact.header.supersession_key_mismatch",
    );

    delete index[0].supersessionKey;
    await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    const legacy = await validateArtifactIndex(store);
    assert.equal(legacy.valid, true);
    assert.ok(legacy.issues.some((issue) => issue.code === "index.entry.supersession_key_missing"));
    assert.deepEqual(await store.read(ref), artifact);

    const migratedStore = createLocalArtifactStore(root);
    await migratedStore.init();
    const migratedIndex = JSON.parse(await readFile(indexPath, "utf8"));
    assert.equal(migratedIndex[0].supersessionKey, "import-graph");
    assert.deepEqual(await validateArtifactIndex(migratedStore), { valid: true, issues: [] });
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
    await writeFile(join(root, "tool.config.json"), "{\"mode\":\"one\"}\n", "utf8");
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

test("incremental observe retains unchanged facts and replaces changed or deleted file facts", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-incremental-"));

  try {
    await writeFile(join(root, "one.ts"), "export const one = 1;\n", "utf8");
    await writeFile(join(root, "two.ts"), "export const two = 2;\n", "utf8");
    const capability = defineCapability({
      manifest: {
        id: "@rekon/capability-incremental-test",
        name: "Incremental Test",
        version: "1.0.0",
        roles: ["evidence-provider"],
        consumes: ["SourceFile"],
        produces: ["EvidenceGraph"],
        permissions: ["read:source", "write:artifacts"],
        compatibility: { rekon: "^1.0.0" },
      },
      register(registry) {
        registry.evidenceProvider({
          id: "incremental-test.provider",
          kind: "repo",
          supports() { return true; },
          async extract(ctx) {
            const paths = ctx.incremental ? (ctx.changedFiles ?? []) : ["one.ts", "two.ts"];
            const facts = [];
            for (const path of paths) {
              try {
                const content = await readFile(join(root, path), "utf8");
                facts.push({
                  id: `file-${path}-${content.trim()}`,
                  kind: "file",
                  subject: path,
                  value: { path, digest: digestJson(content) },
                  confidence: 1,
                  provenance: {
                    source: "repo",
                    pack: "@rekon/capability-incremental-test",
                    file: path,
                    extractorVersion: "1.0.0",
                  },
                });
              } catch {
                // A deleted changed file contributes no replacement fact.
              }
            }
            return facts;
          },
        });
      },
    });
    const runtime = await createRuntime({ repoRoot: root, capabilities: [capability], logger: silentLogger });
    const firstRef = await runtime.runObserve({ incremental: true, changedFiles: ["two.ts"] });
    const first = await runtime.artifacts.read(firstRef);
    assert.equal(first.facts.some((fact) => fact.subject === "one.ts"), true);
    assert.equal(first.facts.some((fact) => fact.subject === "two.ts"), true);
    assert.equal(first.header.freshness.status, "fresh");
    const proofRef = {
      type: "ProofGateReport",
      id: "proof-gate-runtime-test",
      schemaVersion: "1.0.0",
    };

    await writeFile(join(root, "two.ts"), "export const two = 3;\n", "utf8");
    const changedRef = await runtime.runObserve({
      incremental: true,
      changedFiles: ["two.ts"],
      inputRefs: [proofRef, proofRef],
    });
    const changed = await runtime.artifacts.read(changedRef);

    assert.equal(changed.facts.some((fact) => fact.subject === "one.ts"), true);
    assert.equal(changed.facts.some((fact) => fact.id.includes("two = 2")), false);
    assert.equal(changed.facts.some((fact) => fact.id.includes("two = 3")), true);
    assert.equal(changed.header.inputRefs[0].id, firstRef.id);
    assert.deepEqual(
      changed.header.inputRefs.map((ref) => `${ref.type}:${ref.id}`),
      [`EvidenceGraph:${firstRef.id}`, "ProofGateReport:proof-gate-runtime-test"],
    );

    await rm(join(root, "one.ts"));
    const deletedRef = await runtime.runObserve({ incremental: true, changedFiles: ["one.ts"] });
    const deleted = await runtime.artifacts.read(deletedRef);
    assert.equal(deleted.facts.some((fact) => fact.subject === "one.ts"), false);
    assert.equal(deleted.facts.some((fact) => fact.subject === "two.ts"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("freshness detects tracked input and producer version changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-freshness-inputs-"));

  try {
    await writeFile(join(root, "index.ts"), "export const value = 1;\n", "utf8");
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [evidenceCapability()],
      logger: silentLogger,
    });
    const evidenceRef = await runtime.runObserve();
    const evidence = await runtime.artifacts.read(evidenceRef);
    evidence.header.invalidation = {
      inputs: [
        { kind: "source", path: "index.ts", digest: digestJson("export const value = 1;\n") },
        { kind: "config", path: "tool.config.json", digest: digestJson("{\"mode\":\"one\"}\n") },
      ],
      producers: [{ id: "runtime-test.provider", version: "0.1.0" }],
    };
    const replacement = { ...evidence, header: { ...evidence.header, artifactId: "evidence-input-baseline" } };
    const baselineRef = await runtime.artifacts.write(replacement);

    await writeFile(join(root, "index.ts"), "export const value = 2;\n", "utf8");
    await writeFile(join(root, "tool.config.json"), "{\"mode\":\"two\"}\n", "utf8");
    const capabilityIndexPath = join(root, ".rekon/registry/capabilities.index.json");
    const capabilityIndex = JSON.parse(await readFile(capabilityIndexPath, "utf8"));
    capabilityIndex[0].version = "2.0.0";
    await writeFile(capabilityIndexPath, `${JSON.stringify(capabilityIndex, null, 2)}\n`, "utf8");

    const result = await validateArtifactFreshness(runtime.artifacts, { artifactId: baselineRef.id });
    const entry = result.artifacts[0];
    assert.equal(entry.status, "stale");
    assert.ok(entry.issues.some((issue) => issue.code === "source.changed"));
    assert.ok(entry.issues.some((issue) => issue.code === "config.changed"));
    assert.ok(entry.issues.some((issue) => issue.code === "producer.version_changed"));
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

test("snapshot retains the latest member of every supersession family and declares complete lineage", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-snapshot-families-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [evidenceCapability()],
      logger: silentLogger,
    });

    const evidenceRef = await runtime.runObserve();
    const writeGraph = (id, sliceType) => runtime.artifacts.write({
      header: {
        ...testHeader("GraphSlice", id, [evidenceRef]),
        supersession: { key: sliceType },
      },
      sliceType,
      producer: "runtime-test",
      nodes: [],
      edges: [],
    }, { category: "graphs" });

    await writeGraph("graph-import-1", "import-graph");
    await writeGraph("graph-ownership-1", "ownership-graph");
    await writeGraph("graph-import-2", "import-graph");
    await runtime.artifacts.write({
      header: testHeader("ResolverPacket", "resolver-one", [evidenceRef]),
      resolver: "test",
    });
    await runtime.artifacts.write({
      header: testHeader("CommunityReport", "community-one", [evidenceRef]),
      value: true,
    });
    await runtime.artifacts.write({
      header: testHeader("Publication", "publication-0-legacy", [evidenceRef]),
      kind: "legacy",
      content: "legacy",
    });
    for (const [id, kind] of [["publication-1-agents", "agents"], ["publication-2-summary", "summary"]]) {
      await runtime.artifacts.write({
        header: {
          ...testHeader("Publication", id, [evidenceRef]),
          supersession: { key: kind },
        },
        kind,
        content: kind,
      });
    }

    const firstSnapshotRef = await runtime.runSnapshot();
    const firstSnapshot = await runtime.artifacts.read(firstSnapshotRef);
    assert.deepEqual(
      firstSnapshot.projections.GraphSlice.map((ref) => ref.id),
      ["graph-import-2", "graph-ownership-1"],
    );
    assert.equal(firstSnapshot.actions.ResolverPacket[0].id, "resolver-one");
    assert.equal(firstSnapshot.actions.CommunityReport[0].id, "community-one");
    assert.deepEqual(
      firstSnapshot.publications.Publication.map((ref) => ref.id),
      ["publication-1-agents", "publication-2-summary"],
    );

    const lineageRefs = [
      ...Object.values(firstSnapshot.inputs).flat(),
      ...Object.values(firstSnapshot.projections).flat(),
      ...Object.values(firstSnapshot.evaluations).flat(),
    ];
    assert.deepEqual(
      firstSnapshot.header.inputRefs.map((ref) => `${ref.type}:${ref.id}`).sort(),
      lineageRefs.map((ref) => `${ref.type}:${ref.id}`).sort(),
    );
    assert.equal(
      firstSnapshot.header.inputRefs.some((ref) =>
        ref.type === "Publication" || ref.type === "ResolverPacket" || ref.type === "CommunityReport"),
      false,
    );
    for (const ref of firstSnapshot.header.inputRefs) {
      assert.equal(typeof ref.digest, "string");
      assert.equal("artifactType" in ref, false);
      assert.equal("writtenAt" in ref, false);
    }

    await writeGraph("graph-import-3", "import-graph");
    const secondSnapshotRef = await runtime.runSnapshot();
    const secondSnapshot = await runtime.artifacts.read(secondSnapshotRef);
    assert.deepEqual(
      secondSnapshot.projections.GraphSlice.map((ref) => ref.id),
      ["graph-import-3", "graph-ownership-1"],
    );
    assert.equal(
      secondSnapshot.header.inputRefs.some((ref) => ref.type === "IntelligenceSnapshot"),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("snapshot explicit members exclude historical optional projections", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-snapshot-explicit-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [evidenceCapability()],
      logger: silentLogger,
    });
    const firstEvidence = await runtime.runObserve();
    const historicalGraphRef = await runtime.artifacts.write({
      header: testHeader("StepCapabilityGraph", "step-graph-historical", [firstEvidence]),
      steps: [],
      edges: [],
    }, { category: "graphs" });
    const currentEvidence = await runtime.runObserve();

    const snapshotRef = await runtime.runSnapshot({ artifactRefs: [currentEvidence] });
    const snapshot = await runtime.artifacts.read(snapshotRef);

    assert.equal(snapshot.projections.StepCapabilityGraph, undefined);
    assert.equal(
      snapshot.header.inputRefs.some((ref) => ref.id === historicalGraphRef.id),
      false,
    );
    assert.equal(snapshot.status.freshness, "fresh");
    assert.equal((await runtime.artifacts.read(historicalGraphRef)).header.artifactId, historicalGraphRef.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("snapshot selection uses indexed supersession keys without reading keyed upper-layer history", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-snapshot-index-keys-"));

  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const evidenceRef = await store.write(evidenceArtifact("evidence-current"));
    for (let index = 0; index < 32; index += 1) {
      await store.write({
        header: {
          ...testHeader("Publication", `publication-${index}`, [evidenceRef]),
          supersession: { key: `publication-kind-${index}` },
        },
        kind: `publication-kind-${index}`,
        content: "test",
      }, { category: "publications" });
    }

    let reads = 0;
    const instrumentedStore = {
      ...store,
      async read(ref) {
        reads += 1;
        return store.read(ref);
      },
    };
    await runSnapshot({
      repo: { id: "fixture", root },
      artifacts: instrumentedStore,
      permissions: { allowed: () => true },
      logger: silentLogger,
    });

    assert.equal(reads, 1, "only selected-lineage validation should read an indexed body");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("snapshot status is stale when the latest evidence has a changed tracked source", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-snapshot-stale-"));

  try {
    const source = "export const value = 1;\n";
    await writeFile(join(root, "index.ts"), source, "utf8");
    const runtime = await createRuntime({ repoRoot: root, repoId: "fixture", logger: silentLogger });
    await runtime.artifacts.write({
      header: {
        ...testHeader("EvidenceGraph", "evidence-source-baseline", []),
        invalidation: {
          inputs: [{ kind: "source", path: "index.ts", digest: digestJson(source) }],
        },
      },
      facts: [],
    });
    await writeFile(join(root, "index.ts"), "export const value = 2;\n", "utf8");

    const snapshotRef = await runtime.runSnapshot();
    const snapshot = await runtime.artifacts.read(snapshotRef);

    assert.equal(snapshot.status.freshness, "stale");
    assert.ok(snapshot.status.warnings.some((warning) => warning.includes("source.changed")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("snapshot status is stale when a selected projection is stale", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-runtime-snapshot-projection-stale-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [evidenceCapability()],
      logger: silentLogger,
    });
    const firstEvidence = await runtime.runObserve();
    await runtime.artifacts.write({
      header: testHeader("ObservedRepo", "observed-stale", [firstEvidence]),
      repository: { id: "fixture", root },
      systems: [],
      layers: [],
      capabilities: [],
    }, { category: "projections" });
    await runtime.runObserve();

    const snapshotRef = await runtime.runSnapshot();
    const snapshot = await runtime.artifacts.read(snapshotRef);

    assert.equal(snapshot.status.freshness, "stale");
    assert.ok(snapshot.status.warnings.some((warning) =>
      warning.includes("ObservedRepo stale: newer-input-exists"),
    ));
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
    assert.deepEqual(config, {
      capabilities: [],
      permissions: {},
      agentInstructions: {
        enabled: true,
        target: "AGENTS.md",
        sync: "on-refresh",
      },
    });
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

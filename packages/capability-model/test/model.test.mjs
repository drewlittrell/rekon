import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import modelCapability, {
  buildCapabilityEvidenceGraph,
  modelProjector,
} from "../dist/index.js";
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
    const ownershipRef = refs.find((ref) => ref.type === "OwnershipMap");
    const ownership = await runtime.artifacts.read(ownershipRef);
    assert.equal(ownership.entries[0].basis, "inferred");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("model capability projects only high-confidence semantic capabilities with artifact evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-model-semantic-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [modelCapability],
      logger: silentLogger,
    });
    const evidenceRef = await runtime.artifacts.write({
      header: {
        artifactType: "EvidenceGraph",
        artifactId: "evidence-semantic",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-13T00:00:00.000Z",
        subject: { repoId: "fixture" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
      },
      facts: [{
        kind: "ownership_hint",
        subject: "src/billing/service.ts",
        value: { path: "src/billing/service.ts", system: "billing", basis: "declared" },
        confidence: 1,
      }],
    });
    const semanticRef = await runtime.artifacts.write({
      header: {
        artifactType: "SemanticFileUnderstandingReport",
        artifactId: "semantic-billing",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-13T00:00:00.000Z",
        subject: { repoId: "fixture", paths: ["src/billing/service.ts"] },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
      },
      file: { path: "src/billing/service.ts", sha256: "sha", lineCount: 1, byteLength: 30 },
      normalizationTrace: { method: "semantic-llm", invokedSemanticUnderstanding: true, provenance: "semantic-llm", warnings: [] },
      summary: { purpose: "Billing", responsibilities: [], publicExports: [], imports: [], touchedConcepts: [] },
      capabilitySignals: [
        { id: "calculate:invoice-total", label: "calculate invoice total", confidence: "high", sourceEvidence: [{ excerpt: "calculateInvoiceTotal" }] },
        { id: "send:receipt", label: "send receipt", confidence: "medium", sourceEvidence: [{ excerpt: "receipt" }] },
      ],
      findings: [],
      boundaries: {
        executedCommands: false,
        wroteSourceFiles: false,
        createdPreparedIntentPlan: false,
        createdWorkOrder: false,
        createdVerificationPlan: false,
        generatedEmbeddings: false,
        ranCirce: false,
        implementedIntentGo: false,
      },
    });
    const capabilityGraph = buildCapabilityEvidenceGraph({
      root,
      files: [{
        path: "src/billing/service.ts",
        text: "export class InvoiceService { calculateInvoiceTotal() { return 0; } }",
        sha256: "sha",
      }],
      generatedAt: "2026-07-13T00:00:01.000Z",
      semanticFileUnderstandingReports: [{
        ref: semanticRef,
        report: await runtime.artifacts.read(semanticRef),
      }],
    });
    assert.deepEqual(capabilityGraph.header.inputRefs, [semanticRef]);
    const graphRef = await runtime.artifacts.write(capabilityGraph);

    const refs = await runtime.runProject();
    const capabilityMap = await runtime.artifacts.read(refs.find((ref) => ref.type === "CapabilityMap"));
    const observedRepo = await runtime.artifacts.read(refs.find((ref) => ref.type === "ObservedRepo"));

    assert.equal(capabilityMap.entries.some((entry) => entry.capability === "calculate:invoice total"), true);
    assert.equal(capabilityMap.entries.some((entry) => entry.capability === "send:receipt"), false);
    const semanticEntry = capabilityMap.entries.find((entry) => entry.capability === "calculate:invoice total");
    assert.deepEqual(semanticEntry.systems, ["billing"]);
    assert.equal(semanticEntry.evidence.some((ref) => ref.type === "CapabilityEvidenceGraph" && ref.id === graphRef.id), true);
    assert.equal(semanticEntry.evidence.some((ref) => ref.type === "SemanticFileUnderstandingReport" && ref.id === semanticRef.id), true);
    assert.equal(capabilityMap.header.inputRefs.some((ref) => ref.type === "EvidenceGraph" && ref.id === evidenceRef.id), true);
    assert.equal(capabilityMap.header.inputRefs.some((ref) => ref.type === "CapabilityEvidenceGraph" && ref.id === graphRef.id), true);
    assert.equal(observedRepo.header.inputRefs.some((ref) => ref.type === "CapabilityEvidenceGraph"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("model projector requests the newest optional artifacts instead of trusting list order", async () => {
  const evidenceRef = {
    type: "EvidenceGraph",
    id: "evidence-current",
    schemaVersion: "0.1.0",
  };
  const currentGraphRef = {
    type: "CapabilityEvidenceGraph",
    id: "capability-evidence-graph-current",
    schemaVersion: "0.1.0",
  };
  const staleGraphRef = {
    type: "CapabilityEvidenceGraph",
    id: "model-interface-adoption-graph",
    schemaVersion: "0.1.0",
  };
  const artifactsById = new Map([
    [evidenceRef.id, {
      header: {
        artifactType: evidenceRef.type,
        artifactId: evidenceRef.id,
        schemaVersion: evidenceRef.schemaVersion,
        generatedAt: "2026-07-23T00:00:00.000Z",
        subject: { repoId: "fixture" },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [],
      },
      facts: [],
    }],
    [currentGraphRef.id, {
      evidence: [],
      capabilities: [],
    }],
    // This intentionally represents an obsolete pre-current shape. The
    // projector must never read it when a newer graph is available.
    [staleGraphRef.id, {
      capabilities: [],
    }],
  ]);
  const listCalls = [];
  const writes = [];
  const artifacts = {
    async list(type, options) {
      listCalls.push({ type, options });
      if (type === "EvidenceGraph") return [evidenceRef];
      if (type === "CapabilityPhraseReport") return [];
      if (type === "CapabilityEvidenceGraph") {
        return options?.order === "newest" && options?.limit === 1
          ? [currentGraphRef]
          : [currentGraphRef, staleGraphRef];
      }
      return [];
    },
    async read(ref) {
      return artifactsById.get(ref.id);
    },
    async write(type, value) {
      writes.push({ type, value });
      return {
        type,
        id: value.header.artifactId,
        schemaVersion: value.header.schemaVersion,
      };
    },
  };

  await modelProjector.project({
    artifacts,
    input: { repoRoot: "/fixture" },
  });

  assert.equal(writes.length, 3);
  assert.deepEqual(
    listCalls,
    [
      { type: "EvidenceGraph", options: { order: "newest", limit: 1 } },
      { type: "CapabilityPhraseReport", options: { order: "newest", limit: 1 } },
      { type: "CapabilityEvidenceGraph", options: { order: "newest", limit: 1 } },
    ],
  );
});

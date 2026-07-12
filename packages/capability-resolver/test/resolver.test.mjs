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

test("preflight resolver writes a typed resolver packet with trace", async () => {
  await withFixture({
    evidenceFacts: [ownershipFact("src/index.ts", "src", 0.9)],
  }, async ({ runtime, snapshotRef }) => {
    const packet = await resolvePreflight(runtime, snapshotRef, "src/index.ts");

    assert.equal(packet.header.artifactType, "ResolverPacket");
    assert.equal(packet.goal, "modify bootstrap");
    assert.deepEqual(packet.ownerSystems, ["src"]);
    assert.equal(packet.risk.tier, "high");
    assert.deepEqual(packet.requiredChecks, ["npm run typecheck", "npm run test", "npm run build"]);
    assert.ok(Array.isArray(packet.resolutionTrace));
    assert.ok(packet.resolutionTrace.some((entry) => entry.step === "risk.evaluate"));
  });
});

test("preflight resolver prefers OwnershipMap over raw evidence ownership hints", async () => {
  await withFixture({
    evidenceFacts: [ownershipFact("src/index.ts", "raw", 0.9)],
    ownershipEntries: [{
      path: "src/index.ts",
      ownerSystem: "model",
      confidence: 0.86,
      evidence: [],
    }],
  }, async ({ runtime, snapshotRef }) => {
    const packet = await resolvePreflight(runtime, snapshotRef, "src/index.ts");

    assert.deepEqual(packet.ownerSystems, ["model"]);
    assert.deepEqual(packet.matchedScopes, [{
      path: "src/index.ts",
      owner: "model",
      confidence: 0.86,
    }]);
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "OwnershipMap" && entry.status === "used"));
    assert.equal(packet.resolutionTrace.some((entry) => entry.sourceType === "EvidenceGraph" && entry.status === "used"), false);
  });
});

test("preflight resolver falls back to ObservedRepo when OwnershipMap is unavailable", async () => {
  await withFixture({
    observedSystems: [{
      id: "observed",
      paths: ["src"],
      layers: [],
      capabilities: [],
      confidence: 0.74,
      evidence: [],
    }],
  }, async ({ runtime, snapshotRef }) => {
    const packet = await resolvePreflight(runtime, snapshotRef, "src/index.ts");

    assert.deepEqual(packet.ownerSystems, ["observed"]);
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "OwnershipMap" && entry.status === "missing"));
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "ObservedRepo" && entry.status === "used"));
  });
});

test("preflight resolver falls back to ownership GraphSlice", async () => {
  await withFixture({
    observedSystems: [{
      id: "unmatched",
      paths: ["other"],
      layers: [],
      capabilities: [],
      confidence: 0.6,
      evidence: [],
    }],
    graphEdges: [{
      source: "graph-owner",
      target: "src/index.ts",
      kind: "owns",
      evidence: [{ confidence: 0.81 }],
    }],
  }, async ({ runtime, snapshotRef }) => {
    const packet = await resolvePreflight(runtime, snapshotRef, "src/index.ts");

    assert.deepEqual(packet.ownerSystems, ["graph-owner"]);
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "ObservedRepo" && entry.status === "fallback"));
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "GraphSlice" && entry.status === "used"));
  });
});

test("preflight resolver falls back to raw EvidenceGraph ownership hints", async () => {
  await withFixture({
    evidenceFacts: [ownershipFact("src/index.ts", "raw", 0.67)],
  }, async ({ runtime, snapshotRef }) => {
    const packet = await resolvePreflight(runtime, snapshotRef, "src/index.ts");

    assert.deepEqual(packet.ownerSystems, ["raw"]);
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "EvidenceGraph" && entry.status === "used"));
    assert.ok(packet.warnings.includes("OwnershipMap unavailable; used EvidenceGraph ownership_hint fallback."));
  });
});

test("preflight resolver warns when ownership is unresolved", async () => {
  await withFixture({
    evidenceFacts: [],
  }, async ({ runtime, snapshotRef }) => {
    const packet = await resolvePreflight(runtime, snapshotRef, "features/plain.ts");

    assert.deepEqual(packet.ownerSystems, []);
    assert.equal(packet.risk.tier, "medium");
    assert.ok(packet.warnings.includes("Ownership unresolved for at least one requested path."));
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "OwnershipMap" && entry.status === "missing"));
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "ObservedRepo" && entry.status === "missing"));
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "GraphSlice" && entry.status === "missing"));
    assert.ok(packet.resolutionTrace.some((entry) => entry.sourceType === "Fallback" && entry.status === "warning"));
  });
});

test("preflight resolver records high risk trace for multiple owner systems", async () => {
  await withFixture({
    ownershipEntries: [
      { path: "src/index.ts", ownerSystem: "src", confidence: 0.8, evidence: [] },
      { path: "packages/runtime/src/index.ts", ownerSystem: "runtime", confidence: 0.8, evidence: [] },
    ],
  }, async ({ runtime, snapshotRef }) => {
    const packet = await resolvePreflight(runtime, snapshotRef, ["src/index.ts", "packages/runtime/src/index.ts"]);

    assert.equal(packet.risk.tier, "high");
    assert.ok(packet.resolutionTrace.some((entry) => (
      entry.step === "risk.evaluate" &&
      entry.details?.rule === "multiple_owner_systems"
    )));
  });
});

test("preflight resolver attaches assessments separately and uses only risks in risk evaluation", async () => {
  await withFixture({
    ownershipEntries: [
      { path: "features/plain.ts", ownerSystem: "features", confidence: 0.9, evidence: [] },
    ],
    assessmentReport: {
      assessments: [
        assessment("risk-1", "risk", "medium", "features/plain.ts"),
        assessment("opportunity-1", "opportunity", "high", "features/plain.ts"),
        assessment("unrelated-1", "risk", "high", "other/file.ts"),
      ],
    },
  }, async ({ runtime, snapshotRef }) => {
    const packet = await resolvePreflight(runtime, snapshotRef, "features/plain.ts");

    assert.deepEqual(packet.relevantAssessments.map((item) => item.id), ["opportunity-1", "risk-1"]);
    assert.deepEqual(packet.relevantFindings, []);
    assert.equal(packet.risk.tier, "medium");
    assert.ok(packet.resolutionTrace.some((entry) => (
      entry.sourceType === "AssessmentReport"
      && entry.status === "used"
      && entry.details?.relevantAssessmentCount === 2
    )));
    assert.ok(packet.resolutionTrace.some((entry) => entry.details?.rule === "relevant_risk_assessments"));
    assert.equal(packet.header.inputRefs.some((ref) => ref.type === "AssessmentReport"), true);
  });
});

async function withFixture(input, run) {
  const root = await mkdtemp(join(tmpdir(), "rekon-resolver-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      repoId: "fixture",
      capabilities: [resolverCapability],
      logger: silentLogger,
    });
    const refs = {};

    const evidenceRef = await runtime.artifacts.write({
      header: header("EvidenceGraph", "evidence-test", []),
      facts: input.evidenceFacts ?? [],
    });
    refs.evidenceRef = evidenceRef;

    if (input.ownershipEntries) {
      refs.ownershipRef = await runtime.artifacts.write({
        header: header("OwnershipMap", "ownership-test", [evidenceRef]),
        entries: input.ownershipEntries.map((entry) => ({
          ...entry,
          evidence: entry.evidence.length > 0 ? entry.evidence : [evidenceRef],
        })),
      }, { category: "projections" });
    }

    if (input.observedSystems) {
      refs.observedRepoRef = await runtime.artifacts.write({
        header: header("ObservedRepo", "observed-test", [evidenceRef]),
        repository: {
          id: "fixture",
          root,
        },
        systems: input.observedSystems.map((system) => ({
          ...system,
          evidence: system.evidence.length > 0 ? system.evidence : [evidenceRef],
        })),
        layers: [],
        capabilities: [],
      }, { category: "projections" });
    }

    if (input.graphEdges) {
      refs.graphRef = await runtime.artifacts.write({
        header: {
          ...header("GraphSlice", "ownership-graph-test", [evidenceRef]),
          provenance: {
            confidence: 0.8,
            notes: ["ownership-graph"],
          },
        },
        producer: "@rekon/capability-graph",
        nodes: [],
        edges: input.graphEdges.map((edge) => ({
          ...edge,
          evidence: edge.evidence.map((evidence) => ({
            source: "test",
            extractorVersion: "0.1.0",
            computedAt: "2026-05-13T17:00:00.000Z",
            ...evidence,
          })),
        })),
      }, { category: "graphs" });
    }

    if (input.findingReport) {
      refs.findingReportRef = await runtime.artifacts.write({
        header: header("FindingReport", "findings-test", [evidenceRef]),
        summary: {
          total: input.findingReport.findings.length,
          bySeverity: {},
          byType: {},
        },
        findings: input.findingReport.findings,
      }, { category: "findings" });
    }

    if (input.assessmentReport) {
      refs.assessmentReportRef = await runtime.artifacts.write({
        header: header("AssessmentReport", "assessments-test", [evidenceRef]),
        summary: { total: input.assessmentReport.assessments.length, byKind: {}, byImpact: {}, byType: {} },
        assessments: input.assessmentReport.assessments,
      }, { category: "findings" });
    }

    const snapshotRef = await runtime.artifacts.write({
      header: header("IntelligenceSnapshot", "snapshot-test", Object.values(refs)),
      repo: {
        id: "fixture",
        root,
      },
      inputs: {
        EvidenceGraph: [evidenceRef],
      },
      projections: {
        ...(refs.ownershipRef ? { OwnershipMap: [refs.ownershipRef] } : {}),
        ...(refs.observedRepoRef ? { ObservedRepo: [refs.observedRepoRef] } : {}),
        ...(refs.graphRef ? { GraphSlice: [refs.graphRef] } : {}),
      },
      evaluations: {
        ...(refs.findingReportRef ? { FindingReport: [refs.findingReportRef] } : {}),
        ...(refs.assessmentReportRef ? { AssessmentReport: [refs.assessmentReportRef] } : {}),
      },
      publications: {},
      actions: {},
      status: {
        freshness: "fresh",
        warnings: [],
        blockedReasons: [],
      },
    }, { category: "snapshots" });

    await run({ runtime, snapshotRef, refs });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function resolvePreflight(runtime, snapshotRef, pathOrPaths) {
  const refs = await runtime.runResolve({
    resolverId: "resolve.preflight",
    input: {
      snapshotRef,
      ...(Array.isArray(pathOrPaths) ? { paths: pathOrPaths } : { path: pathOrPaths }),
      goal: "modify bootstrap",
    },
  });

  return runtime.artifacts.read(refs[0]);
}

function ownershipFact(path, system, confidence) {
  return {
    kind: "ownership_hint",
    subject: path,
    value: {
      path,
      system,
    },
    confidence,
  };
}

function assessment(id, kind, impact, path) {
  return {
    id,
    kind,
    type: kind,
    impact,
    title: id,
    description: `${kind} for ${path}`,
    subjects: [path],
    files: [path],
    evidence: [{ type: "EvidenceGraph", id: "evidence-test", schemaVersion: "0.1.0" }],
    rootCauseKey: `${kind}:${path}`,
    confidence: {
      score: 0.8,
      basis: "deterministic",
      verification: "corroborated",
      rationale: "test fixture",
    },
  };
}

function header(artifactType, artifactId, inputRefs) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-13T17:00:00.000Z",
    subject: {
      repoId: "fixture",
    },
    producer: {
      id: "test",
      version: "0.1.0",
    },
    inputRefs,
    provenance: {
      confidence: 1,
    },
  };
}

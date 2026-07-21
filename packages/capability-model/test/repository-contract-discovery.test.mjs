import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRepositoryIntelligenceGraph,
  discoverRepositoryContractCandidates,
} from "../dist/index.js";

function header(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-20T22:00:00.000Z",
    subject: { repoId: "example" },
    producer: { id: "test", version: "1.0.0" },
    inputRefs: [],
  };
}

test("cold-start discovery drafts system law and a bounded end-to-end flow", () => {
  const ownershipMap = {
    header: header("OwnershipMap", "owners"),
    entries: [
      { path: "src/route.ts", ownerSystem: "api", basis: "inferred", confidence: 0.8, evidence: [] },
      { path: "src/service.ts", ownerSystem: "intelligence", basis: "inferred", confidence: 0.8, evidence: [] },
    ],
  };
  const graph = buildRepositoryIntelligenceGraph({
    graphSlices: [{
      header: header("GraphSlice", "behavior"),
      sliceType: "behavior-graph",
      nodes: [
        { kind: "route", id: "POST /experience" },
        { kind: "file", id: "src/service.ts" },
        { kind: "event", id: "ExperienceSelected" },
      ],
      edges: [
        { source: "POST /experience", target: "src/service.ts", kind: "calls", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "src/service.ts", target: "ExperienceSelected", kind: "emits", evidence: [{ source: "runtime", confidence: 1 }] },
      ],
    }],
    ownershipMap,
  });
  const observedRepo = {
    header: header("ObservedRepo", "repo"),
    repository: { id: "example", root: "/example" },
    systems: [{
      id: "intelligence",
      purpose: "Compose meaning and select experiences.",
      paths: ["src/service.ts"],
      layers: ["domain"],
      capabilities: ["select experience"],
      confidence: 0.9,
      evidence: [],
    }],
    layers: ["domain"],
    capabilities: ["select experience"],
  };

  const report = discoverRepositoryContractCandidates({
    repoId: "example",
    generatedAt: "2026-07-20T22:00:00.000Z",
    graph,
    observedRepo,
    ownershipMap,
  });

  const system = report.candidates.find((candidate) => candidate.kind === "system");
  const flow = report.candidates.find((candidate) => candidate.kind === "flow");
  assert.equal(system.targetId, "intelligence");
  assert.equal(system.proposed.purpose, "Compose meaning and select experiences.");
  assert.equal(flow.proposed.stages.length, 3);
  assert.equal(flow.proposed.handoffs.length, 2);
  assert.deepEqual(flow.proposed.handoffs[0].carriedInvariantIds, [flow.proposed.invariants[0].id]);
  assert.equal(flow.proposed.criticality, "high");
});

test("discovery does not duplicate adopted contracts and reports uncovered entries", () => {
  const graph = buildRepositoryIntelligenceGraph({
    graphSlices: [{
      header: header("GraphSlice", "routes"),
      nodes: [{ kind: "route", id: "GET /health" }],
      edges: [],
    }],
  });
  const observedRepo = {
    header: header("ObservedRepo", "repo"),
    repository: { id: "example", root: "/example" },
    systems: [{ id: "api", paths: ["src/api.ts"], layers: [], capabilities: [], confidence: 0.8, evidence: [] }],
    layers: [],
    capabilities: [],
  };
  const effectiveRegistry = {
    header: header("EffectiveContractRegistry", "registry"),
    entries: [{
      contractType: "SystemContract",
      contractId: "api",
      authority: "adopted",
      confidence: 1,
      ref: { type: "SystemContract", id: "api-contract", schemaVersion: "1.0.0" },
      systems: ["api"],
      paths: ["src/**"],
      flowIds: [],
      clauseIds: ["api.preserve"],
    }],
    summary: { total: 1, byAuthority: { observed: 0, inferred: 0, corroborated: 0, adopted: 1 }, byType: { SystemContract: 1, CapabilityContract: 0, HandoffContract: 0, FlowContract: 0 } },
  };

  const report = discoverRepositoryContractCandidates({ repoId: "example", graph, observedRepo, effectiveRegistry });

  assert.equal(report.candidates.some((candidate) => candidate.targetId === "api"), false);
  assert.ok(report.unresolved.some((entry) => entry.id.includes("GET-health")));

  const reconsidered = discoverRepositoryContractCandidates({
    repoId: "example",
    graph,
    observedRepo,
    effectiveRegistry,
    reconsiderContractIds: ["SystemContract:api"],
  });
  assert.equal(reconsidered.candidates.some((candidate) => candidate.targetId === "api"), true);
});

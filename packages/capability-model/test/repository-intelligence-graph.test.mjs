import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryIntelligenceGraph } from "../dist/index.js";

function header(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-20T21:00:00.000Z",
    subject: { repoId: "example" },
    producer: { id: "test", version: "1.0.0" },
    inputRefs: [],
  };
}

test("unified graph view composes topology, ownership, steps, capabilities, and contracts", () => {
  const view = buildRepositoryIntelligenceGraph({
    capabilityGraph: {
      header: header("CapabilityEvidenceGraph", "cap-graph"),
      nodes: [{ kind: "file", id: "src/service.ts" }],
      capabilities: [{
        id: "cap:select-experience",
        verb: "select",
        noun: "experience",
        implementedBy: [{ kind: "file", id: "src/service.ts" }],
        evidenceRefs: ["evidence:capability"],
      }],
    },
    graphSlices: [{
      header: header("GraphSlice", "imports"),
      sliceType: "import-graph",
      nodes: [{ id: "src/service.ts", kind: "file" }, { id: "src/contract.ts", kind: "file" }],
      edges: [{ source: "src/service.ts", target: "src/contract.ts", kind: "imports", evidence: [{ source: "ast", confidence: 1 }] }],
    }],
    ownershipMap: {
      header: header("OwnershipMap", "owners"),
      entries: [{ path: "src/service.ts", ownerSystem: "intelligence", basis: "declared", confidence: 1, evidence: [] }],
    },
    stepGraph: {
      header: header("StepCapabilityGraph", "steps"),
      steps: [{ id: "select" }],
      capabilityEdges: [{ id: "step-cap", stepId: "select", capabilityId: "cap:select-experience", verb: "select", noun: "experience", confidence: "high", evidenceRefs: [] }],
      fileEdges: [{ id: "step-file", stepId: "select", path: "src/service.ts", evidenceRefs: [] }],
      systemEdges: [{ id: "step-system", stepId: "select", system: "intelligence", evidenceRefs: [] }],
    },
    contractRegistry: {
      header: header("EffectiveContractRegistry", "registry"),
      entries: [{
        contractType: "SystemContract",
        contractId: "intelligence",
        authority: "adopted",
        confidence: 1,
        ref: { type: "SystemContract", id: "system-contract", schemaVersion: "1.0.0" },
        systems: ["intelligence"],
        paths: ["src/**"],
        flowIds: [],
        clauseIds: ["compositional"],
      }],
    },
  });

  assert.ok(view.claims.some((claim) => claim.predicate === "imports"));
  assert.ok(view.claims.some((claim) => claim.predicate === "owns" && claim.authority === "adopted"));
  assert.ok(view.claims.some((claim) => claim.predicate === "performs"));
  assert.ok(view.claims.some((claim) => claim.predicate === "declares" && claim.object.id === "compositional"));
  assert.ok(view.capabilities.some((capability) => capability.id === "cap:select-experience"));
  assert.deepEqual(view.inputRefs.map((ref) => ref.id).sort(), ["cap-graph", "imports", "owners", "registry", "steps"]);
});

test("unified graph dedupes equivalent claims and retains stronger authority", () => {
  const view = buildRepositoryIntelligenceGraph({
    ownershipMap: {
      entries: [
        { path: "src/a.ts", ownerSystem: "core", basis: "inferred", confidence: 0.7, evidence: [] },
        { path: "src/a.ts", ownerSystem: "core", basis: "declared", confidence: 1, evidence: [] },
      ],
    },
  });

  const claims = view.claims.filter((claim) => claim.predicate === "owns");
  assert.equal(claims.length, 1);
  assert.equal(claims[0].authority, "adopted");
  assert.equal(claims[0].confidence, 1);
});

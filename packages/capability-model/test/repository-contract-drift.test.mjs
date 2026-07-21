import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryContractDriftReport } from "../dist/index.js";

function header(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-20T20:00:00.000Z",
    subject: { repoId: "example" },
    producer: { id: "@rekon/capability-model", version: "1.0.0" },
    inputRefs: [],
  };
}

const registryRef = { type: "EffectiveContractRegistry", id: "registry-1", schemaVersion: "1.0.0" };

test("contract drift detects changed law sources and expanded ownership scope", () => {
  const contractRef = { type: "SystemContract", id: "system-intelligence", schemaVersion: "1.0.0" };
  const report = buildRepositoryContractDriftReport({
    repoId: "example",
    generatedAt: "2026-07-20T21:00:00.000Z",
    registryRef,
    registry: {
      header: header("EffectiveContractRegistry", "registry-1"),
      entries: [{ contractType: "SystemContract", contractId: "intelligence", authority: "adopted", confidence: 1, ref: contractRef, systems: ["intelligence"], paths: ["src/intelligence/**"], flowIds: [], clauseIds: ["evidence-first"] }],
      summary: { total: 1, byAuthority: { observed: 0, inferred: 0, corroborated: 0, adopted: 1 }, byType: { SystemContract: 1, CapabilityContract: 0, HandoffContract: 0, FlowContract: 0 } },
    },
    contracts: [{
      header: header("SystemContract", "system-intelligence"),
      contractId: "intelligence",
      authority: "adopted",
      confidence: 1,
      source: { path: "rekon/contracts/systems/intelligence.json", digest: "a".repeat(64) },
      system: { id: "intelligence", paths: ["src/intelligence/**"] },
      purpose: "Compile repository intelligence.",
      userOutcomes: [],
      invariants: [],
      prohibitedChanges: [],
      requiredContextPaths: ["src/intelligence/index.ts"],
      requiredChecks: [],
    }],
    sources: [{ path: "rekon/contracts/systems/intelligence.json", digest: "b".repeat(64) }],
    graph: { nodes: [{ kind: "file", id: "src/intelligence/index.ts" }, { kind: "file", id: "src/new-system.ts" }], claims: [], capabilities: [], inputRefs: [], warnings: [] },
    observedRepo: {
      header: header("ObservedRepo", "repo-1"),
      repository: { id: "example", root: "." },
      systems: [{ id: "intelligence", paths: ["src/intelligence/index.ts", "src/new-system.ts"], layers: [], capabilities: [], confidence: 0.9, evidence: [] }],
      layers: [],
      capabilities: [],
    },
  });

  assert.equal(report.summary.drifted, 1);
  assert.ok(report.entries[0].reasons.some((reason) => reason.code === "contract.source_changed"));
  assert.ok(report.entries[0].reasons.some((reason) => reason.code === "contract.system_scope_uncovered" && reason.paths.includes("src/new-system.ts")));
});

test("contract drift keeps source-matched flow law current and reports missing registry artifacts", () => {
  const flowRef = { type: "FlowContract", id: "flow-request", schemaVersion: "1.0.0" };
  const missingRef = { type: "SystemContract", id: "system-missing", schemaVersion: "1.0.0" };
  const report = buildRepositoryContractDriftReport({
    repoId: "example",
    registryRef,
    registry: {
      header: header("EffectiveContractRegistry", "registry-1"),
      entries: [
        { contractType: "FlowContract", contractId: "request", authority: "adopted", confidence: 1, ref: flowRef, systems: [], paths: ["src/server.ts"], flowIds: ["request"], clauseIds: [] },
        { contractType: "SystemContract", contractId: "missing", authority: "adopted", confidence: 1, ref: missingRef, systems: ["missing"], paths: [], flowIds: [], clauseIds: [] },
      ],
      summary: { total: 2, byAuthority: { observed: 0, inferred: 0, corroborated: 0, adopted: 2 }, byType: { SystemContract: 1, CapabilityContract: 0, HandoffContract: 0, FlowContract: 1 } },
    },
    contracts: [{
      header: header("FlowContract", "flow-request"),
      contractId: "request",
      authority: "adopted",
      confidence: 1,
      source: { path: "rekon/contracts/flows/request.json", digest: "c".repeat(64) },
      name: "Request",
      criticality: "high",
      purpose: "Serve a request.",
      userOutcomes: ["Response returned."],
      entryConditions: [],
      completionConditions: ["Response returned."],
      systems: [],
      paths: ["src/server.ts"],
      invariants: [],
      stages: [{ id: "request", paths: ["src/server.ts"], evidenceRefs: [] }],
      handoffs: [],
      requiredChecks: [],
    }],
    sources: [{ path: "rekon/contracts/flows/request.json", digest: "c".repeat(64) }],
    graph: { nodes: [{ kind: "file", id: "src/server.ts" }], claims: [], capabilities: [], inputRefs: [], warnings: [] },
  });

  assert.equal(report.summary.current, 1);
  assert.equal(report.summary.unverified, 1);
  assert.equal(report.entries.find((entry) => entry.contractId === "request").status, "current");
  assert.equal(report.entries.find((entry) => entry.contractId === "missing").reasons[0].code, "contract.artifact_missing");
});

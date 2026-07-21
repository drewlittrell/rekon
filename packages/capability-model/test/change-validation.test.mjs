import assert from "node:assert/strict";
import test from "node:test";

import { validateChange } from "../dist/index.js";

const ref = (type, id) => ({ type, id, schemaVersion: "1.0.0" });
const header = (artifactType, artifactId) => ({
  artifactType,
  artifactId,
  schemaVersion: "1.0.0",
  generatedAt: "2026-07-21T00:00:00.000Z",
  subject: { repoId: "fixture" },
  producer: { id: "@rekon/test", version: "1.0.0" },
  inputRefs: [],
  freshness: { status: "fresh" },
  provenance: { confidence: 1 },
});

function pact(overrides = {}) {
  return {
    header: header("TaskPact", "task-pact-fixture"),
    task: { text: "change bootstrap", paths: ["src/index.ts"] },
    contracts: [],
    requiredContextPaths: [],
    constraints: [],
    impactObligations: [],
    requiredChecks: [],
    warnings: [],
    summary: { contracts: 0, constraints: 0, impactObligations: 0, requiredContextPaths: 0, requiredChecks: 0 },
    ...overrides,
  };
}

const ownershipMap = {
  header: header("OwnershipMap", "ownership-fixture"),
  entries: [
    { path: "src/index.ts", ownerSystem: "app", confidence: 1, evidence: [] },
    { path: "src/runtime.ts", ownerSystem: "runtime", confidence: 1, evidence: [] },
    { path: "src/forbidden.ts", ownerSystem: "runtime", confidence: 1, evidence: [] },
  ],
};

function systemContract(id, paths, requiredChecks) {
  return {
    header: header("SystemContract", id),
    contractId: id,
    authority: "adopted",
    confidence: 1,
    source: { sourceId: "fixture" },
    system: { id, paths },
    purpose: `Own ${id}.`,
    userOutcomes: [],
    invariants: [],
    prohibitedChanges: [],
    requiredContextPaths: [],
    requiredChecks,
  };
}

test("a direct, observed change with no semantic clauses passes", () => {
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    files: [{ path: "src/index.ts", status: "modified", beforeSha256: "a", afterSha256: "b" }],
  });

  assert.equal(result.status, "passed");
  assert.deepEqual(result.affectedSystems, ["app"]);
  assert.deepEqual(result.blockingViolations, []);
  assert.deepEqual(result.unresolvedSemanticObligations, []);
  assert.deepEqual(result.boundaries, {
    wroteArtifact: false,
    wroteSource: false,
    executedChecks: false,
    invokedModel: false,
  });
});

test("paths outside direct and contract scope fail deterministically", () => {
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["scripts/release.mjs"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    files: [{ path: "scripts/release.mjs", status: "added", afterSha256: "b" }],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockingViolations.some((entry) => entry.code === "change.outside-task-pact"));
});

test("flow and baton clauses become agent-owned semantic obligations", () => {
  const flowRef = ref("FlowContract", "bootstrap-flow");
  const taskPact = pact({
    contracts: [{
      contractType: "FlowContract",
      contractId: "bootstrap-flow",
      authority: "adopted",
      confidence: 1,
      freshness: "fresh",
      ref: flowRef,
    }],
    constraints: [{
      id: "bootstrap-flow.handoff.payload",
      kind: "handoff",
      statement: "Preserve bootstrap/runtime compatibility.",
      paths: ["src/**"],
      contractRef: flowRef,
      authority: "adopted",
      confidence: 1,
    }],
    impactObligations: [{
      id: "preserve:bootstrap-flow",
      kind: "preserve",
      statement: "Preserve the complete bootstrap outcome.",
      paths: ["src/**"],
      requiredChecks: ["npm test"],
      contractRefs: [flowRef],
    }],
    requiredChecks: ["npm test"],
  });
  const flow = {
    header: header("FlowContract", "bootstrap-flow"),
    contractId: "bootstrap-flow",
    authority: "adopted",
    confidence: 1,
    source: {},
    name: "Bootstrap flow",
    criticality: "high",
    purpose: "Start the runtime",
    userOutcomes: ["The runtime starts"],
    entryConditions: [],
    completionConditions: ["Runtime ready"],
    systems: ["app", "runtime"],
    paths: ["src/**"],
    invariants: [],
    stages: [
      { id: "entry", paths: ["src/index.ts"], evidenceRefs: [] },
      { id: "runtime", paths: ["src/runtime.ts"], evidenceRefs: [] },
    ],
    handoffs: [{
      id: "entry-runtime",
      fromStageId: "entry",
      toStageId: "runtime",
      payload: { requiredFields: ["configuration"] },
      guarantees: ["Forward configuration unchanged."],
      failureSemantics: "Surface startup failure.",
      evidenceRefs: [],
    }],
    requiredChecks: ["npm test"],
  };

  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts", "src/runtime.ts"],
    baseRef: "HEAD",
    taskPact,
    ownershipMap,
    flowContracts: [flow],
    files: [
      { path: "src/index.ts", status: "modified" },
      { path: "src/runtime.ts", status: "modified" },
    ],
  });

  assert.equal(result.status, "needs-judgment");
  assert.deepEqual(result.affectedFlows, ["bootstrap-flow"]);
  assert.ok(result.unresolvedSemanticObligations.some((entry) =>
    entry.statement === "Forward configuration unchanged."));
  assert.ok(result.unresolvedSemanticObligations.some((entry) =>
    entry.statement.includes("configuration")));
  assert.deepEqual(result.requiredChecks, ["npm test"]);
});

test("capability dependency policy blocks a forbidden neighbor", () => {
  const graph = {
    header: header("CapabilityEvidenceGraph", "graph"),
    schemaVersion: "0.1.0",
    status: { value: "built", reason: "fixture" },
    nodes: [],
    evidence: [],
    claims: [],
    capabilities: [
      { id: "source", verb: "manage", noun: "bootstrap", implementedBy: [{ kind: "file", id: "src/index.ts" }], entrypoints: [], sideEffects: [], dependencies: [], consumers: [], confidence: 1, evidenceRefs: [] },
      { id: "target", verb: "write", noun: "runtime", implementedBy: [{ kind: "file", id: "src/forbidden.ts" }], entrypoints: [], sideEffects: [], dependencies: [], consumers: [], confidence: 1, evidenceRefs: [] },
    ],
    summary: { files: 2, symbols: 0, capabilities: 2, facts: 0, inferences: 0, recommendations: 0, evidence: 0 },
    boundaries: { usedLlm: false, generatedEmbeddings: false, executedCommands: false, wroteSourceFiles: false, createdPreparedIntentPlan: false, createdWorkOrder: false, createdVerificationPlan: false, ranCirce: false, implementedIntentGo: false },
  };
  const capabilityContract = {
    header: header("CapabilityContract", "capability-contract"),
    source: { capabilityMapRef: ref("CapabilityMap", "map") },
    summary: { total: 1, configured: 1, suggested: 0, unmatched: 0, withRequiredChecks: 1, withPlacementRules: 0, withPreservationRules: 0 },
    contracts: [{
      id: "bootstrap-policy",
      status: "configured",
      match: { verb: "manage", noun: "bootstrap" },
      capabilityRef: { capabilityMapRef: ref("CapabilityMap", "map"), phraseCapabilityId: "source" },
      forbiddenNeighbors: [{ verb: "write", noun: "runtime" }],
      requiredChecks: ["npm test"],
    }],
  };

  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    capabilityGraph: graph,
    capabilityContract,
    files: [{ path: "src/index.ts", status: "modified" }],
    dependencyChanges: [{
      path: "src/index.ts",
      added: [{ specifier: "./forbidden.js", resolvedPath: "src/forbidden.ts" }],
      removed: [],
      current: [{ specifier: "./forbidden.js", resolvedPath: "src/forbidden.ts" }],
    }],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockingViolations.some((entry) => entry.code === "dependency.forbidden-neighbor"));
  assert.deepEqual(result.requiredChecks, ["npm test"]);
});

test("check selection retains only contracts touched by the observed diff", () => {
  const appRef = ref("SystemContract", "app");
  const runtimeRef = ref("SystemContract", "runtime");
  const taskPact = pact({
    contracts: [
      { contractType: "SystemContract", contractId: "app", authority: "adopted", confidence: 1, freshness: "fresh", ref: appRef },
      { contractType: "SystemContract", contractId: "runtime", authority: "adopted", confidence: 1, freshness: "fresh", ref: runtimeRef },
    ],
    requiredChecks: ["npm run app-test", "npm run runtime-test"],
  });

  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact,
    taskPactRef: ref("TaskPact", "task-pact-fixture"),
    ownershipMap,
    systemContracts: [
      systemContract("app", ["src/index.ts"], ["npm run app-test"]),
      systemContract("runtime", ["src/runtime.ts"], ["npm run runtime-test"]),
    ],
    taskChecks: [{ command: "npm run typecheck", evidenceRefs: ["TaskContextReport:task"] }],
    files: [{ path: "src/index.ts", status: "modified" }],
  });

  assert.deepEqual(result.requiredChecks, ["npm run typecheck", "npm run app-test"]);
  assert.equal(result.checkSelection.strategy, "changed-scope");
  assert.equal(result.checkSelection.fallbackUsed, false);
  assert.deepEqual(
    result.checkSelection.checks.map((check) => check.requirements.map((entry) => entry.sourceType)),
    [["task-context"], ["system-contract"]],
  );
});

test("check selection retains the conservative TaskPact set when contract bodies are unavailable", () => {
  const taskPact = pact({
    contracts: [{
      contractType: "SystemContract",
      contractId: "app",
      authority: "adopted",
      confidence: 1,
      freshness: "fresh",
      ref: ref("SystemContract", "app"),
    }],
    requiredChecks: ["npm run app-test", "npm run typecheck"],
  });

  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact,
    ownershipMap,
    files: [{ path: "src/index.ts", status: "modified" }],
  });

  assert.deepEqual(result.requiredChecks, ["npm run app-test", "npm run typecheck"]);
  assert.equal(result.checkSelection.fallbackUsed, true);
  assert.ok(result.checkSelection.checks.every((check) =>
    check.requirements.some((entry) => entry.sourceType === "task-pact-fallback")));
});

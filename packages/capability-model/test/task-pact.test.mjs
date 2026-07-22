import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTaskPact,
  compileTaskContext,
  projectModelContextDelivery,
  projectModelContext,
  selectTaskContractGuidance,
} from "../dist/index.js";

const generatedAt = "2026-07-20T20:00:00.000Z";

function header(artifactType, artifactId, paths = []) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "1.0.0",
    generatedAt,
    subject: { repoId: "example", ...(paths.length > 0 ? { paths } : {}) },
    producer: { id: "@rekon/capability-model", version: "1.0.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

const systemRef = { type: "SystemContract", id: "system-api", schemaVersion: "1.0.0" };
const flowRef = { type: "FlowContract", id: "flow-request", schemaVersion: "1.0.0" };
const registryRef = { type: "EffectiveContractRegistry", id: "registry-1", schemaVersion: "1.0.0" };
const driftRef = { type: "ContractDriftReport", id: "drift-1", schemaVersion: "1.0.0" };

const clause = (id, statement) => ({
  id,
  statement,
  authority: "adopted",
  confidence: 1,
  sourceRefs: [{ path: "rekon/contracts/api.json", digest: "a".repeat(64) }],
  evidenceRefs: [],
});

const systemContract = {
  header: header("SystemContract", systemRef.id, ["src/api/**"]),
  contractId: "api-system",
  authority: "adopted",
  confidence: 1,
  source: { path: "rekon/contracts/api.json", digest: "a".repeat(64) },
  system: { id: "api", paths: ["src/api/**"] },
  purpose: "Accept requests without changing their meaning.",
  userOutcomes: ["Equivalent requests behave consistently."],
  invariants: [clause("request-meaning", "Preserve normalized request meaning.")],
  prohibitedChanges: [clause("no-route-overfit", "Do not add route-specific semantic aliases.")],
  requiredContextPaths: ["src/api/request-contract.ts"],
  requiredChecks: ["npm test -- api"],
};

const flowContract = {
  header: header("FlowContract", flowRef.id, ["src/api/route.ts", "src/domain/handler.ts"]),
  contractId: "request-flow",
  authority: "adopted",
  confidence: 0.95,
  source: { path: "rekon/contracts/request-flow.json", digest: "b".repeat(64) },
  name: "Request processing",
  criticality: "high",
  purpose: "Carry a request from the route to the domain outcome.",
  userOutcomes: ["The caller receives the domain result."],
  entryConditions: ["A valid request arrives."],
  completionConditions: ["A response is returned."],
  systems: ["api", "domain"],
  paths: ["src/api/route.ts", "src/domain/handler.ts"],
  invariants: [clause("request-id", "Preserve the request id across the flow.")],
  stages: [
    { id: "route", paths: ["src/api/route.ts"], evidenceRefs: [] },
    { id: "handle", paths: ["src/domain/handler.ts"], evidenceRefs: [] },
  ],
  handoffs: [{
    id: "route-to-handler",
    fromStageId: "route",
    toStageId: "handle",
    guarantees: ["The normalized request reaches the handler."],
    failureSemantics: "Handler failures remain typed domain failures.",
    verification: {
      acceptedMethods: ["test", "runtime"],
      acceptancePolicy: "any-supported",
      requiredChecks: ["npm run test -- route-to-handler"],
    },
    evidenceRefs: [],
  }],
  requiredChecks: ["npm test -- request-flow"],
};

const registry = {
  header: header("EffectiveContractRegistry", registryRef.id),
  entries: [
    {
      contractType: "SystemContract",
      contractId: systemContract.contractId,
      authority: "adopted",
      confidence: 1,
      ref: systemRef,
      systems: ["api"],
      paths: ["src/api/**"],
      flowIds: [],
      clauseIds: ["request-meaning", "no-route-overfit"],
    },
    {
      contractType: "FlowContract",
      contractId: flowContract.contractId,
      authority: "adopted",
      confidence: 0.95,
      ref: flowRef,
      systems: ["api", "domain"],
      paths: flowContract.paths,
      flowIds: [flowContract.contractId],
      clauseIds: ["request-id"],
    },
  ],
  summary: {
    total: 2,
    byAuthority: { observed: 0, inferred: 0, corroborated: 0, adopted: 2 },
    byType: { SystemContract: 1, CapabilityContract: 0, HandoffContract: 0, FlowContract: 1 },
  },
};

const graph = {
  nodes: [
    { kind: "file", id: "src/api/route.ts" },
    { kind: "file", id: "src/api/request-contract.ts" },
    { kind: "file", id: "src/domain/handler.ts" },
  ],
};

test("task pact selects adopted system and whole-flow law for a scoped path", () => {
  const pact = buildTaskPact({
    repoId: "example",
    taskText: "Change request routing.",
    paths: ["src/api/route.ts"],
    generatedAt,
    registry,
    registryRef,
    systemContracts: [systemContract],
    flowContracts: [flowContract],
  });

  assert.deepEqual(pact.contracts.map((contract) => `${contract.contractType}:${contract.contractId}`), [
    "SystemContract:api-system",
    "FlowContract:request-flow",
  ]);
  assert.ok(pact.constraints.some((constraint) => constraint.statement === "Preserve normalized request meaning."));
  assert.ok(pact.constraints.some((constraint) => constraint.statement === "The normalized request reaches the handler."));
  assert.ok(pact.requiredContextPaths.includes("src/domain/handler.ts"));
  assert.ok(pact.impactObligations.some((obligation) => obligation.kind === "inspect"));
  assert.deepEqual(pact.requiredChecks, [
    "npm run test -- route-to-handler",
    "npm test -- api",
    "npm test -- request-flow",
  ]);
  assert.deepEqual(pact.header.inputRefs, [registryRef, systemRef, flowRef]);
});

test("task pact selects verifier checks only for handoffs intersecting the task", () => {
  const flow = structuredClone(flowContract);
  flow.stages.push({ id: "audit", paths: ["src/audit/write.ts"], evidenceRefs: [] });
  flow.handoffs.push({
    id: "handler-to-audit",
    fromStageId: "handle",
    toStageId: "audit",
    verification: {
      acceptedMethods: ["test"],
      requiredChecks: ["npm run test -- handler-to-audit"],
    },
    evidenceRefs: [],
  });
  const pact = buildTaskPact({
    repoId: "example",
    taskText: "Change request routing.",
    paths: ["src/api/route.ts"],
    generatedAt,
    registry,
    registryRef,
    systemContracts: [systemContract],
    flowContracts: [flow],
  });

  assert.ok(pact.requiredChecks.includes("npm run test -- route-to-handler"));
  assert.ok(!pact.requiredChecks.includes("npm run test -- handler-to-audit"));
});

test("task pact excludes contracts absent from the effective registry", () => {
  const pact = buildTaskPact({
    repoId: "example",
    taskText: "Change request routing.",
    paths: ["src/api/route.ts"],
    generatedAt,
    registry: { ...registry, entries: [], summary: { ...registry.summary, total: 0 } },
    registryRef,
    systemContracts: [systemContract],
    flowContracts: [flowContract],
  });

  assert.equal(pact.contracts.length, 0);
  assert.equal(pact.constraints.length, 0);
});

test("task pact surfaces drift and reaches the compact model context", () => {
  const driftReport = {
    header: header("ContractDriftReport", driftRef.id),
    registryRef,
    entries: [{
      contractType: "FlowContract",
      contractId: flowContract.contractId,
      status: "drifted",
      reasons: [{ code: "contract.flow_stage_missing", message: "The handler stage is missing." }],
      contractRef: flowRef,
      evidenceRefs: [],
    }],
    summary: { total: 1, current: 0, drifted: 1, unverified: 0 },
  };
  const pact = buildTaskPact({
    repoId: "example",
    taskText: "Change request routing.",
    paths: ["src/api/route.ts"],
    generatedAt,
    registry,
    registryRef,
    systemContracts: [systemContract],
    flowContracts: [flowContract],
    driftReport,
    driftReportRef: driftRef,
  });
  const guidance = selectTaskContractGuidance({
    paths: ["src/api/route.ts"],
    graph,
    taskPact: pact,
  });
  const { packet } = compileTaskContext({
    taskText: "Change request routing.",
    paths: ["src/api/route.ts"],
    graph,
    inputRefs: [registryRef, driftRef],
    declaredContextPaths: guidance.requiredContextPaths,
    declaredConstraints: guidance.constraints,
    declaredVerificationHints: guidance.verificationHints,
    warnings: guidance.warnings,
    generatedAt,
  });
  const delivery = projectModelContextDelivery(projectModelContext(packet));

  assert.deepEqual(guidance.matchedSystemContractIds, ["api-system"]);
  assert.deepEqual(guidance.matchedFlowContractIds, ["request-flow"]);
  assert.ok(guidance.warnings.some((warning) => /FlowContract:request-flow is stale/u.test(warning)));
  assert.ok(delivery.readFirst.includes("src/domain/handler.ts"));
  assert.ok(delivery.constraints.some((constraint) => /Preserve the request id/u.test(constraint)));
  assert.ok(delivery.constraints.some((constraint) => /Inspect the remaining Request processing flow stages/u.test(constraint)));
  assert.deepEqual(delivery.checks, [
    "npm run test -- route-to-handler",
    "npm test -- api",
    "npm test -- request-flow",
  ]);
  assert.ok(delivery.warnings?.some((warning) => /stale/u.test(warning)));
});

test("unrelated paths receive no system or flow law", () => {
  const pact = buildTaskPact({
    repoId: "example",
    taskText: "Change an unrelated tool.",
    paths: ["scripts/tool.ts"],
    generatedAt,
    registry,
    registryRef,
    systemContracts: [systemContract],
    flowContracts: [flowContract],
  });

  assert.equal(pact.contracts.length, 0);
  assert.equal(pact.requiredContextPaths.length, 0);
  assert.equal(pact.impactObligations.length, 0);
});

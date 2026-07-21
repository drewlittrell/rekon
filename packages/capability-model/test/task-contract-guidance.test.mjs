import assert from "node:assert/strict";
import test from "node:test";

import {
  compileTaskContext,
  projectModelContext,
  selectTaskContractGuidance,
} from "../dist/index.js";

const graph = {
  nodes: [
    { kind: "file", id: "src/billing/subscription-service.ts" },
    { kind: "file", id: "src/billing/renewal-audit.ts" },
  ],
  capabilities: [
    {
      id: "capability:subscription-renewal",
      verb: "renew",
      noun: "subscription",
      implementedBy: [{ kind: "file", id: "src/billing/subscription-service.ts" }],
    },
    {
      id: "capability:renewal-audit",
      verb: "record",
      noun: "renewal audit",
      implementedBy: [{ kind: "file", id: "src/billing/renewal-audit.ts" }],
      evidenceRefs: ["CapabilityMap:renewal-audit"],
    },
  ],
};
const ref = { type: "CapabilityContract", id: "contracts-1", schemaVersion: "0.1.0" };
const contract = {
  header: {
    artifactType: "CapabilityContract",
    artifactId: "contracts-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-07-17T00:00:00.000Z",
    subject: { repoId: "." },
    producer: { id: "test", version: "1.0.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  },
  source: { capabilityMapRef: { type: "CapabilityMap", id: "map", schemaVersion: "0.1.0" } },
  summary: {
    total: 1,
    configured: 1,
    suggested: 0,
    unmatched: 0,
    withRequiredChecks: 1,
    withPlacementRules: 1,
    withPreservationRules: 1,
  },
  contracts: [{
    id: "subscription-renewal-law",
    status: "configured",
    match: { verb: "renew", noun: "subscription" },
    capabilityRef: { capabilityMapRef: { type: "CapabilityMap", id: "map", schemaVersion: "0.1.0" }, phraseCapabilityId: "phrase-1" },
    allowedSystems: ["billing"],
    requiredNeighbors: [{ verb: "record", noun: "renewal audit" }],
    preservationRules: [
      "Expired subscriptions must remain terminal.",
      "Use the existing domain error subscription-expired.",
    ],
    requiredChecks: ["npm test"],
  }],
};

test("task contract guidance selects preservation rules and checks for the path capability", () => {
  const guidance = selectTaskContractGuidance({
    paths: ["src/billing/subscription-service.ts"],
    graph,
    capabilityContract: contract,
    capabilityContractRef: ref,
  });
  assert.deepEqual(guidance.matchedContractIds, ["subscription-renewal-law"]);
  assert.ok(guidance.constraints.some((entry) => entry.statement === "Expired subscriptions must remain terminal."));
  assert.ok(guidance.constraints.some((entry) => /allowed systems: billing/u.test(entry.statement)));
  assert.deepEqual(guidance.verificationHints.map((entry) => entry.command), ["npm test"]);
  assert.deepEqual(guidance.requiredContextPaths, [{
    path: "src/billing/renewal-audit.ts",
    reason: "repository contract subscription-renewal-law requires neighboring capability record renewal audit",
    evidenceRefs: [
      "CapabilityContract:contracts-1#subscription-renewal-law",
      "CapabilityMap:renewal-audit",
    ],
    freshness: "fresh",
    routeRole: "implementation",
    necessity: "required",
    necessityReason: "Matched repository law requires the record renewal audit implementation for this task.",
  }]);
  assert.ok(guidance.constraints.every((entry) => entry.evidenceRefs[0] === "CapabilityContract:contracts-1#subscription-renewal-law"));
});

test("declared guidance reaches the model projection with declared trust", () => {
  const guidance = selectTaskContractGuidance({
    paths: ["src/billing/subscription-service.ts"],
    graph,
    capabilityContract: contract,
    capabilityContractRef: ref,
  });
  const { packet, report } = compileTaskContext({
    taskText: "Fix renewal.",
    paths: ["src/billing/subscription-service.ts"],
    graph,
    inputRefs: [ref],
    declaredContextPaths: guidance.requiredContextPaths,
    declaredConstraints: guidance.constraints,
    declaredVerificationHints: guidance.verificationHints,
    generatedAt: "2026-07-17T00:00:00.000Z",
  });
  const projection = projectModelContext(packet);
  assert.deepEqual(report.header.inputRefs, [ref]);
  assert.ok(report.doNotTouch.some((entry) => entry.source === "repository_contract"));
  assert.ok(report.contextItems.some((entry) =>
    entry.path === "src/billing/renewal-audit.ts"
    && entry.source === "deterministic_graph"
    && entry.evidenceRefs.includes("CapabilityContract:contracts-1#subscription-renewal-law")));
  assert.ok(projection.constraints.some((entry) => entry.trust === "declared" && /terminal/u.test(entry.statement)));
  assert.ok(projection.constraints.some((entry) =>
    entry.trust === "declared"
    && entry.statement === "Use the existing domain error subscription-expired."));
  assert.ok(projection.checks.some((entry) => entry.command === "npm test" && entry.trust === "declared"));
});

test("unmatched contracts do not leak unrelated repository law", () => {
  const guidance = selectTaskContractGuidance({
    paths: ["src/other.ts"],
    graph,
    capabilityContract: contract,
    capabilityContractRef: ref,
  });
  assert.deepEqual(guidance, {
    requiredContextPaths: [],
    constraints: [],
    verificationHints: [],
    matchedContractIds: [],
    matchedSystemContractIds: [],
    matchedFlowContractIds: [],
    impactObligations: [],
    warnings: [],
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRepositoryContractProjection,
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
  assert.deepEqual(flow.proposed.handoffs[0].verification, {
    acceptedMethods: ["model-judgment"],
    acceptancePolicy: "all-required",
  });
  assert.deepEqual(flow.proposed.handoffs[1].verification, {
    acceptedMethods: ["runtime"],
    acceptancePolicy: "all-required",
  });
  assert.equal(flow.proposed.criticality, "high");
  assert.equal(report.evidenceInventory.status, "complete");
  assert.equal(report.evidenceInventory.topologyBasis, "structural-and-runtime");
  assert.equal(report.evidenceInventory.structural.runtimeClaims, 1);
  assert.equal(report.evidenceInventory.verification.isolatedCoverageRecords, 0);
  assert.ok(report.evidenceInventory.notes.some((note) => note.includes("No validated isolated coverage")));
});

test("discovery marks the report partial when indexed verifier evidence could not be validated", () => {
  const graph = buildRepositoryIntelligenceGraph({
    graphSlices: [{
      header: header("GraphSlice", "partial-flow"),
      nodes: [
        { kind: "route", id: "GET /partial" },
        { kind: "response", id: "partial-response" },
      ],
      edges: [{
        source: "GET /partial",
        target: "partial-response",
        kind: "produces",
        evidence: [{ source: "ast", confidence: 0.9 }],
      }],
    }],
  });
  const observationRef = {
    type: "RuntimeGraphObservationReport",
    id: "usable-observation",
    schemaVersion: "1.0.0",
  };
  const report = discoverRepositoryContractCandidates({
    repoId: "example",
    generatedAt: "2026-07-20T22:00:00.000Z",
    graph,
    verificationInventory: {
      indexedRuntimeObservationReports: 2,
      validatedRuntimeObservationReports: 1,
      isolatedCoverageRecords: 0,
      inputRefs: [observationRef],
      warnings: ["RuntimeGraphObservationReport:invalid could not be validated."],
    },
  });

  assert.equal(report.evidenceInventory.status, "partial");
  assert.deepEqual(report.evidenceInventory.verification.runtimeObservationReports, {
    indexed: 2,
    validated: 1,
  });
  assert.ok(report.evidenceInventory.issues.some((issue) => issue.includes("could not be validated")));
  assert.equal(report.header.freshness.status, "partial");
  assert.ok(report.header.inputRefs.some((ref) => ref.id === observationRef.id));
});

test("flow discovery chooses an exact edge test and preserves adopted verifier policy during reconsideration", () => {
  const graph = buildRepositoryIntelligenceGraph({
    graphSlices: [{
      header: header("GraphSlice", "file-flow"),
      sliceType: "behavior-graph",
      nodes: [
        { kind: "route", id: "POST /checkout" },
        { kind: "file", id: "src/controller.ts" },
        { kind: "file", id: "src/service.ts" },
        { kind: "response", id: "checkout-response" },
      ],
      edges: [
        { source: "POST /checkout", target: "src/controller.ts", kind: "calls", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "src/controller.ts", target: "src/service.ts", kind: "calls", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "src/service.ts", target: "checkout-response", kind: "produces", evidence: [{ source: "ast", confidence: 0.9 }] },
      ],
    }],
  });
  const verificationEvidence = [{
    method: "test",
    command: "npm test -- checkout.test.ts",
    coveredPaths: ["src/controller.ts", "src/service.ts"],
    testPath: "test/checkout.test.ts",
    evidenceRefs: [{ type: "VerificationRun", id: "checkout-run", schemaVersion: "1.0.0" }],
  }, {
    method: "test",
    command: "npm test",
    coveredPaths: ["src/controller.ts", "src/other.ts", "src/service.ts"],
    evidenceRefs: [{ type: "VerificationRun", id: "broad-run", schemaVersion: "1.0.0" }],
  }];
  const discovered = discoverRepositoryContractCandidates({
    repoId: "example",
    generatedAt: "2026-07-20T22:00:00.000Z",
    graph,
    verificationEvidence,
  });
  const flowCandidate = discovered.candidates.find((candidate) => candidate.kind === "flow");
  assert.ok(flowCandidate);
  const stageById = new Map(flowCandidate.proposed.stages.map((stage) => [stage.id, stage]));
  const fileEdge = flowCandidate.proposed.handoffs.find((handoff) =>
    stageById.get(handoff.fromStageId)?.paths?.includes("src/controller.ts")
      && stageById.get(handoff.toStageId)?.paths?.includes("src/service.ts"));
  assert.deepEqual(fileEdge.verification, {
    acceptedMethods: ["test"],
    acceptancePolicy: "all-required",
    requiredChecks: ["npm test -- checkout.test.ts"],
  });
  assert.ok(discovered.header.inputRefs.some((ref) => ref.id === "checkout-run"));

  const adoptedFlow = {
    ...flowCandidate.proposed,
    handoffs: flowCandidate.proposed.handoffs.map((handoff) => handoff.id === fileEdge.id
      ? {
          ...handoff,
          verification: { acceptedMethods: ["runtime"], acceptancePolicy: "all-required" },
        }
      : handoff),
  };
  const projection = buildRepositoryContractProjection({
    repoId: "example",
    generatedAt: "2026-07-20T22:01:00.000Z",
    sources: [{
      path: "rekon/contracts/flows/checkout.json",
      digest: "a".repeat(64),
      document: { version: "1.0.0", sourceId: "checkout", flows: [adoptedFlow] },
    }],
  });
  const reconsidered = discoverRepositoryContractCandidates({
    repoId: "example",
    generatedAt: "2026-07-20T22:02:00.000Z",
    graph,
    effectiveRegistry: projection.registry,
    existingFlowContracts: projection.flowContracts,
    verificationEvidence,
    reconsiderContractIds: [`FlowContract:${adoptedFlow.id}`],
  });
  const updated = reconsidered.candidates.find((candidate) => candidate.kind === "flow");
  const retained = updated.proposed.handoffs.find((handoff) => handoff.id === fileEdge.id);
  assert.deepEqual(retained.verification, {
    acceptedMethods: ["runtime"],
    acceptancePolicy: "all-required",
  });
});

test("CLI flow discovery connects module execution to stdout and binds exact tests across callable stages", () => {
  const ownershipMap = {
    header: header("OwnershipMap", "owners"),
    entries: [
      { path: "src/cli.ts", ownerSystem: "cli", basis: "inferred", confidence: 0.9, evidence: [] },
      { path: "tests/cli.test.ts", ownerSystem: "tests", basis: "inferred", confidence: 0.9, evidence: [] },
    ],
  };
  const graph = buildRepositoryIntelligenceGraph({
    graphSlices: [{
      header: header("GraphSlice", "cli-flow"),
      sliceType: "behavior-graph",
      nodes: [
        { kind: "entry_point", id: "entry:cli:src/cli.ts" },
        { kind: "entry_point", id: "entry:cli:scripts/audit.mjs", metadata: { entryClass: "tooling", path: "scripts/audit.mjs" } },
        { kind: "callable", id: "callable:src/cli.ts#__module__" },
        { kind: "callable", id: "callable:src/cli.ts#main" },
        { kind: "callable", id: "callable:scripts/audit.mjs#__module__" },
        { kind: "cli_output", id: "cli-output:src/cli.ts#main:stdout" },
        { kind: "cli_output", id: "cli-output:scripts/audit.mjs#__module__:stdout" },
        { kind: "entry_point", id: "entry:test:tests/cli.test.ts" },
        { kind: "callable", id: "callable:tests/cli.test.ts#__module__" },
        { kind: "cli_output", id: "cli-output:tests/cli.test.ts#__module__:stdout" },
      ],
      edges: [
        { source: "entry:cli:src/cli.ts", target: "callable:src/cli.ts#__module__", kind: "handles", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "callable:src/cli.ts#__module__", target: "callable:src/cli.ts#main", kind: "calls", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "callable:src/cli.ts#main", target: "cli-output:src/cli.ts#main:stdout", kind: "produces", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "entry:cli:scripts/audit.mjs", target: "callable:scripts/audit.mjs#__module__", kind: "handles", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "callable:scripts/audit.mjs#__module__", target: "cli-output:scripts/audit.mjs#__module__:stdout", kind: "produces", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "entry:test:tests/cli.test.ts", target: "callable:tests/cli.test.ts#__module__", kind: "handles", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "callable:tests/cli.test.ts#__module__", target: "cli-output:tests/cli.test.ts#__module__:stdout", kind: "produces", evidence: [{ source: "ast", confidence: 0.9 }] },
      ],
    }],
    ownershipMap,
  });
  const report = discoverRepositoryContractCandidates({
    repoId: "example",
    generatedAt: "2026-07-20T22:00:00.000Z",
    graph,
    ownershipMap,
    verificationEvidence: [{
      method: "test",
      command: "npm test -- cli.test.ts",
      coveredPaths: ["src/cli.ts"],
      testPath: "tests/cli.test.ts",
      evidenceRefs: [{ type: "VerificationRun", id: "cli-run", schemaVersion: "1.0.0" }],
    }],
  });

  const flow = report.candidates.find((candidate) => candidate.kind === "flow");
  assert.ok(flow);
  assert.match(flow.targetId, /cli-output/);
  assert.deepEqual(flow.proposed.systems, ["cli"]);
  assert.ok(flow.proposed.stages.every((stage) => stage.paths.includes("src/cli.ts")));
  assert.ok(flow.proposed.handoffs.every((handoff) => (
    handoff.verification.acceptedMethods[0] === "test"
    && handoff.verification.requiredChecks[0] === "npm test -- cli.test.ts"
  )));
  assert.equal(report.candidates.some((candidate) => candidate.targetId.includes("scripts-audit.mjs")), false);
  assert.equal(report.unresolved.some((entry) => entry.id.includes("tests-cli.test.ts")), false);
  assert.equal(report.unresolved.some((entry) => entry.id.includes("scripts-audit.mjs")), false);
});

test("CLI flow discovery prefers product commands and excludes tooling commands", () => {
  const graph = buildRepositoryIntelligenceGraph({
    graphSlices: [{
      header: header("GraphSlice", "command-flow"),
      sliceType: "behavior-graph",
      nodes: [
        { kind: "entry_point", id: "entry:cli:src/cli.ts", metadata: { entryClass: "product", path: "src/cli.ts" } },
        { kind: "command", id: "command:src/cli.ts#contracts discover", metadata: { entryClass: "product", path: "src/cli.ts", operation: "contracts discover" } },
        { kind: "command", id: "command:src/cli.ts#artifacts list", metadata: { entryClass: "product", path: "src/cli.ts", operation: "artifacts list" } },
        { kind: "cli_output", id: "cli-output:src/cli.ts#writeOutput:stdout" },
        { kind: "command", id: "command:scripts/audit.mjs#audit", metadata: { entryClass: "tooling", path: "scripts/audit.mjs", operation: "audit" } },
        { kind: "cli_output", id: "cli-output:scripts/audit.mjs#__module__:stdout" },
      ],
      edges: [
        { source: "entry:cli:src/cli.ts", target: "cli-output:src/cli.ts#writeOutput:stdout", kind: "produces", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "command:src/cli.ts#contracts discover", target: "cli-output:src/cli.ts#writeOutput:stdout", kind: "produces", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "command:src/cli.ts#artifacts list", target: "cli-output:src/cli.ts#writeOutput:stdout", kind: "produces", evidence: [{ source: "ast", confidence: 0.9 }] },
        { source: "command:scripts/audit.mjs#audit", target: "cli-output:scripts/audit.mjs#__module__:stdout", kind: "produces", evidence: [{ source: "ast", confidence: 0.9 }] },
      ],
    }],
  });
  const report = discoverRepositoryContractCandidates({
    repoId: "example",
    generatedAt: "2026-07-20T22:00:00.000Z",
    graph,
    verificationEvidence: [{
      method: "test",
      command: "node --test tests/repository-contract-discover-cli.test.mjs",
      coveredPaths: ["src/cli.ts"],
      testPath: "tests/repository-contract-discover-cli.test.mjs",
      evidenceRefs: [{ type: "VerificationRun", id: "contracts-discover", schemaVersion: "1.0.0" }],
    }],
  });

  const flows = report.candidates.filter((candidate) => candidate.kind === "flow");
  assert.equal(flows.length, 2);
  const contractFlow = flows.find((flow) => flow.targetId.includes("contracts-discover"));
  const artifactFlow = flows.find((flow) => flow.targetId.includes("artifacts-list"));
  assert.equal(contractFlow.proposed.stages[0].label, "command:src/cli.ts#contracts discover");
  assert.deepEqual(contractFlow.proposed.handoffs[0].verification, {
    acceptedMethods: ["test"],
    acceptancePolicy: "all-required",
    requiredChecks: ["node --test tests/repository-contract-discover-cli.test.mjs"],
  });
  assert.deepEqual(artifactFlow.proposed.handoffs[0].verification, {
    acceptedMethods: ["model-judgment"],
    acceptancePolicy: "all-required",
  });
  assert.equal(report.unresolved.some((entry) => entry.id.includes("entry-cli-src-cli.ts")), false);
  assert.equal(report.unresolved.some((entry) => entry.id.includes("scripts-audit.mjs")), false);

  const bounded = discoverRepositoryContractCandidates({
    repoId: "example",
    generatedAt: "2026-07-20T22:00:00.000Z",
    graph,
    maxFlows: 1,
  });
  assert.equal(bounded.candidates.filter((candidate) => candidate.kind === "flow").length, 1);
  const limit = bounded.unresolved.find((entry) => entry.id === "unresolved:flow:candidate-limit");
  assert.ok(limit, JSON.stringify(bounded.unresolved));
  assert.match(
    limit.reason,
    /1 eligible entry not evaluated/,
  );
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

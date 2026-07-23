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

function flowContract(handoffs, requiredChecks = []) {
  return {
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
      { id: "audit", paths: ["src/audit.ts"], evidenceRefs: [] },
    ],
    handoffs,
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
  assert.equal(result.proofGate.evaluation.status, "satisfied");
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

test("repository documentation remains law-governed without requiring source ownership", () => {
  const result = validateChange({
    task: "document context attribution",
    changedPaths: ["docs/concepts/context.md", "packages/example/README.md", "CHANGELOG.md"],
    baseRef: "HEAD",
    taskPact: pact({
      task: {
        text: "document context attribution",
        paths: ["docs/concepts/context.md", "packages/example/README.md", "CHANGELOG.md"],
      },
    }),
    ownershipMap,
    files: [
      { path: "docs/concepts/context.md", status: "modified", beforeSha256: "a", afterSha256: "b" },
      { path: "packages/example/README.md", status: "modified", beforeSha256: "c", afterSha256: "d" },
      { path: "CHANGELOG.md", status: "modified", beforeSha256: "e", afterSha256: "f" },
    ],
  });

  assert.equal(result.status, "passed");
  assert.ok(!result.unresolvedSemanticObligations.some((entry) =>
    entry.id.startsWith("ownership-unresolved:")));
});

test("unowned non-documentation paths still require ownership proof", () => {
  const result = validateChange({
    task: "change release automation",
    changedPaths: ["scripts/release.mjs"],
    baseRef: "HEAD",
    taskPact: pact({
      task: { text: "change release automation", paths: ["scripts/release.mjs"] },
    }),
    ownershipMap,
    files: [{ path: "scripts/release.mjs", status: "modified", beforeSha256: "a", afterSha256: "b" }],
  });

  assert.equal(result.status, "needs-judgment");
  assert.ok(result.unresolvedSemanticObligations.some((entry) =>
    entry.id === "ownership-unresolved:scripts/release.mjs"));
});

test("new files inherit a uniquely observed top-level owner", () => {
  const result = validateChange({
    task: "add benchmark canary",
    changedPaths: ["tests/evals/new-canary.json"],
    baseRef: "HEAD",
    taskPact: pact({
      task: { text: "add benchmark canary", paths: ["tests/evals/new-canary.json"] },
    }),
    ownershipMap: {
      header: header("OwnershipMap", "tests-ownership"),
      entries: [{
        path: "tests/contract/existing.test.mjs",
        ownerSystem: "tests",
        confidence: 1,
        evidence: [],
      }],
    },
    files: [{ path: "tests/evals/new-canary.json", status: "added", afterSha256: "b" }],
  });

  assert.equal(result.status, "passed");
  assert.deepEqual(result.affectedSystems, ["tests"]);
  assert.ok(!result.unresolvedSemanticObligations.some((entry) =>
    entry.id.startsWith("ownership-unresolved:")));
});

test("new files keep ownership unresolved when top-level evidence is ambiguous", () => {
  const result = validateChange({
    task: "add shared source",
    changedPaths: ["src/new.ts"],
    baseRef: "HEAD",
    taskPact: pact({
      task: { text: "add shared source", paths: ["src/new.ts"] },
    }),
    ownershipMap,
    files: [{ path: "src/new.ts", status: "added", afterSha256: "b" }],
  });

  assert.equal(result.status, "needs-judgment");
  assert.ok(result.unresolvedSemanticObligations.some((entry) =>
    entry.id === "ownership-unresolved:src/new.ts"));
});

test("root-level metadata resolves to the repository root owner", () => {
  const result = validateChange({
    task: "add benchmark command",
    changedPaths: ["package.json"],
    baseRef: "HEAD",
    taskPact: pact({
      task: { text: "add benchmark command", paths: ["package.json"] },
    }),
    ownershipMap,
    files: [{ path: "package.json", status: "modified", beforeSha256: "a", afterSha256: "b" }],
  });

  assert.equal(result.status, "passed");
  assert.deepEqual(result.affectedSystems, ["root"]);
  assert.ok(!result.unresolvedSemanticObligations.some((entry) =>
    entry.id.startsWith("ownership-unresolved:")));
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
  assert.equal(result.proofGate.evaluation.status, "incomplete");
  assert.ok(result.proofGate.obligations.some((entry) =>
    entry.subject.kind === "flow-handoff"
    && entry.subject.id === "bootstrap-flow:entry-runtime"
    && entry.assertion === "Forward configuration unchanged."));
  assert.ok(result.proofGate.obligations.some((entry) =>
    entry.assertion.includes("configuration")
    && entry.requiredEvidence.includes("model-judgment")));
  assert.ok(result.proofGate.obligations.some((entry) =>
    entry.id === "handoff:bootstrap-flow:entry-runtime:edge"
    && entry.acceptancePolicy === "any-supported"));
  assert.ok(result.proofGate.obligations.some((entry) =>
    entry.subject.kind === "verification-gate"
    && entry.assertion === "Pass selected check: npm test"));
  assert.deepEqual(result.requiredChecks, ["npm test"]);
});

test("repository purpose and user outcomes gate completion", () => {
  const taskPact = pact({
    constraints: [
      {
        id: "app.purpose",
        kind: "purpose",
        statement: "Preserve system purpose: keep bootstrap configuration explicit.",
        paths: ["src/**"],
        contractRef: ref("SystemContract", "app"),
        authority: "adopted",
        confidence: 1,
      },
      {
        id: "app.outcome.1",
        kind: "outcome",
        statement: "Preserve user outcome: the configured runtime starts.",
        paths: ["src/**"],
        contractRef: ref("SystemContract", "app"),
        authority: "adopted",
        confidence: 1,
      },
    ],
  });
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact,
    ownershipMap,
    files: [{ path: "src/index.ts", status: "modified" }],
  });

  assert.equal(result.status, "needs-judgment");
  assert.ok(result.unresolvedSemanticObligations.some((entry) => entry.id === "constraint:app.purpose"));
  assert.ok(result.unresolvedSemanticObligations.some((entry) => entry.id === "constraint:app.outcome.1"));
});

test("selected command evidence gates completion independently from semantic judgment", () => {
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    systemContracts: [systemContract("app", ["src/index.ts"], ["npm run test:app"])],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [{
      ref: ref("VerificationResult", "verification-result-app"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "fresh",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{ command: "npm run test:app", status: "passed" }],
    }],
  });

  assert.equal(result.status, "passed");
  const gate = result.proofGate.obligations.find((entry) => entry.assertion === "Pass selected check: npm run test:app");
  assert.ok(gate);
  assert.ok(result.proofGate.results.some((entry) =>
    entry.obligationId === gate.id && entry.method === "test" && entry.verdict === "supported"));
  assert.deepEqual(result.correctiveContext.entries, []);
});

test("failed selected command evidence refutes its exact verification gate", () => {
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    systemContracts: [systemContract("app", ["src/index.ts"], ["npm run test:app"])],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [{
      ref: ref("VerificationResult", "verification-result-app"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "fresh",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{ command: "npm run test:app", status: "failed" }],
    }],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockingViolations.some((entry) => entry.code === "proof.obligation-refuted"));
});

test("a later failed result from the same verifier cannot be hidden by a passed result", () => {
  const evidence = (id, status) => ({
    ref: ref("VerificationResult", id),
    generatedAt: "2026-07-21T01:00:00.000Z",
    freshness: "fresh",
    provenance: "runner-derived",
    verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
    commandResults: [{ command: "npm run test:app", status }],
  });
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    systemContracts: [systemContract("app", ["src/index.ts"], ["npm run test:app"])],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [evidence("passed", "passed"), evidence("failed", "failed")],
  });

  assert.equal(result.proofGate.results.length, 2);
  assert.equal(result.status, "blocked");
  assert.equal(result.correctiveContext.entries[0].kind, "failed-check");
});

test("runtime observation can prove the declared handoff edge without proving its semantic clauses", () => {
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
      guarantees: ["Forward configuration unchanged."],
      evidenceRefs: [],
    }],
    requiredChecks: [],
  };
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    flowContracts: [flow],
    files: [{ path: "src/index.ts", status: "modified" }],
    runtimeEvidence: [{
      ref: ref("RuntimeGraphObservationReport", "runtime-observation"),
      freshness: "fresh",
      producer: { id: "@rekon/capability-model", version: "1.0.0" },
      edges: [{ kind: "handoff", fromNodeId: "step:entry", toNodeId: "step:runtime", observedCount: 1 }],
    }],
  });

  const edgeDecision = result.proofGate.evaluation.decisions.find((entry) =>
    entry.obligationId === "handoff:bootstrap-flow:entry-runtime:edge");
  assert.equal(edgeDecision?.verdict, "satisfied");
  assert.ok(result.unresolvedSemanticObligations.some((entry) =>
    entry.statement === "Forward configuration unchanged."));
});

test("a test-only handoff rejects matching runtime evidence", () => {
  const flow = flowContract([{
    id: "entry-runtime",
    fromStageId: "entry",
    toStageId: "runtime",
    verification: {
      acceptedMethods: ["test"],
      requiredChecks: ["npm run test:edge"],
    },
    evidenceRefs: [],
  }]);
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    flowContracts: [flow],
    files: [{ path: "src/index.ts", status: "modified" }],
    runtimeEvidence: [{
      ref: ref("RuntimeGraphObservationReport", "runtime-observation"),
      freshness: "fresh",
      producer: { id: "@rekon/capability-model", version: "1.0.0" },
      edges: [{ kind: "handoff", fromNodeId: "step:entry", toNodeId: "step:runtime", observedCount: 1 }],
    }],
  });

  const edgeId = "handoff:bootstrap-flow:entry-runtime:edge";
  const obligation = result.proofGate.obligations.find((entry) => entry.id === edgeId);
  const decision = result.proofGate.evaluation.decisions.find((entry) => entry.obligationId === edgeId);
  assert.deepEqual(obligation?.requiredEvidence, ["test"]);
  assert.deepEqual(decision?.missingMethods, ["test"]);
  assert.ok(!result.proofGate.results.some((entry) =>
    entry.obligationId === edgeId && entry.method === "runtime"));
});

test("a runtime-only handoff is not satisfied by a flow-level test", () => {
  const flow = flowContract([{
    id: "entry-runtime",
    fromStageId: "entry",
    toStageId: "runtime",
    verification: { acceptedMethods: ["runtime"] },
    evidenceRefs: [],
  }], ["npm run test:flow"]);
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    flowContracts: [flow],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [{
      ref: ref("VerificationResult", "flow-test"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "fresh",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{ command: "npm run test:flow", status: "passed" }],
    }],
  });

  const edgeId = "handoff:bootstrap-flow:entry-runtime:edge";
  const decision = result.proofGate.evaluation.decisions.find((entry) => entry.obligationId === edgeId);
  assert.equal(decision?.verdict, "unresolved");
  assert.deepEqual(decision?.missingMethods, ["runtime"]);
  assert.ok(!result.proofGate.results.some((entry) =>
    entry.obligationId === edgeId && entry.method === "test"));
});

test("all-required handoff verification requires both test and runtime proof", () => {
  const flow = flowContract([{
    id: "entry-runtime",
    fromStageId: "entry",
    toStageId: "runtime",
    verification: {
      acceptedMethods: ["test", "runtime"],
      acceptancePolicy: "all-required",
      requiredChecks: ["npm run test:edge"],
    },
    evidenceRefs: [],
  }]);
  const verificationEvidence = [{
    ref: ref("VerificationResult", "edge-test"),
    generatedAt: "2026-07-21T01:00:00.000Z",
    freshness: "fresh",
    provenance: "runner-derived",
    verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
    commandResults: [{ command: "npm run test:edge", status: "passed" }],
  }];
  const baseline = {
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    flowContracts: [flow],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence,
  };
  const testOnly = validateChange(baseline);
  const edgeId = "handoff:bootstrap-flow:entry-runtime:edge";
  assert.deepEqual(
    testOnly.proofGate.evaluation.decisions.find((entry) => entry.obligationId === edgeId)?.missingMethods,
    ["runtime"],
  );

  const complete = validateChange({
    ...baseline,
    runtimeEvidence: [{
      ref: ref("RuntimeGraphObservationReport", "runtime-observation"),
      freshness: "fresh",
      producer: { id: "@rekon/capability-model", version: "1.0.0" },
      edges: [{ kind: "handoff", fromNodeId: "step:entry", toNodeId: "step:runtime", observedCount: 1 }],
    }],
  });
  assert.equal(complete.status, "passed");
  assert.equal(
    complete.proofGate.evaluation.decisions.find((entry) => entry.obligationId === edgeId)?.verdict,
    "satisfied",
  );
});

test("stage responsibility requires both its declared test and model judgment", () => {
  const flow = flowContract([{
    id: "entry-runtime",
    fromStageId: "entry",
    toStageId: "runtime",
    verification: {
      acceptedMethods: ["test"],
      requiredChecks: ["npm run test:edge"],
    },
    evidenceRefs: [],
  }]);
  flow.stages[0].label = "Entry";
  flow.stages[0].responsibilities = ["Normalize bootstrap input before runtime dispatch."];
  const responsibilityId = "constraint:bootstrap-flow.stage.entry.responsibility.1";
  const baseline = {
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    flowContracts: [flow],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [{
      ref: ref("VerificationResult", "edge-test"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "fresh",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{ command: "npm run test:edge", status: "passed" }],
    }],
  };

  const testOnly = validateChange(baseline);
  const obligation = testOnly.proofGate.obligations.find((entry) =>
    entry.id === responsibilityId);
  const testOnlyDecision = testOnly.proofGate.evaluation.decisions.find((entry) =>
    entry.obligationId === responsibilityId);
  assert.deepEqual(obligation?.requiredEvidence, ["test", "model-judgment"]);
  assert.deepEqual(testOnlyDecision?.supportedMethods, ["test"]);
  assert.deepEqual(testOnlyDecision?.missingMethods, ["model-judgment"]);

  const complete = validateChange({
    ...baseline,
    modelJudgments: [{
      obligationId: responsibilityId,
      verdict: "supported",
      explanation: "The changed entry stage still normalizes input before invoking runtime.",
    }],
  });
  assert.equal(
    complete.proofGate.evaluation.decisions.find((entry) =>
      entry.obligationId === responsibilityId)?.verdict,
    "satisfied",
  );

  const refuted = validateChange({
    ...baseline,
    modelJudgments: [{
      obligationId: responsibilityId,
      verdict: "refuted",
      explanation: "The changed entry stage forwards unnormalized input.",
    }],
  });
  assert.equal(refuted.status, "blocked");
  assert.ok(refuted.blockingViolations.some((entry) =>
    entry.details?.obligationId === responsibilityId));
});

test("handoff evidence paths require a current regression edit and cannot be self-approved", () => {
  const flow = flowContract([{
    id: "entry-runtime",
    fromStageId: "entry",
    toStageId: "runtime",
    verification: {
      acceptedMethods: ["test", "model-judgment"],
      requiredChecks: ["npm run test:edge"],
      requiredEvidencePaths: ["tests/bootstrap.test.ts"],
    },
    evidenceRefs: [],
  }]);
  flow.stages[0].responsibilities = ["Normalize bootstrap input before runtime dispatch."];
  const responsibilityId = "constraint:bootstrap-flow.stage.entry.responsibility.1";
  const evidencePathId = "handoff:bootstrap-flow:entry-runtime:evidence-path";
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    flowContracts: [flow],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [{
      ref: ref("VerificationResult", "edge-test"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "fresh",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{ command: "npm run test:edge", status: "passed" }],
    }],
    modelJudgments: [{
      obligationId: responsibilityId,
      verdict: "supported",
      explanation: "The entry stage retains its responsibility.",
    }, {
      obligationId: evidencePathId,
      verdict: "supported",
      explanation: "The regression evidence is sufficient.",
    }],
  });

  assert.equal(result.status, "needs-judgment");
  assert.deepEqual(
    result.proofGate.obligations.find((entry) => entry.id === evidencePathId)?.requiredEvidence,
    ["static"],
  );
  assert.deepEqual(
    result.proofGate.evaluation.decisions.find((entry) =>
      entry.obligationId === evidencePathId)?.missingMethods,
    ["static"],
  );
  assert.ok(!result.proofGate.results.some((entry) =>
    entry.obligationId === evidencePathId));
  assert.ok(result.proofGate.warnings.some((warning) =>
    warning.startsWith("handoff-evidence-path-missing:")));
  assert.ok(result.proofGate.warnings.includes(
    `model-judgment-not-accepted: ${evidencePathId}`,
  ));
});

test("changed handoff evidence plus exact test and responsibility judgment satisfies proof", () => {
  const flow = flowContract([{
    id: "entry-runtime",
    fromStageId: "entry",
    toStageId: "runtime",
    verification: {
      acceptedMethods: ["test", "model-judgment"],
      requiredChecks: ["npm run test:edge"],
      requiredEvidencePaths: ["tests/bootstrap.test.ts"],
    },
    evidenceRefs: [],
  }]);
  flow.stages[0].responsibilities = ["Normalize bootstrap input before runtime dispatch."];
  const responsibilityId = "constraint:bootstrap-flow.stage.entry.responsibility.1";
  const evidencePathId = "handoff:bootstrap-flow:entry-runtime:evidence-path";
  const input = {
    task: "change bootstrap",
    changedPaths: ["src/index.ts", "tests/bootstrap.test.ts"],
    baseRef: "HEAD",
    taskPact: pact({
      task: {
        text: "change bootstrap",
        paths: ["src/index.ts", "tests/bootstrap.test.ts"],
      },
    }),
    ownershipMap: {
      ...ownershipMap,
      entries: [
        ...ownershipMap.entries,
        {
          path: "tests/bootstrap.test.ts",
          ownerSystem: "app",
          confidence: 1,
          evidence: [],
        },
      ],
    },
    flowContracts: [flow],
    files: [
      { path: "src/index.ts", status: "modified" },
      { path: "tests/bootstrap.test.ts", status: "modified" },
    ],
    verificationEvidence: [{
      ref: ref("VerificationResult", "edge-test"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "fresh",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{ command: "npm run test:edge", status: "passed" }],
    }],
    modelJudgments: [{
      obligationId: responsibilityId,
      verdict: "supported",
      explanation: "The entry stage retains its responsibility.",
    }, {
      obligationId: "handoff:bootstrap-flow:entry-runtime:edge",
      verdict: "supported",
      explanation: "The handoff remains connected.",
    }],
  };
  const result = validateChange(input);

  assert.equal(result.status, "passed");
  assert.equal(result.proofGate.evaluation.status, "satisfied");
  assert.ok(result.proofGate.results.some((entry) =>
    entry.obligationId === evidencePathId
    && entry.method === "static"
    && entry.verdict === "supported"));
  const check = result.checkSelection.checks.find((entry) =>
    entry.command === "npm run test:edge");
  assert.ok(check?.requirements.some((entry) =>
    entry.paths.includes("tests/bootstrap.test.ts")));
  assert.ok(check?.proofObligationIds.includes(responsibilityId));

  const deleted = validateChange({
    ...input,
    files: [
      { path: "src/index.ts", status: "modified" },
      { path: "tests/bootstrap.test.ts", status: "deleted" },
    ],
  });
  assert.equal(deleted.status, "blocked");
  assert.ok(deleted.proofGate.results.some((entry) =>
    entry.obligationId === evidencePathId
    && entry.method === "static"
    && entry.verdict === "refuted"));
});

test("an exact handoff check cannot prove a sibling edge", () => {
  const flow = flowContract([
    {
      id: "entry-runtime",
      fromStageId: "entry",
      toStageId: "runtime",
      verification: { acceptedMethods: ["test"], requiredChecks: ["npm run test:runtime-edge"] },
      evidenceRefs: [],
    },
    {
      id: "entry-audit",
      fromStageId: "entry",
      toStageId: "audit",
      verification: { acceptedMethods: ["test"], requiredChecks: ["npm run test:audit-edge"] },
      evidenceRefs: [],
    },
  ]);
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    flowContracts: [flow],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [{
      ref: ref("VerificationResult", "runtime-edge-test"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "fresh",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{ command: "npm run test:runtime-edge", status: "passed" }],
    }],
  });

  const runtimeCheck = result.checkSelection.checks.find((check) =>
    check.command === "npm run test:runtime-edge");
  assert.ok(runtimeCheck);
  assert.ok(runtimeCheck.requirements.some((entry) =>
    entry.sourceType === "flow-handoff" && entry.sourceId === "bootstrap-flow:entry-runtime"));
  assert.ok(runtimeCheck.proofObligationIds.includes("handoff:bootstrap-flow:entry-runtime:edge"));
  assert.ok(!runtimeCheck.proofObligationIds.includes("handoff:bootstrap-flow:entry-audit:edge"));
  assert.ok(result.proofGate.results.some((entry) =>
    entry.obligationId === "handoff:bootstrap-flow:entry-runtime:edge" && entry.verdict === "supported"));
  assert.ok(!result.proofGate.results.some((entry) =>
    entry.obligationId === "handoff:bootstrap-flow:entry-audit:edge" && entry.method === "test"));
});

test("discovered flow and handoff ids retain verifier policy through proof binding", () => {
  const contractId = "flow:route:POST-checkout:response:checkout-response";
  const fromStageId = "stage:file:src-index-ts";
  const toStageId = "stage:file:src-runtime-ts";
  const handoffId = `handoff:${fromStageId}:${toStageId}`;
  const flow = {
    ...flowContract([]),
    header: header("FlowContract", contractId),
    contractId,
    stages: [
      { id: fromStageId, paths: ["src/index.ts"], evidenceRefs: [] },
      { id: toStageId, paths: ["src/runtime.ts"], evidenceRefs: [] },
    ],
    handoffs: [{
      id: handoffId,
      fromStageId,
      toStageId,
      verification: {
        acceptedMethods: ["test"],
        acceptancePolicy: "all-required",
        requiredChecks: ["npm run test:discovered-edge"],
      },
      evidenceRefs: [],
    }],
  };
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    flowContracts: [flow],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [{
      ref: ref("VerificationResult", "discovered-edge-test"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "fresh",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{ command: "npm run test:discovered-edge", status: "passed" }],
    }],
  });

  const edgeId = `handoff:${contractId}:${handoffId}:edge`;
  const obligation = result.proofGate.obligations.find((entry) => entry.id === edgeId);
  assert.deepEqual(obligation?.requiredEvidence, ["test"]);
  assert.equal(obligation?.subject.id, `${contractId}:${handoffId}`);
  assert.ok(obligation?.sourceRefs.some((entry) => entry.id === contractId));
  assert.ok(result.proofGate.results.some((entry) =>
    entry.obligationId === edgeId && entry.method === "test" && entry.verdict === "supported"));
});

test("supported edge proof clears its compatibility obligation", () => {
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
      id: "bootstrap-flow.handoff.guarantee",
      kind: "handoff",
      statement: "Forward configuration unchanged.",
      paths: ["src/**"],
      contractRef: flowRef,
      authority: "adopted",
      confidence: 1,
    }],
  });
  const proof = {
    obligationId: "constraint:bootstrap-flow.handoff.guarantee",
    method: "model-judgment",
    verdict: "supported",
    evidenceRefs: [ref("TaskPact", "task-pact-fixture")],
    counterEvidenceRefs: [],
    explanation: "The changed source forwards the same configuration object.",
    verifier: { kind: "model", id: "rekon-agent-judge", version: "1.0.0" },
  };

  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact,
    taskPactRef: ref("TaskPact", "task-pact-fixture"),
    taskContextRef: ref("TaskContextReport", "task-context-fixture"),
    ownershipMap,
    files: [{ path: "src/index.ts", status: "modified" }],
    proofResults: [proof],
  });

  assert.equal(result.status, "passed");
  assert.equal(result.proofGate.evaluation.status, "satisfied");
  assert.equal(result.baseline.taskContextRef.id, "task-context-fixture");
  assert.deepEqual(result.unresolvedSemanticObligations, []);
});

test("refuted edge proof blocks change completion with counterevidence", () => {
  const taskPact = pact({
    constraints: [{
      id: "flow.handoff.guarantee",
      kind: "handoff",
      statement: "Forward request identity unchanged.",
      paths: ["src/**"],
      contractRef: ref("FlowContract", "flow"),
      authority: "adopted",
      confidence: 1,
    }],
  });
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact,
    ownershipMap,
    files: [{ path: "src/index.ts", status: "modified" }],
    proofResults: [{
      obligationId: "constraint:flow.handoff.guarantee",
      method: "model-judgment",
      verdict: "refuted",
      evidenceRefs: [],
      counterEvidenceRefs: [ref("TaskPact", "task-pact-fixture")],
      explanation: "The changed source drops requestId before the consumer call.",
      verifier: { kind: "model", id: "rekon-agent-judge", version: "1.0.0" },
    }],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.proofGate.evaluation.status, "blocked");
  assert.ok(result.blockingViolations.some((entry) => entry.code === "proof.obligation-refuted"));
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

test("check selection greedily adds the smallest observed test set for uncovered changed source", () => {
  const evidenceRefs = [
    ref("RuntimeGraphObservationReport", "coverage-observation"),
    ref("VerificationRun", "coverage-run"),
  ];
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts", "src/runtime.ts"],
    baseRef: "HEAD",
    taskPact: pact({ task: { text: "change bootstrap", paths: ["src/index.ts", "src/runtime.ts"] } }),
    ownershipMap,
    files: [
      { path: "src/index.ts", status: "modified" },
      { path: "src/runtime.ts", status: "modified" },
    ],
    verificationCandidates: [
      {
        command: "npm run test:index",
        sourceType: "coverage-observation",
        sourceId: "index-only",
        reason: "Observed isolated coverage for src/index.ts.",
        paths: ["src/index.ts"],
        evidenceRefs,
      },
      {
        command: "npm run test:runtime",
        sourceType: "coverage-observation",
        sourceId: "runtime-only",
        reason: "Observed isolated coverage for src/runtime.ts.",
        paths: ["src/runtime.ts"],
        evidenceRefs,
      },
      {
        command: "npm run test:focused",
        sourceType: "coverage-observation",
        sourceId: "both-paths",
        reason: "Observed isolated coverage for both changed paths.",
        paths: ["src/index.ts", "src/runtime.ts"],
        evidenceRefs,
      },
    ],
  });

  assert.deepEqual(result.requiredChecks, ["npm run test:focused"]);
  assert.equal(result.checkSelection.evidenceCandidatesConsidered, 3);
  assert.equal(result.checkSelection.evidenceBackedChecks, 1);
  assert.deepEqual(result.checkSelection.uncoveredTestPaths, []);
  assert.equal(result.checkSelection.checks[0].kind, "test");
  assert.equal(result.checkSelection.checks[0].selection, "evidence-backed");
});

test("a declared test covering the changed scope suppresses observed fallback checks", () => {
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    taskChecks: [{ command: "npm test", sourceId: "task-context" }],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationCandidates: [{
      command: "npm run test:focused",
      sourceType: "coverage-observation",
      sourceId: "observed",
      reason: "Observed isolated coverage.",
      paths: ["src/index.ts"],
      evidenceRefs: [ref("RuntimeGraphObservationReport", "coverage-observation")],
    }],
  });

  assert.deepEqual(result.requiredChecks, ["npm test"]);
  assert.equal(result.checkSelection.evidenceCandidatesConsidered, 1);
  assert.equal(result.checkSelection.evidenceBackedChecks, 0);
  assert.equal(result.checkSelection.checks[0].selection, "declared");
});

test("common non-JavaScript test commands cover their declared source scope", () => {
  const result = validateChange({
    task: "change service",
    changedPaths: ["service/app.py"],
    baseRef: "HEAD",
    taskChecks: [{ command: "python -m pytest tests/test_app.py", sourceId: "task-context" }],
    files: [{ path: "service/app.py", status: "modified" }],
  });

  assert.equal(result.checkSelection.checks[0].kind, "test");
  assert.deepEqual(result.checkSelection.uncoveredTestPaths, []);
});

test("failed edge verification returns proof-local corrective context", () => {
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
    systems: ["app"],
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
      guarantees: ["Forward configuration unchanged."],
      evidenceRefs: [],
    }],
    requiredChecks: ["npm run test:proof"],
  };
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    flowContracts: [flow],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [{
      ref: ref("VerificationResult", "failed-proof"),
      verificationRunRef: ref("VerificationRun", "failed-run"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "fresh",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{
        command: "npm run test:proof",
        status: "failed",
        diagnostic: { stream: "stderr", excerpt: "expected runtime handoff", truncated: false },
      }],
    }],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.correctiveContext.entries.length, 1);
  const correction = result.correctiveContext.entries[0];
  assert.equal(correction.kind, "failed-check");
  assert.deepEqual(correction.paths, ["src/index.ts"]);
  assert.ok(correction.obligationIds.some((id) => id.startsWith("check:")));
  assert.ok(correction.obligationIds.includes("handoff:bootstrap-flow:entry-runtime:edge"));
  assert.ok(!correction.obligationIds.some((id) => id.includes(":guarantee:")));
  assert.deepEqual(correction.evidenceRefs, [
    "FlowContract:bootstrap-flow",
    "VerificationResult:failed-proof",
    "VerificationRun:failed-run",
  ]);
  assert.equal(correction.diagnostic.excerpt, "expected runtime handoff");
});

test("stale verification asks for the exact selected check to be rerun", () => {
  const result = validateChange({
    task: "change bootstrap",
    changedPaths: ["src/index.ts"],
    baseRef: "HEAD",
    taskPact: pact(),
    ownershipMap,
    systemContracts: [systemContract("app", ["src/index.ts"], ["npm run test:app"])],
    files: [{ path: "src/index.ts", status: "modified" }],
    verificationEvidence: [{
      ref: ref("VerificationResult", "stale-proof"),
      generatedAt: "2026-07-21T01:00:00.000Z",
      freshness: "stale",
      provenance: "runner-derived",
      verifier: { id: "@rekon/capability-verify", version: "1.0.0" },
      commandResults: [{ command: "npm run test:app", status: "passed" }],
    }],
  });

  assert.equal(result.correctiveContext.entries[0].kind, "stale-check");
  assert.match(result.correctiveContext.entries[0].nextAction, /Rerun npm run test:app/u);
});

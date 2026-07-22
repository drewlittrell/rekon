import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRepositoryContractJudgmentPrompt,
  coerceRepositoryContractJudgmentDrafts,
} from "../dist/index.js";

const report = {
  header: {
    artifactType: "ContractCandidateReport",
    artifactId: "candidates-1",
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-20T20:00:00.000Z",
    subject: { repoId: "example" },
    producer: { id: "@rekon/capability-model", version: "1.0.0" },
    inputRefs: [],
  },
  evidenceInventory: {
    status: "complete",
    topologyBasis: "structural",
    structural: { artifactTypes: ["GraphSlice"], graphClaims: 4, runtimeClaims: 0 },
    verification: {
      adoptedFlowContracts: 0,
      runtimeObservationReports: { indexed: 0, validated: 0 },
      isolatedCoverageRecords: 0,
    },
    issues: [],
    notes: ["No validated isolated coverage records were available."],
  },
  candidates: [{
    id: "candidate:system:intelligence",
    kind: "system",
    targetId: "intelligence",
    confidence: 0.72,
    rationale: "Observed ownership.",
    evidenceRefs: [{ type: "ObservedRepo", id: "repo-1", schemaVersion: "1.0.0" }],
    proposed: {
      id: "intelligence",
      systemId: "intelligence",
      scope: { paths: ["src/intelligence/**"] },
      purpose: "Own observed intelligence behavior.",
      invariants: [{ id: "placeholder", statement: "Preserve observed behavior." }],
    },
  }, {
    id: "candidate:system:runtime",
    kind: "system",
    targetId: "runtime",
    confidence: 0.6,
    rationale: "Observed ownership.",
    evidenceRefs: [{ type: "ObservedRepo", id: "repo-1", schemaVersion: "1.0.0" }],
    proposed: {
      id: "runtime",
      systemId: "runtime",
      scope: { paths: ["src/runtime/**"] },
      purpose: "Own observed runtime behavior.",
      invariants: [{ id: "placeholder", statement: "Preserve observed behavior." }],
    },
  }],
  unresolved: [],
  summary: { total: 2, systems: 2, flows: 0, unresolved: 0 },
};

const flowReport = {
  ...report,
  candidates: [{
    id: "candidate:flow:route:checkout",
    kind: "flow",
    targetId: "flow:route:checkout",
    confidence: 0.82,
    rationale: "Observed route-to-service flow.",
    evidenceRefs: [{ type: "GraphSlice", id: "graph-1", schemaVersion: "1.0.0" }],
    proposed: {
      id: "flow:route:checkout",
      name: "Checkout request flow",
      criticality: "high",
      purpose: "Carry checkout requests to completion.",
      userOutcomes: ["A checkout request reaches a completed response."],
      entryConditions: ["The checkout route receives a request."],
      completionConditions: ["The checkout response is returned."],
      systems: ["checkout"],
      paths: ["src/controller.ts", "src/service.ts"],
      invariants: [{ id: "checkout-preserved", statement: "Preserve checkout meaning." }],
      stages: [
        { id: "stage:controller", paths: ["src/controller.ts"] },
        { id: "stage:service", paths: ["src/service.ts"] },
      ],
      handoffs: [{
        id: "handoff:controller:service",
        fromStageId: "stage:controller",
        toStageId: "stage:service",
        verification: {
          acceptedMethods: ["test"],
          acceptancePolicy: "all-required",
          requiredChecks: ["npm test -- checkout.test.ts"],
        },
      }],
    },
  }],
  summary: { total: 1, systems: 0, flows: 1, unresolved: 0 },
};

test("judgment prompt makes source inspection and repository-native rewriting explicit", () => {
  const prompt = buildRepositoryContractJudgmentPrompt(report);
  assert.match(prompt, /inspect the source/);
  assert.match(prompt, /replace generic discovery wording/);
  assert.match(prompt, /explicit verification policy/);
  assert.match(prompt, /complete inventory means indexed sources were read successfully/);
  assert.match(prompt, /model-judgment verifier as provisional/);
  assert.match(prompt, /Discovery evidence inventory/);
  assert.match(prompt, /No validated isolated coverage records were available/);
  assert.match(prompt, /do not invent command names/);
  assert.match(prompt, /do not silently invent product intent/);
  assert.match(prompt, /candidate:system:intelligence/);
});

test("accepted flow judgments cannot silently drop discovered verifier policy", () => {
  const candidate = flowReport.candidates[0];
  const proposed = {
    ...candidate.proposed,
    handoffs: candidate.proposed.handoffs.map(({ verification: _verification, ...handoff }) => handoff),
  };
  assert.throws(() => coerceRepositoryContractJudgmentDrafts({
    judgments: [{
      candidateId: candidate.id,
      decision: "accept",
      confidence: 0.9,
      rationale: "The route and service establish the flow.",
      citations: [{ path: "src/controller.ts", lineStart: 1 }],
      proposed,
    }],
  }, flowReport), /verification must remain explicit/);
});

test("judgment coercion validates accepted proposals and fills omitted candidates as uncertain", () => {
  const drafts = coerceRepositoryContractJudgmentDrafts({
    judgments: [{
      candidateId: "candidate:system:intelligence",
      decision: "accept",
      confidence: 0.91,
      rationale: "The subsystem docs and implementation establish the evidence-first boundary.",
      citations: [{ path: "src/intelligence/index.ts", lineStart: 1, lineEnd: 8 }],
      proposed: {
        id: "intelligence",
        systemId: "intelligence",
        scope: { paths: ["src/intelligence/**"] },
        purpose: "Compile repository evidence into task-shaped context.",
        userOutcomes: ["Agents receive relevant repository context before editing."],
        invariants: [{ id: "evidence-first", statement: "Every derived claim retains evidence provenance." }],
        requiredChecks: ["npm run test"],
      },
    }],
  }, report);

  assert.equal(drafts[0].decision, "accept");
  assert.equal(drafts[0].proposed.purpose, "Compile repository evidence into task-shaped context.");
  assert.equal(drafts[1].decision, "uncertain");
  assert.match(drafts[1].rationale, /No agent judgment/);
});

test("judgment coercion rejects accepted generic drafts without citations or revised contracts", () => {
  assert.throws(() => coerceRepositoryContractJudgmentDrafts({
    judgments: [{
      candidateId: "candidate:system:intelligence",
      decision: "accept",
      confidence: 0.9,
      rationale: "Looks plausible.",
      citations: [],
    }],
  }, report), /requires a current source citation/);
});

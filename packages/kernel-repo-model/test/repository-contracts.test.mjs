import assert from "node:assert/strict";
import test from "node:test";

import {
  createEffectiveContractRegistry,
  createFlowContract,
  createSystemContract,
  validateFlowContract,
  validateRepositoryContractSourceDocument,
} from "../dist/index.js";

const evidenceRef = {
  type: "EvidenceGraph",
  id: "evidence-1",
  schemaVersion: "1.0.0",
};

function header(artifactType) {
  return {
    artifactType,
    artifactId: `${artifactType}-1`,
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-20T18:00:00.000Z",
    subject: { repoId: "example" },
    producer: { id: "@rekon/capability-model", version: "1.0.0" },
    inputRefs: [evidenceRef],
  };
}

test("repository contract source validates system and flow law", () => {
  const result = validateRepositoryContractSourceDocument({
    version: "1.0.0",
    sourceId: "example.intelligence",
    systems: [{
      id: "intelligence-system",
      systemId: "intelligence",
      scope: { paths: ["packages/intelligence/**"] },
      purpose: "Compose meaning from semantic atoms.",
      invariants: [{
        id: "nlu.compositional-vocabulary",
        statement: "Unknown phrases are decomposed and recomposed.",
      }],
      prohibitedChanges: [{
        id: "nlu.no-phrase-overfit",
        statement: "Do not add aliases for phrases composed from known atoms.",
      }],
      requiredChecks: ["npm run nlu:eval:intents"],
    }],
    flows: [{
      id: "experience-selection",
      name: "Experience selection",
      criticality: "critical",
      purpose: "Select the intended experience from a user utterance.",
      userOutcomes: ["Equivalent phrasing selects the same experience."],
      completionConditions: ["The intended experience is selected."],
      invariants: [{
        id: "meaning-preserved",
        statement: "Composed meaning survives every stage.",
      }],
      stages: [{ id: "normalize" }, { id: "select" }],
      handoffs: [{
        id: "normalized-meaning",
        fromStageId: "normalize",
        toStageId: "select",
        carriedInvariantIds: ["meaning-preserved"],
      }],
    }],
  });

  assert.equal(result.ok, true);
});

test("repository contract source rejects generated workspace scopes and broken flow refs", () => {
  const result = validateRepositoryContractSourceDocument({
    version: "1.0.0",
    sourceId: "invalid",
    systems: [{
      id: "bad",
      systemId: "bad",
      scope: { paths: [".rekon/artifacts/**"] },
      purpose: "Invalid scope.",
      invariants: [{ id: "one", statement: "One." }],
    }],
    flows: [{
      id: "broken",
      name: "Broken",
      criticality: "normal",
      purpose: "Broken references.",
      userOutcomes: ["Done."],
      completionConditions: ["Done."],
      invariants: [{ id: "known", statement: "Known." }],
      stages: [{ id: "start" }],
      handoffs: [{
        id: "bad-edge",
        fromStageId: "start",
        toStageId: "missing",
        carriedInvariantIds: ["unknown"],
      }],
    }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.systems[0].scope.paths[0]"));
  assert.ok(result.issues.some((issue) => issue.path === "$.flows[0].handoffs[0].toStageId"));
  assert.ok(result.issues.some((issue) => issue.path === "$.flows[0].handoffs[0].carriedInvariantIds[0]"));
});

test("system and flow artifact factories normalize public contracts", () => {
  const clause = {
    id: "meaning-preserved",
    statement: "Preserve meaning.",
    authority: "adopted",
    confidence: 1,
    sourceRefs: [{ path: "packages/intelligence/rekon.contract.json", digest: "a".repeat(64), sourceId: "example.intelligence" }],
    evidenceRefs: [evidenceRef, evidenceRef],
  };
  const system = createSystemContract({
    header: header("SystemContract"),
    contractId: "intelligence",
    authority: "adopted",
    confidence: 1,
    source: { path: "packages/intelligence/rekon.contract.json", digest: "a".repeat(64), sourceId: "example.intelligence" },
    system: { id: "intelligence", paths: ["packages/intelligence/**", "packages/intelligence/**"] },
    purpose: "Compose meaning.",
    userOutcomes: ["Flexible matching.", "Flexible matching."],
    invariants: [clause],
    prohibitedChanges: [],
    requiredContextPaths: ["packages/intelligence/src/contracts.ts"],
    requiredChecks: ["npm run nlu:eval:intents"],
  });
  const flow = createFlowContract({
    header: header("FlowContract"),
    contractId: "experience-selection",
    authority: "corroborated",
    confidence: 0.9,
    source: { candidateRef: evidenceRef },
    name: "Experience selection",
    criticality: "critical",
    purpose: "Select an experience.",
    userOutcomes: ["Correct selection."],
    entryConditions: [],
    completionConditions: ["Selection returned."],
    systems: ["intelligence"],
    paths: ["packages/intelligence/**"],
    invariants: [clause],
    stages: [
      { id: "normalize", evidenceRefs: [evidenceRef] },
      { id: "select", evidenceRefs: [evidenceRef] },
    ],
    handoffs: [{
      id: "meaning",
      fromStageId: "normalize",
      toStageId: "select",
      carriedInvariantIds: ["meaning-preserved"],
      evidenceRefs: [evidenceRef],
    }],
    requiredChecks: [],
  });

  assert.deepEqual(system.system.paths, ["packages/intelligence/**"]);
  assert.deepEqual(system.invariants[0].evidenceRefs, [evidenceRef]);
  assert.equal(validateFlowContract(flow).ok, true);
});

test("effective contract registry summarizes authority and rejects duplicate identities", () => {
  const registry = createEffectiveContractRegistry({
    header: header("EffectiveContractRegistry"),
    entries: [{
      contractType: "SystemContract",
      contractId: "intelligence",
      authority: "adopted",
      confidence: 1,
      ref: { type: "SystemContract", id: "system-1", schemaVersion: "1.0.0" },
      systems: ["intelligence"],
      paths: ["packages/intelligence/**"],
      flowIds: [],
      clauseIds: ["meaning-preserved"],
    }],
  });

  assert.equal(registry.summary.total, 1);
  assert.equal(registry.summary.byAuthority.adopted, 1);
  assert.equal(registry.summary.byType.SystemContract, 1);
  assert.throws(() => createEffectiveContractRegistry({
    header: header("EffectiveContractRegistry"),
    entries: [registry.entries[0], registry.entries[0]],
  }), /Duplicate effective contract/u);
});

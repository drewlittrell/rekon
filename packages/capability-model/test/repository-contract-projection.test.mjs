import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryContractProjection } from "../dist/index.js";

const source = {
  path: "packages/intelligence/rekon.contract.json",
  digest: "a".repeat(64),
  document: {
    version: "1.0.0",
    sourceId: "mentor.intelligence",
    systems: [{
      id: "intelligence",
      systemId: "intelligence",
      scope: { paths: ["packages/intelligence/**"] },
      purpose: "Compose meaning from semantic atoms.",
      userOutcomes: ["Novel phrasing resolves through known meaning."],
      invariants: [{ id: "compositional", statement: "Compose known atoms instead of adding phrase aliases." }],
      requiredChecks: ["npm run nlu:eval:intents"],
    }],
    flows: [{
      id: "experience-selection",
      name: "Experience selection",
      criticality: "critical",
      purpose: "Select the intended experience.",
      userOutcomes: ["Equivalent phrasing selects the same experience."],
      completionConditions: ["An experience is selected from composed meaning."],
      systems: ["intelligence"],
      paths: ["packages/intelligence/**"],
      invariants: [{ id: "meaning-survives", statement: "Meaning survives normalization and selection." }],
      stages: [{ id: "normalize" }, { id: "select" }],
      handoffs: [{ id: "meaning", fromStageId: "normalize", toStageId: "select", carriedInvariantIds: ["meaning-survives"] }],
    }],
  },
};

test("committed sources compile into adopted contracts and one effective registry", () => {
  const projection = buildRepositoryContractProjection({
    repoId: "mentor",
    generatedAt: "2026-07-20T19:00:00.000Z",
    sources: [source],
  });

  assert.equal(projection.systemContracts.length, 1);
  assert.equal(projection.flowContracts.length, 1);
  assert.equal(projection.systemContracts[0].authority, "adopted");
  assert.equal(projection.systemContracts[0].invariants[0].sourceRefs[0].path, source.path);
  assert.deepEqual(projection.flowContracts[0].handoffs[0].carriedInvariantIds, ["meaning-survives"]);
  assert.equal(projection.registry.summary.total, 2);
  assert.equal(projection.registry.summary.byAuthority.adopted, 2);
  assert.deepEqual(projection.registry.header.inputRefs.map((ref) => ref.type), ["SystemContract", "FlowContract"]);
  assert.deepEqual(projection.systemContracts[0].header.invalidation.inputs, [{ kind: "config", path: source.path, digest: source.digest }]);
});

test("projection rejects duplicate contract identities across source files", () => {
  assert.throws(() => buildRepositoryContractProjection({
    repoId: "mentor",
    sources: [source, { ...source, path: "rekon/contracts/duplicate.json", document: { ...source.document, sourceId: "duplicate" } }],
  }), /Duplicate repository contract SystemContract:intelligence/u);
});

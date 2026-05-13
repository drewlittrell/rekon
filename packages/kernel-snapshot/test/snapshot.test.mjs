import assert from "node:assert/strict";
import test from "node:test";

import {
  createIntelligenceSnapshot,
  intelligenceSnapshotSchema,
  latestRefForType,
  refsForType,
  validateIntelligenceSnapshot,
} from "../dist/index.js";

const evidenceRef = {
  type: "EvidenceGraph",
  id: "evidence-1",
  path: ".rekon/artifacts/evidence/evidence-1.json",
  schemaVersion: "0.1.0",
};

const observedRepoRef = {
  type: "ObservedRepo",
  id: "observed-1",
  path: ".rekon/artifacts/actions/observed-1.json",
  schemaVersion: "0.1.0",
};

const header = {
  artifactType: "IntelligenceSnapshot",
  artifactId: "snapshot-1",
  schemaVersion: "0.1.0",
  generatedAt: "2026-05-13T17:00:00.000Z",
  subject: {
    repoId: "rekon",
  },
  producer: {
    id: "@rekon/kernel-snapshot-test",
    version: "0.1.0",
  },
  inputRefs: [evidenceRef],
};

test("createIntelligenceSnapshot normalizes optional groups and status", () => {
  const snapshot = createIntelligenceSnapshot({
    header,
    repo: {
      id: "rekon",
      root: "/repo",
    },
    inputs: {
      EvidenceGraph: [evidenceRef],
    },
    projections: {
      ObservedRepo: [observedRepoRef],
    },
    status: {
      freshness: "fresh",
      warnings: ["b", "a"],
    },
  });

  assert.equal(intelligenceSnapshotSchema.validate(snapshot).ok, true);
  assert.deepEqual(snapshot.status, {
    freshness: "fresh",
    warnings: ["a", "b"],
    blockedReasons: [],
  });
  assert.deepEqual(snapshot.evaluations, {});
  assert.deepEqual(refsForType(snapshot, "EvidenceGraph"), [evidenceRef]);
  assert.deepEqual(latestRefForType(snapshot, "ObservedRepo"), observedRepoRef);
});

test("validateIntelligenceSnapshot rejects invalid headers and ref groups", () => {
  const result = validateIntelligenceSnapshot({
    header: {
      ...header,
      artifactType: "EvidenceGraph",
    },
    repo: {
      id: "",
      root: "/repo",
    },
    inputs: {
      EvidenceGraph: [{ type: "EvidenceGraph" }],
    },
    projections: {},
    evaluations: {},
    publications: {},
    actions: {},
    status: {
      freshness: "maybe",
      warnings: [1],
      blockedReasons: [],
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    [
      "$.header.artifactType",
      "$.repo.id",
      "$.inputs.EvidenceGraph[0].id",
      "$.inputs.EvidenceGraph[0].schemaVersion",
      "$.status.freshness",
      "$.status.warnings",
    ],
  );
});

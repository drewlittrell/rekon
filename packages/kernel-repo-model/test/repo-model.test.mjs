import assert from "node:assert/strict";
import test from "node:test";

import {
  createCapabilityMap,
  createObservedRepo,
  createOwnershipMap,
  validateObservedRepo,
  validateOwnershipMap,
} from "../dist/index.js";

const evidenceRef = {
  type: "EvidenceGraph",
  id: "evidence-1",
  schemaVersion: "0.1.0",
};

function header(artifactType) {
  return {
    artifactType,
    artifactId: `${artifactType}-1`,
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-13T17:00:00.000Z",
    subject: {
      repoId: "rekon",
    },
    producer: {
      id: "@rekon/kernel-repo-model-test",
      version: "0.1.0",
    },
    inputRefs: [evidenceRef],
  };
}

test("createObservedRepo normalizes systems, layers, capabilities, and paths", () => {
  const observed = createObservedRepo({
    header: header("ObservedRepo"),
    repository: {
      id: "rekon",
      root: "/repo",
    },
    systems: [
      {
        id: "src",
        paths: ["src/b.ts", "src/a.ts"],
        layers: ["source"],
        capabilities: ["cli"],
        confidence: 0.6,
        evidence: [evidenceRef],
      },
      {
        id: "src",
        paths: ["src/a.ts"],
        layers: ["runtime"],
        capabilities: ["runtime"],
        confidence: 0.8,
        evidence: [evidenceRef],
      },
    ],
    layers: [],
    capabilities: [],
  });

  assert.deepEqual(observed.systems, [{
    id: "src",
    paths: ["src/a.ts", "src/b.ts"],
    layers: ["runtime", "source"],
    capabilities: ["cli", "runtime"],
    confidence: 0.8,
    evidence: [evidenceRef],
  }]);
  assert.deepEqual(observed.layers, ["runtime", "source"]);
  assert.deepEqual(observed.capabilities, ["cli", "runtime"]);
});

test("ownership and capability maps normalize entries", () => {
  const ownership = createOwnershipMap({
    header: header("OwnershipMap"),
    entries: [
      {
        path: "src/index.ts",
        ownerSystem: "src",
        layer: "source",
        basis: "inferred",
        confidence: 0.9,
        evidence: [evidenceRef],
      },
    ],
  });
  const capability = createCapabilityMap({
    header: header("CapabilityMap"),
    entries: [
      {
        capability: "cli",
        subjects: ["src/index.ts", "src/index.ts"],
        systems: ["src"],
        confidence: 0.9,
        evidence: [evidenceRef],
      },
    ],
  });

  assert.equal(validateOwnershipMap(ownership).ok, true);
  assert.equal(ownership.entries[0].basis, "inferred");
  assert.deepEqual(capability.entries[0].subjects, ["src/index.ts"]);
});

test("ownership basis rejects unknown provenance labels", () => {
  const result = validateOwnershipMap({
    header: header("OwnershipMap"),
    entries: [{
      path: "src/index.ts",
      ownerSystem: "src",
      basis: "guessed",
      confidence: 0.9,
      evidence: [evidenceRef],
    }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.entries[0].basis"));
});

test("capability maps merge repeated capability evidence instead of dropping subjects", () => {
  const secondEvidenceRef = {
    type: "EvidenceGraph",
    id: "evidence-2",
    schemaVersion: "0.1.0",
  };
  const capability = createCapabilityMap({
    header: header("CapabilityMap"),
    entries: [
      {
        capability: "send notifications",
        subjects: ["identity/notify.ts"],
        systems: ["identity"],
        confidence: 0.8,
        evidence: [secondEvidenceRef],
      },
      {
        capability: "send notifications",
        subjects: ["billing/notify.ts"],
        systems: ["billing"],
        confidence: 0.9,
        evidence: [evidenceRef],
      },
    ],
  });

  assert.deepEqual(capability.entries, [{
    capability: "send notifications",
    subjects: ["billing/notify.ts", "identity/notify.ts"],
    systems: ["billing", "identity"],
    confidence: 0.9,
    evidence: [evidenceRef, secondEvidenceRef],
  }]);
});

test("validation rejects wrong artifact types and invalid confidence", () => {
  const result = validateObservedRepo({
    header: header("EvidenceGraph"),
    repository: {
      id: "rekon",
      root: "/repo",
    },
    systems: [{
      id: "",
      paths: [],
      layers: [],
      capabilities: [],
      confidence: 2,
      evidence: [],
    }],
    layers: [],
    capabilities: [],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    ["$.header.artifactType", "$.systems[0].id", "$.systems[0].confidence"],
  );
});

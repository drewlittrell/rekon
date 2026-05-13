import assert from "node:assert/strict";
import test from "node:test";

import {
  artifactHeaderSchema,
  artifactRefSchema,
  assertArtifactHeader,
  assertArtifactRef,
  canonicalJson,
  createJsonArtifact,
  digestJson,
  jsonArtifactSchema,
  toArtifactRef,
  validateArtifactHeader,
  validateArtifactRef,
} from "../dist/index.js";

const validRef = {
  type: "EvidenceGraph",
  id: "evidence-1",
  schemaVersion: "0.1.0",
};

const validHeader = {
  artifactType: "FindingReport",
  artifactId: "findings-1",
  schemaVersion: "0.1.0",
  generatedAt: "2026-05-13T17:00:00.000Z",
  subject: {
    repoId: "rekon",
    ref: "refs/heads/main",
    commit: "abc123",
    paths: ["src/index.ts"],
    systems: ["kernel"],
  },
  producer: {
    id: "@rekon/kernel-artifacts-test",
    version: "0.1.0",
  },
  inputRefs: [validRef],
  freshness: {
    status: "fresh",
  },
  provenance: {
    confidence: 1,
    notes: ["fixture"],
  },
};

test("ArtifactRef validates required public fields", () => {
  assert.deepEqual(validateArtifactRef(validRef), {
    ok: true,
    value: validRef,
    issues: [],
  });

  const result = validateArtifactRef({ type: "EvidenceGraph" });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    ["$.id", "$.schemaVersion"],
  );
  assert.deepEqual(artifactRefSchema.parse(validRef), validRef);
  assert.throws(() => assertArtifactRef({ id: "missing-type" }), /ArtifactRef validation failed/);
});

test("ArtifactHeader validates required metadata and nested input refs", () => {
  assert.deepEqual(validateArtifactHeader(validHeader), {
    ok: true,
    value: validHeader,
    issues: [],
  });

  const result = validateArtifactHeader({
    artifactType: "FindingReport",
    artifactId: "findings-1",
    schemaVersion: "0.1.0",
    generatedAt: "not-a-date",
    subject: {},
    producer: { id: "@rekon/test" },
    inputRefs: [{ type: "EvidenceGraph" }],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    [
      "$.generatedAt",
      "$.subject.repoId",
      "$.producer.version",
      "$.inputRefs[0].id",
      "$.inputRefs[0].schemaVersion",
    ],
  );
  assert.deepEqual(artifactHeaderSchema.parse(validHeader), validHeader);
  assert.throws(() => assertArtifactHeader({}), /ArtifactHeader validation failed/);
});

test("ArtifactHeader validates optional freshness and provenance contracts", () => {
  const result = validateArtifactHeader({
    ...validHeader,
    freshness: {
      status: "maybe",
      invalidatedBy: [1],
    },
    provenance: {
      confidence: 2,
      notes: ["ok", 1],
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    [
      "$.freshness.status",
      "$.freshness.invalidatedBy",
      "$.provenance.confidence",
      "$.provenance.notes",
    ],
  );
});

test("JSON artifact helper validates header and data wrapper", () => {
  const artifact = createJsonArtifact({
    header: validHeader,
    data: {
      findings: [],
    },
  });

  assert.equal(jsonArtifactSchema.validate(artifact).ok, true);
  assert.deepEqual(artifact.header, validHeader);
  assert.deepEqual(artifact.data, { findings: [] });

  const invalid = jsonArtifactSchema.validate({ header: validHeader });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.issues, [{ path: "$.data", message: "Expected a data property." }]);
});

test("digestJson uses canonical key ordering and ignores undefined object values", () => {
  const left = {
    b: 2,
    a: {
      d: undefined,
      c: [3, { y: true, x: "value" }],
    },
  };
  const right = {
    a: {
      c: [3, { x: "value", y: true }],
    },
    b: 2,
  };

  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(digestJson(left), digestJson(right));
  assert.equal(
    digestJson({ a: 1 }),
    "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862",
  );
});

test("toArtifactRef derives a ref from a validated header", () => {
  assert.deepEqual(
    toArtifactRef(validHeader, { path: ".rekon/artifacts/findings/findings-1.json", digest: "abc" }),
    {
      type: "FindingReport",
      id: "findings-1",
      path: ".rekon/artifacts/findings/findings-1.json",
      digest: "abc",
      schemaVersion: "0.1.0",
    },
  );
});

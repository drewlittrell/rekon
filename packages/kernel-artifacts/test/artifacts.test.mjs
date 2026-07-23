import assert from "node:assert/strict";
import test from "node:test";

import {
  artifactHeaderSchema,
  artifactLineageAssessmentSchema,
  artifactLineageRootKey,
  artifactRefSchema,
  artifactRefKey,
  assertArtifactHeader,
  assertArtifactRef,
  assertSourceStateBinding,
  canonicalJson,
  createJsonArtifact,
  createSourceStateBinding,
  digestJson,
  jsonArtifactSchema,
  sourceStateBindingsMatch,
  toArtifactRef,
  validateArtifactHeader,
  validateArtifactLineageAssessment,
  validateArtifactRef,
  validateSourceStateBinding,
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
  invalidation: {
    inputs: [
      { kind: "source", path: "src/index.ts", digest: "source-digest" },
      { kind: "config", path: "package.json", digest: "config-digest" },
    ],
    producers: [{ id: "@rekon/capability-test.provider", version: "1.0.0" }],
  },
  supersession: {
    key: "finding-report:repository",
  },
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

test("artifact lineage contracts preserve roots and correlated seed refs", () => {
  const secondRef = { type: "VerificationResult", id: "verification-2", schemaVersion: "0.1.0" };
  const assessment = {
    seedRefs: [validRef, secondRef],
    roots: [{
      key: artifactLineageRootKey(validRef),
      ref: validRef,
      seedRefs: [validRef, secondRef],
    }],
    sharedRootKeys: [artifactLineageRootKey(validRef)],
    visitedArtifacts: 3,
    complete: true,
    issues: [],
  };

  assert.equal(artifactRefKey(validRef), "EvidenceGraph:evidence-1:0.1.0");
  assert.equal(validateArtifactLineageAssessment(assessment).ok, true);
  assert.deepEqual(artifactLineageAssessmentSchema.parse(assessment), assessment);
  assert.equal(validateArtifactLineageAssessment({ ...assessment, visitedArtifacts: -1 }).ok, false);
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

test("ArtifactHeader validates optional invalidation baselines", () => {
  const result = validateArtifactHeader({
    ...validHeader,
    invalidation: {
      inputs: [{ kind: "other", path: "", digest: "" }],
      producers: [{ id: "", version: 1 }],
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    [
      "$.invalidation.inputs[0].kind",
      "$.invalidation.inputs[0].path",
      "$.invalidation.inputs[0].digest",
      "$.invalidation.producers[0].id",
      "$.invalidation.producers[0].version",
    ],
  );
});

test("ArtifactHeader validates optional supersession identity", () => {
  const result = validateArtifactHeader({
    ...validHeader,
    supersession: { key: "" },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, [
    { path: "$.supersession.key", message: "Expected a non-empty string." },
  ]);
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

test("source-state bindings are deterministic across file ordering", () => {
  const first = createSourceStateBinding({
    baseRef: "a".repeat(40),
    files: [
      { path: "src/new.ts", status: "added", afterSha256: "c".repeat(64) },
      {
        path: "src/index.ts",
        status: "modified",
        beforeSha256: "a".repeat(64),
        afterSha256: "b".repeat(64),
      },
    ],
  });
  const second = createSourceStateBinding({
    baseRef: "a".repeat(40),
    files: [...first.files].reverse(),
  });

  assert.equal(first.digest.length, 64);
  assert.equal(first.digest, second.digest);
  assert.equal(sourceStateBindingsMatch(first, second), true);
  assert.equal(validateSourceStateBinding(first).ok, true);
  assert.deepEqual(assertSourceStateBinding(first), first);

  const unsortedFiles = [...first.files].reverse();
  const unsorted = validateSourceStateBinding({
    baseRef: first.baseRef,
    files: unsortedFiles,
    digest: digestJson({ baseRef: first.baseRef, files: unsortedFiles }),
  });
  assert.equal(unsorted.ok, false);
  assert.ok(unsorted.issues.some((issue) => issue.path === "$.files"));
});

test("source-state bindings reject unsafe paths, contradictory status, and forged digests", () => {
  assert.throws(() => createSourceStateBinding({
    baseRef: "HEAD",
    files: [{ path: "../outside.ts", status: "added", afterSha256: "a".repeat(64) }],
  }), /safe repository-relative source path/u);

  assert.throws(() => createSourceStateBinding({
    baseRef: "HEAD",
    files: [{
      path: "src/index.ts",
      status: "modified",
      beforeSha256: "a".repeat(64),
      afterSha256: "a".repeat(64),
    }],
  }), /different before and after digests/u);

  const valid = createSourceStateBinding({
    baseRef: "HEAD",
    files: [{
      path: "src/index.ts",
      status: "unchanged",
      beforeSha256: "a".repeat(64),
      afterSha256: "a".repeat(64),
    }],
  });
  assert.equal(validateSourceStateBinding({ ...valid, digest: "f".repeat(64) }).ok, false);
});

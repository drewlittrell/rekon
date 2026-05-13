import assert from "node:assert/strict";
import test from "node:test";

import {
  assertEvidenceFact,
  createEvidenceGraph,
  dedupeEvidenceFacts,
  evidenceGraphSchema,
  getEvidenceFactKindGuidance,
  isBuiltInEvidenceFactKind,
  isNamespacedEvidenceFactKind,
  validateConfidence,
  validateEvidenceFact,
  validateEvidenceGraph,
  validateProviderContext,
} from "../dist/index.js";

const validHeader = {
  artifactType: "EvidenceGraph",
  artifactId: "evidence-1",
  schemaVersion: "0.1.0",
  generatedAt: "2026-05-13T17:00:00.000Z",
  subject: {
    repoId: "rekon",
  },
  producer: {
    id: "@rekon/kernel-evidence-test",
    version: "0.1.0",
  },
  inputRefs: [],
  provenance: {
    confidence: 1,
  },
};

const validFact = {
  id: "fact-1",
  kind: "file",
  subject: "src/index.ts",
  value: {
    path: "src/index.ts",
    language: "typescript",
  },
  confidence: 0.9,
  provenance: {
    source: "repo",
    pack: "@rekon/capability-js-ts",
    file: "src/index.ts",
    line: 1,
    extractorVersion: "0.1.0",
  },
};

test("EvidenceFact validates required fields, confidence, and provenance", () => {
  assert.deepEqual(validateEvidenceFact(validFact), {
    ok: true,
    value: validFact,
    issues: [],
  });

  const result = validateEvidenceFact({
    id: "",
    kind: "file",
    subject: "src/index.ts",
    value: [],
    confidence: 2,
    provenance: {
      source: "repo",
      pack: "",
      line: 0,
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    [
      "$.id",
      "$.value",
      "$.confidence",
      "$.provenance.pack",
      "$.provenance.extractorVersion",
      "$.provenance.line",
    ],
  );
  assert.deepEqual(assertEvidenceFact(validFact), validFact);
  assert.throws(() => assertEvidenceFact({}), /EvidenceFact validation failed/);
});

test("confidence validation requires a finite number between 0 and 1", () => {
  assert.deepEqual(validateConfidence(0), []);
  assert.deepEqual(validateConfidence(1), []);
  assert.deepEqual(validateConfidence(Number.NaN), [
    { path: "$.confidence", message: "Expected a finite number between 0 and 1." },
  ]);
});

test("EvidenceGraph requires a valid EvidenceGraph artifact header", () => {
  const graph = createEvidenceGraph({
    header: validHeader,
    facts: [validFact],
  });

  assert.equal(evidenceGraphSchema.validate(graph).ok, true);
  assert.deepEqual(graph.facts, [validFact]);

  const result = validateEvidenceGraph({
    header: {
      ...validHeader,
      artifactType: "FindingReport",
    },
    facts: [validFact],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, [
    {
      path: "$.header.artifactType",
      message: "Expected artifactType to be EvidenceGraph.",
    },
  ]);
});

test("ProviderContext validates scan inputs", () => {
  assert.deepEqual(validateProviderContext({
    repoRoot: "/repo",
    includeTests: true,
    changedFiles: ["src/index.ts"],
    changedSince: null,
    incremental: true,
  }), {
    ok: true,
    value: {
      repoRoot: "/repo",
      includeTests: true,
      changedFiles: ["src/index.ts"],
      changedSince: null,
      incremental: true,
    },
    issues: [],
  });

  const result = validateProviderContext({
    repoRoot: "",
    includeTests: "yes",
    changedFiles: [1],
    changedSince: 1,
    incremental: "no",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    ["$.repoRoot", "$.includeTests", "$.changedFiles", "$.changedSince", "$.incremental"],
  );
});

test("unknown fact kinds are allowed while namespaced guidance is exposed", () => {
  assert.equal(isBuiltInEvidenceFactKind("file"), true);
  assert.equal(isBuiltInEvidenceFactKind("openapi:route"), false);
  assert.equal(isNamespacedEvidenceFactKind("openapi:route"), true);
  assert.equal(getEvidenceFactKindGuidance("openapi:route"), null);
  assert.match(getEvidenceFactKindGuidance("customfact"), /namespaced/);

  assert.equal(validateEvidenceFact({
    ...validFact,
    id: "fact-custom",
    kind: "customfact",
  }).ok, true);
});

test("dedupeEvidenceFacts is deterministic and keeps the highest-confidence duplicate", () => {
  const duplicateLowConfidence = {
    ...validFact,
    id: "fact-b",
    confidence: 0.4,
  };
  const duplicateHighConfidence = {
    ...validFact,
    id: "fact-a",
    confidence: 0.95,
  };
  const otherFact = {
    ...validFact,
    id: "fact-c",
    kind: "import",
    subject: "src/consumer.ts",
    value: {
      source: "src/consumer.ts",
      target: "src/index.ts",
    },
  };

  assert.deepEqual(
    dedupeEvidenceFacts([otherFact, duplicateLowConfidence, duplicateHighConfidence]),
    [duplicateHighConfidence, otherFact],
  );
});

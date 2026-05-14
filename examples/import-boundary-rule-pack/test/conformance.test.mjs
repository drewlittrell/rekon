import assert from "node:assert/strict";
import test from "node:test";
import capability, { importBoundaryEvaluator } from "../dist/index.js";
import { assertCapabilityConforms } from "@rekon/sdk";

test("import boundary capability conforms to the Rekon SDK contract", async () => {
  await assertCapabilityConforms(capability);
});

test("evaluator emits both finding types from a synthetic EvidenceGraph", async () => {
  const evidenceRef = {
    type: "EvidenceGraph",
    id: "evidence-synthetic",
    schemaVersion: "0.1.0",
  };

  const graph = {
    header: {
      artifactType: "EvidenceGraph",
      artifactId: "evidence-synthetic",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "synthetic" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
      provenance: { confidence: 1 },
    },
    facts: [
      makeImportFact("src/feature/handler.ts", "../local"),
      makeImportFact("src/feature/handler.ts", "../../dist/generated"),
      makeImportFact("src/feature/other.ts", "./sibling"),
      makeImportFact("src/feature/other.ts", "node:fs"),
    ],
  };

  const writes = [];
  const artifacts = {
    async list(type) {
      return type === "EvidenceGraph" || type === undefined ? [evidenceRef] : [];
    },
    async read(ref) {
      assert.equal(ref.id, evidenceRef.id);
      return graph;
    },
    async write(type, artifact) {
      const ref = {
        type,
        id: artifact.header.artifactId,
        schemaVersion: artifact.header.schemaVersion,
      };
      writes.push({ ref, artifact });
      return ref;
    },
  };

  const refs = await importBoundaryEvaluator.evaluate({
    artifacts,
    input: { repo: { id: "synthetic" } },
  });

  assert.equal(refs.length, 1);
  assert.equal(refs[0].type, "FindingReport");
  assert.equal(writes.length, 1);

  const report = writes[0].artifact;
  const findings = report.findings;

  assert.ok(Array.isArray(findings));
  assert.ok(findings.length >= 2);

  const parentRelative = findings.find(
    (finding) => finding.type === "import_boundary.parent_relative_import",
  );
  const generated = findings.find(
    (finding) => finding.type === "import_boundary.generated_output_import",
  );

  assert.ok(parentRelative, "parent-relative finding must be emitted");
  assert.ok(generated, "generated-output finding must be emitted");

  assert.equal(parentRelative.severity, "medium");
  assert.equal(generated.severity, "high");

  for (const finding of [parentRelative, generated]) {
    assert.ok(Array.isArray(finding.files) && finding.files.length > 0);
    assert.ok(Array.isArray(finding.subjects) && finding.subjects.length > 0);
    assert.ok(Array.isArray(finding.evidence) && finding.evidence.length > 0);
  }
});

test("produced FindingReport carries a valid artifact header", async () => {
  const evidenceRef = {
    type: "EvidenceGraph",
    id: "evidence-header-check",
    schemaVersion: "0.1.0",
  };

  const graph = {
    header: {
      artifactType: "EvidenceGraph",
      artifactId: "evidence-header-check",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "test" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
      provenance: { confidence: 1 },
    },
    facts: [makeImportFact("src/a.ts", "../b")],
  };

  const writes = [];
  const artifacts = {
    async list() {
      return [evidenceRef];
    },
    async read() {
      return graph;
    },
    async write(type, artifact) {
      const ref = {
        type,
        id: artifact.header.artifactId,
        schemaVersion: artifact.header.schemaVersion,
      };
      writes.push({ ref, artifact });
      return ref;
    },
  };

  await importBoundaryEvaluator.evaluate({
    artifacts,
    input: { repo: { id: "header-check" } },
  });

  const header = writes[0].artifact.header;

  assert.equal(header.artifactType, "FindingReport");
  assert.ok(header.artifactId.startsWith("import-boundary-findings-"));
  assert.equal(header.producer.id, "rekon-capability-import-boundaries-example");
  assert.equal(header.subject.repoId, "header-check");
  assert.deepEqual(header.inputRefs, [evidenceRef]);
});

function makeImportFact(source, target) {
  return {
    id: `js-ts:${source}:${target}`,
    kind: "import",
    subject: `${source}:${target}`,
    value: {
      source,
      target,
      line: 1,
    },
    confidence: 0.9,
    provenance: {
      source: "repo",
      pack: "@rekon/capability-js-ts",
      file: source,
      line: 1,
      extractorVersion: "0.1.0",
    },
  };
}

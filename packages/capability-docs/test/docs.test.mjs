import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import docsCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

test("docs publisher writes metadata-bearing publication artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-docs-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [docsCapability],
    });
    const snapshotRef = await runtime.runSnapshot();
    await runtime.artifacts.write({
      header: {
        artifactType: "ResolverPacket",
        artifactId: "preflight-test",
        schemaVersion: "0.1.0",
        generatedAt: "2026-07-10T00:00:00.000Z",
        subject: { repoId: root },
        producer: { id: "test", version: "1.0.0" },
        inputRefs: [snapshotRef],
      },
      relevantFindings: [{ id: "finding-1" }],
      relevantAssessments: [{ kind: "risk" }, { kind: "opportunity" }, { kind: "semantic_claim" }],
    });
    const refs = await runtime.runPublish({
      publisherId: "@rekon/capability-docs.publisher",
    });

    assert.deepEqual(refs.map((ref) => ref.type), ["Publication", "Publication"]);

    const agents = await runtime.artifacts.read(refs[0]);
    assert.equal(agents.header.artifactType, "Publication");
    assert.equal(agents.header.snapshotId, snapshotRef.id);
    assert.equal(agents.kind, "agents");
    assert.equal(agents.header.supersession.key, "agents");
    assert.match(agents.content, /Docs are publications, not canonical truth/);
    assert.match(agents.content, /## Current Preflight Context/);
    assert.match(agents.content, /Governed findings: 1/);
    assert.match(agents.content, /Risks: 1/);
    assert.match(agents.content, /Opportunities: 1/);
    assert.equal(agents.header.inputRefs[0].type, "IntelligenceSnapshot");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("architecture summary publisher writes a Publication with the documented sections", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-arch-docs-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [docsCapability],
    });
    await runtime.runSnapshot();
    const refs = await runtime.runPublish({
      publisherId: "@rekon/capability-docs.architecture-summary",
    });

    assert.equal(refs.length, 1);
    assert.equal(refs[0].type, "Publication");

    const publication = await runtime.artifacts.read(refs[0]);
    assert.equal(publication.kind, "architecture-summary");
    assert.equal(publication.header.supersession.key, "architecture-summary");
    assert.equal(publication.title, "Rekon Architecture Summary");
    assert.match(publication.content, /# Rekon Architecture Summary/);
    assert.match(publication.content, /## Repository Overview/);
    assert.match(publication.content, /## Coherency Summary/);
    assert.match(publication.content, /## Remediation Queue/);
    assert.match(publication.content, /## Agent Guidance/);
    assert.match(publication.content, /## Input Artifacts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

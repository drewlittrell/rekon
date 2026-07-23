import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import docsCapability from "../dist/index.js";
import { createRuntime } from "@rekon/runtime";

test("docs publishers select current artifacts by recency rather than artifact id", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-docs-recency-"));

  try {
    const runtime = await createRuntime({
      repoRoot: root,
      capabilities: [docsCapability],
    });
    const header = (artifactType, artifactId, inputRefs = []) => ({
      artifactType,
      artifactId,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: root },
      producer: { id: "test", version: "1.0.0" },
      inputRefs,
      freshness: { status: "fresh" },
    });
    const writeSnapshot = (artifactId) => runtime.artifacts.write({
      header: header("IntelligenceSnapshot", artifactId),
      repo: { id: "fixture", root },
      inputs: {},
      projections: {},
      evaluations: {},
      publications: {},
      actions: {},
      status: { freshness: "fresh", warnings: [], blockedReasons: [] },
    });
    const writeCapabilityMap = (artifactId) => runtime.artifacts.write({
      header: header("CapabilityMap", artifactId),
      entries: [],
    });

    await writeSnapshot("z-stale-snapshot");
    await writeCapabilityMap("z-stale-capability-map");
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
    const currentSnapshot = await writeSnapshot("a-current-snapshot");
    const currentCapabilityMap = await writeCapabilityMap("a-current-capability-map");

    const refs = await runtime.runPublish({
      publisherId: "@rekon/capability-docs.architecture-summary",
    });
    const publication = await runtime.artifacts.read(refs[0]);
    const inputKeys = publication.header.inputRefs.map((ref) => `${ref.type}:${ref.id}`);

    assert.ok(inputKeys.includes(`IntelligenceSnapshot:${currentSnapshot.id}`));
    assert.ok(inputKeys.includes(`CapabilityMap:${currentCapabilityMap.id}`));
    assert.ok(!inputKeys.some((key) => key.includes("z-stale")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

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

test("architecture and agent publications index adopted system and flow law", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-law-docs-"));

  try {
    const runtime = await createRuntime({ repoRoot: root, capabilities: [docsCapability] });
    await runtime.runSnapshot();
    const artifactHeader = (artifactType, artifactId, paths = []) => ({
      artifactType,
      artifactId,
      schemaVersion: "1.0.0",
      generatedAt: "2026-07-20T22:00:00.000Z",
      subject: { repoId: root, ...(paths.length > 0 ? { paths } : {}) },
      producer: { id: "@rekon/test", version: "1.0.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    });
    const clause = {
      id: "preserve-result",
      statement: "Preserve the user-visible result.",
      authority: "adopted",
      confidence: 1,
      sourceRefs: [{ path: "rekon/contracts/app.json", digest: "a".repeat(64) }],
      evidenceRefs: [],
    };
    const systemRef = await runtime.artifacts.write({
      header: artifactHeader("SystemContract", "system-app", ["src/**"]),
      contractId: "app-system",
      authority: "adopted",
      confidence: 1,
      source: { path: "rekon/contracts/app.json", digest: "a".repeat(64) },
      system: { id: "app", paths: ["src/**"] },
      purpose: "Deliver the application outcome.",
      userOutcomes: ["The user receives a result."],
      invariants: [clause],
      prohibitedChanges: [],
      requiredContextPaths: [],
      requiredChecks: ["npm test"],
    });
    const flowRef = await runtime.artifacts.write({
      header: artifactHeader("FlowContract", "flow-request", ["src/route.ts", "src/service.ts"]),
      contractId: "request-flow",
      authority: "adopted",
      confidence: 1,
      source: { path: "rekon/contracts/flow.json", digest: "b".repeat(64) },
      name: "Request flow",
      criticality: "high",
      purpose: "Carry the request to its result.",
      userOutcomes: ["The request completes."],
      entryConditions: [],
      completionConditions: ["A result is returned."],
      systems: ["app"],
      paths: ["src/route.ts", "src/service.ts"],
      invariants: [clause],
      stages: [{ id: "route", evidenceRefs: [] }, { id: "service", evidenceRefs: [] }],
      handoffs: [{ id: "route-service", fromStageId: "route", toStageId: "service", guarantees: ["Request meaning is preserved."], evidenceRefs: [] }],
      requiredChecks: ["npm test"],
    });
    await runtime.artifacts.write({
      header: { ...artifactHeader("EffectiveContractRegistry", "registry-law"), inputRefs: [systemRef, flowRef] },
      entries: [
        { contractType: "SystemContract", contractId: "app-system", authority: "adopted", confidence: 1, ref: systemRef, systems: ["app"], paths: ["src/**"], flowIds: [], clauseIds: ["preserve-result"] },
        { contractType: "FlowContract", contractId: "request-flow", authority: "adopted", confidence: 1, ref: flowRef, systems: ["app"], paths: ["src/route.ts", "src/service.ts"], flowIds: ["request-flow"], clauseIds: ["preserve-result"] },
      ],
      summary: {
        total: 2,
        byAuthority: { observed: 0, inferred: 0, corroborated: 0, adopted: 2 },
        byType: { SystemContract: 1, CapabilityContract: 0, HandoffContract: 0, FlowContract: 1 },
      },
    });

    const architectureRefs = await runtime.runPublish({ publisherId: "@rekon/capability-docs.architecture-summary" });
    const architecture = await runtime.artifacts.read(architectureRefs[0]);
    assert.match(architecture.content, /## Adopted Repository Law/u);
    assert.match(architecture.content, /app-system/u);
    assert.match(architecture.content, /Preserve the user-visible result/u);
    assert.match(architecture.content, /request-flow/u);
    assert.match(architecture.content, /Request meaning is preserved/u);

    const agentRefs = await runtime.runPublish({ publisherId: "@rekon/capability-docs.agent-contract" });
    const agent = await runtime.artifacts.read(agentRefs[0]);
    assert.match(agent.content, /## Adopted Repository Law/u);
    assert.match(agent.content, /This is an index, not task context/u);
    assert.match(agent.content, /context_for_task/u);
    assert.ok(agent.header.inputRefs.some((ref) => ref.type === "EffectiveContractRegistry"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

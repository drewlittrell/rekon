// Contract tests for BridgeFindingLifecycleIntegrationReport v1
// (fifty-seventh slice on the capability-ontology track).
//
// The preview artifact models how bridge-derived FindingReport
// entries WOULD enter the finding filter / lifecycle / adjudication /
// CoherencyDelta chain. It is preview-only: it assigns no real
// lifecycle status and mutates no governance artifact. Bridge-derived
// findings are identified structurally (type / details.source /
// details.source* fields), never by title text alone.
//
// Tests pin assertions 1–23 from the work order.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildBridgeFindingLifecycleIntegrationReport,
  isBridgeDerivedFinding,
} from "../../packages/capability-model/dist/index.js";
import {
  createFindingReport,
} from "../../packages/kernel-findings/dist/index.js";
import {
  validateBridgeFindingLifecycleIntegrationReport,
} from "../../packages/kernel-repo-model/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

const EVIDENCE_REF = {
  type: "CapabilityMap",
  id: "capability-map-test-001",
  path: ".rekon/artifacts/projections/CapabilityMap-test.json",
  schemaVersion: "0.1.0",
};
const FINDING_REPORT_REF = {
  type: "FindingReport",
  id: "finding-report-test-001",
  path: ".rekon/artifacts/findings/FindingReport-test.json",
  schemaVersion: "0.1.0",
};

function bridgeFinding(overrides = {}) {
  const contractId = overrides.contractId ?? "fixture.create-user";
  const lintRowId = overrides.lintRowId ?? `${contractId}:forbidden-layer`;
  return {
    id: overrides.id
      ?? `capability-architecture-policy:forbidden-layer:${contractId}:capability-phrase-create-user`,
    type: "capability_architecture_policy",
    severity: overrides.severity ?? "high",
    title: overrides.title ?? "Capability placed on a forbidden layer.",
    evidence: overrides.evidence ?? [EVIDENCE_REF],
    details: {
      source: "capability-lint-bridge",
      sourceBridgeCandidateId: overrides.sourceBridgeCandidateId ?? lintRowId,
      sourceLintRowId: overrides.sourceLintRowId ?? lintRowId,
      sourceContractId: overrides.sourceContractId ?? contractId,
      sourcePhraseCapabilityId:
        overrides.sourcePhraseCapabilityId ?? "capability-phrase:create-user",
      ...(overrides.details ?? {}),
    },
  };
}

function preview(findings) {
  return buildBridgeFindingLifecycleIntegrationReport({
    findingReport: { header: { subject: { repoId: "test" } }, findings },
    findingReportRef: FINDING_REPORT_REF,
    generatedAt: "2026-05-29T02:00:00.000Z",
  });
}

// ---------- 1: validates ----------

test("BridgeFindingLifecycleIntegrationReport validates", () => {
  const report = preview([bridgeFinding()]);
  const result = validateBridgeFindingLifecycleIntegrationReport(report);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
});

// ---------- 2: identify by type ----------

test("helper identifies bridge-derived finding by type", () => {
  assert.equal(isBridgeDerivedFinding({ type: "capability_architecture_policy" }), true);
});

// ---------- 3: identify by details.source ----------

test("helper identifies bridge-derived finding by details.source", () => {
  assert.equal(
    isBridgeDerivedFinding({ type: "todo_comment", details: { source: "capability-lint-bridge" } }),
    true,
  );
});

// ---------- 4: identify by details.source* fields ----------

test("helper identifies bridge-derived finding by sourceBridgeCandidateId / sourceLintRowId / sourceContractId / sourcePhraseCapabilityId", () => {
  assert.equal(isBridgeDerivedFinding({ type: "x", details: { sourceBridgeCandidateId: "c" } }), true);
  assert.equal(isBridgeDerivedFinding({ type: "x", details: { sourceLintRowId: "r" } }), true);
  assert.equal(isBridgeDerivedFinding({ type: "x", details: { sourceContractId: "k" } }), true);
  assert.equal(isBridgeDerivedFinding({ type: "x", details: { sourcePhraseCapabilityId: "p" } }), true);
});

// ---------- 5: does not identify by title text alone ----------

test("helper does not identify ordinary finding by title text alone", () => {
  const decoy = {
    id: "todo:src/index.ts:1",
    type: "todo_comment",
    severity: "low",
    title: "capability_architecture_policy capability-lint-bridge sourceLintRowId",
    details: { note: "unrelated" },
  };
  assert.equal(isBridgeDerivedFinding(decoy), false);
  // And it is omitted from the preview entirely.
  const report = preview([decoy]);
  assert.equal(report.summary.totalBridgeFindings, 0);
  assert.equal(report.entries.length, 0);
});

// ---------- 6: ready-for-lifecycle ----------

test("bridge-derived finding with evidence and trace becomes ready-for-lifecycle", () => {
  const report = preview([bridgeFinding()]);
  assert.equal(report.entries.length, 1);
  assert.equal(report.entries[0].decision, "ready-for-lifecycle");
});

// ---------- 7: ready row gets initialLifecycleStatus new ----------

test("ready-for-lifecycle row gets initialLifecycleStatus new", () => {
  const report = preview([bridgeFinding()]);
  assert.equal(report.entries[0].initialLifecycleStatus, "new");
  // v1 never models resolved.
  assert.ok(report.entries.every((e) => e.initialLifecycleStatus !== "resolved"));
});

// ---------- 8: duplicate finding id ----------

test("duplicate finding id marks later row duplicate", () => {
  const report = preview([
    bridgeFinding({ id: "dup-id" }),
    bridgeFinding({ id: "dup-id", contractId: "fixture.other" }),
  ]);
  const decisions = report.entries.map((e) => e.decision).sort();
  assert.deepEqual(decisions, ["duplicate", "ready-for-lifecycle"]);
  assert.equal(report.summary.duplicate, 1);
  assert.equal(report.summary.readyForLifecycle, 1);
});

// ---------- 9: missing evidenceRefs -> ineligible ----------

test("bridge-derived finding missing evidenceRefs becomes ineligible", () => {
  const report = preview([bridgeFinding({ evidence: [] })]);
  assert.equal(report.entries.length, 1);
  assert.equal(report.entries[0].decision, "ineligible");
  assert.equal(report.entries[0].initialLifecycleStatus, undefined);
});

// ---------- 10: missing expected bridge trace -> needs-review ----------

test("bridge-derived finding missing expected bridge trace becomes needs-review", () => {
  // Identified bridge-derived by type, has evidence, but no
  // sourceLintRowId / sourceContractId trace.
  const finding = {
    id: "capability-architecture-policy:bare",
    type: "capability_architecture_policy",
    severity: "medium",
    title: "Bare bridge-derived finding.",
    evidence: [EVIDENCE_REF],
    details: { source: "capability-lint-bridge" },
  };
  const report = preview([finding]);
  assert.equal(report.entries.length, 1);
  assert.equal(report.entries[0].decision, "needs-review");
  assert.equal(report.entries[0].initialLifecycleStatus, undefined);
});

// ---------- 11: non-bridge finding omitted (documented choice) ----------

test("non-bridge finding is omitted from the preview (documented choice)", () => {
  const report = preview([
    { id: "todo:1", type: "todo_comment", severity: "low", title: "TODO" },
    bridgeFinding(),
  ]);
  // Only the bridge-derived finding is classified; the ordinary
  // finding is omitted (not included as ineligible).
  assert.equal(report.summary.totalBridgeFindings, 1);
  assert.ok(report.entries.every((e) => e.findingId !== "todo:1"));
});

// ---------- 12: summary counts ----------

test("summary counts ready / duplicate / ineligible / needsReview", () => {
  const report = preview([
    bridgeFinding({ id: "ready-1" }),
    bridgeFinding({ id: "ready-1", contractId: "fixture.dup" }), // duplicate
    bridgeFinding({ id: "noev", evidence: [] }), // ineligible
    {
      id: "needs",
      type: "capability_architecture_policy",
      severity: "low",
      title: "x",
      evidence: [EVIDENCE_REF],
      details: { source: "capability-lint-bridge" },
    }, // needs-review
  ]);
  assert.equal(report.summary.totalBridgeFindings, 4);
  assert.equal(report.summary.readyForLifecycle, 1);
  assert.equal(report.summary.duplicate, 1);
  assert.equal(report.summary.ineligible, 1);
  assert.equal(report.summary.needsReview, 1);
});

// ---------- 13: bySeverity deterministic ----------

test("bySeverity counts are deterministic", () => {
  const report = preview([
    bridgeFinding({ id: "h1", severity: "high" }),
    bridgeFinding({ id: "m1", severity: "medium", contractId: "fixture.m" }),
    bridgeFinding({ id: "h2", severity: "high", contractId: "fixture.h2" }),
  ]);
  assert.equal(report.summary.bySeverity.high, 2);
  assert.equal(report.summary.bySeverity.medium, 1);
  // Stable key order (sorted).
  assert.deepEqual(Object.keys(report.summary.bySeverity), ["high", "medium"]);
});

// ---------- 14: CLI writes the report ----------

test("CLI writes BridgeFindingLifecycleIntegrationReport", async () => {
  const work = await setupWorkspaceWithBridgeFindingReport();
  try {
    const result = runCli(work, ["capability", "lint", "lifecycle-preview", "--json"]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.artifact.type, "BridgeFindingLifecycleIntegrationReport");
    assert.ok(payload.summary.totalBridgeFindings >= 1);
    assert.ok(payload.summary.readyForLifecycle >= 1);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: CLI supports pinned FindingReport ----------

test("CLI supports a pinned --finding-report ref", async () => {
  const work = await setupWorkspaceWithBridgeFindingReport();
  try {
    const ref = runCli(work, [
      "artifacts",
      "latest",
      "--type",
      "FindingReport",
      "--id-only",
    ]).stdout.trim();
    const result = runCli(work, [
      "capability",
      "lint",
      "lifecycle-preview",
      "--finding-report",
      ref,
      "--json",
    ]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.artifact.type, "BridgeFindingLifecycleIntegrationReport");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: CLI output says nothing downstream changed ----------

test("CLI output says no FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta changed", async () => {
  const work = await setupWorkspaceWithBridgeFindingReport();
  try {
    const result = runCli(work, ["capability", "lint", "lifecycle-preview"]);
    assert.match(
      result.stdout,
      /No FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta artifacts were changed/i,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17-22: CLI mutates / creates nothing downstream ----------

test("CLI does not mutate FindingFilterReport", async () => {
  await assertTypeUnchangedByPreview("FindingFilterReport");
});

test("CLI does not mutate FindingLifecycleReport", async () => {
  await assertTypeUnchangedByPreview("FindingLifecycleReport");
});

test("CLI does not mutate IssueAdjudicationReport", async () => {
  await assertTypeUnchangedByPreview("IssueAdjudicationReport");
});

test("CLI does not mutate CoherencyDelta", async () => {
  await assertTypeUnchangedByPreview("CoherencyDelta");
});

test("CLI does not create WorkOrder", async () => {
  await assertTypeUnchangedByPreview("WorkOrder");
});

test("CLI does not create VerificationPlan", async () => {
  await assertTypeUnchangedByPreview("VerificationPlan");
});

// ---------- 23: artifacts validate clean ----------

test("rekon artifacts validate stays clean after lifecycle-preview", async () => {
  const work = await setupWorkspaceWithBridgeFindingReport();
  try {
    runCli(work, ["capability", "lint", "lifecycle-preview", "--json"]);
    const validate = runCli(work, ["artifacts", "validate", "--json"]);
    const payload = JSON.parse(validate.stdout);
    assert.ok(Array.isArray(payload.issues));
    assert.equal(payload.issues.length, 0);
    assert.equal(payload.valid, true);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Helpers ----------

function makeBridgeDerivedFindingReport() {
  return createFindingReport({
    header: {
      schemaVersion: "0.1.0",
      artifactType: "FindingReport",
      artifactId: "finding-report-bridge-derived-lifecycle-001",
      generatedAt: "2026-05-29T02:00:00.000Z",
      subject: { repoId: "test-repo" },
      producer: { id: "@rekon/capability-model", version: "0.1.0" },
      inputRefs: [EVIDENCE_REF],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    },
    findings: [
      {
        id: "capability-architecture-policy:forbidden-layer:fixture.create-user:capability-phrase-create-user",
        type: "capability_architecture_policy",
        severity: "high",
        title: "Capability \"create user\" placed on a forbidden layer.",
        description: "Bridge-derived finding (lifecycle-preview contract test).",
        subjects: ["fixture.create-user"],
        evidence: [EVIDENCE_REF],
        details: {
          source: "capability-lint-bridge",
          sourceBridgeCandidateId: "fixture.create-user:forbidden-layer",
          sourceLintRowId: "fixture.create-user:forbidden-layer",
          sourceContractId: "fixture.create-user",
          sourcePhraseCapabilityId: "capability-phrase:create-user",
        },
      },
      {
        id: "capability-architecture-policy:forbidden-layer:fixture.delete-user:capability-phrase-delete-user",
        type: "capability_architecture_policy",
        severity: "medium",
        title: "Capability \"delete user\" placed on a forbidden layer.",
        description: "Bridge-derived finding (lifecycle-preview contract test).",
        subjects: ["fixture.delete-user"],
        evidence: [EVIDENCE_REF],
        details: {
          source: "capability-lint-bridge",
          sourceBridgeCandidateId: "fixture.delete-user:forbidden-layer",
          sourceLintRowId: "fixture.delete-user:forbidden-layer",
          sourceContractId: "fixture.delete-user",
          sourcePhraseCapabilityId: "capability-phrase:delete-user",
        },
      },
    ],
  });
}

async function setupWorkspaceWithBridgeFindingReport() {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-lifecycle-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--json"]);
  const store = createLocalArtifactStore(work);
  await store.init();
  await store.write(makeBridgeDerivedFindingReport(), { category: "findings" });
  return work;
}

async function assertTypeUnchangedByPreview(type) {
  const work = await setupWorkspaceWithBridgeFindingReport();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8")).filter((e) => e.type === type);
    runCli(work, ["capability", "lint", "lifecycle-preview", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8")).filter((e) => e.type === type);
    assert.equal(after.length, before.length, `${type} count must be unchanged by lifecycle-preview`);
    for (const entry of after) {
      const previous = before.find((other) => other.id === entry.id);
      assert.ok(previous, `lifecycle-preview must not add new ${type} artifacts`);
      assert.equal(entry.digest, previous.digest, `${type} ${entry.id} digest must be unchanged`);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

function runCli(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [cliPath, "--root", cwd, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `CLI failed: ${args.join(" ")}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
    );
  }
  return result;
}

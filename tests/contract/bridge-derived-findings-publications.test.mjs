// Contract tests for the bridge-derived findings publication
// surfacing slice (fifty-fourth slice on the capability-ontology
// track).
//
// The architecture-summary publisher and agent-contract publisher
// both surface the *governed* FindingReport entries that the
// controlled `rekon capability lint write-findings
// --confirm-finding-write` writer wrote — identified structurally by
// finding.type === "capability_architecture_policy", by
// details.source === "capability-lint-bridge", or by any
// details.source* trace field (never by title text alone). Both
// surfaces are strictly read-only: never run the bridge writer,
// never mutate FindingReport, FindingLifecycleReport,
// IssueAdjudicationReport, or CoherencyDelta, and never create
// WorkOrder or VerificationPlan. Proof-report surfacing is deferred.
//
// Tests pin assertions 1–23 from the work order.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildBridgeDerivedFindingsPublicationSection,
  isBridgeDerivedFinding,
} from "../../packages/capability-docs/dist/index.js";
import { createFindingReport } from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

const BRIDGE_REF = {
  type: "CapabilityLintFindingBridgeReport",
  id: "capability-lint-finding-bridge-test-001",
  path: ".rekon/artifacts/actions/CapabilityLintFindingBridgeReport-test.json",
  schemaVersion: "0.1.0",
};
const CAPABILITY_MAP_REF = {
  type: "CapabilityMap",
  id: "capability-map-test-001",
  path: ".rekon/artifacts/projections/CapabilityMap-test.json",
  schemaVersion: "0.1.0",
};

// ---------- 1: identify by type ----------

test("helper identifies bridge-derived findings by type", () => {
  assert.equal(
    isBridgeDerivedFinding({ type: "capability_architecture_policy" }),
    true,
  );
  const { count, lines } = buildBridgeDerivedFindingsPublicationSection({
    report: { findings: [{ id: "f1", type: "capability_architecture_policy", severity: "high" }] },
    headingLevel: 2,
  });
  assert.equal(count, 1);
  assert.match(lines.join("\n"), /^## Bridge-Derived Findings/m);
});

// ---------- 2: identify by details.source ----------

test("helper identifies bridge-derived findings by details.source", () => {
  assert.equal(
    isBridgeDerivedFinding({
      type: "todo_comment",
      details: { source: "capability-lint-bridge" },
    }),
    true,
  );
});

// ---------- 3: identify by details.source* trace fields ----------

test("helper identifies bridge-derived findings by sourceBridgeCandidateId / sourceLintRowId / sourceContractId / sourcePhraseCapabilityId", () => {
  assert.equal(
    isBridgeDerivedFinding({ type: "x", details: { sourceBridgeCandidateId: "c1" } }),
    true,
  );
  assert.equal(
    isBridgeDerivedFinding({ type: "x", details: { sourceLintRowId: "r1" } }),
    true,
  );
  assert.equal(
    isBridgeDerivedFinding({ type: "x", details: { sourceContractId: "k1" } }),
    true,
  );
  assert.equal(
    isBridgeDerivedFinding({ type: "x", details: { sourcePhraseCapabilityId: "p1" } }),
    true,
  );
});

// ---------- 4: does NOT classify ordinary findings by title text alone ----------

test("helper does not classify ordinary findings by title text only", () => {
  // A finding whose TITLE mentions capability architecture policy but
  // whose type/details carry no bridge-derived signal must NOT be
  // classified as bridge-derived.
  const decoy = {
    id: "todo:src/index.ts:1",
    type: "todo_comment",
    severity: "low",
    title: "capability_architecture_policy capability-lint-bridge sourceLintRowId",
    details: { note: "unrelated" },
  };
  assert.equal(isBridgeDerivedFinding(decoy), false);
  const { count, lines } = buildBridgeDerivedFindingsPublicationSection({
    report: { findings: [decoy] },
    headingLevel: 2,
  });
  assert.equal(count, 0);
  assert.match(lines.join("\n"), /No bridge-derived FindingReport entries found\./);
});

// ---------- 5: architecture summary renders the section ----------

test("architecture summary renders Bridge-Derived Findings section when bridge-derived findings exist", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const content = String((await loadLatestPublication(work, "architecture-summary")).content ?? "");
    assert.match(content, /^## Bridge-Derived Findings/m);
    assert.match(content, /Bridge-derived findings: 2/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 6: severity distribution ----------

test("architecture summary renders severity distribution", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const content = String((await loadLatestPublication(work, "architecture-summary")).content ?? "");
    assert.match(content, /By severity:.*high/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 7: bounded table with provenance fields ----------

test("architecture summary renders a bounded table with provenance fields", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const content = String((await loadLatestPublication(work, "architecture-summary")).content ?? "");
    assert.match(
      content,
      /\| Severity \| Finding \| Source Candidate \| Source Lint Row \| Source Contract \| Source Capability \|/,
    );
    assert.match(content, /fixture\.create-user:forbidden-layer/);
    assert.match(content, /capability-phrase:create-user/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 8: boundary statement ----------

test("architecture summary states findings are not lifecycle status and publication does not update lifecycle/adjudication/CoherencyDelta/WorkOrder/VerificationPlan/source files", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const content = String((await loadLatestPublication(work, "architecture-summary")).content ?? "");
    assert.match(
      content,
      /Bridge-derived findings are governed FindingReport entries, not lifecycle status; this publication does not update lifecycle status, adjudication, CoherencyDelta, WorkOrders, VerificationPlans, or source files\./,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 9: architecture summary cites FindingReport in inputRefs ----------

test("architecture summary cites FindingReport in header.inputRefs when present", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const publication = await loadLatestPublication(work, "architecture-summary");
    const inputRefs = publication.header.inputRefs ?? [];
    const cite = inputRefs.find((ref) => ref.type === "FindingReport");
    assert.ok(cite, "architecture summary must cite FindingReport in header.inputRefs");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 10: agent contract renders the section ----------

test("agent contract renders Bridge-Derived Findings section", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const content = String((await loadLatestPublication(work, "agent-contract")).content ?? "");
    assert.match(content, /^### Bridge-Derived Findings/m);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 11: agent contract says governed FindingReport entries ----------

test("agent contract says bridge-derived findings are governed FindingReport entries", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const content = String((await loadLatestPublication(work, "agent-contract")).content ?? "");
    assert.match(content, /Bridge-derived findings are governed FindingReport entries\./);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: agent contract says not lifecycle status ----------

test("agent contract says bridge-derived findings are not lifecycle status", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const content = String((await loadLatestPublication(work, "agent-contract")).content ?? "");
    assert.match(content, /They are not FindingLifecycleReport status\./);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 13: agent contract says no CoherencyDelta remediation ----------

test("agent contract says bridge-derived findings do not imply CoherencyDelta remediation", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const content = String((await loadLatestPublication(work, "agent-contract")).content ?? "");
    assert.match(content, /They do not imply CoherencyDelta remediation\./);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 14: agent contract says no WorkOrders / VerificationPlans ----------

test("agent contract says bridge-derived findings do not create WorkOrders or VerificationPlans", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const content = String((await loadLatestPublication(work, "agent-contract")).content ?? "");
    assert.match(content, /They do not create WorkOrders or VerificationPlans\./);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: agent contract Do Not Do reminder ----------

test("agent contract Do Not Do reminder covers lifecycle status, adjudication, CoherencyDelta remediation, WorkOrder creation, VerificationPlan creation, resolver routing, verification planning, RefactorPreservationContract, and source-write permission", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const content = String((await loadLatestPublication(work, "agent-contract")).content ?? "");
    assert.match(
      content,
      /Do not treat bridge-derived FindingReport entries as lifecycle status, adjudication, CoherencyDelta remediation, WorkOrder creation, VerificationPlan creation, resolver routing, verification planning, RefactorPreservationContract, or source-write permission\./,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16-21: publication generation mutates / creates nothing ----------

test("publication generation does not mutate FindingReport", async () => {
  await assertTypeUnchangedByPublish("FindingReport");
});

test("publication generation does not mutate FindingLifecycleReport", async () => {
  await assertTypeUnchangedByPublish("FindingLifecycleReport");
});

test("publication generation does not mutate IssueAdjudicationReport", async () => {
  await assertTypeUnchangedByPublish("IssueAdjudicationReport");
});

test("publication generation does not mutate CoherencyDelta", async () => {
  await assertTypeUnchangedByPublish("CoherencyDelta");
});

test("publication generation does not create WorkOrder", async () => {
  await assertTypeUnchangedByPublish("WorkOrder");
});

test("publication generation does not create VerificationPlan", async () => {
  await assertTypeUnchangedByPublish("VerificationPlan");
});

// ---------- 22: proof-report deferral documented ----------

test("proof report surfacing is absent or explicitly deferred in docs", async () => {
  const candidates = [
    join(repoRoot, "docs/strategy/bridge-derived-findings-publication-decision.md"),
    join(repoRoot, "docs/concepts/proof-report-publication.md"),
    join(repoRoot, "docs/artifacts/proof-report-publication.md"),
  ];
  const normalise = (text) => text.replace(/\s+/g, " ").toLowerCase();
  let found = false;
  for (const path of candidates) {
    let raw;
    try {
      raw = await readFile(path, "utf8");
    } catch {
      continue;
    }
    const text = normalise(raw);
    if (
      /proof[- ]?report[^.]*defer|defer[^.]*proof[- ]?report/.test(text)
      && /bridge-derived findings/.test(text)
    ) {
      found = true;
      break;
    }
  }
  assert.ok(
    found,
    "at least one publication-surfacing doc must explicitly defer proof-report surfacing of bridge-derived findings",
  );
});

// ---------- 23: artifacts validate clean ----------

test("rekon artifacts validate stays clean after bridge-derived findings publication surfacing", async () => {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
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

function bridgeDerivedFinding(overrides = {}) {
  const contractId = overrides.contractId ?? "fixture.create-user";
  const phraseCapabilityId = overrides.phraseCapabilityId ?? "capability-phrase:create-user";
  const lintRowId = overrides.lintRowId ?? `${contractId}:forbidden-layer`;
  return {
    id: overrides.id
      ?? `capability-architecture-policy:forbidden-layer:${contractId}:capability-phrase-create-user`,
    type: "capability_architecture_policy",
    severity: overrides.severity ?? "high",
    title: overrides.title ?? `Capability "${phraseCapabilityId}" placed on a forbidden layer.`,
    description:
      `Capability-architecture policy finding for contract "${contractId}", `
      + "promoted from CapabilityLintFindingBridgeReport.",
    subjects: [contractId],
    evidence: [CAPABILITY_MAP_REF],
    details: {
      source: "capability-lint-bridge",
      sourceBridgeCandidateId: lintRowId,
      sourceLintRowId: lintRowId,
      sourceContractId: contractId,
      sourcePhraseCapabilityId: phraseCapabilityId,
    },
  };
}

function makeBridgeDerivedFindingReport() {
  return createFindingReport({
    header: {
      schemaVersion: "0.1.0",
      artifactType: "FindingReport",
      artifactId: "finding-report-bridge-derived-test-001",
      generatedAt: "2026-05-29T01:00:00.000Z",
      subject: { repoId: "test-repo" },
      producer: { id: "@rekon/capability-model", version: "0.1.0" },
      inputRefs: [BRIDGE_REF],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    },
    findings: [
      bridgeDerivedFinding({ contractId: "fixture.create-user" }),
      bridgeDerivedFinding({
        contractId: "fixture.delete-user",
        phraseCapabilityId: "capability-phrase:delete-user",
        severity: "medium",
        id: "capability-architecture-policy:forbidden-layer:fixture.delete-user:capability-phrase-delete-user",
      }),
    ],
  });
}

// Seed a workspace with an IntelligenceSnapshot (via refresh) plus a
// bridge-derived FindingReport written directly through the local
// artifact store. The fixture's own bridge pipeline may produce zero
// eligible findings, so the positive publication path is tested
// against this deterministically-seeded FindingReport rather than by
// weakening writer eligibility rules.
async function setupWorkspaceWithBridgeDerivedFindings() {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-derived-pub-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
  const store = createLocalArtifactStore(work);
  await store.init();
  await store.write(makeBridgeDerivedFindingReport(), { category: "findings" });
  return work;
}

async function assertTypeUnchangedByPublish(type) {
  const work = await setupWorkspaceWithBridgeDerivedFindings();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8")).filter((e) => e.type === type);
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8")).filter((e) => e.type === type);
    assert.equal(after.length, before.length, `${type} count must be unchanged by publish`);
    for (const entry of after) {
      const previous = before.find((other) => other.id === entry.id);
      assert.ok(previous, `publish must not add new ${type} artifacts`);
      assert.equal(entry.digest, previous.digest, `${type} ${entry.id} digest must be unchanged`);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function loadLatestPublication(work, kind) {
  const indexPath = join(work, ".rekon/registry/artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = index.filter((entry) =>
    entry.type === "Publication" && typeof entry.path === "string"
    && entry.path.includes(`Publication-${kind}-`));
  if (entries.length === 0) {
    throw new Error(`no ${kind} publication found`);
  }
  const latest = entries.sort((a, b) => a.writtenAt.localeCompare(b.writtenAt)).at(-1);
  return JSON.parse(await readFile(join(work, latest.path), "utf8"));
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

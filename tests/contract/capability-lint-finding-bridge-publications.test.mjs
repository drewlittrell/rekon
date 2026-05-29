// Contract tests for the CapabilityLintFindingBridgeReport
// publication surfacing slice (forty-fifth slice on the
// capability-ontology track).
//
// The architecture-summary publisher and agent-contract
// publisher both surface the latest
// CapabilityLintFindingBridgeReport. Both surfaces are
// **strictly read-only**: never run `rekon capability lint
// bridge-findings`, never write FindingReport, never mutate
// FindingFilterReport, FindingLifecycleReport,
// IssueAdjudicationReport, or CoherencyDelta, and never create
// WorkOrder or VerificationPlan. proposedFinding stays
// preview-only.
//
// Tests pin assertions 1–23 from the work order.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildCapabilityLintFindingBridgePublicationSection } from "../../packages/capability-docs/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

const LINT_REPORT_REF = {
  type: "CapabilityArchitectureLintReport",
  id: "capability-architecture-lint-test-001",
  path: ".rekon/artifacts/findings/CapabilityArchitectureLintReport-test.json",
  schemaVersion: "0.1.0",
};
const CAPABILITY_CONTRACT_REF = {
  type: "CapabilityContract",
  id: "capability-contract-test-001",
  path: ".rekon/artifacts/actions/CapabilityContract-test.json",
  schemaVersion: "0.1.0",
};
const CAPABILITY_MAP_REF = {
  type: "CapabilityMap",
  id: "capability-map-test-001",
  path: ".rekon/artifacts/projections/CapabilityMap-test.json",
  schemaVersion: "0.1.0",
};
const EVIDENCE_REF = {
  type: "EvidenceGraph",
  id: "evidence-test-001",
  path: ".rekon/artifacts/evidence/EvidenceGraph-test.json",
  schemaVersion: "0.1.0",
};

// ---------- 1: no-report guidance ----------

test("architecture summary block renders no-bridge-report guidance when no report exists", () => {
  const { lines } = buildCapabilityLintFindingBridgePublicationSection({
    report: undefined,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## Capability Lint Finding Bridge/m);
  assert.match(text, /No `CapabilityLintFindingBridgeReport` found\./);
  assert.match(text, /rekon capability lint bridge-findings --json/);
  assert.match(
    text,
    /this publication does not write FindingReport, mutate lifecycle state, mutate CoherencyDelta, create WorkOrders, create VerificationPlans, or write source files/,
  );
});

// ---------- 2: section present when report exists ----------

test("architecture summary block renders the Capability Lint Finding Bridge section when a report exists", () => {
  const report = makeBridgeReport([bridgeCandidate({ decision: "eligible" })]);
  const { lines } = buildCapabilityLintFindingBridgePublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## Capability Lint Finding Bridge/m);
  assert.match(text, /Candidates: 1/);
});

// ---------- 3: summary counts ----------

test("architecture summary block renders summary counts (eligible / ineligible / needsReview)", () => {
  const report = makeBridgeReport(
    [
      bridgeCandidate({ decision: "eligible", id: "c1" }),
      bridgeCandidate({ decision: "ineligible", id: "c2", reason: "not-evaluated" }),
      bridgeCandidate({ decision: "needs-review", id: "c3", reason: "duplicate-candidate" }),
    ],
    {
      summary: {
        totalRows: 3,
        eligible: 1,
        ineligible: 1,
        needsReview: 1,
        byReason: {
          "duplicate-candidate": 1,
          "not-evaluated": 1,
          "violation-with-finding-candidate": 1,
        },
        bySeverity: { high: 2, low: 1 },
      },
    },
  );
  const { lines } = buildCapabilityLintFindingBridgePublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /Candidates: 3 \(eligible 1, ineligible 1, needs-review 1\)/);
  assert.match(text, /By reason:/);
  assert.match(text, /By severity:/);
});

// ---------- 4: bounded candidate table ----------

test("architecture summary block renders a bounded candidate table", () => {
  const candidates = [];
  for (let index = 0; index < 25; index++) {
    candidates.push(
      bridgeCandidate({
        id: `c-${index}`,
        decision: "ineligible",
        reason: "not-evaluated",
        contractId: `fixture.entity-${index}`,
      }),
    );
  }
  const report = makeBridgeReport(candidates, {
    summary: {
      totalRows: 25,
      eligible: 0,
      ineligible: 25,
      needsReview: 0,
      byReason: { "not-evaluated": 25 },
      bySeverity: { low: 25 },
    },
  });
  const { lines } = buildCapabilityLintFindingBridgePublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(
    text,
    /\| Decision \| Reason \| Contract \| Capability \| Severity \| Confidence \| Proposed Finding \|/,
  );
  assert.match(text, /5 additional bridge candidate\(s\) omitted/);
});

// ---------- 5: boundary statement ----------

test("architecture summary block states publication does not write FindingReport / mutate lifecycle / mutate CoherencyDelta / create WorkOrders / create VerificationPlans / write source files", () => {
  const report = makeBridgeReport([bridgeCandidate({ decision: "eligible" })]);
  const { lines } = buildCapabilityLintFindingBridgePublicationSection({
    report,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(
    text,
    /CapabilityLintFindingBridgeReport is preview visibility only; this publication does not write FindingReport, mutate lifecycle state, mutate CoherencyDelta, create WorkOrders, create VerificationPlans, or write source files\./,
  );
});

// ---------- 6: architecture summary cites bridge report in header.inputRefs ----------

test("architecture summary publication cites CapabilityLintFindingBridgeReport in header.inputRefs when present", async () => {
  const work = await setupWorkspaceWithBridgeReport();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const publication = await loadLatestPublication(work, "architecture-summary");
    const inputRefs = publication.header.inputRefs ?? [];
    const cite = inputRefs.find((ref) => ref.type === "CapabilityLintFindingBridgeReport");
    assert.ok(cite, "architecture summary must cite CapabilityLintFindingBridgeReport in header.inputRefs");
    assert.match(String(cite.id), /^capability-lint-finding-bridge-/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 7: agent contract renders section ----------

test("agent contract publication renders Capability Lint Finding Bridge section", async () => {
  const work = await setupWorkspaceWithBridgeReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /^### Capability Lint Finding Bridge/m);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 8: agent contract says preview, not FindingReport ----------

test("agent contract publication says CapabilityLintFindingBridgeReport is preview, not FindingReport", async () => {
  const work = await setupWorkspaceWithBridgeReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /CapabilityLintFindingBridgeReport is preview, not FindingReport/i);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 9: agent contract explains eligible candidates ----------

test("agent contract publication explains eligible candidates", async () => {
  const work = await setupWorkspaceWithBridgeReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /`?eligible`? candidates are proposed governed-finding candidates only/i);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 10: agent contract explains ineligible candidates ----------

test("agent contract publication explains ineligible candidates", async () => {
  const work = await setupWorkspaceWithBridgeReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /`?ineligible`? candidates are not bridge-ready/i);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 11: agent contract explains needs-review candidates ----------

test("agent contract publication explains needs-review candidates", async () => {
  const work = await setupWorkspaceWithBridgeReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /`?needs-review`? candidates require operator review/i);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: agent contract says proposedFinding is preview-only ----------

test("agent contract publication says proposedFinding is preview-only", async () => {
  const work = await setupWorkspaceWithBridgeReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /`?proposedFinding`? is preview-only/i);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 13: agent contract boundary statement ----------

test("agent contract publication says surfacing does not write findings / mutate lifecycle / mutate CoherencyDelta / create WorkOrders / create VerificationPlans / write source files", async () => {
  const work = await setupWorkspaceWithBridgeReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /this publication does not write FindingReport, mutate lifecycle state, mutate CoherencyDelta, create WorkOrders, create VerificationPlans, or write source files/i,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 14: agent contract Do Not Do reminder ----------

test("agent contract Do Not Do reminder covers FindingReport writing, lifecycle mutation, CoherencyDelta remediation, WorkOrder creation, VerificationPlan generation, resolver routing, verification planning, RefactorPreservationContract, and source-write permission", async () => {
  const work = await setupWorkspaceWithBridgeReport();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /Do not treat CapabilityLintFindingBridgeReport publication surfacing as FindingReport writing, lifecycle mutation, CoherencyDelta remediation, WorkOrder creation, VerificationPlan generation, resolver routing, verification planning, RefactorPreservationContract, or source-write permission\./,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: publication does not create or mutate CapabilityLintFindingBridgeReport ----------

test("publication generation does not create or mutate CapabilityLintFindingBridgeReport", async () => {
  await assertTypeUnchangedByPublish("CapabilityLintFindingBridgeReport");
});

// ---------- 16: publication does not mutate CapabilityArchitectureLintReport ----------

test("publication generation does not mutate CapabilityArchitectureLintReport", async () => {
  await assertTypeUnchangedByPublish("CapabilityArchitectureLintReport");
});

// ---------- 17: publication does not mutate FindingReport ----------

test("publication generation does not mutate FindingReport", async () => {
  await assertTypeUnchangedByPublish("FindingReport");
});

// ---------- 18: publication does not mutate FindingLifecycleReport ----------

test("publication generation does not mutate FindingLifecycleReport", async () => {
  await assertTypeUnchangedByPublish("FindingLifecycleReport");
});

// ---------- 19: publication does not mutate CoherencyDelta ----------

test("publication generation does not mutate CoherencyDelta", async () => {
  await assertTypeUnchangedByPublish("CoherencyDelta");
});

// ---------- 20: publication does not create WorkOrder ----------

test("publication generation does not create WorkOrder", async () => {
  await assertTypeUnchangedByPublish("WorkOrder");
});

// ---------- 21: publication does not create VerificationPlan ----------

test("publication generation does not create VerificationPlan", async () => {
  await assertTypeUnchangedByPublish("VerificationPlan");
});

// ---------- 22: proof-report deferral documented ----------

test("proof report surfacing is absent or explicitly deferred in docs", async () => {
  const candidates = [
    join(repoRoot, "docs/concepts/capability-lint-finding-bridge.md"),
    join(repoRoot, "docs/artifacts/capability-lint-finding-bridge-report.md"),
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
      && /capabilitylintfindingbridgereport/.test(text)
    ) {
      found = true;
      break;
    }
  }
  assert.ok(
    found,
    "at least one publication-surfacing doc must explicitly defer proof-report surfacing of CapabilityLintFindingBridgeReport",
  );
});

// ---------- 23: artifacts validate clean ----------

test("rekon artifacts validate stays clean after bridge publication surfacing", async () => {
  const work = await setupWorkspaceWithBridgeReport();
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

function bridgeCandidate(overrides = {}) {
  const decision = overrides.decision ?? "ineligible";
  const contractId = overrides.contractId ?? "fixture.create-user";
  const candidate = {
    id: overrides.id ?? `${contractId}:forbidden-layer`,
    lintRowId: overrides.lintRowId ?? `${contractId}:forbidden-layer`,
    contractId,
    phraseCapabilityId: overrides.phraseCapabilityId ?? "capability-phrase:phrase-001",
    decision,
    reason: overrides.reason
      ?? (decision === "eligible" ? "violation-with-finding-candidate" : "not-evaluated"),
    severity: overrides.severity ?? (decision === "eligible" ? "high" : "low"),
    confidence: overrides.confidence ?? (decision === "eligible" ? "high" : "low"),
  };
  if (decision === "eligible" || decision === "needs-review") {
    candidate.proposedFinding = {
      id: `capability-architecture-policy:forbidden-layer:${contractId}:capability-phrase-phrase-001`,
      title: "Capability placed on a forbidden layer.",
      category: "capability_architecture_policy",
      severity: "high",
      evidenceRefs: [CAPABILITY_MAP_REF],
      sourceLintRowRef: { report: LINT_REPORT_REF, rowId: candidate.lintRowId },
    };
  }
  return candidate;
}

function makeBridgeReport(candidates, overrides = {}) {
  const summary = overrides.summary ?? {
    totalRows: candidates.length,
    eligible: candidates.filter((c) => c.decision === "eligible").length,
    ineligible: candidates.filter((c) => c.decision === "ineligible").length,
    needsReview: candidates.filter((c) => c.decision === "needs-review").length,
    byReason: {},
    bySeverity: {},
  };
  return {
    header: {
      artifactType: "CapabilityLintFindingBridgeReport",
      artifactId: "capability-lint-finding-bridge-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-28T00:00:00Z",
      subject: { repoId: "/tmp/test" },
      producer: { id: "@rekon/capability-model", version: "0.1.0" },
      inputRefs: [LINT_REPORT_REF],
      freshness: { status: "fresh" },
    },
    source: {
      lintReportRef: LINT_REPORT_REF,
      capabilityContractRef: CAPABILITY_CONTRACT_REF,
      capabilityMapRef: CAPABILITY_MAP_REF,
    },
    summary,
    candidates,
  };
}

async function assertTypeUnchangedByPublish(type) {
  const work = await setupWorkspaceWithBridgeReport();
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

async function setupWorkspaceWithBridgeReport() {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-pub-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
  runCli(work, ["capability", "ontology", "normalize", "--json"]);
  const reportRef = runCli(work, [
    "artifacts",
    "latest",
    "--type",
    "CapabilityNormalizationReport",
    "--id-only",
  ]).stdout.trim();
  runCli(work, [
    "capability",
    "phrase",
    "project",
    "--report",
    reportRef,
    "--json",
  ]);
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
  await mkdir(join(work, ".rekon"), { recursive: true });
  await writeFile(
    join(work, ".rekon/capability-contracts.json"),
    JSON.stringify(
      {
        version: "0.1.0",
        contracts: [
          {
            id: "fixture.create-user",
            match: { verb: "create", noun: "user" },
            allowedLayers: ["domain"],
            forbiddenLayers: ["route"],
            requiredChecks: ["npm run test"],
            preservationRules: ["Preserve create-user behavior."],
          },
        ],
      },
      null,
      2,
    ),
  );
  runCli(work, ["capability", "contract", "generate", "--json"]);
  runCli(work, ["capability", "lint", "architecture", "--json"]);
  runCli(work, ["capability", "lint", "bridge-findings", "--json"]);
  return work;
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

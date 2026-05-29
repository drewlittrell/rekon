// Contract tests for the CapabilityLintFindingBridgeReport ->
// FindingReport writer **dry-run** helper / CLI (forty-eighth
// slice on the capability-ontology track).
//
// The helper `buildFindingReportWritePreview` and the
// `rekon capability lint write-findings --dry-run` CLI command
// preview the FindingReport body a FUTURE writer would emit. They
// are dry-run only:
//   - never write FindingReport,
//   - never mutate FindingReport / FindingFilterReport /
//     FindingLifecycleReport / IssueAdjudicationReport /
//     CoherencyDelta,
//   - never create WorkOrder / VerificationPlan,
//   - never mutate the artifact index,
//   - reject write-ish flags (--confirm-finding-write / --write /
//     --send / --execute).
//
// Tests pin assertions 1–27 from the work order.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { createCapabilityArchitectureLintReport } from "../../packages/kernel-repo-model/dist/index.js";
import {
  buildCapabilityLintFindingBridgeReport,
  buildFindingReportWritePreview,
} from "../../packages/capability-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const fixtureRoot = join(repoRoot, "tests/fixtures/js-ts-ast-evidence");

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
const BRIDGE_REPORT_REF = {
  type: "CapabilityLintFindingBridgeReport",
  id: "capability-lint-finding-bridge-test-001",
  path: ".rekon/artifacts/actions/CapabilityLintFindingBridgeReport-test.json",
  schemaVersion: "0.1.0",
};

// ---------- in-memory bridge-report construction ----------

// Natural eligible row via the real bridge builder.
function makeRow(overrides = {}) {
  const contractId = overrides.contractId ?? "c.invoice";
  const rule = overrides.rule ?? "forbidden-layer";
  const severity = overrides.severity ?? "high";
  const status = overrides.status ?? "violation";
  const row = {
    id: overrides.id ?? `${contractId}:${rule}`,
    contractId,
    phraseCapabilityId:
      "phraseCapabilityId" in overrides
        ? overrides.phraseCapabilityId
        : "capability-phrase:invoice",
    rule,
    status,
    severity,
    confidence: overrides.confidence ?? "high",
    message: overrides.message ?? "Capability placed on a forbidden layer.",
    evidenceRefs:
      "evidenceRefs" in overrides ? overrides.evidenceRefs : [EVIDENCE_REF],
  };
  if (status === "violation") {
    row.findingCandidate = {
      title: "Capability placed on a forbidden layer.",
      category: "capability_architecture_policy",
      severity,
    };
  }
  return row;
}

function buildBridge(rows) {
  const lintReport = createCapabilityArchitectureLintReport({
    header: {
      artifactType: "CapabilityArchitectureLintReport",
      artifactId: "capability-architecture-lint-test-001",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-28T00:00:00.000Z",
      subject: { repoId: "test-repo" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [CAPABILITY_CONTRACT_REF, CAPABILITY_MAP_REF],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    },
    source: {
      capabilityContractRef: CAPABILITY_CONTRACT_REF,
      capabilityMapRef: CAPABILITY_MAP_REF,
    },
    summary: {
      total: 0,
      violations: 0,
      passes: 0,
      notEvaluated: 0,
      byRule: {},
      bySeverity: {},
    },
    rows,
  });
  return buildCapabilityLintFindingBridgeReport({
    lintReport,
    lintReportRef: LINT_REPORT_REF,
    generatedAt: "2026-05-28T01:00:00.000Z",
  });
}

// Hand-crafted candidate / bridge report for exercising the
// helper's defensive skip branches (cases the natural builder
// never produces, e.g. an "eligible" candidate missing its
// proposedFinding).
function makeProposed(overrides = {}) {
  const proposed = {
    id:
      overrides.id
      ?? "capability-architecture-policy:forbidden-layer:c-invoice:capability-phrase-invoice",
    title: overrides.title ?? "Capability placed on a forbidden layer.",
    category: overrides.category ?? "capability_architecture_policy",
    severity: overrides.severity ?? "high",
    evidenceRefs:
      "evidenceRefs" in overrides ? overrides.evidenceRefs : [EVIDENCE_REF],
  };
  if (!("sourceLintRowRef" in overrides)) {
    proposed.sourceLintRowRef = { report: LINT_REPORT_REF, rowId: "c.invoice:forbidden-layer" };
  } else if (overrides.sourceLintRowRef !== undefined) {
    proposed.sourceLintRowRef = overrides.sourceLintRowRef;
  }
  return proposed;
}

function makeCandidate(overrides = {}) {
  const id = overrides.id ?? "c.invoice:forbidden-layer";
  const candidate = {
    id,
    lintRowId: overrides.lintRowId ?? id,
    contractId: overrides.contractId ?? "c.invoice",
    phraseCapabilityId: overrides.phraseCapabilityId ?? "capability-phrase:invoice",
    decision: overrides.decision ?? "eligible",
    reason: overrides.reason ?? "violation-with-finding-candidate",
    severity: overrides.severity ?? "high",
    confidence: overrides.confidence ?? "high",
  };
  if ("proposedFinding" in overrides) {
    if (overrides.proposedFinding !== undefined) {
      candidate.proposedFinding = overrides.proposedFinding;
    }
  } else {
    candidate.proposedFinding = makeProposed(overrides.proposedOverrides);
  }
  return candidate;
}

function makeBridge(candidates) {
  return {
    header: {
      artifactType: "CapabilityLintFindingBridgeReport",
      artifactId: "capability-lint-finding-bridge-test-001",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-28T01:00:00.000Z",
      subject: { repoId: "test-repo" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [LINT_REPORT_REF],
    },
    source: {
      lintReportRef: LINT_REPORT_REF,
      capabilityContractRef: CAPABILITY_CONTRACT_REF,
      capabilityMapRef: CAPABILITY_MAP_REF,
    },
    summary: {
      totalRows: candidates.length,
      eligible: 0,
      ineligible: 0,
      needsReview: 0,
      byReason: {},
      bySeverity: {},
    },
    candidates,
  };
}

function preview(bridgeReport) {
  return buildFindingReportWritePreview({
    bridgeReport,
    bridgeReportRef: BRIDGE_REPORT_REF,
  });
}

function skipReasonFor(result, candidateId) {
  return result.skippedCandidates.find((s) => s.candidateId === candidateId)?.reason;
}

// ---------- 1: dryRun true / wouldWrite false ----------

test("helper returns dryRun true / wouldWrite false", () => {
  const result = preview(buildBridge([makeRow()]));
  assert.equal(result.dryRun, true);
  assert.equal(result.wouldWrite, false);
  assert.equal(result.proposedFindingReport.artifactType, "FindingReport");
  assert.equal(result.proposedFindingReport.source, "capability-lint-bridge");
});

// ---------- 2: eligible candidate becomes proposed finding ----------

test("eligible bridge candidate becomes a proposed finding", () => {
  const result = preview(buildBridge([makeRow()]));
  assert.equal(result.summary.proposedFindings, 1);
  assert.equal(result.proposedFindingReport.findings.length, 1);
  assert.equal(result.summary.skipped, 0);
});

// ---------- 3: ineligible candidate is skipped ----------

test("ineligible candidate is skipped", () => {
  const result = preview(makeBridge([
    makeCandidate({ decision: "ineligible", reason: "not-a-violation", proposedFinding: undefined }),
  ]));
  assert.equal(result.proposedFindingReport.findings.length, 0);
  assert.equal(result.summary.skipped, 1);
  assert.equal(skipReasonFor(result, "c.invoice:forbidden-layer"), "candidate-ineligible");
});

// ---------- 4: needs-review candidate is skipped ----------

test("needs-review candidate is skipped", () => {
  const result = preview(makeBridge([
    makeCandidate({ decision: "needs-review", reason: "duplicate-candidate" }),
  ]));
  assert.equal(result.proposedFindingReport.findings.length, 0);
  assert.equal(skipReasonFor(result, "c.invoice:forbidden-layer"), "candidate-needs-review");
});

// ---------- 5: eligible candidate missing proposedFinding is skipped ----------

test("eligible candidate missing proposedFinding is skipped", () => {
  const result = preview(makeBridge([
    makeCandidate({ id: "c.x:r", lintRowId: "c.x:r", proposedFinding: undefined }),
  ]));
  assert.equal(result.proposedFindingReport.findings.length, 0);
  assert.equal(skipReasonFor(result, "c.x:r"), "missing-proposed-finding");
});

// ---------- 6: eligible candidate missing evidenceRefs is skipped ----------

test("eligible candidate missing evidenceRefs is skipped", () => {
  const result = preview(makeBridge([
    makeCandidate({ id: "c.x:r", lintRowId: "c.x:r", proposedOverrides: { evidenceRefs: [] } }),
  ]));
  assert.equal(result.proposedFindingReport.findings.length, 0);
  assert.equal(skipReasonFor(result, "c.x:r"), "missing-evidence-refs");
});

// ---------- 7: eligible candidate missing sourceLintRowRef is skipped ----------

test("eligible candidate missing sourceLintRowRef is skipped", () => {
  const result = preview(makeBridge([
    makeCandidate({ id: "c.x:r", lintRowId: "c.x:r", proposedOverrides: { sourceLintRowRef: undefined } }),
  ]));
  assert.equal(result.proposedFindingReport.findings.length, 0);
  assert.equal(skipReasonFor(result, "c.x:r"), "missing-source-lint-row-ref");
});

// ---------- 8: low severity candidate is skipped ----------

test("low severity candidate is skipped", () => {
  const result = preview(makeBridge([
    makeCandidate({ id: "c.x:r", lintRowId: "c.x:r", severity: "low" }),
  ]));
  assert.equal(result.proposedFindingReport.findings.length, 0);
  assert.equal(skipReasonFor(result, "c.x:r"), "low-severity");
});

// ---------- 9: low confidence candidate is skipped ----------

test("low confidence candidate is skipped", () => {
  const result = preview(makeBridge([
    makeCandidate({ id: "c.x:r", lintRowId: "c.x:r", severity: "high", confidence: "low" }),
  ]));
  assert.equal(result.proposedFindingReport.findings.length, 0);
  assert.equal(skipReasonFor(result, "c.x:r"), "low-confidence");
});

// ---------- 10: duplicate finding id skips later duplicate ----------

test("duplicate finding id keeps first, skips later duplicate", () => {
  const result = preview(makeBridge([
    makeCandidate({ id: "row-a", lintRowId: "row-a" }),
    makeCandidate({ id: "row-b", lintRowId: "row-b" }),
  ]));
  // Both share the default proposedFinding.id.
  assert.equal(result.proposedFindingReport.findings.length, 1);
  assert.equal(result.summary.duplicateIds, 1);
  assert.equal(skipReasonFor(result, "row-b"), "duplicate-finding-id");
  // The first candidate (row-a) is the one kept.
  assert.equal(result.proposedFindingReport.findings[0].sourceBridgeCandidateId, "row-a");
});

// ---------- 11: proposed findings preserve bridge proposedFinding id ----------

test("proposed findings preserve the bridge proposedFinding id", () => {
  const bridge = buildBridge([makeRow()]);
  const eligible = bridge.candidates.find((c) => c.decision === "eligible");
  const result = preview(bridge);
  assert.equal(result.proposedFindingReport.findings[0].id, eligible.proposedFinding.id);
  assert.match(
    result.proposedFindingReport.findings[0].id,
    /^capability-architecture-policy:/,
  );
});

// ---------- 12: inputRefs include the bridge report ref ----------

test("proposed FindingReport inputRefs include the bridge report ref", () => {
  const result = preview(buildBridge([makeRow()]));
  const refs = result.proposedFindingReport.inputRefs;
  assert.ok(
    refs.some((r) => r.type === "CapabilityLintFindingBridgeReport" && r.id === BRIDGE_REPORT_REF.id),
    "bridge report ref is cited in proposedFindingReport.inputRefs",
  );
  assert.equal(result.source.bridgeReportRef.id, BRIDGE_REPORT_REF.id);
});

// ---------- 13: inputRefs include lint / contract / map when source provides them ----------

test("proposed FindingReport inputRefs include lint / contract / map refs when present", () => {
  const result = preview(buildBridge([makeRow()]));
  const types = result.proposedFindingReport.inputRefs.map((r) => r.type);
  assert.ok(types.includes("CapabilityArchitectureLintReport"));
  assert.ok(types.includes("CapabilityContract"));
  assert.ok(types.includes("CapabilityMap"));
  assert.equal(result.source.lintReportRef.id, LINT_REPORT_REF.id);
  assert.equal(result.source.capabilityContractRef.id, CAPABILITY_CONTRACT_REF.id);
  assert.equal(result.source.capabilityMapRef.id, CAPABILITY_MAP_REF.id);
});

// ---------- 14: proposed finding includes source trace fields ----------

test("proposed finding includes sourceBridgeCandidateId / sourceLintRowId / sourceContractId / sourcePhraseCapabilityId", () => {
  const bridge = buildBridge([makeRow()]);
  const eligible = bridge.candidates.find((c) => c.decision === "eligible");
  const finding = preview(bridge).proposedFindingReport.findings[0];
  assert.equal(finding.sourceBridgeCandidateId, eligible.id);
  assert.equal(finding.sourceLintRowId, eligible.lintRowId);
  assert.equal(finding.sourceContractId, eligible.contractId);
  assert.equal(finding.sourcePhraseCapabilityId, eligible.phraseCapabilityId);
  assert.equal(finding.category, "capability_architecture_policy");
});

// ---------- CLI helpers ----------

function runCli(args, work) {
  return spawnSync("node", [cliPath, ...args, "--root", work], { encoding: "utf8" });
}

// refresh -> contract generate -> lint architecture ->
// bridge-findings; returns the bridge report ref ("type:id").
function setupBridgeWorkspace(work) {
  for (const args of [
    ["refresh", "--json"],
    ["capability", "contract", "generate", "--json"],
    ["capability", "lint", "architecture", "--json"],
    ["capability", "lint", "bridge-findings", "--json"],
  ]) {
    const out = runCli(args, work);
    assert.equal(out.status, 0, `${args.join(" ")}: ${out.stderr || out.stdout}`);
  }
  const latest = spawnSync(
    "node",
    [cliPath, "artifacts", "latest", "--root", work, "--type", "CapabilityLintFindingBridgeReport", "--id-only"],
    { encoding: "utf8" },
  );
  assert.equal(latest.status, 0, latest.stderr || latest.stdout);
  return latest.stdout.trim();
}

async function snapshotGroup(work, dir, prefix) {
  const targetDir = join(work, ".rekon", "artifacts", dir);
  const files = (await readdir(targetDir).catch(() => []))
    .filter((name) => name.startsWith(prefix))
    .sort();
  const map = {};
  for (const file of files) {
    map[file] = await readFile(join(targetDir, file), "utf8");
  }
  return map;
}

// ---------- 15, 16, 17: CLI flag handling + JSON shape ----------

test("CLI requires --dry-run and rejects write-ish flags; JSON reports dryRun/wouldWrite", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-writer-flags-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const bridgeRef = setupBridgeWorkspace(work);

    // 15: --dry-run required.
    const missing = runCli(
      ["capability", "lint", "write-findings", "--bridge-report", bridgeRef],
      work,
    );
    assert.equal(missing.status, 1, "missing --dry-run must exit 1");
    assert.match(missing.stderr + missing.stdout, /--dry-run/);

    // 16: ambiguous write-ish aliases rejected (write mode uses
    // --confirm-finding-write only, shipped in the fifty-first
    // slice; the generic aliases stay rejected).
    for (const flag of ["--write", "--send", "--execute"]) {
      const rejected = runCli(
        ["capability", "lint", "write-findings", "--bridge-report", bridgeRef, flag],
        work,
      );
      assert.equal(rejected.status, 1, `${flag} must exit 1`);
      assert.match(rejected.stderr + rejected.stdout, /not accepted/i);
    }

    // 17: JSON reports dryRun true / wouldWrite false.
    const ok = runCli(
      ["capability", "lint", "write-findings", "--bridge-report", bridgeRef, "--dry-run", "--json"],
      work,
    );
    assert.equal(ok.status, 0, ok.stderr || ok.stdout);
    const payload = JSON.parse(ok.stdout);
    assert.equal(payload.dryRun, true);
    assert.equal(payload.wouldWrite, false);
    assert.equal(payload.proposedFindingReport.artifactType, "FindingReport");
    assert.equal(payload.proposedFindingReport.source, "capability-lint-bridge");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18-27: CLI writes/mutates nothing; validate clean ----------

test("CLI dry-run writes nothing, mutates no governance artifact or index, and validate stays clean", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-writer-purity-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const bridgeRef = setupBridgeWorkspace(work);

    const groups = [
      ["findings", "FindingReport-"], // 18 + 19
      ["findings", "FindingFilterReport-"], // 20
      ["findings", "FindingLifecycleReport-"], // 21
      ["findings", "IssueAdjudicationReport-"], // 22
      ["findings", "CoherencyDelta-"], // 23
      ["actions", "WorkOrder-"], // 24
      ["actions", "VerificationPlan-"], // 25
    ];
    const before = {};
    for (const [dir, prefix] of groups) {
      before[`${dir}/${prefix}`] = await snapshotGroup(work, dir, prefix);
    }
    const indexPath = join(work, ".rekon", "registry", "artifacts.index.json");
    const indexBefore = await readFile(indexPath, "utf8").catch(() => "");

    const run = runCli(
      ["capability", "lint", "write-findings", "--bridge-report", bridgeRef, "--dry-run", "--json"],
      work,
    );
    assert.equal(run.status, 0, run.stderr || run.stdout);

    const after = {};
    for (const [dir, prefix] of groups) {
      after[`${dir}/${prefix}`] = await snapshotGroup(work, dir, prefix);
    }

    // 18 + 19: FindingReport neither created nor mutated.
    assert.deepEqual(after["findings/FindingReport-"], before["findings/FindingReport-"]);
    // 20: FindingFilterReport unchanged.
    assert.deepEqual(after["findings/FindingFilterReport-"], before["findings/FindingFilterReport-"]);
    // 21: FindingLifecycleReport unchanged.
    assert.deepEqual(after["findings/FindingLifecycleReport-"], before["findings/FindingLifecycleReport-"]);
    // 22: IssueAdjudicationReport unchanged.
    assert.deepEqual(after["findings/IssueAdjudicationReport-"], before["findings/IssueAdjudicationReport-"]);
    // 23: CoherencyDelta unchanged.
    assert.deepEqual(after["findings/CoherencyDelta-"], before["findings/CoherencyDelta-"]);
    // 24: no WorkOrder created.
    assert.deepEqual(after["actions/WorkOrder-"], before["actions/WorkOrder-"]);
    assert.equal(Object.keys(after["actions/WorkOrder-"]).length, 0, "no WorkOrder artifact exists");
    // 25: no VerificationPlan created.
    assert.deepEqual(after["actions/VerificationPlan-"], before["actions/VerificationPlan-"]);
    assert.equal(Object.keys(after["actions/VerificationPlan-"]).length, 0, "no VerificationPlan artifact exists");
    // 26: artifact index unchanged.
    const indexAfter = await readFile(indexPath, "utf8").catch(() => "");
    assert.equal(indexAfter, indexBefore, "artifact index must not be mutated by the dry-run");

    // 27: artifacts validate remains clean.
    const validate = runCli(["artifacts", "validate", "--json"], work);
    assert.equal(validate.status, 0, validate.stderr || validate.stdout);
    const validatePayload = JSON.parse(validate.stdout);
    assert.equal(validatePayload.valid ?? validatePayload.ok, true, validate.stdout);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

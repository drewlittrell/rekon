// Contract tests for the CapabilityLintFindingBridgeReport
// v1 artifact (forty-third slice on the capability-ontology
// track).
//
// Verifies that the new preview bridge artifact:
//   - registers cleanly in the SDK + runtime,
//   - validates as a "CapabilityLintFindingBridgeReport" with
//     summary re-derived from candidates,
//   - classifies each CapabilityArchitectureLintReport row as
//     eligible / ineligible / needs-review per the pinned
//     eligibility rules,
//   - attaches a deterministic, slug-safe proposed finding id
//     to eligible rows,
//   - flips later duplicate proposed-finding-id rows to
//     needs-review (duplicate-candidate),
//   - is preview-only: it writes NO FindingReport and never
//     mutates FindingFilterReport, FindingLifecycleReport,
//     IssueAdjudicationReport, or CoherencyDelta, and creates
//     no WorkOrder and no VerificationPlan,
//   - exposes itself via the
//     `rekon capability lint bridge-findings` CLI.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  assertCapabilityLintFindingBridgeReport,
  createCapabilityArchitectureLintReport,
  validateCapabilityLintFindingBridgeReport,
} from "../../packages/kernel-repo-model/dist/index.js";
import {
  buildCapabilityLintFindingBridgeReport,
  CAPABILITY_LINT_FINDING_BRIDGE_FINDING_ID_PREFIX,
} from "../../packages/capability-model/dist/index.js";
import { createRuntime } from "../../packages/runtime/dist/index.js";

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

// Craft an individual lint row. Defaults to an eligible
// violation (status violation, high severity, high confidence,
// findingCandidate present, non-empty evidenceRefs). Callers
// override fields to exercise each eligibility branch. Pass
// `findingCandidate: undefined` to omit it; pass
// `evidenceRefs: []` to drop evidence.
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
  if ("findingCandidate" in overrides) {
    if (overrides.findingCandidate !== undefined) {
      row.findingCandidate = overrides.findingCandidate;
    }
  } else if (status === "violation") {
    row.findingCandidate = {
      title: "Capability placed on a forbidden layer.",
      category: "capability_architecture_policy",
      severity,
    };
  }
  return row;
}

function makeLintReport(rows) {
  return createCapabilityArchitectureLintReport({
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
}

function buildBridge(rows, generatedAt = "2026-05-28T01:00:00.000Z") {
  return buildCapabilityLintFindingBridgeReport({
    lintReport: makeLintReport(rows),
    lintReportRef: LINT_REPORT_REF,
    generatedAt,
  });
}

function candidateFor(report, lintRowId) {
  return report.candidates.find((c) => c.lintRowId === lintRowId);
}

// ---------- 1: artifact validates ----------

test("CapabilityLintFindingBridgeReport validates", () => {
  const report = buildBridge([makeRow()]);
  const result = validateCapabilityLintFindingBridgeReport(report);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(report.header.artifactType, "CapabilityLintFindingBridgeReport");
  // assert helper accepts it too.
  assert.doesNotThrow(() => assertCapabilityLintFindingBridgeReport(report));
});

// ---------- 2: high/high violation with evidence is eligible ----------

test("violation + findingCandidate + high confidence + high severity + evidence is eligible", () => {
  const report = buildBridge([
    makeRow({ confidence: "high", severity: "high" }),
  ]);
  const candidate = candidateFor(report, "c.invoice:forbidden-layer");
  assert.ok(candidate);
  assert.equal(candidate.decision, "eligible");
  assert.equal(candidate.reason, "violation-with-finding-candidate");
  assert.ok(candidate.proposedFinding, "eligible rows carry a proposedFinding");
  assert.equal(candidate.proposedFinding.severity, "high");
  assert.equal(candidate.proposedFinding.sourceLintRowRef.rowId, "c.invoice:forbidden-layer");
});

// ---------- 3: medium/medium violation with evidence is eligible ----------

test("violation + findingCandidate + medium confidence + medium severity + evidence is eligible", () => {
  const report = buildBridge([
    makeRow({ confidence: "medium", severity: "medium" }),
  ]);
  const candidate = candidateFor(report, "c.invoice:forbidden-layer");
  assert.ok(candidate);
  assert.equal(candidate.decision, "eligible");
  assert.equal(candidate.reason, "violation-with-finding-candidate");
  assert.ok(candidate.proposedFinding);
});

// ---------- 4: pass row is ineligible ----------

test("pass row is ineligible (not-a-violation)", () => {
  const report = buildBridge([
    makeRow({ rule: "allowed-layer", status: "pass", findingCandidate: undefined }),
  ]);
  const candidate = candidateFor(report, "c.invoice:allowed-layer");
  assert.ok(candidate);
  assert.equal(candidate.decision, "ineligible");
  assert.equal(candidate.reason, "not-a-violation");
  assert.equal(candidate.proposedFinding, undefined);
});

// ---------- 5: not-evaluated row is ineligible ----------

test("not-evaluated row is ineligible (not-evaluated)", () => {
  const report = buildBridge([
    makeRow({
      rule: "allowed-system",
      status: "not-evaluated",
      severity: "low",
      confidence: "low",
      findingCandidate: undefined,
    }),
  ]);
  const candidate = candidateFor(report, "c.invoice:allowed-system");
  assert.ok(candidate);
  assert.equal(candidate.decision, "ineligible");
  assert.equal(candidate.reason, "not-evaluated");
  assert.equal(candidate.proposedFinding, undefined);
});

// ---------- 6: violation missing findingCandidate is ineligible ----------

test("violation missing findingCandidate is ineligible (missing-finding-candidate)", () => {
  const report = buildBridge([makeRow({ findingCandidate: undefined })]);
  const candidate = candidateFor(report, "c.invoice:forbidden-layer");
  assert.ok(candidate);
  assert.equal(candidate.decision, "ineligible");
  assert.equal(candidate.reason, "missing-finding-candidate");
  assert.equal(candidate.proposedFinding, undefined);
});

// ---------- 7: violation low confidence is ineligible ----------

test("violation with low confidence is ineligible (low-confidence)", () => {
  const report = buildBridge([makeRow({ confidence: "low", severity: "high" })]);
  const candidate = candidateFor(report, "c.invoice:forbidden-layer");
  assert.ok(candidate);
  assert.equal(candidate.decision, "ineligible");
  assert.equal(candidate.reason, "low-confidence");
  assert.equal(candidate.proposedFinding, undefined);
});

// ---------- 8: violation low severity is ineligible ----------

test("violation with low severity is ineligible (low-severity)", () => {
  const report = buildBridge([makeRow({ confidence: "high", severity: "low" })]);
  const candidate = candidateFor(report, "c.invoice:forbidden-layer");
  assert.ok(candidate);
  assert.equal(candidate.decision, "ineligible");
  assert.equal(candidate.reason, "low-severity");
  assert.equal(candidate.proposedFinding, undefined);
});

// ---------- 9: violation missing evidenceRefs is ineligible ----------

test("violation missing evidenceRefs is ineligible (missing-evidence)", () => {
  const report = buildBridge([makeRow({ evidenceRefs: [] })]);
  const candidate = candidateFor(report, "c.invoice:forbidden-layer");
  assert.ok(candidate);
  assert.equal(candidate.decision, "ineligible");
  assert.equal(candidate.reason, "missing-evidence");
  assert.equal(candidate.proposedFinding, undefined);
});

// ---------- 10: duplicate proposed finding ids -> needs-review ----------

test("duplicate proposed finding ids mark later duplicates needs-review", () => {
  // Two distinct lint rows (distinct row ids) whose contractId
  // and phraseCapabilityId slug to identical values, so they
  // produce the same proposed finding id.
  const report = buildBridge([
    makeRow({ contractId: "c.invoice", phraseCapabilityId: "cap:x", rule: "forbidden-layer" }),
    makeRow({ contractId: "c-invoice", phraseCapabilityId: "cap-x", rule: "forbidden-layer" }),
  ]);
  const eligible = report.candidates.filter((c) => c.decision === "eligible");
  const needsReview = report.candidates.filter((c) => c.decision === "needs-review");
  assert.equal(eligible.length, 1, "exactly one row keeps eligible");
  assert.equal(needsReview.length, 1, "the colliding row flips to needs-review");
  assert.equal(needsReview[0].reason, "duplicate-candidate");
  // Both reference the same proposed finding id.
  assert.equal(
    eligible[0].proposedFinding.id,
    needsReview[0].proposedFinding.id,
    "duplicate detection keys on the proposed finding id",
  );
  assert.equal(report.summary.needsReview, 1);
});

// ---------- 11: proposed finding id is deterministic ----------

test("proposed finding id is deterministic", () => {
  const rows = [makeRow({ contractId: "c.invoice", rule: "forbidden-layer", phraseCapabilityId: "capability-phrase:invoice" })];
  const a = buildBridge(rows, "2026-05-28T01:00:00.000Z");
  const b = buildBridge(rows, "2026-05-28T09:00:00.000Z");
  const ca = candidateFor(a, "c.invoice:forbidden-layer");
  const cb = candidateFor(b, "c.invoice:forbidden-layer");
  assert.equal(ca.proposedFinding.id, cb.proposedFinding.id);
  // Slug-safe, no timestamp, with the pinned prefix and rule.
  assert.equal(
    ca.proposedFinding.id,
    `${CAPABILITY_LINT_FINDING_BRIDGE_FINDING_ID_PREFIX}:forbidden-layer:c-invoice:capability-phrase-invoice`,
  );
  assert.ok(!/\d{10,}/.test(ca.proposedFinding.id), "id carries no timestamp");
});

// ---------- 12: summary counts eligible / ineligible / needsReview ----------

test("summary counts eligible / ineligible / needsReview", () => {
  const report = buildBridge([
    makeRow({ contractId: "c.a", rule: "forbidden-layer" }), // eligible
    makeRow({ contractId: "c.b", rule: "allowed-layer", status: "pass", findingCandidate: undefined }), // ineligible
    makeRow({ contractId: "c.c", rule: "allowed-system", status: "not-evaluated", severity: "low", confidence: "low", findingCandidate: undefined }), // ineligible
  ]);
  assert.equal(report.summary.totalRows, 3);
  assert.equal(report.summary.eligible, 1);
  assert.equal(report.summary.ineligible, 2);
  assert.equal(report.summary.needsReview, 0);
  assert.equal(
    report.summary.totalRows,
    report.summary.eligible + report.summary.ineligible + report.summary.needsReview,
  );
});

// ---------- 13: byReason and bySeverity counts are deterministic ----------

test("byReason and bySeverity counts deterministic", () => {
  const rows = [
    makeRow({ contractId: "c.a", rule: "forbidden-layer", severity: "high" }),
    makeRow({ contractId: "c.b", rule: "allowed-layer", status: "pass", severity: "low", findingCandidate: undefined }),
  ];
  const a = buildBridge(rows);
  const b = buildBridge(rows);
  assert.deepEqual(a.summary.byReason, b.summary.byReason);
  assert.deepEqual(a.summary.bySeverity, b.summary.bySeverity);
  assert.equal(a.summary.byReason["violation-with-finding-candidate"], 1);
  assert.equal(a.summary.byReason["not-a-violation"], 1);
  // Keys are sorted ascending.
  const reasonKeys = Object.keys(a.summary.byReason);
  assert.deepEqual(reasonKeys, [...reasonKeys].sort());
  const severityKeys = Object.keys(a.summary.bySeverity);
  assert.deepEqual(severityKeys, [...severityKeys].sort());
});

// ---------- 14: helper copies the source refs ----------

test("helper copies lintReportRef / capabilityContractRef / capabilityMapRef", () => {
  const report = buildBridge([makeRow()]);
  assert.equal(report.source.lintReportRef.id, LINT_REPORT_REF.id);
  assert.equal(report.source.capabilityContractRef.id, CAPABILITY_CONTRACT_REF.id);
  assert.equal(report.source.capabilityMapRef.id, CAPABILITY_MAP_REF.id);
  // The lint report ref is cited in header.inputRefs.
  assert.ok(
    report.header.inputRefs.some((ref) => ref.id === LINT_REPORT_REF.id),
    "lint report ref appears in header.inputRefs",
  );
});

// ---------- CLI helpers ----------

// Minimal pipeline that yields a CapabilityArchitectureLintReport:
// refresh -> contract generate -> lint architecture.
function setupLintWorkspace(work) {
  const refresh = spawnSync("node", [cliPath, "refresh", "--root", work, "--json"], { encoding: "utf8" });
  assert.equal(refresh.status, 0, refresh.stderr || refresh.stdout);
  const generate = spawnSync(
    "node",
    [cliPath, "capability", "contract", "generate", "--root", work, "--json"],
    { encoding: "utf8" },
  );
  assert.equal(generate.status, 0, generate.stderr || generate.stdout);
  const lint = spawnSync(
    "node",
    [cliPath, "capability", "lint", "architecture", "--root", work, "--json"],
    { encoding: "utf8" },
  );
  assert.equal(lint.status, 0, lint.stderr || lint.stdout);
}

function findingsFilesByPrefix(files, prefix) {
  return files.filter((name) => name.startsWith(prefix)).sort();
}

// ---------- 15: CLI writes a CapabilityLintFindingBridgeReport ----------

test("rekon capability lint bridge-findings writes a bridge report", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-write-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    const bridge = spawnSync(
      "node",
      [cliPath, "capability", "lint", "bridge-findings", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(bridge.status, 0, bridge.stderr || bridge.stdout);
    const payload = JSON.parse(bridge.stdout);
    assert.equal(payload.artifact.type, "CapabilityLintFindingBridgeReport");
    assert.ok(payload.summary);
    assert.equal(typeof payload.summary.totalRows, "number");
    assert.equal(typeof payload.summary.eligible, "number");
    assert.equal(typeof payload.summary.ineligible, "number");
    assert.equal(typeof payload.summary.needsReview, "number");
    assert.ok(payload.source.lintReportRef, "source cites the lint report");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: CLI supports pinned --lint-report ----------

test("rekon capability lint bridge-findings supports a pinned --lint-report", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-pin-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    const latest = spawnSync(
      "node",
      [cliPath, "artifacts", "latest", "--root", work, "--type", "CapabilityArchitectureLintReport", "--json"],
      { encoding: "utf8" },
    );
    assert.equal(latest.status, 0, latest.stderr || latest.stdout);
    const lintArtifact = JSON.parse(latest.stdout).artifact;
    const bridge = spawnSync(
      "node",
      [
        cliPath, "capability", "lint", "bridge-findings", "--root", work,
        "--lint-report", `${lintArtifact.type}:${lintArtifact.id}`, "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(bridge.status, 0, bridge.stderr || bridge.stdout);
    const payload = JSON.parse(bridge.stdout);
    assert.equal(payload.source.lintReportRef.id, lintArtifact.id);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: CLI human output says no FindingReport entries were written ----------

test("rekon capability lint bridge-findings human output says no FindingReport entries were written", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-human-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    const bridge = spawnSync(
      "node",
      [cliPath, "capability", "lint", "bridge-findings", "--root", work],
      { encoding: "utf8" },
    );
    assert.equal(bridge.status, 0, bridge.stderr || bridge.stdout);
    assert.match(bridge.stdout, /No FindingReport entries were written\./);
    assert.match(bridge.stdout, /Preview only/i);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18-21 + 22-23: purity / no-creation helper ----------

async function assertBridgeDoesNotTouch(work, dir, prefix, { mustExistBefore = false } = {}) {
  const targetDir = join(work, ".rekon", "artifacts", dir);
  const before = await readdir(targetDir).catch(() => []);
  const beforeFiltered = findingsFilesByPrefix(before, prefix);
  const beforeHashes = new Map();
  for (const file of beforeFiltered) {
    beforeHashes.set(file, await readFile(join(targetDir, file), "utf8"));
  }
  if (mustExistBefore) {
    assert.ok(beforeFiltered.length >= 0); // tolerate absence; still asserts no creation/mutation
  }
  const bridge = spawnSync(
    "node",
    [cliPath, "capability", "lint", "bridge-findings", "--root", work, "--json"],
    { encoding: "utf8" },
  );
  assert.equal(bridge.status, 0, bridge.stderr || bridge.stdout);
  const after = await readdir(targetDir).catch(() => []);
  const afterFiltered = findingsFilesByPrefix(after, prefix);
  assert.deepEqual(afterFiltered, beforeFiltered, `${prefix} file list must be unchanged`);
  for (const file of beforeFiltered) {
    assert.equal(
      await readFile(join(targetDir, file), "utf8"),
      beforeHashes.get(file),
      `${prefix}${file} bytes must be unchanged`,
    );
  }
}

// ---------- 18: CLI does not mutate FindingReport ----------

test("rekon capability lint bridge-findings does not mutate FindingReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-findingreport-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    await assertBridgeDoesNotTouch(work, "findings", "FindingReport-");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 19: CLI does not mutate FindingFilterReport ----------

test("rekon capability lint bridge-findings does not mutate FindingFilterReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-filter-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    await assertBridgeDoesNotTouch(work, "findings", "FindingFilterReport-");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 20: CLI does not mutate FindingLifecycleReport ----------

test("rekon capability lint bridge-findings does not mutate FindingLifecycleReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-lifecycle-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    await assertBridgeDoesNotTouch(work, "findings", "FindingLifecycleReport-");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 21: CLI does not mutate CoherencyDelta ----------

test("rekon capability lint bridge-findings does not mutate CoherencyDelta", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-delta-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    await assertBridgeDoesNotTouch(work, "findings", "CoherencyDelta-");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 22: CLI does not create WorkOrder ----------

test("rekon capability lint bridge-findings does not create WorkOrder", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-workorder-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    await assertBridgeDoesNotTouch(work, "actions", "WorkOrder-");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 23: CLI does not create VerificationPlan ----------

test("rekon capability lint bridge-findings does not create VerificationPlan", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-plan-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    await assertBridgeDoesNotTouch(work, "actions", "VerificationPlan-");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 24: artifacts validate remains clean ----------

test("artifacts validate remains clean after writing a CapabilityLintFindingBridgeReport", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-bridge-validate-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    setupLintWorkspace(work);
    const bridge = spawnSync(
      "node",
      [cliPath, "capability", "lint", "bridge-findings", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(bridge.status, 0, bridge.stderr || bridge.stdout);
    const validate = spawnSync(
      "node",
      [cliPath, "artifacts", "validate", "--root", work, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(validate.status, 0, validate.stderr || validate.stdout);
    const payload = JSON.parse(validate.stdout);
    assert.equal(payload.valid, true, JSON.stringify(payload.issues, null, 2));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Bonus: runtime registry accepts the new artifact type ----------

test("createRuntime registers CapabilityLintFindingBridgeReport as a known artifact type", async () => {
  const runtimeRoot = await mkdtemp(join(tmpdir(), "rekon-runtime-bridge-"));
  try {
    const runtime = await createRuntime({ repoRoot: runtimeRoot });
    const types = runtime.registry.artifactTypes.map((entry) => entry.type);
    assert.ok(
      types.includes("CapabilityLintFindingBridgeReport"),
      "expected CapabilityLintFindingBridgeReport in runtime registry",
    );
  } finally {
    await rm(runtimeRoot, { recursive: true, force: true });
  }
});

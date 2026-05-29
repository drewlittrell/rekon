// Contract tests for the CapabilityLintFindingBridgeReport ->
// FindingReport writer implementation (fifty-first slice on the
// capability-ontology track).
//
// `rekon capability lint write-findings` now has two modes:
//   --dry-run            : preview only, writes nothing.
//   --confirm-finding-write : writes exactly one new FindingReport
//                             artifact (the proposed body).
//
// Write mode is bounded: it writes a single new FindingReport,
// never mutates an existing FindingReport, FindingFilterReport,
// FindingLifecycleReport, IssueAdjudicationReport, or
// CoherencyDelta, and creates no WorkOrder / VerificationPlan.
//
// Tests pin assertions 1-25 from the work order.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  createCapabilityArchitectureLintReport,
} from "../../packages/kernel-repo-model/dist/index.js";
import {
  buildCapabilityLintFindingBridgeReport,
  buildFindingReportWritePreview,
} from "../../packages/capability-model/dist/index.js";
import {
  createFindingReport,
  validateFindingReport,
} from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

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
  if (status === "violation" && !("findingCandidate" in overrides)) {
    row.findingCandidate = {
      title: "Capability placed on a forbidden layer.",
      category: "capability_architecture_policy",
      severity,
    };
  } else if ("findingCandidate" in overrides && overrides.findingCandidate !== undefined) {
    row.findingCandidate = overrides.findingCandidate;
  }
  return row;
}

function buildBridge(rows) {
  const lintReport = createCapabilityArchitectureLintReport({
    header: {
      artifactType: "CapabilityArchitectureLintReport",
      artifactId: "capability-architecture-lint-test-001",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-29T00:00:00.000Z",
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
    generatedAt: "2026-05-29T01:00:00.000Z",
  });
}

const ELIGIBLE_ROWS = [makeRow()];
const ZERO_ROWS = [
  makeRow({ rule: "allowed-layer", status: "pass", findingCandidate: undefined }),
];

// Seed a CapabilityLintFindingBridgeReport into a fresh store and
// return its "type:id" ref.
async function seedBridge(root, rows) {
  const store = createLocalArtifactStore(root);
  await store.init();
  const bridge = buildBridge(rows);
  const ref = await store.write(bridge, { category: "actions" });
  return `${ref.type}:${ref.id}`;
}

// Seed a pre-existing FindingReport (unrelated to the bridge) so we
// can prove the writer never mutates it in place.
async function seedExistingFindingReport(root) {
  const store = createLocalArtifactStore(root);
  await store.init();
  const report = createFindingReport({
    header: {
      schemaVersion: "0.1.0",
      artifactType: "FindingReport",
      artifactId: "finding-report-preexisting-001",
      generatedAt: "2026-05-29T00:30:00.000Z",
      subject: { repoId: "test-repo" },
      producer: { id: "test-harness", version: "0.1.0" },
      inputRefs: [EVIDENCE_REF],
      freshness: { status: "fresh" },
      provenance: { confidence: 1 },
    },
    findings: [
      {
        id: "preexisting:todo",
        type: "todo_comment",
        severity: "low",
        title: "Pre-existing finding",
        description: "Pre-existing finding that must not be mutated.",
        subjects: ["src/index.ts"],
      },
    ],
  });
  const ref = await store.write(report, { category: "findings" });
  return ref.id;
}

function runCli(args, root) {
  return spawnSync("node", [cliPath, ...args, "--root", root], {
    encoding: "utf8",
  });
}

async function listByPrefix(root, dir, prefix) {
  const target = join(root, ".rekon", "artifacts", dir);
  const files = (await readdir(target).catch(() => []))
    .filter((name) => name.startsWith(prefix))
    .sort();
  return files;
}

async function countByPrefix(root, dir, prefix) {
  return (await listByPrefix(root, dir, prefix)).length;
}

async function readJson(root, dir, file) {
  return JSON.parse(await readFile(join(root, ".rekon", "artifacts", dir, file), "utf8"));
}

async function writeMode(root, bridgeRef) {
  const result = runCli(
    ["capability", "lint", "write-findings", "--bridge-report", bridgeRef, "--confirm-finding-write", "--json"],
    root,
  );
  return result;
}

// ---------- 1: dry-run remains preview-only ----------

test("dry-run remains dryRun true / wouldWrite false and writes nothing", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-writer-dryrun-"));
  try {
    const bridgeRef = await seedBridge(root, ELIGIBLE_ROWS);
    const before = await countByPrefix(root, "findings", "FindingReport-");
    const out = runCli(
      ["capability", "lint", "write-findings", "--bridge-report", bridgeRef, "--dry-run", "--json"],
      root,
    );
    assert.equal(out.status, 0, out.stderr || out.stdout);
    const payload = JSON.parse(out.stdout);
    assert.equal(payload.dryRun, true);
    assert.equal(payload.wouldWrite, false);
    const after = await countByPrefix(root, "findings", "FindingReport-");
    assert.equal(after, before, "dry-run writes no FindingReport");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- 2-9 + 17: write mode writes exactly one new FindingReport, field-preserving ----------

test("write mode writes exactly one new FindingReport with preserved fields and citations", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-writer-write-"));
  try {
    const bridgeRef = await seedBridge(root, ELIGIBLE_ROWS);
    const existingId = await seedExistingFindingReport(root);
    const existingFile = `FindingReport-${existingId}.json`;
    const existingBefore = await readFile(
      join(root, ".rekon", "artifacts", "findings", existingFile),
      "utf8",
    );

    // dry-run preview for cross-check.
    const dry = runCli(
      ["capability", "lint", "write-findings", "--bridge-report", bridgeRef, "--dry-run", "--json"],
      root,
    );
    const preview = JSON.parse(dry.stdout);
    const previewIds = preview.proposedFindingReport.findings.map((f) => f.id).sort();

    const beforeCount = await countByPrefix(root, "findings", "FindingReport-");
    const beforeFiles = new Set(await listByPrefix(root, "findings", "FindingReport-"));

    const out = await writeMode(root, bridgeRef);
    assert.equal(out.status, 0, out.stderr || out.stdout);
    const payload = JSON.parse(out.stdout);

    // 3: output shape.
    assert.equal(payload.dryRun, false);
    assert.equal(payload.wouldWrite, true);
    assert.equal(payload.artifact.type, "FindingReport");
    assert.equal(payload.summary.writtenFindings, previewIds.length);

    // 2 + 17: exactly one new FindingReport added; pre-existing not mutated.
    const afterCount = await countByPrefix(root, "findings", "FindingReport-");
    assert.equal(afterCount, beforeCount + 1, "exactly one new FindingReport");
    const existingAfter = await readFile(
      join(root, ".rekon", "artifacts", "findings", existingFile),
      "utf8",
    );
    assert.equal(existingAfter, existingBefore, "pre-existing FindingReport not mutated in place");

    // Locate the new FindingReport file.
    const afterFiles = await listByPrefix(root, "findings", "FindingReport-");
    const newFile = afterFiles.find((f) => !beforeFiles.has(f));
    assert.ok(newFile, "a new FindingReport file exists");
    const report = await readJson(root, "findings", newFile);

    // 4: writes exactly preview.proposedFindingReport.findings.
    const writtenIds = report.findings.map((f) => f.id).sort();
    assert.deepEqual(writtenIds, previewIds);

    // The bridge's eligible candidate.
    const bridge = buildBridge(ELIGIBLE_ROWS);
    const eligible = bridge.candidates.find((c) => c.decision === "eligible");

    // 5: preserves proposed finding id.
    assert.ok(report.findings.some((f) => f.id === eligible.proposedFinding.id));
    const finding = report.findings.find((f) => f.id === eligible.proposedFinding.id);

    // 6: preserves severity.
    assert.equal(finding.severity, eligible.proposedFinding.severity);

    // 7: preserves evidenceRefs.
    assert.deepEqual(finding.evidence, eligible.proposedFinding.evidenceRefs);

    // 8: cites CapabilityLintFindingBridgeReport.
    assert.ok(
      report.header.inputRefs.some((r) => r.type === "CapabilityLintFindingBridgeReport"),
      "FindingReport cites the bridge report",
    );

    // 9: includes upstream refs when present.
    const refTypes = report.header.inputRefs.map((r) => r.type);
    assert.ok(refTypes.includes("CapabilityArchitectureLintReport"));
    assert.ok(refTypes.includes("CapabilityContract"));
    assert.ok(refTypes.includes("CapabilityMap"));

    // written report validates.
    assert.equal(validateFindingReport(report).ok, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- 10 + 11: zero proposed findings fails and writes nothing ----------

test("write mode fails and writes nothing when proposedFindings === 0", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-writer-zero-"));
  try {
    const bridgeRef = await seedBridge(root, ZERO_ROWS);
    const before = await countByPrefix(root, "findings", "FindingReport-");
    const out = await writeMode(root, bridgeRef);
    assert.equal(out.status, 1, "exit non-zero on zero findings");
    assert.match(out.stderr + out.stdout, /0 eligible findings/i);
    const after = await countByPrefix(root, "findings", "FindingReport-");
    assert.equal(after, before, "no FindingReport written");
    assert.equal(after, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- 12: --dry-run and --confirm-finding-write mutually exclusive ----------

test("--dry-run and --confirm-finding-write are mutually exclusive", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-writer-excl-"));
  try {
    const bridgeRef = await seedBridge(root, ELIGIBLE_ROWS);
    const out = runCli(
      ["capability", "lint", "write-findings", "--bridge-report", bridgeRef, "--dry-run", "--confirm-finding-write", "--json"],
      root,
    );
    assert.equal(out.status, 1);
    assert.match(out.stderr + out.stdout, /mutually exclusive/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- 13-15: write-ish aliases rejected ----------

for (const flag of ["--write", "--send", "--execute"]) {
  test(`${flag} is rejected`, async () => {
    const root = await mkdtemp(join(tmpdir(), "rekon-writer-reject-"));
    try {
      const bridgeRef = await seedBridge(root, ELIGIBLE_ROWS);
      const out = runCli(
        ["capability", "lint", "write-findings", "--bridge-report", bridgeRef, flag, "--json"],
        root,
      );
      assert.equal(out.status, 1, `${flag} must exit 1`);
      assert.match(out.stderr + out.stdout, /not accepted/i);
      assert.equal(await countByPrefix(root, "findings", "FindingReport-"), 0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

// ---------- 16: missing --bridge-report fails ----------

test("missing --bridge-report fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-writer-nobridge-"));
  try {
    await seedBridge(root, ELIGIBLE_ROWS);
    const out = runCli(
      ["capability", "lint", "write-findings", "--confirm-finding-write", "--json"],
      root,
    );
    assert.equal(out.status, 1);
    assert.match(out.stderr + out.stdout, /--bridge-report/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- 18-25: governance artifacts unchanged + validate clean ----------

test("write mode mutates no downstream governance artifact and validate stays clean", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-writer-purity-"));
  try {
    const bridgeRef = await seedBridge(root, ELIGIBLE_ROWS);

    const groups = [
      ["findings", "FindingFilterReport-"], // 18
      ["findings", "FindingLifecycleReport-"], // 19
      ["findings", "IssueAdjudicationReport-"], // 20
      ["findings", "CoherencyDelta-"], // 21
      ["actions", "WorkOrder-"], // 22
      ["actions", "VerificationPlan-"], // 23
    ];
    const before = {};
    for (const [dir, prefix] of groups) {
      before[`${dir}/${prefix}`] = await countByPrefix(root, dir, prefix);
    }
    // 24: snapshot the seeded bridge artifact (the only "source" of
    // truth in the store) to prove the writer does not rewrite it.
    const bridgeFiles = await listByPrefix(root, "actions", "CapabilityLintFindingBridgeReport-");
    const bridgeBefore = await readFile(
      join(root, ".rekon", "artifacts", "actions", bridgeFiles[0]),
      "utf8",
    );

    const out = await writeMode(root, bridgeRef);
    assert.equal(out.status, 0, out.stderr || out.stdout);

    for (const [dir, prefix] of groups) {
      const after = await countByPrefix(root, dir, prefix);
      assert.equal(after, before[`${dir}/${prefix}`], `${dir}/${prefix} count unchanged`);
      assert.equal(after, 0);
    }

    // 24: bridge report file unchanged.
    const bridgeAfter = await readFile(
      join(root, ".rekon", "artifacts", "actions", bridgeFiles[0]),
      "utf8",
    );
    assert.equal(bridgeAfter, bridgeBefore, "bridge report not rewritten");

    // 25: artifacts validate clean.
    const validate = runCli(["artifacts", "validate", "--json"], root);
    assert.equal(validate.status, 0, validate.stderr || validate.stdout);
    const validatePayload = JSON.parse(validate.stdout);
    assert.equal(validatePayload.valid ?? validatePayload.ok, true, validate.stdout);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

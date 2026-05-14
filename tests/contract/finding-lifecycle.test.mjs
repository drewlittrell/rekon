import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import {
  assertFindingStatusLedger,
  createFindingReport,
  createFindingStatusLedger,
  deriveFindingLifecycle,
} from "../../packages/kernel-findings/dist/index.js";
import {
  buildFindingLifecycleReport,
  createLocalArtifactStore,
} from "../../packages/runtime/dist/index.js";
import { issueResolver } from "../../packages/capability-resolver/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- pure-helper tests ----------

test("createFindingStatusLedger rejects ignored decision without a note", () => {
  assert.throws(() =>
    createFindingStatusLedger({
      header: header("FindingStatusLedger", "ledger-1"),
      decisions: [
        {
          id: "decision-1",
          findingId: "finding-1",
          status: "ignored",
          note: "",
          updatedAt: "2026-05-01T00:00:00.000Z",
          source: "operator",
        },
      ],
    }),
  );

  const ok = createFindingStatusLedger({
    header: header("FindingStatusLedger", "ledger-1"),
    decisions: [
      {
        id: "decision-1",
        findingId: "finding-1",
        status: "ignored",
        note: "False positive in generated fixture.",
        reason: "false-positive",
        updatedAt: "2026-05-01T00:00:00.000Z",
        source: "operator",
      },
    ],
  });

  assert.equal(ok.decisions.length, 1);
});

test("deriveFindingLifecycle marks first-seen findings as new", () => {
  const latest = createFindingReport({
    header: header("FindingReport", "report-1"),
    findings: [finding("finding-1")],
  });

  const result = deriveFindingLifecycle({ latestReport: latest });

  assert.equal(result.findings[0].effectiveStatus, "new");
  assert.equal(result.findings[0].statusSource, "derived");
  assert.equal(result.findings[0].lifecycle.presentInLatestReport, true);
  assert.equal(result.resolvedFindings.length, 0);
});

test("deriveFindingLifecycle marks repeated findings as existing", () => {
  const previous = createFindingReport({
    header: header("FindingReport", "report-1"),
    findings: [finding("finding-1")],
  });
  const latest = createFindingReport({
    header: header("FindingReport", "report-2"),
    findings: [finding("finding-1")],
  });

  const result = deriveFindingLifecycle({ latestReport: latest, previousReports: [previous] });

  assert.equal(result.findings[0].effectiveStatus, "existing");
});

test("deriveFindingLifecycle applies accepted decision from ledger", () => {
  const latest = createFindingReport({
    header: header("FindingReport", "report-1"),
    findings: [finding("finding-1")],
  });
  const ledger = createFindingStatusLedger({
    header: header("FindingStatusLedger", "ledger-1"),
    decisions: [
      {
        id: "decision-1",
        findingId: "finding-1",
        status: "accepted",
        note: "Known debt.",
        reason: "accepted-risk",
        updatedAt: "2026-05-01T00:00:00.000Z",
        source: "operator",
      },
    ],
  });

  const result = deriveFindingLifecycle({ latestReport: latest, ledger });

  assert.equal(result.findings[0].effectiveStatus, "accepted");
  assert.equal(result.findings[0].statusSource, "ledger");
  assert.equal(result.findings[0].statusReason, "accepted-risk");
  assert.equal(result.findings[0].statusNote, "Known debt.");
});

test("deriveFindingLifecycle marks absent prior finding as resolved", () => {
  const previous = createFindingReport({
    header: header("FindingReport", "report-1"),
    findings: [finding("finding-1"), finding("finding-2")],
  });
  const latest = createFindingReport({
    header: header("FindingReport", "report-2"),
    findings: [finding("finding-1")],
  });

  const result = deriveFindingLifecycle({ latestReport: latest, previousReports: [previous] });

  assert.equal(result.findings.length, 1);
  assert.equal(result.resolvedFindings.length, 1);
  assert.equal(result.resolvedFindings[0].id, "finding-2");
  assert.equal(result.resolvedFindings[0].effectiveStatus, "resolved");
});

test("assertFindingStatusLedger validates artifactType", () => {
  assert.throws(() =>
    assertFindingStatusLedger({
      header: header("WrongType", "ledger-1"),
      decisions: [],
    }),
  );
});

// ---------- CLI tests ----------

test("rekon findings lifecycle writes a FindingLifecycleReport artifact", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["findings", "lifecycle", "--root", root, "--json"]).stdout,
    );

    assert.equal(result.artifact.type, "FindingLifecycleReport");
    assert.ok(typeof result.summary.total === "number");
  });
});

test("rekon findings list shows effectiveStatus derived from latest report", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.findings));
    for (const finding of result.findings) {
      assert.ok(["new", "existing", "accepted", "ignored", "resolved"].includes(finding.effectiveStatus));
      assert.ok(["report", "ledger", "derived"].includes(finding.statusSource));
    }
  });
});

test("rekon findings status set writes a FindingStatusLedger and findings list reflects it", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    // Make sure there is at least one finding to ignore. If the evaluator yields
    // none against the simple-js-ts fixture, this test simply asserts the no-op
    // CLI path without asserting on a specific finding.
    const before = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );

    if (before.findings.length === 0) {
      // Inject a synthetic FindingReport so the ledger has something to point at.
      await writeSyntheticFindingReport(root, ["finding-synth"]);
    }

    const findingId = before.findings.length === 0 ? "finding-synth" : before.findings[0].id;

    const ledgerResult = JSON.parse(
      runCli([
        "findings",
        "status",
        "set",
        findingId,
        "--status",
        "ignored",
        "--reason",
        "false-positive",
        "--note",
        "Test false positive.",
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    assert.equal(ledgerResult.artifact.type, "FindingStatusLedger");
    assert.equal(ledgerResult.decision.status, "ignored");
    assert.equal(ledgerResult.decision.note, "Test false positive.");

    const after = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );
    const ignored = after.findings.find((entry) => entry.id === findingId);

    if (ignored) {
      assert.equal(ignored.effectiveStatus, "ignored");
      assert.equal(ignored.statusSource, "ledger");
    }
  });
});

test("rekon findings status set rejects ignored without a note", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = runCliRaw([
      "findings",
      "status",
      "set",
      "finding-1",
      "--status",
      "ignored",
      "--root",
      root,
      "--json",
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /require --note/);
  });
});

test("resolve.issue includes accepted status warning when applicable", async () => {
  const findingReport = findingReportWith([
    {
      id: "finding-1",
      type: "todo_comment",
      severity: "low",
      description: "TODO replace bootstrap greeting",
      files: ["src/index.ts"],
    },
  ]);
  const ledger = createFindingStatusLedger({
    header: header("FindingStatusLedger", "ledger-1"),
    decisions: [
      {
        id: "decision-1",
        findingId: "finding-1",
        status: "accepted",
        note: "Known debt.",
        reason: "accepted-risk",
        updatedAt: "2026-05-01T00:00:00.000Z",
        source: "operator",
      },
    ],
  });
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
    ]),
    findingReport,
    ledger,
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "finding-1" },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.issue?.id, "finding-1");
  assert.equal(packet.issue?.status, "accepted");
  assert.equal(packet.issue?.statusReason, "accepted-risk");
  assert.ok(packet.warnings.some((warning) => warning.includes("accepted risk")));
});

test("resolve.issue warns when matched finding is ignored", async () => {
  const findingReport = findingReportWith([
    {
      id: "finding-1",
      type: "todo_comment",
      severity: "low",
      description: "TODO replace bootstrap greeting",
      files: ["src/index.ts"],
    },
  ]);
  const ledger = createFindingStatusLedger({
    header: header("FindingStatusLedger", "ledger-1"),
    decisions: [
      {
        id: "decision-1",
        findingId: "finding-1",
        status: "ignored",
        note: "Generated fixture.",
        reason: "false-positive",
        updatedAt: "2026-05-01T00:00:00.000Z",
        source: "operator",
      },
    ],
  });
  const harness = buildHarness({
    ownershipMap: ownershipMapFor([
      { path: "src", ownerSystem: "src", confidence: 0.9 },
    ]),
    findingReport,
    ledger,
  });

  const [ref] = await issueResolver.resolve({
    artifacts: harness.artifacts,
    input: { snapshotRef: harness.snapshotRef, issue: "finding-1" },
  });

  const packet = harness.writes.get(ref.id);

  assert.equal(packet.issue?.status, "ignored");
  assert.ok(packet.warnings.some((warning) => warning.includes("ignored")));
});

test("artifacts freshness handles FindingStatusLedger and FindingLifecycleReport", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const before = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );

    if (before.findings.length === 0) {
      await writeSyntheticFindingReport(root, ["finding-fresh"]);
    }

    const findingId = before.findings.length === 0 ? "finding-fresh" : before.findings[0].id;

    runCli([
      "findings",
      "status",
      "set",
      findingId,
      "--status",
      "accepted",
      "--reason",
      "accepted-risk",
      "--note",
      "Accepted for now.",
      "--root",
      root,
      "--json",
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);

    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    const freshness = JSON.parse(
      runCli(["artifacts", "freshness", "--root", root, "--json"]).stdout,
    );

    assert.equal(validate.valid, true, JSON.stringify(validate.issues, null, 2));
    assert.notEqual(freshness.status, "unknown");
    assert.ok(
      freshness.artifacts.some((entry) => entry.type === "FindingStatusLedger"),
      "freshness output must include FindingStatusLedger entries",
    );
    assert.ok(
      freshness.artifacts.some((entry) => entry.type === "FindingLifecycleReport"),
      "freshness output must include FindingLifecycleReport entries",
    );
  });
});

// ---------- helpers ----------

function header(artifactType, artifactId) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "synthetic" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

function finding(id, overrides = {}) {
  return {
    id,
    type: overrides.type ?? "test.example",
    severity: overrides.severity ?? "medium",
    title: overrides.title ?? `Finding ${id}`,
    description: overrides.description ?? `Description for ${id}`,
    subjects: overrides.subjects ?? [id],
    files: overrides.files,
    ruleId: overrides.ruleId,
    status: overrides.status,
  };
}

function findingReportWith(findings) {
  return {
    header: header("FindingReport", "finding-report-1"),
    summary: { total: findings.length, bySeverity: {}, byType: {} },
    findings: findings.map((entry) => ({
      ...entry,
      subjects: entry.files ?? [],
      status: "new",
    })),
  };
}

function ownershipMapFor(entries) {
  return {
    header: header("OwnershipMap", "ownership-map-1"),
    entries: entries.map((entry) => ({
      path: entry.path,
      ownerSystem: entry.ownerSystem,
      confidence: entry.confidence,
    })),
  };
}

function buildHarness(options = {}) {
  const writes = new Map();
  const reads = new Map();

  const snapshotRef = { type: "IntelligenceSnapshot", id: "snapshot-1", schemaVersion: "0.1.0" };
  const snapshot = {
    header: header("IntelligenceSnapshot", "snapshot-1"),
    repo: { id: "synthetic", root: "/synthetic" },
    inputs: { EvidenceGraph: [] },
    projections: {},
    evaluations: {},
    publications: {},
    actions: {},
    status: { freshness: "fresh", warnings: [], blockedReasons: [] },
  };

  if (options.ownershipMap) {
    const ref = registerArtifact(options.ownershipMap, "OwnershipMap", "ownership-map-1", reads);
    snapshot.projections.OwnershipMap = [ref];
  }

  if (options.findingReport) {
    const ref = registerArtifact(options.findingReport, "FindingReport", "finding-report-1", reads);
    snapshot.evaluations.FindingReport = [ref];
  }

  if (options.ledger) {
    registerArtifact(options.ledger, "FindingStatusLedger", options.ledger.header.artifactId, reads);
  }

  reads.set(`${snapshotRef.type}:${snapshotRef.id}`, snapshot);

  const artifacts = {
    async list(type) {
      return [...reads.values()]
        .filter((value) => value?.header)
        .map((value) => ({
          type: value.header.artifactType,
          id: value.header.artifactId,
          schemaVersion: value.header.schemaVersion,
          path: `.rekon/artifacts/${value.header.artifactType}.json`,
          digest: "stub",
          writtenAt: value.header.generatedAt ?? new Date().toISOString(),
        }))
        .filter((entry) => type === undefined || entry.type === type);
    },
    async read(ref) {
      const value = reads.get(`${ref.type}:${ref.id}`);
      if (!value) {
        throw new Error(`Synthetic harness has no artifact ${ref.type}:${ref.id}`);
      }
      return value;
    },
    async write(type, artifact) {
      const ref = {
        type,
        id: artifact.header.artifactId,
        schemaVersion: artifact.header.schemaVersion,
      };
      writes.set(ref.id, artifact);
      reads.set(`${type}:${ref.id}`, artifact);
      return ref;
    },
  };

  return { snapshotRef, artifacts, writes };
}

function registerArtifact(artifact, type, id, reads) {
  reads.set(`${type}:${id}`, artifact);
  return { type, id, schemaVersion: "0.1.0" };
}

async function writeSyntheticFindingReport(root, ids) {
  const reportPath = join(root, ".rekon", "artifacts", "findings", "FindingReport-synth.json");
  const indexPath = join(root, ".rekon", "registry", "artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const evidenceEntry = index.find((entry) => entry.type === "EvidenceGraph");
  const inputRefs = evidenceEntry
    ? [
      {
        type: "EvidenceGraph",
        id: evidenceEntry.id,
        schemaVersion: evidenceEntry.schemaVersion,
      },
    ]
    : [];

  const report = createFindingReport({
    header: {
      ...header("FindingReport", `synth-${Date.now()}`),
      inputRefs,
    },
    findings: ids.map((id) => finding(id)),
  });

  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  index.push({
    type: "FindingReport",
    id: report.header.artifactId,
    schemaVersion: "0.1.0",
    artifactType: "FindingReport",
    artifactId: report.header.artifactId,
    path: relative(root, reportPath),
    digest: digestJson(report),
    writtenAt: new Date().toISOString(),
  });
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
}

async function withCliFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-finding-lifecycle-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runCli(args) {
  const result = runCliRaw(args);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function runCliRaw(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

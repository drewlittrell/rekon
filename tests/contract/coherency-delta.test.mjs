import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import {
  createCoherencyDelta,
  createFindingReport,
  createFindingStatusLedger,
  deriveFindingLifecycle,
  severityToPriority,
} from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- kernel-level tests ----------

test("createCoherencyDelta summarizes active findings by severity and type", () => {
  const lifecycle = deriveFindingLifecycle({
    latestReport: createFindingReport({
      header: header("FindingReport", "report-1"),
      findings: [
        finding("finding-high", { severity: "high", type: "import_boundary.generated" }),
        finding("finding-medium", { severity: "medium", type: "import_boundary.parent" }),
        finding("finding-low", { severity: "low", type: "todo_comment" }),
      ],
    }),
  });

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-1"),
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    systemsForFinding: () => ["src"],
  });

  assert.equal(delta.summary.total, 3);
  assert.equal(delta.summary.active, 3);
  assert.equal(delta.summary.bySeverity.high, 1);
  assert.equal(delta.summary.bySeverity.medium, 1);
  assert.equal(delta.summary.bySeverity.low, 1);
  assert.equal(delta.summary.byType["import_boundary.generated"], 1);
  assert.equal(delta.summary.bySystem.src, 3);
});

test("accepted and ignored findings are not counted as active", () => {
  const latest = createFindingReport({
    header: header("FindingReport", "report-1"),
    findings: [
      finding("finding-accepted", { severity: "medium" }),
      finding("finding-ignored", { severity: "high" }),
      finding("finding-active", { severity: "low" }),
    ],
  });
  const ledger = createFindingStatusLedger({
    header: header("FindingStatusLedger", "ledger-1"),
    decisions: [
      {
        id: "decision-1",
        findingId: "finding-accepted",
        status: "accepted",
        note: "Known debt.",
        reason: "accepted-risk",
        updatedAt: "2026-05-01T00:00:00.000Z",
        source: "operator",
      },
      {
        id: "decision-2",
        findingId: "finding-ignored",
        status: "ignored",
        note: "False positive.",
        reason: "false-positive",
        updatedAt: "2026-05-01T00:00:00.000Z",
        source: "operator",
      },
    ],
  });
  const lifecycle = deriveFindingLifecycle({ latestReport: latest, ledger });

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-1"),
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    systemsForFinding: () => ["src"],
  });

  assert.equal(delta.summary.total, 3);
  assert.equal(delta.summary.active, 1);
  assert.equal(delta.summary.accepted, 1);
  assert.equal(delta.summary.ignored, 1);
  assert.equal(delta.summary.resolved, 0);
});

test("resolved findings are included but not active", () => {
  const previous = createFindingReport({
    header: header("FindingReport", "report-1"),
    findings: [finding("finding-vanish", { severity: "high" })],
  });
  const latest = createFindingReport({
    header: header("FindingReport", "report-2"),
    findings: [finding("finding-other", { severity: "medium" })],
  });
  const lifecycle = deriveFindingLifecycle({
    latestReport: latest,
    previousReports: [previous],
  });

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-1"),
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    systemsForFinding: () => ["src"],
  });

  assert.equal(delta.summary.total, 2);
  assert.equal(delta.summary.active, 1);
  assert.equal(delta.summary.resolved, 1);
  assert.equal(delta.remediationQueue.length, 1, "resolved findings should not enter remediation queue");
});

test("remediationQueue includes active findings only and priority mapping is correct", () => {
  const lifecycle = deriveFindingLifecycle({
    latestReport: createFindingReport({
      header: header("FindingReport", "report-1"),
      findings: [
        finding("finding-critical", { severity: "critical" }),
        finding("finding-high", { severity: "high" }),
        finding("finding-medium", { severity: "medium" }),
        finding("finding-low", { severity: "low" }),
      ],
    }),
  });

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-1"),
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    systemsForFinding: () => ["src"],
  });

  assert.equal(delta.remediationQueue.length, 4);
  const byFinding = new Map(delta.remediationQueue.map((step) => [step.findingId, step.priority]));
  assert.equal(byFinding.get("finding-critical"), "p0");
  assert.equal(byFinding.get("finding-high"), "p0");
  assert.equal(byFinding.get("finding-medium"), "p1");
  assert.equal(byFinding.get("finding-low"), "p2");

  // remediation queue must be sorted by priority then findingId
  const priorities = delta.remediationQueue.map((step) => step.priority);
  assert.deepEqual(priorities, ["p0", "p0", "p1", "p2"]);
});

test("severityToPriority handles every severity", () => {
  assert.equal(severityToPriority("critical"), "p0");
  assert.equal(severityToPriority("high"), "p0");
  assert.equal(severityToPriority("medium"), "p1");
  assert.equal(severityToPriority("low"), "p2");
});

test("systems are assigned from the OwnershipMap passed via systemsForFinding", () => {
  const lifecycle = deriveFindingLifecycle({
    latestReport: createFindingReport({
      header: header("FindingReport", "report-1"),
      findings: [
        finding("finding-src", { files: ["src/index.ts"] }),
        finding("finding-runtime", { files: ["packages/runtime/src/index.ts"] }),
      ],
    }),
  });

  const ownershipMap = {
    entries: [
      { path: "src", ownerSystem: "src", confidence: 0.9 },
      { path: "packages/runtime", ownerSystem: "runtime", confidence: 0.9 },
    ],
  };

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-1"),
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    systemsForFinding: (finding) => {
      const systems = new Set();
      for (const file of finding.files ?? []) {
        const match = ownershipMap.entries
          .filter((entry) => file === entry.path || file.startsWith(`${entry.path}/`))
          .sort((left, right) => right.path.length - left.path.length)[0];
        if (match) systems.add(match.ownerSystem);
      }
      return [...systems];
    },
  });

  const src = delta.items.find((item) => item.findingId === "finding-src");
  const runtime = delta.items.find((item) => item.findingId === "finding-runtime");

  assert.ok(src);
  assert.ok(runtime);
  assert.deepEqual(src.systems, ["src"]);
  assert.deepEqual(runtime.systems, ["runtime"]);
});

test("systemsForFinding fallback returns unknown when no owner is resolved", () => {
  const lifecycle = deriveFindingLifecycle({
    latestReport: createFindingReport({
      header: header("FindingReport", "report-1"),
      findings: [finding("finding-1", { files: ["unknown/path.ts"] })],
    }),
  });

  const delta = createCoherencyDelta({
    header: header("CoherencyDelta", "delta-1"),
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    systemsForFinding: () => [],
  });

  assert.deepEqual(delta.items[0].systems, ["unknown"]);
});

// ---------- CLI + runtime integration tests ----------

test("rekon coherency delta writes a CoherencyDelta artifact", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);
    // Ensure there is at least one finding so the delta has meaningful content.
    const findings = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );
    if (findings.findings.length === 0) {
      await writeSyntheticFindingReport(root, [
        { id: "finding-coh-1", severity: "high", files: ["src/index.ts"] },
        { id: "finding-coh-2", severity: "medium", files: ["src/index.ts"] },
      ]);
    }

    runCli(["findings", "lifecycle", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["coherency", "delta", "--root", root, "--json"]).stdout,
    );

    assert.equal(result.artifact.type, "CoherencyDelta");
    assert.ok(typeof result.summary.total === "number");
    assert.ok(typeof result.summary.active === "number");
    assert.ok(Array.isArray(result.remediationQueue));
  });
});

test("artifacts freshness marks CoherencyDelta stale after newer FindingLifecycleReport", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const before = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );
    if (before.findings.length === 0) {
      await writeSyntheticFindingReport(root, [
        { id: "finding-fresh-1", severity: "medium", files: ["src/index.ts"] },
      ]);
    }

    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    const coherencyResult = JSON.parse(
      runCli(["coherency", "delta", "--root", root, "--json"]).stdout,
    );
    const coherencyId = coherencyResult.artifact.id;

    // Wait briefly so the timestamps differ.
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5));

    runCli(["findings", "lifecycle", "--root", root, "--json"]);

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "CoherencyDelta",
        "--id",
        coherencyId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find(
      (candidate) => candidate.type === "CoherencyDelta" && candidate.id === coherencyId,
    );

    assert.ok(entry, "expected the older CoherencyDelta in freshness output");
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) =>
          issue.code === "newer-input-exists" &&
          issue.inputType === "FindingLifecycleReport",
      ),
      "expected newer-input-exists for FindingLifecycleReport",
    );
  });
});

test("artifacts validate stays clean with CoherencyDelta in the store", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const before = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );
    if (before.findings.length === 0) {
      await writeSyntheticFindingReport(root, [
        { id: "finding-validate", severity: "high", files: ["src/index.ts"] },
      ]);
    }

    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );

    assert.equal(validate.valid, true, JSON.stringify(validate.issues, null, 2));
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
    files: overrides.files ?? ["src/index.ts"],
    ruleId: overrides.ruleId,
    suggestedAction: overrides.suggestedAction,
    status: overrides.status,
  };
}

async function writeSyntheticFindingReport(root, findings) {
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
    findings: findings.map((entry) => finding(entry.id, entry)),
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
  const root = await mkdtemp(join(tmpdir(), "rekon-coherency-"));

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
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

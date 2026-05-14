import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import {
  createFindingReport,
} from "../../packages/kernel-findings/dist/index.js";
import { suggestReconciliationOperations } from "../../packages/capability-reconcile/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");
const importBoundaryFixture = join(
  repoRoot,
  "examples/import-boundary-rule-pack/fixtures/bad-imports",
);
const ruleackPackageName = "rekon-capability-import-boundaries-example";

// ---------- helper-level tests ----------

test("suggestReconciliationOperations maps import remediation to safe_import_rewrite deferred", () => {
  const operations = suggestReconciliationOperations({
    coherencyDelta: {
      remediationQueue: [
        {
          findingId: "import_boundary.parent_relative_import:src/a.ts:../shared",
          priority: "p0",
          title: "Import from parent path",
          action: "Replace parent-relative import with a workspace-rooted import.",
          files: ["src/a.ts"],
          systems: ["src"],
          severity: "high",
        },
      ],
    },
  });

  assert.equal(operations.length, 1);
  assert.equal(operations[0].operation, "safe_import_rewrite");
  assert.equal(operations[0].class, "source-write-deferred");
  assert.equal(operations[0].status, "deferred");
  assert.deepEqual(operations[0].requiresPermission, ["write:source"]);
  assert.equal(operations[0].findingId, "import_boundary.parent_relative_import:src/a.ts:../shared");
  assert.equal(operations[0].source, "coherency-delta");
});

test("suggestReconciliationOperations maps docs remediation to docs_regeneration artifact-only", () => {
  const operations = suggestReconciliationOperations({
    coherencyDelta: {
      remediationQueue: [
        {
          findingId: "docs.outdated:docs/usage.md",
          priority: "p1",
          title: "Outdated documentation",
          action: "Regenerate the README and docs from the latest snapshot.",
          files: ["docs/usage.md"],
          systems: ["docs"],
          severity: "medium",
        },
      ],
    },
  });

  assert.equal(operations[0].operation, "docs_regeneration");
  assert.equal(operations[0].class, "artifact-only");
  assert.equal(operations[0].status, "planned");
  assert.ok(operations[0].requiresPermission === undefined);
});

test("suggestReconciliationOperations maps test/command remediation to verification_command_run command-deferred", () => {
  const operations = suggestReconciliationOperations({
    coherencyDelta: {
      remediationQueue: [
        {
          findingId: "coverage.gap:src/util.ts",
          priority: "p2",
          title: "Missing tests",
          action: "Add tests covering the missing branches.",
          files: ["src/util.ts"],
          systems: ["src"],
          severity: "low",
        },
      ],
    },
  });

  assert.equal(operations[0].operation, "verification_command_run");
  assert.equal(operations[0].class, "command-deferred");
  assert.equal(operations[0].status, "deferred");
  assert.deepEqual(operations[0].requiresPermission, ["execute:commands"]);
});

test("suggestReconciliationOperations maps unknown remediation to manual_review deferred", () => {
  const operations = suggestReconciliationOperations({
    coherencyDelta: {
      remediationQueue: [
        {
          findingId: "mystery.finding:src/x.ts",
          priority: "p1",
          title: "Unspecified concern",
          action: "Investigate further.",
          files: ["src/x.ts"],
          systems: ["src"],
          severity: "medium",
        },
      ],
    },
  });

  assert.equal(operations[0].operation, "manual_review");
  assert.equal(operations[0].class, "manual-review");
  assert.equal(operations[0].status, "deferred");
});

test("suggestReconciliationOperations maps baseline/accept remediation to finding_baseline_write artifact-only", () => {
  const operations = suggestReconciliationOperations({
    coherencyDelta: {
      remediationQueue: [
        {
          findingId: "policy.accept:src/legacy.ts",
          priority: "p2",
          title: "Accept legacy debt",
          action: "Mark the finding as accepted in the status ledger.",
          files: ["src/legacy.ts"],
          systems: ["src"],
          severity: "low",
        },
      ],
    },
  });

  assert.equal(operations[0].operation, "finding_baseline_write");
  assert.equal(operations[0].class, "artifact-only");
  assert.equal(operations[0].status, "planned");
});

test("suggestReconciliationOperations prefers WorkOrder remediationItems over CoherencyDelta", () => {
  const operations = suggestReconciliationOperations({
    workOrder: {
      source: "coherency-delta",
      remediationItems: [
        {
          findingId: "wo-1",
          priority: "p0",
          title: "Update README",
          action: "Refresh README links.",
          files: ["README.md"],
          systems: ["docs"],
          severity: "high",
        },
      ],
    },
    coherencyDelta: {
      remediationQueue: [
        {
          findingId: "cd-1",
          priority: "p0",
          title: "Should be ignored",
          action: "Should not appear.",
          files: ["other.ts"],
          systems: ["other"],
          severity: "high",
        },
      ],
    },
  });

  assert.equal(operations.length, 1);
  assert.equal(operations[0].findingId, "wo-1");
  assert.equal(operations[0].source, "work-order");
});

test("suggestReconciliationOperations applies priority and finding filters and limit", () => {
  const queue = [
    {
      findingId: "f-1",
      priority: "p0",
      title: "Refactor import",
      action: "Replace generated-output import.",
      files: ["a.ts"],
      systems: ["src"],
      severity: "high",
    },
    {
      findingId: "f-2",
      priority: "p1",
      title: "Refactor import",
      action: "Replace parent-relative import.",
      files: ["b.ts"],
      systems: ["src"],
      severity: "medium",
    },
    {
      findingId: "f-3",
      priority: "p1",
      title: "Refactor import",
      action: "Replace parent-relative import.",
      files: ["c.ts"],
      systems: ["src"],
      severity: "medium",
    },
  ];

  const byPriority = suggestReconciliationOperations({
    coherencyDelta: { remediationQueue: queue },
    priority: "p1",
  });
  assert.equal(byPriority.length, 2);

  const byFinding = suggestReconciliationOperations({
    coherencyDelta: { remediationQueue: queue },
    findingId: "f-3",
  });
  assert.equal(byFinding.length, 1);
  assert.equal(byFinding[0].findingId, "f-3");

  const byLimit = suggestReconciliationOperations({
    coherencyDelta: { remediationQueue: queue },
    limit: 1,
  });
  assert.equal(byLimit.length, 1);
  assert.equal(byLimit[0].findingId, "f-1");
});

// ---------- CLI + runtime integration tests ----------

test("rekon reconcile suggest writes ReconciliationPlan, ReconciliationLog, ActionLog", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "finding-recon-1", severity: "high", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["reconcile", "suggest", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    assert.equal(result.artifacts.length, 3);
    const types = result.artifacts.map((ref) => ref.type);
    assert.ok(types.includes("ReconciliationPlan"));
    assert.ok(types.includes("ReconciliationLog"));
    assert.ok(types.includes("ActionLog"));
    assert.ok(result.summary);
    assert.ok(Array.isArray(result.operations));
    assert.ok(result.operations.length > 0);
  });
});

test("ReconciliationPlan summary counts operation classes", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      {
        id: "doc.finding-1",
        severity: "low",
        files: ["docs/index.md"],
        title: "Outdated docs",
        suggestedAction: "Regenerate the README from the snapshot.",
      },
      {
        id: "import.finding-1",
        severity: "high",
        files: ["src/index.ts"],
        title: "Generated import",
        suggestedAction: "Replace generated-output import with a workspace import.",
      },
      {
        id: "test.finding-1",
        severity: "medium",
        files: ["src/util.ts"],
        title: "Missing tests",
        suggestedAction: "Add tests covering the missing branches.",
      },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["reconcile", "suggest", "--root", root, "--json"]).stdout,
    );

    assert.equal(result.summary.total, 3);
    assert.equal(result.summary.artifactOnly, 1);
    assert.equal(result.summary.sourceWriteDeferred, 1);
    assert.equal(result.summary.commandDeferred, 1);
    assert.equal(result.summary.manualReview, 0);
    assert.equal(result.summary.planned + result.summary.applied, 1);
    assert.equal(result.summary.deferred, 2);
  });
});

test("rekon reconcile suggest --priority filter narrows operations", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      {
        id: "import.p0",
        severity: "high",
        files: ["src/a.ts"],
        title: "Generated import",
        suggestedAction: "Replace generated-output import.",
      },
      {
        id: "import.p1",
        severity: "medium",
        files: ["src/b.ts"],
        title: "Parent import",
        suggestedAction: "Replace parent-relative import.",
      },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli([
        "reconcile",
        "suggest",
        "--root",
        root,
        "--priority",
        "p0",
        "--json",
      ]).stdout,
    );

    assert.equal(result.summary.total, 1);
    assert.equal(result.operations[0].priority, "p0");
  });
});

test("rekon reconcile suggest --finding filter narrows operations", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      {
        id: "import.alpha",
        severity: "high",
        files: ["src/a.ts"],
        title: "Generated import",
        suggestedAction: "Replace generated-output import.",
      },
      {
        id: "import.beta",
        severity: "high",
        files: ["src/b.ts"],
        title: "Parent import",
        suggestedAction: "Replace parent-relative import.",
      },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli([
        "reconcile",
        "suggest",
        "--root",
        root,
        "--finding",
        "import.beta",
        "--json",
      ]).stdout,
    );

    assert.equal(result.summary.total, 1);
    assert.equal(result.operations[0].findingId, "import.beta");
  });
});

test("rekon reconcile suggest --apply does not apply source-write-deferred operations", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      {
        id: "import.deferred",
        severity: "high",
        files: ["src/a.ts"],
        title: "Generated import",
        suggestedAction: "Replace generated-output import.",
      },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["reconcile", "suggest", "--root", root, "--apply", "--json"]).stdout,
    );

    assert.equal(result.operations[0].status, "deferred");
    assert.equal(result.summary.applied, 0);
    assert.equal(result.summary.deferred, 1);
  });
});

test("rekon reconcile suggest --apply applies artifact-only operations only", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      {
        id: "docs.refresh",
        severity: "low",
        files: ["docs/index.md"],
        title: "Refresh docs",
        suggestedAction: "Regenerate the README documentation.",
      },
      {
        id: "import.deferred",
        severity: "high",
        files: ["src/a.ts"],
        title: "Generated import",
        suggestedAction: "Replace generated-output import.",
      },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["reconcile", "suggest", "--root", root, "--apply", "--json"]).stdout,
    );

    const docsOp = result.operations.find((op) => op.operation === "docs_regeneration");
    const importOp = result.operations.find((op) => op.operation === "safe_import_rewrite");

    assert.ok(docsOp);
    assert.ok(importOp);
    assert.equal(docsOp.status, "applied");
    assert.equal(importOp.status, "deferred");
    assert.equal(result.summary.applied, 1);
    assert.equal(result.summary.deferred, 1);
  });
});

test("existing rekon reconcile --operation docs_regeneration still works", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli([
        "reconcile",
        "--operation",
        "docs_regeneration",
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    const types = result.artifacts.map((ref) => ref.type);
    assert.ok(types.includes("ReconciliationPlan"));
    assert.ok(types.includes("ReconciliationLog"));
    assert.ok(types.includes("ActionLog"));
  });
});

test("existing rekon reconcile denies safe_import_rewrite via legacy operation flag", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = spawnSync(process.execPath, [
      cliPath,
      "reconcile",
      "--operation",
      "safe_import_rewrite",
      "--root",
      root,
      "--json",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      /requires denied source or command permissions/,
    );
  });
});

test("artifacts freshness marks ReconciliationPlan stale after newer CoherencyDelta", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      {
        id: "fresh.finding-1",
        severity: "high",
        files: ["src/a.ts"],
        title: "Generated import",
        suggestedAction: "Replace generated-output import.",
      },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const planResult = JSON.parse(
      runCli(["reconcile", "suggest", "--root", root, "--json"]).stdout,
    );
    const planRef = planResult.artifacts.find((ref) => ref.type === "ReconciliationPlan");
    const planId = planRef.id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 5));
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "ReconciliationPlan",
        "--id",
        planId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find((candidate) => candidate.id === planId);
    assert.ok(entry);
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) =>
          issue.code === "newer-input-exists" && issue.inputType === "CoherencyDelta",
      ),
      "expected stale issue citing newer CoherencyDelta",
    );
  });
});

test("import-boundary reconciliation suggestion defers safe_import_rewrite for all import findings", async (t) => {
  if (!(await packageInstalled(ruleackPackageName))) {
    t.skip(
      `External rule pack not installed. Run 'npm install ./examples/import-boundary-rule-pack --no-save' before this test.`,
    );
    return;
  }

  await withCliFixture(importBoundaryFixture, async (root) => {
    runCli(["init", "--root", root, "--json"]);

    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.capabilities = [
      ...config.capabilities,
      { package: ruleackPackageName },
    ];
    config.permissions = {
      ...(config.permissions ?? {}),
      [ruleackPackageName]: ["read:artifacts", "write:artifacts"],
    };
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli([
      "evaluate",
      "run",
      "import-boundaries.evaluate",
      "--root",
      root,
      "--json",
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["reconcile", "suggest", "--root", root, "--json"]).stdout,
    );

    assert.ok(result.operations.length > 0);
    for (const operation of result.operations) {
      assert.equal(operation.operation, "safe_import_rewrite");
      assert.equal(operation.class, "source-write-deferred");
      assert.equal(operation.status, "deferred");
      assert.deepEqual(operation.requiresPermission, ["write:source"]);
    }
    assert.equal(result.summary.applied, 0);
  });
});

// ---------- helpers ----------

async function packageInstalled(name) {
  try {
    await readdir(join(repoRoot, "node_modules", name));
    return true;
  } catch {
    return false;
  }
}

async function withCliFixture(sourceRoot, callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-reconcile-suggest-"));

  try {
    await cp(sourceRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(sourceRoot, source).split(/[\\/]/).includes(".rekon");
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

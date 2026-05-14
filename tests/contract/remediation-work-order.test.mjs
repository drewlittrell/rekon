import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import {
  createFindingReport,
  createFindingStatusLedger,
} from "../../packages/kernel-findings/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");
const importBoundaryFixture = join(
  repoRoot,
  "examples/import-boundary-rule-pack/fixtures/bad-imports",
);
const ruleackPackageName = "rekon-capability-import-boundaries-example";

test("rekon intent remediation writes IntentMap, WorkOrder, and VerificationPlan from active findings", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const findings = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );

    if (findings.findings.length === 0) {
      await writeSyntheticFindingReport(root, [
        { id: "finding-rem-1", severity: "high", files: ["src/index.ts"] },
        { id: "finding-rem-2", severity: "medium", files: ["src/index.ts"] },
      ]);
    }

    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    assert.equal(result.artifacts.length, 3);
    const types = result.artifacts.map((ref) => ref.type);
    assert.ok(types.includes("IntentMap"));
    assert.ok(types.includes("WorkOrder"));
    assert.ok(types.includes("VerificationPlan"));
    assert.ok(Array.isArray(result.selectedItems));
    assert.ok(result.selectedItems.length > 0);
  });
});

test("remediation actuator selects active CoherencyDelta items only", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "finding-active", severity: "high", files: ["src/index.ts"] },
      { id: "finding-also-active", severity: "medium", files: ["src/lib.ts"] },
    ]);

    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );

    const findingIds = result.selectedItems.map((item) => item.findingId);
    assert.ok(findingIds.includes("finding-active"));
    assert.ok(findingIds.includes("finding-also-active"));
  });
});

test("remediation excludes accepted/ignored findings", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "finding-active", severity: "high", files: ["src/index.ts"] },
      { id: "finding-accepted", severity: "high", files: ["src/lib.ts"] },
      { id: "finding-ignored", severity: "medium", files: ["src/util.ts"] },
    ]);
    await writeSyntheticFindingStatusLedger(root, [
      {
        id: "decision-accepted",
        findingId: "finding-accepted",
        status: "accepted",
        note: "Known debt.",
        reason: "accepted-risk",
      },
      {
        id: "decision-ignored",
        findingId: "finding-ignored",
        status: "ignored",
        note: "False positive.",
        reason: "false-positive",
      },
    ]);

    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );

    const findingIds = result.selectedItems.map((item) => item.findingId);
    assert.ok(findingIds.includes("finding-active"));
    assert.ok(!findingIds.includes("finding-accepted"));
    assert.ok(!findingIds.includes("finding-ignored"));
  });
});

test("priority filter restricts selected remediation items", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "finding-high", severity: "high", files: ["src/index.ts"] },
      { id: "finding-medium", severity: "medium", files: ["src/lib.ts"] },
      { id: "finding-low", severity: "low", files: ["src/util.ts"] },
    ]);

    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli([
        "intent",
        "remediation",
        "--root",
        root,
        "--priority",
        "p1",
        "--json",
      ]).stdout,
    );

    assert.equal(result.selectedItems.length, 1);
    assert.equal(result.selectedItems[0].priority, "p1");
    assert.equal(result.selectedItems[0].findingId, "finding-medium");
  });
});

test("finding filter restricts selected remediation items", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "finding-a", severity: "high", files: ["src/a.ts"] },
      { id: "finding-b", severity: "high", files: ["src/b.ts"] },
    ]);

    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli([
        "intent",
        "remediation",
        "--root",
        root,
        "--finding",
        "finding-b",
        "--json",
      ]).stdout,
    );

    assert.equal(result.selectedItems.length, 1);
    assert.equal(result.selectedItems[0].findingId, "finding-b");
  });
});

test("no active items returns no artifacts and a clear message", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );

    assert.deepEqual(result.artifacts, []);
    assert.deepEqual(result.selectedItems, []);
    assert.match(result.message, /No active remediation items/);
  });
});

test("WorkOrder markdown includes Selected Remediation Items and anti-gaming guardrail", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "finding-rem-x", severity: "high", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );
    const workOrderRef = result.artifacts.find((ref) => ref.type === "WorkOrder");
    assert.ok(workOrderRef);

    const workOrder = JSON.parse(
      await readFile(join(root, workOrderRef.path), "utf8"),
    );

    assert.equal(workOrder.source, "coherency-delta");
    assert.ok(Array.isArray(workOrder.remediationItems));
    assert.ok(workOrder.remediationItems.length > 0);
    assert.ok(
      workOrder.markdown.includes("# Rekon Remediation Work Order"),
      "must include the remediation work order heading",
    );
    assert.ok(
      workOrder.markdown.includes("## Selected Remediation Items"),
      "must include the selected remediation items section",
    );
    assert.ok(
      workOrder.markdown.includes("Do not modify tests, artifact validators"),
      "must include the strengthened anti-gaming guardrail",
    );
    assert.ok(
      workOrder.markdown.includes("rekon artifacts validate"),
      "must include validate command in required checks",
    );
    assert.ok(
      workOrder.markdown.includes("rekon artifacts freshness"),
      "must include freshness command in required checks",
    );
    assert.ok(
      workOrder.markdown.includes("Re-run `rekon coherency delta`"),
      "must instruct re-running coherency delta",
    );
  });
});

test("VerificationPlan includes validate and freshness commands", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "finding-vp", severity: "high", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );
    const verificationRef = result.artifacts.find(
      (ref) => ref.type === "VerificationPlan",
    );
    assert.ok(verificationRef);

    const plan = JSON.parse(
      await readFile(join(root, verificationRef.path), "utf8"),
    );

    assert.ok(Array.isArray(plan.commands));
    assert.ok(plan.commands.includes("npm run typecheck"));
    assert.ok(plan.commands.includes("npm run test"));
    assert.ok(plan.commands.includes("npm run build"));
    assert.ok(plan.commands.includes("rekon artifacts validate --json"));
    assert.ok(plan.commands.includes("rekon artifacts freshness --json"));
  });
});

test("remediation work order cites CoherencyDelta in inputRefs", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "finding-ref", severity: "high", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );
    const workOrderRef = result.artifacts.find((ref) => ref.type === "WorkOrder");
    const workOrder = JSON.parse(
      await readFile(join(root, workOrderRef.path), "utf8"),
    );
    const inputTypes = workOrder.header.inputRefs.map((ref) => ref.type);

    assert.ok(inputTypes.includes("CoherencyDelta"));
    assert.ok(inputTypes.includes("IntentMap"));
  });
});

test("artifacts freshness marks remediation WorkOrder stale after newer CoherencyDelta", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "finding-fresh", severity: "high", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );
    const workOrderRef = result.artifacts.find((ref) => ref.type === "WorkOrder");
    const workOrderId = workOrderRef.id;

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
        "WorkOrder",
        "--id",
        workOrderId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find(
      (candidate) => candidate.id === workOrderId,
    );
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

test("existing intent work-order command still produces resolver-based artifacts", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli([
        "intent",
        "work-order",
        "--root",
        root,
        "--path",
        "src/index.ts",
        "--goal",
        "modify bootstrap",
        "--json",
      ]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    const types = result.artifacts.map((ref) => ref.type);
    assert.ok(types.includes("IntentMap"));
    assert.ok(types.includes("WorkOrder"));
    assert.ok(types.includes("VerificationPlan"));

    const workOrderRef = result.artifacts.find((ref) => ref.type === "WorkOrder");
    const workOrder = JSON.parse(
      await readFile(join(root, workOrderRef.path), "utf8"),
    );
    assert.equal(workOrder.source, "resolver");
    assert.ok(
      workOrder.markdown.includes("# Rekon Work Order"),
      "resolver-based work order keeps its existing markdown",
    );
  });
});

test("import-boundary remediation work order surfaces p0 generated-output finding", async (t) => {
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
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );

    assert.ok(result.selectedItems.length > 0, "should select at least one remediation item");
    assert.ok(
      result.selectedItems.some((item) => item.priority === "p0"),
      "should include at least one p0 item",
    );

    const workOrderRef = result.artifacts.find((ref) => ref.type === "WorkOrder");
    const workOrder = JSON.parse(
      await readFile(join(root, workOrderRef.path), "utf8"),
    );
    assert.ok(
      workOrder.markdown.includes("| p0 |"),
      "remediation work order markdown should include a p0 row",
    );
    assert.ok(
      workOrder.markdown.includes("import_boundary"),
      "remediation work order markdown should reference import_boundary findings",
    );
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
  const root = await mkdtemp(join(tmpdir(), "rekon-remediation-"));

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

async function writeSyntheticFindingStatusLedger(root, decisions) {
  const ledgerPath = join(
    root,
    ".rekon",
    "artifacts",
    "findings",
    "FindingStatusLedger-synth.json",
  );
  const indexPath = join(root, ".rekon", "registry", "artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const ledger = createFindingStatusLedger({
    header: header("FindingStatusLedger", `ledger-synth-${Date.now()}`),
    decisions: decisions.map((decision) => ({
      ...decision,
      updatedAt: decision.updatedAt ?? new Date().toISOString(),
      source: decision.source ?? "operator",
    })),
  });

  await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), "utf8");

  index.push({
    type: "FindingStatusLedger",
    id: ledger.header.artifactId,
    schemaVersion: "0.1.0",
    artifactType: "FindingStatusLedger",
    artifactId: ledger.header.artifactId,
    path: relative(root, ledgerPath),
    digest: digestJson(ledger),
    writtenAt: new Date().toISOString(),
  });
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
}

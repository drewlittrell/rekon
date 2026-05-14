import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import { createFindingReport } from "../../packages/kernel-findings/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");
const importBoundaryFixture = join(
  repoRoot,
  "examples/import-boundary-rule-pack/fixtures/bad-imports",
);
const ruleackPackageName = "rekon-capability-import-boundaries-example";

// ---------- resolve.issue tests ----------

test("resolve.issue reports missing verification when no remediation WorkOrder references the finding", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "missing-verif-1", severity: "high", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "missing-verif-1", "--json"]).stdout,
    );
    const verification = result.packet.verification;

    assert.ok(verification, "issue packet should attach verification");
    assert.equal(verification.status, "missing");
    assert.deepEqual(verification.matchedFindingIds, []);
    assert.ok(
      result.packet.warnings.includes("No verification evidence found for this finding."),
      "warning should call out missing evidence",
    );
    const trace = result.packet.resolutionTrace.find((entry) => entry.step === "issue.verification");
    assert.ok(trace, "resolutionTrace should include issue.verification entry");
    assert.equal(trace.status, "missing");
  });
});

test("resolve.issue reports not-run when WorkOrder + VerificationPlan exist but no VerificationResult", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "not-run-verif-1", severity: "high", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["intent", "remediation", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "not-run-verif-1", "--json"]).stdout,
    );
    const verification = result.packet.verification;

    assert.equal(verification.status, "not-run");
    assert.ok(verification.workOrderRef, "should cite work order");
    assert.ok(verification.verificationPlanRef, "should cite verification plan");
    assert.ok(
      result.packet.warnings.includes("VerificationPlan exists but no VerificationResult has passed yet."),
      "warning should call out not-run evidence",
    );
  });
});

test("resolve.issue reports partial verification with warning when latest VerificationResult is partial", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    await setupRemediationWithResult(root, "partial-verif-1", {
      recordedBy: "operator",
      commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
    });

    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "partial-verif-1", "--json"]).stdout,
    );
    const verification = result.packet.verification;

    assert.equal(verification.status, "partial");
    assert.equal(verification.summary.passed, 1);
    assert.ok(verification.summary.notRun > 0);
    assert.ok(
      result.packet.warnings.includes("Associated verification is partial; missing checks remain."),
    );
  });
});

test("resolve.issue reports failed verification with warning and trace entry", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    await setupRemediationWithResult(root, "failed-verif-1", {
      recordedBy: "operator",
      commands: [
        { command: "npm run typecheck", status: "passed", exitCode: 0 },
        { command: "npm run test", status: "failed", exitCode: 1, notes: "regression" },
      ],
    });

    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "failed-verif-1", "--json"]).stdout,
    );
    const verification = result.packet.verification;

    assert.equal(verification.status, "failed");
    assert.equal(verification.summary.failed, 1);
    assert.ok(
      result.packet.warnings.includes("Associated verification failed; inspect VerificationResult before acting."),
    );

    const trace = result.packet.resolutionTrace.find((entry) => entry.step === "issue.verification");
    assert.ok(trace);
    assert.equal(trace.status, "warning");
    assert.equal(trace.sourceType, "VerificationResult");
  });
});

test("resolve.issue reports passed verification without auto-resolving the finding", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    const plan = await setupRemediationWithResult(root, "passed-verif-1", {
      recordedBy: "operator",
      commands: planAllPassed(),
    });

    assert.ok(plan.allPassed, "test setup should produce a passing verification");

    const findingsResult = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );
    const finding = findingsResult.findings.find((entry) => entry.id === "passed-verif-1");
    assert.ok(finding, "finding should still exist");
    assert.ok(
      finding.status !== "resolved",
      "passed verification must not auto-mark the finding resolved",
    );

    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "passed-verif-1", "--json"]).stdout,
    );
    const verification = result.packet.verification;

    assert.equal(verification.status, "passed");
    assert.ok(verification.verificationResultRef);
    assert.ok(
      !result.packet.warnings.some((warning) =>
        warning.startsWith("Associated verification") && warning.includes("failed")
      ),
      "should not warn about failed verification when status is passed",
    );

    // Issue.status should not change to resolved
    assert.ok(
      result.packet.issue.status !== "resolved",
      "passed verification must not flip issue.status to resolved",
    );
  });
});

test("resolve.issue resolutionTrace always includes issue.verification step for matched findings", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "trace-verif-1", severity: "medium", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["resolve", "issue", "--root", root, "--issue", "trace-verif-1", "--json"]).stdout,
    );
    const trace = result.packet.resolutionTrace.find((entry) => entry.step === "issue.verification");
    assert.ok(trace, "resolutionTrace should include issue.verification entry");
    assert.ok(trace.message.length > 0);
  });
});

// ---------- intent remediation --skip-verified tests ----------

test("intent remediation --skip-verified excludes findings with passed verification", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    await setupRemediationWithResult(root, "skip-passed-1", {
      recordedBy: "operator",
      commands: planAllPassed(),
    });

    const result = JSON.parse(
      runCli([
        "intent",
        "remediation",
        "--root",
        root,
        "--skip-verified",
        "--json",
      ]).stdout,
    );

    assert.ok(Array.isArray(result.skippedVerified));
    assert.ok(
      result.skippedVerified.some((entry) => entry.findingId === "skip-passed-1"),
      "passed finding should be in skippedVerified list",
    );
    // Since this is the only active finding, selectedItems should be empty
    assert.deepEqual(result.selectedItems ?? result.artifacts.flatMap(() => []), []);
    assert.match(
      result.message ?? "",
      /No active remediation items remain after skipping verified items/,
    );
  });
});

test("intent remediation --skip-verified does NOT exclude findings with failed verification", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    await setupRemediationWithResult(root, "skip-failed-1", {
      recordedBy: "operator",
      commands: [
        { command: "npm run typecheck", status: "passed", exitCode: 0 },
        { command: "npm run test", status: "failed", exitCode: 1, notes: "regression" },
      ],
    });

    const result = JSON.parse(
      runCli([
        "intent",
        "remediation",
        "--root",
        root,
        "--skip-verified",
        "--json",
      ]).stdout,
    );

    assert.deepEqual(result.skippedVerified, []);
    assert.ok(result.selectedItems.length > 0, "failed verification must still surface remediation work");
  });
});

test("intent remediation --skip-verified does NOT exclude not-run or partial findings", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);

    await writeSyntheticFindingReport(root, [
      { id: "skip-notrun-1", severity: "high", files: ["src/index.ts"] },
    ]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["intent", "remediation", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli([
        "intent",
        "remediation",
        "--root",
        root,
        "--skip-verified",
        "--json",
      ]).stdout,
    );

    assert.deepEqual(result.skippedVerified, []);
    assert.ok(result.selectedItems.length > 0);
  });
});

test("intent remediation --skip-verified all-skipped path writes no new WorkOrder", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    await setupRemediationWithResult(root, "all-skipped-1", {
      recordedBy: "operator",
      commands: planAllPassed(),
    });

    const beforeWorkOrders = JSON.parse(
      runCli(["artifacts", "list", "--root", root, "--type", "WorkOrder", "--json"]).stdout,
    );

    const result = JSON.parse(
      runCli([
        "intent",
        "remediation",
        "--root",
        root,
        "--skip-verified",
        "--json",
      ]).stdout,
    );

    const afterWorkOrders = JSON.parse(
      runCli(["artifacts", "list", "--root", root, "--type", "WorkOrder", "--json"]).stdout,
    );

    assert.deepEqual(result.artifacts, []);
    assert.equal(afterWorkOrders.artifacts.length, beforeWorkOrders.artifacts.length, "no new WorkOrder written");
    assert.ok(result.message.includes("No active remediation items remain"));
  });
});

test("intent remediation without --skip-verified ignores verification status", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    await setupRemediationWithResult(root, "no-skip-1", {
      recordedBy: "operator",
      commands: planAllPassed(),
    });

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );

    assert.equal(
      result.skippedVerified,
      undefined,
      "skippedVerified should be omitted unless --skip-verified is passed",
    );
    assert.ok(result.selectedItems.length > 0, "passed verification should not be skipped without the flag");
  });
});

// ---------- import-boundary integration test ----------

test("import-boundary fixture: passed verification path excludes all findings under --skip-verified", async (t) => {
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
    config.capabilities = [...config.capabilities, { package: ruleackPackageName }];
    config.permissions = {
      ...(config.permissions ?? {}),
      [ruleackPackageName]: ["read:artifacts", "write:artifacts"],
    };
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "run", "import-boundaries.evaluate", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    runCli(["intent", "remediation", "--root", root, "--json"]);

    const plans = JSON.parse(
      runCli(["artifacts", "list", "--root", root, "--type", "VerificationPlan", "--json"]).stdout,
    );
    assert.ok(plans.artifacts.length > 0, "expected a VerificationPlan from intent remediation");
    const planId = plans.artifacts[plans.artifacts.length - 1].id;

    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--plan",
      planId,
      "--result-json",
      JSON.stringify({
        recordedBy: "operator",
        commands: planAllPassed(),
      }),
      "--json",
    ]);

    const result = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--skip-verified", "--json"]).stdout,
    );

    assert.ok(result.skippedVerified.length > 0, "should skip findings tied to passing verification");
    for (const entry of result.skippedVerified) {
      assert.equal(entry.status, "passed");
      assert.ok(entry.verificationResultRef);
    }
  });
});

// ---------- helpers ----------

function planAllPassed() {
  return [
    { command: "npm run typecheck", status: "passed", exitCode: 0 },
    { command: "npm run test", status: "passed", exitCode: 0 },
    { command: "npm run build", status: "passed", exitCode: 0 },
    { command: "rekon artifacts validate --json", status: "passed", exitCode: 0 },
    { command: "rekon artifacts freshness --json", status: "passed", exitCode: 0 },
  ];
}

async function setupRemediationWithResult(root, findingId, recordJson) {
  runCli(["init", "--root", root, "--json"]);
  runCli(["observe", "--root", root, "--json"]);
  runCli(["project", "--root", root, "--json"]);

  await writeSyntheticFindingReport(root, [
    { id: findingId, severity: "high", files: ["src/index.ts"] },
  ]);
  runCli(["findings", "lifecycle", "--root", root, "--json"]);
  runCli(["coherency", "delta", "--root", root, "--json"]);
  runCli(["intent", "remediation", "--root", root, "--json"]);

  const plans = JSON.parse(
    runCli(["artifacts", "list", "--root", root, "--type", "VerificationPlan", "--json"]).stdout,
  );
  const planId = plans.artifacts.sort((a, b) => a.writtenAt.localeCompare(b.writtenAt)).slice(-1)[0].id;

  const recordResult = JSON.parse(
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--plan",
      planId,
      "--result-json",
      JSON.stringify(recordJson),
      "--json",
    ]).stdout,
  );

  return { planId, allPassed: recordResult.status === "passed" };
}

async function packageInstalled(name) {
  try {
    await readdir(join(repoRoot, "node_modules", name));
    return true;
  } catch {
    return false;
  }
}

async function withCliFixture(sourceRoot, callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-verify-aware-"));

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

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import { createFindingReport } from "../../packages/kernel-findings/dist/index.js";
import { createVerificationResult } from "../../packages/capability-intent/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- helper-level tests ----------

const planRef = { type: "VerificationPlan", id: "verification-plan-test", schemaVersion: "0.1.0" };
const planHeader = {
  artifactType: "VerificationPlan",
  artifactId: "verification-plan-test",
  schemaVersion: "0.1.0",
  generatedAt: "2026-05-14T12:00:00.000Z",
  subject: { repoId: "test-repo" },
  producer: { id: "test", version: "0.1.0" },
  inputRefs: [],
  freshness: { status: "fresh" },
};

test("createVerificationResult marks all-passed as passed", () => {
  const result = createVerificationResult({
    verificationPlan: {
      header: planHeader,
      commands: ["npm run typecheck", "npm run test", "npm run build"],
    },
    verificationPlanRef: planRef,
    commandResults: [
      { command: "npm run typecheck", status: "passed", exitCode: 0 },
      { command: "npm run test", status: "passed", exitCode: 0 },
      { command: "npm run build", status: "passed", exitCode: 0 },
    ],
  });

  assert.equal(result.status, "passed");
  assert.equal(result.header.supersession.key, `verification-result:${planRef.id}`);
  assert.equal(result.summary.passed, 3);
  assert.equal(result.summary.failed, 0);
  assert.equal(result.summary.notRun, 0);
});

test("createVerificationResult marks any failed as failed", () => {
  const result = createVerificationResult({
    verificationPlan: {
      header: planHeader,
      commands: ["npm run typecheck", "npm run test"],
    },
    verificationPlanRef: planRef,
    commandResults: [
      { command: "npm run typecheck", status: "passed", exitCode: 0 },
      { command: "npm run test", status: "failed", exitCode: 1, notes: "one regression" },
    ],
  });

  assert.equal(result.status, "failed");
  assert.equal(result.summary.passed, 1);
  assert.equal(result.summary.failed, 1);
});

test("createVerificationResult marks missing commands as not-run and overall partial", () => {
  const result = createVerificationResult({
    verificationPlan: {
      header: planHeader,
      commands: ["npm run typecheck", "npm run test", "npm run build"],
    },
    verificationPlanRef: planRef,
    commandResults: [
      { command: "npm run typecheck", status: "passed", exitCode: 0 },
    ],
  });

  assert.equal(result.status, "partial");
  assert.equal(result.summary.passed, 1);
  assert.equal(result.summary.notRun, 2);
  assert.deepEqual(result.commandResults.map((row) => row.command), [
    "npm run typecheck",
    "npm run test",
    "npm run build",
  ]);
  assert.equal(result.commandResults[1].status, "not-run");
  assert.equal(result.commandResults[2].status, "not-run");
});

test("createVerificationResult marks empty submissions as not-run", () => {
  const result = createVerificationResult({
    verificationPlan: {
      header: planHeader,
      commands: ["npm run typecheck", "npm run test"],
    },
    verificationPlanRef: planRef,
    commandResults: [],
  });

  assert.equal(result.status, "not-run");
  assert.equal(result.summary.passed, 0);
  assert.equal(result.summary.notRun, 2);
});

test("createVerificationResult adds extra commands not in the plan after plan-ordered list", () => {
  const result = createVerificationResult({
    verificationPlan: {
      header: planHeader,
      commands: ["npm run typecheck"],
    },
    verificationPlanRef: planRef,
    commandResults: [
      { command: "npm run typecheck", status: "passed", exitCode: 0 },
      { command: "rekon artifacts validate --json", status: "passed", exitCode: 0, notes: "extra evidence" },
    ],
  });

  assert.equal(result.status, "passed");
  assert.equal(result.summary.total, 2);
  assert.equal(result.commandResults[1].command, "rekon artifacts validate --json");
});

test("createVerificationResult inputRefs include VerificationPlan and WorkOrder when present", () => {
  const workOrderRef = { type: "WorkOrder", id: "work-order-test", schemaVersion: "0.1.0" };
  const result = createVerificationResult({
    verificationPlan: {
      header: planHeader,
      workOrderRef,
      commands: ["npm run test"],
    },
    verificationPlanRef: planRef,
    commandResults: [{ command: "npm run test", status: "passed" }],
  });

  const inputTypes = result.header.inputRefs.map((ref) => ref.type);
  assert.ok(inputTypes.includes("VerificationPlan"));
  assert.ok(inputTypes.includes("WorkOrder"));
});

test("createVerificationResult preserves digests and notes when provided", () => {
  const result = createVerificationResult({
    verificationPlan: { header: planHeader, commands: ["npm run test"] },
    verificationPlanRef: planRef,
    commandResults: [
      {
        command: "npm run test",
        status: "failed",
        exitCode: 1,
        durationMs: 4321,
        startedAt: "2026-05-14T12:00:01.000Z",
        completedAt: "2026-05-14T12:00:05.321Z",
        stdoutDigest: "sha256:abc",
        stderrDigest: "sha256:def",
        notes: "regression in suite",
      },
    ],
    evidenceNotes: ["Captured locally."],
    recordedBy: "drew",
  });

  const command = result.commandResults[0];
  assert.equal(command.exitCode, 1);
  assert.equal(command.durationMs, 4321);
  assert.equal(command.stdoutDigest, "sha256:abc");
  assert.equal(command.notes, "regression in suite");
  assert.deepEqual(result.evidenceNotes, ["Captured locally."]);
  assert.equal(result.recordedBy, "drew");
});

// ---------- CLI + runtime integration tests ----------

test("rekon verify record writes a VerificationResult against the latest plan with a warning", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
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
    ]);

    const result = JSON.parse(
      runCli([
        "verify",
        "record",
        "--root",
        root,
        "--result-json",
        JSON.stringify({
          recordedBy: "operator",
          commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
        }),
        "--json",
      ]).stdout,
    );

    assert.equal(result.artifact.type, "VerificationResult");
    assert.equal(result.status, "partial");
    assert.equal(result.summary.passed, 1);
    assert.ok(Array.isArray(result.warnings));
    assert.match(
      result.warnings[0],
      /No --plan provided; recorded against latest VerificationPlan/,
    );
  });
});

test("rekon verify record accepts explicit --plan id", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const workOrderResult = JSON.parse(
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
    const planRef = workOrderResult.artifacts.find((ref) => ref.type === "VerificationPlan");
    const result = JSON.parse(
      runCli([
        "verify",
        "record",
        "--root",
        root,
        "--plan",
        planRef.id,
        "--result-json",
        JSON.stringify({
          commands: [{ command: "npm run test", status: "passed", exitCode: 0 }],
        }),
        "--json",
      ]).stdout,
    );

    assert.equal(result.artifact.type, "VerificationResult");
    assert.deepEqual(result.warnings, []);

    const written = JSON.parse(
      await readFile(join(root, result.artifact.path), "utf8"),
    );
    assert.equal(written.verificationPlanRef.id, planRef.id);
    const inputTypes = written.header.inputRefs.map((ref) => ref.type);
    assert.ok(inputTypes.includes("VerificationPlan"));
    assert.ok(inputTypes.includes("WorkOrder"));
  });
});

test("rekon verify record accepts --plan type:id format", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const workOrderResult = JSON.parse(
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
    const planRef = workOrderResult.artifacts.find((ref) => ref.type === "VerificationPlan");
    const result = JSON.parse(
      runCli([
        "verify",
        "record",
        "--root",
        root,
        "--plan",
        `VerificationPlan:${planRef.id}`,
        "--result-json",
        JSON.stringify({ commands: [] }),
        "--json",
      ]).stdout,
    );

    assert.equal(result.artifact.type, "VerificationResult");
    assert.equal(result.status, "not-run");
  });
});

test("rekon verify record rejects unknown --plan with helpful error", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
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
    ]);

    const result = spawnSync(process.execPath, [
      cliPath,
      "verify",
      "record",
      "--root",
      root,
      "--plan",
      "does-not-exist",
      "--result-json",
      "{\"commands\": []}",
      "--json",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}\n${result.stdout}`, /VerificationPlan not found/);
    assert.match(`${result.stderr}\n${result.stdout}`, /Known plan ids/);
  });
});

test("rekon verify record fails when no VerificationPlan exists", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);

    const result = spawnSync(process.execPath, [
      cliPath,
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      "{\"commands\":[]}",
      "--json",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      /No VerificationPlan artifacts found/,
    );
  });
});

test("rekon verify record requires --result-json", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
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
    ]);

    const result = spawnSync(process.execPath, [
      cliPath,
      "verify",
      "record",
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
      /requires --result-json/,
    );
  });
});

test("rekon verify record rejects malformed --result-json", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
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
    ]);

    const result = spawnSync(process.execPath, [
      cliPath,
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      "{this is not json}",
      "--json",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      /not valid JSON/,
    );
  });
});

test("artifacts validate stays clean with a VerificationResult in the store", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
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
    ]);
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({ commands: [{ command: "npm run test", status: "passed" }] }),
      "--json",
    ]);

    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true, JSON.stringify(validate.issues, null, 2));
  });
});

test("artifacts freshness marks VerificationResult stale after newer VerificationPlan", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
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
    ]);
    const recordResult = JSON.parse(
      runCli([
        "verify",
        "record",
        "--root",
        root,
        "--result-json",
        JSON.stringify({ commands: [{ command: "npm run test", status: "passed" }] }),
        "--json",
      ]).stdout,
    );
    const verificationId = recordResult.artifact.id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 5));
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
    ]);

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "VerificationResult",
        "--id",
        verificationId,
        "--json",
      ]).stdout,
    );

    const entry = freshness.artifacts.find((candidate) => candidate.id === verificationId);
    assert.ok(entry);
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) => issue.code === "newer-input-exists" && issue.inputType === "VerificationPlan",
      ),
      "expected stale issue citing newer VerificationPlan",
    );
  });
});

test("existing intent work-order and intent remediation still work alongside verify", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);

    const findings = JSON.parse(
      runCli(["findings", "list", "--root", root, "--json"]).stdout,
    );

    if (findings.findings.length === 0) {
      await writeSyntheticFindingReport(root, [
        { id: "verify-existing-1", severity: "high", files: ["src/index.ts"] },
      ]);
    }

    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const remediationResult = JSON.parse(
      runCli(["intent", "remediation", "--root", root, "--json"]).stdout,
    );
    assert.ok(remediationResult.artifacts.length > 0);

    const workOrderResult = JSON.parse(
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
    assert.ok(workOrderResult.artifacts.some((ref) => ref.type === "WorkOrder"));

    const verifyResult = JSON.parse(
      runCli([
        "verify",
        "record",
        "--root",
        root,
        "--result-json",
        JSON.stringify({ commands: [{ command: "npm run test", status: "passed" }] }),
        "--json",
      ]).stdout,
    );
    assert.equal(verifyResult.artifact.type, "VerificationResult");
  });
});

test("rekon verify record preserves failed status when commands fail", async () => {
  await withCliFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
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
    ]);

    const result = JSON.parse(
      runCli([
        "verify",
        "record",
        "--root",
        root,
        "--result-json",
        JSON.stringify({
          commands: [
            { command: "npm run typecheck", status: "passed", exitCode: 0 },
            { command: "npm run test", status: "failed", exitCode: 1, notes: "regression" },
            { command: "npm run build", status: "passed", exitCode: 0 },
          ],
        }),
        "--json",
      ]).stdout,
    );

    assert.equal(result.status, "failed");
    assert.equal(result.summary.failed, 1);
    const failedCmd = result.commandResults.find((row) => row.command === "npm run test");
    assert.ok(failedCmd);
    assert.equal(failedCmd.status, "failed");
    assert.equal(failedCmd.notes, "regression");
  });
});

// ---------- helpers ----------

async function withCliFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-verify-"));

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

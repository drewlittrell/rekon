// Contract tests for `rekon verify run --dry-run`
// (P1.1 verification-run-dry-run).
//
// **No command execution.** Tests pin:
//   - createVerificationRunDryRun helper behavior.
//   - Command validation rejects shell-control / env-prefix / etc.
//   - CLI dry-run writes a not-run VerificationRun and refuses
//     invalid commands.
//   - CLI refuses --execute and --json without --dry-run.
//   - Existing `rekon verify record` behavior is unchanged.
//   - No process is spawned by --dry-run (uses a sentinel file).
//   - `artifacts validate` stays clean after a dry-run artifact.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";
import {
  createVerificationRunDryRun,
  validateVerificationRunCommandString,
  VERIFY_CAPABILITY_ID,
} from "../../packages/capability-verify/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Helper-level tests ----------

function planFixture(commands) {
  return {
    header: {
      artifactType: "VerificationPlan",
      artifactId: "verification-plan-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00.000Z",
      subject: { repoId: "test-repo" },
      producer: { id: "@rekon/capability-intent", version: "0.1.0" },
      inputRefs: [],
    },
    workOrderRef: {
      type: "WorkOrder",
      id: "work-order-test",
      schemaVersion: "0.1.0",
    },
    commands,
  };
}

function dryRunHeaderFixture() {
  return {
    artifactType: "VerificationRun",
    artifactId: "verification-run-test",
    schemaVersion: "0.1.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    subject: { repoId: "test-repo" },
    producer: { id: VERIFY_CAPABILITY_ID, version: "0.1.0" },
    inputRefs: [],
  };
}

function dryRunPlanRef() {
  return {
    type: "VerificationPlan",
    id: "verification-plan-test",
    schemaVersion: "0.1.0",
  };
}

test("createVerificationRunDryRun produces a not-run VerificationRun", () => {
  const result = createVerificationRunDryRun({
    verificationPlan: planFixture(["npm run test", "npm run build"]),
    verificationPlanRef: dryRunPlanRef(),
    workOrderRef: {
      type: "WorkOrder",
      id: "work-order-test",
      schemaVersion: "0.1.0",
    },
    header: dryRunHeaderFixture(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.verificationRun.status, "not-run");
  assert.equal(result.verificationRun.summary.total, 2);
  assert.equal(result.verificationRun.summary.notRun, 2);
  assert.equal(result.verificationRun.summary.passed, 0);
  assert.equal(result.verificationRun.summary.failed, 0);
});

test("createVerificationRunDryRun sets every command status to not-run", () => {
  const result = createVerificationRunDryRun({
    verificationPlan: planFixture(["npm run test", "npm run build", "node scripts/audit-license.mjs"]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.verificationRun.commands.length, 3);
  for (const command of result.verificationRun.commands) {
    assert.equal(command.status, "not-run");
  }
});

test("createVerificationRunDryRun parses simple commands into argv", () => {
  const result = createVerificationRunDryRun({
    verificationPlan: planFixture([
      "npm run test",
      "node scripts/audit-license.mjs",
    ]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.verificationRun.commands[0].argv, ["npm", "run", "test"]);
  assert.deepEqual(result.verificationRun.commands[1].argv, [
    "node",
    "scripts/audit-license.mjs",
  ]);
});

test("createVerificationRunDryRun rejects shell control operators", () => {
  const result = createVerificationRunDryRun({
    verificationPlan: planFixture(["npm run test && rm -rf dist"]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.validationIssues.length, 1);
  assert.equal(result.validationIssues[0].reason, "shell-control-operator");
});

test("createVerificationRunDryRun rejects env assignment prefix", () => {
  const result = createVerificationRunDryRun({
    verificationPlan: planFixture(["TOKEN=x npm test"]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.validationIssues.length, 1);
  assert.equal(result.validationIssues[0].reason, "env-assignment-prefix");
});

test("createVerificationRunDryRun rejects command substitution", () => {
  const subResult = createVerificationRunDryRun({
    verificationPlan: planFixture(["$(echo npm) test"]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(subResult.ok, false);
  assert.equal(subResult.validationIssues[0].reason, "command-substitution");

  const backtickResult = createVerificationRunDryRun({
    verificationPlan: planFixture(["`pwd` npm test"]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(backtickResult.ok, false);
  assert.equal(backtickResult.validationIssues[0].reason, "command-substitution");
});

test("createVerificationRunDryRun rejects pipes and redirects", () => {
  const pipe = createVerificationRunDryRun({
    verificationPlan: planFixture(["npm test | tee out.log"]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(pipe.ok, false);
  assert.equal(pipe.validationIssues[0].reason, "shell-control-operator");

  const redirect = createVerificationRunDryRun({
    verificationPlan: planFixture(["npm test > out.log"]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(redirect.ok, false);
  assert.equal(redirect.validationIssues[0].reason, "shell-control-operator");
});

test("createVerificationRunDryRun rejects newlines", () => {
  const result = createVerificationRunDryRun({
    verificationPlan: planFixture(["npm test\nnpm run build"]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.validationIssues[0].reason, "newline");
});

test("createVerificationRunDryRun rejects empty commands", () => {
  const result = createVerificationRunDryRun({
    verificationPlan: planFixture([""]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.validationIssues[0].reason, "empty-command");
});

test("createVerificationRunDryRun reports safety summary with executeRequired", () => {
  const result = createVerificationRunDryRun({
    verificationPlan: planFixture(["npm run test"]),
    verificationPlanRef: dryRunPlanRef(),
    header: dryRunHeaderFixture(),
  });

  assert.equal(result.safety.shell, false);
  assert.equal(result.safety.executeRequired, true);
  assert.equal(result.safety.permission, "execute:verification");
});

test("validateVerificationRunCommandString accepts safe commands", () => {
  const ok = validateVerificationRunCommandString("npm run test");
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.argv, ["npm", "run", "test"]);
});

test("validateVerificationRunCommandString rejects unsupported syntax", () => {
  const result = validateVerificationRunCommandString('echo "hello');
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unsupported-syntax");
});

// ---------- CLI tests ----------

test("CLI: verify run --dry-run writes VerificationRun and reports executed:false", async () => {
  await withFixture(async (root) => {
    const planRef = await preparePlan(root);
    const dryRun = runCliJson([
      "verify",
      "run",
      "--plan",
      planRef.id,
      "--dry-run",
      "--root",
      root,
      "--json",
    ]);

    assert.equal(dryRun.dryRun, true);
    assert.equal(dryRun.executed, false);
    assert.equal(dryRun.artifact.type, "VerificationRun");
    assert.equal(dryRun.verificationRun.status, "not-run");
    assert.equal(dryRun.message, "Dry run only. No commands were executed.");
    assert.equal(dryRun.safety.executeRequired, true);
    assert.equal(dryRun.safety.shell, false);
    for (const command of dryRun.verificationRun.commands) {
      assert.equal(command.status, "not-run");
    }
  });
});

test("CLI: verify run --preview is an alias for --dry-run", async () => {
  await withFixture(async (root) => {
    const planRef = await preparePlan(root);
    const preview = runCliJson([
      "verify",
      "run",
      "--plan",
      planRef.id,
      "--preview",
      "--root",
      root,
      "--json",
    ]);

    assert.equal(preview.dryRun, true);
    assert.equal(preview.executed, false);
    assert.equal(preview.verificationRun.status, "not-run");
  });
});

test("CLI: verify run --dry-run cites VerificationPlan and WorkOrder in inputRefs", async () => {
  await withFixture(async (root) => {
    const planRef = await preparePlan(root);
    const dryRun = runCliJson([
      "verify",
      "run",
      "--plan",
      planRef.id,
      "--dry-run",
      "--root",
      root,
      "--json",
    ]);

    const artifactPath = join(root, dryRun.artifact.path);
    const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

    assert.equal(artifact.header.artifactType, "VerificationRun");
    const inputTypes = artifact.header.inputRefs.map((ref) => ref.type);
    assert.ok(
      inputTypes.includes("VerificationPlan"),
      `expected VerificationPlan in inputRefs; got ${JSON.stringify(inputTypes)}`,
    );
    assert.ok(
      inputTypes.includes("WorkOrder"),
      `expected WorkOrder in inputRefs; got ${JSON.stringify(inputTypes)}`,
    );
    assert.equal(artifact.status, "not-run");
  });
});

test("CLI: verify run --dry-run with invalid plan command refuses to write VerificationRun", async () => {
  await withFixture(async (root) => {
    const planRef = await preparePlanWithUnsafeCommands(root);

    const failure = runCliExpectFailure([
      "verify",
      "run",
      "--plan",
      planRef.id,
      "--dry-run",
      "--root",
      root,
      "--json",
    ]);

    assert.ok(
      failure.stderr.includes("refused to write") || failure.stderr.includes("invalid command"),
      `expected refusal message; got: ${failure.stderr}`,
    );

    // Confirm no VerificationRun was indexed.
    const list = runCliJson(["artifacts", "list", "--root", root, "--json"]);
    const runs = list.artifacts.filter((entry) => entry.type === "VerificationRun");
    assert.equal(runs.length, 0, `expected zero VerificationRun artifacts, got ${runs.length}`);
  });
});

test("CLI: verify run without --dry-run / --preview fails", async () => {
  await withFixture(async (root) => {
    const planRef = await preparePlan(root);
    const failure = runCliExpectFailure([
      "verify",
      "run",
      "--plan",
      planRef.id,
      "--root",
      root,
      "--json",
    ]);

    assert.ok(
      failure.stderr.includes("requires --dry-run"),
      `expected --dry-run requirement message; got: ${failure.stderr}`,
    );
  });
});

// (The previous `--execute is refused with not-implemented`
// assertion was retired when execution v1 landed. The
// execute path is now covered by
// tests/contract/verification-run-execution.test.mjs.)

test("CLI: verify run without a plan source fails", async () => {
  await withFixture(async (root) => {
    await preparePlan(root);
    const failure = runCliExpectFailure([
      "verify",
      "run",
      "--dry-run",
      "--root",
      root,
      "--json",
    ]);

    assert.ok(
      failure.stderr.includes("requires a plan source"),
      `expected plan-source requirement message; got: ${failure.stderr}`,
    );
  });
});

test("CLI: verify run --dry-run human output includes command table and no-execution message", async () => {
  await withFixture(async (root) => {
    const planRef = await preparePlan(root);
    const stdout = runCli([
      "verify",
      "run",
      "--plan",
      planRef.id,
      "--dry-run",
      "--root",
      root,
    ]).stdout;

    assert.ok(stdout.includes("Verification run dry-run"));
    assert.ok(stdout.includes("Execution: not run"));
    assert.ok(stdout.includes("No commands were executed."));
    assert.ok(stdout.includes("| # | Command | Status | Argv |"));
  });
});

test("CLI: verify record still works and produces a VerificationResult", async () => {
  await withFixture(async (root) => {
    const planRef = await preparePlan(root);
    const recorded = runCliJson([
      "verify",
      "record",
      "--plan",
      planRef.id,
      "--result-json",
      JSON.stringify({
        commands: [{ command: "npm run test", status: "passed", exitCode: 0 }],
        recordedBy: "operator",
      }),
      "--root",
      root,
      "--json",
    ]);

    assert.equal(recorded.artifact.type, "VerificationResult");
    assert.equal(recorded.summary.passed, 1);
  });
});

test("CLI: verify run --dry-run does not spawn processes (sentinel file is never created)", async () => {
  await withFixture(async (root) => {
    const sentinelPath = join(root, "SHOULD_NOT_EXIST");
    // Construct a plan whose command, if executed, would create
    // a sentinel file. Whether the parser rejects it or accepts
    // it as argv, the file must not exist after dry-run.
    const planRef = await preparePlanWithCommand(
      root,
      `node -e "require('fs').writeFileSync('SHOULD_NOT_EXIST','x')"`,
    );

    // The command contains parentheses + a quoted JS string;
    // the parser may reject or accept it. Either way the
    // sentinel must not exist.
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        "verify",
        "run",
        "--plan",
        planRef.id,
        "--dry-run",
        "--root",
        root,
        "--json",
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );

    // The parser will reject this because the inner string
    // contains a single-quote inside double-quoted args, which
    // tokenizes oddly. Either path is fine. What matters:
    // sentinel file MUST NOT exist.
    let sentinelExists = false;

    try {
      await access(sentinelPath);
      sentinelExists = true;
    } catch {
      sentinelExists = false;
    }

    assert.equal(
      sentinelExists,
      false,
      `dry-run must not execute commands; sentinel file ${sentinelPath} was created. status=${result.status}, stdout=${result.stdout}, stderr=${result.stderr}`,
    );
  });
});

test("CLI: artifacts validate stays clean after a dry-run VerificationRun", async () => {
  await withFixture(async (root) => {
    const planRef = await preparePlan(root);
    runCliJson([
      "verify",
      "run",
      "--plan",
      planRef.id,
      "--dry-run",
      "--root",
      root,
      "--json",
    ]);

    const validation = runCliJson([
      "artifacts",
      "validate",
      "--root",
      root,
      "--json",
    ]);

    assert.equal(validation.valid, true, `validate issues: ${JSON.stringify(validation.issues)}`);
  });
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-verify-run-dry-run-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });

    runCliJson(["refresh", "--root", root, "--json"]);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function preparePlan(root) {
  const intent = runCliJson([
    "intent",
    "work-order",
    "--path",
    "src/index.ts",
    "--goal",
    "Add new feature",
    "--root",
    root,
    "--json",
  ]);

  const planRef = intent.artifacts.find((entry) => entry.type === "VerificationPlan");
  assert.ok(planRef, `intent work-order did not produce a VerificationPlan; got ${JSON.stringify(intent)}`);
  return planRef;
}

async function preparePlanWithUnsafeCommands(root) {
  const planRef = await preparePlan(root);
  // Hand-edit the plan's commands to contain an unsafe one.
  const artifactPath = join(root, planRef.path);
  const plan = JSON.parse(await readFile(artifactPath, "utf8"));

  plan.commands = ["npm run test && rm -rf dist"];

  await writeIndexedArtifact(root, planRef, plan);
  return planRef;
}

async function preparePlanWithCommand(root, command) {
  const planRef = await preparePlan(root);
  const artifactPath = join(root, planRef.path);
  const plan = JSON.parse(await readFile(artifactPath, "utf8"));

  plan.commands = [command];

  await writeIndexedArtifact(root, planRef, plan);
  return planRef;
}

async function writeIndexedArtifact(root, ref, value) {
  const artifactPath = join(root, ref.path);
  await writeFile(artifactPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");

  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const entry = index.find((candidate) => candidate.type === ref.type && candidate.id === ref.id);
  assert.ok(entry, `missing index entry for ${ref.type}:${ref.id}`);
  entry.digest = digestJson(value);
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function runCliJson(args) {
  return JSON.parse(runCli(args).stdout);
}

function runCliExpectFailure(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.notEqual(
    result.status,
    0,
    `expected non-zero exit; stdout: ${result.stdout}; stderr: ${result.stderr}`,
  );
  return result;
}

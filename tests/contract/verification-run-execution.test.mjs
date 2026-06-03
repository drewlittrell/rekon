// Contract tests for `rekon verify run --execute`
// (P1.1 verification-run-execution-v1).
//
// These tests cover the first slice that actually spawns
// processes. They pin:
//
//   - executeVerificationRun runs argv commands with shell:false.
//   - stdout / stderr digests + bounded redacted excerpts are
//     captured and stored on the VerificationRun.
//   - Secret-like text in stdout / stderr is redacted before
//     truncation.
//   - Failing commands record `failed` status and non-zero
//     exitCode; CLI exits non-zero but still writes the artifact.
//   - Per-command timeout records `timeout` (or `killed`).
//   - Per-plan timeout marks remaining commands `not-run`.
//   - Invalid shell-control commands refuse before execution and
//     write no artifact.
//   - No shell interpolation: a sentinel command with shell
//     operators does not create a side-effect file.
//   - dry-run still does nothing after --execute lands.
//   - `rekon verify record` behavior is unchanged.
//   - Passing execution does not mutate FindingStatusLedger or
//     FindingLifecycleReport.
//   - Passing execution does not write a VerificationResult.
//   - `artifacts validate` stays clean after passed / failed runs.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import {
  buildScrubbedEnvironment,
  executeVerificationRun,
  redactVerificationRunStreamText,
  VERIFICATION_RUN_DEFAULT_MAX_LOG_BYTES,
  VERIFY_CAPABILITY_ID,
} from "../../packages/capability-verify/dist/index.js";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Helper fixtures ----------

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

function runHeaderFixture() {
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

function planRef() {
  return {
    type: "VerificationPlan",
    id: "verification-plan-test",
    schemaVersion: "0.1.0",
  };
}

// ---------- Helper-level tests ----------

test("executeVerificationRun runs a simple node argv command and records passed", async () => {
  const result = await executeVerificationRun(
    {
      verificationPlan: planFixture([`node -e "console.log('ok')"`]),
      verificationPlanRef: planRef(),
      header: runHeaderFixture(),
    },
    { cwd: repoRoot, commandTimeoutMs: 30_000 },
  );

  assert.equal(result.ok, true);
  assert.equal(result.verificationRun.status, "passed");
  assert.equal(result.verificationRun.summary.passed, 1);
  assert.equal(result.verificationRun.summary.failed, 0);
  assert.equal(result.verificationRun.commands[0].status, "passed");
  assert.equal(result.verificationRun.commands[0].exitCode, 0);
});

test("executeVerificationRun captures stdout digest, byte counts, and excerpt text", async () => {
  const result = await executeVerificationRun(
    {
      verificationPlan: planFixture([`node -e "process.stdout.write('hello-world')"`]),
      verificationPlanRef: planRef(),
      header: runHeaderFixture(),
    },
    { cwd: repoRoot, commandTimeoutMs: 30_000 },
  );

  const command = result.verificationRun.commands[0];
  assert.ok(command.stdoutDigest, "stdoutDigest must be set");
  assert.equal(command.stdoutDigest.length, 64); // sha256 hex length
  assert.equal(command.stdoutExcerpt.text, "hello-world");
  assert.equal(command.stdoutExcerpt.originalBytes, 11);
  assert.equal(command.stdoutExcerpt.storedBytes, 11);
  assert.equal(command.stdoutExcerpt.truncated, false);
});

test("executeVerificationRun bounds excerpt to maxLogBytes and sets truncated:true", async () => {
  const big = "x".repeat(5000);
  const result = await executeVerificationRun(
    {
      verificationPlan: planFixture([`node -e "process.stdout.write('${big}')"`]),
      verificationPlanRef: planRef(),
      header: runHeaderFixture(),
    },
    { cwd: repoRoot, commandTimeoutMs: 30_000, maxLogBytes: 100 },
  );

  const command = result.verificationRun.commands[0];
  assert.equal(command.stdoutExcerpt.truncated, true);
  assert.equal(command.stdoutExcerpt.storedBytes, 100);
  assert.equal(command.stdoutExcerpt.originalBytes, 5000);
  assert.equal(command.stdoutExcerpt.text.length, 100);
});

test("executeVerificationRun redacts secret-like stdout text", async () => {
  const script = `console.log('TOKEN=abc123secrettokenvalue and Bearer mysupersecretvalue')`;
  const result = await executeVerificationRun(
    {
      verificationPlan: planFixture([`node -e "${script}"`]),
      verificationPlanRef: planRef(),
      header: runHeaderFixture(),
    },
    { cwd: repoRoot, commandTimeoutMs: 30_000 },
  );

  const command = result.verificationRun.commands[0];
  assert.equal(command.stdoutExcerpt.redacted, true);
  assert.equal(command.stdoutExcerpt.text.includes("abc123secrettokenvalue"), false);
  assert.equal(command.stdoutExcerpt.text.includes("mysupersecretvalue"), false);
  assert.ok(command.stdoutExcerpt.text.includes("[REDACTED]"));
});

test("executeVerificationRun records failed status for non-zero exit", async () => {
  const result = await executeVerificationRun(
    {
      verificationPlan: planFixture([`node -e "process.exit(7)"`]),
      verificationPlanRef: planRef(),
      header: runHeaderFixture(),
    },
    { cwd: repoRoot, commandTimeoutMs: 30_000 },
  );

  assert.equal(result.verificationRun.status, "failed");
  assert.equal(result.verificationRun.summary.failed, 1);
  assert.equal(result.verificationRun.commands[0].status, "failed");
  assert.equal(result.verificationRun.commands[0].exitCode, 7);
});

test("executeVerificationRun records timeout for a command that exceeds commandTimeoutMs", async () => {
  const result = await executeVerificationRun(
    {
      verificationPlan: planFixture([`node -e "setTimeout(() => {}, 60000)"`]),
      verificationPlanRef: planRef(),
      header: runHeaderFixture(),
    },
    { cwd: repoRoot, commandTimeoutMs: 200, killGraceMs: 200 },
  );

  const command = result.verificationRun.commands[0];
  assert.ok(
    command.status === "timeout" || command.status === "killed",
    `expected timeout or killed; got ${command.status}`,
  );
  assert.equal(command.timedOut, true);
  assert.ok(result.verificationRun.status === "timeout" || result.verificationRun.status === "killed");
});

test("executeVerificationRun marks commands after planTimeoutMs as not-run", async () => {
  const result = await executeVerificationRun(
    {
      verificationPlan: planFixture([
        `node -e "setTimeout(() => {}, 60000)"`,
        `node -e "console.log('never reached')"`,
      ]),
      verificationPlanRef: planRef(),
      header: runHeaderFixture(),
    },
    {
      // Plan budget is intentionally smaller than the command
      // timeout: the first command's effective timeout is the
      // remaining plan budget, so cmd 1 hits SIGTERM at the plan
      // deadline and cmd 2 is marked not-run before it starts.
      cwd: repoRoot,
      commandTimeoutMs: 5_000,
      planTimeoutMs: 100,
      killGraceMs: 100,
    },
  );

  assert.equal(result.verificationRun.commands.length, 2);
  const second = result.verificationRun.commands[1];
  assert.equal(second.status, "not-run", `commands: ${JSON.stringify(result.verificationRun.commands.map((c) => ({ id: c.id, status: c.status })))}`);
});

test("executeVerificationRun refuses unsafe commands before spawning", async () => {
  const result = await executeVerificationRun(
    {
      verificationPlan: planFixture([`node -e "console.log('ok')" && rm -rf dist`]),
      verificationPlanRef: planRef(),
      header: runHeaderFixture(),
    },
    { cwd: repoRoot, commandTimeoutMs: 30_000 },
  );

  assert.equal(result.ok, false);
  assert.equal(result.validationIssues.length, 1);
  assert.equal(result.validationIssues[0].reason, "shell-control-operator");
  assert.equal(result.verificationRun.status, "not-run");
});

test("executeVerificationRun refuses env-assignment prefix before spawning", async () => {
  const result = await executeVerificationRun(
    {
      verificationPlan: planFixture([`TOKEN=x node -e "console.log('ok')"`]),
      verificationPlanRef: planRef(),
      header: runHeaderFixture(),
    },
    { cwd: repoRoot, commandTimeoutMs: 30_000 },
  );

  assert.equal(result.ok, false);
  assert.equal(result.validationIssues[0].reason, "env-assignment-prefix");
});

test("redactVerificationRunStreamText redacts known patterns", () => {
  const input = `TOKEN=abc123 with Authorization: Bearer myverylongtokenvalue123 and {"password": "secret"}`;
  const out = redactVerificationRunStreamText(input);
  assert.equal(out.redactedMatches >= 2, true, `expected >=2 matches; got ${out.redactedMatches}`);
  assert.equal(out.text.includes("abc123"), false);
  assert.equal(out.text.includes("myverylongtokenvalue123"), false);
  assert.equal(out.text.includes("\"secret\""), false);
});

test("buildScrubbedEnvironment keeps PATH and drops token-like vars", () => {
  const scrubbed = buildScrubbedEnvironment({
    PATH: "/usr/bin",
    HOME: "/Users/test",
    SECRET_TOKEN: "leak-me",
    GITHUB_TOKEN: "leak-me-too",
    DATABASE_PASSWORD: "leak",
    NPM_TOKEN: "leak",
    PATHEXT: ".COM;.EXE",
    USER: "test",
    NOT_ALLOWED: "drop",
  });

  assert.equal(scrubbed.PATH, "/usr/bin");
  assert.equal(scrubbed.HOME, "/Users/test");
  assert.equal(scrubbed.USER, "test");
  assert.equal(scrubbed.PATHEXT, ".COM;.EXE");
  assert.equal(scrubbed.SECRET_TOKEN, undefined);
  assert.equal(scrubbed.GITHUB_TOKEN, undefined);
  assert.equal(scrubbed.DATABASE_PASSWORD, undefined);
  assert.equal(scrubbed.NPM_TOKEN, undefined);
  assert.equal(scrubbed.NOT_ALLOWED, undefined);
});

test("default max log bytes matches the safety contract (8192)", () => {
  assert.equal(VERIFICATION_RUN_DEFAULT_MAX_LOG_BYTES, 8192);
});

// ---------- CLI tests ----------

test("CLI: verify run --execute writes VerificationRun with executed:true", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "console.log('ok')"`,
    ]);

    const result = runCliJson([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--execute",
      "--command-timeout-ms",
      "30000",
      "--root",
      root,
      "--json",
    ]);

    assert.equal(result.dryRun, false);
    assert.equal(result.executed, true);
    assert.equal(result.artifact.type, "VerificationRun");
    assert.equal(result.verificationRun.status, "passed");
    assert.equal(result.verificationRun.summary.passed, 1);
    assert.equal(result.message.startsWith("Verification commands executed"), true);
  });
});

test("CLI: verify run --execute writes the artifact even when status is failed and exits non-zero", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "process.exit(1)"`,
    ]);

    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        "verify",
        "run",
        "--plan",
        planRefData.id,
        "--execute",
        "--command-timeout-ms",
        "30000",
        "--root",
        root,
        "--json",
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );

    assert.notEqual(result.status, 0, `expected non-zero CLI exit on failed run; stdout: ${result.stdout}; stderr: ${result.stderr}`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.verificationRun.status, "failed");
    assert.equal(parsed.executed, true);
    assert.equal(parsed.verificationRun.commands[0].exitCode, 1);
    // The artifact must be written even though we exit non-zero.
    const list = runCliJson(["artifacts", "list", "--type", "VerificationRun", "--root", root, "--json"]);
    assert.equal(list.artifacts.length >= 1, true);
  });
});

test("CLI: verify run --execute refuses --dry-run + --execute together", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "console.log('ok')"`,
    ]);
    const failure = runCliExpectFailure([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--dry-run",
      "--execute",
      "--root",
      root,
      "--json",
    ]);

    assert.ok(failure.stderr.includes("does not accept --dry-run and --execute together"));
  });
});

test("CLI: verify run --execute refuses invalid shell-control command before spawning", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "console.log('ok')" && rm -rf dist`,
    ]);

    const failure = runCliExpectFailure([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--execute",
      "--root",
      root,
      "--json",
    ]);

    assert.ok(failure.stderr.includes("refused to spawn") || failure.stderr.includes("invalid command"));
    const list = runCliJson(["artifacts", "list", "--type", "VerificationRun", "--root", root, "--json"]);
    assert.equal(list.artifacts.length, 0);
  });
});

test("CLI: verify run --execute refuses env-assignment prefix before spawning", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `TOKEN=x node -e "console.log('ok')"`,
    ]);

    const failure = runCliExpectFailure([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--execute",
      "--root",
      root,
      "--json",
    ]);

    assert.ok(failure.stderr.includes("env-assignment-prefix") || failure.stderr.includes("refused to spawn"));
  });
});

test("CLI: verify run --execute does NOT spawn a shell — sentinel file from `cmd && touch sentinel` is never created", async () => {
  await withFixture(async (root) => {
    const sentinelPath = join(root, "SHOULD_NOT_EXIST_FROM_EXECUTE");
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "console.log('ok')" && node -e "require('fs').writeFileSync('${sentinelPath.replace(/\\/g, "\\\\")}', 'leak')"`,
    ]);

    const failure = runCliExpectFailure([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--execute",
      "--root",
      root,
      "--json",
    ]);

    assert.ok(failure.stderr.includes("refused to spawn") || failure.stderr.includes("invalid"));
    let exists = false;
    try {
      await access(sentinelPath);
      exists = true;
    } catch {
      exists = false;
    }
    assert.equal(
      exists,
      false,
      "sentinel file was created — execute path must not run shell control operators",
    );
  });
});

test("CLI: valid node command CAN write a sentinel file when listed as a single argv command and --execute is passed", async () => {
  await withFixture(async (root) => {
    const sentinelPath = join(root, "SENTINEL_FROM_VALID_COMMAND");
    const command = `node -e "require('fs').writeFileSync('${sentinelPath.replace(/\\/g, "\\\\")}', 'wrote')"`;
    const planRefData = await preparePlanWithCommands(root, [command]);

    const result = runCliJson([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--execute",
      "--command-timeout-ms",
      "30000",
      "--root",
      root,
      "--json",
    ]);

    assert.equal(result.verificationRun.status, "passed");
    let exists = false;
    try {
      await access(sentinelPath);
      exists = true;
    } catch {
      exists = false;
    }
    assert.equal(exists, true, "expected sentinel file to exist after valid execute");
  });
});

test("CLI: verify run --dry-run still does NOT spawn after --execute lands", async () => {
  await withFixture(async (root) => {
    const sentinelPath = join(root, "SENTINEL_DRY_RUN");
    const command = `node -e "require('fs').writeFileSync('${sentinelPath.replace(/\\/g, "\\\\")}', 'wrote')"`;
    const planRefData = await preparePlanWithCommands(root, [command]);

    const dryRun = runCliJson([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--dry-run",
      "--root",
      root,
      "--json",
    ]);

    assert.equal(dryRun.executed, false);
    let exists = false;
    try {
      await access(sentinelPath);
      exists = true;
    } catch {
      exists = false;
    }
    assert.equal(exists, false, "dry-run must not execute the command");
  });
});

test("CLI: verify run --plan-file --dry-run reads an unregistered VerificationPlan file", async () => {
  await withPlanFileFixture(async ({ root, artifactRoot, execRoot, planFilePath }) => {
    const sentinelPath = join(execRoot, "SENTINEL_PLAN_FILE_DRY_RUN");
    await writePlanFile(planFilePath, [
      `node -e "require('fs').writeFileSync('SENTINEL_PLAN_FILE_DRY_RUN', 'wrote')"`,
    ]);

    const dryRun = runCliJson([
      "verify",
      "run",
      "--plan-file",
      planFilePath,
      "--dry-run",
      "--root",
      root,
      "--exec-root",
      execRoot,
      "--artifact-root",
      artifactRoot,
      "--json",
    ]);

    assert.equal(dryRun.executed, false);
    assert.equal(dryRun.planFile.artifactId, "verification-plan-test");
    assert.equal(dryRun.planFile.path, planFilePath);
    assert.equal(dryRun.roots.execRoot, execRoot);
    assert.equal(dryRun.roots.artifactRoot, artifactRoot);
    assert.equal(dryRun.planRef.path, planFilePath);
    assert.equal(dryRun.planRef.digest.length, 64);
    await assertMissing(sentinelPath, "dry-run plan-file command must not execute");

    const stored = JSON.parse(await readFile(join(artifactRoot, dryRun.artifact.path), "utf8"));
    assert.equal(stored.planFile.path, planFilePath);
    assert.equal(stored.verificationPlanRef.path, planFilePath);
  });
});

test("CLI: verify run --plan-file --execute runs commands in --exec-root and writes under --artifact-root", async () => {
  await withPlanFileFixture(async ({ root, artifactRoot, execRoot, planFilePath }) => {
    await writePlanFile(planFilePath, [
      `node -e "require('fs').writeFileSync('exec-root-proof.txt', 'ok')"`,
    ]);

    const result = runCliJson([
      "verify",
      "run",
      "--plan-file",
      planFilePath,
      "--execute",
      "--command-timeout-ms",
      "30000",
      "--root",
      root,
      "--exec-root",
      execRoot,
      "--artifact-root",
      artifactRoot,
      "--json",
    ]);

    assert.equal(result.executed, true);
    assert.equal(result.verificationRun.status, "passed");
    assert.equal(await readFile(join(execRoot, "exec-root-proof.txt"), "utf8"), "ok");
    await assertMissing(join(artifactRoot, "exec-root-proof.txt"), "command must run in exec-root, not artifact-root");
    assert.ok(result.artifact.path.startsWith(".rekon/artifacts/actions/"), result.artifact.path);
    assert.equal(JSON.parse(await readFile(join(artifactRoot, result.artifact.path), "utf8")).planFile.sha256.length, 64);

    const derived = runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      result.verificationRun.id,
      "--artifact-root",
      artifactRoot,
      "--json",
    ]);
    assert.equal(derived.verificationResult.status, "passed");
  });
});

test("CLI: verify run --plan-file without --exec-root falls back to artifact/root", async () => {
  await withPlanFileFixture(async ({ root, artifactRoot, planFilePath }) => {
    await writePlanFile(planFilePath, [
      `node -e "require('fs').writeFileSync('fallback-proof.txt', 'ok')"`,
    ]);

    const result = runCliJson([
      "verify",
      "run",
      "--plan-file",
      planFilePath,
      "--execute",
      "--command-timeout-ms",
      "30000",
      "--root",
      root,
      "--artifact-root",
      artifactRoot,
      "--json",
    ]);

    assert.equal(result.verificationRun.status, "passed");
    assert.equal(result.roots.execRoot, artifactRoot);
    assert.equal(await readFile(join(artifactRoot, "fallback-proof.txt"), "utf8"), "ok");
  });
});

test("CLI: verify run refuses --plan and --plan-file together", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
    const planFilePath = join(root, "unregistered.verification-plan.json");
    await writePlanFile(planFilePath, [`node -e "console.log('ok')"`]);

    const failure = runCliExpectFailure([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--plan-file",
      planFilePath,
      "--dry-run",
      "--root",
      root,
      "--json",
    ]);

    assert.ok(failure.stderr.includes("choose either --plan or --plan-file"));
  });
});

test("CLI: verify run --plan-file keeps unsafe commands blocked", async () => {
  await withPlanFileFixture(async ({ root, artifactRoot, execRoot, planFilePath }) => {
    await writePlanFile(planFilePath, [
      `node -e "console.log('ok')" && node -e "require('fs').writeFileSync('unsafe-proof.txt', 'bad')"`,
    ]);

    const failure = runCliExpectFailure([
      "verify",
      "run",
      "--plan-file",
      planFilePath,
      "--execute",
      "--root",
      root,
      "--exec-root",
      execRoot,
      "--artifact-root",
      artifactRoot,
      "--json",
    ]);

    assert.ok(failure.stderr.includes("refused to spawn") || failure.stderr.includes("shell-control-operator"));
    await assertMissing(join(execRoot, "unsafe-proof.txt"), "unsafe plan-file command must not execute");
  });
});

test("CLI: verify record behavior is unchanged after --execute lands", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "console.log('ok')"`,
    ]);

    const recorded = runCliJson([
      "verify",
      "record",
      "--plan",
      planRefData.id,
      "--result-json",
      JSON.stringify({
        commands: [{ command: "manual", status: "passed", exitCode: 0 }],
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

test("CLI: passing --execute run does NOT mutate FindingStatusLedger or FindingLifecycleReport", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "console.log('ok')"`,
    ]);
    const beforeLedger = await readArtifactCounts(root, "FindingStatusLedger");
    const beforeLifecycle = await readArtifactCounts(root, "FindingLifecycleReport");

    runCliJson([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--execute",
      "--command-timeout-ms",
      "30000",
      "--root",
      root,
      "--json",
    ]);

    const afterLedger = await readArtifactCounts(root, "FindingStatusLedger");
    const afterLifecycle = await readArtifactCounts(root, "FindingLifecycleReport");

    assert.equal(afterLedger, beforeLedger, "FindingStatusLedger must not change after execute");
    assert.equal(afterLifecycle, beforeLifecycle, "FindingLifecycleReport must not change after execute");
  });
});

test("CLI: passing --execute run does NOT write a VerificationResult", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "console.log('ok')"`,
    ]);
    const before = await readArtifactCounts(root, "VerificationResult");

    runCliJson([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--execute",
      "--command-timeout-ms",
      "30000",
      "--root",
      root,
      "--json",
    ]);

    const after = await readArtifactCounts(root, "VerificationResult");
    assert.equal(after, before, "execute must not write VerificationResult in v1");
  });
});

test("CLI: artifacts validate stays clean after passed --execute run", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "console.log('ok')"`,
    ]);
    runCliJson([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--execute",
      "--command-timeout-ms",
      "30000",
      "--root",
      root,
      "--json",
    ]);

    const validation = runCliJson(["artifacts", "validate", "--root", root, "--json"]);
    assert.equal(validation.valid, true, `validate issues: ${JSON.stringify(validation.issues)}`);
  });
});

test("CLI: artifacts validate stays clean after failed --execute run", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "process.exit(1)"`,
    ]);

    // Failed exec writes the artifact and CLI exits non-zero — we
    // re-run without runCliJson's status-zero assertion.
    const exec = spawnSync(
      process.execPath,
      [
        cliPath,
        "verify",
        "run",
        "--plan",
        planRefData.id,
        "--execute",
        "--command-timeout-ms",
        "30000",
        "--root",
        root,
        "--json",
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.notEqual(exec.status, 0);

    const validation = runCliJson(["artifacts", "validate", "--root", root, "--json"]);
    assert.equal(validation.valid, true, `validate issues: ${JSON.stringify(validation.issues)}`);
  });
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-verify-run-execute-"));

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

async function withPlanFileFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-plan-file-root-"));
  const artifactRoot = await mkdtemp(join(tmpdir(), "rekon-plan-file-artifacts-"));
  const execRoot = await mkdtemp(join(tmpdir(), "rekon-plan-file-exec-"));
  const planFilePath = join(root, "unregistered.verification-plan.json");

  try {
    await callback({ root, artifactRoot, execRoot, planFilePath });
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(artifactRoot, { recursive: true, force: true });
    await rm(execRoot, { recursive: true, force: true });
  }
}

async function writePlanFile(path, commands) {
  await writeFile(
    path,
    `${JSON.stringify(planFixture(commands), null, 2)}\n`,
    "utf8",
  );
}

async function assertMissing(path, message) {
  let exists = false;
  try {
    await access(path);
    exists = true;
  } catch {
    exists = false;
  }
  assert.equal(exists, false, message);
}

async function preparePlanWithCommands(root, commands) {
  const intent = runCliJson([
    "intent",
    "work-order",
    "--path",
    "src/index.ts",
    "--goal",
    "Execute smoke",
    "--root",
    root,
    "--json",
  ]);

  const planRefData = intent.artifacts.find((entry) => entry.type === "VerificationPlan");
  assert.ok(planRefData, `intent work-order did not produce a VerificationPlan; got ${JSON.stringify(intent)}`);

  // Overwrite the plan's commands with our test commands and
  // re-sync the artifact-index digest so `artifacts validate`
  // stays clean.
  const artifactPath = join(root, planRefData.path);
  const plan = JSON.parse(await readFile(artifactPath, "utf8"));

  plan.commands = commands;
  await writeFile(artifactPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  // Update the index digest to match the new content. Use the
  // pretty-printed file bytes (matching how the runtime writes
  // them) for the JSON canonicalization.
  const newDigest = digestJson(plan);
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const indexed = index.find((entry) => entry.type === "VerificationPlan" && entry.id === planRefData.id);

  if (indexed) {
    indexed.digest = newDigest;
    await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  }

  return { ...planRefData, digest: newDigest };
}

async function readArtifactCounts(root, type) {
  const list = runCliJson(["artifacts", "list", "--type", type, "--root", root, "--json"]);
  return list.artifacts.length;
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

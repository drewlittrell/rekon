// Contract tests for `rekon verify result from-run`
// (P1.1 verification-result-from-run).
//
// **Derivation is pure.** No commands are re-run. No
// findings / ledger / lifecycle / reconciliation surfaces
// are mutated. `VerificationResult` stays the concise
// proof-summary artifact; raw stdout / stderr excerpts are
// not copied into it (digests are kept).

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import {
  createVerificationRun,
  createVerificationRunSourceState,
  deriveVerificationResultFromRun,
  VERIFY_CAPABILITY_ID,
} from "../../packages/capability-verify/dist/index.js";
import {
  createSourceStateBinding,
  digestJson,
} from "../../packages/kernel-artifacts/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Fixtures ----------

function runHeader() {
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

function runRef() {
  return {
    type: "VerificationRun",
    id: "verification-run-test",
    schemaVersion: "0.1.0",
  };
}

function planRef() {
  return {
    type: "VerificationPlan",
    id: "verification-plan-test",
    schemaVersion: "0.1.0",
  };
}

function workOrderRef() {
  return {
    type: "WorkOrder",
    id: "work-order-test",
    schemaVersion: "0.1.0",
  };
}

function makeRun(overrides) {
  const commands = overrides.commands ?? [];
  const summary = {
    total: commands.length,
    passed: commands.filter((cmd) => cmd.status === "passed").length,
    failed: commands.filter((cmd) => cmd.status === "failed").length,
    skipped: commands.filter((cmd) => cmd.status === "skipped").length,
    notRun: commands.filter((cmd) => cmd.status === "not-run").length,
    timeout: commands.filter((cmd) => cmd.status === "timeout").length,
    killed: commands.filter((cmd) => cmd.status === "killed").length,
  };

  return createVerificationRun({
    header: runHeader(),
    status: overrides.status ?? "passed",
    verificationPlanRef: planRef(),
    workOrderRef: overrides.workOrderRef,
    commands,
    summary,
    runner: {
      id: "rekon.local.exec",
      version: "0.1.0",
      capabilityId: VERIFY_CAPABILITY_ID,
    },
    sourceState: overrides.sourceState,
  });
}

function sourceBinding(afterSha256 = "b".repeat(64)) {
  return createSourceStateBinding({
    baseRef: "a".repeat(40),
    files: [{
      path: "src/index.ts",
      status: "modified",
      beforeSha256: "a".repeat(64),
      afterSha256,
    }],
  });
}

// ---------- Helper-level tests ----------

test("derive: passed run maps to passed result", () => {
  const run = makeRun({
    status: "passed",
    commands: [
      { id: "cmd-1", command: "npm run test", argv: ["npm", "run", "test"], status: "passed", exitCode: 0 },
    ],
  });
  const { verificationResult } = deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
  });

  assert.equal(verificationResult.status, "passed");
  assert.equal(verificationResult.summary.passed, 1);
  assert.equal(verificationResult.commandResults[0].status, "passed");
});

test("derive: failed command maps to failed result", () => {
  const run = makeRun({
    status: "failed",
    commands: [
      { id: "cmd-1", command: "npm run test", argv: ["npm", "run", "test"], status: "failed", exitCode: 1 },
    ],
  });
  const { verificationResult } = deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
  });

  assert.equal(verificationResult.status, "failed");
  assert.equal(verificationResult.summary.failed, 1);
  assert.equal(verificationResult.commandResults[0].status, "failed");
  assert.equal(verificationResult.commandResults[0].exitCode, 1);
});

test("derive: timeout command maps to failed result", () => {
  const run = makeRun({
    status: "timeout",
    commands: [
      { id: "cmd-1", command: "node sleep.mjs", argv: ["node", "sleep.mjs"], status: "timeout", timedOut: true },
    ],
  });
  const { verificationResult } = deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
  });

  assert.equal(verificationResult.status, "failed");
  assert.equal(verificationResult.commandResults[0].status, "failed");
  assert.ok(verificationResult.commandResults[0].notes?.includes("timed out"));
});

test("derive: killed command maps to failed result", () => {
  const run = makeRun({
    status: "killed",
    commands: [
      { id: "cmd-1", command: "node sleep.mjs", argv: ["node", "sleep.mjs"], status: "killed", killed: true },
    ],
  });
  const { verificationResult } = deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
  });

  assert.equal(verificationResult.status, "failed");
  assert.equal(verificationResult.commandResults[0].status, "failed");
  assert.ok(verificationResult.commandResults[0].notes?.includes("killed"));
});

test("derive: skipped/not-run commands mixed with passed map to partial when no failures", () => {
  const run = makeRun({
    status: "partial",
    commands: [
      { id: "cmd-1", command: "npm run test", argv: ["npm", "run", "test"], status: "passed", exitCode: 0 },
      { id: "cmd-2", command: "npm run extra", argv: ["npm", "run", "extra"], status: "not-run" },
    ],
  });
  const { verificationResult } = deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
  });

  assert.equal(verificationResult.status, "partial");
  assert.equal(verificationResult.summary.passed, 1);
  assert.equal(verificationResult.summary.notRun, 1);
});

test("derive: all not-run commands map to not-run when allowNotRun is set", () => {
  const run = makeRun({
    status: "not-run",
    commands: [
      { id: "cmd-1", command: "npm run test", argv: ["npm", "run", "test"], status: "not-run" },
    ],
  });
  // Bypass the not-run refusal because we're testing the
  // status mapping itself.
  const { verificationResult } = deriveVerificationResultFromRun(
    {
      verificationRun: run,
      verificationRunRef: runRef(),
      verificationPlanRef: planRef(),
    },
    { allowNotRun: true },
  );

  assert.equal(verificationResult.status, "not-run");
  assert.equal(verificationResult.summary.notRun, 1);
});

test("derive: refuses dry-run/not-run VerificationRun by default", () => {
  const run = makeRun({
    status: "not-run",
    commands: [
      { id: "cmd-1", command: "npm run test", argv: ["npm", "run", "test"], status: "not-run" },
    ],
  });

  assert.throws(
    () =>
      deriveVerificationResultFromRun({
        verificationRun: run,
        verificationRunRef: runRef(),
        verificationPlanRef: planRef(),
      }),
    /status is not-run/i,
  );
});

test("derive: inputRefs include VerificationRun, VerificationPlan, and WorkOrder", () => {
  const run = makeRun({
    status: "passed",
    workOrderRef: workOrderRef(),
    commands: [
      { id: "cmd-1", command: "npm run test", argv: ["npm", "run", "test"], status: "passed", exitCode: 0 },
    ],
  });
  const { verificationResult } = deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
    workOrderRef: workOrderRef(),
  });

  const types = verificationResult.header.inputRefs.map((ref) => ref.type);
  assert.ok(types.includes("VerificationPlan"));
  assert.ok(types.includes("WorkOrder"));
  assert.ok(types.includes("VerificationRun"));
});

test("derive: omits excerpts but keeps stdout/stderr digests", () => {
  const run = makeRun({
    status: "passed",
    commands: [
      {
        id: "cmd-1",
        command: "npm run test",
        argv: ["npm", "run", "test"],
        status: "passed",
        exitCode: 0,
        stdoutDigest: "a".repeat(64),
        stderrDigest: "b".repeat(64),
        stdoutExcerpt: {
          text: "should not appear",
          redacted: false,
          truncated: false,
          originalBytes: 17,
          storedBytes: 17,
        },
      },
    ],
  });
  const { verificationResult } = deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
  });

  const cmd = verificationResult.commandResults[0];
  assert.equal(cmd.stdoutDigest, "a".repeat(64));
  assert.equal(cmd.stderrDigest, "b".repeat(64));
  // The result body must never carry the redacted excerpt.
  assert.equal(cmd.stdoutExcerpt, undefined);
  assert.equal(cmd.stderrExcerpt, undefined);
});

test("derive: recordedBy uses the runner id + version", () => {
  const run = makeRun({
    status: "passed",
    commands: [
      { id: "cmd-1", command: "npm run test", argv: ["npm", "run", "test"], status: "passed", exitCode: 0 },
    ],
  });
  const { verificationResult } = deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
  });

  assert.equal(verificationResult.recordedBy, "rekon.local.exec@0.1.0");
});

test("derive: stable run preserves the exact verified source-state digest", () => {
  const binding = sourceBinding();
  const run = makeRun({
    status: "passed",
    commands: [
      { id: "cmd-1", command: "npm run test", argv: ["npm", "run", "test"], status: "passed", exitCode: 0 },
    ],
    sourceState: createVerificationRunSourceState({ before: binding, after: binding }),
  });
  const { verificationResult, warnings } = deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
  });

  assert.equal(verificationResult.sourceState.digest, binding.digest);
  assert.equal(verificationResult.header.freshness.status, "fresh");
  assert.deepEqual(warnings, []);
});

test("derive: refuses a run whose checks changed the bounded source state", () => {
  const before = sourceBinding("b".repeat(64));
  const after = sourceBinding("c".repeat(64));
  const run = makeRun({
    status: "passed",
    commands: [
      { id: "cmd-1", command: "npm run test", argv: ["npm", "run", "test"], status: "passed", exitCode: 0 },
    ],
    sourceState: createVerificationRunSourceState({ before, after }),
  });

  assert.throws(() => deriveVerificationResultFromRun({
    verificationRun: run,
    verificationRunRef: runRef(),
    verificationPlanRef: planRef(),
  }), /source state changed while commands executed/iu);
});

// ---------- CLI tests ----------

test("CLI: verify result from-run writes VerificationResult for completed passed run", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
    const execResult = runCliJson([
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
    const runId = execResult.verificationRun.id;

    const derived = runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      runId,
      "--root",
      root,
      "--json",
    ]);

    assert.equal(derived.derivedFromRun, true);
    assert.equal(derived.artifact.type, "VerificationResult");
    assert.equal(derived.verificationResult.status, "passed");
    assert.ok(derived.message.includes("No findings were auto-resolved"));
  });
});

test("CLI: verify result from-run writes VerificationResult for completed failed run", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "process.exit(1)"`]);

    // Failed exec writes the artifact and CLI exits non-zero.
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
    const runId = JSON.parse(exec.stdout).verificationRun.id;

    const derived = runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      runId,
      "--root",
      root,
      "--json",
    ]);

    assert.equal(derived.verificationResult.status, "failed");
    assert.equal(derived.verificationResult.summary.failed, 1);
  });
});

test("CLI: verify result from-run refuses a dry-run VerificationRun by default", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
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
    const runId = dryRun.verificationRun.id;

    const failure = runCliExpectFailure([
      "verify",
      "result",
      "from-run",
      "--run",
      runId,
      "--root",
      root,
      "--json",
    ]);

    assert.ok(
      failure.stderr.toLowerCase().includes("not-run"),
      `expected not-run refusal; stderr: ${failure.stderr}`,
    );

    const list = runCliJson(["artifacts", "list", "--type", "VerificationResult", "--root", root, "--json"]);
    assert.equal(list.artifacts.length, 0, "no VerificationResult should be written");
  });
});

test("CLI: verify result from-run requires --run", async () => {
  await withFixture(async (root) => {
    const failure = runCliExpectFailure([
      "verify",
      "result",
      "from-run",
      "--root",
      root,
      "--json",
    ]);
    assert.ok(failure.stderr.includes("requires --run"));
  });
});

test("CLI: verify result from-run derived VerificationResult cites the run + plan in inputRefs", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
    const execResult = runCliJson([
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
    const runId = execResult.verificationRun.id;

    const derived = runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      runId,
      "--root",
      root,
      "--json",
    ]);

    const artifact = JSON.parse(await readFile(join(root, derived.artifact.path), "utf8"));
    const types = artifact.header.inputRefs.map((ref) => ref.type);
    assert.ok(types.includes("VerificationPlan"));
    assert.ok(types.includes("VerificationRun"));
  });
});

test("CLI: derived VerificationResult body does not include stdout/stderr excerpts", async () => {
  await withFixture(async (root) => {
    // The command emits the marker "zyxwv" via String.fromCharCode
    // so the marker only appears in the spawned stdout — not in
    // the command literal. If "zyxwv" appears in the
    // VerificationResult body, an excerpt leaked through.
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "process.stdout.write(String.fromCharCode(122,121,120,119,118))"`,
    ]);
    const execResult = runCliJson([
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
    const runId = execResult.verificationRun.id;

    const derived = runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      runId,
      "--root",
      root,
      "--json",
    ]);

    const artifact = JSON.parse(await readFile(join(root, derived.artifact.path), "utf8"));
    const body = JSON.stringify(artifact);
    assert.equal(
      body.includes("zyxwv"),
      false,
      "VerificationResult body must not contain raw stdout text",
    );
    for (const result of artifact.commandResults) {
      assert.equal(result.stdoutExcerpt, undefined);
      assert.equal(result.stderrExcerpt, undefined);
    }
  });
});

test("CLI: derived VerificationResult includes stdout/stderr digests", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [
      `node -e "process.stdout.write('hello')"`,
    ]);
    const execResult = runCliJson([
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
    const runId = execResult.verificationRun.id;

    const derived = runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      runId,
      "--root",
      root,
      "--json",
    ]);

    const artifact = JSON.parse(await readFile(join(root, derived.artifact.path), "utf8"));
    const cmd = artifact.commandResults[0];
    assert.equal(typeof cmd.stdoutDigest, "string");
    assert.equal(cmd.stdoutDigest.length, 64);
    assert.equal(typeof cmd.stderrDigest, "string");
  });
});

test("CLI: deriving result does NOT mutate FindingStatusLedger or FindingLifecycleReport", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
    const execResult = runCliJson([
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
    const runId = execResult.verificationRun.id;
    const beforeLedger = await readArtifactCounts(root, "FindingStatusLedger");
    const beforeLifecycle = await readArtifactCounts(root, "FindingLifecycleReport");

    runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      runId,
      "--root",
      root,
      "--json",
    ]);

    const afterLedger = await readArtifactCounts(root, "FindingStatusLedger");
    const afterLifecycle = await readArtifactCounts(root, "FindingLifecycleReport");

    assert.equal(afterLedger, beforeLedger);
    assert.equal(afterLifecycle, beforeLifecycle);
  });
});

test("CLI: deriving result does NOT auto-apply reconciliation (no new ReconciliationPlan)", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
    const execResult = runCliJson([
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
    const runId = execResult.verificationRun.id;
    const before = await readArtifactCounts(root, "ReconciliationPlan");

    runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      runId,
      "--root",
      root,
      "--json",
    ]);

    const after = await readArtifactCounts(root, "ReconciliationPlan");
    assert.equal(after, before);
  });
});

test("CLI: proof report can consume the derived VerificationResult", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
    const execResult = runCliJson([
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
    const runId = execResult.verificationRun.id;

    runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      runId,
      "--root",
      root,
      "--json",
    ]);

    const proof = runCliJson([
      "publish",
      "proof",
      "--root",
      root,
      "--json",
    ]);
    const publicationRef = proof.artifacts.find((entry) => entry.type === "Publication");
    assert.ok(publicationRef, `proof publish did not return a Publication; got ${JSON.stringify(proof)}`);
    const proofArtifact = JSON.parse(await readFile(join(root, publicationRef.path), "utf8"));
    // The proof report should mention the verification status —
    // we just check it cites a VerificationResult.
    const inputTypes = proofArtifact.header.inputRefs.map((ref) => ref.type);
    assert.ok(
      inputTypes.includes("VerificationResult"),
      `expected proof report to cite VerificationResult; got: ${JSON.stringify(inputTypes)}`,
    );
  });
});

test("CLI: existing verify record path remains unchanged", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
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

test("CLI: existing verify run --dry-run path remains unchanged", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
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
    assert.equal(dryRun.dryRun, true);
    assert.equal(dryRun.executed, false);
    assert.equal(dryRun.verificationRun.status, "not-run");
  });
});

test("CLI: existing verify run --execute path remains unchanged (still writes VerificationRun only)", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
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
    assert.equal(after, before, "execute alone must not write VerificationResult");
  });
});

test("CLI: artifacts validate stays clean after deriving a result", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
    const execResult = runCliJson([
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
    runCliJson([
      "verify",
      "result",
      "from-run",
      "--run",
      execResult.verificationRun.id,
      "--root",
      root,
      "--json",
    ]);

    const validation = runCliJson(["artifacts", "validate", "--root", root, "--json"]);
    assert.equal(validation.valid, true, `validate issues: ${JSON.stringify(validation.issues)}`);
  });
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-verify-result-from-run-"));

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

async function preparePlanWithCommands(root, commands) {
  const intent = runCliJson([
    "intent",
    "work-order",
    "--path",
    "src/index.ts",
    "--goal",
    "Derivation smoke",
    "--root",
    root,
    "--json",
  ]);

  const planRefData = intent.artifacts.find((entry) => entry.type === "VerificationPlan");
  assert.ok(planRefData, `intent work-order did not produce a VerificationPlan; got ${JSON.stringify(intent)}`);

  const artifactPath = join(root, planRefData.path);
  const plan = JSON.parse(await readFile(artifactPath, "utf8"));

  plan.commands = commands;
  await writeFile(artifactPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

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

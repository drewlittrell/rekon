// VerificationRun artifact contract tests (P1.1
// verification-runner-v1 skeleton). Pin the
// canonical shape, the validator's accept/reject
// behavior including the new `timeout` / `killed`
// statuses, registration as a built-in artifact type,
// the runtime category routing to `actions`, and
// `rekon artifacts validate` cleanliness for a seeded
// run.
//
// **No command execution. No subprocess spawn.**

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  assertVerificationRun,
  createVerificationRun,
  summarizeVerificationRunCommands,
  validateVerificationRun,
} from "../../packages/capability-intent/dist/index.js";
import { createCapabilityRegistry } from "../../packages/sdk/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

// ---------- 1: createVerificationRun produces a canonical artifact + summary ----------

test("createVerificationRun produces a canonical artifact + derived summary", () => {
  const run = createVerificationRun({
    header: artifactHeader("VerificationRun", "verify-run-1"),
    status: "passed",
    verificationPlanRef: { type: "VerificationPlan", id: "plan-1", schemaVersion: "0.1.0" },
    commands: [
      command({ id: "cmd-1", command: "npm run typecheck", argv: ["npm", "run", "typecheck"], status: "passed", exitCode: 0 }),
      command({ id: "cmd-2", command: "npm run test", argv: ["npm", "run", "test"], status: "passed", exitCode: 0 }),
    ],
    runner: { id: "@rekon/capability-verify.runner", version: "0.1.0", capabilityId: "@rekon/capability-verify" },
  });

  assert.equal(run.header.artifactType, "VerificationRun");
  assert.equal(run.status, "passed");
  assert.equal(run.verificationPlanRef.id, "plan-1");
  assert.equal(run.commands.length, 2);
  assert.equal(run.summary.total, 2);
  assert.equal(run.summary.passed, 2);
  assert.equal(run.summary.failed, 0);
  assert.equal(run.summary.timeout, 0);
  assert.equal(run.summary.killed, 0);
});

// ---------- 2: validateVerificationRun accepts canonical shape ----------

test("validateVerificationRun accepts canonical shape", () => {
  const run = createVerificationRun({
    header: artifactHeader("VerificationRun", "verify-run-canonical"),
    status: "passed",
    verificationPlanRef: { type: "VerificationPlan", id: "plan-x", schemaVersion: "0.1.0" },
    commands: [command({ id: "c", command: "echo ok", argv: ["echo", "ok"], status: "passed", exitCode: 0 })],
    runner: { id: "@rekon/capability-verify.runner" },
  });
  const result = validateVerificationRun(run);
  assert.equal(result.ok, true, `expected ok:true; got ${JSON.stringify(result)}`);
});

test("createVerificationRun rejects a malformed source-state binding", () => {
  assert.throws(() => createVerificationRun({
    header: artifactHeader("VerificationRun", "verify-run-bad-source-state"),
    status: "passed",
    verificationPlanRef: { type: "VerificationPlan", id: "plan-source", schemaVersion: "0.1.0" },
    commands: [command({ id: "c", command: "echo ok", argv: ["echo", "ok"], status: "passed", exitCode: 0 })],
    runner: { id: "@rekon/capability-verify.runner" },
    sourceState: {
      status: "stable",
      before: {
        baseRef: "0123456789012345678901234567890123456789",
        files: [{
          path: "src/index.ts",
          status: "unchanged",
          beforeSha256: "a".repeat(64),
          afterSha256: "a".repeat(64),
        }],
        digest: "b".repeat(64),
      },
      after: {
        baseRef: "0123456789012345678901234567890123456789",
        files: [{
          path: "src/index.ts",
          status: "unchanged",
          beforeSha256: "a".repeat(64),
          afterSha256: "a".repeat(64),
        }],
        digest: "b".repeat(64),
      },
      issues: [],
    },
  }), /Invalid VerificationRun source state/iu);
});

// ---------- 3: validateVerificationRun rejects missing verificationPlanRef ----------

test("validateVerificationRun rejects missing verificationPlanRef", () => {
  const result = validateVerificationRun({
    header: artifactHeader("VerificationRun", "verify-run-bad"),
    status: "passed",
    commands: [],
    summary: { total: 0, passed: 0, failed: 0, skipped: 0, notRun: 0, timeout: 0, killed: 0 },
    runner: { id: "x" },
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.verificationPlanRef"));
});

// ---------- 4: validateVerificationRun rejects invalid command status ----------

test("validateVerificationRun rejects invalid command status", () => {
  const result = validateVerificationRun({
    header: artifactHeader("VerificationRun", "verify-run-bad-cmd"),
    status: "passed",
    verificationPlanRef: { type: "VerificationPlan", id: "plan-1", schemaVersion: "0.1.0" },
    commands: [
      { id: "x", command: "echo", argv: ["echo"], status: "totally-bogus" },
    ],
    summary: { total: 1, passed: 0, failed: 0, skipped: 0, notRun: 1, timeout: 0, killed: 0 },
    runner: { id: "@rekon/capability-verify.runner" },
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.path === "$.commands[0].status"),
    `expected an issue on $.commands[0].status; got ${JSON.stringify(result.issues)}`,
  );
});

// ---------- 5: validateVerificationRun accepts timeout and killed command statuses ----------

test("validateVerificationRun accepts timeout and killed command statuses", () => {
  const run = createVerificationRun({
    header: artifactHeader("VerificationRun", "verify-run-tk"),
    status: "partial",
    verificationPlanRef: { type: "VerificationPlan", id: "plan-tk", schemaVersion: "0.1.0" },
    commands: [
      command({ id: "c1", command: "long", argv: ["long"], status: "timeout", timedOut: true }),
      command({ id: "c2", command: "killd", argv: ["killd"], status: "killed", killed: true, signal: "SIGKILL" }),
      command({ id: "c3", command: "ok", argv: ["ok"], status: "passed", exitCode: 0 }),
    ],
    runner: { id: "@rekon/capability-verify.runner" },
  });
  const result = validateVerificationRun(run);
  assert.equal(result.ok, true);
  assert.equal(run.summary.timeout, 1);
  assert.equal(run.summary.killed, 1);
  assert.equal(run.summary.passed, 1);
  // assertVerificationRun should also accept.
  const asserted = assertVerificationRun(run);
  assert.equal(asserted.status, "partial");
});

// ---------- 6: VerificationRun registers as a built-in artifact type ----------

test("VerificationRun is registered as a built-in artifact type in the SDK registry", () => {
  const registry = createCapabilityRegistry();
  const types = registry.snapshot().artifactTypes.map((entry) => entry.type);
  assert.ok(types.includes("VerificationRun"), `expected VerificationRun in built-in artifact types; got ${types.join(", ")}`);
});

// ---------- 7: runtime routes VerificationRun under `actions` ----------

test("runtime artifact store routes VerificationRun writes under .rekon/artifacts/actions", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-verify-run-route-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const run = createVerificationRun({
      header: artifactHeader("VerificationRun", `verify-run-route-${Date.now()}`),
      status: "passed",
      verificationPlanRef: { type: "VerificationPlan", id: "plan-route", schemaVersion: "0.1.0" },
      commands: [command({ id: "c", command: "echo", argv: ["echo"], status: "passed", exitCode: 0 })],
      runner: { id: "@rekon/capability-verify.runner" },
    });
    await store.write(run);
    const actionsDir = join(root, ".rekon", "artifacts", "actions");
    const entries = await readdir(actionsDir);
    assert.ok(
      entries.some((name) => name.startsWith("VerificationRun-") && name.endsWith(".json")),
      `expected a VerificationRun artifact under actions/; got ${entries.join(", ")}`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- 8: rekon artifacts validate stays clean for a seeded VerificationRun ----------

test("rekon artifacts validate returns valid:true for a seeded VerificationRun", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-verify-run-cli-"));
  try {
    runCli(["init", "--root", root, "--json"]);
    const store = createLocalArtifactStore(root);
    await store.init();
    const run = createVerificationRun({
      header: artifactHeader("VerificationRun", `verify-run-cli-${Date.now()}`),
      status: "passed",
      verificationPlanRef: { type: "VerificationPlan", id: "plan-cli", schemaVersion: "0.1.0" },
      commands: [command({ id: "c", command: "echo", argv: ["echo"], status: "passed", exitCode: 0 })],
      runner: { id: "@rekon/capability-verify.runner", version: "0.1.0" },
    });
    await store.write(run);
    const validate = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validate.valid, true, `validate must be valid:true; got ${JSON.stringify(validate)}`);
    assert.deepEqual(validate.issues ?? [], []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- 9: summarizeVerificationRunCommands counts every status correctly ----------

test("summarizeVerificationRunCommands counts each status bucket", () => {
  const summary = summarizeVerificationRunCommands([
    command({ id: "a", command: "a", argv: ["a"], status: "passed" }),
    command({ id: "b", command: "b", argv: ["b"], status: "failed" }),
    command({ id: "c", command: "c", argv: ["c"], status: "skipped" }),
    command({ id: "d", command: "d", argv: ["d"], status: "not-run" }),
    command({ id: "e", command: "e", argv: ["e"], status: "timeout" }),
    command({ id: "f", command: "f", argv: ["f"], status: "killed" }),
  ]);
  assert.deepEqual(summary, {
    total: 6,
    passed: 1,
    failed: 1,
    skipped: 1,
    notRun: 1,
    timeout: 1,
    killed: 1,
  });
});

// ---------- helpers ----------

function command(overrides) {
  return {
    id: overrides.id,
    command: overrides.command,
    argv: overrides.argv,
    status: overrides.status,
    exitCode: overrides.exitCode,
    signal: overrides.signal,
    startedAt: overrides.startedAt,
    endedAt: overrides.endedAt,
    durationMs: overrides.durationMs,
    timedOut: overrides.timedOut,
    killed: overrides.killed,
    stdoutDigest: overrides.stdoutDigest,
    stderrDigest: overrides.stderrDigest,
    stdoutExcerpt: overrides.stdoutExcerpt,
    stderrExcerpt: overrides.stderrExcerpt,
    notes: overrides.notes,
  };
}

function artifactHeader(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: "synthetic" },
    producer: { id: "test-harness", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
  };
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

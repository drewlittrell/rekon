// Contract tests for VerificationPlan missing-script tolerance
// (post-beta polish surfaced by the first real-repo cohort).
//
// These pin:
//
//   - detectMissingScriptCommands recognises npm/pnpm/yarn `run <name>`
//     argv patterns and returns indices for scripts absent from
//     <cwd>/package.json.
//   - It is conservative — non-package-manager commands, malformed
//     package.json, and missing package.json all fall through to
//     the normal spawn path.
//   - executeVerificationRun emits `skipped` (not `failed`) for
//     pre-detected missing-script commands and a `missing-script:<name>`
//     note.
//   - No process is spawned for skipped commands (no exit-code
//     noise from the package manager).
//   - Aggregate run status follows the existing rules:
//       - some passed + some skipped + 0 failed  → `partial`
//       - 0 passed + some skipped + 0 failed     → `not-run`
//       - any failed                              → `failed`
//   - VerificationResult derivation maps `skipped` through honestly.
//   - artifacts validate stays clean after a mixed pass/skip run.

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  detectMissingScriptCommands,
  executeVerificationRun,
  deriveVerificationResultFromRun,
  VERIFY_CAPABILITY_ID,
} from "../../packages/capability-verify/dist/index.js";

// ---------- helpers ----------

async function withTempPackageJson(scripts) {
  const root = await mkdtemp(join(tmpdir(), "rekon-missing-script-"));
  if (scripts !== null) {
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ name: "fixture", scripts }, null, 2),
    );
  }
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

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

// ---------- detectMissingScriptCommands unit tests ----------

test("detectMissingScriptCommands flags an npm-run script absent from package.json", async () => {
  const { root, cleanup } = await withTempPackageJson({ typecheck: "tsc" });
  try {
    const result = detectMissingScriptCommands(
      [{ argv: ["npm", "run", "test"] }],
      root,
    );
    assert.equal(result.size, 1);
    assert.deepEqual(result.get(0), { scriptName: "test", packageManager: "npm" });
  } finally {
    await cleanup();
  }
});

test("detectMissingScriptCommands recognises pnpm and yarn run patterns", async () => {
  const { root, cleanup } = await withTempPackageJson({ build: "rollup -c" });
  try {
    const result = detectMissingScriptCommands(
      [
        { argv: ["pnpm", "run", "test"] },
        { argv: ["yarn", "run", "lint"] },
        { argv: ["pnpm", "run", "build"] }, // exists — should NOT be flagged
      ],
      root,
    );
    assert.equal(result.size, 2);
    assert.deepEqual(result.get(0), { scriptName: "test", packageManager: "pnpm" });
    assert.deepEqual(result.get(1), { scriptName: "lint", packageManager: "yarn" });
    assert.equal(result.has(2), false);
  } finally {
    await cleanup();
  }
});

test("detectMissingScriptCommands does NOT flag scripts that exist", async () => {
  const { root, cleanup } = await withTempPackageJson({ typecheck: "tsc", test: "node --test", build: "tsc -b" });
  try {
    const result = detectMissingScriptCommands(
      [
        { argv: ["npm", "run", "typecheck"] },
        { argv: ["npm", "run", "test"] },
        { argv: ["npm", "run", "build"] },
      ],
      root,
    );
    assert.equal(result.size, 0);
  } finally {
    await cleanup();
  }
});

test("detectMissingScriptCommands falls through for non-package-manager argv shapes", async () => {
  const { root, cleanup } = await withTempPackageJson({ build: "tsc -b" });
  try {
    const result = detectMissingScriptCommands(
      [
        { argv: ["node", "scripts/audit.mjs"] },
        { argv: ["bash", "-c", "echo hi"] },
        { argv: ["./binary"] },
        { argv: ["npm", "test"] }, // bare `npm test`: not `npm run X`, conservatively unhandled
        { argv: ["npm", "install"] },
        { argv: ["npx", "playwright", "test"] },
      ],
      root,
    );
    assert.equal(result.size, 0);
  } finally {
    await cleanup();
  }
});

test("detectMissingScriptCommands returns empty when package.json is missing", async () => {
  const { root, cleanup } = await withTempPackageJson(null); // no package.json
  try {
    const result = detectMissingScriptCommands(
      [{ argv: ["npm", "run", "test"] }],
      root,
    );
    assert.equal(result.size, 0);
  } finally {
    await cleanup();
  }
});

test("detectMissingScriptCommands returns empty when package.json is malformed", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-missing-script-malformed-"));
  try {
    await writeFile(join(root, "package.json"), "not valid json {");
    const result = detectMissingScriptCommands(
      [{ argv: ["npm", "run", "test"] }],
      root,
    );
    assert.equal(result.size, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("detectMissingScriptCommands handles package.json with no scripts field", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-missing-script-noscripts-"));
  try {
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture" }));
    const result = detectMissingScriptCommands(
      [{ argv: ["npm", "run", "test"] }],
      root,
    );
    assert.equal(result.size, 1);
    assert.deepEqual(result.get(0), { scriptName: "test", packageManager: "npm" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------- executeVerificationRun integration ----------

test("executeVerificationRun marks missing npm-run scripts as skipped without spawning", async () => {
  const { root, cleanup } = await withTempPackageJson({ typecheck: "node -e ''" });
  try {
    const result = await executeVerificationRun(
      {
        verificationPlan: planFixture(["npm run absent-script"]),
        verificationPlanRef: planRef(),
        header: runHeaderFixture(),
      },
      { cwd: root, commandTimeoutMs: 30_000 },
    );
    assert.equal(result.ok, true);
    const cmd = result.verificationRun.commands[0];
    assert.equal(cmd.status, "skipped");
    // No spawn happened → no exit code recorded.
    assert.equal(cmd.exitCode, undefined);
    assert.equal(cmd.durationMs, undefined);
    // Note explains why.
    assert.match(cmd.notes ?? "", /missing-script: absent-script/);
    assert.equal(result.verificationRun.summary.skipped, 1);
    assert.equal(result.verificationRun.summary.failed, 0);
  } finally {
    await cleanup();
  }
});

test("executeVerificationRun mixes passed + skipped → run status `partial`", async () => {
  const { root, cleanup } = await withTempPackageJson({ typecheck: "node -e ''", build: "node -e ''" });
  try {
    const result = await executeVerificationRun(
      {
        verificationPlan: planFixture([
          "npm run typecheck",
          "npm run nope-not-here",
          "npm run build",
        ]),
        verificationPlanRef: planRef(),
        header: runHeaderFixture(),
      },
      { cwd: root, commandTimeoutMs: 30_000 },
    );
    assert.equal(result.ok, true);
    assert.equal(result.verificationRun.status, "partial");
    assert.equal(result.verificationRun.summary.passed, 2);
    assert.equal(result.verificationRun.summary.skipped, 1);
    assert.equal(result.verificationRun.summary.failed, 0);
    assert.equal(result.verificationRun.commands[0].status, "passed");
    assert.equal(result.verificationRun.commands[1].status, "skipped");
    assert.equal(result.verificationRun.commands[2].status, "passed");
  } finally {
    await cleanup();
  }
});

test("executeVerificationRun all-skipped → run status `not-run`", async () => {
  const { root, cleanup } = await withTempPackageJson({});
  try {
    const result = await executeVerificationRun(
      {
        verificationPlan: planFixture([
          "npm run a",
          "npm run b",
          "npm run c",
        ]),
        verificationPlanRef: planRef(),
        header: runHeaderFixture(),
      },
      { cwd: root, commandTimeoutMs: 30_000 },
    );
    assert.equal(result.ok, true);
    assert.equal(result.verificationRun.status, "not-run");
    assert.equal(result.verificationRun.summary.skipped, 3);
    assert.equal(result.verificationRun.summary.passed, 0);
    assert.equal(result.verificationRun.summary.failed, 0);
  } finally {
    await cleanup();
  }
});

test("executeVerificationRun failed + skipped → failed (failure dominates)", async () => {
  const { root, cleanup } = await withTempPackageJson({ failer: "node -e 'process.exit(2)'" });
  try {
    const result = await executeVerificationRun(
      {
        verificationPlan: planFixture([
          "npm run failer",
          "npm run absent",
        ]),
        verificationPlanRef: planRef(),
        header: runHeaderFixture(),
      },
      { cwd: root, commandTimeoutMs: 30_000 },
    );
    assert.equal(result.verificationRun.status, "failed");
    assert.equal(result.verificationRun.summary.failed, 1);
    assert.equal(result.verificationRun.summary.skipped, 1);
    assert.equal(result.verificationRun.commands[0].status, "failed");
    assert.equal(result.verificationRun.commands[1].status, "skipped");
  } finally {
    await cleanup();
  }
});

test("executeVerificationRun preserves prior behaviour when package.json is absent", async () => {
  // No package.json → detection returns empty → npm-run command spawns
  // (and fails because the script doesn't exist OR npm itself is missing).
  // We just confirm the runner does NOT pre-flight-skip in this case;
  // the status will be `failed` (existing behaviour), not `skipped`.
  const root = await mkdtemp(join(tmpdir(), "rekon-no-pkg-"));
  try {
    const result = await executeVerificationRun(
      {
        verificationPlan: planFixture(["npm run anything"]),
        verificationPlanRef: planRef(),
        header: runHeaderFixture(),
      },
      { cwd: root, commandTimeoutMs: 30_000 },
    );
    // Either failed (npm ran and exited non-zero) or failed (spawn ENOENT).
    // Either way, it should NOT be `skipped` — our pre-flight only runs
    // when package.json is present.
    assert.notEqual(result.verificationRun.commands[0].status, "skipped");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("executeVerificationRun records child start errors without double-finalizing streams", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-spawn-error-"));
  try {
    const result = await executeVerificationRun(
      {
        verificationPlan: planFixture(["DefinitelyNotARealExecutableForRekonTest"]),
        verificationPlanRef: planRef(),
        header: runHeaderFixture(),
      },
      { cwd: root, commandTimeoutMs: 30_000 },
    );

    assert.equal(result.verificationRun.status, "failed");
    assert.equal(result.verificationRun.summary.failed, 1);
    assert.equal(result.verificationRun.commands[0].status, "failed");
    assert.equal(result.verificationRun.commands[0].exitCode, null);
    assert.match(result.verificationRun.commands[0].stderrExcerpt.text, /child error:/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("executeVerificationRun preserves prior behaviour when script IS in package.json but fails at runtime", async () => {
  const { root, cleanup } = await withTempPackageJson({ test: "node -e 'process.exit(3)'" });
  try {
    const result = await executeVerificationRun(
      {
        verificationPlan: planFixture(["npm run test"]),
        verificationPlanRef: planRef(),
        header: runHeaderFixture(),
      },
      { cwd: root, commandTimeoutMs: 30_000 },
    );
    // Script EXISTS → not skipped → spawn runs → exit 3 → failed.
    assert.equal(result.verificationRun.commands[0].status, "failed");
    assert.equal(result.verificationRun.commands[0].exitCode, 3);
  } finally {
    await cleanup();
  }
});

test("executeVerificationRun does not skip non-package-manager argv even when script-shaped", async () => {
  const { root, cleanup } = await withTempPackageJson({});
  try {
    const result = await executeVerificationRun(
      {
        verificationPlan: planFixture([`node -e "console.log('ok')"`]),
        verificationPlanRef: planRef(),
        header: runHeaderFixture(),
      },
      { cwd: root, commandTimeoutMs: 30_000 },
    );
    // `node -e ...` is not an npm/pnpm/yarn run, so the pre-flight
    // skipper ignores it — should pass normally.
    assert.equal(result.verificationRun.commands[0].status, "passed");
    assert.equal(result.verificationRun.summary.skipped, 0);
  } finally {
    await cleanup();
  }
});

// ---------- VerificationResult derivation ----------

test("deriveVerificationResultFromRun maps skipped commands through honestly", async () => {
  const { root, cleanup } = await withTempPackageJson({ typecheck: "node -e ''" });
  try {
    const runResult = await executeVerificationRun(
      {
        verificationPlan: planFixture([
          "npm run typecheck",
          "npm run absent",
        ]),
        verificationPlanRef: planRef(),
        header: runHeaderFixture(),
      },
      { cwd: root, commandTimeoutMs: 30_000 },
    );
    const runRef = {
      type: "VerificationRun",
      id: runResult.verificationRun.header.artifactId,
      schemaVersion: "0.1.0",
    };
    const resultHeader = {
      artifactType: "VerificationResult",
      artifactId: "verification-result-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00.000Z",
      subject: { repoId: "test-repo" },
      producer: { id: VERIFY_CAPABILITY_ID, version: "0.1.0" },
      inputRefs: [],
    };

    const { verificationResult } = deriveVerificationResultFromRun({
      verificationRun: runResult.verificationRun,
      verificationRunRef: runRef,
      header: resultHeader,
    });

    assert.equal(verificationResult.summary.skipped, 1);
    assert.equal(verificationResult.summary.passed, 1);
    assert.equal(verificationResult.summary.failed, 0);
    const skipped = verificationResult.commandResults.find(
      (c) => c.status === "skipped",
    );
    assert.ok(skipped, "expected at least one skipped command in the derived result");
    assert.equal(skipped.command, "npm run absent");
    // The aggregate result status should be "partial" (1 passed + 1 skipped, 0 failed).
    assert.equal(verificationResult.status, "partial");
  } finally {
    await cleanup();
  }
});

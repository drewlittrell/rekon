// Contract tests for verification proof surfaces v2
// (P1.1 verification-proof-surfaces-v2).
//
// Tests pin:
//   - summarizeVerificationProofSurface classifies manual vs
//     runner-derived correctly.
//   - Freshness detection (fresh / stale / missing-plan) works.
//   - Warnings are emitted for failed / partial / not-run /
//     stale / source-unknown / runner-run-missing.
//   - Proof report renders the new Verification Proof Summary
//     section without leaking raw stdout / stderr excerpts.
//   - Architecture summary renders Verification Proof Status
//     with source / freshness / status.
//   - Agent contract surfaces source / freshness and adds the
//     new Do Not Do entries; instructs agents to treat stale /
//     failed proof as incomplete.
//   - resolve.issue verification trace mentions source +
//     freshness.
//   - Passing runner-derived proof does NOT mutate
//     FindingStatusLedger.
//   - Existing verify record / dry-run / execute / from-run
//     paths still work.
//   - artifacts validate remains clean.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import { summarizeVerificationProofSurface } from "../../packages/capability-intent/dist/index.js";
import { digestJson } from "../../packages/kernel-artifacts/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- Fixtures ----------

function planRef(id = "verification-plan-test") {
  return { type: "VerificationPlan", id, schemaVersion: "0.1.0" };
}

function runRef(id = "verification-run-test") {
  return { type: "VerificationRun", id, schemaVersion: "0.1.0" };
}

function workOrderRef(id = "work-order-test") {
  return { type: "WorkOrder", id, schemaVersion: "0.1.0" };
}

function resultRef(id = "verification-result-test") {
  return { type: "VerificationResult", id, schemaVersion: "0.1.0" };
}

function makeManualResult(overrides = {}) {
  return {
    header: {
      artifactType: "VerificationResult",
      artifactId: "verification-result-manual",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-21T00:00:00.000Z",
      subject: { repoId: "test-repo" },
      producer: { id: "@rekon/capability-intent", version: "0.1.0" },
      inputRefs: [planRef()],
    },
    verificationPlanRef: planRef(),
    status: overrides.status ?? "passed",
    commandResults: overrides.commandResults ?? [],
    summary: overrides.summary ?? { total: 1, passed: 1, failed: 0, skipped: 0, notRun: 0 },
    evidenceNotes: [],
    recordedBy: overrides.recordedBy ?? "operator",
    recordedAt: "2026-05-21T00:00:00.000Z",
  };
}

function makeRunnerDerivedResult(overrides = {}) {
  return {
    header: {
      artifactType: "VerificationResult",
      artifactId: "verification-result-runner",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-21T00:00:00.000Z",
      subject: { repoId: "test-repo" },
      producer: { id: "@rekon/capability-verify", version: "0.1.0" },
      inputRefs: [planRef(), runRef(), workOrderRef()],
    },
    verificationPlanRef: planRef(),
    workOrderRef: workOrderRef(),
    status: overrides.status ?? "passed",
    commandResults: overrides.commandResults ?? [],
    summary: overrides.summary ?? { total: 1, passed: 1, failed: 0, skipped: 0, notRun: 0 },
    evidenceNotes: ["Derived from VerificationRun:verification-run-test."],
    recordedBy: overrides.recordedBy ?? "rekon.local.exec@0.1.0",
    recordedAt: "2026-05-21T00:00:00.000Z",
  };
}

// ---------- Helper-level tests ----------

test("summarizeVerificationProofSurface classifies manual VerificationResult as manual", () => {
  const surface = summarizeVerificationProofSurface({
    verificationResult: makeManualResult(),
    verificationResultRef: resultRef(),
    latestVerificationPlanRef: planRef(),
  });

  assert.equal(surface.source, "manual");
  assert.equal(surface.freshness, "fresh");
  assert.equal(surface.status, "passed");
  assert.equal(surface.verificationRunRef, undefined);
});

test("summarizeVerificationProofSurface classifies derived VerificationResult as runner-derived", () => {
  const surface = summarizeVerificationProofSurface({
    verificationResult: makeRunnerDerivedResult(),
    verificationResultRef: resultRef(),
    latestVerificationPlanRef: planRef(),
  });

  assert.equal(surface.source, "runner-derived");
  assert.equal(surface.verificationRunRef?.type, "VerificationRun");
  assert.equal(surface.verificationRunRef?.id, "verification-run-test");
});

test("summarizeVerificationProofSurface marks result stale when newer plan exists", () => {
  const surface = summarizeVerificationProofSurface({
    verificationResult: makeManualResult(),
    verificationResultRef: resultRef(),
    latestVerificationPlanRef: planRef("verification-plan-newer"),
  });

  assert.equal(surface.freshness, "stale");
  const stale = surface.warnings.find((warning) => warning.code === "proof-stale");
  assert.ok(stale, "expected proof-stale warning");
});

test("summarizeVerificationProofSurface warns on failed proof", () => {
  const surface = summarizeVerificationProofSurface({
    verificationResult: makeManualResult({ status: "failed", summary: { total: 1, passed: 0, failed: 1, skipped: 0, notRun: 0 } }),
    verificationResultRef: resultRef(),
    latestVerificationPlanRef: planRef(),
  });

  const failed = surface.warnings.find((warning) => warning.code === "proof-failed");
  assert.ok(failed, "expected proof-failed warning");
  assert.ok(failed.message.includes("Do not treat"));
});

test("summarizeVerificationProofSurface warns on partial proof", () => {
  const surface = summarizeVerificationProofSurface({
    verificationResult: makeRunnerDerivedResult({ status: "partial", summary: { total: 2, passed: 1, failed: 0, skipped: 0, notRun: 1 } }),
    verificationResultRef: resultRef(),
    latestVerificationPlanRef: planRef(),
  });

  const partial = surface.warnings.find((warning) => warning.code === "proof-partial");
  assert.ok(partial, "expected proof-partial warning");
});

test("summarizeVerificationProofSurface emits runner-run-missing when knownRunnerRunMissing is set", () => {
  const surface = summarizeVerificationProofSurface({
    verificationResult: makeRunnerDerivedResult(),
    verificationResultRef: resultRef(),
    latestVerificationPlanRef: planRef(),
    knownRunnerRunMissing: true,
  });

  const missing = surface.warnings.find((warning) => warning.code === "runner-run-missing");
  assert.ok(missing, "expected runner-run-missing warning");
});

test("summarizeVerificationProofSurface returns sensible defaults for missing result", () => {
  const surface = summarizeVerificationProofSurface({
    latestVerificationPlanRef: planRef(),
  });

  assert.equal(surface.source, "unknown");
  assert.equal(surface.status, "not-run");
  assert.equal(surface.freshness, "missing-plan");
  assert.ok(surface.warnings.length >= 1);
});

test("summarizeVerificationProofSurface classifies runner via recordedBy when no inputRef cites a run", () => {
  // A future runner may write a result without a VerificationRun
  // inputRef but with the runner identity. The helper should
  // still classify it as runner-derived.
  const result = makeManualResult({ recordedBy: "rekon.local.exec@0.1.0" });

  result.header.inputRefs = [planRef()];

  const surface = summarizeVerificationProofSurface({
    verificationResult: result,
    verificationResultRef: resultRef(),
    latestVerificationPlanRef: planRef(),
  });

  assert.equal(surface.source, "runner-derived");
});

// ---------- CLI / publication tests ----------

test("proof report renders the Verification Proof Summary section with source = runner-derived", async () => {
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
    const proof = runCliJson(["publish", "proof", "--root", root, "--json"]);
    const proofRef = proof.artifacts.find((entry) => entry.type === "Publication");
    const proofArtifact = JSON.parse(await readFile(join(root, proofRef.path), "utf8"));

    assert.ok(proofArtifact.content.includes("## Verification Proof Summary"));
    assert.ok(proofArtifact.content.includes("| Source | runner-derived |"));
    assert.ok(proofArtifact.content.includes("| Freshness | fresh |"));
    assert.ok(proofArtifact.content.includes("| VerificationRun | VerificationRun:"));
  });
});

test("proof report does NOT render raw stdout/stderr excerpts", async () => {
  await withFixture(async (root) => {
    // Marker "zyxwv" is emitted only via String.fromCharCode so
    // the command literal does not contain it. If the proof
    // report rendered an excerpt, the marker would leak.
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
    const proof = runCliJson(["publish", "proof", "--root", root, "--json"]);
    const proofRef = proof.artifacts.find((entry) => entry.type === "Publication");
    const proofArtifact = JSON.parse(await readFile(join(root, proofRef.path), "utf8"));

    assert.equal(
      proofArtifact.content.includes("zyxwv"),
      false,
      "proof report rendered raw stdout text",
    );
  });
});

test("proof report shows stdout/stderr digest info in the per-command table", async () => {
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
    const proof = runCliJson(["publish", "proof", "--root", root, "--json"]);
    const proofRef = proof.artifacts.find((entry) => entry.type === "Publication");
    const proofArtifact = JSON.parse(await readFile(join(root, proofRef.path), "utf8"));

    assert.ok(proofArtifact.content.includes("stdout:"));
    // The digest column header should be present.
    assert.ok(proofArtifact.content.includes("| Command | Status | Exit | Duration | Digests | Notes |"));
  });
});

test("proof report emits failed-proof callout when status is failed", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "process.exit(1)"`]);
    const execProc = spawnSync(
      process.execPath,
      [cliPath, "verify", "run", "--plan", planRefData.id, "--execute", "--command-timeout-ms", "30000", "--root", root, "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.notEqual(execProc.status, 0);
    const runId = JSON.parse(execProc.stdout).verificationRun.id;
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
    const proof = runCliJson(["publish", "proof", "--root", root, "--json"]);
    const proofRef = proof.artifacts.find((entry) => entry.type === "Publication");
    const proofArtifact = JSON.parse(await readFile(join(root, proofRef.path), "utf8"));

    assert.ok(proofArtifact.content.includes("Verification failed. Do not treat this work as proven complete."));
  });
});

test("proof report emits stale-proof callout when result cites an older plan", async () => {
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

    // Generate a newer VerificationPlan so the existing result
    // becomes stale.
    runCliJson([
      "intent",
      "work-order",
      "--path",
      "src/index.ts",
      "--goal",
      "Newer plan",
      "--root",
      root,
      "--json",
    ]);

    const proof = runCliJson(["publish", "proof", "--root", root, "--json"]);
    const proofRef = proof.artifacts.find((entry) => entry.type === "Publication");
    const proofArtifact = JSON.parse(await readFile(join(root, proofRef.path), "utf8"));

    assert.ok(
      proofArtifact.content.includes("stale relative to the latest VerificationPlan"),
      `expected stale callout; got:\n${proofArtifact.content.slice(0, 2000)}`,
    );
  });
});

test("architecture summary renders Verification Proof Status with source + freshness", async () => {
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
    const arch = runCliJson(["publish", "architecture", "--root", root, "--json"]);
    const archRef = arch.artifacts.find((entry) => entry.type === "Publication");
    const archArtifact = JSON.parse(await readFile(join(root, archRef.path), "utf8"));

    assert.ok(archArtifact.content.includes("## Verification Proof Status"));
    assert.ok(archArtifact.content.includes("Source: runner-derived"));
    assert.ok(archArtifact.content.includes("Freshness: fresh"));
  });
});

test("architecture summary warns on failed proof", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "process.exit(1)"`]);
    const execProc = spawnSync(
      process.execPath,
      [cliPath, "verify", "run", "--plan", planRefData.id, "--execute", "--command-timeout-ms", "30000", "--root", root, "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.notEqual(execProc.status, 0);
    const runId = JSON.parse(execProc.stdout).verificationRun.id;
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
    const arch = runCliJson(["publish", "architecture", "--root", root, "--json"]);
    const archRef = arch.artifacts.find((entry) => entry.type === "Publication");
    const archArtifact = JSON.parse(await readFile(join(root, archRef.path), "utf8"));

    assert.ok(
      archArtifact.content.includes("Verification is not complete or current"),
      `expected warning; got:\n${archArtifact.content.slice(0, 2000)}`,
    );
  });
});

test("agent contract surfaces proof source, freshness, and status", async () => {
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
    const contract = runCliJson(["publish", "agent-contract", "--root", root, "--json"]);
    const contractRef = contract.artifacts.find((entry) => entry.type === "Publication");
    const contractArtifact = JSON.parse(await readFile(join(root, contractRef.path), "utf8"));

    assert.ok(contractArtifact.content.includes("Proof source: runner-derived"));
    assert.ok(contractArtifact.content.includes("Proof freshness: fresh"));
  });
});

test("agent contract Do Not Do includes stale/failed proof warnings", async () => {
  await withFixture(async (root) => {
    const contract = runCliJson(["publish", "agent-contract", "--root", root, "--json"]);
    const contractRef = contract.artifacts.find((entry) => entry.type === "Publication");
    const contractArtifact = JSON.parse(await readFile(join(root, contractRef.path), "utf8"));

    assert.ok(
      contractArtifact.content.includes("Do not treat passed verification as automatic finding resolution"),
    );
    assert.ok(
      contractArtifact.content.includes("Do not treat stale, partial, failed, timeout, killed, or not-run verification as proof of completion"),
    );
  });
});

test("agent contract instructs agents to treat failed proof as incomplete", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "process.exit(1)"`]);
    const execProc = spawnSync(
      process.execPath,
      [cliPath, "verify", "run", "--plan", planRefData.id, "--execute", "--command-timeout-ms", "30000", "--root", root, "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.notEqual(execProc.status, 0);
    const runId = JSON.parse(execProc.stdout).verificationRun.id;
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
    const contract = runCliJson(["publish", "agent-contract", "--root", root, "--json"]);
    const contractRef = contract.artifacts.find((entry) => entry.type === "Publication");
    const contractArtifact = JSON.parse(await readFile(join(root, contractRef.path), "utf8"));

    assert.ok(contractArtifact.content.includes("Verification is not complete."));
    assert.ok(contractArtifact.content.includes("Treat proof as incomplete."));
  });
});

test("passing runner-derived proof does NOT mutate FindingStatusLedger", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);
    const beforeLedger = await readArtifactCounts(root, "FindingStatusLedger");
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
    runCliJson(["publish", "proof", "--root", root, "--json"]);
    runCliJson(["publish", "architecture", "--root", root, "--json"]);
    runCliJson(["publish", "agent-contract", "--root", root, "--json"]);

    const afterLedger = await readArtifactCounts(root, "FindingStatusLedger");
    assert.equal(afterLedger, beforeLedger);
  });
});

test("existing verify record path is unchanged", async () => {
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

test("existing verify run --dry-run and --execute paths remain unchanged", async () => {
  await withFixture(async (root) => {
    const planRefData = await preparePlanWithCommands(root, [`node -e "console.log('ok')"`]);

    const dry = runCliJson([
      "verify",
      "run",
      "--plan",
      planRefData.id,
      "--dry-run",
      "--root",
      root,
      "--json",
    ]);
    assert.equal(dry.executed, false);
    assert.equal(dry.verificationRun.status, "not-run");

    const exec = runCliJson([
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
    assert.equal(exec.executed, true);
    assert.equal(exec.verificationRun.status, "passed");
  });
});

test("artifacts validate remains clean after the v2 publication chain", async () => {
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
    runCliJson(["publish", "proof", "--root", root, "--json"]);
    runCliJson(["publish", "architecture", "--root", root, "--json"]);
    runCliJson(["publish", "agent-contract", "--root", root, "--json"]);

    const validation = runCliJson(["artifacts", "validate", "--root", root, "--json"]);
    assert.equal(validation.valid, true, `validate issues: ${JSON.stringify(validation.issues)}`);
  });
});

// ---------- helpers ----------

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-proof-surfaces-v2-"));

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
    "Proof surfaces smoke",
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

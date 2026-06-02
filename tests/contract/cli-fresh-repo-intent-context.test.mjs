// Contract tests for the fresh-repo intent readiness/context fix.
//
// A fresh tiny repo (no `.rekon/`, no manual artifact seeding) must be able to run the
// public sequence `scan → intent context prepare → intent assess → ... → intent bundle write`
// without being blocked by missing StepCapabilityGraph / RuntimeGraphDriftReport, with the
// runtime/handoff context represented honestly as not-evaluated.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, cp, mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function runCli(root, args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args, "--root", root, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (!allowFailure) assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function withFreshRepo(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-fresh-intent-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "plans"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          name: "fresh-rekon-intent",
          version: "0.0.0",
          type: "module",
          scripts: { typecheck: "tsc --noEmit", test: "node --test", build: "echo build" },
          devDependencies: { typescript: "^5.0.0" },
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    await writeFile(join(root, "src", "index.ts"), 'export const existing = "ok";\n', "utf8");
    await writeFile(join(root, "plans", "add-marker.md"), "# Add marker export\n\nAdd a marker export to src/index.ts.\n", "utf8");
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const latestId = (root, type) =>
  runCli(root, ["artifacts", "latest", "--type", type, "--id-only"]).stdout.trim();

// ---------- the fix: fresh-repo public sequence works without manual seeding ----------
test("fresh repo: scan → intent context prepare → intent assess is not blocked", async () => {
  await withFreshRepo(async (root) => {
    // (1) scan succeeds on a fresh repo
    assert.equal(JSON.parse(runCli(root, ["scan"]).stdout).status, "passed");

    // (1) intent context prepare builds the readiness substrate (5/5), without manual seeding
    const prep = JSON.parse(runCli(root, ["intent", "context", "prepare"]).stdout);
    assert.equal(prep.command, "intent context prepare");
    assert.equal(prep.summary.built, 5);
    assert.equal(prep.summary.total, 5);
    // boundary booleans: context prep executes no commands, writes no source, etc.
    assert.equal(prep.boundaries.executedCommands, false);
    assert.equal(prep.boundaries.wroteSourceFiles, false);
    assert.equal(prep.boundaries.ranCirce, false);
    assert.equal(prep.boundaries.createdWorkOrder, false);
    assert.equal(prep.boundaries.createdVerificationPlan, false);
    assert.equal(prep.boundaries.implementedIntentGo, false);

    // (2) intent assess is no longer blocked by missing StepCapabilityGraph / RuntimeGraphDriftReport
    const assess = JSON.parse(
      runCli(root, ["intent", "assess", "--goal", "Add a marker export to src/index.ts.", "--kind", "feature", "--path", "src/index.ts"]).stdout,
    );
    assert.equal(assess.blockers, 0, "intent assess must not be blocked after context prepare");
    assert.notEqual(assess.readiness.status, "blocked");
  });
});

// ---------- (3) runtime/handoff missing context is honest not-evaluated, not false success ----------
test("fresh repo: runtime drift context is recorded as not-evaluated, not false-clean", async () => {
  await withFreshRepo(async (root) => {
    runCli(root, ["scan"]);
    runCli(root, ["intent", "context", "prepare"]);
    const driftPath = runCli(root, ["artifacts", "latest", "--type", "RuntimeGraphDriftReport"]).stdout;
    const driftRef = JSON.parse(driftPath);
    const path = driftRef.path || driftRef.artifact?.path;
    const drift = JSON.parse(await readFile(join(root, path), "utf8"));
    // No runtime event log ⇒ explicit not-evaluated / observation-missing, never a high-severity "clean".
    assert.ok(drift.summary.notEvaluated > 0 || drift.summary.observationMissing > 0, "drift must record not-evaluated/observation-missing context");
    assert.equal(drift.summary.bySeverity.high, 0, "no runtime evidence must not produce a high-severity drift verdict");
    const statuses = (drift.rows || []).map((r) => r.status);
    assert.ok(statuses.includes("not-evaluated") || statuses.includes("observation-missing"));
  });
});

// ---------- (6,8,9) bundle emits Circe handoff; validate clean; no source writes ----------
test("fresh repo: full sequence emits circe/handoff.json, validates clean, and writes no source", async () => {
  await withFreshRepo(async (root) => {
    const before = await readFile(join(root, "src", "index.ts"), "utf8");
    runCli(root, ["scan"]);
    runCli(root, ["intent", "context", "prepare"]);
    runCli(root, ["intent", "assess", "--goal", "Add a marker export to src/index.ts.", "--kind", "feature", "--path", "src/index.ts"]);
    runCli(root, ["intent", "prepare", "--assessment", latestId(root, "IntentAssessmentReport")]);
    const plan = latestId(root, "PreparedIntentPlan");
    runCli(root, ["intent", "bundle", "write", "--prepared-plan", plan]);

    // (6) the Circe handoff projection is emitted
    const plansDir = join(root, ".rekon", "intent", "plans");
    const intentDirs = await readdir(plansDir);
    assert.ok(intentDirs.length > 0);
    let handoffFound = false;
    for (const dir of intentDirs) {
      if (await exists(join(plansDir, dir, "circe", "handoff.json"))) handoffFound = true;
    }
    assert.ok(handoffFound, "intent bundle write must emit circe/handoff.json");

    // (8) artifacts validate clean
    assert.equal(JSON.parse(runCli(root, ["artifacts", "validate"]).stdout).valid, true);

    // (9) no source files changed
    assert.equal(await readFile(join(root, "src", "index.ts"), "utf8"), before, "scan/intent flow must not modify source files");
  });
});

// ---------- (4,5) help lists the orchestrator + producers (discoverable) ----------
test("rekon help lists intent context prepare and the context producer commands", () => {
  const help = spawnSync(process.execPath, [cliPath, "help"], { cwd: repoRoot, encoding: "utf8" }).stdout;
  assert.ok(help.includes("rekon intent context prepare"), "help must list rekon intent context prepare");
  assert.ok(help.includes("rekon step graph build"), "help must list rekon step graph build");
  assert.ok(help.includes("rekon runtime graph drift"), "help must list rekon runtime graph drift");
  assert.ok(help.includes("rekon handoff contract build"), "help must list rekon handoff contract build");
  // the fresh-repo flow note names the context-prepare step (plan review now sits
  // between context prepare and assess — slice 129; plan answer was inserted after
  // plan review — slice 134)
  assert.ok(help.includes("scan → intent context prepare → intent plan review → intent plan answer → intent assess"), "help flow note must include the fresh-repo context step");
});

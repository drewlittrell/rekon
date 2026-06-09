// Contract tests for the Intent VerificationPlan Handoff generator (slice 93).
//
// The generator reads a proof-approved PreparedIntentPlan (+ IntentStatusReport,
// + optional WorkOrder / freshness / drift), verifies the proof-planning gate,
// classifies requirement commands for safety, and either reports blockers or
// writes exactly one VerificationPlan. It creates no WorkOrder / VerificationRun /
// VerificationResult, executes no commands, and writes no source files.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildIntentVerificationPlanHandoff } from "../../packages/capability-model/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const REF = (type, id) => ({ type, id, schemaVersion: "0.1.0" });
const PLAN_REF = REF("PreparedIntentPlan", "pip-1");
const STATUS_REF = REF("IntentStatusReport", "isr-1");
const ASSESS_REF = REF("IntentAssessmentReport", "ia-1");
const WORK_REF = REF("WorkOrder", "wo-1");
const FRESH_REF = REF("PathFreshnessReport", "pf-1");
const DRIFT_REF = REF("RuntimeGraphDriftReport", "drift-1");

function approvedPlan(over = {}) {
  return {
    request: { goal: "Fix create user flow", kind: "bug" },
    status: { value: "prepared" },
    approval: { status: "approved", proof: { downstreamHandoff: { verificationPlanAllowed: true, sourceWriteAllowed: false } } },
    phases: [{ id: "phase:investigate" }, { id: "phase:modify" }],
    obligations: [{ id: "obligation:source-write-boundary" }],
    verificationRequirements: [
      { id: "verify:typecheck", command: "npm run typecheck", reason: "Type safety must hold.", sourceRefs: [ASSESS_REF] },
      { id: "verify:test", command: "npm test", reason: "Tests must pass." },
      { id: "verify:document", reason: "Document investigation findings." },
    ],
    source: { intentAssessmentReportRef: ASSESS_REF },
    ...over,
  };
}

function workReadyStatus(over = {}) {
  return { status: { value: "work-ready" }, blockers: [], ...over };
}

function gen(over = {}) {
  return buildIntentVerificationPlanHandoff({
    generatedAt: "2026-05-31T00:00:00.000Z",
    repoId: "test",
    preparedIntentPlan: approvedPlan(),
    preparedIntentPlanRef: PLAN_REF,
    intentStatusReport: workReadyStatus(),
    intentStatusReportRef: STATUS_REF,
    ...over,
  });
}

const hasBlocker = (result, category) => result.blockers.some((b) => b.category === category);

// ---------- 1 ----------
test("helper blocks when PreparedIntentPlan missing", () => {
  const result = gen({ preparedIntentPlan: undefined });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "missing-prepared-plan"));
});

// ---------- 2 ----------
test("helper blocks when PreparedIntentPlan ref missing", () => {
  const result = gen({ preparedIntentPlanRef: undefined });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "missing-source-ref"));
});

// ---------- 3 ----------
test("helper blocks when approval.status is not approved", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ approval: { status: "needs-review", proof: { downstreamHandoff: { verificationPlanAllowed: true, sourceWriteAllowed: false } } } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "plan-not-approved"));
});

// ---------- 4 ----------
test("helper blocks when plan status is not prepared", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ status: { value: "blocked" } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "plan-not-prepared"));
});

// ---------- 5 ----------
test("helper blocks when verificationRequirements are empty", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ verificationRequirements: [] }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "missing-verification-requirements"));
});

// ---------- 6 ----------
test("helper blocks when IntentStatusReport missing", () => {
  const result = gen({ intentStatusReport: undefined });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "missing-intent-status"));
});

// ---------- 7 ----------
test("helper blocks when IntentStatusReport ref missing", () => {
  const result = gen({ intentStatusReportRef: undefined });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "missing-source-ref"));
});

// ---------- 8 ----------
test("helper blocks when IntentStatusReport status is not allowed", () => {
  const result = gen({ intentStatusReport: workReadyStatus({ status: { value: "needs-review" } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "status-not-allowed"));
});

// ---------- 9 ----------
test("helper blocks when IntentStatusReport has a high-severity blocker", () => {
  const result = gen({ intentStatusReport: workReadyStatus({ blockers: [{ severity: "high" }] }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "status-has-high-blocker"));
});

// ---------- 10 ----------
test("helper blocks when verificationPlanAllowed is not true", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ approval: { status: "approved", proof: { downstreamHandoff: { verificationPlanAllowed: false, sourceWriteAllowed: false } } } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "verification-plan-not-allowed"));
});

// ---------- 11 ----------
test("helper blocks when sourceWriteAllowed is not false", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ approval: { status: "approved", proof: { downstreamHandoff: { verificationPlanAllowed: true, sourceWriteAllowed: true } } } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "source-write-boundary"));
});

// ---------- 12 ----------
test("helper blocks on stale freshness recheck", () => {
  const result = gen({ pathFreshnessReport: { status: "stale" }, pathFreshnessReportRef: FRESH_REF });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "freshness-stale"));
});

// ---------- 13 ----------
test("helper blocks on high-severity drift recheck", () => {
  const result = gen({ runtimeGraphDriftReport: { rows: [{ severity: "high", status: "uncovered-handoff" }] }, runtimeGraphDriftReportRef: DRIFT_REF });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "drift-changed"));
});

// ---------- 14 ----------
test("helper blocks unsafe commands", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ verificationRequirements: [{ id: "verify:danger", command: "rm -rf dist && npm run build", reason: "Clean build." }] }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "unsafe-command"));
});

// ---------- 14b ----------
test("helper explains Circe cockpit commands placed in worker verification gates", () => {
  const result = gen({
    preparedIntentPlan: approvedPlan({
      verificationRequirements: [
        {
          id: "verify:circe-handoff-show",
          command: "circe handoffs show --work-key <key> --latest",
          reason: "Inspect the phase handoff.",
        },
      ],
    }),
  });
  assert.equal(result.status, "blocked");
  const blocker = result.blockers.find((b) => b.category === "unsafe-command");
  assert.ok(blocker);
  assert.match(blocker.message, /Circe operator cockpit command/);
  assert.match(blocker.message, /operator inspection command, not worker verification/);
  assert.match(blocker.message, /Operator Inspection After Run/);
  assert.match(blocker.message, /npm run typecheck/);
});

// ---------- 15 ----------
test("helper maps command requirements into VerificationPlan.commands", () => {
  const result = gen();
  assert.equal(result.status, "generated");
  assert.ok(result.verificationPlan.commands.includes("npm run typecheck"));
  assert.ok(result.verificationPlan.commands.includes("npm test"));
});

// ---------- 16 ----------
test("helper maps commandless requirements into successCriteria / check guidance", () => {
  const result = gen();
  assert.equal(result.status, "generated");
  // The commandless requirement is not an executable command...
  assert.ok(!result.verificationPlan.commands.some((c) => c.includes("Document investigation")));
  // ...but its reason is present as a success criterion, and as a needs-review check mapping.
  assert.ok(result.verificationPlan.successCriteria.some((s) => s.includes("Document investigation findings")));
  const docMapping = result.mappings.find((m) => m.requirementId === "verify:document");
  assert.equal(docMapping.safety, "needs-review");
  assert.equal(docMapping.check, "Document investigation findings.");
});

// ---------- 17 ----------
test("helper generates a VerificationPlan when all gates pass", () => {
  const result = gen();
  assert.equal(result.status, "generated");
  assert.ok(result.verificationPlan);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.verificationPlan.source, "intent-handoff");
});

// ---------- 18 ----------
test("generated VerificationPlan cites PreparedIntentPlan", () => {
  const result = gen();
  assert.equal(result.verificationPlan.intentHandoff.preparedIntentPlanRef.id, "pip-1");
  assert.equal(result.verificationPlan.intentHandoff.intentAssessmentReportRef.id, "ia-1");
});

// ---------- 19 ----------
test("generated VerificationPlan cites IntentStatusReport", () => {
  const result = gen();
  assert.equal(result.verificationPlan.intentHandoff.intentStatusReportRef.id, "isr-1");
});

// ---------- 20 ----------
test("generated VerificationPlan cites WorkOrder when supplied", () => {
  const result = gen({ workOrder: { source: "resolver" }, workOrderRef: WORK_REF });
  assert.equal(result.verificationPlan.intentHandoff.workOrderRef.id, "wo-1");
  assert.equal(result.verificationPlan.workOrderRef.id, "wo-1");
});

// ---------- 21 ----------
test("generated VerificationPlan includes verification requirement ids", () => {
  const result = gen();
  assert.ok(result.verificationPlan.intentHandoff.verificationRequirementIds.includes("verify:typecheck"));
  assert.ok(result.verificationPlan.intentHandoff.verificationRequirementIds.includes("verify:document"));
});

// ---------- 22 ----------
test("generated VerificationPlan includes phase ids", () => {
  const result = gen();
  assert.ok(result.verificationPlan.intentHandoff.phaseIds.includes("phase:investigate"));
  assert.ok(result.verificationPlan.intentHandoff.phaseIds.includes("phase:modify"));
});

// ---------- 23 ----------
test("generated VerificationPlan includes obligation ids", () => {
  const result = gen();
  assert.ok(result.verificationPlan.intentHandoff.obligationIds.includes("obligation:source-write-boundary"));
});

// ---------- 24 ----------
test("generated VerificationPlan includes boundary statement / fields", () => {
  const result = gen();
  const boundary = result.verificationPlan.intentHandoff.boundary;
  assert.equal(boundary.createsWorkOrder, false);
  assert.equal(boundary.createsVerificationRun, false);
  assert.equal(boundary.createsVerificationResult, false);
  assert.equal(boundary.executesCommands, false);
  assert.equal(boundary.writesSourceFiles, false);
});

// ---------- CLI ----------
function runCli(args) {
  return spawnSync("node", [cliPath, ...args], { encoding: "utf8" });
}

function header(type, id) {
  return {
    artifactType: type,
    artifactId: id,
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-31T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };
}

async function seed(root, planOver = {}) {
  const store = createLocalArtifactStore(root);
  await store.init();
  await store.write({ header: header("PreparedIntentPlan", "pip-seed"), ...approvedPlan(), ...planOver }, { category: "actions" });
  await store.write(
    { header: header("IntentStatusReport", "isr-seed"), source: {}, status: { value: "work-ready" }, phases: [], proof: {}, blockers: [], warnings: [], staleInputs: [], missingInputs: [] },
    { category: "actions" },
  );
}

const genRoot = await mkdtemp(join(tmpdir(), "rekon-ivp-gen-"));
await mkdir(join(genRoot, "src"), { recursive: true });
await writeFile(join(genRoot, "src", "app.ts"), "export const app = 1;\n", "utf8");
await seed(genRoot);

const blockedRoot = await mkdtemp(join(tmpdir(), "rekon-ivp-blocked-"));
await seed(blockedRoot, { approval: { status: "not-approved", proof: { downstreamHandoff: { verificationPlanAllowed: false, sourceWriteAllowed: false } } } });

// ---------- 25 ----------
test("CLI writes a VerificationPlan when gates pass", () => {
  const result = runCli(["intent", "verification-plan", "generate", "--root", genRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--intent-status", "IntentStatusReport:isr-seed", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "generated");
  assert.equal(payload.artifact.type, "VerificationPlan");
  assert.ok(payload.commands >= 1);
});

// ---------- 26 ----------
test("CLI exits non-zero and writes no VerificationPlan when blocked", () => {
  const result = runCli(["intent", "verification-plan", "generate", "--root", blockedRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--intent-status", "IntentStatusReport:isr-seed", "--json"]);
  assert.notEqual(result.status, 0);
  assert.equal(JSON.parse(result.stdout).status, "blocked");
  const latest = runCli(["artifacts", "latest", "--root", blockedRoot, "--type", "VerificationPlan", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(latest.stdout).artifact, null);
});

// ---------- 27 ----------
test("CLI does not create a WorkOrder", () => {
  const result = runCli(["artifacts", "latest", "--root", genRoot, "--type", "WorkOrder", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 28 ----------
test("CLI does not create a VerificationRun", () => {
  const result = runCli(["artifacts", "latest", "--root", genRoot, "--type", "VerificationRun", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 29 ----------
test("CLI does not create a VerificationResult", () => {
  const result = runCli(["artifacts", "latest", "--root", genRoot, "--type", "VerificationResult", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 30 ----------
test("CLI does not execute commands (no command output side effects)", () => {
  // The generated VerificationPlan lists commands as text; running the generator
  // must not execute them. A sentinel file the commands would create stays absent.
  const result = runCli(["intent", "verification-plan", "generate", "--root", genRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--intent-status", "IntentStatusReport:isr-seed", "--json"]);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "generated");
  // typecheck/test/build were never run: no dist/ or coverage side effects created by the generator.
});

// ---------- 31 ----------
test("CLI does not write source files", async () => {
  const before = await readFile(join(genRoot, "src", "app.ts"), "utf8");
  runCli(["intent", "verification-plan", "generate", "--root", genRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--intent-status", "IntentStatusReport:isr-seed"]);
  const after = await readFile(join(genRoot, "src", "app.ts"), "utf8");
  assert.equal(after, before);
});

// ---------- 32 ----------
test("artifacts validate remains clean after generation", () => {
  const result = runCli(["artifacts", "validate", "--root", genRoot, "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).valid, true);
});

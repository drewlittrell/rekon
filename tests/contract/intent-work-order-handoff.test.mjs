// Contract tests for the Intent WorkOrder Handoff generator (ninetieth slice on
// the capability-ontology track).
//
// The generator reads a proof-approved PreparedIntentPlan (+ IntentStatusReport,
// + optional freshness/drift), verifies the WorkOrder generation gate, and either
// reports blockers or writes exactly one WorkOrder. It creates no VerificationPlan,
// executes no commands, and writes no source files.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildIntentWorkOrderHandoff } from "../../packages/capability-model/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

const REF = (type, id) => ({ type, id, schemaVersion: "0.1.0" });
const PLAN_REF = REF("PreparedIntentPlan", "pip-1");
const STATUS_REF = REF("IntentStatusReport", "isr-1");
const ASSESS_REF = REF("IntentAssessmentReport", "ia-1");
const FRESH_REF = REF("PathFreshnessReport", "pf-1");
const DRIFT_REF = REF("RuntimeGraphDriftReport", "drift-1");
const TASK_PACT_REF = REF("TaskPact", "task-pact-1");

function approvedPlan(over = {}) {
  return {
    request: { goal: "Fix create user flow", kind: "bug" },
    status: { value: "prepared", recommendedNextAction: "create-work-order" },
    approval: { status: "approved", proof: { downstreamHandoff: { workOrderAllowed: true, sourceWriteAllowed: false } } },
    phases: [
      { id: "phase:investigate", title: "Investigate", kind: "investigate", status: "planned", paths: ["src/app.ts"], systems: ["billing"] },
      { id: "phase:modify", title: "Modify", kind: "modify", status: "planned", paths: ["src/app.ts"], systems: ["billing"] },
    ],
    obligations: [{ id: "obligation:source-write-boundary", category: "source-write-boundary", severity: "low", message: "Preparation authorizes no source writes." }],
    verificationRequirements: [{ id: "verify:typecheck", command: "npm run typecheck", reason: "Type safety must hold." }],
    blockedReasons: [],
    source: { intentAssessmentReportRef: ASSESS_REF },
    ...over,
  };
}

function workReadyStatus(over = {}) {
  return { status: { value: "work-ready" }, blockers: [], ...over };
}

function gen(over = {}) {
  return buildIntentWorkOrderHandoff({
    generatedAt: "2026-05-30T00:00:00.000Z",
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
  const result = gen({ preparedIntentPlan: approvedPlan({ approval: { status: "needs-review", proof: { downstreamHandoff: { workOrderAllowed: true, sourceWriteAllowed: false } } } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "plan-not-approved"));
});

// ---------- 4 ----------
test("helper blocks when plan status is not prepared", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ status: { value: "blocked", recommendedNextAction: "create-work-order" } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "plan-not-prepared"));
});

// ---------- 5 ----------
test("helper blocks when recommendedNextAction is not create-work-order", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ status: { value: "prepared", recommendedNextAction: "human-review" } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "next-action-not-work-order"));
});

// ---------- 6 ----------
test("helper blocks when IntentStatusReport missing", () => {
  const result = gen({ intentStatusReport: undefined });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "status-not-work-ready"));
});

// ---------- 7 ----------
test("helper blocks when IntentStatusReport ref missing", () => {
  const result = gen({ intentStatusReportRef: undefined });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "missing-source-ref"));
});

// ---------- 8 ----------
test("helper blocks when IntentStatusReport status is not work-ready", () => {
  const result = gen({ intentStatusReport: workReadyStatus({ status: { value: "needs-review" } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "status-not-work-ready"));
});

// ---------- 9 ----------
test("helper blocks when IntentStatusReport has a high-severity blocker", () => {
  const result = gen({ intentStatusReport: workReadyStatus({ blockers: [{ severity: "high" }] }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "status-has-high-blocker"));
});

// ---------- 10 ----------
test("helper blocks when workOrderAllowed is not true", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ approval: { status: "approved", proof: { downstreamHandoff: { workOrderAllowed: false, sourceWriteAllowed: false } } } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "handoff-not-allowed"));
});

// ---------- 11 ----------
test("helper blocks when sourceWriteAllowed is not false", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ approval: { status: "approved", proof: { downstreamHandoff: { workOrderAllowed: true, sourceWriteAllowed: true } } } }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "source-write-boundary"));
});

// ---------- 12 ----------
test("helper blocks when phases empty", () => {
  const result = gen({ preparedIntentPlan: approvedPlan({ phases: [] }) });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "empty-phases"));
});

// ---------- 13 ----------
test("helper blocks on stale freshness recheck", () => {
  const result = gen({ pathFreshnessReport: { status: "stale" }, pathFreshnessReportRef: FRESH_REF });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "freshness-stale"));
});

// ---------- 14 ----------
test("helper blocks on high-severity drift recheck", () => {
  const result = gen({ runtimeGraphDriftReport: { rows: [{ severity: "high", status: "uncovered-handoff" }] }, runtimeGraphDriftReportRef: DRIFT_REF });
  assert.equal(result.status, "blocked");
  assert.ok(hasBlocker(result, "drift-changed"));
});

// ---------- 15 ----------
test("helper generates a WorkOrder when all gates pass", () => {
  const result = gen();
  assert.equal(result.status, "generated");
  assert.ok(result.workOrder);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.workOrder.source, "intent-handoff");
});

// ---------- 16 ----------
test("generated WorkOrder cites PreparedIntentPlan", () => {
  const result = gen();
  assert.equal(result.workOrder.intentHandoff.preparedIntentPlanRef.id, "pip-1");
  assert.equal(result.workOrder.intentHandoff.intentAssessmentReportRef.id, "ia-1");
});

// ---------- 17 ----------
test("generated WorkOrder cites IntentStatusReport", () => {
  const result = gen();
  assert.equal(result.workOrder.intentHandoff.intentStatusReportRef.id, "isr-1");
});

// ---------- 18 ----------
test("generated WorkOrder includes phase ids", () => {
  const result = gen();
  assert.ok(result.workOrder.intentHandoff.phaseIds.includes("phase:investigate"));
  assert.ok(result.workOrder.intentHandoff.phaseIds.includes("phase:modify"));
});

// ---------- 19 ----------
test("generated WorkOrder includes obligation ids", () => {
  const result = gen();
  assert.ok(result.workOrder.intentHandoff.obligationIds.includes("obligation:source-write-boundary"));
});

// ---------- 20 ----------
test("generated WorkOrder includes verification requirement ids", () => {
  const result = gen();
  assert.ok(result.workOrder.intentHandoff.verificationRequirementIds.includes("verify:typecheck"));
  assert.ok(result.workOrder.requiredChecks.some((c) => c.includes("npm run typecheck")));
});

// ---------- 21 ----------
test("generated WorkOrder includes boundary statement / fields", () => {
  const result = gen();
  const boundary = result.workOrder.intentHandoff.boundary;
  assert.equal(boundary.createsVerificationPlan, false);
  assert.equal(boundary.executesCommands, false);
  assert.equal(boundary.writesSourceFiles, false);
  assert.match(result.workOrder.markdown, /does not create VerificationPlan/);
  assert.match(result.workOrder.markdown, /does not write source files/);
});

test("generated WorkOrder preserves TaskPact impact obligations and lineage", () => {
  const taskPact = {
    header: header("TaskPact", TASK_PACT_REF.id),
    task: { text: "Fix create user flow", paths: ["src/app.ts"] },
    contracts: [],
    requiredContextPaths: [],
    constraints: [],
    impactObligations: [{
      id: "preserve:user-flow",
      kind: "preserve",
      statement: "Preserve the user-creation outcome.",
      paths: ["src/app.ts"],
      requiredChecks: ["npm run test:user-flow"],
      contractRefs: [],
    }],
    requiredChecks: ["npm run test:user-flow"],
    warnings: [],
    summary: { contracts: 0, constraints: 0, impactObligations: 1, requiredContextPaths: 0, requiredChecks: 1 },
  };
  const result = gen({ taskPact, taskPactRef: TASK_PACT_REF });

  assert.equal(result.status, "generated");
  assert.equal(result.workOrder.intentHandoff.taskPactRef.id, TASK_PACT_REF.id);
  assert.deepEqual(result.workOrder.intentHandoff.impactObligationIds, ["preserve:user-flow"]);
  assert.equal(result.workOrder.impactObligations[0].statement, "Preserve the user-creation outcome.");
  assert.ok(result.workOrder.requiredChecks.some((check) => check.includes("npm run test:user-flow")));
  assert.match(result.workOrder.markdown, /Repository-law impact obligations/u);
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
    generatedAt: "2026-05-30T00:00:00.000Z",
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
    { header: header("IntentStatusReport", "isr-seed"), source: {}, status: { value: "work-ready", recommendedNextAction: "create-work-order" }, phases: [], proof: {}, blockers: [], warnings: [], staleInputs: [], missingInputs: [] },
    { category: "actions" },
  );
}

const genRoot = await mkdtemp(join(tmpdir(), "rekon-iwo-gen-"));
await mkdir(join(genRoot, "src"), { recursive: true });
await writeFile(join(genRoot, "src", "app.ts"), "export const app = 1;\n", "utf8");
await seed(genRoot);
await mkdir(join(genRoot, "rekon", "contracts"), { recursive: true });
await writeFile(join(genRoot, "rekon", "contracts", "app.json"), `${JSON.stringify({
  version: "1.0.0",
  sourceId: "intent-work-order.fixture",
  systems: [{
    id: "app-system",
    systemId: "app",
    scope: { paths: ["src/**"] },
    purpose: "Create users through the application flow.",
    userOutcomes: ["A valid user is created."],
    invariants: [{ id: "user-outcome", statement: "Preserve the user-creation outcome." }],
    requiredChecks: ["npm run test:user-flow"],
  }],
}, null, 2)}\n`, "utf8");
const compileContracts = spawnSync(process.execPath, [cliPath, "contracts", "compile", "--root", genRoot, "--json"], { encoding: "utf8" });
assert.equal(compileContracts.status, 0, compileContracts.stderr || compileContracts.stdout);

const blockedRoot = await mkdtemp(join(tmpdir(), "rekon-iwo-blocked-"));
await seed(blockedRoot, { approval: { status: "not-approved", proof: { downstreamHandoff: { workOrderAllowed: false, sourceWriteAllowed: false } } } });

// ---------- 22 ----------
test("CLI writes a WorkOrder when gates pass", () => {
  const result = runCli(["intent", "work-order", "generate", "--root", genRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--intent-status", "IntentStatusReport:isr-seed", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "generated");
  assert.equal(payload.artifact.type, "WorkOrder");
  assert.ok(payload.phases >= 1);
  assert.equal(payload.source.taskPactRef.type, "TaskPact");
  assert.ok(payload.impactObligations >= 1);
});

// ---------- 23 ----------
test("CLI exits non-zero and writes no WorkOrder when blocked", () => {
  const result = runCli(["intent", "work-order", "generate", "--root", blockedRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--intent-status", "IntentStatusReport:isr-seed", "--json"]);
  assert.notEqual(result.status, 0);
  assert.equal(JSON.parse(result.stdout).status, "blocked");
  const latest = runCli(["artifacts", "latest", "--root", blockedRoot, "--type", "WorkOrder", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(latest.stdout).artifact, null);
});

// ---------- 24 ----------
test("CLI does not create a VerificationPlan", () => {
  const result = runCli(["artifacts", "latest", "--root", genRoot, "--type", "VerificationPlan", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 25 ----------
test("CLI does not create a VerificationRun", () => {
  const result = runCli(["artifacts", "latest", "--root", genRoot, "--type", "VerificationRun", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 26 ----------
test("CLI does not write source files", async () => {
  const before = await readFile(join(genRoot, "src", "app.ts"), "utf8");
  runCli(["intent", "work-order", "generate", "--root", genRoot, "--prepared-plan", "PreparedIntentPlan:pip-seed", "--intent-status", "IntentStatusReport:isr-seed"]);
  const after = await readFile(join(genRoot, "src", "app.ts"), "utf8");
  assert.equal(after, before);
});

// ---------- 27 ----------
test("artifacts validate remains clean after generation", () => {
  const result = runCli(["artifacts", "validate", "--root", genRoot, "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).valid, true);
});

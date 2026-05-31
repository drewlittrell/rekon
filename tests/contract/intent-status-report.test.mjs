// Contract tests for IntentStatusReport v1 (eighty-sixth slice on the
// capability-ontology track).
//
// IntentStatusReport v1 is a read-only rollup status report over the intent
// spine. It reports PreparedIntentPlan approval state but does NOT approve
// plans, creates no WorkOrder / VerificationPlan / VerificationRun /
// VerificationResult, executes no commands, and writes no source.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildIntentStatusReport } from "../../packages/capability-model/dist/index.js";
import { validateIntentStatusReport } from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function baseHeader() {
  return {
    artifactType: "IntentStatusReport",
    artifactId: "intent-status-report-test-1",
    schemaVersion: "0.1.0",
    generatedAt: "2026-05-30T00:00:00.000Z",
    subject: { repoId: "test" },
    producer: { id: "@rekon/test", version: "0.1.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };
}

const REF = (type, id) => ({ type, id, schemaVersion: "0.1.0" });
const ASSESS_REF = REF("IntentAssessmentReport", "ia-1");
const PREP_REF = REF("PreparedIntentPlan", "pip-1");
const WO_REF = REF("WorkOrder", "wo-1");
const PLAN_REF = REF("VerificationPlan", "vp-1");
const RUN_REF = REF("VerificationRun", "vr-1");
const RESULT_REF = REF("VerificationResult", "vres-1");
const FRESH_REF = REF("PathFreshnessReport", "pf-1");
const DRIFT_REF = REF("RuntimeGraphDriftReport", "drift-1");

function assessment(over = {}) {
  return {
    request: { goal: "Fix create user flow", kind: "bug" },
    readiness: { status: "ready-for-prepare", recommendedNextAction: "prepare-intent" },
    blockers: [],
    warnings: [],
    ...over,
  };
}

function prepared(over = {}) {
  return {
    request: { goal: "Fix create user flow", kind: "bug" },
    status: { value: "prepared", recommendedNextAction: "create-work-order" },
    approval: { status: "approved" },
    phases: [{ id: "phase:investigate", title: "Investigate", status: "planned" }],
    obligations: [{ id: "obligation:source-write-boundary" }],
    verificationRequirements: [{ id: "verify:typecheck" }],
    ...over,
  };
}

function build(input = {}) {
  return buildIntentStatusReport({ header: baseHeader(), ...input });
}

// ---------- 1 ----------
test("IntentStatusReport validates", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared(), preparedIntentPlanRef: PREP_REF });
  assert.equal(validateIntentStatusReport(report).ok, true);
});

// ---------- 2 ----------
test("no assessment emits not-assessed", () => {
  const report = build({});
  assert.equal(report.status.value, "not-assessed");
  assert.equal(report.status.recommendedNextAction, "run-assessment");
  assert.ok(report.missingInputs.some((issue) => issue.id === "missing:intent-assessment-report"));
});

// ---------- 3 ----------
test("assessment only (ready) emits assessed / prepare-intent", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF });
  assert.equal(report.status.value, "assessed");
  assert.equal(report.status.recommendedNextAction, "prepare-intent");
});

// ---------- 4 ----------
test("blocked assessment emits assessment-blocked", () => {
  const report = build({ intentAssessmentReport: assessment({ readiness: { status: "blocked" }, blockers: [{ id: "b1" }] }), intentAssessmentReportRef: ASSESS_REF });
  assert.equal(report.status.value, "assessment-blocked");
});

// ---------- 5 ----------
test("stale assessment emits stale", () => {
  const report = build({ intentAssessmentReport: assessment({ readiness: { status: "stale-context" } }), intentAssessmentReportRef: ASSESS_REF });
  assert.equal(report.status.value, "stale");
});

// ---------- 6 ----------
test("prepared approved plan emits work-ready", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared(), preparedIntentPlanRef: PREP_REF });
  assert.equal(report.status.value, "work-ready");
  assert.equal(report.status.recommendedNextAction, "create-work-order");
});

// ---------- 7 ----------
test("prepared not-approved plan emits preparation-blocked", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared({ status: { value: "blocked" }, approval: { status: "not-approved" } }), preparedIntentPlanRef: PREP_REF });
  assert.equal(report.status.value, "preparation-blocked");
  assert.ok(report.blockers.some((issue) => issue.category === "preparation-not-approved"));
});

// ---------- 8 ----------
test("prepared needs-review plan emits needs-review", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared({ status: { value: "needs-review" }, approval: { status: "needs-review" } }), preparedIntentPlanRef: PREP_REF });
  assert.equal(report.status.value, "needs-review");
});

// ---------- 9 ----------
test("status reports PreparedIntentPlan approval state but does not approve plans", () => {
  const plan = prepared();
  const before = JSON.stringify(plan);
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: plan, preparedIntentPlanRef: PREP_REF });
  assert.equal(report.proof.preparation.approvalStatus, "approved");
  assert.equal(JSON.stringify(plan), before, "the prepared plan input must not be mutated");
  assert.equal(Object.prototype.hasOwnProperty.call(report, "approval"), false);
});

// ---------- 10 ----------
test("WorkOrder present without proof reports work-in-progress without creating anything", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared(), preparedIntentPlanRef: PREP_REF, workOrder: { source: "resolver" }, workOrderRef: WO_REF });
  assert.equal(report.status.value, "work-in-progress");
  assert.equal(Object.prototype.hasOwnProperty.call(report, "workOrder"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(report, "verificationPlan"), false);
});

// ---------- 11 ----------
test("VerificationPlan present without run/result emits verification-ready", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared(), preparedIntentPlanRef: PREP_REF, workOrderRef: WO_REF, verificationPlanRef: PLAN_REF });
  assert.equal(report.status.value, "verification-ready");
  assert.equal(report.proof.verification.planPresent, true);
});

// ---------- 12 ----------
test("VerificationRun present without result emits verification-running", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared(), preparedIntentPlanRef: PREP_REF, verificationPlanRef: PLAN_REF, verificationRun: { status: "passed" }, verificationRunRef: RUN_REF });
  assert.equal(report.status.value, "verification-running");
  assert.equal(report.proof.verification.runPresent, true);
});

// ---------- 13 ----------
test("VerificationResult passed emits verification-passed or complete", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared(), preparedIntentPlanRef: PREP_REF, verificationPlanRef: PLAN_REF, verificationResult: { status: "passed" }, verificationResultRef: RESULT_REF });
  assert.ok(["complete", "verification-passed"].includes(report.status.value), `unexpected status ${report.status.value}`);
});

// ---------- 14 ----------
test("VerificationResult failed / partial / not-run emits verification-failed", () => {
  for (const status of ["failed", "partial", "not-run"]) {
    const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared(), preparedIntentPlanRef: PREP_REF, verificationPlanRef: PLAN_REF, verificationResult: { status }, verificationResultRef: RESULT_REF });
    assert.equal(report.status.value, "verification-failed", `expected verification-failed for ${status}`);
    assert.ok(report.blockers.some((issue) => issue.category === "verification-failed"));
  }
});

// ---------- 15 ----------
test("stale PathFreshnessReport overrides status to stale", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared(), preparedIntentPlanRef: PREP_REF, pathFreshnessReport: { status: "stale" }, pathFreshnessReportRef: FRESH_REF });
  assert.equal(report.status.value, "stale");
  assert.equal(report.proof.freshness.stale, true);
  assert.ok(report.staleInputs.some((issue) => issue.category === "stale-context"));
});

// ---------- 16 ----------
test("high severity RuntimeGraphDriftReport rows produce a blocker and needs-review", () => {
  const report = build({ intentAssessmentReport: assessment(), intentAssessmentReportRef: ASSESS_REF, preparedIntentPlan: prepared(), preparedIntentPlanRef: PREP_REF, runtimeGraphDriftReport: { rows: [{ severity: "high", status: "uncovered-handoff" }] }, runtimeGraphDriftReportRef: DRIFT_REF });
  assert.equal(report.status.value, "needs-review");
  assert.ok(report.blockers.some((issue) => issue.category === "runtime-drift"));
  assert.equal(report.proof.runtimeDrift.highSeverityOpen, 1);
});

// ---------- 17 ----------
test("proof rollup copies assessment / preparation / approval / verification status", () => {
  const report = build({
    intentAssessmentReport: assessment({ warnings: [{ id: "w1" }] }),
    intentAssessmentReportRef: ASSESS_REF,
    preparedIntentPlan: prepared(),
    preparedIntentPlanRef: PREP_REF,
    verificationPlanRef: PLAN_REF,
    verificationResult: { status: "passed" },
    verificationResultRef: RESULT_REF,
  });
  assert.equal(report.proof.assessment.readiness, "ready-for-prepare");
  assert.equal(report.proof.assessment.warnings, 1);
  assert.equal(report.proof.preparation.status, "prepared");
  assert.equal(report.proof.preparation.approvalStatus, "approved");
  assert.equal(report.proof.verification.resultStatus, "passed");
});

// ---------- 18 ----------
test("blockers / warnings / staleInputs / missingInputs are deterministic", () => {
  const input = {
    intentAssessmentReport: assessment({ readiness: { status: "blocked" }, blockers: [{ id: "b1" }] }),
    intentAssessmentReportRef: ASSESS_REF,
    runtimeGraphDriftReport: { rows: [{ severity: "high", status: "uncovered-handoff" }], summary: { uncoveredHandoff: 2 } },
    runtimeGraphDriftReportRef: DRIFT_REF,
    pathFreshnessReport: { status: "stale" },
    pathFreshnessReportRef: FRESH_REF,
  };
  const a = build(input);
  const b = build(input);
  assert.deepEqual(a.blockers, b.blockers);
  assert.deepEqual(a.warnings, b.warnings);
  assert.deepEqual(a.staleInputs, b.staleInputs);
  assert.deepEqual(a.missingInputs, b.missingInputs);
});

// ---------- CLI ----------
const cliRoot = await mkdtemp(join(tmpdir(), "rekon-intent-status-"));
await mkdir(join(cliRoot, "src"), { recursive: true });
await writeFile(join(cliRoot, "src", "app.ts"), "export const app = 1;\n", "utf8");

function runCli(args) {
  return spawnSync("node", [cliPath, ...args], { encoding: "utf8" });
}

// seed an assessment for the CLI tests
runCli(["intent", "assess", "--root", cliRoot, "--goal", "Prepare me", "--kind", "bug", "--path", "src/app.ts"]);

// ---------- 19 ----------
test("CLI writes an IntentStatusReport", () => {
  const result = runCli(["intent", "status", "--root", cliRoot, "--json"]);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.artifact.type, "IntentStatusReport");
  assert.ok(payload.status.value);
  assert.ok(payload.status.recommendedNextAction);
  assert.ok(payload.proof);
});

// ---------- 20 ----------
test("CLI supports a pinned assessment ref", () => {
  const refResult = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "IntentAssessmentReport", "--id-only"]);
  const ref = refResult.stdout.trim();
  const result = runCli(["intent", "status", "--root", cliRoot, "--assessment", ref, "--json"]);
  assert.equal(result.status, 0);
  assert.ok(JSON.parse(result.stdout).proof.assessment.present);
});

// ---------- 21 ----------
test("CLI does not create a WorkOrder", () => {
  runCli(["intent", "status", "--root", cliRoot]);
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "WorkOrder", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 22 ----------
test("CLI does not create a VerificationPlan", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "VerificationPlan", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 23 ----------
test("CLI does not create a VerificationRun", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "VerificationRun", "--allow-missing", "--json"]);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 24 ----------
test("CLI does not write source files", async () => {
  const before = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  runCli(["intent", "status", "--root", cliRoot]);
  const after = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  assert.equal(after, before);
});

// ---------- 25 ----------
test("artifacts validate remains clean after intent status", () => {
  runCli(["intent", "status", "--root", cliRoot]);
  const result = runCli(["artifacts", "validate", "--root", cliRoot, "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).valid, true);
});

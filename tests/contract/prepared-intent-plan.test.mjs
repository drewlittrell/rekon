// Contract tests for PreparedIntentPlan v1, amended with the required
// approval/proof envelope (eighty-third slice on the capability-ontology
// track).
//
// PreparedIntentPlan v1 is a read-only phase/gate preparation artifact
// generated from an IntentAssessmentReport plus the existing Rekon context
// spine. It must carry an explicit approval/proof envelope: status.value can be
// "prepared" only when approval.status is "approved". It is phase/gate
// preparation, not WorkOrder: it creates no WorkOrder / VerificationPlan,
// executes no commands, writes no source, and mutates nothing. Verification
// requirements are proof obligations, not VerificationPlan.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildPreparedIntentPlan } from "../../packages/capability-model/dist/index.js";
import { validatePreparedIntentPlan } from "../../packages/kernel-repo-model/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");

function baseHeader() {
  return {
    artifactType: "PreparedIntentPlan",
    artifactId: "prepared-intent-plan-test-1",
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
const ASSESSMENT_REF = REF("IntentAssessmentReport", "ia-1");
const DRIFT_REF = REF("RuntimeGraphDriftReport", "drift-1");
const COVERAGE_REF = REF("HandoffCoverageReport", "cov-1");
const FRESHNESS_REF = REF("PathFreshnessReport", "fresh-1");
const RESULT_REF = REF("VerificationResult", "vr-1");

function assessment(over = {}) {
  return {
    request: {
      goal: "Fix create user flow",
      kind: "bug",
      scope: { paths: ["src/"], steps: ["s1"], systems: ["billing"], capabilities: ["create user"] },
    },
    readiness: { status: "ready-for-prepare", recommendedNextAction: "prepare-intent" },
    matchedContext: { systems: ["billing"], capabilities: ["create user"], steps: ["s1"], paths: ["src/app.ts"] },
    blockers: [],
    warnings: [],
    ...over,
  };
}

function build(over = {}, opts = {}) {
  return buildPreparedIntentPlan({
    header: baseHeader(),
    intentAssessmentReport: assessment(over),
    intentAssessmentReportRef: ASSESSMENT_REF,
    ...opts,
  });
}

const hasCategory = (list, category) => list.some((entry) => entry.category === category);
const hasReason = (plan, reason) => plan.approval.reasons.includes(reason);

// ---------- 1 ----------
test("PreparedIntentPlan validates with an approval envelope", () => {
  const plan = build();
  assert.equal(validatePreparedIntentPlan(plan).ok, true);
  assert.ok(plan.approval, "plan has an approval envelope");
  assert.ok(Array.isArray(plan.approval.reasons) && plan.approval.reasons.length > 0);
  assert.ok(plan.approval.proof, "approval carries a proof record");
});

// ---------- 2 ----------
test("a plan without an approval envelope fails validation", () => {
  const invalid = validatePreparedIntentPlan({
    header: baseHeader(),
    source: { intentAssessmentReportRef: ASSESSMENT_REF },
    request: { goal: "g", kind: "bug" },
    status: { value: "needs-review", recommendedNextAction: "human-review" },
    phases: [],
    obligations: [],
    verificationRequirements: [],
    blockedReasons: [],
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.some((issue) => issue.path === "$.approval"));
});

// ---------- 3 ----------
test("missing IntentAssessmentReport input fails clearly", () => {
  assert.throws(
    () => buildPreparedIntentPlan({ header: baseHeader(), intentAssessmentReport: assessment() }),
    /intentAssessmentReportRef/,
  );
});

// ---------- 4 ----------
test("prepared status requires approval.status approved", () => {
  const plan = build();
  assert.equal(plan.status.value, "prepared");
  assert.equal(plan.approval.status, "approved");
});

// ---------- 5 ----------
test("a plan with phases but approval not approved is not prepared (validator)", () => {
  const plan = build();
  const mutated = { ...plan, approval: { ...plan.approval, status: "not-approved" } };
  const result = validatePreparedIntentPlan(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.status.value"));
});

// ---------- 6 ----------
test("ready-for-prepare + clean proof yields approved", () => {
  const plan = build({ request: { goal: "Add feature", kind: "feature" } });
  assert.equal(plan.approval.status, "approved");
  assert.equal(plan.status.value, "prepared");
});

// ---------- 7 ----------
test("blocked assessment yields not-approved + blocked status", () => {
  const plan = build({ readiness: { status: "blocked" }, blockers: [{ id: "b1", category: "missing-artifact", severity: "high", message: "missing spine" }] });
  assert.equal(plan.approval.status, "not-approved");
  assert.equal(plan.status.value, "blocked");
  assert.ok(hasReason(plan, "blocked-assessment"));
});

// ---------- 8 ----------
test("stale-context assessment yields not-approved + stale-assessment status", () => {
  const plan = build({ readiness: { status: "stale-context" } });
  assert.equal(plan.approval.status, "not-approved");
  assert.equal(plan.status.value, "stale-assessment");
  assert.ok(hasReason(plan, "stale-assessment"));
});

// ---------- 9 ----------
test("insufficient-context assessment yields not-approved + insufficient-assessment status", () => {
  const plan = build({ readiness: { status: "insufficient-context" } });
  assert.equal(plan.approval.status, "not-approved");
  assert.equal(plan.status.value, "insufficient-assessment");
  assert.ok(hasReason(plan, "insufficient-context"));
});

// ---------- 10 ----------
test("needs-review assessment yields needs-review approval + needs-review status", () => {
  const plan = build({ readiness: { status: "needs-review" } });
  assert.equal(plan.approval.status, "needs-review");
  assert.equal(plan.status.value, "needs-review");
});

// ---------- 11 ----------
test("approval cites the IntentAssessmentReport in its proof", () => {
  const plan = build();
  assert.equal(plan.approval.proof.intentAssessmentReportRef.type, "IntentAssessmentReport");
  assert.equal(plan.approval.proof.intentAssessmentReportRef.id, "ia-1");
  assert.equal(plan.approval.proof.assessmentReadiness, "ready-for-prepare");
  assert.equal(plan.approval.proof.assessmentApprovedForPrepare, true);
});

// ---------- 12 ----------
test("ready-for-prepare approval reasons include assessment-ready-for-prepare", () => {
  const plan = build();
  assert.ok(hasReason(plan, "assessment-ready-for-prepare"));
});

// ---------- 13 ----------
test("high unresolved runtime drift blocks approval", () => {
  const plan = build({}, {
    runtimeGraphDriftReport: { rows: [{ severity: "high", status: "uncovered-handoff" }] },
    runtimeGraphDriftReportRef: DRIFT_REF,
  });
  assert.equal(plan.approval.status, "not-approved");
  assert.notEqual(plan.status.value, "prepared");
  assert.ok(hasReason(plan, "runtime-drift-unresolved"));
  assert.equal(plan.approval.proof.runtimeDrift.unresolvedHighSeverity, 1);
});

// ---------- 14 ----------
test("uncovered handoff coverage blocks approval", () => {
  const plan = build({}, {
    handoffCoverageReport: { summary: { uncovered: 2, unresolvedContract: 0, notEvaluated: 0 } },
    handoffCoverageReportRef: COVERAGE_REF,
  });
  assert.equal(plan.approval.status, "not-approved");
  assert.ok(hasReason(plan, "handoff-coverage-unresolved"));
  assert.equal(plan.approval.proof.handoffCoverage.uncovered, 2);
});

// ---------- 15 ----------
test("stale freshness blocks approval", () => {
  const plan = build({}, {
    pathFreshnessReport: { status: "stale" },
    pathFreshnessReportRef: FRESHNESS_REF,
  });
  assert.equal(plan.approval.status, "not-approved");
  assert.ok(hasReason(plan, "stale-assessment"));
  assert.equal(plan.approval.proof.freshness.staleContext, true);
});

// ---------- 16 ----------
test("implementation-bearing prepared plan without verification requirements is not approved (validator)", () => {
  const plan = build();
  const mutated = { ...plan, verificationRequirements: [] };
  const result = validatePreparedIntentPlan(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.verificationRequirements"));
});

// ---------- 17 ----------
test("sourceWriteAllowed is always the literal false", () => {
  for (const status of ["ready-for-prepare", "blocked", "needs-review", "stale-context", "insufficient-context"]) {
    const plan = build({ readiness: { status } });
    assert.equal(plan.approval.proof.downstreamHandoff.sourceWriteAllowed, false, `sourceWriteAllowed must be false for ${status}`);
  }
});

// ---------- 18 ----------
test("approved plan allows downstream handoff but creates neither WorkOrder nor VerificationPlan", () => {
  const plan = build();
  assert.equal(plan.approval.proof.downstreamHandoff.workOrderAllowed, true);
  assert.equal(plan.approval.proof.downstreamHandoff.verificationPlanAllowed, true);
  assert.equal(Object.prototype.hasOwnProperty.call(plan, "workOrder"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(plan, "verificationPlan"), false);
});

// ---------- 19 ----------
test("not-approved plan disallows downstream handoff", () => {
  const plan = build({ readiness: { status: "blocked" }, blockers: [{ id: "b1", category: "missing-artifact", severity: "high", message: "x" }] });
  assert.equal(plan.approval.proof.downstreamHandoff.workOrderAllowed, false);
  assert.equal(plan.approval.proof.downstreamHandoff.verificationPlanAllowed, false);
});

// ---------- 20 ----------
test("blocked / stale / insufficient must not be approved (validator)", () => {
  for (const readiness of ["blocked", "stale-context", "insufficient-context"]) {
    const plan = build({ readiness: { status: readiness }, blockers: [{ id: "b", category: "missing-artifact", severity: "high", message: "x" }] });
    const mutated = { ...plan, approval: { ...plan.approval, status: "approved" } };
    const result = validatePreparedIntentPlan(mutated);
    assert.equal(result.ok, false, `expected validation failure for ${readiness}`);
    assert.ok(result.issues.some((issue) => issue.path === "$.approval.status"));
  }
});

// ---------- 21 ----------
test("approval blockers are derived from blocking reasons and reused as blockedReasons", () => {
  const plan = build({ readiness: { status: "blocked" }, blockers: [{ id: "b1", category: "missing-artifact", severity: "high", message: "x" }] });
  assert.ok(plan.approval.blockers.length > 0);
  assert.deepEqual(plan.blockedReasons, plan.approval.blockers);
});

// ---------- 22 ----------
test("prepared plan has empty blockedReasons", () => {
  const plan = build();
  assert.equal(plan.blockedReasons.length, 0);
});

// ---------- 23 ----------
test("verification requirements are emitted for prepared plans; no VerificationPlan is created", () => {
  const plan = build({ readiness: { status: "ready-for-prepare" }, request: { goal: "g", kind: "bug" } });
  assert.equal(plan.verificationRequirements.length, 3);
  assert.equal(plan.approval.proof.verification.requirementsPresent, true);
  assert.equal(Object.prototype.hasOwnProperty.call(plan, "verificationPlan"), false);
});

// ---------- 24 ----------
test("verification result ref is recorded as proof when present", () => {
  const plan = build({}, { verificationResult: { status: "passed" }, verificationResultRef: RESULT_REF });
  assert.equal(plan.approval.proof.verification.proofResultsPresent, true);
  assert.equal(plan.approval.proof.verification.verificationRefs.length, 1);
});

// ---------- 25 ----------
test("needs-review emits a review phase only; matched context propagates; source-write-boundary always present", () => {
  const reviewPlan = build({ readiness: { status: "needs-review" } });
  assert.equal(reviewPlan.phases.length, 1);
  assert.equal(reviewPlan.phases[0].kind, "review");

  const prepared = build({ readiness: { status: "ready-for-prepare" } });
  assert.ok(prepared.phases.some((phase) => phase.paths.includes("src/app.ts")));
  assert.ok(prepared.phases.some((phase) => phase.systems.includes("billing")));

  for (const status of ["ready-for-prepare", "blocked", "needs-review", "stale-context", "insufficient-context"]) {
    const plan = build({ readiness: { status } });
    assert.ok(hasCategory(plan.obligations, "source-write-boundary"), `missing source-write-boundary for ${status}`);
  }
});

// ---------- CLI ----------
const cliRoot = await mkdtemp(join(tmpdir(), "rekon-intent-prepare-"));
await mkdir(join(cliRoot, "src"), { recursive: true });
await writeFile(join(cliRoot, "src", "app.ts"), "export const app = 1;\n", "utf8");

function runCli(args) {
  return spawnSync("node", [cliPath, ...args], { encoding: "utf8" });
}

function latestAssessmentRef() {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "IntentAssessmentReport", "--id-only"]);
  return result.stdout.trim();
}

// seed an assessment for the CLI tests
runCli(["intent", "assess", "--root", cliRoot, "--goal", "Prepare me", "--kind", "bug", "--path", "src/app.ts"]);

// ---------- 26 ----------
test("CLI writes a PreparedIntentPlan and JSON includes approval", () => {
  const ref = latestAssessmentRef();
  const result = runCli(["intent", "prepare", "--root", cliRoot, "--assessment", ref, "--json"]);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.artifact.type, "PreparedIntentPlan");
  assert.ok(payload.status.value);
  assert.ok(payload.approval, "json includes approval");
  assert.ok(typeof payload.approval.status === "string");
  assert.ok(Array.isArray(payload.approval.reasons));
});

// ---------- 27 ----------
test("CLI human output reports approval status and reasons", () => {
  const result = runCli(["intent", "prepare", "--root", cliRoot, "--assessment", latestAssessmentRef()]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Approval: /);
  assert.match(result.stdout, /Approval reasons: /);
});

// ---------- 28 ----------
test("CLI requires --assessment", () => {
  const result = runCli(["intent", "prepare", "--root", cliRoot]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /requires --assessment/);
});

// ---------- 29 ----------
test("CLI does not create a WorkOrder", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "WorkOrder", "--allow-missing", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 30 ----------
test("CLI does not create a VerificationPlan", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "VerificationPlan", "--allow-missing", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 31 ----------
test("CLI does not create a VerificationRun", () => {
  const result = runCli(["artifacts", "latest", "--root", cliRoot, "--type", "VerificationRun", "--allow-missing", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).artifact, null);
});

// ---------- 32 ----------
test("CLI does not write source files", async () => {
  const before = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  runCli(["intent", "prepare", "--root", cliRoot, "--assessment", latestAssessmentRef()]);
  const after = await readFile(join(cliRoot, "src", "app.ts"), "utf8");
  assert.equal(after, before);
});

// ---------- 33 ----------
test("artifacts validate remains clean after intent prepare", () => {
  runCli(["intent", "prepare", "--root", cliRoot, "--assessment", latestAssessmentRef()]);
  const result = runCli(["artifacts", "validate", "--root", cliRoot, "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).valid, true);
});

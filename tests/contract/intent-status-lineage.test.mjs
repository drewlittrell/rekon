import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages", "cli", "dist", "index.js");

test("intent status isolates proof by prepared-plan lineage", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-intent-lineage-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();

    const assessmentA = await write(store, "IntentAssessmentReport", "assessment-a", [], {
      request: { goal: "Plan A", kind: "bug" },
      readiness: { status: "ready-for-prepare" }, blockers: [], warnings: [],
    });
    const preparedA = await write(store, "PreparedIntentPlan", "prepared-a", [assessmentA], preparedBody("Plan A", assessmentA));
    const statusA = await write(store, "IntentStatusReport", "status-a", [assessmentA, preparedA], {
      source: { intentAssessmentReportRef: assessmentA, preparedIntentPlanRef: preparedA },
      status: { value: "work-ready", recommendedNextAction: "create-work-order" },
      proof: {}, blockers: [], warnings: [], staleInputs: [], missingInputs: [], phases: [],
    });
    const workOrderA = await write(store, "WorkOrder", "work-order-a", [preparedA, assessmentA, statusA], workOrderBody(preparedA, assessmentA, statusA));
    const planA = await write(store, "VerificationPlan", "verification-plan-a", [preparedA, assessmentA, statusA, workOrderA], verificationPlanBody(preparedA, assessmentA, statusA, workOrderA));
    const runA = await write(store, "VerificationRun", "verification-run-a", [planA, workOrderA], {
      verificationPlanRef: planA, workOrderRef: workOrderA, status: "passed", commands: [], runner: { id: "test" },
    });
    const resultA = await write(store, "VerificationResult", "verification-result-a", [runA, planA, workOrderA], {
      verificationPlanRef: planA, workOrderRef: workOrderA, status: "passed", commandResults: [], summary: {}, successCriteria: [],
    });

    const assessmentB = await write(store, "IntentAssessmentReport", "assessment-b", [], {
      request: { goal: "Plan B", kind: "feature" },
      readiness: { status: "ready-for-prepare" }, blockers: [], warnings: [],
    });
    const preparedB = await write(store, "PreparedIntentPlan", "prepared-b", [assessmentB], preparedBody("Plan B", assessmentB));

    const bInitial = runCli(root, [
      "intent", "status",
      "--assessment", typed(assessmentB),
      "--prepared-plan", typed(preparedB),
      "--json",
    ]);
    assert.equal(bInitial.status, 0, bInitial.stderr);
    const initialPayload = JSON.parse(bInitial.stdout);
    assert.equal(initialPayload.status.value, "work-ready");
    assert.equal(initialPayload.proof.work, undefined);
    assert.equal(initialPayload.proof.verification, undefined);
    assert.equal(initialPayload.lineage.selected.workOrder, undefined);
    assert.equal(initialPayload.lineage.selected.verificationResult, undefined);
    assert.equal(initialPayload.lineage.selected.intentStatus, undefined);
    assert.ok(initialPayload.lineage.missing.includes("workOrder"));

    const wrongWorkOrder = runCli(root, [
      "intent", "status",
      "--assessment", typed(assessmentB),
      "--prepared-plan", typed(preparedB),
      "--work-order", typed(workOrderA),
      "--json",
    ]);
    assert.equal(wrongWorkOrder.status, 1);
    assert.equal(JSON.parse(wrongWorkOrder.stderr).error.code, "intent_artifact_lineage_mismatch");

    const wrongResult = runCli(root, [
      "intent", "status",
      "--assessment", typed(assessmentB),
      "--prepared-plan", typed(preparedB),
      "--verification-result", typed(resultA),
      "--json",
    ]);
    assert.equal(wrongResult.status, 1);
    assert.equal(JSON.parse(wrongResult.stderr).error.code, "intent_artifact_lineage_mismatch");

    const statusB = await latestRef(store, "IntentStatusReport");
    const workOrderB = await write(store, "WorkOrder", "work-order-b", [preparedB, assessmentB, statusB], workOrderBody(preparedB, assessmentB, statusB));
    await write(
      store,
      "VerificationPlan",
      "verification-plan-b-without-work-order",
      [preparedB, assessmentB, statusB],
      verificationPlanBody(preparedB, assessmentB, statusB, undefined),
    );

    const bWithoutPlan = runCli(root, ["intent", "status", "--prepared-plan", typed(preparedB), "--json"]);
    assert.equal(bWithoutPlan.status, 0, bWithoutPlan.stderr);
    const withoutPlanPayload = JSON.parse(bWithoutPlan.stdout);
    assert.equal(withoutPlanPayload.status.value, "work-in-progress");
    assert.equal(withoutPlanPayload.lineage.selected.workOrder.id, workOrderB.id);
    assert.equal(withoutPlanPayload.lineage.selected.verificationPlan, undefined);

    const planB = await write(store, "VerificationPlan", "verification-plan-b", [preparedB, assessmentB, statusB, workOrderB], verificationPlanBody(preparedB, assessmentB, statusB, workOrderB));

    const bPlanned = runCli(root, ["intent", "status", "--prepared-plan", typed(preparedB), "--json"]);
    assert.equal(bPlanned.status, 0, bPlanned.stderr);
    const plannedPayload = JSON.parse(bPlanned.stdout);
    assert.equal(plannedPayload.status.value, "verification-ready");
    assert.equal(plannedPayload.lineage.selected.intentStatus.id, statusB.id);
    assert.equal(plannedPayload.lineage.selected.workOrder.id, workOrderB.id);
    assert.equal(plannedPayload.lineage.selected.verificationPlan.id, planB.id);
    assert.equal(plannedPayload.lineage.selected.verificationRun, undefined);
    const plannedStatus = await store.read(await latestRef(store, "IntentStatusReport"));
    assert.ok(plannedStatus.header.inputRefs.some((ref) => ref.type === "IntentStatusReport" && ref.id === statusB.id));

    const runB = await write(store, "VerificationRun", "verification-run-b", [planB, workOrderB], {
      verificationPlanRef: planB, workOrderRef: workOrderB, status: "passed", commands: [], runner: { id: "test" },
    });
    const resultB = await write(store, "VerificationResult", "verification-result-b", [runB, planB, workOrderB], {
      verificationPlanRef: planB, workOrderRef: workOrderB, status: "passed", commandResults: [], summary: {}, successCriteria: [],
    });

    const bComplete = runCli(root, ["intent", "status", "--prepared-plan", typed(preparedB), "--json"]);
    assert.equal(bComplete.status, 0, bComplete.stderr);
    const completePayload = JSON.parse(bComplete.stdout);
    assert.equal(completePayload.status.value, "complete");
    assert.equal(completePayload.lineage.selected.verificationRun.id, runB.id);
    assert.equal(completePayload.lineage.selected.verificationResult.id, resultB.id);

    const aComplete = runCli(root, ["intent", "status", "--prepared-plan", typed(preparedA), "--json"]);
    assert.equal(aComplete.status, 0, aComplete.stderr);
    const aPayload = JSON.parse(aComplete.stdout);
    assert.equal(aPayload.status.value, "complete");
    assert.equal(aPayload.lineage.selected.workOrder.id, workOrderA.id);
    assert.equal(aPayload.lineage.selected.verificationResult.id, resultA.id);

    const latestComplete = runCli(root, ["intent", "status", "--json"]);
    assert.equal(latestComplete.status, 0, latestComplete.stderr);
    const latestPayload = JSON.parse(latestComplete.stdout);
    assert.equal(latestPayload.lineage.selected.preparedPlan.id, preparedB.id);
    assert.equal(latestPayload.lineage.selected.verificationResult.id, resultB.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("explicit downstream artifact without its required predecessor fails closed", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-intent-lineage-missing-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const assessment = await write(store, "IntentAssessmentReport", "assessment", [], {
      request: { goal: "Scoped" }, readiness: { status: "ready-for-prepare" }, blockers: [], warnings: [],
    });
    const prepared = await write(store, "PreparedIntentPlan", "prepared", [assessment], preparedBody("Scoped", assessment));
    const workOrder = await write(
      store,
      "WorkOrder",
      "work-order-without-status",
      [assessment, prepared],
      { source: "intent-handoff", intentHandoff: { preparedIntentPlanRef: prepared, intentAssessmentReportRef: assessment } },
    );
    const result = runCli(root, [
      "intent", "status", "--prepared-plan", typed(prepared), "--work-order", typed(workOrder), "--json",
    ]);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, "intent_artifact_source_ref_missing");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("prepared plans with multiple assessment roots fail as ambiguous", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-intent-lineage-ambiguous-"));
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const assessmentA = await write(store, "IntentAssessmentReport", "assessment-a", [], {
      request: { goal: "A" }, readiness: { status: "ready-for-prepare" }, blockers: [], warnings: [],
    });
    const assessmentB = await write(store, "IntentAssessmentReport", "assessment-b", [], {
      request: { goal: "B" }, readiness: { status: "ready-for-prepare" }, blockers: [], warnings: [],
    });
    const prepared = await write(
      store,
      "PreparedIntentPlan",
      "ambiguous-prepared",
      [assessmentA, assessmentB],
      { ...preparedBody("Ambiguous", assessmentA), source: { assessmentRefs: [assessmentA, assessmentB] } },
    );

    const result = runCli(root, ["intent", "status", "--prepared-plan", typed(prepared), "--json"]);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, "intent_artifact_lineage_ambiguous");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function preparedBody(goal, assessmentRef) {
  return {
    request: { goal, kind: "bug" },
    source: { intentAssessmentReportRef: assessmentRef },
    status: { value: "prepared", recommendedNextAction: "create-work-order" },
    approval: { status: "approved" }, phases: [], obligations: [], verificationRequirements: [],
  };
}

function workOrderBody(preparedRef, assessmentRef, statusRef) {
  return {
    source: "intent-handoff",
    intentHandoff: {
      preparedIntentPlanRef: preparedRef,
      intentAssessmentReportRef: assessmentRef,
      intentStatusReportRef: statusRef,
      sourceRefs: [preparedRef, assessmentRef, statusRef],
    },
  };
}

function verificationPlanBody(preparedRef, assessmentRef, statusRef, workOrderRef) {
  return {
    source: "intent-handoff",
    ...(workOrderRef ? { workOrderRef } : {}),
    commands: [], successCriteria: [],
    intentHandoff: {
      preparedIntentPlanRef: preparedRef,
      intentAssessmentReportRef: assessmentRef,
      intentStatusReportRef: statusRef,
      ...(workOrderRef ? { workOrderRef } : {}),
    },
  };
}

async function write(store, type, id, inputRefs, body) {
  return store.write({
    header: {
      artifactType: type,
      artifactId: id,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: "intent-lineage-fixture" },
      producer: { id: "@rekon/test.intent-lineage", version: "1.0.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 1 },
    },
    ...body,
  });
}

async function latestRef(store, type) {
  return (await store.list(type)).sort((a, b) => b.writtenAt.localeCompare(a.writtenAt))[0];
}

function typed(ref) {
  return `${ref.type}:${ref.id}`;
}

function runCli(root, args) {
  return spawnSync(process.execPath, [cliPath, ...args, "--root", root], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

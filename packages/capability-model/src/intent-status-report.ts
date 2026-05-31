// IntentStatusReport v1 builder.
//
// A read-only rollup status report over the staged Rekon intent spine. It reads
// the assessment, prepared plan, work order, verification plan/run/result,
// freshness, and runtime-drift artifacts (by VALUE, passed in) and reports the
// current intent state. It reports `PreparedIntentPlan` approval state but does
// NOT approve plans, creates no `WorkOrder` / `VerificationPlan` /
// `VerificationRun` / `VerificationResult`, executes no commands, writes no
// source, and mutates no input. `VerificationResult` is an input to status, not
// the status artifact itself; `intent:go` remains deferred.
//
// See:
// - docs/strategy/intent-status-report-v1-decision.md
// - docs/artifacts/intent-status-report.md
// - docs/concepts/intent-status.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type IntentStatusIssue,
  type IntentStatusPhaseSummary,
  type IntentStatusProof,
  type IntentStatusRecommendedNextAction,
  type IntentStatusReport,
  type IntentStatusReportRequest,
  type IntentStatusReportSource,
  type IntentStatusValue,
  createIntentStatusReport,
} from "@rekon/kernel-repo-model";

/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const INTENT_STATUS_REPORT_ARTIFACT_ID_PREFIX = "intent-status-report-";

/** Structural views of the source artifacts (read by shape; no class deps). */
export type IntentStatusAssessmentLike = {
  header?: ArtifactHeader;
  request?: { goal?: string; kind?: string; scope?: { paths?: string[]; systems?: string[]; capabilities?: string[]; steps?: string[] } };
  readiness?: { status?: string; recommendedNextAction?: string };
  blockers?: unknown[];
  warnings?: unknown[];
};
export type IntentStatusPreparedPlanLike = {
  header?: ArtifactHeader;
  request?: { goal?: string; kind?: string; scope?: { paths?: string[]; systems?: string[]; capabilities?: string[]; steps?: string[] } };
  status?: { value?: string; recommendedNextAction?: string };
  approval?: { status?: string };
  phases?: Array<{ id?: string; title?: string; status?: string }>;
  obligations?: unknown[];
  verificationRequirements?: unknown[];
};
export type IntentStatusWorkOrderLike = { header?: ArtifactHeader; source?: string };
export type IntentStatusVerificationPlanLike = { header?: ArtifactHeader };
export type IntentStatusVerificationRunLike = { header?: ArtifactHeader; status?: string };
export type IntentStatusVerificationResultLike = { header?: ArtifactHeader; status?: string };
export type IntentStatusPathFreshnessLike = { header?: ArtifactHeader; status?: string; entries?: Array<{ status?: string }> };
export type IntentStatusRuntimeDriftLike = {
  header?: ArtifactHeader;
  rows?: Array<{ status?: string; severity?: string }>;
  summary?: { addedObserved?: number; uncoveredHandoff?: number; unresolvedContract?: number };
};
export type IntentStatusHandoffCoverageLike = {
  header?: ArtifactHeader;
  summary?: { uncovered?: number; unresolvedContract?: number; notEvaluated?: number };
};

export type BuildIntentStatusReportInput = {
  header: ArtifactHeader;

  intentAssessmentReport?: IntentStatusAssessmentLike;
  intentAssessmentReportRef?: ArtifactRef;
  preparedIntentPlan?: IntentStatusPreparedPlanLike;
  preparedIntentPlanRef?: ArtifactRef;
  workOrder?: IntentStatusWorkOrderLike;
  workOrderRef?: ArtifactRef;
  verificationPlan?: IntentStatusVerificationPlanLike;
  verificationPlanRef?: ArtifactRef;
  verificationRun?: IntentStatusVerificationRunLike;
  verificationRunRef?: ArtifactRef;
  verificationResult?: IntentStatusVerificationResultLike;
  verificationResultRef?: ArtifactRef;
  pathFreshnessReport?: IntentStatusPathFreshnessLike;
  pathFreshnessReportRef?: ArtifactRef;
  runtimeGraphDriftReport?: IntentStatusRuntimeDriftLike;
  runtimeGraphDriftReportRef?: ArtifactRef;
  handoffCoverageReport?: IntentStatusHandoffCoverageLike;
  handoffCoverageReportRef?: ArtifactRef;
  findingReportRef?: ArtifactRef;
};

// Drift override applies to advancing statuses; it does not override a status
// that is already failed/blocked/stale/needs-review.
const DRIFT_OVERRIDABLE = new Set<IntentStatusValue>([
  "assessed",
  "prepared",
  "work-ready",
  "work-in-progress",
  "verification-ready",
  "verification-running",
  "verification-passed",
  "complete",
]);

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function nonNegInt(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function freshnessIsStale(report: IntentStatusPathFreshnessLike | undefined): boolean {
  if (!report) return false;
  if (report.status === "stale") return true;
  if (Array.isArray(report.entries)) {
    for (const entry of report.entries) {
      if (entry && (entry.status === "changed" || entry.status === "missing")) return true;
    }
  }
  return false;
}

function countHighOpenDrift(report: IntentStatusRuntimeDriftLike | undefined): number {
  if (!report || !Array.isArray(report.rows)) return 0;
  let count = 0;
  for (const row of report.rows) {
    if (!row) continue;
    if (row.severity === "high" && row.status !== "in-sync" && row.status !== "not-evaluated") count += 1;
  }
  return count;
}

export function buildIntentStatusReport(input: BuildIntentStatusReportInput): IntentStatusReport {
  const assessment = input.intentAssessmentReport;
  const prepared = input.preparedIntentPlan;
  const workOrder = input.workOrder;

  const hasAssessment = Boolean(input.intentAssessmentReportRef || assessment);
  const hasPrepared = Boolean(input.preparedIntentPlanRef || prepared);
  const hasWorkOrder = Boolean(input.workOrderRef || workOrder);
  const hasPlan = Boolean(input.verificationPlanRef || input.verificationPlan);
  const hasRun = Boolean(input.verificationRunRef || input.verificationRun);
  const hasResult = Boolean(input.verificationResultRef || input.verificationResult);
  const hasFreshness = Boolean(input.pathFreshnessReportRef || input.pathFreshnessReport);
  const hasDrift = Boolean(input.runtimeGraphDriftReportRef || input.runtimeGraphDriftReport);
  const hasCoverage = Boolean(input.handoffCoverageReportRef || input.handoffCoverageReport);

  const readiness = typeof assessment?.readiness?.status === "string" ? assessment.readiness.status : undefined;
  const approvalStatus = typeof prepared?.approval?.status === "string" ? prepared.approval.status : undefined;
  const preparedStatusValue = typeof prepared?.status?.value === "string" ? prepared.status.value : undefined;
  const resultStatus = typeof input.verificationResult?.status === "string" ? input.verificationResult.status : undefined;

  const freshnessStale = freshnessIsStale(input.pathFreshnessReport);
  const driftHigh = countHighOpenDrift(input.runtimeGraphDriftReport);
  const driftAddedObserved = nonNegInt(input.runtimeGraphDriftReport?.summary?.addedObserved);
  const driftUncovered = nonNegInt(input.runtimeGraphDriftReport?.summary?.uncoveredHandoff);
  const driftUnresolved = nonNegInt(input.runtimeGraphDriftReport?.summary?.unresolvedContract);
  const coverageUncovered = nonNegInt(input.handoffCoverageReport?.summary?.uncovered);
  const coverageUnresolved = nonNegInt(input.handoffCoverageReport?.summary?.unresolvedContract);

  // ---- Base status derivation ----
  let value: IntentStatusValue;
  let nextAction: IntentStatusRecommendedNextAction;
  if (!hasAssessment) {
    value = "not-assessed";
    nextAction = "run-assessment";
  } else if (!hasPrepared) {
    if (readiness === "blocked" || readiness === "insufficient-context") {
      value = "assessment-blocked";
      nextAction = "resolve-blockers";
    } else if (readiness === "stale-context") {
      value = "stale";
      nextAction = "refresh-context";
    } else if (readiness === "needs-review") {
      value = "needs-review";
      nextAction = "human-review";
    } else {
      value = "assessed";
      nextAction = "prepare-intent";
    }
  } else if (approvalStatus === "not-approved") {
    value = "preparation-blocked";
    nextAction = "resolve-blockers";
  } else if (approvalStatus === "needs-review") {
    value = "needs-review";
    nextAction = "human-review";
  } else if (approvalStatus === "approved") {
    if (hasResult) {
      if (resultStatus === "passed") {
        if (!freshnessStale && driftHigh === 0) {
          value = "complete";
          nextAction = "none";
        } else {
          value = "verification-passed";
          nextAction = "none";
        }
      } else {
        value = "verification-failed";
        nextAction = "run-verification";
      }
    } else if (hasRun) {
      value = "verification-running";
      nextAction = "run-verification";
    } else if (hasPlan) {
      value = "verification-ready";
      nextAction = "run-verification";
    } else if (hasWorkOrder) {
      value = "work-in-progress";
      nextAction = "none";
    } else {
      value = "work-ready";
      nextAction = "create-work-order";
    }
  } else if (preparedStatusValue === "prepared") {
    value = "prepared";
    nextAction = "create-work-order";
  } else if (preparedStatusValue === "blocked") {
    value = "preparation-blocked";
    nextAction = "resolve-blockers";
  } else if (preparedStatusValue === "stale-assessment") {
    value = "stale";
    nextAction = "refresh-context";
  } else if (preparedStatusValue === "insufficient-assessment") {
    value = "assessment-blocked";
    nextAction = "resolve-blockers";
  } else if (preparedStatusValue === "needs-review") {
    value = "needs-review";
    nextAction = "human-review";
  } else {
    value = "unknown";
    nextAction = "human-review";
  }

  // ---- Freshness override (stale context overrides work/proof status) ----
  if (hasAssessment && freshnessStale && value !== "not-assessed") {
    value = "stale";
    nextAction = "refresh-context";
  }

  // ---- Runtime drift override (high-severity open drift needs review) ----
  if (driftHigh > 0 && DRIFT_OVERRIDABLE.has(value)) {
    value = "needs-review";
    nextAction = "human-review";
  }

  // ---- Source refs ----
  const source: IntentStatusReportSource = {};
  if (input.intentAssessmentReportRef) source.intentAssessmentReportRef = input.intentAssessmentReportRef;
  if (input.preparedIntentPlanRef) source.preparedIntentPlanRef = input.preparedIntentPlanRef;
  if (input.workOrderRef) source.workOrderRef = input.workOrderRef;
  if (input.verificationPlanRef) source.verificationPlanRef = input.verificationPlanRef;
  if (input.verificationRunRef) source.verificationRunRef = input.verificationRunRef;
  if (input.verificationResultRef) source.verificationResultRef = input.verificationResultRef;
  if (input.pathFreshnessReportRef) source.pathFreshnessReportRef = input.pathFreshnessReportRef;
  if (input.runtimeGraphDriftReportRef) source.runtimeGraphDriftReportRef = input.runtimeGraphDriftReportRef;
  if (input.handoffCoverageReportRef) source.handoffCoverageReportRef = input.handoffCoverageReportRef;
  if (input.findingReportRef) source.findingReportRef = input.findingReportRef;

  // ---- Request (from prepared plan, else assessment) ----
  const requestSource = prepared?.request ?? assessment?.request;
  let request: IntentStatusReportRequest | undefined;
  if (requestSource) {
    request = {};
    if (typeof requestSource.goal === "string" && requestSource.goal.length > 0) request.goal = requestSource.goal;
    if (typeof requestSource.kind === "string" && requestSource.kind.length > 0) request.kind = requestSource.kind;
    if (requestSource.scope) request.scope = requestSource.scope;
  }

  // ---- Phases (from prepared plan) ----
  const phases: IntentStatusPhaseSummary[] = Array.isArray(prepared?.phases)
    ? prepared.phases
        .filter((phase): phase is { id?: string; title?: string; status?: string } => Boolean(phase) && typeof phase?.id === "string")
        .map((phase) => ({
          id: String(phase.id),
          title: typeof phase.title === "string" ? phase.title : "",
          status: typeof phase.status === "string" ? phase.status : "",
        }))
    : [];

  // ---- Proof rollup (mirrors each input's recorded state) ----
  const proof: IntentStatusProof = {};
  if (hasAssessment) {
    proof.assessment = { present: true, blockers: arrayLength(assessment?.blockers), warnings: arrayLength(assessment?.warnings) };
    if (readiness) proof.assessment.readiness = readiness;
  }
  if (hasPrepared) {
    proof.preparation = {
      present: true,
      phases: arrayLength(prepared?.phases),
      obligations: arrayLength(prepared?.obligations),
      verificationRequirements: arrayLength(prepared?.verificationRequirements),
    };
    if (preparedStatusValue) proof.preparation.status = preparedStatusValue;
    if (approvalStatus) proof.preparation.approvalStatus = approvalStatus;
  }
  if (hasWorkOrder) {
    proof.work = { present: true };
    if (typeof workOrder?.source === "string") proof.work.status = workOrder.source;
  }
  if (hasPlan || hasRun || hasResult) {
    proof.verification = { planPresent: hasPlan, runPresent: hasRun, resultPresent: hasResult };
    if (resultStatus) proof.verification.resultStatus = resultStatus;
  }
  if (hasFreshness) {
    proof.freshness = { present: true, stale: freshnessStale };
  }
  if (hasDrift) {
    proof.runtimeDrift = {
      present: true,
      highSeverityOpen: driftHigh,
      addedObserved: driftAddedObserved,
      uncoveredHandoff: driftUncovered,
      unresolvedContract: driftUnresolved,
    };
  }

  // ---- Issues ----
  const blockers: IntentStatusIssue[] = [];
  const warnings: IntentStatusIssue[] = [];
  const staleInputs: IntentStatusIssue[] = [];
  const missingInputs: IntentStatusIssue[] = [];

  const assessmentRefs = input.intentAssessmentReportRef ? [input.intentAssessmentReportRef] : undefined;
  const preparedRefs = input.preparedIntentPlanRef ? [input.preparedIntentPlanRef] : undefined;
  const driftRefs = input.runtimeGraphDriftReportRef ? [input.runtimeGraphDriftReportRef] : undefined;
  const resultRefs = input.verificationResultRef ? [input.verificationResultRef] : undefined;
  const freshnessRefs = input.pathFreshnessReportRef ? [input.pathFreshnessReportRef] : undefined;
  const coverageRefs = input.handoffCoverageReportRef ? [input.handoffCoverageReportRef] : undefined;

  if (hasAssessment && (readiness === "blocked" || readiness === "insufficient-context")) {
    blockers.push({ id: "blocker:assessment-blocked", category: "assessment-blocked", severity: "high", message: "The intent assessment is blocked or lacks sufficient context.", ...(assessmentRefs ? { sourceRefs: assessmentRefs } : {}) });
  }
  if (hasPrepared && approvalStatus === "not-approved") {
    blockers.push({ id: "blocker:preparation-not-approved", category: "preparation-not-approved", severity: "high", message: "The prepared intent plan is not approved.", ...(preparedRefs ? { sourceRefs: preparedRefs } : {}) });
  }
  if (driftHigh > 0) {
    blockers.push({ id: "blocker:runtime-drift", category: "runtime-drift", severity: "high", message: `Runtime graph drift has ${driftHigh} unresolved high-severity row(s).`, ...(driftRefs ? { sourceRefs: driftRefs } : {}) });
  }
  if (hasResult && resultStatus !== undefined && resultStatus !== "passed") {
    blockers.push({ id: "blocker:verification-failed", category: "verification-failed", severity: "high", message: `Verification result is ${resultStatus}.`, ...(resultRefs ? { sourceRefs: resultRefs } : {}) });
  }

  if (hasCoverage && (coverageUncovered > 0 || coverageUnresolved > 0)) {
    warnings.push({ id: "warning:handoff-coverage", category: "handoff-coverage", severity: "medium", message: `Handoff coverage has ${coverageUncovered} uncovered and ${coverageUnresolved} unresolved-contract row(s).`, ...(coverageRefs ? { sourceRefs: coverageRefs } : {}) });
  } else if (!hasCoverage && hasDrift && (driftUncovered > 0 || driftUnresolved > 0)) {
    warnings.push({ id: "warning:handoff-coverage", category: "handoff-coverage", severity: "medium", message: `Runtime drift reports ${driftUncovered} uncovered handoff and ${driftUnresolved} unresolved-contract row(s).`, ...(driftRefs ? { sourceRefs: driftRefs } : {}) });
  }

  if (freshnessStale) {
    staleInputs.push({ id: "stale:path-freshness", category: "stale-context", severity: "medium", message: "Path freshness reports stale scoped context; refresh before relying on status.", ...(freshnessRefs ? { sourceRefs: freshnessRefs } : {}) });
  }

  if (!hasAssessment) {
    missingInputs.push({ id: "missing:intent-assessment-report", category: "missing-artifact", severity: "high", message: "No IntentAssessmentReport exists; run an assessment first." });
  }

  return createIntentStatusReport({
    header: input.header,
    source,
    ...(request && Object.keys(request).length > 0 ? { request } : {}),
    status: { value, recommendedNextAction: nextAction },
    phases,
    proof,
    blockers,
    warnings,
    staleInputs,
    missingInputs,
  });
}

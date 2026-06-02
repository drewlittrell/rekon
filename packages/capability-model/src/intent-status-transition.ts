// Intent status work-ready transition helper (slice 126).
//
// `buildWorkReadyIntentStatusReport(input)` turns an approved `PreparedIntentPlan`
// plus a previous `IntentStatusReport` into a **new** work-ready
// `IntentStatusReport` revision, after conservatively rechecking freshness /
// runtime drift / status context. It is the pure projection behind the
// `rekon intent status transition` CLI command.
//
// **Boundary.** This helper is a pure function. It reads no files, writes no
// artifacts, executes no commands, runs no Circe, and mutates none of its
// inputs. The status transition is explicit — approval does not automatically
// make status work-ready. The new report it returns enables — but does not
// create — the WorkOrder and VerificationPlan handoffs (those still run
// separately, and both require an approved plan AND a work-ready status). It
// creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult,
// and `intent:go` remains deferred. The previous `IntentStatusReport` and the
// approved `PreparedIntentPlan` are never mutated.
//
// See:
// - docs/strategy/intent-status-work-ready-transition-decision.md
// - docs/strategy/intent-status-work-ready-transition-implementation.md
// - docs/concepts/intent-status.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type IntentOperatorAcceptedRisk,
  type IntentStatusPhaseSummary,
  type IntentStatusProof,
  type IntentStatusReport,
  type IntentStatusReportRequest,
  type IntentStatusReportSource,
  createIntentStatusReport,
} from "@rekon/kernel-repo-model";

/** The status values this transition can target (v1: only work-ready). */
export const INTENT_STATUS_TRANSITION_TARGETS = ["work-ready"] as const;

// ---------------------------------------------------------------------------
// Structural ("Like") input views — read by shape; no class dependencies.
// ---------------------------------------------------------------------------

export type IntentStatusTransitionPreparedPlanLike = {
  header?: { artifactId?: string } & Record<string, unknown>;
  request?: { goal?: string; kind?: string; scope?: Record<string, unknown> };
  status?: { value?: string; recommendedNextAction?: string };
  approval?: {
    status?: string;
    reasons?: unknown;
    acceptedRisks?: unknown;
    proof?: {
      downstreamHandoff?: {
        workOrderAllowed?: boolean;
        verificationPlanAllowed?: boolean;
        sourceWriteAllowed?: boolean;
      };
    };
  };
  phases?: Array<{ id?: string; title?: string; status?: string }>;
  obligations?: unknown[];
  verificationRequirements?: unknown[];
};

export type IntentStatusTransitionPreviousStatusLike = {
  header?: ArtifactHeader;
  request?: { goal?: string; kind?: string };
  status?: { value?: string; recommendedNextAction?: string };
  source?: { preparedIntentPlanRef?: ArtifactRef; intentAssessmentReportRef?: ArtifactRef } & Record<string, unknown>;
  blockers?: Array<{ id?: string; category?: string; severity?: string; message?: string }>;
  warnings?: unknown[];
  proof?: Record<string, unknown>;
};

export type IntentStatusTransitionFreshnessLike = {
  header?: ArtifactHeader;
  status?: string;
  entries?: Array<{ status?: string }>;
};

export type IntentStatusTransitionRuntimeDriftLike = {
  header?: ArtifactHeader;
  rows?: Array<{ status?: string; severity?: string }>;
};

// ---------------------------------------------------------------------------
// Result + blocker model
// ---------------------------------------------------------------------------

export type IntentStatusTransitionBlockerCategory =
  | "missing-approved-plan"
  | "missing-approved-plan-ref"
  | "plan-not-approved"
  | "plan-not-prepared"
  | "missing-accepted-risks"
  | "handoff-not-allowed"
  | "source-write-boundary"
  | "missing-previous-status"
  | "missing-previous-status-ref"
  | "previous-status-not-traceable"
  | "previous-status-high-blocker"
  | "freshness-stale"
  | "new-high-runtime-drift"
  | "missing-transition-reason";

export type IntentStatusTransitionBlocker = {
  id: string;
  category: IntentStatusTransitionBlockerCategory;
  severity: "medium" | "high";
  message: string;
  sourceRefs?: ArtifactRef[];
};

export type IntentStatusTransitionResult =
  | { status: "work-ready"; intentStatusReport: IntentStatusReport; blockers: IntentStatusTransitionBlocker[] }
  | { status: "blocked"; blockers: IntentStatusTransitionBlocker[]; intentStatusReport?: undefined };

export type BuildWorkReadyIntentStatusReportInput = {
  /** Header for the new work-ready IntentStatusReport revision (CLI-built). */
  header: ArtifactHeader;
  approvedPreparedIntentPlan?: IntentStatusTransitionPreparedPlanLike;
  approvedPreparedIntentPlanRef?: ArtifactRef;
  previousIntentStatusReport?: IntentStatusTransitionPreviousStatusLike;
  previousIntentStatusReportRef?: ArtifactRef;
  pathFreshnessReport?: IntentStatusTransitionFreshnessLike;
  pathFreshnessReportRef?: ArtifactRef;
  runtimeGraphDriftReport?: IntentStatusTransitionRuntimeDriftLike;
  runtimeGraphDriftReportRef?: ArtifactRef;
  /** Why the operator transitions to work-ready (`--reason`); required. */
  reason: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Proof-gap approval reasons whose acceptance must be recorded as acceptedRisks. */
const PROOF_GAP_REASONS = new Set<string>([
  "verification-proof-missing",
  "runtime-drift-unresolved",
  "handoff-coverage-unresolved",
  "stale-assessment",
  "manual-risk-acceptance",
]);

/**
 * Previous-status blocker categories that an approved PreparedIntentPlan (with
 * accepted proof gaps) resolves. High-severity blockers OUTSIDE this set block
 * the transition — they are genuinely unrelated to approval.
 */
const COVERED_BY_APPROVAL = new Set<string>([
  "preparation-not-approved",
  "runtime-drift",
  "stale-context",
  "handoff-coverage",
]);

/** Mirrors prepared-intent-plan.ts `freshnessIsStale`. */
function freshnessIsStale(report: IntentStatusTransitionFreshnessLike | undefined): boolean {
  if (!report) return false;
  if (report.status === "stale") return true;
  if (Array.isArray(report.entries)) {
    for (const entry of report.entries) {
      if (entry && (entry.status === "changed" || entry.status === "missing")) return true;
    }
  }
  return false;
}

/** Mirrors prepared-intent-plan.ts `countHighUnresolvedDrift`. */
function countHighUnresolvedDrift(report: IntentStatusTransitionRuntimeDriftLike | undefined): number {
  if (!report || !Array.isArray(report.rows)) return 0;
  let count = 0;
  for (const row of report.rows) {
    if (!row) continue;
    if (row.severity === "high" && row.status !== "in-sync" && row.status !== "not-evaluated") count += 1;
  }
  return count;
}

// ---------------------------------------------------------------------------
// buildWorkReadyIntentStatusReport
// ---------------------------------------------------------------------------

export function buildWorkReadyIntentStatusReport(
  input: BuildWorkReadyIntentStatusReportInput,
): IntentStatusTransitionResult {
  const blockers: IntentStatusTransitionBlocker[] = [];
  const push = (
    id: string,
    category: IntentStatusTransitionBlockerCategory,
    message: string,
    sourceRefs?: ArtifactRef[],
  ): void => {
    blockers.push({ id, category, severity: "high", message, ...(sourceRefs && sourceRefs.length > 0 ? { sourceRefs } : {}) });
  };

  const plan = input.approvedPreparedIntentPlan;
  const planRef = input.approvedPreparedIntentPlanRef;
  const planRefs = planRef ? [planRef] : undefined;
  const prev = input.previousIntentStatusReport;
  const prevRef = input.previousIntentStatusReportRef;
  const prevRefs = prevRef ? [prevRef] : undefined;

  // ---- Approved plan presence + state ----
  if (!isRecord(plan)) {
    push("missing-approved-plan", "missing-approved-plan", "An approved PreparedIntentPlan is required to transition to work-ready.");
  }
  if (!planRef) {
    push("missing-approved-plan-ref", "missing-approved-plan-ref", "A PreparedIntentPlan ref is required.");
  }
  if (plan && plan.approval?.status !== "approved") {
    push("plan-not-approved", "plan-not-approved", "The PreparedIntentPlan must be approved before work-ready transition.", planRefs);
  }
  if (plan && plan.status?.value !== "prepared") {
    push("plan-not-prepared", "plan-not-prepared", "The PreparedIntentPlan status.value must be prepared.", planRefs);
  }

  // ---- Accepted risks present when proof gaps were accepted ----
  const reasons: string[] = Array.isArray(plan?.approval?.reasons)
    ? (plan!.approval!.reasons as unknown[]).filter((r): r is string => typeof r === "string")
    : [];
  const acceptedRisks: unknown[] = Array.isArray(plan?.approval?.acceptedRisks) ? (plan!.approval!.acceptedRisks as unknown[]) : [];
  const gapsAccepted = reasons.some((r) => PROOF_GAP_REASONS.has(r));
  if (plan && gapsAccepted && acceptedRisks.length === 0) {
    push("missing-accepted-risks", "missing-accepted-risks", "The approved plan accepted proof gaps but records no acceptedRisks.", planRefs);
  }

  // ---- Downstream handoff flags ----
  const downstream = plan?.approval?.proof?.downstreamHandoff;
  if (plan && downstream?.workOrderAllowed !== true) {
    push("handoff-not-allowed:work-order", "handoff-not-allowed", "The approved plan proof must allow the WorkOrder handoff.", planRefs);
  }
  if (plan && downstream?.verificationPlanAllowed !== true) {
    push("handoff-not-allowed:verification-plan", "handoff-not-allowed", "The approved plan proof must allow the VerificationPlan handoff.", planRefs);
  }
  if (plan && downstream?.sourceWriteAllowed !== false) {
    push("source-write-boundary", "source-write-boundary", "The approved plan proof must keep sourceWriteAllowed === false.", planRefs);
  }

  // ---- Previous status presence + traceability + blockers ----
  if (!isRecord(prev)) {
    push("missing-previous-status", "missing-previous-status", "A previous IntentStatusReport is required.");
  }
  if (!prevRef) {
    push("missing-previous-status-ref", "missing-previous-status-ref", "A previous IntentStatusReport ref is required.");
  }
  const planGoal = typeof plan?.request?.goal === "string" ? plan!.request!.goal : "";
  const prevGoal = typeof prev?.request?.goal === "string" ? prev!.request!.goal : "";
  if (plan && prev && planGoal.length > 0 && prevGoal.length > 0 && planGoal !== prevGoal) {
    push("previous-status-not-traceable", "previous-status-not-traceable", "The previous IntentStatusReport is not traceable to the approved plan's request.", prevRefs);
  }
  const prevBlockers = Array.isArray(prev?.blockers) ? prev!.blockers : [];
  const uncoveredHigh = prevBlockers.filter(
    (b) => isRecord(b) && b.severity === "high" && typeof b.category === "string" && !COVERED_BY_APPROVAL.has(b.category),
  );
  if (prev && uncoveredHigh.length > 0) {
    push("previous-status-high-blocker", "previous-status-high-blocker", "The previous IntentStatusReport has a high-severity blocker not resolved by the approved plan.", prevRefs);
  }

  // ---- Handoff-time freshness + drift rechecks ----
  if (freshnessIsStale(input.pathFreshnessReport)) {
    push("freshness-stale", "freshness-stale", "Scoped context is stale at transition time; refresh before transitioning.", input.pathFreshnessReportRef ? [input.pathFreshnessReportRef] : undefined);
  }
  if (countHighUnresolvedDrift(input.runtimeGraphDriftReport) > 0) {
    push("new-high-runtime-drift", "new-high-runtime-drift", "New high-severity runtime drift detected at transition time; resolve before transitioning.", input.runtimeGraphDriftReportRef ? [input.runtimeGraphDriftReportRef] : undefined);
  }

  // ---- Transition reason ----
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason) {
    push("missing-transition-reason", "missing-transition-reason", "A transition --reason is required.");
  }

  if (blockers.length > 0) {
    return { status: "blocked", blockers };
  }

  // ---- Build the new work-ready IntentStatusReport (gate passed) ----
  const phases: IntentStatusPhaseSummary[] = (Array.isArray(plan!.phases) ? plan!.phases : [])
    .filter((p): p is { id?: string; title?: string; status?: string } => isRecord(p) && typeof p.id === "string" && p.id.length > 0)
    .map((p) => ({ id: p.id as string, title: typeof p.title === "string" ? p.title : (p.id as string), status: typeof p.status === "string" ? p.status : "prepared" }));

  const source: IntentStatusReportSource = {
    preparedIntentPlanRef: planRef,
    approvedPreparedIntentPlanRef: planRef,
    ...(prevRef ? { previousIntentStatusReportRef: prevRef } : {}),
    ...(input.pathFreshnessReportRef ? { pathFreshnessReportRef: input.pathFreshnessReportRef } : {}),
    ...(input.runtimeGraphDriftReportRef ? { runtimeGraphDriftReportRef: input.runtimeGraphDriftReportRef } : {}),
    ...(isRecord(prev?.source) && prev!.source!.intentAssessmentReportRef ? { intentAssessmentReportRef: prev!.source!.intentAssessmentReportRef } : {}),
  };

  const proof: IntentStatusProof = {
    preparation: {
      present: true,
      status: "prepared",
      approvalStatus: "approved",
      phases: Array.isArray(plan!.phases) ? plan!.phases.length : 0,
      obligations: Array.isArray(plan!.obligations) ? plan!.obligations.length : 0,
      verificationRequirements: Array.isArray(plan!.verificationRequirements) ? plan!.verificationRequirements.length : 0,
      ...(acceptedRisks.length > 0 ? { acceptedRisks: acceptedRisks as IntentOperatorAcceptedRisk[] } : {}),
    },
    ...(input.pathFreshnessReport ? { freshness: { present: true, stale: false } } : {}),
    ...(input.runtimeGraphDriftReport
      ? { runtimeDrift: { present: true, highSeverityOpen: 0, addedObserved: 0, uncoveredHandoff: 0, unresolvedContract: 0 } }
      : {}),
  };

  const request: IntentStatusReportRequest = {};
  if (planGoal.length > 0) request.goal = planGoal;
  const planKind = typeof plan!.request?.kind === "string" ? plan!.request!.kind : "";
  if (planKind.length > 0) request.kind = planKind;

  const report = createIntentStatusReport({
    header: input.header,
    source,
    ...(Object.keys(request).length > 0 ? { request } : {}),
    status: { value: "work-ready", recommendedNextAction: "create-work-order" },
    phases,
    proof,
    blockers: [],
    warnings: [],
    staleInputs: [],
    missingInputs: [],
  } as IntentStatusReport);

  return { status: "work-ready", intentStatusReport: report, blockers: [] };
}

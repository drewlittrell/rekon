// Intent operator approval helper (slice 123).
//
// `buildApprovedPreparedIntentPlan(input)` turns a needs-review draft
// `PreparedIntentPlan` into a **new approved revision** after a human operator
// explicitly accepts the plan's known proof gaps and the helper rechecks
// freshness / runtime drift / status context. It is the pure projection behind
// the `rekon intent approve` CLI command.
//
// **Boundary.** This helper is a pure function. It reads no files, writes no
// artifacts, executes no commands, runs no Circe, and mutates none of its
// inputs. It does not auto-approve: an approval is produced only when an
// operator passes an explicit `reason` and accepts every required proof gap.
// The approved revision it returns enables — but does not create — the WorkOrder
// and VerificationPlan handoffs (`downstreamHandoff.workOrderAllowed` /
// `verificationPlanAllowed` flip to `true`; `sourceWriteAllowed` stays the
// literal `false`). It creates no WorkOrder / VerificationPlan / VerificationRun
// / VerificationResult, and `intent:go` remains deferred.
//
// The CLI resolves and passes the source plan, the IntentStatusReport, and the
// optional PathFreshnessReport / RuntimeGraphDriftReport (plus their refs); it
// builds the artifact header; it writes exactly one new artifact on approval and
// leaves the source draft untouched.
//
// See:
// - docs/strategy/intent-operator-approval-proof-acceptance-decision.md
// - docs/strategy/intent-operator-approval-proof-acceptance-implementation.md
// - docs/concepts/prepared-intent-plan.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type IntentOperatorAcceptedRisk,
  type IntentOperatorAcceptedRiskCategory,
  type PreparedIntentPlan,
  type PreparedIntentPlanApproval,
  type PreparedIntentPlanApprovalProof,
  type PreparedIntentPlanApprovalReason,
  createPreparedIntentPlan,
} from "@rekon/kernel-repo-model";

// ---------------------------------------------------------------------------
// Known accepted-gap vocabulary
// ---------------------------------------------------------------------------

/** The proof gaps an operator may explicitly accept via `--accept`. */
export type IntentApprovalAcceptedGap =
  | "verification-proof-missing"
  | "runtime-drift-unresolved"
  | "handoff-coverage-not-evaluated"
  | "freshness-not-proven"
  | "manual-review-required";

const KNOWN_ACCEPTED_GAPS = new Set<string>([
  "verification-proof-missing",
  "runtime-drift-unresolved",
  "handoff-coverage-not-evaluated",
  "freshness-not-proven",
  "manual-review-required",
]);

/**
 * Map a source-plan `approval.reasons` entry to the accepted-gap id it requires.
 * Reasons not present here (e.g. `assessment-ready-for-prepare`,
 * `explicit-operator-approval`) impose no required gap.
 */
const REASON_TO_REQUIRED_GAP: Record<string, IntentApprovalAcceptedGap> = {
  "verification-proof-missing": "verification-proof-missing",
  "runtime-drift-unresolved": "runtime-drift-unresolved",
  "handoff-coverage-unresolved": "handoff-coverage-not-evaluated",
  "stale-assessment": "freshness-not-proven",
};

const GAP_MESSAGE: Record<IntentApprovalAcceptedGap, string> = {
  "verification-proof-missing":
    "Operator accepted that verification proof results are not yet present.",
  "runtime-drift-unresolved":
    "Operator accepted unresolved runtime drift at approval time.",
  "handoff-coverage-not-evaluated":
    "Operator accepted that handoff coverage was not evaluated.",
  "freshness-not-proven":
    "Operator accepted that scoped path freshness was not independently proven.",
  "manual-review-required":
    "Operator accepted that manual review stands in for automated proof.",
};

// ---------------------------------------------------------------------------
// Blocker model
// ---------------------------------------------------------------------------

export type IntentApprovalBlockerCategory =
  | "missing-prepared-plan"
  | "missing-prepared-plan-ref"
  | "plan-already-approved"
  | "plan-not-needs-review"
  | "plan-not-implementation-bearing"
  | "missing-verification-requirements"
  | "missing-intent-status"
  | "missing-intent-status-ref"
  | "status-has-high-blocker"
  | "status-incompatible"
  | "unknown-accepted-gap"
  | "missing-required-accepted-gap"
  | "missing-approval-reason"
  | "freshness-stale"
  | "new-high-runtime-drift"
  | "source-write-boundary";

export type IntentApprovalBlocker = {
  id: string;
  category: IntentApprovalBlockerCategory;
  message: string;
  sourceRefs?: ArtifactRef[];
};

// ---------------------------------------------------------------------------
// Structural ("Like") input views — read by shape; no class dependencies.
// ---------------------------------------------------------------------------

export type IntentApprovalSourcePlanLike = {
  header?: { artifactId?: string } & Record<string, unknown>;
  request?: Record<string, unknown>;
  source?: Record<string, unknown>;
  status?: { value?: string; recommendedNextAction?: string };
  approval?: {
    status?: string;
    reasons?: unknown;
    proof?: Record<string, unknown>;
    blockers?: unknown;
    acceptedRisks?: unknown;
  };
  phases?: unknown;
  obligations?: unknown;
  verificationRequirements?: unknown;
  blockedReasons?: unknown;
};

export type IntentApprovalIntentStatusLike = {
  header?: ArtifactHeader;
  status?: { value?: string; recommendedNextAction?: string };
  blockers?: Array<{ id?: string; severity?: string; message?: string }>;
};

export type IntentApprovalPathFreshnessLike = {
  header?: ArtifactHeader;
  status?: string;
  entries?: Array<{ status?: string }>;
};

export type IntentApprovalRuntimeDriftLike = {
  header?: ArtifactHeader;
  rows?: Array<{ status?: string; severity?: string }>;
};

export type BuildApprovedPreparedIntentPlanInput = {
  /** Header for the new approved PreparedIntentPlan revision (CLI-built). */
  header: ArtifactHeader;
  /** The source needs-review draft plan, read by shape. */
  preparedIntentPlan?: IntentApprovalSourcePlanLike;
  preparedIntentPlanRef?: ArtifactRef;
  /** The gating IntentStatusReport, read by shape. */
  intentStatusReport?: IntentApprovalIntentStatusLike;
  intentStatusReportRef?: ArtifactRef;
  /** Optional handoff-time freshness recheck. */
  pathFreshnessReport?: IntentApprovalPathFreshnessLike;
  pathFreshnessReportRef?: ArtifactRef;
  /** Optional handoff-time runtime-drift recheck. */
  runtimeGraphDriftReport?: IntentApprovalRuntimeDriftLike;
  runtimeGraphDriftReportRef?: ArtifactRef;
  /** The proof gaps the operator explicitly accepts (`--accept`). */
  acceptedGaps?: string[];
  /** Why the operator accepts the gaps (`--reason`); required. */
  reason?: string;
  /** Optional operator identity (`--accepted-by`). */
  acceptedBy?: string;
  /** Timestamp recorded on accepted risks (CLI passes the current time). */
  acceptedAt: string;
};

export type IntentApprovalResult = {
  status: "approved" | "blocked";
  blockers: IntentApprovalBlocker[];
  /** The accepted-risk records (computed even when blocked, for transparency). */
  acceptedRisks: IntentOperatorAcceptedRisk[];
  /** The gaps the source plan required the operator to accept. */
  requiredGaps: IntentApprovalAcceptedGap[];
  /** The known gaps the operator actually accepted. */
  acceptedGaps: IntentApprovalAcceptedGap[];
  /** The new approved PreparedIntentPlan revision — present only when approved. */
  preparedIntentPlan?: PreparedIntentPlan;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** Mirrors prepared-intent-plan.ts `freshnessIsStale`. */
function freshnessIsStale(report: IntentApprovalPathFreshnessLike | undefined): boolean {
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
function countHighUnresolvedDrift(report: IntentApprovalRuntimeDriftLike | undefined): number {
  if (!report || !Array.isArray(report.rows)) return 0;
  let count = 0;
  for (const row of report.rows) {
    if (!row) continue;
    if (row.severity === "high" && row.status !== "in-sync" && row.status !== "not-evaluated") count += 1;
  }
  return count;
}

// ---------------------------------------------------------------------------
// buildApprovedPreparedIntentPlan
// ---------------------------------------------------------------------------

export function buildApprovedPreparedIntentPlan(
  input: BuildApprovedPreparedIntentPlanInput,
): IntentApprovalResult {
  const blockers: IntentApprovalBlocker[] = [];
  const push = (
    id: string,
    category: IntentApprovalBlockerCategory,
    message: string,
    sourceRefs?: ArtifactRef[],
  ): void => {
    blockers.push({ id, category, message, ...(sourceRefs && sourceRefs.length > 0 ? { sourceRefs } : {}) });
  };

  const plan = input.preparedIntentPlan;
  const planRef = input.preparedIntentPlanRef;
  const planRefs = planRef ? [planRef] : undefined;
  const status = input.intentStatusReport;
  const statusRef = input.intentStatusReportRef;
  const statusRefs = statusRef ? [statusRef] : undefined;

  // ---- Source plan presence ----
  if (!isRecord(plan)) {
    push("missing-prepared-plan", "missing-prepared-plan", "A needs-review PreparedIntentPlan is required to approve.");
  }
  if (!planRef) {
    push("missing-prepared-plan-ref", "missing-prepared-plan-ref", "A PreparedIntentPlan ref is required.");
  }

  const approvalStatus = plan?.approval?.status;
  const planStatusValue = plan?.status?.value;

  // ---- Must be a needs-review draft (not already approved) ----
  if (plan && approvalStatus === "approved") {
    push("plan-already-approved", "plan-already-approved", "The PreparedIntentPlan is already approved; nothing to approve.", planRefs);
  } else if (plan && (approvalStatus !== "needs-review" || planStatusValue !== "needs-review")) {
    push(
      "plan-not-needs-review",
      "plan-not-needs-review",
      "Operator approval requires a needs-review PreparedIntentPlan (approval.status and status.value must both be needs-review).",
      planRefs,
    );
  }

  // ---- Implementation-bearing phases ----
  const phases = Array.isArray(plan?.phases) ? plan!.phases : [];
  const phaseKinds = new Set<string>();
  for (const phase of phases) {
    if (isRecord(phase) && typeof phase.kind === "string") phaseKinds.add(phase.kind);
  }
  const implementationBearing = phaseKinds.has("modify") || phaseKinds.has("implement") || phaseKinds.has("refactor");
  if (plan && !implementationBearing) {
    push(
      "plan-not-implementation-bearing",
      "plan-not-implementation-bearing",
      "Operator approval requires an implementation-bearing plan (at least one modify, implement, or refactor phase).",
      planRefs,
    );
  }

  // ---- Verification requirements present for implementation work ----
  const verificationRequirements = Array.isArray(plan?.verificationRequirements) ? plan!.verificationRequirements : [];
  if (plan && implementationBearing && verificationRequirements.length === 0) {
    push(
      "missing-verification-requirements",
      "missing-verification-requirements",
      "An implementation-bearing plan must carry verification requirements before it can be approved.",
      planRefs,
    );
  }

  // ---- IntentStatusReport presence + gate ----
  if (!isRecord(status)) {
    push("missing-intent-status", "missing-intent-status", "An IntentStatusReport is required to approve.");
  }
  if (!statusRef) {
    push("missing-intent-status-ref", "missing-intent-status-ref", "An IntentStatusReport ref is required.");
  }
  const statusBlockers = Array.isArray(status?.blockers) ? status!.blockers : [];
  if (status && statusBlockers.some((b) => isRecord(b) && b.severity === "high")) {
    push("status-has-high-blocker", "status-has-high-blocker", "IntentStatusReport has a high-severity blocker; resolve it before approval.", statusRefs);
  }
  const intentStatusValue = status?.status?.value;
  if (status && typeof intentStatusValue === "string" && intentStatusValue !== "needs-review" && intentStatusValue !== "work-ready") {
    push(
      "status-incompatible",
      "status-incompatible",
      `IntentStatusReport status.value must be needs-review or work-ready to approve; got ${intentStatusValue}.`,
      statusRefs,
    );
  }

  // ---- Accepted gaps vs required gaps ----
  const sourceReasons: string[] = Array.isArray(plan?.approval?.reasons)
    ? (plan!.approval!.reasons as unknown[]).filter((r): r is string => typeof r === "string")
    : [];
  const requiredGaps = uniqueStrings(
    sourceReasons.map((r) => REASON_TO_REQUIRED_GAP[r]).filter((g): g is IntentApprovalAcceptedGap => Boolean(g)),
  ) as IntentApprovalAcceptedGap[];

  const acceptedRaw = Array.isArray(input.acceptedGaps)
    ? input.acceptedGaps.filter((g): g is string => typeof g === "string" && g.length > 0)
    : [];
  const acceptedAll = uniqueStrings(acceptedRaw);
  for (const gap of acceptedAll) {
    if (!KNOWN_ACCEPTED_GAPS.has(gap)) {
      push(
        `unknown-accepted-gap:${gap}`,
        "unknown-accepted-gap",
        `Unknown accepted gap "${gap}". Known gaps: ${[...KNOWN_ACCEPTED_GAPS].join(", ")}.`,
      );
    }
  }
  const acceptedGaps = acceptedAll.filter((g): g is IntentApprovalAcceptedGap => KNOWN_ACCEPTED_GAPS.has(g));
  for (const gap of requiredGaps) {
    if (!acceptedGaps.includes(gap)) {
      push(
        `missing-required-accepted-gap:${gap}`,
        "missing-required-accepted-gap",
        `The source plan requires explicitly accepting "${gap}" before approval.`,
        planRefs,
      );
    }
  }

  // ---- Reason required ----
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason) {
    push("missing-approval-reason", "missing-approval-reason", "An approval --reason is required to record why the proof gaps are accepted.");
  }

  // ---- Handoff-time freshness recheck ----
  const freshnessRefs = input.pathFreshnessReportRef ? [input.pathFreshnessReportRef] : undefined;
  if (freshnessIsStale(input.pathFreshnessReport)) {
    push("freshness-stale", "freshness-stale", "Scoped context is stale at approval time; refresh context before approving.", freshnessRefs);
  }

  // ---- Handoff-time runtime-drift recheck ----
  const driftRefs = input.runtimeGraphDriftReportRef ? [input.runtimeGraphDriftReportRef] : undefined;
  if (countHighUnresolvedDrift(input.runtimeGraphDriftReport) > 0 && !acceptedGaps.includes("runtime-drift-unresolved")) {
    push(
      "new-high-runtime-drift",
      "new-high-runtime-drift",
      "New high-severity runtime drift detected at approval time; accept runtime-drift-unresolved or resolve it before approving.",
      driftRefs,
    );
  }

  // ---- Source-write boundary guard ----
  const srcDownstream = isRecord(plan?.approval?.proof?.downstreamHandoff)
    ? (plan!.approval!.proof!.downstreamHandoff as Record<string, unknown>)
    : undefined;
  if (plan && srcDownstream && srcDownstream.sourceWriteAllowed !== false) {
    push("source-write-boundary", "source-write-boundary", "The source plan approval proof must keep sourceWriteAllowed === false.", planRefs);
  }

  // ---- Accepted-risk records (built regardless of outcome) ----
  const riskSourceRefs: ArtifactRef[] = [planRef, statusRef, input.pathFreshnessReportRef, input.runtimeGraphDriftReportRef].filter(
    (r): r is ArtifactRef => Boolean(r),
  );
  const acceptedRisks: IntentOperatorAcceptedRisk[] = acceptedGaps.map((gap) => {
    const risk: IntentOperatorAcceptedRisk = {
      id: `accepted:${gap}`,
      category: gap as IntentOperatorAcceptedRiskCategory,
      message: GAP_MESSAGE[gap],
      acceptedAt: input.acceptedAt,
      reason,
      sourceRefs: riskSourceRefs,
    };
    if (input.acceptedBy && input.acceptedBy.length > 0) risk.acceptedBy = input.acceptedBy;
    return risk;
  });

  if (blockers.length > 0) {
    return { status: "blocked", blockers, acceptedRisks, requiredGaps, acceptedGaps };
  }

  // ---- Build the new approved revision (only reached when the gate passes) ----
  const srcProof = isRecord(plan!.approval?.proof) ? (plan!.approval!.proof as Record<string, unknown>) : {};
  const srcRuntimeDrift = isRecord(srcProof.runtimeDrift) ? (srcProof.runtimeDrift as Record<string, unknown>) : {};
  const srcCoverage = isRecord(srcProof.handoffCoverage) ? (srcProof.handoffCoverage as Record<string, unknown>) : {};
  const srcFreshness = isRecord(srcProof.freshness) ? (srcProof.freshness as Record<string, unknown>) : {};

  const approvedProof = {
    ...srcProof,
    runtimeDrift: {
      ...srcRuntimeDrift,
      accepted: acceptedGaps.includes("runtime-drift-unresolved") ? true : srcRuntimeDrift.accepted === true,
    },
    handoffCoverage: {
      ...srcCoverage,
      accepted: acceptedGaps.includes("handoff-coverage-not-evaluated") ? true : srcCoverage.accepted === true,
    },
    freshness: {
      ...srcFreshness,
      accepted: acceptedGaps.includes("freshness-not-proven") ? true : srcFreshness.accepted === true,
    },
    downstreamHandoff: {
      workOrderAllowed: true,
      verificationPlanAllowed: true,
      sourceWriteAllowed: false as const,
    },
  } as unknown as PreparedIntentPlanApprovalProof;

  const reasons = uniqueStrings([
    ...sourceReasons,
    "explicit-operator-approval",
    ...(acceptedGaps.length > 0 ? ["manual-risk-acceptance"] : []),
  ]) as PreparedIntentPlanApprovalReason[];

  const approval: PreparedIntentPlanApproval = {
    status: "approved",
    reasons,
    proof: approvedProof,
    blockers: [],
    acceptedRisks,
  };

  const approvedPlan = createPreparedIntentPlan({
    header: input.header,
    source: (plan!.source ?? {}) as PreparedIntentPlan["source"],
    request: (plan!.request ?? {}) as PreparedIntentPlan["request"],
    status: { value: "prepared", recommendedNextAction: "create-work-order" },
    approval,
    phases: (plan!.phases ?? []) as PreparedIntentPlan["phases"],
    obligations: (plan!.obligations ?? []) as PreparedIntentPlan["obligations"],
    verificationRequirements: (plan!.verificationRequirements ?? []) as PreparedIntentPlan["verificationRequirements"],
    blockedReasons: [],
  } as PreparedIntentPlan);

  return {
    status: "approved",
    blockers: [],
    acceptedRisks,
    requiredGaps,
    acceptedGaps,
    preparedIntentPlan: approvedPlan,
  };
}

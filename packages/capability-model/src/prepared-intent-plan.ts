// PreparedIntentPlan v1 builder (amended with the approval/proof envelope).
//
// A read-only phase/gate preparation artifact generated from an
// `IntentAssessmentReport` plus the existing Rekon context spine. It turns a
// safe assessment into planned phases, touched paths, capability / step /
// handoff / drift obligations, preservation constraints, proposed verification
// requirements, and a required **approval/proof envelope**. A plan reaches
// `status.value === "prepared"` only when `approval.status === "approved"`.
//
// **Boundary.** This is phase/gate preparation, **not** WorkOrder. It creates
// no `WorkOrder` / `VerificationPlan`, executes no commands, writes no source,
// and mutates no input. **Verification requirements are proof obligations, not
// VerificationPlan.** `IntentStatusReport` remains the next layer; `intent:go`
// remains deferred; source-write behavior remains unavailable
// (`approval.proof.downstreamHandoff.sourceWriteAllowed` is the literal
// `false`).
//
// The builder consumes only materialized artifacts passed as values; it reads
// no files. The CLI resolves the inputs and passes them (and their refs) in.
//
// See:
// - docs/strategy/prepared-intent-plan-v1-decision.md
// - docs/strategy/prepared-intent-plan-approval-proof-decision.md
// - docs/artifacts/prepared-intent-plan.md
// - docs/concepts/prepared-intent-plan.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type PreparedIntentObligation,
  type PreparedIntentObligationCategory,
  type PreparedIntentPhase,
  type PreparedIntentPlan,
  type PreparedIntentPlanApproval,
  type PreparedIntentPlanApprovalProof,
  type PreparedIntentPlanApprovalReason,
  type PreparedIntentPlanApprovalStatus,
  type PreparedIntentPlanRecommendedNextAction,
  type PreparedIntentPlanRequest,
  type PreparedIntentPlanSource,
  type PreparedIntentPlanStatus,
  type PreparedIntentSeverity,
  type PreparedIntentVerificationRequirement,
  createPreparedIntentPlan,
} from "@rekon/kernel-repo-model";

/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const PREPARED_INTENT_PLAN_ARTIFACT_ID_PREFIX = "prepared-intent-plan-";

/** Structural view of the source assessment (read by shape; no class deps). */
export type PreparedIntentAssessmentReportLike = {
  header?: ArtifactHeader;
  request?: {
    goal?: string;
    kind?: string;
    scope?: { paths?: string[]; systems?: string[]; capabilities?: string[]; steps?: string[] };
  };
  readiness?: { status?: string; recommendedNextAction?: string };
  matchedContext?: { systems?: string[]; capabilities?: string[]; steps?: string[]; paths?: string[] };
  blockers?: Array<{ id?: string; category?: string; severity?: string; message?: string }>;
  warnings?: Array<{ id?: string; category?: string; severity?: string; message?: string }>;
};

export type PreparedIntentCapabilityMapLike = { header?: ArtifactHeader };
export type PreparedIntentStepGraphLike = { header?: ArtifactHeader };
export type PreparedIntentHandoffCoverageReportLike = {
  header?: ArtifactHeader;
  summary?: { uncovered?: number; unresolvedContract?: number; notEvaluated?: number };
};
export type PreparedIntentRuntimeDriftReportLike = {
  header?: ArtifactHeader;
  rows?: Array<{ status?: string; severity?: string }>;
};
export type PreparedIntentPathFreshnessReportLike = {
  header?: ArtifactHeader;
  status?: string;
  entries?: Array<{ status?: string }>;
};
export type PreparedIntentVerificationResultLike = {
  header?: ArtifactHeader;
  status?: string;
};

export type BuildPreparedIntentPlanInput = {
  header: ArtifactHeader;
  intentAssessmentReport: PreparedIntentAssessmentReportLike;
  intentAssessmentReportRef?: ArtifactRef;

  capabilityMap?: PreparedIntentCapabilityMapLike;
  capabilityMapRef?: ArtifactRef;
  capabilityContract?: unknown;
  capabilityContractRef?: ArtifactRef;
  stepCapabilityGraph?: PreparedIntentStepGraphLike;
  stepCapabilityGraphRef?: ArtifactRef;
  handoffContractRef?: ArtifactRef;
  handoffCoverageReport?: PreparedIntentHandoffCoverageReportLike;
  handoffCoverageReportRef?: ArtifactRef;
  runtimeGraphObservationReportRef?: ArtifactRef;
  runtimeGraphDriftReport?: PreparedIntentRuntimeDriftReportLike;
  runtimeGraphDriftReportRef?: ArtifactRef;
  findingReportRef?: ArtifactRef;
  pathFreshnessReport?: PreparedIntentPathFreshnessReportLike;
  pathFreshnessReportRef?: ArtifactRef;
  verificationResult?: PreparedIntentVerificationResultLike;
  verificationResultRef?: ArtifactRef;
};

const ASSESSMENT_READINESS_TO_STATUS: Record<string, PreparedIntentPlanStatus> = {
  "ready-for-prepare": "prepared",
  blocked: "blocked",
  "needs-review": "needs-review",
  "insufficient-context": "insufficient-assessment",
  "stale-context": "stale-assessment",
};

const STATUS_TO_NEXT_ACTION: Record<PreparedIntentPlanStatus, PreparedIntentPlanRecommendedNextAction> = {
  prepared: "create-work-order",
  blocked: "resolve-blockers",
  "needs-review": "human-review",
  "stale-assessment": "refresh-context",
  "insufficient-assessment": "run-assessment",
};

// Assessment blocker/warning category → obligation category. Categories with no
// direct obligation (missing-artifact, scope-ambiguous) map to "verification"
// so blocked reasons keep a valid category; the original message is preserved.
const ASSESSMENT_CATEGORY_TO_OBLIGATION: Record<string, PreparedIntentObligationCategory> = {
  "runtime-drift": "runtime-drift",
  "handoff-coverage": "handoff-preservation",
  "proof-missing": "verification",
  "stale-context": "freshness",
  "finding-governance": "finding-governance",
  "source-write-unavailable": "source-write-boundary",
  "missing-artifact": "verification",
  "scope-ambiguous": "verification",
};

const OBLIGATION_MESSAGE: Record<PreparedIntentObligationCategory, string> = {
  "capability-preservation": "Preserve existing capability contracts for the touched capabilities.",
  "step-preservation": "Preserve existing step topology for the touched steps.",
  "handoff-preservation": "Preserve declared handoff coverage; resolve uncovered or unresolved handoffs.",
  "runtime-drift": "Resolve or account for runtime graph drift before implementing.",
  "finding-governance": "Respect the finding-governance lifecycle for affected findings.",
  freshness: "Refresh stale context before relying on it.",
  verification: "Provide verification proof for the change.",
  "source-write-boundary": "Preparation authorizes no source writes; downstream work must respect the source-write boundary.",
};

const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const MODIFY_KINDS = new Set<string>(["bug", "feature", "migration"]);
const VERIFY_KINDS = new Set<string>(["bug", "feature", "refactor", "migration"]);
const IMPLEMENTATION_KINDS = new Set<string>(["bug", "feature", "refactor", "migration"]);

// Assessment warning category → blocking approval reason, used when the
// assessment is `needs-review`.
const WARNING_CATEGORY_TO_APPROVAL_REASON: Record<string, PreparedIntentPlanApprovalReason> = {
  "handoff-coverage": "handoff-coverage-unresolved",
  "runtime-drift": "runtime-drift-unresolved",
  "proof-missing": "verification-proof-missing",
  "stale-context": "stale-assessment",
};

// Reasons that block approval (vs the authorizing reasons such as
// `assessment-ready-for-prepare`). Blocking reasons become `approval.blockers`.
const BLOCKING_APPROVAL_REASONS = new Set<PreparedIntentPlanApprovalReason>([
  "blocked-assessment",
  "stale-assessment",
  "insufficient-context",
  "runtime-drift-unresolved",
  "handoff-coverage-unresolved",
  "verification-proof-missing",
]);

const APPROVAL_REASON_OBLIGATION: Record<
  string,
  { category: PreparedIntentObligationCategory; severity: PreparedIntentSeverity; message: string }
> = {
  "blocked-assessment": { category: "verification", severity: "high", message: "The intent assessment is blocked; resolve blockers before preparing." },
  "stale-assessment": { category: "freshness", severity: "high", message: "Context is stale; refresh before preparing." },
  "insufficient-context": { category: "verification", severity: "high", message: "The assessment could not map the request to repo context; run a more specific assessment." },
  "runtime-drift-unresolved": { category: "runtime-drift", severity: "high", message: "Unresolved high-severity runtime graph drift blocks approval." },
  "handoff-coverage-unresolved": { category: "handoff-preservation", severity: "high", message: "Uncovered or unresolved handoff coverage blocks approval." },
  "verification-proof-missing": { category: "verification", severity: "high", message: "Verification requirements or proof are missing for implementation-bearing work." },
};

function strings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) out.push(value);
  }
  return out;
}

function severityOf(value: unknown): PreparedIntentSeverity {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function countHighUnresolvedDrift(report: PreparedIntentRuntimeDriftReportLike | undefined): number {
  if (!report || !Array.isArray(report.rows)) return 0;
  let count = 0;
  for (const row of report.rows) {
    if (!row) continue;
    if (row.severity === "high" && row.status !== "in-sync" && row.status !== "not-evaluated") count += 1;
  }
  return count;
}

function nonNegInt(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function freshnessIsStale(report: PreparedIntentPathFreshnessReportLike | undefined): boolean {
  if (!report) return false;
  if (report.status === "stale") return true;
  if (Array.isArray(report.entries)) {
    for (const entry of report.entries) {
      if (entry && (entry.status === "changed" || entry.status === "missing")) return true;
    }
  }
  return false;
}

function approvalReasonsFromWarnings(
  warnings: PreparedIntentAssessmentReportLike["warnings"],
): PreparedIntentPlanApprovalReason[] {
  const out: PreparedIntentPlanApprovalReason[] = [];
  const seen = new Set<string>();
  for (const warning of warnings ?? []) {
    if (!warning || typeof warning.category !== "string") continue;
    const reason = WARNING_CATEGORY_TO_APPROVAL_REASON[warning.category];
    if (reason && !seen.has(reason)) {
      seen.add(reason);
      out.push(reason);
    }
  }
  return out;
}

function blockersFromReasons(
  reasons: PreparedIntentPlanApprovalReason[],
  refList: ArtifactRef[],
): PreparedIntentObligation[] {
  const out: PreparedIntentObligation[] = [];
  const seen = new Set<string>();
  for (const reason of reasons) {
    if (!BLOCKING_APPROVAL_REASONS.has(reason) || seen.has(reason)) continue;
    seen.add(reason);
    const spec = APPROVAL_REASON_OBLIGATION[reason];
    if (!spec) continue;
    out.push({ id: `approval-blocker:${reason}`, category: spec.category, severity: spec.severity, message: spec.message, sourceRefs: refList });
  }
  return out;
}

export function buildPreparedIntentPlan(input: BuildPreparedIntentPlanInput): PreparedIntentPlan {
  const assessmentRef = input.intentAssessmentReportRef;
  if (!assessmentRef) {
    throw new Error("buildPreparedIntentPlan requires intentAssessmentReportRef.");
  }
  const assessment = input.intentAssessmentReport ?? {};
  const refList: ArtifactRef[] = [assessmentRef];

  const readiness = typeof assessment.readiness?.status === "string" ? assessment.readiness.status : "insufficient-context";
  const baseStatus: PreparedIntentPlanStatus = ASSESSMENT_READINESS_TO_STATUS[readiness] ?? "needs-review";

  // ---- Request (copied from the assessment) ----
  const goal = typeof assessment.request?.goal === "string" && assessment.request.goal.length > 0
    ? assessment.request.goal
    : "Prepare assessed intent";
  const kind = typeof assessment.request?.kind === "string" && assessment.request.kind.length > 0
    ? assessment.request.kind
    : "unknown";
  const request: PreparedIntentPlanRequest = { goal, kind };
  const scopeSource = assessment.request?.scope;
  if (scopeSource) {
    const scope: NonNullable<PreparedIntentPlanRequest["scope"]> = {};
    const p = strings(scopeSource.paths);
    if (p.length > 0) scope.paths = p;
    const s = strings(scopeSource.systems);
    if (s.length > 0) scope.systems = s;
    const c = strings(scopeSource.capabilities);
    if (c.length > 0) scope.capabilities = c;
    const st = strings(scopeSource.steps);
    if (st.length > 0) scope.steps = st;
    if (Object.keys(scope).length > 0) request.scope = scope;
  }

  // ---- Matched context (drives phase context + required-context proof) ----
  const matched = assessment.matchedContext ?? {};
  const paths = strings(matched.paths);
  const systems = strings(matched.systems);
  const capabilities = strings(matched.capabilities);
  const steps = strings(matched.steps);
  const requiredContextPresent = systems.length > 0 || capabilities.length > 0 || steps.length > 0 || paths.length > 0;
  const missingContext = requiredContextPresent ? [] : ["matched-context"];

  // ---- Proof signals read from the context spine values ----
  const driftUnresolvedHigh = countHighUnresolvedDrift(input.runtimeGraphDriftReport);
  const coverageUncovered = nonNegInt(input.handoffCoverageReport?.summary?.uncovered);
  const coverageUnresolved = nonNegInt(input.handoffCoverageReport?.summary?.unresolvedContract);
  const coverageNotEvaluated = nonNegInt(input.handoffCoverageReport?.summary?.notEvaluated);
  const freshnessStale = freshnessIsStale(input.pathFreshnessReport);
  const verificationProofPresent = Boolean(input.verificationResultRef);
  const implementationBearing = IMPLEMENTATION_KINDS.has(kind);

  // ---- Approval status + reasons ----
  const reasons: PreparedIntentPlanApprovalReason[] = [];
  let approvalStatus: PreparedIntentPlanApprovalStatus;
  if (readiness === "ready-for-prepare") {
    const gateReasons: PreparedIntentPlanApprovalReason[] = [];
    if (driftUnresolvedHigh > 0) gateReasons.push("runtime-drift-unresolved");
    if (coverageUncovered > 0 || coverageUnresolved > 0) gateReasons.push("handoff-coverage-unresolved");
    if (freshnessStale) gateReasons.push("stale-assessment");
    if (kind === "unknown") {
      // An unknown-kind request cannot be auto-approved without an explicit
      // operator approval reason (reserved in v1); it requires human review.
      approvalStatus = "needs-review";
      reasons.push("assessment-ready-for-prepare");
    } else if (gateReasons.length > 0) {
      approvalStatus = "not-approved";
      reasons.push(...gateReasons);
    } else {
      approvalStatus = "approved";
      reasons.push("assessment-ready-for-prepare");
    }
  } else if (readiness === "blocked") {
    approvalStatus = "not-approved";
    reasons.push("blocked-assessment");
  } else if (readiness === "stale-context") {
    approvalStatus = "not-approved";
    reasons.push("stale-assessment");
  } else if (readiness === "insufficient-context") {
    approvalStatus = "not-approved";
    reasons.push("insufficient-context");
  } else if (readiness === "needs-review") {
    approvalStatus = "needs-review";
    reasons.push(...approvalReasonsFromWarnings(assessment.warnings));
    if (reasons.length === 0) reasons.push("verification-proof-missing");
  } else {
    approvalStatus = "needs-review";
    reasons.push("verification-proof-missing");
  }

  // ---- Final prepared status (prepared only when approved) ----
  let statusValue: PreparedIntentPlanStatus;
  if (readiness === "ready-for-prepare") {
    statusValue = approvalStatus === "approved" ? "prepared" : approvalStatus === "needs-review" ? "needs-review" : "blocked";
  } else {
    statusValue = baseStatus;
  }
  const recommendedNextAction = STATUS_TO_NEXT_ACTION[statusValue];

  // ---- Obligations ----
  const obligations: PreparedIntentObligation[] = [];
  const obligationCategories = new Set<PreparedIntentObligationCategory>();
  const pushObligation = (category: PreparedIntentObligationCategory, severity: PreparedIntentSeverity): void => {
    if (obligationCategories.has(category)) return;
    obligationCategories.add(category);
    obligations.push({
      id: `obligation:${category}`,
      category,
      severity,
      message: OBLIGATION_MESSAGE[category],
      sourceRefs: refList,
    });
  };

  // Always present: the source-write boundary.
  pushObligation("source-write-boundary", "low");

  // Derived from assessment blockers + warnings (highest severity per category).
  const bestSeverity = new Map<PreparedIntentObligationCategory, PreparedIntentSeverity>();
  for (const signal of [...(assessment.blockers ?? []), ...(assessment.warnings ?? [])]) {
    if (!signal || typeof signal.category !== "string") continue;
    const category = ASSESSMENT_CATEGORY_TO_OBLIGATION[signal.category];
    if (!category || category === "source-write-boundary") continue;
    const severity = severityOf(signal.severity);
    const prev = bestSeverity.get(category);
    if (!prev || (SEVERITY_RANK[severity] ?? 9) < (SEVERITY_RANK[prev] ?? 9)) bestSeverity.set(category, severity);
  }
  for (const [category, severity] of bestSeverity) pushObligation(category, severity);

  // Preservation obligations from touched context.
  if (capabilities.length > 0 || input.capabilityContract || input.capabilityContractRef) {
    pushObligation("capability-preservation", "low");
  }
  if (steps.length > 0) pushObligation("step-preservation", "low");

  // ---- Verification requirements (proof obligations; prepared status only) ----
  const verificationRequirements: PreparedIntentVerificationRequirement[] = [];
  if (statusValue === "prepared") {
    if (VERIFY_KINDS.has(kind)) {
      verificationRequirements.push({ id: "verify:typecheck", command: "npm run typecheck", reason: "Type safety must hold after the change.", sourceRefs: refList });
      verificationRequirements.push({ id: "verify:test", command: "npm run test", reason: "Tests must pass after the change.", sourceRefs: refList });
      verificationRequirements.push({ id: "verify:build", command: "npm run build", reason: "The build must succeed after the change.", sourceRefs: refList });
    } else {
      verificationRequirements.push({ id: "verify:document-findings", reason: "Document investigation findings; no source change is implied.", sourceRefs: refList });
    }
  }

  const obligationIds = obligations.map((obligation) => obligation.id);
  const requirementIds = verificationRequirements.map((requirement) => requirement.id);
  const constraints = ["Preparation authorizes no source writes; downstream work must respect the source-write boundary."];

  const phase = (
    id: string,
    title: string,
    kind2: PreparedIntentPhase["kind"],
    status: PreparedIntentPhase["status"],
    obligationsForPhase: string[],
    requirementsForPhase: string[],
  ): PreparedIntentPhase => ({
    id,
    title,
    kind: kind2,
    status,
    goal,
    paths,
    systems,
    capabilities,
    steps,
    constraints,
    obligations: obligationsForPhase,
    verificationRequirements: requirementsForPhase,
    sourceRefs: refList,
  });

  // ---- Phases (regenerated from the FINAL status) ----
  const phases: PreparedIntentPhase[] = [];
  if (statusValue === "prepared") {
    phases.push(phase("phase:investigate", "Investigate", "investigate", "planned", [], []));
    if (MODIFY_KINDS.has(kind)) {
      phases.push(phase("phase:modify", "Modify", "modify", "planned", obligationIds, []));
    } else if (kind === "refactor") {
      phases.push(phase("phase:refactor", "Refactor", "refactor", "planned", obligationIds, []));
    }
    if (VERIFY_KINDS.has(kind)) {
      phases.push(phase("phase:verify", "Verify", "verify", "planned", [], requirementIds));
    }
    phases.push(phase("phase:review", "Review", "review", "planned", [], []));
  } else if (statusValue === "needs-review") {
    phases.push(phase("phase:review", "Review", "review", "needs-review", obligationIds, []));
  }

  const phaseKinds = new Set(phases.map((entry) => entry.kind));

  // ---- Approval blockers (from blocking reasons) ----
  const approvalBlockers = blockersFromReasons(reasons, refList);

  // ---- Approval proof record ----
  const proof: PreparedIntentPlanApprovalProof = {
    intentAssessmentReportRef: assessmentRef,
    assessmentReadiness: readiness,
    assessmentApprovedForPrepare: readiness === "ready-for-prepare",
    requiredContextPresent,
    missingContext,
    runtimeDrift: {
      accepted: false,
      unresolvedHighSeverity: driftUnresolvedHigh,
    },
    handoffCoverage: {
      accepted: false,
      uncovered: coverageUncovered,
      unresolvedContract: coverageUnresolved,
      notEvaluated: coverageNotEvaluated,
    },
    freshness: {
      accepted: false,
      staleContext: freshnessStale,
    },
    verification: {
      requirementsPresent: verificationRequirements.length > 0,
      proofResultsPresent: verificationProofPresent,
      verificationRefs: input.verificationResultRef ? [input.verificationResultRef] : [],
    },
    planStructure: {
      phasesPresent: phases.length > 0,
      minimumPhaseCountMet: statusValue === "prepared" ? phases.length >= 2 : phases.length >= 1,
      hasInvestigation: phaseKinds.has("investigate"),
      hasImplementationOrRefactor: phaseKinds.has("modify") || phaseKinds.has("refactor"),
      hasVerification: phaseKinds.has("verify"),
      hasReview: phaseKinds.has("review"),
    },
    downstreamHandoff: {
      workOrderAllowed: approvalStatus === "approved",
      verificationPlanAllowed: approvalStatus === "approved",
      sourceWriteAllowed: false,
    },
  };
  if (input.runtimeGraphDriftReportRef) proof.runtimeDrift.runtimeGraphDriftReportRef = input.runtimeGraphDriftReportRef;
  if (input.handoffCoverageReportRef) proof.handoffCoverage.handoffCoverageReportRef = input.handoffCoverageReportRef;
  if (input.pathFreshnessReportRef) proof.freshness.pathFreshnessReportRef = input.pathFreshnessReportRef;
  if (implementationBearing) {
    proof.intakeSufficiency = {
      present: requiredContextPresent,
      satisfied: requiredContextPresent ? ["matched-context"] : [],
      missing: missingContext,
      sourceRefs: refList,
    };
  }

  const approval: PreparedIntentPlanApproval = {
    status: approvalStatus,
    reasons,
    proof,
    blockers: approvalBlockers,
  };

  // ---- Blocked reasons (only when not prepared; reuse approval blockers) ----
  const blockedReasons: PreparedIntentObligation[] = statusValue === "prepared" ? [] : approvalBlockers;

  // ---- Source ----
  const source: PreparedIntentPlanSource = { intentAssessmentReportRef: assessmentRef };
  if (input.capabilityMapRef) source.capabilityMapRef = input.capabilityMapRef;
  if (input.capabilityContractRef) source.capabilityContractRef = input.capabilityContractRef;
  if (input.stepCapabilityGraphRef) source.stepCapabilityGraphRef = input.stepCapabilityGraphRef;
  if (input.handoffContractRef) source.handoffContractRef = input.handoffContractRef;
  if (input.handoffCoverageReportRef) source.handoffCoverageReportRef = input.handoffCoverageReportRef;
  if (input.runtimeGraphObservationReportRef) source.runtimeGraphObservationReportRef = input.runtimeGraphObservationReportRef;
  if (input.runtimeGraphDriftReportRef) source.runtimeGraphDriftReportRef = input.runtimeGraphDriftReportRef;
  if (input.findingReportRef) source.findingReportRef = input.findingReportRef;
  if (input.pathFreshnessReportRef) source.pathFreshnessReportRef = input.pathFreshnessReportRef;
  if (input.verificationResultRef) source.verificationResultRef = input.verificationResultRef;

  // The factory normalizes the request, dedupes + sorts phases (by id),
  // obligations + blocked reasons (severity, category, id), and verification
  // requirements (by id), normalizes the approval/proof envelope, and asserts.
  // No WorkOrder / VerificationPlan; no execution; no source writes.
  return createPreparedIntentPlan({
    header: input.header,
    source,
    request,
    status: { value: statusValue, recommendedNextAction },
    approval,
    phases,
    obligations,
    verificationRequirements,
    blockedReasons,
  });
}

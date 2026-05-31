// PreparedIntentPlan v1 builder.
//
// A read-only phase/gate preparation artifact generated from an
// `IntentAssessmentReport` plus the existing Rekon context spine. It turns a
// safe assessment into planned phases, touched paths, capability / step /
// handoff / drift obligations, preservation constraints, and proposed
// verification requirements.
//
// **Boundary.** This is phase/gate preparation, **not** WorkOrder. It creates
// no `WorkOrder` / `VerificationPlan`, executes no commands, writes no source,
// and mutates no input. **Verification requirements are not VerificationPlan.**
// `IntentStatusReport` remains the next layer; `intent:go` remains deferred;
// source-write behavior remains unavailable.
//
// The builder consumes only materialized artifacts passed as values; it reads
// no files. The CLI resolves the inputs and passes them (and their refs) in.
//
// See:
// - docs/strategy/prepared-intent-plan-v1-decision.md
// - docs/artifacts/prepared-intent-plan.md
// - docs/concepts/prepared-intent-plan.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type PreparedIntentObligation,
  type PreparedIntentObligationCategory,
  type PreparedIntentPhase,
  type PreparedIntentPlan,
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
export type PreparedIntentHandoffCoverageReportLike = { header?: ArtifactHeader };
export type PreparedIntentRuntimeDriftReportLike = { header?: ArtifactHeader };
export type PreparedIntentPathFreshnessReportLike = { header?: ArtifactHeader };
export type PreparedIntentVerificationResultLike = { header?: ArtifactHeader };

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

export function buildPreparedIntentPlan(input: BuildPreparedIntentPlanInput): PreparedIntentPlan {
  const assessmentRef = input.intentAssessmentReportRef;
  if (!assessmentRef) {
    throw new Error("buildPreparedIntentPlan requires intentAssessmentReportRef.");
  }
  const assessment = input.intentAssessmentReport ?? {};
  const refList: ArtifactRef[] = [assessmentRef];

  const readiness = typeof assessment.readiness?.status === "string" ? assessment.readiness.status : "insufficient-context";
  const statusValue: PreparedIntentPlanStatus = ASSESSMENT_READINESS_TO_STATUS[readiness] ?? "needs-review";
  const recommendedNextAction = STATUS_TO_NEXT_ACTION[statusValue];

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

  // ---- Matched context (drives phase context) ----
  const matched = assessment.matchedContext ?? {};
  const paths = strings(matched.paths);
  const systems = strings(matched.systems);
  const capabilities = strings(matched.capabilities);
  const steps = strings(matched.steps);

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

  // ---- Verification requirements (requirements only; prepared status only) ----
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

  // ---- Phases ----
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

  // ---- Blocked reasons (for non-prepared, non-needs-review statuses) ----
  const blockedReasons: PreparedIntentObligation[] = [];
  if (statusValue === "blocked") {
    for (const blocker of assessment.blockers ?? []) {
      if (!blocker || typeof blocker.id !== "string" || blocker.id.length === 0) continue;
      const category = typeof blocker.category === "string"
        ? (ASSESSMENT_CATEGORY_TO_OBLIGATION[blocker.category] ?? "verification")
        : "verification";
      blockedReasons.push({
        id: `blocked:${blocker.id}`,
        category,
        severity: severityOf(blocker.severity),
        message: typeof blocker.message === "string" && blocker.message.length > 0 ? blocker.message : "The intent assessment is blocked.",
        sourceRefs: refList,
      });
    }
    if (blockedReasons.length === 0) {
      blockedReasons.push({ id: "blocked:assessment", category: "verification", severity: "high", message: "The intent assessment is blocked.", sourceRefs: refList });
    }
  } else if (statusValue === "stale-assessment") {
    blockedReasons.push({ id: "blocked:stale-context", category: "freshness", severity: "high", message: "The intent assessment reported stale context; refresh before preparing.", sourceRefs: refList });
  } else if (statusValue === "insufficient-assessment") {
    blockedReasons.push({ id: "blocked:insufficient-context", category: "verification", severity: "high", message: "The intent assessment could not map the request to repo context; run a more specific assessment.", sourceRefs: refList });
  }

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
  // requirements (by id), and asserts. No WorkOrder / VerificationPlan; no
  // execution; no source writes.
  return createPreparedIntentPlan({
    header: input.header,
    source,
    request,
    status: { value: statusValue, recommendedNextAction },
    phases,
    obligations,
    verificationRequirements,
    blockedReasons,
  });
}

// IntentAssessmentReport v1 builder.
//
// A read-only readiness assessment of a user request against the existing
// Rekon context spine (CapabilityMap, StepCapabilityGraph,
// HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, and
// VerificationResult). It emits a readiness status, blockers, warnings,
// missing context, matched context, and a recommended next action.
//
// **Boundary.** This is assessment, **not** WorkOrder. It creates no
// `WorkOrder` / `VerificationPlan`, executes no commands, writes no source,
// and mutates no input. `RuntimeGraphDriftReport` is an input to readiness,
// not the intent system itself. `PreparedIntentPlan` remains the next layer;
// `IntentStatusReport` and `intent:go` remain deferred.
//
// The builder consumes only materialized artifacts passed as values; it reads
// no files. The CLI resolves the input artifacts and passes them (and their
// refs) in.
//
// See:
// - docs/strategy/intent-assessment-report-v1-decision.md
// - docs/artifacts/intent-assessment-report.md
// - docs/concepts/intent-assessment.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type IntentAssessmentBlocker,
  type IntentAssessmentMatchedContext,
  type IntentAssessmentReadiness,
  type IntentAssessmentReadinessBlock,
  type IntentAssessmentRecommendedNextAction,
  type IntentAssessmentReport,
  type IntentAssessmentReportSource,
  type IntentAssessmentRequest,
  createIntentAssessmentReport,
} from "@rekon/kernel-repo-model";

/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const INTENT_ASSESSMENT_REPORT_ARTIFACT_ID_PREFIX = "intent-assessment-report-";

/** Structural views of the consumed inputs (read by shape; no class deps). */
export type IntentAssessmentCapabilityMapLike = {
  header?: ArtifactHeader;
  entries?: Array<{ capability?: string; systems?: string[] }>;
};

export type IntentAssessmentStepGraphLike = {
  header?: ArtifactHeader;
  steps?: Array<{ id?: string; systems?: string[]; paths?: string[] }>;
};

export type IntentAssessmentHandoffCoverageReportLike = {
  header?: ArtifactHeader;
  summary?: {
    uncovered?: number;
    unresolvedContract?: number;
    parseErrors?: number;
    notEvaluated?: number;
  };
};

export type IntentAssessmentRuntimeDriftReportLike = {
  header?: ArtifactHeader;
  summary?: { total?: number; bySeverity?: Record<string, number> };
  rows?: Array<{ id?: string; status?: string; severity?: string; message?: string }>;
};

export type IntentAssessmentPathFreshnessReportLike = {
  header?: ArtifactHeader;
  status?: string;
  entries?: Array<{ path?: string; status?: string }>;
};

export type IntentAssessmentVerificationResultLike = {
  header?: ArtifactHeader;
  status?: string;
};

export type BuildIntentAssessmentReportInput = {
  header: ArtifactHeader;
  request: IntentAssessmentRequest;
  /** When true, absent StepCapabilityGraph / RuntimeGraphDriftReport do not block. */
  allowMissingSpine?: boolean;

  intelligenceSnapshotRef?: ArtifactRef;
  capabilityMap?: IntentAssessmentCapabilityMapLike;
  capabilityMapRef?: ArtifactRef;
  capabilityContractRef?: ArtifactRef;
  stepCapabilityGraph?: IntentAssessmentStepGraphLike;
  stepCapabilityGraphRef?: ArtifactRef;
  handoffContractRef?: ArtifactRef;
  handoffCoverageReport?: IntentAssessmentHandoffCoverageReportLike;
  handoffCoverageReportRef?: ArtifactRef;
  runtimeGraphObservationReportRef?: ArtifactRef;
  runtimeGraphDriftReport?: IntentAssessmentRuntimeDriftReportLike;
  runtimeGraphDriftReportRef?: ArtifactRef;
  findingReportRef?: ArtifactRef;
  bridgeFindingLifecycleIntegrationReportRef?: ArtifactRef;
  pathFreshnessReport?: IntentAssessmentPathFreshnessReportLike;
  pathFreshnessReportRef?: ArtifactRef;
  verificationResult?: IntentAssessmentVerificationResultLike;
  verificationResultRef?: ArtifactRef;
  verificationRunRef?: ArtifactRef;
  verificationPlanRef?: ArtifactRef;
};

const READINESS_NEXT_ACTION: Record<IntentAssessmentReadiness, IntentAssessmentRecommendedNextAction> = {
  "stale-context": "refresh-context",
  blocked: "resolve-blockers",
  "insufficient-context": "ask-clarifying-question",
  "needs-review": "human-review",
  "ready-for-prepare": "prepare-intent",
};

const DRIFT_BLOCKING_STATUSES = new Set<string>([
  "missing-expected",
  "uncovered-handoff",
  "unresolved-contract",
]);

const FRESHNESS_NOT_FRESH = new Set<string>(["changed", "missing"]);

function strings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) out.push(value);
  }
  return out;
}

function pathRelated(a: string, b: string): boolean {
  const na = a.replace(/\/+$/, "");
  const nb = b.replace(/\/+$/, "");
  if (na.length === 0 || nb.length === 0) return false;
  return na === nb || na.startsWith(`${nb}/`) || nb.startsWith(`${na}/`);
}

export function buildIntentAssessmentReport(input: BuildIntentAssessmentReportInput): IntentAssessmentReport {
  const request = input.request ?? ({ goal: "", kind: "unknown" } as IntentAssessmentRequest);
  const scope = request.scope ?? {};

  const blockers: IntentAssessmentBlocker[] = [];
  const warnings: IntentAssessmentBlocker[] = [];
  const missingContext: IntentAssessmentBlocker[] = [];

  // ---- Presence of inputs (value or ref counts as present) ----
  const stepGraphPresent = !!(input.stepCapabilityGraph || input.stepCapabilityGraphRef);
  const driftPresent = !!(input.runtimeGraphDriftReport || input.runtimeGraphDriftReportRef);
  const coveragePresent = !!(input.handoffCoverageReport || input.handoffCoverageReportRef);
  const observationPresent = !!input.runtimeGraphObservationReportRef;
  const proofPresent = !!(input.verificationResult || input.verificationResultRef);
  const capabilityMapPresent = !!(input.capabilityMap || input.capabilityMapRef);

  // ---- Missing required spine → high missing-artifact blockers ----
  if (!stepGraphPresent && !input.allowMissingSpine) {
    blockers.push({
      id: "missing:step-capability-graph",
      category: "missing-artifact",
      severity: "high",
      message: "No StepCapabilityGraph is available; the requested intent cannot be scoped against expected step topology. Run `rekon intent context prepare` (or `rekon step graph build`) after `rekon scan`.",
    });
  }
  if (!driftPresent && !input.allowMissingSpine) {
    blockers.push({
      id: "missing:runtime-graph-drift-report",
      category: "missing-artifact",
      severity: "high",
      message: "No RuntimeGraphDriftReport is available; runtime readiness was not evaluated. Run `rekon intent context prepare` after `rekon scan` to build the intent-readiness context (with no runtime/handoff event log the runtime/handoff context is recorded as not-evaluated, not proof).",
    });
  }

  // ---- Missing optional context → warnings / missing-context ----
  if (!coveragePresent) {
    warnings.push({
      id: "missing:handoff-coverage-report",
      category: "handoff-coverage",
      severity: "medium",
      message: "No HandoffCoverageReport is available; declared-vs-observed handoff coverage was not assessed.",
    });
  }
  if (!observationPresent) {
    warnings.push({
      id: "missing:runtime-graph-observation-report",
      category: "runtime-drift",
      severity: "medium",
      message: "No RuntimeGraphObservationReport is available; observed runtime context was not assessed.",
    });
  }
  if (!proofPresent) {
    warnings.push({
      id: "proof:missing",
      category: "proof-missing",
      severity: "medium",
      message: "No VerificationResult is available; the requested intent has no proof of green checks yet.",
    });
  }
  if (!capabilityMapPresent) {
    missingContext.push({
      id: "missing:capability-map",
      category: "missing-artifact",
      severity: "low",
      message: "No CapabilityMap is available; capability scope was taken from the request only.",
    });
  }

  // ---- Runtime drift rows ----
  if (input.runtimeGraphDriftReport && Array.isArray(input.runtimeGraphDriftReport.rows)) {
    for (const row of input.runtimeGraphDriftReport.rows) {
      if (!row || typeof row.status !== "string" || typeof row.id !== "string" || row.id.length === 0) continue;
      const severity = typeof row.severity === "string" ? row.severity : "low";
      const message = typeof row.message === "string" && row.message.length > 0
        ? row.message
        : `Runtime drift (${row.status}).`;
      if (severity === "high" && DRIFT_BLOCKING_STATUSES.has(row.status)) {
        blockers.push({
          id: `drift:${row.id}`,
          category: "runtime-drift",
          severity: "high",
          message: `Unresolved runtime drift: ${message}`,
          sourceRefs: refList(input.runtimeGraphDriftReportRef),
        });
      } else if (row.status === "added-observed") {
        warnings.push({
          id: `drift:${row.id}`,
          category: "runtime-drift",
          severity: "medium",
          message: `Observed-only runtime edge: ${message}`,
          sourceRefs: refList(input.runtimeGraphDriftReportRef),
        });
      } else if (row.status === "observation-missing") {
        warnings.push({
          id: `drift:${row.id}`,
          category: "runtime-drift",
          severity: "low",
          message: `Runtime observation missing: ${message}`,
          sourceRefs: refList(input.runtimeGraphDriftReportRef),
        });
      }
    }
  }

  // ---- Handoff coverage summary ----
  const coverageSummary = input.handoffCoverageReport?.summary;
  if (coverageSummary) {
    if (numberOr(coverageSummary.unresolvedContract, 0) > 0) {
      blockers.push({
        id: "coverage:unresolved-contract",
        category: "handoff-coverage",
        severity: "high",
        message: "HandoffCoverageReport has unresolved-contract rows; the handoff contract is not fully resolved.",
        sourceRefs: refList(input.handoffCoverageReportRef),
      });
    }
    if (numberOr(coverageSummary.uncovered, 0) > 0) {
      warnings.push({
        id: "coverage:uncovered",
        category: "handoff-coverage",
        severity: "medium",
        message: "HandoffCoverageReport has uncovered declared handoffs; some declared batons were not observed.",
        sourceRefs: refList(input.handoffCoverageReportRef),
      });
    }
    if (numberOr(coverageSummary.parseErrors, 0) > 0) {
      warnings.push({
        id: "coverage:parse-errors",
        category: "handoff-coverage",
        severity: "low",
        message: "HandoffCoverageReport recorded parse errors in the handoff event log.",
        sourceRefs: refList(input.handoffCoverageReportRef),
      });
    }
    if (numberOr(coverageSummary.notEvaluated, 0) > 0) {
      warnings.push({
        id: "coverage:not-evaluated",
        category: "handoff-coverage",
        severity: "low",
        message: "HandoffCoverageReport has not-evaluated handoffs (no event log was available).",
        sourceRefs: refList(input.handoffCoverageReportRef),
      });
    }
  }

  // ---- Path freshness (stale context) ----
  let staleContextRelevant = false;
  const freshness = input.pathFreshnessReport;
  if (freshness) {
    const scopePaths = strings(scope.paths);
    const notFresh = (Array.isArray(freshness.entries) ? freshness.entries : [])
      .filter((entry) => entry && typeof entry.path === "string" && typeof entry.status === "string" && FRESHNESS_NOT_FRESH.has(entry.status))
      .map((entry) => entry.path as string);
    const relevant = notFresh.filter((path) => scopePaths.some((scoped) => pathRelated(path, scoped)));
    if (relevant.length > 0) {
      staleContextRelevant = true;
      blockers.push({
        id: "freshness:scope-stale",
        category: "stale-context",
        severity: "high",
        message: `Request-relevant source paths are stale (${relevant.slice(0, 5).join(", ")}); refresh context before preparing.`,
        sourceRefs: refList(input.pathFreshnessReportRef),
      });
    } else if (notFresh.length > 0 || freshness.status === "stale") {
      warnings.push({
        id: "freshness:stale",
        category: "stale-context",
        severity: "medium",
        message: "Source paths are stale outside the request scope; context may need a refresh.",
        sourceRefs: refList(input.pathFreshnessReportRef),
      });
    }
  }

  // ---- Verification proof ----
  if (input.verificationResult && typeof input.verificationResult.status === "string") {
    const status = input.verificationResult.status;
    if (status === "failed") {
      blockers.push({
        id: "proof:failed",
        category: "proof-missing",
        severity: "high",
        message: "The latest VerificationResult failed; resolve failing checks before preparing.",
        sourceRefs: refList(input.verificationResultRef),
      });
    } else if (status === "partial" || status === "not-run") {
      warnings.push({
        id: "proof:incomplete",
        category: "proof-missing",
        severity: "medium",
        message: `The latest VerificationResult is ${status}; proof is incomplete.`,
        sourceRefs: refList(input.verificationResultRef),
      });
    }
  }

  // ---- Matched context (from request scope, augmented by available artifacts) ----
  const matchedSystems = new Set<string>(strings(scope.systems));
  const matchedCapabilities = new Set<string>(strings(scope.capabilities));
  const matchedSteps = new Set<string>(strings(scope.steps));
  const matchedPaths = new Set<string>(strings(scope.paths));

  if (input.stepCapabilityGraph && Array.isArray(input.stepCapabilityGraph.steps)) {
    for (const step of input.stepCapabilityGraph.steps) {
      if (!step || typeof step.id !== "string" || !matchedSteps.has(step.id)) continue;
      for (const system of strings(step.systems)) matchedSystems.add(system);
      for (const path of strings(step.paths)) matchedPaths.add(path);
    }
  }
  if (input.capabilityMap && Array.isArray(input.capabilityMap.entries)) {
    for (const entry of input.capabilityMap.entries) {
      if (!entry || typeof entry.capability !== "string" || !matchedCapabilities.has(entry.capability)) continue;
      for (const system of strings(entry.systems)) matchedSystems.add(system);
    }
  }

  const matchedContext: IntentAssessmentMatchedContext = {
    systems: [...matchedSystems],
    capabilities: [...matchedCapabilities],
    steps: [...matchedSteps],
    paths: [...matchedPaths],
  };
  const matchedEmpty =
    matchedContext.systems.length === 0 &&
    matchedContext.capabilities.length === 0 &&
    matchedContext.steps.length === 0 &&
    matchedContext.paths.length === 0;

  if (matchedEmpty) {
    missingContext.push({
      id: "scope:ambiguous",
      category: "scope-ambiguous",
      severity: "medium",
      message: "The request scope could not be mapped to any system, capability, step, or path; clarify scope before preparing.",
    });
  }

  // ---- Readiness precedence: stale > blocked > insufficient > needs-review > ready ----
  const hasHighBlocker = blockers.some((blocker) => blocker.severity === "high");
  const hasMediumSignal =
    blockers.length > 0 || warnings.some((warning) => warning.severity !== "low");

  let status: IntentAssessmentReadiness;
  if (staleContextRelevant) {
    status = "stale-context";
  } else if (hasHighBlocker) {
    status = "blocked";
  } else if (matchedEmpty) {
    status = "insufficient-context";
  } else if (hasMediumSignal) {
    status = "needs-review";
  } else {
    status = "ready-for-prepare";
  }

  const readiness: IntentAssessmentReadinessBlock = {
    status,
    recommendedNextAction: READINESS_NEXT_ACTION[status],
  };

  const source: IntentAssessmentReportSource = {};
  assign(source, "intelligenceSnapshotRef", input.intelligenceSnapshotRef);
  assign(source, "capabilityMapRef", input.capabilityMapRef);
  assign(source, "capabilityContractRef", input.capabilityContractRef);
  assign(source, "stepCapabilityGraphRef", input.stepCapabilityGraphRef);
  assign(source, "handoffContractRef", input.handoffContractRef);
  assign(source, "handoffCoverageReportRef", input.handoffCoverageReportRef);
  assign(source, "runtimeGraphObservationReportRef", input.runtimeGraphObservationReportRef);
  assign(source, "runtimeGraphDriftReportRef", input.runtimeGraphDriftReportRef);
  assign(source, "findingReportRef", input.findingReportRef);
  assign(source, "bridgeFindingLifecycleIntegrationReportRef", input.bridgeFindingLifecycleIntegrationReportRef);
  assign(source, "pathFreshnessReportRef", input.pathFreshnessReportRef);
  assign(source, "verificationResultRef", input.verificationResultRef);
  assign(source, "verificationRunRef", input.verificationRunRef);
  assign(source, "verificationPlanRef", input.verificationPlanRef);

  // The factory normalizes the request, dedupes + sorts each blocker list
  // (severity, category, id), sorts matched-context arrays, and asserts. No
  // WorkOrder / VerificationPlan; no execution; no source writes.
  return createIntentAssessmentReport({
    header: input.header,
    request,
    source,
    readiness,
    matchedContext,
    blockers,
    warnings,
    missingContext,
  });
}

function refList(ref: ArtifactRef | undefined): ArtifactRef[] | undefined {
  return ref ? [ref] : undefined;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function assign(source: IntentAssessmentReportSource, key: keyof IntentAssessmentReportSource, ref: ArtifactRef | undefined): void {
  if (ref) source[key] = ref;
}

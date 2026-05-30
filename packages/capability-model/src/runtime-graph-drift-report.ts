// RuntimeGraphDriftReport v1 builder.
//
// Compares the four already-materialized graph artifacts —
// `StepCapabilityGraph` (expected topology), `HandoffContract` (declared
// baton policy), `HandoffCoverageReport` (declared-vs-observed coverage),
// and `RuntimeGraphObservationReport` (observed runtime graph) — into
// expected-vs-observed runtime graph drift rows.
//
// **Boundary.** This is expected-vs-observed runtime graph drift, **not**
// runtime observation, **not** `HandoffCoverageReport`, and **not**
// `PathFreshnessReport` or artifact lineage freshness. v1 reads **no** raw
// handoff event logs directly, re-evaluates **no** coverage, mutates
// nothing, and creates no `WorkOrder` / `VerificationPlan`.
//
// The builder consumes only materialized artifacts passed as values; it
// reads no files and parses no raw event logs. The CLI resolves the input
// artifacts and passes them (and their refs) in.
//
// See:
// - docs/strategy/runtime-graph-drift-report-v1-decision.md
// - docs/artifacts/runtime-graph-drift-report.md
// - docs/concepts/runtime-graph-drift.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type RuntimeGraphDriftReport,
  type RuntimeGraphDriftReportSource,
  type RuntimeGraphDriftRow,
  type RuntimeGraphDriftSeverity,
  type RuntimeGraphDriftStatus,
  createRuntimeGraphDriftReport,
} from "@rekon/kernel-repo-model";

/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const RUNTIME_GRAPH_DRIFT_REPORT_ARTIFACT_ID_PREFIX = "runtime-graph-drift-report-";

/** Structural views of the four inputs (read by shape; no class deps). */
export type RuntimeGraphDriftStepGraphLike = {
  header?: ArtifactHeader;
  steps?: Array<{ id?: string }>;
};

export type RuntimeGraphDriftHandoffContractLike = {
  header?: ArtifactHeader;
  handoffs?: Array<{
    id?: string;
    status?: string;
    fromStepId?: string;
    toStepId?: string;
    feature?: string;
  }>;
};

export type RuntimeGraphDriftCoverageReportLike = {
  header?: ArtifactHeader;
  rows?: Array<{
    id?: string;
    handoffId?: string;
    status?: string;
    feature?: string;
    eventName?: string;
    fromStepId?: string;
    toStepId?: string;
  }>;
};

export type RuntimeGraphDriftObservationReportLike = {
  header?: ArtifactHeader;
  summary?: { observedNodes?: number; observedEdges?: number };
  edges?: Array<{
    id?: string;
    kind?: string;
    fromNodeId?: string;
    toNodeId?: string;
    eventName?: string;
    feature?: string;
  }>;
};

export type BuildRuntimeGraphDriftReportInput = {
  header: ArtifactHeader;
  stepCapabilityGraph?: RuntimeGraphDriftStepGraphLike;
  stepCapabilityGraphRef?: ArtifactRef;
  handoffContract?: RuntimeGraphDriftHandoffContractLike;
  handoffContractRef?: ArtifactRef;
  handoffCoverageReport?: RuntimeGraphDriftCoverageReportLike;
  handoffCoverageReportRef?: ArtifactRef;
  runtimeGraphObservationReport?: RuntimeGraphDriftObservationReportLike;
  runtimeGraphObservationReportRef?: ArtifactRef;
};

const SEVERITY_BY_STATUS: Record<RuntimeGraphDriftStatus, RuntimeGraphDriftSeverity> = {
  "missing-expected": "high",
  "uncovered-handoff": "high",
  "unresolved-contract": "medium",
  "added-observed": "medium",
  "observation-missing": "low",
  "not-evaluated": "low",
  "in-sync": "low",
};

const COVERAGE_STATUS_TO_DRIFT: Record<string, RuntimeGraphDriftStatus> = {
  covered: "in-sync",
  uncovered: "uncovered-handoff",
  "unresolved-contract": "unresolved-contract",
  "added-observed": "added-observed",
  "not-evaluated": "not-evaluated",
};

/**
 * Build a `RuntimeGraphDriftReport` from the four materialized graph
 * artifacts. Reads no files and parses no raw event logs.
 */
export function buildRuntimeGraphDriftReport(
  input: BuildRuntimeGraphDriftReportInput,
): RuntimeGraphDriftReport {
  const rows: RuntimeGraphDriftRow[] = [];

  const { handoffCoverageReportRef: coverageRef, handoffContractRef: contractRef } = input;
  const observationRef = input.runtimeGraphObservationReportRef;
  const coverage = input.handoffCoverageReport;
  const contract = input.handoffContract;
  const observation = input.runtimeGraphObservationReport;

  const observationPresent = !!observation;
  const observedNodes = numberOr(observation?.summary?.observedNodes, 0);
  const observedEdges = numberOr(observation?.summary?.observedEdges, 0);
  const observationEmpty = observationPresent && observedNodes === 0 && observedEdges === 0;

  // Missing/empty observation → observation-missing, never false drift.
  if (!observationPresent || observationEmpty) {
    rows.push(row({
      id: "drift:observation:missing",
      kind: "observation",
      status: "observation-missing",
      message: observationPresent
        ? "RuntimeGraphObservationReport has no observed runtime graph; runtime drift was not evaluated against observed topology."
        : "RuntimeGraphObservationReport is absent; runtime drift was not evaluated against observed topology.",
      evidenceRefs: refList(observationRef),
      observedRef: observationRef,
    }));
  }

  // Coverage status mapping (the primary declared-vs-observed handoff axis).
  const coverageHandoffIds = new Set<string>();
  const coverageAddedEdgeIds = new Set<string>();
  if (!coverage) {
    rows.push(row({
      id: "drift:coverage:not-evaluated",
      kind: "coverage",
      status: "not-evaluated",
      message: "No HandoffCoverageReport available; declared-vs-observed handoff drift was not evaluated.",
      evidenceRefs: [],
    }));
  } else {
    const coverageRows = Array.isArray(coverage.rows) ? coverage.rows : [];
    for (const cr of coverageRows) {
      if (!cr || typeof cr.id !== "string" || cr.id.length === 0) continue;
      if (typeof cr.handoffId === "string" && cr.handoffId.length > 0) coverageHandoffIds.add(cr.handoffId);
      const status = typeof cr.status === "string" ? COVERAGE_STATUS_TO_DRIFT[cr.status] : undefined;
      if (cr.status === "added-observed") {
        const from = optString(cr.fromStepId);
        const to = optString(cr.toStepId);
        if (from && to) coverageAddedEdgeIds.add(`handoff:${slug(from)}:${slug(to)}`);
      }
      if (!status) continue;
      rows.push(row({
        id: `drift:coverage:${cr.id}`,
        kind: "coverage",
        status,
        message: coverageMessage(status),
        handoffId: optString(cr.handoffId),
        coverageRowId: cr.id,
        fromStepId: optString(cr.fromStepId),
        toStepId: optString(cr.toStepId),
        expectedRef: contractRef,
        observedRef: observationRef,
        evidenceRefs: refList(coverageRef),
      }));
    }
  }

  if (observationPresent && !observationEmpty) {
    // Observed handoff edges not represented in the contract or coverage.
    const contractEdgeIds = new Set<string>();
    const contractHandoffs = Array.isArray(contract?.handoffs) ? contract!.handoffs! : [];
    for (const h of contractHandoffs) {
      const from = optString(h?.fromStepId);
      const to = optString(h?.toStepId);
      if (from && to) contractEdgeIds.add(`handoff:${slug(from)}:${slug(to)}`);
    }
    const observedEdgeList = Array.isArray(observation?.edges) ? observation!.edges! : [];
    for (const edge of observedEdgeList) {
      if (!edge || edge.kind !== "handoff" || typeof edge.id !== "string" || edge.id.length === 0) continue;
      if (contractEdgeIds.has(edge.id) || coverageAddedEdgeIds.has(edge.id)) continue;
      rows.push(row({
        id: `drift:observation:${edge.id}`,
        kind: "handoff",
        status: "added-observed",
        message: "Observed handoff edge is not represented in the HandoffContract or HandoffCoverageReport.",
        fromStepId: stripStepPrefix(edge.fromNodeId),
        toStepId: stripStepPrefix(edge.toNodeId),
        observedEdgeId: edge.id,
        observedRef: observationRef,
        evidenceRefs: refList(observationRef),
      }));
    }

    // Declared contract handoffs with no coverage row → missing-expected.
    for (const h of contractHandoffs) {
      if (!h || typeof h.id !== "string" || h.id.length === 0) continue;
      if (h.status !== "declared") continue;
      if (coverageHandoffIds.has(h.id)) continue;
      rows.push(row({
        id: `drift:contract:${h.id}`,
        kind: "contract",
        status: "missing-expected",
        message: "Declared handoff has no coverage row and no observed counterpart.",
        handoffId: h.id,
        fromStepId: optString(h.fromStepId),
        toStepId: optString(h.toStepId),
        expectedRef: contractRef,
        evidenceRefs: refList(contractRef),
      }));
    }
  }

  const source: RuntimeGraphDriftReportSource = {};
  if (input.stepCapabilityGraphRef) source.stepCapabilityGraphRef = input.stepCapabilityGraphRef;
  if (contractRef) source.handoffContractRef = contractRef;
  if (coverageRef) source.handoffCoverageReportRef = coverageRef;
  if (observationRef) source.runtimeGraphObservationReportRef = observationRef;

  // The factory dedupes by id, sorts by (kind, status, id), and recomputes
  // the summary (status buckets + bySeverity). No raw event parsing; no
  // WorkOrder / VerificationPlan.
  return createRuntimeGraphDriftReport({
    header: input.header,
    source,
    summary: {
      total: 0,
      inSync: 0,
      missingExpected: 0,
      addedObserved: 0,
      uncoveredHandoff: 0,
      unresolvedContract: 0,
      observationMissing: 0,
      notEvaluated: 0,
      bySeverity: { low: 0, medium: 0, high: 0 },
    },
    rows,
  });
}

type DriftRowInput = {
  id: string;
  kind: RuntimeGraphDriftRow["kind"];
  status: RuntimeGraphDriftStatus;
  message: string;
  stepId?: string;
  fromStepId?: string;
  toStepId?: string;
  handoffId?: string;
  coverageRowId?: string;
  observedEdgeId?: string;
  expectedRef?: ArtifactRef;
  observedRef?: ArtifactRef;
  evidenceRefs: ArtifactRef[];
};

function row(input: DriftRowInput): RuntimeGraphDriftRow {
  const out: RuntimeGraphDriftRow = {
    id: input.id,
    kind: input.kind,
    status: input.status,
    severity: SEVERITY_BY_STATUS[input.status],
    message: input.message,
    evidenceRefs: input.evidenceRefs,
  };
  for (const field of ["stepId", "fromStepId", "toStepId", "handoffId", "coverageRowId", "observedEdgeId"] as const) {
    const value = input[field];
    if (typeof value === "string" && value.length > 0) out[field] = value;
  }
  if (input.expectedRef) out.expectedRef = input.expectedRef;
  if (input.observedRef) out.observedRef = input.observedRef;
  return out;
}

function coverageMessage(status: RuntimeGraphDriftStatus): string {
  switch (status) {
    case "in-sync":
      return "Declared handoff is covered by an observed handoff event (in sync).";
    case "uncovered-handoff":
      return "Declared handoff is not observed (uncovered) despite a present event log.";
    case "unresolved-contract":
      return "Handoff contract row is unresolved (an unresolved-step handoff).";
    case "added-observed":
      return "Observed handoff event has no declared handoff (added-observed).";
    case "not-evaluated":
      return "Handoff coverage was not evaluated (no event log present).";
    default:
      return "Runtime graph drift row.";
  }
}

function refList(ref: ArtifactRef | undefined): ArtifactRef[] {
  return ref ? [ref] : [];
}

function stripStepPrefix(nodeId: string | undefined): string | undefined {
  if (typeof nodeId !== "string" || nodeId.length === 0) return undefined;
  return nodeId.startsWith("step:") ? nodeId.slice("step:".length) : nodeId;
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

function optString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

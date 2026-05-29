// BridgeFindingLifecycleIntegrationReport v1 builder.
//
// Consumes a `FindingReport`, identifies the bridge-derived findings
// the controlled `rekon capability lint write-findings
// --confirm-finding-write` writer wrote, and emits a **preview**
// artifact (`BridgeFindingLifecycleIntegrationReport`) modeling how
// each one WOULD enter the finding filter / lifecycle / adjudication
// / CoherencyDelta chain.
//
// **Boundary.** This helper is preview, **not**
// `FindingLifecycleReport`. It does **not** read or mutate
// `FindingFilterReport`, `FindingLifecycleReport`,
// `IssueAdjudicationReport`, or `CoherencyDelta`. It creates no
// `WorkOrder` and no `VerificationPlan`. It reads no source files and
// makes no network calls. `initialLifecycleStatus` is a *modeled*
// status (`new` for ready entries), never a written one — and is
// never `resolved` in v1.
//
// Only a separate, explicit lifecycle writer decision may allow
// bridge-derived findings to enter real lifecycle status — and even
// then they flow through the finding filter chain, the status ledger,
// and adjudication like any other finding.
//
// See:
// - docs/strategy/bridge-finding-lifecycle-integration-decision.md
// - docs/concepts/bridge-finding-lifecycle-integration.md
// - docs/artifacts/bridge-finding-lifecycle-integration-report.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type BridgeFindingLifecycleIntegrationEntry,
  type BridgeFindingLifecycleIntegrationReport,
  type BridgeFindingLifecycleIntegrationSource,
  createBridgeFindingLifecycleIntegrationReport,
} from "@rekon/kernel-repo-model";

/** The governed Finding type/category bridge-derived findings carry. */
export const BRIDGE_DERIVED_FINDING_TYPE = "capability_architecture_policy";
/** The `finding.details.source` marker the writer stamps. */
export const BRIDGE_DERIVED_FINDING_SOURCE = "capability-lint-bridge";

/** Stable header `artifactId` prefix; the timestamp piece varies. */
export const BRIDGE_FINDING_LIFECYCLE_INTEGRATION_ARTIFACT_ID_PREFIX
  = "bridge-finding-lifecycle-integration-";

/** Structural view of a governed Finding. capability-model does not
 *  depend on `@rekon/kernel-findings`, so findings are read by shape
 *  (the same fields the writer persists), never by class. */
export type BridgeFindingLifecycleFindingLike = {
  id?: string;
  type?: string;
  category?: string;
  severity?: string;
  title?: string;
  evidence?: ArtifactRef[];
  evidenceRefs?: ArtifactRef[];
  details?: {
    source?: string;
    sourceBridgeCandidateId?: string;
    sourceLintRowId?: string;
    sourceContractId?: string;
    sourcePhraseCapabilityId?: string;
    [key: string]: unknown;
  };
};

export type BridgeFindingLifecycleFindingReportLike = {
  header?: ArtifactHeader;
  findings?: BridgeFindingLifecycleFindingLike[];
};

export type BuildBridgeFindingLifecycleIntegrationReportInput = {
  findingReport: BridgeFindingLifecycleFindingReportLike;
  findingReportRef: ArtifactRef;
  /** Optional context refs — cited in source + header.inputRefs when
   *  provided. v1 reads them only for citation; it does not run the
   *  filter / lifecycle / adjudication chain. */
  filterReport?: unknown;
  filterReportRef?: ArtifactRef;
  lifecycleReport?: unknown;
  lifecycleReportRef?: ArtifactRef;
  issueAdjudicationReport?: unknown;
  issueAdjudicationReportRef?: ArtifactRef;
  generatedAt?: string;
};

/** Structural identification — never relies on title text alone. */
export function isBridgeDerivedFinding(
  finding: BridgeFindingLifecycleFindingLike | undefined,
): boolean {
  if (!finding || typeof finding !== "object") return false;
  if (finding.type === BRIDGE_DERIVED_FINDING_TYPE) return true;
  if (finding.category === BRIDGE_DERIVED_FINDING_TYPE) return true;
  const details = finding.details;
  if (details && typeof details === "object") {
    if (details.source === BRIDGE_DERIVED_FINDING_SOURCE) return true;
    for (
      const field of [
        details.sourceBridgeCandidateId,
        details.sourceLintRowId,
        details.sourceContractId,
        details.sourcePhraseCapabilityId,
      ]
    ) {
      if (typeof field === "string" && field.length > 0) return true;
    }
  }
  return false;
}

function coerceSeverity(value: unknown): "low" | "medium" | "high" {
  if (value === "high" || value === "critical") return "high";
  if (value === "medium") return "medium";
  return "low";
}

function evidenceOf(
  finding: BridgeFindingLifecycleFindingLike,
): ArtifactRef[] {
  if (Array.isArray(finding.evidence)) return finding.evidence;
  if (Array.isArray(finding.evidenceRefs)) return finding.evidenceRefs;
  return [];
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Build a `BridgeFindingLifecycleIntegrationReport` from a
 * `FindingReport`.
 *
 * Only bridge-derived findings are classified; ordinary findings are
 * **omitted** (not included as `ineligible`). For each bridge-derived
 * finding, in `FindingReport.findings` order:
 *
 * - no `evidence` / `evidenceRefs` → `ineligible` (no status);
 * - missing expected bridge trace (`sourceLintRowId` +
 *   `sourceContractId`) → `needs-review` (no status);
 * - a repeat of an earlier ready finding id → `duplicate` (no status);
 * - otherwise → `ready-for-lifecycle` with modeled
 *   `initialLifecycleStatus: "new"`.
 *
 * No entry is ever modeled as `resolved` in v1. The helper mutates
 * nothing and writes nothing.
 */
export function buildBridgeFindingLifecycleIntegrationReport(
  input: BuildBridgeFindingLifecycleIntegrationReportInput,
): BridgeFindingLifecycleIntegrationReport {
  const { findingReport, findingReportRef, generatedAt } = input;

  const findings = Array.isArray(findingReport.findings)
    ? findingReport.findings
    : [];

  const entries: BridgeFindingLifecycleIntegrationEntry[] = [];
  const readyFindingIds = new Set<string>();
  let index = 0;
  for (const finding of findings) {
    if (!isBridgeDerivedFinding(finding)) continue;
    const findingId = str(finding?.id) ?? `bridge-finding-${index}`;
    const details = finding?.details ?? {};
    const severity = coerceSeverity(finding?.severity);
    const evidenceRefs = evidenceOf(finding);
    const entryId = `${findingId}#${index}`;
    index++;

    const base: BridgeFindingLifecycleIntegrationEntry = {
      id: entryId,
      findingId,
      decision: "ineligible",
      severity,
      evidenceRefs,
    };
    const sourceBridgeCandidateId = str(details.sourceBridgeCandidateId);
    const sourceLintRowId = str(details.sourceLintRowId);
    const sourceContractId = str(details.sourceContractId);
    const sourcePhraseCapabilityId = str(details.sourcePhraseCapabilityId);
    if (sourceBridgeCandidateId) base.sourceBridgeCandidateId = sourceBridgeCandidateId;
    if (sourceLintRowId) base.sourceLintRowId = sourceLintRowId;
    if (sourceContractId) base.sourceContractId = sourceContractId;
    if (sourcePhraseCapabilityId) base.sourcePhraseCapabilityId = sourcePhraseCapabilityId;

    if (evidenceRefs.length === 0) {
      base.decision = "ineligible";
      base.messages = [
        "Bridge-derived finding has no evidenceRefs; not eligible for lifecycle.",
      ];
    } else if (!sourceLintRowId || !sourceContractId) {
      base.decision = "needs-review";
      base.messages = [
        "Bridge-derived finding is missing expected trace (sourceLintRowId / sourceContractId); operator review required before lifecycle.",
      ];
    } else if (readyFindingIds.has(findingId)) {
      base.decision = "duplicate";
      base.messages = [
        `Duplicate bridge-derived finding id ${findingId}; the first occurrence is the lifecycle candidate.`,
      ];
    } else {
      base.decision = "ready-for-lifecycle";
      base.initialLifecycleStatus = "new";
      readyFindingIds.add(findingId);
    }

    entries.push(base);
  }

  const source: BridgeFindingLifecycleIntegrationSource = {
    findingReportRef,
  };
  if (input.filterReportRef) source.filterReportRef = input.filterReportRef;
  if (input.lifecycleReportRef) source.lifecycleReportRef = input.lifecycleReportRef;
  if (input.issueAdjudicationReportRef) {
    source.issueAdjudicationReportRef = input.issueAdjudicationReportRef;
  }

  const inputRefs: ArtifactRef[] = [findingReportRef];
  for (
    const ref of [
      input.filterReportRef,
      input.lifecycleReportRef,
      input.issueAdjudicationReportRef,
    ]
  ) {
    if (
      ref
      && !inputRefs.some(
        (existing) => existing.type === ref.type && existing.id === ref.id,
      )
    ) {
      inputRefs.push(ref);
    }
  }

  const header: ArtifactHeader = {
    schemaVersion: "0.1.0",
    artifactType: "BridgeFindingLifecycleIntegrationReport",
    artifactId:
      `${BRIDGE_FINDING_LIFECYCLE_INTEGRATION_ARTIFACT_ID_PREFIX}${Date.now()}`,
    generatedAt: generatedAt ?? new Date().toISOString(),
    subject: findingReport.header?.subject ?? { repoId: "unknown" },
    producer: { id: "@rekon/capability-model", version: "0.1.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 0.85 },
  };

  // The factory dedupes by entry id, sorts by (findingId, id), and
  // recomputes the summary — callers cannot persist a stale summary.
  return createBridgeFindingLifecycleIntegrationReport({
    header,
    source,
    summary: {
      totalBridgeFindings: 0,
      readyForLifecycle: 0,
      filtered: 0,
      needsReview: 0,
      duplicate: 0,
      ineligible: 0,
      bySeverity: {},
    },
    entries,
  });
}

// CapabilityLintFindingBridgeReport v1 builder.
//
// Consumes a published `CapabilityArchitectureLintReport`
// (policy evaluation) and emits a **preview** bridge artifact
// (`CapabilityLintFindingBridgeReport`) classifying each lint
// row as `eligible` / `ineligible` / `needs-review` for a
// future `FindingReport` writer. Eligible rows carry a
// deterministic `proposedFinding` ref describing what a future
// writer *could* emit.
//
// **Boundary.** This helper is preview, **not** `FindingReport`.
// It does **not** write `FindingReport`. It does **not** read
// or mutate `FindingFilterReport`, `FindingLifecycleReport`,
// `IssueAdjudicationReport`, or `CoherencyDelta`. It creates no
// `WorkOrder` and no `VerificationPlan`. It reads no source
// files and makes no network calls. Its only input is the
// `CapabilityArchitectureLintReport`.
//
// Only a separate, explicit `FindingReport` writer decision may
// promote eligible candidates into governed findings — and even
// then they would flow through the finding filter chain, the
// status ledger, and adjudication like any other finding.
//
// See:
// - docs/strategy/capability-lint-finding-bridge-decision.md
// - docs/concepts/capability-lint-finding-bridge.md
// - docs/artifacts/capability-lint-finding-bridge-report.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type CapabilityArchitectureLintReport,
  type CapabilityArchitectureLintRow,
  type CapabilityLintFindingBridgeCandidate,
  type CapabilityLintFindingBridgeReport,
  createCapabilityLintFindingBridgeReport,
} from "@rekon/kernel-repo-model";

export type BuildCapabilityLintFindingBridgeReportInput = {
  lintReport: CapabilityArchitectureLintReport;
  lintReportRef: ArtifactRef;
  /** ISO timestamp used in the artifact header. Defaults to
   *  `new Date().toISOString()` so producers without a
   *  freeze-frame clock still emit valid artifacts. */
  generatedAt?: string;
};

/** Stable prefix for deterministic proposed finding ids. The
 *  full id shape is
 *  `capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`. */
export const CAPABILITY_LINT_FINDING_BRIDGE_FINDING_ID_PREFIX
  = "capability-architecture-policy";

/** Stable header `artifactId` prefix; the timestamp piece
 *  varies, the prefix does not. */
export const CAPABILITY_LINT_FINDING_BRIDGE_ARTIFACT_ID_PREFIX
  = "capability-lint-finding-bridge-";

const ELIGIBLE_CONFIDENCES = new Set<string>(["high", "medium"]);
const ELIGIBLE_SEVERITIES = new Set<string>(["high", "medium"]);

/**
 * Build a `CapabilityLintFindingBridgeReport` from a published
 * `CapabilityArchitectureLintReport`.
 *
 * Eligibility (preview-only). A lint row is `eligible` only
 * when all hold:
 * - `status === "violation"`;
 * - a `findingCandidate` preview exists;
 * - `confidence` is `high` or `medium`;
 * - `severity` is `high` or `medium`;
 * - `evidenceRefs` is non-empty.
 *
 * Otherwise the row is `ineligible` with the first matching
 * reason (`not-a-violation`, `not-evaluated`,
 * `missing-finding-candidate`, `low-confidence`,
 * `low-severity`, or `missing-evidence`).
 *
 * Duplicate detection. Eligible rows compute a deterministic
 * proposed finding id. If two eligible rows produce the same
 * id, the deterministic first keeps it; later duplicates flip
 * to `needs-review` with reason `duplicate-candidate`.
 *
 * Output ordering, summary counts, and the proposed finding id
 * are deterministic: identical input yields byte-identical
 * output (modulo the header timestamp).
 */
export function buildCapabilityLintFindingBridgeReport(
  input: BuildCapabilityLintFindingBridgeReportInput,
): CapabilityLintFindingBridgeReport {
  const { lintReport, lintReportRef, generatedAt } = input;

  // One candidate per lint row, classified by the row's own
  // properties.
  const candidates: CapabilityLintFindingBridgeCandidate[] = [];
  for (const row of lintReport.rows ?? []) {
    if (!row) continue;
    candidates.push(classifyRow(row, lintReportRef));
  }

  // Deterministic duplicate detection. Walk candidates in a
  // stable key order so "first" is reproducible regardless of
  // input ordering. The first eligible candidate to claim a
  // proposed finding id keeps `eligible`; later eligible
  // duplicates flip to needs-review/duplicate-candidate. The
  // objects are shared with `candidates`, so the mutation is
  // visible there too.
  const ordered = [...candidates].sort(byStableKey);
  const seenFindingIds = new Set<string>();
  for (const candidate of ordered) {
    if (candidate.decision !== "eligible" || !candidate.proposedFinding) {
      continue;
    }
    const findingId = candidate.proposedFinding.id;
    if (seenFindingIds.has(findingId)) {
      candidate.decision = "needs-review";
      candidate.reason = "duplicate-candidate";
      candidate.messages = [
        ...(candidate.messages ?? []),
        `Proposed finding id ${findingId} duplicates an earlier eligible row; flagged for review rather than promoted.`,
      ];
    } else {
      seenFindingIds.add(findingId);
    }
  }

  const header: ArtifactHeader = {
    schemaVersion: "0.1.0",
    artifactType: "CapabilityLintFindingBridgeReport",
    artifactId:
      `${CAPABILITY_LINT_FINDING_BRIDGE_ARTIFACT_ID_PREFIX}${Date.now()}`,
    generatedAt: generatedAt ?? new Date().toISOString(),
    subject: lintReport.header.subject,
    producer: {
      id: "@rekon/capability-model",
      version: "0.1.0",
    },
    inputRefs: buildInputRefs(lintReportRef, lintReport),
    freshness: { status: "fresh" },
    provenance: { confidence: 0.85 },
  };

  const source: CapabilityLintFindingBridgeReport["source"] = {
    lintReportRef,
  };
  if (lintReport.source?.capabilityContractRef) {
    source.capabilityContractRef = lintReport.source.capabilityContractRef;
  }
  if (lintReport.source?.capabilityMapRef) {
    source.capabilityMapRef = lintReport.source.capabilityMapRef;
  }

  return createCapabilityLintFindingBridgeReport({
    header,
    source,
    // Summary is recomputed inside the factory; the placeholder
    // exists only because the type requires it.
    summary: {
      totalRows: 0,
      eligible: 0,
      ineligible: 0,
      needsReview: 0,
      byReason: {},
      bySeverity: {},
    },
    candidates,
  });
}

function classifyRow(
  row: CapabilityArchitectureLintRow,
  lintReportRef: ArtifactRef,
): CapabilityLintFindingBridgeCandidate {
  const base = {
    id: row.id,
    lintRowId: row.id,
    contractId: row.contractId,
    phraseCapabilityId: row.phraseCapabilityId ?? "",
    severity: row.severity,
    confidence: row.confidence,
  };

  if (row.status === "pass") {
    return {
      ...base,
      decision: "ineligible",
      reason: "not-a-violation",
      messages: ["Lint row passed; no finding candidate is proposed."],
    };
  }
  if (row.status === "not-evaluated") {
    return {
      ...base,
      decision: "ineligible",
      reason: "not-evaluated",
      messages: [
        "Lint row was not evaluated; no finding candidate is proposed.",
      ],
    };
  }

  // status === "violation" beyond this point.
  if (!row.findingCandidate) {
    return {
      ...base,
      decision: "ineligible",
      reason: "missing-finding-candidate",
      messages: [
        "Violation row has no findingCandidate preview; not eligible to bridge.",
      ],
    };
  }
  if (!ELIGIBLE_CONFIDENCES.has(row.confidence)) {
    return {
      ...base,
      decision: "ineligible",
      reason: "low-confidence",
      messages: [
        `Confidence ${row.confidence} is below the medium/high bridge eligibility threshold.`,
      ],
    };
  }
  if (!ELIGIBLE_SEVERITIES.has(row.severity)) {
    return {
      ...base,
      decision: "ineligible",
      reason: "low-severity",
      messages: [
        `Severity ${row.severity} is below the medium/high bridge eligibility threshold.`,
      ],
    };
  }
  if (!row.evidenceRefs || row.evidenceRefs.length === 0) {
    return {
      ...base,
      decision: "ineligible",
      reason: "missing-evidence",
      messages: [
        "Violation row has no evidenceRefs; not eligible to bridge.",
      ],
    };
  }

  return {
    ...base,
    decision: "eligible",
    reason: "violation-with-finding-candidate",
    proposedFinding: {
      id: buildProposedFindingId(row),
      title: row.findingCandidate.title,
      category: row.findingCandidate.category,
      severity: row.findingCandidate.severity,
      evidenceRefs: row.evidenceRefs,
      sourceLintRowRef: {
        report: lintReportRef,
        rowId: row.id,
      },
    },
  };
}

/**
 * Deterministic, slug-safe proposed finding id. Shape:
 * `capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`.
 * No timestamp; stable across runs.
 */
function buildProposedFindingId(row: CapabilityArchitectureLintRow): string {
  return [
    CAPABILITY_LINT_FINDING_BRIDGE_FINDING_ID_PREFIX,
    slug(row.rule),
    slug(row.contractId),
    slug(row.phraseCapabilityId ?? ""),
  ].join(":");
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function byStableKey(
  left: CapabilityLintFindingBridgeCandidate,
  right: CapabilityLintFindingBridgeCandidate,
): number {
  if (left.contractId !== right.contractId) {
    return left.contractId.localeCompare(right.contractId);
  }
  if (left.lintRowId !== right.lintRowId) {
    return left.lintRowId.localeCompare(right.lintRowId);
  }
  return left.id.localeCompare(right.id);
}

function buildInputRefs(
  lintReportRef: ArtifactRef,
  lintReport: CapabilityArchitectureLintReport,
): ArtifactRef[] {
  const refs: ArtifactRef[] = [lintReportRef];
  if (lintReport.source?.capabilityContractRef) {
    refs.push(lintReport.source.capabilityContractRef);
  }
  if (lintReport.source?.capabilityMapRef) {
    refs.push(lintReport.source.capabilityMapRef);
  }
  return refs;
}

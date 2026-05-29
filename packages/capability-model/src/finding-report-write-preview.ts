// CapabilityLintFindingBridgeReport -> FindingReport writer
// **dry-run preview** helper.
//
// Consumes a published `CapabilityLintFindingBridgeReport`
// (the preview bridge artifact) and builds the **proposed**
// `FindingReport` body that a future, opt-in `FindingReport`
// writer *would* emit for its eligible candidates. It returns a
// preview value only.
//
// **Boundary (dry-run only).** This helper is preview, **not** a
// writer. It does **not** write `FindingReport`. It does **not**
// read or mutate `FindingReport`, `FindingFilterReport`,
// `FindingLifecycleReport`, `IssueAdjudicationReport`, or
// `CoherencyDelta`. It creates no `WorkOrder` and no
// `VerificationPlan`. It reads no source files and makes no
// network calls. Its only input is the
// `CapabilityLintFindingBridgeReport` (plus its resolved ref).
//
// Write mode is deferred to a later, safety-reviewed slice. See:
// - docs/strategy/capability-lint-finding-writer-decision.md
// - docs/artifacts/capability-lint-finding-bridge-report.md
// - docs/concepts/capability-lint-finding-bridge.md

import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type {
  CapabilityArchitectureLintSeverity,
  CapabilityLintFindingBridgeCandidate,
  CapabilityLintFindingBridgeReport,
} from "@rekon/kernel-repo-model";

/** Source label stamped on the proposed `FindingReport` body so
 *  a future writer (and any reader of this preview) can tell the
 *  findings came from the capability-lint bridge. */
export const FINDING_REPORT_WRITE_PREVIEW_SOURCE = "capability-lint-bridge";

/** Finding category stamped on every proposed finding. */
export const FINDING_REPORT_WRITE_PREVIEW_CATEGORY
  = "capability_architecture_policy";

const ELIGIBLE_CONFIDENCES = new Set<string>(["high", "medium"]);
const ELIGIBLE_SEVERITIES = new Set<string>(["high", "medium"]);

/** A single proposed finding in the dry-run preview. This is a
 *  preview value, **not** a governed `Finding`. */
export type FindingReportWritePreviewFinding = {
  id: string;
  title: string;
  category: string;
  severity: CapabilityArchitectureLintSeverity;
  evidenceRefs: ArtifactRef[];
  sourceBridgeCandidateId: string;
  sourceLintRowId: string;
  sourceContractId: string;
  sourcePhraseCapabilityId: string;
};

/** A bridge candidate that the writer would skip, with the
 *  deterministic reason it was skipped. */
export type FindingReportWritePreviewSkipped = {
  candidateId: string;
  reason: string;
};

/**
 * Dry-run preview of the `FindingReport` a future writer would
 * emit from a `CapabilityLintFindingBridgeReport`.
 *
 * `dryRun` is always `true` and `wouldWrite` is always `false`:
 * this value never corresponds to a written artifact.
 */
export type FindingReportWritePreview = {
  dryRun: true;
  wouldWrite: false;
  source: {
    bridgeReportRef: ArtifactRef;
    lintReportRef?: ArtifactRef;
    capabilityContractRef?: ArtifactRef;
    capabilityMapRef?: ArtifactRef;
  };
  summary: {
    totalCandidates: number;
    eligible: number;
    proposedFindings: number;
    skipped: number;
    duplicateIds: number;
  };
  proposedFindingReport: {
    artifactType: "FindingReport";
    source: typeof FINDING_REPORT_WRITE_PREVIEW_SOURCE;
    inputRefs: ArtifactRef[];
    findings: FindingReportWritePreviewFinding[];
  };
  skippedCandidates: FindingReportWritePreviewSkipped[];
};

export type BuildFindingReportWritePreviewInput = {
  bridgeReport: CapabilityLintFindingBridgeReport;
  bridgeReportRef: ArtifactRef;
  /** Accepted for forward-compatibility with the future writer's
   *  header stamping. Unused by the dry-run preview, which emits
   *  no artifact header. */
  generatedAt?: string;
};

/**
 * Build a `FindingReportWritePreview` from a
 * `CapabilityLintFindingBridgeReport`.
 *
 * Eligibility (preview-only; the writer re-validates every
 * structural prerequisite rather than trusting the bridge's
 * `decision` field alone). A candidate becomes a proposed
 * finding only when all hold:
 * - `decision === "eligible"`;
 * - `proposedFinding` exists;
 * - `proposedFinding.evidenceRefs` is non-empty;
 * - `proposedFinding.sourceLintRowRef` exists;
 * - `severity` is `high` or `medium`;
 * - `confidence` is `high` or `medium`;
 * - its proposed finding id has not already been claimed by an
 *   earlier candidate in this run.
 *
 * Every other candidate is skipped with a deterministic reason.
 * Candidates are walked in the bridge report's canonical order so
 * "first" (for duplicate detection) is reproducible.
 *
 * This builds **no** artifact, writes **no** `FindingReport`, and
 * mutates **no** governance artifact. `dryRun` is `true` and
 * `wouldWrite` is `false`.
 */
export function buildFindingReportWritePreview(
  input: BuildFindingReportWritePreviewInput,
): FindingReportWritePreview {
  const { bridgeReport, bridgeReportRef } = input;

  const lintReportRef = bridgeReport.source?.lintReportRef;
  const capabilityContractRef = bridgeReport.source?.capabilityContractRef;
  const capabilityMapRef = bridgeReport.source?.capabilityMapRef;

  const inputRefs: ArtifactRef[] = [bridgeReportRef];
  if (lintReportRef) inputRefs.push(lintReportRef);
  if (capabilityContractRef) inputRefs.push(capabilityContractRef);
  if (capabilityMapRef) inputRefs.push(capabilityMapRef);

  const findings: FindingReportWritePreviewFinding[] = [];
  const skippedCandidates: FindingReportWritePreviewSkipped[] = [];
  const seenFindingIds = new Set<string>();

  let eligibleCount = 0;
  let duplicateIds = 0;

  const candidates = bridgeReport.candidates ?? [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.decision === "eligible") {
      eligibleCount += 1;
    }

    const skipReason = evaluateSkip(candidate, seenFindingIds);
    if (skipReason) {
      if (skipReason === "duplicate-finding-id") duplicateIds += 1;
      skippedCandidates.push({ candidateId: candidate.id, reason: skipReason });
      continue;
    }

    // Past evaluateSkip the candidate is eligible and complete.
    const proposed = candidate.proposedFinding!;
    seenFindingIds.add(proposed.id);
    findings.push({
      id: proposed.id,
      title: proposed.title,
      category: proposed.category,
      severity: proposed.severity,
      evidenceRefs: proposed.evidenceRefs,
      sourceBridgeCandidateId: candidate.id,
      sourceLintRowId: candidate.lintRowId,
      sourceContractId: candidate.contractId,
      sourcePhraseCapabilityId: candidate.phraseCapabilityId,
    });
  }

  return {
    dryRun: true,
    wouldWrite: false,
    source: {
      bridgeReportRef,
      ...(lintReportRef ? { lintReportRef } : {}),
      ...(capabilityContractRef ? { capabilityContractRef } : {}),
      ...(capabilityMapRef ? { capabilityMapRef } : {}),
    },
    summary: {
      totalCandidates: candidates.length,
      eligible: eligibleCount,
      proposedFindings: findings.length,
      skipped: skippedCandidates.length,
      duplicateIds,
    },
    proposedFindingReport: {
      artifactType: "FindingReport",
      source: FINDING_REPORT_WRITE_PREVIEW_SOURCE,
      inputRefs,
      findings,
    },
    skippedCandidates,
  };
}

/**
 * Return the deterministic skip reason for a candidate, or
 * `undefined` when it should become a proposed finding. Checks
 * run in a fixed priority order so each skipped candidate carries
 * exactly one reason regardless of how many conditions it fails.
 */
function evaluateSkip(
  candidate: CapabilityLintFindingBridgeCandidate,
  seenFindingIds: Set<string>,
): string | undefined {
  if (candidate.decision !== "eligible") {
    return candidate.decision === "needs-review"
      ? "candidate-needs-review"
      : "candidate-ineligible";
  }
  const proposed = candidate.proposedFinding;
  if (!proposed) {
    return "missing-proposed-finding";
  }
  if (!ELIGIBLE_SEVERITIES.has(candidate.severity)) {
    return "low-severity";
  }
  if (!ELIGIBLE_CONFIDENCES.has(candidate.confidence)) {
    return "low-confidence";
  }
  if (!proposed.evidenceRefs || proposed.evidenceRefs.length === 0) {
    return "missing-evidence-refs";
  }
  if (!proposed.sourceLintRowRef) {
    return "missing-source-lint-row-ref";
  }
  if (seenFindingIds.has(proposed.id)) {
    return "duplicate-finding-id";
  }
  return undefined;
}

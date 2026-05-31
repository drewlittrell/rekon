import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type CoherencyDelta,
  type CoherencyRemediationPriority,
  type CoherencyRemediationStep,
  type FindingLifecycleReport,
} from "@rekon/kernel-findings";
import { type Actuator, type ArtifactReader, defineCapability } from "@rekon/sdk";

type PreflightPacketLike = {
  header: ArtifactHeader;
  goal?: string;
  paths?: string[];
  ownerSystems?: string[];
  risk?: {
    tier?: "low" | "medium" | "high";
    reasons?: string[];
  };
  requiredChecks?: string[];
  relevantFindings?: unknown[];
  applicableMemory?: unknown[];
};

export type RemediationWorkOrderItem = {
  findingId: string;
  priority: CoherencyRemediationPriority;
  title: string;
  action: string;
  files: string[];
  systems: string[];
  severity: string;
};

// Additive, backwards-compatible traceability for a WorkOrder generated from a
// proof-approved PreparedIntentPlan (Intent WorkOrder Handoff). It records the
// source refs and the selected phase / obligation / verification-requirement ids
// the guidance was built from, plus an explicit boundary marker. The handoff
// generator creates no VerificationPlan, executes no commands, and writes no
// source files. See docs/concepts/intent-work-order-handoff.md.
export type WorkOrderIntentHandoff = {
  preparedIntentPlanRef: ArtifactRef;
  intentAssessmentReportRef?: ArtifactRef;
  intentStatusReportRef?: ArtifactRef;
  pathFreshnessReportRef?: ArtifactRef;
  runtimeGraphDriftReportRef?: ArtifactRef;
  sourceRefs: ArtifactRef[];
  phaseIds: string[];
  obligationIds: string[];
  verificationRequirementIds: string[];
  boundary: {
    createsVerificationPlan: false;
    executesCommands: false;
    writesSourceFiles: false;
  };
};

export type WorkOrder = {
  header: ArtifactHeader;
  goal: string;
  paths: string[];
  ownerSystems: string[];
  riskNotes: string[];
  requiredChecks: string[];
  successCriteria: string[];
  relevantFindings: unknown[];
  relevantMemory: unknown[];
  antiGamingInstruction: string;
  markdown: string;
  source?: "resolver" | "coherency-delta" | "intent-handoff";
  remediationItems?: RemediationWorkOrderItem[];
  intentHandoff?: WorkOrderIntentHandoff;
};

export type VerificationCommandStatus = "passed" | "failed" | "skipped" | "not-run";

export type VerificationResultStatus = "passed" | "failed" | "partial" | "not-run";

export type VerificationCommandResult = {
  command: string;
  status: VerificationCommandStatus;
  exitCode?: number;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  stdoutDigest?: string;
  stderrDigest?: string;
  notes?: string;
};

export type VerificationResultSummary = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  notRun: number;
};

export type VerificationResult = {
  header: ArtifactHeader;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  status: VerificationResultStatus;
  commandResults: VerificationCommandResult[];
  summary: VerificationResultSummary;
  evidenceNotes: string[];
  recordedBy?: string;
  recordedAt: string;
};

export type VerificationPlanLike = {
  header: ArtifactHeader;
  workOrderRef?: ArtifactRef;
  commands?: string[];
  successCriteria?: string[];
  source?: string;
};

export type CreateVerificationResultInput = {
  verificationPlan: VerificationPlanLike;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  commandResults: VerificationCommandResult[];
  evidenceNotes?: string[];
  recordedBy?: string;
  extraInputRefs?: ArtifactRef[];
  generatedAt?: string;
};

export type VerificationEvidenceStatus =
  | "passed"
  | "failed"
  | "partial"
  | "not-run"
  | "missing";

export type VerificationProofSource =
  | "manual"
  | "runner-derived"
  | "unknown";

export type VerificationProofFreshnessStatus =
  | "fresh"
  | "stale"
  | "missing-plan"
  | "unknown";

export type VerificationProofWarningCode =
  | "proof-failed"
  | "proof-partial"
  | "proof-not-run"
  | "proof-stale"
  | "proof-missing-plan"
  | "proof-source-unknown"
  | "runner-run-missing";

export type VerificationProofWarning = {
  code: VerificationProofWarningCode;
  message: string;
  recommendedCommand?: string;
};

export type VerificationEvidenceSummary = {
  status: VerificationEvidenceStatus;
  source?: VerificationProofSource;
  freshness?: VerificationProofFreshnessStatus;
  verificationResultRef?: ArtifactRef;
  verificationPlanRef?: ArtifactRef;
  verificationRunRef?: ArtifactRef;
  workOrderRef?: ArtifactRef;
  recordedAt?: string;
  recordedBy?: string;
  summary?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    notRun: number;
  };
  matchedFindingIds: string[];
  warnings: string[];
};

// ---------- VerificationRun (P1.1 verification-runner-v1) ----------
//
// `VerificationRun` is the execution-detail artifact written
// by the future `@rekon/capability-verify` runner. It records
// per-command argv / status (including the new `timeout` /
// `killed` values) / digests / redacted truncated excerpts +
// runner identity + environment summary + redaction audit. It
// is intentionally a sibling artifact to `VerificationResult`
// (which remains the proof summary consumed by publications
// and resolvers). The shape lives here next to
// `VerificationResult` so both types share the same kernel
// boundary; the `@rekon/capability-verify` runner imports
// the type and writes the artifact when explicit operator
// `--execute` invocations land in a later slice.
//
// **No command execution code lives here.** The type +
// validators + factory exist so the artifact can be written
// and validated; running anything is deferred to subsequent
// slices.

export type VerificationRunStatus =
  | "passed"
  | "failed"
  | "partial"
  | "timeout"
  | "killed"
  | "not-run";

export type VerificationCommandRunStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "not-run"
  | "timeout"
  | "killed";

export type VerificationRunStreamExcerpt = {
  text: string;
  redacted: boolean;
  truncated: boolean;
  originalBytes?: number;
  storedBytes?: number;
};

export type VerificationRunCommand = {
  id: string;
  command: string;
  argv: string[];
  cwd?: string;
  status: VerificationCommandRunStatus;
  exitCode?: number | null;
  signal?: string | null;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  timedOut?: boolean;
  killed?: boolean;
  stdoutDigest?: string;
  stderrDigest?: string;
  stdoutExcerpt?: VerificationRunStreamExcerpt;
  stderrExcerpt?: VerificationRunStreamExcerpt;
  notes?: string;
};

export type VerificationRunEnvironment = {
  platform?: string;
  arch?: string;
  nodeVersion?: string;
  shell?: string;
  network?: "unknown" | "disabled" | "enabled";
  envPolicy?: "scrubbed" | "inherited" | "custom";
};

export type VerificationRunRedaction = {
  applied: boolean;
  patterns: string[];
  redactedMatches?: number;
  maxBytesPerStream?: number;
};

export type VerificationRunSummary = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  notRun: number;
  timeout: number;
  killed: number;
};

export type VerificationRunRunnerInfo = {
  id: string;
  version?: string;
  capabilityId?: string;
};

export type VerificationRun = {
  header: ArtifactHeader;
  status: VerificationRunStatus;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  verificationResultRef?: ArtifactRef;
  commands: VerificationRunCommand[];
  summary: VerificationRunSummary;
  runner: VerificationRunRunnerInfo;
  environment?: VerificationRunEnvironment;
  redaction?: VerificationRunRedaction;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
};

export type CreateVerificationRunInput = {
  header: ArtifactHeader;
  status: VerificationRunStatus;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  verificationResultRef?: ArtifactRef;
  commands: VerificationRunCommand[];
  runner: VerificationRunRunnerInfo;
  environment?: VerificationRunEnvironment;
  redaction?: VerificationRunRedaction;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  summary?: VerificationRunSummary;
};

export type VerificationRunValidationIssue = {
  path: string;
  message: string;
};

export type VerificationRunValidationResult =
  | { ok: true; value: VerificationRun; issues: [] }
  | { ok: false; issues: VerificationRunValidationIssue[] };

type WorkOrderEvidenceLike = {
  header: ArtifactHeader;
  source?: string;
  remediationItems?: Array<{ findingId?: string }>;
};

type VerificationPlanEvidenceLike = {
  header: ArtifactHeader;
  workOrderRef?: ArtifactRef;
};

type VerificationResultEvidenceLike = {
  header: ArtifactHeader;
  verificationPlanRef?: ArtifactRef;
  workOrderRef?: ArtifactRef;
  status?: VerificationResultStatus;
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    notRun?: number;
  };
  recordedAt?: string;
  recordedBy?: string;
};

export async function lookupVerificationEvidence(
  artifacts: ArtifactReader,
  findingId: string,
): Promise<VerificationEvidenceSummary> {
  const warnings: string[] = [];

  if (typeof findingId !== "string" || findingId.length === 0) {
    return {
      status: "missing",
      matchedFindingIds: [],
      warnings: ["lookupVerificationEvidence called without a findingId."],
    };
  }

  const workOrderRefs = sortByIdDesc(await artifacts.list("WorkOrder"));
  let matchedWorkOrderRef: ArtifactRef | undefined;
  let matchedWorkOrder: WorkOrderEvidenceLike | undefined;
  const matchedFindingIds = new Set<string>();

  for (const ref of workOrderRefs) {
    const workOrder = (await artifacts.read(ref)) as WorkOrderEvidenceLike;
    const items = workOrder?.remediationItems ?? [];

    if (!items.some((item) => item.findingId === findingId)) {
      continue;
    }

    matchedFindingIds.add(findingId);

    if (!matchedWorkOrderRef) {
      matchedWorkOrderRef = ref;
      matchedWorkOrder = workOrder;
    }
  }

  if (!matchedWorkOrderRef || !matchedWorkOrder) {
    return {
      status: "missing",
      matchedFindingIds: [],
      warnings: ["No remediation WorkOrder references this finding."],
    };
  }

  const planRefs = sortByIdDesc(await artifacts.list("VerificationPlan"));
  let matchedPlanRef: ArtifactRef | undefined;

  for (const ref of planRefs) {
    const plan = (await artifacts.read(ref)) as VerificationPlanEvidenceLike;

    if (plan?.workOrderRef && plan.workOrderRef.id === matchedWorkOrderRef.id) {
      matchedPlanRef = ref;
      break;
    }
  }

  if (!matchedPlanRef) {
    warnings.push("Remediation WorkOrder exists but no VerificationPlan references it.");
    return {
      status: "missing",
      workOrderRef: matchedWorkOrderRef,
      matchedFindingIds: Array.from(matchedFindingIds),
      warnings,
    };
  }

  const resultRefs = sortByIdDesc(await artifacts.list("VerificationResult"));
  let matchedResultRef: ArtifactRef | undefined;
  let matchedResult: VerificationResultEvidenceLike | undefined;

  for (const ref of resultRefs) {
    const result = (await artifacts.read(ref)) as VerificationResultEvidenceLike;

    if (result?.verificationPlanRef && result.verificationPlanRef.id === matchedPlanRef.id) {
      matchedResultRef = ref;
      matchedResult = result;
      break;
    }
  }

  if (!matchedResultRef || !matchedResult) {
    return {
      status: "not-run",
      workOrderRef: matchedWorkOrderRef,
      verificationPlanRef: matchedPlanRef,
      matchedFindingIds: Array.from(matchedFindingIds),
      warnings,
    };
  }

  const status: VerificationEvidenceStatus = matchedResult.status === "passed"
    || matchedResult.status === "failed"
    || matchedResult.status === "partial"
    || matchedResult.status === "not-run"
    ? matchedResult.status
    : "missing";
  const summary = matchedResult.summary
    ? {
      total: matchedResult.summary.total ?? 0,
      passed: matchedResult.summary.passed ?? 0,
      failed: matchedResult.summary.failed ?? 0,
      skipped: matchedResult.summary.skipped ?? 0,
      notRun: matchedResult.summary.notRun ?? 0,
    }
    : undefined;

  // Classify the proof surface (source + freshness) so resolver
  // packets can carry the same context publications use without
  // re-classifying downstream. The latest plan ref is the freshest
  // one in `allPlans` — the existing matching loop walks every
  // plan and pairs to the result; if there's a newer plan than the
  // one the result cites, classify as `stale`.
  const latestPlanRef = (await artifacts.list("VerificationPlan"))
    .sort((left, right) => right.id.localeCompare(left.id))[0];
  const proofSurface = summarizeVerificationProofSurface({
    verificationResult: matchedResult as VerificationResultLike,
    verificationResultRef: matchedResultRef,
    latestVerificationPlanRef: latestPlanRef,
  });

  for (const warning of proofSurface.warnings) {
    warnings.push(warning.message);
  }

  return {
    status,
    source: proofSurface.source,
    freshness: proofSurface.freshness,
    verificationResultRef: matchedResultRef,
    verificationPlanRef: matchedPlanRef,
    verificationRunRef: proofSurface.verificationRunRef,
    workOrderRef: matchedWorkOrderRef,
    recordedAt: matchedResult.recordedAt,
    recordedBy: matchedResult.recordedBy,
    summary,
    matchedFindingIds: Array.from(matchedFindingIds),
    warnings,
  };
}

function sortByIdDesc(refs: ArtifactRef[]): ArtifactRef[] {
  return [...refs].sort((left, right) => right.id.localeCompare(left.id));
}

// ---------- VerificationProofSurface (P1.1 verification-proof-surfaces-v2) ----------
//
// `summarizeVerificationProofSurface` is the deterministic helper
// that publication renderers (proof report, architecture summary,
// agent contract) use to surface proof source, freshness, and
// failure warnings consistently. It is pure: no I/O, no mutation.

export type VerificationProofSurfaceSummary = {
  source: VerificationProofSource;
  status: VerificationResultStatus;
  freshness: VerificationProofFreshnessStatus;
  verificationResultRef?: ArtifactRef;
  verificationPlanRef?: ArtifactRef;
  verificationRunRef?: ArtifactRef;
  workOrderRef?: ArtifactRef;
  recordedBy?: string;
  recordedAt?: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    notRun: number;
  };
  warnings: VerificationProofWarning[];
};

export type SummarizeVerificationProofSurfaceInput = {
  verificationResult?: VerificationResultLike;
  verificationResultRef?: ArtifactRef;
  latestVerificationPlanRef?: ArtifactRef;
  /** Set when the runner-derived run is known to be missing from
   *  the local store; produces a `runner-run-missing` warning. */
  knownRunnerRunMissing?: boolean;
};

type VerificationResultLike = {
  header?: ArtifactHeader;
  verificationPlanRef?: ArtifactRef;
  workOrderRef?: ArtifactRef;
  status?: VerificationResultStatus;
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    notRun?: number;
  };
  recordedBy?: string;
  recordedAt?: string;
};

/**
 * Classify a `VerificationResult` artifact's proof surface so
 * downstream publications can render source / freshness / failure
 * context without each renderer reinventing the rules.
 *
 * - `source` is `runner-derived` when the result's
 *   `header.inputRefs` cites a `VerificationRun`, or `recordedBy`
 *   matches a known runner identity pattern
 *   (`rekon.local.exec*` for the in-tree runner).
 * - `source` is `manual` when the result has no `VerificationRun`
 *   inputRef and no recognized runner `recordedBy`.
 * - `source` is `unknown` for malformed inputs.
 * - `freshness` is `fresh` when the result cites the latest plan;
 *   `stale` when it cites a different plan; `missing-plan` when
 *   the result has no plan ref; `unknown` when no plan context
 *   is available.
 * - Warnings are emitted for `failed` / `partial` / `not-run`
 *   status, `stale` / `missing-plan` freshness, `unknown` source,
 *   and the operator-supplied `knownRunnerRunMissing` flag.
 */
export function summarizeVerificationProofSurface(
  input: SummarizeVerificationProofSurfaceInput,
): VerificationProofSurfaceSummary {
  const result = input.verificationResult;

  if (!result) {
    return {
      source: "unknown",
      status: "not-run",
      freshness: input.latestVerificationPlanRef ? "missing-plan" : "unknown",
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, notRun: 0 },
      verificationResultRef: input.verificationResultRef,
      verificationPlanRef: input.latestVerificationPlanRef,
      warnings: [
        {
          code: "proof-not-run",
          message: "No VerificationResult is available; verification has not been recorded.",
          recommendedCommand: "rekon verify record --result-json '<json>'",
        },
      ],
    };
  }

  const status = result.status ?? "not-run";
  const verificationRunRef = pickVerificationRunRef(result);
  const source = classifyVerificationProofSource(result, verificationRunRef);
  const freshness = classifyVerificationProofFreshness(
    result.verificationPlanRef,
    input.latestVerificationPlanRef,
  );
  const summary = {
    total: result.summary?.total ?? 0,
    passed: result.summary?.passed ?? 0,
    failed: result.summary?.failed ?? 0,
    skipped: result.summary?.skipped ?? 0,
    notRun: result.summary?.notRun ?? 0,
  };
  const warnings: VerificationProofWarning[] = [];

  if (status === "failed") {
    warnings.push({
      code: "proof-failed",
      message: "Verification failed. Do not treat this work as proven complete.",
      recommendedCommand: "rekon verify run --plan <id> --execute",
    });
  } else if (status === "partial") {
    warnings.push({
      code: "proof-partial",
      message: "Verification is partial: some commands were skipped or not-run.",
      recommendedCommand: "rekon verify run --plan <id> --execute",
    });
  } else if (status === "not-run") {
    warnings.push({
      code: "proof-not-run",
      message: "Verification has not been run for the current plan.",
      recommendedCommand: "rekon verify run --plan <id> --execute",
    });
  }

  if (freshness === "stale") {
    warnings.push({
      code: "proof-stale",
      message:
        "VerificationResult is stale relative to the latest VerificationPlan. Re-run verification.",
      recommendedCommand: input.latestVerificationPlanRef
        ? `rekon verify run --plan ${input.latestVerificationPlanRef.id} --execute`
        : "rekon verify run --plan <latest-plan-id> --execute",
    });
  } else if (freshness === "missing-plan") {
    warnings.push({
      code: "proof-missing-plan",
      message:
        "VerificationResult does not cite a VerificationPlan even though a plan exists.",
    });
  }

  if (source === "unknown") {
    warnings.push({
      code: "proof-source-unknown",
      message:
        "VerificationResult source could not be classified (manual vs runner-derived).",
    });
  }

  if (source === "runner-derived" && input.knownRunnerRunMissing === true) {
    warnings.push({
      code: "runner-run-missing",
      message:
        "Runner-derived VerificationResult cites a VerificationRun that is missing from the local store.",
    });
  }

  return {
    source,
    status,
    freshness,
    verificationResultRef: input.verificationResultRef,
    verificationPlanRef: result.verificationPlanRef ?? input.latestVerificationPlanRef,
    verificationRunRef,
    workOrderRef: result.workOrderRef,
    recordedBy: result.recordedBy,
    recordedAt: result.recordedAt ?? result.header?.generatedAt,
    summary,
    warnings,
  };
}

function pickVerificationRunRef(result: VerificationResultLike): ArtifactRef | undefined {
  const refs = Array.isArray(result.header?.inputRefs) ? result.header!.inputRefs : [];

  for (const ref of refs) {
    if (ref && typeof ref === "object" && ref.type === "VerificationRun") {
      return ref;
    }
  }

  return undefined;
}

function classifyVerificationProofSource(
  result: VerificationResultLike,
  verificationRunRef: ArtifactRef | undefined,
): VerificationProofSource {
  if (verificationRunRef) {
    return "runner-derived";
  }

  const recordedBy = typeof result.recordedBy === "string" ? result.recordedBy : "";

  // Known runner identity patterns. `rekon.local.exec@<version>` is
  // the in-tree runner's `recordedBy`; `rekon.local.dry-run` should
  // never produce a result (it's refused) but we classify it as
  // runner-derived if encountered.
  if (/^rekon\.local\.(exec|dry-run)/i.test(recordedBy)) {
    return "runner-derived";
  }

  // Operator-recorded results have no run ref. Treat as manual.
  if (recordedBy.length > 0) {
    return "manual";
  }

  // No recordedBy and no run ref. Most likely manual but the data
  // is incomplete — mark unknown so renderers can flag it.
  if (result.status === undefined) {
    return "unknown";
  }

  return "manual";
}

function classifyVerificationProofFreshness(
  resultPlanRef: ArtifactRef | undefined,
  latestPlanRef: ArtifactRef | undefined,
): VerificationProofFreshnessStatus {
  if (!resultPlanRef) {
    return latestPlanRef ? "missing-plan" : "unknown";
  }

  if (!latestPlanRef) {
    return "unknown";
  }

  return resultPlanRef.id === latestPlanRef.id ? "fresh" : "stale";
}

export function createVerificationResult(input: CreateVerificationResultInput): VerificationResult {
  const planCommands = Array.isArray(input.verificationPlan.commands)
    ? input.verificationPlan.commands
    : [];
  const submittedByCommand = new Map<string, VerificationCommandResult>();

  for (const submitted of input.commandResults) {
    if (typeof submitted.command === "string" && submitted.command.length > 0) {
      submittedByCommand.set(submitted.command, normalizeCommandResult(submitted));
    }
  }

  const orderedResults: VerificationCommandResult[] = [];
  const seen = new Set<string>();

  for (const command of planCommands) {
    if (seen.has(command)) {
      continue;
    }
    seen.add(command);

    const submitted = submittedByCommand.get(command);
    orderedResults.push(submitted ?? { command, status: "not-run" });
  }

  for (const submitted of input.commandResults) {
    if (!seen.has(submitted.command)) {
      seen.add(submitted.command);
      orderedResults.push(normalizeCommandResult(submitted));
    }
  }

  const summary = summarizeCommandResults(orderedResults);
  const overallStatus = deriveOverallStatus(orderedResults, planCommands.length);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workOrderRef = input.workOrderRef ?? input.verificationPlan.workOrderRef;
  const inputRefs: ArtifactRef[] = [input.verificationPlanRef];

  if (workOrderRef) {
    inputRefs.push(workOrderRef);
  }

  if (Array.isArray(input.extraInputRefs)) {
    for (const ref of input.extraInputRefs) {
      inputRefs.push(ref);
    }
  }

  const subject = input.verificationPlan.header.subject;

  return {
    header: {
      artifactType: "VerificationResult",
      artifactId: `verification-result-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      snapshotId: input.verificationPlan.header.snapshotId,
      subject: {
        repoId: subject.repoId,
        ref: subject.ref,
        commit: subject.commit,
        paths: subject.paths,
        systems: subject.systems,
      },
      producer: {
        id: "@rekon/capability-intent",
        version: "0.1.0",
      },
      inputRefs,
      freshness: {
        status: "fresh",
      },
      provenance: {
        confidence: 0.9,
        notes: ["Verification results are operator-supplied evidence; Rekon does not execute commands."],
      },
    },
    verificationPlanRef: input.verificationPlanRef,
    workOrderRef,
    status: overallStatus,
    commandResults: orderedResults,
    summary,
    evidenceNotes: input.evidenceNotes ?? [],
    recordedBy: input.recordedBy,
    recordedAt: generatedAt,
  };
}

function normalizeCommandResult(value: VerificationCommandResult): VerificationCommandResult {
  const status = isCommandStatus(value.status) ? value.status : "not-run";
  const normalized: VerificationCommandResult = {
    command: value.command,
    status,
  };

  if (typeof value.exitCode === "number" && Number.isFinite(value.exitCode)) {
    normalized.exitCode = Math.trunc(value.exitCode);
  }

  if (typeof value.durationMs === "number" && Number.isFinite(value.durationMs) && value.durationMs >= 0) {
    normalized.durationMs = value.durationMs;
  }

  if (typeof value.startedAt === "string" && value.startedAt.length > 0) {
    normalized.startedAt = value.startedAt;
  }

  if (typeof value.completedAt === "string" && value.completedAt.length > 0) {
    normalized.completedAt = value.completedAt;
  }

  if (typeof value.stdoutDigest === "string" && value.stdoutDigest.length > 0) {
    normalized.stdoutDigest = value.stdoutDigest;
  }

  if (typeof value.stderrDigest === "string" && value.stderrDigest.length > 0) {
    normalized.stderrDigest = value.stderrDigest;
  }

  if (typeof value.notes === "string" && value.notes.length > 0) {
    normalized.notes = value.notes;
  }

  return normalized;
}

function isCommandStatus(value: unknown): value is VerificationCommandStatus {
  return value === "passed" || value === "failed" || value === "skipped" || value === "not-run";
}

function summarizeCommandResults(results: VerificationCommandResult[]): VerificationResultSummary {
  const summary: VerificationResultSummary = {
    total: results.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    notRun: 0,
  };

  for (const result of results) {
    switch (result.status) {
      case "passed":
        summary.passed += 1;
        break;
      case "failed":
        summary.failed += 1;
        break;
      case "skipped":
        summary.skipped += 1;
        break;
      case "not-run":
        summary.notRun += 1;
        break;
    }
  }

  return summary;
}

function deriveOverallStatus(
  results: VerificationCommandResult[],
  planCommandCount: number,
): VerificationResultStatus {
  if (results.length === 0) {
    return "not-run";
  }

  if (results.every((result) => result.status === "not-run")) {
    return "not-run";
  }

  if (results.some((result) => result.status === "failed")) {
    return "failed";
  }

  const passedCount = results.filter((result) => result.status === "passed").length;
  const planAllCovered = planCommandCount === 0
    ? true
    : results.every((result) => result.status !== "not-run");

  if (planAllCovered && passedCount === results.length) {
    return "passed";
  }

  return "partial";
}

// ---------- VerificationRun helpers (P1.1
// verification-runner-v1 boundary) ----------
//
// Pure data-only factory + validator + assert helpers. No
// command execution. The factory accepts the canonical
// shape, fills the summary when omitted (deriving counts
// from the command list), and returns a typed
// `VerificationRun` ready for write. The validator
// returns structured issues; the asserter throws.

const VERIFICATION_RUN_STATUSES = new Set<VerificationRunStatus>([
  "passed",
  "failed",
  "partial",
  "timeout",
  "killed",
  "not-run",
]);

const VERIFICATION_COMMAND_RUN_STATUSES = new Set<VerificationCommandRunStatus>([
  "passed",
  "failed",
  "skipped",
  "not-run",
  "timeout",
  "killed",
]);

export function createVerificationRun(input: CreateVerificationRunInput): VerificationRun {
  if (!input || typeof input !== "object") {
    throw new TypeError("createVerificationRun requires an input object.");
  }
  if (!input.header || typeof input.header !== "object") {
    throw new TypeError("createVerificationRun requires input.header.");
  }
  if (!input.verificationPlanRef || typeof input.verificationPlanRef !== "object") {
    throw new TypeError("createVerificationRun requires input.verificationPlanRef.");
  }
  if (!Array.isArray(input.commands)) {
    throw new TypeError("createVerificationRun requires input.commands to be an array.");
  }
  if (!input.runner || typeof input.runner.id !== "string" || input.runner.id.length === 0) {
    throw new TypeError("createVerificationRun requires input.runner.id.");
  }
  if (!VERIFICATION_RUN_STATUSES.has(input.status)) {
    throw new TypeError(
      `createVerificationRun input.status must be one of ${[...VERIFICATION_RUN_STATUSES].join(", ")}.`,
    );
  }

  const summary = input.summary ?? summarizeVerificationRunCommands(input.commands);

  return {
    header: input.header,
    status: input.status,
    verificationPlanRef: input.verificationPlanRef,
    workOrderRef: input.workOrderRef,
    verificationResultRef: input.verificationResultRef,
    commands: input.commands.map((command) => ({ ...command })),
    summary,
    runner: { ...input.runner },
    environment: input.environment ? { ...input.environment } : undefined,
    redaction: input.redaction
      ? {
        ...input.redaction,
        patterns: [...input.redaction.patterns],
      }
      : undefined,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationMs: input.durationMs,
  };
}

export function summarizeVerificationRunCommands(
  commands: ReadonlyArray<VerificationRunCommand>,
): VerificationRunSummary {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let notRun = 0;
  let timeout = 0;
  let killed = 0;
  for (const command of commands ?? []) {
    switch (command?.status) {
      case "passed":
        passed += 1;
        break;
      case "failed":
        failed += 1;
        break;
      case "skipped":
        skipped += 1;
        break;
      case "not-run":
        notRun += 1;
        break;
      case "timeout":
        timeout += 1;
        break;
      case "killed":
        killed += 1;
        break;
      default:
        notRun += 1;
        break;
    }
  }
  return {
    total: commands?.length ?? 0,
    passed,
    failed,
    skipped,
    notRun,
    timeout,
    killed,
  };
}

export function validateVerificationRun(value: unknown): VerificationRunValidationResult {
  const issues: VerificationRunValidationIssue[] = [];
  if (!value || typeof value !== "object") {
    issues.push({ path: "$", message: "Expected an object." });
    return { ok: false, issues };
  }
  const candidate = value as Partial<VerificationRun>;

  if (!candidate.header || typeof candidate.header !== "object") {
    issues.push({ path: "$.header", message: "Expected ArtifactHeader object." });
  } else if (candidate.header.artifactType !== "VerificationRun") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be 'VerificationRun'.",
    });
  }
  if (typeof candidate.status !== "string"
    || !VERIFICATION_RUN_STATUSES.has(candidate.status as VerificationRunStatus)) {
    issues.push({
      path: "$.status",
      message: `Expected one of ${[...VERIFICATION_RUN_STATUSES].join(", ")}.`,
    });
  }
  if (!candidate.verificationPlanRef || typeof candidate.verificationPlanRef !== "object") {
    issues.push({
      path: "$.verificationPlanRef",
      message: "Expected ArtifactRef object.",
    });
  }
  if (!Array.isArray(candidate.commands)) {
    issues.push({ path: "$.commands", message: "Expected an array." });
  } else {
    candidate.commands.forEach((command, index) => {
      const path = `$.commands[${index}]`;
      if (!command || typeof command !== "object") {
        issues.push({ path, message: "Expected an object." });
        return;
      }
      const cmd = command as Partial<VerificationRunCommand>;
      if (typeof cmd.id !== "string" || cmd.id.length === 0) {
        issues.push({ path: `${path}.id`, message: "Expected a non-empty string." });
      }
      if (typeof cmd.command !== "string" || cmd.command.length === 0) {
        issues.push({ path: `${path}.command`, message: "Expected a non-empty string." });
      }
      if (!Array.isArray(cmd.argv) || !cmd.argv.every((arg) => typeof arg === "string")) {
        issues.push({ path: `${path}.argv`, message: "Expected an array of strings." });
      }
      if (typeof cmd.status !== "string"
        || !VERIFICATION_COMMAND_RUN_STATUSES.has(cmd.status as VerificationCommandRunStatus)) {
        issues.push({
          path: `${path}.status`,
          message: `Expected one of ${[...VERIFICATION_COMMAND_RUN_STATUSES].join(", ")}.`,
        });
      }
      validateVerificationRunStreamExcerpt(cmd.stdoutExcerpt, `${path}.stdoutExcerpt`, issues);
      validateVerificationRunStreamExcerpt(cmd.stderrExcerpt, `${path}.stderrExcerpt`, issues);
    });
  }
  if (candidate.summary === undefined) {
    issues.push({ path: "$.summary", message: "Expected a summary object." });
  } else if (!candidate.summary || typeof candidate.summary !== "object") {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else {
    const summary = candidate.summary;
    for (const field of ["total", "passed", "failed", "skipped", "notRun", "timeout", "killed"] as const) {
      const v = summary[field];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        issues.push({
          path: `$.summary.${field}`,
          message: "Expected a non-negative number.",
        });
      }
    }
  }
  if (!candidate.runner || typeof candidate.runner !== "object") {
    issues.push({ path: "$.runner", message: "Expected a runner object." });
  } else if (typeof (candidate.runner as { id?: unknown }).id !== "string"
    || (candidate.runner as { id?: string }).id?.length === 0) {
    issues.push({ path: "$.runner.id", message: "Expected a non-empty string." });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, value: candidate as VerificationRun, issues: [] };
}

function validateVerificationRunStreamExcerpt(
  excerpt: VerificationRunStreamExcerpt | undefined,
  path: string,
  issues: VerificationRunValidationIssue[],
): void {
  if (excerpt === undefined) return;
  if (!excerpt || typeof excerpt !== "object") {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  if (typeof excerpt.text !== "string") {
    issues.push({ path: `${path}.text`, message: "Expected a string." });
  }
  if (typeof excerpt.redacted !== "boolean") {
    issues.push({ path: `${path}.redacted`, message: "Expected a boolean." });
  }
  if (typeof excerpt.truncated !== "boolean") {
    issues.push({ path: `${path}.truncated`, message: "Expected a boolean." });
  }
}

export function assertVerificationRun(value: unknown): VerificationRun {
  const result = validateVerificationRun(value);
  if (!result.ok) {
    const summary = result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ");
    throw new TypeError(`Invalid VerificationRun: ${summary}`);
  }
  return result.value;
}

const REMEDIATION_REQUIRED_CHECKS = [
  "npm run typecheck",
  "npm run test",
  "npm run build",
  "rekon artifacts validate --json",
  "rekon artifacts freshness --json",
];

const REMEDIATION_ANTI_GAMING = [
  "Do not modify tests, artifact validators, rules, findings, status ledgers,",
  "or verification scripts merely to make this work order appear complete.",
  "Verification gates exist to prove real implementation correctness; if a gate",
  "is wrong, record that as a finding or follow-up instead of gaming it.",
].join(" ");

const REMEDIATION_SUCCESS_CRITERIA = [
  "Selected findings are addressed by real implementation changes.",
  "No checks are weakened, removed, or bypassed.",
  "A new evaluate -> findings lifecycle -> coherency delta run no longer lists addressed findings as active, or failures are explained with evidence.",
  "Work remains scoped to selected files/systems unless an explicit seam is resolved.",
  "Any accepted/ignored status changes include notes.",
];

export const intentActuator: Actuator = {
  id: "@rekon/capability-intent.work-order",
  produces: ["IntentMap", "WorkOrder", "VerificationPlan", "VerificationResult"],
  async act({ artifacts, input }) {
    const preflightRef = parseArtifactRef(input?.preflightRef) ?? await latestRef(artifacts, "ResolverPacket");

    if (!preflightRef) {
      throw new Error("@rekon/capability-intent requires a ResolverPacket artifact.");
    }

    const preflight = await artifacts.read(preflightRef) as PreflightPacketLike;
    const goal = typeof input?.goal === "string" ? input.goal : preflight.goal ?? "";
    const paths = parsePaths(input?.path ?? input?.paths ?? preflight.paths);
    const checks = preflight.requiredChecks?.length ? preflight.requiredChecks : ["npm run typecheck", "npm run test", "npm run build"];
    const inputRefs = [preflightRef, ...preflight.header.inputRefs];
    const intentMap = {
      header: createHeader("IntentMap", `intent-map-${Date.now()}`, preflight.header, preflight.ownerSystems, inputRefs, paths),
      goal,
      paths,
      preflightRef,
      ownerSystems: preflight.ownerSystems ?? [],
    };
    const intentMapRef = await artifacts.write("IntentMap", intentMap);
    const workOrder: WorkOrder = {
      header: createHeader("WorkOrder", `work-order-${Date.now()}`, preflight.header, preflight.ownerSystems, [intentMapRef, preflightRef], paths),
      goal,
      paths,
      ownerSystems: preflight.ownerSystems ?? [],
      riskNotes: preflight.risk?.reasons ?? [],
      requiredChecks: checks,
      successCriteria: [
        "Implementation stays scoped to the requested paths and owner systems.",
        "Public API changes are documented in package README and CHANGELOG.md.",
        "Verification commands pass or failures are reported with concrete evidence.",
      ],
      relevantFindings: preflight.relevantFindings ?? [],
      relevantMemory: preflight.applicableMemory ?? [],
      antiGamingInstruction: "Do not bypass failing checks, delete tests, or weaken validation to make verification pass.",
      markdown: "",
      source: "resolver",
    };
    workOrder.markdown = renderResolverWorkOrder(workOrder);
    const workOrderRef = await artifacts.write("WorkOrder", workOrder);
    const verificationPlan = {
      header: createHeader("VerificationPlan", `verification-plan-${Date.now()}`, preflight.header, preflight.ownerSystems, [workOrderRef, preflightRef], paths),
      workOrderRef,
      commands: checks,
      successCriteria: workOrder.successCriteria,
    };

    return [intentMapRef, workOrderRef, await artifacts.write("VerificationPlan", verificationPlan)];
  },
};

export type RemediationActuatorInput = {
  findingId?: string;
  priority?: CoherencyRemediationPriority;
  limit?: number;
  excludeFindingIds?: string[];
};

export type RemediationActuatorResult = {
  refs: ArtifactRef[];
  selectedItems: RemediationWorkOrderItem[];
  message?: string;
};

export const remediationActuator: Actuator = {
  id: "@rekon/capability-intent.remediation-work-order",
  produces: ["IntentMap", "WorkOrder", "VerificationPlan"],
  async act({ artifacts, input }) {
    const result = await runRemediation(artifacts, parseRemediationInput(input));
    return result.refs;
  },
};

export async function runRemediation(
  artifacts: ArtifactReader & { write(type: string, artifact: unknown): Promise<ArtifactRef> },
  options: RemediationActuatorInput = {},
): Promise<RemediationActuatorResult> {
  const deltaRef = await latestRef(artifacts, "CoherencyDelta");

  if (!deltaRef) {
    return {
      refs: [],
      selectedItems: [],
      message: "No CoherencyDelta found. Run `rekon coherency delta` first.",
    };
  }

  const delta = await artifacts.read(deltaRef) as CoherencyDelta;
  const activeSteps = filterRemediationSteps(delta.remediationQueue, options);

  if (activeSteps.length === 0) {
    return {
      refs: [],
      selectedItems: [],
      message: "No active remediation items in latest CoherencyDelta.",
    };
  }

  const selectedItems = activeSteps.map(toRemediationItem);
  const lifecycleRef = await latestRef(artifacts, "FindingLifecycleReport");
  const lifecycleReport = lifecycleRef
    ? await artifacts.read(lifecycleRef) as FindingLifecycleReport
    : undefined;
  const resolverRef = await latestRef(artifacts, "ResolverPacket");
  const inputRefs: ArtifactRef[] = [deltaRef];
  const intentInputRefs: ArtifactRef[] = [deltaRef];

  if (lifecycleRef) {
    inputRefs.push(lifecycleRef);
    intentInputRefs.push(lifecycleRef);
  }

  if (resolverRef) {
    inputRefs.push(resolverRef);
    intentInputRefs.push(resolverRef);
  }

  const subject = delta.header.subject ?? { repoId: "unknown" };
  const ownerSystems = uniqueSorted(selectedItems.flatMap((item) => item.systems));
  const paths = uniqueSorted(selectedItems.flatMap((item) => item.files));
  const goal = "Resolve active coherency findings from the latest CoherencyDelta.";
  const generatedAt = new Date().toISOString();
  const intentMap = {
    header: createHeaderFromSubject(
      "IntentMap",
      `intent-map-${Date.now()}`,
      subject,
      delta.header.snapshotId,
      ownerSystems,
      intentInputRefs,
      paths,
      generatedAt,
      "Remediation intent derived from CoherencyDelta remediation queue.",
    ),
    goal,
    paths,
    coherencyDeltaRef: deltaRef,
    ownerSystems,
    source: "coherency-delta" as const,
  };
  const intentMapRef = await artifacts.write("IntentMap", intentMap);
  const workOrderInputRefs: ArtifactRef[] = [intentMapRef, deltaRef];

  if (lifecycleRef) {
    workOrderInputRefs.push(lifecycleRef);
  }

  const workOrder: WorkOrder = {
    header: createHeaderFromSubject(
      "WorkOrder",
      `work-order-${Date.now()}`,
      subject,
      delta.header.snapshotId,
      ownerSystems,
      workOrderInputRefs,
      paths,
      generatedAt,
      "Remediation work order generated from CoherencyDelta. Work orders are plans, not source changes.",
    ),
    goal,
    paths,
    ownerSystems,
    riskNotes: buildRemediationRiskNotes(selectedItems, lifecycleReport),
    requiredChecks: REMEDIATION_REQUIRED_CHECKS,
    successCriteria: REMEDIATION_SUCCESS_CRITERIA,
    relevantFindings: selectedItems,
    relevantMemory: [],
    antiGamingInstruction: REMEDIATION_ANTI_GAMING,
    markdown: "",
    source: "coherency-delta",
    remediationItems: selectedItems,
  };
  workOrder.markdown = renderRemediationWorkOrder({
    workOrder,
    deltaRef,
    lifecycleRef,
  });
  const workOrderRef = await artifacts.write("WorkOrder", workOrder);
  const verificationPlanInputRefs: ArtifactRef[] = [workOrderRef, deltaRef];

  if (lifecycleRef) {
    verificationPlanInputRefs.push(lifecycleRef);
  }

  const verificationPlan = {
    header: createHeaderFromSubject(
      "VerificationPlan",
      `verification-plan-${Date.now()}`,
      subject,
      delta.header.snapshotId,
      ownerSystems,
      verificationPlanInputRefs,
      paths,
      generatedAt,
      "Verification plan for a remediation work order. Commands are not executed by the actuator.",
    ),
    workOrderRef,
    commands: REMEDIATION_REQUIRED_CHECKS,
    successCriteria: REMEDIATION_SUCCESS_CRITERIA,
    source: "coherency-delta" as const,
  };
  const verificationPlanRef = await artifacts.write("VerificationPlan", verificationPlan);

  return {
    refs: [intentMapRef, workOrderRef, verificationPlanRef],
    selectedItems,
  };
}

export default defineCapability({
  manifest: {
    id: "@rekon/capability-intent",
    name: "Intent Work Orders",
    version: "0.1.0",
    roles: ["actuator"],
    consumes: ["ResolverPacket", "CoherencyDelta", "FindingLifecycleReport"],
    produces: ["IntentMap", "WorkOrder", "VerificationPlan", "VerificationResult"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "preflight.changed",
        description: "Resolver-based work orders are invalid when their preflight packet changes.",
        inputs: ["ResolverPacket"],
      },
      {
        id: "coherency.changed",
        description: "Remediation work orders are invalid when their CoherencyDelta changes.",
        inputs: ["CoherencyDelta"],
      },
      {
        id: "lifecycle.changed",
        description: "Remediation work orders should be regenerated when the finding lifecycle changes.",
        inputs: ["FindingLifecycleReport"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.actuator(intentActuator);
    registry.actuator(remediationActuator);
  },
});

function createHeader(
  artifactType: string,
  artifactId: string,
  preflightHeader: ArtifactHeader,
  ownerSystems: string[] | undefined,
  inputRefs: ArtifactRef[],
  paths: string[],
): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    snapshotId: preflightHeader.snapshotId,
    subject: {
      repoId: preflightHeader.subject.repoId,
      ref: preflightHeader.subject.ref,
      commit: preflightHeader.subject.commit,
      paths,
      systems: ownerSystems,
    },
    producer: {
      id: "@rekon/capability-intent",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 0.8,
      notes: ["Work orders are generated from resolver packets."],
    },
  };
}

function createHeaderFromSubject(
  artifactType: string,
  artifactId: string,
  subject: ArtifactHeader["subject"],
  snapshotId: string | undefined,
  systems: string[],
  inputRefs: ArtifactRef[],
  paths: string[],
  generatedAt: string,
  provenanceNote: string,
): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt,
    snapshotId,
    subject: {
      repoId: subject.repoId,
      ref: subject.ref,
      commit: subject.commit,
      paths,
      systems,
    },
    producer: {
      id: "@rekon/capability-intent",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 0.7,
      notes: [provenanceNote],
    },
  };
}

async function latestRef(
  artifacts: { list(type?: string): Promise<ArtifactRef[]> },
  type: string,
): Promise<ArtifactRef | undefined> {
  return (await artifacts.list(type)).sort((left, right) => right.id.localeCompare(left.id))[0];
}

function parseArtifactRef(value: unknown): ArtifactRef | null {
  if (value && typeof value === "object") {
    const candidate = value as Partial<ArtifactRef>;

    if (candidate.type && candidate.id && candidate.schemaVersion) {
      return candidate as ArtifactRef;
    }
  }

  return null;
}

function parsePaths(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }

  return [];
}

function parseRemediationInput(input?: Record<string, unknown>): RemediationActuatorInput {
  if (!input) {
    return {};
  }

  const findingId = typeof input.findingId === "string" && input.findingId.length > 0 ? input.findingId : undefined;
  const priority = isRemediationPriority(input.priority) ? input.priority : undefined;
  const limit = typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
    ? Math.floor(input.limit)
    : undefined;
  const excludeFindingIds = Array.isArray(input.excludeFindingIds)
    ? input.excludeFindingIds.filter((value): value is string => typeof value === "string" && value.length > 0)
    : undefined;

  return { findingId, priority, limit, excludeFindingIds };
}

function isRemediationPriority(value: unknown): value is CoherencyRemediationPriority {
  return value === "p0" || value === "p1" || value === "p2";
}

function filterRemediationSteps(
  queue: CoherencyRemediationStep[],
  options: RemediationActuatorInput,
): CoherencyRemediationStep[] {
  let steps = [...queue];

  if (options.findingId) {
    steps = steps.filter((step) => step.findingId === options.findingId);
  }

  if (options.priority) {
    steps = steps.filter((step) => step.priority === options.priority);
  }

  if (options.excludeFindingIds && options.excludeFindingIds.length > 0) {
    const exclude = new Set(options.excludeFindingIds);
    steps = steps.filter((step) => !exclude.has(step.findingId));
  }

  const limit = options.limit ?? 5;

  return steps.slice(0, limit);
}

function toRemediationItem(step: CoherencyRemediationStep): RemediationWorkOrderItem {
  return {
    findingId: step.findingId,
    priority: step.priority,
    title: step.title,
    action: step.action,
    files: step.files,
    systems: step.systems,
    severity: step.severity,
  };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.length > 0))).sort();
}

function buildRemediationRiskNotes(
  items: RemediationWorkOrderItem[],
  lifecycle?: FindingLifecycleReport,
): string[] {
  const notes: string[] = [];

  if (items.some((item) => item.priority === "p0")) {
    notes.push("P0 items require extra caution. Critical/high severity findings must be addressed before lower-priority work.");
  }

  const systems = uniqueSorted(items.flatMap((item) => item.systems));

  if (systems.length > 1) {
    notes.push(`Cross-system remediation across ${systems.join(", ")} requires seam resolution before implementation.`);
  }

  if (lifecycle) {
    const { accepted = 0, ignored = 0, resolved = 0 } = lifecycle.summary ?? {};

    if (accepted + ignored + resolved > 0) {
      notes.push(`Accepted/ignored/resolved findings are excluded from remediation work (${accepted + ignored + resolved} excluded).`);
    }
  } else {
    notes.push("Accepted/ignored/resolved findings are excluded from remediation work.");
  }

  return notes;
}

function renderResolverWorkOrder(workOrder: WorkOrder): string {
  return [
    "# Rekon Work Order",
    "",
    `Goal: ${workOrder.goal}`,
    `Paths: ${workOrder.paths.join(", ") || "none"}`,
    `Owner systems: ${workOrder.ownerSystems.join(", ") || "unknown"}`,
    "",
    "## Required Checks",
    "",
    ...workOrder.requiredChecks.map((command) => `- ${command}`),
    "",
    "## Success Criteria",
    "",
    ...workOrder.successCriteria.map((criterion) => `- ${criterion}`),
    "",
    "## Guardrail",
    "",
    workOrder.antiGamingInstruction,
  ].join("\n");
}

function renderRemediationWorkOrder(input: {
  workOrder: WorkOrder;
  deltaRef: ArtifactRef;
  lifecycleRef?: ArtifactRef;
}): string {
  const { workOrder, deltaRef, lifecycleRef } = input;
  const items = workOrder.remediationItems ?? [];
  const tableRows = items.length === 0
    ? ["| _none_ | _none_ | _none_ | _none_ | _none_ | _none_ |"]
    : items.map((item) =>
      `| ${item.priority} | ${escapeCell(item.findingId)} | ${item.severity} | ${escapeCell(item.systems.join(", ") || "unknown")} | ${escapeCell(item.files.join(", ") || "n/a")} | ${escapeCell(item.action)} |`,
    );
  const sourceLine = lifecycleRef
    ? `CoherencyDelta: ${deltaRef.id}\nFindingLifecycleReport: ${lifecycleRef.id}`
    : `CoherencyDelta: ${deltaRef.id}`;
  const followUp = [
    "- Re-run `rekon evaluate`",
    "- Re-run `rekon findings lifecycle`",
    "- Re-run `rekon coherency delta`",
    "- Re-run `rekon publish architecture`",
  ];

  return [
    "# Rekon Remediation Work Order",
    "",
    "## Source",
    "",
    sourceLine,
    "",
    "## Objective",
    "",
    workOrder.goal,
    "",
    "## Selected Remediation Items",
    "",
    "| Priority | Finding | Severity | Systems | Files | Action |",
    "| --- | --- | --- | --- | --- | --- |",
    ...tableRows,
    "",
    "## Scope",
    "",
    `Paths: ${workOrder.paths.join(", ") || "none"}`,
    `Owner systems: ${workOrder.ownerSystems.join(", ") || "unknown"}`,
    "",
    "## Required Checks",
    "",
    ...workOrder.requiredChecks.map((command) => `- ${command}`),
    "",
    "## Success Criteria",
    "",
    ...workOrder.successCriteria.map((criterion) => `- ${criterion}`),
    "",
    "## Guardrails",
    "",
    workOrder.antiGamingInstruction,
    ...(workOrder.riskNotes.length > 0
      ? ["", "### Risk Notes", "", ...workOrder.riskNotes.map((note) => `- ${note}`)]
      : []),
    "",
    "## Follow-up Evidence",
    "",
    ...followUp,
  ].join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

// ---------- PathFreshnessReport (P1.1 path-freshness-report) ----------
//
// `PathFreshnessReport` records a deterministic comparison
// between the **current** working-tree fingerprint of a
// declared path set and a **baseline** fingerprint captured
// by an earlier `PathFreshnessReport` (the first run has no
// baseline and records status `"unknown"`).
//
// **Working-tree freshness is distinct from artifact lineage
// freshness.** The runtime's `validateArtifactFreshness`
// flags drift within the *artifact* lineage; this report
// flags drift between the *source files* and the latest
// recorded source-state baseline. The two coexist; neither
// replaces the other.
//
// Safety contract:
// - The report carries hashes + path-level metadata only;
//   never raw file contents.
// - File mtimes are advisory only — *never* canonical
//   freshness evidence.
// - The report is **read-only with respect to source
//   files**; the only artifact it writes is itself.
// - No watcher daemon. No background refresh. The
//   recommendation field tells operators to run
//   `rekon refresh` explicitly when the working tree
//   has drifted.

export type PathFreshnessStatus = "fresh" | "stale" | "unknown";

export type PathFreshnessPathStatus =
  | "fresh"
  | "changed"
  | "missing"
  | "new"
  | "unknown";

const PATH_FRESHNESS_STATUSES = new Set<PathFreshnessStatus>([
  "fresh",
  "stale",
  "unknown",
]);

const PATH_FRESHNESS_ENTRY_STATUSES = new Set<PathFreshnessPathStatus>([
  "fresh",
  "changed",
  "missing",
  "new",
  "unknown",
]);

export type SourcePathFingerprint = {
  path: string;
  hash?: string;
  size?: number;
  exists: boolean;
  /**
   * mtime is **advisory only** — never canonical freshness
   * evidence. Hash comparison is the source of truth.
   */
  mtimeAdvisory?: string;
};

export type SourceStateFingerprint = {
  algorithm: "sha256";
  rootHash: string;
  paths: SourcePathFingerprint[];
  generatedAt: string;
  /**
   * Globs that were ignored during the walk that produced
   * this fingerprint. Recorded so audit reviewers can
   * see what was deliberately excluded.
   */
  ignoredGlobs?: string[];
};

export type PathFreshnessEntry = {
  path: string;
  status: PathFreshnessPathStatus;
  currentHash?: string;
  baselineHash?: string;
  currentExists?: boolean;
  baselineExists?: boolean;
  message?: string;
};

export type PathFreshnessRecommendation = {
  refreshRecommended: boolean;
  commands: string[];
  message: string;
};

export type PathFreshnessSummary = {
  total: number;
  fresh: number;
  changed: number;
  missing: number;
  new: number;
  unknown: number;
};

export type PathFreshnessReport = {
  header: ArtifactHeader;
  status: PathFreshnessStatus;
  baselineRef?: ArtifactRef;
  baselineGeneratedAt?: string;
  currentSourceState: SourceStateFingerprint;
  baselineSourceState?: SourceStateFingerprint;
  entries: PathFreshnessEntry[];
  summary: PathFreshnessSummary;
  recommendation: PathFreshnessRecommendation;
};

export type CreatePathFreshnessReportInput = {
  header: ArtifactHeader;
  status: PathFreshnessStatus;
  currentSourceState: SourceStateFingerprint;
  baselineSourceState?: SourceStateFingerprint;
  baselineRef?: ArtifactRef;
  baselineGeneratedAt?: string;
  entries: PathFreshnessEntry[];
  summary: PathFreshnessSummary;
  recommendation: PathFreshnessRecommendation;
};

export function createPathFreshnessReport(
  input: CreatePathFreshnessReportInput,
): PathFreshnessReport {
  if (!input || typeof input !== "object") {
    throw new TypeError("createPathFreshnessReport requires an input object.");
  }
  if (!input.header || typeof input.header !== "object") {
    throw new TypeError("createPathFreshnessReport requires input.header.");
  }
  if (input.header.artifactType !== "PathFreshnessReport") {
    throw new TypeError(
      "createPathFreshnessReport requires input.header.artifactType === \"PathFreshnessReport\".",
    );
  }
  if (!PATH_FRESHNESS_STATUSES.has(input.status)) {
    throw new TypeError(
      `createPathFreshnessReport input.status must be one of ${[...PATH_FRESHNESS_STATUSES].join(", ")}.`,
    );
  }
  if (!input.currentSourceState || typeof input.currentSourceState !== "object") {
    throw new TypeError(
      "createPathFreshnessReport requires input.currentSourceState.",
    );
  }
  if (input.currentSourceState.algorithm !== "sha256") {
    throw new TypeError(
      "createPathFreshnessReport currentSourceState.algorithm must be \"sha256\".",
    );
  }
  if (typeof input.currentSourceState.rootHash !== "string" || input.currentSourceState.rootHash.length === 0) {
    throw new TypeError(
      "createPathFreshnessReport currentSourceState.rootHash must be a non-empty string.",
    );
  }
  if (!Array.isArray(input.currentSourceState.paths)) {
    throw new TypeError(
      "createPathFreshnessReport currentSourceState.paths must be an array.",
    );
  }
  if (!Array.isArray(input.entries)) {
    throw new TypeError("createPathFreshnessReport requires input.entries to be an array.");
  }
  for (const entry of input.entries) {
    if (!entry || typeof entry !== "object") {
      throw new TypeError("createPathFreshnessReport input.entries[] must be objects.");
    }
    if (typeof entry.path !== "string" || entry.path.length === 0) {
      throw new TypeError("createPathFreshnessReport entry.path must be a non-empty string.");
    }
    if (!PATH_FRESHNESS_ENTRY_STATUSES.has(entry.status)) {
      throw new TypeError(
        `createPathFreshnessReport entry.status must be one of ${[...PATH_FRESHNESS_ENTRY_STATUSES].join(", ")}.`,
      );
    }
  }
  if (!input.summary || typeof input.summary !== "object") {
    throw new TypeError("createPathFreshnessReport requires input.summary.");
  }
  if (!input.recommendation || typeof input.recommendation !== "object") {
    throw new TypeError("createPathFreshnessReport requires input.recommendation.");
  }
  if (typeof input.recommendation.refreshRecommended !== "boolean") {
    throw new TypeError(
      "createPathFreshnessReport recommendation.refreshRecommended must be a boolean.",
    );
  }
  if (!Array.isArray(input.recommendation.commands)) {
    throw new TypeError(
      "createPathFreshnessReport recommendation.commands must be an array.",
    );
  }
  if (typeof input.recommendation.message !== "string") {
    throw new TypeError(
      "createPathFreshnessReport recommendation.message must be a string.",
    );
  }

  const report: PathFreshnessReport = {
    header: input.header,
    status: input.status,
    currentSourceState: input.currentSourceState,
    entries: input.entries,
    summary: input.summary,
    recommendation: input.recommendation,
  };

  if (input.baselineRef) {
    report.baselineRef = input.baselineRef;
  }
  if (typeof input.baselineGeneratedAt === "string" && input.baselineGeneratedAt.length > 0) {
    report.baselineGeneratedAt = input.baselineGeneratedAt;
  }
  if (input.baselineSourceState) {
    report.baselineSourceState = input.baselineSourceState;
  }

  return report;
}

/**
 * Compare a `currentSourceState` fingerprint against a
 * `baselineSourceState` fingerprint and derive
 * `PathFreshnessReport` entries + summary + status +
 * recommendation. Pure: no I/O, no source mutation.
 *
 * If `baselineSourceState` is `undefined`, every current
 * path is reported `unknown`; status is `unknown`;
 * recommendation message names the missing baseline.
 */
export function comparePathFreshness(
  currentSourceState: SourceStateFingerprint,
  baselineSourceState: SourceStateFingerprint | undefined,
): {
  status: PathFreshnessStatus;
  entries: PathFreshnessEntry[];
  summary: PathFreshnessSummary;
  recommendation: PathFreshnessRecommendation;
} {
  if (!currentSourceState || typeof currentSourceState !== "object") {
    throw new TypeError("comparePathFreshness requires currentSourceState.");
  }

  const entries: PathFreshnessEntry[] = [];
  const summary: PathFreshnessSummary = {
    total: 0,
    fresh: 0,
    changed: 0,
    missing: 0,
    new: 0,
    unknown: 0,
  };

  if (!baselineSourceState) {
    for (const path of currentSourceState.paths) {
      entries.push({
        path: path.path,
        status: "unknown",
        currentHash: path.hash,
        currentExists: path.exists,
        message: "No prior PathFreshnessReport baseline found.",
      });
    }
    summary.total = entries.length;
    summary.unknown = entries.length;
    return {
      status: "unknown",
      entries,
      summary,
      recommendation: {
        refreshRecommended: false,
        commands: [],
        message:
          "First PathFreshnessReport run on this repo: no baseline to compare against. "
          + "Re-run `rekon paths freshness` after changes to compare working-tree state to this baseline.",
      },
    };
  }

  const baselineByPath = new Map<string, SourcePathFingerprint>();
  for (const path of baselineSourceState.paths) {
    baselineByPath.set(path.path, path);
  }
  const currentByPath = new Map<string, SourcePathFingerprint>();
  for (const path of currentSourceState.paths) {
    currentByPath.set(path.path, path);
  }

  const allPaths = new Set<string>([
    ...baselineByPath.keys(),
    ...currentByPath.keys(),
  ]);
  const sortedPaths = [...allPaths].sort();

  for (const path of sortedPaths) {
    const current = currentByPath.get(path);
    const baseline = baselineByPath.get(path);

    if (!current && baseline) {
      entries.push({
        path,
        status: "missing",
        baselineHash: baseline.hash,
        currentExists: false,
        baselineExists: baseline.exists,
        message: "Path was present in baseline but is absent now.",
      });
      summary.missing += 1;
      continue;
    }
    if (current && !baseline) {
      entries.push({
        path,
        status: "new",
        currentHash: current.hash,
        currentExists: current.exists,
        baselineExists: false,
        message: "Path is new relative to baseline.",
      });
      summary.new += 1;
      continue;
    }
    if (current && baseline) {
      if (current.exists === false && baseline.exists === false) {
        entries.push({
          path,
          status: "fresh",
          currentExists: false,
          baselineExists: false,
        });
        summary.fresh += 1;
        continue;
      }
      if (current.exists !== baseline.exists) {
        entries.push({
          path,
          status: current.exists ? "new" : "missing",
          currentHash: current.hash,
          baselineHash: baseline.hash,
          currentExists: current.exists,
          baselineExists: baseline.exists,
          message: current.exists
            ? "Path was absent in baseline but is present now."
            : "Path was present in baseline but is absent now.",
        });
        if (current.exists) {
          summary.new += 1;
        } else {
          summary.missing += 1;
        }
        continue;
      }
      if (current.hash !== baseline.hash) {
        entries.push({
          path,
          status: "changed",
          currentHash: current.hash,
          baselineHash: baseline.hash,
          currentExists: current.exists,
          baselineExists: baseline.exists,
          message: "Content hash differs from baseline.",
        });
        summary.changed += 1;
        continue;
      }
      entries.push({
        path,
        status: "fresh",
        currentHash: current.hash,
        baselineHash: baseline.hash,
        currentExists: current.exists,
        baselineExists: baseline.exists,
      });
      summary.fresh += 1;
    }
  }

  summary.total = entries.length;

  const isStale = summary.changed > 0 || summary.missing > 0 || summary.new > 0;
  const status: PathFreshnessStatus = isStale ? "stale" : "fresh";

  const recommendation: PathFreshnessRecommendation = isStale
    ? {
        refreshRecommended: true,
        commands: ["rekon refresh"],
        message:
          "Source paths changed since the last PathFreshnessReport. "
          + "Run `rekon refresh` before relying on existing artifacts.",
      }
    : {
        refreshRecommended: false,
        commands: [],
        message: "Working-tree paths match the baseline; no refresh required.",
      };

  return { status, entries, summary, recommendation };
}

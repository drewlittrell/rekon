// Intent VerificationPlan handoff generator.
//
// Reads a proof-approved PreparedIntentPlan (plus IntentStatusReport, an optional
// WorkOrder, and optional PathFreshnessReport / RuntimeGraphDriftReport for the
// handoff-time recheck), verifies the proof-planning gate, classifies each
// verification requirement command for safety, and either reports blockers or
// produces exactly one VerificationPlan. The plan traces back to the prepared plan
// and carries an explicit boundary marker.
//
// **Boundary.** This is VerificationPlan artifact generation, NOT intent:go. It
// reads no files, writes no artifacts itself (the CLI persists the result), runs
// no commands, writes no source, creates no WorkOrder / VerificationRun /
// VerificationResult, and mutates no input.
//
// See:
// - docs/strategy/intent-verification-plan-handoff-decision.md
// - docs/concepts/intent-verification-plan-handoff.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";

/** Stable header `artifactId` prefix for a generated VerificationPlan. */
export const INTENT_VERIFICATION_PLAN_ARTIFACT_ID_PREFIX = "verification-plan-intent-handoff-";

/** IntentStatusReport status values that allow proof planning. */
export const INTENT_VERIFICATION_PLAN_ALLOWED_STATUSES = ["work-ready", "work-in-progress", "verification-ready"] as const;

export type IntentVerificationPlanCommandSafety = "safe" | "needs-review" | "rejected";

export type IntentVerificationPlanPreparedPlanLike = {
  header?: ArtifactHeader;
  request?: { goal?: string; kind?: string };
  status?: { value?: string };
  approval?: {
    status?: string;
    proof?: { downstreamHandoff?: { verificationPlanAllowed?: boolean; sourceWriteAllowed?: boolean } };
  };
  phases?: Array<{ id?: string }>;
  obligations?: Array<{ id?: string }>;
  verificationRequirements?: Array<{ id?: string; command?: string; reason?: string; sourceRefs?: ArtifactRef[] }>;
  source?: { intentAssessmentReportRef?: ArtifactRef };
};

export type IntentVerificationPlanStatusReportLike = {
  header?: ArtifactHeader;
  status?: { value?: string };
  blockers?: Array<{ severity?: string }>;
};

export type IntentVerificationPlanWorkOrderLike = {
  header?: ArtifactHeader;
  source?: string;
};

export type IntentVerificationPlanPathFreshnessLike = {
  header?: ArtifactHeader;
  status?: string;
  entries?: Array<{ status?: string }>;
};

export type IntentVerificationPlanRuntimeDriftLike = {
  header?: ArtifactHeader;
  rows?: Array<{ status?: string; severity?: string }>;
};

export type IntentVerificationPlanHandoffBlocker = {
  id: string;
  category:
    | "missing-prepared-plan"
    | "plan-not-approved"
    | "plan-not-prepared"
    | "missing-verification-requirements"
    | "missing-intent-status"
    | "status-not-allowed"
    | "status-has-high-blocker"
    | "freshness-stale"
    | "drift-changed"
    | "missing-source-ref"
    | "verification-plan-not-allowed"
    | "source-write-boundary"
    | "unsafe-command"
    | "ambiguous-requirement";
  severity: "medium" | "high";
  message: string;
  sourceRefs?: ArtifactRef[];
};

export type IntentVerificationPlanRequirementMapping = {
  requirementId: string;
  command?: string;
  check?: string;
  reason: string;
  safety: IntentVerificationPlanCommandSafety;
  sourceRefs?: ArtifactRef[];
};

export type IntentVerificationPlanHandoffBoundary = {
  createsWorkOrder: false;
  createsVerificationRun: false;
  createsVerificationResult: false;
  executesCommands: false;
  writesSourceFiles: false;
};

export type IntentGeneratedVerificationPlan = {
  header: ArtifactHeader;
  workOrderRef?: ArtifactRef;
  commands: string[];
  successCriteria: string[];
  source: "intent-handoff";
  intentHandoff: {
    preparedIntentPlanRef: ArtifactRef;
    intentAssessmentReportRef?: ArtifactRef;
    intentStatusReportRef?: ArtifactRef;
    workOrderRef?: ArtifactRef;
    pathFreshnessReportRef?: ArtifactRef;
    runtimeGraphDriftReportRef?: ArtifactRef;
    verificationRequirementIds: string[];
    phaseIds: string[];
    obligationIds: string[];
    requirementMappings: IntentVerificationPlanRequirementMapping[];
    boundary: IntentVerificationPlanHandoffBoundary;
  };
};

export type IntentVerificationPlanHandoffResult =
  | {
      status: "generated";
      verificationPlan: IntentGeneratedVerificationPlan;
      blockers: IntentVerificationPlanHandoffBlocker[];
      mappings: IntentVerificationPlanRequirementMapping[];
    }
  | {
      status: "blocked";
      verificationPlan?: undefined;
      blockers: IntentVerificationPlanHandoffBlocker[];
      mappings: IntentVerificationPlanRequirementMapping[];
    };

export type BuildIntentVerificationPlanHandoffInput = {
  header?: ArtifactHeader;
  repoId?: string;
  generatedAt?: string;

  preparedIntentPlan?: IntentVerificationPlanPreparedPlanLike;
  preparedIntentPlanRef?: ArtifactRef;
  intentStatusReport?: IntentVerificationPlanStatusReportLike;
  intentStatusReportRef?: ArtifactRef;
  workOrder?: IntentVerificationPlanWorkOrderLike;
  workOrderRef?: ArtifactRef;
  pathFreshnessReport?: IntentVerificationPlanPathFreshnessLike;
  pathFreshnessReportRef?: ArtifactRef;
  runtimeGraphDriftReport?: IntentVerificationPlanRuntimeDriftLike;
  runtimeGraphDriftReportRef?: ArtifactRef;
};

// Command-safety classifier. Commands are never executed — this only decides
// whether a requirement's command string is safe to copy into the plan verbatim.
const SAFE_COMMAND_PATTERNS: RegExp[] = [
  /^npm run [a-z][a-z0-9:_-]*$/,
  /^npm test$/,
  /^node scripts\/[A-Za-z0-9._-]+\.mjs$/,
  /^rekon [a-z][a-z0-9 _-]*--json$/,
  /^rekon artifacts (validate|freshness)( --json)?$/,
];

const REJECT_TOKENS = [
  ";", "&&", "||", "|", ">", "<", "`", "$(", "${",
  "rm ", "mv ", "cp ", "chmod", "chown", "curl", "wget", "ssh", "scp", "sudo",
  "git push", "npm publish",
];

export function classifyVerificationCommand(command: string | undefined, reason: string | undefined): IntentVerificationPlanCommandSafety {
  const hasReason = typeof reason === "string" && reason.trim().length > 0;
  const trimmed = typeof command === "string" ? command.trim() : "";
  if (trimmed.length === 0) {
    // Commandless requirement: a clear reason → manual/needs-review check; no
    // reason → ambiguous and rejected.
    return hasReason ? "needs-review" : "rejected";
  }
  if (!hasReason) return "rejected";
  if (REJECT_TOKENS.some((token) => trimmed.includes(token))) return "rejected";
  if (SAFE_COMMAND_PATTERNS.some((pattern) => pattern.test(trimmed))) return "safe";
  return "needs-review";
}

function freshnessIsStale(report: IntentVerificationPlanPathFreshnessLike | undefined): boolean {
  if (!report) return false;
  if (report.status === "stale") return true;
  if (Array.isArray(report.entries)) {
    for (const entry of report.entries) {
      if (entry && (entry.status === "changed" || entry.status === "missing")) return true;
    }
  }
  return false;
}

function countHighOpenDrift(report: IntentVerificationPlanRuntimeDriftLike | undefined): number {
  if (!report || !Array.isArray(report.rows)) return 0;
  let count = 0;
  for (const row of report.rows) {
    if (!row) continue;
    if (row.severity === "high" && row.status !== "in-sync" && row.status !== "not-evaluated") count += 1;
  }
  return count;
}

function uniqueNonEmpty(values: Iterable<string | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) set.add(value);
  }
  return [...set];
}

export function buildIntentVerificationPlanHandoff(
  input: BuildIntentVerificationPlanHandoffInput,
): IntentVerificationPlanHandoffResult {
  const plan = input.preparedIntentPlan;
  const planRef = input.preparedIntentPlanRef;
  const status = input.intentStatusReport;
  const statusRef = input.intentStatusReportRef;

  const blockers: IntentVerificationPlanHandoffBlocker[] = [];
  const planRefs = planRef ? [planRef] : undefined;
  const statusRefs = statusRef ? [statusRef] : undefined;
  const freshnessRefs = input.pathFreshnessReportRef ? [input.pathFreshnessReportRef] : undefined;
  const driftRefs = input.runtimeGraphDriftReportRef ? [input.runtimeGraphDriftReportRef] : undefined;
  const push = (
    id: string,
    category: IntentVerificationPlanHandoffBlocker["category"],
    message: string,
    sourceRefs?: ArtifactRef[],
  ): void => {
    blockers.push({ id, category, severity: "high", message, ...(sourceRefs ? { sourceRefs } : {}) });
  };

  // ---- Map + classify verification requirements (computed for every call) ----
  const requirements = Array.isArray(plan?.verificationRequirements)
    ? plan.verificationRequirements.filter((r): r is NonNullable<typeof r> => Boolean(r))
    : [];
  const mappings: IntentVerificationPlanRequirementMapping[] = requirements.map((requirement) => {
    const command = typeof requirement.command === "string" && requirement.command.trim().length > 0 ? requirement.command.trim() : undefined;
    const reason = typeof requirement.reason === "string" && requirement.reason.trim().length > 0 ? requirement.reason.trim() : "Verify the change.";
    const safety = classifyVerificationCommand(requirement.command, requirement.reason);
    const mapping: IntentVerificationPlanRequirementMapping = {
      requirementId: String(requirement.id ?? ""),
      reason,
      safety,
      ...(command ? { command } : {}),
      ...(command ? {} : { check: reason }),
      ...(Array.isArray(requirement.sourceRefs) && requirement.sourceRefs.length > 0 ? { sourceRefs: requirement.sourceRefs } : {}),
    };
    return mapping;
  });

  // ---- Gate ----
  if (!plan) {
    push("missing-prepared-plan", "missing-prepared-plan", "A PreparedIntentPlan is required.");
  }
  if (!planRef) {
    push("missing-prepared-plan-ref", "missing-source-ref", "A PreparedIntentPlan ref is required.");
  }

  const approvalStatus = plan?.approval?.status;
  const statusValue = plan?.status?.value;
  const downstream = plan?.approval?.proof?.downstreamHandoff;

  if (plan && approvalStatus !== "approved") {
    push("plan-not-approved", "plan-not-approved", "PreparedIntentPlan approval.status must be approved.", planRefs);
  }
  if (plan && statusValue !== "prepared") {
    push("plan-not-prepared", "plan-not-prepared", "PreparedIntentPlan status.value must be prepared.", planRefs);
  }
  if (plan && requirements.length === 0) {
    push("missing-verification-requirements", "missing-verification-requirements", "PreparedIntentPlan must contain verification requirements.", planRefs);
  }

  if (!status) {
    push("status-missing", "missing-intent-status", "An IntentStatusReport is required.");
  } else {
    if (!statusRef) {
      push("status-missing-ref", "missing-source-ref", "An IntentStatusReport ref is required.");
    }
    const allowed = (INTENT_VERIFICATION_PLAN_ALLOWED_STATUSES as readonly string[]).includes(String(status.status?.value));
    if (!allowed) {
      push("status-not-allowed", "status-not-allowed", "IntentStatusReport status.value must be work-ready, work-in-progress, or verification-ready.", statusRefs);
    }
    if (Array.isArray(status.blockers) && status.blockers.some((b) => b && b.severity === "high")) {
      push("status-has-high-blocker", "status-has-high-blocker", "IntentStatusReport has a high-severity blocker.", statusRefs);
    }
  }

  if (plan && downstream?.verificationPlanAllowed !== true) {
    push("verification-plan-not-allowed", "verification-plan-not-allowed", "PreparedIntentPlan approval proof must allow the VerificationPlan handoff.", planRefs);
  }
  if (plan && downstream?.sourceWriteAllowed !== false) {
    push("source-write-boundary", "source-write-boundary", "PreparedIntentPlan approval proof sourceWriteAllowed must be false.", planRefs);
  }

  // Handoff-time freshness / drift recheck (no override).
  if (freshnessIsStale(input.pathFreshnessReport)) {
    push("freshness-stale", "freshness-stale", "PathFreshnessReport indicates stale scoped context at handoff time.", freshnessRefs);
  }
  const driftHigh = countHighOpenDrift(input.runtimeGraphDriftReport);
  if (driftHigh > 0) {
    push("drift-changed", "drift-changed", `RuntimeGraphDriftReport has ${driftHigh} unresolved high-severity row(s) at handoff time.`, driftRefs);
  }

  // Command safety: any rejected requirement blocks generation.
  for (const mapping of mappings) {
    if (mapping.safety !== "rejected") continue;
    if (mapping.command) {
      push(`unsafe-command:${mapping.requirementId}`, "unsafe-command", `Verification requirement ${mapping.requirementId} has an unsafe command and cannot be planned.`, planRefs);
    } else {
      push(`ambiguous-requirement:${mapping.requirementId}`, "ambiguous-requirement", `Verification requirement ${mapping.requirementId} is ambiguous (no command and no reason).`, planRefs);
    }
  }

  if (blockers.length > 0 || !plan || !planRef) {
    return { status: "blocked", blockers, mappings };
  }

  // ---- Generate exactly one VerificationPlan ----
  const commands = mappings.filter((m) => m.safety === "safe" && m.command).map((m) => m.command as string);
  const goal = typeof plan.request?.goal === "string" && plan.request.goal.length > 0 ? plan.request.goal : "Prove the prepared intent";
  const successCriteria = uniqueNonEmpty([
    `Prove: ${goal}`,
    ...mappings.map((m) => m.reason),
    "Verification commands pass or failures are reported with concrete evidence.",
  ]);

  const phases = Array.isArray(plan.phases) ? plan.phases.filter((p): p is NonNullable<typeof p> => Boolean(p)) : [];
  const obligations = Array.isArray(plan.obligations) ? plan.obligations.filter((o): o is NonNullable<typeof o> => Boolean(o)) : [];
  const phaseIds = phases.map((p) => String(p.id ?? "")).filter((id) => id.length > 0);
  const obligationIds = obligations.map((o) => String(o.id ?? "")).filter((id) => id.length > 0);
  const verificationRequirementIds = mappings.map((m) => m.requirementId).filter((id) => id.length > 0);

  const assessmentRef = plan.source?.intentAssessmentReportRef;
  const inputRefs: ArtifactRef[] = [planRef];
  if (assessmentRef) inputRefs.push(assessmentRef);
  if (statusRef) inputRefs.push(statusRef);
  if (input.workOrderRef) inputRefs.push(input.workOrderRef);
  if (input.pathFreshnessReportRef) inputRefs.push(input.pathFreshnessReportRef);
  if (input.runtimeGraphDriftReportRef) inputRefs.push(input.runtimeGraphDriftReportRef);

  const header: ArtifactHeader = input.header ?? {
    artifactType: "VerificationPlan",
    artifactId: `${INTENT_VERIFICATION_PLAN_ARTIFACT_ID_PREFIX}${typeof input.generatedAt === "string" ? input.generatedAt : "0"}`,
    schemaVersion: "0.1.0",
    generatedAt: typeof input.generatedAt === "string" ? input.generatedAt : "1970-01-01T00:00:00.000Z",
    subject: { repoId: typeof input.repoId === "string" ? input.repoId : "." },
    producer: { id: "@rekon/capability-model.intent-verification-plan-handoff", version: "0.1.0-beta.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };

  const verificationPlan: IntentGeneratedVerificationPlan = {
    header,
    ...(input.workOrderRef ? { workOrderRef: input.workOrderRef } : {}),
    commands,
    successCriteria,
    source: "intent-handoff",
    intentHandoff: {
      preparedIntentPlanRef: planRef,
      ...(assessmentRef ? { intentAssessmentReportRef: assessmentRef } : {}),
      ...(statusRef ? { intentStatusReportRef: statusRef } : {}),
      ...(input.workOrderRef ? { workOrderRef: input.workOrderRef } : {}),
      ...(input.pathFreshnessReportRef ? { pathFreshnessReportRef: input.pathFreshnessReportRef } : {}),
      ...(input.runtimeGraphDriftReportRef ? { runtimeGraphDriftReportRef: input.runtimeGraphDriftReportRef } : {}),
      verificationRequirementIds,
      phaseIds,
      obligationIds,
      requirementMappings: mappings,
      boundary: {
        createsWorkOrder: false,
        createsVerificationRun: false,
        createsVerificationResult: false,
        executesCommands: false,
        writesSourceFiles: false,
      },
    },
  };

  return { status: "generated", verificationPlan, blockers: [], mappings };
}

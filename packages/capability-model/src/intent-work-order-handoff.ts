// Intent WorkOrder handoff generator.
//
// Reads a proof-approved PreparedIntentPlan (plus IntentStatusReport, and
// optional PathFreshnessReport / RuntimeGraphDriftReport for the handoff-time
// recheck), verifies the WorkOrder generation gate, and either reports blockers
// or produces exactly one WorkOrder. The WorkOrder traces back to the prepared
// plan and carries an explicit boundary marker.
//
// **Boundary.** This is WorkOrder artifact generation, NOT intent:go. It reads
// no files, writes no artifacts itself (the CLI persists the result), runs no
// commands, writes no source, creates no VerificationPlan, and mutates no input.
//
// See:
// - docs/strategy/intent-work-order-handoff-decision.md
// - docs/concepts/intent-work-order-handoff.md

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";

/** Stable header `artifactId` prefix for a generated WorkOrder. */
export const INTENT_WORK_ORDER_ARTIFACT_ID_PREFIX = "work-order-intent-handoff-";

export type IntentWorkOrderScope = {
  paths?: string[];
  systems?: string[];
  capabilities?: string[];
  steps?: string[];
};

export type IntentWorkOrderPreparedPlanLike = {
  header?: ArtifactHeader;
  request?: { goal?: string; kind?: string; scope?: IntentWorkOrderScope };
  status?: { value?: string; recommendedNextAction?: string };
  approval?: {
    status?: string;
    proof?: { downstreamHandoff?: { workOrderAllowed?: boolean; sourceWriteAllowed?: boolean } };
  };
  phases?: Array<{
    id?: string;
    title?: string;
    kind?: string;
    status?: string;
    goal?: string;
    paths?: string[];
    systems?: string[];
    capabilities?: string[];
    steps?: string[];
    obligations?: string[];
    verificationRequirements?: string[];
  }>;
  obligations?: Array<{ id?: string; category?: string; severity?: string; message?: string }>;
  verificationRequirements?: Array<{ id?: string; command?: string; reason?: string }>;
  blockedReasons?: Array<{ id?: string; message?: string }>;
  source?: { intentAssessmentReportRef?: ArtifactRef };
};

export type IntentWorkOrderStatusReportLike = {
  header?: ArtifactHeader;
  status?: { value?: string };
  blockers?: Array<{ severity?: string }>;
};

export type IntentWorkOrderPathFreshnessLike = {
  header?: ArtifactHeader;
  status?: string;
  entries?: Array<{ status?: string }>;
};

export type IntentWorkOrderRuntimeDriftLike = {
  header?: ArtifactHeader;
  rows?: Array<{ status?: string; severity?: string }>;
};

export type IntentWorkOrderGenerationBlocker = {
  id: string;
  category:
    | "missing-prepared-plan"
    | "plan-not-approved"
    | "plan-not-prepared"
    | "next-action-not-work-order"
    | "status-not-work-ready"
    | "status-has-high-blocker"
    | "freshness-stale"
    | "drift-changed"
    | "missing-source-ref"
    | "empty-phases"
    | "handoff-not-allowed"
    | "source-write-boundary";
  severity: "medium" | "high";
  message: string;
  sourceRefs?: ArtifactRef[];
};

export type IntentGeneratedWorkOrder = {
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
  source: "intent-handoff";
  intentHandoff: {
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
};

export type IntentWorkOrderGenerationResult =
  | { status: "generated"; workOrder: IntentGeneratedWorkOrder; blockers: IntentWorkOrderGenerationBlocker[] }
  | { status: "blocked"; workOrder?: undefined; blockers: IntentWorkOrderGenerationBlocker[] };

export type BuildIntentWorkOrderHandoffInput = {
  header?: ArtifactHeader;
  repoId?: string;
  generatedAt?: string;

  preparedIntentPlan?: IntentWorkOrderPreparedPlanLike;
  preparedIntentPlanRef?: ArtifactRef;
  intentStatusReport?: IntentWorkOrderStatusReportLike;
  intentStatusReportRef?: ArtifactRef;
  pathFreshnessReport?: IntentWorkOrderPathFreshnessLike;
  pathFreshnessReportRef?: ArtifactRef;
  runtimeGraphDriftReport?: IntentWorkOrderRuntimeDriftLike;
  runtimeGraphDriftReportRef?: ArtifactRef;
};

const ANTI_GAMING =
  "Do not bypass failing checks, delete tests, or weaken validation to make verification pass. " +
  "This WorkOrder was generated from a proof-approved PreparedIntentPlan; it creates no VerificationPlan, " +
  "executes no commands, and writes no source files.";

function uniqueSorted(values: Iterable<string>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function freshnessIsStale(report: IntentWorkOrderPathFreshnessLike | undefined): boolean {
  if (!report) return false;
  if (report.status === "stale") return true;
  if (Array.isArray(report.entries)) {
    for (const entry of report.entries) {
      if (entry && (entry.status === "changed" || entry.status === "missing")) return true;
    }
  }
  return false;
}

function countHighOpenDrift(report: IntentWorkOrderRuntimeDriftLike | undefined): number {
  if (!report || !Array.isArray(report.rows)) return 0;
  let count = 0;
  for (const row of report.rows) {
    if (!row) continue;
    if (row.severity === "high" && row.status !== "in-sync" && row.status !== "not-evaluated") count += 1;
  }
  return count;
}

export function buildIntentWorkOrderHandoff(input: BuildIntentWorkOrderHandoffInput): IntentWorkOrderGenerationResult {
  const plan = input.preparedIntentPlan;
  const planRef = input.preparedIntentPlanRef;
  const status = input.intentStatusReport;
  const statusRef = input.intentStatusReportRef;

  const blockers: IntentWorkOrderGenerationBlocker[] = [];
  const planRefs = planRef ? [planRef] : undefined;
  const statusRefs = statusRef ? [statusRef] : undefined;
  const freshnessRefs = input.pathFreshnessReportRef ? [input.pathFreshnessReportRef] : undefined;
  const driftRefs = input.runtimeGraphDriftReportRef ? [input.runtimeGraphDriftReportRef] : undefined;
  const push = (
    id: string,
    category: IntentWorkOrderGenerationBlocker["category"],
    message: string,
    sourceRefs?: ArtifactRef[],
  ): void => {
    blockers.push({ id, category, severity: "high", message, ...(sourceRefs ? { sourceRefs } : {}) });
  };

  // ---- Gate ----
  if (!plan) {
    push("missing-prepared-plan", "missing-prepared-plan", "A PreparedIntentPlan is required.");
  }
  if (!planRef) {
    push("missing-prepared-plan-ref", "missing-source-ref", "A PreparedIntentPlan ref is required.");
  }

  const approvalStatus = plan?.approval?.status;
  const statusValue = plan?.status?.value;
  const nextAction = plan?.status?.recommendedNextAction;
  const downstream = plan?.approval?.proof?.downstreamHandoff;
  const phases = Array.isArray(plan?.phases) ? plan.phases.filter((p): p is NonNullable<typeof p> => Boolean(p)) : [];

  if (plan && approvalStatus !== "approved") {
    push("plan-not-approved", "plan-not-approved", "PreparedIntentPlan approval.status must be approved.", planRefs);
  }
  if (plan && statusValue !== "prepared") {
    push("plan-not-prepared", "plan-not-prepared", "PreparedIntentPlan status.value must be prepared.", planRefs);
  }
  if (plan && nextAction !== "create-work-order") {
    push("next-action-not-work-order", "next-action-not-work-order", "PreparedIntentPlan recommendedNextAction must be create-work-order.", planRefs);
  }

  if (!status) {
    push("status-missing", "status-not-work-ready", "An IntentStatusReport is required and must be work-ready.");
  } else {
    if (!statusRef) {
      push("status-missing-ref", "missing-source-ref", "An IntentStatusReport ref is required.");
    }
    if (status.status?.value !== "work-ready") {
      push("status-not-work-ready", "status-not-work-ready", "IntentStatusReport status.value must be work-ready.", statusRefs);
    }
    if (Array.isArray(status.blockers) && status.blockers.some((b) => b && b.severity === "high")) {
      push("status-has-high-blocker", "status-has-high-blocker", "IntentStatusReport has a high-severity blocker.", statusRefs);
    }
  }

  if (plan && downstream?.workOrderAllowed !== true) {
    push("handoff-not-allowed", "handoff-not-allowed", "PreparedIntentPlan approval proof must allow the WorkOrder handoff.", planRefs);
  }
  if (plan && downstream?.sourceWriteAllowed !== false) {
    push("source-write-boundary", "source-write-boundary", "PreparedIntentPlan approval proof sourceWriteAllowed must be false.", planRefs);
  }
  if (plan && phases.length === 0) {
    push("empty-phases", "empty-phases", "PreparedIntentPlan must have at least one phase.", planRefs);
  }

  // Handoff-time freshness / drift recheck. The latest/pinned artifact must not
  // indicate stale scoped context or new high-severity drift (no override).
  if (freshnessIsStale(input.pathFreshnessReport)) {
    push("freshness-stale", "freshness-stale", "PathFreshnessReport indicates stale scoped context at handoff time.", freshnessRefs);
  }
  const driftHigh = countHighOpenDrift(input.runtimeGraphDriftReport);
  if (driftHigh > 0) {
    push("drift-changed", "drift-changed", `RuntimeGraphDriftReport has ${driftHigh} unresolved high-severity row(s) at handoff time.`, driftRefs);
  }

  if (blockers.length > 0 || !plan || !planRef) {
    return { status: "blocked", blockers };
  }

  // ---- Generate exactly one WorkOrder ----
  const goal = typeof plan.request?.goal === "string" && plan.request.goal.length > 0 ? plan.request.goal : "Implement prepared intent";
  const paths = uniqueSorted(phases.flatMap((p) => (Array.isArray(p.paths) ? p.paths : [])));
  const ownerSystems = uniqueSorted(phases.flatMap((p) => (Array.isArray(p.systems) ? p.systems : [])));
  const obligations = Array.isArray(plan.obligations) ? plan.obligations.filter((o): o is NonNullable<typeof o> => Boolean(o)) : [];
  const requirements = Array.isArray(plan.verificationRequirements)
    ? plan.verificationRequirements.filter((r): r is NonNullable<typeof r> => Boolean(r))
    : [];
  const blockedReasons = Array.isArray(plan.blockedReasons) ? plan.blockedReasons.filter((b): b is NonNullable<typeof b> => Boolean(b)) : [];

  const riskNotes: string[] = [];
  for (const obligation of obligations) {
    if (typeof obligation.message === "string" && obligation.message.length > 0) riskNotes.push(obligation.message);
  }
  for (const reason of blockedReasons) {
    if (typeof reason.message === "string" && reason.message.length > 0) riskNotes.push(`Do not start: ${reason.message}`);
  }

  const requiredChecks: string[] = [];
  for (const requirement of requirements) {
    const command = typeof requirement.command === "string" ? requirement.command : undefined;
    const reason = typeof requirement.reason === "string" ? requirement.reason : "Verify the change.";
    requiredChecks.push(command ? `${command} — ${reason}` : reason);
  }

  const successCriteria = [
    "Implementation satisfies the prepared intent goal.",
    "All preservation obligations are respected.",
    "Verification guidance is addressed (verification requirements are proof obligations, not a VerificationPlan).",
  ];

  const phaseIds = phases.map((p) => String(p.id ?? "")).filter((id) => id.length > 0);
  const obligationIds = obligations.map((o) => String(o.id ?? "")).filter((id) => id.length > 0);
  const verificationRequirementIds = requirements.map((r) => String(r.id ?? "")).filter((id) => id.length > 0);

  const assessmentRef = plan.source?.intentAssessmentReportRef;
  const sourceRefs: ArtifactRef[] = [planRef];
  if (assessmentRef) sourceRefs.push(assessmentRef);
  if (statusRef) sourceRefs.push(statusRef);
  if (input.pathFreshnessReportRef) sourceRefs.push(input.pathFreshnessReportRef);
  if (input.runtimeGraphDriftReportRef) sourceRefs.push(input.runtimeGraphDriftReportRef);

  // ---- Markdown guidance ----
  const lines: string[] = [];
  lines.push(`# WorkOrder: ${goal}`, "");
  lines.push("Generated from a proof-approved PreparedIntentPlan via the Intent WorkOrder handoff.", "");
  lines.push("## Implementation phases", "");
  phases.forEach((phase, index) => {
    const title = typeof phase.title === "string" && phase.title.length > 0 ? phase.title : String(phase.id ?? `Phase ${index + 1}`);
    const kind = typeof phase.kind === "string" ? ` (${phase.kind})` : "";
    lines.push(`${index + 1}. ${title}${kind}`);
    const phasePaths = Array.isArray(phase.paths) ? phase.paths.filter((p) => typeof p === "string" && p.length > 0) : [];
    if (phasePaths.length > 0) lines.push(`   - paths: ${phasePaths.join(", ")}`);
  });
  lines.push("");
  if (riskNotes.length > 0) {
    lines.push("## Preservation constraints", "");
    for (const note of riskNotes) lines.push(`- ${note}`);
    lines.push("");
  }
  if (requiredChecks.length > 0) {
    lines.push("## Verification guidance", "");
    for (const check of requiredChecks) lines.push(`- ${check}`);
    lines.push("");
  }
  lines.push("## Boundary", "");
  lines.push("- This WorkOrder was generated from a proof-approved PreparedIntentPlan.");
  lines.push("- It does not create VerificationPlan.");
  lines.push("- It does not execute commands.");
  lines.push("- It does not write source files.");
  const markdown = lines.join("\n");

  const header: ArtifactHeader = input.header ?? {
    artifactType: "WorkOrder",
    artifactId: `${INTENT_WORK_ORDER_ARTIFACT_ID_PREFIX}${typeof input.generatedAt === "string" ? input.generatedAt : "0"}`,
    schemaVersion: "0.1.0",
    generatedAt: typeof input.generatedAt === "string" ? input.generatedAt : "1970-01-01T00:00:00.000Z",
    subject: { repoId: typeof input.repoId === "string" ? input.repoId : "." },
    producer: { id: "@rekon/capability-model.intent-work-order-handoff", version: "0.1.0-beta.0" },
    inputRefs: sourceRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 0.7 },
  };

  const workOrder: IntentGeneratedWorkOrder = {
    header,
    goal,
    paths,
    ownerSystems,
    riskNotes,
    requiredChecks,
    successCriteria,
    relevantFindings: [],
    relevantMemory: [],
    antiGamingInstruction: ANTI_GAMING,
    markdown,
    source: "intent-handoff",
    intentHandoff: {
      preparedIntentPlanRef: planRef,
      ...(assessmentRef ? { intentAssessmentReportRef: assessmentRef } : {}),
      ...(statusRef ? { intentStatusReportRef: statusRef } : {}),
      ...(input.pathFreshnessReportRef ? { pathFreshnessReportRef: input.pathFreshnessReportRef } : {}),
      ...(input.runtimeGraphDriftReportRef ? { runtimeGraphDriftReportRef: input.runtimeGraphDriftReportRef } : {}),
      sourceRefs,
      phaseIds,
      obligationIds,
      verificationRequirementIds,
      boundary: { createsVerificationPlan: false, executesCommands: false, writesSourceFiles: false },
    },
  };

  return { status: "generated", workOrder, blockers: [] };
}

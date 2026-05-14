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
  source?: "resolver" | "coherency-delta";
  remediationItems?: RemediationWorkOrderItem[];
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

  return { findingId, priority, limit };
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

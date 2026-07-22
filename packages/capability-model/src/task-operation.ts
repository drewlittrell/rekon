export type TaskOperationClass =
  | "local"
  | "cross-file"
  | "cross-system"
  | "contract-changing"
  | "migration"
  | "critical-flow";

export type TaskOperationRiskTier = "low" | "medium" | "high" | "unknown";
export type TaskOperationEvidenceStatus = "complete" | "partial" | "missing";
export type TaskOperationContextProfile = "compact" | "standard" | "deep";
export type TaskOperationEscalation = "validation-failed";

export type TaskOperationFlow = {
  id: string;
  criticality: "critical" | "high" | "normal";
  systems: string[];
  evidenceRef?: string;
};

export type TaskOperationPlan = {
  schemaVersion: "1.0.0";
  taskClass: TaskOperationClass;
  risk: {
    tier: TaskOperationRiskTier;
    reasons: string[];
    evidenceRefs: string[];
  };
  evidence: {
    status: TaskOperationEvidenceStatus;
    reasons: string[];
  };
  context: {
    profile: TaskOperationContextProfile;
    requestedProfile?: TaskOperationContextProfile;
    escalated: boolean;
    reasons: string[];
  };
  intent: {
    mode: "direct" | "work-order";
    required: boolean;
    reason: string;
    command?: "rekon intent work-order --path <path> --goal <goal> --json";
  };
};

export type ClassifyTaskOperationInput = {
  taskText: string;
  paths: string[];
  ownerSystems?: string[];
  risk?: {
    tier: Exclude<TaskOperationRiskTier, "unknown">;
    reasons?: string[];
    evidenceRefs?: string[];
  };
  evidence?: {
    status: TaskOperationEvidenceStatus;
    reasons?: string[];
  };
  flows?: TaskOperationFlow[];
  requiredContextPaths?: string[];
  requestedProfile?: TaskOperationContextProfile;
  escalation?: TaskOperationEscalation;
};

const PROFILE_RANK: Readonly<Record<TaskOperationContextProfile, number>> = Object.freeze({
  compact: 0,
  standard: 1,
  deep: 2,
});

const WORK_ORDER_COMMAND = "rekon intent work-order --path <path> --goal <goal> --json" as const;

/**
 * Select the least expensive safe operating mode for one task. This helper is
 * pure so CLI and MCP hosts cannot drift into separate risk policies.
 */
export function classifyTaskOperation(input: ClassifyTaskOperationInput): TaskOperationPlan {
  const paths = unique(input.paths);
  const ownerSystems = unique(input.ownerSystems ?? []);
  const flows = dedupeFlows(input.flows ?? []);
  const taskClass = classifyTaskClass({
    taskText: input.taskText,
    paths,
    ownerSystems,
    flows,
    requiredContextPaths: unique(input.requiredContextPaths ?? []),
  });
  const declaredHighFlow = flows.find((flow) => flow.criticality === "critical" || flow.criticality === "high");
  const resolverRisk = input.risk;
  const riskTier: TaskOperationRiskTier = ownerSystems.length > 1 || declaredHighFlow
    ? "high"
    : resolverRisk?.tier ?? "unknown";
  const riskReasons = unique([
    ...(resolverRisk?.reasons ?? []),
    ...(ownerSystems.length > 1 ? ["Requested scope spans multiple owner systems."] : []),
    ...(declaredHighFlow
      ? [`Matched ${declaredHighFlow.criticality}-criticality flow ${declaredHighFlow.id}.`]
      : []),
  ]);
  const riskEvidenceRefs = unique([
    ...(resolverRisk?.evidenceRefs ?? []),
    ...flows.flatMap((flow) => flow.evidenceRef ? [flow.evidenceRef] : []),
  ]);
  const evidenceStatus = input.evidence?.status ?? (resolverRisk ? "complete" : "missing");
  const evidenceReasons = unique(input.evidence?.reasons ?? (resolverRisk
    ? []
    : ["No current preflight risk result was available for this task scope."]));
  const requestedProfile = input.requestedProfile;
  const minimumProfile: TaskOperationContextProfile = input.escalation === "validation-failed"
    ? "deep"
    : evidenceStatus === "partial" || evidenceStatus === "missing"
      ? "standard"
      : "compact";
  const profile = maxProfile(requestedProfile ?? "compact", minimumProfile);
  const contextReasons = unique([
    ...(requestedProfile ? [`Caller requested the ${requestedProfile} context profile.`] : []),
    ...(input.escalation === "validation-failed"
      ? ["A prior validation failure requires the deep context profile."]
      : evidenceStatus === "missing"
        ? ["Missing task evidence requires at least the standard context profile."]
        : evidenceStatus === "partial"
          ? ["Incomplete task evidence requires at least the standard context profile."]
          : ["Current ownership and risk evidence supports the compact context profile."]),
  ]);
  const workOrderReason = workOrderRequirement(taskClass, riskTier);
  const intentRequired = workOrderReason !== undefined;

  return {
    schemaVersion: "1.0.0",
    taskClass,
    risk: {
      tier: riskTier,
      reasons: riskReasons,
      evidenceRefs: riskEvidenceRefs,
    },
    evidence: {
      status: evidenceStatus,
      reasons: evidenceReasons,
    },
    context: {
      profile,
      ...(requestedProfile ? { requestedProfile } : {}),
      escalated: PROFILE_RANK[profile] > PROFILE_RANK[requestedProfile ?? "compact"],
      reasons: contextReasons,
    },
    intent: intentRequired
      ? {
          mode: "work-order",
          required: true,
          reason: workOrderReason,
          command: WORK_ORDER_COMMAND,
        }
      : {
          mode: "direct",
          required: false,
          reason: "The task can proceed directly under the returned pact and verification checks.",
        },
  };
}

function classifyTaskClass(input: {
  taskText: string;
  paths: string[];
  ownerSystems: string[];
  flows: TaskOperationFlow[];
  requiredContextPaths: string[];
}): TaskOperationClass {
  if (signalsMigration(input.taskText)) return "migration";
  if (input.flows.some((flow) => flow.criticality === "critical")) return "critical-flow";
  if (signalsContractChange(input.taskText)) return "contract-changing";
  if (input.ownerSystems.length > 1 || input.flows.some((flow) => unique(flow.systems).length > 1)) {
    return "cross-system";
  }
  if (input.paths.length > 1 || input.requiredContextPaths.some((path) => !input.paths.includes(path))) {
    return "cross-file";
  }
  return "local";
}

function signalsMigration(taskText: string): boolean {
  return /\b(?:migrat(?:e|es|ed|ing|ion)|backfill|data[- ]move|schema[- ]evolution|cutover|rollout)\b/iu.test(taskText);
}

function signalsContractChange(taskText: string): boolean {
  const change = "(?:add|change|extend|modify|remove|rename|replace|update|version)";
  const contract = "(?:api|contract|event|handoff|interface|message|payload|protocol|schema)";
  return new RegExp(`\\b${change}\\b[^.!?\\n]{0,100}\\b${contract}\\b`, "iu").test(taskText)
    || new RegExp(`\\b${contract}\\b[^.!?\\n]{0,100}\\b${change}\\b`, "iu").test(taskText);
}

function workOrderRequirement(
  taskClass: TaskOperationClass,
  riskTier: TaskOperationRiskTier,
): string | undefined {
  if (riskTier === "high") return "High-risk work requires an explicit work order and verification plan before editing.";
  if (taskClass === "migration") return "Migration work requires an explicit work order and verification plan before editing.";
  if (taskClass === "contract-changing") return "Contract-changing work requires an explicit work order and verification plan before editing.";
  if (taskClass === "critical-flow") return "Critical-flow work requires an explicit work order and verification plan before editing.";
  return undefined;
}

function maxProfile(
  left: TaskOperationContextProfile,
  right: TaskOperationContextProfile,
): TaskOperationContextProfile {
  return PROFILE_RANK[left] >= PROFILE_RANK[right] ? left : right;
}

function dedupeFlows(flows: TaskOperationFlow[]): TaskOperationFlow[] {
  const byId = new Map<string, TaskOperationFlow>();
  for (const flow of flows) {
    const id = flow.id.trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, {
      id,
      criticality: flow.criticality,
      systems: unique(flow.systems),
      ...(flow.evidenceRef ? { evidenceRef: flow.evidenceRef } : {}),
    });
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

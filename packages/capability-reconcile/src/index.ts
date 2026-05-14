import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type CoherencyDelta,
  type CoherencyRemediationPriority,
  type CoherencyRemediationStep,
} from "@rekon/kernel-findings";
import { type Actuator, type ArtifactReader, type ArtifactWriter, defineCapability } from "@rekon/sdk";

export type ReconciliationOperation =
  | "docs_regeneration"
  | "label_override_write"
  | "finding_baseline_write"
  | "safe_import_rewrite"
  | "generated_scaffold_write"
  | "verification_command_run"
  | "manual_review";

export type ReconciliationOperationClass =
  | "artifact-only"
  | "deterministic-deferred"
  | "source-write-deferred"
  | "command-deferred"
  | "manual-review";

export type ReconciliationOperationSource =
  | "manual"
  | "work-order"
  | "coherency-delta";

export type ReconciliationPermission =
  | "write:source"
  | "execute:commands"
  | "network:outbound";

export type ReconciliationOperationStatus = "planned" | "applied" | "deferred" | "denied";

export type ReconciliationPlanOperation = {
  operation: ReconciliationOperation;
  status: ReconciliationOperationStatus;
  reason?: string;
  class?: ReconciliationOperationClass;
  source?: ReconciliationOperationSource;
  findingId?: string;
  priority?: CoherencyRemediationPriority;
  files?: string[];
  systems?: string[];
  suggestedAction?: string;
  requiresPermission?: ReconciliationPermission[];
};

export type ReconciliationPlanSummary = {
  total: number;
  artifactOnly: number;
  deterministicDeferred: number;
  sourceWriteDeferred: number;
  commandDeferred: number;
  manualReview: number;
  applied: number;
  planned: number;
  deferred: number;
  denied: number;
};

export type ReconciliationPlan = {
  header: ArtifactHeader;
  dryRun: boolean;
  operations: ReconciliationPlanOperation[];
  summary?: ReconciliationPlanSummary;
};

const ARTIFACT_ONLY_OPERATIONS = new Set<ReconciliationOperation>([
  "docs_regeneration",
  "label_override_write",
  "finding_baseline_write",
]);

export type RemediationItemLike = {
  findingId: string;
  priority?: CoherencyRemediationPriority;
  title?: string;
  action?: string;
  files?: string[];
  systems?: string[];
  severity?: string;
};

export type ReconciliationSuggestionInput = {
  workOrder?: { source?: string; remediationItems?: RemediationItemLike[] };
  coherencyDelta?: { remediationQueue?: RemediationItemLike[] };
  limit?: number;
  priority?: CoherencyRemediationPriority;
  findingId?: string;
};

export function suggestReconciliationOperations(
  input: ReconciliationSuggestionInput,
): ReconciliationPlanOperation[] {
  const items = pickRemediationItems(input);

  if (items.length === 0) {
    return [];
  }

  const source: ReconciliationOperationSource = input.workOrder?.remediationItems?.length
    ? "work-order"
    : "coherency-delta";

  return items.map((item) => classifyRemediationItem(item, source));
}

export const reconcileActuator: Actuator = {
  id: "@rekon/capability-reconcile.actuator",
  produces: ["ReconciliationPlan", "ReconciliationLog", "ActionLog"],
  async act({ artifacts, input }) {
    if (isSuggestionMode(input)) {
      return runSuggestionMode({ artifacts, input: input ?? {} });
    }

    return runLegacyMode({ artifacts, input: input ?? {} });
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-reconcile",
    name: "Reconciliation Capability",
    version: "0.1.0",
    roles: ["actuator"],
    consumes: [
      "IntelligenceSnapshot",
      "Publication",
      "FindingReport",
      "CoherencyDelta",
      "WorkOrder",
    ],
    produces: ["ReconciliationPlan", "ReconciliationLog", "ActionLog"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "snapshot.changed",
        description: "Reconciliation plans are invalid when snapshot inputs change.",
        inputs: ["IntelligenceSnapshot"],
      },
      {
        id: "coherency.changed",
        description: "Reconciliation suggestion plans are invalid when the CoherencyDelta changes.",
        inputs: ["CoherencyDelta"],
      },
      {
        id: "work-order.changed",
        description: "Reconciliation suggestion plans are invalid when the upstream remediation WorkOrder changes.",
        inputs: ["WorkOrder"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.actuator(reconcileActuator);
  },
});

function isSuggestionMode(input: Record<string, unknown> | undefined): boolean {
  if (!input) {
    return false;
  }

  if (input.mode === "suggestions") {
    return true;
  }

  if (input.workOrderRef || input.coherencyDeltaRef) {
    return true;
  }

  return false;
}

async function runLegacyMode({
  artifacts,
  input,
}: {
  artifacts: ArtifactReader & ArtifactWriter;
  input: Record<string, unknown>;
}): Promise<ArtifactRef[]> {
  const operations = parseOperations(input.operations);
  const dryRun = input.dryRun !== false;
  const denied = operations.find((operation) => !ARTIFACT_ONLY_OPERATIONS.has(operation));

  if (denied) {
    throw new Error(`Reconciliation operation ${denied} requires denied source or command permissions.`);
  }

  const inputRefs = await artifacts.list("IntelligenceSnapshot");
  const planOperations: ReconciliationPlanOperation[] = operations.map((operation) => ({
    operation,
    status: dryRun ? "planned" : "applied",
    reason: dryRun ? "dry-run" : "artifact-only operation",
    class: "artifact-only",
    source: "manual",
  }));
  const plan: ReconciliationPlan = {
    header: createHeader("ReconciliationPlan", `reconciliation-plan-${Date.now()}`, inputRefs),
    dryRun,
    operations: planOperations,
    summary: summarize(planOperations),
  };
  const planRef = await artifacts.write("ReconciliationPlan", plan);
  const log = {
    header: createHeader("ReconciliationLog", `reconciliation-log-${Date.now()}`, [planRef]),
    planRef,
    applied: dryRun ? [] : operations,
    deferred: dryRun ? operations : [],
    planned: dryRun ? planOperations : [],
    denied: [] as ReconciliationPlanOperation[],
  };
  const logRef = await artifacts.write("ReconciliationLog", log);
  const actionLog = {
    header: createHeader("ActionLog", `action-log-${Date.now()}`, [planRef, logRef]),
    action: "reconcile",
    dryRun,
    operations,
    mode: "manual" as const,
  };

  return [planRef, logRef, await artifacts.write("ActionLog", actionLog)];
}

async function runSuggestionMode({
  artifacts,
  input,
}: {
  artifacts: ArtifactReader & ArtifactWriter;
  input: Record<string, unknown>;
}): Promise<ArtifactRef[]> {
  const workOrderRef = parseArtifactRef(input.workOrderRef) ?? await findLatestRemediationWorkOrderRef(artifacts);
  const coherencyDeltaRef = parseArtifactRef(input.coherencyDeltaRef) ?? await latestRef(artifacts, "CoherencyDelta");
  const workOrder = workOrderRef ? await readWorkOrder(artifacts, workOrderRef) : undefined;
  const coherencyDelta = coherencyDeltaRef ? await artifacts.read(coherencyDeltaRef) as CoherencyDelta : undefined;
  const applyRequested = input.apply === true;
  const dryRun = !applyRequested;
  const filterFindingId = typeof input.findingId === "string" && input.findingId.length > 0 ? input.findingId : undefined;
  const filterPriority = isPriority(input.priority) ? input.priority : undefined;
  const filterLimit = typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
    ? Math.floor(input.limit)
    : undefined;

  const suggested = suggestReconciliationOperations({
    workOrder,
    coherencyDelta,
    findingId: filterFindingId,
    priority: filterPriority,
    limit: filterLimit,
  });
  const operations = suggested.map((operation) => applyStatus(operation, dryRun));
  const inputRefs: ArtifactRef[] = [];

  if (workOrderRef) {
    inputRefs.push(workOrderRef);
  }

  if (coherencyDeltaRef) {
    inputRefs.push(coherencyDeltaRef);
  }

  const subject = coherencyDelta?.header?.subject ?? workOrder?.header?.subject ?? { repoId: "repo" };
  const plan: ReconciliationPlan = {
    header: createHeaderFromSubject(
      "ReconciliationPlan",
      `reconciliation-plan-${Date.now()}`,
      subject,
      inputRefs,
      "Reconciliation suggestion derived from CoherencyDelta / WorkOrder remediation queue.",
    ),
    dryRun,
    operations,
    summary: summarize(operations),
  };
  const planRef = await artifacts.write("ReconciliationPlan", plan);
  const log = {
    header: createHeaderFromSubject(
      "ReconciliationLog",
      `reconciliation-log-${Date.now()}`,
      subject,
      [planRef, ...inputRefs],
      "Reconciliation suggestion log mirrors the plan's operation classification.",
    ),
    planRef,
    applied: operations.filter((op) => op.status === "applied").map((op) => op.operation),
    deferred: operations.filter((op) => op.status === "deferred").map((op) => op.operation),
    planned: operations.filter((op) => op.status === "planned"),
    denied: operations.filter((op) => op.status === "denied"),
  };
  const logRef = await artifacts.write("ReconciliationLog", log);
  const actionLog = {
    header: createHeaderFromSubject(
      "ActionLog",
      `action-log-${Date.now()}`,
      subject,
      [planRef, logRef, ...inputRefs],
      "Reconciliation suggestion action log; no source writes performed.",
    ),
    action: "reconcile",
    dryRun,
    operations: operations.map((op) => op.operation),
    mode: "suggestions" as const,
    source: workOrder?.remediationItems?.length ? "work-order" : "coherency-delta",
  };

  return [planRef, logRef, await artifacts.write("ActionLog", actionLog)];
}

function pickRemediationItems(input: ReconciliationSuggestionInput): RemediationItemLike[] {
  const fromWorkOrder = input.workOrder?.remediationItems ?? [];
  const fromCoherency = (input.coherencyDelta?.remediationQueue ?? []) as RemediationItemLike[];
  let items: RemediationItemLike[] = fromWorkOrder.length > 0
    ? fromWorkOrder
    : fromCoherency;

  if (input.findingId) {
    items = items.filter((item) => item.findingId === input.findingId);
  }

  if (input.priority) {
    items = items.filter((item) => item.priority === input.priority);
  }

  if (typeof input.limit === "number" && input.limit > 0) {
    items = items.slice(0, input.limit);
  }

  return items;
}

function classifyRemediationItem(
  item: RemediationItemLike,
  source: ReconciliationOperationSource,
): ReconciliationPlanOperation {
  const haystack = `${item.title ?? ""} ${item.action ?? ""}`.toLowerCase();
  const base = {
    findingId: item.findingId,
    priority: item.priority,
    files: item.files ?? [],
    systems: item.systems ?? [],
    suggestedAction: item.action,
    source,
  };

  if (/\bdocs?\b|documentation|readme|agents\.md|agents/.test(haystack)) {
    return {
      ...base,
      operation: "docs_regeneration",
      class: "artifact-only",
      status: "planned",
      reason: "Documentation-related remediation can start with generated publication refresh.",
    };
  }

  if (/baseline|accept(ed)?|ignore(d)?|false positive|status ledger/.test(haystack)) {
    return {
      ...base,
      operation: "finding_baseline_write",
      class: "artifact-only",
      status: "planned",
      reason: "Finding lifecycle/status work is artifact-only.",
    };
  }

  if (/import|generated[- ]?output|generated\/|\/dist\b|build[- ]?output|boundary/.test(haystack)) {
    return {
      ...base,
      operation: "safe_import_rewrite",
      class: "source-write-deferred",
      status: "deferred",
      reason: "Import remediation likely requires source edits; source writes are deferred.",
      requiresPermission: ["write:source"],
    };
  }

  if (/scaffold|generate(d)? file|create file/.test(haystack)) {
    return {
      ...base,
      operation: "generated_scaffold_write",
      class: "source-write-deferred",
      status: "deferred",
      reason: "Scaffold generation requires source writes; deferred.",
      requiresPermission: ["write:source"],
    };
  }

  if (/\btest(s|ing)?\b|verify|verification|\bcommand\b|\brun\b/.test(haystack)) {
    return {
      ...base,
      operation: "verification_command_run",
      class: "command-deferred",
      status: "deferred",
      reason: "Command execution is deferred.",
      requiresPermission: ["execute:commands"],
    };
  }

  return {
    ...base,
    operation: "manual_review",
    class: "manual-review",
    status: "deferred",
    reason: "No deterministic reconciliation operation was inferred.",
  };
}

function applyStatus(
  operation: ReconciliationPlanOperation,
  dryRun: boolean,
): ReconciliationPlanOperation {
  if (operation.class === "artifact-only") {
    return {
      ...operation,
      status: dryRun ? "planned" : "applied",
      reason: dryRun ? operation.reason : "Artifact-only operation applied.",
    };
  }

  return operation;
}

function summarize(operations: ReconciliationPlanOperation[]): ReconciliationPlanSummary {
  const summary: ReconciliationPlanSummary = {
    total: operations.length,
    artifactOnly: 0,
    deterministicDeferred: 0,
    sourceWriteDeferred: 0,
    commandDeferred: 0,
    manualReview: 0,
    applied: 0,
    planned: 0,
    deferred: 0,
    denied: 0,
  };

  for (const operation of operations) {
    switch (operation.class) {
      case "artifact-only":
        summary.artifactOnly += 1;
        break;
      case "deterministic-deferred":
        summary.deterministicDeferred += 1;
        break;
      case "source-write-deferred":
        summary.sourceWriteDeferred += 1;
        break;
      case "command-deferred":
        summary.commandDeferred += 1;
        break;
      case "manual-review":
        summary.manualReview += 1;
        break;
    }

    switch (operation.status) {
      case "applied":
        summary.applied += 1;
        break;
      case "planned":
        summary.planned += 1;
        break;
      case "deferred":
        summary.deferred += 1;
        break;
      case "denied":
        summary.denied += 1;
        break;
    }
  }

  return summary;
}

function parseOperations(value: unknown): ReconciliationOperation[] {
  if (typeof value === "string" && value.length > 0) {
    return [value as ReconciliationOperation];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is ReconciliationOperation => typeof item === "string" && item.length > 0);
  }

  return ["docs_regeneration"];
}

function isPriority(value: unknown): value is CoherencyRemediationPriority {
  return value === "p0" || value === "p1" || value === "p2";
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

async function latestRef(
  artifacts: ArtifactReader,
  type: string,
): Promise<ArtifactRef | undefined> {
  return (await artifacts.list(type)).sort((left, right) => right.id.localeCompare(left.id))[0];
}

async function findLatestRemediationWorkOrderRef(
  artifacts: ArtifactReader,
): Promise<ArtifactRef | undefined> {
  const refs = await artifacts.list("WorkOrder");
  const sorted = [...refs].sort((left, right) => right.id.localeCompare(left.id));

  for (const ref of sorted) {
    const workOrder = await artifacts.read(ref) as { source?: string } | null;

    if (workOrder?.source === "coherency-delta") {
      return ref;
    }
  }

  return undefined;
}

async function readWorkOrder(
  artifacts: ArtifactReader,
  ref: ArtifactRef,
): Promise<{
  header: ArtifactHeader;
  source?: string;
  remediationItems?: RemediationItemLike[];
}> {
  return await artifacts.read(ref) as {
    header: ArtifactHeader;
    source?: string;
    remediationItems?: RemediationItemLike[];
  };
}

function createHeader(
  artifactType: string,
  artifactId: string,
  inputRefs: ArtifactRef[],
): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: {
      repoId: "repo",
    },
    producer: {
      id: "@rekon/capability-reconcile",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 1,
      notes: ["Initial reconciliation is artifact-only and dry-run by default."],
    },
  };
}

function createHeaderFromSubject(
  artifactType: string,
  artifactId: string,
  subject: ArtifactHeader["subject"],
  inputRefs: ArtifactRef[],
  provenanceNote: string,
): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: {
      repoId: subject.repoId,
      ref: subject.ref,
      commit: subject.commit,
      paths: subject.paths,
      systems: subject.systems,
    },
    producer: {
      id: "@rekon/capability-reconcile",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 0.8,
      notes: [provenanceNote],
    },
  };
}

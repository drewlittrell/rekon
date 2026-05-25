import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, join as joinPath, resolve as pathResolve } from "node:path";
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
  | "manual_review"
  /**
   * `exact_text_replacement` is emitted only when the upstream
   * `CoherencyRemediationStep` (or equivalent `RemediationItemLike`) carries
   * exact `beforeText` + `afterText` + `diffKind: "exact-text-replacement"`
   * fields AND every plan-generation-time safety check passes (single repo-
   * relative path, current file exists, current file content equals
   * `beforeText`, `afterText` differs from `beforeText`). The operation
   * class is `source-write-deferred` because applying it WOULD mutate a
   * source file — but **source-write apply is not implemented**. v1 only
   * makes the operation previewable.
   */
  | "exact_text_replacement";

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
  /**
   * Optional additive exact-diff fields (exact-diff operation v1). All three
   * must be present together — `beforeText` + `afterText` + `diffKind` — and
   * are only attached by the classifier when every plan-generation-time
   * safety check passes. Their presence does NOT grant a source-write apply
   * path; it makes the operation previewable in Reconciliation Preview v1.
   */
  beforeText?: string;
  afterText?: string;
  diffKind?: "exact-text-replacement";
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
  /**
   * Optional additive patch fields (exact-diff operation v1). When present
   * AND the plan-generation-time safety checks pass, the classifier emits an
   * `exact_text_replacement` operation that carries the patch through to
   * Reconciliation Preview v1. See `classifyRemediationItem` for the safety
   * check chain.
   */
  beforeText?: string;
  afterText?: string;
  diffKind?: "exact-text-replacement";
};

export type ReconciliationSuggestionInput = {
  workOrder?: { source?: string; remediationItems?: RemediationItemLike[] };
  coherencyDelta?: { remediationQueue?: RemediationItemLike[] };
  limit?: number;
  priority?: CoherencyRemediationPriority;
  findingId?: string;
  /**
   * Optional. When supplied, the classifier may perform plan-generation-time
   * safety checks for `exact_text_replacement` candidates (single repo-
   * relative path, current file exists, current content matches `beforeText`,
   * `afterText` differs). Absence leaves the classifier in its prior
   * regex-only mode — patch fields are dropped from any operation that
   * would otherwise become `exact_text_replacement`.
   */
  repoRoot?: string;
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

  return items.map((item) => classifyRemediationItem(item, source, input.repoRoot));
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

  const repoRoot = typeof input.repoRoot === "string" && input.repoRoot.length > 0
    ? input.repoRoot
    : undefined;
  const suggested = suggestReconciliationOperations({
    workOrder,
    coherencyDelta,
    findingId: filterFindingId,
    priority: filterPriority,
    limit: filterLimit,
    repoRoot,
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
  repoRoot?: string,
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

  // Exact-diff operation v1: if the item carries a complete patch triple
  // (`beforeText` + `afterText` + `diffKind: "exact-text-replacement"`),
  // attempt to emit an `exact_text_replacement` operation. Every safety
  // check below must pass — otherwise we silently drop the patch fields
  // and fall through to the regex-based classification (the item still
  // generates a deferred operation, just without patch data).
  const exactDiffResult = tryClassifyExactTextReplacement({
    item,
    base,
    repoRoot,
  });
  if (exactDiffResult) {
    return exactDiffResult;
  }

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

/**
 * Plan-generation-time safety gate for `exact_text_replacement` operations.
 *
 * Required preconditions (ALL must hold to emit patch data):
 *   1. Item carries non-empty `beforeText` + `afterText` + `diffKind`.
 *   2. `diffKind === "exact-text-replacement"`.
 *   3. `repoRoot` is supplied (caller has a sandbox to read from).
 *   4. Item names exactly one file path.
 *   5. Path is repo-relative (no leading `/`, no `..` segments after resolve
 *      escapes `repoRoot`).
 *   6. The current file at `<repoRoot>/<path>` exists and is readable.
 *   7. Current file content equals `beforeText` byte-for-byte.
 *   8. `afterText` differs from `beforeText`.
 *
 * If ALL hold: returns an `exact_text_replacement` operation with patch
 * fields attached, class `source-write-deferred`, status `deferred`,
 * `requiresPermission: ["write:source"]`.
 *
 * If any hold fails: returns `undefined` so the caller falls through to the
 * regex-based classification. This drops the patch fields silently — the
 * item still produces a deferred operation, just without diff data. We do
 * NOT emit `exact_text_replacement` with partial / unverifiable patch
 * fields.
 *
 * Read-only: this function never writes any file. It reads `<repoRoot>/<path>`
 * with a path-escape check and then closes the handle.
 */
function tryClassifyExactTextReplacement({
  item,
  base,
  repoRoot,
}: {
  item: RemediationItemLike;
  base: Partial<ReconciliationPlanOperation>;
  repoRoot?: string;
}): ReconciliationPlanOperation | undefined {
  // (1) Patch triple must all be present and non-empty.
  if (
    typeof item.beforeText !== "string" ||
    typeof item.afterText !== "string" ||
    typeof item.diffKind !== "string"
  ) {
    return undefined;
  }

  // (2) diffKind must be recognized.
  if (item.diffKind !== "exact-text-replacement") {
    return undefined;
  }

  // (3) repoRoot required for the file-read safety check.
  if (typeof repoRoot !== "string" || repoRoot.length === 0) {
    return undefined;
  }

  // (4) Exactly one file path.
  const files = item.files ?? [];
  if (files.length !== 1) {
    return undefined;
  }

  const path = files[0];
  if (typeof path !== "string" || path.length === 0) {
    return undefined;
  }

  // (5) Path must resolve INSIDE repoRoot. Reject absolute paths + escapes.
  if (path.startsWith("/")) {
    return undefined;
  }
  const resolvedRoot = pathResolve(repoRoot);
  const resolvedPath = pathResolve(joinPath(resolvedRoot, path));
  if (
    resolvedPath !== resolvedRoot &&
    !resolvedPath.startsWith(`${resolvedRoot}/`)
  ) {
    return undefined;
  }

  // (6) Current file must exist + be readable.
  let currentContent: string;
  try {
    currentContent = readFileSync(resolvedPath, "utf8");
  } catch {
    return undefined;
  }

  // (7) Current file content must equal beforeText byte-for-byte.
  if (currentContent !== item.beforeText) {
    return undefined;
  }

  // (8) afterText must differ from beforeText (no no-op patches).
  if (item.afterText === item.beforeText) {
    return undefined;
  }

  return {
    ...base,
    operation: "exact_text_replacement",
    class: "source-write-deferred",
    status: "deferred",
    reason:
      "Exact-text replacement candidate; current file matches beforeText. Preview-only; source-write apply unavailable.",
    requiresPermission: ["write:source"],
    beforeText: item.beforeText,
    afterText: item.afterText,
    diffKind: "exact-text-replacement",
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

// ============================================================================
// Reconciliation preview v1
// ----------------------------------------------------------------------------
// Read-only classification of a ReconciliationPlan into operator-facing
// preview rows. Source-write apply is NOT available; this helper never writes
// source files and never writes artifacts. Diffs are only generated when the
// input carries exact before/after text — v1's plan shape carries none, so
// every non-artifact-only operation is classified `not-previewable` with the
// reason "ReconciliationPlan does not include exact patch data."
// ============================================================================

export type ReconciliationPreviewOperationKind =
  | "artifact-only"
  | "source-patch"
  | "generated-file"
  | "manual"
  | "not-previewable";

export type ReconciliationPreviewRisk =
  | "low"
  | "medium"
  | "high"
  | "unknown";

export type ReconciliationPreviewOperation = {
  id: string;
  kind: ReconciliationPreviewOperationKind;
  title: string;
  description?: string;
  path?: string;
  risk: ReconciliationPreviewRisk;
  previewable: boolean;
  reason?: string;
  diff?: {
    format: "unified";
    text: string;
  };
  sourceRefs?: ArtifactRef[];
};

export type ReconciliationPreviewSummary = {
  total: number;
  previewable: number;
  sourcePatch: number;
  artifactOnly: number;
  generatedFile: number;
  manual: number;
  notPreviewable: number;
  highRisk: number;
};

export type ReconciliationPreviewRecommendation = {
  applyAvailable: false;
  message: string;
  nextCommands: string[];
};

export type ReconciliationPreviewStatus =
  | "previewable"
  | "partial"
  | "not-previewable";

export type ReconciliationPreview = {
  kind: "rekon.reconciliation.preview";
  planRef: ArtifactRef;
  status: ReconciliationPreviewStatus;
  operations: ReconciliationPreviewOperation[];
  summary: ReconciliationPreviewSummary;
  recommendation: ReconciliationPreviewRecommendation;
};

/**
 * Forward-compatible extension on `ReconciliationPlanOperation`. The v1
 * `ReconciliationPlan` shape does NOT include these fields, so the preview
 * helper marks non-artifact-only operations `not-previewable` and emits no
 * diff. A future plan-generator may attach `beforeText` / `afterText` (and
 * optionally an `expectedBeforeDigest`) to source-write operations; when those
 * fields are present, the helper reads the current file under `repoRoot`,
 * verifies the before-text matches, and emits a unified diff. Never invents a
 * patch.
 */
type ReconciliationPlanOperationDiffExtension = {
  beforeText?: string;
  afterText?: string;
  expectedBeforeDigest?: string;
};

export type ReconciliationPreviewInput = {
  plan: ReconciliationPlan;
  planRef: ArtifactRef;
  /**
   * Required only when the plan carries forward-compatible diff fields
   * (`beforeText` + `afterText`) AND a `files` entry naming a path to read.
   * v1 plans carry no such fields, so v1 calls never read files even when
   * `repoRoot` is supplied.
   */
  repoRoot?: string;
};

const APPLY_UNAVAILABLE_MESSAGE =
  "Source-write apply is not available. Review this preview and apply manually.";

export async function buildReconciliationPreview(
  input: ReconciliationPreviewInput,
): Promise<ReconciliationPreview> {
  const { plan, planRef, repoRoot } = input;

  if (!plan || !Array.isArray(plan.operations)) {
    throw new Error(
      "buildReconciliationPreview: plan.operations must be an array",
    );
  }

  if (!planRef || planRef.type !== "ReconciliationPlan") {
    throw new Error(
      "buildReconciliationPreview: planRef must reference a ReconciliationPlan",
    );
  }

  const operations: ReconciliationPreviewOperation[] = [];
  for (let index = 0; index < plan.operations.length; index += 1) {
    const op = plan.operations[index];
    if (!op) continue;
    operations.push(
      await classifyOperationForPreview(op, index, planRef.id, repoRoot),
    );
  }

  const summary = summarizePreviewOperations(operations);
  const status = pickPreviewStatus(summary);
  const recommendation: ReconciliationPreviewRecommendation = {
    applyAvailable: false,
    message: APPLY_UNAVAILABLE_MESSAGE,
    nextCommands: [],
  };

  return {
    kind: "rekon.reconciliation.preview",
    planRef,
    status,
    operations,
    summary,
    recommendation,
  };
}

async function classifyOperationForPreview(
  operation: ReconciliationPlanOperation,
  index: number,
  planArtifactId: string,
  repoRoot?: string,
): Promise<ReconciliationPreviewOperation> {
  const id = `${planArtifactId}::op-${index}`;
  const path = pickPrimaryPath(operation);
  const title = pickOperationTitle(operation);
  const description = operation.suggestedAction || operation.reason;

  // Artifact-only operations are inherently previewable in the "describable
  // and safe to apply later" sense, but v1's plan shape does not carry the
  // resulting artifact content, so we do NOT generate a diff. We still mark
  // them previewable because there is no source mutation to fear.
  if (operation.class === "artifact-only") {
    return {
      id,
      kind: "artifact-only",
      title,
      description,
      path,
      risk: "low",
      previewable: true,
      reason: operation.reason,
    };
  }

  if (operation.class === "source-write-deferred") {
    const kind: ReconciliationPreviewOperationKind =
      operation.operation === "generated_scaffold_write"
        ? "generated-file"
        : "source-patch";

    const ext = operation as unknown as ReconciliationPlanOperationDiffExtension;
    const hasDiffFields =
      typeof ext.beforeText === "string" &&
      typeof ext.afterText === "string" &&
      typeof path === "string" &&
      path.length > 0;

    if (hasDiffFields && repoRoot) {
      const fileRead = await tryReadFile(repoRoot, path);

      if (!fileRead.ok) {
        return {
          id,
          kind,
          title,
          description,
          path,
          risk: "high",
          previewable: false,
          reason: `Could not read current file content for diff: ${fileRead.error}.`,
        };
      }

      if (fileRead.text !== ext.beforeText) {
        return {
          id,
          kind,
          title,
          description,
          path,
          risk: "high",
          previewable: false,
          reason:
            "Current file content does not match expected before text.",
        };
      }

      const diffText = computeUnifiedDiff(
        path,
        ext.beforeText as string,
        ext.afterText as string,
      );

      return {
        id,
        kind,
        title,
        description,
        path,
        risk: "high",
        previewable: true,
        diff: {
          format: "unified",
          text: diffText,
        },
      };
    }

    return {
      id,
      kind,
      title,
      description,
      path,
      risk: "high",
      previewable: false,
      reason:
        "ReconciliationPlan does not include exact patch data. Source-write apply is not available.",
    };
  }

  if (operation.class === "command-deferred") {
    return {
      id,
      kind: "manual",
      title,
      description,
      path,
      risk: "medium",
      previewable: false,
      reason:
        "Command-deferred operation. Execute manually via rekon verify run --dry-run before relying on this remediation.",
    };
  }

  if (operation.class === "manual-review") {
    return {
      id,
      kind: "manual",
      title,
      description,
      path,
      risk: "unknown",
      previewable: false,
      reason:
        "ReconciliationPlan classified this remediation as manual-review.",
    };
  }

  return {
    id,
    kind: "not-previewable",
    title,
    description,
    path,
    risk: "unknown",
    previewable: false,
    reason:
      "ReconciliationPlan does not include exact patch data. Operation is not previewable.",
  };
}

function pickPrimaryPath(operation: ReconciliationPlanOperation): string | undefined {
  if (!Array.isArray(operation.files) || operation.files.length === 0) {
    return undefined;
  }
  return operation.files[0];
}

function pickOperationTitle(operation: ReconciliationPlanOperation): string {
  if (operation.suggestedAction && operation.suggestedAction.trim().length > 0) {
    return operation.suggestedAction.trim();
  }
  return humanizeOperation(operation.operation);
}

function humanizeOperation(name: ReconciliationOperation): string {
  switch (name) {
    case "docs_regeneration":
      return "Documentation regeneration";
    case "label_override_write":
      return "Label override write";
    case "finding_baseline_write":
      return "Finding baseline write";
    case "safe_import_rewrite":
      return "Safe import rewrite";
    case "generated_scaffold_write":
      return "Generated scaffold write";
    case "verification_command_run":
      return "Verification command run";
    case "manual_review":
      return "Manual review";
    default:
      return name;
  }
}

function summarizePreviewOperations(
  operations: ReconciliationPreviewOperation[],
): ReconciliationPreviewSummary {
  const summary: ReconciliationPreviewSummary = {
    total: operations.length,
    previewable: 0,
    sourcePatch: 0,
    artifactOnly: 0,
    generatedFile: 0,
    manual: 0,
    notPreviewable: 0,
    highRisk: 0,
  };

  for (const op of operations) {
    if (op.previewable) summary.previewable += 1;
    if (op.risk === "high") summary.highRisk += 1;
    switch (op.kind) {
      case "artifact-only":
        summary.artifactOnly += 1;
        break;
      case "source-patch":
        summary.sourcePatch += 1;
        break;
      case "generated-file":
        summary.generatedFile += 1;
        break;
      case "manual":
        summary.manual += 1;
        break;
      case "not-previewable":
        summary.notPreviewable += 1;
        break;
    }
  }

  return summary;
}

function pickPreviewStatus(
  summary: ReconciliationPreviewSummary,
): ReconciliationPreviewStatus {
  if (summary.total === 0) {
    return "not-previewable";
  }
  if (summary.previewable === summary.total) {
    return "previewable";
  }
  if (summary.previewable === 0) {
    return "not-previewable";
  }
  return "partial";
}

async function tryReadFile(
  repoRoot: string,
  relativePath: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const resolvedRoot = pathResolve(repoRoot);
    const resolvedPath = pathResolve(join(resolvedRoot, relativePath));

    // Defence in depth: refuse to read a path that escapes the repo root.
    if (
      resolvedPath !== resolvedRoot &&
      !resolvedPath.startsWith(`${resolvedRoot}/`)
    ) {
      return {
        ok: false,
        error: "path escapes repo root",
      };
    }

    const text = await readFile(resolvedPath, "utf8");
    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Deterministic unified-diff renderer. v1 emits a single hunk that strips the
 * entire before-text and replaces it with the entire after-text. This is
 * verbose but always faithful: it never elides changed lines and never invents
 * context that the input did not supply.
 */
function computeUnifiedDiff(
  path: string,
  beforeText: string,
  afterText: string,
): string {
  const beforeLines = beforeText.length === 0 ? [] : beforeText.split("\n");
  const afterLines = afterText.length === 0 ? [] : afterText.split("\n");

  const beforeCount = beforeLines.length;
  const afterCount = afterLines.length;

  const lines: string[] = [];
  lines.push(`--- a/${path}`);
  lines.push(`+++ b/${path}`);
  lines.push(`@@ -1,${beforeCount} +1,${afterCount} @@`);
  for (const line of beforeLines) {
    lines.push(`-${line}`);
  }
  for (const line of afterLines) {
    lines.push(`+${line}`);
  }
  return `${lines.join("\n")}\n`;
}

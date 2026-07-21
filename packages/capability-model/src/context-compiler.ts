import type {
  TaskContextItem,
  TaskContextReport,
  TaskContextReportBoundaries,
  TaskContextRouteNecessity,
  TaskContextRouteRole,
} from "@rekon/kernel-repo-model";
import {
  buildTaskContextReport,
  taskNeedsRepositoryExemplar,
  type BuildTaskContextReportInput,
  type TaskContextGraphEvidenceLike,
} from "./task-context-report.js";

export type ContextProfile = "compact" | "standard" | "deep";

export type ContextBudget = {
  profile: ContextProfile;
  maxTokens: number;
  maxCoreItems: number;
  maxSupportingItems: number;
  maxConstraints: number;
  maxVerificationHints: number;
  maxEvidenceRefs: number;
  maxTraceItems: number;
  maxSourceSpans?: number;
  maxSourceSpanCharacters?: number;
};

export type ContextTrustClass = "deterministic" | "declared" | "inference" | "memory" | "operator";

export type ContextPacketItem = {
  ref: string;
  kind: TaskContextItem["kind"];
  source: TaskContextItem["source"];
  trust: ContextTrustClass;
  freshness: "fresh" | "stale" | "partial" | "unknown";
  reason: string;
  path?: string;
  symbolId?: string;
  capabilityId?: string;
  score?: number;
  scoreBand?: TaskContextItem["scoreBand"];
  evidenceRefs: string[];
  routeRole?: TaskContextRouteRole;
  necessity?: TaskContextRouteNecessity;
  necessityReason?: string;
};

export type ContextTraceEntry = {
  ref: string;
  source: TaskContextItem["source"];
  decision: "included" | "excluded";
  tier: "core" | "supporting";
  reason: string;
  estimatedTokens: number;
};

export type ContextSourceSpan = {
  path: string;
  sourceSha256: string;
  lineStart: number;
  lineEnd: number;
  excerpt: string;
  evidenceRef: string;
  reason: string;
  freshness: "fresh" | "stale" | "partial" | "unknown";
};

export type ContextRepositoryExemplar = {
  ref: string;
  path: string;
  reason: string;
  trust: "inference";
  freshness: "fresh" | "stale" | "partial" | "unknown";
  inspectWhen: string;
  sourceSpan: ContextSourceSpan;
};

export type CompiledContextPacket = {
  schemaVersion: "1.0.0";
  readBeforeEditing: string;
  task: TaskContextReport["task"];
  profile: ContextProfile;
  budget: ContextBudget;
  coreContext: ContextPacketItem[];
  supportingContext: ContextPacketItem[];
  doNotTouch: Array<TaskContextReport["doNotTouch"][number] & {
    trust: "operator" | "declared";
    freshness: "fresh" | "stale" | "partial" | "unknown";
    enforced: false;
  }>;
  verificationHints: Array<TaskContextReport["verificationHints"][number] & {
    trust: "operator" | "declared";
    freshness: "fresh" | "stale" | "partial" | "unknown";
    executed: false;
  }>;
  warnings: string[];
  evidence: string[];
  sourceSpans?: ContextSourceSpan[];
  repositoryExemplar?: ContextRepositoryExemplar;
  boundaries: TaskContextReportBoundaries;
  contextTrace: ContextTraceEntry[];
  estimatedTokens: number;
  truncated: boolean;
};

export type CompileTaskContextInput = BuildTaskContextReportInput & {
  profile?: ContextProfile;
  warnings?: string[];
};

export type CompileTaskContextResult = {
  report: TaskContextReport;
  packet: CompiledContextPacket;
};

export type ModelContextProjectionItem = Pick<
  ContextPacketItem,
  "ref" | "kind" | "trust" | "freshness" | "reason"
> & Partial<Pick<
  ContextPacketItem,
  "routeRole" | "necessity" | "necessityReason"
>>;

export type ModelContextProjection = {
  schemaVersion: "1.0.0";
  instruction: string;
  paths: string[];
  readFirst: string[];
  boundaryPaths: string[];
  coreContext: ModelContextProjectionItem[];
  supportingContext: ModelContextProjectionItem[];
  sourceSpans?: ContextSourceSpan[];
  repositoryExemplar?: ContextRepositoryExemplar;
  constraints: Array<{
    statement: string;
    path?: string;
    symbolId?: string;
    trust?: "operator" | "declared";
    freshness?: "fresh" | "stale" | "partial" | "unknown";
  }>;
  checks: Array<{
    command?: string;
    artifact?: string;
    trust?: "operator" | "declared";
    freshness?: "fresh" | "stale" | "partial" | "unknown";
  }>;
  warnings: string[];
  selection: {
    profile: ContextProfile;
    sourcePacketTokens: number;
    projectedTokens: number;
    truncated: boolean;
  };
};

export type ModelContextDelivery = {
  schemaVersion: "1.0.0";
  instruction: string;
  readFirst: string[];
  boundaryPaths?: string[];
  supportingContext?: ModelContextProjectionItem[];
  routeSummaries?: ModelContextRouteSummary[];
  sourceSpans?: ContextSourceSpan[];
  repositoryExemplar?: ContextRepositoryExemplar;
  constraints: string[];
  checks: string[];
  warnings?: string[];
};

export type ModelContextRouteSummary = {
  routeRole: TaskContextRouteRole;
  trust: "deterministic" | "declared";
  freshness: "fresh" | "stale" | "partial" | "unknown";
  routeCount: number;
  resolution: "condition-not-triggered";
  readDisposition: "skip-unless-triggered";
  summary: string;
  inspectWhen: string;
};

export type ModelContextDeliveryPolicy =
  | "full"
  | "tiered"
  | "role-aware"
  | "summary-aware"
  | "navigation-only";

export type ProjectModelContextDeliveryOptions = {
  policy?: ModelContextDeliveryPolicy;
};

export const CONTEXT_BUDGETS: Readonly<Record<ContextProfile, ContextBudget>> = Object.freeze({
  compact: Object.freeze({
    profile: "compact",
    maxTokens: 2_400,
    maxCoreItems: 12,
    maxSupportingItems: 4,
    maxConstraints: 8,
    maxVerificationHints: 8,
    maxEvidenceRefs: 24,
    maxTraceItems: 32,
    maxSourceSpans: 6,
    maxSourceSpanCharacters: 1_200,
  }),
  standard: Object.freeze({
    profile: "standard",
    maxTokens: 4_800,
    maxCoreItems: 24,
    maxSupportingItems: 10,
    maxConstraints: 12,
    maxVerificationHints: 12,
    maxEvidenceRefs: 48,
    maxTraceItems: 64,
    maxSourceSpans: 12,
    maxSourceSpanCharacters: 3_000,
  }),
  deep: Object.freeze({
    profile: "deep",
    maxTokens: 9_000,
    maxCoreItems: 48,
    maxSupportingItems: 24,
    maxConstraints: 20,
    maxVerificationHints: 20,
    maxEvidenceRefs: 96,
    maxTraceItems: 128,
    maxSourceSpans: 24,
    maxSourceSpanCharacters: 8_000,
  }),
});

export const TASK_CONTEXT_READ_BEFORE_EDITING =
  "Read this before editing. Task-shaped context is proposal/context, not proof: deterministic graph facts outrank embedding similarity, do-not-touch zones are guidance (not enforced), and verification hints are hints (never executed).";

function estimateTokens(value: unknown): number {
  return Math.max(1, Math.ceil(JSON.stringify(value).length / 4));
}

function itemRef(item: TaskContextItem): string {
  if (item.kind === "capability" && item.capabilityId) return item.capabilityId;
  if (item.kind === "symbol" && item.symbolId) return item.symbolId;
  return item.path ?? item.symbolId ?? item.capabilityId ?? item.id;
}

function trustForSource(source: TaskContextItem["source"]): ContextTrustClass {
  if (source === "operator_input") return "operator";
  if (source === "deterministic_graph") return "deterministic";
  return "inference";
}

function toPacketItem(
  item: TaskContextItem,
  freshness: CompiledContextPacket["coreContext"][number]["freshness"],
  taskText: string,
  taskPaths: ReadonlySet<string>,
): ContextPacketItem {
  const route = routeForTaskContextItem(item, taskText, taskPaths);
  return {
    ref: itemRef(item),
    kind: item.kind,
    source: item.source,
    trust: trustForSource(item.source),
    freshness,
    reason: item.reason,
    ...(item.path !== undefined ? { path: item.path } : {}),
    ...(item.symbolId !== undefined ? { symbolId: item.symbolId } : {}),
    ...(item.capabilityId !== undefined ? { capabilityId: item.capabilityId } : {}),
    ...(item.score !== undefined ? { score: item.score } : {}),
    ...(item.scoreBand !== undefined ? { scoreBand: item.scoreBand } : {}),
    evidenceRefs: item.evidenceRefs,
    ...route,
  };
}

function routeForTaskContextItem(
  item: TaskContextItem,
  taskText: string,
  taskPaths: ReadonlySet<string>,
): Required<Pick<ContextPacketItem, "routeRole" | "necessity" | "necessityReason">> {
  if (item.routeRole && item.necessity && item.necessityReason) {
    return {
      routeRole: item.routeRole,
      necessity: item.necessity,
      necessityReason: item.necessityReason,
    };
  }
  const ref = itemRef(item);
  if (taskPaths.has(ref) || item.source === "operator_input") {
    return {
      routeRole: "task-target",
      necessity: "required",
      necessityReason: "This path is explicit task scope.",
    };
  }
  if (item.source === "embedding_retrieval" || item.source === "semantic_file_understanding") {
    return {
      routeRole: "supporting",
      necessity: "supporting",
      necessityReason: "Inferred relevance is advisory rather than a required source route.",
    };
  }
  if (isTestContextPath(ref) || /\b(?:test|tests|verify|verifies)\b/iu.test(item.reason)) {
    return {
      routeRole: "verification",
      necessity: "required",
      necessityReason: "A deterministic test relationship places this path in the regression boundary.",
    };
  }
  if (/task-signaled implementation/iu.test(item.reason)) {
    return {
      routeRole: "implementation",
      necessity: "required",
      necessityReason: "The task names this deterministic implementation route.",
    };
  }
  if (/task-signaled (?:consumer|producer)|\b(?:consumes?|produces?|publishes?)_contract\b/iu.test(item.reason)) {
    return {
      routeRole: "handoff",
      necessity: taskSignalsHandoffChange(taskText) ? "required" : "conditional",
      necessityReason: taskSignalsHandoffChange(taskText)
        ? "The task changes or preserves data carried across this deterministic handoff."
        : "Inspect this handoff only if shared contract behavior changes.",
    };
  }
  if (/TaskPact|repository contract/iu.test(item.reason)) {
    return {
      routeRole: "repository-law",
      necessity: "required",
      necessityReason: "Matched repository law declares this path required context.",
    };
  }
  return {
    routeRole: item.kind === "capability" ? "implementation" : "dependency",
    necessity: item.kind === "capability" ? "supporting" : "conditional",
    necessityReason: item.kind === "capability"
      ? "Capability identity explains a selected source route without adding another read."
      : "Inspect this deterministic neighbor only when the selected source delegates task behavior to it.",
  };
}

function taskSignalsHandoffChange(taskText: string): boolean {
  return /\b(?:carry|propagat(?:e|es|ed|ing)|forward|preserv(?:e|es|ed|ing)|pass(?:es|ed|ing)?|thread|handoff|end[- ]to[- ]end)\b/iu.test(taskText)
    || /\b(?:event|message|payload|request|response|contract|schema|metadata)\b[^.!?\n]{0,100}\b(?:add|remove|rename|change|extend|include|omit)\b/iu.test(taskText)
    || /\b(?:add|remove|rename|change|extend|include|omit)\b[^.!?\n]{0,100}\b(?:event|message|payload|request|response|contract|schema|metadata)\b/iu.test(taskText);
}

export function compileTaskContext(input: CompileTaskContextInput): CompileTaskContextResult {
  const report = buildTaskContextReport(input);
  const profile = input.profile ?? "compact";
  const budget = CONTEXT_BUDGETS[profile];
  const freshness = report.header.freshness?.status ?? "unknown";
  // The audit report retains every evidence route, including several claims
  // that can resolve to the same file. The delivery packet needs one route per
  // context ref. Keeping the first route preserves operator and declared-law
  // priority, because those items are assembled before graph expansion, and
  // prevents duplicate claims from evicting required paths under a compact
  // budget.
  const coreCandidates = dedupePacketCandidates(report.contextItems.filter(
    (item) => item.source === "operator_input" || item.source === "deterministic_graph",
  ));
  const supportingCandidates = dedupePacketCandidates(report.contextItems.filter(
    (item) => item.source === "embedding_retrieval" || item.source === "semantic_file_understanding",
  ));
  const coreContext: ContextPacketItem[] = [];
  const supportingContext: ContextPacketItem[] = [];
  const rawContextTrace: ContextTraceEntry[] = [];
  const taskPaths = new Set(report.task.paths);
  let selectionTokens = estimateTokens({
    task: report.task,
    warnings: input.warnings ?? [],
    boundaries: report.boundaries,
  });
  const selectionTokenLimit = Math.floor(budget.maxTokens * 0.7);

  const select = (
    candidates: TaskContextItem[],
    target: ContextPacketItem[],
    tier: "core" | "supporting",
    maxItems: number,
  ): void => {
    for (const candidate of candidates) {
      const packetItem = toPacketItem(candidate, freshness, report.task.text, taskPaths);
      const itemTokens = estimateTokens(packetItem);
      const withinItemLimit = target.length < maxItems;
      const withinTokenLimit = selectionTokens + itemTokens <= selectionTokenLimit;
      const included = withinItemLimit && (packetItem.necessity === "required" || withinTokenLimit);

      if (included) {
        target.push(packetItem);
        selectionTokens += itemTokens;
      }

      rawContextTrace.push({
        ref: packetItem.ref,
        source: packetItem.source,
        decision: included ? "included" : "excluded",
        tier,
        reason: included
          ? `${tier} context selected under the ${profile} budget`
          : !withinItemLimit
            ? `${tier} item limit reached for the ${profile} budget`
            : `${profile} context-selection budget reached`,
        estimatedTokens: itemTokens,
      });
    }
  };

  select(coreCandidates, coreContext, "core", budget.maxCoreItems);
  select(supportingCandidates, supportingContext, "supporting", budget.maxSupportingItems);

  const doNotTouch = report.doNotTouch.slice(0, budget.maxConstraints).map((zone) => ({
    ...zone,
    trust: zone.source === "repository_contract" ? "declared" as const : "operator" as const,
    freshness: zone.freshness ?? (zone.source === "repository_contract" ? "unknown" as const : "fresh" as const),
    enforced: false as const,
  }));
  const verificationHints = report.verificationHints.slice(0, budget.maxVerificationHints).map((hint) => ({
    ...hint,
    trust: hint.source === "repository_contract" ? "declared" as const : "operator" as const,
    freshness: hint.freshness ?? (hint.source === "repository_contract" ? "unknown" as const : "fresh" as const),
    executed: false as const,
  }));
  let sourceSpans = selectContextSourceSpans({
    evidence: input.graph.evidence ?? [],
    contextItems: coreContext,
    taskText: report.task.text,
    freshness,
    maxSpans: budget.maxSourceSpans ?? 0,
    maxCharacters: budget.maxSourceSpanCharacters ?? 0,
  });
  let repositoryExemplar: ContextRepositoryExemplar | undefined;
  let repositoryExemplarOmittedForBudget = false;
  let sourceSpanOmittedForBudget = false;
  let contextTrace = rawContextTrace.slice(0, budget.maxTraceItems);
  const warnings = [...(input.warnings ?? [])];
  if (rawContextTrace.length > contextTrace.length) {
    warnings.push(
      `context trace limited to ${budget.maxTraceItems} entries; ${rawContextTrace.length - contextTrace.length} additional selection decisions were omitted`,
    );
  }

  const evidenceForPacket = (): string[] => [...new Set([
    ...coreContext.flatMap((item) => item.evidenceRefs),
    ...supportingContext.flatMap((item) => item.evidenceRefs),
    ...doNotTouch.flatMap((zone) => zone.evidenceRefs),
    ...verificationHints.flatMap((hint) => hint.evidenceRefs),
  ])].sort().slice(0, budget.maxEvidenceRefs);

  const estimatePacket = (): number => estimateTokens({
    schemaVersion: "1.0.0",
    readBeforeEditing: TASK_CONTEXT_READ_BEFORE_EDITING,
    task: report.task,
    profile,
    budget,
    coreContext,
    supportingContext,
    doNotTouch,
    verificationHints,
    warnings,
    evidence: evidenceForPacket(),
    sourceSpans,
    ...(repositoryExemplar ? { repositoryExemplar } : {}),
    boundaries: report.boundaries,
    contextTrace,
  });

  let estimatedTokens = estimatePacket();
  while (estimatedTokens > budget.maxTokens && supportingContext.length > 0) {
    const removed = supportingContext.pop()!;
    const trace = contextTrace.find((entry) => entry.ref === removed.ref && entry.decision === "included");
    if (trace) {
      trace.decision = "excluded";
      trace.reason = `${profile} packet budget reached after envelope accounting`;
    }
    estimatedTokens = estimatePacket();
  }
  while (estimatedTokens > budget.maxTokens && coreContext.some((item) =>
    item.trust !== "operator" && item.necessity !== "required")) {
    let index = coreContext.length - 1;
    while (index >= 0 && (
      coreContext[index]?.trust === "operator"
      || coreContext[index]?.necessity === "required"
    )) index -= 1;
    const removed = coreContext.splice(index, 1)[0];
    if (!removed) break;
    const trace = contextTrace.find((entry) => entry.ref === removed.ref && entry.decision === "included");
    if (trace) {
      trace.decision = "excluded";
      trace.reason = `${profile} packet budget reached after envelope accounting`;
    }
    estimatedTokens = estimatePacket();
  }
  const selectedContextPaths = new Set(coreContext.flatMap((item) => item.path ? [item.path] : []));
  sourceSpans = sourceSpans.filter((span) => selectedContextPaths.has(span.path));
  repositoryExemplar = selectContextRepositoryExemplar({
    taskText: report.task.text,
    coreContext,
    supportingContext,
    evidence: input.graph.evidence ?? [],
    freshness,
  });
  estimatedTokens = estimatePacket();
  if (estimatedTokens > budget.maxTokens && repositoryExemplar) {
    repositoryExemplar = undefined;
    repositoryExemplarOmittedForBudget = true;
    estimatedTokens = estimatePacket();
  }
  while (estimatedTokens > budget.maxTokens && contextTrace.length > 0) {
    contextTrace = contextTrace.slice(0, -1);
    estimatedTokens = estimatePacket();
  }
  while (estimatedTokens > budget.maxTokens && sourceSpans.length > 0) {
    sourceSpans = sourceSpans.slice(0, -1);
    sourceSpanOmittedForBudget = true;
    estimatedTokens = estimatePacket();
  }

  const evidence = evidenceForPacket();
  const truncated = rawContextTrace.some((entry) => entry.decision === "excluded")
    || rawContextTrace.length > contextTrace.length
    || report.doNotTouch.length > doNotTouch.length
    || report.verificationHints.length > verificationHints.length
    || repositoryExemplarOmittedForBudget
    || sourceSpanOmittedForBudget
    || estimatedTokens > budget.maxTokens;

  return {
    report,
    packet: {
      schemaVersion: "1.0.0",
      readBeforeEditing: TASK_CONTEXT_READ_BEFORE_EDITING,
      task: report.task,
      profile,
      budget,
      coreContext,
      supportingContext,
      doNotTouch,
      verificationHints,
      warnings,
      evidence,
      sourceSpans,
      ...(repositoryExemplar ? { repositoryExemplar } : {}),
      boundaries: report.boundaries,
      contextTrace,
      estimatedTokens,
      truncated,
    },
  };
}

export function projectModelContext(packet: CompiledContextPacket): ModelContextProjection {
  const projectItem = (item: ContextPacketItem): ModelContextProjectionItem => ({
    ref: item.ref,
    kind: item.kind,
    trust: item.trust,
    freshness: item.freshness,
    reason: item.reason,
    routeRole: item.routeRole,
    necessity: item.necessity,
    necessityReason: item.necessityReason,
  });
  const projectedCoreContext = dedupeProjectionItems(packet.coreContext.map(projectItem));
  const selectedRoots = new Set(
    projectedCoreContext
      .filter((item) => item.kind === "file" && !item.reason.startsWith("graph claim:"))
      .map((item) => item.ref),
  );
  const boundaryPaths = projectedCoreContext
    .filter((item) => item.kind === "file" && isIncomingBoundary(item, selectedRoots))
    .map((item) => item.ref);
  const boundaryPathSet = new Set(boundaryPaths);
  const readFirst = projectedCoreContext
    .filter((item) => item.kind === "file" && !boundaryPathSet.has(item.ref))
    .map((item) => item.ref);
  const base = {
    schemaVersion: "1.0.0" as const,
    instruction: "Read every readFirst path before planning. Treat constraints as acceptance criteria. A preservation-only constraint names a surface to leave unchanged, not a target to locate. Refine or search only when inspected source exposes a task-required target absent from readFirst and boundaryPaths. Do not search for analogues. Run checks.",
    paths: packet.task.paths,
    readFirst,
    boundaryPaths,
    coreContext: projectedCoreContext,
    supportingContext: dedupeProjectionItems(packet.supportingContext.map(projectItem)),
    sourceSpans: (packet.sourceSpans ?? []).map((span) => ({ ...span })),
    ...(packet.repositoryExemplar
      ? {
          repositoryExemplar: {
            ...packet.repositoryExemplar,
            sourceSpan: { ...packet.repositoryExemplar.sourceSpan },
          },
        }
      : {}),
    constraints: packet.doNotTouch.map((zone) => ({
      statement: zone.reason,
      ...(zone.path !== undefined ? { path: zone.path } : {}),
      ...(zone.symbolId !== undefined ? { symbolId: zone.symbolId } : {}),
      ...(zone.trust === "declared" ? { trust: zone.trust, freshness: zone.freshness } : {}),
    })),
    checks: packet.verificationHints.map((hint) => ({
      ...(hint.command !== undefined ? { command: hint.command } : {}),
      ...(hint.artifact !== undefined ? { artifact: hint.artifact } : {}),
      ...(hint.trust === "declared" ? { trust: hint.trust, freshness: hint.freshness } : {}),
    })),
    warnings: packet.warnings,
  };
  const selectionWithoutProjectedTokens = {
    profile: packet.profile,
    sourcePacketTokens: packet.estimatedTokens,
    truncated: packet.truncated,
  };
  const projectedTokens = estimateTokens({ ...base, selection: selectionWithoutProjectedTokens });
  return {
    ...base,
    selection: {
      profile: packet.profile,
      sourcePacketTokens: packet.estimatedTokens,
      projectedTokens,
      truncated: packet.truncated,
    },
  };
}

export function projectModelContextDelivery(
  context: ModelContextProjection,
  options: ProjectModelContextDeliveryOptions = {},
): ModelContextDelivery {
  const policy = options.policy ?? "full";
  const includeBoundaryPaths = policy !== "role-aware"
    && policy !== "summary-aware"
    && policy !== "navigation-only"
    && context.boundaryPaths.length > 0
    && (context.paths.length > 0 || context.selection.profile !== "compact");
  const { readFirst, supportingContext, routeSummaries } = deliveryTiers(context, policy);
  const deliveredPathSet = new Set(readFirst);
  const sourceSpans = (context.sourceSpans ?? []).filter((span) => deliveredPathSet.has(span.path));
  const deliveredSupportingRefs = new Set(supportingContext.map((item) => item.ref));
  const repositoryExemplar = context.repositoryExemplar
    && deliveredSupportingRefs.has(context.repositoryExemplar.ref)
    ? context.repositoryExemplar
    : undefined;
  const constraints = context.constraints.map((constraint) => {
    if (constraint.path !== undefined) return `${constraint.statement} [path: ${constraint.path}]`;
    if (constraint.symbolId !== undefined) return `${constraint.statement} [symbol: ${constraint.symbolId}]`;
    return constraint.statement;
  });
  const checks = context.checks.flatMap((check) => [
    ...(check.command !== undefined ? [check.command] : []),
    ...(check.artifact !== undefined ? [`artifact: ${check.artifact}`] : []),
  ]);

  return {
    schemaVersion: "1.0.0",
    instruction: deliveryInstruction(policy, includeBoundaryPaths),
    readFirst,
    ...(includeBoundaryPaths ? { boundaryPaths: [...context.boundaryPaths] } : {}),
    ...(supportingContext.length > 0 ? { supportingContext } : {}),
    ...(routeSummaries.length > 0 ? { routeSummaries } : {}),
    ...(sourceSpans.length > 0 ? { sourceSpans } : {}),
    ...(repositoryExemplar
      ? {
          repositoryExemplar: {
            ...repositoryExemplar,
            sourceSpan: { ...repositoryExemplar.sourceSpan },
          },
        }
      : {}),
    constraints,
    checks,
    ...(context.warnings.length > 0 ? { warnings: [...context.warnings] } : {}),
  };
}

function deliveryTiers(
  context: ModelContextProjection,
  policy: ModelContextDeliveryPolicy,
): {
  readFirst: string[];
  supportingContext: ModelContextProjectionItem[];
  routeSummaries: ModelContextRouteSummary[];
} {
  if (policy === "full") {
    return {
      readFirst: [...context.readFirst],
      supportingContext: context.supportingContext.map(legacyDeliveryItem),
      routeSummaries: [],
    };
  }

  const explicitPaths = new Set(context.paths);
  const itemForPath = new Map(
    context.coreContext
      .filter((item) => item.kind === "file")
      .map((item) => [item.ref, item] as const),
  );
  if (policy === "role-aware" || policy === "summary-aware" || policy === "navigation-only") {
    const routeForPath = (path: string): ModelContextProjectionItem | undefined => {
      const item = itemForPath.get(path);
      return item ? withProjectionRoute(item, explicitPaths) : undefined;
    };
    const mandatory = new Set(context.readFirst.filter((path) =>
      routeForPath(path)?.necessity === "required"));
    if (mandatory.size === 0 && context.readFirst.length > 0) {
      mandatory.add(context.readFirst[0]!);
    }
    const readFirst = context.readFirst.filter((path) => mandatory.has(path));
    const supportingContext = dedupeProjectionItems([
      ...context.readFirst
        .filter((path) => !mandatory.has(path))
        .map(routeForPath)
        .filter((item): item is ModelContextProjectionItem => item !== undefined),
      ...context.boundaryPaths
        .map(routeForPath)
        .filter((item): item is ModelContextProjectionItem => item !== undefined)
        .map((item) => ({
          ...item,
          routeRole: "compatibility" as const,
          necessity: "conditional" as const,
          necessityReason: "This path calls selected source; inspect it only if exported behavior or compatibility may change.",
        })),
      ...context.supportingContext.map((item) => withProjectionRoute(item, explicitPaths)),
    ]);
    if (policy === "summary-aware" || policy === "navigation-only") {
      const omittedRoutes = supportingContext.filter(isSummarizableConditionalRoute);
      const omittedRouteSet = new Set<ModelContextProjectionItem>(omittedRoutes);
      return {
        readFirst,
        supportingContext: supportingContext.filter((item) => !omittedRouteSet.has(item)),
        routeSummaries: policy === "summary-aware" ? summarizeConditionalRoutes(omittedRoutes) : [],
      };
    }
    return { readFirst, supportingContext, routeSummaries: [] };
  }

  const mandatory = new Set(context.readFirst.filter((path) => {
    const item = itemForPath.get(path);
    return explicitPaths.has(path)
      || isTestContextPath(path)
      || item?.reason.startsWith("task-signaled ") === true;
  }));
  if (mandatory.size === 0 && context.readFirst.length > 0) {
    mandatory.add(context.readFirst[0]!);
  }

  const readFirst = context.readFirst.filter((path) => mandatory.has(path));
  const deferredCore = context.readFirst
    .filter((path) => !mandatory.has(path))
    .map((path) => itemForPath.get(path))
    .filter((item): item is ModelContextProjectionItem => item !== undefined)
    .map((item) => ({
      ...legacyDeliveryItem(item),
      reason: `conditional route selected from ${item.reason}; inspect only when required by the task or inspected source`,
    }));
  const supportingContext = dedupeProjectionItems([
    ...deferredCore,
    ...context.supportingContext.map(legacyDeliveryItem),
  ]);

  return { readFirst, supportingContext, routeSummaries: [] };
}

function deliveryInstruction(policy: ModelContextDeliveryPolicy, includeBoundaryPaths: boolean): string {
  if (policy === "navigation-only") {
    return "Read every readFirst path before editing. Preserve constraints. Expand only for a task-required unresolved symbol. Run checks.";
  }
  if (policy === "summary-aware") {
    return "Batch-read every readFirst path; each is required for this task. Pathless routeSummaries are explicit routing decisions. For a condition-not-triggered, skip-unless-triggered summary, do not inspect, search for, or report omitted routes merely because their imports appear in readFirst source. Inspect another source only after the actual edit makes its inspectWhen condition true or exposes a task-required unresolved symbol. Preserve constraints, stop when the change boundary is resolved, and run checks.";
  }
  if (policy === "role-aware") {
    return "Batch-read every readFirst path; each is required for this task. Do not batch-read supportingContext. Conditional routes include a routeRole and necessityReason: inspect one only when that condition applies to the source change. Supporting routes are advisory and should be read only when required context leaves a task question unresolved. Preserve constraints, stop when the change boundary is resolved, and run checks.";
  }
  if (policy === "tiered") {
    return includeBoundaryPaths
      ? "Batch-read every readFirst path. Do not batch-read supportingContext. Preserve constraints and boundaryPaths. Inspect only the minimum supporting routes required by the task or inspected source, then stop when the change boundary is resolved. Look up only task-required targets named by inspected source. Run checks."
      : "Batch-read every readFirst path. Do not batch-read supportingContext. Preserve constraints. Inspect only the minimum supporting routes required by the task or inspected source, then stop when the change boundary is resolved. Look up only task-required targets named by inspected source. Run checks.";
  }
  return includeBoundaryPaths
    ? "Batch-read every readFirst path. Preserve constraints and boundaryPaths. Look up only task-required targets named by inspected source. Run checks."
    : "Batch-read every readFirst path. Preserve constraints. Look up only task-required targets named by inspected source. Run checks.";
}

function isSummarizableConditionalRoute(
  item: ModelContextProjectionItem,
): item is ModelContextProjectionItem & {
  routeRole: TaskContextRouteRole;
  necessity: "conditional";
  trust: "deterministic" | "declared";
} {
  return item.kind === "file"
    && item.necessity === "conditional"
    && item.routeRole !== undefined
    && (item.trust === "deterministic" || item.trust === "declared");
}

function summarizeConditionalRoutes(
  items: Array<ModelContextProjectionItem & {
    routeRole: TaskContextRouteRole;
    necessity: "conditional";
    trust: "deterministic" | "declared";
  }>,
): ModelContextRouteSummary[] {
  const groups = new Map<string, ModelContextRouteSummary>();
  for (const item of items) {
    const key = `${item.routeRole}\0${item.trust}\0${item.freshness}`;
    const existing = groups.get(key);
    if (existing) {
      existing.routeCount += 1;
      const text = routeSummaryText(item.routeRole, existing.routeCount);
      existing.summary = text.summary;
      existing.inspectWhen = text.inspectWhen;
      continue;
    }
    const text = routeSummaryText(item.routeRole, 1);
    groups.set(key, {
      routeRole: item.routeRole,
      trust: item.trust,
      freshness: item.freshness,
      routeCount: 1,
      resolution: "condition-not-triggered",
      readDisposition: "skip-unless-triggered",
      ...text,
    });
  }
  return [...groups.values()];
}

function routeSummaryText(
  routeRole: TaskContextRouteRole,
  routeCount: number,
): Pick<ModelContextRouteSummary, "summary" | "inspectWhen"> {
  const routes = `${routeCount} ${routeCount === 1 ? "route" : "routes"}`;
  if (routeRole === "dependency") {
    return {
      summary: `${routes} confirm that required source already delegates behavior through an existing dependency. The current task does not require changing that dependency; reuse required source's existing behavior.`,
      inspectWhen: "The actual edit requires a changed dependency API or required source leaves task behavior unresolved.",
    };
  }
  if (routeRole === "compatibility") {
    return {
      summary: `${routes} confirm that existing callers depend on required source. The current task preserves existing exports and behavior, so no caller inspection or change is required.`,
      inspectWhen: "The actual edit alters an existing export, signature, or observable behavior.",
    };
  }
  if (routeRole === "handoff") {
    return {
      summary: `${routes} confirm an existing cross-boundary handoff. Preserve the current values and semantics crossing that boundary.`,
      inspectWhen: "Inspect another source only if the task changes the shared contract or values crossing the handoff.",
    };
  }
  if (routeRole === "implementation") {
    return {
      summary: `${routes} identify existing implementation context outside the required read set; no implementation change is implied.`,
      inspectWhen: "Inspect another source only if required source exposes an unresolved implementation target needed by the task.",
    };
  }
  return {
    summary: `${routes} describe deterministic context outside the required read set; no additional source change is implied.`,
    inspectWhen: "Inspect another source only if required source leaves a task-critical question unresolved.",
  };
}

function legacyDeliveryItem(item: ModelContextProjectionItem): ModelContextProjectionItem {
  return {
    ref: item.ref,
    kind: item.kind,
    trust: item.trust,
    freshness: item.freshness,
    reason: item.reason,
  };
}

function withProjectionRoute(
  item: ModelContextProjectionItem,
  explicitPaths: ReadonlySet<string>,
): ModelContextProjectionItem {
  if (item.routeRole && item.necessity && item.necessityReason) return { ...item };
  if (explicitPaths.has(item.ref)) {
    return {
      ...item,
      routeRole: "task-target",
      necessity: "required",
      necessityReason: "This path is explicit task scope.",
    };
  }
  if (isTestContextPath(item.ref)) {
    return {
      ...item,
      routeRole: "verification",
      necessity: "required",
      necessityReason: "This test path is part of the task's regression boundary.",
    };
  }
  if (item.trust === "inference" || item.kind !== "file") {
    return {
      ...item,
      routeRole: "supporting",
      necessity: "supporting",
      necessityReason: "This route is advisory context rather than a required source read.",
    };
  }
  return {
    ...item,
    routeRole: "dependency",
    necessity: "conditional",
    necessityReason: "Inspect this deterministic neighbor only if required by the task or inspected source.",
  };
}

function isTestContextPath(path: string): boolean {
  return /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/iu.test(path);
}

export function estimateModelContextDeliveryTokens(context: ModelContextDelivery): number {
  return estimateTokens(context);
}

const DETERMINISTIC_SOURCE_SPAN_SOURCES = new Set([
  "ast",
  "deterministic_scan",
  "ground_truth",
  "import_graph",
  "typechecker",
]);

const MAX_SOURCE_SPAN_EXCERPT_CHARACTERS = 320;

function selectContextSourceSpans(input: {
  evidence: TaskContextGraphEvidenceLike[];
  contextItems: ContextPacketItem[];
  taskText: string;
  freshness: ContextSourceSpan["freshness"];
  maxSpans: number;
  maxCharacters: number;
}): ContextSourceSpan[] {
  const taskTokens = sourceSpanTokens(input.taskText);
  const contextByPath = new Map<string, ContextPacketItem>();
  for (const item of input.contextItems) {
    if (item.kind !== "file" || !item.path || contextByPath.has(item.path)) continue;
    contextByPath.set(item.path, item);
  }

  const result: ContextSourceSpan[] = [];
  let usedCharacters = 0;
  for (const [path, contextItem] of contextByPath) {
    if (result.length >= input.maxSpans || usedCharacters >= input.maxCharacters) break;
    const remainingCharacters = input.maxCharacters - usedCharacters;
    const span = selectSourceSpanForPath({
      evidence: input.evidence,
      path,
      directEvidence: new Set(contextItem.evidenceRefs),
      taskTokens,
      reason: contextItem.necessityReason ?? contextItem.reason,
      freshness: input.freshness,
      maxCharacters: Math.min(MAX_SOURCE_SPAN_EXCERPT_CHARACTERS, remainingCharacters),
    });
    if (!span) continue;
    result.push(span);
    usedCharacters += span.excerpt.length;
  }
  return result;
}

function selectContextRepositoryExemplar(input: {
  taskText: string;
  coreContext: ContextPacketItem[];
  supportingContext: ContextPacketItem[];
  evidence: TaskContextGraphEvidenceLike[];
  freshness: ContextRepositoryExemplar["freshness"];
}): ContextRepositoryExemplar | undefined {
  if (!taskNeedsRepositoryExemplar(input.taskText)) return undefined;
  const corePaths = new Set(input.coreContext.flatMap((item) => item.path ? [item.path] : []));
  const coreLanguages = new Set([...corePaths].flatMap((path) => {
    const language = sourcePathLanguage(path);
    return language ? [language] : [];
  }));
  const taskTokens = sourceSpanTokens(input.taskText);
  const candidates = input.supportingContext
    .filter((item) => item.source === "embedding_retrieval")
    .filter((item) => item.scoreBand === "strong" || item.scoreBand === "useful")
    .filter((item): item is ContextPacketItem & { path: string } => Boolean(item.path))
    .filter((item) => !corePaths.has(item.path))
    .filter((item) => {
      const language = sourcePathLanguage(item.path);
      return coreLanguages.size === 0 || language === undefined || coreLanguages.has(language);
    })
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0) || left.ref.localeCompare(right.ref));

  for (const candidate of candidates) {
    const sourceSpan = selectSourceSpanForPath({
      evidence: input.evidence,
      path: candidate.path,
      directEvidence: new Set(candidate.evidenceRefs),
      taskTokens,
      reason: "Exact source entry point for the selected repository exemplar.",
      freshness: input.freshness,
      maxCharacters: MAX_SOURCE_SPAN_EXCERPT_CHARACTERS,
    });
    if (!sourceSpan) continue;
    return {
      ref: candidate.ref,
      path: candidate.path,
      reason: "A high-signal local precedent was selected because this task adds or extends an established repository pattern.",
      trust: "inference",
      freshness: input.freshness,
      inspectWhen: "Use this precedent only to match repository placement and extension conventions; do not copy behavior that the task does not require.",
      sourceSpan,
    };
  }
  return undefined;
}

function selectSourceSpanForPath(input: {
  evidence: TaskContextGraphEvidenceLike[];
  path: string;
  directEvidence: ReadonlySet<string>;
  taskTokens: ReadonlySet<string>;
  reason: string;
  freshness: ContextSourceSpan["freshness"];
  maxCharacters: number;
}): ContextSourceSpan | undefined {
  const candidates = input.evidence
    .filter((entry) => entry.path === input.path)
    .filter((entry) => typeof entry.excerpt === "string" && entry.excerpt.trim().length > 0)
    .filter((entry) => typeof entry.lineStart === "number" && Number.isInteger(entry.lineStart) && entry.lineStart > 0)
    .filter((entry) => typeof entry.sourceSha256 === "string" && /^[a-f0-9]{64}$/u.test(entry.sourceSha256))
    .filter((entry) => entry.source !== undefined && DETERMINISTIC_SOURCE_SPAN_SOURCES.has(entry.source))
    .map((entry) => ({ entry, score: sourceSpanScore(entry, input.directEvidence, input.taskTokens) }))
    .sort((left, right) =>
      right.score - left.score
      || (left.entry.lineStart ?? 0) - (right.entry.lineStart ?? 0)
      || left.entry.id.localeCompare(right.entry.id));
  const selected = candidates[0]?.entry;
  if (
    !selected
    || selected.lineStart === undefined
    || selected.excerpt === undefined
    || selected.sourceSha256 === undefined
    || input.maxCharacters <= 0
  ) return undefined;

  const excerpt = selected.excerpt.trim().slice(0, input.maxCharacters);
  if (excerpt.length === 0) return undefined;
  const completeExcerpt = excerpt === selected.excerpt.trim();
  const lineEnd = completeExcerpt && typeof selected.lineEnd === "number" && selected.lineEnd >= selected.lineStart
    ? selected.lineEnd
    : selected.lineStart + excerpt.split(/\r?\n/u).length - 1;
  return {
    path: input.path,
    sourceSha256: selected.sourceSha256,
    lineStart: selected.lineStart,
    lineEnd,
    excerpt,
    evidenceRef: selected.id,
    reason: input.reason,
    freshness: input.freshness,
  };
}

function sourcePathLanguage(path: string): string | undefined {
  const normalized = path.toLowerCase();
  if (/\.[cm]?[jt]sx?$/u.test(normalized)) return "js-ts";
  if (/\.pyi?$/u.test(normalized)) return "python";
  if (/\.go$/u.test(normalized)) return "go";
  if (/\.(?:java|kt|kts)$/u.test(normalized)) return "java-kotlin";
  if (/\.rb$/u.test(normalized)) return "ruby";
  if (/\.rs$/u.test(normalized)) return "rust";
  if (/\.cs$/u.test(normalized)) return "csharp";
  return undefined;
}

function sourceSpanScore(
  evidence: TaskContextGraphEvidenceLike,
  directEvidence: ReadonlySet<string>,
  taskTokens: ReadonlySet<string>,
): number {
  const excerpt = evidence.excerpt ?? "";
  const candidateTokens = sourceSpanTokens(`${evidence.id} ${excerpt}`);
  let score = directEvidence.has(evidence.id) ? 1_000 : 0;
  for (const token of candidateTokens) {
    if (taskTokens.has(token)) score += 20;
  }
  if (/\b(?:class|const|function|interface|type)\b/u.test(excerpt)) score += 5;
  if (/^\s*(?:import|require\s*\()/u.test(excerpt)) score += 2;
  return score;
}

function sourceSpanTokens(value: string): Set<string> {
  return new Set(
    value
      .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .filter((token) => token.length >= 3),
  );
}

function dedupeProjectionItems(items: ModelContextProjectionItem[]): ModelContextProjectionItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.ref}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupePacketCandidates(items: TaskContextItem[]): TaskContextItem[] {
  const byKey = new Map<string, TaskContextItem>();
  const result: TaskContextItem[] = [];
  for (const item of items) {
    const key = `${item.kind}:${itemRef(item)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.evidenceRefs = [...new Set([...existing.evidenceRefs, ...item.evidenceRefs])];
      if (routePriority(item) > routePriority(existing)) {
        existing.routeRole = item.routeRole;
        existing.necessity = item.necessity;
        existing.necessityReason = item.necessityReason;
      }
      continue;
    }
    const retained = { ...item, evidenceRefs: [...item.evidenceRefs] };
    byKey.set(key, retained);
    result.push(retained);
  }
  return result;
}

function routePriority(item: TaskContextItem): number {
  const necessity = item.necessity === "required"
    ? 300
    : item.necessity === "conditional"
      ? 200
      : item.necessity === "supporting"
        ? 100
        : 0;
  const role = item.routeRole === "task-target"
    ? 80
    : item.routeRole === "repository-law"
      ? 70
      : item.routeRole === "handoff"
        ? 60
        : item.routeRole === "verification"
          ? 50
          : item.routeRole === "implementation"
            ? 40
            : item.routeRole === "dependency"
              ? 30
              : item.routeRole === "compatibility"
                ? 20
                : item.routeRole === "supporting"
                  ? 10
                  : 0;
  return necessity + role;
}

function isIncomingBoundary(item: ModelContextProjectionItem, selectedRoots: Set<string>): boolean {
  const match = /^graph claim: file:(.+?) ([^ ]+) file:(.+)$/u.exec(item.reason);
  if (!match) return false;
  const [, subject, predicate, object] = match;
  if (!subject || !predicate || !object) return false;
  return item.ref === subject
    && !selectedRoots.has(subject)
    && selectedRoots.has(object)
    && predicate === "imports";
}

export function renderTaskContextMarkdown(packet: CompiledContextPacket, reportId: string): string {
  const lines: string[] = [
    "# Task Context",
    "",
    `> ${packet.readBeforeEditing}`,
    "",
    `Task: ${packet.task.text.replace(/\s+/g, " ").trim()}`,
  ];

  if (packet.task.goal) lines.push(`Goal: ${packet.task.goal}`);
  if (packet.task.paths.length > 0) lines.push(`Paths: ${packet.task.paths.join(", ")}`);
  lines.push("", "## Core Context");
  lines.push(...(packet.coreContext.length > 0
    ? packet.coreContext.map(renderContextItem)
    : ["- (no operator paths or deterministic graph context selected)"]));
  lines.push("", "## Related / Supporting Context");
  lines.push(...(packet.supportingContext.length > 0
    ? packet.supportingContext.map((item) => {
        const band = item.scoreBand
          ? ` (band ${item.scoreBand}${typeof item.score === "number" ? `, score ${item.score}` : ""})`
          : "";
        return `${renderContextItem(item)}${band}`;
      })
    : ["- (no embedding or semantic supporting context selected)"]));
  lines.push("", "## Do Not Touch");
  lines.push(...(packet.doNotTouch.length > 0
    ? packet.doNotTouch.map((zone) => `- ${zone.reason}${zone.path ? ` (${zone.path})` : ""} (guidance, not enforced)`)
    : ["- (no task or repository-contract constraints selected)"]));
  lines.push("", "## Verification Hints");
  lines.push(...(packet.verificationHints.length > 0
    ? packet.verificationHints.map((hint) => `- ${hint.command ?? hint.artifact ?? "hint"} — ${hint.reason} (hint, not executed)`)
    : ["- (no task or repository-contract verification hints selected)"]));
  if (packet.warnings.length > 0) {
    lines.push("", "## Warnings", ...packet.warnings.map((warning) => `- ${warning}`));
  }
  lines.push("", "## Evidence");
  lines.push(...(packet.evidence.length > 0
    ? packet.evidence.map((ref) => `- ${ref}`)
    : ["- (no evidence refs collected for this context)"]));
  lines.push(
    "",
    `Context profile: ${packet.profile}; estimated tokens: ${packet.estimatedTokens}/${packet.budget.maxTokens}; truncated: ${packet.truncated}.`,
    "Task-shaped context is proposal/context, not proof. Deterministic graph facts outrank embedding similarity. Verification hints are hints, not executed commands. Re-run with --json for the structured agentContext form.",
    `Report: ${reportId}`,
  );
  return lines.join("\n");
}

function renderContextItem(item: ContextPacketItem): string {
  const route = item.routeRole && item.necessity && item.necessityReason
    ? ` [${item.necessity}; ${item.routeRole}] — ${item.reason} ${item.necessityReason}`
    : ` — ${item.reason}`;
  return `- ${item.ref}${route}`;
}

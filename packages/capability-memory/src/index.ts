import {
  artifactRefKey,
  digestJson,
  type ArtifactHeader,
  type ArtifactRef,
} from "@rekon/kernel-artifacts";
import type {
  ContextOutcomeAssociationStatus,
  ContextOutcomeEvaluationItem,
  ContextOutcomeEvaluationReport,
} from "@rekon/kernel-repo-model";
import { type ArtifactReader, type Learner, defineCapability } from "@rekon/sdk";
import {
  buildGroundedContextOutcomeEvaluation,
  GROUNDED_CONTEXT_OUTCOME_POLICY_VERSION,
} from "./grounded-outcomes.js";

export {
  buildGroundedContextOutcomeEvaluation,
  GROUNDED_CONTEXT_OUTCOME_POLICY_VERSION,
} from "./grounded-outcomes.js";

export const MEMORY_CURATION_POLICY_VERSION = "grounded-memory-curation.v2";

export type OperatorMemoryPriority = "low" | "normal" | "high";

export type OperatorMemoryStatus = "active" | "deprecated" | "superseded";

export type OperatorMemoryVerificationStatus = "verified" | "unverified" | "disputed";

export type OperatorMemoryScope = {
  paths: string[];
  goal?: string;
  systems?: string[];
  capabilities?: string[];
  layers?: string[];
  tags?: string[];
};

export type OperatorMemoryVerification = {
  status?: OperatorMemoryVerificationStatus;
  verifiedAt?: string;
  verificationResultRef?: ArtifactRef;
};

export type OperatorFeedbackEntry = {
  header: ArtifactHeader;
  instruction: string;
  scope: OperatorMemoryScope;
  confidence: number;
  rationale?: string;
  evidence?: ArtifactRef[];
  verification?: OperatorMemoryVerification;
  reliability?: number;
  priority?: OperatorMemoryPriority;
  createdAt?: string;
  updatedAt?: string;
  source?: "operator" | "system";
  status?: OperatorMemoryStatus;
};

export type MemorySelectionItem = {
  // Legacy fields (kept for backwards compatibility with the resolver and
  // older consumers that read `selection.selections[*].instruction`).
  instruction: string;
  scope?: Record<string, unknown>;
  confidence: number;
  reason: string;

  // New fields added with the v1 ranking work.
  id?: string;
  score?: number;
  reasons?: string[];
  match?: {
    paths?: string[];
    systems?: string[];
    capabilities?: string[];
    tags?: string[];
  };
  priority?: OperatorMemoryPriority;
  verification?: OperatorMemoryVerificationStatus;
};

export type MemorySelectionRejection = {
  id: string;
  reasons: string[];
};

export type MemorySelectionQuery = {
  path?: string;
  paths?: string[];
  goal?: string;
  system?: string;
  capability?: string;
  tags?: string[];
};

export type MemorySelection = {
  header: ArtifactHeader;
  // Legacy fields preserved.
  path: string;
  goal: string;
  selections: MemorySelectionItem[];
  // New v1 fields.
  query: MemorySelectionQuery;
  selected: MemorySelectionItem[];
  rejected: MemorySelectionRejection[];
};

export type MemoryUsageOutcome = "helpful" | "ignored" | "harmful" | "stale" | "unclear";

export type MemoryUsageContext = {
  path?: string;
  goal?: string;
  resolverId?: string;
  publicationId?: string;
  workOrderId?: string;
};

export type MemoryUsageEvent = {
  id: string;
  memoryEntryId: string;
  memorySelectionId?: string;
  outcome: MemoryUsageOutcome;
  note: string;
  usedAt: string;
  usedBy?: string;
  context?: MemoryUsageContext;
  evidence?: ArtifactRef[];
};

export type MemoryUsageLedger = {
  header: ArtifactHeader;
  events: MemoryUsageEvent[];
};

export type MemoryCurationRecommendation =
  | "keep"
  | "reinforce"
  | "review"
  | "deprecate"
  | "supersede-candidate";

export type MemoryCurationItem = {
  memoryEntryId: string;
  instruction: string;
  recommendation: MemoryCurationRecommendation;
  helpfulCount: number;
  ignoredCount: number;
  harmfulCount: number;
  staleCount: number;
  unclearCount: number;
  score: number;
  reasons: string[];
  groundedStatus?: ContextOutcomeAssociationStatus;
  supportingRootCount?: number;
  refutingRootCount?: number;
  legacySignalCount?: number;
};

export type MemoryCurationReport = {
  header: ArtifactHeader;
  policyVersion?: string;
  groundedEvaluationRef?: ArtifactRef;
  groundedSummary?: ContextOutcomeEvaluationReport["summary"];
  summary: {
    totalMemories: number;
    totalUsageEvents: number;
    keep: number;
    reinforce: number;
    review: number;
    deprecate: number;
    supersedeCandidate: number;
  };
  items: MemoryCurationItem[];
};

export type GroundedMemoryContextItem = {
  id: string;
  instruction: string;
  confidence: number;
  groundedStatus: "unobserved" | "suggestive" | "corroborated";
  reason: string;
  evidenceRefs: ArtifactRef[];
};

export type GroundedMemoryContextSelection = {
  items: GroundedMemoryContextItem[];
  inputRefs: ArtifactRef[];
};

export type GroundedMemoryEntryRecord = {
  ref: ArtifactRef;
  entry: OperatorFeedbackEntry;
};

const MEMORY_USAGE_OUTCOMES: ReadonlyArray<MemoryUsageOutcome> = [
  "helpful",
  "ignored",
  "harmful",
  "stale",
  "unclear",
];

const MEMORY_USAGE_NOTE_REQUIRED: ReadonlyArray<MemoryUsageOutcome> = [
  "harmful",
  "stale",
  "ignored",
];

export const memoryLearner: Learner = {
  id: "@rekon/capability-memory.learner",
  produces: [
    "OperatorFeedbackEntry",
    "MemoryEvent",
    "MemorySelection",
    "MemoryUsageLedger",
    "MemoryCurationReport",
    "ContextOutcomeEvaluationReport",
  ],
  async learn({ artifacts, input }) {
    const mode = typeof input?.mode === "string" ? input.mode : "select";
    const repo = parseRepo(input?.repo);

    if (mode === "add") {
      return runAdd(artifacts, repo, input ?? {});
    }

    if (mode === "select") {
      return runSelect(artifacts, repo, input ?? {});
    }

    if (mode === "usage-record") {
      return runUsageRecord(artifacts, repo, input ?? {});
    }

    if (mode === "curation") {
      return runCuration(artifacts, repo, input ?? {});
    }

    throw new Error(`Unknown memory learner mode: ${mode}`);
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-memory",
    name: "Memory Capability",
    version: "0.1.0",
    roles: ["learner"],
    consumes: [
      "OperatorFeedbackEntry",
      "ResolverPacket",
      "MemoryUsageLedger",
      "ContextUsageEvent",
      "OutcomeEvent",
      "ContextOutcomeEvaluationReport",
    ],
    produces: [
      "OperatorFeedbackEntry",
      "MemoryEvent",
      "MemorySelection",
      "MemoryUsageLedger",
      "MemoryCurationReport",
      "ContextOutcomeEvaluationReport",
    ],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "operator.feedback.changed",
        description: "Memory selections are invalid when feedback entries change.",
        inputs: ["OperatorFeedbackEntry"],
      },
      {
        id: "memory.usage.changed",
        description:
          "Memory curation reports are invalid when new usage events are recorded.",
        inputs: ["MemoryUsageLedger"],
      },
      {
        id: "context.outcome.changed",
        description: "Grounded curation is invalid when context delivery or outcome evidence changes.",
        inputs: ["ContextUsageEvent", "OutcomeEvent", "ContextOutcomeEvaluationReport"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.learner(memoryLearner);
  },
});

async function runAdd(
  artifacts: ArtifactReader & { write(type: string, artifact: unknown): Promise<ArtifactRef> },
  repo: { id: string },
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  const instruction = requiredString(input.instruction, "instruction");
  const paths = parsePaths(input.path ?? input.paths);
  const goal = typeof input.goal === "string" && input.goal.length > 0 ? input.goal : undefined;
  const systems = parseStringList(input.system ?? input.systems);
  const capabilities = parseStringList(input.capability ?? input.capabilities);
  const layers = parseStringList(input.layer ?? input.layers);
  const tags = parseStringList(input.tag ?? input.tags);
  const rationale = typeof input.rationale === "string" && input.rationale.length > 0 ? input.rationale : undefined;
  const priority = parsePriority(input.priority);
  const reliability = parseReliability(input.reliability);
  const verification = parseVerificationInput(input);
  const status = parseStatus(input.status);
  const now = new Date().toISOString();
  const scope: OperatorMemoryScope = {
    paths,
    goal,
    systems: systems.length > 0 ? systems : undefined,
    capabilities: capabilities.length > 0 ? capabilities : undefined,
    layers: layers.length > 0 ? layers : undefined,
    tags: tags.length > 0 ? tags : undefined,
  };
  const entry: OperatorFeedbackEntry = {
    header: createHeader("OperatorFeedbackEntry", `feedback-${Date.now()}`, repo.id, [], paths),
    instruction,
    scope,
    confidence: 1,
    rationale,
    verification,
    reliability,
    priority,
    createdAt: now,
    updatedAt: now,
    source: "operator",
    status,
  };
  const entryRef = await artifacts.write("OperatorFeedbackEntry", entry);
  const event = {
    header: createHeader("MemoryEvent", `memory-event-${Date.now()}`, repo.id, [entryRef], paths),
    event: "feedback.added",
    entryRef,
  };

  return [entryRef, await artifacts.write("MemoryEvent", event)];
}

async function runSelect(
  artifacts: ArtifactReader & { write(type: string, artifact: unknown): Promise<ArtifactRef> },
  repo: { id: string },
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  const path = requiredString(input.path, "path");
  const goal = typeof input.goal === "string" ? input.goal : "";
  const system = typeof input.system === "string" && input.system.length > 0 ? input.system : undefined;
  const capability = typeof input.capability === "string" && input.capability.length > 0
    ? input.capability
    : undefined;
  const tags = parseStringList(input.tag ?? input.tags);
  const limit = parseLimit(input.limit, 5);
  const entries = await readFeedbackEntries(artifacts);
  const curationSelection = await readLatestCurationReport(artifacts);
  const curationByEntry = new Map(
    (curationSelection.report?.items ?? []).map((item) => [item.memoryEntryId, item]),
  );
  const ranked = entries
    .map((entry) => rankEntry(
      entry,
      { path, goal, system, capability, tags },
      curationByEntry.get(entry.header.artifactId),
    ))
    .sort(compareRanked);
  const selectedItems: MemorySelectionItem[] = [];
  const rejected: MemorySelectionRejection[] = [];

  for (const candidate of ranked) {
    if (candidate.rejected) {
      rejected.push({
        id: candidate.id,
        reasons: candidate.reasons,
      });
      continue;
    }

    if (selectedItems.length >= limit) {
      continue;
    }

    selectedItems.push(candidate.item);
  }

  const inputRefs = [
    ...await artifacts.list("OperatorFeedbackEntry"),
    ...(curationSelection.ref ? [curationSelection.ref] : []),
  ];
  const selectionKey = `memory-selection:${digestJson({
    path,
    goal,
    system,
    capability,
    tags: [...tags].sort(),
  })}`;
  const selection: MemorySelection = {
    header: createHeader("MemorySelection", `memory-selection-${Date.now()}`, repo.id, inputRefs, [path], selectionKey),
    path,
    goal,
    selections: selectedItems,
    query: {
      path,
      paths: [path],
      goal: goal.length > 0 ? goal : undefined,
      system,
      capability,
      tags: tags.length > 0 ? tags : undefined,
    },
    selected: selectedItems,
    rejected,
  };

  return [await artifacts.write("MemorySelection", selection)];
}

async function runUsageRecord(
  artifacts: ArtifactReader & {
    write(type: string, artifact: unknown): Promise<ArtifactRef>;
  },
  repo: { id: string },
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  const memoryEntryId = requiredString(input.memoryEntryId, "memoryEntryId");
  const outcome = parseUsageOutcome(input.outcome);
  if (!outcome) {
    throw new Error(
      `memory usage outcome must be one of ${MEMORY_USAGE_OUTCOMES.join(", ")}.`,
    );
  }

  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (MEMORY_USAGE_NOTE_REQUIRED.includes(outcome) && note.length === 0) {
    throw new Error(`memory usage note is required when outcome is ${outcome}.`);
  }

  const memorySelectionId = typeof input.memorySelectionId === "string"
    && input.memorySelectionId.length > 0
    ? input.memorySelectionId
    : typeof input.selectionId === "string" && input.selectionId.length > 0
    ? input.selectionId
    : undefined;
  const usedBy = typeof input.usedBy === "string" && input.usedBy.length > 0
    ? input.usedBy
    : undefined;
  const context = parseUsageContext(input.context, input);
  const evidence = parseEvidenceRefs(input.evidence);

  const ledgerRefs = await artifacts.list("MemoryUsageLedger", { order: "newest", limit: 1 });
  const existingLedger = await readLatestLedger(artifacts, ledgerRefs);
  const previousEvents = existingLedger?.events ?? [];

  const event: MemoryUsageEvent = {
    id: `memory-usage-${Date.now()}-${previousEvents.length + 1}`,
    memoryEntryId,
    memorySelectionId,
    outcome,
    note,
    usedAt: new Date().toISOString(),
    usedBy,
    context,
    evidence: evidence.length > 0 ? evidence : undefined,
  };

  const entryRefs = await artifacts.list("OperatorFeedbackEntry");
  const inputRefs = [...entryRefs];
  if (memorySelectionId) {
    const selectionRefs = await artifacts.list("MemorySelection");
    const match = selectionRefs.find((ref) => ref.id === memorySelectionId);
    if (match) {
      inputRefs.push(match);
    }
  }
  for (const ref of evidence) {
    inputRefs.push(ref);
  }

  const ledger: MemoryUsageLedger = {
    header: createHeader(
      "MemoryUsageLedger",
      `memory-usage-ledger-${Date.now()}`,
      repo.id,
      inputRefs,
    ),
    events: [...previousEvents, event],
  };

  validateMemoryUsageLedger(ledger);

  return [await artifacts.write("MemoryUsageLedger", ledger)];
}

async function runCuration(
  artifacts: ArtifactReader & {
    write(type: string, artifact: unknown): Promise<ArtifactRef>;
  },
  repo: { id: string },
  _input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  const entries = await readFeedbackEntries(artifacts);
  const ledgerRefs = await artifacts.list("MemoryUsageLedger", { order: "newest", limit: 1 });
  const ledger = await readLatestLedger(artifacts, ledgerRefs);
  const evaluation = await buildGroundedContextOutcomeEvaluation({
    artifacts,
    repoId: repo.id,
  });
  const evaluationRef = await artifacts.write("ContextOutcomeEvaluationReport", evaluation);

  const entryRefs = await artifacts.list("OperatorFeedbackEntry");
  const inputRefs: ArtifactRef[] = [...entryRefs];
  const latestLedgerRef = ledgerRefs[0];
  if (latestLedgerRef) inputRefs.push(latestLedgerRef);
  inputRefs.push(evaluationRef);

  const report = createMemoryCurationReport({
    repoId: repo.id,
    entries,
    events: ledger?.events ?? [],
    evaluation,
    evaluationRef,
    inputRefs,
  });

  const reportRef = await artifacts.write("MemoryCurationReport", report);
  return [reportRef, evaluationRef];
}

async function readLatestLedger(
  artifacts: { read(ref: ArtifactRef): Promise<unknown> },
  refs: ArtifactRef[],
): Promise<MemoryUsageLedger | undefined> {
  if (refs.length === 0) {
    return undefined;
  }

  const latest = refs[0];
  if (!latest) {
    return undefined;
  }
  return (await artifacts.read(latest)) as MemoryUsageLedger;
}

async function readLatestCurationReport(
  artifacts: ArtifactReader,
): Promise<{ ref?: ArtifactRef; report?: MemoryCurationReport }> {
  const [latest] = await artifacts.list("MemoryCurationReport", { order: "newest", limit: 1 });
  if (!latest) return {};
  return { ref: latest, report: await artifacts.read(latest) as MemoryCurationReport };
}

/**
 * Repeat task-scoped memory only after grounded outcome evaluation. One
 * matching unobserved entry may be delivered once so the loop can gather its
 * first outcome; operator assertion and legacy usage labels never make it
 * repeatable.
 */
export function selectGroundedMemoryForTask(input: {
  entries: GroundedMemoryEntryRecord[];
  curation?: MemoryCurationReport;
  curationRef?: ArtifactRef;
  paths: string[];
  goal: string;
  limit?: number;
  deliveredMemoryIds?: string[];
}): GroundedMemoryContextSelection {
  const limit = parseLimit(input.limit, 5);
  const curationByEntry = new Map((input.curation?.items ?? []).map((item) => [item.memoryEntryId, item]));
  const deliveredMemoryIds = new Set(input.deliveredMemoryIds ?? []);
  const queryPaths = uniqueStrings(input.paths.length > 0 ? input.paths : [""]);
  const candidates: Array<{
    item: GroundedMemoryContextItem;
    score: number;
    specificity: number;
    updatedAt: string;
    trial: boolean;
  }> = [];

  for (const record of input.entries) {
    const id = record.entry.header.artifactId;
    const curation = curationByEntry.get(id);
    const grounded = curation?.groundedStatus === "suggestive" || curation?.groundedStatus === "corroborated";
    const repeatable = grounded
      && (curation.recommendation === "keep" || curation.recommendation === "reinforce");
    const trial = !curation?.groundedStatus && !deliveredMemoryIds.has(id);
    if (!repeatable && !trial) continue;
    const ranked = queryPaths
      .map((path) => rankEntry(record.entry, { path, goal: input.goal, tags: [] }, repeatable ? curation : undefined))
      .filter((candidate): candidate is Extract<RankedCandidate, { rejected: false }> => !candidate.rejected)
      .sort(compareRanked)[0];
    if (!ranked) continue;

    const evidenceRefs = dedupeArtifactRefs([
      record.ref,
      ...(repeatable && input.curationRef ? [input.curationRef] : []),
      ...(repeatable && input.curation?.groundedEvaluationRef ? [input.curation.groundedEvaluationRef] : []),
    ]);
    const groundedStatus = repeatable ? curation.groundedStatus as "suggestive" | "corroborated" : "unobserved";
    candidates.push({
      item: {
        id,
        instruction: record.entry.instruction,
        confidence: ranked.item.confidence,
        groundedStatus,
        reason: trial
          ? `unobserved scoped memory selected once for outcome evaluation by ${ranked.item.reason}`
          : `${groundedStatus} grounded memory selected by ${ranked.item.reason}`,
        evidenceRefs,
      },
      score: ranked.score + (groundedStatus === "corroborated" ? 2 : groundedStatus === "suggestive" ? 1 : 0),
      specificity: ranked.specificity,
      updatedAt: ranked.updatedAt,
      trial,
    });
  }

  candidates.sort((left, right) =>
    right.score - left.score
    || right.specificity - left.specificity
    || right.updatedAt.localeCompare(left.updatedAt)
    || left.item.id.localeCompare(right.item.id));
  const repeatableItems = candidates.filter((candidate) => !candidate.trial).slice(0, limit);
  const trialItem = candidates.find((candidate) => candidate.trial);
  const selected = [
    ...repeatableItems,
    ...(trialItem && repeatableItems.length < limit ? [trialItem] : []),
  ];
  const items = selected.map((candidate) => candidate.item);
  return {
    items,
    inputRefs: dedupeArtifactRefs(items.flatMap((item) => item.evidenceRefs)),
  };
}

export async function readGroundedMemoryForTask(
  artifacts: ArtifactReader,
  input: { paths: string[]; goal: string; limit?: number },
): Promise<GroundedMemoryContextSelection> {
  const entryRefs = await artifacts.list("OperatorFeedbackEntry");
  const entries: GroundedMemoryEntryRecord[] = [];
  for (const ref of entryRefs) {
    const entry = await artifacts.read(ref) as OperatorFeedbackEntry;
    if (typeof entry?.instruction === "string" && entry.scope !== undefined) {
      entries.push({ ref, entry });
    }
  }
  const curation = await readLatestCurationReport(artifacts);
  const deliveredMemoryIds = new Set<string>();
  const usageRefs = await artifacts.list("ContextUsageEvent", { order: "newest", limit: 512 });
  for (const ref of usageRefs) {
    const usage = await artifacts.read(ref) as { delivery?: { itemIds?: unknown } };
    if (!Array.isArray(usage.delivery?.itemIds)) continue;
    for (const itemId of usage.delivery.itemIds) {
      if (typeof itemId === "string" && itemId.startsWith("memory:")) {
        deliveredMemoryIds.add(itemId.slice("memory:".length));
      }
    }
  }
  return selectGroundedMemoryForTask({
    entries,
    paths: input.paths,
    goal: input.goal,
    deliveredMemoryIds: [...deliveredMemoryIds],
    ...(curation.report && curation.ref ? { curation: curation.report, curationRef: curation.ref } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
  });
}

export function createMemoryUsageLedger(input: {
  repoId: string;
  events: MemoryUsageEvent[];
  inputRefs?: ArtifactRef[];
}): MemoryUsageLedger {
  const ledger: MemoryUsageLedger = {
    header: createHeader(
      "MemoryUsageLedger",
      `memory-usage-ledger-${Date.now()}`,
      input.repoId,
      input.inputRefs ?? [],
    ),
    events: [...input.events],
  };
  validateMemoryUsageLedger(ledger);
  return ledger;
}

export function validateMemoryUsageLedger(ledger: MemoryUsageLedger): void {
  if (!ledger || typeof ledger !== "object") {
    throw new Error("MemoryUsageLedger must be an object.");
  }
  if (!Array.isArray(ledger.events)) {
    throw new Error("MemoryUsageLedger.events must be an array.");
  }

  for (const event of ledger.events) {
    if (!event || typeof event !== "object") {
      throw new Error("MemoryUsageEvent must be an object.");
    }
    if (typeof event.id !== "string" || event.id.length === 0) {
      throw new Error("MemoryUsageEvent.id is required.");
    }
    if (typeof event.memoryEntryId !== "string" || event.memoryEntryId.length === 0) {
      throw new Error("MemoryUsageEvent.memoryEntryId is required.");
    }
    if (typeof event.usedAt !== "string" || event.usedAt.length === 0) {
      throw new Error("MemoryUsageEvent.usedAt is required.");
    }
    if (!MEMORY_USAGE_OUTCOMES.includes(event.outcome)) {
      throw new Error(
        `MemoryUsageEvent.outcome must be one of ${MEMORY_USAGE_OUTCOMES.join(", ")}.`,
      );
    }
    if (
      MEMORY_USAGE_NOTE_REQUIRED.includes(event.outcome)
      && (typeof event.note !== "string" || event.note.trim().length === 0)
    ) {
      throw new Error(
        `MemoryUsageEvent.note is required when outcome is ${event.outcome}.`,
      );
    }
  }
}

export function createMemoryCurationReport(input: {
  repoId: string;
  entries: OperatorFeedbackEntry[];
  events: MemoryUsageEvent[];
  evaluation?: ContextOutcomeEvaluationReport;
  evaluationRef?: ArtifactRef;
  inputRefs?: ArtifactRef[];
}): MemoryCurationReport {
  const items = deriveMemoryCuration(input.entries, input.events, input.evaluation);
  const summary = {
    totalMemories: input.entries.length,
    totalUsageEvents: input.events.length,
    keep: items.filter((item) => item.recommendation === "keep").length,
    reinforce: items.filter((item) => item.recommendation === "reinforce").length,
    review: items.filter((item) => item.recommendation === "review").length,
    deprecate: items.filter((item) => item.recommendation === "deprecate").length,
    supersedeCandidate: items.filter(
      (item) => item.recommendation === "supersede-candidate",
    ).length,
  };

  return {
    header: createHeader(
      "MemoryCurationReport",
      `memory-curation-${Date.now()}`,
      input.repoId,
      input.inputRefs ?? [],
    ),
    policyVersion: MEMORY_CURATION_POLICY_VERSION,
    ...(input.evaluationRef ? { groundedEvaluationRef: input.evaluationRef } : {}),
    ...(input.evaluation ? { groundedSummary: input.evaluation.summary } : {}),
    summary,
    items,
  };
}

export function deriveMemoryCuration(
  entries: OperatorFeedbackEntry[],
  events: MemoryUsageEvent[],
  evaluation?: ContextOutcomeEvaluationReport,
): MemoryCurationItem[] {
  const byEntry = new Map<string, MemoryUsageEvent[]>();
  for (const event of events) {
    const list = byEntry.get(event.memoryEntryId) ?? [];
    list.push(event);
    byEntry.set(event.memoryEntryId, list);
  }

  const items: MemoryCurationItem[] = [];
  const groundedByEntry = new Map(
    (evaluation?.items ?? [])
      .filter((item) => item.subject.kind === "memory-entry")
      .map((item) => [item.subject.id, item]),
  );
  for (const entry of entries) {
    const id = entry.header.artifactId;
    const entryEvents = byEntry.get(id) ?? [];
    const helpfulCount = entryEvents.filter((e) => e.outcome === "helpful").length;
    const ignoredCount = entryEvents.filter((e) => e.outcome === "ignored").length;
    const harmfulCount = entryEvents.filter((e) => e.outcome === "harmful").length;
    const staleCount = entryEvents.filter((e) => e.outcome === "stale").length;
    const unclearCount = entryEvents.filter((e) => e.outcome === "unclear").length;
    const grounded = groundedByEntry.get(id);
    const reasons: string[] = [];

    let recommendation: MemoryCurationRecommendation;
    if (grounded?.status === "refuted") {
      recommendation = "deprecate";
      reasons.push("grounded-counterevidence");
    } else if (grounded?.status === "corroborated") {
      recommendation = "reinforce";
      reasons.push("independent-grounded-corroboration");
    } else if (grounded?.status === "suggestive") {
      recommendation = "keep";
      reasons.push("single-grounded-support-group");
    } else if (grounded?.status === "associated") {
      recommendation = "review";
      reasons.push("outcome-associated-without-independent-grounding");
    } else if (helpfulCount >= 1 && harmfulCount === 0 && staleCount === 0) {
      recommendation = "keep";
      reasons.push(`legacy-helpful-self-report: ${helpfulCount}`);
      reasons.push("self-report-cannot-reinforce");
    } else {
      recommendation = "review";
      if (entryEvents.length === 0) {
        reasons.push("no-grounded-outcomes");
      } else {
        reasons.push(`legacy-self-report-only: helpful=${helpfulCount}, ignored=${ignoredCount}, harmful=${harmfulCount}, stale=${staleCount}, unclear=${unclearCount}`);
      }
    }

    const score = computeCurationScore({
      helpfulCount,
      ignoredCount,
      harmfulCount,
      staleCount,
      unclearCount,
      groundedStatus: grounded?.status,
    });

    items.push({
      memoryEntryId: id,
      instruction: entry.instruction,
      recommendation,
      helpfulCount,
      ignoredCount,
      harmfulCount,
      staleCount,
      unclearCount,
      score,
      reasons,
      ...(grounded ? {
        groundedStatus: grounded.status,
        supportingRootCount: grounded.supportingRootKeys.length,
        refutingRootCount: grounded.refutingRootKeys.length,
      } : {}),
      legacySignalCount: entryEvents.length,
    });
  }

  items.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.memoryEntryId.localeCompare(right.memoryEntryId);
  });

  return items;
}

function computeCurationScore(counts: {
  helpfulCount: number;
  ignoredCount: number;
  harmfulCount: number;
  staleCount: number;
  unclearCount: number;
  groundedStatus?: ContextOutcomeAssociationStatus;
}): number {
  const groundedWeight = counts.groundedStatus === "corroborated"
    ? 2
    : counts.groundedStatus === "suggestive"
      ? 1
      : counts.groundedStatus === "refuted"
        ? -2
        : 0;
  const raw = groundedWeight
    + counts.helpfulCount * 0.1
    - counts.ignoredCount * 0.025
    - counts.harmfulCount * 0.1
    - counts.staleCount * 0.05
    - counts.unclearCount * 0.01;
  return Number(raw.toFixed(3));
}

function parseUsageOutcome(value: unknown): MemoryUsageOutcome | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return MEMORY_USAGE_OUTCOMES.find((candidate) => candidate === value);
}

function parseUsageContext(
  contextInput: unknown,
  input: Record<string, unknown>,
): MemoryUsageContext | undefined {
  const context: MemoryUsageContext = {};
  if (contextInput && typeof contextInput === "object") {
    const record = contextInput as Record<string, unknown>;
    assignStringContextField(context, "path", record.path);
    assignStringContextField(context, "goal", record.goal);
    assignStringContextField(context, "resolverId", record.resolverId);
    assignStringContextField(context, "publicationId", record.publicationId);
    assignStringContextField(context, "workOrderId", record.workOrderId);
  }

  assignStringContextField(context, "path", input.path);
  assignStringContextField(context, "goal", input.goal);
  assignStringContextField(context, "resolverId", input.resolverId);
  assignStringContextField(context, "publicationId", input.publicationId);
  assignStringContextField(context, "workOrderId", input.workOrderId);

  return Object.keys(context).length > 0 ? context : undefined;
}

function assignStringContextField(
  context: MemoryUsageContext,
  key: keyof MemoryUsageContext,
  value: unknown,
): void {
  if (typeof value === "string" && value.length > 0 && context[key] === undefined) {
    context[key] = value;
  }
}

function parseEvidenceRefs(value: unknown): ArtifactRef[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((candidate): candidate is ArtifactRef => {
    return (
      candidate !== null
      && typeof candidate === "object"
      && typeof (candidate as ArtifactRef).type === "string"
      && typeof (candidate as ArtifactRef).id === "string"
    );
  });
}

type RankInput = {
  path: string;
  goal: string;
  system?: string;
  capability?: string;
  tags: string[];
};

type RankedCandidate =
  | {
    rejected: false;
    id: string;
    score: number;
    item: MemorySelectionItem;
    specificity: number;
    updatedAt: string;
    reasons: string[];
  }
  | {
    rejected: true;
    id: string;
    reasons: string[];
    score: number;
    specificity: number;
    updatedAt: string;
  };

function rankEntry(
  entry: OperatorFeedbackEntry,
  query: RankInput,
  curation?: MemoryCurationItem,
): RankedCandidate {
  const id = entry.header.artifactId;
  const status = entry.status ?? "active";
  const reasons: string[] = [];

  if (status === "deprecated" || status === "superseded") {
    return {
      rejected: true,
      id,
      reasons: [`${status}-rejected`],
      score: 0,
      specificity: 0,
      updatedAt: entry.updatedAt ?? entry.createdAt ?? entry.header.generatedAt,
    };
  }

  if (entry.verification?.status === "disputed") {
    return {
      rejected: true,
      id,
      reasons: ["disputed-rejected"],
      score: 0,
      specificity: 0,
      updatedAt: entry.updatedAt ?? entry.createdAt ?? entry.header.generatedAt,
    };
  }

  if (curation?.recommendation === "deprecate") {
    return {
      rejected: true,
      id,
      reasons: ["grounded-curation-deprecate"],
      score: 0,
      specificity: 0,
      updatedAt: entry.updatedAt ?? entry.createdAt ?? entry.header.generatedAt,
    };
  }

  let score = 0.1;

  // Scope match.
  const matchedPaths: string[] = [];
  const matchedSystems: string[] = [];
  const matchedCapabilities: string[] = [];
  const matchedTags: string[] = [];

  const paths = entry.scope.paths ?? [];
  const exactPath = paths.find((scopePath) => query.path === scopePath);

  if (exactPath) {
    score += 0.45;
    matchedPaths.push(exactPath);
    reasons.push(`path-exact-match: ${exactPath}`);
  } else {
    const prefixMatch = paths.find((scopePath) =>
      query.path.startsWith(`${scopePath}/`) || scopePath.startsWith(`${query.path}/`) || query.path === scopePath,
    );

    if (prefixMatch) {
      score += 0.35;
      matchedPaths.push(prefixMatch);
      reasons.push(`path-prefix-match: ${prefixMatch}`);
    }
  }

  if (query.system) {
    const systems = entry.scope.systems ?? [];

    if (systems.includes(query.system)) {
      score += 0.25;
      matchedSystems.push(query.system);
      reasons.push(`system-match: ${query.system}`);
    }
  }

  if (query.capability) {
    const capabilities = entry.scope.capabilities ?? [];

    if (capabilities.includes(query.capability)) {
      score += 0.2;
      matchedCapabilities.push(query.capability);
      reasons.push(`capability-match: ${query.capability}`);
    }
  }

  if (query.tags.length > 0) {
    const entryTags = entry.scope.tags ?? [];
    let tagBonus = 0;

    for (const tag of query.tags) {
      if (entryTags.includes(tag)) {
        tagBonus += 0.1;
        matchedTags.push(tag);
        reasons.push(`tag-match: ${tag}`);
      }
    }

    score += Math.min(tagBonus, 0.2);
  }

  if (matchedPaths.length === 0 && matchedSystems.length === 0 && matchedCapabilities.length === 0 && matchedTags.length === 0) {
    // No scoped match. Allow very small recall only when entry has no scope at all.
    const entryIsBroad = paths.length === 0
      && (entry.scope.systems ?? []).length === 0
      && (entry.scope.capabilities ?? []).length === 0
      && (entry.scope.tags ?? []).length === 0;

    if (entryIsBroad) {
      score += 0.05;
      reasons.push("no-scope-fallback");
    } else {
      // Entry has scope but none matched. Reject with reason.
      return {
        rejected: true,
        id,
        reasons: ["scope-mismatch"],
        score: 0,
        specificity: 0,
        updatedAt: entry.updatedAt ?? entry.createdAt ?? entry.header.generatedAt,
      };
    }
  }

  const scopedGoal = entry.scope.goal?.trim();
  if (scopedGoal) {
    const queryGoalTokens = memoryGoalTokens(query.goal);
    const scopedGoalTokens = memoryGoalTokens(scopedGoal);
    const overlap = [...scopedGoalTokens].filter((token) => queryGoalTokens.has(token)).length;
    if (overlap === 0) {
      return {
        rejected: true,
        id,
        reasons: ["goal-mismatch"],
        score: 0,
        specificity: 0,
        updatedAt: entry.updatedAt ?? entry.createdAt ?? entry.header.generatedAt,
      };
    }
    score += Math.min(0.2, overlap * 0.05);
    reasons.push(`goal-token-match: ${overlap}`);
  }

  // Verification.
  switch (entry.verification?.status) {
    case "verified":
      score += 0.2;
      reasons.push("verified");
      break;
    case "unverified":
      // no bonus
      break;
    case undefined:
      // no bonus
      break;
  }

  // Reliability.
  const reliability = typeof entry.reliability === "number" && Number.isFinite(entry.reliability)
    ? clamp01(entry.reliability)
    : 0.5;
  score += reliability * 0.15;

  if (reliability >= 0.75) {
    reasons.push(`reliability-${reliability.toFixed(2)}`);
  } else if (reliability <= 0.25) {
    reasons.push(`low-reliability-${reliability.toFixed(2)}`);
  }

  // Priority.
  const priority = entry.priority ?? "normal";

  if (priority === "high") {
    score += 0.1;
    reasons.push("high-priority");
  } else if (priority === "low") {
    score -= 0.05;
    reasons.push("low-priority");
  }

  if (curation?.recommendation === "reinforce") {
    score += 0.1;
    reasons.push("grounded-curation-reinforce");
  } else if (curation?.recommendation === "keep") {
    score += 0.05;
    reasons.push("grounded-curation-keep");
  } else if (curation?.recommendation === "review") {
    score -= 0.15;
    reasons.push("grounded-curation-review");
  } else if (curation?.recommendation === "supersede-candidate") {
    score -= 0.25;
    reasons.push("grounded-curation-supersede-candidate");
  }

  // Freshness.
  const timestamp = entry.updatedAt ?? entry.createdAt ?? entry.header.generatedAt;
  const ageDays = Math.max(0, daysBetween(timestamp, new Date().toISOString()));

  if (ageDays <= 30) {
    score += 0.1;
    reasons.push("fresh-within-30-days");
  } else if (ageDays <= 180) {
    score += 0.05;
    reasons.push("fresh-within-180-days");
  } else if (ageDays > 365) {
    score -= 0.1;
    reasons.push("stale-over-365-days");
  }

  // Specificity.
  const specificityCount = paths.length
    + (entry.scope.systems ?? []).length
    + (entry.scope.capabilities ?? []).length
    + (entry.scope.tags ?? []).length;
  const specificity = specificityCount;

  if (specificityCount === 1) {
    score += 0.1;
    reasons.push("scoped-specific");
  } else if (specificityCount === 0) {
    score -= 0.05;
    reasons.push("broad-scope-penalty");
  }

  const clampedScore = clamp01(score);
  const matchReasonForLegacy = pickPrimaryReason(reasons);
  const verifiedFieldStatus = entry.verification?.status;
  const item: MemorySelectionItem = {
    instruction: entry.instruction,
    scope: scopeToRecord(entry.scope),
    confidence: clamp01(entry.confidence * (clampedScore || 0.0001)),
    reason: matchReasonForLegacy,
    id,
    score: clampedScore,
    reasons,
    match: {
      paths: matchedPaths.length > 0 ? matchedPaths : undefined,
      systems: matchedSystems.length > 0 ? matchedSystems : undefined,
      capabilities: matchedCapabilities.length > 0 ? matchedCapabilities : undefined,
      tags: matchedTags.length > 0 ? matchedTags : undefined,
    },
    priority,
    verification: verifiedFieldStatus,
  };

  return {
    rejected: false,
    id,
    score: clampedScore,
    item,
    specificity,
    updatedAt: timestamp,
    reasons,
  };
}

function compareRanked(left: RankedCandidate, right: RankedCandidate): number {
  // Rejected entries sort after selected entries.
  if (left.rejected && !right.rejected) {
    return 1;
  }

  if (!left.rejected && right.rejected) {
    return -1;
  }

  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.specificity !== right.specificity) {
    return right.specificity - left.specificity;
  }

  const updatedCompare = right.updatedAt.localeCompare(left.updatedAt);

  if (updatedCompare !== 0) {
    return updatedCompare;
  }

  return left.id.localeCompare(right.id);
}

function pickPrimaryReason(reasons: string[]): string {
  for (const reason of reasons) {
    if (reason.startsWith("path-exact-match")) {
      return "path match";
    }
  }

  for (const reason of reasons) {
    if (reason.startsWith("path-prefix-match")) {
      return "scope prefix match";
    }
  }

  for (const reason of reasons) {
    if (reason.startsWith("system-match")) {
      return "system match";
    }
  }

  for (const reason of reasons) {
    if (reason.startsWith("capability-match")) {
      return "capability match";
    }
  }

  return reasons[0] ?? "selected from memory";
}

async function readFeedbackEntries(artifacts: {
  list(type?: string): Promise<ArtifactRef[]>;
  read(ref: ArtifactRef): Promise<unknown>;
}): Promise<OperatorFeedbackEntry[]> {
  const refs = await artifacts.list("OperatorFeedbackEntry");
  const entries = await Promise.all(refs.map((ref) => artifacts.read(ref) as Promise<OperatorFeedbackEntry>));

  return entries.filter((entry) => typeof entry.instruction === "string" && entry.scope !== undefined);
}

function createHeader(
  artifactType: string,
  artifactId: string,
  repoId: string,
  inputRefs: ArtifactRef[],
  paths?: string[],
  supersessionKey?: string,
): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    ...(supersessionKey ? { supersession: { key: supersessionKey } } : {}),
    subject: {
      repoId,
      paths,
    },
    producer: {
      id: "@rekon/capability-memory",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 1,
      notes: ["Memory enriches resolver output; it does not rewrite architecture facts."],
    },
  };
}

function parseRepo(value: unknown): { id: string } {
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string" && value.id.length > 0) {
    return { id: value.id };
  }

  return { id: "repo" };
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

function parseStringList(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }

  return [];
}

function parsePriority(value: unknown): OperatorMemoryPriority | undefined {
  if (value === "low" || value === "normal" || value === "high") {
    return value;
  }

  return undefined;
}

function parseReliability(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clamp01(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed)) {
      return clamp01(parsed);
    }
  }

  return undefined;
}

function parseStatus(value: unknown): OperatorMemoryStatus | undefined {
  if (value === "active" || value === "deprecated" || value === "superseded") {
    return value;
  }

  return undefined;
}

function parseVerificationInput(input: Record<string, unknown>): OperatorMemoryVerification | undefined {
  const status = parseVerificationStatus(input.verification ?? input.verified);

  if (!status) {
    return undefined;
  }

  const verification: OperatorMemoryVerification = { status };

  if (status === "verified") {
    verification.verifiedAt = new Date().toISOString();
  }

  if (input.verificationResultRef && typeof input.verificationResultRef === "object") {
    verification.verificationResultRef = input.verificationResultRef as ArtifactRef;
  }

  return verification;
}

function parseVerificationStatus(value: unknown): OperatorMemoryVerificationStatus | undefined {
  if (value === true) {
    return "verified";
  }

  if (value === "verified" || value === "unverified" || value === "disputed") {
    return value;
  }

  return undefined;
}

function parseLimit(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`memory ${field} is required.`);
  }

  return value;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function daysBetween(left: string, right: string): number {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);

  if (Number.isNaN(leftMs) || Number.isNaN(rightMs)) {
    return 0;
  }

  return Math.abs(rightMs - leftMs) / (1000 * 60 * 60 * 24);
}

function scopeToRecord(scope: OperatorMemoryScope): Record<string, unknown> {
  const record: Record<string, unknown> = { paths: scope.paths };

  if (scope.goal) {
    record.goal = scope.goal;
  }

  if (scope.systems) {
    record.systems = scope.systems;
  }

  if (scope.capabilities) {
    record.capabilities = scope.capabilities;
  }

  if (scope.layers) {
    record.layers = scope.layers;
  }

  if (scope.tags) {
    record.tags = scope.tags;
  }

  return record;
}

function memoryGoalTokens(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/u).filter((token) => token.length >= 3));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function dedupeArtifactRefs(refs: ArtifactRef[]): ArtifactRef[] {
  return [...new Map(refs.map((ref) => [artifactRefKey(ref), ref])).values()]
    .sort((left, right) => artifactRefKey(left).localeCompare(artifactRefKey(right)));
}

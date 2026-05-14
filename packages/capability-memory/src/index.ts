import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import { type ArtifactReader, type Learner, defineCapability } from "@rekon/sdk";

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

export const memoryLearner: Learner = {
  id: "@rekon/capability-memory.learner",
  produces: ["OperatorFeedbackEntry", "MemoryEvent", "MemorySelection"],
  async learn({ artifacts, input }) {
    const mode = typeof input?.mode === "string" ? input.mode : "select";
    const repo = parseRepo(input?.repo);

    if (mode === "add") {
      return runAdd(artifacts, repo, input ?? {});
    }

    if (mode === "select") {
      return runSelect(artifacts, repo, input ?? {});
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
    consumes: ["OperatorFeedbackEntry", "ResolverPacket"],
    produces: ["OperatorFeedbackEntry", "MemoryEvent", "MemorySelection"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "operator.feedback.changed",
        description: "Memory selections are invalid when feedback entries change.",
        inputs: ["OperatorFeedbackEntry"],
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
  const ranked = entries
    .map((entry) => rankEntry(entry, { path, goal, system, capability, tags }))
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

  const inputRefs = await artifacts.list("OperatorFeedbackEntry");
  const selection: MemorySelection = {
    header: createHeader("MemorySelection", `memory-selection-${Date.now()}`, repo.id, inputRefs, [path]),
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

function rankEntry(entry: OperatorFeedbackEntry, query: RankInput): RankedCandidate {
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
): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
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

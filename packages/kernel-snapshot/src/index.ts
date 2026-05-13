import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  assertArtifactHeader,
  assertArtifactRef,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";

export type SnapshotCategory =
  | "inputs"
  | "projections"
  | "evaluations"
  | "publications"
  | "actions";

export type SnapshotFreshness = "fresh" | "stale" | "partial" | "unknown";

export type IntelligenceSnapshot = {
  header: ArtifactHeader;
  repo: {
    id: string;
    root: string;
    branch?: string;
    commit?: string;
  };
  inputs: Record<string, ArtifactRef[]>;
  projections: Record<string, ArtifactRef[]>;
  evaluations: Record<string, ArtifactRef[]>;
  publications: Record<string, ArtifactRef[]>;
  actions: Record<string, ArtifactRef[]>;
  status: {
    freshness: SnapshotFreshness;
    warnings: string[];
    blockedReasons: string[];
  };
};

export type CreateIntelligenceSnapshotInput = {
  header: ArtifactHeader;
  repo: IntelligenceSnapshot["repo"];
  inputs?: Record<string, ArtifactRef[]>;
  projections?: Record<string, ArtifactRef[]>;
  evaluations?: Record<string, ArtifactRef[]>;
  publications?: Record<string, ArtifactRef[]>;
  actions?: Record<string, ArtifactRef[]>;
  status?: Partial<IntelligenceSnapshot["status"]>;
};

const SNAPSHOT_CATEGORIES: SnapshotCategory[] = [
  "inputs",
  "projections",
  "evaluations",
  "publications",
  "actions",
];
const SNAPSHOT_FRESHNESS = new Set<SnapshotFreshness>(["fresh", "stale", "partial", "unknown"]);

export function createIntelligenceSnapshot(
  input: CreateIntelligenceSnapshotInput,
): IntelligenceSnapshot {
  return assertIntelligenceSnapshot({
    header: input.header,
    repo: input.repo,
    inputs: normalizeRefGroups(input.inputs),
    projections: normalizeRefGroups(input.projections),
    evaluations: normalizeRefGroups(input.evaluations),
    publications: normalizeRefGroups(input.publications),
    actions: normalizeRefGroups(input.actions),
    status: {
      freshness: input.status?.freshness ?? "unknown",
      warnings: [...(input.status?.warnings ?? [])].sort(),
      blockedReasons: [...(input.status?.blockedReasons ?? [])].sort(),
    },
  });
}

export function refsForType(snapshot: IntelligenceSnapshot, type: string): ArtifactRef[] {
  return SNAPSHOT_CATEGORIES.flatMap((category) => snapshot[category][type] ?? []);
}

export function latestRefForType(
  snapshot: IntelligenceSnapshot,
  type: string,
): ArtifactRef | undefined {
  return refsForType(snapshot, type).at(-1);
}

export function validateIntelligenceSnapshot(value: unknown): ValidationResult<IntelligenceSnapshot> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const headerResult = validateArtifactHeader(value.header);

  if (!headerResult.ok) {
    issues.push(...prefixIssues(headerResult.issues, "$.header"));
  } else if (headerResult.value.artifactType !== "IntelligenceSnapshot") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be IntelligenceSnapshot.",
    });
  }

  if (!isRecord(value.repo)) {
    issues.push({ path: "$.repo", message: "Expected an object." });
  } else {
    pushRequiredStringIssue(issues, value.repo.id, "$.repo.id");
    pushRequiredStringIssue(issues, value.repo.root, "$.repo.root");

    if (value.repo.branch !== undefined && typeof value.repo.branch !== "string") {
      issues.push({ path: "$.repo.branch", message: "Expected a string when present." });
    }

    if (value.repo.commit !== undefined && typeof value.repo.commit !== "string") {
      issues.push({ path: "$.repo.commit", message: "Expected a string when present." });
    }
  }

  for (const category of SNAPSHOT_CATEGORIES) {
    validateRefGroups(value[category], `$.${category}`, issues);
  }

  if (!isRecord(value.status)) {
    issues.push({ path: "$.status", message: "Expected an object." });
  } else {
    if (!SNAPSHOT_FRESHNESS.has(value.status.freshness as SnapshotFreshness)) {
      issues.push({
        path: "$.status.freshness",
        message: "Expected one of fresh, stale, partial, or unknown.",
      });
    }

    if (!isStringArray(value.status.warnings)) {
      issues.push({ path: "$.status.warnings", message: "Expected an array of strings." });
    }

    if (!isStringArray(value.status.blockedReasons)) {
      issues.push({ path: "$.status.blockedReasons", message: "Expected an array of strings." });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: value as IntelligenceSnapshot,
    issues: [],
  };
}

export function assertIntelligenceSnapshot(value: unknown): IntelligenceSnapshot {
  const result = validateIntelligenceSnapshot(value);

  if (result.ok) {
    return result.value;
  }

  throw new TypeError(
    `IntelligenceSnapshot validation failed: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
  );
}

export const intelligenceSnapshotSchema: ArtifactSchema<IntelligenceSnapshot> = {
  validate: validateIntelligenceSnapshot,
  parse: assertIntelligenceSnapshot,
};

function normalizeRefGroups(groups: Record<string, ArtifactRef[]> = {}): Record<string, ArtifactRef[]> {
  return Object.entries(groups)
    .sort(([left], [right]) => left.localeCompare(right))
    .reduce<Record<string, ArtifactRef[]>>((normalized, [type, refs]) => {
      const byKey = new Map<string, ArtifactRef>();

      for (const ref of refs) {
        const validRef = assertArtifactRef(ref);
        byKey.set(`${validRef.type}:${validRef.id}:${validRef.path ?? ""}:${validRef.digest ?? ""}`, validRef);
      }

      normalized[type] = [...byKey.values()].sort(compareArtifactRefs);

      return normalized;
    }, {});
}

function compareArtifactRefs(left: ArtifactRef, right: ArtifactRef): number {
  return `${left.type}:${left.id}:${left.path ?? ""}`.localeCompare(`${right.type}:${right.id}:${right.path ?? ""}`);
}

function validateRefGroups(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  for (const [type, refs] of Object.entries(value)) {
    if (!Array.isArray(refs)) {
      issues.push({ path: `${path}.${type}`, message: "Expected an array of artifact refs." });
      continue;
    }

    refs.forEach((ref, index) => {
      const result = validateArtifactRef(ref);

      if (!result.ok) {
        issues.push(...prefixIssues(result.issues, `${path}.${type}[${index}]`));
      }
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function pushRequiredStringIssue(
  issues: ValidationIssue[],
  value: unknown,
  path: string,
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "Expected a non-empty string." });
  }
}

function prefixIssues(issues: ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.replace("$", prefix),
    message: issue.message,
  }));
}

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  type ArtifactHeader,
  type ArtifactRef,
  assertArtifactHeader,
  digestJson,
  toArtifactRef,
  validateArtifactHeader,
} from "@rekon/kernel-artifacts";
import {
  type EvidenceFact,
  type ProviderContext,
  createEvidenceGraph,
} from "@rekon/kernel-evidence";
import {
  type IntelligenceSnapshot,
  createIntelligenceSnapshot,
} from "@rekon/kernel-snapshot";
import {
  type CoherencyDelta,
  type CapabilityMapLike,
  type EffectiveFinding,
  type EvidenceGraphLike,
  type Finding,
  type FindingFilterHealthReport,
  type FindingFilterPolicyFingerprint,
  type FindingFilterPolicyRule,
  type FindingFilterPolicySuggestionReport,
  type FindingFilterReport,
  type FindingGraphFilterContext,
  type FindingLifecycleReport,
  type FindingReport,
  type FindingStatusLedger,
  type IssueAdjudicationGroup,
  type IssueAdjudicationReport,
  type IssueMergeDecision,
  type IssueMergeDecisionLedger,
  type IssueMergeDecisionReason,
  type IssueMergeDecisionStatus,
  type FindingResultFilterOptions,
  type ObservedRepoLike,
  type OwnershipMapLike,
  applyFindingFilters,
  createCoherencyDelta,
  createFindingFilterHealthReport,
  createFindingFilterPolicySuggestionReport,
  createFindingFilterReport,
  createFindingLifecycleReport,
  createIssueAdjudicationReport,
  createIssueMergeDecisionLedger,
  deriveFindingFilterPolicySuggestions,
  deriveFindingLifecycle,
  fingerprintFindingFilterPolicies,
} from "@rekon/kernel-findings";
import { type ObservedRepo, type OwnershipMap } from "@rekon/kernel-repo-model";
import {
  type CapabilityDefinition,
  type CapabilityPermission,
  type CapabilityRegistrySnapshot,
  type Actuator,
  type Learner,
  type Publisher,
  type Resolver,
  createCapabilityRegistry,
} from "@rekon/sdk";

export type Logger = {
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
};

export type PermissionPolicy = {
  allowed(capabilityId: string, permission: CapabilityPermission): boolean;
};

export type RuntimeRepo = {
  id: string;
  root: string;
  branch?: string;
  commit?: string;
};

export type RuntimeContext = {
  repo: RuntimeRepo;
  artifacts: ArtifactStore;
  permissions: PermissionPolicy;
  logger: Logger;
};

export type ArtifactIndexEntry = ArtifactRef & {
  artifactType: string;
  artifactId: string;
  writtenAt: string;
};

export type ArtifactIndexValidationIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  artifactId?: string;
  artifactType?: string;
  path?: string;
};

export type ArtifactIndexValidationResult = {
  valid: boolean;
  issues: ArtifactIndexValidationIssue[];
};

export type ArtifactFreshnessStatus = "fresh" | "stale" | "partial" | "unknown";

export type ArtifactFreshnessIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  artifactType?: string;
  artifactId?: string;
  path?: string;
  inputType?: string;
  inputId?: string;
};

export type ArtifactFreshnessEntry = {
  type: string;
  id: string;
  status: ArtifactFreshnessStatus;
  issues: ArtifactFreshnessIssue[];
};

export type ArtifactFreshnessResult = {
  status: ArtifactFreshnessStatus;
  checkedAt: string;
  issues: ArtifactFreshnessIssue[];
  artifacts: ArtifactFreshnessEntry[];
};

export type ArtifactFreshnessOptions = {
  artifactType?: string;
  artifactId?: string;
};

export type ArtifactStore = {
  root: string;
  workspaceRoot: string;
  init(): Promise<void>;
  write(artifact: ArtifactWithHeader, options?: { category?: ArtifactCategory }): Promise<ArtifactRef>;
  read(ref: ArtifactRef): Promise<unknown>;
  readById(type: string, id: string): Promise<unknown>;
  list(type?: string): Promise<ArtifactIndexEntry[]>;
};

export type ArtifactWithHeader = {
  header: ArtifactHeader;
  [key: string]: unknown;
};

export type ArtifactCategory =
  | "evidence"
  | "snapshots"
  | "projections"
  | "graphs"
  | "findings"
  | "resolver-packets"
  | "publications"
  | "actions";

export type RuntimeOptions = {
  repoRoot: string;
  repoId?: string;
  capabilities?: CapabilityDefinition[];
  permissions?: Record<string, CapabilityPermission[]>;
  logger?: Logger;
};

export type ObserveOptions = {
  includeTests?: boolean;
  changedFiles?: string[];
  changedSince?: string | null;
  incremental?: boolean;
};

export type ResolveOptions = {
  resolverId?: string;
  input?: Record<string, unknown>;
};

export type ProjectOptions = {
  projectorId?: string;
  input?: Record<string, unknown>;
};

export type EvaluateOptions = {
  evaluatorId?: string;
  input?: Record<string, unknown>;
};

export type PublishOptions = {
  publisherId?: string;
  input?: Record<string, unknown>;
};

export type LearnOptions = {
  learnerId?: string;
  input?: Record<string, unknown>;
};

export type ActOptions = {
  actuatorId?: string;
  input?: Record<string, unknown>;
};

export type Runtime = RuntimeContext & {
  registry: CapabilityRegistrySnapshot;
  runObserve(options?: ObserveOptions): Promise<ArtifactRef>;
  runProject(options?: ProjectOptions): Promise<ArtifactRef[]>;
  runEvaluate(options?: EvaluateOptions): Promise<ArtifactRef[]>;
  runSnapshot(): Promise<ArtifactRef>;
  runResolve(options?: ResolveOptions): Promise<ArtifactRef[]>;
  runPublish(options?: PublishOptions): Promise<ArtifactRef[]>;
  runLearn(options?: LearnOptions): Promise<ArtifactRef[]>;
  runAct(options?: ActOptions): Promise<ArtifactRef[]>;
};

const ARTIFACT_CATEGORY_BY_TYPE: Record<string, ArtifactCategory> = {
  EvidenceGraph: "evidence",
  IntelligenceSnapshot: "snapshots",
  ObservedRepo: "projections",
  OwnershipMap: "projections",
  CapabilityMap: "projections",
  GraphSlice: "graphs",
  FindingReport: "findings",
  FindingFilterReport: "findings",
  FindingFilterHealthReport: "findings",
  FindingFilterPolicySuggestionReport: "findings",
  FindingStatusLedger: "findings",
  FindingLifecycleReport: "findings",
  CoherencyDelta: "findings",
  ResolverPacket: "resolver-packets",
  Publication: "publications",
  IssueAdjudicationReport: "findings",
  IssueMergeDecisionLedger: "findings",
  OperatorFeedbackEntry: "actions",
  MemoryEvent: "actions",
  ContextUsageEvent: "actions",
  OutcomeEvent: "actions",
  MemorySelection: "publications",
  MemoryUsageLedger: "actions",
  MemoryCurationReport: "publications",
  IntentMap: "actions",
  WorkOrder: "actions",
  VerificationPlan: "actions",
  VerificationResult: "actions",
  VerificationRun: "actions",
  PathFreshnessReport: "actions",
  ReconciliationPlan: "actions",
  ReconciliationLog: "actions",
  ActionLog: "actions",
  CapabilityNormalizationReport: "projections",
  CapabilityNormalizationReviewLedger: "actions",
};

const DEFAULT_ALLOWED_PERMISSIONS: CapabilityPermission[] = [
  "read:source",
  "read:artifacts",
  "write:artifacts",
];

export function createPermissionPolicy(
  configuredPermissions: Record<string, CapabilityPermission[]> = {},
): PermissionPolicy {
  return {
    allowed(capabilityId, permission) {
      const permissions = configuredPermissions[capabilityId] ?? DEFAULT_ALLOWED_PERMISSIONS;

      return permissions.includes(permission);
    },
  };
}

export function createConsoleLogger(): Logger {
  return {
    info(message, metadata) {
      console.error(formatLogLine("info", message, metadata));
    },
    warn(message, metadata) {
      console.error(formatLogLine("warn", message, metadata));
    },
    error(message, metadata) {
      console.error(formatLogLine("error", message, metadata));
    },
  };
}

export async function createRuntime(options: RuntimeOptions): Promise<Runtime> {
  const artifacts = createLocalArtifactStore(options.repoRoot);
  await artifacts.init();

  const permissions = createPermissionPolicy(options.permissions);
  const registry = createCapabilityRegistry();

  for (const capability of options.capabilities ?? []) {
    enforceCapabilityPermissions(capability.manifest.id, capability.manifest.permissions ?? [], permissions);
    registry.use(capability);
  }

  const repo: RuntimeRepo = {
    id: options.repoId ?? basenameSafe(options.repoRoot),
    root: options.repoRoot,
  };

  const context: RuntimeContext = {
    repo,
    artifacts,
    permissions,
    logger: options.logger ?? createConsoleLogger(),
  };

  return {
    ...context,
    registry: registry.snapshot(),
    async runObserve(observeOptions = {}) {
      return runObserve(context, registry.snapshot(), observeOptions);
    },
    async runProject(projectOptions = {}) {
      return runProject(context, registry.snapshot(), projectOptions);
    },
    async runEvaluate(evaluateOptions = {}) {
      return runEvaluate(context, registry.snapshot(), evaluateOptions);
    },
    async runSnapshot() {
      return runSnapshot(context);
    },
    async runResolve(resolveOptions = {}) {
      return runResolve(context, registry.snapshot(), resolveOptions);
    },
    async runPublish(publishOptions = {}) {
      return runPublish(context, registry.snapshot(), publishOptions);
    },
    async runLearn(learnOptions = {}) {
      return runLearn(context, registry.snapshot(), learnOptions);
    },
    async runAct(actOptions = {}) {
      return runAct(context, registry.snapshot(), actOptions);
    },
  };
}

export function createLocalArtifactStore(repoRoot: string): ArtifactStore {
  const workspaceRoot = join(repoRoot, ".rekon");
  const indexPath = join(workspaceRoot, "registry", "artifacts.index.json");

  return {
    root: repoRoot,
    workspaceRoot,
    async init() {
      await Promise.all([
        mkdir(join(workspaceRoot, "artifacts", "evidence"), { recursive: true }),
        mkdir(join(workspaceRoot, "artifacts", "snapshots"), { recursive: true }),
        mkdir(join(workspaceRoot, "artifacts", "projections"), { recursive: true }),
        mkdir(join(workspaceRoot, "artifacts", "graphs"), { recursive: true }),
        mkdir(join(workspaceRoot, "artifacts", "findings"), { recursive: true }),
        mkdir(join(workspaceRoot, "artifacts", "resolver-packets"), { recursive: true }),
        mkdir(join(workspaceRoot, "artifacts", "publications"), { recursive: true }),
        mkdir(join(workspaceRoot, "artifacts", "actions"), { recursive: true }),
        mkdir(join(workspaceRoot, "registry"), { recursive: true }),
        mkdir(join(workspaceRoot, "cache"), { recursive: true }),
      ]);

      await ensureJsonFile(indexPath, []);
      await ensureJsonFile(join(workspaceRoot, "registry", "capabilities.index.json"), []);
      await ensureJsonFile(join(workspaceRoot, "config.json"), { capabilities: [], permissions: {} });
    },
    async write(artifact, options = {}) {
      const header = assertArtifactHeader(artifact.header);
      const category = options.category ?? categoryForArtifactType(header.artifactType);
      const fileName = `${safeSegment(header.artifactType)}-${safeSegment(header.artifactId)}.json`;
      const absolutePath = join(workspaceRoot, "artifacts", category, fileName);
      const relativePath = relative(repoRoot, absolutePath);
      const payload = normalizeArtifactForWrite({ ...artifact, header });
      const digest = digestJson(payload);
      const ref = toArtifactRef(header, {
        path: relativePath,
        digest,
      });

      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      await upsertArtifactIndex(indexPath, {
        ...ref,
        artifactType: ref.type,
        artifactId: ref.id,
        writtenAt: new Date().toISOString(),
      });

      return ref;
    },
    async read(ref) {
      if (!ref.path) {
        const entry = await findIndexEntry(indexPath, ref.type, ref.id);
        return readJson(join(repoRoot, entry.path ?? ""));
      }

      return readJson(join(repoRoot, ref.path));
    },
    async readById(type, id) {
      const entry = await findIndexEntry(indexPath, type, id);

      return readJson(join(repoRoot, entry.path ?? ""));
    },
    async list(type) {
      const index = await readArtifactIndex(indexPath);

      return type ? index.filter((entry) => entry.type === type) : index;
    },
  };
}

export async function validateArtifactIndex(
  store: ArtifactStore,
): Promise<ArtifactIndexValidationResult> {
  const indexPath = join(store.workspaceRoot, "registry", "artifacts.index.json");
  const issues: ArtifactIndexValidationIssue[] = [];
  let index: unknown;

  try {
    index = JSON.parse(await readFile(indexPath, "utf8")) as unknown;
  } catch (error) {
    issues.push({
      code: "index.missing_or_unreadable",
      severity: "error",
      message: `Artifact index could not be read: ${error instanceof Error ? error.message : String(error)}`,
      path: relative(store.root, indexPath),
    });

    return { valid: false, issues };
  }

  if (!Array.isArray(index)) {
    return {
      valid: false,
      issues: [{
        code: "index.invalid_shape",
        severity: "error",
        message: "Artifact index must be an array.",
        path: relative(store.root, indexPath),
      }],
    };
  }

  const seen = new Set<string>();

  for (const rawEntry of index) {
    if (!isRecord(rawEntry)) {
      issues.push({
        code: "index.entry.invalid_shape",
        severity: "error",
        message: "Artifact index entry must be an object.",
      });
      continue;
    }

    const entry = rawEntry as Partial<ArtifactIndexEntry>;
    const artifactType = stringValue(entry.type);
    const artifactId = stringValue(entry.id);
    const path = stringValue(entry.path);

    for (const field of ["type", "id", "schemaVersion", "path", "digest", "writtenAt"] as const) {
      if (!isNonEmptyString(entry[field])) {
        issues.push({
          code: `index.entry.missing_${field}`,
          severity: "error",
          message: `Artifact index entry is missing ${field}.`,
          artifactId,
          artifactType,
          path,
        });
      }
    }

    if (isNonEmptyString(entry.artifactType) && entry.artifactType !== entry.type) {
      issues.push({
        code: "index.entry.artifact_type_mismatch",
        severity: "error",
        message: "Index artifactType must match type.",
        artifactId,
        artifactType,
        path,
      });
    }

    if (isNonEmptyString(entry.artifactId) && entry.artifactId !== entry.id) {
      issues.push({
        code: "index.entry.artifact_id_mismatch",
        severity: "error",
        message: "Index artifactId must match id.",
        artifactId,
        artifactType,
        path,
      });
    }

    if (artifactType && artifactId) {
      const key = `${artifactType}:${artifactId}`;

      if (seen.has(key)) {
        issues.push({
          code: "index.entry.duplicate",
          severity: "error",
          message: `Duplicate artifact index entry for ${key}.`,
          artifactId,
          artifactType,
          path,
        });
      }

      seen.add(key);
    }

    if (!path) {
      continue;
    }

    if (isAbsolute(path)) {
      issues.push({
        code: "index.entry.absolute_path",
        severity: "error",
        message: "Artifact index paths must be relative to the repository root.",
        artifactId,
        artifactType,
        path,
      });
      continue;
    }

    if (pathHasSegment(path, ".codebase-intel")) {
      issues.push({
        code: "index.entry.private_path",
        severity: "error",
        message: "Artifact index entries must not point to .codebase-intel.",
        artifactId,
        artifactType,
        path,
      });
    }

    if (!path.startsWith(".rekon/artifacts/")) {
      issues.push({
        code: "index.entry.outside_artifacts",
        severity: "error",
        message: "Artifact index entries must point under .rekon/artifacts/.",
        artifactId,
        artifactType,
        path,
      });
    }

    const absolutePath = resolve(store.root, path);

    if (!isPathInside(absolutePath, store.root)) {
      issues.push({
        code: "index.entry.outside_repo",
        severity: "error",
        message: "Artifact index entry points outside the repository root.",
        artifactId,
        artifactType,
        path,
      });
      continue;
    }

    let artifact: unknown;

    try {
      artifact = JSON.parse(await readFile(absolutePath, "utf8")) as unknown;
    } catch (error) {
      issues.push({
        code: "index.entry.artifact_unreadable",
        severity: "error",
        message: `Indexed artifact could not be read: ${error instanceof Error ? error.message : String(error)}`,
        artifactId,
        artifactType,
        path,
      });
      continue;
    }

    const artifactRecord = isRecord(artifact) ? artifact : undefined;
    const headerResult = validateArtifactHeader(artifactRecord?.header);

    if (!headerResult.ok) {
      issues.push(...headerResult.issues.map((issue) => ({
        code: "artifact.header.invalid",
        severity: "error" as const,
        message: `Artifact header validation failed at ${issue.path}: ${issue.message}`,
        artifactId,
        artifactType,
        path,
      })));
      continue;
    }

    const header = headerResult.value;

    if (header.artifactType !== entry.type) {
      issues.push({
        code: "artifact.header.type_mismatch",
        severity: "error",
        message: "Artifact header artifactType must match index type.",
        artifactId,
        artifactType,
        path,
      });
    }

    if (header.artifactId !== entry.id) {
      issues.push({
        code: "artifact.header.id_mismatch",
        severity: "error",
        message: "Artifact header artifactId must match index id.",
        artifactId,
        artifactType,
        path,
      });
    }

    if (header.schemaVersion !== entry.schemaVersion) {
      issues.push({
        code: "artifact.header.schema_version_mismatch",
        severity: "error",
        message: "Artifact header schemaVersion must match index schemaVersion.",
        artifactId,
        artifactType,
        path,
      });
    }

    if (isNonEmptyString(entry.digest) && digestJson(artifact) !== entry.digest) {
      issues.push({
        code: "artifact.digest_mismatch",
        severity: "error",
        message: "Artifact digest does not match indexed digest.",
        artifactId,
        artifactType,
        path,
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

const CANONICAL_INPUT_TYPES = new Set([
  "EvidenceGraph",
  "Rulebook",
  "OperatorFeedbackEntry",
  "FindingStatusLedger",
  "IssueMergeDecisionLedger",
]);

export async function validateArtifactFreshness(
  store: ArtifactStore,
  options: ArtifactFreshnessOptions = {},
): Promise<ArtifactFreshnessResult> {
  const checkedAt = new Date().toISOString();
  const indexEntries = await store.list();
  const latestByTypeMap = new Map<string, ArtifactIndexEntry>();

  for (const entry of indexEntries) {
    const current = latestByTypeMap.get(entry.type);

    if (!current || current.writtenAt.localeCompare(entry.writtenAt) < 0) {
      latestByTypeMap.set(entry.type, entry);
    }
  }

  const filtered = indexEntries.filter((entry) => {
    if (options.artifactType && entry.type !== options.artifactType) {
      return false;
    }

    if (options.artifactId && entry.id !== options.artifactId) {
      return false;
    }

    return true;
  });

  const artifacts: ArtifactFreshnessEntry[] = [];
  const aggregateIssues: ArtifactFreshnessIssue[] = [];

  for (const entry of filtered) {
    const entryIssues: ArtifactFreshnessIssue[] = [];
    let artifact: ArtifactWithHeader;

    try {
      artifact = (await store.read(entry)) as ArtifactWithHeader;
    } catch (error) {
      entryIssues.push({
        code: "artifact.unreadable",
        severity: "error",
        message: `Artifact could not be read: ${error instanceof Error ? error.message : String(error)}`,
        artifactType: entry.type,
        artifactId: entry.id,
        path: entry.path,
      });
      const status: ArtifactFreshnessStatus = "unknown";
      artifacts.push({ type: entry.type, id: entry.id, status, issues: entryIssues });
      aggregateIssues.push(...entryIssues);
      continue;
    }

    const inputRefs = Array.isArray(artifact.header?.inputRefs) ? artifact.header.inputRefs : [];

    if (inputRefs.length === 0 && !CANONICAL_INPUT_TYPES.has(entry.type)) {
      entryIssues.push({
        code: "lineage.unknown",
        severity: "warning",
        message: `Artifact ${entry.type}:${entry.id} declares no inputRefs; lineage cannot be verified.`,
        artifactType: entry.type,
        artifactId: entry.id,
        path: entry.path,
      });
    }

    for (const ref of inputRefs) {
      const matchedInput = indexEntries.find(
        (candidate) => candidate.type === ref.type && candidate.id === ref.id,
      );

      if (!matchedInput) {
        entryIssues.push({
          code: "input.missing",
          severity: "warning",
          message: `Artifact ${entry.type}:${entry.id} references missing input ${ref.type}:${ref.id}.`,
          artifactType: entry.type,
          artifactId: entry.id,
          path: entry.path,
          inputType: ref.type,
          inputId: ref.id,
        });
        continue;
      }

      const newest = latestByTypeMap.get(ref.type);

      if (newest && newest.id !== ref.id && newest.writtenAt.localeCompare(matchedInput.writtenAt) > 0) {
        entryIssues.push({
          code: "newer-input-exists",
          severity: "warning",
          message: `${entry.type}:${entry.id} references ${ref.type}:${ref.id}, but newer ${ref.type}:${newest.id} exists.`,
          artifactType: entry.type,
          artifactId: entry.id,
          path: entry.path,
          inputType: ref.type,
          inputId: ref.id,
        });
      }
    }

    const status = freshnessStatusForIssues(entryIssues);
    artifacts.push({ type: entry.type, id: entry.id, status, issues: entryIssues });
    aggregateIssues.push(...entryIssues);
  }

  const aggregateStatus = aggregateFreshnessStatus(artifacts);

  return {
    status: aggregateStatus,
    checkedAt,
    issues: aggregateIssues,
    artifacts,
  };
}

function freshnessStatusForIssues(issues: ArtifactFreshnessIssue[]): ArtifactFreshnessStatus {
  if (issues.some((issue) => issue.code === "artifact.unreadable")) {
    return "unknown";
  }

  if (issues.some((issue) => issue.code === "input.missing")) {
    return "partial";
  }

  if (issues.some((issue) => issue.code === "newer-input-exists")) {
    return "stale";
  }

  if (issues.some((issue) => issue.code === "lineage.unknown")) {
    return "unknown";
  }

  return "fresh";
}

export type BuildFindingFilterReportOptions = {
  findingReportId?: string;
  /**
   * Configured exclusion policies (typically loaded from
   * `.rekon/config.json` `findingFilters`). When supplied,
   * policy rules run **before** built-in deterministic filters
   * and filtered entries record `source: "policy"` with
   * `policyId` so the audit trail names the rule that matched.
   */
  policies?: FindingFilterPolicyRule[];
  /**
   * Operator-configured result filters (typically loaded from
   * `.rekon/config.json` `findingResultFilters`). Result filters
   * run **after** policy + classic content + built-in path
   * filters; result-filtered findings are recorded with
   * `source: "system"` and a result-filter reason so they
   * remain auditable. Optional — when omitted, no result
   * filters apply.
   */
  resultFilters?: FindingResultFilterOptions;
  /**
   * When `true` (default), the runtime reads the latest
   * `ObservedRepo` / `OwnershipMap` / `CapabilityMap` /
   * `EvidenceGraph` / `GraphSlice` artifacts from the store
   * and threads them into `applyFindingFilters` as a graph
   * filter context. The graph-aware filter stage runs between
   * the classic content filters and the built-in path
   * heuristics. When `false`, no graph artifacts are read and
   * the pipeline behaves exactly like before this slice.
   * Either way, `FindingFilterReport.header.inputRefs` only
   * cites graph artifacts that were actually consulted.
   */
  useGraphContext?: boolean;
};

export async function buildFindingFilterReport(
  store: ArtifactStore,
  options: BuildFindingFilterReportOptions = {},
): Promise<FindingFilterReport> {
  const reportEntries = await store.list("FindingReport");
  if (reportEntries.length === 0) {
    throw new Error(
      "buildFindingFilterReport requires at least one FindingReport. Run `rekon evaluate` or `rekon refresh` first.",
    );
  }
  const sortedReports = [...reportEntries].sort((left, right) =>
    left.writtenAt.localeCompare(right.writtenAt),
  );

  let latestEntry = sortedReports.at(-1);
  if (options.findingReportId) {
    latestEntry = sortedReports.find((entry) => entry.id === options.findingReportId);
    if (!latestEntry) {
      throw new Error(`FindingReport not found: ${options.findingReportId}`);
    }
  }
  if (!latestEntry) {
    throw new Error("buildFindingFilterReport could not resolve a FindingReport entry.");
  }

  // Apply filters across every FindingReport entry the filter run cares
  // about. The "latest" entry is typically enough, but we cite it in
  // inputRefs and pull its findings union to be deterministic.
  const latestReport = (await store.read(latestEntry)) as FindingReport;
  const findings: Finding[] = Array.isArray(latestReport.findings)
    ? latestReport.findings
    : [];

  // Graph-aware filter context (P1.1
  // graph-aware-finding-filter-provider v1). Load whichever
  // artifacts are available; the kernel pipeline treats any
  // missing input as a conservative no-op for the affected
  // checks. Track which graph artifacts we actually read so
  // `FindingFilterReport.header.inputRefs` cites only the
  // ones that contributed.
  const useGraphContext = options.useGraphContext !== false;
  const graphInputRefs: ArtifactRef[] = [];
  const graphContext: FindingGraphFilterContext = {};
  if (useGraphContext) {
    const observedRepoEntry = await readLatestRefForType(store, "ObservedRepo");
    if (observedRepoEntry) {
      graphContext.observedRepo = (await store.read(observedRepoEntry)) as ObservedRepoLike;
      graphInputRefs.push(indexEntryToRef(observedRepoEntry));
    }
    const ownershipEntry = await readLatestRefForType(store, "OwnershipMap");
    if (ownershipEntry) {
      graphContext.ownershipMap = (await store.read(ownershipEntry)) as OwnershipMapLike;
      graphInputRefs.push(indexEntryToRef(ownershipEntry));
    }
    const capabilityEntry = await readLatestRefForType(store, "CapabilityMap");
    if (capabilityEntry) {
      graphContext.capabilityMap = (await store.read(capabilityEntry)) as CapabilityMapLike;
      graphInputRefs.push(indexEntryToRef(capabilityEntry));
    }
    const evidenceEntry = await readLatestRefForType(store, "EvidenceGraph");
    if (evidenceEntry) {
      graphContext.evidenceGraph = (await store.read(evidenceEntry)) as EvidenceGraphLike;
      graphInputRefs.push(indexEntryToRef(evidenceEntry));
    }
  }

  const filteredAt = new Date().toISOString();
  const { keptFindings, filteredFindings, policyUsage, graphArtifactsUsed } = applyFindingFilters({
    findings,
    filteredAt,
    policies: options.policies,
    resultFilters: options.resultFilters,
    graphContext: useGraphContext ? graphContext : undefined,
  });

  // Always stamp the run with a policy fingerprint — including
  // the empty-policy fingerprint when no rules were supplied.
  // Downstream surfaces distinguish that from "no fingerprint
  // recorded" (`status: "unknown"`, signaling an older filter
  // report). See `fingerprintFindingFilterPolicies` /
  // `computeFilterPolicyStaleness`.
  const policyFingerprint = fingerprintFindingFilterPolicies(options.policies ?? []);

  // Cite only the graph artifacts that contributed structural
  // evidence to at least one matched decision (graph-aware
  // filter provider v2 precise tracking). The kernel returns
  // `graphArtifactsUsed` per-run; we filter our loaded
  // graph-input refs by that set so an artifact we read but
  // never matched against does not inflate the audit trail.
  const usedSet = new Set<string>(useGraphContext ? graphArtifactsUsed : []);
  const inputRefs = [
    indexEntryToRef(latestEntry),
    ...graphInputRefs.filter((ref) => usedSet.has(ref.type)),
  ];

  const filterReport = createFindingFilterReport({
    header: {
      artifactType: "FindingFilterReport",
      artifactId: `finding-filter-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: subjectRepoId(store) },
      producer: { id: "@rekon/runtime.findings", version: "0.1.0" },
      inputRefs,
      freshness: { status: "fresh" },
    },
    keptFindings,
    filteredFindings,
    policyUsage,
    policyFingerprint,
  });

  return filterReport;
}

async function readLatestRefForType(
  store: ArtifactStore,
  artifactType: string,
): Promise<ArtifactIndexEntry | undefined> {
  const entries = await store.list(artifactType);
  if (entries.length === 0) return undefined;
  const sorted = [...entries].sort((left, right) =>
    left.writtenAt.localeCompare(right.writtenAt),
  );
  return sorted.at(-1);
}

export type BuildFindingFilterHealthReportOptions = {
  filterReportId?: string;
  /**
   * Filter rate above which a high-filter-rate alert fires. Defaults to 0.8.
   */
  highFilterRateThreshold?: number;
  /**
   * When true (default), build the latest FindingFilterReport if none is
   * indexed. When false, throw a clear error instead.
   */
  buildIfMissing?: boolean;
  /**
   * Configured exclusion policies. Used to detect
   * `unused-policy-filter` alerts (policy ids supplied here that
   * matched zero findings in the latest filter report). If the
   * `buildIfMissing` path runs, these are also forwarded to
   * `buildFindingFilterReport`.
   */
  policies?: FindingFilterPolicyRule[];
  /**
   * Operator-configured result filters
   * (`findingResultFilters`). Only consulted when the
   * `buildIfMissing` path runs; the cached filter report on
   * disk reflects the result filters it was built with.
   */
  resultFilters?: FindingResultFilterOptions;
  /**
   * Optional fingerprint of the current
   * `.rekon/config.json findingFilters`. Forwarded to
   * `createFindingFilterHealthReport` so the report emits
   * `stale-policy-fingerprint` /
   * `policy-fingerprint-missing` alerts when the current
   * policy set has drifted from the report's. Diagnostic-only
   * — does not change filtering behavior.
   */
  currentPolicyFingerprint?: FindingFilterPolicyFingerprint;
};

export async function buildFindingFilterHealthReport(
  store: ArtifactStore,
  options: BuildFindingFilterHealthReportOptions = {},
): Promise<FindingFilterHealthReport> {
  const entries = await store.list("FindingFilterReport");
  const sorted = [...entries].sort((left, right) =>
    left.writtenAt.localeCompare(right.writtenAt),
  );
  let latestEntry = sorted.at(-1);

  if (options.filterReportId) {
    latestEntry = sorted.find((entry) => entry.id === options.filterReportId);
    if (!latestEntry) {
      throw new Error(`FindingFilterReport not found: ${options.filterReportId}`);
    }
  }

  let filterReport: FindingFilterReport;
  if (latestEntry) {
    filterReport = (await store.read(latestEntry)) as FindingFilterReport;
  } else if (options.buildIfMissing === false) {
    throw new Error(
      "buildFindingFilterHealthReport requires a FindingFilterReport. Run `rekon findings filter` or `rekon refresh` first.",
    );
  } else {
    filterReport = await buildFindingFilterReport(store, {
      policies: options.policies,
      resultFilters: options.resultFilters,
    });
    latestEntry = await store
      .write(filterReport, { category: "findings" })
      .then((ref) => ({
        ...ref,
        artifactType: "FindingFilterReport",
        artifactId: filterReport.header.artifactId,
        writtenAt: new Date().toISOString(),
      } as ArtifactIndexEntry));
  }

  const inputRefs: ArtifactRef[] = [];
  if (latestEntry) {
    inputRefs.push(indexEntryToRef(latestEntry));
  }
  for (const ref of filterReport.header.inputRefs ?? []) {
    if (!inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
      inputRefs.push(ref);
    }
  }

  return createFindingFilterHealthReport({
    header: {
      artifactType: "FindingFilterHealthReport",
      artifactId: `finding-filter-health-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: subjectRepoId(store) },
      producer: { id: "@rekon/runtime.findings", version: "0.1.0" },
      inputRefs,
      freshness: { status: "fresh" },
    },
    filterReport,
    highFilterRateThreshold: options.highFilterRateThreshold,
    policies: options.policies,
    currentPolicyFingerprint: options.currentPolicyFingerprint,
  });
}

export type BuildFindingFilterPolicySuggestionReportOptions = {
  /**
   * Pin to specific `FindingFilterReport` artifact ids. When
   * omitted, the helper uses the latest `recentLimit` reports
   * (default 5) by `writtenAt`.
   */
  filterReportIds?: string[];
  /**
   * How many recent filter reports to fold into the suggestion
   * derivation when no explicit ids are supplied. Defaults to 5.
   * Capped at the number of indexed reports.
   */
  recentLimit?: number;
  /**
   * Current `findingFilters` policies. Used for coverage checks
   * so the helper never proposes a duplicate of an existing
   * rule.
   */
  policies?: FindingFilterPolicyRule[];
};

export async function buildFindingFilterPolicySuggestionReport(
  store: ArtifactStore,
  options: BuildFindingFilterPolicySuggestionReportOptions = {},
): Promise<FindingFilterPolicySuggestionReport> {
  const entries = await store.list("FindingFilterReport");
  if (entries.length === 0) {
    throw new Error(
      "buildFindingFilterPolicySuggestionReport requires at least one FindingFilterReport. Run `rekon findings filter` or `rekon refresh` first.",
    );
  }
  const sorted = [...entries].sort((left, right) =>
    left.writtenAt.localeCompare(right.writtenAt),
  );

  let selected: typeof sorted;
  if (options.filterReportIds && options.filterReportIds.length > 0) {
    const wanted = new Set(options.filterReportIds);
    selected = sorted.filter((entry) => wanted.has(entry.id));
    if (selected.length === 0) {
      throw new Error(
        `buildFindingFilterPolicySuggestionReport: no FindingFilterReport matched the supplied ids (${[...wanted].join(", ")}).`,
      );
    }
  } else {
    const limit = Math.max(1, Math.min(options.recentLimit ?? 5, sorted.length));
    selected = sorted.slice(-limit);
  }

  const filterReports: FindingFilterReport[] = [];
  const filterReportRefs: ArtifactRef[] = [];
  for (const entry of selected) {
    filterReports.push((await store.read(entry)) as FindingFilterReport);
    filterReportRefs.push(indexEntryToRef(entry));
  }

  const suggestions = deriveFindingFilterPolicySuggestions({
    filterReports,
    filterReportRefs,
    policies: options.policies,
  });

  return createFindingFilterPolicySuggestionReport({
    header: {
      artifactType: "FindingFilterPolicySuggestionReport",
      artifactId: `finding-filter-policy-suggestions-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: subjectRepoId(store) },
      producer: { id: "@rekon/runtime.findings", version: "0.1.0" },
      inputRefs: filterReportRefs,
      freshness: { status: "fresh" },
    },
    suggestions,
  });
}

export type BuildFindingLifecycleOptions = {
  reportId?: string;
  ledgerId?: string;
};

export async function buildFindingLifecycleReport(
  store: ArtifactStore,
  options: BuildFindingLifecycleOptions = {},
): Promise<FindingLifecycleReport> {
  const reportEntries = await store.list("FindingReport");
  const sortedReports = [...reportEntries].sort((left, right) =>
    left.writtenAt.localeCompare(right.writtenAt),
  );

  let latestEntry = sortedReports.at(-1);

  if (options.reportId) {
    latestEntry = sortedReports.find((entry) => entry.id === options.reportId);

    if (!latestEntry) {
      throw new Error(`FindingReport not found: ${options.reportId}`);
    }
  }

  const previousEntries = latestEntry
    ? sortedReports.filter((entry) => entry.id !== latestEntry!.id)
    : [];

  const rawLatestReport = latestEntry
    ? ((await store.read(latestEntry)) as FindingReport)
    : emptyFindingReport(store);
  const previousReports = await Promise.all(
    previousEntries.map((entry) => store.read(entry) as Promise<FindingReport>),
  );

  // Filter-aware lifecycle (P1.1 filter-aware lifecycle slice). When a
  // FindingFilterReport cites the latest FindingReport in its inputRefs,
  // treat it as the source of truth for the active surface — the lifecycle
  // builds from FindingFilterReport.keptFindings instead of the raw
  // FindingReport.findings. Filtered findings remain auditable in the
  // upstream FindingFilterReport; they simply do not appear as active
  // lifecycle findings (and therefore do not become governed issue groups
  // or active CoherencyDelta items downstream). When the filter report is
  // missing or stale relative to the latest FindingReport, fall back to
  // the raw FindingReport with no filter inputRef cited — staleness
  // already surfaces via `rekon artifacts freshness`. See
  // docs/strategy/issue-governance-architecture-decision.md.
  const filterReportEntries = await store.list("FindingFilterReport");
  const sortedFilterEntries = [...filterReportEntries].sort((left, right) =>
    left.writtenAt.localeCompare(right.writtenAt),
  );
  const latestFilterEntry = sortedFilterEntries.at(-1);
  let usedFilterEntry: ArtifactIndexEntry | undefined;
  let usedFilterReport: FindingFilterReport | undefined;
  if (latestFilterEntry && latestEntry) {
    const candidate = (await store.read(latestFilterEntry)) as FindingFilterReport;
    const filterInputRefs = Array.isArray(candidate.header?.inputRefs)
      ? candidate.header.inputRefs
      : [];
    const citesLatestReport = filterInputRefs.some(
      (ref) => ref.type === "FindingReport" && ref.id === latestEntry!.id,
    );
    if (citesLatestReport) {
      usedFilterEntry = latestFilterEntry;
      usedFilterReport = candidate;
    }
  }

  const effectiveLatestReport: FindingReport = usedFilterReport
    ? syntheticFindingReportFromKept(rawLatestReport, usedFilterReport.keptFindings)
    : rawLatestReport;

  let ledger: FindingStatusLedger | undefined;
  const ledgerEntries = await store.list("FindingStatusLedger");
  const sortedLedgers = [...ledgerEntries].sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  );

  if (options.ledgerId) {
    const match = sortedLedgers.find((entry) => entry.id === options.ledgerId);

    if (!match) {
      throw new Error(`FindingStatusLedger not found: ${options.ledgerId}`);
    }

    ledger = (await store.read(match)) as FindingStatusLedger;
  } else if (sortedLedgers[0]) {
    ledger = (await store.read(sortedLedgers[0])) as FindingStatusLedger;
  }

  const { findings, resolvedFindings, decisions } = deriveFindingLifecycle({
    latestReport: effectiveLatestReport,
    previousReports,
    ledger,
  });

  const inputRefs: ArtifactRef[] = [];

  if (latestEntry) {
    inputRefs.push(indexEntryToRef(latestEntry));
  }

  if (usedFilterEntry) {
    // Cite the filter report so freshness flags lifecycle stale when a
    // newer filter (e.g. after a refresh) arrives. Also pull in the
    // filter report's own inputRefs so raw FindingReport lineage stays
    // transitively visible even when only the filter ref is followed.
    inputRefs.push(indexEntryToRef(usedFilterEntry));
    if (usedFilterReport) {
      for (const ref of usedFilterReport.header.inputRefs ?? []) {
        if (
          !inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)
        ) {
          inputRefs.push(ref);
        }
      }
    }
  }

  for (const entry of previousEntries) {
    inputRefs.push(indexEntryToRef(entry));
  }

  if (ledger && sortedLedgers[0]) {
    inputRefs.push(indexEntryToRef(sortedLedgers[0]));
  }

  const lifecycleReport = createFindingLifecycleReport({
    header: {
      artifactType: "FindingLifecycleReport",
      artifactId: `finding-lifecycle-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: subjectRepoId(store) },
      producer: { id: "@rekon/runtime.findings", version: "0.1.0" },
      inputRefs,
      freshness: { status: "fresh" },
    },
    findings,
    resolvedFindings,
    decisions,
  });

  return lifecycleReport;
}

/**
 * Build a synthetic FindingReport that reuses the raw report's header
 * (so lifecycle ids remain stable for previous-report comparison) but
 * swaps in the filter report's keptFindings as the active surface. The
 * raw FindingReport on disk is **not** mutated.
 */
function syntheticFindingReportFromKept(
  raw: FindingReport,
  kept: Finding[] | undefined,
): FindingReport {
  const findings = Array.isArray(kept) ? kept : [];
  return {
    header: raw.header,
    summary: {
      total: findings.length,
      bySeverity: countByKey(findings, (finding) => finding.severity),
      byType: countByKey(findings, (finding) => finding.type),
    },
    findings,
  };
}

function countByKey<T>(items: T[], pick: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = pick(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export type BuildCoherencyDeltaOptions = {
  lifecycleReportId?: string;
};

export async function buildCoherencyDelta(
  store: ArtifactStore,
  options: BuildCoherencyDeltaOptions = {},
): Promise<CoherencyDelta> {
  // Prefer the latest IssueAdjudicationReport when no explicit
  // lifecycleReportId is requested. This is the v2 group-mode path
  // that lets the delta summarize governed issue groups instead of
  // raw lifecycle findings. If no adjudication report exists, fall
  // through to the legacy lifecycle path below.
  if (!options.lifecycleReportId) {
    const adjudicationEntries = await store.list("IssueAdjudicationReport");
    const sortedAdjudication = [...adjudicationEntries].sort((left, right) =>
      right.writtenAt.localeCompare(left.writtenAt),
    );
    const latestAdjudication = sortedAdjudication[0];

    if (latestAdjudication) {
      const report = (await store.read(latestAdjudication)) as IssueAdjudicationReport;
      const inputRefs: ArtifactRef[] = [indexEntryToRef(latestAdjudication)];

      for (const ref of report.header.inputRefs ?? []) {
        if (!inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
          inputRefs.push(ref);
        }
      }

      // Pick up the latest IssueMergeDecisionLedger (if any) so accepted
      // operator decisions can roll up the corresponding issue groups in
      // the delta. Citing the ledger in inputRefs also makes freshness
      // mark the delta stale when a newer ledger lands.
      const ledgerEntries = await store.list("IssueMergeDecisionLedger");
      const sortedLedger = [...ledgerEntries].sort((left, right) =>
        right.writtenAt.localeCompare(left.writtenAt),
      );
      const latestLedgerEntry = sortedLedger[0];
      let mergeDecisions: IssueMergeDecision[] | undefined;
      if (latestLedgerEntry) {
        const ledger = (await store.read(latestLedgerEntry)) as IssueMergeDecisionLedger;
        if (ledger.decisions && ledger.decisions.length > 0) {
          mergeDecisions = ledger.decisions;
          const ledgerRef = indexEntryToRef(latestLedgerEntry);
          if (
            !inputRefs.some(
              (existing) => existing.type === ledgerRef.type && existing.id === ledgerRef.id,
            )
          ) {
            inputRefs.push(ledgerRef);
          }
        }
      }

      const ownershipMap = await readLatest<OwnershipMap>(store, "OwnershipMap", inputRefs);
      const observedRepo = await readLatest<ObservedRepo>(store, "ObservedRepo", inputRefs);

      const systemsForIssueGroup = (group: IssueAdjudicationGroup): string[] => {
        if (group.systems && group.systems.length > 0) {
          return group.systems;
        }
        const files = group.files ?? [];
        if (files.length === 0) {
          return [];
        }
        const systems = new Set<string>();
        for (const file of files) {
          const owner = resolveOwnerForPath(file, ownershipMap, observedRepo);
          if (owner) {
            systems.add(owner);
          }
        }
        return [...systems];
      };

      const repoId = report.header.subject?.repoId ?? subjectRepoId(store);

      return createCoherencyDelta({
        header: {
          artifactType: "CoherencyDelta",
          artifactId: `coherency-delta-${Date.now()}`,
          schemaVersion: "0.1.0",
          generatedAt: new Date().toISOString(),
          subject: { repoId },
          producer: { id: "@rekon/runtime.coherency", version: "0.1.0" },
          inputRefs,
          freshness: { status: "fresh" },
        },
        issueGroups: report.groups,
        mergeCandidates: report.mergeCandidates,
        mergeDecisions,
        systemsForIssueGroup,
      });
    }
  }

  // Legacy lifecycle path (used when no adjudication report exists,
  // or when the caller pins a specific lifecycle report id).
  const lifecycleEntries = await store.list("FindingLifecycleReport");
  const sortedLifecycle = [...lifecycleEntries].sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  );

  let lifecycle: FindingLifecycleReport;
  const inputRefs: ArtifactRef[] = [];

  if (options.lifecycleReportId) {
    const match = sortedLifecycle.find((entry) => entry.id === options.lifecycleReportId);

    if (!match) {
      throw new Error(`FindingLifecycleReport not found: ${options.lifecycleReportId}`);
    }

    lifecycle = (await store.read(match)) as FindingLifecycleReport;
    inputRefs.push(indexEntryToRef(match));
  } else if (sortedLifecycle[0]) {
    lifecycle = (await store.read(sortedLifecycle[0])) as FindingLifecycleReport;
    inputRefs.push(indexEntryToRef(sortedLifecycle[0]));
  } else {
    lifecycle = await buildFindingLifecycleReport(store);
  }

  for (const ref of lifecycle.header.inputRefs ?? []) {
    if (!inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
      inputRefs.push(ref);
    }
  }

  const ownershipMap = await readLatest<OwnershipMap>(store, "OwnershipMap", inputRefs);
  const observedRepo = await readLatest<ObservedRepo>(store, "ObservedRepo", inputRefs);

  const systemsForFinding = (finding: EffectiveFinding): string[] => {
    const files = finding.files ?? [];
    if (files.length === 0) {
      return [];
    }

    const systems = new Set<string>();

    for (const file of files) {
      const owner = resolveOwnerForPath(file, ownershipMap, observedRepo);
      if (owner) {
        systems.add(owner);
      }
    }

    return [...systems];
  };

  const repoId = lifecycle.header.subject?.repoId ?? subjectRepoId(store);

  return createCoherencyDelta({
    header: {
      artifactType: "CoherencyDelta",
      artifactId: `coherency-delta-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId },
      producer: { id: "@rekon/runtime.coherency", version: "0.1.0" },
      inputRefs,
      freshness: { status: "fresh" },
    },
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    systemsForFinding,
  });
}

export type BuildIssueAdjudicationOptions = {
  lifecycleReportId?: string;
};

export async function buildIssueAdjudicationReport(
  store: ArtifactStore,
  options: BuildIssueAdjudicationOptions = {},
): Promise<IssueAdjudicationReport> {
  const lifecycleEntries = await store.list("FindingLifecycleReport");
  const sortedLifecycle = [...lifecycleEntries].sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  );

  let lifecycle: FindingLifecycleReport;
  const inputRefs: ArtifactRef[] = [];

  if (options.lifecycleReportId) {
    const match = sortedLifecycle.find((entry) => entry.id === options.lifecycleReportId);

    if (!match) {
      throw new Error(`FindingLifecycleReport not found: ${options.lifecycleReportId}`);
    }

    lifecycle = (await store.read(match)) as FindingLifecycleReport;
    inputRefs.push(indexEntryToRef(match));
  } else if (sortedLifecycle[0]) {
    lifecycle = (await store.read(sortedLifecycle[0])) as FindingLifecycleReport;
    inputRefs.push(indexEntryToRef(sortedLifecycle[0]));
  } else {
    lifecycle = await buildFindingLifecycleReport(store);
  }

  for (const ref of lifecycle.header.inputRefs ?? []) {
    if (!inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
      inputRefs.push(ref);
    }
  }

  const ownershipMap = await readLatest<OwnershipMap>(store, "OwnershipMap", inputRefs);
  const observedRepo = await readLatest<ObservedRepo>(store, "ObservedRepo", inputRefs);

  const systemsForFinding = (finding: EffectiveFinding): string[] | undefined => {
    const files = finding.files ?? [];
    if (files.length === 0) {
      return undefined;
    }

    const systems = new Set<string>();
    for (const file of files) {
      const owner = resolveOwnerForPath(file, ownershipMap, observedRepo);
      if (owner) {
        systems.add(owner);
      }
    }

    return systems.size > 0 ? [...systems] : undefined;
  };

  const repoId = lifecycle.header.subject?.repoId ?? subjectRepoId(store);

  return createIssueAdjudicationReport({
    header: {
      artifactType: "IssueAdjudicationReport",
      artifactId: `issue-adjudication-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId },
      producer: { id: "@rekon/runtime.issues", version: "0.1.0" },
      inputRefs,
      freshness: { status: "fresh" },
    },
    findings: lifecycle.findings,
    resolvedFindings: lifecycle.resolvedFindings,
    systemsForFinding,
  });
}

export type RecordIssueMergeDecisionOptions = {
  candidateId: string;
  decision: IssueMergeDecisionStatus;
  note: string;
  reason?: IssueMergeDecisionReason;
  decidedBy?: string;
  evidence?: ArtifactRef[];
};

export async function recordIssueMergeDecision(
  store: ArtifactStore,
  options: RecordIssueMergeDecisionOptions,
): Promise<IssueMergeDecisionLedger> {
  if (!options.candidateId || options.candidateId.length === 0) {
    throw new Error("recordIssueMergeDecision requires options.candidateId.");
  }
  if (options.decision !== "accepted" && options.decision !== "rejected") {
    throw new Error("recordIssueMergeDecision decision must be 'accepted' or 'rejected'.");
  }
  if (typeof options.note !== "string" || options.note.trim().length === 0) {
    throw new Error("recordIssueMergeDecision requires a non-empty note.");
  }

  // Resolve the candidate from the latest adjudication report.
  const adjudicationEntries = await store.list("IssueAdjudicationReport");
  const sortedAdjudication = [...adjudicationEntries].sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  );
  const latestAdjudicationEntry = sortedAdjudication[0];
  if (!latestAdjudicationEntry) {
    throw new Error(
      "recordIssueMergeDecision requires an IssueAdjudicationReport. Run `rekon issues adjudicate` or `rekon refresh`.",
    );
  }
  const adjudication = (await store.read(latestAdjudicationEntry)) as IssueAdjudicationReport;
  const candidates = adjudication.mergeCandidates ?? [];
  const candidate = candidates.find((entry) => entry.id === options.candidateId);
  if (!candidate) {
    const available = candidates.map((entry) => entry.id);
    const detail = available.length === 0
      ? "no merge candidates exist in the latest IssueAdjudicationReport"
      : `available candidate ids: ${available.join(", ")}`;
    throw new Error(
      `Merge candidate not found: ${options.candidateId} (${detail}).`,
    );
  }

  // Load the latest ledger (if any) to preserve prior decisions.
  const ledgerEntries = await store.list("IssueMergeDecisionLedger");
  const sortedLedgers = [...ledgerEntries].sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  );
  const latestLedgerEntry = sortedLedgers[0];
  const priorLedger = latestLedgerEntry
    ? ((await store.read(latestLedgerEntry)) as IssueMergeDecisionLedger)
    : undefined;
  const priorDecisions = priorLedger?.decisions ?? [];

  const decidedAt = new Date().toISOString();
  const newDecision: IssueMergeDecision = {
    id: `merge-decision-${Date.now()}`,
    candidateId: options.candidateId,
    decision: options.decision,
    note: options.note.trim(),
    reason: options.reason,
    groupIds: [...candidate.groupIds],
    memberFindingIds: [...candidate.memberFindingIds],
    decidedAt,
    decidedBy: options.decidedBy,
    source: "operator",
    evidence: options.evidence ? options.evidence.map((ref) => ({ ...ref })) : undefined,
  };

  const decisions = [...priorDecisions, newDecision];

  const adjudicationRef = indexEntryToRef(latestAdjudicationEntry);
  const inputRefs: ArtifactRef[] = [adjudicationRef];
  if (latestLedgerEntry) {
    inputRefs.push(indexEntryToRef(latestLedgerEntry));
  }
  if (options.evidence) {
    for (const ref of options.evidence) {
      if (!inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
        inputRefs.push(ref);
      }
    }
  }

  const ledger = createIssueMergeDecisionLedger({
    header: {
      artifactType: "IssueMergeDecisionLedger",
      artifactId: `issue-merge-decision-ledger-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: decidedAt,
      subject: { repoId: subjectRepoId(store) },
      producer: { id: "@rekon/runtime.issues", version: "0.1.0" },
      inputRefs,
      freshness: { status: "fresh" },
    },
    decisions,
  });

  await store.write(ledger);

  return ledger;
}

async function readLatest<T>(
  store: ArtifactStore,
  type: string,
  inputRefs: ArtifactRef[],
): Promise<T | undefined> {
  const entries = await store.list(type);
  const sorted = [...entries].sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  );
  const latest = sorted[0];

  if (!latest) {
    return undefined;
  }

  const ref = indexEntryToRef(latest);

  if (!inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
    inputRefs.push(ref);
  }

  return (await store.read(latest)) as T;
}

function resolveOwnerForPath(
  path: string,
  ownershipMap: OwnershipMap | undefined,
  observedRepo: ObservedRepo | undefined,
): string | undefined {
  if (ownershipMap) {
    const match = ownershipMap.entries
      .filter((entry) => pathMatches(path, entry.path))
      .sort((left, right) => {
        const lengthDiff = right.path.length - left.path.length;
        if (lengthDiff !== 0) return lengthDiff;
        return right.confidence - left.confidence;
      })[0];

    if (match) {
      return match.ownerSystem;
    }
  }

  if (observedRepo) {
    const match = observedRepo.systems
      .flatMap((system) => system.paths.map((systemPath) => ({ system, systemPath })))
      .filter((entry) => pathMatches(path, entry.systemPath))
      .sort((left, right) => {
        const lengthDiff = right.systemPath.length - left.systemPath.length;
        if (lengthDiff !== 0) return lengthDiff;
        return right.system.confidence - left.system.confidence;
      })[0];

    if (match) {
      return match.system.id;
    }
  }

  return undefined;
}

function pathMatches(candidate: string, target: string): boolean {
  return candidate === target || candidate.startsWith(`${target}/`);
}

function emptyFindingReport(store: ArtifactStore): FindingReport {
  return {
    header: {
      artifactType: "FindingReport",
      artifactId: "empty-finding-report",
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: subjectRepoId(store) },
      producer: { id: "@rekon/runtime.findings", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "unknown" },
    },
    summary: { total: 0, bySeverity: {}, byType: {} },
    findings: [],
  };
}

function subjectRepoId(store: ArtifactStore): string {
  return store.root.split(/[\\/]/).filter(Boolean).at(-1) ?? "repo";
}

function indexEntryToRef(entry: ArtifactIndexEntry): ArtifactRef {
  return {
    type: entry.type,
    id: entry.id,
    schemaVersion: entry.schemaVersion,
    path: entry.path,
  };
}

function aggregateFreshnessStatus(entries: ArtifactFreshnessEntry[]): ArtifactFreshnessStatus {
  if (entries.length === 0) {
    return "unknown";
  }

  if (entries.some((entry) => entry.status === "unknown")) {
    return "unknown";
  }

  if (entries.some((entry) => entry.status === "partial")) {
    return "partial";
  }

  if (entries.some((entry) => entry.status === "stale")) {
    return "stale";
  }

  return "fresh";
}

export async function runObserve(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  options: ObserveOptions = {},
): Promise<ArtifactRef> {
  const providerContext: ProviderContext = {
    repoRoot: context.repo.root,
    includeTests: options.includeTests ?? false,
    changedFiles: options.changedFiles,
    changedSince: options.changedSince,
    incremental: options.incremental,
  };
  const facts: EvidenceFact[] = [];
  const activeProviders = registry.evidenceProviders.filter((provider) => provider.supports(providerContext));

  for (const provider of activeProviders) {
    facts.push(...await provider.extract(providerContext));
  }

  const header = createRuntimeArtifactHeader({
    artifactType: "EvidenceGraph",
    artifactId: `evidence-${Date.now()}`,
    repo: context.repo,
    producerId: "@rekon/runtime.observe",
    inputRefs: [],
    paths: options.changedFiles,
  });
  const graph = createEvidenceGraph({
    header,
    facts,
  });

  return context.artifacts.write(graph, { category: "evidence" });
}

export async function runSnapshot(context: RuntimeContext): Promise<ArtifactRef> {
  const artifacts = await context.artifacts.list();
  const indexValidation = await validateArtifactIndex(context.artifacts);
  const status = createSnapshotStatus(artifacts, indexValidation);
  const latestEvidence = latestByType(artifacts, "EvidenceGraph");
  const inputRefs = latestEvidence ? [latestEvidence] : [];
  const snapshot: IntelligenceSnapshot = createIntelligenceSnapshot({
    header: createRuntimeArtifactHeader({
      artifactType: "IntelligenceSnapshot",
      artifactId: `snapshot-${Date.now()}`,
      repo: context.repo,
      producerId: "@rekon/runtime.snapshot",
      inputRefs,
    }),
    repo: context.repo,
    inputs: latestEvidence ? { EvidenceGraph: [latestEvidence] } : {},
    projections: groupLatestRefsByType(artifacts, ["ObservedRepo", "OwnershipMap", "CapabilityMap", "GraphSlice"]),
    evaluations: groupLatestRefsByType(artifacts, ["FindingReport"]),
    publications: groupLatestRefsByType(artifacts, ["Publication", "MemorySelection"]),
    actions: groupLatestRefsByType(artifacts, [
      "OperatorFeedbackEntry",
      "MemoryEvent",
      "ContextUsageEvent",
      "OutcomeEvent",
      "IntentMap",
      "WorkOrder",
      "VerificationPlan",
      "VerificationResult",
      "ReconciliationPlan",
      "ReconciliationLog",
      "ActionLog",
    ]),
    status,
  });

  return context.artifacts.write(snapshot, { category: "snapshots" });
}

export async function runPublish(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  options: PublishOptions = {},
): Promise<ArtifactRef[]> {
  const publishers = options.publisherId
    ? registry.publishers.filter((publisher) => publisher.id === options.publisherId)
    : registry.publishers;
  const writtenRefs: ArtifactRef[] = [];

  for (const publisher of publishers) {
    writtenRefs.push(...await runSinglePublisher(context, publisher, options.input ?? {}));
  }

  return writtenRefs;
}

export async function runLearn(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  options: LearnOptions = {},
): Promise<ArtifactRef[]> {
  const learners = options.learnerId
    ? registry.learners.filter((learner) => learner.id === options.learnerId)
    : registry.learners;
  const writtenRefs: ArtifactRef[] = [];

  for (const learner of learners) {
    writtenRefs.push(...await runSingleLearner(context, learner, options.input ?? {}));
  }

  return writtenRefs;
}

export async function runAct(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  options: ActOptions = {},
): Promise<ArtifactRef[]> {
  const actuators = options.actuatorId
    ? registry.actuators.filter((actuator) => actuator.id === options.actuatorId)
    : registry.actuators;
  const writtenRefs: ArtifactRef[] = [];

  for (const actuator of actuators) {
    writtenRefs.push(...await runSingleActuator(context, actuator, options.input ?? {}));
  }

  return writtenRefs;
}

export async function runEvaluate(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  options: EvaluateOptions = {},
): Promise<ArtifactRef[]> {
  const evaluators = options.evaluatorId
    ? registry.evaluators.filter((evaluator) => evaluator.id === options.evaluatorId)
    : registry.evaluators;
  const writtenRefs: ArtifactRef[] = [];

  for (const evaluator of evaluators) {
    writtenRefs.push(...await evaluator.evaluate({
      artifacts: {
        read: (ref: ArtifactRef) => context.artifacts.read(ref),
        list: (type?: string) => context.artifacts.list(type),
        write: (type: string, artifact: unknown) => context.artifacts.write(artifact as ArtifactWithHeader, {
          category: categoryForArtifactType(type),
        }),
      },
      input: {
        repo: context.repo,
        ...(options.input ?? {}),
      },
    }));
  }

  return writtenRefs;
}

export async function runProject(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  options: ProjectOptions = {},
): Promise<ArtifactRef[]> {
  const projectors = options.projectorId
    ? registry.projectors.filter((projector) => projector.id === options.projectorId)
    : registry.projectors;
  const writtenRefs: ArtifactRef[] = [];

  for (const projector of projectors) {
    writtenRefs.push(...await projector.project({
      artifacts: {
        read: (ref: ArtifactRef) => context.artifacts.read(ref),
        list: (type?: string) => context.artifacts.list(type),
        write: (type: string, artifact: unknown) => {
          const category = categoryForArtifactType(type);

          return context.artifacts.write(artifact as ArtifactWithHeader, { category });
        },
      },
      input: {
        repo: context.repo,
        ...(options.input ?? {}),
      },
    }));
  }

  return writtenRefs;
}

export async function runResolve(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  options: ResolveOptions = {},
): Promise<ArtifactRef[]> {
  const resolvers = options.resolverId
    ? registry.resolvers.filter((resolver) => resolver.id === options.resolverId)
    : registry.resolvers;
  const writtenRefs: ArtifactRef[] = [];

  for (const resolver of resolvers) {
    writtenRefs.push(...await runSingleResolver(context, resolver, options.input ?? {}));
  }

  return writtenRefs;
}

async function runSinglePublisher(
  context: RuntimeContext,
  publisher: Publisher,
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  return publisher.publish({
    artifacts: runtimeArtifactAccess(context),
    input: {
      repo: context.repo,
      ...input,
    },
  });
}

async function runSingleLearner(
  context: RuntimeContext,
  learner: Learner,
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  return learner.learn({
    artifacts: runtimeArtifactAccess(context),
    input: {
      repo: context.repo,
      ...input,
    },
  });
}

async function runSingleActuator(
  context: RuntimeContext,
  actuator: Actuator,
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  return actuator.act({
    artifacts: runtimeArtifactAccess(context),
    input: {
      repo: context.repo,
      ...input,
    },
  });
}

async function runSingleResolver(
  context: RuntimeContext,
  resolver: Resolver,
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  return resolver.resolve({
    artifacts: runtimeArtifactAccess(context),
    input: {
      repo: context.repo,
      ...input,
    },
  });
}

function runtimeArtifactAccess(context: RuntimeContext) {
  return {
    read: (ref: ArtifactRef) => context.artifacts.read(ref),
    list: (type?: string) => context.artifacts.list(type),
    write: (type: string, artifact: unknown) => {
      const category = categoryForArtifactType(type);

      return context.artifacts.write(artifact as ArtifactWithHeader, { category });
    },
  };
}

function createRuntimeArtifactHeader(input: {
  artifactType: string;
  artifactId: string;
  repo: RuntimeRepo;
  producerId: string;
  inputRefs: ArtifactRef[];
  paths?: string[];
}): ArtifactHeader {
  return {
    artifactType: input.artifactType,
    artifactId: input.artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: {
      repoId: input.repo.id,
      ref: input.repo.branch,
      commit: input.repo.commit,
      paths: input.paths,
    },
    producer: {
      id: input.producerId,
      version: "0.1.0",
    },
    inputRefs: input.inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 1,
    },
  };
}

function enforceCapabilityPermissions(
  capabilityId: string,
  permissions: CapabilityPermission[],
  policy: PermissionPolicy,
): void {
  for (const permission of permissions) {
    if (!policy.allowed(capabilityId, permission)) {
      throw new Error(`Capability ${capabilityId} requested denied permission ${permission}.`);
    }
  }
}

async function ensureJsonFile(path: string, value: unknown): Promise<void> {
  try {
    await readFile(path, "utf8");
  } catch {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function readArtifactIndex(path: string): Promise<ArtifactIndexEntry[]> {
  return JSON.parse(await readFile(path, "utf8")) as ArtifactIndexEntry[];
}

async function upsertArtifactIndex(path: string, entry: ArtifactIndexEntry): Promise<void> {
  const index = await readArtifactIndex(path);
  const existingIndex = index.findIndex((candidate) => candidate.type === entry.type && candidate.id === entry.id);

  if (existingIndex >= 0) {
    index[existingIndex] = entry;
  } else {
    index.push(entry);
  }

  index.sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
  await writeFile(path, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

async function findIndexEntry(path: string, type: string, id: string): Promise<ArtifactIndexEntry> {
  const entry = (await readArtifactIndex(path)).find((candidate) => candidate.type === type && candidate.id === id);

  if (!entry) {
    throw new Error(`Artifact ${type}:${id} is not indexed.`);
  }

  return entry;
}

function latestByType(entries: ArtifactIndexEntry[], type: string): ArtifactIndexEntry | undefined {
  return entries
    .filter((entry) => entry.type === type)
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
}

function groupRefsByType(entries: ArtifactIndexEntry[], types: string[]): Record<string, ArtifactRef[]> {
  return types.reduce<Record<string, ArtifactRef[]>>((grouped, type) => {
    const refs = entries.filter((entry) => entry.type === type);

    if (refs.length > 0) {
      grouped[type] = refs;
    }

    return grouped;
  }, {});
}

function groupLatestRefsByType(entries: ArtifactIndexEntry[], types: string[]): Record<string, ArtifactRef[]> {
  return types.reduce<Record<string, ArtifactRef[]>>((grouped, type) => {
    const latest = latestByType(entries, type);

    if (latest) {
      grouped[type] = [latest];
    }

    return grouped;
  }, {});
}

function createSnapshotStatus(
  artifacts: ArtifactIndexEntry[],
  validation: ArtifactIndexValidationResult,
): IntelligenceSnapshot["status"] {
  const warnings = validation.issues.map((issue) => `${issue.code}: ${issue.message}`);
  const types = new Set(artifacts.map((artifact) => artifact.type).filter(Boolean));

  if (!types.has("EvidenceGraph")) {
    warnings.push("No EvidenceGraph artifacts are indexed.");
  }

  for (const warning of missingExpectedProjectionWarnings(types)) {
    warnings.push(warning);
  }

  return {
    freshness: snapshotFreshness(types, warnings),
    warnings,
    blockedReasons: [],
  };
}

function missingExpectedProjectionWarnings(types: Set<string>): string[] {
  const projectionTypes = ["ObservedRepo", "OwnershipMap", "CapabilityMap", "GraphSlice"];
  const projectionStarted = projectionTypes.some((type) => types.has(type));

  if (!projectionStarted) {
    return [];
  }

  return projectionTypes
    .filter((type) => !types.has(type))
    .map((type) => `Missing expected projection artifact ${type} after projection started.`);
}

function snapshotFreshness(types: Set<string>, warnings: string[]): IntelligenceSnapshot["status"]["freshness"] {
  if (!types.has("EvidenceGraph")) {
    return "unknown";
  }

  if (warnings.length > 0) {
    return "partial";
  }

  return "fresh";
}

function categoryForArtifactType(artifactType: string): ArtifactCategory {
  return ARTIFACT_CATEGORY_BY_TYPE[artifactType] ?? "actions";
}

function normalizeArtifactForWrite(artifact: ArtifactWithHeader): ArtifactWithHeader {
  return JSON.parse(JSON.stringify(artifact)) as ArtifactWithHeader;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function pathHasSegment(path: string, segment: string): boolean {
  return path.split(/[\\/]/).includes(segment);
}

function isPathInside(path: string, root: string): boolean {
  const relativePath = relative(resolve(root), resolve(path));

  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function safeSegment(value: string): string {
  return value.replace(/[^a-z0-9._-]/gi, "-").replace(/-+/g, "-");
}

function basenameSafe(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? "repo";
}

function formatLogLine(
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
): string {
  return metadata
    ? `[rekon:${level}] ${message} ${JSON.stringify(metadata)}`
    : `[rekon:${level}] ${message}`;
}

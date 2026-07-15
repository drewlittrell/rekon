import { constants as fsConstants } from "node:fs";
import { lstat, mkdir, open, readFile, readdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  type ArtifactInvalidationBaseline,
  type ArtifactInvalidationInput,
  type ArtifactHeader,
  type ArtifactRef,
  assertArtifactHeader,
  digestJson,
  toArtifactRef,
  validateArtifactHeader,
} from "@rekon/kernel-artifacts";
import {
  type EvidenceFact,
  type EvidenceGraph,
  type ProviderContext,
  createEvidenceGraph,
  dedupeEvidenceFacts,
} from "@rekon/kernel-evidence";
import {
  type IntelligenceSnapshot,
  type SnapshotCategory,
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
  type CapabilityManifest,
  type CapabilityPermission,
  type CapabilityRegistrySnapshot,
  type RegisteredCapability,
  type Actuator,
  type Evaluator,
  type Learner,
  type Projector,
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
  supersessionKey?: string | null;
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
  producerId?: string;
  recordedVersion?: string;
  currentVersion?: string;
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

type CapabilityRegistryIndexEntry = {
  id: string;
  version: string;
  handlers: string[];
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

export type SnapshotOptions = {
  artifactRefs?: readonly ArtifactRef[];
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
  runSnapshot(options?: SnapshotOptions): Promise<ArtifactRef>;
  runResolve(options?: ResolveOptions): Promise<ArtifactRef[]>;
  runPublish(options?: PublishOptions): Promise<ArtifactRef[]>;
  runLearn(options?: LearnOptions): Promise<ArtifactRef[]>;
  runAct(options?: ActOptions): Promise<ArtifactRef[]>;
};

const ARTIFACT_CATEGORY_BY_TYPE: Record<string, ArtifactCategory> = {
  EvidenceGraph: "evidence",
  Rulebook: "evidence",
  IntelligenceSnapshot: "snapshots",
  ObservedRepo: "projections",
  OwnershipMap: "projections",
  CapabilityMap: "projections",
  GraphSlice: "graphs",
  FindingReport: "findings",
  AssessmentReport: "findings",
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
  CapabilityOntologySuggestionReport: "actions",
  CapabilityPhraseReport: "projections",
  CapabilityContract: "actions",
  CapabilityArchitectureLintReport: "findings",
  CapabilityLintFindingBridgeReport: "actions",
  BridgeFindingLifecycleIntegrationReport: "actions",
  StepCapabilityGraph: "graphs",
  HandoffContract: "actions",
  HandoffCoverageReport: "actions",
  RuntimeGraphObservationReport: "graphs",
  RuntimeGraphDriftReport: "actions",
  IntentAssessmentReport: "actions",
  PreparedIntentPlan: "actions",
  IntentStatusReport: "actions",
  IntentPlanActionabilityReport: "actions",
  SemanticFileUnderstandingReport: "actions",
  SemanticDebtJudgmentReport: "actions",
  SecurityScanReport: "actions",
  DependencyAuditReport: "actions",
  TestReport: "actions",
  LintReport: "actions",
  // TaskContextReport is the first product consumer of embedding retrieval
  // (Task-Shaped Context / Embedding Retrieval Decision, slice 165). It is
  // context, not proof — an "actions" report like the intent reports above.
  TaskContextReport: "actions",
  // No `knowledge` category exists; `graphs` is the established home for graph
  // artifacts (StepCapabilityGraph, RuntimeGraphObservationReport). The
  // CapabilityEvidenceGraph joins them. (`evidence` is reserved for the raw
  // EvidenceGraph fact bag.)
  CapabilityEvidenceGraph: "graphs",
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

  await writeCapabilityRegistryIndex(options.repoRoot, artifacts.workspaceRoot, registry.snapshot());

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
    async runSnapshot(snapshotOptions = {}) {
      return runSnapshot(context, snapshotOptions);
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
  let supersessionIndexBackfilled = false;

  return {
    root: repoRoot,
    workspaceRoot,
    async init() {
      await assertSafeWorkspaceRoot(repoRoot, workspaceRoot);
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

      await ensureJsonFile(repoRoot, indexPath, []);
      await ensureJsonFile(repoRoot, join(workspaceRoot, "registry", "capabilities.index.json"), []);
      await ensureGeneratedFileIfMissing(
        repoRoot,
        join(workspaceRoot, "config.json"),
        { capabilities: [], permissions: {} },
      );
      if (!supersessionIndexBackfilled) {
        await backfillArtifactIndexSupersessionKeys(repoRoot, indexPath);
        supersessionIndexBackfilled = true;
      }
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
      await writeGeneratedFileSafely(repoRoot, absolutePath, `${JSON.stringify(payload, null, 2)}\n`);
      await upsertArtifactIndex(repoRoot, indexPath, {
        ...ref,
        artifactType: ref.type,
        artifactId: ref.id,
        supersessionKey: header.supersession?.key ?? null,
        writtenAt: new Date().toISOString(),
      });

      return ref;
    },
    async read(ref) {
      return readValidatedArtifact(repoRoot, indexPath, ref);
    },
    async readById(type, id) {
      const entry = await findIndexEntry(repoRoot, indexPath, type, id);

      return readValidatedArtifact(repoRoot, indexPath, entry);
    },
    async list(type) {
      const index = await readArtifactIndex(repoRoot, indexPath);

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
    index = await readJsonFileSafely(store.root, indexPath);
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

    if (entry.supersessionKey !== undefined
      && entry.supersessionKey !== null
      && !isNonEmptyString(entry.supersessionKey)) {
      issues.push({
        code: "index.entry.invalid_supersession_key",
        severity: "error",
        message: "Index supersessionKey must be a non-empty string when present.",
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

    const legacyWorkspaceSegment = [".codebase", "intel"].join("-");

    if (pathHasSegment(path, legacyWorkspaceSegment)) {
      issues.push({
        code: "index.entry.private_path",
        severity: "error",
        message: "Artifact index entries must not point to private legacy workspace directories.",
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
    }

    let artifact: unknown;

    try {
      artifact = await readArtifactBodyForValidation(store.root, entry as ArtifactIndexEntry);
    } catch (error) {
      const accessError = toArtifactAccessError(error);
      issues.push({
        code: accessError.code,
        severity: "error",
        message: accessError.message,
        artifactId,
        artifactType,
        path: accessError.path ?? path,
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

    const headerSupersessionKey = header.supersession?.key;
    if (isNonEmptyString(entry.supersessionKey) && entry.supersessionKey !== headerSupersessionKey) {
      issues.push({
        code: "artifact.header.supersession_key_mismatch",
        severity: "error",
        message: "Artifact header supersession key must match index supersessionKey.",
        artifactId,
        artifactType,
        path,
      });
    } else if (entry.supersessionKey === null && headerSupersessionKey) {
      issues.push({
        code: "artifact.header.supersession_key_mismatch",
        severity: "error",
        message: "Artifact header declares a supersession key but the index marks the artifact type-wide.",
        artifactId,
        artifactType,
        path,
      });
    } else if (headerSupersessionKey && entry.supersessionKey === undefined) {
      issues.push({
        code: "index.entry.supersession_key_missing",
        severity: "warning",
        message: "Legacy index entry does not record the artifact header supersession key.",
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
  return validateArtifactFreshnessInternal(store, options);
}

async function validateArtifactFreshnessForRefs(
  store: ArtifactStore,
  refs: ArtifactRef[],
): Promise<ArtifactFreshnessResult> {
  return validateArtifactFreshnessInternal(
    store,
    {},
    new Set(refs.map((ref) => `${ref.type}:${ref.id}`)),
  );
}

async function validateArtifactFreshnessInternal(
  store: ArtifactStore,
  options: ArtifactFreshnessOptions,
  selectedKeys?: ReadonlySet<string>,
): Promise<ArtifactFreshnessResult> {
  const checkedAt = new Date().toISOString();
  const indexEntries = await store.list();
  const currentProducerVersions = await readCurrentProducerVersions(store);
  const latestByTypeMap = new Map<string, ArtifactIndexEntry>();
  const supersessionKeyCache = new Map<string, string | undefined>();

  for (const entry of indexEntries) {
    const current = latestByTypeMap.get(entry.type);

    if (!current || current.writtenAt.localeCompare(entry.writtenAt) < 0) {
      latestByTypeMap.set(entry.type, entry);
    }
  }

  const filtered = indexEntries.filter((entry) => {
    if (selectedKeys && !selectedKeys.has(`${entry.type}:${entry.id}`)) {
      return false;
    }

    if (options.artifactType && entry.type !== options.artifactType) {
      return false;
    }

    if (options.artifactId && entry.id !== options.artifactId) {
      return false;
    }

    return true;
  });

  const artifacts: ArtifactFreshnessEntry[] = [];
  const inputRefsByKey = new Map<string, ArtifactRef[]>();
  for (const entry of filtered) {
    const entryIssues: ArtifactFreshnessIssue[] = [];
    let artifact: ArtifactWithHeader;

    try {
      artifact = (await store.read(entry)) as ArtifactWithHeader;
    } catch (error) {
      try {
        artifact = (await readArtifactBodyForValidation(store.root, entry)) as ArtifactWithHeader;
        entryIssues.push({
          code: "artifact.integrity_unverified",
          severity: "warning",
          message: `Artifact failed strict integrity read and was parsed only for freshness diagnostics: ${error instanceof Error ? error.message : String(error)}`,
          artifactType: entry.type,
          artifactId: entry.id,
          path: entry.path,
        });
      } catch {
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
        continue;
      }
    }

    const inputRefs = Array.isArray(artifact.header?.inputRefs) ? artifact.header.inputRefs : [];
    inputRefsByKey.set(`${entry.type}:${entry.id}`, inputRefs);
    const invalidationInputs = artifact.header?.invalidation?.inputs ?? [];
    const invalidationProducers = dedupeProducerBaselines(
      artifact.header?.invalidation?.producers ?? [],
    );

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

    const newestReferencedIds = await newestReferencedIdsByFamily(
      store,
      inputRefs,
      indexEntries,
      supersessionKeyCache,
    );

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

      // An artifact may intentionally consume history (for example, lifecycle
      // compares several FindingReports). Only its newest cited generation of
      // a type participates in supersession; older cited generations are not
      // stale merely because the same artifact also cites a newer one.
      const family = await supersessionFamilyKey(store, matchedInput, supersessionKeyCache);
      if (newestReferencedIds.get(family) !== ref.id) {
        continue;
      }

      const newest = await newestCompatibleInput(
        store,
        ref,
        matchedInput,
        indexEntries,
        latestByTypeMap,
        supersessionKeyCache,
      );

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

    for (const input of invalidationInputs) {
      const issue = await validateTrackedInput(store.root, entry, input);
      if (issue) {
        entryIssues.push(issue);
      }
    }

    for (const producer of invalidationProducers) {
      const currentVersion = currentProducerVersions.get(producer.id);
      if (currentVersion && currentVersion !== producer.version) {
        entryIssues.push({
          code: "producer.version_changed",
          severity: "warning",
          message: `${entry.type}:${entry.id} was produced with ${producer.id}@${producer.version}, but ${currentVersion} is currently registered.`,
          artifactType: entry.type,
          artifactId: entry.id,
          path: entry.path,
          producerId: producer.id,
          recordedVersion: producer.version,
          currentVersion,
        });
      }
    }

    const status = freshnessStatusForIssues(entryIssues);
    artifacts.push({ type: entry.type, id: entry.id, status, issues: entryIssues });
  }

  await propagateInputFreshness(store, artifacts, indexEntries, inputRefsByKey, supersessionKeyCache);

  const aggregateStatus = aggregateFreshnessStatus(artifacts);
  const aggregateIssues = artifacts.flatMap((entry) => entry.issues);

  return {
    status: aggregateStatus,
    checkedAt,
    issues: aggregateIssues,
    artifacts,
  };
}

async function newestReferencedIdsByFamily(
  store: ArtifactStore,
  refs: ArtifactRef[],
  indexEntries: ArtifactIndexEntry[],
  supersessionKeyCache: Map<string, string | undefined>,
): Promise<Map<string, string>> {
  const newest = new Map<string, ArtifactIndexEntry>();
  for (const ref of refs) {
    const entry = indexEntries.find((candidate) => candidate.type === ref.type && candidate.id === ref.id);
    if (!entry) {
      continue;
    }
    const family = await supersessionFamilyKey(store, entry, supersessionKeyCache);
    const current = newest.get(family);
    if (!current || current.writtenAt.localeCompare(entry.writtenAt) < 0) {
      newest.set(family, entry);
    }
  }
  return new Map([...newest].map(([family, entry]) => [family, entry.id]));
}

async function newestCompatibleInput(
  store: ArtifactStore,
  ref: ArtifactRef,
  matchedInput: ArtifactIndexEntry,
  indexEntries: ArtifactIndexEntry[],
  latestByTypeMap: ReadonlyMap<string, ArtifactIndexEntry>,
  supersessionKeyCache: Map<string, string | undefined>,
): Promise<ArtifactIndexEntry | undefined> {
  const supersessionKey = await readSupersessionKey(store, matchedInput, supersessionKeyCache);
  if (!supersessionKey) {
    if (ref.type === "GraphSlice") return undefined;
    return latestByTypeMap.get(ref.type);
  }

  const compatible: ArtifactIndexEntry[] = [];
  for (const candidate of indexEntries.filter((entry) => entry.type === ref.type)) {
    const candidateKey = await readSupersessionKey(store, candidate, supersessionKeyCache);
    if (candidateKey === supersessionKey) compatible.push(candidate);
  }

  return compatible.sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
}

async function supersessionFamilyKey(
  store: ArtifactStore,
  entry: ArtifactIndexEntry,
  supersessionKeyCache: Map<string, string | undefined>,
): Promise<string> {
  const supersessionKey = await readSupersessionKey(store, entry, supersessionKeyCache);
  return supersessionKey ? `${entry.type}\u0000${supersessionKey}` : entry.type;
}

async function readSupersessionKey(
  store: ArtifactStore,
  entry: ArtifactIndexEntry,
  supersessionKeyCache: Map<string, string | undefined>,
): Promise<string | undefined> {
  const cacheKey = `${entry.type}:${entry.id}`;
  if (supersessionKeyCache.has(cacheKey)) return supersessionKeyCache.get(cacheKey);

  if (isNonEmptyString(entry.supersessionKey)) {
    supersessionKeyCache.set(cacheKey, entry.supersessionKey);
    return entry.supersessionKey;
  }
  if (entry.supersessionKey === null) {
    supersessionKeyCache.set(cacheKey, undefined);
    return undefined;
  }

  let supersessionKey: string | undefined;
  try {
    const artifact = await store.read(entry) as ArtifactWithHeader & { sliceType?: unknown };
    const declared = artifact.header?.supersession?.key;
    supersessionKey = isNonEmptyString(declared)
      ? declared
      : entry.type === "GraphSlice" && isNonEmptyString(artifact.sliceType)
        ? artifact.sliceType
        : undefined;
  } catch {
    // Integrity failures are reported on the artifact's own freshness row.
  }
  supersessionKeyCache.set(cacheKey, supersessionKey);
  return supersessionKey;
}

function freshnessStatusForIssues(issues: ArtifactFreshnessIssue[]): ArtifactFreshnessStatus {
  if (issues.some((issue) => issue.code === "artifact.unreadable" || issue.code === "input.unknown")) {
    return "unknown";
  }

  if (issues.some((issue) => issue.code === "input.missing" || issue.code === "input.partial")) {
    return "partial";
  }

  if (issues.some((issue) =>
    issue.code === "newer-input-exists"
    || issue.code === "source.changed"
    || issue.code === "source.missing"
    || issue.code === "config.changed"
    || issue.code === "config.missing"
    || issue.code === "producer.version_changed"
    || issue.code === "input.stale"
  )) {
    return "stale";
  }

  if (issues.some((issue) => issue.code === "lineage.unknown")) {
    return "unknown";
  }

  return "fresh";
}

async function propagateInputFreshness(
  store: ArtifactStore,
  artifacts: ArtifactFreshnessEntry[],
  indexEntries: ArtifactIndexEntry[],
  inputRefsByKey: ReadonlyMap<string, ArtifactRef[]>,
  supersessionKeyCache: Map<string, string | undefined>,
): Promise<void> {
  const freshnessByKey = new Map(artifacts.map((entry) => [`${entry.type}:${entry.id}`, entry]));
  const indexByKey = new Map(indexEntries.map((entry) => [`${entry.type}:${entry.id}`, entry]));

  for (let pass = 0; pass < artifacts.length; pass += 1) {
    let changed = false;
    for (const artifact of artifacts) {
      const indexEntry = indexByKey.get(`${artifact.type}:${artifact.id}`);
      if (!indexEntry) {
        continue;
      }
      // Inputs outside a filtered query are not present in freshnessByKey. A
      // filtered result therefore reports only direct checks, while an
      // index-wide check can propagate stale lineage across every generation.
      const inputRefs = inputRefsByKey.get(`${artifact.type}:${artifact.id}`) ?? [];
      const newestReferencedIds = await newestReferencedIdsByFamily(
        store,
        inputRefs,
        indexEntries,
        supersessionKeyCache,
      );
      for (const ref of inputRefs) {
        const indexEntryForRef = indexByKey.get(`${ref.type}:${ref.id}`);
        if (!indexEntryForRef) continue;
        const family = await supersessionFamilyKey(store, indexEntryForRef, supersessionKeyCache);
        if (newestReferencedIds.get(family) !== ref.id) {
          continue;
        }
        const input = freshnessByKey.get(`${ref.type}:${ref.id}`);
        if (!input || input.status === "fresh" || !shouldPropagateInputStatus(input)) {
          continue;
        }
        const code = `input.${input.status}`;
        if (!artifact.issues.some((issue) => issue.code === code && issue.inputType === ref.type && issue.inputId === ref.id)) {
          artifact.issues.push({
            code,
            severity: "warning",
            message: `${artifact.type}:${artifact.id} depends on ${input.status} input ${ref.type}:${ref.id}.`,
            artifactType: artifact.type,
            artifactId: artifact.id,
            path: indexEntry.path,
            inputType: ref.type,
            inputId: ref.id,
          });
          const nextStatus = freshnessStatusForIssues(artifact.issues);
          if (nextStatus !== artifact.status) {
            artifact.status = nextStatus;
            changed = true;
          }
        }
      }
    }
    if (!changed) {
      break;
    }
  }
}

function shouldPropagateInputStatus(input: ArtifactFreshnessEntry): boolean {
  if (input.status === "partial") {
    return input.issues.some((issue) => issue.code === "input.missing" || issue.code === "input.partial");
  }

  if (input.status === "unknown") {
    return input.issues.some((issue) => issue.code === "artifact.unreadable" || issue.code === "input.unknown");
  }

  return input.issues.some((issue) =>
    issue.code === "source.changed"
    || issue.code === "source.missing"
    || issue.code === "config.changed"
    || issue.code === "config.missing"
    || issue.code === "producer.version_changed"
    || issue.code === "input.stale"
  );
}

async function readCurrentProducerVersions(store: ArtifactStore): Promise<Map<string, string>> {
  const versions = new Map<string, string>([
    ["@rekon/runtime.observe", "0.1.0"],
    ["@rekon/runtime.snapshot", "0.1.0"],
    ["@rekon/runtime.findings", "0.1.0"],
    ["@rekon/runtime.coherency", "0.1.0"],
    ["@rekon/runtime.issues", "0.1.0"],
  ]);
  const indexPath = join(store.workspaceRoot, "registry", "capabilities.index.json");

  try {
    const raw = await readJsonFileSafely(store.root, indexPath);
    if (!Array.isArray(raw)) {
      return versions;
    }

    for (const entry of raw) {
      if (!isRecord(entry) || !isNonEmptyString(entry.id) || !isNonEmptyString(entry.version)) {
        continue;
      }
      versions.set(entry.id, entry.version);
      if (Array.isArray(entry.handlers)) {
        for (const handler of entry.handlers) {
          if (isNonEmptyString(handler)) {
            versions.set(handler, entry.version);
          }
        }
      }
    }
  } catch {
    // Repositories initialized before producer indexing remain readable. Their
    // producer freshness is unknown until a runtime command refreshes the index.
  }

  return versions;
}

function dedupeProducerBaselines(
  producers: Array<{ id: string; version: string }>,
): Array<{ id: string; version: string }> {
  const byId = new Map<string, { id: string; version: string }>();
  for (const producer of producers) {
    if (isNonEmptyString(producer.id) && isNonEmptyString(producer.version)) {
      byId.set(producer.id, producer);
    }
  }
  return [...byId.values()];
}

async function validateTrackedInput(
  repoRoot: string,
  entry: ArtifactIndexEntry,
  input: ArtifactInvalidationInput,
): Promise<ArtifactFreshnessIssue | undefined> {
  const codePrefix = input.kind === "config" ? "config" : "source";
  const absolutePath = resolve(repoRoot, input.path);

  if (!isPathInside(absolutePath, repoRoot)) {
    return {
      code: `${codePrefix}.missing`,
      severity: "warning",
      message: `Tracked ${input.kind} input ${input.path} is outside the repository root.`,
      artifactType: entry.type,
      artifactId: entry.id,
      path: input.path,
    };
  }

  try {
    const stats = await lstat(absolutePath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error("tracked input is not a regular file");
    }
    const [realRepoRoot, realInputPath] = await Promise.all([realpath(repoRoot), realpath(absolutePath)]);
    if (!isPathInside(realInputPath, realRepoRoot)) {
      throw new Error("tracked input resolves outside the repository root");
    }
    const currentDigest = digestJson(await readFile(realInputPath, "utf8"));
    if (currentDigest !== input.digest) {
      return {
        code: `${codePrefix}.changed`,
        severity: "warning",
        message: `Tracked ${input.kind} input ${input.path} changed after ${entry.type}:${entry.id} was written.`,
        artifactType: entry.type,
        artifactId: entry.id,
        path: input.path,
      };
    }
  } catch {
    return {
      code: `${codePrefix}.missing`,
      severity: "warning",
      message: `Tracked ${input.kind} input ${input.path} is missing or unreadable.`,
      artifactType: entry.type,
      artifactId: entry.id,
      path: input.path,
    };
  }

  return undefined;
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
    digest: entry.digest,
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
    // Repository intelligence includes tests by default. Providers must still
    // honor an explicit false so focused scans can omit test-only evidence.
    includeTests: options.includeTests ?? true,
    changedFiles: options.changedFiles,
    changedSince: options.changedSince,
    incremental: options.incremental,
  };
  const facts: EvidenceFact[] = [];
  const activeProviders = registry.evidenceProviders.filter((provider) => provider.supports(providerContext));

  for (const provider of activeProviders) {
    // Append one-by-one: spreading the whole provider result
    // (`facts.push(...extracted)`) overflows the call stack once a repo
    // emits more than ~10^5 facts (every spread element becomes a
    // stack-allocated argument).
    for (const fact of await provider.extract(providerContext)) {
      facts.push(fact);
    }
  }

  const previousEvidence = options.incremental
    ? await readLatestEvidenceGraph(context.artifacts)
    : undefined;
  const changedPaths = normalizeChangedPaths(context.repo.root, options.changedFiles ?? []);
  const mergedFacts = previousEvidence
    ? mergeIncrementalEvidenceFacts(previousEvidence.graph.facts, facts, changedPaths)
    : facts;
  const inputRefs = previousEvidence
    ? [previousEvidence.ref]
    : [];
  const invalidation = await createObserveInvalidationBaseline(
    context.repo.root,
    mergedFacts,
    registry,
    activeProviders.map((provider) => provider.id),
  );

  const header = createRuntimeArtifactHeader({
    artifactType: "EvidenceGraph",
    artifactId: `evidence-${Date.now()}`,
    repo: context.repo,
    producerId: "@rekon/runtime.observe",
    inputRefs,
    paths: options.changedFiles,
    invalidation,
    freshnessStatus: options.incremental && !previousEvidence ? "partial" : "fresh",
  });
  const graph = createEvidenceGraph({
    header,
    facts: mergedFacts,
  });

  return context.artifacts.write(graph, { category: "evidence" });
}

async function readLatestEvidenceGraph(
  store: ArtifactStore,
): Promise<{ graph: EvidenceGraph; ref: ArtifactRef } | undefined> {
  const entries = (await store.list("EvidenceGraph"))
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
  const latest = entries[0];
  if (!latest) {
    return undefined;
  }

  return {
    graph: (await store.read(latest)) as EvidenceGraph,
    ref: indexEntryToRef(latest),
  };
}

function mergeIncrementalEvidenceFacts(
  previousFacts: EvidenceFact[],
  observedFacts: EvidenceFact[],
  changedPaths: Set<string>,
): EvidenceFact[] {
  const retained = previousFacts.filter((fact) => {
    if (fact.kind === "typescript:diagnostic" || fact.provenance.file?.endsWith("package.json")) {
      return false;
    }

    const paths = factPaths(fact);
    return !paths.some((path) => changedPaths.has(path));
  });

  return dedupeEvidenceFacts([...retained, ...observedFacts]);
}

function factPaths(fact: EvidenceFact): string[] {
  const paths = new Set<string>();
  if (isNonEmptyString(fact.provenance.file)) {
    paths.add(normalizeRepoPath(fact.provenance.file));
  }
  if (isNonEmptyString(fact.value.path)) {
    paths.add(normalizeRepoPath(fact.value.path));
  }
  if (isNonEmptyString(fact.value.source)) {
    paths.add(normalizeRepoPath(fact.value.source));
  }
  if (isNonEmptyString(fact.subject)) {
    const subjectPath = fact.subject.split(":", 1)[0];
    if (subjectPath) {
      paths.add(normalizeRepoPath(subjectPath));
    }
  }
  return [...paths];
}

function normalizeChangedPaths(repoRoot: string, paths: string[]): Set<string> {
  const normalized = new Set<string>();
  for (const path of paths) {
    if (!isNonEmptyString(path)) {
      continue;
    }
    const absolutePath = resolve(repoRoot, path);
    if (!isPathInside(absolutePath, repoRoot)) {
      continue;
    }
    const relativePath = relative(repoRoot, absolutePath);
    if (relativePath && relativePath !== ".") {
      normalized.add(normalizeRepoPath(relativePath));
    }
  }
  return normalized;
}

function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

async function createObserveInvalidationBaseline(
  repoRoot: string,
  facts: EvidenceFact[],
  registry: CapabilityRegistrySnapshot,
  activeProviderIds: string[],
): Promise<ArtifactInvalidationBaseline> {
  const inputs = new Map<string, ArtifactInvalidationInput>();

  for (const fact of facts) {
    const kind = fact.kind === "file" ? "source" : fact.kind === "manifest" ? "config" : undefined;
    const path = isNonEmptyString(fact.value.path) ? normalizeRepoPath(fact.value.path) : undefined;
    const digest = isNonEmptyString(fact.value.digest) ? fact.value.digest : undefined;
    if (kind && path && digest) {
      inputs.set(`${kind}:${path}`, { kind, path, digest });
    }
  }

  for (const path of ["rekon.config.json", ".rekon/config.json", ".rekon/scan-scope.json", "tsconfig.json"]) {
    const absolutePath = resolve(repoRoot, path);
    try {
      const stats = await lstat(absolutePath);
      if (!stats.isFile() || stats.isSymbolicLink()) {
        continue;
      }
      const [realRepoRoot, realInputPath] = await Promise.all([realpath(repoRoot), realpath(absolutePath)]);
      if (!isPathInside(realInputPath, realRepoRoot)) {
        continue;
      }
      inputs.set(`config:${path}`, {
        kind: "config",
        path,
        digest: digestJson(await readFile(realInputPath, "utf8")),
      });
    } catch {
      // Optional configuration that does not exist is not a tracked input.
    }
  }

  const providerIds = new Set(activeProviderIds);
  const producers = registry.capabilities
    .filter((capability) => capability.evidenceProviders.some((provider) => providerIds.has(provider.id)))
    .flatMap((capability) => [
      { id: capability.manifest.id, version: capability.manifest.version },
      ...capability.evidenceProviders
        .filter((provider) => providerIds.has(provider.id))
        .map((provider) => ({ id: provider.id, version: capability.manifest.version })),
    ])
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    inputs: [...inputs.values()].sort((left, right) => `${left.kind}:${left.path}`.localeCompare(`${right.kind}:${right.path}`)),
    producers,
  };
}

export async function runSnapshot(
  context: RuntimeContext,
  options: SnapshotOptions = {},
): Promise<ArtifactRef> {
  const indexedArtifacts = await context.artifacts.list();
  const artifacts = selectSnapshotEntries(indexedArtifacts, options.artifactRefs);
  const indexValidation = await validateArtifactIndex(context.artifacts);
  const members = await groupCurrentSnapshotRefs(context.artifacts, artifacts);
  const inputRefs = snapshotLineageRefs(members);
  const freshnessValidation = await validateArtifactFreshnessForRefs(context.artifacts, inputRefs);
  const status = createSnapshotStatus(artifacts, indexValidation, freshnessValidation, inputRefs);
  const snapshot: IntelligenceSnapshot = createIntelligenceSnapshot({
    header: createRuntimeArtifactHeader({
      artifactType: "IntelligenceSnapshot",
      artifactId: `snapshot-${Date.now()}`,
      repo: context.repo,
      producerId: "@rekon/runtime.snapshot",
      inputRefs,
    }),
    repo: context.repo,
    ...members,
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
    writtenRefs.push(...await runSinglePublisher(context, registry, publisher, options.input ?? {}));
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
    writtenRefs.push(...await runSingleLearner(context, registry, learner, options.input ?? {}));
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
    writtenRefs.push(...await runSingleActuator(context, registry, actuator, options.input ?? {}));
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
    const manifest = capabilityForHandler(registry, "evaluator", evaluator.id);
    writtenRefs.push(...await evaluator.evaluate({
      artifacts: runtimeArtifactAccess(context, manifest),
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
    const manifest = capabilityForHandler(registry, "projector", projector.id);
    writtenRefs.push(...await projector.project({
      artifacts: runtimeArtifactAccess(context, manifest),
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
    writtenRefs.push(...await runSingleResolver(context, registry, resolver, options.input ?? {}));
  }

  return writtenRefs;
}

async function runSinglePublisher(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  publisher: Publisher,
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  const manifest = capabilityForHandler(registry, "publisher", publisher.id);

  return publisher.publish({
    artifacts: runtimeArtifactAccess(context, manifest),
    input: {
      repo: context.repo,
      ...input,
    },
  });
}

async function runSingleLearner(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  learner: Learner,
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  const manifest = capabilityForHandler(registry, "learner", learner.id);

  return learner.learn({
    artifacts: runtimeArtifactAccess(context, manifest),
    input: {
      repo: context.repo,
      ...input,
    },
  });
}

async function runSingleActuator(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  actuator: Actuator,
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  const manifest = capabilityForHandler(registry, "actuator", actuator.id);

  return actuator.act({
    artifacts: runtimeArtifactAccess(context, manifest),
    input: {
      repo: context.repo,
      ...input,
    },
  });
}

async function runSingleResolver(
  context: RuntimeContext,
  registry: CapabilityRegistrySnapshot,
  resolver: Resolver,
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  const manifest = capabilityForHandler(registry, "resolver", resolver.id);

  return resolver.resolve({
    artifacts: runtimeArtifactAccess(context, manifest),
    input: {
      repo: context.repo,
      ...input,
    },
  });
}

function runtimeArtifactAccess(context: RuntimeContext, manifest: CapabilityManifest) {
  return {
    read: (ref: ArtifactRef) => {
      ensureArtifactPermission(context, manifest, "read:artifacts");

      return context.artifacts.read(ref);
    },
    list: (type?: string) => {
      ensureArtifactPermission(context, manifest, "read:artifacts");

      return context.artifacts.list(type);
    },
    write: (type: string, artifact: unknown) => {
      ensureArtifactPermission(context, manifest, "write:artifacts");

      const category = categoryForArtifactType(type);

      return context.artifacts.write(artifact as ArtifactWithHeader, { category });
    },
  };
}

type ProducedRuntimeHandler = Projector | Evaluator | Resolver | Publisher | Actuator | Learner;
type ArtifactHandlerRole = "projector" | "evaluator" | "resolver" | "publisher" | "actuator" | "learner";

function capabilityForHandler(
  registry: CapabilityRegistrySnapshot,
  role: ArtifactHandlerRole,
  handlerId: string,
): CapabilityManifest {
  const handlersForRole = (capability: RegisteredCapability): ProducedRuntimeHandler[] => {
    switch (role) {
      case "projector":
        return capability.projectors;
      case "evaluator":
        return capability.evaluators;
      case "resolver":
        return capability.resolvers;
      case "publisher":
        return capability.publishers;
      case "actuator":
        return capability.actuators;
      case "learner":
        return capability.learners;
    }
  };

  for (const capability of registry.capabilities) {
    if (handlersForRole(capability).some((handler) => handler.id === handlerId)) {
      return capability.manifest;
    }
  }

  throw new Error(`Registered ${role} handler ${handlerId} has no owning capability.`);
}

function ensureArtifactPermission(
  context: RuntimeContext,
  manifest: CapabilityManifest,
  permission: "read:artifacts" | "write:artifacts",
): void {
  if (!manifest.permissions.includes(permission)) {
    throw new Error(`Capability ${manifest.id} did not declare required permission ${permission}.`);
  }

  if (!context.permissions.allowed(manifest.id, permission)) {
    throw new Error(`Capability ${manifest.id} is denied required permission ${permission}.`);
  }
}

function createRuntimeArtifactHeader(input: {
  artifactType: string;
  artifactId: string;
  repo: RuntimeRepo;
  producerId: string;
  inputRefs: ArtifactRef[];
  paths?: string[];
  invalidation?: ArtifactInvalidationBaseline;
  freshnessStatus?: ArtifactFreshnessStatus;
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
    invalidation: input.invalidation,
    freshness: {
      status: input.freshnessStatus ?? "fresh",
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

class ArtifactAccessError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly path?: string,
  ) {
    super(message);
    this.name = "ArtifactAccessError";
  }
}

async function writeCapabilityRegistryIndex(
  repoRoot: string,
  workspaceRoot: string,
  registry: CapabilityRegistrySnapshot,
): Promise<void> {
  const entries: CapabilityRegistryIndexEntry[] = registry.capabilities
    .map((capability) => ({
      id: capability.manifest.id,
      version: capability.manifest.version,
      handlers: [
        ...capability.evidenceProviders,
        ...capability.projectors,
        ...capability.evaluators,
        ...capability.resolvers,
        ...capability.publishers,
        ...capability.actuators,
        ...capability.learners,
        ...capability.runners,
      ].map((handler) => handler.id).sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  await writeGeneratedFileSafely(
    repoRoot,
    join(workspaceRoot, "registry", "capabilities.index.json"),
    `${JSON.stringify(entries, null, 2)}\n`,
  );
}

async function ensureJsonFile(repoRoot: string, path: string, value: unknown): Promise<void> {
  try {
    await readJsonFileSafely(repoRoot, path);
  } catch (error) {
    if (error instanceof ArtifactAccessError && error.code !== "generated_file.missing") {
      throw error;
    }

    await writeGeneratedFileSafely(repoRoot, path, `${JSON.stringify(value, null, 2)}\n`);
  }
}

async function ensureGeneratedFileIfMissing(
  repoRoot: string,
  path: string,
  value: unknown,
): Promise<void> {
  try {
    await assertSafeExistingGeneratedFile(repoRoot, path);
  } catch (error) {
    if (error instanceof ArtifactAccessError && error.code !== "generated_file.missing") {
      throw error;
    }

    await writeGeneratedFileSafely(repoRoot, path, `${JSON.stringify(value, null, 2)}\n`);
  }
}

async function readJsonFileSafely(repoRoot: string, path: string): Promise<unknown> {
  await assertSafeExistingGeneratedFile(repoRoot, path);

  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ArtifactAccessError("generated_file.invalid_json", error.message, relative(repoRoot, path));
    }

    throw error;
  }
}

async function writeGeneratedFileSafely(repoRoot: string, path: string, content: string): Promise<void> {
  assertLexicallyInside(path, repoRoot, "generated_file.outside_repo");
  await mkdir(dirname(path), { recursive: true });

  await assertSafeParentForGeneratedWrite(repoRoot, dirname(path));

  try {
    const stats = await lstat(path);

    if (stats.isSymbolicLink()) {
      throw new ArtifactAccessError(
        "generated_file.symlink",
        "Refusing to write generated Rekon output through a symlink.",
        relative(repoRoot, path),
      );
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  const handle = await open(
    path,
    fsConstants.O_CREAT | fsConstants.O_WRONLY | fsConstants.O_TRUNC | fsConstants.O_NOFOLLOW,
    0o666,
  );

  try {
    await handle.writeFile(content, "utf8");
  } finally {
    await handle.close();
  }
}

async function readArtifactIndex(repoRoot: string, path: string): Promise<ArtifactIndexEntry[]> {
  const index = await readJsonFileSafely(repoRoot, path);

  if (!Array.isArray(index)) {
    throw new ArtifactAccessError(
      "index.invalid_shape",
      "Artifact index must be an array.",
      relative(repoRoot, path),
    );
  }

  return index as ArtifactIndexEntry[];
}

async function upsertArtifactIndex(repoRoot: string, path: string, entry: ArtifactIndexEntry): Promise<void> {
  const index = await readArtifactIndex(repoRoot, path);
  const existingIndex = index.findIndex((candidate) => candidate.type === entry.type && candidate.id === entry.id);

  if (existingIndex >= 0) {
    index[existingIndex] = entry;
  } else {
    index.push(entry);
  }

  index.sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
  await writeGeneratedFileSafely(repoRoot, path, `${JSON.stringify(index, null, 2)}\n`);
}

async function findIndexEntry(
  repoRoot: string,
  path: string,
  type: string,
  id: string,
): Promise<ArtifactIndexEntry> {
  const entry = (await readArtifactIndex(repoRoot, path)).find((candidate) => candidate.type === type && candidate.id === id);

  if (!entry) {
    throw new Error(`Artifact ${type}:${id} is not indexed.`);
  }

  return entry;
}

async function maybeFindIndexEntry(
  repoRoot: string,
  path: string,
  type: string,
  id: string,
): Promise<ArtifactIndexEntry | undefined> {
  return (await readArtifactIndex(repoRoot, path)).find((candidate) => candidate.type === type && candidate.id === id);
}

async function readValidatedArtifact(
  repoRoot: string,
  indexPath: string,
  ref: ArtifactRef,
): Promise<unknown> {
  const indexed = await maybeFindIndexEntry(repoRoot, indexPath, ref.type, ref.id);
  const entry = indexed ?? refToIndexEntry(ref);

  if (ref.path && indexed?.path && ref.path !== indexed.path) {
    throw new ArtifactAccessError(
      "artifact.ref.index_path_mismatch",
      `Artifact ref path does not match indexed path for ${ref.type}:${ref.id}.`,
      ref.path,
    );
  }

  if (ref.digest && entry.digest && ref.digest !== entry.digest) {
    throw new ArtifactAccessError(
      "artifact.ref.digest_mismatch",
      `Artifact ref digest does not match indexed digest for ${ref.type}:${ref.id}.`,
      ref.path ?? entry.path,
    );
  }

  return (await readIndexedArtifactBody(repoRoot, {
    ...entry,
    digest: ref.digest ?? entry.digest,
  })).artifact;
}

function refToIndexEntry(ref: ArtifactRef): ArtifactIndexEntry {
  return {
    ...ref,
    artifactType: ref.type,
    artifactId: ref.id,
    writtenAt: "",
  };
}

async function readIndexedArtifactBody(
  repoRoot: string,
  entry: ArtifactIndexEntry,
): Promise<{ artifact: unknown; raw: string; digest: string; absolutePath: string }> {
  const absolutePath = await resolveArtifactReadPath(repoRoot, entry);
  const raw = await readFile(absolutePath, "utf8");
  const artifact = JSON.parse(raw) as unknown;
  const expectedDigest = entry.digest;

  if (!isNonEmptyString(expectedDigest)) {
    throw new ArtifactAccessError(
      "artifact.digest_missing",
      "Artifact index entry or ref must include a digest before the body can be read.",
      entry.path,
    );
  }

  const actualDigest = digestJson(artifact);

  if (actualDigest !== expectedDigest) {
    throw new ArtifactAccessError(
      "artifact.digest_mismatch",
      "Artifact digest does not match indexed digest.",
      entry.path,
    );
  }

  const artifactRecord = isRecord(artifact) ? artifact : undefined;
  const headerResult = validateArtifactHeader(artifactRecord?.header);

  if (!headerResult.ok) {
    throw new ArtifactAccessError(
      "artifact.header.invalid",
      `Artifact header validation failed at ${headerResult.issues[0]?.path ?? "header"}.`,
      entry.path,
    );
  }

  const header = headerResult.value;

  if (header.artifactType !== entry.type || header.artifactId !== entry.id || header.schemaVersion !== entry.schemaVersion) {
    throw new ArtifactAccessError(
      "artifact.header.index_mismatch",
      "Artifact header does not match the requested index entry.",
      entry.path,
    );
  }

  if (entry.supersessionKey !== undefined
    && entry.supersessionKey !== null
    && !isNonEmptyString(entry.supersessionKey)) {
    throw new ArtifactAccessError(
      "index.entry.invalid_supersession_key",
      "Artifact index supersessionKey must be a non-empty string or null.",
      entry.path,
    );
  }

  if ((isNonEmptyString(entry.supersessionKey) && entry.supersessionKey !== header.supersession?.key)
    || (entry.supersessionKey === null && header.supersession?.key !== undefined)) {
    throw new ArtifactAccessError(
      "artifact.header.supersession_key_mismatch",
      "Artifact header supersession key does not match the requested index entry.",
      entry.path,
    );
  }

  return { artifact, raw, digest: actualDigest, absolutePath };
}

async function readArtifactBodyForValidation(repoRoot: string, entry: ArtifactIndexEntry): Promise<unknown> {
  const absolutePath = await resolveArtifactReadPath(repoRoot, entry);

  return JSON.parse(await readFile(absolutePath, "utf8")) as unknown;
}

async function backfillArtifactIndexSupersessionKeys(
  repoRoot: string,
  indexPath: string,
): Promise<void> {
  let index: ArtifactIndexEntry[];
  try {
    index = await readArtifactIndex(repoRoot, indexPath);
  } catch (error) {
    if (error instanceof ArtifactAccessError
      && (error.code === "index.invalid_shape" || error.code === "generated_file.invalid_json")) {
      return;
    }
    throw error;
  }
  let changed = false;

  for (const entry of index) {
    if (entry.supersessionKey !== undefined) continue;
    try {
      const { artifact } = await readIndexedArtifactBody(repoRoot, entry);
      const record = isRecord(artifact) ? artifact : undefined;
      const header = assertArtifactHeader(record?.header);
      entry.supersessionKey = header.supersession?.key ?? null;
      changed = true;
    } catch {
      // Leave malformed legacy entries untouched so normal index validation
      // reports their integrity problem without making initialization fail.
    }
  }

  if (changed) {
    await writeGeneratedFileSafely(repoRoot, indexPath, `${JSON.stringify(index, null, 2)}\n`);
  }
}

async function resolveArtifactReadPath(repoRoot: string, entry: Pick<ArtifactIndexEntry, "path">): Promise<string> {
  const path = entry.path;

  if (!isNonEmptyString(path)) {
    throw new ArtifactAccessError("index.entry.missing_path", "Artifact index entry is missing path.");
  }

  if (isAbsolute(path)) {
    throw new ArtifactAccessError(
      "index.entry.absolute_path",
      "Artifact index paths must be relative to the repository root.",
      path,
    );
  }

  const legacyWorkspaceSegment = [".codebase", "intel"].join("-");

  if (pathHasSegment(path, legacyWorkspaceSegment)) {
    throw new ArtifactAccessError(
      "index.entry.private_path",
      "Artifact index entries must not point to private legacy workspace directories.",
      path,
    );
  }

  if (!path.startsWith(".rekon/artifacts/")) {
    throw new ArtifactAccessError(
      "index.entry.outside_artifacts",
      "Artifact index entries must point under .rekon/artifacts/.",
      path,
    );
  }

  const absolutePath = resolve(repoRoot, path);
  assertLexicallyInside(absolutePath, repoRoot, "index.entry.outside_repo");

  let stats;

  try {
    stats = await lstat(absolutePath);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ArtifactAccessError(
        "index.entry.artifact_unreadable",
        "Indexed artifact could not be read because it does not exist.",
        path,
      );
    }

    throw error;
  }

  if (stats.isSymbolicLink()) {
    throw new ArtifactAccessError(
      "index.entry.symlink_path",
      "Indexed artifact path must not be a symlink.",
      path,
    );
  }

  if (!stats.isFile()) {
    throw new ArtifactAccessError(
      "index.entry.not_file",
      "Indexed artifact path must point to a file.",
      path,
    );
  }

  const [realRepoRoot, realArtifactsRoot, realArtifactPath] = await Promise.all([
    realpath(repoRoot),
    realpath(resolve(repoRoot, ".rekon", "artifacts")),
    realpath(absolutePath),
  ]);

  if (!isPathInside(realArtifactPath, realRepoRoot)) {
    throw new ArtifactAccessError(
      "index.entry.outside_repo",
      "Artifact index entry resolves outside the repository root.",
      path,
    );
  }

  if (!isPathInside(realArtifactPath, realArtifactsRoot)) {
    throw new ArtifactAccessError(
      "index.entry.outside_artifacts_realpath",
      "Artifact index entry resolves outside .rekon/artifacts.",
      path,
    );
  }

  return absolutePath;
}

async function assertSafeExistingGeneratedFile(repoRoot: string, path: string): Promise<void> {
  assertLexicallyInside(path, repoRoot, "generated_file.outside_repo");

  let stats;

  try {
    stats = await lstat(path);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new ArtifactAccessError(
        "generated_file.missing",
        "Generated Rekon file does not exist.",
        relative(repoRoot, path),
      );
    }

    throw error;
  }

  if (stats.isSymbolicLink()) {
    throw new ArtifactAccessError(
      "generated_file.symlink",
      "Refusing to read generated Rekon file through a symlink.",
      relative(repoRoot, path),
    );
  }

  if (!stats.isFile()) {
    throw new ArtifactAccessError(
      "generated_file.not_file",
      "Generated Rekon path must be a regular file.",
      relative(repoRoot, path),
    );
  }

  const [realRepoRoot, realFilePath] = await Promise.all([realpath(repoRoot), realpath(path)]);

  if (!isPathInside(realFilePath, realRepoRoot)) {
    throw new ArtifactAccessError(
      "generated_file.outside_repo",
      "Generated Rekon file resolves outside the repository root.",
      relative(repoRoot, path),
    );
  }
}

async function assertSafeWorkspaceRoot(repoRoot: string, workspaceRoot: string): Promise<void> {
  assertLexicallyInside(workspaceRoot, repoRoot, "generated_file.outside_repo");

  let stats;

  try {
    stats = await lstat(workspaceRoot);
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }

    throw error;
  }

  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new ArtifactAccessError(
      "generated_file.workspace_not_directory",
      "Rekon workspace root must be a regular directory.",
      relative(repoRoot, workspaceRoot),
    );
  }

  const [realRepoRoot, realWorkspaceRoot] = await Promise.all([realpath(repoRoot), realpath(workspaceRoot)]);

  if (!isPathInside(realWorkspaceRoot, realRepoRoot)) {
    throw new ArtifactAccessError(
      "generated_file.outside_repo",
      "Rekon workspace root resolves outside the repository root.",
      relative(repoRoot, workspaceRoot),
    );
  }
}

async function assertSafeParentForGeneratedWrite(repoRoot: string, parentPath: string): Promise<void> {
  assertLexicallyInside(parentPath, repoRoot, "generated_file.outside_repo");

  const stats = await lstat(parentPath);

  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new ArtifactAccessError(
      "generated_file.parent_not_directory",
      "Generated Rekon file parent must be a regular directory.",
      relative(repoRoot, parentPath),
    );
  }

  const [realRepoRoot, realParentPath] = await Promise.all([realpath(repoRoot), realpath(parentPath)]);

  if (!isPathInside(realParentPath, realRepoRoot)) {
    throw new ArtifactAccessError(
      "generated_file.outside_repo",
      "Generated Rekon file parent resolves outside the repository root.",
      relative(repoRoot, parentPath),
    );
  }
}

function assertLexicallyInside(path: string, root: string, code: string): void {
  if (!isPathInside(path, root)) {
    throw new ArtifactAccessError(
      code,
      "Path must stay inside the repository root.",
      relative(root, path),
    );
  }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error
    && "code" in error
    && (error as NodeJS.ErrnoException).code === "ENOENT";
}

function toArtifactAccessError(error: unknown): ArtifactAccessError {
  if (error instanceof ArtifactAccessError) {
    return error;
  }

  return new ArtifactAccessError(
    "index.entry.artifact_unreadable",
    `Indexed artifact could not be read: ${error instanceof Error ? error.message : String(error)}`,
  );
}

function latestByType(entries: ArtifactIndexEntry[], type: string): ArtifactIndexEntry | undefined {
  return entries
    .filter((entry) => entry.type === type)
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
}

type SnapshotMembers = Pick<
  IntelligenceSnapshot,
  "inputs" | "projections" | "evaluations" | "publications" | "actions"
>;

function selectSnapshotEntries(
  entries: ArtifactIndexEntry[],
  refs: readonly ArtifactRef[] | undefined,
): ArtifactIndexEntry[] {
  if (!refs) return entries;

  const entriesByKey = new Map(
    entries.map((entry) => [`${entry.type}:${entry.id}`, entry]),
  );
  const selected = new Map<string, ArtifactIndexEntry>();

  for (const ref of refs) {
    const key = `${ref.type}:${ref.id}`;
    const entry = entriesByKey.get(key);
    if (!entry) {
      throw new Error(`Snapshot member ${key} is not indexed.`);
    }
    selected.set(key, entry);
  }

  return [...selected.values()];
}

async function groupCurrentSnapshotRefs(
  store: ArtifactStore,
  entries: ArtifactIndexEntry[],
): Promise<SnapshotMembers> {
  const members: SnapshotMembers = {
    inputs: {},
    projections: {},
    evaluations: {},
    publications: {},
    actions: {},
  };
  const byCategory = new Map<SnapshotCategory, Map<string, ArtifactIndexEntry[]>>();

  for (const entry of entries) {
    const category = snapshotCategoryForArtifactType(entry.type);
    if (!category) continue;
    const byType = byCategory.get(category) ?? new Map<string, ArtifactIndexEntry[]>();
    const current = byType.get(entry.type) ?? [];
    current.push(entry);
    byType.set(entry.type, current);
    byCategory.set(category, byType);
  }

  const supersessionKeyCache = new Map<string, string | undefined>();
  for (const category of ["inputs", "projections", "evaluations", "publications", "actions"] as const) {
    const byType = byCategory.get(category);
    if (!byType) continue;
    for (const [type, candidates] of [...byType].sort(([left], [right]) => left.localeCompare(right))) {
      members[category][type] = await latestSnapshotRefsByFamily(
        store,
        candidates,
        supersessionKeyCache,
      );
    }
  }

  return members;
}

async function latestSnapshotRefsByFamily(
  store: ArtifactStore,
  entries: ArtifactIndexEntry[],
  supersessionKeyCache: Map<string, string | undefined>,
): Promise<ArtifactRef[]> {
  const latestKeyed = new Map<string, ArtifactIndexEntry>();
  let latestUnkeyed: ArtifactIndexEntry | undefined;
  let latestOverall: ArtifactIndexEntry | undefined;

  for (const entry of entries) {
    if (!latestOverall || compareIndexRecency(entry, latestOverall) > 0) latestOverall = entry;
    const key = await readSupersessionKey(store, entry, supersessionKeyCache);
    if (!key) {
      if (!latestUnkeyed || compareIndexRecency(entry, latestUnkeyed) > 0) latestUnkeyed = entry;
      continue;
    }
    const current = latestKeyed.get(key);
    if (!current || compareIndexRecency(entry, current) > 0) latestKeyed.set(key, entry);
  }

  const selected = [...latestKeyed.values()];
  // Legacy unkeyed artifacts use type-wide supersession. Keep that stream only
  // when it is the newest generation of the type; once keyed producers have
  // replaced it, retaining it would pin obsolete pre-migration state forever.
  if (latestUnkeyed && (latestKeyed.size === 0 || latestUnkeyed === latestOverall)) {
    selected.push(latestUnkeyed);
  }

  return selected
    .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`))
    .map(indexEntryToRef);
}

function compareIndexRecency(left: ArtifactIndexEntry, right: ArtifactIndexEntry): number {
  const writtenAt = left.writtenAt.localeCompare(right.writtenAt);
  return writtenAt !== 0 ? writtenAt : left.id.localeCompare(right.id);
}

function snapshotCategoryForArtifactType(type: string): SnapshotCategory | undefined {
  const storageCategory = ARTIFACT_CATEGORY_BY_TYPE[type] ?? "actions";
  switch (storageCategory) {
    case "evidence": return "inputs";
    case "projections":
    case "graphs": return "projections";
    case "findings": return "evaluations";
    case "publications": return "publications";
    case "resolver-packets":
    case "actions": return "actions";
    case "snapshots": return undefined;
  }
}

function snapshotLineageRefs(members: SnapshotMembers): ArtifactRef[] {
  const byKey = new Map<string, ArtifactRef>();
  for (const category of ["inputs", "projections", "evaluations"] as const) {
    for (const refs of Object.values(members[category])) {
      for (const ref of refs) byKey.set(`${ref.type}:${ref.id}`, ref);
    }
  }
  return [...byKey.values()].sort((left, right) =>
    `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`),
  );
}

function createSnapshotStatus(
  artifacts: ArtifactIndexEntry[],
  validation: ArtifactIndexValidationResult,
  freshness: ArtifactFreshnessResult,
  memberRefs: ArtifactRef[],
): IntelligenceSnapshot["status"] {
  const warnings = validation.issues.map((issue) => `${issue.code}: ${issue.message}`);
  const types = new Set(artifacts.map((artifact) => artifact.type).filter(Boolean));
  const memberKeys = new Set(memberRefs.map((ref) => `${ref.type}:${ref.id}`));
  const memberFreshness = freshness.artifacts.filter((entry) =>
    memberKeys.has(`${entry.type}:${entry.id}`),
  );

  if (!types.has("EvidenceGraph")) {
    warnings.push("No EvidenceGraph artifacts are indexed.");
  }

  for (const member of memberFreshness) {
    if (member.status === "fresh") continue;
    for (const issue of member.issues) {
      warnings.push(`${member.type} ${member.status}: ${issue.code}: ${issue.message}`);
    }
  }

  for (const warning of missingExpectedProjectionWarnings(types)) {
    warnings.push(warning);
  }

  return {
    freshness: snapshotFreshness(types, warnings, memberFreshness),
    warnings: [...new Set(warnings)],
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

function snapshotFreshness(
  types: Set<string>,
  warnings: string[],
  memberFreshness: ArtifactFreshnessEntry[],
): IntelligenceSnapshot["status"]["freshness"] {
  if (!types.has("EvidenceGraph")) {
    return "unknown";
  }

  if (memberFreshness.some((entry) => entry.status === "stale")) {
    return "stale";
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

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import {
  type ArtifactHeader,
  type ArtifactRef,
  assertArtifactHeader,
  digestJson,
  toArtifactRef,
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
  ResolverPacket: "resolver-packets",
  Publication: "publications",
  OperatorFeedbackEntry: "actions",
  MemoryEvent: "actions",
  ContextUsageEvent: "actions",
  OutcomeEvent: "actions",
  MemorySelection: "publications",
  IntentMap: "actions",
  WorkOrder: "actions",
  VerificationPlan: "actions",
  VerificationResult: "actions",
  ReconciliationPlan: "actions",
  ReconciliationLog: "actions",
  ActionLog: "actions",
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
    projections: groupRefsByType(artifacts, ["ObservedRepo", "OwnershipMap", "CapabilityMap", "GraphSlice"]),
    evaluations: groupRefsByType(artifacts, ["FindingReport"]),
    publications: groupRefsByType(artifacts, ["Publication", "MemorySelection"]),
    actions: groupRefsByType(artifacts, [
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
    status: {
      freshness: latestEvidence ? "fresh" : "unknown",
      warnings: latestEvidence ? [] : ["No EvidenceGraph artifacts are indexed."],
      blockedReasons: [],
    },
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

function categoryForArtifactType(artifactType: string): ArtifactCategory {
  return ARTIFACT_CATEGORY_BY_TYPE[artifactType] ?? "actions";
}

function normalizeArtifactForWrite(artifact: ArtifactWithHeader): ArtifactWithHeader {
  return JSON.parse(JSON.stringify(artifact)) as ArtifactWithHeader;
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

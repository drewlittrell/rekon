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
  type CapabilityDefinition,
  type CapabilityPermission,
  type CapabilityRegistrySnapshot,
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
  | "graphs"
  | "findings"
  | "resolver-packets"
  | "publications"
  | "actions";

export type IntelligenceSnapshot = {
  header: ArtifactHeader;
  repo: RuntimeRepo;
  inputs: Record<string, ArtifactRef[]>;
  projections: Record<string, ArtifactRef[]>;
  evaluations: Record<string, ArtifactRef[]>;
  publications: Record<string, ArtifactRef[]>;
  actions: Record<string, ArtifactRef[]>;
  status: {
    freshness: "fresh" | "stale" | "partial" | "unknown";
    warnings: string[];
    blockedReasons: string[];
  };
};

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

export type Runtime = RuntimeContext & {
  registry: CapabilityRegistrySnapshot;
  runObserve(options?: ObserveOptions): Promise<ArtifactRef>;
  runSnapshot(): Promise<ArtifactRef>;
  runResolve(options?: ResolveOptions): Promise<ArtifactRef[]>;
};

const ARTIFACT_CATEGORY_BY_TYPE: Record<string, ArtifactCategory> = {
  EvidenceGraph: "evidence",
  IntelligenceSnapshot: "snapshots",
  GraphSlice: "graphs",
  FindingReport: "findings",
  ResolverPacket: "resolver-packets",
  Publication: "publications",
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
    async runSnapshot() {
      return runSnapshot(context);
    },
    async runResolve(resolveOptions = {}) {
      return runResolve(context, registry.snapshot(), resolveOptions);
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
  const snapshot: IntelligenceSnapshot = {
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
    publications: groupRefsByType(artifacts, ["Publication"]),
    actions: groupRefsByType(artifacts, ["ActionLog", "VerificationResult"]),
    status: {
      freshness: latestEvidence ? "fresh" : "unknown",
      warnings: latestEvidence ? [] : ["No EvidenceGraph artifacts are indexed."],
      blockedReasons: [],
    },
  };

  return context.artifacts.write(snapshot, { category: "snapshots" });
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

async function runSingleResolver(
  context: RuntimeContext,
  resolver: Resolver,
  input: Record<string, unknown>,
): Promise<ArtifactRef[]> {
  return resolver.resolve({
    artifacts: {
      read: (ref: ArtifactRef) => context.artifacts.read(ref),
      write: (type: string, artifact: unknown) => {
        const category = categoryForArtifactType(type);

        return context.artifacts.write(artifact as ArtifactWithHeader, { category });
      },
    },
    input,
  });
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

#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import docsCapability from "@rekon/capability-docs";
import graphCapability from "@rekon/capability-graph";
import intentCapability from "@rekon/capability-intent";
import jsTsCapability from "@rekon/capability-js-ts";
import memoryCapability from "@rekon/capability-memory";
import modelCapability from "@rekon/capability-model";
import policyCapability from "@rekon/capability-policy";
import reconcileCapability from "@rekon/capability-reconcile";
import resolverCapability from "@rekon/capability-resolver";
import {
  type ArtifactIndexEntry,
  createLocalArtifactStore,
  createRuntime,
  validateArtifactFreshness,
  validateArtifactIndex,
} from "@rekon/runtime";
import { type CapabilityDefinition, type CapabilityPermission } from "@rekon/sdk";

if (isMainEntry()) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

function isMainEntry(): boolean {
  const entryArg = process.argv[1];

  if (!entryArg) {
    return false;
  }

  const modulePath = fileURLToPath(import.meta.url);

  try {
    return realpathSync(entryArg) === modulePath;
  } catch {
    return false;
  }
}

export async function main(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  const [command, subcommand, positional] = parsed.positionals;
  const root = resolve(String(parsed.flags.root ?? process.cwd()));
  const json = Boolean(parsed.flags.json);

  if (!command || command === "help" || parsed.flags.help) {
    writeOutput(usage(), json);
    return;
  }

  if (command === "init") {
    const store = createLocalArtifactStore(root);
    await store.init();
    await writeConfigIfMissing(root);
    writeOutput({ root, config: ".rekon/config.json" }, json);
    return;
  }

  if (command === "capabilities" && subcommand === "list") {
    const runtime = await createDefaultRuntime(root);
    const verbose = Boolean(parsed.flags.verbose);

    if (!verbose) {
      const capabilities = runtime.registry.capabilities.map((capability) => capability.manifest);
      writeOutput({ capabilities }, json);
      return;
    }

    const capabilities = runtime.registry.capabilities.map((capability) => ({
      manifest: capability.manifest,
      handlers: summarizeHandlers(capability),
    }));
    writeOutput({ capabilities }, json);
    return;
  }

  if (command === "capabilities" && subcommand === "inspect" && positional) {
    const runtime = await createDefaultRuntime(root);
    const capability = runtime.registry.capabilities.find(
      (entry) => entry.manifest.id === positional,
    );

    if (!capability) {
      throw new Error(`Unknown capability: ${positional}`);
    }

    writeOutput(
      {
        manifest: capability.manifest,
        handlers: summarizeHandlers(capability),
        artifactTypes: capability.artifactTypes.map((type) => type.type),
      },
      json,
    );
    return;
  }

  if (command === "observe") {
    const runtime = await createDefaultRuntime(root);
    const changedFiles = parseRepeatableFlag(parsed.flags["changed-file"]);
    const ref = await runtime.runObserve({
      changedFiles: changedFiles.length > 0 ? changedFiles : undefined,
      incremental: changedFiles.length > 0,
    });
    writeOutput({ artifact: ref }, json);
    return;
  }

  if (command === "snapshot") {
    const runtime = await createDefaultRuntime(root);
    const ref = await runtime.runSnapshot();
    writeOutput({ artifact: ref }, json);
    return;
  }

  if (command === "project") {
    const runtime = await createDefaultRuntime(root);
    const existingEvidence = await runtime.artifacts.list("EvidenceGraph");

    if (existingEvidence.length === 0) {
      await runtime.runObserve();
    }

    const refs = await runtime.runProject();
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "evaluate" && subcommand === "list") {
    const runtime = await createDefaultRuntime(root);
    const evaluators = listHandlers(runtime, "evaluators").map((entry) => ({
      id: entry.handlerId,
      capabilityId: entry.capabilityId,
      produces: entry.produces,
    }));
    writeOutput({ evaluators }, json);
    return;
  }

  if (command === "evaluate" && subcommand === "run" && positional) {
    const runtime = await createDefaultRuntime(root);
    const evaluatorId = positional;

    if (!runtime.registry.evaluators.some((evaluator) => evaluator.id === evaluatorId)) {
      throw new Error(
        `Unknown evaluator: ${evaluatorId}. Use 'rekon evaluate list' to see registered evaluators.`,
      );
    }

    const existingEvidence = await runtime.artifacts.list("EvidenceGraph");

    if (existingEvidence.length === 0) {
      await runtime.runObserve();
    }

    const refs = await runtime.runEvaluate({
      evaluatorId,
      input: parseInputJsonFlag(parsed.flags["input-json"]),
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "evaluate") {
    const runtime = await createDefaultRuntime(root);
    const existingEvidence = await runtime.artifacts.list("EvidenceGraph");

    if (existingEvidence.length === 0) {
      await runtime.runObserve();
    }

    const refs = await runtime.runEvaluate();
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "publish" && subcommand === "agents") {
    const runtime = await createDefaultRuntime(root);
    await ensureSnapshotReady(runtime);
    const refs = await runtime.runPublish({
      publisherId: "@rekon/capability-docs.publisher",
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "publish" && subcommand === "list") {
    const runtime = await createDefaultRuntime(root);
    const publishers = listHandlers(runtime, "publishers").map((entry) => ({
      id: entry.handlerId,
      capabilityId: entry.capabilityId,
      produces: entry.produces,
    }));
    writeOutput({ publishers }, json);
    return;
  }

  if (command === "publish" && subcommand === "run" && positional) {
    const runtime = await createDefaultRuntime(root);
    const publisherId = positional;

    if (!runtime.registry.publishers.some((publisher) => publisher.id === publisherId)) {
      throw new Error(
        `Unknown publisher: ${publisherId}. Use 'rekon publish list' to see registered publishers.`,
      );
    }

    await ensureSnapshotReady(runtime);
    const refs = await runtime.runPublish({
      publisherId,
      input: parseInputJsonFlag(parsed.flags["input-json"]),
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "memory" && subcommand === "add") {
    const instruction = typeof parsed.flags.instruction === "string" ? parsed.flags.instruction : undefined;
    const path = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;

    if (!instruction || !path) {
      throw new Error("rekon memory add requires --instruction <text> and --path <path>.");
    }

    const runtime = await createDefaultRuntime(root);
    const refs = await runtime.runLearn({
      learnerId: "@rekon/capability-memory.learner",
      input: {
        mode: "add",
        instruction,
        path,
        goal: typeof parsed.flags.goal === "string" ? parsed.flags.goal : undefined,
      },
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "memory" && subcommand === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entries = await Promise.all((await store.list("OperatorFeedbackEntry")).map((ref) => store.read(ref)));
    writeOutput({ entries }, json);
    return;
  }

  if (command === "memory" && subcommand === "select") {
    const path = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;

    if (!path) {
      throw new Error("rekon memory select requires --path <path>.");
    }

    const runtime = await createDefaultRuntime(root);
    const refs = await runtime.runLearn({
      learnerId: "@rekon/capability-memory.learner",
      input: {
        mode: "select",
        path,
        goal: typeof parsed.flags.goal === "string" ? parsed.flags.goal : "",
      },
    });
    const selection = refs[0] ? await runtime.artifacts.read(refs[0]) : null;
    writeOutput({ artifact: refs[0], selection }, json);
    return;
  }

  if (command === "resolve" && subcommand === "list") {
    const runtime = await createDefaultRuntime(root);
    const resolvers = listHandlers(runtime, "resolvers").map((entry) => ({
      id: entry.handlerId,
      capabilityId: entry.capabilityId,
      produces: entry.produces,
    }));
    writeOutput({ resolvers }, json);
    return;
  }

  if (command === "resolve" && subcommand === "run" && positional) {
    const runtime = await createDefaultRuntime(root);
    const resolverId = positional;

    if (!runtime.registry.resolvers.some((resolver) => resolver.id === resolverId)) {
      throw new Error(
        `Unknown resolver: ${resolverId}. Use 'rekon resolve list' to see registered resolvers.`,
      );
    }

    const explicitInput = parseInputJsonFlag(parsed.flags["input-json"]) ?? {};
    const input: Record<string, unknown> = { ...explicitInput };

    if (input.snapshotRef === undefined) {
      const snapshots = await runtime.artifacts.list("IntelligenceSnapshot");

      if (snapshots.length === 0) {
        await ensureSnapshotReady(runtime);
      }

      const latest = (await runtime.artifacts.list("IntelligenceSnapshot")).at(-1);

      if (latest) {
        input.snapshotRef = {
          type: latest.type,
          id: latest.id,
          schemaVersion: latest.schemaVersion,
        };
      }
    }

    const refs = await runtime.runResolve({ resolverId, input });
    const packet = refs[0] ? await runtime.artifacts.read(refs[0]) : null;

    writeOutput({ artifact: refs[0], packet, artifacts: refs }, json);
    return;
  }

  if (command === "resolve" && subcommand === "preflight") {
    const path = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;
    const goal = typeof parsed.flags.goal === "string" ? parsed.flags.goal : "";

    if (!path) {
      throw new Error("rekon resolve preflight requires --path <path>.");
    }

    const runtime = await createDefaultRuntime(root);
    const existingEvidence = await runtime.artifacts.list("EvidenceGraph");

    if (existingEvidence.length === 0) {
      await runtime.runObserve({
        changedFiles: [path],
        incremental: true,
      });
    }

    const existingOwnership = await runtime.artifacts.list("OwnershipMap");

    if (existingOwnership.length === 0) {
      await runtime.runProject();
    }

    const existingFindings = await runtime.artifacts.list("FindingReport");

    if (existingFindings.length === 0) {
      await runtime.runEvaluate();
    }

    const memoryEntries = await runtime.artifacts.list("OperatorFeedbackEntry");

    if (memoryEntries.length > 0) {
      await runtime.runLearn({
        learnerId: "@rekon/capability-memory.learner",
        input: {
          mode: "select",
          path,
          goal,
        },
      });
    }

    const snapshotRef = await runtime.runSnapshot();
    const refs = await runtime.runResolve({
      resolverId: "resolve.preflight",
      input: {
        snapshotRef,
        path,
        goal,
      },
    });
    const packet = refs[0] ? await runtime.artifacts.read(refs[0]) : null;

    writeOutput({ artifact: refs[0], packet }, json);
    return;
  }

  if (command === "intent" && subcommand === "work-order") {
    const path = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;
    const goal = typeof parsed.flags.goal === "string" ? parsed.flags.goal : "";

    if (!path) {
      throw new Error("rekon intent work-order requires --path <path>.");
    }

    const runtime = await createDefaultRuntime(root);
    const existingPreflight = await runtime.artifacts.list("ResolverPacket");

    if (existingPreflight.length === 0) {
      await ensurePreflight(runtime, path, goal);
    }

    const refs = await runtime.runAct({
      actuatorId: "@rekon/capability-intent.work-order",
      input: {
        path,
        goal,
      },
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "reconcile") {
    const runtime = await createDefaultRuntime(root);
    const operations = parseRepeatableFlag(parsed.flags.operation);
    const refs = await runtime.runAct({
      actuatorId: "@rekon/capability-reconcile.actuator",
      input: {
        operations: operations.length > 0 ? operations : undefined,
        dryRun: !parsed.flags.apply,
      },
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "artifacts" && subcommand === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entries = await store.list(typeof parsed.flags.type === "string" ? parsed.flags.type : undefined);
    writeOutput({ artifacts: entries }, json);
    return;
  }

  if (command === "artifacts" && subcommand === "show" && positional) {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entry = await findArtifactEntry(store, positional);
    const artifact = await store.read(entry);
    writeOutput({ artifact }, json);
    return;
  }

  if (command === "artifacts" && subcommand === "validate") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const result = await validateArtifactIndex(store);

    writeOutput(result, json);

    if (!result.valid) {
      process.exitCode = 1;
    }

    return;
  }

  if (command === "artifacts" && subcommand === "freshness") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const artifactType = typeof parsed.flags.type === "string" ? parsed.flags.type : undefined;
    const artifactId = typeof parsed.flags.id === "string" ? parsed.flags.id : undefined;
    const result = await validateArtifactFreshness(store, {
      artifactType,
      artifactId,
    });

    writeOutput(result, json);
    return;
  }

  if (command === "config" && subcommand === "validate") {
    const result = await validateConfig(root);
    writeOutput(result, json);

    if (!result.valid) {
      process.exitCode = 1;
    }

    return;
  }

  throw new Error(`Unknown command: ${argv.join(" ")}`);
}

type RekonConfig = {
  capabilities?: Array<{ package: string }>;
  permissions?: Record<string, CapabilityPermission[]>;
};

const BUILT_IN_CAPABILITIES: Record<string, CapabilityDefinition> = {
  "@rekon/capability-docs": docsCapability,
  "@rekon/capability-graph": graphCapability,
  "@rekon/capability-intent": intentCapability,
  "@rekon/capability-js-ts": jsTsCapability,
  "@rekon/capability-memory": memoryCapability,
  "@rekon/capability-model": modelCapability,
  "@rekon/capability-policy": policyCapability,
  "@rekon/capability-reconcile": reconcileCapability,
  "@rekon/capability-resolver": resolverCapability,
};

const DEFAULT_CAPABILITIES = [
  "@rekon/capability-js-ts",
  "@rekon/capability-model",
  "@rekon/capability-graph",
  "@rekon/capability-policy",
  "@rekon/capability-resolver",
  "@rekon/capability-docs",
  "@rekon/capability-memory",
  "@rekon/capability-intent",
  "@rekon/capability-reconcile",
];

async function createDefaultRuntime(root: string) {
  const config = await readConfig(root);
  const capabilities = await loadConfiguredCapabilities(config);

  return createRuntime({
    repoRoot: root,
    capabilities,
    permissions: config.permissions,
  });
}

async function writeConfigIfMissing(root: string): Promise<void> {
  const configPath = resolve(root, ".rekon", "config.json");
  const defaultConfig = {
    capabilities: DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName })),
    permissions: {},
  };

  try {
    const existingConfig = JSON.parse(await readFile(configPath, "utf8")) as { capabilities?: unknown };

    if (!Array.isArray(existingConfig.capabilities) || existingConfig.capabilities.length === 0) {
      await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
    } else {
      const existingCapabilities = existingConfig.capabilities.filter(isCapabilityConfigEntry);
      const existingPackages = new Set(existingCapabilities.map((entry) => entry.package));
      const mergedConfig = {
        ...existingConfig,
        capabilities: [
          ...existingCapabilities,
          ...DEFAULT_CAPABILITIES
            .filter((packageName) => !existingPackages.has(packageName))
            .map((packageName) => ({ package: packageName })),
        ],
        permissions: typeof (existingConfig as RekonConfig).permissions === "object"
          ? (existingConfig as RekonConfig).permissions
          : {},
      };

      await writeFile(configPath, `${JSON.stringify(mergedConfig, null, 2)}\n`, "utf8");
    }
  } catch {
    await mkdir(resolve(root, ".rekon"), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
  }
}

function isCapabilityConfigEntry(value: unknown): value is { package: string } {
  return Boolean(
    value &&
    typeof value === "object" &&
    "package" in value &&
    typeof value.package === "string" &&
    value.package.length > 0,
  );
}

async function readConfig(root: string): Promise<RekonConfig> {
  const configPath = resolve(root, ".rekon", "config.json");

  try {
    const parsed = JSON.parse(await readFile(configPath, "utf8")) as RekonConfig;

    return {
      capabilities: Array.isArray(parsed.capabilities) && parsed.capabilities.length > 0
        ? parsed.capabilities
        : DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName })),
      permissions: parsed.permissions ?? {},
    };
  } catch {
    return {
      capabilities: DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName })),
      permissions: {},
    };
  }
}

async function loadConfiguredCapabilities(config: RekonConfig): Promise<CapabilityDefinition[]> {
  const entries = config.capabilities ?? DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName }));

  return Promise.all(entries.map(async (entry) => {
    const packageName = entry.package;
    const builtIn = BUILT_IN_CAPABILITIES[packageName];

    if (builtIn) {
      return builtIn;
    }

    try {
      const loaded = await import(packageName) as { default?: CapabilityDefinition };

      if (!loaded.default) {
        throw new Error(`Package ${packageName} does not export a default capability.`);
      }

      return loaded.default;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to load Rekon capability ${packageName}: ${message}`);
    }
  }));
}

async function ensureSnapshotReady(runtime: Awaited<ReturnType<typeof createDefaultRuntime>>): Promise<void> {
  if ((await runtime.artifacts.list("EvidenceGraph")).length === 0) {
    await runtime.runObserve();
  }

  if ((await runtime.artifacts.list("OwnershipMap")).length === 0) {
    await runtime.runProject();
  }

  if ((await runtime.artifacts.list("FindingReport")).length === 0) {
    await runtime.runEvaluate();
  }

  if (await snapshotIsStaleOrMissing(runtime)) {
    await runtime.runSnapshot();
  }
}

async function snapshotIsStaleOrMissing(
  runtime: Awaited<ReturnType<typeof createDefaultRuntime>>,
): Promise<boolean> {
  const snapshots = await runtime.artifacts.list("IntelligenceSnapshot");
  const latestSnapshot = snapshots.sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  )[0];

  if (!latestSnapshot) {
    return true;
  }

  const inputTypes = [
    "EvidenceGraph",
    "ObservedRepo",
    "OwnershipMap",
    "CapabilityMap",
    "GraphSlice",
    "FindingReport",
    "MemorySelection",
  ];

  for (const type of inputTypes) {
    const entries = await runtime.artifacts.list(type);
    const latest = entries.sort((left, right) =>
      right.writtenAt.localeCompare(left.writtenAt),
    )[0];

    if (!latest) {
      continue;
    }

    if (latest.writtenAt.localeCompare(latestSnapshot.writtenAt) > 0) {
      return true;
    }
  }

  return false;
}

async function ensurePreflight(
  runtime: Awaited<ReturnType<typeof createDefaultRuntime>>,
  path: string,
  goal: string,
): Promise<void> {
  if ((await runtime.artifacts.list("EvidenceGraph")).length === 0) {
    await runtime.runObserve({
      changedFiles: [path],
      incremental: true,
    });
  }

  if ((await runtime.artifacts.list("OwnershipMap")).length === 0) {
    await runtime.runProject();
  }

  if ((await runtime.artifacts.list("FindingReport")).length === 0) {
    await runtime.runEvaluate();
  }

  let snapshotRef: { type: string; id: string; schemaVersion: string };

  if (await snapshotIsStaleOrMissing(runtime)) {
    snapshotRef = await runtime.runSnapshot();
  } else {
    const snapshots = await runtime.artifacts.list("IntelligenceSnapshot");
    const latest = snapshots.sort((left, right) =>
      right.writtenAt.localeCompare(left.writtenAt),
    )[0];
    snapshotRef = latest
      ? {
        type: latest.type,
        id: latest.id,
        schemaVersion: latest.schemaVersion,
      }
      : await runtime.runSnapshot();
  }

  await runtime.runResolve({
    resolverId: "resolve.preflight",
    input: {
      snapshotRef,
      path,
      goal,
    },
  });
}

async function findArtifactEntry(store: ReturnType<typeof createLocalArtifactStore>, id: string): Promise<ArtifactIndexEntry> {
  const entries = await store.list();
  const [type, artifactId] = id.includes(":") ? id.split(":", 2) : [undefined, id];
  const entry = entries.find((candidate) => {
    if (type) {
      return candidate.type === type && candidate.id === artifactId;
    }

    return candidate.id === artifactId;
  });

  if (!entry) {
    throw new Error(`Artifact not found: ${id}`);
  }

  return entry;
}

type HandlerRoleKey =
  | "evidenceProviders"
  | "projectors"
  | "evaluators"
  | "resolvers"
  | "publishers"
  | "actuators"
  | "learners";

type RegisteredCapabilityLike = {
  manifest: { id: string };
  evidenceProviders: { id: string; produces?: string[]; consumes?: string[] }[];
  projectors: { id: string; produces?: string[] }[];
  evaluators: { id: string; produces?: string[] }[];
  resolvers: { id: string; produces?: string[] }[];
  publishers: { id: string; produces?: string[] }[];
  actuators: { id: string; produces?: string[] }[];
  learners: { id: string; produces?: string[] }[];
};

function summarizeHandlers(capability: RegisteredCapabilityLike): Record<HandlerRoleKey, { id: string; produces?: string[] }[]> {
  const map = <T extends { id: string; produces?: string[] }>(handlers: T[]) =>
    handlers.map((handler) => ({
      id: handler.id,
      produces: handler.produces ?? [],
    }));

  return {
    evidenceProviders: capability.evidenceProviders.map((handler) => ({ id: handler.id })),
    projectors: map(capability.projectors),
    evaluators: map(capability.evaluators),
    resolvers: map(capability.resolvers),
    publishers: map(capability.publishers),
    actuators: map(capability.actuators),
    learners: map(capability.learners),
  };
}

function listHandlers(
  runtime: { registry: { capabilities: RegisteredCapabilityLike[] } },
  role: HandlerRoleKey,
): { handlerId: string; capabilityId: string; produces: string[] }[] {
  const result: { handlerId: string; capabilityId: string; produces: string[] }[] = [];

  for (const capability of runtime.registry.capabilities) {
    for (const handler of capability[role]) {
      result.push({
        handlerId: handler.id,
        capabilityId: capability.manifest.id,
        produces: handler.produces ?? [],
      });
    }
  }

  return result;
}

function parseInputJsonFlag(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`--input-json must be valid JSON: ${message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--input-json must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

type ConfigValidationIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  path?: string;
};

type ConfigValidationResult = {
  valid: boolean;
  configPath: string;
  configExists: boolean;
  issues: ConfigValidationIssue[];
};

const KNOWN_PERMISSIONS: ReadonlySet<CapabilityPermission> = new Set([
  "read:source",
  "read:artifacts",
  "write:artifacts",
  "write:source",
  "execute:commands",
  "network:outbound",
]);

const RISKY_PERMISSIONS: ReadonlySet<CapabilityPermission> = new Set([
  "write:source",
  "execute:commands",
  "network:outbound",
]);

async function validateConfig(root: string): Promise<ConfigValidationResult> {
  const configPath = resolve(root, ".rekon", "config.json");
  const issues: ConfigValidationIssue[] = [];
  let raw: string;

  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return {
      valid: false,
      configPath,
      configExists: false,
      issues: [
        {
          code: "config-missing",
          severity: "error",
          message: `.rekon/config.json not found at ${configPath}. Run 'rekon init' to create one.`,
        },
      ],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      configPath,
      configExists: true,
      issues: [
        { code: "config-not-json", severity: "error", message: `config is not valid JSON: ${message}` },
      ],
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      valid: false,
      configPath,
      configExists: true,
      issues: [
        { code: "config-not-object", severity: "error", message: "config must be a JSON object." },
      ],
    };
  }

  const config = parsed as Record<string, unknown>;
  const capabilityPackages = new Set<string>();

  if (!("capabilities" in config)) {
    issues.push({
      code: "capabilities-missing",
      severity: "error",
      message: "config.capabilities is required.",
      path: "capabilities",
    });
  } else if (!Array.isArray(config.capabilities)) {
    issues.push({
      code: "capabilities-not-array",
      severity: "error",
      message: "config.capabilities must be an array.",
      path: "capabilities",
    });
  } else if (config.capabilities.length === 0) {
    issues.push({
      code: "capabilities-empty",
      severity: "warning",
      message: "config.capabilities is empty; the runtime will use no capabilities.",
      path: "capabilities",
    });
  } else {
    for (let index = 0; index < config.capabilities.length; index += 1) {
      const entry = config.capabilities[index];
      const entryPath = `capabilities[${index}]`;

      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        issues.push({
          code: "capability-not-object",
          severity: "error",
          message: "capability entry must be an object with a 'package' field.",
          path: entryPath,
        });
        continue;
      }

      const entryRecord = entry as Record<string, unknown>;
      const packageName = entryRecord["package"];

      if (typeof packageName !== "string" || packageName.length === 0) {
        issues.push({
          code: "capability-package-missing",
          severity: "error",
          message: "capability entry must declare a non-empty 'package' string.",
          path: `${entryPath}.package`,
        });
        continue;
      }

      if (capabilityPackages.has(packageName)) {
        issues.push({
          code: "capability-package-duplicate",
          severity: "warning",
          message: `capability package '${packageName}' is listed more than once.`,
          path: `${entryPath}.package`,
        });
      } else {
        capabilityPackages.add(packageName);
      }
    }
  }

  const permissions = config.permissions;

  if (permissions !== undefined) {
    if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
      issues.push({
        code: "permissions-not-object",
        severity: "error",
        message: "config.permissions must be an object keyed by capability package.",
        path: "permissions",
      });
    } else {
      for (const [capabilityName, capabilityPermissions] of Object.entries(permissions)) {
        const path = `permissions.${capabilityName}`;

        if (!Array.isArray(capabilityPermissions)) {
          issues.push({
            code: "permissions-entry-not-array",
            severity: "error",
            message: `permissions.${capabilityName} must be an array of permission names.`,
            path,
          });
          continue;
        }

        if (capabilityPackages.size > 0 && !capabilityPackages.has(capabilityName)) {
          issues.push({
            code: "permissions-unknown-capability",
            severity: "warning",
            message: `permissions reference '${capabilityName}' which is not listed in capabilities.`,
            path,
          });
        }

        for (let permissionIndex = 0; permissionIndex < capabilityPermissions.length; permissionIndex += 1) {
          const permission = capabilityPermissions[permissionIndex];
          const permissionPath = `${path}[${permissionIndex}]`;

          if (typeof permission !== "string") {
            issues.push({
              code: "permission-not-string",
              severity: "error",
              message: "permission entries must be strings.",
              path: permissionPath,
            });
            continue;
          }

          if (!KNOWN_PERMISSIONS.has(permission as CapabilityPermission)) {
            issues.push({
              code: "permission-unknown",
              severity: "error",
              message: `unknown permission '${permission}'. Known permissions: ${Array.from(KNOWN_PERMISSIONS).join(", ")}.`,
              path: permissionPath,
            });
            continue;
          }

          if (RISKY_PERMISSIONS.has(permission as CapabilityPermission)) {
            issues.push({
              code: "permission-risky",
              severity: "warning",
              message: `permission '${permission}' is high-risk; confirm it is intentional for '${capabilityName}'.`,
              path: permissionPath,
            });
          }
        }
      }
    }
  }

  const valid = issues.every((issue) => issue.severity !== "error");

  return {
    valid,
    configPath,
    configExists: true,
    issues,
  };
}

function parseArgs(argv: string[]): {
  positionals: string[];
  flags: Record<string, string | boolean | string[]>;
} {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean | string[]> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey ?? "";

    if (!key) {
      continue;
    }

    const nextArg = argv[index + 1];
    const value: string | boolean = inlineValue ?? (nextArg === undefined || nextArg.startsWith("--") ? true : String(argv[++index]));
    const existing = flags[key];

    if (existing === undefined) {
      flags[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(String(value));
    } else {
      flags[key] = [String(existing), String(value)];
    }
  }

  return { positionals, flags };
}

function parseRepeatableFlag(value: string | boolean | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

function writeOutput(value: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  if (typeof value === "string") {
    console.log(value);
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

function usage(): string {
  return [
    "rekon init [--root <path>]",
    "rekon config validate [--root <path>] [--json]",
    "rekon capabilities list [--root <path>] [--verbose] [--json]",
    "rekon capabilities inspect <capability-id> [--root <path>] [--json]",
    "rekon observe [--root <path>] [--changed-file <path>] [--json]",
    "rekon project [--root <path>] [--json]",
    "rekon evaluate [--root <path>] [--json]",
    "rekon evaluate list [--root <path>] [--json]",
    "rekon evaluate run <evaluator-id> [--root <path>] [--input-json <json>] [--json]",
    "rekon snapshot [--root <path>] [--json]",
    "rekon publish agents [--root <path>] [--json]",
    "rekon publish list [--root <path>] [--json]",
    "rekon publish run <publisher-id> [--root <path>] [--input-json <json>] [--json]",
    "rekon memory add --instruction <text> --path <path> [--goal <goal>] [--root <path>] [--json]",
    "rekon memory list [--root <path>] [--json]",
    "rekon memory select --path <path> --goal <goal> [--root <path>] [--json]",
    "rekon resolve preflight --path <path> --goal <goal> [--root <path>] [--json]",
    "rekon resolve list [--root <path>] [--json]",
    "rekon resolve run <resolver-id> [--root <path>] [--input-json <json>] [--json]",
    "rekon intent work-order --path <path> --goal <goal> [--root <path>] [--json]",
    "rekon reconcile [--operation <name>] [--apply] [--root <path>] [--json]",
    "rekon artifacts list [--root <path>] [--type <type>] [--json]",
    "rekon artifacts show <id|type:id> [--root <path>] [--json]",
    "rekon artifacts validate [--root <path>] [--json]",
    "rekon artifacts freshness [--root <path>] [--type <type>] [--id <id>] [--json]",
  ].join("\n");
}

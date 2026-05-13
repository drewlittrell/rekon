#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import jsTsCapability from "@rekon/capability-js-ts";
import modelCapability from "@rekon/capability-model";
import resolverCapability from "@rekon/capability-resolver";
import {
  type ArtifactIndexEntry,
  createLocalArtifactStore,
  createRuntime,
} from "@rekon/runtime";

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
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
    const capabilities = runtime.registry.capabilities.map((capability) => capability.manifest);
    writeOutput({ capabilities }, json);
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

  throw new Error(`Unknown command: ${argv.join(" ")}`);
}

async function createDefaultRuntime(root: string) {
  return createRuntime({
    repoRoot: root,
    capabilities: [jsTsCapability, modelCapability, resolverCapability],
  });
}

async function writeConfigIfMissing(root: string): Promise<void> {
  const configPath = resolve(root, ".rekon", "config.json");
  const defaultConfig = {
    capabilities: [
      { package: "@rekon/capability-js-ts" },
      { package: "@rekon/capability-model" },
      { package: "@rekon/capability-resolver" },
    ],
    permissions: {},
  };

  try {
    const existingConfig = JSON.parse(await readFile(configPath, "utf8")) as { capabilities?: unknown };

    if (!Array.isArray(existingConfig.capabilities) || existingConfig.capabilities.length === 0) {
      await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
    }
  } catch {
    await mkdir(resolve(root, ".rekon"), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
  }
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
    "rekon capabilities list [--root <path>] [--json]",
    "rekon observe [--root <path>] [--changed-file <path>] [--json]",
    "rekon project [--root <path>] [--json]",
    "rekon snapshot [--root <path>] [--json]",
    "rekon resolve preflight --path <path> --goal <goal> [--root <path>] [--json]",
    "rekon artifacts list [--root <path>] [--type <type>] [--json]",
    "rekon artifacts show <id|type:id> [--root <path>] [--json]",
  ].join("\n");
}

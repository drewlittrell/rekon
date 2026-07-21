import { lstat, mkdir, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { digestJson } from "@rekon/kernel-artifacts";
import {
  type RepositoryContractSourceDocument,
  validateRepositoryContractSourceDocument,
} from "@rekon/kernel-repo-model";

export const COLOCATED_REPOSITORY_CONTRACT_FILE = "rekon.contract.json";
export const CENTRAL_REPOSITORY_CONTRACT_DIRECTORY = "rekon/contracts";
export const ROOT_REKON_CONFIG_FILE = "rekon.config.json";

export type RepositoryContractSourceIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  path?: string;
};

export type LoadedRepositoryContractSource = {
  path: string;
  digest: string;
  document: RepositoryContractSourceDocument;
};

export type RepositoryContractSourceLoadResult = {
  valid: boolean;
  sources: LoadedRepositoryContractSource[];
  issues: RepositoryContractSourceIssue[];
};

export type LoadRepositoryContractSourcesInput = {
  repoRoot: string;
  configuredPaths?: string[];
  maxSources?: number;
  maxDirectories?: number;
};

export type WriteRepositoryContractSourceInput = {
  repoRoot: string;
  path: string;
  document: RepositoryContractSourceDocument;
  overwrite?: boolean;
};

export type WrittenRepositoryContractSource = {
  path: string;
  digest: string;
};

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".rekon",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

/**
 * Discover and validate committed repository-law sources. The loader never
 * reads generated `.rekon/` state and never follows symlinks.
 */
export async function loadRepositoryContractSources(
  input: LoadRepositoryContractSourcesInput,
): Promise<RepositoryContractSourceLoadResult> {
  const repoRoot = resolve(input.repoRoot);
  const realRepoRoot = await realpath(repoRoot);
  const maxSources = input.maxSources ?? 512;
  const maxDirectories = input.maxDirectories ?? 20_000;
  const issues: RepositoryContractSourceIssue[] = [];
  const candidates = new Set<string>();

  const configuredPaths = [
    ...(input.configuredPaths ?? []),
    ...await readConfiguredContractPaths(repoRoot, realRepoRoot, issues),
  ];
  for (const path of configuredPaths) {
    const normalized = validateConfiguredPath(path, issues);
    if (normalized) candidates.add(normalized);
  }

  const budget = { directories: 0, maxDirectories };
  await discoverColocatedSources(repoRoot, repoRoot, candidates, issues, budget);
  await discoverCentralSources(repoRoot, resolve(repoRoot, CENTRAL_REPOSITORY_CONTRACT_DIRECTORY), candidates, issues, budget);

  const sortedCandidates = [...candidates].sort();
  if (sortedCandidates.length > maxSources) {
    issues.push({
      code: "contract_sources.source_budget_exceeded",
      severity: "error",
      message: `Discovered ${sortedCandidates.length} contract sources; maximum is ${maxSources}.`,
    });
  }

  const sources: LoadedRepositoryContractSource[] = [];
  const sourceIds = new Map<string, string>();
  for (const relativePath of sortedCandidates.slice(0, maxSources)) {
    const loaded = await readSource(repoRoot, realRepoRoot, relativePath, issues);
    if (!loaded) continue;
    const priorPath = sourceIds.get(loaded.document.sourceId);
    if (priorPath) {
      issues.push({
        code: "contract_sources.duplicate_source_id",
        severity: "error",
        path: relativePath,
        message: `sourceId ${loaded.document.sourceId} is already declared by ${priorPath}.`,
      });
      continue;
    }
    sourceIds.set(loaded.document.sourceId, relativePath);
    sources.push(loaded);
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    sources,
    issues,
  };
}

/** Write an explicitly approved contract source without following symlinks. */
export async function writeRepositoryContractSource(
  input: WriteRepositoryContractSourceInput,
): Promise<WrittenRepositoryContractSource> {
  const validation = validateRepositoryContractSourceDocument(input.document);
  if (!validation.ok) {
    throw new TypeError(`Repository contract source validation failed: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
  }
  const repoRoot = resolve(input.repoRoot);
  const realRepoRoot = await realpath(repoRoot);
  const path = validateWritableContractPath(input.path);
  const absolutePath = resolve(repoRoot, path);
  if (!isInside(absolutePath, repoRoot)) throw new Error("Contract source path is outside the repository.");
  await ensureSafeDirectoryChain(repoRoot, realRepoRoot, dirname(absolutePath));

  let existing;
  try {
    existing = await lstat(absolutePath);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  if (existing && (existing.isSymbolicLink() || !existing.isFile())) {
    throw new Error(`Contract source target ${path} must be a regular file and may not be a symlink.`);
  }
  if (existing && !input.overwrite) {
    throw new Error(`Contract source target ${path} already exists.`);
  }

  const document = validation.value;
  const payload = `${JSON.stringify(document, null, 2)}\n`;
  if (!existing) {
    await writeFile(absolutePath, payload, { encoding: "utf8", flag: "wx", mode: 0o644 });
  } else {
    const temporaryPath = resolve(dirname(absolutePath), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
    try {
      await writeFile(temporaryPath, payload, { encoding: "utf8", flag: "wx", mode: 0o644 });
      await rename(temporaryPath, absolutePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }
  const physicalPath = await realpath(absolutePath);
  if (!isInside(physicalPath, realRepoRoot)) throw new Error("Written contract source resolves outside the repository.");
  return { path, digest: digestJson(document) };
}

async function readConfiguredContractPaths(
  repoRoot: string,
  realRepoRoot: string,
  issues: RepositoryContractSourceIssue[],
): Promise<string[]> {
  const configPath = resolve(repoRoot, ROOT_REKON_CONFIG_FILE);
  let stats;
  try {
    stats = await lstat(configPath);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    issues.push({
      code: "contract_sources.config_not_regular_file",
      severity: "error",
      path: ROOT_REKON_CONFIG_FILE,
      message: "Root Rekon config must be a regular file and may not be a symlink.",
    });
    return [];
  }
  const realConfigPath = await realpath(configPath);
  if (!isInside(realConfigPath, realRepoRoot)) {
    issues.push({
      code: "contract_sources.config_outside_repo",
      severity: "error",
      path: ROOT_REKON_CONFIG_FILE,
      message: "Root Rekon config resolves outside the repository.",
    });
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(configPath, "utf8")) as unknown;
  } catch (error) {
    issues.push({
      code: "contract_sources.config_invalid_json",
      severity: "error",
      path: ROOT_REKON_CONFIG_FILE,
      message: `Root Rekon config is not valid JSON: ${(error as Error).message}`,
    });
    return [];
  }
  if (!isRecord(parsed) || parsed.contracts === undefined) return [];
  if (!isRecord(parsed.contracts) || !Array.isArray(parsed.contracts.sources)
    || parsed.contracts.sources.some((entry) => typeof entry !== "string")) {
    issues.push({
      code: "contract_sources.config_invalid_sources",
      severity: "error",
      path: ROOT_REKON_CONFIG_FILE,
      message: "contracts.sources must be an array of repository-relative file paths.",
    });
    return [];
  }
  return parsed.contracts.sources as string[];
}

async function discoverColocatedSources(
  repoRoot: string,
  directory: string,
  candidates: Set<string>,
  issues: RepositoryContractSourceIssue[],
  budget: { directories: number; maxDirectories: number },
): Promise<void> {
  budget.directories += 1;
  if (budget.directories > budget.maxDirectories) {
    if (!issues.some((issue) => issue.code === "contract_sources.directory_budget_exceeded")) {
      issues.push({
        code: "contract_sources.directory_budget_exceeded",
        severity: "error",
        message: `Contract discovery exceeded ${budget.maxDirectories} directories. Configure explicit contract source paths.`,
      });
    }
    return;
  }
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name) || absolutePath === resolve(repoRoot, "rekon")) continue;
      await discoverColocatedSources(repoRoot, absolutePath, candidates, issues, budget);
    } else if (entry.isFile() && entry.name === COLOCATED_REPOSITORY_CONTRACT_FILE) {
      candidates.add(toRepoPath(relative(repoRoot, absolutePath)));
    }
  }
}

async function discoverCentralSources(
  repoRoot: string,
  directory: string,
  candidates: Set<string>,
  issues: RepositoryContractSourceIssue[],
  budget: { directories: number; maxDirectories: number },
): Promise<void> {
  let stats;
  try {
    stats = await lstat(directory);
  } catch (error) {
    if (isNotFound(error)) return;
    throw error;
  }
  if (stats.isSymbolicLink()) {
    issues.push({
      code: "contract_sources.central_directory_symlink",
      severity: "error",
      path: CENTRAL_REPOSITORY_CONTRACT_DIRECTORY,
      message: "The central contract directory may not be a symlink.",
    });
    return;
  }
  if (!stats.isDirectory()) return;
  budget.directories += 1;
  if (budget.directories > budget.maxDirectories) return;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await discoverCentralSources(repoRoot, absolutePath, candidates, issues, budget);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      candidates.add(toRepoPath(relative(repoRoot, absolutePath)));
    }
  }
}

async function readSource(
  repoRoot: string,
  realRepoRoot: string,
  relativePath: string,
  issues: RepositoryContractSourceIssue[],
): Promise<LoadedRepositoryContractSource | undefined> {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!isInside(absolutePath, repoRoot)) {
    issues.push({ code: "contract_sources.path_outside_repo", severity: "error", path: relativePath, message: "Contract source is outside the repository." });
    return undefined;
  }
  let stats;
  try {
    stats = await lstat(absolutePath);
  } catch (error) {
    issues.push({
      code: isNotFound(error) ? "contract_sources.source_missing" : "contract_sources.source_unreadable",
      severity: "error",
      path: relativePath,
      message: isNotFound(error) ? "Configured contract source does not exist." : (error as Error).message,
    });
    return undefined;
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    issues.push({ code: "contract_sources.source_not_regular_file", severity: "error", path: relativePath, message: "Contract source must be a regular file and may not be a symlink." });
    return undefined;
  }
  const realSourcePath = await realpath(absolutePath);
  if (!isInside(realSourcePath, realRepoRoot)) {
    issues.push({ code: "contract_sources.source_outside_repo", severity: "error", path: relativePath, message: "Contract source resolves outside the repository." });
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(absolutePath, "utf8")) as unknown;
  } catch (error) {
    issues.push({ code: "contract_sources.source_invalid_json", severity: "error", path: relativePath, message: `Contract source is not valid JSON: ${(error as Error).message}` });
    return undefined;
  }
  const validation = validateRepositoryContractSourceDocument(parsed);
  if (!validation.ok) {
    for (const issue of validation.issues) {
      issues.push({
        code: "contract_sources.source_invalid",
        severity: "error",
        path: relativePath,
        message: `${issue.path}: ${issue.message}`,
      });
    }
    return undefined;
  }
  return { path: relativePath, digest: digestJson(parsed), document: validation.value };
}

function validateConfiguredPath(path: string, issues: RepositoryContractSourceIssue[]): string | undefined {
  const normalized = toRepoPath(path.trim().replace(/^\.\//u, ""));
  if (!normalized || isAbsolute(normalized) || normalized.split("/").includes("..") || normalized.includes("\\")) {
    issues.push({ code: "contract_sources.configured_path_invalid", severity: "error", path, message: "Configured contract paths must be repository-relative forward-slash paths." });
    return undefined;
  }
  if (normalized === ".rekon" || normalized.startsWith(".rekon/") || normalized.includes(".codebase-intel")) {
    issues.push({ code: "contract_sources.configured_path_private", severity: "error", path, message: "Configured contract paths may not use generated or legacy workspaces." });
    return undefined;
  }
  return normalized;
}

function validateWritableContractPath(path: string): string {
  const normalized = toRepoPath(path.trim().replace(/^\.\//u, ""));
  if (!normalized || isAbsolute(normalized) || normalized.includes("\\") || normalized.split("/").includes("..")) {
    throw new Error("Writable contract paths must be repository-relative forward-slash paths.");
  }
  if (!normalized.startsWith(`${CENTRAL_REPOSITORY_CONTRACT_DIRECTORY}/`) || !normalized.endsWith(".json")) {
    throw new Error(`Writable contract paths must be JSON files under ${CENTRAL_REPOSITORY_CONTRACT_DIRECTORY}/.`);
  }
  return normalized;
}

async function ensureSafeDirectoryChain(repoRoot: string, realRepoRoot: string, targetDirectory: string): Promise<void> {
  const rel = relative(repoRoot, targetDirectory);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Contract source directory is outside the repository.");
  let current = repoRoot;
  for (const segment of rel.split(sep).filter(Boolean)) {
    current = join(current, segment);
    let stats;
    try {
      stats = await lstat(current);
    } catch (error) {
      if (!isNotFound(error)) throw error;
      await mkdir(current);
      stats = await lstat(current);
    }
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error(`Contract source directory ${toRepoPath(relative(repoRoot, current))} must not be a symlink.`);
    }
    const physical = await realpath(current);
    if (!isInside(physical, realRepoRoot)) throw new Error("Contract source directory resolves outside the repository.");
  }
}

function isInside(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function toRepoPath(path: string): string {
  return path.split(sep).join("/");
}

function isNotFound(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";

import { extractSourceDependencies } from "@rekon/capability-js-ts";
import type {
  ChangeDependency,
  ChangeDependencyDelta,
  ChangeFileEvidence,
} from "@rekon/capability-model";

const execFileAsync = promisify(execFile);
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);

export type RepositoryChangeEvidence = {
  requestedBaseRef: string;
  resolvedBaseCommit?: string;
  files: ChangeFileEvidence[];
  dependencyChanges: ChangeDependencyDelta[];
  warnings: string[];
};

/** Read-only host adapter for Git baseline and current-source evidence. */
export async function collectRepositoryChangeEvidence(input: {
  repoRoot: string;
  baseRef: string;
  changedPaths: string[];
  knownPaths?: string[];
}): Promise<RepositoryChangeEvidence> {
  const root = await realpath(resolve(input.repoRoot));
  const paths = unique(input.changedPaths.map(normalizePath).filter(Boolean));
  const warnings: string[] = [];
  const resolvedBaseCommit = await resolveBaseCommit(root, input.baseRef);
  if (!resolvedBaseCommit) {
    warnings.push(`git baseline unavailable: ${input.baseRef} is not a readable commit in this repository`);
  }
  const fileSet = new Set(unique([...(input.knownPaths ?? []), ...paths].map(normalizePath).filter(Boolean)));
  const files: ChangeFileEvidence[] = [];
  const dependencyChanges: ChangeDependencyDelta[] = [];

  for (const path of paths) {
    const current = await readCurrentSource(root, path);
    const baseline = resolvedBaseCommit ? await readGitSource(root, resolvedBaseCommit, path) : undefined;
    const status = fileStatus(resolvedBaseCommit !== undefined, baseline?.content, current.content, current.unavailable);
    files.push({
      path,
      status,
      ...(baseline?.content !== undefined ? { beforeSha256: sha256(baseline.content) } : {}),
      ...(current.content !== undefined ? { afterSha256: sha256(current.content) } : {}),
      ...(current.message ? { message: current.message } : {}),
    });

    if (!SOURCE_EXTENSIONS.has(extname(path).toLowerCase())) continue;
    const before = baseline?.content === undefined
      ? []
      : extractSourceDependencies(path, baseline.content, fileSet);
    const after = current.content === undefined
      ? []
      : extractSourceDependencies(path, current.content, fileSet);
    dependencyChanges.push({
      path,
      added: difference(after, before),
      removed: difference(before, after),
      current: after.map(toDependency),
    });
  }

  return {
    requestedBaseRef: input.baseRef,
    ...(resolvedBaseCommit ? { resolvedBaseCommit } : {}),
    files,
    dependencyChanges,
    warnings,
  };
}

async function resolveBaseCommit(root: string, baseRef: string): Promise<string | undefined> {
  const ref = baseRef.trim();
  if (!ref || ref.startsWith("-") || ref.includes("\0") || ref.includes(":")) return undefined;
  try {
    const result = await execFileAsync(
      "git",
      ["-C", root, "rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`],
      { encoding: "utf8", maxBuffer: 1024 * 1024 },
    );
    const commit = result.stdout.trim();
    return /^[a-f0-9]{40,64}$/u.test(commit) ? commit : undefined;
  } catch {
    return undefined;
  }
}

async function readGitSource(
  root: string,
  commit: string,
  path: string,
): Promise<{ content?: string }> {
  try {
    const result = await execFileAsync(
      "git",
      ["-C", root, "show", `${commit}:${path}`],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    return { content: result.stdout };
  } catch {
    return {};
  }
}

async function readCurrentSource(
  root: string,
  path: string,
): Promise<{ content?: string; unavailable: boolean; message?: string }> {
  const absolutePath = resolve(root, path);
  const relativePath = relative(root, absolutePath);
  if (isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith("../")) {
    return { unavailable: true, message: "Path resolves outside the repository root." };
  }
  try {
    const stats = await lstat(absolutePath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      return { unavailable: true, message: "Current path is not a regular non-symlink file." };
    }
    const physicalPath = await realpath(absolutePath);
    const physicalRelative = relative(root, physicalPath);
    if (isAbsolute(physicalRelative) || physicalRelative === ".." || physicalRelative.startsWith("../")) {
      return { unavailable: true, message: "Current path resolves outside the repository root." };
    }
    return { content: await readFile(physicalPath, "utf8"), unavailable: false };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { unavailable: false };
    return {
      unavailable: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function fileStatus(
  baselineAvailable: boolean,
  before: string | undefined,
  after: string | undefined,
  currentUnavailable: boolean,
): ChangeFileEvidence["status"] {
  if (!baselineAvailable || currentUnavailable) return "unavailable";
  if (before === undefined && after === undefined) return "unchanged";
  if (before === undefined) return "added";
  if (after === undefined) return "deleted";
  return before === after ? "unchanged" : "modified";
}

function difference(
  left: Array<{ specifier: string; resolvedPath?: string }>,
  right: Array<{ specifier: string; resolvedPath?: string }>,
): ChangeDependency[] {
  const rightKeys = new Set(right.map(dependencyKey));
  return left.filter((entry) => !rightKeys.has(dependencyKey(entry))).map(toDependency);
}

function dependencyKey(value: { specifier: string; resolvedPath?: string }): string {
  return `${value.specifier}\0${value.resolvedPath ?? ""}`;
}

function toDependency(value: { specifier: string; resolvedPath?: string }): ChangeDependency {
  return {
    specifier: value.specifier,
    ...(value.resolvedPath ? { resolvedPath: value.resolvedPath } : {}),
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(value: string): string {
  const path = value.split("#")[0]?.trim().replace(/\\/gu, "/").replace(/^\.\//u, "") ?? "";
  if (!path || path.startsWith("/") || /^[A-Za-z]:\//u.test(path)) return "";
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return "";
  return segments.join("/");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

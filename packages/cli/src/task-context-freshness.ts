import { execFile } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { digestJson } from "@rekon/kernel-artifacts";
import type { ArtifactStore } from "@rekon/runtime";

const execFileAsync = promisify(execFile);
const OBSERVABLE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORED_SEGMENTS = new Set([".git", ".rekon", "node_modules", "dist", "build", "coverage"]);

type EvidenceFactLike = {
  kind?: string;
  subject?: string;
  value?: Record<string, unknown>;
};

type EvidenceGraphLike = {
  header?: { generatedAt?: string };
  facts?: EvidenceFactLike[];
};

type CapabilityGraphLike = {
  header?: { generatedAt?: string };
};

export type TaskContextFreshnessAssessment = {
  status: "fresh" | "refresh-required";
  fullRefresh: boolean;
  changedFiles: string[];
  reasons: string[];
};

export async function assessTaskContextFreshness(input: {
  repoRoot: string;
  artifacts: ArtifactStore;
  requestedPaths?: readonly string[];
}): Promise<TaskContextFreshnessAssessment> {
  const evidenceEntry = latest(await input.artifacts.list("EvidenceGraph"));
  const graphEntry = latest(await input.artifacts.list("CapabilityEvidenceGraph"));
  const reasons: string[] = [];

  if (!evidenceEntry) reasons.push("EvidenceGraph is missing");
  if (!graphEntry) reasons.push("CapabilityEvidenceGraph is missing");
  if (!evidenceEntry || !graphEntry) {
    return {
      status: "refresh-required",
      fullRefresh: true,
      changedFiles: [],
      reasons,
    };
  }

  const evidence = await input.artifacts.read(evidenceEntry) as EvidenceGraphLike;
  const graph = await input.artifacts.read(graphEntry) as CapabilityGraphLike;
  const repoRealpath = await realpath(input.repoRoot);
  const evidenceGeneratedAt = Date.parse(evidence.header?.generatedAt ?? "");
  const graphGeneratedAt = Date.parse(graph.header?.generatedAt ?? "");
  if (!Number.isFinite(evidenceGeneratedAt) || !Number.isFinite(graphGeneratedAt)) {
    return {
      status: "refresh-required",
      fullRefresh: true,
      changedFiles: [],
      reasons: ["task-context artifacts have invalid generation timestamps"],
    };
  }
  if (graphGeneratedAt < evidenceGeneratedAt) {
    reasons.push("CapabilityEvidenceGraph predates the latest EvidenceGraph");
  }

  const evidenceDigests = collectEvidenceDigests(evidence.facts ?? []);
  const requested = normalizeRequestedPaths(input.repoRoot, input.requestedPaths ?? []);
  const gitChanged = await readGitChangedPaths(input.repoRoot);
  const candidates = new Set<string>();

  for (const path of gitChanged) {
    if (isObservablePath(path, evidenceDigests)) candidates.add(path);
  }

  if (requested.length > 0) {
    for (const requestedPath of requested) {
      let matchedKnownPath = false;
      for (const knownPath of evidenceDigests.keys()) {
        if (knownPath === requestedPath || knownPath.startsWith(`${requestedPath}/`)) {
          candidates.add(knownPath);
          matchedKnownPath = true;
        }
      }
      if (!matchedKnownPath && isObservablePath(requestedPath, evidenceDigests)) {
        candidates.add(requestedPath);
      }
    }
  } else {
    for (const knownPath of evidenceDigests.keys()) candidates.add(knownPath);
  }

  const changedFiles: string[] = [];
  for (const path of [...candidates].sort()) {
    const expectedDigest = evidenceDigests.get(path);
    const absolutePath = resolve(input.repoRoot, path);
    let fileStat;
    try {
      fileStat = await lstat(absolutePath);
    } catch {
      if (expectedDigest !== undefined) changedFiles.push(path);
      continue;
    }
    if (fileStat.isSymbolicLink()) {
      changedFiles.push(path);
      continue;
    }
    if (!fileStat.isFile()) continue;

    let physicalPath: string;
    try {
      physicalPath = await realpath(absolutePath);
    } catch {
      changedFiles.push(path);
      continue;
    }
    if (!isPathWithin(repoRealpath, physicalPath)) {
      changedFiles.push(path);
      continue;
    }

    const mustHash = expectedDigest === undefined
      || requested.includes(path)
      || gitChanged.has(path)
      || fileStat.mtimeMs > evidenceGeneratedAt;
    if (!mustHash) continue;

    let contents: string;
    try {
      contents = await readFile(physicalPath, "utf8");
    } catch {
      changedFiles.push(path);
      continue;
    }
    if (expectedDigest === undefined || digestJson(contents) !== expectedDigest) {
      changedFiles.push(path);
    }
  }

  if (changedFiles.length > 0) {
    reasons.push(`${changedFiles.length} source path(s) differ from the latest EvidenceGraph`);
  }

  return {
    status: reasons.length > 0 ? "refresh-required" : "fresh",
    fullRefresh: reasons.some((reason) => reason.includes("predates")),
    changedFiles,
    reasons,
  };
}

function latest<T extends { writtenAt: string }>(entries: T[]): T | undefined {
  return entries.slice().sort((left, right) => left.writtenAt.localeCompare(right.writtenAt)).at(-1);
}

function collectEvidenceDigests(facts: readonly EvidenceFactLike[]): Map<string, string> {
  const digests = new Map<string, string>();
  for (const fact of facts) {
    if (fact.kind !== "file" && fact.kind !== "manifest") continue;
    const path = typeof fact.value?.path === "string" ? fact.value.path : fact.subject;
    const digest = typeof fact.value?.digest === "string" ? fact.value.digest : undefined;
    if (!path || !digest) continue;
    const normalized = normalizeRelativePath(path);
    if (normalized && !containsIgnoredSegment(normalized)) digests.set(normalized, digest);
  }
  return digests;
}

function normalizeRequestedPaths(repoRoot: string, paths: readonly string[]): string[] {
  const normalized = new Set<string>();
  for (const path of paths) {
    if (typeof path !== "string" || path.trim().length === 0) continue;
    const absolutePath = resolve(repoRoot, path);
    const relativePath = relative(repoRoot, absolutePath).replace(/\\/g, "/");
    if (isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith("../")) continue;
    const safePath = normalizeRelativePath(relativePath);
    if (safePath && !containsIgnoredSegment(safePath)) normalized.add(safePath);
  }
  return [...normalized].sort();
}

async function readGitChangedPaths(repoRoot: string): Promise<Set<string>> {
  const changed = new Set<string>();
  for (const args of [
    ["-C", repoRoot, "diff", "--name-only", "-z", "HEAD", "--"],
    ["-C", repoRoot, "ls-files", "--others", "--exclude-standard", "-z"],
  ]) {
    try {
      const result = await execFileAsync("git", args, {
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      });
      for (const rawPath of result.stdout.split("\0")) {
        const path = normalizeRelativePath(rawPath);
        if (path && !containsIgnoredSegment(path)) changed.add(path);
      }
    } catch {
      // Non-git repositories still receive hash-based freshness checks.
    }
  }
  return changed;
}

function isObservablePath(path: string, evidenceDigests: ReadonlyMap<string, string>): boolean {
  if (!path || containsIgnoredSegment(path)) return false;
  if (evidenceDigests.has(path)) return true;
  const fileName = path.split("/").at(-1) ?? "";
  return OBSERVABLE_EXTENSIONS.has(extname(path).toLowerCase()) || fileName === "package.json";
}

function normalizeRelativePath(path: string): string {
  const portable = path.trim().replace(/\\/g, "/");
  if (portable.startsWith("/") || /^[A-Za-z]:\//u.test(portable)) return "";
  const segments: string[] = [];
  for (const segment of portable.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") return "";
    segments.push(segment);
  }
  return segments.join("/");
}

function containsIgnoredSegment(path: string): boolean {
  return path.split("/").some((segment) => IGNORED_SEGMENTS.has(segment));
}

function isPathWithin(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === "" || (
    !isAbsolute(relativePath)
    && relativePath !== ".."
    && !relativePath.startsWith("../")
    && !relativePath.startsWith("..\\")
  );
}

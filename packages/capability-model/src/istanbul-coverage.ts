import { isAbsolute, relative, resolve } from "node:path";
import type { RuntimeGraphObservationCoverageSource } from "@rekon/kernel-repo-model";
import type { ParsedRuntimeExecutionObservation } from "./runtime-graph-observation-report.js";

export type IstanbulCoverageIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  path?: string;
};

export type IstanbulCoverageSummary = {
  totalFiles: number;
  observedFiles: number;
  uncoveredFiles: number;
  ignoredFiles: number;
};

export type ParseIstanbulCoverageInput = {
  coverage: unknown;
  repoRoot: string;
  coveragePath: string;
  coverageDigest: string;
  testPath: string;
  targetPaths?: string[];
  isolated?: boolean;
  timestamp?: string;
};

export type ParseIstanbulCoverageResult = {
  valid: boolean;
  observation?: ParsedRuntimeExecutionObservation;
  coverageSource?: RuntimeGraphObservationCoverageSource;
  summary: IstanbulCoverageSummary;
  issues: IstanbulCoverageIssue[];
};

/**
 * Convert an Istanbul `coverage-final.json` value into one explicitly
 * attributed runtime observation. Istanbul does not retain per-test identity,
 * so callers must supply the test path whose isolated run produced the file.
 */
export function parseIstanbulCoverage(
  input: ParseIstanbulCoverageInput,
): ParseIstanbulCoverageResult {
  const issues: IstanbulCoverageIssue[] = [];
  const emptySummary: IstanbulCoverageSummary = {
    totalFiles: 0,
    observedFiles: 0,
    uncoveredFiles: 0,
    ignoredFiles: 0,
  };
  const testPath = normalizeRepoPath(input.repoRoot, input.testPath, false);
  if (!testPath) {
    issues.push({
      code: "istanbul.test_path.invalid",
      severity: "error",
      message: "The coverage test path must be a repository-relative path inside the repository.",
      path: input.testPath,
    });
  }
  const coveragePath = normalizeRepoPath(input.repoRoot, input.coveragePath, false);
  if (!coveragePath) {
    issues.push({
      code: "istanbul.coverage_path.invalid",
      severity: "error",
      message: "Coverage source path must be a repository-relative path.",
    });
  }
  if (!/^[a-f0-9]{64}$/i.test(input.coverageDigest)) {
    issues.push({
      code: "istanbul.coverage_digest.invalid",
      severity: "error",
      message: "Coverage source digest must be SHA-256.",
    });
  }
  const targetPaths = [...new Set((input.targetPaths ?? []).flatMap((targetPath) => {
    const normalized = normalizeRepoPath(input.repoRoot, targetPath, false);
    if (normalized) return [normalized];
    issues.push({
      code: "istanbul.target_path.invalid",
      severity: "error",
      message: "Coverage target paths must be repository-relative paths inside the repository.",
      path: targetPath,
    });
    return [];
  }))].sort();
  if (!isRecord(input.coverage)) {
    issues.push({
      code: "istanbul.coverage.invalid",
      severity: "error",
      message: "Expected an Istanbul coverage object keyed by source file path.",
    });
  }
  if (issues.some((issue) => issue.severity === "error") || !testPath || !isRecord(input.coverage)) {
    return { valid: false, summary: emptySummary, issues };
  }

  const entries = Object.entries(input.coverage);
  const observedPaths = new Set<string>();
  const fileCoverage = new Map<string, NonNullable<RuntimeGraphObservationCoverageSource["fileCoverage"]>[number]>();
  let uncoveredFiles = 0;
  let ignoredFiles = 0;

  for (const [key, rawEntry] of entries) {
    if (!isRecord(rawEntry)) {
      ignoredFiles += 1;
      issues.push({
        code: "istanbul.file.invalid",
        severity: "warning",
        message: "Ignored a coverage entry that was not an object.",
        path: key,
      });
      continue;
    }
    const rawPath = typeof rawEntry.path === "string" && rawEntry.path.length > 0
      ? rawEntry.path
      : key;
    const sourcePath = normalizeRepoPath(input.repoRoot, rawPath, true);
    if (!sourcePath) {
      ignoredFiles += 1;
      issues.push({
        code: "istanbul.file.outside_repo",
        severity: "warning",
        message: "Ignored a coverage entry outside the repository.",
        path: rawPath,
      });
      continue;
    }
    if (sourcePath === testPath) {
      ignoredFiles += 1;
      continue;
    }
    const execution = fileExecution(rawEntry);
    if (!execution.known) {
      ignoredFiles += 1;
      issues.push({
        code: "istanbul.file.counters_missing",
        severity: "warning",
        message: "Ignored a coverage entry without Istanbul execution counters.",
        path: sourcePath,
      });
      continue;
    }
    fileCoverage.set(sourcePath, coverageForFile(sourcePath, rawEntry));
    if (!execution.executed) {
      uncoveredFiles += 1;
      continue;
    }
    if (observedPaths.has(sourcePath)) {
      ignoredFiles += 1;
      continue;
    }
    observedPaths.add(sourcePath);
  }

  const sourcePaths = [...observedPaths].sort();
  if (sourcePaths.length === 0) {
    issues.push({
      code: "istanbul.coverage.no_observed_files",
      severity: "warning",
      message: "Coverage contained no executed repository source files for this test attribution.",
    });
  }
  const summary: IstanbulCoverageSummary = {
    totalFiles: entries.length,
    observedFiles: sourcePaths.length,
    uncoveredFiles,
    ignoredFiles,
  };
  const coverageSource: RuntimeGraphObservationCoverageSource = {
    format: "istanbul",
    path: coveragePath!,
    digest: input.coverageDigest,
    testPath,
    ...(targetPaths.length > 0 ? { targetPaths } : {}),
    isolated: input.isolated === true,
    totalFiles: summary.totalFiles,
    observedFiles: summary.observedFiles,
    ignoredFiles: summary.ignoredFiles,
    fileCoverage: [...fileCoverage.values()].sort((left, right) => left.path.localeCompare(right.path)),
  };
  const observation: ParsedRuntimeExecutionObservation | undefined = sourcePaths.length > 0
    ? {
        line: 0,
        testPath,
        sourcePaths,
        routePaths: [],
        source: "istanbul-coverage",
        ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      }
    : undefined;

  return {
    valid: true,
    ...(observation ? { observation } : {}),
    coverageSource,
    summary,
    issues,
  };
}

function normalizeRepoPath(
  repoRoot: string,
  inputPath: string,
  allowAbsolute: boolean,
): string | undefined {
  if (!inputPath || inputPath.includes("\0")) return undefined;
  if (!allowAbsolute && isAbsolute(inputPath)) return undefined;
  const root = resolve(repoRoot);
  const absolutePath = isAbsolute(inputPath) ? resolve(inputPath) : resolve(root, inputPath);
  const relativePath = relative(root, absolutePath);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) return undefined;
  return relativePath.replace(/\\/g, "/");
}

function fileExecution(entry: Record<string, unknown>): { known: boolean; executed: boolean } {
  let known = false;
  let executed = false;
  for (const field of [entry.s, entry.f]) {
    if (!isRecord(field)) continue;
    for (const count of Object.values(field)) {
      if (typeof count !== "number" || !Number.isFinite(count) || count < 0) continue;
      known = true;
      if (count > 0) executed = true;
    }
  }
  if (isRecord(entry.b)) {
    for (const counts of Object.values(entry.b)) {
      if (!Array.isArray(counts)) continue;
      for (const count of counts) {
        if (typeof count !== "number" || !Number.isFinite(count) || count < 0) continue;
        known = true;
        if (count > 0) executed = true;
      }
    }
  }
  return { known, executed };
}

function coverageForFile(
  path: string,
  entry: Record<string, unknown>,
): NonNullable<RuntimeGraphObservationCoverageSource["fileCoverage"]>[number] {
  const statements = coverageCount(entry.s);
  const functions = coverageCount(entry.f);
  const branches = branchCoverageCount(entry.b);
  return {
    path,
    statements,
    functions,
    branches,
    functionRanges: functionCoverageRanges(entry.fnMap, entry.f),
  };
}

function coverageCount(value: unknown): { total: number; covered: number } {
  if (!isRecord(value)) return { total: 0, covered: 0 };
  const counts = Object.values(value).filter((count): count is number =>
    typeof count === "number" && Number.isInteger(count) && count >= 0);
  return { total: counts.length, covered: counts.filter((count) => count > 0).length };
}

function branchCoverageCount(value: unknown): { total: number; covered: number } {
  if (!isRecord(value)) return { total: 0, covered: 0 };
  const counts = Object.values(value)
    .flatMap((item) => Array.isArray(item) ? item : [])
    .filter((count): count is number => typeof count === "number" && Number.isInteger(count) && count >= 0);
  return { total: counts.length, covered: counts.filter((count) => count > 0).length };
}

function functionCoverageRanges(
  mapValue: unknown,
  countValue: unknown,
): NonNullable<RuntimeGraphObservationCoverageSource["fileCoverage"]>[number]["functionRanges"] {
  if (!isRecord(mapValue) || !isRecord(countValue)) return [];
  const ranges: NonNullable<RuntimeGraphObservationCoverageSource["fileCoverage"]>[number]["functionRanges"] = [];
  for (const [id, raw] of Object.entries(mapValue)) {
    const executionCount = countValue[id];
    if (!isRecord(raw)
      || typeof executionCount !== "number"
      || !Number.isInteger(executionCount)
      || executionCount < 0) continue;
    const lines = functionLines(raw);
    if (!lines) continue;
    ranges.push({
      ...(typeof raw.name === "string" && raw.name.length > 0 ? { name: raw.name } : {}),
      ...lines,
      executionCount,
    });
  }
  return ranges.sort((left, right) =>
    left.startLine - right.startLine
    || left.endLine - right.endLine
    || (left.name ?? "").localeCompare(right.name ?? ""));
}

function functionLines(value: Record<string, unknown>): { startLine: number; endLine: number } | undefined {
  const starts = [locationLine(value.decl, "start"), locationLine(value.loc, "start"), positiveInteger(value.line)]
    .filter((line): line is number => line !== undefined);
  const ends = [locationLine(value.decl, "end"), locationLine(value.loc, "end")]
    .filter((line): line is number => line !== undefined);
  if (starts.length === 0 || ends.length === 0) return undefined;
  return { startLine: Math.min(...starts), endLine: Math.max(...ends) };
}

function locationLine(value: unknown, endpoint: "start" | "end"): number | undefined {
  if (!isRecord(value) || !isRecord(value[endpoint])) return undefined;
  return positiveInteger(value[endpoint].line);
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

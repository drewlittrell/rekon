import { isAbsolute, relative, resolve } from "node:path";

import type {
  RuntimeGraphObservationCoverageCount,
  RuntimeGraphObservationCoverageSource,
  RuntimeGraphObservationFileCoverage,
  RuntimeGraphObservationFunctionCoverage,
} from "@rekon/kernel-repo-model";
import type { ParsedRuntimeExecutionObservation } from "./runtime-graph-observation-report.js";
import type { IstanbulCoverageIssue, IstanbulCoverageSummary } from "./istanbul-coverage.js";

export type ParseLcovCoverageInput = {
  lcov: string;
  repoRoot: string;
  coveragePath: string;
  coverageDigest: string;
  testPath: string;
  targetPaths?: string[];
  isolated?: boolean;
  timestamp?: string;
};

export type ParseLcovCoverageResult = {
  valid: boolean;
  observation?: ParsedRuntimeExecutionObservation;
  coverageSource?: RuntimeGraphObservationCoverageSource;
  summary: IstanbulCoverageSummary;
  issues: IstanbulCoverageIssue[];
};

type LcovRecord = {
  path?: string;
  statements: Map<number, number>;
  branches: Array<{ line: number; covered: boolean }>;
  functionLines: Map<string, number>;
  functionCounts: Map<string, number>;
};

export function parseLcovCoverage(input: ParseLcovCoverageInput): ParseLcovCoverageResult {
  const issues: IstanbulCoverageIssue[] = [];
  const emptySummary: IstanbulCoverageSummary = { totalFiles: 0, observedFiles: 0, uncoveredFiles: 0, ignoredFiles: 0 };
  const testPath = normalizeRepoPath(input.repoRoot, input.testPath, false);
  const coveragePath = normalizeRepoPath(input.repoRoot, input.coveragePath, false);
  if (!testPath) issues.push({ code: "lcov.test_path.invalid", severity: "error", message: "The LCOV test path must be repository-relative.", path: input.testPath });
  if (!coveragePath) issues.push({ code: "lcov.coverage_path.invalid", severity: "error", message: "LCOV source path must be repository-relative." });
  if (!/^[a-f0-9]{64}$/iu.test(input.coverageDigest)) issues.push({ code: "lcov.coverage_digest.invalid", severity: "error", message: "LCOV source digest must be SHA-256." });
  const targetPaths = normalizeTargets(input.targetPaths ?? [], input.repoRoot, issues);
  if (issues.some((issue) => issue.severity === "error") || !testPath || !coveragePath) return { valid: false, summary: emptySummary, issues };

  const records: LcovRecord[] = [];
  let current = emptyRecord();
  const flush = () => {
    if (current.path || current.statements.size > 0 || current.functionLines.size > 0 || current.branches.length > 0) records.push(current);
    current = emptyRecord();
  };
  for (const [index, rawLine] of input.lcov.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === "end_of_record") {
      flush();
      continue;
    }
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);
    if (key === "TN") continue;
    if (key === "SF") {
      if (current.path) flush();
      current.path = value;
    } else if (key === "DA") {
      const [lineNumber = Number.NaN, count = Number.NaN] = value.split(",", 2).map(Number);
      if (positiveInteger(lineNumber) && nonNegativeNumber(count)) current.statements.set(lineNumber, count);
      else issues.push({ code: "lcov.statement.invalid", severity: "warning", message: `Ignored malformed DA row ${index + 1}.` });
    } else if (key === "FN") {
      const comma = value.indexOf(",");
      const lineNumber = Number(value.slice(0, comma));
      const name = value.slice(comma + 1).trim();
      if (comma > 0 && positiveInteger(lineNumber) && name) current.functionLines.set(name, lineNumber);
      else issues.push({ code: "lcov.function.invalid", severity: "warning", message: `Ignored malformed FN row ${index + 1}.` });
    } else if (key === "FNDA") {
      const comma = value.indexOf(",");
      const count = Number(value.slice(0, comma));
      const name = value.slice(comma + 1).trim();
      if (comma > 0 && nonNegativeNumber(count) && name) current.functionCounts.set(name, count);
      else issues.push({ code: "lcov.function_count.invalid", severity: "warning", message: `Ignored malformed FNDA row ${index + 1}.` });
    } else if (key === "BRDA") {
      const [lineNumber, , , taken] = value.split(",", 4);
      const parsedLine = Number(lineNumber);
      if (positiveInteger(parsedLine) && (taken === "-" || nonNegativeNumber(Number(taken)))) current.branches.push({ line: parsedLine, covered: taken !== "-" && Number(taken) > 0 });
      else issues.push({ code: "lcov.branch.invalid", severity: "warning", message: `Ignored malformed BRDA row ${index + 1}.` });
    }
  }
  flush();

  const fileCoverage: RuntimeGraphObservationFileCoverage[] = [];
  let ignoredFiles = 0;
  for (const record of records) {
    const path = normalizeRepoPath(input.repoRoot, record.path, true);
    if (!path || path === testPath) {
      ignoredFiles += 1;
      if (record.path && path !== testPath) issues.push({ code: "lcov.file.outside_repo", severity: "warning", message: "Ignored an LCOV source path outside the repository.", path: record.path });
      continue;
    }
    const functions = [...record.functionLines.entries()].map(([name, line]) => ({ name, startLine: line, endLine: line, executionCount: record.functionCounts.get(name) ?? 0 }));
    fileCoverage.push({
      path,
      statements: count([...record.statements.values()]),
      functions: count(functions.map((entry) => entry.executionCount)),
      branches: { total: record.branches.length, covered: record.branches.filter((entry) => entry.covered).length },
      functionRanges: functions satisfies RuntimeGraphObservationFunctionCoverage[],
    });
  }
  fileCoverage.sort((left, right) => left.path.localeCompare(right.path));
  const observed = fileCoverage.filter(fileWasExecuted).map((entry) => entry.path);
  const uncoveredFiles = fileCoverage.length - observed.length;
  if (observed.length === 0) issues.push({ code: "lcov.coverage.no_observed_files", severity: "warning", message: "LCOV contained no executed repository source files for this test attribution." });
  const summary: IstanbulCoverageSummary = { totalFiles: records.length, observedFiles: observed.length, uncoveredFiles, ignoredFiles };
  const coverageSource: RuntimeGraphObservationCoverageSource = {
    format: "lcov",
    path: coveragePath,
    digest: input.coverageDigest,
    testPath,
    ...(targetPaths.length > 0 ? { targetPaths } : {}),
    isolated: input.isolated === true,
    totalFiles: summary.totalFiles,
    observedFiles: summary.observedFiles,
    ignoredFiles: summary.ignoredFiles,
    ...(issues.some((issue) => issue.severity === "warning")
      ? { warnings: issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message) }
      : {}),
    fileCoverage,
  };
  const observation = observed.length > 0 ? {
    line: 0,
    testPath,
    sourcePaths: observed,
    routePaths: [],
    source: "lcov-coverage",
    ...(input.timestamp ? { timestamp: input.timestamp } : {}),
  } satisfies ParsedRuntimeExecutionObservation : undefined;
  return { valid: true, ...(observation ? { observation } : {}), coverageSource, summary, issues };
}

function emptyRecord(): LcovRecord {
  return { statements: new Map(), branches: [], functionLines: new Map(), functionCounts: new Map() };
}

function count(values: number[]): RuntimeGraphObservationCoverageCount {
  return { total: values.length, covered: values.filter((value) => value > 0).length };
}

function fileWasExecuted(file: RuntimeGraphObservationFileCoverage): boolean {
  return file.statements.covered > 0 || file.functions.covered > 0 || file.branches.covered > 0;
}

function normalizeTargets(paths: string[], root: string, issues: IstanbulCoverageIssue[]): string[] {
  return [...new Set(paths.flatMap((path) => {
    const normalized = normalizeRepoPath(root, path, false);
    if (normalized) return [normalized];
    issues.push({ code: "lcov.target_path.invalid", severity: "error", message: "Coverage targets must be repository-relative.", path });
    return [];
  }))].sort();
}

function normalizeRepoPath(rootInput: string, value: string | undefined, allowAbsolute: boolean): string | undefined {
  if (!value || value.includes("\0") || (!allowAbsolute && isAbsolute(value))) return undefined;
  const root = resolve(rootInput);
  const absolute = isAbsolute(value) ? resolve(value) : resolve(root, value);
  const rel = relative(root, absolute);
  if (!rel || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) return undefined;
  return rel.replace(/\\/gu, "/");
}

function positiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function nonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

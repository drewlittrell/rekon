import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment, AssessmentImpact } from "@rekon/kernel-assessments";

import { isNonProductionPath } from "./grammar-divergence.js";
import type { ComplexityCoverageFunction, ComplexityCoverageRun } from "./complexity-coverage.js";

export const FUNCTION_COMPLEXITY_RULE_ID = "typescript.functionComplexity";

export const FUNCTION_COMPLEXITY_THRESHOLDS = Object.freeze({
  cyclomatic: 20,
  statements: 80,
  maxNesting: 6,
  fanOut: 15,
});

type EvidenceFactLike = {
  kind: string;
  subject: string;
  value: Record<string, unknown>;
};

type FunctionMetrics = {
  path: string;
  functionId: string;
  name: string;
  line?: number;
  endLine?: number;
  lines: number;
  statements: number;
  cyclomatic: number;
  maxNesting: number;
  fanOut: number;
};

export function evaluateFunctionComplexity(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
  coverageRuns: readonly ComplexityCoverageRun[] = [],
): Assessment[] {
  const candidates = new Map<string, FunctionMetrics>();
  const generatedFiles = new Set(facts
    .filter((fact) => fact.kind === "content_signal" && fact.value.signal === "generatedFile")
    .map((fact) => fact.subject));

  for (const fact of facts) {
    if (fact.kind !== "typescript:function-metrics") continue;
    const metrics = parseMetrics(fact);
    if (!metrics || isNonProductionPath(metrics.path) || generatedFiles.has(metrics.path)) continue;
    const key = `${metrics.path}:${metrics.functionId}`;
    const current = candidates.get(key);
    if (!current || metricTotal(metrics) > metricTotal(current)) candidates.set(key, metrics);
  }

  return [...candidates.values()]
    .sort((left, right) => left.path.localeCompare(right.path) || left.functionId.localeCompare(right.functionId))
    .flatMap((metrics) => {
      const exceeded = exceededSignals(metrics);
      if (exceeded.length < 2) return [];
      const rootCauseKey = `${FUNCTION_COMPLEXITY_RULE_ID}:${metrics.path}:${metrics.functionId}`;
      const impact = complexityImpact(metrics, exceeded.length);
      const coverage = complexityCoverage(metrics, coverageRuns);
      const coverageRefs = coverage
        ? uniqueRefs(coverage.observations.flatMap((observation) => [observation.reportRef, observation.verificationRunRef]))
        : [];
      const coverageDescription = coverageDescriptionFor(coverage);

      return [{
        id: `assessment:${rootCauseKey}`,
        kind: "risk" as const,
        type: "maintainability",
        impact,
        title: `Multi-signal complexity hotspot in ${metrics.name}`,
        description: `The function exceeds ${exceeded.length} independent complexity thresholds: ${exceeded.join(", ")}.${coverageDescription}`,
        subjects: [`${metrics.path}#${metrics.functionId}`],
        files: [metrics.path],
        ruleId: FUNCTION_COMPLEXITY_RULE_ID,
        suggestedAction: coverage?.status === "target-not-observed"
          ? "Fix the declared isolated test target so it executes this function before changing its responsibilities or control flow."
          : coverage?.status === "not-observed"
            ? "Review whether the recorded isolated tests should exercise this function; if so, add focused coverage before changing its responsibilities or control flow."
            : "Review whether control flow or responsibilities can be separated, and protect any change with focused tests.",
        evidence: [evidenceRef, ...coverageRefs],
        rootCauseKey,
        confidence: {
          score: 0.9,
          basis: "deterministic" as const,
          verification: "corroborated" as const,
          rationale: "Multiple independent AST measurements identify a concentrated maintenance risk; runtime impact remains unproven.",
        },
        ...(coverage
          ? {
              supportingSignals: [{
                producer: "@rekon/capability-model.istanbul-coverage",
                signalType: `isolated-coverage:${coverage.status}`,
                evidence: coverageRefs,
                details: {
                  scope: "recorded-isolated-tests",
                  tests: coverage.observations.map((observation) => observation.testPath),
                  declaredTargets: [...new Set(coverage.observations.flatMap((observation) => observation.targetPaths))].sort(),
                },
              }],
            }
          : {}),
        details: {
          functionId: metrics.functionId,
          functionName: metrics.name,
          location: { line: metrics.line, endLine: metrics.endLine },
          metrics: {
            lines: metrics.lines,
            statements: metrics.statements,
            cyclomatic: metrics.cyclomatic,
            maxNesting: metrics.maxNesting,
            fanOut: metrics.fanOut,
          },
          thresholds: FUNCTION_COMPLEXITY_THRESHOLDS,
          exceededSignals: exceeded,
          ...(coverage ? { coverage } : {}),
        },
      } satisfies Assessment];
    });
}

export type FunctionComplexityCoverageStatus =
  | "observed-passing"
  | "observed-failing"
  | "target-not-observed"
  | "not-observed";

export type FunctionComplexityCoverageObservation = {
  testPath: string;
  commandStatus: "passed" | "failed";
  executionCount: number;
  targetPaths: string[];
  targetDeclared: boolean;
  reportRef: ArtifactRef;
  verificationRunRef: ArtifactRef;
};

export type FunctionComplexityCoverage = {
  scope: "recorded-isolated-tests";
  status: FunctionComplexityCoverageStatus;
  observations: FunctionComplexityCoverageObservation[];
};

function complexityCoverage(
  metrics: FunctionMetrics,
  runs: readonly ComplexityCoverageRun[],
): FunctionComplexityCoverage | undefined {
  if (metrics.line === undefined || metrics.endLine === undefined) return undefined;
  const observations: FunctionComplexityCoverageObservation[] = [];
  for (const run of runs) {
    const file = run.files.find((candidate) => candidate.path === metrics.path);
    if (!file) continue;
    const range = matchFunctionCoverage(metrics, file.functions);
    if (!range) continue;
    if (run.commandStatus === "failed" && range.executionCount === 0) continue;
    observations.push({
      testPath: run.testPath,
      commandStatus: run.commandStatus,
      executionCount: range.executionCount,
      targetPaths: run.targetPaths ?? [],
      targetDeclared: (run.targetPaths ?? []).includes(metrics.path),
      reportRef: run.reportRef,
      verificationRunRef: run.verificationRunRef,
    });
  }
  if (observations.length === 0) return undefined;
  observations.sort((left, right) => left.testPath.localeCompare(right.testPath));
  const status: FunctionComplexityCoverageStatus = observations.some((item) => item.commandStatus === "passed" && item.executionCount > 0)
    ? "observed-passing"
    : observations.some((item) => item.executionCount > 0)
      ? "observed-failing"
      : observations.some((item) => item.commandStatus === "passed" && item.targetDeclared)
        ? "target-not-observed"
        : "not-observed";
  return { scope: "recorded-isolated-tests", status, observations };
}

function matchFunctionCoverage(
  metrics: FunctionMetrics,
  ranges: readonly ComplexityCoverageFunction[],
): ComplexityCoverageFunction | undefined {
  const start = metrics.line!;
  const end = metrics.endLine!;
  const metricName = normalizeFunctionName(metrics.name);
  return ranges
    .map((range) => {
      const overlap = Math.max(0, Math.min(end, range.endLine) - Math.max(start, range.startLine) + 1);
      const ratio = overlap / Math.max(1, end - start + 1);
      const nameMatch = range.name ? normalizeFunctionName(range.name) === metricName : false;
      return { range, ratio, nameMatch, span: range.endLine - range.startLine };
    })
    .filter((candidate) => candidate.ratio >= 0.6 || (candidate.nameMatch && candidate.ratio > 0))
    .sort((left, right) =>
      Number(right.nameMatch) - Number(left.nameMatch)
      || right.ratio - left.ratio
      || left.span - right.span)[0]?.range;
}

function normalizeFunctionName(value: string): string {
  return value.split(".").at(-1)!.replace(/#\d+$/, "").replace(/^\(anonymous(?:_\d+)?\)$/, "anonymous");
}

function coverageDescriptionFor(coverage: FunctionComplexityCoverage | undefined): string {
  if (!coverage) return "";
  if (coverage.status === "observed-passing") {
    return " Recorded isolated coverage shows that at least one passing test executed this function; this does not prove assertion coverage.";
  }
  if (coverage.status === "observed-failing") {
    return " Recorded isolated coverage shows execution only during a failed test, so it does not establish protection.";
  }
  if (coverage.status === "target-not-observed") {
    return " A passing isolated test explicitly targeted this source file but did not execute this function; this is a scoped coverage gap, not a repository-wide coverage claim.";
  }
  return " Recorded passing isolated tests did not execute this function; that statement is scoped to those tests, not a global coverage claim.";
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const unique = new Map<string, ArtifactRef>();
  for (const ref of refs) unique.set(`${ref.type}:${ref.id}`, ref);
  return [...unique.values()];
}

function parseMetrics(fact: EvidenceFactLike): FunctionMetrics | undefined {
  const path = stringValue(fact.value.path);
  const functionId = stringValue(fact.value.functionId);
  const name = stringValue(fact.value.name);
  const lines = numberValue(fact.value.lines);
  const statements = numberValue(fact.value.statements);
  const cyclomatic = numberValue(fact.value.cyclomatic);
  const maxNesting = numberValue(fact.value.maxNesting);
  const fanOut = numberValue(fact.value.fanOut);
  if (!path || !functionId || !name || lines === undefined || statements === undefined || cyclomatic === undefined || maxNesting === undefined || fanOut === undefined) {
    return undefined;
  }
  return {
    path,
    functionId,
    name,
    lines,
    statements,
    cyclomatic,
    maxNesting,
    fanOut,
    ...(numberValue(fact.value.line) !== undefined ? { line: numberValue(fact.value.line) } : {}),
    ...(numberValue(fact.value.endLine) !== undefined ? { endLine: numberValue(fact.value.endLine) } : {}),
  };
}

function exceededSignals(metrics: FunctionMetrics): string[] {
  const signals: string[] = [];
  if (metrics.cyclomatic >= FUNCTION_COMPLEXITY_THRESHOLDS.cyclomatic) signals.push("cyclomatic");
  if (metrics.statements >= FUNCTION_COMPLEXITY_THRESHOLDS.statements) signals.push("statements");
  if (metrics.maxNesting >= FUNCTION_COMPLEXITY_THRESHOLDS.maxNesting) signals.push("maxNesting");
  if (metrics.fanOut >= FUNCTION_COMPLEXITY_THRESHOLDS.fanOut) signals.push("fanOut");
  return signals;
}

function complexityImpact(metrics: FunctionMetrics, exceededCount: number): AssessmentImpact {
  return exceededCount >= 3 || metrics.cyclomatic >= 50 ? "high" : "medium";
}

function metricTotal(metrics: FunctionMetrics): number {
  return metrics.statements + metrics.cyclomatic + metrics.maxNesting + metrics.fanOut;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

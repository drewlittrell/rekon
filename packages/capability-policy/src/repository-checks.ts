import { createHash } from "node:crypto";

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type Assessment,
  evaluateFindingPromotion,
} from "@rekon/kernel-assessments";
import type { Finding } from "@rekon/kernel-findings";
import type { LintReport, TestReport } from "@rekon/kernel-repo-model";

import {
  sourceQualityRootCauseKey,
  sourceQualitySignalPolicy,
} from "./source-quality.js";
import {
  type ParsedRepositoryDiagnostic,
  type RepositoryCheckCategory,
  parseRepositoryDiagnostics,
} from "./repository-diagnostic-parser.js";

export const REPOSITORY_CHECK_FAILURE_RULE_ID = "repository.checkFailure";

const MAX_RUNS = 20;
const MAX_DIRECT_IMPORT_CONTEXT = 25;
const MAX_TRANSITIVE_IMPORT_CONTEXT = 50;
const FAILURE_STATUSES = new Set(["failed", "timeout", "killed"]);
const ENVIRONMENT_FAILURE = /\b(?:command not found|enoent|eai_again|enotfound|econnrefused|could not determine executable|not recognized as an internal or external command)\b/i;

type EvidenceGraphLike = {
  header: ArtifactHeader;
  facts: Array<{
    kind: string;
    subject: string;
    value: Record<string, unknown>;
    confidence: number;
  }>;
};

type VerificationRunLike = {
  header?: ArtifactHeader;
  status?: string;
  verificationPlanRef?: ArtifactRef;
  commands?: VerificationRunCommandLike[];
};

type VerificationRunCommandLike = {
  command?: string;
  argv?: unknown[];
  status?: string;
  exitCode?: number | null;
  stdoutDigest?: string;
  stderrDigest?: string;
  stdoutExcerpt?: { text?: string; truncated?: boolean };
  stderrExcerpt?: { text?: string; truncated?: boolean };
};

type ArtifactReaderLike = {
  list(type?: string): Promise<ArtifactRef[]>;
  read(ref: ArtifactRef): Promise<unknown>;
};

type CheckOccurrence = {
  ref: ArtifactRef;
  run: VerificationRunLike;
  command: VerificationRunCommandLike;
  category: RepositoryCheckCategory;
  commandText: string;
  output: string;
  signature: string;
  sourcePaths: string[];
  currentEvidence: boolean;
  coherence: "commit" | "observed_after_evidence" | "none";
  environmentFailure: boolean;
  diagnostic?: ParsedRepositoryDiagnostic;
  relatedContext?: TestRelatedGraphContext;
  blastRadius?: ImportBlastRadiusContext;
};

type CheckGroup = {
  key: string;
  category: RepositoryCheckCategory;
  commandText: string;
  signature: string;
  occurrences: CheckOccurrence[];
  diagnostic?: ParsedRepositoryDiagnostic;
  relatedContext?: TestRelatedGraphContext;
  blastRadius?: ImportBlastRadiusContext;
};

type GraphSliceLike = {
  header?: ArtifactHeader;
  nodes?: Array<{
    id?: string;
    kind?: string;
    metadata?: Record<string, unknown>;
  }>;
  edges?: Array<{
    source?: string;
    target?: string;
    kind?: string;
    weight?: number;
    metadata?: Record<string, unknown>;
  }>;
};

type ImportRelationship = "value" | "type";

type ImportContextEdge = {
  path: string;
  relationship: ImportRelationship;
};

type ImportDependent = {
  path: string;
  distance: number;
};

type ImportBlastRadiusContext = {
  graphRef: ArtifactRef;
  sourceFile: string;
  directDependents: ImportContextEdge[];
  directDependencies: ImportContextEdge[];
  transitiveDependents: ImportDependent[];
  totalDirectDependentCount: number;
  totalDirectDependencyCount: number;
  totalTransitiveDependentCount: number;
  truncated: boolean;
};

type RelatedApplicationNode = {
  id: string;
  relationship: string;
  confidence?: number;
  path?: string;
  routePath?: string;
  capability?: string;
  sharedFiles?: string[];
};

type TestRelatedGraphContext = {
  graphRef: ArtifactRef;
  testFile: string;
  dependencyFiles: string[];
  observedFiles: string[];
  routes: RelatedApplicationNode[];
  screens: RelatedApplicationNode[];
  capabilities: RelatedApplicationNode[];
  observedRoutes: RelatedApplicationNode[];
  observedScreens: RelatedApplicationNode[];
};

type SourceQualityFact = {
  file: string;
  signal: string;
  line?: number;
  column?: number;
};

export type RepositoryCheckEvaluation = {
  findings: Finding[];
  assessments: Assessment[];
  inputRefs: ArtifactRef[];
  promotedRootCauseKeys: Set<string>;
  sourceRootCauseKeys: Set<string>;
};

export async function evaluateRepositoryChecks(
  graph: EvidenceGraphLike,
  evidenceRef: ArtifactRef,
  artifacts: ArtifactReaderLike,
): Promise<RepositoryCheckEvaluation> {
  const refs = (await artifacts.list("VerificationRun")).slice(-MAX_RUNS);
  const applicationGraph = await latestApplicationGraph(artifacts);
  const importGraph = await latestCurrentImportGraph(artifacts, evidenceRef);
  const sourceFiles = new Set(
    graph.facts
      .filter((fact) => fact.kind === "file")
      .map((fact) => typeof fact.value.path === "string" ? fact.value.path : fact.subject),
  );
  const sourceQualityFacts = readSourceQualityFacts(graph);
  const occurrences: CheckOccurrence[] = [];
  const inputRefs: ArtifactRef[] = [];

  for (const ref of refs) {
    const run = await artifacts.read(ref) as VerificationRunLike;
    if (!sameRepository(graph.header, run.header)) continue;
    let used = false;

    for (const command of run.commands ?? []) {
      if (!FAILURE_STATUSES.has(command.status ?? "")) continue;
      const commandText = commandTextFor(command);
      const category = classifyRepositoryCheck(commandText);
      if (!category) continue;
      const output = commandOutput(command);
      const parsedDiagnostics = parseRepositoryDiagnostics({
        category,
        output,
        sourcePaths: [...sourceFiles],
      });
      const diagnostics = parsedDiagnostics.length > 0 ? parsedDiagnostics : [undefined];
      for (const diagnostic of diagnostics) {
        const matchedPaths = diagnostic?.file
          ? [diagnostic.file]
          : [...sourceFiles].filter((path) => output.includes(path)).sort();
        const relatedContext = category === "test" && diagnostic?.file && applicationGraph
          ? relatedGraphContextForTest(applicationGraph.value, applicationGraph.ref, diagnostic.file)
          : undefined;
        const blastRadius = diagnostic?.file && importGraph
          ? importBlastRadiusForFile(importGraph.value, importGraph.ref, diagnostic.file)
          : undefined;
        occurrences.push({
          ref,
          run,
          command,
          category,
          commandText,
          output,
          signature: failureSignature(category, commandText, command, output, diagnostic),
          sourcePaths: matchedPaths,
          currentEvidence: isCurrentEvidence(graph.header, run.header),
          coherence: evidenceCoherence(graph.header, run.header),
          environmentFailure: ENVIRONMENT_FAILURE.test(output),
          ...(diagnostic ? { diagnostic } : {}),
          ...(relatedContext ? { relatedContext } : {}),
          ...(blastRadius ? { blastRadius } : {}),
        });
        if (relatedContext) inputRefs.push(relatedContext.graphRef);
        if (blastRadius) inputRefs.push(blastRadius.graphRef);
      }
      used = true;
    }
    if (used) inputRefs.push(ref);
  }

  const testReportRefs = (await artifacts.list("TestReport")).slice(-MAX_RUNS);
  for (const ref of testReportRefs) {
    const report = await artifacts.read(ref) as TestReport;
    if (!sameRepository(graph.header, report.header)) continue;
    let used = false;
    for (const testCase of report.cases ?? []) {
      if (testCase.status !== "failed" && testCase.status !== "error") continue;
      const diagnostic: ParsedRepositoryDiagnostic = {
        parser: "junit",
        severity: "error",
        code: `junit:${testCase.status}`,
        message: testCase.message ?? `${testCase.suite}: ${testCase.name}`,
        ...(testCase.file ? { file: testCase.file } : {}),
        ...(testCase.line ? { line: testCase.line } : {}),
      };
      addImportedOccurrence({
        graph,
        evidenceRef,
        ref,
        header: report.header,
        category: "test",
        commandText: "Imported JUnit report",
        diagnostic,
        sourceFiles,
        applicationGraph,
        importGraph,
        occurrences,
        inputRefs,
      });
      used = true;
    }
    if (used) inputRefs.push(ref);
  }

  const lintReportRefs = (await artifacts.list("LintReport")).slice(-MAX_RUNS);
  for (const ref of lintReportRefs) {
    const report = await artifacts.read(ref) as LintReport;
    if (!sameRepository(graph.header, report.header)) continue;
    let used = false;
    for (const lint of report.diagnostics ?? []) {
      if (lint.severity !== "error") continue;
      const diagnostic: ParsedRepositoryDiagnostic = {
        parser: "eslint-json",
        severity: "error",
        message: lint.message,
        file: lint.file,
        ...(lint.line ? { line: lint.line } : {}),
        ...(lint.column ? { column: lint.column } : {}),
        ...(lint.ruleId ? { code: lint.ruleId } : {}),
      };
      addImportedOccurrence({
        graph,
        evidenceRef,
        ref,
        header: report.header,
        category: "lint",
        commandText: "Imported ESLint JSON report",
        diagnostic,
        sourceFiles,
        applicationGraph,
        importGraph,
        occurrences,
        inputRefs,
      });
      used = true;
    }
    if (used) inputRefs.push(ref);
  }

  const findings: Finding[] = [];
  const assessments: Assessment[] = [];
  const promotedRootCauseKeys = new Set<string>();
  const sourceRootCauseKeys = new Set<string>();

  for (const group of groupOccurrences(occurrences)) {
    const uniqueRuns = uniqueRefs(group.occurrences.map((occurrence) => occurrence.ref));
    const currentOccurrences = group.occurrences.filter((occurrence) => occurrence.currentEvidence);
    const currentRunRefs = uniqueRefs(currentOccurrences.map((occurrence) => occurrence.ref));
    const repeatable = currentRunRefs.length >= 2
      && currentOccurrences.every((occurrence) => occurrence.command.status === "failed")
      && currentOccurrences.every((occurrence) => !occurrence.environmentFailure)
      && currentOccurrences.every((occurrence) => occurrence.output.trim().length > 0);
    const supportingRunRefs = repeatable ? currentRunRefs : uniqueRuns;
    const matchedSourceFacts = sourceQualityFacts.filter((fact) =>
      group.occurrences.some((occurrence) => diagnosticCorroboratesSignal(occurrence, fact)),
    );

    if (matchedSourceFacts.length > 0) {
      for (const fact of matchedSourceFacts) {
        const assessment = sourceCorroborationAssessment(group, fact, evidenceRef, supportingRunRefs, repeatable);
        sourceRootCauseKeys.add(assessment.rootCauseKey);
        const promotion = evaluateFindingPromotion(assessment);
        if (promotion.eligible) {
          findings.push(findingFromAssessment(assessment, promotion.reasons));
          promotedRootCauseKeys.add(assessment.rootCauseKey);
        } else {
          assessments.push(assessment);
        }
      }
      continue;
    }

    const assessment = repositoryCheckAssessment(group, supportingRunRefs, repeatable);
    const promotion = evaluateFindingPromotion(assessment);
    if (promotion.eligible) {
      findings.push(findingFromAssessment(assessment, promotion.reasons));
      promotedRootCauseKeys.add(assessment.rootCauseKey);
    } else {
      assessments.push(assessment);
    }
  }

  return {
    findings,
    assessments,
    inputRefs: uniqueRefs(inputRefs),
    promotedRootCauseKeys,
    sourceRootCauseKeys,
  };
}

function addImportedOccurrence(input: {
  graph: EvidenceGraphLike;
  evidenceRef: ArtifactRef;
  ref: ArtifactRef;
  header: ArtifactHeader;
  category: "test" | "lint";
  commandText: string;
  diagnostic: ParsedRepositoryDiagnostic;
  sourceFiles: Set<string>;
  applicationGraph: Awaited<ReturnType<typeof latestApplicationGraph>>;
  importGraph: Awaited<ReturnType<typeof latestCurrentImportGraph>>;
  occurrences: CheckOccurrence[];
  inputRefs: ArtifactRef[];
}): void {
  const output = input.diagnostic.message;
  const command: VerificationRunCommandLike = {
    command: input.commandText,
    status: "failed",
    stdoutExcerpt: { text: output, truncated: false },
  };
  const run: VerificationRunLike = { header: input.header, commands: [command] };
  const sourcePaths = input.diagnostic.file && input.sourceFiles.has(input.diagnostic.file)
    ? [input.diagnostic.file]
    : [];
  const relatedContext = input.category === "test" && sourcePaths[0] && input.applicationGraph
    ? relatedGraphContextForTest(input.applicationGraph.value, input.applicationGraph.ref, sourcePaths[0])
    : undefined;
  const blastRadius = sourcePaths[0] && input.importGraph
    ? importBlastRadiusForFile(input.importGraph.value, input.importGraph.ref, sourcePaths[0])
    : undefined;
  const citesCurrentEvidence = input.header.inputRefs.some((ref) =>
    ref.type === input.evidenceRef.type && ref.id === input.evidenceRef.id);
  input.occurrences.push({
    ref: input.ref,
    run,
    command,
    category: input.category,
    commandText: input.commandText,
    output,
    signature: failureSignature(input.category, input.commandText, command, output, input.diagnostic),
    sourcePaths,
    currentEvidence: citesCurrentEvidence && isCurrentEvidence(input.graph.header, input.header),
    coherence: citesCurrentEvidence ? evidenceCoherence(input.graph.header, input.header) : "none",
    environmentFailure: false,
    diagnostic: input.diagnostic,
    ...(relatedContext ? { relatedContext } : {}),
    ...(blastRadius ? { blastRadius } : {}),
  });
  if (relatedContext) input.inputRefs.push(relatedContext.graphRef);
  if (blastRadius) input.inputRefs.push(blastRadius.graphRef);
}

function sourceCorroborationAssessment(
  group: CheckGroup,
  fact: SourceQualityFact,
  evidenceRef: ArtifactRef,
  runRefs: ArtifactRef[],
  repeatable: boolean,
): Assessment {
  const policy = sourceQualitySignalPolicy(fact.signal);
  if (!policy) throw new TypeError(`Unknown source-quality signal: ${fact.signal}`);
  const rootCauseKey = sourceQualityRootCauseKey(policy.ruleId, fact.file, fact.signal);
  const locations = [{ ...(fact.line ? { line: fact.line } : {}), ...(fact.column ? { column: fact.column } : {}) }];

  return {
    id: `assessment:${rootCauseKey}:repository-check`,
    kind: "risk",
    type: policy.type,
    impact: policy.impact,
    title: policy.title,
    description: repeatable
      ? `${policy.description} The repository's ${group.category} check reproduced a matching diagnostic at this location.`
      : `${policy.description} A repository ${group.category} check reported a matching diagnostic once; repeat it before treating the signal as a finding.`,
    subjects: [fact.file],
    files: [fact.file],
    ruleId: policy.ruleId,
    suggestedAction: policy.suggestedAction,
    evidence: uniqueRefs([
      evidenceRef,
      ...runRefs,
      ...(group.relatedContext ? [group.relatedContext.graphRef] : []),
      ...(group.blastRadius ? [group.blastRadius.graphRef] : []),
    ]),
    rootCauseKey,
    confidence: {
      score: repeatable ? 0.98 : 0.9,
      basis: "mixed",
      verification: repeatable ? "verified" : "corroborated",
      rationale: repeatable
        ? "AST evidence and two distinct verification runs coherent with the current evidence state report the same location-specific diagnostic."
        : "AST evidence and one verification run report the same location-specific diagnostic.",
    },
    applicableLaw: {
      id: `repository-check:${group.category}`,
      description: `Repository-native ${group.category} command: ${group.commandText}`,
      sourceRef: group.occurrences[0]?.run.verificationPlanRef,
    },
    supportingSignals: repositoryCheckSupportingSignals(group, runRefs),
    details: {
      signal: fact.signal,
      locations,
      command: group.commandText,
      checkCategory: group.category,
      runCount: runRefs.length,
      reproducible: repeatable,
      diagnosticSignature: group.signature,
      ...(group.diagnostic ? { diagnostic: group.diagnostic } : {}),
      ...(group.relatedContext ? { relatedContext: group.relatedContext } : {}),
      ...(group.blastRadius ? { blastRadius: group.blastRadius } : {}),
      coherence: coherenceFor(group),
    },
  };
}

function repositoryCheckAssessment(
  group: CheckGroup,
  runRefs: ArtifactRef[],
  repeatable: boolean,
): Assessment {
  const rootCauseKey = `repository-check:${group.category}:${group.signature}`;
  const sourcePaths = [...new Set(group.occurrences.flatMap((occurrence) => occurrence.sourcePaths))].sort();
  const hasEnvironmentFailure = group.occurrences.some((occurrence) => occurrence.environmentFailure);
  const hasTimeout = group.occurrences.some((occurrence) => occurrence.command.status !== "failed");

  return {
    id: `assessment:${rootCauseKey}`,
    kind: "risk",
    type: "repository_check_failure",
    impact: group.category === "test" || group.category === "build" ? "high" : "medium",
    title: `Repository ${group.category} check failed`,
    description: repeatable
      ? `The repository-native command \`${group.commandText}\` reproduced the same failure on the current evidence state.`
      : `The repository-native command \`${group.commandText}\` failed, but the failure is not yet reproducible on the current evidence state.`,
    subjects: sourcePaths.length > 0 ? sourcePaths : [group.commandText],
    ...(sourcePaths.length > 0 ? { files: sourcePaths } : {}),
    ruleId: REPOSITORY_CHECK_FAILURE_RULE_ID,
    suggestedAction: `Inspect the recorded ${group.category} output, correct the root cause, and rerun the same command.`,
    evidence: uniqueRefs([
      ...runRefs,
      ...(group.relatedContext ? [group.relatedContext.graphRef] : []),
      ...(group.blastRadius ? [group.blastRadius.graphRef] : []),
    ]),
    rootCauseKey,
    confidence: {
      score: repeatable ? 0.98 : hasEnvironmentFailure || hasTimeout ? 0.65 : 0.85,
      basis: "deterministic",
      verification: repeatable ? "verified" : "corroborated",
      rationale: repeatable
        ? "Two distinct verification runs coherent with the current evidence state produced the same normalized failure."
        : hasEnvironmentFailure
          ? "The recorded output resembles an environment or dependency failure and is not eligible for automatic promotion."
          : hasTimeout
            ? "Timeout and killed executions are operational evidence, not proof of a repository defect."
            : "One failed execution is evidence of a check failure, but not yet proof that the defect is reproducible.",
    },
    applicableLaw: {
      id: `repository-check:${group.category}`,
      description: `Repository-native ${group.category} command: ${group.commandText}`,
      sourceRef: group.occurrences[0]?.run.verificationPlanRef,
    },
    supportingSignals: repositoryCheckSupportingSignals(group, runRefs),
    details: {
      command: group.commandText,
      checkCategory: group.category,
      runCount: runRefs.length,
      reproducible: repeatable,
      environmentFailure: hasEnvironmentFailure,
      diagnosticSignature: group.signature,
      sourcePaths,
      ...(group.diagnostic ? { diagnostic: group.diagnostic } : {}),
      ...(group.relatedContext ? { relatedContext: group.relatedContext } : {}),
      ...(group.blastRadius ? { blastRadius: group.blastRadius } : {}),
      coherence: coherenceFor(group),
    },
  };
}

function findingFromAssessment(assessment: Assessment, promotionReasons: string[]): Finding {
  return {
    id: `finding:${assessment.rootCauseKey}`,
    rootCauseKey: assessment.rootCauseKey,
    type: assessment.type,
    severity: assessment.impact,
    title: assessment.title,
    description: assessment.description,
    subjects: assessment.subjects,
    ...(assessment.files ? { files: assessment.files } : {}),
    ...(assessment.ruleId ? { ruleId: assessment.ruleId } : {}),
    ...(assessment.suggestedAction ? { suggestedAction: assessment.suggestedAction } : {}),
    evidence: assessment.evidence,
    details: {
      ...(assessment.details ?? {}),
      promotionReasons,
      confidence: assessment.confidence,
      ...(assessment.applicableLaw ? { applicableLaw: assessment.applicableLaw } : {}),
    },
  };
}

function readSourceQualityFacts(graph: EvidenceGraphLike): SourceQualityFact[] {
  return graph.facts.flatMap((fact) => {
    if (fact.kind !== "typescript:source-quality") return [];
    const file = typeof fact.value.path === "string" ? fact.value.path : fact.subject.split(":")[0] ?? fact.subject;
    const signal = typeof fact.value.signal === "string" ? fact.value.signal : "";
    if (!sourceQualitySignalPolicy(signal)) return [];
    return [{
      file,
      signal,
      ...(typeof fact.value.line === "number" ? { line: fact.value.line } : {}),
      ...(typeof fact.value.column === "number" ? { column: fact.value.column } : {}),
    }];
  });
}

function diagnosticCorroboratesSignal(occurrence: CheckOccurrence, fact: SourceQualityFact): boolean {
  const output = occurrence.output;
  const diagnostic = occurrence.diagnostic;
  const signalPattern = sourceDiagnosticPattern(fact.signal);
  if (diagnostic) {
    return Boolean(
      fact.line
      && signalPattern
      && diagnostic.file === fact.file
      && diagnostic.line === fact.line
      && signalPattern.test(`${diagnostic.code ?? ""} ${diagnostic.message}`),
    );
  }
  if (!fact.line || !output.includes(fact.file)) return false;
  const pathIndex = output.indexOf(fact.file);
  const localOutput = output.slice(pathIndex, pathIndex + 1600);
  const escapedPath = escapeRegExp(fact.file);
  const directLocation = new RegExp(`${escapedPath}(?::|\\()${fact.line}(?::|,|\\))`, "i");
  const blockLocation = new RegExp(`(?:^|\\n)\\s*${fact.line}:\\d+\\s+`, "m");
  if (!directLocation.test(output) && !blockLocation.test(localOutput)) return false;

  return signalPattern ? signalPattern.test(localOutput) : false;
}

function sourceDiagnosticPattern(signal: string): RegExp | undefined {
  switch (signal) {
    case "as_any_assertion":
      return /(?:no-explicit-any|unexpected\s+any|explicit\s+any)/i;
    case "non_null_assertion":
      return /(?:no-non-null-assertion|forbidden\s+non-null\s+assertion|non-null\s+assertion)/i;
    case "empty_catch":
      return /(?:no-empty|empty\s+(?:block|catch))/i;
    case "catch_only_logs":
      return /(?:error\s+suppression|swallowed\s+error|catch\s+only\s+logs)/i;
    case "placeholder_throw":
      return /(?:not implemented|todo|placeholder|implement me)/i;
    case "async_promise_executor":
      return /(?:no-async-promise-executor|async\s+promise\s+executor)/i;
    case "async_for_each_callback":
    case "async_sync_array_callback":
      return /(?:no-misused-promises|async\s+(?:array\s+)?callback|promise\s+returned.*(?:forEach|filter|some|every|find|sort))/i;
    default:
      return undefined;
  }
}

function classifyRepositoryCheck(command: string): RepositoryCheckCategory | undefined {
  const lower = command.toLowerCase();
  if (/\b(?:typecheck|tsc)\b/.test(lower)) return "typecheck";
  if (/\b(?:eslint|biome|oxlint|stylelint|lint)\b/.test(lower)) return "lint";
  if (/\b(?:vitest|jest|mocha|playwright|cypress|ava|node\s+--test|npm\s+test|pnpm\s+test|yarn\s+test|run\s+test)\b/.test(lower)) return "test";
  if (/\b(?:build|compile)\b/.test(lower)) return "build";
  return undefined;
}

function commandTextFor(command: VerificationRunCommandLike): string {
  if (typeof command.command === "string" && command.command.trim().length > 0) return normalizeWhitespace(command.command);
  return Array.isArray(command.argv)
    ? normalizeWhitespace(command.argv.filter((value): value is string => typeof value === "string").join(" "))
    : "";
}

function commandOutput(command: VerificationRunCommandLike): string {
  return [command.stdoutExcerpt?.text, command.stderrExcerpt?.text]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");
}

function failureSignature(
  category: RepositoryCheckCategory,
  commandText: string,
  command: VerificationRunCommandLike,
  output: string,
  diagnostic?: ParsedRepositoryDiagnostic,
): string {
  const normalizedOutput = diagnostic
    ? JSON.stringify({
      parser: diagnostic.parser,
      file: diagnostic.file,
      line: diagnostic.line,
      column: diagnostic.column,
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
    })
    : normalizeDiagnosticOutput(output);
  const fallback = [command.stderrDigest, command.stdoutDigest, command.status, command.exitCode]
    .filter((value) => value !== undefined && value !== null)
    .join(":");
  return createHash("sha256")
    .update(`${category}\n${commandText}\n${normalizedOutput || fallback}`)
    .digest("hex");
}

function normalizeDiagnosticOutput(output: string): string {
  return output
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:ms|milliseconds?|seconds?|secs?)\b/gi, "<duration>")
    .replace(/\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, "<timestamp>")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function groupOccurrences(occurrences: CheckOccurrence[]): CheckGroup[] {
  const groups = new Map<string, CheckGroup>();
  for (const occurrence of occurrences) {
    const key = `${occurrence.category}:${occurrence.commandText}:${occurrence.signature}`;
    const group = groups.get(key) ?? {
      key,
      category: occurrence.category,
      commandText: occurrence.commandText,
      signature: occurrence.signature,
      occurrences: [],
      ...(occurrence.diagnostic ? { diagnostic: occurrence.diagnostic } : {}),
      ...(occurrence.relatedContext ? { relatedContext: occurrence.relatedContext } : {}),
      ...(occurrence.blastRadius ? { blastRadius: occurrence.blastRadius } : {}),
    };
    group.occurrences.push(occurrence);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function repositoryCheckSupportingSignals(
  group: CheckGroup,
  runRefs: ArtifactRef[],
): NonNullable<Assessment["supportingSignals"]> {
  return [
    ...runRefs.map((ref) => ({
      producer: ref.type === "VerificationRun" ? "@rekon/capability-verify" : "@rekon/cli.checks-ingest",
      signalType: "repository_check_failure",
      evidence: [ref],
      details: { category: group.category, signature: group.signature },
    })),
    ...(group.blastRadius
      ? [{
          producer: "@rekon/capability-graph",
          signalType: "import_blast_radius",
          evidence: [group.blastRadius.graphRef],
          details: {
            sourceFile: group.blastRadius.sourceFile,
            totalDirectDependentCount: group.blastRadius.totalDirectDependentCount,
            totalTransitiveDependentCount: group.blastRadius.totalTransitiveDependentCount,
          },
        }]
      : []),
  ];
}

async function latestCurrentImportGraph(
  artifacts: ArtifactReaderLike,
  evidenceRef: ArtifactRef,
): Promise<{ ref: ArtifactRef; value: GraphSliceLike } | undefined> {
  const refs = (await artifacts.list("GraphSlice"))
    .filter((ref) => ref.id.startsWith("import-graph-"))
    .sort((left, right) => right.id.localeCompare(left.id));
  for (const ref of refs) {
    const value = await artifacts.read(ref) as GraphSliceLike;
    const citesEvidence = value.header?.inputRefs.some((inputRef) =>
      inputRef.type === evidenceRef.type && inputRef.id === evidenceRef.id) === true;
    if (citesEvidence && Array.isArray(value.edges)) return { ref, value };
  }
  return undefined;
}

function importBlastRadiusForFile(
  graph: GraphSliceLike,
  graphRef: ArtifactRef,
  sourceFile: string,
): ImportBlastRadiusContext | undefined {
  const edges = collapseImportEdges(graph.edges ?? []);
  const outgoing = new Map<string, ImportContextEdge[]>();
  const incoming = new Map<string, ImportContextEdge[]>();
  for (const edge of edges) {
    const dependencies = outgoing.get(edge.source) ?? [];
    dependencies.push({ path: edge.target, relationship: edge.relationship });
    outgoing.set(edge.source, dependencies);
    const dependents = incoming.get(edge.target) ?? [];
    dependents.push({ path: edge.source, relationship: edge.relationship });
    incoming.set(edge.target, dependents);
  }
  for (const values of [...outgoing.values(), ...incoming.values()]) {
    values.sort((left, right) => left.path.localeCompare(right.path) || left.relationship.localeCompare(right.relationship));
  }

  const allDirectDependents = incoming.get(sourceFile) ?? [];
  const allDirectDependencies = outgoing.get(sourceFile) ?? [];
  if (allDirectDependents.length === 0 && allDirectDependencies.length === 0) return undefined;

  const distances = new Map<string, number>();
  const queue = allDirectDependents.map((dependent) => dependent.path);
  for (const dependent of queue) distances.set(dependent, 1);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    const nextDistance = (distances.get(current) ?? 0) + 1;
    for (const dependent of incoming.get(current) ?? []) {
      if (dependent.path === sourceFile && !distances.has(dependent.path)) continue;
      const knownDistance = distances.get(dependent.path);
      if (knownDistance !== undefined && knownDistance <= nextDistance) continue;
      distances.set(dependent.path, nextDistance);
      queue.push(dependent.path);
    }
  }
  distances.delete(sourceFile);
  const allTransitiveDependents = [...distances.entries()]
    .filter(([, distance]) => distance > 1)
    .map(([path, distance]) => ({ path, distance }))
    .sort((left, right) => left.distance - right.distance || left.path.localeCompare(right.path));

  return {
    graphRef,
    sourceFile,
    directDependents: allDirectDependents.slice(0, MAX_DIRECT_IMPORT_CONTEXT),
    directDependencies: allDirectDependencies.slice(0, MAX_DIRECT_IMPORT_CONTEXT),
    transitiveDependents: allTransitiveDependents.slice(0, MAX_TRANSITIVE_IMPORT_CONTEXT),
    totalDirectDependentCount: allDirectDependents.length,
    totalDirectDependencyCount: allDirectDependencies.length,
    totalTransitiveDependentCount: allTransitiveDependents.length,
    truncated: allDirectDependents.length > MAX_DIRECT_IMPORT_CONTEXT
      || allDirectDependencies.length > MAX_DIRECT_IMPORT_CONTEXT
      || allTransitiveDependents.length > MAX_TRANSITIVE_IMPORT_CONTEXT,
  };
}

function collapseImportEdges(
  edges: NonNullable<GraphSliceLike["edges"]>,
): Array<{ source: string; target: string; relationship: ImportRelationship }> {
  const byPair = new Map<string, { source: string; target: string; relationship: ImportRelationship }>();
  for (const edge of edges) {
    if (edge.kind !== "imports"
      || typeof edge.source !== "string"
      || typeof edge.target !== "string"
      || edge.source === edge.target) continue;
    const relationship: ImportRelationship = edge.metadata?.typeOnly === true
      || edge.metadata?.importKind === "type-only"
      ? "type"
      : "value";
    const key = `${edge.source}\u0000${edge.target}`;
    const current = byPair.get(key);
    if (!current || (current.relationship === "type" && relationship === "value")) {
      byPair.set(key, { source: edge.source, target: edge.target, relationship });
    }
  }
  return [...byPair.values()].sort((left, right) =>
    `${left.source}:${left.target}`.localeCompare(`${right.source}:${right.target}`));
}

async function latestApplicationGraph(
  artifacts: ArtifactReaderLike,
): Promise<{ ref: ArtifactRef; value: GraphSliceLike } | undefined> {
  const refs = (await artifacts.list("GraphSlice"))
    .filter((ref) => ref.id.startsWith("application-graph-"))
    .sort((left, right) => right.id.localeCompare(left.id));
  for (const ref of refs) {
    const value = await artifacts.read(ref) as GraphSliceLike;
    if (Array.isArray(value.nodes) && Array.isArray(value.edges)) return { ref, value };
  }
  return undefined;
}

function relatedGraphContextForTest(
  graph: GraphSliceLike,
  graphRef: ArtifactRef,
  testFile: string,
): TestRelatedGraphContext | undefined {
  const nodes = new Map(
    (graph.nodes ?? [])
      .filter((node): node is NonNullable<GraphSliceLike["nodes"]>[number] & { id: string; kind: string } =>
        typeof node.id === "string" && typeof node.kind === "string")
      .map((node) => [node.id, node]),
  );
  const source = `test:${testFile}`;
  const dependencyFiles = new Set<string>();
  const observedFiles = new Set<string>();
  const routes: RelatedApplicationNode[] = [];
  const screens: RelatedApplicationNode[] = [];
  const capabilities: RelatedApplicationNode[] = [];
  const observedRoutes: RelatedApplicationNode[] = [];
  const observedScreens: RelatedApplicationNode[] = [];

  for (const edge of graph.edges ?? []) {
    if (edge.source !== source || typeof edge.target !== "string") continue;
    if (edge.kind === "depends_on") {
      if (nodes.get(edge.target)?.kind === "file") dependencyFiles.add(edge.target);
      continue;
    }
    if (edge.kind === "observed") {
      const node = nodes.get(edge.target);
      if (!node) continue;
      if (node.kind === "file") observedFiles.add(edge.target);
      else if (node.kind === "route") {
        observedRoutes.push(relatedApplicationNode(edge.target, node.metadata, edge.metadata, edge.weight));
      } else if (node.kind === "screen") {
        observedScreens.push(relatedApplicationNode(edge.target, node.metadata, edge.metadata, edge.weight));
      }
      continue;
    }
    if (edge.kind !== "related_to") continue;
    const node = nodes.get(edge.target);
    if (!node) continue;
    const item = relatedApplicationNode(edge.target, node.metadata, edge.metadata, edge.weight);
    if (node.kind === "route") routes.push(item);
    else if (node.kind === "screen") screens.push(item);
    else if (node.kind === "capability") capabilities.push(item);
  }

  if (dependencyFiles.size === 0
    && observedFiles.size === 0
    && routes.length === 0
    && screens.length === 0
    && capabilities.length === 0
    && observedRoutes.length === 0
    && observedScreens.length === 0) {
    return undefined;
  }
  return {
    graphRef,
    testFile,
    dependencyFiles: [...dependencyFiles].sort(),
    observedFiles: [...observedFiles].sort(),
    routes: sortRelatedNodes(routes),
    screens: sortRelatedNodes(screens),
    capabilities: sortRelatedNodes(capabilities),
    observedRoutes: sortRelatedNodes(observedRoutes),
    observedScreens: sortRelatedNodes(observedScreens),
  };
}

function relatedApplicationNode(
  id: string,
  nodeMetadata: Record<string, unknown> | undefined,
  edgeMetadata: Record<string, unknown> | undefined,
  weight: number | undefined,
): RelatedApplicationNode {
  return {
    id,
    relationship: typeof edgeMetadata?.relationship === "string" ? edgeMetadata.relationship : "related",
    ...(typeof weight === "number" ? { confidence: weight } : {}),
    ...(typeof nodeMetadata?.path === "string" ? { path: nodeMetadata.path } : {}),
    ...(typeof nodeMetadata?.routePath === "string" ? { routePath: nodeMetadata.routePath } : {}),
    ...(typeof nodeMetadata?.capability === "string" ? { capability: nodeMetadata.capability } : {}),
    ...(Array.isArray(edgeMetadata?.sharedFiles)
      ? { sharedFiles: edgeMetadata.sharedFiles.filter((value): value is string => typeof value === "string").sort() }
      : {}),
  };
}

function sortRelatedNodes(nodes: RelatedApplicationNode[]): RelatedApplicationNode[] {
  return nodes.sort((left, right) => left.id.localeCompare(right.id));
}

function sameRepository(graphHeader: ArtifactHeader, runHeader: ArtifactHeader | undefined): boolean {
  return Boolean(runHeader && runHeader.subject.repoId === graphHeader.subject.repoId);
}

function isCurrentEvidence(graphHeader: ArtifactHeader, runHeader: ArtifactHeader | undefined): boolean {
  return evidenceCoherence(graphHeader, runHeader) !== "none";
}

function evidenceCoherence(
  graphHeader: ArtifactHeader,
  runHeader: ArtifactHeader | undefined,
): CheckOccurrence["coherence"] {
  if (!runHeader || runHeader.freshness?.status === "stale") return "none";
  const commit = graphHeader.subject.commit;
  if (typeof commit === "string" && commit.length > 0) {
    return runHeader.subject.commit === commit ? "commit" : "none";
  }

  const evidenceTime = Date.parse(graphHeader.generatedAt);
  const runTime = Date.parse(runHeader.generatedAt);
  return Number.isFinite(evidenceTime) && Number.isFinite(runTime) && runTime >= evidenceTime
    ? "observed_after_evidence"
    : "none";
}

function coherenceFor(group: CheckGroup): Array<CheckOccurrence["coherence"]> {
  return [...new Set(group.occurrences.map((occurrence) => occurrence.coherence))].sort();
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const byKey = new Map<string, ArtifactRef>();
  for (const ref of refs) byKey.set(`${ref.type}:${ref.id}:${ref.schemaVersion}`, ref);
  return [...byKey.values()].sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type Assessment,
  type AssessmentJudgmentReport,
  createAssessmentReport,
  validateAssessmentJudgmentReport,
} from "@rekon/kernel-assessments";
import { type Finding, createFindingReport } from "@rekon/kernel-findings";
import type { CapabilityContract, CapabilityMap, OwnershipMap } from "@rekon/kernel-repo-model";
import { assertRulebook, type Rulebook } from "@rekon/kernel-rulebook";
import { type Evaluator, defineCapability } from "@rekon/sdk";
import { ANTI_PATTERN_RULE_ID, evaluateAntiPatterns } from "./anti-pattern.js";
import { CAPABILITY_OVERLAP_RULE_ID, evaluateCapabilityOverlap } from "./capability-overlap.js";
import { DEAD_CODE_RULE_ID, evaluateDeadCode, loadDeclaredRoots, loadGeneratedGlobs, loadDistImportExemptions, globLikeToRegExp, type DistImportExemption, loadDeclaredRootGlobs } from "./dead-code.js";
import { NAMING_CONTRACT_RULE_ID, evaluateNamingContract } from "./naming-contract.js";
import { DEBT_MARKERS_RULE_ID, evaluateDebtMarkers } from "./debt-markers.js";
import { DEBT_SEMANTIC_RULE_ID, corroborateSemanticDebtClaims, evaluateSemanticDebtClaims } from "./debt-semantic.js";
import {
  ASYNC_ARRAY_CALLBACK_RULE_ID,
  ASYNC_PROMISE_EXECUTOR_RULE_ID,
  EMPTY_SOURCE_FILE_RULE_ID,
  ERROR_SUPPRESSION_RULE_ID,
  FLOATING_PROMISE_RULE_ID,
  FOCUSED_TEST_RULE_ID,
  INVERSE_LISTENER_DELEGATION_RULE_ID,
  PARTIAL_ALLOWLIST_MATCH_RULE_ID,
  PLACEHOLDER_IMPLEMENTATION_RULE_ID,
  TEST_ISOLATION_RULE_ID,
  TYPE_ESCAPE_RULE_ID,
  UNUSED_IMPORT_RULE_ID,
  UNUSED_PRIVATE_MEMBER_RULE_ID,
  UNREACHABLE_CODE_RULE_ID,
  evaluateSourceQualitySignals,
} from "./source-quality.js";
import { EMBEDDING_DUPLICATION_RULE_ID, evaluateEmbeddingDuplicationCandidates } from "./embedding-duplication.js";
import { REPOSITORY_CHECK_FAILURE_RULE_ID, evaluateRepositoryChecks } from "./repository-checks.js";
import { FUNCTION_COMPLEXITY_RULE_ID, evaluateFunctionComplexity } from "./function-complexity.js";
import { IMPORT_CYCLE_RULE_ID, evaluateImportCycleGraph, loadLatestImportGraph } from "./import-cycles.js";
import { DEPENDENCY_HUB_RULE_ID, evaluateDependencyHubs } from "./dependency-hubs.js";
import { SEMANTIC_RESOURCE_LIFETIME_RULE_ID, evaluateResourceLifetimeSignals } from "./resource-lifetime.js";
import { evaluateErrorPropagationSignals } from "./error-propagation.js";
import { evaluateDependencyResolutionSignals } from "./dependency-resolution.js";
import { evaluateCacheIntegritySignals } from "./cache-integrity.js";
import { evaluateCleanupCompletenessSignals } from "./cleanup-completeness.js";
import { evaluateOptionPropagationSignals } from "./option-propagation.js";
import { loadFreshComplexityCoverage } from "./complexity-coverage.js";
import {
  compileEffectiveCapabilityOntology,
  compileEffectiveGrammar,
  detectOverlayPacks,
  loadCapabilityOntologyConfig,
  loadGrammarOverrides,
} from "@rekon/capability-ontology";
import { GRAMMAR_DIVERGENCE_RULE_ID, evaluateGrammarDivergence, isNonProductionPath, loadWorkspacePackages } from "./grammar-divergence.js";
import { SECURITY_SCANNER_RESULT_RULE_ID, evaluateSecurityScanReports } from "./security-scans.js";
import { DEPENDENCY_VULNERABILITY_RULE_ID, evaluateDependencyAuditReports } from "./dependency-audits.js";
import {
  OWNERSHIP_DOES_NOT_OWN_EVALUATOR_ID,
  evaluateDeclaredOwnershipRules,
} from "./declared-ownership.js";
import {
  SEMANTIC_CACHE_INTEGRITY_RULE_ID,
  SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
  SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
  SEMANTIC_ERROR_PROPAGATION_RULE_ID,
  SEMANTIC_OPTION_PROPAGATION_RULE_ID,
  SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
  applyAssessmentJudgments,
  evaluateSemanticFileCandidates,
  readCurrentRepoSource,
  retainCurrentAssessmentJudgments,
  type SemanticFileReportLike,
} from "./assessment-judgment.js";

export * from "./grammar-divergence.js";
export * from "./assessment-judgment.js";

type EvidenceGraphLike = {
  header: ArtifactHeader;
  facts: Array<{
    kind: string;
    subject: string;
    value: Record<string, unknown>;
    confidence: number;
  }>;
};

type SourceRange = { path: string; lineStart: number; lineEnd: number };

function overlapsStructuredSemanticAssessment(
  assessment: Assessment,
  structured: readonly Assessment[],
): boolean {
  const candidateRanges = assessmentSourceRanges(assessment);
  if (!assessment.ruleId || candidateRanges.length === 0) return false;
  return structured.some((direct) =>
    direct.ruleId === assessment.ruleId
    && assessmentSourceRanges(direct).some((directRange) =>
      candidateRanges.some((candidateRange) =>
        candidateRange.path === directRange.path
        && candidateRange.lineStart <= directRange.lineEnd
        && directRange.lineStart <= candidateRange.lineEnd)));
}

function assessmentSourceRanges(assessment: Assessment): SourceRange[] {
  const evidence = assessment.details?.sourceEvidence;
  if (!Array.isArray(evidence)) return [];
  return evidence.flatMap((entry): SourceRange[] => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const value = entry as Record<string, unknown>;
    if (typeof value.path !== "string" || !Number.isInteger(value.lineStart)) return [];
    const lineStart = value.lineStart as number;
    const lineEnd = Number.isInteger(value.lineEnd) ? value.lineEnd as number : lineStart;
    return [{ path: value.path, lineStart, lineEnd }];
  });
}

async function retainCurrentSemanticDebtEntries(reportLike: unknown, repoRoot: string): Promise<unknown> {
  if (!reportLike || typeof reportLike !== "object" || Array.isArray(reportLike)) return reportLike;
  const report = reportLike as { entries?: unknown };
  if (!Array.isArray(report.entries)) return reportLike;

  let physicalRoot: string;
  try {
    physicalRoot = await realpath(resolve(repoRoot));
  } catch {
    return { ...report, entries: [] };
  }

  const entries: unknown[] = [];
  for (const entryLike of report.entries) {
    if (!entryLike || typeof entryLike !== "object" || Array.isArray(entryLike)) continue;
    const entry = entryLike as { path?: unknown; sha256?: unknown };
    if (typeof entry.path !== "string" || entry.path.length === 0 || isAbsolute(entry.path)) continue;
    if (typeof entry.sha256 !== "string" || entry.sha256.length === 0) continue;

    const candidate = resolve(physicalRoot, entry.path);
    const lexical = relative(physicalRoot, candidate);
    if (lexical === ".." || lexical.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) continue;

    try {
      const physicalCandidate = await realpath(candidate);
      const physical = relative(physicalRoot, physicalCandidate);
      if (physical === ".." || physical.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) continue;
      const content = await readFile(physicalCandidate);
      const digest = createHash("sha256").update(content).digest("hex");
      if (digest === entry.sha256) entries.push(entryLike);
    } catch {
      // Missing, unreadable, or replaced source cannot support a current claim.
    }
  }

  return { ...report, entries };
}

export const BUILT_IN_POLICY_RULES = [
  "typescript.compilerDiagnostic",
  UNUSED_IMPORT_RULE_ID,
  UNUSED_PRIVATE_MEMBER_RULE_ID,
  UNREACHABLE_CODE_RULE_ID,
  EMPTY_SOURCE_FILE_RULE_ID,
  TYPE_ESCAPE_RULE_ID,
  ERROR_SUPPRESSION_RULE_ID,
  PLACEHOLDER_IMPLEMENTATION_RULE_ID,
  ASYNC_PROMISE_EXECUTOR_RULE_ID,
  ASYNC_ARRAY_CALLBACK_RULE_ID,
  FLOATING_PROMISE_RULE_ID,
  INVERSE_LISTENER_DELEGATION_RULE_ID,
  PARTIAL_ALLOWLIST_MATCH_RULE_ID,
  FOCUSED_TEST_RULE_ID,
  TEST_ISOLATION_RULE_ID,
  FUNCTION_COMPLEXITY_RULE_ID,
  IMPORT_CYCLE_RULE_ID,
  DEPENDENCY_HUB_RULE_ID,
  EMBEDDING_DUPLICATION_RULE_ID,
  REPOSITORY_CHECK_FAILURE_RULE_ID,
  SECURITY_SCANNER_RESULT_RULE_ID,
  DEPENDENCY_VULNERABILITY_RULE_ID,
  SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
  SEMANTIC_CACHE_INTEGRITY_RULE_ID,
  SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
  SEMANTIC_ERROR_PROPAGATION_RULE_ID,
  SEMANTIC_OPTION_PROPAGATION_RULE_ID,
  SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
  SEMANTIC_RESOURCE_LIFETIME_RULE_ID,
  "imports.noDistImports",
  "imports.noNodeModulesRelativeImports",
  "files.noGeneratedAsSource",
  "architecture.noUnknownSystemForSourceFile",
  // WO-9: cluster-A declared-vs-observed divergence (jurisdiction-gated).
  GRAMMAR_DIVERGENCE_RULE_ID,
  // WO-14 A: tech_debt deterministic core (markers as evidence).
  DEBT_MARKERS_RULE_ID,
  // WO-25: semantic tech_debt overlay (proposal findings from judgment artifacts).
  DEBT_SEMANTIC_RULE_ID,
  // WO-14 B: dead_code on unreferenced exports + declared-root reachability.
  DEAD_CODE_RULE_ID,
  // WO-14 D: capability overlap with declared sharing.
  CAPABILITY_OVERLAP_RULE_ID,
  // WO-14 E: the {Entity}{Role} naming contract (ratified repos only).
  NAMING_CONTRACT_RULE_ID,
  // WO-14 F: the anti-pattern pack (declared signals + correction pairs).
  ANTI_PATTERN_RULE_ID,
] as const;

export { CAPABILITY_OVERLAP_RULE_ID, evaluateCapabilityOverlap } from "./capability-overlap.js";
export { NAMING_CONTRACT_RULE_ID, evaluateNamingContract, splitPascalTokens } from "./naming-contract.js";
export { ANTI_PATTERN_RULE_ID, evaluateAntiPatterns } from "./anti-pattern.js";
export { SEMANTIC_RESOURCE_LIFETIME_RULE_ID, evaluateResourceLifetimeSignals } from "./resource-lifetime.js";
export { evaluateErrorPropagationSignals } from "./error-propagation.js";
export { evaluateDependencyResolutionSignals } from "./dependency-resolution.js";
export { evaluateCacheIntegritySignals } from "./cache-integrity.js";
export { evaluateCleanupCompletenessSignals } from "./cleanup-completeness.js";
export { evaluateOptionPropagationSignals } from "./option-propagation.js";

export { DEBT_MARKERS_RULE_ID, evaluateDebtMarkers } from "./debt-markers.js";
export { DEBT_SEMANTIC_RULE_ID, corroborateSemanticDebtClaims, evaluateSemanticDebt, evaluateSemanticDebtClaims } from "./debt-semantic.js";
export {
  ASYNC_ARRAY_CALLBACK_RULE_ID,
  ASYNC_PROMISE_EXECUTOR_RULE_ID,
  EMPTY_SOURCE_FILE_RULE_ID,
  ERROR_SUPPRESSION_RULE_ID,
  FLOATING_PROMISE_RULE_ID,
  FOCUSED_TEST_RULE_ID,
  INVERSE_LISTENER_DELEGATION_RULE_ID,
  PARTIAL_ALLOWLIST_MATCH_RULE_ID,
  PLACEHOLDER_IMPLEMENTATION_RULE_ID,
  TEST_ISOLATION_RULE_ID,
  UNUSED_IMPORT_RULE_ID,
  UNUSED_PRIVATE_MEMBER_RULE_ID,
  UNREACHABLE_CODE_RULE_ID,
  TYPE_ESCAPE_RULE_ID,
  evaluateSourceQualitySignals,
} from "./source-quality.js";
export { EMBEDDING_DUPLICATION_RULE_ID, evaluateEmbeddingDuplicationCandidates } from "./embedding-duplication.js";
export {
  FUNCTION_COMPLEXITY_RULE_ID,
  FUNCTION_COMPLEXITY_THRESHOLDS,
  evaluateFunctionComplexity,
  type FunctionComplexityCoverage,
  type FunctionComplexityCoverageObservation,
  type FunctionComplexityCoverageStatus,
} from "./function-complexity.js";
export { IMPORT_CYCLE_RULE_ID, evaluateImportCycleGraph, evaluateImportCycles, loadLatestImportGraph } from "./import-cycles.js";
export {
  DEPENDENCY_HUB_MIN_INCOMING,
  DEPENDENCY_HUB_MIN_OUTGOING,
  DEPENDENCY_HUB_RULE_ID,
  evaluateDependencyHubs,
} from "./dependency-hubs.js";
export {
  loadFreshComplexityCoverage,
  type ComplexityCoverageFile,
  type ComplexityCoverageFunction,
  type ComplexityCoverageRun,
} from "./complexity-coverage.js";
export { DEAD_CODE_RULE_ID, evaluateDeadCode, isFrameworkEntryPath, loadDeclaredRoots, loadGeneratedGlobs } from "./dead-code.js";
export type { DeadCodeStats } from "./dead-code.js";
export { loadDistImportExemptions, loadDeclaredRootGlobs, type DistImportExemption as DistImportExemptionEntry } from "./dead-code.js";
export { SECURITY_SCANNER_RESULT_RULE_ID, evaluateSecurityScanReports } from "./security-scans.js";
export { DEPENDENCY_VULNERABILITY_RULE_ID, evaluateDependencyAuditReports } from "./dependency-audits.js";
export {
  OWNERSHIP_DOES_NOT_OWN_EVALUATOR_ID,
  evaluateDeclaredOwnershipRules,
  type DeclaredOwnershipEvaluationInput,
  type DeclaredOwnershipEvaluationResult,
  type DeclaredOwnershipRuleOptions,
  type DeclaredOwnershipRulebook,
} from "./declared-ownership.js";

export const policyEvaluator: Evaluator = {
  id: "@rekon/capability-policy.evaluator",
  produces: ["FindingReport", "AssessmentReport"],
  async evaluate({ artifacts, input }) {
    const evidenceRef = (await artifacts.list("EvidenceGraph")).at(-1);

    if (!evidenceRef) {
      throw new Error("@rekon/capability-policy requires an EvidenceGraph artifact.");
    }

    const graph = await artifacts.read(evidenceRef) as EvidenceGraphLike;
    // WO-19 Part 2: operator-config dist-import exemptions (repo
    // jurisdiction; corpus repos without the config are untouched).
    const evaluateRepo = input?.repo as { root?: string } | undefined;
    const evaluateRepoRoot = typeof input?.repoRoot === "string" ? input.repoRoot : typeof evaluateRepo?.root === "string" ? evaluateRepo.root : undefined;
    const distExemptions = evaluateRepoRoot ? await loadDistImportExemptions(evaluateRepoRoot) : [];
    const disabledRules = new Set(
      Array.isArray(input?.disabledRules) ? input.disabledRules.filter((rule): rule is string => typeof rule === "string") : [],
    );
    const semanticDebtRef = (await artifacts.list("SemanticDebtJudgmentReport")).at(-1);
    const semanticDebtReport = semanticDebtRef
      ? await artifacts.read(semanticDebtRef)
      : undefined;
    const currentSemanticDebtReport = semanticDebtReport && evaluateRepoRoot
      ? await retainCurrentSemanticDebtEntries(semanticDebtReport, evaluateRepoRoot)
      : semanticDebtReport;
    const capabilityGraphRef = !disabledRules.has(EMBEDDING_DUPLICATION_RULE_ID)
      ? (await artifacts.list("CapabilityEvidenceGraph")).at(-1)
      : undefined;
    const embeddingDuplicationOpportunities = capabilityGraphRef
      ? evaluateEmbeddingDuplicationCandidates(await artifacts.read(capabilityGraphRef), capabilityGraphRef)
      : [];
    const semanticDebtClaims =
      !disabledRules.has(DEBT_SEMANTIC_RULE_ID) && semanticDebtRef && currentSemanticDebtReport
        ? corroborateSemanticDebtClaims(
            evaluateSemanticDebtClaims(currentSemanticDebtReport, semanticDebtRef),
            graph.facts,
            evidenceRef,
          )
        : [];
    const semanticFileCandidates = evaluateRepoRoot
      ? await loadCurrentSemanticFileCandidates(artifacts, evaluateRepoRoot)
      : { assessments: [] as Assessment[], inputRefs: [] as ArtifactRef[] };
    const repositoryChecks = !disabledRules.has(REPOSITORY_CHECK_FAILURE_RULE_ID)
      ? await evaluateRepositoryChecks(graph, evidenceRef, artifacts)
      : { findings: [], assessments: [], inputRefs: [], promotedRootCauseKeys: new Set<string>(), sourceRootCauseKeys: new Set<string>() };
    const securityScans = !disabledRules.has(SECURITY_SCANNER_RESULT_RULE_ID)
      ? await evaluateSecurityScanReports(artifacts, evidenceRef)
      : { assessments: [], inputRefs: [] as ArtifactRef[] };
    const dependencyAudits = !disabledRules.has(DEPENDENCY_VULNERABILITY_RULE_ID)
      ? await evaluateDependencyAuditReports(artifacts, evidenceRef)
      : { assessments: [], inputRefs: [] as ArtifactRef[] };
    const declaredOwnership = await declaredOwnershipFindings(artifacts, disabledRules);
    const importGraph = !disabledRules.has(IMPORT_CYCLE_RULE_ID) || !disabledRules.has(DEPENDENCY_HUB_RULE_ID)
      ? await loadLatestImportGraph(artifacts)
      : undefined;
    const importGraphAssessments = importGraph
      ? [
          ...(!disabledRules.has(IMPORT_CYCLE_RULE_ID) ? evaluateImportCycleGraph(importGraph.graph, importGraph.ref) : []),
          ...(!disabledRules.has(DEPENDENCY_HUB_RULE_ID) ? evaluateDependencyHubs(importGraph.graph, importGraph.ref) : []),
        ]
      : [];
    const unknownSystemSignals = !disabledRules.has("architecture.noUnknownSystemForSourceFile")
      ? noUnknownSystemForSourceFile(graph, evidenceRef)
      : [];
    const debtMarkerSignals = !disabledRules.has(DEBT_MARKERS_RULE_ID) ? evaluateDebtMarkers(graph.facts) : [];
    const overlapResult = !disabledRules.has(CAPABILITY_OVERLAP_RULE_ID)
      ? await capabilityOverlapFindings(graph, artifacts)
      : { findings: [], inputRefs: [] as ArtifactRef[] };
    const deadCodeResult = !disabledRules.has(DEAD_CODE_RULE_ID)
      ? await deadCodeFindings(graph, input, evidenceRef)
      : { findings: [], risks: [] };
    const complexityCoverage = !disabledRules.has(FUNCTION_COMPLEXITY_RULE_ID)
      ? await loadFreshComplexityCoverage(artifacts, graph.header)
      : [];
    const complexityAssessments = !disabledRules.has(FUNCTION_COMPLEXITY_RULE_ID)
      ? evaluateFunctionComplexity(graph.facts, evidenceRef, complexityCoverage)
      : [];
    const resourceLifetimeAssessments = !disabledRules.has(SEMANTIC_RESOURCE_LIFETIME_RULE_ID)
      ? evaluateResourceLifetimeSignals(graph.facts, evidenceRef, {
          evidenceComplete: graph.header.freshness?.status === "fresh",
        })
      : [];
    const errorPropagationAssessments = !disabledRules.has(SEMANTIC_ERROR_PROPAGATION_RULE_ID)
      ? evaluateErrorPropagationSignals(graph.facts, evidenceRef)
      : [];
    const dependencyResolutionAssessments = !disabledRules.has(SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID)
      ? evaluateDependencyResolutionSignals(graph.facts, evidenceRef)
      : [];
    const cacheIntegrityAssessments = !disabledRules.has(SEMANTIC_CACHE_INTEGRITY_RULE_ID)
      ? evaluateCacheIntegritySignals(graph.facts, evidenceRef)
      : [];
    const cleanupCompletenessAssessments = !disabledRules.has(SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID)
      ? evaluateCleanupCompletenessSignals(graph.facts, evidenceRef)
      : [];
    const optionPropagationAssessments = !disabledRules.has(SEMANTIC_OPTION_PROPAGATION_RULE_ID)
      ? evaluateOptionPropagationSignals(graph.facts, evidenceRef)
      : [];
    const structuredSemanticAssessments = [
      ...cacheIntegrityAssessments,
      ...cleanupCompletenessAssessments,
      ...errorPropagationAssessments,
      ...dependencyResolutionAssessments,
      ...optionPropagationAssessments,
    ];
    const grammarDivergence = !disabledRules.has(GRAMMAR_DIVERGENCE_RULE_ID)
      ? await grammarDivergenceSignals(graph, input, artifacts, evidenceRef)
      : { findings: [], assessments: [] };
    const grammarFamily = !disabledRules.has(NAMING_CONTRACT_RULE_ID) || !disabledRules.has(ANTI_PATTERN_RULE_ID)
      ? await grammarFamilySignals(graph, input, disabledRules, evidenceRef)
      : { findings: [], assessments: [] };
    const findings = [
      ...(!disabledRules.has("typescript.compilerDiagnostic") ? typeScriptCompilerDiagnostics(graph, evidenceRef) : []),
      ...(!disabledRules.has("imports.noDistImports") ? noDistImports(graph, evidenceRef, distExemptions) : []),
      ...(!disabledRules.has("imports.noNodeModulesRelativeImports") ? noNodeModulesRelativeImports(graph, evidenceRef) : []),
      ...(!disabledRules.has("files.noGeneratedAsSource") ? noGeneratedAsSource(graph, evidenceRef) : []),
      ...grammarDivergence.findings,
      ...deadCodeResult.findings,
      ...grammarFamily.findings,
      ...repositoryChecks.findings,
      ...declaredOwnership.findings,
    ];
    const rawAssessments: Assessment[] = [
      ...complexityAssessments,
      ...resourceLifetimeAssessments,
      ...cacheIntegrityAssessments,
      ...cleanupCompletenessAssessments,
      ...errorPropagationAssessments,
      ...dependencyResolutionAssessments,
      ...optionPropagationAssessments,
      ...importGraphAssessments,
      ...evaluateSourceQualitySignals(graph.facts, evidenceRef)
        .filter((assessment) => !assessment.ruleId || !disabledRules.has(assessment.ruleId))
        .filter((assessment) => !repositoryChecks.sourceRootCauseKeys.has(assessment.rootCauseKey)),
      ...unknownSystemSignals.map((finding) => assessmentFromFinding(finding, {
        kind: "model_diagnostic",
        verification: "verified",
        confidence: 0.95,
        evidence: [evidenceRef],
        rationale: "The evidence graph contains a source file without a resolved system assignment.",
      })),
      ...debtMarkerSignals.map((finding) => assessmentFromFinding(finding, {
        kind: "opportunity",
        verification: "verified",
        confidence: 0.95,
        evidence: [evidenceRef],
        rationale: "The marker is deterministic evidence of declared debt, but does not itself prove a defect.",
      })),
      ...overlapResult.findings.map((finding) => assessmentFromFinding(finding, {
        kind: "opportunity",
        verification: "unverified",
        confidence: 0.7,
        evidence: overlapResult.inputRefs.length > 0 ? overlapResult.inputRefs : [evidenceRef],
        rationale: "Cross-system implementation overlap is structural evidence; consolidation value remains unverified.",
      })),
      ...deadCodeResult.risks,
      ...semanticDebtClaims,
      ...semanticFileCandidates.assessments.filter(
        (assessment) => !overlapsStructuredSemanticAssessment(assessment, structuredSemanticAssessments),
      ),
      ...embeddingDuplicationOpportunities,
      ...repositoryChecks.assessments,
      ...securityScans.assessments,
      ...dependencyAudits.assessments,
      ...grammarDivergence.assessments,
      ...grammarFamily.assessments,
    ].filter((assessment) => !repositoryChecks.promotedRootCauseKeys.has(assessment.rootCauseKey));
    const judgmentApplication = evaluateRepoRoot
      ? await applyCurrentAssessmentJudgments(artifacts, evaluateRepoRoot, rawAssessments)
      : { assessments: rawAssessments, inputRefs: [] as ArtifactRef[] };
    const assessments = judgmentApplication.assessments;
    const findingInputRefs = uniqueRefs([
      evidenceRef,
      ...repositoryChecks.inputRefs,
      ...declaredOwnership.inputRefs,
    ]);
    const assessmentInputRefs = uniqueRefs([
      evidenceRef,
      ...overlapResult.inputRefs,
      ...(semanticDebtClaims.length > 0 && semanticDebtRef ? [semanticDebtRef] : []),
      ...semanticFileCandidates.inputRefs,
      ...judgmentApplication.inputRefs,
      ...(capabilityGraphRef ? [capabilityGraphRef] : []),
      ...repositoryChecks.inputRefs,
      ...securityScans.inputRefs,
      ...dependencyAudits.inputRefs,
      ...(importGraph ? [importGraph.ref] : []),
      ...complexityAssessments.flatMap((assessment) => assessment.evidence),
    ]);
    const report = createFindingReport({
      header: {
        artifactType: "FindingReport",
        artifactId: `finding-report-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: graph.header.subject,
        producer: {
          id: "@rekon/capability-policy",
          version: "0.1.0",
        },
        inputRefs: findingInputRefs,
        freshness: { status: "fresh" },
        provenance: { confidence: 0.9 },
      },
      findings,
    });
    const assessmentReport = createAssessmentReport({
      header: {
        artifactType: "AssessmentReport",
        artifactId: `assessment-report-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: graph.header.subject,
        producer: { id: "@rekon/capability-policy", version: "1.0.0" },
        inputRefs: assessmentInputRefs,
        freshness: { status: "fresh" },
        provenance: { confidence: assessments.length > 0 ? 0.7 : 1 },
      },
      assessments,
    });

    return [
      await artifacts.write("FindingReport", report),
      await artifacts.write("AssessmentReport", assessmentReport),
    ];
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-policy",
    name: "Policy Evaluator",
    version: "0.1.0",
    roles: ["evaluator"],
    consumes: [
      "EvidenceGraph",
      "SemanticDebtJudgmentReport",
      "SemanticFileUnderstandingReport",
      "AssessmentJudgmentReport",
      "CapabilityEvidenceGraph",
      "CapabilityNormalizationReport",
      "CapabilityMap",
      "OwnershipMap",
      "Rulebook",
      "CapabilityContract",
      "VerificationRun",
      "TestReport",
      "LintReport",
      "GraphSlice",
      "RuntimeGraphObservationReport",
      "SecurityScanReport",
      "DependencyAuditReport",
    ],
    produces: ["FindingReport", "AssessmentReport"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "evidence.changed",
        description: "Policy findings are invalid when the evidence graph changes.",
        inputs: ["EvidenceGraph"],
      },
      {
        id: "semantic-debt.changed",
        description: "Semantic debt findings are invalid when the judgment report changes.",
        inputs: ["SemanticDebtJudgmentReport"],
      },
      {
        id: "semantic-file-understanding.changed",
        description: "Open-world semantic candidates are invalid when current source understanding changes.",
        inputs: ["SemanticFileUnderstandingReport"],
      },
      {
        id: "assessment-judgment.changed",
        description: "Assessment disposition is invalid when independent judgment changes.",
        inputs: ["AssessmentJudgmentReport"],
      },
      {
        id: "capability-evidence-graph.changed",
        description: "Similarity opportunities are invalid when the capability evidence graph changes.",
        inputs: ["CapabilityEvidenceGraph"],
      },
      {
        id: "capability-model.changed",
        description: "Capability overlap assessments are invalid when normalized capabilities, fallback models, ownership, or sharing declarations change.",
        inputs: ["CapabilityNormalizationReport", "CapabilityMap", "OwnershipMap", "CapabilityContract"],
      },
      {
        id: "rulebook.changed",
        description: "Declared ownership findings are invalid when repository law or its projected capability and ownership inputs change.",
        inputs: ["Rulebook", "CapabilityMap", "OwnershipMap"],
      },
      {
        id: "verification-run.changed",
        description: "Repository check assessments are invalid when verification evidence changes.",
        inputs: ["VerificationRun", "TestReport", "LintReport"],
      },
      {
        id: "security-scan.changed",
        description: "Security scanner assessments are invalid when normalized scanner evidence changes.",
        inputs: ["SecurityScanReport"],
      },
      {
        id: "dependency-audit.changed",
        description: "Dependency vulnerability assessments are invalid when normalized audit evidence changes.",
        inputs: ["DependencyAuditReport"],
      },
      {
        id: "application-graph.changed",
        description: "Repository check impact context is invalid when application graph slices change.",
        inputs: ["GraphSlice"],
      },
      {
        id: "import-graph.changed",
        description: "Import-cycle assessments are invalid when repository import edges change.",
        inputs: ["GraphSlice"],
      },
      {
        id: "isolated-coverage.changed",
        description: "Complexity coverage context is invalid when runtime coverage observations change.",
        inputs: ["RuntimeGraphObservationReport", "VerificationRun"],
      },
    ],
    compatibility: { rekon: "^0.1.0" },
  },
  register(registry) {
    registry.evaluator(policyEvaluator);
  },
});

type PolicyArtifactReader = {
  list(type?: string): Promise<ArtifactRef[]>;
  read(ref: ArtifactRef): Promise<unknown>;
};

async function loadCurrentSemanticFileCandidates(
  artifacts: PolicyArtifactReader,
  repoRoot: string,
): Promise<{ assessments: Assessment[]; inputRefs: ArtifactRef[] }> {
  const refs = await artifacts.list("SemanticFileUnderstandingReport");
  const latestByPath = new Map<string, {
    ref: ArtifactRef;
    report: SemanticFileReportLike;
    generatedAt: string;
  }>();

  for (const ref of refs) {
    const value = await artifacts.read(ref);
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const report = value as SemanticFileReportLike;
    const path = typeof report.file?.path === "string" ? report.file.path : "";
    const generatedAt = typeof report.header?.generatedAt === "string" ? report.header.generatedAt : "";
    if (!path) continue;
    const previous = latestByPath.get(path);
    if (!previous || previous.generatedAt.localeCompare(generatedAt) < 0) {
      latestByPath.set(path, { ref, report, generatedAt });
    }
  }

  const assessments: Assessment[] = [];
  const inputRefs: ArtifactRef[] = [];
  for (const path of [...latestByPath.keys()].sort()) {
    const candidate = latestByPath.get(path)!;
    const source = await readCurrentRepoSource(repoRoot, path);
    if (!source) continue;
    const produced = evaluateSemanticFileCandidates(candidate.report, candidate.ref, source);
    if (produced.length === 0) continue;
    assessments.push(...produced);
    inputRefs.push(candidate.ref);
  }

  return { assessments, inputRefs: uniqueRefs(inputRefs) };
}

async function applyCurrentAssessmentJudgments(
  artifacts: PolicyArtifactReader,
  repoRoot: string,
  assessments: Assessment[],
): Promise<{ assessments: Assessment[]; inputRefs: ArtifactRef[] }> {
  const refs = (await artifacts.list("AssessmentJudgmentReport")).slice().reverse().slice(0, 20);
  let current = assessments;
  const inputRefs: ArtifactRef[] = [];

  for (const ref of refs) {
    const value = await artifacts.read(ref);
    const validation = validateAssessmentJudgmentReport(value);
    if (!validation.ok) continue;
    const report = await retainCurrentAssessmentJudgments(
      validation.value as AssessmentJudgmentReport,
      repoRoot,
    );
    const result = applyAssessmentJudgments(current, report, ref);
    if (result.applied.length === 0 && result.rejected.length === 0) continue;
    current = result.assessments;
    inputRefs.push(ref);
  }

  return { assessments: current, inputRefs: uniqueRefs(inputRefs) };
}

async function declaredOwnershipFindings(
  artifacts: { list: (type?: string) => Promise<ArtifactRef[]>; read: (ref: ArtifactRef) => Promise<unknown> },
  disabledRules: ReadonlySet<string>,
): Promise<{ findings: Finding[]; inputRefs: ArtifactRef[] }> {
  const rulebookRefs = await artifacts.list("Rulebook");
  const capabilityMapRef = (await artifacts.list("CapabilityMap")).at(-1);
  if (rulebookRefs.length === 0 || !capabilityMapRef) return { findings: [], inputRefs: [] };

  const selectedBySupersession = new Map<string, { ref: ArtifactRef; rulebook: Rulebook }>();
  const unsuperseded: Array<{ ref: ArtifactRef; rulebook: Rulebook }> = [];
  for (const ref of rulebookRefs) {
    const rulebook = assertRulebook(await artifacts.read(ref));
    const supersessionKey = rulebook.header.supersession?.key;
    if (!supersessionKey) {
      unsuperseded.push({ ref, rulebook });
      continue;
    }
    const previous = selectedBySupersession.get(supersessionKey);
    if (!previous || previous.rulebook.header.generatedAt.localeCompare(rulebook.header.generatedAt) < 0) {
      selectedBySupersession.set(supersessionKey, { ref, rulebook });
    }
  }
  const rulebooks = [
    ...unsuperseded,
    ...selectedBySupersession.values(),
  ];

  const ownershipMapRef = (await artifacts.list("OwnershipMap")).at(-1);
  return evaluateDeclaredOwnershipRules({
    rulebooks,
    capabilityMap: await artifacts.read(capabilityMapRef) as CapabilityMap,
    capabilityMapRef,
    ...(ownershipMapRef
      ? {
          ownershipMap: await artifacts.read(ownershipMapRef) as OwnershipMap,
          ownershipMapRef,
        }
      : {}),
    disabledRules,
  });
}

// WO-9: compile the repo's effective grammar (ratification decided by the
// repo's own overrides config - jurisdiction is the repo's, never ours),
// join OwnershipMap + CapabilityContract when present, and evaluate
// divergence. Absent repo root or config, the grammar compiles with no
// ratified archetypes and the layered axes are inert by construction.
async function capabilityOverlapFindings(
  graph: EvidenceGraphLike,
  artifacts: { list: (type?: string) => Promise<ArtifactRef[]>; read: (ref: ArtifactRef) => Promise<unknown> },
): Promise<{ findings: Finding[]; inputRefs: ArtifactRef[] }> {
  const normalizationRef = (await artifacts.list("CapabilityNormalizationReport")).at(-1);
  const normalization = normalizationRef
    ? await artifacts.read(normalizationRef) as CapabilityNormalizationReportLike
    : undefined;
  const normalizedCapabilities = normalization ? stableNormalizedCapabilities(normalization) : [];
  const mapRef = normalizationRef ? undefined : (await artifacts.list("CapabilityMap")).at(-1);
  const map = mapRef ? await artifacts.read(mapRef) as CapabilityMap : undefined;
  const ownershipRef = (await artifacts.list("OwnershipMap")).at(-1);
  const ownership = ownershipRef ? await artifacts.read(ownershipRef) as OwnershipMap : undefined;
  const contractRef = (await artifacts.list("CapabilityContract")).at(-1);
  const contract = contractRef ? await artifacts.read(contractRef) as CapabilityContract : undefined;
  const capabilities = normalizationRef
    ? normalizedCapabilities
    : (map?.entries ?? []).map((entry) => ({
        id: entry.capability,
        name: entry.capability,
        subjects: entry.subjects,
      }));

  return {
    findings: evaluateCapabilityOverlap({
      capabilities,
      ownershipEntries: ownership?.entries ?? [],
      contractEntries: contract?.contracts ?? [],
    }),
    inputRefs: uniqueRefs([
      ...(normalizationRef ? [normalizationRef] : []),
      ...(mapRef ? [mapRef] : []),
      ...(ownershipRef ? [ownershipRef] : []),
      ...(contractRef ? [contractRef] : []),
    ]),
  };
}

type CapabilityNormalizationReportLike = {
  candidates?: Array<{
    source?: { kind?: string; path?: string };
    raw?: { splitConfidence?: string };
    normalized?: { verb?: string; noun?: string };
    confidence?: string;
    status?: string;
  }>;
};

function stableNormalizedCapabilities(report: CapabilityNormalizationReportLike): Array<{
  id: string;
  name: string;
  subjects: string[];
}> {
  const byCapability = new Map<string, Set<string>>();
  for (const candidate of report.candidates ?? []) {
    if (candidate.status !== "normalized" || candidate.confidence !== "high") continue;
    if (candidate.raw?.splitConfidence !== "high") continue;
    if (candidate.source?.kind !== "symbol" && candidate.source?.kind !== "export") continue;
    const path = candidate.source.path;
    const verb = candidate.normalized?.verb;
    const noun = candidate.normalized?.noun;
    if (!path || !verb || !noun || isNonProductionPath(path)) continue;
    const key = `${verb}:${noun}`;
    const paths = byCapability.get(key) ?? new Set<string>();
    paths.add(path);
    byCapability.set(key, paths);
  }

  return [...byCapability.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, paths]) => {
      const separator = key.indexOf(":");
      const verb = key.slice(0, separator);
      const noun = key.slice(separator + 1);
      return {
        id: `normalized:${key}`,
        name: `${verb} ${noun}`,
        subjects: [...paths].sort(),
      };
    });
}

function assessmentFromFinding(
  finding: Finding,
  options: {
    kind: Assessment["kind"];
    verification: Assessment["confidence"]["verification"];
    confidence: number;
    evidence: ArtifactRef[];
    rationale: string;
  },
): Assessment {
  const legacyPayload = (finding as Finding & { payload?: Record<string, unknown> }).payload;
  return {
    id: `assessment:${finding.id}`,
    kind: options.kind,
    type: finding.type,
    impact: finding.severity,
    title: finding.title,
    description: finding.description,
    subjects: finding.subjects,
    ...(finding.files ? { files: finding.files } : {}),
    ...(finding.ruleId ? { ruleId: finding.ruleId } : {}),
    ...(finding.suggestedAction ? { suggestedAction: finding.suggestedAction } : {}),
    evidence: uniqueRefs([...(finding.evidence ?? []), ...options.evidence]),
    rootCauseKey: `${finding.type}:${finding.ruleId ?? "unruled"}:${finding.subjects.slice().sort().join("|")}`,
    confidence: {
      score: options.confidence,
      basis: "deterministic",
      verification: options.verification,
      rationale: options.rationale,
    },
    ...((finding.details || legacyPayload) ? { details: { ...(finding.details ?? {}), ...(legacyPayload ?? {}) } } : {}),
  };
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const byKey = new Map<string, ArtifactRef>();
  for (const ref of refs) byKey.set(`${ref.type}:${ref.id}:${ref.schemaVersion}`, ref);
  return [...byKey.values()].sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

// WO-14 E + F share the divergence detector's grammar + vocabulary context
// (one compile per evaluation, the WO-13 single-path discipline).
type GrammarPolicySignals = { findings: Finding[]; assessments: Assessment[] };

function classifyGrammarSignals(findings: Finding[], evidenceRef: ArtifactRef): GrammarPolicySignals {
  const result: GrammarPolicySignals = { findings: [], assessments: [] };
  for (const finding of findings) {
    const payload = (finding as Finding & { payload?: { law?: { packId?: unknown; axis?: unknown } } }).payload;
    // Base grammar is vocabulary for declared packs, not repository law by
    // itself. Emitting generic naming or console opinions without a local or
    // ratified declaration creates noise in established repositories.
    if (payload?.law?.packId === "grammar-base") continue;
    result.findings.push(finding);
  }
  return result;
}

async function grammarFamilySignals(
  graph: EvidenceGraphLike,
  input: Record<string, unknown> | undefined,
  disabledRules: Set<string>,
  evidenceRef: ArtifactRef,
): Promise<GrammarPolicySignals> {
  const repo = input?.repo as { root?: string } | undefined;
  const repoRoot = typeof repo?.root === "string" ? repo.root : undefined;
  const overrides = repoRoot ? loadGrammarOverrides(repoRoot) : { overrides: null, path: null };
  const grammar = compileEffectiveGrammar({
    overrides: overrides.overrides ?? undefined,
    overridesPath: overrides.path,
  });

  let vocabularyNouns: ReadonlySet<string> | undefined;

  if (repoRoot) {
    try {
      const configResult = await loadCapabilityOntologyConfig(repoRoot);
      const detection = await detectOverlayPacks(repoRoot);
      const ontology = compileEffectiveCapabilityOntology({
        config: configResult.found ? configResult.config : undefined,
        overlayPackIds: detection.packIds,
      });

      vocabularyNouns = new Set(ontology.nouns.canonical.map((noun) => noun.toLowerCase()));
    } catch {
      // No vocabulary -> no exemptions.
    }
  }

  const findings = [
    ...(!disabledRules.has(NAMING_CONTRACT_RULE_ID)
      ? evaluateNamingContract({ facts: graph.facts, grammar, vocabularyNouns })
      : []),
    ...(!disabledRules.has(ANTI_PATTERN_RULE_ID)
      ? evaluateAntiPatterns({ facts: graph.facts, grammar })
      : []),
  ].map((finding) => ({ ...finding, evidence: uniqueRefs([...(finding.evidence ?? []), evidenceRef]) }));
  return classifyGrammarSignals(findings, evidenceRef);
}

async function deadCodeFindings(
  graph: EvidenceGraphLike,
  input: Record<string, unknown> | undefined,
  evidenceRef: ArtifactRef,
): Promise<{ findings: Finding[]; risks: Assessment[] }> {
  const repo = input?.repo as { root?: string } | undefined;
  const repoRoot = typeof repo?.root === "string" ? repo.root : undefined;
  const roots = repoRoot ? await loadDeclaredRoots(repoRoot) : [];
  for (const fact of graph.facts) {
    if (fact.kind !== "entry_point" || typeof fact.value.path !== "string") continue;
    if (!roots.includes(fact.value.path)) roots.push(fact.value.path);
  }
  // WO-20 Part 3: operator-declared root globs expand against the scanned
  // file set and join the manifest/convention roots.
  const rootGlobs = repoRoot ? await loadDeclaredRootGlobs(repoRoot) : [];

  if (rootGlobs.length > 0) {
    const files = graph.facts.filter((f) => f.kind === "file").map((f) => f.subject);
    const matchers = rootGlobs.map((r) => globLikeToRegExp(r.glob));

    for (const file of files) {
      if (matchers.some((re) => re.test(file)) && !roots.includes(file)) {
        roots.push(file);
      }
    }
  }

  const generatedGlobs = repoRoot ? await loadGeneratedGlobs(repoRoot) : [];
  const overrides = repoRoot ? loadGrammarOverrides(repoRoot) : { overrides: null, path: null };
  const grammar = compileEffectiveGrammar({
    overrides: overrides.overrides ?? undefined,
    overridesPath: overrides.path,
  });

  const signals = evaluateDeadCode({ facts: graph.facts, roots, grammar, generatedGlobs }).map((finding) => ({
    ...finding,
    evidence: uniqueRefs([...(finding.evidence ?? []), evidenceRef]),
    rootCauseKey: `dead_code:${finding.files?.[0] ?? finding.subjects[0] ?? finding.id}`,
  }));
  const findings: Finding[] = [];
  const risks: Assessment[] = [];

  for (const signal of signals) {
    const payload = (signal as Finding & { payload?: { mode?: unknown; reachableFromRoots?: unknown } }).payload;
    risks.push(assessmentFromFinding(signal, {
      kind: "risk",
      verification: payload?.mode === "reachability" ? "corroborated" : "unverified",
      confidence: payload?.mode === "reachability" ? 0.75 : 0.65,
      evidence: [evidenceRef],
      rationale: payload?.mode === "reachability"
        ? "The export has no resolved consumer and the file is outside the declared root graph, but dynamic or external entry points may be incomplete."
        : "No complete declared-root reachability proof is available; dynamic or external consumers may exist.",
    }));
  }

  return { findings, risks };
}

async function grammarDivergenceSignals(
  graph: EvidenceGraphLike,
  input: Record<string, unknown> | undefined,
  artifacts: { list: (type?: string) => Promise<ArtifactRef[]>; read: (ref: ArtifactRef) => Promise<unknown> },
  evidenceRef: ArtifactRef,
): Promise<GrammarPolicySignals> {
  const repo = input?.repo as { root?: string } | undefined;
  const repoRoot = typeof repo?.root === "string" ? repo.root : undefined;
  const overrides = repoRoot ? loadGrammarOverrides(repoRoot) : { overrides: null, path: null };
  const grammar = compileEffectiveGrammar({
    overrides: overrides.overrides ?? undefined,
    overridesPath: overrides.path,
  });

  const ownershipRef = (await artifacts.list("OwnershipMap")).at(-1);
  const ownership = ownershipRef ? await artifacts.read(ownershipRef) as { entries?: Array<{ path: string; ownerSystem: string }> } : undefined;
  const contractRef = (await artifacts.list("CapabilityContract")).at(-1);
  const contract = contractRef ? await artifacts.read(contractRef) as { contracts?: Array<Record<string, unknown>> } : undefined;

  // WO-13: the repo's compiled vocabulary (canon + overlays + overrides)
  // informs the forbidden-type suffix check. Canonical nouns only -
  // verbs and aliases never exempt.
  let vocabularyNouns: ReadonlySet<string> | undefined;

  if (repoRoot) {
    try {
      const configResult = await loadCapabilityOntologyConfig(repoRoot);
      const detection = await detectOverlayPacks(repoRoot);
      const ontology = compileEffectiveCapabilityOntology({
        config: configResult.found ? configResult.config : undefined,
        overlayPackIds: detection.packIds,
      });

      vocabularyNouns = new Set(ontology.nouns.canonical.map((noun) => noun.toLowerCase()));
    } catch {
      // No vocabulary means no exemptions - the hygiene law fires as before.
    }
  }

  const findings = evaluateGrammarDivergence({
    facts: graph.facts,
    grammar,
    ownershipEntries: ownership?.entries ?? [],
    contractEntries: (contract?.contracts ?? []) as never,
    vocabularyNouns,
    // WO-18: the package-boundary axis reads the workspace package table
    // (inert unless the package-platform archetype is findings-eligible).
    workspacePackages: repoRoot ? await loadWorkspacePackages(repoRoot) : undefined,
  }).map((finding) => ({ ...finding, evidence: uniqueRefs([...(finding.evidence ?? []), evidenceRef]) }));
  return classifyGrammarSignals(findings, evidenceRef);
}

function noDistImports(graph: EvidenceGraphLike, evidenceRef: ArtifactRef, exemptions: ReadonlyArray<DistImportExemption> = []): Finding[] {
  // WO-19 Part 2 (operator:wo-19#dist-scope): operator-declared trees where
  // dist imports are the point (examples consume the built package; rule
  // fixtures simulate violations by design). Repo-jurisdiction config.
  const exemptMatchers = exemptions.map((e) => globLikeToRegExp(e.glob));
  const exempt = (fact: { subject: string }) => exemptMatchers.some((re) => re.test(fact.subject.split(":")[0] ?? ""));
  const entryPoints = new Set(
    graph.facts
      .filter((fact) => fact.kind === "entry_point" && typeof fact.value.path === "string")
      .map((fact) => fact.value.path as string),
  );

  return graph.facts
    .filter((fact) => fact.kind === "import"
      && typeof fact.value.target === "string"
      && /^\.\.?\//.test(fact.value.target)
      && /(^|\/)dist(\/|$)/.test(fact.value.target))
    .filter((fact) => !exempt(fact))
    .filter((fact) => {
      const source = typeof fact.value.source === "string" ? fact.value.source : fact.subject.split(":")[0] ?? "";
      return !isNonProductionPath(source) && !entryPoints.has(source);
    })
    .map((fact) => finding("imports.noDistImports", "import", "medium", "Import points at dist output", "Import source files instead of generated dist output.", fact, evidenceRef));
}

function typeScriptCompilerDiagnostics(graph: EvidenceGraphLike, evidenceRef: ArtifactRef): Finding[] {
  return graph.facts
    .filter((fact) => (
      fact.kind === "typescript:diagnostic"
      && fact.value.category === "error"
      && (fact.value.purpose === undefined || fact.value.purpose === "compiler-error")
    ))
    .map((fact) => {
      const file = typeof fact.value.path === "string" ? fact.value.path : fact.subject;
      const code = typeof fact.value.code === "number" ? fact.value.code : 0;
      const line = typeof fact.value.line === "number" ? fact.value.line : undefined;
      const column = typeof fact.value.column === "number" ? fact.value.column : undefined;
      const message = typeof fact.value.message === "string" ? fact.value.message : "TypeScript compiler error.";
      const location = line ? `:${line}${column ? `:${column}` : ""}` : "";
      return {
        id: `typescript.compilerDiagnostic:${file}:${code}:${line ?? 0}:${column ?? 0}`,
        rootCauseKey: `typescript:${file}:${code}:${line ?? 0}:${column ?? 0}`,
        type: "type_error",
        severity: "high" as const,
        title: `TypeScript error TS${code} in ${file}${location}`,
        description: message,
        subjects: [fact.subject],
        files: [file],
        ruleId: "typescript.compilerDiagnostic",
        suggestedAction: "Correct the source-level type or syntax error and rerun the repository compiler.",
        evidence: [evidenceRef],
        details: {
          code,
          phase: fact.value.phase,
          ...(line ? { line } : {}),
          ...(column ? { column } : {}),
        },
      };
    });
}

function noNodeModulesRelativeImports(graph: EvidenceGraphLike, evidenceRef: ArtifactRef): Finding[] {
  return graph.facts
    .filter((fact) => fact.kind === "import"
      && typeof fact.value.target === "string"
      && /^\.\.?\//.test(fact.value.target)
      && /(^|\/)node_modules(\/|$)/.test(fact.value.target))
    .filter((fact) => {
      const source = typeof fact.value.source === "string" ? fact.value.source : fact.subject.split(":")[0] ?? "";
      return !isNonProductionPath(source);
    })
    .map((fact) => finding("imports.noNodeModulesRelativeImports", "import", "medium", "Import reaches into node_modules by path", "Use package imports instead of relative node_modules paths.", fact, evidenceRef));
}

function noGeneratedAsSource(graph: EvidenceGraphLike, evidenceRef: ArtifactRef): Finding[] {
  return graph.facts
    .filter((fact) => fact.kind === "file" && /(^|\/)(dist|build|coverage)(\/|$)/.test(fact.subject))
    .map((fact) => finding("files.noGeneratedAsSource", "file", "low", "Generated file treated as source", "Generated outputs should not be modeled as source files.", fact, evidenceRef));
}

function noUnknownSystemForSourceFile(graph: EvidenceGraphLike, evidenceRef: ArtifactRef): Finding[] {
  return graph.facts
    .filter((fact) => fact.kind === "ownership_hint" && fact.value.system === "unknown")
    .map((fact) => finding("architecture.noUnknownSystemForSourceFile", "architecture", "low", "Source file has unknown owner system", "Add a stronger ownership hint or model projection.", fact, evidenceRef));
}

function finding(
  ruleId: string,
  type: string,
  severity: "critical" | "high" | "medium" | "low",
  title: string,
  description: string,
  fact: { subject: string; value: Record<string, unknown> },
  evidenceRef: ArtifactRef,
): Finding {
  const file = typeof fact.value.source === "string" ? fact.value.source : typeof fact.value.path === "string" ? fact.value.path : fact.subject;

  return {
    id: `${ruleId}:${file}:${typeof fact.value.target === "string" ? fact.value.target : ""}`,
    rootCauseKey: `${ruleId}:${file}:${typeof fact.value.target === "string" ? fact.value.target : ""}`,
    type,
    severity,
    title,
    description,
    subjects: [fact.subject],
    files: [file],
    ruleId,
    suggestedAction: "Review the flagged source and update the implementation or rule configuration.",
    evidence: [evidenceRef],
  };
}

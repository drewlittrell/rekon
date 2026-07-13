import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import { type Assessment, createAssessmentReport } from "@rekon/kernel-assessments";
import { type Finding, createFindingReport } from "@rekon/kernel-findings";
import type { CapabilityContract, CapabilityMap, OwnershipMap } from "@rekon/kernel-repo-model";
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
  ERROR_SUPPRESSION_RULE_ID,
  FLOATING_PROMISE_RULE_ID,
  FOCUSED_TEST_RULE_ID,
  PLACEHOLDER_IMPLEMENTATION_RULE_ID,
  TEST_ISOLATION_RULE_ID,
  TYPE_ESCAPE_RULE_ID,
  evaluateSourceQualitySignals,
} from "./source-quality.js";
import { EMBEDDING_DUPLICATION_RULE_ID, evaluateEmbeddingDuplicationCandidates } from "./embedding-duplication.js";
import { REPOSITORY_CHECK_FAILURE_RULE_ID, evaluateRepositoryChecks } from "./repository-checks.js";
import { FUNCTION_COMPLEXITY_RULE_ID, evaluateFunctionComplexity } from "./function-complexity.js";
import { IMPORT_CYCLE_RULE_ID, evaluateImportCycleGraph, loadLatestImportGraph } from "./import-cycles.js";
import { DEPENDENCY_HUB_RULE_ID, evaluateDependencyHubs } from "./dependency-hubs.js";
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

export * from "./grammar-divergence.js";

type EvidenceGraphLike = {
  header: ArtifactHeader;
  facts: Array<{
    kind: string;
    subject: string;
    value: Record<string, unknown>;
    confidence: number;
  }>;
};

export const BUILT_IN_POLICY_RULES = [
  "typescript.compilerDiagnostic",
  TYPE_ESCAPE_RULE_ID,
  ERROR_SUPPRESSION_RULE_ID,
  PLACEHOLDER_IMPLEMENTATION_RULE_ID,
  ASYNC_PROMISE_EXECUTOR_RULE_ID,
  ASYNC_ARRAY_CALLBACK_RULE_ID,
  FLOATING_PROMISE_RULE_ID,
  FOCUSED_TEST_RULE_ID,
  TEST_ISOLATION_RULE_ID,
  FUNCTION_COMPLEXITY_RULE_ID,
  IMPORT_CYCLE_RULE_ID,
  DEPENDENCY_HUB_RULE_ID,
  EMBEDDING_DUPLICATION_RULE_ID,
  REPOSITORY_CHECK_FAILURE_RULE_ID,
  SECURITY_SCANNER_RESULT_RULE_ID,
  DEPENDENCY_VULNERABILITY_RULE_ID,
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

export { DEBT_MARKERS_RULE_ID, evaluateDebtMarkers } from "./debt-markers.js";
export { DEBT_SEMANTIC_RULE_ID, corroborateSemanticDebtClaims, evaluateSemanticDebt, evaluateSemanticDebtClaims } from "./debt-semantic.js";
export {
  ASYNC_ARRAY_CALLBACK_RULE_ID,
  ASYNC_PROMISE_EXECUTOR_RULE_ID,
  ERROR_SUPPRESSION_RULE_ID,
  FLOATING_PROMISE_RULE_ID,
  FOCUSED_TEST_RULE_ID,
  PLACEHOLDER_IMPLEMENTATION_RULE_ID,
  TEST_ISOLATION_RULE_ID,
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
    const capabilityGraphRef = !disabledRules.has(EMBEDDING_DUPLICATION_RULE_ID)
      ? (await artifacts.list("CapabilityEvidenceGraph")).at(-1)
      : undefined;
    const embeddingDuplicationOpportunities = capabilityGraphRef
      ? evaluateEmbeddingDuplicationCandidates(await artifacts.read(capabilityGraphRef), capabilityGraphRef)
      : [];
    const semanticDebtClaims =
      !disabledRules.has(DEBT_SEMANTIC_RULE_ID) && semanticDebtRef
        ? corroborateSemanticDebtClaims(
            evaluateSemanticDebtClaims(await artifacts.read(semanticDebtRef), semanticDebtRef),
            graph.facts,
            evidenceRef,
          )
        : [];
    const repositoryChecks = !disabledRules.has(REPOSITORY_CHECK_FAILURE_RULE_ID)
      ? await evaluateRepositoryChecks(graph, evidenceRef, artifacts)
      : { findings: [], assessments: [], inputRefs: [], promotedRootCauseKeys: new Set<string>(), sourceRootCauseKeys: new Set<string>() };
    const securityScans = !disabledRules.has(SECURITY_SCANNER_RESULT_RULE_ID)
      ? await evaluateSecurityScanReports(artifacts, evidenceRef)
      : { assessments: [], inputRefs: [] as ArtifactRef[] };
    const dependencyAudits = !disabledRules.has(DEPENDENCY_VULNERABILITY_RULE_ID)
      ? await evaluateDependencyAuditReports(artifacts, evidenceRef)
      : { assessments: [], inputRefs: [] as ArtifactRef[] };
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
    const findings = [
      ...(!disabledRules.has("typescript.compilerDiagnostic") ? typeScriptCompilerDiagnostics(graph, evidenceRef) : []),
      ...(!disabledRules.has("imports.noDistImports") ? noDistImports(graph, evidenceRef, distExemptions) : []),
      ...(!disabledRules.has("imports.noNodeModulesRelativeImports") ? noNodeModulesRelativeImports(graph, evidenceRef) : []),
      ...(!disabledRules.has("files.noGeneratedAsSource") ? noGeneratedAsSource(graph, evidenceRef) : []),
      ...(!disabledRules.has(GRAMMAR_DIVERGENCE_RULE_ID) ? await grammarDivergenceFindings(graph, input, artifacts) : []),
      ...deadCodeResult.findings,
      ...(!disabledRules.has(NAMING_CONTRACT_RULE_ID) || !disabledRules.has(ANTI_PATTERN_RULE_ID)
        ? await grammarFamilyFindings(graph, input, disabledRules)
        : []),
      ...repositoryChecks.findings,
    ];
    const assessments: Assessment[] = [
      ...complexityAssessments,
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
      ...embeddingDuplicationOpportunities,
      ...repositoryChecks.assessments,
      ...securityScans.assessments,
      ...dependencyAudits.assessments,
    ].filter((assessment) => !repositoryChecks.promotedRootCauseKeys.has(assessment.rootCauseKey));
    const findingInputRefs = uniqueRefs([evidenceRef, ...repositoryChecks.inputRefs]);
    const assessmentInputRefs = uniqueRefs([
      evidenceRef,
      ...overlapResult.inputRefs,
      ...(semanticDebtRef ? [semanticDebtRef] : []),
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
      "CapabilityEvidenceGraph",
      "CapabilityNormalizationReport",
      "CapabilityMap",
      "OwnershipMap",
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
async function grammarFamilyFindings(
  graph: EvidenceGraphLike,
  input: Record<string, unknown> | undefined,
  disabledRules: Set<string>,
): Promise<Finding[]> {
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

  return [
    ...(!disabledRules.has(NAMING_CONTRACT_RULE_ID)
      ? evaluateNamingContract({ facts: graph.facts, grammar, vocabularyNouns })
      : []),
    ...(!disabledRules.has(ANTI_PATTERN_RULE_ID)
      ? evaluateAntiPatterns({ facts: graph.facts, grammar })
      : []),
  ];
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
    const provenUnreachable = payload?.mode === "reachability" && payload.reachableFromRoots === false;
    if (provenUnreachable) {
      findings.push(signal);
      continue;
    }
    risks.push(assessmentFromFinding(signal, {
      kind: "risk",
      verification: "corroborated",
      confidence: payload?.mode === "reachability" ? 0.8 : 0.65,
      evidence: [evidenceRef],
      rationale: payload?.mode === "reachability"
        ? "The export has no resolved consumer, but the containing file remains reachable from a declared root."
        : "No complete declared-root reachability proof is available; dynamic or external consumers may exist.",
    }));
  }

  return { findings, risks };
}

async function grammarDivergenceFindings(
  graph: EvidenceGraphLike,
  input: Record<string, unknown> | undefined,
  artifacts: { list: (type?: string) => Promise<ArtifactRef[]>; read: (ref: ArtifactRef) => Promise<unknown> },
): Promise<Finding[]> {
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

  return evaluateGrammarDivergence({
    facts: graph.facts,
    grammar,
    ownershipEntries: ownership?.entries ?? [],
    contractEntries: (contract?.contracts ?? []) as never,
    vocabularyNouns,
    // WO-18: the package-boundary axis reads the workspace package table
    // (inert unless the package-platform archetype is findings-eligible).
    workspacePackages: repoRoot ? await loadWorkspacePackages(repoRoot) : undefined,
  });
}

function noDistImports(graph: EvidenceGraphLike, evidenceRef: ArtifactRef, exemptions: ReadonlyArray<DistImportExemption> = []): Finding[] {
  // WO-19 Part 2 (operator:wo-19#dist-scope): operator-declared trees where
  // dist imports are the point (examples consume the built package; rule
  // fixtures simulate violations by design). Repo-jurisdiction config.
  const exemptMatchers = exemptions.map((e) => globLikeToRegExp(e.glob));
  const exempt = (fact: { subject: string }) => exemptMatchers.some((re) => re.test(fact.subject.split(":")[0] ?? ""));

  return graph.facts
    .filter((fact) => fact.kind === "import" && typeof fact.value.target === "string" && /(^|\/)dist(\/|$)/.test(fact.value.target))
    .filter((fact) => !exempt(fact))
    .map((fact) => finding("imports.noDistImports", "import", "medium", "Import points at dist output", "Import source files instead of generated dist output.", fact, evidenceRef));
}

function typeScriptCompilerDiagnostics(graph: EvidenceGraphLike, evidenceRef: ArtifactRef): Finding[] {
  return graph.facts
    .filter((fact) => fact.kind === "typescript:diagnostic" && fact.value.category === "error")
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
    .filter((fact) => fact.kind === "import" && typeof fact.value.target === "string" && fact.value.target.includes("node_modules"))
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

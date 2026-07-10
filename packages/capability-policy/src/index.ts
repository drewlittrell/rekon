import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import { type Finding, createFindingReport } from "@rekon/kernel-findings";
import { type Evaluator, defineCapability } from "@rekon/sdk";
import { ANTI_PATTERN_RULE_ID, evaluateAntiPatterns } from "./anti-pattern.js";
import { CAPABILITY_OVERLAP_RULE_ID, evaluateCapabilityOverlap } from "./capability-overlap.js";
import { DEAD_CODE_RULE_ID, evaluateDeadCode, loadDeclaredRoots, loadGeneratedGlobs, loadDistImportExemptions, globLikeToRegExp, type DistImportExemption, loadDeclaredRootGlobs } from "./dead-code.js";
import { NAMING_CONTRACT_RULE_ID, evaluateNamingContract } from "./naming-contract.js";
import { DEBT_MARKERS_RULE_ID, evaluateDebtMarkers } from "./debt-markers.js";
import { DEBT_SEMANTIC_RULE_ID, evaluateSemanticDebt } from "./debt-semantic.js";
import {
  compileEffectiveCapabilityOntology,
  compileEffectiveGrammar,
  detectOverlayPacks,
  loadCapabilityOntologyConfig,
  loadGrammarOverrides,
} from "@rekon/capability-ontology";
import { GRAMMAR_DIVERGENCE_RULE_ID, evaluateGrammarDivergence, loadWorkspacePackages } from "./grammar-divergence.js";

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
export { DEBT_SEMANTIC_RULE_ID, evaluateSemanticDebt } from "./debt-semantic.js";
export { DEAD_CODE_RULE_ID, evaluateDeadCode, isFrameworkEntryPath, loadDeclaredRoots, loadGeneratedGlobs } from "./dead-code.js";
export type { DeadCodeStats } from "./dead-code.js";
export { loadDistImportExemptions, loadDeclaredRootGlobs, type DistImportExemption as DistImportExemptionEntry } from "./dead-code.js";

export const policyEvaluator: Evaluator = {
  id: "@rekon/capability-policy.evaluator",
  produces: ["FindingReport"],
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
    const semanticDebtFindings =
      !disabledRules.has(DEBT_SEMANTIC_RULE_ID) && semanticDebtRef
        ? evaluateSemanticDebt(await artifacts.read(semanticDebtRef), semanticDebtRef)
        : [];
    const inputRefs = semanticDebtRef ? [evidenceRef, semanticDebtRef] : [evidenceRef];
    const findings = [
      ...(!disabledRules.has("imports.noDistImports") ? noDistImports(graph, evidenceRef, distExemptions) : []),
      ...(!disabledRules.has("imports.noNodeModulesRelativeImports") ? noNodeModulesRelativeImports(graph, evidenceRef) : []),
      ...(!disabledRules.has("files.noGeneratedAsSource") ? noGeneratedAsSource(graph, evidenceRef) : []),
      ...(!disabledRules.has("architecture.noUnknownSystemForSourceFile") ? noUnknownSystemForSourceFile(graph, evidenceRef) : []),
      ...(!disabledRules.has(GRAMMAR_DIVERGENCE_RULE_ID) ? await grammarDivergenceFindings(graph, input, artifacts) : []),
      ...(!disabledRules.has(DEBT_MARKERS_RULE_ID) ? evaluateDebtMarkers(graph.facts) : []),
      ...semanticDebtFindings,
      ...(!disabledRules.has(DEAD_CODE_RULE_ID) ? await deadCodeFindings(graph, input) : []),
      ...(!disabledRules.has(CAPABILITY_OVERLAP_RULE_ID) ? await capabilityOverlapFindings(graph, artifacts) : []),
      ...(!disabledRules.has(NAMING_CONTRACT_RULE_ID) || !disabledRules.has(ANTI_PATTERN_RULE_ID)
        ? await grammarFamilyFindings(graph, input, disabledRules)
        : []),
    ];
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
        inputRefs,
        freshness: { status: "fresh" },
        provenance: { confidence: 0.9 },
      },
      findings,
    });

    return [await artifacts.write("FindingReport", report)];
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-policy",
    name: "Policy Evaluator",
    version: "0.1.0",
    roles: ["evaluator"],
    consumes: ["EvidenceGraph", "SemanticDebtJudgmentReport"],
    produces: ["FindingReport"],
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
): Promise<Finding[]> {
  const mapRef = (await artifacts.list("CapabilityMap")).at(-1);
  const map = mapRef ? await artifacts.read(mapRef) as { capabilities?: Array<Record<string, unknown>> } : undefined;
  const ownershipRef = (await artifacts.list("OwnershipMap")).at(-1);
  const ownership = ownershipRef ? await artifacts.read(ownershipRef) as { entries?: Array<{ path: string; ownerSystem: string }> } : undefined;
  const contractRef = (await artifacts.list("CapabilityContract")).at(-1);
  const contract = contractRef ? await artifacts.read(contractRef) as { contracts?: Array<Record<string, unknown>> } : undefined;

  return evaluateCapabilityOverlap({
    capabilities: (map?.capabilities ?? []) as never,
    ownershipEntries: ownership?.entries ?? [],
    contractEntries: (contract?.contracts ?? []) as never,
  });
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
): Promise<Finding[]> {
  const repo = input?.repo as { root?: string } | undefined;
  const repoRoot = typeof repo?.root === "string" ? repo.root : undefined;
  const roots = repoRoot ? await loadDeclaredRoots(repoRoot) : [];
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

  return evaluateDeadCode({ facts: graph.facts, roots, grammar, generatedGlobs });
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

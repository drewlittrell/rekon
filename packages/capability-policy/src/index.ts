import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import { type Finding, createFindingReport } from "@rekon/kernel-findings";
import { type Evaluator, defineCapability } from "@rekon/sdk";
import {
  compileEffectiveCapabilityOntology,
  compileEffectiveGrammar,
  detectOverlayPacks,
  loadCapabilityOntologyConfig,
  loadGrammarOverrides,
} from "@rekon/capability-ontology";
import { GRAMMAR_DIVERGENCE_RULE_ID, evaluateGrammarDivergence } from "./grammar-divergence.js";

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
] as const;

export const policyEvaluator: Evaluator = {
  id: "@rekon/capability-policy.evaluator",
  produces: ["FindingReport"],
  async evaluate({ artifacts, input }) {
    const evidenceRef = (await artifacts.list("EvidenceGraph")).at(-1);

    if (!evidenceRef) {
      throw new Error("@rekon/capability-policy requires an EvidenceGraph artifact.");
    }

    const graph = await artifacts.read(evidenceRef) as EvidenceGraphLike;
    const disabledRules = new Set(
      Array.isArray(input?.disabledRules) ? input.disabledRules.filter((rule): rule is string => typeof rule === "string") : [],
    );
    const findings = [
      ...(!disabledRules.has("imports.noDistImports") ? noDistImports(graph, evidenceRef) : []),
      ...(!disabledRules.has("imports.noNodeModulesRelativeImports") ? noNodeModulesRelativeImports(graph, evidenceRef) : []),
      ...(!disabledRules.has("files.noGeneratedAsSource") ? noGeneratedAsSource(graph, evidenceRef) : []),
      ...(!disabledRules.has("architecture.noUnknownSystemForSourceFile") ? noUnknownSystemForSourceFile(graph, evidenceRef) : []),
      ...(!disabledRules.has(GRAMMAR_DIVERGENCE_RULE_ID) ? await grammarDivergenceFindings(graph, input, artifacts) : []),
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
        inputRefs: [evidenceRef],
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
    consumes: ["EvidenceGraph"],
    produces: ["FindingReport"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "evidence.changed",
        description: "Policy findings are invalid when the evidence graph changes.",
        inputs: ["EvidenceGraph"],
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
  });
}

function noDistImports(graph: EvidenceGraphLike, evidenceRef: ArtifactRef): Finding[] {
  return graph.facts
    .filter((fact) => fact.kind === "import" && typeof fact.value.target === "string" && /(^|\/)dist(\/|$)/.test(fact.value.target))
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

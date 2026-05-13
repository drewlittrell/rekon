import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import { type Finding, createFindingReport } from "@rekon/kernel-findings";
import { type Evaluator, defineCapability } from "@rekon/sdk";

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

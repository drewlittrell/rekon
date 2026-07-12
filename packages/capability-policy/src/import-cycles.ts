import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { isNonProductionPath } from "./grammar-divergence.js";

export const IMPORT_CYCLE_RULE_ID = "architecture.importCycle";

export type ImportGraphEdge = {
  source: string;
  target: string;
  kind: string;
  metadata?: Record<string, unknown>;
};

export type ImportGraphSlice = {
  header?: {
    artifactId?: string;
    provenance?: { notes?: string[] };
  };
  edges?: ImportGraphEdge[];
};

export type ImportCycleEvaluation = {
  assessments: Assessment[];
  inputRefs: ArtifactRef[];
};

export async function evaluateImportCycles(
  artifacts: {
    list(type?: string): Promise<ArtifactRef[]>;
    read(ref: ArtifactRef): Promise<unknown>;
  },
): Promise<ImportCycleEvaluation> {
  const selected = await loadLatestImportGraph(artifacts);
  if (!selected) return { assessments: [], inputRefs: [] };
  return {
    assessments: evaluateImportCycleGraph(selected.graph, selected.ref),
    inputRefs: [selected.ref],
  };
}

export async function loadLatestImportGraph(
  artifacts: {
    list(type?: string): Promise<ArtifactRef[]>;
    read(ref: ArtifactRef): Promise<unknown>;
  },
): Promise<{ ref: ArtifactRef; graph: ImportGraphSlice } | undefined> {
  const refs = await artifacts.list("GraphSlice");
  let selected: { ref: ArtifactRef; graph: ImportGraphSlice } | undefined;
  for (const ref of refs) {
    const graph = await artifacts.read(ref) as ImportGraphSlice;
    if (isImportGraph(graph)) selected = { ref, graph };
  }
  return selected;
}

export function evaluateImportCycleGraph(
  graph: ImportGraphSlice,
  graphRef: ArtifactRef,
): Assessment[] {
  const edges = (graph.edges ?? [])
    .filter((edge) => edge.kind === "imports")
    .filter((edge) => !isTypeOnly(edge))
    .filter((edge) => !isNonProductionPath(edge.source) && !isNonProductionPath(edge.target))
    .filter((edge) => edge.source !== edge.target)
    .sort((left, right) => `${left.source}:${left.target}`.localeCompare(`${right.source}:${right.target}`));
  const components = stronglyConnectedComponents(edges)
    .filter((component) => component.length > 1)
    .sort((left, right) => left.join("|").localeCompare(right.join("|")));

  return components.map((modules) => {
    const memberSet = new Set(modules);
    const cycleEdges = edges
      .filter((edge) => memberSet.has(edge.source) && memberSet.has(edge.target))
      .map((edge) => ({ source: edge.source, target: edge.target }));
    const rootCauseKey = `${IMPORT_CYCLE_RULE_ID}:${modules.join("|")}`;
    return {
      id: `assessment:${rootCauseKey}`,
      kind: "risk",
      type: "architecture",
      impact: modules.length >= 5 ? "high" : "medium",
      title: `Import cycle across ${modules.length} modules`,
      description: "Repository import edges form a strongly connected component, so the modules cannot be ordered without a circular dependency.",
      subjects: modules,
      files: modules,
      ruleId: IMPORT_CYCLE_RULE_ID,
      suggestedAction: "Review the shared responsibility or dependency direction and break the cycle at the narrowest stable boundary.",
      evidence: [graphRef],
      rootCauseKey,
      confidence: {
        score: 0.95,
        basis: "deterministic",
        verification: "verified",
        rationale: "The cycle is computed from resolved repository import edges; behavioral impact remains unproven.",
      },
      details: {
        modules,
        edges: cycleEdges,
        moduleCount: modules.length,
      },
    } satisfies Assessment;
  });
}

function isImportGraph(graph: ImportGraphSlice): boolean {
  return graph.header?.artifactId?.startsWith("import-graph-") === true
    || graph.header?.provenance?.notes?.includes("import-graph") === true;
}

function isTypeOnly(edge: ImportGraphEdge): boolean {
  return edge.metadata?.typeOnly === true || edge.metadata?.importKind === "type-only";
}

function stronglyConnectedComponents(edges: ImportGraphEdge[]): string[][] {
  const nodes = [...new Set(edges.flatMap((edge) => [edge.source, edge.target]))].sort();
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node, []);
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);
  for (const targets of adjacency.values()) targets.sort();

  let nextIndex = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (node: string): void => {
    indices.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const target of adjacency.get(node) ?? []) {
      if (!indices.has(target)) {
        visit(target);
        lowLinks.set(node, Math.min(lowLinks.get(node)!, lowLinks.get(target)!));
      } else if (onStack.has(target)) {
        lowLinks.set(node, Math.min(lowLinks.get(node)!, indices.get(target)!));
      }
    }

    if (lowLinks.get(node) !== indices.get(node)) return;
    const component: string[] = [];
    while (stack.length > 0) {
      const member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    components.push(component.sort());
  };

  for (const node of nodes) if (!indices.has(node)) visit(node);
  return components;
}

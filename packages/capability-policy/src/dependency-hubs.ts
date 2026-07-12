import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { isNonProductionPath } from "./grammar-divergence.js";
import type { ImportGraphEdge, ImportGraphSlice } from "./import-cycles.js";

export const DEPENDENCY_HUB_RULE_ID = "architecture.dependencyHub";
export const DEPENDENCY_HUB_MIN_INCOMING = 5;
export const DEPENDENCY_HUB_MIN_OUTGOING = 5;

export function evaluateDependencyHubs(
  graph: ImportGraphSlice,
  graphRef: ArtifactRef,
): Assessment[] {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();

  for (const edge of graph.edges ?? []) {
    if (!isProductionEdge(edge)) continue;
    add(outgoing, edge.source, edge.target);
    add(incoming, edge.target, edge.source);
  }

  const modules = [...new Set([...incoming.keys(), ...outgoing.keys()])].sort();
  return modules.flatMap((path) => {
    const dependents = [...(incoming.get(path) ?? [])].sort();
    const dependencies = [...(outgoing.get(path) ?? [])].sort();
    if (dependents.length < DEPENDENCY_HUB_MIN_INCOMING || dependencies.length < DEPENDENCY_HUB_MIN_OUTGOING) {
      return [];
    }
    const rootCauseKey = `${DEPENDENCY_HUB_RULE_ID}:${path}`;
    return [{
      id: `assessment:${rootCauseKey}`,
      kind: "risk" as const,
      type: "architecture",
      impact: dependents.length + dependencies.length >= 20 ? "high" as const : "medium" as const,
      title: `Dependency hub at ${path}`,
      description: `The module has ${dependents.length} incoming and ${dependencies.length} outgoing repository dependencies, concentrating change impact at one boundary.`,
      subjects: [path],
      files: [path],
      ruleId: DEPENDENCY_HUB_RULE_ID,
      suggestedAction: "Review whether the module is an intentional stable facade; otherwise separate orchestration from shared contracts or leaf utilities.",
      evidence: [graphRef],
      rootCauseKey,
      confidence: {
        score: 0.9,
        basis: "deterministic" as const,
        verification: "corroborated" as const,
        rationale: "Both incoming and outgoing resolved repository edges exceed the hub threshold; change cost remains contextual.",
      },
      details: {
        incoming: dependents.length,
        outgoing: dependencies.length,
        dependents,
        dependencies,
        thresholds: {
          incoming: DEPENDENCY_HUB_MIN_INCOMING,
          outgoing: DEPENDENCY_HUB_MIN_OUTGOING,
        },
      },
    } satisfies Assessment];
  });
}

function isProductionEdge(edge: ImportGraphEdge): boolean {
  return edge.kind === "imports"
    && edge.source !== edge.target
    && !isNonProductionPath(edge.source)
    && !isNonProductionPath(edge.target);
}

function add(index: Map<string, Set<string>>, key: string, value: string): void {
  const values = index.get(key) ?? new Set<string>();
  values.add(value);
  index.set(key, values);
}

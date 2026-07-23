import type {
  TaskContextGraphCapabilityLike,
  TaskContextGraphClaimLike,
  TaskContextGraphLike,
  TaskContextGraphRefLike,
} from "./task-context-report.js";

export type TaskContextSourceEvidenceGateResult = {
  graph: TaskContextGraphLike;
  removedEvidenceIds: string[];
  removedPaths: string[];
  removedClaimIds: string[];
  removedCapabilityIds: string[];
};

/**
 * Removes graph material whose exact source binding has failed a host-side
 * digest check. The host owns filesystem access; this helper keeps the model
 * package pure and applies one policy across CLI and MCP.
 */
export function excludeStaleTaskContextSourceEvidence(
  graph: TaskContextGraphLike,
  staleEvidenceIds: Iterable<string>,
): TaskContextSourceEvidenceGateResult {
  const staleIds = new Set(staleEvidenceIds);
  if (staleIds.size === 0) {
    return {
      graph,
      removedEvidenceIds: [],
      removedPaths: [],
      removedClaimIds: [],
      removedCapabilityIds: [],
    };
  }

  const evidence = graph.evidence ?? [];
  const stalePaths = new Set(evidence
    .filter((entry) => staleIds.has(entry.id) && typeof entry.path === "string")
    .map((entry) => entry.path as string));
  const retainedExactPaths = new Set(evidence
    .filter((entry) => !staleIds.has(entry.id)
      && typeof entry.path === "string"
      && typeof entry.sourceSha256 === "string")
    .map((entry) => entry.path as string));
  const removedPaths = [...stalePaths]
    .filter((path) => !retainedExactPaths.has(path))
    .sort();
  const removedPathSet = new Set(removedPaths);

  const removedClaimIds: string[] = [];
  const claims = (graph.claims ?? []).filter((claim) => {
    const remove = referencesStaleEvidence(claim, staleIds)
      || refUsesRemovedPath(claim.subject, removedPathSet)
      || (typeof claim.object !== "string" && refUsesRemovedPath(claim.object, removedPathSet));
    if (remove) removedClaimIds.push(claim.id);
    return !remove;
  });

  const removedCapabilityIds: string[] = [];
  const capabilities = (graph.capabilities ?? []).flatMap((capability) => {
    if (referencesStaleEvidence(capability, staleIds)) {
      removedCapabilityIds.push(capability.id);
      return [];
    }
    const implementedBy = (capability.implementedBy ?? [])
      .filter((ref) => !refUsesRemovedPath(ref, removedPathSet));
    if ((capability.implementedBy?.length ?? 0) > 0 && implementedBy.length === 0) {
      removedCapabilityIds.push(capability.id);
      return [];
    }
    return [{ ...capability, ...(capability.implementedBy ? { implementedBy } : {}) }];
  });

  return {
    graph: {
      ...graph,
      nodes: (graph.nodes ?? []).filter((node) => !refUsesRemovedPath(node, removedPathSet)),
      evidence: evidence.filter((entry) => !staleIds.has(entry.id)),
      claims,
      capabilities,
    },
    removedEvidenceIds: [...staleIds].sort(),
    removedPaths,
    removedClaimIds: removedClaimIds.sort(),
    removedCapabilityIds: removedCapabilityIds.sort(),
  };
}

function referencesStaleEvidence(
  value: TaskContextGraphClaimLike | TaskContextGraphCapabilityLike,
  staleIds: ReadonlySet<string>,
): boolean {
  return (value.evidenceRefs ?? []).some((ref) => staleIds.has(ref));
}

function refUsesRemovedPath(
  ref: TaskContextGraphRefLike,
  removedPaths: ReadonlySet<string>,
): boolean {
  for (const path of removedPaths) {
    if (ref.id === path || ref.id.startsWith(`${path}#`)) return true;
  }
  return false;
}

import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type {
  CapabilityContract,
  TaskPact,
  TaskPactImpactObligation,
  TaskContextGuidanceFreshness,
} from "@rekon/kernel-repo-model";

import type {
  DeclaredTaskContextPath,
  DeclaredTaskConstraint,
  DeclaredTaskVerificationHint,
  TaskContextGraphLike,
} from "./task-context-report.js";

export type TaskContractGuidance = {
  requiredContextPaths: DeclaredTaskContextPath[];
  constraints: DeclaredTaskConstraint[];
  verificationHints: DeclaredTaskVerificationHint[];
  /** CapabilityContract clause ids retained for compatibility with the v1 caller surface. */
  matchedContractIds: string[];
  matchedSystemContractIds: string[];
  matchedFlowContractIds: string[];
  impactObligations: TaskPactImpactObligation[];
  warnings: string[];
};

export function selectTaskContractGuidance(input: {
  paths: string[];
  graph: TaskContextGraphLike;
  capabilityContract?: CapabilityContract;
  capabilityContractRef?: ArtifactRef;
  capabilityContractFreshness?: TaskContextGuidanceFreshness;
  taskPact?: TaskPact;
  taskPactRef?: ArtifactRef;
}): TaskContractGuidance {
  const pactGuidance = selectTaskPactGuidance(input.taskPact, input.taskPactRef);
  if (!input.capabilityContract) return pactGuidance;
  const selectedPaths = new Set(input.paths.map(normalizePath).filter(Boolean));
  if (selectedPaths.size === 0) return pactGuidance;

  const selectedCapabilities = (input.graph.capabilities ?? []).filter((capability) =>
    (capability.implementedBy ?? []).some((ref) => selectedPaths.has(normalizePath(ref.id))),
  );
  if (selectedCapabilities.length === 0) return pactGuidance;

  const freshness = input.capabilityContractFreshness
    ?? input.capabilityContract.header.freshness?.status
    ?? "unknown";
  const constraints: DeclaredTaskConstraint[] = [];
  const verificationHints: DeclaredTaskVerificationHint[] = [];
  const requiredContextPaths: DeclaredTaskContextPath[] = [];
  const matchedContractIds: string[] = [];

  for (const contract of input.capabilityContract.contracts) {
    if (contract.status !== "configured") continue;
    const matches = selectedCapabilities.some((capability) =>
      normalizeTerm(capability.verb) === normalizeTerm(contract.match.verb)
      && normalizeTerm(capability.noun) === normalizeTerm(contract.match.noun),
    );
    if (!matches) continue;
    matchedContractIds.push(contract.id);
    const evidenceRefs = [contractEvidenceRef(input.capabilityContract, contract.id, input.capabilityContractRef)];
    const common = { evidenceRefs, freshness };

    for (const statement of contract.preservationRules ?? []) {
      constraints.push({ statement, ...common });
    }
    addPlacementConstraint(constraints, contract.allowedLayers, `Keep ${label(contract.match)} within allowed layers`, common);
    addPlacementConstraint(constraints, contract.forbiddenLayers, `Do not move ${label(contract.match)} into forbidden layers`, common);
    addPlacementConstraint(constraints, contract.allowedSystems, `Keep ${label(contract.match)} within allowed systems`, common);
    addPlacementConstraint(constraints, contract.forbiddenSystems, `Do not move ${label(contract.match)} into forbidden systems`, common);
    if ((contract.requiredNeighbors ?? []).length > 0) {
      constraints.push({
        statement: `Preserve required neighbors for ${label(contract.match)}: ${renderNeighbors(contract.requiredNeighbors ?? [])}.`,
        ...common,
      });
      for (const neighbor of contract.requiredNeighbors ?? []) {
        const matchingCapabilities = (input.graph.capabilities ?? []).filter((capability) =>
          normalizeTerm(capability.verb) === normalizeTerm(neighbor.verb)
          && normalizeTerm(capability.noun) === normalizeTerm(neighbor.noun),
        );
        for (const capability of matchingCapabilities) {
          for (const implementation of capability.implementedBy ?? []) {
            if (implementation.kind !== "file") continue;
            const path = normalizePath(implementation.id);
            if (!path) continue;
            requiredContextPaths.push({
              path,
              reason: `repository contract ${contract.id} requires neighboring capability ${label(neighbor)}`,
              evidenceRefs: [...new Set([...evidenceRefs, ...(capability.evidenceRefs ?? [])])],
              freshness,
              routeRole: "implementation",
              necessity: "required",
              necessityReason: `Matched repository law requires the ${label(neighbor)} implementation for this task.`,
            });
          }
        }
      }
    }
    if ((contract.forbiddenNeighbors ?? []).length > 0) {
      constraints.push({
        statement: `Do not introduce forbidden neighbors for ${label(contract.match)}: ${renderNeighbors(contract.forbiddenNeighbors ?? [])}.`,
        ...common,
      });
    }
    for (const command of contract.requiredChecks ?? []) {
      verificationHints.push({
        command,
        reason: `capability contract ${contract.id} requires this check (hint only, not executed)`,
        ...common,
      });
    }
  }

  return {
    requiredContextPaths: mergeTaskContextPaths([...pactGuidance.requiredContextPaths, ...requiredContextPaths]),
    constraints: dedupe([...constraints, ...pactGuidance.constraints], (entry) => entry.statement.toLowerCase()),
    verificationHints: dedupe([...verificationHints, ...pactGuidance.verificationHints], (entry) => `${entry.command ?? ""}\0${entry.artifact ?? ""}`),
    matchedContractIds: [...new Set(matchedContractIds)],
    matchedSystemContractIds: pactGuidance.matchedSystemContractIds,
    matchedFlowContractIds: pactGuidance.matchedFlowContractIds,
    impactObligations: pactGuidance.impactObligations,
    warnings: pactGuidance.warnings,
  };
}

function selectTaskPactGuidance(taskPact?: TaskPact, taskPactRef?: ArtifactRef): TaskContractGuidance {
  if (!taskPact) return emptyGuidance();
  const pactRef = taskPactRef ?? {
    type: taskPact.header.artifactType,
    id: taskPact.header.artifactId,
    schemaVersion: taskPact.header.schemaVersion,
  };
  const pactEvidence = `${pactRef.type}:${pactRef.id}`;
  const contractByRef = new Map(taskPact.contracts.map((contract) => [
    `${contract.ref.type}:${contract.ref.id}`,
    contract,
  ]));
  const constraints: DeclaredTaskConstraint[] = [];
  for (const obligation of taskPact.impactObligations) {
    if (obligation.kind === "verify") continue;
    constraints.push({
      statement: obligation.statement,
      evidenceRefs: [
        `${pactEvidence}#${obligation.id}`,
        ...obligation.contractRefs.map((ref) => `${ref.type}:${ref.id}`),
      ],
      freshness: taskPact.header.freshness?.status ?? "unknown",
    });
  }
  for (const constraint of [...taskPact.constraints].sort((left, right) =>
    constraintPriority(left.kind) - constraintPriority(right.kind)
      || left.id.localeCompare(right.id))) {
    const contract = contractByRef.get(`${constraint.contractRef.type}:${constraint.contractRef.id}`);
    constraints.push({
      statement: constraint.statement,
      ...(constraint.paths.length === 1 && !constraint.paths[0]?.includes("*")
        ? { path: constraint.paths[0] }
        : {}),
      evidenceRefs: [
        `${pactEvidence}#${constraint.id}`,
        `${constraint.contractRef.type}:${constraint.contractRef.id}`,
      ],
      freshness: contract?.freshness ?? taskPact.header.freshness?.status ?? "unknown",
    });
  }
  const requiredContextPaths: DeclaredTaskContextPath[] = [
    ...taskPact.requiredContextPaths.map((path) => ({
      path,
      reason: "matched TaskPact requires this repository context",
      evidenceRefs: [pactEvidence],
      freshness: taskPact.header.freshness?.status ?? "unknown",
      routeRole: "repository-law" as const,
      necessity: "required" as const,
      necessityReason: "Matched repository law declares this path required context for the task.",
    })),
    ...taskPact.impactObligations
      .filter((obligation) => obligation.kind === "inspect")
      .flatMap((obligation) => obligation.paths.map((path) => ({
        path,
        reason: obligation.statement,
        evidenceRefs: [
          `${pactEvidence}#${obligation.id}`,
          ...obligation.contractRefs.map((ref) => `${ref.type}:${ref.id}`),
        ],
        freshness: taskPact.header.freshness?.status ?? "unknown",
        routeRole: "handoff" as const,
        necessity: "required" as const,
        necessityReason: "The matched flow pact requires this path to preserve an end-to-end handoff.",
      }))),
  ];
  const checkEvidence = [
    pactEvidence,
    ...taskPact.contracts.map((contract) => `${contract.ref.type}:${contract.ref.id}`),
  ];
  return {
    requiredContextPaths: mergeTaskContextPaths(requiredContextPaths),
    constraints: dedupe(constraints, (entry) => entry.statement.toLowerCase()),
    verificationHints: taskPact.requiredChecks.map((command) => ({
      command,
      reason: "matched TaskPact requires this check (hint only, not executed)",
      evidenceRefs: checkEvidence,
      freshness: taskPact.header.freshness?.status ?? "unknown",
    })),
    matchedContractIds: [],
    matchedSystemContractIds: taskPact.contracts
      .filter((contract) => contract.contractType === "SystemContract")
      .map((contract) => contract.contractId),
    matchedFlowContractIds: taskPact.contracts
      .filter((contract) => contract.contractType === "FlowContract")
      .map((contract) => contract.contractId),
    impactObligations: taskPact.impactObligations,
    warnings: taskPact.warnings,
  };
}

function constraintPriority(kind: TaskPact["constraints"][number]["kind"]): number {
  if (kind === "prohibition") return 0;
  if (kind === "invariant") return 1;
  if (kind === "handoff") return 2;
  if (kind === "outcome") return 3;
  return 4;
}

function addPlacementConstraint(
  target: DeclaredTaskConstraint[],
  values: string[] | undefined,
  prefix: string,
  common: Pick<DeclaredTaskConstraint, "evidenceRefs" | "freshness">,
): void {
  if (!values || values.length === 0) return;
  target.push({ statement: `${prefix}: ${values.join(", ")}.`, ...common });
}

function contractEvidenceRef(contract: CapabilityContract, id: string, ref?: ArtifactRef): string {
  return `${ref?.type ?? "CapabilityContract"}:${ref?.id ?? contract.header.artifactId}#${id}`;
}

function label(match: CapabilityContract["contracts"][number]["match"]): string {
  return `${match.verb} ${match.noun}`.trim();
}

function renderNeighbors(neighbors: Array<{ verb: string; noun: string }>): string {
  return neighbors.map((neighbor) => `${neighbor.verb} ${neighbor.noun}`.trim()).join(", ");
}

function normalizePath(value: string): string {
  return value.split("#")[0]?.replace(/^\.\//u, "").trim() ?? "";
}

function normalizeTerm(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function dedupe<T>(values: T[], keyOf: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = keyOf(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeTaskContextPaths(values: DeclaredTaskContextPath[]): DeclaredTaskContextPath[] {
  const byPath = new Map<string, DeclaredTaskContextPath>();
  const result: DeclaredTaskContextPath[] = [];
  for (const value of values) {
    const existing = byPath.get(value.path);
    if (!existing) {
      const retained = { ...value, evidenceRefs: [...value.evidenceRefs] };
      byPath.set(value.path, retained);
      result.push(retained);
      continue;
    }
    existing.evidenceRefs = [...new Set([...existing.evidenceRefs, ...value.evidenceRefs])];
    if (contextPathPriority(value) > contextPathPriority(existing)) {
      existing.routeRole = value.routeRole;
      existing.necessity = value.necessity;
      existing.necessityReason = value.necessityReason;
    }
  }
  return result;
}

function contextPathPriority(value: DeclaredTaskContextPath): number {
  const necessity = value.necessity === "required"
    ? 30
    : value.necessity === "conditional"
      ? 20
      : value.necessity === "supporting"
        ? 10
        : 0;
  const role = value.routeRole === "handoff"
    ? 8
    : value.routeRole === "implementation"
      ? 7
      : value.routeRole === "repository-law"
        ? 6
        : 0;
  return necessity + role;
}

function emptyGuidance(): TaskContractGuidance {
  return {
    requiredContextPaths: [],
    constraints: [],
    verificationHints: [],
    matchedContractIds: [],
    matchedSystemContractIds: [],
    matchedFlowContractIds: [],
    impactObligations: [],
    warnings: [],
  };
}

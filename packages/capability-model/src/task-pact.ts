import { createHash } from "node:crypto";
import type { ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type ContractDriftReport,
  type EffectiveContractRegistry,
  type FlowContract,
  type SystemContract,
  type TaskPactConstraint,
  type TaskPactContract,
  type TaskPactImpactObligation,
  createTaskPact,
} from "@rekon/kernel-repo-model";

export type BuildTaskPactInput = {
  repoId: string;
  taskText: string;
  goal?: string;
  paths: string[];
  generatedAt?: string;
  registry: EffectiveContractRegistry;
  registryRef: ArtifactRef;
  systemContracts: SystemContract[];
  flowContracts: FlowContract[];
  driftReport?: ContractDriftReport;
  driftReportRef?: ArtifactRef;
};

/** Resolve the adopted subset of repository law that applies to one task. */
export function buildTaskPact(input: BuildTaskPactInput) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const selectedPaths = unique(input.paths.map(normalizePath));
  const registryByKey = new Map(input.registry.entries.map((entry) => [`${entry.contractType}:${entry.contractId}`, entry]));
  const driftByKey = new Map((input.driftReport?.entries ?? []).map((entry) => [`${entry.contractType}:${entry.contractId}`, entry]));
  const contracts: TaskPactContract[] = [];
  const constraints: TaskPactConstraint[] = [];
  const impactObligations: TaskPactImpactObligation[] = [];
  const requiredContextPaths: string[] = [];
  const requiredEvidencePaths: string[] = [];
  const requiredChecks: string[] = [];
  const warnings: string[] = [];

  for (const contract of input.systemContracts) {
    if (!selectedPaths.some((path) => contract.system.paths.some((scope) => pathMatchesScope(path, scope)))) continue;
    const registryEntry = registryByKey.get(`SystemContract:${contract.contractId}`);
    if (!registryEntry) continue;
    const ref = registryEntry.ref;
    const freshness = contractFreshness("SystemContract", contract.contractId, contract.header.freshness?.status, driftByKey);
    contracts.push({ contractType: "SystemContract", contractId: contract.contractId, authority: contract.authority, confidence: contract.confidence, freshness, ref });
    constraints.push(constraint(contract, ref, "purpose", `${contract.contractId}.purpose`, `Preserve system purpose: ${contract.purpose}`, contract.system.paths));
    for (const [index, outcome] of contract.userOutcomes.entries()) constraints.push(constraint(contract, ref, "outcome", `${contract.contractId}.outcome.${index + 1}`, `Preserve user outcome: ${outcome}`, contract.system.paths));
    for (const clause of contract.invariants) {
      constraints.push(constraint(contract, ref, "invariant", `${contract.contractId}.invariant.${clause.id}`, clause.statement, contract.system.paths));
      impactObligations.push({ id: `preserve:SystemContract:${contract.contractId}:${clause.id}`, kind: "preserve", statement: clause.statement, paths: selectedPaths, requiredChecks: contract.requiredChecks, contractRefs: [ref] });
    }
    for (const clause of contract.prohibitedChanges) constraints.push(constraint(contract, ref, "prohibition", `${contract.contractId}.prohibition.${clause.id}`, clause.statement, contract.system.paths));
    requiredContextPaths.push(...contract.requiredContextPaths);
    requiredChecks.push(...contract.requiredChecks);
    addFreshnessWarning(warnings, "SystemContract", contract.contractId, freshness);
  }

  for (const contract of input.flowContracts) {
    const flowPaths = unique([...contract.paths, ...contract.stages.flatMap((stage) => stage.paths ?? [])]);
    if (!selectedPaths.some((path) => flowPaths.some((scope) => pathMatchesScope(path, scope)))) continue;
    const registryEntry = registryByKey.get(`FlowContract:${contract.contractId}`);
    if (!registryEntry) continue;
    const ref = registryEntry.ref;
    const freshness = contractFreshness("FlowContract", contract.contractId, contract.header.freshness?.status, driftByKey);
    contracts.push({ contractType: "FlowContract", contractId: contract.contractId, authority: contract.authority, confidence: contract.confidence, freshness, ref });
    constraints.push(constraint(contract, ref, "purpose", `${contract.contractId}.purpose`, `Preserve end-to-end flow purpose: ${contract.purpose}`, flowPaths));
    for (const [index, outcome] of contract.userOutcomes.entries()) constraints.push(constraint(contract, ref, "outcome", `${contract.contractId}.outcome.${index + 1}`, `Preserve end-to-end user outcome: ${outcome}`, flowPaths));
    for (const clause of contract.invariants) {
      constraints.push(constraint(contract, ref, "invariant", `${contract.contractId}.invariant.${clause.id}`, clause.statement, flowPaths));
      impactObligations.push({ id: `preserve:FlowContract:${contract.contractId}:${clause.id}`, kind: "preserve", statement: clause.statement, paths: flowPaths, requiredChecks: contract.requiredChecks, contractRefs: [ref] });
    }
    const stageById = new Map(contract.stages.map((stage) => [stage.id, stage]));
    for (const stage of contract.stages) {
      for (const [index, responsibility] of (stage.responsibilities ?? []).entries()) {
        constraints.push(constraint(
          contract,
          ref,
          "invariant",
          stageResponsibilityConstraintId(contract.contractId, stage.id, index),
          `Stage ${stage.label ?? stage.id} responsibility: ${responsibility}`,
          stage.paths ?? flowPaths,
        ));
      }
    }
    for (const handoff of contract.handoffs) {
      const handoffPaths = unique([...(stageById.get(handoff.fromStageId)?.paths ?? []), ...(stageById.get(handoff.toStageId)?.paths ?? [])]);
      for (const [index, guarantee] of (handoff.guarantees ?? []).entries()) constraints.push(constraint(contract, ref, "handoff", `${contract.contractId}.handoff.${handoff.id}.guarantee.${index + 1}`, guarantee, handoffPaths));
      if (handoff.failureSemantics) constraints.push(constraint(contract, ref, "handoff", `${contract.contractId}.handoff.${handoff.id}.failure`, handoff.failureSemantics, handoffPaths));
      const selectedHandoff = selectedPaths.some((path) =>
        (handoffPaths.length > 0 ? handoffPaths : flowPaths).some((scope) => pathMatchesScope(path, scope)));
      if (selectedHandoff) {
        requiredChecks.push(...(handoff.verification?.requiredChecks ?? []));
        requiredEvidencePaths.push(...(handoff.verification?.requiredEvidencePaths ?? []));
        requiredContextPaths.push(...(handoff.verification?.requiredEvidencePaths ?? []));
      }
    }
    const inspectPaths = flowPaths.filter((path) => !selectedPaths.includes(path));
    if (inspectPaths.length > 0) impactObligations.push({
      id: `inspect:FlowContract:${contract.contractId}`,
      kind: "inspect",
      statement: `Inspect the remaining ${contract.name} flow stages before changing this task's selected paths.`,
      paths: inspectPaths,
      requiredChecks: [],
      contractRefs: [ref],
    });
    requiredContextPaths.push(...flowPaths);
    requiredChecks.push(...contract.requiredChecks);
    addFreshnessWarning(warnings, "FlowContract", contract.contractId, freshness);
  }

  const checks = unique(requiredChecks);
  if (checks.length > 0 && contracts.length > 0) impactObligations.push({
    id: `verify:${createHash("sha256").update(checks.join("\n")).digest("hex").slice(0, 12)}`,
    kind: "verify",
    statement: "Run the checks required by the matched repository contracts.",
    paths: unique([...selectedPaths, ...requiredEvidencePaths]),
    requiredChecks: checks,
    contractRefs: contracts.map((contract) => contract.ref),
  });

  const inputRefs = uniqueRefs([
    input.registryRef,
    ...(input.driftReportRef ? [input.driftReportRef] : []),
    ...contracts.map((contract) => contract.ref),
  ]);
  const taskIdentity = createHash("sha256").update(`${input.taskText}\n${selectedPaths.join("\n")}`).digest("hex").slice(0, 16);
  return createTaskPact({
    header: {
      artifactType: "TaskPact",
      artifactId: `task-pact-${taskIdentity}-${generatedAt.replace(/[^0-9A-Za-z]/gu, "")}`,
      schemaVersion: "1.0.0",
      generatedAt,
      subject: { repoId: input.repoId, paths: selectedPaths },
      producer: { id: "@rekon/capability-model", version: "0.1.0" },
      inputRefs,
      supersession: { key: `task-pact:${taskIdentity}` },
      freshness: { status: warnings.length > 0 ? "partial" : inputRefs.length > 0 ? "fresh" : "unknown" },
      provenance: { confidence: contracts.length > 0 ? Math.min(...contracts.map((contract) => contract.confidence)) : 0, notes: ["task-resolved adopted repository law"] },
    },
    task: { text: input.taskText, ...(input.goal ? { goal: input.goal } : {}), paths: selectedPaths },
    contracts,
    requiredContextPaths: unique(requiredContextPaths.filter((path) => !selectedPaths.includes(path))),
    constraints,
    impactObligations,
    requiredChecks: checks,
    warnings,
  });
}

function constraint(
  contract: SystemContract | FlowContract,
  ref: ArtifactRef,
  kind: TaskPactConstraint["kind"],
  id: string,
  statement: string,
  paths: string[],
): TaskPactConstraint {
  return { id, kind, statement, paths: unique(paths), contractRef: ref, authority: contract.authority, confidence: contract.confidence };
}

function stageResponsibilityConstraintId(flowId: string, stageId: string, index: number): string {
  return `${flowId}.stage.${stageId}.responsibility.${index + 1}`;
}

function contractFreshness(
  type: "SystemContract" | "FlowContract",
  id: string,
  headerStatus: "fresh" | "stale" | "partial" | "unknown" | undefined,
  drift: ReadonlyMap<string, { status: "current" | "drifted" | "unverified" }>,
): TaskPactContract["freshness"] {
  const status = drift.get(`${type}:${id}`)?.status;
  if (status === "drifted") return "stale";
  if (status === "unverified") return "unknown";
  return headerStatus ?? "unknown";
}

function addFreshnessWarning(warnings: string[], type: string, id: string, freshness: TaskPactContract["freshness"]): void {
  if (freshness !== "fresh") warnings.push(`${type}:${id} is ${freshness}; verify current repository law before relying on it.`);
}

function pathMatchesScope(path: string, scope: string): boolean {
  if (scope.endsWith("/**")) return path === scope.slice(0, -3) || path.startsWith(scope.slice(0, -2));
  if (!scope.includes("*")) return path === scope;
  const escaped = scope.replace(/[.+?^${}()|[\]\\]/gu, "\\$&").replace(/\*\*/gu, ".*").replace(/\*/gu, "[^/]*");
  return new RegExp(`^${escaped}$`, "u").test(path);
}

function normalizePath(value: string): string {
  return value.split("#")[0]?.replace(/^\.\//u, "").trim() ?? "";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

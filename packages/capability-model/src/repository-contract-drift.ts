import type { ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type ContractDriftEntry,
  type ContractDriftReason,
  type EffectiveContractRegistry,
  type FlowContract,
  type ObservedRepo,
  type OwnershipMap,
  type SystemContract,
  createContractDriftReport,
} from "@rekon/kernel-repo-model";
import type { RepositoryIntelligenceGraphRef, RepositoryIntelligenceGraphView } from "./repository-intelligence-graph.js";

export type BuildRepositoryContractDriftInput = {
  repoId: string;
  generatedAt?: string;
  registry: EffectiveContractRegistry;
  registryRef: ArtifactRef;
  contracts: Array<SystemContract | FlowContract>;
  sources: Array<{ path: string; digest: string }>;
  graph: RepositoryIntelligenceGraphView;
  observedRepo?: ObservedRepo;
  ownershipMap?: OwnershipMap;
};

const FLOW_RELATIONSHIPS = new Set([
  "calls", "enters", "reaches", "handles", "emits", "subscribes", "accesses",
  "propagates_error", "contains", "imports", "depends_on", "produces", "consumes",
]);

/** Compare adopted contract artifacts with current sources and repository models. */
export function buildRepositoryContractDriftReport(input: BuildRepositoryContractDriftInput) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const sourceByPath = new Map(input.sources.map((source) => [source.path, source]));
  const contractByKey = new Map(input.contracts.map((contract) => [
    `${contract.header.artifactType}:${contract.contractId}`,
    contract,
  ]));
  const graphPaths = new Set(input.graph.nodes.flatMap(pathForRef));
  const entries: ContractDriftEntry[] = [];

  for (const registryEntry of input.registry.entries) {
    if (registryEntry.contractType !== "SystemContract" && registryEntry.contractType !== "FlowContract") continue;
    const contract = contractByKey.get(`${registryEntry.contractType}:${registryEntry.contractId}`);
    if (!contract) {
      entries.push({
        contractType: registryEntry.contractType,
        contractId: registryEntry.contractId,
        contractRef: registryEntry.ref,
        status: "unverified",
        reasons: [{
          code: "contract.artifact_missing",
          severity: "warning",
          message: "The effective registry references a contract artifact that was not available for reconciliation.",
          paths: registryEntry.paths,
          evidenceRefs: [registryEntry.ref],
        }],
      });
      continue;
    }

    const reasons = sourceReasons(contract, sourceByPath);
    if (contract.header.artifactType === "SystemContract") {
      reasons.push(...systemReasons(contract as SystemContract, input.observedRepo, input.ownershipMap, graphPaths));
    } else {
      reasons.push(...flowReasons(contract as FlowContract, input.graph, graphPaths));
    }
    const hasError = reasons.some((reason) => reason.severity === "error");
    const status = hasError ? "drifted" : reasons.length > 0 ? "unverified" : "current";
    entries.push({
      contractType: registryEntry.contractType,
      contractId: registryEntry.contractId,
      contractRef: registryEntry.ref,
      status,
      ...(contract.source.path ? {
        source: {
          path: contract.source.path,
          ...(contract.source.digest ? { recordedDigest: contract.source.digest } : {}),
          ...(sourceByPath.get(contract.source.path)?.digest ? { currentDigest: sourceByPath.get(contract.source.path)!.digest } : {}),
        },
      } : {}),
      reasons,
    });
  }

  const inputRefs = uniqueRefs([
    input.registryRef,
    ...input.graph.inputRefs,
    ...entries.map((entry) => entry.contractRef),
  ]);
  return createContractDriftReport({
    header: {
      artifactType: "ContractDriftReport",
      artifactId: `contract-drift-report-${generatedAt.replace(/[^0-9A-Za-z]/gu, "")}`,
      schemaVersion: "1.0.0",
      generatedAt,
      subject: { repoId: input.repoId },
      producer: { id: "@rekon/capability-model", version: "1.0.0" },
      inputRefs,
      supersession: { key: "repository-contract-drift" },
      freshness: { status: entries.some((entry) => entry.status === "drifted") ? "partial" : inputRefs.length > 0 ? "fresh" : "unknown" },
      provenance: { notes: ["deterministic contract source, scope, and route reconciliation"] },
    },
    registryRef: input.registryRef,
    entries,
  });
}

function sourceReasons(
  contract: SystemContract | FlowContract,
  sourceByPath: ReadonlyMap<string, { path: string; digest: string }>,
): ContractDriftReason[] {
  if (!contract.source.path) return [{
    code: "contract.source_unverified",
    severity: "warning",
    message: "The contract artifact does not identify a committed source path.",
    paths: [],
    evidenceRefs: [artifactRef(contract)],
  }];
  const current = sourceByPath.get(contract.source.path);
  if (!current) return [{
    code: "contract.source_missing",
    severity: "error",
    message: "The committed contract source is missing from current source discovery.",
    paths: [contract.source.path],
    evidenceRefs: [artifactRef(contract)],
  }];
  if (!contract.source.digest) return [{
    code: "contract.source_digest_unverified",
    severity: "warning",
    message: "The contract artifact does not retain the source digest used to compile it.",
    paths: [contract.source.path],
    evidenceRefs: [artifactRef(contract)],
  }];
  if (contract.source.digest !== current.digest) return [{
    code: "contract.source_changed",
    severity: "error",
    message: "The committed contract source changed after this contract artifact was compiled.",
    paths: [contract.source.path],
    evidenceRefs: [artifactRef(contract)],
  }];
  return [];
}

function systemReasons(
  contract: SystemContract,
  observedRepo: ObservedRepo | undefined,
  ownershipMap: OwnershipMap | undefined,
  graphPaths: ReadonlySet<string>,
): ContractDriftReason[] {
  const observed = observedRepo?.systems.find((system) => system.id === contract.system.id);
  const ownedPaths = (ownershipMap?.entries ?? [])
    .filter((entry) => entry.ownerSystem === contract.system.id)
    .map((entry) => entry.path);
  const currentPaths = unique([...(observed?.paths ?? []), ...ownedPaths]);
  const uncovered = currentPaths.filter((path) => !contract.system.paths.some((scope) => pathMatchesScope(path, scope)));
  const reasons: ContractDriftReason[] = [];
  if (uncovered.length > 0) reasons.push({
    code: "contract.system_scope_uncovered",
    severity: "error",
    message: "Current ownership includes paths outside the adopted system contract scope.",
    paths: uncovered,
    evidenceRefs: uniqueRefs([...(observed?.evidence ?? []), ...(ownershipMap ? [artifactRef(ownershipMap)] : [])]),
  });
  const missingContext = contract.requiredContextPaths.filter((path) => !graphPaths.has(path));
  if (missingContext.length > 0) reasons.push({
    code: "contract.required_context_missing",
    severity: "error",
    message: "A required contract context path is no longer present in the repository graph.",
    paths: missingContext,
    evidenceRefs: [artifactRef(contract)],
  });
  if (!observed && ownedPaths.length === 0) reasons.push({
    code: "contract.system_unverified",
    severity: "warning",
    message: "Current repository projections do not expose this adopted system boundary.",
    paths: contract.system.paths,
    evidenceRefs: [artifactRef(contract)],
  });
  return reasons;
}

function flowReasons(
  contract: FlowContract,
  graph: RepositoryIntelligenceGraphView,
  graphPaths: ReadonlySet<string>,
): ContractDriftReason[] {
  const reasons: ContractDriftReason[] = [];
  const missing = unique(contract.stages.flatMap((stage) => stage.paths ?? []).filter((path) => !graphPaths.has(path)));
  if (missing.length > 0) reasons.push({
    code: "contract.flow_stage_missing",
    severity: "error",
    message: "A source path declared by an adopted flow stage is absent from the current graph.",
    paths: missing,
    evidenceRefs: [artifactRef(contract)],
  });
  const stageById = new Map(contract.stages.map((stage) => [stage.id, stage]));
  const unverified = contract.handoffs.filter((handoff) => {
    const from = stageById.get(handoff.fromStageId)?.paths ?? [];
    const to = stageById.get(handoff.toStageId)?.paths ?? [];
    if (from.length === 0 || to.length === 0) return false;
    return !hasBoundedRoute(graph, from, to, 8);
  });
  if (unverified.length > 0) reasons.push({
    code: "contract.flow_handoff_unverified",
    severity: "warning",
    message: `Current graph evidence does not verify ${unverified.length} adopted flow handoff(s).`,
    paths: unique(unverified.flatMap((handoff) => [
      ...(stageById.get(handoff.fromStageId)?.paths ?? []),
      ...(stageById.get(handoff.toStageId)?.paths ?? []),
    ])),
    evidenceRefs: uniqueRefs([artifactRef(contract), ...graph.inputRefs]),
  });
  return reasons;
}

function hasBoundedRoute(
  graph: RepositoryIntelligenceGraphView,
  fromPaths: string[],
  toPaths: string[],
  maxDepth: number,
): boolean {
  const targets = new Set(graph.nodes.filter((node) => pathForRef(node).some((path) => toPaths.includes(path))).map(refKey));
  const starts = graph.nodes.filter((node) => pathForRef(node).some((path) => fromPaths.includes(path)));
  if (starts.some((node) => targets.has(refKey(node)))) return true;
  const adjacency = new Map<string, RepositoryIntelligenceGraphRef[]>();
  for (const claim of graph.claims) {
    if (claim.status !== "accepted" || !FLOW_RELATIONSHIPS.has(claim.predicate) || typeof claim.object === "string") continue;
    const list = adjacency.get(refKey(claim.subject)) ?? [];
    list.push(claim.object);
    adjacency.set(refKey(claim.subject), list);
  }
  const queue = starts.map((node) => ({ node, depth: 0 }));
  const seen = new Set(starts.map(refKey));
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    if (current.depth >= maxDepth) continue;
    for (const next of adjacency.get(refKey(current.node)) ?? []) {
      const key = refKey(next);
      if (targets.has(key)) return true;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ node: next, depth: current.depth + 1 });
    }
  }
  return false;
}

function pathForRef(ref: RepositoryIntelligenceGraphRef): string[] {
  if (ref.kind === "file") return [ref.id];
  if (ref.kind === "symbol" || ref.kind === "callable") {
    const path = ref.id.replace(/^callable:/u, "").split("#")[0]!.split(":")[0]!;
    return path ? [path] : [];
  }
  return [];
}

function pathMatchesScope(path: string, scope: string): boolean {
  if (scope.endsWith("/**")) return path === scope.slice(0, -3) || path.startsWith(scope.slice(0, -2));
  if (!scope.includes("*")) return path === scope;
  const escaped = scope.replace(/[.+?^${}()|[\]\\]/gu, "\\$&").replace(/\*\*/gu, ".*").replace(/\*/gu, "[^/]*");
  return new RegExp(`^${escaped}$`, "u").test(path);
}

function artifactRef(artifact: { header: { artifactType: string; artifactId: string; schemaVersion: string } }): ArtifactRef {
  return { type: artifact.header.artifactType, id: artifact.header.artifactId, schemaVersion: artifact.header.schemaVersion };
}

function refKey(ref: RepositoryIntelligenceGraphRef): string {
  return `${ref.kind}:${ref.id}`;
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

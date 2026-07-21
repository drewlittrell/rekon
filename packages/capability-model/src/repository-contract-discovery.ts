import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type ContractCandidate,
  type ContractCandidateReport,
  type EffectiveContractRegistry,
  type FlowContractSource,
  type ObservedRepo,
  type OwnershipMap,
  type CapabilityMap,
  type SystemContractSource,
  createContractCandidateReport,
} from "@rekon/kernel-repo-model";
import type {
  RepositoryIntelligenceGraphClaim,
  RepositoryIntelligenceGraphRef,
  RepositoryIntelligenceGraphView,
} from "./repository-intelligence-graph.js";

export type DiscoverRepositoryContractCandidatesInput = {
  repoId: string;
  generatedAt?: string;
  graph: RepositoryIntelligenceGraphView;
  observedRepo?: ObservedRepo;
  ownershipMap?: OwnershipMap;
  capabilityMap?: CapabilityMap;
  effectiveRegistry?: EffectiveContractRegistry;
  maxFlows?: number;
  maxDepth?: number;
  reconsiderContractIds?: string[];
};

const PRODUCER_ID = "@rekon/capability-model";
const PRODUCER_VERSION = "0.1.0";
const SCHEMA_VERSION = "1.0.0";
const FLOW_PREDICATES = new Set([
  "calls",
  "enters",
  "reaches",
  "handles",
  "emits",
  "subscribes",
  "accesses",
  "propagates_error",
  "produces",
  "consumes",
]);
const ENTRY_KINDS = new Set(["entry_point", "route", "screen", "api", "command", "event"]);
const TERMINAL_KINDS = new Set(["state_resource", "db_table", "event", "screen", "api", "publication", "response"]);

/** Produce inferred contract candidates without adopting or writing source law. */
export function discoverRepositoryContractCandidates(
  input: DiscoverRepositoryContractCandidatesInput,
): ContractCandidateReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const inputRefs = collectInputRefs(input);
  const existing = existingContractIds(input.effectiveRegistry);
  const reconsider = new Set(input.reconsiderContractIds ?? []);
  const candidates: ContractCandidate[] = [];
  const unresolved: ContractCandidateReport["unresolved"] = [];

  for (const system of input.observedRepo?.systems ?? []) {
    if (existing.has(`SystemContract:${system.id}`) && !reconsider.has(`SystemContract:${system.id}`)) continue;
    const candidate = systemCandidate(system, input, inputRefs);
    if (candidate) candidates.push(candidate);
    else unresolved.push({
      id: `unresolved:system:${slug(system.id)}`,
      kind: "system",
      reason: `System ${system.id} lacks enough scoped paths or capability evidence for a contract candidate.`,
      evidenceRefs: inputRefs,
    });
  }

  const flowDiscovery = discoverFlows(input.graph, {
    maxFlows: input.maxFlows ?? 50,
    maxDepth: input.maxDepth ?? 8,
    ownerByPath: ownershipByPath(input.ownershipMap),
    inputRefs,
    existing,
    reconsider,
  });
  candidates.push(...flowDiscovery.candidates);
  unresolved.push(...flowDiscovery.unresolved);

  if (candidates.length === 0 && unresolved.length === 0) {
    unresolved.push({
      id: "unresolved:repository:no-contract-candidates",
      kind: "system",
      reason: "No observed systems or bounded entry-to-outcome routes were available for contract discovery.",
      evidenceRefs: inputRefs,
    });
  }

  return createContractCandidateReport({
    header: {
      artifactType: "ContractCandidateReport",
      artifactId: `contract-candidate-report-${stamp(generatedAt)}`,
      schemaVersion: SCHEMA_VERSION,
      generatedAt,
      subject: { repoId: input.repoId },
      producer: { id: PRODUCER_ID, version: PRODUCER_VERSION },
      inputRefs,
      supersession: { key: "repository-contract-candidates" },
      freshness: { status: inputRefs.length > 0 ? "fresh" : "unknown" },
      provenance: {
        confidence: candidates.length > 0 ? Math.max(...candidates.map((candidate) => candidate.confidence)) : 0,
        notes: ["deterministic cold-start contract discovery; candidates are not adopted law"],
      },
    },
    candidates,
    unresolved,
  });
}

function systemCandidate(
  system: ObservedRepo["systems"][number],
  input: DiscoverRepositoryContractCandidatesInput,
  evidenceRefs: ArtifactRef[],
): ContractCandidate | undefined {
  const ownedPaths = (input.ownershipMap?.entries ?? [])
    .filter((entry) => entry.ownerSystem === system.id)
    .map((entry) => entry.path);
  const paths = unique([...system.paths, ...ownedPaths]);
  const capabilities = unique([
    ...system.capabilities,
    ...(input.capabilityMap?.entries ?? [])
      .filter((entry) => entry.systems.includes(system.id))
      .map((entry) => entry.capability),
  ]);
  if (paths.length === 0 || evidenceRefs.length === 0) return undefined;
  const scopes = compactScopes(paths);
  const purpose = system.purpose?.trim()
    || (capabilities.length > 0
      ? `Own ${joinNatural(capabilities.slice(0, 4))}.`
      : `Own the repository behavior implemented by ${system.id}.`);
  const invariants = capabilities.length > 0
    ? capabilities.slice(0, 8).map((capability) => ({
        id: `capability.${slug(capability)}.preserved`,
        statement: `Preserve the ${capability} capability within ${system.id}.`,
        rationale: "Derived from the observed capability and ownership projections; judgment must confirm the semantic wording.",
      }))
    : [{
        id: `system.${slug(system.id)}.responsibility-preserved`,
        statement: `Preserve ${system.id}'s responsibility across its scoped paths.`,
        rationale: "A structural placeholder until source and tests establish a more specific invariant.",
      }];
  const explicitPurpose = Boolean(system.purpose?.trim());
  const confidence = clamp(
    0.45
      + (explicitPurpose ? 0.2 : 0)
      + (capabilities.length > 0 ? 0.15 : 0)
      + Math.min(0.15, system.confidence * 0.15),
  );
  const proposed: SystemContractSource = {
    id: system.id,
    systemId: system.id,
    name: system.name,
    scope: { paths: scopes },
    purpose,
    userOutcomes: explicitPurpose ? [system.purpose!] : undefined,
    invariants,
    requiredContextPaths: paths.slice(0, 12),
  };
  return {
    id: `candidate:system:${slug(system.id)}`,
    kind: "system",
    targetId: system.id,
    confidence,
    rationale: explicitPurpose
      ? "Observed system purpose, ownership, and capability evidence support this draft."
      : "Ownership and capability evidence support the boundary; purpose and invariants require independent judgment.",
    evidenceRefs,
    proposed,
  };
}

function discoverFlows(
  graph: RepositoryIntelligenceGraphView,
  options: {
    maxFlows: number;
    maxDepth: number;
    ownerByPath: Map<string, string>;
    inputRefs: ArtifactRef[];
    existing: Set<string>;
    reconsider: Set<string>;
  },
): { candidates: ContractCandidate[]; unresolved: ContractCandidateReport["unresolved"] } {
  if (options.inputRefs.length === 0) return { candidates: [], unresolved: [] };
  const adjacency = new Map<string, RepositoryIntelligenceGraphClaim[]>();
  for (const claim of graph.claims) {
    if (claim.status !== "accepted" || !FLOW_PREDICATES.has(claim.predicate) || typeof claim.object === "string") continue;
    const key = refKey(claim.subject);
    const list = adjacency.get(key) ?? [];
    list.push(claim);
    adjacency.set(key, list);
  }
  for (const values of adjacency.values()) values.sort((left, right) => left.id.localeCompare(right.id));

  const entries = graph.nodes.filter((node) => ENTRY_KINDS.has(node.kind)).sort(refCompare);
  const candidates: ContractCandidate[] = [];
  const unresolved: ContractCandidateReport["unresolved"] = [];
  const flowKeys = new Set<string>();
  for (const entry of entries) {
    if (candidates.length >= options.maxFlows) break;
    const path = shortestOutcomePath(entry, adjacency, options.maxDepth);
    if (!path) {
      unresolved.push({
        id: `unresolved:flow:${slug(entry.kind)}:${slug(entry.id)}`,
        kind: "flow",
        reason: `Entry ${entry.kind}:${entry.id} has no bounded observed route to a terminal outcome.`,
        evidenceRefs: options.inputRefs,
      });
      continue;
    }
    const refs = [entry, ...path.map((claim) => claim.object as RepositoryIntelligenceGraphRef)];
    const terminal = refs.at(-1)!;
    const flowId = `flow:${slug(entry.kind)}:${slug(entry.id)}:${slug(terminal.kind)}:${slug(terminal.id)}`;
    if ((options.existing.has(`FlowContract:${flowId}`) && !options.reconsider.has(`FlowContract:${flowId}`)) || flowKeys.has(flowId)) continue;
    flowKeys.add(flowId);
    const invariantId = `${slug(flowId)}.outcome-preserved`;
    const stageIds = uniqueStageIds(refs);
    const stages = refs.map((ref, index) => ({
      id: stageIds[index]!,
      label: ref.id,
      systemId: ownerForRef(ref, options.ownerByPath),
      paths: pathsForRef(ref),
    }));
    const handoffs = path.map((claim, index) => ({
      id: `handoff:${stageIds[index]}:${stageIds[index + 1]}`,
      fromStageId: stageIds[index]!,
      toStageId: stageIds[index + 1]!,
      guarantees: [`Preserve ${invariantId} across this seam.`],
      carriedInvariantIds: [invariantId],
      failureSemantics: claim.predicate === "propagates_error" ? "Preserve the observed error propagation behavior." : undefined,
    }));
    const systems = unique(refs.map((ref) => ownerForRef(ref, options.ownerByPath)).filter(isString));
    const paths = unique(refs.flatMap(pathsForRef));
    const minConfidence = Math.min(...path.map((claim) => claim.confidence));
    const runtimeObserved = path.some((claim) => claim.source === "runtime");
    const confidence = clamp(minConfidence * (runtimeObserved ? 1 : 0.85));
    const criticality: FlowContractSource["criticality"] = runtimeObserved && systems.length > 1
      ? "critical"
      : ENTRY_KINDS.has(entry.kind) && TERMINAL_KINDS.has(terminal.kind)
        ? "high"
        : "normal";
    const proposed: FlowContractSource = {
      id: flowId,
      name: `${label(entry)} to ${label(terminal)}`,
      criticality,
      purpose: `Carry ${label(entry)} through to ${label(terminal)}.`,
      userOutcomes: [`The ${label(entry)} interaction reaches ${label(terminal)} without losing its intended meaning.`],
      entryConditions: [`${entry.kind}:${entry.id} receives control.`],
      completionConditions: [`${terminal.kind}:${terminal.id} is reached.`],
      systems,
      paths,
      invariants: [{
        id: invariantId,
        statement: `Preserve the end-to-end meaning and outcome from ${label(entry)} to ${label(terminal)}.`,
        rationale: "The route is observed; independent judgment must replace generic wording with repository-native semantics.",
      }],
      stages,
      handoffs,
    };
    candidates.push({
      id: `candidate:${flowId}`,
      kind: "flow",
      targetId: flowId,
      confidence,
      rationale: `${runtimeObserved ? "Runtime and structural" : "Structural"} graph evidence connects an entry surface to a terminal outcome across ${handoffs.length} seam(s).`,
      evidenceRefs: options.inputRefs,
      proposed,
    });
  }
  return { candidates, unresolved: unresolved.slice(0, options.maxFlows) };
}

function shortestOutcomePath(
  entry: RepositoryIntelligenceGraphRef,
  adjacency: Map<string, RepositoryIntelligenceGraphClaim[]>,
  maxDepth: number,
): RepositoryIntelligenceGraphClaim[] | undefined {
  const queue: Array<{ ref: RepositoryIntelligenceGraphRef; path: RepositoryIntelligenceGraphClaim[] }> = [{ ref: entry, path: [] }];
  const seen = new Set([refKey(entry)]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length > 0 && TERMINAL_KINDS.has(current.ref.kind)) return current.path;
    if (current.path.length >= maxDepth) continue;
    for (const claim of adjacency.get(refKey(current.ref)) ?? []) {
      if (typeof claim.object === "string") continue;
      const key = refKey(claim.object);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ ref: claim.object, path: [...current.path, claim] });
    }
  }
  return undefined;
}

function collectInputRefs(input: DiscoverRepositoryContractCandidatesInput): ArtifactRef[] {
  return uniqueRefs([
    ...input.graph.inputRefs,
    ...[input.observedRepo?.header, input.ownershipMap?.header, input.capabilityMap?.header, input.effectiveRegistry?.header]
      .filter((header): header is ArtifactHeader => Boolean(header))
      .map((header) => ({ type: header.artifactType, id: header.artifactId, schemaVersion: header.schemaVersion })),
  ]);
}

function existingContractIds(registry: EffectiveContractRegistry | undefined): Set<string> {
  return new Set((registry?.entries ?? []).map((entry) => `${entry.contractType}:${entry.contractId}`));
}

function ownershipByPath(map: OwnershipMap | undefined): Map<string, string> {
  return new Map((map?.entries ?? []).map((entry) => [entry.path, entry.ownerSystem]));
}

function ownerForRef(ref: RepositoryIntelligenceGraphRef, owners: Map<string, string>): string | undefined {
  const path = ref.kind === "symbol" ? ref.id.split("#")[0] : ref.kind === "file" ? ref.id : undefined;
  if (!path) return undefined;
  return owners.get(path);
}

function pathsForRef(ref: RepositoryIntelligenceGraphRef): string[] {
  if (ref.kind === "file") return [ref.id];
  if (ref.kind === "symbol") return [ref.id.split("#")[0]!];
  return [];
}

function compactScopes(paths: string[]): string[] {
  const grouped = new Map<string, string[]>();
  for (const path of paths) {
    const segments = path.split("/");
    const prefix = segments.length >= 2 ? `${segments[0]}/${segments[1]}` : segments[0]!;
    const values = grouped.get(prefix) ?? [];
    values.push(path);
    grouped.set(prefix, values);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([prefix, values]) =>
    values.length > 1 || values[0] !== prefix ? `${prefix}/**` : prefix,
  );
}

function uniqueStageIds(refs: RepositoryIntelligenceGraphRef[]): string[] {
  const used = new Set<string>();
  return refs.map((ref) => {
    const base = `stage:${slug(ref.kind)}:${slug(ref.id)}`;
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    return id;
  });
}

function label(ref: RepositoryIntelligenceGraphRef): string {
  return `${ref.kind} ${ref.id}`;
}

function refKey(ref: RepositoryIntelligenceGraphRef): string {
  return `${ref.kind}:${ref.id}`;
}

function refCompare(left: RepositoryIntelligenceGraphRef, right: RepositoryIntelligenceGraphRef): number {
  return refKey(left).localeCompare(refKey(right));
}

function joinNatural(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "the observed system behavior";
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
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

function isString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || "unknown";
}

function stamp(value: string): string {
  return value.replace(/[^0-9A-Za-z]/gu, "");
}

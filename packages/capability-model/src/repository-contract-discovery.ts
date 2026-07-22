import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type ContractCandidate,
  type ContractCandidateReport,
  type ContractDiscoveryEvidenceInventory,
  type EffectiveContractRegistry,
  type FlowContract,
  type FlowContractHandoffSource,
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
  existingFlowContracts?: FlowContract[];
  verificationEvidence?: RepositoryContractVerificationEvidence[];
  verificationInventory?: RepositoryContractVerificationInventory;
  maxFlows?: number;
  maxDepth?: number;
  reconsiderContractIds?: string[];
};

export type RepositoryContractVerificationEvidence = {
  method: "test";
  command: string;
  coveredPaths: string[];
  testPath?: string;
  evidenceRefs: ArtifactRef[];
};

export type RepositoryContractVerificationInventory = {
  indexedRuntimeObservationReports: number;
  validatedRuntimeObservationReports: number;
  isolatedCoverageRecords: number;
  inputRefs: ArtifactRef[];
  warnings: string[];
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
const TERMINAL_KINDS = new Set(["state_resource", "db_table", "event", "screen", "api", "publication", "response", "cli_output"]);

/** Produce inferred contract candidates without adopting or writing source law. */
export function discoverRepositoryContractCandidates(
  input: DiscoverRepositoryContractCandidatesInput,
): ContractCandidateReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const inputRefs = collectInputRefs(input);
  const evidenceInventory = buildEvidenceInventory(input);
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
    existingFlowContracts: input.existingFlowContracts ?? [],
    verificationEvidence: input.verificationEvidence ?? [],
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
      freshness: {
        status: inputRefs.length === 0
          ? "unknown"
          : evidenceInventory.status === "partial"
            ? "partial"
            : "fresh",
        ...(evidenceInventory.issues.length > 0 ? { invalidatedBy: evidenceInventory.issues } : {}),
      },
      provenance: {
        confidence: candidates.length > 0 ? Math.max(...candidates.map((candidate) => candidate.confidence)) : 0,
        notes: [
          "deterministic cold-start contract discovery; candidates are not adopted law",
          ...evidenceInventory.notes,
        ],
      },
    },
    evidenceInventory,
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
    existingFlowContracts: FlowContract[];
    verificationEvidence: RepositoryContractVerificationEvidence[];
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

  const commandPaths = new Set(graph.nodes
    .filter((ref) => ref.kind === "command" && isContractFlowEntry(ref))
    .map(pathForRef)
    .filter((path): path is string => Boolean(path)));
  const entries = graph.nodes
    .filter(isContractFlowEntry)
    .filter((ref) => !isSupersededCliEntry(ref, commandPaths))
    .sort(refCompare);
  const candidates: ContractCandidate[] = [];
  const unresolved: ContractCandidateReport["unresolved"] = [];
  const flowKeys = new Set<string>();
  for (const [entryIndex, entry] of entries.entries()) {
    if (candidates.length >= options.maxFlows) {
      const remaining = entries.length - entryIndex;
      unresolved.push({
        id: "unresolved:flow:candidate-limit",
        kind: "flow",
        reason: `Flow candidate limit ${options.maxFlows} reached with ${remaining} eligible entr${remaining === 1 ? "y" : "ies"} not evaluated. Increase maxFlows to inspect the remainder.`,
        evidenceRefs: options.inputRefs,
      });
      break;
    }
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
    const existingFlow = options.existingFlowContracts.find((flow) => flow.contractId === flowId);
    const handoffs = path.map((claim, index) => {
      const id = `handoff:${stageIds[index]}:${stageIds[index + 1]}`;
      const fromStageId = stageIds[index]!;
      const toStageId = stageIds[index + 1]!;
      return {
        id,
        fromStageId,
        toStageId,
        guarantees: [`Preserve ${invariantId} across this seam.`],
        carriedInvariantIds: [invariantId],
        failureSemantics: claim.predicate === "propagates_error" ? "Preserve the observed error propagation behavior." : undefined,
        verification: discoverHandoffVerification({
          claim,
          entry,
          fromPaths: stages[index]?.paths ?? [],
          toPaths: stages[index + 1]?.paths ?? [],
          existing: existingFlow?.handoffs.find((handoff) =>
            handoff.id === id
            || (handoff.fromStageId === fromStageId && handoff.toStageId === toStageId)),
          evidence: options.verificationEvidence,
        }),
      } satisfies FlowContractHandoffSource;
    });
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
    if (current.path.length > 0 && isTerminalForEntry(entry, current.ref)) return current.path;
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

function isContractFlowEntry(ref: RepositoryIntelligenceGraphRef): boolean {
  if (!ENTRY_KINDS.has(ref.kind)) return false;
  if (ref.kind === "command") return hasProductEntryClass(ref, true);
  if (ref.kind !== "entry_point") return true;
  if (ref.id.startsWith("entry:test:")) return false;
  return hasProductEntryClass(ref, false);
}

function hasProductEntryClass(ref: RepositoryIntelligenceGraphRef, requireExplicit: boolean): boolean {
  const entryClass = typeof ref.metadata?.entryClass === "string" ? ref.metadata.entryClass : undefined;
  if (entryClass === "tooling" || entryClass === "test" || entryClass === "unknown") return false;
  if (entryClass === "product") return true;
  if (requireExplicit) return false;
  const path = pathForRef(ref);
  return !path || !isToolingOrTestPath(path);
}

function isSupersededCliEntry(ref: RepositoryIntelligenceGraphRef, commandPaths: ReadonlySet<string>): boolean {
  if (ref.kind !== "entry_point" || !ref.id.startsWith("entry:cli:")) return false;
  const path = pathForRef(ref);
  return Boolean(path && commandPaths.has(path));
}

function isToolingOrTestPath(path: string): boolean {
  return /(?:^|\/)(?:__tests__|tests?|specs?|bench|benchmark|benchmarks|scripts?|tools?|devtools?)(?:\/|$)/u.test(path);
}

function isTerminalForEntry(
  entry: RepositoryIntelligenceGraphRef,
  terminal: RepositoryIntelligenceGraphRef,
): boolean {
  if (!TERMINAL_KINDS.has(terminal.kind)) return false;
  if (terminal.kind !== "cli_output") return true;
  return entry.kind === "command"
    || (entry.kind === "entry_point" && entry.id.startsWith("entry:cli:"));
}

function collectInputRefs(input: DiscoverRepositoryContractCandidatesInput): ArtifactRef[] {
  return uniqueRefs([
    ...input.graph.inputRefs,
    ...(input.verificationEvidence ?? []).flatMap((entry) => entry.evidenceRefs),
    ...(input.verificationInventory?.inputRefs ?? []),
    ...[input.observedRepo?.header, input.ownershipMap?.header, input.capabilityMap?.header, input.effectiveRegistry?.header]
      .filter((header): header is ArtifactHeader => Boolean(header))
      .map((header) => ({ type: header.artifactType, id: header.artifactId, schemaVersion: header.schemaVersion })),
    ...(input.existingFlowContracts ?? []).map((flow) => ({
      type: flow.header.artifactType,
      id: flow.header.artifactId,
      schemaVersion: flow.header.schemaVersion,
    })),
  ]);
}

function buildEvidenceInventory(
  input: DiscoverRepositoryContractCandidatesInput,
): ContractDiscoveryEvidenceInventory {
  const evidence = input.verificationEvidence ?? [];
  const inferredReportRefs = uniqueRefs(evidence
    .flatMap((entry) => entry.evidenceRefs)
    .filter((ref) => ref.type === "RuntimeGraphObservationReport"));
  const verification = input.verificationInventory ?? {
    indexedRuntimeObservationReports: inferredReportRefs.length,
    validatedRuntimeObservationReports: inferredReportRefs.length,
    isolatedCoverageRecords: evidence.length,
    inputRefs: inferredReportRefs,
    warnings: [],
  };
  const runtimeClaims = input.graph.claims.filter((claim) =>
    claim.status === "accepted" && claim.source === "runtime").length;
  const issues = unique([
    ...input.graph.warnings,
    ...verification.warnings,
    ...(input.graph.inputRefs.length === 0 ? ["No structural graph artifacts were available for contract discovery."] : []),
  ]);
  const notes: string[] = [];
  if (runtimeClaims === 0) {
    notes.push("No accepted runtime graph claims were available; proposed flow topology is structural.");
  }
  if (verification.isolatedCoverageRecords === 0) {
    notes.push(
      "No validated isolated coverage records were available; newly inferred structural handoffs without adopted or runtime policy use model judgment provisionally.",
    );
  }
  return {
    status: issues.length > 0 ? "partial" : "complete",
    topologyBasis: runtimeClaims > 0 ? "structural-and-runtime" : "structural",
    structural: {
      artifactTypes: unique(input.graph.inputRefs.map((ref) => ref.type)),
      graphClaims: input.graph.claims.length,
      runtimeClaims,
    },
    verification: {
      adoptedFlowContracts: input.existingFlowContracts?.length ?? 0,
      runtimeObservationReports: {
        indexed: verification.indexedRuntimeObservationReports,
        validated: verification.validatedRuntimeObservationReports,
      },
      isolatedCoverageRecords: verification.isolatedCoverageRecords,
    },
    issues,
    notes: unique(notes),
  };
}

function discoverHandoffVerification(input: {
  claim: RepositoryIntelligenceGraphClaim;
  entry: RepositoryIntelligenceGraphRef;
  fromPaths: string[];
  toPaths: string[];
  existing?: FlowContract["handoffs"][number];
  evidence: RepositoryContractVerificationEvidence[];
}): NonNullable<FlowContractHandoffSource["verification"]> {
  if (input.existing?.verification) {
    return {
      acceptedMethods: [...input.existing.verification.acceptedMethods],
      ...(input.existing.verification.acceptancePolicy
        ? { acceptancePolicy: input.existing.verification.acceptancePolicy }
        : {}),
      ...(input.existing.verification.requiredChecks
        ? { requiredChecks: [...input.existing.verification.requiredChecks] }
        : {}),
    };
  }

  const test = input.fromPaths.length > 0 && input.toPaths.length > 0
    ? [...input.evidence]
      .filter((entry) =>
        entry.method === "test"
        && entry.command.trim().length > 0
        && verificationNamesEntryOperation(entry, input.entry)
        && input.fromPaths.some((path) => entry.coveredPaths.includes(path))
        && input.toPaths.some((path) => entry.coveredPaths.includes(path)))
      .sort((left, right) =>
        verificationEvidenceCost(left, input.fromPaths, input.toPaths)
          - verificationEvidenceCost(right, input.fromPaths, input.toPaths)
        || left.command.localeCompare(right.command))[0]
    : undefined;
  if (test) {
    return {
      acceptedMethods: ["test"],
      acceptancePolicy: "all-required",
      requiredChecks: [test.command.trim().replace(/\s+/gu, " ")],
    };
  }
  if (input.claim.source === "runtime") {
    return { acceptedMethods: ["runtime"], acceptancePolicy: "all-required" };
  }
  return { acceptedMethods: ["model-judgment"], acceptancePolicy: "all-required" };
}

function verificationNamesEntryOperation(
  evidence: RepositoryContractVerificationEvidence,
  entry: RepositoryIntelligenceGraphRef,
): boolean {
  if (entry.kind !== "command") return true;
  const operation = typeof entry.metadata?.operation === "string"
    ? entry.metadata.operation
    : entry.id.startsWith("command:")
      ? entry.id.slice(entry.id.indexOf("#") + 1)
      : "";
  const operationTokens = operationTokensForMatch(operation);
  if (operationTokens.length === 0 || !evidence.testPath) return false;
  const evidenceTokens = operationTokensForMatch(evidence.testPath);
  return operationTokens.every((operationToken) => evidenceTokens.some((evidenceToken) =>
    operationToken === evidenceToken
    || (operationToken.length >= 5 && evidenceToken.length >= 5
      && operationToken.slice(0, 5) === evidenceToken.slice(0, 5))));
}

function operationTokensForMatch(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .map((token) => token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token)
    .filter(Boolean);
}

function verificationEvidenceCost(
  evidence: RepositoryContractVerificationEvidence,
  fromPaths: string[],
  toPaths: string[],
): number {
  const stagePaths = new Set([...fromPaths, ...toPaths]);
  return evidence.coveredPaths.filter((path) => !stagePaths.has(path)).length;
}

function existingContractIds(registry: EffectiveContractRegistry | undefined): Set<string> {
  return new Set((registry?.entries ?? []).map((entry) => `${entry.contractType}:${entry.contractId}`));
}

function ownershipByPath(map: OwnershipMap | undefined): Map<string, string> {
  return new Map((map?.entries ?? []).map((entry) => [entry.path, entry.ownerSystem]));
}

function ownerForRef(ref: RepositoryIntelligenceGraphRef, owners: Map<string, string>): string | undefined {
  const path = pathForRef(ref);
  if (!path) return undefined;
  return owners.get(path);
}

function pathsForRef(ref: RepositoryIntelligenceGraphRef): string[] {
  const path = pathForRef(ref);
  return path ? [path] : [];
}

function pathForRef(ref: RepositoryIntelligenceGraphRef): string | undefined {
  if (typeof ref.metadata?.path === "string" && ref.metadata.path.length > 0) return ref.metadata.path;
  if (ref.kind === "file") return ref.id;
  if (ref.kind === "symbol") return ref.id.split("#")[0];
  if (ref.kind === "callable" && ref.id.startsWith("callable:")) {
    return ref.id.slice("callable:".length).split("#")[0];
  }
  if (ref.kind === "cli_output" && ref.id.startsWith("cli-output:")) {
    return ref.id.slice("cli-output:".length).split("#")[0];
  }
  if (ref.kind === "entry_point" && ref.id.startsWith("entry:")) {
    const remainder = ref.id.slice("entry:".length);
    const separator = remainder.indexOf(":");
    return separator >= 0 ? remainder.slice(separator + 1) : undefined;
  }
  if (ref.kind === "command" && ref.id.startsWith("command:")) {
    return ref.id.slice("command:".length).split("#")[0];
  }
  return undefined;
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

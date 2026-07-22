import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import type { ContractAuthority } from "@rekon/kernel-repo-model";

export type RepositoryIntelligenceGraphRef = {
  kind: string;
  id: string;
  metadata?: Record<string, unknown>;
};

export type RepositoryIntelligenceGraphClaim = {
  id: string;
  subject: RepositoryIntelligenceGraphRef;
  predicate: string;
  object: RepositoryIntelligenceGraphRef | string;
  source: "deterministic" | "runtime" | "model" | "declared";
  authority: ContractAuthority;
  confidence: number;
  evidenceRefs: string[];
  status: "accepted" | "conflicted" | "rejected" | "needs-review";
};

export type RepositoryIntelligenceGraphCapability = {
  id: string;
  verb?: string;
  noun?: string;
  ownerSystem?: string;
  implementedBy: RepositoryIntelligenceGraphRef[];
  entrypoints: RepositoryIntelligenceGraphRef[];
  dependencies: RepositoryIntelligenceGraphRef[];
  consumers: RepositoryIntelligenceGraphRef[];
  evidenceRefs: string[];
};

export type RepositoryIntelligenceGraphView = {
  nodes: RepositoryIntelligenceGraphRef[];
  claims: RepositoryIntelligenceGraphClaim[];
  capabilities: RepositoryIntelligenceGraphCapability[];
  inputRefs: ArtifactRef[];
  warnings: string[];
};

export type BuildRepositoryIntelligenceGraphInput = {
  capabilityGraph?: {
    header?: ArtifactHeader;
    nodes?: Array<{ kind: string; id: string }>;
    claims?: Array<{
      id: string;
      subject: { kind: string; id: string };
      predicate: string;
      object: { kind: string; id: string } | string;
      source?: string;
      confidence?: number;
      evidenceRefs?: string[];
      status?: string;
    }>;
    capabilities?: Array<{
      id: string;
      verb?: string;
      noun?: string;
      ownerSystem?: string;
      implementedBy?: Array<{ kind: string; id: string }>;
      entrypoints?: Array<{ kind: string; id: string }>;
      dependencies?: Array<{ kind: string; id: string }>;
      consumers?: Array<{ kind: string; id: string }>;
      evidenceRefs?: string[];
    }>;
  };
  graphSlices?: Array<{
    header?: ArtifactHeader;
    sliceType?: string;
    nodes?: Array<{ id: string; kind: string; metadata?: Record<string, unknown> }>;
    edges?: Array<{
      source: string;
      target: string;
      kind: string;
      evidence?: Array<{ source?: string; confidence?: number; payloadRef?: string }>;
    }>;
  }>;
  ownershipMap?: {
    header?: ArtifactHeader;
    entries?: Array<{
      path: string;
      ownerSystem: string;
      basis?: "declared" | "inferred";
      confidence: number;
      evidence?: ArtifactRef[];
    }>;
  };
  stepGraph?: {
    header?: ArtifactHeader;
    steps?: Array<{ id: string; evidenceRefs?: ArtifactRef[] }>;
    capabilityEdges?: Array<{
      id: string;
      stepId: string;
      capabilityId?: string;
      phraseCapabilityId?: string;
      verb: string;
      noun: string;
      confidence: "high" | "medium" | "low";
      evidenceRefs?: ArtifactRef[];
    }>;
    fileEdges?: Array<{ id: string; stepId: string; path: string; evidenceRefs?: ArtifactRef[] }>;
    systemEdges?: Array<{ id: string; stepId: string; system: string; evidenceRefs?: ArtifactRef[] }>;
  };
  contractRegistry?: {
    header?: ArtifactHeader;
    entries?: Array<{
      contractType: string;
      contractId: string;
      authority: ContractAuthority;
      confidence: number;
      ref: ArtifactRef;
      systems: string[];
      paths: string[];
      flowIds: string[];
      clauseIds: string[];
    }>;
  };
};

type CapabilityGraphCapabilityInput = NonNullable<
  NonNullable<BuildRepositoryIntelligenceGraphInput["capabilityGraph"]>["capabilities"]
>[number];

type ContractRegistryEntryInput = NonNullable<
  NonNullable<BuildRepositoryIntelligenceGraphInput["contractRegistry"]>["entries"]
>[number];

/** Compose existing graph artifacts into a stable read view. */
export function buildRepositoryIntelligenceGraph(
  input: BuildRepositoryIntelligenceGraphInput,
): RepositoryIntelligenceGraphView {
  const nodes = new Map<string, RepositoryIntelligenceGraphRef>();
  const claims = new Map<string, RepositoryIntelligenceGraphClaim>();
  const capabilities = new Map<string, RepositoryIntelligenceGraphCapability>();
  const inputRefs: ArtifactRef[] = [];
  const warnings: string[] = [];

  const addNode = (ref: RepositoryIntelligenceGraphRef): RepositoryIntelligenceGraphRef => {
    const kind = ref.kind.trim() || "unknown";
    const id = ref.id.trim();
    const prior = nodes.get(`${kind}:${id}`);
    const metadata = prior?.metadata || ref.metadata
      ? { ...(prior?.metadata ?? {}), ...(ref.metadata ?? {}) }
      : undefined;
    const normalized = { kind, id, ...(metadata ? { metadata } : {}) };
    if (!normalized.id) return normalized;
    nodes.set(`${normalized.kind}:${normalized.id}`, normalized);
    return normalized;
  };
  const addClaim = (claim: RepositoryIntelligenceGraphClaim): void => {
    const subject = addNode(claim.subject);
    const object = typeof claim.object === "string" ? claim.object : addNode(claim.object);
    const objectKey = typeof object === "string" ? object : `${object.kind}:${object.id}`;
    const key = `${subject.kind}:${subject.id}\0${claim.predicate}\0${objectKey}`;
    const prior = claims.get(key);
    if (!prior) {
      claims.set(key, { ...claim, subject, object, evidenceRefs: unique(claim.evidenceRefs) });
      return;
    }
    claims.set(key, {
      ...prior,
      confidence: Math.max(prior.confidence, claim.confidence),
      authority: strongerAuthority(prior.authority, claim.authority),
      evidenceRefs: unique([...prior.evidenceRefs, ...claim.evidenceRefs]),
      status: strongerStatus(prior.status, claim.status),
    });
  };

  addHeaderRef(inputRefs, input.capabilityGraph?.header);
  for (const node of input.capabilityGraph?.nodes ?? []) addNode(node);
  for (const claim of input.capabilityGraph?.claims ?? []) {
    addClaim({
      id: claim.id,
      subject: claim.subject,
      predicate: claim.predicate,
      object: claim.object,
      source: capabilityClaimSource(claim.source),
      authority: claim.source === "human" ? "adopted" : claim.source === "runtime" ? "observed" : claim.source === "llm" || claim.source === "embedding" ? "inferred" : "observed",
      confidence: boundedConfidence(claim.confidence),
      evidenceRefs: claim.evidenceRefs ?? [],
      status: claimStatus(claim.status),
    });
  }
  for (const capability of input.capabilityGraph?.capabilities ?? []) {
    const normalized = normalizeCapability(capability);
    capabilities.set(normalized.id, normalized);
    addNode({ kind: "capability", id: normalized.id });
    for (const implementation of normalized.implementedBy) {
      addClaim({
        id: `capability:${normalized.id}:implemented-by:${implementation.id}`,
        subject: { kind: "capability", id: normalized.id },
        predicate: "implemented_by",
        object: implementation,
        source: "deterministic",
        authority: "observed",
        confidence: 1,
        evidenceRefs: normalized.evidenceRefs,
        status: "accepted",
      });
    }
  }

  for (const slice of input.graphSlices ?? []) {
    addHeaderRef(inputRefs, slice.header);
    const sliceEvidenceRef = slice.header ? `${slice.header.artifactType}:${slice.header.artifactId}` : undefined;
    const sliceNodes = new Map<string, RepositoryIntelligenceGraphRef[]>();
    for (const node of slice.nodes ?? []) {
      const ref = addNode(node);
      const values = sliceNodes.get(ref.id) ?? [];
      values.push(ref);
      sliceNodes.set(ref.id, values);
    }
    for (const [index, edge] of (slice.edges ?? []).entries()) {
      const subject = resolveSliceRef(edge.source, edge.kind, "source", sliceNodes);
      const object = resolveSliceRef(edge.target, edge.kind, "target", sliceNodes);
      if (subject.kind === "unknown" || object.kind === "unknown") {
        warnings.push(`unresolved graph endpoint in ${slice.sliceType ?? "graph-slice"}: ${edge.source} ${edge.kind} ${edge.target}`);
      }
      const runtime = (edge.evidence ?? []).some((entry) => entry.source === "runtime" || entry.source === "runtime_trace");
      addClaim({
        id: `slice:${slice.sliceType ?? "unknown"}:${index}:${edge.source}:${edge.kind}:${edge.target}`,
        subject,
        predicate: edge.kind,
        object,
        source: runtime ? "runtime" : "deterministic",
        authority: "observed",
        confidence: Math.max(0, ...(edge.evidence ?? []).map((entry) => boundedConfidence(entry.confidence))),
        evidenceRefs: unique([
          ...(sliceEvidenceRef ? [sliceEvidenceRef] : []),
          ...(edge.evidence ?? []).flatMap((entry) => entry.payloadRef ? [entry.payloadRef] : []),
        ]),
        status: "accepted",
      });
    }
  }

  addHeaderRef(inputRefs, input.ownershipMap?.header);
  for (const [index, entry] of (input.ownershipMap?.entries ?? []).entries()) {
    addClaim({
      id: `ownership:${index}:${entry.ownerSystem}:${entry.path}`,
      subject: { kind: "system", id: entry.ownerSystem },
      predicate: "owns",
      object: { kind: "file", id: entry.path },
      source: entry.basis === "declared" ? "declared" : "deterministic",
      authority: entry.basis === "declared" ? "adopted" : "inferred",
      confidence: boundedConfidence(entry.confidence),
      evidenceRefs: refStrings(entry.evidence ?? []),
      status: "accepted",
    });
  }

  addHeaderRef(inputRefs, input.stepGraph?.header);
  for (const step of input.stepGraph?.steps ?? []) addNode({ kind: "step", id: step.id });
  for (const edge of input.stepGraph?.fileEdges ?? []) {
    addClaim({
      id: edge.id,
      subject: { kind: "step", id: edge.stepId },
      predicate: "contains",
      object: { kind: "file", id: edge.path },
      source: "deterministic",
      authority: "inferred",
      confidence: 0.8,
      evidenceRefs: refStrings(edge.evidenceRefs ?? []),
      status: "accepted",
    });
  }
  for (const edge of input.stepGraph?.systemEdges ?? []) {
    addClaim({
      id: edge.id,
      subject: { kind: "step", id: edge.stepId },
      predicate: "within_system",
      object: { kind: "system", id: edge.system },
      source: "deterministic",
      authority: "inferred",
      confidence: 0.8,
      evidenceRefs: refStrings(edge.evidenceRefs ?? []),
      status: "accepted",
    });
  }
  for (const edge of input.stepGraph?.capabilityEdges ?? []) {
    const capabilityId = edge.capabilityId ?? edge.phraseCapabilityId ?? `${edge.verb}:${edge.noun}`;
    const prior = capabilities.get(capabilityId);
    capabilities.set(capabilityId, {
      id: capabilityId,
      verb: edge.verb,
      noun: edge.noun,
      ownerSystem: prior?.ownerSystem,
      implementedBy: prior?.implementedBy ?? [],
      entrypoints: prior?.entrypoints ?? [],
      dependencies: prior?.dependencies ?? [],
      consumers: prior?.consumers ?? [],
      evidenceRefs: unique([...(prior?.evidenceRefs ?? []), ...refStrings(edge.evidenceRefs ?? [])]),
    });
    addClaim({
      id: edge.id,
      subject: { kind: "step", id: edge.stepId },
      predicate: "performs",
      object: { kind: "capability", id: capabilityId },
      source: "deterministic",
      authority: "inferred",
      confidence: confidenceBand(edge.confidence),
      evidenceRefs: refStrings(edge.evidenceRefs ?? []),
      status: "accepted",
    });
  }

  addHeaderRef(inputRefs, input.contractRegistry?.header);
  for (const entry of input.contractRegistry?.entries ?? []) {
    const contractRef = { kind: "contract", id: `${entry.contractType}:${entry.contractId}` };
    addNode(contractRef);
    for (const system of entry.systems) addClaim(contractClaim(entry, contractRef, "governs", { kind: "system", id: system }));
    for (const path of entry.paths) addClaim(contractClaim(entry, contractRef, "governs", { kind: path.includes("*") ? "path_scope" : "file", id: path }));
    for (const flowId of entry.flowIds) addClaim(contractClaim(entry, contractRef, "governs", { kind: "flow", id: flowId }));
    for (const clauseId of entry.clauseIds) addClaim(contractClaim(entry, contractRef, "declares", { kind: "invariant", id: clauseId }));
  }

  return {
    nodes: [...nodes.values()].sort(refCompare),
    claims: [...claims.values()].map((claim) => ({
      ...claim,
      subject: nodes.get(`${claim.subject.kind}:${claim.subject.id}`) ?? claim.subject,
      object: typeof claim.object === "string"
        ? claim.object
        : nodes.get(`${claim.object.kind}:${claim.object.id}`) ?? claim.object,
    })).sort((left, right) => left.id.localeCompare(right.id)),
    capabilities: [...capabilities.values()].sort((left, right) => left.id.localeCompare(right.id)),
    inputRefs: uniqueRefs(inputRefs),
    warnings: unique(warnings).sort(),
  };
}

function contractClaim(
  entry: ContractRegistryEntryInput,
  subject: RepositoryIntelligenceGraphRef,
  predicate: string,
  object: RepositoryIntelligenceGraphRef,
): RepositoryIntelligenceGraphClaim {
  return {
    id: `contract:${entry.contractType}:${entry.contractId}:${predicate}:${object.kind}:${object.id}`,
    subject,
    predicate,
    object,
    source: entry.authority === "adopted" ? "declared" : "deterministic",
    authority: entry.authority,
    confidence: entry.confidence,
    evidenceRefs: [`${entry.ref.type}:${entry.ref.id}`],
    status: "accepted",
  };
}

function normalizeCapability(input: CapabilityGraphCapabilityInput): RepositoryIntelligenceGraphCapability {
  return {
    id: input.id,
    verb: input.verb,
    noun: input.noun,
    ownerSystem: input.ownerSystem,
    implementedBy: uniqueRefsByKind(input.implementedBy ?? []),
    entrypoints: uniqueRefsByKind(input.entrypoints ?? []),
    dependencies: uniqueRefsByKind(input.dependencies ?? []),
    consumers: uniqueRefsByKind(input.consumers ?? []),
    evidenceRefs: unique(input.evidenceRefs ?? []),
  };
}

function resolveSliceRef(
  id: string,
  edgeKind: string,
  side: "source" | "target",
  nodes: Map<string, RepositoryIntelligenceGraphRef[]>,
): RepositoryIntelligenceGraphRef {
  const candidates = nodes.get(id) ?? [];
  if (candidates.length === 1) return candidates[0]!;
  const preferred = preferredKind(edgeKind, side);
  return candidates.find((candidate) => candidate.kind === preferred)
    ?? { kind: pathLike(id) ? "file" : preferred ?? "unknown", id };
}

function preferredKind(edgeKind: string, side: "source" | "target"): string | undefined {
  if (edgeKind === "owns") return side === "source" ? "system" : "file";
  if (edgeKind === "imports" || edgeKind === "depends_on") return "file";
  if (edgeKind === "exports") return side === "source" ? "file" : "symbol";
  if (edgeKind === "calls") return "callable";
  if (edgeKind === "emits") return side === "target" ? "event" : undefined;
  if (edgeKind === "subscribes") return side === "target" ? "event" : undefined;
  return undefined;
}

function capabilityClaimSource(source: string | undefined): RepositoryIntelligenceGraphClaim["source"] {
  if (source === "runtime") return "runtime";
  if (source === "llm" || source === "embedding") return "model";
  if (source === "human") return "declared";
  return "deterministic";
}

function claimStatus(status: string | undefined): RepositoryIntelligenceGraphClaim["status"] {
  return status === "conflicted" || status === "rejected" || status === "needs-review" ? status : "accepted";
}

function strongerStatus(left: RepositoryIntelligenceGraphClaim["status"], right: RepositoryIntelligenceGraphClaim["status"]): RepositoryIntelligenceGraphClaim["status"] {
  const rank = { accepted: 0, "needs-review": 1, conflicted: 2, rejected: 3 };
  return rank[right] > rank[left] ? right : left;
}

function strongerAuthority(left: ContractAuthority, right: ContractAuthority): ContractAuthority {
  const rank = { observed: 0, inferred: 1, corroborated: 2, adopted: 3 };
  return rank[right] > rank[left] ? right : left;
}

function confidenceBand(value: "high" | "medium" | "low"): number {
  return value === "high" ? 0.9 : value === "medium" ? 0.7 : 0.5;
}

function boundedConfidence(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
}

function pathLike(value: string): boolean {
  return value.includes("/") || /\.[a-z0-9]+$/iu.test(value);
}

function addHeaderRef(refs: ArtifactRef[], header: ArtifactHeader | undefined): void {
  if (!header) return;
  refs.push({ type: header.artifactType, id: header.artifactId, schemaVersion: header.schemaVersion });
}

function refStrings(refs: ArtifactRef[]): string[] {
  return refs.map((ref) => `${ref.type}:${ref.id}`);
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

function uniqueRefsByKind(refs: RepositoryIntelligenceGraphRef[]): RepositoryIntelligenceGraphRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function refCompare(left: RepositoryIntelligenceGraphRef, right: RepositoryIntelligenceGraphRef): number {
  return `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`);
}

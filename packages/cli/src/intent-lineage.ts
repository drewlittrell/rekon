import type { ArtifactRef } from "@rekon/kernel-artifacts";
import type { ArtifactIndexEntry, ArtifactStore } from "@rekon/runtime";

export type IntentStatusLineageSlot =
  | "assessment"
  | "preparedPlan"
  | "intentStatus"
  | "workOrder"
  | "verificationPlan"
  | "verificationRun"
  | "verificationResult"
  | "pathFreshness"
  | "runtimeDrift"
  | "handoffCoverage";

export type ResolvedIntentArtifact = {
  entry: ArtifactIndexEntry;
  ref: ArtifactRef;
  value: unknown;
};

export type IntentStatusLineageSelection = Record<IntentStatusLineageSlot, ResolvedIntentArtifact | undefined> & {
  provenance: {
    root: ArtifactRef[];
    selected: Partial<Record<IntentStatusLineageSlot, ArtifactRef>>;
    missing: IntentStatusLineageSlot[];
  };
};

export class IntentArtifactLineageError extends Error {
  constructor(
    readonly code:
      | "intent_artifact_lineage_mismatch"
      | "intent_artifact_lineage_ambiguous"
      | "intent_artifact_source_ref_missing",
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "IntentArtifactLineageError";
  }
}

type ResolveIntentStatusLineageInput = {
  store: ArtifactStore;
  requested: Partial<Record<IntentStatusLineageSlot, string>>;
};

const SLOT_TYPES: Record<IntentStatusLineageSlot, string> = {
  assessment: "IntentAssessmentReport",
  preparedPlan: "PreparedIntentPlan",
  intentStatus: "IntentStatusReport",
  workOrder: "WorkOrder",
  verificationPlan: "VerificationPlan",
  verificationRun: "VerificationRun",
  verificationResult: "VerificationResult",
  pathFreshness: "PathFreshnessReport",
  runtimeDrift: "RuntimeGraphDriftReport",
  handoffCoverage: "HandoffCoverageReport",
};

const DOWNSTREAM_SLOTS: IntentStatusLineageSlot[] = [
  "workOrder",
  "verificationPlan",
  "verificationRun",
  "verificationResult",
];

const CONTEXT_SLOTS: IntentStatusLineageSlot[] = [
  "pathFreshness",
  "runtimeDrift",
  "handoffCoverage",
];

export async function resolveIntentStatusLineage(
  input: ResolveIntentStatusLineageInput,
): Promise<IntentStatusLineageSelection> {
  const graph = await createLineageGraph(input.store);
  const selected: Partial<Record<IntentStatusLineageSlot, ResolvedIntentArtifact>> = {};

  const explicitAssessment = await resolveExplicit(input, graph, "assessment");
  const explicitPrepared = await resolveExplicit(input, graph, "preparedPlan");

  if (explicitAssessment) selected.assessment = explicitAssessment;
  if (explicitPrepared) selected.preparedPlan = explicitPrepared;

  if (explicitPrepared && explicitAssessment) {
    await assertReaches(graph, explicitPrepared, explicitAssessment.ref, "preparedPlan");
  } else if (explicitPrepared) {
    selected.assessment = await resolveReferencedAssessment(graph, explicitPrepared);
  } else if (explicitAssessment) {
    selected.preparedPlan = await selectLatestCompatible(graph, "preparedPlan", [explicitAssessment.ref]);
  } else {
    selected.preparedPlan = await selectLatest(graph, "preparedPlan");
    selected.assessment = selected.preparedPlan
      ? await resolveReferencedAssessment(graph, selected.preparedPlan)
      : await selectLatest(graph, "assessment");
  }

  const rootRefs = [selected.assessment?.ref, selected.preparedPlan?.ref]
    .filter((ref): ref is ArtifactRef => Boolean(ref));

  if (selected.preparedPlan) {
    const work = await resolveWorkOrder(input, graph, rootRefs);
    selected.intentStatus = work.intentStatus;
    selected.workOrder = work.workOrder;

    const workOrder = selected.workOrder?.ref;
    selected.verificationPlan = workOrder
      ? await resolveDownstream(input, graph, "verificationPlan", rootRefs, workOrder)
      : await rejectExplicitWithoutParent(input, graph, "verificationPlan", "WorkOrder");

    const verificationPlan = selected.verificationPlan?.ref;
    selected.verificationRun = verificationPlan
      ? await resolveDownstream(input, graph, "verificationRun", rootRefs, verificationPlan)
      : await rejectExplicitWithoutParent(input, graph, "verificationRun", "VerificationPlan");

    const verificationRun = selected.verificationRun?.ref;
    selected.verificationResult = verificationRun
      ? await resolveDownstream(input, graph, "verificationResult", rootRefs, verificationRun)
      : await rejectExplicitWithoutParent(input, graph, "verificationResult", "VerificationRun");

    for (const slot of CONTEXT_SLOTS) {
      selected[slot] = await resolveContext(input, graph, slot, selected.preparedPlan.ref);
    }
  } else {
    for (const slot of [...DOWNSTREAM_SLOTS, ...CONTEXT_SLOTS]) {
      selected[slot] = await rejectExplicitWithoutParent(input, graph, slot, "intent lineage root");
    }
  }

  const selectedRefs: Partial<Record<IntentStatusLineageSlot, ArtifactRef>> = {};
  const missing: IntentStatusLineageSlot[] = [];
  for (const slot of Object.keys(SLOT_TYPES) as IntentStatusLineageSlot[]) {
    const artifact = selected[slot];
    if (artifact) selectedRefs[slot] = artifact.ref;
    else missing.push(slot);
  }

  return {
    assessment: selected.assessment,
    preparedPlan: selected.preparedPlan,
    intentStatus: selected.intentStatus,
    workOrder: selected.workOrder,
    verificationPlan: selected.verificationPlan,
    verificationRun: selected.verificationRun,
    verificationResult: selected.verificationResult,
    pathFreshness: selected.pathFreshness,
    runtimeDrift: selected.runtimeDrift,
    handoffCoverage: selected.handoffCoverage,
    provenance: {
      root: [selected.assessment?.ref, selected.preparedPlan?.ref].filter((ref): ref is ArtifactRef => Boolean(ref)),
      selected: selectedRefs,
      missing,
    },
  };
}

async function resolveExplicit(
  input: ResolveIntentStatusLineageInput,
  graph: LineageGraph,
  slot: IntentStatusLineageSlot,
): Promise<ResolvedIntentArtifact | undefined> {
  const request = input.requested[slot];
  if (!request) return undefined;
  const artifact = await graph.findRequested(request);
  if (artifact.entry.type !== SLOT_TYPES[slot]) {
    throw new IntentArtifactLineageError(
      "intent_artifact_lineage_mismatch",
      `rekon intent status --${flagForSlot(slot)} must reference a ${SLOT_TYPES[slot]}; got ${artifact.entry.type}.`,
      { slot, expectedType: SLOT_TYPES[slot], actualType: artifact.entry.type, ref: artifact.ref },
    );
  }
  return artifact;
}

async function resolveDownstream(
  input: ResolveIntentStatusLineageInput,
  graph: LineageGraph,
  slot: IntentStatusLineageSlot,
  rootRefs: ArtifactRef[],
  directParent: ArtifactRef,
): Promise<ResolvedIntentArtifact | undefined> {
  const explicit = await resolveExplicit(input, graph, slot);
  if (explicit) {
    assertDirectParent(graph, explicit, directParent, slot);
    for (const required of rootRefs) await assertReaches(graph, explicit, required, slot);
    return explicit;
  }
  return selectLatestCompatible(graph, slot, rootRefs, directParent);
}

async function resolveWorkOrder(
  input: ResolveIntentStatusLineageInput,
  graph: LineageGraph,
  rootRefs: ArtifactRef[],
): Promise<{
  intentStatus?: ResolvedIntentArtifact;
  workOrder?: ResolvedIntentArtifact;
}> {
  const explicit = await resolveExplicit(input, graph, "workOrder");
  const candidates = explicit ? [explicit] : await graph.list(SLOT_TYPES.workOrder);

  for (const candidate of candidates) {
    if (explicit) {
      for (const root of rootRefs) await assertReaches(graph, candidate, root, "workOrder");
    } else if (!await reachesAll(graph, candidate, rootRefs)) {
      continue;
    }

    const statusRefs = graph.directRefs(candidate.value)
      .filter((ref) => ref.type === SLOT_TYPES.intentStatus);
    if (statusRefs.length === 0) {
      if (explicit) throwSourceRefMissing(candidate, "workOrder", SLOT_TYPES.intentStatus);
      continue;
    }

    const compatibleStatuses: ResolvedIntentArtifact[] = [];
    for (const statusRef of statusRefs) {
      const status = await graph.findRef(statusRef);
      if (status && await reachesAll(graph, status, rootRefs)) compatibleStatuses.push(status);
    }
    if (compatibleStatuses.length > 1) {
      throw new IntentArtifactLineageError(
        "intent_artifact_lineage_ambiguous",
        `${candidate.ref.type}:${candidate.ref.id} references multiple compatible IntentStatusReport artifacts.`,
        { slot: "workOrder", ref: candidate.ref, intentStatusRefs: compatibleStatuses.map((status) => status.ref) },
      );
    }
    if (compatibleStatuses.length === 1) {
      return { intentStatus: compatibleStatuses[0], workOrder: candidate };
    }
    if (explicit) await throwMismatch(graph, candidate, rootRefs[rootRefs.length - 1]!, "workOrder");
  }

  return {};
}

async function resolveContext(
  input: ResolveIntentStatusLineageInput,
  graph: LineageGraph,
  slot: IntentStatusLineageSlot,
  root: ArtifactRef,
): Promise<ResolvedIntentArtifact | undefined> {
  const explicit = await resolveExplicit(input, graph, slot);
  if (explicit) {
    const compatible = await graph.reaches(explicit.ref, root) || await graph.reaches(root, explicit.ref);
    if (!compatible) await throwMismatch(graph, explicit, root, slot);
    return explicit;
  }

  const candidates = await graph.list(SLOT_TYPES[slot]);
  for (const candidate of candidates) {
    if (await graph.reaches(candidate.ref, root) || await graph.reaches(root, candidate.ref)) return candidate;
  }
  return undefined;
}

async function rejectExplicitWithoutParent(
  input: ResolveIntentStatusLineageInput,
  graph: LineageGraph,
  slot: IntentStatusLineageSlot,
  parent: string,
): Promise<undefined> {
  const explicit = await resolveExplicit(input, graph, slot);
  if (!explicit) return undefined;
  throw new IntentArtifactLineageError(
    "intent_artifact_lineage_mismatch",
    `${SLOT_TYPES[slot]}:${explicit.ref.id} cannot be used because no compatible ${parent} is selected.`,
    { slot, ref: explicit.ref, missingParent: parent },
  );
}

async function resolveReferencedAssessment(
  graph: LineageGraph,
  prepared: ResolvedIntentArtifact,
): Promise<ResolvedIntentArtifact | undefined> {
  const refs = graph.directRefs(prepared.value)
    .filter((ref) => ref.type === "IntentAssessmentReport");
  const unique = dedupeRefs(refs);
  if (unique.length > 1) {
    throw new IntentArtifactLineageError(
      "intent_artifact_lineage_ambiguous",
      `PreparedIntentPlan:${prepared.ref.id} references multiple IntentAssessmentReport artifacts.`,
      { preparedPlanRef: prepared.ref, assessmentRefs: unique },
    );
  }
  if (unique.length === 0) {
    throwSourceRefMissing(prepared, "preparedPlan", "IntentAssessmentReport");
  }
  const assessment = await graph.findRef(unique[0]!);
  if (!assessment) {
    throw new IntentArtifactLineageError(
      "intent_artifact_source_ref_missing",
      `PreparedIntentPlan:${prepared.ref.id} references an IntentAssessmentReport that is not present in the artifact store.`,
      { slot: "preparedPlan", ref: prepared.ref, missingRef: unique[0] },
    );
  }
  return assessment;
}

async function selectLatest(
  graph: LineageGraph,
  slot: IntentStatusLineageSlot,
): Promise<ResolvedIntentArtifact | undefined> {
  return (await graph.list(SLOT_TYPES[slot]))[0];
}

async function selectLatestCompatible(
  graph: LineageGraph,
  slot: IntentStatusLineageSlot,
  requiredRefs: ArtifactRef[],
  directParent?: ArtifactRef,
): Promise<ResolvedIntentArtifact | undefined> {
  const candidates = await graph.list(SLOT_TYPES[slot]);
  for (const candidate of candidates) {
    if (directParent && !hasDirectParent(graph, candidate, directParent, slot)) continue;
    let compatible = true;
    for (const required of requiredRefs) {
      if (!await graph.reaches(candidate.ref, required)) {
        compatible = false;
        break;
      }
    }
    if (compatible) return candidate;
  }
  return undefined;
}

async function reachesAll(
  graph: LineageGraph,
  artifact: ResolvedIntentArtifact,
  targets: ArtifactRef[],
): Promise<boolean> {
  for (const target of targets) {
    if (!await graph.reaches(artifact.ref, target)) return false;
  }
  return true;
}

function assertDirectParent(
  graph: LineageGraph,
  artifact: ResolvedIntentArtifact,
  parent: ArtifactRef,
  slot: IntentStatusLineageSlot,
): void {
  const parentRefs = graph.directRefs(artifact.value).filter((ref) => ref.type === parent.type);
  if (parentRefs.length === 0) throwSourceRefMissing(artifact, slot, parent.type);
  if (parentRefs.length > 1) throwAmbiguousParents(artifact, slot, parent.type, parentRefs);
  if (!parentRefs.some((ref) => refsMatch(ref, parent))) {
    throw new IntentArtifactLineageError(
      "intent_artifact_lineage_mismatch",
      `${artifact.ref.type}:${artifact.ref.id} does not directly reference ${parent.type}:${parent.id}.`,
      { slot, ref: artifact.ref, requiredRef: parent, directParentRefs: parentRefs },
    );
  }
}

function hasDirectParent(
  graph: LineageGraph,
  artifact: ResolvedIntentArtifact,
  parent: ArtifactRef,
  slot: IntentStatusLineageSlot,
): boolean {
  const parentRefs = graph.directRefs(artifact.value).filter((ref) => ref.type === parent.type);
  const matches = parentRefs.some((ref) => refsMatch(ref, parent));
  if (matches && parentRefs.length > 1) {
    throwAmbiguousParents(artifact, slot, parent.type, parentRefs);
  }
  return matches;
}

function throwAmbiguousParents(
  artifact: ResolvedIntentArtifact,
  slot: IntentStatusLineageSlot,
  parentType: string,
  parentRefs: ArtifactRef[],
): never {
  throw new IntentArtifactLineageError(
    "intent_artifact_lineage_ambiguous",
    `${artifact.ref.type}:${artifact.ref.id} references multiple ${parentType} artifacts.`,
    { slot, ref: artifact.ref, parentType, parentRefs },
  );
}

function throwSourceRefMissing(
  artifact: ResolvedIntentArtifact,
  slot: IntentStatusLineageSlot,
  requiredType: string,
): never {
  throw new IntentArtifactLineageError(
    "intent_artifact_source_ref_missing",
    `${artifact.ref.type}:${artifact.ref.id} has no structured ${requiredType} reference proving its intent lineage.`,
    { slot, ref: artifact.ref, requiredType },
  );
}

async function assertReaches(
  graph: LineageGraph,
  artifact: ResolvedIntentArtifact,
  target: ArtifactRef,
  slot: IntentStatusLineageSlot,
): Promise<void> {
  if (await graph.reaches(artifact.ref, target)) return;
  await throwMismatch(graph, artifact, target, slot);
}

async function throwMismatch(
  graph: LineageGraph,
  artifact: ResolvedIntentArtifact,
  target: ArtifactRef,
  slot: IntentStatusLineageSlot,
): Promise<never> {
  const refs = graph.directRefs(artifact.value);
  if (refs.length === 0) {
    throw new IntentArtifactLineageError(
      "intent_artifact_source_ref_missing",
      `${artifact.ref.type}:${artifact.ref.id} has no structured artifact refs proving its intent lineage.`,
      { slot, ref: artifact.ref, requiredRef: target },
    );
  }
  throw new IntentArtifactLineageError(
    "intent_artifact_lineage_mismatch",
    `${artifact.ref.type}:${artifact.ref.id} does not trace to ${target.type}:${target.id}.`,
    { slot, ref: artifact.ref, requiredRef: target, directRefs: refs },
  );
}

type LineageGraph = Awaited<ReturnType<typeof createLineageGraph>>;

async function createLineageGraph(store: ArtifactStore) {
  const entries = await store.list();
  const entryByKey = new Map(entries.map((entry) => [key(entry), entry]));
  const bodyByKey = new Map<string, unknown>();

  const findRef = async (ref: ArtifactRef): Promise<ResolvedIntentArtifact | undefined> => {
    const entry = entryByKey.get(key(ref));
    if (!entry || (ref.digest && entry.digest && ref.digest !== entry.digest)) return undefined;
    let value = bodyByKey.get(key(entry));
    if (value === undefined) {
      value = await store.read(entry);
      bodyByKey.set(key(entry), value);
    }
    return { entry, ref: toRef(entry), value };
  };

  return {
    directRefs: declaredInputRefs,
    findRef,
    async findRequested(request: string): Promise<ResolvedIntentArtifact> {
      const parsed = parseRequestedRef(request);
      const candidates = parsed.type
        ? entries.filter((entry) => entry.type === parsed.type && entry.id === parsed.id)
        : entries.filter((entry) => entry.id === parsed.id);
      if (candidates.length === 0) throw new Error(`Artifact not found: ${request}`);
      if (candidates.length > 1) {
        throw new IntentArtifactLineageError(
          "intent_artifact_lineage_ambiguous",
          `Artifact reference is ambiguous: ${request}. Use Type:id.`,
          { request, candidates: candidates.map(toRef) },
        );
      }
      return (await findRef(toRef(candidates[0]!)))!;
    },
    async list(type: string): Promise<ResolvedIntentArtifact[]> {
      const sorted = entries
        .filter((entry) => entry.type === type)
        .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt) || right.id.localeCompare(left.id));
      const resolved: ResolvedIntentArtifact[] = [];
      for (const entry of sorted) {
        const artifact = await findRef(toRef(entry));
        if (artifact) resolved.push(artifact);
      }
      return resolved;
    },
    async reaches(from: ArtifactRef, target: ArtifactRef): Promise<boolean> {
      const queue = [from];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (refsMatch(current, target)) return true;
        if (visited.has(key(current))) continue;
        visited.add(key(current));
        const artifact = await findRef(current);
        if (!artifact) continue;
        for (const ref of declaredInputRefs(artifact.value)) {
          if (!visited.has(key(ref))) queue.push(ref);
        }
      }
      return false;
    },
  };
}

function declaredInputRefs(value: unknown): ArtifactRef[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const header = (value as Record<string, unknown>).header;
  if (!header || typeof header !== "object" || Array.isArray(header)) return [];
  return collectArtifactRefs((header as Record<string, unknown>).inputRefs);
}

function collectArtifactRefs(value: unknown): ArtifactRef[] {
  const refs: ArtifactRef[] = [];
  const seen = new Set<object>();
  const visit = (candidate: unknown, depth: number): void => {
    if (depth > 16 || !candidate || typeof candidate !== "object") return;
    if (seen.has(candidate as object)) return;
    seen.add(candidate as object);
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item, depth + 1);
      return;
    }
    const record = candidate as Record<string, unknown>;
    if (typeof record.type === "string" && typeof record.id === "string" && typeof record.schemaVersion === "string") {
      refs.push({
        type: record.type,
        id: record.id,
        schemaVersion: record.schemaVersion,
        ...(typeof record.path === "string" ? { path: record.path } : {}),
        ...(typeof record.digest === "string" ? { digest: record.digest } : {}),
      });
      return;
    }
    for (const entry of Object.values(record)) visit(entry, depth + 1);
  };
  visit(value, 0);
  return dedupeRefs(refs);
}

function dedupeRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const byKey = new Map<string, ArtifactRef>();
  for (const ref of refs) byKey.set(key(ref), ref);
  return [...byKey.values()];
}

function refsMatch(left: ArtifactRef, right: ArtifactRef): boolean {
  return left.type === right.type
    && left.id === right.id
    && !(left.digest && right.digest && left.digest !== right.digest);
}

function toRef(entry: ArtifactIndexEntry): ArtifactRef {
  return {
    type: entry.type,
    id: entry.id,
    schemaVersion: entry.schemaVersion,
    ...(entry.path ? { path: entry.path } : {}),
    ...(entry.digest ? { digest: entry.digest } : {}),
  };
}

function key(ref: Pick<ArtifactRef, "type" | "id">): string {
  return `${ref.type}:${ref.id}`;
}

function parseRequestedRef(request: string): { type?: string; id: string } {
  const separator = request.indexOf(":");
  if (separator > 0) return { type: request.slice(0, separator), id: request.slice(separator + 1) };
  return { id: request };
}

function flagForSlot(slot: IntentStatusLineageSlot): string {
  return slot.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

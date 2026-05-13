import {
  type ArtifactHeader,
  type ArtifactRef,
} from "@rekon/kernel-artifacts";
import { type ObservedRepo, type OwnershipMap } from "@rekon/kernel-repo-model";
import { type IntelligenceSnapshot } from "@rekon/kernel-snapshot";
import { type ArtifactReader, type Resolver, defineCapability } from "@rekon/sdk";

export type ResolutionTraceEntry = {
  step: string;
  sourceType:
    | "OwnershipMap"
    | "ObservedRepo"
    | "GraphSlice"
    | "EvidenceGraph"
    | "FindingReport"
    | "MemorySelection"
    | "ResolverInput"
    | "RiskRule"
    | "Fallback";
  sourceRef?: ArtifactRef;
  status: "used" | "checked" | "missing" | "skipped" | "fallback" | "warning";
  message: string;
  paths?: string[];
  systems?: string[];
  confidence?: number;
  details?: Record<string, unknown>;
};

export type PreflightPacket = {
  header: ArtifactHeader;
  goal: string;
  paths: string[];
  ownerSystems: string[];
  matchedScopes: Array<{
    path: string;
    owner?: string;
    confidence?: number;
  }>;
  risk: {
    tier: "low" | "medium" | "high";
    reasons: string[];
  };
  requiredChecks: string[];
  relevantFindings: unknown[];
  recommendedContext: string[];
  applicableMemory?: Array<{
    instruction: string;
    scope?: Record<string, unknown>;
    confidence: number;
    reason: string;
  }>;
  warnings: string[];
  resolutionTrace: ResolutionTraceEntry[];
  nextSteps: string[];
};

type EvidenceGraphLike = {
  facts?: Array<{
    kind: string;
    subject: string;
    value?: Record<string, unknown>;
    confidence?: number;
  }>;
};

type GraphSliceLike = {
  header?: ArtifactHeader;
  producer?: string;
  edges?: Array<{
    source: string;
    target: string;
    kind: string;
    evidence?: Array<{
      confidence?: number;
    }>;
  }>;
};

type OwnershipResolution = {
  matchedScopes: PreflightPacket["matchedScopes"];
  ownerSystems: string[];
  trace: ResolutionTraceEntry[];
  warnings: string[];
};

export const preflightResolver: Resolver = {
  id: "resolve.preflight",
  produces: ["ResolverPacket"],
  async resolve({ artifacts, input }) {
    const snapshotRef = parseArtifactRef(input?.snapshotRef);
    const goal = typeof input?.goal === "string" ? input.goal : "";
    const paths = parsePaths(input?.path ?? input?.paths);

    if (!snapshotRef) {
      throw new Error("resolve.preflight requires input.snapshotRef.");
    }

    if (paths.length === 0) {
      throw new Error("resolve.preflight requires input.path or input.paths.");
    }

    const snapshot = await artifacts.read(snapshotRef) as IntelligenceSnapshot;
    const resolverInputTrace: ResolutionTraceEntry = {
      step: "resolver.input",
      sourceType: "ResolverInput",
      status: "used",
      message: "Resolved preflight request inputs.",
      paths,
      details: {
        goal,
      },
    };
    const ownership = await resolveOwnership({ artifacts, snapshot, paths });
    const { matchedScopes, ownerSystems } = ownership;
    const findingRefs = Object.values(snapshot.evaluations ?? {}).flat();
    const relevantFindings = await readRelevantFindings(artifacts, findingRefs, paths);
    const findingTrace = buildFindingTrace(findingRefs, relevantFindings, paths);
    const memoryRefs = Object.values((snapshot as { publications?: Record<string, ArtifactRef[]> }).publications ?? {})
      .flat()
      .filter((ref) => ref.type === "MemorySelection");
    const applicableMemory = await readMemorySelections(artifacts, memoryRefs, paths, goal);
    const memoryTrace = buildMemoryTrace(memoryRefs, applicableMemory ?? [], paths);
    const { risk, trace: riskTrace } = computeRisk(paths, ownerSystems, matchedScopes, relevantFindings);
    const warnings = [
      ...ownership.warnings,
      ...buildFindingWarnings(findingRefs),
      ...buildWarnings(paths, ownerSystems),
    ];
    const resolutionTrace = [
      resolverInputTrace,
      ...ownership.trace,
      ...findingTrace,
      ...memoryTrace,
      ...riskTrace,
    ];
    const ownershipMapRefs = snapshot.projections.OwnershipMap ?? [];
    const observedRepoRefs = snapshot.projections.ObservedRepo ?? [];
    const graphSliceRefs = snapshot.projections.GraphSlice ?? [];
    const evidenceRefs = snapshot.inputs.EvidenceGraph ?? [];
    const packet: PreflightPacket = {
      header: {
        artifactType: "ResolverPacket",
        artifactId: `preflight-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        snapshotId: snapshot.header.artifactId,
        subject: {
          repoId: snapshot.repo.id,
          ref: snapshot.repo.branch,
          commit: snapshot.repo.commit,
          paths,
          systems: ownerSystems,
        },
        producer: {
          id: "@rekon/capability-resolver",
          version: "0.1.0",
        },
        inputRefs: [
          snapshotRef,
          ...ownershipMapRefs,
          ...observedRepoRefs,
          ...graphSliceRefs,
          ...evidenceRefs,
          ...findingRefs,
          ...memoryRefs,
        ],
        freshness: {
          status: "fresh",
        },
        provenance: {
          confidence: ownerSystems.length > 0 ? 0.8 : 0.4,
          notes: ["resolve.preflight"],
        },
      },
      goal,
      paths,
      ownerSystems,
      matchedScopes,
      risk,
      requiredChecks: ["npm run typecheck", "npm run test", "npm run build"],
      relevantFindings,
      recommendedContext: buildRecommendedContext(paths, ownerSystems),
      applicableMemory,
      warnings,
      resolutionTrace,
      nextSteps: [
        "Read the owner package docs before editing.",
        "Keep changes scoped to the requested paths.",
        "Run the required checks before handoff.",
      ],
    };

    const ref = await artifacts.write("ResolverPacket", packet);

    return [ref];
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-resolver",
    name: "Resolver Capability",
    version: "0.1.0",
    roles: ["resolver"],
    consumes: ["IntelligenceSnapshot", "OwnershipMap", "ObservedRepo", "GraphSlice", "EvidenceGraph", "FindingReport", "MemorySelection"],
    produces: ["ResolverPacket"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "snapshot.changed",
        description: "Resolver packets are invalid when their snapshot or selected inputs change.",
        inputs: ["IntelligenceSnapshot", "OwnershipMap", "ObservedRepo", "GraphSlice", "EvidenceGraph", "FindingReport", "MemorySelection"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.resolver(preflightResolver);
  },
});

function parseArtifactRef(value: unknown): ArtifactRef | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ArtifactRef>;

  if (
    typeof candidate.type === "string" &&
    typeof candidate.id === "string" &&
    typeof candidate.schemaVersion === "string"
  ) {
    return candidate as ArtifactRef;
  }

  return null;
}

function parsePaths(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter(isString);
  }

  return [];
}

async function resolveOwnership(input: {
  artifacts: ArtifactReader;
  snapshot: IntelligenceSnapshot;
  paths: string[];
}): Promise<OwnershipResolution> {
  const matchedScopes = input.paths.map((path) => ({ path }));
  const unresolved = new Set(input.paths);
  const trace: ResolutionTraceEntry[] = [];
  const warnings: string[] = [];

  const ownershipMapRefs = input.snapshot.projections.OwnershipMap ?? [];
  const observedRepoRefs = input.snapshot.projections.ObservedRepo ?? [];
  const graphSliceRefs = input.snapshot.projections.GraphSlice ?? [];
  const evidenceRefs = input.snapshot.inputs.EvidenceGraph ?? [];

  if (ownershipMapRefs.length === 0) {
    trace.push(missingTrace("OwnershipMap", "OwnershipMap unavailable; checking ObservedRepo.", input.paths));
  } else {
    for (const ref of ownershipMapRefs) {
      trace.push(checkedTrace("OwnershipMap", ref, `Checked OwnershipMap for ${unresolved.size} unresolved path(s).`, [...unresolved]));
      const map = await input.artifacts.read(ref) as OwnershipMap;
      const matches = [...unresolved]
        .map((path) => ({ path, match: findBestOwnershipMapMatch(path, map) }))
        .filter((candidate): candidate is { path: string; match: { owner: string; matchedPath: string; confidence: number } } => Boolean(candidate.match));

      applyOwnershipMatches(matchedScopes, unresolved, matches.map(({ path, match }) => ({
        path,
        owner: match.owner,
        confidence: match.confidence,
      })));

      if (matches.length > 0) {
        trace.push(usedTrace("OwnershipMap", ref, "Resolved owner system from OwnershipMap.", matches));
      }
    }

    if (unresolved.size > 0) {
      trace.push(fallbackTrace("OwnershipMap", "OwnershipMap had no matching entry for every requested path; falling back to ObservedRepo.", [...unresolved]));
    }
  }

  if (unresolved.size === 0) {
    trace.push(skippedTrace("ObservedRepo", "ObservedRepo skipped because ownership was fully resolved.", input.paths));
    trace.push(skippedTrace("GraphSlice", "Ownership GraphSlice skipped because ownership was fully resolved.", input.paths));
    trace.push(skippedTrace("EvidenceGraph", "EvidenceGraph ownership_hint fallback skipped because ownership was fully resolved.", input.paths));
    return completeOwnershipResolution(matchedScopes, trace, warnings);
  }

  if (observedRepoRefs.length === 0) {
    trace.push(missingTrace("ObservedRepo", "ObservedRepo unavailable; checking ownership GraphSlice.", [...unresolved]));
  } else {
    for (const ref of observedRepoRefs) {
      trace.push(checkedTrace("ObservedRepo", ref, `Checked ObservedRepo for ${unresolved.size} unresolved path(s).`, [...unresolved]));
      const repo = await input.artifacts.read(ref) as ObservedRepo;
      const matches = [...unresolved]
        .map((path) => ({ path, match: findBestObservedRepoMatch(path, repo) }))
        .filter((candidate): candidate is { path: string; match: { owner: string; matchedPath: string; confidence: number } } => Boolean(candidate.match));

      applyOwnershipMatches(matchedScopes, unresolved, matches.map(({ path, match }) => ({
        path,
        owner: match.owner,
        confidence: match.confidence,
      })));

      if (matches.length > 0) {
        trace.push(usedTrace("ObservedRepo", ref, "Resolved owner system from ObservedRepo.", matches));
      }
    }

    if (unresolved.size > 0) {
      trace.push(fallbackTrace("ObservedRepo", "ObservedRepo had no matching system path; falling back to ownership GraphSlice.", [...unresolved]));
    }
  }

  if (unresolved.size === 0) {
    trace.push(skippedTrace("GraphSlice", "Ownership GraphSlice skipped because ownership was fully resolved.", input.paths));
    trace.push(skippedTrace("EvidenceGraph", "EvidenceGraph ownership_hint fallback skipped because ownership was fully resolved.", input.paths));
    return completeOwnershipResolution(matchedScopes, trace, warnings);
  }

  if (graphSliceRefs.length === 0) {
    trace.push(missingTrace("GraphSlice", "No GraphSlice artifacts are indexed; checking raw EvidenceGraph ownership hints.", [...unresolved]));
  } else {
    let checkedOwnershipGraph = false;

    for (const ref of graphSliceRefs) {
      const slice = await input.artifacts.read(ref) as GraphSliceLike;

      if (!isOwnershipGraphSlice(slice)) {
        trace.push({
          step: "ownership.resolve",
          sourceType: "GraphSlice",
          sourceRef: ref,
          status: "skipped",
          message: "Skipped non-ownership GraphSlice.",
          paths: [...unresolved],
        });
        continue;
      }

      checkedOwnershipGraph = true;
      trace.push(checkedTrace("GraphSlice", ref, `Checked ownership GraphSlice for ${unresolved.size} unresolved path(s).`, [...unresolved]));
      const matches = [...unresolved]
        .map((path) => ({ path, match: findBestGraphOwnershipMatch(path, slice) }))
        .filter((candidate): candidate is { path: string; match: { owner: string; matchedPath: string; confidence: number } } => Boolean(candidate.match));

      applyOwnershipMatches(matchedScopes, unresolved, matches.map(({ path, match }) => ({
        path,
        owner: match.owner,
        confidence: match.confidence,
      })));

      if (matches.length > 0) {
        trace.push(usedTrace("GraphSlice", ref, "Resolved owner system from ownership GraphSlice.", matches));
      }
    }

    if (!checkedOwnershipGraph) {
      trace.push(fallbackTrace("GraphSlice", "No ownership GraphSlice was found; falling back to raw EvidenceGraph ownership_hint facts.", [...unresolved]));
    } else if (unresolved.size > 0) {
      trace.push(fallbackTrace("GraphSlice", "Ownership GraphSlice had no matching edge for every requested path; falling back to raw EvidenceGraph ownership_hint facts.", [...unresolved]));
    }
  }

  if (unresolved.size === 0) {
    trace.push(skippedTrace("EvidenceGraph", "EvidenceGraph ownership_hint fallback skipped because ownership was fully resolved.", input.paths));
    return completeOwnershipResolution(matchedScopes, trace, warnings);
  }

  if (evidenceRefs.length === 0) {
    trace.push(missingTrace("EvidenceGraph", "EvidenceGraph unavailable; ownership remains unresolved.", [...unresolved]));
  } else {
    let usedEvidenceFallback = false;

    for (const ref of evidenceRefs) {
      trace.push(checkedTrace("EvidenceGraph", ref, `Checked raw EvidenceGraph ownership_hint facts for ${unresolved.size} unresolved path(s).`, [...unresolved]));
      const graph = await input.artifacts.read(ref) as EvidenceGraphLike;
      const facts = (graph.facts ?? []).filter((fact) => fact.kind === "ownership_hint");
      const matches = [...unresolved]
        .map((path) => ({ path, match: findBestEvidenceOwnershipMatch(path, facts) }))
        .filter((candidate): candidate is { path: string; match: { owner: string; matchedPath: string; confidence: number } } => Boolean(candidate.match));

      applyOwnershipMatches(matchedScopes, unresolved, matches.map(({ path, match }) => ({
        path,
        owner: match.owner,
        confidence: match.confidence,
      })));

      if (matches.length > 0) {
        usedEvidenceFallback = true;
        trace.push(usedTrace("EvidenceGraph", ref, "Resolved owner system from raw EvidenceGraph ownership_hint fallback.", matches));
      }
    }

    if (usedEvidenceFallback) {
      warnings.push("OwnershipMap unavailable; used EvidenceGraph ownership_hint fallback.");
    }
  }

  if (unresolved.size > 0) {
    warnings.push("Ownership unresolved for at least one requested path.");
    trace.push({
      step: "ownership.resolve",
      sourceType: "Fallback",
      status: "warning",
      message: "Ownership remains unresolved for at least one requested path.",
      paths: [...unresolved],
    });
  }

  return completeOwnershipResolution(matchedScopes, trace, warnings);
}

function findBestEvidenceOwnershipMatch(
  path: string,
  facts: Array<{ subject: string; value?: Record<string, unknown>; confidence?: number }>,
): { owner: string; matchedPath: string; confidence: number } | undefined {
  const match = facts
    .map((fact) => ({
      fact,
      factPath: typeof fact.value?.path === "string" ? fact.value.path : fact.subject,
    }))
    .filter(({ fact, factPath }) => typeof fact.value?.system === "string" && pathMatches(path, factPath))
    .sort((left, right) => right.factPath.length - left.factPath.length || (right.fact.confidence ?? 0) - (left.fact.confidence ?? 0))[0];

  if (!match || typeof match.fact.value?.system !== "string") {
    return undefined;
  }

  return {
    owner: match.fact.value.system,
    matchedPath: match.factPath,
    confidence: match.fact.confidence ?? 0.5,
  };
}

function findBestOwnershipMapMatch(path: string, map: OwnershipMap): { owner: string; matchedPath: string; confidence: number } | undefined {
  const entry = map.entries
    .filter((candidate) => pathMatches(path, candidate.path))
    .sort((left, right) => right.path.length - left.path.length || right.confidence - left.confidence)[0];

  return entry
    ? { owner: entry.ownerSystem, matchedPath: entry.path, confidence: entry.confidence }
    : undefined;
}

function findBestObservedRepoMatch(path: string, repo: ObservedRepo): { owner: string; matchedPath: string; confidence: number } | undefined {
  const entry = repo.systems
    .flatMap((system) => system.paths.map((systemPath) => ({ system, systemPath })))
    .filter((candidate) => pathMatches(path, candidate.systemPath))
    .sort((left, right) => right.systemPath.length - left.systemPath.length || right.system.confidence - left.system.confidence)[0];

  return entry
    ? { owner: entry.system.id, matchedPath: entry.systemPath, confidence: entry.system.confidence }
    : undefined;
}

function findBestGraphOwnershipMatch(path: string, slice: GraphSliceLike): { owner: string; matchedPath: string; confidence: number } | undefined {
  const edge = (slice.edges ?? [])
    .filter((candidate) => candidate.kind === "owns" && pathMatches(path, candidate.target))
    .sort((left, right) => right.target.length - left.target.length || confidenceForEdge(right) - confidenceForEdge(left))[0];

  return edge
    ? { owner: edge.source, matchedPath: edge.target, confidence: confidenceForEdge(edge) }
    : undefined;
}

function completeOwnershipResolution(
  matchedScopes: PreflightPacket["matchedScopes"],
  trace: ResolutionTraceEntry[],
  warnings: string[],
): OwnershipResolution {
  return {
    matchedScopes,
    ownerSystems: [...new Set(matchedScopes.map((scope) => scope.owner).filter(isString))].sort(),
    trace,
    warnings,
  };
}

function applyOwnershipMatches(
  matchedScopes: PreflightPacket["matchedScopes"],
  unresolved: Set<string>,
  matches: Array<{ path: string; owner: string; confidence: number }>,
): void {
  for (const match of matches) {
    const scope = matchedScopes.find((candidate) => candidate.path === match.path);

    if (scope) {
      scope.owner = match.owner;
      scope.confidence = match.confidence;
    }

    unresolved.delete(match.path);
  }
}

function isOwnershipGraphSlice(slice: GraphSliceLike): boolean {
  const artifactId = slice.header?.artifactId ?? "";
  const notes = slice.header?.provenance?.notes ?? [];

  return artifactId.includes("ownership")
    || notes.some((note) => note.includes("ownership"))
    || (slice.edges ?? []).some((edge) => edge.kind === "owns");
}

function confidenceForEdge(edge: NonNullable<GraphSliceLike["edges"]>[number]): number {
  const confidences = (edge.evidence ?? [])
    .map((evidence) => evidence.confidence)
    .filter((confidence): confidence is number => typeof confidence === "number");

  return confidences.length > 0 ? Math.max(...confidences) : 0.5;
}

function pathMatches(path: string, candidatePath: string): boolean {
  return path === candidatePath || path.startsWith(`${candidatePath}/`);
}

function checkedTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  sourceRef: ArtifactRef,
  message: string,
  paths: string[],
): ResolutionTraceEntry {
  return {
    step: "ownership.resolve",
    sourceType,
    sourceRef,
    status: "checked",
    message,
    paths,
  };
}

function usedTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  sourceRef: ArtifactRef,
  message: string,
  matches: Array<{ path: string; match: { owner: string; matchedPath: string; confidence: number } }>,
): ResolutionTraceEntry {
  const systems = [...new Set(matches.map(({ match }) => match.owner))].sort();
  const confidence = Math.max(...matches.map(({ match }) => match.confidence));

  return {
    step: "ownership.resolve",
    sourceType,
    sourceRef,
    status: "used",
    message,
    paths: matches.map(({ path }) => path),
    systems,
    confidence,
    details: {
      matches: matches.map(({ path, match }) => ({
        path,
        matchedPath: match.matchedPath,
        owner: match.owner,
        confidence: match.confidence,
      })),
    },
  };
}

function missingTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  message: string,
  paths: string[],
): ResolutionTraceEntry {
  return {
    step: "ownership.resolve",
    sourceType,
    status: "missing",
    message,
    paths,
  };
}

function fallbackTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  message: string,
  paths: string[],
): ResolutionTraceEntry {
  return {
    step: "ownership.resolve",
    sourceType,
    status: "fallback",
    message,
    paths,
  };
}

function skippedTrace(
  sourceType: ResolutionTraceEntry["sourceType"],
  message: string,
  paths: string[],
): ResolutionTraceEntry {
  return {
    step: "ownership.resolve",
    sourceType,
    status: "skipped",
    message,
    paths,
  };
}

async function readRelevantFindings(
  artifacts: { read(ref: ArtifactRef): Promise<unknown> },
  refs: ArtifactRef[],
  paths: string[],
): Promise<unknown[]> {
  const findings: unknown[] = [];

  for (const ref of refs) {
    const report = await artifacts.read(ref) as { findings?: unknown[] };

    for (const finding of report.findings ?? []) {
      if (!finding || typeof finding !== "object") {
        continue;
      }

      const files = (finding as { files?: unknown }).files;

      if (Array.isArray(files) && files.some((file) => typeof file === "string" && paths.includes(file))) {
        findings.push(finding);
      }
    }
  }

  return findings;
}

async function readMemorySelections(
  artifacts: { read(ref: ArtifactRef): Promise<unknown> },
  refs: ArtifactRef[],
  paths: string[],
  goal: string,
): Promise<PreflightPacket["applicableMemory"]> {
  const selections: NonNullable<PreflightPacket["applicableMemory"]> = [];

  for (const ref of refs) {
    const artifact = await artifacts.read(ref) as { selections?: unknown[] };

    for (const selection of artifact.selections ?? []) {
      if (!selection || typeof selection !== "object") {
        continue;
      }

      const candidate = selection as {
        instruction?: unknown;
        scope?: Record<string, unknown>;
        confidence?: unknown;
        reason?: unknown;
        path?: unknown;
        goal?: unknown;
      };
      const pathMatches = typeof candidate.path !== "string" || paths.some((path) => path.startsWith(candidate.path as string));
      const goalMatches = typeof candidate.goal !== "string" || goal.includes(candidate.goal);

      if (typeof candidate.instruction === "string" && pathMatches && goalMatches) {
        selections.push({
          instruction: candidate.instruction,
          scope: candidate.scope,
          confidence: typeof candidate.confidence === "number" ? candidate.confidence : 0.5,
          reason: typeof candidate.reason === "string" ? candidate.reason : "Selected from memory artifact.",
        });
      }
    }
  }

  return selections;
}

function buildFindingTrace(
  refs: ArtifactRef[],
  relevantFindings: unknown[],
  paths: string[],
): ResolutionTraceEntry[] {
  if (refs.length === 0) {
    return [{
      step: "findings.attach",
      sourceType: "FindingReport",
      status: "missing",
      message: "No FindingReport artifacts are indexed.",
      paths,
    }];
  }

  return [
    ...refs.map((ref): ResolutionTraceEntry => ({
      step: "findings.attach",
      sourceType: "FindingReport",
      sourceRef: ref,
      status: "checked",
      message: "Checked FindingReport for findings relevant to requested paths.",
      paths,
    })),
    {
      step: "findings.attach",
      sourceType: "FindingReport",
      status: relevantFindings.length > 0 ? "used" : "checked",
      message: relevantFindings.length > 0
        ? "Attached relevant findings to preflight packet."
        : "No relevant findings matched requested paths.",
      paths,
      details: {
        relevantFindingCount: relevantFindings.length,
      },
    },
  ];
}

function buildMemoryTrace(
  refs: ArtifactRef[],
  applicableMemory: NonNullable<PreflightPacket["applicableMemory"]>,
  paths: string[],
): ResolutionTraceEntry[] {
  if (refs.length === 0) {
    return [{
      step: "memory.select",
      sourceType: "MemorySelection",
      status: "missing",
      message: "No MemorySelection artifacts are indexed.",
      paths,
    }];
  }

  return [
    ...refs.map((ref): ResolutionTraceEntry => ({
      step: "memory.select",
      sourceType: "MemorySelection",
      sourceRef: ref,
      status: "checked",
      message: "Checked MemorySelection for applicable instructions.",
      paths,
    })),
    {
      step: "memory.select",
      sourceType: "MemorySelection",
      status: applicableMemory.length > 0 ? "used" : "checked",
      message: applicableMemory.length > 0
        ? "Attached applicable memory to preflight packet."
        : "No applicable memory matched requested paths and goal.",
      paths,
      confidence: applicableMemory.length > 0
        ? Math.max(...applicableMemory.map((memory) => memory.confidence))
        : undefined,
      details: {
        applicableMemoryCount: applicableMemory.length,
      },
    },
  ];
}

function buildFindingWarnings(refs: ArtifactRef[]): string[] {
  return refs.length === 0
    ? ["Relevant findings were unavailable because no FindingReport is indexed."]
    : [];
}

function computeRisk(
  paths: string[],
  ownerSystems: string[],
  matchedScopes: PreflightPacket["matchedScopes"],
  relevantFindings: unknown[],
): { risk: PreflightPacket["risk"]; trace: ResolutionTraceEntry[] } {
  const reasons: string[] = [];
  const trace: ResolutionTraceEntry[] = [];
  const unresolvedOwnership = matchedScopes.some((scope) => !scope.owner);
  const hasHighOrCriticalFinding = relevantFindings.some(isHighOrCriticalFinding);

  if (ownerSystems.length > 1) {
    const reason = "Requested paths span multiple owner systems.";
    reasons.push(reason);
    trace.push(riskTrace("high", "multiple_owner_systems", reason, paths, ownerSystems));
  }

  if (paths.some((path) => /(^|\/)(security|auth|runtime|kernel|src\/index)/i.test(path))) {
    const reason = "Requested paths include protected or high-leverage areas.";
    reasons.push(reason);
    trace.push(riskTrace("high", "protected_path", reason, paths, ownerSystems));
  }

  if (hasHighOrCriticalFinding) {
    const reason = "Relevant high or critical findings are already attached to the requested paths.";
    reasons.push(reason);
    trace.push(riskTrace("high", "high_or_critical_finding", reason, paths, ownerSystems));
  }

  if (reasons.length === 0 && unresolvedOwnership) {
    const reason = "No owner system could be resolved for at least one requested path.";
    reasons.push(reason);
    trace.push(riskTrace("medium", "unresolved_ownership", reason, paths, ownerSystems));
  }

  if (reasons.length === 0 && relevantFindings.length > 0) {
    const reason = "Relevant findings are already attached to the requested paths.";
    reasons.push(reason);
    trace.push(riskTrace("medium", "relevant_findings", reason, paths, ownerSystems));
  }

  if (reasons.length === 0 && paths.length > 1) {
    const reason = "Multiple paths were requested.";
    reasons.push(reason);
    trace.push(riskTrace("medium", "multiple_paths", reason, paths, ownerSystems));
  }

  if (reasons.length === 0) {
    trace.push(riskTrace("low", "single_owner_no_findings", "Risk set to low because ownership is resolved, scope is narrow, and no relevant findings are attached.", paths, ownerSystems));
  }

  const tier = trace.some((entry) => entry.details?.tier === "high")
    ? "high"
    : trace.some((entry) => entry.details?.tier === "medium")
      ? "medium"
      : "low";

  return {
    risk: {
      tier,
      reasons,
    },
    trace,
  };
}

function riskTrace(
  tier: "low" | "medium" | "high",
  rule: string,
  message: string,
  paths: string[],
  ownerSystems: string[],
): ResolutionTraceEntry {
  return {
    step: "risk.evaluate",
    sourceType: "RiskRule",
    status: "used",
    message: tier === "low" ? message : `Risk set to ${tier} because ${message.charAt(0).toLowerCase()}${message.slice(1)}`,
    paths,
    systems: ownerSystems,
    details: {
      rule,
      tier,
    },
  };
}

function isHighOrCriticalFinding(finding: unknown): boolean {
  if (!finding || typeof finding !== "object") {
    return false;
  }

  const severity = (finding as { severity?: unknown }).severity;

  return severity === "high" || severity === "critical";
}

function buildRecommendedContext(paths: string[], ownerSystems: string[]): string[] {
  return [
    ...paths.map((path) => `Source path: ${path}`),
    ...ownerSystems.map((system) => `Owner system: ${system}`),
  ];
}

function buildWarnings(paths: string[], ownerSystems: string[]): string[] {
  const warnings: string[] = [];

  if (paths.length > 1) {
    warnings.push("Multiple paths were requested; keep the change boundary explicit.");
  }

  return warnings;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import { posix } from "node:path";
import {
  BUILT_IN_EDGE_KINDS,
  BUILT_IN_NODE_KINDS,
  createGraphSlice,
  type GraphEdge,
  type GraphNode,
} from "@rekon/kernel-graph";
import type { RuntimeGraphObservationReport } from "@rekon/kernel-repo-model";
import { type Projector, defineCapability } from "@rekon/sdk";

type EvidenceGraphLike = {
  header: ArtifactHeader;
  facts: Array<{
    kind: string;
    subject: string;
    value?: Record<string, unknown>;
    confidence: number;
    provenance?: {
      source?: string;
      extractorVersion?: string;
    };
  }>;
};

export const graphProjector: Projector = {
  id: "@rekon/capability-graph.projector",
  produces: ["GraphSlice"],
  async project({ artifacts }) {
    const evidenceRef = await latestEvidenceRef(artifacts);

    if (!evidenceRef) {
      throw new Error("@rekon/capability-graph requires an EvidenceGraph artifact.");
    }

    const graph = await artifacts.read(evidenceRef) as EvidenceGraphLike;
    const runtimeObservationRef = await latestRef(artifacts, "RuntimeGraphObservationReport");
    const runtimeObservation = runtimeObservationRef
      ? await artifacts.read(runtimeObservationRef) as RuntimeGraphObservationReport
      : undefined;
    const computedAt = new Date().toISOString();
    const refs: ArtifactRef[] = [];
    const repositoryFiles = new Set(
      graph.facts
        .filter((fact) => fact.kind === "file")
        .map((fact) => typeof fact.value?.path === "string" ? fact.value.path : fact.subject),
    );
    const importLinks = resolvedImportLinks(graph.facts, repositoryFiles);

    refs.push(await artifacts.write("GraphSlice", createGraphSlice({
      header: createHeader("import-graph", graph.header, evidenceRef),
      producer: "@rekon/capability-graph",
      sliceType: "import-graph",
      nodes: [...repositoryFiles].sort().map((id) => ({ id, kind: BUILT_IN_NODE_KINDS.file })),
      edges: importLinks.map((link) => ({
          source: link.source,
          target: link.target,
          kind: BUILT_IN_EDGE_KINDS.imports,
          metadata: {
            resolved: true,
            ...(typeof link.fact.value?.importKind === "string" ? { importKind: link.fact.value.importKind } : {}),
            ...(typeof link.fact.value?.typeOnly === "boolean" ? { typeOnly: link.fact.value.typeOnly } : {}),
          },
          evidence: [edgeEvidence(link.fact, computedAt)],
        })),
    })));

    refs.push(await artifacts.write("GraphSlice", createGraphSlice({
      header: createHeader("symbol-graph", graph.header, evidenceRef),
      producer: "@rekon/capability-graph",
      sliceType: "symbol-graph",
      nodes: graph.facts
        .filter((fact) => fact.kind === "symbol" || fact.kind === "export")
        .map((fact) => ({
          id: `${fact.subject}:${String(fact.value?.name ?? fact.value?.symbol ?? "unknown")}`,
          kind: BUILT_IN_NODE_KINDS.symbol,
          metadata: fact.value,
        })),
      edges: graph.facts
        .filter((fact) => fact.kind === "export")
        .map((fact) => ({
          source: fact.subject,
          target: `${fact.subject}:${String(fact.value?.name ?? fact.value?.symbol ?? "unknown")}`,
          kind: BUILT_IN_EDGE_KINDS.exports,
          evidence: [edgeEvidence(fact, computedAt)],
        })),
    })));

    refs.push(await artifacts.write("GraphSlice", createGraphSlice({
      header: createHeader("ownership-graph", graph.header, evidenceRef),
      producer: "@rekon/capability-graph",
      sliceType: "ownership-graph",
      nodes: graph.facts
        .filter((fact) => fact.kind === "ownership_hint")
        .flatMap((fact) => [
          { id: String(fact.value?.system ?? ownerFromPath(fact.subject)), kind: BUILT_IN_NODE_KINDS.system },
          { id: String(fact.value?.path ?? fact.subject), kind: BUILT_IN_NODE_KINDS.file },
        ]),
      edges: graph.facts
        .filter((fact) => fact.kind === "ownership_hint")
        .map((fact) => ({
          source: String(fact.value?.system ?? ownerFromPath(fact.subject)),
          target: String(fact.value?.path ?? fact.subject),
          kind: BUILT_IN_EDGE_KINDS.owns,
          evidence: [edgeEvidence(fact, computedAt)],
      })),
    })));

    const packageIds = new Map(
      graph.facts
        .filter((fact) => fact.kind === "manifest" && typeof fact.value?.path === "string")
        .map((fact) => [
          String(fact.value?.path),
          `package:${typeof fact.value?.name === "string" ? fact.value.name : fact.value?.path}`,
        ]),
    );
    const applicationFacts = graph.facts.filter((fact) => (
      fact.kind === "route"
      || fact.kind === "screen"
      || fact.kind === "test"
      || fact.kind === "manifest"
      || fact.kind === "build_target"
    ));
    const testContext = testContextProjection(graph.facts, computedAt);
    const runtimeContext = runtimeObservation && runtimeObservationRef
      ? runtimeExecutionProjection(runtimeObservation, runtimeObservationRef, applicationFacts, computedAt)
      : { nodes: [], edges: [] };
    refs.push(await artifacts.write("GraphSlice", createGraphSlice({
      header: createHeader(
        "application-graph",
        graph.header,
        evidenceRef,
        runtimeObservationRef ? [runtimeObservationRef] : [],
      ),
      producer: "@rekon/capability-graph",
      sliceType: "application-graph",
      nodes: [
        ...applicationFacts.flatMap((fact) => applicationNodes(fact, packageIds)),
        ...testContext.nodes,
        ...runtimeContext.nodes,
      ],
      edges: [
        ...applicationFacts.flatMap((fact) => applicationEdges(fact, packageIds, computedAt)),
        ...testContext.edges,
        ...runtimeContext.edges,
      ],
    })));

    const callProjection = callGraphProjection(graph.facts, computedAt);
    refs.push(await artifacts.write("GraphSlice", createGraphSlice({
      header: createHeader("call-graph", graph.header, evidenceRef),
      producer: "@rekon/capability-graph",
      sliceType: "call-graph",
      nodes: callProjection.nodes,
      edges: callProjection.edges,
    })));

    const reachabilityProjection = entryPointReachabilityProjection(graph.facts, importLinks, computedAt);
    refs.push(await artifacts.write("GraphSlice", createGraphSlice({
      header: createHeader("reachability-graph", graph.header, evidenceRef),
      producer: "@rekon/capability-graph",
      sliceType: "reachability-graph",
      nodes: reachabilityProjection.nodes,
      edges: reachabilityProjection.edges,
    })));

    const behaviorProjection = behaviorGraphProjection(graph.facts, computedAt);
    refs.push(await artifacts.write("GraphSlice", createGraphSlice({
      header: createHeader("behavior-graph", graph.header, evidenceRef),
      producer: "@rekon/capability-graph",
      sliceType: "behavior-graph",
      nodes: behaviorProjection.nodes,
      edges: behaviorProjection.edges,
    })));

    return refs;
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-graph",
    name: "Graph Projection",
    version: "0.1.0",
    roles: ["projector"],
    consumes: ["EvidenceGraph", "RuntimeGraphObservationReport"],
    produces: ["GraphSlice"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "evidence.changed",
        description: "Graph slices are invalid when their evidence graph changes.",
        inputs: ["EvidenceGraph"],
      },
      {
        id: "runtime-observation.changed",
        description: "The application graph is invalid when observed execution relationships change.",
        inputs: ["RuntimeGraphObservationReport"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.projector(graphProjector);
  },
});

function createHeader(
  sliceId: string,
  evidenceHeader: ArtifactHeader,
  evidenceRef: ArtifactRef,
  additionalInputRefs: ArtifactRef[] = [],
): ArtifactHeader {
  return {
    artifactType: "GraphSlice",
    artifactId: `${sliceId}-${Date.now()}`,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: evidenceHeader.subject,
    producer: {
      id: "@rekon/capability-graph",
      version: "0.1.0",
    },
    inputRefs: [evidenceRef, ...additionalInputRefs],
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 0.8,
      notes: [sliceId],
    },
  };
}

async function latestEvidenceRef(artifacts: { list(type?: string): Promise<ArtifactRef[]> }): Promise<ArtifactRef | undefined> {
  return latestRef(artifacts, "EvidenceGraph");
}

async function latestRef(
  artifacts: { list(type?: string): Promise<ArtifactRef[]> },
  type: string,
): Promise<ArtifactRef | undefined> {
  return (await artifacts.list(type)).sort((left, right) => right.id.localeCompare(left.id))[0];
}

function edgeEvidence(
  fact: EvidenceGraphLike["facts"][number],
  computedAt: string,
) {
  return {
    source: fact.provenance?.source ?? "@rekon/capability-graph",
    extractorVersion: fact.provenance?.extractorVersion ?? "0.1.0",
    computedAt,
    confidence: fact.confidence,
  };
}

function ownerFromPath(path: string): string {
  return path.split("/")[0] || "root";
}

function applicationNodes(
  fact: EvidenceGraphLike["facts"][number],
  packageIds: ReadonlyMap<string, string>,
): GraphNode[] {
  const path = typeof fact.value?.path === "string" ? fact.value.path : fact.subject;
  if (fact.kind === "manifest") {
    return [{ id: packageIds.get(path) ?? `package:${path}`, kind: BUILT_IN_NODE_KINDS.package, metadata: fact.value }];
  }
  if (fact.kind === "build_target") {
    return [{
      id: buildTargetId(path, String(fact.value?.name ?? "unknown")),
      kind: BUILT_IN_NODE_KINDS.buildTarget,
      metadata: fact.value,
    }];
  }
  const nodeKind = fact.kind === "route"
    ? BUILT_IN_NODE_KINDS.route
    : fact.kind === "screen"
      ? BUILT_IN_NODE_KINDS.screen
      : BUILT_IN_NODE_KINDS.test;
  return [
    { id: path, kind: BUILT_IN_NODE_KINDS.file },
    { id: applicationNodeId(fact.kind, fact.value), kind: nodeKind, metadata: fact.value },
  ];
}

function applicationEdges(
  fact: EvidenceGraphLike["facts"][number],
  packageIds: ReadonlyMap<string, string>,
  computedAt: string,
): GraphEdge[] {
  const path = typeof fact.value?.path === "string" ? fact.value.path : fact.subject;
  if (fact.kind === "manifest") return [];
  if (fact.kind === "build_target") {
    return [{
      source: packageIds.get(path) ?? `package:${path}`,
      target: buildTargetId(path, String(fact.value?.name ?? "unknown")),
      kind: BUILT_IN_EDGE_KINDS.contains,
      evidence: [edgeEvidence(fact, computedAt)],
    }];
  }
  return [{
    source: path,
    target: applicationNodeId(fact.kind, fact.value),
    kind: BUILT_IN_EDGE_KINDS.contains,
    evidence: [edgeEvidence(fact, computedAt)],
  }];
}

function applicationNodeId(kind: string, value: Record<string, unknown> | undefined): string {
  const path = String(value?.path ?? "unknown");
  if (kind === "test") return `test:${path}`;
  return `${kind}:${String(value?.framework ?? "unknown")}:${String(value?.routePath ?? path)}`;
}

function buildTargetId(path: string, name: string): string {
  return `build_target:${path}#${name}`;
}

type ImportLink = {
  source: string;
  target: string;
  fact: EvidenceGraphLike["facts"][number];
};

type ReachabilityRecord = {
  distance: number;
  facts: EvidenceGraphLike["facts"];
};

function testContextProjection(
  facts: EvidenceGraphLike["facts"],
  computedAt: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const filePaths = new Set(
    facts
      .filter((fact) => fact.kind === "file")
      .map((fact) => typeof fact.value?.path === "string" ? fact.value.path : fact.subject),
  );
  const links = resolvedImportLinks(facts, filePaths);
  const adjacency = importAdjacency(links);
  const testFacts = facts.filter((fact) => fact.kind === "test" && typeof fact.value?.path === "string");
  const entryFacts = facts.filter((fact) =>
    (fact.kind === "route" || fact.kind === "screen")
    && typeof fact.value?.path === "string",
  );
  const capabilityFacts = facts.filter((fact) =>
    fact.kind === "capability_hint"
    && typeof fact.value?.path === "string"
    && typeof fact.value?.capability === "string",
  );
  const entryReachability = new Map(
    entryFacts.map((fact) => {
      const path = String(fact.value?.path);
      return [path, reachableImports(path, adjacency)] as const;
    }),
  );
  const entriesByDependency = new Map<string, EvidenceGraphLike["facts"]>();
  for (const entryFact of entryFacts) {
    const entryPath = String(entryFact.value?.path);
    addEntryDependency(entriesByDependency, entryPath, entryFact);
    for (const dependencyPath of entryReachability.get(entryPath)?.keys() ?? []) {
      addEntryDependency(entriesByDependency, dependencyPath, entryFact);
    }
  }
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const testFact of testFacts) {
    const testPath = String(testFact.value?.path);
    const testNodeId = applicationNodeId("test", testFact.value);
    const reachable = reachableImports(testPath, adjacency);
    nodes.push({ id: testNodeId, kind: BUILT_IN_NODE_KINDS.test, metadata: testFact.value });

    for (const [target, record] of reachable) {
      nodes.push({ id: target, kind: BUILT_IN_NODE_KINDS.file });
      edges.push({
        source: testNodeId,
        target,
        kind: BUILT_IN_EDGE_KINDS.dependsOn,
        weight: confidenceForFacts(record.facts),
        metadata: {
          relationship: "test-import",
          distance: record.distance,
        },
        evidence: graphEvidence(record.facts, computedAt),
      });
    }

    const relatedEntries = new Map<string, { fact: EvidenceGraphLike["facts"][number]; sharedFiles: Set<string> }>();
    for (const dependencyPath of reachable.keys()) {
      for (const entryFact of entriesByDependency.get(dependencyPath) ?? []) {
        const entryPath = String(entryFact.value?.path);
        const relation = relatedEntries.get(entryPath) ?? { fact: entryFact, sharedFiles: new Set<string>() };
        relation.sharedFiles.add(dependencyPath);
        relatedEntries.set(entryPath, relation);
      }
    }
    for (const { fact: entryFact, sharedFiles: sharedSet } of relatedEntries.values()) {
      const entryPath = String(entryFact.value?.path);
      const direct = reachable.get(entryPath);
      const entryReachable = entryReachability.get(entryPath) ?? new Map<string, ReachabilityRecord>();
      const sharedFiles = direct
        ? [entryPath]
        : [...sharedSet].sort();
      if (sharedFiles.length === 0) continue;
      const relationship = direct ? "imports-entrypoint" : "shared-dependency";
      const relationFacts = sharedFiles.flatMap((path) => [
        ...(reachable.get(path)?.facts ?? []),
        ...(entryReachable.get(path)?.facts ?? []),
      ]);
      const entryNodeId = applicationNodeId(entryFact.kind, entryFact.value);
      nodes.push({
        id: entryNodeId,
        kind: entryFact.kind === "route" ? BUILT_IN_NODE_KINDS.route : BUILT_IN_NODE_KINDS.screen,
        metadata: entryFact.value,
      });
      edges.push({
        source: testNodeId,
        target: entryNodeId,
        kind: BUILT_IN_EDGE_KINDS.relatedTo,
        weight: direct ? 0.95 : 0.7,
        metadata: {
          relationship,
          sharedFiles: sharedFiles.slice(0, 20),
        },
        evidence: graphEvidence(uniqueFacts([...relationFacts, entryFact]), computedAt),
      });
    }

    const capabilities = new Map<string, { paths: string[]; facts: EvidenceGraphLike["facts"] }>();
    for (const capabilityFact of capabilityFacts) {
      const path = String(capabilityFact.value?.path);
      const record = reachable.get(path);
      if (!record) continue;
      const capability = String(capabilityFact.value?.capability);
      const group = capabilities.get(capability) ?? { paths: [], facts: [] };
      group.paths.push(path);
      group.facts.push(...record.facts, capabilityFact);
      capabilities.set(capability, group);
    }
    for (const [capability, group] of capabilities) {
      const capabilityNodeId = `capability:${capability}`;
      const sourcePaths = [...new Set(group.paths)].sort();
      nodes.push({
        id: capabilityNodeId,
        kind: BUILT_IN_NODE_KINDS.capability,
        metadata: { capability, sourcePaths },
      });
      edges.push({
        source: testNodeId,
        target: capabilityNodeId,
        kind: BUILT_IN_EDGE_KINDS.relatedTo,
        weight: 0.8,
        metadata: {
          relationship: "imported-capability-subject",
          sourcePaths,
        },
        evidence: graphEvidence(uniqueFacts(group.facts), computedAt),
      });
    }
  }

  return { nodes, edges };
}

function runtimeExecutionProjection(
  report: RuntimeGraphObservationReport,
  reportRef: ArtifactRef,
  applicationFacts: EvidenceGraphLike["facts"],
  computedAt: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const reportNodes = new Map(report.nodes.map((node) => [node.id, node]));
  const entryNodesByRoute = new Map<string, GraphNode[]>();
  for (const fact of applicationFacts) {
    if (fact.kind !== "route" && fact.kind !== "screen") continue;
    if (typeof fact.value?.routePath !== "string") continue;
    const routePath = fact.value.routePath;
    const entries = entryNodesByRoute.get(routePath) ?? [];
    entries.push({
      id: applicationNodeId(fact.kind, fact.value),
      kind: fact.kind === "route" ? BUILT_IN_NODE_KINDS.route : BUILT_IN_NODE_KINDS.screen,
      metadata: fact.value,
    });
    entryNodesByRoute.set(routePath, entries);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const observation of report.edges) {
    if (observation.kind !== "observed-execution") continue;
    const sourceNode = reportNodes.get(observation.fromNodeId);
    const targetNode = reportNodes.get(observation.toNodeId);
    if (sourceNode?.kind !== "test" || !targetNode) continue;

    const testNodeId = `test:${sourceNode.label}`;
    nodes.push({
      id: testNodeId,
      kind: BUILT_IN_NODE_KINDS.test,
      metadata: { path: sourceNode.label, observation: "runtime" },
    });

    const targets: GraphNode[] = [];
    if (targetNode.kind === "file") {
      targets.push({
        id: targetNode.label,
        kind: BUILT_IN_NODE_KINDS.file,
        metadata: { path: targetNode.label, observation: "runtime" },
      });
    } else if (targetNode.kind === "route") {
      targets.push(...(entryNodesByRoute.get(targetNode.label) ?? [{
        id: `route:runtime:${targetNode.label}`,
        kind: BUILT_IN_NODE_KINDS.route,
        metadata: { routePath: targetNode.label, observation: "runtime" },
      }]));
    }

    for (const target of targets) {
      nodes.push(target);
      edges.push({
        source: testNodeId,
        target: target.id,
        kind: BUILT_IN_EDGE_KINDS.observed,
        weight: observedExecutionConfidence(report, observation.observedCount),
        metadata: {
          relationship: "observed-execution",
          observedCount: observation.observedCount,
          observationNodeId: targetNode.id,
          ...(observation.firstObservedAt ? { firstObservedAt: observation.firstObservedAt } : {}),
          ...(observation.lastObservedAt ? { lastObservedAt: observation.lastObservedAt } : {}),
        },
        evidence: [{
          source: report.header.producer.id,
          extractorVersion: report.header.producer.version,
          computedAt,
          confidence: observedExecutionConfidence(report, observation.observedCount),
          payloadRef: `${reportRef.type}:${reportRef.id}`,
        }],
      });
    }
  }
  return { nodes, edges };
}

function callGraphProjection(
  facts: EvidenceGraphLike["facts"],
  computedAt: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const fact of facts) {
    if (fact.kind !== "call") continue;
    const sourceFile = stringField(fact.value, "source");
    const caller = stringField(fact.value, "caller");
    const targetFile = stringField(fact.value, "targetFile");
    const targetSymbol = stringField(fact.value, "targetSymbol");
    if (!sourceFile || !caller || !targetFile || !targetSymbol) continue;
    const sourceId = callableId(sourceFile, caller);
    const targetId = callableId(targetFile, targetSymbol);
    nodes.push({ id: sourceId, kind: BUILT_IN_NODE_KINDS.callable, metadata: { path: sourceFile, symbol: caller, moduleScope: caller === "__module__" } });
    nodes.push({ id: targetId, kind: BUILT_IN_NODE_KINDS.callable, metadata: { path: targetFile, symbol: targetSymbol } });
    edges.push({
      source: sourceId,
      target: targetId,
      kind: BUILT_IN_EDGE_KINDS.calls,
      weight: fact.confidence,
      metadata: {
        resolution: stringField(fact.value, "resolution") ?? "resolved",
        callKind: stringField(fact.value, "callKind") ?? "call",
        sourceFile,
        targetFile,
      },
      evidence: [edgeEvidence(fact, computedAt)],
    });
  }
  return { nodes, edges };
}

function entryPointReachabilityProjection(
  facts: EvidenceGraphLike["facts"],
  importLinks: ImportLink[],
  computedAt: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const adjacency = importAdjacency(importLinks);
  for (const fact of facts) {
    if (fact.kind !== "entry_point") continue;
    const path = stringField(fact.value, "path");
    const entryKind = stringField(fact.value, "entryKind");
    if (!path || !entryKind) continue;
    const entryId = `entry:${entryKind}:${path}`;
    nodes.push({ id: entryId, kind: BUILT_IN_NODE_KINDS.entryPoint, metadata: fact.value });
    nodes.push({ id: path, kind: BUILT_IN_NODE_KINDS.file, metadata: { path } });
    edges.push({
      source: entryId,
      target: path,
      kind: BUILT_IN_EDGE_KINDS.enters,
      weight: fact.confidence,
      metadata: { entryKind },
      evidence: [edgeEvidence(fact, computedAt)],
    });
    for (const [target, record] of reachableImports(path, adjacency, 12)) {
      nodes.push({ id: target, kind: BUILT_IN_NODE_KINDS.file, metadata: { path: target } });
      edges.push({
        source: entryId,
        target,
        kind: BUILT_IN_EDGE_KINDS.reaches,
        weight: confidenceForFacts(record.facts),
        metadata: { entryKind, distance: record.distance, relationship: "resolved-import" },
        evidence: graphEvidence([fact, ...record.facts], computedAt),
      });
    }
    const handlers = Array.isArray(fact.value?.handlers)
      ? fact.value.handlers.filter((handler): handler is string => typeof handler === "string" && handler.length > 0)
      : [];
    for (const handler of handlers) {
      const handlerId = callableId(path, handler);
      nodes.push({ id: handlerId, kind: BUILT_IN_NODE_KINDS.callable, metadata: { path, symbol: handler } });
      edges.push({
        source: entryId,
        target: handlerId,
        kind: BUILT_IN_EDGE_KINDS.handles,
        weight: fact.confidence,
        metadata: { entryKind, handler },
        evidence: [edgeEvidence(fact, computedAt)],
      });
    }
  }
  return { nodes, edges };
}

function callableId(path: string, symbol: string): string {
  return `callable:${path}#${symbol}`;
}

function behaviorGraphProjection(
  facts: EvidenceGraphLike["facts"],
  computedAt: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const fact of facts) {
    const source = stringField(fact.value, "source");
    const caller = stringField(fact.value, "caller");
    if (!source || !caller) continue;
    const sourceId = callableId(source, caller);
    nodes.push({ id: sourceId, kind: BUILT_IN_NODE_KINDS.callable, metadata: { path: source, symbol: caller } });
    if (fact.kind === "event_flow") {
      const eventName = stringField(fact.value, "eventName");
      const action = stringField(fact.value, "action");
      if (!eventName || (action !== "emit" && action !== "subscribe")) continue;
      const eventId = `event:${eventName}`;
      nodes.push({ id: eventId, kind: BUILT_IN_NODE_KINDS.event, metadata: { eventName } });
      edges.push({
        source: sourceId,
        target: eventId,
        kind: action === "emit" ? BUILT_IN_EDGE_KINDS.emits : BUILT_IN_EDGE_KINDS.subscribes,
        weight: fact.confidence,
        metadata: { receiver: stringField(fact.value, "receiver") ?? "unknown" },
        evidence: [edgeEvidence(fact, computedAt)],
      });
    } else if (fact.kind === "state_access") {
      const packageName = stringField(fact.value, "package");
      const operation = stringField(fact.value, "operation");
      if (!packageName || !operation) continue;
      const stateId = `state:${packageName}`;
      nodes.push({ id: stateId, kind: BUILT_IN_NODE_KINDS.stateResource, metadata: { package: packageName } });
      edges.push({
        source: sourceId,
        target: stateId,
        kind: BUILT_IN_EDGE_KINDS.accesses,
        weight: fact.confidence,
        metadata: { operation, binding: stringField(fact.value, "binding") ?? "unknown" },
        evidence: [edgeEvidence(fact, computedAt)],
      });
    } else if (fact.kind === "error_flow") {
      const action = stringField(fact.value, "action");
      if (action !== "throw" && action !== "rethrow") continue;
      const errorId = `error:${source}#${caller}:${action}`;
      nodes.push({ id: errorId, kind: "error", metadata: { action, errorName: stringField(fact.value, "errorName") ?? "unknown" } });
      edges.push({
        source: sourceId,
        target: errorId,
        kind: BUILT_IN_EDGE_KINDS.propagatesError,
        weight: fact.confidence,
        metadata: { action, explicit: true },
        evidence: [edgeEvidence(fact, computedAt)],
      });
    }
  }
  return { nodes, edges };
}

function stringField(value: Record<string, unknown> | undefined, field: string): string | undefined {
  const result = value?.[field];
  return typeof result === "string" && result.length > 0 ? result : undefined;
}

function observedExecutionConfidence(
  report: RuntimeGraphObservationReport,
  observedCount: number,
): number {
  const reported = report.header.provenance?.confidence;
  const base = typeof reported === "number" ? reported : 0.85;
  return Math.min(1, base + Math.min(Math.max(observedCount - 1, 0), 5) * 0.02);
}

function addEntryDependency(
  index: Map<string, EvidenceGraphLike["facts"]>,
  dependencyPath: string,
  entryFact: EvidenceGraphLike["facts"][number],
): void {
  const entries = index.get(dependencyPath) ?? [];
  entries.push(entryFact);
  index.set(dependencyPath, entries);
}

function resolvedImportLinks(
  facts: EvidenceGraphLike["facts"],
  filePaths: ReadonlySet<string>,
): ImportLink[] {
  const byKey = new Map<string, ImportLink>();
  for (const fact of facts) {
    if (fact.kind !== "import" && fact.kind !== "import_specifier") continue;
    const source = typeof fact.value?.source === "string" ? fact.value.source : undefined;
    const rawTarget = typeof fact.value?.resolvedTarget === "string"
      ? fact.value.resolvedTarget
      : typeof fact.value?.target === "string"
        ? fact.value.target
        : undefined;
    if (!source || !rawTarget) continue;
    const target = resolveImportTarget(source, rawTarget, filePaths);
    if (!target || target === source) continue;
    const key = `${source}:${target}`;
    if (!byKey.has(key) || fact.confidence > (byKey.get(key)?.fact.confidence ?? 0)) {
      byKey.set(key, { source, target, fact });
    }
  }
  return [...byKey.values()].sort((left, right) => `${left.source}:${left.target}`.localeCompare(`${right.source}:${right.target}`));
}

function resolveImportTarget(
  source: string,
  rawTarget: string,
  filePaths: ReadonlySet<string>,
): string | undefined {
  if (filePaths.has(rawTarget)) return rawTarget;
  if (!rawTarget.startsWith(".")) return undefined;
  const base = posix.normalize(posix.join(posix.dirname(source), rawTarget));
  const withoutJs = base.replace(/\.(?:mjs|cjs|js|jsx)$/, "");
  const candidates = [
    base,
    withoutJs,
    ...[".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"].map((extension) => `${withoutJs}${extension}`),
    ...[".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"].map((extension) => `${withoutJs}/index${extension}`),
  ];
  return candidates.find((candidate) => filePaths.has(candidate));
}

function importAdjacency(links: ImportLink[]): Map<string, ImportLink[]> {
  const adjacency = new Map<string, ImportLink[]>();
  for (const link of links) {
    const outgoing = adjacency.get(link.source) ?? [];
    outgoing.push(link);
    adjacency.set(link.source, outgoing);
  }
  for (const outgoing of adjacency.values()) {
    outgoing.sort((left, right) => left.target.localeCompare(right.target));
  }
  return adjacency;
}

function reachableImports(
  start: string,
  adjacency: ReadonlyMap<string, ImportLink[]>,
  maxDepth = 6,
): Map<string, ReachabilityRecord> {
  const reached = new Map<string, ReachabilityRecord>();
  const distances = new Map<string, number>([[start, 0]]);
  const queue: Array<{ path: string; distance: number; facts: EvidenceGraphLike["facts"] }> = [
    { path: start, distance: 0, facts: [] },
  ];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    if (current.distance >= maxDepth) continue;
    for (const link of adjacency.get(current.path) ?? []) {
      const distance = current.distance + 1;
      const existingDistance = distances.get(link.target);
      if (existingDistance !== undefined && existingDistance <= distance) continue;
      const record = { distance, facts: [...current.facts, link.fact] };
      distances.set(link.target, distance);
      reached.set(link.target, record);
      queue.push({ path: link.target, ...record });
    }
  }
  return reached;
}

function graphEvidence(
  facts: EvidenceGraphLike["facts"],
  computedAt: string,
): ReturnType<typeof edgeEvidence>[] {
  return uniqueFacts(facts).map((fact) => edgeEvidence(fact, computedAt));
}

function uniqueFacts(facts: EvidenceGraphLike["facts"]): EvidenceGraphLike["facts"] {
  const byKey = new Map<string, EvidenceGraphLike["facts"][number]>();
  for (const fact of facts) {
    byKey.set(`${fact.kind}:${fact.subject}:${JSON.stringify(fact.value ?? {})}`, fact);
  }
  return [...byKey.values()];
}

function confidenceForFacts(facts: EvidenceGraphLike["facts"]): number {
  return facts.length === 0 ? 0.5 : Math.min(...facts.map((fact) => fact.confidence));
}

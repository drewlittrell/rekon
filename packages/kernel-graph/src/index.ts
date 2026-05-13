import { type ArtifactHeader, assertArtifactHeader } from "@rekon/kernel-artifacts";

export const BUILT_IN_NODE_KINDS = {
  file: "file",
  symbol: "symbol",
  system: "system",
  package: "package",
} as const;

export const BUILT_IN_EDGE_KINDS = {
  imports: "imports",
  exports: "exports",
  owns: "owns",
  contains: "contains",
} as const;

export type GraphNode = {
  id: string;
  kind: string;
  labels?: string[];
  metadata?: Record<string, unknown>;
};

export type EdgeEvidence = {
  source: string;
  extractorVersion: string;
  computedAt: string;
  confidence: number;
  payloadRef?: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  kind: string;
  weight?: number;
  metadata?: Record<string, unknown>;
  evidence: EdgeEvidence[];
};

export type GraphSlice = {
  header: ArtifactHeader;
  producer: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export function createGraphSlice(input: GraphSlice): GraphSlice {
  assertGraphSlice(input);

  return {
    ...input,
    nodes: dedupeNodes(input.nodes),
    edges: dedupeEdges(input.edges),
  };
}

export function composeGraphSlices(input: {
  header: ArtifactHeader;
  producer: string;
  slices: GraphSlice[];
}): GraphSlice {
  return createGraphSlice({
    header: input.header,
    producer: input.producer,
    nodes: input.slices.flatMap((slice) => slice.nodes),
    edges: input.slices.flatMap((slice) => slice.edges),
  });
}

export function assertGraphSlice(value: unknown): asserts value is GraphSlice {
  if (!value || typeof value !== "object") {
    throw new TypeError("GraphSlice must be an object.");
  }

  const slice = value as Partial<GraphSlice>;
  if (!slice.header) {
    throw new TypeError("GraphSlice header is required.");
  }

  assertArtifactHeader(slice.header);

  if (slice.header.artifactType !== "GraphSlice") {
    throw new TypeError("GraphSlice header artifactType must be GraphSlice.");
  }

  if (typeof slice.producer !== "string" || slice.producer.length === 0) {
    throw new TypeError("GraphSlice producer is required.");
  }

  if (!Array.isArray(slice.nodes)) {
    throw new TypeError("GraphSlice nodes must be an array.");
  }

  if (!Array.isArray(slice.edges)) {
    throw new TypeError("GraphSlice edges must be an array.");
  }

  for (const node of slice.nodes) {
    assertGraphNode(node);
  }

  for (const edge of slice.edges) {
    assertGraphEdge(edge);
  }
}

export function validateGraphSlice(value: unknown): { ok: true; value: GraphSlice } | { ok: false; issues: string[] } {
  try {
    assertGraphSlice(value);
    return { ok: true, value: value as GraphSlice };
  } catch (error) {
    return {
      ok: false,
      issues: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function assertGraphNode(value: unknown): asserts value is GraphNode {
  if (!value || typeof value !== "object") {
    throw new TypeError("GraphNode must be an object.");
  }

  const node = value as Partial<GraphNode>;

  if (typeof node.id !== "string" || node.id.length === 0) {
    throw new TypeError("GraphNode id is required.");
  }

  if (typeof node.kind !== "string" || node.kind.length === 0) {
    throw new TypeError("GraphNode kind is required.");
  }
}

function assertGraphEdge(value: unknown): asserts value is GraphEdge {
  if (!value || typeof value !== "object") {
    throw new TypeError("GraphEdge must be an object.");
  }

  const edge = value as Partial<GraphEdge>;

  if (typeof edge.source !== "string" || edge.source.length === 0) {
    throw new TypeError("GraphEdge source is required.");
  }

  if (typeof edge.target !== "string" || edge.target.length === 0) {
    throw new TypeError("GraphEdge target is required.");
  }

  if (typeof edge.kind !== "string" || edge.kind.length === 0) {
    throw new TypeError("GraphEdge kind is required.");
  }

  if (!Array.isArray(edge.evidence) || edge.evidence.length === 0) {
    throw new TypeError("GraphEdge evidence is required.");
  }

  for (const evidence of edge.evidence) {
    if (evidence.confidence < 0 || evidence.confidence > 1) {
      throw new TypeError("GraphEdge evidence confidence must be between 0 and 1.");
    }
  }
}

function dedupeNodes(nodes: GraphNode[]): GraphNode[] {
  return [...new Map(nodes.map((node) => [node.id, node])).values()]
    .sort((left, right) => left.id.localeCompare(right.id));
}

function dedupeEdges(edges: GraphEdge[]): GraphEdge[] {
  return [...new Map(edges.map((edge) => [`${edge.source}:${edge.kind}:${edge.target}`, edge])).values()]
    .sort((left, right) => `${left.source}:${left.kind}:${left.target}`.localeCompare(`${right.source}:${right.kind}:${right.target}`));
}

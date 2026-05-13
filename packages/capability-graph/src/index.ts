import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import { BUILT_IN_EDGE_KINDS, BUILT_IN_NODE_KINDS, createGraphSlice } from "@rekon/kernel-graph";
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
    const computedAt = new Date().toISOString();
    const refs: ArtifactRef[] = [];

    refs.push(await artifacts.write("GraphSlice", createGraphSlice({
      header: createHeader("import-graph", graph.header, evidenceRef),
      producer: "@rekon/capability-graph",
      nodes: graph.facts
        .filter((fact) => fact.kind === "file" || fact.kind === "import")
        .flatMap((fact) => [
          { id: fact.subject, kind: BUILT_IN_NODE_KINDS.file },
          ...(typeof fact.value?.target === "string" ? [{ id: fact.value.target, kind: BUILT_IN_NODE_KINDS.file }] : []),
        ]),
      edges: graph.facts
        .filter((fact) => fact.kind === "import" && typeof fact.value?.target === "string")
        .map((fact) => ({
          source: fact.subject,
          target: String(fact.value?.target),
          kind: BUILT_IN_EDGE_KINDS.imports,
          evidence: [edgeEvidence(fact, computedAt)],
        })),
    })));

    refs.push(await artifacts.write("GraphSlice", createGraphSlice({
      header: createHeader("symbol-graph", graph.header, evidenceRef),
      producer: "@rekon/capability-graph",
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

    return refs;
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-graph",
    name: "Graph Projection",
    version: "0.1.0",
    roles: ["projector"],
    consumes: ["EvidenceGraph"],
    produces: ["GraphSlice"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "evidence.changed",
        description: "Graph slices are invalid when their evidence graph changes.",
        inputs: ["EvidenceGraph"],
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

function createHeader(sliceId: string, evidenceHeader: ArtifactHeader, evidenceRef: ArtifactRef): ArtifactHeader {
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
    inputRefs: [evidenceRef],
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
  return (await artifacts.list("EvidenceGraph")).sort((left, right) => right.id.localeCompare(left.id))[0];
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

import {
  type ArtifactHeader,
  type ArtifactRef,
} from "@rekon/kernel-artifacts";
import {
  createCapabilityMap,
  createObservedRepo,
  createOwnershipMap,
} from "@rekon/kernel-repo-model";
import { type Projector, defineCapability } from "@rekon/sdk";

type EvidenceGraphLike = {
  header: ArtifactHeader;
  facts: Array<{
    id?: string;
    kind: string;
    subject: string;
    value: Record<string, unknown>;
    confidence: number;
  }>;
};

export const modelProjector: Projector = {
  id: "@rekon/capability-model.projector",
  produces: ["ObservedRepo", "OwnershipMap", "CapabilityMap"],
  async project({ artifacts, input }) {
    const evidenceRef = await latestEvidenceRef(artifacts);

    if (!evidenceRef) {
      throw new Error("@rekon/capability-model requires an EvidenceGraph artifact.");
    }

    const graph = await artifacts.read(evidenceRef) as EvidenceGraphLike;
    const ownershipEntries = graph.facts
      .filter((fact) => fact.kind === "ownership_hint")
      .map((fact) => ({
        path: typeof fact.value.path === "string" ? fact.value.path : fact.subject,
        ownerSystem: typeof fact.value.system === "string" ? fact.value.system : ownerFromPath(fact.subject),
        layer: typeof fact.value.layer === "string" ? fact.value.layer : undefined,
        confidence: fact.confidence,
        evidence: [evidenceRef],
      }));
    const capabilityEntries = graph.facts
      .filter((fact) => fact.kind === "capability_hint")
      .map((fact) => ({
        capability: typeof fact.value.capability === "string" ? fact.value.capability : "unknown",
        subjects: [typeof fact.value.path === "string" ? fact.value.path : fact.subject],
        systems: [ownerFromPath(typeof fact.value.path === "string" ? fact.value.path : fact.subject)],
        confidence: fact.confidence,
        evidence: [evidenceRef],
      }));
    const systems = buildSystems(ownershipEntries, capabilityEntries, evidenceRef);
    const baseHeader = {
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: graph.header.subject,
      producer: {
        id: "@rekon/capability-model",
        version: "0.1.0",
      },
      inputRefs: [evidenceRef],
      freshness: {
        status: "fresh" as const,
      },
      provenance: {
        confidence: 0.85,
      },
    };
    const observedRepo = createObservedRepo({
      header: {
        ...baseHeader,
        artifactType: "ObservedRepo",
        artifactId: `observed-repo-${Date.now()}`,
      },
      repository: {
        id: graph.header.subject.repoId,
        root: repoRootFromInput(input),
        branch: graph.header.subject.ref,
        commit: graph.header.subject.commit,
      },
      systems,
      layers: [],
      capabilities: [],
    });
    const ownershipMap = createOwnershipMap({
      header: {
        ...baseHeader,
        artifactType: "OwnershipMap",
        artifactId: `ownership-map-${Date.now()}`,
      },
      entries: ownershipEntries,
    });
    const capabilityMap = createCapabilityMap({
      header: {
        ...baseHeader,
        artifactType: "CapabilityMap",
        artifactId: `capability-map-${Date.now()}`,
      },
      entries: capabilityEntries,
    });

    return [
      await artifacts.write("ObservedRepo", observedRepo),
      await artifacts.write("OwnershipMap", ownershipMap),
      await artifacts.write("CapabilityMap", capabilityMap),
    ];
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-model",
    name: "Repository Model Projection",
    version: "0.1.0",
    roles: ["projector"],
    consumes: ["EvidenceGraph"],
    produces: ["ObservedRepo", "OwnershipMap", "CapabilityMap"],
    permissions: ["read:artifacts", "write:artifacts"],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.projector(modelProjector);
  },
});

async function latestEvidenceRef(artifacts: {
  list?: (type?: string) => Promise<ArtifactRef[]>;
} & { read(ref: ArtifactRef): Promise<unknown> }): Promise<ArtifactRef | undefined> {
  if (!artifacts.list) {
    return undefined;
  }

  const refs = await artifacts.list("EvidenceGraph");

  return refs.at(-1);
}

function buildSystems(
  ownershipEntries: Array<{ path: string; ownerSystem: string; layer?: string; confidence: number; evidence: ArtifactRef[] }>,
  capabilityEntries: Array<{ capability: string; subjects: string[]; systems: string[]; confidence: number; evidence: ArtifactRef[] }>,
  evidenceRef: ArtifactRef,
) {
  const bySystem = new Map<string, {
    id: string;
    paths: string[];
    layers: string[];
    capabilities: string[];
    confidence: number;
    evidence: ArtifactRef[];
  }>();

  for (const entry of ownershipEntries) {
    const existing = bySystem.get(entry.ownerSystem) ?? {
      id: entry.ownerSystem,
      paths: [],
      layers: [],
      capabilities: [],
      confidence: 0,
      evidence: [evidenceRef],
    };

    existing.paths.push(entry.path);

    if (entry.layer) {
      existing.layers.push(entry.layer);
    }

    existing.confidence = Math.max(existing.confidence, entry.confidence);
    bySystem.set(entry.ownerSystem, existing);
  }

  for (const entry of capabilityEntries) {
    for (const system of entry.systems) {
      const existing = bySystem.get(system) ?? {
        id: system,
        paths: [],
        layers: [],
        capabilities: [],
        confidence: 0,
        evidence: [evidenceRef],
      };

      existing.capabilities.push(entry.capability);
      existing.paths.push(...entry.subjects);
      existing.confidence = Math.max(existing.confidence, entry.confidence);
      bySystem.set(system, existing);
    }
  }

  return [...bySystem.values()];
}

function ownerFromPath(path: string): string {
  return path.split("/")[0] || "root";
}

function repoRootFromInput(input: Record<string, unknown> | undefined): string {
  const repo = input?.repo;

  if (repo && typeof repo === "object" && "root" in repo && typeof repo.root === "string" && repo.root.length > 0) {
    return repo.root;
  }

  return ".";
}

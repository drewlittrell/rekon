import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import { type IntelligenceSnapshot } from "@rekon/kernel-snapshot";
import { type Publisher, defineCapability } from "@rekon/sdk";

export type PublicationArtifact = {
  header: ArtifactHeader;
  kind: "agents" | "repo-summary";
  path: string;
  format: "markdown";
  content: string;
};

export const docsPublisher: Publisher = {
  id: "@rekon/capability-docs.publisher",
  produces: ["Publication"],
  async publish({ artifacts }) {
    const snapshotRef = await latestRef(artifacts, "IntelligenceSnapshot");

    if (!snapshotRef) {
      throw new Error("@rekon/capability-docs requires an IntelligenceSnapshot artifact.");
    }

    const snapshot = await artifacts.read(snapshotRef) as IntelligenceSnapshot;
    const resolverRefs = await artifacts.list("ResolverPacket");
    const latestResolverRef = latestById(resolverRefs);
    const inputRefs = latestResolverRef ? [snapshotRef, latestResolverRef] : [snapshotRef];
    const generatedAt = new Date().toISOString();
    const publications: PublicationArtifact[] = [
      {
        header: createPublicationHeader("agents", generatedAt, snapshot, inputRefs),
        kind: "agents",
        path: ".rekon/artifacts/publications/agents.md",
        format: "markdown",
        content: renderAgentsDoc(snapshot, inputRefs, generatedAt),
      },
      {
        header: createPublicationHeader("repo-summary", generatedAt, snapshot, [snapshotRef]),
        kind: "repo-summary",
        path: ".rekon/artifacts/publications/repo-summary.md",
        format: "markdown",
        content: renderRepoSummary(snapshot, snapshotRef, generatedAt),
      },
    ];

    const refs: ArtifactRef[] = [];

    for (const publication of publications) {
      refs.push(await artifacts.write("Publication", publication));
    }

    return refs;
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-docs",
    name: "Docs Publisher",
    version: "0.1.0",
    roles: ["publisher"],
    consumes: ["IntelligenceSnapshot", "ResolverPacket"],
    produces: ["Publication"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "snapshot.changed",
        description: "Regenerate publications when the intelligence snapshot changes.",
        inputs: ["IntelligenceSnapshot"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.publisher(docsPublisher);
  },
});

function createPublicationHeader(
  kind: PublicationArtifact["kind"],
  generatedAt: string,
  snapshot: IntelligenceSnapshot,
  inputRefs: ArtifactRef[],
): ArtifactHeader {
  return {
    artifactType: "Publication",
    artifactId: `${kind}-${Date.now()}`,
    schemaVersion: "0.1.0",
    generatedAt,
    snapshotId: snapshot.header.artifactId,
    subject: {
      repoId: snapshot.repo.id,
      ref: snapshot.repo.branch,
      commit: snapshot.repo.commit,
    },
    producer: {
      id: "@rekon/capability-docs",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: snapshot.status.freshness,
      invalidatedBy: snapshot.status.warnings.length > 0 ? snapshot.status.warnings : undefined,
    },
    provenance: {
      confidence: 1,
      notes: ["Docs are publications, not canonical truth."],
    },
  };
}

function renderAgentsDoc(
  snapshot: IntelligenceSnapshot,
  inputRefs: ArtifactRef[],
  generatedAt: string,
): string {
  const staleness = snapshot.status.freshness === "fresh"
    ? "Snapshot freshness: fresh."
    : `Snapshot freshness: ${snapshot.status.freshness}. Treat this guidance as stale until Rekon is rerun.`;

  return [
    "# Rekon Agent Guidance",
    "",
    `generatedAt: ${generatedAt}`,
    `snapshotId: ${snapshot.header.artifactId}`,
    `inputRefs: ${inputRefs.map(formatRef).join(", ")}`,
    "",
    staleness,
    "",
    "Docs are publications, not canonical truth. Rekon publications summarize typed artifacts. They do not replace EvidenceGraph, ObservedRepo, OwnershipMap, FindingReport, or ResolverPacket artifacts as canonical truth.",
    "",
    "## Indexed Intelligence",
    "",
    `- Inputs: ${Object.keys(snapshot.inputs).sort().join(", ") || "none"}`,
    `- Projections: ${Object.keys(snapshot.projections).sort().join(", ") || "none"}`,
    `- Evaluations: ${Object.keys(snapshot.evaluations).sort().join(", ") || "none"}`,
    `- Publications: ${Object.keys(snapshot.publications).sort().join(", ") || "none"}`,
    `- Actions: ${Object.keys(snapshot.actions).sort().join(", ") || "none"}`,
    "",
    "## Required Default Checks",
    "",
    "- npm run typecheck",
    "- npm run test",
    "- npm run build",
  ].join("\n");
}

function renderRepoSummary(snapshot: IntelligenceSnapshot, snapshotRef: ArtifactRef, generatedAt: string): string {
  return [
    "# Rekon Repository Summary",
    "",
    `generatedAt: ${generatedAt}`,
    `snapshotId: ${snapshot.header.artifactId}`,
    `inputRefs: ${formatRef(snapshotRef)}`,
    "",
    `Repository: ${snapshot.repo.id}`,
    `Root: ${snapshot.repo.root}`,
    `Freshness: ${snapshot.status.freshness}`,
    "",
    "## Artifact Counts",
    "",
    `- Inputs: ${countRefs(snapshot.inputs)}`,
    `- Projections: ${countRefs(snapshot.projections)}`,
    `- Evaluations: ${countRefs(snapshot.evaluations)}`,
    `- Publications: ${countRefs(snapshot.publications)}`,
    `- Actions: ${countRefs(snapshot.actions)}`,
  ].join("\n");
}

async function latestRef(
  artifacts: { list(type?: string): Promise<ArtifactRef[]> },
  type: string,
): Promise<ArtifactRef | undefined> {
  return latestById(await artifacts.list(type));
}

function latestById(refs: ArtifactRef[]): ArtifactRef | undefined {
  return [...refs].sort((left, right) => right.id.localeCompare(left.id))[0];
}

function formatRef(ref: ArtifactRef): string {
  return `${ref.type}:${ref.id}@${ref.schemaVersion}`;
}

function countRefs(groups: Record<string, ArtifactRef[]>): number {
  return Object.values(groups).reduce((total, refs) => total + refs.length, 0);
}

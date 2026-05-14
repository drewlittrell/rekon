import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type CoherencyDelta,
  type FindingLifecycleReport,
} from "@rekon/kernel-findings";
import {
  type CapabilityMap,
  type ObservedRepo,
  type OwnershipMap,
} from "@rekon/kernel-repo-model";
import { type IntelligenceSnapshot } from "@rekon/kernel-snapshot";
import { type Publisher, defineCapability } from "@rekon/sdk";

export type PublicationArtifact = {
  header: ArtifactHeader;
  kind: "agents" | "repo-summary" | "architecture-summary";
  title?: string;
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

export const architectureSummaryPublisher: Publisher = {
  id: "@rekon/capability-docs.architecture-summary",
  produces: ["Publication"],
  async publish({ artifacts }) {
    const snapshotRef = await latestRef(artifacts, "IntelligenceSnapshot");

    if (!snapshotRef) {
      throw new Error(
        "@rekon/capability-docs.architecture-summary requires an IntelligenceSnapshot artifact. Run `rekon snapshot` first.",
      );
    }

    const snapshot = (await artifacts.read(snapshotRef)) as IntelligenceSnapshot;
    const inputRefs: ArtifactRef[] = [snapshotRef];
    const observedRepo = await readLatestArtifact<ObservedRepo>(
      artifacts,
      "ObservedRepo",
      inputRefs,
    );
    const ownershipMap = await readLatestArtifact<OwnershipMap>(
      artifacts,
      "OwnershipMap",
      inputRefs,
    );
    const capabilityMap = await readLatestArtifact<CapabilityMap>(
      artifacts,
      "CapabilityMap",
      inputRefs,
    );
    const coherencyDelta = await readLatestArtifact<CoherencyDelta>(
      artifacts,
      "CoherencyDelta",
      inputRefs,
    );
    const lifecycleReport = await readLatestArtifact<FindingLifecycleReport>(
      artifacts,
      "FindingLifecycleReport",
      inputRefs,
    );

    const generatedAt = new Date().toISOString();
    const publication: PublicationArtifact = {
      header: createPublicationHeader("architecture-summary", generatedAt, snapshot, inputRefs),
      kind: "architecture-summary",
      title: "Rekon Architecture Summary",
      path: ".rekon/artifacts/publications/architecture-summary.md",
      format: "markdown",
      content: renderArchitectureSummary({
        snapshot,
        observedRepo,
        ownershipMap,
        capabilityMap,
        coherencyDelta,
        lifecycleReport,
        inputRefs,
        generatedAt,
      }),
    };

    const ref = await artifacts.write("Publication", publication);

    return [ref];
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-docs",
    name: "Docs Publisher",
    version: "0.1.0",
    roles: ["publisher"],
    consumes: [
      "IntelligenceSnapshot",
      "ResolverPacket",
      "ObservedRepo",
      "OwnershipMap",
      "CapabilityMap",
      "CoherencyDelta",
      "FindingLifecycleReport",
    ],
    produces: ["Publication"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "snapshot.changed",
        description: "Regenerate publications when the intelligence snapshot changes.",
        inputs: ["IntelligenceSnapshot"],
      },
      {
        id: "coherency.changed",
        description:
          "Regenerate the architecture summary when coherency, ownership, or repo model changes.",
        inputs: ["CoherencyDelta", "OwnershipMap", "CapabilityMap", "ObservedRepo"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.publisher(docsPublisher);
    registry.publisher(architectureSummaryPublisher);
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

async function readLatestArtifact<T>(
  artifacts: {
    list(type?: string): Promise<ArtifactRef[]>;
    read(ref: ArtifactRef): Promise<unknown>;
  },
  type: string,
  inputRefs: ArtifactRef[],
): Promise<T | undefined> {
  const ref = await latestRef(artifacts, type);

  if (!ref) {
    return undefined;
  }

  if (!inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
    inputRefs.push(ref);
  }

  return (await artifacts.read(ref)) as T;
}

type ArchitectureSummaryInputs = {
  snapshot: IntelligenceSnapshot;
  observedRepo?: ObservedRepo;
  ownershipMap?: OwnershipMap;
  capabilityMap?: CapabilityMap;
  coherencyDelta?: CoherencyDelta;
  lifecycleReport?: FindingLifecycleReport;
  inputRefs: ArtifactRef[];
  generatedAt: string;
};

function renderArchitectureSummary(input: ArchitectureSummaryInputs): string {
  const {
    snapshot,
    observedRepo,
    ownershipMap,
    capabilityMap,
    coherencyDelta,
    lifecycleReport,
    inputRefs,
    generatedAt,
  } = input;
  const sections: string[] = [];
  const systemList = observedRepo?.systems ?? [];
  const ownershipEntries = ownershipMap?.entries ?? [];
  const capabilityEntries = capabilityMap?.entries ?? [];

  sections.push(`# Rekon Architecture Summary`);
  sections.push("");
  sections.push(`Generated: ${generatedAt}`);
  sections.push(`Snapshot: ${snapshot.header.artifactId}`);
  sections.push("");
  sections.push(
    "Docs are publications, not canonical truth. Canonical truth lives in `.rekon/artifacts`.",
  );
  sections.push("");

  // Repository Overview
  sections.push("## Repository Overview");
  sections.push("");
  sections.push(`- Repository: ${snapshot.repo.id}`);
  sections.push(`- Root: ${snapshot.repo.root}`);
  sections.push(`- Systems: ${systemList.length}`);
  sections.push(`- Capabilities: ${capabilityEntries.length}`);
  sections.push(`- Indexed artifact categories: ${describeSnapshotCategories(snapshot)}`);
  sections.push(`- Snapshot freshness: ${snapshot.status.freshness}`);
  sections.push("");

  // Owner Systems
  sections.push("## Owner Systems");
  sections.push("");

  if (systemList.length === 0) {
    sections.push(
      "No owner systems resolved. Run `rekon observe`, `rekon project`, and `rekon snapshot`.",
    );
    sections.push("");
  } else {
    sections.push("| System | Paths | Capabilities |");
    sections.push("| --- | --- | --- |");
    for (const system of systemList.slice(0, 20)) {
      sections.push(
        `| ${system.id} | ${summarizeList(system.paths, 3)} | ${summarizeList(system.capabilities, 3)} |`,
      );
    }
    if (systemList.length > 20) {
      sections.push(`| _… ${systemList.length - 20} more systems_ | | |`);
    }
    sections.push("");
  }

  if (ownershipEntries.length > 0) {
    sections.push(`Ownership entries: ${ownershipEntries.length}.`);
    sections.push("");
  }

  // Capability Map
  sections.push("## Capability Map");
  sections.push("");

  if (capabilityEntries.length === 0) {
    sections.push("No capability map entries available.");
    sections.push("");
  } else {
    for (const entry of capabilityEntries.slice(0, 20)) {
      const subjects = summarizeList(entry.subjects, 3);
      const systems = summarizeList(entry.systems, 3);
      sections.push(`- **${entry.capability}** — subjects: ${subjects}; systems: ${systems}`);
    }
    if (capabilityEntries.length > 20) {
      sections.push(`- _… ${capabilityEntries.length - 20} more capabilities_`);
    }
    sections.push("");
  }

  // Coherency Summary
  sections.push("## Coherency Summary");
  sections.push("");

  if (!coherencyDelta) {
    sections.push(
      "No CoherencyDelta found. Run `rekon coherency delta` for governance summary.",
    );
    sections.push("");
  } else {
    const summary = coherencyDelta.summary;
    sections.push(`- Active findings: ${summary.active}`);
    sections.push(`- Accepted: ${summary.accepted}`);
    sections.push(`- Ignored: ${summary.ignored}`);
    sections.push(`- Resolved: ${summary.resolved}`);
    sections.push("- By severity:");
    for (const severity of ["critical", "high", "medium", "low"] as const) {
      sections.push(`  - ${severity}: ${summary.bySeverity[severity] ?? 0}`);
    }
    sections.push("");
  }

  // Top Affected Paths
  sections.push("## Top Affected Paths");
  sections.push("");

  if (!coherencyDelta || coherencyDelta.summary.topPaths.length === 0) {
    sections.push("No affected paths recorded.");
    sections.push("");
  } else {
    sections.push("| Path | Count |");
    sections.push("| --- | --- |");
    for (const entry of coherencyDelta.summary.topPaths) {
      sections.push(`| ${entry.path} | ${entry.count} |`);
    }
    sections.push("");
  }

  // Remediation Queue
  sections.push("## Remediation Queue");
  sections.push("");

  if (!coherencyDelta || coherencyDelta.remediationQueue.length === 0) {
    sections.push("No remediation steps queued.");
    sections.push("");
  } else {
    sections.push("| Priority | Finding | Severity | Systems | Action |");
    sections.push("| --- | --- | --- | --- | --- |");
    for (const step of coherencyDelta.remediationQueue.slice(0, 20)) {
      sections.push(
        `| ${step.priority} | ${truncate(step.findingId, 60)} | ${step.severity} | ${summarizeList(step.systems, 3)} | ${truncate(step.action, 80)} |`,
      );
    }
    if (coherencyDelta.remediationQueue.length > 20) {
      sections.push(`| _… ${coherencyDelta.remediationQueue.length - 20} more remediation steps_ | | | | |`);
    }
    sections.push("");
  }

  if (lifecycleReport) {
    sections.push(
      `Finding lifecycle: ${lifecycleReport.summary.active} active, ` +
        `${lifecycleReport.summary.accepted} accepted, ` +
        `${lifecycleReport.summary.ignored} ignored, ` +
        `${lifecycleReport.summary.resolved} resolved.`,
    );
    sections.push("");
  }

  // Agent Guidance
  sections.push("## Agent Guidance");
  sections.push("");
  sections.push("- Start with the owner system context for the paths you intend to touch.");
  sections.push(
    "- Resolve seams before editing cross-owner paths (`rekon resolve route`, `rekon resolve seam`).",
  );
  sections.push("- Address P0 remediation items first.");
  sections.push("- Run required checks before handoff (`npm run typecheck`, `npm run test`, `npm run build`).");
  sections.push(
    "- Treat this document as a publication. Canonical truth is in `.rekon/artifacts`.",
  );
  sections.push("");

  // Freshness
  sections.push("## Freshness");
  sections.push("");
  sections.push(
    "Run `rekon artifacts freshness --json` to verify this publication is current relative to its inputs.",
  );
  sections.push("");

  // Input Artifacts
  sections.push("## Input Artifacts");
  sections.push("");
  for (const ref of inputRefs) {
    sections.push(`- ${formatRef(ref)}`);
  }

  return sections.join("\n");
}

function describeSnapshotCategories(snapshot: IntelligenceSnapshot): string {
  const categories: string[] = [];

  for (const [key, group] of Object.entries({
    inputs: snapshot.inputs,
    projections: snapshot.projections,
    evaluations: snapshot.evaluations,
    publications: snapshot.publications,
    actions: snapshot.actions,
  })) {
    const count = Object.values(group).reduce((total, refs) => total + refs.length, 0);
    if (count > 0) {
      categories.push(`${key}=${count}`);
    }
  }

  return categories.length > 0 ? categories.join(", ") : "none";
}

function summarizeList(values: string[], maxItems: number): string {
  if (values.length === 0) {
    return "_none_";
  }

  if (values.length <= maxItems) {
    return values.join(", ");
  }

  return `${values.slice(0, maxItems).join(", ")} _(+${values.length - maxItems} more)_`;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

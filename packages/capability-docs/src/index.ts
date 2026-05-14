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
  kind: "agents" | "repo-summary" | "architecture-summary" | "proof-report" | "agent-contract";
  title?: string;
  path: string;
  format: "markdown";
  content: string;
};

// Local "Like" shapes intentionally avoid importing from downstream
// capability packages so that capability-docs remains an upstream
// publisher with no cycle into capability-intent or capability-reconcile.

type RemediationItemLike = {
  findingId?: string;
  priority?: "p0" | "p1" | "p2";
  title?: string;
  action?: string;
  files?: string[];
  systems?: string[];
  severity?: string;
};

type WorkOrderLike = {
  header: ArtifactHeader;
  goal?: string;
  paths?: string[];
  ownerSystems?: string[];
  source?: string;
  remediationItems?: RemediationItemLike[];
};

type ReconciliationPlanOperationLike = {
  operation?: string;
  status?: string;
  class?: string;
  source?: string;
  findingId?: string;
  priority?: string;
  requiresPermission?: string[];
  reason?: string;
};

type ReconciliationPlanLike = {
  header: ArtifactHeader;
  dryRun?: boolean;
  operations?: ReconciliationPlanOperationLike[];
  summary?: {
    total?: number;
    artifactOnly?: number;
    deterministicDeferred?: number;
    sourceWriteDeferred?: number;
    commandDeferred?: number;
    manualReview?: number;
    applied?: number;
    planned?: number;
    deferred?: number;
    denied?: number;
  };
};

type VerificationPlanLike = {
  header: ArtifactHeader;
  workOrderRef?: ArtifactRef;
  commands?: string[];
  source?: string;
};

type VerificationCommandResultLike = {
  command?: string;
  status?: "passed" | "failed" | "skipped" | "not-run";
  exitCode?: number;
  durationMs?: number;
  notes?: string;
};

type VerificationResultLike = {
  header: ArtifactHeader;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  status?: "passed" | "failed" | "partial" | "not-run";
  commandResults?: VerificationCommandResultLike[];
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    notRun?: number;
  };
  evidenceNotes?: string[];
  recordedBy?: string;
  recordedAt?: string;
};

type MemorySelectionItemLike = {
  instruction?: string;
  scope?: Record<string, unknown>;
  confidence?: number;
  reason?: string;
  id?: string;
  score?: number;
  reasons?: string[];
  match?: Record<string, unknown>;
  priority?: "low" | "normal" | "high";
  verification?: "verified" | "unverified" | "disputed";
};

type MemorySelectionLike = {
  header: ArtifactHeader;
  path?: string;
  goal?: string;
  selections?: MemorySelectionItemLike[];
  selected?: MemorySelectionItemLike[];
  rejected?: Array<{ id?: string; reasons?: string[] }>;
};

type MemoryCurationReportLike = {
  header: ArtifactHeader;
  summary?: {
    totalMemories?: number;
    totalUsageEvents?: number;
    keep?: number;
    reinforce?: number;
    review?: number;
    deprecate?: number;
    supersedeCandidate?: number;
  };
  items?: Array<{
    memoryEntryId?: string;
    instruction?: string;
    recommendation?: string;
  }>;
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
    const workOrders = await readLatestWorkOrdersByFlavor(artifacts, inputRefs);
    const reconciliationPlan = await readLatestArtifact<ReconciliationPlanLike>(
      artifacts,
      "ReconciliationPlan",
      inputRefs,
    );
    const latestVerificationPlanRef = await latestRef(artifacts, "VerificationPlan");
    const verificationPlan = latestVerificationPlanRef
      ? (await artifacts.read(latestVerificationPlanRef)) as VerificationPlanLike
      : undefined;

    if (latestVerificationPlanRef && !inputRefs.some((ref) => ref.type === latestVerificationPlanRef.type && ref.id === latestVerificationPlanRef.id)) {
      inputRefs.push(latestVerificationPlanRef);
    }

    const verificationResult = await readLatestArtifact<VerificationResultLike>(
      artifacts,
      "VerificationResult",
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
        remediationWorkOrder: workOrders.remediation,
        resolverWorkOrder: workOrders.resolver,
        reconciliationPlan,
        latestVerificationPlanRef,
        verificationPlan,
        verificationResult,
        inputRefs,
        generatedAt,
      }),
    };

    const ref = await artifacts.write("Publication", publication);

    return [ref];
  },
};

export const proofReportPublisher: Publisher = {
  id: "@rekon/capability-docs.proof-report",
  produces: ["Publication"],
  async publish({ artifacts }) {
    const inputRefs: ArtifactRef[] = [];
    const snapshotRef = await latestRef(artifacts, "IntelligenceSnapshot");
    const snapshot = snapshotRef
      ? (await artifacts.read(snapshotRef)) as IntelligenceSnapshot
      : undefined;

    if (snapshotRef) {
      inputRefs.push(snapshotRef);
    }

    const workOrders = await readLatestWorkOrdersByFlavor(artifacts, inputRefs);
    const verificationPlanRef = await latestRef(artifacts, "VerificationPlan");
    const verificationPlan = verificationPlanRef
      ? (await artifacts.read(verificationPlanRef)) as VerificationPlanLike
      : undefined;

    if (verificationPlanRef && !inputRefs.some((ref) => ref.type === verificationPlanRef.type && ref.id === verificationPlanRef.id)) {
      inputRefs.push(verificationPlanRef);
    }

    const verificationResult = await readLatestArtifact<VerificationResultLike>(
      artifacts,
      "VerificationResult",
      inputRefs,
    );
    const coherencyDelta = await readLatestArtifact<CoherencyDelta>(
      artifacts,
      "CoherencyDelta",
      inputRefs,
    );
    const reconciliationPlan = await readLatestArtifact<ReconciliationPlanLike>(
      artifacts,
      "ReconciliationPlan",
      inputRefs,
    );
    const lifecycleReport = await readLatestArtifact<FindingLifecycleReport>(
      artifacts,
      "FindingLifecycleReport",
      inputRefs,
    );

    const generatedAt = new Date().toISOString();
    const subject = pickProofReportSubject({
      snapshot,
      verificationPlan,
      remediationWorkOrder: workOrders.remediation,
      resolverWorkOrder: workOrders.resolver,
    });
    const header: ArtifactHeader = {
      artifactType: "Publication",
      artifactId: `proof-report-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      snapshotId: snapshot?.header.artifactId,
      subject,
      producer: {
        id: "@rekon/capability-docs",
        version: "0.1.0",
      },
      inputRefs,
      freshness: {
        status: snapshot?.status.freshness ?? "fresh",
      },
      provenance: {
        confidence: 1,
        notes: [
          "Proof reports are publications. Canonical evidence lives in VerificationResult artifacts.",
        ],
      },
    };
    const publication: PublicationArtifact = {
      header,
      kind: "proof-report",
      title: "Rekon Proof Report",
      path: ".rekon/artifacts/publications/proof-report.md",
      format: "markdown",
      content: renderProofReport({
        generatedAt,
        remediationWorkOrder: workOrders.remediation,
        resolverWorkOrder: workOrders.resolver,
        verificationPlan,
        verificationPlanRef,
        verificationResult,
        coherencyDelta,
        reconciliationPlan,
        lifecycleReport,
        inputRefs,
      }),
    };

    const ref = await artifacts.write("Publication", publication);

    return [ref];
  },
};

export const agentContractPublisher: Publisher = {
  id: "@rekon/capability-docs.agent-contract",
  produces: ["Publication"],
  async publish({ artifacts }) {
    const snapshotRef = await latestRef(artifacts, "IntelligenceSnapshot");

    if (!snapshotRef) {
      throw new Error(
        "Agent contract publisher requires an IntelligenceSnapshot. Run `rekon refresh` first.",
      );
    }

    const snapshot = (await artifacts.read(snapshotRef)) as IntelligenceSnapshot;
    const inputRefs: ArtifactRef[] = [snapshotRef];
    const observedRepo = await readLatestArtifact<ObservedRepo>(artifacts, "ObservedRepo", inputRefs);
    const ownershipMap = await readLatestArtifact<OwnershipMap>(artifacts, "OwnershipMap", inputRefs);
    const capabilityMap = await readLatestArtifact<CapabilityMap>(artifacts, "CapabilityMap", inputRefs);
    const coherencyDelta = await readLatestArtifact<CoherencyDelta>(artifacts, "CoherencyDelta", inputRefs);
    const lifecycleReport = await readLatestArtifact<FindingLifecycleReport>(
      artifacts,
      "FindingLifecycleReport",
      inputRefs,
    );
    const workOrders = await readLatestWorkOrdersByFlavor(artifacts, inputRefs);
    const reconciliationPlan = await readLatestArtifact<ReconciliationPlanLike>(
      artifacts,
      "ReconciliationPlan",
      inputRefs,
    );
    const latestVerificationPlanRef = await latestRef(artifacts, "VerificationPlan");
    const verificationPlan = latestVerificationPlanRef
      ? ((await artifacts.read(latestVerificationPlanRef)) as VerificationPlanLike)
      : undefined;

    if (latestVerificationPlanRef && !inputRefs.some((ref) => ref.type === latestVerificationPlanRef.type && ref.id === latestVerificationPlanRef.id)) {
      inputRefs.push(latestVerificationPlanRef);
    }

    const verificationResult = await readLatestArtifact<VerificationResultLike>(
      artifacts,
      "VerificationResult",
      inputRefs,
    );
    const memorySelection = await readLatestArtifact<MemorySelectionLike>(
      artifacts,
      "MemorySelection",
      inputRefs,
    );
    const memoryCurationReport = await readLatestArtifact<MemoryCurationReportLike>(
      artifacts,
      "MemoryCurationReport",
      inputRefs,
    );
    const generatedAt = new Date().toISOString();
    const publication: PublicationArtifact = {
      header: createPublicationHeader("agent-contract", generatedAt, snapshot, inputRefs),
      kind: "agent-contract",
      title: "Rekon Agent Operating Contract",
      path: ".rekon/artifacts/publications/agent-contract.md",
      format: "markdown",
      content: renderAgentContract({
        snapshot,
        observedRepo,
        ownershipMap,
        capabilityMap,
        coherencyDelta,
        lifecycleReport,
        remediationWorkOrder: workOrders.remediation,
        resolverWorkOrder: workOrders.resolver,
        reconciliationPlan,
        verificationPlan,
        verificationPlanRef: latestVerificationPlanRef,
        verificationResult,
        memorySelection,
        memoryCurationReport,
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
      "WorkOrder",
      "ReconciliationPlan",
      "VerificationPlan",
      "VerificationResult",
      "MemorySelection",
      "MemoryCurationReport",
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
      {
        id: "proof-loop.changed",
        description:
          "Regenerate the architecture summary when the proof loop changes (work orders, reconciliation plans, verification plans/results).",
        inputs: [
          "WorkOrder",
          "ReconciliationPlan",
          "VerificationPlan",
          "VerificationResult",
        ],
      },
      {
        id: "memory.changed",
        description:
          "Regenerate the agent contract when ranked memory selections change.",
        inputs: ["MemorySelection"],
      },
      {
        id: "memory.curation.changed",
        description:
          "Regenerate the agent contract when memory curation recommendations change.",
        inputs: ["MemoryCurationReport"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.publisher(docsPublisher);
    registry.publisher(architectureSummaryPublisher);
    registry.publisher(proofReportPublisher);
    registry.publisher(agentContractPublisher);
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

async function readLatestWorkOrdersByFlavor(
  artifacts: {
    list(type?: string): Promise<ArtifactRef[]>;
    read(ref: ArtifactRef): Promise<unknown>;
  },
  inputRefs: ArtifactRef[],
): Promise<{ remediation?: WorkOrderLike; resolver?: WorkOrderLike }> {
  const refs = [...await artifacts.list("WorkOrder")].sort((left, right) =>
    right.id.localeCompare(left.id),
  );
  let remediation: WorkOrderLike | undefined;
  let resolver: WorkOrderLike | undefined;

  for (const ref of refs) {
    if (remediation && resolver) {
      break;
    }

    const workOrder = (await artifacts.read(ref)) as WorkOrderLike;
    const source = workOrder?.source;

    if (!remediation && source === "coherency-delta") {
      remediation = workOrder;
      if (!inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
        inputRefs.push(ref);
      }
      continue;
    }

    if (!resolver && source !== "coherency-delta") {
      resolver = workOrder;
      if (!inputRefs.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
        inputRefs.push(ref);
      }
    }
  }

  return { remediation, resolver };
}

type ArchitectureSummaryInputs = {
  snapshot: IntelligenceSnapshot;
  observedRepo?: ObservedRepo;
  ownershipMap?: OwnershipMap;
  capabilityMap?: CapabilityMap;
  coherencyDelta?: CoherencyDelta;
  lifecycleReport?: FindingLifecycleReport;
  remediationWorkOrder?: WorkOrderLike;
  resolverWorkOrder?: WorkOrderLike;
  reconciliationPlan?: ReconciliationPlanLike;
  latestVerificationPlanRef?: ArtifactRef;
  verificationPlan?: VerificationPlanLike;
  verificationResult?: VerificationResultLike;
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

  renderWorkOrdersSection(sections, input);
  renderReconciliationPlansSection(sections, input);
  renderVerificationStatusSection(sections, input);
  renderProofLoopSection(sections, input);

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

function renderWorkOrdersSection(sections: string[], input: ArchitectureSummaryInputs): void {
  sections.push("## Work Orders");
  sections.push("");

  const rows: string[] = [];

  if (input.remediationWorkOrder) {
    const wo = input.remediationWorkOrder;
    const items = wo.remediationItems?.length ?? 0;
    rows.push(
      `| coherency-delta | ${truncate(wo.goal ?? "—", 60)} | ${summarizeList(wo.paths ?? [], 3)} | ${summarizeList(wo.ownerSystems ?? [], 3)} | ${items} |`,
    );
  }

  if (input.resolverWorkOrder) {
    const wo = input.resolverWorkOrder;
    rows.push(
      `| resolver | ${truncate(wo.goal ?? "—", 60)} | ${summarizeList(wo.paths ?? [], 3)} | ${summarizeList(wo.ownerSystems ?? [], 3)} | n/a |`,
    );
  }

  if (rows.length === 0) {
    sections.push(
      "No WorkOrder found. Run `rekon intent remediation` or `rekon intent work-order`.",
    );
    sections.push("");
    return;
  }

  sections.push("| Source | Goal | Paths | Systems | Selected Items |");
  sections.push("| --- | --- | --- | --- | --- |");
  for (const row of rows) {
    sections.push(row);
  }
  sections.push("");
}

function renderReconciliationPlansSection(
  sections: string[],
  input: ArchitectureSummaryInputs,
): void {
  sections.push("## Reconciliation Plans");
  sections.push("");

  const plan = input.reconciliationPlan;

  if (!plan) {
    sections.push("No ReconciliationPlan found. Run `rekon reconcile suggest`.");
    sections.push("");
    return;
  }

  const summary = plan.summary;
  const operations = plan.operations ?? [];
  const total = summary?.total ?? operations.length;
  const artifactOnly = summary?.artifactOnly ?? 0;
  const sourceWriteDeferred = summary?.sourceWriteDeferred ?? 0;
  const commandDeferred = summary?.commandDeferred ?? 0;
  const manualReview = summary?.manualReview ?? 0;
  const applied = summary?.applied ?? 0;
  const deferred = summary?.deferred ?? 0;
  const denied = summary?.denied ?? 0;

  sections.push("| Total | Artifact-only | Source-write deferred | Command deferred | Manual review | Applied | Deferred | Denied |");
  sections.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  sections.push(
    `| ${total} | ${artifactOnly} | ${sourceWriteDeferred} | ${commandDeferred} | ${manualReview} | ${applied} | ${deferred} | ${denied} |`,
  );
  sections.push("");

  if (operations.length === 0) {
    sections.push("No operations classified in the latest plan.");
    sections.push("");
    return;
  }

  sections.push("| Operation | Class | Status | Permission | Finding |");
  sections.push("| --- | --- | --- | --- | --- |");
  for (const op of operations.slice(0, 5)) {
    const permission = op.requiresPermission?.length ? op.requiresPermission.join(", ") : "—";
    sections.push(
      `| ${op.operation ?? "—"} | ${op.class ?? "—"} | ${op.status ?? "—"} | ${permission} | ${truncate(op.findingId ?? "—", 60)} |`,
    );
  }
  if (operations.length > 5) {
    sections.push(`| _… ${operations.length - 5} more operations_ | | | | |`);
  }
  sections.push("");
}

function renderVerificationStatusSection(
  sections: string[],
  input: ArchitectureSummaryInputs,
): void {
  sections.push("## Verification Status");
  sections.push("");

  const result = input.verificationResult;

  if (!result) {
    sections.push(
      "No VerificationResult found. Run `rekon verify record` after executing a VerificationPlan.",
    );
    sections.push("");
    return;
  }

  const summary = result.summary ?? { total: 0, passed: 0, failed: 0, skipped: 0, notRun: 0 };
  const recordedBy = result.recordedBy ?? "—";
  const recordedAt = result.recordedAt ?? result.header.generatedAt ?? "—";
  const status = result.status ?? "not-run";

  sections.push("| Status | Passed | Failed | Skipped | Not Run | Recorded By | Recorded At |");
  sections.push("| --- | --- | --- | --- | --- | --- | --- |");
  sections.push(
    `| ${status} | ${summary.passed ?? 0} | ${summary.failed ?? 0} | ${summary.skipped ?? 0} | ${summary.notRun ?? 0} | ${recordedBy} | ${recordedAt} |`,
  );
  sections.push("");

  if (status === "failed" || status === "partial" || status === "not-run") {
    sections.push("Verification is not complete.");
    sections.push("");
  }

  const latestPlanRef = input.latestVerificationPlanRef;

  if (latestPlanRef && result.verificationPlanRef && result.verificationPlanRef.id !== latestPlanRef.id) {
    sections.push("VerificationResult may be stale; latest VerificationPlan differs.");
    sections.push("");
  }
}

function renderProofLoopSection(sections: string[], input: ArchitectureSummaryInputs): void {
  sections.push("## Proof Loop");
  sections.push("");

  const activeRemediation = input.coherencyDelta?.summary.active ?? 0;
  const haveCoherency = Boolean(input.coherencyDelta);
  const haveWorkOrder = Boolean(input.remediationWorkOrder ?? input.resolverWorkOrder);
  const haveReconciliation = Boolean(input.reconciliationPlan);
  const havePlan = Boolean(input.verificationPlan ?? input.latestVerificationPlanRef);
  const haveResult = Boolean(input.verificationResult);
  const resultStatus = input.verificationResult?.status;

  sections.push("Governance:");
  sections.push(`- CoherencyDelta: ${haveCoherency ? "present" : "missing"}`);
  sections.push(`- Active remediation items: ${activeRemediation}`);
  sections.push("");
  sections.push("Planning:");
  sections.push(`- WorkOrder: ${haveWorkOrder ? "present" : "missing"}`);
  sections.push(`- ReconciliationPlan: ${haveReconciliation ? "present" : "missing"}`);
  sections.push("");
  sections.push("Verification:");
  sections.push(`- VerificationPlan: ${havePlan ? "present" : "missing"}`);
  sections.push(`- VerificationResult: ${haveResult ? `status ${resultStatus ?? "not-run"}` : "missing"}`);
  sections.push("");

  const nextCommand = pickNextProofLoopCommand({
    haveCoherency,
    haveWorkOrder,
    haveReconciliation,
    havePlan,
    haveResult,
    resultStatus,
  });

  sections.push(`Suggested next command: ${nextCommand}`);
  sections.push("");
}

function pickNextProofLoopCommand(state: {
  haveCoherency: boolean;
  haveWorkOrder: boolean;
  haveReconciliation: boolean;
  havePlan: boolean;
  haveResult: boolean;
  resultStatus?: "passed" | "failed" | "partial" | "not-run";
}): string {
  if (!state.haveCoherency) {
    return "`rekon coherency delta`";
  }

  if (!state.haveWorkOrder) {
    return "`rekon intent remediation`";
  }

  if (!state.haveReconciliation) {
    return "`rekon reconcile suggest`";
  }

  if (!state.havePlan) {
    return "`rekon intent remediation` or `rekon intent work-order`";
  }

  if (!state.haveResult) {
    return "`rekon verify record`";
  }

  if (state.resultStatus === "failed" || state.resultStatus === "partial" || state.resultStatus === "not-run") {
    return "address failures and re-run `rekon verify record`";
  }

  return "re-run `rekon evaluate` -> `rekon findings lifecycle` -> `rekon coherency delta` -> `rekon publish architecture`";
}

type ProofReportInputs = {
  generatedAt: string;
  remediationWorkOrder?: WorkOrderLike;
  resolverWorkOrder?: WorkOrderLike;
  verificationPlan?: VerificationPlanLike;
  verificationPlanRef?: ArtifactRef;
  verificationResult?: VerificationResultLike;
  coherencyDelta?: CoherencyDelta;
  reconciliationPlan?: ReconciliationPlanLike;
  lifecycleReport?: FindingLifecycleReport;
  inputRefs: ArtifactRef[];
};

function pickProofReportSubject(input: {
  snapshot?: IntelligenceSnapshot;
  verificationPlan?: VerificationPlanLike;
  remediationWorkOrder?: WorkOrderLike;
  resolverWorkOrder?: WorkOrderLike;
}): ArtifactHeader["subject"] {
  if (input.snapshot) {
    return {
      repoId: input.snapshot.repo.id,
      ref: input.snapshot.repo.branch,
      commit: input.snapshot.repo.commit,
    };
  }

  const candidate = input.verificationPlan?.header.subject
    ?? input.remediationWorkOrder?.header.subject
    ?? input.resolverWorkOrder?.header.subject;

  if (candidate) {
    return {
      repoId: candidate.repoId,
      ref: candidate.ref,
      commit: candidate.commit,
      paths: candidate.paths,
      systems: candidate.systems,
    };
  }

  return { repoId: "unknown" };
}

function renderProofReport(input: ProofReportInputs): string {
  const {
    generatedAt,
    remediationWorkOrder,
    resolverWorkOrder,
    verificationPlan,
    verificationPlanRef,
    verificationResult,
    coherencyDelta,
    reconciliationPlan,
    lifecycleReport: _lifecycleReport,
    inputRefs,
  } = input;
  const sections: string[] = [];

  sections.push("# Rekon Proof Report");
  sections.push("");
  sections.push(`Generated: ${generatedAt}`);
  sections.push("");
  sections.push(
    "Proof reports are publications. Canonical evidence lives in VerificationResult artifacts.",
  );
  sections.push("");

  if (!verificationPlan) {
    sections.push(
      "No VerificationPlan found. Run `rekon intent work-order` or `rekon intent remediation` first.",
    );
    sections.push("");
    sections.push("## Input Artifacts");
    sections.push("");

    if (inputRefs.length === 0) {
      sections.push("- _none_");
    } else {
      for (const ref of inputRefs) {
        sections.push(`- ${formatRef(ref)}`);
      }
    }

    return sections.join("\n");
  }

  // Proof Status
  sections.push("## Proof Status");
  sections.push("");

  if (!verificationResult) {
    sections.push("No VerificationResult found.");
    sections.push("");
    sections.push(
      "> Verification is not complete. Run `rekon verify record` against the latest VerificationPlan.",
    );
    sections.push("");
  } else {
    const status = verificationResult.status ?? "not-run";
    const summary = verificationResult.summary ?? { passed: 0, failed: 0, skipped: 0, notRun: 0 };
    sections.push("| Status | Passed | Failed | Skipped | Not Run |");
    sections.push("| --- | --- | --- | --- | --- |");
    sections.push(
      `| ${status} | ${summary.passed ?? 0} | ${summary.failed ?? 0} | ${summary.skipped ?? 0} | ${summary.notRun ?? 0} |`,
    );
    sections.push("");

    if (status === "failed" || status === "partial" || status === "not-run") {
      sections.push("> Verification is not complete.");
      sections.push("");
    } else if (status === "passed") {
      sections.push(
        "> Verification recorded as passed. This does not automatically resolve findings.",
      );
      sections.push("");
    }

    if (verificationResult.recordedBy || verificationResult.recordedAt) {
      sections.push(
        `Recorded by ${verificationResult.recordedBy ?? "—"} at ${verificationResult.recordedAt ?? "—"}.`,
      );
      sections.push("");
    }
  }

  // Work Order
  sections.push("## Work Order");
  sections.push("");

  const workOrder = remediationWorkOrder ?? resolverWorkOrder;

  if (!workOrder) {
    sections.push("No WorkOrder found.");
    sections.push("");
  } else {
    const source = workOrder.source ?? (remediationWorkOrder ? "coherency-delta" : "resolver");
    sections.push("| Source | Goal | Paths | Systems |");
    sections.push("| --- | --- | --- | --- |");
    sections.push(
      `| ${source} | ${truncate(workOrder.goal ?? "—", 60)} | ${summarizeList(workOrder.paths ?? [], 3)} | ${summarizeList(workOrder.ownerSystems ?? [], 3)} |`,
    );
    sections.push("");
  }

  // Verification Plan
  sections.push("## Verification Plan");
  sections.push("");

  const commands = verificationPlan.commands ?? [];

  if (commands.length === 0) {
    sections.push("No commands listed in the latest VerificationPlan.");
    sections.push("");
  } else {
    sections.push(`Plan id: \`${verificationPlanRef?.id ?? "unknown"}\``);
    sections.push("");
    sections.push("| Command |");
    sections.push("| --- |");
    for (const command of commands) {
      sections.push(`| ${escapeCell(command)} |`);
    }
    sections.push("");
  }

  // Verification Results
  sections.push("## Verification Results");
  sections.push("");

  if (!verificationResult) {
    sections.push("No VerificationResult found. Run `rekon verify record` to capture proof.");
    sections.push("");
  } else {
    const results = verificationResult.commandResults ?? [];

    if (results.length === 0) {
      sections.push("VerificationResult has no command results.");
      sections.push("");
    } else {
      sections.push("| Command | Status | Exit Code | Notes |");
      sections.push("| --- | --- | --- | --- |");
      for (const row of results) {
        const exitCode = typeof row.exitCode === "number" ? String(row.exitCode) : "—";
        const status = row.status ?? "—";
        sections.push(
          `| ${escapeCell(row.command ?? "—")} | ${status} | ${exitCode} | ${escapeCell(row.notes ?? "")} |`,
        );
      }
      sections.push("");
    }
  }

  // Failed / Missing Evidence
  sections.push("## Failed / Missing Evidence");
  sections.push("");

  if (!verificationResult) {
    sections.push("- No VerificationResult exists; every plan command is effectively `not-run`.");
    sections.push("");
  } else {
    const failed = (verificationResult.commandResults ?? []).filter((row) => row.status === "failed");
    const skipped = (verificationResult.commandResults ?? []).filter((row) => row.status === "skipped");
    const planCommandSet = new Set(commands);
    const recordedCommandSet = new Set((verificationResult.commandResults ?? []).map((row) => row.command));
    const notRun = Array.from(planCommandSet).filter(
      (command) => {
        if (!recordedCommandSet.has(command)) {
          return true;
        }

        const matched = (verificationResult.commandResults ?? []).find((row) => row.command === command);
        return matched?.status === "not-run";
      },
    );

    if (failed.length === 0 && skipped.length === 0 && notRun.length === 0) {
      sections.push("- All recorded commands passed; no missing evidence.");
      sections.push("");
    } else {
      for (const row of failed) {
        sections.push(`- Failed: \`${row.command ?? "—"}\`${row.notes ? ` — ${row.notes}` : ""}`);
      }
      for (const row of skipped) {
        sections.push(`- Skipped: \`${row.command ?? "—"}\`${row.notes ? ` — ${row.notes}` : ""}`);
      }
      for (const command of notRun) {
        sections.push(`- Not-run: \`${command}\``);
      }
      sections.push("");
    }
  }

  // Remediation Context
  sections.push("## Remediation Context");
  sections.push("");

  const remediationItems = remediationWorkOrder?.remediationItems
    ?? (coherencyDelta?.remediationQueue ?? []).map((step) => ({
      findingId: step.findingId,
      priority: step.priority,
      severity: step.severity,
      systems: step.systems,
      files: step.files,
      title: step.title,
      action: step.action,
    }));

  if (!remediationItems || remediationItems.length === 0) {
    sections.push("No remediation items linked to this proof loop.");
    sections.push("");
  } else {
    sections.push("| Priority | Finding | Severity | Systems | Files |");
    sections.push("| --- | --- | --- | --- | --- |");
    for (const item of remediationItems.slice(0, 10)) {
      sections.push(
        `| ${item.priority ?? "—"} | ${truncate(item.findingId ?? "—", 50)} | ${item.severity ?? "—"} | ${summarizeList(item.systems ?? [], 3)} | ${summarizeList(item.files ?? [], 3)} |`,
      );
    }
    if (remediationItems.length > 10) {
      sections.push(`| _… ${remediationItems.length - 10} more remediation items_ | | | | |`);
    }
    sections.push("");
  }

  // Reconciliation Context
  sections.push("## Reconciliation Context");
  sections.push("");

  if (!reconciliationPlan) {
    sections.push("No ReconciliationPlan linked to this proof loop.");
    sections.push("");
  } else {
    const operations = reconciliationPlan.operations ?? [];

    if (operations.length === 0) {
      sections.push("ReconciliationPlan has no classified operations.");
      sections.push("");
    } else {
      sections.push("| Operation | Class | Status | Permission |");
      sections.push("| --- | --- | --- | --- |");
      for (const op of operations.slice(0, 10)) {
        const permission = op.requiresPermission?.length ? op.requiresPermission.join(", ") : "—";
        sections.push(
          `| ${op.operation ?? "—"} | ${op.class ?? "—"} | ${op.status ?? "—"} | ${permission} |`,
        );
      }
      if (operations.length > 10) {
        sections.push(`| _… ${operations.length - 10} more operations_ | | | |`);
      }
      sections.push("");
    }
  }

  // Next Recommended Action
  sections.push("## Next Recommended Action");
  sections.push("");

  for (const line of buildProofReportNextActions(verificationPlan, verificationResult)) {
    sections.push(`- ${line}`);
  }
  sections.push("");

  // Input Artifacts
  sections.push("## Input Artifacts");
  sections.push("");

  if (inputRefs.length === 0) {
    sections.push("- _none_");
  } else {
    for (const ref of inputRefs) {
      sections.push(`- ${formatRef(ref)}`);
    }
  }

  return sections.join("\n");
}

function buildProofReportNextActions(
  verificationPlan: VerificationPlanLike | undefined,
  verificationResult: VerificationResultLike | undefined,
): string[] {
  if (!verificationPlan) {
    return [
      "Run `rekon intent work-order` or `rekon intent remediation` to plan work and a VerificationPlan.",
    ];
  }

  if (!verificationResult) {
    return [
      "Run `rekon verify record` to capture proof against the latest VerificationPlan.",
    ];
  }

  const status = verificationResult.status ?? "not-run";

  switch (status) {
    case "failed":
      return [
        "Fix the failing checks and record a new VerificationResult with `rekon verify record`.",
        "Do not modify tests or validators to make the gate appear green.",
      ];
    case "partial":
    case "not-run":
      return [
        "Complete the missing checks and record an updated VerificationResult with `rekon verify record`.",
      ];
    case "passed":
      return [
        "Re-run `rekon evaluate` -> `rekon findings lifecycle` -> `rekon coherency delta` to confirm addressed findings are no longer active.",
        "Re-run `rekon publish architecture` if you want the architecture summary to reflect the latest proof.",
      ];
    default:
      return ["Inspect the latest VerificationResult and decide the next step manually."];
  }
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

type AgentContractInputs = {
  snapshot: IntelligenceSnapshot;
  observedRepo?: ObservedRepo;
  ownershipMap?: OwnershipMap;
  capabilityMap?: CapabilityMap;
  coherencyDelta?: CoherencyDelta;
  lifecycleReport?: FindingLifecycleReport;
  remediationWorkOrder?: WorkOrderLike;
  resolverWorkOrder?: WorkOrderLike;
  reconciliationPlan?: ReconciliationPlanLike;
  verificationPlan?: VerificationPlanLike;
  verificationPlanRef?: ArtifactRef;
  verificationResult?: VerificationResultLike;
  memorySelection?: MemorySelectionLike;
  memoryCurationReport?: MemoryCurationReportLike;
  inputRefs: ArtifactRef[];
  generatedAt: string;
};

const DEFAULT_AGENT_CONTRACT_CHECKS = [
  "npm run typecheck",
  "npm run test",
  "npm run build",
  "rekon artifacts validate --json",
  "rekon artifacts freshness --json",
];

const AGENT_CONTRACT_OPERATING_RULES = [
  "Resolve route/seam/preflight before editing code.",
  "Do not cross owner systems without resolving a seam.",
  "Do not claim completion without a VerificationResult.",
  "Do not weaken tests, validators, rules, status ledgers, or verification scripts to make work appear complete.",
  "Do not mutate findings, status ledgers, or memory to hide unresolved work.",
  "Publications are guidance; canonical truth lives in `.rekon/artifacts`.",
];

const AGENT_CONTRACT_DO_NOT_DO = [
  "Do not bypass failing checks.",
  "Do not remove tests or weaken validators to pass verification.",
  "Do not change rules, findings, or status ledgers to hide work.",
  "Do not ignore stale artifacts; re-run `rekon refresh` instead.",
  "Do not apply source-writing reconciliation unless an explicit future capability enables it under `write:source` permission.",
];

function renderAgentContract(input: AgentContractInputs): string {
  const {
    snapshot,
    observedRepo,
    ownershipMap,
    capabilityMap,
    coherencyDelta,
    lifecycleReport,
    remediationWorkOrder,
    resolverWorkOrder,
    reconciliationPlan,
    verificationPlan,
    verificationPlanRef,
    verificationResult,
    memorySelection,
    memoryCurationReport,
    inputRefs,
    generatedAt,
  } = input;
  const sections: string[] = [];

  sections.push("# Rekon Agent Operating Contract");
  sections.push("");
  sections.push(`Generated: ${generatedAt}`);
  sections.push(`Snapshot: ${snapshot.header.artifactId}`);
  sections.push("");

  // How To Use
  sections.push("## How To Use This Contract");
  sections.push("");
  sections.push("- Read this before editing any code in this repository.");
  sections.push("- Use it to orient your work, not to replace direct inspection of the artifacts it cites.");
  sections.push("- This document is generated. Inspect the input artifacts when in doubt.");
  sections.push("");

  // Canonical Truth
  sections.push("## Canonical Truth");
  sections.push("");
  sections.push("Canonical truth lives in `.rekon/artifacts`. This publication is generated from input artifacts and may be stale.");
  sections.push("Run `rekon artifacts freshness --json` to verify freshness, and `rekon refresh` to rebuild the proof-loop state.");
  sections.push("");

  // Operating Rules
  sections.push("## Operating Rules");
  sections.push("");
  for (const rule of AGENT_CONTRACT_OPERATING_RULES) {
    sections.push(`- ${rule}`);
  }
  sections.push("");

  // Resolver Workflow
  sections.push("## Resolver Workflow");
  sections.push("");
  sections.push("Use the resolver flow before editing:");
  sections.push("");
  sections.push("```");
  sections.push("route → seam (if cross-owner) → preflight");
  sections.push("issue → seam/preflight (depending on owner spread)");
  sections.push("```");
  sections.push("");
  sections.push("Commands:");
  sections.push("");
  sections.push("- `rekon resolve route --path <path> --goal <goal>`");
  sections.push("- `rekon resolve seam --path <path> --goal <goal>`");
  sections.push("- `rekon resolve preflight --path <path> --goal <goal>`");
  sections.push("- `rekon resolve issue --issue <id-or-fragment>`");
  sections.push("");
  sections.push("Every resolver packet carries a `resolutionTrace` explaining which artifacts were consulted and why. Trust the trace over your inference.");
  sections.push("");

  // Ownership And Capabilities
  sections.push("## Ownership And Capabilities");
  sections.push("");
  const systems = observedRepo?.systems ?? [];
  const capabilities = capabilityMap?.entries ?? [];

  if (systems.length === 0 && capabilities.length === 0) {
    sections.push("No ownership/capability model found. Run `rekon refresh`.");
    sections.push("");
  } else {
    if (systems.length > 0) {
      sections.push("| System | Paths | Capabilities |");
      sections.push("| --- | --- | --- |");
      for (const system of systems.slice(0, 10)) {
        sections.push(
          `| ${system.id} | ${summarizeList(system.paths, 3)} | ${summarizeList(system.capabilities, 3)} |`,
        );
      }
      if (systems.length > 10) {
        sections.push(`| _… ${systems.length - 10} more systems_ | | |`);
      }
      sections.push("");
    }
    if (capabilities.length > 0) {
      const truncated = capabilities.slice(0, 10);
      sections.push("Capabilities:");
      for (const cap of truncated) {
        sections.push(
          `- **${cap.capability}** — subjects: ${summarizeList(cap.subjects, 3)}; systems: ${summarizeList(cap.systems, 3)}`,
        );
      }
      if (capabilities.length > 10) {
        sections.push(`- _… ${capabilities.length - 10} more capabilities_`);
      }
      sections.push("");
    }
    if (ownershipMap) {
      sections.push(`Ownership entries: ${ownershipMap.entries.length}.`);
      sections.push("");
    }
  }

  // Active Governance State
  sections.push("## Active Governance State");
  sections.push("");
  if (!coherencyDelta) {
    sections.push("No CoherencyDelta found. Run `rekon coherency delta` or `rekon refresh`.");
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

    if (summary.topPaths.length > 0) {
      sections.push("");
      sections.push("Top affected paths:");
      for (const entry of summary.topPaths.slice(0, 5)) {
        sections.push(`- \`${entry.path}\` (${entry.count})`);
      }
    }

    const queue = coherencyDelta.remediationQueue ?? [];
    if (queue.length > 0) {
      sections.push("");
      sections.push("Remediation queue:");
      const counts: Record<string, number> = { p0: 0, p1: 0, p2: 0 };
      for (const step of queue) {
        counts[step.priority] = (counts[step.priority] ?? 0) + 1;
      }
      sections.push(`- P0: ${counts.p0 ?? 0}, P1: ${counts.p1 ?? 0}, P2: ${counts.p2 ?? 0}`);
    }
    sections.push("");

    if (lifecycleReport) {
      sections.push(
        `Lifecycle: ${lifecycleReport.summary.active} active, ${lifecycleReport.summary.accepted} accepted, ${lifecycleReport.summary.ignored} ignored, ${lifecycleReport.summary.resolved} resolved.`,
      );
      sections.push("");
    }
  }

  // Proof And Verification State
  sections.push("## Proof And Verification State");
  sections.push("");
  const havePlan = Boolean(verificationPlan ?? verificationPlanRef);
  const haveResult = Boolean(verificationResult);
  const haveRemediationWO = Boolean(remediationWorkOrder);
  const haveResolverWO = Boolean(resolverWorkOrder);
  const haveReconciliation = Boolean(reconciliationPlan);
  const resultStatus = verificationResult?.status;

  sections.push(`- Remediation WorkOrder: ${haveRemediationWO ? "present" : "missing"}`);
  sections.push(`- Resolver WorkOrder: ${haveResolverWO ? "present" : "missing"}`);
  sections.push(`- ReconciliationPlan: ${haveReconciliation ? "present" : "missing"}`);
  sections.push(`- VerificationPlan: ${havePlan ? "present" : "missing"}`);
  sections.push(
    `- VerificationResult: ${haveResult ? `status ${resultStatus ?? "not-run"}` : "missing"}`,
  );

  if (resultStatus === "failed" || resultStatus === "partial" || resultStatus === "not-run") {
    sections.push("");
    sections.push("> Verification is not complete.");
  } else if (resultStatus === "passed") {
    sections.push("");
    sections.push("> Verification recorded as passed. This does not automatically resolve findings.");
  }

  if (verificationResult?.summary) {
    const sum = verificationResult.summary;
    sections.push("");
    sections.push(
      `Verification summary: passed ${sum.passed ?? 0} / failed ${sum.failed ?? 0} / skipped ${sum.skipped ?? 0} / not-run ${sum.notRun ?? 0}.`,
    );
  }

  if (verificationPlanRef && verificationResult?.verificationPlanRef
    && verificationResult.verificationPlanRef.id !== verificationPlanRef.id) {
    sections.push("");
    sections.push("> VerificationResult may be stale; the latest VerificationPlan differs.");
  }
  sections.push("");

  // Memory Guidance
  sections.push("## Memory Guidance");
  sections.push("");
  if (!memorySelection) {
    sections.push("No MemorySelection found. Run `rekon memory select --path <path> --goal <goal>` to populate.");
    sections.push("");
  } else {
    const selected = (memorySelection.selected ?? memorySelection.selections ?? []) as MemorySelectionItemLike[];
    const rankedItems = selected.filter((item) => Array.isArray(item.reasons) && item.reasons.length > 0);

    if (rankedItems.length === 0) {
      sections.push("Latest MemorySelection contains no ranked entries with reasons.");
      sections.push("Run `rekon memory select` after adding scoped memory with `rekon memory add --system <system> --priority high --verified`.");
      sections.push("");
    } else {
      sections.push(`Memory query: \`${memorySelection.path ?? "(unknown)"}\``);
      if (memorySelection.goal) {
        sections.push(`Memory goal: \`${memorySelection.goal}\``);
      }
      sections.push("");
      sections.push("| Score | Instruction | Scope | Reasons |");
      sections.push("| --- | --- | --- | --- |");
      for (const item of rankedItems.slice(0, 10)) {
        const score = typeof item.score === "number" ? item.score.toFixed(2) : "—";
        const reasons = (item.reasons ?? []).join("; ");
        const scope = summarizeScope(item.scope);
        const instruction = truncate(item.instruction ?? "—", 80);
        sections.push(
          `| ${score} | ${escapeCell(instruction)} | ${escapeCell(scope)} | ${escapeCell(reasons)} |`,
        );
      }
      if (rankedItems.length > 10) {
        sections.push(`| _… ${rankedItems.length - 10} more entries_ | | | |`);
      }
      sections.push("");
      sections.push("Memory enriches guidance but does not rewrite ownership, rules, or findings.");
      sections.push("");
    }
  }

  if (memoryCurationReport?.summary) {
    const summary = memoryCurationReport.summary;
    const review = summary.review ?? 0;
    const reinforce = summary.reinforce ?? 0;
    const deprecate = summary.deprecate ?? 0;
    const supersedeCandidate = summary.supersedeCandidate ?? 0;
    sections.push("### Memory Curation Status");
    sections.push("");
    sections.push(`- memories needing review: ${review}`);
    sections.push(`- reinforce candidates: ${reinforce}`);
    if (deprecate > 0) {
      sections.push(`- deprecate candidates: ${deprecate}`);
    }
    if (supersedeCandidate > 0) {
      sections.push(`- supersede candidates: ${supersedeCandidate}`);
    }
    sections.push("");
    sections.push("Curation recommendations are suggestions. Run `rekon memory curation` to refresh.");
    sections.push("");
  }

  // Required Checks
  sections.push("## Required Checks");
  sections.push("");
  const requiredChecks = verificationPlan?.commands && verificationPlan.commands.length > 0
    ? verificationPlan.commands
    : DEFAULT_AGENT_CONTRACT_CHECKS;
  for (const check of requiredChecks) {
    sections.push(`- \`${check}\``);
  }
  sections.push("");

  // Do Not Do
  sections.push("## Do Not Do");
  sections.push("");
  for (const rule of AGENT_CONTRACT_DO_NOT_DO) {
    sections.push(`- ${rule}`);
  }
  sections.push("");

  // Next Recommended Actions
  sections.push("## Next Recommended Actions");
  sections.push("");
  for (const action of buildAgentContractNextActions({
    coherencyDelta,
    haveRemediationWO,
    haveResolverWO,
    haveReconciliation,
    havePlan,
    haveResult,
    resultStatus,
    haveMemory: Boolean(memorySelection),
  })) {
    sections.push(`- ${action}`);
  }
  sections.push("");

  // Input Artifacts
  sections.push("## Input Artifacts");
  sections.push("");
  if (inputRefs.length === 0) {
    sections.push("- _none_");
  } else {
    for (const ref of inputRefs) {
      sections.push(`- ${formatRef(ref)}`);
    }
  }

  return sections.join("\n");
}

function buildAgentContractNextActions(state: {
  coherencyDelta?: CoherencyDelta;
  haveRemediationWO: boolean;
  haveResolverWO: boolean;
  haveReconciliation: boolean;
  havePlan: boolean;
  haveResult: boolean;
  resultStatus?: "passed" | "failed" | "partial" | "not-run";
  haveMemory: boolean;
}): string[] {
  const actions: string[] = [];

  if (!state.coherencyDelta) {
    actions.push("Run `rekon refresh` to produce a coherent intelligence state.");
    return actions;
  }

  const activeFindings = state.coherencyDelta.summary.active ?? 0;

  if (activeFindings > 0 && !state.haveRemediationWO) {
    actions.push("Run `rekon intent remediation` to plan work for active findings.");
  }

  if (state.haveRemediationWO && !state.haveReconciliation) {
    actions.push("Run `rekon reconcile suggest` to classify reconciliation operations.");
  }

  if (state.havePlan && !state.haveResult) {
    actions.push("Run `rekon verify record` to capture proof against the latest VerificationPlan.");
  }

  if (state.resultStatus === "failed" || state.resultStatus === "partial" || state.resultStatus === "not-run") {
    actions.push("Address verification failures and re-run `rekon verify record`.");
  }

  if (!state.haveMemory) {
    actions.push("Run `rekon memory select --path <path> --goal <goal>` to surface relevant memory guidance.");
  }

  if (actions.length === 0) {
    actions.push("Proceed with scoped changes; re-run `rekon refresh` after completion to confirm coherent state.");
  }

  return actions;
}

function summarizeScope(scope: Record<string, unknown> | undefined): string {
  if (!scope) {
    return "—";
  }

  const parts: string[] = [];
  const paths = scope.paths;

  if (Array.isArray(paths) && paths.length > 0) {
    parts.push(`paths: ${(paths as string[]).slice(0, 2).join(", ")}`);
  }

  const systems = scope.systems;

  if (Array.isArray(systems) && systems.length > 0) {
    parts.push(`systems: ${(systems as string[]).slice(0, 2).join(", ")}`);
  }

  const capabilities = scope.capabilities;

  if (Array.isArray(capabilities) && capabilities.length > 0) {
    parts.push(`capabilities: ${(capabilities as string[]).slice(0, 2).join(", ")}`);
  }

  const tags = scope.tags;

  if (Array.isArray(tags) && tags.length > 0) {
    parts.push(`tags: ${(tags as string[]).slice(0, 2).join(", ")}`);
  }

  return parts.length > 0 ? parts.join("; ") : "—";
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

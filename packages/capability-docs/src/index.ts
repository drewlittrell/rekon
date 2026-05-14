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

type VerificationResultLike = {
  header: ArtifactHeader;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  status?: "passed" | "failed" | "partial" | "not-run";
  commandResults?: Array<{ command?: string; status?: string }>;
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

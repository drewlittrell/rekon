import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type CoherencyDelta,
  type FindingFilterHealthReport,
  type FindingFilterPolicyFingerprint,
  type FindingFilterPolicyRule,
  type FindingFilterPolicySuggestionReport,
  type FindingFilterReport,
  type FindingLifecycleReport,
  type IssueAdjudicationReport,
  fingerprintFindingFilterPolicies,
  validateFindingFilterPolicyRules,
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
  async publish({ artifacts, input }) {
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
    const issueAdjudicationReport = await readLatestArtifact<IssueAdjudicationReport>(
      artifacts,
      "IssueAdjudicationReport",
      inputRefs,
    );
    const lifecycleReport = await readLatestArtifact<FindingLifecycleReport>(
      artifacts,
      "FindingLifecycleReport",
      inputRefs,
    );
    // Finding filter audit + health (P1.1 filter-health publication surfaces).
    // When present, both artifacts are cited in inputRefs so freshness flags
    // the publication stale when a newer filter run lands.
    const findingFilterReport = await readLatestArtifact<FindingFilterReport>(
      artifacts,
      "FindingFilterReport",
      inputRefs,
    );
    const findingFilterHealthReport = await readLatestArtifact<FindingFilterHealthReport>(
      artifacts,
      "FindingFilterHealthReport",
      inputRefs,
    );
    // Filter policy suggestions (P1.1 filter-policy-suggestions
    // publication surfaces). The publication renders the report
    // when present and emits stale-source guidance when the
    // suggestion report cites older filter reports than the
    // latest indexed one.
    const findingFilterPolicySuggestionReport =
      await readLatestArtifact<FindingFilterPolicySuggestionReport>(
        artifacts,
        "FindingFilterPolicySuggestionReport",
        inputRefs,
      );
    const findingFilterPolicySuggestionStale = computeFilterPolicySuggestionStale(
      findingFilterPolicySuggestionReport,
      findingFilterReport,
    );
    // Filter-policy freshness (P1.1 filter-policy-freshness v2):
    // compare the fingerprint of the current `.rekon/config.json`
    // `findingFilters` against the fingerprint stamped on the
    // latest FindingFilterReport. The publisher reads config
    // directly so the warning is rendered into the markdown body.
    const repoRoot = resolveRepoRoot(input);
    const currentPolicies = repoRoot
      ? await loadCurrentFindingFilterPolicies(repoRoot)
      : undefined;
    const findingFilterPolicyStaleness = computeFilterPolicyStaleness({
      currentFingerprint: currentPolicies?.fingerprint,
      filterReport: findingFilterReport,
    });
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
    const freshness = await detectGovernanceFreshness(artifacts);

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
        issueAdjudicationReport,
        lifecycleReport,
        findingFilterReport,
        findingFilterHealthReport,
        findingFilterPolicySuggestionReport,
        findingFilterPolicySuggestionStale,
        findingFilterPolicyStaleness,
        remediationWorkOrder: workOrders.remediation,
        resolverWorkOrder: workOrders.resolver,
        reconciliationPlan,
        latestVerificationPlanRef,
        verificationPlan,
        verificationResult,
        freshness,
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
  async publish({ artifacts, input }) {
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
    const issueAdjudicationReport = await readLatestArtifact<IssueAdjudicationReport>(
      artifacts,
      "IssueAdjudicationReport",
      inputRefs,
    );
    const lifecycleReport = await readLatestArtifact<FindingLifecycleReport>(
      artifacts,
      "FindingLifecycleReport",
      inputRefs,
    );
    // Finding filter audit + health surfaces (P1.1 filter-health
    // publication surfaces). The agent contract uses both to make
    // suppression visible and to discourage agents from treating a
    // clean active surface as a clean codebase.
    const findingFilterReport = await readLatestArtifact<FindingFilterReport>(
      artifacts,
      "FindingFilterReport",
      inputRefs,
    );
    const findingFilterHealthReport = await readLatestArtifact<FindingFilterHealthReport>(
      artifacts,
      "FindingFilterHealthReport",
      inputRefs,
    );
    // Filter policy suggestions (P1.1 filter-policy-suggestions
    // publication surfaces). Agent contract makes the durable-
    // policy candidate path visible and reminds the agent that
    // applying suggestions requires explicit operator approval.
    const findingFilterPolicySuggestionReport =
      await readLatestArtifact<FindingFilterPolicySuggestionReport>(
        artifacts,
        "FindingFilterPolicySuggestionReport",
        inputRefs,
      );
    const findingFilterPolicySuggestionStale = computeFilterPolicySuggestionStale(
      findingFilterPolicySuggestionReport,
      findingFilterReport,
    );
    // Filter-policy freshness — mirrors the architecture summary
    // (P1.1 filter-policy-freshness v2). Agent contract surfaces
    // the warning under `Active Governance State` and adds a
    // Do Not Do reminder against acting on stale governance
    // after a policy change.
    const repoRoot = resolveRepoRoot(input);
    const currentPolicies = repoRoot
      ? await loadCurrentFindingFilterPolicies(repoRoot)
      : undefined;
    const findingFilterPolicyStaleness = computeFilterPolicyStaleness({
      currentFingerprint: currentPolicies?.fingerprint,
      filterReport: findingFilterReport,
    });
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
        issueAdjudicationReport,
        lifecycleReport,
        findingFilterReport,
        findingFilterHealthReport,
        findingFilterPolicySuggestionReport,
        findingFilterPolicySuggestionStale,
        findingFilterPolicyStaleness,
        remediationWorkOrder: workOrders.remediation,
        resolverWorkOrder: workOrders.resolver,
        reconciliationPlan,
        verificationPlan,
        verificationPlanRef: latestVerificationPlanRef,
        verificationResult,
        memorySelection,
        memoryCurationReport,
        freshness: await detectGovernanceFreshness(artifacts),
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
      "IssueAdjudicationReport",
      "FindingLifecycleReport",
      "FindingFilterReport",
      "FindingFilterHealthReport",
      "FindingFilterPolicySuggestionReport",
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
        id: "issue-adjudication.changed",
        description:
          "Regenerate publications when adjudicated issue groups change so governed counts stay current.",
        inputs: ["IssueAdjudicationReport"],
      },
      {
        id: "finding-filter.changed",
        description:
          "Regenerate publications when filtering / filter-health changes so the rendered filter-health and policy-freshness sections stay current. The latest FindingFilterReport stamps a `policyFingerprint`; the publication's Finding Filter Policy Freshness section compares it against the current `.rekon/config.json` `findingFilters` fingerprint and warns on drift.",
        inputs: ["FindingFilterReport", "FindingFilterHealthReport"],
      },
      {
        id: "finding-filter-policy-suggestions.changed",
        description:
          "Regenerate publications when filter-policy suggestions change so the rendered suggestions section stays current.",
        inputs: ["FindingFilterPolicySuggestionReport"],
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

type GovernanceFreshness = {
  adjudication: {
    status: "fresh" | "stale" | "missing";
    artifactId?: string;
    citedLifecycleId?: string;
    latestLifecycleId?: string;
  };
  coherency: {
    status: "fresh" | "stale" | "missing";
    artifactId?: string;
    citedAdjudicationId?: string;
    builtFrom?: "adjudication" | "lifecycle";
    latestAdjudicationId?: string;
  };
  warnings: string[];
  recommendedCommand?: string;
};

async function detectGovernanceFreshness(
  artifacts: {
    list(type?: string): Promise<ArtifactRef[]>;
    read(ref: ArtifactRef): Promise<unknown>;
  },
): Promise<GovernanceFreshness> {
  const warnings: string[] = [];

  const adjudicationEntries = await artifacts.list("IssueAdjudicationReport");
  const latestAdjudication = latestById(adjudicationEntries);

  const lifecycleEntries = await artifacts.list("FindingLifecycleReport");
  const latestLifecycle = latestById(lifecycleEntries);

  const adjudication: GovernanceFreshness["adjudication"] = {
    status: "missing",
  };

  if (latestAdjudication) {
    adjudication.artifactId = latestAdjudication.id;
    const adjudicationBody = (await artifacts.read(latestAdjudication)) as {
      header?: { inputRefs?: ArtifactRef[] };
    };
    const citedLifecycle = (adjudicationBody.header?.inputRefs ?? []).find(
      (ref) => ref.type === "FindingLifecycleReport",
    );
    if (citedLifecycle) {
      adjudication.citedLifecycleId = citedLifecycle.id;
    }
    if (latestLifecycle) {
      adjudication.latestLifecycleId = latestLifecycle.id;
    }
    if (
      citedLifecycle
      && latestLifecycle
      && citedLifecycle.id !== latestLifecycle.id
    ) {
      adjudication.status = "stale";
      warnings.push(
        `IssueAdjudicationReport:${latestAdjudication.id} may be stale: it cites FindingLifecycleReport:${citedLifecycle.id} but the latest FindingLifecycleReport is ${latestLifecycle.id}.`,
      );
    } else {
      adjudication.status = "fresh";
    }
  }

  const coherencyEntries = await artifacts.list("CoherencyDelta");
  const latestCoherency = latestById(coherencyEntries);

  const coherency: GovernanceFreshness["coherency"] = {
    status: "missing",
  };

  if (latestCoherency) {
    coherency.artifactId = latestCoherency.id;
    const coherencyBody = (await artifacts.read(latestCoherency)) as {
      header?: { inputRefs?: ArtifactRef[] };
      items?: Array<{ issueGroupId?: string }>;
    };
    const citedAdjudication = (coherencyBody.header?.inputRefs ?? []).find(
      (ref) => ref.type === "IssueAdjudicationReport",
    );
    const itemsCameFromAdjudication = (coherencyBody.items ?? []).some(
      (item) => Boolean(item.issueGroupId),
    );
    coherency.builtFrom = citedAdjudication || itemsCameFromAdjudication
      ? "adjudication"
      : "lifecycle";

    if (citedAdjudication) {
      coherency.citedAdjudicationId = citedAdjudication.id;
    }
    if (latestAdjudication) {
      coherency.latestAdjudicationId = latestAdjudication.id;
    }

    if (coherency.builtFrom === "adjudication") {
      if (
        citedAdjudication
        && latestAdjudication
        && citedAdjudication.id !== latestAdjudication.id
      ) {
        coherency.status = "stale";
        warnings.push(
          `CoherencyDelta:${latestCoherency.id} may be stale: it cites IssueAdjudicationReport:${citedAdjudication.id} but the latest IssueAdjudicationReport is ${latestAdjudication.id}.`,
        );
      } else if (adjudication.status === "stale") {
        coherency.status = "stale";
        warnings.push(
          `CoherencyDelta:${latestCoherency.id} may be transitively stale: its IssueAdjudicationReport is stale relative to the latest FindingLifecycleReport.`,
        );
      } else {
        coherency.status = "fresh";
      }
    } else {
      // lifecycle-mode delta
      if (latestAdjudication) {
        coherency.status = "stale";
        warnings.push(
          `CoherencyDelta:${latestCoherency.id} was built from raw FindingLifecycleReport but an IssueAdjudicationReport:${latestAdjudication.id} now exists; rebuild for governed issue-group counts.`,
        );
      } else {
        coherency.status = "fresh";
      }
    }
  }

  let recommendedCommand: string | undefined;
  if (warnings.length > 0) {
    recommendedCommand = "rekon refresh";
  } else if (adjudication.status === "missing" && latestLifecycle) {
    recommendedCommand = "rekon issues adjudicate";
  }

  return {
    adjudication,
    coherency,
    warnings,
    recommendedCommand,
  };
}

function formatRef(ref: ArtifactRef): string {
  return `${ref.type}:${ref.id}@${ref.schemaVersion}`;
}

function countRefs(groups: Record<string, ArtifactRef[]>): number {
  return Object.values(groups).reduce((total, refs) => total + refs.length, 0);
}

/**
 * Pull the repo root out of the runtime-injected publisher input.
 * Returns `undefined` when the input shape doesn't match — keeps
 * the publishers usable in synthetic tests that omit `repo`.
 */
function resolveRepoRoot(input: Record<string, unknown> | undefined): string | undefined {
  const repo = input?.repo;
  if (!repo || typeof repo !== "object") return undefined;
  const root = (repo as { root?: unknown }).root;
  return typeof root === "string" && root.length > 0 ? root : undefined;
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
  issueAdjudicationReport?: IssueAdjudicationReport;
  lifecycleReport?: FindingLifecycleReport;
  findingFilterReport?: FindingFilterReport;
  findingFilterHealthReport?: FindingFilterHealthReport;
  findingFilterPolicySuggestionReport?: FindingFilterPolicySuggestionReport;
  findingFilterPolicySuggestionStale?: FilterPolicySuggestionStaleness;
  findingFilterPolicyStaleness?: FilterPolicyStaleness;
  remediationWorkOrder?: WorkOrderLike;
  resolverWorkOrder?: WorkOrderLike;
  reconciliationPlan?: ReconciliationPlanLike;
  latestVerificationPlanRef?: ArtifactRef;
  verificationPlan?: VerificationPlanLike;
  verificationResult?: VerificationResultLike;
  freshness?: GovernanceFreshness;
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
    issueAdjudicationReport,
    lifecycleReport,
    findingFilterReport,
    findingFilterHealthReport,
    findingFilterPolicySuggestionReport,
    findingFilterPolicySuggestionStale,
    findingFilterPolicyStaleness,
    freshness,
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

  const coherencyIsGrouped = coherencyDeltaCameFromAdjudication(coherencyDelta);
  const coherencyUnit = coherencyIsGrouped ? "governed issue groups" : "findings";

  if (!coherencyDelta) {
    sections.push(
      "No CoherencyDelta found. Run `rekon coherency delta` for governance summary.",
    );
    sections.push("");
  } else {
    const summary = coherencyDelta.summary;
    if (coherencyIsGrouped) {
      sections.push(
        "Counts reflect adjudicated issue groups (CoherencyDelta was built from the latest IssueAdjudicationReport).",
      );
    } else {
      sections.push(
        "Counts reflect raw lifecycle findings (no IssueAdjudicationReport was indexed when CoherencyDelta was built).",
      );
    }
    sections.push(`- Active ${coherencyUnit}: ${summary.active}`);
    sections.push(`- Accepted: ${summary.accepted}`);
    sections.push(`- Ignored: ${summary.ignored}`);
    sections.push(`- Resolved: ${summary.resolved}`);
    sections.push("- By severity:");
    for (const severity of ["critical", "high", "medium", "low"] as const) {
      sections.push(`  - ${severity}: ${summary.bySeverity[severity] ?? 0}`);
    }
    sections.push("");
  }

  // Governed Issue Groups
  sections.push("## Governed Issue Groups");
  sections.push("");

  if (!issueAdjudicationReport) {
    sections.push(
      "No IssueAdjudicationReport found. Run `rekon issues adjudicate` or `rekon refresh` for governed issue context. Raw lifecycle counts above may overstate drift when duplicate findings exist.",
    );
    sections.push("");
  } else {
    const adj = issueAdjudicationReport.summary;
    sections.push(`- Total groups: ${adj.totalGroups}`);
    sections.push(`- Active groups: ${adj.activeGroups}`);
    sections.push(`- Accepted groups: ${adj.acceptedGroups}`);
    sections.push(`- Ignored groups: ${adj.ignoredGroups}`);
    sections.push(`- Resolved groups: ${adj.resolvedGroups}`);
    sections.push(`- Mixed groups: ${adj.mixedGroups}`);
    sections.push(`- Total member findings: ${adj.groupedFindings} (across ${adj.totalGroups} group${adj.totalGroups === 1 ? "" : "s"})`);
    sections.push("");

    const groups = issueAdjudicationReport.groups ?? [];
    if (groups.length === 0) {
      sections.push("No adjudicated issue groups recorded.");
      sections.push("");
    } else {
      sections.push("| Group | Status | Severity | Type | Members | Files |");
      sections.push("| --- | --- | --- | --- | --- | --- |");
      for (const group of groups.slice(0, 20)) {
        const memberSummary = summarizeMembers(group.memberFindingIds);
        const filesSummary = summarizeList(group.files ?? [], 3);
        sections.push(
          `| ${truncate(group.id, 40)} | ${group.status} | ${group.severity} | ${truncate(group.type, 40)} | ${memberSummary} | ${filesSummary} |`,
        );
      }
      if (groups.length > 20) {
        sections.push(`| _… ${groups.length - 20} more groups_ | | | | | |`);
      }
      sections.push("");
      sections.push(
        "Use `rekon resolve issue --issue <group-id>` for adjudicated issue context. Raw member findings remain traceable via `memberFindingIds` on each group and in the resolver packet.",
      );
      sections.push("");
    }
  }

  // Accepted Issue Merge Roll-ups — derived from CoherencyDelta v3.
  sections.push("## Accepted Issue Merge Roll-ups");
  sections.push("");

  const mergedRollups = coherencyDelta
    ? collectMergedRollups(coherencyDelta)
    : [];

  if (!coherencyDelta) {
    sections.push(
      "No CoherencyDelta found; accepted merge roll-ups cannot be displayed. Run `rekon coherency delta` after recording any operator merge decisions.",
    );
    sections.push("");
  } else if (mergedRollups.length === 0) {
    sections.push("No accepted issue merge roll-ups in latest CoherencyDelta.");
    sections.push("");
  } else {
    sections.push("| Roll-up | Groups | Decision IDs | Member Findings | Severity | Status | Active |");
    sections.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const rollup of mergedRollups.slice(0, 20)) {
      sections.push(
        `| ${truncate(rollup.rollupId, 50)} | ${summarizeList(rollup.mergedIssueGroupIds, 3)} | ${summarizeList(rollup.mergeDecisionIds, 3)} | ${summarizeMembers(rollup.memberFindingIds)} | ${rollup.severity} | ${rollup.status} | ${rollup.active ? "yes" : "no"} |`,
      );
    }
    if (mergedRollups.length > 20) {
      sections.push(`| _… ${mergedRollups.length - 20} more roll-ups_ | | | | | | |`);
    }
    sections.push("");
    sections.push(
      "Roll-ups reflect operator-accepted merge decisions; underlying issue groups remain in `IssueAdjudicationReport` and are still inspectable. Use `rekon resolve issue --issue <group-id>` for context on any member group.",
    );
    sections.push("");
  }

  // Finding Filter Health — surfaces FindingFilterReport +
  // FindingFilterHealthReport so users see what was filtered, by which
  // policies, and whether any filter-health warnings exist. Filtered
  // findings are not deleted; the section always points back at the
  // FindingFilterReport audit.
  appendArchitectureFindingFilterHealth(sections, findingFilterReport, findingFilterHealthReport);

  // Finding Filter Policy Freshness — compares the current
  // `.rekon/config.json` `findingFilters` fingerprint against the
  // fingerprint stamped on the latest `FindingFilterReport`. When
  // they diverge, the operator changed policy after the filter
  // run and active governance may be stale until
  // `rekon refresh`. See P1.1 filter-policy-freshness v2.
  appendArchitectureFindingFilterPolicyFreshness(sections, findingFilterPolicyStaleness);

  // Finding Filter Policy Suggestions — surfaces the
  // FindingFilterPolicySuggestionReport so operators can see when
  // repeated filtered findings imply a durable findingFilters rule.
  // The section is always advisory; config is never mutated by
  // publication.
  appendArchitectureFindingFilterPolicySuggestions(
    sections,
    findingFilterPolicySuggestionReport,
    findingFilterPolicySuggestionStale,
    findingFilterReport,
  );

  // Freshness Warnings (only when there are warnings — keep clean output silent)
  if (freshness && freshness.warnings.length > 0) {
    sections.push("## Input Freshness Warnings");
    sections.push("");
    sections.push(
      "Counts above may not reflect the latest governance state. Inputs flagged as stale:",
    );
    sections.push("");
    for (const warning of freshness.warnings) {
      sections.push(`- ${warning}`);
    }
    sections.push("");
    sections.push(
      `Recommended command: \`${freshness.recommendedCommand ?? "rekon refresh"}\`.`,
    );
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
  issueAdjudicationReport?: IssueAdjudicationReport;
  lifecycleReport?: FindingLifecycleReport;
  findingFilterReport?: FindingFilterReport;
  findingFilterHealthReport?: FindingFilterHealthReport;
  findingFilterPolicySuggestionReport?: FindingFilterPolicySuggestionReport;
  findingFilterPolicySuggestionStale?: FilterPolicySuggestionStaleness;
  findingFilterPolicyStaleness?: FilterPolicyStaleness;
  remediationWorkOrder?: WorkOrderLike;
  resolverWorkOrder?: WorkOrderLike;
  reconciliationPlan?: ReconciliationPlanLike;
  verificationPlan?: VerificationPlanLike;
  verificationPlanRef?: ArtifactRef;
  verificationResult?: VerificationResultLike;
  memorySelection?: MemorySelectionLike;
  memoryCurationReport?: MemoryCurationReportLike;
  freshness?: GovernanceFreshness;
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
  "Do not treat raw finding count as governed issue count when an IssueAdjudicationReport exists; use governed issue groups (memberFindingIds preserves raw traceability).",
  "Do not treat accepted merge roll-ups as automatic mutation of raw issue groups; inspect mergedIssueGroupIds and memberFindingIds before editing, and consult both member groups for context.",
  "Do not treat a clean active-governance surface as proof that no raw findings exist; inspect FindingFilterReport when filter-health warnings exist or the filter rate is high.",
  "Do not apply filter policy suggestions without explicit operator approval; run `rekon findings filter-policy apply <id>` only when the operator instructs it.",
  "Do not treat filter policy suggestions as already-applied config; they are advisory until `rekon findings filter-policy apply` writes them to `.rekon/config.json`.",
  "Do not rely on active issue / coherency counts after `.rekon/config.json` `findingFilters` changed until `rekon refresh` has rebuilt the filter chain with the current policy set.",
  "Do not treat graph-aware filtering as proof that the underlying issue never existed; inspect `FindingFilterReport.filteredFindings` for the structural evidence (sibling-file existence, import-graph facts, capability ownership, module-kind routing) before drawing conclusions.",
];

function renderAgentContract(input: AgentContractInputs): string {
  const {
    snapshot,
    observedRepo,
    ownershipMap,
    capabilityMap,
    coherencyDelta,
    issueAdjudicationReport,
    lifecycleReport,
    findingFilterReport,
    findingFilterHealthReport,
    findingFilterPolicySuggestionReport,
    findingFilterPolicySuggestionStale,
    findingFilterPolicyStaleness,
    remediationWorkOrder,
    resolverWorkOrder,
    reconciliationPlan,
    verificationPlan,
    verificationPlanRef,
    verificationResult,
    memorySelection,
    memoryCurationReport,
    freshness,
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
  const coherencyIsGrouped = coherencyDeltaCameFromAdjudication(coherencyDelta);
  const coherencyUnit = coherencyIsGrouped ? "governed issue groups" : "findings";

  if (!coherencyDelta) {
    sections.push("No CoherencyDelta found. Run `rekon coherency delta` or `rekon refresh`.");
    sections.push("");
  } else {
    const summary = coherencyDelta.summary;
    if (coherencyIsGrouped) {
      sections.push(
        "Counts below reflect adjudicated issue groups (CoherencyDelta was built from the latest IssueAdjudicationReport).",
      );
    } else {
      sections.push(
        "Counts below reflect raw lifecycle findings. Run `rekon issues adjudicate` or `rekon refresh` so governed issue groups can be summarized here.",
      );
    }
    sections.push(`- Active ${coherencyUnit}: ${summary.active}`);
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

  sections.push("### Governed Issue Groups");
  sections.push("");

  if (!issueAdjudicationReport) {
    sections.push(
      "No IssueAdjudicationReport found. Run `rekon refresh` before relying on issue counts above; raw lifecycle totals may overstate drift when duplicate findings exist.",
    );
    sections.push("");
  } else {
    const adj = issueAdjudicationReport.summary;
    sections.push(`- Active governed groups: ${adj.activeGroups}`);
    sections.push(`- Accepted: ${adj.acceptedGroups}, Ignored: ${adj.ignoredGroups}, Resolved: ${adj.resolvedGroups}, Mixed: ${adj.mixedGroups}`);
    sections.push(`- Total groups: ${adj.totalGroups} covering ${adj.groupedFindings} member finding${adj.groupedFindings === 1 ? "" : "s"}.`);

    const activeGroups = (issueAdjudicationReport.groups ?? []).filter((group) => group.active);

    if (activeGroups.length > 0) {
      sections.push("");
      sections.push("Top active groups:");
      for (const group of activeGroups.slice(0, 5)) {
        const memberCount = group.memberFindingIds?.length ?? 0;
        const title = truncate(group.title ?? group.type ?? group.id, 80);
        sections.push(
          `- \`${group.id}\` — ${group.severity} — ${title} — members: ${memberCount}`,
        );
      }
      sections.push("");
    } else {
      sections.push("");
      sections.push("No active governed issue groups.");
      sections.push("");
    }

    sections.push(
      "Use `rekon resolve issue --issue <group-id>` for adjudicated issue context. Raw member findings remain traceable via `memberFindingIds` on each group.",
    );
    sections.push("");
  }

  // Accepted Issue Merge Roll-ups — derived from CoherencyDelta v3.
  sections.push("### Accepted Issue Merge Roll-ups");
  sections.push("");

  const mergedRollups = coherencyDelta
    ? collectMergedRollups(coherencyDelta)
    : [];

  if (!coherencyDelta) {
    sections.push(
      "No CoherencyDelta found; accepted merge roll-ups cannot be displayed. Run `rekon coherency delta` after recording any operator merge decisions.",
    );
    sections.push("");
  } else if (mergedRollups.length === 0) {
    sections.push("No accepted issue merge roll-ups in latest CoherencyDelta.");
    sections.push("");
  } else {
    for (const rollup of mergedRollups.slice(0, 10)) {
      const groups = summarizeList(rollup.mergedIssueGroupIds, 4);
      const decisions = summarizeList(rollup.mergeDecisionIds, 2);
      sections.push(
        `- \`${rollup.rollupId}\` — groups: ${groups} — members: ${rollup.memberFindingIds.length} — decision${rollup.mergeDecisionIds.length === 1 ? "" : "s"}: ${decisions} — severity: ${rollup.severity} — ${rollup.active ? "active" : "inactive"}`,
      );
    }
    if (mergedRollups.length > 10) {
      sections.push(`- _… ${mergedRollups.length - 10} more roll-ups_`);
    }
    sections.push("");
    sections.push(
      "When working on a merged roll-up, inspect every member group and finding id before editing. Use `rekon resolve issue --issue <group-id>` for context on any member group.",
    );
    sections.push("");
  }

  // Finding Filter Health — agent-facing subsection mirroring the
  // architecture summary's Finding Filter Health section. Surfaces
  // kept/filtered counts, configured-policy activity, and
  // filter-health warnings so agents do not treat a clean active
  // surface as proof of a clean codebase.
  appendAgentContractFindingFilterHealth(sections, findingFilterReport, findingFilterHealthReport);

  // Finding Filter Policy Freshness — agent-facing subsection.
  // Warns that `.rekon/config.json` `findingFilters` changed
  // after the latest FindingFilterReport and active governance
  // may be stale until `rekon refresh`. P1.1
  // filter-policy-freshness v2.
  appendAgentContractFindingFilterPolicyFreshness(sections, findingFilterPolicyStaleness);

  // Finding Filter Policy Suggestions — agent-facing subsection
  // mirroring the architecture summary's Finding Filter Policy
  // Suggestions section. Surfaces advisory durable-policy
  // candidates and reminds the agent that applying suggestions
  // requires explicit operator approval.
  appendAgentContractFindingFilterPolicySuggestions(
    sections,
    findingFilterPolicySuggestionReport,
    findingFilterPolicySuggestionStale,
    findingFilterReport,
  );

  // Governance Freshness — show even when fresh so agents can rely on the read.
  sections.push("### Governance Freshness");
  sections.push("");
  if (!freshness) {
    sections.push("- Issue adjudication: unknown");
    sections.push("- Coherency delta: unknown");
    sections.push("");
  } else {
    sections.push(`- Issue adjudication: ${freshness.adjudication.status}`);
    sections.push(`- Coherency delta: ${freshness.coherency.status}`);
    sections.push("");
    if (freshness.warnings.length > 0) {
      sections.push("> Input freshness warnings:");
      for (const warning of freshness.warnings) {
        sections.push(`> - ${warning}`);
      }
      sections.push("");
      sections.push(
        "> Do not treat governed issue counts as current until `rekon refresh` (or `rekon issues adjudicate && rekon coherency delta`) has run.",
      );
      sections.push("");
      if (freshness.recommendedCommand) {
        sections.push(`Recommended command: \`${freshness.recommendedCommand}\`.`);
        sections.push("");
      }
    } else if (
      freshness.adjudication.status === "missing"
      || freshness.coherency.status === "missing"
    ) {
      if (freshness.recommendedCommand) {
        sections.push(`Recommended command: \`${freshness.recommendedCommand}\`.`);
        sections.push("");
      }
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

function summarizeMembers(memberFindingIds: string[] | undefined): string {
  const members = memberFindingIds ?? [];
  if (members.length === 0) {
    return "_none_";
  }
  if (members.length <= 3) {
    return `${members.length}: ${members.join(", ")}`;
  }
  return `${members.length}: ${members.slice(0, 3).join(", ")} _(+${members.length - 3} more)_`;
}

function coherencyDeltaCameFromAdjudication(
  delta: CoherencyDelta | undefined,
): boolean {
  if (!delta || delta.items.length === 0) {
    return false;
  }
  return delta.items.some((item) => Boolean(item.issueGroupId));
}

type MergeRollupRow = {
  rollupId: string;
  issueGroupId?: string;
  mergedIssueGroupIds: string[];
  mergeDecisionIds: string[];
  mergeCandidateIds: string[];
  memberFindingIds: string[];
  severity: string;
  status: string;
  active: boolean;
};

function collectMergedRollups(delta: CoherencyDelta): MergeRollupRow[] {
  const rows: MergeRollupRow[] = [];
  for (const item of delta.items ?? []) {
    const groupIds = item.mergedIssueGroupIds;
    if (!Array.isArray(groupIds) || groupIds.length < 2) {
      continue;
    }
    rows.push({
      rollupId: item.issueGroupId ?? item.id,
      issueGroupId: item.issueGroupId,
      mergedIssueGroupIds: [...groupIds],
      mergeDecisionIds: [...(item.mergeDecisionIds ?? [])],
      mergeCandidateIds: [...(item.mergeCandidateIds ?? [])],
      memberFindingIds: [...(item.memberFindingIds ?? [])],
      severity: item.severity,
      status: item.status,
      active: item.active,
    });
  }
  rows.sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }
    return left.rollupId.localeCompare(right.rollupId);
  });
  return rows;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

/**
 * Sort a record of counts by descending count, then by id for ties.
 * Returns up to `limit` entries so the publication tables stay
 * compact without dropping the audit pointer to the underlying
 * artifact.
 */
function sortedCountEntries(
  counts: Record<string, number> | undefined,
  limit = 10,
): Array<[string, number]> {
  if (!counts) return [];
  return Object.entries(counts)
    .sort((left, right) => {
      if (left[1] !== right[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit);
}

function appendArchitectureFindingFilterHealth(
  sections: string[],
  filterReport: FindingFilterReport | undefined,
  healthReport: FindingFilterHealthReport | undefined,
): void {
  sections.push("## Finding Filter Health");
  sections.push("");

  if (!filterReport) {
    sections.push(
      "No FindingFilterReport found. Run `rekon findings filter` or `rekon refresh` to produce the filter audit.",
    );
    sections.push("");
    return;
  }
  if (!healthReport) {
    sections.push(
      "No FindingFilterHealthReport found. Run `rekon findings filter-health` or `rekon refresh` to produce filter-health diagnostics.",
    );
    sections.push("");
    return;
  }

  const summary = healthReport.summary;
  const filterSummary = filterReport.summary;
  const filterRatePercent = (summary.filterRate * 100).toFixed(1);
  const policyFiltered = summary.policyFiltered ?? 0;

  sections.push(`- Total findings: ${summary.totalFindings}`);
  sections.push(`- Kept findings: ${filterSummary.kept}`);
  sections.push(`- Filtered findings: ${summary.totalFiltered}`);
  sections.push(`- Filter rate: ${filterRatePercent}%`);
  sections.push(`- Policy-filtered findings: ${policyFiltered}`);
  sections.push(
    `- Graph-aware filtered findings: ${summary.graphAwareFiltered ?? 0}`,
  );
  sections.push("");

  const reasonRows = sortedCountEntries(summary.byReason);
  if (reasonRows.length > 0) {
    sections.push("### Filter Reasons");
    sections.push("");
    sections.push("| Reason | Count |");
    sections.push("| --- | --- |");
    for (const [reason, count] of reasonRows) {
      sections.push(`| ${reason} | ${count} |`);
    }
    sections.push("");
  }

  const policyRows = sortedCountEntries(summary.byPolicy);
  sections.push("### Policy Filters");
  sections.push("");
  if (!summary.byPolicy || Object.keys(summary.byPolicy).length === 0) {
    sections.push(
      "No `findingFilters` policies configured. Configure project-specific exclusions under `.rekon/config.json` `findingFilters`.",
    );
    sections.push("");
  } else {
    sections.push("| Policy | Count |");
    sections.push("| --- | --- |");
    for (const [policyId, count] of policyRows) {
      sections.push(`| ${policyId} | ${count} |`);
    }
    sections.push("");
    if (Array.isArray(summary.unusedPolicies) && summary.unusedPolicies.length > 0) {
      sections.push(
        `Unused policy ${summary.unusedPolicies.length === 1 ? "id" : "ids"}: ${summary.unusedPolicies.join(", ")}.`,
      );
      sections.push("");
    }
  }

  // Graph-aware surfacing (v1). Render the per-reason table and
  // an audit pointer when at least one graph-aware match
  // happened OR when the per-reason count map is non-empty.
  const graphAwareReasonRows = summary.byGraphAwareReason
    ? Object.entries(summary.byGraphAwareReason)
        .filter(([, count]) => typeof count === "number" && count > 0)
        .sort((left, right) => {
          if (right[1] !== left[1]) return right[1] - left[1];
          return left[0].localeCompare(right[0]);
        })
    : [];
  if (graphAwareReasonRows.length > 0 || (summary.graphAwareFiltered ?? 0) > 0) {
    sections.push("### Graph-Aware Filter Reasons");
    sections.push("");
    if (graphAwareReasonRows.length === 0) {
      sections.push("No per-reason graph-aware breakdown available.");
      sections.push("");
    } else {
      sections.push("| Reason | Count | Rate |");
      sections.push("| --- | --- | --- |");
      const rateMap = summary.filterRateByGraphAwareReason ?? {};
      for (const [reason, count] of graphAwareReasonRows) {
        const rate = rateMap[reason] ?? 0;
        sections.push(`| ${reason} | ${count} | ${(rate * 100).toFixed(1)}% |`);
      }
      sections.push("");
    }
    sections.push(
      "Graph-aware filtered findings are structurally justified suppressions (sibling-file existence, import-graph facts, capability ownership, module-kind routing). Inspect `FindingFilterReport.filteredFindings` for the per-entry evidence.",
    );
    sections.push("");
  }

  sections.push("### Filter Health Alerts");
  sections.push("");
  if (!healthReport.alerts || healthReport.alerts.length === 0) {
    sections.push("No filter-health alerts.");
    sections.push("");
  } else {
    sections.push("| Severity | Code | Message |");
    sections.push("| --- | --- | --- |");
    for (const alert of healthReport.alerts) {
      sections.push(`| ${alert.severity} | ${alert.code} | ${alert.message.replace(/\|/g, "\\|")} |`);
    }
    sections.push("");
  }

  sections.push(
    "Filtered findings are not deleted. Inspect `FindingFilterReport.filteredFindings` for the full audit (each entry records reason, evidence, confidence, source, and optional policyId).",
  );
  sections.push("");
}


function appendAgentContractFindingFilterHealth(
  sections: string[],
  filterReport: FindingFilterReport | undefined,
  healthReport: FindingFilterHealthReport | undefined,
): void {
  sections.push("### Finding Filter Health");
  sections.push("");

  if (!filterReport) {
    sections.push(
      "No FindingFilterReport found. Run `rekon findings filter` or `rekon refresh` before relying on active governance counts.",
    );
    sections.push("");
    return;
  }
  if (!healthReport) {
    sections.push(
      "No FindingFilterHealthReport found. Run `rekon findings filter-health` or `rekon refresh` to surface filter diagnostics.",
    );
    sections.push("");
    return;
  }

  const summary = healthReport.summary;
  const filterSummary = filterReport.summary;
  const filterRatePercent = (summary.filterRate * 100).toFixed(1);
  const policyCount = summary.byPolicy ? Object.keys(summary.byPolicy).length : 0;
  const alertCount = healthReport.alerts?.length ?? 0;

  sections.push(`- Kept findings: ${filterSummary.kept}`);
  sections.push(`- Filtered findings: ${summary.totalFiltered}`);
  sections.push(`- Filter rate: ${filterRatePercent}%`);
  sections.push(`- Policy filters active: ${policyCount}`);
  sections.push(
    `- Graph-aware filtered findings: ${summary.graphAwareFiltered ?? 0}`,
  );
  sections.push(`- Warnings: ${alertCount}`);
  sections.push("");

  if (alertCount > 0) {
    sections.push(
      "> Filter-health warnings exist. Do not assume active governance is complete until filtered findings are reviewed.",
    );
    sections.push("");
    for (const alert of healthReport.alerts.slice(0, 5)) {
      sections.push(`- \`${alert.code}\` — ${alert.message}`);
    }
    if (healthReport.alerts.length > 5) {
      sections.push(`- _… ${healthReport.alerts.length - 5} more alerts_`);
    }
    sections.push("");
  }

  if ((summary.graphAwareFiltered ?? 0) > 0) {
    sections.push(
      "If graph-aware filtering is high, inspect `FindingFilterReport.filteredFindings` for the structural evidence before assuming active governance is clean. Graph-aware filters use sibling-file existence, import-graph facts, capability ownership, and module-kind routing — every match preserves the original finding payload + audit evidence.",
    );
    sections.push("");
  }

  sections.push(
    "If filter rate is high or policy warnings exist, inspect `FindingFilterReport.filteredFindings` before claiming the repo has no active issues. Filtered findings remain auditable (each entry records reason, evidence, confidence, source, and optional policyId).",
  );
  sections.push("");
}

function formatPolicyFingerprintCell(
  fingerprint: FindingFilterPolicyFingerprint | undefined,
): string {
  if (!fingerprint) return "_unavailable_";
  const shortDigest = fingerprint.digest.slice(0, 12);
  return `\`${shortDigest}\` (${fingerprint.ruleCount} rule${
    fingerprint.ruleCount === 1 ? "" : "s"
  })`;
}

function appendArchitectureFindingFilterPolicyFreshness(
  sections: string[],
  staleness: FilterPolicyStaleness | undefined,
): void {
  sections.push("## Finding Filter Policy Freshness");
  sections.push("");
  if (!staleness) {
    sections.push(
      "No FindingFilterReport indexed; filter policy freshness cannot be evaluated. Run `rekon refresh`.",
    );
    sections.push("");
    return;
  }
  sections.push(`- Status: \`${staleness.status}\``);
  sections.push(`- Current config policy fingerprint: ${formatPolicyFingerprintCell(staleness.currentFingerprint)}`);
  sections.push(`- FindingFilterReport policy fingerprint: ${formatPolicyFingerprintCell(staleness.reportFingerprint)}`);
  sections.push("");
  if (staleness.status === "stale") {
    sections.push(
      "> `.rekon/config.json` `findingFilters` changed after the latest FindingFilterReport was produced. Active governance (lifecycle / adjudication / coherency / publications) may be stale. Run `rekon refresh` to rebuild the filter chain with the current policy set.",
    );
    sections.push("");
  } else if (staleness.status === "missing") {
    sections.push(
      "No FindingFilterReport found. Run `rekon refresh` (or `rekon findings filter`) before relying on active governance counts.",
    );
    sections.push("");
  } else if (staleness.status === "unknown") {
    sections.push(
      "Latest FindingFilterReport predates filter-policy-freshness v2 and does not record a policy fingerprint. Run `rekon refresh` to regenerate the filter chain with a fingerprinted FindingFilterReport.",
    );
    sections.push("");
  } else {
    sections.push("Finding filter policy fingerprint matches the latest FindingFilterReport.");
    sections.push("");
  }
}

function appendAgentContractFindingFilterPolicyFreshness(
  sections: string[],
  staleness: FilterPolicyStaleness | undefined,
): void {
  sections.push("### Finding Filter Policy Freshness");
  sections.push("");
  if (!staleness) {
    sections.push(
      "No FindingFilterReport indexed; filter policy freshness cannot be evaluated. Run `rekon refresh` before relying on active governance counts.",
    );
    sections.push("");
    return;
  }
  sections.push(`- Status: \`${staleness.status}\``);
  sections.push(`- Current config policy fingerprint: ${formatPolicyFingerprintCell(staleness.currentFingerprint)}`);
  sections.push(`- FindingFilterReport policy fingerprint: ${formatPolicyFingerprintCell(staleness.reportFingerprint)}`);
  sections.push("");
  if (staleness.status === "stale") {
    sections.push(
      "> Do not rely on active governance until `rekon refresh` rebuilds findings with the current `findingFilters` config. The latest FindingFilterReport was produced against an older policy set.",
    );
    sections.push("");
  } else if (staleness.status === "missing") {
    sections.push(
      "> No FindingFilterReport found. Run `rekon refresh` (or `rekon findings filter`) before relying on active governance counts.",
    );
    sections.push("");
  } else if (staleness.status === "unknown") {
    sections.push(
      "> Latest FindingFilterReport predates filter-policy-freshness v2. Run `rekon refresh` to regenerate the filter chain with a fingerprinted FindingFilterReport before trusting active governance counts.",
    );
    sections.push("");
  } else {
    sections.push("Finding filter policy fingerprint matches the latest FindingFilterReport.");
    sections.push("");
  }
}

/**
 * Lightweight staleness check for a
 * `FindingFilterPolicySuggestionReport`. The suggestion deriver
 * folds in the latest N filter reports (default 5), so a fresh
 * report cites the latest indexed `FindingFilterReport` in its
 * own `header.inputRefs`. When the latest filter report id
 * is **not** cited, the suggestion report is stale — the operator
 * has run a newer filter pass without re-running
 * `rekon findings filter-policy suggest`.
 *
 * Local check only — keeps publication freshness handling
 * self-contained instead of expanding the global freshness
 * helper. Returns `null` when there's nothing to compare.
 */
export type FilterPolicySuggestionStaleness = {
  stale: boolean;
  latestFilterReportId?: string;
  citedFilterReportIds: string[];
};

function computeFilterPolicySuggestionStale(
  suggestionReport: FindingFilterPolicySuggestionReport | undefined,
  latestFilterReport: FindingFilterReport | undefined,
): FilterPolicySuggestionStaleness | undefined {
  if (!suggestionReport) return undefined;
  if (!latestFilterReport) return { stale: false, citedFilterReportIds: [] };
  const citedFilterReportIds = (suggestionReport.header.inputRefs ?? [])
    .filter((ref) => ref.type === "FindingFilterReport")
    .map((ref) => ref.id);
  const latestFilterReportId = latestFilterReport.header.artifactId;
  const stale = !citedFilterReportIds.includes(latestFilterReportId);
  return { stale, latestFilterReportId, citedFilterReportIds };
}

/**
 * Filter-policy freshness status. Compares the current
 * `.rekon/config.json findingFilters` fingerprint against the
 * fingerprint stamped on the latest `FindingFilterReport`. Surfaced
 * in the architecture summary and agent contract so an operator
 * who changes filter policy after a filter run sees an explicit
 * "Run `rekon refresh`" warning instead of stale active
 * governance.
 */
export type FilterPolicyStaleness = {
  status: "fresh" | "stale" | "missing" | "unknown";
  currentFingerprint?: FindingFilterPolicyFingerprint;
  reportFingerprint?: FindingFilterPolicyFingerprint;
  warnings: string[];
  recommendedCommand?: string;
};

/**
 * Pure compute. Compares two fingerprints (current config vs.
 * latest filter report's `policyFingerprint`) and returns the
 * staleness shape. Use `loadCurrentFindingFilterPolicies` to
 * obtain the current fingerprint from disk.
 */
export function computeFilterPolicyStaleness(input: {
  currentFingerprint?: FindingFilterPolicyFingerprint;
  filterReport?: FindingFilterReport;
}): FilterPolicyStaleness {
  const { currentFingerprint, filterReport } = input;
  if (!filterReport) {
    return {
      status: "missing",
      currentFingerprint,
      warnings: [
        "No FindingFilterReport indexed. Run `rekon refresh` (or `rekon findings filter`) before relying on active governance counts.",
      ],
      recommendedCommand: "rekon refresh",
    };
  }
  const reportFingerprint = filterReport.policyFingerprint;
  if (!reportFingerprint) {
    return {
      status: "unknown",
      currentFingerprint,
      warnings: [
        "Latest FindingFilterReport predates filter-policy-freshness v2 and does not record a policy fingerprint. Run `rekon refresh` to regenerate.",
      ],
      recommendedCommand: "rekon refresh",
    };
  }
  if (!currentFingerprint || currentFingerprint.digest === reportFingerprint.digest) {
    return {
      status: "fresh",
      currentFingerprint: currentFingerprint ?? reportFingerprint,
      reportFingerprint,
      warnings: [],
    };
  }
  return {
    status: "stale",
    currentFingerprint,
    reportFingerprint,
    warnings: [
      "`.rekon/config.json` `findingFilters` changed after the latest FindingFilterReport was produced. Active governance (lifecycle / adjudication / coherency / publications) may be stale until `rekon refresh` rebuilds the filter chain with the current policy set.",
    ],
    recommendedCommand: "rekon refresh",
  };
}

/**
 * Async wrapper: reads `.rekon/config.json` from disk, extracts
 * `findingFilters`, validates them, and returns the
 * `FindingFilterPolicyFingerprint` of the *valid* rule subset.
 * Missing config, missing `findingFilters`, or invalid rules
 * collapse to the empty-policy fingerprint — that matches what
 * `applyFindingFilters` would actually run. Returns `undefined`
 * when the file exists but is unreadable / unparseable (caller
 * decides how to surface that; the publishers treat it as
 * `unknown`).
 */
export async function loadCurrentFindingFilterPolicies(
  repoRoot: string,
): Promise<{
  rules: FindingFilterPolicyRule[];
  fingerprint: FindingFilterPolicyFingerprint;
} | undefined> {
  const configPath = resolve(repoRoot, ".rekon", "config.json");
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      // Missing config = no configured policies — distinct from
      // unreadable. Returns the empty-policy fingerprint so the
      // staleness check still works against an empty filter
      // report fingerprint.
      const rules: FindingFilterPolicyRule[] = [];
      return { rules, fingerprint: fingerprintFindingFilterPolicies(rules) };
    }
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }
  const candidate = (parsed as Record<string, unknown>).findingFilters;
  if (candidate === undefined) {
    const rules: FindingFilterPolicyRule[] = [];
    return { rules, fingerprint: fingerprintFindingFilterPolicies(rules) };
  }
  const { rules } = validateFindingFilterPolicyRules(candidate);
  return { rules, fingerprint: fingerprintFindingFilterPolicies(rules) };
}

function summarizeSuggestedRule(rule: {
  id: string;
  reason: string;
  pathPattern?: string;
  type?: string;
  ruleId?: string;
  severity?: string;
  titleIncludes?: string;
  descriptionIncludes?: string;
  confidence?: string;
}): string {
  const parts = [`id=\`${rule.id}\``, `reason=\`${rule.reason}\``];
  if (rule.pathPattern) parts.push(`pathPattern=\`${rule.pathPattern}\``);
  if (rule.type) parts.push(`type=\`${rule.type}\``);
  if (rule.ruleId) parts.push(`ruleId=\`${rule.ruleId}\``);
  if (rule.severity) parts.push(`severity=\`${rule.severity}\``);
  if (rule.titleIncludes) parts.push(`titleIncludes=\`${rule.titleIncludes}\``);
  if (rule.descriptionIncludes) parts.push(`descriptionIncludes=\`${rule.descriptionIncludes}\``);
  return parts.join(", ");
}

function summarizeAffectedFindings(ids: string[] | undefined): string {
  const list = Array.isArray(ids) ? ids : [];
  if (list.length === 0) return "_none_";
  const head = list.slice(0, 3).join(", ");
  if (list.length <= 3) return `${list.length}: ${head}`;
  return `${list.length}: ${head} _(+${list.length - 3} more)_`;
}

function summarizeEvidence(ids: string[] | undefined): string {
  const list = Array.isArray(ids) ? ids : [];
  if (list.length === 0) return "_none_";
  if (list.length === 1) return `1 report: \`${list[0]}\``;
  return `${list.length} reports`;
}

function appendArchitectureFindingFilterPolicySuggestions(
  sections: string[],
  suggestionReport: FindingFilterPolicySuggestionReport | undefined,
  staleness: FilterPolicySuggestionStaleness | undefined,
  filterReport: FindingFilterReport | undefined,
): void {
  sections.push("## Finding Filter Policy Suggestions");
  sections.push("");

  if (!suggestionReport) {
    if (!filterReport) {
      sections.push(
        "No FindingFilterPolicySuggestionReport indexed yet. Run `rekon findings filter` first, then `rekon findings filter-policy suggest`.",
      );
    } else {
      sections.push(
        "No FindingFilterPolicySuggestionReport indexed. Run `rekon findings filter-policy suggest` to surface candidate `findingFilters` rules from recent filter reports.",
      );
    }
    sections.push("");
    return;
  }

  if (staleness?.stale) {
    sections.push(
      `> Finding filter policy suggestions may be stale: a newer FindingFilterReport (\`${staleness.latestFilterReportId ?? "unknown"}\`) exists. Re-run \`rekon findings filter-policy suggest\` before relying on these suggestions.`,
    );
    sections.push("");
  }

  const summary = suggestionReport.summary;
  sections.push(`- Total suggestions: ${summary.totalSuggestions}`);
  sections.push(`- High confidence: ${summary.highConfidence}`);
  sections.push(`- Medium confidence: ${summary.mediumConfidence}`);
  sections.push(`- Low confidence: ${summary.lowConfidence}`);
  sections.push("");

  if (summary.totalSuggestions === 0) {
    sections.push("No filter policy suggestions in latest report.");
    sections.push("");
  } else {
    sections.push("| Suggestion | Confidence | Reason | Suggested Rule | Affected Findings | Evidence |");
    sections.push("| --- | --- | --- | --- | --- | --- |");
    for (const suggestion of suggestionReport.suggestions.slice(0, 20)) {
      const ruleSummary = summarizeSuggestedRule(suggestion.suggestedRule);
      const affected = summarizeAffectedFindings(suggestion.affectedFindingIds);
      const evidence = summarizeEvidence(suggestion.sourceFilterReportIds);
      sections.push(
        `| \`${suggestion.id}\` | ${suggestion.confidence} | ${suggestion.reason} | ${escapeCell(ruleSummary)} | ${escapeCell(affected)} | ${escapeCell(evidence)} |`,
      );
    }
    if (suggestionReport.suggestions.length > 20) {
      sections.push(`| _… ${suggestionReport.suggestions.length - 20} more suggestions_ | | | | | |`);
    }
    sections.push("");

    if (summary.lowConfidence > 0) {
      sections.push(
        "Low-confidence suggestions require explicit `--force` to apply via `rekon findings filter-policy apply`.",
      );
      sections.push("");
    }
  }

  sections.push(
    "Suggestions are advisory and do not mutate `.rekon/config.json`. Apply explicitly with `rekon findings filter-policy apply <suggestion-id>` (use `--force` for low-confidence or duplicate-rule-id cases). See `docs/concepts/finding-filter-policy-suggestions.md`.",
  );
  sections.push("");
}

function appendAgentContractFindingFilterPolicySuggestions(
  sections: string[],
  suggestionReport: FindingFilterPolicySuggestionReport | undefined,
  staleness: FilterPolicySuggestionStaleness | undefined,
  filterReport: FindingFilterReport | undefined,
): void {
  sections.push("### Finding Filter Policy Suggestions");
  sections.push("");

  if (!suggestionReport) {
    if (!filterReport) {
      sections.push(
        "No FindingFilterPolicySuggestionReport indexed. Run `rekon findings filter` followed by `rekon findings filter-policy suggest` before applying durable filter policy.",
      );
    } else {
      sections.push(
        "No FindingFilterPolicySuggestionReport indexed. Run `rekon findings filter-policy suggest` to surface candidate `findingFilters` rules from recent filter reports.",
      );
    }
    sections.push("");
    return;
  }

  const summary = suggestionReport.summary;
  sections.push(`- Suggestions available: ${summary.totalSuggestions}`);
  sections.push(`- High confidence: ${summary.highConfidence}`);
  sections.push(`- Low confidence requiring \`--force\`: ${summary.lowConfidence}`);
  sections.push("");

  if (staleness?.stale) {
    sections.push(
      `> Suggestion report may be stale: latest FindingFilterReport (\`${staleness.latestFilterReportId ?? "unknown"}\`) is not cited. Re-run \`rekon findings filter-policy suggest\` before acting.`,
    );
    sections.push("");
  }

  if (summary.totalSuggestions > 0) {
    sections.push(
      "> Filter policy suggestions are advisory. Do not assume they are applied.",
    );
    sections.push("");
    for (const suggestion of suggestionReport.suggestions.slice(0, 5)) {
      const affected = suggestion.affectedFindingIds?.length ?? 0;
      sections.push(
        `- \`${suggestion.id}\` — ${suggestion.confidence} — ${suggestion.reason} — affected findings: ${affected}`,
      );
    }
    if (suggestionReport.suggestions.length > 5) {
      sections.push(`- _… ${suggestionReport.suggestions.length - 5} more suggestions_`);
    }
    sections.push("");
  }

  sections.push(
    "Ask the operator before applying filter policy suggestions. Do not mutate `.rekon/config.json` unless explicitly instructed. The operator-driven step is `rekon findings filter-policy apply <suggestion-id>` (use `--force` for low-confidence or duplicate-rule-id cases).",
  );
  sections.push("");
}

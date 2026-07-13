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
  type IssueMergeCandidateView,
  type IssueMergeDecisionLedger,
  type IssueMergeRollupFreshness,
  buildIssueMergeCandidateViews,
  detectIssueMergeRollupFreshness,
  fingerprintFindingFilterPolicies,
  validateFindingFilterPolicyRules,
} from "@rekon/kernel-findings";
import {
  type CapabilityMap,
  type ObservedRepo,
  type OwnershipMap,
} from "@rekon/kernel-repo-model";
import { type IntelligenceSnapshot } from "@rekon/kernel-snapshot";
import {
  type PathFreshnessEntry,
  type PathFreshnessReport,
  type VerificationProofSurfaceSummary,
  type VerificationProofWarning,
  summarizeVerificationProofSurface,
} from "@rekon/capability-intent";
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

type ResolverPacketLike = {
  relevantFindings?: unknown[];
  relevantAssessments?: Array<{ kind?: string; state?: string }>;
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
  stdoutDigest?: string;
  stderrDigest?: string;
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

// Capability ontology suggestion publication surfacing
// (P1.1 capability-ontology-suggestion-publications). Local
// duck type so the capability-docs package does not import
// `@rekon/capability-ontology` directly. The shape mirrors
// the public `CapabilityOntologySuggestionReport` artifact
// (see `docs/artifacts/capability-ontology-suggestion-report.md`)
// but the renderer is **read-only** with respect to the
// ontology config and tolerates partial data.
type CapabilityOntologySuggestionReportLike = {
  header: ArtifactHeader;
  summary?: {
    total?: number;
    addCanonicalVerb?: number;
    addCanonicalNoun?: number;
    addVerbAlias?: number;
    addNounAlias?: number;
    skipped?: number;
  };
  suggestions?: Array<{
    id?: string;
    kind?: string;
    term?: string;
    canonical?: string;
    reason?: string;
    sourceDecisionId?: string;
  }>;
  skipped?: Array<{
    decisionId?: string;
    term?: string;
    termKind?: string;
    reason?: string;
  }>;
  preview?: {
    configPath?: string;
    message?: string;
  };
};

// Capability phrase publication surfacing
// (capability-phrase-publications). Local duck type so the
// capability-docs package does not import
// `@rekon/capability-ontology` directly. Mirrors the public
// `CapabilityPhraseReport` artifact (see
// `docs/artifacts/capability-phrase-report.md`) but the
// renderer is **read-only** with respect to every upstream
// artifact and tolerates partial data.
type CapabilityPhraseReportLike = {
  header: ArtifactHeader;
  sourceNormalizationReportRef?: ArtifactRef;
  summary?: {
    totalPhrases?: number;
    stable?: number;
    partial?: number;
    lowConfidence?: number;
    withDomain?: number;
    withPattern?: number;
    withLayer?: number;
  };
  phrases?: Array<{
    id?: string;
    verb?: string;
    noun?: string;
    qualifier?: string[];
    domain?: string;
    pattern?: string;
    layer?: string;
    confidence?: string;
    status?: string;
    evidenceRefs?: ArtifactRef[];
    sourceCandidateIds?: string[];
    message?: string;
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
    const latestResolver = latestResolverRef
      ? await artifacts.read(latestResolverRef) as ResolverPacketLike
      : undefined;
    const inputRefs = latestResolverRef ? [snapshotRef, latestResolverRef] : [snapshotRef];
    const generatedAt = new Date().toISOString();
    const publications: PublicationArtifact[] = [
      {
        header: createPublicationHeader("agents", generatedAt, snapshot, inputRefs),
        kind: "agents",
        path: ".rekon/artifacts/publications/agents.md",
        format: "markdown",
        content: renderAgentsDoc(snapshot, inputRefs, generatedAt, latestResolver),
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
    // Issue merge decision freshness guardrails (v1):
    // pull the latest IssueMergeDecisionLedger so the
    // freshness predicate can compare it against what
    // CoherencyDelta cited, and emit the Rule-E
    // (decision superseded) check. Cited in `inputRefs`
    // when present.
    const issueMergeDecisionLedger = await readLatestArtifact<IssueMergeDecisionLedger>(
      artifacts,
      "IssueMergeDecisionLedger",
      inputRefs,
    );
    const mergeRollupFreshness = detectIssueMergeRollupFreshness({
      coherencyDelta,
      latestIssueMergeDecisionLedger: issueMergeDecisionLedger,
      latestIssueAdjudicationReport: issueAdjudicationReport,
      latestFindingLifecycleReport: lifecycleReport,
    });
    // Issue merge decision operator ergonomics v1: build
    // per-candidate decision-state views so publications
    // can render undecided / accepted / rejected counts
    // and emit recommended operator commands.
    const mergeCandidateViews = issueAdjudicationReport
      ? buildIssueMergeCandidateViews({
          report: issueAdjudicationReport,
          ledger: issueMergeDecisionLedger,
          coherencyDelta,
          mergeRollupFreshness,
        })
      : [];
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

    const verificationResultRef = await latestRef(artifacts, "VerificationResult");
    const verificationResult = verificationResultRef
      ? (await artifacts.read(verificationResultRef)) as VerificationResultLike
      : undefined;

    if (verificationResultRef && !inputRefs.some((existing) => existing.type === verificationResultRef.type && existing.id === verificationResultRef.id)) {
      inputRefs.push(verificationResultRef);
    }

    const verificationRunArtifactExists = await checkVerificationRunExists(
      artifacts,
      verificationResult,
    );
    // Path-freshness publication surfacing (P1.1
    // path-freshness-publication-surfacing). Read-only:
    // surfaces the latest PathFreshnessReport into the
    // architecture summary's `## Working Tree Path
    // Freshness` section. Never re-runs `rekon paths
    // freshness` and never re-runs `rekon refresh`.
    const pathFreshnessRef = await latestRef(artifacts, "PathFreshnessReport");
    const pathFreshnessReport = pathFreshnessRef
      ? (await artifacts.read(pathFreshnessRef)) as PathFreshnessReport
      : undefined;
    if (pathFreshnessRef && !inputRefs.some((existing) =>
        existing.type === pathFreshnessRef.type && existing.id === pathFreshnessRef.id)) {
      inputRefs.push(pathFreshnessRef);
    }
    // Capability ontology suggestion surfacing (P1.1
    // capability-ontology-suggestion-publications). Read-only:
    // surfaces the latest CapabilityOntologySuggestionReport
    // into the architecture summary so operators see ontology
    // expansion proposals without running the suggestions CLI
    // directly. Never re-runs `rekon capability ontology
    // suggestions`. Never mutates `.rekon/capability-ontology.json`.
    // Never mutates CapabilityMap. Never writes a new
    // CapabilityOntologySuggestionReport.
    const ontologySuggestionRef = await latestRef(
      artifacts,
      "CapabilityOntologySuggestionReport",
    );
    const ontologySuggestionReport = ontologySuggestionRef
      ? (await artifacts.read(ontologySuggestionRef)) as CapabilityOntologySuggestionReportLike
      : undefined;
    if (
      ontologySuggestionRef
      && !inputRefs.some((existing) =>
        existing.type === ontologySuggestionRef.type
        && existing.id === ontologySuggestionRef.id)
    ) {
      inputRefs.push(ontologySuggestionRef);
    }
    // Capability phrase publication surfacing
    // (capability-phrase-publications). Read-only:
    // surfaces the latest CapabilityPhraseReport so
    // operators see semantic-purpose projection alongside
    // repo state. Never re-runs `rekon capability phrase
    // project`. Never mutates `CapabilityPhraseReport`,
    // `CapabilityNormalizationReport`, `CapabilityMap`,
    // or `EvidenceGraph`.
    const capabilityPhraseRef = await latestRef(artifacts, "CapabilityPhraseReport");
    const capabilityPhraseReport = capabilityPhraseRef
      ? (await artifacts.read(capabilityPhraseRef)) as CapabilityPhraseReportLike
      : undefined;
    if (
      capabilityPhraseRef
      && !inputRefs.some((existing) =>
        existing.type === capabilityPhraseRef.type
        && existing.id === capabilityPhraseRef.id)
    ) {
      inputRefs.push(capabilityPhraseRef);
    }
    // CapabilityContract publication surfacing
    // (capability-contract-publications). Strictly
    // read-only: never runs `rekon capability contract
    // generate`; never mutates `CapabilityContract`,
    // `.rekon/capability-contracts.json`, `CapabilityMap`,
    // `CapabilityPhraseReport`, or `EvidenceGraph`.
    const capabilityContractRef = await latestRef(artifacts, "CapabilityContract");
    const capabilityContract = capabilityContractRef
      ? (await artifacts.read(capabilityContractRef)) as CapabilityContractLike
      : undefined;
    if (
      capabilityContractRef
      && !inputRefs.some((existing) =>
        existing.type === capabilityContractRef.type
        && existing.id === capabilityContractRef.id)
    ) {
      inputRefs.push(capabilityContractRef);
    }
    // CapabilityArchitectureLintReport publication surfacing
    // (capability-architecture-lint-publications). Strictly
    // read-only: never runs `rekon capability lint
    // architecture`; never mutates the lint report,
    // `CapabilityContract`, `CapabilityMap`,
    // `FindingReport`, `FindingFilterReport`,
    // `FindingLifecycleReport`, or `CoherencyDelta`.
    const capabilityArchitectureLintRef = await latestRef(
      artifacts,
      "CapabilityArchitectureLintReport",
    );
    const capabilityArchitectureLintReport = capabilityArchitectureLintRef
      ? (await artifacts.read(capabilityArchitectureLintRef)) as CapabilityArchitectureLintReportLike
      : undefined;
    if (
      capabilityArchitectureLintRef
      && !inputRefs.some((existing) =>
        existing.type === capabilityArchitectureLintRef.type
        && existing.id === capabilityArchitectureLintRef.id)
    ) {
      inputRefs.push(capabilityArchitectureLintRef);
    }
    // CapabilityLintFindingBridgeReport publication surfacing
    // (capability-lint-finding-bridge-publications). Strictly
    // read-only: never runs `rekon capability lint
    // bridge-findings`; never mutates the bridge report,
    // `CapabilityArchitectureLintReport`, `FindingReport`,
    // `FindingFilterReport`, `FindingLifecycleReport`,
    // `IssueAdjudicationReport`, or `CoherencyDelta`; never
    // creates `WorkOrder` or `VerificationPlan`.
    const capabilityLintFindingBridgeRef = await latestRef(
      artifacts,
      "CapabilityLintFindingBridgeReport",
    );
    const capabilityLintFindingBridgeReport = capabilityLintFindingBridgeRef
      ? (await artifacts.read(capabilityLintFindingBridgeRef)) as CapabilityLintFindingBridgeReportLike
      : undefined;
    if (
      capabilityLintFindingBridgeRef
      && !inputRefs.some((existing) =>
        existing.type === capabilityLintFindingBridgeRef.type
        && existing.id === capabilityLintFindingBridgeRef.id)
    ) {
      inputRefs.push(capabilityLintFindingBridgeRef);
    }
    // Bridge-derived findings publication surfacing
    // (bridge-derived-findings-publication). Read-only: surfaces the
    // governed FindingReport entries the controlled writer wrote
    // (identified by type capability_architecture_policy + details
    // source*). Never runs the bridge writer, never mutates
    // FindingReport, FindingFilterReport, FindingLifecycleReport,
    // IssueAdjudicationReport, or CoherencyDelta; never creates
    // WorkOrder or VerificationPlan.
    const findingReportRef = await latestRef(artifacts, "FindingReport");
    const findingReport = findingReportRef
      ? (await artifacts.read(findingReportRef)) as BridgeDerivedFindingReportLike
      : undefined;
    if (
      findingReportRef
      && !inputRefs.some((existing) =>
        existing.type === findingReportRef.type
        && existing.id === findingReportRef.id)
    ) {
      inputRefs.push(findingReportRef);
    }
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
        mergeRollupFreshness,
        mergeCandidateViews,
        remediationWorkOrder: workOrders.remediation,
        resolverWorkOrder: workOrders.resolver,
        reconciliationPlan,
        latestVerificationPlanRef,
        verificationPlan,
        verificationResult,
        verificationResultRef,
        verificationRunArtifactExists,
        pathFreshnessReport,
        pathFreshnessRef,
        ontologySuggestionReport,
        ontologySuggestionRef,
        capabilityPhraseReport,
        capabilityPhraseRef,
        capabilityContract,
        capabilityContractRef,
        capabilityArchitectureLintReport,
        capabilityArchitectureLintRef,
        capabilityLintFindingBridgeReport,
        capabilityLintFindingBridgeRef,
        findingReport,
        findingReportRef,
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

    const verificationResultRef = await latestRef(artifacts, "VerificationResult");
    const verificationResult = verificationResultRef
      ? (await artifacts.read(verificationResultRef)) as VerificationResultLike
      : undefined;

    if (verificationResultRef && !inputRefs.some((existing) => existing.type === verificationResultRef.type && existing.id === verificationResultRef.id)) {
      inputRefs.push(verificationResultRef);
    }

    // Check whether the VerificationRun referenced by the
    // result is present in the local store. This feeds the
    // proof-surface helper's `knownRunnerRunMissing` flag.
    const verificationRunArtifactExists = await checkVerificationRunExists(
      artifacts,
      verificationResult,
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
    // Issue merge decision publication / detail polish v2:
    // the proof report now surfaces merge-decision
    // context so operators see how accepted roll-ups
    // affect remediation grouping. Read the
    // IssueAdjudicationReport + IssueMergeDecisionLedger
    // and run the freshness predicate so the section
    // can recommend the right follow-up commands.
    const issueAdjudicationReportForProof = await readLatestArtifact<IssueAdjudicationReport>(
      artifacts,
      "IssueAdjudicationReport",
      inputRefs,
    );
    const issueMergeDecisionLedgerForProof = await readLatestArtifact<IssueMergeDecisionLedger>(
      artifacts,
      "IssueMergeDecisionLedger",
      inputRefs,
    );
    const proofMergeRollupFreshness = detectIssueMergeRollupFreshness({
      coherencyDelta,
      latestIssueMergeDecisionLedger: issueMergeDecisionLedgerForProof,
      latestIssueAdjudicationReport: issueAdjudicationReportForProof,
      latestFindingLifecycleReport: lifecycleReport,
    });
    const proofMergeCandidateViews = issueAdjudicationReportForProof
      ? buildIssueMergeCandidateViews({
          report: issueAdjudicationReportForProof,
          ledger: issueMergeDecisionLedgerForProof,
          coherencyDelta,
          mergeRollupFreshness: proofMergeRollupFreshness,
        })
      : [];

    // Path-freshness publication surfacing (P1.1
    // path-freshness-publication-surfacing). Read-only:
    // surfaces the latest PathFreshnessReport into the
    // proof report's `## Working Tree Freshness Context`
    // section so reviewers see whether the proof was
    // taken against a working tree that may have drifted
    // since the source-state baseline.
    const proofPathFreshnessRef = await latestRef(artifacts, "PathFreshnessReport");
    const proofPathFreshnessReport = proofPathFreshnessRef
      ? (await artifacts.read(proofPathFreshnessRef)) as PathFreshnessReport
      : undefined;
    if (proofPathFreshnessRef && !inputRefs.some((existing) =>
        existing.type === proofPathFreshnessRef.type && existing.id === proofPathFreshnessRef.id)) {
      inputRefs.push(proofPathFreshnessRef);
    }

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
      supersession: { key: "proof-report" },
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
        verificationResultRef,
        latestVerificationPlanRef: verificationPlanRef,
        verificationRunArtifactExists,
        coherencyDelta,
        reconciliationPlan,
        lifecycleReport,
        mergeCandidateViews: proofMergeCandidateViews,
        mergeRollupFreshness: proofMergeRollupFreshness,
        pathFreshnessReport: proofPathFreshnessReport,
        pathFreshnessRef: proofPathFreshnessRef,
        inputRefs,
      }),
    };

    const ref = await artifacts.write("Publication", publication);

    return [ref];
  },
};

async function checkVerificationRunExists(
  artifacts: {
    list(type?: string): Promise<ArtifactRef[]>;
    read(ref: ArtifactRef): Promise<unknown>;
  },
  verificationResult: VerificationResultLike | undefined,
): Promise<boolean | undefined> {
  if (!verificationResult || !Array.isArray(verificationResult.header?.inputRefs)) {
    return undefined;
  }

  const runRef = verificationResult.header!.inputRefs.find(
    (ref) => ref && typeof ref === "object" && (ref as ArtifactRef).type === "VerificationRun",
  ) as ArtifactRef | undefined;

  if (!runRef) {
    return undefined;
  }

  const runs = await artifacts.list("VerificationRun");
  return runs.some((entry) => entry.id === runRef.id);
}

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
    // Issue merge decision freshness guardrails (v1):
    // mirrors the architecture-summary publisher above.
    // Pulls the latest IssueMergeDecisionLedger so the
    // freshness predicate can compare the cited ledger
    // against the latest one and emit Rule-E
    // (decision superseded) when applicable.
    const issueMergeDecisionLedger = await readLatestArtifact<IssueMergeDecisionLedger>(
      artifacts,
      "IssueMergeDecisionLedger",
      inputRefs,
    );
    const mergeRollupFreshness = detectIssueMergeRollupFreshness({
      coherencyDelta,
      latestIssueMergeDecisionLedger: issueMergeDecisionLedger,
      latestIssueAdjudicationReport: issueAdjudicationReport,
      latestFindingLifecycleReport: lifecycleReport,
    });
    // Issue merge decision operator ergonomics v1: agent
    // contract mirrors the architecture-summary publisher
    // and surfaces decision counts + recommended
    // operator commands.
    const mergeCandidateViews = issueAdjudicationReport
      ? buildIssueMergeCandidateViews({
          report: issueAdjudicationReport,
          ledger: issueMergeDecisionLedger,
          coherencyDelta,
          mergeRollupFreshness,
        })
      : [];
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

    const verificationResultRef = await latestRef(artifacts, "VerificationResult");
    const verificationResult = verificationResultRef
      ? (await artifacts.read(verificationResultRef)) as VerificationResultLike
      : undefined;

    if (verificationResultRef && !inputRefs.some((existing) => existing.type === verificationResultRef.type && existing.id === verificationResultRef.id)) {
      inputRefs.push(verificationResultRef);
    }

    const verificationRunArtifactExists = await checkVerificationRunExists(
      artifacts,
      verificationResult,
    );
    // Path-freshness publication surfacing (P1.1
    // path-freshness-publication-surfacing). Read-only:
    // surfaces the latest PathFreshnessReport into the
    // agent contract under its existing operating-state
    // sections so agents can recognise working-tree
    // drift without checking the artifact directly.
    const pathFreshnessRef = await latestRef(artifacts, "PathFreshnessReport");
    const pathFreshnessReport = pathFreshnessRef
      ? (await artifacts.read(pathFreshnessRef)) as PathFreshnessReport
      : undefined;
    if (pathFreshnessRef && !inputRefs.some((existing) =>
        existing.type === pathFreshnessRef.type && existing.id === pathFreshnessRef.id)) {
      inputRefs.push(pathFreshnessRef);
    }
    // Capability ontology suggestion surfacing (P1.1
    // capability-ontology-suggestion-publications). Agent
    // contract mirrors the architecture-summary publisher
    // and surfaces ontology expansion proposals so agents
    // know they are preview-only and must not be treated as
    // applied vocabulary.
    const ontologySuggestionRef = await latestRef(
      artifacts,
      "CapabilityOntologySuggestionReport",
    );
    const ontologySuggestionReport = ontologySuggestionRef
      ? (await artifacts.read(ontologySuggestionRef)) as CapabilityOntologySuggestionReportLike
      : undefined;
    if (
      ontologySuggestionRef
      && !inputRefs.some((existing) =>
        existing.type === ontologySuggestionRef.type
        && existing.id === ontologySuggestionRef.id)
    ) {
      inputRefs.push(ontologySuggestionRef);
    }
    // Capability phrase publication surfacing
    // (capability-phrase-publications). Agent contract
    // mirrors the architecture-summary publisher and
    // surfaces phrase counts + the deferred-CapabilityMap
    // callout so agents know phrases are semantic
    // projection, not placement policy.
    const capabilityPhraseRef = await latestRef(artifacts, "CapabilityPhraseReport");
    const capabilityPhraseReport = capabilityPhraseRef
      ? (await artifacts.read(capabilityPhraseRef)) as CapabilityPhraseReportLike
      : undefined;
    if (
      capabilityPhraseRef
      && !inputRefs.some((existing) =>
        existing.type === capabilityPhraseRef.type
        && existing.id === capabilityPhraseRef.id)
    ) {
      inputRefs.push(capabilityPhraseRef);
    }
    // CapabilityContract publication surfacing
    // (capability-contract-publications). Agent contract
    // mirrors the architecture-summary publisher and
    // surfaces configured/unmatched policy counts so
    // agents see operator-authored policy alongside the
    // projection layers above. Strictly read-only.
    const capabilityContractRef = await latestRef(artifacts, "CapabilityContract");
    const capabilityContract = capabilityContractRef
      ? (await artifacts.read(capabilityContractRef)) as CapabilityContractLike
      : undefined;
    if (
      capabilityContractRef
      && !inputRefs.some((existing) =>
        existing.type === capabilityContractRef.type
        && existing.id === capabilityContractRef.id)
    ) {
      inputRefs.push(capabilityContractRef);
    }
    // CapabilityArchitectureLintReport publication surfacing
    // (capability-architecture-lint-publications). Agent
    // contract mirrors the architecture-summary publisher
    // and surfaces capability placement-policy evaluation
    // counts so agents see violation / pass / not-evaluated
    // signals alongside policy + projection layers. Strictly
    // read-only.
    const capabilityArchitectureLintRef = await latestRef(
      artifacts,
      "CapabilityArchitectureLintReport",
    );
    const capabilityArchitectureLintReport = capabilityArchitectureLintRef
      ? (await artifacts.read(capabilityArchitectureLintRef)) as CapabilityArchitectureLintReportLike
      : undefined;
    if (
      capabilityArchitectureLintRef
      && !inputRefs.some((existing) =>
        existing.type === capabilityArchitectureLintRef.type
        && existing.id === capabilityArchitectureLintRef.id)
    ) {
      inputRefs.push(capabilityArchitectureLintRef);
    }
    // CapabilityLintFindingBridgeReport publication surfacing
    // (capability-lint-finding-bridge-publications). Read-only;
    // never runs bridge generation, never writes FindingReport,
    // never mutates lifecycle / CoherencyDelta, never creates
    // WorkOrder / VerificationPlan.
    const capabilityLintFindingBridgeRef = await latestRef(
      artifacts,
      "CapabilityLintFindingBridgeReport",
    );
    const capabilityLintFindingBridgeReport = capabilityLintFindingBridgeRef
      ? (await artifacts.read(capabilityLintFindingBridgeRef)) as CapabilityLintFindingBridgeReportLike
      : undefined;
    if (
      capabilityLintFindingBridgeRef
      && !inputRefs.some((existing) =>
        existing.type === capabilityLintFindingBridgeRef.type
        && existing.id === capabilityLintFindingBridgeRef.id)
    ) {
      inputRefs.push(capabilityLintFindingBridgeRef);
    }
    // Bridge-derived findings publication surfacing
    // (bridge-derived-findings-publication). Read-only: surfaces the
    // governed FindingReport entries the controlled writer wrote.
    // Never runs the bridge writer, never mutates FindingReport,
    // FindingFilterReport, FindingLifecycleReport,
    // IssueAdjudicationReport, or CoherencyDelta; never creates
    // WorkOrder or VerificationPlan.
    const findingReportRef = await latestRef(artifacts, "FindingReport");
    const findingReport = findingReportRef
      ? (await artifacts.read(findingReportRef)) as BridgeDerivedFindingReportLike
      : undefined;
    if (
      findingReportRef
      && !inputRefs.some((existing) =>
        existing.type === findingReportRef.type
        && existing.id === findingReportRef.id)
    ) {
      inputRefs.push(findingReportRef);
    }
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
        mergeRollupFreshness,
        mergeCandidateViews,
        remediationWorkOrder: workOrders.remediation,
        resolverWorkOrder: workOrders.resolver,
        reconciliationPlan,
        verificationPlan,
        verificationPlanRef: latestVerificationPlanRef,
        verificationResult,
        verificationResultRef,
        verificationRunArtifactExists,
        pathFreshnessReport,
        pathFreshnessRef,
        ontologySuggestionReport,
        ontologySuggestionRef,
        capabilityPhraseReport,
        capabilityPhraseRef,
        capabilityContract,
        capabilityContractRef,
        capabilityArchitectureLintReport,
        capabilityArchitectureLintRef,
        capabilityLintFindingBridgeReport,
        capabilityLintFindingBridgeRef,
        findingReport,
        findingReportRef,
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
      "IssueMergeDecisionLedger",
      "FindingReport",
      "FindingLifecycleReport",
      "FindingFilterReport",
      "FindingFilterHealthReport",
      "FindingFilterPolicySuggestionReport",
      "WorkOrder",
      "ReconciliationPlan",
      "VerificationPlan",
      "VerificationResult",
      "PathFreshnessReport",
      "CapabilityOntologySuggestionReport",
      "CapabilityPhraseReport",
      "CapabilityContract",
      "CapabilityArchitectureLintReport",
      "CapabilityLintFindingBridgeReport",
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
          "Regenerate the architecture summary and agent contract when coherency, ownership, repo model, or CapabilityMap changes. CapabilityMap drives both the v1 entries section and the v2 phrase-backed capabilities section; publications read both shapes but never mutate `CapabilityMap`.",
        inputs: ["CoherencyDelta", "OwnershipMap", "CapabilityMap", "ObservedRepo"],
      },
      {
        id: "issue-adjudication.changed",
        description:
          "Regenerate publications when adjudicated issue groups change so governed counts stay current.",
        inputs: ["IssueAdjudicationReport"],
      },
      {
        id: "issue-merge-decision.changed",
        description:
          "Regenerate publications when accepted / rejected operator merge decisions change so the rendered merge-candidate decision counts and proof-report Issue Merge Decision Context stay current.",
        inputs: ["IssueMergeDecisionLedger"],
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
      {
        id: "path-freshness.changed",
        description:
          "Regenerate the architecture summary, agent contract, and proof report when a new PathFreshnessReport is written so working-tree freshness stays current.",
        inputs: ["PathFreshnessReport"],
      },
      {
        id: "capability-ontology-suggestions.changed",
        description:
          "Regenerate the architecture summary and agent contract when a new CapabilityOntologySuggestionReport is written so operators see ontology expansion proposals next to repo state. Publications never apply the suggestions automatically.",
        inputs: ["CapabilityOntologySuggestionReport"],
      },
      {
        id: "capability-phrases.changed",
        description:
          "Regenerate the architecture summary and agent contract when a new CapabilityPhraseReport is written so operators and agents see semantic purpose projection alongside repo state. Publications never run phrase projection automatically and never mutate CapabilityMap.",
        inputs: ["CapabilityPhraseReport"],
      },
      {
        id: "capability-contract.changed",
        description:
          "Regenerate the architecture summary and agent contract when a new CapabilityContract is written so operators and agents see configured/unmatched policy rows alongside repo state. Publications never run `rekon capability contract generate` automatically, never mutate `.rekon/capability-contracts.json`, and never mutate CapabilityMap, CapabilityPhraseReport, or EvidenceGraph.",
        inputs: ["CapabilityContract"],
      },
      {
        id: "capability-architecture-lint.changed",
        description:
          "Regenerate the architecture summary and agent contract when a new CapabilityArchitectureLintReport is written so operators and agents see capability placement-policy evaluation (violations / passes / not-evaluated) alongside repo state. Publications never run `rekon capability lint architecture` automatically, never mutate the lint report, and never mutate CapabilityContract, CapabilityMap, FindingReport, FindingFilterReport, FindingLifecycleReport, or CoherencyDelta. findingCandidate stays preview-only.",
        inputs: ["CapabilityArchitectureLintReport"],
      },
      {
        id: "capability-lint-finding-bridge.changed",
        description:
          "Regenerate the architecture summary and agent contract when a new CapabilityLintFindingBridgeReport is written so operators and agents see which architecture-lint rows are eligible / ineligible / needs-review to become governed findings later. Publications never run `rekon capability lint bridge-findings` automatically, never write FindingReport, never mutate FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta, and never create WorkOrder or VerificationPlan. proposedFinding stays preview-only.",
        inputs: ["CapabilityLintFindingBridgeReport"],
      },
      {
        id: "bridge-derived-findings.changed",
        description:
          "Regenerate the architecture summary and agent contract when a new FindingReport is written so operators and agents see the governed bridge-derived findings (type capability_architecture_policy, details source*) the controlled `rekon capability lint write-findings --confirm-finding-write` writer wrote. Publications read the latest FindingReport read-only: they never run the bridge writer, never mutate FindingReport, FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta, and never create WorkOrder or VerificationPlan. Bridge-derived findings are governed FindingReport entries, not lifecycle status; lifecycle and CoherencyDelta integration remain downstream. Proof-report surfacing is deferred.",
        inputs: ["FindingReport"],
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
    supersession: { key: kind },
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
  resolver?: ResolverPacketLike,
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
    ...(resolver ? [
      "",
      "## Current Preflight Context",
      "",
      `- Governed findings: ${resolver.relevantFindings?.length ?? 0}`,
      `- Risks: ${countResolverAssessments(resolver, "risk")}`,
      `- Opportunities: ${countResolverAssessments(resolver, "opportunity")}`,
      `- Semantic claims: ${countResolverAssessments(resolver, "semantic_claim")}`,
      `- Model diagnostics: ${countResolverAssessments(resolver, "model_diagnostic")}`,
      `- Model-proposed: ${countResolverAssessmentStates(resolver, "model_proposed")}`,
      `- Tool-corroborated: ${countResolverAssessmentStates(resolver, "tool_corroborated")}`,
      `- Operator-confirmed: ${countResolverAssessmentStates(resolver, "operator_confirmed")}`,
      `- Opportunity-only: ${countResolverAssessmentStates(resolver, "opportunity_only")}`,
    ] : []),
    "",
    "## Required Default Checks",
    "",
    "- npm run typecheck",
    "- npm run test",
    "- npm run build",
  ].join("\n");
}

function countResolverAssessments(resolver: ResolverPacketLike, kind: string): number {
  return resolver.relevantAssessments?.filter((assessment) => assessment.kind === kind).length ?? 0;
}

function countResolverAssessmentStates(resolver: ResolverPacketLike, state: string): number {
  return resolver.relevantAssessments?.filter((assessment) => assessment.state === state).length ?? 0;
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
  mergeRollupFreshness?: IssueMergeRollupFreshness;
  mergeCandidateViews?: IssueMergeCandidateView[];
  remediationWorkOrder?: WorkOrderLike;
  resolverWorkOrder?: WorkOrderLike;
  reconciliationPlan?: ReconciliationPlanLike;
  latestVerificationPlanRef?: ArtifactRef;
  verificationPlan?: VerificationPlanLike;
  verificationResult?: VerificationResultLike;
  verificationResultRef?: ArtifactRef;
  verificationRunArtifactExists?: boolean;
  pathFreshnessReport?: PathFreshnessReport;
  pathFreshnessRef?: ArtifactRef;
  ontologySuggestionReport?: CapabilityOntologySuggestionReportLike;
  ontologySuggestionRef?: ArtifactRef;
  capabilityPhraseReport?: CapabilityPhraseReportLike;
  capabilityPhraseRef?: ArtifactRef;
  capabilityContract?: CapabilityContractLike;
  capabilityContractRef?: ArtifactRef;
  capabilityArchitectureLintReport?: CapabilityArchitectureLintReportLike;
  capabilityArchitectureLintRef?: ArtifactRef;
  capabilityLintFindingBridgeReport?: CapabilityLintFindingBridgeReportLike;
  capabilityLintFindingBridgeRef?: ArtifactRef;
  findingReport?: BridgeDerivedFindingReportLike;
  findingReportRef?: ArtifactRef;
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
    mergeRollupFreshness,
    mergeCandidateViews,
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

  // Merge Roll-up Freshness (P1.1 issue-merge-decision-freshness-guardrails v1).
  // Always render the subsection — fresh / stale / missing — so operators
  // see lineage state at a glance and have a single `rekon refresh` recommendation
  // when any rule fires. Warnings never invalidate artifacts; they mark the
  // consumed merge-roll-up context as stale for decision-making.
  appendArchitectureMergeRollupFreshness(sections, mergeRollupFreshness, mergedRollups.length);

  // Merge Candidate Decisions — operator-ergonomics
  // surface (P1.1 issue-merge-decision-operator-ergonomics
  // v1). Surfaces the accepted / rejected / undecided
  // counts from `IssueAdjudicationReport.mergeCandidates`
  // crossed with the latest `IssueMergeDecisionLedger`
  // and points operators at the new candidate-detail and
  // `--undecided` / `--stale` / `--superseded` filter
  // commands.
  appendArchitectureMergeCandidateDecisions(sections, mergeCandidateViews);

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
  renderVerificationProofStatusBlock(sections, input);
  renderPathFreshnessSection(sections, input.pathFreshnessReport, input.pathFreshnessRef);
  renderCapabilityOntologySuggestionSection(
    sections,
    input.ontologySuggestionReport,
    input.ontologySuggestionRef,
    2,
  );
  renderCapabilityPhraseSection(
    sections,
    input.capabilityPhraseReport,
    input.capabilityPhraseRef,
    2,
  );
  // CapabilityMap v2 publication surfacing
  // (capability-map-v2-publications). The architecture
  // summary surfaces the high-confidence phrase-backed
  // projection that already lives on `CapabilityMap`.
  // Strictly read-only — never re-runs model projection,
  // never mutates `CapabilityMap`, never mutates
  // `CapabilityPhraseReport`, never mutates
  // `CapabilityNormalizationReport`, never mutates
  // `EvidenceGraph`, never implies placement / ownership /
  // routing / linting / verification / source-write
  // authority.
  renderCapabilityMapV2Section(
    sections,
    input.capabilityMap,
    pickCapabilityMapRefFromHeader(input.capabilityMap?.header),
    2,
  );
  // CapabilityContract publication surfacing
  // (capability-contract-publications). Read-only:
  // surfaces the latest CapabilityContract so operators
  // see configured/unmatched policy rows alongside the
  // projection layers above. Never runs `rekon
  // capability contract generate`, never mutates the
  // contract, never mutates
  // `.rekon/capability-contracts.json`, never mutates
  // `CapabilityMap`, `CapabilityPhraseReport`, or
  // `EvidenceGraph`.
  renderCapabilityContractSection(
    sections,
    input.capabilityContract,
    input.capabilityContractRef,
    2,
  );
  // CapabilityArchitectureLintReport publication surfacing
  // (capability-architecture-lint-publications). Read-only:
  // surfaces the latest CapabilityArchitectureLintReport so
  // operators see capability placement-policy evaluation
  // (violations / passes / not-evaluated) alongside the
  // policy + projection layers above, before the proof /
  // verification sections. Never runs `rekon capability
  // lint architecture`, never mutates the lint report,
  // CapabilityContract, CapabilityMap, FindingReport,
  // FindingFilterReport, FindingLifecycleReport, or
  // CoherencyDelta.
  renderCapabilityArchitectureLintSection(
    sections,
    input.capabilityArchitectureLintReport,
    input.capabilityArchitectureLintRef,
    2,
  );
  // CapabilityLintFindingBridgeReport publication surfacing
  // (capability-lint-finding-bridge-publications). Read-only:
  // surfaces the latest CapabilityLintFindingBridgeReport so
  // operators see which architecture-lint rows are eligible /
  // ineligible / needs-review to become governed findings
  // later, before the proof / verification sections. Never
  // runs `rekon capability lint bridge-findings`, never
  // mutates the bridge report, CapabilityArchitectureLintReport,
  // FindingReport, FindingFilterReport, FindingLifecycleReport,
  // IssueAdjudicationReport, or CoherencyDelta; never creates
  // WorkOrder or VerificationPlan.
  renderCapabilityLintFindingBridgeSection(
    sections,
    input.capabilityLintFindingBridgeReport,
    input.capabilityLintFindingBridgeRef,
    2,
  );
  // Bridge-derived findings publication surfacing. Surfaces the
  // governed FindingReport entries the controlled writer wrote
  // (distinct from the preview Capability Lint Finding Bridge
  // section above). Read-only; never mutates FindingReport,
  // lifecycle, adjudication, or CoherencyDelta; never creates
  // WorkOrder or VerificationPlan; proof-report surfacing deferred.
  renderBridgeDerivedFindingsSection(
    sections,
    input.findingReport,
    input.findingReportRef,
    2,
  );
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

function renderVerificationProofStatusBlock(
  sections: string[],
  input: ArchitectureSummaryInputs,
): void {
  if (!input.verificationResult) {
    return;
  }

  sections.push("## Verification Proof Status");
  sections.push("");

  const surface = summarizeVerificationProofSurface({
    verificationResult: input.verificationResult,
    verificationResultRef: input.verificationResultRef,
    latestVerificationPlanRef: input.latestVerificationPlanRef,
    knownRunnerRunMissing: input.verificationRunArtifactExists === false
      && Boolean(extractVerificationRunRef(input.verificationResult)),
  });

  sections.push(`- Status: ${surface.status}`);
  sections.push(`- Source: ${surface.source}`);
  sections.push(`- Freshness: ${surface.freshness}`);

  if (surface.verificationResultRef) {
    sections.push(`- VerificationResult: ${formatRef(surface.verificationResultRef)}`);
  }
  if (surface.verificationRunRef) {
    sections.push(`- VerificationRun: ${formatRef(surface.verificationRunRef)}`);
  }
  sections.push("");

  if (surface.warnings.length > 0) {
    sections.push(
      "> Verification is not complete or current. Do not mark governed issues resolved from this proof alone.",
    );
    sections.push("");
  } else if (surface.status === "passed") {
    sections.push(
      "Verification passed. Passing proof does not automatically resolve findings.",
    );
    sections.push("");
  }
}

function renderPathFreshnessSection(
  sections: string[],
  report: PathFreshnessReport | undefined,
  reportRef: ArtifactRef | undefined,
): void {
  const block = buildPathFreshnessPublicationSection({
    report,
    reportRef,
    headingLevel: 2,
  });
  for (const line of block.lines) {
    sections.push(line);
  }
}

function renderCapabilityOntologySuggestionSection(
  sections: string[],
  report: CapabilityOntologySuggestionReportLike | undefined,
  reportRef: ArtifactRef | undefined,
  headingLevel: 2 | 3,
): void {
  const block = buildCapabilityOntologySuggestionPublicationSection({
    report,
    reportRef,
    headingLevel,
  });
  for (const line of block.lines) {
    sections.push(line);
  }
}

function renderCapabilityPhraseSection(
  sections: string[],
  report: CapabilityPhraseReportLike | undefined,
  reportRef: ArtifactRef | undefined,
  headingLevel: 2 | 3,
): void {
  const block = buildCapabilityPhrasePublicationSection({
    report,
    reportRef,
    headingLevel,
  });
  for (const line of block.lines) {
    sections.push(line);
  }
}

function renderCapabilityMapV2Section(
  sections: string[],
  capabilityMap: CapabilityMapV2Like | undefined,
  capabilityMapRef: ArtifactRef | undefined,
  headingLevel: 2 | 3,
): void {
  const block = buildCapabilityMapV2PublicationSection({
    capabilityMap,
    capabilityMapRef,
    headingLevel,
  });
  for (const line of block.lines) {
    sections.push(line);
  }
}

function renderCapabilityContractSection(
  sections: string[],
  contract: CapabilityContractLike | undefined,
  contractRef: ArtifactRef | undefined,
  headingLevel: 2 | 3,
): void {
  const block = buildCapabilityContractPublicationSection({
    contract,
    contractRef,
    headingLevel,
  });
  for (const line of block.lines) {
    sections.push(line);
  }
}

function renderCapabilityArchitectureLintSection(
  sections: string[],
  report: CapabilityArchitectureLintReportLike | undefined,
  reportRef: ArtifactRef | undefined,
  headingLevel: 2 | 3,
): void {
  const block = buildCapabilityArchitectureLintPublicationSection({
    report,
    reportRef,
    headingLevel,
  });
  for (const line of block.lines) {
    sections.push(line);
  }
}

function renderCapabilityLintFindingBridgeSection(
  sections: string[],
  report: CapabilityLintFindingBridgeReportLike | undefined,
  reportRef: ArtifactRef | undefined,
  headingLevel: 2 | 3,
): void {
  const block = buildCapabilityLintFindingBridgePublicationSection({
    report,
    reportRef,
    headingLevel,
  });
  for (const line of block.lines) {
    sections.push(line);
  }
}

function renderBridgeDerivedFindingsSection(
  sections: string[],
  report: BridgeDerivedFindingReportLike | undefined,
  reportRef: ArtifactRef | undefined,
  headingLevel: 2 | 3,
): void {
  const block = buildBridgeDerivedFindingsPublicationSection({
    report,
    reportRef,
    headingLevel,
  });
  for (const line of block.lines) {
    sections.push(line);
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
  verificationResultRef?: ArtifactRef;
  latestVerificationPlanRef?: ArtifactRef;
  verificationRunArtifactExists?: boolean;
  coherencyDelta?: CoherencyDelta;
  reconciliationPlan?: ReconciliationPlanLike;
  lifecycleReport?: FindingLifecycleReport;
  mergeCandidateViews?: IssueMergeCandidateView[];
  mergeRollupFreshness?: IssueMergeRollupFreshness;
  pathFreshnessReport?: PathFreshnessReport;
  pathFreshnessRef?: ArtifactRef;
  inputRefs: ArtifactRef[];
};

function extractVerificationRunRef(
  result: VerificationResultLike | undefined,
): ArtifactRef | undefined {
  if (!result || !Array.isArray(result.header?.inputRefs)) {
    return undefined;
  }

  for (const ref of result.header!.inputRefs) {
    if (ref && typeof ref === "object" && (ref as ArtifactRef).type === "VerificationRun") {
      return ref as ArtifactRef;
    }
  }

  return undefined;
}

function renderVerificationProofSummarySection(
  sections: string[],
  surface: VerificationProofSurfaceSummary,
): void {
  sections.push("## Verification Proof Summary");
  sections.push("");
  sections.push("| Field | Value |");
  sections.push("| --- | --- |");
  sections.push(
    `| VerificationResult | ${surface.verificationResultRef ? formatRef(surface.verificationResultRef) : "—"} |`,
  );
  sections.push(
    `| VerificationPlan | ${surface.verificationPlanRef ? formatRef(surface.verificationPlanRef) : "—"} |`,
  );
  sections.push(
    `| VerificationRun | ${surface.verificationRunRef ? formatRef(surface.verificationRunRef) : "—"} |`,
  );
  sections.push(
    `| WorkOrder | ${surface.workOrderRef ? formatRef(surface.workOrderRef) : "—"} |`,
  );
  sections.push(`| Source | ${surface.source} |`);
  sections.push(`| Status | ${surface.status} |`);
  sections.push(`| Freshness | ${surface.freshness} |`);

  if (surface.recordedBy || surface.recordedAt) {
    sections.push(
      `| Recorded by | ${surface.recordedBy ?? "—"}${surface.recordedAt ? ` at ${surface.recordedAt}` : ""} |`,
    );
  }
  sections.push("");

  for (const warning of surface.warnings) {
    sections.push(`> ${warning.message}`);
    if (warning.recommendedCommand) {
      sections.push("");
      sections.push(`Recommended: \`${warning.recommendedCommand}\``);
    }
    sections.push("");
  }

  if (
    surface.warnings.length === 0
    && surface.status === "passed"
    && (surface.freshness === "fresh" || surface.freshness === "unknown")
  ) {
    sections.push(
      "> Verification passed. Passing proof does not automatically resolve findings.",
    );
    sections.push("");
  }
}

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
    mergeCandidateViews,
    mergeRollupFreshness,
    pathFreshnessReport,
    pathFreshnessRef,
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

  // Issue Merge Decision Context — P1.1
  // issue-merge-publication-detail-polish v2. Always
  // rendered when an IssueAdjudicationReport is
  // available so operators see merge-decision state
  // whether or not a VerificationPlan exists yet.
  appendProofReportMergeDecisionContext(
    sections,
    mergeCandidateViews,
    coherencyDelta,
    mergeRollupFreshness,
  );

  if (!verificationPlan) {
    sections.push(
      "No VerificationPlan found. Run `rekon intent work-order` or `rekon intent remediation` first.",
    );
    sections.push("");

    // Working Tree Freshness Context — surface
    // PathFreshnessReport even when no VerificationPlan
    // exists yet, so reviewers see working-tree state
    // independent of proof readiness.
    const earlyProofPathFreshnessBlock = buildPathFreshnessPublicationSection({
      report: pathFreshnessReport,
      reportRef: pathFreshnessRef,
      headingLevel: 2,
    });
    for (const line of earlyProofPathFreshnessBlock.lines) {
      sections.push(line);
    }

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

  // Verification Proof Summary — P1.1 verification-proof-surfaces-v2.
  // Surfaces the proof source (manual vs runner-derived), freshness
  // against the latest VerificationPlan, and any warnings the
  // classifier produced.
  const proofSurface = summarizeVerificationProofSurface({
    verificationResult,
    verificationResultRef: input.verificationResultRef,
    latestVerificationPlanRef: input.latestVerificationPlanRef ?? verificationPlanRef,
    knownRunnerRunMissing:
      verificationResult !== undefined
      && input.verificationRunArtifactExists === false
      && Boolean(extractVerificationRunRef(verificationResult)),
  });
  renderVerificationProofSummarySection(sections, proofSurface);

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
      // Digest column carries the first 12 chars of the sha256
      // hash when present — enough to verify identity without
      // dumping the full 64-char hex.
      sections.push("| Command | Status | Exit | Duration | Digests | Notes |");
      sections.push("| --- | --- | --- | --- | --- | --- |");
      for (const row of results) {
        const exitCode = typeof row.exitCode === "number" ? String(row.exitCode) : "—";
        const status = row.status ?? "—";
        const duration = typeof row.durationMs === "number" ? `${row.durationMs}ms` : "—";
        const stdoutDigest = typeof row.stdoutDigest === "string" && row.stdoutDigest.length > 0
          ? `stdout:${row.stdoutDigest.slice(0, 12)}…`
          : "";
        const stderrDigest = typeof row.stderrDigest === "string" && row.stderrDigest.length > 0
          ? `stderr:${row.stderrDigest.slice(0, 12)}…`
          : "";
        const digests = [stdoutDigest, stderrDigest].filter((entry) => entry.length > 0).join(" / ") || "—";
        sections.push(
          `| ${escapeCell(row.command ?? "—")} | ${status} | ${exitCode} | ${duration} | ${digests} | ${escapeCell(row.notes ?? "")} |`,
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

  // Working Tree Freshness Context — P1.1
  // path-freshness-publication-surfacing. Compact
  // section that surfaces the latest
  // PathFreshnessReport so reviewers know whether the
  // proof was taken against a working tree that has
  // drifted since the source-state baseline.
  const proofPathFreshnessBlock = buildPathFreshnessPublicationSection({
    report: pathFreshnessReport,
    reportRef: pathFreshnessRef,
    headingLevel: 2,
  });
  for (const line of proofPathFreshnessBlock.lines) {
    sections.push(line);
  }

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

/**
 * Render the proof-report `## Issue Merge Decision
 * Context` section. Surfaces the accepted / rejected
 * / undecided merge-candidate counts and (when
 * accepted roll-ups exist) a compact table of
 * roll-up id / groups / decision ids / member-finding
 * count / freshness. Recommends the operator-ergonomics
 * filter commands when undecided / superseded / stale
 * candidates exist. (P1.1
 * issue-merge-publication-detail-polish v2.)
 */
function appendProofReportMergeDecisionContext(
  sections: string[],
  views: IssueMergeCandidateView[] | undefined,
  coherencyDelta: CoherencyDelta | undefined,
  mergeRollupFreshness: IssueMergeRollupFreshness | undefined,
): void {
  if (!views) return;
  sections.push("## Issue Merge Decision Context");
  sections.push("");
  if (views.length === 0) {
    sections.push("No issue merge candidates in latest IssueAdjudicationReport.");
    sections.push("");
    return;
  }
  let accepted = 0;
  let rejected = 0;
  let undecided = 0;
  let stale = 0;
  let superseded = 0;
  for (const view of views) {
    if (view.decisionState === "accepted") accepted += 1;
    else if (view.decisionState === "rejected") rejected += 1;
    else undecided += 1;
    if (view.stale === true) stale += 1;
    if (view.superseded === true) superseded += 1;
  }
  const acceptedRollups = coherencyDelta ? collectMergedRollups(coherencyDelta) : [];
  sections.push(`- Merge candidates: ${views.length}`);
  sections.push(`- Accepted: ${accepted}`);
  sections.push(`- Rejected: ${rejected}`);
  sections.push(`- Undecided: ${undecided}`);
  sections.push(`- Accepted roll-ups in CoherencyDelta: ${acceptedRollups.length}`);
  sections.push("");
  if (acceptedRollups.length > 0) {
    const freshness = mergeRollupFreshness?.status ?? "unknown";
    sections.push("| Roll-up | Groups | Decision IDs | Member Findings | Freshness |");
    sections.push("| --- | --- | --- | ---: | --- |");
    for (const rollup of acceptedRollups.slice(0, 10)) {
      sections.push(
        `| ${truncate(rollup.rollupId, 50)} | ${summarizeList(rollup.mergedIssueGroupIds, 3)} | ${summarizeList(rollup.mergeDecisionIds, 3)} | ${rollup.memberFindingIds.length} | ${freshness} |`,
      );
    }
    if (acceptedRollups.length > 10) {
      sections.push(`| _… ${acceptedRollups.length - 10} more roll-ups_ | | | | |`);
    }
    sections.push("");
  }
  if (undecided > 0) {
    sections.push("Recommended command:");
    sections.push("");
    sections.push("```bash");
    sections.push("rekon issues merge candidates --undecided --json");
    sections.push("```");
    sections.push("");
  }
  if (superseded > 0) {
    sections.push(
      `${superseded} candidate decision${superseded === 1 ? " is" : "s are"} superseded by a newer ledger entry. Recommended command:`,
    );
    sections.push("");
    sections.push("```bash");
    sections.push("rekon issues merge candidates --superseded --json");
    sections.push("```");
    sections.push("");
  }
  if (stale > 0) {
    sections.push(
      `CoherencyDelta accepted merge roll-up lineage is stale for ${stale} candidate${stale === 1 ? "" : "s"}. Recommended command:`,
    );
    sections.push("");
    sections.push("```bash");
    sections.push("rekon issues merge candidates --stale --json");
    sections.push("```");
    sections.push("");
  }
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
  mergeRollupFreshness?: IssueMergeRollupFreshness;
  mergeCandidateViews?: IssueMergeCandidateView[];
  remediationWorkOrder?: WorkOrderLike;
  resolverWorkOrder?: WorkOrderLike;
  reconciliationPlan?: ReconciliationPlanLike;
  verificationPlan?: VerificationPlanLike;
  verificationPlanRef?: ArtifactRef;
  verificationResult?: VerificationResultLike;
  verificationResultRef?: ArtifactRef;
  verificationRunArtifactExists?: boolean;
  pathFreshnessReport?: PathFreshnessReport;
  pathFreshnessRef?: ArtifactRef;
  ontologySuggestionReport?: CapabilityOntologySuggestionReportLike;
  ontologySuggestionRef?: ArtifactRef;
  capabilityPhraseReport?: CapabilityPhraseReportLike;
  capabilityPhraseRef?: ArtifactRef;
  capabilityContract?: CapabilityContractLike;
  capabilityContractRef?: ArtifactRef;
  capabilityArchitectureLintReport?: CapabilityArchitectureLintReportLike;
  capabilityArchitectureLintRef?: ArtifactRef;
  capabilityLintFindingBridgeReport?: CapabilityLintFindingBridgeReportLike;
  capabilityLintFindingBridgeRef?: ArtifactRef;
  findingReport?: BridgeDerivedFindingReportLike;
  findingReportRef?: ArtifactRef;
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
  "Do not treat artifact lineage freshness as proof that the working tree has not changed; check the latest PathFreshnessReport via `rekon paths freshness --json` and run `rekon refresh` if the report is stale.",
  "Do not apply source-writing reconciliation unless an explicit future capability enables it under `write:source` permission.",
  "Do not treat raw finding count as governed issue count when an IssueAdjudicationReport exists; use governed issue groups (memberFindingIds preserves raw traceability).",
  "Do not treat accepted merge roll-ups as automatic mutation of raw issue groups; inspect mergedIssueGroupIds and memberFindingIds before editing, and consult both member groups for context.",
  "Do not treat a clean active-governance surface as proof that no raw findings exist; inspect FindingFilterReport when filter-health warnings exist or the filter rate is high.",
  "Do not apply filter policy suggestions without explicit operator approval; run `rekon findings filter-policy apply <id>` only when the operator instructs it.",
  "Do not treat filter policy suggestions as already-applied config; they are advisory until `rekon findings filter-policy apply` writes them to `.rekon/config.json`.",
  "Do not rely on active issue / coherency counts after `.rekon/config.json` `findingFilters` changed until `rekon refresh` has rebuilt the filter chain with the current policy set.",
  "Do not treat graph-aware filtering as proof that the underlying issue never existed; inspect `FindingFilterReport.filteredFindings` for the structural evidence (sibling-file existence, import-graph facts, capability ownership, module-kind routing) before drawing conclusions.",
  "Do not treat detector-detail fallback filtering as equivalent to EvidenceGraph-backed structural evidence. When `Graph-aware evidence sources` shows `DetectorDetails` entries, review them more critically than `EvidenceGraph` entries — the detector's claim was not corroborated by artifact evidence.",
  "Do not rely on accepted merge roll-ups after merge decisions, adjudication, or lifecycle artifacts change until `rekon refresh` has run.",
  "Do not assume advisory merge candidates are accepted; check IssueMergeDecisionLedger or run `rekon issues merge candidates --undecided`.",
  "Do not treat passed verification as automatic finding resolution; status changes require explicit lifecycle/status artifacts.",
  "Do not treat stale, partial, failed, timeout, killed, or not-run verification as proof of completion.",
  "Do not treat CapabilityOntologySuggestionReport entries as applied ontology config; the report is preview-only and `.rekon/capability-ontology.json` is not mutated automatically. Operators must apply proposed changes manually.",
  "Do not treat CapabilityPhraseReport entries as CapabilityMap ownership or placement policy; CapabilityPhraseReport is semantic purpose projection and CapabilityNormalizationReport remains translation audit. The high-confidence subset projects into CapabilityMap.phraseBackedCapabilities (v2); CapabilityContract policy remains deferred.",
  "Do not treat CapabilityMap v2 phrase-backed capabilities as CapabilityContract policy, resolver routing authority, architecture lint findings, verification requirements, or source-write permission. CapabilityMap v2 phrase-backed capabilities are stable capability projection; they are not placement policy, ownership policy, or source-write authority.",
  "Do not treat CapabilityContract publication surfacing as architecture linting, resolver routing, verification planning, finding resolution, RefactorPreservationContract, or source-write permission. The CapabilityContract section in this contract is policy visibility only; configured / unmatched rows are operator-authored policy records, not enforced behavior.",
  "Do not treat CapabilityArchitectureLintReport publication surfacing as FindingReport mutation, lifecycle mutation, CoherencyDelta remediation, resolver routing, verification planning, RefactorPreservationContract, or source-write permission. The Capability Architecture Linting section is evaluation visibility only; violation rows are policy-evaluation signals, not governed findings, and findingCandidate is preview-only.",
  "Do not treat CapabilityLintFindingBridgeReport publication surfacing as FindingReport writing, lifecycle mutation, CoherencyDelta remediation, WorkOrder creation, VerificationPlan generation, resolver routing, verification planning, RefactorPreservationContract, or source-write permission. The Capability Lint Finding Bridge section is preview visibility only; eligible candidates are proposed governed-finding candidates only, needs-review candidates require operator review, and proposedFinding is preview-only — no FindingReport is written.",
  "Do not treat bridge-derived FindingReport entries as lifecycle status, adjudication, CoherencyDelta remediation, WorkOrder creation, VerificationPlan creation, resolver routing, verification planning, RefactorPreservationContract, or source-write permission. The Bridge-Derived Findings section surfaces governed FindingReport entries written by the controlled `--confirm-finding-write` writer; they are provenance-bearing findings, not lifecycle status, and lifecycle / CoherencyDelta integration remain downstream.",
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
    mergeRollupFreshness,
    mergeCandidateViews,
    remediationWorkOrder,
    resolverWorkOrder,
    reconciliationPlan,
    verificationPlan,
    verificationPlanRef,
    verificationResult,
    pathFreshnessReport,
    pathFreshnessRef,
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

  // Merge Decision Freshness — agent-facing companion to the
  // architecture-summary `### Merge Roll-up Freshness`
  // subsection. (P1.1 issue-merge-decision-freshness-guardrails v1.)
  appendAgentContractMergeRollupFreshness(sections, mergeRollupFreshness, mergedRollups.length);

  // Merge Candidate Decisions — agent-facing counts of
  // accepted / rejected / undecided merge candidates +
  // operator commands to surface to the user. (P1.1
  // issue-merge-decision-operator-ergonomics v1.)
  appendAgentContractMergeCandidateDecisions(sections, mergeCandidateViews);

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

  // Proof source / freshness summary — P1.1
  // verification-proof-surfaces-v2. Always rendered so agents see
  // the classifier output even when proof is missing.
  const agentProofSurface = summarizeVerificationProofSurface({
    verificationResult,
    verificationResultRef: input.verificationResultRef,
    latestVerificationPlanRef: verificationPlanRef,
    knownRunnerRunMissing: input.verificationRunArtifactExists === false
      && verificationResult !== undefined
      && Boolean(extractVerificationRunRef(verificationResult)),
  });
  sections.push(`- Proof source: ${agentProofSurface.source}`);
  sections.push(`- Proof freshness: ${agentProofSurface.freshness}`);

  if (resultStatus === "failed" || resultStatus === "partial" || resultStatus === "not-run") {
    sections.push("");
    sections.push("> Verification is not complete.");
    sections.push("");
    sections.push("Agent instruction:");
    sections.push("- Treat proof as incomplete.");
    sections.push("- Do not claim completion.");
    sections.push("- Re-run verification (`rekon verify run --plan <id> --execute`) or ask the operator for proof.");
  } else if (resultStatus === "passed") {
    sections.push("");
    sections.push("> Verification recorded as passed. This does not automatically resolve findings.");
  }

  if (agentProofSurface.freshness === "stale"
    || agentProofSurface.freshness === "missing-plan") {
    sections.push("");
    sections.push("> Verification proof is stale relative to the latest VerificationPlan.");
    sections.push("");
    sections.push("Agent instruction:");
    sections.push("- Do not rely on stale proof.");
    sections.push("- Run or request verification for the latest plan.");
  }

  if (agentProofSurface.source === "unknown") {
    sections.push("");
    sections.push(
      "> VerificationResult source could not be classified (manual vs runner-derived).",
    );
  }

  if (verificationResult?.summary) {
    const sum = verificationResult.summary;
    sections.push("");
    sections.push(
      `Verification summary: passed ${sum.passed ?? 0} / failed ${sum.failed ?? 0} / skipped ${sum.skipped ?? 0} / not-run ${sum.notRun ?? 0}.`,
    );
  }

  if (agentProofSurface.verificationRunRef) {
    sections.push("");
    sections.push(`Runner-derived proof cites ${formatRef(agentProofSurface.verificationRunRef)}.`);
  }
  sections.push("");

  // Working Tree Path Freshness — P1.1
  // path-freshness-publication-surfacing. Surfaced
  // here (between proof status and memory guidance)
  // so agents see working-tree drift before they act
  // on memory or proof state. The block uses heading
  // level 3 because the agent contract treats this as
  // a subsection of the overall operating state.
  const agentPathFreshnessBlock = buildPathFreshnessPublicationSection({
    report: pathFreshnessReport,
    reportRef: pathFreshnessRef,
    headingLevel: 3,
  });
  for (const line of agentPathFreshnessBlock.lines) {
    sections.push(line);
  }

  // Capability ontology suggestion surfacing (P1.1
  // capability-ontology-suggestion-publications). Heading
  // level 3 so the section sits inside the operating-state
  // group. Always rendered (with no-report guidance when
  // empty) so agents know they must not treat suggestions
  // as applied vocabulary.
  renderCapabilityOntologySuggestionSection(
    sections,
    input.ontologySuggestionReport,
    input.ontologySuggestionRef,
    3,
  );

  // Capability phrase publication surfacing
  // (capability-phrase-publications). Heading level 3 so
  // the section sits inside the operating-state group.
  // Always rendered (with no-report guidance when empty)
  // so agents know phrases are semantic purpose
  // projection, not CapabilityMap placement policy.
  renderCapabilityPhraseSection(
    sections,
    input.capabilityPhraseReport,
    input.capabilityPhraseRef,
    3,
  );

  // CapabilityMap v2 publication surfacing
  // (capability-map-v2-publications). Heading level 3 so
  // agents see phrase-backed capabilities inside the
  // operating-state group. Always rendered (with
  // no-report guidance when empty) so agents know
  // phrase-backed capabilities are stable capability
  // projection, not placement policy or source-write
  // authority.
  renderCapabilityMapV2Section(
    sections,
    input.capabilityMap,
    pickCapabilityMapRefFromHeader(input.capabilityMap?.header),
    3,
  );

  // CapabilityContract publication surfacing
  // (capability-contract-publications). Heading level 3
  // so the section sits inside the operating-state
  // group. Always rendered (with no-contract guidance
  // when empty) so agents see operator-authored policy
  // alongside repo state. Strictly read-only — never
  // runs `rekon capability contract generate`, never
  // mutates the contract, never mutates
  // `.rekon/capability-contracts.json`, never mutates
  // CapabilityMap / CapabilityPhraseReport /
  // EvidenceGraph, never implies enforcement.
  renderCapabilityContractSection(
    sections,
    input.capabilityContract,
    input.capabilityContractRef,
    3,
  );

  // CapabilityArchitectureLintReport publication surfacing
  // (capability-architecture-lint-publications). Heading
  // level 3 so the section sits inside the operating-state
  // group. Always rendered (with no-report guidance when
  // empty) so agents see capability placement-policy
  // evaluation alongside repo state. Strictly read-only —
  // never runs `rekon capability lint architecture`, never
  // mutates the lint report, CapabilityContract,
  // CapabilityMap, FindingReport, FindingFilterReport,
  // FindingLifecycleReport, or CoherencyDelta, never implies
  // enforcement.
  renderCapabilityArchitectureLintSection(
    sections,
    input.capabilityArchitectureLintReport,
    input.capabilityArchitectureLintRef,
    3,
  );

  // CapabilityLintFindingBridgeReport publication surfacing
  // (capability-lint-finding-bridge-publications). Heading
  // level 3 so the section sits inside the operating-state
  // group. Always rendered (with no-report guidance when
  // empty) so agents see which lint rows are eligible /
  // ineligible / needs-review to become governed findings
  // later. Strictly read-only — never runs `rekon capability
  // lint bridge-findings`, never writes FindingReport, never
  // mutates lifecycle / CoherencyDelta, never creates
  // WorkOrder / VerificationPlan, never implies enforcement.
  renderCapabilityLintFindingBridgeSection(
    sections,
    input.capabilityLintFindingBridgeReport,
    input.capabilityLintFindingBridgeRef,
    3,
  );
  // Bridge-derived findings publication surfacing (heading level 3,
  // inside the operating-state group). Surfaces the governed
  // FindingReport entries the controlled writer wrote. Read-only;
  // never mutates FindingReport, lifecycle, adjudication, or
  // CoherencyDelta; never creates WorkOrder or VerificationPlan.
  renderBridgeDerivedFindingsSection(
    sections,
    input.findingReport,
    input.findingReportRef,
    3,
  );

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

/**
 * Render the Merge Roll-up Freshness subsection right
 * below `## Accepted Issue Merge Roll-ups`. Always emits
 * a `Status:` line + a `Recommended command:` line when
 * any warning fires + a table of `(code, message,
 * recommended command)` rows. Stays silent (only
 * emits the heading) when there are no merge roll-ups
 * AND no warnings — operators don't need a freshness
 * verdict when nothing was merged.
 *
 * (P1.1 issue-merge-decision-freshness-guardrails v1.)
 */
function appendArchitectureMergeRollupFreshness(
  sections: string[],
  freshness: IssueMergeRollupFreshness | undefined,
  mergedRollupCount: number,
): void {
  if (!freshness) return;
  if (mergedRollupCount === 0 && freshness.warnings.length === 0) {
    // No roll-ups, nothing to warn about — the existing
    // "No accepted issue merge roll-ups in latest
    // CoherencyDelta." line above already covers the
    // empty case.
    return;
  }
  sections.push("### Merge Roll-up Freshness");
  sections.push("");
  sections.push(`- Status: ${freshness.status}`);
  sections.push("");
  if (freshness.warnings.length === 0) {
    sections.push("Accepted merge roll-up lineage is fresh.");
    sections.push("");
    return;
  }
  sections.push("| Code | Message | Recommended Command |");
  sections.push("| --- | --- | --- |");
  for (const warning of freshness.warnings) {
    sections.push(
      `| \`${warning.code}\` | ${escapeTableCell(warning.message)} | \`${warning.recommendedCommand}\` |`,
    );
  }
  sections.push("");
  sections.push(
    "> Do not rely on accepted merge roll-ups until `rekon refresh` rebuilds adjudication and coherency state.",
  );
  sections.push("");
  if (freshness.recommendedCommand) {
    sections.push(`Recommended command: \`${freshness.recommendedCommand}\`.`);
    sections.push("");
  }
}

/**
 * Replace `|` and newline characters in a string so it
 * renders as a single Markdown table cell without
 * breaking the row. Conservative — only the two
 * characters that break a table cell.
 */
function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * Render the architecture-summary Merge Candidate
 * Decisions section. Always emits the heading so the
 * counts are visible at a glance; the table fans out
 * decisions across the three states (accepted /
 * rejected / undecided) and the section recommends
 * specific operator commands when undecided or
 * stale/superseded candidates exist.
 *
 * (P1.1 issue-merge-decision-operator-ergonomics v1.)
 */
function appendArchitectureMergeCandidateDecisions(
  sections: string[],
  views: IssueMergeCandidateView[] | undefined,
): void {
  sections.push("## Merge Candidate Decisions");
  sections.push("");
  if (!views || views.length === 0) {
    sections.push(
      "No issue merge candidates in latest IssueAdjudicationReport.",
    );
    sections.push("");
    return;
  }
  let accepted = 0;
  let rejected = 0;
  let undecided = 0;
  let stale = 0;
  let superseded = 0;
  for (const view of views) {
    if (view.decisionState === "accepted") accepted += 1;
    else if (view.decisionState === "rejected") rejected += 1;
    else undecided += 1;
    if (view.stale === true) stale += 1;
    if (view.superseded === true) superseded += 1;
  }
  sections.push(`- Total: ${views.length}`);
  sections.push(`- Accepted: ${accepted}`);
  sections.push(`- Rejected: ${rejected}`);
  sections.push(`- Undecided: ${undecided}`);
  sections.push("");
  if (undecided > 0) {
    sections.push("Recommended command:");
    sections.push("");
    sections.push("```bash");
    sections.push("rekon issues merge candidates --undecided --json");
    sections.push("```");
    sections.push("");
  }
  if (accepted > 0) {
    sections.push("Audit accepted candidates via:");
    sections.push("");
    sections.push("```bash");
    sections.push("rekon issues merge candidates --decision accepted --json");
    sections.push("```");
    sections.push("");
  }
  if (superseded > 0) {
    sections.push(
      `${superseded} candidate decision${superseded === 1 ? " is" : "s are"} superseded by a newer ledger entry. Run:`,
    );
    sections.push("");
    sections.push("```bash");
    sections.push("rekon issues merge candidates --superseded --json");
    sections.push("```");
    sections.push("");
  }
  if (stale > 0) {
    sections.push(
      `CoherencyDelta accepted merge roll-up lineage is stale for ${stale} candidate${stale === 1 ? "" : "s"}. Run:`,
    );
    sections.push("");
    sections.push("```bash");
    sections.push("rekon issues merge candidates --stale --json");
    sections.push("```");
    sections.push("");
  }
  sections.push(
    "Inspect any candidate via `rekon issues merge candidate <candidate-id>` (human-readable) or add `--json` for the structured view. Record or revise decisions via `rekon issues merge decide <candidate-id> --decision accepted|rejected --note <note>`.",
  );
  sections.push("");
}

/**
 * Agent-contract companion to
 * `appendArchitectureMergeRollupFreshness`. Emits a
 * compact bullet list of (merge decisions, adjudication,
 * lifecycle) status plus a recommended command. When any
 * rule fires, prepends the "Do not rely on accepted
 * merge roll-ups …" callout. Empty when there are no
 * roll-ups and no warnings.
 *
 * (P1.1 issue-merge-decision-freshness-guardrails v1.)
 */
/**
 * Agent-facing companion to
 * `appendArchitectureMergeCandidateDecisions`. Emits a
 * compact "Merge candidate decisions:" block with the
 * three counts plus pointers to the operator-ergonomics
 * commands. When undecided candidates exist, the
 * section adds an explicit instruction to ask the
 * operator to review them.
 *
 * (P1.1 issue-merge-decision-operator-ergonomics v1.)
 */
function appendAgentContractMergeCandidateDecisions(
  sections: string[],
  views: IssueMergeCandidateView[] | undefined,
): void {
  if (!views || views.length === 0) return;
  let accepted = 0;
  let rejected = 0;
  let undecided = 0;
  let stale = 0;
  let superseded = 0;
  for (const view of views) {
    if (view.decisionState === "accepted") accepted += 1;
    else if (view.decisionState === "rejected") rejected += 1;
    else undecided += 1;
    if (view.stale === true) stale += 1;
    if (view.superseded === true) superseded += 1;
  }
  sections.push("### Merge Candidate Decisions");
  sections.push("");
  sections.push("Merge candidate decisions:");
  sections.push(`- Undecided: ${undecided}`);
  sections.push(`- Accepted: ${accepted}`);
  sections.push(`- Rejected: ${rejected}`);
  sections.push("");
  if (undecided > 0) {
    sections.push(
      "Ask the operator to review undecided candidates before treating merge roll-ups as final.",
    );
    sections.push("Command: `rekon issues merge candidates --undecided --json`");
    sections.push("");
  }
  if (accepted > 0) {
    sections.push(
      `Audit accepted candidates via: \`rekon issues merge candidates --decision accepted --json\``,
    );
    sections.push("");
  }
  if (superseded > 0) {
    sections.push(
      `${superseded} candidate decision${superseded === 1 ? " is" : "s are"} superseded by a newer ledger entry. Command: \`rekon issues merge candidates --superseded --json\``,
    );
    sections.push("");
  }
  if (stale > 0) {
    sections.push(
      `Merge roll-up lineage is stale for ${stale} candidate${stale === 1 ? "" : "s"}. Command: \`rekon issues merge candidates --stale --json\``,
    );
    sections.push("");
  }
}

function appendAgentContractMergeRollupFreshness(
  sections: string[],
  freshness: IssueMergeRollupFreshness | undefined,
  mergedRollupCount: number,
): void {
  if (!freshness) return;
  if (mergedRollupCount === 0 && freshness.warnings.length === 0) {
    return;
  }
  sections.push("### Merge Decision Freshness");
  sections.push("");
  const codes = new Set(freshness.warnings.map((warning) => warning.code));
  const mergeStatus = freshness.warnings.length === 0
    ? "fresh"
    : codes.has("merge-ledger-missing") || codes.has("merge-ledger-stale") || codes.has("merge-decision-superseded")
      ? "stale"
      : "fresh";
  const adjudicationStatus = codes.has("adjudication-stale") ? "stale" : "fresh";
  const lifecycleStatus = codes.has("lifecycle-stale") ? "stale" : "fresh";
  if (freshness.warnings.length > 0) {
    sections.push(
      "> Do not rely on accepted merge roll-ups until `rekon refresh` rebuilds adjudication and coherency state.",
    );
    sections.push("");
  }
  sections.push(`- Merge decisions: ${mergeStatus}`);
  sections.push(`- Adjudication: ${adjudicationStatus}`);
  sections.push(`- Lifecycle: ${lifecycleStatus}`);
  sections.push("- Recommended command: `rekon refresh`");
  sections.push("");
  if (freshness.warnings.length > 0) {
    sections.push("Warnings:");
    for (const warning of freshness.warnings) {
      sections.push(`- \`${warning.code}\`: ${warning.message}`);
    }
    sections.push("");
  }
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

  // Graph-aware import evidence publication diagnostics: a
  // compact evidence-source breakdown (and per-reason if
  // non-empty). Lets operators see whether graph-aware
  // suppressions are artifact-backed (EvidenceGraph) or
  // relying on fallback (`DetectorDetails` /
  // `ObservedRepo`).
  const graphAwareSourceRows = sortedCountEntries(summary.graphAwareByEvidenceSource);
  if (graphAwareSourceRows.length > 0 || (summary.graphAwareFiltered ?? 0) > 0) {
    sections.push("### Graph-Aware Evidence Sources");
    sections.push("");
    if (graphAwareSourceRows.length === 0) {
      sections.push("No graph-aware filtered findings.");
      sections.push("");
    } else {
      sections.push("| Evidence Source | Count |");
      sections.push("| --- | --- |");
      for (const [source, count] of graphAwareSourceRows) {
        sections.push(`| ${source} | ${count} |`);
      }
      sections.push("");
      const reasonEvidence = summary.graphAwareReasonEvidenceSources;
      if (reasonEvidence && Object.keys(reasonEvidence).length > 0) {
        // Render the per-reason × per-source matrix.
        // Columns: EvidenceGraph, DetectorDetails,
        // ObservedRepo, plus a single Other column for
        // anything else (Policy / BuiltIn / ResultFilter
        // would not normally appear here since these
        // entries are pre-filtered to
        // `isGraphAwareFiltered`, but a future producer
        // could surface them).
        sections.push(
          "| Reason | EvidenceGraph | Detector Details | ObservedRepo | Other |",
        );
        sections.push("| --- | ---: | ---: | ---: | ---: |");
        const reasonsSorted = Object.keys(reasonEvidence).sort();
        for (const reason of reasonsSorted) {
          const map = reasonEvidence[reason] ?? {};
          const eg = map.EvidenceGraph ?? 0;
          const dd = map.DetectorDetails ?? 0;
          const or = map.ObservedRepo ?? 0;
          const other = Object.entries(map)
            .filter(([source]) =>
              source !== "EvidenceGraph" && source !== "DetectorDetails" && source !== "ObservedRepo",
            )
            .reduce((acc, [, count]) => acc + count, 0);
          sections.push(`| ${reason} | ${eg} | ${dd} | ${or} | ${other} |`);
        }
        sections.push("");
      }
    }
    sections.push(
      "EvidenceGraph-backed entries are artifact-backed structural suppressions. DetectorDetails fallback entries are weaker (the detector's claim is taken at face value); review them when they dominate. ObservedRepo entries are sibling-file evidence — structurally strong but lower-detail than import-graph evidence.",
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

    // Graph-aware import evidence publication
    // diagnostics: compact evidence-source summary so
    // agents (and operators reading the contract) can tell
    // whether graph-aware suppression is artifact-backed
    // or relying on fallback evidence.
    const graphSources = summary.graphAwareByEvidenceSource;
    if (graphSources && Object.keys(graphSources).length > 0) {
      sections.push("Graph-aware evidence sources:");
      const ordered = Object.keys(graphSources).sort();
      for (const source of ordered) {
        sections.push(`- ${source}: ${graphSources[source]}`);
      }
      sections.push("");
    }
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

// ---------------------------------------------------------------
// GitHub Check publisher (beta) — gated skeleton.
//
// Step 6a of the CI / GitHub adapter implementation sequence
// pinned by
// docs/strategy/verification-runner-ci-github-decision.md and
// docs/strategy/verification-runner-github-check-publisher-decision.md.
//
// This module exposes two pure helpers:
// - `buildGitHubCheckPayload(...)` — renders a Check payload
//   (name, conclusion, output title / summary / text) from
//   Rekon artifact-like inputs.
// - `assessGitHubCheckPublisherReadiness(...)` — returns a
//   `{ ready, issues[] }` readiness report after evaluating
//   opt-in env vars, token presence, head SHA presence, and
//   event trust.
//
// Both helpers are pure. The module:
// - Makes no GitHub API call.
// - Imports no HTTP client or GitHub SDK.
// - Does not read environment variables itself — the caller
//   passes them in as an explicit `env` map.
// - Does not write to disk.
// - Does not spawn / exec anything.
// - Never treats the eventual Check status as canonical truth.
//
// The payload always includes the phrase:
//   "GitHub status is not canonical truth; Rekon artifacts remain canonical."
//
// ---------------------------------------------------------------

export const GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER =
  "GitHub status is not canonical truth; Rekon artifacts remain canonical.";

export const GITHUB_CHECK_PUBLISHER_DEFAULT_NAME = "Rekon Verification";

export type GitHubCheckPublisherConfig = {
  /**
   * `true` only when the caller has confirmed all opt-in
   * conditions externally. The skeleton's readiness helper
   * computes this for callers; setting this manually does not
   * bypass the readiness check.
   */
  enabled: boolean;
  repository?: string;
  headSha?: string;
  runUrl?: string;
  /**
   * Optional override for the Check name. Defaults to
   * `GITHUB_CHECK_PUBLISHER_DEFAULT_NAME`.
   */
  name?: string;
};

export type GitHubCheckConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "timed_out"
  | "action_required";

export type GitHubCheckPayload = {
  name: string;
  headSha?: string;
  status: "completed";
  conclusion: GitHubCheckConclusion;
  output: {
    title: string;
    summary: string;
    text?: string;
  };
  externalId?: string;
  /**
   * Refs the Check payload cited in its summary. Surfaced
   * separately so callers (the future API client) can use
   * the same list for telemetry without re-parsing the
   * summary markdown.
   */
  citedRefs: ArtifactRef[];
};

export type GitHubCheckPublisherReadinessIssueCode =
  | "not-enabled"
  | "missing-token"
  | "missing-repository"
  | "missing-sha"
  | "missing-pr-head-sha"
  | "untrusted-event"
  | "write-permission-not-confirmed";

export type GitHubCheckPublisherReadinessIssue = {
  code: GitHubCheckPublisherReadinessIssueCode;
  message: string;
};

export type GitHubCheckPublisherReadiness = {
  ready: boolean;
  issues: GitHubCheckPublisherReadinessIssue[];
};

/**
 * Trust tiers for GitHub Actions events. Used by the
 * readiness gate to decide which events the publisher
 * (when eventually live) is allowed to write Checks for.
 *
 * - `trusted` — event runs in the upstream repo's context
 *   with the upstream's secrets attached.
 * - `untrusted-fork` — pull-request event from a fork.
 *   Refused by default; can be opted in per call via the
 *   `forkOverride` flag.
 * - `unconditional-deny` — `pull_request_target`. Even
 *   with `forkOverride: true` the readiness gate refuses.
 */
export type GitHubCheckEventTrust =
  | "trusted"
  | "untrusted-fork"
  | "unconditional-deny";

export type GitHubCheckPublisherReadinessEvent = {
  /**
   * The GitHub Actions event name (e.g. `pull_request`,
   * `workflow_dispatch`, `push`, `pull_request_target`).
   */
  name: string;
  /**
   * For `pull_request` events: whether the PR head is a fork
   * relative to the base repository. `true` means fork, `false`
   * means same-repo. Ignored for non-PR events.
   */
  pullRequestIsFork?: boolean;
};

export type GitHubCheckPublisherReadinessInput = {
  /**
   * Environment-variable snapshot. The skeleton reads from
   * this map rather than `process.env` directly so the helper
   * stays pure and easy to test.
   */
  env: Record<string, string | undefined>;
  /**
   * The GitHub Actions event context. Required to classify
   * trust.
   */
  event: GitHubCheckPublisherReadinessEvent;
  /**
   * When `true`, fork pull-request events are treated as
   * trusted. Intended for cases where the upstream maintainer
   * has manually approved the run via an
   * environment-protection rule or equivalent. Has no effect
   * on `pull_request_target`.
   */
  forkOverride?: boolean;
  /**
   * The caller must affirm that the workflow has been granted
   * `checks: write`. The skeleton refuses to mark the
   * publisher ready otherwise. The actual GitHub permission
   * check happens at API-call time in a later slice.
   */
  writePermissionConfirmed?: boolean;
  /**
   * Optional override for the head SHA. When absent the
   * readiness helper falls back to `env.GITHUB_SHA`.
   */
  headShaOverride?: string;
};

function classifyEventTrust(
  event: GitHubCheckPublisherReadinessEvent,
): GitHubCheckEventTrust {
  if (event.name === "pull_request_target") return "unconditional-deny";
  if (event.name === "pull_request") {
    return event.pullRequestIsFork ? "untrusted-fork" : "trusted";
  }
  if (event.name === "workflow_dispatch") return "trusted";
  if (event.name === "push") return "trusted";
  // Schedule, repository_dispatch, and other token-bearing
  // events are not yet classified. Default to untrusted-fork
  // so the readiness gate refuses by default; a later slice
  // can add explicit support.
  return "untrusted-fork";
}

function readEnvFlag(
  env: Record<string, string | undefined>,
  key: string,
): boolean {
  const raw = env[key];
  if (raw === undefined || raw === null) return false;
  const normalized = String(raw).trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

/**
 * Assess whether the GitHub Check publisher is ready to call
 * GitHub. **The publisher in this slice never calls GitHub;**
 * the readiness report tells callers (the future CLI / API
 * client) whether the API call would be safe to attempt.
 *
 * Readiness rules:
 * - `REKON_GITHUB_CHECKS` must be `"1"` or `"true"`.
 * - `GITHUB_TOKEN` must be present and non-empty.
 * - `GITHUB_REPOSITORY` must be present and non-empty.
 * - A head SHA must be present (`headShaOverride` or
 *   `GITHUB_SHA`).
 * - The event must be `trusted`. `untrusted-fork` requires
 *   an explicit `forkOverride: true`; `unconditional-deny`
 *   refuses unconditionally.
 * - The caller must confirm `checks: write` is granted
 *   (`writePermissionConfirmed: true`).
 */
export function assessGitHubCheckPublisherReadiness(
  input: GitHubCheckPublisherReadinessInput,
): GitHubCheckPublisherReadiness {
  const issues: GitHubCheckPublisherReadinessIssue[] = [];

  if (!readEnvFlag(input.env, "REKON_GITHUB_CHECKS")) {
    issues.push({
      code: "not-enabled",
      message:
        "REKON_GITHUB_CHECKS is not set to 1 / true. The GitHub Check publisher is disabled by default.",
    });
  }

  const token = input.env.GITHUB_TOKEN;
  if (!token || String(token).trim() === "") {
    issues.push({
      code: "missing-token",
      message:
        "GITHUB_TOKEN is missing. The publisher cannot authenticate without an Actions-provided token.",
    });
  }

  const repository = input.env.GITHUB_REPOSITORY;
  if (!repository || String(repository).trim() === "") {
    issues.push({
      code: "missing-repository",
      message:
        "GITHUB_REPOSITORY is missing. The publisher needs the <owner>/<repo> slug to address the Check API.",
    });
  }

  // Trust-boundary hardening (step 9, fix #6): PR head SHA
  // safety. On `pull_request` events, GITHUB_SHA is the merge
  // commit SHA — Checks attached to it appear on the wrong
  // commit. Require an explicit head SHA
  // (`headShaOverride` / `--head-sha` / `GITHUB_HEAD_SHA`)
  // before allowing a pull_request send.
  const isPullRequestEvent =
    input.event.name === "pull_request" || input.event.name === "pull_request_target";
  const explicitHeadSha =
    input.headShaOverride !== undefined && String(input.headShaOverride).trim() !== ""
      ? String(input.headShaOverride).trim()
      : undefined;

  if (isPullRequestEvent && !explicitHeadSha) {
    issues.push({
      code: "missing-pr-head-sha",
      message:
        "pull_request events require an explicit head SHA (--head-sha or GITHUB_HEAD_SHA). GITHUB_SHA on pull_request events is the merge commit SHA, not the PR head; attaching a Check to it would render against the wrong commit.",
    });
  }

  const headSha = explicitHeadSha ?? input.env.GITHUB_SHA;
  if (!headSha || String(headSha).trim() === "") {
    issues.push({
      code: "missing-sha",
      message:
        "Head SHA is missing. The publisher needs the commit SHA the Check should attach to.",
    });
  }

  const trust = classifyEventTrust(input.event);
  if (trust === "unconditional-deny") {
    issues.push({
      code: "untrusted-event",
      message:
        "pull_request_target is refused unconditionally. The publisher must not attach Checks to fork-PR code running in the upstream's context.",
    });
  } else if (trust === "untrusted-fork" && input.forkOverride !== true) {
    issues.push({
      code: "untrusted-event",
      message:
        "Forked pull requests are not trusted by default. Pass forkOverride: true only when the upstream maintainer has explicitly approved the run.",
    });
  }

  if (input.writePermissionConfirmed !== true) {
    issues.push({
      code: "write-permission-not-confirmed",
      message:
        "Caller did not confirm checks: write was granted. The publisher refuses to attempt the Check API call without explicit confirmation.",
    });
  }

  return { ready: issues.length === 0, issues };
}

export type GitHubCheckPublisherFreshness =
  | "fresh"
  | "stale"
  | "missing-plan"
  | "unknown";

export type GitHubCheckPublisherProofStatus =
  | "passed"
  | "failed"
  | "partial"
  | "not-run"
  | "missing";

export type GitHubCheckPublisherRunStatus =
  | "completed"
  | "timeout"
  | "killed"
  | "in-progress"
  | "not-started"
  | "unknown";

/**
 * Pure inputs to `buildGitHubCheckPayload`. The skeleton
 * does not read artifacts from disk in this slice — the
 * caller passes in the shapes it has already loaded.
 */
export type BuildGitHubCheckPayloadInput = {
  config: GitHubCheckPublisherConfig;
  verificationResult?: VerificationResultLike;
  verificationResultRef?: ArtifactRef;
  verificationRun?: {
    header: ArtifactHeader;
    status?: GitHubCheckPublisherRunStatus;
  };
  verificationRunRef?: ArtifactRef;
  verificationPlanRef?: ArtifactRef;
  proofReportRef?: ArtifactRef;
  architectureSummaryRef?: ArtifactRef;
  agentContractRef?: ArtifactRef;
  /**
   * `true` when `rekon artifacts validate` passed. `false`
   * when it failed. Anything else (undefined) means the
   * caller did not run `artifacts validate`; the publisher
   * treats that as "not asserted" and does not override the
   * conclusion based on it.
   */
  artifactsValid?: boolean;
  /**
   * Optional explicit freshness signal. When omitted the
   * helper infers freshness using
   * `summarizeVerificationProofSurface`.
   */
  freshness?: GitHubCheckPublisherFreshness;
  /**
   * Optional latest `PathFreshnessReport` for the workspace.
   * **Surfaced as a trust warning only; never flips Check
   * conclusion** in this slice. See
   * `docs/strategy/watcher-path-freshness-policy-decision.md`
   * + `docs/strategy/post-beta-dogfood-evidence-triage.md`.
   */
  pathFreshnessReport?: PathFreshnessReport;
  /**
   * Optional ref for the report cited above. When the
   * report is supplied but the ref is omitted, the helper
   * derives a ref from `pathFreshnessReport.header` when
   * possible.
   */
  pathFreshnessRef?: ArtifactRef;
  /**
   * Proof-chain warnings discovered by the caller while
   * resolving verification artifacts. These do affect the
   * Check conclusion because the payload would otherwise imply
   * a coherent verification proof that Rekon could not load.
   */
  proofChainWarnings?: string[];
};

function deriveProofStatus(
  result: VerificationResultLike | undefined,
): GitHubCheckPublisherProofStatus {
  if (!result) return "missing";
  const status = result.status;
  if (status === "passed" || status === "failed" || status === "partial" || status === "not-run") {
    return status;
  }
  return "missing";
}

function deriveFreshness(
  input: BuildGitHubCheckPayloadInput,
): GitHubCheckPublisherFreshness {
  if (input.freshness) return input.freshness;
  if (!input.verificationPlanRef) return "missing-plan";
  if (!input.verificationResult) return "stale";

  const surface = summarizeVerificationProofSurface({
    verificationResult: input.verificationResult as unknown as Parameters<
      typeof summarizeVerificationProofSurface
    >[0]["verificationResult"],
    verificationResultRef: input.verificationResultRef,
    latestVerificationPlanRef: input.verificationPlanRef,
  });
  if (surface.freshness === "fresh") return "fresh";
  if (surface.freshness === "stale") return "stale";
  if (surface.freshness === "missing-plan") return "missing-plan";
  return "unknown";
}

function pickConclusion(
  proof: GitHubCheckPublisherProofStatus,
  run: GitHubCheckPublisherRunStatus,
  freshness: GitHubCheckPublisherFreshness,
  artifactsValid: boolean | undefined,
  proofChainHasWarnings = false,
): GitHubCheckConclusion {
  // Conflict resolution: pick the most specific signal available.
  // `failure` outranks `timed_out` outranks `action_required`
  // outranks `neutral` outranks `success` — but a run-level
  // `timeout` signal is more specific than the generic
  // `result.status === "failed"` it implies, so timeout wins
  // over a plain failed-result signal. `killed` and
  // `artifacts validate false` are the most severe and stay at
  // the top.
  if (artifactsValid === false) return "failure";
  if (run === "killed") return "failure";
  if (run === "timeout") return "timed_out";
  if (proof === "failed") return "failure";
  if (proofChainHasWarnings) return "action_required";
  if (proof === "partial") return "action_required";
  if (proof === "missing") return "action_required";
  if (freshness === "stale" || freshness === "missing-plan") return "action_required";
  if (proof === "not-run") return "neutral";
  if (proof === "passed" && freshness === "fresh") return "success";
  // Default to neutral when no signal definitively says
  // pass / fail.
  return "neutral";
}

function describeConclusion(
  conclusion: GitHubCheckConclusion,
  proof: GitHubCheckPublisherProofStatus,
  run: GitHubCheckPublisherRunStatus,
  proofChainHasWarnings = false,
): string {
  switch (conclusion) {
    case "success":
      return "Verification: passed (fresh)";
    case "failure": {
      if (run === "killed") return "Verification: run killed";
      if (proof === "failed") return "Verification: failed";
      return "Verification: failed";
    }
    case "timed_out":
      return "Verification: timed out";
    case "action_required": {
      if (proofChainHasWarnings) return "Verification: proof chain warning — action required";
      if (proof === "partial") return "Verification: partial — action required";
      if (proof === "missing") return "Verification: missing — action required";
      return "Verification: stale — action required";
    }
    case "neutral": {
      if (proof === "not-run") return "Verification: not run";
      return "Verification: neutral";
    }
    case "cancelled":
      return "Verification: cancelled";
    default:
      return "Verification";
  }
}

function refLine(label: string, ref: ArtifactRef | undefined): string | undefined {
  if (!ref) return undefined;
  return `- ${label}: \`${ref.type}:${ref.id}\``;
}

/**
 * Render the GitHub Check payload that would be POSTed to
 * the Checks API in a later slice. The payload always
 * includes the canonical-truth reminder and cites every
 * artifact ref it summarised.
 *
 * This function makes no API call. It does not read from
 * disk. It does not read environment variables. It is a
 * pure function of its inputs.
 */
export function buildGitHubCheckPayload(
  input: BuildGitHubCheckPayloadInput,
): GitHubCheckPayload {
  const proof = deriveProofStatus(input.verificationResult);
  const run = input.verificationRun?.status ?? (input.verificationRunRef ? "completed" : "not-started");
  const freshness = deriveFreshness(input);
  const proofChainWarnings = Array.isArray(input.proofChainWarnings)
    ? input.proofChainWarnings.filter((warning) => warning.trim().length > 0)
    : [];
  const proofChainHasWarnings = proofChainWarnings.length > 0;
  const conclusion = pickConclusion(proof, run, freshness, input.artifactsValid, proofChainHasWarnings);
  const title = describeConclusion(conclusion, proof, run, proofChainHasWarnings);

  const citedRefs: ArtifactRef[] = [];
  const summaryLines: string[] = [];

  summaryLines.push(`**${title}**`);
  summaryLines.push("");
  summaryLines.push(`Conclusion: \`${conclusion}\``);
  summaryLines.push(`Proof status: \`${proof}\``);
  summaryLines.push(`Run status: \`${run}\``);
  summaryLines.push(`Freshness: \`${freshness}\``);
  if (input.artifactsValid === true) {
    summaryLines.push("Artifacts valid: `true`");
  } else if (input.artifactsValid === false) {
    summaryLines.push("Artifacts valid: `false`");
  } else {
    summaryLines.push("Artifacts valid: `not asserted`");
  }
  if (proofChainWarnings.length > 0) {
    summaryLines.push("Proof-chain warnings:");
    for (const warning of proofChainWarnings) {
      summaryLines.push(`- ${warning}`);
    }
  }
  summaryLines.push("");

  // Path-freshness GitHub review surfacing (P1.1
  // path-freshness-github-review-surfacing). Rendered as a
  // compact trust-warning block; **conclusion is unchanged**
  // by working-tree freshness in this slice. See
  // docs/strategy/watcher-path-freshness-policy-decision.md.
  const pathFreshness = buildPathFreshnessGitHubSummary({
    report: input.pathFreshnessReport,
    reportRef: input.pathFreshnessRef,
  });
  summaryLines.push("Working tree path freshness:");
  for (const line of pathFreshness.lines) {
    summaryLines.push(`- ${line}`);
  }
  if (pathFreshness.warning.length > 0) {
    summaryLines.push("");
    summaryLines.push(`> ${pathFreshness.warning}`);
  }
  summaryLines.push("");

  summaryLines.push("Cited artifacts:");
  const tracked: Array<[string, ArtifactRef | undefined]> = [
    ["VerificationResult", input.verificationResultRef],
    ["VerificationRun", input.verificationRunRef],
    ["VerificationPlan", input.verificationPlanRef],
    ["Proof report", input.proofReportRef],
    ["Architecture summary", input.architectureSummaryRef],
    ["Agent contract", input.agentContractRef],
    ["PathFreshnessReport", pathFreshness.reportRef],
  ];
  let citedAny = false;
  for (const [label, ref] of tracked) {
    const line = refLine(label, ref);
    if (line) {
      summaryLines.push(line);
      citedRefs.push(ref as ArtifactRef);
      citedAny = true;
    }
  }
  if (!citedAny) {
    summaryLines.push("- (no canonical artifacts cited yet)");
  }
  summaryLines.push("");

  summaryLines.push(`> ${GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER}`);

  if (input.config.runUrl) {
    summaryLines.push("");
    summaryLines.push(`Workflow run: ${input.config.runUrl}`);
  }

  const name = input.config.name?.trim() || GITHUB_CHECK_PUBLISHER_DEFAULT_NAME;
  const headSha = input.config.headSha;
  const externalId = input.verificationResultRef
    ? `${input.verificationResultRef.type}:${input.verificationResultRef.id}`
    : input.verificationRunRef
      ? `${input.verificationRunRef.type}:${input.verificationRunRef.id}`
      : undefined;

  return {
    name,
    headSha,
    status: "completed",
    conclusion,
    output: {
      title,
      summary: summaryLines.join("\n"),
    },
    externalId,
    citedRefs,
  };
}

// ---------------------------------------------------------------
// GitHub Check publisher API client (step 6c) — guarded write.
//
// `publishGitHubCheckRun(input)` POSTs a Check Run to GitHub's
// `/repos/{owner}/{repo}/check-runs` endpoint using Node's
// built-in `fetch`. No third-party network client is added.
//
// The helper:
// - never echoes the token in error messages or results,
// - never logs the token,
// - maps the camelCase payload into GitHub's snake_case body,
// - returns a compact `{ id, url, htmlUrl, status, conclusion }`
//   result on success,
// - throws a `GitHubCheckPublishError` with `status`, `message`,
//   and `documentationUrl` on non-2xx responses.
//
// The send path is gated by `assessGitHubCheckPublisherReadiness`
// from the call-site (the CLI). This helper has no opinion on
// readiness — it just performs the POST when called.
// ---------------------------------------------------------------

export const GITHUB_CHECK_PUBLISHER_DEFAULT_API_BASE_URL = "https://api.github.com";
export const GITHUB_CHECK_PUBLISHER_DEFAULT_API_VERSION = "2022-11-28";
export const GITHUB_CHECK_PUBLISHER_USER_AGENT = "rekon-verification-runner";

export type GitHubCheckPublishInput = {
  /**
   * GitHub token used to authenticate. Must be non-empty.
   * Typically the `GITHUB_TOKEN` provided by Actions.
   */
  token: string;
  /**
   * `<owner>/<repo>` slug. Must be non-empty.
   */
  repository: string;
  /**
   * Payload built by `buildGitHubCheckPayload`.
   */
  payload: GitHubCheckPayload;
  /**
   * Overrides the default API base URL
   * (`https://api.github.com`). Tests use this to point at a
   * local node:http server. GHES adopters could also point at
   * their enterprise instance.
   */
  apiBaseUrl?: string;
  /**
   * Overrides the default user agent.
   */
  userAgent?: string;
};

export type GitHubCheckPublishResult = {
  id?: number;
  url?: string;
  htmlUrl?: string;
  status?: string;
  conclusion?: string;
};

/**
 * Thrown when GitHub responds with a non-2xx status.
 * Carries the response status, message, and (when present)
 * documentation URL. **Never** carries the token.
 */
export class GitHubCheckPublishError extends Error {
  readonly status: number;
  readonly documentationUrl?: string;

  constructor(input: { status: number; message: string; documentationUrl?: string }) {
    super(input.message);
    this.name = "GitHubCheckPublishError";
    this.status = input.status;
    this.documentationUrl = input.documentationUrl;
  }
}

function ensureNonEmptyString(value: string, fieldLabel: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new GitHubCheckPublishError({
      status: 0,
      message: `publishGitHubCheckRun requires a non-empty ${fieldLabel}.`,
    });
  }
  return trimmed;
}

function mapPayloadToGitHubRequestBody(payload: GitHubCheckPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: payload.name,
    status: payload.status,
    conclusion: payload.conclusion,
    output: {
      title: payload.output.title,
      summary: payload.output.summary,
    },
  };
  if (payload.headSha) body.head_sha = payload.headSha;
  if (payload.externalId) body.external_id = payload.externalId;
  if (payload.output.text) {
    (body.output as Record<string, unknown>).text = payload.output.text;
  }
  return body;
}

/**
 * Trust-boundary hardening (step 9, fix #5). Read a Response
 * body **as a bounded stream**, aborting as soon as the byte
 * cap is reached. This prevents a misbehaving upstream (or a
 * very large GitHub error body) from being fully buffered
 * into memory before truncation.
 *
 * `response.text()` would otherwise read the entire body into
 * a string first. The fetch reader is cancelled after the cap
 * so the underlying connection releases promptly.
 *
 * Never includes the request token in the result; the bound
 * also stops a misbehaving proxy from echoing it back without
 * us noticing.
 */
const GITHUB_ERROR_BODY_BYTE_CAP = 64 * 1024;

async function readBoundedResponseBody(response: Response): Promise<string> {
  // If the body has been disposed (no reader, e.g. HEAD), fall
  // back to text() — there's nothing to stream.
  if (!response.body) {
    try {
      const text = await response.text();
      return text.length > GITHUB_ERROR_BODY_BYTE_CAP
        ? `${text.slice(0, GITHUB_ERROR_BODY_BYTE_CAP)}… [truncated]`
        : text;
    } catch {
      return "";
    }
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const reader = response.body.getReader();
  let collected = "";
  let collectedBytes = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const remaining = GITHUB_ERROR_BODY_BYTE_CAP - collectedBytes;
      if (remaining <= 0) {
        truncated = true;
        break;
      }
      const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      collected += decoder.decode(slice, { stream: true });
      collectedBytes += slice.byteLength;
      if (value.byteLength > remaining) {
        truncated = true;
        break;
      }
    }
    // Flush any remaining bytes in the decoder.
    collected += decoder.decode();
  } catch {
    // Body read errored; keep whatever we collected.
  } finally {
    try {
      await reader.cancel();
    } catch {
      // already closed
    }
  }

  return truncated ? `${collected}… [truncated]` : collected;
}

async function readResponseBodySafely(response: Response): Promise<string> {
  // Backwards-compatible alias that now uses the bounded
  // streaming reader. The 2xx-success path (`response.json()`)
  // is unchanged; only the error-handling branch uses this.
  return readBoundedResponseBody(response);
}

function pickStringField(value: unknown, ...keys: string[]): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return undefined;
}

function pickNumberField(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" ? candidate : undefined;
}

/**
 * POST a GitHub Check Run from a Rekon payload. The caller is
 * responsible for gating this via
 * `assessGitHubCheckPublisherReadiness`. This helper never echoes
 * the token in errors, returns no Rekon-artifact mutation, and
 * uses Node's built-in `fetch` (no third-party client).
 */
export async function publishGitHubCheckRun(
  input: GitHubCheckPublishInput,
): Promise<GitHubCheckPublishResult> {
  const token = ensureNonEmptyString(input.token, "token");
  const repository = ensureNonEmptyString(input.repository, "repository");
  const apiBaseUrl = (input.apiBaseUrl ?? GITHUB_CHECK_PUBLISHER_DEFAULT_API_BASE_URL).replace(/\/+$/, "");
  const userAgent = input.userAgent ?? GITHUB_CHECK_PUBLISHER_USER_AGENT;

  if (!/^[^/]+\/[^/]+$/.test(repository)) {
    throw new GitHubCheckPublishError({
      status: 0,
      message: `publishGitHubCheckRun: repository must be \`owner/repo\` (received ${JSON.stringify(repository)}).`,
    });
  }

  const url = `${apiBaseUrl}/repos/${repository}/check-runs`;
  const body = mapPayloadToGitHubRequestBody(input.payload);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "Connection": "close",
        "Content-Type": "application/json",
        "User-Agent": userAgent,
        "X-GitHub-Api-Version": GITHUB_CHECK_PUBLISHER_DEFAULT_API_VERSION,
      },
      body: JSON.stringify(body),
      // Hint Node's undici-based fetch to keep the connection
      // single-use so CLI invocations exit promptly instead of
      // waiting for the keep-alive pool to time out.
      keepalive: false,
    });
  } catch (cause) {
    throw new GitHubCheckPublishError({
      status: 0,
      message: `publishGitHubCheckRun: network error contacting GitHub Checks API: ${(cause as Error).message ?? cause}`,
    });
  }

  if (!response.ok) {
    let parsed: unknown;
    let raw = "";
    try {
      raw = await readResponseBodySafely(response);
      parsed = raw ? JSON.parse(raw) : undefined;
    } catch {
      parsed = undefined;
    }
    const message = pickStringField(parsed, "message")
      ?? `GitHub Checks API responded with ${response.status} ${response.statusText || ""}`.trim();
    const documentationUrl = pickStringField(parsed, "documentation_url", "documentationUrl");
    throw new GitHubCheckPublishError({
      status: response.status,
      message,
      documentationUrl,
    });
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    throw new GitHubCheckPublishError({
      status: response.status,
      message: `publishGitHubCheckRun: GitHub Checks API returned a 2xx response with an unparseable body: ${(cause as Error).message ?? cause}`,
    });
  }

  return {
    id: pickNumberField(json, "id"),
    url: pickStringField(json, "url"),
    htmlUrl: pickStringField(json, "html_url", "htmlUrl"),
    status: pickStringField(json, "status"),
    conclusion: pickStringField(json, "conclusion"),
  };
}

// ---------------------------------------------------------------
// PR comment publisher (step 7b) — dry-run renderer.
//
// `buildPrCommentBody(input)` builds the markdown body Rekon
// would post (in a future slice) as a Rekon-owned PR timeline
// comment. The body always carries:
//
//   1. the idempotency marker `<!-- rekon:pr-comment:v1 -->`
//      at the top, so a future update-in-place publisher can
//      find this comment without re-parsing the body;
//   2. the canonical-truth reminder
//      `GitHub comments are not canonical truth; Rekon
//      artifacts remain canonical.`;
//   3. citations for every canonical artifact ref the caller
//      passed in (VerificationResult, VerificationRun,
//      VerificationPlan, proof report / architecture summary
//      / agent contract Publications).
//
// `assessPrCommentPublisherReadiness(input)` returns
// `{ ready, issues[] }` after evaluating opt-in env, the
// PR-number gate, repository slug, token presence,
// event-trust classification, and write-permission
// confirmation. The dry-run CLI does NOT use the readiness's
// `ready: true` outcome to gate body rendering — the body
// should always render — but it surfaces the readiness
// issue list so operators can see exactly which gates
// remain.
//
// Both helpers are pure. They make no I/O, no network calls,
// no env reads (the readiness helper receives an explicit
// env map from the caller, same shape as the GitHub Check
// readiness helper).
//
// The actual PR comment API write is a future slice gated by
// its own decision memo
// (docs/strategy/pr-comment-publisher-decision.md describes
// the staged path: dry-run renderer → validator / docs →
// API write).
// ---------------------------------------------------------------

export const PR_COMMENT_PUBLISHER_MARKER = "<!-- rekon:pr-comment:v1 -->";
export const PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER =
  "GitHub comments are not canonical truth; Rekon artifacts remain canonical.";

export type PrCommentFreshness = "fresh" | "stale" | "missing-plan" | "unknown";

export type PrCommentBodyInput = {
  verificationResult?: VerificationResultLike;
  verificationResultRef?: ArtifactRef;
  verificationRunRef?: ArtifactRef;
  verificationPlanRef?: ArtifactRef;
  proofReportRef?: ArtifactRef;
  architectureSummaryRef?: ArtifactRef;
  agentContractRef?: ArtifactRef;
  artifactsValid?: boolean;
  proofFreshness?: PrCommentFreshness;
  /**
   * Optional name of the workflow upload that operators can
   * click through to from the comment. Defaults to
   * `rekon-artifacts` if undefined and a workflow URL is
   * supplied.
   */
  uploadedArtifactName?: string;
  /**
   * Optional URL of the workflow run that produced this
   * comment. When supplied, the body renders a "Workflow
   * run" link so reviewers can navigate to the canonical
   * artifact upload.
   */
  workflowRunUrl?: string;
  /**
   * Optional latest `PathFreshnessReport`. **Surfaced as a
   * trust warning only; never changes PR-comment readiness
   * gates** in this slice. See
   * `docs/strategy/watcher-path-freshness-policy-decision.md`
   * + `docs/strategy/post-beta-dogfood-evidence-triage.md`.
   */
  pathFreshnessReport?: PathFreshnessReport;
  /**
   * Optional ref for the report cited above. When the
   * report is supplied but the ref is omitted, the helper
   * derives a ref from `pathFreshnessReport.header` when
   * possible.
   */
  pathFreshnessRef?: ArtifactRef;
};

export type PrCommentBodySummary = {
  verificationStatus: string;
  proofFreshness: string;
  artifactsValid?: boolean;
  hasWarnings: boolean;
};

export type PrCommentBody = {
  marker: typeof PR_COMMENT_PUBLISHER_MARKER;
  markdown: string;
  citedRefs: ArtifactRef[];
  summary: PrCommentBodySummary;
};

function formatPrCommentRef(ref: ArtifactRef | undefined): string {
  if (!ref) return "—";
  return `\`${ref.type}:${ref.id}\``;
}

function derivePrCommentStatus(
  result: VerificationResultLike | undefined,
): string {
  if (!result) return "missing";
  const status = result.status;
  return status === "passed" || status === "failed" || status === "partial" || status === "not-run"
    ? status
    : "missing";
}

function derivePrCommentFreshness(
  input: PrCommentBodyInput,
): PrCommentFreshness {
  if (input.proofFreshness) return input.proofFreshness;
  if (!input.verificationPlanRef) return "missing-plan";
  if (!input.verificationResult) return "stale";

  const surface = summarizeVerificationProofSurface({
    verificationResult: input.verificationResult as unknown as Parameters<
      typeof summarizeVerificationProofSurface
    >[0]["verificationResult"],
    verificationResultRef: input.verificationResultRef,
    latestVerificationPlanRef: input.verificationPlanRef,
  });
  if (surface.freshness === "fresh") return "fresh";
  if (surface.freshness === "stale") return "stale";
  if (surface.freshness === "missing-plan") return "missing-plan";
  return "unknown";
}

function derivePrCommentSource(
  result: VerificationResultLike | undefined,
  runRef: ArtifactRef | undefined,
): "manual" | "runner-derived" | "unknown" {
  if (!result) return "unknown";
  if (runRef) return "runner-derived";
  // No run ref but a result body — most likely a hand-recorded
  // result. Report as `manual` rather than synthesising a guess.
  return "manual";
}

function buildPrCommentSummaryTable(
  rows: Array<[string, string]>,
): string {
  const header = "| Field | Value |\n| --- | --- |";
  const body = rows.map(([field, value]) => `| ${field} | ${value} |`).join("\n");
  return `${header}\n${body}`;
}

/**
 * Build the markdown body Rekon would post as a Rekon-owned
 * PR timeline comment. **Pure function.** No I/O, no
 * network, no env reads. The actual PR comment API write
 * happens in a future slice with its own decision memo + gate.
 */
export function buildPrCommentBody(input: PrCommentBodyInput): PrCommentBody {
  const status = derivePrCommentStatus(input.verificationResult);
  const freshness = derivePrCommentFreshness(input);
  const source = derivePrCommentSource(input.verificationResult, input.verificationRunRef);
  const artifactsValid = input.artifactsValid;
  const warnings: string[] = [];

  if (status === "failed") {
    warnings.push(
      "VerificationResult status is `failed`. Inspect the cited VerificationRun for command-level detail.",
    );
  } else if (status === "partial") {
    warnings.push(
      "VerificationResult status is `partial`. Some commands were skipped or not-run; rerun verification to fill the gaps.",
    );
  } else if (status === "not-run") {
    warnings.push(
      "VerificationResult status is `not-run`. The plan was previewed but never executed.",
    );
  } else if (status === "missing") {
    warnings.push(
      "No VerificationResult was found. Run `rekon verify run --execute` then `rekon verify result from-run`.",
    );
  }

  if (freshness === "stale") {
    warnings.push(
      "Proof is **stale**: the VerificationResult cites an older VerificationPlan than the current latest.",
    );
  } else if (freshness === "missing-plan") {
    warnings.push(
      "Proof is **missing a plan**: no VerificationPlan exists yet. Run `rekon intent work-order` then `rekon verify run --execute`.",
    );
  }

  if (artifactsValid === false) {
    warnings.push(
      "`rekon artifacts validate` reported issues with the local artifact index. Reviewers should treat the proof state as suspect until the index is repaired.",
    );
  }

  // Path-freshness GitHub review surfacing (P1.1
  // path-freshness-github-review-surfacing). Reuses the
  // shared helper so the Check payload and the PR comment
  // body render the same status / message / refresh
  // recommendation. **Working-tree freshness is a trust
  // warning; it does not change PR-comment readiness
  // gates.**
  const pathFreshness = buildPathFreshnessGitHubSummary({
    report: input.pathFreshnessReport,
    reportRef: input.pathFreshnessRef,
  });
  if (pathFreshness.warning.length > 0) {
    warnings.push(pathFreshness.warning);
  }

  const tableRows: Array<[string, string]> = [
    ["VerificationResult", formatPrCommentRef(input.verificationResultRef)],
    ["Status", `\`${status}\``],
    ["Source", `\`${source}\``],
    ["Freshness", `\`${freshness}\``],
    ["Working-tree freshness", `\`${pathFreshness.status}\``],
    ["PathFreshnessReport", formatPrCommentRef(pathFreshness.reportRef)],
    ["VerificationPlan", formatPrCommentRef(input.verificationPlanRef)],
    ["VerificationRun", formatPrCommentRef(input.verificationRunRef)],
    ["Proof report", formatPrCommentRef(input.proofReportRef)],
    ["Architecture summary", formatPrCommentRef(input.architectureSummaryRef)],
    ["Agent contract", formatPrCommentRef(input.agentContractRef)],
    [
      "Artifacts valid",
      artifactsValid === true
        ? "`true`"
        : artifactsValid === false
          ? "`false`"
          : "`not asserted`",
    ],
  ];

  const citedRefs: ArtifactRef[] = [];
  for (const candidate of [
    input.verificationResultRef,
    input.verificationRunRef,
    input.verificationPlanRef,
    input.proofReportRef,
    input.architectureSummaryRef,
    input.agentContractRef,
    pathFreshness.reportRef,
  ]) {
    if (candidate) citedRefs.push(candidate);
  }

  const nextSteps: string[] = [];

  if (input.workflowRunUrl) {
    const name = (input.uploadedArtifactName ?? "rekon-artifacts").trim() || "rekon-artifacts";
    nextSteps.push(
      `- Inspect uploaded artifact \`${name}\` on the [workflow run](${input.workflowRunUrl}).`,
    );
  } else if (input.uploadedArtifactName) {
    const name = input.uploadedArtifactName.trim() || "rekon-artifacts";
    nextSteps.push(`- Inspect uploaded artifact \`${name}\`.`);
  } else {
    nextSteps.push(
      "- Inspect the uploaded `rekon-artifacts` workflow artifact for the canonical proof state.",
    );
  }

  if (status === "failed" || status === "partial") {
    nextSteps.push(
      "- Read the cited proof-report `Publication` for human-readable proof detail.",
    );
    nextSteps.push(
      "- Rerun verification (`rekon verify run --execute`) after fixes; the result is the canonical artefact, not this comment.",
    );
  } else if (status === "not-run" || status === "missing") {
    nextSteps.push(
      "- Run `rekon verify run --execute` to actually execute the plan, then `rekon verify result from-run` to derive a VerificationResult.",
    );
  } else if (freshness === "stale" || freshness === "missing-plan") {
    nextSteps.push(
      "- Refresh proof state (`rekon refresh`, then rerun the verify chain) so the cited refs match the latest VerificationPlan.",
    );
  } else {
    nextSteps.push(
      "- Open the cited proof-report `Publication` for the human-readable proof summary.",
    );
  }

  const lines: string[] = [];
  lines.push(PR_COMMENT_PUBLISHER_MARKER);
  lines.push("");
  lines.push("## Rekon Verification Summary");
  lines.push("");
  lines.push(buildPrCommentSummaryTable(tableRows));
  lines.push("");
  lines.push(`> ${PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER}`);
  if (warnings.length > 0) {
    lines.push("");
    lines.push("### Warnings");
    lines.push("");
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }
  lines.push("");
  lines.push("### Next steps");
  lines.push("");
  for (const step of nextSteps) {
    lines.push(step);
  }

  return {
    marker: PR_COMMENT_PUBLISHER_MARKER,
    markdown: lines.join("\n"),
    citedRefs,
    summary: {
      verificationStatus: status,
      proofFreshness: freshness,
      artifactsValid,
      hasWarnings: warnings.length > 0,
    },
  };
}

// --- Readiness helper ------------------------------------------

export type PrCommentPublisherReadinessIssueCode =
  | "not-enabled"
  | "missing-repository"
  | "missing-pr-number"
  | "missing-token"
  | "untrusted-event"
  | "write-permission-not-confirmed";

export type PrCommentPublisherReadinessIssue = {
  code: PrCommentPublisherReadinessIssueCode;
  message: string;
};

export type PrCommentPublisherReadiness = {
  ready: boolean;
  issues: PrCommentPublisherReadinessIssue[];
};

export type PrCommentEventTrust =
  | "trusted"
  | "untrusted-fork"
  | "unconditional-deny";

export type PrCommentPublisherReadinessEvent = {
  name: string;
  pullRequestIsFork?: boolean;
};

export type PrCommentPublisherReadinessInput = {
  env: Record<string, string | undefined>;
  event: PrCommentPublisherReadinessEvent;
  writePermissionConfirmed?: boolean;
};

function classifyPrCommentEventTrust(
  event: PrCommentPublisherReadinessEvent,
): PrCommentEventTrust {
  if (event.name === "pull_request_target") return "unconditional-deny";
  if (event.name === "pull_request") {
    return event.pullRequestIsFork ? "untrusted-fork" : "trusted";
  }
  // PR comments are only meaningful when a PR is correlated to
  // the workflow. Non-PR events that nonetheless carry a
  // GITHUB_PR_NUMBER are treated as trusted (operators may
  // dispatch the workflow manually against an open PR); the
  // missing-pr-number issue handles the no-PR case.
  if (event.name === "workflow_dispatch") return "trusted";
  if (event.name === "push") return "trusted";
  return "untrusted-fork";
}

function readPrCommentEnvFlag(
  env: Record<string, string | undefined>,
  key: string,
): boolean {
  const raw = env[key];
  if (raw === undefined || raw === null) return false;
  const normalized = String(raw).trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

/**
 * Assess whether the PR comment publisher would be ready to
 * call GitHub in a future `--send` mode. **The dry-run
 * renderer never calls GitHub regardless of this result;** the
 * readiness report exists so operators can see exactly which
 * gates remain before any future post path becomes safe.
 *
 * Readiness rules:
 * - `REKON_PR_COMMENTS` must be `"1"` / `"true"`.
 * - `GITHUB_REPOSITORY` must be present and non-empty.
 * - A PR number must be present
 *   (`GITHUB_PR_NUMBER`, or `PR_NUMBER` as a fallback).
 * - `GITHUB_TOKEN` must be present and non-empty.
 *   (The dry-run CLI does not actually read the token; this
 *   gate is for the future send slice.)
 * - The event must be trusted. `untrusted-fork` requires an
 *   explicit fork-override (not exposed in this slice);
 *   `unconditional-deny` (`pull_request_target`) refuses
 *   regardless.
 * - The caller must confirm
 *   `writePermissionConfirmed: true`. The future workflow
 *   template will set this via env / CLI flag; the dry-run
 *   path itself never asks GitHub for anything.
 */
export function assessPrCommentPublisherReadiness(
  input: PrCommentPublisherReadinessInput,
): PrCommentPublisherReadiness {
  const issues: PrCommentPublisherReadinessIssue[] = [];

  if (!readPrCommentEnvFlag(input.env, "REKON_PR_COMMENTS")) {
    issues.push({
      code: "not-enabled",
      message:
        "REKON_PR_COMMENTS is not set to 1 / true. The PR comment publisher is disabled by default.",
    });
  }

  const repository = input.env.GITHUB_REPOSITORY;
  if (!repository || String(repository).trim() === "") {
    issues.push({
      code: "missing-repository",
      message:
        "GITHUB_REPOSITORY is missing. The publisher needs the <owner>/<repo> slug to address the PR comment API.",
    });
  }

  const prNumber = input.env.GITHUB_PR_NUMBER ?? input.env.PR_NUMBER;
  if (!prNumber || String(prNumber).trim() === "") {
    issues.push({
      code: "missing-pr-number",
      message:
        "PR number is missing. Set GITHUB_PR_NUMBER (or PR_NUMBER) to the PR the comment should attach to.",
    });
  }

  const token = input.env.GITHUB_TOKEN;
  if (!token || String(token).trim() === "") {
    issues.push({
      code: "missing-token",
      message:
        "GITHUB_TOKEN is missing. The future send mode cannot authenticate without an Actions-provided token.",
    });
  }

  const trust = classifyPrCommentEventTrust(input.event);
  if (trust === "unconditional-deny") {
    issues.push({
      code: "untrusted-event",
      message:
        "pull_request_target is refused unconditionally. The publisher must not post comments from a workflow run that may execute fork-PR code in the upstream's context.",
    });
  } else if (trust === "untrusted-fork") {
    issues.push({
      code: "untrusted-event",
      message:
        "Forked pull requests are not trusted by default. The PR comment publisher refuses fork events; GitHub also denies write tokens to forked-PR workflows by default.",
    });
  }

  if (input.writePermissionConfirmed !== true) {
    issues.push({
      code: "write-permission-not-confirmed",
      message:
        "Caller did not confirm pull-requests: write (or issues: write) was granted. The publisher refuses to consider itself ready without explicit confirmation.",
    });
  }

  return { ready: issues.length === 0, issues };
}

// ---------------------------------------------------------------
// PR comment publisher (step 7f) — API writer.
//
// `publishPrCommentRun(input)` lists, updates, or creates a
// single Rekon-owned PR timeline comment using GitHub's
// issue-comments API. PR timeline comments are issue comments
// under the hood; the writer uses:
//
//   GET   /repos/{owner}/{repo}/issues/{n}/comments?per_page=100&page=N
//   POST  /repos/{owner}/{repo}/issues/{n}/comments
//   PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}
//
// The writer walks pages until it finds the first comment whose
// body contains the idempotency marker
// (`<!-- rekon:pr-comment:v1 -->`); if found it PATCHes that
// comment, otherwise it POSTs a new one. Pagination is bounded
// at 20 pages so a misbehaving instance cannot stall the CLI.
//
// The helper:
// - never echoes the token in error messages or results,
// - never logs the token,
// - uses Node's built-in `fetch` (no third-party network client),
// - reads bounded response bodies (≤ 64 KiB) so an unbounded
//   GitHub error doesn't fill the operator's terminal,
// - throws a `PrCommentPublishError` with `status`, `message`,
//   and `documentationUrl` on non-2xx responses.
//
// The send path is gated by
// `assessPrCommentPublisherReadiness` from the call-site (the
// CLI). This helper has no opinion on readiness — it just
// performs the API calls when called.
// ---------------------------------------------------------------

export const PR_COMMENT_PUBLISHER_DEFAULT_API_BASE_URL = "https://api.github.com";
export const PR_COMMENT_PUBLISHER_DEFAULT_API_VERSION = "2022-11-28";
export const PR_COMMENT_PUBLISHER_USER_AGENT = "rekon-verification-runner";
export const PR_COMMENT_PUBLISHER_MAX_PAGES = 20;
export const PR_COMMENT_PUBLISHER_PAGE_SIZE = 100;

export type PrCommentPublishInput = {
  /**
   * GitHub token used to authenticate. Must be non-empty.
   * Typically the `GITHUB_TOKEN` provided by Actions.
   */
  token: string;
  /**
   * `<owner>/<repo>` slug. Must be non-empty.
   */
  repository: string;
  /**
   * PR number (GitHub treats PR timeline comments as issue
   * comments, so the URL uses `issue_number`). Must be a
   * positive integer.
   */
  issueNumber: number;
  /**
   * Rendered comment body (from `buildPrCommentBody`). Must
   * contain the marker; the helper does not inject the marker
   * if it's missing.
   */
  body: string;
  /**
   * Idempotency marker the helper searches for. Defaults to
   * `PR_COMMENT_PUBLISHER_MARKER`.
   */
  marker?: string;
  /**
   * Overrides the default API base URL
   * (`https://api.github.com`). Tests use this to point at a
   * local node:http server. GHES adopters could also point at
   * their enterprise instance.
   */
  apiBaseUrl?: string;
  /**
   * Overrides the default user agent.
   */
  userAgent?: string;
};

export type PrCommentPublishResult = {
  action: "created" | "updated";
  id?: number;
  url?: string;
  htmlUrl?: string;
  issueUrl?: string;
  pagesScanned: number;
};

/**
 * Thrown when GitHub responds with a non-2xx status, or when
 * pagination exceeds the bounded page limit. Carries the
 * response status, message, and (when present) documentation
 * URL. **Never** carries the token.
 */
export class PrCommentPublishError extends Error {
  readonly status: number;
  readonly documentationUrl?: string;

  constructor(input: { status: number; message: string; documentationUrl?: string }) {
    super(input.message);
    this.name = "PrCommentPublishError";
    this.status = input.status;
    this.documentationUrl = input.documentationUrl;
  }
}

function ensurePrCommentNonEmptyString(value: string, fieldLabel: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new PrCommentPublishError({
      status: 0,
      message: `publishPrCommentRun requires a non-empty ${fieldLabel}.`,
    });
  }
  return trimmed;
}

function ensurePrCommentPositiveInteger(value: number, fieldLabel: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new PrCommentPublishError({
      status: 0,
      message: `publishPrCommentRun requires ${fieldLabel} to be a positive integer (received ${JSON.stringify(value)}).`,
    });
  }
  return value;
}

async function readPrCommentResponseBodySafely(response: Response): Promise<string> {
  // Trust-boundary hardening (step 9, fix #5). Mirror the
  // GitHub Check helper's bounded streaming reader: read at
  // most `GITHUB_ERROR_BODY_BYTE_CAP` bytes and cancel the
  // underlying response stream so the connection releases
  // promptly. The 2xx-success path (`response.json()`) is
  // unchanged.
  return readBoundedResponseBody(response);
}

function pickPrCommentStringField(value: unknown, ...keys: string[]): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return undefined;
}

function pickPrCommentNumberField(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" ? candidate : undefined;
}

function buildPrCommentHeaders(token: string, userAgent: string): Record<string, string> {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "Connection": "close",
    "Content-Type": "application/json",
    "User-Agent": userAgent,
    "X-GitHub-Api-Version": PR_COMMENT_PUBLISHER_DEFAULT_API_VERSION,
  };
}

async function callPrCommentApi(
  url: string,
  init: {
    method: "GET" | "POST" | "PATCH";
    token: string;
    userAgent: string;
    body?: unknown;
  },
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method,
      headers: buildPrCommentHeaders(init.token, init.userAgent),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      // Hint Node's undici-based fetch to keep the connection
      // single-use so CLI invocations exit promptly instead of
      // waiting for the keep-alive pool to time out.
      keepalive: false,
    });
  } catch (cause) {
    throw new PrCommentPublishError({
      status: 0,
      message: `publishPrCommentRun: network error contacting GitHub PR comments API: ${(cause as Error).message ?? cause}`,
    });
  }
  return response;
}

async function throwPrCommentApiError(response: Response, contextLabel: string): Promise<never> {
  let parsed: unknown;
  try {
    const raw = await readPrCommentResponseBodySafely(response);
    parsed = raw ? JSON.parse(raw) : undefined;
  } catch {
    parsed = undefined;
  }
  const message = pickPrCommentStringField(parsed, "message")
    ?? `${contextLabel}: GitHub PR comments API responded with ${response.status} ${response.statusText || ""}`.trim();
  const documentationUrl = pickPrCommentStringField(parsed, "documentation_url", "documentationUrl");
  throw new PrCommentPublishError({
    status: response.status,
    message,
    documentationUrl,
  });
}

/**
 * Post or update a Rekon-owned PR timeline comment. The caller
 * is responsible for gating this via
 * `assessPrCommentPublisherReadiness`. This helper never echoes
 * the token in errors, returns no Rekon-artifact mutation, and
 * uses Node's built-in `fetch` (no third-party client).
 *
 * Idempotency: lists existing issue comments paginated, finds
 * the first comment whose body contains the marker, and
 * PATCHes it. If no marker match is found, POSTs a new comment.
 *
 * Pagination is bounded to `PR_COMMENT_PUBLISHER_MAX_PAGES`
 * (20 pages × 100 per page = 2000 comments inspected).
 */
export async function publishPrCommentRun(
  input: PrCommentPublishInput,
): Promise<PrCommentPublishResult> {
  const token = ensurePrCommentNonEmptyString(input.token, "token");
  const repository = ensurePrCommentNonEmptyString(input.repository, "repository");
  const body = ensurePrCommentNonEmptyString(input.body, "body");
  const issueNumber = ensurePrCommentPositiveInteger(input.issueNumber, "issueNumber");
  const marker = (input.marker ?? PR_COMMENT_PUBLISHER_MARKER).trim();
  if (!marker) {
    throw new PrCommentPublishError({
      status: 0,
      message: "publishPrCommentRun requires a non-empty marker.",
    });
  }
  const apiBaseUrl = (input.apiBaseUrl ?? PR_COMMENT_PUBLISHER_DEFAULT_API_BASE_URL).replace(/\/+$/, "");
  const userAgent = input.userAgent ?? PR_COMMENT_PUBLISHER_USER_AGENT;

  if (!/^[^/]+\/[^/]+$/.test(repository)) {
    throw new PrCommentPublishError({
      status: 0,
      message: `publishPrCommentRun: repository must be \`owner/repo\` (received ${JSON.stringify(repository)}).`,
    });
  }

  // ---- Walk pages and look for the marker -------------------
  let pagesScanned = 0;
  let existingCommentId: number | undefined;

  for (let page = 1; page <= PR_COMMENT_PUBLISHER_MAX_PAGES; page += 1) {
    pagesScanned = page;
    const listUrl =
      `${apiBaseUrl}/repos/${repository}/issues/${issueNumber}/comments`
      + `?per_page=${PR_COMMENT_PUBLISHER_PAGE_SIZE}&page=${page}`;
    const response = await callPrCommentApi(listUrl, {
      method: "GET",
      token,
      userAgent,
    });

    if (!response.ok) {
      await throwPrCommentApiError(response, "publishPrCommentRun: list comments");
    }

    let parsed: unknown;
    try {
      const raw = await readPrCommentResponseBodySafely(response);
      parsed = raw ? JSON.parse(raw) : [];
    } catch (cause) {
      throw new PrCommentPublishError({
        status: response.status,
        message: `publishPrCommentRun: GitHub PR comments list returned a 2xx response with an unparseable body: ${(cause as Error).message ?? cause}`,
      });
    }

    if (!Array.isArray(parsed)) {
      throw new PrCommentPublishError({
        status: response.status,
        message: `publishPrCommentRun: GitHub PR comments list returned a non-array body (received ${typeof parsed}).`,
      });
    }

    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const candidateBody = typeof record.body === "string" ? record.body : "";
      const candidateId = typeof record.id === "number" ? record.id : undefined;
      if (candidateId !== undefined && candidateBody.includes(marker)) {
        existingCommentId = candidateId;
        break;
      }
    }

    if (existingCommentId !== undefined) break;
    if (parsed.length < PR_COMMENT_PUBLISHER_PAGE_SIZE) {
      // No more pages — GitHub returns fewer than per_page on
      // the final page.
      break;
    }
  }

  if (existingCommentId === undefined && pagesScanned >= PR_COMMENT_PUBLISHER_MAX_PAGES) {
    // We hit the page cap without finding a marker. This is
    // exceedingly rare (would require >2000 comments on the
    // PR); treat as an error so operators are alerted rather
    // than silently re-POSTing a duplicate Rekon comment.
    throw new PrCommentPublishError({
      status: 0,
      message: `publishPrCommentRun: exhausted ${PR_COMMENT_PUBLISHER_MAX_PAGES} pages of issue comments without finding the marker. Refusing to POST a new comment to avoid duplicates.`,
    });
  }

  // ---- POST or PATCH ----------------------------------------
  if (existingCommentId === undefined) {
    const postUrl = `${apiBaseUrl}/repos/${repository}/issues/${issueNumber}/comments`;
    const response = await callPrCommentApi(postUrl, {
      method: "POST",
      token,
      userAgent,
      body: { body },
    });

    if (!response.ok) {
      await throwPrCommentApiError(response, "publishPrCommentRun: create comment");
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (cause) {
      throw new PrCommentPublishError({
        status: response.status,
        message: `publishPrCommentRun: GitHub PR comments create returned a 2xx response with an unparseable body: ${(cause as Error).message ?? cause}`,
      });
    }

    return {
      action: "created",
      id: pickPrCommentNumberField(json, "id"),
      url: pickPrCommentStringField(json, "url"),
      htmlUrl: pickPrCommentStringField(json, "html_url", "htmlUrl"),
      issueUrl: pickPrCommentStringField(json, "issue_url", "issueUrl"),
      pagesScanned,
    };
  }

  const patchUrl = `${apiBaseUrl}/repos/${repository}/issues/comments/${existingCommentId}`;
  const response = await callPrCommentApi(patchUrl, {
    method: "PATCH",
    token,
    userAgent,
    body: { body },
  });

  if (!response.ok) {
    await throwPrCommentApiError(response, "publishPrCommentRun: update comment");
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    throw new PrCommentPublishError({
      status: response.status,
      message: `publishPrCommentRun: GitHub PR comments update returned a 2xx response with an unparseable body: ${(cause as Error).message ?? cause}`,
    });
  }

  return {
    action: "updated",
    id: pickPrCommentNumberField(json, "id") ?? existingCommentId,
    url: pickPrCommentStringField(json, "url"),
    htmlUrl: pickPrCommentStringField(json, "html_url", "htmlUrl"),
    issueUrl: pickPrCommentStringField(json, "issue_url", "issueUrl"),
    pagesScanned,
  };
}

// ---------- Path-freshness publication surfacing (P1.1 path-freshness-publication-surfacing) ----------
//
// Pure helper used by the architecture summary,
// agent contract, and proof report publishers to
// render the latest `PathFreshnessReport` consistently
// in their respective markdown bodies.
//
// Safety contract:
// - **Read-only.** The helper never spawns a process,
//   never re-runs `rekon paths freshness`, never
//   re-runs `rekon refresh`, never recomputes
//   fingerprints, never writes any artifact.
// - **Bounded changed-path table.** When the report
//   is `stale`, only the first
//   `PATH_FRESHNESS_PUBLICATION_TABLE_CAP` non-fresh
//   entries are rendered; remaining entries get a
//   summary line. This keeps publications small
//   regardless of repo size.
// - **Lineage vs working-tree distinction preserved.**
//   The section title + recommendation language never
//   conflate `PathFreshnessReport.status` with
//   artifact-lineage freshness.
// - The caller adds the optional `inputRef` to
//   `header.inputRefs` so publication freshness
//   downstream can flag the publication stale when a
//   newer report lands.

export const PATH_FRESHNESS_PUBLICATION_TABLE_CAP = 20;

export type BuildPathFreshnessPublicationSectionInput = {
  report: PathFreshnessReport | undefined;
  reportRef?: ArtifactRef;
  /** Heading level for the section title. */
  headingLevel: 2 | 3;
  /**
   * Top-level section uses "## Working Tree Path
   * Freshness"; the agent-contract uses "### Working
   * Tree Path Freshness" inside a wider operating
   * section. Both render the same body.
   */
};

export type BuildPathFreshnessPublicationSectionResult = {
  lines: string[];
  /**
   * If the report exists, returns the artifact ref so
   * the publisher can append it to inputRefs.
   */
  inputRef?: ArtifactRef;
};

export function buildPathFreshnessPublicationSection(
  input: BuildPathFreshnessPublicationSectionInput,
): BuildPathFreshnessPublicationSectionResult {
  const { report, reportRef, headingLevel } = input;
  const lines: string[] = [];
  const heading = headingLevel === 2 ? "##" : "###";

  lines.push(`${heading} Working Tree Path Freshness`);
  lines.push("");

  if (!report) {
    lines.push(
      "No `PathFreshnessReport` found. Run `rekon paths freshness --json` to establish a working-tree freshness baseline.",
    );
    lines.push("");
    lines.push(
      "Working-tree freshness is distinct from artifact lineage freshness; both surfaces matter and neither replaces the other.",
    );
    lines.push("");
    return { lines };
  }

  const status = report.status;
  const summary = report.summary;
  const refreshRecommended = report.recommendation?.refreshRecommended === true;
  const commands = Array.isArray(report.recommendation?.commands)
    ? report.recommendation.commands
    : [];
  const message =
    typeof report.recommendation?.message === "string"
      ? report.recommendation.message
      : "";

  lines.push(`- Status: ${status}`);
  if (reportRef) {
    lines.push(`- Report: ${formatRef(reportRef)}`);
  } else if (report.header?.artifactType && report.header?.artifactId) {
    lines.push(`- Report: ${report.header.artifactType}:${report.header.artifactId}`);
  }
  if (report.baselineRef) {
    lines.push(`- Baseline: ${formatRef(report.baselineRef)}`);
  } else if (status === "unknown") {
    lines.push("- Baseline: none yet (first run)");
  }
  lines.push(`- Refresh recommended: ${refreshRecommended ? "yes" : "no"}`);

  const total = typeof summary?.total === "number" ? summary.total : 0;
  const fresh = typeof summary?.fresh === "number" ? summary.fresh : 0;
  const changed = typeof summary?.changed === "number" ? summary.changed : 0;
  const missing = typeof summary?.missing === "number" ? summary.missing : 0;
  const created = typeof summary?.new === "number" ? summary.new : 0;
  const unknown = typeof summary?.unknown === "number" ? summary.unknown : 0;

  lines.push(
    `- Paths inspected: ${total} (fresh ${fresh}, changed ${changed}, missing ${missing}, new ${created}, unknown ${unknown})`,
  );

  if (refreshRecommended || message.length > 0) {
    lines.push(
      `- Recommendation: ${
        message.length > 0
          ? message
          : "Run `rekon refresh` before relying on generated artifacts."
      }`,
    );
  }
  if (commands.length > 0) {
    lines.push(`- Commands: ${commands.map((c) => `\`${c}\``).join(", ")}`);
  }
  lines.push("");

  lines.push(
    "**Working-tree freshness is distinct from artifact lineage freshness.** A `fresh` artifact chain does not imply that source paths match the latest recorded source-state baseline.",
  );
  lines.push("");

  // Bounded change-table only when there is at least
  // one non-fresh entry. Skipped when status === fresh
  // (everything matched) or when the report is unknown
  // (no baseline to compare).
  const entries = Array.isArray(report.entries) ? report.entries : [];
  const nonFresh = entries.filter((entry) => entry?.status !== "fresh");

  if (nonFresh.length > 0 && status !== "unknown") {
    lines.push("| Path | Status | Message |");
    lines.push("| --- | --- | --- |");
    const visible = nonFresh.slice(0, PATH_FRESHNESS_PUBLICATION_TABLE_CAP);
    for (const entry of visible) {
      const path = escapeCell(typeof entry.path === "string" ? entry.path : "—");
      const entryStatus = escapeCell(typeof entry.status === "string" ? entry.status : "unknown");
      const entryMessage = escapeCell(typeof entry.message === "string" ? entry.message : "");
      lines.push(`| ${path} | ${entryStatus} | ${entryMessage} |`);
    }
    if (nonFresh.length > visible.length) {
      lines.push(
        `_${nonFresh.length - visible.length} additional non-fresh path(s) omitted; see the source PathFreshnessReport for the full list._`,
      );
    }
    lines.push("");
  }

  if (status === "stale") {
    lines.push(
      "> Working-tree paths have drifted since the last `PathFreshnessReport`. Run `rekon refresh` before relying on existing artifacts.",
    );
    lines.push("");
  } else if (status === "unknown") {
    lines.push(
      "> No baseline yet — re-run `rekon paths freshness --json` after any source change to capture a comparison.",
    );
    lines.push("");
  }

  const result: BuildPathFreshnessPublicationSectionResult = { lines };
  if (reportRef) {
    result.inputRef = reportRef;
  } else if (report.header?.artifactType === "PathFreshnessReport"
    && typeof report.header?.artifactId === "string"
    && typeof report.header?.schemaVersion === "string") {
    result.inputRef = {
      type: report.header.artifactType,
      id: report.header.artifactId,
      schemaVersion: report.header.schemaVersion,
    };
  }
  return result;
}

// ---------- Capability ontology suggestion publication surfacing helper ----------
//
// Pure helper that renders the publication block for a
// `CapabilityOntologySuggestionReport`. **Read-only**: never
// runs the suggestions CLI, never mutates the ontology
// config, never mutates `CapabilityMap`, never writes a new
// report. When the publisher cannot find a report the
// renderer emits a no-report guidance block so operators
// know how to produce one.

export type BuildCapabilityOntologySuggestionPublicationSectionInput = {
  report?: CapabilityOntologySuggestionReportLike;
  reportRef?: ArtifactRef;
  /** 2 → architecture summary; 3 → agent contract */
  headingLevel?: 2 | 3;
  /** Cap the rendered suggestion / skipped tables; default 10. */
  tableLimit?: number;
};

export type BuildCapabilityOntologySuggestionPublicationSectionResult = {
  lines: string[];
  inputRef?: ArtifactRef;
};

const DEFAULT_ONTOLOGY_SUGGESTION_TABLE_LIMIT = 10;

export function buildCapabilityOntologySuggestionPublicationSection(
  input: BuildCapabilityOntologySuggestionPublicationSectionInput,
): BuildCapabilityOntologySuggestionPublicationSectionResult {
  const { report, reportRef } = input;
  const headingLevel = input.headingLevel ?? 2;
  const heading = headingLevel === 2 ? "##" : "###";
  const tableLimit = input.tableLimit ?? DEFAULT_ONTOLOGY_SUGGESTION_TABLE_LIMIT;
  const lines: string[] = [];

  lines.push(`${heading} Capability Ontology Suggestions`);
  lines.push("");

  if (!report) {
    lines.push(
      "No `CapabilityNormalizationReviewLedger`-derived `CapabilityOntologySuggestionReport` found. Run `rekon capability ontology suggestions --json` after reviewing unknown terms to preview ontology config changes.",
    );
    lines.push("");
    lines.push(
      "Ontology suggestions are preview-only. `.rekon/capability-ontology.json` is not mutated automatically. Operators must apply proposed changes manually.",
    );
    lines.push("");
    return { lines };
  }

  const summary = report.summary ?? {};
  const total = typeof summary.total === "number" ? summary.total : 0;
  const addCanonicalVerb =
    typeof summary.addCanonicalVerb === "number" ? summary.addCanonicalVerb : 0;
  const addCanonicalNoun =
    typeof summary.addCanonicalNoun === "number" ? summary.addCanonicalNoun : 0;
  const addVerbAlias = typeof summary.addVerbAlias === "number" ? summary.addVerbAlias : 0;
  const addNounAlias = typeof summary.addNounAlias === "number" ? summary.addNounAlias : 0;
  const skippedCount = typeof summary.skipped === "number" ? summary.skipped : 0;
  const configPath = report.preview?.configPath ?? ".rekon/capability-ontology.json";

  if (reportRef) {
    lines.push(`- Report: ${formatRef(reportRef)}`);
  } else if (
    report.header?.artifactType === "CapabilityOntologySuggestionReport"
    && typeof report.header?.artifactId === "string"
  ) {
    lines.push(
      `- Report: ${report.header.artifactType}:${report.header.artifactId}`,
    );
  }
  lines.push(`- Config path: \`${configPath}\``);
  lines.push(
    `- Suggestions: ${total}`
    + ` (add-canonical-verb ${addCanonicalVerb},`
    + ` add-canonical-noun ${addCanonicalNoun},`
    + ` add-verb-alias ${addVerbAlias},`
    + ` add-noun-alias ${addNounAlias})`,
  );
  if (skippedCount > 0) {
    lines.push(`- Skipped: ${skippedCount} (candidate-level decisions require manual ontology editing)`);
  }
  lines.push("");
  lines.push(
    "**Preview-only.** `.rekon/capability-ontology.json` remains unchanged. Operators must review the proposed config and apply it manually if desired.",
  );
  lines.push("");

  const suggestions = Array.isArray(report.suggestions) ? report.suggestions : [];
  if (suggestions.length > 0) {
    lines.push("| Kind | Term | Canonical | Reason |");
    lines.push("| --- | --- | --- | --- |");
    const bounded = suggestions.slice(0, tableLimit);
    for (const entry of bounded) {
      const kind = entry.kind ?? "-";
      const term = entry.term ?? "-";
      const canonical = entry.canonical ?? "—";
      const reason = (entry.reason ?? "").replace(/\|/g, "\\|").trim() || "—";
      lines.push(`| ${kind} | ${term} | ${canonical} | ${reason} |`);
    }
    if (suggestions.length > bounded.length) {
      lines.push(
        `| … | … | … | ${suggestions.length - bounded.length} additional suggestion(s) omitted; see the artifact for the full list. |`,
      );
    }
    lines.push("");
  }

  const skipped = Array.isArray(report.skipped) ? report.skipped : [];
  if (skipped.length > 0) {
    lines.push("**Skipped decisions (v1):**");
    lines.push("");
    const bounded = skipped.slice(0, tableLimit);
    for (const entry of bounded) {
      const termKind = entry.termKind ?? "-";
      const term = entry.term ?? "-";
      const reason = (entry.reason ?? "").trim() || "—";
      lines.push(`- ${termKind} \`${term}\` — ${reason}`);
    }
    if (skipped.length > bounded.length) {
      lines.push(
        `- … ${skipped.length - bounded.length} additional skipped entry(ies) omitted; see the artifact for the full list.`,
      );
    }
    lines.push("");
  }

  const result: BuildCapabilityOntologySuggestionPublicationSectionResult = { lines };
  if (reportRef) {
    result.inputRef = reportRef;
  } else if (
    report.header?.artifactType === "CapabilityOntologySuggestionReport"
    && typeof report.header?.artifactId === "string"
    && typeof report.header?.schemaVersion === "string"
  ) {
    result.inputRef = {
      type: report.header.artifactType,
      id: report.header.artifactId,
      schemaVersion: report.header.schemaVersion,
    };
  }
  return result;
}

// ---------- Path-freshness GitHub review summary helper (P1.1 path-freshness-github-review-surfacing) ----------
//
// Pure helper that produces the compact lines used by the
// GitHub Check payload's `output.summary` and the PR
// comment body to surface working-tree freshness state.
//
// Design contract pinned by
// `docs/strategy/watcher-path-freshness-policy-decision.md`
// + the work order for this slice:
//
// - **Stale path freshness is a trust warning. It does not
//   flip GitHub Check conclusion in this slice.**
// - **Read-only.** The helper never spawns processes, never
//   reads disk, never reads env vars, never opens sockets.
// - The helper interprets only `status`, `summary`,
//   `recommendation`, and the report's
//   `header.{artifactType,artifactId}` to derive the
//   compact lines + warning text.
// - When the report is `undefined`, lines describe the
//   no-baseline case and recommend `rekon paths freshness`.

export type BuildPathFreshnessGitHubSummaryInput = {
  report: PathFreshnessReport | undefined;
  reportRef?: ArtifactRef;
};

export type BuildPathFreshnessGitHubSummaryResult = {
  status: "fresh" | "stale" | "unknown";
  refreshRecommended: boolean;
  /**
   * Lines suitable for appending to a GitHub Check
   * `output.summary` (no leading heading; the caller adds
   * a heading or blank-line separator).
   */
  lines: string[];
  /**
   * Single warning paragraph rendered as a Markdown
   * blockquote (`> ...`) on stale or unknown reports. Empty
   * string when the report is `fresh`.
   */
  warning: string;
  /**
   * The report's artifact ref (when present + recognised)
   * so the caller can cite it in payload `citedRefs` /
   * comment `citedRefs` lists.
   */
  reportRef?: ArtifactRef;
};

export function buildPathFreshnessGitHubSummary(
  input: BuildPathFreshnessGitHubSummaryInput,
): BuildPathFreshnessGitHubSummaryResult {
  const { report } = input;
  const reportRef = pickPathFreshnessReportRef(input);

  if (!report) {
    return {
      status: "unknown",
      refreshRecommended: false,
      lines: [
        "Working-tree freshness: `unknown` — no PathFreshnessReport found.",
        "Run `rekon paths freshness --json` to establish a baseline.",
      ],
      warning:
        "Working-tree freshness is unknown. Run `rekon paths freshness` to establish a baseline.",
      ...(reportRef ? { reportRef } : {}),
    };
  }

  const status: "fresh" | "stale" | "unknown" =
    report.status === "fresh" || report.status === "stale" ? report.status : "unknown";
  const refreshRecommended = report.recommendation?.refreshRecommended === true;
  const summary = report.summary;
  const total = typeof summary?.total === "number" ? summary.total : 0;
  const changed = typeof summary?.changed === "number" ? summary.changed : 0;
  const missing = typeof summary?.missing === "number" ? summary.missing : 0;
  const created = typeof summary?.new === "number" ? summary.new : 0;

  const lines: string[] = [];
  lines.push(`Working-tree freshness: \`${status}\``);
  if (reportRef) {
    lines.push(`PathFreshnessReport: \`${reportRef.type}:${reportRef.id}\``);
  }
  lines.push(`Refresh recommended: \`${refreshRecommended ? "yes" : "no"}\``);
  if (status === "stale") {
    lines.push(
      `Path drift: changed ${changed}, missing ${missing}, new ${created} (of ${total} tracked).`,
    );
  } else if (status === "unknown") {
    lines.push("Baseline not yet established for this repo.");
  }

  let warning = "";
  if (status === "stale") {
    warning =
      "Working-tree source paths changed since the latest path freshness baseline. "
      + "Run `rekon refresh` before relying on generated artifacts.";
  } else if (status === "unknown") {
    warning =
      "Working-tree freshness is unknown. Run `rekon paths freshness` to establish a baseline.";
  }

  return {
    status,
    refreshRecommended,
    lines,
    warning,
    ...(reportRef ? { reportRef } : {}),
  };
}

function pickPathFreshnessReportRef(
  input: BuildPathFreshnessGitHubSummaryInput,
): ArtifactRef | undefined {
  if (input.reportRef) return input.reportRef;
  const header = input.report?.header;
  if (!header) return undefined;
  if (header.artifactType !== "PathFreshnessReport") return undefined;
  if (typeof header.artifactId !== "string" || header.artifactId.length === 0) return undefined;
  const schemaVersion = typeof header.schemaVersion === "string" && header.schemaVersion.length > 0
    ? header.schemaVersion
    : "0.1.0";
  return {
    type: header.artifactType,
    id: header.artifactId,
    schemaVersion,
  };
}

// ---------- Capability phrase publication surfacing helper ----------
//
// Pure helper that renders the publication block for a
// `CapabilityPhraseReport`. **Read-only**: never runs the
// phrase projection CLI, never runs normalization, never
// mutates the phrase report, the normalization report,
// `CapabilityMap`, or `EvidenceGraph`. When the publisher
// cannot find a report the renderer emits a no-report
// guidance block so operators know how to produce one.

export type BuildCapabilityPhrasePublicationSectionInput = {
  report?: CapabilityPhraseReportLike;
  reportRef?: ArtifactRef;
  /** 2 → architecture summary; 3 → agent contract */
  headingLevel?: 2 | 3;
  /** Cap the rendered phrase table; default 10. */
  tableLimit?: number;
};

export type BuildCapabilityPhrasePublicationSectionResult = {
  lines: string[];
  inputRef?: ArtifactRef;
};

const DEFAULT_CAPABILITY_PHRASE_TABLE_LIMIT = 10;

const CAPABILITY_PHRASE_DEFERRED_LINE =
  "CapabilityMap integration remains deferred. CapabilityPhraseReport is semantic purpose projection; CapabilityNormalizationReport remains translation audit.";

export function buildCapabilityPhrasePublicationSection(
  input: BuildCapabilityPhrasePublicationSectionInput,
): BuildCapabilityPhrasePublicationSectionResult {
  const { report, reportRef } = input;
  const headingLevel = input.headingLevel ?? 2;
  const heading = headingLevel === 2 ? "##" : "###";
  const tableLimit = input.tableLimit ?? DEFAULT_CAPABILITY_PHRASE_TABLE_LIMIT;
  const lines: string[] = [];

  lines.push(`${heading} Capability Phrases`);
  lines.push("");

  if (!report) {
    lines.push(
      "No `CapabilityPhraseReport` found. Run `rekon capability phrase project --report <CapabilityNormalizationReport:id> --json` after normalization.",
    );
    lines.push("");
    lines.push(CAPABILITY_PHRASE_DEFERRED_LINE);
    lines.push("");
    return { lines };
  }

  const summary = report.summary ?? {};
  const totalPhrases = typeof summary.totalPhrases === "number" ? summary.totalPhrases : 0;
  const stable = typeof summary.stable === "number" ? summary.stable : 0;
  const partial = typeof summary.partial === "number" ? summary.partial : 0;
  const lowConfidence = typeof summary.lowConfidence === "number" ? summary.lowConfidence : 0;
  const withDomain = typeof summary.withDomain === "number" ? summary.withDomain : 0;
  const withPattern = typeof summary.withPattern === "number" ? summary.withPattern : 0;
  const withLayer = typeof summary.withLayer === "number" ? summary.withLayer : 0;

  const resolvedReportRef = reportRef ?? pickPhraseReportRefFromHeader(report.header);
  const sourceRef = report.sourceNormalizationReportRef;

  if (resolvedReportRef) {
    lines.push(`- Report: ${formatRef(resolvedReportRef)}`);
  } else if (
    report.header?.artifactType === "CapabilityPhraseReport"
    && typeof report.header?.artifactId === "string"
  ) {
    lines.push(`- Report: ${report.header.artifactType}:${report.header.artifactId}`);
  }
  if (sourceRef) {
    lines.push(`- Source: ${formatRef(sourceRef)}`);
  }
  lines.push(
    `- Phrases: ${totalPhrases}`
    + ` (stable ${stable}, partial ${partial}, low-confidence ${lowConfidence})`,
  );
  lines.push(
    `- Enrichment: withDomain ${withDomain}, withPattern ${withPattern}, withLayer ${withLayer}`,
  );
  lines.push("");
  lines.push(CAPABILITY_PHRASE_DEFERRED_LINE);
  lines.push("");

  const phrases = Array.isArray(report.phrases) ? report.phrases : [];
  if (phrases.length > 0) {
    lines.push("| Verb | Noun | Status | Confidence | Evidence |");
    lines.push("| --- | --- | --- | --- | --- |");
    const bounded = phrases.slice(0, tableLimit);
    for (const phrase of bounded) {
      const verb = phrase.verb ?? "-";
      const noun = phrase.noun ?? "-";
      const status = phrase.status ?? "-";
      const confidence = phrase.confidence ?? "-";
      const evidenceCount = Array.isArray(phrase.evidenceRefs)
        ? phrase.evidenceRefs.length
        : 0;
      const evidenceLabel = evidenceCount === 1 ? "1 ref" : `${evidenceCount} refs`;
      lines.push(`| ${verb} | ${noun} | ${status} | ${confidence} | ${evidenceLabel} |`);
    }
    if (phrases.length > bounded.length) {
      lines.push("");
      lines.push(
        `(${phrases.length - bounded.length} additional phrase(s) omitted; inspect the artifact for full detail.)`,
      );
    }
    lines.push("");
  }

  return { lines, inputRef: resolvedReportRef };
}

function pickPhraseReportRefFromHeader(
  header: ArtifactHeader | undefined,
): ArtifactRef | undefined {
  if (!header) return undefined;
  if (header.artifactType !== "CapabilityPhraseReport") return undefined;
  if (typeof header.artifactId !== "string" || header.artifactId.length === 0) return undefined;
  const schemaVersion = typeof header.schemaVersion === "string" && header.schemaVersion.length > 0
    ? header.schemaVersion
    : "0.1.0";
  return {
    type: header.artifactType,
    id: header.artifactId,
    schemaVersion,
  };
}

/**
 * CapabilityMap v2 publication surfacing.
 *
 * The architecture-summary and agent-contract publishers
 * surface the high-confidence phrase-backed projection
 * shipped by `@rekon/capability-model` in the twenty-eighth
 * slice (`phraseBackedCapabilities` /
 * `phraseBackedSummary` / `phraseSourceRef`), gated by the
 * twenty-ninth-slice safety review. Both surfaces are
 * **strictly read-only**: they render data already present
 * on the `CapabilityMap` artifact, never re-run model
 * projection, never mutate `CapabilityMap`, never mutate
 * `CapabilityPhraseReport`, never mutate
 * `CapabilityNormalizationReport`, never mutate
 * `EvidenceGraph`, and never imply placement policy,
 * ownership policy, resolver routing, architecture linting,
 * verification planning, or source-write authority.
 *
 * The helper uses structural typing
 * (`CapabilityMapV2Like` is a duck type, not an import
 * from `@rekon/kernel-repo-model`'s `CapabilityMap`) so
 * the surfacing layer never tightens to a specific
 * runtime version.
 */

export type CapabilityMapV2PhraseBackedLike = {
  id?: unknown;
  verb?: unknown;
  noun?: unknown;
  qualifier?: unknown;
  domain?: unknown;
  pattern?: unknown;
  layer?: unknown;
  confidence?: unknown;
  status?: unknown;
  evidenceRefs?: unknown;
  sourceCandidateIds?: unknown;
  phraseRef?: {
    report?: unknown;
    phraseId?: unknown;
  };
};

export type CapabilityMapV2SummaryLike = {
  total?: unknown;
  byVerb?: unknown;
  byNoun?: unknown;
  withDomain?: unknown;
  withPattern?: unknown;
  withLayer?: unknown;
};

export type CapabilityMapV2Like = {
  header?: ArtifactHeader;
  phraseSourceRef?: ArtifactRef;
  phraseBackedSummary?: CapabilityMapV2SummaryLike;
  phraseBackedCapabilities?: CapabilityMapV2PhraseBackedLike[];
};

export type BuildCapabilityMapV2PublicationSectionInput = {
  capabilityMap?: CapabilityMapV2Like;
  capabilityMapRef?: ArtifactRef;
  /** 2 → architecture summary; 3 → agent contract. */
  headingLevel?: 2 | 3;
  /** Cap the rendered v2 table; default 20. */
  tableLimit?: number;
  /** Cap the top-N verb / noun summaries; default 5. */
  topListLimit?: number;
};

export type BuildCapabilityMapV2PublicationSectionResult = {
  lines: string[];
  /**
   * CapabilityMap ref the section is rendered against,
   * when discoverable. The producer is responsible for
   * citing this in `header.inputRefs`; the helper does
   * not mutate any header.
   */
  inputRef?: ArtifactRef;
};

const DEFAULT_CAPABILITY_MAP_V2_TABLE_LIMIT = 20;
const DEFAULT_CAPABILITY_MAP_V2_TOP_LIST_LIMIT = 5;

const CAPABILITY_MAP_V2_BOUNDARY_LINE =
  "These entries are projection context, not CapabilityContract placement policy. CapabilityMap v2 does not imply placement policy, ownership policy, resolver routing, architecture linting, verification planning, or source writes.";

const CAPABILITY_MAP_V2_PROOF_DEFERRAL_LINE =
  "Proof-report surfacing of CapabilityMap v2 is deferred. CapabilityMap v2 is semantic capability projection, not verification proof.";

export function buildCapabilityMapV2PublicationSection(
  input: BuildCapabilityMapV2PublicationSectionInput,
): BuildCapabilityMapV2PublicationSectionResult {
  const { capabilityMap, capabilityMapRef } = input;
  const headingLevel = input.headingLevel ?? 2;
  const heading = headingLevel === 2 ? "##" : "###";
  const tableLimit = input.tableLimit ?? DEFAULT_CAPABILITY_MAP_V2_TABLE_LIMIT;
  const topListLimit = input.topListLimit ?? DEFAULT_CAPABILITY_MAP_V2_TOP_LIST_LIMIT;
  const lines: string[] = [];

  lines.push(`${heading} CapabilityMap v2 Phrase-Backed Capabilities`);
  lines.push("");

  if (!capabilityMap) {
    lines.push(
      "No `CapabilityMap` found. Run `rekon refresh --json` after `rekon capability phrase project --report <CapabilityNormalizationReport:id> --json`.",
    );
    lines.push("");
    lines.push(CAPABILITY_MAP_V2_BOUNDARY_LINE);
    lines.push("");
    return { lines };
  }

  const resolvedMapRef = capabilityMapRef
    ?? pickCapabilityMapRefFromHeader(capabilityMap.header);
  const phraseSourceRef = isArtifactRefLike(capabilityMap.phraseSourceRef)
    ? capabilityMap.phraseSourceRef
    : undefined;

  if (resolvedMapRef) {
    lines.push(`- CapabilityMap: ${formatRef(resolvedMapRef)}`);
  }
  if (phraseSourceRef) {
    lines.push(`- CapabilityPhraseReport: ${formatRef(phraseSourceRef)}`);
  }

  const entries = Array.isArray(capabilityMap.phraseBackedCapabilities)
    ? capabilityMap.phraseBackedCapabilities
    : [];

  // When the CapabilityMap exists but has no v2 fields
  // (e.g. older runtimes, missing CapabilityPhraseReport)
  // we still emit a section + boundary line so operators
  // see that v2 was considered.
  if (entries.length === 0) {
    lines.push(
      "No phrase-backed capabilities available. CapabilityMap v2 is populated only when a `CapabilityPhraseReport` is present and at least one phrase is stable + high-confidence.",
    );
    lines.push("");
    lines.push(CAPABILITY_MAP_V2_BOUNDARY_LINE);
    lines.push("");
    lines.push(CAPABILITY_MAP_V2_PROOF_DEFERRAL_LINE);
    lines.push("");
    return { lines, inputRef: resolvedMapRef };
  }

  const summary = capabilityMap.phraseBackedSummary ?? {};
  const total = typeof summary.total === "number"
    ? summary.total
    : entries.length;
  const withDomain = typeof summary.withDomain === "number" ? summary.withDomain : 0;
  const withPattern = typeof summary.withPattern === "number" ? summary.withPattern : 0;
  const withLayer = typeof summary.withLayer === "number" ? summary.withLayer : 0;

  lines.push(
    `- Phrase-backed capabilities: ${total}`
    + ` (withDomain ${withDomain}, withPattern ${withPattern}, withLayer ${withLayer})`,
  );
  lines.push("");

  const byVerb = isStringNumberRecord(summary.byVerb) ? summary.byVerb : undefined;
  const byNoun = isStringNumberRecord(summary.byNoun) ? summary.byNoun : undefined;
  const topVerbs = byVerb ? pickTopEntries(byVerb, topListLimit) : [];
  const topNouns = byNoun ? pickTopEntries(byNoun, topListLimit) : [];
  if (topVerbs.length > 0) {
    lines.push(`- Top verbs: ${topVerbs.map(([k, v]) => `${k} (${v})`).join(", ")}`);
  }
  if (topNouns.length > 0) {
    lines.push(`- Top nouns: ${topNouns.map(([k, v]) => `${k} (${v})`).join(", ")}`);
  }
  if (topVerbs.length > 0 || topNouns.length > 0) {
    lines.push("");
  }

  lines.push(CAPABILITY_MAP_V2_BOUNDARY_LINE);
  lines.push("");
  lines.push(CAPABILITY_MAP_V2_PROOF_DEFERRAL_LINE);
  lines.push("");

  lines.push("| Verb | Noun | Domain | Pattern | Layer | Evidence |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  const bounded = entries.slice(0, tableLimit);
  for (const entry of bounded) {
    const verb = typeof entry.verb === "string" && entry.verb.length > 0 ? entry.verb : "-";
    const noun = typeof entry.noun === "string" && entry.noun.length > 0 ? entry.noun : "-";
    const domain = typeof entry.domain === "string" && entry.domain.length > 0
      ? entry.domain
      : "—";
    const pattern = typeof entry.pattern === "string" && entry.pattern.length > 0
      ? entry.pattern
      : "—";
    const layer = typeof entry.layer === "string" && entry.layer.length > 0
      ? entry.layer
      : "—";
    const evidenceCount = Array.isArray(entry.evidenceRefs)
      ? entry.evidenceRefs.length
      : 0;
    const evidenceLabel = evidenceCount === 1 ? "1 ref" : `${evidenceCount} refs`;
    lines.push(`| ${verb} | ${noun} | ${domain} | ${pattern} | ${layer} | ${evidenceLabel} |`);
  }
  if (entries.length > bounded.length) {
    lines.push("");
    lines.push(
      `(${entries.length - bounded.length} additional phrase-backed capabilit${
        entries.length - bounded.length === 1 ? "y" : "ies"
      } omitted; inspect the artifact for full detail.)`,
    );
  }
  lines.push("");

  return { lines, inputRef: resolvedMapRef };
}

function pickCapabilityMapRefFromHeader(
  header: ArtifactHeader | undefined,
): ArtifactRef | undefined {
  if (!header) return undefined;
  if (header.artifactType !== "CapabilityMap") return undefined;
  if (typeof header.artifactId !== "string" || header.artifactId.length === 0) return undefined;
  const schemaVersion = typeof header.schemaVersion === "string" && header.schemaVersion.length > 0
    ? header.schemaVersion
    : "0.1.0";
  return {
    type: header.artifactType,
    id: header.artifactId,
    schemaVersion,
  };
}

function isArtifactRefLike(value: unknown): value is ArtifactRef {
  return (
    !!value
    && typeof value === "object"
    && typeof (value as Record<string, unknown>).type === "string"
    && typeof (value as Record<string, unknown>).id === "string"
  );
}

function isStringNumberRecord(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const v of Object.values(value as Record<string, unknown>)) {
    if (typeof v !== "number") return false;
  }
  return true;
}

function pickTopEntries(
  record: Record<string, number>,
  limit: number,
): Array<[string, number]> {
  const sorted = Object.entries(record).sort((left, right) => {
    if (left[1] !== right[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0]);
  });
  return sorted.slice(0, limit);
}

// --------------------------------------------------------
// CapabilityContract publication surfacing
// (capability-contract-publications).
//
// Architecture-summary and agent-contract publishers
// surface the latest `CapabilityContract` artifact as
// read-only operator/agent visibility. They never
// generate the contract, never mutate the artifact,
// never mutate `.rekon/capability-contracts.json`,
// never mutate `CapabilityMap`, never mutate
// `CapabilityPhraseReport`, never mutate
// `EvidenceGraph`. The helper uses structural typing
// (`CapabilityContractLike` is a duck type, not an
// import from `@rekon/kernel-repo-model`).
//
// Boundary statement carried verbatim from the v1
// safety review:
//   "CapabilityContract is policy visibility only;
//    this publication does not enforce linting,
//    routing, verification planning, or source
//    writes."
// --------------------------------------------------------

export type CapabilityContractEntryLike = {
  id?: unknown;
  capabilityRef?: {
    capabilityMapRef?: unknown;
    phraseCapabilityId?: unknown;
  };
  match?: {
    verb?: unknown;
    noun?: unknown;
    domain?: unknown;
    pattern?: unknown;
    layer?: unknown;
  };
  status?: unknown;
  allowedLayers?: unknown;
  forbiddenLayers?: unknown;
  allowedSystems?: unknown;
  forbiddenSystems?: unknown;
  requiredChecks?: unknown;
  requiredNeighbors?: unknown;
  forbiddenNeighbors?: unknown;
  preservationRules?: unknown;
  messages?: unknown;
};

export type CapabilityContractSummaryLike = {
  total?: unknown;
  configured?: unknown;
  suggested?: unknown;
  unmatched?: unknown;
  withRequiredChecks?: unknown;
  withPlacementRules?: unknown;
  withPreservationRules?: unknown;
};

export type CapabilityContractSourceLike = {
  configPath?: unknown;
  configHash?: unknown;
  capabilityMapRef?: ArtifactRef;
  phraseReportRef?: ArtifactRef;
};

export type CapabilityContractLike = {
  header?: ArtifactHeader;
  source?: CapabilityContractSourceLike;
  summary?: CapabilityContractSummaryLike;
  contracts?: CapabilityContractEntryLike[];
};

export type BuildCapabilityContractPublicationSectionInput = {
  /** Latest CapabilityContract artifact. Optional —
   *  callers should still invoke the helper when absent;
   *  the helper emits no-contract guidance in that case
   *  so operators see what to run. */
  contract?: CapabilityContractLike;
  /** ArtifactRef for the contract. Stamped into the
   *  rendered "Contract:" line and returned as
   *  `inputRef`. */
  contractRef?: ArtifactRef;
  /** 2 → architecture summary; 3 → agent contract. */
  headingLevel?: 2 | 3;
  /** Cap the rendered contract table; default 20. */
  tableLimit?: number;
};

export type BuildCapabilityContractPublicationSectionResult = {
  lines: string[];
  /** Contract ref the section is rendered against,
   *  when discoverable. The producer is responsible
   *  for citing this in `header.inputRefs`; the
   *  helper does not mutate any header. */
  inputRef?: ArtifactRef;
};

const DEFAULT_CAPABILITY_CONTRACT_TABLE_LIMIT = 20;

const CAPABILITY_CONTRACT_BOUNDARY_LINE =
  "CapabilityContract is policy, not projection. CapabilityContract is policy visibility only; this publication does not enforce linting, routing, verification planning, or source writes.";

const CAPABILITY_CONTRACT_NO_CONTRACT_GUIDANCE =
  "No `CapabilityContract` found. Run `rekon capability contract generate --json` after `CapabilityMap` v2 is available.";

const CAPABILITY_CONTRACT_PROOF_DEFERRAL_LINE =
  "Proof-report surfacing of CapabilityContract is deferred. CapabilityContract is policy context, not verification proof.";

export function buildCapabilityContractPublicationSection(
  input: BuildCapabilityContractPublicationSectionInput,
): BuildCapabilityContractPublicationSectionResult {
  const { contract, contractRef } = input;
  const headingLevel = input.headingLevel ?? 2;
  const heading = headingLevel === 2 ? "##" : "###";
  const tableLimit = input.tableLimit ?? DEFAULT_CAPABILITY_CONTRACT_TABLE_LIMIT;
  const lines: string[] = [];

  lines.push(`${heading} Capability Contracts`);
  lines.push("");

  if (!contract) {
    lines.push(CAPABILITY_CONTRACT_NO_CONTRACT_GUIDANCE);
    lines.push("");
    lines.push(CAPABILITY_CONTRACT_BOUNDARY_LINE);
    lines.push("");
    return { lines };
  }

  const resolvedContractRef = contractRef ?? pickCapabilityContractRefFromHeader(contract.header);
  const source = contract.source ?? {};
  const summary = contract.summary ?? {};

  if (resolvedContractRef) {
    lines.push(`- Contract: ${formatRef(resolvedContractRef)}`);
  } else if (
    contract.header?.artifactType === "CapabilityContract"
    && typeof contract.header?.artifactId === "string"
  ) {
    lines.push(`- Contract: ${contract.header.artifactType}:${contract.header.artifactId}`);
  }
  const capabilityMapRef = source.capabilityMapRef;
  if (capabilityMapRef && typeof capabilityMapRef === "object") {
    lines.push(`- Source CapabilityMap: ${formatRef(capabilityMapRef)}`);
  }
  const phraseReportRef = source.phraseReportRef;
  if (phraseReportRef && typeof phraseReportRef === "object") {
    lines.push(`- Source CapabilityPhraseReport: ${formatRef(phraseReportRef)}`);
  }
  if (typeof source.configPath === "string" && source.configPath.length > 0) {
    lines.push(`- Config: \`${source.configPath}\``);
  } else {
    lines.push("- Config: (none — missing config is allowed)");
  }

  const total = readNonNegativeInteger(summary.total);
  const configured = readNonNegativeInteger(summary.configured);
  const suggested = readNonNegativeInteger(summary.suggested);
  const unmatched = readNonNegativeInteger(summary.unmatched);
  const withRequiredChecks = readNonNegativeInteger(summary.withRequiredChecks);
  const withPlacementRules = readNonNegativeInteger(summary.withPlacementRules);
  const withPreservationRules = readNonNegativeInteger(summary.withPreservationRules);

  lines.push(
    `- Rows: ${total}`
    + ` (configured ${configured}, unmatched ${unmatched}, suggested ${suggested})`,
  );
  lines.push(
    `- Policy: requiredChecks ${withRequiredChecks},`
    + ` placement ${withPlacementRules},`
    + ` preservation ${withPreservationRules}`,
  );
  lines.push("");
  lines.push(CAPABILITY_CONTRACT_BOUNDARY_LINE);
  lines.push("");

  const contracts = Array.isArray(contract.contracts) ? contract.contracts : [];
  if (contracts.length > 0) {
    lines.push("| Status | Verb | Noun | Domain | Layer | Checks | Rules |");
    lines.push("| --- | --- | --- | --- | --- | ---: | ---: |");
    const bounded = contracts.slice(0, tableLimit);
    for (const entry of bounded) {
      const status = typeof entry.status === "string" ? entry.status : "-";
      const verb = typeof entry.match?.verb === "string" ? entry.match.verb : "-";
      const noun = typeof entry.match?.noun === "string" ? entry.match.noun : "-";
      const domain = typeof entry.match?.domain === "string" ? entry.match.domain : "—";
      const layer = typeof entry.match?.layer === "string" ? entry.match.layer : "—";
      const checks = Array.isArray(entry.requiredChecks) ? entry.requiredChecks.length : 0;
      const ruleCount = countPopulatedPolicyFields(entry);
      lines.push(
        `| ${status} | ${verb} | ${noun} | ${domain} | ${layer} | ${checks} | ${ruleCount} |`,
      );
    }
    if (contracts.length > bounded.length) {
      lines.push("");
      lines.push(
        `(${contracts.length - bounded.length} additional contract row(s) omitted; inspect the artifact for full detail.)`,
      );
    }
    lines.push("");
  }

  return { lines, inputRef: resolvedContractRef };
}

function pickCapabilityContractRefFromHeader(
  header: ArtifactHeader | undefined,
): ArtifactRef | undefined {
  if (!header) return undefined;
  if (header.artifactType !== "CapabilityContract") return undefined;
  if (typeof header.artifactId !== "string" || header.artifactId.length === 0) return undefined;
  const schemaVersion = typeof header.schemaVersion === "string" && header.schemaVersion.length > 0
    ? header.schemaVersion
    : "0.1.0";
  return {
    type: header.artifactType,
    id: header.artifactId,
    schemaVersion,
  };
}

function readNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number") return 0;
  if (!Number.isInteger(value)) return 0;
  if (value < 0) return 0;
  return value;
}

function countPopulatedPolicyFields(entry: CapabilityContractEntryLike): number {
  let count = 0;
  const stringArrayFields: Array<keyof CapabilityContractEntryLike> = [
    "allowedLayers",
    "forbiddenLayers",
    "allowedSystems",
    "forbiddenSystems",
    "requiredChecks",
    "preservationRules",
    "messages",
  ];
  for (const field of stringArrayFields) {
    const value = entry[field];
    if (Array.isArray(value) && value.length > 0) count++;
  }
  for (const field of ["requiredNeighbors", "forbiddenNeighbors"] as const) {
    const value = entry[field];
    if (Array.isArray(value) && value.length > 0) count++;
  }
  return count;
}

export const CAPABILITY_CONTRACT_PUBLICATION_BOUNDARY_LINE =
  CAPABILITY_CONTRACT_BOUNDARY_LINE;
export const CAPABILITY_CONTRACT_PUBLICATION_PROOF_DEFERRAL_LINE =
  CAPABILITY_CONTRACT_PROOF_DEFERRAL_LINE;

// --------------------------------------------------------
// CapabilityArchitectureLintReport publication surfacing
// (capability-architecture-lint-publications).
//
// Architecture-summary and agent-contract publishers
// surface the latest `CapabilityArchitectureLintReport`
// as read-only operator/agent visibility into
// capability-aware placement-policy evaluation. They
// never run `rekon capability lint architecture`, never
// mutate the lint report, never mutate
// `CapabilityContract`, `CapabilityMap`, `FindingReport`,
// `FindingFilterReport`, `FindingLifecycleReport`, or
// `CoherencyDelta`. The helper uses structural typing
// (`CapabilityArchitectureLintReportLike` is a duck type,
// not an import from `@rekon/kernel-repo-model`).
//
// Boundary statement carried verbatim from the lint
// safety review:
//   "CapabilityArchitectureLintReport is evaluation
//    visibility only; this publication does not write
//    findings, mutate lifecycle state, route resolvers,
//    generate verification plans, or write source files."
//
// findingCandidate on violation rows is preview-only.
// --------------------------------------------------------

export type CapabilityArchitectureLintRowLike = {
  id?: unknown;
  contractId?: unknown;
  phraseCapabilityId?: unknown;
  rule?: unknown;
  status?: "violation" | "pass" | "not-evaluated" | unknown;
  severity?: "low" | "medium" | "high" | unknown;
  confidence?: "low" | "medium" | "high" | unknown;
  message?: unknown;
  evidenceRefs?: ArtifactRef[];
  findingCandidate?: {
    title?: unknown;
    category?: unknown;
    severity?: "low" | "medium" | "high" | unknown;
  };
};

export type CapabilityArchitectureLintSummaryLike = {
  total?: unknown;
  violations?: unknown;
  passes?: unknown;
  notEvaluated?: unknown;
  byRule?: Record<string, unknown>;
  bySeverity?: Record<string, unknown>;
};

export type CapabilityArchitectureLintSourceLike = {
  capabilityContractRef?: ArtifactRef;
  capabilityMapRef?: ArtifactRef;
};

export type CapabilityArchitectureLintReportLike = {
  header?: ArtifactHeader;
  source?: CapabilityArchitectureLintSourceLike;
  summary?: CapabilityArchitectureLintSummaryLike;
  rows?: CapabilityArchitectureLintRowLike[];
};

export type BuildCapabilityArchitectureLintPublicationSectionInput = {
  /** Latest CapabilityArchitectureLintReport artifact.
   *  Optional — callers should still invoke the helper
   *  when absent; the helper emits no-report guidance in
   *  that case so operators see what to run. */
  report?: CapabilityArchitectureLintReportLike;
  /** ArtifactRef for the lint report. Stamped into the
   *  rendered "Report:" line and returned as `inputRef`. */
  reportRef?: ArtifactRef;
  /** 2 → architecture summary; 3 → agent contract. */
  headingLevel?: 2 | 3;
  /** Cap the rendered row table; default 20. */
  tableLimit?: number;
};

export type BuildCapabilityArchitectureLintPublicationSectionResult = {
  lines: string[];
  /** Lint report ref the section is rendered against,
   *  when discoverable. The producer is responsible for
   *  citing this in `header.inputRefs`; the helper does
   *  not mutate any header. */
  inputRef?: ArtifactRef;
};

const DEFAULT_CAPABILITY_LINT_TABLE_LIMIT = 20;

const CAPABILITY_LINT_BOUNDARY_LINE =
  "CapabilityArchitectureLintReport is evaluation visibility only; this publication does not write findings, mutate lifecycle state, route resolvers, generate verification plans, or write source files.";

const CAPABILITY_LINT_NO_REPORT_GUIDANCE =
  "No `CapabilityArchitectureLintReport` found. Run `rekon capability lint architecture --json` after generating a `CapabilityContract`.";

const CAPABILITY_LINT_PROOF_DEFERRAL_LINE =
  "Proof-report surfacing of CapabilityArchitectureLintReport is deferred. CapabilityArchitectureLintReport is policy-evaluation context, not verification proof.";

const CAPABILITY_LINT_EVALUATION_GUIDANCE =
  "CapabilityArchitectureLintReport is evaluation, not enforcement. `violation` rows are policy-evaluation signals, not governed findings; `findingCandidate` is preview-only and writes no FindingReport. `not-evaluated` rows mean Rekon lacks deterministic context for that rule.";

export function buildCapabilityArchitectureLintPublicationSection(
  input: BuildCapabilityArchitectureLintPublicationSectionInput,
): BuildCapabilityArchitectureLintPublicationSectionResult {
  const { report, reportRef } = input;
  const headingLevel = input.headingLevel ?? 2;
  const heading = headingLevel === 2 ? "##" : "###";
  const tableLimit = input.tableLimit ?? DEFAULT_CAPABILITY_LINT_TABLE_LIMIT;
  const lines: string[] = [];

  lines.push(`${heading} Capability Architecture Linting`);
  lines.push("");

  if (!report) {
    lines.push(CAPABILITY_LINT_NO_REPORT_GUIDANCE);
    lines.push("");
    lines.push(CAPABILITY_LINT_EVALUATION_GUIDANCE);
    lines.push("");
    lines.push(CAPABILITY_LINT_BOUNDARY_LINE);
    lines.push("");
    return { lines };
  }

  const resolvedReportRef = reportRef
    ?? pickCapabilityLintRefFromHeader(report.header);
  const source = report.source ?? {};
  const summary = report.summary ?? {};

  if (resolvedReportRef) {
    lines.push(`- Report: ${formatRef(resolvedReportRef)}`);
  } else if (
    report.header?.artifactType === "CapabilityArchitectureLintReport"
    && typeof report.header?.artifactId === "string"
  ) {
    lines.push(
      `- Report: ${report.header.artifactType}:${report.header.artifactId}`,
    );
  }
  const capabilityContractRef = source.capabilityContractRef;
  if (capabilityContractRef && typeof capabilityContractRef === "object") {
    lines.push(`- Source CapabilityContract: ${formatRef(capabilityContractRef)}`);
  }
  const capabilityMapRef = source.capabilityMapRef;
  if (capabilityMapRef && typeof capabilityMapRef === "object") {
    lines.push(`- Source CapabilityMap: ${formatRef(capabilityMapRef)}`);
  }

  const total = readNonNegativeInteger(summary.total);
  const violations = readNonNegativeInteger(summary.violations);
  const passes = readNonNegativeInteger(summary.passes);
  const notEvaluated = readNonNegativeInteger(summary.notEvaluated);

  lines.push(
    `- Rows: ${total}`
    + ` (violations ${violations}, passes ${passes}, not-evaluated ${notEvaluated})`,
  );
  const byRule = formatCountRecord(summary.byRule);
  if (byRule) {
    lines.push(`- By rule: ${byRule}`);
  }
  const bySeverity = formatCountRecord(summary.bySeverity);
  if (bySeverity) {
    lines.push(`- By severity: ${bySeverity}`);
  }
  lines.push("");
  lines.push(CAPABILITY_LINT_EVALUATION_GUIDANCE);
  lines.push("");
  lines.push(CAPABILITY_LINT_BOUNDARY_LINE);
  lines.push("");

  const rows = Array.isArray(report.rows) ? report.rows : [];
  if (rows.length > 0) {
    lines.push(
      "| Status | Rule | Contract | Capability | Severity | Confidence | Message |",
    );
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    const bounded = rows.slice(0, tableLimit);
    for (const row of bounded) {
      const status = typeof row.status === "string" ? row.status : "-";
      const rule = typeof row.rule === "string" ? row.rule : "-";
      const contractId = typeof row.contractId === "string" ? row.contractId : "-";
      const capability = typeof row.phraseCapabilityId === "string"
        && row.phraseCapabilityId.length > 0
        ? row.phraseCapabilityId
        : "—";
      const severity = typeof row.severity === "string" ? row.severity : "-";
      const confidence = typeof row.confidence === "string" ? row.confidence : "-";
      const message = typeof row.message === "string"
        ? escapeTableCell(row.message)
        : "—";
      lines.push(
        `| ${status} | ${rule} | ${contractId} | ${capability} | ${severity} | ${confidence} | ${message} |`,
      );
    }
    if (rows.length > bounded.length) {
      lines.push("");
      lines.push(
        `(${rows.length - bounded.length} additional lint row(s) omitted; inspect the artifact for full detail.)`,
      );
    }
    lines.push("");
  }

  return { lines, inputRef: resolvedReportRef };
}

function pickCapabilityLintRefFromHeader(
  header: ArtifactHeader | undefined,
): ArtifactRef | undefined {
  if (!header) return undefined;
  if (header.artifactType !== "CapabilityArchitectureLintReport") return undefined;
  if (typeof header.artifactId !== "string" || header.artifactId.length === 0) return undefined;
  const schemaVersion = typeof header.schemaVersion === "string" && header.schemaVersion.length > 0
    ? header.schemaVersion
    : "0.1.0";
  return {
    type: header.artifactType,
    id: header.artifactId,
    schemaVersion,
  };
}

function formatCountRecord(record: Record<string, unknown> | undefined): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  const parts: string[] = [];
  for (const key of Object.keys(record).sort()) {
    const value = record[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
      parts.push(`${key} ${value}`);
    }
  }
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export const CAPABILITY_ARCHITECTURE_LINT_PUBLICATION_BOUNDARY_LINE =
  CAPABILITY_LINT_BOUNDARY_LINE;
export const CAPABILITY_ARCHITECTURE_LINT_PUBLICATION_PROOF_DEFERRAL_LINE =
  CAPABILITY_LINT_PROOF_DEFERRAL_LINE;

// ---------------------------------------------------------------------------
// CapabilityLintFindingBridgeReport publication surfacing
// (capability-lint-finding-bridge-publications). Mirrors the
// CapabilityArchitectureLintReport surfacing above: a pure,
// structurally-typed helper rendering a read-only
// "Capability Lint Finding Bridge" section for the
// architecture summary and agent contract. Preview visibility
// only — never writes FindingReport, never mutates lifecycle /
// CoherencyDelta, never creates WorkOrder / VerificationPlan,
// never writes source files, never runs bridge generation.
// ---------------------------------------------------------------------------

export type CapabilityLintFindingBridgeProposedFindingLike = {
  id?: unknown;
  title?: unknown;
  category?: unknown;
  severity?: "low" | "medium" | "high" | unknown;
  evidenceRefs?: ArtifactRef[];
  sourceLintRowRef?: {
    report?: ArtifactRef;
    rowId?: unknown;
  };
};

export type CapabilityLintFindingBridgeCandidateLike = {
  id?: unknown;
  lintRowId?: unknown;
  contractId?: unknown;
  phraseCapabilityId?: unknown;
  decision?: "eligible" | "ineligible" | "needs-review" | unknown;
  reason?: unknown;
  severity?: "low" | "medium" | "high" | unknown;
  confidence?: "low" | "medium" | "high" | unknown;
  proposedFinding?: CapabilityLintFindingBridgeProposedFindingLike;
  messages?: string[];
};

export type CapabilityLintFindingBridgeSummaryLike = {
  totalRows?: unknown;
  eligible?: unknown;
  ineligible?: unknown;
  needsReview?: unknown;
  byReason?: Record<string, unknown>;
  bySeverity?: Record<string, unknown>;
};

export type CapabilityLintFindingBridgeSourceLike = {
  lintReportRef?: ArtifactRef;
  capabilityContractRef?: ArtifactRef;
  capabilityMapRef?: ArtifactRef;
};

export type CapabilityLintFindingBridgeReportLike = {
  header?: ArtifactHeader;
  source?: CapabilityLintFindingBridgeSourceLike;
  summary?: CapabilityLintFindingBridgeSummaryLike;
  candidates?: CapabilityLintFindingBridgeCandidateLike[];
};

export type BuildCapabilityLintFindingBridgePublicationSectionInput = {
  /** Latest CapabilityLintFindingBridgeReport artifact.
   *  Optional — callers should still invoke the helper when
   *  absent; the helper emits no-report guidance so operators
   *  see what to run. */
  report?: CapabilityLintFindingBridgeReportLike;
  /** ArtifactRef for the bridge report. Stamped into the
   *  rendered "Report:" line and returned as `inputRef`. */
  reportRef?: ArtifactRef;
  /** 2 → architecture summary; 3 → agent contract. */
  headingLevel?: 2 | 3;
  /** Cap the rendered candidate table; default 20. */
  tableLimit?: number;
};

export type BuildCapabilityLintFindingBridgePublicationSectionResult = {
  lines: string[];
  /** Bridge report ref the section is rendered against, when
   *  discoverable. The producer is responsible for citing this
   *  in `header.inputRefs`; the helper mutates no header. */
  inputRef?: ArtifactRef;
};

const DEFAULT_CAPABILITY_LINT_BRIDGE_TABLE_LIMIT = 20;

const CAPABILITY_LINT_BRIDGE_BOUNDARY_LINE =
  "CapabilityLintFindingBridgeReport is preview visibility only; this publication does not write FindingReport, mutate lifecycle state, mutate CoherencyDelta, create WorkOrders, create VerificationPlans, or write source files.";

const CAPABILITY_LINT_BRIDGE_NO_REPORT_GUIDANCE =
  "No `CapabilityLintFindingBridgeReport` found. Run `rekon capability lint bridge-findings --json` after generating a `CapabilityArchitectureLintReport`.";

const CAPABILITY_LINT_BRIDGE_PROOF_DEFERRAL_LINE =
  "Proof-report surfacing of CapabilityLintFindingBridgeReport is deferred. CapabilityLintFindingBridgeReport is preview / governance-candidate context, not verification proof.";

const CAPABILITY_LINT_BRIDGE_GUIDANCE = [
  "CapabilityLintFindingBridgeReport is preview, not FindingReport.",
  "`eligible` candidates are proposed governed-finding candidates only — not yet governed findings.",
  "`ineligible` candidates are not bridge-ready (pass / not-evaluated / missing finding candidate / low confidence / low severity / missing evidence).",
  "`needs-review` candidates require operator review before any future writer (e.g. duplicate proposed finding id).",
  "`proposedFinding` is preview-only; no FindingReport is written.",
];

export function buildCapabilityLintFindingBridgePublicationSection(
  input: BuildCapabilityLintFindingBridgePublicationSectionInput,
): BuildCapabilityLintFindingBridgePublicationSectionResult {
  const { report, reportRef } = input;
  const headingLevel = input.headingLevel ?? 2;
  const heading = headingLevel === 2 ? "##" : "###";
  const tableLimit = input.tableLimit ?? DEFAULT_CAPABILITY_LINT_BRIDGE_TABLE_LIMIT;
  const lines: string[] = [];

  lines.push(`${heading} Capability Lint Finding Bridge`);
  lines.push("");

  if (!report) {
    lines.push(CAPABILITY_LINT_BRIDGE_NO_REPORT_GUIDANCE);
    lines.push("");
    for (const guidance of CAPABILITY_LINT_BRIDGE_GUIDANCE) {
      lines.push(`- ${guidance}`);
    }
    lines.push("");
    lines.push(CAPABILITY_LINT_BRIDGE_BOUNDARY_LINE);
    lines.push("");
    return { lines };
  }

  const resolvedReportRef = reportRef
    ?? pickCapabilityLintBridgeRefFromHeader(report.header);
  const source = report.source ?? {};
  const summary = report.summary ?? {};

  if (resolvedReportRef) {
    lines.push(`- Report: ${formatRef(resolvedReportRef)}`);
  } else if (
    report.header?.artifactType === "CapabilityLintFindingBridgeReport"
    && typeof report.header?.artifactId === "string"
  ) {
    lines.push(
      `- Report: ${report.header.artifactType}:${report.header.artifactId}`,
    );
  }
  const lintReportRef = source.lintReportRef;
  if (lintReportRef && typeof lintReportRef === "object") {
    lines.push(`- Source CapabilityArchitectureLintReport: ${formatRef(lintReportRef)}`);
  }
  const capabilityContractRef = source.capabilityContractRef;
  if (capabilityContractRef && typeof capabilityContractRef === "object") {
    lines.push(`- Source CapabilityContract: ${formatRef(capabilityContractRef)}`);
  }
  const capabilityMapRef = source.capabilityMapRef;
  if (capabilityMapRef && typeof capabilityMapRef === "object") {
    lines.push(`- Source CapabilityMap: ${formatRef(capabilityMapRef)}`);
  }

  const totalRows = readNonNegativeInteger(summary.totalRows);
  const eligible = readNonNegativeInteger(summary.eligible);
  const ineligible = readNonNegativeInteger(summary.ineligible);
  const needsReview = readNonNegativeInteger(summary.needsReview);

  lines.push(
    `- Candidates: ${totalRows}`
    + ` (eligible ${eligible}, ineligible ${ineligible}, needs-review ${needsReview})`,
  );
  const byReason = formatCountRecord(summary.byReason);
  if (byReason) {
    lines.push(`- By reason: ${byReason}`);
  }
  const bySeverity = formatCountRecord(summary.bySeverity);
  if (bySeverity) {
    lines.push(`- By severity: ${bySeverity}`);
  }
  lines.push("");
  for (const guidance of CAPABILITY_LINT_BRIDGE_GUIDANCE) {
    lines.push(`- ${guidance}`);
  }
  lines.push("");
  lines.push(CAPABILITY_LINT_BRIDGE_BOUNDARY_LINE);
  lines.push("");

  const candidates = Array.isArray(report.candidates) ? report.candidates : [];
  if (candidates.length > 0) {
    lines.push(
      "| Decision | Reason | Contract | Capability | Severity | Confidence | Proposed Finding |",
    );
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    const bounded = candidates.slice(0, tableLimit);
    for (const candidate of bounded) {
      const decision = typeof candidate.decision === "string" ? candidate.decision : "-";
      const reason = typeof candidate.reason === "string" ? candidate.reason : "-";
      const contractId = typeof candidate.contractId === "string" ? candidate.contractId : "-";
      const capability = typeof candidate.phraseCapabilityId === "string"
        && candidate.phraseCapabilityId.length > 0
        ? candidate.phraseCapabilityId
        : "—";
      const severity = typeof candidate.severity === "string" ? candidate.severity : "-";
      const confidence = typeof candidate.confidence === "string" ? candidate.confidence : "-";
      const proposedFindingId = candidate.proposedFinding
        && typeof candidate.proposedFinding.id === "string"
        && candidate.proposedFinding.id.length > 0
        ? escapeTableCell(candidate.proposedFinding.id)
        : "—";
      lines.push(
        `| ${decision} | ${reason} | ${contractId} | ${capability} | ${severity} | ${confidence} | ${proposedFindingId} |`,
      );
    }
    if (candidates.length > bounded.length) {
      lines.push("");
      lines.push(
        `(${candidates.length - bounded.length} additional bridge candidate(s) omitted; inspect the artifact for full detail.)`,
      );
    }
    lines.push("");
  }

  return { lines, inputRef: resolvedReportRef };
}

function pickCapabilityLintBridgeRefFromHeader(
  header: ArtifactHeader | undefined,
): ArtifactRef | undefined {
  if (!header) return undefined;
  if (header.artifactType !== "CapabilityLintFindingBridgeReport") return undefined;
  if (typeof header.artifactId !== "string" || header.artifactId.length === 0) return undefined;
  const schemaVersion = typeof header.schemaVersion === "string" && header.schemaVersion.length > 0
    ? header.schemaVersion
    : "0.1.0";
  return {
    type: header.artifactType,
    id: header.artifactId,
    schemaVersion,
  };
}

export const CAPABILITY_LINT_FINDING_BRIDGE_PUBLICATION_BOUNDARY_LINE =
  CAPABILITY_LINT_BRIDGE_BOUNDARY_LINE;
export const CAPABILITY_LINT_FINDING_BRIDGE_PUBLICATION_PROOF_DEFERRAL_LINE =
  CAPABILITY_LINT_BRIDGE_PROOF_DEFERRAL_LINE;

// --- Bridge-derived findings publication surfacing ------------------
//
// Read-only surfacing of *governed* FindingReport entries that were
// written by the controlled `rekon capability lint write-findings
// --confirm-finding-write` writer (bridge-derived-findings-publication
// slice). Distinct from the preview Capability Lint Finding Bridge
// section above: that section surfaces bridge *candidates*; this
// section surfaces the *governed findings* the writer actually wrote.
//
// Bridge-derived findings are identified structurally — by
// `finding.type === "capability_architecture_policy"`, by
// `finding.details.source === "capability-lint-bridge"`, or by the
// presence of any `finding.details.source*` trace field — never by
// title text alone.

/** The governed Finding type/category bridge-derived findings carry. */
export const BRIDGE_DERIVED_FINDING_TYPE = "capability_architecture_policy";
/** The `finding.details.source` marker the writer stamps. */
export const BRIDGE_DERIVED_FINDING_SOURCE = "capability-lint-bridge";

export type BridgeDerivedFindingLike = {
  id?: string;
  title?: string;
  type?: string;
  category?: string;
  severity?: string;
  evidence?: ArtifactRef[];
  evidenceRefs?: ArtifactRef[];
  details?: {
    source?: string;
    sourceBridgeCandidateId?: string;
    sourceLintRowId?: string;
    sourceContractId?: string;
    sourcePhraseCapabilityId?: string;
    [key: string]: unknown;
  };
};

export type BridgeDerivedFindingReportLike = {
  header?: ArtifactHeader;
  findings?: BridgeDerivedFindingLike[];
};

export type BuildBridgeDerivedFindingsPublicationSectionInput = {
  /** Latest FindingReport artifact. Optional — callers still invoke
   *  the helper when absent; it emits no-bridge-derived guidance. */
  report?: BridgeDerivedFindingReportLike;
  /** ArtifactRef for the FindingReport. Stamped into the rendered
   *  "FindingReport:" line and returned as `inputRef`. */
  reportRef?: ArtifactRef;
  /** 2 → architecture summary; 3 → agent contract. */
  headingLevel?: 2 | 3;
  /** Cap the rendered findings table; default 20. */
  tableLimit?: number;
};

export type BuildBridgeDerivedFindingsPublicationSectionResult = {
  lines: string[];
  /** FindingReport ref the section is rendered against, when
   *  discoverable. The producer cites this in `header.inputRefs`;
   *  the helper mutates no header. */
  inputRef?: ArtifactRef;
  /** Count of bridge-derived findings identified (0 when none). */
  count: number;
};

const DEFAULT_BRIDGE_DERIVED_FINDINGS_TABLE_LIMIT = 20;

export const BRIDGE_DERIVED_FINDINGS_BOUNDARY_LINE =
  "Bridge-derived findings are governed FindingReport entries, not lifecycle status; this publication does not update lifecycle status, adjudication, CoherencyDelta, WorkOrders, VerificationPlans, or source files.";

const BRIDGE_DERIVED_FINDINGS_NO_REPORT_GUIDANCE =
  "No bridge-derived FindingReport entries found. Run the bridge dry-run / writer flow only if approved.";

export const BRIDGE_DERIVED_FINDINGS_PROOF_DEFERRAL_LINE =
  "Proof-report surfacing of bridge-derived findings is deferred. Finding provenance is governance context, not verification proof.";

const BRIDGE_DERIVED_FINDINGS_GUIDANCE = [
  "Bridge-derived findings are governed FindingReport entries.",
  "They are not FindingLifecycleReport status.",
  "They do not imply CoherencyDelta remediation.",
  "They do not create WorkOrders or VerificationPlans.",
  "They are provenance-bearing findings from the capability lint bridge.",
];

/** Structural identification — never relies on title text alone. */
export function isBridgeDerivedFinding(
  finding: BridgeDerivedFindingLike | undefined,
): boolean {
  if (!finding || typeof finding !== "object") return false;
  if (finding.type === BRIDGE_DERIVED_FINDING_TYPE) return true;
  if (finding.category === BRIDGE_DERIVED_FINDING_TYPE) return true;
  const details = finding.details;
  if (details && typeof details === "object") {
    if (details.source === BRIDGE_DERIVED_FINDING_SOURCE) return true;
    for (
      const field of [
        details.sourceBridgeCandidateId,
        details.sourceLintRowId,
        details.sourceContractId,
        details.sourcePhraseCapabilityId,
      ]
    ) {
      if (typeof field === "string" && field.length > 0) return true;
    }
  }
  return false;
}

function pickFindingReportRefFromHeader(
  header: ArtifactHeader | undefined,
): ArtifactRef | undefined {
  if (!header) return undefined;
  if (header.artifactType !== "FindingReport") return undefined;
  if (typeof header.artifactId !== "string" || header.artifactId.length === 0) {
    return undefined;
  }
  const schemaVersion = typeof header.schemaVersion === "string"
    && header.schemaVersion.length > 0
    ? header.schemaVersion
    : "0.1.0";
  return { type: header.artifactType, id: header.artifactId, schemaVersion };
}

export function buildBridgeDerivedFindingsPublicationSection(
  input: BuildBridgeDerivedFindingsPublicationSectionInput,
): BuildBridgeDerivedFindingsPublicationSectionResult {
  const { report, reportRef } = input;
  const headingLevel = input.headingLevel ?? 2;
  const heading = headingLevel === 2 ? "##" : "###";
  const tableLimit = input.tableLimit ?? DEFAULT_BRIDGE_DERIVED_FINDINGS_TABLE_LIMIT;
  const lines: string[] = [];

  lines.push(`${heading} Bridge-Derived Findings`);
  lines.push("");

  const findings = report && Array.isArray(report.findings) ? report.findings : [];
  const bridgeDerived = findings.filter((finding) => isBridgeDerivedFinding(finding));

  if (bridgeDerived.length === 0) {
    lines.push(BRIDGE_DERIVED_FINDINGS_NO_REPORT_GUIDANCE);
    lines.push("");
    for (const guidance of BRIDGE_DERIVED_FINDINGS_GUIDANCE) {
      lines.push(`- ${guidance}`);
    }
    lines.push("");
    lines.push(BRIDGE_DERIVED_FINDINGS_BOUNDARY_LINE);
    lines.push("");
    lines.push(BRIDGE_DERIVED_FINDINGS_PROOF_DEFERRAL_LINE);
    lines.push("");
    return { lines, count: 0 };
  }

  const resolvedReportRef = reportRef ?? pickFindingReportRefFromHeader(report?.header);
  if (resolvedReportRef) {
    lines.push(`- FindingReport: ${formatRef(resolvedReportRef)}`);
  } else if (
    report?.header?.artifactType === "FindingReport"
    && typeof report.header?.artifactId === "string"
  ) {
    lines.push(`- FindingReport: ${report.header.artifactType}:${report.header.artifactId}`);
  }

  lines.push(`- Bridge-derived findings: ${bridgeDerived.length}`);

  const bySeverity: Record<string, number> = {};
  for (const finding of bridgeDerived) {
    const severity = typeof finding.severity === "string" && finding.severity.length > 0
      ? finding.severity
      : "unknown";
    bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
  }
  const severityLine = formatCountRecord(bySeverity);
  if (severityLine) {
    lines.push(`- By severity: ${severityLine}`);
  }
  lines.push("");
  for (const guidance of BRIDGE_DERIVED_FINDINGS_GUIDANCE) {
    lines.push(`- ${guidance}`);
  }
  lines.push("");
  lines.push(BRIDGE_DERIVED_FINDINGS_BOUNDARY_LINE);
  lines.push("");
  lines.push(BRIDGE_DERIVED_FINDINGS_PROOF_DEFERRAL_LINE);
  lines.push("");

  lines.push(
    "| Severity | Finding | Source Candidate | Source Lint Row | Source Contract | Source Capability |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- |");
  const bounded = bridgeDerived.slice(0, tableLimit);
  for (const finding of bounded) {
    const details = finding.details ?? {};
    const severity = typeof finding.severity === "string" ? finding.severity : "-";
    const findingId = typeof finding.id === "string" && finding.id.length > 0
      ? escapeTableCell(finding.id)
      : "—";
    const candidate = typeof details.sourceBridgeCandidateId === "string"
      && details.sourceBridgeCandidateId.length > 0
      ? escapeTableCell(details.sourceBridgeCandidateId)
      : "—";
    const lintRow = typeof details.sourceLintRowId === "string"
      && details.sourceLintRowId.length > 0
      ? escapeTableCell(details.sourceLintRowId)
      : "—";
    const contract = typeof details.sourceContractId === "string"
      && details.sourceContractId.length > 0
      ? escapeTableCell(details.sourceContractId)
      : "—";
    const capability = typeof details.sourcePhraseCapabilityId === "string"
      && details.sourcePhraseCapabilityId.length > 0
      ? escapeTableCell(details.sourcePhraseCapabilityId)
      : "—";
    lines.push(
      `| ${severity} | ${findingId} | ${candidate} | ${lintRow} | ${contract} | ${capability} |`,
    );
  }
  if (bridgeDerived.length > bounded.length) {
    lines.push("");
    lines.push(
      `(${bridgeDerived.length - bounded.length} additional bridge-derived finding(s) omitted; inspect the FindingReport for full detail.)`,
    );
  }
  lines.push("");

  return { lines, inputRef: resolvedReportRef, count: bridgeDerived.length };
}

export {
  type IntentPlanBundleSource,
  type IntentPlanBundleFile,
  type IntentPlanBundleRenderResult,
  type BuildIntentPlanBundleInput,
  slugifyIntentId,
  isSafeBundleRelativePath,
  buildIntentPlanBundle,
} from "./intent-plan-bundle.js";
export * from "./doc-freshness.js";

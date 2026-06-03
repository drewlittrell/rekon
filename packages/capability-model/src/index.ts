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
import {
  type PhraseReportLike,
  buildPhraseBackedCapabilityMapAdditions,
} from "./phrase-backed.js";

export {
  type BuildPhraseBackedAdditionsInput,
  type PhraseBackedAdditions,
  type PhraseLike,
  type PhraseReportLike,
  buildPhraseBackedCapabilityMapAdditions,
} from "./phrase-backed.js";

export {
  type BuildCapabilityContractInput,
  type CapabilityContractConfig,
  buildCapabilityContract,
} from "./capability-contract.js";

export {
  type BuildCapabilityArchitectureLintReportInput,
  CAPABILITY_ARCHITECTURE_LINT_ARTIFACT_ID_PREFIX,
  CAPABILITY_ARCHITECTURE_LINT_FINDING_CATEGORY,
  buildCapabilityArchitectureLintReport,
} from "./capability-architecture-lint.js";

export {
  type BuildCapabilityLintFindingBridgeReportInput,
  CAPABILITY_LINT_FINDING_BRIDGE_ARTIFACT_ID_PREFIX,
  CAPABILITY_LINT_FINDING_BRIDGE_FINDING_ID_PREFIX,
  buildCapabilityLintFindingBridgeReport,
} from "./capability-lint-finding-bridge.js";

export {
  type BuildFindingReportWritePreviewInput,
  type FindingReportWritePreview,
  type FindingReportWritePreviewFinding,
  type FindingReportWritePreviewSkipped,
  FINDING_REPORT_WRITE_PREVIEW_CATEGORY,
  FINDING_REPORT_WRITE_PREVIEW_SOURCE,
  buildFindingReportWritePreview,
} from "./finding-report-write-preview.js";

export {
  type BridgeFindingLifecycleFindingLike,
  type BridgeFindingLifecycleFindingReportLike,
  type BuildBridgeFindingLifecycleIntegrationReportInput,
  BRIDGE_DERIVED_FINDING_SOURCE,
  BRIDGE_DERIVED_FINDING_TYPE,
  BRIDGE_FINDING_LIFECYCLE_INTEGRATION_ARTIFACT_ID_PREFIX,
  buildBridgeFindingLifecycleIntegrationReport,
  isBridgeDerivedFinding,
} from "./bridge-finding-lifecycle-integration.js";

export {
  type BuildStepCapabilityGraphInput,
  type StepCapabilityGraphCapabilityMapLike,
  type StepCapabilityGraphConfig,
  type StepCapabilityGraphConfigStep,
  type StepCapabilityGraphEvidenceGraphLike,
  type StepCapabilityGraphPhraseReportLike,
  STEP_CAPABILITY_GRAPH_ARTIFACT_ID_PREFIX,
  STEP_CAPABILITY_GRAPH_CONFIG_PATH,
  buildStepCapabilityGraph,
  parseStepCapabilityGraphConfig,
} from "./step-capability-graph.js";

export {
  type BuildHandoffContractInput,
  type HandoffContractConfig,
  type HandoffContractConfigCapability,
  type HandoffContractConfigHandoff,
  type HandoffContractStepGraphLike,
  HANDOFF_CONTRACT_ARTIFACT_ID_PREFIX,
  HANDOFF_CONTRACT_CONFIG_PATH,
  buildHandoffContract,
  parseHandoffContractConfig,
} from "./handoff-contract.js";

export {
  type BuildHandoffCoverageReportInput,
  type HandoffCoverageContractLike,
  type ParseHandoffEventLogResult,
  type ParsedHandoffEvent,
  HANDOFF_COVERAGE_REPORT_ARTIFACT_ID_PREFIX,
  HANDOFF_EVENT_KIND,
  HANDOFF_EVENT_LOG_PATH,
  buildHandoffCoverageReport,
  parseHandoffEventLog,
} from "./handoff-coverage-report.js";

export {
  type BuildRuntimeGraphObservationReportInput,
  type ParseRuntimeGraphObservationEventLogResult,
  type ParsedRuntimeGraphObservationEvent,
  RUNTIME_GRAPH_OBSERVATION_ARTIFACT_ID_PREFIX,
  RUNTIME_GRAPH_OBSERVATION_EVENT_KIND,
  RUNTIME_GRAPH_OBSERVATION_EVENT_LOG_PATH,
  buildRuntimeGraphObservationReport,
  parseRuntimeGraphObservationEventLog,
} from "./runtime-graph-observation-report.js";

export {
  type BuildRuntimeGraphDriftReportInput,
  type RuntimeGraphDriftCoverageReportLike,
  type RuntimeGraphDriftHandoffContractLike,
  type RuntimeGraphDriftObservationReportLike,
  type RuntimeGraphDriftStepGraphLike,
  RUNTIME_GRAPH_DRIFT_REPORT_ARTIFACT_ID_PREFIX,
  buildRuntimeGraphDriftReport,
} from "./runtime-graph-drift-report.js";

export {
  type BuildIntentAssessmentReportInput,
  type IntentAssessmentCapabilityMapLike,
  type IntentAssessmentHandoffCoverageReportLike,
  type IntentAssessmentPathFreshnessReportLike,
  type IntentAssessmentRuntimeDriftReportLike,
  type IntentAssessmentStepGraphLike,
  type IntentAssessmentVerificationResultLike,
  INTENT_ASSESSMENT_REPORT_ARTIFACT_ID_PREFIX,
  buildIntentAssessmentReport,
} from "./intent-assessment-report.js";

export {
  type BuildPreparedIntentPlanInput,
  type PreparedIntentActionabilityReportLike,
  type PreparedIntentAssessmentReportLike,
  type PreparedIntentCapabilityMapLike,
  type PreparedIntentHandoffCoverageReportLike,
  type PreparedIntentPathFreshnessReportLike,
  type PreparedIntentRuntimeDriftReportLike,
  type PreparedIntentStepGraphLike,
  type PreparedIntentVerificationResultLike,
  PREPARED_INTENT_PLAN_ARTIFACT_ID_PREFIX,
  buildPreparedIntentPlan,
} from "./prepared-intent-plan.js";

export {
  type BuildIntentStatusReportInput,
  type IntentStatusAssessmentLike,
  type IntentStatusPreparedPlanLike,
  type IntentStatusWorkOrderLike,
  type IntentStatusVerificationPlanLike,
  type IntentStatusVerificationRunLike,
  type IntentStatusVerificationResultLike,
  type IntentStatusPathFreshnessLike,
  type IntentStatusRuntimeDriftLike,
  type IntentStatusHandoffCoverageLike,
  INTENT_STATUS_REPORT_ARTIFACT_ID_PREFIX,
  buildIntentStatusReport,
} from "./intent-status-report.js";

export {
  type BuildApprovedPreparedIntentPlanInput,
  type IntentApprovalAcceptedGap,
  type IntentApprovalBlocker,
  type IntentApprovalBlockerCategory,
  type IntentApprovalIntentStatusLike,
  type IntentApprovalPathFreshnessLike,
  type IntentApprovalResult,
  type IntentApprovalRuntimeDriftLike,
  type IntentApprovalSourcePlanLike,
  buildApprovedPreparedIntentPlan,
} from "./intent-approval.js";

export {
  type BuildWorkReadyIntentStatusReportInput,
  type IntentStatusTransitionBlocker,
  type IntentStatusTransitionBlockerCategory,
  type IntentStatusTransitionFreshnessLike,
  type IntentStatusTransitionPreparedPlanLike,
  type IntentStatusTransitionPreviousStatusLike,
  type IntentStatusTransitionResult,
  type IntentStatusTransitionRuntimeDriftLike,
  INTENT_STATUS_TRANSITION_TARGETS,
  buildWorkReadyIntentStatusReport,
} from "./intent-status-transition.js";

export {
  type BuildIntentPlanActionabilityReportInput,
  type BuildAnsweredIntentPlanActionabilityReportInput,
  type IntentPlanAnswerBlocker,
  type IntentPlanAnswerBlockerCategory,
  type IntentPlanAnswerInput,
  type IntentPlanAnswerResult,
  type IntentPlanSemanticMode,
  type IntentPlanSemanticNormalizationAdapter,
  type IntentPlanSemanticNormalizationInput,
  type IntentPlanSemanticNormalizationResult,
  INTENT_PLAN_ACTIONABILITY_REPORT_ARTIFACT_ID_PREFIX,
  buildAnsweredIntentPlanActionabilityReport,
  buildIntentPlanActionabilityReport,
} from "./intent-plan-actionability-report.js";

export {
  type BuildSemanticFileUnderstandingReportInput,
  type SemanticFileUnderstandingAdapter,
  type SemanticFileUnderstandingAdapterResult,
  SEMANTIC_FILE_UNDERSTANDING_REPORT_ARTIFACT_ID_PREFIX,
  buildSemanticFileUnderstandingReport,
} from "./semantic-file-understanding-report.js";

export {
  type SemanticFileUnderstandingReportLike,
  type SemanticFileContextReport,
  type SemanticFileContextStaleReason,
  type SemanticFileContextStaleWarning,
  type SemanticFileContextSelection,
  normalizeSemanticContextPath,
  selectSemanticFileContext,
  summarizeSemanticFileContext,
} from "./semantic-file-context.js";

export {
  type BuildIntentWorkOrderHandoffInput,
  type IntentWorkOrderGenerationResult,
  type IntentWorkOrderGenerationBlocker,
  type IntentGeneratedWorkOrder,
  type IntentWorkOrderPreparedPlanLike,
  type IntentWorkOrderStatusReportLike,
  type IntentWorkOrderPathFreshnessLike,
  type IntentWorkOrderRuntimeDriftLike,
  INTENT_WORK_ORDER_ARTIFACT_ID_PREFIX,
  buildIntentWorkOrderHandoff,
} from "./intent-work-order-handoff.js";

export {
  type BuildIntentVerificationPlanHandoffInput,
  type IntentVerificationPlanHandoffResult,
  type IntentVerificationPlanHandoffBlocker,
  type IntentVerificationPlanHandoffBoundary,
  type IntentVerificationPlanRequirementMapping,
  type IntentVerificationPlanCommandSafety,
  type IntentGeneratedVerificationPlan,
  type IntentVerificationPlanPreparedPlanLike,
  type IntentVerificationPlanStatusReportLike,
  type IntentVerificationPlanWorkOrderLike,
  type IntentVerificationPlanPathFreshnessLike,
  type IntentVerificationPlanRuntimeDriftLike,
  INTENT_VERIFICATION_PLAN_ARTIFACT_ID_PREFIX,
  INTENT_VERIFICATION_PLAN_ALLOWED_STATUSES,
  buildIntentVerificationPlanHandoff,
  classifyVerificationCommand,
} from "./intent-verification-plan-handoff.js";

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
    // Optional: latest CapabilityPhraseReport for the
    // additive CapabilityMap v2 projection. Absence is
    // fine — v2 fields stay omitted and the projector
    // emits a clean v1-shape CapabilityMap.
    const phraseReportRef = await latestPhraseReportRef(artifacts);
    const phraseReport = phraseReportRef
      ? (await artifacts.read(phraseReportRef) as PhraseReportLike)
      : undefined;
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
    // Flat file index for graph-aware filters. Sourced from
    // `kind: "file"` evidence facts. `createObservedRepo` will
    // re-sort, dedupe, drop `.rekon/` paths, and drop absolute
    // paths at the kernel boundary; we just collect candidates
    // here.
    const fileFacts = graph.facts
      .filter((fact) => fact.kind === "file")
      .map((fact) => {
        const fromValue
          = typeof fact.value?.path === "string" ? fact.value.path : undefined;
        return fromValue ?? fact.subject;
      })
      .filter((path): path is string => typeof path === "string" && path.length > 0);
    // CapabilityMap inputRefs include the optional
    // CapabilityPhraseReport when it is consumed; the
    // ObservedRepo / OwnershipMap headers stay v1-only.
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
    const capabilityMapInputRefs = phraseReportRef
      ? [evidenceRef, phraseReportRef]
      : [evidenceRef];
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
      files: fileFacts,
    });
    const ownershipMap = createOwnershipMap({
      header: {
        ...baseHeader,
        artifactType: "OwnershipMap",
        artifactId: `ownership-map-${Date.now()}`,
      },
      entries: ownershipEntries,
    });
    const phraseBackedAdditions = buildPhraseBackedCapabilityMapAdditions({
      phraseReport,
      phraseReportRef,
    });
    const capabilityMap = createCapabilityMap({
      header: {
        ...baseHeader,
        artifactType: "CapabilityMap",
        artifactId: `capability-map-${Date.now()}`,
        inputRefs: capabilityMapInputRefs,
      },
      entries: capabilityEntries,
      ...phraseBackedAdditions,
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
    consumes: ["EvidenceGraph", "CapabilityPhraseReport"],
    produces: ["ObservedRepo", "OwnershipMap", "CapabilityMap"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "evidence.changed",
        description: "Repository model projections are invalid when the evidence graph changes.",
        inputs: ["EvidenceGraph"],
      },
      {
        id: "capability-phrases.changed",
        description: "CapabilityMap is stale when the consumed CapabilityPhraseReport changes (additive v2 fields).",
        inputs: ["CapabilityPhraseReport"],
      },
    ],
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

async function latestPhraseReportRef(artifacts: {
  list?: (type?: string) => Promise<ArtifactRef[]>;
} & { read(ref: ArtifactRef): Promise<unknown> }): Promise<ArtifactRef | undefined> {
  if (!artifacts.list) {
    return undefined;
  }
  try {
    const refs = await artifacts.list("CapabilityPhraseReport");
    return refs.at(-1);
  } catch {
    // Older runtimes may not know the CapabilityPhraseReport
    // type. Absence is benign — v2 fields stay omitted.
    return undefined;
  }
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

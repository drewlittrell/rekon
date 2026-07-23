#!/usr/bin/env node

import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { access, lstat, mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import docsCapability, {
  GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER,
  GitHubCheckPublishError,
  PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER,
  PR_COMMENT_PUBLISHER_MARKER,
  PrCommentPublishError,
  assessGitHubCheckPublisherReadiness,
  assessPrCommentPublisherReadiness,
  buildGitHubCheckPayload,
  buildIntentPlanBundle,
  buildPrCommentBody,
  isSafeBundleRelativePath,
  publishGitHubCheckRun,
  publishPrCommentRun,
  type GitHubCheckPublishResult,
  type GitHubCheckPublisherReadiness,
  type GitHubCheckPublisherReadinessEvent,
  type GitHubCheckPublisherRunStatus,
  type IntentPlanBundleSource,
  type PrCommentBody,
  type PrCommentPublishResult,
  type PrCommentPublisherReadiness,
  type PrCommentPublisherReadinessEvent,
} from "@rekon/capability-docs";
import graphCapability from "@rekon/capability-graph";
import intentCapability, {
  comparePathFreshness,
  createPathFreshnessReport,
  createVerificationResult,
  createVerificationRun,
  createVerificationRunSourceState,
  lookupVerificationEvidence,
  type PathFreshnessReport,
  type SourceStateFingerprint,
  type VerificationCommandResult,
  type VerificationEvidenceSummary,
  type VerificationPlanLike,
  type VerificationPlanCoverage,
  type VerificationResult,
  type VerificationRun,
  type VerificationRunCommand,
} from "@rekon/capability-intent";
import verifyCapability, {
  createIsolatedCoverageVerificationPlan,
  createVerificationRunDryRun,
  deriveVerificationResultFromRun,
  executeVerificationRun,
  redactVerificationRunStreamText,
  type VerificationRun as VerificationRunArtifact,
  type VerificationRunCommandValidationIssue,
  type VerificationRunDryRunResult,
  type VerificationRunSafetySummary,
  type IsolatedCoverageFramework,
  type IsolatedCoverageProvider,
  validateVerificationRun,
  VERIFY_CAPABILITY_ID,
  VERIFY_CAPABILITY_VERSION,
} from "@rekon/capability-verify";
import jsTsCapability, {
  extractErrorControlFlowEvidence,
  extractOptionPropagationEvidence,
  extractScopeResolutionEvidence,
  loadAgentScratchSegments,
} from "@rekon/capability-js-ts";
import pythonCapability from "@rekon/capability-python";
import memoryCapability, { readGroundedMemoryForTask } from "@rekon/capability-memory";
import modelCapability, {
  buildBridgeFindingLifecycleIntegrationReport,
  buildCapabilityArchitectureLintReport,
  buildCapabilityLintFindingBridgeReport,
  buildFindingReportWritePreview,
  buildCapabilityContract,
  buildRepositoryIntelligenceGraph,
  buildRepositoryContractProjection,
  buildRepositoryContractJudgmentPrompt,
  buildRepositoryContractDriftReport,
  buildTaskPact,
  coerceRepositoryContractJudgmentDrafts,
  discoverRepositoryContractCandidates,
  type RepositoryContractVerificationEvidence,
  type RepositoryContractVerificationInventory,
  REPOSITORY_CONTRACT_JUDGMENT_JSON_SCHEMA,
  REPOSITORY_CONTRACT_JUDGMENT_PROMPT_VERSION,
  buildStepCapabilityGraph,
  parseStepCapabilityGraphConfig,
  buildHandoffContract,
  parseHandoffContractConfig,
  buildHandoffCoverageReport,
  HANDOFF_CONTRACT_ARTIFACT_ID_PREFIX,
  HANDOFF_CONTRACT_CONFIG_PATH,
  HANDOFF_COVERAGE_REPORT_ARTIFACT_ID_PREFIX,
  HANDOFF_EVENT_LOG_PATH,
  buildRuntimeGraphObservationReport,
  parseIstanbulCoverage,
  parseLcovCoverage,
  parseEslintJsonReport,
  parseJUnitReport,
  parseNpmAuditReport,
  parseOsvScannerReport,
  parsePnpmAuditReport,
  parseSarifSecurityReport,
  parseYarnAuditReport,
  buildRuntimeGraphDriftReport,
  buildIntentAssessmentReport,
  selectSemanticFileContext,
  summarizeSemanticFileContext,
  type SemanticFileUnderstandingReportLike,
  type SemanticFileContextSelection,
  RUNTIME_GRAPH_OBSERVATION_ARTIFACT_ID_PREFIX,
  RUNTIME_GRAPH_OBSERVATION_EVENT_LOG_PATH,
  RUNTIME_GRAPH_DRIFT_REPORT_ARTIFACT_ID_PREFIX,
  INTENT_ASSESSMENT_REPORT_ARTIFACT_ID_PREFIX,
  PREPARED_INTENT_PLAN_ARTIFACT_ID_PREFIX,
  buildPreparedIntentPlan,
  type PreparedIntentActionabilityReportLike,
  type PreparedIntentAssessmentReportLike,
  type PreparedIntentHandoffCoverageReportLike,
  type PreparedIntentRuntimeDriftReportLike,
  type PreparedIntentPathFreshnessReportLike,
  type PreparedIntentVerificationResultLike,
  INTENT_STATUS_REPORT_ARTIFACT_ID_PREFIX,
  buildIntentStatusReport,
  buildIntentPlanActionabilityReport,
  buildAnsweredIntentPlanActionabilityReport,
  type IntentPlanAnswerInput,
  buildApprovedPreparedIntentPlan,
  type IntentApprovalSourcePlanLike,
  type IntentApprovalIntentStatusLike,
  type IntentApprovalPathFreshnessLike,
  type IntentApprovalRuntimeDriftLike,
  buildWorkReadyIntentStatusReport,
  type IntentStatusTransitionPreparedPlanLike,
  type IntentStatusTransitionPreviousStatusLike,
  type IntentStatusTransitionFreshnessLike,
  type IntentStatusTransitionRuntimeDriftLike,
  type IntentStatusAssessmentLike,
  type IntentStatusPreparedPlanLike,
  type IntentStatusWorkOrderLike,
  type IntentStatusVerificationRunLike,
  type IntentStatusVerificationResultLike,
  type IntentStatusPathFreshnessLike,
  type IntentStatusRuntimeDriftLike,
  type IntentStatusHandoffCoverageLike,
  INTENT_WORK_ORDER_ARTIFACT_ID_PREFIX,
  buildIntentWorkOrderHandoff,
  type IntentWorkOrderPreparedPlanLike,
  type IntentWorkOrderStatusReportLike,
  type IntentWorkOrderPathFreshnessLike,
  type IntentWorkOrderRuntimeDriftLike,
  INTENT_VERIFICATION_PLAN_ARTIFACT_ID_PREFIX,
  buildIntentVerificationPlanHandoff,
  type IntentVerificationPlanPreparedPlanLike,
  type IntentVerificationPlanStatusReportLike,
  type IntentVerificationPlanWorkOrderLike,
  type IntentVerificationPlanPathFreshnessLike,
  type IntentVerificationPlanRuntimeDriftLike,
  type HandoffCoverageContractLike,
  type RuntimeGraphDriftStepGraphLike,
  type RuntimeGraphDriftHandoffContractLike,
  type RuntimeGraphDriftCoverageReportLike,
  type RuntimeGraphDriftObservationReportLike,
  type IntentAssessmentCapabilityMapLike,
  type IntentAssessmentStepGraphLike,
  type IntentAssessmentHandoffCoverageReportLike,
  type IntentAssessmentRuntimeDriftReportLike,
  type IntentAssessmentPathFreshnessReportLike,
  type IntentAssessmentVerificationResultLike,
  STEP_CAPABILITY_GRAPH_ARTIFACT_ID_PREFIX,
  STEP_CAPABILITY_GRAPH_CONFIG_PATH,
  type BridgeFindingLifecycleFindingReportLike,
  type CapabilityContractConfig,
  type HandoffContractConfig,
  type HandoffContractStepGraphLike,
  type StepCapabilityGraphCapabilityMapLike,
  type StepCapabilityGraphConfig,
  type StepCapabilityGraphEvidenceGraphLike,
  type StepCapabilityGraphPhraseReportLike,
  type IntentPlanSemanticNormalizationAdapter,
  type SemanticFileUnderstandingAdapter,
  type SemanticFileUnderstandingAdapterResult,
  type SemanticDebtAdapterResult,
  type SemanticDebtJudgmentAdapter,
  buildSemanticFileUnderstandingReport,
  buildSemanticDebtJudgmentPrompt,
  coerceDebtConcerns,
  SEMANTIC_DEBT_JUDGMENT_JSON_SCHEMA,
  SEMANTIC_DEBT_PROMPT_VERSION,
  SEMANTIC_DEBT_COERCION_VERSION,
  SEMANTIC_DEBT_ELIGIBILITY_VERSION,
  SEMANTIC_DEBT_MAX_PROMPT_CHARS,
  evaluateSemanticDebtEligibility,
  SEMANTIC_FILE_UNDERSTANDING_REPORT_ARTIFACT_ID_PREFIX,
  buildCapabilityEvidenceGraph,
  selectSemanticReportsForGraph,
  type SemanticReportForGraph,
  buildEmbeddingChunks,
  buildClaimedContextUsageEvent,
  buildContextUsageEvent,
  classifyEmbeddingChunks,
  computeEmbeddingIndexKey,
  embeddingVectorRef,
  embeddingChunkGraphRef,
  cosineSimilarity,
  findEmbeddingNeighbors,
  classifyEmbeddingSimilarityScore,
  EMBEDDING_POLICY_VERSION,
  type EmbeddingChunkRef,
  type EmbeddingIndexRecord,
  type EmbeddingSimilarityForGraph,
  type EmbeddingNeighborSearchStats,
  type EvidenceGraphForChunks,
  type EvidenceGraphForCapabilityGraph,
  compileTaskContext,
  excludeStaleTaskContextSourceEvidence,
  classifyTaskOperation,
  projectModelContext,
  projectModelContextDelivery,
  renderTaskContextMarkdown,
  type ContextProfile,
  type TaskOperationEscalation,
  type TaskOperationFlow,
  type TaskOperationPlan,
  selectLexicalGraphContextPaths,
  selectTaskContextRefinement,
  selectTaskContractGuidance,
  TASK_CONTEXT_REFINEMENT_RELATIONSHIPS,
  type TaskContextRefinementRelationship,
  type TaskContextGraphLike,
  type TaskContextRetrievalResultLike,
  selectTaskContextReports,
  summarizeTaskContext,
  type TaskContextReportLike,
  type TaskContextSelection,
  type BuildRepositoryIntelligenceGraphInput,
  type RepositoryContractJudgmentDraftCitation,
  type ChangeValidationResult,
  type ChangeModelJudgment,
  type ChangePlacementVerificationEvidence,
  type ChangeRuntimeEvidence,
  type ChangeVerificationCandidate,
  type ChangeVerificationDiagnostic,
  type ChangeVerificationEvidence,
  validateChange,
} from "@rekon/capability-model";
import {
  RekonLlmRouter,
  coercePhaseDrafts,
  createAnthropicLlmProvider,
  createOpenAiLlmProvider,
  createOpenAiResponsesLlmProvider,
  createVoyageEmbeddingProvider,
  areVoyageEmbeddingModelsCompatible,
  VOYAGE_DEFAULT_MODEL,
  VOYAGE_DEFAULT_DIMENSIONS,
  type RekonEmbeddingProvider,
} from "@rekon/llm-provider";
import policyCapability, {
  ASSESSMENT_JUDGMENT_COERCION_VERSION,
  ASSESSMENT_JUDGMENT_PROMPT_VERSION,
  readCurrentRepoSource,
} from "@rekon/capability-policy";
import reconcileCapability, {
  buildReconciliationPreview,
  type ReconciliationPlan,
  type ReconciliationPreview,
  type ReconciliationPreviewOperation,
} from "@rekon/capability-reconcile";
import ontologyCapability, {
  appendCapabilityNormalizationReviewDecision,
  buildCapabilityNormalizationReport,
  buildCapabilityOntologySuggestionReport,
  buildCapabilityPhraseReport,
  buildDecidedKeySet,
  compileEffectiveCapabilityOntology,
  DEFAULT_REVIEW_SUGGESTION_LIMIT,
  detectOverlayPacks,
  loadCapabilityOntologyConfig,
  suggestUnknownTerms,
  validateCapabilityNormalizationReviewLedger,
  type CapabilityNormalizationReport,
  type CapabilityNormalizationReviewDecision,
  type CapabilityNormalizationReviewEntry,
  type CapabilityNormalizationReviewLedger,
  type CapabilityNormalizationReviewSuggestion,
  type CapabilityNormalizationReviewTermKind,
  type CapabilityOntologySuggestionReport,
  type CapabilityPhraseReport,
  type EffectiveCapabilityOntology,
} from "@rekon/capability-ontology";
import resolverCapability, {
  buildPreflightPacket,
  type PreflightPacket,
} from "@rekon/capability-resolver";
import {
  type ArtifactFreshnessEntry,
  type ArtifactFreshnessResult,
  type ArtifactFreshnessStatus,
  type ArtifactIndexEntry,
  buildCoherencyDelta,
  buildFindingFilterHealthReport,
  buildFindingFilterPolicySuggestionReport,
  buildFindingFilterReport,
  buildFindingLifecycleReport,
  buildIssueAdjudicationReport,
  createLocalArtifactStore,
  createRuntime,
  recordIssueMergeDecision,
  validateArtifactFreshness,
  validateArtifactIndex,
  loadRepositoryContractSources,
  writeRepositoryContractSource,
} from "@rekon/runtime";
import {
  createSourceStateBinding,
  digestJson,
  type ArtifactHeader,
  type ArtifactRef,
  type SourceStateBinding,
  type SourceStateFile,
  validateSourceStateBinding,
} from "@rekon/kernel-artifacts";
import {
  createRulebook,
  validateRulebook,
  type Rule,
  type Rulebook,
} from "@rekon/kernel-rulebook";
import {
  attachContextUsageRefToTaskContextResponse,
  buildChangeValidationResponse,
  buildChangeValidationUnavailable,
  compileRiskAdaptiveContextForTaskForHost,
  runMcpServer,
  TASK_CONTEXT_REFINEMENT_INSTRUCTION,
  type SourceRef,
} from "@rekon/mcp";
import { buildDocsFreshnessReport, renderDocsIndex } from "@rekon/capability-docs";
import {
  IntentArtifactLineageError,
  resolveIntentStatusLineage,
} from "./intent-lineage.js";
import {
  buildSourceStateFingerprint,
  DEFAULT_SOURCE_FINGERPRINT_IGNORE,
  type BridgeFindingLifecycleIntegrationReport,
  type CapabilityArchitectureLintReport,
  type CapabilityContract,
  type CapabilityLintFindingBridgeReport,
  type CapabilityMap,
  type HandoffContract,
  type HandoffCoverageReport,
  type RuntimeGraphObservationReport,
  type RuntimeGraphDriftReport,
  type IntentAssessmentReport,
  type IntentAssessmentRequest,
  type IntentAssessmentIntentKind,
  type IntentAssessmentScope,
  type IntentPlanActionabilityReport,
  type PreparedIntentPlan,
  type ObservedRepo,
  type OwnershipMap,
  createSemanticDebtJudgmentReport,
  type SemanticDebtJudgmentEntry,
  type SemanticDebtJudgmentReport,
  type SecurityScanReport,
  type DependencyAuditReport,
  type LintReport,
  type TestReport,
  type StepCapabilityGraph,
  type CapabilityEvidenceGraph,
  type ContractAdoptionOperation,
  type ContractCandidateReport,
  type ContractJudgmentCitation,
  type ContractJudgmentReport,
  type ContractDriftReport,
  type EffectiveContractRegistry,
  type FlowContractSource,
  type FlowContract,
  type PlacementVerificationReport,
  type ProofGateReport,
  type RepositoryContractSourceDocument,
  type SystemContractSource,
  type SystemContract,
  type TaskContextReport,
  type TaskPact,
  type ContextUsageEvent,
  type ContextUsageClaimDisposition,
  type OutcomeEvent,
  assertContractCandidateReport,
  assertContractJudgmentReport,
  assertContextUsageEvent,
  assertOutcomeEvent,
  assertPlacementVerificationReport,
  assertTaskContextReport,
  assertTaskPact,
  createContractAdoptionReport,
  createContractJudgmentReport,
  createContextTaskIdentity,
  createEffectiveContractRegistry,
  createOutcomeEvent,
  createProofGateReport,
  assertProofGateReport,
  validateRuntimeGraphObservationReport,
  INTENT_TASK_KINDS,
  isIntentTaskKind,
} from "@rekon/kernel-repo-model";
import {
  createAssessmentJudgmentReport,
  isAssessmentLifecycleState,
  type Assessment,
  type AssessmentJudgment,
  type AssessmentJudgmentReport,
  type AssessmentReport,
} from "@rekon/kernel-assessments";
import { type CapabilityDefinition, type CapabilityPermission } from "@rekon/sdk";
import {
  type FindingReport,
  type FindingFilterHealthReport,
  type FindingFilterPolicyApplyPlan,
  type FindingFilterPolicyFingerprint,
  type FindingFilterPolicyRule,
  type FindingFilterPolicySuggestion,
  type FindingFilterPolicySuggestionReport,
  type FindingFilterReport,
  type FindingResultFilterOptions,
  type FindingStatusDecision,
  type FindingStatusDecisionReason,
  type FindingStatusDecisionStatus,
  type FindingStatusLedger,
  type CoherencyDelta,
  type IssueAdjudicationReport,
  type IssueMergeCandidateView,
  type IssueMergeDecision,
  type IssueMergeDecisionLedger,
  type IssueMergeDecisionReason,
  applyIssueMergeDecisionsToCandidates,
  buildIssueMergeCandidateViews,
  detectIssueMergeRollupFreshness,
  fingerprintFindingFilterPolicies,
  findLatestIssueMergeDecision,
  isBroadFindingFilterPolicyRule,
  planFindingFilterPolicyApply,
  summarizeFindingFilterPolicyStatus,
  validateFindingFilterPolicyRules,
  validateFindingResultFilterOptions,
  createFindingStatusLedger,
  createFindingReport,
} from "@rekon/kernel-findings";
import {
  ASSESSMENT_JUDGMENT_JSON_SCHEMA,
  buildAssessmentJudgmentPrompt,
  coerceAssessmentJudgment,
  judgmentWithoutSource,
  selectAssessmentJudgmentCandidates,
  type AssessmentJudgmentAdapterResult,
  type AssessmentJudgmentSourceContext,
} from "./assessment-judgment.js";
import {
  SEMANTIC_FILE_UNDERSTANDING_JSON_SCHEMA,
  SEMANTIC_FILE_UNDERSTANDING_PROMPT_VERSION,
  buildSemanticFileUnderstandingPrompt,
} from "./semantic-file-understanding.js";
import {
  checkAgentInstructions,
  removeAgentInstructions,
  syncAgentInstructions,
  type AgentInstructionsOptions,
} from "./agent-instructions.js";
import {
  assessTaskContextFreshness,
  type TaskContextFreshnessAssessment,
} from "./task-context-freshness.js";
import {
  captureRepositorySourceState,
  collectRepositoryChangeEvidence,
} from "./change-validation-host.js";

// Protected agent-instruction filenames. Declared at the top of the module so
// they are initialized before `main()` runs synchronously during module
// evaluation. Async functions execute their body synchronously up to the
// first `await`, and `isProtectedAgentDocPath` is called inside
// `runAgentContractExport` before any `await` — so these consts must be
// initialized before the IIFE-style `main()` invocation below.
const PROTECTED_AGENT_DOC_BASENAMES = new Set(["agents.md", "claude.md"]);

const PROTECTED_AGENT_DOC_RELATIVE_PATTERNS: ReadonlyArray<RegExp> = [
  /^\.cursor\/rules\/[^/]+\.md$/i,
  /^\.github\/copilot-instructions\.md$/i,
];

// Top-of-module to avoid TDZ when called during main()'s synchronous
// prefix (before the first await in command dispatches that read flags
// up front, e.g. `issues merge decide`).
const ISSUE_MERGE_DECISION_REASONS = new Set<string>([
  "same-root-cause",
  "separate-issues",
  "false-positive-candidate",
  "other",
]);

// Embedding Provider / Index v1 (slice 159). Top-of-module (like
// ISSUE_MERGE_DECISION_REASONS above) to avoid a TDZ when `embeddings query`
// reads `MOCK_EMBEDDING_DIMENSIONS` in its synchronous flag-parsing prefix
// (before its first await), since main() is invoked during module evaluation.
// GRAPH_EMBEDDING_* bound the per-source neighbor claims folded into
// `capability graph build --embedding-similarity latest` (proposal/context,
// never proof); MOCK_EMBEDDING_DIMENSIONS is the offline `mock` provider's
// default width (real `voyage` uses VOYAGE_DEFAULT_DIMENSIONS).
const GRAPH_EMBEDDING_NEIGHBOR_TOP_K = 5;
const GRAPH_EMBEDDING_NEIGHBOR_FLOOR = 0.5;
const MOCK_EMBEDDING_DIMENSIONS = 64;
// `embeddings query` top-k policy (Embedding Retrieval / Similarity Ranking
// Decision, slice 163): default 8, capped at 20. Top-of-module (read in the
// `embeddings query` synchronous flag-parsing prefix, before its first await).
const DEFAULT_QUERY_TOP_K = 8;
const MAX_QUERY_TOP_K = 20;

if (isMainEntry()) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    if (error instanceof IntentArtifactLineageError) {
      if (process.argv.includes("--json")) {
        console.error(JSON.stringify({ error: { code: error.code, message: error.message, details: error.details } }, null, 2));
      } else {
        console.error(`${error.code}: ${error.message}`);
      }
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }
    process.exitCode = 1;
  });
}

function isMainEntry(): boolean {
  const entryArg = process.argv[1];

  if (!entryArg) {
    return false;
  }

  const modulePath = fileURLToPath(import.meta.url);

  try {
    return realpathSync(entryArg) === modulePath;
  } catch {
    return false;
  }
}

type IntentContextStepResult = {
  id: string;
  command: string;
  status: "passed" | "failed";
  message?: string;
};

/**
 * Build the intent-readiness context substrate (`StepCapabilityGraph`,
 * `HandoffContract`, `RuntimeGraphObservationReport`, `RuntimeGraphDriftReport`,
 * `HandoffCoverageReport`) by running the existing producer commands in
 * dependency order. Best-effort: a failing producer is recorded and the rest
 * continue. Reuses the existing command logic (no duplicated builder wiring);
 * mutates nothing outside `.rekon/`. On a repo with no runtime/handoff event
 * log, the runtime/handoff producers write explicit not-evaluated context, NOT
 * false success.
 */
async function prepareIntentContext(root: string): Promise<IntentContextStepResult[]> {
  const steps: Array<{ id: string; argv: string[] }> = [
    { id: "step-capability-graph", argv: ["step", "graph", "build"] },
    { id: "handoff-contract", argv: ["handoff", "contract", "build"] },
    { id: "runtime-graph-observation", argv: ["runtime", "graph", "observe"] },
    { id: "runtime-graph-drift", argv: ["runtime", "graph", "drift"] },
    { id: "handoff-coverage-report", argv: ["handoff", "coverage", "report"] },
  ];
  const results: IntentContextStepResult[] = [];
  const originalLog = console.log;
  const priorExitCode = process.exitCode;
  for (const step of steps) {
    const command = `rekon ${step.argv.join(" ")}`;
    let status: "passed" | "failed" = "passed";
    let message: string | undefined;
    // Suppress each sub-command's own stdout; this orchestrator emits one summary.
    console.log = () => {};
    try {
      await main([...step.argv, "--root", root, "--json"]);
      if (typeof process.exitCode === "number" && process.exitCode !== 0) {
        status = "failed";
        message = "producer reported a non-zero exit";
      }
    } catch (error) {
      status = "failed";
      message = messageOf(error);
    } finally {
      console.log = originalLog;
      // Best-effort: never let a producer's exit code fail the orchestrator/caller.
      process.exitCode = priorExitCode;
    }
    results.push({ id: step.id, command, status, ...(message ? { message } : {}) });
  }
  return results;
}

// ---- Setup / Welcome UI helpers (slice 118) ----
// Non-interactive-safe branding. Per the Rekon Install / Setup / ASCII Art UX
// Decision: `--json` and `REKON_NO_BANNER` disable the banner, `NO_COLOR`
// disables color, non-TTY disables the big banner by default, and no command
// here prompts, executes commands, writes source, runs Circe, or implements
// intent:go. ASCII art never appears in `--json` output.
function isTruthyEnvFlag(value: string | undefined): boolean {
  return typeof value === "string" && value !== "" && value !== "0" && value.toLowerCase() !== "false";
}

function shouldUseColor(env: NodeJS.ProcessEnv, stdoutIsTTY: boolean): boolean {
  // NO_COLOR convention: any presence disables color.
  if (env.NO_COLOR !== undefined) return false;
  return stdoutIsTTY === true;
}

function shouldShowBanner(options: { json: boolean; noBanner: boolean; stdoutIsTTY: boolean; env: NodeJS.ProcessEnv }): boolean {
  if (options.json) return false;
  if (options.noBanner) return false;
  if (isTruthyEnvFlag(options.env.REKON_NO_BANNER)) return false;
  return options.stdoutIsTTY === true;
}

function renderRekonBanner(): string {
  return [
    "╔═══════════════════════════════════════╗",
    "║  R E K O N                            ║",
    "║  Scan → Snapshot → Act                ║",
    "╚═══════════════════════════════════════╝",
  ].join("\n");
}

function renderRekonCompactMark(): string {
  return [
    "┌─ Rekon ─────────────────────────────┐",
    "│ scan → snapshot → act               │",
    "└─────────────────────────────────────┘",
  ].join("\n");
}

// Branding prefix for human (non-`--json`) output. Returns the big banner in an
// interactive TTY, the compact mark in a non-TTY human context, or an empty
// string when branding is suppressed (`--json`, `--no-banner`, or
// `REKON_NO_BANNER`). Never emits ANSI color.
function rekonBrandPrefix(options: { json: boolean; noBanner: boolean; stdoutIsTTY: boolean; env: NodeJS.ProcessEnv }): string {
  if (options.json) return "";
  if (options.noBanner || isTruthyEnvFlag(options.env.REKON_NO_BANNER)) return "";
  return shouldShowBanner(options) ? renderRekonBanner() : renderRekonCompactMark();
}

// A hoisted function (not a module `const`) so it is safe to call from `main()`,
// which is invoked synchronously during module load before module-level `const`
// initializers run (the welcome branch has no preceding await).
function rekonIntentWorkflow(): string[] {
  return [
    "rekon scan",
    "rekon intent context prepare",
    "rekon context task --task <text> [--path <path>] [--profile compact|standard|deep] [--escalation validation-failed] [--provider voyage|mock] [--model <m>] [--top-k <n>] [--no-auto-refresh] [--root <path>] [--json]",
    "rekon context refine --question <text> --target <source-identifier> --relationship dependency|dependent|test|contract|consumer|producer|implementation (--anchor-path <path> | --anchor-symbol <path#symbol>) [--already-read <path>] [--limit <1..8>] [--root <path>] [--json | --model-context]",
    "rekon intent plan review",
    "rekon intent plan answer",
    "rekon intent assess",
    "rekon intent prepare",
    "rekon intent status",
    "rekon intent approve",
    "rekon intent status transition",
    "rekon intent work-order generate",
    "rekon intent verification-plan generate",
    "rekon intent bundle write",
  ];
}

function renderWelcome(brand: string): string {
  const lines: string[] = [];
  if (brand) lines.push(brand, "");
  lines.push(
    "Rekon builds local repository intelligence.",
    "",
    "Lifecycle:",
    "  scan → snapshot → act",
    "",
    "First run:",
    "  rekon scan",
    "",
    "Intent workflow:",
    ...rekonIntentWorkflow().map((c) => `  ${c}`),
    "",
    "Analysis:",
    "  rekon semantic file understand",
    "  rekon scan --semantic-files off|auto|required   (default auto: on when OPENAI_API_KEY is set)",
    "  rekon scan --no-semantic   (opt out; also REKON_SEMANTIC=off or config semantic.mode)",
    "",
    "Boundaries:",
    "  Rekon does not run Circe.",
    "  Rekon does not execute commands.",
    "  Rekon does not edit implementation source; setup manages one bounded AGENTS.md block.",
    "  intent:go remains deferred.",
  );
  return lines.join("\n");
}

type RekonSetupWorkspaceState = "not_initialized" | "initialized_without_snapshot" | "snapshot_ready";

type RekonSetupPlan = {
  command: "setup";
  workspace: { state: RekonSetupWorkspaceState; root: string };
  recommendedNextActions: string[];
  boundaries: {
    runsScan: false;
    createdDocs: false;
    createdAgentHandoff: false;
    createdCi: false;
    createdVerificationPlan: false;
    runsCirce: false;
    executesCommands: false;
    writesSourceFiles: true;
    implementsIntentGo: false;
  };
};

// Detect workspace state for `rekon setup` without running a scan or creating
// `.rekon/`. Setup may manage the root AGENTS.md bootstrap separately.
async function detectSetupWorkspaceState(root: string): Promise<RekonSetupWorkspaceState> {
  const dotRekon = resolve(root, ".rekon");
  let initialized = true;
  try {
    await access(dotRekon);
  } catch {
    initialized = false;
  }
  if (!initialized) return "not_initialized";
  try {
    const store = createLocalArtifactStore(root);
    await store.init();
    const snapshots = await store.list("IntelligenceSnapshot");
    return snapshots.length > 0 ? "snapshot_ready" : "initialized_without_snapshot";
  } catch {
    return "initialized_without_snapshot";
  }
}

function buildSetupPlan(input: { state: RekonSetupWorkspaceState; root: string }): RekonSetupPlan {
  const recommendedNextActions =
    input.state === "snapshot_ready"
      ? [
          "rekon intent context prepare --root .",
          'rekon intent assess --root . --goal "..." --kind feature --path <path>',
          "rekon publish agents --root .",
          "rekon artifacts list --root .",
        ]
      : ["rekon scan --root ."];
  return {
    command: "setup",
    workspace: { state: input.state, root: input.root },
    recommendedNextActions,
    boundaries: {
      runsScan: false,
      createdDocs: false,
      createdAgentHandoff: false,
      createdCi: false,
      createdVerificationPlan: false,
      runsCirce: false,
      executesCommands: false,
      writesSourceFiles: true,
      implementsIntentGo: false,
    },
  };
}

export async function main(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  const [command, subcommand, positional] = parsed.positionals;
  const root = resolve(String(parsed.flags.root ?? process.cwd()));
  const json = Boolean(parsed.flags.json);

  if (!command || command === "help" || parsed.flags.help) {
    writeOutput(usage(), json);
    return;
  }

  if (command === "init") {
    const store = createLocalArtifactStore(root);
    await store.init();
    await writeConfigIfMissing(root);
    const config = await readConfig(root);
    const agentInstructions = await syncAgentInstructions(root, agentInstructionOptions(config));
    writeOutput({ root, config: ".rekon/config.json", agentInstructions }, json);
    return;
  }

  if (command === "agent-instructions" && subcommand === "sync") {
    const config = await readConfig(root);
    const result = await syncAgentInstructions(root, agentInstructionOptions(config));
    writeOutput(result, json);
    return;
  }

  if (command === "agent-instructions" && subcommand === "check") {
    const config = await readConfig(root);
    const result = await checkAgentInstructions(root, agentInstructionOptions(config));
    writeOutput(result, json);
    if (result.status !== "current" && result.status !== "disabled") process.exitCode = 1;
    return;
  }

  if (command === "agent-instructions" && subcommand === "remove") {
    const config = await readConfig(root);
    const result = await removeAgentInstructions(root, { target: config.agentInstructions?.target });
    writeOutput(result, json);
    return;
  }

  if (command === "contracts" && subcommand === "bootstrap") {
    const result = await bootstrapRepositoryContracts({
      root,
      maxFlows: positiveIntegerFlag(parsed.flags["max-flows"], 50),
      maxDepth: positiveIntegerFlag(parsed.flags["max-depth"], 8),
    });
    writeOutput({ command: "contracts bootstrap", ...result }, json);
    if (result.status === "failed") process.exitCode = 1;
    return;
  }

  if (command === "contracts" && subcommand === "compile") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const compiled = await compileRepositoryContracts(root, store);
    writeOutput({ command: "contracts compile", ...compiled }, json);
    if (!compiled.valid) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "contracts" && subcommand === "discover") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const {
      graph,
      observedRepo,
      ownershipMap,
      capabilityMap,
      effectiveRegistry,
      existingFlowContracts,
      verificationEvidence,
      verificationInventory,
    } = await loadRepositoryContractIntelligence(store, root);
    const report = discoverRepositoryContractCandidates({
      repoId: root,
      graph,
      observedRepo,
      ownershipMap,
      capabilityMap,
      effectiveRegistry,
      existingFlowContracts,
      verificationEvidence,
      verificationInventory,
      maxFlows: positiveIntegerFlag(parsed.flags["max-flows"], 50),
      maxDepth: positiveIntegerFlag(parsed.flags["max-depth"], 8),
    });
    const artifact = await store.write(report, { category: "actions" });
    writeOutput({
      command: "contracts discover",
      artifact,
      summary: report.summary,
      evidenceInventory: report.evidenceInventory,
      unresolved: report.unresolved.length,
      graphWarnings: graph.warnings,
      authority: "inferred",
      adopted: false,
    }, json);
    return;
  }

  if (command === "contracts" && subcommand === "judge") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const candidateEntry = await selectContractArtifactEntry(
      store,
      "ContractCandidateReport",
      parsed.flags["candidate-report"],
    );
    const candidateReport = assertContractCandidateReport(await store.read(candidateEntry));
    const candidateReportRef = artifactIndexRef(candidateEntry);
    const prompt = buildRepositoryContractJudgmentPrompt(candidateReport);
    const inputPath = typeof parsed.flags.input === "string" ? parsed.flags.input.trim() : "";
    if (!inputPath) {
      writeOutput({
        command: "contracts judge",
        candidateReport: candidateReportRef,
        promptVersion: REPOSITORY_CONTRACT_JUDGMENT_PROMPT_VERSION,
        prompt,
        schema: REPOSITORY_CONTRACT_JUDGMENT_JSON_SCHEMA,
        next: "Write the agent judgment JSON under the repository and rerun with --input <path>.",
      }, json);
      return;
    }
    const judgeMode = contractJudgeMode(parsed.flags.mode);
    const model = typeof parsed.flags.model === "string" && parsed.flags.model.trim()
      ? parsed.flags.model.trim()
      : undefined;
    if (judgeMode === "provider" && !model) throw new Error("Provider contract judgments require --model <id>.");
    const judged = await writeRepositoryContractJudgment({
      root,
      store,
      candidateEntry,
      inputPath,
      judge: {
        id: typeof parsed.flags["judge-id"] === "string" ? parsed.flags["judge-id"] : "rekon-agent",
        version: typeof parsed.flags["judge-version"] === "string" ? parsed.flags["judge-version"] : "1.0.0",
        mode: judgeMode,
        ...(model ? { model } : {}),
      },
    });
    writeOutput({
      command: "contracts judge",
      artifact: judged.artifact,
      summary: judged.report.summary,
      judge: judged.report.judge,
    }, json);
    return;
  }

  if (command === "contracts" && subcommand === "adopt") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const judgmentEntry = await selectContractArtifactEntry(
      store,
      "ContractJudgmentReport",
      parsed.flags["judgment-report"],
    );
    const apply = parsed.flags.apply === true;
    const adopted = await applyRepositoryContractJudgment({
      root,
      store,
      judgmentEntry,
      ...(typeof parsed.flags["candidate-report"] === "string"
        ? { candidateReport: parsed.flags["candidate-report"] }
        : {}),
      apply,
    });
    writeOutput({
      command: "contracts adopt",
      artifact: adopted.artifact,
      summary: adopted.report.summary,
      operations: adopted.report.operations,
      compiled: adopted.compiled,
    }, json);
    if (adopted.report.summary.blocked > 0 || adopted.compiled?.valid === false) process.exitCode = 1;
    return;
  }

  if (command === "contracts" && subcommand === "maintain") {
    const inputPath = typeof parsed.flags.input === "string" ? parsed.flags.input.trim() : "";
    if (!inputPath) {
      const bootstrap = await bootstrapRepositoryContracts({
        root,
        maxFlows: positiveIntegerFlag(parsed.flags["max-flows"], 50),
        maxDepth: positiveIntegerFlag(parsed.flags["max-depth"], 8),
      });
      if (bootstrap.status === "failed") {
        writeOutput({ command: "contracts maintain", phase: "bootstrap", ...bootstrap }, json);
        process.exitCode = 1;
        return;
      }

      const store = createLocalArtifactStore(root);
      await store.init();
      const registry = await readLatestArtifactOrUndefined<EffectiveContractRegistry>(store, "EffectiveContractRegistry");
      if ((registry?.entries.length ?? 0) === 0) {
        writeOutput({
          command: "contracts maintain",
          phase: bootstrap.status === "judgment-required" ? "judgment" : "current",
          ...bootstrap,
        }, json);
        return;
      }

      const reconciliation = await reconcileRepositoryContracts({
        root,
        store,
        maxFlows: positiveIntegerFlag(parsed.flags["max-flows"], 50),
        maxDepth: positiveIntegerFlag(parsed.flags["max-depth"], 8),
      });
      if (reconciliation.status === "blocked") {
        writeOutput({ command: "contracts maintain", phase: "reconcile", ...reconciliation }, json);
        process.exitCode = 1;
        return;
      }
      const candidateEntry = await selectContractArtifactEntry(
        store,
        "ContractCandidateReport",
        reconciliation.candidates.artifact.id,
      );
      const candidateReport = assertContractCandidateReport(await store.read(candidateEntry));
      const needsJudgment = candidateReport.summary.total > 0;
      writeOutput({
        command: "contracts maintain",
        phase: needsJudgment ? "judgment" : "current",
        status: needsJudgment ? "judgment-required" : reconciliation.status,
        bootstrap,
        reconciliation,
        ...(needsJudgment ? {
          judgment: {
            promptVersion: REPOSITORY_CONTRACT_JUDGMENT_PROMPT_VERSION,
            prompt: buildRepositoryContractJudgmentPrompt(candidateReport),
            schema: REPOSITORY_CONTRACT_JUDGMENT_JSON_SCHEMA,
            next: `rekon contracts maintain --candidate-report ${candidateEntry.id} --input <judgment.json> --root . --json`,
          },
        } : {}),
      }, json);
      return;
    }

    const store = createLocalArtifactStore(root);
    await store.init();
    const candidateEntry = await selectContractArtifactEntry(
      store,
      "ContractCandidateReport",
      parsed.flags["candidate-report"],
    );
    const judgeMode = contractJudgeMode(parsed.flags.mode);
    const model = typeof parsed.flags.model === "string" && parsed.flags.model.trim()
      ? parsed.flags.model.trim()
      : undefined;
    if (judgeMode === "provider" && !model) throw new Error("Provider contract judgments require --model <id>.");
    const judged = await writeRepositoryContractJudgment({
      root,
      store,
      candidateEntry,
      inputPath,
      judge: {
        id: typeof parsed.flags["judge-id"] === "string" ? parsed.flags["judge-id"] : "rekon-agent",
        version: typeof parsed.flags["judge-version"] === "string" ? parsed.flags["judge-version"] : "1.0.0",
        mode: judgeMode,
        ...(model ? { model } : {}),
      },
    });
    const apply = parsed.flags.apply === true;
    const judgmentEntry = await selectContractArtifactEntry(store, "ContractJudgmentReport", judged.artifact.id);
    const adopted = await applyRepositoryContractJudgment({
      root,
      store,
      judgmentEntry,
      candidateReport: candidateEntry.id,
      apply,
    });
    const reconciliation = apply && adopted.report.summary.adopted > 0 && adopted.compiled?.valid !== false
      ? await reconcileRepositoryContracts({
          root,
          store,
          maxFlows: positiveIntegerFlag(parsed.flags["max-flows"], 50),
          maxDepth: positiveIntegerFlag(parsed.flags["max-depth"], 8),
        })
      : undefined;
    const blocked = adopted.report.summary.blocked > 0
      || adopted.compiled?.valid === false
      || reconciliation?.status === "blocked";
    const status = blocked
      ? "blocked"
      : apply && adopted.report.summary.adopted > 0
        ? "adopted"
        : adopted.report.summary.planned > 0
          ? "adoption-ready"
          : "reviewed";
    writeOutput({
      command: "contracts maintain",
      phase: blocked ? "blocked" : apply ? "reconcile" : "adoption",
      status,
      judgment: {
        artifact: judged.artifact,
        summary: judged.report.summary,
        judge: judged.report.judge,
      },
      adoption: {
        artifact: adopted.artifact,
        summary: adopted.report.summary,
        operations: adopted.report.operations,
        compiled: adopted.compiled,
      },
      reconciliation,
      next: !apply && adopted.report.summary.planned > 0
        ? `rekon contracts maintain --candidate-report ${candidateEntry.id} --input ${inputPath} --apply --root . --json`
        : undefined,
      boundaries: {
        calledModel: false,
        executedRepositoryCommands: false,
        wroteContractSource: apply && adopted.report.summary.adopted > 0,
      },
    }, json);
    if (blocked) process.exitCode = 1;
    return;
  }

  if (command === "contracts" && subcommand === "reconcile") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const result = await reconcileRepositoryContracts({
      root,
      store,
      maxFlows: positiveIntegerFlag(parsed.flags["max-flows"], 50),
      maxDepth: positiveIntegerFlag(parsed.flags["max-depth"], 8),
    });
    writeOutput({ command: "contracts reconcile", ...result }, json);
    if (result.status === "blocked") process.exitCode = 1;
    if (parsed.flags["fail-on-drift"] === true && result.status === "drifted") process.exitCode = 1;
    return;
  }

  if (command === "refresh") {
    const skipPublish = parsed.flags["skip-publish"] === true;
    const skipFreshness = parsed.flags["skip-freshness"] === true;
    let changedFiles = parseRepeatableFlag(parsed.flags["changed-file"]);
    let proofGate: ValidatedProofGateForRefresh | undefined;
    if (parsed.flags["proof-gate"] !== undefined) {
      if (skipPublish || skipFreshness) {
        throw new Error(
          "rekon refresh --proof-gate cannot be combined with --skip-publish or --skip-freshness; accepted knowledge requires complete maintenance and validation.",
        );
      }
      if (typeof parsed.flags["proof-gate"] !== "string" || !parsed.flags["proof-gate"].trim()) {
        throw new Error("rekon refresh --proof-gate requires a ProofGateReport ref.");
      }
      const proof = await validateProofGateForRefresh(root, parsed.flags["proof-gate"].trim(), changedFiles);
      changedFiles = proof.changedFiles;
      proofGate = proof;
    }
    const result = await runRefresh(root, {
      skipPublish,
      skipFreshness,
      changedFiles: changedFiles.length > 0 ? changedFiles : undefined,
      ...(proofGate ? { proofGate } : {}),
    });

    writeOutput(result, json);

    if (result.status === "failed") {
      process.exitCode = 1;
    }

    return;
  }

  if (command === "scan") {
    // `rekon scan [--root <path>] [--json]` — the canonical first-run command
    // (Rekon First-Run Scan / Install Onboarding Decision, 2524df6). scan
    // initializes `.rekon/` if needed and runs the shared refresh/scan substrate
    // pipeline (`runRefresh` performs init + default config in its first step),
    // then reports the workspace state and post-scan next actions. scan does NOT
    // prompt, does NOT offer docs/agent/CI/verification generation before the
    // first scan, does NOT execute commands, and writes nothing outside
    // `.rekon/`. `refresh` remains the expert / compatibility verb that shares
    // this same pipeline; scan changes no refresh semantics.
    type RekonWorkspaceState =
      | "not_initialized"
      | "initialized_without_snapshot"
      | "snapshot_ready";

    const dotRekon = resolve(root, ".rekon");
    let initializedBefore = true;
    try {
      await access(dotRekon);
    } catch {
      initializedBefore = false;
    }

    const detectSnapshotReady = async (): Promise<boolean> => {
      try {
        const store = createLocalArtifactStore(root);
        await store.init();
        const snapshots = await store.list("IntelligenceSnapshot");
        return snapshots.length > 0;
      } catch {
        return false;
      }
    };

    const stateBefore: RekonWorkspaceState = !initializedBefore
      ? "not_initialized"
      : (await detectSnapshotReady())
        ? "snapshot_ready"
        : "initialized_without_snapshot";

    const firstScan = stateBefore !== "snapshot_ready";
    const nextActions = [
      'rekon intent assess --goal "..."',
      "rekon publish agents",
      'rekon resolve preflight --path <path> --goal "..."',
    ];
    // Boundary booleans: scan builds the intelligence substrate only. It does not
    // perform the post-scan "act" surfaces (docs/agent/CI/verification), does not
    // execute user/verification commands, writes no source files (only `.rekon/`
    // operational state + `.rekon/artifacts/`), and does not implement intent:go.
    const boundaries = {
      createdDocs: false,
      createdAgentHandoff: false,
      createdCi: false,
      createdVerificationPlan: false,
      executedCommands: false,
      wroteSourceFiles: false,
      implementedIntentGo: false,
    };

    // Both semantic overlays inherit the same default-on mode chain. An
    // explicit files flag still matters because explicit auto retains the
    // documented per-file deterministic fallback behavior when no key exists.
    const semanticFilesFlagRaw = parsed.flags["semantic-files"];
    const resolvedSemanticFilesMode = await resolveScanSemanticFilesMode(root, parsed.flags);
    const semanticFilesMode = resolvedSemanticFilesMode;
    const semanticDebtMode = resolveScanSemanticDebtMode(parsed.flags, resolvedSemanticFilesMode);
    const semanticLlmProvider =
      typeof parsed.flags["llm-provider"] === "string" ? String(parsed.flags["llm-provider"]).trim() : "";
    const semanticLlmModel =
      typeof parsed.flags["llm-model"] === "string" ? String(parsed.flags["llm-model"]).trim() : "";
    const semanticDebtLlmModel =
      typeof parsed.flags["semantic-debt-model"] === "string"
        ? String(parsed.flags["semantic-debt-model"]).trim()
        : semanticLlmModel;
    const semanticDebtEffort = parsed.flags["semantic-debt-effort"] === undefined
      ? undefined
      : normalizeSemanticDebtEffort(parsed.flags["semantic-debt-effort"], "rekon scan --semantic-debt-effort");
    const semanticDebtFilePaths = parseRepeatableFlag(parsed.flags["semantic-debt-file-path"])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const semanticFilePath =
      typeof parsed.flags["semantic-file-path"] === "string" ? String(parsed.flags["semantic-file-path"]).trim() : "";
    const semanticChangedOnly = parsed.flags["semantic-changed-only"] === true;
    let semanticFileLimit = SEMANTIC_SCAN_DEFAULT_FILE_LIMIT;
    if (parsed.flags["semantic-file-limit"] !== undefined) {
      const parsedLimit = Number.parseInt(String(parsed.flags["semantic-file-limit"]), 10);
      if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
        throw new Error("rekon scan --semantic-file-limit must be a non-negative integer.");
      }
      semanticFileLimit = parsedLimit;
    }
    let semanticDebtFileLimit = SEMANTIC_DEBT_DEFAULT_FILE_LIMIT;
    if (parsed.flags["semantic-debt-file-limit"] !== undefined) {
      const parsedLimit = Number.parseInt(String(parsed.flags["semantic-debt-file-limit"]), 10);
      if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
        throw new Error("rekon scan --semantic-debt-file-limit must be a non-negative integer.");
      }
      semanticDebtFileLimit = parsedLimit;
    }

    const semanticDebtStore = createLocalArtifactStore(root);
    const semanticDebtLayer = await runSemanticDebtLayer({
      root,
      store: semanticDebtStore,
      mode: semanticDebtMode,
      llmProvider: semanticLlmProvider,
      llmModel: semanticDebtLlmModel,
      llmEffort: semanticDebtEffort,
      fileLimit: semanticDebtFileLimit,
      filePaths: semanticDebtFilePaths,
    });

    if (semanticDebtLayer.exitNonZero && semanticDebtLayer.summary.providerAvailable === false) {
      const scanOutput = {
        command: "scan" as const,
        status: "failed" as const,
        workspace: {
          stateBefore,
          stateAfter: stateBefore,
          initialized: false,
        },
        snapshot: { ready: false },
        summary: { artifacts: 0 },
        nextActions,
        boundaries,
        semanticFiles: {
          mode: semanticFilesMode,
          selected: 0,
          written: 0,
          reused: 0,
          skipped: 0,
          failed: 0,
          ...(semanticFilesMode === "off" ? {} : { providerAvailable: false }),
        },
        semanticDebt: semanticDebtLayer.summary,
        ...(semanticDebtLayer.message ? { message: semanticDebtLayer.message } : {}),
      };

      if (json) {
        writeOutput(scanOutput, true);
      } else {
        writeOutput(semanticDebtLayer.message ?? "Semantic debt required, but no LLM provider/key is available.", false);
      }
      process.exitCode = 1;
      return;
    }

    // Produce semantic file evidence before the substrate pipeline so the
    // current scan's capability graph and model projections can consume it.
    // Required-mode failures still leave the deterministic refresh available,
    // but the command exits non-zero and reports the incomplete semantic layer.
    let semanticLayer: SemanticScanLayerResult = {
      summary: { mode: "off", selected: 0, written: 0, reused: 0, skipped: 0, failed: 0 },
      exitNonZero: false,
      artifacts: [],
    };
    if (semanticFilesMode !== "off") {
      const semanticStore = createLocalArtifactStore(root);
      await semanticStore.init();
      semanticLayer = await runSemanticScanLayer({
        root,
        store: semanticStore,
        mode: semanticFilesMode,
        llmProvider: semanticLlmProvider,
        llmModel: semanticLlmModel,
        fileLimit: semanticFileLimit,
        filePath: semanticFilePath,
        changedOnly: semanticChangedOnly,
        explicitlyRequested: semanticFilesFlagRaw !== undefined,
      });
    }

    // Run the shared substrate pipeline. Model-layer artifacts produced or
    // reused above are explicit members of this scan's snapshot lineage. The
    // independent judge runs after the first policy pass and, when it writes a
    // judgment report, policy runs once more so current dispositions govern the
    // final AssessmentReport used by downstream refresh stages.
    let assessmentJudgmentLayer: AssessmentJudgmentLayerResult | undefined;
    const refresh = await runRefresh(root, {
      syncAgentInstructions: false,
      seedArtifactRefs: [...semanticDebtLayer.artifacts, ...semanticLayer.artifacts],
      afterEvaluate: async () => {
        const judgmentStore = createLocalArtifactStore(root);
        assessmentJudgmentLayer = await runAssessmentJudgmentLayer({
          root,
          store: judgmentStore,
          mode: semanticDebtMode,
          llmProvider: semanticLlmProvider,
          llmModel: semanticDebtLlmModel,
          llmEffort: semanticDebtEffort,
        });
        return {
          status: assessmentJudgmentLayer.status,
          artifacts: assessmentJudgmentLayer.artifacts,
          summary: assessmentJudgmentLayer.summary,
          ...(assessmentJudgmentLayer.message ? { message: assessmentJudgmentLayer.message } : {}),
        };
      },
    });

    const detectionStore = createLocalArtifactStore(root);
    await detectionStore.init();
    const latestFindingReport = await readLatestArtifactOrUndefined<FindingReport>(detectionStore, "FindingReport");
    const latestAssessmentReport = await readLatestArtifactOrUndefined<AssessmentReport>(detectionStore, "AssessmentReport");
    const detectionSummary = {
      findings: latestFindingReport?.summary.total ?? 0,
      risks: latestAssessmentReport?.summary.byKind.risk ?? 0,
      opportunities: latestAssessmentReport?.summary.byKind.opportunity ?? 0,
      semanticClaims: latestAssessmentReport?.summary.byKind.semantic_claim ?? 0,
      modelDiagnostics: latestAssessmentReport?.summary.byKind.model_diagnostic ?? 0,
    };

    const snapshotReady = await detectSnapshotReady();
    const stateAfter: RekonWorkspaceState = snapshotReady
      ? "snapshot_ready"
      : "initialized_without_snapshot";

    const scanOutput = {
      command: "scan" as const,
      status: refresh.status,
      workspace: {
        stateBefore,
        stateAfter,
        initialized: !initializedBefore,
      },
      snapshot: { ready: snapshotReady },
      summary: { artifacts: refresh.artifacts.length, ...detectionSummary },
      nextActions,
      boundaries,
      refresh,
      semanticFiles: semanticLayer.summary,
      semanticDebt: semanticDebtLayer.summary,
      assessmentJudgment: assessmentJudgmentLayer?.summary ?? {
        mode: semanticDebtMode,
        candidates: 0,
        selected: 0,
        confirmed: 0,
        rejected: 0,
        insufficientEvidence: 0,
        verificationRequired: 0,
        failed: 0,
        skipped: 0,
      },
    };

    if (json) {
      writeOutput(scanOutput, true);
    } else {
      const semanticHumanLines: string[] = [
        semanticLayer.summary.mode === "off"
          ? "Semantic files: off"
          : semanticLayer.summary.mode === "auto" && semanticLayer.summary.providerAvailable === false
            ? "Semantic files: auto — no LLM key detected; deterministic scan only (set OPENAI_API_KEY, or opt out with --no-semantic)"
            : `Semantic files: ${semanticLayer.summary.mode} — ${semanticLayer.summary.written} written, ${semanticLayer.summary.reused} reused, ${semanticLayer.summary.skipped} skipped, ${semanticLayer.summary.failed} failed`,
        ...(semanticLayer.message ? [semanticLayer.message] : []),
      ];
      const semanticDebtHumanLines: string[] = [
        semanticDebtLayer.summary.mode === "off"
          ? "Semantic debt: off"
          : semanticDebtLayer.summary.mode === "auto" && semanticDebtLayer.summary.providerAvailable === false
            ? "Semantic debt: auto — no LLM key detected; deterministic debt markers only (set OPENAI_API_KEY, or opt out with --no-semantic)"
            : `Semantic debt: ${semanticDebtLayer.summary.mode} — ${semanticDebtLayer.summary.judged} judged, ${semanticDebtLayer.summary.filesWithDebt} with debt, ${semanticDebtLayer.summary.reused} reused, ${semanticDebtLayer.summary.skipped} skipped, ${semanticDebtLayer.summary.failed} failed`,
        ...(semanticDebtLayer.message ? [semanticDebtLayer.message] : []),
      ];
      const assessmentJudgmentHumanLines: string[] = assessmentJudgmentLayer
        ? [
            assessmentJudgmentLayer.summary.mode === "off"
              ? "Assessment judgment: off"
              : assessmentJudgmentLayer.summary.providerAvailable === false
                ? `Assessment judgment: ${assessmentJudgmentLayer.summary.mode} — no usable provider/key; candidates remain unjudged`
                : `Assessment judgment: ${assessmentJudgmentLayer.summary.mode} — ${assessmentJudgmentLayer.summary.confirmed} confirmed, ${assessmentJudgmentLayer.summary.rejected} rejected, ${assessmentJudgmentLayer.summary.verificationRequired} need verification, ${assessmentJudgmentLayer.summary.insufficientEvidence} insufficient`,
            ...(assessmentJudgmentLayer.message ? [assessmentJudgmentLayer.message] : []),
          ]
        : [];
      const scanLines = [
        "Rekon scan",
        "",
        `Workspace: ${initializedBefore ? "existing" : "initialized"}`,
        `Snapshot: ${snapshotReady ? "ready" : "not ready"}`,
        `Artifacts: ${refresh.artifacts.length}`,
        `Findings: ${detectionSummary.findings}`,
        `Risks: ${detectionSummary.risks}`,
        `Opportunities: ${detectionSummary.opportunities}`,
        `Semantic claims: ${detectionSummary.semanticClaims}`,
        `Model diagnostics: ${detectionSummary.modelDiagnostics}`,
        ...semanticHumanLines,
        ...semanticDebtHumanLines,
        ...assessmentJudgmentHumanLines,
        firstScan ? "First scan complete." : "Scan complete.",
        "",
        "Next:",
        ...nextActions.map((action) => `  ${action}`),
        "",
        "No commands, source writes, docs, agent handoffs, CI changes, or intent:go were created by scan.",
      ];
      writeOutput(scanLines.join("\n"), false);
    }

    if (refresh.status === "failed" || semanticLayer.exitNonZero || semanticDebtLayer.exitNonZero) {
      process.exitCode = 1;
    }

    return;
  }

  if (command === "welcome") {
    // `rekon welcome [--json] [--no-banner]` — a branded, read-only lifecycle
    // introduction (Rekon Setup / Welcome UI Implementation). It prints the
    // Scan → Snapshot → Act lifecycle, the first-run command, the intent
    // workflow, and the V1 boundaries. It does not prompt, run scan, write any
    // file, execute commands, run Circe, or implement intent:go. ASCII art never
    // appears in `--json`.
    const noBanner = Boolean(parsed.flags["no-banner"]);
    const stdoutIsTTY = process.stdout.isTTY === true;
    if (json) {
      writeOutput(
        {
          command: "welcome",
          lifecycle: ["scan", "snapshot", "act"],
          firstRun: "rekon scan",
          intentWorkflow: rekonIntentWorkflow(),
          boundaries: {
            runsCirce: false,
            executesCommands: false,
            writesSourceFiles: false,
            implementsIntentGo: false,
          },
        },
        true,
      );
    } else {
      const brand = rekonBrandPrefix({ json, noBanner, stdoutIsTTY, env: process.env });
      writeOutput(renderWelcome(brand), false);
    }
    return;
  }

  if (command === "setup") {
    // `rekon setup [--root <path>] [--json] [--no-banner]` installs the bounded
    // Rekon bootstrap in AGENTS.md and otherwise remains a non-interactive setup
    // planner. It does not scan, create `.rekon/`, execute commands, or generate
    // dynamic repository context.
    // ASCII art never appears in `--json`.
    const noBanner = Boolean(parsed.flags["no-banner"]);
    const stdoutIsTTY = process.stdout.isTTY === true;
    const state = await detectSetupWorkspaceState(root);
    const plan = buildSetupPlan({ state, root });
    const config = await readConfig(root);
    const agentInstructions = await syncAgentInstructions(root, agentInstructionOptions(config));

    if (json) {
      writeOutput({ ...plan, agentInstructions }, true);
    } else {
      const brand = rekonBrandPrefix({ json, noBanner, stdoutIsTTY, env: process.env });
      const lines: string[] = [];
      if (brand) lines.push(brand, "");
      lines.push(
        "Rekon setup",
        "",
        `Workspace: ${state}`,
        "",
        "Recommended next action:",
        ...plan.recommendedNextActions.map((action) => `  ${action}`),
        "",
        `Agent instructions: ${agentInstructions.changed ? "installed" : "current"} (${agentInstructions.target})`,
        "This command does not run scans, create dynamic docs, add CI, execute commands, or implement intent:go.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "paths" && subcommand === "freshness") {
    // `rekon paths freshness [--path <path>] [--path <path>]
    // [--root <path>] [--json]` — first watcher / path
    // freshness slice (post-beta). **Read-only with respect
    // to source files.** Writes a single diagnostic
    // PathFreshnessReport artifact comparing the current
    // working-tree fingerprint to the latest prior
    // PathFreshnessReport baseline. Does NOT run
    // `rekon refresh`; does NOT mutate any source; does
    // NOT start a watcher daemon. See
    // docs/strategy/watcher-path-freshness-policy-decision.md
    // and docs/strategy/post-beta-dogfood-evidence-triage.md.
    const requestedPaths = parseRepeatableFlag(parsed.flags.path);
    const normalizedRequestedPaths = [...new Set(requestedPaths
      .map((entry) => entry.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\.\//, "").replace(/^\//, "")))]
      .sort();
    const pathFreshnessSupersessionKey = `path-freshness:${createHash("sha256")
      .update(normalizedRequestedPaths.length > 0 ? normalizedRequestedPaths.join("\n") : "<all-paths>")
      .digest("hex")}`;
    const allPathsSupersessionKey = `path-freshness:${createHash("sha256")
      .update("<all-paths>")
      .digest("hex")}`;
    const store = createLocalArtifactStore(root);
    await store.init();

    const generatedAt = new Date().toISOString();

    const currentSourceState = await buildSourceStateFingerprint({
      repoRoot: root,
      paths: requestedPaths.length > 0 ? requestedPaths : undefined,
      generatedAt,
    });

    const priorReports = await store.list("PathFreshnessReport");
    // A path-scoped baseline can only be compared with a prior report for the
    // same path set. Older unkeyed artifacts remain compatible with full-repo
    // checks only.
    let baselineSourceState: SourceStateFingerprint | undefined;
    let baselineRef: ArtifactRef | undefined;
    let baselineGeneratedAt: string | undefined;

    for (const candidate of [...priorReports].reverse()) {
      try {
        const baselineReport = await store.read(candidate) as PathFreshnessReport;
        const candidateKey = baselineReport.header?.supersession?.key;
        const compatible = candidateKey === pathFreshnessSupersessionKey
          || (normalizedRequestedPaths.length > 0 && candidateKey === allPathsSupersessionKey)
          || (!candidateKey && !baselineReport.header?.subject?.paths?.length);
        if (compatible && baselineReport?.currentSourceState) {
          baselineSourceState = baselineReport.currentSourceState as SourceStateFingerprint;
          baselineRef = {
            type: candidate.type,
            id: candidate.id,
            schemaVersion: candidate.schemaVersion,
          };
          baselineGeneratedAt = baselineReport.header?.generatedAt;
          break;
        }
      } catch {
        // Continue to an older compatible baseline. Integrity diagnostics are
        // reported by artifact validation/freshness.
      }
    }

    // When the operator narrowed the tracking set with --path,
    // narrow the baseline comparison to the same set so we
    // don't surface "missing" for paths the prior (broader)
    // baseline tracked but this run intentionally did not.
    if (baselineSourceState && requestedPaths.length > 0) {
      const requested = new Set(
        requestedPaths.map((entry) =>
          entry.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\.\//, "").replace(/^\//, ""),
        ),
      );
      baselineSourceState = {
        ...baselineSourceState,
        paths: baselineSourceState.paths.filter((entry) => requested.has(entry.path)),
      };
    }

    const comparison = comparePathFreshness(
      currentSourceState as SourceStateFingerprint,
      baselineSourceState,
    );

    const artifactId = `path-freshness-${generatedAt.replace(/[:.]/g, "-")}`;
    const header: ArtifactHeader = {
      artifactType: "PathFreshnessReport",
      artifactId,
      schemaVersion: "0.1.0",
      generatedAt,
      supersession: { key: pathFreshnessSupersessionKey },
      subject: {
        repoId: root,
        ...(requestedPaths.length > 0 ? { paths: [...requestedPaths] } : {}),
      },
      producer: {
        id: "@rekon/cli.paths-freshness",
        version: "0.1.0-beta.0",
      },
      inputRefs: baselineRef ? [baselineRef] : [],
    };

    const report = createPathFreshnessReport({
      header,
      status: comparison.status,
      currentSourceState: currentSourceState as SourceStateFingerprint,
      baselineSourceState,
      baselineRef,
      baselineGeneratedAt,
      entries: comparison.entries,
      summary: comparison.summary,
      recommendation: comparison.recommendation,
    });

    const ref = await store.write(report, { category: "actions" });

    if (json) {
      writeOutput(
        {
          artifact: ref,
          status: report.status,
          summary: report.summary,
          recommendation: report.recommendation,
          entries: report.entries,
          baselineRef: report.baselineRef,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push(`Path freshness: ${report.status}`);
      lines.push(
        `Paths inspected: ${report.summary.total}`
        + ` (fresh ${report.summary.fresh}, changed ${report.summary.changed},`
        + ` missing ${report.summary.missing}, new ${report.summary.new},`
        + ` unknown ${report.summary.unknown})`,
      );
      if (report.recommendation.refreshRecommended) {
        lines.push(
          `Recommendation: ${report.recommendation.message}`,
        );
        if (report.recommendation.commands.length > 0) {
          lines.push(`Commands: ${report.recommendation.commands.join(", ")}`);
        }
      } else if (report.status === "unknown") {
        lines.push(report.recommendation.message);
      } else {
        lines.push(report.recommendation.message);
      }
      lines.push(`Artifact: ${ref.type}:${ref.id}`);
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "capabilities" && subcommand === "list") {
    const runtime = await createDefaultRuntime(root);
    const verbose = Boolean(parsed.flags.verbose);

    if (!verbose) {
      const capabilities = runtime.registry.capabilities.map((capability) => capability.manifest);
      writeOutput({ capabilities }, json);
      return;
    }

    const capabilities = runtime.registry.capabilities.map((capability) => ({
      manifest: capability.manifest,
      handlers: summarizeHandlers(capability),
    }));
    writeOutput({ capabilities }, json);
    return;
  }

  if (command === "capabilities" && subcommand === "inspect" && positional) {
    const runtime = await createDefaultRuntime(root);
    const capability = runtime.registry.capabilities.find(
      (entry) => entry.manifest.id === positional,
    );

    if (!capability) {
      throw new Error(`Unknown capability: ${positional}`);
    }

    writeOutput(
      {
        manifest: capability.manifest,
        handlers: summarizeHandlers(capability),
        artifactTypes: capability.artifactTypes.map((type) => type.type),
      },
      json,
    );
    return;
  }

  if (command === "capability" && subcommand === "ontology" && positional === "normalize") {
    // `rekon capability ontology normalize [--root <path>] [--json]` —
    // first runtime slice of the layered capability-ontology
    // translation system (Layer 1 baseline + optional Layer 2
    // config → Layer 3 effective ontology → Layer 4 candidate
    // extraction + Layer 5 audit report). **Read-only** with
    // respect to source files. Writes a single
    // `CapabilityNormalizationReport`. Does NOT mutate
    // `EvidenceGraph` raw facts. Does NOT update
    // `CapabilityMap` (Layer 6 is deferred to v2). Does NOT
    // silently resolve any finding. See
    // docs/concepts/capability-ontology.md and
    // docs/artifacts/capability-normalization-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const evidenceEntries = await store.list("EvidenceGraph");
    if (evidenceEntries.length === 0) {
      throw new Error(
        "rekon capability ontology normalize: no EvidenceGraph found. Run `rekon refresh` (or `rekon observe`) first.",
      );
    }
    const latestEvidence = evidenceEntries.at(-1)!;
    const evidenceRef: ArtifactRef = {
      type: latestEvidence.type,
      id: latestEvidence.id,
      path: latestEvidence.path,
      digest: latestEvidence.digest,
      schemaVersion: latestEvidence.schemaVersion ?? "0.1.0",
    };
    const graph = (await store.read(latestEvidence)) as Parameters<
      typeof buildCapabilityNormalizationReport
    >[0]["graph"];

    const configResult = await loadCapabilityOntologyConfig(root);
    const detection = await detectOverlayPacks(root);
    const ontology: EffectiveCapabilityOntology = compileEffectiveCapabilityOntology({
      config: configResult.found ? configResult.config : undefined,
      configPath: configResult.found ? configResult.configPath : undefined,
      configHash: configResult.found ? configResult.configHash : undefined,
      overrideKind: configResult.found ? configResult.overrideKind : undefined,
      legacyOverrideIgnored: configResult.found
        ? configResult.legacyOverrideIgnored
        : undefined,
      overlayPackIds: detection.packIds,
    });

    const generatedAt = new Date().toISOString();
    const artifactId = `capability-normalization-${generatedAt.replace(/[:.]/g, "-")}`;
    const header: ArtifactHeader = {
      artifactType: "CapabilityNormalizationReport",
      artifactId,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root },
      producer: {
        id: "@rekon/cli.capability-ontology-normalize",
        version: "0.1.0-beta.0",
      },
      inputRefs: [evidenceRef],
      freshness: { status: "fresh" },
    };

    const report: CapabilityNormalizationReport = buildCapabilityNormalizationReport({
      header,
      ontology,
      graph,
      graphRef: evidenceRef,
    });

    const ref = await store.write(report, { category: "projections" });

    if (json) {
      writeOutput(
        {
          artifact: ref,
          ontology: report.ontology,
          summary: report.summary,
          candidates: report.candidates,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push(
        `Capability ontology normalization: ${report.summary.totalCandidates} candidate(s).`,
      );
      lines.push(
        `Ontology source: ${report.ontology.source}`
        + (report.ontology.configPath ? ` (${report.ontology.configPath})` : "")
        + `; effective hash ${report.ontology.effectiveHash}.`,
      );
      lines.push(
        `Normalized: ${report.summary.normalized}. `
        + `unknown-verb: ${report.summary.unknownVerb}. `
        + `unknown-noun: ${report.summary.unknownNoun}. `
        + `unknown: ${report.summary.unknown}. `
        + `ignored: ${report.summary.ignored}. `
        + `low-confidence: ${report.summary.lowConfidence}. `
        + `aliases applied: ${report.summary.aliasApplied}.`,
      );
      lines.push(`Artifact: ${ref.type}:${ref.id}`);
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "capability" && subcommand === "graph" && positional === "build") {
    // `rekon capability graph build [--path <file-or-dir>] [--root <path>] [--json]` —
    // v1 of the CapabilityEvidenceGraph substrate (capability-evidence-graph-v1).
    // Reads selected source files and builds ONE CapabilityEvidenceGraph from
    // deterministic facts only: file nodes, symbol nodes, import + exposes FACTS
    // (confidence 1.0), and heuristic verb:noun capability INFERENCES
    // (confidence <= 0.5) derived from exported symbol names. **Read-only** with
    // respect to source files. Uses NO LLM, generates NO embeddings, executes NO
    // commands, writes NO source, creates NO PreparedIntentPlan / WorkOrder /
    // VerificationPlan, and runs NO Circe — the artifact factory forces every
    // boundary boolean false. The graph is evidence-backed context, not proof by
    // itself. See docs/concepts/capability-evidence-graph.md and
    // docs/artifacts/capability-evidence-graph.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const requestedPaths = parseRepeatableFlag(parsed.flags.path);
    const pathFlag = requestedPaths.length > 0 ? String(requestedPaths[0]).trim() : "";

    let candidates: string[];
    if (pathFlag.length > 0) {
      const abs = resolve(root, pathFlag);
      let stats;
      try {
        stats = await stat(abs);
      } catch {
        throw new Error(`rekon capability graph build: --path not found: ${pathFlag}`);
      }
      if (stats.isDirectory()) {
        candidates = await collectCapabilityGraphCandidates(root, await loadAgentScratchSegments(root), abs);
      } else {
        // Explicit single file bypasses the extension allow-list / size filter.
        candidates = [relative(root, abs).replace(/\\/g, "/")];
      }
    } else {
      candidates = await collectCapabilityGraphCandidates(root, await loadAgentScratchSegments(root));
    }

    const files: Array<{ path: string; sha256: string; text: string }> = [];
    for (const relPath of candidates) {
      if (typeof relPath !== "string" || relPath.length === 0) continue;
      const abs = resolve(root, relPath);
      let text: string;
      try {
        text = await readFile(abs, "utf8");
      } catch {
        continue;
      }
      // Binary file — never analyze, never persist.
      if (text.indexOf("\u0000") !== -1) continue;
      const sha = createHash("sha256").update(text).digest("hex");
      files.push({ path: relPath, sha256: sha, text });
    }

    // Optional, explicit semantic-report integration (slice 156). With no
    // `--semantic-file-reports` / `--semantic-file-report-ref` flags the build is
    // deterministic-only (identical to v1). When requested, stored
    // SemanticFileUnderstandingReport(s) are folded in as `llm_extraction`
    // evidence and `llm` / `inference` claims — never facts, never proof. The
    // build calls NO provider; it reads stored artifacts. Stale/unmatched reports
    // are surfaced (never consumed silently); deterministic facts win.
    const semanticMode = String(parsed.flags["semantic-file-reports"] ?? "").trim();
    const semanticRefs = parseRepeatableFlag(parsed.flags["semantic-file-report-ref"]);
    const wantSemantic = semanticMode === "latest" || semanticRefs.length > 0;

    let semanticReports: SemanticReportForGraph[] = [];
    let semanticSelection: ReturnType<typeof selectSemanticReportsForGraph> | undefined;
    if (wantSemantic) {
      const SEMANTIC_TYPE = "SemanticFileUnderstandingReport";
      const entries = await store.list(SEMANTIC_TYPE);
      const toRef = (entry: (typeof entries)[number]): ArtifactRef => ({
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      });
      const normalizeRel = (value: string): string =>
        String(value).replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
      const graphedPaths = new Set(files.map((file) => normalizeRel(file.path)));
      const candidates: SemanticReportForGraph[] = [];
      if (semanticRefs.length > 0) {
        // Explicit refs are the candidate set; an unresolved ref fails cleanly.
        for (const refString of semanticRefs) {
          const trimmed = refString.trim();
          if (trimmed.length === 0) continue;
          const wantedId = trimmed.includes(":") ? trimmed.slice(trimmed.indexOf(":") + 1) : trimmed;
          const entry = entries.find((candidate) => candidate.id === wantedId);
          if (!entry) {
            throw new Error(
              `rekon capability graph build: could not resolve --semantic-file-report-ref ${trimmed}; `
              + `no ${SEMANTIC_TYPE} with id ${wantedId} was found.`,
            );
          }
          candidates.push({ report: (await store.read(entry)) as SemanticFileUnderstandingReportLike, ref: toRef(entry) });
        }
      } else {
        // `latest`: every stored report whose file path matches a graphed file.
        for (const entry of entries) {
          const report = (await store.read(entry)) as SemanticFileUnderstandingReportLike;
          const reportPath = typeof report.file?.path === "string" ? normalizeRel(report.file.path) : "";
          if (reportPath.length === 0 || !graphedPaths.has(reportPath)) continue;
          candidates.push({ report, ref: toRef(entry) });
        }
      }
      semanticReports = candidates;
      semanticSelection = selectSemanticReportsForGraph({ reports: candidates, files });
    }

    // Optional, explicit embedding-similarity integration (slice 159). With no
    // `--embedding-similarity` flag the build folds in NO similarity and calls
    // NO provider (identical to the deterministic/semantic build). `latest`
    // reads the `.rekon/cache/embeddings` cache (populated by `rekon embeddings
    // index`) and folds nearest-neighbor results in as `embedding_similarity`
    // evidence and `embedding` / `inference` claims — proposal/context, never
    // facts. The build generates NO embeddings (it reads cached vectors), so the
    // graph's `generatedEmbeddings` boundary stays false. A stale cache is
    // re-indexed by `embeddings index`; the graph never embeds and never uses a
    // stale embedding silently.
    const embeddingSimilarityMode = String(parsed.flags["embedding-similarity"] ?? "").trim();
    const wantEmbeddingSimilarity = embeddingSimilarityMode === "latest";
    let embeddingSimilarities: EmbeddingSimilarityForGraph[] = [];
    let embeddingSearch: EmbeddingNeighborSearchStats | undefined;
    if (wantEmbeddingSimilarity) {
      const cacheDir = embeddingCacheDir(root);
      const records = await readEmbeddingIndexRecords(cacheDir);
      const search = await computeEmbeddingSimilaritiesFromCache(cacheDir, records, {
        topK: GRAPH_EMBEDDING_NEIGHBOR_TOP_K,
        floor: GRAPH_EMBEDDING_NEIGHBOR_FLOOR,
      });
      embeddingSimilarities = search.similarities;
      embeddingSearch = search.stats;
    }

    const generatedAt = new Date().toISOString();
    const evidenceGraph = await readLatestEvidenceGraphForCapabilityGraph(store);
    const graph = buildCapabilityEvidenceGraph({
      root,
      files,
      generatedAt,
      ...(evidenceGraph ? { evidenceGraph } : {}),
      ...(wantSemantic ? { semanticFileUnderstandingReports: semanticReports } : {}),
      ...(wantEmbeddingSimilarity ? { embeddingSimilarities } : {}),
    });
    const ref = await store.write(graph, { category: "graphs" });

    const embeddingSummary = wantEmbeddingSimilarity
      ? {
          sources: embeddingSimilarities.length,
          pairs: embeddingSimilarities.reduce((total, similarity) => total + similarity.neighbors.length, 0),
          ...(embeddingSearch ? { search: embeddingSearch } : {}),
        }
      : undefined;

    const semanticSummary = semanticSelection
      ? {
          requested: semanticSelection.requested,
          used: semanticSelection.usable.length,
          stale: semanticSelection.stale.length,
          missing: semanticSelection.missing.length,
          warnings: semanticSelection.warnings,
        }
      : undefined;

    if (json) {
      writeOutput(
        {
          status: graph.status,
          artifact: { type: ref.type, id: ref.id },
          summary: graph.summary,
          boundaries: graph.boundaries,
          ...(semanticSummary ? { semanticFileReports: semanticSummary } : {}),
          ...(embeddingSummary ? { embeddingSimilarity: embeddingSummary } : {}),
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push(
        `Capability evidence graph: ${graph.summary.files} file(s), `
        + `${graph.summary.symbols} symbol(s), ${graph.summary.capabilities} capability(ies).`,
      );
      lines.push(
        `Facts: ${graph.summary.facts}. `
        + `Inferences: ${graph.summary.inferences}. `
        + `Recommendations: ${graph.summary.recommendations}. `
        + `Evidence: ${graph.summary.evidence}.`,
      );
      lines.push("Boundaries: no LLM, no embeddings, no commands, no source writes (all false).");
      if (semanticSummary) {
        lines.push(
          `Semantic file reports: ${semanticSummary.used} used, `
          + `${semanticSummary.stale} stale, ${semanticSummary.missing} missing `
          + `(of ${semanticSummary.requested} requested) — inference claims, not facts.`,
        );
        for (const warning of semanticSummary.warnings) lines.push(`  warning: ${warning}`);
      }
      if (embeddingSummary) {
        lines.push(
          `Embedding similarity: ${embeddingSummary.sources} source(s), `
          + `${embeddingSummary.pairs} neighbor claim(s) from cache — proposal/context, not facts. `
          + "No embeddings generated (read cache).",
        );
      }
      lines.push(
        `Status: ${graph.status.value}`
        + (graph.status.reason ? ` — ${graph.status.reason}` : "")
        + ".",
      );
      lines.push(`Artifact: ${ref.type}:${ref.id}`);
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "embeddings" && subcommand === "index") {
    // `rekon embeddings index [--all] [--path <p>] [--provider voyage|mock]
    //  [--model <m>] [--dimensions <n>] [--root <path>] [--json]` — Embedding
    // Provider / Index v1 (slice 159). Reads the latest CapabilityEvidenceGraph
    // (+ optional latest SemanticFileUnderstandingReport summaries), builds
    // DERIVED embedding chunks (summaries / signatures / feature bags — never raw
    // whole-file source), classifies them against the `.rekon/cache/embeddings`
    // cache, and calls the embedding provider ONLY for new / stale /
    // policy-changed chunks. Raw vectors are written under
    // `.rekon/cache/embeddings/vectors/` — cache/index data, NOT canonical proof
    // artifacts. A stale embedding is reclassified and re-embedded, NEVER used
    // silently. Writes NO source files, executes NO commands, creates NO
    // PreparedIntentPlan / WorkOrder / VerificationPlan, runs NO Circe. The API
    // key is read from VOYAGE_API_KEY (env only); a missing key fails cleanly
    // (ok:false) with no false success.
    const store = createLocalArtifactStore(root);
    await store.init();

    const providerId =
      typeof parsed.flags.provider === "string" && parsed.flags.provider.trim().length > 0
        ? parsed.flags.provider.trim()
        : "voyage";
    const model =
      typeof parsed.flags.model === "string" && parsed.flags.model.trim().length > 0
        ? parsed.flags.model.trim()
        : providerId === "mock"
          ? "mock-embedding"
          : VOYAGE_DEFAULT_MODEL;
    const dimsFlag = Number.parseInt(String(parsed.flags.dimensions ?? ""), 10);
    const dimensions =
      Number.isFinite(dimsFlag) && dimsFlag > 0
        ? dimsFlag
        : providerId === "mock"
          ? MOCK_EMBEDDING_DIMENSIONS
          : VOYAGE_DEFAULT_DIMENSIONS;
    const forceAll = Boolean(parsed.flags.all);

    const graphEntries = await store.list("CapabilityEvidenceGraph");
    if (graphEntries.length === 0) {
      throw new Error(
        "rekon embeddings index: no CapabilityEvidenceGraph found. Run `rekon capability graph build` first.",
      );
    }
    const latestGraphEntry = graphEntries[graphEntries.length - 1];
    if (!latestGraphEntry) {
      throw new Error("rekon embeddings index: no CapabilityEvidenceGraph found.");
    }
    const graph = (await store.read(latestGraphEntry)) as EvidenceGraphForChunks;

    // Optional DERIVED file summaries from stored SemanticFileUnderstandingReports
    // (a summary is a derived description, never raw source). Absent => the chunk
    // builder uses deterministic summaries.
    const fileSummaries: Record<string, string> = {};
    const semEntries = await store.list("SemanticFileUnderstandingReport").catch(() => []);
    for (const entry of semEntries) {
      const report = (await store.read(entry)) as {
        file?: { path?: string };
        semantic?: { summary?: string };
        understanding?: { summary?: string };
      };
      const reportPath =
        typeof report.file?.path === "string" ? report.file.path.replace(/\\/g, "/").replace(/^\.\//, "") : "";
      const summary =
        typeof report.semantic?.summary === "string"
          ? report.semantic.summary
          : typeof report.understanding?.summary === "string"
            ? report.understanding.summary
            : "";
      if (reportPath.length > 0 && summary.trim().length > 0 && !fileSummaries[reportPath]) {
        fileSummaries[reportPath] = summary.trim();
      }
    }

    const allChunks = buildEmbeddingChunks({ graph, fileSummaries });
    const pathScope = parseRepeatableFlag(parsed.flags.path).map((value) =>
      String(value).replace(/\\/g, "/").replace(/^\.\//, ""),
    );
    const chunks: EmbeddingChunkRef[] =
      pathScope.length > 0
        ? allChunks.filter((chunk) =>
            pathScope.some((scope) => chunk.path === scope || chunk.path.startsWith(scope.endsWith("/") ? scope : `${scope}/`)),
          )
        : allChunks;

    const cacheDir = embeddingCacheDir(root);
    const existing = await readEmbeddingIndexRecords(cacheDir);
    const classification = classifyEmbeddingChunks({
      chunks,
      existing,
      provider: providerId,
      model,
      dimensions,
      policyVersion: EMBEDDING_POLICY_VERSION,
    });
    const toEmbed = forceAll ? chunks.map((chunk) => ({ chunk, reason: "new" as const })) : classification.toEmbed;
    const reused = forceAll ? [] : classification.reused;
    const staleCount = toEmbed.filter((entry) => entry.reason !== "new").length;

    const generatedAt = new Date().toISOString();
    const indexedRecords: EmbeddingIndexRecord[] = [];
    let failed = 0;
    let providerError: string | undefined;
    let providerTokens = 0;
    if (toEmbed.length > 0) {
      const provider = resolveEmbeddingProvider({ providerId, model, dimensions, inputType: "document" });
      const result = await provider.embed({
        task: "code.embedding",
        texts: toEmbed.map((entry) => entry.chunk.text),
        model,
        dimensions,
      });
      if (!result.ok) {
        failed = toEmbed.length;
        providerError = result.error;
      } else if (result.vectors.length !== toEmbed.length) {
        failed = toEmbed.length;
        providerError = "embedding-count-mismatch";
      } else {
        providerTokens = result.usage?.totalTokens ?? 0;
        await mkdir(join(cacheDir, "vectors"), { recursive: true });
        for (let i = 0; i < toEmbed.length; i += 1) {
          const entry = toEmbed[i];
          const vector = result.vectors[i];
          if (!entry || !vector) continue;
          const indexKey = computeEmbeddingIndexKey(entry.chunk, {
            provider: providerId,
            model,
            dimensions,
            policyVersion: EMBEDDING_POLICY_VERSION,
          });
          const vectorRef = embeddingVectorRef(indexKey);
          const vectorJson = JSON.stringify(vector);
          const vectorSha256 = createHash("sha256").update(vectorJson).digest("hex");
          await writeFile(join(cacheDir, vectorRef), vectorJson, "utf8");
          indexedRecords.push({
            chunk: entry.chunk,
            provider: providerId,
            model,
            dimensions,
            policyVersion: EMBEDDING_POLICY_VERSION,
            vectorRef,
            vectorSha256,
            createdAt: generatedAt,
          });
        }
      }
    }

    // Merge: reused records + existing records outside the scoped set + newly
    // indexed (new wins by chunk id). On provider failure nothing new is written;
    // the cache keeps prior records (no partial write, no false success).
    const mergedById = new Map<string, EmbeddingIndexRecord>();
    for (const record of reused) mergedById.set(record.chunk.id, record);
    const scopedIds = new Set(chunks.map((chunk) => chunk.id));
    if (pathScope.length > 0) {
      for (const record of existing) {
        if (!scopedIds.has(record.chunk.id)) mergedById.set(record.chunk.id, record);
      }
    }
    for (const record of indexedRecords) mergedById.set(record.chunk.id, record);
    const merged = [...mergedById.values()].sort((a, b) => a.chunk.id.localeCompare(b.chunk.id));

    if (indexedRecords.length > 0 || existing.length > 0) {
      await mkdir(cacheDir, { recursive: true });
      await writeFile(
        join(cacheDir, "index.json"),
        `${JSON.stringify({ version: EMBEDDING_POLICY_VERSION, provider: providerId, model, dimensions, records: merged }, null, 2)}\n`,
        "utf8",
      );
    }

    if (failed > 0) process.exitCode = 1;
    const summary = {
      provider: providerId,
      model,
      dimensions,
      inputType: "document" as const,
      totalTokens: providerTokens,
      chunks: chunks.length,
      indexed: indexedRecords.length,
      reused: reused.length,
      stale: staleCount,
      failed,
      cached: merged.length,
    };

    if (json) {
      writeOutput(
        {
          status: failed > 0 ? "failed" : "indexed",
          ...(providerError ? { error: providerError } : {}),
          summary,
          cache: ".rekon/cache/embeddings",
          boundaries: {
            executedCommands: false,
            wroteSourceFiles: false,
            createdPreparedIntentPlan: false,
            createdWorkOrder: false,
            createdVerificationPlan: false,
            ranCirce: false,
            rawVectorsAreProof: false,
          },
          note: "raw vectors are cache/index data, not canonical proof artifacts",
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push(`Embeddings index (${providerId}/${model}, ${dimensions}-dim): ${chunks.length} chunk(s).`);
      lines.push(`Indexed: ${indexedRecords.length}. Reused: ${reused.length}. Stale: ${staleCount}. Failed: ${failed}.`);
      if (providerError) {
        lines.push(`Provider ${providerId} returned no embeddings (${providerError}) — nothing falsely indexed.`);
      }
      lines.push(
        "Raw vectors are cache/index data under .rekon/cache/embeddings — not proof. No source writes, no commands.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "embeddings" && subcommand === "query") {
    // `rekon embeddings query --text "<query>" [--top-k <n>] [--provider
    //  voyage|mock] [--model <m>] [--dimensions <n>] [--root <path>] [--json]` —
    // retrieval over the `.rekon/cache/embeddings` cache. Embeds the query, ranks
    // cached chunks by cosine similarity, and returns the nearest as
    // PROPOSAL / CONTEXT — never proof, never an authoritative answer.
    // Deterministic facts remain stronger than embedding similarity. Reads cache
    // only; writes nothing. A missing key fails cleanly (ok:false).
    const text = typeof parsed.flags.text === "string" ? parsed.flags.text : String(parsed.flags.text ?? "");
    if (text.trim().length === 0) {
      throw new Error("rekon embeddings query requires --text <query>.");
    }
    const providerId =
      typeof parsed.flags.provider === "string" && parsed.flags.provider.trim().length > 0
        ? parsed.flags.provider.trim()
        : "voyage";
    const model =
      typeof parsed.flags.model === "string" && parsed.flags.model.trim().length > 0
        ? parsed.flags.model.trim()
        : providerId === "mock"
          ? "mock-embedding"
          : VOYAGE_DEFAULT_MODEL;
    const dimsFlag = Number.parseInt(String(parsed.flags.dimensions ?? ""), 10);
    const dimensions =
      Number.isFinite(dimsFlag) && dimsFlag > 0
        ? dimsFlag
        : providerId === "mock"
          ? MOCK_EMBEDDING_DIMENSIONS
          : VOYAGE_DEFAULT_DIMENSIONS;
    // Top-k policy (Embedding Retrieval / Similarity Ranking Decision, slice
    // 163/164): default 8, capped at 20. Absent flag -> default; present but
    // non-positive/non-numeric -> fail cleanly; above the cap -> clamp and
    // report requestedTopK vs effectiveTopK. Never silently use uncapped values.
    const topKRaw = parsed.flags["top-k"];
    const topKProvided = topKRaw !== undefined && String(topKRaw).trim().length > 0;
    let requestedTopK = DEFAULT_QUERY_TOP_K;
    if (topKProvided) {
      const parsedTopK = Number.parseInt(String(topKRaw), 10);
      if (!Number.isFinite(parsedTopK) || parsedTopK <= 0) {
        throw new Error(`rekon embeddings query --top-k must be a positive integer (got "${String(topKRaw)}").`);
      }
      requestedTopK = parsedTopK;
    }
    const effectiveTopK = Math.min(requestedTopK, MAX_QUERY_TOP_K);
    // Query text embeds with input_type=query (indexing uses document); the mock
    // provider ignores it. Retrieval is proposal/context, never proof.
    const inputType = "query" as const;

    const cacheDir = embeddingCacheDir(root);
    const records = await readEmbeddingIndexRecords(cacheDir);
    if (records.length === 0) {
      if (json) {
        writeOutput(
          { status: "empty", results: [], matches: [], note: "no embeddings indexed; run `rekon embeddings index`" },
          true,
        );
      } else {
        writeOutput("No embeddings indexed. Run `rekon embeddings index` first.", false);
      }
      return;
    }

    const compatibleRecords = records.filter((record) =>
      record.provider === providerId
      && record.dimensions === dimensions
      && (providerId === "voyage"
        ? areVoyageEmbeddingModelsCompatible(record.model, model)
        : record.model === model),
    );
    if (compatibleRecords.length === 0) {
      process.exitCode = 1;
      const payload = {
        command: "embeddings query",
        status: "failed",
        error: "embedding-index-incompatible",
        provider: providerId,
        model,
        dimensions,
        indexedRecords: records.length,
        compatibleRecords: 0,
        note: "No compatible embedding index exists for this provider/model/dimension profile. Run `rekon embeddings index --all`.",
      };
      if (json) writeOutput(payload, true);
      else writeOutput(`No compatible embedding index for ${providerId}/${model} at ${dimensions} dimensions. Run \`rekon embeddings index --all\`.`, false);
      return;
    }

    const provider = resolveEmbeddingProvider({ providerId, model, dimensions, inputType });
    const result = await provider.embed({ task: "artifact.retrieval", texts: [text], model, dimensions });
    const queryVector = result.ok ? result.vectors[0] : undefined;
    if (!result.ok || !queryVector) {
      process.exitCode = 1;
      const error = result.ok ? "no-embeddings" : result.error;
      if (json) {
        writeOutput({ status: "failed", error, results: [], matches: [] }, true);
      } else {
        writeOutput(`Embedding provider ${providerId} returned no embedding (${error}). No retrieval performed.`, false);
      }
      return;
    }

    const scored: Array<{ record: EmbeddingIndexRecord; score: number }> = [];
    for (const record of compatibleRecords) {
      const vector = await readEmbeddingVector(cacheDir, record.vectorRef);
      if (!vector) continue;
      scored.push({ record, score: cosineSimilarity(queryVector, vector) });
    }
    scored.sort((a, b) => b.score - a.score || a.record.chunk.id.localeCompare(b.record.chunk.id));
    const previewOf = (value: string): string => {
      const collapsed = String(value ?? "").replace(/\s+/g, " ").trim();
      return collapsed.length > 160 ? `${collapsed.slice(0, 157)}...` : collapsed;
    };
    // Every result carries an explainable score band (policy label, not proof).
    // Ignored-score (< 0.50) results are labeled but retained in this slice; default
    // removal of ignored results is a documented follow-up.
    const results = scored.slice(0, effectiveTopK).map((entry) => {
      const chunk = entry.record.chunk;
      const score = Number(entry.score.toFixed(6));
      return {
        score,
        scoreBand: classifyEmbeddingSimilarityScore(entry.score),
        chunkId: chunk.id,
        kind: chunk.kind,
        path: chunk.path,
        ...(chunk.symbolId ? { symbolId: chunk.symbolId } : {}),
        chunk: { id: chunk.id, kind: chunk.kind, path: chunk.path, ...(chunk.symbolId ? { symbolId: chunk.symbolId } : {}) },
        explanation: {
          provider: entry.record.provider,
          model: entry.record.model,
          policyVersion: entry.record.policyVersion,
          textPreview: previewOf(chunk.text),
        },
      };
    });

    if (json) {
      writeOutput(
        {
          command: "embeddings query",
          status: "ok",
          provider: providerId,
          model,
          dimensions,
          query: { text, provider: providerId, model, dimensions, requestedTopK, effectiveTopK, inputType },
          usage: result.usage ?? {},
          requestedTopK,
          effectiveTopK,
          inputType,
          compatibleRecords: compatibleRecords.length,
          ignoredIncompatibleRecords: records.length - compatibleRecords.length,
          topK: effectiveTopK,
          results,
          matches: results,
          boundaries: {
            retrievalIsProof: false,
            approvedPlans: false,
            executedCommands: false,
            wroteSourceFiles: false,
            ranCirce: false,
            implementedIntentGo: false,
          },
          note: "embedding similarity is proposal/context, not proof; score bands are policy labels, not proof",
        },
        true,
      );
    } else {
      const clamped = requestedTopK !== effectiveTopK ? ` (requested ${requestedTopK}, clamped to ${effectiveTopK})` : "";
      const lines: string[] = [];
      lines.push(
        `Embedding query (${providerId}/${model}, input_type=${inputType}): top ${results.length} of ${records.length} cached chunk(s), top-k ${effectiveTopK}${clamped}.`,
      );
      for (const r of results) {
        lines.push(`  ${r.score.toFixed(3)}  ${r.scoreBand}  ${r.path}  ${r.kind}  ${r.symbolId ?? r.chunkId}`);
      }
      lines.push("Proposal / context, not proof. Score bands are policy labels, not proof. Deterministic facts remain stronger than embedding similarity.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "context" && subcommand === "validate-change") {
    const task = typeof parsed.flags.task === "string" ? parsed.flags.task.trim() : "";
    if (!task) throw new Error("rekon context validate-change requires --task <text>.");
    const changedPaths = parseRepeatableFlag(parsed.flags["changed-path"])
      .map((path) => path.trim())
      .filter(Boolean);
    if (changedPaths.length === 0) {
      throw new Error("rekon context validate-change requires --changed-path <path>.");
    }
    const baseRef = typeof parsed.flags["base-ref"] === "string"
      ? parsed.flags["base-ref"].trim()
      : "HEAD";
    if (!baseRef) throw new Error("rekon context validate-change --base-ref must be non-empty.");
    const verificationResultRefs = parseRepeatableFlag(parsed.flags["verification-result"]);
    const runtimeObservationRefs = parseRepeatableFlag(parsed.flags["runtime-observation"]);
    const placementVerificationRefs = parseRepeatableFlag(parsed.flags["placement-verification"]);
    const contextUsageRef = parseOptionalArtifactRefFlag(
      parsed.flags["context-usage"],
      "rekon context validate-change --context-usage",
    );
    const contextUsageClaims = parseContextUsageClaims(parsed.flags["context-claims-json"]);
    const modelJudgments = parseChangeModelJudgments(parsed.flags["judgment-json"]);
    const prepareVerification = parsed.flags["prepare-verification"] === true;
    if (prepareVerification && parsed.flags["record-proof"] === true) {
      throw new Error("rekon context validate-change cannot prepare verification and record proof in the same call.");
    }
    const validation = await validateRepositoryChange(root, {
      task,
      changedPaths,
      baseRef,
      verificationResultRefs,
      runtimeObservationRefs,
      placementVerificationRefs,
      contextUsageRef,
      contextUsageClaims,
      contextUsageClaimant: "rekon-cli-caller",
      modelJudgments,
    });
    let verificationPlan: ArtifactRef | undefined;
    if (prepareVerification && validation.result.blockingViolations.length === 0) {
      verificationPlan = await recordChangeVerificationPlan(root, validation.result);
    }
    let proofArtifact: ArtifactRef | undefined;
    if (parsed.flags["record-proof"] === true) {
      if (validation.result.status !== "passed") {
        process.exitCode = 1;
      } else {
        proofArtifact = await recordChangeProofGate(root, validation.result);
      }
    }
    const outcomeArtifact = await recordValidationOutcomeEvent(root, validation, proofArtifact);
    if (validation.result.status === "blocked") process.exitCode = 1;
    writeOutput(json
      ? {
          ...projectChangeValidationDecision(validation.result),
          ...(verificationPlan ? {
            verificationPlan,
            next: [
              `rekon verify run --plan ${verificationPlan.type}:${verificationPlan.id} --execute --root . --json`,
              "rekon verify result from-run --run <VerificationRun:id> --root . --json",
            ],
          } : {}),
          ...(proofArtifact ? { proofArtifact } : {}),
          ...(outcomeArtifact ? { outcomeArtifact } : {}),
          ...(validation.contextClaimReceiptRef
            ? { contextClaimReceipt: validation.contextClaimReceiptRef }
            : {}),
        }
      : [
          renderChangeValidation(validation.result),
          ...(verificationPlan ? [
            `Verification plan: ${verificationPlan.type}:${verificationPlan.id}`,
            `Next: rekon verify run --plan ${verificationPlan.type}:${verificationPlan.id} --execute --root . --json`,
          ] : []),
          ...(proofArtifact ? [`Proof gate: ${proofArtifact.type}:${proofArtifact.id}`] : []),
          ...(outcomeArtifact ? [`Outcome: ${outcomeArtifact.type}:${outcomeArtifact.id}`] : []),
          ...(validation.contextClaimReceiptRef
            ? [`Context use receipt: ${validation.contextClaimReceiptRef.type}:${validation.contextClaimReceiptRef.id}`]
            : []),
        ].join("\n"), json);
    return;
  }

  if (command === "context" && subcommand === "refine") {
    const question = typeof parsed.flags.question === "string" ? parsed.flags.question.trim() : "";
    if (question.length === 0) {
      throw new Error("rekon context refine requires --question <text>.");
    }
    const target = typeof parsed.flags.target === "string" ? parsed.flags.target.trim() : "";
    if (target.length === 0) {
      throw new Error("rekon context refine requires --target <source-identifier>.");
    }
    const relationshipValue = typeof parsed.flags.relationship === "string"
      ? parsed.flags.relationship.trim()
      : "";
    if (!TASK_CONTEXT_REFINEMENT_RELATIONSHIPS.includes(relationshipValue as TaskContextRefinementRelationship)) {
      throw new Error(
        `rekon context refine --relationship must be one of: ${TASK_CONTEXT_REFINEMENT_RELATIONSHIPS.join(", ")}.`,
      );
    }
    const anchorPath = typeof parsed.flags["anchor-path"] === "string"
      ? parsed.flags["anchor-path"].trim()
      : "";
    const anchorSymbol = typeof parsed.flags["anchor-symbol"] === "string"
      ? parsed.flags["anchor-symbol"].trim()
      : "";
    if (anchorPath.length === 0 && anchorSymbol.length === 0) {
      throw new Error("rekon context refine requires --anchor-path <path> or --anchor-symbol <path#symbol>.");
    }
    const alreadyRead = parseRepeatableFlag(parsed.flags["already-read"])
      .map((path) => path.trim())
      .filter((path) => path.length > 0);
    const limitRaw = parsed.flags.limit;
    const limit = limitRaw === undefined ? undefined : Number.parseInt(String(limitRaw), 10);
    if (limit !== undefined && (!Number.isFinite(limit) || limit < 1 || limit > 8)) {
      throw new Error(`rekon context refine --limit must be an integer from 1 to 8 (got "${String(limitRaw)}").`);
    }

    const store = createLocalArtifactStore(root);
    await store.init();
    const graphEntries = await store.list("CapabilityEvidenceGraph");
    const latestGraphEntry = graphEntries[graphEntries.length - 1];
    if (!latestGraphEntry) {
      throw new Error("rekon context refine: no CapabilityEvidenceGraph found. Run `rekon capability graph build` first.");
    }
    const rawGraph = (await store.read(latestGraphEntry)) as unknown as TaskContextGraphLike;
    const sourceGate = await gateCurrentTaskContextGraph(root, rawGraph);
    const graph: TaskContextGraphLike = {
      ...sourceGate.graph,
      claims: (sourceGate.graph.claims ?? []).filter((claim) => claim.source !== "llm"),
    };
    const refinement = selectTaskContextRefinement({
      question,
      relationship: relationshipValue as TaskContextRefinementRelationship,
      ...(anchorPath ? { anchorPath } : {}),
      ...(anchorSymbol ? { anchorSymbol } : {}),
      ...(alreadyRead.length > 0 ? { alreadyRead } : {}),
      ...(limit !== undefined ? { limit } : {}),
      graph,
    });

    const contractEntries = await store.list("CapabilityContract");
    const latestContractEntry = contractEntries
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const capabilityContract = latestContractEntry
      ? (await store.read(latestContractEntry)) as CapabilityContract
      : undefined;
    const refinementContractPaths = [...new Set([
      ...refinement.readNext.map((candidate) => candidate.path),
      ...(anchorPath ? [anchorPath] : []),
      ...(anchorSymbol ? [anchorSymbol.split("#")[0] ?? anchorSymbol] : []),
    ].filter(Boolean))];
    const taskPactSelection = await buildCurrentTaskPact(store, {
      repoId: root,
      taskText: question,
      paths: refinementContractPaths,
      write: false,
    });
    const contractGuidance = selectTaskContractGuidance({
      paths: refinementContractPaths,
      graph,
      capabilityContract,
      capabilityContractRef: latestContractEntry,
      taskPact: taskPactSelection.pact,
      taskPactRef: taskPactSelection.ref,
    });
    const warnings: string[] = [...sourceGate.warnings];
    const contractFreshness = capabilityContract?.header.freshness?.status ?? "unknown";
    if (contractGuidance.matchedContractIds.length > 0 && contractFreshness !== "fresh") {
      warnings.push(
        `repository-contract-${contractFreshness}: selected CapabilityContract guidance is ${contractFreshness}; verify current repository policy before relying on it`,
      );
    }
    warnings.push(...taskPactSelection.warnings);
    warnings.push(...contractGuidance.warnings);
    if (refinement.truncated) {
      warnings.push("additional matching graph relationships were omitted by the bounded refinement limit");
    }
    const constraints = contractGuidance.constraints.map((constraint) =>
      constraint.path ? `${constraint.statement} [path: ${constraint.path}]` : constraint.statement,
    );
    const checks = contractGuidance.verificationHints.flatMap((hint) => [
      ...(hint.command ? [hint.command] : []),
      ...(hint.artifact ? [`artifact: ${hint.artifact}`] : []),
    ]);
    const modelContext = {
      schemaVersion: refinement.schemaVersion,
      instruction: TASK_CONTEXT_REFINEMENT_INSTRUCTION,
      question: refinement.question,
      target,
      relationship: refinement.relationship,
      anchor: refinement.anchor,
      readNext: refinement.readNext.map((candidate) => ({
        path: candidate.path,
        reason: candidate.reason,
      })),
      constraints,
      checks,
      unresolved: refinement.unresolved,
      result: refinement.reason,
      ...(warnings.length > 0 ? { warnings } : {}),
    };

    if (parsed.flags["model-context"] === true) {
      writeOutput(modelContext, true);
    } else if (json) {
      writeOutput({
        command: "context refine",
        status: refinement.unresolved ? "unresolved" : warnings.length > 0 ? "partial" : "ok",
        refinement,
        constraints: contractGuidance.constraints,
        verificationHints: contractGuidance.verificationHints,
        matchedCapabilityContracts: contractGuidance.matchedContractIds,
        matchedSystemContracts: contractGuidance.matchedSystemContractIds,
        matchedFlowContracts: contractGuidance.matchedFlowContractIds,
        taskPact: taskPactSelection.ref
          ? {
              artifact: { type: taskPactSelection.ref.type, id: taskPactSelection.ref.id },
              impactObligations: contractGuidance.impactObligations,
            }
          : undefined,
        warnings,
        source: { type: latestGraphEntry.type, id: latestGraphEntry.id },
        boundaries: {
          proposalNotProof: true,
          deterministicGraphOnly: true,
          readOnly: true,
          executedCommands: false,
          wroteSourceFiles: false,
        },
      }, true);
    } else {
      const lines = [
        `Task context refinement: ${refinement.reason}`,
        `Question: ${refinement.question}`,
        `Relationship: ${refinement.relationship}`,
      ];
      if (refinement.readNext.length > 0) {
        lines.push("", "Read next:");
        for (const candidate of refinement.readNext) {
          lines.push(`- ${candidate.path}: ${candidate.reason}`);
        }
      }
      if (constraints.length > 0) lines.push("", "Constraints:", ...constraints.map((entry) => `- ${entry}`));
      if (checks.length > 0) lines.push("", "Checks:", ...checks.map((entry) => `- ${entry}`));
      if (warnings.length > 0) lines.push("", "Warnings:", ...warnings.map((entry) => `- ${entry}`));
      lines.push("", "Context refinement is proposal/context, not proof.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "context" && subcommand === "task") {
    // `rekon context task --task "<text>" [--path <p> ...]
    //  [--profile compact|standard|deep] [--escalation validation-failed] [--provider voyage|mock]
    //  [--model <m>] [--top-k <n>] [--root <path>] [--json]` — TaskContextReport v1,
    // the first product consumer of embedding retrieval (Task-Shaped Context /
    // Embedding Retrieval Decision, slice 165). Reads the latest
    // CapabilityEvidenceGraph and the embedding cache (when present), then writes
    // ONE TaskContextReport. Task-shaped context is PROPOSAL / CONTEXT, never proof:
    // deterministic graph facts outrank embedding similarity, verification hints are
    // hints (never executed), and do-not-touch zones come from explicit constraints.
    // Writes the report artifact only — never writes source files, executes project
    // commands, creates a PreparedIntentPlan / WorkOrder / VerificationPlan, or runs
    // Circe.
    const taskText = typeof parsed.flags.task === "string" ? parsed.flags.task : String(parsed.flags.task ?? "");
    if (taskText.trim().length === 0) {
      throw new Error("rekon context task requires --task <text>.");
    }
    const paths = parseRepeatableFlag(parsed.flags.path)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const autoRefresh = parsed.flags["no-auto-refresh"] !== true;
    const freshness = autoRefresh
      ? await ensureTaskContextArtifactsFresh(root, paths)
      : undefined;
    const modelContextOnly = parsed.flags["model-context"] === true;
    // Explicit vs implicit provider selection drives the graph + lexical fallback
    // policy below: an EXPLICIT --provider that fails stays strict; an IMPLICITLY
    // defaulted provider that fails (e.g. `voyage` with no API key) degrades to
    // graph + lexical context instead of hard-failing.
    const providerExplicit =
      typeof parsed.flags.provider === "string" && parsed.flags.provider.trim().length > 0;
    const providerId = providerExplicit ? (parsed.flags.provider as string).trim() : "voyage";
    const model =
      typeof parsed.flags.model === "string" && parsed.flags.model.trim().length > 0
        ? parsed.flags.model.trim()
        : providerId === "mock"
          ? "mock-embedding"
          : VOYAGE_DEFAULT_MODEL;
    const dimsFlag = Number.parseInt(String(parsed.flags.dimensions ?? ""), 10);
    const dimensions =
      Number.isFinite(dimsFlag) && dimsFlag > 0
        ? dimsFlag
        : providerId === "mock"
          ? MOCK_EMBEDDING_DIMENSIONS
          : VOYAGE_DEFAULT_DIMENSIONS;
    const topKRaw = parsed.flags["top-k"];
    const topKProvided = topKRaw !== undefined && String(topKRaw).trim().length > 0;
    let requestedTopK = DEFAULT_QUERY_TOP_K;
    if (topKProvided) {
      const parsedTopK = Number.parseInt(String(topKRaw), 10);
      if (!Number.isFinite(parsedTopK) || parsedTopK <= 0) {
        throw new Error(`rekon context task --top-k must be a positive integer (got "${String(topKRaw)}").`);
      }
      requestedTopK = parsedTopK;
    }
    const effectiveTopK = Math.min(requestedTopK, MAX_QUERY_TOP_K);

    const store = createLocalArtifactStore(root);
    await store.init();
    const graphEntries = await store.list("CapabilityEvidenceGraph");
    const latestGraphEntry = graphEntries[graphEntries.length - 1];
    if (!latestGraphEntry) {
      throw new Error("rekon context task: no CapabilityEvidenceGraph found. Run `rekon capability graph build` first.");
    }
    const rawGraphForContext = (await store.read(latestGraphEntry)) as unknown as TaskContextGraphLike;
    const sourceGate = await gateCurrentTaskContextGraph(root, rawGraphForContext);
    const graphForContext = sourceGate.graph;

    // Retrieval is best-effort: with the embedding cache present and the provider
    // able to embed, rank cached chunks; otherwise record a warning and build from
    // graph + explicit paths only. Reads the cache only — writes no embeddings here.
    const warnings: string[] = [...sourceGate.warnings];
    const artifactFreshness = !autoRefresh
      ? { status: "unchecked" as const }
      : freshness?.refreshed
        ? {
            status: "refreshed" as const,
            scope: freshness.assessment.fullRefresh ? "repository" as const : "changed-files" as const,
            changedFiles: freshness.assessment.changedFiles,
            reasons: freshness.assessment.reasons,
          }
        : { status: "current" as const };
    // Track whether an embedding-provider call was actually attempted and failed
    // (e.g. missing API key). Combined with `providerExplicit`, this decides
    // whether the no-retrieval/no-path path degrades to graph + lexical context
    // (implicit failure) or stays strict (explicit failure).
    let providerCallFailed = false;
    let providerErrorCode = "";
    const cacheDir = embeddingCacheDir(root);
    const cachedRecords = await readEmbeddingIndexRecords(cacheDir);
    const currentEmbeddingRecords = selectCurrentEmbeddingIndexRecords(
      cachedRecords,
      graphForContext as EvidenceGraphForChunks,
    );
    const records = currentEmbeddingRecords.records;
    const compatibleRecords = records.filter((record) =>
      record.provider === providerId
      && record.dimensions === dimensions
      && (providerId === "voyage"
        ? areVoyageEmbeddingModelsCompatible(record.model, model)
        : record.model === model),
    );
    let retrievalResults: TaskContextRetrievalResultLike[] = [];
    if (records.length === 0) {
      warnings.push(
        cachedRecords.length === 0
          ? "retrieval-unavailable: no embeddings indexed (run `rekon embeddings index`); building from graph + explicit paths only"
          : `retrieval-unavailable: ignored ${currentEmbeddingRecords.ignored} stale embedding record(s); run \`rekon embeddings index\`; building from graph + explicit paths only`,
      );
    } else if (compatibleRecords.length === 0) {
      providerCallFailed = true;
      providerErrorCode = "embedding-index-incompatible";
      warnings.push(
        `retrieval-unavailable: ${records.length} cached embedding record(s) are incompatible with ${providerId}/${model} at ${dimensions} dimensions; run \`rekon embeddings index --all\``,
      );
    } else {
      const provider = resolveEmbeddingProvider({ providerId, model, dimensions, inputType: "query" });
      const result = await provider.embed({ task: "artifact.retrieval", texts: [taskText], model, dimensions });
      const queryVector = result.ok ? result.vectors[0] : undefined;
      if (!result.ok || !queryVector) {
        providerCallFailed = true;
        providerErrorCode = result.ok ? "no-embeddings" : result.error;
        warnings.push(
          `retrieval-unavailable: embedding provider ${providerId} returned no embedding (${providerErrorCode}); building from graph + explicit paths only`,
        );
      } else {
        const scored: Array<{ record: EmbeddingIndexRecord; score: number }> = [];
        for (const record of compatibleRecords) {
          const vector = await readEmbeddingVector(cacheDir, record.vectorRef);
          if (!vector) continue;
          scored.push({ record, score: cosineSimilarity(queryVector, vector) });
        }
        scored.sort((a, b) => b.score - a.score || a.record.chunk.id.localeCompare(b.record.chunk.id));
        retrievalResults = scored.slice(0, effectiveTopK).map((entry) => {
          const chunk = entry.record.chunk;
          return {
            score: Number(entry.score.toFixed(6)),
            scoreBand: classifyEmbeddingSimilarityScore(entry.score),
            chunkId: chunk.id,
            kind: chunk.kind,
            path: chunk.path,
            ...(chunk.symbolId ? { symbolId: chunk.symbolId } : {}),
            chunk: {
              id: chunk.id,
              kind: chunk.kind,
              path: chunk.path,
              ...(chunk.symbolId ? { symbolId: chunk.symbolId } : {}),
            },
          };
        });
      }
    }

    // Graph + lexical fallback (Intent Planning UX / Context Quality Fix): when
    // there is no embedding retrieval AND no operator --path, degrade gracefully
    // for the implicit provider selection. This covers both an unavailable default
    // provider and an absent embedding index. An EXPLICIT --provider failure stays
    // strict and visible. If lexical scope cannot be established, fail cleanly
    // rather than emitting repository-wide context.
    let lexicalContextPaths: string[] = [];
    let usedGraphLexicalFallback = false;
    if (retrievalResults.length === 0 && paths.length === 0) {
      if (!providerExplicit) {
        lexicalContextPaths = selectLexicalGraphContextPaths(taskText, graphForContext);
      }
      if (lexicalContextPaths.length === 0) {
        process.exitCode = 1;
        const note =
          providerExplicit && providerCallFailed
            ? `embedding provider ${providerId} was explicitly requested but is unavailable (${providerErrorCode || "unavailable"}); pass --path <path> or a working provider`
            : "no embedding retrieval available, no graph + lexical match, and no explicit --path provided; run `rekon embeddings index` or pass --path";
        const payload = {
          command: "context task",
          status: "failed",
          error: "context-retrieval-unavailable",
          provider: providerId,
          providerExplicit,
          retrieval: { status: "unavailable" },
          warnings,
          note,
        };
        if (json) {
          writeOutput(payload, true);
        } else {
          writeOutput(`rekon context task: context-retrieval-unavailable — ${note}.`, false);
        }
        return;
      }
      usedGraphLexicalFallback = true;
      if (providerCallFailed) {
        warnings.push(
          `provider-unavailable: embedding provider ${providerId} unavailable for implicit retrieval (${providerErrorCode || "unavailable"}); using graph + lexical context fallback`,
        );
      }
      warnings.push(
        `graph-lexical-fallback: derived ${lexicalContextPaths.length} context path(s) from the capability graph by lexical match against the task text (embedding retrieval unavailable or unindexed; proposal/context, not proof)`,
      );
    }

    const profileFlag = typeof parsed.flags.profile === "string" ? parsed.flags.profile.trim() : undefined;
    if (profileFlag !== undefined && profileFlag !== "compact" && profileFlag !== "standard" && profileFlag !== "deep") {
      throw new Error(`rekon context task --profile must be compact, standard, or deep (got "${profileFlag}").`);
    }
    const escalationFlag = typeof parsed.flags.escalation === "string"
      ? parsed.flags.escalation.trim()
      : undefined;
    if (escalationFlag !== undefined && escalationFlag !== "validation-failed") {
      throw new Error(`rekon context task --escalation must be validation-failed (got "${escalationFlag}").`);
    }

    // Keep retrieval honesty visible. Two low-signal cases, both surfaced instead
    // of a silent "ok": (a) retrieval ran but every neighbor scored below the
    // useful band, so no embedding context items were selected — report the top
    // candidate's score/band so the operator can judge; (b) the only embedding
    // context selected is weak-band supporting context (no strong/useful neighbor).
    // Visibility only: selection is unchanged and an ignored neighbor is never
    // promoted into context.
    if (records.length > 0 && retrievalResults.length > 0) {
      const nonIgnored = retrievalResults.filter((item) => item.scoreBand !== "ignored");
      const hasStrongOrUseful = nonIgnored.some(
        (item) => item.scoreBand === "strong" || item.scoreBand === "useful",
      );
      const embeddingItems = hasStrongOrUseful
        ? nonIgnored.filter((item) => item.scoreBand === "strong" || item.scoreBand === "useful")
        : nonIgnored.filter((item) => item.scoreBand === "weak");
      if (embeddingItems.length === 0) {
        const top = retrievalResults[0];
        const topDetail = top
          ? ` (top candidate ${top.path ?? top.symbolId ?? top.chunkId ?? "?"} scored ${
              typeof top.score === "number" ? top.score.toFixed(3) : "?"
            }, band ${top.scoreBand ?? "?"})`
          : "";
        warnings.push(
          `retrieval-low-signal: all ${retrievalResults.length} embedding neighbor(s) scored below the useful band${topDetail}, so no embedding context items were selected; build relied on graph + explicit paths (use a real embedding provider for semantic retrieval — the lexical mock provider routinely scores below the band)`,
        );
      } else if (embeddingItems.every((item) => item.scoreBand === "weak")) {
        warnings.push(
          `retrieval-low-signal: the ${embeddingItems.length} selected embedding neighbor(s) are all weak-band supporting context (no strong or useful neighbor); treat them as low-confidence and prefer deterministic graph context`,
        );
      }
    }

    const contractEntries = await store.list("CapabilityContract");
    const latestContractEntry = contractEntries
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const capabilityContract = latestContractEntry
      ? (await store.read(latestContractEntry)) as CapabilityContract
      : undefined;
    const scopedTaskPaths = [...new Set([...paths, ...lexicalContextPaths])];
    const taskPactSelection = await buildCurrentTaskPact(store, {
      repoId: root,
      taskText,
      paths: scopedTaskPaths,
      write: true,
    });
    const contractGuidance = selectTaskContractGuidance({
      paths: scopedTaskPaths,
      graph: graphForContext,
      capabilityContract,
      capabilityContractRef: latestContractEntry,
      taskPact: taskPactSelection.pact,
      taskPactRef: taskPactSelection.ref,
    });
    const contractFreshness = capabilityContract?.header.freshness?.status ?? "unknown";
    if (contractGuidance.matchedContractIds.length > 0 && contractFreshness !== "fresh") {
      warnings.push(
        `repository-contract-${contractFreshness}: selected CapabilityContract guidance is ${contractFreshness}; verify current repository policy before relying on it`,
      );
    }
    warnings.push(...taskPactSelection.warnings);
    warnings.push(...contractGuidance.warnings);
    const taskOperation = await buildCurrentTaskOperation(store, {
      taskText,
      paths: scopedTaskPaths,
      taskPact: taskPactSelection.pact,
      ...(profileFlag ? { requestedProfile: profileFlag as ContextProfile } : {}),
      ...(escalationFlag ? { escalation: escalationFlag as TaskOperationEscalation } : {}),
    });
    warnings.push(...taskOperation.warnings);
    const groundedMemory = await readGroundedMemoryForTask(store, {
      paths: scopedTaskPaths,
      goal: taskText,
      limit: taskOperation.plan.context.profile === "compact"
        ? 3
        : taskOperation.plan.context.profile === "standard"
          ? 5
          : 8,
    });

    const compiled = compileTaskContext({
      taskText,
      paths,
      graph: graphForContext,
      retrievalResults,
      ...(lexicalContextPaths.length > 0 ? { lexicalContextPaths } : {}),
      inputRefs: dedupeArtifactRefs([
        latestGraphEntry,
        ...(latestContractEntry && contractGuidance.matchedContractIds.length > 0
          ? [latestContractEntry]
          : []),
        ...(taskPactSelection.ref ? [taskPactSelection.ref] : []),
        ...groundedMemory.inputRefs,
      ]),
      declaredConstraints: contractGuidance.constraints,
      declaredContextPaths: contractGuidance.requiredContextPaths,
      declaredVerificationHints: contractGuidance.verificationHints,
      groundedMemory: groundedMemory.items.map((item) => ({
        ...item,
        evidenceRefs: item.evidenceRefs.map((ref) => `${ref.type}:${ref.id}`),
      })),
      provider: providerId,
      model,
      topK: effectiveTopK,
      repoId: root,
      profile: taskOperation.plan.context.profile,
      operation: taskOperation.plan,
      warnings,
    });
    const { report } = compiled;
    const projection = projectModelContext(compiled.packet);
    const modelContext = projectModelContextDelivery(projection);

    const ref = await store.write(report, { category: "actions" });
    const contextUsage = buildContextUsageEvent({
      repoId: root,
      report,
      reportRef: ref,
      packet: compiled.packet,
      projection,
      delivery: modelContext,
      channel: "cli",
      ...(taskPactSelection.ref ? { taskPactRef: taskPactSelection.ref } : {}),
    });
    const contextUsageRef = await store.write(contextUsage, { category: "actions" });
    modelContext.contextUsageRef = `${contextUsageRef.type}:${contextUsageRef.id}`;

    // Retrieval status, surfaced so operators (and agents) can tell ranked
    // embedding retrieval apart from the graph + lexical fallback degrade path.
    const retrievalStatus = usedGraphLexicalFallback
      ? { status: "fallback", fallback: "graph-lexical" }
      : retrievalResults.length > 0
        ? { status: "ranked" }
        : { status: "graph-only" };

    if (modelContextOnly) {
      writeOutput(modelContext, true);
    } else if (json) {
      writeOutput(
        {
          command: "context task",
          status: warnings.length > 0 ? "partial" : "ok",
          provider: providerId,
          providerExplicit,
          model,
          artifactFreshness,
          retrieval: retrievalStatus,
          artifact: { type: ref.type, id: ref.id },
          contextUsage: { type: contextUsageRef.type, id: contextUsageRef.id },
          task: report.task,
          operation: taskOperation.plan,
          selection: report.selection,
          summary: report.summary,
          contextItems: report.contextItems,
          graphNeighborhood: report.graphNeighborhood,
          doNotTouch: report.doNotTouch,
          verificationHints: report.verificationHints,
          matchedCapabilityContracts: contractGuidance.matchedContractIds,
          matchedSystemContracts: contractGuidance.matchedSystemContractIds,
          matchedFlowContracts: contractGuidance.matchedFlowContractIds,
          taskPact: taskPactSelection.ref
            ? {
                artifact: { type: taskPactSelection.ref.type, id: taskPactSelection.ref.id },
                impactObligations: contractGuidance.impactObligations,
              }
            : undefined,
          warnings,
          boundaries: report.boundaries,
          agentContext: compiled.packet,
          note: "task-shaped context is proposal/context, not proof; deterministic graph facts outrank embedding similarity; verification hints are hints, not executed commands",
        },
        true,
      );
    } else {
      writeOutput(renderTaskContextMarkdown(compiled.packet, ref.id), false);
    }
    return;
  }

  if (
    command === "capability"
    && subcommand === "ontology"
    && positional === "review"
  ) {
    // `rekon capability ontology review <suggestions|decide|decisions>` —
    // operator-facing review surface for unknown / low-confidence
    // terms produced by CapabilityNormalizationReport. **Append-only.**
    // Does NOT mutate `.rekon/capability-ontology.json`. Does NOT
    // mutate CapabilityMap. Does NOT re-run the normalizer. See
    // docs/artifacts/capability-normalization-review-ledger.md.
    const reviewSubcommand = parsed.positionals[3];
    const store = createLocalArtifactStore(root);
    await store.init();

    if (reviewSubcommand === "suggestions") {
      const reportFlag = typeof parsed.flags.report === "string"
        ? parsed.flags.report.trim()
        : "";
      if (reportFlag.length === 0) {
        throw new Error(
          "rekon capability ontology review suggestions requires --report <CapabilityNormalizationReport-id|type:id>.",
        );
      }
      const limitFlag = typeof parsed.flags.limit === "string"
        ? Number.parseInt(parsed.flags.limit, 10)
        : Number.parseInt(String(parsed.flags.limit ?? ""), 10);
      const limit =
        Number.isFinite(limitFlag) && limitFlag > 0
          ? limitFlag
          : DEFAULT_REVIEW_SUGGESTION_LIMIT;
      const includeDecided = Boolean(parsed.flags["include-decided"]);

      const reportEntry = await findArtifactEntry(store, reportFlag);
      if (reportEntry.type !== "CapabilityNormalizationReport") {
        throw new Error(
          `rekon capability ontology review suggestions --report must reference a CapabilityNormalizationReport; got ${reportEntry.type}.`,
        );
      }
      const report = (await store.read(reportEntry)) as CapabilityNormalizationReport;
      const reportRef: ArtifactRef = {
        type: reportEntry.type,
        id: reportEntry.id,
        path: reportEntry.path,
        digest: reportEntry.digest,
        schemaVersion: reportEntry.schemaVersion ?? "0.1.0",
      };

      let excludeDecidedKeys: Set<string> | undefined;
      if (!includeDecided) {
        const latest = await readLatestReviewLedger(store);
        excludeDecidedKeys = buildDecidedKeySet(latest);
      }

      const suggestions = suggestUnknownTerms(report, {
        limit,
        excludeDecidedKeys,
      });

      if (json) {
        writeOutput(
          {
            kind: "rekon.capability-ontology.review.suggestions",
            reportRef,
            limit,
            includeDecided,
            suggestions,
          },
          true,
        );
      } else {
        const lines: string[] = [];
        lines.push(
          `Capability ontology review suggestions for ${reportRef.type}:${reportRef.id}.`,
        );
        if (excludeDecidedKeys && excludeDecidedKeys.size > 0) {
          lines.push(
            `Excluding ${excludeDecidedKeys.size} term(s) already decided in the latest ledger. Pass --include-decided to override.`,
          );
        }
        if (suggestions.length === 0) {
          lines.push("No outstanding unknown / low-confidence terms.");
        } else {
          lines.push(`Top ${suggestions.length} term(s) by frequency:`);
          for (const suggestion of suggestions) {
            lines.push(
              `  ${suggestion.termKind} "${suggestion.term}" (${suggestion.count}) `
              + `statuses=${suggestion.statuses.join(",")}`,
            );
          }
        }
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    if (reviewSubcommand === "decide") {
      const term = typeof parsed.flags.term === "string" ? parsed.flags.term.trim() : "";
      if (term.length === 0) {
        throw new Error("rekon capability ontology review decide requires --term <text>.");
      }
      const termKindRaw = typeof parsed.flags["term-kind"] === "string"
        ? parsed.flags["term-kind"].trim()
        : "";
      const decisionRaw = typeof parsed.flags.decision === "string"
        ? parsed.flags.decision.trim()
        : "";
      const reason = typeof parsed.flags.reason === "string" ? parsed.flags.reason : "";
      const suggestedCanonical = typeof parsed.flags["suggested-canonical"] === "string"
        ? parsed.flags["suggested-canonical"].trim() || undefined
        : undefined;
      const candidateId = typeof parsed.flags.candidate === "string"
        ? parsed.flags.candidate.trim() || undefined
        : undefined;
      const reportRefFlag = typeof parsed.flags.report === "string"
        ? parsed.flags.report.trim()
        : "";

      if (termKindRaw === "" || !isReviewTermKind(termKindRaw)) {
        throw new Error(
          "rekon capability ontology review decide --term-kind must be one of verb|noun|candidate.",
        );
      }
      if (decisionRaw === "" || !isReviewDecision(decisionRaw)) {
        throw new Error(
          "rekon capability ontology review decide --decision must be one of extend-ontology|rename-symbol|noise-filter|defer.",
        );
      }
      if (reason.trim().length === 0) {
        throw new Error(
          "rekon capability ontology review decide requires --reason <text>.",
        );
      }

      let sourceReportRef: ArtifactRef | undefined;
      if (reportRefFlag.length > 0) {
        const reportEntry = await findArtifactEntry(store, reportRefFlag);
        if (reportEntry.type !== "CapabilityNormalizationReport") {
          throw new Error(
            `rekon capability ontology review decide --report must reference a CapabilityNormalizationReport; got ${reportEntry.type}.`,
          );
        }
        sourceReportRef = {
          type: reportEntry.type,
          id: reportEntry.id,
          path: reportEntry.path,
          digest: reportEntry.digest,
          schemaVersion: reportEntry.schemaVersion ?? "0.1.0",
        };
      }

      const priorLedger = await readLatestReviewLedger(store);
      const generatedAt = new Date().toISOString();
      const ledgerId = priorLedger?.header?.artifactId
        ?? `capability-normalization-review-${generatedAt.replace(/[:.]/g, "-")}`;
      const inputRefs = sourceReportRef ? [sourceReportRef] : (priorLedger?.header?.inputRefs ?? []);
      const header: ArtifactHeader = {
        artifactType: "CapabilityNormalizationReviewLedger",
        artifactId: ledgerId,
        schemaVersion: "0.1.0",
        generatedAt,
        subject: { repoId: root },
        producer: {
          id: "@rekon/cli.capability-ontology-review",
          version: "0.1.0-beta.0",
        },
        inputRefs,
        freshness: { status: "fresh" },
      };

      const ledger = appendCapabilityNormalizationReviewDecision({
        ledger: priorLedger,
        header,
        entry: {
          term,
          termKind: termKindRaw as CapabilityNormalizationReviewTermKind,
          decision: decisionRaw as CapabilityNormalizationReviewDecision,
          reason,
          ...(sourceReportRef ? { sourceReportRef } : {}),
          ...(candidateId ? { sourceCandidateId: candidateId } : {}),
          ...(suggestedCanonical ? { suggestedCanonical } : {}),
        },
      });

      const ref = await store.write(ledger, { category: "actions" });
      const newEntry = ledger.entries[ledger.entries.length - 1] as CapabilityNormalizationReviewEntry;

      if (json) {
        writeOutput(
          {
            artifact: ref,
            entry: newEntry,
            summary: ledger.summary,
          },
          true,
        );
      } else {
        const lines: string[] = [];
        lines.push("Recorded capability normalization review decision:");
        lines.push(`term: ${newEntry.term}`);
        lines.push(`term-kind: ${newEntry.termKind}`);
        lines.push(`decision: ${newEntry.decision}`);
        lines.push(`reason: ${newEntry.reason}`);
        lines.push(`ledger: ${ref.type}:${ref.id}`);
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    if (reviewSubcommand === "decisions") {
      const ledger = await readLatestReviewLedger(store);
      if (!ledger) {
        if (json) {
          writeOutput(
            {
              kind: "rekon.capability-ontology.review.decisions",
              ledger: null,
              entries: [],
              summary: {
                total: 0,
                extendOntology: 0,
                renameSymbol: 0,
                noiseFilter: 0,
                defer: 0,
              },
            },
            true,
          );
        } else {
          writeOutput(
            "No capability normalization review ledger exists yet. Run `rekon capability ontology review decide` first.",
            false,
          );
        }
        return;
      }
      const ref: ArtifactRef = {
        type: "CapabilityNormalizationReviewLedger",
        id: ledger.header.artifactId,
        schemaVersion: ledger.header.schemaVersion,
      };
      if (json) {
        writeOutput(
          {
            kind: "rekon.capability-ontology.review.decisions",
            ledger: ref,
            entries: ledger.entries,
            summary: ledger.summary,
          },
          true,
        );
      } else {
        const lines: string[] = [];
        lines.push(`Capability normalization review ledger: ${ref.type}:${ref.id}.`);
        lines.push(
          `Total: ${ledger.summary.total} (extend-ontology ${ledger.summary.extendOntology}, `
          + `rename-symbol ${ledger.summary.renameSymbol}, `
          + `noise-filter ${ledger.summary.noiseFilter}, `
          + `defer ${ledger.summary.defer}).`,
        );
        for (const entry of ledger.entries) {
          lines.push(
            `  [${entry.decision}] ${entry.termKind} "${entry.term}" — ${entry.reason}`,
          );
        }
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    throw new Error(
      "rekon capability ontology review requires a subcommand: suggestions | decide | decisions.",
    );
  }

  if (
    command === "capability"
    && subcommand === "phrase"
    && positional === "project"
  ) {
    // `rekon capability phrase project --report <ref>
    // [--root <path>] [--json]` — v1 CapabilityPhraseReport
    // projection from a CapabilityNormalizationReport. The phrase
    // report is the **semantic purpose projection**; the
    // normalization report stays as the **translation audit**.
    // CapabilityMap is never mutated. See
    // docs/artifacts/capability-phrase-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const reportFlag = typeof parsed.flags.report === "string"
      ? parsed.flags.report.trim()
      : "";
    if (reportFlag.length === 0) {
      throw new Error(
        "rekon capability phrase project requires --report <CapabilityNormalizationReport-id|type:id>.",
      );
    }

    const reportEntry = await findArtifactEntry(store, reportFlag);
    if (reportEntry.type !== "CapabilityNormalizationReport") {
      throw new Error(
        `rekon capability phrase project --report must reference a CapabilityNormalizationReport; got ${reportEntry.type}.`,
      );
    }

    const normalizationReport = (await store.read(reportEntry)) as CapabilityNormalizationReport;
    const reportRef: ArtifactRef = {
      type: reportEntry.type,
      id: reportEntry.id,
      path: reportEntry.path,
      digest: reportEntry.digest,
      schemaVersion: reportEntry.schemaVersion ?? "0.1.0",
    };

    // Phrase Enrichment v1: optionally consume the latest
    // ObservedRepo + OwnershipMap as deterministic
    // enrichment context. Missing context is not a failure;
    // it just reduces enrichment. No source reads. No AST.
    // No LLM. No mutation of upstream artifacts.
    let observedRepo: ObservedRepo | undefined;
    let observedRepoRef: ArtifactRef | undefined;
    const observedEntries = await store.list("ObservedRepo");
    const latestObservedEntry = observedEntries.at(-1);
    if (latestObservedEntry) {
      try {
        observedRepo = (await store.read(latestObservedEntry)) as ObservedRepo;
        observedRepoRef = {
          type: latestObservedEntry.type,
          id: latestObservedEntry.id,
          path: latestObservedEntry.path,
          digest: latestObservedEntry.digest,
          schemaVersion: latestObservedEntry.schemaVersion ?? "0.1.0",
        };
      } catch {
        observedRepo = undefined;
        observedRepoRef = undefined;
      }
    }

    let ownershipMap: OwnershipMap | undefined;
    let ownershipMapRef: ArtifactRef | undefined;
    const ownershipEntries = await store.list("OwnershipMap");
    const latestOwnershipEntry = ownershipEntries.at(-1);
    if (latestOwnershipEntry) {
      try {
        ownershipMap = (await store.read(latestOwnershipEntry)) as OwnershipMap;
        ownershipMapRef = {
          type: latestOwnershipEntry.type,
          id: latestOwnershipEntry.id,
          path: latestOwnershipEntry.path,
          digest: latestOwnershipEntry.digest,
          schemaVersion: latestOwnershipEntry.schemaVersion ?? "0.1.0",
        };
      } catch {
        ownershipMap = undefined;
        ownershipMapRef = undefined;
      }
    }

    const generatedAt = new Date().toISOString();
    const artifactId = `capability-phrase-${generatedAt.replace(/[:.]/g, "-")}`;
    const header: ArtifactHeader = {
      artifactType: "CapabilityPhraseReport",
      artifactId,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root },
      producer: {
        id: "@rekon/cli.capability-phrase-project",
        version: "0.1.0-beta.0",
      },
      inputRefs: [reportRef],
      freshness: { status: "fresh" },
    };

    const phraseReport: CapabilityPhraseReport = buildCapabilityPhraseReport({
      header,
      normalizationReport,
      normalizationReportRef: reportRef,
      observedRepo,
      observedRepoRef,
      ownershipMap,
      ownershipMapRef,
    });

    const ref = await store.write(phraseReport, { category: "projections" });

    // contextRefs is additive — surfaces which enrichment
    // artifacts the CLI read from the store. The helper only
    // cites the ones it actually consumed in
    // header.inputRefs (e.g. an ObservedRepo may exist but
    // not match any candidate path); contextRefs records the
    // read so operators can see whether enrichment input was
    // available at projection time.
    const contextRefs: {
      observedRepo?: ArtifactRef;
      ownershipMap?: ArtifactRef;
    } = {};
    if (observedRepoRef) contextRefs.observedRepo = observedRepoRef;
    if (ownershipMapRef) contextRefs.ownershipMap = ownershipMapRef;

    const consumedObservedRepoRef = phraseReport.header.inputRefs.find(
      (entry) => entry.type === "ObservedRepo",
    );
    const consumedOwnershipMapRef = phraseReport.header.inputRefs.find(
      (entry) => entry.type === "OwnershipMap",
    );

    if (json) {
      writeOutput(
        {
          artifact: ref,
          sourceNormalizationReportRef: reportRef,
          contextRefs,
          summary: phraseReport.summary,
          phrases: phraseReport.phrases,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Capability phrase projection");
      lines.push("");
      lines.push(`Source: ${reportRef.type}:${reportRef.id}`);
      if (consumedObservedRepoRef) {
        lines.push(`Context: ObservedRepo:${consumedObservedRepoRef.id}`);
      } else if (observedRepoRef) {
        lines.push(`Context available (not consumed): ObservedRepo:${observedRepoRef.id}`);
      }
      if (consumedOwnershipMapRef) {
        lines.push(`Context: OwnershipMap:${consumedOwnershipMapRef.id}`);
      } else if (ownershipMapRef) {
        lines.push(`Context available (not consumed): OwnershipMap:${ownershipMapRef.id}`);
      }
      lines.push(`Phrases: ${phraseReport.summary.totalPhrases}`);
      lines.push(`Stable: ${phraseReport.summary.stable}`);
      lines.push(`Partial: ${phraseReport.summary.partial}`);
      lines.push(`Low confidence: ${phraseReport.summary.lowConfidence}`);
      lines.push(
        `Enrichment: withDomain ${phraseReport.summary.withDomain}, withPattern ${phraseReport.summary.withPattern}, withLayer ${phraseReport.summary.withLayer}`,
      );
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push("CapabilityMap remains unchanged.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (
    command === "capability"
    && subcommand === "contract"
    && positional === "generate"
  ) {
    // `rekon capability contract generate
    // [--root <path>] [--json] [--capability-map <ref>]` —
    // v1 CapabilityContract policy artifact emission.
    // Reads the latest (or specified) CapabilityMap v2 and
    // an optional `.rekon/capability-contracts.json`
    // config and writes an effective contract artifact.
    //
    // Diagnostic only. Does not lint, route, gate, or
    // verify by capability. CapabilityMap is never
    // mutated. Config is never mutated. Source is never
    // mutated. See
    // docs/strategy/capability-contract-architecture-decision.md
    // and docs/artifacts/capability-contract.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const capabilityMapFlag = typeof parsed.flags["capability-map"] === "string"
      ? parsed.flags["capability-map"].trim()
      : "";

    let capabilityMapEntry: ArtifactIndexEntry | undefined;
    if (capabilityMapFlag.length > 0) {
      capabilityMapEntry = await findArtifactEntry(store, capabilityMapFlag);
      if (capabilityMapEntry.type !== "CapabilityMap") {
        throw new Error(
          `rekon capability contract generate --capability-map must reference a CapabilityMap; got ${capabilityMapEntry.type}.`,
        );
      }
    } else {
      const mapEntries = await store.list("CapabilityMap");
      capabilityMapEntry = mapEntries.at(-1);
      if (!capabilityMapEntry) {
        throw new Error(
          "rekon capability contract generate: no CapabilityMap found. Run `rekon refresh` (or `rekon project`) first.",
        );
      }
    }

    const capabilityMap = (await store.read(capabilityMapEntry)) as CapabilityMap;
    const capabilityMapRef: ArtifactRef = {
      type: capabilityMapEntry.type,
      id: capabilityMapEntry.id,
      path: capabilityMapEntry.path,
      digest: capabilityMapEntry.digest,
      schemaVersion: capabilityMapEntry.schemaVersion ?? "0.1.0",
    };

    // Optional .rekon/capability-contracts.json — missing is fine.
    const configRelative = ".rekon/capability-contracts.json";
    const configPath = resolve(root, configRelative);
    let config: CapabilityContractConfig | undefined;
    let configHash: string | undefined;
    let configPresent = false;
    try {
      const raw = await readFile(configPath, "utf8");
      configPresent = true;
      try {
        const parsedConfig = JSON.parse(raw) as unknown;
        if (parsedConfig && typeof parsedConfig === "object") {
          config = parsedConfig as CapabilityContractConfig;
        }
      } catch (error) {
        throw new Error(
          `rekon capability contract generate: failed to parse ${configRelative}: ${(error as Error).message}`,
        );
      }
      // Canonical-JSON hash of the consumed config so a
      // future safety review can diff what we generated
      // against what shipped.
      configHash = `sha256:${sha256Hex(JSON.stringify(canonicalJson(config ?? null)))}`;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    // Optional CapabilityPhraseReport input ref — surfaced
    // when the CapabilityMap consumed one (v2). Stamped
    // into source.phraseReportRef + header.inputRefs.
    let phraseReportRef: ArtifactRef | undefined;
    if (capabilityMap.phraseSourceRef) {
      phraseReportRef = capabilityMap.phraseSourceRef;
    } else {
      const phraseEntries = await store.list("CapabilityPhraseReport");
      const latestPhrase = phraseEntries.at(-1);
      if (latestPhrase) {
        phraseReportRef = {
          type: latestPhrase.type,
          id: latestPhrase.id,
          path: latestPhrase.path,
          digest: latestPhrase.digest,
          schemaVersion: latestPhrase.schemaVersion ?? "0.1.0",
        };
      }
    }

    const generatedAt = new Date().toISOString();
    const contract = buildCapabilityContract({
      capabilityMap,
      capabilityMapRef,
      config,
      configPath: configPresent ? configRelative : undefined,
      configHash,
      generatedAt,
      phraseReportRef,
    });

    const ref = await store.write(contract, { category: "actions" });

    if (json) {
      writeOutput(
        {
          artifact: ref,
          source: contract.source,
          summary: contract.summary,
          contracts: contract.contracts,
          configPresent,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Capability contract generation");
      lines.push("");
      lines.push(`CapabilityMap: ${capabilityMapRef.type}:${capabilityMapRef.id}`);
      if (configPresent) {
        lines.push(`Config: ${configRelative}`);
      } else {
        lines.push(`Config: (none — missing config is allowed)`);
      }
      if (phraseReportRef) {
        lines.push(`PhraseReport: ${phraseReportRef.type}:${phraseReportRef.id}`);
      }
      lines.push("");
      lines.push(`Total: ${contract.summary.total}`);
      lines.push(`Configured: ${contract.summary.configured}`);
      lines.push(`Unmatched: ${contract.summary.unmatched}`);
      lines.push(
        `Policy: requiredChecks ${contract.summary.withRequiredChecks}, placement ${contract.summary.withPlacementRules}, preservation ${contract.summary.withPreservationRules}`,
      );
      lines.push("");
      lines.push(`Artifact: ${ref.type}:${ref.id}`);
      lines.push("CapabilityMap remains unchanged. Config remains unchanged.");
      lines.push(
        "Diagnostic only. No architecture linting, resolver routing, or verification planning by capability in v1.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (
    command === "capability"
    && subcommand === "lint"
    && positional === "architecture"
  ) {
    // `rekon capability lint architecture
    // [--root <path>] [--json]
    // [--capability-contract <ref>] [--capability-map <ref>]` —
    // v1 capability-aware architecture lint evaluation.
    //
    // Reads the latest (or specified) `CapabilityContract`
    // and `CapabilityMap`, evaluates `allowedLayers` /
    // `forbiddenLayers` / `allowedSystems` /
    // `forbiddenSystems` rules from configured contract
    // rows, and writes a `CapabilityArchitectureLintReport`
    // evaluation artifact.
    //
    // **Evaluation, not enforcement.** This command does
    // **not** write `FindingReport`, mutate
    // `FindingFilterReport`, `FindingLifecycleReport`, or
    // `CoherencyDelta`. It does **not** add resolver
    // routing, verification planning, or source writes.
    // See
    // docs/strategy/capability-aware-architecture-linting-decision.md
    // and docs/artifacts/capability-architecture-lint-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const contractFlag
      = typeof parsed.flags["capability-contract"] === "string"
        ? parsed.flags["capability-contract"].trim()
        : "";
    const capabilityMapFlag
      = typeof parsed.flags["capability-map"] === "string"
        ? parsed.flags["capability-map"].trim()
        : "";

    let contractEntry: ArtifactIndexEntry | undefined;
    if (contractFlag.length > 0) {
      contractEntry = await findArtifactEntry(store, contractFlag);
      if (contractEntry.type !== "CapabilityContract") {
        throw new Error(
          `rekon capability lint architecture --capability-contract must reference a CapabilityContract; got ${contractEntry.type}.`,
        );
      }
    } else {
      const contractEntries = await store.list("CapabilityContract");
      contractEntry = contractEntries.at(-1);
      if (!contractEntry) {
        throw new Error(
          "rekon capability lint architecture: no CapabilityContract found. Run `rekon capability contract generate` first.",
        );
      }
    }

    let capabilityMapEntry: ArtifactIndexEntry | undefined;
    if (capabilityMapFlag.length > 0) {
      capabilityMapEntry = await findArtifactEntry(store, capabilityMapFlag);
      if (capabilityMapEntry.type !== "CapabilityMap") {
        throw new Error(
          `rekon capability lint architecture --capability-map must reference a CapabilityMap; got ${capabilityMapEntry.type}.`,
        );
      }
    } else {
      const mapEntries = await store.list("CapabilityMap");
      capabilityMapEntry = mapEntries.at(-1);
      if (!capabilityMapEntry) {
        throw new Error(
          "rekon capability lint architecture: no CapabilityMap found. Run `rekon refresh` (or `rekon project`) first.",
        );
      }
    }

    const capabilityContract = (await store.read(contractEntry)) as CapabilityContract;
    const capabilityMap = (await store.read(capabilityMapEntry)) as CapabilityMap;
    const capabilityContractRef: ArtifactRef = {
      type: contractEntry.type,
      id: contractEntry.id,
      path: contractEntry.path,
      digest: contractEntry.digest,
      schemaVersion: contractEntry.schemaVersion ?? "0.1.0",
    };
    const capabilityMapRef: ArtifactRef = {
      type: capabilityMapEntry.type,
      id: capabilityMapEntry.id,
      path: capabilityMapEntry.path,
      digest: capabilityMapEntry.digest,
      schemaVersion: capabilityMapEntry.schemaVersion ?? "0.1.0",
    };

    const report = buildCapabilityArchitectureLintReport({
      capabilityContract,
      capabilityContractRef,
      capabilityMap,
      capabilityMapRef,
      generatedAt: new Date().toISOString(),
    });

    const ref = await store.write(report, { category: "findings" });

    if (json) {
      writeOutput(
        {
          artifact: ref,
          source: report.source,
          summary: report.summary,
          rows: report.rows,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Capability architecture lint");
      lines.push("");
      lines.push(`Contracts: ${capabilityContractRef.type}:${capabilityContractRef.id}`);
      lines.push(`CapabilityMap: ${capabilityMapRef.type}:${capabilityMapRef.id}`);
      lines.push("");
      lines.push(`Rows: ${report.summary.total}`);
      lines.push(`Violations: ${report.summary.violations}`);
      lines.push(`Passes: ${report.summary.passes}`);
      lines.push(`Not evaluated: ${report.summary.notEvaluated}`);
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push("No findings were written.");
      lines.push(
        "Evaluation only. CapabilityContract, CapabilityMap, FindingReport, FindingLifecycleReport, and CoherencyDelta are not mutated.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (
    command === "capability"
    && subcommand === "lint"
    && positional === "bridge-findings"
  ) {
    // `rekon capability lint bridge-findings
    // [--root <path>] [--json] [--lint-report <ref>]` —
    // v1 preview bridge from `CapabilityArchitectureLintReport`
    // to proposed governed findings.
    //
    // Reads the latest (or pinned) `CapabilityArchitectureLintReport`,
    // classifies each lint row as eligible / ineligible /
    // needs-review for a future `FindingReport` writer, and
    // writes a `CapabilityLintFindingBridgeReport` preview
    // artifact.
    //
    // **Preview, not FindingReport.** This command does **not**
    // write `FindingReport`, mutate `FindingFilterReport`,
    // `FindingLifecycleReport`, `IssueAdjudicationReport`, or
    // `CoherencyDelta`. It creates no `WorkOrder` and no
    // `VerificationPlan`. It reads no source files. See
    // docs/strategy/capability-lint-finding-bridge-decision.md
    // and docs/artifacts/capability-lint-finding-bridge-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const lintReportFlag
      = typeof parsed.flags["lint-report"] === "string"
        ? parsed.flags["lint-report"].trim()
        : "";

    let lintEntry: ArtifactIndexEntry | undefined;
    if (lintReportFlag.length > 0) {
      lintEntry = await findArtifactEntry(store, lintReportFlag);
      if (lintEntry.type !== "CapabilityArchitectureLintReport") {
        throw new Error(
          `rekon capability lint bridge-findings --lint-report must reference a CapabilityArchitectureLintReport; got ${lintEntry.type}.`,
        );
      }
    } else {
      const lintEntries = await store.list("CapabilityArchitectureLintReport");
      lintEntry = lintEntries.at(-1);
      if (!lintEntry) {
        throw new Error(
          "rekon capability lint bridge-findings: no CapabilityArchitectureLintReport found. Run `rekon capability lint architecture` first.",
        );
      }
    }

    const lintReport = (await store.read(lintEntry)) as CapabilityArchitectureLintReport;
    const lintReportRef: ArtifactRef = {
      type: lintEntry.type,
      id: lintEntry.id,
      path: lintEntry.path,
      digest: lintEntry.digest,
      schemaVersion: lintEntry.schemaVersion ?? "0.1.0",
    };

    const report: CapabilityLintFindingBridgeReport
      = buildCapabilityLintFindingBridgeReport({
        lintReport,
        lintReportRef,
        generatedAt: new Date().toISOString(),
      });

    // Preview artifact: written under `actions/`, never under
    // `findings/`. It is not a governed FindingReport.
    const ref = await store.write(report, { category: "actions" });

    if (json) {
      writeOutput(
        {
          artifact: ref,
          source: report.source,
          summary: report.summary,
          candidates: report.candidates,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Capability lint finding bridge");
      lines.push("");
      lines.push(`Lint report: ${lintReportRef.type}:${lintReportRef.id}`);
      lines.push("");
      lines.push(`Eligible: ${report.summary.eligible}`);
      lines.push(`Ineligible: ${report.summary.ineligible}`);
      lines.push(`Needs review: ${report.summary.needsReview}`);
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push("No FindingReport entries were written.");
      lines.push(
        "Preview only. FindingReport, FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, and CoherencyDelta are not mutated. No WorkOrder or VerificationPlan is created.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (
    command === "capability"
    && subcommand === "lint"
    && positional === "lifecycle-preview"
  ) {
    // `rekon capability lint lifecycle-preview [--root <path>]
    // [--json] [--finding-report <ref>]` — v1 preview modeling how
    // bridge-derived `FindingReport` entries WOULD enter the finding
    // filter / lifecycle / adjudication / CoherencyDelta chain. It
    // writes a `BridgeFindingLifecycleIntegrationReport` preview
    // artifact.
    //
    // **Preview, not FindingLifecycleReport.** This command does
    // **not** mutate `FindingFilterReport`, `FindingLifecycleReport`,
    // `IssueAdjudicationReport`, or `CoherencyDelta`. It creates no
    // `WorkOrder` and no `VerificationPlan`. It reads no source
    // files. See
    // docs/strategy/bridge-finding-lifecycle-integration-decision.md
    // and docs/artifacts/bridge-finding-lifecycle-integration-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const findingReportFlag
      = typeof parsed.flags["finding-report"] === "string"
        ? parsed.flags["finding-report"].trim()
        : "";

    let findingEntry: ArtifactIndexEntry | undefined;
    if (findingReportFlag.length > 0) {
      findingEntry = await findArtifactEntry(store, findingReportFlag);
      if (findingEntry.type !== "FindingReport") {
        throw new Error(
          `rekon capability lint lifecycle-preview --finding-report must reference a FindingReport; got ${findingEntry.type}.`,
        );
      }
    } else {
      const findingEntries = await store.list("FindingReport");
      findingEntry = findingEntries.at(-1);
      if (!findingEntry) {
        throw new Error(
          "rekon capability lint lifecycle-preview: no FindingReport found. Write bridge-derived findings with `rekon capability lint write-findings --confirm-finding-write` (or run `rekon refresh`) first.",
        );
      }
    }

    const findingReport = (await store.read(
      findingEntry,
    )) as BridgeFindingLifecycleFindingReportLike;
    const findingReportRef: ArtifactRef = {
      type: findingEntry.type,
      id: findingEntry.id,
      path: findingEntry.path,
      digest: findingEntry.digest,
      schemaVersion: findingEntry.schemaVersion ?? "0.1.0",
    };

    const report: BridgeFindingLifecycleIntegrationReport
      = buildBridgeFindingLifecycleIntegrationReport({
        findingReport,
        findingReportRef,
        generatedAt: new Date().toISOString(),
      });

    // Preview artifact: written under `actions/`, never under
    // `findings/`. It is not a FindingLifecycleReport.
    const ref = await store.write(report, { category: "actions" });

    if (json) {
      writeOutput(
        {
          artifact: { type: ref.type, id: ref.id },
          source: report.source,
          summary: report.summary,
          entries: report.entries,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Bridge finding lifecycle integration preview");
      lines.push("");
      lines.push(
        `FindingReport: ${findingReportRef.type}:${findingReportRef.id}`,
      );
      lines.push("");
      lines.push(
        `Bridge-derived findings: ${report.summary.totalBridgeFindings}`,
      );
      lines.push(`Ready for lifecycle: ${report.summary.readyForLifecycle}`);
      lines.push(`Needs review: ${report.summary.needsReview}`);
      lines.push(`Duplicate: ${report.summary.duplicate}`);
      lines.push(`Ineligible: ${report.summary.ineligible}`);
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push(
        "Preview only. No FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta artifacts were changed. FindingFilterReport is not mutated. No WorkOrder or VerificationPlan is created.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (
    command === "capability"
    && subcommand === "lint"
    && positional === "write-findings"
  ) {
    // `rekon capability lint write-findings
    // --bridge-report <id|type:id>
    // (--dry-run | --confirm-finding-write) [--root <path>] [--json]`
    // — the CapabilityLintFindingBridgeReport -> FindingReport
    // writer. Reads a `CapabilityLintFindingBridgeReport`, selects
    // eligible candidates via the dry-run preview, and either
    // previews the proposed `FindingReport` body (`--dry-run`) or
    // writes exactly one new `FindingReport` artifact
    // (`--confirm-finding-write`).
    //
    // **Two modes.** `--dry-run` previews the proposed
    // `FindingReport` body and writes nothing.
    // `--confirm-finding-write` writes exactly one new
    // `FindingReport` artifact (the proposed body) and nothing
    // else. The two flags are mutually exclusive; the ambiguous
    // `--write` / `--send` / `--execute` aliases are rejected.
    //
    // **Bounded mutation.** Write mode writes a single new
    // `FindingReport` only. It does **not** mutate an existing
    // `FindingReport`, `FindingFilterReport`,
    // `FindingLifecycleReport`, `IssueAdjudicationReport`, or
    // `CoherencyDelta`. It creates no `WorkOrder` and no
    // `VerificationPlan`. It writes no source files. See
    // docs/strategy/capability-lint-finding-writer-mode-decision.md.
    const dryRun = parsed.flags["dry-run"] === true;
    const confirmWrite = parsed.flags["confirm-finding-write"] === true;

    const rejectedFlags = ["write", "send", "execute"].filter(
      (flag) => parsed.flags[flag] === true,
    );
    if (rejectedFlags.length > 0) {
      throw new Error(
        `rekon capability lint write-findings: ${rejectedFlags
          .map((flag) => `--${flag}`)
          .join(", ")} ${rejectedFlags.length > 1 ? "are" : "is"} not accepted. `
          + "Use --dry-run (preview) or --confirm-finding-write (write a new FindingReport).",
      );
    }
    if (dryRun && confirmWrite) {
      throw new Error(
        "rekon capability lint write-findings: --dry-run and --confirm-finding-write are mutually exclusive.",
      );
    }
    if (!dryRun && !confirmWrite) {
      throw new Error(
        "rekon capability lint write-findings requires --dry-run (preview only) "
          + "or --confirm-finding-write (write a new FindingReport).",
      );
    }

    const bridgeReportFlag
      = typeof parsed.flags["bridge-report"] === "string"
        ? parsed.flags["bridge-report"].trim()
        : "";
    if (bridgeReportFlag.length === 0) {
      throw new Error(
        "rekon capability lint write-findings requires --bridge-report <CapabilityLintFindingBridgeReport id|type:id>.",
      );
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const bridgeEntry = await findArtifactEntry(store, bridgeReportFlag);
    if (bridgeEntry.type !== "CapabilityLintFindingBridgeReport") {
      throw new Error(
        `rekon capability lint write-findings --bridge-report must reference a CapabilityLintFindingBridgeReport; got ${bridgeEntry.type}.`,
      );
    }

    const bridgeReport
      = (await store.read(bridgeEntry)) as CapabilityLintFindingBridgeReport;
    const bridgeReportRef: ArtifactRef = {
      type: bridgeEntry.type,
      id: bridgeEntry.id,
      path: bridgeEntry.path,
      digest: bridgeEntry.digest,
      schemaVersion: bridgeEntry.schemaVersion ?? "0.1.0",
    };

    // Both modes build the dry-run preview first; write mode is
    // "preview + persist".
    const preview = buildFindingReportWritePreview({
      bridgeReport,
      bridgeReportRef,
      generatedAt: new Date().toISOString(),
    });

    if (!confirmWrite) {
      // Dry-run path: preview only, writes nothing.
      if (json) {
        writeOutput(preview, true);
      } else {
        const lines: string[] = [];
        lines.push("Capability lint FindingReport writer dry-run");
        lines.push("");
        lines.push(`Bridge report: ${bridgeReportRef.type}:${bridgeReportRef.id}`);
        lines.push(`Would write FindingReport: no`);
        lines.push(`Proposed findings: ${preview.summary.proposedFindings}`);
        lines.push(`Skipped candidates: ${preview.summary.skipped}`);
        lines.push("");
        lines.push("No FindingReport entries were written.");
        lines.push(
          "Dry-run only. Use --confirm-finding-write to write a new FindingReport.",
        );
        lines.push(
          "FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, and CoherencyDelta are not mutated. No WorkOrder or VerificationPlan is created.",
        );
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    // Write mode (--confirm-finding-write). Before-write safety
    // checks: the dry-run preview must produce at least one
    // finding, every finding id must be unique, and every finding
    // must carry evidenceRefs.
    const proposed = preview.proposedFindingReport.findings;
    if (proposed.length === 0) {
      throw new Error(
        "rekon capability lint write-findings --confirm-finding-write: the dry-run preview produced 0 eligible findings. "
          + "Nothing to write; no FindingReport was created.",
      );
    }
    const proposedIds = proposed.map((finding) => finding.id);
    if (new Set(proposedIds).size !== proposedIds.length) {
      throw new Error(
        "rekon capability lint write-findings --confirm-finding-write: duplicate proposed finding ids; refusing to write.",
      );
    }
    if (
      proposed.some(
        (finding) => !finding.evidenceRefs || finding.evidenceRefs.length === 0,
      )
    ) {
      throw new Error(
        "rekon capability lint write-findings --confirm-finding-write: a proposed finding is missing evidenceRefs; refusing to write.",
      );
    }

    // Map the preview findings to the governed Finding shape. The
    // category becomes the finding `type`; the bridge trace fields
    // are preserved under `details`.
    const writtenFindings = proposed.map((finding) => ({
      id: finding.id,
      type: finding.category,
      title: finding.title,
      description:
        `Capability-architecture policy finding for contract "${finding.sourceContractId}" `
        + `(capability "${finding.sourcePhraseCapabilityId}"), promoted from CapabilityLintFindingBridgeReport.`,
      severity: finding.severity,
      subjects: [finding.sourceContractId],
      evidence: finding.evidenceRefs,
      details: {
        source: preview.proposedFindingReport.source,
        sourceBridgeCandidateId: finding.sourceBridgeCandidateId,
        sourceLintRowId: finding.sourceLintRowId,
        sourceContractId: finding.sourceContractId,
        sourcePhraseCapabilityId: finding.sourcePhraseCapabilityId,
      },
    }));

    const findingReportHeader: ArtifactHeader = {
      schemaVersion: "0.1.0",
      artifactType: "FindingReport",
      artifactId: `finding-report-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      subject: bridgeReport.header.subject,
      producer: { id: "@rekon/capability-model", version: "0.1.0" },
      inputRefs: preview.proposedFindingReport.inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    };

    const findingReport = createFindingReport({
      header: findingReportHeader,
      findings: writtenFindings,
    });
    const findingReportRef = await store.write(findingReport, {
      category: "findings",
    });

    if (json) {
      writeOutput(
        {
          dryRun: false,
          wouldWrite: true,
          artifact: { type: findingReportRef.type, id: findingReportRef.id },
          source: {
            bridgeReportRef: {
              type: bridgeReportRef.type,
              id: bridgeReportRef.id,
            },
          },
          summary: {
            writtenFindings: findingReport.findings.length,
            skippedCandidates: preview.summary.skipped,
          },
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Capability lint FindingReport writer");
      lines.push("");
      lines.push(`Bridge report: ${bridgeReportRef.type}:${bridgeReportRef.id}`);
      lines.push(`Written findings: ${findingReport.findings.length}`);
      lines.push(`Skipped candidates: ${preview.summary.skipped}`);
      lines.push("");
      lines.push(`FindingReport: ${findingReportRef.type}:${findingReportRef.id}`);
      lines.push(
        "No lifecycle, CoherencyDelta, WorkOrder, or VerificationPlan artifacts were changed.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (
    command === "capability"
    && subcommand === "ontology"
    && positional === "suggestions"
  ) {
    // `rekon capability ontology suggestions
    // [--ledger <ref>] [--root <path>] [--json]` — preview-only
    // proposal for `.rekon/capability-ontology.json` based on
    // `extend-ontology` decisions in the latest
    // CapabilityNormalizationReviewLedger. **Never** mutates
    // the config file. See
    // docs/artifacts/capability-ontology-suggestion-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const ledgerFlag = typeof parsed.flags.ledger === "string"
      ? parsed.flags.ledger.trim()
      : "";

    let ledger: CapabilityNormalizationReviewLedger | undefined;
    let ledgerEntry: ArtifactIndexEntry | undefined;
    if (ledgerFlag.length > 0) {
      const entry = await findArtifactEntry(store, ledgerFlag);
      if (entry.type !== "CapabilityNormalizationReviewLedger") {
        throw new Error(
          `rekon capability ontology suggestions --ledger must reference a CapabilityNormalizationReviewLedger; got ${entry.type}.`,
        );
      }
      ledgerEntry = entry;
      const raw = (await store.read(entry)) as unknown;
      const result = validateCapabilityNormalizationReviewLedger(raw);
      if (!result.ok) {
        throw new Error(
          `Pinned CapabilityNormalizationReviewLedger is invalid: ${result.reason}`,
        );
      }
      ledger = result.ledger;
    } else {
      const entries = await store.list("CapabilityNormalizationReviewLedger");
      if (entries.length > 0) {
        ledgerEntry = entries.at(-1)!;
        const raw = (await store.read(ledgerEntry)) as unknown;
        const result = validateCapabilityNormalizationReviewLedger(raw);
        if (!result.ok) {
          throw new Error(
            `Latest CapabilityNormalizationReviewLedger is invalid: ${result.reason}`,
          );
        }
        ledger = result.ledger;
      }
    }

    if (!ledger || !ledgerEntry) {
      throw new Error(
        "rekon capability ontology suggestions: no CapabilityNormalizationReviewLedger exists. Run `rekon capability ontology review decide` first.",
      );
    }

    const ledgerRef: ArtifactRef = {
      type: ledgerEntry.type,
      id: ledgerEntry.id,
      path: ledgerEntry.path,
      digest: ledgerEntry.digest,
      schemaVersion: ledgerEntry.schemaVersion ?? "0.1.0",
    };

    const existingConfigResult = await loadCapabilityOntologyConfig(root);
    const existingConfig = existingConfigResult.found
      ? existingConfigResult.config
      : undefined;

    const generatedAt = new Date().toISOString();
    const artifactId = `capability-ontology-suggestions-${generatedAt.replace(/[:.]/g, "-")}`;
    const header: ArtifactHeader = {
      artifactType: "CapabilityOntologySuggestionReport",
      artifactId,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root },
      producer: {
        id: "@rekon/cli.capability-ontology-suggestions",
        version: "0.1.0-beta.0",
      },
      inputRefs: [ledgerRef],
      freshness: { status: "fresh" },
    };

    const report: CapabilityOntologySuggestionReport = buildCapabilityOntologySuggestionReport({
      header,
      ledger,
      ledgerRef,
      existingConfig,
    });

    const ref = await store.write(report, { category: "actions" });

    if (json) {
      writeOutput(
        {
          artifact: ref,
          ledgerRef,
          summary: report.summary,
          suggestions: report.suggestions,
          skipped: report.skipped,
          preview: report.preview,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Capability ontology suggestions");
      lines.push("");
      lines.push(`Suggestions: ${report.summary.total}`);
      if (report.suggestions.length > 0) {
        for (const suggestion of report.suggestions) {
          if (suggestion.kind === "add-canonical-verb") {
            lines.push(`- add canonical verb: ${suggestion.term}`);
          } else if (suggestion.kind === "add-canonical-noun") {
            lines.push(`- add canonical noun: ${suggestion.term}`);
          } else if (suggestion.kind === "add-verb-alias") {
            lines.push(`- add verb alias: ${suggestion.term} -> ${suggestion.canonical ?? "?"}`);
          } else if (suggestion.kind === "add-noun-alias") {
            lines.push(`- add noun alias: ${suggestion.term} -> ${suggestion.canonical ?? "?"}`);
          }
        }
      }
      if (report.skipped.length > 0) {
        lines.push("");
        lines.push(`Skipped: ${report.skipped.length}`);
        for (const entry of report.skipped) {
          lines.push(`- ${entry.termKind} "${entry.term}" — ${entry.reason}`);
        }
      }
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push("Config remains unchanged.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "observe") {
    const runtime = await createDefaultRuntime(root);
    const changedFiles = parseRepeatableFlag(parsed.flags["changed-file"]);
    const ref = await runtime.runObserve({
      changedFiles: changedFiles.length > 0 ? changedFiles : undefined,
      incremental: changedFiles.length > 0,
    });
    writeOutput({ artifact: ref }, json);
    return;
  }

  if (command === "snapshot") {
    const runtime = await createDefaultRuntime(root);
    const ref = await runtime.runSnapshot();
    writeOutput({ artifact: ref }, json);
    return;
  }

  if (command === "project") {
    const runtime = await createDefaultRuntime(root);
    const existingEvidence = await runtime.artifacts.list("EvidenceGraph");

    if (existingEvidence.length === 0) {
      await runtime.runObserve();
    }

    const refs = await runtime.runProject();
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "checks" && subcommand === "ingest") {
    const commandName = "rekon checks ingest";
    const junitPath = typeof parsed.flags.junit === "string" ? parsed.flags.junit.trim() : "";
    const eslintPath = typeof parsed.flags["eslint-json"] === "string" ? parsed.flags["eslint-json"].trim() : "";
    const verificationRunFlag = parsed.flags["verification-run"];
    if (verificationRunFlag !== undefined && typeof verificationRunFlag !== "string") {
      throw new Error(`${commandName} requires exactly one ref after --verification-run.`);
    }
    if ([junitPath, eslintPath].filter(Boolean).length !== 1) {
      throw new Error(`${commandName} requires exactly one of --junit <report.xml> or --eslint-json <report.json>.`);
    }

    const store = createLocalArtifactStore(root);
    await store.init();
    const evidenceEntry = (await store.list("EvidenceGraph")).at(-1);
    if (!evidenceEntry) throw new Error(`${commandName} requires an EvidenceGraph. Run 'rekon observe' first.`);
    const evidenceGraph = await store.read(evidenceEntry) as { header?: ArtifactHeader };
    if (!evidenceGraph.header) throw new Error(`${commandName} could not read a valid EvidenceGraph header.`);
    const evidenceRef: ArtifactRef = {
      type: evidenceEntry.type,
      id: evidenceEntry.id,
      path: evidenceEntry.path,
      digest: evidenceEntry.digest,
      schemaVersion: evidenceEntry.schemaVersion ?? "0.1.0",
    };
    const linkedVerificationRun = await resolveOptionalIngestionVerificationRun(
      store,
      verificationRunFlag,
      commandName,
      evidenceGraph.header.subject.repoId,
    );
    const inputRefs = linkedVerificationRun ? [evidenceRef, linkedVerificationRun.ref] : [evidenceRef];
    const sourcePath = junitPath || eslintPath;
    const sourceKind = junitPath ? "JUnit XML" : "ESLint JSON";
    const reportFile = await resolveReadableRepoFile(root, sourcePath, commandName, `${sourceKind} report`);
    const raw = await readFile(reportFile.absolutePath, "utf8");
    const digest = createHash("sha256").update(raw).digest("hex");
    const artifactType = junitPath ? "TestReport" : "LintReport";
    const header: ArtifactHeader = {
      artifactType,
      artifactId: `${artifactType === "TestReport" ? "test" : "lint"}-report-${digest.slice(0, 24)}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      subject: evidenceGraph.header.subject,
      producer: { id: "@rekon/cli.checks-ingest", version: "1.0.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: {
        confidence: 1,
        notes: [
          `Normalized from repository-local ${sourceKind} without executing the tool or persisting the raw payload.`,
          ...(linkedVerificationRun
            ? [`Associated with explicitly selected ${linkedVerificationRun.ref.type}:${linkedVerificationRun.ref.id}.`]
            : []),
        ],
      },
    };
    const commonInput = { repoRoot: resolve(root), sourcePath: reportFile.relativePath, sourceDigest: digest, header };
    if (junitPath) {
      const result = parseJUnitReport({ ...commonInput, xml: raw });
      if (!result.valid || !result.report) throw new Error(`${commandName} rejected the report:\n${result.issues.map((issue) => `- ${issue.code}: ${issue.message}`).join("\n")}`);
      const ref = await store.write(result.report satisfies TestReport, { category: "actions" });
      writeOutput({ artifact: ref, summary: result.report.summary, status: result.report.status, issues: result.issues }, json);
      return;
    }
    let eslint: unknown;
    try {
      eslint = JSON.parse(raw);
    } catch {
      throw new Error(`${commandName} requires valid ESLint JSON.`);
    }
    const result = parseEslintJsonReport({ ...commonInput, report: eslint });
    if (!result.valid || !result.report) throw new Error(`${commandName} rejected the report:\n${result.issues.map((issue) => `- ${issue.code}: ${issue.message}`).join("\n")}`);
    const ref = await store.write(result.report satisfies LintReport, { category: "actions" });
    writeOutput({ artifact: ref, summary: result.report.summary, status: result.report.status, issues: result.issues }, json);
    return;
  }

  if (command === "security" && subcommand === "ingest") {
    const commandName = "rekon security ingest";
    const sarifPath = typeof parsed.flags.sarif === "string" ? parsed.flags.sarif.trim() : "";
    const npmAuditPath = typeof parsed.flags["npm-audit"] === "string" ? parsed.flags["npm-audit"].trim() : "";
    const pnpmAuditPath = typeof parsed.flags["pnpm-audit"] === "string" ? parsed.flags["pnpm-audit"].trim() : "";
    const yarnAuditPath = typeof parsed.flags["yarn-audit"] === "string" ? parsed.flags["yarn-audit"].trim() : "";
    const osvPath = typeof parsed.flags.osv === "string" ? parsed.flags.osv.trim() : "";
    const dependencyInputs = [npmAuditPath, pnpmAuditPath, yarnAuditPath, osvPath].filter(Boolean);
    if ([sarifPath, ...dependencyInputs].filter(Boolean).length !== 1) {
      throw new Error(`${commandName} requires exactly one of --sarif, --npm-audit, --pnpm-audit, --yarn-audit, or --osv.`);
    }
    const packageLockFlag = typeof parsed.flags["package-lock"] === "string" ? parsed.flags["package-lock"].trim() : "";
    if (packageLockFlag && !npmAuditPath) throw new Error(`${commandName} accepts --package-lock only with --npm-audit.`);
    const verificationRunFlag = parsed.flags["verification-run"];
    if (verificationRunFlag !== undefined && typeof verificationRunFlag !== "string") {
      throw new Error(`${commandName} requires exactly one ref after --verification-run.`);
    }

    const store = createLocalArtifactStore(root);
    await store.init();
    const evidenceEntry = (await store.list("EvidenceGraph")).at(-1);
    if (!evidenceEntry) {
      throw new Error(`${commandName} requires an EvidenceGraph. Run 'rekon observe' first.`);
    }
    const evidenceGraph = await store.read(evidenceEntry) as { header?: ArtifactHeader };
    if (!evidenceGraph.header) {
      throw new Error(`${commandName} could not read a valid EvidenceGraph header.`);
    }
    const evidenceRef: ArtifactRef = {
      type: evidenceEntry.type,
      id: evidenceEntry.id,
      path: evidenceEntry.path,
      digest: evidenceEntry.digest,
      schemaVersion: evidenceEntry.schemaVersion ?? "0.1.0",
    };
    const linkedVerificationRun = await resolveOptionalIngestionVerificationRun(
      store,
      verificationRunFlag,
      commandName,
      evidenceGraph.header.subject.repoId,
    );
    const inputRefs = linkedVerificationRun ? [evidenceRef, linkedVerificationRun.ref] : [evidenceRef];

    if (dependencyInputs.length === 1) {
      const sourcePath = npmAuditPath || pnpmAuditPath || yarnAuditPath || osvPath;
      const sourceKind = npmAuditPath ? "npm audit" : pnpmAuditPath ? "pnpm audit" : yarnAuditPath ? "Yarn audit" : "OSV-Scanner";
      const auditFile = await resolveReadableRepoFile(root, sourcePath, commandName, `${sourceKind} file`);
      const raw = await readFile(auditFile.absolutePath, "utf8");
      let audit: unknown;
      if (!yarnAuditPath) {
        try {
          audit = JSON.parse(raw);
        } catch {
          throw new Error(`${commandName} requires valid ${sourceKind} JSON.`);
        }
      }
      let lockfile: { relativePath: string; absolutePath: string } | undefined;
      if (npmAuditPath && packageLockFlag) {
        lockfile = await resolveReadableRepoFile(root, packageLockFlag, commandName, "package lockfile");
      } else if (npmAuditPath) {
        try {
          await access(join(root, "package-lock.json"));
          lockfile = await resolveReadableRepoFile(root, "package-lock.json", commandName, "package lockfile");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
      let packageLock: unknown;
      let lockfileRaw: string | undefined;
      if (lockfile) {
        lockfileRaw = await readFile(lockfile.absolutePath, "utf8");
        try {
          packageLock = JSON.parse(lockfileRaw);
        } catch {
          throw new Error(`${commandName} requires a valid package-lock JSON file.`);
        }
      }
      const digest = createHash("sha256").update(raw).digest("hex");
      const header: ArtifactHeader = {
        artifactType: "DependencyAuditReport",
        artifactId: `dependency-audit-report-${digest.slice(0, 24)}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: evidenceGraph.header.subject,
        producer: { id: "@rekon/cli.security-ingest", version: "1.0.0" },
        inputRefs,
        freshness: { status: "fresh" },
        provenance: {
          confidence: npmAuditPath ? (lockfile ? 1 : 0.7) : 0.85,
          notes: [
            `Normalized from repository-local ${sourceKind} output without executing the scanner or persisting the raw payload.`,
            ...(linkedVerificationRun
              ? [`Associated with explicitly selected ${linkedVerificationRun.ref.type}:${linkedVerificationRun.ref.id}.`]
              : []),
          ],
        },
      };
      const commonInput = {
        sourcePath: auditFile.relativePath,
        sourceDigest: digest,
        header,
      };
      const parsedAudit = npmAuditPath ? parseNpmAuditReport({
        ...commonInput,
        audit,
        packageLock,
        ...(lockfile && lockfileRaw
          ? {
              lockfilePath: lockfile.relativePath,
              lockfileDigest: createHash("sha256").update(lockfileRaw).digest("hex"),
            }
          : {}),
      }) : pnpmAuditPath ? parsePnpmAuditReport({ ...commonInput, audit })
        : yarnAuditPath ? parseYarnAuditReport({ ...commonInput, ndjson: raw })
          : parseOsvScannerReport({ ...commonInput, report: audit, repoRoot: resolve(root) });
      if (!parsedAudit.valid || !parsedAudit.report) {
        throw new Error(`${commandName} rejected the report:\n${parsedAudit.issues.map((issue) => `- ${issue.code}: ${issue.message}`).join("\n")}`);
      }
      const ref = await store.write(parsedAudit.report satisfies DependencyAuditReport, { category: "actions" });
      writeOutput({ artifact: ref, summary: parsedAudit.report.summary, status: parsedAudit.report.status, issues: parsedAudit.issues }, json);
      return;
    }

    const sarifFile = await resolveReadableRepoFile(root, sarifPath, commandName, "SARIF file");
    const raw = await readFile(sarifFile.absolutePath, "utf8");
    let sarif: unknown;
    try {
      sarif = JSON.parse(raw);
    } catch {
      throw new Error(`${commandName} requires valid JSON.`);
    }
    const digest = createHash("sha256").update(raw).digest("hex");
    const parsedSarif = parseSarifSecurityReport({
      sarif,
      repoRoot: resolve(root),
      sourcePath: sarifFile.relativePath,
      sourceDigest: digest,
      header: {
        artifactType: "SecurityScanReport",
        artifactId: `security-scan-report-${digest.slice(0, 24)}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: evidenceGraph.header.subject,
        producer: { id: "@rekon/cli.security-ingest", version: "1.0.0" },
        inputRefs,
        freshness: { status: "fresh" },
        provenance: {
          confidence: 1,
          notes: [
            "Normalized from repository-local SARIF 2.1.0 without executing the scanner.",
            ...(linkedVerificationRun
              ? [`Associated with explicitly selected ${linkedVerificationRun.ref.type}:${linkedVerificationRun.ref.id}.`]
              : []),
          ],
        },
      },
    });
    if (!parsedSarif.valid || !parsedSarif.report) {
      throw new Error(`${commandName} rejected the report:\n${parsedSarif.issues.map((issue) => `- ${issue.code}: ${issue.message}`).join("\n")}`);
    }
    const ref = await store.write(parsedSarif.report satisfies SecurityScanReport, { category: "actions" });
    writeOutput({ artifact: ref, summary: parsedSarif.report.summary, issues: parsedSarif.issues }, json);
    return;
  }

  if (command === "evaluate" && subcommand === "list") {
    const runtime = await createDefaultRuntime(root);
    const evaluators = listHandlers(runtime, "evaluators").map((entry) => ({
      id: entry.handlerId,
      capabilityId: entry.capabilityId,
      produces: entry.produces,
    }));
    writeOutput({ evaluators }, json);
    return;
  }

  if (command === "evaluate" && subcommand === "run" && positional) {
    const runtime = await createDefaultRuntime(root);
    const evaluatorId = positional;

    if (!runtime.registry.evaluators.some((evaluator) => evaluator.id === evaluatorId)) {
      throw new Error(
        `Unknown evaluator: ${evaluatorId}. Use 'rekon evaluate list' to see registered evaluators.`,
      );
    }

    const existingEvidence = await runtime.artifacts.list("EvidenceGraph");

    if (existingEvidence.length === 0) {
      await runtime.runObserve();
    }

    await syncConfiguredRulebook(root, runtime.artifacts);
    const refs = await runtime.runEvaluate({
      evaluatorId,
      input: parseInputJsonFlag(parsed.flags["input-json"]),
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "evaluate") {
    const runtime = await createDefaultRuntime(root);
    const existingEvidence = await runtime.artifacts.list("EvidenceGraph");

    if (existingEvidence.length === 0) {
      await runtime.runObserve();
    }

    await syncConfiguredRulebook(root, runtime.artifacts);
    const refs = await runtime.runEvaluate();
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "publish" && subcommand === "agents") {
    const runtime = await createDefaultRuntime(root);
    await ensureSnapshotReady(runtime);
    const refs = await runtime.runPublish({
      publisherId: "@rekon/capability-docs.publisher",
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "publish" && subcommand === "architecture") {
    const runtime = await createDefaultRuntime(root);
    await ensureSnapshotReady(runtime);
    const refs = await runtime.runPublish({
      publisherId: "@rekon/capability-docs.architecture-summary",
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "publish" && subcommand === "proof") {
    const runtime = await createDefaultRuntime(root);
    await ensureSnapshotReady(runtime);
    const refs = await runtime.runPublish({
      publisherId: "@rekon/capability-docs.proof-report",
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "publish" && subcommand === "agent-contract") {
    const runtime = await createDefaultRuntime(root);
    await ensureSnapshotReady(runtime);
    const refs = await runtime.runPublish({
      publisherId: "@rekon/capability-docs.agent-contract",
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "publish" && subcommand === "github-check") {
    // Step 6b (`--dry-run`) and step 6c (`--send`) of the CI /
    // GitHub adapter implementation sequence pinned by
    // docs/strategy/verification-runner-ci-github-decision.md
    // and
    // docs/strategy/verification-runner-github-check-publisher-decision.md.
    //
    // The command supports two mutually exclusive modes:
    //
    // - `--dry-run`: reads local Rekon artifacts, builds the
    //   payload, prints `{ kind, dryRun, payload, readiness,
    //   canonicalTruthReminder }`. **Never calls GitHub.**
    //   **Never reads `GITHUB_TOKEN` or `GH_TOKEN`** — the
    //   readiness assessor receives an empty env map.
    // - `--send`: reads local Rekon artifacts AND reads
    //   `process.env` (GITHUB_TOKEN, GITHUB_REPOSITORY,
    //   GITHUB_SHA, REKON_GITHUB_CHECKS, event context,
    //   write-permission confirmation), runs the readiness
    //   gate, and — only when ready — POSTs to the GitHub
    //   Checks API via `publishGitHubCheckRun`. Prints
    //   `{ kind, sent, payload, readiness, github,
    //   canonicalTruthReminder }`.
    //
    // Exactly one of `--dry-run` / `--send` is required;
    // passing both is exit 1. The send path NEVER leaks the
    // token in error messages.
    const dryRun = parsed.flags["dry-run"] === true;
    const send = parsed.flags["send"] === true;

    if (!dryRun && !send) {
      throw new Error(
        "rekon publish github-check requires either --dry-run or --send. See docs/strategy/verification-runner-github-check-publisher-decision.md.",
      );
    }

    if (dryRun && send) {
      throw new Error(
        "rekon publish github-check: --dry-run and --send are mutually exclusive. Choose exactly one.",
      );
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const verificationResultEntry = await pickLatestArtifactEntry(store, "VerificationResult");
    const verificationPlanEntry = await pickLatestArtifactEntry(store, "VerificationPlan");
    const proofReportEntry = await pickLatestPublicationByKind(store, "proof-report");
    const architectureSummaryEntry = await pickLatestPublicationByKind(store, "architecture-summary");
    const agentContractEntry = await pickLatestPublicationByKind(store, "agent-contract");
    // Path-freshness GitHub review surfacing (P1.1
    // path-freshness-github-review-surfacing). Read-only;
    // missing report is not a CLI failure; **never invokes
    // `rekon paths freshness` or `rekon refresh`.**
    const pathFreshnessEntry = await pickLatestArtifactEntry(store, "PathFreshnessReport");
    const pathFreshnessRef = pathFreshnessEntry ? toArtifactRef(pathFreshnessEntry) : undefined;
    let pathFreshnessReport: PathFreshnessReport | undefined;
    if (pathFreshnessEntry) {
      try {
        pathFreshnessReport = (await store.read(pathFreshnessEntry)) as PathFreshnessReport;
      } catch {
        // Treat unreadable report like a missing one — the
        // payload helper renders no-baseline guidance.
        pathFreshnessReport = undefined;
      }
    }

    const verificationResultRef = verificationResultEntry ? toArtifactRef(verificationResultEntry) : undefined;
    const verificationPlanRef = verificationPlanEntry ? toArtifactRef(verificationPlanEntry) : undefined;
    const proofReportRef = proofReportEntry ? toArtifactRef(proofReportEntry) : undefined;
    const architectureSummaryRef = architectureSummaryEntry ? toArtifactRef(architectureSummaryEntry) : undefined;
    const agentContractRef = agentContractEntry ? toArtifactRef(agentContractEntry) : undefined;

    let verificationResult: VerificationResultBodyLike | undefined;

    if (verificationResultEntry) {
      try {
        verificationResult = (await store.read(verificationResultEntry)) as VerificationResultBodyLike;
      } catch (cause) {
        throw new Error(
          `Failed to read VerificationResult body ${verificationResultEntry.id}: ${(cause as Error).message ?? cause}`,
        );
      }
    }

    // Step 9 — Proof-chain coherence (verification / GitHub
    // trust-boundary hardening). Pick the VerificationRun
    // **cited by the VerificationResult**, not the unrelated
    // latest run. If the result cites a missing run, leave
    // the payload's `verificationRun` undefined so the
    // payload builder reports `proof === "missing"` →
    // `action_required` instead of substituting a stale run.
    // Only fall back to latest VerificationRun when no
    // VerificationResult exists.
    const verificationRunChain = await resolveCoherentVerificationRunForGitHubCheck(
      store,
      verificationResult,
    );
    const verificationRunEntry = verificationRunChain.entry;
    const verificationRunBody = verificationRunChain.body;
    const verificationRunRef = verificationRunEntry ? toArtifactRef(verificationRunEntry) : undefined;
    const proofChainCoherenceWarning = verificationRunChain.warning;

    const runStatus: GitHubCheckPublisherRunStatus | undefined = verificationRunBody
      ? mapVerificationRunStatusForGitHubCheck(verificationRunBody)
      : undefined;

    const verificationRunForPayload = verificationRunBody && verificationRunEntry
      ? {
          header: {
            ...verificationRunBody.header,
            type: "VerificationRun" as const,
            id: verificationRunEntry.id,
          },
          status: runStatus,
        }
      : undefined;

    // Run `artifacts validate` so the payload reflects the
    // current local index state. This is read-only.
    const indexValidation = await validateArtifactIndex(store);
    const artifactsValid = indexValidation.valid;

    if (dryRun) {
      // Dry-run branch: **no token read, no network call.**
      // Readiness uses an explicitly empty env map so
      // `GITHUB_TOKEN` is never consulted.
      const payload = buildGitHubCheckPayload({
        config: { enabled: false, runUrl: undefined },
        verificationResult,
        verificationResultRef,
        verificationRun: verificationRunForPayload,
        verificationRunRef,
        verificationPlanRef,
        proofReportRef,
        architectureSummaryRef,
        agentContractRef,
        artifactsValid,
        pathFreshnessReport,
        pathFreshnessRef,
        proofChainWarnings: proofChainCoherenceWarning
          ? [proofChainCoherenceWarning]
          : undefined,
      });

      const readiness = assessGitHubCheckPublisherReadiness({
        env: {},
        event: { name: "workflow_dispatch" },
        writePermissionConfirmed: false,
      });

      const output: GitHubCheckDryRunOutput = {
        kind: "rekon.github-check.dry-run",
        dryRun: true,
        payload,
        readiness,
        proofChainWarnings: proofChainCoherenceWarning
          ? [proofChainCoherenceWarning]
          : undefined,
        canonicalTruthReminder: GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER,
      };

      writeOutput(output, json);
      return;
    }

    // Send branch (`--send`) — step 6c.
    //
    // Below is the **only** code path in the CLI that reads
    // `process.env.GITHUB_TOKEN`. The dry-run branch never
    // reaches this code.
    const sendEnv = collectGitHubCheckSendEnv(process.env);
    const event = resolveGitHubCheckEventFromEnv(process.env);
    const confirmFlag = parsed.flags["confirm-checks-write"] === true;
    const envConfirm = isTruthyFlag(process.env.REKON_GITHUB_CHECKS_WRITE_CONFIRMED);
    const writePermissionConfirmed = confirmFlag || envConfirm;
    const apiBaseUrl = typeof parsed.flags["api-base-url"] === "string"
      ? parsed.flags["api-base-url"] as string
      : undefined;

    // Trust-boundary hardening (step 9, fix #6): resolve PR
    // head SHA from --head-sha flag, then GITHUB_HEAD_SHA env.
    // `assessGitHubCheckPublisherReadiness` refuses
    // pull_request events without an explicit head SHA so we
    // never attach a Check to the merge commit by accident.
    const headShaFlag = typeof parsed.flags["head-sha"] === "string"
      ? (parsed.flags["head-sha"] as string).trim()
      : undefined;
    const headShaOverride = headShaFlag && headShaFlag.length > 0
      ? headShaFlag
      : (sendEnv.GITHUB_HEAD_SHA && sendEnv.GITHUB_HEAD_SHA.trim().length > 0
          ? sendEnv.GITHUB_HEAD_SHA.trim()
          : undefined);

    const config = {
      enabled: true,
      repository: sendEnv.GITHUB_REPOSITORY,
      headSha: headShaOverride ?? sendEnv.GITHUB_SHA,
      runUrl: buildGitHubActionsRunUrl(process.env),
    };

    const payload = buildGitHubCheckPayload({
      config,
      verificationResult,
      verificationResultRef,
      verificationRun: verificationRunForPayload,
      verificationRunRef,
      verificationPlanRef,
      proofReportRef,
      architectureSummaryRef,
      agentContractRef,
      artifactsValid,
      pathFreshnessReport,
      pathFreshnessRef,
      proofChainWarnings: proofChainCoherenceWarning
        ? [proofChainCoherenceWarning]
        : undefined,
    });

    const readiness = assessGitHubCheckPublisherReadiness({
      env: sendEnv,
      event,
      writePermissionConfirmed,
      headShaOverride,
    });

    if (!readiness.ready) {
      // No network call. The readiness payload includes the
      // issue list so operators can see exactly what is
      // missing. Exit 1 because the operator asked for
      // --send and we cannot fulfil it.
      const output: GitHubCheckSendOutput = {
        kind: "rekon.github-check.send",
        sent: false,
        reason: "readiness-failed",
        payload,
        readiness,
        github: undefined,
        proofChainWarnings: proofChainCoherenceWarning
          ? [proofChainCoherenceWarning]
          : undefined,
        canonicalTruthReminder: GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER,
      };

      writeOutput(output, json);

      if (!json) {
        process.stderr.write(
          `rekon publish github-check --send: refusing to publish. Readiness issues:\n${
            readiness.issues.map((issue) => `  - ${issue.code}: ${issue.message}`).join("\n")
          }\n`,
        );
      }

      process.exitCode = 1;
      return;
    }

    if (!payload.headSha) {
      // Defensive: readiness already required a SHA, but the
      // payload's headSha is what the API actually uses, so
      // double-check.
      process.stderr.write(
        "rekon publish github-check --send: payload.headSha is empty. Refusing to call the GitHub Checks API.\n",
      );
      process.exitCode = 1;
      return;
    }

    let github: GitHubCheckPublishResult;
    try {
      github = await publishGitHubCheckRun({
        token: sendEnv.GITHUB_TOKEN as string,
        repository: sendEnv.GITHUB_REPOSITORY as string,
        payload,
        apiBaseUrl,
      });
    } catch (cause) {
      const sanitized = sanitizeGitHubCheckSendError(cause);
      if (json) {
        const output: GitHubCheckSendOutput = {
          kind: "rekon.github-check.send",
          sent: false,
          reason: "api-error",
          payload,
          readiness,
          github: undefined,
          error: sanitized,
          proofChainWarnings: proofChainCoherenceWarning
            ? [proofChainCoherenceWarning]
            : undefined,
          canonicalTruthReminder: GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER,
        };
        writeOutput(output, true);
      } else {
        process.stderr.write(
          `rekon publish github-check --send: GitHub Checks API error (status ${sanitized.status}): ${sanitized.message}\n${
            sanitized.documentationUrl ? `Docs: ${sanitized.documentationUrl}\n` : ""
          }`,
        );
      }
      process.exitCode = 1;
      return;
    }

    const output: GitHubCheckSendOutput = {
      kind: "rekon.github-check.send",
      sent: true,
      payload,
      readiness,
      github,
      proofChainWarnings: proofChainCoherenceWarning
        ? [proofChainCoherenceWarning]
        : undefined,
      canonicalTruthReminder: GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER,
    };

    writeOutput(output, json);
    return;
  }

  if (command === "publish" && subcommand === "pr-comment") {
    // Step 7b (`--dry-run`) and step 7f (`--send`) of the CI /
    // GitHub adapter implementation sequence pinned by
    // docs/strategy/pr-comment-publisher-decision.md,
    // docs/strategy/pr-comment-publisher-api-decision-gate.md,
    // and docs/strategy/pr-comment-api-writer-go-no-go-review.md.
    //
    // The command supports two mutually exclusive modes:
    //
    // - `--dry-run`: reads local Rekon artifacts, builds the
    //   PR comment markdown body via `buildPrCommentBody`,
    //   evaluates `assessPrCommentPublisherReadiness`, and
    //   prints both. **Never calls GitHub.** **Never reads
    //   `GITHUB_TOKEN`** — the readiness assessor receives an
    //   empty env map.
    // - `--send`: reads local Rekon artifacts AND reads
    //   `process.env` (GITHUB_TOKEN, GITHUB_REPOSITORY,
    //   GITHUB_PR_NUMBER / PR_NUMBER, REKON_PR_COMMENTS,
    //   event context, write-permission confirmation), runs
    //   the readiness gate, and — only when ready —
    //   list-then-PATCH-or-POSTs a Rekon-owned PR timeline
    //   comment via `publishPrCommentRun`. Update-in-place
    //   via the marker `<!-- rekon:pr-comment:v1 -->`.
    //
    // Exactly one of `--dry-run` / `--send` is required;
    // passing both is exit 1. The send path NEVER leaks the
    // token in error messages.
    const dryRun = parsed.flags["dry-run"] === true;
    const send = parsed.flags["send"] === true;
    const forbiddenAliases: Array<keyof typeof parsed.flags> = [
      "publish",
      "execute",
    ];

    for (const flag of forbiddenAliases) {
      if (parsed.flags[flag] === true) {
        throw new Error(
          `rekon publish pr-comment does not support --${String(flag)}. Use --dry-run or --send. See docs/strategy/pr-comment-api-writer-go-no-go-review.md.`,
        );
      }
    }

    if (!dryRun && !send) {
      throw new Error(
        "rekon publish pr-comment requires either --dry-run or --send. See docs/strategy/pr-comment-api-writer-go-no-go-review.md.",
      );
    }

    if (dryRun && send) {
      throw new Error(
        "rekon publish pr-comment: --dry-run and --send are mutually exclusive. Choose exactly one.",
      );
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const verificationResultEntry = await pickLatestArtifactEntry(store, "VerificationResult");
    const verificationRunEntry = await pickLatestArtifactEntry(store, "VerificationRun");
    const verificationPlanEntry = await pickLatestArtifactEntry(store, "VerificationPlan");
    const proofReportEntry = await pickLatestPublicationByKind(store, "proof-report");
    const architectureSummaryEntry = await pickLatestPublicationByKind(store, "architecture-summary");
    const agentContractEntry = await pickLatestPublicationByKind(store, "agent-contract");

    // Path-freshness GitHub review surfacing (P1.1
    // path-freshness-github-review-surfacing). Read-only;
    // missing report is not a CLI failure; **never invokes
    // `rekon paths freshness` or `rekon refresh`.**
    const pathFreshnessEntry = await pickLatestArtifactEntry(store, "PathFreshnessReport");
    const pathFreshnessRef = pathFreshnessEntry ? toArtifactRef(pathFreshnessEntry) : undefined;
    let pathFreshnessReport: PathFreshnessReport | undefined;
    if (pathFreshnessEntry) {
      try {
        pathFreshnessReport = (await store.read(pathFreshnessEntry)) as PathFreshnessReport;
      } catch {
        pathFreshnessReport = undefined;
      }
    }

    const verificationResultRef = verificationResultEntry ? toArtifactRef(verificationResultEntry) : undefined;
    const verificationRunRef = verificationRunEntry ? toArtifactRef(verificationRunEntry) : undefined;
    const verificationPlanRef = verificationPlanEntry ? toArtifactRef(verificationPlanEntry) : undefined;
    const proofReportRef = proofReportEntry ? toArtifactRef(proofReportEntry) : undefined;
    const architectureSummaryRef = architectureSummaryEntry ? toArtifactRef(architectureSummaryEntry) : undefined;
    const agentContractRef = agentContractEntry ? toArtifactRef(agentContractEntry) : undefined;

    let verificationResult: VerificationResultBodyLike | undefined;

    if (verificationResultEntry) {
      try {
        verificationResult = (await store.read(verificationResultEntry)) as VerificationResultBodyLike;
      } catch (cause) {
        throw new Error(
          `Failed to read VerificationResult body ${verificationResultEntry.id}: ${(cause as Error).message ?? cause}`,
        );
      }
    }

    // Read-only `artifacts validate` so the body reflects the
    // current local index state.
    const indexValidation = await validateArtifactIndex(store);
    const artifactsValid = indexValidation.valid;

    const comment: PrCommentBody = buildPrCommentBody({
      verificationResult,
      verificationResultRef,
      verificationRunRef,
      verificationPlanRef,
      proofReportRef,
      architectureSummaryRef,
      agentContractRef,
      artifactsValid,
      pathFreshnessReport,
      pathFreshnessRef,
    });

    const citedRefs: Record<string, string | undefined> = {
      verificationResult: verificationResultRef ? `${verificationResultRef.type}:${verificationResultRef.id}` : undefined,
      verificationRun: verificationRunRef ? `${verificationRunRef.type}:${verificationRunRef.id}` : undefined,
      verificationPlan: verificationPlanRef ? `${verificationPlanRef.type}:${verificationPlanRef.id}` : undefined,
      proofReport: proofReportRef ? `${proofReportRef.type}:${proofReportRef.id}` : undefined,
      architectureSummary: architectureSummaryRef ? `${architectureSummaryRef.type}:${architectureSummaryRef.id}` : undefined,
      agentContract: agentContractRef ? `${agentContractRef.type}:${agentContractRef.id}` : undefined,
      pathFreshness: pathFreshnessRef ? `${pathFreshnessRef.type}:${pathFreshnessRef.id}` : undefined,
    };

    if (dryRun) {
      // Dry-run branch — step 7b. **No token read, no network
      // call.** Readiness uses an explicitly empty env map so
      // `GITHUB_TOKEN` is never consulted.
      const readiness: PrCommentPublisherReadiness = assessPrCommentPublisherReadiness({
        env: {},
        event: { name: "workflow_dispatch" },
        writePermissionConfirmed: false,
      });

      const output: PrCommentDryRunOutput = {
        kind: "rekon.pr-comment.dry-run",
        dryRun: true,
        wouldPublish: false,
        readiness,
        comment: {
          marker: comment.marker,
          markdown: comment.markdown,
          summary: comment.summary,
        },
        citedRefs,
        canonicalTruthReminder: PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER,
      };

      if (json) {
        writeOutput(output, true);
      } else {
        const lines: string[] = [];
        lines.push("PR comment publisher dry-run");
        lines.push("");
        lines.push(`Readiness: ${readiness.ready ? "ready" : "not ready"}`);
        if (readiness.issues.length > 0) {
          lines.push("Issues:");
          for (const issue of readiness.issues) {
            lines.push(`- ${issue.code}: ${issue.message}`);
          }
        }
        lines.push("");
        lines.push("Comment preview:");
        lines.push(comment.markdown);
        lines.push("");
        lines.push("No GitHub API call was made.");
        lines.push("No PR comment was posted.");
        writeOutput(lines.join("\n"), false);
      }

      return;
    }

    // Send branch (`--send`) — step 7f.
    //
    // Below is the **only** code path in the PR comment CLI
    // that reads `process.env.GITHUB_TOKEN`. The dry-run
    // branch never reaches this code.
    const sendEnv = collectPrCommentSendEnv(process.env);
    const event = resolvePrCommentEventFromEnv(process.env);
    const confirmFlag = parsed.flags["confirm-pr-comment-write"] === true;
    const envConfirm = isTruthyFlag(process.env.REKON_PR_COMMENTS_WRITE_CONFIRMED);
    const writePermissionConfirmed = confirmFlag || envConfirm;
    const apiBaseUrl = typeof parsed.flags["api-base-url"] === "string"
      ? parsed.flags["api-base-url"] as string
      : undefined;

    // PR number: prefer the --pr-number flag, then env
    // (`GITHUB_PR_NUMBER` / `PR_NUMBER`). The env reads are
    // wired through `collectPrCommentSendEnv` so the readiness
    // assessor sees a consistent env map.
    const prNumberFlag = parsed.flags["pr-number"];
    if (typeof prNumberFlag === "string" && prNumberFlag.trim() !== "") {
      sendEnv.GITHUB_PR_NUMBER = prNumberFlag.trim();
    } else if (typeof prNumberFlag === "number") {
      sendEnv.GITHUB_PR_NUMBER = String(prNumberFlag);
    }

    const readiness: PrCommentPublisherReadiness = assessPrCommentPublisherReadiness({
      env: sendEnv,
      event,
      writePermissionConfirmed,
    });

    if (!readiness.ready) {
      // No network call. The readiness payload includes the
      // issue list so operators can see exactly what is
      // missing. Exit 1 because the operator asked for
      // --send and we cannot fulfil it.
      const output: PrCommentSendOutput = {
        kind: "rekon.pr-comment.send",
        sent: false,
        reason: "readiness-failed",
        readiness,
        comment: {
          marker: comment.marker,
          summary: comment.summary,
        },
        citedRefs,
        canonicalTruthReminder: PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER,
      };

      writeOutput(output, json);

      if (!json) {
        process.stderr.write(
          `rekon publish pr-comment --send: refusing to publish. Readiness issues:\n${
            readiness.issues.map((issue) => `  - ${issue.code}: ${issue.message}`).join("\n")
          }\n`,
        );
      }

      process.exitCode = 1;
      return;
    }

    const prNumberRaw = sendEnv.GITHUB_PR_NUMBER ?? sendEnv.PR_NUMBER ?? "";
    const issueNumber = Number.parseInt(String(prNumberRaw), 10);
    if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
      // Defensive: readiness already required a PR number,
      // but parse it explicitly here so the API helper never
      // sees a malformed value.
      process.stderr.write(
        `rekon publish pr-comment --send: PR number ${JSON.stringify(prNumberRaw)} is not a positive integer. Refusing to call the GitHub PR comments API.\n`,
      );
      process.exitCode = 1;
      return;
    }

    let github: PrCommentPublishResult;
    try {
      github = await publishPrCommentRun({
        token: sendEnv.GITHUB_TOKEN as string,
        repository: sendEnv.GITHUB_REPOSITORY as string,
        issueNumber,
        body: comment.markdown,
        apiBaseUrl,
      });
    } catch (cause) {
      const sanitized = sanitizePrCommentSendError(cause);
      if (json) {
        const output: PrCommentSendOutput = {
          kind: "rekon.pr-comment.send",
          sent: false,
          reason: "api-error",
          readiness,
          comment: {
            marker: comment.marker,
            summary: comment.summary,
          },
          citedRefs,
          error: sanitized,
          canonicalTruthReminder: PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER,
        };
        writeOutput(output, true);
      } else {
        process.stderr.write(
          `rekon publish pr-comment --send: GitHub PR comments API error (status ${sanitized.status}): ${sanitized.message}\n${
            sanitized.documentationUrl ? `Docs: ${sanitized.documentationUrl}\n` : ""
          }`,
        );
      }
      process.exitCode = 1;
      return;
    }

    const output: PrCommentSendOutput = {
      kind: "rekon.pr-comment.send",
      sent: true,
      action: github.action,
      readiness,
      comment: {
        marker: comment.marker,
        summary: comment.summary,
      },
      citedRefs,
      github,
      canonicalTruthReminder: PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER,
    };

    writeOutput(output, json);
    return;
  }

  if (command === "agent-contract" && subcommand === "export") {
    const outputFlag = typeof parsed.flags.output === "string" ? parsed.flags.output : undefined;
    const force = parsed.flags.force === true;

    if (!outputFlag) {
      throw new Error("rekon agent-contract export requires --output <path>.");
    }

    const result = await runAgentContractExport(root, { outputPath: outputFlag, force });
    writeOutput(result, json);
    return;
  }

  if (command === "publish" && subcommand === "list") {
    const runtime = await createDefaultRuntime(root);
    const publishers = listHandlers(runtime, "publishers").map((entry) => ({
      id: entry.handlerId,
      capabilityId: entry.capabilityId,
      produces: entry.produces,
    }));
    writeOutput({ publishers }, json);
    return;
  }

  if (command === "publish" && subcommand === "run" && positional) {
    const runtime = await createDefaultRuntime(root);
    const publisherId = positional;

    if (!runtime.registry.publishers.some((publisher) => publisher.id === publisherId)) {
      throw new Error(
        `Unknown publisher: ${publisherId}. Use 'rekon publish list' to see registered publishers.`,
      );
    }

    await ensureSnapshotReady(runtime);
    const refs = await runtime.runPublish({
      publisherId,
      input: parseInputJsonFlag(parsed.flags["input-json"]),
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "memory" && subcommand === "add") {
    const instruction = typeof parsed.flags.instruction === "string" ? parsed.flags.instruction : undefined;
    const path = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;

    if (!instruction || !path) {
      throw new Error("rekon memory add requires --instruction <text> and --path <path>.");
    }

    const systems = parseRepeatableFlag(parsed.flags.system);
    const capabilities = parseRepeatableFlag(parsed.flags.capability);
    const tags = parseRepeatableFlag(parsed.flags.tag);
    const layers = parseRepeatableFlag(parsed.flags.layer);
    const priorityFlag = typeof parsed.flags.priority === "string" ? parsed.flags.priority : undefined;

    if (priorityFlag && priorityFlag !== "low" && priorityFlag !== "normal" && priorityFlag !== "high") {
      throw new Error("rekon memory add --priority must be one of low, normal, high.");
    }

    const reliabilityFlag = typeof parsed.flags.reliability === "string"
      ? Number.parseFloat(parsed.flags.reliability)
      : undefined;

    if (reliabilityFlag !== undefined && (Number.isNaN(reliabilityFlag) || reliabilityFlag < 0 || reliabilityFlag > 1)) {
      throw new Error("rekon memory add --reliability must be a number between 0 and 1.");
    }

    const verifiedFlag = parsed.flags.verified === true || parsed.flags.verified === "true";
    const rationale = typeof parsed.flags.rationale === "string" ? parsed.flags.rationale : undefined;

    const runtime = await createDefaultRuntime(root);
    const refs = await runtime.runLearn({
      learnerId: "@rekon/capability-memory.learner",
      input: {
        mode: "add",
        instruction,
        path,
        goal: typeof parsed.flags.goal === "string" ? parsed.flags.goal : undefined,
        systems: systems.length > 0 ? systems : undefined,
        capabilities: capabilities.length > 0 ? capabilities : undefined,
        tags: tags.length > 0 ? tags : undefined,
        layers: layers.length > 0 ? layers : undefined,
        priority: priorityFlag,
        reliability: reliabilityFlag,
        verified: verifiedFlag ? true : undefined,
        rationale,
      },
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "memory" && subcommand === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entries = await Promise.all((await store.list("OperatorFeedbackEntry")).map((ref) => store.read(ref)));
    writeOutput({ entries }, json);
    return;
  }

  if (command === "memory" && subcommand === "select") {
    const path = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;

    if (!path) {
      throw new Error("rekon memory select requires --path <path>.");
    }

    const tags = parseRepeatableFlag(parsed.flags.tag);
    const limitFlag = typeof parsed.flags.limit === "string" ? Number.parseInt(parsed.flags.limit, 10) : undefined;

    if (limitFlag !== undefined && (Number.isNaN(limitFlag) || limitFlag <= 0)) {
      throw new Error("rekon memory select --limit must be a positive integer.");
    }

    const runtime = await createDefaultRuntime(root);
    const refs = await runtime.runLearn({
      learnerId: "@rekon/capability-memory.learner",
      input: {
        mode: "select",
        path,
        goal: typeof parsed.flags.goal === "string" ? parsed.flags.goal : "",
        system: typeof parsed.flags.system === "string" ? parsed.flags.system : undefined,
        capability: typeof parsed.flags.capability === "string" ? parsed.flags.capability : undefined,
        tags: tags.length > 0 ? tags : undefined,
        limit: limitFlag,
      },
    });
    const selection = refs[0] ? await runtime.artifacts.read(refs[0]) : null;
    writeOutput({ artifact: refs[0], selection }, json);
    return;
  }

  if (command === "memory" && subcommand === "usage" && positional === "record") {
    const memoryEntryId = typeof parsed.positionals[3] === "string" ? parsed.positionals[3] : undefined;

    if (!memoryEntryId) {
      throw new Error("rekon memory usage record requires a memory entry id positional argument.");
    }

    const outcomeFlag = typeof parsed.flags.outcome === "string" ? parsed.flags.outcome : undefined;

    if (!outcomeFlag) {
      throw new Error(
        "rekon memory usage record requires --outcome helpful|ignored|harmful|stale|unclear.",
      );
    }

    const note = typeof parsed.flags.note === "string" ? parsed.flags.note : "";
    const selectionId = typeof parsed.flags.selection === "string" ? parsed.flags.selection : undefined;
    const usedBy = typeof parsed.flags["used-by"] === "string" ? parsed.flags["used-by"] : undefined;
    const contextPath = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;
    const contextGoal = typeof parsed.flags.goal === "string" ? parsed.flags.goal : undefined;
    const resolverId = typeof parsed.flags["resolver-id"] === "string" ? parsed.flags["resolver-id"] : undefined;
    const publicationId = typeof parsed.flags["publication-id"] === "string" ? parsed.flags["publication-id"] : undefined;
    const workOrderId = typeof parsed.flags["work-order-id"] === "string" ? parsed.flags["work-order-id"] : undefined;

    const runtime = await createDefaultRuntime(root);
    const refs = await runtime.runLearn({
      learnerId: "@rekon/capability-memory.learner",
      input: {
        mode: "usage-record",
        memoryEntryId,
        outcome: outcomeFlag,
        note,
        memorySelectionId: selectionId,
        usedBy,
        path: contextPath,
        goal: contextGoal,
        resolverId,
        publicationId,
        workOrderId,
      },
    });
    const ledger = refs[0] ? await runtime.artifacts.read(refs[0]) : null;
    writeOutput({ artifact: refs[0], ledger }, json);
    return;
  }

  if (command === "memory" && subcommand === "usage" && positional === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const refs = await store.list("MemoryUsageLedger");

    if (refs.length === 0) {
      writeOutput({ artifact: null, events: [] }, json);
      return;
    }

    const latest = [...refs].sort((left, right) => right.id.localeCompare(left.id))[0]!;
    const ledger = (await store.read(latest)) as { events?: unknown[] };
    writeOutput({ artifact: latest, events: ledger.events ?? [] }, json);
    return;
  }

  if (command === "memory" && subcommand === "curation") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entryRefs = await store.list("OperatorFeedbackEntry");

    if (entryRefs.length === 0) {
      writeOutput(
        {
          artifact: null,
          summary: { totalMemories: 0 },
          message: "No memory entries found.",
        },
        json,
      );
      return;
    }

    const runtime = await createDefaultRuntime(root);
    const refs = await runtime.runLearn({
      learnerId: "@rekon/capability-memory.learner",
      input: { mode: "curation" },
    });
    const report = refs[0] ? await runtime.artifacts.read(refs[0]) : null;
    writeOutput({ artifact: refs[0], report }, json);
    return;
  }

  if (command === "resolve" && subcommand === "list") {
    const runtime = await createDefaultRuntime(root);
    const resolvers = listHandlers(runtime, "resolvers").map((entry) => ({
      id: entry.handlerId,
      capabilityId: entry.capabilityId,
      produces: entry.produces,
    }));
    writeOutput({ resolvers }, json);
    return;
  }

  if (command === "resolve" && subcommand === "run" && positional) {
    const runtime = await createDefaultRuntime(root);
    const resolverId = positional;

    if (!runtime.registry.resolvers.some((resolver) => resolver.id === resolverId)) {
      throw new Error(
        `Unknown resolver: ${resolverId}. Use 'rekon resolve list' to see registered resolvers.`,
      );
    }

    const explicitInput = parseInputJsonFlag(parsed.flags["input-json"]) ?? {};
    const input: Record<string, unknown> = { ...explicitInput };

    if (input.snapshotRef === undefined) {
      const snapshots = await runtime.artifacts.list("IntelligenceSnapshot");

      if (snapshots.length === 0) {
        await ensureSnapshotReady(runtime);
      }

      const latest = (await runtime.artifacts.list("IntelligenceSnapshot")).at(-1);

      if (latest) {
        input.snapshotRef = {
          type: latest.type,
          id: latest.id,
          schemaVersion: latest.schemaVersion,
        };
      }
    }

    const refs = await runtime.runResolve({ resolverId, input });
    const packet = refs[0] ? await runtime.artifacts.read(refs[0]) : null;

    writeOutput({ artifact: refs[0], packet, artifacts: refs }, json);
    return;
  }

  if (command === "resolve" && subcommand === "route") {
    const paths = parseRepeatableFlag(parsed.flags.path);
    const goal = typeof parsed.flags.goal === "string" ? parsed.flags.goal : "";
    const concern = typeof parsed.flags.concern === "string" ? parsed.flags.concern : undefined;

    if (paths.length === 0) {
      throw new Error("rekon resolve route requires --path <path>.");
    }

    const runtime = await createDefaultRuntime(root);
    const snapshotRef = await ensureSnapshotForResolver(runtime, paths);
    const input: Record<string, unknown> = { snapshotRef, paths, goal };

    if (concern !== undefined) {
      input.concern = concern;
    }

    const refs = await runtime.runResolve({ resolverId: "resolve.route", input });
    const packet = refs[0] ? await runtime.artifacts.read(refs[0]) : null;

    writeOutput({ artifact: refs[0], packet, artifacts: refs }, json);
    return;
  }

  if (command === "resolve" && subcommand === "seam") {
    const paths = parseRepeatableFlag(parsed.flags.path);
    const goal = typeof parsed.flags.goal === "string" ? parsed.flags.goal : "";
    const primaryOwner = typeof parsed.flags["primary-owner"] === "string"
      ? parsed.flags["primary-owner"]
      : undefined;

    if (paths.length === 0) {
      throw new Error("rekon resolve seam requires --path <path>.");
    }

    const runtime = await createDefaultRuntime(root);
    const snapshotRef = await ensureSnapshotForResolver(runtime, paths);
    const input: Record<string, unknown> = { snapshotRef, paths, goal };

    if (primaryOwner !== undefined) {
      input.primaryOwner = primaryOwner;
    }

    const refs = await runtime.runResolve({ resolverId: "resolve.seam", input });
    const packet = refs[0] ? await runtime.artifacts.read(refs[0]) : null;

    writeOutput({ artifact: refs[0], packet, artifacts: refs }, json);
    return;
  }

  if (command === "resolve" && subcommand === "issue") {
    const issue = typeof parsed.flags.issue === "string" ? parsed.flags.issue : undefined;

    if (!issue) {
      throw new Error("rekon resolve issue requires --issue <id-or-fragment>.");
    }

    const runtime = await createDefaultRuntime(root);
    const snapshotRef = await ensureSnapshotForResolver(runtime, []);
    const refs = await runtime.runResolve({
      resolverId: "resolve.issue",
      input: { snapshotRef, issue },
    });
    const packet = refs[0] ? await runtime.artifacts.read(refs[0]) : null;

    writeOutput({ artifact: refs[0], packet, artifacts: refs }, json);
    return;
  }

  if (command === "resolve" && subcommand === "preflight") {
    const path = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;
    const goal = typeof parsed.flags.goal === "string" ? parsed.flags.goal : "";

    if (!path) {
      throw new Error("rekon resolve preflight requires --path <path>.");
    }

    const runtime = await createDefaultRuntime(root);
    const existingEvidence = await runtime.artifacts.list("EvidenceGraph");

    if (existingEvidence.length === 0) {
      await runtime.runObserve({
        changedFiles: [path],
        incremental: true,
      });
    }

    const existingOwnership = await runtime.artifacts.list("OwnershipMap");

    if (existingOwnership.length === 0) {
      await runtime.runProject();
    }

    const existingFindings = await runtime.artifacts.list("FindingReport");
    const rulebookSync = await syncConfiguredRulebook(root, runtime.artifacts);

    if (existingFindings.length === 0 || rulebookSync.changed) {
      await runtime.runEvaluate();
    }

    const memoryEntries = await runtime.artifacts.list("OperatorFeedbackEntry");

    if (memoryEntries.length > 0) {
      await runtime.runLearn({
        learnerId: "@rekon/capability-memory.learner",
        input: {
          mode: "select",
          path,
          goal,
        },
      });
    }

    const snapshotRef = await runtime.runSnapshot();
    const refs = await runtime.runResolve({
      resolverId: "resolve.preflight",
      input: {
        snapshotRef,
        path,
        goal,
      },
    });
    const packet = refs[0] ? await runtime.artifacts.read(refs[0]) : null;

    writeOutput({ artifact: refs[0], packet }, json);
    return;
  }

  if (command === "intent" && subcommand === "work-order" && positional !== "generate") {
    const path = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;
    const goal = typeof parsed.flags.goal === "string" ? parsed.flags.goal : "";

    if (!path) {
      throw new Error("rekon intent work-order requires --path <path>.");
    }

    const runtime = await createDefaultRuntime(root);
    const preflightRef = await ensurePreflight(runtime, path, goal);

    const refs = await runtime.runAct({
      actuatorId: "@rekon/capability-intent.work-order",
      input: {
        preflightRef,
        path,
        goal,
      },
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "intent" && subcommand === "remediation") {
    const findingId = typeof parsed.flags.finding === "string" ? parsed.flags.finding : undefined;
    const priorityFlag = typeof parsed.flags.priority === "string" ? parsed.flags.priority : undefined;
    const limitFlag = typeof parsed.flags.limit === "string" ? Number.parseInt(parsed.flags.limit, 10) : undefined;
    const skipVerified = parsed.flags["skip-verified"] === true;

    if (priorityFlag && priorityFlag !== "p0" && priorityFlag !== "p1" && priorityFlag !== "p2") {
      throw new Error("rekon intent remediation --priority must be one of p0, p1, p2.");
    }

    if (limitFlag !== undefined && (Number.isNaN(limitFlag) || limitFlag <= 0)) {
      throw new Error("rekon intent remediation --limit must be a positive integer.");
    }

    const runtime = await createDefaultRuntime(root);
    await ensureCoherencyDeltaReady(runtime, root);

    const skippedVerified: Array<{
      findingId: string;
      status: "passed";
      verificationResultRef?: { type: string; id: string; schemaVersion: string };
    }> = [];

    if (skipVerified) {
      const candidateIds = await collectRemediationCandidateIds(runtime, {
        findingId,
        priority: priorityFlag,
      });

      for (const candidateId of candidateIds) {
        const evidence = await lookupVerificationEvidence(runtime.artifacts, candidateId);

        if (evidence.status === "passed") {
          skippedVerified.push({
            findingId: candidateId,
            status: "passed",
            verificationResultRef: evidence.verificationResultRef,
          });
        }
      }
    }

    const excludeFindingIds = skippedVerified.map((entry) => entry.findingId);
    const refs = await runtime.runAct({
      actuatorId: "@rekon/capability-intent.remediation-work-order",
      input: {
        findingId,
        priority: priorityFlag,
        limit: limitFlag,
        excludeFindingIds: excludeFindingIds.length > 0 ? excludeFindingIds : undefined,
      },
    });

    if (refs.length === 0) {
      const message = skippedVerified.length > 0
        ? "No active remediation items remain after skipping verified items."
        : "No active remediation items in latest CoherencyDelta.";

      writeOutput(
        {
          artifacts: [],
          selectedItems: [],
          skippedVerified: skipVerified ? skippedVerified : undefined,
          message,
        },
        json,
      );
      return;
    }

    const workOrderRef = refs.find((ref) => ref.type === "WorkOrder");
    const workOrder = workOrderRef ? await runtime.artifacts.read(workOrderRef) as { remediationItems?: unknown[] } : undefined;
    const selectedItems = Array.isArray(workOrder?.remediationItems) ? workOrder?.remediationItems : [];

    writeOutput(
      {
        artifacts: refs,
        selectedItems,
        skippedVerified: skipVerified ? skippedVerified : undefined,
      },
      json,
    );
    return;
  }

  if (command === "reconcile" && subcommand === "suggest") {
    const findingId = typeof parsed.flags.finding === "string" ? parsed.flags.finding : undefined;
    const priorityFlag = typeof parsed.flags.priority === "string" ? parsed.flags.priority : undefined;
    const limitFlag = typeof parsed.flags.limit === "string" ? Number.parseInt(parsed.flags.limit, 10) : undefined;
    const apply = parsed.flags.apply === true;

    if (priorityFlag && priorityFlag !== "p0" && priorityFlag !== "p1" && priorityFlag !== "p2") {
      throw new Error("rekon reconcile suggest --priority must be one of p0, p1, p2.");
    }

    if (limitFlag !== undefined && (Number.isNaN(limitFlag) || limitFlag <= 0)) {
      throw new Error("rekon reconcile suggest --limit must be a positive integer.");
    }

    const runtime = await createDefaultRuntime(root);
    await ensureCoherencyDeltaReady(runtime, root);

    const refs = await runtime.runAct({
      actuatorId: "@rekon/capability-reconcile.actuator",
      input: {
        mode: "suggestions",
        findingId,
        priority: priorityFlag,
        limit: limitFlag,
        apply,
        // Pass repoRoot so the classifier can perform the
        // exact_text_replacement safety checks against the real working tree.
        // The actuator silently drops patch fields when this is absent.
        repoRoot: root,
      },
    });

    const planRef = refs.find((ref) => ref.type === "ReconciliationPlan");
    const plan = planRef ? await runtime.artifacts.read(planRef) as { summary?: unknown; operations?: unknown } : undefined;
    const summary = plan?.summary;
    const operations = Array.isArray(plan?.operations) ? plan?.operations : [];

    writeOutput(
      {
        artifacts: refs,
        summary,
        operations,
      },
      json,
    );
    return;
  }

  if (command === "reconcile" && subcommand === "preview") {
    const planFlag = typeof parsed.flags.plan === "string"
      ? parsed.flags.plan.trim()
      : "";

    if (planFlag.length === 0) {
      throw new Error(
        "rekon reconcile preview requires --plan <ReconciliationPlan-id|type:id>.",
      );
    }

    const store = createLocalArtifactStore(root);
    await store.init();
    const entry = await findArtifactEntry(store, planFlag);

    if (entry.type !== "ReconciliationPlan") {
      throw new Error(
        `rekon reconcile preview --plan must reference a ReconciliationPlan; got ${entry.type}.`,
      );
    }

    const plan = (await store.read(entry)) as ReconciliationPlan;
    const planRef: ArtifactRef = {
      type: entry.type,
      id: entry.id,
      path: entry.path,
      digest: entry.digest,
      schemaVersion: entry.schemaVersion ?? "0.1.0",
    };

    const preview = await buildReconciliationPreview({
      plan,
      planRef,
      repoRoot: root,
    });

    if (json) {
      writeOutput(preview, json);
    } else {
      writePreviewHumanOutput(preview);
    }

    return;
  }

  if (command === "reconcile") {
    const runtime = await createDefaultRuntime(root);
    const operations = parseRepeatableFlag(parsed.flags.operation);
    const refs = await runtime.runAct({
      actuatorId: "@rekon/capability-reconcile.actuator",
      input: {
        operations: operations.length > 0 ? operations : undefined,
        dryRun: !parsed.flags.apply,
      },
    });
    writeOutput({ artifacts: refs }, json);
    return;
  }

  if (command === "docs" && subcommand === "freshness") {
    // `rekon docs freshness [--root <path>] [--json] [--strict]` - WO-7.
    // Deterministic doc-governance freshness over git history. Report,
    // don't gate: exits zero unless --strict and any enrolled living doc
    // is stale/partial. The only write is the generated docs/INDEX.md
    // (idempotent; skipped when byte-identical).
    const report = buildDocsFreshnessReport(root);
    const indexPath = join(root, "docs/INDEX.md");
    const rendered = renderDocsIndex(report);
    let indexAction = "unchanged";

    try {
      if ((await readFile(indexPath, "utf8")) !== rendered) {
        await writeFile(indexPath, rendered);
        indexAction = "updated";
      }
    } catch {
      await writeFile(indexPath, rendered);
      indexAction = "created";
    }

    const enrolled = report.entries.filter((entry) => entry.enrolled);
    const offenders = enrolled.filter((entry) => entry.status === "stale" || entry.status === "partial");

    if (json) {
      writeOutput({ summary: report.summary, indexAction, entries: report.entries }, true);
    } else {
      const lines = [
        `docs freshness: ${report.summary.fresh} fresh / ${report.summary.stale} stale / ${report.summary.partial} partial / ${report.summary.unknown} unknown (living), ${report.summary.snapshots} snapshots exempt`,
        `docs/INDEX.md ${indexAction}`,
      ];

      for (const entry of report.entries) {
        if (entry.classification === "living" && entry.enrolled) {
          lines.push(`  ${entry.status.padEnd(7)} ${entry.doc}`);

          for (const referent of entry.referents.filter((item) => item.newerThanDoc || !item.resolved)) {
            lines.push(`          ${referent.newerThanDoc ? "newer:" : "unresolved:"} ${referent.declaration}`);
          }
        }
      }

      writeOutput(lines.join("\n"), false);
    }

    if (parsed.flags.strict && offenders.length > 0) {
      process.exitCode = 1;
    }

    return;
  }

  if (command === "mcp" && subcommand === "serve") {
    // `rekon mcp serve [--root <path>]` is a local stdio context server. The
    // MCP package remains read-only; this CLI host refreshes Rekon-owned
    // artifacts before task-context calls when source evidence has changed.
    // It never writes repository source or executes project commands.
    const autoRefresh = parsed.flags["no-auto-refresh"] !== true;
    runMcpServer(root, {
      beforeToolCall: async ({ name, args }) => {
        if (!autoRefresh || name !== "context_for_task") return;
        const paths = Array.isArray(args.paths)
          ? args.paths.filter((path): path is string => typeof path === "string")
          : [];
        await ensureTaskContextArtifactsFresh(root, paths);
      },
      handleToolCall: async ({ name, args }) => {
        if (name === "context_for_task") {
          if (typeof args.task !== "string" || args.task.trim().length === 0) return undefined;
          const paths = Array.isArray(args.paths)
            ? args.paths.filter((path): path is string => typeof path === "string")
            : [];
          const profile = args.profile === "compact" || args.profile === "standard" || args.profile === "deep"
            ? args.profile
            : undefined;
          const escalation = args.escalation === "validation-failed" ? args.escalation : undefined;
          const compiled = await compileRiskAdaptiveContextForTaskForHost(
            root,
            args.task.trim(),
            paths,
            profile,
            escalation,
          );
          if (!compiled.report || !compiled.packet || !compiled.projection || !compiled.delivery) {
            return compiled.response;
          }

          const store = createLocalArtifactStore(root);
          await store.init();
          const taskPactRef = compiled.taskPact
            ? await store.write(compiled.taskPact, { category: "actions" })
            : undefined;
          const report = taskPactRef
            ? {
                ...compiled.report,
                header: {
                  ...compiled.report.header,
                  inputRefs: dedupeArtifactRefs([...compiled.report.header.inputRefs, taskPactRef]),
                },
              }
            : compiled.report;
          const reportRef = await store.write(report, { category: "actions" });
          const contextUsage = buildContextUsageEvent({
            repoId: root,
            report,
            reportRef,
            packet: compiled.packet,
            projection: compiled.projection,
            delivery: compiled.delivery,
            channel: "mcp",
            ...(taskPactRef ? { taskPactRef } : {}),
          });
          const contextUsageRef = await store.write(contextUsage, { category: "actions" });
          return attachContextUsageRefToTaskContextResponse(compiled, contextUsageRef);
        }

        if (name !== "validate_change") return undefined;
        if (typeof args.task !== "string" || args.task.trim().length === 0) return undefined;
        const changedPaths = Array.isArray(args.changedPaths)
          ? args.changedPaths.filter((path): path is string => typeof path === "string" && path.trim().length > 0)
          : [];
        if (changedPaths.length === 0) return undefined;
        const baseRef = typeof args.baseRef === "string" && args.baseRef.trim().length > 0
          ? args.baseRef.trim()
          : "HEAD";
        try {
          const verificationResultRefs = parseMcpArtifactRefList(args.verificationResults, "verificationResults");
          const runtimeObservationRefs = parseMcpArtifactRefList(args.runtimeObservations, "runtimeObservations");
          const placementVerificationRefs = parseMcpArtifactRefList(
            args.placementVerifications,
            "placementVerifications",
          );
          const contextUsageRef = parseMcpOptionalArtifactRef(args.contextUsageRef, "contextUsageRef");
          const contextUsageClaims = parseContextUsageClaims(args.contextClaims);
          const modelJudgments = parseChangeModelJudgments(args.judgments);
          const validation = await validateRepositoryChange(root, {
            task: args.task.trim(),
            changedPaths,
            baseRef,
            verificationResultRefs,
            runtimeObservationRefs,
            placementVerificationRefs,
            contextUsageRef,
            contextUsageClaims,
            contextUsageClaimant: "rekon-mcp-client",
            modelJudgments,
          });
          const outcomeRef = await recordValidationOutcomeEvent(root, validation);
          return buildChangeValidationResponse(
            validation.result,
            validation.sources,
            outcomeRef,
            validation.contextClaimReceiptRef,
          );
        } catch (error) {
          return buildChangeValidationUnavailable(error instanceof Error ? error.message : String(error));
        }
      },
    });
    await new Promise(() => {});
    return;
  }

  if (command === "artifacts" && subcommand === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entries = await store.list(typeof parsed.flags.type === "string" ? parsed.flags.type : undefined);
    writeOutput({ artifacts: entries }, json);
    return;
  }

  if (command === "artifacts" && subcommand === "show" && positional) {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entry = await findArtifactEntry(store, positional);
    const artifact = await store.read(entry);
    writeOutput({ artifact }, json);
    return;
  }

  if (command === "handoff" && subcommand === "contract" && positional === "build") {
    // `rekon handoff contract build [--root <path>] [--json]
    // [--step-graph <ref>]` — HandoffContract v1.
    //
    // Materializes declared baton policy from an optional
    // `.rekon/handoff-contracts.json` over the latest (or pinned)
    // StepCapabilityGraph. Each configured handoff resolves to `declared`
    // (both step ids exist) or `unresolved-step`. It evaluates NO handoff
    // coverage, reads NO runtime events, detects NO drift, creates no
    // WorkOrder / VerificationPlan, and mutates nothing. See
    // docs/artifacts/handoff-contract.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const stepGraphFlag = typeof parsed.flags["step-graph"] === "string"
      ? parsed.flags["step-graph"].trim()
      : "";
    let stepGraphEntry: ArtifactIndexEntry | undefined;
    if (stepGraphFlag.length > 0) {
      stepGraphEntry = await findArtifactEntry(store, stepGraphFlag);
      if (stepGraphEntry.type !== "StepCapabilityGraph") {
        throw new Error(
          `rekon handoff contract build --step-graph must reference a StepCapabilityGraph; got ${stepGraphEntry.type}.`,
        );
      }
    } else {
      const stepGraphEntries = await store.list("StepCapabilityGraph");
      stepGraphEntry = stepGraphEntries.at(-1);
      if (!stepGraphEntry) {
        throw new Error(
          "rekon handoff contract build: no StepCapabilityGraph found. Run `rekon step graph build` first.",
        );
      }
    }

    const stepCapabilityGraph = (await store.read(stepGraphEntry)) as HandoffContractStepGraphLike;
    const stepCapabilityGraphRef: ArtifactRef = {
      type: stepGraphEntry.type,
      id: stepGraphEntry.id,
      path: stepGraphEntry.path,
      digest: stepGraphEntry.digest,
      schemaVersion: stepGraphEntry.schemaVersion ?? "0.1.0",
    };

    // Optional `.rekon/handoff-contracts.json`. Missing is valid (zero
    // handoffs); invalid fails clearly; never mutated.
    let config: HandoffContractConfig | undefined;
    let configPath: string | undefined;
    let configHash: string | undefined;
    let configText: string | undefined;
    try {
      configText = await readFile(resolve(root, HANDOFF_CONTRACT_CONFIG_PATH), "utf8");
    } catch {
      configText = undefined;
    }
    if (configText !== undefined) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(configText);
      } catch (error) {
        throw new Error(
          `rekon handoff contract build: ${HANDOFF_CONTRACT_CONFIG_PATH} is not valid JSON: ${(error as Error).message}`,
        );
      }
      config = parseHandoffContractConfig(parsedJson);
      configPath = HANDOFF_CONTRACT_CONFIG_PATH;
      configHash = createHash("sha256").update(configText).digest("hex");
    }

    const generatedAt = new Date().toISOString();
    const header: ArtifactHeader = {
      artifactType: "HandoffContract",
      artifactId: `${HANDOFF_CONTRACT_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root },
      producer: { id: "@rekon/cli.handoff-contract-build", version: "0.1.0-beta.0" },
      inputRefs: [stepCapabilityGraphRef],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    };

    const contract: HandoffContract = buildHandoffContract({
      header,
      stepCapabilityGraph,
      stepCapabilityGraphRef,
      config,
      configPath,
      configHash,
    });

    const ref = await store.write(contract, { category: "actions" });

    if (json) {
      writeOutput(
        { artifact: { type: ref.type, id: ref.id }, summary: contract.summary, source: contract.source },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Handoff contract");
      lines.push("");
      lines.push(`Handoffs: ${contract.summary.total}`);
      lines.push(`Declared: ${contract.summary.declared}`);
      lines.push(`Unresolved step: ${contract.summary.unresolvedStep}`);
      lines.push(`Needs review: ${contract.summary.needsReview}`);
      lines.push("");
      lines.push(`Contract: ${ref.type}:${ref.id}`);
      lines.push(
        "No handoff coverage, runtime events, drift, WorkOrder, or VerificationPlan artifacts were created.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "handoff" && subcommand === "coverage" && positional === "report") {
    // `rekon handoff coverage report [--root <path>] [--json]
    // [--handoff-contract <ref>] [--event-log <path>]` —
    // HandoffCoverageReport v1.
    //
    // Compares declared HandoffContract handoffs against an optional raw
    // handoff event log (`.rekon/handoff-events.jsonl`). A MISSING log
    // yields `not-evaluated` rows (not `uncovered`); a PRESENT log with no
    // match yields `uncovered`. This is handoff-event coverage, NOT
    // VerificationRun command success. It creates no
    // RuntimeGraphObservationReport / RuntimeGraphDriftReport / WorkOrder /
    // VerificationPlan, detects no drift, and mutates nothing (the contract
    // or the event log). See docs/artifacts/handoff-coverage-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const handoffFlag = typeof parsed.flags["handoff-contract"] === "string"
      ? parsed.flags["handoff-contract"].trim()
      : "";
    let contractEntry: ArtifactIndexEntry | undefined;
    if (handoffFlag.length > 0) {
      contractEntry = await findArtifactEntry(store, handoffFlag);
      if (contractEntry.type !== "HandoffContract") {
        throw new Error(
          `rekon handoff coverage report --handoff-contract must reference a HandoffContract; got ${contractEntry.type}.`,
        );
      }
    } else {
      const contractEntries = await store.list("HandoffContract");
      contractEntry = contractEntries.at(-1);
      if (!contractEntry) {
        throw new Error(
          "rekon handoff coverage report: no HandoffContract found. Run `rekon handoff contract build` first.",
        );
      }
    }

    const handoffContract = (await store.read(contractEntry)) as HandoffCoverageContractLike;
    const handoffContractRef: ArtifactRef = {
      type: contractEntry.type,
      id: contractEntry.id,
      path: contractEntry.path,
      digest: contractEntry.digest,
      schemaVersion: contractEntry.schemaVersion ?? "0.1.0",
    };

    // Optional raw handoff event log. Default `.rekon/handoff-events.jsonl`
    // under root, or an explicit `--event-log` path. A MISSING log is valid
    // (declared handoffs become `not-evaluated`); the log is never mutated.
    const eventLogFlag = typeof parsed.flags["event-log"] === "string"
      ? parsed.flags["event-log"].trim()
      : "";
    const eventLogRelPath = eventLogFlag.length > 0 ? eventLogFlag : HANDOFF_EVENT_LOG_PATH;
    let eventLog: string | undefined;
    let eventLogPath: string | undefined;
    let eventLogHash: string | undefined;
    try {
      eventLog = await readFile(resolve(root, eventLogRelPath), "utf8");
    } catch {
      eventLog = undefined;
    }
    if (eventLog !== undefined) {
      eventLogPath = eventLogRelPath;
      eventLogHash = createHash("sha256").update(eventLog).digest("hex");
    }

    const generatedAt = new Date().toISOString();
    const header: ArtifactHeader = {
      artifactType: "HandoffCoverageReport",
      artifactId: `${HANDOFF_COVERAGE_REPORT_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root },
      producer: { id: "@rekon/cli.handoff-coverage-report", version: "0.1.0-beta.0" },
      inputRefs: [handoffContractRef],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    };

    const report: HandoffCoverageReport = buildHandoffCoverageReport({
      header,
      handoffContract,
      handoffContractRef,
      eventLog,
      eventLogPath,
      eventLogHash,
    });

    const ref = await store.write(report, { category: "actions" });

    if (json) {
      writeOutput(
        { artifact: { type: ref.type, id: ref.id }, summary: report.summary, source: report.source },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Handoff coverage report");
      lines.push("");
      lines.push(`Declared: ${report.summary.totalDeclared}`);
      lines.push(`Covered: ${report.summary.covered}`);
      lines.push(`Uncovered: ${report.summary.uncovered}`);
      lines.push(`Unresolved contract: ${report.summary.unresolvedContract}`);
      lines.push(`Added observed: ${report.summary.addedObserved}`);
      lines.push(`Not evaluated: ${report.summary.notEvaluated}`);
      lines.push(`Parse errors: ${report.summary.parseErrors}`);
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push(
        "No RuntimeGraphObservationReport, RuntimeGraphDriftReport, WorkOrder, or VerificationPlan artifacts were created.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "runtime" && subcommand === "graph" && positional === "observe") {
    // `rekon runtime graph observe [--root <path>] [--json]
    // [--event-log <path>] [--handoff-coverage-report <ref>]
    // [--handoff-contract <ref>] [--step-graph <ref>]
    // [--istanbul-coverage <path> --test-path <path>]
    // [--verification-run <ref>]` —
    // RuntimeGraphObservationReport v1.
    //
    // Generates an OBSERVED runtime graph from an optional raw runtime event
    // log (`.rekon/handoff-events.jsonl`): handoff events preserve workflow
    // flow and execution observations connect tests to source paths/routes.
    // This is observed runtime graph, NOT
    // declared topology, and NOT HandoffCoverageReport. Istanbul input records
    // observed execution; it does not calculate assertion or handoff coverage,
    // compare against declared artifacts, or detect drift. It creates no
    // RuntimeGraphDriftReport / WorkOrder / VerificationPlan and
    // mutates nothing (the event log or upstream artifacts); optional upstream
    // refs are citation/context only. See
    // docs/artifacts/runtime-graph-observation-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    // Optional raw runtime event log. Default `.rekon/handoff-events.jsonl`
    // under root, or an explicit `--event-log` path. A MISSING log is valid
    // (zero nodes / zero edges); the log is never mutated.
    const eventLogFlag = typeof parsed.flags["event-log"] === "string"
      ? parsed.flags["event-log"].trim()
      : "";
    const eventLogRelPath = eventLogFlag.length > 0 ? eventLogFlag : RUNTIME_GRAPH_OBSERVATION_EVENT_LOG_PATH;
    let eventLog: string | undefined;
    let eventLogPath: string | undefined;
    let eventLogHash: string | undefined;
    try {
      eventLog = await readFile(resolve(root, eventLogRelPath), "utf8");
    } catch {
      eventLog = undefined;
    }
    if (eventLog !== undefined) {
      eventLogPath = eventLogRelPath;
      eventLogHash = createHash("sha256").update(eventLog).digest("hex");
    }

    const istanbulCoverageFlagValue = parsed.flags["istanbul-coverage"];
    const lcovCoverageFlagValue = parsed.flags["lcov-coverage"];
    const testPathFlagValue = parsed.flags["test-path"];
    const verificationRunFlagValue = parsed.flags["verification-run"];
    if (istanbulCoverageFlagValue !== undefined && typeof istanbulCoverageFlagValue !== "string") {
      throw new Error("rekon runtime graph observe requires exactly one path after --istanbul-coverage.");
    }
    if (lcovCoverageFlagValue !== undefined && typeof lcovCoverageFlagValue !== "string") {
      throw new Error("rekon runtime graph observe requires exactly one path after --lcov-coverage.");
    }
    if (testPathFlagValue !== undefined && typeof testPathFlagValue !== "string") {
      throw new Error("rekon runtime graph observe requires exactly one path after --test-path.");
    }
    if (verificationRunFlagValue !== undefined && typeof verificationRunFlagValue !== "string") {
      throw new Error("rekon runtime graph observe requires exactly one ref after --verification-run.");
    }
    const istanbulCoverageFlag = typeof istanbulCoverageFlagValue === "string" ? istanbulCoverageFlagValue.trim() : "";
    const lcovCoverageFlag = typeof lcovCoverageFlagValue === "string" ? lcovCoverageFlagValue.trim() : "";
    if (istanbulCoverageFlag && lcovCoverageFlag) throw new Error("rekon runtime graph observe accepts only one coverage format at a time.");
    const coverageFlag = istanbulCoverageFlag || lcovCoverageFlag;
    const coverageFormat: CoverageObservationInput["format"] = lcovCoverageFlag ? "lcov" : "istanbul";
    const testPathFlag = typeof testPathFlagValue === "string"
      ? testPathFlagValue.trim()
      : "";
    if ((coverageFlag.length > 0) !== (testPathFlag.length > 0)) {
      throw new Error(
        "rekon runtime graph observe requires a coverage report and --test-path together. "
        + "Coverage reports have no per-test identity, so Rekon requires explicit attribution.",
      );
    }
    const verificationRunFlag = typeof verificationRunFlagValue === "string"
      ? verificationRunFlagValue.trim()
      : "";
    if (verificationRunFlag.length > 0 && coverageFlag.length === 0) {
      throw new Error("rekon runtime graph observe requires --istanbul-coverage or --lcov-coverage when --verification-run is supplied.");
    }
    let coverageResult: ReturnType<typeof parseIstanbulCoverage> | undefined;
    let coverageSource: NonNullable<ReturnType<typeof parseIstanbulCoverage>["coverageSource"]> | undefined;
    let coverageVerificationRunRef: ArtifactRef | undefined;
    if (coverageFlag.length > 0 && testPathFlag.length > 0) {
      let verification: CoverageObservationInput["verification"];
      if (verificationRunFlag.length > 0) {
        const { entry } = await resolveVerificationRunEntry(store, verificationRunFlag);
        const runValue = await store.read(entry);
        const validation = validateVerificationRun(runValue);
        if (!validation.ok) {
          const detail = validation.issues
            .slice(0, 5)
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ");
          throw new Error(
            `rekon runtime graph observe rejected malformed VerificationRun ${entry.id}: ${detail}`,
          );
        }
        const run = validation.value;
        coverageVerificationRunRef = toArtifactRef(entry);
        verification = { ref: coverageVerificationRunRef, run };
      }
      const parsedCoverage = await readCoverageObservation({
        root,
        format: coverageFormat,
        coveragePath: coverageFlag,
        testPath: testPathFlag,
        ...(verification ? { verification } : {}),
      });
      coverageResult = parsedCoverage.coverageResult;
      coverageSource = parsedCoverage.coverageSource;
    }

    // Optional upstream citation refs (context only; never read or compared).
    const resolveCitationRef = async (flagName: string, type: string): Promise<ArtifactRef | undefined> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      if (flag.length === 0) return undefined;
      const entry = await findArtifactEntry(store, flag);
      if (entry.type !== type) {
        throw new Error(`rekon runtime graph observe --${flagName} must reference a ${type}; got ${entry.type}.`);
      }
      return {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
    };
    const handoffCoverageReportRef = await resolveCitationRef("handoff-coverage-report", "HandoffCoverageReport");
    const handoffContractRef = await resolveCitationRef("handoff-contract", "HandoffContract");
    const stepCapabilityGraphRef = await resolveCitationRef("step-graph", "StepCapabilityGraph");

    const inputRefs: ArtifactRef[] = [];
    if (handoffCoverageReportRef) inputRefs.push(handoffCoverageReportRef);
    if (handoffContractRef) inputRefs.push(handoffContractRef);
    if (stepCapabilityGraphRef) inputRefs.push(stepCapabilityGraphRef);
    if (coverageVerificationRunRef) inputRefs.push(coverageVerificationRunRef);

    const generatedAt = new Date().toISOString();
    const header: ArtifactHeader = {
      artifactType: "RuntimeGraphObservationReport",
      artifactId: `${RUNTIME_GRAPH_OBSERVATION_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root },
      producer: { id: "@rekon/cli.runtime-graph-observe", version: "0.1.0-beta.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    };

    const report: RuntimeGraphObservationReport = buildRuntimeGraphObservationReport({
      header,
      eventLog,
      eventLogPath,
      eventLogHash,
      executionObservations: coverageResult?.observation ? [coverageResult.observation] : [],
      coverageSources: coverageSource ? [coverageSource] : [],
      handoffCoverageReportRef,
      handoffContractRef,
      stepCapabilityGraphRef,
    });

    const ref = await store.write(report, { category: "graphs" });

    if (json) {
      writeOutput(
        {
          artifact: { type: ref.type, id: ref.id },
          summary: report.summary,
          source: report.source,
          ...(coverageResult
            ? { coverage: { summary: coverageResult.summary, issues: coverageResult.issues } }
            : {}),
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Runtime graph observation report");
      lines.push("");
      lines.push(`Observed nodes: ${report.summary.observedNodes}`);
      lines.push(`Observed edges: ${report.summary.observedEdges}`);
      lines.push(`Handoff events: ${report.summary.handoffEvents}`);
      if (report.summary.executionObservations !== undefined) {
        lines.push(`Execution observations: ${report.summary.executionObservations}`);
      }
      if (coverageResult) {
        lines.push(`Istanbul observed files: ${coverageResult.summary.observedFiles}`);
        for (const issue of coverageResult.issues) {
          lines.push(`${issue.severity === "warning" ? "Warning" : "Error"}: ${issue.message}`);
        }
      }
      lines.push(`Ignored rows: ${report.summary.ignoredRows}`);
      lines.push(`Parse errors: ${report.summary.parseErrors}`);
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push(
        "No RuntimeGraphDriftReport, WorkOrder, or VerificationPlan artifacts were created.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "runtime" && subcommand === "graph" && positional === "drift") {
    // `rekon runtime graph drift [--root <path>] [--json] [--step-graph <ref>]
    // [--handoff-contract <ref>] [--handoff-coverage-report <ref>]
    // [--runtime-observation-report <ref>]` — RuntimeGraphDriftReport v1.
    //
    // Compares the four already-materialized graph artifacts
    // (StepCapabilityGraph, HandoffContract, HandoffCoverageReport,
    // RuntimeGraphObservationReport) into expected-vs-observed runtime graph
    // drift rows. This is drift, NOT runtime observation, NOT
    // HandoffCoverageReport, and NOT PathFreshnessReport / artifact lineage
    // freshness. It reads NO raw handoff event logs, re-evaluates NO
    // coverage, mutates nothing, and creates no WorkOrder / VerificationPlan.
    // See docs/artifacts/runtime-graph-drift-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const resolveAndRead = async <T>(flagName: string, type: string): Promise<{ value: T | undefined; ref: ArtifactRef | undefined }> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      let entry: ArtifactIndexEntry | undefined;
      if (flag.length > 0) {
        entry = await findArtifactEntry(store, flag);
        if (entry.type !== type) {
          throw new Error(`rekon runtime graph drift --${flagName} must reference a ${type}; got ${entry.type}.`);
        }
      } else {
        const entries = await store.list(type);
        entry = entries.at(-1);
      }
      if (!entry) return { value: undefined, ref: undefined };
      const value = (await store.read(entry)) as T;
      const ref: ArtifactRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      return { value, ref };
    };

    const stepGraph = await resolveAndRead<RuntimeGraphDriftStepGraphLike>("step-graph", "StepCapabilityGraph");
    const contract = await resolveAndRead<RuntimeGraphDriftHandoffContractLike>("handoff-contract", "HandoffContract");
    const coverage = await resolveAndRead<RuntimeGraphDriftCoverageReportLike>("handoff-coverage-report", "HandoffCoverageReport");
    const observation = await resolveAndRead<RuntimeGraphDriftObservationReportLike>("runtime-observation-report", "RuntimeGraphObservationReport");

    const inputRefs = [stepGraph.ref, contract.ref, coverage.ref, observation.ref].filter((ref): ref is ArtifactRef => !!ref);

    const generatedAt = new Date().toISOString();
    const header: ArtifactHeader = {
      artifactType: "RuntimeGraphDriftReport",
      artifactId: `${RUNTIME_GRAPH_DRIFT_REPORT_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root },
      producer: { id: "@rekon/cli.runtime-graph-drift", version: "0.1.0-beta.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    };

    const report: RuntimeGraphDriftReport = buildRuntimeGraphDriftReport({
      header,
      stepCapabilityGraph: stepGraph.value,
      stepCapabilityGraphRef: stepGraph.ref,
      handoffContract: contract.value,
      handoffContractRef: contract.ref,
      handoffCoverageReport: coverage.value,
      handoffCoverageReportRef: coverage.ref,
      runtimeGraphObservationReport: observation.value,
      runtimeGraphObservationReportRef: observation.ref,
    });

    const ref = await store.write(report, { category: "actions" });

    if (json) {
      writeOutput(
        { artifact: { type: ref.type, id: ref.id }, summary: report.summary, source: report.source },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Runtime graph drift report");
      lines.push("");
      lines.push(`Total rows: ${report.summary.total}`);
      lines.push(`In sync: ${report.summary.inSync}`);
      lines.push(`Missing expected: ${report.summary.missingExpected}`);
      lines.push(`Added observed: ${report.summary.addedObserved}`);
      lines.push(`Uncovered handoff: ${report.summary.uncoveredHandoff}`);
      lines.push(`Unresolved contract: ${report.summary.unresolvedContract}`);
      lines.push(`Observation missing: ${report.summary.observationMissing}`);
      lines.push(`Not evaluated: ${report.summary.notEvaluated}`);
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push("No WorkOrder or VerificationPlan artifacts were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "context" && positional === "prepare") {
    // `rekon intent context prepare [--root <path>] [--json]` — build the
    // intent-readiness context substrate `rekon intent assess` needs
    // (StepCapabilityGraph + HandoffContract + RuntimeGraphObservationReport +
    // RuntimeGraphDriftReport + HandoffCoverageReport) by running the existing
    // producer commands in dependency order. On a repo with no runtime/handoff
    // event log, the runtime/handoff artifacts are written as explicit
    // not-evaluated context, NOT false success. This executes no source changes,
    // runs no Circe, creates no WorkOrder / VerificationPlan, does not implement
    // intent:go, and writes nothing outside `.rekon/`.
    const results = await prepareIntentContext(root);
    const built = results.filter((entry) => entry.status === "passed").length;
    const boundaries = {
      executedCommands: false,
      wroteSourceFiles: false,
      ranCirce: false,
      createdWorkOrder: false,
      createdVerificationPlan: false,
      implementedIntentGo: false,
    };

    if (json) {
      writeOutput(
        {
          command: "intent context prepare",
          steps: results,
          summary: { total: results.length, built, failed: results.length - built },
          boundaries,
          nextActions: ['rekon intent assess --goal "..." --kind feature --path <path>'],
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Rekon intent context prepare");
      lines.push("");
      for (const entry of results) {
        lines.push(
          `  ${entry.status === "passed" ? "ok  " : "FAIL"} ${entry.command}${entry.message ? ` — ${entry.message}` : ""}`,
        );
      }
      lines.push("");
      lines.push(
        `Built ${built}/${results.length} context artifacts. Runtime/handoff context with no event log is written as explicit not-evaluated context, not success.`,
      );
      lines.push("");
      lines.push("Next:");
      lines.push('  rekon intent assess --goal "..." --kind feature --path <path>');
      lines.push("");
      lines.push(
        "No source files, commands, Circe runs, WorkOrder, VerificationPlan, or intent:go were created.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "assess") {
    // `rekon intent assess --goal <text> [--root <path>] [--json]
    // [--kind <bug|feature|refactor|investigation|migration|documentation|unknown>]
    // [--path <p>] [--system <s>] [--capability <c>] [--step <s>]
    // [--constraint <c>] [--non-goal <n>]
    // [--verification-result <ref>] [--verification-run <ref>]
    // [--verification-plan <ref>]` — IntentAssessmentReport v1.
    //
    // A read-only readiness assessment of the requested intent against the
    // latest available context artifacts (CapabilityMap, StepCapabilityGraph,
    // HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport,
    // VerificationResult). This is ASSESSMENT, not WorkOrder. It creates no
    // WorkOrder / VerificationPlan, executes no commands, writes no source,
    // and mutates nothing. `RuntimeGraphDriftReport` is an input to readiness,
    // not the intent system itself. PreparedIntentPlan, IntentStatusReport,
    // and intent:go remain deferred. See docs/artifacts/intent-assessment-report.md.
    const goal = typeof parsed.flags.goal === "string" ? parsed.flags.goal.trim() : "";
    if (goal.length === 0) {
      throw new Error("rekon intent assess requires --goal <text>.");
    }

    const kindFlag = typeof parsed.flags.kind === "string" ? parsed.flags.kind.trim() : "unknown";
    if (!isIntentTaskKind(kindFlag)) {
      throw new Error(
        `rekon intent assess --kind must be one of ${INTENT_TASK_KINDS.join(", ")}; got ${kindFlag}.`,
      );
    }
    const kind: IntentAssessmentIntentKind = kindFlag;

    const listFlag = (name: string): string[] =>
      parseRepeatableFlag(parsed.flags[name])
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

    const scope: IntentAssessmentScope = {};
    const scopePaths = listFlag("path");
    if (scopePaths.length > 0) scope.paths = scopePaths;
    const scopeSystems = listFlag("system");
    if (scopeSystems.length > 0) scope.systems = scopeSystems;
    const scopeCapabilities = listFlag("capability");
    if (scopeCapabilities.length > 0) scope.capabilities = scopeCapabilities;
    const scopeSteps = listFlag("step");
    if (scopeSteps.length > 0) scope.steps = scopeSteps;
    const constraints = listFlag("constraint");
    const nonGoals = listFlag("non-goal");

    const request: IntentAssessmentRequest = { goal, kind };
    if (Object.keys(scope).length > 0) request.scope = scope;
    if (constraints.length > 0) request.constraints = constraints;
    if (nonGoals.length > 0) request.nonGoals = nonGoals;

    const store = createLocalArtifactStore(root);
    await store.init();

    const latestArtifact = async <T>(type: string): Promise<{ value: T | undefined; ref: ArtifactRef | undefined }> => {
      const entries = await store.list(type);
      const entry = entries.at(-1);
      if (!entry) return { value: undefined, ref: undefined };
      const value = (await store.read(entry)) as T;
      const ref: ArtifactRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      return { value, ref };
    };

    const selectedArtifact = async <T>(
      flagName: string,
      type: string,
    ): Promise<{ value: T | undefined; ref: ArtifactRef | undefined }> => {
      const flag = typeof parsed.flags[flagName] === "string"
        ? parsed.flags[flagName].trim()
        : "";
      if (flag.length === 0) return { value: undefined, ref: undefined };
      const entry = await findArtifactEntry(store, flag);
      if (entry.type !== type) {
        throw new Error(
          `rekon intent assess --${flagName} must reference a ${type}; got ${entry.type}.`,
        );
      }
      return {
        value: (await store.read(entry)) as T,
        ref: {
          type: entry.type,
          id: entry.id,
          path: entry.path,
          digest: entry.digest,
          schemaVersion: entry.schemaVersion ?? "0.1.0",
        },
      };
    };

    const capabilityMap = await latestArtifact<IntentAssessmentCapabilityMapLike>("CapabilityMap");
    const capabilityContract = await latestArtifact<unknown>("CapabilityContract");
    const stepGraph = await latestArtifact<IntentAssessmentStepGraphLike>("StepCapabilityGraph");
    const handoffContract = await latestArtifact<unknown>("HandoffContract");
    const coverage = await latestArtifact<IntentAssessmentHandoffCoverageReportLike>("HandoffCoverageReport");
    const observation = await latestArtifact<unknown>("RuntimeGraphObservationReport");
    const drift = await latestArtifact<IntentAssessmentRuntimeDriftReportLike>("RuntimeGraphDriftReport");
    const findingReport = await latestArtifact<unknown>("FindingReport");
    const freshness = await latestArtifact<IntentAssessmentPathFreshnessReportLike>("PathFreshnessReport");
    // Verification artifacts are intent-specific proof. They are consumed only
    // when the operator selects them; an unrelated prior intent must not become
    // an implicit prerequisite for a new assessment.
    const proof = await selectedArtifact<IntentAssessmentVerificationResultLike>(
      "verification-result",
      "VerificationResult",
    );
    const verificationRun = await selectedArtifact<unknown>("verification-run", "VerificationRun");
    const verificationPlan = await selectedArtifact<unknown>("verification-plan", "VerificationPlan");

    const inputRefs = [
      capabilityMap.ref,
      capabilityContract.ref,
      stepGraph.ref,
      handoffContract.ref,
      coverage.ref,
      observation.ref,
      drift.ref,
      findingReport.ref,
      freshness.ref,
      proof.ref,
      verificationRun.ref,
      verificationPlan.ref,
    ].filter((ref): ref is ArtifactRef => !!ref);

    const assessmentArtifactId = `${INTENT_ASSESSMENT_REPORT_ARTIFACT_ID_PREFIX}${Date.now()}`;
    const header: ArtifactHeader = {
      artifactType: "IntentAssessmentReport",
      artifactId: assessmentArtifactId,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      supersession: { key: `intent:${assessmentArtifactId}` },
      subject: { repoId: root },
      producer: { id: "@rekon/cli.intent-assess", version: "0.1.0-beta.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.7 },
    };

    // Semantic File Understanding context (slice 150). Opt-in via
    // `--semantic-context latest` or `--semantic-context-ref <ref>`; proposal/
    // context only — enriches matched paths + warnings, never readiness/proof.
    const semanticContextMode =
      typeof parsed.flags["semantic-context"] === "string" ? String(parsed.flags["semantic-context"]).trim() : "";
    const semanticContextRefs = parseRepeatableFlag(parsed.flags["semantic-context-ref"]);
    const semanticSelection = await resolveSemanticFileContextSelection({
      store,
      root,
      requestedPaths: scopePaths,
      mode: semanticContextMode,
      refs: semanticContextRefs,
    });

    // TaskContextReport intent context (slice 171). Opt-in via `--task-context
    // latest` or `--task-context-ref <ref>`; proposal/context only — enriches
    // matched paths/capabilities + warnings, never readiness/proof.
    const taskContextMode =
      typeof parsed.flags["task-context"] === "string" ? String(parsed.flags["task-context"]).trim() : "";
    const taskContextRefs = parseRepeatableFlag(parsed.flags["task-context-ref"]);
    const taskContextSelection = await resolveTaskContextSelection({
      store,
      root,
      requestedPaths: scopePaths,
      mode: taskContextMode,
      refs: taskContextRefs,
      goal,
    });

    const report: IntentAssessmentReport = buildIntentAssessmentReport({
      header,
      request,
      ...(semanticSelection ? { semanticFileContext: semanticSelection } : {}),
      ...(taskContextSelection ? { taskContext: taskContextSelection } : {}),
      capabilityMap: capabilityMap.value,
      capabilityMapRef: capabilityMap.ref,
      capabilityContractRef: capabilityContract.ref,
      stepCapabilityGraph: stepGraph.value,
      stepCapabilityGraphRef: stepGraph.ref,
      handoffContractRef: handoffContract.ref,
      handoffCoverageReport: coverage.value,
      handoffCoverageReportRef: coverage.ref,
      runtimeGraphObservationReportRef: observation.ref,
      runtimeGraphDriftReport: drift.value,
      runtimeGraphDriftReportRef: drift.ref,
      findingReportRef: findingReport.ref,
      pathFreshnessReport: freshness.value,
      pathFreshnessReportRef: freshness.ref,
      verificationResult: proof.value,
      verificationResultRef: proof.ref,
      verificationRunRef: verificationRun.ref,
      verificationPlanRef: verificationPlan.ref,
    });

    const ref = await store.write(report, { category: "actions" });

    if (json) {
      writeOutput(
        {
          artifact: { type: ref.type, id: ref.id },
          readiness: {
            status: report.readiness.status,
            recommendedNextAction: report.readiness.recommendedNextAction,
          },
          blockers: report.blockers.length,
          warnings: report.warnings.length,
          missingContext: report.missingContext.length,
          matchedContext: report.matchedContext,
          ...(semanticSelection ? { semanticContext: summarizeSemanticFileContext(semanticSelection) } : {}),
          ...(taskContextSelection ? { taskContext: summarizeTaskContext(taskContextSelection) } : {}),
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Intent assessment");
      lines.push("");
      lines.push(`Goal: ${report.request.goal}`);
      lines.push(`Kind: ${report.request.kind}`);
      lines.push(`Readiness: ${report.readiness.status}`);
      lines.push(`Recommended next action: ${report.readiness.recommendedNextAction}`);
      lines.push(`Blockers: ${report.blockers.length}`);
      lines.push(`Warnings: ${report.warnings.length}`);
      lines.push(`Missing context: ${report.missingContext.length}`);
      if (semanticSelection) {
        lines.push(
          `Semantic context: ${semanticSelection.usedReports.length} used, ${semanticSelection.staleReports.length} stale`,
        );
      }
      if (taskContextSelection) {
        lines.push(
          `Task context: ${taskContextSelection.usedReports.length} used, ${taskContextSelection.staleReports.length} stale, ${taskContextSelection.missingReports.length} missing`,
        );
      }
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push("No WorkOrder, VerificationPlan, commands, or source writes were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "plan" && positional === "review") {
    // `rekon intent plan review --plan <path> [--goal <text>] [--kind <kind>]
    // [--target generic|circe] [--semantic off|auto|required] [--root <path>] [--json]` — Intent Plan
    // Actionability / Compiler (slice 129).
    //
    // Reads a raw / semi-structured plan file, normalizes it into executable phase
    // drafts, evaluates actionability, and writes ONE IntentPlanActionabilityReport
    // with findings + elicitation questions + a revision prompt. Read/transform/
    // report-only: it executes no commands, writes no source, creates no
    // PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun /
    // VerificationResult, runs no Circe, and does not implement intent:go. LLM-backed
    // semantic normalization is bounded to text transformation and is reported via a
    // deterministic-fallback warning when no provider is configured.
    // See docs/concepts/intent-plan-compiler.md.
    const planFlag = typeof parsed.flags.plan === "string" ? parsed.flags.plan.trim() : "";
    if (planFlag.length === 0) {
      throw new Error("rekon intent plan review requires --plan <path>.");
    }
    const semanticFlag = typeof parsed.flags.semantic === "string" ? parsed.flags.semantic.trim() : "off";
    if (semanticFlag !== "off" && semanticFlag !== "auto" && semanticFlag !== "required") {
      throw new Error("rekon intent plan review --semantic must be one of off, auto, required.");
    }
    const targetFlag = typeof parsed.flags.target === "string" ? parsed.flags.target.trim() : "";
    if (targetFlag.length > 0 && targetFlag !== "generic" && targetFlag !== "circe") {
      throw new Error("rekon intent plan review --target must be generic or circe.");
    }
    const reviewTarget: "generic" | "circe" = targetFlag === "circe" ? "circe" : "generic";
    const goal = typeof parsed.flags.goal === "string" ? parsed.flags.goal : undefined;
    const kindFlag = typeof parsed.flags.kind === "string" ? parsed.flags.kind.trim() : "";
    if (kindFlag.length > 0 && !isIntentTaskKind(kindFlag)) {
      throw new Error(
        `rekon intent plan review --kind must be one of ${INTENT_TASK_KINDS.join(", ")}; got ${kindFlag}.`,
      );
    }
    const kind = kindFlag.length > 0 ? kindFlag : undefined;

    const resolvedPlanPath = resolve(root, planFlag);
    let planText: string;
    try {
      planText = await readFile(resolvedPlanPath, "utf8");
    } catch {
      throw new Error(`rekon intent plan review could not read the plan file at ${planFlag}.`);
    }
    const planSha256 = createHash("sha256").update(planText).digest("hex");

    // Router-bound semantic normalization adapter (slice 138). The router holds
    // NO live providers in this slice, so any requested provider is unknown:
    // `--semantic auto` deterministically falls back (the adapter returns no
    // phases → the builder warns); `--semantic required` throws (the build
    // rejects → the CLI exits non-zero and writes no report); `--semantic off`
    // stays purely deterministic. Provider output is schema-gated via
    // coercePhaseDrafts and re-checked by the deterministic actionability
    // evaluator — it is a proposal, not proof.
    const llmProviderFlag =
      typeof parsed.flags["llm-provider"] === "string" ? String(parsed.flags["llm-provider"]).trim() : "";
    const llmModelFlag =
      typeof parsed.flags["llm-model"] === "string" ? String(parsed.flags["llm-model"]).trim() : "";
    const planSemanticAdapter = createPlanSemanticNormalizationAdapter(semanticFlag, llmProviderFlag, llmModelFlag);

    // Supported-context for the semantic quality guard (slice 142): operator
    // `--path` declarations plus the repo's package.json script command forms.
    // Read-only and best-effort; absent context simply tightens the guard.
    const providedPaths = parseRepeatableFlag(parsed.flags.path);
    const packageScripts = await readPackageScriptForms(root);

    const store = createLocalArtifactStore(root);
    await store.init();

    // Semantic File Understanding context (slice 150). Opt-in via
    // `--semantic-context latest` or `--semantic-context-ref <ref>`; proposal/
    // context only — appends grounding to the revision prompt, never changes
    // actionability status, findings, or proof.
    const semanticContextMode =
      typeof parsed.flags["semantic-context"] === "string" ? String(parsed.flags["semantic-context"]).trim() : "";
    const semanticContextRefs = parseRepeatableFlag(parsed.flags["semantic-context-ref"]);
    const semanticSelection = await resolveSemanticFileContextSelection({
      store,
      root,
      requestedPaths: providedPaths,
      mode: semanticContextMode,
      refs: semanticContextRefs,
    });

    // TaskContextReport intent context (slice 171). Opt-in via `--task-context
    // latest` or `--task-context-ref <ref>`; proposal/context only — appends
    // grounding to the revision prompt + warnings to the normalization trace,
    // never changes actionability status, findings, or proof.
    const taskContextMode =
      typeof parsed.flags["task-context"] === "string" ? String(parsed.flags["task-context"]).trim() : "";
    const taskContextRefs = parseRepeatableFlag(parsed.flags["task-context-ref"]);
    const taskContextSelection = await resolveTaskContextSelection({
      store,
      root,
      requestedPaths: providedPaths,
      mode: taskContextMode,
      refs: taskContextRefs,
      ...(goal ? { goal } : {}),
      planText,
    });

    const report = await buildIntentPlanActionabilityReport({
      planText,
      planPath: planFlag,
      planSha256,
      goal,
      kind,
      target: reviewTarget,
      root,
      semanticMode: semanticFlag,
      ...(planSemanticAdapter ? { semanticNormalization: planSemanticAdapter } : {}),
      ...(providedPaths.length > 0 ? { providedPaths } : {}),
      ...(packageScripts.length > 0 ? { packageScripts } : {}),
      ...(semanticSelection ? { semanticFileContext: semanticSelection } : {}),
      ...(taskContextSelection ? { taskContext: taskContextSelection } : {}),
    });

    const ref = await store.write(report, { category: "actions" });
    const nextAction = report.status.value === "actionable" ? "prepare-intent" : "revise-plan";

    if (json) {
      writeOutput(
        {
          status: report.status.value,
          artifact: { type: ref.type, id: ref.id },
          summary: {
            totalPhases: report.summary.totalPhases,
            findings: report.summary.findings,
            questions: report.summary.questions,
          },
          // Surface the normalization trace so `--json` consumers (operators /
          // agents) can see whether semantic normalization actually fired and via
          // which provider/model, without a second `artifacts show`. Additive,
          // read-only: provider output stays a proposal that the deterministic
          // evaluator already re-checked into the findings above (slice 141).
          normalization: {
            method: report.normalizationTrace.method,
            invokedSemanticNormalization: report.normalizationTrace.invokedSemanticNormalization,
            ...(typeof report.normalizationTrace.provider === "string"
              ? { provider: report.normalizationTrace.provider }
              : {}),
            ...(typeof report.normalizationTrace.model === "string"
              ? { model: report.normalizationTrace.model }
              : {}),
            warnings: report.normalizationTrace.warnings,
          },
          target: reviewTarget,
          ...(semanticSelection ? { semanticContext: summarizeSemanticFileContext(semanticSelection) } : {}),
          ...(taskContextSelection ? { taskContext: summarizeTaskContext(taskContextSelection) } : {}),
          nextAction,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Intent plan review", "");
      lines.push(`Status: ${report.status.value}`);
      lines.push(`Target: ${reviewTarget}`);
      lines.push(`Findings: ${report.summary.findings}`);
      lines.push(`Questions: ${report.summary.questions}`);
      if (semanticSelection) {
        lines.push(
          `Semantic context: ${semanticSelection.usedReports.length} used, ${semanticSelection.staleReports.length} stale`,
        );
      }
      if (taskContextSelection) {
        lines.push(
          `Task context: ${taskContextSelection.usedReports.length} used, ${taskContextSelection.staleReports.length} stale, ${taskContextSelection.missingReports.length} missing`,
        );
      }
      if (report.normalizationTrace.warnings.length > 0) {
        lines.push(`Normalization: ${report.normalizationTrace.method} (${report.normalizationTrace.warnings[0]})`);
      }
      lines.push(
        report.status.value === "actionable"
          ? "Next: the plan is actionable — proceed to rekon intent assess / prepare."
          : "Next: revise the plan using the generated revision prompt.",
      );
      lines.push("");
      lines.push("No PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, commands, source writes, Circe run, or intent:go were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "semantic" && subcommand === "file" && positional === "understand") {
    // `rekon semantic file understand --path <file> [--semantic off|auto|required]
    // [--llm-provider <id>] [--llm-model <model>] [--root <path>] [--json]` —
    // Semantic File Understanding v1 (slice 144).
    //
    // Reads ONE source file, deterministically extracts a structural understanding
    // (language, line/byte counts, imports, public exports, responsibilities), and
    // optionally enriches it with a router-bound LLM semantic understanding
    // (purpose / capability signals / findings). Imports and public exports are
    // ALWAYS the deterministic extraction (the hallucination guard); provider
    // output is schema-gated and deterministically re-checked — a proposal, not
    // proof. Writes exactly ONE SemanticFileUnderstandingReport. It executes no
    // commands, writes no source, generates no embeddings, creates no
    // PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun /
    // VerificationResult, runs no Circe, and does not implement intent:go.
    // See docs/concepts/semantic-file-understanding.md.
    const pathFlag = typeof parsed.flags.path === "string" ? parsed.flags.path.trim() : "";
    if (pathFlag.length === 0) {
      throw new Error("rekon semantic file understand requires --path <file>.");
    }
    const semanticFlag = typeof parsed.flags.semantic === "string" ? parsed.flags.semantic.trim() : "off";
    if (semanticFlag !== "off" && semanticFlag !== "auto" && semanticFlag !== "required") {
      throw new Error("rekon semantic file understand --semantic must be one of off, auto, required.");
    }

    const resolvedFile = await resolveReadableRepoFile(root, pathFlag, "rekon semantic file understand");
    let fileText: string;
    try {
      fileText = await readFile(resolvedFile.absolutePath, "utf8");
    } catch {
      throw new Error(`rekon semantic file understand could not read the file at ${pathFlag}.`);
    }
    const fileSha256 = createHash("sha256").update(fileText).digest("hex");

    // Router-bound semantic-understanding adapter (slice 144). With no API key the
    // OpenAI-compatible provider self-guards (`missing-api-key`, no network), so
    // `--semantic auto` falls back to deterministic structural understanding with a
    // warning, `--semantic required` exits non-zero (the build rejects → no report),
    // and `--semantic off` stays purely deterministic. The API key is read here from
    // the environment, never inside capability-model, never stored in repo config.
    const llmProviderFlag =
      typeof parsed.flags["llm-provider"] === "string" ? String(parsed.flags["llm-provider"]).trim() : "";
    const llmModelFlag =
      typeof parsed.flags["llm-model"] === "string" ? String(parsed.flags["llm-model"]).trim() : "";
    const understandingAdapter = createSemanticFileUnderstandingAdapter(semanticFlag, llmProviderFlag, llmModelFlag);

    const store = createLocalArtifactStore(root);
    await store.init();

    const { report, ref } = await produceSemanticFileUnderstandingReport(store, {
      filePath: resolvedFile.relativePath,
      fileText,
      fileSha256,
      root,
      semanticMode: semanticFlag,
      ...(understandingAdapter ? { semanticUnderstanding: understandingAdapter } : {}),
    });

    if (json) {
      writeOutput(
        {
          status: report.status.value,
          artifact: { type: ref.type, id: ref.id },
          file: {
            path: report.file.path,
            sha256: report.file.sha256,
            ...(typeof report.file.language === "string" ? { language: report.file.language } : {}),
            lineCount: report.file.lineCount,
            byteLength: report.file.byteLength,
          },
          normalization: {
            method: report.normalizationTrace.method,
            invokedSemanticUnderstanding: report.normalizationTrace.invokedSemanticUnderstanding,
            provenance: report.normalizationTrace.provenance,
            ...(typeof report.normalizationTrace.provider === "string"
              ? { provider: report.normalizationTrace.provider }
              : {}),
            ...(typeof report.normalizationTrace.model === "string" ? { model: report.normalizationTrace.model } : {}),
            warnings: report.normalizationTrace.warnings,
          },
          summary: {
            purpose: report.summary.purpose,
            responsibilities: report.summary.responsibilities.length,
            publicExports: report.summary.publicExports.length,
            imports: report.summary.imports.length,
            touchedConcepts: report.summary.touchedConcepts.length,
            capabilitySignals: report.capabilitySignals.length,
            findings: report.findings.length,
          },
          boundaries: {
            executedCommands: report.boundaries.executedCommands,
            wroteSourceFiles: report.boundaries.wroteSourceFiles,
            generatedEmbeddings: report.boundaries.generatedEmbeddings,
            ranCirce: report.boundaries.ranCirce,
            implementedIntentGo: report.boundaries.implementedIntentGo,
          },
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Semantic file understanding", "");
      lines.push(`File: ${report.file.path}${typeof report.file.language === "string" ? ` (${report.file.language})` : ""}`);
      lines.push(`Status: ${report.status.value} — ${report.status.reason}`);
      const traceProvider = typeof report.normalizationTrace.provider === "string" ? ` via ${report.normalizationTrace.provider}` : "";
      const traceModel = typeof report.normalizationTrace.model === "string" ? ` (${report.normalizationTrace.model})` : "";
      lines.push(`Method: ${report.normalizationTrace.method}${traceProvider}${traceModel}`);
      if (report.summary.purpose.length > 0) lines.push(`Purpose: ${report.summary.purpose}`);
      lines.push(
        `Exports: ${report.summary.publicExports.length} · Imports: ${report.summary.imports.length} · Responsibilities: ${report.summary.responsibilities.length}`,
      );
      lines.push(`Capability signals: ${report.capabilitySignals.length} · Findings: ${report.findings.length}`);
      const firstWarning = report.normalizationTrace.warnings[0];
      if (typeof firstWarning === "string") lines.push(`Note: ${firstWarning}`);
      lines.push("");
      lines.push(
        "No commands were executed, no source was written, no embeddings were generated, no PreparedIntentPlan / WorkOrder / VerificationPlan was created, Circe was not run, and intent:go was not implemented.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "plan" && positional === "answer") {
    // `rekon intent plan answer --report <ref> --answer <question-id>=<answer>
    // [--answer ...] [--answers <path-to-json>] [--answered-by <name>] [--root <path>]
    // [--json]` — Plan Actionability Answer / Merge-Back (slice 134).
    //
    // Reads an existing IntentPlanActionabilityReport, merges answers (tied to that
    // report's elicitation questions by question id) deterministically into COPIES of
    // the normalized phase drafts, re-runs actionability, and writes exactly ONE new
    // IntentPlanActionabilityReport revision. It never mutates the source report,
    // never writes the source plan file, executes no commands, and creates no
    // PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun /
    // VerificationResult, and does not run Circe or implement intent:go.
    // See docs/strategy/plan-actionability-answer-merge-back-implementation.md.
    const reportFlag = typeof parsed.flags.report === "string" ? parsed.flags.report.trim() : "";
    if (reportFlag.length === 0) {
      throw new Error("rekon intent plan answer requires --report <IntentPlanActionabilityReport:id|type:id>.");
    }
    const answeredBy = typeof parsed.flags["answered-by"] === "string" ? parsed.flags["answered-by"].trim() : undefined;

    // Collect answers from repeatable --answer <question-id>=<answer> and/or --answers <json>.
    const answerInputs: IntentPlanAnswerInput[] = [];
    for (const raw of parseRepeatableFlag(parsed.flags.answer)) {
      const eq = raw.indexOf("=");
      if (eq < 0) {
        throw new Error(`rekon intent plan answer --answer must be <question-id>=<answer>; got "${raw}".`);
      }
      answerInputs.push({ questionId: raw.slice(0, eq).trim(), answer: raw.slice(eq + 1) });
    }
    const answersFile = typeof parsed.flags.answers === "string" ? parsed.flags.answers.trim() : "";
    if (answersFile.length > 0) {
      let parsedAnswers: unknown;
      try {
        parsedAnswers = JSON.parse(await readFile(resolve(root, answersFile), "utf8"));
      } catch {
        throw new Error(`rekon intent plan answer could not read or parse the answers JSON at ${answersFile}.`);
      }
      const list = Array.isArray(parsedAnswers)
        ? parsedAnswers
        : parsedAnswers && typeof parsedAnswers === "object" && Array.isArray((parsedAnswers as { answers?: unknown }).answers)
          ? (parsedAnswers as { answers: unknown[] }).answers
          : null;
      if (!list) {
        throw new Error('rekon intent plan answer --answers JSON must be an array or an object with an "answers" array.');
      }
      for (const entry of list) {
        if (!entry || typeof entry !== "object") continue;
        const rec = entry as { questionId?: unknown; id?: unknown; answer?: unknown };
        const questionId = typeof rec.questionId === "string" ? rec.questionId : typeof rec.id === "string" ? rec.id : "";
        const answer = typeof rec.answer === "string" ? rec.answer : "";
        answerInputs.push({ questionId, answer });
      }
    }
    if (answerInputs.length === 0) {
      throw new Error("rekon intent plan answer requires at least one --answer <question-id>=<answer> or --answers <json>.");
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const reportEntry = await findArtifactEntry(store, reportFlag);
    if (reportEntry.type !== "IntentPlanActionabilityReport") {
      throw new Error(`rekon intent plan answer --report must reference an IntentPlanActionabilityReport; got ${reportEntry.type}.`);
    }
    const sourceReport = (await store.read(reportEntry)) as IntentPlanActionabilityReport;
    const sourceReportRef: ArtifactRef = {
      type: reportEntry.type,
      id: reportEntry.id,
      path: reportEntry.path,
      digest: reportEntry.digest,
      schemaVersion: reportEntry.schemaVersion ?? "0.1.0",
    };

    const result = buildAnsweredIntentPlanActionabilityReport({
      report: sourceReport,
      reportRef: sourceReportRef,
      answers: answerInputs,
      answeredBy,
      root,
    });

    // Cosmetic boundary surface (all-false): this command writes exactly one new
    // report revision and nothing else.
    const boundaries = {
      createdPreparedIntentPlan: false,
      createdWorkOrder: false,
      createdVerificationPlan: false,
      createdVerificationRun: false,
      createdVerificationResult: false,
      executedCommands: false,
      wroteSourceFiles: false,
      ranCirce: false,
      implementedIntentGo: false,
    };

    if (result.status === "blocked") {
      process.exitCode = 1;
      if (json) {
        writeOutput(
          {
            status: "blocked",
            blockers: result.blockers.map((b) => ({ id: b.id, category: b.category, severity: b.severity, message: b.message })),
            boundaries,
          },
          true,
        );
      } else {
        const lines: string[] = [];
        lines.push("Intent plan answer: blocked", "");
        lines.push("No report was written. Resolve these blockers and retry:");
        for (const b of result.blockers) lines.push(`- [${b.category}] ${b.message}`);
        lines.push("");
        lines.push("The source report and plan file were left unchanged. No downstream artifacts were created.");
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    const ref = await store.write(result.report, { category: "actions" });
    const nextAction = result.report.status.value === "actionable" ? "prepare-intent" : "revise-plan";

    if (json) {
      writeOutput(
        {
          status: result.report.status.value,
          artifact: { type: ref.type, id: ref.id },
          sourceReport: { type: sourceReportRef.type, id: sourceReportRef.id },
          summary: {
            findings: result.report.summary.findings,
            questions: result.report.summary.questions,
            appliedAnswers: result.appliedAnswers,
            unappliedAnswers: result.unappliedAnswers.length,
          },
          unappliedAnswers: result.unappliedAnswers,
          nextAction,
          boundaries,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Intent plan answer", "");
      lines.push(`New report: ${ref.type}:${ref.id}`);
      lines.push(`Status: ${result.report.status.value}`);
      lines.push(`Applied answers: ${result.appliedAnswers}`);
      lines.push(`Unapplied answers: ${result.unappliedAnswers.length}`);
      lines.push(`Findings: ${result.report.summary.findings}`);
      lines.push(`Questions: ${result.report.summary.questions}`);
      for (const u of result.unappliedAnswers) lines.push(`- unapplied ${u.questionId}: ${u.reason}`);
      lines.push(
        result.report.status.value === "actionable"
          ? "Next: the plan is actionable — proceed to rekon intent prepare --actionability-report."
          : "Next: answer the remaining questions or revise, then re-run rekon intent plan answer.",
      );
      lines.push("");
      lines.push("The source report and plan file were left unchanged. No PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, commands, source writes, Circe run, or intent:go were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "prepare") {
    // `rekon intent prepare --assessment <IntentAssessmentReport:id|type:id>
    // [--root <path>] [--json] [--capability-map <ref>] [--step-graph <ref>]
    // [--handoff-coverage-report <ref>] [--runtime-observation-report <ref>]
    // [--runtime-drift-report <ref>] [--path-freshness-report <ref>]
    // [--verification-result <ref>]` — PreparedIntentPlan v1.
    //
    // A read-only phase/gate preparation generated from an IntentAssessmentReport
    // plus the latest available context. This is phase/gate preparation, NOT
    // WorkOrder. It creates no WorkOrder / VerificationPlan, executes no
    // commands, writes no source, and mutates nothing. Verification requirements
    // are not VerificationPlan. IntentStatusReport remains the next layer;
    // intent:go remains deferred; source-write behavior remains unavailable.
    // See docs/artifacts/prepared-intent-plan.md.
    const assessmentFlag = typeof parsed.flags.assessment === "string" ? parsed.flags.assessment.trim() : "";
    if (assessmentFlag.length === 0) {
      throw new Error("rekon intent prepare requires --assessment <IntentAssessmentReport:id|type:id>.");
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const assessmentEntry = await findArtifactEntry(store, assessmentFlag);
    if (assessmentEntry.type !== "IntentAssessmentReport") {
      throw new Error(`rekon intent prepare --assessment must reference an IntentAssessmentReport; got ${assessmentEntry.type}.`);
    }
    const assessmentValue = (await store.read(assessmentEntry)) as PreparedIntentAssessmentReportLike;
    const assessmentRef: ArtifactRef = {
      type: assessmentEntry.type,
      id: assessmentEntry.id,
      path: assessmentEntry.path,
      digest: assessmentEntry.digest,
      schemaVersion: assessmentEntry.schemaVersion ?? "0.1.0",
    };

    const resolveRef = async (flagName: string, type: string): Promise<ArtifactRef | undefined> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      let entry: ArtifactIndexEntry | undefined;
      if (flag.length > 0) {
        entry = await findArtifactEntry(store, flag);
        if (entry.type !== type) {
          throw new Error(`rekon intent prepare --${flagName} must reference a ${type}; got ${entry.type}.`);
        }
      } else {
        const entries = await store.list(type);
        entry = entries.at(-1);
      }
      if (!entry) return undefined;
      return {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
    };

    // Proof-bearing inputs are read as VALUES (not just refs) so the approval
    // envelope can re-check runtime drift, handoff coverage, freshness, and
    // verification proof rather than trusting assessment readiness alone.
    const resolveRefWithValue = async <T>(flagName: string, type: string): Promise<{ ref?: ArtifactRef; value?: T }> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      let entry: ArtifactIndexEntry | undefined;
      if (flag.length > 0) {
        entry = await findArtifactEntry(store, flag);
        if (entry.type !== type) {
          throw new Error(`rekon intent prepare --${flagName} must reference a ${type}; got ${entry.type}.`);
        }
      } else {
        const entries = await store.list(type);
        entry = entries.at(-1);
      }
      if (!entry) return {};
      const ref: ArtifactRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      const value = (await store.read(entry)) as T;
      return { ref, value };
    };

    const resolveAssessmentProofWithValue = async <T>(
      flagName: string,
      type: string,
    ): Promise<{ ref?: ArtifactRef; value?: T }> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      let entry: ArtifactIndexEntry | undefined;

      if (flag.length > 0) {
        entry = await findArtifactEntry(store, flag);
        if (entry.type !== type) {
          throw new Error(`rekon intent prepare --${flagName} must reference a ${type}; got ${entry.type}.`);
        }
      } else {
        const cited = [...(assessmentValue.header?.inputRefs ?? [])]
          .reverse()
          .find((ref) => ref.type === type);
        if (cited) {
          entry = await findArtifactEntry(store, `${type}:${cited.id}`);
        }
      }

      if (!entry) return {};
      const ref: ArtifactRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      return { ref, value: (await store.read(entry)) as T };
    };

    const capabilityMapRef = await resolveRef("capability-map", "CapabilityMap");
    const capabilityContractRef = await resolveRef("capability-contract", "CapabilityContract");
    const stepGraphRef = await resolveRef("step-graph", "StepCapabilityGraph");
    const observationRef = await resolveRef("runtime-observation-report", "RuntimeGraphObservationReport");
    const { ref: handoffCoverageRef, value: handoffCoverageValue } = await resolveRefWithValue<PreparedIntentHandoffCoverageReportLike>("handoff-coverage-report", "HandoffCoverageReport");
    const { ref: driftRef, value: driftValue } = await resolveRefWithValue<PreparedIntentRuntimeDriftReportLike>("runtime-drift-report", "RuntimeGraphDriftReport");
    const { ref: freshnessRef, value: freshnessValue } = await resolveRefWithValue<PreparedIntentPathFreshnessReportLike>("path-freshness-report", "PathFreshnessReport");
    const { ref: proofRef, value: proofValue } = await resolveAssessmentProofWithValue<PreparedIntentVerificationResultLike>("verification-result", "VerificationResult");

    // Optional plan-review gate (slice 131). When an IntentPlanActionabilityReport
    // is supplied, prepare RESPECTS it: a non-actionable report BLOCKS preparation
    // (no PreparedIntentPlan is written) with explicit revision guidance; an
    // actionable report feeds the prepared phases. Absent flag = backward-compatible
    // (existing assessment-only behavior). `--actionability-report` is canonical;
    // `--plan-actionability-report` is an accepted alias.
    const actionabilityFlag = (typeof parsed.flags["actionability-report"] === "string"
      ? parsed.flags["actionability-report"]
      : typeof parsed.flags["plan-actionability-report"] === "string"
        ? parsed.flags["plan-actionability-report"]
        : ""
    ).trim();
    let actionabilityRef: ArtifactRef | undefined;
    let actionabilityValue: PreparedIntentActionabilityReportLike | undefined;
    if (actionabilityFlag.length > 0) {
      const entry = await findArtifactEntry(store, actionabilityFlag);
      if (entry.type !== "IntentPlanActionabilityReport") {
        throw new Error(`rekon intent prepare --actionability-report must reference an IntentPlanActionabilityReport; got ${entry.type}.`);
      }
      actionabilityRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      actionabilityValue = (await store.read(entry)) as PreparedIntentActionabilityReportLike;
    }

    if (actionabilityValue && actionabilityRef && actionabilityValue.status?.value !== "actionable") {
      const reportStatus = typeof actionabilityValue.status?.value === "string" ? actionabilityValue.status.value : "needs-revision";
      const findings = typeof actionabilityValue.summary?.findings === "number" ? actionabilityValue.summary.findings : 0;
      const questions = typeof actionabilityValue.summary?.questions === "number" ? actionabilityValue.summary.questions : 0;
      const revisionPrompt = typeof actionabilityValue.revisionPrompt?.prompt === "string" ? actionabilityValue.revisionPrompt.prompt : "";
      process.exitCode = 1;
      if (json) {
        writeOutput(
          {
            status: "blocked",
            reason: `plan-actionability-${reportStatus}`,
            actionabilityReport: { type: actionabilityRef.type, id: actionabilityRef.id },
            summary: { findings, questions },
            revisionPrompt,
            boundaries: {
              createdPreparedIntentPlan: false,
              createdWorkOrder: false,
              createdVerificationPlan: false,
              createdVerificationRun: false,
              createdVerificationResult: false,
              executedCommands: false,
              wroteSourceFiles: false,
              ranCirce: false,
              implementedIntentGo: false,
            },
          },
          true,
        );
      } else {
        const lines: string[] = [];
        lines.push("Intent prepare blocked by plan actionability", "");
        lines.push(`Report: ${actionabilityRef.type}:${actionabilityRef.id}`);
        lines.push(`Status: ${reportStatus}`);
        lines.push(`Findings: ${findings}`);
        lines.push(`Questions: ${questions}`);
        lines.push("");
        lines.push("Next:");
        lines.push("  Revise the source plan using the report revisionPrompt, then rerun:");
        lines.push("  rekon intent plan review --plan <path>");
        lines.push("  rekon intent prepare --assessment <ref> --actionability-report <report-ref>");
        lines.push("");
        lines.push("No PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, commands, source writes, Circe run, or intent:go were created.");
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    const inputRefs = [
      assessmentRef,
      actionabilityRef,
      capabilityMapRef,
      capabilityContractRef,
      stepGraphRef,
      handoffCoverageRef,
      observationRef,
      driftRef,
      freshnessRef,
      proofRef,
    ].filter((ref): ref is ArtifactRef => !!ref);

    const header: ArtifactHeader = {
      artifactType: "PreparedIntentPlan",
      artifactId: `${PREPARED_INTENT_PLAN_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      supersession: { key: `intent-plan:${assessmentRef.id}` },
      subject: { repoId: root },
      producer: { id: "@rekon/cli.intent-prepare", version: "0.1.0-beta.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.7 },
    };

    // Repository scripts inform safe default verification requirements for an
    // implementation-bearing draft plan (recorded as command strings; never run).
    let availableScripts: string[] | undefined;
    try {
      const pkgRaw = await readFile(resolve(root, "package.json"), "utf8");
      const pkg = JSON.parse(pkgRaw) as { scripts?: Record<string, unknown> };
      availableScripts = pkg.scripts && typeof pkg.scripts === "object" ? Object.keys(pkg.scripts) : [];
    } catch {
      availableScripts = undefined;
    }

    const plan: PreparedIntentPlan = buildPreparedIntentPlan({
      header,
      intentAssessmentReport: assessmentValue,
      intentAssessmentReportRef: assessmentRef,
      capabilityMapRef,
      capabilityContractRef,
      stepCapabilityGraphRef: stepGraphRef,
      handoffCoverageReport: handoffCoverageValue,
      handoffCoverageReportRef: handoffCoverageRef,
      runtimeGraphObservationReportRef: observationRef,
      runtimeGraphDriftReport: driftValue,
      runtimeGraphDriftReportRef: driftRef,
      pathFreshnessReport: freshnessValue,
      pathFreshnessReportRef: freshnessRef,
      verificationResult: proofValue,
      verificationResultRef: proofRef,
      intentPlanActionabilityReport: actionabilityValue,
      intentPlanActionabilityReportRef: actionabilityRef,
      availableScripts,
    });

    const ref = await store.write(plan, { category: "actions" });

    if (json) {
      writeOutput(
        {
          artifact: { type: ref.type, id: ref.id },
          status: { value: plan.status.value, recommendedNextAction: plan.status.recommendedNextAction },
          ...(actionabilityRef ? { actionabilityReport: { type: actionabilityRef.type, id: actionabilityRef.id } } : {}),
          approval: { status: plan.approval.status, reasons: plan.approval.reasons },
          phases: plan.phases.length,
          obligations: plan.obligations.length,
          verificationRequirements: plan.verificationRequirements.length,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Prepared intent plan");
      lines.push("");
      lines.push(`Goal: ${plan.request.goal}`);
      lines.push(`Status: ${plan.status.value}`);
      lines.push(`Approval: ${plan.approval.status}`);
      lines.push(`Approval reasons: ${plan.approval.reasons.join(", ") || "none"}`);
      lines.push(`Recommended next action: ${plan.status.recommendedNextAction}`);
      lines.push(`Phases: ${plan.phases.length}`);
      lines.push(`Obligations: ${plan.obligations.length}`);
      lines.push(`Verification requirements: ${plan.verificationRequirements.length}`);
      if (actionabilityRef) {
        lines.push(`Actionability report: ${actionabilityRef.type}:${actionabilityRef.id} (actionable)`);
      }
      lines.push("");
      lines.push(`Plan: ${ref.type}:${ref.id}`);
      lines.push("No WorkOrder, VerificationPlan, commands, or source writes were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "approve") {
    // `rekon intent approve --prepared-plan <PreparedIntentPlan:id|type:id>
    // [--intent-status <IntentStatusReport:id|type:id>] [--path-freshness <ref>]
    // [--runtime-drift <ref>] --accept <gap> [--accept <gap>...] --reason <text>
    // [--accepted-by <name>] [--root <path>] [--json]` — Intent Operator
    // Approval / Proof Acceptance.
    //
    // Reads a needs-review PreparedIntentPlan, verifies the operator explicitly
    // accepted the plan's known proof gaps, rechecks freshness / runtime drift /
    // status context, and writes exactly ONE new approved PreparedIntentPlan
    // revision. It NEVER mutates the source plan in place. It creates no
    // WorkOrder / VerificationPlan / VerificationRun / VerificationResult,
    // executes no commands, writes no source files, and does not implement
    // intent:go. Approval ENABLES — it does not create — the downstream WorkOrder
    // and VerificationPlan handoffs. See
    // docs/strategy/intent-operator-approval-proof-acceptance-implementation.md.
    const planFlag = typeof parsed.flags["prepared-plan"] === "string" ? parsed.flags["prepared-plan"].trim() : "";
    if (planFlag.length === 0) {
      throw new Error("rekon intent approve requires --prepared-plan <PreparedIntentPlan:id|type:id>.");
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const planEntry = await findArtifactEntry(store, planFlag);
    if (planEntry.type !== "PreparedIntentPlan") {
      throw new Error(`rekon intent approve --prepared-plan must reference a PreparedIntentPlan; got ${planEntry.type}.`);
    }
    const planValue = (await store.read(planEntry)) as IntentApprovalSourcePlanLike;
    const planRef: ArtifactRef = {
      type: planEntry.type,
      id: planEntry.id,
      path: planEntry.path,
      digest: planEntry.digest,
      schemaVersion: planEntry.schemaVersion ?? "0.1.0",
    };

    const resolveRefWithValue = async <T>(flagName: string, type: string): Promise<{ ref?: ArtifactRef; value?: T }> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      let entry: ArtifactIndexEntry | undefined;
      if (flag.length > 0) {
        entry = await findArtifactEntry(store, flag);
        if (entry.type !== type) {
          throw new Error(`rekon intent approve --${flagName} must reference a ${type}; got ${entry.type}.`);
        }
      } else {
        const entries = await store.list(type);
        entry = entries.at(-1);
      }
      if (!entry) return {};
      const ref: ArtifactRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      const value = (await store.read(entry)) as T;
      return { ref, value };
    };

    const { ref: statusRef, value: statusValue } = await resolveRefWithValue<IntentApprovalIntentStatusLike>("intent-status", "IntentStatusReport");
    const { ref: freshnessRef, value: freshnessValue } = await resolveRefWithValue<IntentApprovalPathFreshnessLike>("path-freshness", "PathFreshnessReport");
    const { ref: driftRef, value: driftValue } = await resolveRefWithValue<IntentApprovalRuntimeDriftLike>("runtime-drift", "RuntimeGraphDriftReport");

    const acceptedGaps = parseRepeatableFlag(parsed.flags.accept).map((g) => g.trim()).filter((g) => g.length > 0);
    const reason = typeof parsed.flags.reason === "string" ? parsed.flags.reason : "";
    const acceptedBy = typeof parsed.flags["accepted-by"] === "string" ? parsed.flags["accepted-by"].trim() : undefined;

    const inputRefs = [planRef, statusRef, freshnessRef, driftRef].filter((ref): ref is ArtifactRef => !!ref);

    const header: ArtifactHeader = {
      artifactType: "PreparedIntentPlan",
      artifactId: `${PREPARED_INTENT_PLAN_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      supersession: { key: artifactSupersessionKey(planValue, `intent-plan:${planRef.id}`) },
      subject: { repoId: root },
      producer: { id: "@rekon/cli.intent-approve", version: "0.1.0-beta.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.7 },
    };

    const result = buildApprovedPreparedIntentPlan({
      header,
      preparedIntentPlan: planValue,
      preparedIntentPlanRef: planRef,
      intentStatusReport: statusValue,
      intentStatusReportRef: statusRef,
      pathFreshnessReport: freshnessValue,
      pathFreshnessReportRef: freshnessRef,
      runtimeGraphDriftReport: driftValue,
      runtimeGraphDriftReportRef: driftRef,
      acceptedGaps,
      reason,
      acceptedBy,
      acceptedAt: new Date().toISOString(),
    });

    if (result.status === "blocked") {
      process.exitCode = 1;
      if (json) {
        writeOutput(
          {
            status: "blocked",
            blockers: result.blockers,
            requiredGaps: result.requiredGaps,
            acceptedGaps: result.acceptedGaps,
          },
          true,
        );
      } else {
        const lines: string[] = [];
        lines.push("Intent operator approval", "");
        lines.push("Status: blocked");
        lines.push(`Required accepted gaps: ${result.requiredGaps.join(", ") || "none"}`);
        lines.push(`Accepted gaps: ${result.acceptedGaps.join(", ") || "none"}`);
        lines.push(`Blockers: ${result.blockers.length}`);
        for (const blocker of result.blockers) lines.push(`  - [${blocker.category}] ${blocker.message}`);
        lines.push("");
        lines.push("No approved plan was written. The source PreparedIntentPlan is unchanged.");
        lines.push("No WorkOrder, VerificationPlan, commands, or source writes were created.");
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    const approvedPlan = result.preparedIntentPlan!;
    const ref = await store.write(approvedPlan, { category: "actions" });

    if (json) {
      writeOutput(
        {
          status: "approved",
          artifact: { type: ref.type, id: ref.id },
          source: {
            preparedIntentPlanRef: planRef,
            ...(statusRef ? { intentStatusReportRef: statusRef } : {}),
          },
          approval: { status: approvedPlan.approval.status, reasons: approvedPlan.approval.reasons },
          acceptedRisks: result.acceptedRisks.length,
          acceptedGaps: result.acceptedGaps,
          requiredGaps: result.requiredGaps,
          downstreamHandoff: approvedPlan.approval.proof.downstreamHandoff,
          blockers: [],
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Intent operator approval", "");
      lines.push("Status: approved");
      lines.push(`Approved plan: ${ref.type}:${ref.id}`);
      lines.push(`Source PreparedIntentPlan: ${planRef.type}:${planRef.id} (unchanged)`);
      if (statusRef) lines.push(`IntentStatusReport: ${statusRef.type}:${statusRef.id}`);
      lines.push(`Approval reasons: ${approvedPlan.approval.reasons.join(", ") || "none"}`);
      lines.push(`Accepted gaps: ${result.acceptedGaps.join(", ") || "none"}`);
      lines.push(`Accepted risks recorded: ${result.acceptedRisks.length}`);
      lines.push(
        `Downstream handoff: workOrderAllowed=${approvedPlan.approval.proof.downstreamHandoff.workOrderAllowed} verificationPlanAllowed=${approvedPlan.approval.proof.downstreamHandoff.verificationPlanAllowed} sourceWriteAllowed=${approvedPlan.approval.proof.downstreamHandoff.sourceWriteAllowed}`,
      );
      lines.push("");
      lines.push("A new approved PreparedIntentPlan revision was written; the source draft is unchanged.");
      lines.push("No WorkOrder, VerificationPlan, VerificationRun, VerificationResult, commands, or source writes were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "status" && positional === "transition") {
    // `rekon intent status transition --prepared-plan <PreparedIntentPlan:id|type:id>
    // --previous-status <IntentStatusReport:id|type:id> [--path-freshness <ref>]
    // [--runtime-drift <ref>] --to work-ready --reason <text> [--root <path>]
    // [--json]` — Intent Status Work-Ready Transition.
    //
    // Reads an approved PreparedIntentPlan plus the previous IntentStatusReport,
    // rechecks freshness / runtime drift / status context, and writes exactly ONE
    // new work-ready IntentStatusReport revision. The transition is explicit —
    // approval does NOT automatically make status work-ready. The previous status
    // report is never mutated; the approved plan is never mutated. It creates no
    // WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes
    // no commands, writes no source files, and runs no Circe; intent:go remains
    // deferred. The work-ready revision ENABLES (does not create) the WorkOrder /
    // VerificationPlan handoffs. See
    // docs/strategy/intent-status-work-ready-transition-implementation.md.
    const toFlag = typeof parsed.flags.to === "string" ? parsed.flags.to.trim() : "";
    if (toFlag !== "work-ready") {
      throw new Error("rekon intent status transition requires --to work-ready (the only supported target in v1).");
    }
    const planFlag = typeof parsed.flags["prepared-plan"] === "string" ? parsed.flags["prepared-plan"].trim() : "";
    if (planFlag.length === 0) {
      throw new Error("rekon intent status transition requires --prepared-plan <PreparedIntentPlan:id|type:id>.");
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const planEntry = await findArtifactEntry(store, planFlag);
    if (planEntry.type !== "PreparedIntentPlan") {
      throw new Error(`rekon intent status transition --prepared-plan must reference a PreparedIntentPlan; got ${planEntry.type}.`);
    }
    const planValue = (await store.read(planEntry)) as IntentStatusTransitionPreparedPlanLike;
    const planRef: ArtifactRef = {
      type: planEntry.type,
      id: planEntry.id,
      path: planEntry.path,
      digest: planEntry.digest,
      schemaVersion: planEntry.schemaVersion ?? "0.1.0",
    };

    // Optional, ref-only (no latest fallback): an omitted previous status must
    // block the transition rather than silently picking the latest report.
    const resolveRefOnly = async <T>(flagName: string, type: string): Promise<{ ref?: ArtifactRef; value?: T }> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      if (flag.length === 0) return {};
      const entry = await findArtifactEntry(store, flag);
      if (entry.type !== type) {
        throw new Error(`rekon intent status transition --${flagName} must reference a ${type}; got ${entry.type}.`);
      }
      const ref: ArtifactRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      const value = (await store.read(entry)) as T;
      return { ref, value };
    };

    const { ref: previousStatusRef, value: previousStatusValue } = await resolveRefOnly<IntentStatusTransitionPreviousStatusLike>("previous-status", "IntentStatusReport");
    const { ref: freshnessRef, value: freshnessValue } = await resolveRefOnly<IntentStatusTransitionFreshnessLike>("path-freshness", "PathFreshnessReport");
    const { ref: driftRef, value: driftValue } = await resolveRefOnly<IntentStatusTransitionRuntimeDriftLike>("runtime-drift", "RuntimeGraphDriftReport");

    const reason = typeof parsed.flags.reason === "string" ? parsed.flags.reason : "";

    const inputRefs = [planRef, previousStatusRef, freshnessRef, driftRef].filter((ref): ref is ArtifactRef => !!ref);

    const header: ArtifactHeader = {
      artifactType: "IntentStatusReport",
      artifactId: `${INTENT_STATUS_REPORT_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      supersession: { key: `intent-status:${artifactSupersessionKey(planValue, planRef.id)}` },
      subject: { repoId: root },
      producer: { id: "@rekon/cli.intent-status-transition", version: "0.1.0-beta.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.7 },
    };

    const result = buildWorkReadyIntentStatusReport({
      header,
      approvedPreparedIntentPlan: planValue,
      approvedPreparedIntentPlanRef: planRef,
      previousIntentStatusReport: previousStatusValue,
      previousIntentStatusReportRef: previousStatusRef,
      pathFreshnessReport: freshnessValue,
      pathFreshnessReportRef: freshnessRef,
      runtimeGraphDriftReport: driftValue,
      runtimeGraphDriftReportRef: driftRef,
      reason,
    });

    if (result.status === "blocked") {
      process.exitCode = 1;
      if (json) {
        writeOutput({ status: "blocked", blockers: result.blockers }, true);
      } else {
        const lines: string[] = [];
        lines.push("Intent status transition", "");
        lines.push("Status: blocked");
        lines.push(`Blockers: ${result.blockers.length}`);
        for (const blocker of result.blockers) lines.push(`  - [${blocker.category}] ${blocker.message}`);
        lines.push("");
        lines.push("No IntentStatusReport was written. The previous status report is unchanged.");
        lines.push("No WorkOrder, VerificationPlan, VerificationRun, VerificationResult, commands, source writes, or Circe run were created.");
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    const report = result.intentStatusReport;
    const ref = await store.write(report, { category: "actions" });

    if (json) {
      writeOutput(
        {
          status: "work-ready",
          artifact: { type: ref.type, id: ref.id },
          source: {
            approvedPreparedIntentPlanRef: planRef,
            ...(previousStatusRef ? { previousIntentStatusReportRef: previousStatusRef } : {}),
          },
          recommendedNextAction: report.status.recommendedNextAction,
          boundaries: {
            createdWorkOrder: false,
            createdVerificationPlan: false,
            createdVerificationRun: false,
            createdVerificationResult: false,
            executedCommands: false,
            wroteSourceFiles: false,
            ranCirce: false,
            implementedIntentGo: false,
          },
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Intent status transition", "");
      lines.push("Status: work-ready");
      lines.push(`IntentStatusReport: ${ref.type}:${ref.id}`);
      lines.push(`Approved plan: ${planRef.type}:${planRef.id}`);
      if (previousStatusRef) lines.push(`Previous status: ${previousStatusRef.type}:${previousStatusRef.id} (unchanged)`);
      lines.push(`Recommended next action: ${report.status.recommendedNextAction}`);
      lines.push("");
      lines.push("No WorkOrder, VerificationPlan, VerificationRun, VerificationResult, commands, source writes, Circe run, or intent:go were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "status") {
    // `rekon intent status [--root <path>] [--json]` plus optional pinned refs
    // (`--assessment`, `--prepared-plan`, `--work-order`, `--verification-plan`,
    // `--verification-run`, `--verification-result`, `--path-freshness`,
    // `--runtime-drift`, `--handoff-coverage`) — IntentStatusReport v1.
    //
    // A read-only rollup status report over the intent spine. It reports
    // PreparedIntentPlan approval state but does NOT approve plans, creates no
    // WorkOrder / VerificationPlan / VerificationRun / VerificationResult,
    // executes no commands, and writes no source. VerificationResult is an input
    // to status, not the status artifact itself; intent:go remains deferred.
    // See docs/artifacts/intent-status-report.md.
    const store = createLocalArtifactStore(root);
    await store.init();
    const flag = (name: string): string | undefined => {
      const value = parsed.flags[name];
      return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
    };
    const lineage = await resolveIntentStatusLineage({
      store,
      requested: {
        assessment: flag("assessment"),
        preparedPlan: flag("prepared-plan"),
        workOrder: flag("work-order"),
        verificationPlan: flag("verification-plan"),
        verificationRun: flag("verification-run"),
        verificationResult: flag("verification-result"),
        pathFreshness: flag("path-freshness"),
        runtimeDrift: flag("runtime-drift"),
        handoffCoverage: flag("handoff-coverage"),
      },
    });

    const assessmentRef = lineage.assessment?.ref;
    const assessmentValue = lineage.assessment?.value as IntentStatusAssessmentLike | undefined;
    const preparedRef = lineage.preparedPlan?.ref;
    const preparedValue = lineage.preparedPlan?.value as IntentStatusPreparedPlanLike | undefined;
    const intentStatusRef = lineage.intentStatus?.ref;
    const workOrderRef = lineage.workOrder?.ref;
    const workOrderValue = lineage.workOrder?.value as IntentStatusWorkOrderLike | undefined;
    const planRef = lineage.verificationPlan?.ref;
    const runRef = lineage.verificationRun?.ref;
    const runValue = lineage.verificationRun?.value as IntentStatusVerificationRunLike | undefined;
    const resultRef = lineage.verificationResult?.ref;
    const resultValue = lineage.verificationResult?.value as IntentStatusVerificationResultLike | undefined;
    const freshnessRef = lineage.pathFreshness?.ref;
    const freshnessValue = lineage.pathFreshness?.value as IntentStatusPathFreshnessLike | undefined;
    const driftRef = lineage.runtimeDrift?.ref;
    const driftValue = lineage.runtimeDrift?.value as IntentStatusRuntimeDriftLike | undefined;
    const coverageRef = lineage.handoffCoverage?.ref;
    const coverageValue = lineage.handoffCoverage?.value as IntentStatusHandoffCoverageLike | undefined;

    const inputRefs = [
      assessmentRef,
      preparedRef,
      intentStatusRef,
      workOrderRef,
      planRef,
      runRef,
      resultRef,
      freshnessRef,
      driftRef,
      coverageRef,
    ].filter((ref): ref is ArtifactRef => !!ref);

    const header: ArtifactHeader = {
      artifactType: "IntentStatusReport",
      artifactId: `${INTENT_STATUS_REPORT_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      supersession: {
        key: `intent-status:${artifactSupersessionKey(preparedValue, preparedRef?.id ?? assessmentRef?.id ?? "unbound")}`,
      },
      subject: { repoId: root },
      producer: { id: "@rekon/cli.intent-status", version: "0.1.0-beta.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.7 },
    };

    const report = buildIntentStatusReport({
      header,
      intentAssessmentReport: assessmentValue,
      intentAssessmentReportRef: assessmentRef,
      preparedIntentPlan: preparedValue,
      preparedIntentPlanRef: preparedRef,
      workOrder: workOrderValue,
      workOrderRef,
      verificationPlanRef: planRef,
      verificationRun: runValue,
      verificationRunRef: runRef,
      verificationResult: resultValue,
      verificationResultRef: resultRef,
      pathFreshnessReport: freshnessValue,
      pathFreshnessReportRef: freshnessRef,
      runtimeGraphDriftReport: driftValue,
      runtimeGraphDriftReportRef: driftRef,
      handoffCoverageReport: coverageValue,
      handoffCoverageReportRef: coverageRef,
    });

    const ref = await store.write(report, { category: "actions" });

    if (json) {
      writeOutput(
        {
          artifact: { type: ref.type, id: ref.id },
          status: { value: report.status.value, recommendedNextAction: report.status.recommendedNextAction },
          proof: report.proof,
          blockers: report.blockers.length,
          warnings: report.warnings.length,
          staleInputs: report.staleInputs.length,
          missingInputs: report.missingInputs.length,
          lineage: lineage.provenance,
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Intent status");
      lines.push("");
      lines.push(`Status: ${report.status.value}`);
      lines.push(`Recommended next action: ${report.status.recommendedNextAction}`);
      lines.push(`Assessment: ${report.proof.assessment?.present ? report.proof.assessment.readiness ?? "present" : "absent"}`);
      lines.push(`Prepared plan: ${report.proof.preparation?.present ? `${report.proof.preparation.status ?? "present"} / ${report.proof.preparation.approvalStatus ?? "unknown"}` : "absent"}`);
      lines.push(`WorkOrder: ${report.proof.work?.present ? "present" : "absent"}`);
      lines.push(`Verification: ${report.proof.verification ? `plan=${report.proof.verification.planPresent} run=${report.proof.verification.runPresent} result=${report.proof.verification.resultStatus ?? (report.proof.verification.resultPresent ? "present" : "absent")}` : "absent"}`);
      lines.push(`Freshness: ${report.proof.freshness?.present ? (report.proof.freshness.stale ? "stale" : "fresh") : "absent"}`);
      lines.push(`Runtime drift: ${report.proof.runtimeDrift?.present ? `${report.proof.runtimeDrift.highSeverityOpen} high severity open` : "absent"}`);
      lines.push(`Blockers: ${report.blockers.length} | Warnings: ${report.warnings.length} | Stale: ${report.staleInputs.length} | Missing: ${report.missingInputs.length}`);
      lines.push("");
      lines.push(`Report: ${ref.type}:${ref.id}`);
      lines.push("No WorkOrder, VerificationPlan, commands, or source writes were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "work-order" && positional === "generate") {
    // `rekon intent work-order generate --prepared-plan <ref> [--intent-status
    // <ref>] [--path-freshness <ref>] [--runtime-drift <ref>] [--root <path>]
    // [--json]` — Intent WorkOrder handoff.
    //
    // Reads a proof-approved PreparedIntentPlan (plus IntentStatusReport, and the
    // optional freshness/drift artifacts for the handoff-time recheck), verifies
    // the WorkOrder generation gate, and either reports blockers (non-zero exit,
    // no WorkOrder written) or writes exactly one WorkOrder. It creates no
    // VerificationPlan, executes no commands, and writes no source files; intent:go
    // remains deferred. See docs/concepts/intent-work-order-handoff.md.
    const planFlag = typeof parsed.flags["prepared-plan"] === "string" ? parsed.flags["prepared-plan"].trim() : "";
    if (planFlag.length === 0) {
      throw new Error("rekon intent work-order generate requires --prepared-plan <PreparedIntentPlan:id|type:id>.");
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const planEntry = await findArtifactEntry(store, planFlag);
    if (planEntry.type !== "PreparedIntentPlan") {
      throw new Error(`rekon intent work-order generate --prepared-plan must reference a PreparedIntentPlan; got ${planEntry.type}.`);
    }
    const planValue = (await store.read(planEntry)) as IntentWorkOrderPreparedPlanLike;
    const planRef: ArtifactRef = {
      type: planEntry.type,
      id: planEntry.id,
      path: planEntry.path,
      digest: planEntry.digest,
      schemaVersion: planEntry.schemaVersion ?? "0.1.0",
    };

    const resolveRefWithValue = async <T>(flagName: string, type: string): Promise<{ ref?: ArtifactRef; value?: T }> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      let entry: ArtifactIndexEntry | undefined;
      if (flag.length > 0) {
        entry = await findArtifactEntry(store, flag);
        if (entry.type !== type) {
          throw new Error(`rekon intent work-order generate --${flagName} must reference a ${type}; got ${entry.type}.`);
        }
      } else {
        const entries = await store.list(type);
        entry = entries.at(-1);
      }
      if (!entry) return {};
      const ref: ArtifactRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      const value = (await store.read(entry)) as T;
      return { ref, value };
    };

    const { ref: statusRef, value: statusValue } = await resolveRefWithValue<IntentWorkOrderStatusReportLike>("intent-status", "IntentStatusReport");
    const { ref: freshnessRef, value: freshnessValue } = await resolveRefWithValue<IntentWorkOrderPathFreshnessLike>("path-freshness", "PathFreshnessReport");
    const { ref: driftRef, value: driftValue } = await resolveRefWithValue<IntentWorkOrderRuntimeDriftLike>("runtime-drift", "RuntimeGraphDriftReport");
    const taskPactPaths = [...new Set([
      ...(planValue.request?.scope?.paths ?? []),
      ...(planValue.phases ?? []).flatMap((phase) => phase.paths ?? []),
    ].filter(Boolean))];
    const taskPactSelection = await buildCurrentTaskPact(store, {
      repoId: root,
      taskText: planValue.request?.goal ?? "Implement prepared intent",
      paths: taskPactPaths,
      write: true,
    });

    const inputRefs = [planRef, statusRef, freshnessRef, driftRef, taskPactSelection.ref]
      .filter((ref): ref is ArtifactRef => !!ref);

    const header: ArtifactHeader = {
      artifactType: "WorkOrder",
      artifactId: `${INTENT_WORK_ORDER_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      supersession: { key: `intent-work-order:${artifactSupersessionKey(planValue, planRef.id)}` },
      subject: { repoId: root },
      producer: { id: "@rekon/cli.intent-work-order-generate", version: "0.1.0-beta.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.7 },
    };

    const result = buildIntentWorkOrderHandoff({
      header,
      preparedIntentPlan: planValue,
      preparedIntentPlanRef: planRef,
      intentStatusReport: statusValue,
      intentStatusReportRef: statusRef,
      pathFreshnessReport: freshnessValue,
      pathFreshnessReportRef: freshnessRef,
      runtimeGraphDriftReport: driftValue,
      runtimeGraphDriftReportRef: driftRef,
      taskPact: taskPactSelection.pact,
      taskPactRef: taskPactSelection.ref,
    });

    if (result.status === "blocked") {
      process.exitCode = 1;
      if (json) {
        writeOutput({ status: "blocked", blockers: result.blockers }, true);
      } else {
        const lines: string[] = [];
        lines.push("Intent WorkOrder handoff", "");
        lines.push("Status: blocked");
        lines.push(`Blockers: ${result.blockers.length}`);
        for (const blocker of result.blockers) lines.push(`  - [${blocker.category}] ${blocker.message}`);
        lines.push("");
        lines.push("No WorkOrder, VerificationPlan, commands, or source writes were created.");
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    const ref = await store.write(result.workOrder, { category: "actions" });
    const handoff = result.workOrder.intentHandoff;

    if (json) {
      writeOutput(
        {
          status: "generated",
          artifact: { type: ref.type, id: ref.id },
          source: {
            preparedIntentPlanRef: planRef,
            ...(statusRef ? { intentStatusReportRef: statusRef } : {}),
            ...(taskPactSelection.ref ? { taskPactRef: taskPactSelection.ref } : {}),
          },
          phases: handoff.phaseIds.length,
          obligations: handoff.obligationIds.length,
          verificationGuidanceItems: handoff.verificationRequirementIds.length,
          impactObligations: handoff.impactObligationIds.length,
          blockers: [],
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Intent WorkOrder handoff", "");
      lines.push("Status: generated");
      lines.push(`WorkOrder: ${ref.type}:${ref.id}`);
      lines.push(`Source PreparedIntentPlan: ${planRef.type}:${planRef.id}`);
      if (statusRef) lines.push(`IntentStatusReport: ${statusRef.type}:${statusRef.id}`);
      lines.push(`Phases: ${handoff.phaseIds.length}`);
      lines.push(`Obligations: ${handoff.obligationIds.length}`);
      lines.push(`Verification guidance items: ${handoff.verificationRequirementIds.length}`);
      lines.push("");
      lines.push("No VerificationPlan, commands, or source writes were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "verification-plan" && positional === "generate") {
    // `rekon intent verification-plan generate --prepared-plan <ref>
    // [--intent-status <ref>] [--work-order <ref>] [--path-freshness <ref>]
    // [--runtime-drift <ref>] [--root <path>] [--json]` — Intent VerificationPlan
    // handoff.
    //
    // Reads a proof-approved PreparedIntentPlan (plus IntentStatusReport, an
    // optional WorkOrder, and the optional freshness/drift artifacts for the
    // handoff-time recheck), verifies the proof-planning gate, classifies each
    // verification requirement command for safety, and either reports blockers
    // (non-zero exit, no VerificationPlan) or writes exactly one VerificationPlan.
    // It creates no WorkOrder, no VerificationRun, and no VerificationResult,
    // executes no commands, and writes no source files; intent:go remains
    // deferred. See docs/concepts/intent-verification-plan-handoff.md.
    const planFlag = typeof parsed.flags["prepared-plan"] === "string" ? parsed.flags["prepared-plan"].trim() : "";
    if (planFlag.length === 0) {
      throw new Error("rekon intent verification-plan generate requires --prepared-plan <PreparedIntentPlan:id|type:id>.");
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const planEntry = await findArtifactEntry(store, planFlag);
    if (planEntry.type !== "PreparedIntentPlan") {
      throw new Error(`rekon intent verification-plan generate --prepared-plan must reference a PreparedIntentPlan; got ${planEntry.type}.`);
    }
    const planValue = (await store.read(planEntry)) as IntentVerificationPlanPreparedPlanLike;
    const planRef: ArtifactRef = {
      type: planEntry.type,
      id: planEntry.id,
      path: planEntry.path,
      digest: planEntry.digest,
      schemaVersion: planEntry.schemaVersion ?? "0.1.0",
    };

    const resolveRefWithValue = async <T>(flagName: string, type: string): Promise<{ ref?: ArtifactRef; value?: T }> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      let entry: ArtifactIndexEntry | undefined;
      if (flag.length > 0) {
        entry = await findArtifactEntry(store, flag);
        if (entry.type !== type) {
          throw new Error(`rekon intent verification-plan generate --${flagName} must reference a ${type}; got ${entry.type}.`);
        }
      } else {
        const entries = await store.list(type);
        entry = entries.at(-1);
      }
      if (!entry) return {};
      const ref: ArtifactRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      const value = (await store.read(entry)) as T;
      return { ref, value };
    };

    const { ref: statusRef, value: statusValue } = await resolveRefWithValue<IntentVerificationPlanStatusReportLike>("intent-status", "IntentStatusReport");
    const { ref: workOrderRef, value: workOrderValue } = await resolveRefWithValue<IntentVerificationPlanWorkOrderLike>("work-order", "WorkOrder");
    const { ref: freshnessRef, value: freshnessValue } = await resolveRefWithValue<IntentVerificationPlanPathFreshnessLike>("path-freshness", "PathFreshnessReport");
    const { ref: driftRef, value: driftValue } = await resolveRefWithValue<IntentVerificationPlanRuntimeDriftLike>("runtime-drift", "RuntimeGraphDriftReport");

    const inputRefs = [planRef, statusRef, workOrderRef, freshnessRef, driftRef].filter((ref): ref is ArtifactRef => !!ref);

    const header: ArtifactHeader = {
      artifactType: "VerificationPlan",
      artifactId: `${INTENT_VERIFICATION_PLAN_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      supersession: { key: `intent-verification-plan:${artifactSupersessionKey(planValue, planRef.id)}` },
      subject: { repoId: root },
      producer: { id: "@rekon/cli.intent-verification-plan-generate", version: "0.1.0-beta.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 0.7 },
    };

    const result = buildIntentVerificationPlanHandoff({
      header,
      preparedIntentPlan: planValue,
      preparedIntentPlanRef: planRef,
      intentStatusReport: statusValue,
      intentStatusReportRef: statusRef,
      workOrder: workOrderValue,
      workOrderRef,
      pathFreshnessReport: freshnessValue,
      pathFreshnessReportRef: freshnessRef,
      runtimeGraphDriftReport: driftValue,
      runtimeGraphDriftReportRef: driftRef,
    });

    if (result.status === "blocked") {
      process.exitCode = 1;
      if (json) {
        writeOutput({ status: "blocked", blockers: result.blockers }, true);
      } else {
        const lines: string[] = [];
        lines.push("Intent VerificationPlan handoff", "");
        lines.push("Status: blocked");
        lines.push(`Blockers: ${result.blockers.length}`);
        for (const blocker of result.blockers) lines.push(`  - [${blocker.category}] ${blocker.message}`);
        lines.push("");
        lines.push("No VerificationPlan, WorkOrder, VerificationRun, VerificationResult, commands, or source writes were created.");
        writeOutput(lines.join("\n"), false);
      }
      return;
    }

    const ref = await store.write(result.verificationPlan, { category: "actions" });
    const handoff = result.verificationPlan.intentHandoff;

    if (json) {
      writeOutput(
        {
          status: "generated",
          artifact: { type: ref.type, id: ref.id },
          source: {
            preparedIntentPlanRef: planRef,
            ...(statusRef ? { intentStatusReportRef: statusRef } : {}),
            ...(workOrderRef ? { workOrderRef } : {}),
          },
          commands: result.verificationPlan.commands.length,
          successCriteria: result.verificationPlan.successCriteria.length,
          blockers: [],
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Intent VerificationPlan handoff", "");
      lines.push("Status: generated");
      lines.push(`VerificationPlan: ${ref.type}:${ref.id}`);
      lines.push(`Source PreparedIntentPlan: ${planRef.type}:${planRef.id}`);
      if (statusRef) lines.push(`IntentStatusReport: ${statusRef.type}:${statusRef.id}`);
      lines.push(`WorkOrder: ${workOrderRef ? `${workOrderRef.type}:${workOrderRef.id}` : "absent"}`);
      lines.push(`Commands: ${result.verificationPlan.commands.length}`);
      lines.push(`Success criteria: ${result.verificationPlan.successCriteria.length}`);
      lines.push(`Requirement mappings: ${handoff.requirementMappings.length}`);
      lines.push("");
      lines.push("No WorkOrder, VerificationRun, VerificationResult, commands, or source writes were created.");
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "intent" && subcommand === "bundle" && positional === "write") {
    // `rekon intent bundle write [--intent-id <id>] [--assessment <ref>]
    // [--prepared-plan <ref>] [--intent-status <ref>] [--work-order <ref>]
    // [--verification-plan <ref>] [--path-freshness <ref>] [--runtime-drift <ref>]
    // [--root <path>] [--json]` — Intent plan bundle.
    //
    // Reads the latest-or-pinned canonical intent artifacts and projects them
    // into a regenerable human + LLM-agent handoff bundle under
    // `.rekon/intent/plans/<intent-id>/`. The bundle is a projection; canonical
    // truth remains `.rekon/artifacts/`. This command executes no commands, writes
    // no source files outside the bundle directory, creates no canonical
    // artifacts, and does not implement intent:go. See
    // docs/concepts/intent-plan-bundle.md.
    const store = createLocalArtifactStore(root);
    await store.init();
    const targetFlag = typeof parsed.flags.target === "string" ? parsed.flags.target.trim() : "";
    if (targetFlag.length > 0 && targetFlag !== "generic" && targetFlag !== "circe") {
      throw new Error("rekon intent bundle write --target must be generic or circe.");
    }
    const bundleTarget: "generic" | "circe" = targetFlag === "generic" ? "generic" : "circe";

    const resolveSource = async (
      flagName: string,
      type: string,
    ): Promise<{ ref?: ArtifactRef; value?: unknown; digest?: string }> => {
      const flag = typeof parsed.flags[flagName] === "string" ? parsed.flags[flagName].trim() : "";
      let entry: ArtifactIndexEntry | undefined;
      if (flag.length > 0) {
        entry = await findArtifactEntry(store, flag);
        if (entry.type !== type) {
          throw new Error(`rekon intent bundle write --${flagName} must reference a ${type}; got ${entry.type}.`);
        }
      } else {
        entry = (await store.list(type)).at(-1);
      }
      if (!entry) return {};
      const ref: ArtifactRef = {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion ?? "0.1.0",
      };
      const value = await store.read(entry);
      return { ref, value, digest: typeof entry.digest === "string" ? entry.digest : undefined };
    };

    const assessment = await resolveSource("assessment", "IntentAssessmentReport");
    const plan = await resolveSource("prepared-plan", "PreparedIntentPlan");
    const status = await resolveSource("intent-status", "IntentStatusReport");
    const workOrder = await resolveSource("work-order", "WorkOrder");
    const verificationPlan = await resolveSource("verification-plan", "VerificationPlan");
    const freshness = await resolveSource("path-freshness", "PathFreshnessReport");
    const drift = await resolveSource("runtime-drift", "RuntimeGraphDriftReport");

    const source: IntentPlanBundleSource = {
      intentAssessmentReport: assessment.value,
      intentAssessmentReportRef: assessment.ref,
      preparedIntentPlan: plan.value,
      preparedIntentPlanRef: plan.ref,
      intentStatusReport: status.value,
      intentStatusReportRef: status.ref,
      workOrder: workOrder.value,
      workOrderRef: workOrder.ref,
      verificationPlan: verificationPlan.value,
      verificationPlanRef: verificationPlan.ref,
      pathFreshnessReport: freshness.value,
      pathFreshnessReportRef: freshness.ref,
      runtimeGraphDriftReport: drift.value,
      runtimeGraphDriftReportRef: drift.ref,
    };

    const sourceDigests: Record<string, string> = {};
    if (assessment.digest) sourceDigests.intentAssessmentReport = assessment.digest;
    if (plan.digest) sourceDigests.preparedIntentPlan = plan.digest;
    if (status.digest) sourceDigests.intentStatusReport = status.digest;
    if (workOrder.digest) sourceDigests.workOrder = workOrder.digest;
    if (verificationPlan.digest) sourceDigests.verificationPlan = verificationPlan.digest;
    if (freshness.digest) sourceDigests.pathFreshnessReport = freshness.digest;
    if (drift.digest) sourceDigests.runtimeGraphDriftReport = drift.digest;

    // Optional TaskContextReport bundle context (TaskContextReport Bundle Context
    // Implementation, slice 183). The bundle MAY carry TaskContextReport refs as
    // OPTIONAL context for agents/operators — never proof, never required. Sources:
    // (1) explicit, repeatable `--task-context-ref` (a missing or wrong-type ref
    // fails cleanly); (2) bounded lineage discovery from the prepared-plan /
    // assessment `header.inputRefs` (a ref that no longer resolves is skipped).
    // Empty task context leaves the bundle byte-identical and never alters
    // WorkOrder / VerificationPlan / phase gates, proof status, or Circe.
    const taskContextEntries: Array<{ ref: ArtifactRef; report: unknown }> = [];
    const seenTaskContextIds = new Set<string>();
    const toTaskContextRef = (entry: ArtifactIndexEntry): ArtifactRef => ({
      type: entry.type,
      id: entry.id,
      path: entry.path,
      digest: entry.digest,
      schemaVersion: entry.schemaVersion ?? "0.1.0",
    });
    const explicitTaskContextRefs = parseRepeatableFlag(parsed.flags["task-context-ref"])
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    for (const flag of explicitTaskContextRefs) {
      const entry = await findArtifactEntry(store, flag);
      if (entry.type !== "TaskContextReport") {
        throw new Error(
          `rekon intent bundle write --task-context-ref must reference a TaskContextReport; got ${entry.type}.`,
        );
      }
      if (seenTaskContextIds.has(entry.id)) continue;
      seenTaskContextIds.add(entry.id);
      taskContextEntries.push({ ref: toTaskContextRef(entry), report: await store.read(entry) });
    }
    // Bounded lineage discovery: TaskContextReport refs already recorded in the
    // prepared-plan / assessment `header.inputRefs`. Reads only those two arrays;
    // a ref that no longer resolves in the store is silently skipped.
    const asRec = (value: unknown): Record<string, unknown> =>
      value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const lineageTaskContextIds = (value: unknown): string[] => {
      const header = asRec(asRec(value).header);
      const refs = Array.isArray(header.inputRefs) ? (header.inputRefs as unknown[]) : [];
      const ids: string[] = [];
      for (const ref of refs) {
        const r = asRec(ref);
        if (r.type === "TaskContextReport" && typeof r.id === "string" && r.id.length > 0) ids.push(r.id);
      }
      return ids;
    };
    const lineageIds = [...lineageTaskContextIds(plan.value), ...lineageTaskContextIds(assessment.value)];
    if (lineageIds.some((id) => !seenTaskContextIds.has(id))) {
      const tcrEntries = await store.list("TaskContextReport");
      for (const id of lineageIds) {
        if (seenTaskContextIds.has(id)) continue;
        const entry = tcrEntries.find((e) => e.id === id);
        if (!entry) continue;
        seenTaskContextIds.add(id);
        taskContextEntries.push({ ref: toTaskContextRef(entry), report: await store.read(entry) });
      }
    }

    const intentIdFlag = typeof parsed.flags["intent-id"] === "string" ? parsed.flags["intent-id"].trim() : "";
    const result = buildIntentPlanBundle({
      ...(intentIdFlag.length > 0 ? { intentId: intentIdFlag } : {}),
      generatedAt: new Date().toISOString(),
      target: bundleTarget,
      source,
      sourceDigests,
      // Circe handoff projection: record the repo root operators pass to
      // `circe rekon-handoff validate --repo <repoRoot>`, and Rekon's producer
      // version. Rekon emits the projection; it never runs Circe.
      repoRoot: root,
      producerVersion: "0.1.0-beta.0",
      ...(taskContextEntries.length > 0 ? { taskContextReports: taskContextEntries } : {}),
    });

    // Write files only under <root>/.rekon/intent/plans/, with path-traversal
    // safety on both the intent id and every emitted file path.
    const bundleBase = resolve(root, ".rekon", "intent", "plans");
    const bundleDir = resolve(bundleBase, result.intentId);
    const relToBase = relative(bundleBase, bundleDir);
    if (relToBase.length === 0 || relToBase.startsWith("..") || isAbsolute(relToBase)) {
      throw new Error(`rekon intent bundle write: unsafe intent id resolves outside the bundle directory: ${result.intentId}`);
    }
    for (const file of result.files) {
      if (!isSafeBundleRelativePath(file.path)) {
        throw new Error(`rekon intent bundle write: unsafe bundle file path: ${file.path}`);
      }
      const absolute = resolve(bundleDir, file.path);
      const relToDir = relative(bundleDir, absolute);
      if (relToDir.startsWith("..") || isAbsolute(relToDir)) {
        throw new Error(`rekon intent bundle write: unsafe bundle file path: ${file.path}`);
      }
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, file.content, "utf8");
    }

    const staleness = (result.manifest.staleness ?? {}) as { state?: string };
    const stalenessState = typeof staleness.state === "string" ? staleness.state : "fresh";
    const bundlePath = `.rekon/intent/plans/${result.intentId}/`;
    const circeManifestValue = result.manifest.circe;
    const hasCirceProjection = bundleTarget === "circe"
      && circeManifestValue !== null
      && typeof circeManifestValue === "object";
    const circeManifest = (hasCirceProjection ? circeManifestValue : {}) as {
      handoff?: string;
      phasePlan?: string;
      rekonProof?: string;
      workOrdersDir?: string;
      verificationPlansDir?: string;
      actorContracts?: {
        implementer?: string;
        reviewer?: string;
        plannerVerifier?: string;
        implementationHandoffSchema?: string;
        reviewVerdictSchema?: string;
        plannerDecisionSchema?: string;
      };
      workOrders?: number;
      verificationPlans?: number;
      phaseVerification?: { executable?: number; manualReview?: number; finalVerification?: number; needsReview?: number };
      warnings?: number;
    };
    const circeHandoffPath = hasCirceProjection ? circeManifest.handoff ?? "circe/handoff.json" : null;
    const circePhasePlanPath = hasCirceProjection ? circeManifest.phasePlan ?? "circe/phase-plan.json" : null;
    const circeRekonProofPath = hasCirceProjection ? circeManifest.rekonProof ?? "circe/rekon-proof.json" : null;
    const circeHandoff = circeHandoffPath ? parseBundleJsonFile(result.files, circeHandoffPath) : null;
    const circePhasePlan = circePhasePlanPath ? parseBundleJsonFile(result.files, circePhasePlanPath) : null;
    const circeWarnings = asStringArray((circeHandoff as { warnings?: unknown } | null)?.warnings);
    const phaseCount = Array.isArray((circePhasePlan as { phases?: unknown } | null)?.phases)
      ? ((circePhasePlan as { phases: unknown[] }).phases.length)
      : 0;
    const phaseVerification = {
      executable: circeManifest.phaseVerification?.executable ?? 0,
      finalVerification: circeManifest.phaseVerification?.finalVerification ?? 0,
      manualReview: circeManifest.phaseVerification?.manualReview ?? 0,
      needsReview: circeManifest.phaseVerification?.needsReview ?? 0,
    };

    // Optional TaskContextReport bundle context (slice 183), reported from the
    // manifest the bundle actually wrote. `included: false` when no context was
    // attached; never proof.
    const manifestContext = (result.manifest.context ?? {}) as {
      taskContextReports?: Array<{ ref?: { type?: string; id?: string } }>;
    };
    const includedTaskContext = Array.isArray(manifestContext.taskContextReports)
      ? manifestContext.taskContextReports
      : [];
    const taskContextOut =
      includedTaskContext.length > 0
        ? {
            included: true as const,
            count: includedTaskContext.length,
            refs: includedTaskContext.map((c) => `${c.ref?.type ?? "TaskContextReport"}:${c.ref?.id ?? ""}`),
            sidecars: [
              "context/task-context.md",
              "context/task-context.agent.json",
              "context/task-context.refs.json",
            ],
            proof: false as const,
          }
        : { included: false as const };

    if (json) {
      writeOutput(
        {
          ok: true,
          target: bundleTarget,
          intentId: result.intentId,
          bundlePath: bundlePath.replace(/\/$/, ""),
          handoffPath: circeHandoffPath ? `${bundlePath}${circeHandoffPath}` : null,
          phasePlanPath: circePhasePlanPath ? `${bundlePath}${circePhasePlanPath}` : null,
          rekonProofPath: circeRekonProofPath ? `${bundlePath}${circeRekonProofPath}` : null,
          phaseCount,
          warnings: circeWarnings,
          bundle: {
            path: bundlePath,
            intentId: result.intentId,
            status: stalenessState,
            files: result.files.length,
          },
          circe: hasCirceProjection
            ? {
                handoff: `${bundlePath}${circeHandoffPath}`,
                phasePlan: `${bundlePath}${circePhasePlanPath}`,
                rekonProof: `${bundlePath}${circeRekonProofPath}`,
                actorContracts: {
                  implementer: circeManifest.actorContracts?.implementer
                    ? `${bundlePath}${circeManifest.actorContracts.implementer}`
                    : null,
                  reviewer: circeManifest.actorContracts?.reviewer
                    ? `${bundlePath}${circeManifest.actorContracts.reviewer}`
                    : null,
                  plannerVerifier: circeManifest.actorContracts?.plannerVerifier
                    ? `${bundlePath}${circeManifest.actorContracts.plannerVerifier}`
                    : null,
                  implementationHandoffSchema: circeManifest.actorContracts?.implementationHandoffSchema
                    ? `${bundlePath}${circeManifest.actorContracts.implementationHandoffSchema}`
                    : null,
                  reviewVerdictSchema: circeManifest.actorContracts?.reviewVerdictSchema
                    ? `${bundlePath}${circeManifest.actorContracts.reviewVerdictSchema}`
                    : null,
                  plannerDecisionSchema: circeManifest.actorContracts?.plannerDecisionSchema
                    ? `${bundlePath}${circeManifest.actorContracts.plannerDecisionSchema}`
                    : null,
                },
                workOrders: typeof circeManifest.workOrders === "number" ? circeManifest.workOrders : 0,
                verificationPlans: typeof circeManifest.verificationPlans === "number" ? circeManifest.verificationPlans : 0,
                phaseCount,
                phaseVerification,
                warnings: typeof circeManifest.warnings === "number" ? circeManifest.warnings : 0,
              }
            : null,
          canonicalTruth: ".rekon/artifacts",
          taskContext: taskContextOut,
          boundaries: {
            executesCommands: false,
            writesSourceFiles: false,
            implementsIntentGo: false,
            runsCirce: false,
          },
        },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Intent plan bundle", "");
      lines.push(`Bundle: ${bundlePath}`);
      lines.push(`Target: ${bundleTarget}`);
      lines.push(`Status: ${stalenessState}`);
      lines.push(`Files: ${result.files.length}`);
      if (hasCirceProjection) {
        lines.push(`Circe handoff: ${circeManifest.handoff ?? "circe/handoff.json"}`);
        lines.push(
          `Circe artifacts: ${typeof circeManifest.workOrders === "number" ? circeManifest.workOrders : 0} work order(s), ` +
            `${typeof circeManifest.verificationPlans === "number" ? circeManifest.verificationPlans : 0} verification plan(s)`,
        );
        lines.push(
          `Phase verification: ${phaseVerification.executable} executable, ${phaseVerification.finalVerification} final-verification, ` +
            `${phaseVerification.manualReview} manual-review, ${phaseVerification.needsReview} needs-review`,
        );
      } else {
        lines.push("Circe handoff: not emitted (target=generic)");
      }
      if (taskContextOut.included) {
        lines.push(
          `Task context: ${taskContextOut.count} optional context report(s) included (context/, not proof).`,
        );
      }
      lines.push("Canonical truth: .rekon/artifacts/");
      lines.push("");
      lines.push(
        "No Circe commands, source writes, WorkOrder, VerificationPlan, VerificationRun, or intent:go were created or run.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "step" && subcommand === "graph" && positional === "build") {
    // `rekon step graph build [--root <path>] [--json]
    // [--evidence-graph <ref>] [--capability-map <ref>]
    // [--phrase-report <ref>]` — StepCapabilityGraph v1.
    //
    // Projects an EXPECTED WORKFLOW TOPOLOGY graph from the latest (or
    // pinned) EvidenceGraph + CapabilityMap v2 + CapabilityPhraseReport,
    // plus an optional `.rekon/step-capability-map.json` (grouping /
    // labeling only). It models NO runtime truth, NO handoff coverage,
    // and NO drift; it declares no handoffs; it mutates nothing (inputs
    // or config). See docs/artifacts/step-capability-graph.md.
    const store = createLocalArtifactStore(root);
    await store.init();

    const toRef = (entry: ArtifactIndexEntry): ArtifactRef => ({
      type: entry.type,
      id: entry.id,
      path: entry.path,
      digest: entry.digest,
      schemaVersion: entry.schemaVersion ?? "0.1.0",
    });
    const resolveInput = async (
      flag: unknown,
      type: string,
      flagName: string,
    ): Promise<ArtifactRef | undefined> => {
      if (typeof flag === "string" && flag.trim().length > 0) {
        const entry = await findArtifactEntry(store, flag.trim());
        if (entry.type !== type) {
          throw new Error(
            `rekon step graph build: --${flagName} must reference a ${type}; got ${entry.type}.`,
          );
        }
        return toRef(entry);
      }
      const entries = await store.list(type);
      const latest = entries.at(-1);
      return latest ? toRef(latest) : undefined;
    };

    const evidenceGraphRef = await resolveInput(parsed.flags["evidence-graph"], "EvidenceGraph", "evidence-graph");
    const capabilityMapRef = await resolveInput(parsed.flags["capability-map"], "CapabilityMap", "capability-map");
    const phraseReportRef = await resolveInput(parsed.flags["phrase-report"], "CapabilityPhraseReport", "phrase-report");

    const evidenceGraph = evidenceGraphRef
      ? ((await store.read(evidenceGraphRef)) as StepCapabilityGraphEvidenceGraphLike)
      : undefined;
    const capabilityMap = capabilityMapRef
      ? ((await store.read(capabilityMapRef)) as StepCapabilityGraphCapabilityMapLike)
      : undefined;
    const capabilityPhraseReport = phraseReportRef
      ? ((await store.read(phraseReportRef)) as StepCapabilityGraphPhraseReportLike)
      : undefined;

    // Optional `.rekon/step-capability-map.json` (grouping/labeling
    // only). Missing is valid; invalid fails clearly. Never mutated.
    let config: StepCapabilityGraphConfig | undefined;
    let configPath: string | undefined;
    let configHash: string | undefined;
    let configText: string | undefined;
    try {
      configText = await readFile(resolve(root, STEP_CAPABILITY_GRAPH_CONFIG_PATH), "utf8");
    } catch {
      configText = undefined;
    }
    if (configText !== undefined) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(configText);
      } catch (error) {
        throw new Error(
          `rekon step graph build: ${STEP_CAPABILITY_GRAPH_CONFIG_PATH} is not valid JSON: ${(error as Error).message}`,
        );
      }
      config = parseStepCapabilityGraphConfig(parsedJson);
      configPath = STEP_CAPABILITY_GRAPH_CONFIG_PATH;
      configHash = createHash("sha256").update(configText).digest("hex");
    }

    const generatedAt = new Date().toISOString();
    const header: ArtifactHeader = {
      artifactType: "StepCapabilityGraph",
      artifactId: `${STEP_CAPABILITY_GRAPH_ARTIFACT_ID_PREFIX}${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root },
      producer: { id: "@rekon/cli.step-graph-build", version: "0.1.0-beta.0" },
      inputRefs: [evidenceGraphRef, capabilityMapRef, phraseReportRef].filter(
        (ref): ref is ArtifactRef => Boolean(ref),
      ),
      freshness: { status: "fresh" },
      provenance: { confidence: 0.85 },
    };

    const graph: StepCapabilityGraph = buildStepCapabilityGraph({
      header,
      evidenceGraph,
      evidenceGraphRef,
      capabilityMap,
      capabilityMapRef,
      capabilityPhraseReport,
      capabilityPhraseReportRef: phraseReportRef,
      config,
      configPath,
      configHash,
    });

    const ref = await store.write(graph, { category: "graphs" });

    if (json) {
      writeOutput(
        { artifact: { type: ref.type, id: ref.id }, summary: graph.summary, source: graph.source },
        true,
      );
    } else {
      const lines: string[] = [];
      lines.push("Step capability graph");
      lines.push("");
      lines.push(`Steps: ${graph.summary.steps}`);
      lines.push(`Capability edges: ${graph.summary.capabilityEdges}`);
      lines.push(`File edges: ${graph.summary.fileEdges}`);
      lines.push(`System edges: ${graph.summary.systemEdges}`);
      lines.push(`Unresolved capabilities: ${graph.summary.unresolvedCapabilities}`);
      lines.push(`Handoff placeholders: ${graph.summary.handoffPlaceholders}`);
      lines.push("");
      lines.push(`Graph: ${ref.type}:${ref.id}`);
      lines.push(
        "No runtime coverage, drift, WorkOrder, or VerificationPlan artifacts were created.",
      );
      writeOutput(lines.join("\n"), false);
    }
    return;
  }

  if (command === "artifacts" && subcommand === "validate") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const result = await validateArtifactIndex(store);

    writeOutput(result, json);

    if (!result.valid) {
      process.exitCode = 1;
    }

    return;
  }

  if (command === "artifacts" && subcommand === "freshness") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const artifactType = typeof parsed.flags.type === "string" ? parsed.flags.type : undefined;
    const artifactId = typeof parsed.flags.id === "string" ? parsed.flags.id : undefined;
    const result = await validateArtifactFreshness(store, {
      artifactType,
      artifactId,
    });

    writeOutput(json ? result : renderArtifactFreshness(result), json);
    return;
  }

  if (command === "artifacts" && subcommand === "latest") {
    // `rekon artifacts latest --type <ArtifactType> [--kind <kind>]
    // [--id-only] [--allow-missing] [--root <path>] [--json]`
    //
    // **Read-only helper.** Returns the latest entry from the
    // local artifact index for the given type. `--kind` filters
    // Publications by `body.kind` (requires reading bodies; still
    // no mutation). `--id-only` emits a typed ref
    // (`<type>:<id>`) for shell-friendly use in CI workflows.
    // `--allow-missing` returns `artifact: null` with exit 0
    // instead of exit 1.
    //
    // The command never refreshes, validates, executes commands,
    // or writes artifacts.
    const artifactType = typeof parsed.flags.type === "string" ? parsed.flags.type : undefined;
    const kindFlag = typeof parsed.flags.kind === "string" ? parsed.flags.kind : undefined;
    const idOnly = Boolean(parsed.flags["id-only"]);
    const allowMissing = Boolean(parsed.flags["allow-missing"]);

    if (!artifactType) {
      throw new Error("rekon artifacts latest requires --type <ArtifactType>.");
    }
    if (kindFlag !== undefined && artifactType !== "Publication") {
      throw new Error(
        "rekon artifacts latest --kind is only valid with --type Publication.",
      );
    }

    const store = createLocalArtifactStore(root);
    await store.init();
    const entries = await store.list(artifactType);
    const sorted = sortByWrittenAtDesc(entries);
    let match: ArtifactIndexEntry | undefined;

    if (kindFlag === undefined) {
      match = sorted[0];
    } else {
      // Publication kind lookup walks entries newest-first and
      // returns the first whose body.kind matches the requested
      // kind. Reading bodies is read-only.
      for (const candidate of sorted) {
        try {
          const body = (await store.read(candidate)) as { kind?: string };

          if (body && typeof body === "object" && body.kind === kindFlag) {
            match = candidate;
            break;
          }
        } catch {
          // Skip unreadable entries; the artifact index validation
          // path handles those.
          continue;
        }
      }
    }

    if (!match) {
      const message = kindFlag === undefined
        ? `No artifact found for type ${artifactType}.`
        : `No Publication found with kind ${kindFlag}.`;

      if (idOnly) {
        process.stderr.write(`${message}\n`);

        if (!allowMissing) {
          process.exitCode = 1;
        }

        return;
      }

      const payload: Record<string, unknown> = { artifact: null, message };

      if (kindFlag !== undefined) {
        payload.kind = kindFlag;
      }

      writeOutput(payload, json);

      if (!allowMissing) {
        process.exitCode = 1;
      }

      return;
    }

    const ref: ArtifactRef = {
      type: match.type,
      id: match.id,
      path: match.path,
      schemaVersion: match.schemaVersion,
    };

    if (idOnly) {
      process.stdout.write(`${ref.type}:${ref.id}\n`);
      return;
    }

    const payload: Record<string, unknown> = { artifact: ref };

    if (kindFlag !== undefined) {
      payload.kind = kindFlag;
    }

    writeOutput(payload, json);
    return;
  }

  if (command === "config" && subcommand === "validate") {
    const result = await validateConfig(root);
    writeOutput(result, json);

    if (!result.valid) {
      process.exitCode = 1;
    }

    return;
  }

  if (command === "assessments" && subcommand === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entries = await store.list("AssessmentReport");
    const latest = entries.slice().sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    if (!latest) {
      writeOutput({ summary: { total: 0, byKind: {}, byImpact: {}, byType: {}, byState: {} }, assessments: [] }, json);
      return;
    }
    const report = await store.read(latest) as AssessmentReport;
    const kind = typeof parsed.flags.kind === "string" ? parsed.flags.kind : undefined;
    const state = typeof parsed.flags.state === "string" ? parsed.flags.state : undefined;
    if (state && !isAssessmentLifecycleState(state)) {
      throw new Error("--state must be one of model_proposed, evidence_observed, tool_corroborated, independently_confirmed, verified, operator_confirmed, opportunity_only, diagnostic_only.");
    }
    const assessments = report.assessments
      .filter((assessment) => !kind || assessment.kind === kind)
      .filter((assessment) => !state || assessment.state === state);
    writeOutput({ artifact: latest, summary: report.summary, rendered: assessments.length, assessments }, json);
    return;
  }

  if (command === "findings" && subcommand === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const lifecycle = await buildFindingLifecycleReport(store);
    const statusFilter = typeof parsed.flags.status === "string" ? parsed.flags.status : undefined;
    const findings = statusFilter
      ? lifecycle.findings.filter((finding) => finding.effectiveStatus === statusFilter)
      : lifecycle.findings;

    writeOutput(
      {
        summary: lifecycle.summary,
        findings: findings.map((finding) => ({
          id: finding.id,
          type: finding.type,
          severity: finding.severity,
          title: finding.title,
          files: finding.files ?? [],
          effectiveStatus: finding.effectiveStatus,
          statusSource: finding.statusSource,
          statusReason: finding.statusReason,
          statusNote: finding.statusNote,
        })),
      },
      json,
    );
    return;
  }

  if (command === "findings" && subcommand === "lifecycle") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const lifecycle = await buildFindingLifecycleReport(store);
    const ref = await store.write(lifecycle, { category: "findings" });

    writeOutput({ artifact: ref, summary: lifecycle.summary }, json);
    return;
  }

  if (command === "findings" && subcommand === "filter") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const policies = await loadFindingFilterPolicies(root);
    const resultFilters = await loadFindingResultFilters(root);
    const report = await buildFindingFilterReport(store, { policies, resultFilters });
    const ref = await store.write(report, { category: "findings" });

    writeOutput(
      {
        artifact: ref,
        summary: report.summary,
        policyFilters: policies.length,
        resultFilters: resultFilters ?? null,
      },
      json,
    );
    return;
  }

  if (command === "findings" && subcommand === "filter-health") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const policies = await loadFindingFilterPolicies(root);
    const resultFilters = await loadFindingResultFilters(root);
    // Diagnostics v2: fingerprint the current policy set and
    // forward it so the report can emit
    // `stale-policy-fingerprint` / `policy-fingerprint-missing`
    // alerts when the operator's `.rekon/config.json
    // findingFilters` has drifted from the latest filter run.
    const currentPolicyFingerprint = fingerprintFindingFilterPolicies(policies);
    const health = await buildFindingFilterHealthReport(store, {
      policies,
      resultFilters,
      currentPolicyFingerprint,
    });
    const ref = await store.write(health, { category: "findings" });

    writeOutput(
      {
        artifact: ref,
        summary: health.summary,
        alerts: health.alerts,
        policyFilters: policies.length,
        resultFilters: resultFilters ?? null,
        currentPolicyFingerprint,
      },
      json,
    );
    return;
  }

  if (command === "findings" && subcommand === "filter-policy" && positional === "suggest") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const policies = await loadFindingFilterPolicies(root);
    const recentLimitRaw = parsed.flags["recent-limit"];
    const recentLimit =
      typeof recentLimitRaw === "string" && recentLimitRaw.trim().length > 0
        ? Number.parseInt(recentLimitRaw, 10)
        : undefined;
    if (recentLimitRaw !== undefined && (Number.isNaN(recentLimit) || (recentLimit ?? 0) <= 0)) {
      throw new Error("--recent-limit must be a positive integer.");
    }
    const report = await buildFindingFilterPolicySuggestionReport(store, {
      policies,
      recentLimit,
    });
    const ref = await store.write(report, { category: "findings" });

    writeOutput(
      {
        artifact: ref,
        summary: report.summary,
        suggestions: report.suggestions,
      },
      json,
    );
    return;
  }

  if (command === "findings" && subcommand === "filter-policy" && positional === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const entries = await store.list("FindingFilterPolicySuggestionReport");
    if (entries.length === 0) {
      writeOutput(
        {
          artifact: null,
          summary: null,
          suggestions: [],
          message:
            "No FindingFilterPolicySuggestionReport indexed. Run `rekon findings filter-policy suggest` to generate one.",
        },
        json,
      );
      return;
    }
    const sorted = [...entries].sort((left, right) =>
      right.writtenAt.localeCompare(left.writtenAt),
    );
    const latest = sorted[0]!;
    const reportBody = (await store.read(latest)) as FindingFilterPolicySuggestionReport;
    writeOutput(
      {
        artifact: latest,
        summary: reportBody.summary,
        suggestions: reportBody.suggestions,
      },
      json,
    );
    return;
  }

  if (command === "findings" && subcommand === "filter-policy" && positional === "status") {
    // Read-only operator workflow surface (P1.1
    // filter-policy-status v1). Combines configured policies +
    // the latest FindingFilterReport / FindingFilterHealthReport
    // / FindingFilterPolicySuggestionReport into a single
    // structured status response. No mutation. Uses the
    // best-effort `loadFindingFilterPolicies` so a malformed
    // config doesn't blow up the report — `rekon config
    // validate` remains the full diagnostic. When the config
    // file is unparseable, fail clearly without writing.
    const configPath = resolve(root, ".rekon", "config.json");
    try {
      const raw = await readFile(configPath, "utf8");
      try {
        const parsedConfig: unknown = JSON.parse(raw);
        if (!parsedConfig || typeof parsedConfig !== "object" || Array.isArray(parsedConfig)) {
          throw new Error(
            `${configPath} must be a JSON object. Run \`rekon config validate\` for details.`,
          );
        }
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error(
            `Failed to parse ${configPath}: ${parseError.message}. Run \`rekon config validate\` for details.`,
          );
        }
        throw parseError;
      }
    } catch (error) {
      if (
        !(
          error instanceof Error
          && "code" in error
          && (error as NodeJS.ErrnoException).code === "ENOENT"
        )
      ) {
        throw error;
      }
      // Missing config: treat as "zero configured policies" and
      // continue — `loadFindingFilterPolicies` will return [].
    }

    const policies = await loadFindingFilterPolicies(root);

    const store = createLocalArtifactStore(root);
    await store.init();
    const filterReport = await readLatestArtifactOrUndefined<FindingFilterReport>(
      store,
      "FindingFilterReport",
    );
    const healthReport = await readLatestArtifactOrUndefined<FindingFilterHealthReport>(
      store,
      "FindingFilterHealthReport",
    );
    const suggestionReport
      = await readLatestArtifactOrUndefined<FindingFilterPolicySuggestionReport>(
        store,
        "FindingFilterPolicySuggestionReport",
      );

    const result = summarizeFindingFilterPolicyStatus({
      configPath,
      policies,
      filterReport,
      healthReport,
      suggestionReport,
    });

    // Optional filtering. Applied AFTER the helper computes
    // the full status so summary counts always reflect the
    // whole policy set; only the rendered list narrows.
    const policyFlag = typeof parsed.flags.policy === "string" ? parsed.flags.policy : undefined;
    const warningsOnly = Boolean(parsed.flags["warnings-only"]);
    const unusedOnly = Boolean(parsed.flags["unused-only"]);

    let renderedPolicies = result.policies;
    if (policyFlag) {
      renderedPolicies = renderedPolicies.filter((entry) => entry.id === policyFlag);
    }
    if (warningsOnly) {
      renderedPolicies = renderedPolicies.filter((entry) => entry.warnings.length > 0);
    }
    if (unusedOnly) {
      renderedPolicies = renderedPolicies.filter((entry) => entry.isUnused);
    }

    writeOutput(
      {
        ...result,
        policies: renderedPolicies,
        // The original (unfiltered) summary stays intact; the
        // CLI surfaces the filtered list separately so the
        // operator can see both the global counts and the
        // narrowed view.
        renderedPolicyCount: renderedPolicies.length,
      },
      json,
    );
    return;
  }

  if (command === "findings" && subcommand === "filter-policy" && positional === "apply") {
    const suggestionId =
      typeof parsed.positionals[3] === "string" ? parsed.positionals[3] : undefined;
    if (!suggestionId) {
      throw new Error(
        "rekon findings filter-policy apply requires <suggestion-id>. Run `rekon findings filter-policy list` to find ids.",
      );
    }
    const force = Boolean(parsed.flags.force);
    // `--dry-run` and `--preview` are aliases.
    const dryRun = Boolean(parsed.flags["dry-run"]) || Boolean(parsed.flags.preview);

    // Detect config-missing before `store.init()` runs because
    // the store bootstraps a default `.rekon/config.json` as
    // part of init. The apply plan needs to know whether the
    // file existed prior to this invocation so dry-run can warn
    // the operator and actual apply can mention that a default
    // config was synthesized.
    const configPath = resolve(root, ".rekon", "config.json");
    const { parsedConfig, configMissing } = await loadConfigForApply(root, configPath);

    const store = createLocalArtifactStore(root);
    await store.init();
    const entries = await store.list("FindingFilterPolicySuggestionReport");
    if (entries.length === 0) {
      throw new Error(
        "No FindingFilterPolicySuggestionReport indexed. Run `rekon findings filter-policy suggest` first.",
      );
    }
    const sorted = [...entries].sort((left, right) =>
      right.writtenAt.localeCompare(left.writtenAt),
    );
    const latest = sorted[0]!;
    const reportBody = (await store.read(latest)) as FindingFilterPolicySuggestionReport;
    const suggestion = reportBody.suggestions.find((entry) => entry.id === suggestionId);
    if (!suggestion) {
      const available = reportBody.suggestions.map((entry) => entry.id).join(", ");
      throw new Error(
        `Suggestion '${suggestionId}' not found in latest FindingFilterPolicySuggestionReport (${reportBody.header.artifactId}). Available ids: ${available || "(none)"}.`,
      );
    }

    const existingRules = parseFindingFiltersFromConfig(parsedConfig);
    const plan = planFindingFilterPolicyApply({ suggestion, existingRules });

    const allWarnings: { code: string; message: string }[] = [...plan.warnings];
    if (configMissing) {
      allWarnings.push({
        code: "config-missing",
        message:
          ".rekon/config.json was missing; "
          + (dryRun
            ? "no file will be created during dry-run."
            : "a default config was written before applying the suggestion."),
      });
    }

    const refusalBlockers = force ? [] : plan.blockers;

    // Validate the proposed config shape. We run the validator
    // up-front so dry-run can surface shape problems; the actual
    // apply path still refuses to write when validation fails.
    const validation = validateFindingFilterPolicyRules(plan.proposedRules);
    const validationFailed = validation.issues.length > 0;
    const validationError = validationFailed
      ? `Proposed findingFilters configuration is invalid: ${validation.issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("; ")}.`
      : null;

    // Fingerprint the current + projected policy sets so operators
    // can see exactly which policy state the apply would land
    // (`policyFingerprint`) and what the active `findingFilters`
    // looked like before the apply (`currentPolicyFingerprint`).
    // Downstream `computeFilterPolicyStaleness` compares the same
    // digest against the latest `FindingFilterReport`.
    const currentPolicyFingerprint = fingerprintFindingFilterPolicies(existingRules);
    const projectedPolicyFingerprint = fingerprintFindingFilterPolicies(plan.proposedRules);

    const baseResult = {
      dryRun,
      configPath,
      suggestionId: suggestion.id,
      rule: plan.rule,
      diff: plan.diff,
      warnings: allWarnings,
      force,
      confidence: suggestion.confidence,
      requiresForce: plan.requiresForce,
      isLowConfidence: plan.isLowConfidence,
      isDuplicateRuleId: plan.isDuplicateRuleId,
      isBroadPattern: plan.isBroadPattern,
      validation: {
        valid: !validationFailed,
        issues: validation.issues,
      },
      currentPolicyFingerprint,
    };

    if (dryRun) {
      // Dry-run / preview: never write. Report what would happen,
      // including blockers, validation, the projected policy
      // fingerprint (so the operator can compare against the
      // latest FindingFilterReport), and whether `--force` would
      // be needed.
      writeOutput(
        {
          ...baseResult,
          applied: false,
          wouldRefuse: refusalBlockers.length > 0 || validationFailed,
          blockers: refusalBlockers,
          projectedPolicyFingerprint,
        },
        json,
      );
      return;
    }

    // Real apply path. Surface --force-required blockers BEFORE
    // validation so operators see the clear "low-confidence" /
    // "broad-path-pattern" / "duplicate-rule-id" message rather
    // than a downstream validation error.
    if (refusalBlockers.length > 0) {
      throw new Error(formatApplyRefusalMessage(refusalBlockers, suggestion.id));
    }

    if (validationFailed) {
      throw new Error(`${validationError} Refusing to write.`);
    }

    if (configMissing) {
      // For an actual apply we need a real config file on disk
      // before we write the appended rule. Mirrors `rekon init`.
      await writeConfigIfMissing(root);
    }

    const writtenConfig = buildAppliedConfig(parsedConfig, plan);
    await writeFile(
      configPath,
      `${JSON.stringify(writtenConfig, null, 2)}\n`,
      "utf8",
    );

    writeOutput(
      {
        ...baseResult,
        applied: true,
        wouldRefuse: false,
        blockers: [],
        // After the write, the projected fingerprint becomes the
        // current policy fingerprint. The next `rekon refresh` /
        // `rekon findings filter` run will stamp this same
        // fingerprint onto the new `FindingFilterReport`.
        policyFingerprint: projectedPolicyFingerprint,
        appliedRule: plan.rule, // legacy alias kept for back-compat
      },
      json,
    );
    return;
  }

  if (command === "findings" && subcommand === "status" && positional === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const ledger = await readLatestLedger(store);

    writeOutput({ decisions: ledger?.decisions ?? [] }, json);
    return;
  }

  if (command === "findings" && subcommand === "status" && positional === "set") {
    const findingId = typeof parsed.positionals[3] === "string" ? parsed.positionals[3] : undefined;
    const status = typeof parsed.flags.status === "string" ? parsed.flags.status : undefined;
    const note = typeof parsed.flags.note === "string" ? parsed.flags.note : undefined;
    const reasonFlag = typeof parsed.flags.reason === "string" ? parsed.flags.reason : undefined;

    if (!findingId) {
      throw new Error("rekon findings status set requires <finding-id>.");
    }

    if (!status || !isFindingStatusDecisionStatus(status)) {
      throw new Error(
        "rekon findings status set requires --status with one of accepted, ignored, resolved.",
      );
    }

    if (status === "ignored" && (!note || note.trim().length === 0)) {
      throw new Error("Ignored findings require --note <reason>.");
    }

    if (status === "resolved" && (!note || note.trim().length === 0)) {
      throw new Error("Resolved findings require --note <reason>.");
    }

    const reason: FindingStatusDecisionReason | undefined = isFindingStatusDecisionReason(reasonFlag)
      ? reasonFlag
      : undefined;

    const store = createLocalArtifactStore(root);
    await store.init();
    const previous = await readLatestLedger(store);
    const updatedAt = new Date().toISOString();
    const decision: FindingStatusDecision = {
      id: `decision-${Date.now()}-${findingId.replace(/[^A-Za-z0-9_.-]+/g, "-")}`,
      findingId,
      status,
      note: note ?? "",
      reason,
      updatedAt,
      source: "operator",
    };

    const decisions = previous?.decisions
      ? [...previous.decisions.filter((entry) => entry.findingId !== findingId), decision]
      : [decision];
    const repoId = subjectRepoIdFromStore(store);
    const ledger = createFindingStatusLedger({
      header: {
        artifactType: "FindingStatusLedger",
        artifactId: `finding-status-ledger-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: updatedAt,
        subject: { repoId },
        producer: { id: "@rekon/cli.findings", version: "0.1.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
      },
      decisions,
    });
    const ref = await store.write(ledger, { category: "findings" });

    writeOutput({ artifact: ref, decision }, json);
    return;
  }

  if (command === "coherency" && subcommand === "delta") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const delta = await buildCoherencyDelta(store);
    const ref = await store.write(delta, { category: "findings" });

    writeOutput(
      {
        artifact: ref,
        summary: delta.summary,
        remediationQueue: delta.remediationQueue,
      },
      json,
    );
    return;
  }

  if (command === "issues" && subcommand === "adjudicate") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const report = await buildIssueAdjudicationReport(store);
    const ref = await store.write(report, { category: "findings" });
    const ledger = await readLatestMergeDecisionLedger(store);
    const mergeCandidates = applyIssueMergeDecisionsToCandidates(
      report.mergeCandidates,
      ledger,
    );

    writeOutput(
      {
        artifact: ref,
        summary: report.summary,
        groups: report.groups,
        mergeCandidates,
      },
      json,
    );
    return;
  }

  if (command === "issues" && subcommand === "list") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const statusFilter = parseIssueStatusFilter(parsed.flags.status);

    const entries = await store.list("IssueAdjudicationReport");
    const sorted = [...entries].sort((left, right) => right.id.localeCompare(left.id));
    const latest = sorted[0];

    let report;
    let artifactRef;

    if (latest) {
      report = (await store.read(latest)) as Awaited<ReturnType<typeof buildIssueAdjudicationReport>>;
      artifactRef = {
        type: latest.type,
        id: latest.id,
        path: latest.path,
        digest: latest.digest,
        schemaVersion: latest.schemaVersion,
      };
    } else {
      report = await buildIssueAdjudicationReport(store);
      const newRef = await store.write(report, { category: "findings" });
      artifactRef = newRef;
    }

    const groups = statusFilter
      ? report.groups.filter((group) => group.status === statusFilter)
      : report.groups;

    const ledger = await readLatestMergeDecisionLedger(store);
    const mergeCandidates = applyIssueMergeDecisionsToCandidates(
      report.mergeCandidates,
      ledger,
    );

    writeOutput(
      {
        artifact: artifactRef,
        summary: report.summary,
        groups,
        mergeCandidates,
      },
      json,
    );
    return;
  }

  if (command === "issues" && subcommand === "merge" && positional === "candidates") {
    const store = createLocalArtifactStore(root);
    await store.init();

    const entries = await store.list("IssueAdjudicationReport");
    const sorted = [...entries].sort((left, right) => right.id.localeCompare(left.id));
    const latest = sorted[0];
    if (!latest) {
      throw new Error(
        "No IssueAdjudicationReport found. Run `rekon issues adjudicate` or `rekon refresh`.",
      );
    }
    const report = (await store.read(latest)) as IssueAdjudicationReport;
    const ledger = await readLatestMergeDecisionLedger(store);
    const coherencyDelta = await readLatestCoherencyDelta(store);
    const mergeRollupFreshness = detectIssueMergeRollupFreshness({
      coherencyDelta,
      latestIssueMergeDecisionLedger: ledger,
      latestIssueAdjudicationReport: report,
    });

    const mergeCandidates = applyIssueMergeDecisionsToCandidates(
      report.mergeCandidates,
      ledger,
    );
    const views = buildIssueMergeCandidateViews({
      report,
      ledger,
      coherencyDelta,
      mergeRollupFreshness,
    });
    const filterFlag = parseIssueMergeCandidateFilterFlags(parsed.flags);
    const filteredViews = applyIssueMergeCandidateFilters(views, filterFlag);
    const limited = filterFlag.limit !== undefined
      ? filteredViews.slice(0, filterFlag.limit)
      : filteredViews;
    const filteredIds = new Set(limited.map((view) => view.candidate.id));
    const filteredMergeCandidates = mergeCandidates.filter((candidate) =>
      filteredIds.has(candidate.id),
    );

    const summary = summarizeIssueMergeCandidateDecisions(views);
    const serializedViews = limited.map((view) => serializeIssueMergeCandidateView(view));
    if (!json) {
      writeOutput(
        renderIssueMergeCandidatesText({
          summary,
          views: limited,
          filter: filterFlag,
          mergeRollupFreshness,
        }),
        json,
      );
      return;
    }
    writeOutput(
      {
        artifact: {
          type: latest.type,
          id: latest.id,
          path: latest.path,
          digest: latest.digest,
          schemaVersion: latest.schemaVersion,
        },
        ledger: ledger
          ? { type: "IssueMergeDecisionLedger", id: ledger.header.artifactId, schemaVersion: ledger.header.schemaVersion }
          : null,
        coherencyDelta: coherencyDelta
          ? {
              type: "CoherencyDelta",
              id: coherencyDelta.header.artifactId,
              schemaVersion: coherencyDelta.header.schemaVersion,
            }
          : null,
        filter: filterFlag,
        summary,
        mergeCandidates: filteredMergeCandidates,
        mergeCandidateViews: serializedViews,
        mergeRollupFreshness,
      },
      json,
    );
    return;
  }

  if (command === "issues" && subcommand === "merge" && positional === "candidate") {
    const candidateId = typeof parsed.positionals[3] === "string"
      ? parsed.positionals[3]
      : undefined;
    if (!candidateId) {
      throw new Error(
        "rekon issues merge candidate requires a candidate id positional argument.",
      );
    }
    const store = createLocalArtifactStore(root);
    await store.init();
    const entries = await store.list("IssueAdjudicationReport");
    const sortedReports = [...entries].sort((left, right) =>
      right.id.localeCompare(left.id),
    );
    const latestReport = sortedReports[0];
    if (!latestReport) {
      throw new Error(
        "No IssueAdjudicationReport found. Run `rekon issues adjudicate` or `rekon refresh`.",
      );
    }
    const report = (await store.read(latestReport)) as IssueAdjudicationReport;
    const ledger = await readLatestMergeDecisionLedger(store);
    const coherencyDelta = await readLatestCoherencyDelta(store);
    const mergeRollupFreshness = detectIssueMergeRollupFreshness({
      coherencyDelta,
      latestIssueMergeDecisionLedger: ledger,
      latestIssueAdjudicationReport: report,
    });
    const views = buildIssueMergeCandidateViews({
      report,
      ledger,
      coherencyDelta,
      mergeRollupFreshness,
    });
    const view = views.find((entry) => entry.candidate.id === candidateId);
    if (!view) {
      const available = views.map((entry) => entry.candidate.id);
      const detail = available.length === 0
        ? "no merge candidates exist in the latest IssueAdjudicationReport"
        : `available candidate ids: ${available.join(", ")}`;
      throw new Error(
        `Merge candidate not found: ${candidateId} (${detail}).`,
      );
    }
    const recommendedCommands = recommendedCommandsForCandidateView(view);
    if (!json) {
      writeOutput(
        renderIssueMergeCandidateDetailText({
          view,
          recommendedCommands,
          mergeRollupFreshness,
        }),
        json,
      );
      return;
    }
    writeOutput(
      {
        artifact: {
          type: latestReport.type,
          id: latestReport.id,
          path: latestReport.path,
          digest: latestReport.digest,
          schemaVersion: latestReport.schemaVersion,
        },
        ledger: ledger
          ? {
              type: "IssueMergeDecisionLedger",
              id: ledger.header.artifactId,
              schemaVersion: ledger.header.schemaVersion,
            }
          : null,
        coherencyDelta: coherencyDelta
          ? {
              type: "CoherencyDelta",
              id: coherencyDelta.header.artifactId,
              schemaVersion: coherencyDelta.header.schemaVersion,
            }
          : null,
        ...serializeIssueMergeCandidateView(view),
        recommendedCommands,
        mergeRollupFreshness,
      },
      json,
    );
    return;
  }

  if (command === "issues" && subcommand === "merge" && positional === "decide") {
    const candidateId = typeof parsed.positionals[3] === "string" ? parsed.positionals[3] : undefined;
    if (!candidateId) {
      throw new Error("rekon issues merge decide requires a candidate id positional argument.");
    }
    const decisionFlag = typeof parsed.flags.decision === "string" ? parsed.flags.decision : undefined;
    if (!decisionFlag || (decisionFlag !== "accepted" && decisionFlag !== "rejected")) {
      throw new Error(
        "rekon issues merge decide requires --decision accepted|rejected.",
      );
    }
    const note = typeof parsed.flags.note === "string" ? parsed.flags.note : "";
    if (note.trim().length === 0) {
      throw new Error("rekon issues merge decide requires --note <note>.");
    }
    const reasonFlag = typeof parsed.flags.reason === "string" ? parsed.flags.reason : undefined;
    const reason = parseIssueMergeDecisionReason(reasonFlag);
    const decidedBy = typeof parsed.flags["decided-by"] === "string" ? parsed.flags["decided-by"] : undefined;

    const store = createLocalArtifactStore(root);
    await store.init();

    // Issue merge decision operator ergonomics v1: read
    // the prior ledger BEFORE recording so we can surface
    // `previousDecision` + `changedDecision` to the
    // operator without changing record-side behavior.
    const priorLedger = await readLatestMergeDecisionLedger(store);
    const previousDecision = findLatestIssueMergeDecision(priorLedger, candidateId);

    const ledger = await recordIssueMergeDecision(store, {
      candidateId,
      decision: decisionFlag,
      note,
      reason,
      decidedBy,
    });
    const latestDecision = ledger.decisions[ledger.decisions.length - 1]!;
    const changedDecision = previousDecision
      ? previousDecision.decision !== latestDecision.decision
      : false;

    writeOutput(
      {
        artifact: {
          type: "IssueMergeDecisionLedger",
          id: ledger.header.artifactId,
          schemaVersion: ledger.header.schemaVersion,
        },
        decision: latestDecision,
        previousDecision: previousDecision ?? null,
        changedDecision,
        recommendedNextCommands: [
          `rekon coherency delta --root ${root} --json`,
          `rekon publish architecture --root ${root} --json`,
          `rekon publish agent-contract --root ${root} --json`,
        ],
      },
      json,
    );
    return;
  }

  if (command === "issues" && subcommand === "merge" && positional === "decisions") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const ledger = await readLatestMergeDecisionLedger(store);
    if (!ledger) {
      if (!json) {
        writeOutput("No IssueMergeDecisionLedger found. No merge decisions recorded yet.", json);
        return;
      }
      writeOutput(
        {
          ledger: null,
          decisions: [],
          summary: {
            total: 0,
            current: 0,
            superseded: 0,
            accepted: 0,
            rejected: 0,
          },
        },
        json,
      );
      return;
    }
    const annotated = annotateIssueMergeDecisions(ledger);
    if (!json) {
      writeOutput(renderIssueMergeDecisionsText(ledger, annotated), json);
      return;
    }
    writeOutput(
      {
        ledger: {
          type: "IssueMergeDecisionLedger",
          id: ledger.header.artifactId,
          schemaVersion: ledger.header.schemaVersion,
        },
        summary: annotated.summary,
        decisions: annotated.entries,
      },
      json,
    );
    return;
  }

  if (command === "verify" && subcommand === "coverage" && positional === "plan") {
    const commandName = "rekon verify coverage plan";
    const frameworkValue = parsed.flags.framework;
    const testPathValue = parsed.flags["test-path"];
    const sourcePathValues = parseRepeatableFlag(parsed.flags["source-path"]);
    const providerValue = parsed.flags.provider;
    const configValue = parsed.flags.config;
    if (typeof frameworkValue !== "string" || frameworkValue.trim().length === 0) {
      throw new Error(`${commandName} requires --framework node|vitest|jest.`);
    }
    if (typeof testPathValue !== "string" || testPathValue.trim().length === 0) {
      throw new Error(`${commandName} requires --test-path <test-file>.`);
    }
    if (sourcePathValues.length === 0) {
      throw new Error(`${commandName} requires at least one --source-path <source-file>.`);
    }
    if (providerValue !== undefined && typeof providerValue !== "string") {
      throw new Error(`${commandName} requires exactly one value after --provider.`);
    }
    if (configValue !== undefined && typeof configValue !== "string") {
      throw new Error(`${commandName} requires exactly one value after --config.`);
    }
    const framework = frameworkValue.trim();
    if (framework !== "node" && framework !== "vitest" && framework !== "jest") {
      throw new Error(`${commandName} supports --framework node, --framework vitest, or --framework jest.`);
    }
    if (framework === "node" && configValue !== undefined) {
      throw new Error(`${commandName} does not accept --config with --framework node.`);
    }
    const testFile = await resolveReadableRepoFile(root, testPathValue.trim(), commandName, "test file");
    const configFile = typeof configValue === "string"
      ? await resolveReadableRepoFile(root, configValue.trim(), commandName, "test-runner config")
      : undefined;
    const targetFiles = await Promise.all(sourcePathValues.map((sourcePath) =>
      resolveReadableRepoFile(root, sourcePath.trim(), commandName, "source target")));
    const targetPaths = [...new Set(targetFiles.map((targetFile) => targetFile.relativePath))].sort();
    const binaryPath = framework === "node"
      ? "node"
      : await resolveInstalledTestFrameworkBinary(root, framework);
    const provider = await resolveIsolatedCoverageProvider(
      root,
      framework,
      typeof providerValue === "string" ? providerValue.trim() : undefined,
    );
    const store = createLocalArtifactStore(root);
    await store.init();
    const generatedAt = new Date().toISOString();
    const planResult = createIsolatedCoverageVerificationPlan({
      header: {
        artifactType: "VerificationPlan",
        artifactId: `verification-plan-coverage-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt,
        supersession: {
          key: `coverage-plan:${createHash("sha256").update(`${framework}\n${provider}\n${testFile.relativePath}\n${configFile?.relativePath ?? ""}\n${targetPaths.join(",")}`).digest("hex")}`,
        },
        subject: { repoId: subjectRepoIdFromStore(store), paths: [testFile.relativePath, ...targetPaths] },
        producer: { id: "@rekon/cli.verify-coverage-plan", version: "1.0.0" },
        inputRefs: [],
        freshness: { status: "fresh" },
        provenance: {
          confidence: 1,
          notes: [
            framework === "node"
              ? "Uses the Node.js test runner from the current execution environment."
              : `Resolved installed ${framework} binary at ${binaryPath}.`,
            "Planning does not execute tests or install packages.",
          ],
        },
      },
      framework,
      provider,
      testPath: testFile.relativePath,
      ...(configFile ? { configPath: configFile.relativePath } : {}),
      targetPaths,
      binaryPath,
    });
    const ref = await store.write(planResult.verificationPlan, { category: "actions" });
    const runCommand = `rekon verify run --plan ${ref.id} --execute`;
    const output = {
      artifact: ref,
      framework,
      provider,
      testPath: testFile.relativePath,
      ...(configFile ? { configPath: configFile.relativePath } : {}),
      targetPaths,
      binaryPath,
      coverageDirectory: planResult.coverageDirectory,
      coveragePath: planResult.coveragePath,
      command: planResult.command,
      next: { command: runCommand },
      boundaries: {
        executedCommands: false,
        installedPackages: false,
        wroteSourceFiles: false,
      },
    };
    if (json) {
      writeOutput(output, true);
    } else {
      writeOutput([
        "Isolated coverage plan",
        "",
        `Framework: ${framework}`,
        `Provider: ${provider}`,
        `Test: ${testFile.relativePath}`,
        `Coverage: ${planResult.coveragePath}`,
        `Artifact: ${ref.type}:${ref.id}`,
        "",
        "Run:",
        `  ${runCommand}`,
      ].join("\n"), false);
    }
    return;
  }

  if (command === "verify" && subcommand === "run") {
    // `rekon verify run` previews or executes a VerificationPlan.
    //
    // - `--dry-run` / `--preview`: validates each command against
    //   the safety contract and writes a planned-but-not-run
    //   VerificationRun. **No process is spawned.**
    // - `--execute`: actually runs the commands using
    //   `spawn` with `shell: false`, a scrubbed env, per-command
    //   + per-plan timeouts, and bounded redacted log excerpts.
    //   Writes a VerificationRun artifact with recorded
    //   execution detail.
    //
    // The two flags are mutually exclusive. Either flag requires
    // exactly one plan source: a registered `--plan` artifact id or
    // an unregistered `--plan-file` JSON artifact. The CLI exits
    // non-zero when execution returns
    // `failed` / `timeout` / `killed`.
    const planFlag = typeof parsed.flags.plan === "string" ? parsed.flags.plan : undefined;
    const planFileFlag = typeof parsed.flags["plan-file"] === "string" ? parsed.flags["plan-file"] : undefined;
    const artifactRootFlag = typeof parsed.flags["artifact-root"] === "string" ? parsed.flags["artifact-root"] : undefined;
    const execRootFlag = typeof parsed.flags["exec-root"] === "string" ? parsed.flags["exec-root"] : undefined;
    const dryRunFlag = Boolean(parsed.flags["dry-run"]) || Boolean(parsed.flags.preview);
    const executeFlag = Boolean(parsed.flags.execute);
    const commandTimeoutFlag = typeof parsed.flags["command-timeout-ms"] === "string"
      ? Number(parsed.flags["command-timeout-ms"])
      : undefined;
    const planTimeoutFlag = typeof parsed.flags["timeout-ms"] === "string"
      ? Number(parsed.flags["timeout-ms"])
      : undefined;
    const maxLogBytesFlag = typeof parsed.flags["max-log-bytes"] === "string"
      ? Number(parsed.flags["max-log-bytes"])
      : undefined;
    const coverageFlagValue = parsed.flags["istanbul-coverage"];
    const testPathFlagValue = parsed.flags["test-path"];
    if (coverageFlagValue !== undefined && typeof coverageFlagValue !== "string") {
      throw new Error("rekon verify run requires exactly one path after --istanbul-coverage.");
    }
    if (testPathFlagValue !== undefined && typeof testPathFlagValue !== "string") {
      throw new Error("rekon verify run requires exactly one path after --test-path.");
    }
    const explicitCoverageFlag = typeof coverageFlagValue === "string" ? coverageFlagValue.trim() : "";
    const explicitTestPathFlag = typeof testPathFlagValue === "string" ? testPathFlagValue.trim() : "";
    if ((explicitCoverageFlag.length > 0) !== (explicitTestPathFlag.length > 0)) {
      throw new Error("rekon verify run requires --istanbul-coverage and --test-path together.");
    }

    if (dryRunFlag && executeFlag) {
      throw new Error(
        "rekon verify run does not accept --dry-run and --execute together. "
          + "Choose one: `--dry-run` (no execution) or `--execute` (run the plan).",
      );
    }
    if (planFlag && planFileFlag) {
      throw new Error("rekon verify run requires exactly one plan source; choose either --plan or --plan-file, not both.");
    }
    if (!planFlag && !planFileFlag) {
      throw new Error("rekon verify run requires a plan source: --plan <id|type:id> or --plan-file <path>.");
    }
    if (!dryRunFlag && !executeFlag) {
      throw new Error(
        "rekon verify run requires --dry-run / --preview (no execution) "
          + "or --execute (run the plan).",
      );
    }
    if (dryRunFlag && explicitCoverageFlag.length > 0) {
      throw new Error("rekon verify run cannot observe coverage during --dry-run because no test executes.");
    }

    const artifactRoot = resolveFlagPath(root, artifactRootFlag) ?? root;
    const execRoot = resolveFlagPath(root, execRootFlag) ?? artifactRoot;
    const store = createLocalArtifactStore(artifactRoot);
    await store.init();

    const planResolution = planFileFlag
      ? await readVerificationPlanFile(root, planFileFlag)
      : await readRegisteredVerificationPlan(store, planFlag);
    const { planArtifact, planRef, planFile, warnings: resolveWarnings } = planResolution;
    const planCoverage = parseVerificationPlanCoverage(planArtifact.coverage);
    if (planCoverage?.format === "lcov" && explicitCoverageFlag.length > 0) {
      throw new Error(
        "rekon verify run reads LCOV paths from VerificationPlan metadata; --istanbul-coverage is not accepted for this plan.",
      );
    }
    let coverageFlag = explicitCoverageFlag;
    let testPathFlag = explicitTestPathFlag;
    if (executeFlag && planCoverage) {
      if (coverageFlag.length > 0
        && (coverageFlag !== planCoverage.coveragePath || testPathFlag !== planCoverage.testPath)) {
        throw new Error(
          "rekon verify run coverage flags do not match the selected VerificationPlan coverage metadata.",
        );
      }
      if (coverageFlag.length === 0) {
        coverageFlag = planCoverage.coveragePath;
        testPathFlag = planCoverage.testPath;
      }
    }
    if (coverageFlag.length > 0 && resolve(artifactRoot) !== resolve(execRoot)) {
      throw new Error(
        "rekon verify run requires --artifact-root and --exec-root to match when observing coverage.",
      );
    }
    const workOrderRef = planArtifact.workOrderRef;
    const inputRefs: ArtifactRef[] = workOrderRef ? [planRef, workOrderRef] : [planRef];
    const generatedAt = new Date().toISOString();
    const repoId = subjectRepoIdFromStore(store);

    if (executeFlag) {
      const header: ArtifactHeader = {
        artifactType: "VerificationRun",
        artifactId: `verification-run-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt,
        supersession: { key: `verification-run:${planRef.id}` },
        snapshotId: planArtifact.header?.snapshotId,
        subject: {
          repoId,
          ref: planArtifact.header?.subject?.ref,
          commit: planArtifact.header?.subject?.commit,
          paths: planArtifact.header?.subject?.paths,
          systems: planArtifact.header?.subject?.systems,
        },
        producer: {
          id: VERIFY_CAPABILITY_ID,
          version: VERIFY_CAPABILITY_VERSION,
        },
        inputRefs,
        freshness: { status: "fresh" },
        provenance: {
          confidence: 0.9,
          notes: [
            "VerificationRun produced by `rekon verify run --execute`.",
            "Execution is local; logs are redacted and truncated.",
            "No findings were auto-resolved.",
            ...(planFile
              ? [
                  `VerificationPlan was read from unregistered plan file ${planFile.path}.`,
                  `Plan file sha256: ${planFile.sha256}.`,
                ]
              : []),
          ],
        },
      };
      const sourcePaths = planArtifact.header?.subject?.paths ?? [];
      const requestedSourceBaseRef = typeof planArtifact.baseRef === "string" && planArtifact.baseRef.trim().length > 0
        ? planArtifact.baseRef.trim()
        : typeof planArtifact.header?.subject?.commit === "string" && planArtifact.header.subject.commit.trim().length > 0
          ? planArtifact.header.subject.commit.trim()
          : "HEAD";
      const sourceStateBefore = await captureRepositorySourceState({
        repoRoot: execRoot,
        baseRef: requestedSourceBaseRef,
        paths: sourcePaths,
      });
      const executionResult = await executeVerificationRun(
        {
          verificationPlan: planArtifact,
          verificationPlanRef: planRef,
          workOrderRef,
          header,
          runner: {
            capabilityId: VERIFY_CAPABILITY_ID,
            version: VERIFY_CAPABILITY_VERSION,
          },
          generatedAt,
        },
        {
          cwd: execRoot,
          commandTimeoutMs: Number.isFinite(commandTimeoutFlag) && commandTimeoutFlag! > 0
            ? commandTimeoutFlag
            : undefined,
          planTimeoutMs: Number.isFinite(planTimeoutFlag) && planTimeoutFlag! > 0
            ? planTimeoutFlag
            : undefined,
          maxLogBytes: Number.isFinite(maxLogBytesFlag) && maxLogBytesFlag! > 0
            ? maxLogBytesFlag
            : undefined,
        },
      );

      if (!executionResult.ok) {
        const issuesSummary = executionResult.validationIssues
          .map((issue) => `${issue.reason}: ${issue.command}`)
          .join("; ");

        throw new Error(
          `rekon verify run --execute refused to spawn: ${executionResult.validationIssues.length} invalid command(s) in the plan. ${issuesSummary}`,
        );
      }

      const sourceStateAfter = sourceStateBefore.binding
        ? await captureRepositorySourceState({
            repoRoot: execRoot,
            baseRef: sourceStateBefore.binding.baseRef,
            paths: sourcePaths,
          })
        : { issues: [] };
      const runSourceState = createVerificationRunSourceState({
        before: sourceStateBefore.binding,
        after: sourceStateAfter.binding,
        issues: [...sourceStateBefore.issues, ...sourceStateAfter.issues],
      });
      const rawVerificationRun = executionResult.verificationRun;
      const boundVerificationRun = createVerificationRun({
        ...rawVerificationRun,
        header: {
          ...rawVerificationRun.header,
          freshness: {
            status: runSourceState.status === "stable"
              ? "fresh"
              : runSourceState.status === "changed"
                ? "stale"
                : "unknown",
            ...(runSourceState.status === "stable"
              ? {}
              : { invalidatedBy: [`source-state-${runSourceState.status}`] }),
          },
          provenance: {
            ...rawVerificationRun.header.provenance,
            notes: [
              ...(rawVerificationRun.header.provenance?.notes ?? []),
              ...(runSourceState.status === "stable" && runSourceState.after
                ? [`Verification commands ran against source state sha256 ${runSourceState.after.digest}.`]
                : [`Verification source state is ${runSourceState.status}; this run cannot prove current source.`]),
            ],
          },
        },
        sourceState: runSourceState,
      });
      const verificationRun = planFile
        ? { ...boundVerificationRun, planFile }
        : boundVerificationRun;
      const ref = await store.write(verificationRun, { category: "actions" });
      let runtimeObservation: {
        artifact: ArtifactRef;
        summary: RuntimeGraphObservationReport["summary"];
        source: RuntimeGraphObservationReport["source"];
        coverage: {
          summary: CoverageParseResult["summary"];
          issues: CoverageParseResult["issues"];
        };
      } | undefined;
      let runtimeObservationError: string | undefined;
      if (coverageFlag.length > 0 && testPathFlag.length > 0) {
        try {
          const parsedCoverage = await readCoverageObservation({
            root: execRoot,
            format: planCoverage?.format ?? "istanbul",
            coveragePath: coverageFlag,
            testPath: testPathFlag,
            targetPaths: planCoverage?.targetPaths,
            isolated: planCoverage?.isolated === true,
            verification: { ref, run: verificationRun },
            commandName: "rekon verify run --execute",
          });
          const observationHeader: ArtifactHeader = {
            artifactType: "RuntimeGraphObservationReport",
            artifactId: `${RUNTIME_GRAPH_OBSERVATION_ARTIFACT_ID_PREFIX}${Date.now()}`,
            schemaVersion: "0.1.0",
            generatedAt: new Date().toISOString(),
            snapshotId: verificationRun.header.snapshotId,
            subject: verificationRun.header.subject,
            producer: { id: "@rekon/cli.verify-run", version: "1.0.0" },
            inputRefs: [ref],
            freshness: { status: "fresh" },
            provenance: {
              confidence: 0.9,
              notes: [
                `${planCoverage?.format === "lcov" ? "LCOV" : "Istanbul"} coverage observed after an explicitly executed VerificationRun.`,
                "Observed execution is context, not assertion coverage.",
              ],
            },
          };
          const observationReport = buildRuntimeGraphObservationReport({
            header: observationHeader,
            executionObservations: parsedCoverage.coverageResult.observation
              ? [parsedCoverage.coverageResult.observation]
              : [],
            coverageSources: [parsedCoverage.coverageSource],
          });
          const observationRef = await store.write(observationReport, { category: "graphs" });
          runtimeObservation = {
            artifact: observationRef,
            summary: observationReport.summary,
            source: observationReport.source,
            coverage: {
              summary: parsedCoverage.coverageResult.summary,
              issues: parsedCoverage.coverageResult.issues,
            },
          };
        } catch (cause) {
          runtimeObservationError = cause instanceof Error ? cause.message : String(cause);
        }
      }
      const failureExit = verificationRun.status === "failed"
        || verificationRun.status === "timeout"
        || verificationRun.status === "killed"
        || runSourceState.status === "changed";
      const output = {
        dryRun: false,
        executed: true,
        artifact: ref,
        verificationRun: {
          id: verificationRun.header.artifactId,
          status: verificationRun.status,
          summary: verificationRun.summary,
          startedAt: verificationRun.startedAt,
          endedAt: verificationRun.endedAt,
          durationMs: verificationRun.durationMs,
          sourceState: {
            status: runSourceState.status,
            beforeDigest: runSourceState.before?.digest,
            afterDigest: runSourceState.after?.digest,
            issues: runSourceState.issues,
          },
          commands: verificationRun.commands.map((command) => ({
            id: command.id,
            command: command.command,
            argv: command.argv,
            status: command.status,
            exitCode: command.exitCode,
            signal: command.signal,
            durationMs: command.durationMs,
            timedOut: command.timedOut,
            killed: command.killed,
            stdoutDigest: command.stdoutDigest,
            stderrDigest: command.stderrDigest,
            stdoutExcerpt: command.stdoutExcerpt,
            stderrExcerpt: command.stderrExcerpt,
          })),
        },
        planRef,
        workOrderRef,
        ...(planFile ? { planFile } : {}),
        roots: {
          artifactRoot,
          execRoot,
        },
        safety: executionResult.safety,
        warnings: [
          ...resolveWarnings,
          ...executionResult.safety.warnings,
          ...runSourceState.issues,
          ...(runSourceState.status === "changed"
            ? ["Source state changed while verification commands executed; rerun against the final source state."]
            : []),
          ...(runtimeObservationError ? [`Runtime observation failed: ${runtimeObservationError}`] : []),
        ],
        ...(runtimeObservation ? { runtimeObservation } : {}),
        ...(runtimeObservationError ? { runtimeObservationError } : {}),
        message: runSourceState.status === "changed"
          ? "Verification commands executed, but source changed during the run. Rerun verification against the final source state."
          : failureExit
            ? "Verification commands executed; one or more failed/timed out/killed. No findings were auto-resolved."
            : "Verification commands executed. No findings were auto-resolved.",
      };

      if (json) {
        writeOutput(output, json);
      } else {
        writeOutput(renderVerifyRunExecuteHuman(output), false);
      }

      if (failureExit || runtimeObservationError) {
        process.exitCode = 1;
      }

      return;
    }

    // ----- dry-run path -----
    const header: ArtifactHeader = {
      artifactType: "VerificationRun",
      artifactId: `verification-run-${Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      supersession: { key: `verification-run:${planRef.id}` },
      snapshotId: planArtifact.header?.snapshotId,
      subject: {
        repoId,
        ref: planArtifact.header?.subject?.ref,
        commit: planArtifact.header?.subject?.commit,
        paths: planArtifact.header?.subject?.paths,
        systems: planArtifact.header?.subject?.systems,
      },
      producer: {
        id: VERIFY_CAPABILITY_ID,
        version: VERIFY_CAPABILITY_VERSION,
      },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: {
        confidence: 0.95,
        notes: [
          "Planned-but-not-run VerificationRun produced by `rekon verify run --dry-run`.",
          "No commands were executed.",
          ...(planFile
            ? [
                `VerificationPlan was read from unregistered plan file ${planFile.path}.`,
                `Plan file sha256: ${planFile.sha256}.`,
              ]
            : []),
        ],
      },
    };

    const dryRunResult = createVerificationRunDryRun({
      verificationPlan: planArtifact,
      verificationPlanRef: planRef,
      workOrderRef,
      header,
      runner: {
        capabilityId: VERIFY_CAPABILITY_ID,
        version: VERIFY_CAPABILITY_VERSION,
      },
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        envPolicy: "scrubbed",
      },
      generatedAt,
    });

    const warnings: string[] = [...resolveWarnings];

    if (!dryRunResult.ok) {
      const issuesSummary = dryRunResult.validationIssues
        .map((issue) => `${issue.reason}: ${issue.command}`)
        .join("; ");

      throw new Error(
        `rekon verify run --dry-run refused to write a VerificationRun: ${dryRunResult.validationIssues.length} invalid command(s) in the plan. ${issuesSummary}`,
      );
    }

    const verificationRun = planFile
      ? { ...dryRunResult.verificationRun, planFile }
      : dryRunResult.verificationRun;
    const ref = await store.write(verificationRun, { category: "actions" });

    const output = {
      dryRun: true,
      executed: false,
      artifact: ref,
      verificationRun: {
        id: verificationRun.header.artifactId,
        status: verificationRun.status,
        summary: verificationRun.summary,
        commands: verificationRun.commands.map((command) => ({
          id: command.id,
          command: command.command,
          status: command.status,
          argv: command.argv,
        })),
      },
      planRef,
      workOrderRef,
      ...(planFile ? { planFile } : {}),
      roots: {
        artifactRoot,
        execRoot,
      },
      safety: dryRunResult.safety,
      validationIssues: dryRunResult.validationIssues,
      warnings,
      message: "Dry run only. No commands were executed.",
    };

    if (json) {
      writeOutput(output, json);
    } else {
      writeOutput(renderVerifyRunDryRunHuman(output), false);
    }

    return;
  }

  if (command === "verify" && subcommand === "result" && positional === "from-run") {
    // `rekon verify result from-run --run <id|type:id>` derives
    // a concise VerificationResult proof summary from a completed
    // VerificationRun. **Does not execute commands.** Refuses
    // dry-run / not-run runs by default; pass `--allow-not-run`
    // to override (rare).
    const runFlag = typeof parsed.flags.run === "string" ? parsed.flags.run : undefined;
    const artifactRootFlag = typeof parsed.flags["artifact-root"] === "string" ? parsed.flags["artifact-root"] : undefined;
    const allowNotRun = Boolean(parsed.flags["allow-not-run"]);

    if (!runFlag) {
      throw new Error("rekon verify result from-run requires --run <id|type:id>.");
    }

    const artifactRoot = resolveFlagPath(root, artifactRootFlag) ?? root;
    const store = createLocalArtifactStore(artifactRoot);
    await store.init();

    const { entry: runEntry, warnings: resolveWarnings } = await resolveVerificationRunEntry(
      store,
      runFlag,
    );
    const runArtifact = (await store.read(runEntry)) as VerificationRunArtifact;
    const runRef: ArtifactRef = {
      type: runEntry.type,
      id: runEntry.id,
      schemaVersion: runEntry.schemaVersion,
    };

    // Look up the linked VerificationPlan (and WorkOrder) so the
    // derived result cites them in inputRefs.
    const planRef = runArtifact.verificationPlanRef;
    let planArtifact: VerificationPlanLike | undefined;

    if (planRef) {
      try {
        planArtifact = (await store.read(planRef)) as VerificationPlanLike;
      } catch {
        // Plan might have been deleted; we still derive from the run.
        planArtifact = undefined;
      }
    }

    const workOrderRef = runArtifact.workOrderRef ?? planArtifact?.workOrderRef;

    let derived;

    try {
      derived = deriveVerificationResultFromRun(
        {
          verificationRun: runArtifact,
          verificationRunRef: runRef,
          verificationPlan: planArtifact,
          verificationPlanRef: planRef,
          workOrderRef,
        },
        { allowNotRun },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`rekon verify result from-run refused: ${message}`);
    }

    const ref = await store.write(derived.verificationResult, { category: "actions" });

    const output = {
      derivedFromRun: true,
      artifact: ref,
      verificationResult: {
        id: derived.verificationResult.header.artifactId,
        status: derived.verificationResult.status,
        summary: derived.verificationResult.summary,
        recordedBy: derived.verificationResult.recordedBy,
        sourceStateDigest: derived.verificationResult.sourceState?.digest,
        commandResults: derived.verificationResult.commandResults,
      },
      runRef,
      planRef,
      workOrderRef,
      warnings: [...resolveWarnings, ...derived.warnings],
      message:
        "VerificationResult derived from VerificationRun. No commands were re-run. "
          + "No findings were auto-resolved.",
    };

    if (json) {
      writeOutput(output, json);
    } else {
      writeOutput(renderVerifyResultFromRunHuman(output), false);
    }

    return;
  }

  if (command === "verify" && subcommand === "github-workflow" && positional === "validate") {
    // `rekon verify github-workflow validate --path <file>
    // [--json]`
    //
    // **Read-only static validator** for copied GitHub Actions
    // workflow files. The helper reads the file, runs a set of
    // text-based safety checks against the alpha workflow
    // contract pinned by
    // docs/strategy/verification-runner-ci-github-decision.md,
    // and exits non-zero when any error-severity issue is
    // present. It never spawns a process, calls the GitHub API,
    // or writes artifacts.
    const pathFlag = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;

    if (!pathFlag) {
      throw new Error("rekon verify github-workflow validate requires --path <workflow.yml>.");
    }

    const absolutePath = isAbsolute(pathFlag) ? pathFlag : resolve(root, pathFlag);
    let content: string;

    try {
      content = await readFile(absolutePath, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`rekon verify github-workflow validate could not read ${pathFlag}: ${message}`);
    }

    const profileFlag = typeof parsed.flags.profile === "string"
      ? parsed.flags.profile
      : "read-only";
    if (
      profileFlag !== "read-only"
      && profileFlag !== "github-check-send"
      && profileFlag !== "github-pr-comment-send"
    ) {
      throw new Error(
        `rekon verify github-workflow validate --profile must be \`read-only\`, \`github-check-send\`, or \`github-pr-comment-send\` (received \`${profileFlag}\`).`,
      );
    }

    const report = validateGitHubWorkflowSafety({
      path: pathFlag,
      content,
      profile: profileFlag,
    });

    if (json) {
      writeOutput(report, json);
    } else {
      writeOutput(renderGitHubWorkflowSafetyHuman(report), false);
    }

    if (!report.valid) {
      process.exitCode = 1;
    }

    return;
  }

  if (command === "verify" && subcommand === "record") {
    const planFlag = typeof parsed.flags.plan === "string" ? parsed.flags.plan : undefined;
    const resultJsonFlag = typeof parsed.flags["result-json"] === "string" ? parsed.flags["result-json"] : undefined;

    if (!resultJsonFlag) {
      throw new Error("rekon verify record requires --result-json <json>.");
    }

    let parsedResult: unknown;

    try {
      parsedResult = JSON.parse(resultJsonFlag);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`rekon verify record --result-json is not valid JSON: ${message}`);
    }

    if (!parsedResult || typeof parsedResult !== "object") {
      throw new Error("rekon verify record --result-json must be a JSON object.");
    }

    const resultObject = parsedResult as {
      recordedBy?: unknown;
      evidenceNotes?: unknown;
      commands?: unknown;
    };
    const commands = parseCommandResults(resultObject.commands);
    const recordedBy = typeof resultObject.recordedBy === "string" && resultObject.recordedBy.length > 0
      ? resultObject.recordedBy
      : "operator";
    const evidenceNotes = parseStringArray(resultObject.evidenceNotes);

    const store = createLocalArtifactStore(root);
    await store.init();

    const { entry, warnings } = await resolveVerificationPlanEntry(store, planFlag);
    const planArtifact = await store.read(entry) as VerificationPlanLike;
    const planRef = {
      type: entry.type,
      id: entry.id,
      schemaVersion: entry.schemaVersion,
    };
    const verificationResult = createVerificationResult({
      verificationPlan: planArtifact,
      verificationPlanRef: planRef,
      commandResults: commands,
      evidenceNotes,
      recordedBy,
    });
    const ref = await store.write(verificationResult, { category: "actions" });

    writeOutput(
      {
        artifact: ref,
        status: verificationResult.status,
        summary: verificationResult.summary,
        commandResults: verificationResult.commandResults,
        warnings,
      },
      json,
    );
    return;
  }

  throw new Error(`Unknown command: ${argv.join(" ")}`);
}

type PlanSemanticNormalizationResult = Awaited<ReturnType<IntentPlanSemanticNormalizationAdapter>>;

/**
 * Build a router-bound semantic-normalization adapter for `intent plan review`
 * (slice 138). Resolves the provider/model from `--llm-provider` / `--llm-model`
 * and the `REKON_LLM_PROVIDER` / `REKON_LLM_MODEL` / `REKON_LLM_ENABLED`
 * environment variables, then routes a bounded `plan.semantic-normalize` task.
 *
 * The OpenAI-compatible provider is registered (slice 139) but self-guards on a
 * missing API key, so with no key the router still only falls back or fails:
 * `auto` returns no phases (the builder warns and uses deterministic parsing);
 * `required` throws (the build rejects and the CLI writes no report); `off`
 * returns no adapter. With a key present and a provider selected the router
 * makes the call; its output is gated by `coercePhaseDrafts` and
 * deterministically re-checked by the actionability evaluator — proposal, not
 * proof. The API key is read here from the environment (never inside
 * capability-model, never stored in repo config). Returns `undefined` for `off`.
 */
/**
 * Resolve Semantic File Understanding context for `rekon intent assess` /
 * `rekon intent plan review` (slice 150). Proposal/context only — reads existing
 * SemanticFileUnderstandingReport artifacts, hashes the current files to detect
 * staleness, and returns a pure SemanticFileContextSelection (or `undefined` when
 * the operator did not request semantic context). Reads only: it never executes
 * commands, never writes source, never creates a WorkOrder / VerificationPlan,
 * never runs Circe, and never becomes proof.
 *
 * `--semantic-context-ref <Type:id>` (repeatable) takes precedence: the named
 * reports ARE the candidate set, and a ref that does not resolve throws so the
 * command fails cleanly. `--semantic-context latest` falls back to every stored
 * SemanticFileUnderstandingReport, path-filtered to `requestedPaths`.
 */
async function resolveSemanticFileContextSelection(input: {
  store: ReturnType<typeof createLocalArtifactStore>;
  root: string;
  requestedPaths: string[];
  mode: string;
  refs: string[];
}): Promise<SemanticFileContextSelection | undefined> {
  const { store, root, requestedPaths, mode, refs } = input;
  const wantLatest = mode === "latest";
  if (!wantLatest && refs.length === 0) return undefined;

  const SEMANTIC_TYPE = "SemanticFileUnderstandingReport";
  const entries = await store.list(SEMANTIC_TYPE);
  const toRef = (entry: (typeof entries)[number]): ArtifactRef => ({
    type: entry.type,
    id: entry.id,
    path: entry.path,
    digest: entry.digest,
    schemaVersion: entry.schemaVersion ?? "0.1.0",
  });

  const candidates: Array<{ report: SemanticFileUnderstandingReportLike; ref?: ArtifactRef }> = [];
  // Explicit refs are the candidate set and are never path-filtered; `latest`
  // considers every stored report and lets selection path-filter by request.
  let selectionRequestedPaths: string[] = requestedPaths;

  if (refs.length > 0) {
    selectionRequestedPaths = [];
    for (const refString of refs) {
      const trimmed = refString.trim();
      if (trimmed.length === 0) continue;
      const wantedId = trimmed.includes(":") ? trimmed.slice(trimmed.indexOf(":") + 1) : trimmed;
      const entry = entries.find((candidate) => candidate.id === wantedId);
      if (!entry) {
        throw new Error(
          `rekon could not resolve --semantic-context-ref ${trimmed}; no ${SEMANTIC_TYPE} with id ${wantedId} was found.`,
        );
      }
      candidates.push({ report: (await store.read(entry)) as SemanticFileUnderstandingReportLike, ref: toRef(entry) });
    }
  } else {
    for (const entry of entries) {
      candidates.push({ report: (await store.read(entry)) as SemanticFileUnderstandingReportLike, ref: toRef(entry) });
    }
  }

  // Current-file hashes for staleness detection (best-effort, read-only).
  const currentFileHashes: Record<string, string> = {};
  for (const candidate of candidates) {
    const path = candidate.report?.file?.path;
    if (typeof path !== "string" || path.length === 0 || currentFileHashes[path] !== undefined) continue;
    try {
      const contents = await readFile(resolve(root, path), "utf8");
      currentFileHashes[path] = createHash("sha256").update(contents).digest("hex");
    } catch {
      // File missing/unreadable → no current hash → no sha-staleness assertion.
    }
  }

  return selectSemanticFileContext({ reports: candidates, requestedPaths: selectionRequestedPaths, currentFileHashes });
}

/**
 * Resolve opt-in TaskContextReport context for `rekon intent assess` / `rekon
 * intent plan review` (slice 171). Reads only: it never executes commands, writes
 * source, creates a WorkOrder / VerificationPlan, runs Circe, or becomes proof.
 *
 * `--task-context-ref <Type:id>` (repeatable) takes precedence: the named reports
 * ARE the candidate set (explicit mode), and a ref that does not resolve throws so
 * the command fails cleanly. `--task-context latest` considers every stored
 * TaskContextReport and selects the single most relevant (latest mode). Returns
 * `undefined` when the operator requested no task context.
 */
async function resolveTaskContextSelection(input: {
  store: ReturnType<typeof createLocalArtifactStore>;
  root: string;
  requestedPaths: string[];
  mode: string;
  refs: string[];
  goal?: string;
  planText?: string;
}): Promise<TaskContextSelection | undefined> {
  const { store, requestedPaths, mode, refs, goal, planText } = input;
  const wantLatest = mode === "latest";
  if (!wantLatest && refs.length === 0) return undefined;

  const TASK_CONTEXT_TYPE = "TaskContextReport";
  const entries = await store.list(TASK_CONTEXT_TYPE);
  const toRef = (entry: (typeof entries)[number]): ArtifactRef => ({
    type: entry.type,
    id: entry.id,
    path: entry.path,
    digest: entry.digest,
    schemaVersion: entry.schemaVersion ?? "0.1.0",
  });

  const candidates: Array<{ report: TaskContextReportLike; ref?: ArtifactRef }> = [];
  let selectionMode: "explicit" | "latest" = "latest";
  if (refs.length > 0) {
    selectionMode = "explicit";
    for (const refString of refs) {
      const trimmed = refString.trim();
      if (trimmed.length === 0) continue;
      const wantedId = trimmed.includes(":") ? trimmed.slice(trimmed.indexOf(":") + 1) : trimmed;
      const entry = entries.find((candidate) => candidate.id === wantedId);
      if (!entry) {
        throw new Error(
          `rekon could not resolve --task-context-ref ${trimmed}; no ${TASK_CONTEXT_TYPE} with id ${wantedId} was found.`,
        );
      }
      candidates.push({ report: (await store.read(entry)) as TaskContextReportLike, ref: toRef(entry) });
    }
  } else {
    for (const entry of entries) {
      candidates.push({ report: (await store.read(entry)) as TaskContextReportLike, ref: toRef(entry) });
    }
  }

  return selectTaskContextReports({
    reports: candidates,
    mode: selectionMode,
    ...(goal !== undefined ? { goal } : {}),
    ...(planText !== undefined ? { planText } : {}),
    requestedPaths,
  });
}

/**
 * Best-effort package.json script command forms used by the semantic quality
 * guard to recognize SUPPORTED verification commands (slice 142). Read-only;
 * returns [] when no package.json or scripts are present. A command like
 * "npm run build" is only "supported" when `build` is a real script.
 */
async function readPackageScriptForms(root: string): Promise<string[]> {
  try {
    const raw = await readFile(resolve(root, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, unknown> };
    const names = pkg.scripts && typeof pkg.scripts === "object" ? Object.keys(pkg.scripts) : [];
    const forms: string[] = [];
    for (const name of names) {
      forms.push(`npm run ${name}`, `pnpm run ${name}`, `pnpm ${name}`, `yarn ${name}`);
      if (name === "test" || name === "start" || name === "stop" || name === "restart") forms.push(`npm ${name}`);
    }
    return forms;
  } catch {
    return [];
  }
}

function createPlanSemanticNormalizationAdapter(
  mode: "off" | "auto" | "required",
  flagProvider: string,
  flagModel: string,
): IntentPlanSemanticNormalizationAdapter | undefined {
  if (mode === "off") return undefined;

  const envProvider =
    typeof process.env.REKON_LLM_PROVIDER === "string" ? process.env.REKON_LLM_PROVIDER.trim() : "";
  const envModel = typeof process.env.REKON_LLM_MODEL === "string" ? process.env.REKON_LLM_MODEL.trim() : "";
  const envEnabled = process.env.REKON_LLM_ENABLED;
  const provider = flagProvider || envProvider;
  const model = flagModel || envModel;
  // The router is "enabled" when REKON_LLM_ENABLED is set OR a provider was
  // explicitly selected (--llm-provider / REKON_LLM_PROVIDER wins). Without
  // either, every route falls back / fails per mode and no provider is called.
  const enabled = envEnabled === "1" || envEnabled === "true" || provider.length > 0;

  // Provider registry. The CLI / orchestration layer is the ONLY place that
  // reads API keys from the environment; capability-model never does. The
  // OpenAI-compatible adapter self-guards on a missing key (clean ok:false and
  // no network), so registering it unconditionally is safe: with no key it
  // routes to a clean fallback (auto) or a clean hard failure (required).
  const providers = [
    createOpenAiLlmProvider({
      id: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      ...(typeof process.env.REKON_LLM_BASE_URL === "string" && process.env.REKON_LLM_BASE_URL.length > 0
        ? { baseUrl: process.env.REKON_LLM_BASE_URL }
        : {}),
      ...(model ? { defaultModel: model } : {}),
    }),
  ];

  const router = new RekonLlmRouter({ config: { enabled }, providers });
  const override: { provider?: string; model?: string; mode: "off" | "auto" | "required" } = { mode };
  if (provider) override.provider = provider;
  if (model) override.model = model;

  return async ({ planText, goal, kind }) => {
    const prompt = [
      "Normalize the following rough software plan into executable phase drafts.",
      'Return ONE JSON object of the shape { "phases": [ ... ] }.',
      "Each phase has: id, order (number), title, kind, objective, deliverables[], acceptanceCriteria[], touchedPaths[], verificationCommands[], evidenceArtifacts[], constraints[], sourceEvidence[].",
      "Rules (a deterministic reviewer re-checks every field against the source and will flag violations):",
      "- Preserve the author's meaning; preserve non-goals and constraints verbatim where possible.",
      "- Do NOT invent touched paths; only list a path stated in the plan or the goal.",
      "- Do NOT invent verification commands; only list a command stated in the plan or a known package script.",
      "- Do NOT invent acceptance criteria.",
      "- If a path, command, or field is implied but not stated, leave it empty so the deterministic reviewer can ask for it.",
      "- Keep missing fields as empty arrays or empty strings.",
      "- Return only source-supported phase drafts.",
      goal ? `Goal: ${goal}` : "",
      kind ? `Kind: ${kind}` : "",
      "Plan:",
      planText,
    ]
      .filter((line) => line.length > 0)
      .join("\n");

    const routed = await router.completeJson(
      { task: "plan.semantic-normalize", schemaName: "IntentPlanSemanticNormalizationResult", prompt },
      override,
    );

    if (!routed.ok) {
      if (mode === "required") {
        throw new Error(
          `Semantic normalization is required but no usable provider result was available (${routed.error}).`,
        );
      }
      return { phases: [] };
    }

    const phases = coercePhaseDrafts(routed.result.data);
    if (!phases) {
      if (mode === "required") {
        throw new Error("Semantic normalization is required but the provider returned no usable phase drafts.");
      }
      return { phases: [] };
    }

    const result: PlanSemanticNormalizationResult = {
      phases: phases as unknown as PlanSemanticNormalizationResult["phases"],
    };
    if (routed.result.provider) result.provider = routed.result.provider;
    if (routed.result.model) result.model = routed.result.model;
    return result;
  };
}

// ---------------------------------------------------------------------------
// Semantic File Understanding scan layer.
//
// `rekon scan` integrates Semantic File Understanding in auto mode when a
// provider is available; `--semantic-files off` is deterministic and never
// calls a provider. The layer reuses the shipped single-file builder and
// router-bound adapter; it executes no commands, writes no source files, and
// generates no embeddings. See docs/strategy/semantic-file-understanding-scan-integration.md.
// ---------------------------------------------------------------------------

const SEMANTIC_SCAN_FILE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
]);
const SEMANTIC_SCAN_EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".git",
  ".rekon",
]);
const SEMANTIC_SCAN_EXCLUDED_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "npm-shrinkwrap.json"]);
const SEMANTIC_SCAN_MAX_BYTES = 262144; // 256 KiB — skip large files conservatively.
const SEMANTIC_SCAN_DEFAULT_FILE_LIMIT = 100;
const SEMANTIC_FILE_DEFAULT_PROVIDER = "openai";
const SEMANTIC_FILE_DEFAULT_MODEL = "gpt-5.6-luna";
const SEMANTIC_DEBT_DEFAULT_MODEL = "gpt-5.6-luna";
const SEMANTIC_DEBT_DEFAULT_EFFORT = "low";
const SEMANTIC_DEBT_ECONOMY_MODEL = "gpt-5.4-nano";
const SEMANTIC_DEBT_ECONOMY_EFFORT = "none";
const SEMANTIC_DEBT_DEFAULT_FILE_LIMIT = 200;
const SEMANTIC_DEBT_EXCLUDED_PREFIXES = [".claude/", ".codex/", ".agents/"] as const;
const SEMANTIC_DEBT_REPORT_ARTIFACT_ID_PREFIX = "semantic-debt-judgment-report-";
const ASSESSMENT_JUDGMENT_DEFAULT_CANDIDATE_LIMIT = 12;
const ASSESSMENT_JUDGMENT_MAX_SOURCE_CHARS = 24000;
const ASSESSMENT_JUDGMENT_REPORT_ARTIFACT_ID_PREFIX = "assessment-judgment-report-";

type SemanticLayerMode = "off" | "auto" | "required";
type SemanticDebtEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

const SEMANTIC_DEBT_EFFORTS = new Set<string>(["none", "low", "medium", "high", "xhigh", "max"]);

function isSemanticLayerMode(value: string): value is SemanticLayerMode {
  return value === "off" || value === "auto" || value === "required";
}

function normalizeSemanticFlagMode(value: unknown, fallback: SemanticLayerMode): SemanticLayerMode {
  if (typeof value === "string" && value.trim().length > 0) {
    const mode = value.trim();
    if (isSemanticLayerMode(mode)) return mode;
    throw new Error("semantic mode must be one of off, auto, required.");
  }
  if (value === true) return "auto";
  return fallback;
}

function normalizeSemanticDebtEffort(value: unknown, source: string): SemanticDebtEffort {
  if (typeof value === "string" && SEMANTIC_DEBT_EFFORTS.has(value.trim())) {
    return value.trim() as SemanticDebtEffort;
  }
  throw new Error(`${source} must be one of none, low, medium, high, xhigh, max.`);
}

function defaultSemanticDebtEffort(model: string): SemanticDebtEffort | undefined {
  if (model === SEMANTIC_DEBT_DEFAULT_MODEL) return SEMANTIC_DEBT_DEFAULT_EFFORT;
  if (model === SEMANTIC_DEBT_ECONOMY_MODEL) return SEMANTIC_DEBT_ECONOMY_EFFORT;
  return undefined;
}

function hasUsableOpenAiKey(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function envDisablesLlm(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "off";
}

/**
 * Conservative recursive file selection for the semantic scan layer. Includes a
 * fixed allow-list of source/config/docs extensions; excludes generated/vendor
 * directories, lockfiles, and files above a conservative byte limit. Binary
 * files are excluded both by the extension allow-list and by a NUL-byte sniff
 * at read time. Returns repo-relative, forward-slash paths, sorted, for
 * deterministic selection.
 */
async function collectSemanticScanCandidates(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(absDir: string): Promise<void> {
    const entries = await readdir(absDir, { withFileTypes: true }).catch(() => []);
    for (const ent of entries) {
      const abs = join(absDir, ent.name);
      if (ent.isDirectory()) {
        if (SEMANTIC_SCAN_EXCLUDED_DIRS.has(ent.name)) continue;
        await walk(abs);
      } else if (ent.isFile()) {
        if (SEMANTIC_SCAN_EXCLUDED_FILES.has(ent.name)) continue;
        const dot = ent.name.lastIndexOf(".");
        const ext = dot >= 0 ? ent.name.slice(dot).toLowerCase() : "";
        if (!SEMANTIC_SCAN_FILE_EXTENSIONS.has(ext)) continue;
        let size = 0;
        try {
          size = (await stat(abs)).size;
        } catch {
          continue;
        }
        if (size > SEMANTIC_SCAN_MAX_BYTES) continue;
        out.push(relative(root, abs).replace(/\\/g, "/"));
      }
    }
  }
  await walk(root);
  out.sort();
  return out;
}

const CAPABILITY_GRAPH_SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".pyi"]);

/**
 * Conservative recursive *source-only* file selection for the
 * CapabilityEvidenceGraph builder (`rekon capability graph build`). Includes only
 * supported code extensions; excludes the same generated/vendor
 * directories, lockfiles, and oversized files as the semantic scan layer.
 * Declaration files (`.d.ts`) are excluded — they expose no runnable symbols.
 * `startDir` lets `--path <dir>` narrow the walk while node ids stay relative to
 * `root` for stable, deterministic identifiers. Read-only; performs no writes.
 */
async function collectCapabilityGraphCandidates(
  root: string,
  agentScratchSegments: ReadonlyArray<string>,
  startDir?: string,
): Promise<string[]> {
  const out: string[] = [];
  const scratchSegments = new Set(agentScratchSegments);
  if (startDir) {
    const requestedSegments = relative(root, startDir).replace(/\\/g, "/").split("/").filter(Boolean);
    if (requestedSegments.some((segment) => scratchSegments.has(segment))) return out;
  }
  async function walk(absDir: string): Promise<void> {
    const entries = await readdir(absDir, { withFileTypes: true }).catch(() => []);
    for (const ent of entries) {
      const abs = join(absDir, ent.name);
      if (ent.isDirectory()) {
        if (SEMANTIC_SCAN_EXCLUDED_DIRS.has(ent.name) || scratchSegments.has(ent.name)) continue;
        await walk(abs);
      } else if (ent.isFile()) {
        if (SEMANTIC_SCAN_EXCLUDED_FILES.has(ent.name)) continue;
        if (ent.name.endsWith(".d.ts")) continue;
        const dot = ent.name.lastIndexOf(".");
        const ext = dot >= 0 ? ent.name.slice(dot).toLowerCase() : "";
        if (!CAPABILITY_GRAPH_SOURCE_EXTENSIONS.has(ext)) continue;
        let size = 0;
        try {
          size = (await stat(abs)).size;
        } catch {
          continue;
        }
        if (size > SEMANTIC_SCAN_MAX_BYTES) continue;
        out.push(relative(root, abs).replace(/\\/g, "/"));
      }
    }
  }
  await walk(startDir ?? root);
  out.sort();
  return out;
}

async function buildRefreshCapabilityEvidenceGraph(
  root: string,
  store: ReturnType<typeof createLocalArtifactStore>,
): Promise<{
  ref: ArtifactRef;
  inputRefs: ArtifactRef[];
  summary: Record<string, number>;
}> {
  await store.init();
  const candidates = await collectCapabilityGraphCandidates(root, await loadAgentScratchSegments(root));
  const files: Array<{ path: string; sha256: string; text: string }> = [];

  for (const candidate of candidates) {
    let selected: { absolutePath: string; relativePath: string };
    try {
      selected = await resolveReadableRepoFile(root, candidate, "rekon refresh capability graph");
    } catch {
      continue;
    }
    let text: string;
    try {
      text = await readFile(selected.absolutePath, "utf8");
    } catch {
      continue;
    }
    if (text.includes("\u0000")) continue;
    files.push({
      path: selected.relativePath,
      sha256: createHash("sha256").update(text).digest("hex"),
      text,
    });
  }

  const currentPaths = new Set(files.map((file) => file.path));
  const latestSemanticByPath = new Map<string, SemanticReportForGraph>();
  const semanticEntries = (await store.list("SemanticFileUnderstandingReport"))
    .sort((left, right) => left.writtenAt.localeCompare(right.writtenAt));
  for (const entry of semanticEntries) {
    const report = await store.read(entry) as SemanticFileUnderstandingReportLike;
    const path = typeof report.file?.path === "string"
      ? report.file.path.replace(/\\/g, "/").replace(/^\.\//, "")
      : "";
    if (
      !path
      || !currentPaths.has(path)
      || report.normalizationTrace?.provenance !== "semantic-llm"
    ) continue;
    latestSemanticByPath.set(path, {
      report,
      ref: {
        type: entry.type,
        id: entry.id,
        path: entry.path,
        digest: entry.digest,
        schemaVersion: entry.schemaVersion,
      },
    });
  }

  const semanticReports = [...latestSemanticByPath.values()];
  const generatedAt = new Date().toISOString();
  const evidenceGraph = await readLatestEvidenceGraphForCapabilityGraph(store);
  const graphInput = {
    root,
    files,
    generatedAt,
    ...(evidenceGraph ? { evidenceGraph } : {}),
    ...(semanticReports.length > 0 ? { semanticFileUnderstandingReports: semanticReports } : {}),
  };
  const graphWithoutEmbeddings = buildCapabilityEvidenceGraph(graphInput);
  const cachedEmbeddingRecords = await readEmbeddingIndexRecords(embeddingCacheDir(root));
  const currentEmbeddingRecords = selectCurrentEmbeddingIndexRecords(
    cachedEmbeddingRecords,
    graphWithoutEmbeddings,
  );
  const embeddingRecords = currentEmbeddingRecords.records;
  const embeddingSearch = embeddingRecords.length > 0
    ? await computeEmbeddingSimilaritiesFromCache(embeddingCacheDir(root), embeddingRecords, {
        topK: GRAPH_EMBEDDING_NEIGHBOR_TOP_K,
        floor: GRAPH_EMBEDDING_NEIGHBOR_FLOOR,
      })
    : undefined;
  const embeddingSimilarities = embeddingSearch?.similarities ?? [];
  const graph = embeddingSimilarities.length > 0
    ? buildCapabilityEvidenceGraph({ ...graphInput, embeddingSimilarities })
    : graphWithoutEmbeddings;
  const ref = await store.write(graph, { category: "graphs" });
  return {
    ref,
    inputRefs: graph.header.inputRefs,
    summary: {
      ...graph.summary,
      semanticFileReports: semanticReports.length,
      embeddingCacheRecords: cachedEmbeddingRecords.length,
      embeddingCacheStaleRecordsIgnored: currentEmbeddingRecords.ignored,
      embeddingSimilarityPairs: embeddingSimilarities.reduce(
        (total, similarity) => total + similarity.neighbors.length,
        0,
      ),
    },
  };
}

function selectCurrentEmbeddingIndexRecords(
  records: readonly EmbeddingIndexRecord[],
  graph: EvidenceGraphForChunks,
): { records: EmbeddingIndexRecord[]; ignored: number } {
  const currentChunkDigests = new Map(
    buildEmbeddingChunks({ graph }).map((chunk) => [chunk.id, chunk.sha256]),
  );
  const current = records.filter((record) =>
    currentChunkDigests.get(record.chunk.id) === record.chunk.sha256,
  );
  return { records: current, ignored: records.length - current.length };
}

async function readLatestEvidenceGraphForCapabilityGraph(
  store: ReturnType<typeof createLocalArtifactStore>,
): Promise<EvidenceGraphForCapabilityGraph | undefined> {
  const entries = await store.list("EvidenceGraph");
  const entry = entries.at(-1);
  if (!entry) return undefined;
  const artifact = await store.read(entry) as { facts?: EvidenceGraphForCapabilityGraph["facts"] };
  if (!Array.isArray(artifact.facts)) return undefined;
  return {
    ref: {
      type: entry.type,
      id: entry.id,
      path: entry.path,
      digest: entry.digest,
      schemaVersion: entry.schemaVersion ?? "0.1.0",
    },
    facts: artifact.facts,
  };
}

// ---------------------------------------------------------------------------
// Embedding Provider / Index v1 (slice 159) — cache I/O + provider resolution.
//
// The cache lives under `.rekon/cache/embeddings` (gitignored): `index.json`
// holds EmbeddingIndexRecord metadata; `vectors/<hash>.json` holds each raw
// vector. Raw vectors are cache/index data, NOT canonical proof artifacts. The
// CLI owns all fs + provider calls; the model package stays pure.
// ---------------------------------------------------------------------------

/** The embeddings cache directory (gitignored): `<root>/.rekon/cache/embeddings`. */
function embeddingCacheDir(root: string): string {
  return join(root, ".rekon", "cache", "embeddings");
}

/** Read the embedding `index.json`; returns [] when absent or unreadable. */
async function readEmbeddingIndexRecords(cacheDir: string): Promise<EmbeddingIndexRecord[]> {
  let raw: string;
  try {
    raw = await readFile(join(cacheDir, "index.json"), "utf8");
  } catch {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    const records = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { records?: unknown }).records)
        ? (parsed as { records: unknown[] }).records
        : [];
    return records.filter(
      (record): record is EmbeddingIndexRecord =>
        Boolean(record)
        && typeof record === "object"
        && typeof (record as EmbeddingIndexRecord).vectorRef === "string"
        && Boolean((record as EmbeddingIndexRecord).chunk)
        && typeof (record as EmbeddingIndexRecord).chunk?.id === "string",
    );
  } catch {
    return [];
  }
}

/** Read one cached vector (`vectors/<hash>.json`); null when absent/invalid. Rejects path traversal. */
async function readEmbeddingVector(cacheDir: string, vectorRef: string): Promise<number[] | null> {
  if (typeof vectorRef !== "string" || vectorRef.length === 0 || vectorRef.includes("..") || isAbsolute(vectorRef)) {
    return null;
  }
  let raw: string;
  try {
    raw = await readFile(join(cacheDir, vectorRef), "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "number")) return parsed as number[];
    return null;
  } catch {
    return null;
  }
}

/**
 * Deterministic, offline embedding for the `mock` provider: hashes each token
 * and sums byte-derived contributions into a fixed-width vector. Texts that
 * share tokens get correlated vectors, so cosine similarity is meaningful in
 * tests with NO network and NO API key.
 */
function deterministicMockEmbedding(text: string, dimensions: number): number[] {
  const dims = Math.max(1, Math.min(dimensions, 256));
  const vector = new Array<number>(dims).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    const digest = createHash("sha256").update(token).digest();
    for (let i = 0; i < dims; i += 1) {
      const byte = digest[i % digest.length] ?? 0;
      vector[i] = (vector[i] ?? 0) + ((byte / 255) * 2 - 1);
    }
  }
  return vector;
}

/**
 * Resolve the embedding provider for a CLI command. `voyage` reads the API key
 * from VOYAGE_API_KEY (env only, never repo config); a missing key returns a
 * clean `ok:false` at `embed()` time — never throws, never a network call.
 * `mock` is an offline deterministic provider for tests (no network, no key).
 */
function resolveEmbeddingProvider(input: {
  providerId: string;
  model: string;
  dimensions: number;
  /**
   * Voyage `input_type` (Embedding Retrieval / Similarity Ranking Decision,
   * slice 164): `"document"` for indexing chunks, `"query"` for query text.
   * The `mock` provider ignores it (deterministic token-hash, no input modes).
   * Defaults to `"document"` (the indexing case).
   */
  inputType?: "document" | "query";
}): RekonEmbeddingProvider {
  if (input.providerId === "mock") {
    const { model, dimensions } = input;
    return {
      id: "mock",
      async embed(embedInput) {
        return {
          ok: true,
          provider: "mock",
          model: embedInput.model ?? model,
          vectors: embedInput.texts.map((text) => deterministicMockEmbedding(text, dimensions)),
        };
      },
    };
  }
  return createVoyageEmbeddingProvider({
    apiKey: process.env.VOYAGE_API_KEY ?? "",
    defaultModel: input.model,
    dimensions: input.dimensions,
    inputType: input.inputType ?? "document",
  });
}

/**
 * Compute nearest-neighbor similarities for the graph builder from CACHED
 * records only (reads cache; never calls a provider, so the graph's
 * `generatedEmbeddings` boundary stays false). Each record becomes a source
 * with up to `topK` neighbors at or above `floor`, in deterministic order.
 */
async function computeEmbeddingSimilaritiesFromCache(
  cacheDir: string,
  records: EmbeddingIndexRecord[],
  options: { topK: number; floor: number },
): Promise<{ similarities: EmbeddingSimilarityForGraph[]; stats: EmbeddingNeighborSearchStats }> {
  const loaded: Array<{ record: EmbeddingIndexRecord; vector: number[] }> = [];
  for (const record of records) {
    const vector = await readEmbeddingVector(cacheDir, record.vectorRef);
    if (vector && vector.length > 0) loaded.push({ record, vector });
  }
  loaded.sort((a, b) => a.record.chunk.id.localeCompare(b.record.chunk.id));
  const loadedById = new Map(loaded.map((entry) => [entry.record.chunk.id, entry]));
  const search = findEmbeddingNeighbors({
    entries: loaded.map(({ record, vector }) => ({
      id: record.chunk.id,
      group: [record.provider, record.model, String(record.dimensions), record.chunk.kind].join("\u0000"),
      vector,
    })),
    topK: options.topK,
    floor: options.floor,
  });
  const similarities: EmbeddingSimilarityForGraph[] = [];
  for (const row of search.neighbors) {
    const source = loadedById.get(row.id);
    if (!source) continue;
    const neighbors = row.neighbors.flatMap((entry) => {
      const candidate = loadedById.get(entry.id);
      return candidate
        ? [{
            chunkId: candidate.record.chunk.id,
            ref: embeddingChunkGraphRef(candidate.record.chunk),
            score: entry.score,
          }]
        : [];
    });
    if (neighbors.length === 0) continue;
    similarities.push({
      source: {
        chunkId: source.record.chunk.id,
        ref: embeddingChunkGraphRef(source.record.chunk),
        ...(source.record.chunk.path ? { path: source.record.chunk.path } : {}),
      },
      neighbors,
      provider: source.record.provider,
      model: source.record.model,
    });
  }
  return { similarities, stats: search.stats };
}

/** First 16 hex of sha256(path) — keeps per-file batch artifact ids unique. */
function semanticScanPathHashSegment(relPath: string): string {
  return createHash("sha256").update(relPath).digest("hex").slice(0, 16);
}

/**
 * Recover the policy-hash segment from a batch-produced artifact id
 * (`<prefix><pathHash>-<policyHash>-<idStamp>`). Single-file ids
 * (`<prefix><idStamp>`) have no policy segment and return "" (never reused by
 * the scan layer, which always rewrites them under its own policy).
 */
function semanticScanPolicyHashFromArtifactId(id: string): string {
  if (!id.startsWith(SEMANTIC_FILE_UNDERSTANDING_REPORT_ARTIFACT_ID_PREFIX)) return "";
  const rest = id.slice(SEMANTIC_FILE_UNDERSTANDING_REPORT_ARTIFACT_ID_PREFIX.length);
  const parts = rest.split("-");
  return parts.length >= 3 ? parts[1] ?? "" : "";
}

/**
 * Shared producer: build ONE SemanticFileUnderstandingReport and persist it.
 * Used by both `rekon semantic file understand --path` (single file) and the
 * `rekon scan --semantic-files` batch layer, so both paths share the same
 * builder, deterministic extraction, provider-output coercion, and write
 * (category `actions`). The builder owns mode logic (auto → deterministic
 * fallback with a warning; required → throw, no report).
 */
async function produceSemanticFileUnderstandingReport(
  store: ReturnType<typeof createLocalArtifactStore>,
  input: Parameters<typeof buildSemanticFileUnderstandingReport>[0],
): Promise<{ ref: ArtifactRef; report: Awaited<ReturnType<typeof buildSemanticFileUnderstandingReport>> }> {
  const report = await buildSemanticFileUnderstandingReport(input);
  const ref = await store.write(report, { category: "actions" });
  return { ref, report };
}

type SemanticScanLayerSummary = {
  mode: "off" | "auto" | "required";
  selected: number;
  written: number;
  reused: number;
  skipped: number;
  failed: number;
  provider?: string;
  model?: string;
  providerAvailable?: boolean;
};

type SemanticScanLayerResult = {
  summary: SemanticScanLayerSummary;
  exitNonZero: boolean;
  artifacts: ArtifactRef[];
  message?: string;
};

/**
 * Run the semantic scan layer for `rekon scan` (mode defaults to `auto`;
 * operator ruling 2026-07-09). `off` returns an all-zero summary and writes
 * nothing (identical to plain scan). `auto` writes a
 * SemanticFileUnderstandingReport per selected file when a provider key is
 * available, and returns a zero-work summary with providerAvailable=false
 * when it is not (the deterministic scan is the whole scan; no per-file
 * fallback reports are written).
 * `required` PREFLIGHTS provider availability and writes nothing (exit
 * non-zero) when no provider/key is present, so it can never partially write
 * reports before failing in the missing-provider case. Hash-based reuse skips
 * files whose latest report already matches the content sha256 AND the
 * provider/model/mode policy.
 */
async function runSemanticScanLayer(input: {
  root: string;
  store: ReturnType<typeof createLocalArtifactStore>;
  mode: "off" | "auto" | "required";
  llmProvider: string;
  llmModel: string;
  fileLimit: number;
  filePath: string;
  changedOnly: boolean;
  explicitlyRequested?: boolean;
}): Promise<SemanticScanLayerResult> {
  const { root, store, mode } = input;
  if (mode === "off") {
    return {
      summary: { mode: "off", selected: 0, written: 0, reused: 0, skipped: 0, failed: 0 },
      exitNonZero: false,
      artifacts: [],
    };
  }

  // Resolve the effective provider/model policy (flags first, then env). The
  // policy participates in the reuse key so switching provider/model forces
  // fresh reports.
  const envProvider = typeof process.env.REKON_LLM_PROVIDER === "string" ? process.env.REKON_LLM_PROVIDER.trim() : "";
  const envModel = typeof process.env.REKON_LLM_MODEL === "string" ? process.env.REKON_LLM_MODEL.trim() : "";
  const providerResolved = input.llmProvider || envProvider || SEMANTIC_FILE_DEFAULT_PROVIDER;
  const modelResolved = input.llmModel || envModel || SEMANTIC_FILE_DEFAULT_MODEL;
  // Enablement is opt-OUT (operator ruling, 2026-07-09): a present key means
  // enabled unless REKON_LLM_ENABLED explicitly disables it.
  const providerAvailable =
    hasUsableOpenAiKey(process.env.OPENAI_API_KEY)
    && !envDisablesLlm(process.env.REKON_LLM_ENABLED);

  // DEFAULTED auto without a provider: the deterministic scan is the whole
  // scan - return an honest zero-work summary instead of writing per-file
  // deterministic fallback reports (artifact noise in the default-on world).
  // An EXPLICIT --semantic-files auto keeps the documented fallback-writing
  // behavior: the user asked for the layer, so it runs and degrades per file.
  if (mode === "auto" && !providerAvailable && !input.explicitlyRequested) {
    return {
      summary: {
        mode,
        selected: 0,
        written: 0,
        reused: 0,
        skipped: 0,
        failed: 0,
        providerAvailable: false,
      },
      exitNonZero: false,
      artifacts: [],
    };
  }

  // required: preflight provider availability BEFORE writing any report.
  if (mode === "required" && !providerAvailable) {
    return {
      summary: {
        mode,
        selected: 0,
        written: 0,
        reused: 0,
        skipped: 0,
        failed: 0,
        providerAvailable: false,
        ...(providerResolved ? { provider: providerResolved } : {}),
        ...(modelResolved ? { model: modelResolved } : {}),
      },
      exitNonZero: true,
      artifacts: [],
      message:
        "Semantic files required, but no LLM provider/key is available; wrote no SemanticFileUnderstandingReport.",
    };
  }

  const adapter = createSemanticFileUnderstandingAdapter(mode, input.llmProvider, input.llmModel);

  // File selection.
  let candidates: string[];
  if (input.filePath.length > 0) {
    // Explicit path bypasses the allow-list / lockfile / size filters, but not
    // the repo-containment guard before any read or provider call.
    const selected = await resolveReadableRepoFile(root, input.filePath, "rekon scan --semantic-files");
    candidates = [selected.relativePath];
  } else {
    candidates = await collectSemanticScanCandidates(root);
  }

  // Prior reports → latest-by-path for hash-based reuse.
  const latestByPath = new Map<string, { sha256: string; id: string; ref: ArtifactRef }>();
  try {
    const priorEntries = await store.list("SemanticFileUnderstandingReport");
    for (const entry of priorEntries) {
      let rep: unknown;
      try {
        rep = await store.read(entry);
      } catch {
        continue;
      }
      const file =
        rep && typeof rep === "object" && "file" in rep && (rep as { file?: unknown }).file
          ? ((rep as { file: unknown }).file as { path?: unknown; sha256?: unknown })
          : undefined;
      const p = file && typeof file.path === "string" ? file.path : undefined;
      const s = file && typeof file.sha256 === "string" ? file.sha256 : undefined;
      if (p && s) {
        latestByPath.set(p, {
          sha256: s,
          id: typeof entry.id === "string" ? entry.id : "",
          ref: {
            type: entry.type,
            id: entry.id,
            path: entry.path,
            digest: entry.digest,
            schemaVersion: entry.schemaVersion,
          },
        });
      }
    }
  } catch {
    // No prior reports — every selected file is new.
  }

  const semanticGeneratedAt = new Date().toISOString();
  const idStamp = String(Date.parse(semanticGeneratedAt) || Date.now());
  const policyHash = createHash("sha256")
    .update(`${mode}\u0000${providerResolved}\u0000${modelResolved}\u0000${SEMANTIC_FILE_UNDERSTANDING_PROMPT_VERSION}`)
    .digest("hex")
    .slice(0, 16);

  let written = 0;
  let reused = 0;
  let failed = 0;
  let skipped = 0;
  let usedProvider: string | undefined;
  let usedModel: string | undefined;
  let requiredHardFail = false;
  const artifactRefs: ArtifactRef[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const budgetUsed = input.changedOnly ? written + failed : written + reused + failed;
    if (budgetUsed >= input.fileLimit) {
      skipped += candidates.length - i;
      break;
    }
    let relPath = candidates[i];
    if (typeof relPath !== "string" || relPath.length === 0) {
      skipped += 1;
      continue;
    }
    let selectedFile: { absolutePath: string; relativePath: string };
    try {
      selectedFile = await resolveReadableRepoFile(root, relPath, "rekon scan --semantic-files");
      relPath = selectedFile.relativePath;
    } catch {
      skipped += 1;
      continue;
    }
    let text: string;
    try {
      text = await readFile(selectedFile.absolutePath, "utf8");
    } catch {
      skipped += 1;
      continue;
    }
    if (text.indexOf("\u0000") !== -1) {
      // Binary file — never send to a provider, never persist.
      skipped += 1;
      continue;
    }
    const sha = createHash("sha256").update(text).digest("hex");
    const prior = latestByPath.get(relPath);
    const fresh =
      prior !== undefined && prior.sha256 === sha && semanticScanPolicyHashFromArtifactId(prior.id) === policyHash;
    if (fresh) {
      reused += 1;
      artifactRefs.push(prior.ref);
      continue;
    }
    const artifactId = `${SEMANTIC_FILE_UNDERSTANDING_REPORT_ARTIFACT_ID_PREFIX}${semanticScanPathHashSegment(
      relPath,
    )}-${policyHash}-${idStamp}`;
    try {
      const { report, ref } = await produceSemanticFileUnderstandingReport(store, {
        filePath: relPath,
        fileText: text,
        fileSha256: sha,
        root,
        semanticMode: mode,
        artifactId,
        generatedAt: semanticGeneratedAt,
        ...(adapter ? { semanticUnderstanding: adapter } : {}),
      });
      written += 1;
      artifactRefs.push(ref);
      if (!usedProvider && typeof report.normalizationTrace.provider === "string") {
        usedProvider = report.normalizationTrace.provider;
      }
      if (!usedModel && typeof report.normalizationTrace.model === "string") {
        usedModel = report.normalizationTrace.model;
      }
    } catch {
      // In `required` mode the builder throws when the provider returns nothing
      // usable; stop to avoid further provider calls and fail the command.
      failed += 1;
      if (mode === "required") {
        requiredHardFail = true;
        break;
      }
    }
  }

  const selected = input.changedOnly ? written + failed : written + reused + failed;
  const provider = usedProvider ?? (providerResolved || undefined);
  const model = usedModel ?? (modelResolved || undefined);
  return {
    summary: {
      mode,
      selected,
      written,
      reused,
      skipped,
      failed,
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
    },
    exitNonZero: requiredHardFail,
    artifacts: artifactRefs,
    ...(requiredHardFail
      ? { message: "Semantic files required, but a provider call returned no usable result; not all files were analyzed." }
      : {}),
  };
}

type SemanticDebtLayerSummary = {
  mode: SemanticLayerMode;
  judged: number;
  filesWithDebt: number;
  reused: number;
  failed: number;
  skipped: number;
  provider?: string;
  model?: string;
  effort?: SemanticDebtEffort;
  providerAvailable?: boolean;
  ineligibleByReason?: Record<string, number>;
};

type SemanticDebtLayerResult = {
  summary: SemanticDebtLayerSummary;
  exitNonZero: boolean;
  artifacts: ArtifactRef[];
  message?: string;
};

function semanticDebtZeroSummary(
  mode: SemanticLayerMode,
  extra: Partial<SemanticDebtLayerSummary> = {},
): SemanticDebtLayerSummary {
  return {
    mode,
    judged: 0,
    filesWithDebt: 0,
    reused: 0,
    failed: 0,
    skipped: 0,
    ...extra,
  };
}

function languageForSemanticDebtPath(relPath: string): string | undefined {
  const lower = relPath.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) {
    return "javascript";
  }
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md")) return "markdown";
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "yaml";
  return undefined;
}

function semanticDebtReusePolicyMatches(
  report: unknown,
  policy: {
    provider: string;
    model: string;
    effort?: SemanticDebtEffort;
    promptVersion: string;
    coercionVersion: string;
  },
): report is SemanticDebtJudgmentReport {
  if (!report || typeof report !== "object" || Array.isArray(report)) return false;
  const candidate = report as {
    policy?: {
      provider?: unknown;
      model?: unknown;
      effort?: unknown;
      promptVersion?: unknown;
      coercionVersion?: unknown;
      eligibilityVersion?: unknown;
    };
  };
  return candidate.policy?.provider === policy.provider
    && candidate.policy?.model === policy.model
    && candidate.policy?.effort === policy.effort
    && candidate.policy?.promptVersion === policy.promptVersion
    && candidate.policy?.coercionVersion === policy.coercionVersion;
}

function semanticDebtEntryMap(report: SemanticDebtJudgmentReport): Map<string, SemanticDebtJudgmentEntry> {
  const out = new Map<string, SemanticDebtJudgmentEntry>();
  for (const entry of report.entries ?? []) {
    if (
      entry
      && entry.verdict !== "failed"
      && typeof entry.path === "string"
      && entry.path.length > 0
    ) {
      out.set(entry.path, entry);
    }
  }
  return out;
}

async function runSemanticDebtLayer(input: {
  root: string;
  store: ReturnType<typeof createLocalArtifactStore>;
  mode: SemanticLayerMode;
  llmProvider: string;
  llmModel: string;
  llmEffort?: SemanticDebtEffort;
  fileLimit: number;
  filePaths?: string[];
}): Promise<SemanticDebtLayerResult> {
  const { root, store, mode } = input;
  if (mode === "off") {
    return { summary: semanticDebtZeroSummary("off"), exitNonZero: false, artifacts: [] };
  }

  const envProvider = typeof process.env.REKON_LLM_PROVIDER === "string" ? process.env.REKON_LLM_PROVIDER.trim() : "";
  const envModel = typeof process.env.REKON_LLM_MODEL === "string" ? process.env.REKON_LLM_MODEL.trim() : "";
  const envDebtModel = typeof process.env.REKON_SEMANTIC_DEBT_MODEL === "string"
    ? process.env.REKON_SEMANTIC_DEBT_MODEL.trim()
    : "";
  const envEffort = typeof process.env.REKON_SEMANTIC_DEBT_EFFORT === "string"
    ? process.env.REKON_SEMANTIC_DEBT_EFFORT.trim()
    : "";
  const providerResolved = input.llmProvider || envProvider || "openai";
  const modelResolved = input.llmModel || envDebtModel || envModel || SEMANTIC_DEBT_DEFAULT_MODEL;
  const effortResolved = input.llmEffort
    ?? (envEffort ? normalizeSemanticDebtEffort(envEffort, "REKON_SEMANTIC_DEBT_EFFORT") : undefined)
    ?? defaultSemanticDebtEffort(modelResolved);
  const providerAvailable =
    hasUsableOpenAiKey(process.env.OPENAI_API_KEY)
    && !envDisablesLlm(process.env.REKON_LLM_ENABLED);
  const providerModelSummary = {
    provider: providerResolved,
    model: modelResolved,
    ...(effortResolved ? { effort: effortResolved } : {}),
    providerAvailable,
  };

  if (!providerAvailable) {
    const summary = semanticDebtZeroSummary(mode, providerModelSummary);
    if (mode === "required") {
      return {
        summary,
        exitNonZero: true,
        artifacts: [],
        message:
          "Semantic debt required, but no LLM provider/key is available; wrote no SemanticDebtJudgmentReport.",
      };
    }
    return { summary, exitNonZero: false, artifacts: [] };
  }

  await store.init();
  const adapter = createSemanticDebtJudgmentAdapter(mode, providerResolved, modelResolved, effortResolved);
  const policy = {
    provider: providerResolved,
    model: modelResolved,
    ...(effortResolved ? { effort: effortResolved } : {}),
    promptVersion: SEMANTIC_DEBT_PROMPT_VERSION,
    coercionVersion: SEMANTIC_DEBT_COERCION_VERSION,
    eligibilityVersion: SEMANTIC_DEBT_ELIGIBILITY_VERSION,
  };

  let priorByPath = new Map<string, SemanticDebtJudgmentEntry>();
  try {
    const priorRefs = await store.list("SemanticDebtJudgmentReport");
    const latest = priorRefs.at(-1);
    if (latest) {
      const prior = await store.read(latest);
      // Eligibility is re-evaluated for every current file before reuse, so a
      // candidate judged with the same prompt/model remains reusable across a
      // stricter eligibility revision. Excluded paths never enter `entries`.
      if (semanticDebtReusePolicyMatches(prior, policy)) {
        priorByPath = semanticDebtEntryMap(prior);
      }
    }
  } catch {
    priorByPath = new Map();
  }

  let candidates: string[];
  if (input.filePaths && input.filePaths.length > 0) {
    const resolvedPaths = await Promise.all(
      input.filePaths.map((filePath) =>
        resolveReadableRepoFile(root, filePath, "rekon scan --semantic-debt")),
    );
    candidates = [...new Set(resolvedPaths.map((file) => file.relativePath))].sort();
  } else {
    candidates = await collectSemanticScanCandidates(root);
  }
  candidates = candidates.filter(
    (relPath) => !SEMANTIC_DEBT_EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix)),
  );
  const entries: SemanticDebtJudgmentEntry[] = [];
  let judged = 0;
  let filesWithDebt = 0;
  let reused = 0;
  let failed = 0;
  let skipped = 0;
  let requiredHardFail = false;
  let usedProvider: string | undefined;
  let usedModel: string | undefined;
  const ineligibleByReason: Record<string, number> = {};

  for (let i = 0; i < candidates.length; i += 1) {
    const relPath = candidates[i] ?? "";
    let selectedFile: { absolutePath: string; relativePath: string };
    try {
      selectedFile = await resolveReadableRepoFile(root, relPath, "rekon scan --semantic-debt");
    } catch {
      skipped += 1;
      continue;
    }

    let text: string;
    try {
      text = await readFile(selectedFile.absolutePath, "utf8");
    } catch {
      skipped += 1;
      continue;
    }

    const eligibility = evaluateSemanticDebtEligibility({ path: selectedFile.relativePath, content: text });
    if (!eligibility.eligible) {
      for (const reason of eligibility.reasons) {
        ineligibleByReason[reason] = (ineligibleByReason[reason] ?? 0) + 1;
      }
      skipped += 1;
      continue;
    }

    const sha256 = createHash("sha256").update(text).digest("hex");
    if (entries.length >= input.fileLimit) {
      skipped += 1;
      continue;
    }
    const prior = priorByPath.get(selectedFile.relativePath);
    if (prior && prior.sha256 === sha256) {
      const reusedEntry: SemanticDebtJudgmentEntry = { ...prior, reused: true };
      entries.push(reusedEntry);
      reused += 1;
      if (reusedEntry.verdict === "debt" && reusedEntry.concerns.some((concern) => concern.included === true)) {
        filesWithDebt += 1;
      }
      continue;
    }

    const result = await adapter({
      filePath: selectedFile.relativePath,
      fileText: text,
      language: languageForSemanticDebtPath(selectedFile.relativePath),
    });

    if (!usedProvider && result.provider) usedProvider = result.provider;
    if (!usedModel && result.model) usedModel = result.model;

    if (!Array.isArray(result.concerns)) {
      failed += 1;
      entries.push({
        path: selectedFile.relativePath,
        sha256,
        verdict: "failed",
        concerns: [],
        reused: false,
        warnings: result.warnings && result.warnings.length > 0 ? result.warnings : ["provider-result-missing-concerns"],
      });
      if (mode === "required") {
        requiredHardFail = true;
        skipped += candidates.length - i - 1;
        break;
      }
      continue;
    }

    const concerns = coerceDebtConcerns(result);
    const verdict = concerns.some((concern) => concern.included) ? "debt" : "clean";
    judged += 1;
    if (verdict === "debt") filesWithDebt += 1;
    entries.push({
      path: selectedFile.relativePath,
      sha256,
      verdict,
      concerns,
      reused: false,
      ...(result.warnings && result.warnings.length > 0 ? { warnings: result.warnings } : {}),
    });
  }

  const generatedAt = new Date().toISOString();
  const report = createSemanticDebtJudgmentReport({
    header: {
      artifactType: "SemanticDebtJudgmentReport",
      artifactId: `${SEMANTIC_DEBT_REPORT_ARTIFACT_ID_PREFIX}${Date.parse(generatedAt) || Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root },
      producer: { id: "@rekon/cli.semantic-debt-judgment", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
      provenance: { confidence: 0.6 },
    },
    schemaVersion: "0.1.0",
    policy: {
      mode: mode === "required" ? "required" : "auto",
      ...policy,
    },
    summary: {
      filesJudged: judged,
      filesWithDebt,
      reused,
      failed,
      skipped,
      ...(Object.keys(ineligibleByReason).length > 0 ? { ineligibleByReason } : {}),
    },
    entries,
    boundaries: {
      executedCommands: false,
      wroteSourceFiles: false,
      createdPreparedIntentPlan: false,
      createdWorkOrder: false,
      createdVerificationPlan: false,
      generatedEmbeddings: false,
      ranCirce: false,
      implementedIntentGo: false,
    },
  });
  const reportRef = await store.write(report, { category: "actions" });

  return {
    summary: {
      mode,
      judged,
      filesWithDebt,
      reused,
      failed,
      skipped,
      provider: usedProvider ?? providerResolved,
      model: usedModel ?? modelResolved,
      ...(effortResolved ? { effort: effortResolved } : {}),
      providerAvailable: true,
      ...(Object.keys(ineligibleByReason).length > 0 ? { ineligibleByReason } : {}),
    },
    exitNonZero: requiredHardFail,
    artifacts: [reportRef],
    ...(requiredHardFail
      ? { message: "Semantic debt required, but a provider call returned no usable result; not all files were judged." }
      : {}),
  };
}

type AssessmentJudgmentLayerSummary = {
  mode: SemanticLayerMode;
  candidates: number;
  selected: number;
  confirmed: number;
  rejected: number;
  insufficientEvidence: number;
  verificationRequired: number;
  failed: number;
  skipped: number;
  provider?: string;
  model?: string;
  providerAvailable?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
};

type AssessmentJudgmentLayerResult = {
  status: "passed" | "failed" | "skipped";
  summary: AssessmentJudgmentLayerSummary;
  exitNonZero: boolean;
  artifacts: ArtifactRef[];
  message?: string;
};

async function runAssessmentJudgmentLayer(input: {
  root: string;
  store: ReturnType<typeof createLocalArtifactStore>;
  mode: SemanticLayerMode;
  llmProvider: string;
  llmModel: string;
  llmEffort?: SemanticDebtEffort;
  maxCandidates?: number;
  maxSourceChars?: number;
}): Promise<AssessmentJudgmentLayerResult> {
  const maxCandidates = input.maxCandidates ?? ASSESSMENT_JUDGMENT_DEFAULT_CANDIDATE_LIMIT;
  const maxSourceChars = input.maxSourceChars ?? ASSESSMENT_JUDGMENT_MAX_SOURCE_CHARS;
  const emptySummary = (extra: Partial<AssessmentJudgmentLayerSummary> = {}): AssessmentJudgmentLayerSummary => ({
    mode: input.mode,
    candidates: 0,
    selected: 0,
    confirmed: 0,
    rejected: 0,
    insufficientEvidence: 0,
    verificationRequired: 0,
    failed: 0,
    skipped: 0,
    ...extra,
  });
  if (input.mode === "off") {
    return { status: "skipped", summary: emptySummary(), exitNonZero: false, artifacts: [] };
  }

  await input.store.init();
  const assessmentEntries = (await input.store.list("AssessmentReport"))
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
  const sourceEntry = assessmentEntries[0];
  if (!sourceEntry) {
    return {
      status: "skipped",
      summary: emptySummary(),
      exitNonZero: false,
      artifacts: [],
      message: "No AssessmentReport was available for independent judgment.",
    };
  }

  const sourceAssessmentRef = toArtifactRef(sourceEntry);
  const sourceReport = await input.store.read(sourceEntry) as AssessmentReport;
  const candidates = sourceReport.assessments.filter((assessment): assessment is Assessment => Boolean(assessment));
  const selected = selectAssessmentJudgmentCandidates(candidates, maxCandidates);

  const envProvider = typeof process.env.REKON_LLM_PROVIDER === "string" ? process.env.REKON_LLM_PROVIDER.trim() : "";
  const envModel = typeof process.env.REKON_LLM_MODEL === "string" ? process.env.REKON_LLM_MODEL.trim() : "";
  const provider = input.llmProvider || envProvider || "openai";
  const model = input.llmModel || envModel || (provider === "openai" ? SEMANTIC_DEBT_DEFAULT_MODEL : "");
  const providerAvailable = !envDisablesLlm(process.env.REKON_LLM_ENABLED)
    && ((provider === "openai" && hasUsableOpenAiKey(process.env.OPENAI_API_KEY))
      || (provider === "anthropic" && hasUsableOpenAiKey(process.env.ANTHROPIC_API_KEY) && model.length > 0));
  const providerSummary = {
    provider,
    ...(model ? { model } : {}),
    providerAvailable,
  };

  if (!providerAvailable) {
    const message = provider === "anthropic" && !model
      ? "Assessment judgment requires an explicit Anthropic model via --llm-model or REKON_LLM_MODEL."
      : `No usable ${provider} provider/key is available for assessment judgment.`;
    return {
      status: input.mode === "required" ? "failed" : "skipped",
      summary: emptySummary({
        candidates: candidates.length,
        selected: selected.length,
        skipped: candidates.length,
        ...providerSummary,
      }),
      exitNonZero: input.mode === "required",
      artifacts: [],
      message,
    };
  }

  const providers = provider === "anthropic"
    ? [createAnthropicLlmProvider({
        id: "anthropic",
        apiKey: process.env.ANTHROPIC_API_KEY,
        ...(typeof process.env.REKON_ANTHROPIC_BASE_URL === "string" && process.env.REKON_ANTHROPIC_BASE_URL.length > 0
          ? { baseUrl: process.env.REKON_ANTHROPIC_BASE_URL }
          : {}),
        defaultModel: model,
      })]
    : [createOpenAiResponsesLlmProvider({
        id: "openai",
        apiKey: process.env.OPENAI_API_KEY,
        ...(typeof process.env.REKON_LLM_BASE_URL === "string" && process.env.REKON_LLM_BASE_URL.length > 0
          ? { baseUrl: process.env.REKON_LLM_BASE_URL }
          : {}),
        defaultModel: model,
      })];
  const router = new RekonLlmRouter({ config: { enabled: true }, providers });
  const judgments: AssessmentJudgment[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let reasoningTokens = 0;
  let hardFailure = false;

  for (let index = 0; index < selected.length; index += 1) {
    const assessment = selected[index]!;
    const sources: AssessmentJudgmentSourceContext[] = [];
    for (const path of [...new Set(assessment.files ?? [])].slice(0, 2)) {
      const source = await readCurrentRepoSource(input.root, path);
      if (source) sources.push(source);
    }
    if (sources.length === 0) {
      judgments.push(judgmentWithoutSource(assessment));
      continue;
    }

    const routed = await router.completeJson({
      task: "policy.assessment-judgment",
      schemaName: "AssessmentJudgmentResult",
      prompt: buildAssessmentJudgmentPrompt({ assessment, sources, maxSourceChars }),
      ...(input.llmEffort ? { effort: input.llmEffort } : {}),
      maxOutputTokens: 1200,
      jsonSchema: ASSESSMENT_JUDGMENT_JSON_SCHEMA,
      metadata: { assessmentId: assessment.id, rootCauseKey: assessment.rootCauseKey },
    }, { provider, model, mode: input.mode });

    if (!routed.ok) {
      judgments.push(coerceAssessmentJudgment({
        assessment,
        sources,
        result: { warnings: [`provider-unavailable:${routed.error}`, ...routed.warnings] },
      }));
      if (input.mode === "required") {
        hardFailure = true;
        break;
      }
      continue;
    }

    inputTokens += routed.result.usage?.inputTokens ?? 0;
    outputTokens += routed.result.usage?.outputTokens ?? 0;
    reasoningTokens += routed.result.usage?.reasoningTokens ?? 0;
    const value = routed.result.data;
    const result: AssessmentJudgmentAdapterResult = value && typeof value === "object" && !Array.isArray(value)
      ? { ...(value as AssessmentJudgmentAdapterResult), warnings: routed.result.warnings }
      : { warnings: ["provider-result-not-an-object", ...(routed.result.warnings ?? [])] };
    const judgment = coerceAssessmentJudgment({ assessment, sources, result });
    judgments.push(judgment);
    if (input.mode === "required" && judgment.verdict === "failed") {
      hardFailure = true;
      break;
    }
  }

  const count = (verdict: AssessmentJudgment["verdict"]): number =>
    judgments.filter((judgment) => judgment.verdict === verdict).length;
  const summary: AssessmentJudgmentLayerSummary = {
    mode: input.mode,
    candidates: candidates.length,
    selected: selected.length,
    confirmed: count("confirmed"),
    rejected: count("rejected"),
    insufficientEvidence: count("insufficient_evidence"),
    verificationRequired: count("verification_required"),
    failed: count("failed"),
    skipped: Math.max(0, candidates.length - judgments.length),
    ...providerSummary,
    ...(inputTokens > 0 ? { inputTokens } : {}),
    ...(outputTokens > 0 ? { outputTokens } : {}),
    ...(reasoningTokens > 0 ? { reasoningTokens } : {}),
  };
  const generatedAt = new Date().toISOString();
  const inputRefsByKey = new Map<string, ArtifactRef>();
  for (const ref of [sourceAssessmentRef, ...selected.flatMap((assessment) => assessment.evidence)]) {
    inputRefsByKey.set(`${ref.type}:${ref.id}:${ref.schemaVersion}`, ref);
  }
  const report: AssessmentJudgmentReport = createAssessmentJudgmentReport({
    header: {
      artifactType: "AssessmentJudgmentReport",
      artifactId: `${ASSESSMENT_JUDGMENT_REPORT_ARTIFACT_ID_PREFIX}${Date.parse(generatedAt) || Date.now()}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: sourceReport.header.subject,
      producer: { id: "@rekon/cli.assessment-judgment", version: "1.0.0" },
      inputRefs: [...inputRefsByKey.values()],
      freshness: { status: hardFailure ? "partial" : "fresh" },
      provenance: { confidence: judgments.length > 0 ? 0.8 : 1 },
    },
    sourceAssessmentRef,
    policy: {
      mode: input.mode === "required" ? "required" : "auto",
      provider,
      model,
      promptVersion: ASSESSMENT_JUDGMENT_PROMPT_VERSION,
      coercionVersion: ASSESSMENT_JUDGMENT_COERCION_VERSION,
      maxCandidates,
      maxSourceChars,
    },
    summary,
    judgments,
  });
  const reportRef = await input.store.write(report, { category: "findings" });

  return {
    status: hardFailure ? "failed" : "passed",
    summary,
    exitNonZero: hardFailure,
    artifacts: [reportRef],
    ...(hardFailure ? { message: "Assessment judgment required, but at least one selected candidate could not be judged." } : {}),
  };
}

/**
 * Build a router-bound semantic file-understanding adapter for
 * `rekon semantic file understand` (slice 144). Mirrors the plan-review semantic
 * adapter: resolves the provider/model from `--llm-provider` / `--llm-model` and
 * the `REKON_LLM_PROVIDER` / `REKON_LLM_MODEL` / `REKON_LLM_ENABLED` env vars,
 * registers the OpenAI-compatible provider (which self-guards on a missing key),
 * and routes a bounded `artifact.summary` task. The adapter NEVER throws and
 * NEVER decides modes: it returns `{}` whenever no usable provider result is
 * available, and `buildSemanticFileUnderstandingReport` owns the auto/required
 * fallback (auto → deterministic-fallback warning; required → throw, no report).
 * Provider output is a proposal; the builder coerces and the deterministic
 * extraction stays authoritative. The API key is read here from the environment
 * (never in capability-model, never stored in repo config). Returns `undefined`
 * for `off`.
 */
function createSemanticFileUnderstandingAdapter(
  mode: "off" | "auto" | "required",
  flagProvider: string,
  flagModel: string,
): SemanticFileUnderstandingAdapter | undefined {
  if (mode === "off") return undefined;

  const envProvider =
    typeof process.env.REKON_LLM_PROVIDER === "string" ? process.env.REKON_LLM_PROVIDER.trim() : "";
  const envModel = typeof process.env.REKON_LLM_MODEL === "string" ? process.env.REKON_LLM_MODEL.trim() : "";
  const provider = flagProvider || envProvider || SEMANTIC_FILE_DEFAULT_PROVIDER;
  const model = flagModel || envModel || SEMANTIC_FILE_DEFAULT_MODEL;
  // Opt-out enablement (operator ruling, 2026-07-09): enabled when a key is
  // present and REKON_LLM_ENABLED is not explicitly off.
  const enabled =
    hasUsableOpenAiKey(process.env.OPENAI_API_KEY)
    && !envDisablesLlm(process.env.REKON_LLM_ENABLED);

  const providerOptions = {
      id: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      ...(typeof process.env.REKON_LLM_BASE_URL === "string" && process.env.REKON_LLM_BASE_URL.length > 0
        ? { baseUrl: process.env.REKON_LLM_BASE_URL }
        : {}),
      ...(model ? { defaultModel: model } : {}),
  };
  const providers = [semanticFileUsesResponsesApi(model)
    ? createOpenAiResponsesLlmProvider(providerOptions)
    : createOpenAiLlmProvider(providerOptions)];

  const router = new RekonLlmRouter({ config: { enabled }, providers });
  const override: { provider?: string; model?: string; mode: "off" | "auto" | "required" } = { mode };
  if (provider) override.provider = provider;
  if (model) override.model = model;

  return async ({ filePath, fileText, language }) => {
    const prompt = buildSemanticFileUnderstandingPrompt({
      filePath,
      fileText,
      language,
      errorControlFlow: extractErrorControlFlowEvidence({ path: filePath, content: fileText }),
      optionPropagation: extractOptionPropagationEvidence({ path: filePath, content: fileText }),
      scopeResolution: extractScopeResolutionEvidence({ path: filePath, content: fileText }),
    });

    const routed = await router.completeJson(
      {
        task: "artifact.summary",
        schemaName: "SemanticFileUnderstandingResult",
        prompt,
        maxOutputTokens: 2000,
        jsonSchema: SEMANTIC_FILE_UNDERSTANDING_JSON_SCHEMA,
        ...(semanticFileUsesResponsesApi(model) ? { effort: "low" as const } : {}),
      },
      override,
    );

    if (!routed.ok) {
      return {
        provider: routed.route.provider,
        model: routed.route.model,
        warnings: [`${routed.error}`, ...routed.warnings],
      };
    }

    const data = routed.result.data;
    const base: SemanticFileUnderstandingAdapterResult =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as SemanticFileUnderstandingAdapterResult)
        : {};
    const result: SemanticFileUnderstandingAdapterResult = { ...base };
    if (routed.result.provider) result.provider = routed.result.provider;
    if (routed.result.model) result.model = routed.result.model;
    return result;
  };
}

function semanticFileUsesResponsesApi(model: string): boolean {
  return /^gpt-5(?:[.\-]|$)/i.test(model);
}

function createSemanticDebtJudgmentAdapter(
  mode: SemanticLayerMode,
  flagProvider: string,
  flagModel: string,
  effort?: SemanticDebtEffort,
): SemanticDebtJudgmentAdapter {
  const envProvider =
    typeof process.env.REKON_LLM_PROVIDER === "string" ? process.env.REKON_LLM_PROVIDER.trim() : "";
  const envModel = typeof process.env.REKON_LLM_MODEL === "string" ? process.env.REKON_LLM_MODEL.trim() : "";
  const provider = flagProvider || envProvider || "openai";
  const model = flagModel || envModel || SEMANTIC_DEBT_DEFAULT_MODEL;
  const enabled =
    hasUsableOpenAiKey(process.env.OPENAI_API_KEY)
    && !envDisablesLlm(process.env.REKON_LLM_ENABLED);

  const providers = [
    createOpenAiResponsesLlmProvider({
      id: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      ...(typeof process.env.REKON_LLM_BASE_URL === "string" && process.env.REKON_LLM_BASE_URL.length > 0
        ? { baseUrl: process.env.REKON_LLM_BASE_URL }
        : {}),
      defaultModel: model,
    }),
  ];

  const router = new RekonLlmRouter({ config: { enabled }, providers });
  const override: { provider?: string; model?: string; mode: SemanticLayerMode } = { mode };
  if (provider) override.provider = provider;
  if (model) override.model = model;

  return async ({ filePath, fileText, language }) => {
    const prompt = buildSemanticDebtJudgmentPrompt({ filePath, fileText, language });
    const routed = await router.completeJson(
      {
        task: "policy.debt-judgment",
        schemaName: "SemanticDebtJudgmentResult",
        prompt,
        ...(effort ? { effort } : {}),
        maxOutputTokens: 1200,
        jsonSchema: SEMANTIC_DEBT_JUDGMENT_JSON_SCHEMA,
      },
      override,
    );

    if (!routed.ok) {
      return { warnings: [`provider-unavailable:${routed.error}`] };
    }

    const data = routed.result.data;
    const base: SemanticDebtAdapterResult =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as SemanticDebtAdapterResult)
        : {};
    const result: SemanticDebtAdapterResult = { ...base };
    if (!Array.isArray(result.concerns)) {
      result.warnings = [...(result.warnings ?? []), "provider-result-missing-concerns"];
    }
    if (routed.result.provider) result.provider = routed.result.provider;
    if (routed.result.model) result.model = routed.result.model;
    return result;
  };
}

function parseCommandResults(value: unknown): VerificationCommandResult[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const results: VerificationCommandResult[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const item = candidate as Record<string, unknown>;
    const command = typeof item.command === "string" ? item.command : "";

    if (command.length === 0) {
      continue;
    }

    const statusRaw = typeof item.status === "string" ? item.status : "not-run";
    const status = isVerificationCommandStatus(statusRaw) ? statusRaw : "not-run";
    const result: VerificationCommandResult = { command, status };

    if (typeof item.exitCode === "number" && Number.isFinite(item.exitCode)) {
      result.exitCode = Math.trunc(item.exitCode);
    }

    if (typeof item.durationMs === "number" && Number.isFinite(item.durationMs) && item.durationMs >= 0) {
      result.durationMs = item.durationMs;
    }

    if (typeof item.startedAt === "string" && item.startedAt.length > 0) {
      result.startedAt = item.startedAt;
    }

    if (typeof item.completedAt === "string" && item.completedAt.length > 0) {
      result.completedAt = item.completedAt;
    }

    if (typeof item.stdoutDigest === "string" && item.stdoutDigest.length > 0) {
      result.stdoutDigest = item.stdoutDigest;
    }

    if (typeof item.stderrDigest === "string" && item.stderrDigest.length > 0) {
      result.stderrDigest = item.stderrDigest;
    }

    if (typeof item.notes === "string" && item.notes.length > 0) {
      result.notes = item.notes;
    }

    results.push(result);
  }

  return results;
}

function isVerificationCommandStatus(value: string): value is "passed" | "failed" | "skipped" | "not-run" {
  return value === "passed" || value === "failed" || value === "skipped" || value === "not-run";
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function parseVerificationPlanCoverage(value: unknown): VerificationPlanCoverage | undefined {
  if (value === undefined) return undefined;
  if (!isRecordValue(value)
    || (value.format !== "istanbul" && value.format !== "lcov")
    || (value.framework !== "node" && value.framework !== "vitest" && value.framework !== "jest")
    || (value.provider !== "v8" && value.provider !== "istanbul" && value.provider !== "babel")
    || typeof value.testPath !== "string"
    || value.testPath.length === 0
    || typeof value.coveragePath !== "string"
    || value.coveragePath.length === 0
    || value.isolated !== true) {
    throw new Error("Selected VerificationPlan has malformed isolated coverage metadata.");
  }
  if (value.framework === "vitest" && value.provider === "babel") {
    throw new Error("Selected VerificationPlan uses an unsupported Vitest coverage provider.");
  }
  if (value.framework === "jest" && value.provider === "istanbul") {
    throw new Error("Selected VerificationPlan uses an unsupported Jest coverage provider.");
  }
  if (value.framework === "node"
    && (value.format !== "lcov" || value.provider !== "v8" || value.configPath !== undefined)) {
    throw new Error("Selected VerificationPlan uses malformed Node coverage metadata.");
  }
  if (value.framework !== "node" && value.format !== "istanbul") {
    throw new Error("Selected VerificationPlan uses an unsupported coverage format for its framework.");
  }
  let targetPaths: string[] | undefined;
  if (value.targetPaths !== undefined) {
    if (!Array.isArray(value.targetPaths) || value.targetPaths.length === 0
      || value.targetPaths.some((targetPath) =>
        typeof targetPath !== "string"
        || targetPath.length === 0
        || targetPath.startsWith("/")
        || /^[A-Za-z]:/.test(targetPath)
        || targetPath.includes("\0")
        || targetPath.split("/").some((part) => part === ".."))) {
      throw new Error("Selected VerificationPlan has malformed coverage target paths.");
    }
    targetPaths = [...new Set(value.targetPaths)].sort();
  }
  let configPath: string | undefined;
  if (value.configPath !== undefined) {
    if (typeof value.configPath !== "string"
      || value.configPath.length === 0
      || value.configPath.startsWith("/")
      || /^[A-Za-z]:/.test(value.configPath)
      || value.configPath.includes("\0")
      || value.configPath.split("/").some((part) => part === "..")) {
      throw new Error("Selected VerificationPlan has malformed coverage config path.");
    }
    configPath = value.configPath;
  }
  return {
    format: value.format,
    framework: value.framework,
    provider: value.provider,
    testPath: value.testPath,
    ...(configPath ? { configPath } : {}),
    ...(targetPaths ? { targetPaths } : {}),
    coveragePath: value.coveragePath,
    isolated: true,
  };
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function artifactSupersessionKey(value: unknown, fallback: string): string {
  if (!isRecordValue(value) || !isRecordValue(value.header) || !isRecordValue(value.header.supersession)) {
    return fallback;
  }
  const key = value.header.supersession.key;
  return typeof key === "string" && key.length > 0 ? key : fallback;
}

async function resolveVerificationPlanEntry(
  store: ReturnType<typeof createLocalArtifactStore>,
  planFlag: string | undefined,
): Promise<{ entry: ArtifactIndexEntry; warnings: string[] }> {
  const warnings: string[] = [];
  const allPlans = await store.list("VerificationPlan");

  if (allPlans.length === 0) {
    throw new Error("No VerificationPlan artifacts found. Run `rekon intent work-order` or `rekon intent remediation` first.");
  }

  if (!planFlag) {
    const latest = sortByWrittenAtDesc(allPlans)[0];

    if (!latest) {
      throw new Error("No VerificationPlan artifacts found. Run `rekon intent work-order` or `rekon intent remediation` first.");
    }

    warnings.push("No --plan provided; recorded against latest VerificationPlan.");
    return { entry: latest, warnings };
  }

  const [requestedType, requestedId] = planFlag.includes(":")
    ? planFlag.split(":", 2)
    : [undefined, planFlag];
  const match = allPlans.find((candidate) => {
    if (requestedType && requestedType !== candidate.type) {
      return false;
    }

    return candidate.id === requestedId;
  });

  if (!match) {
    const known = allPlans.map((candidate) => candidate.id).slice(0, 10).join(", ");

    throw new Error(`VerificationPlan not found for --plan ${planFlag}. Known plan ids: ${known || "none"}.`);
  }

  return { entry: match, warnings };
}

type VerificationPlanResolution = {
  planArtifact: VerificationPlanLike;
  planRef: ArtifactRef;
  planFile?: {
    path: string;
    sha256: string;
    artifactId: string;
    artifactType: "VerificationPlan";
  };
  warnings: string[];
};

async function readRegisteredVerificationPlan(
  store: ReturnType<typeof createLocalArtifactStore>,
  planFlag: string | undefined,
): Promise<VerificationPlanResolution> {
  const { entry, warnings } = await resolveVerificationPlanEntry(store, planFlag);
  const planArtifact = (await store.read(entry)) as VerificationPlanLike;
  const planRef: ArtifactRef = {
    type: entry.type,
    id: entry.id,
    schemaVersion: entry.schemaVersion,
  };
  return { planArtifact, planRef, warnings };
}

async function readVerificationPlanFile(
  root: string,
  planFileFlag: string,
): Promise<VerificationPlanResolution> {
  const planPath = resolveFlagPath(root, planFileFlag);
  if (!planPath) {
    throw new Error("rekon verify run --plan-file requires a non-empty path.");
  }

  let text: string;
  try {
    text = await readFile(planPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`rekon verify run --plan-file could not read ${planPath}: ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`rekon verify run --plan-file could not parse JSON from ${planPath}: ${message}`);
  }

  const planArtifact = assertVerificationPlanFileArtifact(parsed, planPath);
  const sha256 = createHash("sha256").update(text).digest("hex");
  const schemaVersion = typeof planArtifact.header.schemaVersion === "string"
    ? planArtifact.header.schemaVersion
    : "0.1.0";
  const planRef: ArtifactRef = {
    type: "VerificationPlan",
    id: planArtifact.header.artifactId,
    path: planPath,
    digest: sha256,
    schemaVersion,
  };
  const planFile = {
    path: planPath,
    sha256,
    artifactId: planArtifact.header.artifactId,
    artifactType: "VerificationPlan" as const,
  };
  return {
    planArtifact,
    planRef,
    planFile,
    warnings: ["VerificationPlan was read from --plan-file and was not required to be registered in .rekon/artifacts."],
  };
}

function assertVerificationPlanFileArtifact(value: unknown, planPath: string): VerificationPlanLike {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`rekon verify run --plan-file expected a VerificationPlan object at ${planPath}.`);
  }
  const candidate = value as Partial<VerificationPlanLike>;
  const header = candidate.header as Partial<ArtifactHeader> | undefined;
  if (!header || typeof header !== "object") {
    throw new Error(`rekon verify run --plan-file expected $.header in ${planPath}.`);
  }
  if (header.artifactType !== "VerificationPlan") {
    throw new Error(`rekon verify run --plan-file expected $.header.artifactType to be VerificationPlan in ${planPath}.`);
  }
  if (typeof header.artifactId !== "string" || header.artifactId.length === 0) {
    throw new Error(`rekon verify run --plan-file expected $.header.artifactId to be a non-empty string in ${planPath}.`);
  }
  if (typeof header.schemaVersion !== "string" || header.schemaVersion.length === 0) {
    throw new Error(`rekon verify run --plan-file expected $.header.schemaVersion to be a non-empty string in ${planPath}.`);
  }
  if (candidate.commands !== undefined) {
    if (!Array.isArray(candidate.commands) || !candidate.commands.every((command) => typeof command === "string")) {
      throw new Error(`rekon verify run --plan-file expected $.commands to be an array of strings in ${planPath}.`);
    }
  }
  if (candidate.successCriteria !== undefined) {
    if (!Array.isArray(candidate.successCriteria) || !candidate.successCriteria.every((criterion) => typeof criterion === "string")) {
      throw new Error(`rekon verify run --plan-file expected $.successCriteria to be an array of strings in ${planPath}.`);
    }
  }
  return value as VerificationPlanLike;
}

function resolveFlagPath(root: string, flagValue: string | undefined): string | undefined {
  const trimmed = typeof flagValue === "string" ? flagValue.trim() : "";
  if (trimmed.length === 0) {
    return undefined;
  }
  return isAbsolute(trimmed) ? resolve(trimmed) : resolve(root, trimmed);
}

async function resolveVerificationRunEntry(
  store: ReturnType<typeof createLocalArtifactStore>,
  runFlag: string,
): Promise<{ entry: ArtifactIndexEntry; warnings: string[] }> {
  const warnings: string[] = [];
  const allRuns = await store.list("VerificationRun");

  if (allRuns.length === 0) {
    throw new Error(
      "No VerificationRun artifacts found. Run `rekon verify run --plan <id> --execute` first.",
    );
  }

  const [requestedType, requestedId] = runFlag.includes(":")
    ? runFlag.split(":", 2)
    : [undefined, runFlag];
  const match = allRuns.find((candidate) => {
    if (requestedType && requestedType !== candidate.type) {
      return false;
    }

    return candidate.id === requestedId;
  });

  if (!match) {
    const known = allRuns.map((candidate) => candidate.id).slice(0, 10).join(", ");

    throw new Error(
      `VerificationRun not found for --verification-run ${runFlag}. Known run ids: ${known || "none"}.`,
    );
  }

  return { entry: match, warnings };
}

async function resolveOptionalIngestionVerificationRun(
  store: ReturnType<typeof createLocalArtifactStore>,
  flagValue: string | undefined,
  commandName: string,
  expectedRepoId: string,
): Promise<{ ref: ArtifactRef; run: VerificationRunArtifact } | undefined> {
  const value = flagValue?.trim();
  if (!value) return undefined;

  const { entry } = await resolveVerificationRunEntry(store, value);
  const candidate = await store.read(entry);
  const validation = validateVerificationRun(candidate);
  if (!validation.ok) {
    const detail = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`${commandName} rejected malformed VerificationRun ${entry.id}: ${detail}`);
  }

  const run = candidate as VerificationRunArtifact;
  if (run.header.subject.repoId !== expectedRepoId) {
    throw new Error(
      `${commandName} rejected VerificationRun ${entry.id}: repository subject ${run.header.subject.repoId} `
        + `does not match current EvidenceGraph subject ${expectedRepoId}.`,
    );
  }

  return { ref: toArtifactRef(entry), run };
}

function sortByWrittenAtDesc<T extends { writtenAt: string }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
}

async function resolveReadableRepoFile(
  root: string,
  inputPath: string,
  commandName: string,
  fileKind = "source file",
): Promise<{ absolutePath: string; relativePath: string }> {
  const repoRoot = resolve(root);
  const absolutePath = resolve(repoRoot, inputPath);

  if (!pathIsInside(absolutePath, repoRoot)) {
    throw new Error(`${commandName} refuses to read paths outside --root.`);
  }

  let stats;

  try {
    stats = await lstat(absolutePath);
  } catch {
    throw new Error(`${commandName} could not read the file at ${inputPath}.`);
  }

  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${commandName} requires a regular ${fileKind} inside --root.`);
  }

  let repoRealpath: string;
  let fileRealpath: string;

  try {
    [repoRealpath, fileRealpath] = await Promise.all([realpath(repoRoot), realpath(absolutePath)]);
  } catch {
    throw new Error(`${commandName} could not resolve the file at ${inputPath}.`);
  }

  if (!pathIsInside(fileRealpath, repoRealpath)) {
    throw new Error(`${commandName} refuses to read paths that resolve outside --root.`);
  }

  return {
    absolutePath,
    relativePath: relative(repoRealpath, fileRealpath).replace(/\\/g, "/"),
  };
}

type InstalledPackageManifest = {
  name?: unknown;
  bin?: unknown;
};

async function readInstalledPackageManifest(
  root: string,
  packageName: string,
): Promise<{ manifest: InstalledPackageManifest; manifestPath: string }> {
  const manifestPath = `node_modules/${packageName}/package.json`;
  const manifestFile = await resolveReadableRepoFile(
    root,
    manifestPath,
    "rekon verify coverage plan",
    `${packageName} package manifest`,
  );
  let manifest: unknown;
  try {
    manifest = JSON.parse(await readFile(manifestFile.absolutePath, "utf8"));
  } catch {
    throw new Error(`rekon verify coverage plan could not parse ${manifestPath}.`);
  }
  if (!isRecordValue(manifest) || manifest.name !== packageName) {
    throw new Error(`rekon verify coverage plan expected ${manifestPath} to describe ${packageName}.`);
  }
  return { manifest, manifestPath: manifestFile.absolutePath };
}

async function resolveInstalledTestFrameworkBinary(
  root: string,
  framework: Exclude<IsolatedCoverageFramework, "node">,
): Promise<string> {
  const packageName = framework;
  let installed: { manifest: InstalledPackageManifest; manifestPath: string };
  try {
    installed = await readInstalledPackageManifest(root, packageName);
  } catch {
    throw new Error(
      `rekon verify coverage plan requires ${packageName} to be installed in this repository. `
      + "Rekon does not download test runners during planning or execution.",
    );
  }
  const binValue = installed.manifest.bin;
  const binPath = typeof binValue === "string"
    ? binValue
    : isRecordValue(binValue) && typeof binValue[framework] === "string"
      ? binValue[framework]
      : undefined;
  if (!binPath || isAbsolute(binPath)) {
    throw new Error(`${packageName} does not declare a usable repository-local ${framework} binary.`);
  }
  const packageDirectory = dirname(installed.manifestPath);
  const candidate = resolve(packageDirectory, binPath);
  const [packageRealpath, candidateRealpath] = await Promise.all([
    realpath(packageDirectory),
    realpath(candidate).catch(() => ""),
  ]);
  if (!candidateRealpath || !pathIsInside(candidateRealpath, packageRealpath)) {
    throw new Error(`${packageName} declares a binary outside its installed package directory.`);
  }
  const binary = await resolveReadableRepoFile(
    root,
    candidate,
    "rekon verify coverage plan",
    `${framework} binary`,
  );
  return binary.relativePath;
}

async function installedPackageExists(root: string, packageName: string): Promise<boolean> {
  try {
    await readInstalledPackageManifest(root, packageName);
    return true;
  } catch {
    return false;
  }
}

async function resolveIsolatedCoverageProvider(
  root: string,
  framework: IsolatedCoverageFramework,
  requested: string | undefined,
): Promise<IsolatedCoverageProvider> {
  if (framework === "node") {
    if (requested && requested !== "v8") {
      throw new Error("rekon verify coverage plan supports only the v8 provider with Node.");
    }
    return "v8";
  }
  if (framework === "jest") {
    const provider = requested || "babel";
    if (provider !== "babel" && provider !== "v8") {
      throw new Error("rekon verify coverage plan supports Jest providers babel or v8.");
    }
    return provider;
  }

  if (requested && requested !== "v8" && requested !== "istanbul") {
    throw new Error("rekon verify coverage plan supports Vitest providers v8 or istanbul.");
  }
  const requestedProvider: "v8" | "istanbul" | undefined = requested === "v8" || requested === "istanbul"
    ? requested
    : undefined;
  const candidates: Array<"v8" | "istanbul"> = requestedProvider
    ? [requestedProvider]
    : ["v8", "istanbul"];
  for (const provider of candidates) {
    if (await installedPackageExists(root, `@vitest/coverage-${provider}`)) {
      return provider;
    }
  }
  const expected = requested
    ? `@vitest/coverage-${requested}`
    : "@vitest/coverage-v8 or @vitest/coverage-istanbul";
  throw new Error(
    `rekon verify coverage plan requires ${expected} to be installed. `
    + "Rekon does not accept Vitest's interactive provider installation prompt.",
  );
}

type CoverageParseResult = ReturnType<typeof parseIstanbulCoverage> | ReturnType<typeof parseLcovCoverage>;

type CoverageObservationInput = {
  root: string;
  format: "istanbul" | "lcov";
  coveragePath: string;
  testPath: string;
  targetPaths?: string[];
  isolated?: boolean;
  commandName?: string;
  verification?: {
    ref: ArtifactRef;
    run: VerificationRunArtifact;
  };
};

async function readCoverageObservation(
  input: CoverageObservationInput,
): Promise<{
  coverageResult: CoverageParseResult;
  coverageSource: NonNullable<CoverageParseResult["coverageSource"]>;
}> {
  const commandName = input.commandName ?? "rekon runtime graph observe";
  const coverageFile = await resolveReadableRepoFile(input.root, input.coveragePath, commandName, "coverage file");
  const testFile = await resolveReadableRepoFile(input.root, input.testPath, commandName, "test file");
  const repoRoot = resolve(input.root);
  const repoRealRoot = await realpath(input.root);
  const coverageJson = await readFile(coverageFile.absolutePath, "utf8");
  let coverage: unknown;
  if (input.format === "istanbul") {
    try {
      coverage = JSON.parse(coverageJson);
    } catch {
      throw new Error(`${commandName} could not parse Istanbul coverage JSON at ${coverageFile.relativePath}.`);
    }
  }
  const common = {
    repoRoot,
    coveragePath: coverageFile.relativePath,
    coverageDigest: createHash("sha256").update(coverageJson).digest("hex"),
    testPath: testFile.relativePath,
    targetPaths: input.targetPaths,
    isolated: input.isolated === true,
  };
  const coverageResult: CoverageParseResult = input.format === "lcov"
    ? parseLcovCoverage({ ...common, lcov: coverageJson })
    : parseIstanbulCoverage({ ...common, coverage: normalizeIstanbulCoveragePathAliases(coverage, repoRoot, repoRealRoot) });
  if (!coverageResult.valid || !coverageResult.coverageSource) {
    throw new Error(coverageResult.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message)
      .join(" ") || "Coverage could not be normalized.");
  }

  let coverageSource = coverageResult.coverageSource;
  if (input.verification) {
    const command = input.verification.run.commands.find((candidate) =>
      (candidate.status === "passed" || candidate.status === "failed")
      && candidate.argv.some((argument) => verificationArgumentMatchesPath(
        input.root,
        argument,
        testFile.relativePath,
      )),
    );
    if (!command) {
      throw new Error(
        `${commandName} could not bind coverage to ${input.verification.ref.type}:${input.verification.ref.id}: `
        + `no passed or failed command explicitly named ${testFile.relativePath}.`,
      );
    }
    const startedAt = Date.parse(input.verification.run.startedAt ?? "");
    const coverageStats = await stat(coverageFile.absolutePath);
    if (Number.isFinite(startedAt) && coverageStats.mtimeMs + 1_000 < startedAt) {
      throw new Error(
        `${commandName} refused stale coverage: ${coverageFile.relativePath} predates `
        + `${input.verification.ref.type}:${input.verification.ref.id}.`,
      );
    }
    coverageSource = {
      ...coverageSource,
      verificationRunRef: input.verification.ref,
      commandId: command.id,
      commandStatus: command.status === "passed" ? "passed" : "failed",
    };
  }

  return { coverageResult, coverageSource };
}

function normalizeIstanbulCoveragePathAliases(
  coverage: unknown,
  repoRoot: string,
  repoRealRoot: string,
): unknown {
  if (!isRecordValue(coverage) || repoRoot === repoRealRoot) return coverage;
  const normalizePath = (value: string): string => {
    if (!isAbsolute(value)) return value;
    const relativePath = relative(repoRealRoot, resolve(value));
    if (relativePath === "" || relativePath.startsWith("..") || isAbsolute(relativePath)) return value;
    return resolve(repoRoot, relativePath);
  };
  const normalized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(coverage)) {
    const normalizedKey = normalizePath(key);
    if (isRecordValue(entry) && typeof entry.path === "string") {
      normalized[normalizedKey] = { ...entry, path: normalizePath(entry.path) };
    } else {
      normalized[normalizedKey] = entry;
    }
  }
  return normalized;
}

function verificationArgumentMatchesPath(root: string, argument: string, expectedPath: string): boolean {
  if (!argument || argument.startsWith("-")) return false;
  const absolutePath = resolve(root, argument);
  if (!pathIsInside(absolutePath, root)) return false;
  return relative(resolve(root), absolutePath).replace(/\\/g, "/") === expectedPath;
}

function pathIsInside(path: string, root: string): boolean {
  const relativePath = relative(resolve(root), resolve(path));

  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

type RekonConfig = {
  capabilities?: Array<{ package: string }>;
  permissions?: Record<string, CapabilityPermission[]>;
  rulebook?: {
    rules: Rule[];
  };
  semantic?: {
    mode?: "off" | "auto" | "required";
  };
  agentInstructions?: {
    enabled?: boolean;
    target?: string;
    sync?: "on-refresh" | "manual";
  };
  contracts?: {
    adoption?: {
      allowSourceWrites?: boolean;
      minimumConfidence?: number;
      allowedJudgeModes?: Array<"deterministic" | "agent" | "provider">;
    };
  };
};

function agentInstructionOptions(config: RekonConfig): AgentInstructionsOptions {
  return {
    enabled: config.agentInstructions?.enabled ?? true,
    target: config.agentInstructions?.target ?? "AGENTS.md",
  };
}

const CONFIG_RULEBOOK_PRODUCER_ID = "@rekon/cli.config-rulebook";
const CONFIG_RULEBOOK_SUPERSESSION_KEY = "config:.rekon/config.json:rulebook";

const BUILT_IN_CAPABILITIES: Record<string, CapabilityDefinition> = {
  "@rekon/capability-docs": docsCapability,
  "@rekon/capability-graph": graphCapability,
  "@rekon/capability-intent": intentCapability,
  "@rekon/capability-js-ts": jsTsCapability,
  "@rekon/capability-python": pythonCapability,
  "@rekon/capability-memory": memoryCapability,
  "@rekon/capability-model": modelCapability,
  "@rekon/capability-ontology": ontologyCapability,
  "@rekon/capability-policy": policyCapability,
  "@rekon/capability-reconcile": reconcileCapability,
  "@rekon/capability-resolver": resolverCapability,
};

const DEFAULT_CAPABILITIES = [
  "@rekon/capability-js-ts",
  "@rekon/capability-python",
  "@rekon/capability-model",
  "@rekon/capability-graph",
  "@rekon/capability-policy",
  "@rekon/capability-resolver",
  "@rekon/capability-docs",
  "@rekon/capability-memory",
  "@rekon/capability-intent",
  "@rekon/capability-ontology",
  "@rekon/capability-reconcile",
];

async function createDefaultRuntime(root: string) {
  const config = await readConfig(root);
  const capabilities = await loadConfiguredCapabilities(config);

  return createRuntime({
    repoRoot: root,
    capabilities,
    permissions: config.permissions,
  });
}

async function writeConfigIfMissing(root: string): Promise<void> {
  const configPath = resolve(root, ".rekon", "config.json");
  const defaultConfig = {
    capabilities: DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName })),
    permissions: {},
    agentInstructions: { enabled: true, target: "AGENTS.md", sync: "on-refresh" },
  };

  try {
    const existingConfig = JSON.parse(await readFile(configPath, "utf8")) as { capabilities?: unknown };

    if (!Array.isArray(existingConfig.capabilities) || existingConfig.capabilities.length === 0) {
      await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
    } else {
      const existingCapabilities = existingConfig.capabilities.filter(isCapabilityConfigEntry);
      const existingPackages = new Set(existingCapabilities.map((entry) => entry.package));
      const mergedConfig = {
        ...existingConfig,
        capabilities: [
          ...existingCapabilities,
          ...DEFAULT_CAPABILITIES
            .filter((packageName) => !existingPackages.has(packageName))
            .map((packageName) => ({ package: packageName })),
        ],
        permissions: typeof (existingConfig as RekonConfig).permissions === "object"
          ? (existingConfig as RekonConfig).permissions
          : {},
        agentInstructions: (existingConfig as RekonConfig).agentInstructions ?? defaultConfig.agentInstructions,
      };

      await writeFile(configPath, `${JSON.stringify(mergedConfig, null, 2)}\n`, "utf8");
    }
  } catch {
    await mkdir(resolve(root, ".rekon"), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
  }
}

/**
 * Load `.rekon/config.json` for `rekon findings filter-policy
 * apply`. When the file is missing, returns the default config
 * shape (matching `writeConfigIfMissing`) and reports
 * `configMissing: true` so the caller can warn / dry-run / write
 * as appropriate. Throws when the file exists but is not valid
 * JSON or not a JSON object — those cases must never be
 * silently overwritten.
 */
async function loadConfigForApply(
  root: string,
  configPath: string,
): Promise<{ parsedConfig: Record<string, unknown>; configMissing: boolean }> {
  try {
    const raw = await readFile(configPath, "utf8");
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(raw);
    } catch (parseError) {
      const detail = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(
        `Failed to parse ${configPath}: ${detail}. Refusing to write.`,
      );
    }
    if (!parsedRaw || typeof parsedRaw !== "object" || Array.isArray(parsedRaw)) {
      throw new Error(
        `${configPath} must be a JSON object. Refusing to write.`,
      );
    }
    return { parsedConfig: parsedRaw as Record<string, unknown>, configMissing: false };
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      // Return a synthesized default config so dry-run can show
      // exactly what would be created; the apply path writes it
      // through `writeConfigIfMissing` only when not in dry-run.
      return {
        parsedConfig: {
          capabilities: DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName })),
          permissions: {},
        },
        configMissing: true,
      };
    }
    throw error;
  }
}

function parseFindingFiltersFromConfig(
  config: Record<string, unknown>,
): FindingFilterPolicyRule[] {
  if (!Array.isArray(config.findingFilters)) {
    return [];
  }
  // We accept whatever objects the validator will inspect; the
  // planner only reads `id` / `pathPattern` / `type` etc. and
  // round-trips them as `FindingFilterPolicyRule`. Anything
  // that's not an object is dropped here and will be flagged
  // by `validateFindingFilterPolicyRules` if the on-disk file
  // is malformed in a less obvious way.
  return (config.findingFilters as unknown[])
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
    )
    .map((entry) => entry as unknown as FindingFilterPolicyRule);
}

function buildAppliedConfig(
  parsedConfig: Record<string, unknown>,
  plan: FindingFilterPolicyApplyPlan,
): Record<string, unknown> {
  // Preserve every unrelated top-level field; only the
  // `findingFilters` array changes, and it's rewritten to the
  // planner's `proposedRules` (which already accounts for
  // appended-vs-replaced).
  return {
    ...parsedConfig,
    findingFilters: plan.proposedRules.map((rule) => ({ ...rule })),
  };
}

function formatApplyRefusalMessage(
  blockers: ReadonlyArray<{ code: string; message: string }>,
  suggestionId: string,
): string {
  const lines = blockers.map((blocker) => `- ${blocker.message}`).join("\n");
  return [
    `Refusing to apply suggestion '${suggestionId}' without --force.`,
    "Blocking reason(s):",
    lines,
    "Re-run with --force after reviewing FindingFilterReport evidence, or",
    "preview the proposed change with `--dry-run` / `--preview`.",
  ].join("\n");
}

function isCapabilityConfigEntry(value: unknown): value is { package: string } {
  return Boolean(
    value &&
    typeof value === "object" &&
    "package" in value &&
    typeof value.package === "string" &&
    value.package.length > 0,
  );
}

function capabilityPackageSpecifierIssue(packageName: string): string | undefined {
  const specifier = packageName.trim();

  if (specifier.length === 0) {
    return "capability package specifier must not be empty.";
  }

  if (specifier !== packageName) {
    return "capability package specifier must not contain leading or trailing whitespace.";
  }

  if (
    specifier.startsWith(".")
    || specifier.startsWith("/")
    || specifier.startsWith("~")
    || specifier.includes("\\")
    || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(specifier)
    || specifier.split("/").includes("..")
  ) {
    return "capability package specifier must be an installed npm package name, not a file URL or filesystem path.";
  }

  const packageNamePattern = /^(?:[a-z0-9][a-z0-9._~-]*|@[a-z0-9][a-z0-9._~-]*\/[a-z0-9][a-z0-9._~-]*)$/;

  if (!packageNamePattern.test(specifier)) {
    return "capability package specifier must be a normalized npm package name.";
  }

  return undefined;
}

async function readConfig(root: string): Promise<RekonConfig> {
  const configPath = resolve(root, ".rekon", "config.json");

  try {
    const parsed = JSON.parse(await readFile(configPath, "utf8")) as RekonConfig;

    return {
      capabilities: Array.isArray(parsed.capabilities) && parsed.capabilities.length > 0
        ? parsed.capabilities
        : DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName })),
      permissions: parsed.permissions ?? {},
      ...(parsed.semantic ? { semantic: parsed.semantic } : {}),
      ...(parsed.agentInstructions ? { agentInstructions: parsed.agentInstructions } : {}),
      ...(parsed.contracts ? { contracts: parsed.contracts } : {}),
    };
  } catch {
    return {
      capabilities: DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName })),
      permissions: {},
      agentInstructions: { enabled: true, target: "AGENTS.md", sync: "on-refresh" },
    };
  }
}

type ConfigRulebookSyncResult = {
  configured: boolean;
  changed: boolean;
  ruleCount: number;
  ref?: ArtifactRef;
};

async function syncConfiguredRulebook(
  root: string,
  store: ReturnType<typeof createLocalArtifactStore>,
): Promise<ConfigRulebookSyncResult> {
  const configPath = resolve(root, ".rekon", "config.json");
  let parsed: Record<string, unknown> | undefined;
  try {
    const value = JSON.parse(await readFile(configPath, "utf8")) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${configPath} must be a JSON object.`);
    }
    parsed = value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      parsed = undefined;
    } else {
      throw error;
    }
  }

  const configured = parsed ? Object.prototype.hasOwnProperty.call(parsed, "rulebook") : false;
  const validation = validateConfiguredRulebook(parsed?.rulebook);
  if (validation.issues.length > 0) {
    throw new Error(
      `Invalid .rekon/config.json rulebook: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
    );
  }

  await store.init();
  const priorEntry = (await store.list("Rulebook"))
    .filter((entry) => entry.supersessionKey === CONFIG_RULEBOOK_SUPERSESSION_KEY)
    .sort((left, right) => left.writtenAt.localeCompare(right.writtenAt))
    .at(-1);

  if (!configured && !priorEntry) {
    return { configured: false, changed: false, ruleCount: 0 };
  }

  const normalizationHeader: ArtifactHeader = {
    artifactType: "Rulebook",
    artifactId: "configured-rulebook-normalization",
    schemaVersion: "0.1.0",
    generatedAt: "1970-01-01T00:00:00.000Z",
    subject: { repoId: root },
    producer: { id: CONFIG_RULEBOOK_PRODUCER_ID, version: "1.0.0" },
    inputRefs: [],
  };
  const rules = createRulebook({
    header: normalizationHeader,
    rules: validation.rules ?? [],
  }).rules;
  const rulesDigest = createHash("sha256").update(JSON.stringify(rules)).digest("hex");

  if (priorEntry) {
    const priorValidation = validateRulebook(await store.read(priorEntry));
    if (priorValidation.ok && JSON.stringify(priorValidation.value.rules) === JSON.stringify(rules)) {
      return {
        configured,
        changed: false,
        ruleCount: rules.length,
        ref: {
          type: priorEntry.type,
          id: priorEntry.id,
          path: priorEntry.path,
          digest: priorEntry.digest,
          schemaVersion: priorEntry.schemaVersion,
        },
      };
    }
  }

  const generatedAt = new Date().toISOString();
  const rulebook: Rulebook = createRulebook({
    header: {
      artifactType: "Rulebook",
      artifactId: `configured-rulebook-${Date.now()}-${rulesDigest.slice(0, 12)}`,
      schemaVersion: "0.1.0",
      generatedAt,
      supersession: { key: CONFIG_RULEBOOK_SUPERSESSION_KEY },
      subject: { repoId: root },
      producer: { id: CONFIG_RULEBOOK_PRODUCER_ID, version: "1.0.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
      provenance: {
        confidence: 1,
        notes: [
          "Projected from .rekon/config.json rulebook; repository config remains the declared-law source.",
          `rules-sha256:${rulesDigest}`,
        ],
      },
    },
    rules,
  });
  const ref = await store.write(rulebook);
  return { configured, changed: true, ruleCount: rules.length, ref };
}

async function resolveScanSemanticFilesMode(
  root: string,
  flags: Record<string, string | boolean | string[]>,
): Promise<SemanticLayerMode> {
  const invalidModeMessage =
    "rekon scan semantic mode must be one of off, auto, required (via --semantic-files, --no-semantic, REKON_SEMANTIC, or config semantic.mode).";

  if (flags["no-semantic"] === true) return "off";

  if (flags["semantic-files"] !== undefined) {
    try {
      return normalizeSemanticFlagMode(flags["semantic-files"], "auto");
    } catch {
      throw new Error(invalidModeMessage);
    }
  }

  const envMode = typeof process.env.REKON_SEMANTIC === "string" ? process.env.REKON_SEMANTIC.trim() : "";
  if (envMode.length > 0) {
    if (!isSemanticLayerMode(envMode)) {
      throw new Error(invalidModeMessage);
    }
    return envMode;
  }

  const config = await readConfig(root);
  const configMode = config.semantic?.mode;
  if (typeof configMode === "string") {
    if (!isSemanticLayerMode(configMode)) {
      throw new Error(invalidModeMessage);
    }
    return configMode;
  }

  return "auto";
}

function resolveScanSemanticDebtMode(
  flags: Record<string, string | boolean | string[]>,
  resolvedSemanticFilesMode: SemanticLayerMode,
): SemanticLayerMode {
  if (flags["no-semantic"] === true) return "off";
  if (flags["semantic-debt"] === undefined) return resolvedSemanticFilesMode;
  try {
    return normalizeSemanticFlagMode(flags["semantic-debt"], "auto");
  } catch {
    throw new Error("rekon scan --semantic-debt must be one of off, auto, required.");
  }
}

async function loadConfiguredCapabilities(config: RekonConfig): Promise<CapabilityDefinition[]> {
  const entries = config.capabilities ?? DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName }));

  return Promise.all(entries.map(async (entry) => {
    const packageName = entry.package;
    const builtIn = BUILT_IN_CAPABILITIES[packageName];

    if (builtIn) {
      return builtIn;
    }

    const specifierIssue = capabilityPackageSpecifierIssue(packageName);

    if (specifierIssue) {
      throw new Error(`Refusing unsafe Rekon capability package '${packageName}': ${specifierIssue}`);
    }

    try {
      const loaded = await import(packageName) as { default?: CapabilityDefinition };

      if (!loaded.default) {
        throw new Error(`Package ${packageName} does not export a default capability.`);
      }

      return loaded.default;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to load Rekon capability ${packageName}: ${message}`);
    }
  }));
}

type RefreshStepId =
  | "init"
  | "config.validate"
  | "observe"
  | "capability.graph"
  | "project"
  | "contracts.reconcile"
  | "rulebook"
  | "snapshot"
  | "evaluate"
  | "assessments.judge"
  | "evaluate.finalize"
  | "findings.filter"
  | "findings.filter-health"
  | "findings.lifecycle"
  | "issues.adjudicate"
  | "coherency.delta"
  | "memory.curate"
  | "publish.guidance"
  | "publish.architecture"
  | "publish.proof"
  | "publish.agent-contract"
  | "agent-instructions.sync"
  | "artifacts.validate"
  | "artifacts.freshness"
  | "proof-gate.preaccept"
  | "proof-gate.revalidate"
  | "outcome.record";

type RefreshStep = {
  id: RefreshStepId;
  status: "passed" | "failed" | "skipped";
  artifacts?: ArtifactRef[];
  summary?: unknown;
  issues?: unknown[];
  message?: string;
};

type RefreshResult = {
  root: string;
  startedAt: string;
  completedAt: string;
  status: "passed" | "failed" | "partial";
  steps: RefreshStep[];
  validation?: { valid: boolean; issues: unknown[] };
  freshness?: {
    status: ArtifactFreshnessStatus;
    issues: unknown[];
    latestMajor: Array<{ type: string; id: string; status: ArtifactFreshnessStatus }>;
  };
  artifacts: ArtifactRef[];
  missing: string[];
};

type RefreshOptions = {
  skipPublish?: boolean;
  skipFreshness?: boolean;
  changedFiles?: string[];
  seedArtifactRefs?: ArtifactRef[];
  proofGate?: ValidatedProofGateForRefresh;
  syncAgentInstructions?: boolean;
  afterEvaluate?: () => Promise<{
    status: "passed" | "failed" | "skipped";
    artifacts?: ArtifactRef[];
    summary?: unknown;
    message?: string;
  }>;
};

const REQUIRED_REFRESH_ARTIFACT_TYPES = [
  "EvidenceGraph",
  "CapabilityEvidenceGraph",
  "ObservedRepo",
  "OwnershipMap",
  "CapabilityMap",
  "IntelligenceSnapshot",
  "FindingReport",
  "AssessmentReport",
  "FindingFilterReport",
  "FindingFilterHealthReport",
  "FindingLifecycleReport",
  "IssueAdjudicationReport",
  "CoherencyDelta",
];

const MAJOR_FRESHNESS_TYPES = [
  "EvidenceGraph",
  "ObservedRepo",
  "OwnershipMap",
  "CapabilityMap",
  "IntelligenceSnapshot",
  "FindingReport",
  "AssessmentReport",
  "FindingLifecycleReport",
  "IssueAdjudicationReport",
  "CoherencyDelta",
  "Publication",
];

type TaskContextAutoRefreshResult = {
  refreshed: boolean;
  assessment: TaskContextFreshnessAssessment;
};

async function ensureTaskContextArtifactsFresh(
  root: string,
  requestedPaths: readonly string[],
): Promise<TaskContextAutoRefreshResult> {
  const store = createLocalArtifactStore(root);
  await store.init();
  const assessment = await assessTaskContextFreshness({
    repoRoot: root,
    artifacts: store,
    requestedPaths,
  });

  if (assessment.status === "fresh") {
    return { refreshed: false, assessment };
  }

  const refresh = await runRefresh(root, {
    skipPublish: true,
    syncAgentInstructions: false,
    ...(!assessment.fullRefresh && assessment.changedFiles.length > 0
      ? { changedFiles: assessment.changedFiles }
      : {}),
  });
  if (refresh.status !== "passed") {
    const failed = refresh.steps.find((step) => step.status === "failed");
    throw new Error(
      `rekon task context could not refresh stale artifacts${failed ? ` at ${failed.id}: ${failed.message ?? "failed"}` : ""}`,
    );
  }

  return { refreshed: true, assessment };
}

async function runRefresh(root: string, options: RefreshOptions = {}): Promise<RefreshResult> {
  const startedAt = new Date().toISOString();
  const steps: RefreshStep[] = [];
  const allArtifacts: ArtifactRef[] = [];
  const result: RefreshResult = {
    root,
    startedAt,
    completedAt: startedAt,
    status: "passed",
    steps,
    artifacts: allArtifacts,
    missing: [],
  };

  function recordArtifacts(refs: ArtifactRef[] | ArtifactRef | undefined): ArtifactRef[] {
    if (!refs) {
      return [];
    }

    const list = Array.isArray(refs) ? refs : [refs];

    for (const ref of list) {
      if (!allArtifacts.some((existing) => existing.type === ref.type && existing.id === ref.id)) {
        allArtifacts.push(ref);
      }
    }

    return list;
  }

  function finalize(status: RefreshResult["status"]): RefreshResult {
    result.status = status;
    result.completedAt = new Date().toISOString();
    return result;
  }

  recordArtifacts(options.seedArtifactRefs);
  recordArtifacts(options.proofGate?.ref);

  // 1. init (write .rekon/ + default config if missing; never overwrite a
  //    malformed existing config — let config.validate report it explicitly)
  try {
    const store = createLocalArtifactStore(root);
    await store.init();

    const configPath = resolve(root, ".rekon", "config.json");
    let configExists = true;

    try {
      await readFile(configPath, "utf8");
    } catch {
      configExists = false;
    }

    if (!configExists) {
      await writeConfigIfMissing(root);
    }

    steps.push({ id: "init", status: "passed" });
  } catch (error) {
    steps.push({ id: "init", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 2. config validate
  const configValidation = await validateConfig(root);
  steps.push({
    id: "config.validate",
    status: configValidation.valid ? "passed" : "failed",
    issues: configValidation.issues,
    message: configValidation.valid ? undefined : "config validation failed",
  });

  if (!configValidation.valid) {
    return finalize("failed");
  }

  const runtime = await createDefaultRuntime(root);

  // Synchronize the stable model bootstrap before observing source so any
  // managed AGENTS.md change belongs to the refreshed source generation.
  if (options.syncAgentInstructions === false) {
    steps.push({ id: "agent-instructions.sync", status: "skipped", message: "disabled for this lifecycle command" });
  } else {
    try {
      const config = await readConfig(root);
      if (config.agentInstructions?.enabled === false) {
        steps.push({ id: "agent-instructions.sync", status: "skipped", message: "disabled in .rekon/config.json" });
      } else if (config.agentInstructions?.sync === "manual") {
        steps.push({ id: "agent-instructions.sync", status: "skipped", message: "manual sync configured" });
      } else {
        const synced = await syncAgentInstructions(root, agentInstructionOptions(config));
        steps.push({ id: "agent-instructions.sync", status: "passed", summary: synced });
      }
    } catch (error) {
      steps.push({ id: "agent-instructions.sync", status: "failed", message: messageOf(error) });
      return finalize("failed");
    }
  }

  // 3. observe
  try {
    const ref = await runtime.runObserve({
      ...(options.changedFiles && options.changedFiles.length > 0
        ? { changedFiles: options.changedFiles, incremental: true }
        : {}),
      ...(options.proofGate ? { inputRefs: [options.proofGate.ref] } : {}),
    });
    steps.push({ id: "observe", status: "passed", artifacts: recordArtifacts(ref) });
  } catch (error) {
    steps.push({ id: "observe", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 4. capability evidence graph. This is built from current source and any
  // current semantic file reports before model projection, so one scan has a
  // coherent model lineage instead of requiring a second refresh.
  try {
    const capabilityGraph = await buildRefreshCapabilityEvidenceGraph(root, createLocalArtifactStore(root));
    recordArtifacts(capabilityGraph.inputRefs);
    steps.push({
      id: "capability.graph",
      status: "passed",
      artifacts: recordArtifacts(capabilityGraph.ref),
      summary: capabilityGraph.summary,
    });
  } catch (error) {
    steps.push({ id: "capability.graph", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 5. project
  try {
    const refs = await runtime.runProject();
    steps.push({ id: "project", status: "passed", artifacts: recordArtifacts(refs) });
  } catch (error) {
    steps.push({ id: "project", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // Re-evaluate adopted repository law against the freshly projected model.
  // A first scan does not create empty law implicitly; contract bootstrap and
  // adoption remain explicit workflows.
  try {
    const contractStore = createLocalArtifactStore(root);
    await contractStore.init();
    const registryEntry = await pickLatestArtifactEntry(contractStore, "EffectiveContractRegistry");
    if (!registryEntry) {
      steps.push({
        id: "contracts.reconcile",
        status: "skipped",
        message: "No effective repository contract registry exists.",
      });
    } else {
      const reconciliation = await reconcileRepositoryContracts({
        root,
        store: contractStore,
        maxFlows: 50,
        maxDepth: 8,
      });
      if (reconciliation.status === "blocked" || (options.proofGate && reconciliation.status === "drifted")) {
        const issues = reconciliation.status === "blocked"
          ? ("issues" in reconciliation ? reconciliation.issues : reconciliation.compiled.issues)
          : reconciliation.drift.entries
              .filter((entry) => entry.status === "drifted")
              .flatMap((entry) => entry.reasons.map((reason) => ({
                code: reason.code,
                severity: reason.severity,
                message: `${entry.contractType}:${entry.contractId}: ${reason.message}`,
                paths: reason.paths,
              })));
        steps.push({
          id: "contracts.reconcile",
          status: "failed",
          issues,
          ...(reconciliation.status === "drifted" ? {
            summary: {
              status: reconciliation.status,
              drift: reconciliation.drift.summary,
              candidates: reconciliation.candidates.summary,
            },
          } : {}),
          message: reconciliation.status === "drifted"
            ? "Repository contract drift remains after the verified change; accepted knowledge was not advanced."
            : "Repository contract reconciliation is blocked.",
        });
        return finalize("failed");
      }
      steps.push({
        id: "contracts.reconcile",
        status: "passed",
        artifacts: recordArtifacts([
          reconciliation.drift.artifact,
          reconciliation.candidates.artifact,
        ]),
        summary: {
          status: reconciliation.status,
          drift: reconciliation.drift.summary,
          candidates: reconciliation.candidates.summary,
          ...(reconciliation.next ? { next: reconciliation.next } : {}),
        },
      });
    }
  } catch (error) {
    steps.push({ id: "contracts.reconcile", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 6. project configured repository law into a typed Rulebook before policy
  // evaluation. An absent rulebook stays silent; removing configured rules
  // writes an empty superseding artifact so prior law cannot remain active.
  try {
    const rulebook = await syncConfiguredRulebook(root, runtime.artifacts);
    steps.push({
      id: "rulebook",
      status: "passed",
      ...(rulebook.ref ? { artifacts: recordArtifacts(rulebook.ref) } : {}),
      summary: {
        configured: rulebook.configured,
        changed: rulebook.changed,
        rules: rulebook.ruleCount,
      },
    });
  } catch (error) {
    steps.push({ id: "rulebook", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 7. evaluate
  try {
    const refs = await runtime.runEvaluate();
    steps.push({ id: "evaluate", status: "passed", artifacts: recordArtifacts(refs) });
  } catch (error) {
    steps.push({ id: "evaluate", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  if (options.afterEvaluate) {
    let postEvaluate: Awaited<ReturnType<NonNullable<RefreshOptions["afterEvaluate"]>>>;
    try {
      postEvaluate = await options.afterEvaluate();
      steps.push({
        id: "assessments.judge",
        status: postEvaluate.status,
        ...(postEvaluate.artifacts ? { artifacts: recordArtifacts(postEvaluate.artifacts) } : {}),
        ...(postEvaluate.summary !== undefined ? { summary: postEvaluate.summary } : {}),
        ...(postEvaluate.message ? { message: postEvaluate.message } : {}),
      });
    } catch (error) {
      steps.push({ id: "assessments.judge", status: "failed", message: messageOf(error) });
      return finalize("failed");
    }

    if (postEvaluate.status === "failed") return finalize("failed");
    if (postEvaluate.artifacts?.some((ref) => ref.type === "AssessmentJudgmentReport")) {
      try {
        const refs = await runtime.runEvaluate({ evaluatorId: "@rekon/capability-policy.evaluator" });
        steps.push({ id: "evaluate.finalize", status: "passed", artifacts: recordArtifacts(refs) });
      } catch (error) {
        steps.push({ id: "evaluate.finalize", status: "failed", message: messageOf(error) });
        return finalize("failed");
      }
    } else {
      steps.push({ id: "evaluate.finalize", status: "skipped", message: "No assessment judgment artifact was produced." });
    }
  }

  const store = createLocalArtifactStore(root);
  await store.init();

  // Load configured findingFilters policies once per refresh; both
  // findings.filter and findings.filter-health pass them through to
  // the runtime helpers so the audit trail names policy rules and
  // filter-health can detect unused / over-broad policies. Result
  // filters (minConfidence/severity/systems/pathExcludes) come from
  // the same config and ride alongside.
  const findingFilterPolicies = await loadFindingFilterPolicies(root);
  const findingResultFilters = await loadFindingResultFilters(root);

  // 6a. findings filter — system / policy / content / result false-
  // positive audit. The raw FindingReport is never mutated; every
  // filtered finding stays auditable in
  // FindingFilterReport.filteredFindings. See
  // docs/strategy/issue-governance-architecture-decision.md.
  try {
    const filterReport = await buildFindingFilterReport(store, {
      policies: findingFilterPolicies,
      resultFilters: findingResultFilters,
    });
    const ref = await store.write(filterReport, { category: "findings" });
    steps.push({
      id: "findings.filter",
      status: "passed",
      artifacts: recordArtifacts(ref),
      summary: filterReport.summary,
    });
  } catch (error) {
    steps.push({ id: "findings.filter", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 6b. findings filter health — high-filter-rate /
  // low-confidence-filtered + policy-aware diagnostics over the
  // latest filter report. Result filters ride through so the
  // `content-filter-high-volume` and `result-filter-over-filtering`
  // alerts can fire when the rebuild path runs.
  //
  // Diagnostics v2: fingerprint the current policy set so the
  // report can emit `stale-policy-fingerprint` /
  // `policy-fingerprint-missing` when the operator's
  // `.rekon/config.json findingFilters` has drifted from the
  // latest filter run. Within `rekon refresh` the upstream
  // `findings.filter` step just rebuilt the filter report with
  // the same policies, so the alert normally stays silent — but
  // a partial refresh that skipped `findings.filter` or a
  // pre-existing filter report from an older policy set would
  // still surface here.
  const refreshPolicyFingerprint = fingerprintFindingFilterPolicies(findingFilterPolicies);
  try {
    const health = await buildFindingFilterHealthReport(store, {
      policies: findingFilterPolicies,
      resultFilters: findingResultFilters,
      currentPolicyFingerprint: refreshPolicyFingerprint,
    });
    const ref = await store.write(health, { category: "findings" });
    steps.push({
      id: "findings.filter-health",
      status: "passed",
      artifacts: recordArtifacts(ref),
      summary: { ...health.summary, alerts: health.alerts.length },
    });
  } catch (error) {
    steps.push({
      id: "findings.filter-health",
      status: "failed",
      message: messageOf(error),
    });
    return finalize("failed");
  }

  // 7. findings lifecycle
  try {
    const lifecycle = await buildFindingLifecycleReport(store);
    const ref = await store.write(lifecycle, { category: "findings" });
    steps.push({
      id: "findings.lifecycle",
      status: "passed",
      artifacts: recordArtifacts(ref),
      summary: lifecycle.summary,
    });
  } catch (error) {
    steps.push({ id: "findings.lifecycle", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 8. issues adjudicate (groups duplicate findings before coherency rolls them up)
  try {
    const adjudication = await buildIssueAdjudicationReport(store);
    const ref = await store.write(adjudication, { category: "findings" });
    steps.push({
      id: "issues.adjudicate",
      status: "passed",
      artifacts: recordArtifacts(ref),
      summary: adjudication.summary,
    });
  } catch (error) {
    steps.push({ id: "issues.adjudicate", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 9. coherency delta (now sourced from the latest IssueAdjudicationReport)
  try {
    const delta = await buildCoherencyDelta(store);
    const ref = await store.write(delta, { category: "findings" });
    steps.push({
      id: "coherency.delta",
      status: "passed",
      artifacts: recordArtifacts(ref),
      summary: delta.summary,
    });
  } catch (error) {
    steps.push({ id: "coherency.delta", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // Proof mode advances the accepted outcome before learning so the current
  // curation, snapshot, and maintained publications share one generation.
  // Recheck after all writes below still protects against concurrent edits.
  let acceptedProofGate: ValidatedProofGateForRefresh | undefined;
  if (options.proofGate) {
    try {
      acceptedProofGate = await validateProofGateForRefresh(
        root,
        `${options.proofGate.ref.type}:${options.proofGate.ref.id}`,
        options.proofGate.changedFiles,
      );
      steps.push({
        id: "proof-gate.preaccept",
        status: "passed",
        artifacts: [acceptedProofGate.ref],
        summary: { paths: acceptedProofGate.changedFiles },
      });
    } catch (error) {
      steps.push({ id: "proof-gate.preaccept", status: "failed", message: messageOf(error) });
      return finalize("failed");
    }
  }

  if (acceptedProofGate) {
    try {
      const acceptedOutcomeRef = await recordAcceptedProofOutcome(root, acceptedProofGate);
      recordArtifacts(acceptedOutcomeRef);
      steps.push({ id: "outcome.record", status: "passed", artifacts: [acceptedOutcomeRef] });
    } catch (error) {
      steps.push({ id: "outcome.record", status: "failed", message: messageOf(error) });
      return finalize("failed");
    }
  }

  try {
    const memoryStep = await curateRefreshMemory(runtime, store);
    steps.push(memoryStep);
    recordArtifacts(memoryStep.artifacts);
  } catch (error) {
    steps.push({ id: "memory.curate", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 10. snapshot. Build it after governance so its lower-layer index and
  // lineage are current, and before publication so publishers can consume it
  // without a newer snapshot immediately superseding their input.
  try {
    const ref = await runtime.runSnapshot({ artifactRefs: [...allArtifacts] });
    steps.push({ id: "snapshot", status: "passed", artifacts: recordArtifacts(ref) });
  } catch (error) {
    steps.push({ id: "snapshot", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 11. Publish maintained local readouts. An ordinary refresh preserves the
  // established architecture-only behavior. A proof-gated refresh is the
  // accepted-change maintenance boundary and regenerates every local
  // publication that models and contributors rely on.
  let currentPublicationRefs: ArtifactRef[] = [];

  if (options.skipPublish) {
    steps.push({ id: "publish.architecture", status: "skipped", message: "--skip-publish" });
  } else {
    const publicationSteps: Array<{
      id: Extract<RefreshStepId, `publish.${string}`>;
      publisherId: string;
      input?: Record<string, unknown>;
    }> = options.proofGate
      ? [
          {
            id: "publish.guidance",
            publisherId: "@rekon/capability-docs.publisher",
            input: { includeIntentLineage: false },
          },
          {
            id: "publish.architecture",
            publisherId: "@rekon/capability-docs.architecture-summary",
            input: { includeIntentLineage: false },
          },
          {
            id: "publish.proof",
            publisherId: "@rekon/capability-docs.proof-report",
            input: { includeIntentLineage: false, proofGateRef: options.proofGate.ref },
          },
          {
            id: "publish.agent-contract",
            publisherId: "@rekon/capability-docs.agent-contract",
            input: { includeIntentLineage: false },
          },
        ]
      : [{
          id: "publish.architecture",
          publisherId: "@rekon/capability-docs.architecture-summary",
          input: { includeIntentLineage: false },
        }];

    for (const publicationStep of publicationSteps) {
      try {
        const refs = await runtime.runPublish({
          publisherId: publicationStep.publisherId,
          ...(publicationStep.input ? { input: publicationStep.input } : {}),
        });
        const recorded = recordArtifacts(refs);
        currentPublicationRefs.push(...recorded);
        steps.push({ id: publicationStep.id, status: "passed", artifacts: recorded });
      } catch (error) {
        steps.push({ id: publicationStep.id, status: "failed", message: messageOf(error) });
        return finalize("failed");
      }
    }
  }

  // Check required artifact families before validation/freshness.
  const missing: string[] = [];

  const currentArtifactTypes = new Set(allArtifacts.map((ref) => ref.type));
  for (const type of REQUIRED_REFRESH_ARTIFACT_TYPES) {
    if (!currentArtifactTypes.has(type)) {
      missing.push(type);
    }
  }

  if (!options.skipPublish) {
    const publicationKinds = new Set<string>();
    for (const ref of currentPublicationRefs) {
      const publication = await store.read(ref) as { kind?: string };
      if (typeof publication?.kind === "string") publicationKinds.add(publication.kind);
    }

    const requiredPublicationKinds = options.proofGate
      ? ["agents", "repo-summary", "architecture-summary", "proof-report", "agent-contract"]
      : ["architecture-summary"];
    for (const kind of requiredPublicationKinds) {
      if (!publicationKinds.has(kind)) missing.push(`Publication(${kind})`);
    }
  }

  // If publish was skipped, drop any stale Publication entries from
  // freshness comparison too — we're not judging publications this run.
  // (handled implicitly: skipped step records itself; no missing entry recorded.)

  result.missing = missing;

  // 12. artifacts validate
  const validation = await validateArtifactIndex(store);
  steps.push({
    id: "artifacts.validate",
    status: validation.valid ? "passed" : "failed",
    issues: validation.issues,
  });
  result.validation = { valid: validation.valid, issues: validation.issues };

  // 13. artifacts freshness (optional)
  if (options.skipFreshness) {
    steps.push({ id: "artifacts.freshness", status: "skipped", message: "--skip-freshness" });
  } else {
    const freshness = await validateArtifactFreshness(store);
    const majorTypes = options.skipPublish
      ? MAJOR_FRESHNESS_TYPES.filter((type) => type !== "Publication")
      : MAJOR_FRESHNESS_TYPES;
    const latestMajor = computeCurrentRunMajorFreshness(freshness, allArtifacts, majorTypes);
    const currentFreshnessStatus = aggregateCurrentRunFreshnessStatus(latestMajor);
    const allMajorFresh = latestMajor.every((entry) => entry.status === "fresh");
    const anyMajorStale = latestMajor.some((entry) => entry.status === "stale");
    const anyMajorUnknown = latestMajor.some((entry) => entry.status === "unknown");
    const majorIssues = freshness.artifacts
      .filter((entry) => entry.status !== "fresh"
        && latestMajor.some(
          (major) => major.type === entry.type && major.id === entry.id && major.status !== "fresh",
        ))
      .flatMap((entry) => entry.issues.map((issue) => ({ ...issue, artifactType: entry.type, artifactId: entry.id })));
    const stepStatus: RefreshStep["status"] = allMajorFresh ? "passed" : "failed";

    steps.push({
      id: "artifacts.freshness",
      status: stepStatus,
      issues: majorIssues,
      summary: { status: currentFreshnessStatus, latestMajor },
      message: allMajorFresh
        ? undefined
        : anyMajorStale
          ? "Latest major artifact is stale; rerun the upstream phase."
          : anyMajorUnknown
            ? "Latest major artifact freshness is unknown; check lineage."
            : "Latest major artifacts have non-fresh freshness.",
    });
    result.freshness = {
      status: currentFreshnessStatus,
      issues: majorIssues,
      latestMajor,
    };
  }

  // Source can change while a long refresh is running. Re-read the stored gate
  // and re-check every digest after all maintained artifacts and instructions
  // have been written. A failed final check prevents this run from becoming an
  // accepted repository generation.
  if (options.proofGate) {
    try {
      const revalidated = await validateProofGateForRefresh(
        root,
        `${options.proofGate.ref.type}:${options.proofGate.ref.id}`,
        options.proofGate.changedFiles,
      );
      steps.push({
        id: "proof-gate.revalidate",
        status: "passed",
        artifacts: [revalidated.ref],
        summary: { paths: revalidated.changedFiles },
      });
    } catch (error) {
      steps.push({ id: "proof-gate.revalidate", status: "failed", message: messageOf(error) });
    }
  }

  // Final status
  const failedStep = steps.find((step) => step.status === "failed");

  if (failedStep) {
    return finalize("failed");
  }

  if (missing.length > 0) {
    return finalize("partial");
  }

  return finalize("passed");
}

async function curateRefreshMemory(
  runtime: Awaited<ReturnType<typeof createDefaultRuntime>>,
  store: ReturnType<typeof createLocalArtifactStore>,
): Promise<RefreshStep> {
  const usageRefs = await store.list("ContextUsageEvent");
  if (usageRefs.length === 0) {
    return {
      id: "memory.curate",
      status: "skipped",
      message: "No recorded task-context deliveries exist.",
    };
  }
  const artifacts = await runtime.runLearn({
    learnerId: "@rekon/capability-memory.learner",
    input: { mode: "curation" },
  });
  const reportRef = artifacts.find((ref) => ref.type === "MemoryCurationReport");
  const report = reportRef
    ? await store.read(reportRef) as { summary?: unknown; groundedSummary?: unknown }
    : undefined;
  return {
    id: "memory.curate",
    status: "passed",
    artifacts,
    summary: {
      curation: report?.summary,
      grounded: report?.groundedSummary,
    },
  };
}

async function gateCurrentTaskContextGraph(
  root: string,
  graph: TaskContextGraphLike,
): Promise<{ graph: TaskContextGraphLike; warnings: string[] }> {
  const staleEvidenceIds: string[] = [];
  const sourceByPath = new Map<string, Awaited<ReturnType<typeof readCurrentRepoSource>>>();
  for (const evidence of graph.evidence ?? []) {
    if (
      typeof evidence.path !== "string"
      || typeof evidence.sourceSha256 !== "string"
      || !/^[a-f0-9]{64}$/u.test(evidence.sourceSha256)
    ) {
      continue;
    }
    let source = sourceByPath.get(evidence.path);
    if (source === undefined) {
      source = await readCurrentRepoSource(root, evidence.path);
      sourceByPath.set(evidence.path, source);
    }
    if (!source || source.sha256 !== evidence.sourceSha256) staleEvidenceIds.push(evidence.id);
  }

  const result = excludeStaleTaskContextSourceEvidence(graph, staleEvidenceIds);
  if (result.removedEvidenceIds.length === 0) return { graph, warnings: [] };
  return {
    graph: result.graph,
    warnings: [
      `source-evidence-stale: excluded ${result.removedEvidenceIds.length} exact evidence record(s), ${result.removedClaimIds.length} dependent claim(s), and ${result.removedCapabilityIds.length} dependent capability record(s) for ${result.removedPaths.length} changed or unreadable path(s); refresh before relying on affected graph routes`,
    ],
  };
}

function computeCurrentRunMajorFreshness(
  freshness: ArtifactFreshnessResult,
  currentRefs: readonly ArtifactRef[],
  majorTypes: readonly string[] = MAJOR_FRESHNESS_TYPES,
): Array<{ type: string; id: string; status: ArtifactFreshnessStatus }> {
  const freshnessByKey = new Map(
    freshness.artifacts.map((entry) => [`${entry.type}:${entry.id}`, entry]),
  );

  return currentRefs
    .filter((ref) => majorTypes.includes(ref.type))
    .map((ref) => freshnessByKey.get(`${ref.type}:${ref.id}`))
    .filter((entry): entry is ArtifactFreshnessEntry => Boolean(entry))
    .map((entry) => ({
      type: entry.type,
      id: entry.id,
      status: effectiveMajorStatus(entry),
    }))
    .sort((left, right) => left.type.localeCompare(right.type) || left.id.localeCompare(right.id));
}

function aggregateCurrentRunFreshnessStatus(
  entries: Array<{ status: ArtifactFreshnessStatus }>,
): ArtifactFreshnessStatus {
  if (entries.length === 0 || entries.some((entry) => entry.status === "unknown")) return "unknown";
  if (entries.some((entry) => entry.status === "partial")) return "partial";
  if (entries.some((entry) => entry.status === "stale")) return "stale";
  return "fresh";
}

function renderArtifactFreshness(result: ArtifactFreshnessResult): string {
  const lines = [
    `Artifact freshness: ${result.status}`,
    `Checked: ${result.checkedAt}`,
    `Artifacts: ${result.artifacts.length}`,
  ];
  const nonFresh = result.artifacts.filter((entry) => entry.status !== "fresh");

  if (nonFresh.length === 0) {
    lines.push("All selected artifacts are fresh.");
    return lines.join("\n");
  }

  lines.push("", "Non-fresh artifacts:");
  for (const entry of nonFresh) {
    lines.push(`- ${entry.type}:${entry.id} (${entry.status})`);
    for (const issue of entry.issues) {
      lines.push(`  ${issue.code}: ${issue.message}`);
    }
  }

  return lines.join("\n");
}

// The artifact-freshness validator flags `newer-input-exists` whenever an
// artifact cites an older sibling of an input type. That is sometimes
// intentional: `buildFindingLifecycleReport` deliberately cites every prior
// `FindingReport` to derive resolved-finding state. When we are judging the
// latest artifact of a major type, treat `newer-input-exists` issues as
// benign — the artifact under examination is by construction the newest of
// its type, and the validator's complaint is about a historical reference
// that the producer intended to keep.
function effectiveMajorStatus(entry: ArtifactFreshnessEntry): ArtifactFreshnessStatus {
  const nonHistorical = entry.issues.filter((issue) => issue.code !== "newer-input-exists");

  if (nonHistorical.length === 0) {
    return "fresh";
  }

  return entry.status;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type AgentContractExportOptions = {
  outputPath: string;
  force: boolean;
};

type AgentContractExportResult = {
  outputPath: string;
  absolutePath: string;
  publicationRef: { type: string; id: string; schemaVersion: string };
  forced: boolean;
  protectedPath: boolean;
  wrote: boolean;
  message?: string;
};

async function runAgentContractExport(
  root: string,
  options: AgentContractExportOptions,
): Promise<AgentContractExportResult> {
  const absoluteRoot = resolve(root);
  const requestedOutput = options.outputPath;
  const absoluteOutput = isAbsolute(requestedOutput)
    ? resolve(requestedOutput)
    : resolve(absoluteRoot, requestedOutput);
  const relativeFromRoot = relative(absoluteRoot, absoluteOutput);

  if (relativeFromRoot.startsWith("..") || isAbsolute(relativeFromRoot)) {
    throw new Error(
      `rekon agent-contract export --output must resolve inside the repo root (${absoluteRoot}). Got: ${requestedOutput}`,
    );
  }

  const protectedPath = isProtectedAgentDocPath(relativeFromRoot);

  if (protectedPath) {
    throw new Error(
      `Refusing whole-file export to protected agent instruction file ${relativeFromRoot}. Use \`rekon agent-instructions sync\` for AGENTS.md or export to a standalone file such as AGENTS.rekon.md.`,
    );
  }

  const exists = await pathExists(absoluteOutput);

  if (exists && !options.force) {
    throw new Error(
      `Refusing to overwrite existing file ${relativeFromRoot} without --force.`,
    );
  }

  // Generate the agent contract if no Publication of the right kind exists,
  // or read the latest if it does.
  const store = createLocalArtifactStore(root);
  await store.init();

  let publicationEntry = await findLatestAgentContractEntry(store);

  if (!publicationEntry) {
    const runtime = await createDefaultRuntime(root);
    await ensureSnapshotReady(runtime);
    await runtime.runPublish({
      publisherId: "@rekon/capability-docs.agent-contract",
    });
    publicationEntry = await findLatestAgentContractEntry(store);
  }

  if (!publicationEntry) {
    throw new Error(
      "No agent-contract Publication found and auto-publish failed. Run `rekon publish agent-contract` and retry.",
    );
  }

  const publication = (await store.read(publicationEntry)) as {
    header?: { artifactId?: string };
    content?: string;
    kind?: string;
  };

  if (!publication || typeof publication.content !== "string" || publication.content.length === 0) {
    throw new Error(
      `Agent-contract Publication ${publicationEntry.id} has no content; rebuild with \`rekon publish agent-contract\`.`,
    );
  }

  const preamble = [
    "<!--",
    "Generated by Rekon from .rekon artifacts.",
    `Source publication: Publication:${publicationEntry.id}`,
    `Generated at: ${new Date().toISOString()}`,
    "Do not treat this file as canonical truth.",
    "Canonical truth lives in .rekon/artifacts.",
    "Regenerate with: rekon publish agent-contract && rekon agent-contract export --output " + relativeFromRoot,
    "-->",
    "",
  ].join("\n");
  const content = `${preamble}${publication.content.endsWith("\n") ? publication.content : `${publication.content}\n`}`;

  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, content, "utf8");

  const result: AgentContractExportResult = {
    outputPath: relativeFromRoot,
    absolutePath: absoluteOutput,
    publicationRef: {
      type: "Publication",
      id: publicationEntry.id,
      schemaVersion: publicationEntry.schemaVersion,
    },
    forced: options.force,
    protectedPath,
    wrote: true,
  };

  if (options.force) {
    result.message = "Overwrote existing file because --force was provided.";
  }

  return result;
}

async function findLatestAgentContractEntry(
  store: ReturnType<typeof createLocalArtifactStore>,
): Promise<ArtifactIndexEntry | undefined> {
  const refs = await store.list("Publication");

  if (refs.length === 0) {
    return undefined;
  }

  const sorted = [...refs].sort((left, right) => right.id.localeCompare(left.id));

  for (const entry of sorted) {
    const publication = await store.read(entry) as { kind?: string };

    if (publication?.kind === "agent-contract") {
      return entry;
    }
  }

  return undefined;
}

function isProtectedAgentDocPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  const basename = normalized.split("/").pop() ?? "";

  if (PROTECTED_AGENT_DOC_BASENAMES.has(basename.toLowerCase())) {
    return true;
  }

  for (const pattern of PROTECTED_AGENT_DOC_RELATIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureSnapshotReady(runtime: Awaited<ReturnType<typeof createDefaultRuntime>>): Promise<void> {
  if ((await runtime.artifacts.list("EvidenceGraph")).length === 0) {
    await runtime.runObserve();
  }

  if ((await runtime.artifacts.list("OwnershipMap")).length === 0) {
    await runtime.runProject();
  }

  const rulebookSync = await syncConfiguredRulebook(runtime.repo.root, runtime.artifacts);
  if ((await runtime.artifacts.list("FindingReport")).length === 0 || rulebookSync.changed) {
    await runtime.runEvaluate();
  }

  if (await snapshotIsStaleOrMissing(runtime)) {
    await runtime.runSnapshot();
  }
}

async function snapshotIsStaleOrMissing(
  runtime: Awaited<ReturnType<typeof createDefaultRuntime>>,
): Promise<boolean> {
  const snapshots = await runtime.artifacts.list("IntelligenceSnapshot");
  const latestSnapshot = snapshots.sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  )[0];

  if (!latestSnapshot) {
    return true;
  }

  const inputTypes = [
    "EvidenceGraph",
    "ObservedRepo",
    "OwnershipMap",
    "CapabilityMap",
    "GraphSlice",
    "FindingReport",
    "MemorySelection",
  ];

  for (const type of inputTypes) {
    const entries = await runtime.artifacts.list(type);
    const latest = entries.sort((left, right) =>
      right.writtenAt.localeCompare(left.writtenAt),
    )[0];

    if (!latest) {
      continue;
    }

    if (latest.writtenAt.localeCompare(latestSnapshot.writtenAt) > 0) {
      return true;
    }
  }

  return false;
}

async function readLatestLedger(
  store: ReturnType<typeof createLocalArtifactStore>,
): Promise<FindingStatusLedger | undefined> {
  const entries = await store.list("FindingStatusLedger");

  if (entries.length === 0) {
    return undefined;
  }

  const latest = entries.sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  )[0];

  if (!latest) {
    return undefined;
  }

  return (await store.read(latest)) as FindingStatusLedger;
}

/**
 * Generic read-the-latest-of-this-artifact-type helper used
 * by the read-only operator surfaces (`rekon findings
 * filter-policy status` is the first; future surfaces can
 * reuse this). Returns `undefined` when no artifact of that
 * type is indexed. Sorts by `writtenAt` so the most recent
 * write wins.
 */
async function readLatestArtifactOrUndefined<T>(
  store: ReturnType<typeof createLocalArtifactStore>,
  artifactType: string,
): Promise<T | undefined> {
  const entries = await store.list(artifactType);
  if (entries.length === 0) return undefined;
  const sorted = [...entries].sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  );
  const latest = sorted[0];
  if (!latest) return undefined;
  return (await store.read(latest)) as T;
}

async function bootstrapRepositoryContracts(input: {
  root: string;
  maxFlows: number;
  maxDepth: number;
}) {
  const store = createLocalArtifactStore(input.root);
  await store.init();
  await writeConfigIfMissing(input.root);
  const configValidation = await validateConfig(input.root);
  if (!configValidation.valid) {
    return { status: "failed" as const, issues: configValidation.issues };
  }
  const runtime = await createDefaultRuntime(input.root);
  const evidenceRef = await runtime.runObserve();
  const capabilityGraph = await buildRefreshCapabilityEvidenceGraph(input.root, store);
  const projectionRefs = await runtime.runProject();
  const compiled = await compileRepositoryContracts(input.root, store);
  if (!compiled.valid) {
    return { status: "failed" as const, compiled };
  }
  const intelligence = await loadRepositoryContractIntelligence(store, input.root);
  const candidates = discoverRepositoryContractCandidates({
    repoId: input.root,
    graph: intelligence.graph,
    observedRepo: intelligence.observedRepo,
    ownershipMap: intelligence.ownershipMap,
    capabilityMap: intelligence.capabilityMap,
    effectiveRegistry: intelligence.effectiveRegistry,
    existingFlowContracts: intelligence.existingFlowContracts,
    verificationEvidence: intelligence.verificationEvidence,
    verificationInventory: intelligence.verificationInventory,
    maxFlows: input.maxFlows,
    maxDepth: input.maxDepth,
  });
  const candidateRef = await store.write(candidates, { category: "actions" });
  const snapshotRef = await runtime.runSnapshot({
    artifactRefs: [
      evidenceRef,
      capabilityGraph.ref,
      ...projectionRefs,
      ...compiled.contracts,
      ...(compiled.registry ? [compiled.registry] : []),
      candidateRef,
    ],
  });
  const config = await readConfig(input.root);
  const agentInstructions = await syncAgentInstructions(input.root, agentInstructionOptions(config));
  const prompt = candidates.summary.total > 0
    ? buildRepositoryContractJudgmentPrompt(candidates)
    : undefined;
  return {
    status: candidates.summary.total > 0 ? "judgment-required" as const : "current" as const,
    artifacts: {
      evidence: evidenceRef,
      capabilityGraph: capabilityGraph.ref,
      projections: projectionRefs,
      registry: compiled.registry,
      candidates: candidateRef,
      snapshot: snapshotRef,
    },
    summary: candidates.summary,
    evidenceInventory: candidates.evidenceInventory,
    unresolved: candidates.unresolved,
    graphWarnings: intelligence.graph.warnings,
    agentInstructions,
    ...(prompt ? {
      judgment: {
        promptVersion: REPOSITORY_CONTRACT_JUDGMENT_PROMPT_VERSION,
        prompt,
        schema: REPOSITORY_CONTRACT_JUDGMENT_JSON_SCHEMA,
        next: [
          `Inspect the cited source and write repository-native judgments for ContractCandidateReport:${candidateRef.id}.`,
          `rekon contracts maintain --candidate-report ${candidateRef.id} --input <judgment.json> --root . --json`,
        ],
      },
    } : {}),
    boundaries: {
      calledModel: false,
      evaluatedFindings: false,
      wroteContractSource: false,
      executedRepositoryCommands: false,
    },
  };
}

async function compileRepositoryContracts(
  root: string,
  store: ReturnType<typeof createLocalArtifactStore>,
) {
  const loaded = await loadRepositoryContractSources({ repoRoot: root });
  if (!loaded.valid) {
    return {
      valid: false as const,
      sources: loaded.sources.map((source) => ({ path: source.path, digest: source.digest, sourceId: source.document.sourceId })),
      contracts: [] as ArtifactRef[],
      registry: undefined,
      summary: undefined,
      issues: loaded.issues,
    };
  }
  const projection = buildRepositoryContractProjection({ repoId: root, sources: loaded.sources });
  const writtenContracts: ArtifactRef[] = [];
  for (const contract of [...projection.systemContracts, ...projection.flowContracts]) {
    writtenContracts.push(await store.write(contract, { category: "actions" }));
  }
  const writtenByIdentity = new Map(writtenContracts.map((ref) => [`${ref.type}:${ref.id}`, ref]));
  const registry = createEffectiveContractRegistry({
    header: { ...projection.registry.header, inputRefs: writtenContracts },
    entries: projection.registry.entries.map((entry) => ({
      ...entry,
      ref: writtenByIdentity.get(`${entry.ref.type}:${entry.ref.id}`) ?? entry.ref,
    })),
  });
  const registryRef = await store.write(registry, { category: "actions" });
  return {
    valid: true as const,
    sources: loaded.sources.map((source) => ({ path: source.path, digest: source.digest, sourceId: source.document.sourceId })),
    contracts: writtenContracts,
    registry: registryRef,
    summary: registry.summary,
    issues: loaded.issues,
  };
}

async function loadRepositoryContractIntelligence(
  store: ReturnType<typeof createLocalArtifactStore>,
  root: string,
) {
  const [
    capabilityGraph,
    observedRepo,
    ownershipMap,
    capabilityMap,
    stepGraph,
    effectiveRegistry,
    graphSlices,
  ] = await Promise.all([
    readLatestArtifactOrUndefined<CapabilityEvidenceGraph>(store, "CapabilityEvidenceGraph"),
    readLatestArtifactOrUndefined<ObservedRepo>(store, "ObservedRepo"),
    readLatestArtifactOrUndefined<OwnershipMap>(store, "OwnershipMap"),
    readLatestArtifactOrUndefined<CapabilityMap>(store, "CapabilityMap"),
    readLatestArtifactOrUndefined<StepCapabilityGraph>(store, "StepCapabilityGraph"),
    readLatestArtifactOrUndefined<EffectiveContractRegistry>(store, "EffectiveContractRegistry"),
    readCurrentArtifactsByType<NonNullable<BuildRepositoryIntelligenceGraphInput["graphSlices"]>[number]>(store, "GraphSlice"),
  ]);
  const graph = buildRepositoryIntelligenceGraph({
    capabilityGraph,
    graphSlices,
    ownershipMap,
    stepGraph,
    contractRegistry: effectiveRegistry,
  });
  const existingFlowContracts: FlowContract[] = [];
  for (const entry of effectiveRegistry?.entries ?? []) {
    if (entry.contractType !== "FlowContract") continue;
    existingFlowContracts.push(await store.read(entry.ref) as FlowContract);
  }
  const verification = await loadRepositoryContractVerificationEvidence(store, root);
  return {
    graph: {
      ...graph,
      warnings: [...new Set([...graph.warnings, ...verification.warnings])].sort(),
    },
    observedRepo,
    ownershipMap,
    capabilityMap,
    effectiveRegistry,
    existingFlowContracts,
    verificationEvidence: verification.evidence,
    verificationInventory: verification.inventory,
  };
}

async function loadRepositoryContractVerificationEvidence(
  store: ReturnType<typeof createLocalArtifactStore>,
  root: string,
): Promise<{
  evidence: RepositoryContractVerificationEvidence[];
  warnings: string[];
  inventory: RepositoryContractVerificationInventory;
}> {
  const warnings: string[] = [];
  const collected = new Map<string, RepositoryContractVerificationEvidence>();
  const inputRefs: ArtifactRef[] = [];
  let validatedRuntimeObservationReports = 0;
  const entries = (await store.list("RuntimeGraphObservationReport"))
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));

  for (const entry of entries) {
    let report: RuntimeGraphObservationReport;
    try {
      const validation = validateRuntimeGraphObservationReport(await store.read(entry));
      if (!validation.ok) {
        warnings.push(
          `contract-verifier-observation-invalid: RuntimeGraphObservationReport:${entry.id} ${validation.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ")}`,
        );
        continue;
      }
      report = validation.value;
      assertProofArtifactRepository(root, report.header, `RuntimeGraphObservationReport:${entry.id}`);
      validatedRuntimeObservationReports += 1;
      inputRefs.push(artifactIndexRef(entry));
    } catch (error) {
      warnings.push(
        `contract-verifier-observation-unavailable: RuntimeGraphObservationReport:${entry.id} ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    for (const coverage of report.source.coverageSources ?? []) {
      if (coverage.isolated !== true
        || coverage.commandStatus !== "passed"
        || !coverage.verificationRunRef
        || !coverage.commandId) continue;
      const coveredPaths = [...new Set((coverage.fileCoverage ?? []).flatMap((file) => {
        const observed = file.statements.covered + file.functions.covered + file.branches.covered;
        if (observed <= 0) return [];
        try {
          return [normalizeProofPath(file.path)];
        } catch {
          return [];
        }
      }))].sort();
      if (coveredPaths.length === 0) continue;

      const runContext = await readVerificationRunContext(
        store,
        root,
        coverage.verificationRunRef,
        [],
        warnings,
      );
      if (!runContext) continue;
      const runCommand = runContext.run.commands.find((command) => command.id === coverage.commandId);
      if (!runCommand
        || runCommand.status !== "passed"
        || !runCommand.argv.some((argument) =>
          verificationArgumentMatchesPath(root, argument, coverage.testPath))) {
        warnings.push(
          `contract-verifier-run-mismatch: RuntimeGraphObservationReport:${entry.id} does not link command ${coverage.commandId} to a passed VerificationRun command that names ${coverage.testPath}`,
        );
        continue;
      }

      const command = runCommand.command.trim().replace(/\s+/gu, " ");
      if (!command) continue;
      const evidenceRefs = dedupeArtifactRefs([artifactIndexRef(entry), runContext.ref]);
      const key = `${command}\0${coveredPaths.join("\0")}`;
      collected.set(key, {
        method: "test",
        command,
        coveredPaths,
        testPath: coverage.testPath,
        evidenceRefs,
      });
    }
  }

  return {
    evidence: [...collected.values()].sort((left, right) =>
      left.command.localeCompare(right.command)
      || left.coveredPaths.join("\0").localeCompare(right.coveredPaths.join("\0"))),
    warnings: [...new Set(warnings)].sort(),
    inventory: {
      indexedRuntimeObservationReports: entries.length,
      validatedRuntimeObservationReports,
      isolatedCoverageRecords: collected.size,
      inputRefs: dedupeArtifactRefs(inputRefs),
      warnings: [...new Set(warnings)].sort(),
    },
  };
}

async function reconcileRepositoryContracts(input: {
  root: string;
  store: ReturnType<typeof createLocalArtifactStore>;
  maxFlows: number;
  maxDepth: number;
}) {
  let intelligence = await loadRepositoryContractIntelligence(input.store, input.root);
  if (!intelligence.effectiveRegistry) {
    const compiled = await compileRepositoryContracts(input.root, input.store);
    if (!compiled.valid) {
      return { status: "blocked" as const, compiled };
    }
    intelligence = await loadRepositoryContractIntelligence(input.store, input.root);
  }
  const registry = intelligence.effectiveRegistry;
  if (!registry) throw new Error("Contract reconciliation could not create an effective registry.");
  const registryEntry = await pickLatestArtifactEntry(input.store, "EffectiveContractRegistry");
  if (!registryEntry) throw new Error("Contract reconciliation could not resolve the effective registry artifact.");
  const loadedSources = await loadRepositoryContractSources({ repoRoot: input.root });
  if (!loadedSources.valid) {
    return { status: "blocked" as const, issues: loadedSources.issues };
  }
  const contracts: Array<SystemContract | FlowContract> = [];
  for (const entry of registry.entries) {
    if (entry.contractType !== "SystemContract" && entry.contractType !== "FlowContract") continue;
    contracts.push(await input.store.read(entry.ref) as SystemContract | FlowContract);
  }
  const drift = buildRepositoryContractDriftReport({
    repoId: input.root,
    registry,
    registryRef: artifactIndexRef(registryEntry),
    contracts,
    sources: loadedSources.sources.map((source) => ({ path: source.path, digest: source.digest })),
    graph: intelligence.graph,
    observedRepo: intelligence.observedRepo,
    ownershipMap: intelligence.ownershipMap,
  });
  const driftRef = await input.store.write(drift, { category: "actions" });
  const reconsiderContractIds = drift.entries
    .filter((entry) => entry.status !== "current")
    .map((entry) => `${entry.contractType}:${entry.contractId}`);
  const candidates = discoverRepositoryContractCandidates({
    repoId: input.root,
    graph: intelligence.graph,
    observedRepo: intelligence.observedRepo,
    ownershipMap: intelligence.ownershipMap,
    capabilityMap: intelligence.capabilityMap,
    effectiveRegistry: registry,
    existingFlowContracts: contracts.filter((contract): contract is FlowContract =>
      contract.header.artifactType === "FlowContract"),
    verificationEvidence: intelligence.verificationEvidence,
    verificationInventory: intelligence.verificationInventory,
    reconsiderContractIds,
    maxFlows: input.maxFlows,
    maxDepth: input.maxDepth,
  });
  const candidateRef = await input.store.write(candidates, { category: "actions" });
  return {
    status: drift.summary.drifted > 0 ? "drifted" as const : drift.summary.unverified > 0 ? "unverified" as const : "current" as const,
    drift: { artifact: driftRef, summary: drift.summary, entries: drift.entries },
    candidates: {
      artifact: candidateRef,
      summary: candidates.summary,
      evidenceInventory: candidates.evidenceInventory,
    },
    next: candidates.summary.total > 0
      ? `rekon contracts maintain --candidate-report ${candidateRef.id} --input <judgment.json> --root . --json`
      : undefined,
  };
}

type CurrentTaskPact = {
  pact?: TaskPact;
  ref?: ArtifactRef;
  inputRefs: ArtifactRef[];
  warnings: string[];
};

type CurrentTaskOperation = {
  plan: TaskOperationPlan;
  warnings: string[];
};

async function buildCurrentTaskOperation(
  store: ReturnType<typeof createLocalArtifactStore>,
  input: {
    taskText: string;
    paths: string[];
    taskPact?: TaskPact;
    requestedProfile?: ContextProfile;
    escalation?: TaskOperationEscalation;
  },
): Promise<CurrentTaskOperation> {
  const paths = [...new Set(input.paths.map((path) => path.trim()).filter(Boolean))].sort();
  const snapshotEntry = await pickLatestArtifactEntry(store, "IntelligenceSnapshot");
  let preflight: PreflightPacket | undefined;
  if (snapshotEntry && paths.length > 0) {
    preflight = await buildPreflightPacket({
      artifacts: {
        async read(ref: ArtifactRef): Promise<unknown> {
          return store.read(ref);
        },
        async list(type?: string): Promise<ArtifactRef[]> {
          return (await store.list(type)).map(artifactIndexRef);
        },
      },
      snapshotRef: artifactIndexRef(snapshotEntry),
      goal: input.taskText,
      paths,
    });
  }

  const flows: TaskOperationFlow[] = [];
  for (const contract of input.taskPact?.contracts ?? []) {
    if (contract.contractType !== "FlowContract") continue;
    const flow = await store.read(contract.ref) as FlowContract;
    flows.push({
      id: flow.contractId,
      criticality: flow.criticality,
      systems: flow.systems,
      evidenceRef: `${contract.ref.type}:${contract.ref.id}`,
    });
  }

  const unresolvedPaths = preflight?.matchedScopes
    .filter((scope) => !scope.owner)
    .map((scope) => scope.path) ?? [];
  const evidenceStatus = !preflight
    ? "missing" as const
    : unresolvedPaths.length > 0 || preflight.matchedScopes.length < paths.length
      ? "partial" as const
      : "complete" as const;
  const evidenceReasons = evidenceStatus === "missing"
    ? ["No current IntelligenceSnapshot was available for preflight risk resolution."]
    : evidenceStatus === "partial"
      ? [`Ownership is unresolved for: ${[...new Set(unresolvedPaths)].sort().join(", ") || "part of the requested scope"}.`]
      : [];
  const plan = classifyTaskOperation({
    taskText: input.taskText,
    paths,
    ownerSystems: preflight?.ownerSystems ?? [],
    ...(preflight ? {
      risk: {
        tier: preflight.risk.tier,
        reasons: preflight.risk.reasons,
        evidenceRefs: taskOperationPreflightRefs(preflight),
      },
    } : {}),
    evidence: { status: evidenceStatus, reasons: evidenceReasons },
    flows,
    requiredContextPaths: input.taskPact?.requiredContextPaths ?? [],
    ...(input.requestedProfile ? { requestedProfile: input.requestedProfile } : {}),
    ...(input.escalation ? { escalation: input.escalation } : {}),
  });

  return {
    plan,
    warnings: evidenceStatus === "complete"
      ? []
      : [`task-operation-evidence-${evidenceStatus}: ${evidenceReasons.join(" ")}`],
  };
}

function taskOperationPreflightRefs(preflight: PreflightPacket): string[] {
  return [...new Set([
    ...preflight.resolutionTrace.flatMap((entry) => entry.sourceRef
      ? [`${entry.sourceRef.type}:${entry.sourceRef.id}`]
      : []),
    ...preflight.header.inputRefs.map((ref) => `${ref.type}:${ref.id}`),
  ])].sort().slice(0, 12);
}

type RepositoryChangeValidation = {
  result: ChangeValidationResult;
  sources: SourceRef[];
  warnings: string[];
  contextUsageRef?: ArtifactRef;
  contextClaimReceiptRef?: ArtifactRef;
};

type RepositoryChangeValidationInput = {
  task: string;
  changedPaths: string[];
  baseRef: string;
  verificationResultRefs?: string[];
  runtimeObservationRefs?: string[];
  placementVerificationRefs?: string[];
  contextUsageRef?: string;
  contextUsageClaims?: Array<{
    itemId: string;
    disposition: ContextUsageClaimDisposition;
  }>;
  contextUsageClaimant?: string;
  modelJudgments?: ChangeModelJudgment[];
};

async function validateRepositoryChange(
  root: string,
  input: RepositoryChangeValidationInput,
): Promise<RepositoryChangeValidation> {
  if ((input.contextUsageClaims?.length ?? 0) > 0 && !input.contextUsageRef) {
    throw new Error("Context usage claims require the exact ContextUsageEvent ref returned for this task.");
  }
  const store = createLocalArtifactStore(root);
  const sources: SourceRef[] = [];
  const warnings: string[] = [];
  let artifactIndexAvailable = true;
  try {
    await access(join(root, ".rekon", "registry", "artifacts.index.json"));
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      artifactIndexAvailable = false;
      warnings.push("repository-intelligence-unavailable: no Rekon artifact index exists; validation is limited to Git and current-source evidence");
    } else {
      throw error;
    }
  }

  let contextUsage: ContextUsageEvent | undefined;
  let contextUsageRef: ArtifactRef | undefined;
  if (input.contextUsageRef) {
    if (!artifactIndexAvailable) {
      throw new Error("An explicit context usage ref requires an initialized Rekon artifact index.");
    }
    const entry = await findArtifactEntry(store, input.contextUsageRef);
    if (entry.type !== "ContextUsageEvent") {
      throw new Error(`Expected ContextUsageEvent for ${input.contextUsageRef}; found ${entry.type}.`);
    }
    contextUsage = assertContextUsageEvent(await store.read(entry));
    contextUsageRef = artifactIndexRef(entry);
    assertProofArtifactRepository(root, contextUsage.header, input.contextUsageRef);
    if (contextUsage.task.text.trim() !== input.task.trim()) {
      throw new Error(
        `Context usage ${input.contextUsageRef} belongs to a different task; pass the ref returned for this exact task.`,
      );
    }
    addValidationSource(sources, contextUsage);
    if (!sameTaskPathScope(contextUsage.task.paths, input.changedPaths)) {
      warnings.push(
        "context-usage-scope-differs: explicit delivery lineage was retained although the final changed-path set differs from the initially resolved task scope",
      );
    }
  }

  let taskPact: TaskPact | undefined;
  let taskPactRef: ArtifactRef | undefined;
  if (contextUsage?.taskPactRef) {
    const entry = await findArtifactEntry(
      store,
      `${contextUsage.taskPactRef.type}:${contextUsage.taskPactRef.id}`,
    );
    if (entry.type !== "TaskPact") {
      throw new Error(`Context usage references ${entry.type}; expected TaskPact.`);
    }
    taskPact = assertTaskPact(await store.read(entry));
    taskPactRef = artifactIndexRef(entry);
    assertProofArtifactRepository(root, taskPact.header, `${entry.type}:${entry.id}`);
    if (taskPact.task.text.trim() !== input.task.trim()) {
      throw new Error("The TaskPact linked from the explicit context usage belongs to a different task.");
    }
    addValidationSource(sources, taskPact);
  } else {
    const pactEntries = (artifactIndexAvailable ? await store.list("TaskPact") : [])
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
    for (const entry of pactEntries) {
      const candidate = await store.read(entry) as TaskPact;
      if (candidate.task.text.trim() !== input.task.trim()) continue;
      if (!sameTaskPathScope(candidate.task.paths, input.changedPaths)) continue;
      taskPact = candidate;
      taskPactRef = artifactIndexRef(entry);
      addValidationSource(sources, candidate);
      break;
    }
  }
  if (!taskPact && artifactIndexAvailable) {
    const current = await buildCurrentTaskPact(store, {
      repoId: root,
      taskText: input.task,
      paths: input.changedPaths,
      write: false,
    });
    taskPact = current.pact;
    warnings.push(...current.warnings);
  }

  let taskContextReport: TaskContextReport | undefined;
  let taskContextRef: ArtifactRef | undefined;
  if (contextUsage) {
    const entry = await findArtifactEntry(
      store,
      `${contextUsage.contextReportRef.type}:${contextUsage.contextReportRef.id}`,
    );
    if (entry.type !== "TaskContextReport") {
      throw new Error(`Context usage references ${entry.type}; expected TaskContextReport.`);
    }
    taskContextReport = assertTaskContextReport(await store.read(entry));
    taskContextRef = artifactIndexRef(entry);
    assertProofArtifactRepository(root, taskContextReport.header, `${entry.type}:${entry.id}`);
    const reportTask = createContextTaskIdentity(
      taskContextReport.task.text,
      taskContextReport.task.paths,
    );
    if (reportTask.fingerprint !== contextUsage.task.fingerprint) {
      throw new Error("ContextUsageEvent task identity does not match its TaskContextReport.");
    }
    addValidationSource(sources, taskContextReport);
  } else {
    const taskContextEntries = (artifactIndexAvailable ? await store.list("TaskContextReport") : [])
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
    for (const entry of taskContextEntries) {
      const candidate = await store.read(entry) as TaskContextReport;
      if (candidate.task.text.trim() !== input.task.trim()) continue;
      if (!sameTaskPathScope(candidate.task.paths, input.changedPaths)) continue;
      taskContextReport = candidate;
      taskContextRef = artifactIndexRef(entry);
      addValidationSource(sources, candidate);
      break;
    }
  }

  const ownershipEntry = artifactIndexAvailable
    ? await pickLatestArtifactEntry(store, "OwnershipMap")
    : undefined;
  const ownershipMap = ownershipEntry
    ? await store.read(ownershipEntry) as OwnershipMap
    : undefined;
  if (ownershipMap) addValidationSource(sources, ownershipMap);

  const graphEntry = artifactIndexAvailable
    ? await pickLatestArtifactEntry(store, "CapabilityEvidenceGraph")
    : undefined;
  const capabilityGraph = graphEntry
    ? await store.read(graphEntry) as CapabilityEvidenceGraph
    : undefined;
  if (capabilityGraph) addValidationSource(sources, capabilityGraph);

  const capabilityContractEntry = artifactIndexAvailable
    ? await pickLatestArtifactEntry(store, "CapabilityContract")
    : undefined;
  const capabilityContract = capabilityContractEntry
    ? await store.read(capabilityContractEntry) as CapabilityContract
    : undefined;
  if (capabilityContract) addValidationSource(sources, capabilityContract);

  const systemContracts: SystemContract[] = [];
  const flowContracts: FlowContract[] = [];
  for (const contract of taskPact?.contracts ?? []) {
    if (contract.contractType === "SystemContract") {
      const system = await store.read(contract.ref) as SystemContract;
      systemContracts.push(system);
      addValidationSource(sources, system);
    } else if (contract.contractType === "FlowContract") {
      const flow = await store.read(contract.ref) as FlowContract;
      flowContracts.push(flow);
      addValidationSource(sources, flow);
    }
  }

  const knownPaths = [
    ...(ownershipMap?.entries.map((entry) => entry.path) ?? []),
    ...(capabilityGraph?.nodes.filter((node) => node.kind === "file").map((node) => node.id) ?? []),
    ...(capabilityGraph?.capabilities.flatMap((capability) =>
      capability.implementedBy.filter((ref) => ref.kind === "file").map((ref) => ref.id.split("#")[0] ?? ref.id)) ?? []),
  ];
  const evidence = await collectRepositoryChangeEvidence({
    repoRoot: root,
    baseRef: input.baseRef,
    changedPaths: input.changedPaths,
    knownPaths,
  });
  warnings.push(...evidence.warnings);

  const currentSourceState = currentChangeSourceState(evidence);
  const latestSourceMtime = await latestChangedSourceMtime(root, evidence.files);
  const placementVerificationEvidence: ChangePlacementVerificationEvidence[] = [];
  for (const requested of input.placementVerificationRefs ?? []) {
    const entry = await findArtifactEntry(store, requested);
    if (entry.type !== "PlacementVerificationReport") {
      throw new Error(`Expected PlacementVerificationReport for ${requested}; found ${entry.type}.`);
    }
    const report = assertPlacementVerificationReport(await store.read(entry));
    assertProofArtifactRepository(root, report.header, requested);
    if (currentSourceState?.digest === report.sourceState.digest) {
      await assertPlacementVerificationSourceEvidence(root, report);
    }
    addValidationSource(sources, report);
    placementVerificationEvidence.push({
      ref: artifactIndexRef(entry),
      report,
    });
  }

  const verificationEvidence: ChangeVerificationEvidence[] = [];
  for (const requested of input.verificationResultRefs ?? []) {
    const entry = await findArtifactEntry(store, requested);
    if (entry.type !== "VerificationResult") {
      throw new Error(`Expected VerificationResult for ${requested}; found ${entry.type}.`);
    }
    const artifact = await store.read(entry) as VerificationResult;
    assertProofArtifactRepository(root, artifact.header, requested);
    addValidationSource(sources, artifact);
    const runRef = artifact.header.inputRefs.find((ref) => ref.type === "VerificationRun");
    const runContext = runRef
      ? await readVerificationRunContext(store, root, runRef, sources, warnings)
      : undefined;
    verificationEvidence.push(toChangeVerificationEvidence(
      artifact,
      artifactIndexRef(entry),
      currentSourceState,
      runContext,
    ));
  }

  const verificationCandidateSelection = artifactIndexAvailable
    ? await discoverCoverageVerificationCandidates(store, root, input.changedPaths, sources)
    : { candidates: [] as ChangeVerificationCandidate[], warnings: [] as string[] };
  warnings.push(...verificationCandidateSelection.warnings);

  const runtimeEvidence: ChangeRuntimeEvidence[] = [];
  for (const requested of input.runtimeObservationRefs ?? []) {
    const entry = await findArtifactEntry(store, requested);
    if (entry.type !== "RuntimeGraphObservationReport") {
      throw new Error(`Expected RuntimeGraphObservationReport for ${requested}; found ${entry.type}.`);
    }
    const artifact = await store.read(entry) as RuntimeGraphObservationReport;
    assertProofArtifactRepository(root, artifact.header, requested);
    addValidationSource(sources, artifact);
    runtimeEvidence.push({
      ref: artifactIndexRef(entry),
      freshness: proofArtifactFreshness(artifact.header.generatedAt, latestSourceMtime),
      producer: {
        id: artifact.header.producer.id,
        version: artifact.header.producer.version,
      },
      edges: artifact.edges.map((edge) => ({
        kind: edge.kind,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        observedCount: edge.observedCount,
      })),
    });
  }

  const result = validateChange({
    task: input.task,
    changedPaths: input.changedPaths,
    baseRef: evidence.resolvedBaseCommit ?? input.baseRef,
    ...(taskPact ? { taskPact } : {}),
    ...(taskPactRef ? { taskPactRef } : {}),
    ...(taskContextRef ? { taskContextRef } : {}),
    ...(ownershipMap ? { ownershipMap } : {}),
    ...(systemContracts.length > 0 ? { systemContracts } : {}),
    ...(flowContracts.length > 0 ? { flowContracts } : {}),
    ...(capabilityContract ? { capabilityContract } : {}),
    ...(capabilityGraph ? { capabilityGraph } : {}),
    ...(taskContextReport ? {
      taskChecks: taskContextReport.verificationHints
        .filter((hint): hint is typeof hint & { command: string } =>
          typeof hint.command === "string" && hint.command.trim().length > 0)
        .map((hint) => ({
          command: hint.command,
          sourceId: taskContextReport.header.artifactId,
          ...(hint.evidenceRefs.length > 0 ? { evidenceRefs: hint.evidenceRefs } : {}),
        })),
    } : {}),
    ...(verificationCandidateSelection.candidates.length > 0
      ? { verificationCandidates: verificationCandidateSelection.candidates }
      : {}),
    files: evidence.files,
    dependencyChanges: evidence.dependencyChanges,
    ...(verificationEvidence.length > 0 ? { verificationEvidence } : {}),
    ...(runtimeEvidence.length > 0 ? { runtimeEvidence } : {}),
    ...(placementVerificationEvidence.length > 0 ? { placementVerificationEvidence } : {}),
    ...((input.modelJudgments?.length ?? 0) > 0 ? { modelJudgments: input.modelJudgments } : {}),
  });
  let contextClaimReceiptRef: ArtifactRef | undefined;
  if (contextUsage && contextUsageRef && (input.contextUsageClaims?.length ?? 0) > 0) {
    const receipt = buildClaimedContextUsageEvent({
      usage: contextUsage,
      usageRef: contextUsageRef,
      claims: input.contextUsageClaims ?? [],
      assertedBy: input.contextUsageClaimant ?? "rekon-task-executor",
    });
    contextClaimReceiptRef = await store.write(receipt, { category: "actions" });
    contextUsageRef = contextClaimReceiptRef;
    addValidationSource(sources, receipt);
  }
  return {
    result,
    sources: dedupeValidationSources(sources),
    warnings: [...new Set(warnings)].sort(),
    ...(contextUsageRef ? { contextUsageRef } : {}),
    ...(contextClaimReceiptRef ? { contextClaimReceiptRef } : {}),
  };
}

async function recordValidationOutcomeEvent(
  root: string,
  validation: RepositoryChangeValidation,
  proofGateRef?: ArtifactRef,
): Promise<ArtifactRef | undefined> {
  try {
    await access(join(root, ".rekon", "registry", "artifacts.index.json"));
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }

  const { result } = validation;
  const store = createLocalArtifactStore(root);
  await store.init();
  const task = createContextTaskIdentity(result.task, result.changedPaths);
  const contextUsageRefs: ArtifactRef[] = validation.contextUsageRef
    ? [validation.contextUsageRef]
    : [];
  if (!validation.contextUsageRef && result.baseline.taskContextRef) {
    const usageEntries = (await store.list("ContextUsageEvent"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
    for (const entry of usageEntries) {
      const usage = assertContextUsageEvent(await store.read(entry));
      if (!sameArtifactIdentity(usage.contextReportRef, result.baseline.taskContextRef)) continue;
      if (usage.task.fingerprint !== task.fingerprint) continue;
      contextUsageRefs.push(artifactIndexRef(entry));
    }
  }

  const proofEvidenceRefs = dedupeArtifactRefs(
    result.proofGate.results.flatMap((proof) => [...proof.evidenceRefs, ...proof.counterEvidenceRefs]),
  );
  const linkedContextUsageRefs = dedupeArtifactRefs(contextUsageRefs);
  const verificationRefs = proofEvidenceRefs.filter((ref) => ref.type === "VerificationResult");
  const runtimeObservationRefs = proofEvidenceRefs.filter((ref) => ref.type === "RuntimeGraphObservationReport");
  const sourceState = changeValidationSourceState(result);
  const status: OutcomeEvent["status"] = result.status === "blocked"
    || result.proofGate.evaluation.status === "blocked"
    ? "blocked"
    : result.status === "passed" && result.proofGate.evaluation.status === "satisfied"
      ? "verified"
      : "incomplete";
  const observationKey = `validation:${digestJson({
    task: task.fingerprint,
    sourceState: sourceState?.digest ?? null,
    status,
    proofGateRef: proofGateRef ? `${proofGateRef.type}:${proofGateRef.id}` : null,
    proof: result.proofGate.results,
    contextUsageRefs: linkedContextUsageRefs.map((ref) => `${ref.type}:${ref.id}`),
  })}`;
  const priorObservationKeys = new Set<string>();
  for (const entry of await store.list("OutcomeEvent")) {
    const prior = assertOutcomeEvent(await store.read(entry));
    if (prior.phase !== "validation-attempt" || prior.task.fingerprint !== task.fingerprint) continue;
    if (prior.observationKey && prior.observationKey !== observationKey) {
      priorObservationKeys.add(prior.observationKey);
    }
  }

  const generatedAt = new Date().toISOString();
  const inputRefs = dedupeArtifactRefs([
    ...linkedContextUsageRefs,
    ...(result.baseline.taskContextRef ? [result.baseline.taskContextRef] : []),
    ...(result.baseline.taskPactRef ? [result.baseline.taskPactRef] : []),
    ...(proofGateRef ? [proofGateRef] : []),
    ...proofEvidenceRefs,
  ]);
  const evaluation = result.proofGate.evaluation.summary;
  const event = createOutcomeEvent({
    header: {
      artifactType: "OutcomeEvent",
      artifactId: `outcome-validation-${digestJson(observationKey).slice(0, 24)}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root, paths: task.paths },
      producer: { id: "@rekon/cli.change-validation", version: "1.0.0" },
      inputRefs,
      supersession: { key: `outcome-validation:${task.fingerprint}` },
      freshness: { status: sourceState ? "fresh" : "unknown" },
      provenance: {
        confidence: 1,
        notes: ["Records repository-local validation evidence; it does not claim a user or business outcome."],
      },
    },
    task,
    phase: "validation-attempt",
    status,
    grounding: "repository-proof",
    observationKey,
    contextUsageRefs: linkedContextUsageRefs,
    ...(result.baseline.taskPactRef ? { taskPactRef: result.baseline.taskPactRef } : {}),
    ...(sourceState ? { sourceState } : {}),
    ...(proofGateRef ? { proofGateRef } : {}),
    verificationRefs,
    runtimeObservationRefs,
    externalEvidenceRefs: [],
    summary: {
      requiredObligations: evaluation.required,
      satisfied: evaluation.satisfied,
      blocked: evaluation.blocked,
      unresolved: evaluation.unresolved,
      contractViolations: result.blockingViolations.length,
      reworkAttempt: priorObservationKeys.size,
    },
    notes: [...new Set([
      `Validation status: ${result.status}; proof gate: ${result.proofGate.evaluation.status}.`,
      ...validation.warnings,
      ...result.proofGate.warnings,
    ])].sort(),
  });
  return store.write(event, { category: "actions" });
}

function changeValidationSourceState(result: ChangeValidationResult): SourceStateBinding | undefined {
  if (result.baseline.files.length === 0) return undefined;
  const files: SourceStateFile[] = [];
  for (const file of result.baseline.files) {
    if (file.status === "unavailable") return undefined;
    files.push({
      path: file.path,
      status: file.status,
      ...(file.beforeSha256 ? { beforeSha256: file.beforeSha256 } : {}),
      ...(file.afterSha256 ? { afterSha256: file.afterSha256 } : {}),
    });
  }
  return createSourceStateBinding({ baseRef: result.baseRef, files });
}

function sameTaskPathScope(left: string[], right: string[]): boolean {
  const normalize = (paths: string[]) => [...new Set(paths
    .map((path) => path.replace(/\\/g, "/").replace(/^\.\//u, "").trim())
    .filter(Boolean))].sort();
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function assertProofArtifactRepository(root: string, header: ArtifactHeader, requested: string): void {
  const accepted = new Set([subjectRepoIdFromStore(createLocalArtifactStore(root)), resolve(root)]);
  if (!accepted.has(header.subject.repoId)) {
    throw new Error(
      `Proof artifact ${requested} belongs to repository ${header.subject.repoId}; expected ${[...accepted].join(" or ")}.`,
    );
  }
}

async function latestChangedSourceMtime(
  root: string,
  files: ChangeValidationResult["baseline"]["files"],
): Promise<number | undefined> {
  let latest: number | undefined;
  for (const file of files) {
    if (file.status === "unavailable") return undefined;
    try {
      const absolutePath = join(root, file.path);
      const metadata = await stat(file.status === "deleted" ? dirname(absolutePath) : absolutePath);
      latest = latest === undefined ? metadata.mtimeMs : Math.max(latest, metadata.mtimeMs);
    } catch {
      return undefined;
    }
  }
  return latest;
}

function toChangeVerificationEvidence(
  artifact: VerificationResult,
  ref: ArtifactRef,
  currentSourceState: SourceStateBinding | undefined,
  runContext?: { ref: ArtifactRef; run: VerificationRunArtifact },
): ChangeVerificationEvidence {
  const completionTimes = artifact.commandResults
    .map((result) => result.completedAt ? Date.parse(result.completedAt) : Number.NaN)
    .filter(Number.isFinite);
  const proofTime = completionTimes.length > 0
    ? Math.min(...completionTimes)
    : Date.parse(artifact.recordedAt || artifact.header.generatedAt);
  const generatedAt = Number.isFinite(proofTime)
    ? new Date(proofTime).toISOString()
    : artifact.header.generatedAt;
  const runnerDerived = artifact.header.inputRefs.some((inputRef) => inputRef.type === "VerificationRun")
    || artifact.header.producer.id === "@rekon/capability-verify";
  const validBoundState = artifact.sourceState && validateSourceStateBinding(artifact.sourceState).ok
    ? artifact.sourceState
    : undefined;
  return {
    ref,
    generatedAt,
    freshness: validBoundState && currentSourceState
      ? validBoundState.digest === currentSourceState.digest ? "fresh" : "stale"
      : "unknown",
    provenance: runnerDerived ? "runner-derived" : "recorded",
    ...(validBoundState ? { sourceStateDigest: validBoundState.digest } : {}),
    verifier: {
      id: artifact.recordedBy ?? artifact.header.producer.id,
      version: artifact.header.producer.version,
    },
    ...(runContext ? { verificationRunRef: runContext.ref } : {}),
    commandResults: artifact.commandResults.map((result) => {
      const diagnostic = runContext
        ? verificationDiagnosticForCommand(runContext.run, result.command)
        : undefined;
      const notes = result.notes
        ? redactVerificationRunStreamText(result.notes).text
        : undefined;
      return {
        command: result.command,
        status: result.status,
        ...(result.completedAt ? { completedAt: result.completedAt } : {}),
        ...(notes ? { notes } : {}),
        ...(diagnostic ? { diagnostic } : {}),
      };
    }),
  };
}

async function readVerificationRunContext(
  store: ReturnType<typeof createLocalArtifactStore>,
  root: string,
  ref: ArtifactRef,
  sources: SourceRef[],
  warnings: string[],
): Promise<{ ref: ArtifactRef; run: VerificationRunArtifact } | undefined> {
  try {
    const candidate = await store.read(ref);
    const validation = validateVerificationRun(candidate);
    if (!validation.ok) {
      warnings.push(
        `verification-run-invalid: ${ref.type}:${ref.id} ${validation.issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("; ")}`,
      );
      return undefined;
    }
    assertProofArtifactRepository(root, validation.value.header, `${ref.type}:${ref.id}`);
    addValidationSource(sources, validation.value);
    return { ref, run: validation.value };
  } catch (error) {
    warnings.push(
      `verification-run-unavailable: ${ref.type}:${ref.id} ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function verificationDiagnosticForCommand(
  run: VerificationRunArtifact,
  command: string,
): ChangeVerificationDiagnostic | undefined {
  const normalized = command.trim().replace(/\s+/gu, " ");
  const result = run.commands.find((candidate) =>
    candidate.command.trim().replace(/\s+/gu, " ") === normalized);
  if (!result) return undefined;

  const selected = result.stderrExcerpt?.text.trim()
    ? { stream: "stderr" as const, excerpt: result.stderrExcerpt }
    : result.stdoutExcerpt?.text.trim()
      ? { stream: "stdout" as const, excerpt: result.stdoutExcerpt }
      : result.notes?.trim()
        ? {
            stream: "notes" as const,
            excerpt: { text: result.notes, redacted: false, truncated: false },
          }
        : undefined;
  if (!selected) return undefined;

  const redacted = redactVerificationRunStreamText(selected.excerpt.text).text.trim();
  if (!redacted) return undefined;
  const bounded = redacted.slice(0, 1600);
  return {
    stream: selected.stream,
    excerpt: bounded,
    truncated: selected.excerpt.truncated || redacted.length > bounded.length,
  };
}

async function discoverCoverageVerificationCandidates(
  store: ReturnType<typeof createLocalArtifactStore>,
  root: string,
  changedPaths: string[],
  sources: SourceRef[],
): Promise<{ candidates: ChangeVerificationCandidate[]; warnings: string[] }> {
  const warnings: string[] = [];
  const normalizedChangedPaths = new Set(changedPaths.flatMap((path) => {
    try {
      return [normalizeProofPath(path)];
    } catch {
      return [];
    }
  }));
  if (normalizedChangedPaths.size === 0) return { candidates: [], warnings };

  const entries = (await store.list("RuntimeGraphObservationReport"))
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))
    .slice(0, 12);
  const candidates = new Map<string, ChangeVerificationCandidate>();
  for (const entry of entries) {
    let report: RuntimeGraphObservationReport;
    try {
      const candidate = await store.read(entry);
      const validation = validateRuntimeGraphObservationReport(candidate);
      if (!validation.ok) {
        warnings.push(
          `coverage-observation-invalid: RuntimeGraphObservationReport:${entry.id} ${validation.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ")}`,
        );
        continue;
      }
      report = validation.value;
      assertProofArtifactRepository(root, report.header, `RuntimeGraphObservationReport:${entry.id}`);
    } catch (error) {
      warnings.push(
        `coverage-observation-unavailable: RuntimeGraphObservationReport:${entry.id} ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    for (const coverage of report.source.coverageSources ?? []) {
      if (coverage.isolated !== true
        || coverage.commandStatus !== "passed"
        || !coverage.verificationRunRef
        || !coverage.commandId) continue;

      const coveredPaths = (coverage.fileCoverage ?? []).flatMap((file) => {
        let path: string;
        try {
          path = normalizeProofPath(file.path);
        } catch {
          return [];
        }
        const observed = file.statements.covered + file.functions.covered + file.branches.covered;
        return normalizedChangedPaths.has(path) && observed > 0 ? [path] : [];
      });
      const paths = [...new Set(coveredPaths)].sort();
      if (paths.length === 0) continue;

      const runContext = await readVerificationRunContext(
        store,
        root,
        coverage.verificationRunRef,
        [],
        warnings,
      );
      if (!runContext) continue;
      const runCommand = runContext.run.commands.find((command) => command.id === coverage.commandId);
      if (!runCommand
        || runCommand.status !== "passed"
        || !runCommand.argv.some((argument) =>
          verificationArgumentMatchesPath(root, argument, coverage.testPath))) {
        warnings.push(
          `coverage-observation-run-mismatch: RuntimeGraphObservationReport:${entry.id} does not link command ${coverage.commandId} to a passed VerificationRun command that names ${coverage.testPath}`,
        );
        continue;
      }

      const reportRef = artifactIndexRef(entry);
      const evidenceRefs = dedupeArtifactRefs([reportRef, runContext.ref]);
      const command = runCommand.command.trim().replace(/\s+/gu, " ");
      const key = `${command}\0${paths.join("\0")}`;
      if (!command || candidates.has(key)) continue;
      candidates.set(key, {
        command,
        sourceType: "coverage-observation",
        sourceId: `${entry.id}:${coverage.digest}`,
        reason: `A prior isolated ${coverage.format} run for ${coverage.testPath} observed the changed source. The command must be rerun against the current source state.`,
        paths,
        evidenceRefs,
      });
      addValidationSource(sources, report);
      addValidationSource(sources, runContext.run);
    }
  }

  return {
    candidates: [...candidates.values()].sort((left, right) =>
      left.command.localeCompare(right.command) || left.sourceId.localeCompare(right.sourceId)),
    warnings: [...new Set(warnings)].sort(),
  };
}

function currentChangeSourceState(
  evidence: Awaited<ReturnType<typeof collectRepositoryChangeEvidence>>,
): SourceStateBinding | undefined {
  if (!evidence.resolvedBaseCommit || evidence.files.length === 0) return undefined;
  const files: SourceStateFile[] = [];
  for (const file of evidence.files) {
    if (file.status === "unavailable") return undefined;
    files.push({
      path: file.path,
      status: file.status,
      ...(file.beforeSha256 ? { beforeSha256: file.beforeSha256 } : {}),
      ...(file.afterSha256 ? { afterSha256: file.afterSha256 } : {}),
    });
  }
  return createSourceStateBinding({ baseRef: evidence.resolvedBaseCommit, files });
}

async function assertPlacementVerificationSourceEvidence(
  root: string,
  report: PlacementVerificationReport,
): Promise<void> {
  for (const evidence of report.sourceEvidence) {
    const source = await resolveReadableRepoFile(
      root,
      evidence.path,
      "rekon context validate-change",
      "placement evidence file",
    );
    const content = await readFile(source.absolutePath, "utf8");
    const digest = createHash("sha256").update(content).digest("hex");
    if (digest !== evidence.sha256) {
      throw new Error(
        `Placement verification ${report.header.artifactId} does not match current source at ${evidence.path}.`,
      );
    }
    const lines = content.split(/\r?\n/u);
    const excerpt = lines.slice(evidence.lineStart - 1, evidence.lineEnd).join("\n");
    if (excerpt !== evidence.excerpt) {
      throw new Error(
        `Placement verification ${report.header.artifactId} cites a source excerpt that does not match `
        + `${evidence.path}:${evidence.lineStart}-${evidence.lineEnd}.`,
      );
    }
  }
}

function proofArtifactFreshness(
  generatedAt: string,
  latestSourceMtime: number | undefined,
): ChangeRuntimeEvidence["freshness"] {
  return proofTimeFreshness(Date.parse(generatedAt), latestSourceMtime);
}

function proofTimeFreshness(
  proofTime: number,
  latestSourceMtime: number | undefined,
): "fresh" | "stale" | "unknown" {
  if (!Number.isFinite(proofTime)) return "unknown";
  if (latestSourceMtime === undefined) return "unknown";
  return proofTime + 1 >= latestSourceMtime ? "fresh" : "stale";
}

function addValidationSource(sources: SourceRef[], artifact: { header: ArtifactHeader }): void {
  const status = artifact.header.freshness?.status;
  sources.push({
    artifactType: artifact.header.artifactType,
    artifactId: artifact.header.artifactId,
    generatedAt: artifact.header.generatedAt,
    freshness: status === "fresh" || status === "stale" || status === "partial" || status === "unknown"
      ? status
      : "unknown",
  });
}

function dedupeValidationSources(sources: SourceRef[]): SourceRef[] {
  return [...new Map(sources.map((source) => [
    `${source.artifactType}:${source.artifactId ?? ""}`,
    source,
  ])).values()];
}

function renderChangeValidation(result: ChangeValidationResult): string {
  const lines = [
    `Change validation: ${result.status}`,
    `Changed paths: ${result.changedPaths.join(", ") || "none"}`,
    `Proof gate: ${result.proofGate.evaluation.status} (${result.proofGate.evaluation.summary.satisfied}/${result.proofGate.evaluation.summary.required} required obligations satisfied)`,
  ];
  if (result.affectedSystems.length > 0) lines.push(`Affected systems: ${result.affectedSystems.join(", ")}`);
  if (result.affectedFlows.length > 0) lines.push(`Affected flows: ${result.affectedFlows.join(", ")}`);
  if (result.blockingViolations.length > 0) {
    lines.push("", "Blocking violations:");
    for (const entry of result.blockingViolations) lines.push(`- ${entry.code}: ${entry.message}`);
  }
  if (result.unresolvedSemanticObligations.length > 0) {
    lines.push("", "Unresolved semantic obligations:");
    for (const entry of result.unresolvedSemanticObligations) lines.push(`- ${entry.statement} (${entry.reason})`);
  }
  if (result.requiredChecks.length > 0) {
    lines.push("", "Selected verification:");
    for (const check of result.checkSelection.checks) {
      lines.push(`- ${check.command} [${check.kind}; ${check.selection}]`);
      for (const reason of [...new Set(check.requirements.map((entry) => entry.reason))]) {
        lines.push(`  ${reason}`);
      }
    }
  }
  if (result.correctiveContext.entries.length > 0) {
    lines.push("", "Focused corrective context:");
    for (const entry of result.correctiveContext.entries) {
      lines.push(`- ${entry.summary}`);
      if (entry.paths.length > 0) lines.push(`  Paths: ${entry.paths.join(", ")}`);
      if (entry.obligationIds.length > 0) lines.push(`  Proof: ${entry.obligationIds.join(", ")}`);
      if (entry.diagnostic) lines.push(`  ${entry.diagnostic.stream}: ${entry.diagnostic.excerpt}`);
      lines.push(`  Next: ${entry.nextAction}`);
    }
  }
  if (result.proofGate.warnings.length > 0) {
    lines.push("", "Proof warnings:", ...result.proofGate.warnings.map((warning) => `- ${warning}`));
  }
  lines.push("", "Validation executed no checks and wrote no source files.");
  return lines.join("\n");
}

function projectChangeValidationDecision(result: ChangeValidationResult) {
  return {
    status: result.status,
    blockingViolations: result.blockingViolations,
    unresolvedSemanticObligations: result.unresolvedSemanticObligations,
    proofGate: result.proofGate,
    requiredChecks: result.requiredChecks,
    checkSelection: result.checkSelection,
    correctiveContext: result.correctiveContext,
  };
}

async function recordChangeProofGate(root: string, result: ChangeValidationResult): Promise<ArtifactRef> {
  if (result.status !== "passed" || result.proofGate.evaluation.status !== "satisfied") {
    throw new Error("Only a satisfied change proof gate can be recorded.");
  }
  const files = result.baseline.files.map((file) => {
    if (file.status !== "added" && file.status !== "modified" && file.status !== "deleted") {
      throw new Error(`Cannot record proof for ${file.path} with status ${file.status}.`);
    }
    return {
      path: file.path,
      status: file.status,
      ...(file.beforeSha256 ? { beforeSha256: file.beforeSha256 } : {}),
      ...(file.afterSha256 ? { afterSha256: file.afterSha256 } : {}),
    };
  });
  const inputRefs = dedupeArtifactRefs([
    ...(result.baseline.taskPactRef ? [result.baseline.taskPactRef] : []),
    ...result.proofGate.obligations.flatMap((obligation) => obligation.sourceRefs),
    ...result.proofGate.results.flatMap((proof) => [...proof.evidenceRefs, ...proof.counterEvidenceRefs]),
  ]);
  const generatedAt = new Date().toISOString();
  const report: ProofGateReport = createProofGateReport({
    header: {
      artifactType: "ProofGateReport",
      artifactId: `proof-gate-${digestJson({
        task: result.task,
        baseRef: result.baseRef,
        files,
        obligations: result.proofGate.obligations,
        results: result.proofGate.results,
      }).slice(0, 20)}`,
      schemaVersion: "1.0.0",
      generatedAt,
      supersession: { key: `change-proof:${digestJson({ task: result.task, paths: result.changedPaths }).slice(0, 20)}` },
      subject: { repoId: root, paths: result.changedPaths },
      producer: { id: "@rekon/cli.change-validation", version: "1.0.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: {
        confidence: 1,
        notes: ["Bound to the recorded post-edit source digests and explicit verifier results."],
      },
    },
    task: { text: result.task, paths: result.changedPaths },
    sourceState: { baseRef: result.baseRef, files },
    obligations: result.proofGate.obligations,
    results: result.proofGate.results,
  });
  const store = createLocalArtifactStore(root);
  await store.init();
  return store.write(report, { category: "actions" });
}

async function recordAcceptedProofOutcome(
  root: string,
  proofGate: ValidatedProofGateForRefresh,
): Promise<ArtifactRef> {
  const store = createLocalArtifactStore(root);
  await store.init();
  const task = createContextTaskIdentity(proofGate.report.task.text, proofGate.report.task.paths);
  let validationEvent: OutcomeEvent | undefined;
  let validationEventRef: ArtifactRef | undefined;
  const outcomeEntries = (await store.list("OutcomeEvent"))
    .slice()
    .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
  for (const entry of outcomeEntries) {
    const candidate = assertOutcomeEvent(await store.read(entry));
    if (candidate.phase !== "validation-attempt" || candidate.status !== "verified") continue;
    if (!candidate.proofGateRef || !sameArtifactIdentity(candidate.proofGateRef, proofGate.ref)) continue;
    validationEvent = candidate;
    validationEventRef = artifactIndexRef(entry);
    break;
  }

  const proofEvidenceRefs = dedupeArtifactRefs(
    proofGate.report.results.flatMap((result) => [...result.evidenceRefs, ...result.counterEvidenceRefs]),
  );
  const verificationRefs = proofEvidenceRefs.filter((ref) => ref.type === "VerificationResult");
  const runtimeObservationRefs = proofEvidenceRefs.filter((ref) => ref.type === "RuntimeGraphObservationReport");
  const sourceState = proofGate.report.sourceState
    && validateSourceStateBinding(proofGate.report.sourceState).ok
    ? proofGate.report.sourceState as SourceStateBinding
    : undefined;
  const generatedAt = new Date().toISOString();
  const observationKey = `accepted:${proofGate.ref.type}:${proofGate.ref.id}:${sourceState?.digest ?? "unbound"}`;
  const inputRefs = dedupeArtifactRefs([
    proofGate.ref,
    ...(validationEventRef ? [validationEventRef] : []),
    ...(validationEvent?.contextUsageRefs ?? []),
    ...proofEvidenceRefs,
  ]);
  const evaluation = proofGate.report.evaluation.summary;
  const event = createOutcomeEvent({
    header: {
      artifactType: "OutcomeEvent",
      artifactId: `outcome-accepted-${digestJson(observationKey).slice(0, 24)}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId: root, paths: task.paths },
      producer: { id: "@rekon/cli.refresh", version: "1.0.0" },
      inputRefs,
      supersession: { key: `outcome-accepted:${task.fingerprint}` },
      freshness: { status: sourceState ? "fresh" : "unknown" },
      provenance: {
        confidence: 1,
        notes: ["Records the proof-gated source state admitted into this refresh; the refresh result remains the maintenance completion boundary and does not claim a user or business outcome."],
      },
    },
    task,
    phase: "proof-gated-refresh",
    status: "accepted",
    grounding: "repository-proof",
    observationKey,
    contextUsageRefs: validationEvent?.contextUsageRefs ?? [],
    ...(validationEvent?.taskPactRef ? { taskPactRef: validationEvent.taskPactRef } : {}),
    ...(sourceState ? { sourceState } : {}),
    proofGateRef: proofGate.ref,
    verificationRefs,
    runtimeObservationRefs,
    externalEvidenceRefs: [],
    summary: {
      requiredObligations: evaluation.required,
      satisfied: evaluation.satisfied,
      blocked: evaluation.blocked,
      unresolved: evaluation.unresolved,
      contractViolations: 0,
      reworkAttempt: validationEvent?.summary.reworkAttempt ?? 0,
    },
    notes: validationEvent
      ? ["Admitted after an exactly linked verified validation attempt and pre-acceptance source-state revalidation."]
      : ["Admitted after pre-acceptance source-state revalidation; no exactly linked validation OutcomeEvent was available."],
  });
  return store.write(event, { category: "actions" });
}

async function recordChangeVerificationPlan(root: string, result: ChangeValidationResult): Promise<ArtifactRef | undefined> {
  if (result.requiredChecks.length === 0) return undefined;
  const store = createLocalArtifactStore(root);
  await store.init();
  const inputRefs = dedupeArtifactRefs([
    ...(result.baseline.taskPactRef ? [result.baseline.taskPactRef] : []),
    ...result.proofGate.obligations.flatMap((obligation) => obligation.sourceRefs),
  ]);
  const generatedAt = new Date().toISOString();
  const plan: VerificationPlanLike & { proofObligationIds: string[]; baseRef: string } = {
    header: {
      artifactType: "VerificationPlan",
      artifactId: `verification-plan-change-${digestJson({
        task: result.task,
        baseRef: result.baseRef,
        files: result.baseline.files,
        checks: result.requiredChecks,
        checkSelection: result.checkSelection,
      }).slice(0, 20)}`,
      schemaVersion: "0.1.0",
      generatedAt,
      supersession: { key: `change-verification:${digestJson({ task: result.task, paths: result.changedPaths }).slice(0, 20)}` },
      subject: { repoId: subjectRepoIdFromStore(store), paths: result.changedPaths },
      producer: { id: "@rekon/cli.change-validation", version: "1.0.0" },
      inputRefs,
      freshness: { status: "fresh" },
      provenance: { confidence: 1, notes: ["Selected from the current post-edit change proof obligations."] },
    },
    commands: result.requiredChecks,
    successCriteria: result.proofGate.obligations
      .filter((obligation) => obligation.required)
      .map((obligation) => obligation.assertion),
    source: "change-validation",
    checkSelection: {
      strategy: result.checkSelection.strategy,
      fallbackUsed: result.checkSelection.fallbackUsed,
      evidenceCandidatesConsidered: result.checkSelection.evidenceCandidatesConsidered,
      evidenceBackedChecks: result.checkSelection.evidenceBackedChecks,
      uncoveredTestPaths: [...result.checkSelection.uncoveredTestPaths],
      warnings: [...result.checkSelection.warnings],
      checks: result.checkSelection.checks.map((check) => ({
        command: check.command,
        kind: check.kind,
        selection: check.selection,
        paths: [...new Set(check.requirements.flatMap((requirement) => requirement.paths))].sort(),
        reasons: [...new Set(check.requirements.map((requirement) => requirement.reason))].sort(),
        evidenceRefs: [...new Set(check.requirements.flatMap((requirement) => requirement.evidenceRefs))].sort(),
        proofObligationIds: [...check.proofObligationIds],
      })),
    },
    proofObligationIds: result.proofGate.obligations
      .filter((obligation) => obligation.required)
      .map((obligation) => obligation.id),
    baseRef: result.baseRef,
  };
  return store.write(plan, { category: "actions" });
}

type ValidatedProofGateForRefresh = {
  ref: ArtifactRef;
  changedFiles: string[];
  report: ProofGateReport;
};

async function validateProofGateForRefresh(
  root: string,
  requested: string,
  requestedChangedFiles: string[],
): Promise<ValidatedProofGateForRefresh> {
  const store = createLocalArtifactStore(root);
  await store.init();
  const entry = await findArtifactEntry(store, requested);
  if (entry.type !== "ProofGateReport") {
    throw new Error(`rekon refresh --proof-gate expected ProofGateReport; found ${entry.type}.`);
  }
  const report = assertProofGateReport(await store.read(entry));
  assertProofArtifactRepository(root, report.header, requested);
  if (report.evaluation.status !== "satisfied") {
    throw new Error(`Proof gate ${entry.id} is ${report.evaluation.status}; refresh requires satisfied proof.`);
  }
  if (!report.sourceState || report.sourceState.files.length === 0) {
    throw new Error(`Proof gate ${entry.id} has no digest-bound source state.`);
  }

  const proofPaths = report.sourceState.files.map((file) => normalizeProofPath(file.path));
  if (requestedChangedFiles.length > 0) {
    const requestedPaths = requestedChangedFiles.map(normalizeProofPath).sort();
    const expectedPaths = [...proofPaths].sort();
    if (JSON.stringify(requestedPaths) !== JSON.stringify(expectedPaths)) {
      throw new Error("rekon refresh changed-file paths must exactly match the ProofGateReport source state.");
    }
  }

  for (const file of report.sourceState.files) {
    const path = normalizeProofPath(file.path);
    const absolutePath = resolve(root, path);
    const relativePath = relative(root, absolutePath).replace(/\\/g, "/");
    if (relativePath === ".." || relativePath.startsWith("../") || isAbsolute(relativePath)) {
      throw new Error(`Proof gate path escapes the repository root: ${file.path}`);
    }
    if (file.status === "deleted") {
      try {
        await lstat(absolutePath);
      } catch (error) {
        if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      throw new Error(`Proof gate source state changed after validation: deleted path exists (${path}).`);
    }
    const selected = await resolveReadableRepoFile(root, path, "rekon refresh proof gate");
    const digest = createHash("sha256").update(await readFile(selected.absolutePath)).digest("hex");
    if (!file.afterSha256 || digest !== file.afterSha256) {
      throw new Error(`Proof gate source state changed after validation: ${path}.`);
    }
  }

  return { ref: artifactIndexRef(entry), changedFiles: proofPaths, report };
}

function normalizeProofPath(value: string): string {
  const path = value.replace(/\\/g, "/").replace(/^\.\//u, "");
  if (!path || isAbsolute(path) || path === ".." || path.startsWith("../") || path.includes("/../")) {
    throw new Error(`Invalid proof-gate source path: ${value}`);
  }
  return path;
}

function dedupeArtifactRefs(refs: ArtifactRef[]): ArtifactRef[] {
  return [...new Map(refs.map((ref) => [`${ref.type}:${ref.id}`, ref])).values()]
    .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

async function buildCurrentTaskPact(
  store: ReturnType<typeof createLocalArtifactStore>,
  input: { repoId: string; taskText: string; goal?: string; paths: string[]; write: boolean },
): Promise<CurrentTaskPact> {
  const registryEntry = await pickLatestArtifactEntry(store, "EffectiveContractRegistry");
  if (!registryEntry) {
    return {
      inputRefs: [],
      warnings: ["repository-contracts-unavailable: run `rekon contracts maintain --root . --json` and complete the source-cited agent judgment"],
    };
  }
  const registryRef = artifactIndexRef(registryEntry);
  const registry = await store.read(registryEntry) as EffectiveContractRegistry;
  const systemContracts: SystemContract[] = [];
  const flowContracts: FlowContract[] = [];
  for (const entry of registry.entries) {
    if (entry.contractType === "SystemContract") {
      systemContracts.push(await store.read(entry.ref) as SystemContract);
    } else if (entry.contractType === "FlowContract") {
      flowContracts.push(await store.read(entry.ref) as FlowContract);
    }
  }

  const driftEntry = await pickLatestArtifactEntry(store, "ContractDriftReport");
  const latestDrift = driftEntry
    ? await store.read(driftEntry) as ContractDriftReport
    : undefined;
  const driftMatchesRegistry = latestDrift
    ? sameArtifactIdentity(latestDrift.registryRef, registryRef)
    : false;
  const driftReport = driftMatchesRegistry ? latestDrift : undefined;
  const driftReportRef = driftMatchesRegistry && driftEntry ? artifactIndexRef(driftEntry) : undefined;
  const pact = buildTaskPact({
    repoId: input.repoId,
    taskText: input.taskText,
    ...(input.goal ? { goal: input.goal } : {}),
    paths: input.paths,
    registry,
    registryRef,
    systemContracts,
    flowContracts,
    ...(driftReport ? { driftReport } : {}),
    ...(driftReportRef ? { driftReportRef } : {}),
  });
  const ref = input.write ? await store.write(pact, { category: "actions" }) : undefined;
  const warnings = [...pact.warnings];
  if (systemContracts.length === 0 && flowContracts.length === 0) {
    warnings.push("repository-contracts-unavailable: the effective registry has no adopted system or flow law; run `rekon contracts maintain --root . --json` and complete the source-cited agent judgment");
  }
  if (latestDrift && !driftMatchesRegistry) {
    warnings.push("repository-contract-drift-unavailable: latest ContractDriftReport targets an older effective registry");
  }
  return {
    pact,
    ref,
    inputRefs: [registryRef, ...(driftReportRef ? [driftReportRef] : []), ...(ref ? [ref] : [])],
    warnings,
  };
}

function sameArtifactIdentity(left: ArtifactRef, right: ArtifactRef): boolean {
  return left.type === right.type && left.id === right.id && left.schemaVersion === right.schemaVersion;
}

async function selectContractArtifactEntry(
  store: ReturnType<typeof createLocalArtifactStore>,
  artifactType: "ContractCandidateReport" | "ContractJudgmentReport",
  requested: unknown,
): Promise<ArtifactIndexEntry> {
  const entries = await store.list(artifactType);
  if (entries.length === 0) throw new Error(`No ${artifactType} is indexed.`);
  if (requested !== undefined && typeof requested !== "string") {
    throw new Error(`--${artifactType === "ContractCandidateReport" ? "candidate-report" : "judgment-report"} requires an artifact id.`);
  }
  if (typeof requested === "string" && requested.trim()) {
    const id = requested.trim().replace(new RegExp(`^${artifactType}:`, "u"), "");
    const selected = entries.find((entry) => entry.id === id);
    if (!selected) throw new Error(`${artifactType} not found: ${requested}.`);
    return selected;
  }
  return [...entries].sort((left, right) => compareArtifactIndexRecency(right, left))[0]!;
}

function artifactIndexRef(entry: ArtifactIndexEntry): ArtifactRef {
  return {
    type: entry.type,
    id: entry.id,
    schemaVersion: entry.schemaVersion,
    path: entry.path,
    digest: entry.digest,
  };
}

type RepositoryContractJudgeIdentity = {
  id: string;
  version: string;
  mode: "deterministic" | "agent" | "provider";
  model?: string;
};

async function writeRepositoryContractJudgment(input: {
  root: string;
  store: ReturnType<typeof createLocalArtifactStore>;
  candidateEntry: ArtifactIndexEntry;
  inputPath: string;
  judge: RepositoryContractJudgeIdentity;
}): Promise<{ report: ContractJudgmentReport; artifact: ArtifactRef }> {
  const candidateReport = assertContractCandidateReport(await input.store.read(input.candidateEntry));
  const candidateReportRef = artifactIndexRef(input.candidateEntry);
  await assertContractCandidateCurrent(input.store, candidateReportRef, "judging");
  const draftInput = await readRepositoryJsonInput(input.root, input.inputPath);
  const drafts = coerceRepositoryContractJudgmentDrafts(draftInput, candidateReport);
  const candidateById = new Map(candidateReport.candidates.map((candidate) => [candidate.id, candidate]));
  const judgments = [];
  for (const draft of drafts) {
    const candidate = candidateById.get(draft.candidateId);
    if (!candidate) throw new Error(`Judgment references unknown candidate ${draft.candidateId}.`);
    judgments.push({
      candidateId: draft.candidateId,
      decision: draft.decision,
      confidence: draft.confidence,
      rationale: draft.rationale,
      citations: await bindContractJudgmentCitations(input.root, draft.citations),
      evidenceRefs: candidate.evidenceRefs,
      ...(draft.proposed ? { proposed: draft.proposed } : {}),
    });
  }
  const generatedAt = new Date().toISOString();
  const report = createContractJudgmentReport({
    header: {
      artifactType: "ContractJudgmentReport",
      artifactId: `contract-judgment-report-${generatedAt.replace(/[^0-9A-Za-z]/gu, "")}`,
      schemaVersion: "1.0.0",
      generatedAt,
      subject: { repoId: input.root },
      producer: { id: "@rekon/cli.contract-judge", version: "1.0.0" },
      inputRefs: [candidateReportRef],
      supersession: { key: `contract-judgments:${candidateReportRef.id}` },
      freshness: { status: "fresh" },
      provenance: {
        confidence: judgments.length > 0 ? Math.max(...judgments.map((judgment) => judgment.confidence)) : 0,
        notes: ["agent judgment bound to current source digests"],
      },
    },
    candidateReportRef,
    judge: {
      ...input.judge,
      promptVersion: REPOSITORY_CONTRACT_JUDGMENT_PROMPT_VERSION,
    },
    judgments,
  });
  const artifact = await input.store.write(report, { category: "actions" });
  return { report, artifact };
}

async function applyRepositoryContractJudgment(input: {
  root: string;
  store: ReturnType<typeof createLocalArtifactStore>;
  judgmentEntry: ArtifactIndexEntry;
  candidateReport?: string;
  apply: boolean;
}) {
  const judgmentReport = assertContractJudgmentReport(await input.store.read(input.judgmentEntry));
  const candidateEntry = await selectContractArtifactEntry(
    input.store,
    "ContractCandidateReport",
    input.candidateReport ?? judgmentReport.candidateReportRef.id,
  );
  const candidateReport = assertContractCandidateReport(await input.store.read(candidateEntry));
  const candidateReportRef = artifactIndexRef(candidateEntry);
  const judgmentReportRef = artifactIndexRef(input.judgmentEntry);
  assertArtifactRefLineage(judgmentReport.candidateReportRef, candidateReportRef, "Contract judgment candidate lineage");
  await assertContractCandidateCurrent(input.store, candidateReportRef, "adoption");

  const config = await readConfig(input.root);
  const adoption = config.contracts?.adoption;
  if (input.apply && adoption?.allowSourceWrites !== true) {
    throw new Error("Contract source adoption is disabled. Set contracts.adoption.allowSourceWrites to true in .rekon/config.json before using --apply.");
  }
  const minimumConfidence = boundedConfigConfidence(adoption?.minimumConfidence, 0.8);
  const allowedJudgeModes = new Set(adoption?.allowedJudgeModes ?? ["agent", "provider"]);
  const judgments = new Map(judgmentReport.judgments.map((judgment) => [judgment.candidateId, judgment]));
  const effectiveRegistry = await readLatestArtifactOrUndefined<EffectiveContractRegistry>(input.store, "EffectiveContractRegistry");
  const existingSourceByContract = new Map<string, string>();
  for (const entry of effectiveRegistry?.entries ?? []) {
    if (entry.contractType !== "SystemContract" && entry.contractType !== "FlowContract") continue;
    const existing = await input.store.read(entry.ref) as SystemContract | FlowContract;
    if (existing.source.path) existingSourceByContract.set(`${entry.contractType}:${entry.contractId}`, existing.source.path);
  }
  const operations: ContractAdoptionOperation[] = [];

  for (const candidate of candidateReport.candidates) {
    const judgment = judgments.get(candidate.id);
    const contractType = candidate.kind === "system" ? "SystemContract" : "FlowContract";
    const existingSourcePath = existingSourceByContract.get(`${contractType}:${candidate.targetId}`);
    const sourcePath = existingSourcePath ?? repositoryContractAdoptionPath(candidate.kind, candidate.targetId);
    if (!judgment) {
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "blocked", reason: "No judgment exists for this candidate." });
      continue;
    }
    if (!allowedJudgeModes.has(judgmentReport.judge.mode)) {
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "blocked", reason: `Judge mode ${judgmentReport.judge.mode} is not allowed by adoption policy.` });
      continue;
    }
    if (judgment.decision !== "accept") {
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "skipped", reason: `Judgment decision is ${judgment.decision}.` });
      continue;
    }
    if (judgment.confidence < minimumConfidence) {
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "blocked", reason: `Judgment confidence ${judgment.confidence} is below ${minimumConfidence}.` });
      continue;
    }
    if (!judgment.proposed) {
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "blocked", reason: "Accepted judgment has no repository-native contract proposal." });
      continue;
    }
    if (existingSourcePath && !existingSourcePath.startsWith("rekon/contracts/")) {
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "blocked", reason: "Rekon will not automatically replace a co-located or externally configured contract source.", sourcePath });
      continue;
    }
    const citationsCurrent = await contractJudgmentCitationsAreCurrent(input.root, judgment.citations);
    if (!citationsCurrent) {
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "blocked", reason: "One or more judgment citations no longer match current source." });
      continue;
    }
    const document = contractSourceDocumentForAdoption(candidate.kind, candidate.targetId, judgment.proposed);
    const sourceDigest = digestJson(`${JSON.stringify(document, null, 2)}\n`);
    if (!input.apply) {
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "planned", reason: "Accepted judgment is eligible for adoption.", sourcePath, sourceDigest });
      continue;
    }
    try {
      const written = await writeRepositoryContractSource({ repoRoot: input.root, path: sourcePath, document, overwrite: Boolean(existingSourcePath) });
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "adopted", reason: "Accepted agent judgment was written as committed repository law.", sourcePath: written.path, sourceDigest: written.digest });
    } catch (error) {
      operations.push({ candidateId: candidate.id, contractType, contractId: candidate.targetId, status: "blocked", reason: error instanceof Error ? error.message : String(error), sourcePath, sourceDigest });
    }
  }

  const generatedAt = new Date().toISOString();
  const report = createContractAdoptionReport({
    header: {
      artifactType: "ContractAdoptionReport",
      artifactId: `contract-adoption-report-${generatedAt.replace(/[^0-9A-Za-z]/gu, "")}`,
      schemaVersion: "1.0.0",
      generatedAt,
      subject: { repoId: input.root },
      producer: { id: "@rekon/cli.contract-adopt", version: "1.0.0" },
      inputRefs: [candidateReportRef, judgmentReportRef],
      supersession: { key: `contract-adoption:${candidateReportRef.id}` },
      freshness: { status: operations.some((operation) => operation.status === "blocked") ? "partial" : "fresh" },
      provenance: { notes: [input.apply ? "permissioned source adoption" : "source adoption dry-run"] },
    },
    candidateReportRef,
    judgmentReportRef,
    mode: input.apply ? "apply" : "dry-run",
    operations,
  });
  const artifact = await input.store.write(report, { category: "actions" });
  const compiled = input.apply && report.summary.adopted > 0
    ? await compileRepositoryContracts(input.root, input.store)
    : undefined;
  return { report, artifact, compiled, candidateEntry };
}

async function assertContractCandidateCurrent(
  store: ReturnType<typeof createLocalArtifactStore>,
  candidateReportRef: ArtifactRef,
  operation: "judging" | "adoption",
): Promise<void> {
  const freshness = await validateArtifactFreshness(store);
  const candidateFreshness = freshness.artifacts.find((artifact) =>
    artifact.type === candidateReportRef.type && artifact.id === candidateReportRef.id);
  if (!candidateFreshness || candidateFreshness.status !== "fresh") {
    const reasons = candidateFreshness?.issues.map((issue) => issue.code).join(", ") || "freshness unavailable";
    throw new Error(`Contract candidate report is not current for ${operation} (${reasons}). Run \`rekon contracts maintain --root . --json\` again.`);
  }
}

async function readRepositoryJsonInput(root: string, path: string): Promise<unknown> {
  if (isAbsolute(path)) throw new Error("Contract judgment input must be a repository-relative path.");
  const source = await readCurrentRepoSource(root, path);
  if (!source) throw new Error(`Contract judgment input is missing, unsafe, or outside the repository: ${path}.`);
  try {
    return JSON.parse(source.text) as unknown;
  } catch (error) {
    throw new Error(`Contract judgment input is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function bindContractJudgmentCitations(
  root: string,
  drafts: RepositoryContractJudgmentDraftCitation[],
): Promise<ContractJudgmentCitation[]> {
  const citations: ContractJudgmentCitation[] = [];
  for (const draft of drafts) {
    const source = await readCurrentRepoSource(root, draft.path);
    if (!source) throw new Error(`Contract judgment citation is missing, unsafe, or outside the repository: ${draft.path}.`);
    const lines = source.text.split(/\r?\n/u);
    if (draft.lineStart !== undefined && draft.lineStart > lines.length) {
      throw new Error(`Contract judgment citation ${draft.path}:${draft.lineStart} is outside the current source.`);
    }
    const end = draft.lineEnd ?? draft.lineStart;
    if (end !== undefined && end > lines.length) {
      throw new Error(`Contract judgment citation ${draft.path}:${end} is outside the current source.`);
    }
    const boundedExcerpt = draft.lineStart === undefined
      ? undefined
      : lines.slice(draft.lineStart - 1, end).join("\n");
    if (draft.excerpt && !(boundedExcerpt ?? source.text).includes(draft.excerpt)) {
      throw new Error(`Contract judgment citation excerpt no longer matches ${draft.path}.`);
    }
    citations.push({
      path: draft.path,
      digest: source.sha256,
      ...(draft.lineStart !== undefined ? { lineStart: draft.lineStart } : {}),
      ...(draft.lineEnd !== undefined ? { lineEnd: draft.lineEnd } : {}),
      ...(draft.excerpt ? { excerpt: draft.excerpt } : boundedExcerpt ? { excerpt: boundedExcerpt } : {}),
    });
  }
  return citations;
}

async function contractJudgmentCitationsAreCurrent(
  root: string,
  citations: ContractJudgmentCitation[],
): Promise<boolean> {
  if (citations.length === 0) return false;
  for (const citation of citations) {
    const source = await readCurrentRepoSource(root, citation.path);
    if (!source || source.sha256 !== citation.digest) return false;
    const lines = source.text.split(/\r?\n/u);
    const end = citation.lineEnd ?? citation.lineStart;
    if (citation.lineStart !== undefined && (citation.lineStart > lines.length || (end ?? 0) > lines.length)) return false;
    const range = citation.lineStart === undefined ? source.text : lines.slice(citation.lineStart - 1, end).join("\n");
    if (citation.excerpt && !range.includes(citation.excerpt)) return false;
  }
  return true;
}

function assertArtifactRefLineage(expected: ArtifactRef, current: ArtifactRef, label: string): void {
  if (expected.type !== current.type || expected.id !== current.id || expected.schemaVersion !== current.schemaVersion) {
    throw new Error(`${label} does not match the current indexed artifact.`);
  }
  if (expected.digest && current.digest && expected.digest !== current.digest) {
    throw new Error(`${label} digest does not match the current indexed artifact.`);
  }
}

function contractJudgeMode(value: unknown): "deterministic" | "agent" | "provider" {
  if (value === undefined) return "agent";
  if (value === "deterministic" || value === "agent" || value === "provider") return value;
  throw new Error("--mode must be deterministic, agent, or provider.");
}

function boundedConfigConfidence(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("contracts.adoption.minimumConfidence must be between 0 and 1.");
  }
  return value;
}

function repositoryContractAdoptionPath(kind: "system" | "flow", id: string): string {
  const segment = id.replace(/[^a-zA-Z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || "contract";
  const suffix = digestJson(id).slice(0, 8);
  return `rekon/contracts/${kind === "system" ? "systems" : "flows"}/${segment}-${suffix}.json`;
}

function contractSourceDocumentForAdoption(
  kind: "system" | "flow",
  targetId: string,
  proposed: SystemContractSource | FlowContractSource,
): RepositoryContractSourceDocument {
  if (proposed.id !== targetId) throw new Error(`Accepted contract proposal id must remain ${targetId}.`);
  if (kind === "system") {
    if (!("systemId" in proposed)) throw new Error(`Candidate ${targetId} requires a system contract proposal.`);
    return { version: "1.0.0", sourceId: `adopted.system.${targetId}`, systems: [proposed] };
  }
  if ("systemId" in proposed) throw new Error(`Candidate ${targetId} requires a flow contract proposal.`);
  return { version: "1.0.0", sourceId: `adopted.flow.${targetId}`, flows: [proposed] };
}

async function readCurrentArtifactsByType<T>(
  store: ReturnType<typeof createLocalArtifactStore>,
  artifactType: string,
): Promise<T[]> {
  const entries = [...await store.list(artifactType)].sort(compareArtifactIndexRecency);
  if (entries.length === 0) return [];

  const latestBySupersessionKey = new Map<string, ArtifactIndexEntry>();
  let latestUnkeyed: ArtifactIndexEntry | undefined;
  for (const entry of entries) {
    if (entry.supersessionKey) latestBySupersessionKey.set(entry.supersessionKey, entry);
    else latestUnkeyed = entry;
  }

  const latestOverall = entries.at(-1);
  const selected = [...latestBySupersessionKey.values()];
  if (latestUnkeyed && (selected.length === 0 || latestUnkeyed === latestOverall)) {
    selected.push(latestUnkeyed);
  }

  return Promise.all(selected
    .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`))
    .map(async (entry) => await store.read(entry) as T));
}

function compareArtifactIndexRecency(left: ArtifactIndexEntry, right: ArtifactIndexEntry): number {
  const writtenAt = left.writtenAt.localeCompare(right.writtenAt);
  return writtenAt !== 0 ? writtenAt : left.id.localeCompare(right.id);
}

function positiveIntegerFlag(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received ${String(value)}.`);
  }
  return parsed;
}

// ---------------------------------------------------------------
// GitHub Check dry-run CLI helpers. Local-only, no network.
// ---------------------------------------------------------------

type GitHubCheckVerificationRunBodyLike = {
  header: ArtifactHeader;
  status?: string;
  summary?: { status?: string };
};

type VerificationResultBodyLike = {
  header: ArtifactHeader;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  status?: "passed" | "failed" | "partial" | "not-run";
  commandResults?: Array<{
    command?: string;
    status?: "passed" | "failed" | "skipped" | "not-run";
    exitCode?: number;
    durationMs?: number;
    stdoutDigest?: string;
    stderrDigest?: string;
    notes?: string;
  }>;
  summary?: { total?: number; passed?: number; failed?: number; skipped?: number; notRun?: number };
};

type GitHubCheckDryRunOutput = {
  kind: "rekon.github-check.dry-run";
  dryRun: true;
  payload: ReturnType<typeof buildGitHubCheckPayload>;
  readiness: ReturnType<typeof assessGitHubCheckPublisherReadiness>;
  proofChainWarnings?: string[];
  canonicalTruthReminder: typeof GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER;
};

type GitHubCheckSendOutput = {
  kind: "rekon.github-check.send";
  sent: boolean;
  reason?: "readiness-failed" | "api-error";
  payload: ReturnType<typeof buildGitHubCheckPayload>;
  readiness: GitHubCheckPublisherReadiness;
  github?: GitHubCheckPublishResult;
  error?: { status: number; message: string; documentationUrl?: string };
  proofChainWarnings?: string[];
  canonicalTruthReminder: typeof GITHUB_CHECK_PUBLISHER_CANONICAL_TRUTH_REMINDER;
};

type PrCommentDryRunOutput = {
  kind: "rekon.pr-comment.dry-run";
  dryRun: true;
  wouldPublish: false;
  readiness: PrCommentPublisherReadiness;
  comment: {
    marker: typeof PR_COMMENT_PUBLISHER_MARKER;
    markdown: string;
    summary: PrCommentBody["summary"];
  };
  citedRefs: Record<string, string | undefined>;
  canonicalTruthReminder: typeof PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER;
};

type PrCommentSendOutput = {
  kind: "rekon.pr-comment.send";
  sent: boolean;
  action?: "created" | "updated";
  reason?: "readiness-failed" | "api-error";
  readiness: PrCommentPublisherReadiness;
  comment: {
    marker: typeof PR_COMMENT_PUBLISHER_MARKER;
    summary: PrCommentBody["summary"];
  };
  citedRefs: Record<string, string | undefined>;
  github?: PrCommentPublishResult;
  error?: { status: number; message: string; documentationUrl?: string };
  canonicalTruthReminder: typeof PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER;
};

const GITHUB_CHECK_SEND_ENV_KEYS = [
  "REKON_GITHUB_CHECKS",
  "REKON_GITHUB_CHECKS_WRITE_CONFIRMED",
  "GITHUB_TOKEN",
  "GITHUB_REPOSITORY",
  "GITHUB_SHA",
  "GITHUB_HEAD_SHA",
  "GITHUB_EVENT_NAME",
  "GITHUB_SERVER_URL",
  "GITHUB_RUN_ID",
  "GITHUB_RUN_ATTEMPT",
] as const;

function collectGitHubCheckSendEnv(
  env: NodeJS.ProcessEnv,
): Record<string, string | undefined> {
  // Read only the env keys the readiness assessor and the
  // publish helper need. Keeping this list closed-form means
  // future env additions are explicit.
  const out: Record<string, string | undefined> = {};
  for (const key of GITHUB_CHECK_SEND_ENV_KEYS) {
    out[key] = env[key];
  }
  return out;
}

function resolveGitHubCheckEventFromEnv(
  env: NodeJS.ProcessEnv,
): GitHubCheckPublisherReadinessEvent {
  const name = env.GITHUB_EVENT_NAME?.trim() || "workflow_dispatch";
  // GitHub Actions does not surface fork status directly via a
  // single env var; the standard hint is `GITHUB_HEAD_REF` being
  // set for pull-request events combined with the event payload
  // file at `GITHUB_EVENT_PATH`. To stay strict-by-default, the
  // CLI treats any `pull_request` event without an explicit
  // operator override as fork-suspicious. The dedicated env var
  // `REKON_GITHUB_CHECKS_PR_IS_FORK=0` lets operators declare a
  // same-repo PR; anything else (including unset) is treated as
  // a fork for the readiness gate.
  let pullRequestIsFork: boolean | undefined;
  if (name === "pull_request" || name === "pull_request_target") {
    const explicit = env.REKON_GITHUB_CHECKS_PR_IS_FORK;
    if (explicit === undefined) {
      pullRequestIsFork = true;
    } else {
      pullRequestIsFork = isTruthyFlag(explicit);
    }
  }
  return { name, pullRequestIsFork };
}

function buildGitHubActionsRunUrl(env: NodeJS.ProcessEnv): string | undefined {
  const server = env.GITHUB_SERVER_URL;
  const repository = env.GITHUB_REPOSITORY;
  const runId = env.GITHUB_RUN_ID;
  if (!server || !repository || !runId) return undefined;
  const attempt = env.GITHUB_RUN_ATTEMPT;
  return attempt
    ? `${server}/${repository}/actions/runs/${runId}/attempts/${attempt}`
    : `${server}/${repository}/actions/runs/${runId}`;
}

function isTruthyFlag(value: string | undefined): boolean {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function sanitizeGitHubCheckSendError(
  cause: unknown,
): { status: number; message: string; documentationUrl?: string } {
  if (cause instanceof GitHubCheckPublishError) {
    return {
      status: cause.status,
      message: cause.message,
      documentationUrl: cause.documentationUrl,
    };
  }
  if (cause instanceof Error) {
    return { status: 0, message: cause.message };
  }
  return { status: 0, message: String(cause ?? "unknown error") };
}

const PR_COMMENT_SEND_ENV_KEYS = [
  "REKON_PR_COMMENTS",
  "REKON_PR_COMMENTS_WRITE_CONFIRMED",
  "GITHUB_TOKEN",
  "GITHUB_REPOSITORY",
  "GITHUB_PR_NUMBER",
  "PR_NUMBER",
  "GITHUB_EVENT_NAME",
  "GITHUB_SERVER_URL",
  "GITHUB_RUN_ID",
  "GITHUB_RUN_ATTEMPT",
] as const;

function collectPrCommentSendEnv(
  env: NodeJS.ProcessEnv,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of PR_COMMENT_SEND_ENV_KEYS) {
    out[key] = env[key];
  }
  return out;
}

function resolvePrCommentEventFromEnv(
  env: NodeJS.ProcessEnv,
): PrCommentPublisherReadinessEvent {
  const name = env.GITHUB_EVENT_NAME?.trim() || "workflow_dispatch";
  // Parallel posture to the GitHub Check publisher: any
  // `pull_request` event without explicit operator override is
  // treated as fork-suspicious. `pull_request_target` is
  // refused unconditionally by the readiness assessor.
  let pullRequestIsFork: boolean | undefined;
  if (name === "pull_request" || name === "pull_request_target") {
    const explicit = env.REKON_PR_COMMENTS_PR_IS_FORK;
    if (explicit === undefined) {
      pullRequestIsFork = true;
    } else {
      pullRequestIsFork = isTruthyFlag(explicit);
    }
  }
  return { name, pullRequestIsFork };
}

function sanitizePrCommentSendError(
  cause: unknown,
): { status: number; message: string; documentationUrl?: string } {
  if (cause instanceof PrCommentPublishError) {
    return {
      status: cause.status,
      message: cause.message,
      documentationUrl: cause.documentationUrl,
    };
  }
  if (cause instanceof Error) {
    return { status: 0, message: cause.message };
  }
  return { status: 0, message: String(cause ?? "unknown error") };
}

async function pickLatestArtifactEntry(
  store: ReturnType<typeof createLocalArtifactStore>,
  artifactType: string,
): Promise<ArtifactIndexEntry | undefined> {
  const entries = await store.list(artifactType);
  if (entries.length === 0) return undefined;
  return sortByWrittenAtDesc(entries)[0];
}

type GitHubCheckRunChainResolution = {
  entry: ArtifactIndexEntry | undefined;
  body: GitHubCheckVerificationRunBodyLike | undefined;
  warning?: string;
};

/**
 * Trust-boundary hardening (step 9, fix #1) — proof-chain
 * coherence. Resolve the VerificationRun **cited by the
 * VerificationResult**, not the unrelated latest run. This
 * prevents the GitHub Check payload from combining a
 * VerificationResult from run N with a VerificationRun from
 * run N+1.
 *
 * Rules:
 *   1. If a VerificationResult exists and its header.inputRefs
 *      cite a VerificationRun, load **that specific run**.
 *   2. If a VerificationResult exists and its header.inputRefs
 *      cite a VerificationRun that no longer exists in the
 *      store, return `entry: undefined` + a coherence warning
 *      so the payload builder reports
 *      `proof === "missing"` → `action_required`.
 *   3. If no VerificationResult exists, fall back to latest
 *      VerificationRun (existing behaviour; the proof status
 *      is still `missing` at the result layer).
 *   4. If a VerificationResult exists but cites no
 *      VerificationRun in its inputRefs at all
 *      (manually-recorded results), do not substitute the
 *      latest unrelated run — report `entry: undefined` so
 *      the payload reports `runner-run-missing`.
 */
async function resolveCoherentVerificationRunForGitHubCheck(
  store: ReturnType<typeof createLocalArtifactStore>,
  verificationResult: VerificationResultBodyLike | undefined,
): Promise<GitHubCheckRunChainResolution> {
  if (!verificationResult) {
    // No result yet — fall back to latest run so operators
    // who run --execute but not --result still see something.
    const latestRun = await pickLatestArtifactEntry(store, "VerificationRun");
    if (!latestRun) return { entry: undefined, body: undefined };

    try {
      const body = (await store.read(latestRun)) as GitHubCheckVerificationRunBodyLike;
      return { entry: latestRun, body };
    } catch (cause) {
      throw new Error(
        `Failed to read VerificationRun body ${latestRun.id}: ${(cause as Error).message ?? cause}`,
      );
    }
  }

  // VerificationResult exists — find the VerificationRun ref
  // it cites in its inputRefs. The result must cite the run
  // it was derived from (deriveVerificationResultFromRun does
  // this; manually-recorded results may not, in which case we
  // refuse to substitute).
  const headerRefs = Array.isArray(verificationResult.header?.inputRefs)
    ? verificationResult.header!.inputRefs
    : [];
  const citedRunRef = headerRefs.find(
    (ref): ref is ArtifactRef =>
      Boolean(ref) && typeof ref === "object" && (ref as ArtifactRef).type === "VerificationRun",
  );

  if (!citedRunRef) {
    return {
      entry: undefined,
      body: undefined,
      warning:
        "VerificationResult does not cite a VerificationRun in its inputRefs. The GitHub Check payload will report `runner-run-missing`; reviewers should follow up before treating the Check as authoritative.",
    };
  }

  const allRuns = await store.list("VerificationRun");
  const citedEntry = allRuns.find(
    (candidate) => candidate.type === "VerificationRun" && candidate.id === citedRunRef.id,
  );

  if (!citedEntry) {
    return {
      entry: undefined,
      body: undefined,
      warning:
        `VerificationResult cites VerificationRun:${citedRunRef.id}, but that run is not present in the local artifact store. The GitHub Check payload will report \`runner-run-missing\` instead of substituting an unrelated latest run.`,
    };
  }

  try {
    const body = (await store.read(citedEntry)) as GitHubCheckVerificationRunBodyLike;
    return { entry: citedEntry, body };
  } catch (cause) {
    throw new Error(
      `Failed to read cited VerificationRun body ${citedEntry.id}: ${(cause as Error).message ?? cause}`,
    );
  }
}

async function pickLatestPublicationByKind(
  store: ReturnType<typeof createLocalArtifactStore>,
  kind: string,
): Promise<ArtifactIndexEntry | undefined> {
  const entries = sortByWrittenAtDesc(await store.list("Publication"));

  for (const candidate of entries) {
    try {
      const body = (await store.read(candidate)) as { kind?: string };

      if (body && typeof body === "object" && body.kind === kind) {
        return candidate;
      }
    } catch {
      // Skip unreadable entries; the artifact index validation
      // path handles those.
      continue;
    }
  }

  return undefined;
}

function toArtifactRef(entry: ArtifactIndexEntry): ArtifactRef {
  return {
    type: entry.type,
    id: entry.id,
    path: entry.path,
    schemaVersion: entry.schemaVersion,
  };
}

function mapVerificationRunStatusForGitHubCheck(
  run: GitHubCheckVerificationRunBodyLike,
): GitHubCheckPublisherRunStatus {
  const raw = (run.status ?? run.summary?.status ?? "").trim();

  switch (raw) {
    case "passed":
    case "failed":
    case "completed":
      return "completed";
    case "timeout":
    case "timed_out":
    case "timed-out":
      return "timeout";
    case "killed":
      return "killed";
    case "in-progress":
    case "running":
      return "in-progress";
    case "not-started":
    case "not_started":
    case "not-run":
      return "not-started";
    default:
      return "unknown";
  }
}

function subjectRepoIdFromStore(
  store: ReturnType<typeof createLocalArtifactStore>,
): string {
  return store.root.split(/[\\/]/).filter(Boolean).at(-1) ?? "repo";
}

function isFindingStatusDecisionStatus(value: string): value is FindingStatusDecisionStatus {
  return value === "accepted" || value === "ignored" || value === "resolved";
}

function isFindingStatusDecisionReason(value: unknown): value is FindingStatusDecisionReason {
  return (
    typeof value === "string" &&
    (value === "accepted-risk" ||
      value === "false-positive" ||
      value === "fixed" ||
      value === "not-actionable" ||
      value === "other")
  );
}

async function ensureSnapshotForResolver(
  runtime: Awaited<ReturnType<typeof createDefaultRuntime>>,
  paths: string[],
): Promise<{ type: string; id: string; schemaVersion: string }> {
  if ((await runtime.artifacts.list("EvidenceGraph")).length === 0) {
    await runtime.runObserve(
      paths.length > 0
        ? { changedFiles: paths, incremental: true }
        : undefined,
    );
  }

  if ((await runtime.artifacts.list("OwnershipMap")).length === 0) {
    await runtime.runProject();
  }

  const rulebookSync = await syncConfiguredRulebook(runtime.repo.root, runtime.artifacts);
  if ((await runtime.artifacts.list("FindingReport")).length === 0 || rulebookSync.changed) {
    await runtime.runEvaluate();
  }

  if (await snapshotIsStaleOrMissing(runtime)) {
    return runtime.runSnapshot();
  }

  const snapshots = await runtime.artifacts.list("IntelligenceSnapshot");
  const latest = snapshots.sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  )[0];

  if (!latest) {
    return runtime.runSnapshot();
  }

  return {
    type: latest.type,
    id: latest.id,
    schemaVersion: latest.schemaVersion,
  };
}

async function ensureCoherencyDeltaReady(
  runtime: Awaited<ReturnType<typeof createDefaultRuntime>>,
  root: string,
): Promise<void> {
  await ensureSnapshotReady(runtime);

  const store = createLocalArtifactStore(root);
  await store.init();

  if ((await store.list("FindingLifecycleReport")).length === 0) {
    const lifecycle = await buildFindingLifecycleReport(store);
    await store.write(lifecycle, { category: "findings" });
  }

  if ((await store.list("CoherencyDelta")).length === 0) {
    const delta = await buildCoherencyDelta(store);
    await store.write(delta, { category: "findings" });
  }
}

async function collectRemediationCandidateIds(
  runtime: Awaited<ReturnType<typeof createDefaultRuntime>>,
  filters: { findingId?: string; priority?: string },
): Promise<string[]> {
  const refs = (await runtime.artifacts.list("CoherencyDelta")).sort(
    (left, right) => right.id.localeCompare(left.id),
  );
  const latest = refs[0];

  if (!latest) {
    return [];
  }

  const delta = await runtime.artifacts.read(latest) as {
    remediationQueue?: Array<{ findingId?: string; priority?: string }>;
  };
  const queue = Array.isArray(delta?.remediationQueue) ? delta.remediationQueue : [];

  return queue
    .filter((entry) => {
      if (filters.findingId && entry.findingId !== filters.findingId) {
        return false;
      }

      if (filters.priority && entry.priority !== filters.priority) {
        return false;
      }

      return typeof entry.findingId === "string" && entry.findingId.length > 0;
    })
    .map((entry) => entry.findingId as string);
}

async function ensurePreflight(
  runtime: Awaited<ReturnType<typeof createDefaultRuntime>>,
  path: string,
  goal: string,
): Promise<ArtifactRef> {
  if ((await runtime.artifacts.list("EvidenceGraph")).length === 0) {
    await runtime.runObserve({
      changedFiles: [path],
      incremental: true,
    });
  }

  if ((await runtime.artifacts.list("OwnershipMap")).length === 0) {
    await runtime.runProject();
  }

  const rulebookSync = await syncConfiguredRulebook(runtime.repo.root, runtime.artifacts);
  if ((await runtime.artifacts.list("FindingReport")).length === 0 || rulebookSync.changed) {
    await runtime.runEvaluate();
  }

  let snapshotRef: { type: string; id: string; schemaVersion: string };

  if (await snapshotIsStaleOrMissing(runtime)) {
    snapshotRef = await runtime.runSnapshot();
  } else {
    const snapshots = await runtime.artifacts.list("IntelligenceSnapshot");
    const latest = snapshots.sort((left, right) =>
      right.writtenAt.localeCompare(left.writtenAt),
    )[0];
    snapshotRef = latest
      ? {
        type: latest.type,
        id: latest.id,
        schemaVersion: latest.schemaVersion,
      }
      : await runtime.runSnapshot();
  }

  const refs = await runtime.runResolve({
    resolverId: "resolve.preflight",
    input: {
      snapshotRef,
      path,
      goal,
    },
  });
  const preflightRef = refs.find((ref) => ref.type === "ResolverPacket");
  if (!preflightRef) {
    throw new Error("rekon intent work-order could not create a current ResolverPacket.");
  }
  return preflightRef;
}

function writePreviewHumanOutput(preview: ReconciliationPreview): void {
  const { planRef, status, summary, operations, recommendation } = preview;
  const lines: string[] = [];
  lines.push("Reconciliation preview");
  lines.push("");
  lines.push(`Plan: ${planRef.type}:${planRef.id}`);
  lines.push(`Status: ${status}`);
  lines.push(
    `Operations: ${summary.total} total, ${summary.previewable} previewable, ${summary.notPreviewable} not previewable, ${summary.manual} manual, ${summary.highRisk} high-risk`,
  );
  lines.push("");
  lines.push("| # | Operation | Kind | Path | Risk | Preview |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  operations.forEach((op: ReconciliationPreviewOperation, index: number) => {
    const path = op.path ?? "—";
    const previewable = op.previewable ? "yes" : "no";
    const title = op.title.replace(/\|/g, " ");
    lines.push(
      `| ${index + 1} | ${title} | ${op.kind} | ${path} | ${op.risk} | ${previewable} |`,
    );
  });
  lines.push("");
  lines.push(recommendation.message);
  if (recommendation.nextCommands.length > 0) {
    lines.push("Next commands:");
    for (const cmd of recommendation.nextCommands) {
      lines.push(`  ${cmd}`);
    }
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

function isReviewTermKind(value: string): value is CapabilityNormalizationReviewTermKind {
  return value === "verb" || value === "noun" || value === "candidate";
}

function isReviewDecision(value: string): value is CapabilityNormalizationReviewDecision {
  return (
    value === "extend-ontology"
    || value === "rename-symbol"
    || value === "noise-filter"
    || value === "defer"
  );
}

async function readLatestReviewLedger(
  store: ReturnType<typeof createLocalArtifactStore>,
): Promise<CapabilityNormalizationReviewLedger | undefined> {
  const entries = await store.list("CapabilityNormalizationReviewLedger");
  if (entries.length === 0) return undefined;
  const latest = entries.at(-1) as ArtifactIndexEntry;
  const raw = (await store.read(latest)) as unknown;
  const result = validateCapabilityNormalizationReviewLedger(raw);
  if (!result.ok) {
    throw new Error(
      `Latest CapabilityNormalizationReviewLedger is invalid: ${result.reason}`,
    );
  }
  return result.ledger;
}

async function findArtifactEntry(store: ReturnType<typeof createLocalArtifactStore>, id: string): Promise<ArtifactIndexEntry> {
  const entries = await store.list();
  const [type, artifactId] = id.includes(":") ? id.split(":", 2) : [undefined, id];
  const entry = entries.find((candidate) => {
    if (type) {
      return candidate.type === type && candidate.id === artifactId;
    }

    return candidate.id === artifactId;
  });

  if (!entry) {
    throw new Error(`Artifact not found: ${id}`);
  }

  return entry;
}

type HandlerRoleKey =
  | "evidenceProviders"
  | "projectors"
  | "evaluators"
  | "resolvers"
  | "publishers"
  | "actuators"
  | "learners";

type RegisteredCapabilityLike = {
  manifest: { id: string };
  evidenceProviders: { id: string; produces?: string[]; consumes?: string[] }[];
  projectors: { id: string; produces?: string[] }[];
  evaluators: { id: string; produces?: string[] }[];
  resolvers: { id: string; produces?: string[] }[];
  publishers: { id: string; produces?: string[] }[];
  actuators: { id: string; produces?: string[] }[];
  learners: { id: string; produces?: string[] }[];
};

function summarizeHandlers(capability: RegisteredCapabilityLike): Record<HandlerRoleKey, { id: string; produces?: string[] }[]> {
  const map = <T extends { id: string; produces?: string[] }>(handlers: T[]) =>
    handlers.map((handler) => ({
      id: handler.id,
      produces: handler.produces ?? [],
    }));

  return {
    evidenceProviders: capability.evidenceProviders.map((handler) => ({ id: handler.id })),
    projectors: map(capability.projectors),
    evaluators: map(capability.evaluators),
    resolvers: map(capability.resolvers),
    publishers: map(capability.publishers),
    actuators: map(capability.actuators),
    learners: map(capability.learners),
  };
}

function listHandlers(
  runtime: { registry: { capabilities: RegisteredCapabilityLike[] } },
  role: HandlerRoleKey,
): { handlerId: string; capabilityId: string; produces: string[] }[] {
  const result: { handlerId: string; capabilityId: string; produces: string[] }[] = [];

  for (const capability of runtime.registry.capabilities) {
    for (const handler of capability[role]) {
      result.push({
        handlerId: handler.id,
        capabilityId: capability.manifest.id,
        produces: handler.produces ?? [],
      });
    }
  }

  return result;
}

function parseInputJsonFlag(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`--input-json must be valid JSON: ${message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--input-json must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

type ConfigValidationIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  path?: string;
};

type ConfigValidationResult = {
  valid: boolean;
  configPath: string;
  configExists: boolean;
  issues: ConfigValidationIssue[];
};

const KNOWN_PERMISSIONS: ReadonlySet<CapabilityPermission> = new Set([
  "read:source",
  "read:artifacts",
  "write:artifacts",
  "write:source",
  "execute:commands",
  "execute:verification",
  "network:outbound",
]);

const RISKY_PERMISSIONS: ReadonlySet<CapabilityPermission> = new Set([
  "write:source",
  "execute:commands",
  "network:outbound",
]);

/**
 * Read `.rekon/config.json` and return the structurally-valid
 * `findingFilters` policies. Invalid entries are dropped at the
 * loader boundary (operators run `rekon config validate` for a
 * full diagnostic; the filter path stays best-effort so a
 * malformed config doesn't blow up the whole refresh). Returns
 * an empty array when the config is missing, unparseable, or
 * has no `findingFilters` field.
 */
async function loadFindingFilterPolicies(root: string): Promise<FindingFilterPolicyRule[]> {
  const configPath = resolve(root, ".rekon", "config.json");
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  const config = parsed as Record<string, unknown>;
  if (!("findingFilters" in config)) return [];
  const result = validateFindingFilterPolicyRules(config.findingFilters);
  return result.rules;
}

/**
 * Best-effort loader for `.rekon/config.json`
 * `findingResultFilters`. Mirrors `loadFindingFilterPolicies`:
 * invalid entries are dropped at the loader boundary; operators
 * run `rekon config validate` for a full diagnostic. Returns
 * `undefined` when no result filters are configured (so callers
 * can skip the result-filter stage entirely).
 */
async function loadFindingResultFilters(
  root: string,
): Promise<FindingResultFilterOptions | undefined> {
  const configPath = resolve(root, ".rekon", "config.json");
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const config = parsed as Record<string, unknown>;
  if (!("findingResultFilters" in config)) return undefined;
  const { options } = validateFindingResultFilterOptions(config.findingResultFilters);
  // Treat an empty / fully-invalid result-filter block as "no
  // result filters configured" so we don't add an unnecessary
  // pipeline stage.
  const hasAny
    = options.minConfidence !== undefined
    || options.severity !== undefined
    || (Array.isArray(options.systems) && options.systems.length > 0)
    || (Array.isArray(options.pathExcludes) && options.pathExcludes.length > 0);
  return hasAny ? options : undefined;
}

function validateConfiguredRulebook(value: unknown): {
  rules?: Rule[];
  issues: ConfigValidationIssue[];
} {
  if (value === undefined) return { issues: [] };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      issues: [{
        code: "rulebook-not-object",
        severity: "error",
        message: "config.rulebook must be an object with a rules array.",
        path: "rulebook",
      }],
    };
  }

  const record = value as Record<string, unknown>;
  const candidate = {
    header: {
      artifactType: "Rulebook",
      artifactId: "config-validation",
      schemaVersion: "0.1.0",
      generatedAt: "1970-01-01T00:00:00.000Z",
      subject: { repoId: "config-validation" },
      producer: { id: CONFIG_RULEBOOK_PRODUCER_ID, version: "1.0.0" },
      inputRefs: [],
    },
    rules: record.rules,
  };
  const validation = validateRulebook(candidate);
  const issues: ConfigValidationIssue[] = validation.issues.map((issue) => ({
    code: "rulebook-invalid",
    severity: "error",
    message: issue.message,
    path: issue.path.replace(/^\$\./, "rulebook."),
  }));

  if (Array.isArray(record.rules)) {
    const seen = new Set<string>();
    for (let index = 0; index < record.rules.length; index += 1) {
      const rule = record.rules[index];
      const id = rule && typeof rule === "object" && !Array.isArray(rule)
        ? (rule as Record<string, unknown>).id
        : undefined;
      if (typeof id !== "string" || id.length === 0) continue;
      if (seen.has(id)) {
        issues.push({
          code: "rulebook-rule-duplicate",
          severity: "error",
          message: `config.rulebook contains duplicate rule id '${id}'.`,
          path: `rulebook.rules[${index}].id`,
        });
      }
      seen.add(id);
    }
  }

  return validation.ok && issues.length === 0
    ? { rules: validation.value.rules, issues: [] }
    : { issues };
}

async function validateConfig(root: string): Promise<ConfigValidationResult> {
  const configPath = resolve(root, ".rekon", "config.json");
  const issues: ConfigValidationIssue[] = [];
  let raw: string;

  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return {
      valid: false,
      configPath,
      configExists: false,
      issues: [
        {
          code: "config-missing",
          severity: "error",
          message: `.rekon/config.json not found at ${configPath}. Run 'rekon init' to create one.`,
        },
      ],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      configPath,
      configExists: true,
      issues: [
        { code: "config-not-json", severity: "error", message: `config is not valid JSON: ${message}` },
      ],
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      valid: false,
      configPath,
      configExists: true,
      issues: [
        { code: "config-not-object", severity: "error", message: "config must be a JSON object." },
      ],
    };
  }

  const config = parsed as Record<string, unknown>;
  const capabilityPackages = new Set<string>();

  if (!("capabilities" in config)) {
    issues.push({
      code: "capabilities-missing",
      severity: "error",
      message: "config.capabilities is required.",
      path: "capabilities",
    });
  } else if (!Array.isArray(config.capabilities)) {
    issues.push({
      code: "capabilities-not-array",
      severity: "error",
      message: "config.capabilities must be an array.",
      path: "capabilities",
    });
  } else if (config.capabilities.length === 0) {
    issues.push({
      code: "capabilities-empty",
      severity: "warning",
      message: "config.capabilities is empty; the runtime will use no capabilities.",
      path: "capabilities",
    });
  } else {
    for (let index = 0; index < config.capabilities.length; index += 1) {
      const entry = config.capabilities[index];
      const entryPath = `capabilities[${index}]`;

      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        issues.push({
          code: "capability-not-object",
          severity: "error",
          message: "capability entry must be an object with a 'package' field.",
          path: entryPath,
        });
        continue;
      }

      const entryRecord = entry as Record<string, unknown>;
      const packageName = entryRecord["package"];

      if (typeof packageName !== "string" || packageName.length === 0) {
        issues.push({
          code: "capability-package-missing",
          severity: "error",
          message: "capability entry must declare a non-empty 'package' string.",
          path: `${entryPath}.package`,
        });
        continue;
      }

      const specifierIssue = capabilityPackageSpecifierIssue(packageName);

      if (specifierIssue) {
        issues.push({
          code: "capability-package-unsafe",
          severity: "error",
          message: specifierIssue,
          path: `${entryPath}.package`,
        });
        continue;
      }

      if (capabilityPackages.has(packageName)) {
        issues.push({
          code: "capability-package-duplicate",
          severity: "warning",
          message: `capability package '${packageName}' is listed more than once.`,
          path: `${entryPath}.package`,
        });
      } else {
        capabilityPackages.add(packageName);
      }
    }
  }

  const permissions = config.permissions;

  if (permissions !== undefined) {
    if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
      issues.push({
        code: "permissions-not-object",
        severity: "error",
        message: "config.permissions must be an object keyed by capability package.",
        path: "permissions",
      });
    } else {
      for (const [capabilityName, capabilityPermissions] of Object.entries(permissions)) {
        const path = `permissions.${capabilityName}`;

        if (!Array.isArray(capabilityPermissions)) {
          issues.push({
            code: "permissions-entry-not-array",
            severity: "error",
            message: `permissions.${capabilityName} must be an array of permission names.`,
            path,
          });
          continue;
        }

        if (capabilityPackages.size > 0 && !capabilityPackages.has(capabilityName)) {
          issues.push({
            code: "permissions-unknown-capability",
            severity: "warning",
            message: `permissions reference '${capabilityName}' which is not listed in capabilities.`,
            path,
          });
        }

        for (let permissionIndex = 0; permissionIndex < capabilityPermissions.length; permissionIndex += 1) {
          const permission = capabilityPermissions[permissionIndex];
          const permissionPath = `${path}[${permissionIndex}]`;

          if (typeof permission !== "string") {
            issues.push({
              code: "permission-not-string",
              severity: "error",
              message: "permission entries must be strings.",
              path: permissionPath,
            });
            continue;
          }

          if (!KNOWN_PERMISSIONS.has(permission as CapabilityPermission)) {
            issues.push({
              code: "permission-unknown",
              severity: "error",
              message: `unknown permission '${permission}'. Known permissions: ${Array.from(KNOWN_PERMISSIONS).join(", ")}.`,
              path: permissionPath,
            });
            continue;
          }

          if (RISKY_PERMISSIONS.has(permission as CapabilityPermission)) {
            issues.push({
              code: "permission-risky",
              severity: "warning",
              message: `permission '${permission}' is high-risk; confirm it is intentional for '${capabilityName}'.`,
              path: permissionPath,
            });
          }
        }
      }
    }
  }

  if ("findingFilters" in config) {
    const result = validateFindingFilterPolicyRules(config.findingFilters);
    for (const issue of result.issues) {
      issues.push({
        code: issue.code,
        severity: "error",
        message: issue.message,
        path: issue.path,
      });
    }
  }

  if ("findingResultFilters" in config) {
    const result = validateFindingResultFilterOptions(config.findingResultFilters);
    for (const issue of result.issues) {
      issues.push({
        code: issue.code,
        severity: "error",
        message: issue.message,
        path: issue.path,
      });
    }
  }

  if ("rulebook" in config) {
    issues.push(...validateConfiguredRulebook(config.rulebook).issues);
  }

  if ("agentInstructions" in config) {
    const value = config.agentInstructions;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      issues.push({
        code: "agent-instructions-not-object",
        severity: "error",
        message: "config.agentInstructions must be an object.",
        path: "agentInstructions",
      });
    } else {
      const instructions = value as Record<string, unknown>;
      if (instructions.enabled !== undefined && typeof instructions.enabled !== "boolean") {
        issues.push({
          code: "agent-instructions-enabled-invalid",
          severity: "error",
          message: "config.agentInstructions.enabled must be a boolean.",
          path: "agentInstructions.enabled",
        });
      }
      if (instructions.target !== undefined && instructions.target !== "AGENTS.md") {
        issues.push({
          code: "agent-instructions-target-invalid",
          severity: "error",
          message: "config.agentInstructions.target must be 'AGENTS.md' in v1.",
          path: "agentInstructions.target",
        });
      }
      if (instructions.sync !== undefined && instructions.sync !== "on-refresh" && instructions.sync !== "manual") {
        issues.push({
          code: "agent-instructions-sync-invalid",
          severity: "error",
          message: "config.agentInstructions.sync must be 'on-refresh' or 'manual'.",
          path: "agentInstructions.sync",
        });
      }
    }
  }

  const valid = issues.every((issue) => issue.severity !== "error");

  return {
    valid,
    configPath,
    configExists: true,
    issues,
  };
}

function parseArgs(argv: string[]): {
  positionals: string[];
  flags: Record<string, string | boolean | string[]>;
} {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean | string[]> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey ?? "";

    if (!key) {
      continue;
    }

    const nextArg = argv[index + 1];
    const value: string | boolean = inlineValue ?? (nextArg === undefined || nextArg.startsWith("--") ? true : String(argv[++index]));
    const existing = flags[key];

    if (existing === undefined) {
      flags[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(String(value));
    } else {
      flags[key] = [String(existing), String(value)];
    }
  }

  return { positionals, flags };
}

function parseRepeatableFlag(value: string | boolean | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

function parseOptionalArtifactRefFlag(
  value: string | boolean | string[] | undefined,
  label: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} requires one non-empty artifact ref.`);
  }
  return value.trim();
}

function parseMcpArtifactRefList(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string" && entry.trim().length > 0)) {
    throw new Error(`validate_change ${field} must be an array of artifact refs.`);
  }
  return value.map((entry) => entry.trim());
}

function parseMcpOptionalArtifactRef(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`validate_change ${field} must be one non-empty artifact ref.`);
  }
  return value.trim();
}

function parseContextUsageClaims(value: unknown): Array<{
  itemId: string;
  disposition: ContextUsageClaimDisposition;
}> {
  if (value === undefined) return [];
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new Error(`Context usage claim JSON is invalid: ${messageOf(error)}`);
    }
  }
  const entries: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? Object.entries(parsed as Record<string, unknown>).map(([itemId, disposition]) => ({
          itemId,
          disposition,
        }))
      : [];
  if (!Array.isArray(parsed) && (!parsed || typeof parsed !== "object")) {
    throw new Error("Context usage claims must be a JSON object or array.");
  }
  if (entries.length === 0) {
    throw new Error("Context usage claims must contain at least one item.");
  }
  const byItem = new Map<string, ContextUsageClaimDisposition>();
  return entries.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Context usage claim ${index + 1} must be an object.`);
    }
    const candidate = entry as Record<string, unknown>;
    const itemId = typeof candidate.itemId === "string" ? candidate.itemId.trim() : "";
    if (!itemId) throw new Error(`Context usage claim ${index + 1} requires itemId.`);
    if (
      candidate.disposition !== "read"
      && candidate.disposition !== "applied"
      && candidate.disposition !== "ignored"
    ) {
      throw new Error(`Context usage claim ${index + 1} disposition must be read, applied, or ignored.`);
    }
    const prior = byItem.get(itemId);
    if (prior) throw new Error(`Context usage item ${itemId} may be claimed only once per validation.`);
    byItem.set(itemId, candidate.disposition);
    return { itemId, disposition: candidate.disposition };
  });
}

function parseChangeModelJudgments(value: unknown): ChangeModelJudgment[] {
  if (value === undefined) return [];
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new Error(`Change proof judgment JSON is invalid: ${messageOf(error)}`);
    }
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Change proof judgments must be a JSON array.");
  }
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Change proof judgment ${index + 1} must be an object.`);
    }
    const candidate = entry as Record<string, unknown>;
    const obligationId = typeof candidate.obligationId === "string" ? candidate.obligationId.trim() : "";
    const explanation = typeof candidate.explanation === "string" ? candidate.explanation.trim() : "";
    if (!obligationId) throw new Error(`Change proof judgment ${index + 1} requires obligationId.`);
    if (candidate.verdict !== "supported" && candidate.verdict !== "refuted" && candidate.verdict !== "unresolved") {
      throw new Error(`Change proof judgment ${index + 1} verdict must be supported, refuted, or unresolved.`);
    }
    if (!explanation) throw new Error(`Change proof judgment ${index + 1} requires explanation.`);
    return {
      obligationId,
      verdict: candidate.verdict,
      explanation,
      verifier: {
        id: "rekon-managed-agent",
        version: "1.0.0",
      },
    };
  });
}

const ISSUE_STATUS_FILTERS = new Set<string>([
  "active",
  "accepted",
  "ignored",
  "resolved",
  "mixed",
]);

function parseIssueStatusFilter(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  if (!ISSUE_STATUS_FILTERS.has(value)) {
    throw new Error(
      `rekon issues list --status must be one of ${[...ISSUE_STATUS_FILTERS].join(", ")}.`,
    );
  }

  return value;
}

function parseIssueMergeDecisionReason(
  value: unknown,
): IssueMergeDecisionReason | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  if (!ISSUE_MERGE_DECISION_REASONS.has(value)) {
    throw new Error(
      `rekon issues merge decide --reason must be one of ${[...ISSUE_MERGE_DECISION_REASONS].join(", ")}.`,
    );
  }
  return value as IssueMergeDecisionReason;
}

async function readLatestMergeDecisionLedger(
  store: ReturnType<typeof createLocalArtifactStore>,
): Promise<IssueMergeDecisionLedger | undefined> {
  const entries = await store.list("IssueMergeDecisionLedger");
  if (entries.length === 0) return undefined;
  const sorted = [...entries].sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  );
  return (await store.read(sorted[0]!)) as IssueMergeDecisionLedger;
}

async function readLatestCoherencyDelta(
  store: ReturnType<typeof createLocalArtifactStore>,
): Promise<CoherencyDelta | undefined> {
  const entries = await store.list("CoherencyDelta");
  if (entries.length === 0) return undefined;
  const sorted = [...entries].sort((left, right) =>
    right.writtenAt.localeCompare(left.writtenAt),
  );
  return (await store.read(sorted[0]!)) as CoherencyDelta;
}

// ---------- Issue merge candidate filter helpers (v1) ----------
//
// Pure CLI-local helpers. The kernel helper
// `buildIssueMergeCandidateViews` already computes
// per-candidate decisionState + stale + superseded; the
// CLI layer just parses flags and filters the views.

type IssueMergeCandidateFilterFlag = {
  decisionStates?: ReadonlyArray<"accepted" | "rejected" | "none">;
  stale?: boolean;
  superseded?: boolean;
  reason?: string;
  strength?: "strong" | "medium" | "weak";
  limit?: number;
};

function parseIssueMergeCandidateFilterFlags(
  flags: Record<string, unknown>,
): IssueMergeCandidateFilterFlag {
  const out: IssueMergeCandidateFilterFlag = {};
  const decisionFlag = typeof flags.decision === "string" ? flags.decision : undefined;
  const undecidedFlag = flags.undecided === true || flags.undecided === "true";
  if (decisionFlag) {
    const allowed = new Set(["accepted", "rejected", "none"]);
    if (!allowed.has(decisionFlag)) {
      throw new Error(
        `rekon issues merge candidates --decision must be one of accepted|rejected|none; got ${decisionFlag}.`,
      );
    }
    out.decisionStates = [decisionFlag as "accepted" | "rejected" | "none"];
  } else if (undecidedFlag) {
    out.decisionStates = ["none"];
  }
  if (flags.stale === true || flags.stale === "true") out.stale = true;
  if (flags.superseded === true || flags.superseded === "true") out.superseded = true;
  if (typeof flags.reason === "string" && flags.reason.length > 0) {
    out.reason = flags.reason;
  }
  if (typeof flags.strength === "string" && flags.strength.length > 0) {
    const allowed = new Set(["strong", "medium", "weak"]);
    if (!allowed.has(flags.strength)) {
      throw new Error(
        `rekon issues merge candidates --strength must be one of strong|medium|weak; got ${flags.strength}.`,
      );
    }
    out.strength = flags.strength as "strong" | "medium" | "weak";
  }
  if (typeof flags.limit === "string" && flags.limit.length > 0) {
    const parsedLimit = Number.parseInt(flags.limit, 10);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
      throw new Error(
        `rekon issues merge candidates --limit must be a non-negative integer; got ${flags.limit}.`,
      );
    }
    out.limit = parsedLimit;
  } else if (typeof flags.limit === "number" && Number.isFinite(flags.limit) && flags.limit >= 0) {
    out.limit = flags.limit;
  }
  return out;
}

function applyIssueMergeCandidateFilters(
  views: IssueMergeCandidateView[],
  filter: IssueMergeCandidateFilterFlag,
): IssueMergeCandidateView[] {
  return views.filter((view) => {
    if (filter.decisionStates && !filter.decisionStates.includes(view.decisionState)) {
      return false;
    }
    if (filter.stale === true && view.stale !== true) return false;
    if (filter.superseded === true && view.superseded !== true) return false;
    if (filter.reason && !(view.candidate.reasons ?? []).includes(filter.reason as never)) {
      return false;
    }
    if (filter.strength && view.candidate.strength !== filter.strength) return false;
    return true;
  });
}

function summarizeIssueMergeCandidateDecisions(
  views: IssueMergeCandidateView[],
): {
  total: number;
  accepted: number;
  rejected: number;
  undecided: number;
  stale: number;
  superseded: number;
} {
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
  return { total: views.length, accepted, rejected, undecided, stale, superseded };
}

function serializeIssueMergeCandidateView(view: IssueMergeCandidateView): {
  candidate: IssueMergeCandidateView["candidate"];
  decisionState: IssueMergeCandidateView["decisionState"];
  decision: IssueMergeDecision | null;
  decisionHistory: IssueMergeDecision[];
  groups: IssueMergeCandidateView["groups"];
  memberFindingIds: string[];
  files: string[];
  rollup: IssueMergeCandidateView["rollup"] | null;
  stale: boolean;
  superseded: boolean;
  warnings: string[];
} {
  return {
    candidate: view.candidate,
    decisionState: view.decisionState,
    decision: view.latestDecision ?? null,
    decisionHistory: view.decisionHistory,
    groups: view.groups,
    memberFindingIds: view.memberFindingIds,
    files: view.files,
    rollup: view.rollup ?? null,
    stale: view.stale === true,
    superseded: view.superseded === true,
    warnings: view.warnings,
  };
}

function recommendedCommandsForCandidateView(view: IssueMergeCandidateView): string[] {
  const id = view.candidate.id;
  const escapedNote = '"Same root cause."';
  return [
    `rekon issues merge decide ${id} --decision accepted --note ${escapedNote}`,
    `rekon issues merge decide ${id} --decision rejected --note ${escapedNote}`,
  ];
}

// ---------- Human-readable rendering helpers (P1.1
// issue-merge-publication-detail-polish v2) ----------

function renderIssueMergeCandidatesText(input: {
  summary: ReturnType<typeof summarizeIssueMergeCandidateDecisions>;
  views: IssueMergeCandidateView[];
  filter: IssueMergeCandidateFilterFlag;
  mergeRollupFreshness?: { status: string; warnings: ReadonlyArray<{ message: string }> };
}): string {
  const lines: string[] = [];
  const { summary, views, filter, mergeRollupFreshness } = input;
  lines.push(
    `Merge candidates: ${summary.total} total, ${summary.undecided} undecided, ${summary.accepted} accepted, ${summary.rejected} rejected`,
  );
  if (summary.stale > 0 || summary.superseded > 0) {
    lines.push(
      `Lineage: ${summary.stale} stale, ${summary.superseded} superseded`,
    );
  }
  const filterParts = describeIssueMergeCandidateFilter(filter);
  if (filterParts.length > 0) {
    lines.push(`Filters: ${filterParts.join(", ")}`);
  }
  if (
    mergeRollupFreshness
    && mergeRollupFreshness.status !== "fresh"
    && mergeRollupFreshness.status !== "missing"
  ) {
    lines.push(`Merge-rollup freshness: ${mergeRollupFreshness.status}`);
  }
  lines.push("");
  if (views.length === 0) {
    lines.push("No issue merge candidates match the requested filters.");
    return lines.join("\n");
  }
  lines.push("| Candidate | Decision | Strength | Confidence | Groups | Reasons |");
  lines.push("| --- | --- | --- | ---: | --- | --- |");
  for (const view of views) {
    lines.push(
      `| ${view.candidate.id} | ${view.decisionState} | ${view.candidate.strength} | ${view.candidate.confidence.toFixed(2)} | ${(view.candidate.groupIds ?? []).join(", ")} | ${(view.candidate.reasons ?? []).join(", ")} |`,
    );
  }
  return lines.join("\n");
}

function describeIssueMergeCandidateFilter(filter: IssueMergeCandidateFilterFlag): string[] {
  const parts: string[] = [];
  if (filter.decisionStates) {
    parts.push(`decision=${filter.decisionStates.join("|")}`);
  }
  if (filter.stale === true) parts.push("stale=true");
  if (filter.superseded === true) parts.push("superseded=true");
  if (filter.reason) parts.push(`reason=${filter.reason}`);
  if (filter.strength) parts.push(`strength=${filter.strength}`);
  if (typeof filter.limit === "number") parts.push(`limit=${filter.limit}`);
  return parts;
}

function renderIssueMergeCandidateDetailText(input: {
  view: IssueMergeCandidateView;
  recommendedCommands: string[];
  mergeRollupFreshness?: { status: string; warnings: ReadonlyArray<{ message: string }> };
}): string {
  const { view, recommendedCommands, mergeRollupFreshness } = input;
  const lines: string[] = [];
  lines.push(`Merge Candidate: ${view.candidate.id}`);
  lines.push(`Decision: ${view.decisionState}`);
  lines.push(`Strength: ${view.candidate.strength}`);
  lines.push(`Confidence: ${view.candidate.confidence.toFixed(2)}`);
  if ((view.candidate.reasons ?? []).length > 0) {
    lines.push(`Reasons: ${view.candidate.reasons.join(", ")}`);
  }
  lines.push("");
  lines.push("Groups:");
  if (view.groups.length === 0) {
    lines.push("- (no resolved member groups)");
  } else {
    for (const group of view.groups) {
      lines.push(
        `- ${group.id} — ${group.status} — ${group.severity} — ${group.type}`,
      );
      if ((group.files ?? []).length > 0) {
        lines.push(`  Files: ${group.files.join(", ")}`);
      }
      if ((group.memberFindingIds ?? []).length > 0) {
        lines.push(`  Members: ${group.memberFindingIds.join(", ")}`);
      }
    }
  }
  lines.push("");
  lines.push(`Member finding ids: ${view.memberFindingIds.join(", ") || "(none)"}`);
  lines.push(`Files: ${view.files.join(", ") || "(none)"}`);
  lines.push("");
  if (view.latestDecision) {
    lines.push("Latest Decision:");
    lines.push(
      `- ${view.latestDecision.decision} by ${view.latestDecision.decidedBy ?? view.latestDecision.source ?? "operator"} at ${view.latestDecision.decidedAt}`,
    );
    if (view.latestDecision.note) {
      lines.push(`  note: ${view.latestDecision.note}`);
    }
    if (view.latestDecision.reason) {
      lines.push(`  reason: ${view.latestDecision.reason}`);
    }
    if (view.decisionHistory.length > 1) {
      lines.push(`- (decision history length: ${view.decisionHistory.length})`);
    }
    lines.push("");
  }
  if (view.rollup) {
    lines.push("Roll-up:");
    lines.push(`- ${view.rollup.issueGroupId ?? view.rollup.id}`);
    if ((view.rollup.mergedIssueGroupIds ?? []).length > 0) {
      lines.push(`  Groups: ${(view.rollup.mergedIssueGroupIds ?? []).join(", ")}`);
    }
    if ((view.rollup.mergeDecisionIds ?? []).length > 0) {
      lines.push(`  Decisions: ${(view.rollup.mergeDecisionIds ?? []).join(", ")}`);
    }
    lines.push("");
  }
  lines.push("Freshness:");
  lines.push(`- status: ${mergeRollupFreshness?.status ?? "unknown"}`);
  if (view.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of view.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
    lines.push("Recommended command: rekon refresh");
  }
  lines.push("");
  lines.push("Recommended commands:");
  for (const command of recommendedCommands) {
    lines.push(`- ${command}`);
  }
  lines.push("- rekon coherency delta --json");
  return lines.join("\n");
}

// ---------- Issue merge decisions summary helpers (P1.1
// issue-merge-publication-detail-polish v2) ----------

type AnnotatedIssueMergeDecision = IssueMergeDecision & { current: boolean };

type AnnotatedIssueMergeDecisions = {
  summary: {
    total: number;
    current: number;
    superseded: number;
    accepted: number;
    rejected: number;
  };
  entries: AnnotatedIssueMergeDecision[];
};

/**
 * Walk the ledger newest-first and mark the first
 * decision seen per candidateId as `current`; later
 * decisions for the same candidate are `superseded`.
 * Tally accepted / rejected totals across the
 * **current** decisions only — superseded entries
 * don't represent live state. (P1.1
 * issue-merge-publication-detail-polish v2.)
 */
function annotateIssueMergeDecisions(
  ledger: IssueMergeDecisionLedger,
): AnnotatedIssueMergeDecisions {
  const decisions = ledger.decisions ?? [];
  // Sort descending by decidedAt; id tiebreak for
  // stability.
  const sorted = [...decisions].sort((left, right) => {
    const byTime = right.decidedAt.localeCompare(left.decidedAt);
    if (byTime !== 0) return byTime;
    return right.id.localeCompare(left.id);
  });
  const seenCandidates = new Set<string>();
  const annotated: AnnotatedIssueMergeDecision[] = [];
  let current = 0;
  let superseded = 0;
  let accepted = 0;
  let rejected = 0;
  for (const decision of sorted) {
    const isCurrent = !seenCandidates.has(decision.candidateId);
    if (isCurrent) {
      seenCandidates.add(decision.candidateId);
      current += 1;
      if (decision.decision === "accepted") accepted += 1;
      else if (decision.decision === "rejected") rejected += 1;
    } else {
      superseded += 1;
    }
    annotated.push({ ...decision, current: isCurrent });
  }
  return {
    summary: { total: decisions.length, current, superseded, accepted, rejected },
    entries: annotated,
  };
}

function renderIssueMergeDecisionsText(
  ledger: IssueMergeDecisionLedger,
  annotated: AnnotatedIssueMergeDecisions,
): string {
  const lines: string[] = [];
  const { summary, entries } = annotated;
  lines.push(
    `Merge decisions: ${summary.total} total, ${summary.current} current, ${summary.superseded} superseded`,
  );
  lines.push(
    `Current breakdown: ${summary.accepted} accepted, ${summary.rejected} rejected`,
  );
  lines.push(`Ledger: ${ledger.header.artifactId}`);
  lines.push("");
  if (entries.length === 0) {
    lines.push("No merge decisions recorded yet.");
    return lines.join("\n");
  }
  lines.push("| Candidate | Decision | Current | Decided At | Note |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const entry of entries) {
    const truncatedNote = entry.note && entry.note.length > 80
      ? `${entry.note.slice(0, 77)}…`
      : (entry.note ?? "");
    lines.push(
      `| ${entry.candidateId} | ${entry.decision} | ${entry.current ? "yes" : "no"} | ${entry.decidedAt} | ${truncatedNote.replace(/\|/g, "\\|")} |`,
    );
  }
  return lines.join("\n");
}

function renderVerifyRunDryRunHuman(input: {
  artifact: ArtifactRef;
  verificationRun: {
    id: string;
    status: string;
    summary: { total: number; notRun: number };
    commands: Array<{ id: string; command: string; status: string; argv: string[] }>;
  };
  planRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  safety: VerificationRunSafetySummary;
  warnings: string[];
}): string {
  const lines: string[] = [];

  lines.push("Verification run dry-run");
  lines.push("");
  lines.push(`Plan: ${input.planRef.type}:${input.planRef.id}`);
  if (input.workOrderRef) {
    lines.push(`Work order: ${input.workOrderRef.type}:${input.workOrderRef.id}`);
  } else {
    lines.push("Work order: (none)");
  }
  lines.push(`Artifact: ${input.artifact.type}:${input.artifact.id}`);
  lines.push(`Commands: ${input.verificationRun.summary.total}`);
  lines.push("Execution: not run");
  lines.push("");

  if (input.verificationRun.commands.length === 0) {
    lines.push("(no commands in this plan)");
  } else {
    lines.push("| # | Command | Status | Argv |");
    lines.push("| --- | --- | --- | --- |");
    for (let index = 0; index < input.verificationRun.commands.length; index += 1) {
      const command = input.verificationRun.commands[index]!;
      const argv = JSON.stringify(command.argv);
      const safeCommand = command.command.replace(/\|/g, "\\|");
      const safeArgv = argv.replace(/\|/g, "\\|");
      lines.push(
        `| ${index + 1} | ${safeCommand} | ${command.status} | ${safeArgv} |`,
      );
    }
  }

  lines.push("");
  lines.push("No commands were executed.");
  lines.push(
    "Execution is not implemented yet. This dry-run previews the future "
      + "execution plan against the safety contract in "
      + "docs/strategy/verification-runner-v1-decision.md.",
  );

  if (input.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of input.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join("\n");
}

function renderVerifyRunExecuteHuman(input: {
  artifact: ArtifactRef;
  verificationRun: {
    id: string;
    status: string;
    summary: { total: number; passed: number; failed: number; skipped: number; notRun: number; timeout: number; killed: number };
    startedAt?: string;
    endedAt?: string;
    durationMs?: number;
    commands: Array<{
      id: string;
      command: string;
      argv: string[];
      status: string;
      exitCode?: number | null;
      signal?: string | null;
      durationMs?: number;
      timedOut?: boolean;
      killed?: boolean;
    }>;
  };
  planRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  safety: VerificationRunSafetySummary;
  warnings: string[];
  runtimeObservation?: {
    artifact: ArtifactRef;
    summary: RuntimeGraphObservationReport["summary"];
  };
  runtimeObservationError?: string;
  message: string;
}): string {
  const lines: string[] = [];

  lines.push("Verification run");
  lines.push("");
  lines.push(`Plan: ${input.planRef.type}:${input.planRef.id}`);
  if (input.workOrderRef) {
    lines.push(`Work order: ${input.workOrderRef.type}:${input.workOrderRef.id}`);
  } else {
    lines.push("Work order: (none)");
  }
  lines.push(`Artifact: ${input.artifact.type}:${input.artifact.id}`);
  lines.push(`Commands: ${input.verificationRun.summary.total}`);
  lines.push(`Status: ${input.verificationRun.status}`);
  if (typeof input.verificationRun.durationMs === "number") {
    lines.push(`Execution: completed in ${input.verificationRun.durationMs} ms`);
  } else {
    lines.push("Execution: completed");
  }
  lines.push("");

  if (input.verificationRun.commands.length === 0) {
    lines.push("(no commands in this plan)");
  } else {
    lines.push("| # | Command | Status | Exit | Duration |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (let index = 0; index < input.verificationRun.commands.length; index += 1) {
      const command = input.verificationRun.commands[index]!;
      const exit = command.exitCode === null || command.exitCode === undefined
        ? command.signal ?? "-"
        : String(command.exitCode);
      const duration = typeof command.durationMs === "number" ? `${command.durationMs}ms` : "-";
      const safeCommand = command.command.replace(/\|/g, "\\|");
      lines.push(
        `| ${index + 1} | ${safeCommand} | ${command.status} | ${exit} | ${duration} |`,
      );
    }
  }

  lines.push("");
  lines.push(input.message);

  if (input.runtimeObservation) {
    lines.push("");
    lines.push(
      `Runtime observation: ${input.runtimeObservation.artifact.type}:${input.runtimeObservation.artifact.id}`,
    );
    lines.push(`Observed execution edges: ${input.runtimeObservation.summary.executionObservations ?? 0}`);
  }

  if (input.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of input.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join("\n");
}

function renderVerifyResultFromRunHuman(input: {
  artifact: ArtifactRef;
  verificationResult: {
    id: string;
    status: string;
    summary: { total: number; passed: number; failed: number; skipped: number; notRun: number };
    recordedBy?: string;
    commandResults: Array<{
      command: string;
      status: string;
      exitCode?: number;
      durationMs?: number;
      stdoutDigest?: string;
      stderrDigest?: string;
      notes?: string;
    }>;
  };
  runRef: ArtifactRef;
  planRef?: ArtifactRef;
  workOrderRef?: ArtifactRef;
  warnings: string[];
}): string {
  const lines: string[] = [];

  lines.push("Verification result derived from run");
  lines.push("");
  lines.push(`Run: ${input.runRef.type}:${input.runRef.id}`);
  if (input.planRef) {
    lines.push(`Plan: ${input.planRef.type}:${input.planRef.id}`);
  } else {
    lines.push("Plan: (none)");
  }
  if (input.workOrderRef) {
    lines.push(`Work order: ${input.workOrderRef.type}:${input.workOrderRef.id}`);
  } else {
    lines.push("Work order: (none)");
  }
  lines.push(`Status: ${input.verificationResult.status}`);
  const summary = input.verificationResult.summary;
  lines.push(
    `Commands: ${summary.total} total, ${summary.passed} passed, ${summary.failed} failed, `
      + `${summary.skipped} skipped, ${summary.notRun} not-run`,
  );
  if (input.verificationResult.recordedBy) {
    lines.push(`Recorded by: ${input.verificationResult.recordedBy}`);
  }
  lines.push("");

  if (input.verificationResult.commandResults.length > 0) {
    lines.push("| # | Command | Status | Exit | Duration |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (let index = 0; index < input.verificationResult.commandResults.length; index += 1) {
      const command = input.verificationResult.commandResults[index]!;
      const exit = command.exitCode === undefined ? "-" : String(command.exitCode);
      const duration = typeof command.durationMs === "number" ? `${command.durationMs}ms` : "-";
      const safeCommand = command.command.replace(/\|/g, "\\|");
      lines.push(
        `| ${index + 1} | ${safeCommand} | ${command.status} | ${exit} | ${duration} |`,
      );
    }
    lines.push("");
  }

  lines.push(`Artifact: ${input.artifact.type}:${input.artifact.id}`);
  lines.push("No findings were auto-resolved.");

  if (input.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of input.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join("\n");
}

// ---------- GitHub workflow safety validator
// (P1.1 github-workflow-safety-validator) ----------
//
// `validateGitHubWorkflowSafety` is a pure static analyzer over a
// GitHub Actions workflow YAML body. It enforces the alpha
// safety contract pinned by
// docs/strategy/verification-runner-ci-github-decision.md and
// doc/examples/github-actions-verification-runner.md:
//
//   - No `pull_request_target`.
//   - No GitHub write permissions
//     (`pull-requests` / `checks` / `contents` / `id-token` /
//     `actions` / `deployments` / `statuses` `write`).
//   - Workflow declares `permissions:` block with
//     `contents: read`.
//   - No GitHub API calls (`gh api`, `curl https://api.github.com`,
//     `actions/github-script`).
//   - Uses `rekon artifacts latest` (no inline index parsing).
//   - Uploads `.rekon/artifacts/**`.
//   - Excludes `.log` files from the upload path.
//   - Appends to `$GITHUB_STEP_SUMMARY`.
//   - Detects mode (`execute` vs `dry-run`) from the
//     `verify run` invocation; an unknown mode is an error so
//     operators always know whether commands run.
//
// Warning-only checks:
//
//   - "GitHub status is not canonical truth" / "Rekon
//     artifacts remain canonical" reminder somewhere in the
//     file.
//   - `retention-days: 7` (we recommend 7–14; operators may
//     differ).
//
// Warnings do **not** make the report invalid. Errors do.
//
// The helper is read-only. It never executes, spawns, reads
// remote URLs, or writes anything.

export type GitHubWorkflowSafetyIssueCode =
  | "pull-request-target"
  | "github-write-permission"
  | "missing-permissions-block"
  | "missing-contents-read"
  | "missing-checks-write"
  | "missing-pull-requests-write"
  | "uses-github-api"
  | "missing-artifacts-latest"
  | "missing-rekon-artifact-upload"
  | "missing-log-exclusion"
  | "missing-job-summary"
  | "missing-canonical-truth-reminder"
  | "missing-retention-days"
  | "missing-rekon-github-checks-opt-in"
  | "missing-write-confirmation"
  | "missing-publish-github-check-dry-run"
  | "missing-publish-github-check-send"
  | "missing-confirm-checks-write-flag"
  | "missing-rekon-pr-comments-opt-in"
  | "missing-pr-comments-write-confirmation"
  | "missing-publish-pr-comment-dry-run"
  | "missing-publish-pr-comment-send"
  | "missing-confirm-pr-comment-write-flag"
  | "missing-pr-comment-marker-reminder"
  | "pull-request-trigger-disallowed"
  | "unknown-mode";

export type GitHubWorkflowSafetyIssue = {
  code: GitHubWorkflowSafetyIssueCode;
  severity: "error" | "warning";
  message: string;
  recommendedFix: string;
};

export type GitHubWorkflowSafetyMode =
  | "execute"
  | "dry-run"
  | "check-send"
  | "pr-comment-dry-run"
  | "pr-comment-send"
  | "unknown";

export type GitHubWorkflowSafetyProfile =
  | "read-only"
  | "github-check-send"
  | "github-pr-comment-send";

export type GitHubWorkflowSafetyReport = {
  valid: boolean;
  path: string;
  profile: GitHubWorkflowSafetyProfile;
  mode: GitHubWorkflowSafetyMode;
  issues: GitHubWorkflowSafetyIssue[];
  summary: {
    profile: GitHubWorkflowSafetyProfile;
    mode: GitHubWorkflowSafetyMode;
    hasPullRequestTarget: boolean;
    hasPullRequestTrigger: boolean;
    hasWritePermissions: boolean;
    hasChecksWrite: boolean;
    hasPullRequestsWrite: boolean;
    hasPermissionsBlock: boolean;
    hasContentsRead: boolean;
    usesGitHubApi: boolean;
    usesArtifactsLatest: boolean;
    uploadsRekonArtifacts: boolean;
    excludesLogs: boolean;
    writesJobSummary: boolean;
    hasCanonicalTruthReminder: boolean;
    hasRetentionDays: boolean;
    hasRekonGitHubChecksOptIn: boolean;
    hasWriteConfirmation: boolean;
    hasPublishGitHubCheckDryRun: boolean;
    hasPublishGitHubCheckSend: boolean;
    hasConfirmChecksWriteFlag: boolean;
    hasRekonPrCommentsOptIn: boolean;
    hasPrCommentsWriteConfirmation: boolean;
    hasPublishPrCommentDryRun: boolean;
    hasPublishPrCommentSend: boolean;
    hasConfirmPrCommentWriteFlag: boolean;
    hasPrCommentMarkerReminder: boolean;
  };
};

const GITHUB_WRITE_PERMISSION_SCOPES = [
  "pull-requests",
  "checks",
  "contents",
  "id-token",
  "actions",
  "deployments",
  "statuses",
  "packages",
] as const;

/**
 * Strip `#` comments from a YAML body so static checks aren't
 * tripped by the documentation comments in the templates that
 * explicitly list what the workflow does NOT do.
 *
 * Quote-aware: `#` characters inside `'...'` or `"..."`
 * strings on the same line are treated as part of the string,
 * not as a comment marker. This matters because workflow `run`
 * steps often quote literal `#` characters (e.g.,
 * `echo "# Heading" >> "$GITHUB_STEP_SUMMARY"`).
 */
function stripGitHubWorkflowYamlComments(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      let inSingle = false;
      let inDouble = false;
      let inBacktick = false;

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];

        if (char === "\\") {
          // Skip the next character — escape sequences inside
          // strings shouldn't terminate quotes.
          index += 1;
          continue;
        }

        if (!inDouble && !inBacktick && char === "'") {
          inSingle = !inSingle;
          continue;
        }
        if (!inSingle && !inBacktick && char === "\"") {
          inDouble = !inDouble;
          continue;
        }
        if (!inSingle && !inDouble && char === "`") {
          inBacktick = !inBacktick;
          continue;
        }

        if (char === "#" && !inSingle && !inDouble && !inBacktick) {
          return line.slice(0, index);
        }
      }

      return line;
    })
    .join("\n");
}

export function validateGitHubWorkflowSafety(
  input: { path: string; content: string; profile?: GitHubWorkflowSafetyProfile },
): GitHubWorkflowSafetyReport {
  const path = typeof input?.path === "string" ? input.path : "<unknown>";
  const content = typeof input?.content === "string" ? input.content : "";
  const profile: GitHubWorkflowSafetyProfile = (
    input?.profile === "github-check-send" || input?.profile === "github-pr-comment-send"
      ? input.profile
      : "read-only"
  );
  const yaml = stripGitHubWorkflowYamlComments(content);
  const issues: GitHubWorkflowSafetyIssue[] = [];

  // --- Mode detection ---------------------------------------
  const hasExecute = /verify\s+run\b[\s\S]*?--execute/.test(yaml);
  const hasDryRun = /verify\s+run\b[\s\S]*?--dry-run/.test(yaml);
  const hasPublishCheckSendCommand = /publish\s+github-check\b[\s\S]*?--send/.test(yaml);
  const hasPublishCheckDryRunCommand = /publish\s+github-check\b[\s\S]*?--dry-run/.test(yaml);
  const hasPublishPrCommentSendCommand = /publish\s+pr-comment\b[\s\S]*?--send/.test(yaml);
  const hasPublishPrCommentDryRunCommand = /publish\s+pr-comment\b[\s\S]*?--dry-run/.test(yaml);

  let mode: GitHubWorkflowSafetyMode = "unknown";

  if (profile === "github-check-send") {
    // Send templates run the execute proof loop AND the send
    // command. `mode` describes the workflow's terminal action.
    if (hasPublishCheckSendCommand) mode = "check-send";
    else mode = "unknown";
  } else if (profile === "github-pr-comment-send") {
    // Step 7f wired `publish pr-comment --send` into the
    // bundled template; the validator now reports
    // `pr-comment-send` when the send command is present and
    // falls back to `pr-comment-dry-run` for legacy templates
    // that still run the dry-run preview only.
    if (hasPublishPrCommentSendCommand) mode = "pr-comment-send";
    else if (hasPublishPrCommentDryRunCommand) mode = "pr-comment-dry-run";
    else mode = "unknown";
  } else {
    if (hasExecute && !hasDryRun) mode = "execute";
    else if (hasDryRun && !hasExecute) mode = "dry-run";
    else mode = "unknown";
  }

  if (mode === "unknown") {
    if (profile === "github-check-send") {
      issues.push({
        code: "unknown-mode",
        severity: "error",
        message:
          "Workflow does not invoke `rekon publish github-check --send`.",
        recommendedFix:
          "Add a step that runs `rekon publish github-check --send --confirm-checks-write --json` after the proof loop.",
      });
    } else if (profile === "github-pr-comment-send") {
      issues.push({
        code: "unknown-mode",
        severity: "error",
        message:
          "Workflow does not invoke `rekon publish pr-comment --send`.",
        recommendedFix:
          "Add a step that runs `rekon publish pr-comment --send --confirm-pr-comment-write --pr-number <n> --json` after the dry-run preview step.",
      });
    } else {
      issues.push({
        code: "unknown-mode",
        severity: "error",
        message:
          "Workflow does not invoke `rekon verify run --execute` or `rekon verify run --dry-run` (or invokes both).",
        recommendedFix:
          "Choose one verify-run mode. Use `--dry-run` for trial adoption; `--execute` to actually run plan commands.",
      });
    }
  }

  // --- pull_request_target -----------------------------------
  const hasPullRequestTarget = /\bpull_request_target\b/.test(yaml);

  if (hasPullRequestTarget) {
    issues.push({
      code: "pull-request-target",
      severity: "error",
      message:
        "Workflow uses `pull_request_target`. That trigger runs in the upstream repo's context with secrets attached while checking out the fork's code.",
      recommendedFix:
        "Use the standard `pull_request` trigger instead. Move any secret-bearing actions to a separate, manually-approved workflow.",
    });
  }

  // --- pull_request trigger ----------------------------------
  // For the write-profile templates, the `pull_request`
  // trigger is rejected by default. Same-repo PRs would in
  // principle be safe, but the trigger fires for forked PRs
  // too — and the workflow has `checks: write` /
  // `pull-requests: write` + Rekon opt-in env. We don't ship a
  // same-repo-only guard yet, so refusing the trigger entirely
  // is the safe v1 default.
  const hasPullRequestTrigger = /^\s*pull_request:/m.test(yaml)
    && !/^\s*pull_request_target:/m.test(yaml);

  if (profile === "github-check-send" && hasPullRequestTrigger) {
    issues.push({
      code: "pull-request-trigger-disallowed",
      severity: "error",
      message:
        "Workflow with `github-check-send` profile uses the `pull_request` trigger. Forked PRs would inherit the workflow's `checks: write` + Rekon opt-in env, which Rekon does not yet support with a same-repo guard.",
      recommendedFix:
        "Remove the `pull_request:` trigger from the workflow. Use `workflow_dispatch` and/or `push` only. A future Rekon slice may add a same-repo guard that lets pull_request opt back in safely.",
    });
  }

  if (profile === "github-pr-comment-send" && hasPullRequestTrigger) {
    issues.push({
      code: "pull-request-trigger-disallowed",
      severity: "error",
      message:
        "Workflow with `github-pr-comment-send` profile uses the `pull_request` trigger. Forked PRs would inherit the workflow's `pull-requests: write` + Rekon opt-in env, which Rekon does not yet support with a same-repo guard.",
      recommendedFix:
        "Remove the `pull_request:` trigger from the workflow. Use `workflow_dispatch` only (the step-7d template ships this way). A future Rekon slice may add a same-repo guard that lets pull_request opt back in safely.",
    });
  }

  // --- GitHub write permissions ------------------------------
  // For the read-only profile, ANY write scope (including
  // `checks: write`) is forbidden. For the `github-check-send`
  // profile, `checks: write` is permitted; every other write
  // scope is still forbidden. For the `github-pr-comment-send`
  // profile, `pull-requests: write` is permitted; every other
  // write scope is still forbidden.
  let hasWritePermissions = false;
  let hasChecksWrite = false;
  let hasPullRequestsWrite = false;

  for (const scope of GITHUB_WRITE_PERMISSION_SCOPES) {
    const pattern = new RegExp(`${escapeRegex(scope)}:\\s*write\\b`);

    if (!pattern.test(yaml)) continue;

    if (scope === "checks") {
      hasChecksWrite = true;
      if (profile === "github-check-send") {
        // Allowed — the opt-in profile needs this.
        continue;
      }
    }

    if (scope === "pull-requests") {
      hasPullRequestsWrite = true;
      if (profile === "github-pr-comment-send") {
        // Allowed — the PR comment profile needs this.
        continue;
      }
    }

    hasWritePermissions = true;
    const profileNote = profile === "github-check-send"
      ? "The `github-check-send` profile permits only `checks: write`."
      : profile === "github-pr-comment-send"
        ? "The `github-pr-comment-send` profile permits only `pull-requests: write`."
        : "The alpha template forbids GitHub write permissions.";
    const fixSuffix = profile === "github-check-send"
      ? "The `github-check-send` profile permits `contents: read` and `checks: write` only."
      : profile === "github-pr-comment-send"
        ? "The `github-pr-comment-send` profile permits `contents: read` and `pull-requests: write` only."
        : "The alpha workflow uses only `permissions: contents: read`.";
    issues.push({
      code: "github-write-permission",
      severity: "error",
      message: `Workflow requests \`${scope}: write\`. ${profileNote}`,
      recommendedFix: `Remove the \`${scope}: write\` declaration. ${fixSuffix}`,
    });
  }

  if (profile === "github-check-send" && !hasChecksWrite) {
    issues.push({
      code: "missing-checks-write",
      severity: "error",
      message:
        "Workflow does not declare `checks: write`. The `github-check-send` profile requires it so `rekon publish github-check --send` can call the GitHub Checks API.",
      recommendedFix:
        "Add `checks: write` to the `permissions:` block alongside `contents: read`. The opt-in template ships this pairing by default.",
    });
  }

  if (profile === "github-pr-comment-send" && !hasPullRequestsWrite) {
    issues.push({
      code: "missing-pull-requests-write",
      severity: "error",
      message:
        "Workflow does not declare `pull-requests: write`. The `github-pr-comment-send` profile requires it to model the future PR-comment write boundary.",
      recommendedFix:
        "Add `pull-requests: write` to the `permissions:` block alongside `contents: read`. The opt-in PR comment template ships this pairing by default.",
    });
  }

  // --- permissions block + contents: read --------------------
  const hasPermissionsBlock = /^\s*permissions:/m.test(yaml);
  const hasContentsRead = /^\s*contents:\s*read\b/m.test(yaml);

  if (!hasPermissionsBlock) {
    issues.push({
      code: "missing-permissions-block",
      severity: "error",
      message: "Workflow does not declare a `permissions:` block.",
      recommendedFix:
        "Add `permissions:\\n  contents: read` at the workflow level. Implicit permissions can vary by repo settings.",
    });
  }

  if (!hasContentsRead) {
    issues.push({
      code: "missing-contents-read",
      severity: "error",
      message: "Workflow does not declare `contents: read`.",
      recommendedFix:
        "Add `contents: read` to the `permissions:` block. Without it the workflow may inherit broader scope.",
    });
  }

  // --- GitHub API calls --------------------------------------
  // Look at the original content (not the comment-stripped body)
  // for API-call markers, because operator comments aren't where
  // these come from. But we still strip comments because the
  // canonical-truth comment mentions "GitHub" plainly.
  const usesGhApi = /\bgh\s+api\b/.test(yaml);
  const usesCurlApi = /curl[^\n]+api\.github\.com/.test(yaml);
  const usesGithubScript = /actions\/github-script/.test(yaml);
  const usesGitHubApi = usesGhApi || usesCurlApi || usesGithubScript;

  if (usesGitHubApi) {
    issues.push({
      code: "uses-github-api",
      severity: "error",
      message:
        "Workflow appears to call the GitHub API (`gh api`, `curl api.github.com`, or `actions/github-script`).",
      recommendedFix:
        "Remove GitHub API calls from this workflow. The alpha template surfaces proof via `$GITHUB_STEP_SUMMARY` and `actions/upload-artifact` only.",
    });
  }

  // --- rekon artifacts latest --------------------------------
  const usesArtifactsLatest = /artifacts\s+latest/.test(yaml);

  if (!usesArtifactsLatest) {
    issues.push({
      code: "missing-artifacts-latest",
      severity: "error",
      message:
        "Workflow does not use `rekon artifacts latest`. Inline index parsing is harder to audit and easy to miswire.",
      recommendedFix:
        "Use `node packages/cli/dist/index.js artifacts latest --type <ArtifactType> --id-only --allow-missing` to resolve latest artifact ids.",
    });
  }

  // --- .rekon/artifacts upload + .log exclusion --------------
  const uploadsRekonArtifacts = /\.rekon\/artifacts\/\*\*/.test(yaml);
  const excludesLogs = /!\.rekon\/artifacts\/\*\*\/\*\.log\b/.test(yaml);

  if (!uploadsRekonArtifacts) {
    issues.push({
      code: "missing-rekon-artifact-upload",
      severity: "error",
      message: "Workflow does not upload `.rekon/artifacts/**`.",
      recommendedFix:
        "Add an `actions/upload-artifact@v4` step with `path: .rekon/artifacts/**` (and `!.rekon/artifacts/**/*.log` to exclude raw logs).",
    });
  }

  if (!excludesLogs) {
    issues.push({
      code: "missing-log-exclusion",
      severity: "error",
      message:
        "Workflow does not exclude `.rekon/artifacts/**/*.log` from the upload path. Raw command logs must not be uploaded.",
      recommendedFix:
        "Add `!.rekon/artifacts/**/*.log` to the `actions/upload-artifact` path filter. Rekon's runner already keeps raw stdout/stderr out of artifact bodies; this is defense in depth.",
    });
  }

  // --- $GITHUB_STEP_SUMMARY ----------------------------------
  const writesJobSummary = /\$GITHUB_STEP_SUMMARY\b/.test(yaml);

  if (!writesJobSummary) {
    issues.push({
      code: "missing-job-summary",
      severity: "error",
      message: "Workflow does not append to `$GITHUB_STEP_SUMMARY`.",
      recommendedFix:
        "Append `# Rekon Verification Summary` and the proof-report markdown to `$GITHUB_STEP_SUMMARY` so reviewers see proof state inline on the job page.",
    });
  }

  // --- Canonical-truth reminder (warning) --------------------
  const flat = yaml.replace(/\s+/g, " ");
  const hasCanonicalTruthReminder =
    /GitHub status is not canonical truth/i.test(flat)
    || /Rekon.{0,80}artifacts.{0,40}(remain|are).{0,40}canonical/i.test(flat);

  if (!hasCanonicalTruthReminder) {
    issues.push({
      code: "missing-canonical-truth-reminder",
      severity: "warning",
      message:
        "Workflow does not include the canonical-truth reminder (`GitHub status is not canonical truth; Rekon artifacts remain canonical.`).",
      recommendedFix:
        "Include the reminder in the job-summary block or in a comment near the top. Reviewers should not mistake the green badge for proof.",
    });
  }

  // --- retention-days (warning) ------------------------------
  const hasRetentionDays = /retention-days:\s*\d+\b/.test(yaml);

  if (!hasRetentionDays) {
    issues.push({
      code: "missing-retention-days",
      severity: "warning",
      message:
        "Workflow does not set `retention-days` on the artifact upload. The default (90 days) is longer than the alpha recommendation.",
      recommendedFix:
        "Add `retention-days: 7` (or 14) to the `actions/upload-artifact@v4` step to bound exposure.",
    });
  }

  // --- github-check-send profile gates ----------------------
  // Rekon opt-in env vars must be declared explicitly in the
  // workflow so the send path's readiness gate clears. The
  // validator accepts either an `env:` block declaration or
  // an explicit `--env REKON_GITHUB_CHECKS=1`-style step env;
  // the simplest static check is "the literal `REKON_GITHUB_CHECKS:
  // \"1\"` or `\"true\"` appears somewhere in the file."
  const hasRekonGitHubChecksOptIn =
    /REKON_GITHUB_CHECKS:\s*["']?(?:1|true)["']?/i.test(yaml);
  const hasWriteConfirmation =
    /REKON_GITHUB_CHECKS_WRITE_CONFIRMED:\s*["']?(?:1|true)["']?/i.test(yaml);
  const hasConfirmChecksWriteFlag = /--confirm-checks-write\b/.test(yaml);

  // --- github-pr-comment-send profile gates ------------------
  const hasRekonPrCommentsOptIn =
    /REKON_PR_COMMENTS:\s*["']?(?:1|true)["']?/i.test(yaml);
  const hasPrCommentsWriteConfirmation =
    /REKON_PR_COMMENTS_WRITE_CONFIRMED:\s*["']?(?:1|true)["']?/i.test(yaml);
  const hasConfirmPrCommentWriteFlag = /--confirm-pr-comment-write\b/.test(yaml);
  // The marker-not-proof reminder is required so the operator
  // copy of the template carries an explicit statement that the
  // idempotency marker is not canonical truth.
  const hasPrCommentMarkerReminder = /marker is an idempotency handle, not proof/i.test(yaml)
    || /marker is not proof/i.test(yaml);

  if (profile === "github-check-send") {
    if (!hasRekonGitHubChecksOptIn) {
      issues.push({
        code: "missing-rekon-github-checks-opt-in",
        severity: "error",
        message:
          "Workflow does not declare `REKON_GITHUB_CHECKS: \"1\"`. The send readiness gate requires it.",
        recommendedFix:
          "Add `env:\\n  REKON_GITHUB_CHECKS: \"1\"\\n  REKON_GITHUB_CHECKS_WRITE_CONFIRMED: \"1\"` at the workflow or job level.",
      });
    }
    if (!hasWriteConfirmation) {
      issues.push({
        code: "missing-write-confirmation",
        severity: "error",
        message:
          "Workflow does not declare `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: \"1\"`. The send readiness gate requires explicit checks-write confirmation.",
        recommendedFix:
          "Add `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: \"1\"` to the workflow or job-level `env:` block. Alternatively, pass `--confirm-checks-write` to the send command and document the gate.",
      });
    }
    if (!hasPublishCheckDryRunCommand) {
      issues.push({
        code: "missing-publish-github-check-dry-run",
        severity: "error",
        message:
          "Workflow does not invoke `rekon publish github-check --dry-run`. The opt-in template runs the dry-run first so reviewers can audit the payload + readiness before the send call.",
        recommendedFix:
          "Add a step that runs `node packages/cli/dist/index.js publish github-check --root . --dry-run --json` before the send step.",
      });
    }
    if (!hasPublishCheckSendCommand) {
      issues.push({
        code: "missing-publish-github-check-send",
        severity: "error",
        message:
          "Workflow does not invoke `rekon publish github-check --send`. The `github-check-send` profile requires it.",
        recommendedFix:
          "Add a step that runs `node packages/cli/dist/index.js publish github-check --root . --send --confirm-checks-write --json` after the proof loop.",
      });
    }
    if (hasPublishCheckSendCommand && !hasConfirmChecksWriteFlag) {
      issues.push({
        code: "missing-confirm-checks-write-flag",
        severity: "error",
        message:
          "Workflow invokes `publish github-check --send` without `--confirm-checks-write`. The send CLI refuses to run without explicit checks-write confirmation.",
        recommendedFix:
          "Pass `--confirm-checks-write` to the `publish github-check --send` invocation, or set `REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1` at the workflow / job env level (the bundled opt-in template does both for defense in depth).",
      });
    }
  }

  if (profile === "github-pr-comment-send") {
    if (!hasRekonPrCommentsOptIn) {
      issues.push({
        code: "missing-rekon-pr-comments-opt-in",
        severity: "error",
        message:
          "Workflow does not declare `REKON_PR_COMMENTS: \"1\"`. The future PR-comment send readiness gate requires it.",
        recommendedFix:
          "Add `env:\\n  REKON_PR_COMMENTS: \"1\"\\n  REKON_PR_COMMENTS_WRITE_CONFIRMED: \"1\"` at the workflow or job level.",
      });
    }
    if (!hasPrCommentsWriteConfirmation) {
      issues.push({
        code: "missing-pr-comments-write-confirmation",
        severity: "error",
        message:
          "Workflow does not declare `REKON_PR_COMMENTS_WRITE_CONFIRMED: \"1\"`. The future PR-comment send readiness gate requires explicit pull-requests-write confirmation.",
        recommendedFix:
          "Add `REKON_PR_COMMENTS_WRITE_CONFIRMED: \"1\"` to the workflow or job-level `env:` block.",
      });
    }
    if (!hasPublishPrCommentDryRunCommand) {
      issues.push({
        code: "missing-publish-pr-comment-dry-run",
        severity: "error",
        message:
          "Workflow does not invoke `rekon publish pr-comment --dry-run`. The `github-pr-comment-send` profile requires the dry-run preview step before the send call so reviewers can audit the payload + readiness.",
        recommendedFix:
          "Add a step that runs `node packages/cli/dist/index.js publish pr-comment --root . --dry-run --json` before the send step.",
      });
    }
    if (!hasPublishPrCommentSendCommand) {
      issues.push({
        code: "missing-publish-pr-comment-send",
        severity: "error",
        message:
          "Workflow does not invoke `rekon publish pr-comment --send`. The `github-pr-comment-send` profile requires it (step 7f shipped the writer).",
        recommendedFix:
          "Add a step that runs `node packages/cli/dist/index.js publish pr-comment --root . --send --confirm-pr-comment-write --pr-number <n> --json` after the dry-run step.",
      });
    }
    if (hasPublishPrCommentSendCommand && !hasConfirmPrCommentWriteFlag) {
      issues.push({
        code: "missing-confirm-pr-comment-write-flag",
        severity: "error",
        message:
          "Workflow invokes `publish pr-comment --send` without `--confirm-pr-comment-write`. The send CLI refuses to run without explicit pr-comment-write confirmation.",
        recommendedFix:
          "Pass `--confirm-pr-comment-write` to the `publish pr-comment --send` invocation, or set `REKON_PR_COMMENTS_WRITE_CONFIRMED=1` at the workflow / job env level (the bundled template does both for defense in depth).",
      });
    }
    if (!hasPrCommentMarkerReminder) {
      issues.push({
        code: "missing-pr-comment-marker-reminder",
        severity: "warning",
        message:
          "Workflow does not include a reminder that the PR comment marker is not proof.",
        recommendedFix:
          "Add a line to the job-summary block (or to a comment near the top) such as `The PR comment marker is an idempotency handle, not proof.`",
      });
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error");

  return {
    valid: errors.length === 0,
    path,
    profile,
    mode,
    issues,
    summary: {
      profile,
      mode,
      hasPullRequestTarget,
      hasPullRequestTrigger,
      hasWritePermissions,
      hasChecksWrite,
      hasPullRequestsWrite,
      hasPermissionsBlock,
      hasContentsRead,
      usesGitHubApi,
      usesArtifactsLatest,
      uploadsRekonArtifacts,
      excludesLogs,
      writesJobSummary,
      hasCanonicalTruthReminder,
      hasRetentionDays,
      hasRekonGitHubChecksOptIn,
      hasWriteConfirmation,
      hasPublishGitHubCheckDryRun: hasPublishCheckDryRunCommand,
      hasPublishGitHubCheckSend: hasPublishCheckSendCommand,
      hasConfirmChecksWriteFlag,
      hasRekonPrCommentsOptIn,
      hasPrCommentsWriteConfirmation,
      hasPublishPrCommentDryRun: hasPublishPrCommentDryRunCommand,
      hasPublishPrCommentSend: hasPublishPrCommentSendCommand,
      hasConfirmPrCommentWriteFlag,
      hasPrCommentMarkerReminder,
    },
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Canonicalise a JSON value: object keys sorted, arrays
 *  preserved in declared order. Stable across runtimes so
 *  the `configHash` we emit is reproducible. */
function canonicalJson(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((item) => canonicalJson(item));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = canonicalJson(obj[key]);
    }
    return out;
  }
  return value;
}

function renderGitHubWorkflowSafetyHuman(report: GitHubWorkflowSafetyReport): string {
  const lines: string[] = [];
  const status = report.valid ? "valid" : "invalid";

  lines.push(`GitHub workflow safety: ${status}`);
  lines.push(`Path: ${report.path}`);
  lines.push(`Profile: ${report.profile}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push("Checks:");

  function check(label: string, ok: boolean): void {
    lines.push(`- ${label} ${ok ? "✓" : "✗"}`);
  }

  check("permissions: contents: read", report.summary.hasPermissionsBlock && report.summary.hasContentsRead);
  check("no pull_request_target", !report.summary.hasPullRequestTarget);
  if (report.profile === "github-check-send") {
    check("permissions: checks: write", report.summary.hasChecksWrite);
    check("no other GitHub write permissions", !report.summary.hasWritePermissions);
    check("REKON_GITHUB_CHECKS opt-in", report.summary.hasRekonGitHubChecksOptIn);
    check("REKON_GITHUB_CHECKS_WRITE_CONFIRMED", report.summary.hasWriteConfirmation);
    check("publish github-check --dry-run step", report.summary.hasPublishGitHubCheckDryRun);
    check("publish github-check --send step", report.summary.hasPublishGitHubCheckSend);
    check("--confirm-checks-write flag", report.summary.hasConfirmChecksWriteFlag);
    check("no pull_request trigger", !report.summary.hasPullRequestTrigger);
  } else if (report.profile === "github-pr-comment-send") {
    check("permissions: pull-requests: write", report.summary.hasPullRequestsWrite);
    check("no other GitHub write permissions", !report.summary.hasWritePermissions);
    check("REKON_PR_COMMENTS opt-in", report.summary.hasRekonPrCommentsOptIn);
    check("REKON_PR_COMMENTS_WRITE_CONFIRMED", report.summary.hasPrCommentsWriteConfirmation);
    check("publish pr-comment --dry-run step", report.summary.hasPublishPrCommentDryRun);
    check("publish pr-comment --send step", report.summary.hasPublishPrCommentSend);
    check("--confirm-pr-comment-write flag", report.summary.hasConfirmPrCommentWriteFlag);
    check("no pull_request trigger", !report.summary.hasPullRequestTrigger);
  } else {
    check("no GitHub write permissions", !report.summary.hasWritePermissions);
  }
  check("no GitHub API calls", !report.summary.usesGitHubApi);
  check("uses rekon artifacts latest", report.summary.usesArtifactsLatest);
  check("uploads .rekon/artifacts", report.summary.uploadsRekonArtifacts);
  check("excludes .log files", report.summary.excludesLogs);
  check("writes GITHUB_STEP_SUMMARY", report.summary.writesJobSummary);

  if (report.issues.length > 0) {
    lines.push("");
    lines.push("Issues:");
    for (const issue of report.issues) {
      lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      lines.push(`  Fix: ${issue.recommendedFix}`);
    }
  }

  return lines.join("\n");
}

function writeOutput(value: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  if (typeof value === "string") {
    console.log(value);
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

function parseBundleJsonFile(files: { path: string; content: string }[], filePath: string): Record<string, unknown> {
  const file = files.find((candidate) => candidate.path === filePath);
  if (!file) return {};
  try {
    const parsed: unknown = JSON.parse(file.content);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function usage(): string {
  return [
    "rekon scan [--semantic-files off|auto|required] [--semantic-debt off|auto|required] [--llm-provider <id>] [--llm-model <model>] [--semantic-debt-model <model>] [--semantic-debt-effort none|low|medium|high|xhigh|max] [--semantic-file-limit <n>] [--semantic-file-path <path>] [--semantic-changed-only] [--semantic-debt-file-limit <n>] [--semantic-debt-file-path <path> ...] [--root <path>] [--json]",
    "rekon welcome [--json] [--no-banner]",
    "rekon setup [--root <path>] [--json] [--no-banner]  (installs/updates the managed AGENTS.md bootstrap)",
    "rekon init [--root <path>]",
    "rekon agent-instructions sync|check|remove [--root <path>] [--json]",
    "rekon refresh [--root <path>] [--skip-publish] [--skip-freshness] [--changed-file <path>] [--proof-gate <ProofGateReport:id>] [--json]",
    "rekon paths freshness [--path <path>] [--root <path>] [--json]",
    "rekon config validate [--root <path>] [--json]",
    "rekon contracts bootstrap [--max-flows <n>] [--max-depth <n>] [--root <path>] [--json]",
    "rekon contracts compile [--root <path>] [--json]",
    "rekon contracts discover [--max-flows <n>] [--max-depth <n>] [--root <path>] [--json]",
    "rekon contracts judge [--candidate-report <id>] [--input <repo-relative.json>] [--mode agent|provider|deterministic] [--model <id>] [--root <path>] [--json]",
    "rekon contracts adopt [--candidate-report <id>] [--judgment-report <id>] [--apply] [--root <path>] [--json]",
    "rekon contracts maintain [--candidate-report <id>] [--input <repo-relative.json>] [--apply] [--max-flows <n>] [--max-depth <n>] [--root <path>] [--json]",
    "rekon contracts reconcile [--max-flows <n>] [--max-depth <n>] [--fail-on-drift] [--root <path>] [--json]",
    "rekon capabilities list [--root <path>] [--verbose] [--json]",
    "rekon capabilities inspect <capability-id> [--root <path>] [--json]",
    "rekon observe [--root <path>] [--changed-file <path>] [--json]",
    "rekon mcp serve [--root <path>] [--no-auto-refresh]  (local MCP context server over stdio)",
    "rekon docs freshness [--root <path>] [--json] [--strict]  (doc-governance freshness over git history; WO-7)",
    "rekon project [--root <path>] [--json]",
    "rekon checks ingest (--junit <report.xml> | --eslint-json <report.json>) [--verification-run <VerificationRun:id>] [--root <path>] [--json]",
    "rekon security ingest (--sarif <report.sarif> | --npm-audit <audit.json> [--package-lock <package-lock.json>] | --pnpm-audit <audit.json> | --yarn-audit <audit.ndjson> | --osv <results.json>) [--verification-run <VerificationRun:id>] [--root <path>] [--json]",
    "rekon evaluate [--root <path>] [--json]",
    "rekon evaluate list [--root <path>] [--json]",
    "rekon evaluate run <evaluator-id> [--root <path>] [--input-json <json>] [--json]",
    "rekon snapshot [--root <path>] [--json]",
    "rekon publish agents [--root <path>] [--json]",
    "rekon publish architecture [--root <path>] [--json]",
    "rekon publish proof [--root <path>] [--json]",
    "rekon publish agent-contract [--root <path>] [--json]",
    "rekon publish github-check --dry-run [--root <path>] [--json]",
    "rekon publish github-check --send [--root <path>] [--confirm-checks-write] [--head-sha <sha>] [--api-base-url <url>] [--json]",
    "rekon publish pr-comment --dry-run [--root <path>] [--json]",
    "rekon publish pr-comment --send [--root <path>] [--pr-number <n>] [--confirm-pr-comment-write] [--api-base-url <url>] [--json]",
    "rekon agent-contract export --output <path> [--force] [--root <path>] [--json]",
    "rekon publish list [--root <path>] [--json]",
    "rekon publish run <publisher-id> [--root <path>] [--input-json <json>] [--json]",
    "rekon memory add --instruction <text> --path <path> [--goal <goal>] [--system <system>] [--capability <capability>] [--tag <tag>] [--layer <layer>] [--priority low|normal|high] [--reliability <0..1>] [--verified] [--rationale <text>] [--root <path>] [--json]",
    "rekon memory list [--root <path>] [--json]",
    "rekon memory select --path <path> [--goal <goal>] [--system <system>] [--capability <capability>] [--tag <tag>] [--limit <n>] [--root <path>] [--json]",
    "rekon memory usage record <memory-entry-id> --outcome helpful|ignored|harmful|stale|unclear [--note <note>] [--selection <selection-id>] [--path <path>] [--goal <goal>] [--used-by <name>] [--root <path>] [--json]",
    "rekon memory usage list [--root <path>] [--json]",
    "rekon memory curation [--root <path>] [--json]",
    "rekon resolve preflight --path <path> --goal <goal> [--root <path>] [--json]",
    "rekon resolve route --path <path> [--path <path>] [--goal <goal>] [--concern <concern>] [--root <path>] [--json]",
    "rekon resolve seam --path <path> [--path <path>] [--primary-owner <owner>] [--goal <goal>] [--root <path>] [--json]",
    "rekon resolve issue --issue <id-or-fragment> [--root <path>] [--json]",
    "rekon resolve list [--root <path>] [--json]",
    "rekon resolve run <resolver-id> [--root <path>] [--input-json <json>] [--json]",
    "rekon intent plan review --plan <path> [--goal <text>] [--kind <bug|feature|refactor|investigation|migration|documentation|unknown>] [--target generic|circe] [--semantic off|auto|required] [--llm-provider <id>] [--llm-model <model>] [--path <file> ...] [--semantic-context latest] [--semantic-context-ref <SemanticFileUnderstandingReport:id> ...] [--task-context latest] [--task-context-ref <TaskContextReport:id> ...] [--root <path>] [--json]",
    "rekon intent plan answer --report <IntentPlanActionabilityReport:id|type:id> --answer <question-id>=<answer> [--answer ...] [--answers <path-to-json>] [--answered-by <name>] [--root <path>] [--json]",
    "rekon semantic file understand --path <file> [--semantic off|auto|required] [--llm-provider <id>] [--llm-model <model>] [--root <path>] [--json]",
    "rekon intent assess --goal <text> [--root <path>] [--json] [--kind <bug|feature|refactor|investigation|migration|documentation|unknown>] [--path <p>] [--system <s>] [--capability <c>] [--step <s>] [--constraint <c>] [--non-goal <n>] [--verification-result <VerificationResult ref>] [--verification-run <VerificationRun ref>] [--verification-plan <VerificationPlan ref>] [--semantic-context latest] [--semantic-context-ref <SemanticFileUnderstandingReport:id> ...] [--task-context latest] [--task-context-ref <TaskContextReport:id> ...]",
    "rekon intent prepare --assessment <IntentAssessmentReport:id|type:id> [--actionability-report <IntentPlanActionabilityReport:id|type:id>] [--root <path>] [--json] [--capability-map <ref>] [--step-graph <ref>] [--handoff-coverage-report <ref>] [--runtime-observation-report <ref>] [--runtime-drift-report <ref>] [--path-freshness-report <ref>] [--verification-result <ref>]",
    "rekon intent status [--root <path>] [--json] [--assessment <ref>] [--prepared-plan <ref>] [--work-order <ref>] [--verification-plan <ref>] [--verification-run <ref>] [--verification-result <ref>] [--path-freshness <ref>] [--runtime-drift <ref>] [--handoff-coverage <ref>]",
    "rekon intent approve --prepared-plan <PreparedIntentPlan:id|type:id> [--intent-status <ref>] [--path-freshness <ref>] [--runtime-drift <ref>] --accept <gap> [--accept <gap>...] --reason <text> [--accepted-by <name>] [--root <path>] [--json]",
    "rekon intent status transition --prepared-plan <PreparedIntentPlan:id|type:id> --previous-status <IntentStatusReport:id|type:id> [--path-freshness <ref>] [--runtime-drift <ref>] --to work-ready --reason <text> [--root <path>] [--json]",
    "rekon intent work-order generate --prepared-plan <PreparedIntentPlan:id|type:id> [--intent-status <ref>] [--path-freshness <ref>] [--runtime-drift <ref>] [--root <path>] [--json]",
    "rekon intent verification-plan generate --prepared-plan <PreparedIntentPlan:id|type:id> [--intent-status <ref>] [--work-order <ref>] [--path-freshness <ref>] [--runtime-drift <ref>] [--root <path>] [--json]",
    "rekon intent bundle write [--intent-id <id>] [--target generic|circe] [--assessment <ref>] [--prepared-plan <ref>] [--intent-status <ref>] [--work-order <ref>] [--verification-plan <ref>] [--path-freshness <ref>] [--runtime-drift <ref>] [--task-context-ref <TaskContextReport ref>] [--root <path>] [--json]",
    "    (--task-context-ref is repeatable; task context is optional bundle context, not proof — it never approves plans, satisfies gates, executes, or writes source)",
    "rekon intent context prepare [--root <path>] [--json]",
    "rekon context task --task <text> [--path <path>] [--profile compact|standard|deep] [--escalation validation-failed] [--provider voyage|mock] [--model <m>] [--top-k <n>] [--no-auto-refresh] [--root <path>] [--json | --model-context]",
    "    (classifies task risk and intent, chooses the smallest sufficient profile; --json includes agentContext and --model-context emits delivery only)",
    "rekon context refine --question <text> --target <source-identifier> --relationship dependency|dependent|test|contract|consumer|producer|implementation (--anchor-path <path> | --anchor-symbol <path#symbol>) [--already-read <path>] [--limit <1..8>] [--root <path>] [--json | --model-context]",
    "    (resolves one exact source-named target through a bounded graph delta; never broad or semantic search)",
    "rekon context validate-change --task <text> --changed-path <path> [--changed-path <path>] [--base-ref <git-ref>] [--context-usage <ContextUsageEvent:id>] [--context-claims-json <json-map>] [--prepare-verification] [--verification-result <ref>] [--placement-verification <PlacementVerificationReport ref>] [--runtime-observation <ref>] [--judgment-json <json>] [--record-proof] [--root <path>] [--json]",
    "    (returns post-edit edge proof and required checks; executes no checks; records an OutcomeEvent in initialized repos and writes verification/proof artifacts only with explicit flags)",
    "rekon step graph build [--root <path>] [--json]",
    "rekon handoff contract build [--root <path>] [--json]",
    "rekon handoff coverage report [--root <path>] [--json]",
    "rekon runtime graph observe [--event-log <path>] [(--istanbul-coverage <coverage-final.json> | --lcov-coverage <lcov.info>) --test-path <test-file>] [--verification-run <VerificationRun:id>] [--root <path>] [--json]",
    "rekon runtime graph drift [--root <path>] [--json]",
    "rekon intent work-order --path <path> --goal <goal> [--root <path>] [--json]",
    "rekon intent remediation [--finding <finding-id>] [--priority p0|p1|p2] [--limit <n>] [--skip-verified] [--root <path>] [--json]",
    "rekon reconcile [--operation <name>] [--apply] [--root <path>] [--json]",
    "rekon reconcile suggest [--finding <finding-id>] [--priority p0|p1|p2] [--limit <n>] [--apply] [--root <path>] [--json]",
    "rekon reconcile preview --plan <id|type:id> [--root <path>] [--json]",
    "rekon capability ontology normalize [--root <path>] [--json]",
    "rekon capability ontology review suggestions --report <id|type:id> [--limit <n>] [--include-decided] [--root <path>] [--json]",
    "rekon capability ontology review decide --term <text> --term-kind verb|noun|candidate --decision extend-ontology|rename-symbol|noise-filter|defer --reason <text> [--suggested-canonical <text>] [--report <id|type:id>] [--candidate <id>] [--root <path>] [--json]",
    "rekon capability ontology review decisions [--root <path>] [--json]",
    "rekon capability ontology suggestions [--ledger <id|type:id>] [--root <path>] [--json]",
    "rekon capability phrase project --report <CapabilityNormalizationReport-id|type:id> [--root <path>] [--json]",
    "rekon capability contract generate [--capability-map <id|type:id>] [--root <path>] [--json]",
    "rekon capability lint architecture [--capability-contract <id|type:id>] [--capability-map <id|type:id>] [--root <path>] [--json]",
    "rekon capability lint bridge-findings [--lint-report <id|type:id>] [--root <path>] [--json]",
    "rekon capability lint write-findings --bridge-report <id|type:id> (--dry-run | --confirm-finding-write) [--root <path>] [--json]",
    "rekon capability graph build [--path <file-or-dir>] [--semantic-file-reports latest] [--semantic-file-report-ref <ref>] [--embedding-similarity latest] [--root <path>] [--json]",
    "rekon embeddings index [--all] [--path <p>] [--provider voyage|mock] [--model <m>] [--dimensions <n>] [--root <path>] [--json]",
    "rekon embeddings query --text <query> [--top-k <n>] [--provider voyage|mock] [--model <m>] [--dimensions <n>] [--root <path>] [--json]  (default top-k 8, max 20; query uses input_type=query; results carry score bands; proposal/context, not proof)",
    "rekon artifacts list [--root <path>] [--type <type>] [--json]",
    "rekon artifacts show <id|type:id> [--root <path>] [--json]",
    "rekon artifacts validate [--root <path>] [--json]",
    "rekon artifacts freshness [--root <path>] [--type <type>] [--id <id>] [--json]",
    "rekon artifacts latest --type <ArtifactType> [--kind <kind>] [--id-only] [--allow-missing] [--root <path>] [--json]",
    "rekon assessments list [--kind risk|opportunity|semantic_claim|model_diagnostic] [--state model_proposed|evidence_observed|tool_corroborated|independently_confirmed|verified|operator_confirmed|opportunity_only|diagnostic_only] [--root <path>] [--json]",
    "rekon findings list [--root <path>] [--status <status>] [--json]",
    "rekon findings lifecycle [--root <path>] [--json]",
    "rekon findings filter [--root <path>] [--json]",
    "rekon findings filter-health [--root <path>] [--json]",
    "rekon findings filter-policy suggest [--recent-limit <n>] [--root <path>] [--json]",
    "rekon findings filter-policy list [--root <path>] [--json]",
    "rekon findings filter-policy status [--policy <id>] [--warnings-only] [--unused-only] [--root <path>] [--json]",
    "rekon findings filter-policy apply <suggestion-id> [--dry-run|--preview] [--force] [--root <path>] [--json]",
    "rekon findings status list [--root <path>] [--json]",
    "rekon findings status set <finding-id> --status accepted|ignored|resolved --note <note> [--reason <reason>] [--root <path>] [--json]",
    "rekon coherency delta [--root <path>] [--json]",
    "rekon issues adjudicate [--root <path>] [--json]",
    "rekon issues list [--status active|accepted|ignored|resolved|mixed] [--root <path>] [--json]",
    "rekon issues merge candidates [--undecided | --decision accepted|rejected|none] [--stale] [--superseded] [--reason <reason>] [--strength strong|medium|weak] [--limit <n>] [--root <path>] [--json]",
    "rekon issues merge candidate <candidate-id> [--root <path>] [--json]",
    "rekon issues merge decide <candidate-id> --decision accepted|rejected --note <note> [--reason <reason>] [--decided-by <name>] [--root <path>] [--json]",
    "rekon issues merge decisions [--root <path>] [--json]",
    "rekon verify coverage plan --framework node|vitest|jest --test-path <test-file> --source-path <source-file> [--source-path <source-file> ...] [--config <runner-config>] [--provider v8|istanbul|babel] [--root <path>] [--json]",
    "rekon verify record [--plan <id|type:id>] --result-json <json> [--root <path>] [--json]",
    "rekon verify run --plan <id|type:id>|--plan-file <path> --dry-run|--preview [--root <path>] [--artifact-root <path>] [--exec-root <path>] [--json]",
    "rekon verify run --plan <id|type:id>|--plan-file <path> --execute [--istanbul-coverage <coverage-final.json> --test-path <test-file>] [--command-timeout-ms <n>] [--timeout-ms <n>] [--max-log-bytes <n>] [--root <path>] [--artifact-root <path>] [--exec-root <path>] [--json]",
    "rekon verify result from-run --run <id|type:id> [--allow-not-run] [--root <path>] [--artifact-root <path>] [--json]",
    "rekon verify github-workflow validate --path <workflow.yml> [--profile read-only|github-check-send|github-pr-comment-send] [--root <path>] [--json]",
    "",
    "First run:",
    "  rekon welcome — a branded Scan → Snapshot → Act introduction (read-only; no scan, no prompts, no ASCII art in --json).",
    "  rekon setup — install or update the bounded AGENTS.md bootstrap, detect workspace state, and recommend the next action (does not run scan or create .rekon/, does not prompt).",
    "  rekon scan — initialize if needed and run the first (or a repeat) repository scan; the canonical first-run command.",
    "  rekon refresh — expert / compatibility update command (the same lifecycle pipeline scan shares); not the first-run UX.",
    "  rekon init — create the .rekon/ workspace and config, then sync the bounded AGENTS.md bootstrap (no scan).",
    "",
    "Intent flow:",
    "  scan → intent context prepare → intent plan review → intent plan answer → intent assess → intent prepare (--actionability-report) → intent status → intent approve → intent status transition → intent work-order generate → intent verification-plan generate → intent bundle write",
    "Fresh repo: run `rekon scan` then `rekon intent context prepare` (builds StepCapabilityGraph + runtime/handoff context — not-evaluated where there is no event log) before `rekon intent assess`.",
    "The bundle can then be handed to Circe via: circe rekon-handoff validate/routes/import.",
    "Rekon prepares, proves, packages, and exports; Circe imports and orchestrates.",
    "Rekon does not run Circe. Intent preparation does not execute commands or edit implementation source; setup manages one bounded AGENTS.md block, and intent:go remains deferred.",
  ].join("\n");
}

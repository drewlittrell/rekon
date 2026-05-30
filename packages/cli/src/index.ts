#!/usr/bin/env node

import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
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
  buildPrCommentBody,
  publishGitHubCheckRun,
  publishPrCommentRun,
  type GitHubCheckPublishResult,
  type GitHubCheckPublisherReadiness,
  type GitHubCheckPublisherReadinessEvent,
  type GitHubCheckPublisherRunStatus,
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
  lookupVerificationEvidence,
  type PathFreshnessReport,
  type SourceStateFingerprint,
  type VerificationCommandResult,
  type VerificationEvidenceSummary,
  type VerificationPlanLike,
  type VerificationRun,
  type VerificationRunCommand,
} from "@rekon/capability-intent";
import verifyCapability, {
  createVerificationRunDryRun,
  deriveVerificationResultFromRun,
  executeVerificationRun,
  type VerificationRun as VerificationRunArtifact,
  type VerificationRunCommandValidationIssue,
  type VerificationRunDryRunResult,
  type VerificationRunSafetySummary,
  VERIFY_CAPABILITY_ID,
  VERIFY_CAPABILITY_VERSION,
} from "@rekon/capability-verify";
import jsTsCapability from "@rekon/capability-js-ts";
import memoryCapability from "@rekon/capability-memory";
import modelCapability, {
  buildBridgeFindingLifecycleIntegrationReport,
  buildCapabilityArchitectureLintReport,
  buildCapabilityLintFindingBridgeReport,
  buildFindingReportWritePreview,
  buildCapabilityContract,
  buildStepCapabilityGraph,
  parseStepCapabilityGraphConfig,
  buildHandoffContract,
  parseHandoffContractConfig,
  HANDOFF_CONTRACT_ARTIFACT_ID_PREFIX,
  HANDOFF_CONTRACT_CONFIG_PATH,
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
} from "@rekon/capability-model";
import policyCapability from "@rekon/capability-policy";
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
import resolverCapability from "@rekon/capability-resolver";
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
} from "@rekon/runtime";
import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import {
  buildSourceStateFingerprint,
  DEFAULT_SOURCE_FINGERPRINT_IGNORE,
  type BridgeFindingLifecycleIntegrationReport,
  type CapabilityArchitectureLintReport,
  type CapabilityContract,
  type CapabilityLintFindingBridgeReport,
  type CapabilityMap,
  type HandoffContract,
  type ObservedRepo,
  type OwnershipMap,
  type StepCapabilityGraph,
} from "@rekon/kernel-repo-model";
import { type CapabilityDefinition, type CapabilityPermission } from "@rekon/sdk";
import {
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

if (isMainEntry()) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
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
    writeOutput({ root, config: ".rekon/config.json" }, json);
    return;
  }

  if (command === "refresh") {
    const skipPublish = parsed.flags["skip-publish"] === true;
    const skipFreshness = parsed.flags["skip-freshness"] === true;
    const changedFiles = parseRepeatableFlag(parsed.flags["changed-file"]);
    const result = await runRefresh(root, {
      skipPublish,
      skipFreshness,
      changedFiles: changedFiles.length > 0 ? changedFiles : undefined,
    });

    writeOutput(result, json);

    if (result.status === "failed") {
      process.exitCode = 1;
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
    const store = createLocalArtifactStore(root);
    await store.init();

    const generatedAt = new Date().toISOString();

    const currentSourceState = await buildSourceStateFingerprint({
      repoRoot: root,
      paths: requestedPaths.length > 0 ? requestedPaths : undefined,
      generatedAt,
    });

    const priorReports = await store.list("PathFreshnessReport");
    // Index entries are appended in write order; the latest
    // entry is the most recent baseline.
    const latestPriorEntry = priorReports.at(-1);
    let baselineSourceState: SourceStateFingerprint | undefined;
    let baselineRef: ArtifactRef | undefined;
    let baselineGeneratedAt: string | undefined;

    if (latestPriorEntry) {
      try {
        const baselineReport = await store.read(latestPriorEntry) as PathFreshnessReport;
        if (baselineReport?.currentSourceState) {
          baselineSourceState = baselineReport.currentSourceState as SourceStateFingerprint;
          baselineRef = {
            type: latestPriorEntry.type,
            id: latestPriorEntry.id,
            schemaVersion: latestPriorEntry.schemaVersion,
          };
          baselineGeneratedAt = baselineReport.header?.generatedAt;
        }
      } catch {
        // Treat unreadable baseline like a missing one;
        // status will be "unknown" and the operator will
        // be told to re-run after changes.
        baselineSourceState = undefined;
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

    if (existingFindings.length === 0) {
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

  if (command === "intent" && subcommand === "work-order") {
    const path = typeof parsed.flags.path === "string" ? parsed.flags.path : undefined;
    const goal = typeof parsed.flags.goal === "string" ? parsed.flags.goal : "";

    if (!path) {
      throw new Error("rekon intent work-order requires --path <path>.");
    }

    const runtime = await createDefaultRuntime(root);
    const existingPreflight = await runtime.artifacts.list("ResolverPacket");

    if (existingPreflight.length === 0) {
      await ensurePreflight(runtime, path, goal);
    }

    const refs = await runtime.runAct({
      actuatorId: "@rekon/capability-intent.work-order",
      input: {
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

    writeOutput(result, json);
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
    // `--plan`. The CLI exits non-zero when execution returns
    // `failed` / `timeout` / `killed`.
    const planFlag = typeof parsed.flags.plan === "string" ? parsed.flags.plan : undefined;
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

    if (dryRunFlag && executeFlag) {
      throw new Error(
        "rekon verify run does not accept --dry-run and --execute together. "
          + "Choose one: `--dry-run` (no execution) or `--execute` (run the plan).",
      );
    }
    if (!planFlag) {
      throw new Error("rekon verify run requires --plan <id|type:id>.");
    }
    if (!dryRunFlag && !executeFlag) {
      throw new Error(
        "rekon verify run requires --dry-run / --preview (no execution) "
          + "or --execute (run the plan).",
      );
    }

    const store = createLocalArtifactStore(root);
    await store.init();

    const { entry, warnings: resolveWarnings } = await resolveVerificationPlanEntry(
      store,
      planFlag,
    );
    const planArtifact = (await store.read(entry)) as VerificationPlanLike;
    const planRef: ArtifactRef = {
      type: entry.type,
      id: entry.id,
      schemaVersion: entry.schemaVersion,
    };
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
          ],
        },
      };
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
          cwd: root,
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

      const ref = await store.write(executionResult.verificationRun, { category: "actions" });
      const verificationRun = executionResult.verificationRun;
      const failureExit = verificationRun.status === "failed"
        || verificationRun.status === "timeout"
        || verificationRun.status === "killed";
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
        safety: executionResult.safety,
        warnings: [...resolveWarnings, ...executionResult.safety.warnings],
        message: failureExit
          ? "Verification commands executed; one or more failed/timed out/killed. No findings were auto-resolved."
          : "Verification commands executed. No findings were auto-resolved.",
      };

      if (json) {
        writeOutput(output, json);
      } else {
        writeOutput(renderVerifyRunExecuteHuman(output), false);
      }

      if (failureExit) {
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

    const ref = await store.write(dryRunResult.verificationRun, { category: "actions" });

    const output = {
      dryRun: true,
      executed: false,
      artifact: ref,
      verificationRun: {
        id: dryRunResult.verificationRun.header.artifactId,
        status: dryRunResult.verificationRun.status,
        summary: dryRunResult.verificationRun.summary,
        commands: dryRunResult.verificationRun.commands.map((command) => ({
          id: command.id,
          command: command.command,
          status: command.status,
          argv: command.argv,
        })),
      },
      planRef,
      workOrderRef,
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
    const allowNotRun = Boolean(parsed.flags["allow-not-run"]);

    if (!runFlag) {
      throw new Error("rekon verify result from-run requires --run <id|type:id>.");
    }

    const store = createLocalArtifactStore(root);
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

    throw new Error(`VerificationRun not found for --run ${runFlag}. Known run ids: ${known || "none"}.`);
  }

  return { entry: match, warnings };
}

function sortByWrittenAtDesc<T extends { writtenAt: string }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));
}

type RekonConfig = {
  capabilities?: Array<{ package: string }>;
  permissions?: Record<string, CapabilityPermission[]>;
};

const BUILT_IN_CAPABILITIES: Record<string, CapabilityDefinition> = {
  "@rekon/capability-docs": docsCapability,
  "@rekon/capability-graph": graphCapability,
  "@rekon/capability-intent": intentCapability,
  "@rekon/capability-js-ts": jsTsCapability,
  "@rekon/capability-memory": memoryCapability,
  "@rekon/capability-model": modelCapability,
  "@rekon/capability-ontology": ontologyCapability,
  "@rekon/capability-policy": policyCapability,
  "@rekon/capability-reconcile": reconcileCapability,
  "@rekon/capability-resolver": resolverCapability,
};

const DEFAULT_CAPABILITIES = [
  "@rekon/capability-js-ts",
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

async function readConfig(root: string): Promise<RekonConfig> {
  const configPath = resolve(root, ".rekon", "config.json");

  try {
    const parsed = JSON.parse(await readFile(configPath, "utf8")) as RekonConfig;

    return {
      capabilities: Array.isArray(parsed.capabilities) && parsed.capabilities.length > 0
        ? parsed.capabilities
        : DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName })),
      permissions: parsed.permissions ?? {},
    };
  } catch {
    return {
      capabilities: DEFAULT_CAPABILITIES.map((packageName) => ({ package: packageName })),
      permissions: {},
    };
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
  | "project"
  | "snapshot"
  | "evaluate"
  | "findings.filter"
  | "findings.filter-health"
  | "findings.lifecycle"
  | "issues.adjudicate"
  | "coherency.delta"
  | "publish.architecture"
  | "artifacts.validate"
  | "artifacts.freshness";

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
};

const REQUIRED_REFRESH_ARTIFACT_TYPES = [
  "EvidenceGraph",
  "ObservedRepo",
  "OwnershipMap",
  "CapabilityMap",
  "IntelligenceSnapshot",
  "FindingReport",
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
  "FindingLifecycleReport",
  "IssueAdjudicationReport",
  "CoherencyDelta",
  "Publication",
];

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

  // 3. observe
  try {
    const ref = await runtime.runObserve(
      options.changedFiles && options.changedFiles.length > 0
        ? { changedFiles: options.changedFiles, incremental: true }
        : undefined,
    );
    steps.push({ id: "observe", status: "passed", artifacts: recordArtifacts(ref) });
  } catch (error) {
    steps.push({ id: "observe", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 4. project
  try {
    const refs = await runtime.runProject();
    steps.push({ id: "project", status: "passed", artifacts: recordArtifacts(refs) });
  } catch (error) {
    steps.push({ id: "project", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 5. snapshot
  try {
    const ref = await runtime.runSnapshot();
    steps.push({ id: "snapshot", status: "passed", artifacts: recordArtifacts(ref) });
  } catch (error) {
    steps.push({ id: "snapshot", status: "failed", message: messageOf(error) });
    return finalize("failed");
  }

  // 6. evaluate
  try {
    const refs = await runtime.runEvaluate();
    steps.push({ id: "evaluate", status: "passed", artifacts: recordArtifacts(refs) });
  } catch (error) {
    steps.push({ id: "evaluate", status: "failed", message: messageOf(error) });
    return finalize("failed");
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

  // 7a. findings filter — system / policy / content / result false-
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

  // 7b. findings filter health — high-filter-rate /
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

  // 9. publish architecture (optional)
  let publishStatus: RefreshStep["status"] = "skipped";

  if (options.skipPublish) {
    steps.push({ id: "publish.architecture", status: "skipped", message: "--skip-publish" });
  } else {
    try {
      const refs = await runtime.runPublish({ publisherId: "@rekon/capability-docs.architecture-summary" });
      steps.push({ id: "publish.architecture", status: "passed", artifacts: recordArtifacts(refs) });
      publishStatus = "passed";
    } catch (error) {
      steps.push({ id: "publish.architecture", status: "failed", message: messageOf(error) });
      return finalize("failed");
    }
  }

  // Check required artifact families before validation/freshness.
  const missing: string[] = [];

  for (const type of REQUIRED_REFRESH_ARTIFACT_TYPES) {
    if ((await store.list(type)).length === 0) {
      missing.push(type);
    }
  }

  if (!options.skipPublish) {
    const publicationRefs = await store.list("Publication");
    let foundArchitectureSummary = false;

    for (const ref of publicationRefs) {
      const publication = await store.read(ref) as { kind?: string };

      if (publication?.kind === "architecture-summary") {
        foundArchitectureSummary = true;
        break;
      }
    }

    if (!foundArchitectureSummary) {
      missing.push("Publication(architecture-summary)");
    }
  }

  // If publish was skipped, drop any stale Publication entries from
  // freshness comparison too — we're not judging publications this run.
  // (handled implicitly: skipped step records itself; no missing entry recorded.)

  result.missing = missing;

  // 10. artifacts validate
  const validation = await validateArtifactIndex(store);
  steps.push({
    id: "artifacts.validate",
    status: validation.valid ? "passed" : "failed",
    issues: validation.issues,
  });
  result.validation = { valid: validation.valid, issues: validation.issues };

  // 11. artifacts freshness (optional)
  if (options.skipFreshness) {
    steps.push({ id: "artifacts.freshness", status: "skipped", message: "--skip-freshness" });
  } else {
    const freshness = await validateArtifactFreshness(store);
    const majorTypes = options.skipPublish
      ? MAJOR_FRESHNESS_TYPES.filter((type) => type !== "Publication")
      : MAJOR_FRESHNESS_TYPES;
    const latestMajor = computeLatestMajorFreshness(freshness, majorTypes);
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
      summary: { status: freshness.status, latestMajor },
      message: allMajorFresh
        ? undefined
        : anyMajorStale
          ? "Latest major artifact is stale; rerun the upstream phase."
          : anyMajorUnknown
            ? "Latest major artifact freshness is unknown; check lineage."
            : "Latest major artifacts have non-fresh freshness.",
    });
    result.freshness = {
      status: freshness.status,
      issues: majorIssues,
      latestMajor,
    };
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

function computeLatestMajorFreshness(
  freshness: ArtifactFreshnessResult,
  majorTypes: readonly string[] = MAJOR_FRESHNESS_TYPES,
): Array<{ type: string; id: string; status: ArtifactFreshnessStatus }> {
  const byType = new Map<string, ArtifactFreshnessEntry>();

  for (const entry of freshness.artifacts) {
    if (!majorTypes.includes(entry.type)) {
      continue;
    }

    const existing = byType.get(entry.type);

    if (!existing || existing.id.localeCompare(entry.id) < 0) {
      byType.set(entry.type, entry);
    }
  }

  return Array.from(byType.values()).map((entry) => ({
    type: entry.type,
    id: entry.id,
    status: effectiveMajorStatus(entry),
  }));
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

  if (protectedPath && !options.force) {
    throw new Error(
      `Refusing to overwrite protected agent instruction file ${relativeFromRoot} without --force.`,
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

  if (protectedPath) {
    result.message = "Overwrote protected agent instruction file because --force was provided.";
  } else if (options.force) {
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

  if ((await runtime.artifacts.list("FindingReport")).length === 0) {
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

  if ((await runtime.artifacts.list("FindingReport")).length === 0) {
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
): Promise<void> {
  if ((await runtime.artifacts.list("EvidenceGraph")).length === 0) {
    await runtime.runObserve({
      changedFiles: [path],
      incremental: true,
    });
  }

  if ((await runtime.artifacts.list("OwnershipMap")).length === 0) {
    await runtime.runProject();
  }

  if ((await runtime.artifacts.list("FindingReport")).length === 0) {
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

  await runtime.runResolve({
    resolverId: "resolve.preflight",
    input: {
      snapshotRef,
      path,
      goal,
    },
  });
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

function usage(): string {
  return [
    "rekon init [--root <path>]",
    "rekon refresh [--root <path>] [--skip-publish] [--skip-freshness] [--changed-file <path>] [--json]",
    "rekon paths freshness [--path <path>] [--root <path>] [--json]",
    "rekon config validate [--root <path>] [--json]",
    "rekon capabilities list [--root <path>] [--verbose] [--json]",
    "rekon capabilities inspect <capability-id> [--root <path>] [--json]",
    "rekon observe [--root <path>] [--changed-file <path>] [--json]",
    "rekon project [--root <path>] [--json]",
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
    "rekon artifacts list [--root <path>] [--type <type>] [--json]",
    "rekon artifacts show <id|type:id> [--root <path>] [--json]",
    "rekon artifacts validate [--root <path>] [--json]",
    "rekon artifacts freshness [--root <path>] [--type <type>] [--id <id>] [--json]",
    "rekon artifacts latest --type <ArtifactType> [--kind <kind>] [--id-only] [--allow-missing] [--root <path>] [--json]",
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
    "rekon verify record [--plan <id|type:id>] --result-json <json> [--root <path>] [--json]",
    "rekon verify run --plan <id|type:id> --dry-run|--preview [--root <path>] [--json]",
    "rekon verify run --plan <id|type:id> --execute [--command-timeout-ms <n>] [--timeout-ms <n>] [--max-log-bytes <n>] [--root <path>] [--json]",
    "rekon verify result from-run --run <id|type:id> [--allow-not-run] [--root <path>] [--json]",
    "rekon verify github-workflow validate --path <workflow.yml> [--profile read-only|github-check-send|github-pr-comment-send] [--root <path>] [--json]",
  ].join("\n");
}

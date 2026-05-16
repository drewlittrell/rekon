#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import docsCapability from "@rekon/capability-docs";
import graphCapability from "@rekon/capability-graph";
import intentCapability, {
  createVerificationResult,
  lookupVerificationEvidence,
  type VerificationCommandResult,
  type VerificationEvidenceSummary,
  type VerificationPlanLike,
} from "@rekon/capability-intent";
import jsTsCapability from "@rekon/capability-js-ts";
import memoryCapability from "@rekon/capability-memory";
import modelCapability from "@rekon/capability-model";
import policyCapability from "@rekon/capability-policy";
import reconcileCapability from "@rekon/capability-reconcile";
import resolverCapability from "@rekon/capability-resolver";
import {
  type ArtifactFreshnessEntry,
  type ArtifactFreshnessResult,
  type ArtifactFreshnessStatus,
  type ArtifactIndexEntry,
  buildCoherencyDelta,
  buildFindingFilterHealthReport,
  buildFindingFilterReport,
  buildFindingLifecycleReport,
  buildIssueAdjudicationReport,
  createLocalArtifactStore,
  createRuntime,
  recordIssueMergeDecision,
  validateArtifactFreshness,
  validateArtifactIndex,
} from "@rekon/runtime";
import { type ArtifactRef } from "@rekon/kernel-artifacts";
import { type CapabilityDefinition, type CapabilityPermission } from "@rekon/sdk";
import {
  type FindingStatusDecision,
  type FindingStatusDecisionReason,
  type FindingStatusDecisionStatus,
  type FindingStatusLedger,
  type IssueAdjudicationReport,
  type IssueMergeDecisionLedger,
  type IssueMergeDecisionReason,
  applyIssueMergeDecisionsToCandidates,
  createFindingStatusLedger,
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
    const report = await buildFindingFilterReport(store);
    const ref = await store.write(report, { category: "findings" });

    writeOutput({ artifact: ref, summary: report.summary }, json);
    return;
  }

  if (command === "findings" && subcommand === "filter-health") {
    const store = createLocalArtifactStore(root);
    await store.init();
    const health = await buildFindingFilterHealthReport(store);
    const ref = await store.write(health, { category: "findings" });

    writeOutput({ artifact: ref, summary: health.summary, alerts: health.alerts }, json);
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
    const mergeCandidates = applyIssueMergeDecisionsToCandidates(
      report.mergeCandidates,
      ledger,
    );

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
        mergeCandidates,
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

    const ledger = await recordIssueMergeDecision(store, {
      candidateId,
      decision: decisionFlag,
      note,
      reason,
      decidedBy,
    });
    const latestDecision = ledger.decisions[ledger.decisions.length - 1];

    writeOutput(
      {
        artifact: {
          type: "IssueMergeDecisionLedger",
          id: ledger.header.artifactId,
          schemaVersion: ledger.header.schemaVersion,
        },
        decision: latestDecision,
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
      writeOutput({ ledger: null, decisions: [] }, json);
      return;
    }
    writeOutput(
      {
        ledger: {
          type: "IssueMergeDecisionLedger",
          id: ledger.header.artifactId,
          schemaVersion: ledger.header.schemaVersion,
        },
        decisions: ledger.decisions,
      },
      json,
    );
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

  // 7a. findings filter — system / policy false-positive audit. Filter
  // artifacts are produced so suppression is auditable; lifecycle /
  // adjudication still read FindingReport directly until the
  // filter-aware lifecycle slice ships next. See
  // docs/strategy/issue-governance-architecture-decision.md.
  try {
    const filterReport = await buildFindingFilterReport(store);
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
  // low-confidence-filtered diagnostics over the latest filter report.
  try {
    const health = await buildFindingFilterHealthReport(store);
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
    "rekon artifacts list [--root <path>] [--type <type>] [--json]",
    "rekon artifacts show <id|type:id> [--root <path>] [--json]",
    "rekon artifacts validate [--root <path>] [--json]",
    "rekon artifacts freshness [--root <path>] [--type <type>] [--id <id>] [--json]",
    "rekon findings list [--root <path>] [--status <status>] [--json]",
    "rekon findings lifecycle [--root <path>] [--json]",
    "rekon findings filter [--root <path>] [--json]",
    "rekon findings filter-health [--root <path>] [--json]",
    "rekon findings status list [--root <path>] [--json]",
    "rekon findings status set <finding-id> --status accepted|ignored|resolved --note <note> [--reason <reason>] [--root <path>] [--json]",
    "rekon coherency delta [--root <path>] [--json]",
    "rekon issues adjudicate [--root <path>] [--json]",
    "rekon issues list [--status active|accepted|ignored|resolved|mixed] [--root <path>] [--json]",
    "rekon issues merge candidates [--root <path>] [--json]",
    "rekon issues merge decide <candidate-id> --decision accepted|rejected --note <note> [--reason <reason>] [--decided-by <name>] [--root <path>] [--json]",
    "rekon issues merge decisions [--root <path>] [--json]",
    "rekon verify record [--plan <id|type:id>] --result-json <json> [--root <path>] [--json]",
  ].join("\n");
}

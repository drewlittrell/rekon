#!/usr/bin/env node

import { execFile, execFileSync, spawn } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
import { appendFile, chmod, cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";

import {
  buildRepositoryContractProjection,
  buildTaskPact,
  compileTaskContext,
  estimateModelContextDeliveryTokens,
  projectModelContext,
  projectModelContextDelivery,
  selectLexicalGraphContextPaths,
  selectTaskContractGuidance,
} from "@rekon/capability-model";
import { MCP_SERVER_VERSION, REKON_AGENT_MCP_STEPS } from "@rekon/mcp";
import { createLocalArtifactStore } from "@rekon/runtime";

import {
  assessIndependentPlacementOutcome,
  assessRekonContextUse,
  classifyBenchmarkModifiedPaths,
  compactLocalAgentRun,
  compareManagedLocalAgentPair,
  compareLocalAgentPair,
  estimateVisibleTokenUsage,
  LOCAL_AGENT_RESPONSE_SCHEMA,
  mergeAgentCommands,
  normalizeLocalAgentResponse,
  parseCodexJsonl,
  parseGitStatusPaths,
  selectContextUsageForChange,
  scoreLocalAgentOutcome,
  summarizeCodexExploration,
  summarizeContextSelection,
  summarizeContextUse,
  summarizeCodexTokenUsage,
  summarizeLocalAgentRuns,
  summarizeRekonAdoption,
  summarizeRekonProductLoop,
} from "./lib/model-interface-local-agent-eval.mjs";
import {
  createSourceStateBinding,
} from "@rekon/kernel-artifacts";
import {
  createPlacementVerificationReport,
  signPlacementVerificationReport,
  verifyPlacementVerificationAttestation,
} from "@rekon/kernel-repo-model";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INDEPENDENT_PLACEMENT_JUDGE_ID = "@rekon/benchmark-independent-placement-judge";
const INDEPENDENT_PLACEMENT_JUDGE_VERSION = "1.0.0";
const options = parseArgs(process.argv.slice(2));
const fixturePath = join(root, corpusFixturePath(options.corpus));
const fixture = await loadFixture(fixturePath);
const fixtureRepoRoot = resolve(dirname(fixturePath), fixture.repository.root);
const cliEntry = join(root, "packages/cli/dist/index.js");
const cases = selectCases(fixture.cases, options.cases);
const generatedAt = new Date().toISOString();
const managedInstructionsVersion = await readManagedInstructionsVersion();
const campaign = buildCampaignManifest();
const repositoryLaw = buildFixtureRepositoryLaw(fixture, generatedAt);
const preparedCases = cases.map(prepareCase);
const contextDeliveryDigests = preparedCases.map(({ entry, contextPacket }) => ({
  caseId: entry.id,
  sha256: createHash("sha256").update(JSON.stringify(contextPacket)).digest("hex"),
}));
const contextDeliveryMetrics = preparedCases.map(({ entry, contextPacket }) => ({
  caseId: entry.id,
  estimatedTokens: estimateModelContextDeliveryTokens(contextPacket),
  utf8Bytes: Buffer.byteLength(JSON.stringify(contextPacket), "utf8"),
}));

if (options.dryRun) {
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "1.1.0",
    campaign,
    runner: "codex-subscription",
    corpus: options.corpus,
    delivery: options.delivery,
    contextPolicy: options.contextPolicy,
    model: options.model ?? "default",
    reasoningEffort: options.reasoningEffort ?? "default",
    cases: cases.map((entry) => entry.id),
    conditions: options.conditions,
    repeats: options.repeats,
    isolatedRuns: cases.length * options.repeats * options.conditions.length,
    sandbox: "workspace-write-in-disposable-fixture",
    sourceRetention: "no source, prompts, diffs, free-form model text, or raw commands",
    tokenUsage: {
      status: "available-after-executed-runs",
      subscriptionReported: "Codex turn.completed aggregate counts",
      visibleEstimate: "UTF-8 bytes divided by four; excludes hidden and system context",
    },
    productLoop: {
      required: options.productLoop,
      condition: options.productLoop ? "rekon" : "not-gated",
      timeoutMs: options.timeoutMs,
      sequence: [
        "context_for_task",
        "source edit",
        "validate_change",
        "prepare verification",
        "execute verification",
        "record VerificationResult",
        "independent hidden-oracle placement judgment",
        "trusted placement attestation",
        "final validation",
        "record ProofGateReport",
        "proof-gated refresh",
      ],
      outcomeOracle: "independent hidden behavior, scope, and repository checks",
      placementTrust: "ephemeral Ed25519 key held by the parent harness; the acting model receives only the public key",
    },
    contextSelections: preparedCases.map(({ entry, contextSelection }) => ({
      caseId: entry.id,
      ...contextSelection,
    })),
    contextDeliveryDigests,
    contextDeliveryMetrics,
    rekonInterface: options.delivery === "managed"
      ? `managed AGENTS.md instructions plus real read-only MCP using ${options.contextPolicy} context delivery; no prompt-injected context`
      : "task context injected directly into the evaluation prompt",
  }, null, 2)}\n`);
  process.exit(0);
}

const codexVersion = commandOutput("codex", ["--version"]) || "unknown";
const runs = [];
for (let caseIndex = 0; caseIndex < preparedCases.length; caseIndex += 1) {
  const { entry, contextPacket, contextSelection } = preparedCases[caseIndex];
  for (let repeat = 1; repeat <= options.repeats; repeat += 1) {
    const conditionOrder = ((caseIndex + repeat) % 2 === 1
      ? ["baseline", "rekon"]
      : ["rekon", "baseline"]).filter((condition) => options.conditions.includes(condition));
    for (const condition of conditionOrder) {
      process.stderr.write(`[model-interface-local-agent] ${entry.id} r${repeat} ${condition}\n`);
      const run = await runCondition({ caseEntry: entry, condition, contextPacket, contextSelection, repeat });
      runs.push(compactLocalAgentRun(run));
    }
  }
}

const pairs = pairRuns(runs).map(({ baseline, rekon }) => ({
  caseId: baseline?.caseId ?? rekon?.caseId,
  repeat: baseline?.repeat ?? rekon?.repeat,
  ...(options.delivery === "managed"
    ? compareManagedLocalAgentPair(baseline, rekon)
    : compareLocalAgentPair(baseline, rekon)),
  ...(options.delivery === "managed" ? { adoption: rekon?.adoption } : {}),
}));
const conditionSummary = summarizeLocalAgentRuns(runs);
const report = {
  schemaVersion: "1.1.0",
  generatedAt,
  campaign,
  git: gitState(),
  runner: {
    id: "codex-subscription",
    version: codexVersion,
    model: options.model ?? "default",
    reasoningEffort: options.reasoningEffort ?? "default",
  },
  corpus: options.corpus,
  delivery: options.delivery,
  contextPolicy: options.contextPolicy,
  hypothesis: options.delivery === "managed"
    ? options.productLoop
      ? "Agents use Rekon to obtain bounded context, prove the resulting change, and refresh maintained knowledge without reducing independently measured correctness"
      : "Agents follow Rekon-managed repository instructions and obtain bounded context before broad exploration or editing"
    : "Rekon context improves or preserves change correctness while reducing repository exploration",
  sourceRetention: "no source, prompts, diffs, free-form model text, or raw commands",
  tokenUsage: {
    subscriptionReported: "Codex turn.completed aggregate counts; inputTokens includes cachedInputTokens",
    visibleEstimate: "UTF-8 bytes divided by four across prompt, tool output, model actions, and final response",
    retention: "aggregate counts only",
  },
  fixture: {
    schemaVersion: fixture.schemaVersion,
    cases: cases.map((entry) => entry.id),
    repositoryFiles: fixture.repository.files,
    contextSelections: preparedCases.map(({ entry, contextSelection }) => ({
      caseId: entry.id,
      ...contextSelection,
    })),
    contextDeliveryDigests,
    contextDeliveryMetrics,
  },
  options: {
    delivery: options.delivery,
    contextPolicy: options.contextPolicy,
    repeats: options.repeats,
    profile: options.profile ?? "fixture-default",
    timeoutMs: options.timeoutMs,
    reasoningEffort: options.reasoningEffort ?? "default",
    productLoop: options.productLoop,
  },
  summary: {
    pairedRuns: pairs.length,
    decisions: Object.fromEntries(["candidate", "no-advantage", "discard", "inconclusive"].map((decision) => [
      decision,
      pairs.filter((entry) => entry.decision === decision).length,
    ])),
    baselinePasses: runs.filter((run) => run.condition === "baseline" && run.score.passed).length,
    rekonPasses: runs.filter((run) => run.condition === "rekon" && run.score.passed).length,
    conditions: conditionSummary,
    tokenComparison: compareConditionTokens(conditionSummary),
    ...(options.delivery === "managed" ? {
      adoption: summarizeAdoption(runs.filter((run) => run.condition === "rekon")),
    } : {}),
  },
  pairs,
  runs,
};
const outputPath = resolve(root, options.output ?? defaultOutputPath(generatedAt));
const ledgerPath = resolve(root, options.ledger);
await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(ledgerPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
await appendFile(ledgerPath, `${JSON.stringify({
  generatedAt,
  git: report.git,
  runner: report.runner,
    cases: report.fixture.cases,
    corpus: report.corpus,
  summary: report.summary,
  pairs,
  report: relative(root, outputPath),
})}\n`);

if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else printSummary(report, outputPath, ledgerPath);
if (runs.some((run) => run.status !== "ok")) process.exitCode = 1;

async function runCondition({ caseEntry, condition, contextPacket, contextSelection, repeat }) {
  const tempRoot = await mkdtemp(join(tmpdir(), "rekon-model-interface-agent-"));
  const worktree = join(tempRoot, "repo");
  const schemaPath = join(tempRoot, "response.schema.json");
  const finalPath = join(tempRoot, "final.json");
  const cliShimDir = join(tempRoot, "bin");
  const independentJudge = options.productLoop
    && options.delivery === "managed"
    && condition === "rekon"
    ? createIndependentPlacementJudge()
    : undefined;
  let error;
  try {
    await cp(fixtureRepoRoot, worktree, { recursive: true });
    for (const source of fixture.repositoryContractSources ?? []) {
      const sourcePath = join(worktree, source.path);
      await mkdir(dirname(sourcePath), { recursive: true });
      await writeFile(sourcePath, `${JSON.stringify(source.document, null, 2)}\n`);
    }
    if (options.delivery === "managed" && condition === "rekon") {
      if (independentJudge) {
        await installPlacementTrustPolicy(worktree, independentJudge.trustedKey);
      }
      await prepareManagedRekonWorktree(worktree);
      await prepareBenchmarkCliShim(cliShimDir);
    }
    await writeFile(schemaPath, `${JSON.stringify(LOCAL_AGENT_RESPONSE_SCHEMA, null, 2)}\n`);
    await initializeGit(worktree);
    const initialArtifactKeys = options.delivery === "managed" && condition === "rekon"
      ? await captureArtifactKeys(worktree)
      : new Set();
    const started = performance.now();
    const prompt = buildPrompt(caseEntry.task, condition, contextPacket);
    const result = await runCodex({
      worktree,
      schemaPath,
      finalPath,
      prompt,
      enableMcp: options.delivery === "managed" && condition === "rekon",
      cliShimDir: options.delivery === "managed" && condition === "rekon"
        ? cliShimDir
        : undefined,
    });
    const elapsedMs = Math.round(performance.now() - started);
    const parsed = parseCodexJsonl(result.stdout);
    const tokenUsage = summarizeCodexTokenUsage(parsed.events);
    const visibleTokenEstimate = estimateVisibleTokenUsage(parsed.events, prompt);
    const exploration = summarizeCodexExploration(parsed.events, fixture.repository.files);
    const finalValue = await readJson(finalPath);
    const normalizedFinal = normalizeLocalAgentResponse(finalValue, fixture.repository.files);
    if (!normalizedFinal.ok) error = normalizedFinal.error;
    const modifiedPaths = parseGitStatusPaths(rawCommandOutput(
      "git",
      ["status", "--short", "--untracked-files=all"],
      worktree,
    ));
    const {
      sourcePaths: sourceModifiedPaths,
      generatedPaths: generatedModifiedPaths,
    } = classifyBenchmarkModifiedPaths(modifiedPaths);
    const requiredChecks = await runChecks(worktree, caseEntry.oracle.commands ?? []);
    const oracleChecks = await runOracleChecks(worktree, caseEntry.oracle.oracleTests ?? []);
    const independentCompletion = independentJudge
      ? await completeManagedProductLoopWithIndependentJudge({
          worktree,
          task: caseEntry.task,
          sourceModifiedPaths,
          oracle: caseEntry.oracle,
          requiredChecks,
          oracleChecks,
          judge: independentJudge,
          initialArtifactKeys,
          inspectedPaths: exploration.inspectedPaths,
          reportedContextPaths: normalizedFinal.ok
            ? normalizedFinal.response.contextPaths
            : [],
        })
      : undefined;
    const productLoopEvents = [
      ...parsed.events,
      ...(independentCompletion?.events ?? []),
    ];
    const inspectedProductLoopArtifacts = options.delivery === "managed" && condition === "rekon"
      ? await inspectManagedProductLoopArtifacts(
          worktree,
          initialArtifactKeys,
          independentJudge ? [independentJudge.trustedKey] : [],
        )
      : undefined;
    let verifiedCommands = [];
    let productLoopArtifacts;
    if (inspectedProductLoopArtifacts) {
      const {
        verifiedCommands: inspectedVerifiedCommands = [],
        ...publicArtifactEvidence
      } = inspectedProductLoopArtifacts;
      verifiedCommands = inspectedVerifiedCommands;
      productLoopArtifacts = publicArtifactEvidence;
    }
    const effectiveFinal = normalizedFinal.ok
      ? {
          ...normalizedFinal.response,
          ...(independentCompletion?.status === "passed" ? { status: "complete" } : {}),
        }
      : undefined;
    const productLoop = productLoopArtifacts
      ? summarizeRekonProductLoop(productLoopEvents, productLoopArtifacts, {
        required: options.productLoop,
        terminalStatus: effectiveFinal?.status ?? "blocked",
      })
      : undefined;
    const agentCommands = mergeAgentCommands(parsed.events
      .filter((event) => event.type === "item.completed" && event.item?.type === "command_execution")
      .map((event) => event.item.command)
      .filter((command) => typeof command === "string"), verifiedCommands);
    const contextUse = condition === "rekon"
      ? summarizeContextUse(contextSelection, exploration, normalizedFinal.response, sourceModifiedPaths)
      : undefined;
    const interfaceAdoption = options.delivery === "managed" && condition === "rekon"
      ? summarizeRekonAdoption(parsed.events, {
        ...(caseEntry.managedExpectations ?? {}),
        readFirstPaths: contextSelection.readFirstPaths,
      })
      : undefined;
    const adoption = interfaceAdoption
      ? assessRekonContextUse(interfaceAdoption, contextSelection, contextUse)
      : undefined;
    const run = {
      runner: "codex-subscription",
      model: options.model ?? "default",
      caseId: caseEntry.id,
      repeat,
      condition,
      status: result.exitCode === 0 && normalizedFinal.ok ? "ok" : "error",
      final: effectiveFinal,
      ...(independentCompletion ? {
        actorTerminalStatus: normalizedFinal.ok ? normalizedFinal.response.status : "blocked",
        independentJudge: independentCompletion.summary,
      } : {}),
      modifiedPaths,
      sourceModifiedPaths,
      generatedModifiedPaths,
      agentCommands,
      requiredChecks,
      oracleChecks,
      exploration,
      tokenUsage,
      visibleTokenEstimate,
      ...(contextUse ? { contextUse } : {}),
      ...(adoption ? { adoption } : {}),
      ...(productLoop ? { productLoop } : {}),
      elapsedMs,
      ...(result.timedOut
        ? { error: `codex-timeout-${options.timeoutMs}` }
        : result.exitCode !== 0
          ? { error: `codex-exit-${result.exitCode}` }
          : error
            ? { error }
            : {}),
    };
    run.score = scoreLocalAgentOutcome(run, caseEntry.oracle);
    return run;
  } catch (caught) {
    const run = {
      runner: "codex-subscription",
      model: options.model ?? "default",
      caseId: caseEntry.id,
      repeat,
      condition,
      status: "error",
      modifiedPaths: [],
      agentCommands: [],
      requiredChecks: [],
      oracleChecks: [],
      exploration: emptyExploration(),
      elapsedMs: 0,
      error: caught instanceof Error ? caught.message : String(caught),
    };
    run.score = scoreLocalAgentOutcome(run, caseEntry.oracle);
    return run;
  } finally {
    if (!options.keepWorkdirs) await rm(tempRoot, { recursive: true, force: true });
    else process.stderr.write(`[model-interface-local-agent] retained ${tempRoot}\n`);
  }
}

function createIndependentPlacementJudge() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeySpki = publicKey.export({ format: "der", type: "spki" }).toString("base64");
  const keyId = `benchmark-${createHash("sha256").update(publicKeySpki).digest("hex").slice(0, 16)}`;
  return {
    signingKey: {
      algorithm: "ed25519",
      keyId,
      privateKeyPkcs8: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
    },
    trustedKey: {
      algorithm: "ed25519",
      keyId,
      verifierId: INDEPENDENT_PLACEMENT_JUDGE_ID,
      publicKeySpki,
    },
  };
}

async function installPlacementTrustPolicy(worktree, trustedKey) {
  const configPath = join(worktree, "rekon.config.json");
  const existing = await readJson(configPath);
  const config = existing && typeof existing === "object" && !Array.isArray(existing)
    ? existing
    : {};
  await writeFile(configPath, `${JSON.stringify({
    ...config,
    placementVerification: {
      trustedKeys: [trustedKey],
    },
  }, null, 2)}\n`);
}

async function completeManagedProductLoopWithIndependentJudge({
  worktree,
  task,
  sourceModifiedPaths,
  oracle,
  requiredChecks,
  oracleChecks,
  judge,
  initialArtifactKeys,
  inspectedPaths,
  reportedContextPaths,
}) {
  const events = [];
  const assessment = assessIndependentPlacementOutcome({
    sourceModifiedPaths,
    oracle,
    requiredChecks,
    oracleChecks,
  });
  const summary = {
    attempted: true,
    verdict: assessment.verdict,
    signedPlacementReports: 0,
    actorPlacementReportsRejected: 0,
    proofGateSatisfied: false,
    refreshCompleted: false,
    status: "failed",
    reasons: assessment.reasons,
  };

  try {
    if (sourceModifiedPaths.length === 0) {
      throw new Error("independent judge found no source change to validate");
    }
    const store = createLocalArtifactStore(worktree);
    await store.init();
    const actorReports = (await store.list("PlacementVerificationReport"))
      .filter((ref) => !initialArtifactKeys.has(`${ref.type}:${ref.id}`));
    summary.actorPlacementReportsRejected = actorReports.length;
    const contextUsage = await loadContextUsageForChange(store, {
      initialArtifactKeys,
      sourceModifiedPaths,
      inspectedPaths,
      reportedContextPaths,
    });
    if (!contextUsage) {
      throw new Error("independent judge found no post-baseline task context for the changed source");
    }
    if (!Object.values(contextUsage.claims).includes("read")) {
      throw new Error("independent judge found no observed or reported read of delivered context");
    }
    const validationTask = contextUsage.taskText;
    const contextArgs = [
      "--context-usage",
      `${contextUsage.ref.type}:${contextUsage.ref.id}`,
      "--context-claims-json",
      JSON.stringify(contextUsage.claims),
    ];
    const changedPathArgs = sourceModifiedPaths.flatMap((path) => ["--changed-path", path]);
    const preparedStep = await requireIndependentCliStep(
      events,
      [
        "context", "validate-change",
        "--task", validationTask,
        ...changedPathArgs,
        "--base-ref", "HEAD",
        ...contextArgs,
        "--prepare-verification",
        "--root", worktree,
        "--json",
      ],
      worktree,
    );
    const planRef = preparedStep.payload?.verificationPlan;
    if (!planRef?.type || !planRef?.id) {
      throw new Error("independent judge validation produced no VerificationPlan");
    }
    const runStep = await requireIndependentCliStep(
      events,
      [
        "verify", "run",
        "--plan", `${planRef.type}:${planRef.id}`,
        "--execute",
        "--root", worktree,
        "--json",
      ],
      worktree,
    );
    const runRef = runStep.payload?.artifact;
    if (!runRef?.type || !runRef?.id) {
      throw new Error("independent judge verification produced no VerificationRun");
    }
    const resultStep = await requireIndependentCliStep(
      events,
      [
        "verify", "result", "from-run",
        "--run", `${runRef.type}:${runRef.id}`,
        "--root", worktree,
        "--json",
      ],
      worktree,
    );
    const verificationRef = resultStep.payload?.artifact;
    if (!verificationRef?.type || !verificationRef?.id) {
      throw new Error("independent judge verification produced no VerificationResult");
    }

    const sourceState = await buildBenchmarkSourceState(worktree, sourceModifiedPaths);
    const placementObligations = (preparedStep.payload?.proofGate?.obligations ?? [])
      .filter((obligation) =>
        typeof obligation?.id === "string"
        && /\.stage\.[^.]+\.responsibility\.\d+$/u.test(obligation.id)
        && Array.isArray(obligation.requiredEvidence)
        && obligation.requiredEvidence.includes("model-judgment"));
    const placementRefs = [];
    const placementIds = new Set();
    for (const obligation of placementObligations) {
      const report = await buildSignedPlacementReport({
        worktree,
        store,
        task: validationTask,
        sourceModifiedPaths,
        sourceState,
        verificationRef,
        obligation,
        verdict: assessment.verdict,
        judge,
      });
      if (!report) continue;
      const ref = await store.write(report, { category: "actions" });
      placementRefs.push(ref);
      placementIds.add(obligation.id);
    }
    summary.signedPlacementReports = placementRefs.length;
    if (placementObligations.length > 0 && placementRefs.length !== placementObligations.length) {
      throw new Error("independent judge could not bind every placement obligation");
    }

    const judgments = (preparedStep.payload?.proofGate?.obligations ?? [])
      .filter((obligation) =>
        obligation?.required === true
        && Array.isArray(obligation.requiredEvidence)
        && obligation.requiredEvidence.includes("model-judgment")
        && !placementIds.has(obligation.id))
      .map((obligation) => ({
        obligationId: obligation.id,
        verdict: assessment.verdict,
        explanation: assessment.verdict === "supported"
          ? "The independent benchmark oracle found exact source scope and passing repository and hidden checks."
          : `The independent benchmark oracle refuted this change: ${assessment.reasons.join("; ")}`,
        verifier: {
          id: INDEPENDENT_PLACEMENT_JUDGE_ID,
          version: INDEPENDENT_PLACEMENT_JUDGE_VERSION,
        },
      }));
    const finalStep = await requireIndependentCliStep(
      events,
      [
        "context", "validate-change",
        "--task", validationTask,
        ...changedPathArgs,
        "--base-ref", "HEAD",
        ...contextArgs,
        "--verification-result", `${verificationRef.type}:${verificationRef.id}`,
        ...placementRefs.flatMap((ref) => [
          "--placement-verification",
          `${ref.type}:${ref.id}`,
        ]),
        ...(judgments.length > 0
          ? ["--judgment-json", JSON.stringify(judgments)]
          : []),
        ...(assessment.verdict === "supported" ? ["--record-proof"] : []),
        "--root", worktree,
        "--json",
      ],
      worktree,
    );

    if (assessment.verdict !== "supported") {
      summary.status = "blocked";
      return { status: "blocked", events, summary };
    }
    if (
      finalStep.payload?.status !== "passed"
      || finalStep.payload?.proofGate?.evaluation?.status !== "satisfied"
      || !finalStep.payload?.proofArtifact?.type
      || !finalStep.payload?.proofArtifact?.id
    ) {
      throw new Error("independent judge final validation did not produce a satisfied proof gate");
    }
    summary.proofGateSatisfied = true;
    const proofRef = finalStep.payload.proofArtifact;
    const refreshStep = await requireIndependentCliStep(
      events,
      [
        "refresh",
        "--proof-gate", `${proofRef.type}:${proofRef.id}`,
        "--root", worktree,
        "--json",
      ],
      worktree,
    );
    if (refreshStep.payload?.status !== "passed") {
      throw new Error("independent judge proof-gated refresh did not pass");
    }
    summary.refreshCompleted = true;
    summary.status = "passed";
    return { status: "passed", events, summary };
  } catch (error) {
    summary.reasons = [...new Set([
      ...summary.reasons,
      error instanceof Error ? error.message : String(error),
    ])];
    return { status: "failed", events, summary };
  }
}

async function loadContextUsageForChange(store, options) {
  const records = [];
  for (const ref of await store.list("ContextUsageEvent", { order: "newest" })) {
    const usage = await store.read(ref);
    records.push({ ref, usage });
  }
  return selectContextUsageForChange(records, options);
}

async function buildSignedPlacementReport({
  worktree,
  store,
  task,
  sourceModifiedPaths,
  sourceState,
  verificationRef,
  obligation,
  verdict,
  judge,
}) {
  const match = obligation.id.match(/^constraint:(.+)\.stage\.([^.]+)\.responsibility\.(\d+)$/u);
  if (!match) return undefined;
  const [, flowId, stageId] = match;
  const flowRef = (obligation.sourceRefs ?? []).find((ref) => ref?.type === "FlowContract");
  if (!flowRef) return undefined;
  const flow = await store.read(flowRef);
  if (flow?.contractId !== flowId || !Array.isArray(flow?.stages)) return undefined;
  const stage = flow.stages.find((candidate) => candidate?.id === stageId);
  if (!stage || !Array.isArray(stage.paths)) return undefined;
  const changedSourcePaths = sourceModifiedPaths.filter((path) =>
    stage.paths.some((pattern) => benchmarkPathMatches(path, pattern)));
  if (changedSourcePaths.length === 0) return undefined;
  const sourceEvidence = [];
  for (const path of changedSourcePaths) {
    const evidence = await buildBenchmarkSourceEvidence(worktree, sourceState, path);
    if (!evidence) return undefined;
    sourceEvidence.push(evidence);
  }
  const contractRef = {
    type: flow.header.artifactType,
    id: flow.header.artifactId,
    schemaVersion: flow.header.schemaVersion,
  };
  const artifactId = `placement-verification-${createHash("sha256").update(JSON.stringify({
    task,
    obligationId: obligation.id,
    sourceDigest: sourceState.digest,
    keyId: judge.trustedKey.keyId,
  })).digest("hex").slice(0, 20)}`;
  const report = createPlacementVerificationReport({
    header: {
      artifactType: "PlacementVerificationReport",
      artifactId,
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      subject: { repoId: worktree, paths: sourceModifiedPaths },
      producer: {
        id: INDEPENDENT_PLACEMENT_JUDGE_ID,
        version: INDEPENDENT_PLACEMENT_JUDGE_VERSION,
      },
      inputRefs: [contractRef, verificationRef],
      freshness: { status: "fresh" },
      provenance: {
        confidence: 1,
        notes: ["Independent benchmark scope, repository-check, and hidden-oracle judgment."],
      },
    },
    task: { text: task, paths: sourceModifiedPaths },
    obligation: {
      id: obligation.id,
      assertion: obligation.assertion,
      contractRef,
      flowId,
      stageId,
      stagePaths: stage.paths,
      changedSourcePaths,
    },
    sourceState,
    sourceEvidence,
    verdict,
    explanation: verdict === "supported"
      ? "The independently verified change is located in the stage that owns this responsibility."
      : "The independent benchmark oracle found that the change does not satisfy the required placement.",
    verifier: {
      kind: "service",
      id: INDEPENDENT_PLACEMENT_JUDGE_ID,
      version: INDEPENDENT_PLACEMENT_JUDGE_VERSION,
      independentOf: ["rekon-managed-agent"],
    },
  });
  return signPlacementVerificationReport(report, judge.signingKey);
}

async function buildBenchmarkSourceState(worktree, paths) {
  const baseRef = commandOutput("git", ["rev-parse", "HEAD"], worktree);
  const files = [];
  for (const path of paths) {
    const before = await gitFile(worktree, "HEAD", path);
    const after = await readFile(join(worktree, path)).catch(() => undefined);
    const status = before === undefined
      ? "added"
      : after === undefined
        ? "deleted"
        : "modified";
    files.push({
      path,
      status,
      ...(before ? { beforeSha256: createHash("sha256").update(before).digest("hex") } : {}),
      ...(after ? { afterSha256: createHash("sha256").update(after).digest("hex") } : {}),
    });
  }
  return createSourceStateBinding({ baseRef, files });
}

async function gitFile(worktree, ref, path) {
  try {
    const { stdout } = await execFileAsync("git", ["show", `${ref}:${path}`], {
      cwd: worktree,
      encoding: null,
      maxBuffer: 10_000_000,
    });
    return stdout;
  } catch {
    return undefined;
  }
}

async function buildBenchmarkSourceEvidence(worktree, sourceState, path) {
  const file = sourceState.files.find((entry) => entry.path === path);
  if (!file?.afterSha256) return undefined;
  const content = await readFile(join(worktree, path), "utf8");
  const lines = content.split(/\r?\n/u);
  const diff = rawCommandOutput(
    "git",
    ["diff", "--unified=0", "HEAD", "--", path],
    worktree,
  );
  const changedLines = [];
  for (const match of diff.matchAll(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gu)) {
    const start = Number.parseInt(match[1], 10);
    const count = match[2] === undefined ? 1 : Number.parseInt(match[2], 10);
    if (count > 0) changedLines.push({ start, end: start + count - 1 });
  }
  const firstChangedLine = changedLines.length > 0
    ? Math.min(...changedLines.map((entry) => entry.start))
    : 1;
  const lastChangedLine = changedLines.length > 0
    ? Math.max(...changedLines.map((entry) => entry.end))
    : 1;
  let lineStart = Math.max(1, firstChangedLine - 2);
  let lineEnd = Math.min(
    lines.length,
    lastChangedLine + 2,
  );
  let excerpt = lines.slice(lineStart - 1, lineEnd).join("\n");
  while (excerpt.length > 6_000 && lineEnd > lineStart) {
    lineEnd -= 1;
    excerpt = lines.slice(lineStart - 1, lineEnd).join("\n");
  }
  if (!excerpt || excerpt.length > 6_000) return undefined;
  return {
    path,
    sha256: file.afterSha256,
    lineStart,
    lineEnd,
    excerpt,
  };
}

function benchmarkPathMatches(path, pattern) {
  const normalized = String(pattern).replace(/\\/gu, "/").replace(/^\.\//u, "");
  if (normalized.endsWith("/**")) {
    const prefix = normalized.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return path === normalized;
}

async function requireIndependentCliStep(events, args, cwd) {
  const step = await runIndependentCliStep(args, cwd);
  events.push(step.event);
  if (!step.ok) {
    throw new Error(step.error ?? `independent CLI step failed: ${args.slice(0, 2).join(" ")}`);
  }
  return step;
}

async function runIndependentCliStep(args, cwd) {
  const command = `rekon ${args.map(shellQuote).join(" ")}`;
  try {
    const { stdout } = await execFileAsync(process.execPath, [cliEntry, ...args], {
      cwd: root,
      timeout: options.timeoutMs,
      maxBuffer: 20_000_000,
    });
    const payload = JSON.parse(stdout);
    return {
      ok: true,
      payload,
      event: benchmarkCommandEvent(command, stdout, 0),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    return {
      ok: false,
      payload: await parseJsonText(stdout),
      error: [stderr.trim(), stdout.trim(), error instanceof Error ? error.message : String(error)]
        .filter(Boolean)
        .join("\n")
        .slice(0, 2_000),
      event: benchmarkCommandEvent(command, stdout || stderr, Number(error?.code) || 1),
    };
  }
}

function benchmarkCommandEvent(command, output, exitCode) {
  return {
    type: "item.completed",
    item: {
      type: "command_execution",
      command,
      aggregated_output: output,
      exit_code: exitCode,
    },
  };
}

async function parseJsonText(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function prepareCase(entry) {
  const lexicalContextPaths = entry.paths.length === 0
    ? selectLexicalGraphContextPaths(entry.task, fixture.graph)
    : [];
  const groundingPaths = [...new Set([...entry.paths, ...lexicalContextPaths])];
  if (groundingPaths.length === 0) {
    throw new Error(`Model-interface case ${entry.id} has no explicit or lexical graph grounding path.`);
  }
  const taskPact = repositoryLaw
    ? buildTaskPact({
        repoId: "model-interface-local-agent-eval",
        taskText: entry.task,
        paths: groundingPaths,
        generatedAt,
        registry: repositoryLaw.registry,
        registryRef: repositoryLaw.registryRef,
        systemContracts: repositoryLaw.systemContracts,
        flowContracts: repositoryLaw.flowContracts,
      })
    : undefined;
  const contractGuidance = selectTaskContractGuidance({
    paths: groundingPaths,
    graph: fixture.graph,
    capabilityContract: fixture.capabilityContract,
    capabilityContractRef: fixture.capabilityContractRef,
    taskPact,
  });
  const warnings = lexicalContextPaths.length > 0
    ? ["deterministic graph + lexical fallback selected task context"]
    : [];
  const { packet } = compileTaskContext({
    taskText: entry.task,
    paths: entry.paths,
    ...(lexicalContextPaths.length > 0 ? { lexicalContextPaths } : {}),
    profile: options.profile ?? entry.profile,
    graph: fixture.graph,
    retrievalResults: options.delivery === "direct" ? entry.retrievalResults : [],
    inputRefs: [
      ...(fixture.capabilityContractRef && contractGuidance.matchedContractIds.length > 0
        ? [fixture.capabilityContractRef]
        : []),
      ...(taskPact ? taskPact.header.inputRefs : []),
    ],
    declaredConstraints: contractGuidance.constraints,
    declaredContextPaths: contractGuidance.requiredContextPaths,
    declaredVerificationHints: contractGuidance.verificationHints,
    generatedAt,
    repoId: "model-interface-local-agent-eval",
    warnings,
  });
  const projection = projectModelContext(packet);
  const contextPacket = projectModelContextDelivery(projection, { policy: options.contextPolicy });
  const deliveryProjection = {
    ...projection,
    readFirst: contextPacket.readFirst,
    ...(options.contextPolicy === "navigation-only" ? {
      coreContext: projection.coreContext.filter((item) =>
        item.kind !== "file" || contextPacket.readFirst.includes(item.ref)),
    } : {}),
    supportingContext: contextPacket.supportingContext ?? [],
    routeSummaries: contextPacket.routeSummaries ?? [],
    ...(["summary-aware", "navigation-only"].includes(options.contextPolicy)
      ? { boundaryPaths: contextPacket.boundaryPaths ?? [] }
      : {}),
  };
  return {
    entry,
    contextPacket,
    contextSelection: summarizeContextSelection(deliveryProjection, entry.oracle, fixture.repository.files),
  };
}

function buildPrompt(task, condition, contextPacket) {
  const context = options.delivery === "direct" && condition === "rekon"
    ? `\n\nRekon task context follows. Treat it as routing and contract guidance, then verify source before editing:\n${JSON.stringify(contextPacket)}`
    : "";
  return [
    "Implement the requested repository change in this disposable evaluation checkout.",
    "Read repository instructions, inspect only what you need, make the change, and run the repository checks required by the task.",
    "Do not use network access. Do not modify files unrelated to the task.",
    `Task: ${task}${context}`,
    "Your final response must match the supplied JSON schema. Report repository-relative context paths, modified files, checks actually run, a concise summary, risks, and confidence.",
  ].join("\n\n");
}

async function runCodex({ worktree, schemaPath, finalPath, prompt, enableMcp, cliShimDir }) {
  const args = [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--skip-git-repo-check",
    "--sandbox", "workspace-write",
    "--json",
    "--color", "never",
    "--cd", worktree,
    "--output-schema", schemaPath,
    "--output-last-message", finalPath,
    ...(enableMcp ? ["-c", mcpConfig(worktree)] : []),
    ...(options.model ? ["--model", options.model] : []),
    ...(options.reasoningEffort
      ? ["-c", `model_reasoning_effort=${JSON.stringify(options.reasoningEffort)}`]
      : []),
    prompt,
  ];
  return new Promise((resolvePromise, reject) => {
    const child = spawn("codex", args, {
      cwd: root,
      env: {
        ...process.env,
        PATH: [
          cliShimDir,
          join(root, "node_modules", ".bin"),
          process.env.PATH ?? "",
        ].filter(Boolean).join(delimiter),
        ...(enableMcp
          ? { REKON_EXPERIMENTAL_CONTEXT_DELIVERY_POLICY: options.contextPolicy }
          : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
    }, options.timeoutMs);
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      resolvePromise({
        exitCode: typeof code === "number" ? code : 1,
        signal,
        timedOut,
        stdout,
        stderrSummary: stderr.split(/\r?\n/u).filter(Boolean).slice(-5),
      });
    });
  });
}

async function prepareBenchmarkCliShim(binDir) {
  await mkdir(binDir, { recursive: true });
  const shim = join(binDir, "rekon");
  await writeFile(
    shim,
    `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(cliEntry)} "$@"\n`,
    "utf8",
  );
  await chmod(shim, 0o755);
  await execFileAsync(shim, ["--help"], {
    cwd: root,
    timeout: Math.min(options.timeoutMs, 30_000),
    maxBuffer: 1_000_000,
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/gu, "'\\''")}'`;
}

async function prepareManagedRekonWorktree(worktree) {
  await execFileAsync(process.execPath, [cliEntry, "refresh", "--root", worktree, "--json"], {
    cwd: root,
    timeout: options.timeoutMs,
    maxBuffer: 10_000_000,
  });

  const store = createLocalArtifactStore(worktree);
  const evidenceRef = (
    await store.list("EvidenceGraph", { order: "newest", limit: 1 })
  )[0];
  if (!evidenceRef) throw new Error("managed adoption fixture refresh produced no EvidenceGraph");

  const graphRef = await store.write({
    header: evalArtifactHeader(
      "CapabilityEvidenceGraph",
      "model-interface-adoption-graph",
      worktree,
      [evidenceRef],
    ),
    ...fixture.graph,
  }, { category: "graphs" });

  const mapRef = await store.write({
    header: evalArtifactHeader(
      "CapabilityMap",
      "model-interface-adoption-map",
      worktree,
      [graphRef],
    ),
    entries: fixture.graph.capabilities.map((capability) => {
      const subjects = capability.implementedBy
        .filter((entry) => entry.kind === "file")
        .map((entry) => entry.id);
      return {
        capability: `${capability.verb} ${capability.noun}`,
        subjects,
        systems: [...new Set(subjects.map(systemForPath))],
        confidence: 1,
        evidence: [graphRef],
      };
    }),
  }, { category: "projections" });

  if (fixture.capabilityContract) {
    await store.write({
      ...fixture.capabilityContract,
      header: {
        ...evalArtifactHeader(
          "CapabilityContract",
          "model-interface-adoption-contracts",
          worktree,
          [mapRef],
        ),
      },
      source: { capabilityMapRef: mapRef },
      contracts: fixture.capabilityContract.contracts.map((contract) => ({
        ...contract,
        capabilityRef: {
          ...contract.capabilityRef,
          capabilityMapRef: mapRef,
        },
      })),
    }, { category: "projections" });
  }

  if ((fixture.repositoryContractSources ?? []).length > 0) {
    await execFileAsync(process.execPath, [cliEntry, "contracts", "compile", "--root", worktree, "--json"], {
      cwd: root,
      timeout: options.timeoutMs,
      maxBuffer: 10_000_000,
    });
  }
}

function evalArtifactHeader(artifactType, artifactId, repoRoot, inputRefs) {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: repoRoot },
    producer: { id: "@rekon/model-interface-adoption-fixture", version: "1.0.0" },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 1, notes: ["credential-free managed-interface adoption fixture"] },
  };
}

function systemForPath(path) {
  const segments = path.split("/");
  if (segments[0] === "apps" || segments[0] === "packages") return segments.slice(0, 2).join("/");
  if (segments[0] === "src") return segments[1] ?? "src";
  return segments[0] ?? "unknown";
}

function mcpConfig(worktree) {
  const args = [cliEntry, "mcp", "serve", "--root", worktree];
  return `mcp_servers.rekon={command=${JSON.stringify(process.execPath)},args=[${args.map(JSON.stringify).join(",")} ]}`;
}

function summarizeAdoption(rekonRuns) {
  const entries = rekonRuns.map((run) => run.adoption).filter(Boolean);
  const productLoops = rekonRuns.map((run) => run.productLoop).filter(Boolean);
  return {
    runs: entries.length,
    adopted: entries.filter((entry) => entry.status === "adopted").length,
    partial: entries.filter((entry) => entry.status === "partial").length,
    notAdopted: entries.filter((entry) => entry.status === "not-adopted").length,
    contextBeforeExploration: entries.filter((entry) => entry.contextBeforeExploration).length,
    contextBeforeEdit: entries.filter((entry) => entry.contextBeforeEdit).length,
    fullReadFirstUse: entries.filter((entry) => entry.readFirstRecall === 1).length,
    fullRefinementUse: entries.filter((entry) => entry.refinementRecall === 1).length,
    refinementCalls: entries.reduce((sum, entry) => sum + (entry.refinementCalls ?? 0), 0),
    excessiveRefinement: entries.filter((entry) => entry.excessiveRefinement).length,
    refinementTargetMatched: entries.filter((entry) => entry.refinementTargetMatched).length,
    unexpectedRefinement: entries.filter((entry) => entry.unexpectedRefinement).length,
    refinementBeforeContext: entries.filter((entry) => entry.refinementBeforeContext).length,
    refinementBeforeReadFirst: entries.filter((entry) => entry.refinementBeforeReadFirst).length,
    averageReadFirstRecall: entries.length === 0
      ? 0
      : Number((entries.reduce((sum, entry) => sum + (entry.readFirstRecall ?? 0), 0) / entries.length).toFixed(4)),
    interfaceCounts: Object.fromEntries(["mcp", "cli", "none"].map((name) => [
      name,
      entries.filter((entry) => entry.interface === name).length,
    ])),
    ...(productLoops.length > 0 ? {
      productLoop: {
        runs: productLoops.length,
        required: productLoops.filter((entry) => entry.required).length,
        passed: productLoops.filter((entry) => entry.passed).length,
      },
    } : {}),
  };
}

function compareConditionTokens(conditions) {
  const baseline = conditions.baseline;
  const rekon = conditions.rekon;
  return {
    subscriptionReportedTotalReduction: reduction(
      baseline.tokenUsage.totalTokens,
      rekon.tokenUsage.totalTokens,
    ),
    visibleEstimatedTotalReduction: reduction(
      baseline.visibleTokenEstimate.totalTokens,
      rekon.visibleTokenEstimate.totalTokens,
    ),
    completeSubscriptionMeasurement: baseline.tokenUsage.missingRuns === 0
      && rekon.tokenUsage.missingRuns === 0,
  };
}

function reduction(baseline, candidate) {
  return baseline > 0 ? Number(((baseline - candidate) / baseline).toFixed(4)) : 0;
}

async function initializeGit(worktree) {
  await execFileAsync("git", ["init", "--quiet"], { cwd: worktree });
  await execFileAsync("git", ["add", "."], { cwd: worktree });
  await execFileAsync("git", ["-c", "user.name=Rekon Eval", "-c", "user.email=eval@localhost", "commit", "--quiet", "-m", "fixture"], { cwd: worktree });
}

async function captureArtifactKeys(worktree) {
  const store = createLocalArtifactStore(worktree);
  await store.init();
  return new Set((await store.list()).map((entry) => `${entry.type}:${entry.id}`));
}

async function inspectManagedProductLoopArtifacts(
  worktree,
  initialArtifactKeys,
  trustedPlacementKeys = [],
) {
  const store = createLocalArtifactStore(worktree);
  await store.init();
  const entries = (await store.list())
    .filter((entry) => !initialArtifactKeys.has(`${entry.type}:${entry.id}`))
    .sort((left, right) => left.writtenAt.localeCompare(right.writtenAt));
  const records = [];
  for (const entry of entries) {
    try {
      records.push({ entry, body: await store.read(entry) });
    } catch {
      records.push({ entry, body: undefined });
    }
  }
  const proof = records.findLast((record) =>
    record.entry.type === "ProofGateReport"
    && record.body?.evaluation?.status === "satisfied");
  const placementObligationIds = new Set((proof?.body?.obligations ?? [])
    .filter((obligation) =>
      typeof obligation?.id === "string"
      && /\.stage\.[^.]+\.responsibility\.\d+$/u.test(obligation.id))
    .map((obligation) => obligation.id));
  const trustedPlacementRefs = new Set();
  const untrustedPlacementRefs = new Set();
  for (const record of records.filter((candidate) =>
    candidate.entry.type === "PlacementVerificationReport" && candidate.body)) {
    const trust = verifyPlacementVerificationAttestation(record.body, trustedPlacementKeys);
    const key = `${record.entry.type}:${record.entry.id}`;
    (trust.trusted ? trustedPlacementRefs : untrustedPlacementRefs).add(key);
  }
  const placementResults = (proof?.body?.results ?? []).filter((result) =>
    placementObligationIds.has(result?.obligationId));
  const placementVerificationTrusted = placementObligationIds.size === 0
    || [...placementObligationIds].every((obligationId) =>
      placementResults.some((result) =>
        result.obligationId === obligationId
        && [...(result.evidenceRefs ?? []), ...(result.counterEvidenceRefs ?? [])].some((ref) =>
          trustedPlacementRefs.has(`${ref?.type}:${ref?.id}`))));
  const verificationResultRef = proof?.body?.header?.inputRefs?.find((ref) =>
    ref?.type === "VerificationResult");
  const verificationResult = findRecordByRef(records, verificationResultRef);
  const verificationRunRef = verificationResult?.body?.header?.inputRefs?.find((ref) =>
    ref?.type === "VerificationRun");
  const verificationRun = findRecordByRef(records, verificationRunRef);
  const verificationPlanRef = verificationRun?.body?.header?.inputRefs?.find((ref) =>
    ref?.type === "VerificationPlan");
  const verificationPlan = findRecordByRef(records, verificationPlanRef);
  const validationOutcome = records.findLast((record) =>
    record.entry.type === "OutcomeEvent"
    && record.body?.phase === "validation-attempt"
    && record.body?.status === "verified"
    && sameArtifactRef(record.body?.proofGateRef, proof?.entry));
  const refreshOutcome = records.findLast((record) =>
    record.entry.type === "OutcomeEvent"
    && record.body?.phase === "proof-gated-refresh"
    && record.body?.status === "accepted"
    && sameArtifactRef(record.body?.proofGateRef, proof?.entry));
  const claimReceipt = records.findLast((record) =>
    record.entry.type === "ContextUsageEvent"
    && Array.isArray(record.body?.claims)
    && record.body.claims.length > 0
    && contextUsageMatchesProof(record.body, proof?.body));
  const deliveryRef = claimReceipt?.body?.header?.inputRefs?.find((ref) =>
    ref?.type === "ContextUsageEvent");
  const delivery = findRecordByRef(records, deliveryRef)
    ?? records.findLast((record) =>
      record.entry.type === "ContextUsageEvent"
      && record.body?.delivery?.channel === "mcp"
      && (record.body?.claims?.length ?? 0) === 0);
  const refreshedEvidence = records.findLast((record) =>
    record.entry.type === "EvidenceGraph"
    && (record.body?.header?.inputRefs ?? []).some((ref) =>
      sameArtifactRef(ref, proof?.entry)));
  const agents = await readFile(join(worktree, "AGENTS.md"), "utf8").catch(() => "");
  const claimedItems = new Set((claimReceipt?.body?.claims ?? []).map((claim) => claim.itemId));
  const deliveredItems = new Set(delivery?.body?.delivery?.itemIds ?? []);
  const verificationLineageComplete = Boolean(
    verificationRunRef
    && verificationPlanRef
    && verificationResultRef
    && sameArtifactRef(verificationPlanRef, verificationPlan?.entry)
    && sameArtifactRef(verificationRunRef, verificationRun?.entry)
    && sameArtifactRef(verificationResultRef, verificationResult?.entry),
  );
  const proofLineageComplete = verificationLineageComplete && Boolean(validationOutcome);
  const refreshLineageComplete = proofLineageComplete
    && Boolean(refreshOutcome)
    && Boolean(refreshedEvidence);
  const refreshCompleted = refreshLineageComplete
    && Boolean(refreshedEvidence)
    && latestMajorArtifactsFresh(records);

  return {
    newArtifactCounts: countArtifactTypes(entries),
    deliveryRecorded: Boolean(delivery),
    contextClaimReceiptRecorded: Boolean(claimReceipt),
    contextClaimCoverage: deliveredItems.size === 0
      ? 0
      : Number((claimedItems.size / deliveredItems.size).toFixed(4)),
    verificationPlanRecorded: Boolean(verificationPlan),
    verifiedCommands: (verificationResult?.body?.commandResults ?? [])
      .filter((result) => result?.status === "passed" && result?.exitCode === 0)
      .map((result) => result.command)
      .filter((command) => typeof command === "string" && command.trim().length > 0),
    verificationRunPassed: verificationRun?.body?.status === "passed",
    verificationSourceStable: verificationRun?.body?.sourceState?.status === "stable"
      && verificationRun.body.sourceState.beforeDigest === verificationRun.body.sourceState.afterDigest,
    verificationResultPassed: verificationResult?.body?.status === "passed",
    verificationLineageComplete,
    placementVerificationRequired: placementObligationIds.size > 0,
    placementVerificationTrusted,
    trustedPlacementReports: trustedPlacementRefs.size,
    untrustedPlacementReports: untrustedPlacementRefs.size,
    proofGateSatisfied: proof?.body?.evaluation?.status === "satisfied",
    proofGateLinkedVerification: Boolean(
      proof
      && verificationResult
      && (proof.body?.header?.inputRefs ?? []).some((ref) =>
        sameArtifactRef(ref, verificationResult.entry)),
    ),
    validationOutcomeVerified: Boolean(validationOutcome),
    proofLineageComplete,
    refreshOutcomeAccepted: Boolean(refreshOutcome),
    refreshOutcomeLinkedProof: Boolean(
      refreshOutcome
      && proof
      && sameArtifactRef(refreshOutcome.body?.proofGateRef, proof.entry),
    ),
    refreshedEvidenceLinkedProof: Boolean(refreshedEvidence),
    refreshLineageComplete,
    refreshCompleted,
    managedInstructionsCurrent: agents.includes(
      `<!-- rekon:agent-instructions:start version="${managedInstructionsVersion}" -->`,
    ),
    refs: {
      ...(delivery ? { contextUsage: artifactRef(delivery.entry) } : {}),
      ...(claimReceipt ? { contextClaimReceipt: artifactRef(claimReceipt.entry) } : {}),
      ...(verificationPlan ? { verificationPlan: artifactRef(verificationPlan.entry) } : {}),
      ...(verificationRun ? { verificationRun: artifactRef(verificationRun.entry) } : {}),
      ...(verificationResult ? { verificationResult: artifactRef(verificationResult.entry) } : {}),
      ...(proof ? { proofGate: artifactRef(proof.entry) } : {}),
      ...(validationOutcome ? { validationOutcome: artifactRef(validationOutcome.entry) } : {}),
      ...(refreshOutcome ? { refreshOutcome: artifactRef(refreshOutcome.entry) } : {}),
    },
  };
}

function contextUsageMatchesProof(usage, proof) {
  if (!proof) return true;
  const usageTask = usage?.task;
  const proofTask = proof?.task;
  if (typeof usageTask?.text !== "string" || typeof proofTask?.text !== "string") return false;
  return usageTask.text.trim() === proofTask.text.trim();
}

function latestMajorArtifactsFresh(records) {
  const majorTypes = [
    "EvidenceGraph",
    "CapabilityEvidenceGraph",
    "ObservedRepo",
    "OwnershipMap",
    "CapabilityMap",
    "IntelligenceSnapshot",
    "FindingReport",
    "Publication",
  ];
  const latest = new Map();
  for (const record of records) {
    if (majorTypes.includes(record.entry.type)) latest.set(record.entry.type, record);
  }
  return latest.has("EvidenceGraph")
    && latest.has("IntelligenceSnapshot")
    && [...latest.values()].every((record) =>
      record.body?.header?.freshness?.status === "fresh");
}

function findRecordByRef(records, ref) {
  if (!ref) return undefined;
  return records.find((record) => sameArtifactRef(ref, record.entry));
}

function sameArtifactRef(ref, entry) {
  return Boolean(ref && entry && ref.type === entry.type && ref.id === entry.id);
}

function artifactRef(entry) {
  return {
    type: entry.type,
    id: entry.id,
    schemaVersion: entry.schemaVersion,
  };
}

function countArtifactTypes(entries) {
  const counts = {};
  for (const entry of entries) counts[entry.type] = (counts[entry.type] ?? 0) + 1;
  return counts;
}

async function runChecks(worktree, commands) {
  const results = [];
  for (const command of commands) {
    if (command !== "npm test") {
      results.push({ command, exitCode: 1, note: "unsupported-by-local-eval-harness" });
      continue;
    }
    const result = await execFileResult("npm", ["test"], worktree);
    results.push({ command, exitCode: result.exitCode });
  }
  return results;
}

async function runOracleChecks(worktree, oracleTests) {
  const results = [];
  for (const oracleTest of oracleTests) {
    const absolute = resolve(root, oracleTest);
    const result = await execFileResult(process.execPath, ["--experimental-strip-types", "--test", absolute], worktree, {
      REKON_EVAL_REPO_ROOT: worktree,
    });
    results.push({ command: `hidden:${oracleTest}`, exitCode: result.exitCode });
  }
  return results;
}

async function execFileResult(file, args, cwd, extraEnv = {}) {
  try {
    await execFileAsync(file, args, { cwd, env: { ...process.env, ...extraEnv }, timeout: options.timeoutMs });
    return { exitCode: 0 };
  } catch (caught) {
    return { exitCode: typeof caught?.code === "number" ? caught.code : 1 };
  }
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }
}

function pairRuns(entries) {
  const grouped = new Map();
  for (const run of entries) {
    const key = `${run.caseId}:${run.repeat}`;
    const pair = grouped.get(key) ?? {};
    pair[run.condition] = run;
    grouped.set(key, pair);
  }
  return [...grouped.values()];
}

function parseArgs(args) {
  const parsed = {
    cases: [],
    conditions: [],
    corpus: "live",
    contextPolicy: "full",
    delivery: "direct",
    dryRun: false,
    json: false,
    keepWorkdirs: false,
    productLoop: false,
    ledger: undefined,
    repeats: 1,
    timeoutMs: 300_000,
  };
  let timeoutExplicit = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--case") parsed.cases.push(requiredValue(args, ++index, arg));
    else if (arg === "--condition") parsed.conditions.push(requiredValue(args, ++index, arg));
    else if (arg === "--corpus") parsed.corpus = requiredValue(args, ++index, arg);
    else if (arg === "--context-policy") parsed.contextPolicy = requiredValue(args, ++index, arg);
    else if (arg === "--delivery") parsed.delivery = requiredValue(args, ++index, arg);
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--keep-workdirs") parsed.keepWorkdirs = true;
    else if (arg === "--product-loop") parsed.productLoop = true;
    else if (arg === "--ledger") parsed.ledger = requiredValue(args, ++index, arg);
    else if (arg === "--model") parsed.model = requiredValue(args, ++index, arg);
    else if (arg === "--output") parsed.output = requiredValue(args, ++index, arg);
    else if (arg === "--profile") parsed.profile = requiredValue(args, ++index, arg);
    else if (arg === "--reasoning-effort") parsed.reasoningEffort = requiredValue(args, ++index, arg);
    else if (arg === "--repeats") parsed.repeats = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--timeout-ms") {
      parsed.timeoutMs = positiveInteger(requiredValue(args, ++index, arg), arg);
      timeoutExplicit = true;
    }
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (parsed.profile && !["compact", "standard", "deep"].includes(parsed.profile)) {
    throw new Error("--profile must be compact, standard, or deep.");
  }
  if (parsed.reasoningEffort
    && !["none", "minimal", "low", "medium", "high", "xhigh"].includes(parsed.reasoningEffort)) {
    throw new Error("--reasoning-effort must be none, minimal, low, medium, high, or xhigh.");
  }
  if (!["direct", "managed"].includes(parsed.delivery)) {
    throw new Error("--delivery must be direct or managed.");
  }
  if (parsed.productLoop && parsed.delivery !== "managed") {
    throw new Error("--product-loop requires --delivery managed.");
  }
  if (parsed.productLoop && !timeoutExplicit) parsed.timeoutMs = 900_000;
  if (!["full", "tiered", "role-aware", "summary-aware", "navigation-only"].includes(parsed.contextPolicy)) {
    throw new Error("--context-policy must be full, tiered, role-aware, summary-aware, or navigation-only.");
  }
  if (!["live", "mixed", "independent", "optional-route", "contract-backed-route", "symbol-contract-route", "navigation-packet", "refinement", "refinement-positive", "contracts"].includes(parsed.corpus)) {
    throw new Error("--corpus must be live, mixed, independent, optional-route, contract-backed-route, symbol-contract-route, navigation-packet, refinement, refinement-positive, or contracts.");
  }
  parsed.conditions = parsed.conditions.length === 0 ? ["baseline", "rekon"] : [...new Set(parsed.conditions)];
  if (parsed.conditions.some((condition) => !["baseline", "rekon"].includes(condition))) {
    throw new Error("--condition must be baseline or rekon.");
  }
  const corpusSegment = parsed.corpus === "live" ? "" : `-${parsed.corpus}`;
  const policySegment = parsed.contextPolicy === "full" ? "" : `-${parsed.contextPolicy}`;
  parsed.ledger ??= parsed.delivery === "managed"
    ? parsed.productLoop
      ? `.rekon-dev/evals/model-interface${corpusSegment}${policySegment}-product-loop-ledger.jsonl`
      : `.rekon-dev/evals/model-interface${corpusSegment}${policySegment}-adoption-ledger.jsonl`
    : `.rekon-dev/evals/model-interface${corpusSegment}${policySegment}-local-agent-ledger.jsonl`;
  return parsed;
}

function corpusFixturePath(corpus) {
  return {
    live: "tests/evals/model-interface-live/cases.json",
    mixed: "tests/evals/model-interface-mixed/cases.json",
    independent: "tests/evals/model-interface-independent/cases.json",
    "optional-route": "tests/evals/model-interface-optional-route/cases.json",
    "contract-backed-route": "tests/evals/model-interface-contract-backed-route/cases.json",
    "symbol-contract-route": "tests/evals/model-interface-symbol-contract-route/cases.json",
    "navigation-packet": "tests/evals/model-interface-navigation-packet/cases.json",
    refinement: "tests/evals/model-interface-refinement/cases.json",
    "refinement-positive": "tests/evals/model-interface-refinement-positive/cases.json",
    contracts: "tests/evals/model-interface-contracts/cases.json",
  }[corpus];
}

async function loadFixture(path) {
  const fixture = JSON.parse(await readFile(path, "utf8"));
  if (!fixture.contextFixture) return fixture;
  const contextPath = resolve(dirname(path), fixture.contextFixture);
  const context = JSON.parse(await readFile(contextPath, "utf8"));
  return {
    ...context,
    ...fixture,
    repository: { ...(context.repository ?? {}), ...(fixture.repository ?? {}) },
    graph: fixture.graph ?? context.graph,
    repositoryContractSources: fixture.repositoryContractSources ?? context.repositoryContractSources,
    cases: fixture.cases,
  };
}

function buildFixtureRepositoryLaw(currentFixture, currentGeneratedAt) {
  const sources = currentFixture.repositoryContractSources ?? [];
  if (sources.length === 0) return undefined;
  const projection = buildRepositoryContractProjection({
    repoId: "model-interface-local-agent-eval",
    generatedAt: currentGeneratedAt,
    sources: sources.map((source) => ({
      ...source,
      digest: source.digest ?? createHash("sha256").update(JSON.stringify(source.document)).digest("hex"),
    })),
  });
  return {
    ...projection,
    registryRef: {
      type: projection.registry.header.artifactType,
      id: projection.registry.header.artifactId,
      schemaVersion: projection.registry.header.schemaVersion,
    },
  };
}

function buildCampaignManifest() {
  const corpusDigest = createHash("sha256").update(JSON.stringify(fixture)).digest("hex");
  const interfaceDigest = createHash("sha256").update(JSON.stringify({
    managedInstructionsVersion,
    mcpServerVersion: MCP_SERVER_VERSION,
    steps: REKON_AGENT_MCP_STEPS,
    delivery: options.delivery,
    contextPolicy: options.contextPolicy,
    productLoop: options.productLoop,
  })).digest("hex");
  return {
    id: `model-interface-${createHash("sha256").update(JSON.stringify({
      generatedAt,
      corpusDigest,
      interfaceDigest,
      conditions: options.conditions,
      repeats: options.repeats,
    })).digest("hex").slice(0, 16)}`,
    git: gitState(),
    corpus: options.corpus,
    corpusDigest,
    interface: {
      managedInstructionsVersion,
      mcpServerVersion: MCP_SERVER_VERSION,
      digest: interfaceDigest,
    },
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    conditions: options.conditions,
    repeats: options.repeats,
    model: options.model ?? "default",
    reasoningEffort: options.reasoningEffort ?? "default",
    costAccounting: "subscription token counts; no provider pricing applied",
  };
}

async function readManagedInstructionsVersion() {
  const source = await readFile(join(root, "packages/cli/src/agent-instructions.ts"), "utf8");
  const match = source.match(/AGENT_INSTRUCTIONS_VERSION\s*=\s*"([^"]+)"/u);
  if (!match) throw new Error("Could not resolve the managed Rekon instruction version.");
  return match[1];
}

function selectCases(allCases, ids) {
  if (ids.length === 0) return allCases;
  return ids.map((id) => {
    const entry = allCases.find((candidate) => candidate.id === id);
    if (!entry) throw new Error(`Unknown model-interface case: ${id}`);
    return entry;
  });
}

function requiredValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function positiveInteger(value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} must be a positive integer.`);
  return parsed;
}

function commandOutput(file, args, cwd = root) {
  try {
    return execFileSync(file, args, { cwd, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function rawCommandOutput(file, args, cwd = root) {
  try {
    return execFileSync(file, args, { cwd, encoding: "utf8" });
  } catch {
    return "";
  }
}

function gitState() {
  return {
    commit: commandOutput("git", ["rev-parse", "HEAD"]) || "unknown",
    dirty: commandOutput("git", ["status", "--porcelain"]).length > 0,
  };
}

function emptyExploration() {
  return {
    commandCount: 0,
    discoveryCommands: 0,
    readCommands: 0,
    verificationCommands: 0,
    failedCommands: 0,
    discoveredPaths: [],
    inspectedPaths: [],
    searchedPaths: [],
  };
}

function defaultOutputPath(value) {
  const corpusSegment = options.corpus === "live" ? "" : `-${options.corpus}`;
  const policySegment = options.contextPolicy === "full" ? "" : `-${options.contextPolicy}`;
  const name = options.delivery === "managed"
    ? options.productLoop
      ? `model-interface${corpusSegment}${policySegment}-product-loop`
      : `model-interface${corpusSegment}${policySegment}-adoption`
    : `model-interface${corpusSegment}${policySegment}-local-agent`;
  return join(".rekon-dev", "evals", `${name}-${value.replace(/[:.]/gu, "-")}.json`);
}

function printSummary(report, outputPath, ledgerPath) {
  process.stdout.write("Case | Repeat | Decision | Baseline pass/search/commands | Rekon pass/search/commands\n");
  process.stdout.write("--- | ---: | --- | --- | ---\n");
  for (const pair of report.pairs) {
    const baseline = report.runs.find((run) => run.caseId === pair.caseId && run.repeat === pair.repeat && run.condition === "baseline");
    const rekon = report.runs.find((run) => run.caseId === pair.caseId && run.repeat === pair.repeat && run.condition === "rekon");
    process.stdout.write(`${pair.caseId} | ${pair.repeat} | ${pair.decision} | ${metrics(baseline)} | ${metrics(rekon)}\n`);
  }
  const tokenComparison = report.summary.tokenComparison;
  process.stdout.write(`\nSubscription-reported token reduction: ${formatPercent(tokenComparison.subscriptionReportedTotalReduction)}\n`);
  process.stdout.write(`Visible estimated token reduction: ${formatPercent(tokenComparison.visibleEstimatedTotalReduction)}\n`);
  if (report.summary.adoption) {
    process.stdout.write(`Adoption: ${report.summary.adoption.adopted}/${report.summary.adoption.runs} runs\n`);
    if (report.summary.adoption.productLoop) {
      process.stdout.write(
        `Product loop: ${report.summary.adoption.productLoop.passed}/${report.summary.adoption.productLoop.runs} runs\n`,
      );
    }
  }
  process.stdout.write(`Source retention: ${report.sourceRetention}\n`);
  process.stdout.write(`Report: ${outputPath}\nLedger: ${ledgerPath}\n`);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function metrics(run) {
  if (!run) return "missing";
  const search = new Set([
    ...run.exploration.discoveredPaths,
    ...run.exploration.inspectedPaths,
    ...run.exploration.searchedPaths,
    ...(run.final?.contextPaths ?? []),
  ]).size;
  return `${run.score.passed}/${search}/${run.exploration.commandCount}`;
}

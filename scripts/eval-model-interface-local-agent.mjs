#!/usr/bin/env node

import { execFile, execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
import { createLocalArtifactStore } from "@rekon/runtime";

import {
  assessRekonContextUse,
  compactLocalAgentRun,
  compareManagedLocalAgentPair,
  compareLocalAgentPair,
  estimateVisibleTokenUsage,
  LOCAL_AGENT_RESPONSE_SCHEMA,
  normalizeLocalAgentResponse,
  parseCodexJsonl,
  parseGitStatusPaths,
  scoreLocalAgentOutcome,
  summarizeCodexExploration,
  summarizeContextSelection,
  summarizeContextUse,
  summarizeCodexTokenUsage,
  summarizeLocalAgentRuns,
  summarizeRekonAdoption,
} from "./lib/model-interface-local-agent-eval.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const fixturePath = join(root, corpusFixturePath(options.corpus));
const fixture = await loadFixture(fixturePath);
const fixtureRepoRoot = resolve(dirname(fixturePath), fixture.repository.root);
const cliEntry = join(root, "packages/cli/dist/index.js");
const cases = selectCases(fixture.cases, options.cases);
const generatedAt = new Date().toISOString();
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
    schemaVersion: fixture.schemaVersion,
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
  schemaVersion: "1.0.0",
  generatedAt,
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
    ? "Agents follow Rekon-managed repository instructions and obtain bounded context before broad exploration or editing"
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
  let error;
  try {
    await cp(fixtureRepoRoot, worktree, { recursive: true });
    for (const source of fixture.repositoryContractSources ?? []) {
      const sourcePath = join(worktree, source.path);
      await mkdir(dirname(sourcePath), { recursive: true });
      await writeFile(sourcePath, `${JSON.stringify(source.document, null, 2)}\n`);
    }
    if (options.delivery === "managed" && condition === "rekon") {
      await prepareManagedRekonWorktree(worktree);
    }
    await writeFile(schemaPath, `${JSON.stringify(LOCAL_AGENT_RESPONSE_SCHEMA, null, 2)}\n`);
    await initializeGit(worktree);
    const started = performance.now();
    const prompt = buildPrompt(caseEntry.task, condition, contextPacket);
    const result = await runCodex({
      worktree,
      schemaPath,
      finalPath,
      prompt,
      enableMcp: options.delivery === "managed" && condition === "rekon",
    });
    const elapsedMs = Math.round(performance.now() - started);
    const parsed = parseCodexJsonl(result.stdout);
    const tokenUsage = summarizeCodexTokenUsage(parsed.events);
    const visibleTokenEstimate = estimateVisibleTokenUsage(parsed.events, prompt);
    const exploration = summarizeCodexExploration(parsed.events, fixture.repository.files);
    const finalValue = await readJson(finalPath);
    const normalizedFinal = normalizeLocalAgentResponse(finalValue, fixture.repository.files);
    if (!normalizedFinal.ok) error = normalizedFinal.error;
    const modifiedPaths = parseGitStatusPaths(rawCommandOutput("git", ["status", "--short"], worktree));
    const agentCommands = parsed.events
      .filter((event) => event.type === "item.completed" && event.item?.type === "command_execution")
      .map((event) => event.item.command)
      .filter((command) => typeof command === "string");
    const requiredChecks = await runChecks(worktree, caseEntry.oracle.commands ?? []);
    const oracleChecks = await runOracleChecks(worktree, caseEntry.oracle.oracleTests ?? []);
    const contextUse = condition === "rekon"
      ? summarizeContextUse(contextSelection, exploration, normalizedFinal.response, modifiedPaths)
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
      final: normalizedFinal.ok ? normalizedFinal.response : undefined,
      modifiedPaths,
      agentCommands,
      requiredChecks,
      oracleChecks,
      exploration,
      tokenUsage,
      visibleTokenEstimate,
      ...(contextUse ? { contextUse } : {}),
      ...(adoption ? { adoption } : {}),
      elapsedMs,
      ...(result.exitCode !== 0 ? { error: `codex-exit-${result.exitCode}` } : {}),
      ...(error ? { error } : {}),
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

async function runCodex({ worktree, schemaPath, finalPath, prompt, enableMcp }) {
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
        PATH: `${join(root, "node_modules", ".bin")}${delimiter}${process.env.PATH ?? ""}`,
        ...(enableMcp
          ? { REKON_EXPERIMENTAL_CONTEXT_DELIVERY_POLICY: options.contextPolicy }
          : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
    }, options.timeoutMs);
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      resolvePromise({
        exitCode: typeof code === "number" ? code : 1,
        signal,
        stdout,
        stderrSummary: stderr.split(/\r?\n/u).filter(Boolean).slice(-5),
      });
    });
  });
}

async function prepareManagedRekonWorktree(worktree) {
  await execFileAsync(process.execPath, [cliEntry, "refresh", "--root", worktree, "--json"], {
    cwd: root,
    timeout: options.timeoutMs,
    maxBuffer: 10_000_000,
  });

  const store = createLocalArtifactStore(worktree);
  const evidenceRef = (await store.list("EvidenceGraph")).at(-1);
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
    ledger: undefined,
    repeats: 1,
    timeoutMs: 300_000,
  };
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
    else if (arg === "--ledger") parsed.ledger = requiredValue(args, ++index, arg);
    else if (arg === "--model") parsed.model = requiredValue(args, ++index, arg);
    else if (arg === "--output") parsed.output = requiredValue(args, ++index, arg);
    else if (arg === "--profile") parsed.profile = requiredValue(args, ++index, arg);
    else if (arg === "--reasoning-effort") parsed.reasoningEffort = requiredValue(args, ++index, arg);
    else if (arg === "--repeats") parsed.repeats = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = positiveInteger(requiredValue(args, ++index, arg), arg);
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
    ? `.rekon-dev/evals/model-interface${corpusSegment}${policySegment}-adoption-ledger.jsonl`
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
    ? `model-interface${corpusSegment}${policySegment}-adoption`
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

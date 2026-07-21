#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { appendFile, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import {
  compileTaskContext,
  projectModelContext,
  projectModelContextDelivery,
  selectLexicalGraphContextPaths,
  selectTaskContextRefinement,
  selectTaskContractGuidance,
} from "@rekon/capability-model";
import {
  createAnthropicLlmProvider,
  createOpenAiResponsesLlmProvider,
} from "@rekon/llm-provider";

import {
  estimateUsageCost,
  PRICING_AS_OF,
  SEMANTIC_DEBT_MODEL_CONFIGS,
} from "./lib/semantic-debt-eval.mjs";
import {
  MODEL_INTERFACE_RESPONSE_SCHEMA,
  MODEL_INTERFACE_REFINEMENT_RESPONSE_SCHEMA,
  buildModelInterfacePrompt,
  compactModelInterfaceRun,
  compareModelInterfacePair,
  normalizeModelInterfaceResponse,
  normalizeModelInterfaceRefinementResponse,
  scoreModelInterfaceRefinement,
  scoreModelInterfaceRun,
  summarizeModelInterfaceRefinementCalibration,
  sumModelUsage,
} from "./lib/model-interface-live-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const fixturePath = join(root, corpusFixturePath(options.corpus));
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const repoRoot = resolve(dirname(fixturePath), fixture.repository.root);
const repositoryGuidance = await readFixtureFile("AGENTS.md", options.maxSourceChars);
const cases = selectCases(fixture.cases, options.cases);
const configs = selectConfigs(options.models);

if (options.listModels) {
  for (const config of SEMANTIC_DEBT_MODEL_CONFIGS) {
    process.stdout.write(`${config.id}\t${config.provider}\t${config.model}\t${config.effort ?? "default"}\n`);
  }
  process.exit(0);
}

const pairedRunCount = configs.length * cases.length * options.repeats;
const conditionRunCount = pairedRunCount * 2;
if (options.dryRun) {
  process.stdout.write(`${JSON.stringify({
    schemaVersion: fixture.schemaVersion,
    corpus: options.corpus,
    hypothesis: hypothesis(options.profile, options.corpus),
    cases: cases.map((entry) => entry.id),
    models: configs.map(publicConfig),
    conditions: ["baseline", "rekon"],
    repeats: options.repeats,
    pairedRuns: pairedRunCount,
    conditionRuns: conditionRunCount,
    upperBoundProviderCalls: conditionRunCount * options.maxTurns,
    budgets: budgets(options),
    sourceRetention: "none",
    promotionRequiresRepeats: 3,
  }, null, 2)}\n`);
  process.exit(0);
}

const missing = configs
  .filter((config) => config.provider === "openai" ? !process.env.OPENAI_API_KEY : !process.env.ANTHROPIC_API_KEY)
  .map((config) => config.id);
if (missing.length > 0) {
  throw new Error(`Missing provider credentials for: ${missing.join(", ")}. Supply keys through the environment.`);
}

const providers = {
  openai: createOpenAiResponsesLlmProvider({ apiKey: process.env.OPENAI_API_KEY, timeoutMs: options.timeoutMs }),
  anthropic: createAnthropicLlmProvider({ apiKey: process.env.ANTHROPIC_API_KEY, timeoutMs: options.timeoutMs }),
};
const generatedAt = new Date().toISOString();
const runs = [];
let runningCostUsd = 0;
let stoppedReason;

outer:
for (const config of configs) {
  for (const entry of cases) {
    const lexicalContextPaths = entry.paths.length === 0
      ? selectLexicalGraphContextPaths(entry.task, fixture.graph)
      : [];
    const contractGuidance = selectTaskContractGuidance({
      paths: [...new Set([...entry.paths, ...lexicalContextPaths])],
      graph: fixture.graph,
      capabilityContract: fixture.capabilityContract,
      capabilityContractRef: fixture.capabilityContractRef,
    });
    const { packet } = compileTaskContext({
      taskText: entry.task,
      paths: entry.paths,
      ...(lexicalContextPaths.length > 0 ? { lexicalContextPaths } : {}),
      profile: options.profile ?? entry.profile,
      graph: fixture.graph,
      retrievalResults: entry.retrievalResults,
      inputRefs: [
        ...(fixture.capabilityContractRef && contractGuidance.matchedContractIds.length > 0
          ? [fixture.capabilityContractRef]
          : []),
      ],
      declaredConstraints: contractGuidance.constraints,
      declaredContextPaths: contractGuidance.requiredContextPaths,
      declaredVerificationHints: contractGuidance.verificationHints,
      generatedAt,
      repoId: "model-interface-live-eval",
    });
    const modelContext = projectModelContextDelivery(projectModelContext(packet));
    for (let repeat = 1; repeat <= options.repeats; repeat += 1) {
      for (const condition of ["baseline", "rekon"]) {
        if (runningCostUsd >= options.maxCostUsd) {
          stoppedReason = `Cost limit reached before ${config.id}/${entry.id}/${repeat}/${condition}.`;
          break outer;
        }
        process.stderr.write(`[model-interface-live] ${config.id} ${entry.id} r${repeat} ${condition}\n`);
        const run = await runCondition({
          caseEntry: entry,
          condition,
          config,
          contextPacket: modelContext,
          provider: providers[config.provider],
          repositoryGuidance,
          repeat,
          refinementMode: options.corpus === "refinement" || options.corpus === "refinement-positive",
        });
        runningCostUsd += run.costUsd;
        runs.push(compactModelInterfaceRun(run));
      }
    }
  }
}

const pairs = pairRuns(runs).map(({ baseline, rekon }) => ({
  modelConfigId: baseline?.modelConfigId ?? rekon?.modelConfigId,
  caseId: baseline?.caseId ?? rekon?.caseId,
  repeat: baseline?.repeat ?? rekon?.repeat,
  ...compareModelInterfacePair(baseline, rekon),
}));
const decisionCounts = Object.fromEntries(
  ["candidate", "no-advantage", "discard", "inconclusive"].map((decision) => [
    decision,
    pairs.filter((entry) => entry.decision === decision).length,
  ]),
);
const promotionEligible = options.repeats >= 3
  && pairs.length > 0
  && pairs.every((entry) => entry.decision === "candidate");
const report = {
  schemaVersion: "1.0.0",
  generatedAt,
  pricingAsOf: PRICING_AS_OF,
  git: gitState(),
  hypothesis: hypothesis(options.profile, options.corpus),
  sourceRetention: "none",
  fixture: {
    corpus: options.corpus,
    schemaVersion: fixture.schemaVersion,
    cases: cases.map((entry) => entry.id),
    repositoryFiles: fixture.repository.files,
  },
  options: {
    profile: options.profile ?? "fixture-default",
    repeats: options.repeats,
    ...budgets(options),
  },
  models: configs.map(publicConfig),
  summary: {
    pairedRuns: pairs.length,
    decisionCounts,
    promotionEligible,
    totalCostUsd: round(runningCostUsd, 6),
    totalUsage: sumModelUsage(runs.map((run) => run.usage)),
  },
  ...(stoppedReason ? { stoppedReason } : {}),
  pairs,
  runs,
};
const outputPath = resolve(root, options.output ?? defaultOutputPath(generatedAt));
const ledgerPath = resolve(root, options.ledger);
const calibrationOutputPath = options.calibrationOutput
  ? resolve(root, options.calibrationOutput)
  : undefined;
await mkdir(dirname(outputPath), { recursive: true });
await mkdir(dirname(ledgerPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
await appendFile(ledgerPath, `${JSON.stringify({
  generatedAt,
  git: report.git,
  hypothesis: report.hypothesis,
  models: report.models.map((model) => model.id),
  cases: report.fixture.cases,
  summary: report.summary,
  pairs,
  report: relative(root, outputPath),
})}\n`);
if (calibrationOutputPath) {
  await mkdir(dirname(calibrationOutputPath), { recursive: true });
  await writeFile(
    calibrationOutputPath,
    `${JSON.stringify(summarizeModelInterfaceRefinementCalibration(report), null, 2)}\n`,
  );
}

if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else printSummary(report, outputPath, ledgerPath, calibrationOutputPath);
if (stoppedReason || runs.some((run) => run.status !== "ok")) process.exitCode = 1;

async function runCondition({
  caseEntry,
  condition,
  config,
  contextPacket,
  provider,
  repositoryGuidance,
  repeat,
  refinementMode,
}) {
  const inspectedFiles = [];
  const requestedPaths = [];
  const invalidRequestedPaths = [];
  const refinementRequests = [];
  const protocolEvents = [];
  const usages = [];
  let final;
  let error;
  let status = "incomplete";
  let turns = 0;
  let sourceChars = 0;
  let latencyMs = 0;

  for (let turn = 1; turn <= options.maxTurns; turn += 1) {
    turns = turn;
    const prompt = buildModelInterfacePrompt({
      condition,
      contextPacket,
      finalTurn: turn === options.maxTurns,
      inspectedFiles,
      maxFilesPerTurn: options.maxFilesPerTurn,
      repositoryFiles: fixture.repository.files,
      repositoryGuidance,
      task: caseEntry.task,
      refinementAvailable: refinementMode,
      refinementHistory: refinementRequests,
      maxRefinementCalls: caseEntry.managedExpectations?.maxRefinementCalls,
      protocolEvents,
    });
    const started = performance.now();
    const completion = await completeWithRetries(provider, {
      task: "artifact.summary",
      schemaName: "ModelInterfaceContextAcquisition",
      prompt,
      model: config.model,
      ...(config.effort ? { effort: config.effort } : {}),
      maxOutputTokens: options.maxOutputTokens,
      jsonSchema: refinementMode
        ? MODEL_INTERFACE_REFINEMENT_RESPONSE_SCHEMA
        : MODEL_INTERFACE_RESPONSE_SCHEMA,
    });
    latencyMs += performance.now() - started;
    if (!completion.result.ok) {
      error = completion.result.error;
      status = "error";
      break;
    }
    usages.push(completion.result.usage);
    const normalized = refinementMode
      ? normalizeModelInterfaceRefinementResponse(
        completion.result.data,
        fixture.repository.files,
        options.maxFilesPerTurn,
      )
      : normalizeModelInterfaceResponse(
        completion.result.data,
        fixture.repository.files,
        options.maxFilesPerTurn,
      );
    if (!normalized.ok) {
      error = normalized.error;
      status = "error";
      break;
    }
    invalidRequestedPaths.push(...normalized.invalidPaths);
    if (normalized.response.status === "final") {
      final = normalized.response;
      status = "ok";
      break;
    }
    if (turn === options.maxTurns) {
      error = "inspection-requested-on-final-turn";
      break;
    }
    if (normalized.response.status === "refine") {
      if (condition !== "rekon") {
        error = "refinement-unavailable-in-baseline";
        break;
      }
      const unreadInitialPaths = contextPacket.readFirst.filter((path) => !requestedPaths.includes(path));
      if (unreadInitialPaths.length > 0) {
        error = "refinement-before-read-first";
        break;
      }
      const maxRefinementCalls = caseEntry.managedExpectations?.maxRefinementCalls ?? 2;
      if (refinementRequests.length >= maxRefinementCalls) {
        error = "refinement-call-limit-reached";
        break;
      }
      const request = normalized.response;
      const refinement = selectTaskContextRefinement({
        question: `Resolve task-required ${request.refinementRelationship} context for ${caseEntry.id}.`,
        relationship: request.refinementRelationship,
        ...(request.refinementAnchorPath ? { anchorPath: request.refinementAnchorPath } : {}),
        ...(request.refinementAnchorSymbol ? { anchorSymbol: request.refinementAnchorSymbol } : {}),
        alreadyRead: requestedPaths,
        graph: fixture.graph,
      });
      const readNext = refinement.readNext.map((entry) => entry.path);
      refinementRequests.push({
        relationship: request.refinementRelationship,
        ...(request.refinementAnchorPath ? { anchorPath: request.refinementAnchorPath } : {}),
        ...(request.refinementAnchorSymbol ? { anchorSymbol: request.refinementAnchorSymbol } : {}),
        readNext,
        unresolved: refinement.unresolved,
      });
      continue;
    }
    const newPaths = normalized.response.paths.filter((path) => !requestedPaths.includes(path));
    if (newPaths.length === 0) {
      if (refinementMode && condition === "rekon") {
        protocolEvents.push("The previous inspect request contained no unread paths. Finalize or request only unread exact paths; use refine for an unresolved symbolic target.");
        continue;
      }
      error = "no-new-files-requested";
      break;
    }
    for (const path of newPaths) {
      const remaining = options.maxSourceChars - sourceChars;
      if (remaining <= 0) break;
      const text = await readFixtureFile(path, remaining);
      sourceChars += text.length;
      inspectedFiles.push({ path, text });
      requestedPaths.push(path);
    }
  }

  const usage = sumModelUsage(usages);
  const costUsd = round(estimateUsageCost(usage, config.pricing), 6);
  const run = {
    modelConfigId: config.id,
    provider: config.provider,
    model: config.model,
    caseId: caseEntry.id,
    repeat,
    condition,
    status,
    turns,
    requestedPaths,
    invalidRequestedPaths: [...new Set(invalidRequestedPaths)],
    final,
    usage,
    latencyMs: round(latencyMs, 1),
    costUsd,
    ...(refinementMode ? { refinementRequests } : {}),
    ...(error ? { error } : {}),
  };
  run.score = scoreModelInterfaceRun(run, caseEntry.oracle);
  if (refinementMode && condition === "rekon") {
    run.refinement = scoreModelInterfaceRefinement(run, caseEntry.managedExpectations, caseEntry.oracle);
    run.score.passed = run.score.passed && run.refinement.passed;
  }
  return run;
}

async function readFixtureFile(path, maxChars) {
  const absolute = resolve(repoRoot, path);
  const relativePath = relative(repoRoot, absolute);
  if (relativePath.startsWith("..") || relativePath === "" || !fixture.repository.files.includes(path)) {
    throw new Error(`Fixture path is outside the allowlist: ${path}`);
  }
  const stat = await lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Fixture path is not a regular file: ${path}`);
  return (await readFile(absolute, "utf8")).slice(0, maxChars);
}

async function completeWithRetries(provider, input) {
  let result;
  for (let attempt = 1; attempt <= options.retries + 1; attempt += 1) {
    result = await provider.completeJson(input);
    if (result.ok || !isRetryable(result.error) || attempt > options.retries) return { result, attempts: attempt };
    await delay(500 * (2 ** (attempt - 1)));
  }
  return { result, attempts: options.retries + 1 };
}

function pairRuns(entries) {
  const grouped = new Map();
  for (const run of entries) {
    const key = `${run.modelConfigId}:${run.caseId}:${run.repeat}`;
    const pair = grouped.get(key) ?? {};
    pair[run.condition] = run;
    grouped.set(key, pair);
  }
  return [...grouped.values()];
}

function parseArgs(args) {
  const parsed = {
    cases: [],
    corpus: "live",
    dryRun: false,
    json: false,
    ledger: ".rekon-dev/evals/model-interface-ledger.jsonl",
    listModels: false,
    maxCostUsd: 0.5,
    maxFilesPerTurn: 4,
    maxOutputTokens: 1000,
    maxSourceChars: 24000,
    maxTurns: 4,
    models: [],
    repeats: 1,
    retries: 1,
    timeoutMs: 120000,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--case") parsed.cases.push(requiredValue(args, ++index, arg));
    else if (arg === "--calibration-output") parsed.calibrationOutput = requiredValue(args, ++index, arg);
    else if (arg === "--corpus") parsed.corpus = requiredValue(args, ++index, arg);
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--ledger") parsed.ledger = requiredValue(args, ++index, arg);
    else if (arg === "--list-models") parsed.listModels = true;
    else if (arg === "--max-cost-usd") parsed.maxCostUsd = positiveNumber(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-files-per-turn") parsed.maxFilesPerTurn = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-output-tokens") parsed.maxOutputTokens = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-source-chars") parsed.maxSourceChars = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-turns") parsed.maxTurns = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--models") parsed.models.push(...requiredValue(args, ++index, arg).split(",").filter(Boolean));
    else if (arg === "--output") parsed.output = requiredValue(args, ++index, arg);
    else if (arg === "--profile") parsed.profile = requiredValue(args, ++index, arg);
    else if (arg === "--repeats") parsed.repeats = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--retries") parsed.retries = nonNegativeInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = positiveInteger(requiredValue(args, ++index, arg), arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (parsed.profile && !["compact", "standard", "deep"].includes(parsed.profile)) {
    throw new Error("--profile must be compact, standard, or deep.");
  }
  if (!["live", "refinement", "refinement-positive"].includes(parsed.corpus)) {
    throw new Error("--corpus must be live, refinement, or refinement-positive.");
  }
  return parsed;
}

function selectCases(allCases, ids) {
  if (ids.length === 0) return allCases;
  return ids.map((id) => {
    const entry = allCases.find((candidate) => candidate.id === id);
    if (!entry) throw new Error(`Unknown model-interface case: ${id}`);
    return entry;
  });
}

function selectConfigs(ids) {
  const selected = ids.length > 0 ? ids : ["gpt-5.6-luna@low"];
  return selected.map((id) => {
    const config = SEMANTIC_DEBT_MODEL_CONFIGS.find((candidate) => candidate.id === id);
    if (!config) throw new Error(`Unknown model config: ${id}`);
    return config;
  });
}

function hypothesis(profile, corpus) {
  if (corpus === "refinement") {
    return `${profile ?? "compact"} Rekon context proactively routes deterministic symbolic targets, reserving bounded refinement for unresolved relationships, without reducing task, pact, or verification correctness`;
  }
  if (corpus === "refinement-positive") {
    return `${profile ?? "compact"} Rekon context uses one bounded deterministic refinement to resolve a task-required runtime-bound implementation absent from the initial packet`;
  }
  return `${profile ?? "compact"} Rekon context reduces inspection or token cost without reducing task, pact, or verification correctness`;
}

function corpusFixturePath(corpus) {
  return {
    live: "tests/evals/model-interface-live/cases.json",
    refinement: "tests/evals/model-interface-refinement/cases.json",
    "refinement-positive": "tests/evals/model-interface-refinement-positive/cases.json",
  }[corpus];
}

function budgets(value) {
  return {
    maxCostUsd: value.maxCostUsd,
    maxFilesPerTurn: value.maxFilesPerTurn,
    maxOutputTokens: value.maxOutputTokens,
    maxSourceChars: value.maxSourceChars,
    maxTurns: value.maxTurns,
  };
}

function publicConfig(config) {
  return {
    id: config.id,
    provider: config.provider,
    model: config.model,
    ...(config.effort ? { effort: config.effort } : {}),
    pricing: config.pricing,
  };
}

function gitState() {
  try {
    return {
      commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      dirty: execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim().length > 0,
    };
  } catch {
    return { commit: "unknown", dirty: true };
  }
}

function defaultOutputPath(value) {
  return join(
    ".rekon-dev",
    "evals",
    `model-interface-${options.corpus}-${value.replace(/[:.]/g, "-")}.json`,
  );
}

function printSummary(report, outputPath, ledgerPath, calibrationOutputPath) {
  process.stdout.write("Model | Case | Repeat | Decision | Baseline score/files/turns/tokens | Rekon score/files/turns/tokens\n");
  process.stdout.write("--- | --- | ---: | --- | --- | ---\n");
  for (const pair of report.pairs) {
    const baseline = report.runs.find((run) => run.modelConfigId === pair.modelConfigId && run.caseId === pair.caseId && run.repeat === pair.repeat && run.condition === "baseline");
    const rekon = report.runs.find((run) => run.modelConfigId === pair.modelConfigId && run.caseId === pair.caseId && run.repeat === pair.repeat && run.condition === "rekon");
    process.stdout.write([
      pair.modelConfigId,
      pair.caseId,
      pair.repeat,
      pair.decision,
      compactMetrics(baseline),
      compactMetrics(rekon),
    ].join(" | ") + "\n");
  }
  process.stdout.write(`\nCost: $${report.summary.totalCostUsd.toFixed(6)}\n`);
  process.stdout.write(`Promotion eligible: ${report.summary.promotionEligible}\n`);
  process.stdout.write(`Source retention: ${report.sourceRetention}\n`);
  process.stdout.write(`Report: ${outputPath}\nLedger: ${ledgerPath}\n`);
  if (calibrationOutputPath) process.stdout.write(`Calibration: ${calibrationOutputPath}\n`);
}

function compactMetrics(run) {
  if (!run) return "missing";
  return `${run.score.qualityScore}/${run.requestedPaths.length}/${run.turns}/${run.usage.totalTokens}`;
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

function nonNegativeInteger(value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative integer.`);
  return parsed;
}

function positiveNumber(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${flag} must be positive.`);
  return parsed;
}

function isRetryable(error) {
  return error === "timeout" || error === "request-failed" || /^http-(408|409|429|5\d\d)$/u.test(error ?? "");
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function round(value, places = 4) {
  const scale = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * scale) / scale;
}

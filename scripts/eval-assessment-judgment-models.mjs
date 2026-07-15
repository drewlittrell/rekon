#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import {
  ASSESSMENT_JUDGMENT_JSON_SCHEMA,
  buildAssessmentJudgmentPrompt,
  coerceAssessmentJudgment,
} from "../packages/cli/dist/assessment-judgment.js";
import {
  createAnthropicLlmProvider,
  createOpenAiResponsesLlmProvider,
} from "../packages/llm-provider/dist/index.js";
import {
  estimateUsageCost,
  PRICING_AS_OF,
  SEMANTIC_DEBT_MODEL_CONFIGS,
} from "./lib/semantic-debt-eval.mjs";
import {
  DEFAULT_ASSESSMENT_JUDGMENT_MODEL_IDS,
  buildAssessmentJudgmentEvalCases,
  sourceChangeAnchor,
  summarizeAssessmentJudgmentRuns,
} from "../tests/bench/assessment-judgment-eval-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const catalog = JSON.parse(await readFile(join(root, "tests/bench/public-defect-pairs.sources.json"), "utf8"));
const adjudications = JSON.parse(await readFile(join(root, "tests/bench/calibration/public-defect-pair-adjudications.json"), "utf8"));
const cases = buildAssessmentJudgmentEvalCases(catalog, adjudications, options.pairs);
const configs = selectConfigs(options.models);

if (options.listModels) {
  for (const config of SEMANTIC_DEBT_MODEL_CONFIGS) {
    process.stdout.write(`${config.id}\t${config.provider}\t${config.model}\t${config.effort ?? "default"}\n`);
  }
  process.exit(0);
}

if (options.dryRun) {
  process.stdout.write(`${JSON.stringify({
    cases: cases.length,
    requests: cases.length * configs.length,
    maxCostUsd: options.maxCostUsd,
    maxSourceChars: options.maxSourceChars,
    sourceRetention: "none",
    models: configs.map(publicConfig),
    emitterGapClasses: [...new Set(cases.filter((entry) => entry.emitterCoverage === "emitter-gap").map((entry) => entry.candidateClass))].sort(),
  }, null, 2)}\n`);
  process.exit(0);
}

const missing = configs
  .filter((config) => config.provider === "openai" ? !process.env.OPENAI_API_KEY : !process.env.ANTHROPIC_API_KEY)
  .map((config) => config.id);
if (missing.length > 0) {
  throw new Error(`Missing provider credentials for: ${missing.join(", ")}. Keys must be supplied through the environment.`);
}

const providers = {
  openai: createOpenAiResponsesLlmProvider({ apiKey: process.env.OPENAI_API_KEY, timeoutMs: options.timeoutMs }),
  anthropic: createAnthropicLlmProvider({ apiKey: process.env.ANTHROPIC_API_KEY, timeoutMs: options.timeoutMs }),
};
const sourceCache = new Map();
const runs = [];
let runningCostUsd = 0;
let stoppedReason;

outer:
for (const config of configs) {
  let blockedFailure;
  for (const item of cases) {
    if (runningCostUsd >= options.maxCostUsd) {
      stoppedReason = `Cost limit reached before ${config.id}/${item.id}.`;
      break outer;
    }
    if (blockedFailure) {
      runs.push(compactErrorRun(item, config, `blocked-after:${blockedFailure}`));
      continue;
    }

    process.stderr.write(`[assessment-judgment-eval] ${config.id}: ${item.id}\n`);
    let sources;
    try {
      sources = await loadSources(item, sourceCache, options.retries, options.timeoutMs);
    } catch (error) {
      runs.push(compactErrorRun(item, config, `source-fetch:${messageOf(error)}`));
      continue;
    }
    const anchoredAssessment = assessmentWithSourceAnchors(item.assessment, sources);
    const prompt = buildAssessmentJudgmentPrompt({
      assessment: anchoredAssessment,
      sources,
      maxSourceChars: options.maxSourceChars,
    });
    const startedAt = performance.now();
    const completion = await completeWithRetries(providers[config.provider], {
      task: "policy.assessment-judgment",
      schemaName: "AssessmentJudgmentResult",
      prompt,
      model: config.model,
      ...(config.effort ? { effort: config.effort } : {}),
      maxOutputTokens: options.maxOutputTokens,
      jsonSchema: ASSESSMENT_JUDGMENT_JSON_SCHEMA,
    }, options.retries, config.id, item.id);
    const latencyMs = performance.now() - startedAt;
    if (!completion.result.ok) {
      runs.push({
        ...compactCase(item, config),
        status: "error",
        error: completion.result.error,
        warnings: completion.result.warnings ?? [],
        providerAttempts: completion.attempts,
        latencyMs,
        currentCostUsd: 0,
        steadyStateCostUsd: 0,
      });
      if (isConfigurationBlocking(completion.result.error)) blockedFailure = completion.result.error;
      continue;
    }

    const judgment = coerceAssessmentJudgment({
      assessment: anchoredAssessment,
      sources,
      result: completion.result.data && typeof completion.result.data === "object"
        ? completion.result.data
        : undefined,
    });
    const usage = completion.result.usage ?? {};
    const currentCostUsd = estimateUsageCost(usage, config.pricing);
    const steadyStateCostUsd = estimateUsageCost(usage, config.steadyStatePricing ?? config.pricing);
    runningCostUsd += currentCostUsd;
    runs.push({
      ...compactCase(item, config),
      status: "ok",
      provider: completion.result.provider,
      model: completion.result.model ?? config.model,
      verdict: judgment.verdict,
      confidence: judgment.confidence,
      evidenceCount: judgment.evidence.length,
      warnings: judgment.warnings ?? [],
      providerAttempts: completion.attempts,
      usage,
      latencyMs,
      currentCostUsd,
      steadyStateCostUsd,
    });
  }
}

const summary = summarizeAssessmentJudgmentRuns(runs, configs);
const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  pricingAsOf: PRICING_AS_OF,
  gitCommit: currentCommit(),
  corpus: {
    catalogVersion: catalog.version,
    adjudicationVersion: adjudications.schemaVersion,
    pairCount: new Set(cases.map((entry) => entry.pairId)).size,
    cases: cases.length,
    sourceRetention: "none",
  },
  options: {
    retries: options.retries,
    maxOutputTokens: options.maxOutputTokens,
    maxSourceChars: options.maxSourceChars,
    timeoutMs: options.timeoutMs,
    maxCostUsd: options.maxCostUsd,
  },
  models: configs.map(publicConfig),
  ...(stoppedReason ? { stoppedReason } : {}),
  ...summary,
  runs,
};
const outputPath = resolve(root, options.output ?? defaultOutputPath(report.generatedAt));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else printSummary(report, outputPath);
if (stoppedReason || report.summaries.some((entry) => entry.failures > 0)) process.exitCode = 1;

async function loadSources(item, cache, retries, timeoutMs) {
  return Promise.all(item.paths.map(async (path) => {
    const url = rawGitHubUrl(item.repository.url, item.commit, path);
    const counterpartUrl = rawGitHubUrl(item.repository.url, item.counterpartCommit, path);
    let text = cache.get(url);
    if (text === undefined) {
      text = await fetchTextWithRetries(url, retries, timeoutMs);
      cache.set(url, text);
    }
    let counterpartText = cache.get(counterpartUrl);
    if (counterpartText === undefined) {
      counterpartText = await fetchTextWithRetries(counterpartUrl, retries, timeoutMs);
      cache.set(counterpartUrl, counterpartText);
    }
    return {
      path,
      text,
      sha256: createHash("sha256").update(text).digest("hex"),
      anchorLine: sourceChangeAnchor(text, counterpartText),
    };
  }));
}

function assessmentWithSourceAnchors(assessment, sources) {
  const sourceEvidence = sources
    .filter((source) => source.anchorLine !== undefined)
    .map((source) => ({ path: source.path, lineStart: source.anchorLine }));
  if (sourceEvidence.length === 0) return assessment;
  return {
    ...assessment,
    details: {
      ...assessment.details,
      sourceEvidence,
    },
  };
}

function rawGitHubUrl(repositoryUrl, commit, path) {
  const parsed = new URL(repositoryUrl);
  const repository = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${repository}/${commit}/${encodedPath}`;
}

async function fetchTextWithRetries(url, retries, timeoutMs) {
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`http-${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt <= retries) await delay(500 * (2 ** (attempt - 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function completeWithRetries(provider, input, retries, modelConfigId, caseId) {
  let result;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    result = await provider.completeJson(input);
    if (result.ok || !isRetryable(result.error) || attempt > retries) return { result, attempts: attempt };
    process.stderr.write(`[assessment-judgment-eval] retry ${attempt}/${retries} for ${modelConfigId}/${caseId} after ${result.error}\n`);
    await delay(1000 * (2 ** (attempt - 1)));
  }
  return { result, attempts: retries + 1 };
}

function compactCase(item, config) {
  return {
    modelConfigId: config.id,
    caseId: item.id,
    pairId: item.pairId,
    revision: item.revision,
    expectedDisposition: item.expectedDisposition,
    candidateClass: item.candidateClass,
    emitterCoverage: item.emitterCoverage,
  };
}

function compactErrorRun(item, config, error) {
  return {
    ...compactCase(item, config),
    status: "error",
    error,
    providerAttempts: 0,
    latencyMs: 0,
    currentCostUsd: 0,
    steadyStateCostUsd: 0,
  };
}

function parseArgs(args) {
  const parsed = {
    dryRun: false,
    json: false,
    listModels: false,
    maxCostUsd: 5,
    maxOutputTokens: 1200,
    maxSourceChars: 24000,
    models: [],
    pairs: [],
    retries: 2,
    timeoutMs: 120000,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--list-models") parsed.listModels = true;
    else if (arg === "--models") parsed.models.push(...requiredValue(args, ++index, arg).split(",").filter(Boolean));
    else if (arg === "--pair") parsed.pairs.push(requiredValue(args, ++index, arg));
    else if (arg === "--retries") parsed.retries = nonNegativeInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-cost-usd") parsed.maxCostUsd = positiveNumber(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-output-tokens") parsed.maxOutputTokens = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-source-chars") parsed.maxSourceChars = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--output") parsed.output = requiredValue(args, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function selectConfigs(ids) {
  const selectedIds = ids.length === 0 ? DEFAULT_ASSESSMENT_JUDGMENT_MODEL_IDS : ids;
  return [...new Map(selectedIds.map((id) => {
    const config = SEMANTIC_DEBT_MODEL_CONFIGS.find((candidate) => candidate.id === id);
    if (!config) throw new Error(`Unknown model config "${id}". Run with --list-models.`);
    return [id, config];
  })).values()];
}

function publicConfig(config) {
  return {
    id: config.id,
    provider: config.provider,
    model: config.model,
    ...(config.effort ? { effort: config.effort } : {}),
    pricing: config.pricing,
    ...(config.steadyStatePricing ? { steadyStatePricing: config.steadyStatePricing } : {}),
  };
}

function printSummary(report, outputPath) {
  process.stdout.write("Model | Expected | Decisive | Unsafe | Bug confirm | Bug defer | Fix reject | Input | Output | Cost now\n");
  process.stdout.write("--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:\n");
  for (const summary of report.summaries) {
    process.stdout.write([
      summary.id,
      summary.expectationAccuracy.toFixed(4),
      summary.decisiveAccuracy.toFixed(4),
      summary.unsafeDecisionRate.toFixed(4),
      summary.buggy.confirmationRate.toFixed(4),
      summary.buggy.safeDeferralRate.toFixed(4),
      summary.fixed.rejectionRate.toFixed(4),
      summary.usage.inputTokens,
      summary.usage.outputTokens,
      `$${summary.currentCostUsd.toFixed(4)}`,
    ].join(" | ") + "\n");
  }
  process.stdout.write(`\nEmitter-gap classes: ${report.emitterCoverage.emitterGapClasses.join(", ") || "none"}\n`);
  process.stdout.write(`Source retention: ${report.corpus.sourceRetention}\n`);
  if (report.stoppedReason) process.stdout.write(`Stopped: ${report.stoppedReason}\n`);
  process.stdout.write(`Report: ${outputPath}\n`);
}

function currentCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function defaultOutputPath(generatedAt) {
  return join(".rekon-dev", "evals", `assessment-judgment-${generatedAt.replace(/[:.]/g, "-")}.json`);
}

function isRetryable(error) {
  return error === "timeout" || error === "request-failed" || /^http-(408|409|429|5\d\d)$/.test(error ?? "");
}

function isConfigurationBlocking(error) {
  return error === "missing-api-key" || error === "fetch-unavailable" || error === "unsupported-model";
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
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${flag} must be a positive number.`);
  return parsed;
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

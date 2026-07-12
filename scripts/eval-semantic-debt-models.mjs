#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import {
  buildSemanticDebtJudgmentPrompt,
  coerceDebtConcerns,
  SEMANTIC_DEBT_JUDGMENT_JSON_SCHEMA,
  SEMANTIC_DEBT_PROMPT_VERSION,
} from "../packages/capability-model/dist/index.js";
import {
  createAnthropicLlmProvider,
  createOpenAiResponsesLlmProvider,
} from "../packages/llm-provider/dist/index.js";
import {
  estimateUsageCost,
  PRICING_AS_OF,
  SEMANTIC_DEBT_MODEL_CONFIGS,
  summarizeSemanticDebtRuns,
} from "./lib/semantic-debt-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const corpusLocation = await resolveCorpusLocation(options.corpus ?? process.env.REKON_SEMANTIC_DEBT_EVAL_CORPUS);
const corpusRoot = corpusLocation.root;
const selectedConfigs = selectConfigs(options.models);
const manifest = JSON.parse(await readFile(corpusLocation.manifest, "utf8"));
const cases = manifest.cases.slice(0, options.maxCases ?? manifest.cases.length);

if (options.listModels) {
  for (const config of SEMANTIC_DEBT_MODEL_CONFIGS) {
    process.stdout.write(`${config.id}\t${config.provider}\t${config.model}\t${config.effort ?? "default"}\n`);
  }
  process.exit(0);
}

validateCorpus(manifest, cases);
await Promise.all(cases.map((item) => resolveCorpusCasePath(corpusRoot, item.file)));
if (options.dryRun) {
  process.stdout.write(`${JSON.stringify({
    corpusVersion: manifest.version,
    corpusSource: corpusLocation.source,
    cases: cases.length,
    repeats: options.repeats,
    requests: cases.length * options.repeats * selectedConfigs.length,
    maxCostUsd: options.maxCostUsd,
    models: selectedConfigs.map(publicConfig),
  }, null, 2)}\n`);
  process.exit(0);
}

const providers = {
  openai: createOpenAiResponsesLlmProvider({
    apiKey: process.env.OPENAI_API_KEY,
    timeoutMs: options.timeoutMs,
  }),
  anthropic: createAnthropicLlmProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeoutMs: options.timeoutMs,
  }),
};

const missing = selectedConfigs
  .filter((config) => config.provider === "openai" ? !process.env.OPENAI_API_KEY : !process.env.ANTHROPIC_API_KEY)
  .map((config) => config.id);
if (missing.length > 0) {
  throw new Error(`Missing provider credentials for: ${missing.join(", ")}. Keys must be supplied through the environment.`);
}

const runs = [];
let runningCostUsd = 0;
let stoppedReason;

outer:
for (const config of selectedConfigs) {
  let blockedFailure;
  for (let repeat = 1; repeat <= options.repeats; repeat += 1) {
    for (const item of cases) {
      if (runningCostUsd >= options.maxCostUsd) {
        stoppedReason = `Cost limit reached before ${config.id}/${item.id}/repeat-${repeat}.`;
        break outer;
      }
      if (blockedFailure) {
        runs.push({
          modelConfigId: config.id,
          caseId: item.id,
          repeat,
          expectedDebt: item.expectedDebt,
          status: "skipped",
          error: `blocked-after:${blockedFailure}`,
          providerAttempts: 0,
          latencyMs: 0,
          currentCostUsd: 0,
          steadyStateCostUsd: 0,
        });
        continue;
      }
      const fileText = await readFile(await resolveCorpusCasePath(corpusRoot, item.file), "utf8");
      const prompt = buildSemanticDebtJudgmentPrompt({
        filePath: `eval/${item.file}`,
        fileText,
        language: "typescript",
      });
      process.stderr.write(`[semantic-debt-eval] ${config.id} repeat ${repeat}/${options.repeats}: ${item.id}\n`);
      const startedAt = performance.now();
      const completion = await completeWithRetries(providers[config.provider], {
        task: "policy.debt-judgment",
        schemaName: "SemanticDebtJudgmentResult",
        prompt,
        model: config.model,
        ...(config.effort ? { effort: config.effort } : {}),
        maxOutputTokens: options.maxOutputTokens,
        jsonSchema: SEMANTIC_DEBT_JUDGMENT_JSON_SCHEMA,
      }, options.retries, config.id, item.id);
      const result = completion.result;
      const latencyMs = performance.now() - startedAt;
      if (!result.ok) {
        runs.push({
          modelConfigId: config.id,
          caseId: item.id,
          repeat,
          expectedDebt: item.expectedDebt,
          status: "error",
          error: result.error,
          warnings: result.warnings ?? [],
          providerAttempts: completion.attempts,
          latencyMs,
          currentCostUsd: 0,
          steadyStateCostUsd: 0,
        });
        if (isConfigurationBlocking(result.error)) blockedFailure = result.error;
        continue;
      }
      const concerns = coerceDebtConcerns(result.data);
      const included = concerns.filter((concern) => concern.included && concern.type === "tech_debt");
      const usage = result.usage ?? {};
      const currentCostUsd = estimateUsageCost(usage, config.pricing);
      const steadyStateCostUsd = estimateUsageCost(usage, config.steadyStatePricing ?? config.pricing);
      runningCostUsd += currentCostUsd;
      runs.push({
        modelConfigId: config.id,
        provider: result.provider,
        model: result.model ?? config.model,
        caseId: item.id,
        repeat,
        expectedDebt: item.expectedDebt,
        ...(item.expectedPattern ? { expectedPattern: item.expectedPattern } : {}),
        status: "ok",
        predictedDebt: included.length > 0,
        concernCount: concerns.length,
        concernsByType: Object.fromEntries(
          [...new Set(concerns.map((concern) => concern.type))]
            .sort()
            .map((type) => [type, concerns.filter((concern) => concern.type === type).length]),
        ),
        includedConcerns: included,
        providerAttempts: completion.attempts,
        usage,
        latencyMs,
        currentCostUsd,
        steadyStateCostUsd,
      });
    }
  }
}

const selectedSummary = summarizeSemanticDebtRuns(runs, selectedConfigs);
const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  pricingAsOf: PRICING_AS_OF,
  promptVersion: SEMANTIC_DEBT_PROMPT_VERSION,
  corpus: { version: manifest.version, cases: cases.length, source: corpusLocation.source },
  gitCommit: currentCommit(),
  options: {
    repeats: options.repeats,
    retries: options.retries,
    maxOutputTokens: options.maxOutputTokens,
    timeoutMs: options.timeoutMs,
    maxCostUsd: options.maxCostUsd,
  },
  models: selectedConfigs.map(publicConfig),
  ...(stoppedReason ? { stoppedReason } : {}),
  ...selectedSummary,
  runs,
};

const outputPath = resolve(root, options.output ?? defaultOutputPath(report.generatedAt));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else printSummary(report, outputPath);

if (stoppedReason || report.summaries.some((summary) => summary.failures > 0)) process.exitCode = 1;

function parseArgs(args) {
  const parsed = {
    dryRun: false,
    json: false,
    listModels: false,
    maxCostUsd: 20,
    maxOutputTokens: 1200,
    models: [],
    repeats: 1,
    retries: 2,
    timeoutMs: 120000,
    corpus: undefined,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--list-models") parsed.listModels = true;
    else if (arg === "--models") parsed.models.push(...requiredValue(args, ++index, arg).split(",").filter(Boolean));
    else if (arg === "--repeats") parsed.repeats = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--retries") parsed.retries = nonNegativeInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-cases") parsed.maxCases = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-cost-usd") parsed.maxCostUsd = positiveNumber(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-output-tokens") parsed.maxOutputTokens = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--output") parsed.output = requiredValue(args, ++index, arg);
    else if (arg === "--corpus") parsed.corpus = requiredValue(args, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

async function resolveCorpusLocation(requested) {
  const builtIn = join(root, "tests", "evals", "semantic-debt");
  const candidate = resolve(requested || builtIn);
  const info = await stat(candidate);
  const manifest = info.isDirectory() ? join(candidate, "corpus.json") : candidate;
  const corpusRoot = info.isDirectory() ? candidate : dirname(candidate);
  await stat(manifest);
  return {
    root: await realpath(corpusRoot),
    manifest: await realpath(manifest),
    source: requested ? "external" : "built-in",
  };
}

async function resolveCorpusCasePath(corpusRoot, file) {
  if (typeof file !== "string" || file.length === 0 || isAbsolute(file)) {
    throw new Error("Semantic debt corpus case paths must be relative.");
  }
  const candidate = await realpath(resolve(corpusRoot, file));
  const rel = relative(corpusRoot, candidate);
  if (rel === ".." || rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(rel)) {
    throw new Error(`Semantic debt corpus case escapes the corpus root: ${file}`);
  }
  return candidate;
}

function selectConfigs(ids) {
  if (ids.length === 0 || ids.includes("all")) return [...SEMANTIC_DEBT_MODEL_CONFIGS];
  const selected = ids.map((id) => {
    const config = SEMANTIC_DEBT_MODEL_CONFIGS.find((candidate) => candidate.id === id);
    if (!config) throw new Error(`Unknown model config "${id}". Run with --list-models.`);
    return config;
  });
  return [...new Map(selected.map((config) => [config.id, config])).values()];
}

function validateCorpus(corpus, items) {
  if (corpus.version !== "1.0.0" || !Array.isArray(corpus.cases) || corpus.cases.length === 0) {
    throw new Error("Semantic debt corpus is malformed.");
  }
  const ids = new Set();
  for (const item of items) {
    if (!item || typeof item.id !== "string" || typeof item.file !== "string" || typeof item.expectedDebt !== "boolean") {
      throw new Error("Semantic debt corpus contains an invalid case.");
    }
    if (ids.has(item.id)) throw new Error(`Duplicate semantic debt case id: ${item.id}`);
    ids.add(item.id);
  }
}

function publicConfig(config) {
  return {
    id: config.id,
    provider: config.provider,
    model: config.model,
    ...(config.effort ? { effort: config.effort } : {}),
    pricing: config.pricing,
    ...(config.steadyStatePricing ? { steadyStatePricing: config.steadyStatePricing } : {}),
    ...(config.pricingNote ? { pricingNote: config.pricingNote } : {}),
  };
}

function printSummary(report, outputPath) {
  process.stdout.write("Model | F1 | Precision | Recall | Parse | p50 ms | Input | Output | Reasoning | Cost now | Cost steady\n");
  process.stdout.write("--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:\n");
  for (const summary of report.summaries) {
    process.stdout.write([
      summary.id,
      summary.f1.toFixed(4),
      summary.precision.toFixed(4),
      summary.recall.toFixed(4),
      summary.parseSuccessRate.toFixed(4),
      summary.latencyMs.p50.toFixed(1),
      summary.usage.inputTokens,
      summary.usage.outputTokens,
      summary.usage.reasoningTokens,
      `$${summary.currentCostUsd.toFixed(4)}`,
      `$${summary.steadyStateCostUsd.toFixed(4)}`,
    ].join(" | ") + "\n");
  }
  process.stdout.write(`\nCost/quality frontier: ${report.costQualityFrontier.join(", ") || "none"}\n`);
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
  return join(".rekon-dev", "evals", `semantic-debt-${generatedAt.replace(/[:.]/g, "-")}.json`);
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

async function completeWithRetries(provider, input, retries, modelConfigId, caseId) {
  let result;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    result = await provider.completeJson(input);
    if (result.ok || !isRetryable(result.error) || attempt > retries) return { result, attempts: attempt };
    const delayMs = 1000 * (2 ** (attempt - 1));
    process.stderr.write(`[semantic-debt-eval] retry ${attempt}/${retries} for ${modelConfigId}/${caseId} after ${result.error}\n`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
  }
  return { result, attempts: retries + 1 };
}

function isRetryable(error) {
  return ["timeout", "request-failed", "http-429", "http-500", "http-502", "http-503", "http-529"].includes(error);
}

function isConfigurationBlocking(error) {
  return ["missing-api-key", "fetch-unavailable", "http-400", "http-401", "http-403", "http-404"].includes(error);
}

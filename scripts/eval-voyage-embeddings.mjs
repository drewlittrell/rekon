#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import { createVoyageEmbeddingProvider } from "../packages/llm-provider/dist/index.js";
import {
  estimateEmbeddingCost,
  evaluateRetrieval,
  PRICING_AS_OF,
  summarizeEmbeddingRuns,
  VOYAGE_EMBEDDING_CONFIGS,
} from "./lib/voyage-embedding-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpusPath = join(root, "tests", "evals", "voyage-embeddings", "corpus.json");
const options = parseArgs(process.argv.slice(2));
const configs = selectConfigs(options.models);
const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
validateCorpus(corpus);

if (options.listModels) {
  for (const config of VOYAGE_EMBEDDING_CONFIGS) {
    process.stdout.write(`${config.id}\t${config.documentModel}\t${config.queryModel}\t${config.dimensions}\n`);
  }
  process.exit(0);
}

if (options.dryRun) {
  process.stdout.write(`${JSON.stringify({
    corpusVersion: corpus.version,
    documents: corpus.documents.length,
    queries: corpus.queries.length,
    repeats: options.repeats,
    requests: configs.length * options.repeats * 2,
    models: configs,
  }, null, 2)}\n`);
  process.exit(0);
}

if (!process.env.VOYAGE_API_KEY) {
  throw new Error("VOYAGE_API_KEY is required for the live embedding evaluation.");
}

const runs = [];
let runningCostUsd = 0;
let stoppedReason;

outer:
for (const config of configs) {
  for (let repeat = 1; repeat <= options.repeats; repeat += 1) {
    if (runningCostUsd >= options.maxCostUsd) {
      stoppedReason = `Cost ceiling reached before ${config.id} repeat ${repeat}.`;
      break outer;
    }
    process.stderr.write(`[voyage-eval] ${config.id} repeat ${repeat}/${options.repeats}\n`);
    const documentProvider = createVoyageEmbeddingProvider({
      apiKey: process.env.VOYAGE_API_KEY,
      defaultModel: config.documentModel,
      dimensions: config.dimensions,
      inputType: "document",
      timeoutMs: options.timeoutMs,
    });
    const queryProvider = createVoyageEmbeddingProvider({
      apiKey: process.env.VOYAGE_API_KEY,
      defaultModel: config.queryModel,
      dimensions: config.dimensions,
      inputType: "query",
      timeoutMs: options.timeoutMs,
    });
    const documentStarted = performance.now();
    const documentCompletion = await embedWithRetries(documentProvider, {
      task: "code.embedding",
      texts: corpus.documents.map((document) => `${document.path}\n${document.text}`),
      model: config.documentModel,
      dimensions: config.dimensions,
    }, options.retries);
    const documentLatencyMs = performance.now() - documentStarted;
    if (!documentCompletion.result.ok) {
      runs.push(failedRun(config, repeat, "document", documentCompletion, documentLatencyMs));
      continue;
    }
    const queryStarted = performance.now();
    const queryCompletion = await embedWithRetries(queryProvider, {
      task: "artifact.retrieval",
      texts: corpus.queries.map((query) => query.text),
      model: config.queryModel,
      dimensions: config.dimensions,
    }, options.retries);
    const queryLatencyMs = performance.now() - queryStarted;
    if (!queryCompletion.result.ok) {
      runs.push(failedRun(config, repeat, "query", queryCompletion, documentLatencyMs + queryLatencyMs));
      continue;
    }
    const metrics = evaluateRetrieval(corpus, documentCompletion.result.vectors, queryCompletion.result.vectors);
    const documentTokens = documentCompletion.result.usage?.totalTokens ?? 0;
    const queryTokens = queryCompletion.result.usage?.totalTokens ?? 0;
    const documentCostUsd = estimateEmbeddingCost(documentTokens, config.documentPricePerMillion);
    const queryCostUsd = estimateEmbeddingCost(queryTokens, config.queryPricePerMillion);
    const costUsd = documentCostUsd + queryCostUsd;
    runningCostUsd += costUsd;
    runs.push({
      configId: config.id,
      repeat,
      status: "ok",
      resolvedModels: {
        document: documentCompletion.result.model ?? config.documentModel,
        query: queryCompletion.result.model ?? config.queryModel,
      },
      attempts: { document: documentCompletion.attempts, query: queryCompletion.attempts },
      usage: { documentTokens, queryTokens, totalTokens: documentTokens + queryTokens },
      costUsd,
      latencyMs: {
        document: documentLatencyMs,
        query: queryLatencyMs,
        total: documentLatencyMs + queryLatencyMs,
      },
      metrics,
    });
  }
}

const summary = summarizeEmbeddingRuns(runs, configs);
const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  pricingAsOf: PRICING_AS_OF,
  corpus: { version: corpus.version, documents: corpus.documents.length, queries: corpus.queries.length },
  gitCommit: currentCommit(),
  options: { repeats: options.repeats, retries: options.retries, timeoutMs: options.timeoutMs, maxCostUsd: options.maxCostUsd },
  configs,
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

function parseArgs(args) {
  const parsed = { dryRun: false, json: false, listModels: false, maxCostUsd: 2, models: [], repeats: 3, retries: 2, timeoutMs: 120000 };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--list-models") parsed.listModels = true;
    else if (arg === "--models") parsed.models.push(...requiredValue(args, ++index, arg).split(",").filter(Boolean));
    else if (arg === "--repeats") parsed.repeats = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--retries") parsed.retries = nonNegativeInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--max-cost-usd") parsed.maxCostUsd = positiveNumber(requiredValue(args, ++index, arg), arg);
    else if (arg === "--output") parsed.output = requiredValue(args, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function selectConfigs(ids) {
  if (ids.length === 0) return [...VOYAGE_EMBEDDING_CONFIGS];
  return ids.map((id) => {
    const config = VOYAGE_EMBEDDING_CONFIGS.find((candidate) => candidate.id === id);
    if (!config) throw new Error(`Unknown model configuration: ${id}`);
    return config;
  });
}

function validateCorpus(value) {
  if (!value || !Array.isArray(value.documents) || !Array.isArray(value.queries) || value.documents.length === 0 || value.queries.length === 0) {
    throw new Error("Voyage embedding corpus must include documents and queries.");
  }
  const ids = new Set(value.documents.map((document) => document.id));
  for (const query of value.queries) {
    if (!Array.isArray(query.relevant) || query.relevant.length === 0 || query.relevant.some((id) => !ids.has(id))) {
      throw new Error(`Query ${query.id ?? "unknown"} has invalid relevant document ids.`);
    }
  }
}

async function embedWithRetries(provider, input, retries) {
  let result;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    result = await provider.embed(input);
    if (result.ok || !isRetryable(result.error)) return { result, attempts: attempt };
    await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 250));
  }
  return { result, attempts: retries + 1 };
}

function isRetryable(error) {
  return error === "timeout" || error === "request-failed" || /^http-(429|5\d\d)$/.test(error);
}

function failedRun(config, repeat, stage, completion, latencyMs) {
  return {
    configId: config.id,
    repeat,
    status: "error",
    stage,
    error: completion.result.error,
    warnings: completion.result.warnings ?? [],
    attempts: completion.attempts,
    usage: { documentTokens: 0, queryTokens: 0, totalTokens: 0 },
    costUsd: 0,
    latencyMs: { document: stage === "document" ? latencyMs : 0, query: stage === "query" ? latencyMs : 0, total: latencyMs },
  };
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

function currentCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function defaultOutputPath(generatedAt) {
  return join(".rekon-dev", "evals", `voyage-embeddings-${generatedAt.replace(/[:.]/g, "-")}.json`);
}

function printSummary(report, outputPath) {
  process.stdout.write("Voyage embedding evaluation\n");
  for (const entry of report.summaries) {
    process.stdout.write(
      `${entry.id}: nDCG@5=${entry.ndcgAt5.toFixed(4)} MRR=${entry.mrr.toFixed(4)} R@3=${entry.recallAt3.toFixed(4)} stable=${entry.stableQueryRate.toFixed(4)} cost=$${entry.costUsd.toFixed(6)} p95=${entry.latencyMs.p95.toFixed(1)}ms\n`,
    );
  }
  process.stdout.write(`Frontier: ${report.costQualityFrontier.join(", ")}\n`);
  process.stdout.write(`Report: ${outputPath}\n`);
}

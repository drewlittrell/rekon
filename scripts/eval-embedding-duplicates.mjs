#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createVoyageEmbeddingProvider } from "../packages/llm-provider/dist/index.js";
import {
  estimateEmbeddingCost,
  PRICING_AS_OF,
  VOYAGE_EMBEDDING_CONFIGS,
} from "./lib/voyage-embedding-eval.mjs";
import {
  evaluateDuplicatePairs,
  PRODUCTION_DUPLICATE_THRESHOLD,
  summarizeDuplicateRuns,
} from "./lib/embedding-duplicate-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const configs = selectConfigs(options.models);
const corpus = JSON.parse(await readFile(join(root, "tests/evals/embedding-duplicates/corpus.json"), "utf8"));
validateCorpus(corpus);

if (options.dryRun) {
  process.stdout.write(`${JSON.stringify({
    corpusVersion: corpus.version,
    pairs: corpus.pairs.length,
    positivePairs: corpus.pairs.filter((pair) => pair.expectedDuplicate).length,
    negativePairs: corpus.pairs.filter((pair) => !pair.expectedDuplicate).length,
    threshold: options.threshold,
    repeats: options.repeats,
    requests: configs.length * options.repeats,
    models: configs,
  }, null, 2)}\n`);
  process.exit(0);
}
if (!process.env.VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY is required for the live duplicate-pair evaluation.");

const texts = corpus.pairs.flatMap((pair) => [pair.left, pair.right]);
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
    const provider = createVoyageEmbeddingProvider({
      apiKey: process.env.VOYAGE_API_KEY,
      defaultModel: config.documentModel,
      dimensions: config.dimensions,
      inputType: "document",
      timeoutMs: options.timeoutMs,
    });
    const result = await provider.embed({
      task: "plan.similarity",
      texts,
      model: config.documentModel,
      dimensions: config.dimensions,
    });
    if (!result.ok) {
      runs.push({ configId: config.id, repeat, status: "error", error: result.error, totalTokens: 0, costUsd: 0 });
      continue;
    }
    const totalTokens = result.usage?.totalTokens ?? 0;
    const costUsd = estimateEmbeddingCost(totalTokens, config.documentPricePerMillion);
    runningCostUsd += costUsd;
    runs.push({
      configId: config.id,
      repeat,
      status: "ok",
      resolvedModel: result.model ?? config.documentModel,
      totalTokens,
      costUsd,
      metrics: evaluateDuplicatePairs(corpus, result.vectors, options.threshold),
    });
  }
}

const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  pricingAsOf: PRICING_AS_OF,
  gitCommit: currentCommit(),
  corpus: { version: corpus.version, pairs: corpus.pairs.length },
  threshold: options.threshold,
  configs,
  ...(stoppedReason ? { stoppedReason } : {}),
  summaries: summarizeDuplicateRuns(runs, configs),
  runs,
};
const outputPath = resolve(root, options.output ?? join(".rekon-dev/evals", `embedding-duplicates-${report.generatedAt.replace(/[:.]/g, "-")}.json`));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else {
  for (const summary of report.summaries) {
    process.stdout.write(`${summary.id}: F1=${summary.f1.toFixed(4)} precision=${summary.precision.toFixed(4)} recall=${summary.recall.toFixed(4)} stable=${summary.stablePairRate.toFixed(4)} cost=$${summary.costUsd.toFixed(6)}\n`);
  }
  process.stdout.write(`Report: ${outputPath}\n`);
}
if (stoppedReason || report.summaries.some((summary) => summary.failures > 0)) process.exitCode = 1;

function parseArgs(args) {
  const parsed = { dryRun: false, json: false, maxCostUsd: 1, models: [], output: undefined, repeats: 3, threshold: PRODUCTION_DUPLICATE_THRESHOLD, timeoutMs: 120000 };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = () => {
      const next = args[++index];
      if (!next || next.startsWith("--")) throw new Error(`${arg} requires a value.`);
      return next;
    };
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--models") parsed.models.push(...value().split(",").filter(Boolean));
    else if (arg === "--repeats") parsed.repeats = positive(value(), arg);
    else if (arg === "--threshold") parsed.threshold = bounded(value(), arg);
    else if (arg === "--max-cost-usd") parsed.maxCostUsd = positiveNumber(value(), arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = positive(value(), arg);
    else if (arg === "--output") parsed.output = value();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function selectConfigs(ids) {
  const requested = ids.length > 0 ? ids : ["voyage-4@512", "voyage-4-lite@512"];
  return requested.map((id) => {
    const config = VOYAGE_EMBEDDING_CONFIGS.find((candidate) => candidate.id === id);
    if (!config) throw new Error(`Unknown model configuration: ${id}`);
    return config;
  });
}

function validateCorpus(value) {
  if (value?.version !== "1.0.0" || !Array.isArray(value.pairs) || value.pairs.length === 0) throw new Error("Duplicate corpus is malformed.");
  const ids = new Set();
  for (const pair of value.pairs) {
    if (!pair || typeof pair.id !== "string" || ids.has(pair.id) || typeof pair.left !== "string" || typeof pair.right !== "string" || typeof pair.expectedDuplicate !== "boolean") {
      throw new Error("Duplicate corpus contains an invalid or repeated pair.");
    }
    ids.add(pair.id);
  }
  if (!value.pairs.some((pair) => pair.expectedDuplicate) || !value.pairs.some((pair) => !pair.expectedDuplicate)) {
    throw new Error("Duplicate corpus requires positive and negative labels.");
  }
}

function positive(value, flag) { const parsed = Number.parseInt(value, 10); if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} must be positive.`); return parsed; }
function positiveNumber(value, flag) { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${flag} must be positive.`); return parsed; }
function bounded(value, flag) { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < -1 || parsed > 1) throw new Error(`${flag} must be between -1 and 1.`); return parsed; }
function currentCommit() { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { return "unknown"; } }

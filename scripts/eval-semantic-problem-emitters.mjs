#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import { buildSemanticFileUnderstandingReport } from "../packages/capability-model/dist/index.js";
import {
  SEMANTIC_CACHE_INTEGRITY_RULE_ID,
  SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
  evaluateSemanticFileCandidates,
} from "../packages/capability-policy/dist/index.js";
import {
  SEMANTIC_FILE_UNDERSTANDING_JSON_SCHEMA,
  buildSemanticFileUnderstandingPrompt,
} from "../packages/cli/dist/semantic-file-understanding.js";
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
  assessmentOverlapsChangedLines,
  changedLineNumbers,
} from "./lib/semantic-problem-emitter-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const catalog = JSON.parse(await readFile(join(root, "tests/bench/public-defect-pairs.sources.json"), "utf8"));
const problemRules = new Map([
  ["dependency-resolution", SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID],
  ["cache-integrity", SEMANTIC_CACHE_INTEGRITY_RULE_ID],
]);
const requestedPairs = new Set(options.pairs);
const selectedPairs = catalog.pairs.filter((pair) =>
  problemRules.has(pair.claim.category)
  && (requestedPairs.size === 0 || requestedPairs.has(pair.id)));
const missingPairs = [...requestedPairs].filter((id) => !selectedPairs.some((pair) => pair.id === id));
if (missingPairs.length > 0) throw new Error(`Unknown supported pair ids: ${missingPairs.join(", ")}.`);
const config = SEMANTIC_DEBT_MODEL_CONFIGS.find((candidate) => candidate.id === options.model);
if (!config) throw new Error(`Unknown model config "${options.model}".`);

if (options.dryRun) {
  process.stdout.write(`${JSON.stringify({
    model: publicConfig(config),
    pairs: selectedPairs.map((pair) => ({ id: pair.id, problemClass: pair.claim.category })),
    requests: selectedPairs.reduce((total, pair) => total + (pair.affectedPaths.length * 2), 0),
    sourceRetention: "none",
  }, null, 2)}\n`);
  process.exit(0);
}

const apiKey = config.provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error(`Missing ${config.provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"}.`);
const provider = config.provider === "openai"
  ? createOpenAiResponsesLlmProvider({ apiKey, timeoutMs: options.timeoutMs })
  : createAnthropicLlmProvider({ apiKey, timeoutMs: options.timeoutMs });
const repositories = new Map(catalog.repositories.map((repository) => [repository.id, repository]));
const runs = [];

for (const pair of selectedPairs) {
  const repository = repositories.get(pair.repository);
  if (!repository) throw new Error(`Unknown repository ${pair.repository} for ${pair.id}.`);
  for (const revision of ["buggy", "fixed"]) {
    const commit = revision === "buggy" ? pair.buggyCommit : pair.fixedCommit;
    const counterpartCommit = revision === "buggy" ? pair.fixedCommit : pair.buggyCommit;
    for (const path of pair.affectedPaths) {
      process.stderr.write(`[semantic-problem-emitter-eval] ${pair.id}:${revision}:${path}\n`);
      const [text, counterpartText] = await Promise.all([
        fetchText(rawGitHubUrl(repository.url, commit, path), options.timeoutMs),
        fetchText(rawGitHubUrl(repository.url, counterpartCommit, path), options.timeoutMs),
      ]);
      const changedLines = changedLineNumbers(text, counterpartText);
      const sha256 = createHash("sha256").update(text).digest("hex");
      const prompt = buildSemanticFileUnderstandingPrompt({ filePath: path, fileText: text, language: "typescript" });
      const startedAt = performance.now();
      const result = await provider.completeJson({
        task: "artifact.summary",
        schemaName: "SemanticFileUnderstandingResult",
        prompt,
        model: config.model,
        ...(config.effort ? { effort: config.effort } : {}),
        maxOutputTokens: options.maxOutputTokens,
        jsonSchema: SEMANTIC_FILE_UNDERSTANDING_JSON_SCHEMA,
      });
      const latencyMs = performance.now() - startedAt;
      if (!result.ok) {
        runs.push({
          pairId: pair.id,
          revision,
          path,
          problemClass: pair.claim.category,
          status: "error",
          error: result.error,
          latencyMs,
          currentCostUsd: 0,
        });
        continue;
      }

      const data = result.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data : {};
      const report = await buildSemanticFileUnderstandingReport({
        filePath: path,
        fileText: text,
        fileSha256: sha256,
        semanticMode: "required",
        semanticUnderstanding: async () => ({
          ...data,
          provider: result.provider,
          model: result.model ?? config.model,
          warnings: result.warnings ?? [],
        }),
      });
      const reportRef = {
        type: "SemanticFileUnderstandingReport",
        id: report.header.artifactId,
        schemaVersion: report.header.schemaVersion,
      };
      const assessments = evaluateSemanticFileCandidates(report, reportRef, { path, text, sha256 });
      const ruleId = problemRules.get(pair.claim.category);
      const matching = assessments.filter((assessment) => assessment.ruleId === ruleId);
      const defectMatching = matching.filter((assessment) => assessmentOverlapsChangedLines(assessment, changedLines));
      const usage = result.usage ?? {};
      runs.push({
        pairId: pair.id,
        revision,
        path,
        problemClass: pair.claim.category,
        status: "ok",
        classCandidateEmitted: matching.length > 0,
        defectEmitted: defectMatching.length > 0,
        matchingAssessments: matching.length,
        defectMatchingAssessments: defectMatching.length,
        changedLineCount: changedLines.size,
        sourceEvidenceCount: matching.reduce(
          (total, assessment) => total + (Array.isArray(assessment.details?.sourceEvidence) ? assessment.details.sourceEvidence.length : 0),
          0,
        ),
        provider: result.provider,
        model: result.model ?? config.model,
        usage,
        latencyMs,
        currentCostUsd: estimateUsageCost(usage, config.pricing),
      });
    }
  }
}

const pairs = selectedPairs.map((pair) => {
  const pairRuns = runs.filter((run) => run.pairId === pair.id && run.status === "ok");
  const buggyEmitted = pairRuns.some((run) => run.revision === "buggy" && run.defectEmitted);
  const fixedEmitted = pairRuns.some((run) => run.revision === "fixed" && run.defectEmitted);
  return {
    pairId: pair.id,
    problemClass: pair.claim.category,
    buggyEmitted,
    fixedEmitted,
    passed: buggyEmitted && !fixedEmitted,
  };
});
const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  gitCommit: currentCommit(),
  pricingAsOf: PRICING_AS_OF,
  sourceRetention: "none",
  model: publicConfig(config),
  summary: {
    pairs: pairs.length,
    passed: pairs.filter((pair) => pair.passed).length,
    failed: pairs.filter((pair) => !pair.passed).length,
    errors: runs.filter((run) => run.status === "error").length,
    currentCostUsd: round(runs.reduce((total, run) => total + (run.currentCostUsd ?? 0), 0)),
  },
  pairs,
  runs,
};
const outputPath = resolve(root, options.output ?? defaultOutputPath(report.generatedAt));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else {
  for (const pair of pairs) {
    process.stdout.write(`${pair.problemClass}: buggy=${pair.buggyEmitted} fixed=${pair.fixedEmitted} passed=${pair.passed}\n`);
  }
  process.stdout.write(`Cost: $${report.summary.currentCostUsd.toFixed(6)}\n`);
  process.stdout.write(`Source retention: ${report.sourceRetention}\n`);
  process.stdout.write(`Report: ${outputPath}\n`);
}
if (report.summary.failed > 0 || report.summary.errors > 0) process.exitCode = 1;

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Unable to fetch ${url}: HTTP ${response.status}.`);
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

function rawGitHubUrl(repositoryUrl, commit, path) {
  const parsed = new URL(repositoryUrl);
  const repository = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "");
  return `https://raw.githubusercontent.com/${repository}/${commit}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function parseArgs(args) {
  const parsed = {
    dryRun: false,
    json: false,
    maxOutputTokens: 2000,
    model: "gpt-5.6-luna@low",
    pairs: [],
    timeoutMs: 120000,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--model") parsed.model = requiredValue(args, ++index, arg);
    else if (arg === "--pair") parsed.pairs.push(requiredValue(args, ++index, arg));
    else if (arg === "--max-output-tokens") parsed.maxOutputTokens = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = positiveInteger(requiredValue(args, ++index, arg), arg);
    else if (arg === "--output") parsed.output = requiredValue(args, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
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

function currentCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function defaultOutputPath(generatedAt) {
  return join(".rekon-dev", "evals", `semantic-problem-emitters-${generatedAt.replace(/[:.]/g, "-")}.json`);
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";
import test from "node:test";

import { SEMANTIC_DEBT_JUDGMENT_JSON_SCHEMA } from "../../packages/capability-model/dist/index.js";

import {
  estimateUsageCost,
  SEMANTIC_DEBT_MODEL_CONFIGS,
  summarizeSemanticDebtRuns,
} from "../../scripts/lib/semantic-debt-eval.mjs";

const root = resolve(new URL("../..", import.meta.url).pathname);

test("production semantic-debt schema requires a strict concerns payload", () => {
  assert.equal(SEMANTIC_DEBT_JUDGMENT_JSON_SCHEMA.additionalProperties, false);
  assert.deepEqual(SEMANTIC_DEBT_JUDGMENT_JSON_SCHEMA.required, ["concerns"]);
  assert.equal(SEMANTIC_DEBT_JUDGMENT_JSON_SCHEMA.properties.concerns.items.additionalProperties, false);
});

test("OpenAI token cost separates cache classes included in total input", () => {
  const cost = estimateUsageCost(
    {
      inputTokens: 1000,
      cachedInputTokens: 400,
      cacheWriteInputTokens: 200,
      outputTokens: 300,
    },
    { input: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 10, inputIncludesCacheTokens: true },
  );
  assert.equal(cost, 0.00438);
});

test("GPT-5.6 Luna prices cache writes at 1.25 times uncached input", () => {
  const luna = SEMANTIC_DEBT_MODEL_CONFIGS.find((config) => config.id === "gpt-5.6-luna@low");
  assert.equal(luna.pricing.input, 1);
  assert.equal(luna.pricing.cacheWriteInput, 1.25);
});

test("Anthropic token cost adds separately reported cache classes", () => {
  const cost = estimateUsageCost(
    {
      inputTokens: 1000,
      cachedInputTokens: 400,
      cacheWriteInputTokens: 200,
      outputTokens: 300,
    },
    { input: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 10, inputIncludesCacheTokens: false },
  );
  assert.equal(cost, 0.00558);
});

test("summary reports quality, stability, usage, and a cost-quality frontier", () => {
  const configs = SEMANTIC_DEBT_MODEL_CONFIGS.slice(0, 2);
  const runs = [
    run(configs[0].id, "positive", true, true, 0.001),
    run(configs[0].id, "negative", false, false, 0.001),
    run(configs[1].id, "positive", true, true, 0.002),
    run(configs[1].id, "negative", false, true, 0.002),
  ];
  const report = summarizeSemanticDebtRuns(runs, configs);
  assert.equal(report.summaries[0].f1, 1);
  assert.equal(report.summaries[0].stableCaseRate, 1);
  assert.equal(report.summaries[0].usage.inputTokens, 20);
  assert.equal(report.summaries[1].precision, 0.5);
  assert.deepEqual(report.costQualityFrontier, [configs[0].id]);
});

test("frontier excludes a high-scoring model below the completion threshold", () => {
  const configs = SEMANTIC_DEBT_MODEL_CONFIGS.slice(0, 2);
  const runs = [
    run(configs[0].id, "positive", true, true, 0.001),
    run(configs[0].id, "negative", false, false, 0.001),
    run(configs[1].id, "positive", true, true, 0.002),
    { ...run(configs[1].id, "negative", false, false, 0), status: "error", error: "http-400" },
  ];
  const report = summarizeSemanticDebtRuns(runs, configs);
  assert.equal(report.summaries[1].parseSuccessRate, 0.5);
  assert.deepEqual(report.costQualityFrontier, [configs[0].id]);
});

test("dry run validates the corpus and selected model without provider credentials", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-semantic-debt-models.mjs",
    "--dry-run",
    "--models",
    "gpt-5.4-nano@none",
    "--repeats",
    "2",
  ], { cwd: root, encoding: "utf8", env: {} });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.cases, 18);
  assert.equal(payload.requests, 36);
  assert.equal(payload.models[0].id, "gpt-5.4-nano@none");
});

test("dry run accepts an external labeled corpus without exposing its path", async () => {
  const corpusRoot = await mkdtemp(join(tmpdir(), "rekon-private-semantic-eval-"));
  try {
    await mkdir(join(corpusRoot, "cases"), { recursive: true });
    await writeFile(join(corpusRoot, "cases", "one.ts"), "export const one = 1;\n", "utf8");
    await writeFile(join(corpusRoot, "corpus.json"), JSON.stringify({
      version: "1.0.0",
      cases: [{ id: "private-one", file: "cases/one.ts", expectedDebt: false }],
    }), "utf8");
    const result = spawnSync(process.execPath, [
      "scripts/eval-semantic-debt-models.mjs",
      "--dry-run",
      "--corpus",
      corpusRoot,
      "--models",
      "gpt-5.4-nano@none",
    ], { cwd: root, encoding: "utf8", env: {} });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes(corpusRoot), false);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.corpusSource, "external");
    assert.equal(payload.cases, 1);
  } finally {
    await rm(corpusRoot, { recursive: true, force: true });
  }
});

function run(modelConfigId, caseId, expectedDebt, predictedDebt, currentCostUsd) {
  return {
    modelConfigId,
    caseId,
    repeat: 1,
    expectedDebt,
    predictedDebt,
    status: "ok",
    latencyMs: 10,
    usage: { inputTokens: 10, outputTokens: 2 },
    currentCostUsd,
    steadyStateCostUsd: currentCostUsd,
  };
}

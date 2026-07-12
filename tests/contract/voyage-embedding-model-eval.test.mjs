import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

import {
  estimateEmbeddingCost,
  evaluateRetrieval,
  summarizeEmbeddingRuns,
  VOYAGE_EMBEDDING_CONFIGS,
} from "../../scripts/lib/voyage-embedding-eval.mjs";

const root = resolve(new URL("../..", import.meta.url).pathname);

test("retrieval metrics reward relevant documents at the top", () => {
  const corpus = {
    documents: [{ id: "a" }, { id: "b" }, { id: "c" }],
    queries: [{ id: "q", relevant: ["a"] }],
  };
  const metrics = evaluateRetrieval(corpus, [[1, 0], [0, 1], [-1, 0]], [[1, 0]]);
  assert.equal(metrics.top1Accuracy, 1);
  assert.equal(metrics.mrr, 1);
  assert.equal(metrics.ndcgAt5, 1);
  assert.equal(metrics.rows[0].topDocumentId, "a");
});

test("embedding cost uses provider token totals", () => {
  assert.equal(estimateEmbeddingCost(50_000, 0.06), 0.003);
});

test("summary reports stability, quality, storage, and frontier", () => {
  const configs = VOYAGE_EMBEDDING_CONFIGS.slice(0, 2);
  const metrics = {
    top1Accuracy: 1,
    mrr: 1,
    recallAt3: 1,
    recallAt5: 1,
    ndcgAt5: 1,
    meanScoreMargin: 0.2,
    rows: [{ queryId: "q", topDocumentId: "a" }],
  };
  const runs = configs.map((config, index) => ({
    configId: config.id,
    repeat: 1,
    status: "ok",
    metrics,
    usage: { totalTokens: 100 },
    costUsd: index === 0 ? 0.01 : 0.001,
    latencyMs: { total: 10 },
  }));
  const report = summarizeEmbeddingRuns(runs, configs);
  assert.equal(report.summaries[0].stableQueryRate, 1);
  assert.equal(report.summaries[0].vectorBytesPerDocument, 4096);
  assert.deepEqual(report.costQualityFrontier, [configs[1].id]);
});

test("dry run validates the corpus and selected profile without credentials", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-voyage-embeddings.mjs",
    "--dry-run",
    "--models",
    "voyage-4@1024",
    "--repeats",
    "2",
  ], { cwd: root, encoding: "utf8", env: {} });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.documents, 18);
  assert.equal(payload.queries, 14);
  assert.equal(payload.requests, 4);
  assert.equal(payload.models[0].id, "voyage-4@1024");
});

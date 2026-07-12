import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

import {
  evaluateDuplicatePairs,
  PRODUCTION_DUPLICATE_THRESHOLD,
  summarizeDuplicateRuns,
} from "../../scripts/lib/embedding-duplicate-eval.mjs";

const root = resolve(new URL("../..", import.meta.url).pathname);

test("duplicate pair metrics distinguish labels at the production threshold", () => {
  const corpus = {
    pairs: [
      { id: "same", expectedDuplicate: true },
      { id: "different", expectedDuplicate: false },
    ],
  };
  const metrics = evaluateDuplicatePairs(corpus, [[1, 0], [0.99, 0.01], [1, 0], [0, 1]]);
  assert.equal(metrics.threshold, PRODUCTION_DUPLICATE_THRESHOLD);
  assert.equal(metrics.f1, 1);
  assert.equal(metrics.confusion.truePositive, 1);
  assert.equal(metrics.confusion.trueNegative, 1);
  assert.ok(metrics.positiveMean > metrics.negativeMean);
});

test("duplicate summary reports stability, token cost, and label quality", () => {
  const config = { id: "fixture", documentModel: "fixture", dimensions: 2 };
  const metrics = {
    precision: 1,
    recall: 0.5,
    f1: 2 / 3,
    accuracy: 0.75,
    positiveMean: 0.98,
    negativeMean: 0.4,
    rows: [{ id: "pair", predictedDuplicate: true }],
  };
  const summaries = summarizeDuplicateRuns([
    { configId: "fixture", status: "ok", metrics, totalTokens: 10, costUsd: 0.001 },
    { configId: "fixture", status: "ok", metrics, totalTokens: 12, costUsd: 0.002 },
  ], [config]);
  assert.equal(summaries[0].stablePairRate, 1);
  assert.equal(summaries[0].totalTokens, 22);
  assert.equal(summaries[0].costUsd, 0.003);
  assert.equal(summaries[0].separation, 0.58);
});

test("duplicate eval dry run validates balanced labeled pairs without credentials", () => {
  const result = spawnSync(process.execPath, [
    "scripts/eval-embedding-duplicates.mjs",
    "--dry-run",
    "--models",
    "voyage-4@512",
    "--repeats",
    "2",
  ], { cwd: root, encoding: "utf8", env: {} });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.pairs, 12);
  assert.equal(payload.positivePairs, 6);
  assert.equal(payload.negativePairs, 6);
  assert.equal(payload.requests, 2);
  assert.equal(payload.threshold, 0.95);
});

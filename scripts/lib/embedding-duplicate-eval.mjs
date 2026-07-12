import { cosineSimilarity } from "./voyage-embedding-eval.mjs";

export const PRODUCTION_DUPLICATE_THRESHOLD = 0.95;

export function evaluateDuplicatePairs(corpus, vectors, threshold = PRODUCTION_DUPLICATE_THRESHOLD) {
  if (!corpus || !Array.isArray(corpus.pairs) || vectors.length !== corpus.pairs.length * 2) {
    throw new Error("Duplicate-pair vector count does not match the corpus.");
  }
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  const rows = corpus.pairs.map((pair, index) => {
    const score = cosineSimilarity(vectors[index * 2], vectors[index * 2 + 1]);
    const predictedDuplicate = score >= threshold;
    if (pair.expectedDuplicate && predictedDuplicate) truePositive += 1;
    else if (!pair.expectedDuplicate && !predictedDuplicate) trueNegative += 1;
    else if (!pair.expectedDuplicate && predictedDuplicate) falsePositive += 1;
    else falseNegative += 1;
    return { id: pair.id, expectedDuplicate: pair.expectedDuplicate, predictedDuplicate, score };
  });
  const precision = ratio(truePositive, truePositive + falsePositive);
  const recall = ratio(truePositive, truePositive + falseNegative);
  return {
    threshold,
    confusion: { truePositive, trueNegative, falsePositive, falseNegative },
    precision,
    recall,
    f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
    accuracy: ratio(truePositive + trueNegative, rows.length),
    positiveMean: mean(rows.filter((row) => row.expectedDuplicate).map((row) => row.score)),
    negativeMean: mean(rows.filter((row) => !row.expectedDuplicate).map((row) => row.score)),
    rows,
  };
}

export function summarizeDuplicateRuns(runs, configs) {
  return configs.flatMap((config) => {
    const selected = runs.filter((run) => run.configId === config.id);
    if (selected.length === 0) return [];
    const successful = selected.filter((run) => run.status === "ok");
    const predictions = new Map();
    for (const run of successful) {
      for (const row of run.metrics.rows) {
        if (!predictions.has(row.id)) predictions.set(row.id, []);
        predictions.get(row.id).push(row.predictedDuplicate);
      }
    }
    const stable = [...predictions.values()].filter((values) => new Set(values).size === 1).length;
    return [{
      id: config.id,
      model: config.documentModel,
      dimensions: config.dimensions,
      attempts: selected.length,
      successes: successful.length,
      failures: selected.length - successful.length,
      precision: rounded(mean(successful.map((run) => run.metrics.precision))),
      recall: rounded(mean(successful.map((run) => run.metrics.recall))),
      f1: rounded(mean(successful.map((run) => run.metrics.f1))),
      accuracy: rounded(mean(successful.map((run) => run.metrics.accuracy))),
      separation: rounded(mean(successful.map((run) => run.metrics.positiveMean - run.metrics.negativeMean))),
      stablePairRate: rounded(predictions.size > 0 ? stable / predictions.size : 0),
      totalTokens: sum(successful.map((run) => run.totalTokens)),
      costUsd: rounded(sum(successful.map((run) => run.costUsd)), 8),
    }];
  });
}

function ratio(left, right) { return right > 0 ? left / right : 0; }
function sum(values) { return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0); }
function mean(values) { return values.length > 0 ? sum(values) / values.length : 0; }
function rounded(value, places = 6) {
  const factor = 10 ** places;
  return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
}

export const PRICING_AS_OF = "2026-07-10";

export const VOYAGE_EMBEDDING_CONFIGS = Object.freeze([
  profile("voyage-code-3@1024", "voyage-code-3", "voyage-code-3", 1024, 0.18, 0.18),
  profile("voyage-code-3@512", "voyage-code-3", "voyage-code-3", 512, 0.18, 0.18),
  profile("voyage-4-lite@1024", "voyage-4-lite", "voyage-4-lite", 1024, 0.02, 0.02),
  profile("voyage-4-lite@512", "voyage-4-lite", "voyage-4-lite", 512, 0.02, 0.02),
  profile("voyage-4@1024", "voyage-4", "voyage-4", 1024, 0.06, 0.06),
  profile("voyage-4-large@1024", "voyage-4-large", "voyage-4-large", 1024, 0.12, 0.12),
  profile("voyage-4-large+lite@1024", "voyage-4-large", "voyage-4-lite", 1024, 0.12, 0.02),
  profile("voyage-4-large+voyage-4@1024", "voyage-4-large", "voyage-4", 1024, 0.12, 0.06),
  profile("voyage-4@512", "voyage-4", "voyage-4", 512, 0.06, 0.06),
  profile("voyage-4-large+lite@512", "voyage-4-large", "voyage-4-lite", 512, 0.12, 0.02),
]);

function profile(id, documentModel, queryModel, dimensions, documentPricePerMillion, queryPricePerMillion) {
  return { id, documentModel, queryModel, dimensions, documentPricePerMillion, queryPricePerMillion };
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = Number(left[index] ?? 0);
    const b = Number(right[index] ?? 0);
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  return leftNorm > 0 && rightNorm > 0 ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
}

export function evaluateRetrieval(corpus, documentVectors, queryVectors) {
  if (documentVectors.length !== corpus.documents.length || queryVectors.length !== corpus.queries.length) {
    throw new Error("Embedding vector count does not match the evaluation corpus.");
  }
  const rows = corpus.queries.map((query, queryIndex) => {
    const relevant = new Set(query.relevant);
    const ranking = corpus.documents
      .map((document, documentIndex) => ({
        documentId: document.id,
        score: cosineSimilarity(queryVectors[queryIndex], documentVectors[documentIndex]),
      }))
      .sort((left, right) => right.score - left.score || left.documentId.localeCompare(right.documentId));
    const firstRelevantRank = ranking.findIndex((entry) => relevant.has(entry.documentId)) + 1;
    const recallAt = (limit) => ranking.slice(0, limit).filter((entry) => relevant.has(entry.documentId)).length / relevant.size;
    const dcg = ranking.slice(0, 5).reduce(
      (total, entry, index) => total + (relevant.has(entry.documentId) ? 1 / Math.log2(index + 2) : 0),
      0,
    );
    const idealDcg = Array.from({ length: Math.min(5, relevant.size) }).reduce(
      (total, _entry, index) => total + 1 / Math.log2(index + 2),
      0,
    );
    const bestRelevant = Math.max(...ranking.filter((entry) => relevant.has(entry.documentId)).map((entry) => entry.score));
    const bestIrrelevant = Math.max(...ranking.filter((entry) => !relevant.has(entry.documentId)).map((entry) => entry.score));
    return {
      queryId: query.id,
      topDocumentId: ranking[0]?.documentId,
      firstRelevantRank,
      reciprocalRank: firstRelevantRank > 0 ? 1 / firstRelevantRank : 0,
      recallAt1: recallAt(1),
      recallAt3: recallAt(3),
      recallAt5: recallAt(5),
      ndcgAt5: idealDcg > 0 ? dcg / idealDcg : 0,
      scoreMargin: bestRelevant - bestIrrelevant,
      ranking: ranking.slice(0, 5),
    };
  });
  return {
    top1Accuracy: mean(rows.map((row) => row.firstRelevantRank === 1 ? 1 : 0)),
    mrr: mean(rows.map((row) => row.reciprocalRank)),
    recallAt1: mean(rows.map((row) => row.recallAt1)),
    recallAt3: mean(rows.map((row) => row.recallAt3)),
    recallAt5: mean(rows.map((row) => row.recallAt5)),
    ndcgAt5: mean(rows.map((row) => row.ndcgAt5)),
    meanScoreMargin: mean(rows.map((row) => row.scoreMargin)),
    rows,
  };
}

export function estimateEmbeddingCost(totalTokens, pricePerMillion) {
  return (finite(totalTokens) * finite(pricePerMillion)) / 1_000_000;
}

export function summarizeEmbeddingRuns(runs, configs = VOYAGE_EMBEDDING_CONFIGS) {
  const summaries = configs.flatMap((config) => {
    const selected = runs.filter((run) => run.configId === config.id);
    if (selected.length === 0) return [];
    const successful = selected.filter((run) => run.status === "ok");
    const topByQuery = new Map();
    for (const run of successful) {
      for (const row of run.metrics.rows) {
        if (!topByQuery.has(row.queryId)) topByQuery.set(row.queryId, []);
        topByQuery.get(row.queryId).push(row.topDocumentId);
      }
    }
    const stableQueries = [...topByQuery.values()].filter((values) => new Set(values).size === 1).length;
    const totalCostUsd = sum(successful.map((run) => run.costUsd));
    const latencies = successful.map((run) => run.latencyMs.total).sort((a, b) => a - b);
    return [{
      ...config,
      attempts: selected.length,
      successes: successful.length,
      failures: selected.length - successful.length,
      top1Accuracy: rounded(mean(successful.map((run) => run.metrics.top1Accuracy))),
      mrr: rounded(mean(successful.map((run) => run.metrics.mrr))),
      recallAt3: rounded(mean(successful.map((run) => run.metrics.recallAt3))),
      recallAt5: rounded(mean(successful.map((run) => run.metrics.recallAt5))),
      ndcgAt5: rounded(mean(successful.map((run) => run.metrics.ndcgAt5))),
      meanScoreMargin: rounded(mean(successful.map((run) => run.metrics.meanScoreMargin))),
      stableQueryRate: rounded(topByQuery.size > 0 ? stableQueries / topByQuery.size : 0),
      totalTokens: sum(successful.map((run) => run.usage.totalTokens)),
      costUsd: rounded(totalCostUsd, 8),
      costPerRunUsd: rounded(successful.length > 0 ? totalCostUsd / successful.length : 0, 8),
      latencyMs: {
        p50: rounded(percentile(latencies, 0.5), 1),
        p95: rounded(percentile(latencies, 0.95), 1),
      },
      vectorBytesPerDocument: config.dimensions * 4,
    }];
  });
  return { summaries, costQualityFrontier: costQualityFrontier(summaries) };
}

export function costQualityFrontier(summaries) {
  return summaries
    .filter((candidate) => candidate.successes > 0)
    .filter((candidate) => !summaries.some((other) => {
      if (other.id === candidate.id || other.successes === 0) return false;
      const noWorse = other.ndcgAt5 >= candidate.ndcgAt5
        && other.mrr >= candidate.mrr
        && other.recallAt3 >= candidate.recallAt3
        && other.costPerRunUsd <= candidate.costPerRunUsd
        && other.vectorBytesPerDocument <= candidate.vectorBytesPerDocument;
      const better = other.ndcgAt5 > candidate.ndcgAt5
        || other.mrr > candidate.mrr
        || other.recallAt3 > candidate.recallAt3
        || other.costPerRunUsd < candidate.costPerRunUsd
        || other.vectorBytesPerDocument < candidate.vectorBytesPerDocument;
      return noWorse && better;
    }))
    .map((summary) => summary.id);
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mean(values) {
  return values.length > 0 ? sum(values) / values.length : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + finite(value), 0);
}

function percentile(sorted, quantile) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * quantile) - 1));
  return sorted[index] ?? 0;
}

function rounded(value, places = 6) {
  const factor = 10 ** places;
  return Math.round(finite(value) * factor) / factor;
}

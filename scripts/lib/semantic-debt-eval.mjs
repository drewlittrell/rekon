export const PRICING_AS_OF = "2026-07-15";
export const MIN_FRONTIER_PARSE_SUCCESS = 0.99;

const openAi = (input, cachedInput, output, cacheWriteInput = input) => ({
  input,
  cachedInput,
  output,
  cacheWriteInput,
  inputIncludesCacheTokens: true,
});
const anthropic = (input, cachedInput, cacheWriteInput, output) => ({
  input,
  cachedInput,
  cacheWriteInput,
  output,
  inputIncludesCacheTokens: false,
});

export const SEMANTIC_DEBT_MODEL_CONFIGS = Object.freeze([
  {
    id: "gpt-4o-mini",
    provider: "openai",
    model: "gpt-4o-mini",
    pricing: openAi(0.15, 0.075, 0.6),
  },
  {
    id: "gpt-5.4-nano@none",
    provider: "openai",
    model: "gpt-5.4-nano",
    effort: "none",
    pricing: openAi(0.2, 0.02, 1.25),
  },
  {
    id: "gpt-5.4-nano@low",
    provider: "openai",
    model: "gpt-5.4-nano",
    effort: "low",
    pricing: openAi(0.2, 0.02, 1.25),
  },
  {
    id: "gpt-5.4-mini@low",
    provider: "openai",
    model: "gpt-5.4-mini",
    effort: "low",
    pricing: openAi(0.75, 0.075, 4.5),
  },
  {
    id: "gpt-5.6-luna@low",
    provider: "openai",
    model: "gpt-5.6-luna",
    effort: "low",
    pricing: openAi(1, 0.1, 6, 1.25),
  },
  {
    id: "gpt-5.6-terra@low",
    provider: "openai",
    model: "gpt-5.6-terra",
    effort: "low",
    pricing: openAi(2.5, 0.25, 15),
  },
  {
    id: "claude-haiku-4.5",
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    pricing: anthropic(1, 0.1, 1.25, 5),
  },
  {
    id: "claude-sonnet-5@low",
    provider: "anthropic",
    model: "claude-sonnet-5",
    effort: "low",
    pricing: anthropic(2, 0.2, 2.5, 10),
    steadyStatePricing: anthropic(3, 0.3, 3.75, 15),
    pricingNote: "Introductory pricing ends 2026-08-31.",
  },
  {
    id: "claude-opus-4.8@low",
    provider: "anthropic",
    model: "claude-opus-4-8",
    effort: "low",
    pricing: anthropic(5, 0.5, 6.25, 25),
  },
]);

export function estimateUsageCost(usage = {}, pricing) {
  if (!pricing) return 0;
  const input = finite(usage.inputTokens);
  const cached = finite(usage.cachedInputTokens);
  const cacheWrite = finite(usage.cacheWriteInputTokens);
  const uncached = pricing.inputIncludesCacheTokens
    ? Math.max(0, input - cached - cacheWrite)
    : input;
  const output = finite(usage.outputTokens);
  return (
    uncached * pricing.input
    + cached * pricing.cachedInput
    + cacheWrite * pricing.cacheWriteInput
    + output * pricing.output
  ) / 1_000_000;
}

export function summarizeSemanticDebtRuns(runs, configs = SEMANTIC_DEBT_MODEL_CONFIGS) {
  const byModel = new Map(configs.map((config) => [config.id, []]));
  for (const run of runs) {
    if (!byModel.has(run.modelConfigId)) byModel.set(run.modelConfigId, []);
    byModel.get(run.modelConfigId).push(run);
  }

  const summaries = [];
  for (const config of configs) {
    const modelRuns = byModel.get(config.id) ?? [];
    if (modelRuns.length === 0) continue;
    const successful = modelRuns.filter((run) => run.status === "ok");
    let truePositive = 0;
    let trueNegative = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    for (const run of successful) {
      if (run.expectedDebt && run.predictedDebt) truePositive += 1;
      else if (!run.expectedDebt && !run.predictedDebt) trueNegative += 1;
      else if (!run.expectedDebt && run.predictedDebt) falsePositive += 1;
      else falseNegative += 1;
    }
    const precision = ratio(truePositive, truePositive + falsePositive);
    const recall = ratio(truePositive, truePositive + falseNegative);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    const correct = truePositive + trueNegative;
    const currentCostUsd = sum(modelRuns.map((run) => finite(run.currentCostUsd)));
    const steadyStateCostUsd = sum(modelRuns.map((run) => finite(run.steadyStateCostUsd)));
    const latencies = successful.map((run) => finite(run.latencyMs)).sort((left, right) => left - right);
    const usage = sumUsage(successful.map((run) => run.usage));
    summaries.push({
      id: config.id,
      provider: config.provider,
      model: config.model,
      ...(config.effort ? { effort: config.effort } : {}),
      attempts: modelRuns.length,
      successes: successful.length,
      failures: modelRuns.length - successful.length,
      parseSuccessRate: round(ratio(successful.length, modelRuns.length)),
      confusion: { truePositive, trueNegative, falsePositive, falseNegative },
      accuracy: round(ratio(correct, successful.length)),
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
      stableCaseRate: round(stableCaseRate(successful)),
      latencyMs: {
        p50: round(percentile(latencies, 0.5), 1),
        p95: round(percentile(latencies, 0.95), 1),
      },
      usage,
      currentCostUsd: round(currentCostUsd, 6),
      steadyStateCostUsd: round(steadyStateCostUsd || currentCostUsd, 6),
      costPerAttemptUsd: round(ratio(currentCostUsd, modelRuns.length), 6),
      costPerCorrectUsd: round(ratio(currentCostUsd, correct), 6),
    });
  }

  return {
    summaries,
    costQualityFrontier: costQualityFrontier(summaries),
  };
}

export function costQualityFrontier(summaries) {
  return summaries
    .filter((candidate) => candidate.successes > 0 && candidate.parseSuccessRate >= MIN_FRONTIER_PARSE_SUCCESS)
    .filter((candidate) =>
      !summaries.some((other) => {
        if (
          other.id === candidate.id
          || other.successes === 0
          || other.parseSuccessRate < MIN_FRONTIER_PARSE_SUCCESS
        ) return false;
        const noWorse =
          other.f1 >= candidate.f1
          && other.parseSuccessRate >= candidate.parseSuccessRate
          && other.stableCaseRate >= candidate.stableCaseRate
          && other.costPerAttemptUsd <= candidate.costPerAttemptUsd;
        const strictlyBetter =
          other.f1 > candidate.f1
          || other.parseSuccessRate > candidate.parseSuccessRate
          || other.stableCaseRate > candidate.stableCaseRate
          || other.costPerAttemptUsd < candidate.costPerAttemptUsd;
        return noWorse && strictlyBetter;
      }),
    )
    .map((summary) => summary.id);
}

function sumUsage(usages) {
  const total = {
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
  };
  for (const usage of usages) {
    if (!usage) continue;
    for (const key of Object.keys(total)) total[key] += finite(usage[key]);
  }
  return total;
}

function stableCaseRate(runs) {
  if (runs.length === 0) return 0;
  const byCase = new Map();
  for (const run of runs) {
    if (!byCase.has(run.caseId)) byCase.set(run.caseId, []);
    byCase.get(run.caseId).push(run.predictedDebt);
  }
  let stable = 0;
  for (const predictions of byCase.values()) {
    if (new Set(predictions).size === 1) stable += 1;
  }
  return ratio(stable, byCase.size);
}

function percentile(sorted, quantile) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * quantile) - 1));
  return sorted[index];
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + finite(value), 0);
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function round(value, places = 4) {
  const scale = 10 ** places;
  return Math.round((finite(value) + Number.EPSILON) * scale) / scale;
}

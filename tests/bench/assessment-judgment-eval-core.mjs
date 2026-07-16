export const DEFAULT_ASSESSMENT_JUDGMENT_MODEL_IDS = Object.freeze([
  "gpt-5.6-luna@low",
  "claude-sonnet-5@low",
]);

const EMITTER_BACKED_RULES = Object.freeze({
  "vite-ssr-switch-scope": "semantic.scopeResolution",
  "nest-shutdown-cleanup-completeness": "semantic.cleanupCompleteness",
  "nest-import-first-match": "semantic.dependencyResolution",
  "playwright-compilation-cache-integrity": "semantic.cacheIntegrity",
  "playwright-abort-reason-propagation": "semantic.errorPropagation",
  "redux-toolkit-pre-pending-abort": "semantic.errorPropagation",
  "pnpm-publish-otp-propagation": "semantic.optionPropagation",
  "fastify-keep-alive-meta-leak": "semantic.resourceLifetime",
  "vitest-typecheck-worker-off": "events.inverseListenerDelegation",
  "nextjs-cache-handler-name-validation": "validation.partialAllowlistMatch",
  "docker-modem-request-timeout-listener-leak": "semantic.resourceLifetime",
});

export function buildAssessmentJudgmentEvalCases(catalog, adjudications, selectedPairIds = []) {
  validateCatalog(catalog);
  validateAdjudications(adjudications);
  const repositories = new Map(catalog.repositories.map((repository) => [repository.id, repository]));
  const judgments = new Map(adjudications.records.map((record) => [record.pairId, record]));
  const selected = new Set(selectedPairIds);
  const pairs = catalog.pairs.filter((pair) => selected.size === 0 || selected.has(pair.id));
  if (selected.size > 0) {
    const missing = [...selected].filter((id) => !catalog.pairs.some((pair) => pair.id === id));
    if (missing.length > 0) throw new Error(`Unknown defect-pair ids: ${missing.join(", ")}`);
  }

  return pairs.flatMap((pair) => {
    const repository = repositories.get(pair.repository);
    const adjudication = judgments.get(pair.id);
    if (!repository) throw new Error(`Defect pair ${pair.id} references unknown repository ${pair.repository}.`);
    if (!adjudication) throw new Error(`Defect pair ${pair.id} has no adjudication.`);
    if (adjudication.claimVerdict !== "valid") return [];

    const ruleId = EMITTER_BACKED_RULES[pair.id] ?? "semantic.problemCandidate";
    const emitterCoverage = adjudication.coverage === "captured" ? "detector-backed" : "emitter-gap";
    const sourcePaths = [...new Set([...pair.affectedPaths, ...(pair.evidencePaths ?? [])])].slice(0, 2);
    const assessment = {
      id: `assessment-judgment-eval:${pair.id}`,
      kind: emitterCoverage === "detector-backed" ? "risk" : "semantic_claim",
      type: ruleId,
      impact: "high",
      title: pair.claim.summary,
      description: pair.upstream.summary,
      subjects: sourcePaths,
      files: sourcePaths,
      ruleId,
      suggestedAction: "Determine whether the cited source still exhibits the upstream defect.",
      evidence: [{ type: "DefectPairClaim", id: pair.id, schemaVersion: catalog.version }],
      rootCauseKey: `defect-pair:${pair.id}`,
      confidence: {
        score: emitterCoverage === "detector-backed" ? 0.8 : 0.65,
        basis: emitterCoverage === "detector-backed" ? "deterministic" : "semantic",
        verification: "unverified",
        rationale: "Pinned upstream defect used for assessment-judgment calibration.",
      },
      details: {
        category: pair.claim.category,
        proof: pair.claim.proof,
        emitterCoverage,
      },
    };
    const shared = {
      pairId: pair.id,
      candidateClass: pair.claim.category,
      emitterCoverage,
      buggyCommit: pair.buggyCommit,
      fixedCommit: pair.fixedCommit,
      repository: {
        id: repository.id,
        url: repository.url,
      },
      paths: sourcePaths,
      assessment,
    };
    return [
      {
        ...shared,
        id: `${pair.id}:buggy`,
        revision: "buggy",
        commit: pair.buggyCommit,
        counterpartCommit: pair.fixedCommit,
        expectedDisposition: "retain",
      },
      {
        ...shared,
        id: `${pair.id}:fixed`,
        revision: "fixed",
        commit: pair.fixedCommit,
        counterpartCommit: pair.buggyCommit,
        expectedDisposition: "reject",
      },
    ];
  });
}

export function sourceChangeAnchor(currentText, counterpartText) {
  const currentLines = currentText.split(/\r?\n/u);
  const counterpartLines = counterpartText.split(/\r?\n/u);
  const sharedLength = Math.min(currentLines.length, counterpartLines.length);
  let prefix = 0;
  while (prefix < sharedLength && currentLines[prefix] === counterpartLines[prefix]) prefix += 1;
  if (prefix === currentLines.length && prefix === counterpartLines.length) return undefined;
  return Math.max(1, Math.min(currentLines.length, prefix + 1));
}

export function summarizeAssessmentJudgmentRuns(runs, modelConfigs) {
  const summaries = modelConfigs.map((config) => summarizeModel(
    config,
    runs.filter((run) => run.modelConfigId === config.id),
  ));
  const emitterGapClasses = [...new Set(
    runs
      .filter((run) => run.emitterCoverage === "emitter-gap")
      .map((run) => run.candidateClass),
  )].sort();
  return {
    summaries,
    emitterCoverage: {
      detectorBackedClasses: uniqueClasses(runs, "detector-backed"),
      emitterGapClasses,
      emitterGapClassCount: emitterGapClasses.length,
    },
  };
}

function summarizeModel(config, runs) {
  const successful = runs.filter((run) => run.status === "ok");
  const buggy = successful.filter((run) => run.revision === "buggy");
  const fixed = successful.filter((run) => run.revision === "fixed");
  const decisive = successful.filter((run) => run.verdict === "confirmed" || run.verdict === "rejected");
  const acceptable = successful.filter((run) => isAcceptable(run));
  const unsafe = successful.filter((run) => isUnsafe(run));
  const usage = sumUsage(successful.map((run) => run.usage));
  const currentCostUsd = sum(successful.map((run) => run.currentCostUsd));
  const steadyStateCostUsd = sum(successful.map((run) => run.steadyStateCostUsd));
  const classes = [...new Set(successful.map((run) => run.candidateClass))].sort().map((candidateClass) => {
    const classRuns = successful.filter((run) => run.candidateClass === candidateClass);
    return {
      candidateClass,
      emitterCoverage: classRuns[0]?.emitterCoverage,
      buggyVerdict: classRuns.find((run) => run.revision === "buggy")?.verdict,
      fixedVerdict: classRuns.find((run) => run.revision === "fixed")?.verdict,
      acceptable: classRuns.filter((run) => isAcceptable(run)).length,
      total: classRuns.length,
    };
  });

  return {
    id: config.id,
    provider: config.provider,
    model: config.model,
    ...(config.effort ? { effort: config.effort } : {}),
    cases: runs.length,
    successful: successful.length,
    failures: runs.length - successful.length,
    expectationAccuracy: round(ratio(acceptable.length, successful.length)),
    decisiveAccuracy: round(ratio(
      decisive.filter((run) =>
        (run.revision === "buggy" && run.verdict === "confirmed")
        || (run.revision === "fixed" && run.verdict === "rejected")).length,
      decisive.length,
    )),
    unsafeDecisionRate: round(ratio(unsafe.length, successful.length)),
    buggy: {
      total: buggy.length,
      confirmationRate: round(ratio(countVerdict(buggy, "confirmed"), buggy.length)),
      safeDeferralRate: round(ratio(countVerdict(buggy, "verification_required"), buggy.length)),
      insufficientEvidenceRate: round(ratio(countVerdict(buggy, "insufficient_evidence"), buggy.length)),
      incorrectRejectionRate: round(ratio(countVerdict(buggy, "rejected"), buggy.length)),
    },
    fixed: {
      total: fixed.length,
      rejectionRate: round(ratio(countVerdict(fixed, "rejected"), fixed.length)),
      unresolvedRate: round(ratio(
        fixed.filter((run) => run.verdict === "verification_required" || run.verdict === "insufficient_evidence").length,
        fixed.length,
      )),
      incorrectConfirmationRate: round(ratio(countVerdict(fixed, "confirmed"), fixed.length)),
    },
    verdicts: Object.fromEntries(
      ["confirmed", "rejected", "verification_required", "insufficient_evidence", "failed"]
        .map((verdict) => [verdict, countVerdict(successful, verdict)]),
    ),
    usage,
    averageUsage: {
      inputTokens: round(ratio(usage.inputTokens, successful.length), 1),
      outputTokens: round(ratio(usage.outputTokens, successful.length), 1),
      reasoningTokens: round(ratio(usage.reasoningTokens, successful.length), 1),
    },
    latencyMs: percentileSummary(successful.map((run) => run.latencyMs)),
    currentCostUsd: round(currentCostUsd, 6),
    steadyStateCostUsd: round(steadyStateCostUsd, 6),
    costPerAcceptableUsd: round(ratio(currentCostUsd, acceptable.length), 6),
    classes,
  };
}

function isAcceptable(run) {
  return run.revision === "buggy"
    ? run.verdict === "confirmed" || run.verdict === "verification_required"
    : run.verdict === "rejected";
}

function isUnsafe(run) {
  return (run.revision === "buggy" && run.verdict === "rejected")
    || (run.revision === "fixed" && run.verdict === "confirmed");
}

function uniqueClasses(runs, coverage) {
  return [...new Set(runs.filter((run) => run.emitterCoverage === coverage).map((run) => run.candidateClass))].sort();
}

function countVerdict(runs, verdict) {
  return runs.filter((run) => run.verdict === verdict).length;
}

function sumUsage(usages) {
  const total = { inputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
  for (const usage of usages) {
    for (const key of Object.keys(total)) total[key] += finite(usage?.[key]);
  }
  return total;
}

function percentileSummary(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  return {
    p50: round(percentile(sorted, 0.5), 1),
    p95: round(percentile(sorted, 0.95), 1),
  };
}

function percentile(sorted, quantile) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * quantile))];
}

function validateCatalog(catalog) {
  if (catalog?.version !== "1.0.0" || !Array.isArray(catalog.repositories) || !Array.isArray(catalog.pairs)) {
    throw new Error("Assessment-judgment defect-pair catalog is malformed.");
  }
}

function validateAdjudications(adjudications) {
  if (adjudications?.schemaVersion !== "1.0.0" || !Array.isArray(adjudications.records)) {
    throw new Error("Assessment-judgment adjudications are malformed.");
  }
}

function finite(value) {
  return Number.isFinite(value) ? value : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + finite(value), 0);
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import { buildSemanticFileUnderstandingReport } from "../packages/capability-model/dist/index.js";
import {
  extractCacheContractEvidence,
  extractCleanupCompletenessEvidence,
  extractDependencyResolutionEvidence,
  extractErrorControlFlowEvidence,
  extractOptionPropagationEvidence,
  extractScopeResolutionEvidence,
  extractResourceLifetimeEvidence,
} from "../packages/capability-js-ts/dist/index.js";
import {
  SEMANTIC_CACHE_INTEGRITY_RULE_ID,
  SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
  SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
  SEMANTIC_ERROR_PROPAGATION_RULE_ID,
  SEMANTIC_OPTION_PROPAGATION_RULE_ID,
  SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
  SEMANTIC_RESOURCE_LIFETIME_RULE_ID,
  evaluateCacheIntegritySignals,
  evaluateCleanupCompletenessSignals,
  evaluateDependencyResolutionSignals,
  evaluateErrorPropagationSignals,
  evaluateResourceLifetimeSignals,
  evaluateSemanticFileCandidates,
} from "../packages/capability-policy/dist/index.js";
import {
  SEMANTIC_FILE_UNDERSTANDING_JSON_SCHEMA,
  buildSemanticFileUnderstandingPrompt,
} from "../packages/cli/dist/semantic-file-understanding.js";
import {
  ASSESSMENT_JUDGMENT_JSON_SCHEMA,
  buildAssessmentJudgmentPrompt,
  coerceAssessmentJudgment,
} from "../packages/cli/dist/assessment-judgment.js";
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
  MIN_DEFECT_EVIDENCE_CHANGED_LINE_COVERAGE,
  assessmentChangedLineCoverage,
  assessmentMatchesDefectEvidence,
  assessmentOverlapsChangedLines,
  changedLineNumbers,
  summarizePairEmission,
} from "./lib/semantic-problem-emitter-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const catalog = JSON.parse(await readFile(join(root, "tests/bench/public-defect-pairs.sources.json"), "utf8"));
const problemRules = new Map([
  ["dependency-resolution", SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID],
  ["cache-integrity", SEMANTIC_CACHE_INTEGRITY_RULE_ID],
  ["cleanup-completeness", SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID],
  ["error-propagation", SEMANTIC_ERROR_PROPAGATION_RULE_ID],
  ["option-propagation", SEMANTIC_OPTION_PROPAGATION_RULE_ID],
  ["scope-resolution", SEMANTIC_SCOPE_RESOLUTION_RULE_ID],
  ["resource-lifetime", SEMANTIC_RESOURCE_LIFETIME_RULE_ID],
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
  if (pair.claim.category === "dependency-resolution") {
    runs.push(...await evaluateDependencyResolutionPair(pair, repository));
    continue;
  }
  if (pair.claim.category === "cache-integrity" && pair.structuredEvidence === "cache-contract") {
    runs.push(...await evaluateCacheContractPair(pair, repository));
    continue;
  }
  if (pair.claim.category === "cleanup-completeness" && pair.structuredEvidence === "cleanup-contract") {
    runs.push(...await evaluateCleanupContractPair(pair, repository));
    continue;
  }
  if (pair.claim.category === "error-propagation") {
    runs.push(...await evaluateErrorPropagationPair(pair, repository));
    continue;
  }
  if (pair.claim.category === "resource-lifetime") {
    runs.push(...await evaluateResourceLifetimePair(pair, repository));
    continue;
  }
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
      const errorControlFlow = extractErrorControlFlowEvidence({ path, content: text });
      const optionPropagation = extractOptionPropagationEvidence({ path, content: text });
      const scopeResolution = extractScopeResolutionEvidence({ path, content: text });
      const prompt = buildSemanticFileUnderstandingPrompt({
        filePath: path,
        fileText: text,
        language: "typescript",
        errorControlFlow,
        optionPropagation,
        scopeResolution,
      });
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
      const defectMatching = matching.filter((assessment) => assessmentMatchesDefectEvidence({
        assessment,
        changedLines,
        problemClass: pair.claim.category,
        errorControlFlow,
        scopeResolution,
      }));
      const judgmentResults = [];
      for (const assessment of defectMatching) {
        const judgmentCompletion = await provider.completeJson({
          task: "policy.assessment-judgment",
          schemaName: "AssessmentJudgmentResult",
          prompt: buildAssessmentJudgmentPrompt({
            assessment,
            sources: [{ path, text, sha256 }],
            maxSourceChars: 24000,
          }),
          model: config.model,
          ...(config.effort ? { effort: config.effort } : {}),
          maxOutputTokens: Math.min(options.maxOutputTokens, 1200),
          jsonSchema: ASSESSMENT_JUDGMENT_JSON_SCHEMA,
        });
        if (!judgmentCompletion.ok) {
          judgmentResults.push({
            verdict: "failed",
            confidence: 0,
            evidenceCount: 0,
            usage: {},
            error: judgmentCompletion.error,
          });
          continue;
        }
        const judgment = coerceAssessmentJudgment({
          assessment,
          sources: [{ path, text, sha256 }],
          result: judgmentCompletion.data && typeof judgmentCompletion.data === "object"
            ? judgmentCompletion.data
            : undefined,
        });
        judgmentResults.push({
          verdict: judgment.verdict,
          confidence: judgment.confidence,
          evidenceCount: judgment.evidence.length,
          usage: judgmentCompletion.usage ?? {},
        });
      }
      const emitterUsage = result.usage ?? {};
      const judgmentUsage = sumUsage(judgmentResults.map((entry) => entry.usage));
      const usage = sumUsage([emitterUsage, judgmentUsage]);
      const defectRetained = judgmentResults.some(
        (entry) => entry.verdict === "confirmed" || entry.verdict === "verification_required",
      );
      const defectCleared = defectMatching.length === 0
        || (judgmentResults.length === defectMatching.length
          && judgmentResults.every((entry) => entry.verdict === "rejected"));
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
        defectRetained,
        defectCleared,
        judgments: judgmentResults.map(({ verdict, confidence, evidenceCount, error }) => ({
          verdict,
          confidence,
          evidenceCount,
          ...(error ? { error } : {}),
        })),
        changedLineCount: changedLines.size,
        sourceEvidenceCount: matching.reduce(
          (total, assessment) => total + (Array.isArray(assessment.details?.sourceEvidence) ? assessment.details.sourceEvidence.length : 0),
          0,
        ),
        candidateMetadata: matching.map((assessment) => ({
          findingId: assessment.details?.reportFindingId,
          changedLineCoverage: assessmentChangedLineCoverage(assessment, changedLines),
          structuredAnchorMatch: assessmentMatchesDefectEvidence({
            assessment,
            changedLines,
            problemClass: pair.claim.category,
            errorControlFlow,
            scopeResolution,
          }) && assessmentChangedLineCoverage(assessment, changedLines)
            < MIN_DEFECT_EVIDENCE_CHANGED_LINE_COVERAGE,
          evidenceLines: Array.isArray(assessment.details?.sourceEvidence)
            ? assessment.details.sourceEvidence.map((entry) => ({
              lineStart: entry.lineStart,
              lineEnd: entry.lineEnd,
              changedLineOverlap: assessmentOverlapsChangedLines(
                { details: { sourceEvidence: [entry] } },
                changedLines,
              ),
            }))
            : [],
        })),
        provider: result.provider,
        model: result.model ?? config.model,
        usage,
        latencyMs,
        currentCostUsd: estimateUsageCost(usage, config.pricing),
      });
    }
  }
}

const pairs = selectedPairs.map((pair) => summarizePairEmission(pair, runs));
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
    errors: runs.filter((run) =>
      run.status === "error" || run.judgments?.some((judgment) => judgment.verdict === "failed")).length,
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
    process.stdout.write(
      `${pair.problemClass}: buggy=${pair.buggyEmitted} retained=${pair.buggyRetained} `
      + `fixedDefect=${pair.fixedEmitted} fixedSameClass=${pair.fixedSameClassCandidate} `
      + `fixedCleared=${pair.fixedCleared} passed=${pair.passed}\n`,
    );
  }
  process.stdout.write(`Cost: $${report.summary.currentCostUsd.toFixed(6)}\n`);
  process.stdout.write(`Source retention: ${report.sourceRetention}\n`);
  process.stdout.write(`Report: ${outputPath}\n`);
}
if (report.summary.failed > 0 || report.summary.errors > 0) process.exitCode = 1;

async function evaluateDependencyResolutionPair(pair, repository) {
  if (pair.affectedPaths.length !== 1) {
    throw new Error(`${pair.id}: dependency-resolution calibration requires exactly one fix path.`);
  }
  const pairRuns = [];
  const path = pair.affectedPaths[0];
  const evidenceRef = { type: "EvidenceGraph", id: `eval-${pair.id}`, schemaVersion: "0.1.0" };

  for (const revision of ["buggy", "fixed"]) {
    process.stderr.write(`[semantic-problem-emitter-eval] ${pair.id}:${revision}:${path}\n`);
    const commit = revision === "buggy" ? pair.buggyCommit : pair.fixedCommit;
    const counterpartCommit = revision === "buggy" ? pair.fixedCommit : pair.buggyCommit;
    const [text, counterpartText] = await Promise.all([
      fetchText(rawGitHubUrl(repository.url, commit, path), options.timeoutMs),
      fetchText(rawGitHubUrl(repository.url, counterpartCommit, path), options.timeoutMs),
    ]);
    const sha256 = createHash("sha256").update(text).digest("hex");
    const dependencyFlow = extractDependencyResolutionEvidence({ path, content: text });
    const facts = dependencyFlow.map((entry) => ({
      kind: "dependency_flow",
      subject: `${path}:${entry.caller}:${entry.selectedBinding}:${entry.selectionLocation.line}`,
      value: {
        source: path,
        caller: entry.caller,
        selectedBinding: entry.selectedBinding,
        candidateExpression: entry.candidateExpression,
        collectionExpression: entry.collectionExpression,
        exitKind: entry.exitKind,
        ...(entry.exitCondition ? { exitCondition: entry.exitCondition } : {}),
        returnedAfterLoop: entry.returnedAfterLoop,
        selectionLocation: entry.selectionLocation,
        ...(entry.exitLocation ? { exitLocation: entry.exitLocation } : {}),
      },
    }));
    const matching = evaluateDependencyResolutionSignals(facts, evidenceRef);
    const changedLines = changedLineNumbers(text, counterpartText);
    const defectMatching = matching.filter((assessment) => assessmentMatchesDefectEvidence({
      assessment,
      changedLines,
      problemClass: pair.claim.category,
    }));
    const judgmentResults = [];
    for (const assessment of defectMatching) {
      const sources = [{ path, text, sha256 }];
      const judgmentCompletion = await provider.completeJson({
        task: "policy.assessment-judgment",
        schemaName: "AssessmentJudgmentResult",
        prompt: buildAssessmentJudgmentPrompt({ assessment, sources, maxSourceChars: 24000 }),
        model: config.model,
        ...(config.effort ? { effort: config.effort } : {}),
        maxOutputTokens: Math.min(options.maxOutputTokens, 1200),
        jsonSchema: ASSESSMENT_JUDGMENT_JSON_SCHEMA,
      });
      if (!judgmentCompletion.ok) {
        judgmentResults.push({ verdict: "failed", confidence: 0, evidenceCount: 0, usage: {}, error: judgmentCompletion.error });
        continue;
      }
      const judgment = coerceAssessmentJudgment({
        assessment,
        sources,
        result: judgmentCompletion.data && typeof judgmentCompletion.data === "object"
          ? judgmentCompletion.data
          : undefined,
      });
      judgmentResults.push({
        verdict: judgment.verdict,
        confidence: judgment.confidence,
        evidenceCount: judgment.evidence.length,
        usage: judgmentCompletion.usage ?? {},
      });
    }
    const usage = sumUsage(judgmentResults.map((entry) => entry.usage));
    const defectRetained = judgmentResults.some(
      (entry) => entry.verdict === "confirmed" || entry.verdict === "verification_required",
    );
    const defectCleared = defectMatching.length === 0
      || (judgmentResults.length === defectMatching.length
        && judgmentResults.every((entry) => entry.verdict === "rejected"));
    pairRuns.push({
      pairId: pair.id,
      revision,
      path,
      problemClass: pair.claim.category,
      status: "ok",
      classCandidateEmitted: matching.length > 0,
      defectEmitted: defectMatching.length > 0,
      matchingAssessments: matching.length,
      defectMatchingAssessments: defectMatching.length,
      defectRetained,
      defectCleared,
      judgments: judgmentResults.map(({ verdict, confidence, evidenceCount, error }) => ({
        verdict,
        confidence,
        evidenceCount,
        ...(error ? { error } : {}),
      })),
      changedLineCount: changedLines.size,
      sourceEvidenceCount: matching.reduce(
        (total, assessment) => total + (Array.isArray(assessment.details?.sourceEvidence) ? assessment.details.sourceEvidence.length : 0),
        0,
      ),
      candidateMetadata: matching.map((assessment) => ({
        findingId: assessment.id,
        changedLineCoverage: assessmentChangedLineCoverage(assessment, changedLines),
        structuredAnchorMatch: assessmentMatchesDefectEvidence({
          assessment,
          changedLines,
          problemClass: pair.claim.category,
        }),
        evidenceLines: Array.isArray(assessment.details?.sourceEvidence)
          ? assessment.details.sourceEvidence.map((entry) => ({
              path: entry.path,
              lineStart: entry.lineStart,
              lineEnd: entry.lineEnd,
              changedLineOverlap: assessmentOverlapsChangedLines(
                { details: { sourceEvidence: [entry] } },
                changedLines,
              ),
            }))
          : [],
      })),
      provider: config.provider,
      model: config.model,
      usage,
      currentCostUsd: estimateUsageCost(usage, config.pricing),
    });
  }
  return pairRuns;
}

async function evaluateCacheContractPair(pair, repository) {
  if (pair.affectedPaths.length !== 1) {
    throw new Error(`${pair.id}: cache-contract calibration requires exactly one fix path.`);
  }
  const pairRuns = [];
  const path = pair.affectedPaths[0];
  const evidenceRef = { type: "EvidenceGraph", id: `eval-${pair.id}`, schemaVersion: "0.1.0" };

  for (const revision of ["buggy", "fixed"]) {
    process.stderr.write(`[semantic-problem-emitter-eval] ${pair.id}:${revision}:${path}\n`);
    const commit = revision === "buggy" ? pair.buggyCommit : pair.fixedCommit;
    const counterpartCommit = revision === "buggy" ? pair.fixedCommit : pair.buggyCommit;
    const [text, counterpartText] = await Promise.all([
      fetchText(rawGitHubUrl(repository.url, commit, path), options.timeoutMs),
      fetchText(rawGitHubUrl(repository.url, counterpartCommit, path), options.timeoutMs),
    ]);
    const sha256 = createHash("sha256").update(text).digest("hex");
    const cacheFlow = extractCacheContractEvidence({ path, content: text });
    const facts = cacheFlow.map((entry) => ({
      kind: "cache_flow",
      subject: `${path}:${entry.caller}:${entry.cacheBinding}:${entry.location.line}`,
      value: {
        source: path,
        caller: entry.caller,
        factory: entry.factory,
        cacheBinding: entry.cacheBinding,
        keyExpression: entry.keyExpression,
        keyParameters: entry.keyParameters,
        omittedResultParameters: entry.omittedResultParameters,
        guardExpression: entry.guardExpression,
        guardedReturnExpression: entry.guardedReturnExpression,
        fallbackReturnExpression: entry.fallbackReturnExpression,
        location: entry.location,
        guardLocation: entry.guardLocation,
        fallbackLocation: entry.fallbackLocation,
      },
    }));
    const matching = evaluateCacheIntegritySignals(facts, evidenceRef);
    const changedLines = changedLineNumbers(text, counterpartText);
    const defectMatching = matching.filter((assessment) => assessmentMatchesDefectEvidence({
      assessment,
      changedLines,
      problemClass: pair.claim.category,
    }));
    const judgmentResults = [];
    for (const assessment of defectMatching) {
      const sources = [{ path, text, sha256 }];
      const judgmentCompletion = await provider.completeJson({
        task: "policy.assessment-judgment",
        schemaName: "AssessmentJudgmentResult",
        prompt: buildAssessmentJudgmentPrompt({ assessment, sources, maxSourceChars: 24000 }),
        model: config.model,
        ...(config.effort ? { effort: config.effort } : {}),
        maxOutputTokens: Math.min(options.maxOutputTokens, 1200),
        jsonSchema: ASSESSMENT_JUDGMENT_JSON_SCHEMA,
      });
      if (!judgmentCompletion.ok) {
        judgmentResults.push({ verdict: "failed", confidence: 0, evidenceCount: 0, usage: {}, error: judgmentCompletion.error });
        continue;
      }
      const judgment = coerceAssessmentJudgment({
        assessment,
        sources,
        result: judgmentCompletion.data && typeof judgmentCompletion.data === "object"
          ? judgmentCompletion.data
          : undefined,
      });
      judgmentResults.push({
        verdict: judgment.verdict,
        confidence: judgment.confidence,
        evidenceCount: judgment.evidence.length,
        usage: judgmentCompletion.usage ?? {},
      });
    }
    const usage = sumUsage(judgmentResults.map((entry) => entry.usage));
    const defectRetained = judgmentResults.some(
      (entry) => entry.verdict === "confirmed" || entry.verdict === "verification_required",
    );
    const defectCleared = defectMatching.length === 0
      || (judgmentResults.length === defectMatching.length
        && judgmentResults.every((entry) => entry.verdict === "rejected"));
    pairRuns.push({
      pairId: pair.id,
      revision,
      path,
      problemClass: pair.claim.category,
      status: "ok",
      classCandidateEmitted: matching.length > 0,
      defectEmitted: defectMatching.length > 0,
      matchingAssessments: matching.length,
      defectMatchingAssessments: defectMatching.length,
      defectRetained,
      defectCleared,
      judgments: judgmentResults.map(({ verdict, confidence, evidenceCount, error }) => ({
        verdict,
        confidence,
        evidenceCount,
        ...(error ? { error } : {}),
      })),
      changedLineCount: changedLines.size,
      sourceEvidenceCount: matching.reduce(
        (total, assessment) => total + (Array.isArray(assessment.details?.sourceEvidence) ? assessment.details.sourceEvidence.length : 0),
        0,
      ),
      candidateMetadata: matching.map((assessment) => ({
        findingId: assessment.id,
        changedLineCoverage: assessmentChangedLineCoverage(assessment, changedLines),
        structuredAnchorMatch: assessmentMatchesDefectEvidence({
          assessment,
          changedLines,
          problemClass: pair.claim.category,
        }),
        evidenceLines: Array.isArray(assessment.details?.sourceEvidence)
          ? assessment.details.sourceEvidence.map((entry) => ({
              path: entry.path,
              lineStart: entry.lineStart,
              lineEnd: entry.lineEnd,
              changedLineOverlap: assessmentOverlapsChangedLines(
                { details: { sourceEvidence: [entry] } },
                changedLines,
              ),
            }))
          : [],
      })),
      provider: config.provider,
      model: config.model,
      usage,
      currentCostUsd: estimateUsageCost(usage, config.pricing),
    });
  }
  return pairRuns;
}

async function evaluateCleanupContractPair(pair, repository) {
  const pairRuns = [];
  const evidenceRef = { type: "EvidenceGraph", id: `eval-${pair.id}`, schemaVersion: "0.1.0" };

  for (const revision of ["buggy", "fixed"]) {
    const commit = revision === "buggy" ? pair.buggyCommit : pair.fixedCommit;
    const counterpartCommit = revision === "buggy" ? pair.fixedCommit : pair.buggyCommit;
    for (const path of pair.affectedPaths) {
      process.stderr.write(`[semantic-problem-emitter-eval] ${pair.id}:${revision}:${path}\n`);
      const [text, counterpartText] = await Promise.all([
        fetchText(rawGitHubUrl(repository.url, commit, path), options.timeoutMs),
        fetchText(rawGitHubUrl(repository.url, counterpartCommit, path), options.timeoutMs),
      ]);
      const sha256 = createHash("sha256").update(text).digest("hex");
      const cleanupFlow = extractCleanupCompletenessEvidence({ path, content: text });
      const facts = cleanupFlow.map((entry) => ({
        kind: "cleanup_flow",
        subject: `${path}:${entry.caller}:${entry.mechanism}:${entry.location.line}`,
        value: {
          source: path,
          caller: entry.caller,
          mechanism: entry.mechanism,
          obligations: entry.obligations,
          location: entry.location,
          obligationLocations: entry.obligationLocations,
        },
      }));
      const matching = evaluateCleanupCompletenessSignals(facts, evidenceRef);
      const changedLines = changedLineNumbers(text, counterpartText);
      const defectMatching = matching.filter((assessment) => assessmentMatchesDefectEvidence({
        assessment,
        changedLines,
        problemClass: pair.claim.category,
      }));
      const judgmentResults = [];
      for (const assessment of defectMatching) {
        const sources = [{ path, text, sha256 }];
        const judgmentCompletion = await provider.completeJson({
          task: "policy.assessment-judgment",
          schemaName: "AssessmentJudgmentResult",
          prompt: buildAssessmentJudgmentPrompt({ assessment, sources, maxSourceChars: 24000 }),
          model: config.model,
          ...(config.effort ? { effort: config.effort } : {}),
          maxOutputTokens: Math.min(options.maxOutputTokens, 1200),
          jsonSchema: ASSESSMENT_JUDGMENT_JSON_SCHEMA,
        });
        if (!judgmentCompletion.ok) {
          judgmentResults.push({ verdict: "failed", confidence: 0, evidenceCount: 0, usage: {}, error: judgmentCompletion.error });
          continue;
        }
        const judgment = coerceAssessmentJudgment({
          assessment,
          sources,
          result: judgmentCompletion.data && typeof judgmentCompletion.data === "object"
            ? judgmentCompletion.data
            : undefined,
        });
        judgmentResults.push({
          verdict: judgment.verdict,
          confidence: judgment.confidence,
          evidenceCount: judgment.evidence.length,
          usage: judgmentCompletion.usage ?? {},
        });
      }
      const usage = sumUsage(judgmentResults.map((entry) => entry.usage));
      const defectRetained = judgmentResults.some(
        (entry) => entry.verdict === "confirmed" || entry.verdict === "verification_required",
      );
      const defectCleared = defectMatching.length === 0
        || (judgmentResults.length === defectMatching.length
          && judgmentResults.every((entry) => entry.verdict === "rejected"));
      pairRuns.push({
        pairId: pair.id,
        revision,
        path,
        problemClass: pair.claim.category,
        status: "ok",
        classCandidateEmitted: matching.length > 0,
        defectEmitted: defectMatching.length > 0,
        matchingAssessments: matching.length,
        defectMatchingAssessments: defectMatching.length,
        defectRetained,
        defectCleared,
        judgments: judgmentResults.map(({ verdict, confidence, evidenceCount, error }) => ({
          verdict,
          confidence,
          evidenceCount,
          ...(error ? { error } : {}),
        })),
        changedLineCount: changedLines.size,
        sourceEvidenceCount: matching.reduce(
          (total, assessment) => total + (Array.isArray(assessment.details?.sourceEvidence) ? assessment.details.sourceEvidence.length : 0),
          0,
        ),
        candidateMetadata: matching.map((assessment) => ({
          findingId: assessment.id,
          changedLineCoverage: assessmentChangedLineCoverage(assessment, changedLines),
          structuredAnchorMatch: assessmentMatchesDefectEvidence({
            assessment,
            changedLines,
            problemClass: pair.claim.category,
          }),
          evidenceLines: Array.isArray(assessment.details?.sourceEvidence)
            ? assessment.details.sourceEvidence.map((entry) => ({
              path: entry.path,
              lineStart: entry.lineStart,
              lineEnd: entry.lineEnd,
              changedLineOverlap: assessmentOverlapsChangedLines(
                { details: { sourceEvidence: [entry] } },
                changedLines,
              ),
            }))
            : [],
        })),
        provider: config.provider,
        model: config.model,
        usage,
        currentCostUsd: estimateUsageCost(usage, config.pricing),
      });
    }
  }
  return pairRuns;
}

async function evaluateErrorPropagationPair(pair, repository) {
  if (pair.affectedPaths.length !== 1) {
    throw new Error(`${pair.id}: error-propagation calibration requires exactly one fix path.`);
  }
  const pairRuns = [];
  const path = pair.affectedPaths[0];
  const evidenceRef = { type: "EvidenceGraph", id: `eval-${pair.id}`, schemaVersion: "0.1.0" };

  for (const revision of ["buggy", "fixed"]) {
    process.stderr.write(`[semantic-problem-emitter-eval] ${pair.id}:${revision}:${path}\n`);
    const commit = revision === "buggy" ? pair.buggyCommit : pair.fixedCommit;
    const counterpartCommit = revision === "buggy" ? pair.fixedCommit : pair.buggyCommit;
    const [text, counterpartText] = await Promise.all([
      fetchText(rawGitHubUrl(repository.url, commit, path), options.timeoutMs),
      fetchText(rawGitHubUrl(repository.url, counterpartCommit, path), options.timeoutMs),
    ]);
    const sha256 = createHash("sha256").update(text).digest("hex");
    const errorControlFlow = extractErrorControlFlowEvidence({ path, content: text });
    const facts = errorControlFlow.map((entry) => ({
      kind: "error_flow",
      subject: `${path}:${entry.caller}:${entry.action}:${entry.location.line}`,
      value: {
        source: path,
        caller: entry.caller,
        action: entry.action,
        ...(entry.errorName ? { errorName: entry.errorName } : {}),
        ...(entry.errorIdentity ? { errorIdentity: entry.errorIdentity } : {}),
        expressionKind: entry.expressionKind,
        guards: entry.guards,
        identityMappings: entry.identityMappings,
        line: entry.location.line,
        column: entry.location.column,
      },
    }));
    const matching = evaluateErrorPropagationSignals(facts, evidenceRef);
    const changedLines = changedLineNumbers(text, counterpartText);
    const defectMatching = matching.filter((assessment) => assessmentMatchesDefectEvidence({
      assessment,
      changedLines,
      problemClass: pair.claim.category,
      errorControlFlow,
    }));
    const judgmentResults = [];
    for (const assessment of defectMatching) {
      const sources = [{ path, text, sha256 }];
      const judgmentCompletion = await provider.completeJson({
        task: "policy.assessment-judgment",
        schemaName: "AssessmentJudgmentResult",
        prompt: buildAssessmentJudgmentPrompt({
          assessment,
          sources,
          maxSourceChars: 24000,
        }),
        model: config.model,
        ...(config.effort ? { effort: config.effort } : {}),
        maxOutputTokens: Math.min(options.maxOutputTokens, 1200),
        jsonSchema: ASSESSMENT_JUDGMENT_JSON_SCHEMA,
      });
      if (!judgmentCompletion.ok) {
        judgmentResults.push({
          verdict: "failed",
          confidence: 0,
          evidenceCount: 0,
          usage: {},
          error: judgmentCompletion.error,
        });
        continue;
      }
      const judgment = coerceAssessmentJudgment({
        assessment,
        sources,
        result: judgmentCompletion.data && typeof judgmentCompletion.data === "object"
          ? judgmentCompletion.data
          : undefined,
      });
      judgmentResults.push({
        verdict: judgment.verdict,
        confidence: judgment.confidence,
        evidenceCount: judgment.evidence.length,
        usage: judgmentCompletion.usage ?? {},
      });
    }
    const usage = sumUsage(judgmentResults.map((entry) => entry.usage));
    const defectRetained = judgmentResults.some(
      (entry) => entry.verdict === "confirmed" || entry.verdict === "verification_required",
    );
    const defectCleared = defectMatching.length === 0
      || (judgmentResults.length === defectMatching.length
        && judgmentResults.every((entry) => entry.verdict === "rejected"));
    pairRuns.push({
      pairId: pair.id,
      revision,
      path,
      problemClass: pair.claim.category,
      status: "ok",
      classCandidateEmitted: matching.length > 0,
      defectEmitted: defectMatching.length > 0,
      matchingAssessments: matching.length,
      defectMatchingAssessments: defectMatching.length,
      defectRetained,
      defectCleared,
      judgments: judgmentResults.map(({ verdict, confidence, evidenceCount, error }) => ({
        verdict,
        confidence,
        evidenceCount,
        ...(error ? { error } : {}),
      })),
      changedLineCount: changedLines.size,
      sourceEvidenceCount: matching.reduce(
        (total, assessment) => total + (Array.isArray(assessment.details?.sourceEvidence) ? assessment.details.sourceEvidence.length : 0),
        0,
      ),
      candidateMetadata: matching.map((assessment) => ({
        findingId: assessment.id,
        changedLineCoverage: assessmentChangedLineCoverage(assessment, changedLines),
        structuredAnchorMatch: assessmentMatchesDefectEvidence({
          assessment,
          changedLines,
          problemClass: pair.claim.category,
          errorControlFlow,
        }),
        evidenceLines: Array.isArray(assessment.details?.sourceEvidence)
          ? assessment.details.sourceEvidence.map((entry) => ({
              path: entry.path,
              lineStart: entry.lineStart,
              lineEnd: entry.lineEnd,
              changedLineOverlap: assessmentOverlapsChangedLines(
                { details: { sourceEvidence: [entry] } },
                changedLines,
              ),
            }))
          : [],
      })),
      provider: config.provider,
      model: config.model,
      usage,
      currentCostUsd: estimateUsageCost(usage, config.pricing),
    });
  }
  return pairRuns;
}

async function evaluateResourceLifetimePair(pair, repository) {
  if (pair.affectedPaths.length !== 1) {
    throw new Error(`${pair.id}: resource-lifetime calibration requires exactly one fix path.`);
  }
  const pairRuns = [];
  const sourcePaths = [...new Set([...pair.affectedPaths, ...(pair.evidencePaths ?? [])])];
  const primaryPath = pair.affectedPaths[0];
  const evidenceRef = { type: "EvidenceGraph", id: `eval-${pair.id}`, schemaVersion: "0.1.0" };

  for (const revision of ["buggy", "fixed"]) {
    process.stderr.write(`[semantic-problem-emitter-eval] ${pair.id}:${revision}:${sourcePaths.join(",")}\n`);
    const commit = revision === "buggy" ? pair.buggyCommit : pair.fixedCommit;
    const counterpartCommit = revision === "buggy" ? pair.fixedCommit : pair.buggyCommit;
    const sourceRows = await Promise.all(sourcePaths.map(async (path) => {
      const [text, counterpartText] = await Promise.all([
        fetchText(rawGitHubUrl(repository.url, commit, path), options.timeoutMs),
        fetchText(rawGitHubUrl(repository.url, counterpartCommit, path), options.timeoutMs),
      ]);
      return {
        path,
        text,
        counterpartText,
        sha256: createHash("sha256").update(text).digest("hex"),
      };
    }));
    const sourceByPath = new Map(sourceRows.map((source) => [source.path, source]));
    const primary = sourceByPath.get(primaryPath);
    if (!primary) throw new Error(`${pair.id}: missing primary source ${primaryPath}.`);
    const facts = sourceRows.flatMap((source) =>
      extractResourceLifetimeEvidence({ path: source.path, content: source.text }).map((entry) => ({
        kind: "resource_flow",
        subject: `${source.path}:${entry.resource}:${entry.action}:${entry.location.line}`,
        value: {
          source: source.path,
          caller: entry.caller,
          action: entry.action,
          resource: entry.resource,
          target: entry.target,
          ownerKind: entry.ownerKind,
          ...(entry.retainedNames ? { retainedNames: entry.retainedNames } : {}),
          line: entry.location.line,
        },
      })));
    const matching = evaluateResourceLifetimeSignals(facts, evidenceRef, { evidenceComplete: true });
    const changedLines = changedLineNumbers(primary.text, primary.counterpartText);
    const defectMatching = matching.filter((assessment) => assessmentMatchesDefectEvidence({
      assessment,
      changedLines,
      problemClass: pair.claim.category,
    }));
    const judgmentResults = [];
    for (const assessment of defectMatching) {
      const judgmentSources = (assessment.files ?? [])
        .map((path) => sourceByPath.get(path))
        .filter((source) => source !== undefined)
        .map((source) => ({ path: source.path, text: source.text, sha256: source.sha256 }));
      const judgmentCompletion = await provider.completeJson({
        task: "policy.assessment-judgment",
        schemaName: "AssessmentJudgmentResult",
        prompt: buildAssessmentJudgmentPrompt({
          assessment,
          sources: judgmentSources,
          maxSourceChars: 24000,
        }),
        model: config.model,
        ...(config.effort ? { effort: config.effort } : {}),
        maxOutputTokens: Math.min(options.maxOutputTokens, 1200),
        jsonSchema: ASSESSMENT_JUDGMENT_JSON_SCHEMA,
      });
      if (!judgmentCompletion.ok) {
        judgmentResults.push({
          verdict: "failed",
          confidence: 0,
          evidenceCount: 0,
          usage: {},
          error: judgmentCompletion.error,
        });
        continue;
      }
      const judgment = coerceAssessmentJudgment({
        assessment,
        sources: judgmentSources,
        result: judgmentCompletion.data && typeof judgmentCompletion.data === "object"
          ? judgmentCompletion.data
          : undefined,
      });
      judgmentResults.push({
        verdict: judgment.verdict,
        confidence: judgment.confidence,
        evidenceCount: judgment.evidence.length,
        usage: judgmentCompletion.usage ?? {},
      });
    }
    const usage = sumUsage(judgmentResults.map((entry) => entry.usage));
    const defectRetained = judgmentResults.some(
      (entry) => entry.verdict === "confirmed" || entry.verdict === "verification_required",
    );
    const defectCleared = defectMatching.length === 0
      || (judgmentResults.length === defectMatching.length
        && judgmentResults.every((entry) => entry.verdict === "rejected"));
    pairRuns.push({
      pairId: pair.id,
      revision,
      path: primaryPath,
      problemClass: pair.claim.category,
      status: "ok",
      classCandidateEmitted: matching.length > 0,
      defectEmitted: defectMatching.length > 0,
      matchingAssessments: matching.length,
      defectMatchingAssessments: defectMatching.length,
      defectRetained,
      defectCleared,
      judgments: judgmentResults.map(({ verdict, confidence, evidenceCount, error }) => ({
        verdict,
        confidence,
        evidenceCount,
        ...(error ? { error } : {}),
      })),
      changedLineCount: changedLines.size,
      sourceEvidenceCount: matching.reduce(
        (total, assessment) => total + (Array.isArray(assessment.details?.sourceEvidence) ? assessment.details.sourceEvidence.length : 0),
        0,
      ),
      candidateMetadata: matching.map((assessment) => ({
        findingId: assessment.id,
        changedLineCoverage: assessmentChangedLineCoverage(assessment, changedLines),
        structuredAnchorMatch: assessmentMatchesDefectEvidence({
          assessment,
          changedLines,
          problemClass: pair.claim.category,
        }),
        evidenceLines: Array.isArray(assessment.details?.sourceEvidence)
          ? assessment.details.sourceEvidence.map((entry) => ({
              path: entry.path,
              lineStart: entry.lineStart,
              lineEnd: entry.lineEnd,
              changedLineOverlap: false,
            }))
          : [],
      })),
      provider: config.provider,
      model: config.model,
      usage,
      currentCostUsd: estimateUsageCost(usage, config.pricing),
    });
  }
  return pairRuns;
}

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

function sumUsage(entries) {
  return entries.reduce((total, usage) => ({
    inputTokens: (total.inputTokens ?? 0) + (usage.inputTokens ?? 0),
    cachedInputTokens: (total.cachedInputTokens ?? 0) + (usage.cachedInputTokens ?? 0),
    cacheWriteInputTokens: (total.cacheWriteInputTokens ?? 0) + (usage.cacheWriteInputTokens ?? 0),
    outputTokens: (total.outputTokens ?? 0) + (usage.outputTokens ?? 0),
    reasoningTokens: (total.reasoningTokens ?? 0) + (usage.reasoningTokens ?? 0),
  }), {});
}

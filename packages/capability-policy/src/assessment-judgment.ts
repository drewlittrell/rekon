import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import {
  assessmentJudgmentSignature,
  validateAssessmentJudgmentReport,
  type Assessment,
  type AssessmentJudgment,
  type AssessmentJudgmentReport,
} from "@rekon/kernel-assessments";

import { isNonProductionPath } from "./grammar-divergence.js";

export const ASSESSMENT_JUDGMENT_PROMPT_VERSION = "assessment-judge-v6";
export const ASSESSMENT_JUDGMENT_COERCION_VERSION = "assessment-judgment-v2";
export const ASSESSMENT_JUDGMENT_MIN_DECISIVE_CONFIDENCE = 0.75;
export const SEMANTIC_PROBLEM_CANDIDATE_RULE_ID = "semantic.problemCandidate";
export const SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID = "semantic.dependencyResolution";
export const SEMANTIC_CACHE_INTEGRITY_RULE_ID = "semantic.cacheIntegrity";
export const SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID = "semantic.cleanupCompleteness";
export const SEMANTIC_ERROR_PROPAGATION_RULE_ID = "semantic.errorPropagation";
export const SEMANTIC_OPTION_PROPAGATION_RULE_ID = "semantic.optionPropagation";
export const SEMANTIC_SCOPE_RESOLUTION_RULE_ID = "semantic.scopeResolution";

const SEMANTIC_PROBLEM_CLASS_RULES = {
  "dependency-resolution": {
    ruleId: SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
    title: "Possible dependency resolution issue",
  },
  "cache-integrity": {
    ruleId: SEMANTIC_CACHE_INTEGRITY_RULE_ID,
    title: "Possible cache integrity issue",
  },
  "cleanup-completeness": {
    ruleId: SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
    title: "Possible incomplete cleanup",
  },
  "error-propagation": {
    ruleId: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    title: "Possible error propagation issue",
  },
  "option-propagation": {
    ruleId: SEMANTIC_OPTION_PROPAGATION_RULE_ID,
    title: "Possible option propagation issue",
  },
  "scope-resolution": {
    ruleId: SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
    title: "Possible scope resolution issue",
  },
} as const;

type SemanticFileFindingLike = {
  id?: unknown;
  problemClass?: unknown;
  severity?: unknown;
  message?: unknown;
  sourceEvidence?: unknown;
  suggestedFollowUp?: unknown;
};

export type SemanticFileReportLike = {
  header?: { generatedAt?: unknown };
  file?: { path?: unknown; sha256?: unknown };
  normalizationTrace?: {
    method?: unknown;
    provider?: unknown;
    model?: unknown;
  };
  findings?: unknown;
};

export type CurrentSource = {
  path: string;
  text: string;
  sha256: string;
};

export type AssessmentJudgmentApplicationResult = {
  assessments: Assessment[];
  applied: string[];
  rejected: string[];
  ignored: string[];
};

export function evaluateSemanticFileCandidates(
  reportLike: unknown,
  reportRef: ArtifactRef,
  source: CurrentSource,
): Assessment[] {
  if (!isRecord(reportLike)) return [];
  const report = reportLike as SemanticFileReportLike;
  const path = typeof report.file?.path === "string" ? report.file.path : "";
  const recordedDigest = typeof report.file?.sha256 === "string" ? report.file.sha256 : "";
  if (
    report.normalizationTrace?.method !== "semantic-llm"
    || path.length === 0
    || path !== source.path
    || isNonProductionPath(path)
    || recordedDigest.length === 0
    || recordedDigest !== source.sha256
  ) {
    return [];
  }
  if (!Array.isArray(report.findings)) return [];

  const provider = typeof report.normalizationTrace?.provider === "string"
    ? report.normalizationTrace.provider
    : "";
  const model = typeof report.normalizationTrace?.model === "string"
    ? report.normalizationTrace.model
    : "";
  const assessments: Assessment[] = [];

  for (const findingLike of report.findings as SemanticFileFindingLike[]) {
    if (!isRecord(findingLike)) continue;
    const findingId = typeof findingLike.id === "string" ? findingLike.id.trim() : "";
    const message = typeof findingLike.message === "string" ? findingLike.message.trim() : "";
    const impact = findingLike.severity === "high" || findingLike.severity === "medium" || findingLike.severity === "low"
      ? findingLike.severity
      : undefined;
    if (!findingId || !message || !impact || !Array.isArray(findingLike.sourceEvidence)) continue;

    const problemClass = typeof findingLike.problemClass === "string" ? findingLike.problemClass : undefined;
    const specializedRule = problemClass === "dependency-resolution"
      || problemClass === "cache-integrity"
      || problemClass === "cleanup-completeness"
      || problemClass === "error-propagation"
      || problemClass === "option-propagation"
      || problemClass === "scope-resolution"
      ? SEMANTIC_PROBLEM_CLASS_RULES[problemClass]
      : undefined;
    const ruleId = specializedRule?.ruleId ?? SEMANTIC_PROBLEM_CANDIDATE_RULE_ID;

    const evidence = findingLike.sourceEvidence
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => canonicalSourceExcerpt(source.text, entry))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
    if (evidence.length === 0) continue;

    const fingerprint = digestJson({
      path,
      findingId,
      ruleId,
      evidence: evidence.map((entry) => ({ lineStart: entry.lineStart, lineEnd: entry.lineEnd, excerpt: entry.excerpt })),
    }).slice(0, 16);
    assessments.push({
      id: `${ruleId}:${path}:${fingerprint}`,
      kind: "semantic_claim",
      type: ruleId,
      impact,
      title: `${specializedRule?.title ?? "Possible issue"} in ${path}`,
      description: message,
      subjects: [path],
      files: [path],
      ruleId,
      ...(typeof findingLike.suggestedFollowUp === "string" && findingLike.suggestedFollowUp.trim().length > 0
        ? { suggestedAction: findingLike.suggestedFollowUp.trim() }
        : {}),
      evidence: [reportRef],
      rootCauseKey: `${ruleId}:${path}:${fingerprint}`,
      confidence: {
        score: impact === "high" ? 0.65 : impact === "medium" ? 0.58 : 0.5,
        basis: "semantic",
        verification: "unverified",
        rationale: "A semantic file report proposed this source-matched candidate; independent judgment is still required.",
      },
      details: {
        provider,
        model,
        reportFindingId: findingId,
        ...(problemClass ? { problemClass } : {}),
        sourceDigest: source.sha256,
        sourceEvidence: evidence,
      },
    });
  }

  return assessments.sort((left, right) => left.id.localeCompare(right.id));
}

export function applyAssessmentJudgments(
  assessments: readonly Assessment[],
  reportLike: unknown,
  reportRef: ArtifactRef,
): AssessmentJudgmentApplicationResult {
  const validation = validateAssessmentJudgmentReport(reportLike);
  if (!validation.ok) {
    return { assessments: [...assessments], applied: [], rejected: [], ignored: [] };
  }
  const report = validation.value;
  if (
    report.policy.promptVersion !== ASSESSMENT_JUDGMENT_PROMPT_VERSION
    || report.policy.coercionVersion !== ASSESSMENT_JUDGMENT_COERCION_VERSION
    || report.header.freshness?.status === "stale"
  ) {
    return { assessments: [...assessments], applied: [], rejected: [], ignored: report.judgments.map((entry) => entry.assessmentId) };
  }

  const byAssessment = new Map(report.judgments.map((judgment) => [judgment.assessmentId, judgment]));
  const result: Assessment[] = [];
  const applied: string[] = [];
  const rejected: string[] = [];
  const ignored: string[] = [];

  for (const assessment of assessments) {
    const judgment = byAssessment.get(assessment.id);
    if (
      !judgment
      || judgment.rootCauseKey !== assessment.rootCauseKey
      || judgment.assessmentSignature !== assessmentJudgmentSignature(assessment)
    ) {
      result.push(assessment);
      if (judgment) ignored.push(assessment.id);
      continue;
    }

    const decisive = judgment.confidence >= ASSESSMENT_JUDGMENT_MIN_DECISIVE_CONFIDENCE
      && judgment.evidence.length > 0;
    if (judgment.verdict === "rejected" && decisive) {
      rejected.push(assessment.id);
      continue;
    }

    if (judgment.verdict === "confirmed" && decisive) {
      result.push(confirmAssessment(assessment, judgment, report, reportRef));
      applied.push(assessment.id);
      continue;
    }

    result.push(annotateAssessment(assessment, judgment, report, reportRef));
    applied.push(assessment.id);
  }

  return {
    assessments: result,
    applied: applied.sort(),
    rejected: rejected.sort(),
    ignored: ignored.sort(),
  };
}

export async function retainCurrentAssessmentJudgments(
  report: AssessmentJudgmentReport,
  repoRoot: string,
): Promise<AssessmentJudgmentReport> {
  const sourceCache = new Map<string, CurrentSource | null>();
  const judgments: AssessmentJudgment[] = [];

  for (const judgment of report.judgments) {
    const currentEvidence = [];
    for (const evidence of judgment.evidence) {
      let source = sourceCache.get(evidence.path);
      if (source === undefined) {
        source = await readCurrentRepoSource(repoRoot, evidence.path);
        sourceCache.set(evidence.path, source);
      }
      if (
        source
        && source.sha256 === evidence.sha256
        && source.text.includes(evidence.excerpt)
      ) {
        currentEvidence.push(evidence);
      }
    }
    if ((judgment.verdict === "confirmed" || judgment.verdict === "rejected") && currentEvidence.length === 0) {
      continue;
    }
    judgments.push({ ...judgment, evidence: currentEvidence });
  }

  return { ...report, judgments };
}

export async function readCurrentRepoSource(repoRoot: string, path: string): Promise<CurrentSource | null> {
  if (!path || isAbsolute(path)) return null;
  let physicalRoot: string;
  try {
    physicalRoot = await realpath(resolve(repoRoot));
  } catch {
    return null;
  }
  const candidate = resolve(physicalRoot, path);
  if (!isInside(physicalRoot, candidate)) return null;

  try {
    const physicalCandidate = await realpath(candidate);
    if (!isInside(physicalRoot, physicalCandidate)) return null;
    const text = await readFile(physicalCandidate, "utf8");
    return {
      path: relative(physicalRoot, physicalCandidate).replaceAll("\\", "/"),
      text,
      sha256: createHash("sha256").update(text).digest("hex"),
    };
  } catch {
    return null;
  }
}

function confirmAssessment(
  assessment: Assessment,
  judgment: AssessmentJudgment,
  report: AssessmentJudgmentReport,
  reportRef: ArtifactRef,
): Assessment {
  return {
    ...assessment,
    evidence: uniqueRefs([...assessment.evidence, reportRef]),
    confidence: {
      score: Math.max(assessment.confidence.score, judgment.confidence),
      basis: assessment.confidence.basis === "operator" ? "operator" : "mixed",
      verification: "independently_confirmed",
      rationale: "An independent judgment confirmed the candidate against current source evidence; finding promotion still requires law or reproducible proof.",
    },
    supportingSignals: [
      ...(assessment.supportingSignals ?? []),
      {
        producer: report.header.producer.id,
        signalType: "assessment_judgment:confirmed",
        evidence: [reportRef],
        details: {
          confidence: judgment.confidence,
          rationale: judgment.rationale,
        },
      },
    ],
    details: judgmentDetails(assessment, judgment, reportRef),
  };
}

function annotateAssessment(
  assessment: Assessment,
  judgment: AssessmentJudgment,
  report: AssessmentJudgmentReport,
  reportRef: ArtifactRef,
): Assessment {
  return {
    ...assessment,
    evidence: uniqueRefs([...assessment.evidence, reportRef]),
    supportingSignals: [
      ...(assessment.supportingSignals ?? []),
      {
        producer: report.header.producer.id,
        signalType: `assessment_judgment:${judgment.verdict}`,
        evidence: [reportRef],
        details: { confidence: judgment.confidence, rationale: judgment.rationale },
      },
    ],
    details: judgmentDetails(assessment, judgment, reportRef),
  };
}

function judgmentDetails(
  assessment: Assessment,
  judgment: AssessmentJudgment,
  reportRef: ArtifactRef,
): Record<string, unknown> {
  return {
    ...(assessment.details ?? {}),
    independentJudgment: {
      verdict: judgment.verdict,
      rationale: judgment.rationale,
      confidence: judgment.confidence,
      evidence: judgment.evidence,
      recommendedVerification: judgment.recommendedVerification ?? [],
      reportRef,
    },
  };
}

function canonicalSourceExcerpt(text: string, requested: string): {
  lineStart: number;
  lineEnd: number;
  excerpt: string;
} | undefined {
  const excerpt = requested.trim();
  if (!excerpt) return undefined;
  const offset = text.indexOf(excerpt);
  if (offset < 0) return undefined;
  const lineStart = text.slice(0, offset).split(/\r?\n/u).length;
  const lineEnd = lineStart + excerpt.split(/\r?\n/u).length - 1;
  return { lineStart, lineEnd, excerpt };
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const byKey = new Map<string, ArtifactRef>();
  for (const ref of refs) byKey.set(`${ref.type}:${ref.id}:${ref.schemaVersion}`, ref);
  return [...byKey.values()].sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

function isInside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(rel));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

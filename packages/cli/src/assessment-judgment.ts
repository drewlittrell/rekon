import {
  assessmentJudgmentSignature,
  type Assessment,
  type AssessmentJudgment,
  type AssessmentJudgmentEvidence,
  type AssessmentJudgmentVerdict,
} from "@rekon/kernel-assessments";
import { ASSESSMENT_JUDGMENT_MIN_DECISIVE_CONFIDENCE } from "@rekon/capability-policy";

export const ASSESSMENT_JUDGMENT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      enum: ["confirmed", "rejected", "insufficient_evidence", "verification_required"],
    },
    rationale: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          path: { type: "string" },
          excerpt: { type: "string" },
        },
        required: ["path", "excerpt"],
      },
    },
    recommendedVerification: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["verdict", "rationale", "confidence", "evidence", "recommendedVerification"],
};

export type AssessmentJudgmentSourceContext = {
  path: string;
  text: string;
  sha256: string;
};

export type AssessmentJudgmentAdapterResult = {
  verdict?: unknown;
  rationale?: unknown;
  confidence?: unknown;
  evidence?: unknown;
  recommendedVerification?: unknown;
  warnings?: string[];
};

export function selectAssessmentJudgmentCandidates(
  assessments: readonly Assessment[],
  maxCandidates: number,
): Assessment[] {
  if (maxCandidates <= 0) return [];
  return assessments
    .filter((assessment) => assessment.kind === "risk" || assessment.kind === "semantic_claim")
    .filter((assessment) =>
      assessment.confidence.verification !== "verified"
      && assessment.confidence.verification !== "operator_confirmed"
      && assessment.confidence.verification !== "independently_confirmed")
    .filter((assessment) => (assessment.files?.length ?? 0) > 0)
    .slice()
    .sort((left, right) => {
      const impact = impactRank(right.impact) - impactRank(left.impact);
      if (impact !== 0) return impact;
      const kind = kindRank(right.kind) - kindRank(left.kind);
      if (kind !== 0) return kind;
      const confidence = right.confidence.score - left.confidence.score;
      return confidence !== 0 ? confidence : left.id.localeCompare(right.id);
    })
    .slice(0, maxCandidates);
}

export function buildAssessmentJudgmentPrompt(input: {
  assessment: Assessment;
  sources: AssessmentJudgmentSourceContext[];
  maxSourceChars: number;
}): string {
  const sourceBudget = Math.max(0, input.maxSourceChars);
  const perSourceBudget = input.sources.length === 0
    ? 0
    : Math.max(1, Math.floor(sourceBudget / input.sources.length));
  const renderedSources = input.sources.map((source) => renderBoundedSource(
    source,
    input.assessment,
    perSourceBudget,
  ));
  const specializedRules = assessmentSpecificRules(input.assessment);

  return [
    "Judge one Rekon assessment against the supplied current repository source.",
    "",
    "Verdicts:",
    "- confirmed: the cited source directly supports the assessment as a material engineering problem.",
    "- rejected: the cited source contradicts the assessment or shows an intentional, ordinary, or harmless construct.",
    "- verification_required: the claim is plausible, but runtime behavior, callers, configuration, or repository law is needed.",
    "- insufficient_evidence: the supplied source does not support a reliable decision.",
    "",
    "Rules:",
    "- Judge the assessment, not whether the code could be redesigned.",
    "- Do not infer hidden callers, runtime state, configuration, or intent.",
    "- A risk can be real without being a proven defect.",
    "- Confirm or reject only with at least one exact source excerpt from the supplied text.",
    "- Evidence excerpts must copy the underlying source and omit the displayed '<line> | ' prefix.",
    "- Prefer verification_required when observable behavior is needed.",
    "- Prefer insufficient_evidence when relevant context is absent.",
    ...specializedRules,
    "- Return only one JSON object matching the schema.",
    "",
    `Assessment: ${JSON.stringify({
      id: input.assessment.id,
      kind: input.assessment.kind,
      type: input.assessment.type,
      impact: input.assessment.impact,
      title: input.assessment.title,
      description: input.assessment.description,
      subjects: input.assessment.subjects,
      files: input.assessment.files ?? [],
      suggestedAction: input.assessment.suggestedAction,
      confidence: input.assessment.confidence,
      applicableLaw: input.assessment.applicableLaw,
      details: input.assessment.details,
    })}`,
    "",
    ...renderedSources,
  ].join("\n");
}

function assessmentSpecificRules(assessment: Assessment): string[] {
  if (assessment.ruleId === "semantic.cleanupCompleteness") {
    return [
      "- For cleanup completeness, visible fail-fast aggregation before later lifecycle cleanup can support retention even when runtime proof is still required.",
      "- Reject the claim when peer cleanup uses all-settled behavior and later cleanup calls are insulated so each visible obligation is still attempted.",
    ];
  }
  if (assessment.ruleId === "semantic.errorPropagation") {
    return [
      "- For error propagation, retain only when distinct visible failure causes share the wrong error identity and downstream source treats that identity differently enough to mislabel, suppress, or skip a valid failure path.",
      "- Reject the claim when separate guards preserve separate error identities or when the cited downstream source does not distinguish those identities.",
    ];
  }
  if (assessment.ruleId === "semantic.optionPropagation") {
    return [
      "- For option propagation, confirm only when current source establishes that an existing configured option can be replaced by an absent callback or override value before the receiving operation.",
      "- When either the callback contract or the spread configuration type is external or otherwise not present in current source, but a callback parameter visibly replaces the same property from that spread object, use verification_required rather than confirmed or rejected; recommend checking the callback parameter type, configured property, and first-invocation behavior.",
      "- Reject the claim only when current source establishes that the override deliberately takes precedence and cannot be absent, that the spread source cannot carry the same configured option, or that a nullish fallback preserves it.",
    ];
  }
  if (assessment.ruleId === "semantic.resourceLifetime") {
    return [
      "- For resource lifetime, retain the claim only when current source visibly stores request-scoped objects on socket, connection, or server-owned state and the assessment came from a complete graph with no matching explicit release.",
      "- Use verification_required when the ownership mismatch is visible but runtime reachability beyond request completion is not proven; recommend a focused lifecycle or heap-retention check rather than human inspection.",
      "- Reject the claim when current source shows the owner is request-scoped, the retained value cannot include the named request objects, or a matching release is visible.",
    ];
  }
  return [];
}

export function coerceAssessmentJudgment(input: {
  assessment: Assessment;
  sources: AssessmentJudgmentSourceContext[];
  result: AssessmentJudgmentAdapterResult | undefined;
}): AssessmentJudgment {
  const warnings = [...(input.result?.warnings ?? [])];
  const rawVerdict = input.result?.verdict;
  let verdict: AssessmentJudgmentVerdict = isProviderVerdict(rawVerdict) ? rawVerdict : "failed";
  let rationale = typeof input.result?.rationale === "string" ? input.result.rationale.trim() : "";
  const confidence = typeof input.result?.confidence === "number"
    && Number.isFinite(input.result.confidence)
    && input.result.confidence >= 0
    && input.result.confidence <= 1
    ? input.result.confidence
    : 0;
  const evidence = coerceEvidence(input.result?.evidence, input.sources);
  const recommendedVerification = uniqueStrings(input.result?.recommendedVerification);

  if (!isProviderVerdict(rawVerdict)) {
    warnings.push("provider-result-invalid-verdict");
    rationale = rationale || "The provider returned no supported judgment verdict.";
  } else if (!rationale) {
    verdict = "failed";
    warnings.push("provider-result-missing-rationale");
    rationale = "The provider returned no judgment rationale.";
  }

  if (
    (verdict === "confirmed" || verdict === "rejected")
    && (confidence < ASSESSMENT_JUDGMENT_MIN_DECISIVE_CONFIDENCE || evidence.length === 0)
  ) {
    warnings.push(confidence < ASSESSMENT_JUDGMENT_MIN_DECISIVE_CONFIDENCE
      ? "decisive-verdict-below-confidence-floor"
      : "decisive-verdict-missing-current-source-evidence");
    verdict = "insufficient_evidence";
  }

  return {
    assessmentId: input.assessment.id,
    assessmentSignature: assessmentJudgmentSignature(input.assessment),
    rootCauseKey: input.assessment.rootCauseKey,
    verdict,
    rationale,
    confidence,
    evidence,
    ...(recommendedVerification.length > 0 ? { recommendedVerification } : {}),
    ...(warnings.length > 0 ? { warnings: [...new Set(warnings)].sort() } : {}),
  };
}

export function judgmentWithoutSource(assessment: Assessment): AssessmentJudgment {
  return {
    assessmentId: assessment.id,
    assessmentSignature: assessmentJudgmentSignature(assessment),
    rootCauseKey: assessment.rootCauseKey,
    verdict: "insufficient_evidence",
    rationale: "No current readable source file was available for this assessment.",
    confidence: 1,
    evidence: [],
    warnings: ["current-source-unavailable"],
  };
}

function coerceEvidence(
  value: unknown,
  sources: AssessmentJudgmentSourceContext[],
): AssessmentJudgmentEvidence[] {
  if (!Array.isArray(value)) return [];
  const byPath = new Map(sources.map((source) => [source.path, source]));
  const evidence: AssessmentJudgmentEvidence[] = [];
  const seen = new Set<string>();

  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.path !== "string" || typeof raw.excerpt !== "string") continue;
    const source = byPath.get(raw.path);
    const suppliedExcerpt = raw.excerpt.trim();
    if (!source || !suppliedExcerpt) continue;
    const excerpt = exactSourceExcerpt(source.text, suppliedExcerpt);
    if (!excerpt) continue;
    const offset = source.text.indexOf(excerpt);
    if (offset < 0) continue;
    const key = `${source.path}\u0000${excerpt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const lineStart = source.text.slice(0, offset).split(/\r?\n/u).length;
    evidence.push({
      path: source.path,
      sha256: source.sha256,
      lineStart,
      lineEnd: lineStart + excerpt.split(/\r?\n/u).length - 1,
      excerpt,
    });
  }

  return evidence.sort((left, right) => `${left.path}:${left.lineStart}`.localeCompare(`${right.path}:${right.lineStart}`));
}

function exactSourceExcerpt(sourceText: string, suppliedExcerpt: string): string | undefined {
  if (sourceText.includes(suppliedExcerpt)) return suppliedExcerpt;
  const withoutLineLabels = suppliedExcerpt
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*\d+\s*\| ?/u, ""))
    .join("\n")
    .trim();
  if (!withoutLineLabels) return undefined;
  if (sourceText.includes(withoutLineLabels)) return withoutLineLabels;
  return uniquelyMatchIndentNormalizedExcerpt(sourceText, withoutLineLabels);
}

function uniquelyMatchIndentNormalizedExcerpt(sourceText: string, suppliedExcerpt: string): string | undefined {
  const sourceLines = sourceText.split(/\r?\n/u);
  const suppliedLines = suppliedExcerpt.split(/\r?\n/u);
  if (suppliedLines.length === 0 || suppliedLines.length > sourceLines.length) return undefined;

  const matches: number[] = [];
  for (let start = 0; start <= sourceLines.length - suppliedLines.length; start += 1) {
    const matchesAtStart = suppliedLines.every(
      (line, offset) => sourceLines[start + offset]!.trim() === line.trim(),
    );
    if (matchesAtStart) matches.push(start);
    if (matches.length > 1) return undefined;
  }
  if (matches.length !== 1) return undefined;
  const start = matches[0]!;
  return sourceLines.slice(start, start + suppliedLines.length).join("\n");
}

function renderBoundedSource(
  source: AssessmentJudgmentSourceContext,
  assessment: Assessment,
  maxChars: number,
): string {
  const lines = source.text.split(/\r?\n/u);
  const anchor = assessmentAnchorLine(assessment, source.path);
  let start = 0;
  let end = lines.length;

  if (anchor !== undefined && source.text.length > maxChars) {
    const radius = 80;
    start = Math.max(0, anchor - radius - 1);
    end = Math.min(lines.length, anchor + radius);
  }

  let rendered = lines
    .slice(start, end)
    .map((line, index) => `${start + index + 1} | ${line}`)
    .join("\n");
  if (rendered.length > maxChars) rendered = rendered.slice(0, maxChars);
  return [`Source path: ${source.path}`, `Source sha256: ${source.sha256}`, rendered].join("\n");
}

function assessmentAnchorLine(assessment: Assessment, path: string): number | undefined {
  const detailsLine = assessment.details?.line;
  if (typeof detailsLine === "number" && Number.isInteger(detailsLine) && detailsLine > 0) return detailsLine;
  const sourceEvidence = assessment.details?.sourceEvidence;
  if (!Array.isArray(sourceEvidence)) return undefined;
  for (const entry of sourceEvidence) {
    if (!isRecord(entry)) continue;
    if (typeof entry.path === "string" && entry.path !== path) continue;
    if (typeof entry.lineStart === "number" && Number.isInteger(entry.lineStart) && entry.lineStart > 0) {
      return entry.lineStart;
    }
  }
  return undefined;
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()))].sort();
}

function isProviderVerdict(value: unknown): value is Exclude<AssessmentJudgmentVerdict, "failed"> {
  return value === "confirmed"
    || value === "rejected"
    || value === "insufficient_evidence"
    || value === "verification_required";
}

function impactRank(impact: Assessment["impact"]): number {
  return impact === "critical" ? 4 : impact === "high" ? 3 : impact === "medium" ? 2 : 1;
}

function kindRank(kind: Assessment["kind"]): number {
  return kind === "risk" ? 2 : kind === "semantic_claim" ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

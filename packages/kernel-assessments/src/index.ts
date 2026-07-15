import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  digestJson,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";

export type AssessmentKind = "risk" | "opportunity" | "semantic_claim" | "model_diagnostic";
export type AssessmentImpact = "critical" | "high" | "medium" | "low";
export type AssessmentEvidenceBasis = "deterministic" | "semantic" | "mixed" | "operator";
export type AssessmentVerification =
  | "unverified"
  | "corroborated"
  | "independently_confirmed"
  | "verified"
  | "operator_confirmed";
export type AssessmentLifecycleState =
  | "model_proposed"
  | "evidence_observed"
  | "tool_corroborated"
  | "independently_confirmed"
  | "verified"
  | "operator_confirmed"
  | "opportunity_only"
  | "diagnostic_only";

export type AssessmentSignal = {
  producer: string;
  signalType: string;
  evidence: ArtifactRef[];
  details?: Record<string, unknown>;
};

export type ApplicableLaw = {
  id: string;
  description?: string;
  sourceRef?: ArtifactRef;
};

export type Assessment = {
  id: string;
  kind: AssessmentKind;
  type: string;
  impact: AssessmentImpact;
  title: string;
  description: string;
  subjects: string[];
  files?: string[];
  ruleId?: string;
  suggestedAction?: string;
  evidence: ArtifactRef[];
  rootCauseKey: string;
  confidence: {
    score: number;
    basis: AssessmentEvidenceBasis;
    verification: AssessmentVerification;
    rationale?: string;
  };
  applicableLaw?: ApplicableLaw;
  supportingSignals?: AssessmentSignal[];
  details?: Record<string, unknown>;
  state?: AssessmentLifecycleState;
};

export type AssessmentReport = {
  header: ArtifactHeader;
  summary: {
    total: number;
    byKind: Record<string, number>;
    byImpact: Record<string, number>;
    byType: Record<string, number>;
    byState: Record<string, number>;
  };
  assessments: Assessment[];
};

export type AssessmentJudgmentVerdict =
  | "confirmed"
  | "rejected"
  | "insufficient_evidence"
  | "verification_required"
  | "failed";

export type AssessmentJudgmentEvidence = {
  path: string;
  sha256: string;
  lineStart: number;
  lineEnd: number;
  excerpt: string;
};

export type AssessmentJudgment = {
  assessmentId: string;
  assessmentSignature: string;
  rootCauseKey: string;
  verdict: AssessmentJudgmentVerdict;
  rationale: string;
  confidence: number;
  evidence: AssessmentJudgmentEvidence[];
  recommendedVerification?: string[];
  warnings?: string[];
};

export type AssessmentJudgmentReport = {
  header: ArtifactHeader;
  sourceAssessmentRef: ArtifactRef;
  policy: {
    mode: "auto" | "required";
    provider: string;
    model: string;
    promptVersion: string;
    coercionVersion: string;
    maxCandidates: number;
    maxSourceChars: number;
  };
  summary: {
    candidates: number;
    selected: number;
    confirmed: number;
    rejected: number;
    insufficientEvidence: number;
    verificationRequired: number;
    failed: number;
    skipped: number;
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
  };
  judgments: AssessmentJudgment[];
  boundaries: {
    executedCommands: false;
    wroteSourceFiles: false;
    mutatedEvidence: false;
    promotedFindings: false;
  };
};

export type FindingPromotionDecision = {
  eligible: boolean;
  reasons: string[];
};

export type DetectionQualityMetrics = {
  totalRecords: number;
  findings: number;
  assessments: number;
  evidenceCompleteness: number;
  rootCauseCompleteness: number;
  duplicateRemediationCount: number;
  duplicateRemediationRate: number;
};

export type DetectionQualityFindingLike = {
  id: string;
  rootCauseKey?: string;
  evidence?: ArtifactRef[];
};

const KINDS = new Set<AssessmentKind>(["risk", "opportunity", "semantic_claim", "model_diagnostic"]);
const IMPACTS = new Set<AssessmentImpact>(["critical", "high", "medium", "low"]);
const BASES = new Set<AssessmentEvidenceBasis>(["deterministic", "semantic", "mixed", "operator"]);
const VERIFICATIONS = new Set<AssessmentVerification>([
  "unverified",
  "corroborated",
  "independently_confirmed",
  "verified",
  "operator_confirmed",
]);
const LIFECYCLE_STATES = new Set<AssessmentLifecycleState>([
  "model_proposed",
  "evidence_observed",
  "tool_corroborated",
  "independently_confirmed",
  "verified",
  "operator_confirmed",
  "opportunity_only",
  "diagnostic_only",
]);
const JUDGMENT_VERDICTS = new Set<AssessmentJudgmentVerdict>([
  "confirmed",
  "rejected",
  "insufficient_evidence",
  "verification_required",
  "failed",
]);

export function createAssessmentReport(input: {
  header: ArtifactHeader;
  assessments: Assessment[];
}): AssessmentReport {
  const assessments = fuseAssessments(input.assessments)
    .map(normalizeAssessment)
    .sort((left, right) => left.id.localeCompare(right.id));
  const report: AssessmentReport = {
    header: input.header,
    summary: summarizeAssessments(assessments),
    assessments,
  };
  return assertAssessmentReport(report);
}

/**
 * Collapse multiple detector outputs that describe one remediation unit.
 * The original detector outputs remain inspectable as supporting signals.
 */
export function fuseAssessments(input: Assessment[]): Assessment[] {
  const byRootCause = new Map<string, Assessment[]>();
  for (const assessment of input) {
    const key = assessmentFusionKey(assessment);
    const group = byRootCause.get(key) ?? [];
    group.push(assessment);
    byRootCause.set(key, group);
  }

  return [...byRootCause.values()].map((group) => {
    const ordered = group.slice().sort((left, right) => {
      const kindDelta = kindRank(right.kind) - kindRank(left.kind);
      if (kindDelta !== 0) return kindDelta;
      const impactDelta = impactRank(right.impact) - impactRank(left.impact);
      return impactDelta !== 0 ? impactDelta : left.id.localeCompare(right.id);
    });
    const primary = ordered[0]!;
    if (ordered.length === 1) return primary;

    const bases = new Set(ordered.map((assessment) => assessment.confidence.basis));
    const signals: AssessmentSignal[] = ordered.flatMap((assessment) => [
      {
        producer: assessment.ruleId ?? "assessment",
        signalType: assessment.type,
        evidence: assessment.evidence,
        details: { assessmentId: assessment.id, kind: assessment.kind },
      },
      ...(assessment.supportingSignals ?? []),
    ]);

    return {
      ...primary,
      impact: ordered.reduce<AssessmentImpact>(
        (current, assessment) => impactRank(assessment.impact) > impactRank(current) ? assessment.impact : current,
        primary.impact,
      ),
      subjects: ordered.flatMap((assessment) => assessment.subjects),
      files: ordered.flatMap((assessment) => assessment.files ?? []),
      evidence: ordered.flatMap((assessment) => assessment.evidence),
      confidence: {
        score: Math.max(...ordered.map((assessment) => assessment.confidence.score)),
        basis: bases.size > 1 ? "mixed" : primary.confidence.basis,
        verification: ordered.reduce<AssessmentVerification>(
          (current, assessment) => verificationRank(assessment.confidence.verification) > verificationRank(current)
            ? assessment.confidence.verification
            : current,
          primary.confidence.verification,
        ),
        rationale: `Fused ${ordered.length} signals for one root cause.`,
      },
      supportingSignals: signals,
    };
  });
}

/**
 * Promotion is deliberately conservative. A semantic claim or risk needs
 * mixed/verified evidence plus either applicable law or reproducible defect
 * evidence. Opportunities and model diagnostics never auto-promote.
 */
export function evaluateFindingPromotion(assessment: Assessment): FindingPromotionDecision {
  if (assessment.kind === "opportunity") {
    return { eligible: false, reasons: ["Opportunities are optional improvements, not findings."] };
  }
  if (assessment.kind === "model_diagnostic") {
    return { eligible: false, reasons: ["Model diagnostics describe intelligence quality, not repository defects."] };
  }
  if (assessment.confidence.verification === "operator_confirmed") {
    return { eligible: true, reasons: ["An operator confirmed the assessment."] };
  }

  const reproducible = assessment.details?.reproducible === true;
  const hasGround = Boolean(assessment.applicableLaw) || reproducible;
  const verified = assessment.confidence.verification === "verified";
  const independentlyConfirmed = assessment.confidence.verification === "independently_confirmed";
  const corroboratedSemantic = assessment.kind === "semantic_claim"
    && assessment.confidence.verification === "corroborated"
    && assessment.confidence.basis === "mixed";

  if (hasGround && (verified || independentlyConfirmed || corroboratedSemantic)) {
    return {
      eligible: true,
      reasons: [assessment.applicableLaw ? "Applicable law is cited." : "Reproducible defect evidence is attached."],
    };
  }

  return {
    eligible: false,
    reasons: [
      "Promotion requires operator confirmation or corroborated evidence tied to applicable law or a reproducible defect.",
    ],
  };
}

export function measureDetectionQuality(input: {
  findings: DetectionQualityFindingLike[];
  assessments: Assessment[];
}): DetectionQualityMetrics {
  const records = [
    ...input.findings.map((finding) => ({
      rootCauseKey: finding.rootCauseKey,
      hasEvidence: Array.isArray(finding.evidence) && finding.evidence.length > 0,
    })),
    ...input.assessments.map((assessment) => ({
      rootCauseKey: assessment.rootCauseKey,
      hasEvidence: assessment.evidence.length > 0,
    })),
  ];
  const totalRecords = records.length;
  const rootCauseKeys = records
    .map((record) => record.rootCauseKey)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const duplicateRemediationCount = rootCauseKeys.length - new Set(rootCauseKeys).size;

  return {
    totalRecords,
    findings: input.findings.length,
    assessments: input.assessments.length,
    evidenceCompleteness: totalRecords === 0 ? 1 : records.filter((record) => record.hasEvidence).length / totalRecords,
    rootCauseCompleteness: totalRecords === 0 ? 1 : rootCauseKeys.length / totalRecords,
    duplicateRemediationCount,
    duplicateRemediationRate: totalRecords === 0 ? 0 : duplicateRemediationCount / totalRecords,
  };
}

export function summarizeAssessments(assessments: Assessment[]): AssessmentReport["summary"] {
  return {
    total: assessments.length,
    byKind: countBy(assessments, (assessment) => assessment.kind),
    byImpact: countBy(assessments, (assessment) => assessment.impact),
    byType: countBy(assessments, (assessment) => assessment.type),
    byState: countBy(assessments, assessmentLifecycleState),
  };
}

export function validateAssessmentReport(value: unknown): ValidationResult<AssessmentReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);
  if (!header.ok) {
    issues.push(...header.issues.map((issue) => ({ ...issue, path: `$.header${issue.path === "$" ? "" : issue.path.slice(1)}` })));
  } else if (header.value.artifactType !== "AssessmentReport") {
    issues.push({ path: "$.header.artifactType", message: "Expected artifactType to be AssessmentReport." });
  }

  if (!isRecord(value.summary) || typeof value.summary.total !== "number") {
    issues.push({ path: "$.summary", message: "Expected an assessment summary." });
  }
  if (!Array.isArray(value.assessments)) {
    issues.push({ path: "$.assessments", message: "Expected an array." });
  } else {
    const ids = new Set<string>();
    value.assessments.forEach((assessment, index) => {
      validateAssessment(assessment, `$.assessments[${index}]`, issues);
      if (isRecord(assessment) && typeof assessment.id === "string") {
        if (ids.has(assessment.id)) {
          issues.push({ path: `$.assessments[${index}].id`, message: "Assessment ids must be unique." });
        }
        ids.add(assessment.id);
      }
    });
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as AssessmentReport, issues: [] };
}

export function assertAssessmentReport(value: unknown): AssessmentReport {
  const result = validateAssessmentReport(value);
  if (!result.ok) {
    throw new TypeError(`AssessmentReport validation failed: ${result.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
  }
  return result.value;
}

export const assessmentReportSchema: ArtifactSchema<AssessmentReport> = {
  validate: validateAssessmentReport,
  parse: assertAssessmentReport,
};

export function assessmentJudgmentSignature(assessment: Assessment): string {
  return digestJson({
    id: assessment.id,
    kind: assessment.kind,
    type: assessment.type,
    impact: assessment.impact,
    title: assessment.title,
    description: assessment.description,
    subjects: uniqueSorted(assessment.subjects),
    files: uniqueSorted(assessment.files ?? []),
    ruleId: assessment.ruleId,
    suggestedAction: assessment.suggestedAction,
    evidence: normalizeRefs(assessment.evidence),
    rootCauseKey: assessment.rootCauseKey,
    confidence: assessment.confidence,
    applicableLaw: assessment.applicableLaw,
    supportingSignals: assessment.supportingSignals,
    details: assessment.details,
  });
}

export function createAssessmentJudgmentReport(
  input: Omit<AssessmentJudgmentReport, "boundaries"> & {
    boundaries?: AssessmentJudgmentReport["boundaries"];
  },
): AssessmentJudgmentReport {
  const judgments = input.judgments
    .map((judgment) => ({
      ...judgment,
      evidence: judgment.evidence
        .map((entry) => ({ ...entry }))
        .sort((left, right) => `${left.path}:${left.lineStart}:${left.lineEnd}`.localeCompare(`${right.path}:${right.lineStart}:${right.lineEnd}`)),
      ...(judgment.recommendedVerification
        ? { recommendedVerification: uniqueSorted(judgment.recommendedVerification) }
        : {}),
      ...(judgment.warnings ? { warnings: uniqueSorted(judgment.warnings) } : {}),
    }))
    .sort((left, right) => left.assessmentId.localeCompare(right.assessmentId));

  return assertAssessmentJudgmentReport({
    ...input,
    judgments,
    boundaries: {
      executedCommands: false,
      wroteSourceFiles: false,
      mutatedEvidence: false,
      promotedFindings: false,
    },
  });
}

export function validateAssessmentJudgmentReport(
  value: unknown,
): ValidationResult<AssessmentJudgmentReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);
  if (!header.ok) {
    issues.push(...header.issues.map((issue) => ({ ...issue, path: `$.header${issue.path === "$" ? "" : issue.path.slice(1)}` })));
  } else if (header.value.artifactType !== "AssessmentJudgmentReport") {
    issues.push({ path: "$.header.artifactType", message: "Expected artifactType to be AssessmentJudgmentReport." });
  }

  const sourceRef = validateArtifactRef(value.sourceAssessmentRef);
  if (!sourceRef.ok) {
    issues.push(...sourceRef.issues.map((issue) => ({ ...issue, path: `$.sourceAssessmentRef${issue.path === "$" ? "" : issue.path.slice(1)}` })));
  } else if (sourceRef.value.type !== "AssessmentReport") {
    issues.push({ path: "$.sourceAssessmentRef.type", message: "Expected an AssessmentReport reference." });
  } else if (
    header.ok
    && !header.value.inputRefs.some((ref) =>
      ref.type === sourceRef.value.type
      && ref.id === sourceRef.value.id
      && ref.schemaVersion === sourceRef.value.schemaVersion)
  ) {
    issues.push({ path: "$.header.inputRefs", message: "Expected the source AssessmentReport reference in header inputRefs." });
  }

  validateJudgmentPolicy(value.policy, issues);
  validateJudgmentSummary(value.summary, value.judgments, value.policy, issues);

  if (!Array.isArray(value.judgments)) {
    issues.push({ path: "$.judgments", message: "Expected an array." });
  } else {
    const ids = new Set<string>();
    value.judgments.forEach((judgment, index) => {
      validateAssessmentJudgment(judgment, `$.judgments[${index}]`, issues);
      if (isRecord(judgment) && typeof judgment.assessmentId === "string") {
        if (ids.has(judgment.assessmentId)) {
          issues.push({ path: `$.judgments[${index}].assessmentId`, message: "Assessment judgments must be unique per assessment id." });
        }
        ids.add(judgment.assessmentId);
      }
    });
  }

  if (!isRecord(value.boundaries)) {
    issues.push({ path: "$.boundaries", message: "Expected boundary declarations." });
  } else {
    for (const key of ["executedCommands", "wroteSourceFiles", "mutatedEvidence", "promotedFindings"] as const) {
      if (value.boundaries[key] !== false) {
        issues.push({ path: `$.boundaries.${key}`, message: "Assessment judgment cannot cross this boundary." });
      }
    }
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as AssessmentJudgmentReport, issues: [] };
}

export function assertAssessmentJudgmentReport(value: unknown): AssessmentJudgmentReport {
  const result = validateAssessmentJudgmentReport(value);
  if (!result.ok) {
    throw new TypeError(`AssessmentJudgmentReport validation failed: ${result.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
  }
  return result.value;
}

export const assessmentJudgmentReportSchema: ArtifactSchema<AssessmentJudgmentReport> = {
  validate: validateAssessmentJudgmentReport,
  parse: assertAssessmentJudgmentReport,
};

function normalizeAssessment(assessment: Assessment): Assessment {
  return {
    ...assessment,
    state: assessmentLifecycleState(assessment),
    subjects: uniqueSorted(assessment.subjects),
    ...(assessment.files ? { files: uniqueSorted(assessment.files) } : {}),
    evidence: normalizeRefs(assessment.evidence),
    ...(assessment.supportingSignals
      ? {
          supportingSignals: assessment.supportingSignals
            .map((signal) => ({ ...signal, evidence: normalizeRefs(signal.evidence) }))
            .sort((left, right) => `${left.producer}:${left.signalType}`.localeCompare(`${right.producer}:${right.signalType}`)),
        }
      : {}),
  };
}

function validateAssessment(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  requireString(value.id, `${path}.id`, issues);
  if (!KINDS.has(value.kind as AssessmentKind)) issues.push({ path: `${path}.kind`, message: "Expected a supported assessment kind." });
  if (value.state !== undefined && !LIFECYCLE_STATES.has(value.state as AssessmentLifecycleState)) {
    issues.push({ path: `${path}.state`, message: "Expected a supported assessment lifecycle state." });
  }
  requireString(value.type, `${path}.type`, issues);
  if (!IMPACTS.has(value.impact as AssessmentImpact)) issues.push({ path: `${path}.impact`, message: "Expected a supported impact." });
  requireString(value.title, `${path}.title`, issues);
  requireString(value.description, `${path}.description`, issues);
  requireString(value.rootCauseKey, `${path}.rootCauseKey`, issues);
  validateStringArray(value.subjects, `${path}.subjects`, issues, true);
  if (value.files !== undefined) validateStringArray(value.files, `${path}.files`, issues, false);

  if (!Array.isArray(value.evidence) || value.evidence.length === 0) {
    issues.push({ path: `${path}.evidence`, message: "Expected at least one artifact reference." });
  } else {
    value.evidence.forEach((ref, index) => {
      const result = validateArtifactRef(ref);
      if (!result.ok) {
        issues.push(...result.issues.map((issue) => ({ ...issue, path: `${path}.evidence[${index}]${issue.path === "$" ? "" : issue.path.slice(1)}` })));
      }
    });
  }

  if (!isRecord(value.confidence)) {
    issues.push({ path: `${path}.confidence`, message: "Expected confidence metadata." });
  } else {
    if (typeof value.confidence.score !== "number" || value.confidence.score < 0 || value.confidence.score > 1) {
      issues.push({ path: `${path}.confidence.score`, message: "Expected a score between 0 and 1." });
    }
    if (!BASES.has(value.confidence.basis as AssessmentEvidenceBasis)) {
      issues.push({ path: `${path}.confidence.basis`, message: "Expected a supported evidence basis." });
    }
    if (!VERIFICATIONS.has(value.confidence.verification as AssessmentVerification)) {
      issues.push({ path: `${path}.confidence.verification`, message: "Expected a supported verification state." });
    }
  }
}

export function assessmentLifecycleState(assessment: Pick<Assessment, "kind" | "confidence">): AssessmentLifecycleState {
  if (assessment.confidence.verification === "operator_confirmed") return "operator_confirmed";
  if (assessment.kind === "opportunity") return "opportunity_only";
  if (assessment.kind === "model_diagnostic") return "diagnostic_only";
  if (assessment.confidence.verification === "verified") return "verified";
  if (assessment.confidence.verification === "independently_confirmed") return "independently_confirmed";
  if (assessment.confidence.verification === "corroborated") return "tool_corroborated";
  if (assessment.kind === "semantic_claim" || assessment.confidence.basis === "semantic") return "model_proposed";
  return "evidence_observed";
}

export function isAssessmentLifecycleState(value: unknown): value is AssessmentLifecycleState {
  return typeof value === "string" && LIFECYCLE_STATES.has(value as AssessmentLifecycleState);
}

function assessmentFusionKey(assessment: Assessment): string {
  const scope = assessment.files && assessment.files.length > 0
    ? `files:${uniqueSorted(assessment.files).join("|")}`
    : `subjects:${uniqueSorted(assessment.subjects).join("|")}`;
  return `${assessment.rootCauseKey}\u0000${assessment.type}\u0000${scope}`;
}

function requireString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.trim().length === 0) issues.push({ path, message: "Expected a non-empty string." });
}

function validateStringArray(value: unknown, path: string, issues: ValidationIssue[], nonEmpty: boolean): void {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0) || value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    issues.push({ path, message: nonEmpty ? "Expected a non-empty string array." : "Expected a string array." });
  }
}

function normalizeRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const byKey = new Map<string, ArtifactRef>();
  for (const ref of refs) byKey.set(`${ref.type}:${ref.id}:${ref.schemaVersion}`, ref);
  return [...byKey.values()].sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function countBy<T>(values: T[], select: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = select(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function kindRank(kind: AssessmentKind): number {
  return kind === "risk" ? 4 : kind === "opportunity" ? 3 : kind === "semantic_claim" ? 2 : 1;
}

function impactRank(impact: AssessmentImpact): number {
  return impact === "critical" ? 4 : impact === "high" ? 3 : impact === "medium" ? 2 : 1;
}

function verificationRank(verification: AssessmentVerification): number {
  return verification === "operator_confirmed"
    ? 5
    : verification === "verified"
      ? 4
      : verification === "independently_confirmed"
        ? 3
        : verification === "corroborated"
          ? 2
          : 1;
}

function validateJudgmentPolicy(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.policy", message: "Expected judgment policy metadata." });
    return;
  }
  if (value.mode !== "auto" && value.mode !== "required") {
    issues.push({ path: "$.policy.mode", message: "Expected auto or required." });
  }
  for (const key of ["provider", "model", "promptVersion", "coercionVersion"] as const) {
    requireString(value[key], `$.policy.${key}`, issues);
  }
  for (const key of ["maxCandidates", "maxSourceChars"] as const) {
    if (typeof value[key] !== "number" || !Number.isInteger(value[key]) || value[key] < 0) {
      issues.push({ path: `$.policy.${key}`, message: "Expected a non-negative integer." });
    }
  }
}

function validateJudgmentSummary(
  value: unknown,
  judgments: unknown,
  policy: unknown,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.summary", message: "Expected a judgment summary." });
    return;
  }
  for (const key of [
    "candidates",
    "selected",
    "confirmed",
    "rejected",
    "insufficientEvidence",
    "verificationRequired",
    "failed",
    "skipped",
  ] as const) {
    if (typeof value[key] !== "number" || !Number.isInteger(value[key]) || value[key] < 0) {
      issues.push({ path: `$.summary.${key}`, message: "Expected a non-negative integer." });
    }
  }
  for (const key of ["inputTokens", "outputTokens", "reasoningTokens"] as const) {
    if (value[key] !== undefined && (typeof value[key] !== "number" || !Number.isInteger(value[key]) || value[key] < 0)) {
      issues.push({ path: `$.summary.${key}`, message: "Expected a non-negative integer when present." });
    }
  }
  if (!Array.isArray(judgments)) return;
  const candidates = value.candidates;
  const selected = value.selected;
  const skipped = value.skipped;
  if (typeof candidates === "number" && typeof selected === "number" && selected > candidates) {
    issues.push({ path: "$.summary.selected", message: "Selected candidates cannot exceed candidate count." });
  }
  if (typeof selected === "number" && selected < judgments.length) {
    issues.push({ path: "$.summary.selected", message: "Selected candidates cannot be fewer than recorded judgments." });
  }
  if (
    isRecord(policy)
    && typeof policy.maxCandidates === "number"
    && typeof selected === "number"
    && selected > policy.maxCandidates
  ) {
    issues.push({ path: "$.summary.selected", message: "Selected candidates exceed the declared policy limit." });
  }
  if (
    typeof candidates === "number"
    && typeof skipped === "number"
    && skipped !== candidates - judgments.length
  ) {
    issues.push({ path: "$.summary.skipped", message: "Skipped count must equal candidates without recorded judgments." });
  }

  const expectedCounts = {
    confirmed: 0,
    rejected: 0,
    insufficientEvidence: 0,
    verificationRequired: 0,
    failed: 0,
  };
  for (const judgment of judgments) {
    if (!isRecord(judgment)) continue;
    if (judgment.verdict === "confirmed") expectedCounts.confirmed += 1;
    if (judgment.verdict === "rejected") expectedCounts.rejected += 1;
    if (judgment.verdict === "insufficient_evidence") expectedCounts.insufficientEvidence += 1;
    if (judgment.verdict === "verification_required") expectedCounts.verificationRequired += 1;
    if (judgment.verdict === "failed") expectedCounts.failed += 1;
  }
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (value[key] !== expected) {
      issues.push({ path: `$.summary.${key}`, message: `Expected ${expected} from recorded judgments.` });
    }
  }
}

function validateAssessmentJudgment(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  requireString(value.assessmentId, `${path}.assessmentId`, issues);
  requireString(value.assessmentSignature, `${path}.assessmentSignature`, issues);
  requireString(value.rootCauseKey, `${path}.rootCauseKey`, issues);
  if (!JUDGMENT_VERDICTS.has(value.verdict as AssessmentJudgmentVerdict)) {
    issues.push({ path: `${path}.verdict`, message: "Expected a supported judgment verdict." });
  }
  requireString(value.rationale, `${path}.rationale`, issues);
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) {
    issues.push({ path: `${path}.confidence`, message: "Expected a score between 0 and 1." });
  }
  if (!Array.isArray(value.evidence)) {
    issues.push({ path: `${path}.evidence`, message: "Expected an array." });
  } else {
    value.evidence.forEach((entry, index) => validateJudgmentEvidence(entry, `${path}.evidence[${index}]`, issues));
    if ((value.verdict === "confirmed" || value.verdict === "rejected") && value.evidence.length === 0) {
      issues.push({ path: `${path}.evidence`, message: "Confirmed and rejected judgments require current source evidence." });
    }
  }
  if (value.recommendedVerification !== undefined) {
    validateStringArray(value.recommendedVerification, `${path}.recommendedVerification`, issues, false);
  }
  if (value.warnings !== undefined) validateStringArray(value.warnings, `${path}.warnings`, issues, false);
}

function validateJudgmentEvidence(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  requireString(value.path, `${path}.path`, issues);
  requireString(value.sha256, `${path}.sha256`, issues);
  requireString(value.excerpt, `${path}.excerpt`, issues);
  for (const key of ["lineStart", "lineEnd"] as const) {
    if (typeof value[key] !== "number" || !Number.isInteger(value[key]) || value[key] < 1) {
      issues.push({ path: `${path}.${key}`, message: "Expected a positive integer." });
    }
  }
  if (typeof value.lineStart === "number" && typeof value.lineEnd === "number" && value.lineEnd < value.lineStart) {
    issues.push({ path: `${path}.lineEnd`, message: "Expected lineEnd to be at or after lineStart." });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

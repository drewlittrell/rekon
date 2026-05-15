import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";

export type FindingSeverity = "critical" | "high" | "medium" | "low";
export type FindingStatus = "new" | "existing" | "resolved" | "accepted" | "ignored";

export type Finding = {
  id: string;
  type: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  subjects: string[];
  files?: string[];
  ruleId?: string;
  suggestedAction?: string;
  evidence?: ArtifactRef[];
  status?: FindingStatus;
};

export type FindingReport = {
  header: ArtifactHeader;
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  findings: Finding[];
};

const SEVERITIES = new Set<FindingSeverity>(["critical", "high", "medium", "low"]);

export function createFindingReport(input: { header: ArtifactHeader; findings: Finding[] }): FindingReport {
  const findings = input.findings
    .map((finding) => ({
      ...finding,
      subjects: uniqueSorted(finding.subjects),
      files: finding.files ? uniqueSorted(finding.files) : undefined,
      evidence: finding.evidence ? normalizeRefs(finding.evidence) : undefined,
      status: finding.status ?? "new",
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return assertFindingReport({
    header: input.header,
    summary: summarizeFindings(findings),
    findings,
  });
}

export function summarizeFindings(findings: Finding[]): FindingReport["summary"] {
  return {
    total: findings.length,
    bySeverity: countBy(findings, (finding) => finding.severity),
    byType: countBy(findings, (finding) => finding.type),
  };
}

export function validateFindingReport(value: unknown): ValidationResult<FindingReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);

  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "FindingReport") {
    issues.push({ path: "$.header.artifactType", message: "Expected artifactType to be FindingReport." });
  }

  if (!isRecord(value.summary) || typeof value.summary.total !== "number") {
    issues.push({ path: "$.summary", message: "Expected a finding summary." });
  }

  if (!Array.isArray(value.findings)) {
    issues.push({ path: "$.findings", message: "Expected an array." });
  } else {
    value.findings.forEach((finding, index) => validateFinding(finding, `$.findings[${index}]`, issues));
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: value as FindingReport, issues: [] };
}

export function assertFindingReport(value: unknown): FindingReport {
  const result = validateFindingReport(value);

  if (result.ok) {
    return result.value;
  }

  throw new TypeError(`FindingReport validation failed: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
}

export const findingReportSchema: ArtifactSchema<FindingReport> = {
  validate: validateFindingReport,
  parse: assertFindingReport,
};

export type FindingStatusDecisionReason =
  | "accepted-risk"
  | "false-positive"
  | "fixed"
  | "not-actionable"
  | "other";

export type FindingStatusDecisionStatus = "accepted" | "ignored" | "resolved";

export type FindingStatusDecision = {
  id: string;
  findingId: string;
  status: FindingStatusDecisionStatus;
  note: string;
  reason?: FindingStatusDecisionReason;
  updatedAt: string;
  updatedBy?: string;
  source: "operator" | "system";
  appliesTo?: {
    type?: string;
    ruleId?: string;
    files?: string[];
    subjects?: string[];
  };
  evidence?: ArtifactRef[];
};

export type FindingStatusLedger = {
  header: ArtifactHeader;
  decisions: FindingStatusDecision[];
};

export type EffectiveFindingLifecycle = {
  firstSeenReportId?: string;
  lastSeenReportId?: string;
  presentInLatestReport: boolean;
};

export type EffectiveFinding = Finding & {
  effectiveStatus: FindingStatus;
  statusSource: "report" | "ledger" | "derived";
  statusDecisionId?: string;
  statusNote?: string;
  statusReason?: FindingStatusDecisionReason;
  lifecycle?: EffectiveFindingLifecycle;
};

export type FindingLifecycleReport = {
  header: ArtifactHeader;
  summary: {
    total: number;
    active: number;
    new: number;
    existing: number;
    accepted: number;
    ignored: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  findings: EffectiveFinding[];
  resolvedFindings: EffectiveFinding[];
  decisions: FindingStatusDecision[];
};

const FINDING_STATUS_DECISION_STATUSES = new Set<FindingStatusDecisionStatus>([
  "accepted",
  "ignored",
  "resolved",
]);

const FINDING_STATUS_DECISION_REASONS = new Set<FindingStatusDecisionReason>([
  "accepted-risk",
  "false-positive",
  "fixed",
  "not-actionable",
  "other",
]);

const STATUSES = new Set<FindingStatus>([
  "new",
  "existing",
  "resolved",
  "accepted",
  "ignored",
]);

export function createFindingStatusLedger(input: {
  header: ArtifactHeader;
  decisions: FindingStatusDecision[];
}): FindingStatusLedger {
  const decisions = input.decisions
    .map((decision) => normalizeDecision(decision))
    .sort((left, right) => {
      const findingDiff = left.findingId.localeCompare(right.findingId);
      if (findingDiff !== 0) return findingDiff;
      return left.updatedAt.localeCompare(right.updatedAt);
    });

  return assertFindingStatusLedger({
    header: input.header,
    decisions,
  });
}

export function validateFindingStatusLedger(
  value: unknown,
): ValidationResult<FindingStatusLedger> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);

  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "FindingStatusLedger") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be FindingStatusLedger.",
    });
  }

  if (!Array.isArray(value.decisions)) {
    issues.push({ path: "$.decisions", message: "Expected an array." });
  } else {
    value.decisions.forEach((decision, index) =>
      validateDecision(decision, `$.decisions[${index}]`, issues),
    );
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as FindingStatusLedger, issues: [] };
}

export function assertFindingStatusLedger(value: unknown): FindingStatusLedger {
  const result = validateFindingStatusLedger(value);

  if (result.ok) {
    return result.value;
  }

  throw new TypeError(
    `FindingStatusLedger validation failed: ${result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const findingStatusLedgerSchema: ArtifactSchema<FindingStatusLedger> = {
  validate: validateFindingStatusLedger,
  parse: assertFindingStatusLedger,
};

export function createFindingLifecycleReport(input: {
  header: ArtifactHeader;
  findings: EffectiveFinding[];
  resolvedFindings: EffectiveFinding[];
  decisions: FindingStatusDecision[];
}): FindingLifecycleReport {
  const findings = [...input.findings].sort((left, right) => left.id.localeCompare(right.id));
  const resolvedFindings = [...input.resolvedFindings].sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  return assertFindingLifecycleReport({
    header: input.header,
    summary: summarizeLifecycle(findings, resolvedFindings),
    findings,
    resolvedFindings,
    decisions: input.decisions
      .map((decision) => normalizeDecision(decision))
      .sort((left, right) => {
        const findingDiff = left.findingId.localeCompare(right.findingId);
        if (findingDiff !== 0) return findingDiff;
        return left.updatedAt.localeCompare(right.updatedAt);
      }),
  });
}

export function validateFindingLifecycleReport(
  value: unknown,
): ValidationResult<FindingLifecycleReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);

  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "FindingLifecycleReport") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be FindingLifecycleReport.",
    });
  }

  if (!isRecord(value.summary) || typeof value.summary.total !== "number") {
    issues.push({ path: "$.summary", message: "Expected a lifecycle summary." });
  }

  if (!Array.isArray(value.findings)) {
    issues.push({ path: "$.findings", message: "Expected an array." });
  } else {
    value.findings.forEach((finding, index) =>
      validateEffectiveFinding(finding, `$.findings[${index}]`, issues),
    );
  }

  if (!Array.isArray(value.resolvedFindings)) {
    issues.push({ path: "$.resolvedFindings", message: "Expected an array." });
  } else {
    value.resolvedFindings.forEach((finding, index) =>
      validateEffectiveFinding(finding, `$.resolvedFindings[${index}]`, issues),
    );
  }

  if (!Array.isArray(value.decisions)) {
    issues.push({ path: "$.decisions", message: "Expected an array." });
  } else {
    value.decisions.forEach((decision, index) =>
      validateDecision(decision, `$.decisions[${index}]`, issues),
    );
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as FindingLifecycleReport, issues: [] };
}

export function assertFindingLifecycleReport(value: unknown): FindingLifecycleReport {
  const result = validateFindingLifecycleReport(value);

  if (result.ok) {
    return result.value;
  }

  throw new TypeError(
    `FindingLifecycleReport validation failed: ${result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const findingLifecycleReportSchema: ArtifactSchema<FindingLifecycleReport> = {
  validate: validateFindingLifecycleReport,
  parse: assertFindingLifecycleReport,
};

export type IssueAdjudicationStatus =
  | "active"
  | "accepted"
  | "ignored"
  | "resolved"
  | "mixed";

export type IssueAdjudicationGroup = {
  id: string;
  canonicalFindingId: string;
  memberFindingIds: string[];
  type: string;
  ruleId?: string;
  severity: FindingSeverity;
  status: IssueAdjudicationStatus;
  active: boolean;
  title: string;
  description: string;
  files: string[];
  subjects: string[];
  systems?: string[];
  suggestedAction?: string;
  evidence?: ArtifactRef[];
  groupingKey: string;
  groupingReasons: string[];
  statusBreakdown: Record<string, number>;
};

export type IssueAdjudicationSummary = {
  totalGroups: number;
  activeGroups: number;
  acceptedGroups: number;
  ignoredGroups: number;
  resolvedGroups: number;
  mixedGroups: number;
  totalFindings: number;
  groupedFindings: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  mergeCandidates?: number;
};

export type IssueMergeCandidateStrength = "strong" | "medium" | "weak";

export type IssueMergeCandidateReason =
  | "same-file"
  | "overlapping-files"
  | "same-subject"
  | "overlapping-subjects"
  | "same-severity"
  | "related-type-prefix"
  | "same-suggested-action"
  | "shared-system";

export type IssueMergeCandidate = {
  id: string;
  groupIds: string[];
  memberFindingIds: string[];
  strength: IssueMergeCandidateStrength;
  reasons: IssueMergeCandidateReason[];
  confidence: number;
  status: "candidate";
  note: string;
};

export type IssueAdjudicationReport = {
  header: ArtifactHeader;
  summary: IssueAdjudicationSummary;
  groups: IssueAdjudicationGroup[];
  mergeCandidates?: IssueMergeCandidate[];
};

export type IssueAdjudicationInput = {
  findings: EffectiveFinding[];
  resolvedFindings?: EffectiveFinding[];
  systemsForFinding?: (finding: EffectiveFinding) => string[] | undefined;
};

const ISSUE_MERGE_CANDIDATE_STRENGTHS = new Set<IssueMergeCandidateStrength>([
  "strong",
  "medium",
  "weak",
]);

const ISSUE_MERGE_CANDIDATE_REASONS = new Set<IssueMergeCandidateReason>([
  "same-file",
  "overlapping-files",
  "same-subject",
  "overlapping-subjects",
  "same-severity",
  "related-type-prefix",
  "same-suggested-action",
  "shared-system",
]);

const STRENGTH_RANK: Record<IssueMergeCandidateStrength, number> = {
  strong: 0,
  medium: 1,
  weak: 2,
};

const MERGE_CANDIDATE_MIN_CONFIDENCE = 0.45;
const MERGE_CANDIDATE_STRONG_THRESHOLD = 0.7;
const MERGE_CANDIDATE_MEDIUM_THRESHOLD = 0.45;
const MERGE_CANDIDATE_MAX = 50;

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const ISSUE_ADJUDICATION_STATUSES = new Set<IssueAdjudicationStatus>([
  "active",
  "accepted",
  "ignored",
  "resolved",
  "mixed",
]);

export function deriveIssueAdjudication(input: IssueAdjudicationInput): {
  groups: IssueAdjudicationGroup[];
  summary: IssueAdjudicationSummary;
  mergeCandidates: IssueMergeCandidate[];
} {
  const members: EffectiveFinding[] = [
    ...input.findings,
    ...(input.resolvedFindings ?? []),
  ];
  const buckets = new Map<string, { reasons: string[]; members: EffectiveFinding[] }>();

  for (const finding of members) {
    const { key, reasons } = computeGroupingKey(finding);
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.members.push(finding);
    } else {
      buckets.set(key, { reasons, members: [finding] });
    }
  }

  const groups: IssueAdjudicationGroup[] = [];

  for (const [groupingKey, bucket] of buckets) {
    const canonical = pickCanonicalFinding(bucket.members);
    const memberIds = bucket.members.map((finding) => finding.id);
    const sortedMemberIds = [...new Set(memberIds)].sort((left, right) =>
      left.localeCompare(right),
    );
    const severity = pickHighestSeverity(bucket.members);
    const statusBreakdown = countBy(bucket.members, (finding) => finding.effectiveStatus);
    const status = pickGroupStatus(bucket.members);
    const active = bucket.members.some(
      (finding) => finding.effectiveStatus === "new" || finding.effectiveStatus === "existing",
    );
    const files = unionSorted(bucket.members.map((finding) => finding.files ?? []));
    const subjects = unionSorted(bucket.members.map((finding) => finding.subjects ?? []));
    const evidence = mergeEvidence(bucket.members);
    const systems = input.systemsForFinding
      ? unionSorted(bucket.members.map((finding) => input.systemsForFinding!(finding) ?? []))
      : undefined;
    const suggestedAction = canonical.suggestedAction;
    const groupId = `issue-${canonical.id}`;

    groups.push({
      id: groupId,
      canonicalFindingId: canonical.id,
      memberFindingIds: sortedMemberIds,
      type: canonical.type,
      ruleId: canonical.ruleId,
      severity,
      status,
      active,
      title: canonical.title,
      description: canonical.description,
      files,
      subjects,
      systems: systems && systems.length > 0 ? systems : undefined,
      suggestedAction,
      evidence: evidence.length > 0 ? evidence : undefined,
      groupingKey,
      groupingReasons: bucket.reasons,
      statusBreakdown,
    });
  }

  groups.sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    const severityDiff = SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return left.id.localeCompare(right.id);
  });

  const mergeCandidates = deriveMergeCandidates(groups);
  const summary = summarizeAdjudication(groups, members.length);
  summary.mergeCandidates = mergeCandidates.length;

  return { groups, summary, mergeCandidates };
}

export function deriveMergeCandidates(
  groups: IssueAdjudicationGroup[],
): IssueMergeCandidate[] {
  const candidates: IssueMergeCandidate[] = [];

  for (let leftIdx = 0; leftIdx < groups.length; leftIdx += 1) {
    for (let rightIdx = leftIdx + 1; rightIdx < groups.length; rightIdx += 1) {
      const left = groups[leftIdx]!;
      const right = groups[rightIdx]!;

      // Skip pairs where both groups are inactive — keeps noise down.
      if (!left.active && !right.active) {
        continue;
      }

      // Skip pairs that already share the same grouping key (would have
      // been merged into one group by deterministic grouping).
      if (left.groupingKey === right.groupingKey) {
        continue;
      }

      const evaluation = evaluateMergeCandidate(left, right);

      if (evaluation.confidence < MERGE_CANDIDATE_MIN_CONFIDENCE) {
        continue;
      }

      // Mixed-activity pairs require strong confidence to surface.
      if (
        (left.active !== right.active)
        && evaluation.confidence < MERGE_CANDIDATE_STRONG_THRESHOLD
      ) {
        continue;
      }

      const cappedConfidence = Math.min(1, evaluation.confidence);
      const strength = strengthForConfidence(cappedConfidence);
      const sortedGroupIds = [left.id, right.id].sort((a, b) => a.localeCompare(b));
      const sortedMemberIds = unionSorted([left.memberFindingIds, right.memberFindingIds]);

      const eitherInactive = !left.active || !right.active;
      const noteParts = [
        `Possible cross-rule overlap between ${left.id} (${left.type}) and ${right.id} (${right.type}).`,
        eitherInactive
          ? "One or more candidate groups are accepted, ignored, or resolved; review before acting."
          : null,
      ].filter((part): part is string => Boolean(part));

      candidates.push({
        id: `merge-candidate:${sortedGroupIds.join(":")}`,
        groupIds: sortedGroupIds,
        memberFindingIds: sortedMemberIds,
        strength,
        reasons: evaluation.reasons,
        confidence: Number(cappedConfidence.toFixed(3)),
        status: "candidate",
        note: noteParts.join(" "),
      });
    }
  }

  candidates.sort((left, right) => {
    if (left.strength !== right.strength) {
      return STRENGTH_RANK[left.strength] - STRENGTH_RANK[right.strength];
    }
    if (left.confidence !== right.confidence) {
      return right.confidence - left.confidence;
    }
    return left.id.localeCompare(right.id);
  });

  return candidates.slice(0, MERGE_CANDIDATE_MAX);
}

function evaluateMergeCandidate(
  left: IssueAdjudicationGroup,
  right: IssueAdjudicationGroup,
): { confidence: number; reasons: IssueMergeCandidateReason[] } {
  const reasons: IssueMergeCandidateReason[] = [];
  let confidence = 0;

  // Files
  const leftFiles = new Set(left.files ?? []);
  const rightFiles = new Set(right.files ?? []);
  if (leftFiles.size > 0 && rightFiles.size > 0) {
    if (sameSet(leftFiles, rightFiles)) {
      reasons.push("same-file");
      confidence += 0.35;
    } else if (anyOverlap(leftFiles, rightFiles)) {
      reasons.push("overlapping-files");
      confidence += 0.35;
    }
  }

  // Subjects
  const leftSubjects = new Set(left.subjects ?? []);
  const rightSubjects = new Set(right.subjects ?? []);
  if (leftSubjects.size > 0 && rightSubjects.size > 0) {
    if (sameSet(leftSubjects, rightSubjects)) {
      reasons.push("same-subject");
      confidence += 0.3;
    } else if (anyOverlap(leftSubjects, rightSubjects)) {
      reasons.push("overlapping-subjects");
      confidence += 0.3;
    }
  }

  // Severity
  if (left.severity === right.severity) {
    reasons.push("same-severity");
    confidence += 0.1;
  }

  // Related type prefix (only when both types contain ".")
  const leftPrefix = typePrefix(left.type);
  const rightPrefix = typePrefix(right.type);
  if (
    leftPrefix
    && rightPrefix
    && leftPrefix === rightPrefix
    && left.type !== right.type
  ) {
    reasons.push("related-type-prefix");
    confidence += 0.15;
  }

  // Suggested action category
  const leftCategory = suggestedActionCategory(left);
  const rightCategory = suggestedActionCategory(right);
  if (leftCategory && rightCategory && leftCategory === rightCategory) {
    reasons.push("same-suggested-action");
    confidence += 0.15;
  }

  // Shared system
  const leftSystems = new Set(left.systems ?? []);
  const rightSystems = new Set(right.systems ?? []);
  if (
    leftSystems.size > 0
    && rightSystems.size > 0
    && anyOverlap(leftSystems, rightSystems)
  ) {
    reasons.push("shared-system");
    confidence += 0.15;
  }

  // A candidate must have at least two signals.
  if (reasons.length < 2) {
    return { confidence: 0, reasons: [] };
  }

  return { confidence, reasons };
}

function typePrefix(type: string): string | undefined {
  const dot = type.indexOf(".");
  if (dot <= 0) {
    return undefined;
  }
  return type.slice(0, dot);
}

const SUGGESTED_ACTION_KEYWORD_BUCKETS: Array<{
  category: string;
  keywords: string[];
}> = [
  { category: "import", keywords: ["import"] },
  {
    category: "generated-output",
    keywords: ["generated", "dist", "build"],
  },
  { category: "verification", keywords: ["test", "verify"] },
  {
    category: "documentation",
    keywords: ["doc", "documentation", "readme", "agents"],
  },
  {
    category: "ownership-boundary",
    keywords: ["owner", "system", "boundary"],
  },
];

function suggestedActionCategory(group: IssueAdjudicationGroup): string | undefined {
  const haystack = [group.suggestedAction ?? "", group.title ?? "", group.type ?? ""]
    .join(" ")
    .toLowerCase();
  if (haystack.trim().length === 0) {
    return undefined;
  }
  for (const bucket of SUGGESTED_ACTION_KEYWORD_BUCKETS) {
    if (bucket.keywords.some((keyword) => haystack.includes(keyword))) {
      return bucket.category;
    }
  }
  return undefined;
}

function strengthForConfidence(confidence: number): IssueMergeCandidateStrength {
  if (confidence >= MERGE_CANDIDATE_STRONG_THRESHOLD) {
    return "strong";
  }
  if (confidence >= MERGE_CANDIDATE_MEDIUM_THRESHOLD) {
    return "medium";
  }
  return "weak";
}

function sameSet<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function anyOverlap<T>(left: Set<T>, right: Set<T>): boolean {
  for (const value of left) {
    if (right.has(value)) return true;
  }
  return false;
}

export function createIssueAdjudicationReport(input: {
  header: ArtifactHeader;
  findings: EffectiveFinding[];
  resolvedFindings?: EffectiveFinding[];
  systemsForFinding?: (finding: EffectiveFinding) => string[] | undefined;
}): IssueAdjudicationReport {
  const { groups, summary, mergeCandidates } = deriveIssueAdjudication({
    findings: input.findings,
    resolvedFindings: input.resolvedFindings,
    systemsForFinding: input.systemsForFinding,
  });

  return assertIssueAdjudicationReport({
    header: input.header,
    summary,
    groups,
    mergeCandidates: mergeCandidates.length > 0 ? mergeCandidates : undefined,
  });
}

export function validateIssueAdjudicationReport(
  value: unknown,
): ValidationResult<IssueAdjudicationReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);

  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "IssueAdjudicationReport") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be IssueAdjudicationReport.",
    });
  }

  if (!isRecord(value.summary) || typeof (value.summary as Record<string, unknown>).totalGroups !== "number") {
    issues.push({ path: "$.summary", message: "Expected an adjudication summary." });
  }

  if (!Array.isArray(value.groups)) {
    issues.push({ path: "$.groups", message: "Expected an array." });
  } else {
    value.groups.forEach((group, index) =>
      validateAdjudicationGroup(group, `$.groups[${index}]`, issues),
    );
  }

  if (value.mergeCandidates !== undefined) {
    if (!Array.isArray(value.mergeCandidates)) {
      issues.push({ path: "$.mergeCandidates", message: "Expected an array when present." });
    } else {
      value.mergeCandidates.forEach((candidate, index) =>
        validateMergeCandidate(candidate, `$.mergeCandidates[${index}]`, issues),
      );
    }
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as IssueAdjudicationReport, issues: [] };
}

export function assertIssueAdjudicationReport(value: unknown): IssueAdjudicationReport {
  const result = validateIssueAdjudicationReport(value);

  if (result.ok) {
    return result.value;
  }

  throw new TypeError(
    `IssueAdjudicationReport validation failed: ${result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const issueAdjudicationReportSchema: ArtifactSchema<IssueAdjudicationReport> = {
  validate: validateIssueAdjudicationReport,
  parse: assertIssueAdjudicationReport,
};

function computeGroupingKey(finding: EffectiveFinding): { key: string; reasons: string[] } {
  const reasons: string[] = ["same-type"];
  const type = finding.type;
  const ruleId = finding.ruleId ?? "";
  const files = uniqueSorted(finding.files ?? []);
  const subjects = uniqueSorted(finding.subjects ?? []);

  if (ruleId.length > 0) {
    reasons.push("same-rule");
  }

  let locationSegment: string;

  if (files.length > 0) {
    reasons.push("same-files");
    locationSegment = `files=${files.join(",")}`;
  } else if (subjects.length > 0) {
    reasons.push("same-subjects");
    locationSegment = `subjects=${subjects.join(",")}`;
  } else {
    reasons.push("singleton-no-grouping-key");
    locationSegment = `singleton=${finding.id}`;
  }

  return {
    key: `${type}|${ruleId}|${locationSegment}`,
    reasons,
  };
}

function pickCanonicalFinding(members: EffectiveFinding[]): EffectiveFinding {
  return [...members].sort((left, right) => {
    const leftActive = left.effectiveStatus === "new" || left.effectiveStatus === "existing";
    const rightActive = right.effectiveStatus === "new" || right.effectiveStatus === "existing";

    if (leftActive !== rightActive) {
      return leftActive ? -1 : 1;
    }

    const severityDiff = SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return left.id.localeCompare(right.id);
  })[0]!;
}

function pickHighestSeverity(members: EffectiveFinding[]): FindingSeverity {
  let best: FindingSeverity = "low";

  for (const finding of members) {
    if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[best]) {
      best = finding.severity;
    }
  }

  return best;
}

function pickGroupStatus(members: EffectiveFinding[]): IssueAdjudicationStatus {
  const statuses = new Set(members.map((finding) => finding.effectiveStatus));
  const allActive = [...statuses].every((status) => status === "new" || status === "existing");

  if (allActive) {
    return "active";
  }

  if (statuses.size === 1) {
    const only = [...statuses][0];

    if (only === "accepted" || only === "ignored" || only === "resolved") {
      return only;
    }
  }

  return "mixed";
}

function unionSorted(lists: ReadonlyArray<ReadonlyArray<string>>): string[] {
  const set = new Set<string>();

  for (const list of lists) {
    for (const value of list) {
      if (typeof value === "string" && value.length > 0) {
        set.add(value);
      }
    }
  }

  return [...set].sort((left, right) => left.localeCompare(right));
}

function mergeEvidence(members: EffectiveFinding[]): ArtifactRef[] {
  const seen = new Set<string>();
  const refs: ArtifactRef[] = [];

  for (const finding of members) {
    for (const ref of finding.evidence ?? []) {
      const key = `${ref.type}|${ref.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push(ref);
      }
    }
  }

  return refs;
}

function summarizeAdjudication(
  groups: IssueAdjudicationGroup[],
  totalFindings: number,
): IssueAdjudicationSummary {
  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let activeGroups = 0;
  let acceptedGroups = 0;
  let ignoredGroups = 0;
  let resolvedGroups = 0;
  let mixedGroups = 0;
  let groupedFindings = 0;

  for (const group of groups) {
    bySeverity[group.severity] = (bySeverity[group.severity] ?? 0) + 1;
    byType[group.type] = (byType[group.type] ?? 0) + 1;
    groupedFindings += group.memberFindingIds.length;

    switch (group.status) {
      case "active":
        activeGroups += 1;
        break;
      case "accepted":
        acceptedGroups += 1;
        break;
      case "ignored":
        ignoredGroups += 1;
        break;
      case "resolved":
        resolvedGroups += 1;
        break;
      case "mixed":
        mixedGroups += 1;
        break;
    }
  }

  return {
    totalGroups: groups.length,
    activeGroups,
    acceptedGroups,
    ignoredGroups,
    resolvedGroups,
    mixedGroups,
    totalFindings,
    groupedFindings,
    bySeverity,
    byType,
  };
}

function validateAdjudicationGroup(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  requiredString(value.id, `${path}.id`, issues);
  requiredString(value.canonicalFindingId, `${path}.canonicalFindingId`, issues);
  requiredString(value.type, `${path}.type`, issues);
  requiredString(value.title, `${path}.title`, issues);
  requiredString(value.description, `${path}.description`, issues);
  requiredString(value.groupingKey, `${path}.groupingKey`, issues);

  if (!isStringArray(value.memberFindingIds) || value.memberFindingIds.length === 0) {
    issues.push({ path: `${path}.memberFindingIds`, message: "Expected a non-empty array of strings." });
  }

  if (!isStringArray(value.files)) {
    issues.push({ path: `${path}.files`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.subjects)) {
    issues.push({ path: `${path}.subjects`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.groupingReasons) || value.groupingReasons.length === 0) {
    issues.push({ path: `${path}.groupingReasons`, message: "Expected a non-empty array of strings." });
  }

  if (typeof value.severity !== "string" || !SEVERITIES.has(value.severity as FindingSeverity)) {
    issues.push({ path: `${path}.severity`, message: "Expected a valid finding severity." });
  }

  if (typeof value.status !== "string" || !ISSUE_ADJUDICATION_STATUSES.has(value.status as IssueAdjudicationStatus)) {
    issues.push({ path: `${path}.status`, message: "Expected a valid adjudication status." });
  }

  if (typeof value.active !== "boolean") {
    issues.push({ path: `${path}.active`, message: "Expected a boolean." });
  }

  if (!isRecord(value.statusBreakdown)) {
    issues.push({ path: `${path}.statusBreakdown`, message: "Expected an object." });
  }

  if (value.ruleId !== undefined && typeof value.ruleId !== "string") {
    issues.push({ path: `${path}.ruleId`, message: "Expected a string when present." });
  }

  if (value.systems !== undefined && !isStringArray(value.systems)) {
    issues.push({ path: `${path}.systems`, message: "Expected an array of strings when present." });
  }

  if (value.suggestedAction !== undefined && typeof value.suggestedAction !== "string") {
    issues.push({ path: `${path}.suggestedAction`, message: "Expected a string when present." });
  }

  if (value.evidence !== undefined) {
    if (!Array.isArray(value.evidence)) {
      issues.push({ path: `${path}.evidence`, message: "Expected an array of artifact refs when present." });
    } else {
      value.evidence.forEach((ref, index) => {
        const refResult = validateArtifactRef(ref);
        if (!refResult.ok) {
          issues.push(...prefixIssues(refResult.issues, `${path}.evidence[${index}]`));
        }
      });
    }
  }
}

function validateMergeCandidate(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  requiredString(value.id, `${path}.id`, issues);
  requiredString(value.note, `${path}.note`, issues);

  if (value.status !== "candidate") {
    issues.push({
      path: `${path}.status`,
      message: 'Expected status to be "candidate".',
    });
  }

  if (
    typeof value.strength !== "string"
    || !ISSUE_MERGE_CANDIDATE_STRENGTHS.has(value.strength as IssueMergeCandidateStrength)
  ) {
    issues.push({ path: `${path}.strength`, message: "Expected strong, medium, or weak." });
  }

  if (
    typeof value.confidence !== "number"
    || Number.isNaN(value.confidence)
    || value.confidence < 0
    || value.confidence > 1
  ) {
    issues.push({
      path: `${path}.confidence`,
      message: "Expected a number in [0, 1].",
    });
  }

  if (
    !Array.isArray(value.groupIds)
    || value.groupIds.length < 2
    || !value.groupIds.every((entry) => typeof entry === "string")
  ) {
    issues.push({
      path: `${path}.groupIds`,
      message: "Expected an array of at least two group ids (strings).",
    });
  }

  if (!isStringArray(value.memberFindingIds) || value.memberFindingIds.length === 0) {
    issues.push({
      path: `${path}.memberFindingIds`,
      message: "Expected a non-empty array of strings.",
    });
  }

  if (
    !Array.isArray(value.reasons)
    || value.reasons.length === 0
    || !value.reasons.every(
      (entry) =>
        typeof entry === "string"
        && ISSUE_MERGE_CANDIDATE_REASONS.has(entry as IssueMergeCandidateReason),
    )
  ) {
    issues.push({
      path: `${path}.reasons`,
      message: "Expected a non-empty array of known merge-candidate reasons.",
    });
  }
}

export type FindingLifecycleInput = {
  latestReport: FindingReport;
  previousReports?: FindingReport[];
  ledger?: FindingStatusLedger;
};

export function applyFindingStatusDecisions(
  findings: Finding[],
  ledger: FindingStatusLedger | undefined,
): EffectiveFinding[] {
  return findings.map((finding) => annotateWithLedger(toEffective(finding, "report"), ledger));
}

export function deriveFindingLifecycle(input: FindingLifecycleInput): {
  findings: EffectiveFinding[];
  resolvedFindings: EffectiveFinding[];
  decisions: FindingStatusDecision[];
} {
  const latestReportId = input.latestReport.header.artifactId;
  const previousReports = input.previousReports ?? [];
  const allReports = [...previousReports, input.latestReport];
  const firstSeen = new Map<string, string>();
  const lastSeenBefore = new Map<string, string>();
  const everPresent = new Set<string>();
  const previousById = new Map<string, Finding>();

  for (const report of allReports) {
    for (const finding of report.findings) {
      everPresent.add(finding.id);

      if (!firstSeen.has(finding.id)) {
        firstSeen.set(finding.id, report.header.artifactId);
      }

      if (report.header.artifactId !== latestReportId) {
        lastSeenBefore.set(finding.id, report.header.artifactId);
        previousById.set(finding.id, finding);
      }
    }
  }

  const latestById = new Map<string, Finding>();
  for (const finding of input.latestReport.findings) {
    latestById.set(finding.id, finding);
  }

  const ledger = input.ledger;
  const findings: EffectiveFinding[] = input.latestReport.findings.map((finding) => {
    const presence: EffectiveFindingLifecycle = {
      firstSeenReportId: firstSeen.get(finding.id),
      lastSeenReportId: latestReportId,
      presentInLatestReport: true,
    };
    const fromReport: EffectiveFinding = {
      ...finding,
      lifecycle: presence,
      effectiveStatus: previousById.has(finding.id) ? "existing" : "new",
      statusSource: "derived",
    };

    return annotateWithLedger(fromReport, ledger);
  });

  const resolvedFindings: EffectiveFinding[] = [];
  for (const [id, finding] of previousById) {
    if (latestById.has(id)) continue;
    const ledgerDecision = ledger ? findLatestDecisionForFinding(ledger, id) : undefined;
    const lifecycle: EffectiveFindingLifecycle = {
      firstSeenReportId: firstSeen.get(id),
      lastSeenReportId: lastSeenBefore.get(id),
      presentInLatestReport: false,
    };
    const baseStatus: FindingStatus = "resolved";
    const fromReport: EffectiveFinding = {
      ...finding,
      lifecycle,
      effectiveStatus: ledgerDecision && ledgerDecision.status !== "resolved"
        ? ledgerDecision.status
        : baseStatus,
      statusSource: ledgerDecision ? "ledger" : "derived",
      statusDecisionId: ledgerDecision?.id,
      statusNote: ledgerDecision?.note,
      statusReason: ledgerDecision?.reason,
    };

    resolvedFindings.push(fromReport);
  }

  const decisions: FindingStatusDecision[] = ledger
    ? ledger.decisions.map((decision) => normalizeDecision(decision))
    : [];

  return { findings, resolvedFindings, decisions };
}

function annotateWithLedger(
  finding: EffectiveFinding,
  ledger: FindingStatusLedger | undefined,
): EffectiveFinding {
  if (!ledger) {
    return finding;
  }

  const decision = findLatestDecisionForFinding(ledger, finding.id);

  if (!decision) {
    return finding;
  }

  return {
    ...finding,
    effectiveStatus: decision.status,
    statusSource: "ledger",
    statusDecisionId: decision.id,
    statusNote: decision.note,
    statusReason: decision.reason,
  };
}

export function findLatestDecisionForFinding(
  ledger: FindingStatusLedger,
  findingId: string,
): FindingStatusDecision | undefined {
  return ledger.decisions
    .filter((decision) => decision.findingId === findingId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function summarizeLifecycle(
  findings: EffectiveFinding[],
  resolvedFindings: EffectiveFinding[],
): FindingLifecycleReport["summary"] {
  const counts = {
    total: findings.length + resolvedFindings.length,
    active: 0,
    new: 0,
    existing: 0,
    accepted: 0,
    ignored: 0,
    resolved: 0,
  };

  for (const finding of findings) {
    switch (finding.effectiveStatus) {
      case "new":
        counts.new += 1;
        counts.active += 1;
        break;
      case "existing":
        counts.existing += 1;
        counts.active += 1;
        break;
      case "accepted":
        counts.accepted += 1;
        break;
      case "ignored":
        counts.ignored += 1;
        break;
      case "resolved":
        counts.resolved += 1;
        break;
    }
  }

  for (const finding of resolvedFindings) {
    switch (finding.effectiveStatus) {
      case "resolved":
        counts.resolved += 1;
        break;
      case "accepted":
        counts.accepted += 1;
        break;
      case "ignored":
        counts.ignored += 1;
        break;
      case "existing":
      case "new":
        counts.existing += 1;
        break;
    }
  }

  const allFindings = [...findings, ...resolvedFindings];

  return {
    ...counts,
    bySeverity: countBy(allFindings, (finding) => finding.severity),
    byType: countBy(allFindings, (finding) => finding.type),
  };
}

function toEffective(finding: Finding, source: EffectiveFinding["statusSource"]): EffectiveFinding {
  return {
    ...finding,
    effectiveStatus: finding.status ?? "new",
    statusSource: source,
  };
}

function normalizeDecision(decision: FindingStatusDecision): FindingStatusDecision {
  return {
    ...decision,
    appliesTo: decision.appliesTo
      ? {
        ...decision.appliesTo,
        files: decision.appliesTo.files ? uniqueSorted(decision.appliesTo.files) : undefined,
        subjects: decision.appliesTo.subjects
          ? uniqueSorted(decision.appliesTo.subjects)
          : undefined,
      }
      : undefined,
    evidence: decision.evidence ? normalizeRefs(decision.evidence) : undefined,
  };
}

function validateDecision(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  requiredString(value.id, `${path}.id`, issues);
  requiredString(value.findingId, `${path}.findingId`, issues);
  requiredString(value.updatedAt, `${path}.updatedAt`, issues);
  requiredString(value.note, `${path}.note`, issues);

  if (
    typeof value.status !== "string" ||
    !FINDING_STATUS_DECISION_STATUSES.has(value.status as FindingStatusDecisionStatus)
  ) {
    issues.push({
      path: `${path}.status`,
      message: "Expected accepted, ignored, or resolved.",
    });
  }

  if (
    typeof value.source !== "string" ||
    (value.source !== "operator" && value.source !== "system")
  ) {
    issues.push({ path: `${path}.source`, message: "Expected operator or system." });
  }

  if (
    value.reason !== undefined &&
    (typeof value.reason !== "string" ||
      !FINDING_STATUS_DECISION_REASONS.has(value.reason as FindingStatusDecisionReason))
  ) {
    issues.push({
      path: `${path}.reason`,
      message:
        "Expected one of accepted-risk, false-positive, fixed, not-actionable, other when present.",
    });
  }

  if (value.status === "ignored" && (typeof value.note !== "string" || value.note.trim().length === 0)) {
    issues.push({
      path: `${path}.note`,
      message: "Ignored findings require a non-empty note.",
    });
  }
}

function validateEffectiveFinding(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  validateFinding(value, path, issues);

  if (!isRecord(value)) {
    return;
  }

  const candidate = value as { effectiveStatus?: unknown; statusSource?: unknown };

  if (typeof candidate.effectiveStatus !== "string" || !STATUSES.has(candidate.effectiveStatus as FindingStatus)) {
    issues.push({
      path: `${path}.effectiveStatus`,
      message: "Expected one of new, existing, resolved, accepted, ignored.",
    });
  }

  if (
    typeof candidate.statusSource !== "string" ||
    (candidate.statusSource !== "report" &&
      candidate.statusSource !== "ledger" &&
      candidate.statusSource !== "derived")
  ) {
    issues.push({
      path: `${path}.statusSource`,
      message: "Expected report, ledger, or derived.",
    });
  }
}

function validateFinding(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  requiredString(value.id, `${path}.id`, issues);
  requiredString(value.type, `${path}.type`, issues);
  requiredString(value.title, `${path}.title`, issues);
  requiredString(value.description, `${path}.description`, issues);

  if (!SEVERITIES.has(value.severity as FindingSeverity)) {
    issues.push({ path: `${path}.severity`, message: "Expected critical, high, medium, or low." });
  }

  if (!isStringArray(value.subjects)) {
    issues.push({ path: `${path}.subjects`, message: "Expected an array of strings." });
  }

  if (value.files !== undefined && !isStringArray(value.files)) {
    issues.push({ path: `${path}.files`, message: "Expected an array of strings when present." });
  }

  if (value.evidence !== undefined) {
    if (!Array.isArray(value.evidence)) {
      issues.push({ path: `${path}.evidence`, message: "Expected an array of artifact refs." });
    } else {
      value.evidence.forEach((ref, index) => {
        const result = validateArtifactRef(ref);
        if (!result.ok) issues.push(...prefixIssues(result.issues, `${path}.evidence[${index}]`));
      });
    }
  }
}

function normalizeRefs(refs: ArtifactRef[]): ArtifactRef[] {
  return [...new Map(refs.map((ref) => [`${ref.type}:${ref.id}:${ref.path ?? ""}`, ref] as const)).values()]
    .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const value = key(item);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function requiredString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "Expected a non-empty string." });
  }
}

function prefixIssues(issues: ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({ path: issue.path.replace("$", prefix), message: issue.message }));
}

export type CoherencyDeltaSeverity = "critical" | "high" | "medium" | "low";

export type CoherencyDeltaItemStatus =
  | "new"
  | "existing"
  | "accepted"
  | "ignored"
  | "resolved";

export type CoherencyDeltaItem = {
  id: string;
  findingId: string;
  type: string;
  severity: CoherencyDeltaSeverity;
  title: string;
  description: string;
  files: string[];
  systems: string[];
  suggestedAction?: string;
  status: CoherencyDeltaItemStatus;
  active: boolean;
  evidence?: ArtifactRef[];
  // Group-aware fields (present only when the item was derived from an
  // IssueAdjudicationGroup; absent for lifecycle-finding-derived items).
  issueGroupId?: string;
  canonicalFindingId?: string;
  memberFindingIds?: string[];
  groupingReasons?: string[];
};

export type CoherencyRemediationPriority = "p0" | "p1" | "p2";

export type CoherencyRemediationStep = {
  id: string;
  priority: CoherencyRemediationPriority;
  findingId: string;
  title: string;
  action: string;
  files: string[];
  systems: string[];
  severity: CoherencyDeltaSeverity;
};

export type CoherencyDeltaSummary = {
  total: number;
  active: number;
  resolved: number;
  accepted: number;
  ignored: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  bySystem: Record<string, number>;
  topPaths: Array<{ path: string; count: number }>;
};

export type CoherencyDelta = {
  header: ArtifactHeader;
  summary: CoherencyDeltaSummary;
  items: CoherencyDeltaItem[];
  remediationQueue: CoherencyRemediationStep[];
};

const COHERENCY_SEVERITIES = new Set<CoherencyDeltaSeverity>([
  "critical",
  "high",
  "medium",
  "low",
]);

const COHERENCY_ITEM_STATUSES = new Set<CoherencyDeltaItemStatus>([
  "new",
  "existing",
  "accepted",
  "ignored",
  "resolved",
]);

const COHERENCY_PRIORITIES = new Set<CoherencyRemediationPriority>(["p0", "p1", "p2"]);

const SEVERITY_PRIORITY_RANK: Record<CoherencyDeltaSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_PRIORITY_RANK: Record<CoherencyDeltaItemStatus, number> = {
  new: 0,
  existing: 1,
  accepted: 2,
  ignored: 3,
  resolved: 4,
};

export function severityToPriority(
  severity: CoherencyDeltaSeverity,
): CoherencyRemediationPriority {
  switch (severity) {
    case "critical":
    case "high":
      return "p0";
    case "medium":
      return "p1";
    case "low":
      return "p2";
  }
}

export type CoherencyDeltaInput = {
  header: ArtifactHeader;
  // Lifecycle-finding-based input (the legacy v1 shape). Either supply
  // these three together, or supply `issueGroups` for v2 group-based
  // input. When both are present, `issueGroups` (non-empty) wins.
  findings?: EffectiveFinding[];
  resolvedFindings?: EffectiveFinding[];
  systemsForFinding?: (finding: EffectiveFinding) => string[];
  // v2 group-based input. When supplied non-empty, the delta is built
  // from adjudicated groups so duplicate / overlapping findings collapse
  // into a single delta item and a single remediation step.
  issueGroups?: IssueAdjudicationGroup[];
  systemsForIssueGroup?: (group: IssueAdjudicationGroup) => string[];
};

export function createCoherencyDelta(input: CoherencyDeltaInput): CoherencyDelta {
  const items: CoherencyDeltaItem[] = [];
  const groupMode = Array.isArray(input.issueGroups) && input.issueGroups.length > 0;

  if (groupMode) {
    const groupSystems = input.systemsForIssueGroup;
    for (const group of input.issueGroups!) {
      const callbackSystems = groupSystems ? groupSystems(group) : [];
      items.push(buildItemFromIssueGroup(group, callbackSystems));
    }
  } else {
    const systemsForFinding = input.systemsForFinding ?? (() => []);
    for (const finding of input.findings ?? []) {
      items.push(buildItem(finding, systemsForFinding(finding)));
    }

    for (const finding of input.resolvedFindings ?? []) {
      items.push(buildItem(finding, systemsForFinding(finding)));
    }
  }

  items.sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }
    const severityDiff = SEVERITY_PRIORITY_RANK[left.severity] - SEVERITY_PRIORITY_RANK[right.severity];
    if (severityDiff !== 0) return severityDiff;
    const statusDiff = STATUS_PRIORITY_RANK[left.status] - STATUS_PRIORITY_RANK[right.status];
    if (statusDiff !== 0) return statusDiff;
    return left.findingId.localeCompare(right.findingId);
  });

  const remediationQueue = items
    .filter((item) => item.active)
    .map((item) => ({
      id: item.issueGroupId
        ? `remediation:group:${item.issueGroupId}`
        : `remediation:${item.findingId}`,
      priority: severityToPriority(item.severity),
      findingId: item.findingId,
      title: item.title,
      action: item.suggestedAction ?? `Address ${item.type} in ${item.files.join(", ") || "affected files"}.`,
      files: item.files,
      systems: item.systems,
      severity: item.severity,
    }));

  remediationQueue.sort((left, right) => {
    const priorityDiff =
      ["p0", "p1", "p2"].indexOf(left.priority) - ["p0", "p1", "p2"].indexOf(right.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return left.findingId.localeCompare(right.findingId);
  });

  return assertCoherencyDelta({
    header: input.header,
    summary: summarizeDelta(items),
    items,
    remediationQueue,
  });
}

export function validateCoherencyDelta(value: unknown): ValidationResult<CoherencyDelta> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);

  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "CoherencyDelta") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be CoherencyDelta.",
    });
  }

  if (!isRecord(value.summary) || typeof value.summary.total !== "number") {
    issues.push({ path: "$.summary", message: "Expected a coherency summary." });
  }

  if (!Array.isArray(value.items)) {
    issues.push({ path: "$.items", message: "Expected an array." });
  } else {
    value.items.forEach((item, index) =>
      validateCoherencyItem(item, `$.items[${index}]`, issues),
    );
  }

  if (!Array.isArray(value.remediationQueue)) {
    issues.push({ path: "$.remediationQueue", message: "Expected an array." });
  } else {
    value.remediationQueue.forEach((step, index) =>
      validateRemediationStep(step, `$.remediationQueue[${index}]`, issues),
    );
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as CoherencyDelta, issues: [] };
}

export function assertCoherencyDelta(value: unknown): CoherencyDelta {
  const result = validateCoherencyDelta(value);

  if (result.ok) {
    return result.value;
  }

  throw new TypeError(
    `CoherencyDelta validation failed: ${result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const coherencyDeltaSchema: ArtifactSchema<CoherencyDelta> = {
  validate: validateCoherencyDelta,
  parse: assertCoherencyDelta,
};

function buildItem(finding: EffectiveFinding, systems: string[]): CoherencyDeltaItem {
  const status = finding.effectiveStatus as CoherencyDeltaItemStatus;
  const active = status === "new" || status === "existing";
  const severity = coerceSeverity(finding.severity);
  const files = uniqueSorted(finding.files ?? []);
  const normalizedSystems = uniqueSorted(systems.length > 0 ? systems : []);

  return {
    id: `coherency:${finding.id}`,
    findingId: finding.id,
    type: finding.type,
    severity,
    title: finding.title,
    description: finding.description,
    files,
    systems: normalizedSystems.length > 0 ? normalizedSystems : ["unknown"],
    suggestedAction: finding.suggestedAction,
    status,
    active,
    evidence: finding.evidence ? normalizeRefs(finding.evidence) : undefined,
  };
}

function buildItemFromIssueGroup(
  group: IssueAdjudicationGroup,
  callbackSystems: string[],
): CoherencyDeltaItem {
  const { status, active } = mapGroupStatusToItem(group);
  const severity = coerceSeverity(group.severity);
  const files = uniqueSorted(group.files ?? []);
  const declared = uniqueSorted(group.systems ?? []);
  const computed = uniqueSorted(callbackSystems);
  const combined = uniqueSorted([...declared, ...computed]);

  return {
    id: `coherency:group:${group.id}`,
    findingId: group.canonicalFindingId,
    type: group.type,
    severity,
    title: group.title,
    description: group.description,
    files,
    systems: combined.length > 0 ? combined : ["unknown"],
    suggestedAction: group.suggestedAction,
    status,
    active,
    evidence: group.evidence ? normalizeRefs(group.evidence) : undefined,
    issueGroupId: group.id,
    canonicalFindingId: group.canonicalFindingId,
    memberFindingIds: [...group.memberFindingIds],
    groupingReasons: [...group.groupingReasons],
  };
}

function mapGroupStatusToItem(
  group: IssueAdjudicationGroup,
): { status: CoherencyDeltaItemStatus; active: boolean } {
  switch (group.status) {
    case "active":
      return { status: "existing", active: true };
    case "accepted":
      return { status: "accepted", active: false };
    case "ignored":
      return { status: "ignored", active: false };
    case "resolved":
      return { status: "resolved", active: false };
    case "mixed":
      return group.active
        ? { status: "existing", active: true }
        : { status: "accepted", active: false };
  }
}

function coerceSeverity(value: string): CoherencyDeltaSeverity {
  if (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low"
  ) {
    return value;
  }
  return "medium";
}

function summarizeDelta(items: CoherencyDeltaItem[]): CoherencyDeltaSummary {
  const summary: CoherencyDeltaSummary = {
    total: items.length,
    active: 0,
    resolved: 0,
    accepted: 0,
    ignored: 0,
    bySeverity: {},
    byType: {},
    bySystem: {},
    topPaths: [],
  };
  const pathCounts = new Map<string, number>();

  for (const item of items) {
    if (item.active) {
      summary.active += 1;
    } else if (item.status === "accepted") {
      summary.accepted += 1;
    } else if (item.status === "ignored") {
      summary.ignored += 1;
    } else if (item.status === "resolved") {
      summary.resolved += 1;
    }

    summary.bySeverity[item.severity] = (summary.bySeverity[item.severity] ?? 0) + 1;
    summary.byType[item.type] = (summary.byType[item.type] ?? 0) + 1;

    for (const system of item.systems) {
      summary.bySystem[system] = (summary.bySystem[system] ?? 0) + 1;
    }

    for (const file of item.files) {
      pathCounts.set(file, (pathCounts.get(file) ?? 0) + 1);
    }
  }

  summary.topPaths = [...pathCounts.entries()]
    .sort((left, right) => {
      if (left[1] !== right[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  return summary;
}

function validateCoherencyItem(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  requiredString(value.id, `${path}.id`, issues);
  requiredString(value.findingId, `${path}.findingId`, issues);
  requiredString(value.type, `${path}.type`, issues);
  requiredString(value.title, `${path}.title`, issues);
  requiredString(value.description, `${path}.description`, issues);

  if (
    typeof value.severity !== "string" ||
    !COHERENCY_SEVERITIES.has(value.severity as CoherencyDeltaSeverity)
  ) {
    issues.push({ path: `${path}.severity`, message: "Expected critical, high, medium, or low." });
  }

  if (
    typeof value.status !== "string" ||
    !COHERENCY_ITEM_STATUSES.has(value.status as CoherencyDeltaItemStatus)
  ) {
    issues.push({
      path: `${path}.status`,
      message: "Expected new, existing, accepted, ignored, or resolved.",
    });
  }

  if (typeof value.active !== "boolean") {
    issues.push({ path: `${path}.active`, message: "Expected a boolean." });
  }

  if (!isStringArray(value.files)) {
    issues.push({ path: `${path}.files`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.systems)) {
    issues.push({ path: `${path}.systems`, message: "Expected an array of strings." });
  }
}

function validateRemediationStep(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  requiredString(value.id, `${path}.id`, issues);
  requiredString(value.findingId, `${path}.findingId`, issues);
  requiredString(value.title, `${path}.title`, issues);
  requiredString(value.action, `${path}.action`, issues);

  if (
    typeof value.priority !== "string" ||
    !COHERENCY_PRIORITIES.has(value.priority as CoherencyRemediationPriority)
  ) {
    issues.push({ path: `${path}.priority`, message: "Expected one of p0, p1, p2." });
  }

  if (
    typeof value.severity !== "string" ||
    !COHERENCY_SEVERITIES.has(value.severity as CoherencyDeltaSeverity)
  ) {
    issues.push({ path: `${path}.severity`, message: "Expected critical, high, medium, or low." });
  }

  if (!isStringArray(value.files)) {
    issues.push({ path: `${path}.files`, message: "Expected an array of strings." });
  }

  if (!isStringArray(value.systems)) {
    issues.push({ path: `${path}.systems`, message: "Expected an array of strings." });
  }
}

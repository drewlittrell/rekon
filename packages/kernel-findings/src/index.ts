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

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

// ---------- FindingFilterReport (v1) ----------
//
// System / policy filtering audit. Records filtered findings with
// reason / evidence / confidence so suppression is auditable.
// Filtering is a projection over `FindingReport`; it does not
// mutate raw findings. Lifecycle / adjudication / coherency keep
// reading `FindingReport` until the next slice (filter-aware
// lifecycle) ports them over to `keptFindings`.

export type FindingFilterReason =
  | "test-file"
  | "generated-file"
  | "external-file"
  | "canary-file"
  | "explicit-exclusion"
  | "content-filter"
  | "policy-exception"
  | "other";

export type FindingFilterConfidence = "high" | "medium" | "low";

export type FindingFilterSource = "system" | "operator" | "policy";

export type FilteredFinding = {
  findingId: string;
  finding: Finding;
  reason: FindingFilterReason;
  evidence: string;
  filePath?: string;
  confidence: FindingFilterConfidence;
  filteredAt: string;
  source: FindingFilterSource;
  /**
   * Set when this finding was filtered by a configured
   * `FindingFilterPolicyRule`. Always paired with
   * `source === "policy"`.
   */
  policyId?: string;
};

export type FindingFilterSummary = {
  totalFiltered: number;
  kept: number;
  byReason: Record<string, number>;
  byConfidence: Record<string, number>;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  /**
   * Count of filtered findings per configured policy id.
   * Present when a non-empty policy ruleset was supplied; absent
   * when no policies ran. Keys are policy ids.
   */
  byPolicy?: Record<string, number>;
};

export type FindingFilterReport = {
  header: ArtifactHeader;
  summary: FindingFilterSummary;
  keptFindings: Finding[];
  filteredFindings: FilteredFinding[];
};

/**
 * A configured exclusion rule. Loaded from `.rekon/config.json`
 * `findingFilters` and applied before built-in deterministic
 * filters. Filtered findings are recorded with `source: "policy"`
 * and `policyId` so the audit trail names the rule that suppressed
 * each finding.
 */
export type FindingFilterPolicyRule = {
  id: string;
  reason: FindingFilterReason;
  evidence: string;
  confidence?: FindingFilterConfidence;
  pathPattern?: string;
  type?: string;
  ruleId?: string;
  severity?: FindingSeverity;
  titleIncludes?: string;
  descriptionIncludes?: string;
};

const FINDING_FILTER_REASONS = new Set<FindingFilterReason>([
  "test-file",
  "generated-file",
  "external-file",
  "canary-file",
  "explicit-exclusion",
  "content-filter",
  "policy-exception",
  "other",
]);

const FINDING_FILTER_CONFIDENCES = new Set<FindingFilterConfidence>([
  "high",
  "medium",
  "low",
]);

// Priority ranks: lower number = stronger filter reason, used when a
// finding could be filtered for multiple deterministic reasons.
const FINDING_FILTER_REASON_PRIORITY: Record<FindingFilterReason, number> = {
  "generated-file": 0,
  "external-file": 1,
  "test-file": 2,
  "canary-file": 3,
  "explicit-exclusion": 4,
  "content-filter": 5,
  "policy-exception": 6,
  other: 7,
};

type FilterMatch = {
  reason: FindingFilterReason;
  evidence: string;
  filePath?: string;
  confidence: FindingFilterConfidence;
  policyId?: string;
};

/**
 * Returns true when any path segment exactly equals one of `segments`,
 * regardless of whether the path has a leading slash. Treats both
 * `node_modules/leftpad/x.js` and `/repo/node_modules/leftpad/x.js` as
 * "external" when `segments` includes `node_modules`.
 */
function pathHasSegment(path: string, segments: ReadonlyArray<string>): boolean {
  const parts = path.split("/").filter((part) => part.length > 0);
  return parts.some((part) => segments.includes(part));
}

function pathHas(path: string, fragment: string): boolean {
  return path.includes(fragment);
}

function pathFilterMatch(filePath: string): FilterMatch | null {
  const lower = filePath.toLowerCase();
  if (
    pathHasSegment(lower, ["dist", "build", "generated"])
    || pathHas(lower, "__generated__")
    || pathHas(lower, ".generated.")
  ) {
    return {
      reason: "generated-file",
      evidence: `File path '${filePath}' matched generated-file rule.`,
      filePath,
      confidence: "high",
    };
  }
  if (pathHasSegment(lower, ["node_modules", "vendor", "third_party"])) {
    return {
      reason: "external-file",
      evidence: `File path '${filePath}' matched external-file rule.`,
      filePath,
      confidence: "high",
    };
  }
  if (
    pathHasSegment(lower, ["test", "tests", "__tests__", "__test__"])
    || lower.endsWith(".test.ts")
    || lower.endsWith(".test.tsx")
    || lower.endsWith(".test.js")
    || lower.endsWith(".test.jsx")
    || lower.endsWith(".test.mjs")
    || lower.endsWith(".test.cjs")
    || lower.endsWith(".spec.ts")
    || lower.endsWith(".spec.tsx")
    || lower.endsWith(".spec.js")
    || lower.endsWith(".spec.jsx")
    || lower.endsWith(".spec.mjs")
    || lower.endsWith(".spec.cjs")
  ) {
    return {
      reason: "test-file",
      evidence: `File path '${filePath}' matched test-file rule.`,
      filePath,
      confidence: "high",
    };
  }
  if (pathHas(lower, "canary")) {
    return {
      reason: "canary-file",
      evidence: `File path '${filePath}' matched canary-file rule.`,
      filePath,
      confidence: "high",
    };
  }
  return null;
}

function contentFilterMatch(
  finding: Finding,
  filePath: string,
): FilterMatch | null {
  const lower = filePath.toLowerCase();
  const text = `${finding.type ?? ""} ${finding.title ?? ""} ${finding.description ?? ""}`.toLowerCase();
  if (
    text.includes("generated output")
    && (
      pathHasSegment(lower, ["dist", "build", "generated"])
      || pathHas(lower, "__generated__")
      || pathHas(lower, ".generated.")
    )
  ) {
    return {
      reason: "content-filter",
      evidence: `Finding description mentions 'generated output' and file '${filePath}' is in a generated path.`,
      filePath,
      confidence: "medium",
    };
  }
  return null;
}

function findBestFilterMatch(finding: Finding): FilterMatch | null {
  const files = Array.isArray(finding.files) ? finding.files : [];
  let best: FilterMatch | null = null;
  const considerCandidate = (candidate: FilterMatch | null): void => {
    if (!candidate) return;
    if (
      !best
      || FINDING_FILTER_REASON_PRIORITY[candidate.reason]
        < FINDING_FILTER_REASON_PRIORITY[best.reason]
    ) {
      best = candidate;
    }
  };
  for (const filePath of files) {
    considerCandidate(pathFilterMatch(filePath));
    considerCandidate(contentFilterMatch(finding, filePath));
  }
  return best;
}

/**
 * Match a configured `pathPattern` against a single file path.
 * Supports a small deterministic glob vocabulary:
 *
 * - `*` matches zero or more characters within a single path
 *   segment (`/`-delimited).
 * - `**` matches zero or more segments, including the leading
 *   and trailing `/` boundaries.
 * - Anything else is matched literally.
 *
 * Matching is case-sensitive on the pattern side because path
 * conventions on the JS/TS side are case-sensitive.
 */
function matchPathPattern(pattern: string, filePath: string): boolean {
  if (pattern.length === 0) return false;
  // Build a deterministic regex from the pattern. We escape regex
  // metacharacters, then expand `**` and `*` tokens explicitly so
  // that `**` can match `/` while `*` cannot.
  let regex = "^";
  let i = 0;
  while (i < pattern.length) {
    const char = pattern[i]!;
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        // `**` — zero or more path segments. Greedy on `.*`. If
        // followed by `/`, swallow the slash too so `dir/**/*.ts`
        // and `dir/**/file.ts` both match `dir/file.ts`.
        if (pattern[i + 2] === "/") {
          regex += "(?:.*/)?";
          i += 3;
        } else {
          regex += ".*";
          i += 2;
        }
        continue;
      }
      // single `*` — zero or more chars that are not a path slash.
      regex += "[^/]*";
      i += 1;
      continue;
    }
    if (char === "?") {
      regex += "[^/]";
      i += 1;
      continue;
    }
    if (/[.+^${}()|\[\]\\]/.test(char)) {
      regex += `\\${char}`;
      i += 1;
      continue;
    }
    regex += char;
    i += 1;
  }
  regex += "$";
  return new RegExp(regex).test(filePath);
}

function policyFilterMatch(
  finding: Finding,
  policy: FindingFilterPolicyRule,
): FilterMatch | null {
  const files = Array.isArray(finding.files) ? finding.files : [];

  // pathPattern matcher — when present, at least one file must match.
  let matchedPath: string | undefined;
  if (policy.pathPattern && policy.pathPattern.length > 0) {
    matchedPath = files.find((file) => matchPathPattern(policy.pathPattern!, file));
    if (!matchedPath) return null;
  }

  // type matcher
  if (policy.type && finding.type !== policy.type) return null;

  // ruleId matcher
  if (policy.ruleId && finding.ruleId !== policy.ruleId) return null;

  // severity matcher
  if (policy.severity && finding.severity !== policy.severity) return null;

  // titleIncludes / descriptionIncludes — case-insensitive substring.
  if (policy.titleIncludes && policy.titleIncludes.length > 0) {
    const haystack = (finding.title ?? "").toLowerCase();
    if (!haystack.includes(policy.titleIncludes.toLowerCase())) return null;
  }
  if (policy.descriptionIncludes && policy.descriptionIncludes.length > 0) {
    const haystack = (finding.description ?? "").toLowerCase();
    if (!haystack.includes(policy.descriptionIncludes.toLowerCase())) return null;
  }

  return {
    reason: policy.reason,
    evidence: policy.evidence,
    filePath: matchedPath,
    confidence: policy.confidence ?? "medium",
    policyId: policy.id,
  };
}

export type ApplyFindingFiltersResult = {
  keptFindings: Finding[];
  filteredFindings: FilteredFinding[];
  /**
   * Count of filtered findings per supplied policy id (whether
   * the policy ran or not). Always present when `options.policies`
   * was supplied (so callers can detect unused policies);
   * `undefined` when no policies ran.
   */
  policyUsage?: Record<string, number>;
};

export type ApplyFindingFiltersOptions = {
  findings: Finding[];
  filteredAt?: string;
  /**
   * Configured exclusion rules from `.rekon/config.json`
   * `findingFilters`. Policy rules run **before** built-in
   * deterministic filters, in supplied order. The first matching
   * policy wins; if no policy matches, the built-in filters run.
   */
  policies?: FindingFilterPolicyRule[];
};

export function applyFindingFilters(input: ApplyFindingFiltersOptions): ApplyFindingFiltersResult {
  const filteredAt = input.filteredAt ?? new Date().toISOString();
  const keptFindings: Finding[] = [];
  const filteredFindings: FilteredFinding[] = [];
  const policies = Array.isArray(input.policies) ? input.policies : [];
  const policyUsage: Record<string, number> | undefined = policies.length > 0 ? {} : undefined;
  if (policyUsage) {
    for (const policy of policies) {
      // Initialize every policy id at 0 so unused policies surface
      // in the usage map.
      policyUsage[policy.id] = 0;
    }
  }

  for (const finding of input.findings ?? []) {
    // Policy filters run first; the first match wins.
    let match: FilterMatch | null = null;
    for (const policy of policies) {
      const candidate = policyFilterMatch(finding, policy);
      if (candidate) {
        match = candidate;
        break;
      }
    }
    if (!match) {
      match = findBestFilterMatch(finding);
    }
    if (!match) {
      keptFindings.push(finding);
      continue;
    }
    filteredFindings.push({
      findingId: finding.id,
      finding,
      reason: match.reason,
      evidence: match.evidence,
      filePath: match.filePath,
      confidence: match.confidence,
      filteredAt,
      source: match.policyId ? "policy" : "system",
      policyId: match.policyId,
    });
    if (policyUsage && match.policyId) {
      policyUsage[match.policyId] = (policyUsage[match.policyId] ?? 0) + 1;
    }
  }

  keptFindings.sort((left, right) => left.id.localeCompare(right.id));
  filteredFindings.sort((left, right) => left.findingId.localeCompare(right.findingId));
  return { keptFindings, filteredFindings, policyUsage };
}

export type FindingFilterPolicyValidationIssue = {
  policyIndex: number;
  policyId?: string;
  code: string;
  message: string;
  path: string;
};

const SEVERITIES_PUBLIC: ReadonlyArray<FindingSeverity> = [
  "critical",
  "high",
  "medium",
  "low",
];

/**
 * Validate a candidate `findingFilters` payload (from a loaded
 * config or test fixture). Returns issue records suitable for
 * surfacing through `rekon config validate` — the CLI maps each
 * issue into its `ConfigValidationIssue` shape. Returns a
 * deterministic, sorted issue list.
 */
export function validateFindingFilterPolicyRules(value: unknown): {
  rules: FindingFilterPolicyRule[];
  issues: FindingFilterPolicyValidationIssue[];
} {
  const issues: FindingFilterPolicyValidationIssue[] = [];
  const rules: FindingFilterPolicyRule[] = [];

  if (!Array.isArray(value)) {
    return {
      rules,
      issues: [
        {
          policyIndex: -1,
          code: "finding-filters-not-array",
          message: "findingFilters must be an array when present.",
          path: "findingFilters",
        },
      ],
    };
  }

  const seenIds = new Set<string>();

  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    const entryPath = `findingFilters[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      issues.push({
        policyIndex: index,
        code: "finding-filter-not-object",
        message: "findingFilters entry must be an object.",
        path: entryPath,
      });
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    const policyId = typeof candidate.id === "string" ? candidate.id : undefined;
    const idForIssue = policyId;

    if (typeof candidate.id !== "string" || candidate.id.trim().length === 0) {
      issues.push({
        policyIndex: index,
        policyId: idForIssue,
        code: "finding-filter-id-missing",
        message: "findingFilters[].id is required and must be a non-empty string.",
        path: `${entryPath}.id`,
      });
    } else if (seenIds.has(candidate.id)) {
      issues.push({
        policyIndex: index,
        policyId: idForIssue,
        code: "finding-filter-id-duplicate",
        message: `findingFilters[].id '${candidate.id}' is listed more than once.`,
        path: `${entryPath}.id`,
      });
    } else {
      seenIds.add(candidate.id);
    }

    if (
      typeof candidate.reason !== "string"
      || !FINDING_FILTER_REASONS.has(candidate.reason as FindingFilterReason)
    ) {
      issues.push({
        policyIndex: index,
        policyId: idForIssue,
        code: "finding-filter-reason-invalid",
        message: `findingFilters[].reason must be one of ${[...FINDING_FILTER_REASONS].join(", ")}.`,
        path: `${entryPath}.reason`,
      });
    }

    if (typeof candidate.evidence !== "string" || candidate.evidence.trim().length === 0) {
      issues.push({
        policyIndex: index,
        policyId: idForIssue,
        code: "finding-filter-evidence-missing",
        message: "findingFilters[].evidence is required and must be a non-empty string.",
        path: `${entryPath}.evidence`,
      });
    }

    if (
      candidate.confidence !== undefined
      && (
        typeof candidate.confidence !== "string"
        || !FINDING_FILTER_CONFIDENCES.has(candidate.confidence as FindingFilterConfidence)
      )
    ) {
      issues.push({
        policyIndex: index,
        policyId: idForIssue,
        code: "finding-filter-confidence-invalid",
        message: "findingFilters[].confidence must be one of high, medium, low.",
        path: `${entryPath}.confidence`,
      });
    }

    if (
      candidate.severity !== undefined
      && (
        typeof candidate.severity !== "string"
        || !SEVERITIES_PUBLIC.includes(candidate.severity as FindingSeverity)
      )
    ) {
      issues.push({
        policyIndex: index,
        policyId: idForIssue,
        code: "finding-filter-severity-invalid",
        message: "findingFilters[].severity must be one of critical, high, medium, low.",
        path: `${entryPath}.severity`,
      });
    }

    for (const stringField of [
      "pathPattern",
      "type",
      "ruleId",
      "titleIncludes",
      "descriptionIncludes",
    ] as const) {
      const fieldValue = candidate[stringField];
      if (fieldValue !== undefined && typeof fieldValue !== "string") {
        issues.push({
          policyIndex: index,
          policyId: idForIssue,
          code: `finding-filter-${stringField}-invalid`,
          message: `findingFilters[].${stringField} must be a string when present.`,
          path: `${entryPath}.${stringField}`,
        });
      }
    }

    if (typeof candidate.pathPattern === "string") {
      // Reject absolute paths and parent-traversal patterns. Patterns
      // are project-relative.
      const pattern = candidate.pathPattern;
      const isAbsolute = pattern.startsWith("/")
        || /^[a-zA-Z]:[\\/]/.test(pattern);
      const hasTraversal = pattern
        .split("/")
        .some((segment) => segment === "..");
      if (isAbsolute) {
        issues.push({
          policyIndex: index,
          policyId: idForIssue,
          code: "finding-filter-path-pattern-absolute",
          message: "findingFilters[].pathPattern must be relative; absolute paths are rejected.",
          path: `${entryPath}.pathPattern`,
        });
      } else if (hasTraversal) {
        issues.push({
          policyIndex: index,
          policyId: idForIssue,
          code: "finding-filter-path-pattern-traversal",
          message: "findingFilters[].pathPattern must not include parent traversal ('..').",
          path: `${entryPath}.pathPattern`,
        });
      }
    }

    // At least one matcher must be present.
    const hasMatcher = [
      candidate.pathPattern,
      candidate.type,
      candidate.ruleId,
      candidate.severity,
      candidate.titleIncludes,
      candidate.descriptionIncludes,
    ].some((field) => typeof field === "string" && field.length > 0);
    if (!hasMatcher) {
      issues.push({
        policyIndex: index,
        policyId: idForIssue,
        code: "finding-filter-no-matcher",
        message: "findingFilters[] entry must specify at least one matcher (pathPattern, type, ruleId, severity, titleIncludes, descriptionIncludes).",
        path: entryPath,
      });
    }

    // If this candidate has the required scalars, accept it as a
    // structurally valid rule (downstream callers may still reject
    // on other issues).
    if (
      typeof candidate.id === "string"
      && candidate.id.trim().length > 0
      && typeof candidate.reason === "string"
      && FINDING_FILTER_REASONS.has(candidate.reason as FindingFilterReason)
      && typeof candidate.evidence === "string"
      && candidate.evidence.trim().length > 0
      && hasMatcher
    ) {
      const rule: FindingFilterPolicyRule = {
        id: candidate.id,
        reason: candidate.reason as FindingFilterReason,
        evidence: candidate.evidence,
      };
      if (typeof candidate.confidence === "string"
        && FINDING_FILTER_CONFIDENCES.has(candidate.confidence as FindingFilterConfidence)) {
        rule.confidence = candidate.confidence as FindingFilterConfidence;
      }
      if (typeof candidate.pathPattern === "string") rule.pathPattern = candidate.pathPattern;
      if (typeof candidate.type === "string") rule.type = candidate.type;
      if (typeof candidate.ruleId === "string") rule.ruleId = candidate.ruleId;
      if (typeof candidate.severity === "string"
        && SEVERITIES_PUBLIC.includes(candidate.severity as FindingSeverity)) {
        rule.severity = candidate.severity as FindingSeverity;
      }
      if (typeof candidate.titleIncludes === "string") rule.titleIncludes = candidate.titleIncludes;
      if (typeof candidate.descriptionIncludes === "string") {
        rule.descriptionIncludes = candidate.descriptionIncludes;
      }
      rules.push(rule);
    }
  }

  issues.sort((left, right) => {
    if (left.policyIndex !== right.policyIndex) return left.policyIndex - right.policyIndex;
    return left.code.localeCompare(right.code);
  });
  return { rules, issues };
}

export function summarizeFindingFilterReport(
  keptFindings: Finding[],
  filteredFindings: FilteredFinding[],
  policyUsage?: Record<string, number>,
): FindingFilterSummary {
  const summary: FindingFilterSummary = {
    totalFiltered: filteredFindings.length,
    kept: keptFindings.length,
    byReason: countBy(filteredFindings, (entry) => entry.reason),
    byConfidence: countBy(filteredFindings, (entry) => entry.confidence),
    byType: countBy(filteredFindings, (entry) => entry.finding.type),
    bySeverity: countBy(filteredFindings, (entry) => entry.finding.severity),
  };
  if (policyUsage && Object.keys(policyUsage).length > 0) {
    // Sorted by policy id for deterministic output.
    const sorted: Record<string, number> = {};
    for (const key of Object.keys(policyUsage).sort((left, right) => left.localeCompare(right))) {
      sorted[key] = policyUsage[key] ?? 0;
    }
    summary.byPolicy = sorted;
  }
  return summary;
}

export function createFindingFilterReport(input: {
  header: ArtifactHeader;
  keptFindings: Finding[];
  filteredFindings: FilteredFinding[];
  /**
   * Optional policy-usage counts (typically from
   * `applyFindingFilters(...).policyUsage`). Populates the
   * `summary.byPolicy` field when present.
   */
  policyUsage?: Record<string, number>;
}): FindingFilterReport {
  const keptFindings = [...input.keptFindings].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const filteredFindings = [...input.filteredFindings].sort((left, right) =>
    left.findingId.localeCompare(right.findingId),
  );
  return assertFindingFilterReport({
    header: input.header,
    summary: summarizeFindingFilterReport(keptFindings, filteredFindings, input.policyUsage),
    keptFindings,
    filteredFindings,
  });
}

export function validateFindingFilterReport(
  value: unknown,
): ValidationResult<FindingFilterReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);
  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "FindingFilterReport") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be FindingFilterReport.",
    });
  }

  if (!isRecord(value.summary) || typeof value.summary.totalFiltered !== "number") {
    issues.push({ path: "$.summary", message: "Expected a finding-filter summary." });
  }

  if (!Array.isArray(value.keptFindings)) {
    issues.push({ path: "$.keptFindings", message: "Expected an array." });
  } else {
    value.keptFindings.forEach((finding, index) =>
      validateFinding(finding, `$.keptFindings[${index}]`, issues),
    );
  }

  if (!Array.isArray(value.filteredFindings)) {
    issues.push({ path: "$.filteredFindings", message: "Expected an array." });
  } else {
    value.filteredFindings.forEach((entry, index) =>
      validateFilteredFinding(entry, `$.filteredFindings[${index}]`, issues),
    );
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as FindingFilterReport, issues: [] };
}

export function assertFindingFilterReport(value: unknown): FindingFilterReport {
  const result = validateFindingFilterReport(value);
  if (result.ok) return result.value;
  throw new TypeError(
    `FindingFilterReport validation failed: ${result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const findingFilterReportSchema: ArtifactSchema<FindingFilterReport> = {
  validate: validateFindingFilterReport,
  parse: assertFindingFilterReport,
};

function validateFilteredFinding(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  requiredString(value.findingId, `${path}.findingId`, issues);
  requiredString(value.evidence, `${path}.evidence`, issues);
  requiredString(value.filteredAt, `${path}.filteredAt`, issues);
  if (
    typeof value.reason !== "string"
    || !FINDING_FILTER_REASONS.has(value.reason as FindingFilterReason)
  ) {
    issues.push({
      path: `${path}.reason`,
      message: "Expected a known FindingFilterReason.",
    });
  }
  if (
    typeof value.confidence !== "string"
    || !FINDING_FILTER_CONFIDENCES.has(value.confidence as FindingFilterConfidence)
  ) {
    issues.push({
      path: `${path}.confidence`,
      message: "Expected one of high, medium, low.",
    });
  }
  if (typeof value.source !== "string") {
    issues.push({ path: `${path}.source`, message: "Expected a string." });
  } else if (
    value.source !== "system"
    && value.source !== "operator"
    && value.source !== "policy"
  ) {
    issues.push({
      path: `${path}.source`,
      message: "Expected one of system, operator, policy.",
    });
  }
  if (value.filePath !== undefined && typeof value.filePath !== "string") {
    issues.push({ path: `${path}.filePath`, message: "Expected a string when present." });
  }
  if (value.policyId !== undefined) {
    if (typeof value.policyId !== "string" || value.policyId.length === 0) {
      issues.push({
        path: `${path}.policyId`,
        message: "Expected a non-empty string when present.",
      });
    } else if (value.source !== "policy") {
      issues.push({
        path: `${path}.policyId`,
        message: "policyId requires source === 'policy'.",
      });
    }
  }
  validateFinding(value.finding, `${path}.finding`, issues);
}

// ---------- FindingFilterHealthReport (v1) ----------

export type FindingFilterHealthAlert = {
  code: string;
  severity: "warning" | "error";
  message: string;
};

export type FindingFilterHealthSummary = {
  totalFindings: number;
  totalFiltered: number;
  filterRate: number;
  highConfidenceFiltered: number;
  lowConfidenceFiltered: number;
  byReason: Record<string, number>;
  /**
   * Mirror of `FindingFilterReport.summary.byPolicy` when the
   * upstream filter report ran any configured policies. Present
   * only when the filter report carries a non-empty `byPolicy`.
   */
  byPolicy?: Record<string, number>;
  /**
   * Count of findings filtered by configured policies (i.e.
   * `source === "policy"`). 0 when no policies fired.
   */
  policyFiltered: number;
  /**
   * Policy ids that were supplied but matched zero findings. Used
   * to emit the `unused-policy-filter` alert.
   */
  unusedPolicies: string[];
};

export type FindingFilterHealthReport = {
  header: ArtifactHeader;
  summary: FindingFilterHealthSummary;
  alerts: FindingFilterHealthAlert[];
};

const FINDING_FILTER_HEALTH_ALERT_SEVERITIES = new Set<
  FindingFilterHealthAlert["severity"]
>(["warning", "error"]);

export function buildFindingFilterHealth(input: {
  filterReport: FindingFilterReport;
  highFilterRateThreshold?: number;
  /**
   * Optional configured policies that were supplied to the
   * filter report run. Used to detect `unused-policy-filter`
   * alerts (policy ids that matched zero findings). When
   * omitted, the health report relies on
   * `filterReport.summary.byPolicy` for usage counts but cannot
   * emit `unused-policy-filter` (it does not know the full
   * supplied set).
   */
  policies?: FindingFilterPolicyRule[];
}): { summary: FindingFilterHealthSummary; alerts: FindingFilterHealthAlert[] } {
  const report = input.filterReport;
  const threshold = input.highFilterRateThreshold ?? 0.8;
  const totalFindings = report.summary.kept + report.summary.totalFiltered;
  const filterRate = totalFindings === 0 ? 0 : report.summary.totalFiltered / totalFindings;
  const highConfidenceFiltered = report.filteredFindings.filter(
    (entry) => entry.confidence === "high",
  ).length;
  const lowConfidenceFiltered = report.filteredFindings.filter(
    (entry) => entry.confidence === "low",
  ).length;

  const policyFiltered = report.filteredFindings.filter(
    (entry) => entry.source === "policy",
  ).length;
  const lowConfidencePolicyFiltered = report.filteredFindings.filter(
    (entry) => entry.source === "policy" && entry.confidence === "low",
  ).length;
  const byPolicy = report.summary.byPolicy
    ? { ...report.summary.byPolicy }
    : undefined;

  // Unused policies: policy ids supplied as `byPolicy` keys (or
  // via `input.policies`) that matched zero findings.
  const unusedSet = new Set<string>();
  if (byPolicy) {
    for (const [policyId, count] of Object.entries(byPolicy)) {
      if (count === 0) unusedSet.add(policyId);
    }
  }
  if (Array.isArray(input.policies)) {
    for (const policy of input.policies) {
      if (!byPolicy || !(policy.id in byPolicy)) {
        unusedSet.add(policy.id);
      }
    }
  }
  const unusedPolicies = [...unusedSet].sort((left, right) => left.localeCompare(right));

  const summary: FindingFilterHealthSummary = {
    totalFindings,
    totalFiltered: report.summary.totalFiltered,
    filterRate: Math.round(filterRate * 10000) / 10000,
    highConfidenceFiltered,
    lowConfidenceFiltered,
    byReason: { ...report.summary.byReason },
    policyFiltered,
    unusedPolicies,
  };
  if (byPolicy) {
    summary.byPolicy = byPolicy;
  }

  const alerts: FindingFilterHealthAlert[] = [];
  if (totalFindings > 0 && filterRate > threshold) {
    alerts.push({
      code: "high-filter-rate",
      severity: "warning",
      message: `Filter rate ${(filterRate * 100).toFixed(1)}% exceeds threshold ${(threshold * 100).toFixed(1)}%. Review which filters are suppressing the most findings.`,
    });
  }
  if (lowConfidenceFiltered > 0) {
    alerts.push({
      code: "low-confidence-filtered",
      severity: "warning",
      message: `${lowConfidenceFiltered} finding${lowConfidenceFiltered === 1 ? "" : "s"} filtered with low confidence; inspect FindingFilterReport.filteredFindings to confirm suppression.`,
    });
  }
  // Policy-aware alerts. `policy-over-filtering` fires when
  // configured policies dominate the suppression — useful to
  // catch over-broad pathPatterns.
  if (totalFindings > 0 && policyFiltered / totalFindings > threshold) {
    alerts.push({
      code: "policy-over-filtering",
      severity: "warning",
      message: `Configured policies suppressed ${policyFiltered} of ${totalFindings} findings (${((policyFiltered / totalFindings) * 100).toFixed(1)}%). Review .rekon/config.json findingFilters for over-broad patterns.`,
    });
  }
  if (lowConfidencePolicyFiltered > 0) {
    alerts.push({
      code: "low-confidence-policy-filter",
      severity: "warning",
      message: `${lowConfidencePolicyFiltered} finding${lowConfidencePolicyFiltered === 1 ? "" : "s"} filtered by a configured low-confidence policy; consider raising the rule confidence or narrowing the matcher.`,
    });
  }
  if (unusedPolicies.length > 0) {
    alerts.push({
      code: "unused-policy-filter",
      severity: "warning",
      message: `Configured policy ${unusedPolicies.length === 1 ? "id" : "ids"} ${unusedPolicies.join(", ")} matched zero findings; remove or refine the matcher.`,
    });
  }

  alerts.sort((left, right) => left.code.localeCompare(right.code));
  return { summary, alerts };
}

export function createFindingFilterHealthReport(input: {
  header: ArtifactHeader;
  filterReport: FindingFilterReport;
  highFilterRateThreshold?: number;
  policies?: FindingFilterPolicyRule[];
}): FindingFilterHealthReport {
  const built = buildFindingFilterHealth({
    filterReport: input.filterReport,
    highFilterRateThreshold: input.highFilterRateThreshold,
    policies: input.policies,
  });
  return assertFindingFilterHealthReport({
    header: input.header,
    summary: built.summary,
    alerts: built.alerts,
  });
}

export function validateFindingFilterHealthReport(
  value: unknown,
): ValidationResult<FindingFilterHealthReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);
  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "FindingFilterHealthReport") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be FindingFilterHealthReport.",
    });
  }

  if (!isRecord(value.summary) || typeof value.summary.totalFiltered !== "number") {
    issues.push({ path: "$.summary", message: "Expected a finding-filter-health summary." });
  }

  if (!Array.isArray(value.alerts)) {
    issues.push({ path: "$.alerts", message: "Expected an array." });
  } else {
    value.alerts.forEach((alert, index) => {
      if (!isRecord(alert)) {
        issues.push({ path: `$.alerts[${index}]`, message: "Expected an object." });
        return;
      }
      requiredString(alert.code, `$.alerts[${index}].code`, issues);
      requiredString(alert.message, `$.alerts[${index}].message`, issues);
      if (
        typeof alert.severity !== "string"
        || !FINDING_FILTER_HEALTH_ALERT_SEVERITIES.has(
          alert.severity as FindingFilterHealthAlert["severity"],
        )
      ) {
        issues.push({
          path: `$.alerts[${index}].severity`,
          message: "Expected one of warning, error.",
        });
      }
    });
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as FindingFilterHealthReport, issues: [] };
}

export function assertFindingFilterHealthReport(
  value: unknown,
): FindingFilterHealthReport {
  const result = validateFindingFilterHealthReport(value);
  if (result.ok) return result.value;
  throw new TypeError(
    `FindingFilterHealthReport validation failed: ${result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const findingFilterHealthReportSchema: ArtifactSchema<FindingFilterHealthReport> = {
  validate: validateFindingFilterHealthReport,
  parse: assertFindingFilterHealthReport,
};

// ---------- FindingFilterPolicySuggestionReport (v2) ----------
//
// Advisory artifact that proposes `findingFilters` rules for
// recurring filtered findings. Suggestions are derived
// deterministically from one or more `FindingFilterReport`
// artifacts plus the current `findingFilters` policy set; they
// never mutate the config. Operators apply a suggestion
// explicitly via `rekon findings filter-policy apply <id>`.

export type FindingFilterPolicySuggestionReason =
  | "repeated-filtered-path"
  | "repeated-filtered-type"
  | "repeated-filtered-policy-gap"
  | "high-volume-filtered-pattern";

export type FindingFilterPolicySuggestionConfidence =
  | "high"
  | "medium"
  | "low";

export type FindingFilterPolicySuggestion = {
  id: string;
  reason: FindingFilterPolicySuggestionReason;
  suggestedRule: FindingFilterPolicyRule;
  confidence: FindingFilterPolicySuggestionConfidence;
  rationale: string;
  affectedFindingIds: string[];
  affectedPaths: string[];
  affectedTypes: string[];
  sourceFilterReportIds: string[];
  evidence: ArtifactRef[];
};

export type FindingFilterPolicySuggestionSummary = {
  totalSuggestions: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  byReason: Record<string, number>;
};

export type FindingFilterPolicySuggestionReport = {
  header: ArtifactHeader;
  summary: FindingFilterPolicySuggestionSummary;
  suggestions: FindingFilterPolicySuggestion[];
};

const FINDING_FILTER_POLICY_SUGGESTION_REASONS = new Set<FindingFilterPolicySuggestionReason>([
  "repeated-filtered-path",
  "repeated-filtered-type",
  "repeated-filtered-policy-gap",
  "high-volume-filtered-pattern",
]);

const FINDING_FILTER_POLICY_SUGGESTION_CONFIDENCES = new Set<FindingFilterPolicySuggestionConfidence>(
  ["high", "medium", "low"],
);

// Thresholds — kept conservative and deterministic; documented in
// docs/concepts/finding-filter-policy-suggestions.md.
const SUGGESTION_MIN_REPEATED_PATH = 2;
const SUGGESTION_HIGH_CONFIDENCE_PATH = 3;
const SUGGESTION_MIN_REPEATED_TYPE = 3;
const SUGGESTION_HIGH_VOLUME_THRESHOLD = 5;
const SUGGESTION_HIGH_VOLUME_DOMINANCE = 0.8;

/**
 * Pick the first two path segments (or the whole path when it's
 * a single segment) so the suggested pathPattern captures the
 * common prefix without being overly specific. Returns null for
 * empty / unusable paths.
 */
function suggestionPathPrefix(filePath: string): string | null {
  const parts = filePath.split("/").filter((segment) => segment.length > 0);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]}/${parts[1]}`;
}

function uniqueSortedArray(values: ReadonlyArray<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function hashSuggestionId(parts: ReadonlyArray<string>): string {
  // Tiny deterministic non-cryptographic hash so suggestion ids
  // stay stable across runs over the same inputs. djb2-ish.
  let hash = 5381;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      hash = ((hash * 33) ^ part.charCodeAt(i)) >>> 0;
    }
    hash = ((hash * 33) ^ 47) >>> 0; // separator
  }
  return hash.toString(36);
}

function ruleCoversPath(rule: FindingFilterPolicyRule, pathPattern: string): boolean {
  if (rule.pathPattern && rule.pathPattern === pathPattern) {
    return true;
  }
  return false;
}

function ruleCoversType(rule: FindingFilterPolicyRule, type: string): boolean {
  return Boolean(rule.type && rule.type === type);
}

export type DeriveFindingFilterPolicySuggestionsInput = {
  filterReports: FindingFilterReport[];
  filterReportRefs?: ArtifactRef[];
  /**
   * Current `findingFilters` policies. Used for coverage checks so
   * we never propose a duplicate of an existing rule.
   */
  policies?: FindingFilterPolicyRule[];
};

/**
 * Deterministic suggestion derivation. Pure / side-effect free.
 *
 * Rules implemented:
 * - **repeated-filtered-path**: at least
 *   `SUGGESTION_MIN_REPEATED_PATH` (2) filtered findings share a
 *   first-two-segment path prefix and that prefix is not already
 *   covered by an existing policy. Confidence is `high` for >= 3
 *   findings, `medium` for exactly 2. Suggested rule's `reason`
 *   mirrors the dominant filter reason in the bucket
 *   (defaulting to `explicit-exclusion` for ambiguous buckets).
 * - **repeated-filtered-type**: at least
 *   `SUGGESTION_MIN_REPEATED_TYPE` (3) filtered findings share a
 *   `finding.type` and no existing policy covers that type.
 *   Confidence is `medium`. Suggested rule uses
 *   `explicit-exclusion` reason by default.
 * - **repeated-filtered-policy-gap**: at least
 *   `SUGGESTION_HIGH_CONFIDENCE_PATH` (3) findings filtered by
 *   built-in path filters (`generated-file` / `external-file` /
 *   `test-file` / `canary-file` / `content-filter`) share a path
 *   prefix that no existing policy covers — meaning operators are
 *   relying on built-in rules where an explicit policy would be
 *   more durable. Confidence is `high`. Suggested rule mirrors
 *   the built-in reason.
 * - **high-volume-filtered-pattern**: one reason accounts for
 *   more than `SUGGESTION_HIGH_VOLUME_DOMINANCE` (0.8) of all
 *   filtered findings and the bucket has at least
 *   `SUGGESTION_HIGH_VOLUME_THRESHOLD` (5) findings. Confidence
 *   is `low` — emitted as a review prompt with no `pathPattern`
 *   (operators must narrow it themselves before applying).
 *
 * Suggestion ids are stable: `policy-suggestion:<reason>:<hash>`
 * where the hash is derived from the matched dimension
 * (pathPattern / type / reason) plus the rule reason.
 */
export function deriveFindingFilterPolicySuggestions(
  input: DeriveFindingFilterPolicySuggestionsInput,
): FindingFilterPolicySuggestion[] {
  const filterReports = Array.isArray(input.filterReports) ? input.filterReports : [];
  const policies = Array.isArray(input.policies) ? input.policies : [];
  const reportIds = filterReports.map((report) => report.header.artifactId);
  const refs = Array.isArray(input.filterReportRefs) && input.filterReportRefs.length > 0
    ? input.filterReportRefs
    : filterReports.map((report) => ({
        type: "FindingFilterReport",
        id: report.header.artifactId,
        schemaVersion: report.header.schemaVersion,
      }));

  // Walk every filtered finding once and bucket by suggestion
  // dimension. Each bucket tracks the original entries so the
  // emitted suggestion can cite finding ids + paths.
  type Bucket = {
    findingIds: Set<string>;
    paths: Set<string>;
    types: Set<string>;
    reasons: Map<FindingFilterReason, number>;
  };
  const pathBuckets = new Map<string, Bucket>();
  const typeBuckets = new Map<string, Bucket>();
  const builtInPathBuckets = new Map<string, Bucket>();
  const reasonTotals = new Map<FindingFilterReason, Bucket>();
  let totalFilteredEntries = 0;

  function getBucket(map: Map<string, Bucket>, key: string): Bucket {
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        findingIds: new Set(),
        paths: new Set(),
        types: new Set(),
        reasons: new Map(),
      };
      map.set(key, bucket);
    }
    return bucket;
  }

  for (const report of filterReports) {
    for (const entry of report.filteredFindings ?? []) {
      totalFilteredEntries += 1;
      const filePaths = Array.isArray(entry.finding?.files)
        ? entry.finding.files
        : entry.filePath
          ? [entry.filePath]
          : [];

      // Path-prefix buckets cover repeated-filtered-path and
      // repeated-filtered-policy-gap.
      for (const filePath of filePaths) {
        const prefix = suggestionPathPrefix(filePath);
        if (!prefix) continue;
        const pattern = `${prefix}/**`;
        const bucket = getBucket(pathBuckets, pattern);
        bucket.findingIds.add(entry.findingId);
        bucket.paths.add(filePath);
        if (entry.finding?.type) bucket.types.add(entry.finding.type);
        bucket.reasons.set(entry.reason, (bucket.reasons.get(entry.reason) ?? 0) + 1);

        // Built-in path filters fold into a separate bucket so
        // repeated-filtered-policy-gap can target them explicitly.
        if (
          entry.source !== "policy"
          && (
            entry.reason === "generated-file"
            || entry.reason === "external-file"
            || entry.reason === "test-file"
            || entry.reason === "canary-file"
            || entry.reason === "content-filter"
          )
        ) {
          const gapBucket = getBucket(builtInPathBuckets, pattern);
          gapBucket.findingIds.add(entry.findingId);
          gapBucket.paths.add(filePath);
          if (entry.finding?.type) gapBucket.types.add(entry.finding.type);
          gapBucket.reasons.set(entry.reason, (gapBucket.reasons.get(entry.reason) ?? 0) + 1);
        }
      }

      // Type bucket covers repeated-filtered-type.
      if (entry.finding?.type) {
        const tb = getBucket(typeBuckets, entry.finding.type);
        tb.findingIds.add(entry.findingId);
        for (const filePath of filePaths) tb.paths.add(filePath);
        tb.types.add(entry.finding.type);
        tb.reasons.set(entry.reason, (tb.reasons.get(entry.reason) ?? 0) + 1);
      }

      // Reason totals for high-volume-filtered-pattern.
      const rb = getBucket(reasonTotals, entry.reason);
      rb.findingIds.add(entry.findingId);
      for (const filePath of filePaths) rb.paths.add(filePath);
      if (entry.finding?.type) rb.types.add(entry.finding.type);
      rb.reasons.set(entry.reason, (rb.reasons.get(entry.reason) ?? 0) + 1);
    }
  }

  function dominantReason(bucket: Bucket): FindingFilterReason {
    let best: FindingFilterReason | null = null;
    let bestCount = -1;
    for (const [reason, count] of bucket.reasons) {
      if (count > bestCount || (count === bestCount && best !== null && reason.localeCompare(best) < 0)) {
        best = reason;
        bestCount = count;
      }
    }
    return best ?? "explicit-exclusion";
  }

  function buildEvidence(bucket: Bucket): {
    sourceFilterReportIds: string[];
    evidenceRefs: ArtifactRef[];
  } {
    // Every bucket comes from across the supplied filterReports;
    // when we can't disambiguate which report a finding came from
    // we cite all of them, which keeps lineage honest.
    return {
      sourceFilterReportIds: [...reportIds],
      evidenceRefs: refs.map((ref) => ({ ...ref })),
    };
  }

  const suggestions: FindingFilterPolicySuggestion[] = [];
  const policyGapPaths = new Set<string>();

  // --- repeated-filtered-policy-gap ---
  // Computed first so its higher-information `repeated-filtered-
  // policy-gap` suggestion wins for any pathPattern that the
  // repeated-filtered-path branch would otherwise emit.
  for (const [pathPattern, bucket] of builtInPathBuckets) {
    const count = bucket.findingIds.size;
    if (count < SUGGESTION_HIGH_CONFIDENCE_PATH) continue;
    if (policies.some((policy) => ruleCoversPath(policy, pathPattern))) continue;
    const reason = dominantReason(bucket);
    const hash = hashSuggestionId([pathPattern, reason, "repeated-filtered-policy-gap"]);
    const ruleId = `suggested-${hash}`;
    const { sourceFilterReportIds, evidenceRefs } = buildEvidence(bucket);
    suggestions.push({
      id: `policy-suggestion:repeated-filtered-policy-gap:${hash}`,
      reason: "repeated-filtered-policy-gap",
      suggestedRule: {
        id: ruleId,
        reason,
        evidence: `Built-in filters suppressed ${count} finding${count === 1 ? "" : "s"} under '${pathPattern}'; promoting to an explicit policy makes the suppression durable.`,
        confidence: "high",
        pathPattern,
      },
      confidence: "high",
      rationale: `Built-in filters keep suppressing findings under '${pathPattern}'. Promote to a configured findingFilters rule so the suppression is durable and auditable.`,
      affectedFindingIds: uniqueSortedArray([...bucket.findingIds]),
      affectedPaths: uniqueSortedArray([...bucket.paths]),
      affectedTypes: uniqueSortedArray([...bucket.types]),
      sourceFilterReportIds,
      evidence: evidenceRefs,
    });
    policyGapPaths.add(pathPattern);
  }

  // --- repeated-filtered-path ---
  // Skip when policy-gap already emitted a higher-information
  // suggestion at the same pathPattern.
  for (const [pathPattern, bucket] of pathBuckets) {
    const count = bucket.findingIds.size;
    if (count < SUGGESTION_MIN_REPEATED_PATH) continue;
    if (policies.some((policy) => ruleCoversPath(policy, pathPattern))) continue;
    if (policyGapPaths.has(pathPattern)) continue;
    const reason = dominantReason(bucket);
    const confidence: FindingFilterPolicySuggestionConfidence =
      count >= SUGGESTION_HIGH_CONFIDENCE_PATH ? "high" : "medium";
    const hash = hashSuggestionId([pathPattern, reason, "repeated-filtered-path"]);
    const ruleId = `suggested-${hash}`;
    const { sourceFilterReportIds, evidenceRefs } = buildEvidence(bucket);
    suggestions.push({
      id: `policy-suggestion:repeated-filtered-path:${hash}`,
      reason: "repeated-filtered-path",
      suggestedRule: {
        id: ruleId,
        reason,
        evidence: `Filtered ${count} finding${count === 1 ? "" : "s"} share path prefix '${pathPattern}' across ${reportIds.length} filter report${reportIds.length === 1 ? "" : "s"}.`,
        confidence,
        pathPattern,
      },
      confidence,
      rationale: `${count} filtered finding${count === 1 ? "" : "s"} matched path prefix '${pathPattern}'; consider a durable findingFilters rule.`,
      affectedFindingIds: uniqueSortedArray([...bucket.findingIds]),
      affectedPaths: uniqueSortedArray([...bucket.paths]),
      affectedTypes: uniqueSortedArray([...bucket.types]),
      sourceFilterReportIds,
      evidence: evidenceRefs,
    });
  }

  // --- repeated-filtered-type ---
  for (const [type, bucket] of typeBuckets) {
    const count = bucket.findingIds.size;
    if (count < SUGGESTION_MIN_REPEATED_TYPE) continue;
    if (policies.some((policy) => ruleCoversType(policy, type))) continue;
    const hash = hashSuggestionId([type, "repeated-filtered-type"]);
    const ruleId = `suggested-${hash}`;
    const reason: FindingFilterReason = "explicit-exclusion";
    const { sourceFilterReportIds, evidenceRefs } = buildEvidence(bucket);
    suggestions.push({
      id: `policy-suggestion:repeated-filtered-type:${hash}`,
      reason: "repeated-filtered-type",
      suggestedRule: {
        id: ruleId,
        reason,
        evidence: `Filtered ${count} finding${count === 1 ? "" : "s"} share type '${type}' across ${reportIds.length} filter report${reportIds.length === 1 ? "" : "s"}.`,
        confidence: "medium",
        type,
      },
      confidence: "medium",
      rationale: `${count} filtered finding${count === 1 ? "" : "s"} matched type '${type}'; consider a durable findingFilters rule.`,
      affectedFindingIds: uniqueSortedArray([...bucket.findingIds]),
      affectedPaths: uniqueSortedArray([...bucket.paths]),
      affectedTypes: uniqueSortedArray([...bucket.types]),
      sourceFilterReportIds,
      evidence: evidenceRefs,
    });
  }

  // --- high-volume-filtered-pattern ---
  if (totalFilteredEntries >= SUGGESTION_HIGH_VOLUME_THRESHOLD) {
    for (const [reason, bucket] of reasonTotals) {
      const count = bucket.findingIds.size;
      const share = totalFilteredEntries === 0 ? 0 : count / totalFilteredEntries;
      if (count < SUGGESTION_HIGH_VOLUME_THRESHOLD) continue;
      if (share <= SUGGESTION_HIGH_VOLUME_DOMINANCE) continue;
      const hash = hashSuggestionId([reason, "high-volume-filtered-pattern"]);
      const ruleId = `suggested-${hash}`;
      const { sourceFilterReportIds, evidenceRefs } = buildEvidence(bucket);
      suggestions.push({
        id: `policy-suggestion:high-volume-filtered-pattern:${hash}`,
        reason: "high-volume-filtered-pattern",
        suggestedRule: {
          id: ruleId,
          reason,
          evidence: `Reason '${reason}' accounts for ${count} of ${totalFilteredEntries} filtered findings (${(share * 100).toFixed(1)}%). Review the underlying signal before applying.`,
          confidence: "low",
        },
        confidence: "low",
        rationale: `Reason '${reason}' dominates the filtered surface (${(share * 100).toFixed(1)}% of filtered findings). Treat this as a review prompt — narrow the suggested rule before applying.`,
        affectedFindingIds: uniqueSortedArray([...bucket.findingIds]),
        affectedPaths: uniqueSortedArray([...bucket.paths]),
        affectedTypes: uniqueSortedArray([...bucket.types]),
        sourceFilterReportIds,
        evidence: evidenceRefs,
      });
    }
  }

  // Deterministic order: by reason rank then suggestion id.
  const reasonRank: Record<FindingFilterPolicySuggestionReason, number> = {
    "repeated-filtered-policy-gap": 0,
    "repeated-filtered-path": 1,
    "repeated-filtered-type": 2,
    "high-volume-filtered-pattern": 3,
  };
  suggestions.sort((left, right) => {
    const reasonDiff = reasonRank[left.reason] - reasonRank[right.reason];
    if (reasonDiff !== 0) return reasonDiff;
    return left.id.localeCompare(right.id);
  });
  return suggestions;
}

export function summarizeFindingFilterPolicySuggestions(
  suggestions: FindingFilterPolicySuggestion[],
): FindingFilterPolicySuggestionSummary {
  return {
    totalSuggestions: suggestions.length,
    highConfidence: suggestions.filter((s) => s.confidence === "high").length,
    mediumConfidence: suggestions.filter((s) => s.confidence === "medium").length,
    lowConfidence: suggestions.filter((s) => s.confidence === "low").length,
    byReason: countBy(suggestions, (s) => s.reason),
  };
}

export function createFindingFilterPolicySuggestionReport(input: {
  header: ArtifactHeader;
  suggestions: FindingFilterPolicySuggestion[];
}): FindingFilterPolicySuggestionReport {
  const suggestions = [...input.suggestions];
  return assertFindingFilterPolicySuggestionReport({
    header: input.header,
    summary: summarizeFindingFilterPolicySuggestions(suggestions),
    suggestions,
  });
}

export function validateFindingFilterPolicySuggestionReport(
  value: unknown,
): ValidationResult<FindingFilterPolicySuggestionReport> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);
  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "FindingFilterPolicySuggestionReport") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be FindingFilterPolicySuggestionReport.",
    });
  }

  if (!isRecord(value.summary) || typeof value.summary.totalSuggestions !== "number") {
    issues.push({ path: "$.summary", message: "Expected a finding-filter-policy-suggestion summary." });
  }

  if (!Array.isArray(value.suggestions)) {
    issues.push({ path: "$.suggestions", message: "Expected an array." });
  } else {
    value.suggestions.forEach((entry, index) =>
      validateFindingFilterPolicySuggestion(entry, `$.suggestions[${index}]`, issues),
    );
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as FindingFilterPolicySuggestionReport, issues: [] };
}

export function assertFindingFilterPolicySuggestionReport(
  value: unknown,
): FindingFilterPolicySuggestionReport {
  const result = validateFindingFilterPolicySuggestionReport(value);
  if (result.ok) return result.value;
  throw new TypeError(
    `FindingFilterPolicySuggestionReport validation failed: ${result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const findingFilterPolicySuggestionReportSchema: ArtifactSchema<FindingFilterPolicySuggestionReport> = {
  validate: validateFindingFilterPolicySuggestionReport,
  parse: assertFindingFilterPolicySuggestionReport,
};

function validateFindingFilterPolicySuggestion(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  requiredString(value.id, `${path}.id`, issues);
  requiredString(value.rationale, `${path}.rationale`, issues);
  if (
    typeof value.reason !== "string"
    || !FINDING_FILTER_POLICY_SUGGESTION_REASONS.has(
      value.reason as FindingFilterPolicySuggestionReason,
    )
  ) {
    issues.push({
      path: `${path}.reason`,
      message: "Expected a known FindingFilterPolicySuggestionReason.",
    });
  }
  if (
    typeof value.confidence !== "string"
    || !FINDING_FILTER_POLICY_SUGGESTION_CONFIDENCES.has(
      value.confidence as FindingFilterPolicySuggestionConfidence,
    )
  ) {
    issues.push({
      path: `${path}.confidence`,
      message: "Expected one of high, medium, low.",
    });
  }
  if (!isStringArray(value.affectedFindingIds)) {
    issues.push({ path: `${path}.affectedFindingIds`, message: "Expected an array of strings." });
  }
  if (!isStringArray(value.affectedPaths)) {
    issues.push({ path: `${path}.affectedPaths`, message: "Expected an array of strings." });
  }
  if (!isStringArray(value.affectedTypes)) {
    issues.push({ path: `${path}.affectedTypes`, message: "Expected an array of strings." });
  }
  if (!isStringArray(value.sourceFilterReportIds)) {
    issues.push({
      path: `${path}.sourceFilterReportIds`,
      message: "Expected an array of strings.",
    });
  }
  if (!Array.isArray(value.evidence)) {
    issues.push({ path: `${path}.evidence`, message: "Expected an array of artifact refs." });
  }
  if (!isRecord(value.suggestedRule)) {
    issues.push({ path: `${path}.suggestedRule`, message: "Expected an object." });
  }
}

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

export type IssueMergeDecisionStatus = "accepted" | "rejected";

export type IssueMergeDecisionReason =
  | "same-root-cause"
  | "separate-issues"
  | "false-positive-candidate"
  | "other";

export type IssueMergeDecision = {
  id: string;
  candidateId: string;
  decision: IssueMergeDecisionStatus;
  note: string;
  reason?: IssueMergeDecisionReason;
  groupIds: string[];
  memberFindingIds: string[];
  decidedAt: string;
  decidedBy?: string;
  source: "operator" | "system";
  evidence?: ArtifactRef[];
};

export type IssueMergeDecisionLedger = {
  header: ArtifactHeader;
  decisions: IssueMergeDecision[];
};

export type IssueMergeCandidate = {
  id: string;
  groupIds: string[];
  memberFindingIds: string[];
  strength: IssueMergeCandidateStrength;
  reasons: IssueMergeCandidateReason[];
  confidence: number;
  status: "candidate";
  note: string;
  decision?: IssueMergeDecisionStatus;
  decisionId?: string;
  decisionNote?: string;
  decisionReason?: IssueMergeDecisionReason;
  decisionDecidedAt?: string;
  decisionDecidedBy?: string;
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

const ISSUE_MERGE_DECISION_STATUSES = new Set<IssueMergeDecisionStatus>([
  "accepted",
  "rejected",
]);

const ISSUE_MERGE_DECISION_REASONS = new Set<IssueMergeDecisionReason>([
  "same-root-cause",
  "separate-issues",
  "false-positive-candidate",
  "other",
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

  if (value.decision !== undefined) {
    if (
      typeof value.decision !== "string"
      || !ISSUE_MERGE_DECISION_STATUSES.has(value.decision as IssueMergeDecisionStatus)
    ) {
      issues.push({
        path: `${path}.decision`,
        message: 'Expected "accepted" or "rejected" when present.',
      });
    }
  }
}

export function createIssueMergeDecisionLedger(input: {
  header: ArtifactHeader;
  decisions: IssueMergeDecision[];
}): IssueMergeDecisionLedger {
  const normalized = input.decisions.map((decision) => normalizeMergeDecision(decision));
  const sorted = [...normalized].sort((left, right) => {
    const candidateDiff = left.candidateId.localeCompare(right.candidateId);
    if (candidateDiff !== 0) return candidateDiff;
    return left.decidedAt.localeCompare(right.decidedAt);
  });
  return assertIssueMergeDecisionLedger({
    header: input.header,
    decisions: sorted,
  });
}

export function validateIssueMergeDecisionLedger(
  value: unknown,
): ValidationResult<IssueMergeDecisionLedger> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  }

  const header = validateArtifactHeader(value.header);

  if (!header.ok) {
    issues.push(...prefixIssues(header.issues, "$.header"));
  } else if (header.value.artifactType !== "IssueMergeDecisionLedger") {
    issues.push({
      path: "$.header.artifactType",
      message: "Expected artifactType to be IssueMergeDecisionLedger.",
    });
  }

  if (!Array.isArray(value.decisions)) {
    issues.push({ path: "$.decisions", message: "Expected an array." });
  } else {
    value.decisions.forEach((decision, index) =>
      validateMergeDecision(decision, `$.decisions[${index}]`, issues),
    );
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as IssueMergeDecisionLedger, issues: [] };
}

export function assertIssueMergeDecisionLedger(value: unknown): IssueMergeDecisionLedger {
  const result = validateIssueMergeDecisionLedger(value);

  if (result.ok) {
    return result.value;
  }

  throw new TypeError(
    `IssueMergeDecisionLedger validation failed: ${result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
  );
}

export const issueMergeDecisionLedgerSchema: ArtifactSchema<IssueMergeDecisionLedger> = {
  validate: validateIssueMergeDecisionLedger,
  parse: assertIssueMergeDecisionLedger,
};

export function findLatestIssueMergeDecision(
  ledger: IssueMergeDecisionLedger | undefined,
  candidateId: string,
): IssueMergeDecision | undefined {
  if (!ledger) return undefined;
  let latest: IssueMergeDecision | undefined;
  for (const decision of ledger.decisions) {
    if (decision.candidateId !== candidateId) continue;
    if (!latest || decision.decidedAt.localeCompare(latest.decidedAt) > 0) {
      latest = decision;
    }
  }
  return latest;
}

export type IssueGroupRollup = {
  id: string;
  groupIds: string[];
  decisionIds: string[];
  candidateIds: string[];
  groups: IssueAdjudicationGroup[];
};

export function rollupIssueGroupsByAcceptedMergeDecisions(input: {
  groups: IssueAdjudicationGroup[];
  mergeCandidates?: IssueMergeCandidate[];
  decisions?: IssueMergeDecision[];
}): IssueGroupRollup[] {
  const groups = input.groups ?? [];
  if (groups.length === 0) return [];

  const candidatesById = new Map<string, IssueMergeCandidate>();
  for (const candidate of input.mergeCandidates ?? []) {
    candidatesById.set(candidate.id, candidate);
  }

  // Resolve the latest decision per candidateId so a later "rejected"
  // supersedes an earlier "accepted" and vice versa.
  const latestByCandidate = new Map<string, IssueMergeDecision>();
  for (const decision of input.decisions ?? []) {
    const existing = latestByCandidate.get(decision.candidateId);
    if (!existing || decision.decidedAt.localeCompare(existing.decidedAt) > 0) {
      latestByCandidate.set(decision.candidateId, decision);
    }
  }

  // Union-find over groupIds; only "accepted" latest decisions connect them.
  const parent = new Map<string, string>();
  const candidateForGroup = new Map<string, Set<string>>();
  const decisionForGroup = new Map<string, Set<string>>();

  const find = (id: string): string => {
    let current = id;
    while (parent.get(current) !== current) {
      const next = parent.get(current) ?? current;
      parent.set(current, parent.get(next) ?? next);
      current = parent.get(current) ?? current;
    }
    return current;
  };

  const union = (left: string, right: string): void => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft === rootRight) return;
    // Deterministic: smaller id wins as the new root.
    if (rootLeft.localeCompare(rootRight) <= 0) {
      parent.set(rootRight, rootLeft);
    } else {
      parent.set(rootLeft, rootRight);
    }
  };

  for (const group of groups) {
    parent.set(group.id, group.id);
  }

  for (const [candidateId, decision] of latestByCandidate) {
    if (decision.decision !== "accepted") continue;
    const candidate = candidatesById.get(candidateId);
    const linkedGroupIds = candidate?.groupIds ?? decision.groupIds ?? [];
    const validGroupIds = linkedGroupIds.filter((id) => parent.has(id));
    if (validGroupIds.length < 2) continue;
    const first = validGroupIds[0]!;
    for (let i = 1; i < validGroupIds.length; i += 1) {
      union(first, validGroupIds[i]!);
    }
    for (const groupId of validGroupIds) {
      let candidateSet = candidateForGroup.get(groupId);
      if (!candidateSet) {
        candidateSet = new Set();
        candidateForGroup.set(groupId, candidateSet);
      }
      candidateSet.add(candidateId);

      let decisionSet = decisionForGroup.get(groupId);
      if (!decisionSet) {
        decisionSet = new Set();
        decisionForGroup.set(groupId, decisionSet);
      }
      decisionSet.add(decision.id);
    }
  }

  // Bucket groups by root.
  const bucketByRoot = new Map<string, IssueAdjudicationGroup[]>();
  for (const group of groups) {
    const root = find(group.id);
    let bucket = bucketByRoot.get(root);
    if (!bucket) {
      bucket = [];
      bucketByRoot.set(root, bucket);
    }
    bucket.push(group);
  }

  const rollups: IssueGroupRollup[] = [];
  for (const bucket of bucketByRoot.values()) {
    const sortedBucket = [...bucket].sort((left, right) => left.id.localeCompare(right.id));
    const groupIds = sortedBucket.map((group) => group.id);
    const candidateIdSet = new Set<string>();
    const decisionIdSet = new Set<string>();
    for (const groupId of groupIds) {
      for (const candidateId of candidateForGroup.get(groupId) ?? []) {
        candidateIdSet.add(candidateId);
      }
      for (const decisionId of decisionForGroup.get(groupId) ?? []) {
        decisionIdSet.add(decisionId);
      }
    }
    const candidateIds = [...candidateIdSet].sort((left, right) => left.localeCompare(right));
    const decisionIds = [...decisionIdSet].sort((left, right) => left.localeCompare(right));

    const id =
      groupIds.length === 1 ? groupIds[0]! : `merged:${groupIds.join("+")}`;

    rollups.push({ id, groupIds, decisionIds, candidateIds, groups: sortedBucket });
  }

  rollups.sort((left, right) => left.id.localeCompare(right.id));
  return rollups;
}

export function applyIssueMergeDecisionsToCandidates(
  candidates: IssueMergeCandidate[] | undefined,
  ledger: IssueMergeDecisionLedger | undefined,
): IssueMergeCandidate[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }
  if (!ledger) {
    return candidates.map((candidate) => ({ ...candidate }));
  }

  return candidates.map((candidate) => {
    const decision = findLatestIssueMergeDecision(ledger, candidate.id);
    if (!decision) {
      return { ...candidate };
    }
    return {
      ...candidate,
      decision: decision.decision,
      decisionId: decision.id,
      decisionNote: decision.note,
      decisionReason: decision.reason,
      decisionDecidedAt: decision.decidedAt,
      decisionDecidedBy: decision.decidedBy,
    };
  });
}

function normalizeMergeDecision(decision: IssueMergeDecision): IssueMergeDecision {
  return {
    ...decision,
    note: typeof decision.note === "string" ? decision.note.trim() : decision.note,
    groupIds: Array.isArray(decision.groupIds) ? [...decision.groupIds] : decision.groupIds,
    memberFindingIds: Array.isArray(decision.memberFindingIds)
      ? [...decision.memberFindingIds]
      : decision.memberFindingIds,
    evidence: Array.isArray(decision.evidence)
      ? decision.evidence.map((ref) => ({ ...ref }))
      : decision.evidence,
  };
}

function validateMergeDecision(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }

  requiredString(value.id, `${path}.id`, issues);
  requiredString(value.candidateId, `${path}.candidateId`, issues);
  requiredString(value.decidedAt, `${path}.decidedAt`, issues);

  if (typeof value.note !== "string" || value.note.trim().length === 0) {
    issues.push({
      path: `${path}.note`,
      message: "Expected a non-empty note explaining the merge decision.",
    });
  }

  if (
    typeof value.decision !== "string"
    || !ISSUE_MERGE_DECISION_STATUSES.has(value.decision as IssueMergeDecisionStatus)
  ) {
    issues.push({
      path: `${path}.decision`,
      message: 'Expected decision to be "accepted" or "rejected".',
    });
  }

  if (
    !Array.isArray(value.groupIds)
    || value.groupIds.length === 0
    || !value.groupIds.every((entry) => typeof entry === "string")
  ) {
    issues.push({
      path: `${path}.groupIds`,
      message: "Expected a non-empty array of group ids (strings).",
    });
  }

  if (!isStringArray(value.memberFindingIds)) {
    issues.push({
      path: `${path}.memberFindingIds`,
      message: "Expected an array of strings (may be empty).",
    });
  }

  if (value.reason !== undefined) {
    if (
      typeof value.reason !== "string"
      || !ISSUE_MERGE_DECISION_REASONS.has(value.reason as IssueMergeDecisionReason)
    ) {
      issues.push({
        path: `${path}.reason`,
        message: "Expected a known IssueMergeDecisionReason when present.",
      });
    }
  }

  if (value.source !== "operator" && value.source !== "system") {
    issues.push({
      path: `${path}.source`,
      message: 'Expected "operator" or "system".',
    });
  }

  if (value.decidedBy !== undefined && typeof value.decidedBy !== "string") {
    issues.push({
      path: `${path}.decidedBy`,
      message: "Expected a string when present.",
    });
  }

  if (value.evidence !== undefined) {
    if (!Array.isArray(value.evidence)) {
      issues.push({
        path: `${path}.evidence`,
        message: "Expected an array of artifact refs when present.",
      });
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
  // Merge-aware fields (present only when accepted IssueMergeDecisionLedger
  // decisions collapsed two or more issue groups into a single rollup item).
  mergedIssueGroupIds?: string[];
  mergeDecisionIds?: string[];
  mergeCandidateIds?: string[];
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
  // v3 merge-aware input. When supplied alongside `issueGroups`, accepted
  // decisions in `mergeDecisions` collapse the referenced issue groups into
  // a single rollup item. Rejected decisions keep groups separate. Raw
  // group ids and member finding ids remain traceable on every item.
  mergeCandidates?: IssueMergeCandidate[];
  mergeDecisions?: IssueMergeDecision[];
};

export function createCoherencyDelta(input: CoherencyDeltaInput): CoherencyDelta {
  const items: CoherencyDeltaItem[] = [];
  const groupMode = Array.isArray(input.issueGroups) && input.issueGroups.length > 0;
  const hasDecisions = Array.isArray(input.mergeDecisions) && input.mergeDecisions.length > 0;

  if (groupMode && hasDecisions) {
    const groupSystems = input.systemsForIssueGroup;
    const rollups = rollupIssueGroupsByAcceptedMergeDecisions({
      groups: input.issueGroups!,
      mergeCandidates: input.mergeCandidates,
      decisions: input.mergeDecisions,
    });
    for (const rollup of rollups) {
      items.push(buildItemFromRollup(rollup, groupSystems));
    }
  } else if (groupMode) {
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
    .map((item) => {
      let remediationId: string;
      if (item.mergedIssueGroupIds && item.mergedIssueGroupIds.length > 1) {
        remediationId = `remediation:merged:${item.mergedIssueGroupIds.join("+")}`;
      } else if (item.issueGroupId) {
        remediationId = `remediation:group:${item.issueGroupId}`;
      } else {
        remediationId = `remediation:${item.findingId}`;
      }
      return {
        id: remediationId,
        priority: severityToPriority(item.severity),
        findingId: item.findingId,
        title: item.title,
        action: item.suggestedAction ?? `Address ${item.type} in ${item.files.join(", ") || "affected files"}.`,
        files: item.files,
        systems: item.systems,
        severity: item.severity,
      };
    });

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

function buildItemFromRollup(
  rollup: IssueGroupRollup,
  systemsForIssueGroup?: (group: IssueAdjudicationGroup) => string[],
): CoherencyDeltaItem {
  const groups = rollup.groups;
  if (groups.length === 1) {
    const only = groups[0]!;
    const callbackSystems = systemsForIssueGroup ? systemsForIssueGroup(only) : [];
    return buildItemFromIssueGroup(only, callbackSystems);
  }

  // Multi-group merged rollup: union members, files, systems; pick worst
  // severity; derive a stable canonical group as the highest-severity-active
  // group (deterministic tiebreaker: smaller id wins).
  const sortedBySeverityActive = [...groups].sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }
    const severityDiff =
      SEVERITY_PRIORITY_RANK[coerceSeverity(left.severity)] -
      SEVERITY_PRIORITY_RANK[coerceSeverity(right.severity)];
    if (severityDiff !== 0) return severityDiff;
    return left.id.localeCompare(right.id);
  });
  const canonical = sortedBySeverityActive[0]!;

  const memberFindingIds = uniqueSorted(groups.flatMap((group) => group.memberFindingIds));
  const files = uniqueSorted(groups.flatMap((group) => group.files ?? []));

  const declaredSystems = uniqueSorted(groups.flatMap((group) => group.systems ?? []));
  const computedSystems = systemsForIssueGroup
    ? uniqueSorted(groups.flatMap((group) => systemsForIssueGroup(group)))
    : [];
  const combinedSystems = uniqueSorted([...declaredSystems, ...computedSystems]);

  const evidenceRefs: ArtifactRef[] = [];
  const seenEvidence = new Set<string>();
  for (const group of groups) {
    if (!Array.isArray(group.evidence)) continue;
    for (const ref of group.evidence) {
      const key = `${ref.type}:${ref.id}`;
      if (seenEvidence.has(key)) continue;
      seenEvidence.add(key);
      evidenceRefs.push({ ...ref });
    }
  }

  const worstSeverity = coerceSeverity(canonical.severity);

  // Rollup status / activeness across groups.
  const anyActive = groups.some((group) => group.active);
  let status: CoherencyDeltaItemStatus;
  let active: boolean;
  if (anyActive) {
    status = "existing";
    active = true;
  } else if (groups.some((group) => group.status === "resolved")) {
    status = "resolved";
    active = false;
  } else if (groups.some((group) => group.status === "accepted")) {
    status = "accepted";
    active = false;
  } else {
    status = "ignored";
    active = false;
  }

  // Suggested action: prefer canonical (highest severity active) if present,
  // else first non-empty across the bucket.
  let suggestedAction = canonical.suggestedAction;
  if (!suggestedAction) {
    for (const group of groups) {
      if (group.suggestedAction) {
        suggestedAction = group.suggestedAction;
        break;
      }
    }
  }

  const groupingReasons = uniqueSorted([
    "operator-accepted-merge",
    ...groups.flatMap((group) => group.groupingReasons ?? []),
  ]);

  const title = `Merged issue group: ${canonical.title}`;
  const description = `Operator-accepted merge of ${groups.length} issue groups.`;

  return {
    id: `coherency:rollup:${rollup.id}`,
    findingId: canonical.canonicalFindingId,
    type: canonical.type,
    severity: worstSeverity,
    title,
    description,
    files,
    systems: combinedSystems.length > 0 ? combinedSystems : ["unknown"],
    suggestedAction,
    status,
    active,
    evidence: evidenceRefs.length > 0 ? evidenceRefs : undefined,
    issueGroupId: canonical.id,
    canonicalFindingId: canonical.canonicalFindingId,
    memberFindingIds,
    groupingReasons,
    mergedIssueGroupIds: rollup.groupIds,
    mergeDecisionIds: rollup.decisionIds,
    mergeCandidateIds: rollup.candidateIds,
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

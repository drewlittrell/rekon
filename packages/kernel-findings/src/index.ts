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
  /**
   * Optional structured detail bag for detectors. Consumed by the
   * classic-inspired content filters (e.g. `details.stubName`,
   * `details.imports`, `details.envVars`,
   * `details.decisionConcerns`, `details.concernTag`,
   * `details.minCapabilityConfidence`, `details.otherExports`,
   * `details.system`). Always optional and additive — the field
   * is treated as opaque by downstream consumers that don't
   * specifically know how to interpret it.
   */
  details?: Record<string, unknown>;
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
  // Classic-inspired content filters (stub/import family) ----
  | "empty-constructor-stub"
  | "storage-retrieval-placeholder"
  | "client-safe-infra"
  | "same-directory-import"
  | "svg-namespace-url"
  | "client-env-node-env"
  // Classic-inspired content filters (architecture family) ----
  | "speculative-anti-pattern"
  | "archetype-inference-note"
  | "hardcoded-config-not-dde"
  | "ui-http-provider-abstraction"
  | "ui-hook-uses-http-not-db"
  // Classic-inspired content filters (rule-id family) ----
  | "module-gate-verified-caller"
  | "route-handler-with-service"
  | "route-http-middleware-only"
  | "external-api-comment-only"
  | "factory-file-creates-deps"
  | "nextjs-route-convention"
  // Classic-inspired result filters ----
  | "below-min-confidence"
  | "below-min-severity"
  | "outside-selected-system"
  | "configured-path-exclusion"
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
  /**
   * Order-sensitive fingerprint of the `findingFilters` policy
   * set the filter run used. Populated by `buildFindingFilterReport`
   * (and `createFindingFilterReport` when callers supply
   * `policyFingerprint`). Downstream surfaces (architecture
   * summary, agent contract) compare this fingerprint against the
   * current `.rekon/config.json` `findingFilters` to detect that
   * the operator changed policy after the filter report was
   * produced.
   *
   * Absent on filter reports written before
   * filter-policy-freshness v2 landed; consumers treat that as
   * `status: "unknown"` (run `rekon refresh` to regenerate).
   */
  policyFingerprint?: FindingFilterPolicyFingerprint;
};

/**
 * Order-sensitive fingerprint of a `findingFilters` policy set.
 * Policy rule order matters because the first matching rule wins
 * (see `applyFindingFilters`). `digest` is a SHA-256 over the
 * canonical JSON of the rule array; `ruleIds` is the rule-id list
 * in declared order.
 */
export type FindingFilterPolicyFingerprint = {
  digest: string;
  ruleCount: number;
  ruleIds: string[];
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
  // content (stub/import family)
  "empty-constructor-stub",
  "storage-retrieval-placeholder",
  "client-safe-infra",
  "same-directory-import",
  "svg-namespace-url",
  "client-env-node-env",
  // content (architecture family)
  "speculative-anti-pattern",
  "archetype-inference-note",
  "hardcoded-config-not-dde",
  "ui-http-provider-abstraction",
  "ui-hook-uses-http-not-db",
  // content (rule-id family)
  "module-gate-verified-caller",
  "route-handler-with-service",
  "route-http-middleware-only",
  "external-api-comment-only",
  "factory-file-creates-deps",
  "nextjs-route-convention",
  // result filters
  "below-min-confidence",
  "below-min-severity",
  "outside-selected-system",
  "configured-path-exclusion",
  "other",
]);

const FINDING_FILTER_CONFIDENCES = new Set<FindingFilterConfidence>([
  "high",
  "medium",
  "low",
]);

// Priority ranks: lower number = stronger filter reason, used when a
// finding could be filtered for multiple deterministic reasons.
// Classic-inspired content reasons rank below the broad path heuristics
// because they're more specific — but priority is only consulted when a
// finding could match multiple **path-based** reasons. Content filters
// are resolved by `applyFindingContentFilters` before path filters and
// short-circuit on the first match.
const FINDING_FILTER_REASON_PRIORITY: Record<FindingFilterReason, number> = {
  "generated-file": 0,
  "external-file": 1,
  "test-file": 2,
  "canary-file": 3,
  "explicit-exclusion": 4,
  "content-filter": 5,
  "policy-exception": 6,
  // Classic-inspired content reasons (stub/import)
  "empty-constructor-stub": 10,
  "storage-retrieval-placeholder": 10,
  "client-safe-infra": 10,
  "same-directory-import": 10,
  "svg-namespace-url": 10,
  "client-env-node-env": 10,
  // Classic-inspired content reasons (architecture)
  "speculative-anti-pattern": 11,
  "archetype-inference-note": 11,
  "hardcoded-config-not-dde": 11,
  "ui-http-provider-abstraction": 11,
  "ui-hook-uses-http-not-db": 11,
  // Classic-inspired content reasons (rule-id)
  "module-gate-verified-caller": 12,
  "route-handler-with-service": 12,
  "route-http-middleware-only": 12,
  "external-api-comment-only": 12,
  "factory-file-creates-deps": 12,
  "nextjs-route-convention": 12,
  // Result filters (applied last, after content + path filters)
  "below-min-confidence": 20,
  "below-min-severity": 20,
  "outside-selected-system": 20,
  "configured-path-exclusion": 20,
  other: 30,
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

// ---------- Classic-inspired deterministic content filters ----------
//
// Filters here mirror codebase-intel-classic's content-filter,
// content-filter-stub-and-import, content-filter-architecture, and
// content-filter-ruleid pipelines. Each filter is a deterministic
// structural check over `Finding` (no LLM, no regex over source code,
// no file IO). When a filter matches, the finding is suppressed with
// a `source: "system"` filter entry whose `reason` / `evidence` /
// `confidence` describe why. Filtered findings remain in
// `FindingFilterReport.filteredFindings` and never mutate the raw
// `FindingReport`.

export type FindingContentFilterContext = {
  finding: Finding;
  /** Convenience alias for `finding.ruleId`. */
  ruleId?: string;
};

export type FindingContentFilterDecision = {
  reason: FindingFilterReason;
  evidence: string;
  filePath?: string;
  confidence: FindingFilterConfidence;
};

/**
 * Run every classic-inspired deterministic content filter in
 * priority order and return the first match, or `null` when no
 * filter applies. Synchronous and side-effect-free — safe to call
 * from any filter pipeline.
 */
export function applyFindingContentFilters(
  ctx: FindingContentFilterContext,
): FindingContentFilterDecision | null {
  const finding = ctx.finding;
  for (const fn of CONTENT_FILTER_FNS) {
    const decision = fn(finding);
    if (decision) return decision;
  }
  return null;
}

const CONTENT_FILTER_FNS: ReadonlyArray<
  (finding: Finding) => FindingContentFilterDecision | null
> = [
  // ----- Stub / import family -----
  contentFilterEmptyConstructorStub,
  contentFilterStorageRetrievalPlaceholder,
  contentFilterClientSafeInfra,
  contentFilterSameDirectoryImport,
  contentFilterSvgNamespaceUrl,
  contentFilterNodeEnvClient,
  // ----- Architecture family -----
  contentFilterSpeculativeAntiPattern,
  contentFilterArchetypeInferenceNote,
  contentFilterHardcodedConfigNotDde,
  contentFilterUiHttpProviderAbstraction,
  contentFilterUiHookUsesHttpNotDb,
  // ----- Rule-id family -----
  contentFilterModuleGateVerifiedCaller,
  contentFilterRouteHandlerWithService,
  contentFilterRouteHttpMiddlewareOnly,
  contentFilterExternalApiCommentOnly,
  contentFilterFactoryFileCreatesDeps,
  contentFilterNextjsRouteConvention,
];

// -- Small accessors over the loosely-typed `details` bag. --

function details(finding: Finding): Record<string, unknown> {
  const value = finding.details;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function stringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function firstFile(finding: Finding): string | undefined {
  const files = Array.isArray(finding.files) ? finding.files : [];
  return files[0];
}

// -- A. empty constructor stub ----

function contentFilterEmptyConstructorStub(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "stub") return null;
  const det = details(finding);
  if (stringField(det, "stubName") !== "constructor") return null;
  const stubReason = stringField(det, "stubReason");
  if (stubReason !== "empty_body") return null;
  return {
    reason: "empty-constructor-stub",
    evidence:
      "Empty constructor body is valid TypeScript when used for parameter property shorthand.",
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- B. storage retrieval placeholder ----

function contentFilterStorageRetrievalPlaceholder(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "stub") return null;
  const det = details(finding);
  const stubName = stringField(det, "stubName") ?? "";
  if (!stubName.startsWith("getStored")) return null;
  const stubReason = (stringField(det, "stubReason") ?? "").toLowerCase();
  if (!stubReason.includes("null") && !stubReason.includes("undefined")) return null;
  return {
    reason: "storage-retrieval-placeholder",
    evidence:
      `Storage retrieval ${stubName} returns null/undefined; treated as placeholder rather than incomplete logic.`,
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- C. client-safe infra import ----

const CLIENT_SAFE_FRAGMENTS: ReadonlyArray<string> = [
  "/Client",
  "Client.ts",
  "ClientBridge",
  "ClientLogger",
  "ClientPreferences",
];

function contentFilterClientSafeInfra(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "imports.no_server_only_in_client") return null;
  const det = details(finding);
  const evidence = stringArrayField(det, "evidence");
  if (evidence.length === 0) return null;
  const allClientSafe = evidence.every((entry) =>
    CLIENT_SAFE_FRAGMENTS.some((fragment) => entry.includes(fragment)),
  );
  if (!allClientSafe) return null;
  return {
    reason: "client-safe-infra",
    evidence:
      "All imports referenced by this finding are client-safe infrastructure modules.",
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- D. same-directory import ----

function contentFilterSameDirectoryImport(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "imports.use_at_alias") return null;
  const det = details(finding);
  const evidence = stringArrayField(det, "evidence");
  if (evidence.length === 0) return null;
  const allLocal
    = evidence.every((entry) => entry.startsWith("./") && !entry.includes("../"));
  if (!allLocal) return null;
  return {
    reason: "same-directory-import",
    evidence:
      "Same-directory relative imports do not warrant a @-alias rewrite.",
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- E. SVG namespace URL ----

const SVG_NAMESPACE_FRAGMENTS: ReadonlyArray<string> = [
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xlink",
];

function contentFilterSvgNamespaceUrl(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "external_apis.no_hardcoded_api_urls_outside_providers") {
    return null;
  }
  const det = details(finding);
  const evidence = stringArrayField(det, "evidence");
  if (evidence.length === 0) return null;
  const allSvg = evidence.every((entry) =>
    SVG_NAMESPACE_FRAGMENTS.some((fragment) => entry.includes(fragment)),
  );
  if (!allSvg) return null;
  return {
    reason: "svg-namespace-url",
    evidence:
      "Hardcoded URLs are SVG / XLink namespace declarations, not external API endpoints.",
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- F. NODE_ENV client env ----

function contentFilterNodeEnvClient(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "security.api_keys_server_side_only") return null;
  const det = details(finding);
  // Prefer `envVars`, fall back to `evidence` when detectors don't
  // surface a dedicated key list.
  const envVars = stringArrayField(det, "envVars");
  const evidenceList = stringArrayField(det, "evidence");
  const candidates = envVars.length > 0 ? envVars : evidenceList;
  if (candidates.length === 0) return null;
  const allNodeEnv = candidates.every((entry) => entry.includes("NODE_ENV"));
  if (!allNodeEnv) return null;
  return {
    reason: "client-env-node-env",
    evidence:
      "Only NODE_ENV is referenced; client-side NODE_ENV reads are standard.",
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- G. speculative anti-pattern ----

function contentFilterSpeculativeAntiPattern(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "anti_pattern") return null;
  const description = (finding.description ?? "").toLowerCase();
  if (
    !description.includes("may indicate business logic")
    && !description.includes("might indicate business logic")
  ) {
    return null;
  }
  return {
    reason: "speculative-anti-pattern",
    evidence:
      "Description hedges with may/might-indicate-business-logic; treated as speculative noise.",
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- H. archetype inference note ----

function contentFilterArchetypeInferenceNote(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  const files = Array.isArray(finding.files) ? finding.files : [];
  if (files.length > 0) return null;
  const description = finding.description ?? "";
  if (!description.startsWith("Topology contract inferred from archetype")) return null;
  return {
    reason: "archetype-inference-note",
    evidence:
      "Archetype-inferred topology note is informational, not an actionable architecture issue.",
    filePath: undefined,
    confidence: "high",
  };
}

// -- I. hardcoded config not DDE ----

const HARDCODED_CONFIG_FRAGMENTS: ReadonlyArray<string> = [
  "hardcoded",
  "magic number",
  "timeout",
  "delay",
  "limit",
  "navigation",
  "should be configurable",
  "should be externalized",
  "should use design token",
];

const BUSINESS_DECISION_FRAGMENTS: ReadonlyArray<string> = [
  "dde",
  "gate",
  "policy",
  "routing decision",
  "feature flag",
  "business logic",
  "decision logic",
];

function contentFilterHardcodedConfigNotDde(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "architecture.decisions.go_through_dde_gates") return null;
  const det = details(finding);
  const capabilities = stringArrayField(det, "decisionCapabilities");
  if (capabilities.length > 0) return null;
  const concerns = stringArrayField(det, "decisionConcerns");
  if (concerns.length === 0) return null;
  const allConfigish = concerns.every((concern) => {
    const lower = concern.toLowerCase();
    const isConfig = HARDCODED_CONFIG_FRAGMENTS.some((fragment) => lower.includes(fragment));
    const isBusiness = BUSINESS_DECISION_FRAGMENTS.some((fragment) => lower.includes(fragment));
    return isConfig && !isBusiness;
  });
  if (!allConfigish) return null;
  return {
    reason: "hardcoded-config-not-dde",
    evidence:
      "Concerns are configuration-related (hardcoded values / magic numbers / timeouts); not DDE gate territory.",
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- J. UI HTTP provider abstraction ----

function contentFilterUiHttpProviderAbstraction(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  const det = details(finding);
  if (stringField(det, "concernTag") !== "ui_http_direct_call") return null;
  const file = firstFile(finding) ?? "";
  const isUiHook = file.includes("/hooks/") || file.includes("/use");
  if (!isUiHook) return null;
  return {
    reason: "ui-http-provider-abstraction",
    evidence:
      "UI hook calls an HTTP provider abstraction rather than performing a raw network request.",
    filePath: file || undefined,
    confidence: "high",
  };
}

// -- K. UI hook uses HTTP not DB ----

function contentFilterUiHookUsesHttpNotDb(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  const description = (finding.description ?? "").toLowerCase();
  const mentionsDb = description.includes("database") || description.includes(" db ");
  const mentionsHook = description.includes("hook") || description.includes(" use");
  const mentionsUi = description.includes("ui component") || description.includes("ui hook");
  if (!(mentionsDb && mentionsHook && mentionsUi)) return null;
  const mentionsUseAdminish
    = description.includes("use admin")
    || description.includes("use fetch")
    || description.includes("use api")
    || description.includes("use query")
    || description.includes("useadmin")
    || description.includes("usefetch")
    || description.includes("useapi")
    || description.includes("usequery");
  const hedges
    = description.includes("likely")
    || description.includes("probably")
    || description.includes("appears to");
  if (!mentionsUseAdminish && !hedges) return null;
  return {
    reason: "ui-hook-uses-http-not-db",
    evidence:
      "UI hook description mentions HTTP-style access (useAdmin/useFetch/etc.) rather than direct DB access.",
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- L. module gate verified caller ----

const MODULE_GATE_RULE_IDS: ReadonlySet<string> = new Set([
  "architecture.gates.must_have_production_caller",
  "architecture.gates.applies_to_must_have_production_evaluator",
  "architecture.gates.modules_must_not_create_custom_scopes",
]);

function contentFilterModuleGateVerifiedCaller(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (!finding.ruleId || !MODULE_GATE_RULE_IDS.has(finding.ruleId)) return null;
  const file = firstFile(finding) ?? "";
  const det = details(finding);
  const owner = det.owner;
  const ownerKind
    = owner && typeof owner === "object" && !Array.isArray(owner)
      ? stringField(owner as Record<string, unknown>, "kind")
      : undefined;
  const isModule
    = file.includes("GateEvaluator") || file.includes("/modules/") || ownerKind === "module";
  if (!isModule) return null;
  return {
    reason: "module-gate-verified-caller",
    evidence:
      "Module gate evaluator finding originates inside a verified-caller module path; classic suppresses these.",
    filePath: file || undefined,
    confidence: "medium",
  };
}

// -- M. route handler with service ----

const ROUTE_HANDLER_RULE_IDS: ReadonlySet<string> = new Set([
  "architecture.layering.delegates_orchestrates_decides_persists",
  "routes.construct_and_inject_deps",
]);

function contentFilterRouteHandlerWithService(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (!finding.ruleId || !ROUTE_HANDLER_RULE_IDS.has(finding.ruleId)) return null;
  const file = firstFile(finding) ?? "";
  if (!file.endsWith("route.ts")) return null;
  const det = details(finding);
  const imports = stringArrayField(det, "imports");
  const hasHandlerImport = imports.some(
    (entry) => entry.includes("/handler") || entry.endsWith("handler"),
  );
  if (!hasHandlerImport) return null;
  return {
    reason: "route-handler-with-service",
    evidence:
      "route.ts is a thin Next.js entry that delegates to a sibling handler module.",
    filePath: file || undefined,
    confidence: "high",
  };
}

// -- N. route HTTP middleware only ----

function contentFilterRouteHttpMiddlewareOnly(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "routes.construct_and_inject_deps") return null;
  const file = firstFile(finding) ?? "";
  if (!file.endsWith("route.ts")) return null;
  const det = details(finding);
  const imports = stringArrayField(det, "imports");
  const infraImports = imports.filter((entry) => entry.includes("/infra/"));
  if (infraImports.length === 0) return null;
  const allHttpOrIdentity = infraImports.every(
    (entry) => entry.includes("/infra/http/") || entry.includes("/infra/Identity"),
  );
  if (!allHttpOrIdentity) return null;
  return {
    reason: "route-http-middleware-only",
    evidence:
      "route.ts only depends on HTTP / Identity middleware infrastructure; no business-layer construction.",
    filePath: file || undefined,
    confidence: "high",
  };
}

// -- O. external API comment only ----

const EXTERNAL_API_FRAGMENTS: ReadonlyArray<string> = [
  "openai",
  "openrouter",
  "@openai/",
];

function contentFilterExternalApiCommentOnly(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "external_apis.calls_go_through_providers") return null;
  const det = details(finding);
  const imports = stringArrayField(det, "imports");
  const mentionsExternalSdk = imports.some((entry) => {
    const lower = entry.toLowerCase();
    return EXTERNAL_API_FRAGMENTS.some((fragment) => lower.includes(fragment));
  });
  if (mentionsExternalSdk) return null;
  return {
    reason: "external-api-comment-only",
    evidence:
      "External-API rule fired without any matching SDK import; treated as a comment-only mention.",
    filePath: firstFile(finding),
    confidence: "high",
  };
}

// -- P. factory file creates deps ----

const FACTORY_RULE_IDS: ReadonlySet<string> = new Set([
  "dependency_injection.services_must_not_call_factories",
  "dependency_injection.services_must_not_instantiate_infra",
]);

function contentFilterFactoryFileCreatesDeps(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (!finding.ruleId || !FACTORY_RULE_IDS.has(finding.ruleId)) return null;
  const file = firstFile(finding) ?? "";
  const isFactoryPath
    = file.includes("Factory.ts")
    || file.includes("factory.ts")
    || (file.startsWith("core/services/") && file.includes("/init/"));
  if (!isFactoryPath) return null;
  return {
    reason: "factory-file-creates-deps",
    evidence:
      "Factory / init file is allowed to instantiate infrastructure; classic exempts it from DI rules.",
    filePath: file || undefined,
    confidence: "high",
  };
}

// -- Q. Next.js route convention ----

const NEXTJS_ROUTE_EXPORTS: ReadonlySet<string> = new Set([
  "runtime",
  "dynamic",
  "revalidate",
  "fetchCache",
  "preferredRegion",
]);

function contentFilterNextjsRouteConvention(
  finding: Finding,
): FindingContentFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "routes.single_http_handler_export") return null;
  const file = firstFile(finding) ?? "";
  if (!file.endsWith("route.ts")) return null;
  const det = details(finding);
  const otherExports = stringArrayField(det, "otherExports");
  if (otherExports.length === 0) return null;
  const allConventionExports = otherExports.every((entry) =>
    NEXTJS_ROUTE_EXPORTS.has(entry),
  );
  if (!allConventionExports) return null;
  return {
    reason: "nextjs-route-convention",
    evidence:
      "All non-handler exports are Next.js route configuration (runtime / dynamic / revalidate / fetchCache / preferredRegion).",
    filePath: file || undefined,
    confidence: "high",
  };
}

// ---------- Classic-inspired result filters ----------
//
// Result filters run AFTER content + path + policy filters and
// represent the operator-configured surface filter (minConfidence /
// severity / systems / pathExcludes). Result-filtered findings are
// recorded with `source: "system"` and a result-filter reason so
// they remain auditable; they are not silently deleted.

export type FindingResultFilterOptions = {
  minConfidence?: number;
  severity?: FindingSeverity;
  systems?: string[];
  pathExcludes?: string[];
};

const FINDING_RESULT_FILTER_SEVERITY_RANK: Record<FindingSeverity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

/**
 * Apply configured result filters to a single finding. Returns the
 * first matching result-filter decision (`below-min-confidence` >
 * `below-min-severity` > `outside-selected-system` >
 * `configured-path-exclusion`) or `null` when no result filter
 * matches.
 */
export function applyFindingResultFilters(
  finding: Finding,
  options: FindingResultFilterOptions,
): FindingContentFilterDecision | null {
  // 1. minConfidence
  if (typeof options.minConfidence === "number") {
    const det = details(finding);
    const raw = det.minCapabilityConfidence;
    const value = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(value) && value < options.minConfidence) {
      return {
        reason: "below-min-confidence",
        evidence:
          `Finding minimum capability confidence ${value} is below configured minimum ${options.minConfidence}.`,
        filePath: firstFile(finding),
        confidence: "high",
      };
    }
  }

  // 2. severity
  if (options.severity) {
    const threshold = FINDING_RESULT_FILTER_SEVERITY_RANK[options.severity];
    const findingRank = FINDING_RESULT_FILTER_SEVERITY_RANK[finding.severity];
    if (findingRank < threshold) {
      return {
        reason: "below-min-severity",
        evidence:
          `Finding severity '${finding.severity}' is below configured minimum severity '${options.severity}'.`,
        filePath: firstFile(finding),
        confidence: "high",
      };
    }
  }

  // 3. systems — read from `details.system` / `details.ownerSystems`.
  if (options.systems && options.systems.length > 0) {
    const allowed = new Set(options.systems.filter((entry) => entry.length > 0));
    if (allowed.size > 0) {
      const det = details(finding);
      const single = stringField(det, "system");
      const owners = stringArrayField(det, "ownerSystems");
      const declared = single ? [single, ...owners] : owners;
      if (declared.length > 0) {
        const overlapping = declared.some((entry) => allowed.has(entry));
        if (!overlapping) {
          return {
            reason: "outside-selected-system",
            evidence:
              `Finding system${declared.length === 1 ? "" : "s"} '${declared.join(", ")}' is outside selected systems '${[...allowed].join(", ")}'.`,
            filePath: firstFile(finding),
            confidence: "high",
          };
        }
      }
    }
  }

  // 4. pathExcludes — same matchPathPattern vocabulary as policies.
  if (options.pathExcludes && options.pathExcludes.length > 0) {
    const files = Array.isArray(finding.files) ? finding.files : [];
    for (const pattern of options.pathExcludes) {
      if (pattern.length === 0) continue;
      const matched = files.find((file) => matchPathPattern(pattern, file));
      if (matched) {
        return {
          reason: "configured-path-exclusion",
          evidence:
            `File '${matched}' matches configured result-filter pathExcludes pattern '${pattern}'.`,
          filePath: matched,
          confidence: "high",
        };
      }
    }
  }

  return null;
}

/**
 * Deterministic structural validation for `findingResultFilters`.
 * Returns the cleaned options + a list of issues. Used by
 * `rekon config validate` and by the CLI loader before invoking
 * `applyFindingFilters`.
 */
export function validateFindingResultFilterOptions(value: unknown): {
  options: FindingResultFilterOptions;
  issues: FindingFilterPolicyValidationIssue[];
} {
  const issues: FindingFilterPolicyValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      options: {},
      issues: [
        {
          policyIndex: -1,
          code: "finding-result-filters-not-object",
          message: "findingResultFilters must be an object when present.",
          path: "findingResultFilters",
        },
      ],
    };
  }

  const options: FindingResultFilterOptions = {};

  if (value.minConfidence !== undefined) {
    const raw = value.minConfidence;
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 1) {
      issues.push({
        policyIndex: -1,
        code: "finding-result-filters-min-confidence-invalid",
        message: "findingResultFilters.minConfidence must be a number in [0, 1].",
        path: "findingResultFilters.minConfidence",
      });
    } else {
      options.minConfidence = raw;
    }
  }

  if (value.severity !== undefined) {
    if (typeof value.severity !== "string" || !SEVERITIES.has(value.severity as FindingSeverity)) {
      issues.push({
        policyIndex: -1,
        code: "finding-result-filters-severity-invalid",
        message: "findingResultFilters.severity must be one of critical, high, medium, low.",
        path: "findingResultFilters.severity",
      });
    } else {
      options.severity = value.severity as FindingSeverity;
    }
  }

  if (value.systems !== undefined) {
    if (!Array.isArray(value.systems)) {
      issues.push({
        policyIndex: -1,
        code: "finding-result-filters-systems-invalid",
        message: "findingResultFilters.systems must be an array of non-empty strings.",
        path: "findingResultFilters.systems",
      });
    } else {
      const cleaned: string[] = [];
      let bad = false;
      for (let index = 0; index < value.systems.length; index += 1) {
        const entry = value.systems[index];
        if (typeof entry !== "string" || entry.trim().length === 0) {
          issues.push({
            policyIndex: -1,
            code: "finding-result-filters-systems-entry-invalid",
            message: "findingResultFilters.systems entries must be non-empty strings.",
            path: `findingResultFilters.systems[${index}]`,
          });
          bad = true;
        } else {
          cleaned.push(entry);
        }
      }
      if (!bad && cleaned.length > 0) {
        options.systems = cleaned;
      }
    }
  }

  if (value.pathExcludes !== undefined) {
    if (!Array.isArray(value.pathExcludes)) {
      issues.push({
        policyIndex: -1,
        code: "finding-result-filters-path-excludes-invalid",
        message:
          "findingResultFilters.pathExcludes must be an array of relative, non-traversing glob patterns.",
        path: "findingResultFilters.pathExcludes",
      });
    } else {
      const cleaned: string[] = [];
      let bad = false;
      for (let index = 0; index < value.pathExcludes.length; index += 1) {
        const entry = value.pathExcludes[index];
        const path = `findingResultFilters.pathExcludes[${index}]`;
        if (typeof entry !== "string" || entry.trim().length === 0) {
          issues.push({
            policyIndex: -1,
            code: "finding-result-filters-path-excludes-entry-invalid",
            message: "findingResultFilters.pathExcludes entries must be non-empty strings.",
            path,
          });
          bad = true;
          continue;
        }
        if (entry.startsWith("/")) {
          issues.push({
            policyIndex: -1,
            code: "finding-result-filters-path-excludes-absolute",
            message: "findingResultFilters.pathExcludes entries must be project-relative.",
            path,
          });
          bad = true;
          continue;
        }
        if (entry.split("/").some((segment) => segment === "..")) {
          issues.push({
            policyIndex: -1,
            code: "finding-result-filters-path-excludes-traversal",
            message: "findingResultFilters.pathExcludes entries must not contain '..' traversal.",
            path,
          });
          bad = true;
          continue;
        }
        cleaned.push(entry);
      }
      if (!bad && cleaned.length > 0) {
        options.pathExcludes = cleaned;
      }
    }
  }

  return { options, issues };
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
  /**
   * Operator-configured result filters
   * (`findingResultFilters` in `.rekon/config.json`). Result
   * filters run **after** policy + classic content + built-in
   * path filters — so the deterministic suppression layer keeps
   * priority. Result-filtered findings are still recorded in
   * `filteredFindings` with `source: "system"`; they are not
   * silently deleted.
   */
  resultFilters?: FindingResultFilterOptions;
  /**
   * Optional graph-aware filter context (P1.1
   * graph-aware-finding-filter-provider v1). Lets the pipeline
   * suppress findings using artifact-backed structural evidence
   * (`ObservedRepo.files` sibling lookups, `EvidenceGraph`
   * import facts, `OwnershipMap` / `CapabilityMap` /
   * `ObservedSystem.kind`). Graph-aware filters run between
   * the classic content filters and the broad built-in path
   * heuristics; when `graphContext` is missing or its
   * artifacts are empty, the stage is a no-op and the
   * pipeline behaves exactly like before. Filtered findings
   * are recorded with `source: "system"` and a reason from
   * the existing v2 content reason set — no new reason codes.
   * See `docs/concepts/graph-aware-finding-filters.md`.
   */
  graphContext?: FindingGraphFilterContext;
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

  const resultFilters = input.resultFilters;
  const graphContext = input.graphContext;
  const graphContextActive
    = Boolean(graphContext)
    && (
      Boolean(graphContext?.evidenceGraph)
      || Boolean(graphContext?.observedRepo)
      || Boolean(graphContext?.ownershipMap)
      || Boolean(graphContext?.capabilityMap)
      || (Array.isArray(graphContext?.graphSlices) && graphContext.graphSlices.length > 0)
    );

  for (const finding of input.findings ?? []) {
    // 1. Policy filters run first; the first match wins.
    let match: FilterMatch | null = null;
    for (const policy of policies) {
      const candidate = policyFilterMatch(finding, policy);
      if (candidate) {
        match = candidate;
        break;
      }
    }
    // 2. Classic-inspired deterministic content filters.
    if (!match) {
      const decision = applyFindingContentFilters({ finding });
      if (decision) {
        match = {
          reason: decision.reason,
          evidence: decision.evidence,
          filePath: decision.filePath,
          confidence: decision.confidence,
        };
      }
    }
    // 3. Graph-aware filters (P1.1 graph-aware-finding-filter-provider v1).
    //    Strengthens the classic content layer with
    //    artifact-backed structural confirmation. No-op when
    //    `graphContext` is absent or its artifacts are empty.
    if (!match && graphContextActive && graphContext) {
      const decision = applyFindingGraphFilters({ finding, graphContext });
      if (decision) {
        match = {
          reason: decision.reason,
          evidence: decision.evidence,
          filePath: decision.filePath,
          confidence: decision.confidence,
        };
      }
    }
    // 4. Built-in path / content filters (generated/external/test/canary).
    if (!match) {
      match = findBestFilterMatch(finding);
    }
    // 5. Operator-configured result filters (minConfidence /
    //    severity / systems / pathExcludes).
    if (!match && resultFilters) {
      const decision = applyFindingResultFilters(finding, resultFilters);
      if (decision) {
        match = {
          reason: decision.reason,
          evidence: decision.evidence,
          filePath: decision.filePath,
          confidence: decision.confidence,
        };
      }
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
 * Compute a deterministic, order-sensitive fingerprint of a
 * `findingFilters` policy set. Used by `buildFindingFilterReport`
 * to stamp each `FindingFilterReport` with the policy set it
 * used, and by downstream surfaces to detect when the operator
 * changed `.rekon/config.json` `findingFilters` after the latest
 * filter run.
 *
 * Order matters because `applyFindingFilters` runs policies in
 * declared order and the first match wins. Two policy sets with
 * the same rules in a different order produce different
 * fingerprints — that is intentional and matches runtime
 * behavior.
 *
 * The empty policy set is represented by `digest` over an empty
 * array, `ruleCount: 0`, `ruleIds: []` — distinct from "no
 * fingerprint recorded" (which means the filter report predates
 * filter-policy-freshness v2 and should be regenerated).
 */
export function fingerprintFindingFilterPolicies(
  policies: ReadonlyArray<FindingFilterPolicyRule>,
): FindingFilterPolicyFingerprint {
  // Canonicalize each rule into a plain object so undefined
  // matchers don't alter the digest. Preserve array order
  // (digestJson keeps array order; only object keys are sorted).
  const canonical = policies.map((rule) => {
    const result: Record<string, unknown> = {
      id: rule.id,
      reason: rule.reason,
      evidence: rule.evidence,
    };
    if (rule.confidence !== undefined) result.confidence = rule.confidence;
    if (rule.pathPattern !== undefined) result.pathPattern = rule.pathPattern;
    if (rule.type !== undefined) result.type = rule.type;
    if (rule.ruleId !== undefined) result.ruleId = rule.ruleId;
    if (rule.severity !== undefined) result.severity = rule.severity;
    if (rule.titleIncludes !== undefined) result.titleIncludes = rule.titleIncludes;
    if (rule.descriptionIncludes !== undefined) {
      result.descriptionIncludes = rule.descriptionIncludes;
    }
    return result;
  });
  return {
    digest: digestJson(canonical),
    ruleCount: policies.length,
    ruleIds: policies.map((rule) => rule.id),
  };
}

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
  /**
   * Order-sensitive fingerprint of the `findingFilters` policy
   * set the filter run used. When supplied, downstream surfaces
   * can detect policy drift against the current
   * `.rekon/config.json`. Pass the empty-policy fingerprint
   * (via `fingerprintFindingFilterPolicies([])`) for runs with
   * no configured policies — it is distinct from "no fingerprint
   * recorded" and signals that the run knew about the policy
   * model.
   */
  policyFingerprint?: FindingFilterPolicyFingerprint;
}): FindingFilterReport {
  const keptFindings = [...input.keptFindings].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const filteredFindings = [...input.filteredFindings].sort((left, right) =>
    left.findingId.localeCompare(right.findingId),
  );
  const report: FindingFilterReport = {
    header: input.header,
    summary: summarizeFindingFilterReport(keptFindings, filteredFindings, input.policyUsage),
    keptFindings,
    filteredFindings,
  };
  if (input.policyFingerprint) {
    report.policyFingerprint = input.policyFingerprint;
  }
  return assertFindingFilterReport(report);
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

  if (value.policyFingerprint !== undefined) {
    validatePolicyFingerprint(value.policyFingerprint, "$.policyFingerprint", issues);
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: value as FindingFilterReport, issues: [] };
}

function validatePolicyFingerprint(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  if (typeof value.digest !== "string" || value.digest.length === 0) {
    issues.push({ path: `${path}.digest`, message: "Expected a non-empty string." });
  }
  if (typeof value.ruleCount !== "number" || !Number.isInteger(value.ruleCount) || value.ruleCount < 0) {
    issues.push({
      path: `${path}.ruleCount`,
      message: "Expected a non-negative integer.",
    });
  }
  if (!isStringArray(value.ruleIds)) {
    issues.push({ path: `${path}.ruleIds`, message: "Expected an array of strings." });
  } else if (
    typeof value.ruleCount === "number"
    && (value.ruleIds as string[]).length !== value.ruleCount
  ) {
    issues.push({
      path: `${path}.ruleIds`,
      message: "Expected ruleIds.length to match ruleCount.",
    });
  }
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
  /**
   * Count of findings suppressed by classic-inspired content
   * filters (`empty-constructor-stub` /
   * `route-handler-with-service` / etc.). Always present;
   * `0` when no content filter fired.
   */
  contentFiltered: number;
  /**
   * Count of findings suppressed by operator-configured result
   * filters (`below-min-confidence` / `below-min-severity` /
   * `outside-selected-system` / `configured-path-exclusion`).
   * Always present; `0` when no result filter fired.
   */
  resultFiltered: number;
  // ---------- Diagnostics v2 ----------
  /**
   * Count of findings suppressed by built-in path / content
   * heuristics (`generated-file`, `external-file`, `test-file`,
   * `canary-file`, `content-filter`, `explicit-exclusion`,
   * `policy-exception`, `other`). Always present; `0` when no
   * built-in path filter fired. Result + content + policy +
   * graph-aware + built-in counts sum to `totalFiltered`.
   */
  builtInPathFiltered: number;
  /**
   * Per-reason filter rate (`byReason[reason] / totalFindings`),
   * rounded to four decimals. Useful for downstream rendering
   * (the architecture summary's Filter Reasons table can sort by
   * rate). Always present; empty when no findings were filtered.
   */
  filterRateByReason: Record<string, number>;
  /**
   * Per-policy filter rate (`byPolicy[id] / totalFindings`),
   * rounded to four decimals. Present when `byPolicy` is
   * non-empty.
   */
  filterRateByPolicy?: Record<string, number>;
  /**
   * Reason that suppressed the most findings (alphabetic
   * tiebreak). Present when at least one finding was filtered.
   */
  dominantReason?: { reason: string; count: number; rate: number };
  /**
   * Policy id that suppressed the most findings (alphabetic
   * tiebreak). Present when at least one policy filter fired.
   */
  dominantPolicy?: { policyId: string; count: number; rate: number };
  /**
   * Mirror of `FindingFilterReport.policyFingerprint` (when the
   * upstream filter report carries one). Lets downstream surfaces
   * inspect filter-policy health without re-reading the filter
   * report directly.
   */
  policyFingerprint?: FindingFilterPolicyFingerprint;
  // ---------- Graph-aware surfacing v1 ----------
  /**
   * Count of findings suppressed by the graph-aware classifier
   * (`route-handler-with-service`,
   * `route-http-middleware-only`, `external-api-comment-only`,
   * `factory-file-creates-deps`,
   * `module-gate-verified-caller`). Always present; `0` when
   * nothing graph-aware fired. The five bucket counts
   * (`policyFiltered` + `graphAwareFiltered` +
   * `contentFiltered` + `resultFiltered` +
   * `builtInPathFiltered`) sum to `totalFiltered`. v1.
   */
  graphAwareFiltered: number;
  /**
   * Per-graph-aware-reason count, computed only over entries
   * that classified as graph-aware (so a policy-filtered entry
   * that happens to share a reason code does not inflate the
   * count). Always present; empty when nothing graph-aware
   * fired. v1.
   */
  byGraphAwareReason: Record<string, number>;
  /**
   * Per-graph-aware-reason filter rate
   * (`byGraphAwareReason[reason] / totalFindings`), rounded to
   * four decimals. Always present; empty when no graph-aware
   * filter fired. v1.
   */
  filterRateByGraphAwareReason: Record<string, number>;
  /**
   * Graph-aware reason that suppressed the most findings
   * (alphabetic tiebreak). Present when at least one
   * graph-aware filter fired. v1.
   */
  dominantGraphAwareReason?: { reason: string; count: number; rate: number };
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
  /**
   * Optional fingerprint of the **current**
   * `.rekon/config.json findingFilters`. When supplied and
   * non-matching against `filterReport.policyFingerprint`, the
   * health report emits `stale-policy-fingerprint`. When the
   * filter report has policy-filtered entries but no
   * `policyFingerprint`, the health report emits
   * `policy-fingerprint-missing`. Mirrors the freshness check
   * that the capability-docs publishers perform, but kept
   * report-local so non-publication consumers see the same
   * diagnostic.
   */
  currentPolicyFingerprint?: FindingFilterPolicyFingerprint;
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

  // Classification (diagnostics v2 + graph-aware surfacing v1).
  // Policy takes precedence; graph-aware / result / content /
  // built-in are mutually exclusive over the remaining filtered
  // entries.
  const policyFiltered = report.filteredFindings.filter(isPolicyFiltered).length;
  const lowConfidencePolicyFiltered = report.filteredFindings.filter(
    (entry) => isPolicyFiltered(entry) && entry.confidence === "low",
  ).length;
  const graphAwareFiltered = report.filteredFindings.filter(isGraphAwareFiltered).length;
  const contentFiltered = report.filteredFindings.filter(isClassicContentFiltered).length;
  const resultFiltered = report.filteredFindings.filter(isResultFiltered).length;
  const builtInPathFiltered = report.filteredFindings.filter(isBuiltInPathFiltered).length;
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

  // Per-reason / per-policy filter rates (rounded to 4 dp).
  const filterRateByReason: Record<string, number> = {};
  for (const [reason, count] of Object.entries(report.summary.byReason)) {
    filterRateByReason[reason] = totalFindings === 0
      ? 0
      : Math.round((count / totalFindings) * 10000) / 10000;
  }
  let filterRateByPolicy: Record<string, number> | undefined;
  if (byPolicy && Object.keys(byPolicy).length > 0) {
    filterRateByPolicy = {};
    for (const [policyId, count] of Object.entries(byPolicy)) {
      filterRateByPolicy[policyId] = totalFindings === 0
        ? 0
        : Math.round((count / totalFindings) * 10000) / 10000;
    }
  }

  // Dominant reason / policy — deterministic alphabetic tiebreak
  // so output stays stable.
  let dominantReason: { reason: string; count: number; rate: number } | undefined;
  const reasonEntries = Object.entries(report.summary.byReason)
    .filter(([, count]) => count > 0)
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    });
  if (reasonEntries.length > 0) {
    const [reason, count] = reasonEntries[0]!;
    dominantReason = {
      reason,
      count,
      rate: filterRateByReason[reason] ?? 0,
    };
  }
  let dominantPolicy: { policyId: string; count: number; rate: number } | undefined;
  if (byPolicy && Object.keys(byPolicy).length > 0) {
    const policyEntries = Object.entries(byPolicy)
      .filter(([, count]) => count > 0)
      .sort((left, right) => {
        if (right[1] !== left[1]) return right[1] - left[1];
        return left[0].localeCompare(right[0]);
      });
    if (policyEntries.length > 0) {
      const [policyId, count] = policyEntries[0]!;
      dominantPolicy = {
        policyId,
        count,
        rate: (filterRateByPolicy ?? {})[policyId] ?? 0,
      };
    }
  }

  // Graph-aware sub-buckets. Compute only over the
  // filteredFindings that classified as graph-aware so
  // dominant-graph-aware-reason isn't biased by overlapping
  // content-bucket entries that happen to share a reason code.
  const graphAwareEntries = report.filteredFindings.filter(isGraphAwareFiltered);
  const graphAwareByReason: Record<string, number> = {};
  for (const entry of graphAwareEntries) {
    graphAwareByReason[entry.reason] = (graphAwareByReason[entry.reason] ?? 0) + 1;
  }
  const filterRateByGraphAwareReason: Record<string, number> = {};
  for (const [reason, count] of Object.entries(graphAwareByReason)) {
    filterRateByGraphAwareReason[reason] = totalFindings === 0
      ? 0
      : Math.round((count / totalFindings) * 10000) / 10000;
  }
  let dominantGraphAwareReason:
    | { reason: string; count: number; rate: number }
    | undefined;
  const graphAwareReasonEntries = Object.entries(graphAwareByReason)
    .filter(([, count]) => count > 0)
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    });
  if (graphAwareReasonEntries.length > 0) {
    const [reason, count] = graphAwareReasonEntries[0]!;
    dominantGraphAwareReason = {
      reason,
      count,
      rate: filterRateByGraphAwareReason[reason] ?? 0,
    };
  }

  const summary: FindingFilterHealthSummary = {
    totalFindings,
    totalFiltered: report.summary.totalFiltered,
    filterRate: Math.round(filterRate * 10000) / 10000,
    highConfidenceFiltered,
    lowConfidenceFiltered,
    byReason: { ...report.summary.byReason },
    policyFiltered,
    unusedPolicies,
    contentFiltered,
    resultFiltered,
    builtInPathFiltered,
    filterRateByReason,
    graphAwareFiltered,
    byGraphAwareReason: { ...graphAwareByReason },
    filterRateByGraphAwareReason,
  };
  if (byPolicy) {
    summary.byPolicy = byPolicy;
  }
  if (filterRateByPolicy) {
    summary.filterRateByPolicy = filterRateByPolicy;
  }
  if (dominantReason) {
    summary.dominantReason = dominantReason;
  }
  if (dominantPolicy) {
    summary.dominantPolicy = dominantPolicy;
  }
  if (dominantGraphAwareReason) {
    summary.dominantGraphAwareReason = dominantGraphAwareReason;
  }
  if (report.policyFingerprint) {
    summary.policyFingerprint = report.policyFingerprint;
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

  // Classic-inspired alerts (v2).
  //
  // `content-filter-high-volume` fires when one classic-inspired
  // content reason accounts for >= 5 findings AND > 50 % of total
  // findings — same intent as the policy-over-filtering check but
  // applied to the deterministic content layer.
  if (totalFindings > 0) {
    for (const [reason, count] of Object.entries(report.summary.byReason)) {
      if (
        CLASSIC_CONTENT_FILTER_REASONS.has(reason as FindingFilterReason)
        && count >= 5
        && count / totalFindings > 0.5
      ) {
        alerts.push({
          code: "content-filter-high-volume",
          severity: "warning",
          message:
            `Content filter '${reason}' suppressed ${count} of ${totalFindings} findings (${((count / totalFindings) * 100).toFixed(1)}%). Inspect FindingFilterReport.filteredFindings before trusting active governance counts.`,
        });
        break;
      }
    }
  }

  // `result-filter-over-filtering` fires when configured
  // findingResultFilters dominate suppression — useful to catch
  // an over-aggressive minConfidence / severity floor or an
  // over-broad pathExcludes pattern.
  if (totalFindings > 0 && resultFiltered / totalFindings > threshold) {
    alerts.push({
      code: "result-filter-over-filtering",
      severity: "warning",
      message:
        `Configured result filters suppressed ${resultFiltered} of ${totalFindings} findings (${((resultFiltered / totalFindings) * 100).toFixed(1)}%). Review .rekon/config.json findingResultFilters before trusting active governance counts.`,
    });
  }

  // ---------- Diagnostics v2 alerts ----------
  //
  // Dominance thresholds are deliberately lower than the
  // over-filtering thresholds above (0.5 vs. 0.8) and require a
  // minimum corpus size (5 findings). They surface a different
  // failure mode: one reason / category dominates the
  // suppression even when the overall filter rate is moderate,
  // which usually means a single rule or detector is doing the
  // bulk of the work and deserves review.
  const DOMINANCE_THRESHOLD = 0.5;
  const DOMINANCE_MIN_CORPUS = 5;

  if (
    totalFindings >= DOMINANCE_MIN_CORPUS
    && dominantReason
    && dominantReason.rate >= DOMINANCE_THRESHOLD
  ) {
    alerts.push({
      code: "reason-over-filtering",
      severity: "warning",
      message:
        `Filter reason '${dominantReason.reason}' suppressed ${dominantReason.count} of ${totalFindings} findings (${(dominantReason.rate * 100).toFixed(1)}%). Inspect FindingFilterReport.filteredFindings before trusting active governance counts.`,
    });
  }

  if (
    totalFindings >= DOMINANCE_MIN_CORPUS
    && dominantPolicy
    && dominantPolicy.rate >= DOMINANCE_THRESHOLD
  ) {
    alerts.push({
      code: "policy-dominance",
      severity: "warning",
      message:
        `Configured policy '${dominantPolicy.policyId}' suppressed ${dominantPolicy.count} of ${totalFindings} findings (${(dominantPolicy.rate * 100).toFixed(1)}%). Review .rekon/config.json findingFilters for over-broad matchers.`,
    });
  }

  if (
    totalFindings >= DOMINANCE_MIN_CORPUS
    && contentFiltered / totalFindings >= DOMINANCE_THRESHOLD
  ) {
    alerts.push({
      code: "content-filter-dominance",
      severity: "warning",
      message:
        `Classic content filters suppressed ${contentFiltered} of ${totalFindings} findings (${((contentFiltered / totalFindings) * 100).toFixed(1)}%). Inspect FindingFilterReport.filteredFindings before trusting active governance counts.`,
    });
  }

  if (
    totalFindings >= DOMINANCE_MIN_CORPUS
    && resultFiltered / totalFindings >= DOMINANCE_THRESHOLD
  ) {
    alerts.push({
      code: "result-filter-dominance",
      severity: "warning",
      message:
        `Operator-configured result filters suppressed ${resultFiltered} of ${totalFindings} findings (${((resultFiltered / totalFindings) * 100).toFixed(1)}%). Review .rekon/config.json findingResultFilters for an over-aggressive floor or pattern.`,
    });
  }

  // ---------- Graph-aware surfacing v1 alerts ----------
  //
  // Mirror the content / result dominance gates so operators see
  // structural suppression separately from detector-`details`
  // matches. Same 50 % threshold + 5-finding minimum corpus.
  if (
    totalFindings >= DOMINANCE_MIN_CORPUS
    && graphAwareFiltered / totalFindings >= DOMINANCE_THRESHOLD
  ) {
    alerts.push({
      code: "graph-aware-filter-dominance",
      severity: "warning",
      message:
        `Graph-aware (structural) filters suppressed ${graphAwareFiltered} of ${totalFindings} findings (${((graphAwareFiltered / totalFindings) * 100).toFixed(1)}%). Inspect FindingFilterReport.filteredFindings for structural evidence before trusting active governance counts.`,
    });
  }
  if (
    totalFindings >= DOMINANCE_MIN_CORPUS
    && dominantGraphAwareReason
    && dominantGraphAwareReason.rate >= DOMINANCE_THRESHOLD
  ) {
    alerts.push({
      code: "graph-aware-reason-dominance",
      severity: "warning",
      message:
        `Graph-aware reason '${dominantGraphAwareReason.reason}' suppressed ${dominantGraphAwareReason.count} of ${totalFindings} findings (${(dominantGraphAwareReason.rate * 100).toFixed(1)}%). Review FindingFilterReport.filteredFindings before relying on active governance counts.`,
    });
  }

  // ---------- Policy fingerprint health (diagnostics v2) ----------
  //
  // Two cases:
  //
  //   - policy-fingerprint-missing — the upstream filter report
  //     has policy-filtered entries but no `policyFingerprint`.
  //     This means the report predates filter-policy-freshness v2;
  //     downstream surfaces (architecture summary / agent
  //     contract) treat it as `status: "unknown"`. Surface here
  //     too so operators reading raw filter-health output see
  //     the same diagnostic.
  //   - stale-policy-fingerprint — the caller supplied a current
  //     fingerprint that does not match the report's. The
  //     operator changed `.rekon/config.json findingFilters`
  //     after the latest filter run; rerun `rekon refresh`.
  if (policyFiltered > 0 && !report.policyFingerprint) {
    alerts.push({
      code: "policy-fingerprint-missing",
      severity: "warning",
      message:
        "FindingFilterReport has policy-filtered entries but no policyFingerprint; rerun `rekon refresh` to regenerate a fingerprinted report.",
    });
  }
  if (
    input.currentPolicyFingerprint
    && report.policyFingerprint
    && input.currentPolicyFingerprint.digest !== report.policyFingerprint.digest
  ) {
    alerts.push({
      code: "stale-policy-fingerprint",
      severity: "warning",
      message:
        ".rekon/config.json findingFilters changed after the latest FindingFilterReport was produced; rerun `rekon refresh` to rebuild the filter chain with the current policy set.",
    });
  }

  alerts.sort((left, right) => left.code.localeCompare(right.code));
  return { summary, alerts };
}

// Buckets reused by `buildFindingFilterHealth` to count content
// vs. graph-aware vs. result suppression independently of
// byPolicy and to gate the over-filtering / dominance alerts.
//
// The graph-aware bucket lives in a separate set so its counts
// don't inflate `contentFiltered`. Pre-graph-aware-surfacing v1
// the graph-aware reasons lived inside
// `CLASSIC_CONTENT_FILTER_REASONS` because the v2 classic content
// filter still emits the same reason codes. From the filter-
// health perspective, what matters is the *kind of evidence* a
// reason represents: a structural / artifact-backed match
// (graph-aware) versus a detector-`details`-only match (content).
// The five reasons listed in `GRAPH_AWARE_FILTER_REASONS` are
// inherently structural — they describe sibling-file existence,
// import-graph resolution, capability ownership, and module-
// kind routing — so we bucket them under graph-aware regardless
// of which physical layer (v2 content or v1 graph-aware) fired
// the match.
const GRAPH_AWARE_FILTER_REASONS = new Set<FindingFilterReason>([
  "route-handler-with-service",
  "route-http-middleware-only",
  "external-api-comment-only",
  "factory-file-creates-deps",
  "module-gate-verified-caller",
]);

const CLASSIC_CONTENT_FILTER_REASONS = new Set<FindingFilterReason>([
  "empty-constructor-stub",
  "storage-retrieval-placeholder",
  "client-safe-infra",
  "same-directory-import",
  "svg-namespace-url",
  "client-env-node-env",
  "speculative-anti-pattern",
  "archetype-inference-note",
  "hardcoded-config-not-dde",
  "ui-http-provider-abstraction",
  "ui-hook-uses-http-not-db",
  "nextjs-route-convention",
]);

const RESULT_FILTER_REASONS = new Set<FindingFilterReason>([
  "below-min-confidence",
  "below-min-severity",
  "outside-selected-system",
  "configured-path-exclusion",
]);

// Built-in path / content reasons (v1 path heuristics + the
// `explicit-exclusion` / `policy-exception` reasons that pre-date
// the policy `source` field). Used by `isBuiltInPathFiltered`
// when classifying a filtered finding into one of five buckets
// (policy / graph-aware / content / result / built-in-path).
const BUILT_IN_PATH_FILTER_REASONS = new Set<FindingFilterReason>([
  "generated-file",
  "external-file",
  "test-file",
  "canary-file",
  "content-filter",
  "explicit-exclusion",
  "policy-exception",
  "other",
]);

// ---------- Filter classification helpers (diagnostics v2) ----------
//
// Deterministic classifiers over a `FilteredFinding` entry.
// Used by `buildFindingFilterHealth` to compute per-category
// counts (`policyFiltered` / `contentFiltered` / `resultFiltered` /
// `builtInPathFiltered`) and by downstream surfaces / tests that
// want the same classification logic.
//
// Policy takes precedence: any filtered entry with
// `source === "policy"` (or a `policyId`) is policy-filtered,
// regardless of its `reason`. The remaining buckets are mutually
// exclusive based on the reason set.

export function isPolicyFiltered(entry: FilteredFinding): boolean {
  return entry.source === "policy" || (typeof entry.policyId === "string" && entry.policyId.length > 0);
}

export function isResultFiltered(entry: FilteredFinding): boolean {
  if (isPolicyFiltered(entry)) return false;
  return RESULT_FILTER_REASONS.has(entry.reason);
}

/**
 * Graph-aware classification. The five v1 graph-aware reasons
 * are inherently structural (sibling-file existence, import
 * facts, capability ownership, module-kind routing). Bucket
 * them separately from the classic content filters so
 * filter-health diagnostics can disclose structural
 * suppression vs. detector-`details`-only suppression.
 * Policy always wins.
 */
export function isGraphAwareFiltered(entry: FilteredFinding): boolean {
  if (isPolicyFiltered(entry)) return false;
  return GRAPH_AWARE_FILTER_REASONS.has(entry.reason);
}

export function isClassicContentFiltered(entry: FilteredFinding): boolean {
  if (isPolicyFiltered(entry)) return false;
  return CLASSIC_CONTENT_FILTER_REASONS.has(entry.reason);
}

export function isBuiltInPathFiltered(entry: FilteredFinding): boolean {
  if (isPolicyFiltered(entry)) return false;
  if (RESULT_FILTER_REASONS.has(entry.reason)) return false;
  if (GRAPH_AWARE_FILTER_REASONS.has(entry.reason)) return false;
  if (CLASSIC_CONTENT_FILTER_REASONS.has(entry.reason)) return false;
  return BUILT_IN_PATH_FILTER_REASONS.has(entry.reason);
}

export function createFindingFilterHealthReport(input: {
  header: ArtifactHeader;
  filterReport: FindingFilterReport;
  highFilterRateThreshold?: number;
  policies?: FindingFilterPolicyRule[];
  /**
   * Optional current `.rekon/config.json findingFilters`
   * fingerprint; forwarded to `buildFindingFilterHealth` so the
   * report can emit `stale-policy-fingerprint` /
   * `policy-fingerprint-missing` alerts. Diagnostic-only — no
   * filtering decisions are changed.
   */
  currentPolicyFingerprint?: FindingFilterPolicyFingerprint;
}): FindingFilterHealthReport {
  const built = buildFindingFilterHealth({
    filterReport: input.filterReport,
    highFilterRateThreshold: input.highFilterRateThreshold,
    policies: input.policies,
    currentPolicyFingerprint: input.currentPolicyFingerprint,
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

// ---------- FindingFilterPolicy apply safety v2 ----------
//
// Deterministic helpers that gate explicit operator-driven
// applies of a `FindingFilterPolicyRule` against
// `.rekon/config.json`. These helpers describe *what the apply
// would do* — they never read or write the filesystem.
//
// The classic codebase-intel guarantee being preserved here is
// that operators can promote recurring false positives into
// durable policy without losing auditability or accidentally
// suppressing real findings via an over-broad rule.

/**
 * Patterns that match a single broad directory (`<segment>/**`),
 * the whole repo (`**`, `**\/*`, `*\/**`, `*`), or the current
 * working directory (`.`, `./**`). Broad rules with no narrower
 * matcher require `--force` because they can silently suppress
 * unrelated real findings. See
 * `docs/concepts/finding-filter-policy-suggestions.md`.
 */
const FINDING_FILTER_POLICY_BROAD_PATH_PATTERNS = new Set<string>([
  "*",
  "**",
  "**/*",
  "*/**",
  ".",
  "./**",
  "src/**",
  "packages/**",
  "apps/**",
  "lib/**",
  "tests/**",
  "test/**",
]);

/**
 * Returns `true` when `rule` would suppress findings broadly
 * enough to deserve an explicit `--force` gate. A rule is broad
 * when, taken together, its matchers only narrow the surface to
 * "a single top-level directory" or wider. A rule that adds a
 * `type` / `ruleId` / `severity` / `titleIncludes` /
 * `descriptionIncludes` matcher on top of a broad pathPattern
 * is **not** considered broad — the extra matcher narrows it.
 */
export function isBroadFindingFilterPolicyRule(
  rule: FindingFilterPolicyRule,
): boolean {
  const hasNarrowMatcher = Boolean(
    rule.type
      || rule.ruleId
      || rule.severity
      || (typeof rule.titleIncludes === "string" && rule.titleIncludes.length > 0)
      || (typeof rule.descriptionIncludes === "string"
        && rule.descriptionIncludes.length > 0),
  );
  if (hasNarrowMatcher) {
    return false;
  }
  const pattern = typeof rule.pathPattern === "string" ? rule.pathPattern.trim() : "";
  if (pattern.length === 0) {
    // No pathPattern, no other matcher → matches everything by
    // default; treat as broad.
    return true;
  }
  if (FINDING_FILTER_POLICY_BROAD_PATH_PATTERNS.has(pattern)) {
    return true;
  }
  // Single top-level segment + `/**` (e.g. "src/**") even when
  // not in the explicit list above. We deliberately keep two
  // segments (`src/generated/**`) outside the broad set.
  const segments = pattern.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 2 && segments[1] === "**") {
    return true;
  }
  if (segments.length === 1 && segments[0] === "**") {
    return true;
  }
  return false;
}

export type FindingFilterPolicyApplyWarningCode =
  | "low-confidence-suggestion"
  | "duplicate-rule-id"
  | "broad-path-pattern"
  | "config-missing";

export type FindingFilterPolicyApplyWarning = {
  code: FindingFilterPolicyApplyWarningCode;
  message: string;
};

export type FindingFilterPolicyApplyBlockerCode =
  | "low-confidence-suggestion"
  | "duplicate-rule-id"
  | "broad-path-pattern";

export type FindingFilterPolicyApplyBlocker = {
  code: FindingFilterPolicyApplyBlockerCode;
  message: string;
};

export type FindingFilterPolicyApplyDiff = {
  addedFindingFilters: FindingFilterPolicyRule[];
  replacedFindingFilters: {
    before: FindingFilterPolicyRule;
    after: FindingFilterPolicyRule;
  }[];
  beforeCount: number;
  afterCount: number;
};

export type FindingFilterPolicyApplyPlan = {
  /** Suggestion id being evaluated. */
  suggestionId: string;
  /** Concrete rule that would land in `findingFilters`. */
  rule: FindingFilterPolicyRule;
  /** Sorted, deterministic diff against the existing rules. */
  diff: FindingFilterPolicyApplyDiff;
  /** Existing rules **after** the proposed change. */
  proposedRules: FindingFilterPolicyRule[];
  /** Warnings to surface to the operator (always returned). */
  warnings: FindingFilterPolicyApplyWarning[];
  /**
   * Blockers that would refuse an actual apply when `--force` is
   * not provided. Empty when the apply is safe.
   */
  blockers: FindingFilterPolicyApplyBlocker[];
  /** Convenience flag: any blocker is present. */
  requiresForce: boolean;
  /** Whether the suggestion is low-confidence (`confidence: "low"`). */
  isLowConfidence: boolean;
  /** Whether an existing rule with the same id would be replaced. */
  isDuplicateRuleId: boolean;
  /** Whether the proposed rule is too broad to apply without `--force`. */
  isBroadPattern: boolean;
};

export type PlanFindingFilterPolicyApplyInput = {
  suggestion: FindingFilterPolicySuggestion;
  /** Existing `findingFilters` from `.rekon/config.json`. */
  existingRules: ReadonlyArray<FindingFilterPolicyRule>;
};

/**
 * Pure deterministic apply planner. Reports what an apply would
 * do (added vs. replaced rule, before/after counts, warnings,
 * blockers, whether `--force` is required) without touching the
 * filesystem. The CLI is responsible for honoring `force` and
 * actually writing the config.
 */
export function planFindingFilterPolicyApply(
  input: PlanFindingFilterPolicyApplyInput,
): FindingFilterPolicyApplyPlan {
  const { suggestion, existingRules } = input;
  const rule: FindingFilterPolicyRule = { ...suggestion.suggestedRule };
  const beforeCount = existingRules.length;

  const isLowConfidence = suggestion.confidence === "low";
  const isBroadPattern = isBroadFindingFilterPolicyRule(rule);
  const duplicateIndex = existingRules.findIndex(
    (entry) => entry.id === rule.id,
  );
  const isDuplicateRuleId = duplicateIndex >= 0;

  const proposedRules: FindingFilterPolicyRule[] = [...existingRules];
  const addedFindingFilters: FindingFilterPolicyRule[] = [];
  const replacedFindingFilters: {
    before: FindingFilterPolicyRule;
    after: FindingFilterPolicyRule;
  }[] = [];

  if (isDuplicateRuleId) {
    const before = { ...existingRules[duplicateIndex]! };
    proposedRules[duplicateIndex] = rule;
    replacedFindingFilters.push({ before, after: { ...rule } });
  } else {
    proposedRules.push(rule);
    addedFindingFilters.push({ ...rule });
  }

  const warnings: FindingFilterPolicyApplyWarning[] = [];
  const blockers: FindingFilterPolicyApplyBlocker[] = [];

  if (isLowConfidence) {
    const message
      = "Suggestion is low-confidence; --force is required to apply it.";
    warnings.push({ code: "low-confidence-suggestion", message });
    blockers.push({ code: "low-confidence-suggestion", message });
  }

  if (isBroadPattern) {
    const message
      = "Broad finding filter policies can suppress real findings. Review FindingFilterReport evidence before applying.";
    warnings.push({ code: "broad-path-pattern", message });
    blockers.push({ code: "broad-path-pattern", message });
  }

  if (isDuplicateRuleId) {
    const message
      = `findingFilters already contains a rule with id '${rule.id}'. --force replaces it with the suggested rule.`;
    warnings.push({ code: "duplicate-rule-id", message });
    blockers.push({ code: "duplicate-rule-id", message });
  }

  return {
    suggestionId: suggestion.id,
    rule,
    diff: {
      addedFindingFilters,
      replacedFindingFilters,
      beforeCount,
      afterCount: proposedRules.length,
    },
    proposedRules,
    warnings,
    blockers,
    requiresForce: blockers.length > 0,
    isLowConfidence,
    isDuplicateRuleId,
    isBroadPattern,
  };
}

// ---------- Graph-aware finding filters (v1) ----------
//
// Pure deterministic provider that consumes Rekon artifacts
// (`ObservedRepo`, `OwnershipMap`, `CapabilityMap`,
// `EvidenceGraph`, `GraphSlice`) and contributes structural
// filter decisions to `applyFindingFilters`. No source-file
// reads. No LLM, semantic, fuzzy, or embedding matching. No
// new reason codes — every match reuses an existing v2
// content reason (see
// `docs/strategy/graph-ontology-validator-lite-audit.md`).
//
// This is the "lite" companion to classic
// `GraphOntologyValidator` named by the audit. The audit
// explicitly rejects porting the monolithic validator;
// instead we ship five candidate checks here that
// strengthen the existing v2 content filters by adding
// artifact-backed confirmation when the upstream detector
// did not surface a `details` payload.
//
// Structural "Like" types let the kernel stay free of
// `@rekon/kernel-repo-model` / `@rekon/kernel-evidence` /
// `@rekon/kernel-graph` runtime deps; callers can pass the
// real artifacts directly because the field shapes match.

export type ObservedRepoLike = {
  /** Sorted, repo-relative file index. */
  files?: ReadonlyArray<string>;
  /** Observed systems with optional `kind`. */
  systems?: ReadonlyArray<{
    id: string;
    paths?: ReadonlyArray<string>;
    kind?: string;
  }>;
};

export type OwnershipMapLike = {
  entries?: ReadonlyArray<{
    path: string;
    ownerSystem: string;
  }>;
};

export type CapabilityMapLike = {
  entries?: ReadonlyArray<{
    capability: string;
    subjects?: ReadonlyArray<string>;
    systems?: ReadonlyArray<string>;
  }>;
};

export type EvidenceFactLike = {
  kind: string;
  subject: string;
  value?: Record<string, unknown>;
};

export type EvidenceGraphLike = {
  facts?: ReadonlyArray<EvidenceFactLike>;
};

export type GraphSliceLike = {
  producer?: string;
  edges?: ReadonlyArray<{
    source: string;
    target: string;
    kind: string;
  }>;
};

export type FindingGraphFilterContext = {
  evidenceGraph?: EvidenceGraphLike;
  observedRepo?: ObservedRepoLike;
  ownershipMap?: OwnershipMapLike;
  capabilityMap?: CapabilityMapLike;
  graphSlices?: ReadonlyArray<GraphSliceLike>;
};

export type FindingGraphFilterDecision = {
  reason: FindingFilterReason;
  evidence: string;
  filePath?: string;
  confidence: FindingFilterConfidence;
};

/**
 * Run every graph-aware filter in priority order. Returns
 * the first matching decision or `null`. Pure deterministic
 * — no fs / network / LLM / source reads. When
 * `graphContext` is empty or its artifacts are missing,
 * checks that depend on those artifacts conservatively
 * skip (no-op) rather than guessing.
 */
export function applyFindingGraphFilters(input: {
  finding: Finding;
  graphContext: FindingGraphFilterContext;
}): FindingGraphFilterDecision | null {
  const finding = input.finding;
  for (const check of GRAPH_FILTER_CHECKS) {
    const decision = check(finding, input.graphContext);
    if (decision) return decision;
  }
  return null;
}

const GRAPH_FILTER_CHECKS: ReadonlyArray<
  (finding: Finding, ctx: FindingGraphFilterContext) => FindingGraphFilterDecision | null
> = [
  graphFilterRouteHandlerWithService,
  graphFilterRouteHttpMiddlewareOnly,
  graphFilterExternalApiCommentOnly,
  graphFilterFactoryFileCreatesDeps,
  graphFilterModuleGateVerifiedCaller,
];

// ----- A. route handler / sibling handler -----

const ROUTE_HANDLER_GRAPH_RULE_IDS: ReadonlySet<string> = new Set([
  "architecture.layering.delegates_orchestrates_decides_persists",
  "routes.construct_and_inject_deps",
]);

function graphFilterRouteHandlerWithService(
  finding: Finding,
  ctx: FindingGraphFilterContext,
): FindingGraphFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (!finding.ruleId || !ROUTE_HANDLER_GRAPH_RULE_IDS.has(finding.ruleId)) return null;
  const file = firstFile(finding) ?? "";
  if (!file.endsWith("route.ts")) return null;

  const det = details(finding);
  const imports = stringArrayField(det, "imports");
  const handlerImport = imports.find(
    (entry) => entry.includes("/handler") || entry.endsWith("handler"),
  );
  if (handlerImport) {
    return {
      reason: "route-handler-with-service",
      evidence: `Route delegates to handler via import '${handlerImport}'.`,
      filePath: file,
      confidence: "high",
    };
  }

  const sibling = findSiblingHandlerPath(file, ctx.observedRepo);
  if (sibling) {
    return {
      reason: "route-handler-with-service",
      evidence: `Route has sibling handler file '${sibling}' (per ObservedRepo file index).`,
      filePath: file,
      confidence: "high",
    };
  }

  return null;
}

function findSiblingHandlerPath(
  routeFile: string,
  observedRepo: ObservedRepoLike | undefined,
): string | null {
  const files = observedRepo?.files;
  if (!Array.isArray(files) || files.length === 0) return null;
  const lastSlash = routeFile.lastIndexOf("/");
  const dir = lastSlash >= 0 ? routeFile.slice(0, lastSlash + 1) : "";
  // Common sibling names — `handler.ts`, `handler.tsx`, or the
  // route name-prefixed handler (e.g. `users/route.ts` paired
  // with `users/users.handler.ts`). Keep it deterministic:
  // exact match by `<dir>handler.ts` or `<dir>handler.tsx`.
  for (const candidate of [`${dir}handler.ts`, `${dir}handler.tsx`]) {
    if (files.includes(candidate)) return candidate;
  }
  return null;
}

// ----- B. route HTTP middleware only -----

function graphFilterRouteHttpMiddlewareOnly(
  finding: Finding,
  _ctx: FindingGraphFilterContext,
): FindingGraphFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "routes.construct_and_inject_deps") return null;
  const file = firstFile(finding) ?? "";
  if (!file.endsWith("route.ts")) return null;
  const det = details(finding);
  const imports = stringArrayField(det, "imports");
  const infraImports = imports.filter((entry) => entry.includes("/infra/"));
  if (infraImports.length === 0) return null;
  const allHttpOrIdentity = infraImports.every(
    (entry) => entry.includes("/infra/http/") || entry.includes("/infra/Identity"),
  );
  if (!allHttpOrIdentity) return null;
  return {
    reason: "route-http-middleware-only",
    evidence: `Route imports only HTTP / Identity middleware infra: ${infraImports.join(", ")}.`,
    filePath: file,
    confidence: "high",
  };
}

// ----- C. external API comment only -----

const EXTERNAL_API_SDK_FRAGMENTS: ReadonlyArray<string> = [
  "openai",
  "openrouter",
  "@openai/",
];

function graphFilterExternalApiCommentOnly(
  finding: Finding,
  ctx: FindingGraphFilterContext,
): FindingGraphFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (finding.ruleId !== "external_apis.calls_go_through_providers") return null;
  const det = details(finding);
  const declaredImports = stringArrayField(det, "imports");
  const graphImports = importTargetsForFile(firstFile(finding), ctx.evidenceGraph);

  // Pick the strongest available evidence source.
  const importsSource
    = declaredImports.length > 0
      ? declaredImports
      : graphImports.length > 0
        ? graphImports
        : null;
  if (!importsSource) return null;
  const lowered = importsSource.map((entry) => entry.toLowerCase());
  const mentionsExternalSdk = lowered.some((entry) =>
    EXTERNAL_API_SDK_FRAGMENTS.some((fragment) => entry.includes(fragment)),
  );
  if (mentionsExternalSdk) return null;

  // Confidence: high when graph-backed (we walked the
  // resolved import graph), medium when we only have the
  // detector's `details.imports`.
  const confidence: FindingFilterConfidence
    = importsSource === graphImports || (graphImports.length > 0 && importsSource.length === 0)
      ? "high"
      : declaredImports.length > 0
        ? "high"
        : "medium";
  return {
    reason: "external-api-comment-only",
    evidence:
      `Finding references external API concern, but ${
        importsSource === graphImports
          ? "EvidenceGraph import facts"
          : "detector-supplied imports"
      } contain no openai / openrouter / @openai/* package imports.`,
    filePath: firstFile(finding),
    confidence,
  };
}

function importTargetsForFile(
  filePath: string | undefined,
  evidenceGraph: EvidenceGraphLike | undefined,
): string[] {
  if (!filePath || !evidenceGraph?.facts) return [];
  return evidenceGraph.facts
    .filter((fact) => fact.kind === "import" && fact.subject === filePath)
    .map((fact) => {
      const target = fact.value?.target;
      return typeof target === "string" ? target : undefined;
    })
    .filter((target): target is string => typeof target === "string" && target.length > 0);
}

// ----- D. factory file creates deps -----

const FACTORY_GRAPH_RULE_IDS: ReadonlySet<string> = new Set([
  "dependency_injection.services_must_not_call_factories",
  "dependency_injection.services_must_not_instantiate_infra",
]);

function graphFilterFactoryFileCreatesDeps(
  finding: Finding,
  ctx: FindingGraphFilterContext,
): FindingGraphFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (!finding.ruleId || !FACTORY_GRAPH_RULE_IDS.has(finding.ruleId)) return null;
  const file = firstFile(finding) ?? "";

  const isFactoryPath
    = file.includes("Factory.ts")
    || file.includes("factory.ts")
    || (file.startsWith("core/services/") && file.includes("/init/"));
  if (isFactoryPath) {
    return {
      reason: "factory-file-creates-deps",
      evidence:
        `Factory / init file is designed to create dependencies: '${file}' (path-evidence; classic exempts these from DI rules).`,
      filePath: file,
      confidence: "high",
    };
  }

  const capabilityHit = capabilityMatchForFile(file, ctx.capabilityMap, FACTORY_CAPABILITY_HINTS);
  if (capabilityHit) {
    return {
      reason: "factory-file-creates-deps",
      evidence: `Factory / init capability '${capabilityHit}' covers '${file}' per CapabilityMap.`,
      filePath: file,
      confidence: "medium",
    };
  }

  return null;
}

const FACTORY_CAPABILITY_HINTS: ReadonlyArray<string> = ["factory", "init", "bootstrap"];

function capabilityMatchForFile(
  file: string,
  capabilityMap: CapabilityMapLike | undefined,
  hints: ReadonlyArray<string>,
): string | null {
  if (!file) return null;
  const entries = capabilityMap?.entries ?? [];
  for (const entry of entries) {
    const cap = entry.capability ?? "";
    if (!hints.some((hint) => cap.toLowerCase().includes(hint))) continue;
    if ((entry.subjects ?? []).includes(file)) return cap;
  }
  return null;
}

// ----- E. module gate verified caller -----

const MODULE_GATE_GRAPH_RULE_IDS: ReadonlySet<string> = new Set([
  "architecture.gates.must_have_production_caller",
  "architecture.gates.applies_to_must_have_production_evaluator",
  "architecture.gates.modules_must_not_create_custom_scopes",
]);

function graphFilterModuleGateVerifiedCaller(
  finding: Finding,
  ctx: FindingGraphFilterContext,
): FindingGraphFilterDecision | null {
  if (finding.type !== "architecture") return null;
  if (!finding.ruleId || !MODULE_GATE_GRAPH_RULE_IDS.has(finding.ruleId)) return null;
  const file = firstFile(finding) ?? "";

  if (file.includes("GateEvaluator")) {
    return {
      reason: "module-gate-verified-caller",
      evidence: `Module gate evaluator path '${file}' is verified caller territory.`,
      filePath: file,
      confidence: "high",
    };
  }

  if (file.includes("/modules/")) {
    return {
      reason: "module-gate-verified-caller",
      evidence: `Module gate finding originates inside module path '${file}' (verified caller territory).`,
      filePath: file,
      confidence: "medium",
    };
  }

  // OwnershipMap → ObservedSystem.kind = "module" lookup.
  const owner = ownerSystemForFile(file, ctx.ownershipMap);
  const system = owner ? findObservedSystem(owner, ctx.observedRepo) : undefined;
  if (system?.kind === "module") {
    return {
      reason: "module-gate-verified-caller",
      evidence:
        `OwnershipMap routes '${file}' to system '${owner}' whose ObservedSystem.kind is "module" — verified caller territory.`,
      filePath: file,
      confidence: "medium",
    };
  }

  return null;
}

function ownerSystemForFile(
  file: string,
  ownershipMap: OwnershipMapLike | undefined,
): string | null {
  if (!file) return null;
  const entries = ownershipMap?.entries ?? [];
  // Prefer exact path match; fall back to longest path prefix.
  let prefixMatch: { path: string; ownerSystem: string } | null = null;
  for (const entry of entries) {
    if (entry.path === file) return entry.ownerSystem;
    if (file.startsWith(entry.path) && (!prefixMatch || entry.path.length > prefixMatch.path.length)) {
      prefixMatch = entry;
    }
  }
  return prefixMatch?.ownerSystem ?? null;
}

function findObservedSystem(
  ownerSystem: string,
  observedRepo: ObservedRepoLike | undefined,
): { id: string; kind?: string } | undefined {
  return (observedRepo?.systems ?? []).find((system) => system.id === ownerSystem);
}

// ---------- Filter policy status (operator workflow v1) ----------
//
// Pure deterministic summary of the operator's current
// `findingFilters` policy set. Combines:
//   - the configured policies (loaded from
//     `.rekon/config.json` by the CLI),
//   - the latest `FindingFilterReport` (usage counts +
//     filtered-finding ids + report-side fingerprint),
//   - the latest `FindingFilterHealthReport` (alerts +
//     dominant policy + filterRateByPolicy + unusedPolicies),
//   - the latest `FindingFilterPolicySuggestionReport`
//     (advisory candidates).
//
// Read-only. Returns a structured `FindingFilterPolicyStatusResult`
// the CLI's `rekon findings filter-policy status` command
// emits as JSON. No artifact is mutated. No config is mutated.

export type FindingFilterPolicyStatusFreshness = "fresh" | "stale" | "missing-report" | "unknown";

export type FindingFilterPolicyStatusWarning = {
  code: string;
  severity: "warning" | "error";
  message: string;
};

export type FindingFilterPolicyStatusEntry = {
  id: string;
  reason: FindingFilterReason;
  confidence?: FindingFilterConfidence;
  matchers: {
    pathPattern?: string;
    type?: string;
    ruleId?: string;
    severity?: FindingSeverity;
    titleIncludes?: string;
    descriptionIncludes?: string;
  };
  /** Number of findings this policy suppressed in the latest filter run. */
  usageCount: number;
  /**
   * `usageCount / totalFindings` rounded to four decimals.
   * `0` when no findings were filtered or `totalFindings === 0`.
   */
  usageRate: number;
  /**
   * Finding ids this policy suppressed in the latest filter
   * run, sorted ascending. Empty when the policy was unused or
   * no filter report exists.
   */
  filteredFindingIds: string[];
  /** Deterministic per-policy warnings (see header comments). */
  warnings: FindingFilterPolicyStatusWarning[];
  /** Operator-facing next-step suggestions for this policy. */
  recommendedActions: string[];
  /**
   * Convenience flags so callers / publications can quickly
   * route on policy state without iterating warnings.
   */
  isUnused: boolean;
  isDominant: boolean;
  isLowConfidence: boolean;
  isBroadPattern: boolean;
};

export type FindingFilterPolicyStatusSuggestion = {
  id: string;
  confidence: FindingFilterPolicySuggestionConfidence;
  reason: FindingFilterPolicySuggestionReason;
  affectedFindingCount: number;
  dryRunCommand: string;
  applyCommand: string;
};

export type FindingFilterPolicyStatusSummary = {
  totalPolicies: number;
  usedPolicies: number;
  unusedPolicies: number;
  dominantPolicies: number;
  lowConfidencePolicies: number;
  broadPolicies: number;
  policiesWithWarnings: number;
  suggestionsAvailable: number;
};

export type FindingFilterPolicyStatusResult = {
  configPath: string;
  currentPolicyFingerprint: FindingFilterPolicyFingerprint;
  reportPolicyFingerprint?: FindingFilterPolicyFingerprint;
  freshness: {
    status: FindingFilterPolicyStatusFreshness;
    message: string;
    recommendedCommand?: string;
  };
  summary: FindingFilterPolicyStatusSummary;
  policies: FindingFilterPolicyStatusEntry[];
  suggestions: FindingFilterPolicyStatusSuggestion[];
  /**
   * Global warnings that apply to the whole policy set rather
   * than to a single policy (e.g. `missing-filter-report`,
   * `missing-filter-health`).
   */
  globalWarnings: FindingFilterPolicyStatusWarning[];
};

export type SummarizeFindingFilterPolicyStatusInput = {
  /** Absolute path to `.rekon/config.json` (echoed back so the CLI doesn't have to). */
  configPath: string;
  /** Configured `findingFilters` rules from `.rekon/config.json`. */
  policies: ReadonlyArray<FindingFilterPolicyRule>;
  /** Latest `FindingFilterReport`. */
  filterReport?: FindingFilterReport;
  /** Latest `FindingFilterHealthReport`. */
  healthReport?: FindingFilterHealthReport;
  /** Latest `FindingFilterPolicySuggestionReport`. */
  suggestionReport?: FindingFilterPolicySuggestionReport;
};

/**
 * Pure deterministic summarizer. Combines the policy set with
 * the latest filter / health / suggestion artifacts and returns
 * a `FindingFilterPolicyStatusResult` ready for the CLI to
 * render as JSON. No filesystem access, no mutation.
 *
 * Per-policy warnings (deterministic):
 *   - `unused-policy` — `usageCount === 0`.
 *   - `dominant-policy` — id matches
 *     `healthReport.summary.dominantPolicy.policyId`, OR
 *     `usageRate >= 0.5` with `totalFindings >= 5`.
 *   - `low-confidence-policy` — `rule.confidence === "low"`, OR
 *     a health alert `low-confidence-policy-filter` exists and
 *     the policy is the dominant policy.
 *   - `broad-policy` — `isBroadFindingFilterPolicyRule(rule)`.
 *   - `stale-policy-fingerprint` — added to **every** policy
 *     when the current vs. report fingerprint digests diverge.
 *     Diagnostic; the freshness root carries the same signal.
 *
 * Global warnings (deterministic):
 *   - `missing-filter-report` — no `filterReport`.
 *   - `missing-filter-health` — `filterReport` exists but
 *     `healthReport` does not.
 *
 * `recommendedActions` for each policy come from the warning
 * set and are listed in a stable order.
 */
export function summarizeFindingFilterPolicyStatus(
  input: SummarizeFindingFilterPolicyStatusInput,
): FindingFilterPolicyStatusResult {
  const { configPath, policies, filterReport, healthReport, suggestionReport } = input;
  const currentPolicyFingerprint = fingerprintFindingFilterPolicies(policies);
  const reportPolicyFingerprint = filterReport?.policyFingerprint;

  // Freshness ----
  let freshness: FindingFilterPolicyStatusResult["freshness"];
  if (!filterReport) {
    freshness = {
      status: "missing-report",
      message:
        "No FindingFilterReport indexed. Run `rekon refresh` (or `rekon findings filter`) before relying on policy usage counts.",
      recommendedCommand: "rekon refresh",
    };
  } else if (!reportPolicyFingerprint) {
    freshness = {
      status: "unknown",
      message:
        "Latest FindingFilterReport predates filter-policy-freshness v2 and does not record a policy fingerprint. Run `rekon refresh` to regenerate.",
      recommendedCommand: "rekon refresh",
    };
  } else if (reportPolicyFingerprint.digest === currentPolicyFingerprint.digest) {
    freshness = {
      status: "fresh",
      message: "Current `findingFilters` fingerprint matches the latest FindingFilterReport.",
    };
  } else {
    freshness = {
      status: "stale",
      message:
        "`.rekon/config.json` `findingFilters` changed after the latest FindingFilterReport was produced. Run `rekon refresh` to rebuild the filter chain with the current policy set.",
      recommendedCommand: "rekon refresh",
    };
  }

  // Lookup tables from the health report ----
  const dominantPolicyId = healthReport?.summary.dominantPolicy?.policyId;
  const filterRateByPolicy = healthReport?.summary.filterRateByPolicy ?? {};
  const lowConfidencePolicyAlert = (healthReport?.alerts ?? []).some(
    (alert) => alert.code === "low-confidence-policy-filter",
  );
  const totalFindings = healthReport?.summary.totalFindings ?? 0;

  // Per-finding ids per policy ----
  const filteredIdsByPolicy = new Map<string, string[]>();
  for (const entry of filterReport?.filteredFindings ?? []) {
    if (entry.policyId) {
      const list = filteredIdsByPolicy.get(entry.policyId) ?? [];
      list.push(entry.findingId);
      filteredIdsByPolicy.set(entry.policyId, list);
    }
  }
  for (const list of filteredIdsByPolicy.values()) {
    list.sort((left, right) => left.localeCompare(right));
  }

  const isStale = freshness.status === "stale";

  // Per-policy entries ----
  const entries: FindingFilterPolicyStatusEntry[] = policies.map((policy) => {
    const usageCount = filterReport?.summary.byPolicy?.[policy.id] ?? 0;
    const rawRate = filterRateByPolicy[policy.id];
    const usageRate
      = typeof rawRate === "number"
        ? rawRate
        : totalFindings > 0
          ? Math.round((usageCount / totalFindings) * 10000) / 10000
          : 0;
    const filteredFindingIds = filteredIdsByPolicy.get(policy.id) ?? [];
    const isUnused = usageCount === 0;
    const isDominant
      = (typeof dominantPolicyId === "string" && dominantPolicyId === policy.id)
      || (totalFindings >= 5 && usageRate >= 0.5);
    const isLowConfidence
      = policy.confidence === "low"
      || (lowConfidencePolicyAlert
        && typeof dominantPolicyId === "string"
        && dominantPolicyId === policy.id);
    const isBroadPattern = isBroadFindingFilterPolicyRule(policy);

    const warnings: FindingFilterPolicyStatusWarning[] = [];
    const recommendedActions: string[] = [];
    if (isUnused) {
      warnings.push({
        code: "unused-policy",
        severity: "warning",
        message: `Configured policy '${policy.id}' matched zero findings; review whether it is still needed.`,
      });
      recommendedActions.push(
        "Review whether this policy is still needed; consider removing it from `.rekon/config.json findingFilters`.",
      );
    }
    if (isDominant) {
      warnings.push({
        code: "dominant-policy",
        severity: "warning",
        message: `Configured policy '${policy.id}' suppressed ${usageCount} of ${totalFindings} findings (${(usageRate * 100).toFixed(1)}%). Inspect FindingFilterReport.filteredFindings before trusting active governance.`,
      });
      recommendedActions.push(
        "Inspect `FindingFilterReport.filteredFindings` for this policy before trusting active governance counts.",
      );
    }
    if (isLowConfidence) {
      warnings.push({
        code: "low-confidence-policy",
        severity: "warning",
        message: `Configured policy '${policy.id}' is low-confidence; tighten the matcher or review the evidence.`,
      });
      recommendedActions.push(
        "Consider tightening the matcher or reviewing the evidence; raise the rule confidence when applicable.",
      );
    }
    if (isBroadPattern) {
      warnings.push({
        code: "broad-policy",
        severity: "warning",
        message: `Configured policy '${policy.id}' has a broad matcher (pathPattern '${policy.pathPattern ?? ""}' with no narrow matcher). Narrow it before relying on the suppression.`,
      });
      recommendedActions.push(
        "Narrow `pathPattern` / `type` / `ruleId` / `severity` / `titleIncludes` / `descriptionIncludes` before relying on this policy.",
      );
    }
    if (isStale) {
      warnings.push({
        code: "stale-policy-fingerprint",
        severity: "warning",
        message:
          "Current `findingFilters` fingerprint differs from the latest FindingFilterReport; rerun `rekon refresh`.",
      });
      recommendedActions.push("Run `rekon refresh` to rebuild the filter chain with the current policy set.");
    }

    return {
      id: policy.id,
      reason: policy.reason,
      confidence: policy.confidence,
      matchers: {
        pathPattern: policy.pathPattern,
        type: policy.type,
        ruleId: policy.ruleId,
        severity: policy.severity,
        titleIncludes: policy.titleIncludes,
        descriptionIncludes: policy.descriptionIncludes,
      },
      usageCount,
      usageRate,
      filteredFindingIds,
      warnings,
      recommendedActions,
      isUnused,
      isDominant,
      isLowConfidence,
      isBroadPattern,
    };
  });

  // Suggestions ----
  const suggestions: FindingFilterPolicyStatusSuggestion[] = (
    suggestionReport?.suggestions ?? []
  ).map((suggestion) => {
    const forceFlag = suggestion.confidence === "low" ? " --force" : "";
    return {
      id: suggestion.id,
      confidence: suggestion.confidence,
      reason: suggestion.reason,
      affectedFindingCount: suggestion.affectedFindingIds.length,
      dryRunCommand: `rekon findings filter-policy apply ${suggestion.id} --dry-run${forceFlag} --json`,
      applyCommand: `rekon findings filter-policy apply ${suggestion.id}${forceFlag} --json`,
    };
  });

  // Global warnings ----
  const globalWarnings: FindingFilterPolicyStatusWarning[] = [];
  if (!filterReport) {
    globalWarnings.push({
      code: "missing-filter-report",
      severity: "warning",
      message:
        "No FindingFilterReport indexed. Policy usage counts are unavailable until the filter step runs.",
    });
  } else if (!healthReport) {
    globalWarnings.push({
      code: "missing-filter-health",
      severity: "warning",
      message:
        "No FindingFilterHealthReport indexed. Filter-health alerts (dominance / unused / low-confidence) are unavailable until the health step runs.",
    });
  }

  const summary: FindingFilterPolicyStatusSummary = {
    totalPolicies: entries.length,
    usedPolicies: entries.filter((entry) => !entry.isUnused).length,
    unusedPolicies: entries.filter((entry) => entry.isUnused).length,
    dominantPolicies: entries.filter((entry) => entry.isDominant).length,
    lowConfidencePolicies: entries.filter((entry) => entry.isLowConfidence).length,
    broadPolicies: entries.filter((entry) => entry.isBroadPattern).length,
    policiesWithWarnings: entries.filter((entry) => entry.warnings.length > 0).length,
    suggestionsAvailable: suggestions.length,
  };

  return {
    configPath,
    currentPolicyFingerprint,
    reportPolicyFingerprint,
    freshness,
    summary,
    policies: entries,
    suggestions,
    globalWarnings,
  };
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

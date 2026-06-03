// Semantic File Understanding intent-context consumption (slice 150).
//
// Pure selection of SemanticFileUnderstandingReport(s) as proposal/context for
// `rekon intent assess` and `rekon intent plan review`. No fs, no providers, no
// proof: semantic context enriches matched paths / warnings / revision-prompt
// grounding, but never approves, never satisfies a proof gate, never replaces
// deterministic evidence, and stale reports are never consumed silently.

import type { ArtifactRef } from "@rekon/kernel-artifacts";

/** Loose, read-only view of a SemanticFileUnderstandingReport used as context. */
export type SemanticFileUnderstandingReportLike = {
  file?: { path?: string; sha256?: string };
  status?: { value?: string };
  summary?: {
    purpose?: string;
    responsibilities?: string[];
    publicExports?: string[];
    imports?: string[];
    touchedConcepts?: string[];
  };
  capabilitySignals?: Array<{
    id?: string;
    label?: string;
    confidence?: string;
    sourceEvidence?: Array<{ lineStart?: number; lineEnd?: number; excerpt?: string }>;
  }>;
  findings?: Array<{
    id?: string;
    severity?: string;
    message?: string;
    sourceEvidence?: string[];
    suggestedFollowUp?: string;
  }>;
  normalizationTrace?: {
    method?: string;
    provider?: string;
    model?: string;
    provenance?: string;
    warnings?: string[];
  };
  boundaries?: Record<string, unknown>;
};

/** A semantic report selected as usable context (normalized, deterministic facts). */
export type SemanticFileContextReport = {
  path: string;
  sha256?: string;
  purpose?: string;
  responsibilities: string[];
  publicExports: string[];
  imports: string[];
  touchedConcepts: string[];
  findingCount: number;
  highSeverityFindingCount: number;
  provider?: string;
  model?: string;
  ref?: ArtifactRef;
};

export type SemanticFileContextStaleReason = "sha-mismatch" | "boundaries-not-clean";

export type SemanticFileContextStaleWarning = {
  path: string;
  reason: SemanticFileContextStaleReason;
  reportSha256?: string;
  currentSha256?: string;
  ref?: ArtifactRef;
};

export type SemanticFileContextSelection = {
  usedReports: SemanticFileContextReport[];
  staleReports: SemanticFileContextStaleWarning[];
  missingReports: string[];
  warnings: string[];
};

export function normalizeSemanticContextPath(path: string): string {
  return String(path)
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function strArr(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim().length > 0) out.push(entry.trim());
  }
  return out;
}

/** Two repo-relative paths are related if equal or one contains the other. */
function pathRelated(a: string, b: string): boolean {
  if (a.length === 0 || b.length === 0) return false;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

/** A report's boundaries must be present and all-false to be consumed as context. */
function boundariesAllFalse(boundaries: Record<string, unknown> | undefined): boolean {
  if (!boundaries || typeof boundaries !== "object") return false;
  const values = Object.values(boundaries);
  if (values.length === 0) return false;
  return values.every((value) => value === false);
}

function toContextReport(report: SemanticFileUnderstandingReportLike, ref?: ArtifactRef): SemanticFileContextReport {
  const summary = report.summary ?? {};
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const highSeverity = findings.filter((finding) => finding?.severity === "high").length;
  const out: SemanticFileContextReport = {
    path: normalizeSemanticContextPath(report.file?.path ?? ""),
    responsibilities: strArr(summary.responsibilities),
    publicExports: strArr(summary.publicExports),
    imports: strArr(summary.imports),
    touchedConcepts: strArr(summary.touchedConcepts),
    findingCount: findings.length,
    highSeverityFindingCount: highSeverity,
  };
  if (typeof report.file?.sha256 === "string" && report.file.sha256.length > 0) out.sha256 = report.file.sha256;
  if (typeof summary.purpose === "string" && summary.purpose.trim().length > 0) out.purpose = summary.purpose.trim();
  if (typeof report.normalizationTrace?.provider === "string") out.provider = report.normalizationTrace.provider;
  if (typeof report.normalizationTrace?.model === "string") out.model = report.normalizationTrace.model;
  if (ref) out.ref = ref;
  return out;
}

/**
 * Select usable semantic file context from candidate reports.
 *
 * - `requestedPaths` (when non-empty) restricts candidates to reports whose file
 *   path is related to a requested path; an empty list considers every candidate
 *   (the caller controls the candidate set, e.g. explicit refs).
 * - A report is **stale** (not consumed) when its boundaries are not all-false,
 *   or when the current file hash is known and differs from the report's sha256.
 *   Stale reports are surfaced as warnings — never consumed silently.
 * - When multiple usable reports share a path, the **latest** (last in caller
 *   order) wins.
 * - `missingReports` lists requested paths with no usable and no stale report.
 */
export function selectSemanticFileContext(input: {
  reports: Array<{ report: SemanticFileUnderstandingReportLike; ref?: ArtifactRef }>;
  requestedPaths?: string[];
  currentFileHashes?: Record<string, string>;
}): SemanticFileContextSelection {
  const requested = (input.requestedPaths ?? [])
    .map(normalizeSemanticContextPath)
    .filter((path) => path.length > 0);
  const hashes: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.currentFileHashes ?? {})) {
    if (typeof value === "string" && value.length > 0) hashes[normalizeSemanticContextPath(key)] = value;
  }

  const usedByPath = new Map<string, SemanticFileContextReport>();
  const stale: SemanticFileContextStaleWarning[] = [];
  const warnings: string[] = [];

  for (const entry of input.reports ?? []) {
    const report = entry?.report;
    if (!report) continue;
    const path = report.file?.path ? normalizeSemanticContextPath(report.file.path) : "";
    if (path.length === 0) continue;
    if (requested.length > 0 && !requested.some((requestedPath) => pathRelated(path, requestedPath))) continue;

    if (!boundariesAllFalse(report.boundaries)) {
      const warning: SemanticFileContextStaleWarning = { path, reason: "boundaries-not-clean" };
      if (typeof report.file?.sha256 === "string") warning.reportSha256 = report.file.sha256;
      if (entry.ref) warning.ref = entry.ref;
      stale.push(warning);
      warnings.push(`Semantic report for ${path} has non-clean boundaries; not consumed as context.`);
      continue;
    }

    const reportSha = report.file?.sha256;
    const currentSha = hashes[path];
    if (typeof currentSha === "string" && typeof reportSha === "string" && currentSha !== reportSha) {
      const warning: SemanticFileContextStaleWarning = {
        path,
        reason: "sha-mismatch",
        reportSha256: reportSha,
        currentSha256: currentSha,
      };
      if (entry.ref) warning.ref = entry.ref;
      stale.push(warning);
      warnings.push(`Semantic report for ${path} is stale (file sha256 changed); not consumed as fresh context.`);
      continue;
    }

    usedByPath.set(path, toContextReport(report, entry.ref));
  }

  const usedPaths = [...usedByPath.keys()];
  const missingReports: string[] = [];
  for (const requestedPath of requested) {
    const used = usedPaths.some((path) => pathRelated(path, requestedPath));
    const isStale = stale.some((entry) => pathRelated(entry.path, requestedPath));
    if (!used && !isStale && !missingReports.includes(requestedPath)) missingReports.push(requestedPath);
  }

  return {
    usedReports: [...usedByPath.values()],
    staleReports: stale,
    missingReports,
    warnings,
  };
}

/** Compact counts for `--json` output / human lines. */
export function summarizeSemanticFileContext(
  selection: SemanticFileContextSelection | undefined,
): { requested: boolean; used: number; stale: number; missing: number; warnings: string[] } {
  if (!selection) return { requested: false, used: 0, stale: 0, missing: 0, warnings: [] };
  return {
    requested: true,
    used: selection.usedReports.length,
    stale: selection.staleReports.length,
    missing: selection.missingReports.length,
    warnings: [...selection.warnings],
  };
}

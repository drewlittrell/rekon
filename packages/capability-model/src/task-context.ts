// TaskContextReport intent-context consumption (slice 171).
//
// Pure selection of TaskContextReport(s) as proposal/context for `rekon intent
// assess` and `rekon intent plan review`, per the TaskContextReport Intent
// Integration Decision (slice 170). No fs, no providers, no proof: task context
// enriches matched paths/capabilities, revision-prompt grounding, do-not-touch
// constraints, and verification-hint guidance — but it never approves, never
// satisfies a proof gate, never replaces deterministic evidence, never executes a
// command, and stale/irrelevant reports are never consumed silently.

import type { ArtifactRef } from "@rekon/kernel-artifacts";

/** Loose, read-only view of a TaskContextReport used as context. */
export type TaskContextReportLike = {
  task?: { text?: string; paths?: string[]; goal?: string };
  selection?: { provider?: string; model?: string; topK?: number };
  contextItems?: Array<{
    id?: string;
    kind?: string;
    path?: string;
    symbolId?: string;
    capabilityId?: string;
    reason?: string;
    score?: number;
    scoreBand?: string;
    evidenceRefs?: string[];
    source?: string;
  }>;
  graphNeighborhood?: { nodes?: unknown[]; claims?: string[] };
  doNotTouch?: Array<{ reason?: string; path?: string; symbolId?: string; evidenceRefs?: string[] }>;
  verificationHints?: Array<{ command?: string; artifact?: string; reason?: string; evidenceRefs?: string[] }>;
  summary?: { embeddingNeighbors?: number; contextItems?: number };
  boundaries?: Record<string, unknown>;
};

/** A task-context report selected as usable context (normalized, proposal/context). */
export type TaskContextSelectionReport = {
  taskText?: string;
  goal?: string;
  paths: string[];
  capabilities: string[];
  symbols: string[];
  doNotTouch: string[];
  verificationHints: Array<{ command?: string; artifact?: string; reason: string }>;
  contextItemCount: number;
  embeddingNeighborCount: number;
  provider?: string;
  ref?: ArtifactRef;
};

export type TaskContextStaleReason = "boundaries-not-clean" | "not-relevant";

export type TaskContextStaleWarning = {
  reason: TaskContextStaleReason;
  taskText?: string;
  ref?: ArtifactRef;
};

export type TaskContextSelection = {
  usedReports: TaskContextSelectionReport[];
  staleReports: TaskContextStaleWarning[];
  missingReports: string[];
  warnings: string[];
};

export function normalizeTaskContextPath(path: string): string {
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

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (value.length === 0 || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
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

function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const token of String(text).toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length >= 3) out.add(token);
  }
  return out;
}

function reportPaths(report: TaskContextReportLike): string[] {
  const paths: string[] = [];
  for (const p of strArr(report.task?.paths)) paths.push(normalizeTaskContextPath(p));
  for (const item of report.contextItems ?? []) {
    if (typeof item?.path === "string" && item.path.length > 0) paths.push(normalizeTaskContextPath(item.path));
  }
  return uniq(paths);
}

function reportCapabilities(report: TaskContextReportLike): string[] {
  const caps: string[] = [];
  for (const item of report.contextItems ?? []) {
    if (typeof item?.capabilityId === "string" && item.capabilityId.length > 0) caps.push(item.capabilityId);
  }
  return uniq(caps);
}

function reportSymbols(report: TaskContextReportLike): string[] {
  const symbols: string[] = [];
  for (const item of report.contextItems ?? []) {
    if (typeof item?.symbolId === "string" && item.symbolId.length > 0) symbols.push(item.symbolId);
  }
  return uniq(symbols);
}

/**
 * Relevance of a report to the current goal / plan / requested paths. > 0 means
 * relevant. Path overlap dominates; plan-text path mention is next; lexical
 * overlap of task text/goal with the request is a weak signal.
 */
function relevanceScore(
  report: TaskContextReportLike,
  ctx: { goal?: string; planText?: string; requestedPaths: string[] },
): number {
  let score = 0;
  const paths = reportPaths(report);
  if (ctx.requestedPaths.length > 0 && ctx.requestedPaths.some((rp) => paths.some((p) => pathRelated(p, rp)))) {
    score += 3;
  }
  if (ctx.planText && paths.some((p) => p.length > 0 && ctx.planText!.includes(p))) score += 2;
  const query = tokenize(`${ctx.goal ?? ""} ${ctx.planText ?? ""}`);
  if (query.size > 0) {
    const reportTokens = tokenize(`${report.task?.text ?? ""} ${report.task?.goal ?? ""}`);
    for (const token of reportTokens) {
      if (query.has(token)) {
        score += 1;
        break;
      }
    }
  }
  return score;
}

function toContextReport(report: TaskContextReportLike, ref?: ArtifactRef): TaskContextSelectionReport {
  const items = report.contextItems ?? [];
  const embeddingNeighborCount = items.filter((item) => item?.source === "embedding_retrieval").length;
  const verificationHints = (report.verificationHints ?? [])
    .map((hint) => {
      const reason = typeof hint?.reason === "string" ? hint.reason : "";
      const out: { command?: string; artifact?: string; reason: string } = { reason };
      if (typeof hint?.command === "string" && hint.command.length > 0) out.command = hint.command;
      if (typeof hint?.artifact === "string" && hint.artifact.length > 0) out.artifact = hint.artifact;
      return out;
    })
    .filter((hint) => hint.command !== undefined || hint.artifact !== undefined || hint.reason.length > 0);
  const out: TaskContextSelectionReport = {
    paths: reportPaths(report),
    capabilities: reportCapabilities(report),
    symbols: reportSymbols(report),
    doNotTouch: uniq((report.doNotTouch ?? []).map((zone) => (typeof zone?.reason === "string" ? zone.reason.trim() : "")).filter((reason) => reason.length > 0)),
    verificationHints,
    contextItemCount: items.length,
    embeddingNeighborCount,
  };
  if (typeof report.task?.text === "string" && report.task.text.trim().length > 0) out.taskText = report.task.text.trim();
  if (typeof report.task?.goal === "string" && report.task.goal.trim().length > 0) out.goal = report.task.goal.trim();
  if (typeof report.selection?.provider === "string" && report.selection.provider.length > 0) out.provider = report.selection.provider;
  if (ref) out.ref = ref;
  return out;
}

function refLabel(ref: ArtifactRef | undefined): string {
  return ref ? `${ref.type}:${ref.id}` : "report";
}

/**
 * Select usable task context from candidate reports.
 *
 * - `mode: "explicit"` (default) — every boundary-clean candidate is used (the
 *   operator named them via `--task-context-ref`); irrelevant ones are still used
 *   but warned. `mode: "latest"` — only the single most relevant boundary-clean
 *   candidate is used; non-relevant candidates are recorded stale and warned.
 * - A report is rejected (never consumed) when its boundaries are not all-false.
 * - A used report with no context items, or with a provider but no embedding
 *   neighbors (`retrieval-low-signal`), is consumed but warned — never failed.
 * - `missingRefs` (requested but unresolved) pass through to `missingReports`.
 */
export function selectTaskContextReports(input: {
  reports: Array<{ report: TaskContextReportLike; ref?: ArtifactRef }>;
  mode?: "explicit" | "latest";
  goal?: string;
  planText?: string;
  requestedPaths?: string[];
  missingRefs?: string[];
}): TaskContextSelection {
  const mode = input.mode ?? "explicit";
  const requestedPaths = (input.requestedPaths ?? []).map(normalizeTaskContextPath).filter((p) => p.length > 0);
  const ctx = { goal: input.goal, planText: input.planText, requestedPaths };

  const stale: TaskContextStaleWarning[] = [];
  const warnings: string[] = [];
  const valid: Array<{ report: TaskContextReportLike; ref?: ArtifactRef; score: number }> = [];

  for (const entry of input.reports ?? []) {
    const report = entry?.report;
    if (!report) continue;
    if (!boundariesAllFalse(report.boundaries)) {
      stale.push({ reason: "boundaries-not-clean", taskText: report.task?.text, ref: entry.ref });
      warnings.push(`Task context report ${refLabel(entry.ref)} has non-false boundaries; not consumed as context.`);
      continue;
    }
    valid.push({ report, ref: entry.ref, score: relevanceScore(report, ctx) });
  }

  let chosen: Array<{ report: TaskContextReportLike; ref?: ArtifactRef }> = [];
  if (mode === "latest") {
    let best: { report: TaskContextReportLike; ref?: ArtifactRef; score: number } | undefined;
    for (const candidate of valid) {
      if (candidate.score > 0 && (best === undefined || candidate.score >= best.score)) best = candidate;
    }
    if (best) {
      chosen = [{ report: best.report, ref: best.ref }];
    } else {
      for (const candidate of valid) {
        stale.push({ reason: "not-relevant", taskText: candidate.report.task?.text, ref: candidate.ref });
      }
      if (valid.length > 0) warnings.push("No stored task context report was relevant to the current goal/plan; none consumed.");
    }
  } else {
    for (const candidate of valid) {
      chosen.push({ report: candidate.report, ref: candidate.ref });
      if (candidate.score === 0) {
        warnings.push(`Task context report ${refLabel(candidate.ref)} may not be relevant to the current goal/plan (consumed as explicit context).`);
      }
    }
  }

  const usedReports = chosen.map((entry) => toContextReport(entry.report, entry.ref));
  for (const used of usedReports) {
    if (used.contextItemCount === 0) {
      warnings.push(`Task context report ${refLabel(used.ref)} has no context items; consumed as task/constraint context only.`);
    } else if (used.provider && used.embeddingNeighborCount === 0) {
      warnings.push(`retrieval-low-signal: task context report ${refLabel(used.ref)} selected no embedding-retrieval context items (proposal/context, not proof).`);
    }
  }

  const missingReports = uniq(input.missingRefs ?? []);
  for (const missing of missingReports) {
    warnings.push(`Requested task context ref ${missing} did not resolve; not consumed.`);
  }

  return { usedReports, staleReports: stale, missingReports, warnings };
}

/** Compact counts for `--json` output / human lines. */
export function summarizeTaskContext(
  selection: TaskContextSelection | undefined,
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

// Classic-v1 normalizer for the classic-parity-bench (Phase 0).
//
// Parses legacy-source emitted issues report — the
// `reports/issues.json` shape observed across the operator's
// historical scan corpus:
//
//   { generatedAt, summary, issues: [
//       { id, type, severity, system, files, description, details, lastSeen,
//         (firstDetected?, status?) } ] }
//
// into the bench's common finding shape:
//
//   { id, ruleId, file, files, subjects, severity, title, fireCount }
//
// Classic's rule identity is the issue `type` field (e.g. `tech_debt`,
// `naming_violation`, `canonical_bypass`). Classic outputs are consumed as
// DATA, never imports (AGENTS.md rule 4 / ADR 0004 — private reference repos
// is reference, not dependency). The normalizer never reads classic source.
//
// Timebox posture per the work order: normalize the fields needed for
// matching (ruleId + file, with system as the subject fallback) and degrade
// the rest gracefully rather than expanding the parser.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const CLASSIC_FORMAT_V1 = "classic-v1";

/**
 * Normalize a path for matching: posix separators, no leading `./`.
 * Both the classic and the Rekon side pass through this so the match key is
 * insensitive to separator / prefix differences. Unparseable values degrade
 * to "" (which never matches) instead of throwing.
 */
export function normalizePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }

  let path = value.replaceAll("\\", "/");

  while (path.startsWith("./")) {
    path = path.slice(2);
  }

  return path;
}

/** Normalize one parsed classic-v1 issues document into common findings. */
export function normalizeClassicIssuesV1(document) {
  if (!document || typeof document !== "object" || !Array.isArray(document.issues)) {
    throw new Error('classic-v1: expected a document of shape { generatedAt, summary, issues: [...] }.');
  }

  return document.issues.map((issue, index) => {
    const ruleId = typeof issue.type === "string" && issue.type.length > 0 ? issue.type : "(untyped)";
    const files = Array.isArray(issue.files)
      ? issue.files
          .filter((file) => typeof file === "string")
          .map(normalizePath)
          .filter((file) => file.length > 0)
      : [];
    const subjects = typeof issue.system === "string" && issue.system.length > 0 ? [issue.system] : [];
    const fireCount = Number.isFinite(issue.fireCount) && issue.fireCount > 0 ? issue.fireCount : 1;
    const description = typeof issue.description === "string" ? issue.description : "";

    return {
      id: typeof issue.id === "string" && issue.id.length > 0 ? issue.id : `classic-${index}`,
      ruleId,
      file: files[0] ?? "",
      files,
      subjects,
      severity: typeof issue.severity === "string" && issue.severity.length > 0 ? issue.severity : "unknown",
      title: description.length > 0 ? description.split("\n")[0].slice(0, 140) : ruleId,
      fireCount,
    };
  });
}

/**
 * Load + normalize the classic baseline for one corpus repo.
 * `classicOutputDir` must contain `issues.json` in the classic-v1 shape.
 */
/**
 * The labeled-negative set. `suppressed.json` sits beside
 * `issues.json` in the corpus (exported from classic's filtered-issues
 * filter artifacts by tests/bench/recover-suppressed.mjs). Each entry is
 * a normalized classic finding plus the recorded suppression `reason`.
 * Absent file -> empty set; the precision dimension simply reports
 * nothing for that repo.
 */
export function loadSuppressedFindings({ classicOutputDir }) {
  const path = join(classicOutputDir, "suppressed.json");

  if (!existsSync(path)) {
    return [];
  }

  const document = JSON.parse(readFileSync(path, "utf8"));
  const entries = Array.isArray(document) ? document : [];

  return normalizeClassicIssuesV1({ issues: entries.map((entry) => entry.issue ?? entry) }).map((finding, index) => ({
    ...finding,
    reason: typeof entries[index]?.reason === "string" ? entries[index].reason : "unspecified",
  }));
}

export function loadClassicFindings({ classicOutputDir, classicFormat }) {
  if (classicFormat !== CLASSIC_FORMAT_V1) {
    throw new Error(
      `Unsupported classicFormat "${classicFormat}". classic-parity-bench v1 supports only "${CLASSIC_FORMAT_V1}".`,
    );
  }

  const issuesPath = join(classicOutputDir, "issues.json");
  const document = JSON.parse(readFileSync(issuesPath, "utf8"));

  return normalizeClassicIssuesV1(document);
}

import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ArtifactHeader } from "@rekon/kernel-artifacts";
import {
  createDependencyAuditReport,
  type DependencyAuditAdvisory,
  type DependencyAuditPath,
  type DependencyAuditReport,
  type DependencyAuditSeverity,
  type DependencyAuditVulnerability,
} from "@rekon/kernel-repo-model";
import type { NpmAuditIssue } from "./npm-audit.js";
import { sanitizeToolMessage, sanitizeToolUrl } from "./tool-output-safety.js";

type AdapterInput = {
  sourcePath: string;
  sourceDigest: string;
  header: ArtifactHeader;
};

export function parsePnpmAuditReport(input: AdapterInput & { audit: unknown }): { valid: boolean; report?: DependencyAuditReport; issues: NpmAuditIssue[] } {
  if (!isRecord(input.audit) || !isRecord(input.audit.advisories)) {
    return invalid("pnpm_audit.advisories_missing", "pnpm audit input must contain an advisories object.");
  }
  const issues: NpmAuditIssue[] = [];
  const vulnerabilities: DependencyAuditVulnerability[] = [];
  for (const [key, value] of Object.entries(input.audit.advisories)) {
    if (!isRecord(value)) {
      issues.push({ code: "pnpm_audit.advisory_invalid", severity: "warning", message: `Ignored malformed advisory ${key}.` });
      continue;
    }
    const packageName = nonEmptyString(value.module_name);
    const advisoryId = String(value.github_advisory_id ?? value.id ?? key);
    const findings = Array.isArray(value.findings) ? value.findings.filter(isRecord) : [];
    if (!packageName || findings.length === 0) {
      issues.push({ code: "pnpm_audit.findings_missing", severity: "warning", message: `Ignored advisory ${advisoryId} without package findings.`, packageName });
      continue;
    }
    const paths = dedupePaths(findings.flatMap((finding) => {
      const version = nonEmptyString(finding.version);
      const findingPaths = Array.isArray(finding.paths) ? finding.paths.filter((path): path is string => typeof path === "string" && path.length > 0) : [];
      return (findingPaths.length > 0 ? findingPaths : [packageName]).map((path) => ({
        dependencyPath: parseLogicalPath(path, packageName),
        ...(version ? { installedVersion: version } : {}),
        scope: finding.dev === true ? "development" as const : finding.optional === true ? "optional" as const : "production" as const,
        direct: parseLogicalPath(path, packageName).length === 1,
      }));
    }));
    const advisory = normalizeRegistryAdvisory(value, advisoryId, packageName);
    const patched = nonEmptyString(value.patched_versions);
    vulnerabilities.push({
      id: stableId({ tool: "pnpm", packageName, advisoryId, affectedRange: value.vulnerable_versions, paths }),
      packageName,
      severity: normalizeSeverity(value.severity),
      affectedRange: nonEmptyString(value.vulnerable_versions) ?? "unknown",
      advisories: [advisory],
      paths,
      fixAvailable: Boolean(patched && !/^<\s*0\.0\.0/u.test(patched)),
    });
  }
  return buildReport(input, "pnpm-audit-v11", "pnpm", vulnerabilities, issues);
}

export function parseYarnAuditReport(input: AdapterInput & { ndjson: string }): { valid: boolean; report?: DependencyAuditReport; issues: NpmAuditIssue[] } {
  const issues: NpmAuditIssue[] = [];
  const rows = [];
  for (const [index, line] of input.ndjson.split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (isRecord(parsed)) rows.push(parsed);
      else issues.push({ code: "yarn_audit.row_invalid", severity: "warning", message: `Ignored non-object NDJSON row ${index + 1}.` });
    } catch {
      return invalid("yarn_audit.invalid_ndjson", `Yarn audit row ${index + 1} is not valid JSON.`);
    }
  }
  const vulnerabilities: DependencyAuditVulnerability[] = [];
  for (const [index, row] of rows.entries()) {
    const packageName = nonEmptyString(row.value);
    const children = isRecord(row.children) ? row.children : {};
    const advisoryId = children.ID !== undefined ? String(children.ID) : `yarn-row-${index}`;
    if (!packageName || !nonEmptyString(children.Issue)) {
      issues.push({ code: "yarn_audit.row_incomplete", severity: "warning", message: `Ignored incomplete Yarn audit row ${index + 1}.`, packageName });
      continue;
    }
    const versions = stringArray(children["Tree Versions"]);
    const dependents = stringArray(children.Dependents);
    const pathVersions: Array<string | undefined> = versions.length > 0 ? versions : [undefined];
    const pathDependents: Array<string | undefined> = dependents.length > 0 ? dependents : [undefined];
    const paths: DependencyAuditPath[] = dedupePaths(pathDependents.flatMap((dependent) =>
      pathVersions.map((version) => ({
        dependencyPath: dependent ? [dependent, packageName] : [packageName],
        ...(version ? { installedVersion: version } : {}),
        scope: "unknown" as const,
        direct: false,
      })),
    ));
    vulnerabilities.push({
      id: stableId({ tool: "yarn", packageName, advisoryId, range: children["Vulnerable Versions"], versions, dependents }),
      packageName,
      severity: normalizeSeverity(children.Severity),
      affectedRange: nonEmptyString(children["Vulnerable Versions"]) ?? "unknown",
      advisories: [{
        id: advisoryId,
        title: sanitizeToolMessage(nonEmptyString(children.Issue))!,
        ...(sanitizeToolUrl(nonEmptyString(children.URL)) ? { url: sanitizeToolUrl(nonEmptyString(children.URL)) } : {}),
        cwes: [],
      }],
      paths,
      fixAvailable: false,
    });
  }
  return buildReport(input, "yarn-audit-ndjson", "yarn", vulnerabilities, issues);
}

export function parseOsvScannerReport(input: AdapterInput & { report: unknown; repoRoot: string }): { valid: boolean; report?: DependencyAuditReport; issues: NpmAuditIssue[] } {
  if (!isRecord(input.report) || !Array.isArray(input.report.results)) {
    return invalid("osv_scanner.results_missing", "OSV-Scanner JSON must contain a results array.");
  }
  const issues: NpmAuditIssue[] = [];
  const vulnerabilities: DependencyAuditVulnerability[] = [];
  for (const [resultIndex, result] of input.report.results.entries()) {
    if (!isRecord(result) || !Array.isArray(result.packages)) {
      issues.push({ code: "osv_scanner.result_invalid", severity: "warning", message: `Ignored malformed OSV result ${resultIndex}.` });
      continue;
    }
    const source = isRecord(result.source) ? result.source : {};
    const sourcePath = normalizeRepoPath(nonEmptyString(source.path), input.repoRoot);
    if (nonEmptyString(source.path) && !sourcePath) {
      issues.push({ code: "osv_scanner.source_outside_repo", severity: "warning", message: "Ignored an OSV source path outside the repository." });
    }
    for (const packageEntry of result.packages) {
      if (!isRecord(packageEntry) || !isRecord(packageEntry.package) || !Array.isArray(packageEntry.vulnerabilities)) continue;
      const packageName = nonEmptyString(packageEntry.package.name);
      const version = nonEmptyString(packageEntry.package.version);
      if (!packageName) continue;
      for (const vulnerability of packageEntry.vulnerabilities) {
        if (!isRecord(vulnerability) || !nonEmptyString(vulnerability.id) || vulnerability.withdrawn) continue;
        const advisoryId = nonEmptyString(vulnerability.id)!;
        const affected = Array.isArray(vulnerability.affected) ? vulnerability.affected.filter(isRecord) : [];
        const fixed = fixedVersions(affected);
        const severity = osvSeverity(vulnerability, affected);
        const path: DependencyAuditPath = {
          ...(sourcePath ? { nodePath: sourcePath } : {}),
          dependencyPath: [packageName],
          ...(version ? { installedVersion: version } : {}),
          scope: "unknown",
          direct: false,
        };
        vulnerabilities.push({
          id: stableId({ tool: "osv-scanner", packageName, version, advisoryId, sourcePath }),
          packageName,
          severity,
          affectedRange: osvAffectedRange(affected, version),
          advisories: [{
            id: advisoryId,
            title: sanitizeToolMessage(nonEmptyString(vulnerability.summary)) ?? advisoryId,
            url: osvAdvisoryUrl(vulnerability, advisoryId),
            cwes: osvCwes(vulnerability),
            ...osvCvss(vulnerability, affected),
          }],
          paths: [path],
          fixAvailable: fixed.length > 0,
          ...(fixed.length === 1 ? { fixVersion: fixed[0] } : {}),
        });
      }
    }
  }
  return buildReport(input, "osv-scanner-json", "osv-scanner", vulnerabilities, issues);
}

function buildReport(
  input: AdapterInput,
  format: DependencyAuditReport["source"]["format"],
  tool: DependencyAuditReport["tool"]["name"],
  vulnerabilities: DependencyAuditVulnerability[],
  issues: NpmAuditIssue[],
) {
  try {
    return {
      valid: true,
      report: createDependencyAuditReport({
        header: input.header,
        source: { format, path: input.sourcePath, digest: input.sourceDigest },
        tool: { name: tool },
        status: {
          complete: !issues.some((issue) => issue.severity === "warning"),
          warnings: issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message),
        },
        summary: { vulnerabilities: 0, production: 0, development: 0, unknownScope: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 } },
        vulnerabilities,
      }),
      issues,
    };
  } catch (error) {
    return { valid: false, issues: [...issues, { code: `${tool}_audit.report_invalid`, severity: "error" as const, message: error instanceof Error ? error.message : String(error) }] };
  }
}

function normalizeRegistryAdvisory(value: Record<string, unknown>, id: string, packageName: string): DependencyAuditAdvisory {
  const cwe = Array.isArray(value.cwe) ? value.cwe.filter((entry): entry is string => typeof entry === "string") : typeof value.cwe === "string" ? [value.cwe] : [];
  const cvss = isRecord(value.cvss) ? value.cvss : {};
  const score = typeof cvss.score === "number" && Number.isFinite(cvss.score) ? cvss.score : undefined;
  const vector = nonEmptyString(cvss.vectorString);
  return {
    id,
    title: sanitizeToolMessage(nonEmptyString(value.title)) ?? `${packageName} advisory`,
    ...(sanitizeToolUrl(nonEmptyString(value.url)) ? { url: sanitizeToolUrl(nonEmptyString(value.url)) } : {}),
    cwes: cwe,
    ...(score !== undefined || vector ? { cvss: { ...(score !== undefined ? { score } : {}), ...(vector ? { vector } : {}) } } : {}),
  };
}

function parseLogicalPath(value: string, packageName: string): string[] {
  const parts = value.split(/\s*>\s*/u).map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 && parts.at(-1) === packageName ? parts : [...parts, packageName];
}

function dedupePaths(paths: DependencyAuditPath[]): DependencyAuditPath[] {
  const seen = new Set<string>();
  return paths.filter((path) => {
    const key = stableJson(path);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0) : [];
}

function normalizeRepoPath(path: string | undefined, repoRoot: string): string | undefined {
  if (!path) return undefined;
  const absolute = isAbsolute(path) ? resolve(path) : resolve(repoRoot, path);
  const rel = relative(resolve(repoRoot), absolute);
  if (!rel || rel === "." || rel.startsWith(`..${sep}`) || rel === ".." || isAbsolute(rel)) return undefined;
  return rel.split(sep).join("/");
}

function fixedVersions(affected: Record<string, unknown>[]): string[] {
  return unique(affected.flatMap((entry) => Array.isArray(entry.ranges) ? entry.ranges : []).flatMap((range) => {
    if (!isRecord(range) || !Array.isArray(range.events)) return [];
    return range.events.filter(isRecord).map((event) => nonEmptyString(event.fixed)).filter((value): value is string => Boolean(value));
  }));
}

function osvAffectedRange(affected: Record<string, unknown>[], version: string | undefined): string {
  const events = affected.flatMap((entry) => Array.isArray(entry.ranges) ? entry.ranges : []).flatMap((range) => {
    if (!isRecord(range) || !Array.isArray(range.events)) return [];
    return range.events.filter(isRecord).flatMap((event) => Object.entries(event).filter(([, value]) => typeof value === "string").map(([key, value]) => `${key}:${value}`));
  });
  return events.length > 0 ? events.join(",") : version ? `=${version}` : "unknown";
}

function osvSeverity(vulnerability: Record<string, unknown>, affected: Record<string, unknown>[]): DependencyAuditSeverity {
  for (const source of [vulnerability.database_specific, ...affected.map((entry) => entry.database_specific), ...affected.map((entry) => entry.ecosystem_specific)]) {
    if (!isRecord(source)) continue;
    const severity = normalizeSeverity(source.severity);
    if (severity !== "unknown") return severity;
  }
  return "unknown";
}

function osvCwes(vulnerability: Record<string, unknown>): string[] {
  const database = isRecord(vulnerability.database_specific) ? vulnerability.database_specific : {};
  return unique(stringArray(database.cwe_ids).filter((value) => /^CWE-/iu.test(value)));
}

function osvAdvisoryUrl(vulnerability: Record<string, unknown>, advisoryId: string): string {
  const references = Array.isArray(vulnerability.references) ? vulnerability.references.filter(isRecord) : [];
  return references.map((reference) => sanitizeToolUrl(nonEmptyString(reference.url))).find((url): url is string => Boolean(url))
    ?? `https://osv.dev/vulnerability/${encodeURIComponent(advisoryId)}`;
}

function osvCvss(vulnerability: Record<string, unknown>, affected: Record<string, unknown>[]): Pick<DependencyAuditAdvisory, "cvss"> {
  const severities = [
    ...(Array.isArray(vulnerability.severity) ? vulnerability.severity : []),
    ...affected.flatMap((entry) => Array.isArray(entry.severity) ? entry.severity : []),
  ].filter(isRecord);
  const vector = severities.map((entry) => nonEmptyString(entry.score)).find((score) => score?.startsWith("CVSS:"));
  return vector ? { cvss: { vector } } : {};
}

function normalizeSeverity(value: unknown): DependencyAuditSeverity {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized === "moderate" || normalized === "medium") return "medium";
  return normalized === "critical" || normalized === "high" || normalized === "low" ? normalized : "unknown";
}

function stableId(value: unknown): string {
  return `dependency-vulnerability-${createHash("sha256").update(stableJson(value)).digest("hex").slice(0, 24)}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(code: string, message: string) {
  return { valid: false, issues: [{ code, severity: "error" as const, message }] };
}

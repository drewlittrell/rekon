import { createHash } from "node:crypto";
import type { ArtifactHeader } from "@rekon/kernel-artifacts";
import {
  createDependencyAuditReport,
  type DependencyAuditAdvisory,
  type DependencyAuditPath,
  type DependencyAuditReport,
  type DependencyAuditScope,
  type DependencyAuditSeverity,
  type DependencyAuditVulnerability,
} from "@rekon/kernel-repo-model";

export type NpmAuditIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  packageName?: string;
};

export type ParseNpmAuditInput = {
  audit: unknown;
  packageLock?: unknown;
  sourcePath: string;
  sourceDigest: string;
  lockfilePath?: string;
  lockfileDigest?: string;
  header: ArtifactHeader;
};

export type ParseNpmAuditResult = {
  valid: boolean;
  report?: DependencyAuditReport;
  issues: NpmAuditIssue[];
};

export function parseNpmAuditReport(input: ParseNpmAuditInput): ParseNpmAuditResult {
  if (!isRecord(input.audit)) return invalid("npm_audit.not_object", "npm audit input must be an object.");
  if (input.audit.auditReportVersion !== 2) return invalid("npm_audit.unsupported_version", "Only npm audit report version 2 is supported.");
  if (!isRecord(input.audit.vulnerabilities)) return invalid("npm_audit.vulnerabilities_missing", "npm audit input must contain a vulnerabilities object.");

  const issues: NpmAuditIssue[] = [];
  const lockPackages = isRecord(input.packageLock) && isRecord(input.packageLock.packages)
    ? input.packageLock.packages
    : {};
  if (Object.keys(lockPackages).length === 0) {
    issues.push({
      code: "npm_audit.lockfile_missing",
      severity: "warning",
      message: "No package-lock package map was supplied; installed versions and dependency scopes may be unknown.",
    });
  }

  const vulnerabilities: DependencyAuditVulnerability[] = [];
  for (const [packageKey, value] of Object.entries(input.audit.vulnerabilities)) {
    if (!isRecord(value)) {
      issues.push({ code: "npm_audit.vulnerability_invalid", severity: "warning", message: `Ignored malformed vulnerability ${packageKey}.`, packageName: packageKey });
      continue;
    }
    const packageName = nonEmptyString(value.name) ?? packageKey;
    const severity = normalizeSeverity(value.severity);
    const affectedRange = nonEmptyString(value.range) ?? "unknown";
    const advisories = normalizeAdvisories(value.via, packageName, severity);
    const nodes = Array.isArray(value.nodes)
      ? value.nodes.filter((node): node is string => typeof node === "string" && isSafeNodePath(node))
      : [];
    if (nodes.length === 0) {
      issues.push({ code: "npm_audit.nodes_missing", severity: "warning", message: `No safe installed node path was reported for ${packageName}.`, packageName });
    }
    const paths = nodes.map((nodePath) => normalizeDependencyPath(nodePath, lockPackages[nodePath], value.isDirect === true));
    const fix = normalizeFix(value.fixAvailable);
    const id = stableId({ packageName, affectedRange, severity, advisories, paths });

    vulnerabilities.push({
      id,
      packageName,
      severity,
      affectedRange,
      advisories,
      paths,
      fixAvailable: fix.available,
      ...(fix.version ? { fixVersion: fix.version } : {}),
      ...(fix.breaking !== undefined ? { breakingFix: fix.breaking } : {}),
    });
  }

  try {
    const report = createDependencyAuditReport({
      header: input.header,
      source: {
        format: "npm-audit-v2",
        path: input.sourcePath,
        digest: input.sourceDigest,
        ...(input.lockfilePath ? { lockfilePath: input.lockfilePath } : {}),
        ...(input.lockfileDigest ? { lockfileDigest: input.lockfileDigest } : {}),
      },
      tool: { name: "npm" },
      status: {
        complete: !issues.some((issue) => issue.code === "npm_audit.lockfile_missing" || issue.code === "npm_audit.nodes_missing"),
        warnings: issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message),
      },
      summary: {
        vulnerabilities: 0,
        production: 0,
        development: 0,
        unknownScope: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      },
      vulnerabilities,
    });
    return { valid: true, report, issues };
  } catch (error) {
    return {
      valid: false,
      issues: [...issues, {
        code: "npm_audit.report_invalid",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
      }],
    };
  }

  function invalid(code: string, message: string): ParseNpmAuditResult {
    return { valid: false, issues: [{ code, severity: "error", message }] };
  }
}

function normalizeAdvisories(value: unknown, packageName: string, fallbackSeverity: DependencyAuditSeverity): DependencyAuditAdvisory[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((advisory, index) => {
      const source = advisory.source;
      const id = source !== undefined ? String(source) : nonEmptyString(advisory.url) ?? `${packageName}-${index}`;
      const cvss = isRecord(advisory.cvss) ? advisory.cvss : {};
      const score = typeof cvss.score === "number" && Number.isFinite(cvss.score) ? cvss.score : undefined;
      const vector = nonEmptyString(cvss.vectorString);
      return {
        id,
        title: nonEmptyString(advisory.title) ?? nonEmptyString(advisory.name) ?? `${packageName} ${fallbackSeverity} advisory`,
        ...(nonEmptyString(advisory.url) ? { url: nonEmptyString(advisory.url) } : {}),
        cwes: Array.isArray(advisory.cwe) ? advisory.cwe.filter((cwe): cwe is string => typeof cwe === "string") : [],
        ...(score !== undefined || vector ? { cvss: { ...(score !== undefined ? { score } : {}), ...(vector ? { vector } : {}) } } : {}),
      };
    });
}

function normalizeDependencyPath(nodePath: string, lockEntry: unknown, direct: boolean): DependencyAuditPath {
  const entry = isRecord(lockEntry) ? lockEntry : {};
  return {
    nodePath: normalizeNodePath(nodePath),
    dependencyPath: dependencyNames(nodePath),
    ...(nonEmptyString(entry.version) ? { installedVersion: nonEmptyString(entry.version) } : {}),
    scope: dependencyScope(entry),
    direct,
  };
}

function dependencyNames(nodePath: string): string[] {
  return normalizeNodePath(nodePath)
    .split(/(?:^|\/)node_modules\//u)
    .filter(Boolean);
}

function dependencyScope(entry: Record<string, unknown>): DependencyAuditScope {
  if (entry.dev === true || entry.devOptional === true) return "development";
  if (entry.optional === true) return "optional";
  if (entry.peer === true) return "peer";
  return Object.keys(entry).length > 0 ? "production" : "unknown";
}

function normalizeFix(value: unknown): { available: boolean; version?: string; breaking?: boolean } {
  if (value === true) return { available: true };
  if (!isRecord(value)) return { available: false };
  return {
    available: true,
    ...(nonEmptyString(value.version) ? { version: nonEmptyString(value.version) } : {}),
    ...(typeof value.isSemVerMajor === "boolean" ? { breaking: value.isSemVerMajor } : {}),
  };
}

function normalizeSeverity(value: unknown): DependencyAuditSeverity {
  return value === "critical" || value === "high" || value === "moderate" || value === "medium" || value === "low"
    ? value === "moderate" ? "medium" : value
    : "unknown";
}

function isSafeNodePath(value: string): boolean {
  const normalized = normalizeNodePath(value);
  return normalized.length > 0 && !normalized.startsWith("/") && !/^[A-Za-z]:\//u.test(normalized) && !normalized.split("/").includes("..");
}

function normalizeNodePath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

function stableId(value: unknown): string {
  return `dependency-vulnerability-${createHash("sha256").update(stableJson(value)).digest("hex").slice(0, 24)}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

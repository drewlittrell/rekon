import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ArtifactHeader } from "@rekon/kernel-artifacts";
import {
  createSecurityScanReport,
  type SecurityScanLocation,
  type SecurityScanReport,
  type SecurityScanResult,
  type SecurityScanRun,
  type SecurityScanSeverity,
} from "@rekon/kernel-repo-model";

export type SarifSecurityIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  runIndex?: number;
  resultIndex?: number;
};

export type ParseSarifSecurityInput = {
  sarif: unknown;
  repoRoot: string;
  sourcePath: string;
  sourceDigest: string;
  header: ArtifactHeader;
};

export type ParseSarifSecurityResult = {
  valid: boolean;
  report?: SecurityScanReport;
  issues: SarifSecurityIssue[];
};

type SarifRule = Record<string, unknown>;

export function parseSarifSecurityReport(input: ParseSarifSecurityInput): ParseSarifSecurityResult {
  const issues: SarifSecurityIssue[] = [];
  if (!isRecord(input.sarif)) {
    return invalid("sarif.not_object", "SARIF input must be an object.");
  }
  if (input.sarif.version !== "2.1.0") {
    return invalid("sarif.unsupported_version", 'Only SARIF version "2.1.0" is supported.');
  }
  if (!Array.isArray(input.sarif.runs)) {
    return invalid("sarif.runs_missing", "SARIF input must contain a runs array.");
  }

  const runs: SecurityScanRun[] = [];
  input.sarif.runs.forEach((runValue, runIndex) => {
    if (!isRecord(runValue)) {
      issues.push({ code: "sarif.run_invalid", severity: "error", message: "SARIF run must be an object.", runIndex });
      return;
    }
    const driver = isRecord(runValue.tool) && isRecord(runValue.tool.driver) ? runValue.tool.driver : undefined;
    const toolName = driver && nonEmptyString(driver.name);
    if (!toolName) {
      issues.push({ code: "sarif.tool_missing", severity: "error", message: "SARIF run tool.driver.name is required.", runIndex });
      return;
    }
    const rules = collectRules(driver);
    const uriBases = isRecord(runValue.originalUriBaseIds) ? runValue.originalUriBaseIds : {};
    const normalized = new Map<string, SecurityScanResult>();
    const results = Array.isArray(runValue.results) ? runValue.results : [];

    results.forEach((resultValue, resultIndex) => {
      if (!isRecord(resultValue)) {
        issues.push({ code: "sarif.result_invalid", severity: "warning", message: "Ignored a non-object SARIF result.", runIndex, resultIndex });
        return;
      }
      const rule = resolveRule(resultValue, rules);
      const ruleId = nonEmptyString(resultValue.ruleId) ?? nonEmptyString(rule?.id) ?? `unknown-rule-${resultIndex}`;
      const message = sarifMessage(resultValue.message);
      if (!message) {
        issues.push({ code: "sarif.result_message_missing", severity: "warning", message: `Ignored ${ruleId} because it has no message.`, runIndex, resultIndex });
        return;
      }
      const fingerprints = stringRecord(resultValue.partialFingerprints);
      const tags = collectTags(resultValue, rule);
      const locations = normalizeLocations({
        locations: resultValue.locations,
        repoRoot: input.repoRoot,
        uriBases,
        issues,
        runIndex,
        resultIndex,
      });
      const severity = normalizeSeverity(resultValue, rule);
      const precision = propertyString(resultValue, rule, "precision");
      const id = stableResultId({ toolName, ruleId, message, fingerprints, locations });
      const result: SecurityScanResult = {
        id,
        ruleId,
        message: normalizeWhitespace(message),
        severity,
        securityRelevant: isSecurityRelevant(ruleId, tags, resultValue, rule),
        ...(precision ? { precision } : {}),
        locations,
        tags,
        fingerprints,
        ...(nonEmptyString(rule?.helpUri) ? { helpUri: nonEmptyString(rule?.helpUri) } : {}),
      };
      const existing = normalized.get(id);
      normalized.set(id, existing ? mergeResult(existing, result) : result);
    });

    const invocations = Array.isArray(runValue.invocations) ? runValue.invocations : [];
    runs.push({
      tool: {
        name: toolName,
        ...(nonEmptyString(driver.version) ? { version: nonEmptyString(driver.version) } : {}),
        ...(nonEmptyString(driver.semanticVersion) ? { semanticVersion: nonEmptyString(driver.semanticVersion) } : {}),
      },
      successful: !invocations.some((invocation) => isRecord(invocation) && invocation.executionSuccessful === false),
      results: [...normalized.values()],
    });
  });

  if (issues.some((issue) => issue.severity === "error")) {
    return { valid: false, issues };
  }
  try {
    const report = createSecurityScanReport({
      header: input.header,
      source: { format: "sarif", path: input.sourcePath, digest: input.sourceDigest },
      summary: {
        runs: 0,
        results: 0,
        securityResults: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      },
      runs,
    });
    return { valid: true, report, issues };
  } catch (error) {
    return {
      valid: false,
      issues: [...issues, {
        code: "sarif.report_invalid",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
      }],
    };
  }

  function invalid(code: string, message: string): ParseSarifSecurityResult {
    return { valid: false, issues: [{ code, severity: "error", message }] };
  }
}

function collectRules(driver: Record<string, unknown>): Map<string, SarifRule> {
  const rules = new Map<string, SarifRule>();
  if (!Array.isArray(driver.rules)) return rules;
  driver.rules.forEach((value, index) => {
    if (!isRecord(value)) return;
    const id = nonEmptyString(value.id);
    if (id) rules.set(id, value);
    rules.set(`#${index}`, value);
  });
  return rules;
}

function resolveRule(result: Record<string, unknown>, rules: Map<string, SarifRule>): SarifRule | undefined {
  const ruleId = nonEmptyString(result.ruleId);
  if (ruleId && rules.has(ruleId)) return rules.get(ruleId);
  if (Number.isInteger(result.ruleIndex)) return rules.get(`#${result.ruleIndex}`);
  return undefined;
}

function sarifMessage(value: unknown): string | undefined {
  if (typeof value === "string") return nonEmptyString(value);
  if (!isRecord(value)) return undefined;
  return nonEmptyString(value.text) ?? nonEmptyString(value.markdown);
}

function collectTags(result: Record<string, unknown>, rule: SarifRule | undefined): string[] {
  const tags = new Set<string>();
  for (const source of [result, rule]) {
    if (!source) continue;
    const properties = isRecord(source.properties) ? source.properties : {};
    for (const value of [properties.tags, source.tags]) {
      if (Array.isArray(value)) {
        for (const tag of value) if (typeof tag === "string" && tag.trim()) tags.add(tag.trim().toLowerCase());
      }
    }
    const relationships = Array.isArray(source.relationships) ? source.relationships : [];
    for (const relationship of relationships) {
      if (!isRecord(relationship) || !isRecord(relationship.target)) continue;
      const id = nonEmptyString(relationship.target.id);
      const componentName = isRecord(relationship.target.toolComponent)
        ? nonEmptyString(relationship.target.toolComponent.name)
        : undefined;
      if (id && (isCwe(id) || componentName?.toLowerCase() === "cwe")) tags.add(id.toLowerCase());
    }
    const taxa = Array.isArray(source.taxa) ? source.taxa : [];
    for (const taxon of taxa) {
      if (!isRecord(taxon)) continue;
      const id = nonEmptyString(taxon.id);
      if (id) tags.add(id.toLowerCase());
    }
  }
  return [...tags].sort();
}

function normalizeSeverity(result: Record<string, unknown>, rule: SarifRule | undefined): SecurityScanSeverity {
  const numeric = Number(propertyString(result, rule, "security-severity"));
  if (Number.isFinite(numeric) && numeric > 0) {
    if (numeric >= 9) return "critical";
    if (numeric >= 7) return "high";
    if (numeric >= 4) return "medium";
    return "low";
  }
  switch (result.level) {
    case "error": return "high";
    case "warning": return "medium";
    case "note": return "low";
    default: return "unknown";
  }
}

function isSecurityRelevant(
  ruleId: string,
  tags: string[],
  result: Record<string, unknown>,
  rule: SarifRule | undefined,
): boolean {
  if (/\b(?:cwe|owasp|security|vulnerability|vuln)[-_.:/]?\d*\b/iu.test(ruleId)) return true;
  if (tags.some((tag) => /(?:^|[-_.:/])(?:security|vulnerability|vuln|cwe|owasp)(?:$|[-_.:/\d])/iu.test(tag))) return true;
  return propertyString(result, rule, "security-severity") !== undefined;
}

function propertyString(result: Record<string, unknown>, rule: SarifRule | undefined, key: string): string | undefined {
  for (const source of [result, rule]) {
    if (!source || !isRecord(source.properties)) continue;
    const value = source.properties[key];
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    const stringValue = nonEmptyString(value);
    if (stringValue) return stringValue;
  }
  return undefined;
}

function normalizeLocations(input: {
  locations: unknown;
  repoRoot: string;
  uriBases: Record<string, unknown>;
  issues: SarifSecurityIssue[];
  runIndex: number;
  resultIndex: number;
}): SecurityScanLocation[] {
  if (!Array.isArray(input.locations)) return [];
  const locations: SecurityScanLocation[] = [];
  for (const value of input.locations) {
    if (!isRecord(value) || !isRecord(value.physicalLocation) || !isRecord(value.physicalLocation.artifactLocation)) continue;
    const artifactLocation = value.physicalLocation.artifactLocation;
    const uri = nonEmptyString(artifactLocation.uri);
    if (!uri) continue;
    const path = normalizeArtifactUri(uri, nonEmptyString(artifactLocation.uriBaseId), input.repoRoot, input.uriBases);
    if (!path) {
      input.issues.push({
        code: "sarif.location_outside_repo",
        severity: "warning",
        message: `Ignored SARIF location outside the repository: ${uri}`,
        runIndex: input.runIndex,
        resultIndex: input.resultIndex,
      });
      continue;
    }
    const region = isRecord(value.physicalLocation.region) ? value.physicalLocation.region : {};
    locations.push({
      path,
      ...positiveIntegerField(region.startLine, "startLine"),
      ...positiveIntegerField(region.startColumn, "startColumn"),
      ...positiveIntegerField(region.endLine, "endLine"),
      ...positiveIntegerField(region.endColumn, "endColumn"),
    });
  }
  return uniqueLocations(locations);
}

function normalizeArtifactUri(
  uri: string,
  uriBaseId: string | undefined,
  repoRoot: string,
  uriBases: Record<string, unknown>,
): string | undefined {
  let candidate = uri;
  if (uriBaseId) {
    const base = resolveUriBase(uriBaseId, uriBases, new Set());
    if (!base) return undefined;
    try {
      candidate = new URL(uri, base).toString();
    } catch {
      return undefined;
    }
  }
  let absolute: string;
  try {
    if (/^[A-Za-z][A-Za-z\d+.-]*:/u.test(candidate)) {
      if (!candidate.toLowerCase().startsWith("file:")) return undefined;
      absolute = fileURLToPath(candidate);
    } else {
      const decoded = decodeURIComponent(candidate.replace(/\\/gu, "/"));
      absolute = isAbsolute(decoded) ? decoded : resolve(repoRoot, decoded);
    }
  } catch {
    return undefined;
  }
  const relativePath = relative(resolve(repoRoot), resolve(absolute));
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) return undefined;
  return relativePath.split(sep).join("/");
}

function resolveUriBase(id: string, uriBases: Record<string, unknown>, seen: Set<string>): string | undefined {
  if (seen.has(id)) return undefined;
  seen.add(id);
  const value = uriBases[id];
  if (!isRecord(value)) return undefined;
  const uri = nonEmptyString(value.uri);
  if (!uri) return undefined;
  const parentId = nonEmptyString(value.uriBaseId);
  if (!parentId) return uri;
  const parent = resolveUriBase(parentId, uriBases, seen);
  if (!parent) return undefined;
  try {
    return new URL(uri, parent).toString();
  } catch {
    return undefined;
  }
}

function stableResultId(input: {
  toolName: string;
  ruleId: string;
  message: string;
  fingerprints: Record<string, string>;
  locations: SecurityScanLocation[];
}): string {
  const fingerprintEntries = Object.entries(input.fingerprints).sort(([left], [right]) => left.localeCompare(right));
  const identity = fingerprintEntries.length > 0
    ? { tool: input.toolName.toLowerCase(), rule: input.ruleId, fingerprints: fingerprintEntries }
    : {
        tool: input.toolName.toLowerCase(),
        rule: input.ruleId,
        location: input.locations[0] ?? null,
        message: normalizeWhitespace(input.message).toLowerCase(),
      };
  return `security-scan-result-${createHash("sha256").update(JSON.stringify(identity)).digest("hex").slice(0, 24)}`;
}

function mergeResult(left: SecurityScanResult, right: SecurityScanResult): SecurityScanResult {
  return {
    ...left,
    severity: severityRank(right.severity) > severityRank(left.severity) ? right.severity : left.severity,
    securityRelevant: left.securityRelevant || right.securityRelevant,
    precision: left.precision ?? right.precision,
    locations: uniqueLocations([...left.locations, ...right.locations]),
    tags: [...new Set([...left.tags, ...right.tags])].sort(),
    fingerprints: { ...left.fingerprints, ...right.fingerprints },
    helpUri: left.helpUri ?? right.helpUri,
  };
}

function severityRank(value: SecurityScanSeverity): number {
  return { unknown: 0, low: 1, medium: 2, high: 3, critical: 4 }[value];
}

function uniqueLocations(locations: SecurityScanLocation[]): SecurityScanLocation[] {
  return [...new Map(locations.map((location) => [JSON.stringify(location), location])).values()]
    .sort((left, right) => `${left.path}:${left.startLine ?? 0}:${left.startColumn ?? 0}`
      .localeCompare(`${right.path}:${right.startLine ?? 0}:${right.startColumn ?? 0}`));
}

function positiveIntegerField(value: unknown, key: keyof SecurityScanLocation): Partial<SecurityScanLocation> {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? { [key]: value } : {};
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter((entry): entry is [string, string] => entry[0].length > 0 && typeof entry[1] === "string" && entry[1].length > 0)
    .sort(([left], [right]) => left.localeCompare(right)));
}

function isCwe(value: string): boolean {
  return /^cwe[-_:]?\d+$/iu.test(value);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

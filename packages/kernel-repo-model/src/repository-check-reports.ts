import {
  type ArtifactHeader,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
} from "@rekon/kernel-artifacts";

export type RepositoryToolSource = {
  path: string;
  digest: string;
};

export type RepositoryToolStatus = {
  complete: boolean;
  warnings: string[];
};

export type TestCaseResult = {
  id: string;
  suite: string;
  name: string;
  className?: string;
  file?: string;
  line?: number;
  durationMs?: number;
  status: "passed" | "failed" | "error" | "skipped";
  message?: string;
};

export type TestReport = {
  header: ArtifactHeader;
  source: RepositoryToolSource & { format: "junit-xml" };
  tool: { name: "junit"; producer?: string; version?: string };
  status: RepositoryToolStatus;
  summary: {
    tests: number;
    passed: number;
    failures: number;
    errors: number;
    skipped: number;
  };
  cases: TestCaseResult[];
};

export type LintDiagnostic = {
  id: string;
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity: "error" | "warning";
  ruleId?: string;
  message: string;
};

export type LintReport = {
  header: ArtifactHeader;
  source: RepositoryToolSource & { format: "eslint-json" };
  tool: { name: "eslint"; version?: string };
  status: RepositoryToolStatus;
  summary: {
    files: number;
    diagnostics: number;
    errors: number;
    warnings: number;
    suppressed: number;
  };
  diagnostics: LintDiagnostic[];
};

export function createTestReport(input: TestReport): TestReport {
  const cases = [...input.cases]
    .map((entry) => stripUndefined({ ...entry }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return assertTestReport({
    ...input,
    status: { complete: input.status.complete, warnings: unique(input.status.warnings) },
    summary: summarizeTests(cases),
    cases,
  });
}

export function createLintReport(input: LintReport): LintReport {
  const diagnostics = [...input.diagnostics]
    .map((entry) => stripUndefined({ ...entry }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return assertLintReport({
    ...input,
    status: { complete: input.status.complete, warnings: unique(input.status.warnings) },
    summary: {
      files: new Set(diagnostics.map((entry) => entry.file)).size,
      diagnostics: diagnostics.length,
      errors: diagnostics.filter((entry) => entry.severity === "error").length,
      warnings: diagnostics.filter((entry) => entry.severity === "warning").length,
      suppressed: input.summary.suppressed,
    },
    diagnostics,
  });
}

export function validateTestReport(value: unknown): ValidationResult<TestReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidRoot();
  validateHeader(value.header, "TestReport", issues);
  validateSource(value.source, "junit-xml", issues);
  validateTool(value.tool, "junit", issues);
  validateStatus(value.status, issues);
  const cases = Array.isArray(value.cases) ? value.cases : [];
  if (!Array.isArray(value.cases)) issues.push({ path: "$.cases", message: "Expected an array." });
  const ids = new Set<string>();
  cases.forEach((entry, index) => validateTestCase(entry, index, ids, issues));
  validateTestSummary(value.summary, cases.filter(isTestCaseResult), issues);
  return result(value as TestReport, issues);
}

export function validateLintReport(value: unknown): ValidationResult<LintReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidRoot();
  validateHeader(value.header, "LintReport", issues);
  validateSource(value.source, "eslint-json", issues);
  validateTool(value.tool, "eslint", issues);
  validateStatus(value.status, issues);
  const diagnostics = Array.isArray(value.diagnostics) ? value.diagnostics : [];
  if (!Array.isArray(value.diagnostics)) issues.push({ path: "$.diagnostics", message: "Expected an array." });
  const ids = new Set<string>();
  diagnostics.forEach((entry, index) => validateLintDiagnostic(entry, index, ids, issues));
  validateLintSummary(value.summary, diagnostics.filter(isLintDiagnostic), issues);
  return result(value as LintReport, issues);
}

export function assertTestReport(value: unknown): TestReport {
  const validated = validateTestReport(value);
  if (!validated.ok) throw new TypeError(formatIssues("TestReport", validated.issues));
  return validated.value;
}

export function assertLintReport(value: unknown): LintReport {
  const validated = validateLintReport(value);
  if (!validated.ok) throw new TypeError(formatIssues("LintReport", validated.issues));
  return validated.value;
}

export const testReportSchema: ArtifactSchema<TestReport> = { validate: validateTestReport, parse: assertTestReport };
export const lintReportSchema: ArtifactSchema<LintReport> = { validate: validateLintReport, parse: assertLintReport };

function validateHeader(value: unknown, artifactType: string, issues: ValidationIssue[]): void {
  const validated = validateArtifactHeader(value);
  if (!validated.ok) {
    issues.push(...validated.issues.map((issue) => ({ path: `$.header${issue.path === "$" ? "" : issue.path.slice(1)}`, message: issue.message })));
  } else if (validated.value.artifactType !== artifactType) {
    issues.push({ path: "$.header.artifactType", message: `Expected ${artifactType}.` });
  }
}

function validateSource(value: unknown, format: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.source", message: "Expected an object." });
    return;
  }
  if (value.format !== format) issues.push({ path: "$.source.format", message: `Expected ${format}.` });
  validateRepoPath(value.path, "$.source.path", issues);
  if (typeof value.digest !== "string" || !/^[a-f0-9]{64}$/u.test(value.digest)) {
    issues.push({ path: "$.source.digest", message: "Expected a lowercase SHA-256 digest." });
  }
}

function validateTool(value: unknown, name: string, issues: ValidationIssue[]): void {
  if (!isRecord(value) || value.name !== name) {
    issues.push({ path: "$.tool.name", message: `Expected ${name}.` });
    return;
  }
  for (const field of ["producer", "version"] as const) {
    if (value[field] !== undefined && (typeof value[field] !== "string" || value[field].length === 0)) {
      issues.push({ path: `$.tool.${field}`, message: "Expected a non-empty string when present." });
    }
  }
}

function validateStatus(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value) || typeof value.complete !== "boolean" || !isStringArray(value.warnings)) {
    issues.push({ path: "$.status", message: "Expected complete and warnings fields." });
  }
}

function validateTestCase(value: unknown, index: number, ids: Set<string>, issues: ValidationIssue[]): void {
  const path = `$.cases[${index}]`;
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  for (const field of ["id", "suite", "name"] as const) requiredString(value[field], `${path}.${field}`, issues);
  uniqueId(value.id, `${path}.id`, ids, issues);
  if (!new Set(["passed", "failed", "error", "skipped"]).has(String(value.status))) issues.push({ path: `${path}.status`, message: "Expected a test status." });
  for (const field of ["className", "message"] as const) optionalString(value[field], `${path}.${field}`, issues);
  if (value.file !== undefined) validateRepoPath(value.file, `${path}.file`, issues);
  optionalPositiveInteger(value.line, `${path}.line`, issues);
  optionalNonNegativeNumber(value.durationMs, `${path}.durationMs`, issues);
}

function validateLintDiagnostic(value: unknown, index: number, ids: Set<string>, issues: ValidationIssue[]): void {
  const path = `$.diagnostics[${index}]`;
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  requiredString(value.id, `${path}.id`, issues);
  uniqueId(value.id, `${path}.id`, ids, issues);
  validateRepoPath(value.file, `${path}.file`, issues);
  requiredString(value.message, `${path}.message`, issues);
  optionalString(value.ruleId, `${path}.ruleId`, issues);
  if (value.severity !== "error" && value.severity !== "warning") issues.push({ path: `${path}.severity`, message: "Expected error or warning." });
  for (const field of ["line", "column", "endLine", "endColumn"] as const) optionalPositiveInteger(value[field], `${path}.${field}`, issues);
}

function validateTestSummary(value: unknown, cases: TestCaseResult[], issues: ValidationIssue[]): void {
  const expected = summarizeTests(cases);
  validateSummary(value, expected, "$.summary", issues);
}

function validateLintSummary(value: unknown, diagnostics: LintDiagnostic[], issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
    return;
  }
  const expected = {
    files: new Set(diagnostics.map((entry) => entry.file)).size,
    diagnostics: diagnostics.length,
    errors: diagnostics.filter((entry) => entry.severity === "error").length,
    warnings: diagnostics.filter((entry) => entry.severity === "warning").length,
  };
  validateSummary(value, expected, "$.summary", issues);
  if (!Number.isInteger(value.suppressed) || Number(value.suppressed) < 0) issues.push({ path: "$.summary.suppressed", message: "Expected a non-negative integer." });
}

function validateSummary(value: unknown, expected: Record<string, number>, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  for (const [field, count] of Object.entries(expected)) {
    if (value[field] !== count) issues.push({ path: `${path}.${field}`, message: `Expected ${count} (recomputed).` });
  }
}

function summarizeTests(cases: TestCaseResult[]): TestReport["summary"] {
  return {
    tests: cases.length,
    passed: cases.filter((entry) => entry.status === "passed").length,
    failures: cases.filter((entry) => entry.status === "failed").length,
    errors: cases.filter((entry) => entry.status === "error").length,
    skipped: cases.filter((entry) => entry.status === "skipped").length,
  };
}

function validateRepoPath(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || value.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(value) || value.split(/[\\/]/u).includes("..")) {
    issues.push({ path, message: "Expected a safe repository-relative path." });
  }
}

function requiredString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.length === 0) issues.push({ path, message: "Expected a non-empty string." });
}

function optionalString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value !== undefined && (typeof value !== "string" || value.length === 0)) issues.push({ path, message: "Expected a non-empty string when present." });
}

function optionalPositiveInteger(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value !== undefined && (!Number.isInteger(value) || Number(value) < 1)) issues.push({ path, message: "Expected a positive integer when present." });
}

function optionalNonNegativeNumber(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) issues.push({ path, message: "Expected a non-negative number when present." });
}

function uniqueId(value: unknown, path: string, ids: Set<string>, issues: ValidationIssue[]): void {
  if (typeof value !== "string") return;
  if (ids.has(value)) issues.push({ path, message: `Duplicate id ${value}.` });
  ids.add(value);
}

function isTestCaseResult(value: unknown): value is TestCaseResult {
  return isRecord(value) && typeof value.id === "string" && typeof value.status === "string";
}

function isLintDiagnostic(value: unknown): value is LintDiagnostic {
  return isRecord(value) && typeof value.id === "string" && typeof value.file === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function result<T>(value: T, issues: ValidationIssue[]): ValidationResult<T> {
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value, issues: [] };
}

function invalidRoot<T>(): ValidationResult<T> {
  return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
}

function formatIssues(name: string, issues: ValidationIssue[]): string {
  return `${name} validation failed: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`;
}

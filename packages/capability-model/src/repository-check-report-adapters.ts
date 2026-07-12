import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";
import { SaxesParser, type SaxesTagPlain } from "saxes";

import type { ArtifactHeader } from "@rekon/kernel-artifacts";
import {
  createLintReport,
  createTestReport,
  type LintDiagnostic,
  type LintReport,
  type TestCaseResult,
  type TestReport,
} from "@rekon/kernel-repo-model";
import { sanitizeToolMessage } from "./tool-output-safety.js";

export type RepositoryToolReportIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  path?: string;
};

type AdapterInput = {
  repoRoot: string;
  sourcePath: string;
  sourceDigest: string;
  header: ArtifactHeader;
};

export function parseJUnitReport(input: AdapterInput & { xml: string }): {
  valid: boolean;
  report?: TestReport;
  issues: RepositoryToolReportIssue[];
} {
  if (input.xml.length > 25 * 1024 * 1024) return invalid("junit.input_too_large", "JUnit XML exceeds the 25 MiB ingestion limit.");
  const issues: RepositoryToolReportIssue[] = [];
  const cases: TestCaseResult[] = [];
  const caseIdentityCounts = new Map<string, number>();
  const suiteStack: string[] = [];
  let current: Omit<TestCaseResult, "id" | "status"> & { status?: TestCaseResult["status"] } | undefined;
  let parseError: Error | undefined;
  const parser = new SaxesParser({ xmlns: false, fileName: input.sourcePath });

  parser.on("error", (error) => { parseError = error; });
  parser.on("opentag", (tag) => {
    const name = localName(tag.name);
    if (name === "testsuite") {
      suiteStack.push(attribute(tag, "name") ?? "unnamed suite");
      return;
    }
    if (name === "testcase") {
      if (cases.length >= 100_000) throw new Error("JUnit report exceeds the 100,000 test-case limit.");
      const file = normalizeRepoPath(attribute(tag, "file"), input.repoRoot);
      if (attribute(tag, "file") && !file) {
        issues.push({ code: "junit.case_path_outside_repo", severity: "warning", message: "Omitted a test-case path outside the repository." });
      }
      current = {
        suite: suiteStack.at(-1) ?? attribute(tag, "classname") ?? "unnamed suite",
        name: attribute(tag, "name") ?? "unnamed test",
        ...(attribute(tag, "classname") ? { className: attribute(tag, "classname") } : {}),
        ...(file ? { file } : {}),
        ...(positiveInteger(attribute(tag, "line")) ? { line: positiveInteger(attribute(tag, "line")) } : {}),
        ...(durationMs(attribute(tag, "time")) !== undefined ? { durationMs: durationMs(attribute(tag, "time")) } : {}),
      };
      return;
    }
    if (!current) return;
    if (name === "failure" || name === "error" || name === "skipped") {
      current.status = name === "failure" ? "failed" : name;
      const message = sanitizeToolMessage(attribute(tag, "message") ?? attribute(tag, "type"));
      if (message) current.message = message;
    }
  });
  parser.on("closetag", (tag) => {
    const name = localName(tag.name);
    if (name === "testcase" && current) {
      const status = current.status ?? "passed";
      const identity = {
        suite: current.suite,
        name: current.name,
        className: current.className,
        file: current.file,
        line: current.line,
      };
      const identityKey = stableJson(identity);
      const duplicateIndex = caseIdentityCounts.get(identityKey) ?? 0;
      caseIdentityCounts.set(identityKey, duplicateIndex + 1);
      cases.push({
        ...current,
        status,
        id: stableId("test-case", duplicateIndex === 0 ? identity : { ...identity, duplicateIndex }),
      });
      current = undefined;
    } else if (name === "testsuite") {
      suiteStack.pop();
    }
  });

  try {
    parser.write(input.xml).close();
  } catch (error) {
    parseError = error instanceof Error ? error : new Error(String(error));
  }
  if (parseError) return invalid("junit.xml_invalid", sanitizeToolMessage(parseError.message) ?? "JUnit XML is malformed.");
  if (cases.length === 0) issues.push({ code: "junit.no_test_cases", severity: "warning", message: "JUnit XML contained no test cases." });

  try {
    const report = createTestReport({
      header: input.header,
      source: { format: "junit-xml", path: input.sourcePath, digest: input.sourceDigest },
      tool: { name: "junit" },
      status: { complete: !issues.some((issue) => issue.severity === "warning"), warnings: issues.map((issue) => issue.message) },
      summary: { tests: 0, passed: 0, failures: 0, errors: 0, skipped: 0 },
      cases,
    });
    return { valid: true, report, issues };
  } catch (error) {
    return invalid("junit.report_invalid", error instanceof Error ? error.message : String(error));
  }
}

export function parseEslintJsonReport(input: AdapterInput & { report: unknown }): {
  valid: boolean;
  report?: LintReport;
  issues: RepositoryToolReportIssue[];
} {
  if (!Array.isArray(input.report)) return invalid("eslint.report_invalid", "ESLint JSON must be an array of file results.");
  const issues: RepositoryToolReportIssue[] = [];
  const diagnostics: LintDiagnostic[] = [];
  let suppressed = 0;

  for (const [fileIndex, fileResult] of input.report.entries()) {
    if (!isRecord(fileResult)) {
      issues.push({ code: "eslint.file_result_invalid", severity: "warning", message: `Ignored malformed ESLint file result ${fileIndex + 1}.` });
      continue;
    }
    const file = normalizeRepoPath(stringValue(fileResult.filePath), input.repoRoot);
    if (!file) {
      issues.push({ code: "eslint.file_path_outside_repo", severity: "warning", message: "Ignored an ESLint file result without a repository-contained file path." });
      continue;
    }
    if (Array.isArray(fileResult.suppressedMessages)) suppressed += fileResult.suppressedMessages.length;
    if (!Array.isArray(fileResult.messages)) {
      issues.push({ code: "eslint.messages_missing", severity: "warning", message: `Ignored ${file}: messages must be an array.`, path: file });
      continue;
    }
    for (const [messageIndex, rawMessage] of fileResult.messages.entries()) {
      if (!isRecord(rawMessage)) {
        issues.push({ code: "eslint.message_invalid", severity: "warning", message: `Ignored malformed ESLint message ${messageIndex + 1} for ${file}.`, path: file });
        continue;
      }
      const severity = rawMessage.severity === 2 || rawMessage.fatal === true ? "error" : rawMessage.severity === 1 ? "warning" : undefined;
      const message = sanitizeToolMessage(stringValue(rawMessage.message));
      if (!severity || !message) {
        issues.push({ code: "eslint.message_incomplete", severity: "warning", message: `Ignored incomplete ESLint message ${messageIndex + 1} for ${file}.`, path: file });
        continue;
      }
      const diagnostic: Omit<LintDiagnostic, "id"> = {
        file,
        severity,
        message,
        ...(stringValue(rawMessage.ruleId) ? { ruleId: stringValue(rawMessage.ruleId) } : {}),
        ...(positiveInteger(rawMessage.line) ? { line: positiveInteger(rawMessage.line) } : {}),
        ...(positiveInteger(rawMessage.column) ? { column: positiveInteger(rawMessage.column) } : {}),
        ...(positiveInteger(rawMessage.endLine) ? { endLine: positiveInteger(rawMessage.endLine) } : {}),
        ...(positiveInteger(rawMessage.endColumn) ? { endColumn: positiveInteger(rawMessage.endColumn) } : {}),
      };
      diagnostics.push({ ...diagnostic, id: stableId("lint-diagnostic", diagnostic) });
    }
  }

  try {
    const report = createLintReport({
      header: input.header,
      source: { format: "eslint-json", path: input.sourcePath, digest: input.sourceDigest },
      tool: { name: "eslint" },
      status: { complete: !issues.some((issue) => issue.severity === "warning"), warnings: issues.map((issue) => issue.message) },
      summary: { files: 0, diagnostics: 0, errors: 0, warnings: 0, suppressed },
      diagnostics,
    });
    return { valid: true, report, issues };
  } catch (error) {
    return invalid("eslint.normalized_report_invalid", error instanceof Error ? error.message : String(error));
  }
}

function attribute(tag: SaxesTagPlain, name: string): string | undefined {
  const value = tag.attributes[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function localName(name: string): string {
  return (name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name).toLowerCase();
}

function normalizeRepoPath(value: string | undefined, repoRoot: string): string | undefined {
  if (!value || value.includes("\0")) return undefined;
  const root = resolve(repoRoot);
  const absolute = isAbsolute(value) ? resolve(value) : resolve(root, value);
  const rel = relative(root, absolute);
  if (!rel || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) return undefined;
  return rel.replace(/\\/gu, "/");
}

function stableId(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(stableJson(value)).digest("hex").slice(0, 24)}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function durationMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1_000 * 1_000) / 1_000 : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(code: string, message: string) {
  return { valid: false, issues: [{ code, severity: "error" as const, message: sanitizeToolMessage(message) ?? "Input was rejected." }] };
}

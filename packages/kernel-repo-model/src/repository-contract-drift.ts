import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";

export type ContractDriftReason = {
  code: string;
  severity: "error" | "warning";
  message: string;
  paths: string[];
  evidenceRefs: ArtifactRef[];
};

export type ContractDriftEntry = {
  contractType: "SystemContract" | "FlowContract";
  contractId: string;
  contractRef: ArtifactRef;
  status: "current" | "drifted" | "unverified";
  source?: { path: string; recordedDigest?: string; currentDigest?: string };
  reasons: ContractDriftReason[];
};

export type ContractDriftReport = {
  header: ArtifactHeader;
  registryRef: ArtifactRef;
  entries: ContractDriftEntry[];
  summary: {
    total: number;
    current: number;
    drifted: number;
    unverified: number;
  };
};

export function createContractDriftReport(
  input: Omit<ContractDriftReport, "summary"> & { summary?: ContractDriftReport["summary"] },
): ContractDriftReport {
  const seen = new Set<string>();
  const entries = [...input.entries].sort((left, right) => `${left.contractType}:${left.contractId}`.localeCompare(`${right.contractType}:${right.contractId}`));
  for (const entry of entries) {
    const key = `${entry.contractType}:${entry.contractId}`;
    if (seen.has(key)) throw new TypeError(`Duplicate contract drift entry ${key}.`);
    seen.add(key);
  }
  return assertContractDriftReport({
    header: input.header,
    registryRef: input.registryRef,
    entries,
    summary: {
      total: entries.length,
      current: entries.filter((entry) => entry.status === "current").length,
      drifted: entries.filter((entry) => entry.status === "drifted").length,
      unverified: entries.filter((entry) => entry.status === "unverified").length,
    },
  });
}

export function validateContractDriftReport(value: unknown): ValidationResult<ContractDriftReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  const header = validateArtifactHeader(value.header);
  if (!header.ok) appendIssues(issues, header.issues, "$.header");
  if (isRecord(value.header) && value.header.artifactType !== "ContractDriftReport") {
    issues.push({ path: "$.header.artifactType", message: "Expected ContractDriftReport." });
  }
  validateRef(issues, value.registryRef, "$.registryRef");
  if (!Array.isArray(value.entries)) {
    issues.push({ path: "$.entries", message: "Expected an array." });
  } else {
    const seen = new Set<string>();
    value.entries.forEach((entry, index) => {
      const path = `$.entries[${index}]`;
      validateEntry(issues, entry, path);
      if (isRecord(entry)) {
        const key = `${String(entry.contractType)}:${String(entry.contractId)}`;
        if (seen.has(key)) issues.push({ path, message: `Duplicate contract drift entry ${key}.` });
        seen.add(key);
      }
    });
  }
  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else if (Array.isArray(value.entries)) {
    const entries = value.entries.filter(isRecord);
    const expected = {
      total: entries.length,
      current: entries.filter((entry) => entry.status === "current").length,
      drifted: entries.filter((entry) => entry.status === "drifted").length,
      unverified: entries.filter((entry) => entry.status === "unverified").length,
    };
    for (const [key, count] of Object.entries(expected)) {
      if (value.summary[key] !== count) issues.push({ path: `$.summary.${key}`, message: `Expected ${count}.` });
    }
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: value as ContractDriftReport, issues: [] };
}

export function assertContractDriftReport(value: unknown): ContractDriftReport {
  const result = validateContractDriftReport(value);
  if (result.ok) return result.value;
  throw new TypeError(`ContractDriftReport validation failed: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
}

export const contractDriftReportSchema: ArtifactSchema<ContractDriftReport> = {
  validate: validateContractDriftReport,
  parse: assertContractDriftReport,
};

function validateEntry(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  if (value.contractType !== "SystemContract" && value.contractType !== "FlowContract") {
    issues.push({ path: `${path}.contractType`, message: "Expected SystemContract or FlowContract." });
  }
  requiredString(issues, value.contractId, `${path}.contractId`);
  validateRef(issues, value.contractRef, `${path}.contractRef`);
  if (value.status !== "current" && value.status !== "drifted" && value.status !== "unverified") {
    issues.push({ path: `${path}.status`, message: "Expected current, drifted, or unverified." });
  }
  if (value.source !== undefined) {
    if (!isRecord(value.source)) issues.push({ path: `${path}.source`, message: "Expected an object." });
    else {
      requiredString(issues, value.source.path, `${path}.source.path`);
      optionalDigest(issues, value.source.recordedDigest, `${path}.source.recordedDigest`);
      optionalDigest(issues, value.source.currentDigest, `${path}.source.currentDigest`);
    }
  }
  if (!Array.isArray(value.reasons)) issues.push({ path: `${path}.reasons`, message: "Expected an array." });
  else value.reasons.forEach((reason, index) => validateReason(issues, reason, `${path}.reasons[${index}]`));
  if (value.status === "current" && Array.isArray(value.reasons) && value.reasons.length > 0) {
    issues.push({ path: `${path}.reasons`, message: "Current contracts may not declare drift reasons." });
  }
}

function validateReason(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.code, `${path}.code`);
  if (value.severity !== "error" && value.severity !== "warning") issues.push({ path: `${path}.severity`, message: "Expected error or warning." });
  requiredString(issues, value.message, `${path}.message`);
  stringArray(issues, value.paths, `${path}.paths`);
  if (!Array.isArray(value.evidenceRefs)) issues.push({ path: `${path}.evidenceRefs`, message: "Expected an array." });
  else value.evidenceRefs.forEach((ref, index) => validateRef(issues, ref, `${path}.evidenceRefs[${index}]`));
}

function validateRef(issues: ValidationIssue[], value: unknown, path: string): void {
  const result = validateArtifactRef(value);
  if (!result.ok) appendIssues(issues, result.issues, path);
}

function requiredString(issues: ValidationIssue[], value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) issues.push({ path, message: "Expected a non-empty string." });
}

function optionalDigest(issues: ValidationIssue[], value: unknown, path: string): void {
  if (value !== undefined && (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))) issues.push({ path, message: "Expected a lowercase SHA-256 digest." });
}

function stringArray(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) issues.push({ path, message: "Expected an array of non-empty strings." });
}

function appendIssues(issues: ValidationIssue[], nested: ValidationIssue[], path: string): void {
  for (const issue of nested) {
    const suffix = issue.path === "$" ? "" : issue.path.replace(/^\$/u, "");
    issues.push({ path: `${path}${suffix}`, message: issue.message });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

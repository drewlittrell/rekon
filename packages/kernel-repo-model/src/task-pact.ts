import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";
import type { ContractAuthority } from "./repository-contracts.js";

export type TaskPactContract = {
  contractType: "SystemContract" | "FlowContract" | "CapabilityContract" | "HandoffContract";
  contractId: string;
  authority: ContractAuthority;
  confidence: number;
  freshness: "fresh" | "stale" | "partial" | "unknown";
  ref: ArtifactRef;
};

export type TaskPactConstraint = {
  id: string;
  kind: "purpose" | "outcome" | "invariant" | "prohibition" | "handoff";
  statement: string;
  paths: string[];
  contractRef: ArtifactRef;
  authority: ContractAuthority;
  confidence: number;
};

export type TaskPactImpactObligation = {
  id: string;
  kind: "preserve" | "inspect" | "verify";
  statement: string;
  paths: string[];
  requiredChecks: string[];
  contractRefs: ArtifactRef[];
};

export type TaskPact = {
  header: ArtifactHeader;
  task: { text: string; goal?: string; paths: string[] };
  contracts: TaskPactContract[];
  requiredContextPaths: string[];
  constraints: TaskPactConstraint[];
  impactObligations: TaskPactImpactObligation[];
  requiredChecks: string[];
  warnings: string[];
  summary: {
    contracts: number;
    constraints: number;
    impactObligations: number;
    requiredContextPaths: number;
    requiredChecks: number;
  };
};

export function createTaskPact(input: Omit<TaskPact, "summary"> & { summary?: TaskPact["summary"] }): TaskPact {
  const contracts = dedupe(input.contracts, (entry) => `${entry.contractType}:${entry.contractId}`);
  const constraints = dedupe(input.constraints, (entry) => entry.id);
  const impactObligations = dedupe(input.impactObligations, (entry) => entry.id);
  return assertTaskPact({
    header: input.header,
    task: { ...input.task, paths: unique(input.task.paths) },
    contracts,
    requiredContextPaths: unique(input.requiredContextPaths),
    constraints,
    impactObligations,
    requiredChecks: unique(input.requiredChecks),
    warnings: unique(input.warnings),
    summary: {
      contracts: contracts.length,
      constraints: constraints.length,
      impactObligations: impactObligations.length,
      requiredContextPaths: unique(input.requiredContextPaths).length,
      requiredChecks: unique(input.requiredChecks).length,
    },
  });
}

export function validateTaskPact(value: unknown): ValidationResult<TaskPact> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
  const header = validateArtifactHeader(value.header);
  if (!header.ok) appendIssues(issues, header.issues, "$.header");
  if (isRecord(value.header) && value.header.artifactType !== "TaskPact") issues.push({ path: "$.header.artifactType", message: "Expected TaskPact." });
  if (!isRecord(value.task)) issues.push({ path: "$.task", message: "Expected an object." });
  else {
    requiredString(issues, value.task.text, "$.task.text");
    if (value.task.goal !== undefined) requiredString(issues, value.task.goal, "$.task.goal");
    stringArray(issues, value.task.paths, "$.task.paths");
  }
  uniqueArray(issues, value.contracts, "$.contracts", validateContract, (entry) => isRecord(entry) ? `${String(entry.contractType)}:${String(entry.contractId)}` : "");
  stringArray(issues, value.requiredContextPaths, "$.requiredContextPaths");
  uniqueArray(issues, value.constraints, "$.constraints", validateConstraint, (entry) => isRecord(entry) ? String(entry.id ?? "") : "");
  uniqueArray(issues, value.impactObligations, "$.impactObligations", validateImpactObligation, (entry) => isRecord(entry) ? String(entry.id ?? "") : "");
  stringArray(issues, value.requiredChecks, "$.requiredChecks");
  stringArray(issues, value.warnings, "$.warnings");
  if (!isRecord(value.summary)) issues.push({ path: "$.summary", message: "Expected an object." });
  else {
    const expected = {
      contracts: Array.isArray(value.contracts) ? value.contracts.length : 0,
      constraints: Array.isArray(value.constraints) ? value.constraints.length : 0,
      impactObligations: Array.isArray(value.impactObligations) ? value.impactObligations.length : 0,
      requiredContextPaths: Array.isArray(value.requiredContextPaths) ? value.requiredContextPaths.length : 0,
      requiredChecks: Array.isArray(value.requiredChecks) ? value.requiredChecks.length : 0,
    };
    for (const [key, count] of Object.entries(expected)) if (value.summary[key] !== count) issues.push({ path: `$.summary.${key}`, message: `Expected ${count}.` });
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: value as TaskPact, issues: [] };
}

export function assertTaskPact(value: unknown): TaskPact {
  const result = validateTaskPact(value);
  if (result.ok) return result.value;
  throw new TypeError(`TaskPact validation failed: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
}

export const taskPactSchema: ArtifactSchema<TaskPact> = { validate: validateTaskPact, parse: assertTaskPact };

function validateContract(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  if (!["SystemContract", "FlowContract", "CapabilityContract", "HandoffContract"].includes(String(value.contractType))) issues.push({ path: `${path}.contractType`, message: "Expected a supported contract type." });
  requiredString(issues, value.contractId, `${path}.contractId`);
  authority(issues, value.authority, `${path}.authority`);
  confidence(issues, value.confidence, `${path}.confidence`);
  if (!["fresh", "stale", "partial", "unknown"].includes(String(value.freshness))) issues.push({ path: `${path}.freshness`, message: "Expected a freshness status." });
  ref(issues, value.ref, `${path}.ref`);
}

function validateConstraint(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  if (!["purpose", "outcome", "invariant", "prohibition", "handoff"].includes(String(value.kind))) issues.push({ path: `${path}.kind`, message: "Expected a supported constraint kind." });
  requiredString(issues, value.statement, `${path}.statement`);
  stringArray(issues, value.paths, `${path}.paths`);
  ref(issues, value.contractRef, `${path}.contractRef`);
  authority(issues, value.authority, `${path}.authority`);
  confidence(issues, value.confidence, `${path}.confidence`);
}

function validateImpactObligation(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  if (value.kind !== "preserve" && value.kind !== "inspect" && value.kind !== "verify") issues.push({ path: `${path}.kind`, message: "Expected preserve, inspect, or verify." });
  requiredString(issues, value.statement, `${path}.statement`);
  stringArray(issues, value.paths, `${path}.paths`);
  stringArray(issues, value.requiredChecks, `${path}.requiredChecks`);
  if (!Array.isArray(value.contractRefs)) issues.push({ path: `${path}.contractRefs`, message: "Expected an array." });
  else value.contractRefs.forEach((entry, index) => ref(issues, entry, `${path}.contractRefs[${index}]`));
}

function authority(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!["observed", "inferred", "corroborated", "adopted"].includes(String(value))) issues.push({ path, message: "Expected a contract authority." });
}

function confidence(issues: ValidationIssue[], value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) issues.push({ path, message: "Expected a number between 0 and 1." });
}

function ref(issues: ValidationIssue[], value: unknown, path: string): void {
  const result = validateArtifactRef(value);
  if (!result.ok) appendIssues(issues, result.issues, path);
}

function uniqueArray(issues: ValidationIssue[], value: unknown, path: string, validate: (issues: ValidationIssue[], value: unknown, path: string) => void, key: (value: unknown) => string): void {
  if (!Array.isArray(value)) return void issues.push({ path, message: "Expected an array." });
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    validate(issues, entry, `${path}[${index}]`);
    const id = key(entry);
    if (id && seen.has(id)) issues.push({ path: `${path}[${index}]`, message: `Duplicate id ${id}.` });
    seen.add(id);
  });
}

function requiredString(issues: ValidationIssue[], value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) issues.push({ path, message: "Expected a non-empty string." });
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

function dedupe<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

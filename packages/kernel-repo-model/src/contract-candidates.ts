import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";
import {
  type FlowContractSource,
  type SystemContractSource,
  validateRepositoryContractSourceDocument,
} from "./repository-contracts.js";

export type ContractCandidate = {
  id: string;
  kind: "system" | "flow";
  targetId: string;
  confidence: number;
  rationale: string;
  evidenceRefs: ArtifactRef[];
  proposed: SystemContractSource | FlowContractSource;
};

export type ContractDiscoveryEvidenceInventory = {
  status: "complete" | "partial";
  topologyBasis: "structural" | "structural-and-runtime";
  structural: {
    artifactTypes: string[];
    graphClaims: number;
    runtimeClaims: number;
  };
  verification: {
    adoptedFlowContracts: number;
    runtimeObservationReports: {
      indexed: number;
      validated: number;
    };
    isolatedCoverageRecords: number;
  };
  issues: string[];
  notes: string[];
};

export type ContractCandidateReport = {
  header: ArtifactHeader;
  /** Present on reports produced by evidence-aware discovery. Optional for v1 compatibility. */
  evidenceInventory?: ContractDiscoveryEvidenceInventory;
  candidates: ContractCandidate[];
  unresolved: Array<{
    id: string;
    kind: "system" | "flow" | "handoff" | "capability";
    reason: string;
    evidenceRefs: ArtifactRef[];
  }>;
  summary: {
    total: number;
    systems: number;
    flows: number;
    unresolved: number;
  };
};

export type ContractJudgmentDecision = "accept" | "reject" | "uncertain";

export type ContractJudgmentCitation = {
  path: string;
  digest: string;
  lineStart?: number;
  lineEnd?: number;
  excerpt?: string;
};

export type ContractJudgment = {
  candidateId: string;
  decision: ContractJudgmentDecision;
  confidence: number;
  rationale: string;
  citations: ContractJudgmentCitation[];
  evidenceRefs: ArtifactRef[];
  proposed?: SystemContractSource | FlowContractSource;
};

export type ContractJudgmentReport = {
  header: ArtifactHeader;
  candidateReportRef: ArtifactRef;
  judge: {
    id: string;
    version: string;
    mode: "deterministic" | "agent" | "provider";
    model?: string;
    promptVersion?: string;
  };
  judgments: ContractJudgment[];
  summary: {
    total: number;
    accepted: number;
    rejected: number;
    uncertain: number;
  };
};

export type ContractAdoptionOperation = {
  candidateId: string;
  contractType: "SystemContract" | "FlowContract";
  contractId: string;
  status: "planned" | "adopted" | "skipped" | "blocked";
  reason: string;
  sourcePath?: string;
  sourceDigest?: string;
};

export type ContractAdoptionReport = {
  header: ArtifactHeader;
  candidateReportRef: ArtifactRef;
  judgmentReportRef: ArtifactRef;
  mode: "dry-run" | "apply";
  operations: ContractAdoptionOperation[];
  summary: {
    total: number;
    planned: number;
    adopted: number;
    skipped: number;
    blocked: number;
  };
};

const DECISIONS = new Set<ContractJudgmentDecision>(["accept", "reject", "uncertain"]);
const JUDGE_MODES = new Set(["deterministic", "agent", "provider"]);

export function createContractCandidateReport(
  input: Omit<ContractCandidateReport, "summary"> & { summary?: ContractCandidateReport["summary"] },
): ContractCandidateReport {
  const candidates = dedupeById(input.candidates).sort((left, right) => left.id.localeCompare(right.id));
  const unresolved = dedupeById(input.unresolved).sort((left, right) => left.id.localeCompare(right.id));
  return assertContractCandidateReport({
    header: input.header,
    ...(input.evidenceInventory ? { evidenceInventory: input.evidenceInventory } : {}),
    candidates,
    unresolved,
    summary: {
      total: candidates.length,
      systems: candidates.filter((candidate) => candidate.kind === "system").length,
      flows: candidates.filter((candidate) => candidate.kind === "flow").length,
      unresolved: unresolved.length,
    },
  });
}

export function validateContractCandidateReport(value: unknown): ValidationResult<ContractCandidateReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidRoot();
  validateTypedHeader(issues, value.header, "ContractCandidateReport");
  if (value.evidenceInventory !== undefined) {
    validateEvidenceInventory(issues, value.evidenceInventory, "$.evidenceInventory");
  }
  validateUniqueArray(issues, value.candidates, "$.candidates", validateCandidate);
  validateUniqueArray(issues, value.unresolved, "$.unresolved", validateUnresolved);
  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else if (Array.isArray(value.candidates) && Array.isArray(value.unresolved)) {
    const candidates = value.candidates.filter(isRecord);
    const expected = {
      total: candidates.length,
      systems: candidates.filter((candidate) => candidate.kind === "system").length,
      flows: candidates.filter((candidate) => candidate.kind === "flow").length,
      unresolved: value.unresolved.length,
    };
    for (const [key, count] of Object.entries(expected)) {
      if (value.summary[key] !== count) issues.push({ path: `$.summary.${key}`, message: `Expected ${count}.` });
    }
  }
  return finish(value as ContractCandidateReport, issues);
}

export function assertContractCandidateReport(value: unknown): ContractCandidateReport {
  return assertValid(validateContractCandidateReport(value), "ContractCandidateReport");
}

export const contractCandidateReportSchema: ArtifactSchema<ContractCandidateReport> = {
  validate: validateContractCandidateReport,
  parse: assertContractCandidateReport,
};

export function createContractJudgmentReport(
  input: Omit<ContractJudgmentReport, "summary"> & { summary?: ContractJudgmentReport["summary"] },
): ContractJudgmentReport {
  const judgments = dedupeJudgments(input.judgments).sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  return assertContractJudgmentReport({
    header: input.header,
    candidateReportRef: input.candidateReportRef,
    judge: input.judge,
    judgments,
    summary: {
      total: judgments.length,
      accepted: judgments.filter((judgment) => judgment.decision === "accept").length,
      rejected: judgments.filter((judgment) => judgment.decision === "reject").length,
      uncertain: judgments.filter((judgment) => judgment.decision === "uncertain").length,
    },
  });
}

export function validateContractJudgmentReport(value: unknown): ValidationResult<ContractJudgmentReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidRoot();
  validateTypedHeader(issues, value.header, "ContractJudgmentReport");
  validateRef(issues, value.candidateReportRef, "$.candidateReportRef");
  if (!isRecord(value.judge)) {
    issues.push({ path: "$.judge", message: "Expected an object." });
  } else {
    requiredString(issues, value.judge.id, "$.judge.id");
    requiredString(issues, value.judge.version, "$.judge.version");
    if (typeof value.judge.mode !== "string" || !JUDGE_MODES.has(value.judge.mode)) {
      issues.push({ path: "$.judge.mode", message: "Expected deterministic, agent, or provider." });
    }
    optionalString(issues, value.judge.model, "$.judge.model");
    optionalString(issues, value.judge.promptVersion, "$.judge.promptVersion");
    if (value.judge.mode === "provider" && typeof value.judge.model !== "string") {
      issues.push({ path: "$.judge.model", message: "Provider judgments require a model." });
    }
  }
  validateUniqueArray(issues, value.judgments, "$.judgments", validateJudgment, (entry) =>
    isRecord(entry) ? String(entry.candidateId ?? "") : "",
  );
  if (isRecord(value.judge) && (value.judge.mode === "agent" || value.judge.mode === "provider") && Array.isArray(value.judgments)) {
    value.judgments.forEach((judgment, index) => {
      if (isRecord(judgment) && judgment.decision === "accept" && (!Array.isArray(judgment.citations) || judgment.citations.length === 0)) {
        issues.push({ path: `$.judgments[${index}].citations`, message: "Accepted agent or provider judgments require a current source citation." });
      }
    });
  }
  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else if (Array.isArray(value.judgments)) {
    const judgments = value.judgments.filter(isRecord);
    const expected = {
      total: judgments.length,
      accepted: judgments.filter((judgment) => judgment.decision === "accept").length,
      rejected: judgments.filter((judgment) => judgment.decision === "reject").length,
      uncertain: judgments.filter((judgment) => judgment.decision === "uncertain").length,
    };
    for (const [key, count] of Object.entries(expected)) {
      if (value.summary[key] !== count) issues.push({ path: `$.summary.${key}`, message: `Expected ${count}.` });
    }
  }
  return finish(value as ContractJudgmentReport, issues);
}

export function assertContractJudgmentReport(value: unknown): ContractJudgmentReport {
  return assertValid(validateContractJudgmentReport(value), "ContractJudgmentReport");
}

export const contractJudgmentReportSchema: ArtifactSchema<ContractJudgmentReport> = {
  validate: validateContractJudgmentReport,
  parse: assertContractJudgmentReport,
};

export function createContractAdoptionReport(
  input: Omit<ContractAdoptionReport, "summary"> & { summary?: ContractAdoptionReport["summary"] },
): ContractAdoptionReport {
  const operations = dedupeAdoptionOperations(input.operations).sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  return assertContractAdoptionReport({
    header: input.header,
    candidateReportRef: input.candidateReportRef,
    judgmentReportRef: input.judgmentReportRef,
    mode: input.mode,
    operations,
    summary: {
      total: operations.length,
      planned: operations.filter((operation) => operation.status === "planned").length,
      adopted: operations.filter((operation) => operation.status === "adopted").length,
      skipped: operations.filter((operation) => operation.status === "skipped").length,
      blocked: operations.filter((operation) => operation.status === "blocked").length,
    },
  });
}

export function validateContractAdoptionReport(value: unknown): ValidationResult<ContractAdoptionReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidRoot();
  validateTypedHeader(issues, value.header, "ContractAdoptionReport");
  validateRef(issues, value.candidateReportRef, "$.candidateReportRef");
  validateRef(issues, value.judgmentReportRef, "$.judgmentReportRef");
  if (value.mode !== "dry-run" && value.mode !== "apply") {
    issues.push({ path: "$.mode", message: "Expected dry-run or apply." });
  }
  validateUniqueArray(issues, value.operations, "$.operations", validateAdoptionOperation, (entry) =>
    isRecord(entry) ? String(entry.candidateId ?? "") : "",
  );
  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else if (Array.isArray(value.operations)) {
    const operations = value.operations.filter(isRecord);
    const expected = {
      total: operations.length,
      planned: operations.filter((operation) => operation.status === "planned").length,
      adopted: operations.filter((operation) => operation.status === "adopted").length,
      skipped: operations.filter((operation) => operation.status === "skipped").length,
      blocked: operations.filter((operation) => operation.status === "blocked").length,
    };
    for (const [key, count] of Object.entries(expected)) {
      if (value.summary[key] !== count) issues.push({ path: `$.summary.${key}`, message: `Expected ${count}.` });
    }
  }
  return finish(value as ContractAdoptionReport, issues);
}

export function assertContractAdoptionReport(value: unknown): ContractAdoptionReport {
  return assertValid(validateContractAdoptionReport(value), "ContractAdoptionReport");
}

export const contractAdoptionReportSchema: ArtifactSchema<ContractAdoptionReport> = {
  validate: validateContractAdoptionReport,
  parse: assertContractAdoptionReport,
};

function validateCandidate(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  if (value.kind !== "system" && value.kind !== "flow") {
    issues.push({ path: `${path}.kind`, message: "Expected system or flow." });
  }
  requiredString(issues, value.targetId, `${path}.targetId`);
  confidence(issues, value.confidence, `${path}.confidence`);
  requiredString(issues, value.rationale, `${path}.rationale`);
  refArray(issues, value.evidenceRefs, `${path}.evidenceRefs`, true);
  const document = value.kind === "system"
    ? { version: "1.0.0", sourceId: "candidate", systems: [value.proposed] }
    : { version: "1.0.0", sourceId: "candidate", flows: [value.proposed] };
  const result = validateRepositoryContractSourceDocument(document);
  if (!result.ok) appendIssues(issues, result.issues, `${path}.proposed`);
  if (isRecord(value.proposed) && typeof value.targetId === "string" && value.proposed.id !== value.targetId) {
    issues.push({ path: `${path}.targetId`, message: "targetId must match proposed.id." });
  }
}

function validateUnresolved(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  if (!["system", "flow", "handoff", "capability"].includes(String(value.kind))) {
    issues.push({ path: `${path}.kind`, message: "Expected a supported unresolved kind." });
  }
  requiredString(issues, value.reason, `${path}.reason`);
  refArray(issues, value.evidenceRefs, `${path}.evidenceRefs`);
}

function validateEvidenceInventory(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  if (value.status !== "complete" && value.status !== "partial") {
    issues.push({ path: `${path}.status`, message: "Expected complete or partial." });
  }
  if (value.topologyBasis !== "structural" && value.topologyBasis !== "structural-and-runtime") {
    issues.push({ path: `${path}.topologyBasis`, message: "Expected structural or structural-and-runtime." });
  }
  if (!isRecord(value.structural)) {
    issues.push({ path: `${path}.structural`, message: "Expected an object." });
  } else {
    stringArray(issues, value.structural.artifactTypes, `${path}.structural.artifactTypes`);
    nonNegativeInteger(issues, value.structural.graphClaims, `${path}.structural.graphClaims`);
    nonNegativeInteger(issues, value.structural.runtimeClaims, `${path}.structural.runtimeClaims`);
  }
  if (!isRecord(value.verification)) {
    issues.push({ path: `${path}.verification`, message: "Expected an object." });
  } else {
    nonNegativeInteger(issues, value.verification.adoptedFlowContracts, `${path}.verification.adoptedFlowContracts`);
    nonNegativeInteger(issues, value.verification.isolatedCoverageRecords, `${path}.verification.isolatedCoverageRecords`);
    if (!isRecord(value.verification.runtimeObservationReports)) {
      issues.push({ path: `${path}.verification.runtimeObservationReports`, message: "Expected an object." });
    } else {
      nonNegativeInteger(issues, value.verification.runtimeObservationReports.indexed, `${path}.verification.runtimeObservationReports.indexed`);
      nonNegativeInteger(issues, value.verification.runtimeObservationReports.validated, `${path}.verification.runtimeObservationReports.validated`);
      if (typeof value.verification.runtimeObservationReports.indexed === "number"
        && typeof value.verification.runtimeObservationReports.validated === "number"
        && value.verification.runtimeObservationReports.validated > value.verification.runtimeObservationReports.indexed) {
        issues.push({
          path: `${path}.verification.runtimeObservationReports.validated`,
          message: "Validated report count cannot exceed indexed report count.",
        });
      }
    }
  }
  stringArray(issues, value.issues, `${path}.issues`);
  stringArray(issues, value.notes, `${path}.notes`);
}

function validateJudgment(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.candidateId, `${path}.candidateId`);
  if (typeof value.decision !== "string" || !DECISIONS.has(value.decision as ContractJudgmentDecision)) {
    issues.push({ path: `${path}.decision`, message: "Expected accept, reject, or uncertain." });
  }
  confidence(issues, value.confidence, `${path}.confidence`);
  requiredString(issues, value.rationale, `${path}.rationale`);
  if (!Array.isArray(value.citations)) {
    issues.push({ path: `${path}.citations`, message: "Expected an array." });
  } else {
    value.citations.forEach((citation, index) => validateCitation(issues, citation, `${path}.citations[${index}]`));
  }
  refArray(issues, value.evidenceRefs, `${path}.evidenceRefs`);
  if (value.decision === "accept" && Array.isArray(value.citations) && value.citations.length === 0 && Array.isArray(value.evidenceRefs) && value.evidenceRefs.length === 0) {
    issues.push({ path, message: "Accepted judgments require a citation or artifact evidence." });
  }
  if (value.proposed !== undefined) {
    const document = isRecord(value.proposed) && typeof value.proposed.systemId === "string"
      ? { version: "1.0.0", sourceId: "judgment", systems: [value.proposed] }
      : { version: "1.0.0", sourceId: "judgment", flows: [value.proposed] };
    const result = validateRepositoryContractSourceDocument(document);
    if (!result.ok) appendIssues(issues, result.issues, `${path}.proposed`);
  } else if (value.decision === "accept") {
    issues.push({ path: `${path}.proposed`, message: "Accepted judgments require repository-native proposed contract wording." });
  }
}

function validateAdoptionOperation(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.candidateId, `${path}.candidateId`);
  if (value.contractType !== "SystemContract" && value.contractType !== "FlowContract") {
    issues.push({ path: `${path}.contractType`, message: "Expected SystemContract or FlowContract." });
  }
  requiredString(issues, value.contractId, `${path}.contractId`);
  if (value.status !== "planned" && value.status !== "adopted" && value.status !== "skipped" && value.status !== "blocked") {
    issues.push({ path: `${path}.status`, message: "Expected planned, adopted, skipped, or blocked." });
  }
  requiredString(issues, value.reason, `${path}.reason`);
  optionalString(issues, value.sourcePath, `${path}.sourcePath`);
  optionalString(issues, value.sourceDigest, `${path}.sourceDigest`);
  if (typeof value.sourceDigest === "string" && !/^[a-f0-9]{64}$/u.test(value.sourceDigest)) {
    issues.push({ path: `${path}.sourceDigest`, message: "Expected a lowercase SHA-256 digest." });
  }
}

function validateCitation(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.path, `${path}.path`);
  if (typeof value.digest !== "string" || !/^[a-f0-9]{64}$/u.test(value.digest)) {
    issues.push({ path: `${path}.digest`, message: "Expected a lowercase SHA-256 digest." });
  }
  for (const field of ["lineStart", "lineEnd"] as const) {
    if (value[field] !== undefined && (!Number.isInteger(value[field]) || Number(value[field]) < 1)) {
      issues.push({ path: `${path}.${field}`, message: "Expected a positive integer." });
    }
  }
  if (typeof value.lineStart === "number" && typeof value.lineEnd === "number" && value.lineEnd < value.lineStart) {
    issues.push({ path: `${path}.lineEnd`, message: "lineEnd must be at least lineStart." });
  }
  optionalString(issues, value.excerpt, `${path}.excerpt`);
}

function validateTypedHeader(issues: ValidationIssue[], value: unknown, type: string): void {
  const result = validateArtifactHeader(value);
  if (!result.ok) appendIssues(issues, result.issues, "$.header");
  if (isRecord(value) && value.artifactType !== type) issues.push({ path: "$.header.artifactType", message: `Expected ${type}.` });
}

function validateUniqueArray(
  issues: ValidationIssue[],
  value: unknown,
  path: string,
  validator: (issues: ValidationIssue[], value: unknown, path: string) => void,
  key: (value: unknown) => string = (entry) => isRecord(entry) ? String(entry.id ?? "") : "",
): void {
  if (!Array.isArray(value)) return void issues.push({ path, message: "Expected an array." });
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    validator(issues, entry, `${path}[${index}]`);
    const id = key(entry);
    if (id && seen.has(id)) issues.push({ path: `${path}[${index}]`, message: `Duplicate id ${id}.` });
    if (id) seen.add(id);
  });
}

function refArray(issues: ValidationIssue[], value: unknown, path: string, required = false): void {
  if (!Array.isArray(value)) return void issues.push({ path, message: "Expected an array." });
  if (required && value.length === 0) issues.push({ path, message: "Expected at least one artifact reference." });
  value.forEach((ref, index) => validateRef(issues, ref, `${path}[${index}]`));
}

function validateRef(issues: ValidationIssue[], value: unknown, path: string): void {
  const result = validateArtifactRef(value);
  if (!result.ok) appendIssues(issues, result.issues, path);
}

function requiredString(issues: ValidationIssue[], value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) issues.push({ path, message: "Expected a non-empty string." });
}

function optionalString(issues: ValidationIssue[], value: unknown, path: string): void {
  if (value !== undefined) requiredString(issues, value, path);
}

function stringArray(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!Array.isArray(value)) return void issues.push({ path, message: "Expected an array." });
  value.forEach((entry, index) => requiredString(issues, entry, `${path}[${index}]`));
}

function nonNegativeInteger(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!Number.isInteger(value) || Number(value) < 0) {
    issues.push({ path, message: "Expected a non-negative integer." });
  }
}

function confidence(issues: ValidationIssue[], value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) issues.push({ path, message: "Expected a number between 0 and 1." });
}

function appendIssues(issues: ValidationIssue[], nested: ValidationIssue[], path: string): void {
  for (const issue of nested) {
    const suffix = issue.path === "$" ? "" : issue.path.replace(/^\$/u, "");
    issues.push({ path: `${path}${suffix}`, message: issue.message });
  }
}

function dedupeById<T extends { id: string }>(values: T[]): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value.id)) return false;
    seen.add(value.id);
    return true;
  });
}

function dedupeJudgments(values: ContractJudgment[]): ContractJudgment[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.candidateId)) throw new TypeError(`Duplicate contract judgment ${value.candidateId}.`);
    seen.add(value.candidateId);
  }
  return values;
}

function dedupeAdoptionOperations(values: ContractAdoptionOperation[]): ContractAdoptionOperation[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.candidateId)) throw new TypeError(`Duplicate contract adoption operation ${value.candidateId}.`);
    seen.add(value.candidateId);
  }
  return values;
}

function finish<T>(value: T, issues: ValidationIssue[]): ValidationResult<T> {
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value, issues: [] };
}

function invalidRoot<T>(): ValidationResult<T> {
  return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
}

function assertValid<T>(result: ValidationResult<T>, name: string): T {
  if (result.ok) return result.value;
  throw new TypeError(`${name} validation failed: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

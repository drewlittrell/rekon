import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";

export type ProofMethod = "static" | "test" | "runtime" | "model-judgment";

export type ProofSubjectKind =
  | "context-claim"
  | "flow-handoff"
  | "repository-law"
  | "verification-gate";

export type ProofVerdict = "supported" | "refuted" | "unresolved";

export type ProofAcceptancePolicy = "all-required" | "any-authoritative" | "any-supported";

export type ProofSubject = {
  kind: ProofSubjectKind;
  id: string;
  ref?: ArtifactRef;
  paths?: string[];
};

export type ProofObligation = {
  id: string;
  subject: ProofSubject;
  assertion: string;
  requiredEvidence: ProofMethod[];
  acceptancePolicy: ProofAcceptancePolicy;
  required: boolean;
  sourceRefs: ArtifactRef[];
};

export type ProofVerifier = {
  kind: "deterministic" | "test" | "runtime" | "model";
  id: string;
  version: string;
};

export type ProofResult = {
  obligationId: string;
  method: ProofMethod;
  verdict: ProofVerdict;
  evidenceRefs: ArtifactRef[];
  counterEvidenceRefs: ArtifactRef[];
  explanation: string;
  verifier: ProofVerifier;
};

export type ProofGateDecision = {
  obligationId: string;
  verdict: "satisfied" | "blocked" | "unresolved" | "not-required";
  resultCount: number;
  supportedMethods: ProofMethod[];
  refutedMethods: ProofMethod[];
  unresolvedMethods: ProofMethod[];
  missingMethods: ProofMethod[];
  explanation: string;
};

export type ProofGateEvaluation = {
  status: "satisfied" | "blocked" | "incomplete";
  decisions: ProofGateDecision[];
  orphanResultIds: string[];
  summary: {
    obligations: number;
    required: number;
    satisfied: number;
    blocked: number;
    unresolved: number;
    notRequired: number;
  };
};

export type ProofGateReport = {
  header: ArtifactHeader;
  task: {
    text: string;
    paths: string[];
  };
  sourceState?: {
    baseRef: string;
    files: Array<{
      path: string;
      status: "added" | "modified" | "deleted";
      beforeSha256?: string;
      afterSha256?: string;
    }>;
  };
  obligations: ProofObligation[];
  results: ProofResult[];
  evaluation: ProofGateEvaluation;
};

const PROOF_METHODS = new Set<string>(["static", "test", "runtime", "model-judgment"]);
const PROOF_SUBJECT_KINDS = new Set<string>([
  "context-claim",
  "flow-handoff",
  "repository-law",
  "verification-gate",
]);
const PROOF_ACCEPTANCE_POLICIES = new Set<string>(["all-required", "any-authoritative", "any-supported"]);
const PROOF_VERDICTS = new Set<string>(["supported", "refuted", "unresolved"]);
const PROOF_VERIFIER_KINDS = new Set<string>(["deterministic", "test", "runtime", "model"]);

export function evaluateProofGate(
  obligations: ProofObligation[],
  results: ProofResult[],
): ProofGateEvaluation {
  const obligationById = new Map(obligations.map((obligation) => [obligation.id, obligation]));
  const decisions = obligations.map((obligation) => evaluateObligation(
    obligation,
    results.filter((result) => result.obligationId === obligation.id),
  ));
  const orphanResultIds = unique(results
    .filter((result) => !obligationById.has(result.obligationId))
    .map((result) => result.obligationId));
  const requiredDecisions = decisions.filter((decision) =>
    obligationById.get(decision.obligationId)?.required === true);
  const status = requiredDecisions.some((decision) => decision.verdict === "blocked")
    ? "blocked"
    : requiredDecisions.some((decision) => decision.verdict === "unresolved")
      ? "incomplete"
      : "satisfied";

  return {
    status,
    decisions,
    orphanResultIds,
    summary: {
      obligations: obligations.length,
      required: obligations.filter((obligation) => obligation.required).length,
      satisfied: decisions.filter((decision) => decision.verdict === "satisfied").length,
      blocked: decisions.filter((decision) => decision.verdict === "blocked").length,
      unresolved: decisions.filter((decision) => decision.verdict === "unresolved").length,
      notRequired: decisions.filter((decision) => decision.verdict === "not-required").length,
    },
  };
}

export function createProofGateReport(
  input: Omit<ProofGateReport, "evaluation"> & { evaluation?: ProofGateEvaluation },
): ProofGateReport {
  const obligations = dedupe(input.obligations, (obligation) => obligation.id)
    .map(copyObligation)
    .sort((left, right) => left.id.localeCompare(right.id));
  const results = dedupe(input.results, resultKey)
    .map(copyResult)
    .sort((left, right) => resultKey(left).localeCompare(resultKey(right)));
  return assertProofGateReport({
    header: input.header,
    task: { text: input.task.text, paths: unique(input.task.paths) },
    ...(input.sourceState ? {
      sourceState: {
        baseRef: input.sourceState.baseRef,
        files: dedupe(input.sourceState.files, (file) => file.path)
          .map((file) => ({ ...file }))
          .sort((left, right) => left.path.localeCompare(right.path)),
      },
    } : {}),
    obligations,
    results,
    evaluation: evaluateProofGate(obligations, results),
  });
}

export function validateProofObligation(value: unknown): ValidationResult<ProofObligation> {
  const issues: ValidationIssue[] = [];
  validateObligation(value, "$", issues);
  return result(value as ProofObligation, issues);
}

export function validateProofResult(value: unknown): ValidationResult<ProofResult> {
  const issues: ValidationIssue[] = [];
  validateResult(value, "$", issues);
  return result(value as ProofResult, issues);
}

export function validateProofGateReport(value: unknown): ValidationResult<ProofGateReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return result(value as ProofGateReport, [{ path: "$", message: "Expected an object." }]);

  append(issues, validateArtifactHeader(value.header).issues, "$.header");
  if (isRecord(value.header) && value.header.artifactType !== "ProofGateReport") {
    issues.push({ path: "$.header.artifactType", message: "Expected ProofGateReport." });
  }
  if (!isRecord(value.task)) {
    issues.push({ path: "$.task", message: "Expected an object." });
  } else {
    requiredString(issues, value.task.text, "$.task.text");
    stringArray(issues, value.task.paths, "$.task.paths");
  }
  if (value.sourceState !== undefined) validateSourceState(value.sourceState, "$.sourceState", issues);

  const obligations: ProofObligation[] = [];
  const obligationIds = new Set<string>();
  if (!Array.isArray(value.obligations)) {
    issues.push({ path: "$.obligations", message: "Expected an array." });
  } else {
    value.obligations.forEach((obligation, index) => {
      validateObligation(obligation, `$.obligations[${index}]`, issues);
      if (!isRecord(obligation) || typeof obligation.id !== "string") return;
      if (obligationIds.has(obligation.id)) {
        issues.push({ path: `$.obligations[${index}].id`, message: `Duplicate obligation id ${obligation.id}.` });
      }
      obligationIds.add(obligation.id);
      obligations.push(obligation as ProofObligation);
    });
  }

  const results: ProofResult[] = [];
  const resultKeys = new Set<string>();
  if (!Array.isArray(value.results)) {
    issues.push({ path: "$.results", message: "Expected an array." });
  } else {
    value.results.forEach((proofResult, index) => {
      validateResult(proofResult, `$.results[${index}]`, issues);
      if (!isRecord(proofResult)) return;
      const key = resultKey(proofResult as ProofResult);
      if (resultKeys.has(key)) {
        issues.push({ path: `$.results[${index}]`, message: `Duplicate proof result ${key}.` });
      }
      resultKeys.add(key);
      results.push(proofResult as ProofResult);
    });
  }

  const expected = evaluateProofGate(obligations, results);
  if (!deepEqual(value.evaluation, expected)) {
    issues.push({ path: "$.evaluation", message: "Expected the recomputed proof-gate evaluation." });
  }
  return result(value as ProofGateReport, issues);
}

export function assertProofObligation(value: unknown): ProofObligation {
  return assertValid(validateProofObligation(value), "ProofObligation");
}

export function assertProofResult(value: unknown): ProofResult {
  return assertValid(validateProofResult(value), "ProofResult");
}

export function assertProofGateReport(value: unknown): ProofGateReport {
  return assertValid(validateProofGateReport(value), "ProofGateReport");
}

export const proofGateReportSchema: ArtifactSchema<ProofGateReport> = {
  validate: validateProofGateReport,
  parse: assertProofGateReport,
};

function evaluateObligation(obligation: ProofObligation, results: ProofResult[]): ProofGateDecision {
  const acceptedResults = results.filter((entry) => obligation.requiredEvidence.includes(entry.method));
  const supportedMethods = methodsFor(acceptedResults, "supported");
  const refutedMethods = methodsFor(acceptedResults, "refuted");
  const unresolvedMethods = methodsFor(acceptedResults, "unresolved");
  const missingMethods = obligation.requiredEvidence.filter((method) =>
    !supportedMethods.includes(method) && !refutedMethods.includes(method) && !unresolvedMethods.includes(method));

  if (!obligation.required) {
    return {
      obligationId: obligation.id,
      verdict: "not-required",
      resultCount: acceptedResults.length,
      supportedMethods,
      refutedMethods,
      unresolvedMethods,
      missingMethods,
      explanation: "The obligation is advisory and does not gate completion.",
    };
  }
  if (refutedMethods.length > 0) {
    return {
      obligationId: obligation.id,
      verdict: "blocked",
      resultCount: acceptedResults.length,
      supportedMethods,
      refutedMethods,
      unresolvedMethods,
      missingMethods,
      explanation: `Counterevidence refuted the obligation through: ${refutedMethods.join(", ")}.`,
    };
  }

  const satisfied = obligation.acceptancePolicy === "all-required"
    ? obligation.requiredEvidence.every((method) => supportedMethods.includes(method))
    : obligation.acceptancePolicy === "any-supported"
      ? obligation.requiredEvidence.some((method) => supportedMethods.includes(method))
      : supportedMethods.some((method) => isAuthoritative(method, obligation.requiredEvidence));
  return {
    obligationId: obligation.id,
    verdict: satisfied ? "satisfied" : "unresolved",
    resultCount: acceptedResults.length,
    supportedMethods,
    refutedMethods,
    unresolvedMethods,
    missingMethods,
    explanation: satisfied
      ? `The ${obligation.acceptancePolicy} acceptance policy is satisfied.`
      : missingMethods.length > 0
        ? `Required proof is missing for: ${missingMethods.join(", ")}.`
        : "Available proof remains unresolved.",
  };
}

function isAuthoritative(method: ProofMethod, allowed: ProofMethod[]): boolean {
  if (method !== "model-judgment") return true;
  return allowed.every((candidate) => candidate === "model-judgment");
}

function methodsFor(results: ProofResult[], verdict: ProofVerdict): ProofMethod[] {
  return unique(results.filter((entry) => entry.verdict === verdict).map((entry) => entry.method));
}

function validateObligation(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  if (!isRecord(value.subject)) {
    issues.push({ path: `${path}.subject`, message: "Expected an object." });
  } else {
    if (!PROOF_SUBJECT_KINDS.has(String(value.subject.kind))) {
      issues.push({ path: `${path}.subject.kind`, message: "Expected a supported proof subject kind." });
    }
    requiredString(issues, value.subject.id, `${path}.subject.id`);
    if (value.subject.ref !== undefined) append(issues, validateArtifactRef(value.subject.ref).issues, `${path}.subject.ref`);
    if (value.subject.paths !== undefined) stringArray(issues, value.subject.paths, `${path}.subject.paths`);
  }
  requiredString(issues, value.assertion, `${path}.assertion`);
  enumArray(issues, value.requiredEvidence, PROOF_METHODS, `${path}.requiredEvidence`, true);
  if (!PROOF_ACCEPTANCE_POLICIES.has(String(value.acceptancePolicy))) {
    issues.push({ path: `${path}.acceptancePolicy`, message: "Expected all-required, any-authoritative, or any-supported." });
  }
  if (typeof value.required !== "boolean") issues.push({ path: `${path}.required`, message: "Expected a boolean." });
  refArray(issues, value.sourceRefs, `${path}.sourceRefs`);
}

function validateSourceState(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.baseRef, `${path}.baseRef`);
  if (!Array.isArray(value.files)) {
    issues.push({ path: `${path}.files`, message: "Expected an array." });
    return;
  }
  const seen = new Set<string>();
  value.files.forEach((file, index) => {
    const filePath = `${path}.files[${index}]`;
    if (!isRecord(file)) return void issues.push({ path: filePath, message: "Expected an object." });
    requiredString(issues, file.path, `${filePath}.path`);
    if (typeof file.path === "string") {
      if (!isSafeSourcePath(file.path)) {
        issues.push({ path: `${filePath}.path`, message: "Expected a safe repository-relative source path." });
      }
      if (seen.has(file.path)) issues.push({ path: `${filePath}.path`, message: `Duplicate path ${file.path}.` });
      seen.add(file.path);
    }
    if (file.status !== "added" && file.status !== "modified" && file.status !== "deleted") {
      issues.push({ path: `${filePath}.status`, message: "Expected added, modified, or deleted." });
    }
    for (const field of ["beforeSha256", "afterSha256"] as const) {
      if (file[field] !== undefined && (typeof file[field] !== "string" || !/^[a-f0-9]{64}$/u.test(file[field]))) {
        issues.push({ path: `${filePath}.${field}`, message: "Expected a lowercase SHA-256 digest." });
      }
    }
    if (file.status === "added" && file.afterSha256 === undefined) {
      issues.push({ path: `${filePath}.afterSha256`, message: "Added files require an after digest." });
    }
    if (file.status === "modified" && (file.beforeSha256 === undefined || file.afterSha256 === undefined)) {
      issues.push({ path: filePath, message: "Modified files require before and after digests." });
    }
    if (file.status === "deleted" && file.beforeSha256 === undefined) {
      issues.push({ path: `${filePath}.beforeSha256`, message: "Deleted files require a before digest." });
    }
    if (file.status === "added" && file.beforeSha256 !== undefined) {
      issues.push({ path: `${filePath}.beforeSha256`, message: "Added files cannot have a before digest." });
    }
    if (file.status === "deleted" && file.afterSha256 !== undefined) {
      issues.push({ path: `${filePath}.afterSha256`, message: "Deleted files cannot have an after digest." });
    }
  });
}

function isSafeSourcePath(value: string): boolean {
  return value.length > 0
    && !value.startsWith("/")
    && !value.startsWith("./")
    && !value.includes("\\")
    && !value.split("/").includes("..")
    && value !== ".rekon"
    && !value.startsWith(".rekon/");
}

function validateResult(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.obligationId, `${path}.obligationId`);
  if (!PROOF_METHODS.has(String(value.method))) issues.push({ path: `${path}.method`, message: "Expected a supported proof method." });
  if (!PROOF_VERDICTS.has(String(value.verdict))) issues.push({ path: `${path}.verdict`, message: "Expected supported, refuted, or unresolved." });
  refArray(issues, value.evidenceRefs, `${path}.evidenceRefs`);
  refArray(issues, value.counterEvidenceRefs, `${path}.counterEvidenceRefs`);
  requiredString(issues, value.explanation, `${path}.explanation`);
  if (!isRecord(value.verifier)) {
    issues.push({ path: `${path}.verifier`, message: "Expected an object." });
  } else {
    if (!PROOF_VERIFIER_KINDS.has(String(value.verifier.kind))) {
      issues.push({ path: `${path}.verifier.kind`, message: "Expected a supported verifier kind." });
    }
    requiredString(issues, value.verifier.id, `${path}.verifier.id`);
    requiredString(issues, value.verifier.version, `${path}.verifier.version`);
  }
}

function copyObligation(value: ProofObligation): ProofObligation {
  return {
    ...value,
    subject: {
      ...value.subject,
      ...(value.subject.ref ? { ref: { ...value.subject.ref } } : {}),
      ...(value.subject.paths ? { paths: unique(value.subject.paths) } : {}),
    },
    requiredEvidence: unique(value.requiredEvidence),
    sourceRefs: uniqueRefs(value.sourceRefs),
  };
}

function copyResult(value: ProofResult): ProofResult {
  return {
    ...value,
    evidenceRefs: uniqueRefs(value.evidenceRefs),
    counterEvidenceRefs: uniqueRefs(value.counterEvidenceRefs),
    verifier: { ...value.verifier },
  };
}

function resultKey(value: ProofResult): string {
  return [
    value.obligationId,
    value.method,
    value.verifier?.kind ?? "",
    value.verifier?.id ?? "",
    value.verifier?.version ?? "",
    value.verdict,
    refsKey(value.evidenceRefs),
    refsKey(value.counterEvidenceRefs),
    value.explanation,
  ].join("\0");
}

function refsKey(refs: ArtifactRef[]): string {
  return refs.map((ref) => `${ref.type}:${ref.id}:${ref.schemaVersion}`).sort().join("|");
}

function refArray(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!Array.isArray(value)) return void issues.push({ path, message: "Expected an array." });
  value.forEach((entry, index) => append(issues, validateArtifactRef(entry).issues, `${path}[${index}]`));
}

function enumArray(
  issues: ValidationIssue[],
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
  requireNonEmpty: boolean,
): void {
  if (!Array.isArray(value)) return void issues.push({ path, message: "Expected an array." });
  if (requireNonEmpty && value.length === 0) issues.push({ path, message: "Expected at least one entry." });
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || !allowed.has(entry)) {
      issues.push({ path: `${path}[${index}]`, message: "Expected a supported value." });
    } else if (seen.has(entry)) {
      issues.push({ path: `${path}[${index}]`, message: `Duplicate value ${entry}.` });
    }
    if (typeof entry === "string") seen.add(entry);
  });
}

function stringArray(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    issues.push({ path, message: "Expected an array of non-empty strings." });
  }
}

function requiredString(issues: ValidationIssue[], value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) issues.push({ path, message: "Expected a non-empty string." });
}

function append(output: ValidationIssue[], issues: ValidationIssue[], prefix: string): void {
  for (const issue of issues) output.push({ ...issue, path: `${prefix}${issue.path === "$" ? "" : issue.path.slice(1)}` });
}

function assertValid<T>(validation: ValidationResult<T>, name: string): T {
  if (validation.ok) return validation.value;
  throw new TypeError(`${name} validation failed: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
}

function result<T>(value: T, issues: ValidationIssue[]): ValidationResult<T> {
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value, issues: [] };
}

function unique<T extends string>(values: T[]): T[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  return dedupe(refs, (ref) => `${ref.type}:${ref.id}`)
    .map((ref) => ({ ...ref }))
    .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

function dedupe<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const identity = key(value);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

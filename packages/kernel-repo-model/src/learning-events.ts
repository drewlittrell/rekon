import {
  digestJson,
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type SourceStateBinding,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
  validateArtifactRef,
  validateSourceStateBinding,
} from "@rekon/kernel-artifacts";

export const CONTEXT_LEARNING_SCHEMA_VERSION = "0.1.0" as const;

export type ContextTaskIdentity = {
  fingerprint: string;
  text: string;
  paths: string[];
};

export type ContextDeliveryChannel = "cli" | "mcp";
export type ContextUsageClaimDisposition = "read" | "applied" | "ignored";

export type ContextUsageClaim = {
  itemId: string;
  disposition: ContextUsageClaimDisposition;
  assertedAt: string;
  assertedBy?: string;
  evidenceRefs: ArtifactRef[];
};

export type ContextUsageEvent = {
  header: ArtifactHeader;
  task: ContextTaskIdentity;
  contextReportRef: ArtifactRef;
  taskPactRef?: ArtifactRef;
  delivery: {
    channel: ContextDeliveryChannel;
    deliveredAt: string;
    profile: "compact" | "standard" | "deep";
    projectionDigest: string;
    itemIds: string[];
    sourceSpanKeys: string[];
    constraintDigests: string[];
    checkDigests: string[];
    truncated: boolean;
  };
  claims: ContextUsageClaim[];
};

export type OutcomeEventPhase =
  | "validation-attempt"
  | "proof-gated-refresh"
  | "runtime-follow-up"
  | "external-follow-up";

export type OutcomeEventStatus =
  | "blocked"
  | "incomplete"
  | "verified"
  | "accepted"
  | "regressed"
  | "unknown";

export type OutcomeGroundingClass =
  | "repository-proof"
  | "runtime-observation"
  | "external-outcome"
  | "self-report";

export type OutcomeEvent = {
  header: ArtifactHeader;
  task: ContextTaskIdentity;
  phase: OutcomeEventPhase;
  status: OutcomeEventStatus;
  grounding: OutcomeGroundingClass;
  observationKey?: string;
  contextUsageRefs: ArtifactRef[];
  taskPactRef?: ArtifactRef;
  sourceState?: SourceStateBinding;
  proofGateRef?: ArtifactRef;
  verificationRefs: ArtifactRef[];
  runtimeObservationRefs: ArtifactRef[];
  externalEvidenceRefs: ArtifactRef[];
  summary: {
    requiredObligations: number;
    satisfied: number;
    blocked: number;
    unresolved: number;
    contractViolations: number;
    reworkAttempt: number;
  };
  notes: string[];
};

export type ContextOutcomeAssociationStatus =
  | "unobserved"
  | "associated"
  | "suggestive"
  | "corroborated"
  | "refuted";

export type ContextOutcomeEvaluationSubject = {
  kind: "context-item" | "memory-entry";
  id: string;
  ref?: ArtifactRef;
};

export type ContextOutcomeEvaluationItem = {
  subject: ContextOutcomeEvaluationSubject;
  status: ContextOutcomeAssociationStatus;
  contextUsageRefs: ArtifactRef[];
  outcomeRefs: ArtifactRef[];
  supportingRootKeys: string[];
  refutingRootKeys: string[];
  reasons: string[];
};

export type ContextOutcomeEvaluationReport = {
  header: ArtifactHeader;
  policyVersion: string;
  items: ContextOutcomeEvaluationItem[];
  lineage: {
    complete: boolean;
    sharedRootKeys: string[];
    issueCodes: string[];
  };
  summary: {
    total: number;
    unobserved: number;
    associated: number;
    suggestive: number;
    corroborated: number;
    refuted: number;
  };
};

const DELIVERY_CHANNELS = new Set<string>(["cli", "mcp"]);
const CONTEXT_PROFILES = new Set<string>(["compact", "standard", "deep"]);
const CLAIM_DISPOSITIONS = new Set<string>(["read", "applied", "ignored"]);
const OUTCOME_PHASES = new Set<string>([
  "validation-attempt",
  "proof-gated-refresh",
  "runtime-follow-up",
  "external-follow-up",
]);
const OUTCOME_STATUSES = new Set<string>([
  "blocked",
  "incomplete",
  "verified",
  "accepted",
  "regressed",
  "unknown",
]);
const OUTCOME_GROUNDING_CLASSES = new Set<string>([
  "repository-proof",
  "runtime-observation",
  "external-outcome",
  "self-report",
]);
const ASSOCIATION_STATUSES = new Set<string>([
  "unobserved",
  "associated",
  "suggestive",
  "corroborated",
  "refuted",
]);
const EVALUATION_SUBJECT_KINDS = new Set<string>(["context-item", "memory-entry"]);

export function createContextTaskIdentity(text: string, paths: string[]): ContextTaskIdentity {
  const normalizedText = text.trim();
  const normalizedPaths = uniqueStrings(paths);
  return {
    fingerprint: digestJson({ text: normalizedText, paths: normalizedPaths }),
    text: normalizedText,
    paths: normalizedPaths,
  };
}

export function createContextUsageEvent(input: ContextUsageEvent): ContextUsageEvent {
  return assertContextUsageEvent({
    ...input,
    task: createContextTaskIdentity(input.task.text, input.task.paths),
    delivery: {
      ...input.delivery,
      itemIds: uniqueStrings(input.delivery.itemIds),
      sourceSpanKeys: uniqueStrings(input.delivery.sourceSpanKeys),
      constraintDigests: uniqueStrings(input.delivery.constraintDigests),
      checkDigests: uniqueStrings(input.delivery.checkDigests),
    },
    claims: dedupeClaims(input.claims),
  });
}

export function createOutcomeEvent(input: OutcomeEvent): OutcomeEvent {
  return assertOutcomeEvent({
    ...input,
    task: createContextTaskIdentity(input.task.text, input.task.paths),
    contextUsageRefs: dedupeRefs(input.contextUsageRefs),
    verificationRefs: dedupeRefs(input.verificationRefs),
    runtimeObservationRefs: dedupeRefs(input.runtimeObservationRefs),
    externalEvidenceRefs: dedupeRefs(input.externalEvidenceRefs),
    notes: uniqueStrings(input.notes),
  });
}

export function createContextOutcomeEvaluationReport(
  input: Omit<ContextOutcomeEvaluationReport, "summary"> & {
    summary?: ContextOutcomeEvaluationReport["summary"];
  },
): ContextOutcomeEvaluationReport {
  const items = [...input.items]
    .map((item) => ({
      ...item,
      contextUsageRefs: dedupeRefs(item.contextUsageRefs),
      outcomeRefs: dedupeRefs(item.outcomeRefs),
      supportingRootKeys: uniqueStrings(item.supportingRootKeys),
      refutingRootKeys: uniqueStrings(item.refutingRootKeys),
      reasons: uniqueStrings(item.reasons),
    }))
    .sort((left, right) => subjectKey(left.subject).localeCompare(subjectKey(right.subject)));
  const summary = {
    total: items.length,
    unobserved: items.filter((item) => item.status === "unobserved").length,
    associated: items.filter((item) => item.status === "associated").length,
    suggestive: items.filter((item) => item.status === "suggestive").length,
    corroborated: items.filter((item) => item.status === "corroborated").length,
    refuted: items.filter((item) => item.status === "refuted").length,
  };
  return assertContextOutcomeEvaluationReport({
    ...input,
    items,
    lineage: {
      complete: input.lineage.complete,
      sharedRootKeys: uniqueStrings(input.lineage.sharedRootKeys),
      issueCodes: uniqueStrings(input.lineage.issueCodes),
    },
    summary,
  });
}

export function validateContextUsageEvent(value: unknown): ValidationResult<ContextUsageEvent> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidObject();
  append(issues, validateArtifactHeader(value.header).issues, "$.header");
  validateArtifactType(value.header, "ContextUsageEvent", issues);
  validateTask(value.task, "$.task", issues);
  append(issues, validateArtifactRef(value.contextReportRef).issues, "$.contextReportRef");
  if (value.taskPactRef !== undefined) append(issues, validateArtifactRef(value.taskPactRef).issues, "$.taskPactRef");
  validateDelivery(value.delivery, "$.delivery", issues);
  if (!Array.isArray(value.claims)) {
    issues.push({ path: "$.claims", message: "Expected an array." });
  } else {
    value.claims.forEach((claim, index) => validateClaim(claim, `$.claims[${index}]`, issues));
  }
  return result(value as ContextUsageEvent, issues);
}

export function validateOutcomeEvent(value: unknown): ValidationResult<OutcomeEvent> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidObject();
  append(issues, validateArtifactHeader(value.header).issues, "$.header");
  validateArtifactType(value.header, "OutcomeEvent", issues);
  validateTask(value.task, "$.task", issues);
  if (!OUTCOME_PHASES.has(String(value.phase))) issues.push({ path: "$.phase", message: "Expected a supported outcome phase." });
  if (!OUTCOME_STATUSES.has(String(value.status))) issues.push({ path: "$.status", message: "Expected a supported outcome status." });
  if (!OUTCOME_GROUNDING_CLASSES.has(String(value.grounding))) issues.push({ path: "$.grounding", message: "Expected a supported grounding class." });
  optionalString(value.observationKey, "$.observationKey", issues);
  validateRefArray(value.contextUsageRefs, "$.contextUsageRefs", issues);
  if (value.taskPactRef !== undefined) append(issues, validateArtifactRef(value.taskPactRef).issues, "$.taskPactRef");
  if (value.sourceState !== undefined) append(issues, validateSourceStateBinding(value.sourceState).issues, "$.sourceState");
  if (value.proofGateRef !== undefined) append(issues, validateArtifactRef(value.proofGateRef).issues, "$.proofGateRef");
  validateRefArray(value.verificationRefs, "$.verificationRefs", issues);
  validateRefArray(value.runtimeObservationRefs, "$.runtimeObservationRefs", issues);
  validateRefArray(value.externalEvidenceRefs, "$.externalEvidenceRefs", issues);
  validateOutcomeSummary(value.summary, "$.summary", issues);
  stringArray(value.notes, "$.notes", issues);
  return result(value as OutcomeEvent, issues);
}

export function validateContextOutcomeEvaluationReport(
  value: unknown,
): ValidationResult<ContextOutcomeEvaluationReport> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidObject();
  append(issues, validateArtifactHeader(value.header).issues, "$.header");
  validateArtifactType(value.header, "ContextOutcomeEvaluationReport", issues);
  requiredString(value.policyVersion, "$.policyVersion", issues);
  const items: ContextOutcomeEvaluationItem[] = [];
  if (!Array.isArray(value.items)) {
    issues.push({ path: "$.items", message: "Expected an array." });
  } else {
    value.items.forEach((item, index) => {
      validateEvaluationItem(item, `$.items[${index}]`, issues);
      if (isRecord(item)) items.push(item as ContextOutcomeEvaluationItem);
    });
  }
  validateLineageSummary(value.lineage, "$.lineage", issues);
  validateEvaluationSummary(value.summary, items, "$.summary", issues);
  return result(value as ContextOutcomeEvaluationReport, issues);
}

export function assertContextUsageEvent(value: unknown): ContextUsageEvent {
  return assertValid(validateContextUsageEvent(value), "ContextUsageEvent");
}

export function assertOutcomeEvent(value: unknown): OutcomeEvent {
  return assertValid(validateOutcomeEvent(value), "OutcomeEvent");
}

export function assertContextOutcomeEvaluationReport(value: unknown): ContextOutcomeEvaluationReport {
  return assertValid(validateContextOutcomeEvaluationReport(value), "ContextOutcomeEvaluationReport");
}

export const contextUsageEventSchema: ArtifactSchema<ContextUsageEvent> = {
  validate: validateContextUsageEvent,
  parse: assertContextUsageEvent,
};

export const outcomeEventSchema: ArtifactSchema<OutcomeEvent> = {
  validate: validateOutcomeEvent,
  parse: assertOutcomeEvent,
};

export const contextOutcomeEvaluationReportSchema: ArtifactSchema<ContextOutcomeEvaluationReport> = {
  validate: validateContextOutcomeEvaluationReport,
  parse: assertContextOutcomeEvaluationReport,
};

function validateTask(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  requiredString(value.fingerprint, `${path}.fingerprint`, issues);
  requiredString(value.text, `${path}.text`, issues);
  stringArray(value.paths, `${path}.paths`, issues);
  if (typeof value.text === "string" && Array.isArray(value.paths)) {
    const expected = createContextTaskIdentity(value.text, value.paths.filter((entry): entry is string => typeof entry === "string"));
    if (value.fingerprint !== expected.fingerprint) {
      issues.push({ path: `${path}.fingerprint`, message: "Expected the deterministic task fingerprint." });
    }
    if (JSON.stringify(value.paths) !== JSON.stringify(expected.paths)) {
      issues.push({ path: `${path}.paths`, message: "Expected sorted unique task paths." });
    }
  }
}

function validateDelivery(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  if (!DELIVERY_CHANNELS.has(String(value.channel))) issues.push({ path: `${path}.channel`, message: "Expected cli or mcp." });
  isoTimestamp(value.deliveredAt, `${path}.deliveredAt`, issues);
  if (!CONTEXT_PROFILES.has(String(value.profile))) issues.push({ path: `${path}.profile`, message: "Expected compact, standard, or deep." });
  requiredString(value.projectionDigest, `${path}.projectionDigest`, issues);
  stringArray(value.itemIds, `${path}.itemIds`, issues);
  stringArray(value.sourceSpanKeys, `${path}.sourceSpanKeys`, issues);
  stringArray(value.constraintDigests, `${path}.constraintDigests`, issues);
  stringArray(value.checkDigests, `${path}.checkDigests`, issues);
  if (typeof value.truncated !== "boolean") issues.push({ path: `${path}.truncated`, message: "Expected a boolean." });
}

function validateClaim(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  requiredString(value.itemId, `${path}.itemId`, issues);
  if (!CLAIM_DISPOSITIONS.has(String(value.disposition))) issues.push({ path: `${path}.disposition`, message: "Expected read, applied, or ignored." });
  isoTimestamp(value.assertedAt, `${path}.assertedAt`, issues);
  optionalString(value.assertedBy, `${path}.assertedBy`, issues);
  validateRefArray(value.evidenceRefs, `${path}.evidenceRefs`, issues);
}

function validateOutcomeSummary(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  for (const field of ["requiredObligations", "satisfied", "blocked", "unresolved", "contractViolations", "reworkAttempt"]) {
    nonNegativeInteger(value[field], `${path}.${field}`, issues);
  }
}

function validateEvaluationItem(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  if (!isRecord(value.subject)) {
    issues.push({ path: `${path}.subject`, message: "Expected an object." });
  } else {
    if (!EVALUATION_SUBJECT_KINDS.has(String(value.subject.kind))) issues.push({ path: `${path}.subject.kind`, message: "Expected context-item or memory-entry." });
    requiredString(value.subject.id, `${path}.subject.id`, issues);
    if (value.subject.ref !== undefined) append(issues, validateArtifactRef(value.subject.ref).issues, `${path}.subject.ref`);
  }
  if (!ASSOCIATION_STATUSES.has(String(value.status))) issues.push({ path: `${path}.status`, message: "Expected a supported association status." });
  validateRefArray(value.contextUsageRefs, `${path}.contextUsageRefs`, issues);
  validateRefArray(value.outcomeRefs, `${path}.outcomeRefs`, issues);
  stringArray(value.supportingRootKeys, `${path}.supportingRootKeys`, issues);
  stringArray(value.refutingRootKeys, `${path}.refutingRootKeys`, issues);
  stringArray(value.reasons, `${path}.reasons`, issues);
}

function validateLineageSummary(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  if (typeof value.complete !== "boolean") issues.push({ path: `${path}.complete`, message: "Expected a boolean." });
  stringArray(value.sharedRootKeys, `${path}.sharedRootKeys`, issues);
  stringArray(value.issueCodes, `${path}.issueCodes`, issues);
}

function validateEvaluationSummary(
  value: unknown,
  items: ContextOutcomeEvaluationItem[],
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ path, message: "Expected an object." });
    return;
  }
  const expected: Record<string, number> = {
    total: items.length,
    unobserved: items.filter((item) => item.status === "unobserved").length,
    associated: items.filter((item) => item.status === "associated").length,
    suggestive: items.filter((item) => item.status === "suggestive").length,
    corroborated: items.filter((item) => item.status === "corroborated").length,
    refuted: items.filter((item) => item.status === "refuted").length,
  };
  for (const [field, count] of Object.entries(expected)) {
    if (value[field] !== count) issues.push({ path: `${path}.${field}`, message: `Expected ${count} (recomputed).` });
  }
}

function validateArtifactType(value: unknown, expected: string, issues: ValidationIssue[]): void {
  if (isRecord(value) && value.artifactType !== expected) {
    issues.push({ path: "$.header.artifactType", message: `Expected ${expected}.` });
  }
}

function validateRefArray(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  value.forEach((ref, index) => append(issues, validateArtifactRef(ref).issues, `${path}[${index}]`));
}

function requiredString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.trim().length === 0) issues.push({ path, message: "Expected a non-empty string." });
}

function optionalString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value !== undefined && (typeof value !== "string" || value.trim().length === 0)) issues.push({ path, message: "Expected a non-empty string when present." });
}

function isoTimestamp(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) issues.push({ path, message: "Expected an ISO timestamp." });
}

function stringArray(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) issues.push({ path, message: "Expected an array of strings." });
}

function nonNegativeInteger(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Number.isInteger(value) || Number(value) < 0) issues.push({ path, message: "Expected a non-negative integer." });
}

function append(target: ValidationIssue[], nested: ValidationIssue[], prefix: string): void {
  for (const issue of nested) {
    target.push({
      path: issue.path === "$" ? prefix : `${prefix}${issue.path.slice(1)}`,
      message: issue.message,
    });
  }
}

function invalidObject<T>(): ValidationResult<T> {
  return { ok: false, issues: [{ path: "$", message: "Expected an object." }] };
}

function result<T>(value: T, issues: ValidationIssue[]): ValidationResult<T> {
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value, issues: [] };
}

function assertValid<T>(value: ValidationResult<T>, label: string): T {
  if (value.ok) return value.value;
  throw new TypeError(`${label} validation failed: ${value.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function dedupeRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const byKey = new Map<string, ArtifactRef>();
  for (const ref of refs) {
    const key = `${ref.type}:${ref.id}:${ref.schemaVersion}`;
    const existing = byKey.get(key);
    if (!existing || (!existing.digest && ref.digest)) byKey.set(key, ref);
  }
  return [...byKey.values()].sort((left, right) =>
    `${left.type}:${left.id}:${left.schemaVersion}`.localeCompare(`${right.type}:${right.id}:${right.schemaVersion}`));
}

function dedupeClaims(claims: ContextUsageClaim[]): ContextUsageClaim[] {
  const byKey = new Map<string, ContextUsageClaim>();
  for (const claim of claims) {
    const key = `${claim.itemId}:${claim.disposition}:${claim.assertedAt}:${claim.assertedBy ?? ""}`;
    if (!byKey.has(key)) byKey.set(key, { ...claim, evidenceRefs: dedupeRefs(claim.evidenceRefs) });
  }
  return [...byKey.values()].sort((left, right) =>
    `${left.itemId}:${left.disposition}:${left.assertedAt}`.localeCompare(`${right.itemId}:${right.disposition}:${right.assertedAt}`));
}

function subjectKey(subject: ContextOutcomeEvaluationSubject): string {
  return `${subject.kind}:${subject.id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import {
  type ArtifactHeader,
  type ArtifactRef,
  type ArtifactSchema,
  type ValidationIssue,
  type ValidationResult,
  validateArtifactHeader,
  validateArtifactRef,
} from "@rekon/kernel-artifacts";
import type { ProofAcceptancePolicy, ProofMethod } from "./proof-gates.js";

export const REPOSITORY_CONTRACT_SOURCE_VERSION = "1.0.0" as const;

export type ContractAuthority =
  | "observed"
  | "inferred"
  | "corroborated"
  | "adopted";

export type ContractCriticality = "critical" | "high" | "normal";

export type ContractClauseSource = {
  id: string;
  statement: string;
  rationale?: string;
};

export type SystemContractSource = {
  id: string;
  systemId: string;
  name?: string;
  scope: {
    paths: string[];
  };
  purpose: string;
  userOutcomes?: string[];
  invariants: ContractClauseSource[];
  prohibitedChanges?: ContractClauseSource[];
  requiredContextPaths?: string[];
  requiredChecks?: string[];
};

export type FlowContractStageSource = {
  id: string;
  label?: string;
  systemId?: string;
  responsibilities?: string[];
  capability?: {
    verb: string;
    noun: string;
    domain?: string;
  };
  paths?: string[];
};

export type FlowContractHandoffSource = {
  id: string;
  fromStageId: string;
  toStageId: string;
  payload?: {
    schema?: string;
    requiredFields?: string[];
  };
  guarantees?: string[];
  carriedInvariantIds?: string[];
  ordering?: string;
  failureSemantics?: string;
  verification?: {
    acceptedMethods: ProofMethod[];
    acceptancePolicy?: ProofAcceptancePolicy;
    requiredChecks?: string[];
    /**
     * Repository-relative paths that must participate in the current change
     * before this handoff can be accepted. These normally identify focused
     * regression tests. At least one declared path must be added or modified
     * relative to the validation baseline, and a declared test check must still
     * pass.
     */
    requiredEvidencePaths?: string[];
  };
};

export type FlowContractSource = {
  id: string;
  name: string;
  criticality: ContractCriticality;
  purpose: string;
  userOutcomes: string[];
  entryConditions?: string[];
  completionConditions: string[];
  systems?: string[];
  paths?: string[];
  invariants: ContractClauseSource[];
  stages: FlowContractStageSource[];
  handoffs: FlowContractHandoffSource[];
  requiredChecks?: string[];
};

/**
 * Version-controlled repository law. These documents are inputs to Rekon;
 * generated artifacts under `.rekon/` never replace them as canonical truth.
 */
export type RepositoryContractSourceDocument = {
  version: typeof REPOSITORY_CONTRACT_SOURCE_VERSION;
  sourceId: string;
  systems?: SystemContractSource[];
  flows?: FlowContractSource[];
};

export type ContractArtifactSource = {
  path?: string;
  digest?: string;
  sourceId?: string;
  candidateRef?: ArtifactRef;
  judgmentRef?: ArtifactRef;
};

export type ContractClause = ContractClauseSource & {
  authority: ContractAuthority;
  confidence: number;
  sourceRefs: ContractArtifactSource[];
  evidenceRefs: ArtifactRef[];
};

export type SystemContract = {
  header: ArtifactHeader;
  contractId: string;
  authority: ContractAuthority;
  confidence: number;
  source: ContractArtifactSource;
  system: {
    id: string;
    name?: string;
    paths: string[];
  };
  purpose: string;
  userOutcomes: string[];
  invariants: ContractClause[];
  prohibitedChanges: ContractClause[];
  requiredContextPaths: string[];
  requiredChecks: string[];
};

export type FlowContractStage = FlowContractStageSource & {
  evidenceRefs: ArtifactRef[];
};

export type FlowContractHandoff = FlowContractHandoffSource & {
  evidenceRefs: ArtifactRef[];
};

export type FlowContract = {
  header: ArtifactHeader;
  contractId: string;
  authority: ContractAuthority;
  confidence: number;
  source: ContractArtifactSource;
  name: string;
  criticality: ContractCriticality;
  purpose: string;
  userOutcomes: string[];
  entryConditions: string[];
  completionConditions: string[];
  systems: string[];
  paths: string[];
  invariants: ContractClause[];
  stages: FlowContractStage[];
  handoffs: FlowContractHandoff[];
  requiredChecks: string[];
};

export type EffectiveContractRegistryEntry = {
  contractType: "SystemContract" | "CapabilityContract" | "HandoffContract" | "FlowContract";
  contractId: string;
  authority: ContractAuthority;
  confidence: number;
  ref: ArtifactRef;
  systems: string[];
  paths: string[];
  flowIds: string[];
  clauseIds: string[];
};

export type EffectiveContractRegistry = {
  header: ArtifactHeader;
  entries: EffectiveContractRegistryEntry[];
  summary: {
    total: number;
    byAuthority: Record<ContractAuthority, number>;
    byType: Record<EffectiveContractRegistryEntry["contractType"], number>;
  };
};

const AUTHORITIES = new Set<ContractAuthority>([
  "observed",
  "inferred",
  "corroborated",
  "adopted",
]);
const CRITICALITIES = new Set<ContractCriticality>(["critical", "high", "normal"]);
const PROOF_METHODS = new Set<ProofMethod>(["static", "test", "runtime", "model-judgment"]);
const PROOF_ACCEPTANCE_POLICIES = new Set<ProofAcceptancePolicy>([
  "all-required",
  "any-authoritative",
  "any-supported",
]);
const CONTRACT_TYPES = new Set<EffectiveContractRegistryEntry["contractType"]>([
  "SystemContract",
  "CapabilityContract",
  "HandoffContract",
  "FlowContract",
]);

export function validateRepositoryContractSourceDocument(
  value: unknown,
): ValidationResult<RepositoryContractSourceDocument> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidRoot();
  if (value.version !== REPOSITORY_CONTRACT_SOURCE_VERSION) {
    issues.push({ path: "$.version", message: `Expected ${REPOSITORY_CONTRACT_SOURCE_VERSION}.` });
  }
  requiredString(issues, value.sourceId, "$.sourceId");
  validateOptionalUniqueArray(issues, value.systems, "$.systems", validateSystemSource);
  validateOptionalUniqueArray(issues, value.flows, "$.flows", validateFlowSource);
  if (!Array.isArray(value.systems) && !Array.isArray(value.flows)) {
    issues.push({ path: "$", message: "Expected at least one systems or flows array." });
  }
  return finish(value as RepositoryContractSourceDocument, issues);
}

export function assertRepositoryContractSourceDocument(value: unknown): RepositoryContractSourceDocument {
  return assertValid(validateRepositoryContractSourceDocument(value), "RepositoryContractSourceDocument");
}

export const repositoryContractSourceDocumentSchema: ArtifactSchema<RepositoryContractSourceDocument> = {
  validate: validateRepositoryContractSourceDocument,
  parse: assertRepositoryContractSourceDocument,
};

export function createSystemContract(input: SystemContract): SystemContract {
  const normalized: SystemContract = {
    ...input,
    system: {
      ...input.system,
      paths: uniqueSorted(input.system.paths),
    },
    userOutcomes: unique(input.userOutcomes),
    invariants: normalizeClauses(input.invariants),
    prohibitedChanges: normalizeClauses(input.prohibitedChanges),
    requiredContextPaths: uniqueSorted(input.requiredContextPaths),
    requiredChecks: unique(input.requiredChecks),
  };
  return assertSystemContract(normalized);
}

export function validateSystemContract(value: unknown): ValidationResult<SystemContract> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidRoot();
  validateTypedHeader(issues, value.header, "SystemContract");
  requiredString(issues, value.contractId, "$.contractId");
  validateAuthorityAndConfidence(issues, value);
  validateContractArtifactSource(issues, value.source, "$.source");
  if (!isRecord(value.system)) {
    issues.push({ path: "$.system", message: "Expected an object." });
  } else {
    requiredString(issues, value.system.id, "$.system.id");
    optionalString(issues, value.system.name, "$.system.name");
    stringArray(issues, value.system.paths, "$.system.paths", true, true);
  }
  requiredString(issues, value.purpose, "$.purpose");
  stringArray(issues, value.userOutcomes, "$.userOutcomes");
  validateUniqueArray(issues, value.invariants, "$.invariants", validateClause, true);
  validateUniqueArray(issues, value.prohibitedChanges, "$.prohibitedChanges", validateClause);
  stringArray(issues, value.requiredContextPaths, "$.requiredContextPaths", false, true);
  stringArray(issues, value.requiredChecks, "$.requiredChecks");
  return finish(value as SystemContract, issues);
}

export function assertSystemContract(value: unknown): SystemContract {
  return assertValid(validateSystemContract(value), "SystemContract");
}

export const systemContractSchema: ArtifactSchema<SystemContract> = {
  validate: validateSystemContract,
  parse: assertSystemContract,
};

export function createFlowContract(input: FlowContract): FlowContract {
  const normalized: FlowContract = {
    ...input,
    userOutcomes: unique(input.userOutcomes),
    entryConditions: unique(input.entryConditions),
    completionConditions: unique(input.completionConditions),
    systems: uniqueSorted(input.systems),
    paths: uniqueSorted(input.paths),
    invariants: normalizeClauses(input.invariants),
    stages: dedupeById(input.stages).map((stage) => ({
      ...stage,
      ...(stage.responsibilities
        ? { responsibilities: unique(stage.responsibilities) }
        : {}),
      paths: stage.paths ? uniqueSorted(stage.paths) : undefined,
      evidenceRefs: uniqueRefs(stage.evidenceRefs),
    })),
    handoffs: dedupeById(input.handoffs).map((handoff) => ({
      ...handoff,
      guarantees: handoff.guarantees ? unique(handoff.guarantees) : undefined,
      carriedInvariantIds: handoff.carriedInvariantIds ? unique(handoff.carriedInvariantIds) : undefined,
      payload: handoff.payload
        ? { ...handoff.payload, requiredFields: handoff.payload.requiredFields ? unique(handoff.payload.requiredFields) : undefined }
        : undefined,
      verification: handoff.verification
        ? {
          ...handoff.verification,
          acceptedMethods: [...new Set(handoff.verification.acceptedMethods)],
          requiredChecks: handoff.verification.requiredChecks
            ? unique(handoff.verification.requiredChecks)
            : undefined,
          ...(handoff.verification.requiredEvidencePaths
            ? {
              requiredEvidencePaths: uniqueSorted(
                handoff.verification.requiredEvidencePaths,
              ),
            }
            : {}),
        }
        : undefined,
      evidenceRefs: uniqueRefs(handoff.evidenceRefs),
    })),
    requiredChecks: unique(input.requiredChecks),
  };
  return assertFlowContract(normalized);
}

export function validateFlowContract(value: unknown): ValidationResult<FlowContract> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidRoot();
  validateTypedHeader(issues, value.header, "FlowContract");
  requiredString(issues, value.contractId, "$.contractId");
  validateAuthorityAndConfidence(issues, value);
  validateContractArtifactSource(issues, value.source, "$.source");
  requiredString(issues, value.name, "$.name");
  if (typeof value.criticality !== "string" || !CRITICALITIES.has(value.criticality as ContractCriticality)) {
    issues.push({ path: "$.criticality", message: "Expected critical, high, or normal." });
  }
  requiredString(issues, value.purpose, "$.purpose");
  stringArray(issues, value.userOutcomes, "$.userOutcomes", true);
  stringArray(issues, value.entryConditions, "$.entryConditions");
  stringArray(issues, value.completionConditions, "$.completionConditions", true);
  stringArray(issues, value.systems, "$.systems");
  stringArray(issues, value.paths, "$.paths", false, true);
  validateUniqueArray(issues, value.invariants, "$.invariants", validateClause, true);
  validateUniqueArray(issues, value.stages, "$.stages", validateStage, true);
  validateUniqueArray(issues, value.handoffs, "$.handoffs", validateHandoff);
  stringArray(issues, value.requiredChecks, "$.requiredChecks");
  validateFlowReferences(issues, value);
  return finish(value as FlowContract, issues);
}

export function assertFlowContract(value: unknown): FlowContract {
  return assertValid(validateFlowContract(value), "FlowContract");
}

export const flowContractSchema: ArtifactSchema<FlowContract> = {
  validate: validateFlowContract,
  parse: assertFlowContract,
};

export function createEffectiveContractRegistry(
  input: Omit<EffectiveContractRegistry, "summary"> & { summary?: EffectiveContractRegistry["summary"] },
): EffectiveContractRegistry {
  const entries = dedupeRegistryEntries(input.entries).sort((left, right) =>
    `${left.contractType}\0${left.contractId}`.localeCompare(`${right.contractType}\0${right.contractId}`),
  );
  const registry: EffectiveContractRegistry = {
    header: input.header,
    entries,
    summary: summarizeRegistry(entries),
  };
  return assertEffectiveContractRegistry(registry);
}

export function validateEffectiveContractRegistry(value: unknown): ValidationResult<EffectiveContractRegistry> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return invalidRoot();
  validateTypedHeader(issues, value.header, "EffectiveContractRegistry");
  validateUniqueArray(issues, value.entries, "$.entries", validateRegistryEntry, false, (entry) =>
    isRecord(entry) ? `${String(entry.contractType)}:${String(entry.contractId)}` : "",
  );
  if (!isRecord(value.summary)) {
    issues.push({ path: "$.summary", message: "Expected an object." });
  } else if (Array.isArray(value.entries)) {
    const expected = summarizeRegistry(value.entries.filter(isRecord) as unknown as EffectiveContractRegistryEntry[]);
    if (value.summary.total !== expected.total) {
      issues.push({ path: "$.summary.total", message: `Expected ${expected.total}.` });
    }
    for (const authority of AUTHORITIES) {
      if (!isRecord(value.summary.byAuthority) || value.summary.byAuthority[authority] !== expected.byAuthority[authority]) {
        issues.push({ path: `$.summary.byAuthority.${authority}`, message: `Expected ${expected.byAuthority[authority]}.` });
      }
    }
    for (const type of CONTRACT_TYPES) {
      if (!isRecord(value.summary.byType) || value.summary.byType[type] !== expected.byType[type]) {
        issues.push({ path: `$.summary.byType.${type}`, message: `Expected ${expected.byType[type]}.` });
      }
    }
  }
  return finish(value as EffectiveContractRegistry, issues);
}

export function assertEffectiveContractRegistry(value: unknown): EffectiveContractRegistry {
  return assertValid(validateEffectiveContractRegistry(value), "EffectiveContractRegistry");
}

export const effectiveContractRegistrySchema: ArtifactSchema<EffectiveContractRegistry> = {
  validate: validateEffectiveContractRegistry,
  parse: assertEffectiveContractRegistry,
};

function validateSystemSource(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  requiredString(issues, value.systemId, `${path}.systemId`);
  optionalString(issues, value.name, `${path}.name`);
  if (!isRecord(value.scope)) issues.push({ path: `${path}.scope`, message: "Expected an object." });
  else stringArray(issues, value.scope.paths, `${path}.scope.paths`, true, true);
  requiredString(issues, value.purpose, `${path}.purpose`);
  optionalStringArray(issues, value.userOutcomes, `${path}.userOutcomes`);
  validateUniqueArray(issues, value.invariants, `${path}.invariants`, validateSourceClause, true);
  validateOptionalUniqueArray(issues, value.prohibitedChanges, `${path}.prohibitedChanges`, validateSourceClause);
  optionalStringArray(issues, value.requiredContextPaths, `${path}.requiredContextPaths`, true);
  optionalStringArray(issues, value.requiredChecks, `${path}.requiredChecks`);
}

function validateFlowSource(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  requiredString(issues, value.name, `${path}.name`);
  if (typeof value.criticality !== "string" || !CRITICALITIES.has(value.criticality as ContractCriticality)) {
    issues.push({ path: `${path}.criticality`, message: "Expected critical, high, or normal." });
  }
  requiredString(issues, value.purpose, `${path}.purpose`);
  stringArray(issues, value.userOutcomes, `${path}.userOutcomes`, true);
  optionalStringArray(issues, value.entryConditions, `${path}.entryConditions`);
  stringArray(issues, value.completionConditions, `${path}.completionConditions`, true);
  optionalStringArray(issues, value.systems, `${path}.systems`);
  optionalStringArray(issues, value.paths, `${path}.paths`, true);
  validateUniqueArray(issues, value.invariants, `${path}.invariants`, validateSourceClause, true);
  validateUniqueArray(issues, value.stages, `${path}.stages`, validateSourceStage, true);
  validateUniqueArray(issues, value.handoffs, `${path}.handoffs`, validateSourceHandoff);
  optionalStringArray(issues, value.requiredChecks, `${path}.requiredChecks`);
  validateFlowReferences(issues, value, path);
}

function validateSourceClause(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  requiredString(issues, value.statement, `${path}.statement`);
  optionalString(issues, value.rationale, `${path}.rationale`);
}

function validateSourceStage(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  optionalString(issues, value.label, `${path}.label`);
  optionalString(issues, value.systemId, `${path}.systemId`);
  optionalStringArray(issues, value.responsibilities, `${path}.responsibilities`);
  optionalStringArray(issues, value.paths, `${path}.paths`, true);
  if (
    Array.isArray(value.responsibilities)
    && value.responsibilities.length > 0
    && (!Array.isArray(value.paths) || value.paths.length === 0)
  ) {
    issues.push({
      path: `${path}.paths`,
      message: "Expected at least one path when stage responsibilities are declared.",
    });
  }
  if (value.capability !== undefined) validateCapability(issues, value.capability, `${path}.capability`);
}

function validateSourceHandoff(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.id, `${path}.id`);
  requiredString(issues, value.fromStageId, `${path}.fromStageId`);
  requiredString(issues, value.toStageId, `${path}.toStageId`);
  validateHandoffSemantics(issues, value, path);
}

function validateClause(issues: ValidationIssue[], value: unknown, path: string): void {
  validateSourceClause(issues, value, path);
  if (!isRecord(value)) return;
  validateAuthorityAndConfidence(issues, value, path);
  if (!Array.isArray(value.sourceRefs) || value.sourceRefs.length === 0) {
    issues.push({ path: `${path}.sourceRefs`, message: "Expected at least one contract source reference." });
  } else {
    value.sourceRefs.forEach((source, index) => validateContractArtifactSource(issues, source, `${path}.sourceRefs[${index}]`));
  }
  artifactRefArray(issues, value.evidenceRefs, `${path}.evidenceRefs`);
}

function validateStage(issues: ValidationIssue[], value: unknown, path: string): void {
  validateSourceStage(issues, value, path);
  if (isRecord(value)) artifactRefArray(issues, value.evidenceRefs, `${path}.evidenceRefs`);
}

function validateHandoff(issues: ValidationIssue[], value: unknown, path: string): void {
  validateSourceHandoff(issues, value, path);
  if (isRecord(value)) artifactRefArray(issues, value.evidenceRefs, `${path}.evidenceRefs`);
}

function validateRegistryEntry(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  if (typeof value.contractType !== "string" || !CONTRACT_TYPES.has(value.contractType as EffectiveContractRegistryEntry["contractType"])) {
    issues.push({ path: `${path}.contractType`, message: "Expected a supported contract type." });
  }
  requiredString(issues, value.contractId, `${path}.contractId`);
  validateAuthorityAndConfidence(issues, value, path);
  const refResult = validateArtifactRef(value.ref);
  if (!refResult.ok) appendNestedIssues(issues, refResult.issues, `${path}.ref`);
  stringArray(issues, value.systems, `${path}.systems`);
  stringArray(issues, value.paths, `${path}.paths`, false, true);
  stringArray(issues, value.flowIds, `${path}.flowIds`);
  stringArray(issues, value.clauseIds, `${path}.clauseIds`);
}

function validateCapability(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  requiredString(issues, value.verb, `${path}.verb`);
  requiredString(issues, value.noun, `${path}.noun`);
  optionalString(issues, value.domain, `${path}.domain`);
}

function validateHandoffSemantics(issues: ValidationIssue[], value: Record<string, unknown>, path: string): void {
  optionalStringArray(issues, value.guarantees, `${path}.guarantees`);
  optionalStringArray(issues, value.carriedInvariantIds, `${path}.carriedInvariantIds`);
  optionalString(issues, value.ordering, `${path}.ordering`);
  optionalString(issues, value.failureSemantics, `${path}.failureSemantics`);
  if (value.payload !== undefined) {
    if (!isRecord(value.payload)) issues.push({ path: `${path}.payload`, message: "Expected an object." });
    else {
      optionalString(issues, value.payload.schema, `${path}.payload.schema`);
      optionalStringArray(issues, value.payload.requiredFields, `${path}.payload.requiredFields`);
    }
  }
  if (value.verification !== undefined) {
    if (!isRecord(value.verification)) {
      issues.push({ path: `${path}.verification`, message: "Expected an object." });
    } else {
      const acceptedMethods = value.verification.acceptedMethods;
      if (!Array.isArray(acceptedMethods) || acceptedMethods.length === 0) {
        issues.push({ path: `${path}.verification.acceptedMethods`, message: "Expected at least one proof method." });
      } else {
        acceptedMethods.forEach((method, index) => {
          if (typeof method !== "string" || !PROOF_METHODS.has(method as ProofMethod)) {
            issues.push({
              path: `${path}.verification.acceptedMethods[${index}]`,
              message: "Expected static, test, runtime, or model-judgment.",
            });
          }
        });
      }
      if (
        value.verification.acceptancePolicy !== undefined
        && (
          typeof value.verification.acceptancePolicy !== "string"
          || !PROOF_ACCEPTANCE_POLICIES.has(value.verification.acceptancePolicy as ProofAcceptancePolicy)
        )
      ) {
        issues.push({
          path: `${path}.verification.acceptancePolicy`,
          message: "Expected all-required, any-authoritative, or any-supported.",
        });
      }
      optionalStringArray(issues, value.verification.requiredChecks, `${path}.verification.requiredChecks`);
      optionalStringArray(
        issues,
        value.verification.requiredEvidencePaths,
        `${path}.verification.requiredEvidencePaths`,
        true,
      );
      if (
        Array.isArray(value.verification.requiredChecks)
        && value.verification.requiredChecks.length > 0
        && Array.isArray(acceptedMethods)
        && !acceptedMethods.includes("test")
      ) {
        issues.push({
          path: `${path}.verification.acceptedMethods`,
          message: "Expected test when requiredChecks declares checks that prove this handoff.",
        });
      }
      if (
        Array.isArray(value.verification.requiredEvidencePaths)
        && value.verification.requiredEvidencePaths.length > 0
      ) {
        if (!Array.isArray(acceptedMethods) || !acceptedMethods.includes("test")) {
          issues.push({
            path: `${path}.verification.acceptedMethods`,
            message: "Expected test when requiredEvidencePaths declares changed regression evidence.",
          });
        }
        if (
          !Array.isArray(value.verification.requiredChecks)
          || value.verification.requiredChecks.length === 0
        ) {
          issues.push({
            path: `${path}.verification.requiredChecks`,
            message: "Expected at least one test check when requiredEvidencePaths is declared.",
          });
        }
      }
    }
  }
}

function validateFlowReferences(issues: ValidationIssue[], value: Record<string, unknown>, path = "$"): void {
  if (!Array.isArray(value.stages) || !Array.isArray(value.handoffs)) return;
  const stages = value.stages;
  const handoffs = value.handoffs;
  const stageIds = new Set(stages.filter(isRecord).map((stage) => String(stage.id ?? "")));
  const invariantIds = new Set(Array.isArray(value.invariants)
    ? value.invariants.filter(isRecord).map((clause) => String(clause.id ?? ""))
    : []);
  handoffs.forEach((handoff, index) => {
    if (!isRecord(handoff)) return;
    for (const field of ["fromStageId", "toStageId"] as const) {
      if (typeof handoff[field] === "string" && !stageIds.has(handoff[field])) {
        issues.push({ path: `${path}.handoffs[${index}].${field}`, message: `Unknown stage id ${handoff[field]}.` });
      }
    }
    if (Array.isArray(handoff.carriedInvariantIds)) {
      handoff.carriedInvariantIds.forEach((id, invariantIndex) => {
        if (typeof id === "string" && !invariantIds.has(id)) {
          issues.push({ path: `${path}.handoffs[${index}].carriedInvariantIds[${invariantIndex}]`, message: `Unknown invariant id ${id}.` });
        }
      });
    }
  });
  const flowHasChecks = Array.isArray(value.requiredChecks) && value.requiredChecks.length > 0;
  stages.forEach((stage, stageIndex) => {
    if (
      !isRecord(stage)
      || !Array.isArray(stage.responsibilities)
      || stage.responsibilities.length === 0
      || flowHasChecks
    ) return;
    const stageHasHandoffCheck = handoffs.some((handoff) =>
      isRecord(handoff)
      && (handoff.fromStageId === stage.id || handoff.toStageId === stage.id)
      && isRecord(handoff.verification)
      && Array.isArray(handoff.verification.requiredChecks)
      && handoff.verification.requiredChecks.length > 0);
    if (!stageHasHandoffCheck) {
      issues.push({
        path: `${path}.stages[${stageIndex}].responsibilities`,
        message: "Stage responsibilities require a flow or adjacent handoff test check.",
      });
    }
  });
}

function validateTypedHeader(issues: ValidationIssue[], value: unknown, type: string): void {
  const result = validateArtifactHeader(value);
  if (!result.ok) appendNestedIssues(issues, result.issues, "$.header");
  if (isRecord(value) && value.artifactType !== type) {
    issues.push({ path: "$.header.artifactType", message: `Expected ${type}.` });
  }
}

function validateAuthorityAndConfidence(issues: ValidationIssue[], value: Record<string, unknown>, path = "$."): void {
  const prefix = path === "$." ? "$" : path;
  if (typeof value.authority !== "string" || !AUTHORITIES.has(value.authority as ContractAuthority)) {
    issues.push({ path: `${prefix}.authority`, message: "Expected observed, inferred, corroborated, or adopted." });
  }
  if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
    issues.push({ path: `${prefix}.confidence`, message: "Expected a number between 0 and 1." });
  }
}

function validateContractArtifactSource(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!isRecord(value)) return void issues.push({ path, message: "Expected an object." });
  optionalString(issues, value.path, `${path}.path`);
  optionalString(issues, value.digest, `${path}.digest`);
  optionalString(issues, value.sourceId, `${path}.sourceId`);
  for (const field of ["candidateRef", "judgmentRef"] as const) {
    if (value[field] === undefined) continue;
    const result = validateArtifactRef(value[field]);
    if (!result.ok) appendNestedIssues(issues, result.issues, `${path}.${field}`);
  }
  if ((value.path === undefined) !== (value.digest === undefined)) {
    issues.push({ path, message: "path and digest must be supplied together." });
  }
  if (value.path === undefined && value.candidateRef === undefined && value.judgmentRef === undefined) {
    issues.push({ path, message: "Expected a file, candidate, or judgment source reference." });
  }
}

function artifactRefArray(issues: ValidationIssue[], value: unknown, path: string): void {
  if (!Array.isArray(value)) return void issues.push({ path, message: "Expected an array." });
  value.forEach((ref, index) => {
    const result = validateArtifactRef(ref);
    if (!result.ok) appendNestedIssues(issues, result.issues, `${path}[${index}]`);
  });
}

function validateUniqueArray(
  issues: ValidationIssue[],
  value: unknown,
  path: string,
  validator: (issues: ValidationIssue[], value: unknown, path: string) => void,
  required = false,
  key: (value: unknown) => string = (entry) => isRecord(entry) ? String(entry.id ?? "") : "",
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  if (required && value.length === 0) issues.push({ path, message: "Expected at least one entry." });
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    validator(issues, entry, `${path}[${index}]`);
    const id = key(entry);
    if (id && seen.has(id)) issues.push({ path: `${path}[${index}].id`, message: `Duplicate id ${id}.` });
    if (id) seen.add(id);
  });
}

function validateOptionalUniqueArray(
  issues: ValidationIssue[],
  value: unknown,
  path: string,
  validator: (issues: ValidationIssue[], value: unknown, path: string) => void,
): void {
  if (value !== undefined) validateUniqueArray(issues, value, path, validator);
}

function requiredString(issues: ValidationIssue[], value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) issues.push({ path, message: "Expected a non-empty string." });
}

function optionalString(issues: ValidationIssue[], value: unknown, path: string): void {
  if (value !== undefined) requiredString(issues, value, path);
}

function stringArray(issues: ValidationIssue[], value: unknown, path: string, required = false, paths = false): void {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    issues.push({ path, message: "Expected an array of non-empty strings." });
    return;
  }
  if (required && value.length === 0) issues.push({ path, message: "Expected at least one entry." });
  if (paths) value.forEach((entry, index) => validateRepositoryPath(issues, entry, `${path}[${index}]`));
}

function optionalStringArray(issues: ValidationIssue[], value: unknown, path: string, paths = false): void {
  if (value !== undefined) stringArray(issues, value, path, false, paths);
}

function validateRepositoryPath(issues: ValidationIssue[], value: string, path: string): void {
  if (value.startsWith("/") || value.split(/[\\/]/u).includes("..") || value.includes("\\")) {
    issues.push({ path, message: "Expected a repository-relative forward-slash path without parent traversal." });
  }
  if (value === ".rekon" || value.startsWith(".rekon/") || value.includes(".codebase-intel")) {
    issues.push({ path, message: "Contract sources may not scope generated or legacy workspaces." });
  }
}

function normalizeClauses(clauses: ContractClause[]): ContractClause[] {
  return dedupeById(clauses).map((clause) => ({
    ...clause,
    sourceRefs: dedupeContractSources(clause.sourceRefs),
    evidenceRefs: uniqueRefs(clause.evidenceRefs),
  }));
}

function dedupeContractSources(sources: ContractArtifactSource[]): ContractArtifactSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = [
      source.path ?? "",
      source.digest ?? "",
      source.sourceId ?? "",
      source.candidateRef ? `${source.candidateRef.type}:${source.candidateRef.id}` : "",
      source.judgmentRef ? `${source.judgmentRef.type}:${source.judgmentRef.id}` : "",
    ].join("\0");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeRegistryEntries(entries: EffectiveContractRegistryEntry[]): EffectiveContractRegistryEntry[] {
  const byIdentity = new Map<string, EffectiveContractRegistryEntry>();
  for (const entry of entries) {
    const key = `${entry.contractType}:${entry.contractId}`;
    if (byIdentity.has(key)) throw new TypeError(`Duplicate effective contract ${key}.`);
    byIdentity.set(key, {
      ...entry,
      systems: uniqueSorted(entry.systems),
      paths: uniqueSorted(entry.paths),
      flowIds: unique(entry.flowIds),
      clauseIds: unique(entry.clauseIds),
    });
  }
  return [...byIdentity.values()];
}

function summarizeRegistry(entries: EffectiveContractRegistryEntry[]): EffectiveContractRegistry["summary"] {
  const byAuthority = { observed: 0, inferred: 0, corroborated: 0, adopted: 0 };
  const byType = { SystemContract: 0, CapabilityContract: 0, HandoffContract: 0, FlowContract: 0 };
  for (const entry of entries) {
    if (AUTHORITIES.has(entry.authority)) byAuthority[entry.authority] += 1;
    if (CONTRACT_TYPES.has(entry.contractType)) byType[entry.contractType] += 1;
  }
  return { total: entries.length, byAuthority, byType };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueSorted(values: string[]): string[] {
  return unique(values).sort();
}

function dedupeById<T extends { id: string }>(values: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    result.push(value);
  }
  return result;
}

function uniqueRefs(refs: ArtifactRef[]): ArtifactRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function appendNestedIssues(issues: ValidationIssue[], nested: ValidationIssue[], path: string): void {
  for (const issue of nested) issues.push({ path: issue.path.replace("$", path), message: issue.message });
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

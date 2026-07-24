import {
  createSourceStateBinding,
  digestJson,
  type ArtifactRef,
  type SourceStateBinding,
  type SourceStateFile,
} from "@rekon/kernel-artifacts";
import type {
  CapabilityContract,
  CapabilityEvidenceGraph,
  FlowContract,
  FlowContractHandoff,
  OwnershipMap,
  PlacementVerificationReport,
  ProofAcceptancePolicy,
  ProofGateEvaluation,
  ProofMethod,
  ProofObligation,
  ProofResult,
  SystemContract,
  TaskPact,
} from "@rekon/kernel-repo-model";
import { evaluateProofGate } from "@rekon/kernel-repo-model";

export type ChangeFileStatus = "added" | "modified" | "deleted" | "unchanged" | "unavailable";

export type ChangeFileEvidence = {
  path: string;
  status: ChangeFileStatus;
  beforeSha256?: string;
  afterSha256?: string;
  message?: string;
};

export type ChangeDependency = {
  specifier: string;
  resolvedPath?: string;
};

export type ChangeDependencyDelta = {
  path: string;
  added: ChangeDependency[];
  removed: ChangeDependency[];
  current: ChangeDependency[];
};

export type ChangeValidationViolation = {
  code: string;
  message: string;
  paths: string[];
  evidenceRefs: string[];
  details?: Record<string, unknown>;
};

export type ChangeValidationObligation = {
  id: string;
  kind: "repository-law" | "handoff" | "dependency" | "ownership" | "baseline";
  statement: string;
  reason: string;
  paths: string[];
  evidenceRefs: string[];
  blockingIfViolated: boolean;
};

export type ChangeValidationTaskCheck = {
  command: string;
  sourceId?: string;
  evidenceRefs?: string[];
};

export type ChangeValidationCheckRequirement = {
  sourceType:
    | "task-context"
    | "system-contract"
    | "flow-contract"
    | "flow-handoff"
    | "capability-contract"
    | "task-pact-fallback"
    | "coverage-observation";
  sourceId: string;
  reason: string;
  paths: string[];
  evidenceRefs: string[];
};

export type ChangeVerificationCandidate = {
  command: string;
  sourceType: "coverage-observation";
  sourceId: string;
  reason: string;
  paths: string[];
  evidenceRefs: ArtifactRef[];
};

export type ChangeValidationCheckKind = "test" | "static" | "build" | "artifact" | "other";

export type ChangeValidationSelectedCheck = {
  command: string;
  kind: ChangeValidationCheckKind;
  selection: "declared" | "evidence-backed";
  requirements: ChangeValidationCheckRequirement[];
  proofObligationIds: string[];
};

export type ChangeVerificationDiagnostic = {
  stream: "stderr" | "stdout" | "notes";
  excerpt: string;
  truncated: boolean;
};

export type ChangeVerificationEvidence = {
  ref: ArtifactRef;
  generatedAt: string;
  freshness: "fresh" | "stale" | "unknown";
  provenance: "runner-derived" | "recorded";
  sourceStateDigest?: string;
  verifier: {
    id: string;
    version: string;
  };
  verificationRunRef?: ArtifactRef;
  commandResults: Array<{
    command: string;
    status: "passed" | "failed" | "skipped" | "not-run";
    completedAt?: string;
    notes?: string;
    diagnostic?: ChangeVerificationDiagnostic;
  }>;
};

export type ChangeValidationCorrection = {
  id: string;
  kind:
    | "refuted-obligation"
    | "failed-check"
    | "stale-check"
    | "incomplete-check"
    | "missing-check";
  command?: string;
  summary: string;
  paths: string[];
  obligationIds: string[];
  reasons: string[];
  evidenceRefs: string[];
  diagnostic?: ChangeVerificationDiagnostic;
  nextAction: string;
};

export type ChangeRuntimeEvidence = {
  ref: ArtifactRef;
  freshness: "fresh" | "stale" | "unknown";
  producer: {
    id: string;
    version: string;
  };
  edges: Array<{
    kind: string;
    fromNodeId: string;
    toNodeId: string;
    observedCount: number;
  }>;
};

export type ChangeModelJudgment = {
  obligationId: string;
  verdict: "supported" | "refuted" | "unresolved";
  explanation: string;
  evidenceRefs?: ArtifactRef[];
  verifier?: {
    id: string;
    version: string;
  };
};

export type ChangePlacementVerificationEvidence = {
  ref: ArtifactRef;
  report: PlacementVerificationReport;
  attestation: {
    status: "trusted" | "untrusted";
    reason: string;
    keyId?: string;
  };
};

export type ChangeValidationResult = {
  schemaVersion: "1.0.0";
  task: string;
  changedPaths: string[];
  baseRef: string;
  status: "passed" | "blocked" | "needs-judgment";
  affectedSystems: string[];
  affectedFlows: string[];
  blockingViolations: ChangeValidationViolation[];
  unresolvedSemanticObligations: ChangeValidationObligation[];
  proofGate: {
    obligations: ProofObligation[];
    results: ProofResult[];
    evaluation: ProofGateEvaluation;
    warnings: string[];
  };
  requiredChecks: string[];
  checkSelection: {
    strategy: "changed-scope";
    fallbackUsed: boolean;
    evidenceCandidatesConsidered: number;
    evidenceBackedChecks: number;
    uncoveredTestPaths: string[];
    warnings: string[];
    checks: ChangeValidationSelectedCheck[];
  };
  correctiveContext: {
    strategy: "proof-local";
    entries: ChangeValidationCorrection[];
  };
  baseline: {
    taskPactRef?: ArtifactRef;
    taskContextRef?: ArtifactRef;
    files: ChangeFileEvidence[];
  };
  boundaries: {
    wroteArtifact: false;
    wroteSource: false;
    executedChecks: false;
    invokedModel: false;
  };
};

export type ValidateChangeInput = {
  task: string;
  changedPaths: string[];
  baseRef: string;
  taskPact?: TaskPact;
  taskPactRef?: ArtifactRef;
  taskContextRef?: ArtifactRef;
  ownershipMap?: OwnershipMap;
  systemContracts?: SystemContract[];
  flowContracts?: FlowContract[];
  capabilityContract?: CapabilityContract;
  capabilityGraph?: CapabilityEvidenceGraph;
  taskChecks?: ChangeValidationTaskCheck[];
  verificationCandidates?: ChangeVerificationCandidate[];
  files?: ChangeFileEvidence[];
  dependencyChanges?: ChangeDependencyDelta[];
  verificationEvidence?: ChangeVerificationEvidence[];
  runtimeEvidence?: ChangeRuntimeEvidence[];
  placementVerificationEvidence?: ChangePlacementVerificationEvidence[];
  modelJudgments?: ChangeModelJudgment[];
  proofResults?: ProofResult[];
};

/**
 * Compare an observed edit with task-scoped repository law.
 *
 * This helper is deliberately pure. Hosts gather Git and current-source
 * evidence, then pass it here. Contract prose remains an explicit semantic
 * obligation for the acting agent; deterministic failures alone become
 * blocking violations.
 */
export function validateChange(input: ValidateChangeInput): ChangeValidationResult {
  const violations: ChangeValidationViolation[] = [];
  const obligations: ChangeValidationObligation[] = [];
  const normalizedPaths = unique(input.changedPaths.map(normalizePath).filter(Boolean));
  const invalidPaths = input.changedPaths.filter((path) => !normalizePath(path));
  const pactRef = input.taskPactRef;
  const pactEvidence = pactRef ? [`${pactRef.type}:${pactRef.id}`] : [];
  const flowContracts = input.flowContracts ?? [];
  const ownership = input.ownershipMap;

  for (const path of invalidPaths) {
    violations.push({
      code: "change.path-invalid",
      message: `Changed path is not a safe repository-relative path: ${path}`,
      paths: [path],
      evidenceRefs: [],
    });
  }

  if (normalizedPaths.length === 0) {
    violations.push({
      code: "change.paths-empty",
      message: "No valid changed paths were supplied for post-edit validation.",
      paths: [],
      evidenceRefs: [],
    });
  }

  const directScopes = input.taskPact?.task.paths ?? [];
  const contractScopes = unique([
    ...(input.taskPact?.constraints.flatMap((entry) => entry.paths) ?? []),
    ...(input.taskPact?.impactObligations.flatMap((entry) => entry.paths) ?? []),
  ]);

  if (!input.taskPact) {
    addObligation(obligations, {
      id: "repository-law-unavailable",
      kind: "repository-law",
      statement: "Confirm the change preserves repository purpose, invariants, and prohibited-change rules.",
      reason: "No task-scoped TaskPact was available, so repository law could not be evaluated.",
      paths: normalizedPaths,
      evidenceRefs: [],
      blockingIfViolated: true,
    });
  } else {
    for (const path of normalizedPaths) {
      const direct = directScopes.some((scope) => pathMatchesScope(path, scope));
      const contractScoped = contractScopes.some((scope) => pathMatchesScope(path, scope));
      if (!direct && !contractScoped) {
        violations.push({
          code: "change.outside-task-pact",
          message: `${path} is outside the task paths and every matched repository-law scope.`,
          paths: [path],
          evidenceRefs: pactEvidence,
        });
      } else if (!direct) {
        addObligation(obligations, {
          id: `expanded-contract-scope:${path}`,
          kind: "repository-law",
          statement: `Confirm that editing ${path} is required to preserve the matched end-to-end contract.`,
          reason: "The path is covered by matched repository law but was not part of the task's direct path scope.",
          paths: [path],
          evidenceRefs: pactEvidence,
          blockingIfViolated: true,
        });
      }
    }
  }

  const files = normalizedPaths.map((path) =>
    input.files?.find((entry) => normalizePath(entry.path) === path) ?? {
      path,
      status: "unavailable" as const,
      message: "No baseline comparison was supplied by the host.",
    });
  for (const file of files) {
    if (file.status === "unchanged") {
      violations.push({
        code: "change.not-different-from-base",
        message: `${file.path} does not differ from ${input.baseRef}.`,
        paths: [file.path],
        evidenceRefs: [],
      });
    } else if (file.status === "unavailable") {
      addObligation(obligations, {
        id: `baseline-unavailable:${file.path}`,
        kind: "baseline",
        statement: `Establish the pre-edit state of ${file.path} before treating validation as complete.`,
        reason: file.message ?? `The host could not compare this path with ${input.baseRef}.`,
        paths: [file.path],
        evidenceRefs: [],
        blockingIfViolated: true,
      });
    }
  }

  const ownerByPath = new Map(normalizedPaths.map((path) => [path, resolveOwner(path, ownership)]));
  const directOwners = unique(directScopes.flatMap((scope) => {
    const exact = normalizePath(scope);
    if (!exact || exact.includes("*")) return [];
    const owner = resolveOwner(exact, ownership);
    return owner ? [owner] : [];
  }));
  const affectedSystems = unique([...ownerByPath.values()].filter((owner): owner is string => Boolean(owner)));
  const affectedSystemContracts = (input.systemContracts ?? []).filter((contract) =>
    normalizedPaths.some((path) => contract.system.paths.some((scope) => pathMatchesScope(path, scope))));
  const affectedFlowContracts = flowContracts.filter((flow) =>
    normalizedPaths.some((path) => flowPaths(flow).some((scope) => pathMatchesScope(path, scope))));

  for (const path of normalizedPaths) {
    const owner = ownerByPath.get(path);
    if (!owner) {
      if (isRepositoryDocumentationSurface(path)) continue;
      addObligation(obligations, {
        id: `ownership-unresolved:${path}`,
        kind: "ownership",
        statement: `Resolve the owner system for ${path} before accepting the change boundary.`,
        reason: "OwnershipMap has no matching path.",
        paths: [path],
        evidenceRefs: ownership ? [`OwnershipMap:${ownership.header.artifactId}`] : [],
        blockingIfViolated: true,
      });
      continue;
    }
    const direct = directScopes.some((scope) => pathMatchesScope(path, scope));
    if (direct || directOwners.length === 0 || directOwners.includes(owner)) continue;
    const declaredFlow = affectedFlowContracts.some((flow) =>
      flow.systems.includes(owner) && directOwners.some((directOwner) => flow.systems.includes(directOwner)));
    if (declaredFlow) {
      addObligation(obligations, {
        id: `ownership-flow-boundary:${path}:${owner}`,
        kind: "ownership",
        statement: `Confirm the declared flow requires the change to cross into owner system ${owner}.`,
        reason: "The edit crosses the direct task owner boundary along a matched flow contract.",
        paths: [path],
        evidenceRefs: affectedFlowContracts.map((flow) => `FlowContract:${flow.contractId}`),
        blockingIfViolated: true,
      });
    } else {
      violations.push({
        code: "change.ownership-boundary-crossed",
        message: `${path} is owned by ${owner}, outside the direct task owner systems ${directOwners.join(", ")}.`,
        paths: [path],
        evidenceRefs: ownership ? [`OwnershipMap:${ownership.header.artifactId}`, ...pactEvidence] : pactEvidence,
        details: { owner, directOwners },
      });
    }
  }

  addTaskPactObligations(obligations, input.taskPact, normalizedPaths, pactEvidence);
  for (const flow of affectedFlowContracts) addFlowObligations(obligations, flow, normalizedPaths);
  validateDependencyChanges({ input, violations, obligations, ownerByPath, affectedFlowContracts });

  const checkSelection = selectRequiredChecks({
    input,
    changedPaths: normalizedPaths,
    affectedSystemContracts,
    affectedFlowContracts,
    matchedCapabilityContracts: matchedCapabilityContracts(input),
  });
  const requiredChecks = checkSelection.checks.map((check) => check.command);
  const dedupedViolations = dedupe(violations, (entry) => `${entry.code}\0${entry.paths.join("\0")}\0${entry.message}`);
  const dedupedObligations = dedupe(obligations, (entry) => entry.id);
  const proofObligations = dedupe([
    ...dedupedObligations.map((obligation) => toProofObligation(obligation, input)),
    ...checkSelection.checks.map((check) => toCheckProofObligation(check, input)),
  ], (obligation) => obligation.id);
  const boundProof = bindProofEvidence({ input, obligations: proofObligations, checks: checkSelection.checks });
  const suppliedProof = bindSuppliedProofResults(input, proofObligations);
  const proofResults = dedupe([
    ...suppliedProof.results,
    ...boundProof.results,
  ], proofResultKey);
  const proofEvaluation = evaluateProofGate(proofObligations, proofResults);
  const correctiveContext = buildVerificationCorrectiveContext({
    input,
    checks: checkSelection.checks,
    obligations: proofObligations,
    results: proofResults,
    evaluation: proofEvaluation,
  });
  const unresolvedIds = new Set(proofEvaluation.decisions
    .filter((decision) => decision.verdict === "unresolved")
    .map((decision) => decision.obligationId));
  const proofViolations = proofEvaluation.decisions
    .filter((decision) => decision.verdict === "blocked")
    .map((decision): ChangeValidationViolation => {
      const obligation = dedupedObligations.find((candidate) => candidate.id === decision.obligationId);
      return {
        code: "proof.obligation-refuted",
        message: `Required proof was refuted: ${obligation?.statement ?? decision.obligationId}`,
        paths: obligation?.paths ?? [],
        evidenceRefs: obligation?.evidenceRefs ?? [],
        details: { obligationId: decision.obligationId, refutedMethods: decision.refutedMethods },
      };
    });
  const unboundProofViolations = proofEvaluation.orphanResultIds.map((obligationId): ChangeValidationViolation => ({
    code: "proof.result-unbound",
    message: `Proof result does not match a current change obligation: ${obligationId}`,
    paths: normalizedPaths,
    evidenceRefs: [],
    details: { obligationId },
  }));
  const blockingViolations = dedupe(
    [...dedupedViolations, ...proofViolations, ...unboundProofViolations],
    (entry) => `${entry.code}\0${entry.paths.join("\0")}\0${entry.message}`,
  );

  return {
    schemaVersion: "1.0.0",
    task: input.task,
    changedPaths: normalizedPaths,
    baseRef: input.baseRef,
    status: blockingViolations.length > 0
      ? "blocked"
      : proofEvaluation.status === "incomplete"
        ? "needs-judgment"
        : "passed",
    affectedSystems,
    affectedFlows: affectedFlowContracts.map((flow) => flow.contractId).sort(),
    blockingViolations,
    unresolvedSemanticObligations: dedupedObligations.filter((obligation) => unresolvedIds.has(obligation.id)),
    proofGate: {
      obligations: proofObligations,
      results: proofResults,
      evaluation: proofEvaluation,
      warnings: unique([
        ...boundProof.warnings,
        ...suppliedProof.warnings,
        ...checkSelection.warnings,
      ]).sort(),
    },
    requiredChecks,
    checkSelection,
    correctiveContext,
    baseline: {
      ...(pactRef ? { taskPactRef: pactRef } : {}),
      ...(input.taskContextRef ? { taskContextRef: input.taskContextRef } : {}),
      files: files.sort((left, right) => left.path.localeCompare(right.path)),
    },
    boundaries: {
      wroteArtifact: false,
      wroteSource: false,
      executedChecks: false,
      invokedModel: false,
    },
  };
}

function toProofObligation(
  obligation: ChangeValidationObligation,
  input: ValidateChangeInput,
): ProofObligation {
  const subject = proofSubject(obligation, input);
  const sourceRefs = proofSourceRefs(obligation, input);
  const edgePolicy = handoffEdgePolicy(obligation, input);
  const requiredEvidence = edgePolicy?.acceptedMethods ?? proofMethods(obligation);
  return {
    id: obligation.id,
    subject: {
      kind: obligation.kind === "handoff"
        ? "flow-handoff"
        : obligation.kind === "repository-law"
          ? "repository-law"
          : "verification-gate",
      id: subject.id,
      ...(subject.ref ? { ref: subject.ref } : {}),
      ...(obligation.paths.length > 0 ? { paths: [...obligation.paths] } : {}),
    },
    assertion: obligation.statement,
    requiredEvidence,
    acceptancePolicy: edgePolicy?.acceptancePolicy
      ?? (/:edge$/u.test(obligation.id) ? "any-supported" : "all-required"),
    required: obligation.blockingIfViolated,
    sourceRefs,
  };
}

function toCheckProofObligation(
  check: ChangeValidationSelectedCheck,
  input: ValidateChangeInput,
): ProofObligation {
  const paths = unique(check.requirements.flatMap((requirement) => requirement.paths));
  return {
    id: checkProofObligationId(check.command),
    subject: {
      kind: "verification-gate",
      id: check.command,
      ...(paths.length > 0 ? { paths } : {}),
    },
    assertion: `Pass selected check: ${check.command}`,
    requiredEvidence: ["test"],
    acceptancePolicy: "all-required",
    required: true,
    sourceRefs: proofSourceRefsForCheck(check, input),
  };
}

function proofSubject(
  obligation: ChangeValidationObligation,
  input: ValidateChangeInput,
): { id: string; ref?: ArtifactRef } {
  const matchedHandoff = findFlowHandoffByObligationId(input.flowContracts ?? [], obligation.id);
  if (matchedHandoff) {
    return {
      id: `${matchedHandoff.flow.contractId}:${matchedHandoff.handoff.id}`,
      ref: artifactRef(matchedHandoff.flow.header),
    };
  }
  const matchedResponsibility = findFlowStageResponsibilityByObligationId(
    input.flowContracts ?? [],
    obligation.id,
  );
  if (matchedResponsibility) {
    return {
      id: `${matchedResponsibility.flow.contractId}:${matchedResponsibility.stage.id}`,
      ref: artifactRef(matchedResponsibility.flow.header),
    };
  }
  return {
    id: obligation.id,
    ...(input.taskPactRef && obligation.kind === "repository-law" ? { ref: input.taskPactRef } : {}),
  };
}

function proofSourceRefs(obligation: ChangeValidationObligation, input: ValidateChangeInput): ArtifactRef[] {
  const refs: ArtifactRef[] = [];
  if (input.taskPactRef && (obligation.kind === "repository-law" || obligation.kind === "handoff")) {
    refs.push(input.taskPactRef);
  }
  const matchedHandoff = findFlowHandoffByObligationId(input.flowContracts ?? [], obligation.id);
  if (matchedHandoff) refs.push(artifactRef(matchedHandoff.flow.header));
  const matchedResponsibility = findFlowStageResponsibilityByObligationId(
    input.flowContracts ?? [],
    obligation.id,
  );
  if (matchedResponsibility) refs.push(artifactRef(matchedResponsibility.flow.header));
  if (obligation.kind === "ownership" && input.ownershipMap) refs.push(artifactRef(input.ownershipMap.header));
  if (obligation.kind === "dependency" && input.capabilityContract) refs.push(artifactRef(input.capabilityContract.header));
  if (obligation.kind === "repository-law") refs.push(...(input.taskPact?.contracts.map((contract) => contract.ref) ?? []));
  return dedupe(refs, (ref) => `${ref.type}:${ref.id}`)
    .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

function proofMethods(obligation: ChangeValidationObligation): ProofMethod[] {
  if (isStageResponsibilityObligationId(obligation.id)) return ["test", "model-judgment"];
  if (isHandoffEvidencePathObligationId(obligation.id)) return ["static"];
  if (/:edge$/u.test(obligation.id)) return ["test", "runtime", "model-judgment"];
  if (obligation.kind === "baseline" || obligation.kind === "ownership") {
    return ["static"];
  }
  return ["model-judgment"];
}

function handoffEdgePolicy(
  obligation: ChangeValidationObligation,
  input: ValidateChangeInput,
): { acceptedMethods: ProofMethod[]; acceptancePolicy: ProofAcceptancePolicy } | undefined {
  if (!/:edge$/u.test(obligation.id)) return undefined;
  const handoff = findFlowHandoffByEdgeObligationId(input.flowContracts ?? [], obligation.id)?.handoff;
  if (!handoff?.verification) return undefined;
  return {
    acceptedMethods: [...handoff.verification.acceptedMethods],
    acceptancePolicy: handoff.verification.acceptancePolicy ?? "any-supported",
  };
}

function checkProofObligationId(command: string): string {
  return `check:${digestJson(command).slice(0, 16)}`;
}

function proofSourceRefsForCheck(
  check: ChangeValidationSelectedCheck,
  input: ValidateChangeInput,
): ArtifactRef[] {
  const known = knownProofRefs(input);
  const requested = new Set(check.requirements.flatMap((requirement) => requirement.evidenceRefs));
  for (const requirement of check.requirements) {
    if (requirement.sourceType === "flow-contract") requested.add(`FlowContract:${requirement.sourceId}`);
    if (requirement.sourceType === "flow-handoff") {
      const matched = findFlowHandoffBySourceId(input.flowContracts ?? [], requirement.sourceId);
      if (matched) requested.add(`FlowContract:${matched.flow.header.artifactId}`);
    }
    if (requirement.sourceType === "system-contract") requested.add(`SystemContract:${requirement.sourceId}`);
    if (requirement.sourceType === "capability-contract" && input.capabilityContract) {
      requested.add(`CapabilityContract:${input.capabilityContract.header.artifactId}`);
    }
    if (requirement.sourceType === "task-context" && input.taskContextRef) {
      requested.add(`${input.taskContextRef.type}:${input.taskContextRef.id}`);
    }
    if (requirement.sourceType === "task-pact-fallback" && input.taskPactRef) {
      requested.add(`${input.taskPactRef.type}:${input.taskPactRef.id}`);
    }
  }
  return known.filter((ref) => requested.has(`${ref.type}:${ref.id}`));
}

function knownProofRefs(input: ValidateChangeInput): ArtifactRef[] {
  const refs = [
    input.taskPactRef,
    input.taskContextRef,
    input.ownershipMap ? artifactRef(input.ownershipMap.header) : undefined,
    input.capabilityContract ? artifactRef(input.capabilityContract.header) : undefined,
    input.capabilityGraph ? artifactRef(input.capabilityGraph.header) : undefined,
    ...(input.systemContracts ?? []).map((contract) => artifactRef(contract.header)),
    ...(input.flowContracts ?? []).map((contract) => artifactRef(contract.header)),
    ...(input.verificationCandidates ?? []).flatMap((candidate) => candidate.evidenceRefs),
  ].filter((ref): ref is ArtifactRef => Boolean(ref));
  return dedupe(refs, (ref) => `${ref.type}:${ref.id}`);
}

function bindProofEvidence(input: {
  input: ValidateChangeInput;
  obligations: ProofObligation[];
  checks: ChangeValidationSelectedCheck[];
}): { results: ProofResult[]; warnings: string[] } {
  const warnings: string[] = [];
  const results = [
    ...bindStaticEvidence(input, warnings),
    ...bindVerificationEvidence(input, warnings),
    ...bindRuntimeEvidence(input, warnings),
    ...bindPlacementVerificationEvidence(input, warnings),
    ...bindModelJudgments(input, warnings),
  ];
  return {
    results: dedupe(results, proofResultKey),
    warnings: unique(warnings).sort(),
  };
}

function bindSuppliedProofResults(
  input: ValidateChangeInput,
  obligations: ProofObligation[],
): { results: ProofResult[]; warnings: string[] } {
  const obligationIds = new Set(obligations.map((obligation) => obligation.id));
  const warnings: string[] = [];
  const results = (input.proofResults ?? []).filter((result) => {
    if (!obligationIds.has(result.obligationId)) return true;
    if (
      isStageResponsibilityObligationId(result.obligationId)
      && result.method === "model-judgment"
    ) {
      warnings.push(`placement-proof-direct-result-rejected: ${result.obligationId}`);
      return false;
    }
    return true;
  });
  return { results, warnings };
}

function bindStaticEvidence(
  input: {
    input: ValidateChangeInput;
    obligations: ProofObligation[];
    checks: ChangeValidationSelectedCheck[];
  },
  warnings: string[],
): ProofResult[] {
  const results: ProofResult[] = [];
  const files = (input.input.files ?? []).flatMap((file) => {
    const path = normalizePath(file.path);
    return path ? [{ ...file, path }] : [];
  });

  for (const obligation of input.obligations) {
    if (!isHandoffEvidencePathObligationId(obligation.id)) continue;
    const handoff = findFlowHandoffByObligationId(
      input.input.flowContracts ?? [],
      obligation.id,
    )?.handoff;
    const requiredPaths = handoff?.verification?.requiredEvidencePaths ?? [];
    const changedEvidencePaths = unique(files
      .filter((file) =>
        (file.status === "added" || file.status === "modified")
        && requiredPaths.some((scope) => pathMatchesScope(file.path, scope)))
      .map((file) => file.path));
    if (changedEvidencePaths.length === 0) {
      const deletedEvidencePaths = unique(files
        .filter((file) =>
          file.status === "deleted"
          && requiredPaths.some((scope) => pathMatchesScope(file.path, scope)))
        .map((file) => file.path));
      if (deletedEvidencePaths.length > 0) {
        results.push({
          obligationId: obligation.id,
          method: "static",
          verdict: "refuted",
          evidenceRefs: [],
          counterEvidenceRefs: [...obligation.sourceRefs],
          explanation: `Required regression evidence was deleted: ${deletedEvidencePaths.join(", ")}.`,
          verifier: {
            kind: "deterministic",
            id: "@rekon/capability-model.change-scope",
            version: "1.0.0",
          },
        });
        continue;
      }
      warnings.push(
        `handoff-evidence-path-missing: ${obligation.id} requires a current change in ${requiredPaths.join(", ")}`,
      );
      continue;
    }
    results.push({
      obligationId: obligation.id,
      method: "static",
      verdict: "supported",
      evidenceRefs: [...obligation.sourceRefs],
      counterEvidenceRefs: [],
      explanation: `Current source-state evidence includes changed required path${changedEvidencePaths.length === 1 ? "" : "s"}: ${changedEvidencePaths.join(", ")}.`,
      verifier: {
        kind: "deterministic",
        id: "@rekon/capability-model.change-scope",
        version: "1.0.0",
      },
    });
  }
  return results;
}

function bindVerificationEvidence(
  input: {
    input: ValidateChangeInput;
    obligations: ProofObligation[];
    checks: ChangeValidationSelectedCheck[];
  },
  warnings: string[],
): ProofResult[] {
  const results: ProofResult[] = [];
  const checksByCommand = new Map(input.checks.map((check) => [normalizeCommand(check.command), check]));
  const obligationsById = new Map(input.obligations.map((obligation) => [obligation.id, obligation]));

  for (const evidence of input.input.verificationEvidence ?? []) {
    if (evidence.freshness !== "fresh") {
      warnings.push(`verification-evidence-${evidence.freshness}: ${evidence.ref.type}:${evidence.ref.id}`);
    }
    for (const commandResult of evidence.commandResults) {
      const check = checksByCommand.get(normalizeCommand(commandResult.command));
      if (!check) {
        warnings.push(`verification-command-unselected: ${commandResult.command}`);
        continue;
      }
      const verdict = evidence.freshness === "fresh"
        ? proofVerdictForCommand(commandResult.status)
        : "unresolved";
      const checkObligation = obligationsById.get(checkProofObligationId(check.command));
      if (checkObligation) {
        results.push(verificationProofResult(checkObligation.id, verdict, evidence, commandResult.command));
      }

      for (const obligationId of check.proofObligationIds) {
        const obligation = obligationsById.get(obligationId);
        if (
          !obligation
          || (
            obligation.subject.kind !== "flow-handoff"
            && !isStageResponsibilityObligationId(obligation.id)
          )
        ) continue;
        if (!obligation.requiredEvidence.includes("test")) continue;
        results.push(verificationProofResult(obligation.id, verdict, evidence, commandResult.command));
      }
    }
  }
  return results;
}

function verificationProofResult(
  obligationId: string,
  verdict: ProofResult["verdict"],
  evidence: ChangeVerificationEvidence,
  command: string,
): ProofResult {
  const explanation = evidence.freshness === "fresh"
    ? `${evidence.provenance} verification recorded ${verdict} for ${command}.`
    : `${evidence.provenance} verification was ${evidence.freshness} for the current source state.`;
  return {
    obligationId,
    method: "test",
    verdict,
    evidenceRefs: verdict === "supported" ? [evidence.ref] : [],
    counterEvidenceRefs: verdict === "refuted" ? [evidence.ref] : [],
    explanation,
    verifier: {
      kind: "test",
      id: evidence.verifier.id,
      version: evidence.verifier.version,
    },
  };
}

function bindRuntimeEvidence(
  input: {
    input: ValidateChangeInput;
    obligations: ProofObligation[];
    checks: ChangeValidationSelectedCheck[];
  },
  warnings: string[],
): ProofResult[] {
  const results: ProofResult[] = [];
  for (const evidence of input.input.runtimeEvidence ?? []) {
    if (evidence.freshness !== "fresh") {
      warnings.push(`runtime-evidence-${evidence.freshness}: ${evidence.ref.type}:${evidence.ref.id}`);
    }
    for (const obligation of input.obligations) {
      const handoff = findFlowHandoffByEdgeObligationId(
        input.input.flowContracts ?? [],
        obligation.id,
      )?.handoff;
      if (!handoff) continue;
      if (!obligation.requiredEvidence.includes("runtime")) continue;
      const observed = evidence.edges.some((edge) =>
        edge.kind === "handoff"
        && edge.observedCount > 0
        && edge.fromNodeId === runtimeStepId(handoff.fromStageId)
        && edge.toNodeId === runtimeStepId(handoff.toStageId));
      if (!observed) continue;
      const verdict: ProofResult["verdict"] = evidence.freshness === "fresh" ? "supported" : "unresolved";
      results.push({
        obligationId: obligation.id,
        method: "runtime",
        verdict,
        evidenceRefs: verdict === "supported" ? [evidence.ref] : [],
        counterEvidenceRefs: [],
        explanation: verdict === "supported"
          ? `Runtime evidence observed ${handoff.fromStageId} -> ${handoff.toStageId}.`
          : "The matching runtime observation is not fresh for the current source state.",
        verifier: {
          kind: "runtime",
          id: evidence.producer.id,
          version: evidence.producer.version,
        },
      });
    }
  }
  return results;
}

const ACTING_AGENT_VERIFIER_ID = "rekon-managed-agent";

function bindPlacementVerificationEvidence(
  input: {
    input: ValidateChangeInput;
    obligations: ProofObligation[];
    checks: ChangeValidationSelectedCheck[];
  },
  warnings: string[],
): ProofResult[] {
  if ((input.input.placementVerificationEvidence?.length ?? 0) === 0) return [];
  const obligations = new Map(input.obligations.map((obligation) => [obligation.id, obligation]));
  const currentSourceState = changeSourceState(input.input);
  const results: ProofResult[] = [];

  for (const evidence of input.input.placementVerificationEvidence ?? []) {
    const report = evidence.report;
    const refName = `${evidence.ref.type}:${evidence.ref.id}`;
    const obligation = obligations.get(report.obligation.id);
    if (!obligation) {
      warnings.push(`placement-verification-unbound: ${refName} -> ${report.obligation.id}`);
      continue;
    }
    if (!isStageResponsibilityObligationId(obligation.id)) {
      warnings.push(`placement-verification-not-applicable: ${refName} -> ${obligation.id}`);
      continue;
    }
    const matched = findFlowStageResponsibilityByObligationId(
      input.input.flowContracts ?? [],
      obligation.id,
    );
    if (!matched) {
      warnings.push(`placement-verification-contract-unavailable: ${refName} -> ${obligation.id}`);
      continue;
    }

    const expectedContractRef = artifactRef(matched.flow.header);
    const expectedChangedPaths = unique(obligation.subject.paths?.map(normalizePath).filter(Boolean) ?? []);
    const reportChangedPaths = unique(report.obligation.changedSourcePaths.map(normalizePath).filter(Boolean));
    const reportTaskPaths = unique(report.task.paths.map(normalizePath).filter(Boolean));
    const currentTaskPaths = unique(input.input.changedPaths.map(normalizePath).filter(Boolean));
    const reportStagePaths = unique(report.obligation.stagePaths.map(normalizePath).filter(Boolean));
    const expectedStagePaths = unique((matched.stage.paths ?? []).map(normalizePath).filter(Boolean));
    const invalidReasons: string[] = [];

    if (report.task.text.trim() !== input.input.task.trim()) invalidReasons.push("task text differs");
    if (!sameStringSet(reportTaskPaths, currentTaskPaths)) invalidReasons.push("task paths differ");
    if (report.obligation.assertion !== obligation.assertion) invalidReasons.push("assertion differs");
    if (report.obligation.flowId !== matched.flow.contractId) invalidReasons.push("flow differs");
    if (report.obligation.stageId !== matched.stage.id) invalidReasons.push("stage differs");
    if (!sameStringSet(reportStagePaths, expectedStagePaths)) invalidReasons.push("stage paths differ");
    if (!sameStringSet(reportChangedPaths, expectedChangedPaths)) {
      invalidReasons.push("changed source paths differ");
    }
    if (!sameArtifactRef(report.obligation.contractRef, expectedContractRef)) {
      invalidReasons.push("contract ref differs");
    }
    if (report.verifier.id === ACTING_AGENT_VERIFIER_ID) {
      invalidReasons.push("acting agent is the verifier");
    }
    if (!report.verifier.independentOf.includes(ACTING_AGENT_VERIFIER_ID)) {
      invalidReasons.push("acting-agent independence is undeclared");
    }
    if (evidence.attestation.status !== "trusted") {
      invalidReasons.push(`attestation is untrusted (${evidence.attestation.reason})`);
    }
    if (!currentSourceState) {
      invalidReasons.push("current source state is unavailable");
    } else if (report.sourceState.digest !== currentSourceState.digest) {
      invalidReasons.push("source state differs");
    }

    if (invalidReasons.length > 0) {
      warnings.push(
        `placement-verification-rejected: ${refName} -> ${obligation.id}: ${invalidReasons.join(", ")}`,
      );
      continue;
    }

    const refs = dedupe(
      [evidence.ref, expectedContractRef, ...obligation.sourceRefs],
      (ref) => `${ref.type}:${ref.id}`,
    );
    results.push({
      obligationId: obligation.id,
      method: "model-judgment",
      verdict: report.verdict,
      evidenceRefs: report.verdict === "supported" ? refs : [],
      counterEvidenceRefs: report.verdict === "refuted" ? refs : [],
      explanation: report.explanation,
      verifier: {
        kind: report.verifier.kind,
        id: report.verifier.id,
        version: report.verifier.version,
      },
    });
  }
  return results;
}

function bindModelJudgments(
  input: {
    input: ValidateChangeInput;
    obligations: ProofObligation[];
    checks: ChangeValidationSelectedCheck[];
  },
  warnings: string[],
): ProofResult[] {
  const obligations = new Map(input.obligations.map((obligation) => [obligation.id, obligation]));
  const results: ProofResult[] = [];
  for (const judgment of input.input.modelJudgments ?? []) {
    const obligation = obligations.get(judgment.obligationId);
    if (!obligation) {
      warnings.push(`model-judgment-unbound: ${judgment.obligationId}`);
      results.push({
        obligationId: judgment.obligationId,
        method: "model-judgment",
        verdict: judgment.verdict,
        evidenceRefs: [],
        counterEvidenceRefs: [],
        explanation: judgment.explanation,
        verifier: { kind: "model", id: judgment.verifier?.id ?? "rekon-managed-agent", version: judgment.verifier?.version ?? "1.0.0" },
      });
      continue;
    }
    if (isStageResponsibilityObligationId(obligation.id)) {
      warnings.push(`model-judgment-self-certification-rejected: ${judgment.obligationId}`);
      continue;
    }
    if (!obligation.requiredEvidence.includes("model-judgment")) {
      warnings.push(`model-judgment-not-accepted: ${judgment.obligationId}`);
      continue;
    }
    const refs = dedupe([...(judgment.evidenceRefs ?? []), ...obligation.sourceRefs], (ref) => `${ref.type}:${ref.id}`);
    results.push({
      obligationId: judgment.obligationId,
      method: "model-judgment",
      verdict: judgment.verdict,
      evidenceRefs: judgment.verdict === "supported" ? refs : [],
      counterEvidenceRefs: judgment.verdict === "refuted" ? refs : [],
      explanation: judgment.explanation,
      verifier: {
        kind: "model",
        id: judgment.verifier?.id ?? "rekon-managed-agent",
        version: judgment.verifier?.version ?? "1.0.0",
      },
    });
  }
  return results;
}

function buildVerificationCorrectiveContext(input: {
  input: ValidateChangeInput;
  checks: ChangeValidationSelectedCheck[];
  obligations: ProofObligation[];
  results: ProofResult[];
  evaluation: ProofGateEvaluation;
}): ChangeValidationResult["correctiveContext"] {
  const entries: ChangeValidationCorrection[] = [];

  for (const check of input.checks) {
    const matches = (input.input.verificationEvidence ?? []).flatMap((evidence) =>
      evidence.commandResults
        .filter((result) => normalizeCommand(result.command) === normalizeCommand(check.command))
        .map((commandResult) => ({ evidence, commandResult })));
    matches.sort((left, right) => {
      const priority = correctionEvidenceRank(right) - correctionEvidenceRank(left);
      if (priority !== 0) return priority;
      const generated = Date.parse(right.evidence.generatedAt) - Date.parse(left.evidence.generatedAt);
      if (Number.isFinite(generated) && generated !== 0) return generated;
      return `${right.evidence.ref.type}:${right.evidence.ref.id}`
        .localeCompare(`${left.evidence.ref.type}:${left.evidence.ref.id}`);
    });
    const match = matches[0];
    if (match?.evidence.freshness === "fresh" && match.commandResult.status === "passed") continue;

    const paths = unique(check.requirements.flatMap((requirement) => requirement.paths));
    const obligationIds = [...check.proofObligationIds];
    const reasons = unique(check.requirements.map((requirement) => requirement.reason)).sort();
    const selectionEvidenceRefs = check.requirements.flatMap((requirement) => requirement.evidenceRefs);
    const evidenceRefs = unique([
      ...selectionEvidenceRefs,
      ...(match
        ? [
          `${match.evidence.ref.type}:${match.evidence.ref.id}`,
          ...(match.evidence.verificationRunRef
            ? [`${match.evidence.verificationRunRef.type}:${match.evidence.verificationRunRef.id}`]
            : []),
        ]
        : []),
    ]).sort();
    const diagnostic = match ? boundedDiagnostic(match.commandResult) : undefined;

    let kind: ChangeValidationCorrection["kind"];
    let summary: string;
    let nextAction: string;
    if (!match) {
      kind = "missing-check";
      summary = `No verification evidence exists for selected check: ${check.command}`;
      nextAction = `Run ${check.command} against the current source state.`;
    } else if (match.evidence.freshness !== "fresh") {
      kind = "stale-check";
      summary = `Verification evidence for ${check.command} is ${match.evidence.freshness} for the current source state.`;
      nextAction = `Rerun ${check.command} against the current source state before drawing conclusions.`;
    } else if (match.commandResult.status === "failed") {
      kind = "failed-check";
      summary = `Selected check failed: ${check.command}`;
      nextAction = `Inspect only the listed paths and diagnostic, repair the violated behavior without weakening the check, then rerun ${check.command}.`;
    } else {
      kind = "incomplete-check";
      summary = `Selected check was ${match.commandResult.status}: ${check.command}`;
      nextAction = `Execute ${check.command}; skipped or unexecuted commands do not satisfy proof.`;
    }

    entries.push({
      id: `correction:${digestJson({ kind, command: check.command }).slice(0, 16)}`,
      kind,
      command: check.command,
      summary,
      paths: paths.length > 0 ? paths : unique(input.input.changedPaths.map(normalizePath).filter(Boolean)),
      obligationIds,
      reasons,
      evidenceRefs,
      ...(diagnostic ? { diagnostic } : {}),
      nextAction,
    });
  }

  const obligationById = new Map(input.obligations.map((obligation) => [
    obligation.id,
    obligation,
  ]));
  for (const decision of input.evaluation.decisions) {
    if (decision.verdict !== "blocked") continue;
    const obligation = obligationById.get(decision.obligationId);
    if (!obligation || obligation.subject.kind === "verification-gate") continue;
    const refutations = input.results.filter((result) =>
      result.obligationId === obligation.id
      && result.verdict === "refuted"
      && result.method === "model-judgment");
    if (refutations.length === 0) continue;
    const reasons = unique(refutations
      .map((result) => result.explanation.trim())
      .filter(Boolean)
      .map((reason) => reason.slice(0, 1_600)))
      .slice(0, 4);
    const evidenceRefs = unique([
      ...obligation.sourceRefs.map((ref) => `${ref.type}:${ref.id}`),
      ...refutations.flatMap((result) =>
        result.counterEvidenceRefs.map((ref) => `${ref.type}:${ref.id}`)),
    ]).sort();
    const paths = unique(
      obligation.subject.paths?.map(normalizePath).filter(Boolean)
        ?? input.input.changedPaths.map(normalizePath).filter(Boolean),
    );
    const assertion = obligation.assertion.trim().slice(0, 800);
    entries.push({
      id: `correction:${digestJson({
        kind: "refuted-obligation",
        obligationId: obligation.id,
      }).slice(0, 16)}`,
      kind: "refuted-obligation",
      summary: `Required proof was refuted: ${assertion}`,
      paths,
      obligationIds: [obligation.id],
      reasons: reasons.length > 0 ? reasons : [decision.explanation.slice(0, 1_600)],
      evidenceRefs,
      nextAction: `Inspect only the listed paths and counterevidence, replace the refuted implementation with one that satisfies "${assertion}", then validate again. Do not weaken or self-approve the obligation.`,
    });
  }

  return {
    strategy: "proof-local",
    entries: entries.sort((left, right) => correctionRank(left.kind) - correctionRank(right.kind)
      || refutedObligationRank(left) - refutedObligationRank(right)
      || (left.command ?? left.obligationIds[0] ?? left.id)
        .localeCompare(right.command ?? right.obligationIds[0] ?? right.id)),
  };
}

function boundedDiagnostic(
  result: ChangeVerificationEvidence["commandResults"][number],
): ChangeVerificationDiagnostic | undefined {
  const supplied = result.diagnostic;
  if (supplied && supplied.excerpt.trim().length > 0) {
    const excerpt = supplied.excerpt.trim().slice(0, 1600);
    return {
      stream: supplied.stream,
      excerpt,
      truncated: supplied.truncated || supplied.excerpt.trim().length > excerpt.length,
    };
  }
  const notes = result.notes?.trim();
  if (!notes) return undefined;
  const excerpt = notes.slice(0, 1600);
  return { stream: "notes", excerpt, truncated: notes.length > excerpt.length };
}

function correctionEvidenceRank(input: {
  evidence: ChangeVerificationEvidence;
  commandResult: ChangeVerificationEvidence["commandResults"][number];
}): number {
  if (input.evidence.freshness !== "fresh") return 0;
  if (input.commandResult.status === "failed") return 3;
  if (input.commandResult.status === "skipped" || input.commandResult.status === "not-run") return 2;
  return 1;
}

function correctionRank(value: ChangeValidationCorrection["kind"]): number {
  if (value === "refuted-obligation") return 0;
  if (value === "failed-check") return 1;
  if (value === "stale-check") return 2;
  if (value === "incomplete-check") return 3;
  return 4;
}

function refutedObligationRank(value: ChangeValidationCorrection): number {
  if (value.kind !== "refuted-obligation") return 0;
  const id = value.obligationIds[0] ?? "";
  if (isStageResponsibilityObligationId(id)) return 0;
  if (id.includes(".prohibition.")) return 1;
  if (id.includes(".invariant.")) return 2;
  if (id.includes(".handoff.") || id.startsWith("handoff:")) return 3;
  return 4;
}

function proofVerdictForCommand(status: ChangeVerificationEvidence["commandResults"][number]["status"]): ProofResult["verdict"] {
  if (status === "passed") return "supported";
  if (status === "failed") return "refuted";
  return "unresolved";
}

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/gu, " ");
}

function runtimeStepId(value: string): string {
  const slug = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "x";
  return `step:${slug}`;
}

function artifactRef(header: { artifactType: string; artifactId: string; schemaVersion: string }): ArtifactRef {
  return { type: header.artifactType, id: header.artifactId, schemaVersion: header.schemaVersion };
}

function proofResultKey(result: ProofResult): string {
  return [
    result.obligationId,
    result.method,
    result.verifier.kind,
    result.verifier.id,
    result.verifier.version,
    result.verdict,
    result.evidenceRefs.map((ref) => `${ref.type}:${ref.id}:${ref.schemaVersion}`).sort().join("|"),
    result.counterEvidenceRefs.map((ref) => `${ref.type}:${ref.id}:${ref.schemaVersion}`).sort().join("|"),
    result.explanation,
  ].join("\0");
}

type PendingSelectedCheck = Omit<ChangeValidationSelectedCheck, "proofObligationIds">;

function selectRequiredChecks(input: {
  input: ValidateChangeInput;
  changedPaths: string[];
  affectedSystemContracts: SystemContract[];
  affectedFlowContracts: FlowContract[];
  matchedCapabilityContracts: CapabilityContract["contracts"];
}): ChangeValidationResult["checkSelection"] {
  const checks = new Map<string, PendingSelectedCheck>();
  let fallbackUsed = false;
  const add = (
    command: string,
    requirement: ChangeValidationCheckRequirement,
    selection: ChangeValidationSelectedCheck["selection"] = "declared",
    kind: ChangeValidationCheckKind = classifyCheckKind(command),
  ): void => {
    const normalized = command.trim().replace(/\s+/gu, " ");
    if (!normalized) return;
    const current = checks.get(normalized);
    if (!current) {
      checks.set(normalized, { command: normalized, kind, selection, requirements: [requirement] });
      return;
    }
    if (selection === "declared") current.selection = "declared";
    if (current.kind === "other" && kind !== "other") current.kind = kind;
    const key = requirementKey(requirement);
    if (!current.requirements.some((entry) => requirementKey(entry) === key)) {
      current.requirements.push(requirement);
    }
  };

  for (const check of input.input.taskChecks ?? []) {
    add(check.command, {
      sourceType: "task-context",
      sourceId: check.sourceId ?? "task-context",
      reason: "The task or its compiled context explicitly declares this verification check.",
      paths: input.changedPaths,
      evidenceRefs: unique(check.evidenceRefs ?? []),
    });
  }

  for (const contract of input.affectedSystemContracts) {
    for (const command of contract.requiredChecks) add(command, {
      sourceType: "system-contract",
      sourceId: contract.contractId,
      reason: `Changed source intersects system contract ${contract.contractId}.`,
      paths: input.changedPaths.filter((path) =>
        contract.system.paths.some((scope) => pathMatchesScope(path, scope))),
      evidenceRefs: [`SystemContract:${contract.header.artifactId}`],
    });
  }

  for (const contract of input.affectedFlowContracts) {
    for (const command of contract.requiredChecks) add(command, {
      sourceType: "flow-contract",
      sourceId: contract.contractId,
      reason: `Changed source intersects end-to-end flow ${contract.contractId}.`,
      paths: input.changedPaths.filter((path) =>
        flowPaths(contract).some((scope) => pathMatchesScope(path, scope))),
      evidenceRefs: [`FlowContract:${contract.header.artifactId}`],
    });
    for (const handoff of contract.handoffs) {
      const paths = changedHandoffPaths(contract, handoff, input.changedPaths);
      if (paths.length === 0) continue;
      const changedEvidencePaths = input.changedPaths.filter((path) =>
        (handoff.verification?.requiredEvidencePaths ?? [])
          .some((scope) => pathMatchesScope(path, scope)));
      for (const command of handoff.verification?.requiredChecks ?? []) add(command, {
        sourceType: "flow-handoff",
        sourceId: flowHandoffSourceId(contract.contractId, handoff.id),
        reason: `Changed source intersects handoff ${contract.contractId}:${handoff.id}.`,
        paths: unique([...paths, ...changedEvidencePaths]),
        evidenceRefs: [`FlowContract:${contract.header.artifactId}`],
      });
    }
  }

  const capabilityArtifactId = input.input.capabilityContract?.header.artifactId;
  for (const contract of input.matchedCapabilityContracts) {
    for (const command of contract.requiredChecks ?? []) add(command, {
      sourceType: "capability-contract",
      sourceId: contract.id,
      reason: `Changed source implements capability contract ${contract.id}.`,
      paths: input.changedPaths,
      evidenceRefs: [`CapabilityContract:${capabilityArtifactId ?? contract.id}`],
    });
  }

  const loadedContracts = new Set([
    ...input.input.systemContracts?.map((contract) => `SystemContract:${contract.contractId}`) ?? [],
    ...input.input.flowContracts?.map((contract) => `FlowContract:${contract.contractId}`) ?? [],
  ]);
  const pactContracts = input.input.taskPact?.contracts.filter((contract) =>
    contract.contractType === "SystemContract" || contract.contractType === "FlowContract") ?? [];
  const scopedBodiesComplete = pactContracts.every((contract) =>
    loadedContracts.has(`${contract.contractType}:${contract.contractId}`));
  const pactChecks = input.input.taskPact?.requiredChecks ?? [];

  if (!scopedBodiesComplete || (pactContracts.length === 0 && pactChecks.length > 0)) {
    fallbackUsed = true;
    for (const command of pactChecks) add(command, {
      sourceType: "task-pact-fallback",
      sourceId: input.input.taskPact?.header.artifactId ?? "task-pact",
      reason: scopedBodiesComplete
        ? "No narrower changed-scope check mapping was available, so the TaskPact check set was retained."
        : "One or more matched contract bodies were unavailable, so Rekon retained the conservative TaskPact check set.",
      paths: input.changedPaths,
      evidenceRefs: input.input.taskPactRef
        ? [`${input.input.taskPactRef.type}:${input.input.taskPactRef.id}`]
        : [],
    });
  }

  const candidates = (input.input.verificationCandidates ?? []).flatMap((candidate) => {
    const paths = unique(candidate.paths
      .map(normalizePath)
      .filter((path) => input.changedPaths.includes(path)));
    const command = normalizeCommand(candidate.command);
    return command && paths.length > 0
      ? [{ ...candidate, command, paths }]
      : [];
  });
  const verificationPaths = input.changedPaths.filter(isVerificationRelevantPath);
  const coveredPaths = new Set([...checks.values()]
    .filter((check) => check.kind === "test")
    .flatMap((check) => check.requirements.flatMap((requirement) => requirement.paths))
    .map(normalizePath)
    .filter(Boolean));
  const uncovered = new Set(verificationPaths.filter((path) => !coveredPaths.has(path)));
  const unusedCandidates = [...candidates];

  while (uncovered.size > 0) {
    const ranked = unusedCandidates
      .map((candidate, index) => ({
        candidate,
        index,
        covers: candidate.paths.filter((path) => uncovered.has(path)),
      }))
      .filter((entry) => entry.covers.length > 0)
      .sort((left, right) => right.covers.length - left.covers.length
        || left.candidate.command.localeCompare(right.candidate.command)
        || left.candidate.sourceId.localeCompare(right.candidate.sourceId));
    const selected = ranked[0];
    if (!selected) break;
    unusedCandidates.splice(selected.index, 1);
    add(selected.candidate.command, {
      sourceType: selected.candidate.sourceType,
      sourceId: selected.candidate.sourceId,
      reason: selected.candidate.reason,
      paths: selected.covers,
      evidenceRefs: selected.candidate.evidenceRefs
        .map((ref) => `${ref.type}:${ref.id}`)
        .sort(),
    }, "evidence-backed", "test");
    for (const path of selected.covers) uncovered.delete(path);
  }

  const warnings = [...uncovered]
    .sort()
    .map((path) => `verification-test-unavailable: no declared or observed test command covers ${path}`);

  return {
    strategy: "changed-scope",
    fallbackUsed,
    evidenceCandidatesConsidered: candidates.length,
    evidenceBackedChecks: [...checks.values()].filter((check) => check.selection === "evidence-backed").length,
    uncoveredTestPaths: [...uncovered].sort(),
    warnings,
    checks: [...checks.values()].map((check) => ({
      ...check,
      requirements: check.requirements.sort((left, right) =>
        left.sourceType.localeCompare(right.sourceType) || left.sourceId.localeCompare(right.sourceId)),
      proofObligationIds: proofObligationIdsForCheck(
        check,
        input.affectedFlowContracts,
        input.changedPaths,
      ),
    })),
  };
}

function proofObligationIdsForCheck(
  check: PendingSelectedCheck,
  flows: FlowContract[],
  changedPaths: string[],
): string[] {
  const obligationIds = new Set<string>([checkProofObligationId(check.command)]);
  for (const requirement of check.requirements) {
    if (requirement.sourceType === "flow-handoff") {
      const matched = findFlowHandoffBySourceId(flows, requirement.sourceId);
      if (matched) {
        obligationIds.add(handoffEdgeObligationId(matched.flow.contractId, matched.handoff.id));
        for (const stage of changedHandoffStages(matched.flow, matched.handoff, changedPaths)) {
          for (const [index] of (stage.responsibilities ?? []).entries()) {
            obligationIds.add(stageResponsibilityObligationId(
              matched.flow.contractId,
              stage.id,
              index,
            ));
          }
        }
      }
      continue;
    }
    if (requirement.sourceType !== "flow-contract") continue;
    const flow = flows.find((candidate) => candidate.contractId === requirement.sourceId);
    if (!flow) continue;
    for (const stage of changedFlowStages(flow, changedPaths)) {
      for (const [index] of (stage.responsibilities ?? []).entries()) {
        obligationIds.add(stageResponsibilityObligationId(flow.contractId, stage.id, index));
      }
    }
    for (const handoff of flow.handoffs) {
      if ((handoff.verification?.requiredChecks?.length ?? 0) > 0) continue;
      if (changedHandoffPaths(flow, handoff, changedPaths).length === 0) continue;
      obligationIds.add(handoffEdgeObligationId(flow.contractId, handoff.id));
    }
  }
  return [...obligationIds].sort();
}

function changedHandoffPaths(
  flow: FlowContract,
  handoff: FlowContractHandoff,
  changedPaths: string[],
): string[] {
  const stageById = new Map(flow.stages.map((stage) => [stage.id, stage]));
  const scopes = unique([
    ...(stageById.get(handoff.fromStageId)?.paths ?? []),
    ...(stageById.get(handoff.toStageId)?.paths ?? []),
  ]);
  const effectiveScopes = scopes.length > 0 ? scopes : flowPaths(flow);
  return changedPaths.filter((path) => effectiveScopes.some((scope) => pathMatchesScope(path, scope)));
}

function changedHandoffStages(
  flow: FlowContract,
  handoff: FlowContractHandoff,
  changedPaths: string[],
): FlowContract["stages"] {
  const endpointIds = new Set([handoff.fromStageId, handoff.toStageId]);
  return changedFlowStages(flow, changedPaths)
    .filter((stage) => endpointIds.has(stage.id));
}

function changedFlowStages(
  flow: FlowContract,
  changedPaths: string[],
): FlowContract["stages"] {
  return flow.stages.filter((stage) =>
    (stage.paths ?? []).some((scope) =>
      changedPaths.some((path) => pathMatchesScope(path, scope))));
}

function handoffEdgeObligationId(flowId: string, handoffId: string): string {
  return `handoff:${flowId}:${handoffId}:edge`;
}

function handoffEvidencePathObligationId(flowId: string, handoffId: string): string {
  return `handoff:${flowId}:${handoffId}:evidence-path`;
}

function isHandoffEvidencePathObligationId(obligationId: string): boolean {
  return /:evidence-path$/u.test(obligationId);
}

function stageResponsibilityConstraintId(flowId: string, stageId: string, index: number): string {
  return `${flowId}.stage.${stageId}.responsibility.${index + 1}`;
}

function stageResponsibilityObligationId(flowId: string, stageId: string, index: number): string {
  return `constraint:${stageResponsibilityConstraintId(flowId, stageId, index)}`;
}

function isStageResponsibilityObligationId(obligationId: string): boolean {
  return /\.stage\..+\.responsibility\.\d+$/u.test(obligationId);
}

function flowHandoffSourceId(flowId: string, handoffId: string): string {
  return `${flowId}:${handoffId}`;
}

function findFlowHandoffBySourceId(
  flows: FlowContract[],
  sourceId: string,
): { flow: FlowContract; handoff: FlowContractHandoff } | undefined {
  for (const flow of flows) {
    for (const handoff of flow.handoffs) {
      if (flowHandoffSourceId(flow.contractId, handoff.id) === sourceId) return { flow, handoff };
    }
  }
  return undefined;
}

function findFlowHandoffByEdgeObligationId(
  flows: FlowContract[],
  obligationId: string,
): { flow: FlowContract; handoff: FlowContractHandoff } | undefined {
  for (const flow of flows) {
    for (const handoff of flow.handoffs) {
      if (handoffEdgeObligationId(flow.contractId, handoff.id) === obligationId) return { flow, handoff };
    }
  }
  return undefined;
}

function findFlowHandoffByObligationId(
  flows: FlowContract[],
  obligationId: string,
): { flow: FlowContract; handoff: FlowContractHandoff } | undefined {
  const matches: Array<{
    flow: FlowContract;
    handoff: FlowContractHandoff;
    prefixLength: number;
  }> = [];
  for (const flow of flows) {
    for (const handoff of flow.handoffs) {
      const prefix = `handoff:${flow.contractId}:${handoff.id}:`;
      if (obligationId.startsWith(prefix)) matches.push({ flow, handoff, prefixLength: prefix.length });
    }
  }
  return matches
    .sort((left, right) => right.prefixLength - left.prefixLength
      || left.flow.contractId.localeCompare(right.flow.contractId)
      || left.handoff.id.localeCompare(right.handoff.id))[0];
}

function findFlowStageResponsibilityByObligationId(
  flows: FlowContract[],
  obligationId: string,
): { flow: FlowContract; stage: FlowContract["stages"][number]; index: number } | undefined {
  for (const flow of flows) {
    for (const stage of flow.stages) {
      for (const [index] of (stage.responsibilities ?? []).entries()) {
        if (stageResponsibilityObligationId(flow.contractId, stage.id, index) === obligationId) {
          return { flow, stage, index };
        }
      }
    }
  }
  return undefined;
}

function classifyCheckKind(command: string): ChangeValidationCheckKind {
  const normalized = normalizeCommand(command).toLowerCase();
  if (/^(?:npm (?:test|run test(?:$|[:_\s-]))|pnpm (?:test|run test(?:$|[:_\s-]))|yarn (?:test|run test(?:$|[:_\s-]))|node --test|(?:npx )?(?:vitest|jest)\b|(?:python(?:3)? -m )?pytest\b|go test\b|cargo test\b|dotnet test\b|swift test\b|(?:bundle exec )?rspec\b|phpunit\b)/u.test(normalized)) {
    return "test";
  }
  if (/\b(?:typecheck|tsc|lint|eslint|biome|ruff|mypy|pyright)\b/u.test(normalized)) return "static";
  if (/\bbuild\b/u.test(normalized)) return "build";
  if (/^rekon artifacts (?:validate|freshness)\b/u.test(normalized)) return "artifact";
  return "other";
}

function isVerificationRelevantPath(path: string): boolean {
  return /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|kts|rb|php|cs|swift|scala|sc|ex|exs|dart|vue|svelte|c|cc|cpp|cxx|h|hh|hpp|hxx)$/iu.test(path);
}

function requirementKey(requirement: ChangeValidationCheckRequirement): string {
  return `${requirement.sourceType}\0${requirement.sourceId}\0${requirement.paths.join("\0")}\0${requirement.evidenceRefs.join("\0")}`;
}

function addTaskPactObligations(
  output: ChangeValidationObligation[],
  pact: TaskPact | undefined,
  changedPaths: string[],
  pactEvidence: string[],
): void {
  if (!pact) return;
  for (const constraint of pact.constraints) {
    const paths = changedPaths.filter((path) => constraint.paths.some((scope) => pathMatchesScope(path, scope)));
    if (paths.length === 0) continue;
    addObligation(output, {
      id: `constraint:${constraint.id}`,
      kind: constraint.kind === "handoff" ? "handoff" : "repository-law",
      statement: constraint.statement,
      reason: `The changed path intersects a ${constraint.kind} clause in the matched TaskPact.`,
      paths,
      evidenceRefs: [...pactEvidence, `${constraint.contractRef.type}:${constraint.contractRef.id}`],
      blockingIfViolated: true,
    });
  }
  for (const obligation of pact.impactObligations) {
    if (obligation.kind === "verify") continue;
    const paths = changedPaths.filter((path) => obligation.paths.some((scope) => pathMatchesScope(path, scope)));
    if (paths.length === 0 && obligation.kind !== "inspect") continue;
    addObligation(output, {
      id: `impact:${obligation.id}`,
      kind: "repository-law",
      statement: obligation.statement,
      reason: obligation.kind === "inspect"
        ? "The matched flow pact requires whole-flow inspection before completion."
        : "The changed path intersects a preservation obligation.",
      paths: paths.length > 0 ? paths : obligation.paths,
      evidenceRefs: [...pactEvidence, ...obligation.contractRefs.map((ref) => `${ref.type}:${ref.id}`)],
      blockingIfViolated: true,
    });
  }
}

function addFlowObligations(
  output: ChangeValidationObligation[],
  flow: FlowContract,
  changedPaths: string[],
): void {
  const evidenceRefs = [`FlowContract:${flow.contractId}`];
  for (const stage of changedFlowStages(flow, changedPaths)) {
    for (const [index, responsibility] of (stage.responsibilities ?? []).entries()) {
      addObligation(output, {
        id: stageResponsibilityObligationId(flow.contractId, stage.id, index),
        kind: "repository-law",
        statement: `Stage ${stage.label ?? stage.id} responsibility: ${responsibility}`,
        reason: `The edit intersects stage ${stage.id} in flow ${flow.contractId}.`,
        paths: changedPaths.filter((path) =>
          (stage.paths ?? []).some((scope) => pathMatchesScope(path, scope))),
        evidenceRefs,
        blockingIfViolated: true,
      });
    }
  }
  for (const handoff of flow.handoffs) {
    const paths = changedHandoffPaths(flow, handoff, changedPaths);
    if (paths.length === 0) continue;
    addObligation(output, {
      id: `handoff:${flow.contractId}:${handoff.id}:edge`,
      kind: "handoff",
      statement: `Preserve the ${handoff.fromStageId} -> ${handoff.toStageId} handoff as a working dependency edge.`,
      reason: "The edit intersects one or both ends of a declared flow handoff.",
      paths,
      evidenceRefs,
      blockingIfViolated: true,
    });
    const requiredEvidencePaths = handoff.verification?.requiredEvidencePaths ?? [];
    if (requiredEvidencePaths.length > 0) {
      addObligation(output, {
        id: handoffEvidencePathObligationId(flow.contractId, handoff.id),
        kind: "handoff",
        statement: `Change at least one required regression evidence path for this handoff: ${requiredEvidencePaths.join(", ")}.`,
        reason: `The ${handoff.fromStageId} -> ${handoff.toStageId} verifier policy requires current-diff regression evidence.`,
        paths: requiredEvidencePaths,
        evidenceRefs,
        blockingIfViolated: true,
      });
    }
    for (const [index, guarantee] of (handoff.guarantees ?? []).entries()) {
      addObligation(output, {
        id: `handoff:${flow.contractId}:${handoff.id}:guarantee:${index + 1}`,
        kind: "handoff",
        statement: guarantee,
        reason: `The edit intersects the ${handoff.fromStageId} -> ${handoff.toStageId} handoff.`,
        paths,
        evidenceRefs,
        blockingIfViolated: true,
      });
    }
    if ((handoff.payload?.requiredFields ?? []).length > 0) {
      addObligation(output, {
        id: `handoff:${flow.contractId}:${handoff.id}:payload`,
        kind: "handoff",
        statement: `Preserve required handoff fields: ${handoff.payload?.requiredFields?.join(", ")}.`,
        reason: `The edit intersects the ${handoff.fromStageId} -> ${handoff.toStageId} baton boundary.`,
        paths,
        evidenceRefs,
        blockingIfViolated: true,
      });
    }
    if (handoff.ordering) addObligation(output, {
      id: `handoff:${flow.contractId}:${handoff.id}:ordering`,
      kind: "handoff",
      statement: handoff.ordering,
      reason: "The matched handoff declares ordering semantics.",
      paths,
      evidenceRefs,
      blockingIfViolated: true,
    });
    if (handoff.failureSemantics) addObligation(output, {
      id: `handoff:${flow.contractId}:${handoff.id}:failure`,
      kind: "handoff",
      statement: handoff.failureSemantics,
      reason: "The matched handoff declares failure semantics.",
      paths,
      evidenceRefs,
      blockingIfViolated: true,
    });
  }
}

function validateDependencyChanges(input: {
  input: ValidateChangeInput;
  violations: ChangeValidationViolation[];
  obligations: ChangeValidationObligation[];
  ownerByPath: ReadonlyMap<string, string | undefined>;
  affectedFlowContracts: FlowContract[];
}): void {
  const graph = input.input.capabilityGraph;
  const ownership = input.input.ownershipMap;
  const contracts = matchedCapabilityContracts(input.input);
  for (const delta of input.input.dependencyChanges ?? []) {
    const sourcePath = normalizePath(delta.path);
    const sourceOwner = input.ownerByPath.get(sourcePath) ?? resolveOwner(sourcePath, ownership);
    const sourceCapabilities = capabilitiesForPath(graph, sourcePath);
    const sourceContracts = contracts.filter((contract) => sourceCapabilities.some((capability) =>
      normalizeTerm(capability.verb) === normalizeTerm(contract.match.verb)
      && normalizeTerm(capability.noun) === normalizeTerm(contract.match.noun)));

    for (const dependency of delta.added) {
      const targetPath = normalizePath(dependency.resolvedPath ?? "");
      const targetOwner = targetPath ? resolveOwner(targetPath, ownership) : undefined;
      const targetCapabilities = targetPath ? capabilitiesForPath(graph, targetPath) : [];
      for (const contract of sourceContracts) {
        const evidenceRefs = [`CapabilityContract:${input.input.capabilityContract?.header.artifactId ?? contract.id}`];
        if (targetOwner && (contract.forbiddenSystems ?? []).includes(targetOwner)) {
          input.violations.push({
            code: "dependency.forbidden-system",
            message: `${sourcePath} adds ${dependency.specifier}, which enters forbidden system ${targetOwner}.`,
            paths: targetPath ? [sourcePath, targetPath] : [sourcePath],
            evidenceRefs,
            details: { contractId: contract.id, targetOwner },
          });
        }
        if (targetOwner && (contract.allowedSystems ?? []).length > 0 && !(contract.allowedSystems ?? []).includes(targetOwner)) {
          input.violations.push({
            code: "dependency.outside-allowed-systems",
            message: `${sourcePath} adds ${dependency.specifier}, owned by ${targetOwner}, outside the contract's allowed systems.`,
            paths: targetPath ? [sourcePath, targetPath] : [sourcePath],
            evidenceRefs,
            details: { contractId: contract.id, targetOwner, allowedSystems: contract.allowedSystems },
          });
        }
        for (const forbidden of contract.forbiddenNeighbors ?? []) {
          if (!targetCapabilities.some((capability) => neighborMatches(capability, forbidden))) continue;
          input.violations.push({
            code: "dependency.forbidden-neighbor",
            message: `${sourcePath} adds forbidden neighbor ${forbidden.verb} ${forbidden.noun}.`,
            paths: targetPath ? [sourcePath, targetPath] : [sourcePath],
            evidenceRefs,
            details: { contractId: contract.id, dependency: dependency.specifier },
          });
        }
      }
      if (targetOwner && sourceOwner && targetOwner !== sourceOwner) {
        const coveredByFlow = input.affectedFlowContracts.some((flow) =>
          flow.systems.includes(sourceOwner) && flow.systems.includes(targetOwner));
        addObligation(input.obligations, {
          id: `dependency-cross-system:${sourcePath}:${dependency.specifier}`,
          kind: "dependency",
          statement: `Confirm the new dependency from ${sourceOwner} to ${targetOwner} preserves the intended architecture boundary.`,
          reason: coveredByFlow
            ? "The dependency crosses systems along a matched flow contract."
            : "The dependency crosses owner systems without a matched flow proving the boundary is intended.",
          paths: targetPath ? [sourcePath, targetPath] : [sourcePath],
          evidenceRefs: coveredByFlow
            ? input.affectedFlowContracts.map((flow) => `FlowContract:${flow.contractId}`)
            : [],
          blockingIfViolated: true,
        });
      }
    }

    for (const contract of sourceContracts) {
      for (const required of contract.requiredNeighbors ?? []) {
        const removedRequired = delta.removed.some((dependency) => {
          const targetPath = normalizePath(dependency.resolvedPath ?? "");
          return targetPath && capabilitiesForPath(graph, targetPath).some((capability) => neighborMatches(capability, required));
        });
        const stillPresent = delta.current.some((dependency) => {
          const targetPath = normalizePath(dependency.resolvedPath ?? "");
          return targetPath && capabilitiesForPath(graph, targetPath).some((capability) => neighborMatches(capability, required));
        });
        if (removedRequired && !stillPresent) {
          input.violations.push({
            code: "dependency.required-neighbor-removed",
            message: `${sourcePath} removes its required neighbor ${required.verb} ${required.noun}.`,
            paths: [sourcePath],
            evidenceRefs: [`CapabilityContract:${input.input.capabilityContract?.header.artifactId ?? contract.id}`],
            details: { contractId: contract.id },
          });
        }
      }
    }
  }
}

function matchedCapabilityContracts(input: ValidateChangeInput) {
  if (!input.capabilityContract || !input.capabilityGraph) return [];
  const capabilities = uniqueBy(
    input.changedPaths.flatMap((path) => capabilitiesForPath(input.capabilityGraph, normalizePath(path))),
    (entry) => entry.id,
  );
  return input.capabilityContract.contracts.filter((contract) =>
    contract.status === "configured"
    && capabilities.some((capability) =>
      normalizeTerm(capability.verb) === normalizeTerm(contract.match.verb)
      && normalizeTerm(capability.noun) === normalizeTerm(contract.match.noun)));
}

function capabilitiesForPath(graph: CapabilityEvidenceGraph | undefined, path: string) {
  if (!graph || !path) return [];
  return graph.capabilities.filter((capability) => capability.implementedBy.some((ref) =>
    normalizePath(ref.id.split("#")[0] ?? "") === path));
}

function neighborMatches(
  capability: CapabilityEvidenceGraph["capabilities"][number],
  neighbor: { verb: string; noun: string },
): boolean {
  return normalizeTerm(capability.verb) === normalizeTerm(neighbor.verb)
    && normalizeTerm(capability.noun) === normalizeTerm(neighbor.noun);
}

function flowPaths(flow: FlowContract): string[] {
  return unique([...flow.paths, ...flow.stages.flatMap((stage) => stage.paths ?? [])]);
}

function resolveOwner(path: string, map: OwnershipMap | undefined): string | undefined {
  if (!map || !path) return undefined;
  const direct = map.entries
    .filter((entry) => pathMatchesScope(path, entry.path))
    .sort((left, right) => right.path.length - left.path.length || right.confidence - left.confidence)[0]
    ?.ownerSystem;
  if (direct) return direct;

  const normalized = normalizePath(path);
  if (!normalized) return undefined;
  const segments = normalized.split("/");
  if (segments.length === 1) return "root";

  const topLevel = segments[0];
  const candidateOwners = unique(map.entries.flatMap((entry) => {
    const entryPath = normalizePath(entry.path);
    return entryPath.split("/")[0] === topLevel ? [entry.ownerSystem] : [];
  }));
  return candidateOwners.length === 1 ? candidateOwners[0] : undefined;
}

function addObligation(output: ChangeValidationObligation[], obligation: ChangeValidationObligation): void {
  output.push({ ...obligation, paths: unique(obligation.paths), evidenceRefs: unique(obligation.evidenceRefs) });
}

function changeSourceState(input: ValidateChangeInput): SourceStateBinding | undefined {
  if (!input.baseRef.trim() || !input.files || input.files.length === 0) return undefined;
  const files: SourceStateFile[] = [];
  for (const file of input.files) {
    const path = normalizePath(file.path);
    if (!path || file.status === "unavailable") return undefined;
    files.push({
      path,
      status: file.status,
      ...(file.beforeSha256 ? { beforeSha256: file.beforeSha256 } : {}),
      ...(file.afterSha256 ? { afterSha256: file.afterSha256 } : {}),
    });
  }
  try {
    return createSourceStateBinding({
      baseRef: input.baseRef,
      files: dedupe(files, (file) => file.path),
    });
  } catch {
    return undefined;
  }
}

function sameArtifactRef(left: ArtifactRef, right: ArtifactRef): boolean {
  return left.type === right.type
    && left.id === right.id
    && left.schemaVersion === right.schemaVersion;
}

function sameStringSet(left: string[], right: string[]): boolean {
  return JSON.stringify(unique(left)) === JSON.stringify(unique(right));
}

function pathMatchesScope(path: string, rawScope: string): boolean {
  const scope = normalizePath(rawScope);
  if (!scope) return false;
  if (!scope.includes("*")) return path === scope || path.startsWith(`${scope}/`);
  const escaped = scope.replace(/[.+?^${}()|[\]\\]/gu, "\\$&").replace(/\*\*/gu, ".*").replace(/\*/gu, "[^/]*");
  return new RegExp(`^${escaped}$`, "u").test(path);
}

function normalizePath(value: string): string {
  const path = value.split("#")[0]?.trim().replace(/\\/gu, "/").replace(/^\.\//u, "") ?? "";
  if (!path || path.startsWith("/") || /^[A-Za-z]:\//u.test(path)) return "";
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return "";
  return segments.join("/");
}

function isRepositoryDocumentationSurface(path: string): boolean {
  if (path === "docs" || path.startsWith("docs/")) return true;
  const basename = path.split("/").at(-1)?.toLowerCase() ?? "";
  return new Set([
    "agents.md",
    "changelog.md",
    "code_of_conduct.md",
    "contributing.md",
    "governance.md",
    "readme.md",
    "security.md",
  ]).has(basename);
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function dedupe<T>(values: T[], key: (value: T) => string): T[] {
  return [...new Map(values.map((value) => [key(value), value])).values()];
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  return dedupe(values, key);
}

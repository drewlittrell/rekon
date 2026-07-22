import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import type {
  CapabilityContract,
  CapabilityEvidenceGraph,
  FlowContract,
  OwnershipMap,
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
  sourceType: "task-context" | "system-contract" | "flow-contract" | "capability-contract" | "task-pact-fallback";
  sourceId: string;
  reason: string;
  paths: string[];
  evidenceRefs: string[];
};

export type ChangeValidationSelectedCheck = {
  command: string;
  requirements: ChangeValidationCheckRequirement[];
};

export type ChangeVerificationEvidence = {
  ref: ArtifactRef;
  generatedAt: string;
  freshness: "fresh" | "stale" | "unknown";
  provenance: "runner-derived" | "recorded";
  verifier: {
    id: string;
    version: string;
  };
  commandResults: Array<{
    command: string;
    status: "passed" | "failed" | "skipped" | "not-run";
    completedAt?: string;
  }>;
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
    checks: ChangeValidationSelectedCheck[];
  };
  baseline: {
    taskPactRef?: ArtifactRef;
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
  files?: ChangeFileEvidence[];
  dependencyChanges?: ChangeDependencyDelta[];
  verificationEvidence?: ChangeVerificationEvidence[];
  runtimeEvidence?: ChangeRuntimeEvidence[];
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
  const proofResults = dedupe([
    ...(input.proofResults ?? []),
    ...boundProof.results,
  ], proofResultKey);
  const proofEvaluation = evaluateProofGate(proofObligations, proofResults);
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
      warnings: boundProof.warnings,
    },
    requiredChecks,
    checkSelection,
    baseline: {
      ...(pactRef ? { taskPactRef: pactRef } : {}),
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
  const requiredEvidence = proofMethods(obligation);
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
    acceptancePolicy: /:edge$/u.test(obligation.id) ? "any-supported" : "all-required",
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
  const handoffMatch = /^handoff:([^:]+):([^:]+):/u.exec(obligation.id);
  if (handoffMatch) {
    const flow = input.flowContracts?.find((candidate) => candidate.contractId === handoffMatch[1]);
    return {
      id: `${handoffMatch[1]}:${handoffMatch[2]}`,
      ...(flow ? { ref: artifactRef(flow.header) } : {}),
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
  const handoffMatch = /^handoff:([^:]+):/u.exec(obligation.id);
  if (handoffMatch) {
    const flow = input.flowContracts?.find((candidate) => candidate.contractId === handoffMatch[1]);
    if (flow) refs.push(artifactRef(flow.header));
  }
  if (obligation.kind === "ownership" && input.ownershipMap) refs.push(artifactRef(input.ownershipMap.header));
  if (obligation.kind === "dependency" && input.capabilityContract) refs.push(artifactRef(input.capabilityContract.header));
  if (obligation.kind === "repository-law") refs.push(...(input.taskPact?.contracts.map((contract) => contract.ref) ?? []));
  return dedupe(refs, (ref) => `${ref.type}:${ref.id}`)
    .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

function proofMethods(obligation: ChangeValidationObligation): ProofMethod[] {
  if (/:edge$/u.test(obligation.id)) return ["test", "runtime", "model-judgment"];
  if (obligation.kind === "baseline" || obligation.kind === "ownership") {
    return ["static"];
  }
  return ["model-judgment"];
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
    ...bindVerificationEvidence(input, warnings),
    ...bindRuntimeEvidence(input, warnings),
    ...bindModelJudgments(input, warnings),
  ];
  return {
    results: dedupe(results, proofResultKey),
    warnings: unique(warnings).sort(),
  };
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

      const flowIds = unique(check.requirements
        .filter((requirement) => requirement.sourceType === "flow-contract")
        .map((requirement) => requirement.sourceId));
      for (const flowId of flowIds) {
        for (const obligation of input.obligations.filter((candidate) =>
          candidate.subject.kind === "flow-handoff"
          && candidate.id.startsWith(`handoff:${flowId}:`)
          && candidate.id.endsWith(":edge"))) {
          results.push(verificationProofResult(obligation.id, verdict, evidence, commandResult.command));
        }
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
      const match = /^handoff:([^:]+):([^:]+):edge$/u.exec(obligation.id);
      if (!match) continue;
      const flow = input.input.flowContracts?.find((candidate) => candidate.contractId === match[1]);
      const handoff = flow?.handoffs.find((candidate) => candidate.id === match[2]);
      if (!handoff) continue;
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

function selectRequiredChecks(input: {
  input: ValidateChangeInput;
  changedPaths: string[];
  affectedSystemContracts: SystemContract[];
  affectedFlowContracts: FlowContract[];
  matchedCapabilityContracts: CapabilityContract["contracts"];
}): ChangeValidationResult["checkSelection"] {
  const checks = new Map<string, ChangeValidationSelectedCheck>();
  let fallbackUsed = false;
  const add = (command: string, requirement: ChangeValidationCheckRequirement): void => {
    const normalized = command.trim().replace(/\s+/gu, " ");
    if (!normalized) return;
    const current = checks.get(normalized);
    if (!current) {
      checks.set(normalized, { command: normalized, requirements: [requirement] });
      return;
    }
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

  return {
    strategy: "changed-scope",
    fallbackUsed,
    checks: [...checks.values()].map((check) => ({
      ...check,
      requirements: check.requirements.sort((left, right) =>
        left.sourceType.localeCompare(right.sourceType) || left.sourceId.localeCompare(right.sourceId)),
    })),
  };
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
  const stageById = new Map(flow.stages.map((stage) => [stage.id, stage]));
  const evidenceRefs = [`FlowContract:${flow.contractId}`];
  for (const handoff of flow.handoffs) {
    const handoffScopes = [
      ...(stageById.get(handoff.fromStageId)?.paths ?? []),
      ...(stageById.get(handoff.toStageId)?.paths ?? []),
    ];
    const paths = changedPaths.filter((path) => handoffScopes.some((scope) => pathMatchesScope(path, scope)));
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
  return map.entries
    .filter((entry) => pathMatchesScope(path, entry.path))
    .sort((left, right) => right.path.length - left.path.length || right.confidence - left.confidence)[0]
    ?.ownerSystem;
}

function addObligation(output: ChangeValidationObligation[], obligation: ChangeValidationObligation): void {
  output.push({ ...obligation, paths: unique(obligation.paths), evidenceRefs: unique(obligation.evidenceRefs) });
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

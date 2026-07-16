import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID } from "./assessment-judgment.js";
import { isNonProductionPath } from "./grammar-divergence.js";

type EvidenceFactLike = {
  kind: string;
  value: Record<string, unknown>;
};

type DependencyFlow = {
  path: string;
  caller: string;
  selectedBinding: string;
  candidateExpression: string;
  collectionExpression: string;
  exitCondition: string;
  selectionLine: number;
  exitLine: number;
};

type DependencyCandidateBypassFlow = {
  path: string;
  caller: string;
  resolver: string;
  candidateParameter: string;
  candidateBindings: string[];
  collectionExpression: string;
  bypassExpression: string;
  selectorExpressions: string[];
  guardExpression: string;
  iterationLine: number;
  bypassLine: number;
  guardLine: number;
};

export function evaluateDependencyResolutionSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  const dependencyFacts = facts.filter((fact) => fact.kind === "dependency_flow");
  const overwriteAssessments = dependencyFacts
    .map(parseDependencyFlow)
    .filter((flow): flow is DependencyFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) => left.path.localeCompare(right.path) || left.selectionLine - right.selectionLine)
    .map((flow) => dependencyResolutionAssessment(flow, evidenceRef));
  const bypassAssessments = dependencyFacts
    .map(parseDependencyCandidateBypassFlow)
    .filter((flow): flow is DependencyCandidateBypassFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) => left.path.localeCompare(right.path) || left.bypassLine - right.bypassLine)
    .map((flow) => dependencyCandidateBypassAssessment(flow, evidenceRef));
  return [...overwriteAssessments, ...bypassAssessments].sort((left, right) =>
    (left.files?.[0] ?? "").localeCompare(right.files?.[0] ?? "")
      || firstEvidenceLine(left) - firstEvidenceLine(right));
}

function dependencyResolutionAssessment(flow: DependencyFlow, evidenceRef: ArtifactRef): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    selectedBinding: flow.selectedBinding,
    candidateExpression: flow.candidateExpression,
    exitCondition: flow.exitCondition,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
    impact: "high",
    title: `Possible later-candidate overwrite in ${flow.path}`,
    description:
      `A loop in ${flow.caller} stores ${flow.candidateExpression} in ${flow.selectedBinding}, exits only when ${flow.exitCondition}, and returns the mutable selection after iteration. A later eligible candidate can replace an earlier match; provider precedence remains to be verified.`,
    subjects: [flow.path, flow.caller],
    files: [flow.path],
    ruleId: SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
    suggestedAction:
      "Run a focused resolution test with two eligible candidates in opposite precedence order and verify that the first authoritative match is returned consistently.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.78,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves candidate assignment, conditional loop exit, and a post-loop return of the mutable selection; intended provider precedence requires semantic or behavioral verification.",
    },
    details: {
      problemClass: "dependency-resolution",
      structuredMechanism: "conditional-candidate-overwrite",
      caller: flow.caller,
      selectedBinding: flow.selectedBinding,
      candidateExpression: flow.candidateExpression,
      collectionExpression: flow.collectionExpression,
      exitCondition: flow.exitCondition,
      sourceEvidence: [
        { path: flow.path, lineStart: flow.selectionLine, lineEnd: flow.selectionLine },
        { path: flow.path, lineStart: flow.exitLine, lineEnd: flow.exitLine },
      ],
    },
  };
}

function dependencyCandidateBypassAssessment(
  flow: DependencyCandidateBypassFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    resolver: flow.resolver,
    candidateParameter: flow.candidateParameter,
    bypassExpression: flow.bypassExpression,
    guardExpression: flow.guardExpression,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
    impact: "high",
    title: `Possible iterated provider bypass in ${flow.path}`,
    description:
      `${flow.resolver} receives ${flow.candidateParameter} from ${flow.collectionExpression}, but the ${flow.guardExpression} branch returns ${flow.bypassExpression} using the outer selector instead of the current candidate. Distinct registrations can collapse to the generic lookup result; the resolver contract remains to be verified.`,
    subjects: [flow.path, flow.caller, flow.resolver, flow.candidateParameter],
    files: [flow.path],
    ruleId: SEMANTIC_DEPENDENCY_RESOLUTION_RULE_ID,
    suggestedAction:
      "Run a focused resolution test with multiple registrations under one selector and verify that each iterated candidate produces its own result in order.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.84,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves candidate iteration, candidate-derived guard state, and a guarded generic lookup that does not reference the current candidate; intended multi-provider behavior still requires verification.",
    },
    details: {
      problemClass: "dependency-resolution",
      structuredMechanism: "iterated-candidate-bypass",
      caller: flow.caller,
      resolver: flow.resolver,
      candidateParameter: flow.candidateParameter,
      candidateBindings: flow.candidateBindings,
      collectionExpression: flow.collectionExpression,
      bypassExpression: flow.bypassExpression,
      selectorExpressions: flow.selectorExpressions,
      guardExpression: flow.guardExpression,
      sourceEvidence: [...new Set([flow.iterationLine, flow.guardLine, flow.bypassLine])]
        .sort((left, right) => left - right)
        .map((line) => ({ path: flow.path, lineStart: line, lineEnd: line })),
    },
  };
}

function parseDependencyFlow(fact: EvidenceFactLike): DependencyFlow | undefined {
  const { value } = fact;
  if (typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.selectedBinding !== "string"
    || typeof value.candidateExpression !== "string"
    || typeof value.collectionExpression !== "string"
    || value.exitKind !== "conditional-break"
    || typeof value.exitCondition !== "string"
    || value.returnedAfterLoop !== true
    || !isLocation(value.selectionLocation)
    || !isLocation(value.exitLocation)) {
    return undefined;
  }
  return {
    path: value.source,
    caller: value.caller,
    selectedBinding: value.selectedBinding,
    candidateExpression: value.candidateExpression,
    collectionExpression: value.collectionExpression,
    exitCondition: value.exitCondition,
    selectionLine: value.selectionLocation.line,
    exitLine: value.exitLocation.line,
  };
}

function parseDependencyCandidateBypassFlow(fact: EvidenceFactLike): DependencyCandidateBypassFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "iterated-candidate-bypass"
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.resolver !== "string"
    || typeof value.candidateParameter !== "string"
    || !isStringArray(value.candidateBindings)
    || !value.candidateBindings.includes(value.candidateParameter)
    || typeof value.collectionExpression !== "string"
    || typeof value.bypassExpression !== "string"
    || !isStringArray(value.selectorExpressions)
    || value.selectorExpressions.length === 0
    || typeof value.guardExpression !== "string"
    || !isLocation(value.iterationLocation)
    || !isLocation(value.bypassLocation)
    || !isLocation(value.guardLocation)) {
    return undefined;
  }
  return {
    path: value.source,
    caller: value.caller,
    resolver: value.resolver,
    candidateParameter: value.candidateParameter,
    candidateBindings: value.candidateBindings,
    collectionExpression: value.collectionExpression,
    bypassExpression: value.bypassExpression,
    selectorExpressions: value.selectorExpressions,
    guardExpression: value.guardExpression,
    iterationLine: value.iterationLocation.line,
    bypassLine: value.bypassLocation.line,
    guardLine: value.guardLocation.line,
  };
}

function isLocation(value: unknown): value is { line: number } {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Number.isInteger((value as { line?: unknown }).line);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length > 0);
}

function firstEvidenceLine(assessment: Assessment): number {
  const sourceEvidence = assessment.details?.sourceEvidence;
  if (!Array.isArray(sourceEvidence)) return Number.MAX_SAFE_INTEGER;
  const first = sourceEvidence[0];
  return typeof first === "object" && first !== null && Number.isInteger((first as { lineStart?: unknown }).lineStart)
    ? (first as { lineStart: number }).lineStart
    : Number.MAX_SAFE_INTEGER;
}

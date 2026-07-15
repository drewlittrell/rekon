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

export function evaluateDependencyResolutionSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  return facts
    .filter((fact) => fact.kind === "dependency_flow")
    .map(parseDependencyFlow)
    .filter((flow): flow is DependencyFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) => left.path.localeCompare(right.path) || left.selectionLine - right.selectionLine)
    .map((flow) => dependencyResolutionAssessment(flow, evidenceRef));
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

function isLocation(value: unknown): value is { line: number } {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Number.isInteger((value as { line?: unknown }).line);
}

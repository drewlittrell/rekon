import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { SEMANTIC_SCOPE_RESOLUTION_RULE_ID } from "./assessment-judgment.js";
import { isNonProductionPath } from "./grammar-divergence.js";

type EvidenceFactLike = {
  kind: string;
  value: Record<string, unknown>;
};

type NameOnlyScopeFlow = {
  path: string;
  caller: string;
  bindTarget: string;
  scopeBinding: string;
  analysisExpression: string;
  referenceCollection: string;
  referenceParameter: string;
  ownerLookup: string;
  analysisLine: number;
  collectionLine: number;
  ownerLookupLine: number;
};

export function evaluateScopeResolutionSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  return facts
    .filter((fact) => fact.kind === "scope_model")
    .map(parseNameOnlyScopeFlow)
    .filter((flow): flow is NameOnlyScopeFlow =>
      flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) =>
      left.path.localeCompare(right.path) || left.collectionLine - right.collectionLine)
    .map((flow) => nameOnlyScopeAssessment(flow, evidenceRef));
}

function nameOnlyScopeAssessment(
  flow: NameOnlyScopeFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    bindTarget: flow.bindTarget,
    analysisExpression: flow.analysisExpression,
    ownerLookup: flow.ownerLookup,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_SCOPE_RESOLUTION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
    impact: "high",
    title: `Possible shadowed binding capture in ${flow.path}`,
    description:
      `${flow.caller} builds ${flow.bindTarget} from name-only ${flow.referenceCollection} entries and resolves each with ${flow.ownerLookup} from one scope anchor. Distinct reference occurrences that share a name can resolve to different declarations, so a locally shadowed value can be treated as an outer binding.`,
    subjects: [flow.path, flow.caller, flow.bindTarget, flow.scopeBinding],
    files: [flow.path],
    ruleId: SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
    suggestedAction:
      "Run focused transform tests with fully and partially shadowed bindings, and resolve each reference occurrence to its declaring scope before selecting captured values.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.86,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves that binding selection iterates reference names and performs owner lookup from one scope object; whether the transform mishandles a concrete shadowing case still requires focused verification.",
    },
    details: {
      problemClass: "scope-resolution",
      structuredMechanism: "name-only-reference-owner",
      caller: flow.caller,
      bindTarget: flow.bindTarget,
      scopeBinding: flow.scopeBinding,
      analysisExpression: flow.analysisExpression,
      referenceCollection: flow.referenceCollection,
      referenceParameter: flow.referenceParameter,
      ownerLookup: flow.ownerLookup,
      sourceEvidence: [...new Set([
        flow.analysisLine,
        flow.collectionLine,
        flow.ownerLookupLine,
      ])]
        .sort((left, right) => left - right)
        .map((line) => ({ path: flow.path, lineStart: line, lineEnd: line })),
    },
  };
}

function parseNameOnlyScopeFlow(fact: EvidenceFactLike): NameOnlyScopeFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "name-only-reference-owner"
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.bindTarget !== "string"
    || typeof value.scopeBinding !== "string"
    || typeof value.analysisExpression !== "string"
    || typeof value.referenceCollection !== "string"
    || typeof value.referenceParameter !== "string"
    || typeof value.ownerLookup !== "string") {
    return undefined;
  }
  const analysisLine = locationLineOf(value.analysisLocation);
  const collectionLine = locationLineOf(value.collectionLocation);
  const ownerLookupLine = locationLineOf(value.ownerLookupLocation);
  if (!analysisLine || !collectionLine || !ownerLookupLine) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    bindTarget: value.bindTarget,
    scopeBinding: value.scopeBinding,
    analysisExpression: value.analysisExpression,
    referenceCollection: value.referenceCollection,
    referenceParameter: value.referenceParameter,
    ownerLookup: value.ownerLookup,
    analysisLine,
    collectionLine,
    ownerLookupLine,
  };
}

function locationLineOf(value: unknown): number | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const line = (value as { line?: unknown }).line;
  return Number.isInteger(line) && (line as number) > 0 ? line as number : undefined;
}

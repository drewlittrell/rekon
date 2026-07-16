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

type ScopeTraversalEscapeFlow = {
  path: string;
  visitor: string;
  scopeHandler: string;
  pathParameter: string;
  bindingCheck: string;
  skipExpression: string;
  modeledExceptions: string[];
  missingParentEvaluatedChildren: string[];
  handlerLine: number;
  bindingCheckLine: number;
  skipLine: number;
  exceptionLine: number;
};

type ReferencePositionFlow = {
  path: string;
  caller: string;
  parentParameter: string;
  modeledExclusions: string[];
  missingExclusion: string;
  locationLine: number;
  methodExclusionLine: number;
  propertyKeyExclusionLine: number;
};

export function evaluateScopeResolutionSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  const scopeFacts = facts.filter((fact) => fact.kind === "scope_model");
  const nameOnlyAssessments = scopeFacts
    .map(parseNameOnlyScopeFlow)
    .filter((flow): flow is NameOnlyScopeFlow =>
      flow !== undefined && !isNonProductionPath(flow.path))
    .map((flow) => nameOnlyScopeAssessment(flow, evidenceRef));
  const traversalAssessments = scopeFacts
    .map(parseScopeTraversalEscapeFlow)
    .filter((flow): flow is ScopeTraversalEscapeFlow =>
      flow !== undefined && !isNonProductionPath(flow.path))
    .map((flow) => scopeTraversalEscapeAssessment(flow, evidenceRef));
  const referencePositionAssessments = scopeFacts
    .map(parseReferencePositionFlow)
    .filter((flow): flow is ReferencePositionFlow =>
      flow !== undefined && !isNonProductionPath(flow.path))
    .map((flow) => referencePositionAssessment(flow, evidenceRef));
  return [...nameOnlyAssessments, ...traversalAssessments, ...referencePositionAssessments].sort((left, right) =>
    (left.files?.[0] ?? "").localeCompare(right.files?.[0] ?? "")
      || firstEvidenceLine(left) - firstEvidenceLine(right));
}

function referencePositionAssessment(
  flow: ReferencePositionFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    modeledExclusions: flow.modeledExclusions,
    missingExclusion: flow.missingExclusion,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_SCOPE_RESOLUTION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
    impact: "high",
    title: `Possible class-property key misclassification in ${flow.path}`,
    description:
      `${flow.caller} excludes ${flow.modeledExclusions.join(" and ")} from identifier references, but has no visible ${flow.missingExclusion} rule. A noncomputed class property key can therefore be treated as a value reference while its initializer remains a real reference position.`,
    subjects: [flow.path, flow.caller, flow.missingExclusion],
    files: [flow.path],
    ruleId: SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
    suggestedAction:
      "Exercise class fields whose noncomputed key matches an imported binding and whose initializer references the same binding, then exclude only the key while preserving initializer traversal.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.9,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves an identifier-reference classifier models adjacent noncomputed key positions but omits PropertyDefinition keys; transform output remains to be verified.",
    },
    details: {
      problemClass: "scope-resolution",
      structuredMechanism: "noncomputed-class-property-key-reference",
      caller: flow.caller,
      parentParameter: flow.parentParameter,
      modeledExclusions: flow.modeledExclusions,
      missingExclusion: flow.missingExclusion,
      sourceEvidence: [...new Set([
        flow.locationLine,
        flow.methodExclusionLine,
        flow.propertyKeyExclusionLine,
      ])]
        .sort((left, right) => left - right)
        .map((line) => ({ path: flow.path, lineStart: line, lineEnd: line })),
    },
  };
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

function scopeTraversalEscapeAssessment(
  flow: ScopeTraversalEscapeFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    visitor: flow.visitor,
    bindingCheck: flow.bindingCheck,
    skipExpression: flow.skipExpression,
    missingParentEvaluatedChildren: flow.missingParentEvaluatedChildren,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_SCOPE_RESOLUTION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
    impact: "high",
    title: `Possible skipped parent-scope expression in ${flow.path}`,
    description:
      `${flow.visitor}.${flow.scopeHandler} skips traversal when ${flow.bindingCheck}, while preserving ${flow.modeledExceptions.join(", ")} but not ${flow.missingParentEvaluatedChildren.join(", ")}. A switch body that shadows the renamed binding can therefore prevent the parent-evaluated discriminant from being rewritten.`,
    subjects: [flow.path, flow.visitor, ...flow.missingParentEvaluatedChildren],
    files: [flow.path],
    ruleId: SEMANTIC_SCOPE_RESOLUTION_RULE_ID,
    suggestedAction:
      "Add focused transform fixtures where switch cases shadow identifiers used by identifier, member, binary, and call-expression discriminants, then explicitly revisit the discriminant before skipping the child scope.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.92,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves a visitor-style Scope handler skips a shadowed binding, already models another parent-evaluated exception, and omits switch discriminant requeueing; concrete transform corruption still requires focused verification.",
    },
    details: {
      problemClass: "scope-resolution",
      structuredMechanism: "switch-discriminant-not-requeued",
      visitor: flow.visitor,
      scopeHandler: flow.scopeHandler,
      pathParameter: flow.pathParameter,
      bindingCheck: flow.bindingCheck,
      skipExpression: flow.skipExpression,
      modeledExceptions: flow.modeledExceptions,
      missingParentEvaluatedChildren: flow.missingParentEvaluatedChildren,
      sourceEvidence: [...new Set([
        flow.handlerLine,
        flow.bindingCheckLine,
        flow.skipLine,
        flow.exceptionLine,
      ])]
        .sort((left, right) => left - right)
        .map((line) => ({ path: flow.path, lineStart: line, lineEnd: line })),
      traversalEvidence: [{
        path: flow.path,
        visitor: flow.visitor,
        skippedBy: flow.skipExpression,
        missingChild: "SwitchStatement.discriminant",
        line: flow.skipLine,
      }],
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

function parseScopeTraversalEscapeFlow(
  fact: EvidenceFactLike,
): ScopeTraversalEscapeFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "switch-discriminant-not-requeued"
    || typeof value.source !== "string"
    || typeof value.visitor !== "string"
    || typeof value.scopeHandler !== "string"
    || typeof value.pathParameter !== "string"
    || typeof value.bindingCheck !== "string"
    || typeof value.skipExpression !== "string") {
    return undefined;
  }
  const modeledExceptions = stringArray(value.modeledExceptions);
  const missingParentEvaluatedChildren = stringArray(value.missingParentEvaluatedChildren);
  const handlerLine = locationLineOf(value.handlerLocation);
  const bindingCheckLine = locationLineOf(value.bindingCheckLocation);
  const skipLine = locationLineOf(value.skipLocation);
  const exceptionLine = locationLineOf(value.exceptionLocation);
  if (!modeledExceptions.includes("method-computed-key-and-decorators")
    || !missingParentEvaluatedChildren.includes("SwitchStatement.discriminant")
    || !handlerLine
    || !bindingCheckLine
    || !skipLine
    || !exceptionLine) {
    return undefined;
  }
  return {
    path: value.source,
    visitor: value.visitor,
    scopeHandler: value.scopeHandler,
    pathParameter: value.pathParameter,
    bindingCheck: value.bindingCheck,
    skipExpression: value.skipExpression,
    modeledExceptions,
    missingParentEvaluatedChildren,
    handlerLine,
    bindingCheckLine,
    skipLine,
    exceptionLine,
  };
}

function parseReferencePositionFlow(fact: EvidenceFactLike): ReferencePositionFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "noncomputed-class-property-key-reference"
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.parentParameter !== "string"
    || !Array.isArray(value.modeledExclusions)
    || value.modeledExclusions.some((entry) => typeof entry !== "string")
    || value.missingExclusion !== "PropertyDefinition.noncomputed-key") {
    return undefined;
  }
  const locationLine = locationLineOf(value.location);
  const methodExclusionLine = locationLineOf(value.methodExclusionLocation);
  const propertyKeyExclusionLine = locationLineOf(value.propertyKeyExclusionLocation);
  if (!locationLine || !methodExclusionLine || !propertyKeyExclusionLine) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    parentParameter: value.parentParameter,
    modeledExclusions: value.modeledExclusions as string[],
    missingExclusion: value.missingExclusion,
    locationLine,
    methodExclusionLine,
    propertyKeyExclusionLine,
  };
}

function locationLineOf(value: unknown): number | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const line = (value as { line?: unknown }).line;
  return Number.isInteger(line) && (line as number) > 0 ? line as number : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0))]
    : [];
}

function firstEvidenceLine(assessment: Assessment): number {
  const sourceEvidence = assessment.details?.sourceEvidence;
  if (!Array.isArray(sourceEvidence)) return Number.MAX_SAFE_INTEGER;
  const first = sourceEvidence[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return Number.MAX_SAFE_INTEGER;
  const lineStart = (first as { lineStart?: unknown }).lineStart;
  return typeof lineStart === "number" && Number.isInteger(lineStart)
    ? lineStart
    : Number.MAX_SAFE_INTEGER;
}

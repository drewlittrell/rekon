import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { SEMANTIC_ERROR_PROPAGATION_RULE_ID } from "./assessment-judgment.js";
import { isNonProductionPath } from "./grammar-divergence.js";

type EvidenceFactLike = {
  kind: string;
  value: Record<string, unknown>;
};

type IdentityMapping = {
  identity: string;
  property: string;
  expression: string;
  line: number;
};

type ErrorFlow = {
  path: string;
  caller: string;
  errorIdentity: string;
  guardExpression: string;
  guardTerms: string[];
  guardLine: number;
  identityMappings: IdentityMapping[];
};

export function evaluateErrorPropagationSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  return facts
    .filter((fact) => fact.kind === "error_flow")
    .map(parseErrorFlow)
    .filter((flow): flow is ErrorFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .filter(hasMergedIdentityConsequence)
    .sort((left, right) => left.path.localeCompare(right.path) || left.guardLine - right.guardLine)
    .map((flow) => errorPropagationAssessment(flow, evidenceRef));
}

function hasMergedIdentityConsequence(flow: ErrorFlow): boolean {
  const thrownMapping = flow.identityMappings.find((mapping) => mapping.identity === flow.errorIdentity);
  if (!thrownMapping) return false;
  return flow.identityMappings.some((mapping) =>
    mapping.identity !== flow.errorIdentity
    && flow.guardTerms.some((term) => termMatchesMapping(term, mapping)));
}

function termMatchesMapping(term: string, mapping: IdentityMapping): boolean {
  const lower = term.toLowerCase();
  const identityStem = mapping.identity.replace(/Error$/u, "").toLowerCase();
  const propertyStem = mapping.property.toLowerCase().replace(/(?:ed|ion)$/u, "");
  return (identityStem.length >= 4 && lower.includes(identityStem))
    || (propertyStem.length >= 4 && lower.includes(propertyStem));
}

function errorPropagationAssessment(flow: ErrorFlow, evidenceRef: ArtifactRef): Assessment {
  const mappings = flow.identityMappings.filter((mapping) =>
    mapping.identity === flow.errorIdentity || flow.guardTerms.some((term) => termMatchesMapping(term, mapping)));
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    errorIdentity: flow.errorIdentity,
    guardExpression: flow.guardExpression,
    mappings: mappings.map((mapping) => [mapping.identity, mapping.property]),
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_ERROR_PROPAGATION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    impact: "high",
    title: `Possible merged error identity in ${flow.path}`,
    description:
      `A compound guard in ${flow.caller} maps distinct visible causes to ${flow.errorIdentity}, while this file maps those causes to different downstream error properties. The structure can misclassify a valid failure path; runtime ordering remains to be verified.`,
    subjects: [flow.path, flow.caller],
    files: [flow.path],
    ruleId: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    suggestedAction:
      "Run a focused regression that exercises each guard term before the normal operation starts and verify that each resulting action preserves its distinct error identity and dispatch behavior.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.78,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves a compound guard, one thrown identity, and distinct identity mappings in the same source file; runtime ordering and externally visible behavior still require verification.",
    },
    details: {
      problemClass: "error-propagation",
      structuredMechanism: "merged-error-identity",
      caller: flow.caller,
      errorIdentity: flow.errorIdentity,
      guardExpression: flow.guardExpression,
      guardTerms: flow.guardTerms,
      identityMappings: mappings,
      sourceEvidence: [
        { path: flow.path, lineStart: flow.guardLine, lineEnd: flow.guardLine },
        ...mappings.map((mapping) => ({ path: flow.path, lineStart: mapping.line, lineEnd: mapping.line })),
      ],
    },
  };
}

function parseErrorFlow(fact: EvidenceFactLike): ErrorFlow | undefined {
  const { value } = fact;
  if (typeof value.source !== "string" || typeof value.caller !== "string" || typeof value.errorIdentity !== "string") {
    return undefined;
  }
  if (!Array.isArray(value.guards) || !Array.isArray(value.identityMappings)) return undefined;
  const guard = value.guards.find((entry) => {
    if (!isRecord(entry) || entry.operator !== "or" || !Array.isArray(entry.terms)) return false;
    return entry.terms.filter((term) => typeof term === "string").length > 1;
  });
  if (!isRecord(guard) || typeof guard.expression !== "string" || typeof guard.location !== "object") return undefined;
  const location = isRecord(guard.location) ? guard.location : undefined;
  if (!location || !Number.isInteger(location.line)) return undefined;
  const guardTerms = Array.isArray(guard.terms)
    ? guard.terms.filter((term): term is string => typeof term === "string")
    : [];
  if (guardTerms.length < 2) return undefined;
  const identityMappings = value.identityMappings
    .map(parseIdentityMapping)
    .filter((mapping): mapping is IdentityMapping => mapping !== undefined);
  if (identityMappings.length < 2) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    errorIdentity: value.errorIdentity,
    guardExpression: guard.expression,
    guardTerms,
    guardLine: location.line as number,
    identityMappings,
  };
}

function parseIdentityMapping(value: unknown): IdentityMapping | undefined {
  if (!isRecord(value) || typeof value.identity !== "string" || typeof value.property !== "string"
    || typeof value.expression !== "string" || !isRecord(value.location) || !Number.isInteger(value.location.line)) {
    return undefined;
  }
  return {
    identity: value.identity,
    property: value.property,
    expression: value.expression,
    line: value.location.line as number,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

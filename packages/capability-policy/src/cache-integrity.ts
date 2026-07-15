import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { SEMANTIC_CACHE_INTEGRITY_RULE_ID } from "./assessment-judgment.js";
import { isNonProductionPath } from "./grammar-divergence.js";

type EvidenceFactLike = {
  kind: string;
  value: Record<string, unknown>;
};

type CacheFlow = {
  path: string;
  caller: string;
  factory: string;
  cacheBinding: string;
  keyExpression: string;
  keyParameters: string[];
  omittedResultParameters: string[];
  guardExpression: string;
  guardedReturnExpression: string;
  fallbackReturnExpression: string;
  locationLine: number;
  guardLine: number;
  fallbackLine: number;
};

export function evaluateCacheIntegritySignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  return facts
    .filter((fact) => fact.kind === "cache_flow")
    .map(parseCacheFlow)
    .filter((flow): flow is CacheFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) => left.path.localeCompare(right.path) || left.locationLine - right.locationLine)
    .map((flow) => cacheIntegrityAssessment(flow, evidenceRef));
}

function cacheIntegrityAssessment(flow: CacheFlow, evidenceRef: ArtifactRef): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    cacheBinding: flow.cacheBinding,
    keyExpression: flow.keyExpression,
    omittedResultParameters: flow.omittedResultParameters,
    guardExpression: flow.guardExpression,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_CACHE_INTEGRITY_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_CACHE_INTEGRITY_RULE_ID,
    impact: "high",
    title: `Possible incomplete cache key in ${flow.path}`,
    description:
      `${flow.caller} memoizes callback results in ${flow.cacheBinding} by ${flow.keyExpression}, but a result branch depends on ${flow.omittedResultParameters.join(", ")} outside that key. Calls that share the key but request different result conditions can reuse the wrong cached result; the cross-call sequence remains to be verified.`,
    subjects: [flow.path, flow.caller, flow.cacheBinding],
    files: [flow.path],
    ruleId: SEMANTIC_CACHE_INTEGRITY_RULE_ID,
    suggestedAction:
      "Exercise two calls with the same cache key and different omitted parameters, then either include every result-shaping parameter in the key or cache the underlying disk and network reads separately.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.82,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves that a memoized callback branches on an outer parameter absent from its key and can return distinct results; call ordering and user-visible impact still require verification.",
    },
    details: {
      problemClass: "cache-integrity",
      structuredMechanism: "result-parameter-omitted-from-cache-key",
      caller: flow.caller,
      factory: flow.factory,
      cacheBinding: flow.cacheBinding,
      keyExpression: flow.keyExpression,
      keyParameters: flow.keyParameters,
      omittedResultParameters: flow.omittedResultParameters,
      guardExpression: flow.guardExpression,
      guardedReturnExpression: flow.guardedReturnExpression,
      fallbackReturnExpression: flow.fallbackReturnExpression,
      sourceEvidence: [
        { path: flow.path, lineStart: flow.locationLine, lineEnd: flow.locationLine },
        { path: flow.path, lineStart: flow.guardLine, lineEnd: flow.guardLine },
        { path: flow.path, lineStart: flow.fallbackLine, lineEnd: flow.fallbackLine },
      ],
    },
  };
}

function parseCacheFlow(fact: EvidenceFactLike): CacheFlow | undefined {
  const { value } = fact;
  if (typeof value.source !== "string" || typeof value.caller !== "string"
    || !isCacheFactory(value.factory)
    || typeof value.cacheBinding !== "string" || typeof value.keyExpression !== "string"
    || typeof value.guardExpression !== "string"
    || typeof value.guardedReturnExpression !== "string"
    || typeof value.fallbackReturnExpression !== "string") {
    return undefined;
  }
  const keyParameters = stringArray(value.keyParameters);
  const omittedResultParameters = stringArray(value.omittedResultParameters);
  if (keyParameters.length === 0 || omittedResultParameters.length === 0
    || omittedResultParameters.some((name) => keyParameters.includes(name))) {
    return undefined;
  }
  const locationLine = locationLineOf(value.location);
  const guardLine = locationLineOf(value.guardLocation);
  const fallbackLine = locationLineOf(value.fallbackLocation);
  if (!locationLine || !guardLine || !fallbackLine) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    factory: value.factory,
    cacheBinding: value.cacheBinding,
    keyExpression: value.keyExpression,
    keyParameters,
    omittedResultParameters,
    guardExpression: value.guardExpression,
    guardedReturnExpression: value.guardedReturnExpression,
    fallbackReturnExpression: value.fallbackReturnExpression,
    locationLine,
    guardLine,
    fallbackLine,
  };
}

function isCacheFactory(value: unknown): value is string {
  return typeof value === "string" && value.split(".").at(-1) === "getFactoryWithDefault";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0))].sort()
    : [];
}

function locationLineOf(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const line = (value as { line?: unknown }).line;
  return typeof line === "number" && Number.isInteger(line) && line > 0 ? line : undefined;
}

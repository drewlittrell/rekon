import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID } from "./assessment-judgment.js";
import { isNonProductionPath } from "./grammar-divergence.js";

type EvidenceFactLike = {
  kind: string;
  value: Record<string, unknown>;
};

type CleanupFlow = {
  path: string;
  caller: string;
  mechanism: "fail-fast-aggregate" | "sequential-unhandled-awaits";
  obligations: string[];
  locationLine: number;
  obligationLines: number[];
};

type AsyncEffectFlow = {
  path: string;
  caller: string;
  hook: string;
  promiseMethod: "all" | "allSettled";
  dependencies: string[];
  stateSetters: string[];
  aggregateExpression: string;
  effectLine: number;
  continuationLine: number;
  setterLines: number[];
  dependencyLine: number;
};

const CLEANUP_CALLER_NAMES = new Set([
  "cleanup",
  "close",
  "destroy",
  "disconnect",
  "dispose",
  "finalize",
  "shutdown",
  "stop",
  "teardown",
  "terminate",
]);

export function evaluateCleanupCompletenessSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  const cleanupFacts = facts.filter((fact) => fact.kind === "cleanup_flow");
  const lifecycleAssessments = cleanupFacts
    .map(parseCleanupFlow)
    .filter((flow): flow is CleanupFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .map((flow) => cleanupCompletenessAssessment(flow, evidenceRef));
  const asyncEffectAssessments = cleanupFacts
    .map(parseAsyncEffectFlow)
    .filter((flow): flow is AsyncEffectFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .map((flow) => asyncEffectAssessment(flow, evidenceRef));
  return [...lifecycleAssessments, ...asyncEffectAssessments].sort((left, right) =>
    (left.files?.[0] ?? "").localeCompare(right.files?.[0] ?? "")
      || firstEvidenceLine(left) - firstEvidenceLine(right));
}

function cleanupCompletenessAssessment(flow: CleanupFlow, evidenceRef: ArtifactRef): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    mechanism: flow.mechanism,
    obligations: flow.obligations,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID}:${flow.path}:${fingerprint}`;
  const mechanismDescription = flow.mechanism === "fail-fast-aggregate"
    ? "waits for multiple cleanup obligations with fail-fast Promise.all"
    : "awaits multiple cleanup obligations sequentially without insulating later waits";
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
    impact: "high",
    title: `Possible premature cleanup completion in ${flow.path}`,
    description:
      `${flow.caller} ${mechanismDescription}. A rejection can make the lifecycle operation exit before every visible obligation has settled; whether those obligations can reject and leave material state behind remains to be verified.`,
    subjects: [flow.path, flow.caller, ...flow.obligations],
    files: [flow.path],
    ruleId: SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
    suggestedAction:
      "Exercise rejection from each cleanup obligation, verify every sibling settles before lifecycle completion, and use all-settled or per-obligation insulation when cleanup must continue.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.84,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves a fail-fast wait shape inside an explicit lifecycle function; rejection behavior and retained runtime state still require verification.",
    },
    details: {
      problemClass: "cleanup-completeness",
      structuredMechanism: flow.mechanism,
      caller: flow.caller,
      obligations: flow.obligations,
      sourceEvidence: uniqueLines([flow.locationLine, ...flow.obligationLines]).map((line) => ({
        path: flow.path,
        lineStart: line,
        lineEnd: line,
      })),
    },
  };
}

function asyncEffectAssessment(flow: AsyncEffectFlow, evidenceRef: ArtifactRef): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    hook: flow.hook,
    promiseMethod: flow.promiseMethod,
    dependencies: flow.dependencies,
    stateSetters: flow.stateSetters,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID}:${flow.path}:${fingerprint}`;
  const setters = flow.stateSetters.join(", ");
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
    impact: "medium",
    title: `Possible superseded effect update in ${flow.path}`,
    description:
      `${flow.caller} starts ${flow.aggregateExpression} inside ${flow.hook} with dependencies [${flow.dependencies.join(", ")}], then calls ${setters} from the continuation without returning effect cleanup. If dependencies change before settlement, an older continuation can overwrite state produced by a newer effect run.`,
    subjects: [flow.path, flow.caller, ...flow.stateSetters],
    files: [flow.path],
    ruleId: SEMANTIC_CLEANUP_COMPLETENESS_RULE_ID,
    suggestedAction:
      `Rerender with changed dependencies before ${flow.aggregateExpression} settles, then invalidate or abort the superseded continuation in the effect cleanup before calling ${setters}.`,
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.9,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves a React-imported effect with non-empty dependencies, a global Promise aggregate continuation, a useState-derived setter call, and no returned cleanup; settlement ordering and user-visible impact still require verification.",
    },
    details: {
      problemClass: "cleanup-completeness",
      structuredMechanism: "superseded-effect-continuation",
      caller: flow.caller,
      hook: flow.hook,
      promiseMethod: flow.promiseMethod,
      dependencies: flow.dependencies,
      stateSetters: flow.stateSetters,
      aggregateExpression: flow.aggregateExpression,
      sourceEvidence: uniqueLines([
        flow.effectLine,
        flow.continuationLine,
        ...flow.setterLines,
        flow.dependencyLine,
      ]).map((line) => ({
        path: flow.path,
        lineStart: line,
        lineEnd: line,
      })),
      continuationEvidence: [{
        path: flow.path,
        caller: flow.caller,
        hook: flow.hook,
        promiseMethod: flow.promiseMethod,
        dependencies: flow.dependencies,
        stateSetters: flow.stateSetters,
        line: flow.continuationLine,
      }],
      cleanupMatch: "absent-in-effect",
    },
  };
}

function parseCleanupFlow(fact: EvidenceFactLike): CleanupFlow | undefined {
  const { value } = fact;
  if (typeof value.source !== "string" || typeof value.caller !== "string"
    || !CLEANUP_CALLER_NAMES.has(value.caller.toLowerCase())
    || (value.mechanism !== "fail-fast-aggregate" && value.mechanism !== "sequential-unhandled-awaits")) {
    return undefined;
  }
  const obligations = stringArray(value.obligations);
  const obligationLines = locationLinesOf(value.obligationLocations);
  const locationLine = locationLineOf(value.location);
  if (obligations.length < 2 || obligationLines.length < 2 || !locationLine) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    mechanism: value.mechanism,
    obligations,
    locationLine,
    obligationLines,
  };
}

function parseAsyncEffectFlow(fact: EvidenceFactLike): AsyncEffectFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "superseded-effect-continuation"
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.hook !== "string"
    || (value.promiseMethod !== "all" && value.promiseMethod !== "allSettled")
    || typeof value.aggregateExpression !== "string") {
    return undefined;
  }
  const dependencies = stringArray(value.dependencies);
  const stateSetters = stringArray(value.stateSetters);
  const effectLine = locationLineOf(value.location);
  const continuationLine = locationLineOf(value.continuationLocation);
  const setterLines = locationLinesOf(value.setterLocations);
  const dependencyLine = locationLineOf(value.dependencyLocation);
  if (dependencies.length === 0
    || stateSetters.length === 0
    || !effectLine
    || !continuationLine
    || setterLines.length === 0
    || !dependencyLine) {
    return undefined;
  }
  return {
    path: value.source,
    caller: value.caller,
    hook: value.hook,
    promiseMethod: value.promiseMethod,
    dependencies,
    stateSetters,
    aggregateExpression: value.aggregateExpression,
    effectLine,
    continuationLine,
    setterLines,
    dependencyLine,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0))]
    : [];
}

function locationLinesOf(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map(locationLineOf).filter((line): line is number => line !== undefined)
    : [];
}

function locationLineOf(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const line = (value as { line?: unknown }).line;
  return typeof line === "number" && Number.isInteger(line) && line > 0 ? line : undefined;
}

function uniqueLines(lines: readonly number[]): number[] {
  return [...new Set(lines)].sort((left, right) => left - right);
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

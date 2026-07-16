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

type ErrorReasonFlow = {
  path: string;
  caller: string;
  errorIdentity: string;
  causeExpression: string;
  locationLine: number;
  causeLine: number;
};

type PromiseEventErrorBridgeFlow = {
  path: string;
  caller: string;
  emitter: string;
  successEvents: string[];
  locationLine: number;
  successListenerLines: number[];
  rejectionLine: number;
};

type AbortReasonDropFlow = {
  path: string;
  caller: string;
  cancellationBinding: string;
  signalExpression: string;
  rejectionExpression: string;
  locationLine: number;
  cancellationLine: number;
  signalLine: number;
};

type ErrorCodeWrappingFlow = {
  path: string;
  caller: string;
  errorIdentifier: string;
  wrapperExpression: string;
  retryCode: string;
  locationLine: number;
  wrapperLine: number;
  retryCheckLine: number;
};

export function evaluateErrorPropagationSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  const errorFacts = facts.filter((fact) => fact.kind === "error_flow");
  const mergedIdentityAssessments = errorFacts
    .map(parseErrorFlow)
    .filter((flow): flow is ErrorFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .filter(hasMergedIdentityConsequence)
    .sort((left, right) => left.path.localeCompare(right.path) || left.guardLine - right.guardLine)
    .map((flow) => errorPropagationAssessment(flow, evidenceRef));
  const hiddenReasonAssessments = errorFacts
    .map(parseErrorReasonFlow)
    .filter((flow): flow is ErrorReasonFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) => left.path.localeCompare(right.path) || left.locationLine - right.locationLine)
    .map((flow) => hiddenReasonAssessment(flow, evidenceRef));
  const unforwardedEmitterAssessments = errorFacts
    .map(parsePromiseEventErrorBridgeFlow)
    .filter((flow): flow is PromiseEventErrorBridgeFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) => left.path.localeCompare(right.path) || left.locationLine - right.locationLine)
    .map((flow) => unforwardedEmitterErrorAssessment(flow, evidenceRef));
  const abortReasonAssessments = errorFacts
    .map(parseAbortReasonDropFlow)
    .filter((flow): flow is AbortReasonDropFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) => left.path.localeCompare(right.path) || left.locationLine - right.locationLine)
    .map((flow) => abortReasonDropAssessment(flow, evidenceRef));
  const errorCodeAssessments = errorFacts
    .map(parseErrorCodeWrappingFlow)
    .filter((flow): flow is ErrorCodeWrappingFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .map((flow) => errorCodeWrappingAssessment(flow, evidenceRef));
  return [
    ...mergedIdentityAssessments,
    ...hiddenReasonAssessments,
    ...unforwardedEmitterAssessments,
    ...abortReasonAssessments,
    ...errorCodeAssessments,
  ].sort((left, right) =>
    (left.files?.[0] ?? "").localeCompare(right.files?.[0] ?? "")
      || firstEvidenceLine(left) - firstEvidenceLine(right));
}

function errorCodeWrappingAssessment(
  flow: ErrorCodeWrappingFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    wrapperExpression: flow.wrapperExpression,
    retryCode: flow.retryCode,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_ERROR_PROPAGATION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    impact: "high",
    title: `Possible retry error-code loss in ${flow.path}`,
    description:
      `${flow.caller} replaces a stream error with ${flow.wrapperExpression}, while retry policy in the same source branches on ${flow.retryCode}. Wrapping can remove the code and prevent the intended retry path.`,
    subjects: [flow.path, flow.caller, flow.retryCode],
    files: [flow.path],
    ruleId: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    suggestedAction:
      `Exercise a compressed or transformed stream failure carrying ${flow.retryCode}; preserve the original network error for retry classification and wrap only transform-specific failures.`,
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.94,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves a stream error adapter wraps an error through its message, no raw-error rejection exists in that adapter, and the same source branches on a network error code; runtime retry behavior remains to be verified.",
    },
    details: {
      problemClass: "error-propagation",
      structuredMechanism: "error-code-lost-by-wrapping",
      caller: flow.caller,
      errorIdentifier: flow.errorIdentifier,
      wrapperExpression: flow.wrapperExpression,
      retryCode: flow.retryCode,
      sourceEvidence: [...new Set([
        flow.locationLine,
        flow.wrapperLine,
        flow.retryCheckLine,
      ])]
        .sort((left, right) => left - right)
        .map((line) => ({ path: flow.path, lineStart: line, lineEnd: line })),
    },
  };
}

function abortReasonDropAssessment(
  flow: AbortReasonDropFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    cancellationBinding: flow.cancellationBinding,
    signalExpression: flow.signalExpression,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_ERROR_PROPAGATION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    impact: "medium",
    title: `Possible dropped abort reason in ${flow.path}`,
    description:
      `${flow.caller} rejects with ${flow.rejectionExpression} after ${flow.cancellationBinding} is set from ${flow.signalExpression}, but the rejection carries no reason. Cancellation consumers can receive undefined instead of the signal's causal error.`,
    subjects: [flow.path, flow.caller, flow.signalExpression],
    files: [flow.path],
    ruleId: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    suggestedAction:
      `Abort with a distinctive reason and verify the rejection preserves it; pass ${flow.signalExpression}.reason through the Promise rejection path.`,
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.93,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves a signal-backed cancellation flag reaches a zero-argument Promise rejection; downstream handling of undefined remains to be verified.",
    },
    details: {
      problemClass: "error-propagation",
      structuredMechanism: "abort-rejection-without-reason",
      caller: flow.caller,
      cancellationBinding: flow.cancellationBinding,
      signalExpression: flow.signalExpression,
      rejectionExpression: flow.rejectionExpression,
      sourceEvidence: [...new Set([
        flow.cancellationLine,
        flow.signalLine,
        flow.locationLine,
      ])]
        .sort((left, right) => left - right)
        .map((line) => ({ path: flow.path, lineStart: line, lineEnd: line })),
    },
  };
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

function hiddenReasonAssessment(flow: ErrorReasonFlow, evidenceRef: ArtifactRef): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    errorIdentity: flow.errorIdentity,
    causeExpression: flow.causeExpression,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_ERROR_PROPAGATION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    impact: "medium",
    title: `Possible hidden error reason in ${flow.path}`,
    description:
      `${flow.caller} constructs ${flow.errorIdentity} with ${flow.causeExpression} as its cause while passing undefined for the message. If the constructor supplies generic message text, consumers that surface only the message can lose the supplied reason; constructor and consumer behavior remain to be verified.`,
    subjects: [flow.path, flow.caller, flow.errorIdentity, flow.causeExpression],
    files: [flow.path],
    ruleId: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    suggestedAction:
      "Exercise the failure through its public API and logs. Preserve the cause, but supply message text derived from the reason when callers depend on message-level diagnostics.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.86,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves that a meaningful cause expression is paired with an undefined message in an Error-like constructor; constructor defaults, downstream cause handling, and user-visible impact still require verification.",
    },
    details: {
      problemClass: "error-propagation",
      structuredMechanism: "cause-with-default-message",
      caller: flow.caller,
      errorIdentity: flow.errorIdentity,
      causeExpression: flow.causeExpression,
      sourceEvidence: [...new Set([flow.locationLine, flow.causeLine])]
        .sort((left, right) => left - right)
        .map((line) => ({ path: flow.path, lineStart: line, lineEnd: line })),
    },
  };
}

function unforwardedEmitterErrorAssessment(
  flow: PromiseEventErrorBridgeFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    emitter: flow.emitter,
    successEvents: flow.successEvents,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_ERROR_PROPAGATION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    impact: "medium",
    title: `Possible unforwarded emitter error in ${flow.path}`,
    description:
      `${flow.caller} bridges ${flow.emitter} event${flow.successEvents.length === 1 ? "" : "s"} ${flow.successEvents.join(", ")} into a Promise and uses its reject channel for other failures, but no error listener on that emitter forwards to reject. If ${flow.emitter} emits error, the caller may not receive the failure; the emitter contract remains to be verified.`,
    subjects: [flow.path, flow.caller, flow.emitter],
    files: [flow.path],
    ruleId: SEMANTIC_ERROR_PROPAGATION_RULE_ID,
    suggestedAction:
      `Exercise ${flow.emitter}'s error path and verify the returned Promise rejects with the expected error. Add a same-emitter error listener that forwards to reject when the emitter contract requires it.`,
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.84,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves that a Promise resolves from a recognized event on one emitter and uses rejection for other failures without forwarding that emitter's error event; whether the emitter can fail remains to be verified.",
    },
    details: {
      problemClass: "error-propagation",
      structuredMechanism: "unforwarded-emitter-error",
      caller: flow.caller,
      emitter: flow.emitter,
      successEvents: flow.successEvents,
      sourceEvidence: [...new Set([
        flow.locationLine,
        ...flow.successListenerLines,
        flow.rejectionLine,
      ])]
        .sort((left, right) => left - right)
        .map((line) => ({ path: flow.path, lineStart: line, lineEnd: line })),
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

function parseErrorReasonFlow(fact: EvidenceFactLike): ErrorReasonFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "cause-with-default-message"
    || value.action !== "construct"
    || value.messageExpression !== "undefined"
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.errorIdentity !== "string"
    || !/(?:Error|Exception)$/u.test(value.errorIdentity)
    || typeof value.causeExpression !== "string"
    || value.causeExpression.length === 0
    || value.causeExpression === "undefined") {
    return undefined;
  }
  const locationLine = locationLineOf(value.location);
  const causeLine = locationLineOf(value.causeLocation);
  if (!locationLine || !causeLine) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    errorIdentity: value.errorIdentity,
    causeExpression: value.causeExpression,
    locationLine,
    causeLine,
  };
}

function parsePromiseEventErrorBridgeFlow(
  fact: EvidenceFactLike,
): PromiseEventErrorBridgeFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "unforwarded-emitter-error"
    || value.action !== "bridge"
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.emitter !== "string"
    || value.emitter.length === 0
    || !Array.isArray(value.successEvents)
    || value.successEvents.length === 0
    || value.successEvents.some((event) => typeof event !== "string" || event.length === 0)) {
    return undefined;
  }
  const locationLine = locationLineOf(value.location);
  const rejectionLine = locationLineOf(value.rejectionLocation);
  if (!locationLine || !rejectionLine || !Array.isArray(value.successListenerLocations)) return undefined;
  const successListenerLines = value.successListenerLocations
    .map(locationLineOf)
    .filter((line): line is number => line !== undefined);
  if (successListenerLines.length === 0) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    emitter: value.emitter,
    successEvents: value.successEvents as string[],
    locationLine,
    successListenerLines,
    rejectionLine,
  };
}

function parseAbortReasonDropFlow(fact: EvidenceFactLike): AbortReasonDropFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "abort-rejection-without-reason"
    || value.action !== "reject"
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.cancellationBinding !== "string"
    || typeof value.signalExpression !== "string"
    || typeof value.rejectionExpression !== "string") {
    return undefined;
  }
  const locationLine = locationLineOf(value.location);
  const cancellationLine = locationLineOf(value.cancellationLocation);
  const signalLine = locationLineOf(value.signalLocation);
  if (!locationLine || !cancellationLine || !signalLine) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    cancellationBinding: value.cancellationBinding,
    signalExpression: value.signalExpression,
    rejectionExpression: value.rejectionExpression,
    locationLine,
    cancellationLine,
    signalLine,
  };
}

function parseErrorCodeWrappingFlow(fact: EvidenceFactLike): ErrorCodeWrappingFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "error-code-lost-by-wrapping"
    || value.action !== "wrap"
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.errorIdentifier !== "string"
    || typeof value.wrapperExpression !== "string"
    || typeof value.retryCode !== "string") {
    return undefined;
  }
  const locationLine = locationLineOf(value.location);
  const wrapperLine = locationLineOf(value.wrapperLocation);
  const retryCheckLine = locationLineOf(value.retryCheckLocation);
  if (!locationLine || !wrapperLine || !retryCheckLine) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    errorIdentifier: value.errorIdentifier,
    wrapperExpression: value.wrapperExpression,
    retryCode: value.retryCode,
    locationLine,
    wrapperLine,
    retryCheckLine,
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

function locationLineOf(value: unknown): number | undefined {
  if (!isRecord(value) || !Number.isInteger(value.line) || (value.line as number) < 1) return undefined;
  return value.line as number;
}

function firstEvidenceLine(assessment: Assessment): number {
  const sourceEvidence = assessment.details?.sourceEvidence;
  if (!Array.isArray(sourceEvidence)) return Number.MAX_SAFE_INTEGER;
  const first = sourceEvidence[0];
  return isRecord(first) && Number.isInteger(first.lineStart)
    ? first.lineStart as number
    : Number.MAX_SAFE_INTEGER;
}

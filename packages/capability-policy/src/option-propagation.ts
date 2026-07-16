import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { SEMANTIC_OPTION_PROPAGATION_RULE_ID } from "./assessment-judgment.js";
import { isNonProductionPath } from "./grammar-divergence.js";

type EvidenceFactLike = {
  kind: string;
  value: Record<string, unknown>;
};

type FalsyOptionDefaultFlow = {
  path: string;
  caller: string;
  property: string;
  optionContainer: string;
  optionExpression: string;
  defaultExpression: string;
  defaultSource: string;
  line: number;
};

type DerivedRequestSignalFlow = {
  path: string;
  caller: string;
  requestBinding: string;
  inputParameter: string;
  initParameter: string;
  requestExpression: string;
  forwardedSignal: string;
  normalizedMembers: string[];
  requestLine: number;
  outputLine: number;
  signalLine: number;
};

export function evaluateOptionPropagationSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  const optionFacts = facts.filter((fact) => fact.kind === "option_flow");
  const falsyDefaults = optionFacts
    .map(parseFalsyOptionDefault)
    .filter((flow): flow is FalsyOptionDefaultFlow =>
      flow !== undefined && !isNonProductionPath(flow.path))
    .map((flow) => falsyOptionDefaultAssessment(flow, evidenceRef));
  const derivedSignals = optionFacts
    .map(parseDerivedRequestSignal)
    .filter((flow): flow is DerivedRequestSignalFlow =>
      flow !== undefined && !isNonProductionPath(flow.path))
    .map((flow) => derivedRequestSignalAssessment(flow, evidenceRef));
  return [...falsyDefaults, ...derivedSignals].sort((left, right) =>
    (left.files?.[0] ?? "").localeCompare(right.files?.[0] ?? "")
      || firstEvidenceLine(left) - firstEvidenceLine(right));
}

function falsyOptionDefaultAssessment(
  flow: FalsyOptionDefaultFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    property: flow.property,
    optionExpression: flow.optionExpression,
    defaultExpression: flow.defaultExpression,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_OPTION_PROPAGATION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_OPTION_PROPAGATION_RULE_ID,
    impact: "medium",
    title: `Possible falsy option override in ${flow.path}`,
    description:
      `${flow.caller} resolves ${flow.optionExpression} with ${flow.defaultExpression} through logical OR. Because the visible default is true, an explicit false value selects the default instead of preserving the option.`,
    subjects: [flow.path, flow.caller, flow.property],
    files: [flow.path],
    ruleId: SEMANTIC_OPTION_PROPAGATION_RULE_ID,
    suggestedAction:
      `Run a focused test with ${flow.property}: false and use presence-aware defaulting if false is part of the option contract.`,
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.9,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves logical-OR defaulting from an option member to a same-property boolean true default; whether false is contractually meaningful still requires behavioral verification.",
    },
    details: {
      problemClass: "option-propagation",
      structuredMechanism: "truthy-default-overrides-falsy",
      caller: flow.caller,
      property: flow.property,
      optionContainer: flow.optionContainer,
      optionExpression: flow.optionExpression,
      defaultExpression: flow.defaultExpression,
      defaultSource: flow.defaultSource,
      sourceEvidence: [
        { path: flow.path, lineStart: flow.line, lineEnd: flow.line },
      ],
    },
  };
}

function derivedRequestSignalAssessment(
  flow: DerivedRequestSignalFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    requestBinding: flow.requestBinding,
    inputParameter: flow.inputParameter,
    initParameter: flow.initParameter,
    forwardedSignal: flow.forwardedSignal,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_OPTION_PROPAGATION_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_OPTION_PROPAGATION_RULE_ID,
    impact: "high",
    title: `Possible caller abort signal loss in ${flow.path}`,
    description:
      `${flow.caller} constructs ${flow.requestExpression} to normalize request fields, then forwards ${flow.forwardedSignal} as the returned options signal after spreading ${flow.initParameter}. The temporary Request owns a derived signal rather than the caller's original signal identity, so cancellation can stop propagating if the temporary request or its internal bridge is released.`,
    subjects: [flow.path, flow.caller, `${flow.requestBinding}.signal`],
    files: [flow.path],
    ruleId: SEMANTIC_OPTION_PROPAGATION_RULE_ID,
    suggestedAction:
      `Verify signal identity and an in-flight abort through ${flow.caller}; forward the caller-owned ${flow.initParameter}.signal or the original Request input signal when identity is required.`,
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.92,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves a temporary global Request is built from the function's input and init parameters, the returned options spread that init, multiple normalized fields come from the temporary Request, and its derived signal is forwarded; cancellation failure depends on the runtime fetch implementation.",
    },
    details: {
      problemClass: "option-propagation",
      structuredMechanism: "derived-request-signal-forwarded",
      caller: flow.caller,
      requestBinding: flow.requestBinding,
      inputParameter: flow.inputParameter,
      initParameter: flow.initParameter,
      requestExpression: flow.requestExpression,
      forwardedSignal: flow.forwardedSignal,
      normalizedMembers: flow.normalizedMembers,
      sourceEvidence: [
        { path: flow.path, lineStart: flow.requestLine, lineEnd: flow.requestLine },
        { path: flow.path, lineStart: flow.outputLine, lineEnd: flow.outputLine },
        { path: flow.path, lineStart: flow.signalLine, lineEnd: flow.signalLine },
      ],
    },
  };
}

function parseFalsyOptionDefault(fact: EvidenceFactLike): FalsyOptionDefaultFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "truthy-default-overrides-falsy"
    || value.defaultValue !== true
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.property !== "string"
    || typeof value.optionContainer !== "string"
    || typeof value.optionExpression !== "string"
    || typeof value.defaultExpression !== "string"
    || typeof value.defaultSource !== "string") {
    return undefined;
  }
  const line = locationLineOf(value.location);
  if (!line) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    property: value.property,
    optionContainer: value.optionContainer,
    optionExpression: value.optionExpression,
    defaultExpression: value.defaultExpression,
    defaultSource: value.defaultSource,
    line,
  };
}

function parseDerivedRequestSignal(fact: EvidenceFactLike): DerivedRequestSignalFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "derived-request-signal-forwarded"
    || typeof value.source !== "string"
    || typeof value.caller !== "string"
    || typeof value.requestBinding !== "string"
    || typeof value.inputParameter !== "string"
    || typeof value.initParameter !== "string"
    || typeof value.requestExpression !== "string"
    || typeof value.forwardedSignal !== "string"
    || value.outputPath !== "options.signal"
    || !Array.isArray(value.normalizedMembers)
    || value.normalizedMembers.length < 2
    || value.normalizedMembers.some((member) => typeof member !== "string" || member.length === 0)) {
    return undefined;
  }
  const requestLine = locationLineOf(value.requestLocation);
  const outputLine = locationLineOf(value.outputLocation);
  const signalLine = locationLineOf(value.location);
  if (!requestLine || !outputLine || !signalLine) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    requestBinding: value.requestBinding,
    inputParameter: value.inputParameter,
    initParameter: value.initParameter,
    requestExpression: value.requestExpression,
    forwardedSignal: value.forwardedSignal,
    normalizedMembers: [...value.normalizedMembers],
    requestLine,
    outputLine,
    signalLine,
  };
}

function locationLineOf(value: unknown): number | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const line = (value as { line?: unknown }).line;
  return Number.isInteger(line) && (line as number) > 0 ? line as number : undefined;
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

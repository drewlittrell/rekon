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

export function evaluateOptionPropagationSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
): Assessment[] {
  return facts
    .filter((fact) => fact.kind === "option_flow")
    .map(parseFalsyOptionDefault)
    .filter((flow): flow is FalsyOptionDefaultFlow =>
      flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line)
    .map((flow) => falsyOptionDefaultAssessment(flow, evidenceRef));
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

function locationLineOf(value: unknown): number | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const line = (value as { line?: unknown }).line;
  return Number.isInteger(line) && (line as number) > 0 ? line as number : undefined;
}

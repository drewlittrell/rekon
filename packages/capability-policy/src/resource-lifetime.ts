import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { isNonProductionPath } from "./grammar-divergence.js";

export const SEMANTIC_RESOURCE_LIFETIME_RULE_ID = "semantic.resourceLifetime";

type EvidenceFactLike = {
  kind: string;
  subject: string;
  value: Record<string, unknown>;
};

type ResourceFlow = {
  action: "retain" | "release";
  path: string;
  caller: string;
  resource: string;
  target: string;
  ownerKind: "socket" | "connection" | "server";
  retainedNames: string[];
  line: number;
  scope: string;
};

type TerminalListenerFlow = {
  path: string;
  caller: string;
  target: string;
  eventName: "readystatechange";
  handlerName: string;
  terminalCondition: string;
  terminalLine: number;
  handlerLine: number;
  registrationLine: number;
};

export function evaluateResourceLifetimeSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
  options: { evidenceComplete: boolean },
): Assessment[] {
  const resourceFacts = facts.filter((fact) => fact.kind === "resource_flow");
  const terminalListenerAssessments = resourceFacts
    .map(parseTerminalListenerFlow)
    .filter((flow): flow is TerminalListenerFlow => flow !== undefined && !isNonProductionPath(flow.path))
    .sort((left, right) =>
      left.path.localeCompare(right.path) || left.registrationLine - right.registrationLine)
    .map((flow) => terminalListenerAssessment(flow, evidenceRef));
  if (!options.evidenceComplete) return terminalListenerAssessments;
  const flows = resourceFacts
    .map(parseResourceFlow)
    .filter((flow): flow is ResourceFlow => flow !== undefined && !isNonProductionPath(flow.path));
  const releases = new Set(flows.filter((flow) => flow.action === "release").map(resourceIdentity));
  const retainedByResource = new Map<string, ResourceFlow[]>();

  for (const flow of flows) {
    const identity = resourceIdentity(flow);
    if (flow.action !== "retain" || releases.has(identity)) continue;
    const current = retainedByResource.get(identity) ?? [];
    current.push(flow);
    retainedByResource.set(identity, current);
  }

  const crossFileAssessments = [...retainedByResource.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, retained]) => resourceLifetimeAssessment(retained[0]!.resource, retained, evidenceRef));
  return [...crossFileAssessments, ...terminalListenerAssessments].sort((left, right) =>
    (left.files?.[0] ?? "").localeCompare(right.files?.[0] ?? "")
      || firstEvidenceLine(left) - firstEvidenceLine(right));
}

function resourceLifetimeAssessment(
  resource: string,
  retained: ResourceFlow[],
  evidenceRef: ArtifactRef,
): Assessment {
  const ordered = retained.slice().sort((left, right) =>
    left.path.localeCompare(right.path) || left.line - right.line || left.target.localeCompare(right.target));
  const files = [...new Set(ordered.map((flow) => flow.path))];
  const retainedNames = [...new Set(ordered.flatMap((flow) => flow.retainedNames))].sort();
  const ownerKinds = [...new Set(ordered.map((flow) => flow.ownerKind))].sort();
  const scope = ordered[0]!.scope;
  const fingerprint = digestJson({ scope, resource, files, retainedNames }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_RESOURCE_LIFETIME_RULE_ID}:${resource}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_RESOURCE_LIFETIME_RULE_ID,
    impact: "medium",
    title: `Possible request-scoped retention on ${resource}`,
    description:
      `A fresh repository evidence graph shows ${retainedNames.join(", ")} retained by a connection-lifetime ${ownerKinds.join("/")} owner without a matching explicit release. The structure establishes a lifetime mismatch candidate; runtime retention beyond request completion remains to be verified.`,
    subjects: [resource, ...files],
    files,
    ruleId: SEMANTIC_RESOURCE_LIFETIME_RULE_ID,
    suggestedAction:
      "Verify the owner lifetime across response completion and remove the listener or clear the retained request-scoped value at the matching lifecycle boundary when the owner outlives the request.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.72,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence identifies request-scoped values retained by a longer-lived owner and a complete current evidence graph contains no matching release; runtime reachability is not inferred.",
    },
    details: {
      problemClass: "resource-lifetime",
      scope,
      resource,
      ownerKinds,
      retainedNames,
      sourceEvidence: ordered.map((flow) => ({
        path: flow.path,
        lineStart: flow.line,
        lineEnd: flow.line,
      })),
      retentionEvidence: ordered.map((flow) => ({
        path: flow.path,
        caller: flow.caller,
        target: flow.target,
        ownerKind: flow.ownerKind,
        retainedNames: flow.retainedNames,
        line: flow.line,
      })),
      releaseMatch: "absent-in-complete-evidence",
    },
  };
}

function terminalListenerAssessment(
  flow: TerminalListenerFlow,
  evidenceRef: ArtifactRef,
): Assessment {
  const fingerprint = digestJson({
    path: flow.path,
    caller: flow.caller,
    target: flow.target,
    eventName: flow.eventName,
    handlerName: flow.handlerName,
  }).slice(0, 16);
  const rootCauseKey = `${SEMANTIC_RESOURCE_LIFETIME_RULE_ID}:${flow.path}:${fingerprint}`;
  return {
    id: `assessment:${rootCauseKey}`,
    kind: "semantic_claim",
    type: SEMANTIC_RESOURCE_LIFETIME_RULE_ID,
    impact: "medium",
    title: `Possible completed-request listener retention in ${flow.path}`,
    description:
      `${flow.caller} registers ${flow.handlerName} for ${flow.target}.${flow.eventName}, and the handler has a visible terminal branch (${flow.terminalCondition}) without same-target removal or once-only registration. The listener can remain attached after its one-shot purpose completes; browser retention and workload impact remain to be verified.`,
    subjects: [flow.path, flow.target, flow.handlerName],
    files: [flow.path],
    ruleId: SEMANTIC_RESOURCE_LIFETIME_RULE_ID,
    suggestedAction:
      `Verify repeated completed requests, then remove ${flow.handlerName} from ${flow.target} after terminal handling or use once-only registration when repeated notifications are not required.`,
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.88,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence proves named readystatechange registration, a same-target readyState === 4 terminal branch, and no visible same-handler removal or once-only registration; browser retention and request frequency remain to be verified.",
    },
    details: {
      problemClass: "resource-lifetime",
      structuredMechanism: "terminal-listener-retained",
      caller: flow.caller,
      target: flow.target,
      eventName: flow.eventName,
      handlerName: flow.handlerName,
      terminalCondition: flow.terminalCondition,
      sourceEvidence: [
        { path: flow.path, lineStart: flow.handlerLine, lineEnd: flow.handlerLine },
        { path: flow.path, lineStart: flow.terminalLine, lineEnd: flow.terminalLine },
        { path: flow.path, lineStart: flow.registrationLine, lineEnd: flow.registrationLine },
      ],
      retentionEvidence: [{
        path: flow.path,
        caller: flow.caller,
        target: flow.target,
        eventName: flow.eventName,
        handlerName: flow.handlerName,
        terminalCondition: flow.terminalCondition,
        line: flow.registrationLine,
      }],
      releaseMatch: "absent-in-source",
    },
  };
}

function parseResourceFlow(fact: EvidenceFactLike): ResourceFlow | undefined {
  const { value } = fact;
  if (value.action !== "retain" && value.action !== "release") return undefined;
  if (typeof value.source !== "string" || value.source.length === 0) return undefined;
  if (typeof value.caller !== "string" || value.caller.length === 0) return undefined;
  if (typeof value.resource !== "string" || value.resource.length === 0) return undefined;
  if (typeof value.target !== "string" || value.target.length === 0) return undefined;
  if (value.ownerKind !== "socket" && value.ownerKind !== "connection" && value.ownerKind !== "server") return undefined;
  if (typeof value.line !== "number" || !Number.isInteger(value.line) || value.line < 1) return undefined;
  const retainedNames = Array.isArray(value.retainedNames)
    ? [...new Set(value.retainedNames.filter((entry): entry is string => typeof entry === "string" && entry.length > 0))].sort()
    : [];
  if (value.action === "retain" && retainedNames.length === 0) return undefined;
  return {
    action: value.action,
    path: value.source,
    caller: value.caller,
    resource: value.resource,
    target: value.target,
    ownerKind: value.ownerKind,
    retainedNames,
    line: value.line,
    scope: resourceScope(value.source),
  };
}

function parseTerminalListenerFlow(fact: EvidenceFactLike): TerminalListenerFlow | undefined {
  const { value } = fact;
  if (value.mechanism !== "terminal-listener-retained"
    || typeof value.source !== "string" || value.source.length === 0
    || typeof value.caller !== "string" || value.caller.length === 0
    || typeof value.target !== "string" || value.target.length === 0
    || value.eventName !== "readystatechange"
    || typeof value.handlerName !== "string" || value.handlerName.length === 0
    || typeof value.terminalCondition !== "string" || value.terminalCondition.length === 0
    || value.terminalProperty !== "readyState"
    || value.terminalValue !== "4") {
    return undefined;
  }
  const registrationLine = locationLineOf(value.location);
  const handlerLine = locationLineOf(value.handlerLocation);
  const terminalLine = locationLineOf(value.terminalLocation);
  if (!registrationLine || !handlerLine || !terminalLine) return undefined;
  return {
    path: value.source,
    caller: value.caller,
    target: value.target,
    eventName: "readystatechange",
    handlerName: value.handlerName,
    terminalCondition: value.terminalCondition,
    registrationLine,
    handlerLine,
    terminalLine,
  };
}

function resourceIdentity(flow: ResourceFlow): string {
  return `${flow.scope}:${flow.resource}`;
}

function resourceScope(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length >= 2 && (parts[0] === "packages" || parts[0] === "apps" || parts[0] === "services")
    ? `${parts[0]}/${parts[1]}`
    : ".";
}

function locationLineOf(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const line = (value as { line?: unknown }).line;
  return typeof line === "number" && Number.isInteger(line) && line > 0 ? line : undefined;
}

function firstEvidenceLine(assessment: Assessment): number {
  const sourceEvidence = assessment.details?.sourceEvidence;
  if (!Array.isArray(sourceEvidence)) return Number.MAX_SAFE_INTEGER;
  const first = sourceEvidence[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) return Number.MAX_SAFE_INTEGER;
  const lineStart = (first as { lineStart?: unknown }).lineStart;
  return typeof lineStart === "number" && Number.isInteger(lineStart)
    ? lineStart
    : Number.MAX_SAFE_INTEGER;
}

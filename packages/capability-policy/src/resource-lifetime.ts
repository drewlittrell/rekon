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

export function evaluateResourceLifetimeSignals(
  facts: readonly EvidenceFactLike[],
  evidenceRef: ArtifactRef,
  options: { evidenceComplete: boolean },
): Assessment[] {
  if (!options.evidenceComplete) return [];
  const flows = facts
    .filter((fact) => fact.kind === "resource_flow")
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

  return [...retainedByResource.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, retained]) => resourceLifetimeAssessment(retained[0]!.resource, retained, evidenceRef));
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
      `A fresh repository evidence graph shows ${retainedNames.join(", ")} retained on connection-lifetime ${ownerKinds.join("/")} state without a matching explicit release. The structure establishes a lifetime mismatch candidate; runtime retention beyond request completion remains to be verified.`,
    subjects: [resource, ...files],
    files,
    ruleId: SEMANTIC_RESOURCE_LIFETIME_RULE_ID,
    suggestedAction:
      "Verify the owner lifetime across response completion and clear the retained request-scoped value at the matching lifecycle boundary when the owner outlives the request.",
    evidence: [evidenceRef],
    rootCauseKey,
    confidence: {
      score: 0.72,
      basis: "deterministic",
      verification: "unverified",
      rationale:
        "AST evidence identifies request-scoped values stored on a longer-lived owner and a complete current evidence graph contains no matching release; runtime reachability is not inferred.",
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

function resourceIdentity(flow: ResourceFlow): string {
  return `${flow.scope}:${flow.resource}`;
}

function resourceScope(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length >= 2 && (parts[0] === "packages" || parts[0] === "apps" || parts[0] === "services")
    ? `${parts[0]}/${parts[1]}`
    : ".";
}

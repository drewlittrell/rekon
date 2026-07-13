import { digestJson, type ArtifactRef } from "@rekon/kernel-artifacts";
import type { Assessment } from "@rekon/kernel-assessments";

import { isNonProductionPath } from "./grammar-divergence.js";

export const EMBEDDING_DUPLICATION_RULE_ID = "similarity.duplicateCandidate";

type GraphRefLike = { kind?: unknown; id?: unknown };
type EmbeddingClaimLike = {
  id?: unknown;
  subject?: GraphRefLike;
  predicate?: unknown;
  object?: unknown;
  source?: unknown;
  confidence?: unknown;
  evidenceRefs?: unknown;
};

type CapabilityNodeLike = {
  id?: unknown;
  verb?: unknown;
  noun?: unknown;
  implementedBy?: unknown;
};

export function evaluateEmbeddingDuplicationCandidates(
  graphLike: unknown,
  graphRef: ArtifactRef,
): Assessment[] {
  if (!graphLike || typeof graphLike !== "object" || Array.isArray(graphLike)) return [];
  const graph = graphLike as { claims?: unknown; capabilities?: unknown };
  const claims = graph.claims;
  if (!Array.isArray(claims)) return [];
  const capabilities = new Map<string, CapabilityNodeLike>();
  if (Array.isArray(graph.capabilities)) {
    for (const raw of graph.capabilities as CapabilityNodeLike[]) {
      if (typeof raw?.id === "string" && raw.id.length > 0) capabilities.set(raw.id, raw);
    }
  }

  const pairs = new Map<string, {
    left: { kind: string; id: string };
    right: { kind: string; id: string };
    confidence: number;
    claimIds: string[];
    graphEvidenceRefs: string[];
  }>();

  for (const raw of claims as EmbeddingClaimLike[]) {
    if (!raw || raw.predicate !== "duplicate_candidate" || raw.source !== "embedding") continue;
    const left = parseGraphRef(raw.subject);
    const right = parseGraphRef(raw.object);
    if (!left || !right) continue;
    const leftKey = `${left.kind}:${left.id}`;
    const rightKey = `${right.kind}:${right.id}`;
    if (leftKey === rightKey) continue;
    const [first, second] = leftKey.localeCompare(rightKey) <= 0 ? [left, right] : [right, left];
    const key = `${first.kind}:${first.id}|${second.kind}:${second.id}`;
    const existing = pairs.get(key) ?? {
      left: first,
      right: second,
      confidence: 0,
      claimIds: [],
      graphEvidenceRefs: [],
    };
    existing.confidence = Math.max(existing.confidence, finiteConfidence(raw.confidence));
    if (typeof raw.id === "string" && !existing.claimIds.includes(raw.id)) existing.claimIds.push(raw.id);
    if (Array.isArray(raw.evidenceRefs)) {
      for (const ref of raw.evidenceRefs) {
        if (typeof ref === "string" && !existing.graphEvidenceRefs.includes(ref)) existing.graphEvidenceRefs.push(ref);
      }
    }
    pairs.set(key, existing);
  }

  return [...pairs.entries()]
    .filter(([, pair]) => pair.claimIds.length >= 2)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([pairKey, pair]): Assessment[] => {
      const files = [...new Set([
        ...filesForRef(pair.left, capabilities),
        ...filesForRef(pair.right, capabilities),
      ])].sort();
      if (files.some(isNonProductionPath)) return [];
      const fingerprint = digestJson(pairKey).slice(0, 16);
      return [{
        id: `${EMBEDDING_DUPLICATION_RULE_ID}:${fingerprint}`,
        kind: "opportunity" as const,
        type: "duplication",
        impact: "medium" as const,
        title: "Potential duplicate implementation",
        description: `${displayRef(pair.left)} and ${displayRef(pair.right)} have embedding similarity high enough to warrant comparison.`,
        subjects: [displayRef(pair.left), displayRef(pair.right)],
        ...(files.length > 0 ? { files } : {}),
        ruleId: EMBEDDING_DUPLICATION_RULE_ID,
        suggestedAction: "Compare responsibilities, behavior, and change history before deciding whether consolidation would reduce maintenance cost.",
        evidence: [graphRef],
        rootCauseKey: `duplication:${fingerprint}`,
        confidence: {
          score: pair.confidence,
          basis: "semantic" as const,
          verification: "unverified" as const,
          rationale: "Embedding similarity proposes overlap but does not prove equivalent behavior or a beneficial merge.",
        },
        details: {
          left: pair.left,
          right: pair.right,
          similarity: pair.confidence,
          claimIds: pair.claimIds.sort(),
          graphEvidenceRefs: pair.graphEvidenceRefs.sort(),
          reciprocalClaims: pair.claimIds.length,
        },
      } satisfies Assessment];
    });
}

function parseGraphRef(value: unknown): { kind: string; id: string } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as GraphRefLike;
  if (typeof candidate.kind !== "string" || typeof candidate.id !== "string" || candidate.id.length === 0) return undefined;
  return { kind: candidate.kind, id: candidate.id };
}

function finiteConfidence(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.99) : 0;
}

function displayRef(ref: { kind: string; id: string }): string {
  return `${ref.kind}:${ref.id}`;
}

function filesForRef(ref: { kind: string; id: string }, capabilities: Map<string, CapabilityNodeLike>): string[] {
  if (ref.kind === "file") return [ref.id];
  if (ref.kind === "symbol" && ref.id.includes("#")) return [ref.id.slice(0, ref.id.indexOf("#"))];
  if (ref.kind !== "capability") return [];
  const capability = capabilities.get(ref.id);
  if (!Array.isArray(capability?.implementedBy)) return [];
  return capability.implementedBy.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const id = (raw as { id?: unknown }).id;
    return typeof id === "string" && id.includes("#") ? [id.slice(0, id.indexOf("#"))] : [];
  });
}

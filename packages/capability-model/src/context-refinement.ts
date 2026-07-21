import type {
  DeclaredTaskConstraint,
  DeclaredTaskVerificationHint,
  TaskContextGraphClaimLike,
  TaskContextGraphLike,
  TaskContextGraphRefLike,
} from "./task-context-report.js";

export const TASK_CONTEXT_REFINEMENT_RELATIONSHIPS = Object.freeze([
  "dependency",
  "dependent",
  "test",
  "contract",
  "consumer",
  "producer",
  "implementation",
] as const);

export type TaskContextRefinementRelationship =
  (typeof TASK_CONTEXT_REFINEMENT_RELATIONSHIPS)[number];

export type TaskContextRefinementDirection = "outgoing" | "incoming" | "co-implementation";

export type TaskContextRefinementCandidate = {
  path: string;
  relationship: TaskContextRefinementRelationship;
  direction: TaskContextRefinementDirection;
  predicate: string;
  sourceId: string;
  reason: string;
  evidenceRefs: string[];
  score: number;
};

export type TaskContextRefinementTraceEntry = {
  sourceId: string;
  path?: string;
  decision: "included" | "excluded";
  reason: string;
};

export type TaskContextRefinementResult = {
  schemaVersion: "1.0.0";
  question: string;
  relationship: TaskContextRefinementRelationship;
  anchor: {
    path?: string;
    symbol?: string;
  };
  readNext: TaskContextRefinementCandidate[];
  alreadyRead: string[];
  unresolved: boolean;
  reason: string;
  trace: TaskContextRefinementTraceEntry[];
  truncated: boolean;
};

export type SelectTaskContextRefinementInput = {
  question: string;
  relationship: TaskContextRefinementRelationship;
  anchorPath?: string;
  anchorSymbol?: string;
  alreadyRead?: string[];
  graph: TaskContextGraphLike;
  limit?: number;
};

export type TaskContextRefinementGuidance = {
  constraints?: DeclaredTaskConstraint[];
  verificationHints?: DeclaredTaskVerificationHint[];
};

const DEFAULT_REFINEMENT_LIMIT = 5;
const MAX_REFINEMENT_LIMIT = 8;
const MAX_REFINEMENT_TRACE = 32;
const TOKEN_STOPWORDS = new Set([
  "the", "and", "for", "from", "with", "into", "that", "this", "what",
  "which", "where", "when", "does", "need", "needed", "remain", "remains",
  "unresolved", "relationship", "change", "context", "file", "path",
]);

function normalizePath(value: string): string {
  return value.trim().replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function tokens(value: string): Set<string> {
  const result = new Set<string>();
  for (const token of value.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (token.length < 3 || TOKEN_STOPWORDS.has(token)) continue;
    result.add(token);
  }
  return result;
}

function refPath(ref: TaskContextGraphRefLike): string | undefined {
  if (ref.kind === "file") return normalizePath(ref.id);
  if (ref.kind === "symbol") {
    const separator = ref.id.indexOf("#");
    return separator > 0 ? normalizePath(ref.id.slice(0, separator)) : undefined;
  }
  return undefined;
}

function claimObjectRef(claim: TaskContextGraphClaimLike): TaskContextGraphRefLike | undefined {
  return typeof claim.object === "string" ? undefined : claim.object;
}

function isInferenceClaim(claim: TaskContextGraphClaimLike): boolean {
  return claim.source === "llm"
    || claim.source === "embedding"
    || claim.claimType === "inference"
    || claim.claimType === "recommendation";
}

function isTestRelationship(claim: TaskContextGraphClaimLike, candidatePath: string): boolean {
  return claim.source === "test"
    || /(?:^|[._-])(test|tests|verify|verifies|verified_by)(?:$|[._-])/i.test(claim.predicate)
    || /(?:^|\/)tests?(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(candidatePath);
}

function isDependencyPredicate(predicate: string): boolean {
  return /(?:^|[._-])(imports?|calls?|reads?|uses?|depends|depends_on|consumes?|produces?|publishes?|writes?|registers?|routes?)(?:$|[._-])/i.test(predicate);
}

function isImplementationPredicate(predicate: string): boolean {
  return /(?:^|[._-])(implements?|implementation|implemented_by|exposes?|registers?)(?:$|[._-])/i.test(predicate);
}

function relationMatches(
  relationship: TaskContextRefinementRelationship,
  claim: TaskContextGraphClaimLike,
  direction: Exclude<TaskContextRefinementDirection, "co-implementation">,
  candidatePath: string,
): boolean {
  if (relationship === "dependency") {
    return direction === "outgoing" && isDependencyPredicate(claim.predicate);
  }
  if (relationship === "dependent") {
    return direction === "incoming" && isDependencyPredicate(claim.predicate);
  }
  if (relationship === "test") return isTestRelationship(claim, candidatePath);
  if (relationship === "contract") return /contract/i.test(claim.predicate);
  if (relationship === "consumer") {
    return direction === "incoming" && /(?:^|[._-])(consumes?|reads?)(?:$|[._-])/i.test(claim.predicate);
  }
  if (relationship === "producer") {
    return direction === "incoming" && /(?:^|[._-])(produces?|publishes?|writes?)(?:$|[._-])/i.test(claim.predicate);
  }
  return isImplementationPredicate(claim.predicate);
}

function candidateScore(
  questionTokens: Set<string>,
  candidatePath: string,
  predicate: string,
  direction: TaskContextRefinementDirection,
): number {
  const candidateTokens = tokens(`${candidatePath} ${predicate}`);
  let overlap = 0;
  for (const token of questionTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }
  return 100 + overlap * 10 + (direction === "outgoing" ? 3 : direction === "incoming" ? 2 : 1);
}

function candidateReason(
  anchor: string,
  relationship: TaskContextRefinementRelationship,
  direction: TaskContextRefinementDirection,
  predicate: string,
): string {
  if (direction === "co-implementation") {
    return `implements the same graph-declared capability as ${anchor}`;
  }
  return `${direction} ${relationship} relationship from ${anchor} via graph predicate ${predicate}`;
}

/**
 * Select a bounded context delta for one named unresolved relationship.
 *
 * This helper is pure and provider-free. It traverses only deterministic graph
 * relationships connected to the supplied anchor, never reads source, and
 * never broadens from lexical similarity alone.
 */
export function selectTaskContextRefinement(
  input: SelectTaskContextRefinementInput,
): TaskContextRefinementResult {
  const question = input.question.trim();
  if (question.length === 0) throw new Error("Task context refinement requires a non-empty question.");
  if (!TASK_CONTEXT_REFINEMENT_RELATIONSHIPS.includes(input.relationship)) {
    throw new Error(`Unknown task context refinement relationship: ${String(input.relationship)}`);
  }

  const anchorPath = input.anchorPath ? normalizePath(input.anchorPath) : undefined;
  const anchorSymbol = input.anchorSymbol?.trim() || undefined;
  const symbolPath = anchorSymbol ? refPath({ kind: "symbol", id: anchorSymbol }) : undefined;
  const effectiveAnchorPath = anchorPath || symbolPath;
  if (!effectiveAnchorPath && !anchorSymbol) {
    throw new Error("Task context refinement requires an anchor path or symbol.");
  }

  const anchorLabel = anchorSymbol ?? effectiveAnchorPath!;
  const alreadyRead = [...new Set((input.alreadyRead ?? []).map(normalizePath).filter(Boolean))].sort();
  const excludedPaths = new Set([
    ...alreadyRead,
    ...(effectiveAnchorPath ? [effectiveAnchorPath] : []),
  ]);
  const fileNodes = new Set(
    (input.graph.nodes ?? [])
      .filter((node) => node.kind === "file")
      .map((node) => normalizePath(node.id)),
  );
  const anchorExists = (input.graph.nodes ?? []).some((node) =>
    (anchorSymbol !== undefined && node.kind === "symbol" && node.id === anchorSymbol)
    || (effectiveAnchorPath !== undefined && node.kind === "file" && normalizePath(node.id) === effectiveAnchorPath),
  );
  const trace: TaskContextRefinementTraceEntry[] = [];
  const candidates: TaskContextRefinementCandidate[] = [];
  const questionTokens = tokens(question);

  const refIsAnchor = (ref: TaskContextGraphRefLike): boolean => {
    if (anchorSymbol && ref.kind === "symbol" && ref.id === anchorSymbol) return true;
    const path = refPath(ref);
    return effectiveAnchorPath !== undefined && path === effectiveAnchorPath;
  };

  if (!anchorExists) {
    return {
      schemaVersion: "1.0.0",
      question,
      relationship: input.relationship,
      anchor: {
        ...(anchorPath ? { path: anchorPath } : {}),
        ...(anchorSymbol ? { symbol: anchorSymbol } : {}),
      },
      readNext: [],
      alreadyRead,
      unresolved: true,
      reason: `The anchor ${anchorLabel} is not present in the current deterministic capability graph.`,
      trace: [],
      truncated: false,
    };
  }

  const consider = (
    sourceId: string,
    candidatePath: string | undefined,
    direction: TaskContextRefinementDirection,
    predicate: string,
    evidenceRefs: string[],
    relationAccepted: boolean,
  ): void => {
    if (!candidatePath || !fileNodes.has(candidatePath)) {
      trace.push({ sourceId, decision: "excluded", reason: "connected graph value is not a repository file node" });
      return;
    }
    if (!relationAccepted) {
      trace.push({ sourceId, path: candidatePath, decision: "excluded", reason: `does not match requested ${input.relationship} relationship` });
      return;
    }
    if (excludedPaths.has(candidatePath)) {
      trace.push({ sourceId, path: candidatePath, decision: "excluded", reason: "anchor or already-read path" });
      return;
    }
    const score = candidateScore(questionTokens, candidatePath, predicate, direction);
    candidates.push({
      path: candidatePath,
      relationship: input.relationship,
      direction,
      predicate,
      sourceId,
      reason: candidateReason(anchorLabel, input.relationship, direction, predicate),
      evidenceRefs: [...new Set(evidenceRefs)].sort(),
      score,
    });
  };

  for (const claim of input.graph.claims ?? []) {
    const objectRef = claimObjectRef(claim);
    const subjectMatches = refIsAnchor(claim.subject);
    const objectMatches = objectRef ? refIsAnchor(objectRef) : false;
    if (!subjectMatches && !objectMatches) continue;
    if (isInferenceClaim(claim)) {
      trace.push({ sourceId: claim.id, decision: "excluded", reason: "inference and recommendation graph claims are outside the deterministic refinement gate" });
      continue;
    }

    if (subjectMatches && objectRef) {
      const path = refPath(objectRef);
      consider(
        claim.id,
        path,
        "outgoing",
        claim.predicate,
        [...(claim.evidenceRefs ?? []), claim.id],
        path !== undefined && relationMatches(input.relationship, claim, "outgoing", path),
      );
    }
    if (objectMatches) {
      const path = refPath(claim.subject);
      consider(
        claim.id,
        path,
        "incoming",
        claim.predicate,
        [...(claim.evidenceRefs ?? []), claim.id],
        path !== undefined && relationMatches(input.relationship, claim, "incoming", path),
      );
    }
  }

  if (input.relationship === "implementation") {
    for (const capability of input.graph.capabilities ?? []) {
      const implementations = capability.implementedBy ?? [];
      if (!implementations.some(refIsAnchor)) continue;
      for (const implementation of implementations) {
        consider(
          capability.id,
          refPath(implementation),
          "co-implementation",
          "implements",
          capability.evidenceRefs ?? [],
          true,
        );
      }
    }
  }

  candidates.sort((left, right) =>
    right.score - left.score
    || left.path.localeCompare(right.path)
    || left.sourceId.localeCompare(right.sourceId),
  );
  const deduped: TaskContextRefinementCandidate[] = [];
  const seenPaths = new Set<string>();
  for (const candidate of candidates) {
    if (seenPaths.has(candidate.path)) {
      trace.push({ sourceId: candidate.sourceId, path: candidate.path, decision: "excluded", reason: "lower-ranked duplicate path" });
      continue;
    }
    seenPaths.add(candidate.path);
    deduped.push(candidate);
  }

  const requestedLimit = Number.isFinite(input.limit) ? Math.floor(input.limit!) : DEFAULT_REFINEMENT_LIMIT;
  const limit = Math.min(MAX_REFINEMENT_LIMIT, Math.max(1, requestedLimit));
  const readNext = deduped.slice(0, limit);
  for (const candidate of readNext) {
    trace.push({ sourceId: candidate.sourceId, path: candidate.path, decision: "included", reason: candidate.reason });
  }
  for (const candidate of deduped.slice(limit)) {
    trace.push({ sourceId: candidate.sourceId, path: candidate.path, decision: "excluded", reason: `refinement limit ${limit} reached` });
  }

  const unresolved = readNext.length === 0;
  const rawTraceLength = trace.length;
  return {
    schemaVersion: "1.0.0",
    question,
    relationship: input.relationship,
    anchor: {
      ...(anchorPath ? { path: anchorPath } : {}),
      ...(anchorSymbol ? { symbol: anchorSymbol } : {}),
    },
    readNext,
    alreadyRead,
    unresolved,
    reason: unresolved
      ? `No deterministic ${input.relationship} relationship from ${anchorLabel} answered the named question.`
      : `Selected ${readNext.length} unread path(s) through deterministic ${input.relationship} relationships from ${anchorLabel}.`,
    trace: trace.slice(0, MAX_REFINEMENT_TRACE),
    truncated: deduped.length > readNext.length || rawTraceLength > MAX_REFINEMENT_TRACE,
  };
}

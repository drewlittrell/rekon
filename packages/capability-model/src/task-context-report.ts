// Task-shaped context builder (TaskContextReport v1). First product consumer of
// embedding retrieval, selected by the Task-Shaped Context / Embedding Retrieval
// Decision (slice 165).
//
// `buildTaskContextReport` is a PURE helper: it reads no files, calls no
// providers, executes no commands, and creates no PreparedIntentPlan / WorkOrder /
// VerificationPlan. It consumes an already-built CapabilityEvidenceGraph (passed
// in) plus already-computed embedding retrieval results (passed in) and assembles
// a compact, explainable context bundle. Retrieval results are proposal/context,
// not proof; deterministic graph facts outrank embedding similarity; every context
// item / do-not-touch zone / verification hint preserves evidence refs; and
// verification hints are hints, never executed.

import { createHash } from "node:crypto";
import type { ArtifactHeader } from "@rekon/kernel-artifacts";
import {
  createTaskContextReport,
  type TaskContextReport,
  type TaskContextItem,
  type TaskContextScoreBand,
  type TaskContextDoNotTouchZone,
  type TaskContextVerificationHint,
  type TaskContextGraphNeighborhoodRef,
} from "@rekon/kernel-repo-model";

export const TASK_CONTEXT_REPORT_ARTIFACT_ID_PREFIX = "task-context-report-";

// Ranking-policy thresholds (Embedding Query Input-Type / Ranking Policy
// Implementation, slice 164). Kept local so the pure builder has no CLI/provider
// dependency; they mirror EMBEDDING_SCORE_BAND_* in embedding-index.ts.
const SCORE_BAND_STRONG = 0.78;
const SCORE_BAND_USEFUL = 0.65;
const SCORE_BAND_WEAK = 0.5;

// Conservative cap on graph claims surfaced per selected path, so expansion stays
// bounded for v1. Richer graph-neighborhood expansion is a documented follow-up.
const MAX_GRAPH_CLAIMS_PER_PATH = 6;

export type TaskContextGraphRefLike = { kind: string; id: string };

export type TaskContextGraphClaimLike = {
  id: string;
  subject: TaskContextGraphRefLike;
  predicate: string;
  object: TaskContextGraphRefLike | string;
  source?: string;
  confidence?: number;
  evidenceRefs?: string[];
  status?: string;
};

export type TaskContextGraphCapabilityLike = {
  id: string;
  verb?: string;
  noun?: string;
  implementedBy?: TaskContextGraphRefLike[];
  evidenceRefs?: string[];
};

export type TaskContextGraphLike = {
  nodes?: TaskContextGraphRefLike[];
  claims?: TaskContextGraphClaimLike[];
  capabilities?: TaskContextGraphCapabilityLike[];
};

export type TaskContextRetrievalResultLike = {
  score?: number;
  scoreBand?: TaskContextScoreBand;
  chunkId?: string;
  kind?: string;
  path?: string;
  symbolId?: string;
  chunk?: { id?: string; kind?: string; path?: string; symbolId?: string };
  explanation?: { provider?: string; model?: string; policyVersion?: string; textPreview?: string };
};

export type BuildTaskContextReportInput = {
  taskText: string;
  paths?: string[];
  /**
   * Graph + lexical fallback paths. When embedding retrieval is unavailable
   * because an IMPLICITLY-defaulted provider has no API key, the CLI lexically
   * matches the task text against graph file nodes (see
   * `selectLexicalGraphContextPaths`) and passes the matched paths here. They are
   * surfaced as `deterministic_graph` context (the nodes are real graph facts; only
   * the SELECTION is lexical) and expanded like any selected path. Never proof.
   */
  lexicalContextPaths?: string[];
  goal?: string;
  graph: TaskContextGraphLike;
  retrievalResults?: TaskContextRetrievalResultLike[];
  generatedAt?: string;
  provider?: string;
  model?: string;
  topK?: number;
  repoId?: string;
};

function classifyBand(score: number): TaskContextScoreBand {
  if (!Number.isFinite(score) || score < SCORE_BAND_WEAK) return "ignored";
  if (score >= SCORE_BAND_STRONG) return "strong";
  if (score >= SCORE_BAND_USEFUL) return "useful";
  return "weak";
}

function refKey(ref: TaskContextGraphRefLike): string {
  return `${ref.kind}:${ref.id}`;
}

function objectToRef(object: TaskContextGraphRefLike | string): TaskContextGraphRefLike | undefined {
  return typeof object === "string" ? undefined : object;
}

// Extract do-not-touch zones from explicit task-text constraints. v1 is
// conservative: it only surfaces zones the operator stated ("do not ...",
// "must not ...", "never ..."). Evidence-supported graph-claim zones are a
// documented follow-up.
function extractDoNotTouchZones(taskText: string, paths: string[]): TaskContextDoNotTouchZone[] {
  const zones: TaskContextDoNotTouchZone[] = [];
  const seen = new Set<string>();
  const clauses = taskText.split(/(?<=[.!?])\s+|\n+/);
  for (const clauseRaw of clauses) {
    const clause = clauseRaw.trim();
    if (clause.length === 0) continue;
    if (!/\b(do not|don'?t|must not|never|do-not-touch)\b/i.test(clause)) continue;
    const reason = clause.replace(/\s+/g, " ").trim();
    const key = reason.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const matchedPath = paths.find((p) => clause.includes(p));
    zones.push({
      reason,
      ...(matchedPath ? { path: matchedPath } : {}),
      evidenceRefs: [],
    });
  }
  return zones;
}

// Recognizes command-style verification mentions (explicit commands or the
// keyword-mapped scripts below). Used both to extract command hints and to skip
// the same clauses during free-form extraction, so a clause never yields both a
// command hint and a redundant free-form hint.
const VERIFICATION_COMMAND_KEYWORD = /\b(npm run|npm test|typecheck|type-check|build|compile|lint|tests?)\b/i;
// Recognizes free-form verification intent ("verify X", "make sure Y works").
const VERIFICATION_INTENT_VERB = /\b(verify|confirm|validate|ensure|make sure|double[- ]?check|sanity[- ]?check|check)\b/i;

// Extract verification hints from the task text. Hints only — NEVER executed.
// Two kinds, both with empty evidence refs (they come from operator input):
//   1. command hints — explicit `npm run <script>` / `npm test` mentions plus a
//      few keyword-mapped scripts (typecheck/build/lint/test). Unchanged behavior.
//   2. free-form intent hints — clauses asking to verify/confirm/validate/ensure
//      something but naming no command. These carry NO command (none is inferred
//      or executed); they use `artifact: "manual-verification"` so the operator's
//      verification intent is captured without inventing a shell command.
function extractVerificationHints(taskText: string): TaskContextVerificationHint[] {
  const hints: TaskContextVerificationHint[] = [];
  const seenCommands = new Set<string>();
  const lower = taskText.toLowerCase();
  const addCommand = (command: string, reason: string): void => {
    if (seenCommands.has(command)) return;
    seenCommands.add(command);
    hints.push({ command, reason, evidenceRefs: [] });
  };
  for (const cmd of taskText.match(/npm run [a-z0-9:_-]+/gi) ?? []) {
    addCommand(cmd.replace(/\s+/g, " ").trim(), "task references this command (hint only, not executed)");
  }
  if (/\bnpm test\b/i.test(taskText)) addCommand("npm test", "task references this command (hint only, not executed)");
  if (/\btypecheck\b/.test(lower)) addCommand("npm run typecheck", "task references typecheck verification (hint only)");
  if (/\b(build|compile)\b/.test(lower)) addCommand("npm run build", "task references build verification (hint only)");
  if (/\blint\b/.test(lower)) addCommand("npm run lint", "task references lint verification (hint only)");
  if (/\b(test|tests)\b/.test(lower)) addCommand("npm test", "task references test verification (hint only)");

  // Free-form verification intent: surface clauses that ask to verify something
  // but name no command. Skip clauses already covered by a command keyword so we
  // never duplicate a command hint with a free-form one.
  const seenIntents = new Set<string>();
  for (const clauseRaw of taskText.split(/(?<=[.!?])\s+|\n+/)) {
    const clause = clauseRaw.replace(/\s+/g, " ").trim();
    if (clause.length === 0) continue;
    if (!VERIFICATION_INTENT_VERB.test(clause)) continue;
    if (VERIFICATION_COMMAND_KEYWORD.test(clause)) continue;
    const key = clause.toLowerCase();
    if (seenIntents.has(key)) continue;
    seenIntents.add(key);
    hints.push({
      artifact: "manual-verification",
      reason: `operator asked to verify (free-form verification intent extracted from the task text; no command was inferred or executed): "${clause}"`,
      evidenceRefs: [],
    });
  }
  return hints;
}

// Default cap on graph + lexical fallback paths, so the degraded context stays
// compact. The CLI uses this when an implicitly-defaulted embedding provider is
// unavailable and no operator --path was given.
export const DEFAULT_LEXICAL_FALLBACK_LIMIT = 5;

// Stopwords + tokenizers for the lexical graph fallback. Conservative: drop
// short and structural words so the match is driven by salient task terms.
const LEXICAL_FALLBACK_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with",
  "from", "by", "at", "as", "is", "are", "be", "it", "its", "this", "that",
  "these", "those", "do", "dont", "does", "not", "no", "when", "then", "into",
  "should", "must", "never", "also", "via", "use", "using", "new", "make", "sure",
  "change", "update", "fix", "add", "remove", "verify", "check", "ensure",
  "confirm", "validate", "behavior", "behaviour", "something", "anything",
]);

function lexicalQueryTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (raw.length < 3) continue;
    if (LEXICAL_FALLBACK_STOPWORDS.has(raw)) continue;
    tokens.add(raw);
  }
  return tokens;
}

function lexicalPathTokens(path: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of path.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (raw.length < 2) continue;
    tokens.add(raw);
  }
  return tokens;
}

// Pure, deterministic graph + lexical fallback selector. Returns file-node paths
// from the graph whose path tokens (plus the labels of capabilities they
// implement) lexically overlap salient task-text tokens, ranked by overlap then
// lexicographically, capped at `limit`. Returns [] when nothing matches. Reads no
// files, calls no providers, executes nothing, embeds nothing. The returned paths
// are REAL graph nodes — only the SELECTION is lexical; they are proposal/context,
// never proof.
export function selectLexicalGraphContextPaths(
  taskText: string,
  graph: TaskContextGraphLike,
  options?: { limit?: number },
): string[] {
  const limit = Math.max(0, options?.limit ?? DEFAULT_LEXICAL_FALLBACK_LIMIT);
  if (limit === 0) return [];
  const query = lexicalQueryTokens(taskText ?? "");
  if (query.size === 0) return [];

  // Capability label tokens, mapped to the paths they are implemented by, so a
  // task mentioning a capability term also surfaces its implementing files.
  const pathCapabilityTokens = new Map<string, Set<string>>();
  for (const cap of graph.capabilities ?? []) {
    const labelTokens = lexicalQueryTokens(`${cap.verb ?? ""} ${cap.noun ?? ""} ${cap.id ?? ""}`);
    if (labelTokens.size === 0) continue;
    for (const ref of cap.implementedBy ?? []) {
      const refId = String(ref.id ?? "");
      const p = refId.split("#")[0] ?? refId;
      if (p.length === 0) continue;
      const set = pathCapabilityTokens.get(p) ?? new Set<string>();
      for (const token of labelTokens) set.add(token);
      pathCapabilityTokens.set(p, set);
    }
  }

  const scored: Array<{ path: string; score: number }> = [];
  const seen = new Set<string>();
  for (const node of graph.nodes ?? []) {
    if (node.kind !== "file") continue;
    const path = node.id;
    if (typeof path !== "string" || path.length === 0 || seen.has(path)) continue;
    seen.add(path);
    const tokens = lexicalPathTokens(path);
    for (const token of pathCapabilityTokens.get(path) ?? []) tokens.add(token);
    let score = 0;
    for (const token of query) if (tokens.has(token)) score += 1;
    if (score > 0) scored.push({ path, score });
  }
  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return scored.slice(0, limit).map((entry) => entry.path);
}

export function buildTaskContextReport(input: BuildTaskContextReportInput): TaskContextReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const taskText = input.taskText ?? "";
  const paths = (input.paths ?? []).map((p) => p.trim()).filter((p) => p.length > 0);
  const graph = input.graph ?? {};
  const graphNodes = graph.nodes ?? [];
  const graphClaims = graph.claims ?? [];
  const graphCapabilities = graph.capabilities ?? [];
  const retrieval = input.retrievalResults ?? [];

  const artifactId = `${TASK_CONTEXT_REPORT_ARTIFACT_ID_PREFIX}${createHash("sha256")
    .update(`${taskText}\n${paths.join(",")}\n${generatedAt}`)
    .digest("hex")
    .slice(0, 16)}`;

  const header: ArtifactHeader = {
    artifactType: "TaskContextReport",
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt,
    subject: { repoId: input.repoId ?? ".", ...(paths.length > 0 ? { paths } : {}) },
    producer: { id: "@rekon/capability-model.task-context-report", version: "0.1.0-beta.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.5, notes: ["task-shaped context is proposal/context, not proof"] },
  };

  const contextItems: TaskContextItem[] = [];
  const seenItemKeys = new Set<string>();
  const neighborhoodNodes: TaskContextGraphNeighborhoodRef[] = [];
  const neighborhoodNodeKeys = new Set<string>();
  const includedClaimIds = new Set<string>();
  const claimIds: string[] = [];
  let counter = 0;

  const nodeExists = (ref: TaskContextGraphRefLike): boolean =>
    graphNodes.some((node) => node.kind === ref.kind && node.id === ref.id);

  const addNeighborhoodNode = (ref: TaskContextGraphRefLike): void => {
    const key = refKey(ref);
    if (neighborhoodNodeKeys.has(key)) return;
    neighborhoodNodeKeys.add(key);
    neighborhoodNodes.push({ kind: ref.kind, id: ref.id });
  };

  const pushItem = (item: Omit<TaskContextItem, "id">, dedupeKey: string): void => {
    if (seenItemKeys.has(dedupeKey)) return;
    seenItemKeys.add(dedupeKey);
    contextItems.push({ id: `ctx-${(counter += 1)}`, ...item });
  };

  // 1. Operator-provided paths: high-priority context, included even if retrieval
  //    misses them.
  for (const path of paths) {
    const fileRef: TaskContextGraphRefLike = { kind: "file", id: path };
    const connected = nodeExists(fileRef);
    pushItem(
      {
        kind: "file",
        path,
        reason: connected
          ? "operator-provided path (connected to the capability graph)"
          : "operator-provided path",
        evidenceRefs: [],
        source: "operator_input",
      },
      `op:${path}`,
    );
    if (connected) addNeighborhoodNode(fileRef);
  }

  // 1b. Graph + lexical fallback paths: when embedding retrieval was unavailable
  //     and no operator --path was given, the CLI passes lexically-matched graph
  //     file-node paths here. They are REAL deterministic graph nodes (selection
  //     is lexical; the nodes are facts), surfaced as deterministic_graph context
  //     and expanded by step 3 like any selected path. Proposal/context, not proof.
  const lexicalPaths = (input.lexicalContextPaths ?? [])
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !paths.includes(p));
  for (const path of lexicalPaths) {
    const fileRef: TaskContextGraphRefLike = { kind: "file", id: path };
    if (!nodeExists(fileRef)) continue; // only surface paths that are real graph nodes
    pushItem(
      {
        kind: "file",
        path,
        reason:
          "graph file node lexically matched to the task text (embedding retrieval unavailable; graph + lexical fallback — proposal/context, not proof)",
        evidenceRefs: [],
        source: "deterministic_graph",
      },
      `lex:${path}`,
    );
    addNeighborhoodNode(fileRef);
  }

  // 2. Embedding retrieval neighbors: strong + useful are always included; weak
  //    neighbors are included as labelled SUPPORTING context ONLY when there are
  //    no strong/useful neighbors (so weak retrieval degrades usefully without
  //    diluting stronger signal, and weak is never presented as core context);
  //    ignored excluded by default. Retrieval is proposal/context, never proof.
  const classifiedRetrieval = retrieval
    .map((result) => {
      const chunk = result.chunk ?? {};
      const path = String(result.path ?? chunk.path ?? "").trim();
      const symbolId = String(result.symbolId ?? chunk.symbolId ?? "").trim();
      const score = typeof result.score === "number" ? result.score : undefined;
      const band: TaskContextScoreBand =
        result.scoreBand ?? (score !== undefined ? classifyBand(score) : "ignored");
      return { result, chunk, path, symbolId, score, band };
    })
    .filter((entry) => entry.band !== "ignored" && (entry.path.length > 0 || entry.symbolId.length > 0));
  const hasStrongOrUseful = classifiedRetrieval.some((entry) => entry.band === "strong" || entry.band === "useful");
  for (const entry of classifiedRetrieval) {
    // Weak neighbors are supporting context only — drop them when stronger signal exists.
    if (entry.band === "weak" && hasStrongOrUseful) continue;
    const { result, chunk, path, symbolId, score, band } = entry;
    const kind: TaskContextItem["kind"] = symbolId ? "symbol" : "file";
    const scoreText = score !== undefined ? ` (score ${score.toFixed(3)})` : "";
    const reason =
      band === "weak"
        ? `weak supporting embedding neighbor (no strong or useful neighbor present; low-confidence supporting context)${scoreText}`
        : `${band} embedding neighbor${scoreText}`;
    pushItem(
      {
        kind,
        ...(path ? { path } : {}),
        ...(symbolId ? { symbolId } : {}),
        reason,
        ...(score !== undefined ? { score: Number(score.toFixed(6)) } : {}),
        scoreBand: band,
        evidenceRefs: result.chunkId ? [result.chunkId] : chunk.id ? [chunk.id] : [],
        source: "embedding_retrieval",
      },
      `emb:${symbolId || path}`,
    );
    if (path && nodeExists({ kind: "file", id: path })) addNeighborhoodNode({ kind: "file", id: path });
  }

  // 3. Deterministic graph expansion: for each selected path, surface directly
  //    connected graph claims (bounded). Deterministic facts outrank embedding
  //    similarity, so they are admitted regardless of embedding score.
  const selectedPaths = new Set<string>([
    ...paths,
    ...lexicalPaths.filter((p) => nodeExists({ kind: "file", id: p })),
    ...contextItems
      .filter((item) => item.source === "embedding_retrieval" && typeof item.path === "string")
      .map((item) => item.path as string),
  ]);
  for (const path of selectedPaths) {
    const fileRef: TaskContextGraphRefLike = { kind: "file", id: path };
    let used = 0;
    for (const claim of graphClaims) {
      if (used >= MAX_GRAPH_CLAIMS_PER_PATH) break;
      const subjectMatch = claim.subject?.kind === "file" && claim.subject?.id === path;
      const objectRef = objectToRef(claim.object);
      const objectMatch = objectRef?.kind === "file" && objectRef?.id === path;
      if (!subjectMatch && !objectMatch) continue;
      const isSemantic = claim.source === "llm";
      const objectText = typeof claim.object === "string" ? claim.object : `${claim.object.kind}:${claim.object.id}`;
      pushItem(
        {
          kind: isSemantic ? "semantic_summary" : "file",
          path,
          reason: `graph claim: ${claim.subject.kind}:${claim.subject.id} ${claim.predicate} ${objectText}`,
          evidenceRefs: [...(claim.evidenceRefs ?? []), claim.id],
          source: isSemantic ? "semantic_file_understanding" : "deterministic_graph",
        },
        `claim:${claim.id}`,
      );
      if (!includedClaimIds.has(claim.id)) {
        includedClaimIds.add(claim.id);
        claimIds.push(claim.id);
      }
      addNeighborhoodNode(fileRef);
      used += 1;
    }
    for (const cap of graphCapabilities) {
      const implementsPath = (cap.implementedBy ?? []).some(
        (ref) => ref.id === path || ref.id.startsWith(`${path}#`),
      );
      if (!implementsPath) continue;
      const label = `${cap.verb ?? ""} ${cap.noun ?? ""}`.trim();
      pushItem(
        {
          kind: "capability",
          path,
          capabilityId: cap.id,
          reason: label.length > 0 ? `capability ${label}` : `capability ${cap.id}`,
          evidenceRefs: [...(cap.evidenceRefs ?? [])],
          source: "deterministic_graph",
        },
        `cap:${cap.id}:${path}`,
      );
      addNeighborhoodNode({ kind: "capability", id: cap.id });
    }
  }

  // 4. Do-not-touch zones from explicit task-text constraints.
  const doNotTouch = extractDoNotTouchZones(taskText, paths);

  // 5. Verification hints from task-text command mentions (hints only).
  const verificationHints = extractVerificationHints(taskText);

  // createTaskContextReport recomputes `summary` and forces every `boundaries`
  // field false, then validates — so the values passed here are normalized.
  return createTaskContextReport({
    header,
    schemaVersion: "0.1.0",
    task: {
      text: taskText,
      paths,
      ...(input.goal !== undefined ? { goal: input.goal } : {}),
    },
    selection: {
      query: taskText,
      ...(input.provider !== undefined ? { provider: input.provider } : {}),
      ...(input.model !== undefined ? { model: input.model } : {}),
      topK: typeof input.topK === "number" ? input.topK : retrieval.length,
      scoreBands: { strong: SCORE_BAND_STRONG, useful: SCORE_BAND_USEFUL, weak: SCORE_BAND_WEAK, ignored: 0 },
    },
    contextItems,
    graphNeighborhood: { nodes: neighborhoodNodes, claims: claimIds },
    doNotTouch,
    verificationHints,
    summary: {
      contextItems: contextItems.length,
      graphNodes: neighborhoodNodes.length,
      graphClaims: claimIds.length,
      doNotTouch: doNotTouch.length,
      verificationHints: verificationHints.length,
      embeddingNeighbors: contextItems.filter((item) => item.source === "embedding_retrieval").length,
    },
    boundaries: {
      retrievalIsProof: false,
      approvedPlans: false,
      executedCommands: false,
      wroteSourceFiles: false,
      createdPreparedIntentPlan: false,
      createdWorkOrder: false,
      createdVerificationPlan: false,
      ranCirce: false,
      implementedIntentGo: false,
    },
  });
}

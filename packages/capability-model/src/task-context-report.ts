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
import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  createTaskContextReport,
  type TaskContextReport,
  type TaskContextItem,
  type TaskContextRouteNecessity,
  type TaskContextRouteRole,
  type TaskContextScoreBand,
  type TaskContextDoNotTouchZone,
  type TaskContextVerificationHint,
  type TaskContextGraphNeighborhoodRef,
  type TaskContextGuidanceFreshness,
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
const MAX_GRAPH_CLAIMS_PER_PATH = 4;

// A task can name a role whose file sits one deterministic hop beyond the
// ordinary neighborhood: another implementation of the same capability, or a
// producer/consumer connected through a contract file. Keep this route much
// tighter than normal graph expansion so the initial packet does not become a
// speculative two-hop graph dump.
const MAX_PROACTIVE_SYMBOLIC_PATHS = 2;

export type TaskContextGraphRefLike = { kind: string; id: string };

export type TaskContextGraphClaimLike = {
  id: string;
  subject: TaskContextGraphRefLike;
  predicate: string;
  object: TaskContextGraphRefLike | string;
  claimType?: string;
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

export type TaskContextGraphEvidenceLike = {
  id: string;
  source?: string;
  path?: string;
  sourceSha256?: string;
  lineStart?: number;
  lineEnd?: number;
  excerpt?: string;
};

export type TaskContextGraphLike = {
  nodes?: TaskContextGraphRefLike[];
  evidence?: TaskContextGraphEvidenceLike[];
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

export type DeclaredTaskConstraint = {
  statement: string;
  path?: string;
  symbolId?: string;
  evidenceRefs: string[];
  freshness?: TaskContextGuidanceFreshness;
};

export type DeclaredTaskVerificationHint = {
  command?: string;
  artifact?: string;
  reason: string;
  evidenceRefs: string[];
  freshness?: TaskContextGuidanceFreshness;
};

export type DeclaredTaskContextPath = {
  path: string;
  reason: string;
  evidenceRefs: string[];
  freshness?: TaskContextGuidanceFreshness;
  routeRole?: TaskContextRouteRole;
  necessity?: TaskContextRouteNecessity;
  necessityReason?: string;
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
  /**
   * Deterministic graph file nodes selected because a matched repository
   * contract declares their capability as a required neighbor.
   */
  declaredContextPaths?: DeclaredTaskContextPath[];
  goal?: string;
  graph: TaskContextGraphLike;
  retrievalResults?: TaskContextRetrievalResultLike[];
  generatedAt?: string;
  provider?: string;
  model?: string;
  topK?: number;
  repoId?: string;
  inputRefs?: ArtifactRef[];
  declaredConstraints?: DeclaredTaskConstraint[];
  declaredVerificationHints?: DeclaredTaskVerificationHint[];
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

type ProactiveSymbolicRoute = {
  path: string;
  reason: string;
  evidenceRefs: string[];
  claimIds: string[];
  score: number;
  routeRole: "implementation" | "handoff";
  necessityReason: string;
};

type TaskContextRouteMetadata = Required<Pick<
  TaskContextItem,
  "routeRole" | "necessity" | "necessityReason"
>>;

function routeMetadata(
  routeRole: TaskContextRouteRole,
  necessity: TaskContextRouteNecessity,
  necessityReason: string,
): TaskContextRouteMetadata {
  return { routeRole, necessity, necessityReason };
}

function taskSignalsHandoffChange(taskText: string): boolean {
  return /\b(?:carry|propagat(?:e|es|ed|ing)|forward|preserv(?:e|es|ed|ing)|pass(?:es|ed|ing)?|thread|handoff|end[- ]to[- ]end)\b/iu.test(taskText)
    || /\b(?:event|message|payload|request|response|contract|schema|metadata)\b[^.!?\n]{0,100}\b(?:add|remove|rename|change|extend|include|omit)\b/iu.test(taskText)
    || /\b(?:add|remove|rename|change|extend|include|omit)\b[^.!?\n]{0,100}\b(?:event|message|payload|request|response|contract|schema|metadata)\b/iu.test(taskText);
}

export function taskNeedsRepositoryExemplar(taskText: string): boolean {
  const extendsRepository = /\b(?:add|create|implement|introduce|extend|register|wire|integrate|scaffold)\b/iu.test(taskText);
  const conventionMatters = /\b(?:adapter|capability|command|component|convention|endpoint|evaluator|handler|middleware|pattern|placement|plugin|projector|provider|publisher|resolver|route|service|style|workflow)\b/iu.test(taskText);
  return extendsRepository && conventionMatters;
}

function graphRouteMetadata(input: {
  taskText: string;
  selectedPath: string;
  contextPath: string;
  predicate: string;
  subjectMatch: boolean;
  pathMatches: number;
  testRelationship: boolean;
}): TaskContextRouteMetadata {
  if (input.contextPath === input.selectedPath) {
    return routeMetadata(
      "task-target",
      "required",
      "The graph claim describes the selected task path itself.",
    );
  }
  if (input.testRelationship) {
    return routeMetadata(
      "verification",
      "required",
      "A direct deterministic test relationship makes this path part of the task's regression boundary.",
    );
  }
  if (symbolicContractRelationship(input.predicate) !== undefined) {
    const required = taskSignalsHandoffChange(input.taskText);
    return routeMetadata(
      "handoff",
      required ? "required" : "conditional",
      required
        ? "The task changes or preserves data carried across this deterministic contract handoff."
        : "Inspect this handoff only if the task changes the shared contract or values crossing it.",
    );
  }
  if (!input.subjectMatch) {
    return routeMetadata(
      "compatibility",
      "conditional",
      "This path calls the selected source; inspect it only if exported behavior or compatibility may change.",
    );
  }
  if (input.pathMatches > 0) {
    return routeMetadata(
      "dependency",
      "required",
      "The task text names a concern represented by this direct dependency.",
    );
  }
  return routeMetadata(
    "dependency",
    "conditional",
    "Inspect this direct dependency only if the selected source delegates the changed behavior to it.",
  );
}

function filePathFromRef(ref: TaskContextGraphRefLike | undefined): string | undefined {
  if (!ref || (ref.kind !== "file" && ref.kind !== "symbol")) return undefined;
  const path = ref.id.split("#")[0]?.trim();
  return path ? path : undefined;
}

function lexicalOverlap(left: Set<string>, right: Set<string>): number {
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap;
}

function symbolicContractRelationship(predicate: string): "consumer" | "producer" | undefined {
  if (/(?:^|[._-])consumes?(?:[._-]|$)/iu.test(predicate)) return "consumer";
  if (/(?:^|[._-])(?:produces?|publishes?|writes?)(?:[._-]|$)/iu.test(predicate)) return "producer";
  return undefined;
}

function relationshipNamedByTask(taskText: string, relationship: "consumer" | "producer"): boolean {
  return relationship === "consumer"
    ? /\b(?:consumer|consume[sd]?|reader|listener|subscriber)\b/iu.test(taskText)
    : /\b(?:producer|produce[sd]?|publisher|emit(?:s|ter)?|writer|exporter)\b/iu.test(taskText)
      || /\bexport(?:s|ed|ing|er|[A-Z][A-Za-z0-9_]*)?\b/u.test(taskText);
}

type SourceLanguageFamily = "js-ts" | "python" | "go" | "java-kotlin" | "ruby" | "rust" | "csharp";

function sourceLanguageFamily(path: string): SourceLanguageFamily | undefined {
  const normalized = path.toLowerCase();
  if (/\.(?:[cm]?[jt]sx?)$/u.test(normalized)) return "js-ts";
  if (/\.pyi?$/u.test(normalized)) return "python";
  if (/\.go$/u.test(normalized)) return "go";
  if (/\.(?:java|kt|kts)$/u.test(normalized)) return "java-kotlin";
  if (/\.rb$/u.test(normalized)) return "ruby";
  if (/\.rs$/u.test(normalized)) return "rust";
  if (/\.cs$/u.test(normalized)) return "csharp";
  return undefined;
}

function taskSignalsLanguage(taskText: string, language: SourceLanguageFamily): boolean {
  const pattern: Record<SourceLanguageFamily, RegExp> = {
    "js-ts": /\b(?:javascript|typescript|node(?:\.js)?|[jt]sx?)\b/iu,
    python: /\b(?:python|pytest|pyproject)\b/iu,
    go: /\b(?:go|golang)\b/iu,
    "java-kotlin": /\b(?:java|kotlin|gradle|maven)\b/iu,
    ruby: /\b(?:ruby|rails|rspec)\b/iu,
    rust: /\b(?:rust|cargo)\b/iu,
    csharp: /\b(?:c#|csharp|dotnet|\.net)\b/iu,
  };
  return pattern[language].test(taskText);
}

function taskAllowsLanguageBoundary(taskText: string, anchorPath: string, candidatePath: string): boolean {
  const anchorLanguage = sourceLanguageFamily(anchorPath);
  const candidateLanguage = sourceLanguageFamily(candidatePath);
  if (!anchorLanguage || !candidateLanguage || anchorLanguage === candidateLanguage) return true;
  if (taskText.includes(candidatePath)) return true;
  if (/\b(?:cross[- ]language|polyglot|multi[- ]language)\b/iu.test(taskText)) return true;
  return taskSignalsLanguage(taskText, candidateLanguage);
}

function selectProactiveSymbolicRoutes(input: {
  taskText: string;
  selectedPaths: Set<string>;
  graphNodes: TaskContextGraphRefLike[];
  graphClaims: TaskContextGraphClaimLike[];
  graphCapabilities: TaskContextGraphCapabilityLike[];
}): ProactiveSymbolicRoute[] {
  const fileNodes = new Set(
    input.graphNodes.filter((node) => node.kind === "file").map((node) => node.id),
  );
  const taskTokens = lexicalQueryTokens(input.taskText);
  const routes = new Map<string, ProactiveSymbolicRoute>();
  const addRoute = (route: ProactiveSymbolicRoute): void => {
    if (!fileNodes.has(route.path) || input.selectedPaths.has(route.path)) return;
    const existing = routes.get(route.path);
    if (!existing || route.score > existing.score) routes.set(route.path, route);
  };

  // A capability can have a registry/adapter and a separate implementation.
  // Route peers only when the task strongly names that capability.
  for (const capability of input.graphCapabilities) {
    const implementationPaths = [...new Set(
      (capability.implementedBy ?? []).map(filePathFromRef).filter((path): path is string => Boolean(path)),
    )];
    const selectedImplementations = implementationPaths.filter((path) => input.selectedPaths.has(path));
    if (selectedImplementations.length === 0) continue;
    const capabilityTokens = lexicalQueryTokens(
      `${capability.verb ?? ""} ${capability.noun ?? ""} ${capability.id ?? ""}`,
    );
    const capabilityOverlap = lexicalOverlap(taskTokens, capabilityTokens);
    if (capabilityOverlap < 2) continue;
    for (const path of implementationPaths) {
      if (input.selectedPaths.has(path)) continue;
      if (!selectedImplementations.some((anchorPath) => (
        taskAllowsLanguageBoundary(input.taskText, anchorPath, path)
      ))) continue;
      addRoute({
        path,
        reason: `task-signaled implementation of graph capability ${capability.id}`,
        evidenceRefs: [...(capability.evidenceRefs ?? [])],
        claimIds: [],
        score: 20 + capabilityOverlap + lexicalOverlap(taskTokens, lexicalPathTokens(path)),
        routeRole: "implementation",
        necessityReason: "The task names this deterministic capability implementation as part of the requested behavior.",
      });
    }
  }

  // Producers and consumers often sit behind a shared contract. Admit only
  // typed deterministic relationships whose role is explicit in the task or
  // whose candidate path has task-specific lexical support.
  for (const selectedPath of input.selectedPaths) {
    const selectedContractClaims = input.graphClaims.filter((claim) => {
      if (claim.source === "llm" || !/contract/iu.test(claim.predicate)) return false;
      const subjectPath = filePathFromRef(claim.subject);
      const objectPath = filePathFromRef(objectToRef(claim.object));
      return subjectPath === selectedPath || objectPath === selectedPath;
    });
    for (const selectedClaim of selectedContractClaims) {
      const subjectPath = filePathFromRef(selectedClaim.subject);
      const objectPath = filePathFromRef(objectToRef(selectedClaim.object));
      const contractPath = subjectPath === selectedPath ? objectPath : subjectPath;
      if (!contractPath || contractPath === selectedPath) continue;
      const routeAnchorTokens = new Set([
        ...lexicalPathTokens(selectedPath),
        ...lexicalPathTokens(contractPath),
      ]);
      const taskSpecificTokens = new Set(
        [...taskTokens].filter((token) => !routeAnchorTokens.has(token)),
      );
      for (const claim of input.graphClaims) {
        if (claim.id === selectedClaim.id || claim.source === "llm") continue;
        const relationship = symbolicContractRelationship(claim.predicate);
        if (!relationship) continue;
        const candidateSubject = filePathFromRef(claim.subject);
        const candidateObject = filePathFromRef(objectToRef(claim.object));
        const path: string | undefined = candidateSubject === contractPath
          ? candidateObject
          : candidateObject === contractPath
            ? candidateSubject
            : undefined;
        if (!path || path === selectedPath || path === contractPath) continue;
        if (!taskAllowsLanguageBoundary(input.taskText, selectedPath, path)) continue;
        const pathOverlap = lexicalOverlap(taskSpecificTokens, lexicalPathTokens(path));
        const explicitRelationship = relationshipNamedByTask(input.taskText, relationship);
        if (!explicitRelationship && pathOverlap === 0) continue;
        addRoute({
          path,
          reason: `task-signaled ${relationship} through contract ${contractPath} via graph predicate ${claim.predicate}`,
          evidenceRefs: [...new Set([
            ...(selectedClaim.evidenceRefs ?? []),
            selectedClaim.id,
            ...(claim.evidenceRefs ?? []),
            claim.id,
          ])],
          claimIds: [selectedClaim.id, claim.id],
          score: 10 + (explicitRelationship ? 6 : 0) + pathOverlap,
          routeRole: "handoff",
          necessityReason: `The task names the ${relationship} side of this deterministic contract handoff.`,
        });
      }
    }
  }

  return [...routes.values()]
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, MAX_PROACTIVE_SYMBOLIC_PATHS);
}

function selectGraphRepositoryExemplar(input: {
  taskText: string;
  selectedPaths: ReadonlySet<string>;
  graphNodes: TaskContextGraphRefLike[];
  graphClaims: TaskContextGraphClaimLike[];
}): { path: string; claim: TaskContextGraphClaimLike; score: number; anchorPath: string } | undefined {
  if (!taskNeedsRepositoryExemplar(input.taskText)) return undefined;
  const fileNodes = new Set(
    input.graphNodes.filter((node) => node.kind === "file").map((node) => node.id),
  );
  const candidates = input.graphClaims.flatMap((claim) => {
    if (claim.source !== "embedding" || claim.status === "rejected") return [];
    const score = typeof claim.confidence === "number" ? claim.confidence : 0;
    if (classifyBand(score) !== "strong" && classifyBand(score) !== "useful") return [];
    const subjectPath = filePathFromRef(claim.subject);
    const objectPath = filePathFromRef(objectToRef(claim.object));
    const anchorPath = subjectPath && input.selectedPaths.has(subjectPath)
      ? subjectPath
      : objectPath && input.selectedPaths.has(objectPath)
        ? objectPath
        : undefined;
    const path = anchorPath === subjectPath ? objectPath : subjectPath;
    if (!anchorPath || !path || input.selectedPaths.has(path) || !fileNodes.has(path)) return [];
    if (!taskAllowsLanguageBoundary(input.taskText, anchorPath, path)) return [];
    return [{ path, claim, score, anchorPath }];
  });
  return candidates.sort((left, right) =>
    right.score - left.score || left.path.localeCompare(right.path) || left.claim.id.localeCompare(right.claim.id))[0];
}

// Extract do-not-touch zones from explicit task-text constraints. v1 is
// conservative: it only surfaces constraints the operator stated using direct
// prohibition or preservation language. Evidence-supported graph-claim zones
// are a documented follow-up.
function extractDoNotTouchZones(taskText: string, paths: string[]): TaskContextDoNotTouchZone[] {
  const zones: TaskContextDoNotTouchZone[] = [];
  const seen = new Set<string>();
  const constraintMarker = /\b(do not|don'?t|must not|never|do-not-touch|without\s+(?:changing|modifying|altering)|preserv(?:e|ing)|maintain(?:ing)?|keep(?:ing)?)\b/i;
  const clauses = taskText.split(/(?<=[.!?])\s+|\n+/);
  for (const clauseRaw of clauses) {
    const clause = clauseRaw.trim();
    if (clause.length === 0) continue;
    const markerIndex = clause.search(constraintMarker);
    if (markerIndex < 0) continue;
    const reason = clause.replace(/\s+/g, " ").trim();
    const key = reason.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const matchedPath = paths.find((path) => {
      const pathIndex = clause.indexOf(path);
      if (pathIndex < 0) return false;
      if (pathIndex > markerIndex) return true;
      const suffix = clause.slice(pathIndex + path.length);
      return /^\s+(?:must not|should not|cannot|can'?t|is protected)\b/i.test(suffix);
    });
    zones.push({
      reason,
      ...(matchedPath ? { path: matchedPath } : {}),
      evidenceRefs: [],
      source: "operator_input",
      freshness: "fresh",
    });
  }
  return zones;
}

// Recognizes command-style verification mentions (explicit commands or the
// keyword-mapped scripts below). Used both to extract command hints and to skip
// the same clauses during free-form extraction, so a clause never yields both a
// command hint and a redundant free-form hint.
const VERIFICATION_COMMAND_KEYWORD = /\b(npm run|npm test|pytest|go test|typecheck|type-check|build|compile|lint|tests?)\b/i;
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
    hints.push({ command, reason, evidenceRefs: [], source: "operator_input", freshness: "fresh" });
  };
  for (const cmd of taskText.match(/npm run [a-z0-9:_-]+/gi) ?? []) {
    addCommand(cmd.replace(/\s+/g, " ").trim(), "task references this command (hint only, not executed)");
  }
  if (/\bnpm test\b/i.test(taskText)) addCommand("npm test", "task references this command (hint only, not executed)");
  if (/\bpytest\b/i.test(taskText)) addCommand("pytest", "task references this command (hint only, not executed)");
  for (const cmd of taskText.match(/\bgo test(?:\s+(?:\.\/\.\.\.|\.\/[a-z0-9_./-]+|[a-z0-9_.-]+\/[a-z0-9_./-]+|-[a-z0-9_=.-]+))*/gi) ?? []) {
    addCommand(cmd.replace(/\s+/g, " ").trim(), "task references this command (hint only, not executed)");
  }
  if (/\btypecheck\b/.test(lower)) addCommand("npm run typecheck", "task references typecheck verification (hint only)");
  if (/\b(build|compile)\b/.test(lower)) addCommand("npm run build", "task references build verification (hint only)");
  if (/\blint\b/.test(lower)) addCommand("npm run lint", "task references lint verification (hint only)");
  const hasExplicitTestCommand = [...seenCommands].some(
    (command) => command === "npm test"
      || /^npm run test(?::[a-z0-9_-]+)?$/i.test(command)
      || command === "pytest"
      || /^go test(?:\s|$)/i.test(command),
  );
  if (/\b(test|tests)\b/.test(lower) && !hasExplicitTestCommand) {
    addCommand("npm test", "task references test verification (hint only)");
  }

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
      source: "operator_input",
      freshness: "fresh",
    });
  }
  return hints;
}

function dedupeConstraints(values: TaskContextDoNotTouchZone[]): TaskContextDoNotTouchZone[] {
  const seen = new Set<string>();
  return values.filter((entry) => {
    const key = `${entry.reason.trim().toLowerCase()}\0${entry.path ?? ""}\0${entry.symbolId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeVerificationHints(values: TaskContextVerificationHint[]): TaskContextVerificationHint[] {
  const seen = new Set<string>();
  return values.filter((entry) => {
    const key = `${entry.command ?? ""}\0${entry.artifact ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const maxScore = scored[0]?.score ?? 0;
  const minimumScore = maxScore >= 3 ? maxScore - 1 : 1;
  return scored
    .filter((entry) => entry.score >= minimumScore)
    .slice(0, limit)
    .map((entry) => entry.path);
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
  const supersessionKey = `task:${createHash("sha256")
    .update(`${taskText}\n${[...paths].sort().join(",")}`)
    .digest("hex")}`;

  const header: ArtifactHeader = {
    artifactType: "TaskContextReport",
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt,
    supersession: { key: supersessionKey },
    subject: { repoId: input.repoId ?? ".", ...(paths.length > 0 ? { paths } : {}) },
    producer: { id: "@rekon/capability-model.task-context-report", version: "0.1.0-beta.0" },
    inputRefs: [...(input.inputRefs ?? [])],
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
        ...routeMetadata(
          "task-target",
          "required",
          "The operator explicitly named this path as task scope.",
        ),
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
        ...routeMetadata(
          "task-target",
          "required",
          "This deterministic graph node is the selected task anchor when no explicit path was supplied.",
        ),
      },
      `lex:${path}`,
    );
    addNeighborhoodNode(fileRef);
  }

  // 1c. Repository-contract required neighbors. The contract chooses the
  // capability, while the deterministic graph supplies the implementing file
  // node. The item remains context, not proof, and carries both citations.
  const declaredPaths = (input.declaredContextPaths ?? [])
    .filter((entry) => entry.path.trim().length > 0)
    .filter((entry) => !paths.includes(entry.path) && !lexicalPaths.includes(entry.path));
  for (const entry of declaredPaths) {
    const path = entry.path.trim();
    const fileRef: TaskContextGraphRefLike = { kind: "file", id: path };
    if (!nodeExists(fileRef)) continue;
    pushItem(
      {
        kind: "file",
        path,
        reason: entry.reason,
        evidenceRefs: entry.evidenceRefs,
        source: "deterministic_graph",
        ...routeMetadata(
          entry.routeRole ?? "repository-law",
          entry.necessity ?? "required",
          entry.necessityReason ?? "Matched repository law declares this path required context for the task.",
        ),
      },
      `declared:${path}`,
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
        ...routeMetadata(
          "supporting",
          "supporting",
          "Similarity suggests possible relevance but does not make this path necessary.",
        ),
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
    ...declaredPaths
      .map((entry) => entry.path.trim())
      .filter((p) => nodeExists({ kind: "file", id: p })),
    ...contextItems
      .filter((item) => item.source === "embedding_retrieval" && typeof item.path === "string")
      .map((item) => item.path as string),
  ]);

  // Keep one high-signal local precedent available for extension and placement
  // tasks even when deterministic one-hop claims fill the normal graph budget.
  // Similarity proposes the file; exact digest-bound evidence is still required
  // before the compiler can expose any source excerpt from it.
  const graphExemplar = selectGraphRepositoryExemplar({
    taskText,
    selectedPaths,
    graphNodes,
    graphClaims,
  });
  if (graphExemplar) {
    const { claim, path, score, anchorPath } = graphExemplar;
    pushItem(
      {
        kind: "file",
        path,
        reason: `high-signal cached repository precedent related to ${anchorPath}`,
        score: Number(score.toFixed(6)),
        scoreBand: classifyBand(score),
        evidenceRefs: [...(claim.evidenceRefs ?? []), claim.id],
        source: "embedding_retrieval",
        ...routeMetadata(
          "supporting",
          "supporting",
          "Cached similarity proposes this local precedent; inspect it only when repository placement or extension conventions matter.",
        ),
      },
      `graph-exemplar:${path}`,
    );
    addNeighborhoodNode({ kind: "file", id: path });
    if (!includedClaimIds.has(claim.id)) {
      includedClaimIds.add(claim.id);
      claimIds.push(claim.id);
    }
  }

  for (const path of selectedPaths) {
    const fileRef: TaskContextGraphRefLike = { kind: "file", id: path };
    const selectedPathTokens = lexicalQueryTokens(path);
    const taskSpecificTokens = new Set(
      [...lexicalQueryTokens(taskText)].filter((token) => !selectedPathTokens.has(token)),
    );
    const connectedClaims = graphClaims.flatMap((claim) => {
      const subjectMatch = claim.subject?.kind === "file" && claim.subject?.id === path;
      const objectRef = objectToRef(claim.object);
      const objectMatch = objectRef?.kind === "file" && objectRef?.id === path;
      if (!subjectMatch && !objectMatch) return [];
      const relatedFileRef = subjectMatch && objectRef?.kind === "file"
        ? objectRef
        : objectMatch && claim.subject.kind === "file"
          ? claim.subject
          : undefined;
      const contextPath = relatedFileRef?.id ?? path;
      const pathMatches = [...lexicalQueryTokens(contextPath)]
        .filter((token) => taskSpecificTokens.has(token)).length;
      const testRelationship = claim.source === "test"
        || /(?:^|[._-])(test|tests|verify|verifies)(?:$|[._-])/i.test(claim.predicate)
        || /(?:^|\/)tests?(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(contextPath);
      return [{
        claim,
        subjectMatch,
        relatedFileRef,
        contextPath,
        pathMatches,
        testRelationship,
        deterministic: claim.source !== "llm"
          && claim.source !== "embedding"
          && claim.claimType !== "inference"
          && claim.claimType !== "recommendation",
      }];
    }).sort((left, right) =>
      Number(right.deterministic) - Number(left.deterministic)
      || right.pathMatches - left.pathMatches
      || Number(right.testRelationship) - Number(left.testRelationship)
      || Number(right.subjectMatch) - Number(left.subjectMatch)
      || left.claim.id.localeCompare(right.claim.id));

    for (const candidate of connectedClaims.slice(0, MAX_GRAPH_CLAIMS_PER_PATH)) {
      const { claim, relatedFileRef, contextPath } = candidate;
      const isEmbedding = claim.source === "embedding";
      const isInference = isEmbedding
        || claim.source === "llm"
        || claim.claimType === "inference"
        || claim.claimType === "recommendation";
      const objectText = typeof claim.object === "string" ? claim.object : `${claim.object.kind}:${claim.object.id}`;
      const route = isInference
        ? routeMetadata(
            "supporting",
            "supporting",
            "Inferred context is advisory and must not become a required repository route.",
          )
        : graphRouteMetadata({
            taskText,
            selectedPath: path,
            contextPath,
            predicate: claim.predicate,
            subjectMatch: candidate.subjectMatch,
            pathMatches: candidate.pathMatches,
            testRelationship: candidate.testRelationship,
          });
      pushItem(
        {
          kind: isInference && !isEmbedding ? "semantic_summary" : "file",
          path: contextPath,
          reason: `graph claim: ${claim.subject.kind}:${claim.subject.id} ${claim.predicate} ${objectText}`,
          ...(isEmbedding && typeof claim.confidence === "number"
            ? {
                score: Number(claim.confidence.toFixed(6)),
                scoreBand: classifyBand(claim.confidence),
              }
            : {}),
          evidenceRefs: [...(claim.evidenceRefs ?? []), claim.id],
          source: isEmbedding
            ? "embedding_retrieval"
            : isInference
              ? "semantic_file_understanding"
              : "deterministic_graph",
          ...route,
        },
        `claim:${claim.id}`,
      );
      if (!includedClaimIds.has(claim.id)) {
        includedClaimIds.add(claim.id);
        claimIds.push(claim.id);
      }
      addNeighborhoodNode(fileRef);
      if (relatedFileRef && nodeExists(relatedFileRef)) addNeighborhoodNode(relatedFileRef);
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
          ...routeMetadata(
            "implementation",
            "supporting",
            "Capability identity explains the selected file but does not add another source-read obligation.",
          ),
        },
        `cap:${cap.id}:${path}`,
      );
      addNeighborhoodNode({ kind: "capability", id: cap.id });
    }
  }

  // 3b. Bounded proactive symbolic routing. These are deterministic graph
  // routes that the task itself makes relevant, but which ordinary one-hop
  // expansion cannot reach. Refinement remains the fallback when this policy
  // cannot identify the target confidently.
  for (const route of selectProactiveSymbolicRoutes({
    taskText,
    selectedPaths,
    graphNodes,
    graphClaims,
    graphCapabilities,
  })) {
    pushItem(
      {
        kind: "file",
        path: route.path,
        reason: route.reason,
        evidenceRefs: route.evidenceRefs,
        source: "deterministic_graph",
        ...routeMetadata(route.routeRole, "required", route.necessityReason),
      },
      `symbolic-route:${route.path}`,
    );
    addNeighborhoodNode({ kind: "file", id: route.path });
    for (const claimId of route.claimIds) {
      if (includedClaimIds.has(claimId)) continue;
      includedClaimIds.add(claimId);
      claimIds.push(claimId);
    }
  }

  // 4. Constraints from operator text and explicitly supplied repository law.
  const doNotTouch = dedupeConstraints([
    ...extractDoNotTouchZones(taskText, paths),
    ...(input.declaredConstraints ?? []).map((constraint): TaskContextDoNotTouchZone => ({
      reason: constraint.statement,
      ...(constraint.path ? { path: constraint.path } : {}),
      ...(constraint.symbolId ? { symbolId: constraint.symbolId } : {}),
      evidenceRefs: [...constraint.evidenceRefs],
      source: "repository_contract",
      freshness: constraint.freshness ?? "unknown",
    })),
  ]);

  // 5. Verification hints from operator text and repository contracts. Hints only.
  const verificationHints = dedupeVerificationHints([
    ...extractVerificationHints(taskText),
    ...(input.declaredVerificationHints ?? []).map((hint): TaskContextVerificationHint => ({
      ...(hint.command ? { command: hint.command } : {}),
      ...(hint.artifact ? { artifact: hint.artifact } : {}),
      reason: hint.reason,
      evidenceRefs: [...hint.evidenceRefs],
      source: "repository_contract",
      freshness: hint.freshness ?? "unknown",
    })),
  ]);

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

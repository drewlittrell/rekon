// CapabilityEvidenceGraph v1 builder (capability-evidence-graph-v1).
//
// Pure, deterministic-only construction of the CapabilityEvidenceGraph substrate
// from supplied source files. v1 extracts file nodes, symbol nodes, import +
// exposes FACTS (confidence 1.0), and heuristic capability INFERENCES (verb:noun
// from exported symbol names, confidence <= 0.5) from exported symbols. It uses
// NO LLM, generates NO embeddings, executes NO commands, writes NO source, and
// runs NO Circe — the artifact factory forces every boundary boolean false. The
// graph is evidence-backed context, not proof by itself.

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  createCapabilityEvidenceGraph,
  type CapabilityEvidenceClaim,
  type CapabilityEvidenceGraph,
  type CapabilityEvidenceGraphCapabilityNode,
  type CapabilityEvidenceRef,
  type CapabilityGraphRef,
} from "@rekon/kernel-repo-model";

import type { SemanticFileUnderstandingReportLike } from "./semantic-file-context.js";

export const CAPABILITY_EVIDENCE_GRAPH_ARTIFACT_ID_PREFIX = "capability-evidence-graph-";

export type CapabilityEvidenceGraphInputFile = {
  path: string;
  sha256?: string;
  text?: string;
  language?: string;
};

/**
 * A stored SemanticFileUnderstandingReport offered to the graph build as
 * LLM-derived inference EVIDENCE (slice 156). Opt-in only: a graph build that
 * receives no semantic reports is identical to the deterministic-only v1 build.
 */
export type SemanticReportForGraph = {
  report: SemanticFileUnderstandingReportLike;
  ref?: ArtifactRef;
};

export type BuildCapabilityEvidenceGraphInput = {
  root?: string;
  files: CapabilityEvidenceGraphInputFile[];
  generatedAt?: string;
  /**
   * Optional SemanticFileUnderstandingReport(s) to fold in as `llm_extraction`
   * evidence and `llm` / `inference` claims. Deterministic facts always win;
   * stale/unmatched reports are surfaced as needs-review claims, never consumed
   * silently. Omitting this field keeps the build deterministic-only.
   */
  semanticFileUnderstandingReports?: SemanticReportForGraph[];
};

// Confidence mapping for semantic capability signals (slice 155 decision):
// low/medium/high -> a graph numeric confidence that is NEVER 1.0 (1.0 is
// reserved for deterministic facts). Summary-derived inference claims (purpose,
// responsibilities) use the medium default; touched concepts, findings, and
// conflicted/needs-review claims use the low value.
const SEMANTIC_CONFIDENCE_BY_ENUM: Record<string, number> = { low: 0.25, medium: 0.5, high: 0.75 };
const SEMANTIC_DEFAULT_CONFIDENCE = 0.5;
const SEMANTIC_LOW_CONFIDENCE = 0.25;

function confidenceFromEnum(value: unknown): number {
  if (typeof value === "string" && value in SEMANTIC_CONFIDENCE_BY_ENUM) {
    return SEMANTIC_CONFIDENCE_BY_ENUM[value] as number;
  }
  return SEMANTIC_LOW_CONFIDENCE;
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/** A report's boundaries must be present and all-false to be consumed. */
function semanticBoundariesAllFalse(boundaries: Record<string, unknown> | undefined): boolean {
  if (!boundaries || typeof boundaries !== "object") return false;
  const values = Object.values(boundaries);
  if (values.length === 0) return false;
  return values.every((value) => value === false);
}

export type SemanticReportGraphSelection = {
  requested: number;
  usable: Array<{ report: SemanticFileUnderstandingReportLike; ref?: ArtifactRef; path: string }>;
  stale: Array<{ path: string; reason: "sha-mismatch" | "boundaries-not-clean"; ref?: ArtifactRef }>;
  missing: Array<{ path: string; reason: "unmatched-path" | "missing-path"; ref?: ArtifactRef }>;
  warnings: string[];
};

/**
 * Pure selection of which semantic reports a graph build may consume. A report
 * is usable only when its `file.path` matches a graphed file, its boundaries are
 * all false, and (when a current hash is known) its `file.sha256` matches. Stale
 * / unmatched reports are returned for surfacing — never consumed silently. When
 * multiple usable reports share a path, the latest (last in order) wins. Used by
 * both the builder (for mapping) and the CLI (for the JSON summary), so both
 * agree on exactly what was consumed.
 */
export function selectSemanticReportsForGraph(input: {
  reports?: SemanticReportForGraph[];
  files?: CapabilityEvidenceGraphInputFile[];
}): SemanticReportGraphSelection {
  const filePaths = new Set<string>();
  const fileHash = new Map<string, string>();
  for (const file of input.files ?? []) {
    if (!file || typeof file.path !== "string" || file.path.length === 0) continue;
    const path = normalizePath(file.path);
    filePaths.add(path);
    if (typeof file.sha256 === "string" && file.sha256.length > 0) fileHash.set(path, file.sha256);
  }

  const reports = input.reports ?? [];
  const usableByPath = new Map<string, { report: SemanticFileUnderstandingReportLike; ref?: ArtifactRef; path: string }>();
  const stale: SemanticReportGraphSelection["stale"] = [];
  const missing: SemanticReportGraphSelection["missing"] = [];
  const warnings: string[] = [];

  for (const entry of reports) {
    if (!entry || !entry.report) continue;
    const rawPath = entry.report.file?.path;
    const path = typeof rawPath === "string" ? normalizePath(rawPath) : "";
    if (path.length === 0) {
      missing.push({ path: "", reason: "missing-path", ...(entry.ref ? { ref: entry.ref } : {}) });
      warnings.push("Semantic report skipped: report has no file path.");
      continue;
    }
    if (!filePaths.has(path)) {
      missing.push({ path, reason: "unmatched-path", ...(entry.ref ? { ref: entry.ref } : {}) });
      warnings.push(`Semantic report for ${path} skipped: no matching graphed file.`);
      continue;
    }
    if (!semanticBoundariesAllFalse(entry.report.boundaries)) {
      stale.push({ path, reason: "boundaries-not-clean", ...(entry.ref ? { ref: entry.ref } : {}) });
      warnings.push(`Semantic report for ${path} skipped: boundaries are not all false.`);
      continue;
    }
    const reportSha = entry.report.file?.sha256;
    const currentSha = fileHash.get(path);
    if (typeof reportSha === "string" && reportSha.length > 0 && currentSha && reportSha !== currentSha) {
      stale.push({ path, reason: "sha-mismatch", ...(entry.ref ? { ref: entry.ref } : {}) });
      warnings.push(`Semantic report for ${path} skipped: sha256 mismatch (source changed since the report).`);
      continue;
    }
    // Latest wins for a shared path.
    usableByPath.set(path, { report: entry.report, path, ...(entry.ref ? { ref: entry.ref } : {}) });
  }

  return { requested: reports.length, usable: [...usableByPath.values()], stale, missing, warnings };
}

/** Derive a (verb, noun) pair from a capability signal id/label, or null. */
function deriveSignalVerbNoun(signal: { id?: string; label?: string }): { verb: string; noun: string } | null {
  const candidates = [signal.id, signal.label].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  for (const candidate of candidates) {
    const tokens = splitSymbolTokens(candidate.replace(/^cap:/i, "").replace(/[:]+/g, " "));
    if (tokens.length >= 2 && tokens[0] && KNOWN_VERBS.has(tokens[0])) {
      return { verb: tokens[0], noun: tokens.slice(1).join(" ") };
    }
  }
  return null;
}

// Conservative verb vocabulary. Only exported symbols whose first camel/snake
// token is a known verb produce a capability inference — this avoids
// overclaiming (e.g. `joinName` → `join` is not a verb here, so no capability).
const KNOWN_VERBS = new Set<string>([
  "get", "fetch", "load", "read", "list", "find", "search", "query",
  "create", "add", "insert", "build", "make", "generate",
  "update", "edit", "modify", "set", "save", "write", "persist", "store",
  "delete", "remove", "destroy", "clear", "drop",
  "validate", "verify", "check", "ensure", "assert",
  "parse", "normalize", "transform", "convert", "format", "serialize", "deserialize",
  "render", "compute", "calculate", "resolve", "derive", "map", "filter", "reduce", "sort",
  "handle", "process", "run", "execute", "dispatch", "route",
  "send", "emit", "publish", "notify", "broadcast",
  "register", "configure", "init", "initialize", "connect", "open", "close", "start", "stop", "sync",
]);

function normalizePath(path: string): string {
  return String(path).replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function splitSymbolTokens(name: string): string[] {
  const cleaned = name.replace(/[_-]+/g, " ");
  const tokens: string[] = [];
  for (const chunk of cleaned.split(/\s+/)) {
    if (chunk.length === 0) continue;
    const matches = chunk.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])/g);
    if (matches) tokens.push(...matches);
    else tokens.push(chunk);
  }
  return tokens.map((token) => token.toLowerCase()).filter((token) => token.length > 0);
}

const IMPORT_FROM_RE = /^\s*import\b[^;]*?\bfrom\s+['"]([^'"]+)['"]/;
const IMPORT_BARE_RE = /^\s*import\s+['"]([^'"]+)['"]/;
const REQUIRE_RE = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/;
const DYNAMIC_IMPORT_RE = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/;
const EXPORT_FUNCTION_RE = /^\s*export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/;
const EXPORT_CLASS_RE = /^\s*export\s+(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/;
const EXPORT_CONST_RE = /^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/;

type ExtractedSymbol = { name: string; kind: "function" | "class" | "const"; line: number; excerpt: string };

function extractFile(text: string): { imports: Array<{ module: string; line: number; excerpt: string }>; symbols: ExtractedSymbol[] } {
  const imports: Array<{ module: string; line: number; excerpt: string }> = [];
  const symbols: ExtractedSymbol[] = [];
  const seenImports = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    const excerpt = line.trim().slice(0, 200);
    const importMatch =
      line.match(IMPORT_FROM_RE) ?? line.match(IMPORT_BARE_RE) ?? line.match(REQUIRE_RE) ?? line.match(DYNAMIC_IMPORT_RE);
    if (importMatch && typeof importMatch[1] === "string" && importMatch[1].length > 0) {
      const moduleName = importMatch[1];
      if (!seenImports.has(moduleName)) {
        seenImports.add(moduleName);
        imports.push({ module: moduleName, line: lineNo, excerpt });
      }
    }
    const fn = line.match(EXPORT_FUNCTION_RE);
    if (fn?.[1]) symbols.push({ name: fn[1], kind: "function", line: lineNo, excerpt });
    const cls = line.match(EXPORT_CLASS_RE);
    if (cls?.[1]) symbols.push({ name: cls[1], kind: "class", line: lineNo, excerpt });
    const cnst = line.match(EXPORT_CONST_RE);
    if (cnst?.[1]) symbols.push({ name: cnst[1], kind: "const", line: lineNo, excerpt });
  }
  return { imports, symbols };
}

/**
 * Build a CapabilityEvidenceGraph from supplied source files using deterministic
 * facts only. No LLM, no embeddings, no providers, no fs (the caller reads files
 * and passes their text). Imports/exposes are FACTS (confidence 1.0); verb:noun
 * capabilities derived from exported symbol names are INFERENCES (confidence
 * <= 0.5). The factory forces every boundary boolean false.
 */
export function buildCapabilityEvidenceGraph(input: BuildCapabilityEvidenceGraphInput): CapabilityEvidenceGraph {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const idStamp = Date.parse(generatedAt);
  const artifactId = `${CAPABILITY_EVIDENCE_GRAPH_ARTIFACT_ID_PREFIX}${Number.isFinite(idStamp) ? idStamp : Date.now()}`;
  const header: ArtifactHeader = {
    artifactType: "CapabilityEvidenceGraph",
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt,
    subject: { repoId: input.root ?? "." },
    producer: { id: "@rekon/capability-model.capability-evidence-graph", version: "0.1.0-beta.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: 1 },
  };

  const nodes: CapabilityGraphRef[] = [];
  const nodeKeys = new Set<string>();
  const addNode = (node: CapabilityGraphRef): void => {
    const key = `${node.kind}:${node.id}`;
    if (nodeKeys.has(key)) return;
    nodeKeys.add(key);
    nodes.push(node);
  };

  const evidence: CapabilityEvidenceRef[] = [];
  const claims: CapabilityEvidenceClaim[] = [];
  const capabilitiesById = new Map<string, CapabilityEvidenceGraphCapabilityNode>();
  let evidenceCounter = 0;
  // Deterministic facts per file — the authoritative substrate that semantic
  // claims are reconciled against (deterministic facts win).
  const deterministicExportsByFile = new Map<string, Set<string>>();
  const deterministicImportsByFile = new Map<string, Set<string>>();

  for (const rawFile of input.files ?? []) {
    if (!rawFile || typeof rawFile.path !== "string" || rawFile.path.length === 0) continue;
    const filePath = normalizePath(rawFile.path);
    const fileRef: CapabilityGraphRef = { kind: "file", id: filePath };
    addNode(fileRef);

    const text = typeof rawFile.text === "string" ? rawFile.text : "";
    const { imports, symbols } = extractFile(text);
    deterministicImportsByFile.set(filePath, new Set(imports.map((imp) => imp.module)));
    deterministicExportsByFile.set(filePath, new Set(symbols.map((symbol) => symbol.name)));

    for (const imp of imports) {
      const evId = `ev:${filePath}:${(evidenceCounter += 1)}`;
      evidence.push({ id: evId, source: "deterministic_scan", path: filePath, lineStart: imp.line, excerpt: imp.excerpt });
      claims.push({
        id: `claim:imports:${filePath}:${imp.module}`,
        subject: fileRef,
        predicate: "imports",
        object: imp.module,
        claimType: "fact",
        source: "deterministic",
        confidence: 1.0,
        evidenceRefs: [evId],
        status: "accepted",
      });
    }

    const seenSymbolNames = new Set<string>();
    for (const symbol of symbols) {
      if (seenSymbolNames.has(symbol.name)) continue;
      seenSymbolNames.add(symbol.name);
      const symbolRef: CapabilityGraphRef = { kind: "symbol", id: `${filePath}#${symbol.name}` };
      addNode(symbolRef);
      const exposeEvId = `ev:${filePath}:${(evidenceCounter += 1)}`;
      evidence.push({ id: exposeEvId, source: "deterministic_scan", path: filePath, lineStart: symbol.line, excerpt: symbol.excerpt });
      claims.push({
        id: `claim:exposes:${filePath}#${symbol.name}`,
        subject: fileRef,
        predicate: "exposes",
        object: symbolRef,
        claimType: "fact",
        source: "deterministic",
        confidence: 1.0,
        evidenceRefs: [exposeEvId],
        status: "accepted",
      });

      // Capability heuristic — only on function/const exports whose first token
      // is a known verb and that have at least one noun token. Inference, not fact.
      if (symbol.kind === "class") continue;
      const tokens = splitSymbolTokens(symbol.name);
      if (tokens.length < 2) continue;
      const verb = tokens[0];
      if (!verb || !KNOWN_VERBS.has(verb)) continue;
      const noun = tokens.slice(1).join(" ");
      if (noun.length === 0) continue;
      const capId = `cap:${verb}:${noun.replace(/\s+/g, "-")}`;
      const capRef: CapabilityGraphRef = { kind: "capability", id: capId };
      addNode(capRef);
      const existing = capabilitiesById.get(capId);
      if (existing) {
        if (!existing.implementedBy.some((ref) => ref.id === symbolRef.id)) existing.implementedBy.push(symbolRef);
        if (!existing.evidenceRefs.includes(exposeEvId)) existing.evidenceRefs.push(exposeEvId);
      } else {
        capabilitiesById.set(capId, {
          id: capId,
          verb,
          noun,
          implementedBy: [symbolRef],
          entrypoints: [],
          sideEffects: [],
          dependencies: [],
          consumers: [],
          confidence: 0.5,
          evidenceRefs: [exposeEvId],
        });
      }
      claims.push({
        id: `claim:implements:${filePath}#${symbol.name}:${capId}`,
        subject: symbolRef,
        predicate: "implements",
        object: capRef,
        claimType: "inference",
        source: "deterministic",
        confidence: 0.5,
        evidenceRefs: [exposeEvId],
        status: "accepted",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Semantic pass (slice 156) — opt-in. SemanticFileUnderstandingReport content
  // enters as `llm_extraction` evidence and `llm` / `inference` claims, NEVER as
  // facts. The build calls no provider; it reads stored reports. Deterministic
  // facts win; stale/unmatched reports become needs-review claims (never silent).
  // ---------------------------------------------------------------------------
  const semanticInputs = input.semanticFileUnderstandingReports ?? [];
  if (semanticInputs.length > 0) {
    const selection = selectSemanticReportsForGraph({ reports: semanticInputs, files: input.files });
    let semanticEvidenceCounter = 0;
    const nextSemanticEvidenceId = (path: string): string => `sem-ev:${path}:${(semanticEvidenceCounter += 1)}`;

    for (const usable of selection.usable) {
      const { path, report } = usable;
      const fileRef: CapabilityGraphRef = { kind: "file", id: path };
      addNode(fileRef); // de-duped — the path matched an existing file node.

      const trace = report.normalizationTrace ?? {};
      const provider = typeof trace.provider === "string" && trace.provider.length > 0 ? trace.provider : "unknown";
      const model = typeof trace.model === "string" && trace.model.length > 0 ? trace.model : "unknown";
      const provenance = typeof trace.provenance === "string" && trace.provenance.length > 0 ? trace.provenance : "unknown";
      const method = typeof trace.method === "string" && trace.method.length > 0 ? trace.method : "unknown";

      // Base evidence row — carries provider/model/provenance in the excerpt
      // because CapabilityEvidenceRef has no metadata field. Every summary-level
      // claim references this row, so semantic claims always cite evidence.
      const baseEvidenceId = nextSemanticEvidenceId(path);
      const baseEvidence: CapabilityEvidenceRef = {
        id: baseEvidenceId,
        source: "llm_extraction",
        path,
        excerpt: truncate(
          `semantic-file-understanding provider=${provider} model=${model} provenance=${provenance} method=${method}`,
          200,
        ),
      };
      if (usable.ref) baseEvidence.artifactRef = usable.ref;
      evidence.push(baseEvidence);

      const summary = report.summary ?? {};

      // summary.purpose -> has_purpose inference claim.
      if (typeof summary.purpose === "string" && summary.purpose.trim().length > 0) {
        claims.push({
          id: `claim:sem:has-purpose:${path}`,
          subject: fileRef,
          predicate: "has_purpose",
          object: truncate(summary.purpose.trim(), 300),
          claimType: "inference",
          source: "llm",
          confidence: SEMANTIC_DEFAULT_CONFIDENCE,
          evidenceRefs: [baseEvidenceId],
          status: "accepted",
        });
      }

      // summary.responsibilities -> has_responsibility inference claims.
      const responsibilities = Array.isArray(summary.responsibilities) ? summary.responsibilities : [];
      responsibilities.forEach((responsibility, index) => {
        if (typeof responsibility !== "string" || responsibility.trim().length === 0) return;
        claims.push({
          id: `claim:sem:has-responsibility:${path}:${index}`,
          subject: fileRef,
          predicate: "has_responsibility",
          object: truncate(responsibility.trim(), 300),
          claimType: "inference",
          source: "llm",
          confidence: SEMANTIC_DEFAULT_CONFIDENCE,
          evidenceRefs: [baseEvidenceId],
          status: "accepted",
        });
      });

      // summary.touchedConcepts -> touches_concept inference claims (low confidence).
      const touchedConcepts = Array.isArray(summary.touchedConcepts) ? summary.touchedConcepts : [];
      touchedConcepts.forEach((concept, index) => {
        if (typeof concept !== "string" || concept.trim().length === 0) return;
        claims.push({
          id: `claim:sem:touches-concept:${path}:${index}`,
          subject: fileRef,
          predicate: "touches_concept",
          object: truncate(concept.trim(), 200),
          claimType: "inference",
          source: "llm",
          confidence: SEMANTIC_LOW_CONFIDENCE,
          evidenceRefs: [baseEvidenceId],
          status: "accepted",
        });
      });

      // summary.publicExports / summary.imports are reconciled against the
      // deterministic facts: a match adds NO new claim (the deterministic fact
      // stands); a semantic-only export/import becomes a CONFLICTED claim.
      const deterministicExports = deterministicExportsByFile.get(path) ?? new Set<string>();
      const publicExports = Array.isArray(summary.publicExports) ? summary.publicExports : [];
      publicExports.forEach((name) => {
        if (typeof name !== "string" || name.trim().length === 0) return;
        const exportName = name.trim();
        if (deterministicExports.has(exportName)) return; // reconciled with the deterministic `exposes` fact.
        claims.push({
          id: `claim:sem:claims-export:${path}:${exportName}`,
          subject: fileRef,
          predicate: "claims_export",
          object: exportName,
          claimType: "inference",
          source: "llm",
          confidence: SEMANTIC_LOW_CONFIDENCE,
          evidenceRefs: [baseEvidenceId],
          status: "conflicted",
        });
      });
      const deterministicImports = deterministicImportsByFile.get(path) ?? new Set<string>();
      const semanticImports = Array.isArray(summary.imports) ? summary.imports : [];
      semanticImports.forEach((module) => {
        if (typeof module !== "string" || module.trim().length === 0) return;
        const moduleName = module.trim();
        if (deterministicImports.has(moduleName)) return; // reconciled with the deterministic `imports` fact.
        claims.push({
          id: `claim:sem:claims-import:${path}:${moduleName}`,
          subject: fileRef,
          predicate: "claims_import",
          object: moduleName,
          claimType: "inference",
          source: "llm",
          confidence: SEMANTIC_LOW_CONFIDENCE,
          evidenceRefs: [baseEvidenceId],
          status: "conflicted",
        });
      });

      // capabilitySignals -> capability nodes + inference claims. A signal with
      // a derivable verb/noun AND source evidence becomes an accepted capability
      // node (deterministic nodes are never overwritten — semantic only appends
      // evidence). Otherwise it becomes a needs-review claim with NO node.
      const capabilitySignals = Array.isArray(report.capabilitySignals) ? report.capabilitySignals : [];
      capabilitySignals.forEach((signal, signalIndex) => {
        if (!signal || typeof signal !== "object") return;
        const confidence = confidenceFromEnum(signal.confidence);
        const sourceEvidence = Array.isArray(signal.sourceEvidence)
          ? signal.sourceEvidence.filter((item): item is { lineStart?: number; lineEnd?: number; excerpt?: string } => Boolean(item))
          : [];
        const hasEvidence = sourceEvidence.length > 0;
        let signalEvidenceId = baseEvidenceId;
        if (hasEvidence) {
          signalEvidenceId = nextSemanticEvidenceId(path);
          const first = sourceEvidence[0] ?? {};
          const signalEvidence: CapabilityEvidenceRef = {
            id: signalEvidenceId,
            source: "llm_extraction",
            path,
            excerpt: truncate(typeof first.excerpt === "string" ? first.excerpt : "", 200),
          };
          if (usable.ref) signalEvidence.artifactRef = usable.ref;
          if (typeof first.lineStart === "number") signalEvidence.lineStart = first.lineStart;
          if (typeof first.lineEnd === "number") signalEvidence.lineEnd = first.lineEnd;
          evidence.push(signalEvidence);
        }

        const signalKey = (typeof signal.id === "string" && signal.id.length > 0 ? signal.id : String(signalIndex)).replace(
          /[^A-Za-z0-9_.:-]+/g,
          "-",
        );
        const derived = deriveSignalVerbNoun(signal);
        if (derived && hasEvidence) {
          const capId = `cap:${derived.verb}:${derived.noun.replace(/\s+/g, "-")}`;
          const capRef: CapabilityGraphRef = { kind: "capability", id: capId };
          addNode(capRef);
          const existing = capabilitiesById.get(capId);
          if (existing) {
            // Deterministic / prior node wins: append evidence only.
            if (!existing.evidenceRefs.includes(signalEvidenceId)) existing.evidenceRefs.push(signalEvidenceId);
          } else {
            capabilitiesById.set(capId, {
              id: capId,
              verb: derived.verb,
              noun: derived.noun,
              implementedBy: [fileRef],
              entrypoints: [],
              sideEffects: [],
              dependencies: [],
              consumers: [],
              confidence,
              evidenceRefs: [signalEvidenceId],
            });
          }
          claims.push({
            id: `claim:sem:implements:${path}:${capId}`,
            subject: fileRef,
            predicate: "implements_capability",
            object: capRef,
            claimType: "inference",
            source: "llm",
            confidence,
            evidenceRefs: [signalEvidenceId],
            status: "accepted",
          });
        } else {
          const label =
            typeof signal.label === "string" && signal.label.length > 0
              ? signal.label
              : typeof signal.id === "string" && signal.id.length > 0
                ? signal.id
                : "capability signal";
          claims.push({
            id: `claim:sem:capability-signal:${path}:${signalKey}`,
            subject: fileRef,
            predicate: "has_capability_signal",
            object: truncate(label, 200),
            claimType: "inference",
            source: "llm",
            confidence,
            evidenceRefs: [signalEvidenceId],
            status: "needs-review",
          });
        }
      });

      // findings -> has_semantic_finding needs-review claims.
      const findings = Array.isArray(report.findings) ? report.findings : [];
      findings.forEach((finding, findingIndex) => {
        if (!finding || typeof finding !== "object") return;
        const message = typeof finding.message === "string" && finding.message.length > 0 ? finding.message : "semantic finding";
        const findingSources = Array.isArray(finding.sourceEvidence)
          ? finding.sourceEvidence.filter((item): item is string => typeof item === "string" && item.length > 0)
          : [];
        const findingEvidenceId = nextSemanticEvidenceId(path);
        const findingEvidence: CapabilityEvidenceRef = {
          id: findingEvidenceId,
          source: "llm_extraction",
          path,
          excerpt: truncate(findingSources.length > 0 ? findingSources.join(" | ") : message, 200),
        };
        if (usable.ref) findingEvidence.artifactRef = usable.ref;
        evidence.push(findingEvidence);
        const findingKey = (typeof finding.id === "string" && finding.id.length > 0 ? finding.id : String(findingIndex)).replace(
          /[^A-Za-z0-9_.:-]+/g,
          "-",
        );
        claims.push({
          id: `claim:sem:finding:${path}:${findingKey}`,
          subject: fileRef,
          predicate: "has_semantic_finding",
          object: truncate(message, 300),
          claimType: "inference",
          source: "llm",
          confidence: SEMANTIC_LOW_CONFIDENCE,
          evidenceRefs: [findingEvidenceId],
          status: "needs-review",
        });
      });
    }

    // Stale / unmatched reports are NEVER consumed silently — each becomes a
    // needs-review claim (no evidence row, no node pollution).
    selection.stale.forEach((entry, index) => {
      const fileRef: CapabilityGraphRef = { kind: "file", id: entry.path.length > 0 ? entry.path : "unknown-semantic-report" };
      claims.push({
        id: `claim:sem:stale:${index}:${entry.path}:${entry.reason}`,
        subject: fileRef,
        predicate: "semantic_report_stale",
        object: entry.reason,
        claimType: "inference",
        source: "llm",
        confidence: SEMANTIC_LOW_CONFIDENCE,
        evidenceRefs: [],
        status: "needs-review",
      });
    });
    selection.missing.forEach((entry, index) => {
      const id = entry.path.length > 0 ? entry.path : "unknown-semantic-report";
      const fileRef: CapabilityGraphRef = { kind: "file", id };
      claims.push({
        id: `claim:sem:unmatched:${index}:${id}:${entry.reason}`,
        subject: fileRef,
        predicate: "semantic_report_unmatched",
        object: entry.reason,
        claimType: "inference",
        source: "llm",
        confidence: SEMANTIC_LOW_CONFIDENCE,
        evidenceRefs: [],
        status: "needs-review",
      });
    });
  }

  const capabilities = [...capabilitiesById.values()];
  const fileCount = nodes.filter((node) => node.kind === "file").length;
  const reason =
    fileCount === 0
      ? "No source files supplied."
      : `Built deterministic capability evidence graph from ${fileCount} file(s).`;

  return createCapabilityEvidenceGraph({
    header,
    schemaVersion: "0.1.0",
    status: { value: fileCount === 0 ? "partial" : "built", reason },
    nodes,
    evidence,
    claims,
    capabilities,
    // Recomputed by the factory; supplied here for completeness.
    summary: {
      files: fileCount,
      symbols: nodes.filter((node) => node.kind === "symbol").length,
      capabilities: capabilities.length,
      facts: claims.filter((claim) => claim.claimType === "fact").length,
      inferences: claims.filter((claim) => claim.claimType === "inference").length,
      recommendations: claims.filter((claim) => claim.claimType === "recommendation").length,
      evidence: evidence.length,
    },
    boundaries: {
      usedLlm: false,
      generatedEmbeddings: false,
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

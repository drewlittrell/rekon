// CapabilityEvidenceGraph v1 builder (capability-evidence-graph-v1).
//
// Pure, deterministic-only construction of the CapabilityEvidenceGraph substrate
// from supplied source files. v1 extracts file nodes, symbol nodes, import +
// exposes FACTS (confidence 1.0), and heuristic capability INFERENCES (verb:noun
// from exported symbol names, confidence <= 0.5) from exported symbols. It uses
// NO LLM, generates NO embeddings, executes NO commands, writes NO source, and
// runs NO Circe — the artifact factory forces every boundary boolean false. The
// graph is evidence-backed context, not proof by itself.

import type { ArtifactHeader } from "@rekon/kernel-artifacts";
import {
  createCapabilityEvidenceGraph,
  type CapabilityEvidenceClaim,
  type CapabilityEvidenceGraph,
  type CapabilityEvidenceGraphCapabilityNode,
  type CapabilityEvidenceRef,
  type CapabilityGraphRef,
} from "@rekon/kernel-repo-model";

export const CAPABILITY_EVIDENCE_GRAPH_ARTIFACT_ID_PREFIX = "capability-evidence-graph-";

export type CapabilityEvidenceGraphInputFile = {
  path: string;
  sha256?: string;
  text?: string;
  language?: string;
};

export type BuildCapabilityEvidenceGraphInput = {
  root?: string;
  files: CapabilityEvidenceGraphInputFile[];
  generatedAt?: string;
};

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

  for (const rawFile of input.files ?? []) {
    if (!rawFile || typeof rawFile.path !== "string" || rawFile.path.length === 0) continue;
    const filePath = normalizePath(rawFile.path);
    const fileRef: CapabilityGraphRef = { kind: "file", id: filePath };
    addNode(fileRef);

    const text = typeof rawFile.text === "string" ? rawFile.text : "";
    const { imports, symbols } = extractFile(text);

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

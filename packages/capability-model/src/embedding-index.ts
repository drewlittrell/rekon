// Embedding chunk + cache/index model (Embedding Provider / Index v1, slice 159).
//
// PURE model: builds typed embedding chunks from a CapabilityEvidenceGraph
// (deterministic facts) plus optional semantic file summaries, computes the
// index key / staleness classification, and ranks neighbors by cosine
// similarity. NO fs, NO provider calls, NO network — the CLI reads/writes the
// cache and calls the embedding provider. Raw vectors are cache/index data, not
// canonical proof artifacts; similarity is proposal/context, not proof.

import { createHash } from "node:crypto";

/** Policy version: bump when chunking / index semantics change (forces re-embed). */
export const EMBEDDING_POLICY_VERSION = "v1";

export type EmbeddingChunkKind =
  | "file_summary"
  | "symbol_summary"
  | "capability_text"
  | "doc_section"
  | "comment_block"
  | "signature"
  | "structural_feature_bag";

export type EmbeddingChunkRef = {
  id: string;
  kind: EmbeddingChunkKind;
  path: string;
  symbolId?: string;
  lineStart?: number;
  lineEnd?: number;
  sha256: string;
  text: string;
};

/** A cache/index record. The raw vector lives at `vectorRef`; this is metadata. */
export type EmbeddingIndexRecord = {
  chunk: EmbeddingChunkRef;
  provider: string;
  model: string;
  dimensions: number;
  policyVersion: string;
  vectorRef: string;
  vectorSha256: string;
  createdAt: string;
};

/** A graph ref (kind + id) a chunk maps to, for graph evidence/claims. */
export type EmbeddingGraphRefLite = { kind: "file" | "symbol" | "capability"; id: string };

/** A source chunk + its nearest neighbors, fed to the graph builder. */
export type EmbeddingSimilarityForGraph = {
  source: { chunkId: string; ref: EmbeddingGraphRefLite; path?: string };
  neighbors: Array<{ chunkId: string; ref: EmbeddingGraphRefLite; score: number }>;
  provider: string;
  model: string;
};

function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function normalizePath(path: string): string {
  return String(path).replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function strArr(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim());
}

/** Loose view of a CapabilityEvidenceGraph (only the fields chunking needs). */
export type EvidenceGraphForChunks = {
  nodes?: Array<{ kind?: string; id?: string }>;
  claims?: Array<{
    subject?: { kind?: string; id?: string };
    predicate?: string;
    object?: unknown;
    evidenceRefs?: string[];
  }>;
  evidence?: Array<{ id?: string; source?: string; path?: string; lineStart?: number; excerpt?: string }>;
  capabilities?: Array<{ id?: string; verb?: string; noun?: string; implementedBy?: Array<{ kind?: string; id?: string }> }>;
};

export type BuildEmbeddingChunksInput = {
  graph: EvidenceGraphForChunks;
  /** Optional path -> file summary text (from a usable SemanticFileUnderstandingReport). */
  fileSummaries?: Record<string, string>;
};

/**
 * The graph ref a chunk maps to — file_summary / structural_feature_bag → file,
 * signature → symbol, capability_text → capability.
 */
export function embeddingChunkGraphRef(chunk: EmbeddingChunkRef): EmbeddingGraphRefLite {
  if (chunk.kind === "signature" && chunk.symbolId) return { kind: "symbol", id: chunk.symbolId };
  if (chunk.kind === "capability_text") return { kind: "capability", id: chunk.id.replace(/^capability_text:/, "") };
  return { kind: "file", id: chunk.path };
}

/**
 * Build embedding chunks from the deterministic graph (+ optional semantic file
 * summaries). v1 emits file_summary, capability_text, signature, and
 * structural_feature_bag. symbol_summary / doc_section / comment_block are
 * deferred. Chunk text is DERIVED (summaries / signatures / feature bags), never
 * raw whole-file source. Each chunk's sha256 is of its text, so a text change
 * makes the chunk stale.
 */
export function buildEmbeddingChunks(input: BuildEmbeddingChunksInput): EmbeddingChunkRef[] {
  const graph = input.graph ?? {};
  const fileSummaries = input.fileSummaries ?? {};
  const evidenceById = new Map<string, { excerpt?: string; lineStart?: number }>();
  for (const ev of graph.evidence ?? []) {
    if (ev && typeof ev.id === "string") evidenceById.set(ev.id, { excerpt: ev.excerpt, lineStart: ev.lineStart });
  }

  const claims = Array.isArray(graph.claims) ? graph.claims : [];
  const exportsByFile = new Map<string, Array<{ symbolId: string; name: string; excerpt: string; lineStart?: number }>>();
  const importsByFile = new Map<string, Set<string>>();
  for (const claim of claims) {
    if (!claim || typeof claim.predicate !== "string") continue;
    const filePath = typeof claim.subject?.id === "string" ? normalizePath(claim.subject.id) : "";
    if (filePath.length === 0) continue;
    if (claim.predicate === "exposes" && claim.object && typeof claim.object === "object") {
      const symbolId = typeof (claim.object as { id?: unknown }).id === "string" ? ((claim.object as { id: string }).id) : "";
      if (symbolId.length === 0) continue;
      const name = symbolId.includes("#") ? symbolId.slice(symbolId.indexOf("#") + 1) : symbolId;
      const evId = Array.isArray(claim.evidenceRefs) ? claim.evidenceRefs[0] : undefined;
      const ev = typeof evId === "string" ? evidenceById.get(evId) : undefined;
      const list = exportsByFile.get(filePath) ?? [];
      list.push({ symbolId, name, excerpt: ev?.excerpt ?? name, ...(typeof ev?.lineStart === "number" ? { lineStart: ev.lineStart } : {}) });
      exportsByFile.set(filePath, list);
    } else if (claim.predicate === "imports" && typeof claim.object === "string") {
      const set = importsByFile.get(filePath) ?? new Set<string>();
      set.add(claim.object);
      importsByFile.set(filePath, set);
    }
  }

  const capsByFile = new Map<string, string[]>();
  for (const cap of graph.capabilities ?? []) {
    if (!cap || typeof cap.verb !== "string" || typeof cap.noun !== "string") continue;
    const phrase = `${cap.verb} ${cap.noun}`;
    for (const impl of cap.implementedBy ?? []) {
      const symId = typeof impl?.id === "string" ? impl.id : "";
      if (!symId.includes("#")) continue;
      const filePath = normalizePath(symId.slice(0, symId.indexOf("#")));
      const list = capsByFile.get(filePath) ?? [];
      if (!list.includes(phrase)) list.push(phrase);
      capsByFile.set(filePath, list);
    }
  }

  const filePaths = new Set<string>();
  for (const node of graph.nodes ?? []) {
    if (node && node.kind === "file" && typeof node.id === "string") filePaths.add(normalizePath(node.id));
  }

  const chunks: EmbeddingChunkRef[] = [];
  const pushChunk = (chunk: Omit<EmbeddingChunkRef, "sha256">): void => {
    const text = chunk.text.trim();
    if (text.length === 0) return;
    chunks.push({ ...chunk, text, sha256: sha256Hex(text) });
  };

  for (const path of [...filePaths].sort()) {
    const exportsList = exportsByFile.get(path) ?? [];
    const importsList = [...(importsByFile.get(path) ?? new Set<string>())].sort();
    const caps = (capsByFile.get(path) ?? []).sort();

    // file_summary — semantic summary when present, else deterministic.
    const semanticSummary = fileSummaries[path] ?? fileSummaries[normalizePath(path)];
    const deterministicSummary = [
      `File ${path}.`,
      exportsList.length > 0 ? `Exports: ${exportsList.map((e) => e.name).join(", ")}.` : "",
      importsList.length > 0 ? `Imports: ${importsList.join(", ")}.` : "",
      caps.length > 0 ? `Capabilities: ${caps.join(", ")}.` : "",
    ].filter(Boolean).join(" ");
    pushChunk({ id: `file_summary:${path}`, kind: "file_summary", path, text: semanticSummary && semanticSummary.trim().length > 0 ? semanticSummary.trim() : deterministicSummary });

    // structural_feature_bag — deterministic facts as a sparse token bag.
    const featureTokens = [
      ...importsList.map((m) => `import:${m}`),
      ...exportsList.map((e) => `exposes:${e.name}`),
      ...caps.map((c) => `capability:${c.replace(/\s+/g, ":")}`),
    ];
    pushChunk({ id: `structural_feature_bag:${path}`, kind: "structural_feature_bag", path, text: `feature-bag ${path} ${featureTokens.join(" ")}` });

    // signature — one per exported symbol (the declaration line).
    for (const exp of exportsList) {
      pushChunk({
        id: `signature:${exp.symbolId}`,
        kind: "signature",
        path,
        symbolId: exp.symbolId,
        ...(typeof exp.lineStart === "number" ? { lineStart: exp.lineStart } : {}),
        text: exp.excerpt,
      });
    }
  }

  // capability_text — one per capability node.
  for (const cap of graph.capabilities ?? []) {
    if (!cap || typeof cap.id !== "string" || typeof cap.verb !== "string" || typeof cap.noun !== "string") continue;
    const firstImpl = (cap.implementedBy ?? []).find((impl) => typeof impl?.id === "string" && impl.id.includes("#"));
    const path = firstImpl && typeof firstImpl.id === "string" ? normalizePath(firstImpl.id.slice(0, firstImpl.id.indexOf("#"))) : "";
    pushChunk({ id: `capability_text:${cap.id}`, kind: "capability_text", path, text: `${cap.verb} ${cap.noun}` });
  }

  return chunks;
}

/** The cache/index key for a chunk under a given provider/model/dimensions/policy. */
export function computeEmbeddingIndexKey(
  chunk: Pick<EmbeddingChunkRef, "id" | "sha256">,
  context: { provider: string; model: string; dimensions: number; policyVersion: string },
): string {
  return [chunk.id, chunk.sha256, context.provider, context.model, String(context.dimensions), context.policyVersion].join("|");
}

/** The deterministic vector filename (under vectors/) for an index key. */
export function embeddingVectorRef(indexKey: string): string {
  return `vectors/${sha256Hex(indexKey).slice(0, 40)}.json`;
}

export type EmbeddingChunkReason = "new" | "stale" | "policy-changed";

export type ClassifyEmbeddingChunksResult = {
  toEmbed: Array<{ chunk: EmbeddingChunkRef; reason: EmbeddingChunkReason }>;
  reused: EmbeddingIndexRecord[];
};

/**
 * Classify chunks against an existing index: a chunk is `new` (no record),
 * `stale` (its sha256 changed) or `policy-changed` (provider/model/dimensions/
 * policy changed). Unchanged chunks are reused (no re-embed). A stale embedding
 * is therefore NEVER used silently — it is reclassified and re-embedded.
 */
export function classifyEmbeddingChunks(input: {
  chunks: EmbeddingChunkRef[];
  existing: EmbeddingIndexRecord[];
  provider: string;
  model: string;
  dimensions: number;
  policyVersion: string;
}): ClassifyEmbeddingChunksResult {
  const byId = new Map<string, EmbeddingIndexRecord>();
  for (const record of input.existing ?? []) {
    if (record && record.chunk && typeof record.chunk.id === "string") byId.set(record.chunk.id, record);
  }
  const toEmbed: ClassifyEmbeddingChunksResult["toEmbed"] = [];
  const reused: EmbeddingIndexRecord[] = [];
  for (const chunk of input.chunks ?? []) {
    const existing = byId.get(chunk.id);
    if (!existing) {
      toEmbed.push({ chunk, reason: "new" });
    } else if (existing.chunk.sha256 !== chunk.sha256) {
      toEmbed.push({ chunk, reason: "stale" });
    } else if (
      existing.provider !== input.provider ||
      existing.model !== input.model ||
      existing.dimensions !== input.dimensions ||
      existing.policyVersion !== input.policyVersion
    ) {
      toEmbed.push({ chunk, reason: "policy-changed" });
    } else {
      reused.push(existing);
    }
  }
  return { toEmbed, reused };
}

/** Cosine similarity in [-1, 1]; 0 for degenerate / mismatched-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

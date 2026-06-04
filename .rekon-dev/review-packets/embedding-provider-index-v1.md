# Review Packet — Embedding Provider / Index v1 (slice 159)

Base SHA: `15a4efd`. Track: embeddings (extends semantic-intelligence). Type:
product capability (real source). Next step: Embedding Provider / Index Safety
Review.

## CHANGES MADE

- `packages/llm-provider/src/index.ts` — added `createVoyageEmbeddingProvider`
  (+ `VOYAGE_DEFAULT_MODEL` = `voyage-code-3`, `VOYAGE_DEFAULT_DIMENSIONS` =
  1024, `extractEmbeddingVectors`), the first real embedding adapter behind the
  existing `RekonEmbeddingProvider` surface.
- `packages/capability-model/src/embedding-index.ts` — NEW pure module: chunk
  model, index key / vector ref, staleness classifier, cosine similarity, graph
  ref mapping.
- `packages/capability-model/src/capability-evidence-graph.ts` — accept optional
  `embeddingSimilarities`; emit `embedding_similarity` evidence + `embedding` /
  `inference` claims; boundaries stay all-false.
- `packages/capability-model/src/index.ts` — re-export the embedding-index
  surface.
- `packages/cli/src/index.ts` — `rekon embeddings index`, `rekon embeddings
  query`, and `rekon capability graph build --embedding-similarity latest`;
  offline deterministic `mock` provider; top-of-module constants to avoid a TDZ
  in the synchronous flag-parsing prefix.
- Tests: `tests/contract/embedding-provider-index.test.mjs` (24),
  `tests/docs/embedding-provider-index.test.mjs` (14).
- Docs: 2 new (`docs/concepts/embedding-provider-index.md`,
  `docs/strategy/embedding-provider-index-v1.md`) + 9 updates + this packet.

## PUBLIC API CHANGES

- `@rekon/llm-provider`: `createVoyageEmbeddingProvider`, `VOYAGE_DEFAULT_MODEL`,
  `VOYAGE_DEFAULT_DIMENSIONS` (additive).
- `@rekon/capability-model`: `buildEmbeddingChunks`, `classifyEmbeddingChunks`,
  `computeEmbeddingIndexKey`, `embeddingVectorRef`, `embeddingChunkGraphRef`,
  `cosineSimilarity`, `EMBEDDING_POLICY_VERSION`, and the embedding-index types;
  `BuildCapabilityEvidenceGraphInput.embeddingSimilarities?` (additive,
  opt-in — omitting it reproduces the prior build byte-for-byte).
- CLI: two new commands + one new opt-in flag. No removals, no renames.

## PURPOSE PRESERVATION CHECK

The purpose of this batch was to make embeddings **explainable evidence** in
`CapabilityEvidenceGraph`, not a parallel proof channel. Preserved:

- Embedding similarity is proposal/context, not proof — claims are `accepted`
  but confidence is clamped strictly below the deterministic `1.0`.
- Raw vectors are cache/index data, not canonical proof artifacts — they live
  under gitignored `.rekon/cache/embeddings`, never as a registered artifact.
- No stale embedding is used silently — a sha / provider / model / dimensions /
  policy change reclassifies a chunk and forces a re-embed.
- CapabilityEvidenceGraph remains the evidence substrate, and deterministic
  facts remain stronger than embedding similarity.
- Voyage is the first real embedding provider; OpenAI embeddings are deferred;
  intent:go remains deferred.

## SOURCE REVIEW

- Voyage adapter mirrors the shipped `createOpenAiLlmProvider` fetch pattern: no
  key → clean `ok:false` + no network; AbortController timeout; never throws;
  injected `fetchImpl` for tests. Key read from env by the CLI only.
- Chunk builder reads only the deterministic graph (`imports` / `exposes` facts,
  capability nodes) + optional derived summaries; emits no raw source text.

## PROVIDER MODEL

`RekonEmbeddingProvider.embed({ task, texts, model? })` →
`{ ok:true, vectors } | { ok:false, error }`. Voyage POSTs `${baseUrl}/embeddings`
with `{ model, input, input_type }`; parses `data[].embedding`.

## CHUNK MODEL

`file_summary`, `structural_feature_bag`, `signature`, `capability_text`. Stable
ids; `sha256` of derived text is the content identity. Symbol-summary /
doc-section / comment-block deferred.

## CACHE/INDEX MODEL

`.rekon/cache/embeddings/index.json` (records) + `vectors/<40hex>.json` (raw
vectors). Index key = `id | sha | provider | model | dimensions | policyVersion`;
`EMBEDDING_POLICY_VERSION = "v1"` bumps re-embed everything.

## RETRIEVAL MODEL

`rekon embeddings query` embeds the query, cosine-ranks cached chunks, returns
nearest as proposal/context. Empty cache → `status: "empty"`, no fabrication.

## GRAPH INTEGRATION MODEL

`--embedding-similarity latest` reads the cache (generates nothing), emits one
`embedding_similarity` evidence row per source + one `embedding` claim per
neighbor (`similar_to` / `duplicate_candidate`, confidence ≤ 0.99). Default
build emits none.

## BOUNDARY MODEL

Graph boundaries all false (incl. `generatedEmbeddings`, `usedLlm`). Embeddings
must not approve plans, execute commands, write source files, or run Circe. No
PreparedIntentPlan / WorkOrder / VerificationPlan produced.

## TESTS / VERIFICATION

24 contract + 14 docs assertions. Full keyless gate green; CLI smoke on a temp
repo confirmed index/query/similarity/missing-key-clean-fail and untouched
source.

## INTENTIONALLY UNTOUCHED

OpenAI embeddings; full ANN/HNSW index (v1 is a linear cosine scan); running
embeddings during plain `rekon scan`; version bumps / npm publish / branches;
the user's prior commits.

## RISKS / FOLLOW-UP

- v1 retrieval is a linear scan — fine at current scale; ANN is a later option.
- Voyage live behavior is exercised only under the gated live test.

## NEXT STEP

Embedding Provider / Index Safety Review.

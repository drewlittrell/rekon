# Embedding Provider / Index v1

> **Safety-reviewed (slice 160):** this implementation was re-read end-to-end
> against committed source and found **safe/stable** — embeddings stay
> proposal/context, not proof; the slice-159 TDZ fix was reviewed explicitly.
> Next: Embedding Retrieval / Graph Dogfood Review. See
> [Embedding Provider / Index Safety Review](./embedding-provider-index-safety-review.md).

> **Status:** shipped (slice 159). First real Rekon embedding provider +
> cache/index, folding similarity into `CapabilityEvidenceGraph` as evidence.

This slice implements the first concrete capability of the embeddings track that
the [Embedding Provider / Index Decision](./embedding-provider-index-decision.md)
opened: it makes embeddings **explainable evidence** in
`CapabilityEvidenceGraph` rather than a parallel proof channel. It is a product
capability batch (real source), not a memo.

## What shipped

### Provider — `@rekon/llm-provider`

- `createVoyageEmbeddingProvider(options)` — the first real embedding adapter:
  a fetch-based, no-SDK Voyage client (`voyage-code-3`, 1024-dim) behind the
  existing `RekonEmbeddingProvider.embed()` surface. No API key in repo config;
  a missing key returns `ok:false` with `error: "missing-api-key"` and makes
  **no** network call; it never throws a raw provider error (errors are mapped
  to `http-<status>` / `timeout` / `request-failed` / `no-embeddings` /
  `embedding-count-mismatch`); tests inject `fetchImpl`. Live provider tests are
  gated by environment only (`VOYAGE_API_KEY` + `REKON_RUN_LIVE_EMBEDDING_TESTS=1`).
- `createMockEmbeddingProvider(...)` continues to cover the offline path; the
  CLI additionally ships a deterministic offline `mock` provider so the whole
  index → query → graph pipeline runs keyless in tests.

### Chunk + cache/index model — `@rekon/capability-model`

A new pure `embedding-index` module (no fs, no network):

- `buildEmbeddingChunks({ graph, fileSummaries? })` builds **derived** chunks
  from the deterministic graph — `file_summary`, `structural_feature_bag`,
  `signature` (one per exported symbol), and `capability_text`. Chunk text is
  derived (summaries / signatures / feature bags), **never** raw whole-file
  source; each chunk's `sha256` is of its derived text, so any change makes it
  stale.
- `computeEmbeddingIndexKey` / `embeddingVectorRef` give a deterministic cache
  key and vector filename.
- `classifyEmbeddingChunks({ chunks, existing, provider, model, dimensions,
  policyVersion })` returns `{ toEmbed: [{chunk, reason}], reused }` where reason
  is `new`, `stale` (sha changed), or `policy-changed` (provider/model/
  dimensions/policy changed). A stale embedding is reclassified and re-embedded
  — never reused silently.
- `cosineSimilarity` and `embeddingChunkGraphRef` support retrieval and the
  graph mapping (signature→symbol, capability_text→capability, else→file).

### Graph integration — `@rekon/capability-model`

`buildCapabilityEvidenceGraph` accepts an optional `embeddingSimilarities`
input. When present, it emits one `embedding_similarity` evidence row per source
chunk plus one `embedding` / `inference` claim per neighbor (predicate
`similar_to`, or `duplicate_candidate` at a high score; status `accepted`;
confidence = cosine clamped to `[0, 0.99]`). The builder **never** generates
embeddings, so `generatedEmbeddings` / `usedLlm` stay false; the kernel already
allowed `embedding_similarity` evidence and `embedding` claims, so no kernel
change was needed.

### CLI — `@rekon/cli`

- `rekon embeddings index [--all] [--path <p>] [--provider voyage|mock]
  [--model <m>] [--dimensions <n>]` — reads the latest `CapabilityEvidenceGraph`
  (+ optional `SemanticFileUnderstandingReport` summaries), classifies chunks
  against `.rekon/cache/embeddings`, calls the provider only for new / stale /
  policy-changed chunks, writes `index.json` + `vectors/<hash>.json`, and reports
  `indexed` / `reused` / `stale` / `failed`.
- `rekon embeddings query --text <q> [--top-k <n>] [...]` — embeds the query,
  ranks cached chunks by cosine, returns the nearest as proposal/context.
- `rekon capability graph build --embedding-similarity latest` — folds cached
  neighbors into the graph as `embedding_similarity` evidence (reads cache,
  generates nothing).

## Boundaries preserved

- Embedding similarity is proposal/context, not proof.
- Raw vectors are cache/index data, not canonical proof artifacts.
- No stale embedding is used silently.
- CapabilityEvidenceGraph remains the evidence substrate.
- Deterministic facts remain stronger than embedding similarity.
- Embeddings must not approve plans, execute commands, write source files, or
  run Circe; intent:go remains deferred.
- Voyage is the first real embedding provider; OpenAI embeddings are deferred.
- Embeddings are not run during a plain `rekon scan`; indexing is an explicit
  command.

## Verification

`tests/contract/embedding-provider-index.test.mjs` (24 assertions) covers the
provider (missing-key clean refusal, injected-fetch success/failure, mock),
the chunk identity + index classification (new / reuse / stale / policy-changed),
and the CLI (index writes only under `.rekon/cache/embeddings`, missing-key
fails cleanly with no false success, query returns ranked proposals, graph build
emits `embedding_similarity` evidence with boundaries false while a default build
emits none, no plan/command/source-write/WorkOrder/VerificationPlan/Circe, and
`artifacts validate` is clean). `tests/docs/embedding-provider-index.test.mjs`
(14 assertions) pins the boundary statements, the CHANGELOG entry, and the review
packet's purpose-preservation check.

## Next step

**Embedding Provider / Index Safety Review** — re-read the shipped provider,
cache/index, and graph integration end-to-end against committed source and
confirm the boundaries hold before extending the embeddings track (e.g. OpenAI
as a second provider, or richer retrieval surfaces).

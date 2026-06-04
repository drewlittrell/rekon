# Embedding Provider / Index

> **First consumer dogfooded (slice 168):** task-shaped context was dogfooded — the
> explicit-path + graph baseline is useful and reliable; the lexical mock retrieval
> path is low-signal (all neighbors below the useful band → empty embedding
> context), so a real embedding provider is needed for semantic retrieval. See
> [TaskContextReport Dogfood Review](../strategy/task-context-report-dogfood-review.md).

> **First consumer safety-reviewed (slice 167):** task-shaped context found
> safe/stable as proposal/context. See
> [TaskContextReport Safety Review](../strategy/task-context-report-safety-review.md).

> **First retrieval consumer implemented (slice 166):** task-shaped context
> (`TaskContextReport` / `rekon context task`) consumes embedding retrieval as
> proposal/context. See [TaskContextReport v1](../strategy/task-context-report-v1.md).

> **First retrieval consumer decided (slice 165):** task-shaped context is the
> first product consumer of embedding retrieval — a future `TaskContextReport`
> bundle (`rekon context task`) that combines retrieval neighbors with graph facts
> as context, not proof. See
> [Task-Shaped Context / Embedding Retrieval Decision](../strategy/task-shaped-context-embedding-retrieval-decision.md).

> **Retrieval ranking implemented (slice 164):** `embeddings query` now uses
> `input_type=query` (indexing keeps `document`), applies default top-k 8 / max 20,
> and labels every result with a score band — proposal/context, not proof. See
> [Embedding Query Input-Type / Ranking Policy Implementation](../strategy/embedding-query-input-type-ranking-policy-implementation.md).

> **Retrieval ranking decided (slice 163):** score bands (>= 0.78 / 0.65 / 0.50),
> default top-k 8 (max 20), the query/document input-type split, and task-shaped
> context as the first consumer are pinned. See
> [Embedding Retrieval / Similarity Ranking Decision](../strategy/embedding-retrieval-similarity-ranking-decision.md).

> **Live Voyage dogfooded (slice 162):** the real Voyage provider
> (`voyage-code-3`, 1024-dim, key env-only) ranked paraphrase queries with no
> shared vocabulary to the correct domain — the semantic robustness the lexical
> mock could not prove — with `generatedEmbeddings` / `usedLlm` false and the key
> never committed. See
> [Live Voyage Embedding Dogfood](../strategy/live-voyage-embedding-dogfood.md).

> **Dogfooded (slice 161):** index/retrieval/graph exercised on a realistic
> fixture — ranks by domain, stale/policy behavior visible, graph evidence
> explainable; mock is lexical, so a live Voyage dogfood is recommended next. See
> [Embedding Retrieval / Graph Dogfood Review](../strategy/embedding-retrieval-graph-dogfood-review.md).

> **Safety-reviewed (slice 160):** this capability was found **safe/stable** —
> embeddings stay proposal/context, not proof. See
> [Embedding Provider / Index Safety Review](../strategy/embedding-provider-index-safety-review.md).
> Next: Embedding Retrieval / Graph Dogfood Review.

Rekon's first embedding capability (slice 159, *Embedding Provider / Index v1*)
turns derived code descriptions into vectors, caches them, and folds
nearest-neighbor similarity into the `CapabilityEvidenceGraph` as **evidence —
never as a new fact**. It is the first concrete step of the embeddings track
opened by the [Embedding Provider / Index Decision](../strategy/embedding-provider-index-decision.md)
(Option B: embeddings as graph evidence, Voyage first).

## What it is

Three pieces work together, each at a clean boundary:

1. **Provider** — `createVoyageEmbeddingProvider(...)` in `@rekon/llm-provider`
   is the first real embedding adapter: a fetch-based, no-SDK Voyage
   (`voyage-code-3`, 1024-dim) client behind the existing
   `RekonEmbeddingProvider.embed()` surface. `createMockEmbeddingProvider(...)`
   and the CLI's offline `mock` provider keep the whole pipeline testable with
   no key and no network.
2. **Chunk model + cache/index** — `@rekon/capability-model`'s pure
   `embedding-index` module builds **derived** embedding chunks (file summaries,
   exported-symbol signatures, capability phrases, structural feature bags —
   never raw whole-file source) from a `CapabilityEvidenceGraph`, computes a
   content identity (`sha256` of the derived text) and an index key
   (`id | sha | provider | model | dimensions | policyVersion`), and classifies
   each chunk against the on-disk cache as `new`, `stale` (sha changed), or
   `policy-changed`. Raw vectors live under `.rekon/cache/embeddings/vectors/`.
3. **Graph integration + retrieval** — the CLI computes cosine neighbors from
   the cache and either folds them into a graph build as `embedding_similarity`
   evidence and `embedding` claims (`rekon capability graph build
   --embedding-similarity latest`), or answers a retrieval query
   (`rekon embeddings query --text ...`) as proposal/context.

## CLI

```bash
# Build the deterministic substrate first.
rekon capability graph build --path src --json

# Embed the derived chunks into .rekon/cache/embeddings (Voyage by default;
# `--provider mock` is offline/keyless). VOYAGE_API_KEY is read from the
# environment ONLY — never from repo config.
rekon embeddings index --all --provider voyage --model voyage-code-3 --json

# Retrieve nearest chunks as proposal/context (not proof).
rekon embeddings query --text "user lookup logic" --top-k 10 --json

# Fold cached neighbors into a graph build as embedding_similarity evidence.
rekon capability graph build --embedding-similarity latest --json
```

`rekon embeddings index` reports `indexed` / `reused` / `stale` / `failed`. A
missing key returns a clean `failed` result with `error: "missing-api-key"` and
a non-zero exit — it never fabricates a success and never writes vectors.

## The boundary

The embedding capability adds reach without adding authority. Every guarantee
below is enforced by the artifact factory (graph boundary booleans stay false),
the provider contract (a missing key is a clean `ok:false`, never a throw and
never a network call), and the classifier (a changed chunk is re-embedded, not
reused):

- Embedding similarity is proposal/context, not proof.
- Embeddings must not approve plans.
- Embeddings must not execute commands.
- Embeddings must not write source files.
- Embeddings must not run Circe.
- Raw vectors are cache/index data, not canonical proof artifacts.
- No stale embedding is used silently.
- CapabilityEvidenceGraph remains the evidence substrate.
- Deterministic facts remain stronger than embedding similarity.
- Voyage is the first real embedding provider.
- OpenAI embeddings are deferred.
- intent:go remains deferred.

## How similarity enters the graph

`rekon capability graph build --embedding-similarity latest` reads the
`.rekon/cache/embeddings` cache (it generates **no** embeddings, so the graph's
`generatedEmbeddings` / `usedLlm` boundaries stay false) and, per source chunk,
emits one `embedding_similarity` evidence row plus one `embedding` /
`inference` claim per neighbor. Each claim's subject and object are the graph
refs the chunks map to (file / symbol / capability), its predicate is
`similar_to` (or `duplicate_candidate` at a high score), its status is
`accepted`, and its confidence is the cosine score clamped strictly below `1.0`
— the value reserved for deterministic facts. A plain `rekon capability graph
build` folds in none of this.

## Related

- Decision: [Embedding Provider / Index Decision](../strategy/embedding-provider-index-decision.md)
- Implementation: [Embedding Provider / Index v1](../strategy/embedding-provider-index-v1.md)
- Substrate: [Capability Evidence Graph](./capability-evidence-graph.md)
- Provider routing: [Rekon LLM Provider Routing](./rekon-llm-provider-routing.md)
- Packages: `@rekon/llm-provider` (provider), `@rekon/capability-model`
  (chunk + index model), `@rekon/cli` (commands)

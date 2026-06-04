# Embedding Provider / Index Safety Review

> **Dogfooded (slice 161):** the index/retrieval/graph path was exercised on a
> realistic multi-domain fixture and ranks by domain; embeddings stay
> proposal/context, not proof. The offline mock is lexical, so a live-provider
> dogfood is recommended before product features. See
> [Embedding Retrieval / Graph Dogfood Review](./embedding-retrieval-graph-dogfood-review.md).

Status: reviewed (slice 160). Base `47043ef`. Strategy / safety-review batch; no
runtime behavior changes, no source changes. Reviews the Embedding Provider /
Index v1 implementation shipped in slice 159 end-to-end against committed source.

## Decision Summary

**Embedding Provider / Index v1 is safe/stable.** The embedding provider, the
cache/index model, the retrieval command, and the `CapabilityEvidenceGraph`
embedding-similarity integration were re-read end-to-end against committed source
and the boundary holds: embeddings are neighbour evidence and context, never
proof. Embedding similarity is proposal/context, not proof. Retrieval output is
proposal/context, not proof. CapabilityEvidenceGraph remains the evidence
substrate, and deterministic facts remain stronger than embedding similarity. No
blocker was found.

Recommended next slice: **Embedding Retrieval / Graph Dogfood Review** — run
indexing, retrieval, and `--embedding-similarity latest` on a realistic
repository to evaluate ranking quality, stale behaviour, and explanation quality
before expanding toward canonical recommendations or duplicate detection.

## Why This Review Exists

Slice 159 added Rekon's first embedding capability after the
`CapabilityEvidenceGraph` substrate existed. The risk is not that embeddings are
inaccurate — they are a fuzzy signal by design — but that a black-box similarity
score quietly hardens into proof: a stale vector silently trusted, a similarity
claim treated as a deterministic fact, or a provider call firing as a surprising
default. This review confirms embeddings remain explainable graph evidence and
did not become a proof layer.

## Implementation Reviewed

Re-read against committed source at `47043ef`:

- `packages/llm-provider/src/index.ts` — `createVoyageEmbeddingProvider`,
  `createMockEmbeddingProvider`, the `RekonEmbeddingProvider` contract.
- `packages/capability-model/src/embedding-index.ts` — chunk model, identity,
  index key, vector ref, classifier, cosine.
- `packages/capability-model/src/capability-evidence-graph.ts` — the embedding
  mapping pass and the boundaries block.
- `packages/capability-model/src/index.ts` — re-exports.
- `packages/cli/src/index.ts` — `embeddings index`, `embeddings query`,
  `capability graph build --embedding-similarity latest`, the offline `mock`
  provider, and the TDZ-avoidance constant hoist.
- `packages/kernel-repo-model/src/index.ts` — `CapabilityEvidenceSource`
  (`embedding_similarity`) and `CapabilityEvidenceClaimSource` (`embedding`).
- `tests/contract/embedding-provider-index.test.mjs` (24) and
  `tests/docs/embedding-provider-index.test.mjs` (14).

## Provider Review

`createVoyageEmbeddingProvider` is a fetch-based, no-SDK Voyage adapter
(`voyage-code-3`, 1024-dim) behind the existing `RekonEmbeddingProvider.embed()`
surface. The API key is read from the environment by the CLI only — never from
repo config. **Voyage missing-key behavior fails cleanly without a network
call**: with no key, `embed()` returns `{ ok: false, error: "missing-api-key" }`
before the `fetchImpl` is ever resolved or invoked (llm-provider `index.ts`, the
`apiKey.length === 0` guard precedes the request body and fetch). The adapter
never throws a raw provider error — HTTP, transport, timeout, and parse failures
map to `http-<status>` / `request-failed` / `timeout` / `response-read-failed` /
`invalid-response-json` / `no-embeddings` / `embedding-count-mismatch`. Tests
inject `fetchImpl`; **live embedding tests are gated by environment variables**
(`VOYAGE_API_KEY` + `REKON_RUN_LIVE_EMBEDDING_TESTS`), so the committed suite is
keyless. The `mock` provider path is deterministic and offline. **Embedding
provider calls are explicit or configured, never surprising defaults**: a
provider is constructed only inside `rekon embeddings index` / `rekon embeddings
query`, never during plain `rekon scan` or a default `rekon capability graph
build`.

## Cache And Index Review

The cache/index model is pure (`embedding-index.ts`): no fs, no network. Chunk
text is derived (file summaries, exported-symbol signatures, capability phrases,
structural feature bags) — never raw whole-file source — and each chunk's
identity is the `sha256` of its derived text. The index key combines chunk id +
sha256 + provider + model + dimensions + policy version, and `vectorRef` /
`vectorSha256` bind a record to its raw vector file. **Embedding index writes
only under .rekon/cache/embeddings**: `embeddingCacheDir(root)` resolves to
`<root>/.rekon/cache/embeddings`, and `index.json` plus `vectors/<hash>.json` are
the only writes; the directory is gitignored, so **raw vectors are cache/index
data, not canonical proof artifacts**. The classifier marks a chunk `new`,
`stale` (sha changed), or `policy-changed` (provider / model / dimensions /
policy changed), and only those are re-embedded; everything else is reused. **No
stale embedding is used silently.** Source files are read, never modified.

## Retrieval Review

`rekon embeddings query --text` embeds the query, ranks cached chunks by cosine
similarity, and returns the nearest as **proposal/context, not proof**, with an
explicit note to that effect in both human and JSON output. When the cache is
empty it reports `status: "empty"` with no matches — it does not fabricate
results. When the provider fails (e.g. a missing Voyage key) it exits non-zero
with the provider's error and performs no retrieval. The query path executes no
commands and writes nothing.

## Graph Integration Review

`rekon capability graph build --embedding-similarity latest` reads the
`.rekon/cache/embeddings` cache and folds nearest-neighbour results into the
graph. **Embedding similarity enters CapabilityEvidenceGraph as
embedding_similarity evidence**: one evidence row per source chunk (`source:
"embedding_similarity"`) plus one claim per neighbour with `claimType:
"inference"`, `source: "embedding"`, predicate `similar_to` (or
`duplicate_candidate` at a high score), status `accepted`, and confidence equal
to the cosine score clamped strictly below `1.0` (the value reserved for
deterministic facts). **Embedding claims are inference claims, not facts**, and
**deterministic facts remain stronger than embedding similarity**. **Capability
graph build does not generate embeddings** — it reads cached vectors only — so
**CapabilityEvidenceGraph.generatedEmbeddings remains false when graph build
reads cached embeddings** and **CapabilityEvidenceGraph.usedLlm remains false for
embedding graph integration**; the artifact factory forces every boundary boolean
false regardless. A default `rekon capability graph build` folds in none of this.

## Boundary Review

The boundary holds across every surface. The following statements are confirmed
against committed source:

- Embedding similarity is proposal/context, not proof.
- Retrieval output is proposal/context, not proof.
- Raw vectors are cache/index data, not canonical proof artifacts.
- No stale embedding is used silently.
- Embedding provider calls are explicit or configured, never surprising defaults.
- Voyage missing-key behavior fails cleanly without a network call.
- Live embedding tests are gated by environment variables.
- Embedding index writes only under .rekon/cache/embeddings.
- CapabilityEvidenceGraph remains the evidence substrate.
- Embedding similarity enters CapabilityEvidenceGraph as embedding_similarity evidence.
- Embedding claims are inference claims, not facts.
- Deterministic facts remain stronger than embedding similarity.
- Capability graph build does not generate embeddings.
- CapabilityEvidenceGraph.generatedEmbeddings remains false when graph build reads cached embeddings.
- CapabilityEvidenceGraph.usedLlm remains false for embedding graph integration.
- Embeddings must not approve plans.
- Embeddings must not execute commands.
- Embeddings must not write source files.
- Embeddings must not create WorkOrder or VerificationPlan.
- Embeddings must not run Circe.
- intent:go remains deferred.

### TDZ hoisting fix (slice 159) review

Slice 159 found and fixed a temporal-dead-zone bug: `main()` is invoked at the
top of the CLI module and runs synchronously until its first `await`, and the
`embeddings query` branch reads `MOCK_EMBEDDING_DIMENSIONS` in its synchronous
flag-parsing prefix (before its first `await`), unlike `embeddings index` (whose
`await store.init()` precedes the read). The fix hoists the three embedding
constants above the `main()` invocation, following the existing
`ISSUE_MERGE_DECISION_REASONS` precedent and its TDZ-avoidance comment. The fix is
correct, minimal, idiomatic to the file, and changes no runtime semantics — it
only relocates module-level constants so the binding is initialised before the
synchronous prefix runs. It is covered by the contract test's `embeddings query`
case running under `node --test`. No concern.

### Surface table

| Surface | Status | Safety Finding |
| --- | --- | --- |
| createVoyageEmbeddingProvider | shipped | missing-key safe / no SDK |
| createMockEmbeddingProvider | shipped | deterministic tests |
| embedding-index module | shipped | pure chunk/index model |
| .rekon/cache/embeddings | shipped | cache/index, not proof |
| embeddings index | shipped | explicit provider call |
| embeddings query | shipped | retrieval context only |
| graph --embedding-similarity latest | shipped | cached evidence only |
| generatedEmbeddings boundary | shipped | false for graph build |

### Provider table

| Provider Path | Review Finding |
| --- | --- |
| Voyage missing key | clean failure / no network |
| Voyage live path | env-gated |
| mock provider | deterministic / offline |
| OpenAI embeddings | deferred |

### Cache table

| Cache Concern | Review Finding |
| --- | --- |
| raw vectors | cache/index only |
| index key | chunk sha + provider + model + dimensions + policy |
| stale source | reindex / no silent use |
| provider/model change | policy-changed |
| source writes | none |

### Boundary table

| Boundary | Decision |
| --- | --- |
| embedding vs proof | proposal/context |
| retrieval vs proof | proposal/context |
| embedding claims | inference, not fact |
| deterministic facts | stronger than similarity |
| command execution | no execution |
| source writes | no writes |
| WorkOrder / VerificationPlan | not created |
| Circe | not run |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare embedding index safe/stable | selected | cache/index boundary holds |
| retrieval dogfood next | selected | need quality/usefulness evidence |
| V1 publish next | deferred | embedding quality not dogfooded |
| canonical recommendations next | deferred | needs retrieval quality first |
| add OpenAI embeddings now | deferred | Voyage-first path should be reviewed first |

## Recommendation

Declare **Embedding Provider / Index v1 safe/stable** and proceed to an
**Embedding Retrieval / Graph Dogfood Review**. The provider/index boundary holds;
what is not yet known is whether retrieval ranking and graph
embedding-similarity evidence are *useful* on a realistic repository. Dogfood
that before expanding the embeddings track or moving toward V1 publish readiness.

## What This Does Not Do

This review changes no runtime behavior, no provider implementation, and no
cache/index implementation. It implements no OpenAI embeddings, adds no ANN/HNSW
or vector-storage changes, runs no live embedding provider, executes no commands,
writes no source files, approves no plans, creates no WorkOrder or
VerificationPlan, runs no Circe, and does not implement intent:go. It publishes
nothing and bumps no versions.

## Follow-Up Work

- **Next:** Embedding Retrieval / Graph Dogfood Review — evaluate retrieval
  quality, similarity ranking, stale-cache behaviour, explanation quality, and
  graph evidence usefulness on a realistic repo. Still no approval, command
  execution, source writes, or intent:go.
- **Alternative (only if a blocker is found):** Embedding Retrieval Quality Fix.
- **Deferred:** OpenAI embeddings as a second provider; canonical-implementation
  recommendation and duplicate detection built on top of retrieval; ANN/HNSW if
  the linear cosine scan becomes a scale constraint.

# Review Packet — Embedding Provider / Index Decision (slice 158)

Base `5cca5d5`. Strategy / architecture decision-only batch. Starts the
embeddings track as the next evidence source after `CapabilityEvidenceGraph` and
the semantic-file-understanding integration. No source changes, no embedding
implementation.

## CHANGES MADE

New decision memo (`docs/strategy/embedding-provider-index-decision.md`), this
review packet, a 20-assertion docs test, and cross-reference updates to 9 docs +
CHANGELOG. No runtime/source changes.

## PUBLIC API CHANGES

None. Decision-only batch.

## PURPOSE PRESERVATION CHECK

The original problem: Rekon has deterministic facts, semantic file
understanding, and a central `CapabilityEvidenceGraph`; the old codebase-intel
system used embeddings/similarity to improve duplicate detection, context
selection, canonical recommendation, and fuzzy retrieval; Rekon should add
embeddings only after deciding how vectors become explainable evidence in the
graph. This decision preserves that purpose exactly: embeddings are **neighbor
evidence, not proof**; retrieval is proposal/context, not proof; deterministic
facts remain stronger than embedding similarity; embeddings are traceable to
chunks, source hashes, provider/model, and graph evidence; provider calls are
explicit/configured, never surprising defaults. Nothing here widens the purpose
into action or approval.

## CODEBASE-INTEL ALIGNMENT

Grounded against the old system at `/Users/andrewlittrell/Code/codebase-intel`
(available). The old system used **Voyage `voyage-code-3`** (1024-dim, gated on
`VOYAGE_API_KEY`), embedded **derived analysis summaries — not raw source**,
stored vectors as a **regenerable JSON cache** (`embeddings.json`) keyed by model
version + per-file `summaryHash`, indexed with **HNSW (hnswlib-node, cosine)**,
and kept a deterministic **feature-bag** signal alongside semantic embeddings,
combined `(semantic + structural)/2 + runtime_boost`. Rekon's decision keeps the
proven choices (Voyage first, summary-not-source privacy, regenerable cache,
model+hash staleness) and improves on them: chunk/symbol-level granularity (not
whole-file-only) and embeddings as **explainable `embedding_similarity` evidence
inside `CapabilityEvidenceGraph`** rather than a parallel store.

## SOURCE REVIEW

Confirmed Rekon already ships the `RekonEmbeddingProvider` interface +
`createMockEmbeddingProvider` in `@rekon/llm-provider` (tasks `code.embedding` /
`plan.similarity` / `artifact.retrieval`), and the kernel
`CapabilityEvidenceSource` already includes `embedding_similarity` and
`CapabilityEvidenceClaimSource` already includes `embedding` — so embeddings need
**no kernel type change** to enter the graph.

## CURRENT EVIDENCE GRAPH SUBSTRATE

`CapabilityEvidenceGraph` is the central evidence substrate; it already accepts
embedding evidence/claim sources. The slice-156 `--semantic-file-reports`
integration is the template for opt-in, inference-not-fact, deterministic-wins
embedding integration.

## OPTIONS CONSIDERED

A (index outside graph) rejected — black-box drift. **B (embeddings as graph
evidence) selected** — explainable. C (whole-file only) rejected/deferred — too
coarse. D (structural vectors only) rejected/deferred — misses semantic
similarity. E (default scan embedding) rejected — privacy/cost surprise.

## PROVIDER DECISION

Mock provider (required, tests) + **Voyage `voyage-code-3` first** (parity, code
retrieval strength, `VOYAGE_API_KEY` available); **OpenAI deferred** as a second
provider behind the same interface. Not both in the first implementation slice.

## CHUNK MODEL

Typed chunks of derived text: `file_summary`, `symbol_summary`, `capability_text`,
`doc_section`, `comment_block`, `signature`, `structural_feature_bag`. Identity =
`EmbeddingChunkRef` (id + kind + path + symbolId?/lineStart?/lineEnd? + sha256).

## STORAGE AND INDEX MODEL

Raw vectors + ANN index are cache/index under `.rekon/cache/embeddings/`,
regenerable, never canonical. Index key = chunk id + sha256 + provider + model +
dimensions + policy version. Graph receives `embedding_similarity` evidence +
`embedding` claims.

## RETRIEVAL MODEL

Outputs nearest chunk refs + scores + provider/model + index version + source
hashes + explanation; proposal/context, not proof. Use cases: duplicate
detection, canonical candidates, task-shaped context, intent file matching,
ownership anomaly.

## STALENESS MODEL

Stale on chunk sha change, provider/model change, chunking policy change, or
semantic-summary text change. Never used silently.

## PRIVACY AND OPT-IN MODEL

No provider calls by default; explicit/configured; embed derived summaries, not
raw source; missing key = no call, no silent pretend-fresh fallback.

## GRAPH INTEGRATION MODEL

`rekon embeddings index|query` produce/query the cache; graph integration is an
opt-in flag on `rekon capability graph build` (mirroring `--semantic-file-reports`)
emitting `embedding_similarity` evidence + `embedding` claims. Deterministic
facts remain stronger.

## BOUNDARY MODEL

11 pinned statements (memo) + boundary table: proposal/context not proof; no
approval/commands/source-writes/Circe; cache/index storage; stale not silent;
intent:go deferred.

## TESTS / VERIFICATION

20 docs assertions (headings + 11 statements + 5 tables + CHANGELOG + this
packet). Full 9-command gate. No CLI smoke (decision-only).

## INTENTIONALLY UNTOUCHED

`@rekon/llm-provider` source, `CapabilityEvidenceGraph`,
`SemanticFileUnderstandingReport`, kernel types, scan behavior, versions, npm.

## RISKS / FOLLOW-UP

- ANN choice (exact-cosine vs HNSW) is deferred to v1 — must stay an
  implementation detail behind explainable graph evidence.
- Provider cost/rate-limit and chunk-volume bounds to be pinned in v1.

## NEXT STEP

Embedding Provider / Index v1.

# Review Packet — Embedding Provider / Index Safety Review (slice 160)

Base SHA: `47043ef`. Track: embeddings. Type: strategy / safety-review (no
runtime/source changes). Next step: Embedding Retrieval / Graph Dogfood Review.

## CHANGES MADE

- NEW `docs/strategy/embedding-provider-index-safety-review.md` — the safety
  review memo (decision, provider/cache/retrieval/graph/boundary reviews, the
  TDZ-fix review, 5 tables, recommendation).
- NEW `tests/docs/embedding-provider-index-safety-review.test.mjs` — 30
  assertions pinning the headings, the 21 verbatim boundary statements, the five
  tables, the CHANGELOG mention, and this packet's purpose-preservation check.
- NEW this review packet.
- Cross-reference pointers added to the v1 memo, the decision memo, the concept,
  the two evidence-graph strategy docs, the evidence-graph concept, the
  llm-provider-routing concept, the two release docs, README, and CHANGELOG.

## PUBLIC API CHANGES

None. Strategy / safety-review batch only — no source, no runtime behavior, no
exported-surface change.

## PURPOSE PRESERVATION CHECK

The purpose of the embeddings track is to add a fuzzy similarity signal that
stays explainable graph evidence, not a black-box proof layer. This review
confirms the guarantee is preserved end-to-end against committed source:

- embeddings are neighbour evidence, not proof; retrieval is context, not proof.
- raw vectors are regenerable cache; no stale embedding is used silently.
- graph claims remain inferential (`claimType: "inference"`, `source:
  "embedding"`, confidence clamped below the deterministic `1.0`).
- deterministic facts remain authoritative over embedding similarity.
- provider calls are explicit; a missing Voyage key fails cleanly with no
  network call; live tests are env-gated.

## CODEBASE-INTEL ALIGNMENT

The old codebase-intel embedding system used Voyage `voyage-code-3`, derived
summaries (not raw source), a regenerable JSON cache keyed by model version +
per-file summary hash, and similarity as a *filter/recommendation* signal — never
as proof. Slice 159 preserves that posture: Voyage-first, derived chunks, a
content-keyed regenerable cache under `.rekon/cache/embeddings`, and similarity
folded into the graph as `embedding_similarity` evidence rather than a parallel
proof store. The review finds no drift from that alignment.

## IMPLEMENTATION REVIEWED

`llm-provider/src/index.ts`, `capability-model/src/embedding-index.ts`,
`capability-model/src/capability-evidence-graph.ts`,
`capability-model/src/index.ts`, `cli/src/index.ts`,
`kernel-repo-model/src/index.ts`, and the two slice-159 test files — read against
committed source at `47043ef`.

## PROVIDER REVIEW

Voyage missing key → `ok:false` / `missing-api-key` before any fetch resolution
(no network). Never throws raw provider errors (mapped error codes). Live tests
env-gated; mock provider deterministic/offline. Providers are constructed only
inside the explicit `embeddings index` / `embeddings query` commands.

## CACHE AND INDEX REVIEW

Pure model; derived chunks (never raw whole-file source); sha256 content
identity; index key = id + sha + provider + model + dimensions + policy;
`vectorRef` / `vectorSha256` bind records to vector files. Writes confined to
`.rekon/cache/embeddings` (gitignored). Classifier: `new` / `stale` /
`policy-changed`; unchanged chunks reused; no silent stale use; no source writes.

## RETRIEVAL REVIEW

`embeddings query` ranks cached chunks by cosine, returns nearest as
proposal/context with an explicit note; empty cache → `status: "empty"` (no
fabrication); provider failure → non-zero exit, no retrieval. No commands, no
writes.

## GRAPH INTEGRATION REVIEW

`--embedding-similarity latest` reads the cache only. Emits `embedding_similarity`
evidence + `embedding` / `inference` claims (predicate `similar_to` /
`duplicate_candidate`, status `accepted`, confidence ≤ 0.99). Builder generates no
embeddings; `generatedEmbeddings` / `usedLlm` stay false (factory-forced).
Default build emits none.

## BOUNDARY REVIEW

All 21 boundary statements confirmed (see the memo's Boundary Review). The
slice-159 TDZ hoisting fix was reviewed explicitly and found correct, minimal,
and semantically inert.

## RECOMMENDATION

Embedding Provider / Index v1 is safe/stable. Proceed to **Embedding Retrieval /
Graph Dogfood Review**; defer V1 publish readiness, canonical recommendations,
and OpenAI embeddings until retrieval quality is dogfooded.

## TESTS / VERIFICATION

30-assertion docs test. Full keyless 9-command gate (test, typecheck, build,
diff --check, 5 audit scripts) green. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

Provider, cache/index, and graph implementations; OpenAI embeddings; ANN/HNSW;
vector storage; the user's prior commits; versions; npm.

## RISKS / FOLLOW-UP

- Retrieval *usefulness* (ranking quality, explanation quality) is not yet proven
  on a realistic repo — that is the next slice's job.
- v1 retrieval is a linear cosine scan; ANN is a later scale option.

## NEXT STEP

Embedding Retrieval / Graph Dogfood Review.

# Embedding Retrieval / Graph Dogfood Review

Status: dogfooded (slice 161). Base `533ff6a`. Product dogfood / review batch; no
runtime behavior changes, no embedding architecture changes. Dogfoods the shipped
embedding index, retrieval, and graph embedding-similarity path on a realistic
multi-domain repository fixture.

## Decision Summary

**The embedding index, retrieval, and graph embedding-similarity path work and
are useful on a realistic fixture.** Retrieval ranks same-domain chunks above
unrelated ones, the cache classifies stale and policy changes visibly, and the
graph folds in explainable `embedding_similarity` evidence with `embedding`
inference claims — boundaries hold throughout. Embedding retrieval is
proposal/context, not proof. One honest caveat drives the recommendation: the
offline `mock` provider is a deterministic **lexical** (token-hash) embedding, so
it ranks well when a query shares vocabulary with the target code, but it does
**not** model true semantic similarity. The pipeline and graph evidence are
proven; semantic ranking quality is not, because that needs the real provider.

Recommendation: proceed to a **Live Voyage Embedding Dogfood** to validate true
semantic ranking before building duplicate detection, canonical recommendations,
or task-shaped context. The mock path is sufficient for deterministic regression
tests; it is not sufficient to prove the semantic quality those product surfaces
depend on.

## Why This Review Exists

Embeddings were implemented (slice 159) and safety-reviewed (slice 160). Before
spending on duplicate detection, canonical recommendation, or task-shaped
context, the index/query/graph path needs to be exercised on real-shaped code to
answer: does retrieval rank usefully, is stale behavior visible, and is the graph
evidence explainable? This batch dogfoods exactly that and refuses to declare
semantic quality proven on a lexical mock.

## Implementation Reviewed

Re-read against committed source at `533ff6a`: `packages/llm-provider/src/index.ts`
(Voyage + mock providers), `packages/capability-model/src/embedding-index.ts`
(chunk/index/cosine model), `packages/capability-model/src/capability-evidence-graph.ts`
(embedding mapping pass + boundaries), `packages/cli/src/index.ts` (`embeddings
index` / `embeddings query` / `capability graph build --embedding-similarity
latest` + the offline `mock` provider), and the slice-159 contract test.

## Dogfood Scenario

A fresh fixture with four domains — `users/` (get-user, user-profile), `orders/`
(create-order, order-summary), `sms/` (route-message, send-message), and an
unrelated `unrelated/colors.ts` — was created, `git init`-ed, graphed, and
indexed with the `mock` provider. `capability graph build` produced 7 files /
12 symbols / 9 capabilities; `embeddings index --all --provider mock` indexed 35
derived chunks. All commands ran keyless.

## Retrieval Quality

Two natural-language queries, top-5, mock provider:

| Query | Top result | Top-5 domains | Unrelated `colors.ts` |
| --- | --- | --- | --- |
| "user lookup and profile data" | `capability_text` users/user-profile (0.61) | all `users/` | not in top-5 |
| "route inbound SMS message to support or default experience" | `capability_text` sms/route-message (0.51) | all `sms/` | not in top-5 |

Both queries returned a same-domain chunk in the top 3 (in fact the entire
top-5), and the unrelated colors file was never ranked first — or present at all.
This passes the dogfood's ranking bar. **Caveat:** the mock embedding is lexical
(it hashes tokens and sums them, so vectors correlate on shared tokens), and both
queries share vocabulary with their target domain ("user"/"profile",
"route"/"sms"/"support"/"default"). The mock therefore proves the *pipeline ranks
by relevance when vocabulary overlaps* — the realistic case for code retrieval —
but it is **not** evidence of paraphrase-robust semantic ranking. Mock retrieval
quality is sufficient for regression tests; it is not sufficient to prove the
semantic quality that duplicate detection / canonical recommendation depend on.

## Cache / Index Review

The cache wrote `index.json` plus 35 `vectors/<hash>.json` files under
`.rekon/cache/embeddings`; raw vectors are stored as separate files, never inline
in `index.json` and never as a registered/canonical artifact. Each record carries
`provider` / `model` / `dimensions` / `policyVersion` / `vectorSha256`. Stale and
policy behavior is visible:

| Action | indexed | reused | stale |
| --- | --- | --- | --- |
| reindex, no source change | 0 | 35 | 0 |
| reindex after editing one file | 4 | 33 | 2 |
| reindex with a different model | 37 | 0 | 37 |

No stale embedding is used silently — a changed chunk sha or a provider/model/
policy change reclassifies and re-embeds.

## Graph Integration Review

`capability graph build --embedding-similarity latest` produced 28
`embedding_similarity` evidence rows and 92 `embedding` claims. Every embedding
claim is `claimType: "inference"` and `status: "accepted"`; the maximum
confidence observed was 0.885 — clamped strictly below the deterministic `1.0`;
predicates were `similar_to` (no neighbour reached the `duplicate_candidate`
threshold). Each evidence excerpt is explainable — e.g. `embedding
mock/mock-embedding neighbors for capability_text:cap:build:user-profile:
src/users/user-profile.ts~0.660, ...` (provider/model + neighbour ids + scores) —
and every embedding claim's `evidenceRefs` resolve to an evidence row.
`generatedEmbeddings` and `usedLlm` both remained `false`; the graph read the
cache and generated nothing. A default `capability graph build` folds in none of
this. `artifacts validate` was clean.

## Live Provider Review

The live Voyage path was **not run** (no `VOYAGE_API_KEY` + `REKON_RUN_LIVE_EMBEDDING_TESTS=1`
in this batch). This is recorded, not blocked. A Live Voyage Embedding Dogfood is
the recommended next step precisely because it is the only way to validate true
semantic ranking before product features.

## Boundary Review

Confirmed against the dogfood run and committed source:

- Embedding retrieval is proposal/context, not proof.
- embedding_similarity enters CapabilityEvidenceGraph as evidence.
- Embedding claims are inference claims, not facts.
- Raw vectors remain cache/index data.
- CapabilityEvidenceGraph.generatedEmbeddings remains false when graph build reads cache.
- CapabilityEvidenceGraph.usedLlm remains false.
- Source files are unchanged.
- No WorkOrder or VerificationPlan is created.
- No Circe is run.
- intent:go remains deferred.

## Codebase-Intel Alignment

The old codebase-intel system (available at `/Users/andrewlittrell/Code/codebase-intel`)
used Voyage embeddings with cosine similarity, an HNSW/hnswlib ANN index, a
regenerable cache keyed by a per-file `summaryHash`, and built duplicate
detection, canonical-implementation recommendation, and labeling *on top of* that
similarity signal. Rekon's slice-159 implements the **substrate** — Voyage cosine
embeddings over derived chunks, a content-keyed regenerable cache under
`.rekon/cache/embeddings`, and similarity folded into the graph as
`embedding_similarity` evidence — with a linear cosine scan (no ANN yet) and the
duplicate/canonical/labeling product surfaces deferred. This dogfood is the gate
between the substrate and those product surfaces; it confirms the substrate is
useful and recommends a live-provider dogfood before building them.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare pipeline + graph evidence useful | selected | ranks by domain, explainable, boundaries hold |
| live Voyage dogfood next | selected | only way to prove semantic ranking |
| duplicate detection next | deferred | needs proven semantic ranking |
| canonical recommendations next | deferred | needs proven semantic ranking |
| task-shaped context next | deferred | needs proven retrieval quality |
| ANN / HNSW now | deferred | linear scan is fine at current scale |
| treat mock ranking as semantic proof | rejected | mock is lexical, not semantic |

## Recommendation

The embedding index, retrieval, and graph embedding-similarity path are useful
and safe on real-shaped code. Mock retrieval ranks correctly by domain and is a
good deterministic regression baseline. Recommend a **Live Voyage Embedding
Dogfood** before building duplicate detection, canonical recommendations, or
task-shaped context, since only the real provider can prove paraphrase-robust
semantic ranking. No focused mock scoring fix is needed — the mock already meets
its (lexical) bar.

## What This Does Not Do

This batch changes no runtime behavior, no provider implementation, and no
cache/index implementation. It adds no OpenAI embeddings, no ANN/HNSW, and no
vector-storage changes. It builds no duplicate detection, canonical
recommendation, or task-shaped context product surface. It runs no live embedding
provider, executes no commands, writes no source files, approves no plans, creates
no WorkOrder or VerificationPlan, runs no Circe, and does not implement intent:go.

## Follow-Up Work

- **Next:** Live Voyage Embedding Dogfood — run `embeddings index` / `query` /
  `--embedding-similarity latest` against the real Voyage provider on a realistic
  repo and record ranking quality, stale behaviour, and source immutability. Still
  no approval, command execution, source writes, or intent:go.
- **Alternative:** Embedding Retrieval Quality / Similarity Ranking Decision —
  formalize ranking/threshold policy once live quality is known.
- **Deferred:** duplicate detection, canonical-implementation recommendation, and
  task-shaped context product surfaces; ANN/HNSW if linear scan becomes a scale
  constraint; OpenAI embeddings as a second provider.

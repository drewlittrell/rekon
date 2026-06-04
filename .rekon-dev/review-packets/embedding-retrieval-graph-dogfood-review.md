# Review Packet — Embedding Retrieval / Graph Dogfood Review (slice 161)

Base SHA: `533ff6a`. Track: embeddings. Type: product dogfood / review (no
runtime/source changes). Next step: Live Voyage Embedding Dogfood.

## CHANGES MADE

- NEW `docs/strategy/embedding-retrieval-graph-dogfood-review.md` — the dogfood
  review (scenario, retrieval-quality table, cache stale/policy table, graph
  integration findings, codebase-intel alignment, recommendation).
- NEW `tests/contract/embedding-retrieval-graph-dogfood.test.mjs` — 20 assertions
  reproducing the dogfood (index / ranked queries / cache / graph evidence /
  boundaries / immutability / no-forbidden-artifacts).
- NEW `tests/docs/embedding-retrieval-graph-dogfood.test.mjs` — 13 assertions
  pinning the boundary statements, CHANGELOG mention, and this packet's
  purpose-preservation check.
- NEW this review packet.
- Cross-reference pointers added to 8 docs + CHANGELOG + README.

## PUBLIC API CHANGES

None. Dogfood / review batch only — no source, no runtime behavior, no
exported-surface change. No new embedding architecture.

## PURPOSE PRESERVATION CHECK

The purpose was to determine whether the embedding index/retrieval/graph path is
useful enough to feed product features, without letting embeddings drift into
proof. Preserved:

- embeddings remain neighbour evidence, not proof; retrieval remains
  proposal/context, not proof.
- graph embedding claims remain inference claims (`claimType: "inference"`,
  confidence < 1.0); deterministic facts remain stronger.
- raw vectors remain regenerable cache; stale/policy behaviour is visible.
- no source writes or command execution occurred during the dogfood.
- semantic quality is **not** declared proven on a lexical mock — a live-provider
  dogfood is recommended before product features.

## SOURCE REVIEW

Re-read provider, embedding-index, builder embedding pass, and the three CLI
surfaces at `533ff6a`. No code changed this batch; the dogfood exercised the
shipped behavior.

## DOGFOOD SCENARIO

Fresh four-domain fixture (`users` / `orders` / `sms` / unrelated `colors`),
git-init'ed. `capability graph build` → 7 files / 12 symbols / 9 capabilities;
`embeddings index --all --provider mock` → 35 chunks indexed. Keyless throughout.

## RETRIEVAL QUALITY

- "user lookup and profile data" → top-5 all `src/users/` (top 0.61).
- "route inbound SMS message to support or default experience" → top-5 all
  `src/sms/` (top 0.51).
- `unrelated/colors.ts` ranked first for neither (absent from both top-5).

Caveat: the mock embedding is lexical (token-hash cosine). It proves the pipeline
ranks by vocabulary-aligned relevance (the realistic code-retrieval case) but is
not evidence of paraphrase-robust semantic ranking. Sufficient for deterministic
regression tests; not sufficient to prove the semantics product features need.

## CACHE / INDEX REVIEW

`index.json` + 35 `vectors/<hash>.json` under `.rekon/cache/embeddings`; vectors
separate from `index.json`, never canonical artifacts. Stale/policy visible:
no-change → indexed 0 / reused 35; one file edited → indexed 4 / reused 33 /
stale 2; model change → indexed 37 / reused 0 (all policy-changed). No stale
embedding used silently.

## GRAPH INTEGRATION REVIEW

`--embedding-similarity latest` → 28 `embedding_similarity` evidence rows + 92
`embedding` claims, all `claimType: inference` / `status: accepted`, max
confidence 0.885 (< 1.0), predicate `similar_to`; excerpts explain
provider/model + neighbour ids + scores; all evidenceRefs resolve.
`generatedEmbeddings` / `usedLlm` false. Default build emits none. `artifacts
validate` clean.

## LIVE PROVIDER REVIEW

Live Voyage path not run (no `VOYAGE_API_KEY` + `REKON_RUN_LIVE_EMBEDDING_TESTS`).
Recorded, not blocked; it is the recommended next step.

## BOUNDARY MODEL

Embedding retrieval is proposal/context, not proof; embedding_similarity is graph
evidence; embedding claims are inference, not facts; raw vectors are cache/index;
`generatedEmbeddings` / `usedLlm` false; source unchanged; no WorkOrder /
VerificationPlan; no command execution; no Circe; intent:go deferred.

## TESTS / VERIFICATION

20 contract + 13 docs assertions. Full keyless 9-command gate green. CLI dogfood
scenario captured (above).

## INTENTIONALLY UNTOUCHED

Provider/cache/index/graph implementations; OpenAI embeddings; ANN/HNSW;
duplicate detection / canonical recommendation / task-shaped context product
surfaces; the user's prior commits; versions; npm.

## CODEBASE-INTEL ALIGNMENT

Old codebase-intel (`/Users/andrewlittrell/Code/codebase-intel`, available) used
Voyage + cosine + hnswlib ANN + a `summaryHash`-keyed regenerable cache, and
built duplicate detection / canonical recommendation / labeling on top. Rekon v1
implements the substrate (Voyage cosine + content-keyed regenerable cache + graph
evidence, linear scan) and defers ANN + those product surfaces. This dogfood
gates the jump from substrate to product surfaces.

## RISKS / FOLLOW-UP

- Semantic ranking quality is unproven on the mock — needs a live Voyage dogfood.
- Linear cosine scan is fine at current scale; ANN is a later option.

## NEXT STEP

Live Voyage Embedding Dogfood.

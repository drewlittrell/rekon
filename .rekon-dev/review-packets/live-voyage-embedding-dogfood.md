# Review Packet — Live Voyage Embedding Dogfood (slice 162)

Base SHA: `c851a4a`. Track: embeddings. Type: live-provider dogfood / review (no
runtime/source changes). Next step: Embedding Retrieval / Similarity Ranking
Decision.

## CHANGES MADE

- NEW `docs/strategy/live-voyage-embedding-dogfood.md` — the live dogfood review
  (setup/key-handling, literal + paraphrase ranking tables, mock-vs-Voyage
  contrast, graph integration, cache, live-provider evidence, boundary review,
  `input_type=query` follow-up, codebase-intel alignment, recommendation).
- NEW `tests/contract/live-voyage-embedding-dogfood.test.mjs` — gated live
  contract test; **skips** with no key / no `REKON_RUN_LIVE_EMBEDDING_TESTS=1`,
  asserts live ranking + 1024-dim cache + graph evidence + boundaries when run.
- NEW `tests/docs/live-voyage-embedding-dogfood.test.mjs` — keyless assertions
  pinning the boundary statements (incl. key-safety + gating), CHANGELOG
  mention, and this packet's purpose-preservation check.
- NEW this review packet.
- Cross-reference pointers added to embedding docs + concepts + releases +
  CHANGELOG + README.

## PUBLIC API CHANGES

None. Dogfood / review batch only — no source, no runtime behavior, no
exported-surface change. No new embedding architecture.

## SECURITY / KEY HANDLING

The `VOYAGE_API_KEY` was loaded into an environment variable only — never
printed to the session, never written to any repo file, never committed. Verified
post-run: the key value appears in **no** repo file (a `grep` for the variable
finds only files that mention the *name* in source/docs/tests, never the value).
The committed suite is keyless; the gated live contract test skips without the
key. The live run is captured as evidence in the memo, not as committed output.

## PURPOSE PRESERVATION CHECK

The purpose was to prove, with a real provider, the paraphrase-robust semantic
ranking the lexical mock could not — without letting embeddings drift into proof
or letting the key leak. Preserved:

- embeddings remain neighbour evidence, not proof; retrieval remains
  proposal/context, not proof.
- graph embedding claims remain inference claims (`claimType: "inference"`,
  confidence `0.9187` < 1.0); deterministic facts remain stronger.
- raw vectors remain regenerable 1024-dim cache, never canonical.
- no source writes, command execution, WorkOrder, VerificationPlan, or Circe
  occurred; `generatedEmbeddings` / `usedLlm` stayed false.
- the API key never entered the repo, logs, or commits.
- semantic quality is now **proven on a live provider** for the dogfood fixture,
  and the honest `input_type=query` quality nuance is recorded, not hidden.

## SOURCE REVIEW

Re-read the Voyage provider, embedding-index, builder embedding pass, and the
three CLI surfaces at `c851a4a`. No code changed this batch; the dogfood
exercised the shipped behavior with the real provider.

## DOGFOOD SCENARIO

Same four-domain fixture as slice 161 (`users` / `orders` / `sms` / unrelated
`colors`), git-init'ed. `embeddings index --all --provider voyage --model
voyage-code-3` → **31 chunks indexed, 0 failed**, `dimensions: 1024`. A twin
mock-indexed fixture was built only to contrast paraphrase behavior.

## RETRIEVAL QUALITY

Literal queries (Voyage, top-5):

- "user lookup and profile data" → top-5 all `src/users/` (top **0.8029**).
- "route inbound SMS message to support or default experience" → top-5 all
  `src/sms/` (top **0.8985**).

Both sharper than the slice-161 mock (0.61 / 0.51) with a clear on/off-target gap.

Paraphrase queries — **no shared vocabulary with target code** (the test the mock
could not pass):

- "look up the person who owns an account" → **Voyage** top-3 all `src/users/`
  (0.81 / 0.80 / 0.75); **mock** ranks unrelated `src/sms/route-message.ts`
  first (0.32), users second (0.20), orders through the rest — wrong domain.
- "decide which channel an incoming text should be forwarded to" → **Voyage**
  top-5 all `src/sms/` (0.81→0.65); **mock** lands sms but weak (0.20–0.30) and
  by partial-token luck.

Voyage is correct and decisive on both paraphrases; the mock is wrong on the
first and weak/lucky on the second. This is the decisive evidence of
paraphrase-robust semantic ranking.

## CACHE / INDEX REVIEW

`index.json` + **31** `vectors/<hash>.json` under `.rekon/cache/embeddings`. Each
vector file is **1024-length** (genuine Voyage `voyage-code-3`). Records carry
`provider: voyage`, `model: voyage-code-3`, `dimensions: 1024`, `vectorRef`; the
raw vector is never inlined. Cache is regenerable from source.

## GRAPH INTEGRATION REVIEW

`--embedding-similarity latest` (reading the live Voyage cache) → **31**
`embedding_similarity` evidence rows + **154** `embedding` claims, all
`claimType: inference` / `status: accepted`, **max confidence 0.9187** (< 1.0),
predicate `similar_to`; excerpts explain provider/model + neighbour ids + real
scores (e.g. `voyage/voyage-code-3 neighbors for … cap:get:user~0.807`); all
evidenceRefs resolve. `generatedEmbeddings` / `usedLlm` false. `artifacts
validate` clean.

## LIVE PROVIDER REVIEW

Provider `voyage`, model `voyage-code-3`, dimensions `1024`, 31/31 indexed, 0
failed. Live ranking semantic and paraphrase-robust. Honest nuance recorded: the
Voyage adapter sends `input_type: "document"` for both indexing and queries; the
API recommends `"query"` for query-side embeddings. Ranking is already strong
with `"document"`, so this is a quality follow-up for the Similarity Ranking
Decision, not a defect to fix in a review batch.

## BOUNDARY MODEL

Live Voyage embedding retrieval is proposal and context, not proof; embedding
claims are inference, never facts; deterministic facts remain stronger; raw
vectors are regenerable cache, never canonical; the API key is read from the
environment only and is never committed; live embedding tests are gated by
environment variables; the committed suite runs keyless; the graph build
generates no embeddings and calls no provider, so `generatedEmbeddings` /
`usedLlm` stay false; source unchanged; no WorkOrder / VerificationPlan; no
command execution; no Circe; intent:go deferred.

## TESTS / VERIFICATION

Gated live contract test (skips keyless; passes live with key) + keyless docs
assertions. Full keyless 9-command gate green; the live contract test reports
**skipped** under the keyless gate. Live CLI dogfood captured in the memo.

## INTENTIONALLY UNTOUCHED

Provider/cache/index/graph implementations; the `input_type=query` nuance;
OpenAI embeddings; ANN/HNSW; duplicate detection / canonical recommendation /
task-shaped context product surfaces; the user's prior commits; versions; npm.

## CODEBASE-INTEL ALIGNMENT

Old codebase-intel (`/Users/andrewlittrell/Code/codebase-intel`) used Voyage +
cosine + hnswlib ANN + a `summaryHash`-keyed regenerable cache to power
duplicate/canonical/labeling surfaces. This dogfood confirms Rekon's v1 substrate
reproduces that **foundation** with the real Voyage model — semantic,
paraphrase-robust cosine retrieval over a content-keyed regenerable cache — while
still deferring ANN (linear scan) and the product surfaces. Purpose preserved:
embeddings stay an evidence source feeding a graph, now proven real.

## RISKS / FOLLOW-UP

- `input_type=query` would likely improve query-side ranking; recorded for the
  ranking decision.
- Linear cosine scan is fine at current scale; ANN remains a later option.

## NEXT STEP

Embedding Retrieval / Similarity Ranking Decision.

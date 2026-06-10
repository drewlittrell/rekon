# Live Voyage Embedding Dogfood

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **First retrieval consumer decided (slice 165):** task-shaped context is the
> first consumer of the retrieval this dogfood validated — a future
> `TaskContextReport` / `rekon context task`, context not proof. See
> [Task-Shaped Context / Embedding Retrieval Decision](./task-shaped-context-embedding-retrieval-decision.md).

> **Ranking policy implemented (slice 164):** the `input_type=query` follow-up this
> dogfood recorded has shipped — queries now embed with `input_type=query`,
> indexing keeps `input_type=document`, and retrieval applies the score bands /
> top-k policy. See
> [Embedding Query Input-Type / Ranking Policy Implementation](./embedding-query-input-type-ranking-policy-implementation.md).

> **Ranking policy decided (slice 163):** the retrieval ranking policy this
> dogfood calibrated is now decided — score bands (>= 0.78 strong / 0.65–0.78
> useful / 0.50–0.65 weak / < 0.50 ignore), default top-k 8 (max 20),
> `input_type=query` for queries and `input_type=document` for indexing, and
> task-shaped context as the first product consumer. See
> [Embedding Retrieval / Similarity Ranking Decision](./embedding-retrieval-similarity-ranking-decision.md).

> **Slice 162 · live-provider dogfood / review batch.** This memo records a
> dogfood of the **real Voyage provider** (`voyage-code-3`, 1024-dim) against the
> same four-domain fixture used in the slice-161 mock dogfood. It introduces no
> new embedding architecture. Its job is to answer one question the offline mock
> could not: **does a real embedding model deliver paraphrase-robust semantic
> ranking** — ranking the right code for a query that shares no vocabulary with
> it — and does the live run honor every boundary the substrate promises?

## Decision summary

**The embedding substrate works with a real provider, and live Voyage delivers
the paraphrase-robust semantic ranking the lexical mock could not.** On the
slice-161 fixture, live `voyage-code-3` (1024-dim) indexed 31 chunks with zero
failures, ranked literal queries more sharply than the mock, and — the decisive
result — ranked the correct domain at the top of paraphrase queries that share
no tokens with the target code, where the lexical mock ranks an unrelated file
first. The graph integration, cache shape, boundaries, and source immutability
all held under the live provider exactly as they did under the mock. **The
substrate is ready to feed semantic product features using the real provider.**

Recommendation: **adopt live Voyage as the reference embedding provider for the
substrate** and proceed to an **Embedding Retrieval / Similarity Ranking
Decision** that formalizes thresholds, top-k, the `input_type=query` nuance
(below), and which product surface consumes retrieval first. This batch changes
no code; it records evidence.

## Why this review exists

Slice 161 dogfooded retrieval with the **offline deterministic mock**, whose
vectors are a token-hash projection. That run proved the *plumbing* — indexing,
cache reuse, query ranking, and graph evidence — and proved **vocabulary-aligned
ranking**: queries that reuse the code's words rank the right domain. It could
**not** prove semantics, and the slice-161 memo recorded that limit honestly:

> The mock is a lexical token-hash projection. It proves vocabulary-aligned
> ranking, not paraphrase-robust semantics.

A real embedding model is the only way to test the part that matters for product
features: retrieval that survives paraphrase, where the user's words and the
code's words diverge. This slice runs that test once, live, and records the
result as evidence. The committed test suite stays keyless; the live run is
captured here.

## Setup and key handling

- **Fixture:** identical to slice 161 — four domains under `src/`: `users/`
  (`getUser`, `findUserByEmail`, `buildUserProfile`), `orders/` (`createOrder`,
  `validateOrder`, `summarizeOrder`), `sms/` (`routeInboundSms`,
  `normalizePhoneNumber`, `sendSms`, `formatOutboundSms`), and an unrelated
  `colors.ts`. Git-initialized so the scan and graph behave as in a real repo.
- **Provider:** `embeddings index --all --provider voyage --model voyage-code-3`,
  resolving `createVoyageEmbeddingProvider({ apiKey: process.env.VOYAGE_API_KEY })`.
- **Key handling (security contract):** the `VOYAGE_API_KEY` was loaded into an
  environment variable only — never printed to the session, never written to any
  file in this repo, never committed. Verified after the run: the key value
  appears in **no** repo file (`grep` matches only files that mention the
  variable *name* in source, docs, and tests). **The Voyage API key is read from
  the environment only and is never committed.**
- **Gating:** the live path is reached only with `VOYAGE_API_KEY` set and
  `REKON_RUN_LIVE_EMBEDDING_TESTS=1`. **Live embedding tests are gated by
  environment variables.** **The committed test suite runs without any API key**
  — the gated live contract test skips, it does not fail.

## Live retrieval quality

Live `voyage-code-3` indexed **31 chunks, 0 failed**, `status: indexed`,
`dimensions: 1024`. The two slice-161 literal queries (cosine, top-5):

**Q1 — `"user lookup and profile data"`** (all top-5 in `src/users/`):

| score   | chunk kind               | path                       |
| ------- | ------------------------ | -------------------------- |
| +0.8029 | `capability_text`        | `src/users/user-profile.ts`|
| +0.7986 | `capability_text`        | `src/users/get-user.ts`    |
| +0.7699 | `capability_text`        | `src/users/get-user.ts`    |
| +0.6989 | `file_summary`           | `src/users/user-profile.ts`|
| +0.6708 | `structural_feature_bag` | `src/users/user-profile.ts`|

**Q2 — `"route inbound SMS message to support or default experience"`** (all top-5 in `src/sms/`):

| score   | chunk kind        | path                       |
| ------- | ----------------- | -------------------------- |
| +0.8985 | `capability_text` | `src/sms/route-message.ts` |
| +0.8145 | `signature`       | `src/sms/route-message.ts` |
| +0.8121 | `capability_text` | `src/sms/send-message.ts`  |
| +0.8054 | `capability_text` | `src/sms/send-message.ts`  |
| +0.7235 | `file_summary`    | `src/sms/route-message.ts` |

Both queries rank the correct domain in every top-5 slot — matching the mock's
domain selection but with markedly stronger, better-separated scores (~0.80–0.90
on-target). For comparison, the slice-161 mock topped out at **0.61** (Q1) and
**0.51** (Q2). Higher absolute scores with a clear on-target/off-target gap make
a similarity threshold meaningful, not arbitrary.

## Paraphrase robustness — the test the mock could not pass

The decisive test: queries phrased so they share **essentially no vocabulary**
with the target code. A lexical projection has nothing to match on; only a model
that understands meaning can rank correctly.

**Q3 — `"look up the person who owns an account"`** (target: `users/`; the code
says "user", "email", "profile" — none of those words appear in the query):

| rank | **Voyage (live)**                              | **Mock (lexical)**                                |
| ---- | ---------------------------------------------- | ------------------------------------------------- |
| 1    | **+0.8096 `src/users/get-user.ts`** ✅         | +0.3187 `src/sms/route-message.ts` ❌ (wrong domain) |
| 2    | **+0.8007 `src/users/get-user.ts`** ✅         | +0.1971 `src/users/get-user.ts`                   |
| 3    | **+0.7519 `src/users/user-profile.ts`** ✅     | +0.1879 `src/orders/create-order.ts` ❌           |
| 4    | +0.6703 `src/sms/send-message.ts`              | +0.1491 `src/orders/create-order.ts` ❌           |
| 5    | +0.6459 `src/sms/route-message.ts`             | +0.1400 `src/orders/order-summary.ts` ❌          |

Voyage ranks all three `users/` chunks at the top (0.75–0.81), cleanly above the
off-domain remainder. The lexical mock ranks an **unrelated SMS file first** and
scatters orders through the rest — it has no signal for a paraphrase, so token
collisions decide the order. This is the failure slice 161 predicted, shown
concretely.

**Q4 — `"decide which channel an incoming text should be forwarded to"`**
(target: `sms/`; the code says "route", "inbound", "message" — the query says
"channel", "incoming", "text", "forwarded"):

| rank | **Voyage (live)**                              | **Mock (lexical)**                                 |
| ---- | ---------------------------------------------- | -------------------------------------------------- |
| 1    | **+0.8080 `src/sms/route-message.ts`** ✅      | +0.3018 `src/sms/send-message.ts`                  |
| 2    | +0.7443 `src/sms/send-message.ts` ✅           | +0.2639 `src/sms/send-message.ts`                  |
| 3    | +0.7315 `src/sms/send-message.ts` ✅           | +0.2429 `src/sms/send-message.ts`                  |
| 4    | +0.7160 `src/sms/route-message.ts` ✅          | +0.2345 `src/sms/route-message.ts`                 |
| 5    | +0.6474 `src/sms/route-message.ts` ✅          | +0.2052 `src/sms/send-message.ts`                  |

Here the mock happens to land all-`sms/` — but at weak ~0.20–0.30 scores and
with `send-message` over `route-message`, i.e. the right neighborhood by luck of
partial token overlap, not by understanding "forward a text" ≈ "route a
message". Voyage ranks `route-message` first at 0.81 with a confident spread.
**Across both paraphrases, Voyage is correct and decisive; the mock is wrong on
Q3 and weak/lucky on Q4.** That asymmetry is the whole point of using a real
model.

## Graph integration review

`capability graph build --embedding-similarity latest`, reading the live Voyage
cache, produced:

- **31** `embedding_similarity` evidence rows and **154** `embedding` claims.
- Every embedding claim is `claimType: "inference"`, `status: "accepted"`,
  predicate `similar_to`. **Embedding claims are inference claims, never facts.**
- **Max embedding confidence 0.9187** — below the deterministic `1.0`, so
  **deterministic facts remain stronger than embedding similarity.**
- Every embedding claim's `evidenceRefs` resolve to a real evidence row.
- Evidence excerpts are explainable and carry the real provider/model and the
  real neighbor scores, e.g. `embedding voyage/voyage-code-3 neighbors for
  capability_text:cap:build:user-profile: cap:get:user~0.807, …`.
- Boundaries held: `generatedEmbeddings` **false**, `usedLlm` **false**. **The
  graph build generates no embeddings, so generatedEmbeddings stays false.**
  **The graph build calls no provider, so usedLlm stays false.** The builder
  only reads the cache the index step already wrote.
- `rekon artifacts validate` → **valid**.

## Cache and index review

- The cache is `index.json` + **31** `vectors/<hash>.json` files under
  `.rekon/cache/embeddings`. Each vector file holds a **1024-length** array —
  genuine Voyage `voyage-code-3` dimensionality.
- Index records carry `provider: voyage`, `model: voyage-code-3`,
  `dimensions: 1024`, and a `vectorRef` — **the raw vector is never inlined into
  the record**. **Raw vectors are regenerable cache and index data, never
  canonical.**
- The cache is regenerable: deleting `.rekon/cache/embeddings` and re-indexing
  reproduces it from source; nothing downstream treats a vector as ground truth.

## Live-provider evidence

| Property                    | Value                                            |
| --------------------------- | ------------------------------------------------ |
| Provider                    | `voyage`                                         |
| Model                       | `voyage-code-3`                                  |
| Dimensions                  | `1024`                                           |
| Chunks indexed / failed     | `31` / `0`                                        |
| Literal-query ranking       | correct domain in every top-5 (Q1, Q2)           |
| Paraphrase ranking          | correct domain at top (Q3 top-3, Q4 top-5)       |
| Graph evidence / claims     | `31` evidence, `154` inference claims            |
| Max embedding confidence    | `0.9187` (< deterministic `1.0`)                 |
| `generatedEmbeddings`       | `false`                                          |
| `usedLlm`                   | `false`                                          |
| `artifacts validate`        | valid                                            |
| Source files changed        | none                                             |
| Forbidden artifacts / Circe | none                                             |

## Boundary review

Every boundary the substrate promises held under the live provider:

- **Live Voyage embedding retrieval is proposal and context, not proof.**
- **Embedding claims are inference claims, never facts.**
- **Deterministic facts remain stronger than embedding similarity.**
- **Raw vectors are regenerable cache and index data, never canonical.**
- **The Voyage API key is read from the environment only and is never committed.**
- **Live embedding tests are gated by environment variables.**
- **The committed test suite runs without any API key.**
- **The graph build generates no embeddings, so generatedEmbeddings stays false.**
- **The graph build calls no provider, so usedLlm stays false.**
- **The Voyage dogfood writes no source files.**
- **The Voyage dogfood creates no WorkOrder and no VerificationPlan.**
- **The Voyage dogfood runs no Circe.**
- **intent:go remains deferred.**

## Known limitation and follow-up — `input_type` for queries

The Voyage adapter (`createVoyageEmbeddingProvider`) sends a fixed
`input_type` (default `"document"`) on every `embed()` call, and the CLI's
`resolveEmbeddingProvider` does not override it — so **both indexing and querying
embed with `input_type: "document"`**. Voyage's API recommends
`input_type: "query"` for query-side embeddings, which can improve retrieval
quality. Despite using `"document"` for queries, live ranking is already strong
(on-target ≥ 0.80, paraphrase correct), so this is a **quality opportunity, not
a defect** — and not in scope for a dogfood/review batch. It is recorded here as
concrete follow-up: a future slice can thread a per-task `inputType` ("query"
for retrieval, "document" for indexing) and re-measure. This is the kind of
tuning the recommended Similarity Ranking Decision should own.

## Codebase-intel alignment

The prior `codebase-intel` system used real Voyage embeddings with an hnswlib
ANN index and cosine similarity, keyed by content hash, to power
canonical/duplicate/labeling product surfaces. This dogfood confirms Rekon's v1
substrate reproduces the **foundation** of that system with a real provider —
the same Voyage model family, cosine ranking, content-keyed regenerable cache,
and paraphrase-robust retrieval — while still deliberately deferring ANN (v1
uses a linear cosine scan) and the product surfaces themselves. **Purpose
preserved:** Rekon keeps embeddings as an *evidence source feeding a graph*,
not a standalone feature, and this run proves that foundation is real, not
mocked.

## Options considered

- **Option A — adopt live Voyage as the reference provider and proceed to a
  Similarity Ranking Decision (recommended).** The live evidence is decisive:
  semantic, paraphrase-robust ranking with held boundaries. The next unit of
  work is deciding *how* retrieval is consumed (thresholds, top-k, `input_type`,
  first product surface), not whether the provider works.
- **Option B — build more provider variety first (e.g. OpenAI embeddings).**
  Deferred: one strong code-specialized provider is enough to unblock product
  decisions; multi-provider comparison is a later optimization.
- **Option C — fix `input_type=query` in this batch.** Rejected for scope: this
  is a dogfood/review batch with no architecture changes; the nuance is recorded
  as follow-up for the decision slice that should own retrieval tuning.

## Recommendation

**Adopt live `voyage-code-3` as the reference embedding provider for the
substrate.** The substrate is proven end-to-end with a real model: semantic
ranking that survives paraphrase, sharper-than-mock scores, intact graph
evidence, regenerable 1024-dim cache, and every boundary held. Proceed to an
**Embedding Retrieval / Similarity Ranking Decision** that formalizes the
similarity threshold, top-k, the `input_type=query` improvement, and the first
product surface (duplicate-candidate detection or task-shaped context) to consume
retrieval.

## What this does not do

- It does not change any embedding code, provider, adapter, or CLI surface.
- It does not fix the `input_type=query` nuance — that is recorded as follow-up.
- It does not add ANN; v1 retrieval remains a linear cosine scan.
- It does not ship a product surface (duplicate detection, canonical
  recommendation, labeling); those remain deferred to decision slices.
- It does not commit, print, or persist the Voyage API key anywhere in the repo.
- It does not run any LLM provider, generate embeddings during graph build,
  execute commands, write source, create a WorkOrder or VerificationPlan, or run
  Circe. **intent:go remains deferred.**

## Follow-up work

1. **Embedding Retrieval / Similarity Ranking Decision** — thresholds, top-k,
   `input_type=query` for the retrieval task, and the first product surface.
2. **`input_type=query` for query embeddings** — thread a per-task input type
   through `resolveEmbeddingProvider` and re-measure ranking.
3. **Product surface decision** — duplicate-candidate detection or task-shaped
   context as the first consumer of embedding evidence.
4. **ANN index** — defer until corpus size makes the linear cosine scan a
   bottleneck; revisit hnswlib alignment with `codebase-intel` then.

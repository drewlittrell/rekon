# Review Packet — Embedding Query Input-Type / Ranking Policy Implementation (slice 164)

Base SHA: `eb08123`. Track: embeddings. Type: product capability (CLI + helper).
Next step: Task-Shaped Context / Embedding Retrieval Decision.

## CHANGES MADE

- `@rekon/capability-model` `embedding-index`: new pure `classifyEmbeddingSimilarityScore(score)`
  + `EmbeddingScoreBand` type + threshold constants (`EMBEDDING_SCORE_BAND_STRONG=0.78`,
  `EMBEDDING_SCORE_BAND_USEFUL=0.65`, `EMBEDDING_SCORE_BAND_WEAK=0.5`); re-exported from the package index.
- `@rekon/cli`:
  - `resolveEmbeddingProvider` gains an optional `inputType: "document" | "query"`
    (default `"document"`), threaded to `createVoyageEmbeddingProvider`.
  - `embeddings index` builds its provider with `inputType: "document"` and reports
    `summary.inputType: "document"`.
  - `embeddings query` builds its provider with `inputType: "query"`; implements
    default top-k 8, max 20 (clamp), clean failure on invalid `--top-k`; emits
    `query.{text,provider,model,requestedTopK,effectiveTopK,inputType}`, top-level
    `requestedTopK`/`effectiveTopK`/`inputType`, `results` (and `matches` alias)
    with `score`/`scoreBand`/`chunk`/`explanation`, and a `boundaries` block;
    human output shows the band.
  - Help text updated with the top-k policy + input_type + proposal/context note.
- NEW `tests/contract/embedding-query-ranking-policy.test.mjs` (24 assertions).
- NEW `tests/docs/embedding-query-ranking-policy.test.mjs` (19 assertions).
- NEW `docs/strategy/embedding-query-input-type-ranking-policy-implementation.md` + this packet.
- Cross-references added to embedding docs + concept + release docs + CHANGELOG + README.

## PUBLIC API CHANGES

Additive only. `resolveEmbeddingProvider` is CLI-internal. New optional exports
(`classifyEmbeddingSimilarityScore`, `EmbeddingScoreBand`, band constants) in
`@rekon/capability-model`. `embeddings query` JSON gains fields (`results`,
`scoreBand`, `query` object, `requestedTopK`/`effectiveTopK`/`inputType`,
`boundaries`); `matches` and its flat `path`/`kind`/`score` are retained for
backward compatibility, so existing callers and tests are unaffected.

## PURPOSE PRESERVATION CHECK

The purpose was to implement the slice-163 ranking policy so product consumers
inherit a stable contract — without letting retrieval drift into proof.
Preserved:

- retrieval remains proposal/context, not proof; score bands are policy labels.
- query embeddings use `input_type=query`; index embeddings use `input_type=document`.
- deterministic facts remain stronger than embedding similarity.
- graph embedding-similarity is unchanged (`generatedEmbeddings` / `usedLlm` false).
- no command execution, no source writes, no Circe, no WorkOrder/VerificationPlan;
  intent:go deferred.
- duplicate detection, canonical recommendations, and task-shaped context remain
  unimplemented.

## SOURCE REVIEW

Ground-read at `eb08123`: the Voyage adapter already exposed
`inputType: "document" | "query"` (default document) and sends `input_type` in
the request body; the CLI built one provider per operation via
`resolveEmbeddingProvider`; `embeddings query` defaulted to top-k 10 uncapped and
emitted a flat `matches` array; the embedding-index module already had
`cosineSimilarity` + `EMBEDDING_POLICY_VERSION`; chunks carry `symbolId?` and the
derived `text` (so `symbolId` + `textPreview` are available from cache).

## QUERY / DOCUMENT INPUT TYPE

Index → `input_type=document`; query → `input_type=query`. Asserted two ways
keyless: (1) a direct adapter test injects a `fetchImpl` and confirms the request
body's `input_type` for each configured mode; (2) the index/query JSON report the
input type, observable via the mock provider.

## RANKING POLICY

Default top-k 8, max 20 (clamp + report requested vs effective); invalid `--top-k`
fails cleanly. Bands: `>= 0.78` strong / `0.65–0.78` useful / `0.50–0.65` weak /
`< 0.50` ignored.

## SCORE BAND MODEL

`classifyEmbeddingSimilarityScore` is pure and deterministic; `NaN` and
sub-threshold scores classify as `ignored`. Tested directly at the band
boundaries (0.78, 0.65, 0.50, 0.49, 0, NaN).

## CLI OUTPUT / EXPLANATION MODEL

Each result: `score`, `scoreBand`, `chunkId`/`kind`/`path` (back-compat) +
`chunk{id,kind,path,symbolId?}` + `explanation{provider,model,policyVersion,textPreview}`.
Top-level `query` object + `requestedTopK`/`effectiveTopK`/`inputType` +
`boundaries` + `note`. Human output: `score band path kind id`, plus a
proposal/context footer.

## STALE / POLICY FILTERING

Unchanged from the shipped index/cache behavior; this slice does not alter stale
or policy-version handling. Ignored-score results are labeled and retained;
default removal of ignored results is a documented follow-up for the first
consumer.

## GRAPH EVIDENCE COMPATIBILITY

`capability graph build --embedding-similarity latest` is untouched: it still
emits `embedding_similarity` evidence + `embedding` inference claims with
`generatedEmbeddings` / `usedLlm` false and validates clean.

## BOUNDARY MODEL

Retrieval is proposal/context, not proof; thresholds/bands are policy, not proof;
no approval, command execution, source writes, WorkOrder, VerificationPlan, or
Circe; intent:go deferred; CapabilityEvidenceGraph remains the substrate.

## TESTS / VERIFICATION

24-assertion contract test + 19-assertion docs test; the three existing embedding
contract suites pass unchanged (backward compatible). Full keyless 9-command gate;
CLI smoke on a temp fixture (default top-k 8, clamp 999→20, invalid fails, bands
present, graph valid, source unchanged).

## INTENTIONALLY UNTOUCHED

Voyage adapter internals; the embedding index/cache shape; ANN/HNSW; OpenAI
embeddings; scan auto-embedding; duplicate detection; canonical recommendations;
task-shaped context; the user's prior commits; versions; npm.

## RISKS / FOLLOW-UP

- Default removal of ignored results is deferred to the first consumer surface.
- Bands are calibrated on the live Voyage dogfood; re-tune with a larger corpus.
- `input_type=query` quality is unmeasured at scale; the first consumer should
  re-measure ranking.

## NEXT STEP

Task-Shaped Context / Embedding Retrieval Decision.

# Review Packet — Embedding Retrieval / Similarity Ranking Decision (slice 163)

Base SHA: `9d57089`. Track: embeddings. Type: strategy / architecture decision
(no runtime/source changes). Next step: Embedding Query Input-Type / Ranking
Policy Implementation.

## CHANGES MADE

- NEW `docs/strategy/embedding-retrieval-similarity-ranking-decision.md` — the
  ranking-policy decision (thresholds, top-k, input-type split, explanation
  model, staleness model, first consumer, boundary model, implementation
  sequence).
- NEW `tests/docs/embedding-retrieval-similarity-ranking-decision.test.mjs` —
  24 assertions pinning headings, boundary statements, the five tables, the
  CHANGELOG mention, and this packet's purpose-preservation check.
- NEW this review packet.
- Cross-reference pointers added to embedding strategy + concept + release docs +
  CHANGELOG + README.

## PUBLIC API CHANGES

None. Decision-only batch — no source, no runtime behavior, no exported-surface
change, no Voyage adapter change. No ranking implementation.

## PURPOSE PRESERVATION CHECK

The original problem: embeddings are now live and useful, but retrieval must
become a stable policy before product features (task-shaped context, duplicate
detection, canonical recommendations) consume it — so those surfaces don't
hard-code ad hoc thresholds, top-k values, or provider-specific quirks.
Preserved:

- retrieval remains proposal/context, not proof.
- score thresholds are explicit and explainable (strong / useful / weak / ignore
  bands), and are policy, not proof.
- the query/document embedding mode is explicit (query for queries, document for
  indexing).
- downstream surfaces consume ranked results with known confidence semantics; no
  surface treats similarity as approval or proof.
- CapabilityEvidenceGraph remains the evidence substrate; retrieval results
  become graph evidence or graph-adjacent context.
- duplicate detection and canonical recommendations are deferred until similarity
  is corroborated by deterministic evidence.

## SOURCE REVIEW

Re-read the embedding surfaces at `9d57089`: provider (`createVoyageEmbeddingProvider`,
which already exposes `inputType: "document" | "query"`, default `"document"`),
`embedding-index`, the graph embedding pass (`EMBEDDING_DUPLICATE_THRESHOLD=0.95`,
`EMBEDDING_MAX_CONFIDENCE=0.99`), and the CLI (`embeddings query` default top-k
**10** uncapped; graph neighbors `GRAPH_EMBEDDING_NEIGHBOR_TOP_K=5`,
`GRAPH_EMBEDDING_NEIGHBOR_FLOOR=0.5`). Reviewed old codebase-intel (present):
top-k 10, near-duplicate 0.86, similarity bands 0.6/0.7/0.8/0.9, Voyage
`input_type: 'document'` only (no query mode), canonical ranking = base score 50 +
`log2(fanIn+1)*5` capped 20, hnswlib ANN (M16/ef200/ef50, cosine, 1024-dim). No
code changed this batch.

## LIVE DOGFOOD EVIDENCE

From the Live Voyage Embedding Dogfood (slice 162): strong same-domain matches
~0.75–0.81 (top SMS literal 0.8985), off-target ~0.64–0.67, mock 0.20–0.61, graph
max confidence 0.9187. These calibrate the score bands: >= 0.78 strong,
0.65–0.78 useful, 0.50–0.65 weak, < 0.50 ignore.

## NORTH STAR ALIGNMENT

Retrieval serves the graph-first model: results become `embedding_similarity`
evidence + `embedding` inference claims, or graph-adjacent context — never a
standalone vector-search product, never approval or proof. CapabilityEvidenceGraph
remains central.

## OPTIONS CONSIDERED

A duplicate detection first (deferred — precision risk); B task-shaped context
first (selected — context safer than judgment); C canonical recommendations first
(deferred — needs deterministic corroboration); D ranking policy only
(rejected/deferred — no consumer to calibrate); E ANN/HNSW first
(rejected/deferred — linear scan enough for v1).

## RANKING POLICY

Bands >= 0.78 strong / 0.65–0.78 useful / 0.50–0.65 weak / < 0.50 ignore. Default
top-k = 8, max default top-k = 20. Per-surface: task-shaped context uses
strong+useful; duplicate candidates require strong + deterministic corroboration;
canonical recommendations require strong + fan-in/ownership/runtime corroboration;
plan/intent context is context only. Thresholds are policy, not proof, and
provisional pending a larger dogfood.

## QUERY / DOCUMENT INPUT TYPE

Indexing uses `input_type=document`; query text uses `input_type=query`. The
adapter already supports the option; the implementation slice wires the CLI query
path to it. Improvement over codebase-intel, which only ever used `document`.

## EXPLANATION MODEL

Each result carries chunk id/kind/path/symbol, score + band, provider/model/policy
version, a "why this exists" rationale, an excerpt/preview, and staleness/policy
status. CLI JSON preserves it for consumers; human output stays compact. Results
must be describable as graph evidence or graph-adjacent context, not just CLI rows.

## STALENESS / POLICY MODEL

Stale and policy-changed vectors are excluded from normal retrieval by default;
query provider/model must match index provider/model unless explicitly allowed;
stale/policy records cause a warn-and-skip, never silent use.

## FIRST CONSUMER

Task-shaped context. Duplicate detection and canonical recommendations deferred
until retrieval precision is corroborated by deterministic evidence.

## BOUNDARY MODEL

Retrieval is proposal/context, not proof; no approval, no command execution, no
source writes, no Circe; thresholds are policy; CapabilityEvidenceGraph remains
the substrate; intent:go deferred.

## TESTS / VERIFICATION

24-assertion docs test. Full keyless 9-command gate (typecheck, test, build,
git diff --check, audit-package-exports, audit-license, publish-dry-run,
install-smoke, install-tarball-smoke). No CLI smoke required for a decision-only
batch.

## INTENTIONALLY UNTOUCHED

Provider/adapter behavior; `input_type=query` implementation; ranking thresholds
in code; top-k defaults in code; task-shaped context; duplicate detection;
canonical recommendations; ANN/HNSW; OpenAI embeddings; scan auto-embedding; raw
vectors as canonical artifacts; the user's prior commits; versions; npm.

## RISKS / FOLLOW-UP

- Thresholds are calibrated on one fixture; re-tune against a larger dogfood.
- `input_type=query` is unmeasured; the implementation slice should re-measure
  ranking after wiring it.
- Linear scan is fine now; ANN remains a later option as corpus grows.

## NEXT STEP

Embedding Query Input-Type / Ranking Policy Implementation.

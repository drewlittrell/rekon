# Embedding Query Input-Type / Ranking Policy Implementation

> **Slice 164 · product capability batch.** Base `eb08123`. Implements the
> retrieval ranking policy selected by the
> [Embedding Retrieval / Similarity Ranking Decision](./embedding-retrieval-similarity-ranking-decision.md):
> Voyage queries embed with `input_type=query` (indexing keeps
> `input_type=document`), `rekon embeddings query` defaults to top-k 8 (capped at
> 20), and every result carries an explainable score band. Retrieval stays
> proposal/context, never proof.

## What Shipped

- **Query/document input types.** `rekon embeddings index` builds its provider
  with `input_type=document`; `rekon embeddings query` builds its provider with
  `input_type=query`. The Voyage adapter already exposed an
  `inputType: "document" | "query"` option, so this is a minimal wiring change
  through `resolveEmbeddingProvider`. The `mock` provider ignores the input type
  (it is a deterministic token-hash with no input modes). **Query embeddings use
  input_type=query.** **Index embeddings use input_type=document.** The index
  JSON summary now reports `inputType: "document"` and the query JSON reports
  `inputType: "query"` so the wiring is observable without a live key.
- **Top-k policy.** **The default top-k is 8.** **The maximum top-k is 20.** When
  `--top-k` is omitted the effective top-k is 8; when it exceeds 20 it is clamped
  to 20 and the JSON reports both `requestedTopK` and `effectiveTopK`; when it is
  non-positive or non-numeric the command fails cleanly with a clear error. Top-k
  is never silently uncapped.
- **Score bands.** A pure `classifyEmbeddingSimilarityScore(score)` helper in
  `@rekon/capability-model` maps each similarity score to a band. **A score of
  0.78 or higher is a strong semantic neighbor.** **A score from 0.65 to 0.78 is
  a useful contextual neighbor.** **A score from 0.50 to 0.65 is a weak /
  needs-review neighbor.** **A score below 0.50 is ignored by default.** Score
  bands are policy labels, not proof.
- **Explainable results.** Every query result carries `score`, `scoreBand`, the
  `chunk` (`id`/`kind`/`path`/`symbolId`), and an `explanation`
  (`provider`/`model`/`policyVersion`/`textPreview`). Human output stays compact
  but shows the band.
- **Boundaries surfaced.** Query JSON includes a `boundaries` block
  (`retrievalIsProof: false`, `approvedPlans: false`, `executedCommands: false`,
  `wroteSourceFiles: false`, `ranCirce: false`, `implementedIntentGo: false`).

## Ranking Policy

| Score Band | Meaning | Default Use |
| --- | --- | --- |
| >= 0.78 | strong semantic neighbor | include |
| 0.65–0.78 | useful contextual neighbor | include for context |
| 0.50–0.65 | weak / needs-review neighbor | optional/supporting only |
| < 0.50 | ignored by default | excluded from product surfaces |

| Operation | Input Type |
| --- | --- |
| indexing chunks | document |
| embedding query text | query |
| mock provider | deterministic local equivalent |

## Ignored-Score Behavior

This slice attaches a score band to every result and labels ignored (< 0.50)
neighbors as `ignored`; it retains them in the `results` list rather than
removing them, so weak neighbors are visible-but-labeled. Default *removal* of
ignored results is a documented follow-up for the first product consumer, where
the surface decides how strictly to filter. The offline `mock` provider is a
lexical token-hash whose scores naturally land in the `weak`/`ignored` bands, so
removing ignored results by default would empty the keyless regression fixtures;
labeling-without-removing keeps the bands honest and the suite deterministic.

## Boundary Model

- **Retrieval output is proposal/context, not proof.**
- **Deterministic facts remain stronger than embedding similarity.**
- Score bands and top-k are policy, not proof.
- **Task-shaped context remains the first selected consumer but is not
  implemented in this slice.**
- **Duplicate detection and canonical recommendations are deferred.**
- **This slice executes no commands.**
- **This slice writes no source files.**
- **This slice runs no Circe.**
- It creates no WorkOrder and no VerificationPlan. **intent:go remains deferred.**
- Graph embedding-similarity stays unchanged: `generatedEmbeddings` and
  `usedLlm` remain false; embedding claims remain inference claims.

## What This Does Not Do

- It does not implement task-shaped context, duplicate detection, or canonical
  recommendations.
- It does not add ANN/HNSW or OpenAI embeddings, and does not auto-run embeddings
  during scan.
- It does not store raw vectors as canonical artifacts.
- It does not approve plans, execute commands, write source files, create a
  WorkOrder or VerificationPlan, or run Circe. **intent:go remains deferred.**

## Implementation Sequence

Next: **Task-Shaped Context / Embedding Retrieval Decision** — define the first
product consumer for retrieval (task input shape, graph neighborhood expansion,
deterministic-evidence weighting, human-vs-agent output) now that ranking policy
is implemented. Duplicate detection and canonical recommendations remain deferred
until retrieval precision is corroborated by deterministic evidence.

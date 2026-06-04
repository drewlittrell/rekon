# Embedding Retrieval / Similarity Ranking Decision

> **Slice 163 · strategy / architecture decision batch.** Base `9d57089`. No
> runtime behavior changes, no source changes, no Voyage adapter changes, no
> ranking implementation. This memo decides Rekon's embedding **retrieval
> ranking policy** — thresholds, top-k, query/document input type, score
> interpretation, explanation requirements, staleness behavior, graph-first
> semantics, and the first product consumer — after the successful
> [Live Voyage Embedding Dogfood](./live-voyage-embedding-dogfood.md).

## Decision Summary

**Adopt an explicit, provider-calibrated retrieval ranking policy, and select
task-shaped context as the first product consumer (Option B).** Live Voyage
retrieval is good enough to proceed to product-surface design, but duplicate
detection and canonical recommendations need stricter precision and deterministic
corroboration than raw similarity can provide today. So this decision (1) pins
similarity score bands, top-k defaults, and the query/document input-type split;
(2) requires every retrieval result to carry an explainable score band and
provenance; (3) keeps stale/policy-changed vectors out of retrieval by default;
(4) keeps **CapabilityEvidenceGraph** the evidence substrate; and (5) selects
**task-shaped context** as the first consumer, deferring duplicate detection and
canonical recommendations until similarity is combined with deterministic
evidence. No code changes here — the implementation lands in the next slice.

## Why This Decision Exists

The Live Voyage dogfood proved the quality claim that the lexical mock could not:
real `voyage-code-3` gives **paraphrase-robust** semantic ranking. But "it ranks
well on one fixture" is not a policy. Before product features consume retrieval,
Rekon must pin *how* scores are interpreted, *how many* neighbors are returned,
*which* input type queries use, and *what* counts as strong-versus-ignore — so
that downstream surfaces (task-shaped context, duplicate detection, canonical
recommendations) inherit one calibrated policy instead of hard-coding ad hoc
thresholds, top-k values, and provider quirks. This decision exists to prevent
that drift, and to keep retrieval aligned with the graph-first North Star.

It also resolves the one tuning gap the dogfood recorded: the Voyage adapter
currently sends `input_type: "document"` for both indexing and queries, where
Voyage recommends `input_type: "query"` for query-side text.

## North Star Alignment

Rekon's North Star is an **evidence-backed capability intelligence system**:
ontology defines the contract, deterministic scanners provide facts, LLMs provide
semantic interpretation, embeddings provide fuzzy similarity / neighborhood
evidence, reconciliation decides what survives, and every important output is
traceable to evidence. Embedding retrieval must serve this graph-first model, not
become a parallel black-box vector-search product. **CapabilityEvidenceGraph
remains the evidence substrate.** Concretely: retrieval results are explainable
neighborhood evidence that either enter the graph as `embedding_similarity`
evidence / `embedding` inference claims, or are presented as graph-adjacent
context — never as a standalone judgment, approval, or proof. **Ranking policy
must describe how retrieval results become graph evidence or graph-adjacent
context, not just CLI search output.**

## Live Dogfood Evidence

From [Live Voyage Embedding Dogfood](./live-voyage-embedding-dogfood.md)
(`voyage-code-3`, 1024-dim), used here as calibration:

- Strong same-domain matches (literal and paraphrase) landed at **~0.75–0.81**;
  the top literal SMS match reached **0.8985**.
- Off-target neighbors that still surfaced landed around **~0.64–0.67**.
- The lexical mock's matches landed at **~0.20–0.61** — confirming the mock is a
  vocabulary-aligned baseline, not a semantic one.
- Graph integration held: 31 `embedding_similarity` evidence rows + 154
  `embedding` inference claims, **max confidence 0.9187 < 1.0**,
  `generatedEmbeddings` / `usedLlm` false, source unchanged, cache held genuine
  1024-dim vectors, `artifacts validate` clean.

**Current Rekon retrieval defaults** (grounded at `9d57089`):

- `rekon embeddings query` default **top-k = 10**, uncapped
  (`packages/cli/src/index.ts`).
- Graph neighbor selection: **top-k = 5, floor = 0.5**
  (`GRAPH_EMBEDDING_NEIGHBOR_TOP_K` / `GRAPH_EMBEDDING_NEIGHBOR_FLOOR`).
- Graph claims: `duplicate_candidate` predicate at **0.95**
  (`EMBEDDING_DUPLICATE_THRESHOLD`), confidence clamped at **0.99**
  (`EMBEDDING_MAX_CONFIDENCE`).
- The Voyage adapter already exposes `inputType: "document" | "query"` (default
  `"document"`); the CLI query path does not yet pass `"query"`.

**codebase-intel precedent** (`/Users/andrewlittrell/Code/codebase-intel`,
present and reviewed):

- Default retrieval **top-k = 10** (`domain/context/semanticRetrieval.ts:89`).
- Near-duplicate threshold **0.86** (`config/memory/instruction-signals.ts:80`);
  similarity bands 0.6 (gap) / 0.7 (bypass) / 0.8 (very similar) / 0.9 (nearly
  identical) (`schemas/config/base.schema.ts`, `lib/canonical-issues.ts`).
- Voyage usage was **`input_type: 'document'` only** — no query mode
  (`infra/providers/VoyageProvider.ts:49`). Adopting `input_type=query` is an
  **improvement** over the old system, not merely parity.
- Canonical ranking was **not** similarity-only: base capability score (50)
  boosted by **`log2(fanIn + 1) * 5`, capped at 20** (`lib/scoring.ts:313`,
  `lib/canonical-issues.ts:206`) — fan-in (importer count) was decisive.
- ANN via **hnswlib** (M=16, efConstruction=200, efSearch=50, cosine, 1024-dim)
  (`lib/ann-index.ts`). Rekon defers ANN; **linear scan remains acceptable for
  v1.**

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| duplicate detection first | deferred | precision risk |
| task-shaped context first | selected | context is safer than judgment |
| canonical recommendations first | deferred | needs deterministic corroboration |
| ranking policy only | rejected/deferred | no consumer to calibrate against |
| ANN/HNSW first | rejected/deferred | linear scan is enough for v1 |

- **Option A — duplicate detection first.** Deferred. A duplicate detector
  emits `duplicate-candidate` judgments; it needs precision thresholds and
  false-positive controls, and a bad detector erodes trust fast.
- **Option B — task-shaped context first.** Selected. Retrieval results are
  visibly contextual; a false positive is usually just extra context, easy for an
  operator or agent to ignore. It exercises ranking usefulness without turning
  similarity into recommendations.
- **Option C — canonical recommendations first.** Deferred. codebase-intel
  proves canonical ranking needs fan-in / ownership / runtime signals, not
  similarity alone.
- **Option D — ranking policy only, no consumer.** Rejected/deferred. Policy
  without a consumer is under-constrained — there is nothing to calibrate against.
- **Option E — ANN/HNSW first.** Rejected/deferred. Linear cosine scan is fine
  at v1 corpus scale and for quality shaping.

## Recommendation

**Option B — formalize retrieval ranking policy first, then use retrieval for
task-shaped context.** Pin thresholds, top-k, and the input-type split now;
implement them in the next slice; then build task-shaped context as the first
consumer. Duplicate detection and canonical recommendations remain deferred until
retrieval precision is corroborated by deterministic evidence.

## Ranking Policy

Score bands, calibrated against the live results (Voyage strong matches
~0.75–0.81; off-target ~0.64–0.67; graph max confidence 0.9187) and the existing
graph floor of 0.5:

| Score Band | Meaning | Default Use |
| --- | --- | --- |
| >= 0.78 | strong semantic neighbor | include |
| 0.65–0.78 | useful contextual neighbor | include for context |
| 0.50–0.65 | weak / needs-review neighbor | optional/supporting only |
| < 0.50 | ignore by default | excluded |

**Similarity thresholds are policy, not proof.** They are provisional and should
be re-tuned against a larger dogfood corpus; they describe how much weight a
neighbor's similarity carries, never whether a claim is true.

Top-k policy:

- **default top-k = 8** (down from the current uncapped 10 — a tighter, more
  contextual default).
- **max default top-k = 20** (a cap that keeps the linear cosine scan cheap;
  callers may request fewer, never more by default).

Per-surface policy (which bands each consumer may use):

| Surface | Retrieval Policy |
| --- | --- |
| task-shaped context | strong + useful neighbors |
| duplicate candidates | strong + deterministic corroboration |
| canonical recommendations | strong + fan-in/ownership/runtime corroboration |
| plan/intent context | context only, not proof |

The existing graph `duplicate_candidate` predicate (0.95) is intentionally
stricter than the 0.78 "strong" band: duplicate-candidate is a separate, stricter
gate and additionally requires deterministic corroboration before it can drive a
product surface.

## Query And Document Input Types

| Operation | Input Type |
| --- | --- |
| indexing chunks | document |
| embedding query text | query |
| mock provider | deterministic local equivalent |

**Query embeddings should use input_type=query.** **Index embeddings should use
input_type=document.** The Voyage adapter already accepts an
`inputType: "document" | "query"` option, so the implementation follow-up is to
have the CLI query path build/select a provider configured with
`inputType: "query"` while indexing keeps `inputType: "document"`. If a future
provider needs per-call control, add a per-call `inputType` to the embedding
provider input in the implementation slice. The mock provider stays a
deterministic local equivalent so the committed, keyless test suite is unaffected.

## Explanation Model

Every retrieval result must be explainable. A result should carry:

- chunk id, chunk kind, path, and symbol id (if any);
- score and **score band** (strong / useful / weak / ignored);
- provider, model, and policy version;
- a short "why this result exists" rationale;
- a source-text excerpt or derived-chunk-text preview;
- staleness / policy status.

CLI JSON output should preserve enough of this for downstream consumers; human
output stays compact, e.g.:

```text
0.81  strong  src/users/get-user.ts  capability:get:user
```

**Graph-first interpretation:** the explanation model must describe how a result
becomes graph evidence (`embedding_similarity` evidence + `embedding` inference
claim) or graph-adjacent context — not merely a CLI search row. **Ranking policy
must describe how retrieval results become graph evidence or graph-adjacent
context, not just CLI search output.**

## Staleness And Policy Model

- Stale vectors (chunk text changed since indexing) are **excluded from normal
  retrieval by default**.
- Policy-changed vectors (different policy version) are **excluded by default**.
- The query provider/model must match the index provider/model unless explicitly
  allowed (a 1024-dim Voyage query cannot meaningfully score against mock vectors).
- When stale or policy-changed records are encountered, retrieval **warns and
  skips** — it never silently uses a stale neighbor.

## First Consumer

**Task-shaped context is the first selected consumer.** It tolerates
lower-confidence neighbors: a false positive in context is usually just extra
context an operator or agent can ignore, whereas a false positive in duplicate
detection or canonical recommendation is a trust problem. **Duplicate detection
is deferred until stronger precision evidence exists.** **Canonical
recommendations are deferred until similarity is combined with deterministic
ownership/fan-in/runtime evidence** — exactly the composition codebase-intel
relied on (base score + `log2(fanIn+1)*5`).

## Boundary Model

| Boundary | Decision |
| --- | --- |
| retrieval vs proof | proposal/context |
| retrieval vs approval | no approval |
| retrieval vs command execution | no execution |
| retrieval vs source writes | no writes |
| retrieval vs Circe | not run |
| thresholds | policy, not proof |
| graph substrate | CapabilityEvidenceGraph remains central |
| intent:go | deferred |

The boundary statements this decision pins, verbatim:

- **Embedding retrieval is proposal/context, not proof.**
- **Embedding retrieval must not approve plans.**
- **Embedding retrieval must not execute commands.**
- **Embedding retrieval must not write source files.**
- **Embedding retrieval must not run Circe.**
- **Similarity thresholds are policy, not proof.**
- **Query embeddings should use input_type=query.**
- **Index embeddings should use input_type=document.**
- **Task-shaped context is the first selected consumer.**
- **Duplicate detection is deferred until stronger precision evidence exists.**
- **Canonical recommendations are deferred until similarity is combined with
  deterministic ownership/fan-in/runtime evidence.**
- **Linear scan remains acceptable for v1.**
- **CapabilityEvidenceGraph remains the evidence substrate.**
- **Ranking policy must describe how retrieval results become graph evidence or
  graph-adjacent context, not just CLI search output.**
- **intent:go remains deferred.**

## What This Does Not Do

- It does not implement the ranking changes, thresholds, or top-k policy.
- It does not change Voyage adapter behavior or implement `input_type=query`.
- It does not implement task-shaped context, duplicate detection, or canonical
  recommendations.
- It does not add ANN/HNSW; **linear scan remains acceptable for v1.**
- It does not add OpenAI embeddings or auto-run embeddings during scan.
- It does not store raw vectors as canonical artifacts.
- It does not approve plans, execute commands, write source files, create a
  WorkOrder or VerificationPlan, or run Circe. **intent:go remains deferred.**
- It does not publish to npm, bump versions, or create a branch.

## Implementation Sequence

1. **Embedding Query Input-Type / Ranking Policy Implementation** — Voyage query
   path uses `input_type=query`; indexed chunks keep `input_type=document`;
   default top-k = 8 and max default top-k = 20; score-band labels in CLI
   JSON/human output; retrieval explanation fields; stale/policy filtering
   behavior. No duplicate detection, no canonical recommendations, no task-shaped
   context implementation, no source writes, no command execution, no intent:go.
2. **Task-Shaped Context / Embedding Retrieval Decision** — define the first
   product consumer for retrieval after ranking policy is implemented.
3. Later, gated on precision evidence: duplicate-candidate detection (strong band
   + deterministic corroboration), then canonical recommendations (strong band +
   fan-in/ownership/runtime corroboration).

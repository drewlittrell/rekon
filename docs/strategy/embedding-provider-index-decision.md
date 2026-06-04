# Embedding Provider / Index Decision

> **Dogfooded (slice 161):** retrieval + graph embedding-similarity ranked by
> domain on a realistic fixture; live Voyage dogfood recommended before duplicate
> detection / canonical recommendations / task-shaped context. See
> [Embedding Retrieval / Graph Dogfood Review](./embedding-retrieval-graph-dogfood-review.md).

> **Safety-reviewed (slice 160):** the shipped implementation was found
> **safe/stable** — see [Embedding Provider / Index Safety Review](./embedding-provider-index-safety-review.md).
> Next: Embedding Retrieval / Graph Dogfood Review.

> **Shipped (slice 159):** this decision is now implemented — see
> [Embedding Provider / Index v1](./embedding-provider-index-v1.md) and the
> [concept](../concepts/embedding-provider-index.md). Voyage is the first real
> embedding provider; embeddings enter `CapabilityEvidenceGraph` as
> `embedding_similarity` evidence; raw vectors are cache/index data, not proof.

Status: decided (slice 158). Base `5cca5d5`. Strategy / architecture
decision-only batch; no runtime behavior changes, no source changes, no
embedding implementation. Starts Rekon's embeddings track as the next evidence
source after `CapabilityEvidenceGraph` and the semantic-file-understanding
integration. Follows
[Capability Evidence Graph v1](./capability-evidence-graph-v1.md), the
[Semantic File Understanding → Evidence Graph Integration](./semantic-file-understanding-evidence-graph-integration-implementation.md),
and its [Safety Review](./semantic-file-understanding-evidence-graph-integration-safety-review.md).

## Decision Summary

**Adopt Option B — an embedding provider + cache/index layer that enters
`CapabilityEvidenceGraph` as `embedding_similarity` evidence.** Embeddings become
a graph evidence source, not the graph itself and not a parallel retrieval
store. Raw vectors live in a regenerable cache/index keyed by chunk identity,
source hash, provider, model, dimensions, and policy version; the graph receives
`embedding_similarity` evidence and `embedding` inference claims that reference
chunk ids, similarity scores, provider/model, and source hashes. Raw vectors are
never proof artifacts.

Answers to the decision questions:

1. **Implement embeddings now?** Yes — `CapabilityEvidenceGraph` and the kernel
   `embedding_similarity` evidence / `embedding` claim sources already exist, so
   embeddings can attach as explainable evidence rather than a black box. This
   decision pins the model; implementation is the next slice.
2. **First provider?** A mock provider (for tests) plus **one real provider:
   Voyage**.
3. **OpenAI, Voyage, or both first?** **Voyage first** (`voyage-code-3`); OpenAI
   embeddings are a documented second provider behind the same interface. Not
   both in the first implementation slice.
4. **Extend `@rekon/llm-provider` routing?** Yes — embeddings route through the
   existing embedding-provider surface in `@rekon/llm-provider`, parallel to (not
   merged with) completion routing.
5. **Use the existing `RekonEmbeddingProvider` interface?** Yes — it already
   exists (`embed(input): Promise<RekonEmbeddingProviderResult>`, tasks
   `code.embedding` / `plan.similarity` / `artifact.retrieval`), with
   `createMockEmbeddingProvider` shipped. Extend additively only if a real need
   appears.
6. **What is embedded?** Derived text for typed chunks — never raw whole files as
   the primary artifact.
7. **Whole files?** No, not as the primary unit. The old system embedded
   whole-file summaries; Rekon goes finer for symbol-level explainability.
8. **Chunk types?** `file_summary`, `symbol_summary`, `capability_text`,
   `doc_section`, `comment_block`, `signature`, `structural_feature_bag`.
9. **Chunk identity?** `EmbeddingChunkRef` = id + kind + path + optional
   symbolId/lineStart/lineEnd + `sha256`.
10. **Source hashes / staleness?** A chunk's embedding is keyed by its `sha256`;
    a hash change, provider/model change, dimension change, or policy-version
    change makes the embedding stale.
11. **Where are vectors stored?** `.rekon/cache/embeddings/` (cache/index).
12. **Canonical or cache?** Cache/index data — regenerable, never canonical proof.
13. **How does `embedding_similarity` enter the graph?** As evidence rows
    (`source: embedding_similarity`) plus `embedding` inference claims referencing
    chunk ids, scores, provider/model, and source hash — opt-in, mirroring the
    slice-156 semantic-report integration.
14. **Retrieval as proposal/context?** Retrieval returns nearest chunk refs,
    scores, provider/model, index version, source hashes, and explanation fields;
    it is proposal/context, never proof.
15. **Duplicate detection?** Neighbor evidence — similar symbols/capabilities
    surfaced as candidates, never auto-merged.
16. **Task-shaped context?** Top-K relevant chunks retrieved for an intent/task
    as candidate context.
17. **Semantic plan/intent work?** Fuzzy candidate file/symbol matching for
    intent assessment and plan grounding — still proposal/context, gated.
18. **Privacy policy?** No provider calls by default; embedding is
    explicit/configured; derived summaries are embedded, not raw source, and
    source-text handling is explicit.
19. **CLI commands?** `rekon embeddings index [--changed|--all] [--provider <id>]
    [--model <model>]` and `rekon embeddings query --text "<query>"`, with graph
    integration as an opt-in flag on `rekon capability graph build`.
20. **Next slice?** **Embedding Provider / Index v1.**

## Why This Decision Exists

Rekon now has deterministic facts, semantic file understanding, and a central
`CapabilityEvidenceGraph` that already carries LLM-derived inference evidence.
The old codebase-intel system used embeddings and approximate-nearest-neighbor
similarity to power duplicate detection, canonical recommendation, context
selection, and fuzzy retrieval — but as one signal among many, never as truth.
Rekon should add embeddings only after deciding how vectors become *explainable
evidence* in the graph rather than a second, disconnected intelligence store.
This memo pins that model before any code lands.

## Current Evidence Graph Substrate

`CapabilityEvidenceGraph` (kernel) is `{ schemaVersion, header, status, nodes,
evidence, claims, capabilities, summary, boundaries }`. Its evidence `source`
enum already includes `embedding_similarity`, and its claim `source` enum
already includes `embedding` — so embeddings need **no kernel type change** to
enter the graph, exactly as `llm_extraction` / `llm` needed none for the
semantic integration. `@rekon/llm-provider` already exposes a
`RekonEmbeddingProvider` interface (`embed()`, tasks `code.embedding` /
`plan.similarity` / `artifact.retrieval`) and a `createMockEmbeddingProvider`.
The slice-156 `--semantic-file-reports` integration is the template: opt-in,
inference-not-fact, deterministic facts authoritative.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| index outside graph | rejected | parallel black-box retrieval |
| embeddings as graph evidence | selected | explainable evidence source |
| whole-file embeddings only | rejected/deferred | noisy and too coarse |
| structural vectors only | rejected/deferred | misses semantic similarity |
| default scan embedding | rejected | privacy/cost surprise |

Option A (index outside the graph) repeats the old parallel-output drift and
risks black-box retrieval. Option B (embeddings as graph evidence) keeps
embeddings explainable, secondary, and connected to deterministic/semantic
evidence — selected. Option C (whole-file only) hides symbol/chunk-level
evidence — the old system embedded whole-file summaries, and Rekon improves on
that by going to chunk granularity. Option D (structural vectors only) is useful
but misses fuzzy semantic similarity; in Rekon the deterministic/structural
signal already lives in graph facts, so embeddings focus on the semantic gap.
Option E (embed during scan by default) is a surprising provider call, cost, and
privacy risk — rejected.

## Recommendation

Adopt **Option B**. Implement the embedding-provider surface with a **mock
provider first** (deterministic tests) plus **one real provider, Voyage**. Embed
typed chunks of *derived* text; store raw vectors in `.rekon/cache/embeddings/`
as regenerable cache/index; emit `embedding_similarity` evidence and `embedding`
inference claims into `CapabilityEvidenceGraph` referencing chunk ids, similarity
scores, provider/model, and source hashes. Retrieval is proposal/context, never
proof. No provider call happens by default.

## Provider Decision

| Provider | Decision | Reason |
| --- | --- | --- |
| mock | required | deterministic tests |
| Voyage | selected (first) | old-code parity / code retrieval strength |
| OpenAI | deferred (second) | operational simplicity |

**Voyage is the first real provider.** The old codebase-intel system used
Voyage `voyage-code-3` (1024 dimensions, gated on `VOYAGE_API_KEY`), a model
purpose-built for code retrieval, which is exactly Rekon's use case (duplicate
detection, canonical candidates, code-neighbor discovery). Choosing Voyage
maximizes parity with the proven old system and reuses the available
`VOYAGE_API_KEY`. OpenAI embeddings remain a supported **second** provider behind
the same `RekonEmbeddingProvider` interface for operational simplicity, but are
not implemented in the first slice. The mock provider lands first regardless, so
the entire pipeline (chunking → index → staleness → graph evidence) is testable
without any live provider call.

## Chunk Model

The unit of embedding is a typed chunk of *derived* text, not raw whole files.
Chunk kinds:

```text
file_summary
symbol_summary
capability_text
doc_section
comment_block
signature
structural_feature_bag
```

Chunk identity:

```ts
type EmbeddingChunkRef = {
  id: string;
  kind:
    | "file_summary"
    | "symbol_summary"
    | "capability_text"
    | "doc_section"
    | "comment_block"
    | "signature"
    | "structural_feature_bag";
  path: string;
  symbolId?: string;
  lineStart?: number;
  lineEnd?: number;
  sha256: string;
};
```

This improves on the old whole-file `(path, summaryHash)` identity: symbol- and
capability-level chunks make the resulting similarity evidence point at a
specific exported symbol or capability node in the graph, not just a file. The
`structural_feature_bag` chunk preserves the old deterministic feature-bag idea
(capabilities / patterns / layer / role as a sparse vector) as one optional kind,
but the primary value is semantic neighbor evidence — the deterministic
structural signal already lives in graph facts.

## Storage And Index Model

| Item | Decision |
| --- | --- |
| raw vectors | cache/index |
| graph evidence | artifact-level evidence / claims |
| chunk identity | path + symbol/range + sha |
| invalidation | source hash + provider/model + policy |
| stale vectors | never silent |

Raw vectors and the ANN index are **cache/index data** under
`.rekon/cache/embeddings/`, regenerable from source — never canonical proof
artifacts (mirroring the old `embeddings.json` cache posture). The index key is:

```text
chunk id + chunk sha256 + provider + model + embedding dimensions + policy version
```

`CapabilityEvidenceGraph` receives `embedding_similarity` evidence and
`embedding` inference claims that reference chunk ids, similarity scores,
provider/model, and source hashes — those graph rows are the artifact-level,
explainable surface; the vectors behind them are not. ANN implementation
(exact-cosine for small repos, HNSW-style approximate index for larger ones, as
the old system used hnswlib-node with cosine space) is an implementation detail
deferred to the v1 slice, not pinned here.

## Retrieval Model

Embedding retrieval outputs:

```text
- nearest chunk refs;
- similarity scores;
- provider/model;
- index version;
- source hashes;
- explanation fields tying similarity back to chunks / summaries / symbols.
```

Retrieval output is **proposal/context, not proof**. Use cases:

| Use Case | Embedding Role |
| --- | --- |
| duplicate detection | neighbor evidence |
| canonical candidates | similarity signal |
| task-shaped context | retrieve relevant chunks |
| intent file matching | fuzzy candidate context |
| ownership anomaly | neighbor disagreement signal |

These mirror the old system's use cases (duplicate detection with a similarity
floor, canonical scoring as a secondary signal, top-K context retrieval, label /
ownership anomaly via neighbor disagreement) but every output is an explainable
graph claim, never an automatic action.

## Staleness Model

A chunk embedding is stale when any of the following changes:

```text
If source chunk sha changes, embedding is stale.
If provider/model changes, embedding is stale or policy-changed.
If chunking policy changes, embedding is stale.
If the semantic file summary used as embedding text changes, embedding is stale.
```

No stale embedding is used silently. This matches the old model-version +
per-file `summaryHash` invalidation, extended to the richer chunk + provider +
model + dimensions + policy key. Stale entries are re-embedded on the next
explicit `index` run or surfaced as a warning / needs-review claim — never
consumed as if fresh.

## Privacy And Opt-In Model

Required posture:

```text
No embedding provider calls by default.
Embedding generation is explicit/configured.
Source text privacy must be explicit.
```

Like the old system, Rekon embeds **derived summaries** (semantic-file-understanding
summaries, symbol signatures, capability text, doc sections) rather than raw
source by default — the old system sent only a formatted analysis summary
(path / system / layer / role / capabilities / patterns / exports), never raw
code. Embedding runs only on explicit `rekon embeddings index` (or a configured
policy), gated on a configured provider key; a missing key means no provider call
and no silent fallback that pretends embeddings exist. Sending raw source text to
a provider, if ever offered, is a separate explicit opt-in.

## Graph Integration Model

Embeddings enter `CapabilityEvidenceGraph` exactly as the semantic reports do —
opt-in, behind a flag — so the default `capability graph build` stays
deterministic-only. The preferred CLI shape:

```bash
rekon embeddings index --changed
rekon embeddings index --all --provider voyage --model voyage-code-3
rekon embeddings query --text "find SMS routing logic"
```

Graph integration is then an opt-in flag on the existing build command
(mirroring `--semantic-file-reports`), e.g. a future `rekon capability graph
build --embedding-neighbors latest`, which adds `embedding_similarity` evidence
and `embedding` inference claims to the graph. Deterministic facts remain
stronger than embedding similarity; a neighbor never overwrites a fact.

## Boundary Model

The pinned boundary statements:

- Embedding similarity is proposal/context, not proof.
- Embeddings must not approve plans.
- Embeddings must not execute commands.
- Embeddings must not write source files.
- Embeddings must not run Circe.
- Embedding provider calls are explicit or configured, never surprising defaults.
- Raw vectors are cache/index data, not canonical proof artifacts.
- No stale embedding is used silently.
- CapabilityEvidenceGraph remains the evidence substrate.
- Deterministic facts remain stronger than embedding similarity.
- intent:go remains deferred.

| Boundary | Decision |
| --- | --- |
| embedding vs proof | proposal/context |
| embedding vs approval | no approval |
| embedding vs command execution | no execution |
| embedding vs source writes | no writes |
| embedding vs Circe | not run |
| raw vector storage | cache/index |
| stale vectors | not silent |
| intent:go | deferred |

## What This Does Not Do

This batch is decision-only. It does not implement embedding providers, add
provider packages, add vector storage, add an ANN / HNSW implementation, generate
embeddings, call a live embedding provider, change scan behavior, change
`CapabilityEvidenceGraph`, change `SemanticFileUnderstandingReport`, execute
commands, write source files, approve plans, create a WorkOrder or
VerificationPlan, run Circe, or implement intent:go. It does not publish to npm
or bump versions.

## Implementation Sequence

1. **Embedding Provider / Index v1** — implement the selected Voyage adapter, a
   mock provider for tests, the chunk model, the `.rekon/cache/embeddings/`
   index, stale detection, `embedding_similarity` graph evidence output, and a
   retrieval command. Still no approval, no command execution, no source writes,
   no intent:go.
2. **Safety review** of that implementation.
3. Later: OpenAI embeddings as a second provider; richer ANN for large repos;
   embedding-backed duplicate / canonical / context surfaces — each as
   explainable graph evidence.

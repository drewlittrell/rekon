# Capability Evidence Graph

> **Retrieval ranking implemented (slice 164):** the `embeddings query` ranking
> policy shipped (input_type=query, top-k 8/20, score bands); graph
> embedding-similarity is unchanged and stays graph-first with `generatedEmbeddings`
> / `usedLlm` false. See
> [Embedding Query Input-Type / Ranking Policy Implementation](../strategy/embedding-query-input-type-ranking-policy-implementation.md).

> **Retrieval ranking decided (slice 163):** embedding retrieval ranking policy is
> pinned and stays graph-first — results become `embedding_similarity` evidence or
> graph-adjacent context, never a standalone vector-search product. See
> [Embedding Retrieval / Similarity Ranking Decision](../strategy/embedding-retrieval-similarity-ranking-decision.md).

> **Live Voyage embedding integration dogfooded (slice 162):** `--embedding-similarity
> latest` was exercised over a **real Voyage** (`voyage-code-3`, 1024-dim) cache —
> it emitted 31 explainable `embedding_similarity` evidence rows + 154 `embedding`
> inference claims (max confidence 0.9187 < 1.0, real neighbor scores) while
> `generatedEmbeddings` / `usedLlm` stayed false; deterministic facts remain
> stronger than embedding similarity. See
> [Live Voyage Embedding Dogfood](../strategy/live-voyage-embedding-dogfood.md).

> **Embedding integration dogfooded (slice 161):** `--embedding-similarity latest`
> was exercised on a realistic fixture and emitted explainable
> `embedding_similarity` evidence + `embedding` inference claims while
> `generatedEmbeddings` / `usedLlm` stayed false. See
> [Embedding Retrieval / Graph Dogfood Review](../strategy/embedding-retrieval-graph-dogfood-review.md).

> **Embedding integration safety-reviewed (slice 160):** the embedding evidence
> path was found **safe/stable** — embedding claims are inference, not facts;
> deterministic facts remain stronger; the builder generates no embeddings. See
> [Embedding Provider / Index Safety Review](../strategy/embedding-provider-index-safety-review.md).

> **Embeddings evidence shipped (slice 159):** `embedding_similarity` evidence
> and `embedding` claims now enter the graph via
> [Embedding Provider / Index v1](../strategy/embedding-provider-index-v1.md)
> (`rekon capability graph build --embedding-similarity latest`, reading the
> `.rekon/cache/embeddings` cache). The builder generates no embeddings, so every
> boundary stays false; similarity is proposal/context, never proof. See the
> [Embedding Provider / Index concept](./embedding-provider-index.md).

> **Embeddings track started (slice 158):** the
> [Embedding Provider / Index Decision](../strategy/embedding-provider-index-decision.md)
> starts embeddings as the next graph evidence source — Voyage-first, entering as
> `embedding_similarity` evidence; raw vectors are regenerable cache/index, never
> canonical; retrieval is proposal/context, not proof; deterministic facts stay
> stronger than similarity; no provider call by default.

> **Semantic → Evidence Graph integration safety-reviewed (slice 157):** the
> slice-156 integration was ground-reviewed and found **safe/stable** — opt-in,
> inference-not-fact, deterministic facts win, stale never silent, `usedLlm`
> stays false. See
> [`../strategy/semantic-file-understanding-evidence-graph-integration-safety-review.md`](../strategy/semantic-file-understanding-evidence-graph-integration-safety-review.md).

> **Semantic → Evidence Graph integration implemented (slice 156):** `rekon
> capability graph build --semantic-file-reports latest` /
> `--semantic-file-report-ref <ref>` now folds `SemanticFileUnderstandingReport`
> content into the graph as `llm_extraction` evidence and `llm` / `inference`
> claims (opt-in; the default build stays deterministic-only; deterministic
> facts win; stale reports are surfaced, never silent; `usedLlm` stays false).
> See
> [`../strategy/semantic-file-understanding-evidence-graph-integration-implementation.md`](../strategy/semantic-file-understanding-evidence-graph-integration-implementation.md).

> **Semantic → Evidence Graph integration decided (slice 155):** how
> `SemanticFileUnderstandingReport` becomes graph evidence is decided —
> Option B (explicit, opt-in). LLM file understanding will enter as
> `llm_extraction` evidence and `llm` / `inference` claims; the default build
> stays deterministic-only; deterministic facts win. See
> [`../strategy/semantic-file-understanding-evidence-graph-integration-decision.md`](../strategy/semantic-file-understanding-evidence-graph-integration-decision.md).

> **Safety-reviewed (slice 154):** v1 is **safe/stable** — evidence-backed context,
> not proof; deterministic facts are the only source; all nine boundaries are
> validator-enforced. See
> [`../strategy/capability-evidence-graph-safety-review.md`](../strategy/capability-evidence-graph-safety-review.md).

The **CapabilityEvidenceGraph** is Rekon's substrate for semantic
codebase intelligence. It unifies what Rekon already knows — files,
symbols, imports, and `verb:noun` capabilities — into a single graph
where every claim is backed by evidence and carries a confidence and a
source.

It is the architecture decided in
[capability-evidence-graph-semantic-intelligence-decision.md](../strategy/capability-evidence-graph-semantic-intelligence-decision.md):
embeddings, LLM parsing, and retrieval are **not** standalone features.
They are future *evidence sources* that attach to this graph. v1 ships
the graph and its deterministic substrate; later slices layer richer
evidence on top without changing the shape.

## The core idea

The CapabilityEvidenceGraph is evidence-backed context, not proof by
itself. It tells an agent *what the code appears to do and why we think
so* — it does not approve work, gate a merge, or stand in for a
VerificationResult. Proof in Rekon still comes from the verification
spine; the graph only makes the reasoning that precedes proof legible.

Three principles hold the model together:

1. **Deterministic facts are the substrate.** Imports and exported
   symbols are read directly from source with no model in the loop.
   They are recorded as `fact` claims at confidence `1.0`. Everything
   else is layered on top of these facts and can be re-derived from
   them.
2. **LLM and embedding outputs are evidence-backed inferences**, never
   facts. When later slices add a model, its output becomes an
   `inference` (or `recommendation`) claim with a bounded confidence
   and an evidence reference — it is a *proposal* about the code, not a
   new ground truth. The deterministic substrate stays authoritative.
3. **verb:noun remains shorthand, not the whole capability model.** A
   capability node still has a `verb` and a `noun`, but it is richer
   than that pair: it tracks the symbols that implement it, its
   entrypoints, side effects, dependencies, consumers, a confidence,
   and the evidence behind it. The phrase is a label; the node is the
   model.

## Nodes

The graph has three node kinds in v1:

| Kind         | Example                       | Meaning                                   |
| ------------ | ----------------------------- | ----------------------------------------- |
| `file`       | `src/orders/index.ts`         | A scanned source file.                    |
| `symbol`     | `src/orders/index.ts#createOrder` | An exported function, class, or const. |
| `capability` | `cap:create:order`            | A `verb:noun` capability, richly modeled. |

**Files remain containers** — a file groups the symbols it exposes and
the modules it imports, exactly as it always has. What changes in this
model is the symbol: **symbols are first-class intelligence nodes**.
Each exported symbol is its own node that claims can point at, that
capabilities can be implemented by, and that future evidence sources
(embeddings, LLM summaries, runtime traces) can annotate. The unit of
intelligence moves from the file down to the symbol.

## Claims and evidence

Every relationship in the graph is a **claim**:

- `imports` — a file imports a module (fact).
- `exposes` — a file exposes a symbol (fact).
- `implements` — a symbol implements a capability (inference).

A claim records its `claimType` (`fact` / `inference` /
`recommendation`), its `source` (`deterministic` / `llm` / `embedding`
/ `runtime` / `human` / `ontology`), a `confidence` in `[0, 1]`, a
`status` (`accepted` / `conflicted` / `rejected` / `needs-review`), and
one or more `evidenceRefs`. Each **evidence** entry points at a concrete
location — a file, a line, an excerpt — and names the source that
produced it. In v1 every evidence row is a `deterministic_scan`.

This is what lets the graph carry model output safely later: a
low-confidence LLM inference and a confident deterministic fact live in
the same structure, each clearly labeled, each traceable to where it
came from.

## Boundaries (v1)

The v1 builder is pure and deterministic. The artifact factory forces
every boundary boolean false, and the validator rejects any artifact
whose boundaries are not all false:

- **No LLM is used in v1.**
- **No embeddings are generated in v1.**
- **Semantic intelligence must not execute commands.**
- **Semantic intelligence must not write source files.**
- It does not create a PreparedIntentPlan.
- It does not create a WorkOrder.
- It does not create a VerificationPlan.
- It does not run Circe.
- **intent:go remains deferred.**

These boundaries are the contract that lets the graph grow without
becoming dangerous. Adding an evidence source must never turn the graph
into an actor: it reads, it records, it proposes — it never writes
source, runs commands, or claims authority it has not earned.

## How it is built

`rekon capability graph build` walks a conservative set of source files
(`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`; excluding
`node_modules`, `dist`, `build`, lockfiles, and oversized or binary
files), extracts imports and exported symbols, derives conservative
`verb:noun` capabilities from exported names, and writes one
CapabilityEvidenceGraph artifact under the `graphs` category. It reads
source; it never modifies it.

See the [artifact reference](../artifacts/capability-evidence-graph.md)
for the full shape and the
[v1 strategy memo](../strategy/capability-evidence-graph-v1.md) for the
roadmap of evidence sources that attach next.

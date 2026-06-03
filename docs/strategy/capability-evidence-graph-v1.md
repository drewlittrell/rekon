# Capability Evidence Graph v1

**Status:** shipped (v1) · **Track:** semantic intelligence ·
**Decision of record:**
[capability-evidence-graph-semantic-intelligence-decision.md](./capability-evidence-graph-semantic-intelligence-decision.md)

This memo records what the first slice of the CapabilityEvidenceGraph
ships, why it ships exactly this much, and what attaches next. It is the
build that follows the architecture decision: embeddings and LLM parsing
are not standalone features — they are evidence sources that hang off
this graph.

## Why a graph first

Rekon already had the pieces of semantic intelligence scattered across
artifacts: `EvidenceGraph` facts, `CapabilityMap` `verb:noun`
capabilities with `evidenceRefs`, `RuntimeGraphObservationReport`, and
LLM/embedding tasks that were routed but unused. Shipping "Embedding
Index v1" as a standalone feature would have bolted a second,
disconnected intelligence store onto the side of the system.

Instead, v1 defines the **shape that all of it shares**. A single graph
with evidence-backed claims gives every future signal — a deterministic
scan today, an embedding neighbor or an LLM summary tomorrow — one place
to live and one way to be trusted or doubted.

## What v1 ships

- A new `CapabilityEvidenceGraph` kernel artifact (types, factory,
  validator, schema), registered in the SDK and runtime under the
  `graphs` category.
- A pure, deterministic builder `buildCapabilityEvidenceGraph` in
  `@rekon/capability-model`.
- A `rekon capability graph build` CLI command.
- File nodes, symbol nodes, and `verb:noun` capability nodes; `imports`
  and `exposes` facts at confidence `1.0`; conservative `implements`
  capability inferences at confidence `<= 0.5`; one `deterministic_scan`
  evidence row per extracted fact.

### The substrate

**Deterministic facts are the substrate.** v1 reads imports and exported
symbols straight from source — no model, no network — and records them
as `fact` claims. This is the floor the rest of the system builds on,
and it is the part that must never regress: later evidence sources are
*added to* these facts, never substituted for them.

### The model

**Files remain containers** and **symbols are first-class intelligence
nodes.** The unit of intelligence moves from the file to the exported
symbol, which becomes the anchor that claims, capabilities, and future
annotations attach to. And **verb:noun remains shorthand, not the whole
capability model**: a capability node carries its implementing symbols,
entrypoints, side effects, dependencies, consumers, confidence, and
evidence — the phrase is just its label.

## What attaches next (and how)

The graph is built so that **LLM and embedding outputs are
evidence-backed inferences**, not new ground truth. Each future source
becomes a claim with a bounded confidence, a `source` tag, and an
evidence reference:

| Evidence source       | Adds                                            | Claim type            |
| --------------------- | ----------------------------------------------- | --------------------- |
| Embedding index       | symbol/capability neighbors, similarity edges   | `inference`           |
| LLM file understanding| richer capability descriptions, intent summaries| `inference`           |
| Runtime observation   | observed call edges, hot paths                  | `inference` / `fact`  |
| Human / ontology      | confirmations, renames, canon                   | `accepted` / `human`  |

None of these change the artifact shape. They populate more of it.

## Boundaries

The whole point of a shared substrate is that it must be safe to grow.
The factory forces every boundary boolean `false` and the validator
rejects any artifact that is not all-`false`:

- **No LLM is used in v1.**
- **No embeddings are generated in v1.**
- **Semantic intelligence must not execute commands.**
- **Semantic intelligence must not write source files.**
- It does not create a PreparedIntentPlan.
- It does not create a WorkOrder.
- It does not create a VerificationPlan.
- It does not run Circe.
- **intent:go remains deferred.**

The CapabilityEvidenceGraph is evidence-backed context, not proof by
itself. It informs the agent that prepares work; it never approves work,
gates a merge, or substitutes for the verification spine. Proof stays
where it is.

## Deferred

- Embedding generation and an embedding-backed index.
- LLM-derived inferences and any provider call.
- Retrieval / similarity query surfaces.
- Integration with the SemanticFileUnderstandingReport as an evidence
  source (kept separate in v1).
- Any source write, command execution, plan/work-order/verification
  creation, Circe run, or `intent:go`.

## Next step

**Capability Evidence Graph Safety Review** — *done (slice 154).* The shipped
substrate was re-read end-to-end against committed source and found
**safe/stable**: the boundaries hold, the deterministic floor is authoritative,
and the shape is ready to carry model-derived evidence without inheriting
model-derived authority. See
[`capability-evidence-graph-safety-review.md`](./capability-evidence-graph-safety-review.md).

The **Semantic File Understanding → Evidence Graph Integration Decision**
(*done, slice 155*) selected Option B (explicit, opt-in), and the
**Implementation** is now *done (slice 156)*: `rekon capability graph build
--semantic-file-reports latest` / `--semantic-file-report-ref <ref>` add
semantic content as `llm_extraction` evidence and `llm` / `inference` claims,
still as context and not proof, with deterministic facts authoritative. That
integration was **safety-reviewed and found safe/stable** (*slice 157*).
Embeddings follow on a separate track. See
[`semantic-file-understanding-evidence-graph-integration-decision.md`](./semantic-file-understanding-evidence-graph-integration-decision.md)
and
[`semantic-file-understanding-evidence-graph-integration-implementation.md`](./semantic-file-understanding-evidence-graph-integration-implementation.md).

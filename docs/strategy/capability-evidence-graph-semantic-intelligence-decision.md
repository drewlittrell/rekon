# Capability Evidence Graph / Semantic Intelligence Architecture Decision

Status: decided (slice 152). Base `bc5fb92`. Strategy/architecture decision-only
batch; no runtime behavior changes, no source. Supersedes a narrow "Embeddings
Parity Audit / Embedding Index Decision" as the immediate next step.

> **Embeddings track started (slice 158):** the
> [Embedding Provider / Index Decision](./embedding-provider-index-decision.md)
> starts embeddings as the next graph evidence source — Voyage-first, embedded as
> `embedding_similarity` evidence in `CapabilityEvidenceGraph`, raw vectors as
> regenerable cache/index (never canonical), retrieval as proposal/context not
> proof, deterministic facts stronger than similarity, no provider call by
> default.

> **v1 shipped (slice 153):** this architecture is now real. The
> `CapabilityEvidenceGraph` artifact, the pure `buildCapabilityEvidenceGraph`
> builder, and `rekon capability graph build` ship the deterministic substrate —
> file/symbol/capability nodes and evidence-backed `imports`/`exposes`/`implements`
> claims, with all boundary booleans forced false. Embeddings, LLM inference, and
> retrieval remain deferred evidence sources that attach to this graph. See
> [`capability-evidence-graph-v1.md`](./capability-evidence-graph-v1.md),
> [`../artifacts/capability-evidence-graph.md`](../artifacts/capability-evidence-graph.md),
> and [`../concepts/capability-evidence-graph.md`](../concepts/capability-evidence-graph.md).

> **Safety-reviewed (slice 154):** the v1 substrate was re-read end-to-end and
> found **safe/stable** — the deterministic floor is authoritative, model output
> remains deferred and would enter only as evidence-backed inferences, and all
> nine boundaries are validator-enforced. The next slice decides how
> `SemanticFileUnderstandingReport` contributes LLM-derived inference claims into
> the graph. See
> [`capability-evidence-graph-safety-review.md`](./capability-evidence-graph-safety-review.md).

> **Semantic source decided (slice 155):** the first LLM-evidence source is now
> specified. The
> [Semantic File Understanding → Evidence Graph Integration Decision](./semantic-file-understanding-evidence-graph-integration-decision.md)
> selects Option B — `SemanticFileUnderstandingReport` enters as `llm_extraction`
> evidence and `llm` / `inference` claims via an explicit, opt-in flag, with
> deterministic facts authoritative and embeddings still deferred. This realizes
> the "LLM/embedding outputs are evidence-backed inferences" pin from this memo.

## Decision Summary

Selected: **Option B — CapabilityEvidenceGraph-first architecture.** Rekon's next
semantic-intelligence substrate is a **CapabilityEvidenceGraph**: a graph of
evidence-backed claims where deterministic scan facts, semantic file
understanding, ontology labels, capability signals, embedding similarities,
runtime traces, and human overrides all become traceable graph claims. Embeddings
are prioritized, but only as **one** evidence source — embedding similarity is
proposal, not proof. Scan reports, capability maps, duplicate detection, context
bundles, canonical recommendations, ownership warnings, and agent instructions
are **derived** from this substrate rather than built as parallel products. The
following implementation slice is **Capability Evidence Graph v1** (graph refs,
evidence refs, fact/inference claim model, file + symbol + capability nodes,
deterministic facts only — no embeddings yet).

## Why This Decision Exists

Rekon has restored LLM-backed semantic parsing and semantic file understanding,
scan-integrated them, and intent-context-integrated them. Embeddings are the next
obvious priority — but embeddings without an evidence substrate risk a black-box
truth layer that quietly outranks deterministic facts. This decision puts the
architecture first so that embeddings land as one explainable signal among
deterministic facts, LLM interpretation, ontology rules, runtime evidence, and
human overrides. **Deterministic facts are the substrate; LLM and embedding
outputs are evidence-backed inferences.**

This decision is grounded in two surveys (recorded in the review packet): the old
`codebase-intel` system (real source at `/Users/andrewlittrell/Code/codebase-intel`)
and Rekon's current surfaces at `bc5fb92`.

## What The Old System Got Right

The old codebase-intel system already had the right ingredients (concrete sources
in the review packet):

- **Explicit ontology as contract** — versioned YAML (`verb-categories`, `nouns`,
  `patterns`, `layers`, `naming-conventions`) with stable ids and bidirectional
  source tracking.
- **Per-file LLM analysis with a deterministic viability check** —
  `FileAnalysisWithMeta` carried `capabilities[{verb, noun, detail, frame, roles,
  evidence, confidence, source}]`, `analysisSource: llm|deterministic|hybrid`, and
  cost telemetry; an AST viability check skipped the LLM when deterministic
  signals sufficed.
- **Dual embeddings + HNSW** — a deterministic feature-bag vector
  (`feature:`/`capability:`/`pattern:`/layer/role/system) **and** a Voyage
  (`voyage-code-3`) semantic embedding, both indexed with HNSW for nearest-neighbor
  retrieval, runtime-weighted.
- **Multi-source label derivation + anomaly detection** — labels derived from
  path, import graph, features, and neighbor consensus, with LLM-vs-derived
  disagreement surfaced as `labelAnomalies` rather than silently resolved; manual
  overrides applied first.
- **Ground-truth evaluation + symbol context** — per-mode metrics (label accuracy,
  capability precision/recall/F1, cost, duration), a `graph-core` node/edge schema,
  and symbol-level context (`SymbolContext` with callers/callees, `expand --symbol`).

Its blind spot was treating **files as the primary semantic unit** and emitting
many parallel products (labels, canonical scores, similarity, context bundles)
that did not share one claim/evidence/reconciliation model.

## What Rekon Changes

Rekon does **not** rebuild those as parallel products. It makes the
CapabilityEvidenceGraph the canonical substrate and derives everything else from
it. Rekon already has the seeds: `EvidenceFact` / `EvidenceGraph` in
`@rekon/kernel-evidence` (`{ kind, subject, value, confidence, provenance }`),
verb:noun phrase capabilities carrying `evidenceRefs`, a
`RuntimeGraphObservationReport` (nodes/edges with `evidenceRefs`), and routed-but-
unused embedding tasks (`code.embedding`, `plan.similarity`) with a deferred
`RekonEmbeddingProvider`. This decision unifies those into one claim-centric graph
and adds the net-new pieces (`EvidenceClaim`, `GraphRef`, rich `CapabilityNode`,
structural vectors, the `CapabilityEvidenceGraph` artifact) on top of them.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| embedding index first | rejected/deferred | black-box without graph/evidence substrate |
| CapabilityEvidenceGraph first | selected | unifies facts, inferences, ontology, embeddings, overrides |
| literal old-system rebuild | rejected | old ingredients were good but parallel and file-centric |
| semantic reports only | rejected/deferred | no unified claim reconciliation |
| pure deterministic graph | rejected | insufficient semantic understanding |

- **Option A — embedding index first:** build vector storage + retrieval
  immediately. Rejected/deferred — embeddings without evidence graph / claim
  reconciliation risk black-box recommendations.
- **Option B — CapabilityEvidenceGraph first:** build the evidence-graph
  architecture before the embedding index. **Selected** — it unifies deterministic
  facts, LLM interpretation, ontology, embeddings, runtime evidence, and human
  overrides.
- **Option C — literal old-system rebuild:** clone the old per-file analysis /
  labels / embeddings / context outputs. Rejected — good ingredients, but too many
  parallel outputs and too much file-level LLM dependence.
- **Option D — semantic reports only:** keep `SemanticFileUnderstandingReport` and
  `IntentPlanActionabilityReport` without a graph substrate. Rejected/deferred —
  useful but no unified claim/evidence/reconciliation model.
- **Option E — pure deterministic graph:** only deterministic facts, no LLM or
  embeddings. Rejected — too weak for capability interpretation, ownership,
  task-shaped context, and fuzzy duplicate detection.

## Recommended Architecture

An evidence-first capability intelligence system where: ontology is the contract;
deterministic scanners provide facts; LLMs provide semantic interpretation;
embeddings provide fuzzy similarity; reconciliation decides what survives; and
every output is traceable to evidence. The CapabilityEvidenceGraph is the center;
embeddings are one evidence source within it.

## CapabilityEvidenceGraph Model

| Graph Element | Examples |
| --- | --- |
| nodes | file, symbol, capability, system, route, event, db_table, api, pattern, invariant, test, doc |
| edges | imports, calls, exposes, implements, owns, consumes, reads, writes, similar_to, duplicates, tests |
| evidence | ast, import_graph, typechecker, llm_extraction, embedding_similarity, runtime_trace, human_override, ontology_rule |

- **Nodes:** file, symbol, capability, system, route, event, db_table, api,
  pattern, invariant, test, doc, runtime_operation, human_override.
- **Edges:** imports, calls, exposes, implements, owns, consumes, produces, reads,
  writes, routes_to, validates, duplicates, similar_to, bypasses, violates, tests,
  documents, supports, contradicts.
- **Evidence sources:** ast, import_graph, typechecker, runtime_trace,
  llm_extraction, embedding_similarity, human_override, ontology_rule, ground_truth.

Every edge and inference is an `EvidenceClaim`, not a bare fact:

```ts
type EvidenceClaim = {
  id: string;
  subject: GraphRef;
  predicate: string;
  object: GraphRef | string;
  claimType: "fact" | "inference" | "recommendation";
  source: "deterministic" | "llm" | "embedding" | "runtime" | "human" | "ontology";
  confidence: number;
  evidenceRefs: EvidenceRef[];
  status: "accepted" | "conflicted" | "rejected" | "needs-review";
};
```

`EvidenceClaim` generalizes the existing `EvidenceFact` (which already carries
`confidence` + `provenance`): a fact is a claim with `claimType: "fact"` and
`source: "deterministic"`. `GraphRef` and `EvidenceRef` are net-new typed
references; runtime traces reuse the existing `RuntimeGraphObservationReport`
nodes/edges as `source: "runtime"` claims; human overrides become
`human_override` nodes + `source: "human"` claims with explicit reasons.

## Facts And Inferences

| Category | Examples |
| --- | --- |
| facts | paths, imports, exports, symbols, routes, DB reads/writes, tests |
| inferences | system, layer, role, capability, canonical status, duplicate intent, ownership fit |

- **Facts** (deterministic substrate): file path, imports, exports, symbols,
  routes, API calls, DB reads/writes, event emits/subscriptions, schema usage,
  dependency edges, tests, runtime traces.
- **Inferences** (evidence-backed): system, layer, role, capability, canonical
  status, architectural intent, duplicate intent, ownership fit, risk score,
  recommended action.

**Deterministic facts are the substrate; LLM and embedding outputs are
evidence-backed inferences.** A `fact` claim outranks an `inference` claim of equal
or lower confidence during reconciliation; an inference never overwrites a fact.

## Rich Capability Model

Capabilities become first-class graph nodes, not just verb:noun phrase pairs:

```ts
type CapabilityNode = {
  id: string;
  verb: string;
  noun: string;
  objectType?: string;
  ownerSystem?: string;
  implementedBy: GraphRef[];
  entrypoints: GraphRef[];
  sideEffects: string[];
  dependencies: GraphRef[];
  consumers: GraphRef[];
  canonicalImplementation?: GraphRef;
  confidence: number;
  evidenceRefs: EvidenceRef[];
};
```

This extends the current `CapabilityMapPhraseBackedCapability` (which already has
`verb`, `noun`, `qualifier?`, `domain?`, `pattern?`, `layer?`, `evidenceRefs`) with
implementers, entrypoints, side effects, dependencies, consumers, and a canonical
implementation. **verb:noun remains the human-readable shorthand, not the whole
capability model.**

## Claim Reconciliation

Reconciliation generalizes the old system's label-quality / anomaly-detection pass
into a single claim-reconciliation layer. It compares: path rules, AST facts,
imports, exports, semantic file understanding, ontology rules, embedding neighbors,
runtime traces, and human overrides. It emits: accepted claims, conflicted claims,
rejected claims, and needs-review claims. **Label quality becomes a special case of
general claim reconciliation.** Conflicting evidence (AST says X, LLM says Y,
neighbor says Z) is preserved as a `conflicted` claim — a signal of an
architectural boundary or genuine ambiguity — not silently flattened.

## Embeddings As Secondary Evidence

| Embedding Role | Decision |
| --- | --- |
| whole-file embedding | not primary |
| structural vectors | deterministic features |
| semantic embeddings | summaries/capabilities/signatures/comments |
| retrieval output | explainable neighbor evidence |
| proof status | proposal/context, not proof |

- **Embeddings are neighbor evidence, not truth.**
- **Do not embed whole files as the primary artifact.**
- **Use structural feature vectors and semantic embeddings separately** — a
  deterministic structural vector (AST / imports / symbols / side effects / routes
  / tests) and a semantic embedding (file TLDR / symbol summary / capability text /
  comments / docstrings / signatures).
- **Embedding output must explain which chunks/signals produced similarity.**

Embeddings enter the graph as `similar_to` edges with `source:
"embedding_similarity"` claims. **Embedding similarity is proposal, not proof.**

## Symbol-Level Intelligence

**Files remain containers; symbols become first-class intelligence nodes.**
Symbol nodes include: function, class, method, React hook, route handler, schema,
repository method, service method, event handler, exported constant, config object.
Capabilities, ownership, and similarity attach at the symbol level where possible;
files become storage + the coarse evidence container, matching the old system's
`SymbolContext` (callers/callees) ambition but as native graph nodes rather than a
post-hoc expansion step.

## Evaluation Model

| Metric | Purpose |
| --- | --- |
| label accuracy | validate ontology/system inference |
| capability precision / recall | validate capability extraction |
| duplicate precision | avoid noisy duplicate claims |
| context usefulness | measure task-shaped bundles |
| false-positive rate | control trust erosion |
| scan stability | prevent churn |
| cost/time per scan | keep product usable |
| human override rate | identify ontology/scanner improvement opportunities |

Metrics tracked: label accuracy; capability precision / recall; canonical
recommendation precision; duplicate finding precision; context bundle usefulness;
false-positive rate by issue type; scan stability across small diffs; time / cost
per scan; human override rate. **Every new scanner or inference layer should improve
at least one measured quality metric** (gated against a ground-truth dataset, as the
old system's evaluation harness did).

## Task-Shaped Context

Context bundles are graph-query products, not file lists. Example:

```text
Task: modify SMS experience routing
Core path:
  route:/api/v1/sms/webhook
  -> symbol:handleInboundSms
  -> symbol:resolveExperienceForPhone
  -> db:phone_number_mappings.experience_key
Relevant capabilities:
  - routes:sms webhook
  - resolves:experience routing
  - persists:inbound message
Do not touch:
  - carrier delivery status handling
  - outbound worker retry logic
```

**Context bundles should be task-shaped graph neighborhoods, not generic file
lists** — a focused subgraph (entrypoint → symbols → data) plus relevant
capabilities and explicit "do not touch" regions, each backed by evidence.

## Human Feedback Model

Human feedback is classified, not just applied: one-off override, recurring
pattern, synonym mapping, ontology update, rule update, scanner bug, ground-truth
correction. **Human feedback should upgrade ontology/rules when patterns repeat,
not only patch individual labels.** Human overrides have explicit provenance and
reasons and enter the graph as `human_override` nodes with `source: "human"`
claims that outrank inferences but are themselves auditable.

## Boundary Model

- **CapabilityEvidenceGraph is evidence-backed context, not proof by itself.**
- **LLM interpretation is proposal, not proof.**
- **Embedding similarity is proposal, not proof.**
- **Deterministic facts remain stronger than semantic or embedding inferences.**
- **Ontology is the contract for normalized capability meaning.**
- **Human overrides have explicit provenance and reasons.**
- **Embeddings must not approve plans.**
- **Semantic intelligence must not execute commands.**
- **Semantic intelligence must not write source files.**
- **Semantic intelligence must not run Circe.**
- **intent:go remains deferred.**

## What This Does Not Do

This slice is a decision only. It does not implement CapabilityEvidenceGraph,
implement embeddings, add vector storage, add retrieval, add provider packages, run
live providers, or change scan behavior. It writes no source, executes no commands,
approves no plans, creates no WorkOrder / VerificationPlan, and runs no Circe.
Embeddings remain prioritized-but-secondary; intent:go remains deferred.

## Implementation Sequence

1. **Capability Evidence Graph v1** — graph refs, evidence refs, the fact/inference
   claim model, file + symbol + capability nodes, deterministic facts from the
   current scan; no embeddings yet; no source writes, command execution, approval,
   or intent:go.
2. **Semantic File Understanding → Evidence Graph Integration** — land
   `SemanticFileUnderstandingReport` capability signals / findings as `source:
   "llm"` inference claims.
3. **Embedding Provider / Index v1** — structural + semantic vectors as
   `similar_to` neighbor evidence, after the graph has a disciplined place to land.

Embeddings come after the graph has somewhere disciplined to land.

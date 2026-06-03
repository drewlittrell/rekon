# Review Packet — Capability Evidence Graph / Semantic Intelligence Architecture Decision (slice 152)

Base: `bc5fb92`. Strategy/architecture decision-only batch. Selects Option B —
CapabilityEvidenceGraph-first architecture — as the next semantic-intelligence
substrate, superseding a narrow "Embeddings Parity Audit / Embedding Index
Decision". No runtime behavior changes; documentation + docs test only.

## CHANGES MADE

- New memo `docs/strategy/capability-evidence-graph-semantic-intelligence-decision.md`.
- New docs test `tests/docs/capability-evidence-graph-semantic-intelligence-decision.test.mjs` (30 assertions).
- Cross-reference appends to ~10 scope docs + `docs/releases/*` + README + CHANGELOG.
- No `.ts` source changes, no behavior change, no package-lock change.

## PUBLIC API CHANGES

None. Documentation and a docs test only. The proposed `EvidenceClaim`, `GraphRef`,
`CapabilityNode`, and `CapabilityEvidenceGraph` shapes are a decision, not an
implementation.

## PURPOSE PRESERVATION CHECK

- Original problem: Rekon has restored LLM-backed semantic parsing + semantic file
  understanding and is ready to prioritize embeddings — but embeddings must not
  become a black-box truth layer. Rekon needs the evidence architecture first so
  embeddings become one explainable signal among deterministic facts, LLM
  interpretation, ontology rules, runtime evidence, and human overrides.
- Preserved guarantee: facts and inferences are separated; deterministic facts
  remain stronger than semantic guesses; embeddings are proposal/context, not
  proof; ontology remains the contract; every important claim has evidence and
  confidence.

## CODEBASE-INTEL ALIGNMENT

The old codebase-intel system proved that explicit ontologies + deterministic
derivation + semantic embeddings + anomaly detection is viable, but treated files
as the primary semantic unit and emitted many parallel products. Rekon inverts
this: capabilities + evidence are the primary units; files are one evidence source.
The decision mirrors the old value (ontology contract, dual embeddings, label
reconciliation, symbol context, ground-truth evaluation) under a single
claim/evidence/reconciliation model.

## SOURCE REVIEW

Two read-only surveys were run (Explore agents). **Old codebase-intel** (real
source at `/Users/andrewlittrell/Code/codebase-intel`): YAML ontology
(`verb-categories`/`nouns`/`patterns`/`layers`/`naming-conventions`);
`FileAnalysisWithMeta` per-file LLM analysis with
`capabilities[{verb,noun,detail,frame,roles,evidence,confidence,source}]` and
`analysisSource: llm|deterministic|hybrid`; Voyage `voyage-code-3` + HNSW
(`ann-index.ts`) similarity; dual embeddings (`lib/embeddings.ts` feature-bag +
`infra/providers/voyage-embeddings.ts`); label derivation + `labelAnomalies`
(`lib/labeling.ts`); `graph-core.schema.ts` (nodes file/sym/route/event/capability/…,
edges + `EdgeEvidence{source,confidence}`); `runtime-graph.schema.ts`;
`evaluation.schema.ts` ground-truth + per-mode metrics; symbol context
(`SymbolContext` callers/callees, `expand --symbol`); overrides
(`overrides.json`/`label-overrides.json`/`canonical-overrides.json`).

**Rekon current** (at `bc5fb92`): `EvidenceFact` + `EvidenceGraph` already exist in
`@rekon/kernel-evidence` (`{kind, subject, value, confidence 0-1, provenance}`);
verb:noun `CapabilityMapPhraseBackedCapability` already carries `evidenceRefs`;
`SemanticFileUnderstandingReport` (summary / capabilitySignals / findings / 8
boundaries incl. `generatedEmbeddings:false`); `RuntimeGraphObservationReport`
(nodes kind step|feature|event|source, edges, `evidenceRefs`) +
`RuntimeGraphDriftReport`; LLM router already defines `code.embedding` /
`plan.similarity` / `artifact.retrieval` tasks + a `RekonEmbeddingProvider`
interface that is routed-but-unused (embeddings deferred). Net-new (do not exist):
`EvidenceClaim`, `GraphRef`, rich `CapabilityNode`, structural vectors, the
`CapabilityEvidenceGraph` artifact.

## OLD SYSTEM STRENGTHS

Explicit ontology-as-contract; per-file LLM analysis with deterministic viability
check; dual (feature-bag + semantic) embeddings indexed via HNSW; multi-source
label derivation with anomaly detection; ground-truth evaluation + symbol context.
Blind spot: file-first fragmentation and parallel outputs without a shared
claim/evidence/reconciliation model.

## REKON ARCHITECTURE CHANGE

Make CapabilityEvidenceGraph the canonical substrate and derive scan reports,
capability maps, duplicate detection, context bundles, canonical recommendations,
ownership warnings, and agent instructions from it. Build on the existing
`EvidenceFact`/`EvidenceGraph`, verb:noun phrase capabilities, and runtime graph;
add `EvidenceClaim` (generalizing `EvidenceFact` with `claimType` + `status`),
`GraphRef`, rich `CapabilityNode`, and structural/semantic vectors.

## OPTIONS CONSIDERED

A embedding-index-first (rejected/deferred); **B CapabilityEvidenceGraph-first
(selected)**; C literal old-system rebuild (rejected); D semantic-reports-only
(rejected/deferred); E pure-deterministic-graph (rejected).

## CAPABILITY EVIDENCE GRAPH MODEL

Nodes (file, symbol, capability, system, route, event, db_table, api, pattern,
invariant, test, doc, runtime_operation, human_override); edges (imports, calls,
exposes, implements, owns, consumes, produces, reads, writes, routes_to, validates,
duplicates, similar_to, bypasses, violates, tests, documents, supports,
contradicts); evidence sources (ast, import_graph, typechecker, runtime_trace,
llm_extraction, embedding_similarity, human_override, ontology_rule, ground_truth).
Every edge/inference is an `EvidenceClaim` with `claimType`, `source`, `confidence`,
`evidenceRefs`, `status`.

## FACTS AND INFERENCES

Facts (substrate): paths, imports, exports, symbols, routes, DB reads/writes,
tests, runtime traces. Inferences (evidence-backed): system, layer, role,
capability, canonical status, duplicate intent, ownership fit, risk, recommended
action. Deterministic facts are the substrate; LLM/embedding outputs are inferences
and never overwrite a fact.

## RICH CAPABILITY MODEL

`CapabilityNode` extends verb:noun with implementedBy / entrypoints / sideEffects /
dependencies / consumers / canonicalImplementation / confidence / evidenceRefs.
verb:noun remains the human-readable shorthand, not the whole model.

## CLAIM RECONCILIATION

Generalizes label-quality into one reconciliation layer comparing path rules, AST,
imports, exports, semantic understanding, ontology, embedding neighbors, runtime
traces, human overrides → emits accepted / conflicted / rejected / needs-review.
Conflicts are preserved as signal, not flattened.

## EMBEDDINGS MODEL

Secondary, explainable evidence: not whole-file primary; structural feature vectors
(deterministic) and semantic embeddings (summaries/signatures/comments) kept
separate; retrieval output explains which chunks/signals produced similarity;
proposal/context, not proof. Enter the graph as `similar_to` /
`embedding_similarity` claims.

## SYMBOL-LEVEL INTELLIGENCE

Files remain containers; symbols (function/class/method/hook/route handler/schema/
repository method/service method/event handler/exported constant/config object)
become first-class intelligence nodes.

## EVALUATION MODEL

Scorecard: label accuracy; capability precision/recall; canonical & duplicate
precision; context usefulness; false-positive rate by issue type; scan stability;
cost/time per scan; human override rate. Every new scanner/inference layer should
improve at least one measured metric, gated against ground truth.

## TASK-SHAPED CONTEXT

Context bundles are task-shaped graph neighborhoods (entrypoint → symbols → data +
relevant capabilities + explicit do-not-touch), not generic file lists.

## HUMAN FEEDBACK MODEL

Classify feedback (one-off override / recurring pattern / synonym mapping /
ontology update / rule update / scanner bug / ground-truth correction); upgrade
ontology/rules when patterns repeat, not just patch labels; overrides have explicit
provenance + reasons.

## BOUNDARY MODEL

CapabilityEvidenceGraph is evidence-backed context, not proof; LLM interpretation
and embedding similarity are proposals, not proof; deterministic facts remain
stronger; ontology is the contract; human overrides have provenance; embeddings
must not approve plans; semantic intelligence executes no commands, writes no
source, runs no Circe; intent:go deferred.

## TESTS / VERIFICATION

- New docs test (30 assertions): headings, decision selection, the required
  statements + 10 boundary statements, 5 tables (option/graph/facts-inferences/
  embeddings/evaluation), CHANGELOG mention, packet PURPOSE PRESERVATION CHECK.
- Full nine-command gate. No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

All `.ts` source; `@rekon/kernel-evidence`; the embedding interfaces; scan
behavior; the semantic intent-context integration; deterministic evidence
artifacts; WorkOrder / VerificationPlan gates; Circe; npm publish; package
versions; the `fix(cli): report intent bundle handoff paths` change on the tip.

## RISKS / FOLLOW-UP

- Reconciliation rules + confidence composition are the hard part — start with
  explicit precedence (fact > human > inference) before any probabilistic model.
- Symbol-level extraction cost/stability must be measured before broad rollout.
- Follow-up: Capability Evidence Graph v1, then Semantic File Understanding →
  Evidence Graph Integration, then Embedding Provider / Index v1.

## NEXT STEP

Recommended: **Capability Evidence Graph v1**.

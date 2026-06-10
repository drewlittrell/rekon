# Architecture Grammar Pack Decision (WO-4)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-4, law track).** Selects the carrier for classic's
architecture grammar, pins its consumption path, and records the
reconciliation between classic's grammar verb categories and Rekon's
capability vocabulary. The port itself ships in the same slice:
`packages/capability-ontology/src/grammar/` plus
[grammar-port-manifest.json](../../packages/capability-ontology/grammar-port-manifest.json)
(206 rows) and
[classic-ontology-keys.json](../../packages/capability-ontology/classic-ontology-keys.json)
(the checked-in completeness inventory).

## Decision: a sibling ArchitectureGrammarPack family

The grammar lands as its own pack family
(`ArchitectureGrammarPackSchema`, `grammar-base`,
`grammar-project-overlay-example`) inside `@rekon/capability-ontology`,
compiled by the same pack + overlay + override pattern as the capability
vocabulary (`compileEffectiveGrammar`, operator overrides at
`.rekon/architecture-grammar.overrides.json`), **not** by widening the
vocabulary pack schema.

Rationale, ratified from the agent-drafted input: vocabulary answers
"what may things be called"; grammar answers "what may things do and
where." The capability-ontology concept doc pins "do not flatten the
ontology into a single config / report layer," and CapabilityContract
already demonstrates that policy lives in its own layer. The two schemas
evolve at different cadences and serve different consumers; one carrier
would couple them for no benefit.

## The two-axis reconciliation (verb categories)

Reality check from the port: classic's grammar carries **16 verb
categories** (the work order said fourteen; the surface wins), and they
are a **structural axis** — what a verb's presence implies about a file's
role in a layer (`allowedInLayers`, `hubIndicator`, purity implications).
Rekon's `CapabilityVerbCategory` is a **semantic axis** with 9 members
(read/write/create/delete/transform/validate/navigate/communicate/system)
classifying what a capability phrase means. These are different
dimensions, so the grammar does not fork the vocabulary: each grammar
category carries a `vocabularyCategory` bridge field naming its closest
semantic category, and the canonical verbs classic listed per grammar
category were reconciled into the vocabulary base pack (8 new base-form
verbs, 144 third-person/alias mappings, 40 auxiliary tokens routed to
noise — classic wrote verbs in third-person capability-phrase form;
Rekon canon is base-form, so `creates` becomes an alias of `create`).

## Consumption path (named consumers, so the port can't rot)

1. **`CapabilityArchitectureLintReport` evaluation** — the shipped lint
   chain is the first reader of the compiled grammar (layers, file types,
   forbidden types).
2. **The cluster-A divergence detector** (Phase 1 queue slot 1,
   `detection-design-decisions.md`) — declared-vs-observed divergence
   reads layers/import rules/patterns from `compileEffectiveGrammar`.
3. **The naming contract check** (queue slot 5) — the {Entity}{Role}
   grammar, naming principles, file-type suffix rules, and
   `forbiddenTypes` are its declared side; expected to flip up to 724 of
   846 classic naming findings.

`compileEffectiveGrammar` is the single read surface; consumers never
read pack files directly.

## D8 compatibility (stated, not designed)

System-model delta D8 compiles the grammar outward to lint configs, CI
checks, and agent-contract assertions. The chosen carrier supports that
without further schema work: packs are pure data with stable ids and
per-entry classic provenance; `compileEffectiveGrammar` produces one
deterministic merged view (base → overlays → overrides, collisions
recorded in notes) that any outward compiler can walk. Nothing in the
schema binds entries to a single enforcement vehicle.

## The split, applied (not re-litigated)

Per `detection-design-decisions.md` A4/B4 and cross-cutting answer 6:
general principles ship in `grammar-base` (6 layers, 16 verb categories,
43 file types + 7 forbidden types + hub thresholds, 11 patterns, 9
anti-patterns, 8 sequential recipes, the naming grammar); project law
ships in `grammar-project-overlay-example` (4 patterns:
declarative_gate, rule_versioning, idempotent_turn, streaming_invariant;
4 anti-patterns: manualDDEInstantiation, coreImportsModule,
directDerivedAccess, dbWriteDuringStream; 3 sequential recipes:
streaming, derivedHelper, structuredPayload), which doubles as the
reference implementation of the overlay model and is never applied
automatically. The privacy scan over emitted packs found no
mentor-family product vocabulary; rule ids ship intact (they are already
public in the committed decisions doc).

Explicit dispositions for the four files the dossier flagged:
`taxonomy.ontology.yaml` **rejected** (superseded within classic by
file-types.ontology.yaml — same hub thresholds, camelCase successor);
`pipelines.ontology.yaml` **rejected** (project pipeline DAGs whose
mechanism Rekon redesigned as StepCapabilityGraph + HandoffContract);
`verb-rules.ontology.yaml` **vocabulary** (reconciled as above);
`ito-semantic-coherence.ontology.yaml` **deferred** (gate-semantic law
with no Rekon consumer; re-entry when a gate-semantics consumer lands on
the intent/step track).

## Enforcement boundary

This slice ships declared law plus its audit trail. No detector, lint
rule, CapabilityMap mutation, or automatic overlay application — the
Phase 1 queue owns enforcement, and net-new grammar arrives through the
same operator pathway as vocabulary expansion.

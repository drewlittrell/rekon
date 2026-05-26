# Capability Ontology

**Status:** v1 shipped (CapabilityNormalizationReport).
**Audience:** operators, capability authors, agents.
**Scope:** explains how Rekon's layered capability ontology
translates raw repo vocabulary into canonical capability
language, what is auditable today, and what is deferred to v2.

The **capability ontology** is Rekon's translation layer
between arbitrary repo language (function names, exports,
file paths) and a canonical verb/noun capability language. It
is **layered**, **config-first**, and **auditable**. The
[Capability Ontology Translation Layer
Decision](../strategy/capability-ontology-translation-layer-decision.md)
records the selected approach and the eight-layer internal
model. Do not flatten the ontology into a single config /
report layer.

## Layered Model

The macro 5-layer boundary is:

1. `EvidenceGraph` — raw facts (`symbol`, `export`,
   `capability_hint`, `ownership_hint`).
2. `CapabilityOntology` — config-first source vocabulary
   (built-in baseline + operator config). In v1 this lives in
   source: `BUILTIN_CAPABILITY_ONTOLOGY` +
   `.rekon/capability-ontology.json`.
3. `CapabilityNormalizationReport` — first registered audit
   artifact (this slice).
4. `CapabilityMap` — canonical capability claims. Integration
   is deferred to v2.
5. `RefactorPreservationContract` — far-future preservation
   contracts. Name reserved; registration deferred.

The internal eight-layer refinement (raw facts → candidate
extraction → lexical split → baseline ontology → effective
ontology → normalization audit → normalized capability
projection → preservation contract) is preserved across the
implementation and is explicit in
`@rekon/capability-ontology/src/index.ts`.

## What v1 Ships

- `@rekon/capability-ontology` package (`projector` role,
  consumes `EvidenceGraph`, produces
  `CapabilityNormalizationReport`).
- A built-in baseline vocabulary with verbs, nouns, roles, and
  patterns (each with categories and aliases).
- Optional `.rekon/capability-ontology.json` config loader
  (JSON only — no YAML in v1).
- A deterministic lexical splitter for camelCase, snake_case,
  and kebab-case names.
- A pure normalizer that maps candidates to canonical
  verb/noun pairs (using exact match + alias lookup).
- A `CapabilityNormalizationReport` audit artifact with
  per-candidate provenance and a coarse summary.
- `rekon capability ontology normalize` CLI command.

## What v1 Does Not Ship

- **No `CapabilityMap` integration.** Layer 6 is deferred to
  v2. The normalized verb/noun claims do not flow into
  `CapabilityMap` entries in this batch.
- **No `RefactorPreservationContract`.** Layer 7 is
  far-future.
- **No LLM normalization.** v1 is purely deterministic.
- **No source-write apply.** This package never writes source
  files.
- **No finding mutation.** Unknown verbs / nouns surface as
  audit rows. They do not raise findings and do not resolve
  any existing finding.

## Operator Config

Drop a `.rekon/capability-ontology.json` file next to
`.rekon/config.json` to extend the built-in vocabulary:

```json
{
  "version": "0.1.0",
  "verbs": {
    "canonical": ["dispatch", "publish"],
    "aliases": { "broadcast": "dispatch" },
    "categories": { "dispatch": "communicate" }
  },
  "nouns": {
    "canonical": ["invoice"],
    "aliases": { "receipt": "invoice" },
    "thresholds": { "autoMap": 0.7 }
  },
  "roles": { "canonical": ["worker"] },
  "patterns": { "canonical": ["fan-out"] }
}
```

Rules:

- `version` must equal `"0.1.0"` in v1.
- All extra canonical entries are merged with the built-in
  baseline. Built-in entries are never removed.
- Aliases are case-insensitive.
- Invalid config (bad JSON, wrong version, wrong shape) fails
  the CLI command clearly. The CLI never silently ignores
  config errors.

## Running The CLI

```bash
rekon refresh
rekon capability ontology normalize
```

`--json` emits the canonical report. Without `--json`, prints
a short summary line and the artifact id.

The CLI:

- Reads the latest `EvidenceGraph` from the local artifact
  store.
- Compiles an in-memory `EffectiveCapabilityOntology` from
  the built-in baseline + optional config.
- Writes a single `CapabilityNormalizationReport` under
  `.rekon/artifacts/projections/`.
- Does **not** mutate any source file.
- Does **not** mutate the `EvidenceGraph` or `CapabilityMap`.
- Does **not** silently resolve findings.

If no `EvidenceGraph` exists yet, the command fails with the
message *"rekon capability ontology normalize: no
EvidenceGraph found. Run `rekon refresh` (or `rekon observe`)
first."*

## Unknown Verbs / Nouns Are Audit Signal

Unknown verbs surface as `status: "unknown-verb"` rows.
Unknown nouns surface as `status: "unknown-noun"` rows. Both
unknown surface as `status: "unknown"`. The operator decides
whether to:

- Add the term to `.rekon/capability-ontology.json` (extending
  the ontology), or
- Rename the source symbol to a canonical form, or
- Accept the unknown row as documented audit signal.

Rekon never auto-extends the ontology. Unknowns must surface.

## Lexical Splitter Confidence

- **High**: 2 tokens (`getUser`, `save_token`).
- **Medium**: 3+ tokens (`getUserToken`, `delete_user_record`).
- **Low**: 1 token (`orphan`) or empty.

Low-confidence candidates are classified `low-confidence` in
the report regardless of ontology lookup. They are not
considered normalized.

## See Also

- [`CapabilityNormalizationReport` artifact
  reference](../artifacts/capability-normalization-report.md)
- [Capability Ontology Translation Layer
  Decision](../strategy/capability-ontology-translation-layer-decision.md)
- [Capability Ontology Architecture Impact
  Review](../strategy/capability-ontology-architecture-impact-review.md)
- [Built-In Baseline Ontology Coverage
  Review](../strategy/builtin-ontology-coverage-review.md) —
  evidence-based review of the v1 baseline against a real
  Next.js TypeScript target. Recommends Option C (operator
  review surface) as the next implementation slice. Vocabulary
  expansion (Option A) follows; `CapabilityMap` v2 (Option B)
  remains deferred.
- [`EvidenceGraph` artifact reference](../artifacts/evidence-graph.md)
- [Reconciliation preview
  concept](reconciliation-preview.md)
- [`@rekon/capability-ontology`
  README](../../packages/capability-ontology/README.md)

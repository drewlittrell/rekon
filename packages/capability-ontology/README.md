# @rekon/capability-ontology

Built-in Rekon capability ontology translation layer.

## Stability

Label: `experimental, public`.

The default capability export and the `CapabilityNormalizationReport`
artifact shape are the public surface. Ontology internals
(`EffectiveCapabilityOntology`, lexical splitter, candidate extractor)
are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

Translate raw repo vocabulary into Rekon's canonical
verb/noun capability language. The package implements the first
runtime slice of the layered ontology defined in the
[Capability Ontology Translation Layer Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md).

The package:

- Ships a built-in baseline vocabulary (verbs, nouns, optional roles
  and patterns).
- Optionally merges an operator-supplied
  `.rekon/capability-ontology.json` config.
- Compiles an in-memory `EffectiveCapabilityOntology`.
- Extracts capability candidates from a recent `EvidenceGraph`
  (`symbol`, `export`, `capability_hint`, `ownership_hint` facts).
- Splits candidate names with a deterministic lexical splitter
  (camelCase, snake_case, kebab-case).
- Emits an auditable `CapabilityNormalizationReport` artifact.

## Non-Goals For v1

- **No LLM-only normalization.** Lexical split is purely
  deterministic. LLM suggestions, when added, will be subordinate to
  the deterministic split and the audit report.
- **No mutation of `EvidenceGraph` raw facts.** The translation
  layer is a read-only projector over evidence.
- **No `CapabilityMap` integration.** Layer 6 (`CapabilityMap`
  integration) is explicitly deferred to v2 of the ontology track.
- **No `RefactorPreservationContract`.** Layer 7 is far-future and
  gated on multiple operator runs of the normalization audit.
- **No source-write apply.** This package never writes source
  files. It produces an audit-only artifact.
- **No silent finding resolution.** Normalization output does not
  resolve, mute, or change any finding status.

## Lifecycle Fit

Runs as a `projector` after `Observe` writes an `EvidenceGraph`. The
operator invokes the CLI command `rekon capability ontology
normalize` (or calls the helper directly through the runtime). The
projector reads the latest `EvidenceGraph` and writes a
`CapabilityNormalizationReport`.

## Public Surface

The default export is a Rekon capability definition with a
`projector` handler that produces `CapabilityNormalizationReport`.

Helper exports:

- `BUILTIN_CAPABILITY_ONTOLOGY` — the frozen built-in baseline.
- `compileEffectiveCapabilityOntology(input)` — pure compiler.
- `loadCapabilityOntologyConfig(repoRoot)` — JSON config loader.
- `splitCapabilityName(name)` — deterministic lexical splitter.
- `extractCapabilityCandidates(graph)` — pure candidate extractor
  over an `EvidenceGraph`.
- `normalizeCapabilityCandidates({ candidates, ontology })` —
  pure normalizer.
- `buildCapabilityNormalizationReport(input)` — pure report
  builder that wires the steps together.

## Import Boundary

Use this package as a capability or via the helper exports above.
Do **not** bypass the package to mutate `EvidenceGraph` raw facts.
Do **not** use the ontology to silently re-classify findings.

## See Also

- [Capability Ontology Translation Layer
  Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md)
- [Capability Ontology Architecture Impact
  Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)
- [`CapabilityNormalizationReport`
  reference](../../docs/artifacts/capability-normalization-report.md)
- [Capability ontology
  concept](../../docs/concepts/capability-ontology.md)

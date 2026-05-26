# `CapabilityNormalizationReport` Artifact

**Status:** v1 shipped.
**Stability:** experimental, public.
**Producer:** `@rekon/capability-ontology` (projector role).
**Category:** `projections`.

A `CapabilityNormalizationReport` is the **audit-only**
projection layer of Rekon's [capability ontology translation
system](../concepts/capability-ontology.md). It records how
Rekon classified each raw symbol / export / capability hint
from a single `EvidenceGraph` against the **effective
capability ontology** (built-in baseline + optional operator
config).

The report is **read-only**:

- It does **not** mutate `EvidenceGraph` raw facts.
- It does **not** modify `CapabilityMap` (Layer 6 integration
  is deferred to v2 of the ontology track).
- It does **not** resolve, mute, or change any finding.
- It does **not** invoke an LLM. The lexical split is purely
  deterministic.

## Schema (v1)

| Field | Meaning |
| --- | --- |
| `header.artifactType` | always `"CapabilityNormalizationReport"` |
| `header.schemaVersion` | `"0.1.0"` |
| `header.inputRefs` | includes the source `EvidenceGraph` ref |
| `ontology.source` | `"builtin"` or `"builtin+config"` |
| `ontology.configPath` | repo-relative path when a config was applied (else absent) |
| `ontology.configHash` | SHA-256 prefix of the applied config |
| `ontology.effectiveHash` | SHA-256 prefix of the compiled effective ontology |
| `summary.totalCandidates` | total candidates extracted from the EvidenceGraph |
| `summary.normalized` | count where verb + noun resolved to canonical entries |
| `summary.unknownVerb` | count where the noun resolved but the verb did not |
| `summary.unknownNoun` | count where the verb resolved but the noun did not |
| `summary.unknown` | count where neither resolved |
| `summary.ignored` | count of candidates intentionally skipped (e.g. `ownership_hint`) |
| `summary.aliasApplied` | count of candidates that used a verb / noun alias |
| `summary.lowConfidence` | count of single-token / split-low candidates |
| `candidates[]` | one entry per extracted candidate |

Each candidate entry carries:

- `id` — stable per-report identifier.
- `source.kind` — one of `symbol` / `export` / `capability_hint`
  / `ownership_hint` / `system_seed`.
- `source.artifactRef` — points at the `EvidenceGraph`
  (matches `header.inputRefs[0]`).
- `source.factId`, `source.path`, `source.symbol`,
  `source.exportName` — provenance details when available.
- `raw.name` — the original repo-language name.
- `raw.verb` / `raw.noun` — deterministic lexical split output.
- `raw.splitConfidence` — `"high"` (2 tokens) / `"medium"`
  (3+ tokens) / `"low"` (1 token or empty).
- `normalized.verb` / `normalized.noun` — canonical verb /
  noun when available.
- `normalized.verbAliasApplied` / `normalized.nounAliasApplied`
  — the original alias string that resolved to the canonical
  form.
- `normalized.verbCategory` / `normalized.nounCategory` —
  category labels from the ontology.
- `confidence` — split confidence carried through.
- `status` — `"normalized"`, `"unknown-verb"`, `"unknown-noun"`,
  `"unknown"`, `"ignored"`, or `"low-confidence"`.
- `message` — optional explanation (mandatory for non-normalized
  statuses).

## What This Artifact Is Not

- **Not a `CapabilityMap`.** The report describes a projection
  of raw evidence into canonical verb/noun claims. It does
  not assert system-level capabilities or refactor obligations.
- **Not a finding.** Unknown verbs or nouns do not raise a
  `FindingReport`. They surface to operators as audit rows so
  the operator can decide whether to extend the ontology or
  rename the source symbol.
- **Not LLM output.** The lexical split is pure regex over
  camelCase / snake_case / kebab-case. No model call.
- **Not a source-write trigger.** Rekon's source-write apply
  remains unavailable across the entire ontology track.

## Operator Workflow

1. Run `rekon refresh` (or `rekon observe`) to write a fresh
   `EvidenceGraph`.
2. Optionally create `.rekon/capability-ontology.json` with
   extra verbs / nouns / aliases (see
   [config schema](../concepts/capability-ontology.md#operator-config)).
3. Run `rekon capability ontology normalize [--root <path>]
   [--json]`.
4. Read the report. Decide whether to extend the ontology
   (config), rename source symbols, or accept the unknown
   rows as audit signal.

The CLI command is the canonical surface. Direct helper
invocation is supported for programmatic use (see
[`@rekon/capability-ontology` README](../../packages/capability-ontology/README.md)).

## Forward Compatibility

A future slice (deferred to v2 of the ontology track) will:

- Project normalized verb/noun claims into `CapabilityMap`
  entries.
- Extend the lexical splitter with an LLM-suggestion lane
  whose output is gated by the deterministic split + the
  effective ontology.

Until those slices land, this artifact is the **only** runtime
surface of the layered capability ontology.

## See Also

- [Capability Ontology
  concept](../concepts/capability-ontology.md)
- [Capability Ontology Translation Layer
  Decision](../strategy/capability-ontology-translation-layer-decision.md)
- [Capability Ontology Architecture Impact
  Review](../strategy/capability-ontology-architecture-impact-review.md)
- [`EvidenceGraph` artifact reference](evidence-graph.md)
- [Reconciliation preview
  concept](../concepts/reconciliation-preview.md)

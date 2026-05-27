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
| `ontology.basePack` | always `"base"` in v1 |
| `ontology.overlayPacks` | ids of applied overlay packs (e.g. `["nextjs-app", "monorepo"]`) |
| `ontology.overridePath` | repo-relative override file path when loaded (else absent) |
| `ontology.overrideHash` | SHA-256 prefix of the override file |
| `ontology.overrideKind` | `"canonical-override"` (overrides file) or `"legacy-compat"` (legacy `.rekon/capability-ontology.json`) |
| `ontology.legacyOverrideIgnored` | `true` when both override paths exist and the legacy file was ignored |
| `ontology.systemSeedCount` | number of system-seed verbs injected (build/deploy/test/lint) |
| `ontology.configPath` | legacy alias for `overridePath` (preserved for back-compat) |
| `ontology.configHash` | legacy alias for `overrideHash` (preserved for back-compat) |
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
2. Optionally create
   `.rekon/capability-ontology.overrides.json` with extra
   verbs / nouns / aliases (see
   [override schema](../concepts/capability-ontology.md#operator-overrides-canon--override-model)).
   Legacy `.rekon/capability-ontology.json` is accepted as
   compatibility input only; the overrides file is the
   canonical location.
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

### Upstream Candidate-Quality Lever

Candidate quality in this report depends on the
upstream `EvidenceGraph` provider for each language.
For JS/TS, the
[JS/TS AST Evidence Adapter Decision](../strategy/js-ts-ast-evidence-adapter-decision.md)
(twenty-third slice) committed Rekon to upgrading the
JS/TS provider from regex-only extraction to AST-backed
extraction using the TypeScript compiler parser API.
The runtime slice — **JS/TS AST EvidenceGraph Provider
v1** (twenty-fourth slice) — has now shipped.
`@rekon/capability-js-ts` emits AST-derived `symbol` /
`export` / `import` facts with additive
`extractionMethod` / `symbolKind` / `exportKind` /
`importKind` / `confidence` metadata when AST parsing
succeeds, and regex-fallback facts (clearly labelled)
when it does not. **This report's shape and semantics
are unchanged by that work** — the splitter and
normalizer continue to read raw evidence and emit
normalization rows. **AST facts improve candidate
quality** (better coverage of class methods,
arrow-function assignments, type-vs-value distinctions)
without changing the contract this report exposes to
downstream consumers. The
[Post-AST CapabilityPhraseReport Coverage Review](../strategy/post-ast-capability-phrase-coverage-review.md)
(twenty-fifth slice) measured the impact on available
targets: on the AST-rich fixture, 66 candidates
normalize 8 (12.1%) — substantially richer than the
pre-AST `examples/simple-js-ts` baseline. The
[Post-AST Cohort Re-Run](../strategy/post-ast-cohort-rerun.md)
(twenty-sixth slice) confirmed the lift on a real
repo: `target-1` normalization 241 → 299 (+24.1%).
target-1's large remaining unknown-verb /
unknown-noun count (~6,500 out-of-vocabulary
candidates) is the canonical-vocabulary ceiling,
not an AST limitation — the **parallel polish lane**
(candidate extractor consumes AST `symbolKind` /
`exportKind` metadata) addresses this.

## Downstream Consumers

[`CapabilityPhraseReport`](capability-phrase-report.md) v1
has shipped. The phrase report consumes high-confidence
normalized candidates from this report and projects them
into stable `CapabilityPhrase` entries. **This report's
shape is unchanged** — the phrase report cites this
artifact in `header.inputRefs` and the new
`sourceNormalizationReportRef` field; it never mutates the
normalization audit. Run
`rekon capability phrase project --report <ref>` to
generate the phrase projection.

The future `CapabilityMap` v2 consumes only
high-confidence / stable `CapabilityPhrase` claims from
`CapabilityPhraseReport` — never raw normalization rows.
`CapabilityContract` (further future) binds a phrase to
placement / proof / preservation policy.

## See Also

- [Capability Ontology
  concept](../concepts/capability-ontology.md)
- [Capability Ontology Translation Layer
  Decision](../strategy/capability-ontology-translation-layer-decision.md)
- [Capability Ontology Architecture Impact
  Review](../strategy/capability-ontology-architecture-impact-review.md)
- [Built-In Baseline Ontology Coverage
  Review](../strategy/builtin-ontology-coverage-review.md) —
  evidence-based review of the v1 baseline against a real
  Next.js TypeScript target. Confirms the baseline is
  sufficient for audit-only v1 and that `CapabilityMap` v2
  remains deferred.
- [`CapabilityNormalizationReviewLedger` artifact
  reference](capability-normalization-review-ledger.md) —
  append-only operator decisions over the unknown /
  low-confidence rows produced by this report.
- [Capability Ontology Suggestion Safety
  Review](../strategy/capability-ontology-suggestion-safety-review.md)
  — confirms this report stays audit-only across the full
  ontology suggestion loop.
- [Capability Ontology Config Authoring
  Guide](../beta/capability-ontology-config-authoring-guide.md)
  + [Capability Ontology Review-Loop
  Quickstart](../beta/capability-ontology-review-loop-quickstart.md)
  — operator path for translating this report's unknown
  rows into manual ontology config edits.
- [`EvidenceGraph` artifact reference](evidence-graph.md)
- [JS/TS AST Evidence Adapter
  Decision](../strategy/js-ts-ast-evidence-adapter-decision.md)
  — upstream candidate-quality lever. Selects the
  TypeScript compiler parser API for parser-only AST
  v1; pins regex as fallback only. Expected to improve
  candidate quality in this report.
- [Reconciliation preview
  concept](../concepts/reconciliation-preview.md)

# `CapabilityOntologySuggestionReport` Artifact

**Status:** v1 shipped.
**Stability:** experimental, public.
**Producer:** `@rekon/cli.capability-ontology-suggestions`.
**Category:** `actions` (preview / suggestion artifact,
alongside `WorkOrder` and the reconciliation suggestion
plans).

A `CapabilityOntologySuggestionReport` is the **preview-only**
projection of `extend-ontology` decisions in the latest
[`CapabilityNormalizationReviewLedger`](capability-normalization-review-ledger.md)
into a proposed `.rekon/capability-ontology.json` patch. It
is the next stage of the capability ontology translation
track after the operator review surface.

The report is **read-only with respect to source files and
ontology config**:

- It is written **only** by explicit operator CLI invocation
  (`rekon capability ontology suggestions`).
- It **does not** mutate `.rekon/capability-ontology.json`.
  The proposed config is rendered as a `before` / `after`
  JSON string inside the report. Operators apply the change
  manually if desired.
- It **does not** mutate the
  `CapabilityNormalizationReviewLedger`. Decisions are
  preserved exactly.
- It **does not** mutate
  `CapabilityNormalizationReport`.
- It **does not** mutate `CapabilityMap`. Layer 6
  integration remains deferred to v2.
- It **does not** mutate `EvidenceGraph` raw facts.
- It **does not** invoke an LLM.

## Schema (v1)

| Field | Meaning |
| --- | --- |
| `header.artifactType` | always `"CapabilityOntologySuggestionReport"` |
| `header.schemaVersion` | `"0.1.0"` |
| `header.inputRefs` | includes the source `CapabilityNormalizationReviewLedger` ref |
| `summary.total` | total number of `proposed` suggestions |
| `summary.addCanonicalVerb` | count of `add-canonical-verb` suggestions |
| `summary.addCanonicalNoun` | count of `add-canonical-noun` suggestions |
| `summary.addVerbAlias` | count of `add-verb-alias` suggestions |
| `summary.addNounAlias` | count of `add-noun-alias` suggestions |
| `summary.skipped` | count of decisions skipped in v1 |
| `suggestions[]` | one entry per proposed config edit |
| `skipped[]` | one entry per decision skipped in v1 |
| `preview.configPath` | always `".rekon/capability-ontology.json"` |
| `preview.patch.before` | JSON string of the existing config (or seed `{ "version": "0.1.0" }`) |
| `preview.patch.after` | JSON string of the proposed config after all suggestions are applied |
| `preview.message` | always notes the config is not mutated automatically |

Each suggestion entry carries:

- `id` — stable identifier within this report
  (`suggestion-0000-<kind>` etc.).
- `kind` — one of `"add-canonical-verb"`,
  `"add-canonical-noun"`, `"add-verb-alias"`,
  `"add-noun-alias"`.
- `term` — the operator-classified term being added.
- `canonical` — present for alias kinds; the canonical term
  the alias resolves to.
- `sourceDecisionId` — the ledger entry that produced this
  suggestion.
- `sourceLedgerRef` — `CapabilityNormalizationReviewLedger`
  ref.
- `reason` — the operator's `reason` text from the ledger.
- `status` — always `"proposed"` in v1.

Each skipped entry carries:

- `decisionId`, `term`, `termKind` — provenance from the
  ledger entry that was skipped.
- `reason` — the v1 skip reason (currently always
  *"candidate-level decisions require manual ontology
  editing."*).

## Suggestion Kind Mapping (v1)

| Ledger decision | `termKind` | `suggestedCanonical` | Suggestion kind |
| --- | --- | --- | --- |
| `extend-ontology` | `verb` | absent | `add-canonical-verb` |
| `extend-ontology` | `noun` | absent | `add-canonical-noun` |
| `extend-ontology` | `verb` | present | `add-verb-alias` |
| `extend-ontology` | `noun` | present | `add-noun-alias` |
| `extend-ontology` | `candidate` | (any) | **skipped** in v1 — candidate-level decisions require manual ontology editing |
| `rename-symbol` / `noise-filter` / `defer` | (any) | (any) | ignored — does not appear in the report |

Duplicate suggestions are deduplicated deterministically
(case-insensitive, normalized term + canonical pair).

## What This Artifact Is Not

- **Not an applied config.** Recording the report does
  **not** write `.rekon/capability-ontology.json`. The
  preview is JSON text in the report's `preview.patch`
  field; operators apply it themselves if they accept the
  proposal.
- **Not a `CapabilityMap`.** Vocabulary expansion stays
  separate from canonical capability projection.
- **Not a `FindingReport`.** Skipped or ignored decisions
  do not raise findings.
- **Not LLM output.** The transformation is a deterministic
  case-insensitive normalization of the ledger entries.

## Operator Workflow

1. Run `rekon refresh` (so `EvidenceGraph` is up to date).
2. Run `rekon capability ontology normalize --json` to write
   a fresh `CapabilityNormalizationReport`.
3. Run `rekon capability ontology review suggestions
   --report <CapabilityNormalizationReport:id> --json` to
   see top unknown / low-confidence terms.
4. Triage with `rekon capability ontology review decide ...`.
5. Run `rekon capability ontology suggestions --json` to
   project the ledger into a `CapabilityOntologySuggestionReport`.
6. Read `preview.patch.before` / `preview.patch.after` (or
   the human-mode summary) to decide whether to apply the
   proposed config. If applying, write
   `.rekon/capability-ontology.json` manually.

## CLI Surface

```bash
rekon capability ontology suggestions \
  [--ledger <CapabilityNormalizationReviewLedger-id|type:id>] \
  [--root <path>] [--json]
```

- Without `--ledger`, reads the **latest**
  `CapabilityNormalizationReviewLedger` in the local
  artifact store.
- Reads optional `.rekon/capability-ontology.json` to seed
  the `before` patch field.
- Writes a single `CapabilityOntologySuggestionReport`
  under `.rekon/artifacts/actions/`.
- Fails with a clear message if no ledger exists yet.
- `--json` emits the canonical report. Human-mode prints a
  short summary and ends with *"Config remains unchanged."*.

## Forward Compatibility

A future *capability ontology suggestion publication
surfacing* slice will surface the latest suggestion report
inside `architecture-summary` / `agent-contract`
publications so operators see ontology expansion proposals
without running the dedicated CLI. The publication path will
still not mutate the config file.

`CapabilityMap` integration (Layer 6) remains deferred until
operator review + vocabulary expansion reach a steady state
across multiple targets.

## See Also

- [`CapabilityNormalizationReviewLedger` artifact
  reference](capability-normalization-review-ledger.md)
- [`CapabilityNormalizationReport` artifact
  reference](capability-normalization-report.md)
- [Capability Ontology
  concept](../concepts/capability-ontology.md)
- [Capability Ontology Translation Layer
  Decision](../strategy/capability-ontology-translation-layer-decision.md)
- [Built-In Baseline Ontology Coverage
  Review](../strategy/builtin-ontology-coverage-review.md)
- [`EvidenceGraph` artifact reference](evidence-graph.md)

# `CapabilityNormalizationReviewLedger` Artifact

**Status:** v1 shipped.
**Stability:** experimental, public.
**Producer:** `@rekon/cli.capability-ontology-review`.
**Category:** `actions` (operator-decision ledger, alongside
`MemoryUsageLedger` and `IssueMergeDecisionLedger`).

A `CapabilityNormalizationReviewLedger` is the **append-only**
record of operator decisions over unknown / low-confidence
terms surfaced by
[`CapabilityNormalizationReport`](capability-normalization-report.md).
It is the runtime surface of the *capability ontology
unknown-term operator review* track — the slice selected as
the next step by the
[Built-In Baseline Ontology Coverage
Review](../strategy/builtin-ontology-coverage-review.md).

The ledger is **read-mostly**:

- It is written **only** by explicit operator CLI invocations.
- It is **append-only** — each `rekon capability ontology
  review decide` call adds one entry; existing entries are
  never rewritten or removed.
- It **does not** mutate `.rekon/capability-ontology.json`.
  Operators classify terms; ontology vocabulary expansion
  happens in a separate slice and remains evidence-driven.
- It **does not** mutate `CapabilityNormalizationReport`. The
  audit surface stays a deterministic projection of
  `EvidenceGraph` + the effective ontology.
- It **does not** mutate `CapabilityMap`. Layer 6 integration
  remains deferred to v2.
- It **does not** mutate `EvidenceGraph` raw facts.
- It **does not** invoke an LLM.

## Schema (v1)

| Field | Meaning |
| --- | --- |
| `header.artifactType` | always `"CapabilityNormalizationReviewLedger"` |
| `header.schemaVersion` | `"0.1.0"` |
| `header.inputRefs` | optional `CapabilityNormalizationReport` ref(s) cited by entries |
| `entries[]` | one append-only operator decision per entry |
| `summary.total` | total number of entries in the ledger |
| `summary.extendOntology` | count of `extend-ontology` decisions |
| `summary.renameSymbol` | count of `rename-symbol` decisions |
| `summary.noiseFilter` | count of `noise-filter` decisions |
| `summary.defer` | count of `defer` decisions |

Each entry carries:

- `id` — stable identifier (derived from `createdAt` + term).
- `term` — the operator-classified term.
- `termKind` — one of `"verb"`, `"noun"`, `"candidate"`.
- `decision` — one of `"extend-ontology"`, `"rename-symbol"`,
  `"noise-filter"`, `"defer"`.
- `reason` — mandatory free-text operator rationale.
- `createdAt` — ISO timestamp.
- `createdBy` — optional operator id (unset in v1; reserved).
- `sourceReportRef` — optional `CapabilityNormalizationReport`
  reference. Present when `--report` is supplied to `decide`.
- `sourceCandidateId` — optional candidate id within the
  source report.
- `suggestedCanonical` — optional canonical form proposed by
  the operator (relevant for `extend-ontology` and
  `rename-symbol`).

## Decision Vocabulary

| Decision | Meaning | What it implies for the operator |
| --- | --- | --- |
| `extend-ontology` | The term is a real capability verb / noun missing from the built-in baseline. | A future vocabulary expansion slice should add this term (with optional `suggestedCanonical`). |
| `rename-symbol` | The source symbol does not match Rekon's canonical capability language. | Update the source repo (e.g. rename a function). The ontology is correct as-is. |
| `noise-filter` | The term is not a capability — it is symbol noise (HTTP methods, internal state, framework constants). | A future candidate-extraction filter should drop this term. |
| `defer` | The decision is not yet clear. | Recorded so the term does not re-surface in `suggestions` until the operator revisits it explicitly. |

## What This Artifact Is Not

- **Not an automatic ontology editor.** Recording `extend-ontology`
  does **not** mutate `.rekon/capability-ontology.json`. A
  future *capability ontology vocabulary expansion v1* slice
  produces a config preview using the ledger as input; until
  then, ledger entries are durable suggestions only.
- **Not a `CapabilityMap`.** The ledger records operator
  classification of audit-report unknowns; it does not
  project canonical claims.
- **Not a finding.** Decisions never resolve, mute, or change
  any `FindingStatusLedger` entry, `FindingReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`.

## Operator Workflow

1. Run `rekon refresh` (so `EvidenceGraph` is up to date).
2. Run `rekon capability ontology normalize --json` to write
   a fresh `CapabilityNormalizationReport`.
3. Run `rekon capability ontology review suggestions
   --report <CapabilityNormalizationReport:id> --json` to see
   the top unknown / low-confidence terms.
4. For each high-frequency term that warrants a decision, run
   `rekon capability ontology review decide --term <term>
   --term-kind verb|noun|candidate --decision
   extend-ontology|rename-symbol|noise-filter|defer
   --reason <text>`. Optionally pass
   `--report <CapabilityNormalizationReport:id>` and
   `--candidate <id>` to cite provenance, and
   `--suggested-canonical <text>` to propose the canonical form.
5. Run `rekon capability ontology review decisions --json` to
   inspect the current ledger.
6. Re-run `suggestions`. By default, terms already decided in
   the latest ledger are excluded so the operator can focus on
   what is still outstanding. Pass `--include-decided` to see
   them anyway.

## CLI Surface

```bash
rekon capability ontology review suggestions \
  --report <CapabilityNormalizationReport-id|type:id> \
  [--limit <n>] [--include-decided] [--root <path>] [--json]

rekon capability ontology review decide \
  --term <text> \
  --term-kind verb|noun|candidate \
  --decision extend-ontology|rename-symbol|noise-filter|defer \
  --reason <text> \
  [--suggested-canonical <text>] \
  [--report <CapabilityNormalizationReport-id|type:id>] \
  [--candidate <candidate-id>] \
  [--root <path>] [--json]

rekon capability ontology review decisions [--root <path>] [--json]
```

`decide` writes a `CapabilityNormalizationReviewLedger`
artifact under `.rekon/artifacts/actions/`. `suggestions`
and `decisions` are read-only.

## Forward Compatibility

The *capability ontology vocabulary expansion v1* slice has
shipped as the next step on this track. See
[`CapabilityOntologySuggestionReport`](capability-ontology-suggestion-report.md).
It:

- Reads the latest ledger (or a pinned `--ledger`).
- Filters `extend-ontology` entries.
- Produces a **preview-only**
  `.rekon/capability-ontology.json` patch with the
  additions applied, without writing the file.
- Surfaces the preview as a `CapabilityOntologySuggestionReport`
  artifact so operators can inspect it before applying.

`CapabilityMap` integration (Layer 6) remains deferred until
the ledger + suggestion report reach a steady state across
multiple operator targets.

## See Also

- [`CapabilityNormalizationReport` artifact
  reference](capability-normalization-report.md)
- [`CapabilityOntologySuggestionReport` artifact
  reference](capability-ontology-suggestion-report.md) —
  preview-only proposal for
  `.rekon/capability-ontology.json` based on this ledger.
- [Capability Ontology Suggestion Safety
  Review](../strategy/capability-ontology-suggestion-safety-review.md)
  — pins that this ledger remains append-only and never
  drives automatic config mutation.
- [Capability Ontology
  concept](../concepts/capability-ontology.md)
- [Capability Ontology Translation Layer
  Decision](../strategy/capability-ontology-translation-layer-decision.md)
- [Built-In Baseline Ontology Coverage
  Review](../strategy/builtin-ontology-coverage-review.md)
- [`EvidenceGraph` artifact reference](evidence-graph.md)

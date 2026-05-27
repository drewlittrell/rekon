# `CapabilityPhraseReport` Artifact

**Status:** v1 shipped.
**Stability:** experimental, public.
**Producer:** `@rekon/cli.capability-phrase-project`.
**Category:** `projections` (sits next to
`CapabilityNormalizationReport` and `CapabilityMap`).

A `CapabilityPhraseReport` is the **semantic purpose
projection** that sits between
[`CapabilityNormalizationReport`](capability-normalization-report.md)
(the **translation audit**, Layer 5) and the future
`CapabilityMap` v2 (Layer 6, canonical projection).

The phrase report **consumes the latest
`CapabilityNormalizationReport`** and projects
high-confidence normalized candidates into repo / language /
architecture agnostic `CapabilityPhrase` entries. Unknown,
ignored, or low-confidence normalization rows remain visible
in the audit artifact and **never project** into a phrase.

Verbatim pins (the docs test asserts these):

- `CapabilityPhraseReport` is the **semantic purpose
  projection**.
- `CapabilityNormalizationReport` remains the **translation
  audit**.
- `CapabilityPhraseReport` consumes the latest
  `CapabilityNormalizationReport`.
- Only **high-confidence normalized** claims project in v1.
- **[`CapabilityMap` v2](capability-map.md) has shipped,
  passed a [safety review](../strategy/capability-map-v2-safety-review.md),
  and is now surfaced in the architecture summary
  + agent contract publications as projection
  context.**
  `CapabilityMap` v2 consumes `CapabilityPhraseReport`,
  not raw `CapabilityNormalizationReport` rows. Only
  stable high-confidence phrases project into
  `CapabilityMap.phraseBackedCapabilities`. The
  safety review confirms `CapabilityMap` v2 is
  additive, projection-only (not policy), and does
  not imply resolver routing, architecture linting,
  verification planning, or source writes.
  Publications **read** `CapabilityMap` v2 fields
  and **never** mutate `CapabilityMap` or this
  report.
- AST / typechecker evidence is **optional enrichment, not
  foundational truth**.
- **No LLM-only inference** in v1.
- The phrase report never mutates `EvidenceGraph`,
  `CapabilityNormalizationReport`, `CapabilityMap`,
  `CapabilityNormalizationReviewLedger`, or
  `CapabilityOntologySuggestionReport`.

The report is **read-only with respect to upstream
artifacts**:

- It is written **only** by explicit operator CLI invocation
  (`rekon capability phrase project --report <ref>`).
- It **does not** mutate the source
  `CapabilityNormalizationReport`.
- It **does not** mutate `EvidenceGraph`.
- It **does not** mutate `CapabilityMap` — Layer 6
  integration (the additive v2 phrase-backed
  projection) is performed by
  `@rekon/capability-model`, which reads this report
  and emits new `CapabilityMap` artifacts but never
  writes back into the phrase report.
- It **does not** mutate any operator decision (ledger,
  suggestion report).
- It **does not** invoke an LLM.

## Schema (v1)

| Field | Meaning |
| --- | --- |
| `header.artifactType` | always `"CapabilityPhraseReport"` |
| `header.schemaVersion` | `"0.1.0"` |
| `header.inputRefs` | includes the source `CapabilityNormalizationReport` ref; includes `EvidenceGraph` when the normalization report cites it |
| `sourceNormalizationReportRef` | `ArtifactRef` pointing at the consumed `CapabilityNormalizationReport` |
| `summary.totalPhrases` | total `CapabilityPhrase` entries in this report |
| `summary.stable` | count with `status === "stable"` |
| `summary.partial` | count with `status === "partial"` (reserved; always `0` in v1) |
| `summary.lowConfidence` | count with `status === "low-confidence"` (reserved; always `0` in v1) |
| `summary.withDomain` | count of phrases with a populated `domain` |
| `summary.withPattern` | count of phrases with a populated `pattern` |
| `summary.withLayer` | count of phrases with a populated `layer` |
| `phrases[]` | one entry per projected `CapabilityPhrase` |

Each `CapabilityPhrase` entry carries:

| Field | Status | Meaning |
| --- | --- | --- |
| `id` | required | deterministic per-report identifier (`phrase-<candidate-id>-<verb>-<noun>`) |
| `verb` | required | canonical verb from the source normalization claim |
| `noun` | required | canonical noun from the source normalization claim |
| `confidence` | required | `"high"` / `"medium"` / `"low"` — derived from the source claim |
| `evidenceRefs` | required | `ArtifactRef[]` citing contributing artifacts (typically the upstream `EvidenceGraph`) |
| `sourceCandidateIds` | required | `string[]` of source `CapabilityNormalizationReportCandidate.id` values |
| `status` | required | `"stable"` (v1 projection), `"partial"` (reserved), or `"low-confidence"` (reserved) |
| `qualifier` | partial | lexical-split tokens beyond verb / noun (v1 leaves absent unless deterministic evidence exists) |
| `domain` | partial | coarse business / system domain (v1 leaves absent unless ownership / path evidence is already present) |
| `pattern` | partial | recognized architecture pattern (v1 leaves absent unless deterministic evidence) |
| `layer` | partial | repo-layer placement (v1 leaves absent unless deterministic evidence) |
| `sideEffects` | future | reserved — populated by future evidence-source slices |
| `inputs` / `outputs` | future | reserved — populated by future evidence-source slices |
| `message` | partial | optional human-readable note (always informational) |

## V1 Projection Rules

v1 is conservative. A `CapabilityPhrase` is emitted **only
when** all of the following hold for a normalization
candidate:

- `candidate.status === "normalized"`
- `candidate.normalized` exists with both `verb` and `noun`
- `candidate.confidence === "high"`
- the source candidate's lexical split was high-confidence

No phrase is emitted for:

- `unknown-verb` candidates
- `unknown-noun` candidates
- `unknown` candidates
- `ignored` candidates
- `low-confidence` candidates
- medium-confidence normalized rows

Status assignment in v1:

- `stable` — v1's default for every emitted phrase.
- `partial` — reserved for future deterministic
  domain / pattern / layer enrichments. Not emitted in v1.
- `low-confidence` — reserved. Not emitted in v1.

Non-emitted candidates remain inspectable in the source
`CapabilityNormalizationReport`. The phrase report is a
projection cleanup boundary, not an alternate audit.

## Deterministic IDs and Ordering

Phrase IDs follow the deterministic pattern:

```
phrase-<candidate-id>-<verb>-<noun>
```

Identical normalization reports always produce identical
phrase ids. Re-running the projector against the same input
yields byte-identical phrase rows (modulo the header
timestamp, which is the artifact's only nondeterministic
field).

Phrases are sorted by:

1. source candidate `path` (alphabetic);
2. `verb` (alphabetic);
3. `noun` (alphabetic);
4. first `sourceCandidateIds` entry (alphabetic).

No nondeterministic timestamps appear inside phrase entries.

## Evidence Sources (v1)

Allowed:

- `CapabilityNormalizationReport` normalized claims —
  primary source of `verb`, `noun`, `confidence`,
  `sourceCandidateIds`.
- `EvidenceGraph` source refs — provenance citation. Cited
  in `header.inputRefs` and per-phrase `evidenceRefs` when
  the source candidate's `source.artifactRef` is populated.
- `ObservedRepo` / `OwnershipMap` / repo-archetype overlays
  — reserved for future `domain` / `pattern` / `layer`
  enrichment. Not used in v1.

Deferred (future enrichment, behind their own decision
memos):

- AST / typechecker call graph.
- Runtime side-effect evidence.
- API schemas / input-output contracts.
- Test-to-capability mapping.
- LLM-generated semantic labels.

Pin: **AST / typechecker evidence is optional enrichment,
not foundational truth.** Pin: **No LLM-only inference.**

## What This Artifact Is Not

- **Not the translation audit.** That is
  `CapabilityNormalizationReport`. The audit shape is
  unchanged.
- **Not a `CapabilityMap`.** Layer 6 integration is
  deferred. `CapabilityMap` v2 will consume this report
  later.
- **Not a `CapabilityContract`.** Contract is the future
  policy / preservation layer.
- **Not a `RefactorPreservationContract`.** That is a
  phase-specific projection of contract policy.
- **Not LLM output.** v1 projection is pure deterministic
  filtering over normalized rows.
- **Not a source-write trigger.** Source-write apply
  remains unavailable across the entire ontology track.

## Operator Workflow

1. Run `rekon refresh` (or `rekon observe`) to write a fresh
   `EvidenceGraph`.
2. Run `rekon capability ontology normalize` to produce the
   `CapabilityNormalizationReport`.
3. Run
   `rekon capability phrase project --report <CapabilityNormalizationReport:id> [--json]`.
4. Read the report. The summary shows how many high-
   confidence claims projected into stable phrases.

The CLI command is the canonical surface; the
`buildCapabilityPhraseReport` helper is exported from
`@rekon/capability-ontology` for callers building tooling
on top.

## CLI Surface

```bash
rekon capability phrase project \
  --report <CapabilityNormalizationReport-id|type:id> \
  [--root <path>] [--json]
```

- `--report` is required.
- Reads the referenced `CapabilityNormalizationReport`.
- Writes a single `CapabilityPhraseReport` under
  `.rekon/artifacts/projections/`.
- `--json` emits the canonical report. Human-mode prints a
  short summary and ends with *"CapabilityMap remains
  unchanged."*.

## Publication Surfacing

The `architecture-summary` and `agent-contract` publishers
read the latest `CapabilityPhraseReport` and surface it
inline:

- **Architecture summary** renders a `## Capability
  Phrases` section with the report ref, source
  `CapabilityNormalizationReport` ref, summary counts
  (`totalPhrases`, `stable`, `partial`, `lowConfidence`,
  `withDomain`, `withPattern`, `withLayer`), and a bounded
  phrase table (verb, noun, status, confidence, evidence
  count). When no report exists the section emits guidance
  directing the operator at
  `rekon capability phrase project --report
  <CapabilityNormalizationReport:id> --json`.
- **Agent contract** renders a `### Capability Phrases`
  subsection inside the operating-state group with the
  same metadata, and appends a `Do Not Do` reminder
  pinning that **`CapabilityPhraseReport` entries are not
  `CapabilityMap` ownership or placement policy** —
  `CapabilityPhraseReport` is semantic purpose projection,
  `CapabilityNormalizationReport` remains translation
  audit, and `CapabilityMap` integration remains deferred.

Both publications cite the report in `header.inputRefs`
when present so freshness propagates: when a new
`CapabilityPhraseReport` lands,
`rekon artifacts freshness` flags the publications stale
via the manifest's `capability-phrases.changed`
invalidation rule.

Both publishers are strictly **read-only**:

- Publication generation never runs phrase projection
  (`rekon capability phrase project` is never invoked
  from inside a publisher).
- They never run normalization.
- The architecture summary publisher never mutates
  `CapabilityMap`.
- The agent contract publisher never mutates
  `CapabilityMap`.
- They never mutate `CapabilityPhraseReport`,
  `CapabilityNormalizationReport`, `EvidenceGraph`,
  the review ledger, or the suggestion report.
- They never write a new `CapabilityPhraseReport`.

**Proof report surfacing is deferred.** `CapabilityPhraseReport`
is semantic context, not verification proof; surfacing it
in the proof report would mix semantic projection with
proof status. A future slice may revisit once an
appropriate proof-side section exists.

The
[`@rekon/capability-docs` `buildCapabilityPhrasePublicationSection`
helper](../../packages/capability-docs/src/index.ts) is the
pure renderer both publishers call. It accepts `report` +
`reportRef` + `headingLevel` (`2` for architecture summary,
`3` for agent contract) + `tableLimit` (default 10) and
returns `{ lines, inputRef? }`.

## Forward Compatibility

- **`partial` is now emitted** by Phrase Enrichment v1
  (shipped). A `partial` phrase requires (a) the
  candidate is normalized, (b) confidence and split are
  both at least `"medium"`, (c) the candidate does
  **not** meet the stable threshold, AND (d) at least
  one deterministic enrichment field (`domain` /
  `pattern` / `layer`) is present. Partial phrases are
  **semantic context, not `CapabilityMap`-ready
  placement or ownership policy**. See
  [Phrase Enrichment v1 Memo](../strategy/capability-phrase-enrichment-v1.md).
- `low-confidence` remains reserved; not emitted in v1
  or in Phrase Enrichment v1.
- `qualifier[]` / `sideEffects[]` / `inputs[]` /
  `outputs[]` remain deferred. Each ships behind its own
  decision memo.
- The
  [CapabilityPhraseReport Real-Repo Coverage Review](../strategy/capability-phrase-report-coverage-review.md)
  measured phrase output on a fixture (`examples/simple-js-ts`)
  and one real Next.js TypeScript target (`target-1`):
  16 stable phrases on 9,110 candidates (0.18%; 6.6% of
  normalized). Phrase quality is high; coverage is sparse.
  The next slice is **phrase enrichment v1**.
- `CapabilityMap` v2 will consume `CapabilityPhraseReport`,
  not raw `CapabilityNormalizationReport` rows. v2 ships
  only after phrase claims stabilize across multiple cohort
  targets — the
  [CapabilityPhraseReport Safety Review](../strategy/capability-phrase-report-safety-review.md)
  pins **`CapabilityMap` integration remains deferred until
  phrase coverage is measured on real repos**, and **only
  stable high-confidence phrases are eligible for future
  `CapabilityMap` v2**. The coverage review re-confirms the
  deferral: **CapabilityMap v2 is evidence-gated.**
- The safety review also pins that `CapabilityPhraseReport`
  is **semantic purpose projection, not ownership or
  placement policy**, and that **proof report surfacing
  remains deferred because phrase projection is semantic
  context, not verification proof**.
- `CapabilityContract` is the future policy / preservation
  layer; it binds a phrase to allowed layers / required
  checks / required + forbidden neighbours / preservation
  rules. Not implemented in v1.

### Upstream Stable-Density Lever

Stable phrase density depends on the upstream
`EvidenceGraph` provider for each language. Three
coverage reviews (real-repo, enrichment, post-quality)
+ two runtime slices (phrase enrichment v1,
candidate-quality v1) did not move the stable
foundation. The
[CapabilityPhraseReport Post-Quality Coverage Review](../strategy/capability-phrase-post-quality-coverage-review.md)
identified the evidence model itself as the
bottleneck. The
[Classic Scanner/Ontology Parity Audit](../strategy/classic-scanner-ontology-parity-audit.md)
selected the JS/TS AST adapter as the next slice; the
[JS/TS AST Evidence Adapter Decision](../strategy/js-ts-ast-evidence-adapter-decision.md)
(twenty-third slice) committed to **parser-only AST
extraction using the TypeScript compiler parser API**;
and the **JS/TS AST EvidenceGraph Provider v1**
(twenty-fourth slice) has now shipped — see
[`EvidenceGraph` artifact reference](evidence-graph.md).
**AST facts may improve stable phrase density** by
expanding candidate coverage (class methods,
arrow-function assignments, accurate type-vs-value
distinctions) without changing this report's shape or
projection rules. The
[Post-AST CapabilityPhraseReport Coverage Review](../strategy/post-ast-capability-phrase-coverage-review.md)
(twenty-fifth slice) measured the impact on available
targets: on the AST-rich fixture, **6 stable phrases
on 66 candidates** with meaningful pairs (`create:user`,
`fetch:user`, `handle:request`). The
[Post-AST Cohort Re-Run](../strategy/post-ast-cohort-rerun.md)
(twenty-sixth slice) completed the real-repo
measurement: **`target-1` (Next.js TS scale): 16 →
37 stable phrases (+131.3%, 2.3× lift)** with
textbook pairs `get:response` (14), `build:plan`
(13), `get:schema` (12), `get:session` (10),
`save:response` (8), `build:report` (8).
**`target-2` (small TS + workflows): 2 → 2 stable
phrases** — unchanged, no regression. **The
readiness gate accepts narrower evidence; the
[CapabilityMap v2 High-Confidence-Only Decision](../strategy/capability-map-v2-high-confidence-decision.md)
(twenty-seventh slice) has now shipped.** The
decision commits Rekon to an **additive** `CapabilityMap`
v2 projection consuming **only stable high-confidence
phrase claims** (the same threshold this report's
safety review pinned). v2 is additive over v1 — the
existing `CapabilityMap` `entries[]` field stays
untouched, and the new `phraseBackedCapabilities` /
`phraseBackedSummary` / `phraseSourceRef` fields are
optional. `CapabilityMap` v2 implementation is the
next slice; until that ships, this report remains
the canonical semantic-purpose projection layer.
**The stable threshold remains unchanged.** **AST v1
does not mutate `CapabilityMap`** — `CapabilityMap`
v2 stays evidence-gated on the post-AST coverage
review.

## See Also

- [`CapabilityNormalizationReport` artifact
  reference](capability-normalization-report.md) — Layer 5
  translation audit consumed by this report.
- [`CapabilityNormalizationReviewLedger` artifact
  reference](capability-normalization-review-ledger.md) —
  operator decisions over unknown / low-confidence
  normalization rows (separate concern from phrase
  projection).
- [`CapabilityOntologySuggestionReport` artifact
  reference](capability-ontology-suggestion-report.md) —
  preview-only override-file proposals (separate concern).
- [Capability ontology
  concept](../concepts/capability-ontology.md) — overall
  layered ontology model.
- [CapabilityPhrase + CapabilityContract Architecture
  Decision](../strategy/capability-phrase-contract-architecture-decision.md)
  — the architectural reservation that this artifact
  realizes.
- [CapabilityPhraseReport Decision](../strategy/capability-phrase-report-decision.md)
  — the carrier commitment (Option B) this artifact
  implements.
- [CapabilityPhraseReport Safety Review](../strategy/capability-phrase-report-safety-review.md)
  — verbatim guarantees pinning that phrases are semantic
  purpose projection (not ownership or placement policy),
  `CapabilityNormalizationReport` remains the translation
  audit, `CapabilityMap` integration stays deferred until
  real-repo phrase coverage is measured, proof report
  surfacing stays deferred, and only stable high-confidence
  phrases are eligible for future `CapabilityMap` v2.
- [CapabilityPhraseReport Real-Repo Coverage Review](../strategy/capability-phrase-report-coverage-review.md)
  — measures phrase output on a fixture + one real
  Next.js TS target. 16 stable phrases on 9,110
  candidates; pins **`CapabilityMap` v2 is
  evidence-gated** and selects **phrase enrichment v1**
  as the next slice.
- [CapabilityPhraseReport Phrase Enrichment v1](../strategy/capability-phrase-enrichment-v1.md)
  — adds deterministic `domain` / `pattern` / `layer`
  enrichment from `ObservedRepo` + `OwnershipMap`,
  enables `partial` emission, keeps the stable
  threshold unchanged. Coverage on `target-1` rose 15×
  (16 → 239 phrases).
- [CapabilityPhraseReport Enrichment Coverage Review](../strategy/capability-phrase-enrichment-coverage-review.md)
  — measured stable + partial + enrichment-field
  coverage after Phrase Enrichment v1. Verdict: stable
  count unchanged at 16; partial coverage rich; next
  slice is candidate-quality improvements; `CapabilityMap`
  v2 stays deferred.
- [CapabilityPhraseReport Post-Quality Coverage Review](../strategy/capability-phrase-post-quality-coverage-review.md)
  — measured fixture + target-1 + new target-2 after
  Candidate-Quality v1. Verdict: stable count unchanged
  on `target-1` (third coverage review confirming
  this); `target-2` shows same ~3% normalization
  ceiling. Identified the evidence model itself as the
  bottleneck.
- [Classic Scanner/Ontology Parity Audit](../strategy/classic-scanner-ontology-parity-audit.md)
  — twenty-second slice. Selected AST extraction as
  the next product slice based on classic prior art.
- [JS/TS AST Evidence Adapter Decision](../strategy/js-ts-ast-evidence-adapter-decision.md)
  — twenty-third slice; the upstream stable-density
  lever. Selects the TypeScript compiler parser API
  for parser-only AST v1. Pins regex as fallback only.
  Expected to improve stable phrase density without
  changing this report's shape.
- [Capability Ontology Translation Layer Decision](../strategy/capability-ontology-translation-layer-decision.md)
  — the eight-layer model. Layer 6 (`CapabilityMap`) will
  eventually consume this report.
- [Capability Ontology Canon + Override Model Decision](../strategy/capability-ontology-canon-override-model-decision.md)
  — canon packs + overrides supply the canonical
  vocabulary phrases anchor on.

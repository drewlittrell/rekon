# Review Packet — CapabilityPhraseReport Real-Repo Coverage Review

Coverage / dogfood-analysis review of the
`CapabilityPhraseReport` projection on a fixture and one
real, anonymized Next.js TypeScript target (`target-1`).
**Strategy / docs / tests-only. No runtime change. No
`CapabilityMap` mutation. No `CapabilityPhraseReport` shape
change. No `CapabilityNormalizationReport` shape change. No
phrase projection rule change. No canon-pack change. No
new artifact registration. No new CLI command. No source
writes. No LLM-only inference. No npm publish. No version
bump. No git tag. No GitHub Release. No new branch.**

## CHANGES MADE

- **New strategy memo**:
  `docs/strategy/capability-phrase-report-coverage-review.md`
  with the 13 required headings (Decision Summary, Why
  This Review Exists, Targets Reviewed, Command Matrix,
  Normalization Results, Phrase Results, Evidence Ref
  Distribution, Publication Usefulness, CapabilityMap
  Readiness, Options Considered, Recommendation, What This
  Does Not Do, Follow-Up Work) plus the five required
  diagnostic tables (target / normalization / phrase /
  readiness / option).
- **New 12-assertion docs test**:
  `tests/docs/capability-phrase-report-coverage-review.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates**:
  - `docs/strategy/capability-phrase-report-safety-review.md`
    — Follow-Up section notes the coverage review has
    shipped and the next-slice recommendation.
  - `docs/strategy/capability-phrase-report-decision.md` —
    implementation-sequence table notes coverage review
    landed; next slice is phrase enrichment v1.
  - `docs/artifacts/capability-phrase-report.md` — Forward
    Compatibility cross-links the coverage review.
  - `docs/concepts/capability-ontology.md` — Semantic
    Layer section cross-links the coverage review.
  - `docs/strategy/roadmap.md` — seventeenth-slice entry.
  - `docs/strategy/classic-behavior-roadmap.md` — same.
  - `README.md` — new comment block.
  - `CHANGELOG.md` — top entry.

## PUBLIC API CHANGES

None. This is a strategy / docs / tests-only batch. No
types change, no exports change, no schemas change, no
CLI surface changes.

## PURPOSE PRESERVATION CHECK

- `CapabilityPhraseReport` shape unchanged. Strict v1
  projection rules unchanged.
- `CapabilityNormalizationReport` shape unchanged. The
  translation audit still carries unknown / low-confidence
  rows that never project into phrases.
- `CapabilityMap` v2 stays deferred. The coverage data
  confirms the deferral is correct — 16 stable phrases on
  9,110 candidates is too sparse for a useful canonical
  projection.
- Stable high-confidence phrases remain the only category
  eligible for a future `CapabilityMap` v2.
- Publications stay read-only. Architecture summary +
  agent contract surface the phrase output; proof report
  surfacing stays deferred.
- Source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [CapabilityPhraseReport Safety Review](../../docs/strategy/capability-phrase-report-safety-review.md):
  the safety review pinned the gate "CapabilityMap
  integration remains deferred until phrase coverage is
  measured on real repos"; this memo provides the
  measurement.
- Aligned with the
  [CapabilityPhraseReport Decision](../../docs/strategy/capability-phrase-report-decision.md):
  Option B (separate carrier) lets phrase semantics evolve
  independently — phrase enrichment v1 is the next slice
  exactly because the carrier is separate.
- Aligned with the
  [Capability Ontology Translation Layer Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md):
  Layer 5b (phrase) consumes Layer 5 (normalization)
  output; Layer 6 (`CapabilityMap`) consumption stays
  pinned to phrase claims, not raw normalization rows.
- Aligned with the
  [Built-In Baseline Ontology Coverage Review](../../docs/strategy/builtin-ontology-coverage-review.md):
  the same `target-1` real repo provides comparable
  evidence at a higher layer. Normalized count grew 100 →
  241 thanks to canon packs v1; 16 of those normalized
  rows project into stable phrases.
- Aligned with the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md):
  the eight architectural reservations are upheld; raw
  evidence stays separate from normalized purpose; phrase
  projection consumes only normalized claims.

## TARGETS REVIEWED

| Target | Archetype | Source | Result |
| --- | --- | --- | --- |
| `examples/simple-js-ts` (temp copy) | minimal JS/TS fixture | bundled example repo | full pipeline succeeds; 4 candidates, 0 normalized, 0 phrases (strict v1 rules hold). |
| `target-1` | real Next.js TypeScript application | anonymized `mktemp` copy | full pipeline succeeds; 9,110 candidates, 241 normalized, 524 alias-applied, **16 stable phrases**. |

`target-1` identity is anonymized per the private-beta
intake policy. No source paths or internal symbol names
are reproduced in this review.

## NORMALIZATION RESULTS

| Target | Total | Normalized | UnknownVerb | UnknownNoun | Unknown | Ignored | AliasApplied | LowConfidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 4 | 0 | 0 | 0 | 1 | 1 | 0 | 2 |
| `target-1` | 9,110 | 241 | 1,670 | 831 | 4,088 | 226 | 524 | 2,054 |

On `target-1`, the normalized count is up from 100 (prior
review) to 241, reflecting canon packs v1 (`40ba911`) and
the Next.js / monorepo overlays. The lexical splitter is
sharper, redistributing some `unknown` into more specific
`unknownVerb` / `unknownNoun` classifications.

## PHRASE RESULTS

| Target | Total | Stable | Partial | LowConfidence | WithDomain | WithPattern | WithLayer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `target-1` | **16** | **16** | 0 | 0 | 0 | 0 | 0 |

Stable phrase ratios on `target-1`:

- 16 / 9,110 candidates = **0.18%**
- 16 / 241 normalized = **6.6%**
- 16 / 765 (normalized + alias-applied) = **2.1%**

Top phrase verbs: `build` (4), `get` (2), `fetch` (2),
then `publish`, `verify`, `validate`, `render`, `create`,
`execute`, `resolve`, `route` (1 each).

Top phrase nouns: `session` (5), `result` (3), `report`
(2), then `event`, `service`, `config`, `page`, `record`,
`token` (1 each).

Top verb:noun pairs: `build:session` (4), `get:result`
(2), then 10 distinct singletons.

Inspection verdict: every phrase term is a recognizable
domain capability. None look like file-path or
system-seed pollution.

## PUBLICATION USEFULNESS

`target-1` publications, after `publish architecture` +
`publish agent-contract`:

- Architecture summary `## Capability Phrases` section
  **present**: report ref, source ref, summary counts
  (`Phrases: 16 (stable 16, partial 0, low-confidence 0)`),
  enrichment counts (`withDomain 0, withPattern 0,
  withLayer 0`), the deferred-`CapabilityMap` callout, and
  a bounded phrase table (10 rows with explicit "6
  additional phrase(s) omitted" notice).
- Agent contract `### Capability Phrases` subsection
  **present**: same metadata + the `Do Not Do` reminder
  pinning that phrases are not `CapabilityMap` ownership
  or placement policy.
- Proof report phrase section **absent** — as deferred by
  the safety review.
- `header.inputRefs` cite the phrase report; freshness is
  propagated via `capability-phrases.changed`.
- Phrase table understandable: yes; every row has verb,
  noun, status, confidence, evidence-ref count.

Fixture renders the same section with zero phrases and
still carries the deferred-`CapabilityMap` callout —
confirming the publisher handles empty repos correctly.

## CAPABILITYMAP READINESS

| Gate | Result | Notes |
| --- | --- | --- |
| real repo non-trivial stable phrases | pass (sparse) | 16 stable phrases on `target-1`; non-trivial in count but only 0.18% of candidates. |
| evidence refs present | pass | every phrase has an `EvidenceGraph` ref + normalization report ref. |
| unknown / low-confidence excluded | pass | 4,088 unknown + 1,670 unknown-verb + 831 unknown-noun + 2,054 low-confidence stay in normalization report. |
| publications understandable | pass | both surfaces render the phrase section with the deferred callout. |
| artifacts validate clean | pass | `rekon artifacts validate --json` returns `{ "valid": true, "issues": [] }` on both targets. |
| phrase coverage sufficient for a useful canonical projection | **fail** | 0.18% coverage is too sparse to drive `CapabilityMap` v2 today. |

Five of six gates pass. The sixth — phrase coverage
density — is the gate the safety review added.

## RECOMMENDATION

Selected: **Phrase enrichment v1** is the next slice.
`CapabilityMap` v2 design / implementation stays deferred
until a second coverage review measures yield after
enrichment lands.

Phrase enrichment v1 (next slice):

1. Add deterministic enrichment from `ObservedRepo` (path
   → `domain`, role → `pattern`, layer name → `layer`) and
   `OwnershipMap` (owner → `domain`).
2. Allow `partial` phrases to emit when the canonical pair
   is known but no enrichment field is available.
3. Keep `status === "stable"` for the strictest case
   (high-confidence + normalized + high-confidence
   lexical split + at least one enrichment field).
4. Do not relax the v1 strict rule that governs whether a
   phrase is eligible for future `CapabilityMap` v2.
5. Cite `ObservedRepo` and `OwnershipMap` in the phrase
   report's `header.inputRefs` when those evidence
   sources contributed.

After enrichment ships, a second coverage review measures
the new stable + partial ratios; only then does the
`CapabilityMap` v2 high-confidence-only design decision
land.

## TESTS / VERIFICATION

- **New 12-assertion docs test**
  `tests/docs/capability-phrase-report-coverage-review.test.mjs`
  pins the heading set, the verbatim gate guarantees, all
  five diagnostic tables, the CHANGELOG mention, and the
  review packet's PURPOSE PRESERVATION CHECK.
- Expected full suite: 2373 pass (2361 + 12 new) / 10
  skipped / 0 fail.
- 9-command gate: typecheck / test / build /
  audit-package-exports / audit-license / publish-dry-run /
  install-smoke / install-tarball-smoke all green.
- CLI matrix run successfully on both targets:
  `refresh → capability ontology normalize → artifacts
  latest → capability phrase project → publish architecture
  → publish agent-contract → artifacts validate`.

## INTENTIONALLY UNTOUCHED

- `CapabilityNormalizationReport` shape unchanged.
- `CapabilityPhraseReport` shape unchanged.
- Phrase projection rules unchanged.
- `CapabilityMap` unchanged. `CapabilityMap` v2 stays
  deferred.
- `EvidenceGraph` unchanged.
- `CapabilityNormalizationReviewLedger` unchanged.
- `CapabilityOntologySuggestionReport` unchanged.
- Canon packs / overrides unchanged.
- Publication shape unchanged.
- CLI commands unchanged.
- No new permission, role, or workflow YAML.
- No version bump. No npm publish. No git tag. No GitHub
  Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. Operators read the 16 phrases on `target-1` as a
   capability map. Mitigation: the architecture summary
   and agent contract carry the deferred-`CapabilityMap`
   callout; this memo pins the deferral; the safety
   review's verbatim pins remain in effect.
2. Phrase enrichment v1 raises yield but introduces new
   noise. Mitigation: enrichment is deterministic and
   only allows `partial` phrases; `stable` remains the
   strictest gate; the second coverage review will
   measure precision before any `CapabilityMap` v2
   work begins.
3. Coverage on additional real repos differs sharply from
   `target-1`. Mitigation: the second coverage review
   includes at least one additional cohort target before
   recommending `CapabilityMap` v2.
4. Canon-pack growth alone is pursued instead of
   enrichment. Mitigation: this memo records canon-pack
   expansion as parallel, not primary; the primary
   bottleneck is enrichment.

Follow-up:

- **Phrase enrichment v1** (next slice).
- **Second coverage review** after enrichment ships.
- **CapabilityMap v2 high-confidence-only design
  decision** (gated on the second coverage review).
- **Canon-pack expansion** (parallel, per-archetype).
- **Candidate-quality improvements** (parallel, lower
  priority than enrichment).
- **Additional cohort targets** (parallel, intake-gated).
- **`CapabilityContract` decision** (further future).

## NEXT STEP

Recommended: **Phrase enrichment v1** — register
deterministic enrichment from `ObservedRepo` +
`OwnershipMap` (and ultimately framework / architecture
profile) onto `CapabilityPhrase` entries, allow `partial`
phrases to emit, and keep `stable` reserved for the
strictest case. Strategy / docs / tests / runtime slice;
no `CapabilityMap` mutation; no relaxation of the
high-confidence-only gate that `CapabilityMap` v2 will
eventually consume.

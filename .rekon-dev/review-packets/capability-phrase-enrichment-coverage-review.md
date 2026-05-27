# Review Packet — CapabilityPhraseReport Enrichment Coverage Review

Coverage / dogfood-analysis review measuring phrase
output **after** Phrase Enrichment v1 on a fixture +
`target-1` real repo. Compares against the pre-enrichment
coverage review. **Strategy / docs / tests-only. No
runtime change. No `CapabilityMap` mutation. No
`CapabilityPhraseReport` shape change. No
`CapabilityNormalizationReport` shape change. No phrase
projection rule change. No canon-pack change. No new
artifact registration. No new CLI command. No source
writes. No LLM-only inference. No npm publish. No version
bump. No git tag. No GitHub Release. No new branch.**

## CHANGES MADE

- **New strategy memo**:
  `docs/strategy/capability-phrase-enrichment-coverage-review.md`
  with the 14 required headings (Decision Summary, Why
  This Review Exists, Targets Reviewed, Command Matrix,
  Normalization Results, Phrase Results, Enrichment
  Coverage, Evidence Ref Distribution, Publication
  Usefulness, CapabilityMap Readiness, Options
  Considered, Recommendation, What This Does Not Do,
  Follow-Up Work) plus the six required diagnostic
  tables (target / normalization / phrase / enrichment /
  readiness / option).
- **New 14-assertion docs test**:
  `tests/docs/capability-phrase-enrichment-coverage-review.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates**:
  - `docs/strategy/capability-phrase-enrichment-v1.md` —
    Follow-Up section notes the second coverage review
    has shipped and the next-slice recommendation.
  - `docs/strategy/capability-phrase-report-coverage-review.md`
    — Follow-Up section cross-links the new review.
  - `docs/strategy/capability-phrase-report-safety-review.md`
    — Follow-Up section updated.
  - `docs/artifacts/capability-phrase-report.md` —
    Forward Compatibility cross-links the second
    coverage review.
  - `docs/concepts/capability-ontology.md` — Semantic
    Layer section cross-links the second coverage
    review.
  - `docs/strategy/roadmap.md` — nineteenth-slice entry.
  - `docs/strategy/classic-behavior-roadmap.md` — same.
  - `README.md` — new comment block.
  - `CHANGELOG.md` — top entry.

## PUBLIC API CHANGES

None. This is a strategy / docs / tests-only batch. No
types change, no exports change, no schemas change, no
CLI surface changes.

## PURPOSE PRESERVATION CHECK

- `CapabilityPhraseReport` shape unchanged. Strict v1 +
  enrichment-v1 projection rules unchanged.
- `CapabilityNormalizationReport` shape unchanged. The
  translation audit still carries the unknown / low-
  confidence rows that never project.
- `CapabilityMap` v2 stays deferred. The measured stable
  count (16) is **unchanged** from the pre-enrichment
  baseline; enrichment moved partial coverage, not
  stable coverage.
- Stable high-confidence phrases remain the only
  category eligible for future `CapabilityMap` v2.
  Partial phrases are explicitly **not**
  `CapabilityMap`-ready placement or ownership policy.
- Publications stay read-only. Architecture summary +
  agent contract surface the phrase output (including
  partial counts); proof report surfacing stays
  deferred.
- Source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [Phrase Enrichment v1 Memo](../../docs/strategy/capability-phrase-enrichment-v1.md):
  the enrichment slice promised `partial` emission +
  unchanged stable threshold + deterministic enrichment.
  All three are confirmed by measurement here.
- Aligned with the
  [Pre-Enrichment Coverage Review](../../docs/strategy/capability-phrase-report-coverage-review.md):
  selected this review as the explicit gate the
  enrichment v1 slice would have to pass before any
  `CapabilityMap` v2 decision moves forward. This memo
  is the gate firing.
- Aligned with the
  [CapabilityPhraseReport Safety Review](../../docs/strategy/capability-phrase-report-safety-review.md):
  five verbatim pins preserved (semantic projection ≠
  placement policy; `CapabilityNormalizationReport`
  remains translation audit; `CapabilityMap` deferred;
  proof report deferred; only stable phrases eligible).
- Aligned with the
  [Built-In Baseline Ontology Coverage Review](../../docs/strategy/builtin-ontology-coverage-review.md):
  the `normalized` bottleneck identified in that review
  (97.4% non-normalized) is the same bottleneck this
  review identifies as the next-slice target.

## TARGETS REVIEWED

| Target | Archetype | Source | Result |
| --- | --- | --- | --- |
| `examples/simple-js-ts` (temp copy) | minimal JS/TS fixture | bundled example repo | full pipeline succeeds; 4 candidates, 0 normalized, 0 phrases. Enrichment context available but no normalized candidates to enrich. |
| `target-1` | real Next.js TypeScript application | anonymized `mktemp` copy | full pipeline succeeds; 9,110 candidates, 241 normalized, 524 alias-applied, **239 total phrases (16 stable + 223 partial; 0 low-confidence)**. |

`target-1` identity is anonymized per the private-beta
intake policy. No source paths or internal symbol names
are reproduced in this review.

## NORMALIZATION RESULTS

| Target | Total | Normalized | UnknownVerb | UnknownNoun | Unknown | Ignored | AliasApplied | LowConfidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 4 | 0 | 0 | 0 | 1 | 1 | 0 | 2 |
| `target-1` | 9,110 | 241 | 1,670 | 831 | 4,088 | 226 | 524 | 2,054 |

Normalization counts are identical to the pre-enrichment
review — the normalizer was not touched by enrichment v1.

## PHRASE RESULTS

| Target | Total | Stable | Partial | LowConfidence | WithDomain | WithPattern | WithLayer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `target-1` | **239** | **16** | **223** | 0 | **239** | 0 | **95** |

Before / after delta on `target-1`:

| Metric | Pre-enrichment | Post-enrichment | Delta |
| --- | ---: | ---: | --- |
| Total phrases | 16 | 239 | +1394% |
| Stable phrases | 16 | 16 | **0 (unchanged)** |
| Partial phrases | 0 | 223 | +223 |
| withDomain | 0 | 239 | +239 |
| withPattern | 0 | 0 | unchanged |
| withLayer | 0 | 95 | +95 |

Top stable verbs: `build`, `get`, `fetch`, `publish`,
`verify`, `validate`, `render`, `create`, `execute`,
`resolve`, `route`. Top stable pairs: `build:session` (4),
`get:result` (2), and 10 singletons. All recognizable
domain capability terms.

Top partial verbs: `save` (51), `get` (46), `build`
(44), `normalize` (15), `resolve` (13), `create` (10).
Top partial nouns: `schema` (40), `response` (30),
`request` (20), `route` (20), `plan` (18). Top partial
pairs: `save:schema` (24), `save:request` (16),
`get:response` (14), `build:plan` (13). All meaningful;
no noise.

## ENRICHMENT COVERAGE

| Target | Stable Ratio | Total Phrase Ratio | Domain Coverage | Pattern Coverage | Layer Coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 0% | 0% | n/a | n/a | n/a |
| `target-1` (stable only) | 0.18% | n/a | 100% | 0% | 56% |
| `target-1` (all phrases) | n/a | 2.6% | 100% | 0% | 40% |

Five unique domains emitted: `app`, `core`, `infra`,
`src`, `tools`. Only one layer emitted: `test` (other
`OwnershipMap` entries had `layer === "unknown"` and
were filtered as non-enriching at the source — correct
behaviour). Zero patterns emitted because `target-1`'s
`ObservedRepo` doesn't populate `systems[].kind`
meaningfully (upstream `ObservedRepo` projector
limitation, not a phrase-projection limitation).

## CAPABILITYMAP READINESS

| Gate | Result | Notes |
| --- | --- | --- |
| real repo non-trivial stable phrases | pass (sparse) | 16 stable phrases on `target-1`; unchanged by enrichment. |
| stable evidence refs present | pass | every stable phrase has an `EvidenceGraph` ref + the source normalization report. |
| stable terms meaningful | pass | all 16 stable verb:noun pairs are recognizable domain terms. |
| partials not used for CapabilityMap | pass | design + Do Not Do reminder + docs test all pin this. |
| publications understandable | pass | both surfaces render partial counts + deferred callout. |
| artifacts validate clean | pass | `rekon artifacts validate --json` returns `{ "valid": true, "issues": [] }` on both targets. |
| stable coverage sufficient for canonical projection | **fail** | stable count unchanged at 16 (0.18% of candidates) — enrichment moved partial coverage, not stable coverage. The bottleneck is the upstream `normalized` count (241 of 9,110 = 2.6%). |

Six of seven gates pass. The seventh — stable coverage
density — has not moved.

## RECOMMENDATION

Selected: **`CapabilityMap` v2 stays deferred. Candidate-
quality improvements is the next slice.** Specifically:

1. **Canon-pack expansion** — promote frequently-
   appearing partial-only verbs and nouns into canonical
   vocabulary (e.g., `save:schema` (24), `save:request`
   (16), `get:response` (14), `build:plan` (13)). If
   these pairs were canonical, the candidates would
   normalize at high confidence and produce *stable*
   phrases.
2. **Lexical-splitter sharpening** — the 1,670 unknown-
   verb and 831 unknown-noun rows on `target-1` are
   candidates where the splitter found a token shape but
   couldn't match the canonical vocabulary. Sharper
   splitter rules can recover some of these.
3. Each landing slice must leave the stable threshold
   untouched, run the same coverage matrix to measure
   delta, and preserve partial-phrase usefulness for
   publication / agent context.
4. After at least one canon-pack expansion + lexical-
   splitter sharpening slice ships, a **third coverage
   review** revisits the `CapabilityMap` v2 gate.

Phrase enrichment v2 (framework / architecture-profile
enrichment) is parallel; it primarily raises `pattern`
coverage (currently 0%) but does not move stable count.

## TESTS / VERIFICATION

- **New 14-assertion docs test**
  `tests/docs/capability-phrase-enrichment-coverage-review.test.mjs`
  pins the heading set, the verbatim guarantees, all six
  diagnostic tables, the CHANGELOG mention, and the
  review packet's PURPOSE PRESERVATION CHECK.
- Expected full suite: 2419 pass (2405 + 14 new) / 10
  skipped / 0 fail.
- 9-command gate: typecheck / test / build / git diff
  --check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke / install-tarball-smoke
  all expected green.
- CLI matrix run successfully on both targets;
  `artifacts validate` clean on both.

## INTENTIONALLY UNTOUCHED

- `CapabilityNormalizationReport` shape and semantics
  unchanged.
- `CapabilityPhraseReport` shape unchanged.
- Phrase projection rules unchanged (stable threshold
  preserved; partial rules from enrichment v1 preserved).
- `CapabilityMap` unchanged. `CapabilityMap` v2 stays
  deferred.
- `EvidenceGraph` unchanged.
- `CapabilityNormalizationReviewLedger` unchanged.
- `CapabilityOntologySuggestionReport` unchanged.
- Canon packs / overrides unchanged (canon-pack
  expansion is the *next* slice; this review only
  recommends it).
- Publication shape unchanged.
- CLI commands unchanged.
- No new permission, role, or workflow YAML.
- No version bump. No npm publish. No git tag. No GitHub
  Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. Operators read the 239 phrase figure as
   `CapabilityMap`-ready coverage. Mitigation: the
   stable / partial split is surfaced in both
   publications and pinned in this memo; the
   `CapabilityMap`-deferred callout remains; the docs
   test pins **partial phrases alone do not justify
   `CapabilityMap` v2**.
2. Canon-pack expansion misjudges what should be
   canonical. Mitigation: each expansion slice ships
   behind its own decision memo; the operator-authored
   override flow remains the path of last resort.
3. Lexical-splitter sharpening introduces noise on
   non-Rekon repos. Mitigation: the splitter-sharpening
   slice runs the same coverage matrix and rolls back if
   precision regresses.
4. Pattern coverage stays 0% because `ObservedRepo.kind`
   never lands. Mitigation: the **phrase enrichment v2**
   slice (parallel) can populate `kind` from framework /
   architecture-profile evidence, but that's secondary
   to candidate-quality.

Follow-up:

- **Candidate-quality improvements** (next slice).
- **Third coverage review** after candidate-quality
  ships.
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on the third coverage review.
- **Phrase enrichment v2** (parallel; framework /
  architecture-profile enrichment).
- **Additional cohort targets** (parallel; intake-
  gated).
- **`CapabilityContract` decision** (further future).

## NEXT STEP

Recommended: **Candidate-quality improvements** — start
with canon-pack expansion of frequently-appearing
partial-only verb/noun pairs (`save`, `normalize`,
`schema`, `response`, `request`, `plan`, etc.) and a
lexical-splitter sharpening pass for unknown-verb /
unknown-noun candidates. Strategy / docs / tests /
runtime slice; no `CapabilityMap` mutation; no
relaxation of the stable threshold; coverage measured by
a third review.

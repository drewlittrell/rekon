# Review Packet — CapabilityPhraseReport Post-Quality Coverage Review

Coverage / dogfood-analysis review measuring phrase
output **after** Candidate-Quality v1 across a fixture +
**two** real cohort targets. Compares against pre-
enrichment baseline and post-enrichment v1 results.
**Strategy / docs / tests-only. No runtime change. No
`CapabilityMap` mutation. No `CapabilityPhraseReport`
shape change. No `CapabilityNormalizationReport` shape
change. No phrase projection rule change. No canon pack
change. No splitter change. No new artifact registration.
No new CLI command. No source writes. No LLM-only
inference. No npm publish. No version bump. No git tag.
No GitHub Release. No new branch.**

## CHANGES MADE

- **New strategy memo**:
  `docs/strategy/capability-phrase-post-quality-coverage-review.md`
  with all 15 required headings + 7 required diagnostic
  tables (target / pack / normalization / phrase /
  before-after / readiness / option).
- **New 15-assertion docs test**:
  `tests/docs/capability-phrase-post-quality-coverage-review.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates**:
  - `docs/strategy/capability-ontology-candidate-quality-v1.md`
    — Follow-Up section notes the post-quality review
    shipped and the architecture-review next slice.
  - `docs/strategy/capability-phrase-enrichment-coverage-review.md`
    — Follow-Up cross-link.
  - `docs/strategy/capability-phrase-enrichment-v1.md`
    — Follow-Up cross-link.
  - `docs/strategy/capability-phrase-report-safety-review.md`
    — Follow-Up cross-link.
  - `docs/artifacts/capability-phrase-report.md` —
    Forward Compatibility cross-link.
  - `docs/concepts/capability-ontology.md` — Semantic
    Layer cross-link.
  - `docs/strategy/roadmap.md` — twenty-first-slice
    entry.
  - `docs/strategy/classic-behavior-roadmap.md` — same.
  - `README.md` — new comment block.
  - `CHANGELOG.md` — top entry.

## PUBLIC API CHANGES

None. This is a strategy / docs / tests-only batch. No
types change, no exports change, no schemas change, no
CLI surface changes.

## PURPOSE PRESERVATION CHECK

- `CapabilityPhraseReport` shape unchanged. Strict v1 +
  enrichment v1 projection rules unchanged.
- `CapabilityNormalizationReport` shape and candidate-
  quality v1 semantics unchanged.
- `CapabilityMap` v2 stays deferred — the measured
  stable count is **unchanged** across both real repos
  through three coverage reviews.
- Stable high-confidence phrases remain the only
  category eligible for future `CapabilityMap` v2.
  Partial phrases are explicitly **not**
  `CapabilityMap`-ready placement or ownership policy.
- Publications stay read-only. Architecture summary +
  agent contract surface the phrase output (including
  partial counts); proof report surfacing stays
  deferred.
- Canon packs, splitter, normalizer, and enrichment
  rules are all unchanged by this review.
- Source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [Candidate-Quality v1 Memo](../../docs/strategy/capability-ontology-candidate-quality-v1.md):
  this review measures the slice the memo declared as
  selected next-slice from the enrichment coverage
  review.
- Aligned with the
  [Enrichment Coverage Review](../../docs/strategy/capability-phrase-enrichment-coverage-review.md):
  selected candidate-quality improvements as the next
  slice on condition this review measures the outcome.
- Aligned with the
  [CapabilityPhraseReport Safety Review](../../docs/strategy/capability-phrase-report-safety-review.md):
  all five verbatim pins preserved (semantic projection
  ≠ placement policy; normalization remains audit;
  `CapabilityMap` deferred; proof report deferred; only
  stable phrases eligible).
- Aligned with the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md):
  the eight architectural reservations are upheld;
  AST/typechecker/LLM evidence remain deferred; the
  recommended next slice (repo-agnostic architecture
  review) is itself a strategy memo, not a runtime
  slice.

## TARGETS REVIEWED

| Target | Archetype | Source | Result |
| --- | --- | --- | --- |
| `examples/simple-js-ts` (temp copy) | minimal JS/TS fixture | bundled example | full pipeline succeeds; 0 normalized, 0 phrases. |
| `target-1` | real Next.js TypeScript application | anonymized `mktemp` copy | full pipeline succeeds; 9,110 candidates, 241 normalized, 239 phrases (16 stable + 223 partial). |
| `target-2` | real small TS + workflows repo | anonymized `mktemp` copy | full pipeline succeeds; 408 candidates, 12 normalized, 12 phrases (2 stable + 10 partial). |

Both real targets are anonymized per the private-beta
intake policy. No source paths or internal symbol names
are reproduced.

## NORMALIZATION RESULTS

| Target | Total | Normalized | UnknownVerb | UnknownNoun | Unknown | Ignored | AliasApplied | LowConfidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 4 | 0 | 0 | 0 | 0 | 2 | 0 | 2 |
| `target-1` | 9,110 | 241 | 1,670 | 831 | 3,865 | 449 | 597 | 2,054 |
| `target-2` | 408 | 12 | 41 | 49 | 98 | 121 | 41 | 87 |

Normalization rate (`normalized` / `total`):
`examples/simple-js-ts` 0%; `target-1` 2.6%; `target-2`
2.9%. The two real repos show a **consistent ~3%
normalization ceiling** — this is the structural
bottleneck the post-quality review surfaces.

## PHRASE RESULTS

| Target | Total | Stable | Partial | LowConfidence | WithDomain | WithPattern | WithLayer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `examples/simple-js-ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `target-1` | 239 | 16 | 223 | 0 | 239 | 0 | 95 |
| `target-2` | 12 | 2 | 10 | 0 | 12 | 0 | 2 |

Stable density:
- `target-1`: 0.18% of candidates; 6.6% of normalized.
- `target-2`: 0.49% of candidates; 16.7% of normalized.

Pattern coverage is **0% across both real targets** —
the `ObservedRepo.kind` upstream projector doesn't
populate `kind` meaningfully on either target. This is
an upstream projector limitation; future Phrase
Enrichment v2 work could address it.

Stable phrase inspection — `target-1`: `build:session`
(4), `get:result` (2), `fetch:result`, `publish:event`,
`verify:service`, `fetch:config`, `validate:page`,
`render:record`, `create:token`, `execute:report`,
`resolve:session`, `route:report`. All recognizable
capability terms.

Stable phrase inspection — `target-2`: `test:session`
(2 emissions across 2 symbols, single phrase shape).
Meaningful but very narrow.

## BEFORE / AFTER COMPARISON

`target-1` (three-stage comparison):

| Metric | Pre-Enrichment | Post-Enrichment | Post-Quality | Decision |
| --- | ---: | ---: | ---: | --- |
| stable phrases | 16 | 16 | 16 | unchanged across all three stages |
| total phrases | 16 | 239 | 239 | enrichment unlocked partials |
| `unknown` | 4,088 | 4,088 | 3,865 | candidate-quality reduced noise by 223 |
| `ignored` | 226 | 226 | 449 | candidate-quality reclassified 223 path-shaped |
| `normalized` | 241 | 241 | 241 | upstream foundation unchanged |
| `aliasApplied` | 524 | 524 | 597 | +73 from noun-only known-term recognition |

`target-2` (post-quality only — no pre-enrichment
baseline existed for this target):

- 408 candidates → 12 normalized → 2 stable + 10
  partial. Same shape as `target-1` at smaller scale.

## CAPABILITYMAP READINESS

| Gate | Result | Notes |
| --- | --- | --- |
| real repo non-trivial stable phrases | pass (sparse) | `target-1`: 16; `target-2`: 2. |
| stable evidence refs present | pass | every stable phrase has an `EvidenceGraph` ref. |
| stable terms meaningful | pass | all stable phrases on both real targets are recognizable capability terms. |
| stable density sufficient | **fail** | `target-1` is 0.18%, unchanged across three coverage reviews; `target-2` is 0.49%. |
| partials not used for CapabilityMap | pass | design + Do Not Do reminder + docs tests all pin this. |
| publications understandable | pass | both surfaces render phrase section with deferred callout on all targets. |
| artifacts validate clean | pass | `rekon artifacts validate --json` returns `{ "valid": true, "issues": [] }` on all three targets. |

Six of seven gates pass on both real targets. The seventh
— **stable density sufficient for canonical projection**
— has not moved through three coverage reviews and two
runtime slices.

## RECOMMENDATION

Selected: **`CapabilityMap` v2 stays deferred. The next
slice is a repo-agnostic purpose understanding
architecture review.** Strategy memo. Examines what
richer, deterministic evidence sources beyond symbol/
export names could feed the phrase layer to unlock
broader stable yield — and pins which sources stay
deferred (AST adapters, LLM inference, source reads).

The architecture review feeds the next product slice
(targeted phrase enrichment v2, candidate extraction,
or canon-pack expansion v2 — whichever the review's
evidence analysis selects). Each parallel slice stays
available as follow-up, but each is now conditioned on
the architecture review's evidence-source
recommendation.

## TESTS / VERIFICATION

- **New 15-assertion docs test**
  `tests/docs/capability-phrase-post-quality-coverage-review.test.mjs`
  pins the heading set, the verbatim gate guarantees,
  all seven diagnostic tables, the CHANGELOG mention,
  and the review packet's PURPOSE PRESERVATION CHECK.
- Expected full suite: 2459 pass (2444 + 15 new) / 10
  skipped / 0 fail.
- 9-command gate: typecheck / test / build / git diff
  --check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke / install-tarball-smoke
  all expected green.
- CLI matrix run successfully on all three targets;
  `artifacts validate` clean on all three.

## INTENTIONALLY UNTOUCHED

- `CapabilityNormalizationReport` shape and semantics
  unchanged.
- `CapabilityPhraseReport` shape unchanged.
- Phrase projection rules unchanged.
- Splitter behaviour unchanged.
- Normalizer behaviour unchanged.
- Canon packs unchanged.
- `CapabilityMap` unchanged. `CapabilityMap` v2 stays
  deferred.
- `EvidenceGraph` unchanged.
- `CapabilityNormalizationReviewLedger` unchanged.
- `CapabilityOntologySuggestionReport` unchanged.
- Publication shape unchanged.
- CLI commands unchanged.
- No new permission, role, or workflow YAML.
- No version bump. No npm publish. No git tag. No
  GitHub Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. Operators read the 239 + 12 phrase figures as
   `CapabilityMap`-ready coverage. Mitigation: stable
   / partial split surfaced in publications; deferred
   callout retained; this memo + docs test pin
   **partial phrases alone do not justify `CapabilityMap`
   v2**.
2. The architecture review never lands and the
   capability track stalls. Mitigation: explicit
   selection in this memo + Follow-Up Work list; the
   next slice is the memo itself, not a multi-week
   product slice.
3. Architecture review concludes more dogfood is
   needed before a recommendation is possible.
   Mitigation: the "additional cohort targets" follow-up
   stays open in parallel.
4. Architecture review concludes AST / LLM evidence is
   structurally required. Mitigation: each evidence
   source ships behind its own decision memo per the
   architecture decision; the review can pin AST/LLM
   as out-of-scope for the next product slice while
   still surfacing them as long-term options.

Follow-up:

- **Repo-agnostic purpose understanding architecture
  review** (next slice).
- **Phrase enrichment v2** (parallel; conditioned on
  architecture review).
- **Candidate extraction improvements** (parallel;
  conditioned on architecture review).
- **Canon-pack expansion v2** (parallel).
- **Additional cohort targets** (parallel; intake-
  gated).
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on a fourth coverage review.
- **`CapabilityContract` decision** (further future).

## NEXT STEP

Recommended: **Repo-agnostic purpose understanding
architecture review** — strategy memo surveying
deterministic evidence sources beyond symbol/export
names. Output drives the next product slice (phrase
enrichment v2, candidate extraction, or canon-pack
expansion v2) and pins the gates `CapabilityMap` v2
must hit on a fourth coverage review.

# Review Packet — Post-AST CapabilityPhraseReport Coverage Review

Strategy / dogfood-analysis review. **Twenty-fifth
slice on the capability-ontology track.** Fourth
coverage review on the phrase track. Measures AST
extraction impact on
`CapabilityNormalizationReport` candidate quality and
`CapabilityPhraseReport` stable phrase density on
available targets, records the readiness gate result,
and selects the next slice.

**Strategy guardrails: No AST extraction behavior
change. No normalizer change. No phrase projection
change. No canon-pack change. No `CapabilityMap`
mutation. No `EvidenceGraph` mutation. No
`CapabilityNormalizationReport` mutation. No
`CapabilityPhraseReport` mutation. No new artifact.
No new CLI command. No source writes. No LLM-only
inference. No typechecker dependency. No npm publish.
No version bump. No git tag. No GitHub Release. No
new branch.**

## CHANGES MADE

- **New strategy memo**:
  `docs/strategy/post-ast-capability-phrase-coverage-review.md`
  with the 14 required headings (Decision Summary,
  Why This Review Exists, Targets Reviewed, Command
  Matrix, EvidenceGraph AST Results, Normalization
  Results, Phrase Results, Pre-AST / Post-AST
  Comparison, Publication Usefulness, CapabilityMap
  Readiness, Options Considered, Recommendation,
  What This Does Not Do, Follow-Up Work) plus seven
  required tables (target / EvidenceGraph /
  normalization / phrase / pre-post comparison /
  readiness / option).
- **New 15-assertion docs test**:
  `tests/docs/post-ast-capability-phrase-coverage-review.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates** (10):
  - `docs/strategy/js-ts-ast-evidence-adapter-decision.md`
    Implementation Sequence updates step 4 to
    Shipped.
  - `docs/strategy/classic-scanner-ontology-parity-audit.md`
    Follow-Up Work marks the post-AST coverage
    review as shipped.
  - `docs/strategy/capability-phrase-post-quality-coverage-review.md`
    Follow-Up Work marks the post-AST review as
    shipped and points to the next slice.
  - `docs/artifacts/evidence-graph.md` records that
    the AST adapter's downstream impact has been
    measured.
  - `docs/artifacts/capability-normalization-report.md`
    upstream candidate-quality lever section
    reflects the post-AST measurement.
  - `docs/artifacts/capability-phrase-report.md`
    upstream stable-density lever section reflects
    the post-AST measurement.
  - `docs/concepts/capability-ontology.md` Semantic
    Layer cross-links the new review.
  - `docs/strategy/roadmap.md` — twenty-fifth-slice
    entry.
  - `docs/strategy/classic-behavior-roadmap.md` —
    same.
  - `README.md` — new comment block.
  - `CHANGELOG.md` — top entry.

## PUBLIC API CHANGES

None. Strategy / dogfood-analysis / docs / tests-only
batch.

## PURPOSE PRESERVATION CHECK

- `EvidenceGraph` protocol unchanged. The review
  reads AST + regex-fallback facts already emitted
  by the shipped provider; no schema mutation.
- `CapabilityNormalizationReport` shape and semantics
  unchanged.
- `CapabilityPhraseReport` shape and projection rules
  unchanged.
- `CapabilityMap` not mutated. The readiness gate is
  explicitly evaluated and explicitly fails on the
  "consistent across more than one real repo"
  requirement; `CapabilityMap` v2 remains deferred.
- Canon packs, splitter, normalizer, and enrichment
  rules unchanged.
- ADR 0004 reaffirmed: no classic code imported.
- Eight architectural reservations from the Capability
  Ontology Architecture Impact Review remain in force.
- All eleven verbatim pins from the JS/TS AST
  Evidence Adapter Decision preserved.
- LLM-only inference remains rejected.
- Source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

- **Aligned with
  [ADR 0004](../../docs/adr/0004-codebase-intel-classic-is-reference-not-dependency.md)**:
  classic remains design prior art only; no code
  imported from `codebase-intel-classic`.
- **Aligned with the
  [Classic Scanner/Ontology Parity Audit](../../docs/strategy/classic-scanner-ontology-parity-audit.md)**:
  this review is the audit's selected fourth coverage
  review and gating evidence for `CapabilityMap` v2
  design.
- **Aligned with the
  [JS/TS AST Evidence Adapter Decision](../../docs/strategy/js-ts-ast-evidence-adapter-decision.md)**:
  measures the downstream impact the decision memo
  predicted (improved candidate quality + improved
  stable phrase density).

## TARGETS REVIEWED

- `tests/fixtures/js-ts-ast-evidence` — Rekon-internal
  fixture, deliberately built to exercise the v1
  construct table. **Measured.**
- `examples/simple-js-ts` — Rekon-internal fixture,
  minimal TS. **Measured.**
- `target-1` (real Next.js TS) — **unavailable in
  this session.** Pre-AST baseline recorded for
  context; post-AST re-run requested via intake
  request inside the memo.
- `target-2` (real small TS + workflows) —
  **unavailable in this session.** Pre-AST baseline
  recorded for context; post-AST re-run requested
  via intake request inside the memo.

The review accepts **narrower evidence** per the
readiness gate clause "or the memo explicitly accepts
narrower evidence."

## EVIDENCEGRAPH AST RESULTS

| Target | Total Facts | AST Facts | Regex Fallback Facts | Symbol | Export | Import |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `js-ts-ast-fixture` | 80 | 56 | 0 | 27 | 24 | 5 |
| `simple-js-ts` | 5 | 2 | 0 | 1 | 1 | 0 |

Every AST-eligible fact is AST-derived on both
targets. Zero regex-fallback facts — the TypeScript
parser tolerates even the deliberately malformed
`broken.ts` source.

## NORMALIZATION RESULTS

| Target | Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias | Low Conf |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `js-ts-ast-fixture` | 66 | 8 | 9 | 0 | 19 | 16 | 2 | 14 |
| `simple-js-ts` | 4 | 0 | 0 | 0 | 0 | 2 | 0 | 2 |

## PHRASE RESULTS

| Target | Total | Stable | Partial | Low Conf | Domain | Pattern | Layer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `js-ts-ast-fixture` | 8 | 6 | 2 | 0 | 8 | 0 | 0 |
| `simple-js-ts` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Stable phrase verbs / nouns / pairs on the AST
fixture: `create:user` (2), `fetch:user` (2),
`handle:request` (2). Partial: `build:report` (2).
These are textbook capability phrases — the kind
`CapabilityMap` v2 will eventually consume.

## PRE / POST COMPARISON

- `simple-js-ts`: unchanged (4 → 4 candidates,
  0 → 0 normalized, 0 → 0 stable phrases). Expected:
  a one-file one-export fixture is too small to
  exercise AST richness; AST and regex agree.
- `js-ts-ast-fixture`: new fixture (no pre-AST
  baseline); 6 stable phrases produced from 66
  candidates demonstrates AST-backed stable
  production works.
- `target-1`: pre-AST 9,110 candidates / 241
  normalized / 16 stable; post-AST not measured this
  session.
- `target-2`: pre-AST 408 candidates / 12 normalized
  / 2 stable; post-AST not measured this session.

## CAPABILITYMAP READINESS

Seven readiness gates evaluated; **deferred overall.**

| Gate | Result |
| --- | --- |
| stable phrase density materially improved | partial — fixture only |
| stable evidence refs present | pass |
| stable terms meaningful | pass |
| partials not used for CapabilityMap | pass |
| publications understandable | pass |
| artifacts validate clean | pass |
| consistent across more than one real repo | fail — re-run needed |

`CapabilityMap` v2 design remains deferred. The
review explicitly accepts narrower evidence and
issues an intake request for the cohort re-run.

## RECOMMENDATION

- **Primary next slice:** *post-AST cohort re-run*
  against `target-1` and `target-2`. Gates
  `CapabilityMap` v2.
- **Parallel polish lane:**
  `CapabilityNormalizationReport` AST-metadata
  candidate integration (additive; low risk; the
  AST adapter already emits the metadata).
- **Deferred:** `CapabilityMap` v2 design, JS/TS AST
  Provider v2 construct coverage, canon-pack
  expansion v2, phrase enrichment v2.

## TESTS / VERIFICATION

- **New 15-assertion docs test**
  `tests/docs/post-ast-capability-phrase-coverage-review.test.mjs`
  pins:
  1. review doc exists.
  2. memo contains all 11+ required headings.
  3. memo says AST extraction was measured.
  4. memo records whether stable phrase density
     improved.
  5. memo says `CapabilityMap` v2 is evidence-gated.
  6. memo says partial phrases alone do not justify
     `CapabilityMap` v2.
  7. target table present.
  8. EvidenceGraph table present.
  9. normalization table present.
  10. phrase table present.
  11. pre/post comparison table present.
  12. readiness table present.
  13. option table present.
  14. CHANGELOG mentions the review.
  15. review packet exists and contains PURPOSE
      PRESERVATION CHECK.
- Expected full suite: 2539 pass (2524 + 15 new) /
  10 skipped / 0 fail.
- 9-command gate: typecheck / test / build / git
  diff --check / audit-package-exports /
  audit-license / publish-dry-run / install-smoke /
  install-tarball-smoke all expected green.

## INTENTIONALLY UNTOUCHED

- AST extractor behavior.
- Regex-fallback behavior.
- Normalizer behavior.
- Phrase projection rules.
- Canon packs.
- `EvidenceGraph` schema.
- `CapabilityNormalizationReport` shape and
  semantics.
- `CapabilityPhraseReport` shape and projection
  rules.
- `CapabilityMap` (still deferred).
- `CapabilityNormalizationReviewLedger` and
  `CapabilityOntologySuggestionReport`.
- Publication shape.
- CLI commands.
- No new permission, role, or workflow YAML.
- No version bump. No npm publish. No git tag. No
  GitHub Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. Operator does not supply `target-1` / `target-2`
   re-runs; track stalls again. **Mitigation:** the
   memo's intake request is explicit and lists
   exactly which commands to run + which metrics
   to record.
2. Real-repo data shows AST does NOT lift stable
   density — the regex-only baseline turns out to
   have been adequate. **Mitigation:** the option
   table includes the parallel polish lane and
   construct-coverage expansion lanes; the cohort
   re-run drives which lane the next slice uses.
3. Fixture results are over-fit (a deliberately
   AST-rich fixture is not representative).
   **Mitigation:** the memo explicitly states the
   fixture is biased; the readiness gate fails the
   "real-repo" criterion.
4. `simple-js-ts` unchanged result is misread as
   AST failure. **Mitigation:** the memo explains
   why unchanged is the *correct* signal for a
   single-file single-export fixture.

Follow-up:

- **Post-AST cohort re-run** (primary next slice).
- **`CapabilityMap` v2 high-confidence-only design**
  — gated on the cohort re-run.
- **`CapabilityNormalizationReport` AST-metadata
  candidate integration** (parallel polish).
- **JS/TS AST Provider v2 construct coverage** —
  deferred until cohort signal demands.
- **Canon-pack expansion v2** — deferred.
- **Phrase enrichment v2** — deferred.
- **`CapabilityContract` decision** — further future.

## NEXT STEP

Recommended: **post-AST cohort re-run** — re-execute
the `refresh + normalize + phrase project + publish
+ validate` matrix against `target-1` and `target-2`
once those targets are available. Output is recorded
under `docs/strategy/post-ast-cohort-rerun-results.md`
(TBD). Decision on `CapabilityMap` v2 design follows.

The intake request inside the memo lists the exact
commands and metrics the cohort re-run must produce.

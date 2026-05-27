# Review Packet — Post-AST Cohort Re-Run

Strategy / dogfood-analysis review. **Twenty-sixth
slice on the capability-ontology track.** Fifth
coverage review on the phrase track. Real-repo
re-execution of the post-AST capability phrase
coverage matrix against `target-1` and `target-2`,
completing the cohort intake request that the
twenty-fifth slice deferred.

**Strategy guardrails: No AST extraction behavior
change. No normalizer change. No phrase projection
change. No canon-pack change. No `CapabilityMap`
mutation. No `EvidenceGraph` mutation. No
`CapabilityNormalizationReport` mutation. No
`CapabilityPhraseReport` mutation. No new artifact.
No new CLI command. No source writes. No LLM-only
inference. No typechecker dependency. No npm
publish. No version bump. No git tag. No GitHub
Release. No new branch. No private repo names in
deliverables.**

## CHANGES MADE

- **New strategy memo**
  `docs/strategy/post-ast-cohort-rerun.md` with the
  15 required headings (Decision Summary, Why This
  Re-Run Exists, Targets Reviewed, Command Matrix,
  EvidenceGraph AST Results, Normalization Results,
  Phrase Results, Pre-AST / Post-AST Comparison,
  Fixture Comparison, Publication Usefulness,
  CapabilityMap Readiness, Options Considered,
  Recommendation, What This Does Not Do, Follow-Up
  Work) plus seven required tables (target /
  EvidenceGraph / normalization / phrase /
  pre-post comparison / readiness / option).
- **New 15-assertion docs test**
  `tests/docs/post-ast-cohort-rerun.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates** (10):
  - `docs/strategy/post-ast-capability-phrase-coverage-review.md`
    Follow-Up Work marks the cohort re-run as
    shipped.
  - `docs/strategy/js-ts-ast-evidence-adapter-decision.md`
    Implementation Sequence updates step 5 to
    Shipped.
  - `docs/strategy/classic-scanner-ontology-parity-audit.md`
    Follow-Up Work marks the cohort re-run + the
    coverage chain as shipped.
  - `docs/artifacts/evidence-graph.md` downstream
    impact section reflects the real-repo
    measurement.
  - `docs/artifacts/capability-normalization-report.md`
    upstream candidate-quality lever reflects the
    real-repo measurement.
  - `docs/artifacts/capability-phrase-report.md`
    upstream stable-density lever reflects the
    real-repo measurement.
  - `docs/concepts/capability-ontology.md` Semantic
    Layer cross-links the cohort re-run.
  - `docs/strategy/roadmap.md` —
    twenty-sixth-slice entry.
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
- `CapabilityMap` not mutated. The readiness gate
  evaluates and the memo accepts narrower evidence
  to advance to the next design slice; no v2
  mutation in this batch.
- Canon packs, splitter, normalizer, and enrichment
  rules unchanged.
- ADR 0004 reaffirmed: no classic code imported.
- All eight architectural reservations from the
  Capability Ontology Architecture Impact Review
  remain in force.
- All eleven verbatim pins from the JS/TS AST
  Evidence Adapter Decision preserved.
- LLM-only inference remains rejected.
- Source writes remain unavailable.
- Privacy: deliverables use only anonymized
  `target-1` / `target-2` labels; no private repo
  names in any artifact.

## CODEBASE-INTEL ALIGNMENT

- **Aligned with
  [ADR 0004](../../docs/adr/0004-codebase-intel-classic-is-reference-not-dependency.md)**:
  classic remains design prior art only; no
  classic code imported.
- **Aligned with the
  [Classic Scanner/Ontology Parity Audit](../../docs/strategy/classic-scanner-ontology-parity-audit.md)**:
  this review is the cohort-data gate the audit
  selected for `CapabilityMap` v2 design.
- **Aligned with the
  [JS/TS AST Evidence Adapter Decision](../../docs/strategy/js-ts-ast-evidence-adapter-decision.md)**:
  measures the predicted downstream lift on real
  repos.
- **Aligned with the
  [Post-AST CapabilityPhraseReport Coverage Review](../../docs/strategy/post-ast-capability-phrase-coverage-review.md)**:
  completes the deferred cohort re-run that the
  twenty-fifth slice's intake request specified.

## TARGETS REVIEWED

- **`target-1`** — anonymized; non-Rekon real repo;
  Next.js TS scale. **Measured.**
- **`target-2`** — anonymized; non-Rekon real repo;
  small TS + workflows. **Measured.**

Both targets match the pre-AST baseline candidate-
count shape (target-1 ≈ 9k, target-2 ≈ 400), within
±2.5%, confirming the same repos are being
measured.

Anonymized labels used throughout per the work
order's privacy rule. No private repo names appear
in deliverables.

## EVIDENCEGRAPH AST RESULTS

| Target | Total | AST | Regex Fallback | Symbol | Export | Import |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| target-1 | 10,331 | 9,653 | 0 | 7,666 | 1,275 | 712 |
| target-2 | 587 | 404 | 0 | 192 | 93 | 119 |

Zero regex-fallback facts on either target. Every
AST-eligible fact is AST-derived (target-1: 93.4%
of all facts; target-2: 68.8% of all facts; the
non-AST facts are `file` / `ownership_hint` /
`capability_hint` which never go through the AST
path).

## NORMALIZATION RESULTS

| Target | Candidates | Normalized | Unknown Verb | Unknown Noun | Unknown | Ignored | Alias | Low Conf |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| target-1 | 9,327 | 299 | 1,688 | 911 | 3,913 | 449 | 646 | 2,067 |
| target-2 | 406 | 12 | 41 | 49 | 98 | 121 | 41 | 85 |

target-1 normalization ratio 3.2% (vs pre-AST
2.6%; +24% relative lift). target-2 unchanged.

## PHRASE RESULTS

| Target | Total | Stable | Partial | Low Conf | Domain | Pattern | Layer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| target-1 | 297 | **37** | 260 | 0 | 297 | 0 | 110 |
| target-2 | 12 | 2 | 10 | 0 | 12 | 0 | 2 |

Stable phrase pairs on target-1 (top 10):
`get:session` (10), `save:session` (6),
`build:session` (4), `get:response` (14),
`build:plan` (13), `get:schema` (12),
`save:response` (8), `build:report` (8),
`get:token` (6), `build:command` (6). Textbook
capability phrases.

Stable phrase pair on target-2: `test:session`
(2).

## PRE / POST COMPARISON

| Target | Metric | Pre-AST | Post-AST | Lift |
| --- | --- | ---: | ---: | ---: |
| target-1 | candidates | 9,110 | 9,327 | +2.4% |
| target-1 | normalized | 241 | 299 | **+24.1%** |
| target-1 | stable phrases | 16 | **37** | **+131.3%** |
| target-1 | total phrases | 239 | 297 | +24.3% |
| target-2 | candidates | 408 | 406 | −0.5% |
| target-2 | normalized | 12 | 12 | 0% |
| target-2 | stable phrases | 2 | 2 | 0% |
| target-2 | total phrases | 12 | 12 | 0% |

target-1: strong positive. target-2: neutral (no
regression, no lift). The asymmetric signal is
expected — target-2's domain-specific naming
conventions sit outside the canonical vocabulary,
so neither AST nor regex unlocks new stable
phrases.

## CAPABILITYMAP READINESS

Seven readiness gates evaluated. Six pass; the
"consistent across more than one real repo" gate is
**partial** (one strong positive, one neutral, no
regression). The memo invokes the readiness gate's
explicit escape clause ("or the memo explicitly
accepts narrower evidence"): target-1's 37 stable
phrases with meaningful pairs is sufficient
evidence to begin `CapabilityMap` v2 design.

| Gate | Result |
| --- | --- |
| stable phrase density materially improved | pass on target-1; neutral on target-2 |
| stable evidence refs present | pass |
| stable terms meaningful | pass |
| partials not used for CapabilityMap | pass |
| publications understandable | pass |
| artifacts validate clean | pass |
| consistent across more than one real repo | partial |
| **Overall** | **ready (narrower evidence accepted)** |

## RECOMMENDATION

- **Primary next slice:** **`CapabilityMap` v2
  high-confidence-only decision memo.**
- **Parallel polish lane:**
  `CapabilityNormalizationReport` AST-metadata
  candidate integration (consume `symbolKind` /
  `exportKind` in the candidate extractor /
  splitter to reduce target-1's unknown-verb /
  unknown-noun counts).
- **Deferred:** `CapabilityMap` v2 implementation
  plan (gated on the decision memo), JS/TS AST
  Provider v2 construct coverage, canon-pack
  expansion v2, third real-repo target.

## TESTS / VERIFICATION

- **New 15-assertion docs test**
  `tests/docs/post-ast-cohort-rerun.test.mjs` pins:
  1. review doc exists.
  2. all 12+ required headings present.
  3. memo says real cohort targets were re-run.
  4. memo records AST improved stable phrase
     density on a real repo.
  5. memo says `CapabilityMap` v2 is
     evidence-gated.
  6. memo says partial phrases alone do not
     justify `CapabilityMap` v2.
  7. target table present.
  8. EvidenceGraph table present.
  9. normalization table present.
  10. phrase table present.
  11. pre/post comparison table present.
  12. readiness table present.
  13. option table present.
  14. CHANGELOG mentions Post-AST Cohort Re-Run.
  15. review packet exists with PURPOSE
      PRESERVATION CHECK.
- Expected full suite: 2554 pass (2539 + 15 new) /
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
- `CapabilityMap` (still untouched in this batch;
  the v2 design memo is the next slice).
- `CapabilityNormalizationReviewLedger` and
  `CapabilityOntologySuggestionReport`.
- Publication shape.
- CLI commands.
- No new permission, role, or workflow YAML.
- No version bump. No npm publish. No git tag. No
  GitHub Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. `CapabilityMap` v2 design begins without
   target-2 confirmation. **Mitigation:** target-1
   alone provides 37 stable phrases with diverse
   verb:noun pairs; the readiness gate's narrower-
   evidence clause is explicitly invoked. target-2
   is included in the post-v2 coverage review.
2. target-1's domain-specific unknown-verb pattern
   (`figma`, `bridge`, etc.) suggests the canonical
   vocabulary is under-fit for that archetype.
   **Mitigation:** the parallel polish lane
   (AST-metadata candidate integration) addresses
   this without requiring canon-pack expansion.
3. target-2's neutral result is interpreted as
   "AST is regressive on small repos."
   **Mitigation:** target-2 did not regress — its
   stable count was 2 pre-AST and 2 post-AST.
   Small-repo signal is bounded by canonical
   vocabulary coverage, not extraction method.
4. Operator does not consent to using the local
   repos discovered for measurement. **Mitigation:**
   no private names appear in deliverables; the
   work order explicitly requested the cohort
   re-run and provided the pre-AST baseline.

Follow-up:

- **`CapabilityMap` v2 high-confidence-only
  decision memo** (primary next slice).
- **`CapabilityNormalizationReport` AST-metadata
  candidate integration** (parallel polish lane).
- **Post-`CapabilityMap`-v2 coverage review**
  (fifth coverage review on the phrase track;
  gated on v2 shipping).
- **JS/TS AST Provider v2 construct coverage** —
  deferred.
- **Canon-pack expansion v2** — deferred.
- **`CapabilityContract` decision** — further
  future.
- **`RefactorPreservationContract`** — phase-5.

## NEXT STEP

Recommended: **`CapabilityMap` v2 high-confidence-
only decision memo** — strategy memo that:

- pins `status === "stable"` + `confidence ===
  "high"` as the *only* eligibility criterion for
  `CapabilityMap` v2 projection;
- pins partial phrases as semantic context only,
  never `CapabilityMap` v2 input;
- documents how AST metadata (`symbolKind` /
  `exportKind`) may feed v2 placement / role in
  a later slice (without committing to it in the
  decision memo phase);
- selects the v2 shape additively over the
  existing `CapabilityMap` v1 projection (no shape
  mutation in the decision memo phase);
- pins **no source writes**, **no LLM-only
  inference**, **no `EvidenceGraph` mutation**.

The parallel polish lane (`CapabilityNormalizationReport`
AST-metadata candidate integration) can ship
independently and would reduce target-1's
unknown-verb / unknown-noun counts.

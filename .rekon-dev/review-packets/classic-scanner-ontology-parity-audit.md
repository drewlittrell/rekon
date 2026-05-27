# Review Packet — Classic Scanner/Ontology Parity Audit

Strategy / architecture audit batch that maps
`codebase-intel-classic`'s scanner, taxonomy, ontology,
and `GraphOntologyValidator` design against Rekon's
current `EvidenceGraph` / `CapabilityNormalizationReport`
/ `CapabilityPhraseReport` track. Reverses the recent
posture of solving the ontology/scanner problem from
scratch — classic is design prior art, not history.
**Strategy / docs / tests-only. No runtime change. No
`CapabilityMap` mutation. No `CapabilityPhraseReport`
shape change. No `CapabilityNormalizationReport`
semantics change. No `EvidenceGraph` mutation. No phrase
projection rule change. No canon-pack change. No
splitter change. No new artifact registration. No new
CLI command. No source writes. No LLM-only inference.
No npm publish. No version bump. No git tag. No GitHub
Release. No new branch.**

## CHANGES MADE

- **New strategy memo**:
  `docs/strategy/classic-scanner-ontology-parity-audit.md`
  with the 15 required headings (Decision Summary, Why
  This Audit Exists, Classic Scanner Pipeline, Classic
  Ontology / Taxonomy Pipeline, Classic
  GraphOntologyValidator Role, Rekon Current
  Equivalent, Parity Matrix, Methods To Repeat,
  Methods To Adapt, Methods To Reject, AST Adapter
  Implication, Capability Ontology Implication,
  Recommendation, What This Does Not Do, Follow-Up
  Work) plus three required tables (classic method /
  scanner parity / next-step decision).
- **New 13-assertion docs test**:
  `tests/docs/classic-scanner-ontology-parity-audit.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates**:
  - `docs/strategy/capability-phrase-post-quality-coverage-review.md`
    — Follow-Up section notes the parity audit has
    shipped and selects the JS/TS AST adapter
    decision as the next slice.
  - `docs/strategy/capability-ontology-translation-layer-decision.md`
    — Layer 0 (`EvidenceGraph`) section flags AST
    adapter as upcoming.
  - `docs/strategy/capability-ontology-architecture-impact-review.md`
    — eighth architectural reservation re-confirmed
    via parity-audit cross-link.
  - `docs/concepts/capability-ontology.md` — Semantic
    Layer cross-links the parity audit.
  - `docs/artifacts/evidence-graph.md` — cross-links
    the parity audit as the source for the upcoming
    AST adapter.
  - `docs/strategy/roadmap.md` — twenty-second-slice
    entry.
  - `docs/strategy/classic-behavior-roadmap.md` —
    same.
  - `README.md` — new comment block.
  - `CHANGELOG.md` — top entry.

## PUBLIC API CHANGES

None. Strategy / docs / tests-only batch.

## PURPOSE PRESERVATION CHECK

- `EvidenceGraph` protocol unchanged. The parity
  audit explicitly pins it as the repo-agnostic
  protocol that survives the AST adapter slice.
- `CapabilityNormalizationReport` shape and semantics
  unchanged.
- `CapabilityPhraseReport` shape and projection rules
  unchanged.
- `CapabilityMap` v2 stays deferred. The parity
  audit explicitly pins it as gated on a post-AST
  coverage review.
- Canon packs, splitter, normalizer, and enrichment
  rules are all unchanged by this audit.
- ADR 0004 (codebase-intel-classic is reference, not
  dependency) is reaffirmed. The audit explicitly
  *does not* import from classic; it uses classic as
  prior art only.
- Eight architectural reservations from the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)
  remain in force.
- LLM-only inference remains rejected.
- Source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

The audit's central thesis is that codebase-intel
should drive the design of the next capability-
ontology slices. Specific alignments:

- **Aligned with
  [ADR 0004](../../docs/adr/0004-codebase-intel-classic-is-reference-not-dependency.md)**:
  the audit reaffirms `codebase-intel-classic` as
  *reference, not dependency*. Rekon does not import
  classic code; the audit names which classic
  *patterns* to repeat / adapt / reject inside
  Rekon's artifact-first model.
- **Aligned with
  [Classic Behavior Distillation](../../docs/strategy/classic-behavior-distillation.md)**:
  the audit preserves classic's deterministic-first
  posture and adopts classic's layered taxonomy
  shape.
- **Aligned with the
  [GraphOntologyValidator-Lite Audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)**:
  the audit explicitly rejects the monolithic
  `GraphOntologyValidator` port and points to the
  composable-filter alternative already shipped.
- **Aligned with the
  [Post-Quality Coverage Review](../../docs/strategy/capability-phrase-post-quality-coverage-review.md)**:
  the audit responds to that review's
  evidence-model bottleneck finding by surfacing AST
  extraction as the upstream lever.
- **Aligned with the eight architectural
  reservations** from the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md):
  AST stays optional enrichment (not foundational
  truth in v1); LLM-only inference stays rejected;
  raw evidence stays separate from normalized
  purpose; etc.

## CLASSIC SCANNER PIPELINE

Per the audit memo:

1. Source scan (walk repo, read files).
2. AST parse (TypeScript compiler / ts-morph).
3. Extracted names (typed AST traversal).
4. SplitName (verb / noun / original /
   confidence).
5. Taxonomy discovery (aggregate vocabulary).
6. Hierarchy (category rules).
7. Runtime normalization (canonical + aliases +
   `synonymsApplied`).
8. Validation (`GraphOntologyValidator`).

Rekon currently regex-parses at step 2 and skips
step 5. Steps 6, 7, 8 are already shipped in
Rekon's artifact-first equivalents.

## CLASSIC ONTOLOGY PIPELINE

- `lib/verb-rules.ts` + `lib/noun-rules.ts` + JSON
  Schemas — canonical + aliases + categories +
  thresholds.
- `domain/ontology/mergeOntology.ts` — base +
  workspace override merge.
- `infra/repositories/TaxonomyRepository.ts` +
  `VerbVocabularyRepository.ts` — persistence /
  caching.
- Normalization outputs: canonical, confidence,
  `synonymsApplied`, warnings, corrections.

Rekon's `@rekon/capability-ontology` canon-pack +
override model already captures the rule-module
structure. Aggregate `synonymsApplied` surfacing is
a future polish.

## PARITY MATRIX

See the memo for the full classic-method table and
scanner-parity table. Key entries:

- `ExtractedName` / `SplitName` → **adapt** (needs
  AST extraction to be strong).
- Taxonomy discovery → **adapt** (deferred
  artifact).
- Verb / noun aliases → **repeat** (shipped).
- Base + workspace ontology merge → **repeat**
  (shipped).
- `synonymsApplied` → **adapt** (per-candidate
  shipped; aggregate is a future polish).
- `GraphOntologyValidator` monolith → **reject
  wholesale** (per the lite audit).
- AST-backed scanner → **adapt** (the next product
  slice).
- `TaxonomyRepository` standalone persistence layer
  → **reject** (artifact store already covers
  persistence).

## RECOMMENDATION

Selected: **JS/TS AST Evidence Adapter Decision** as
the next slice on the capability-ontology track.
Strategy memo; picks parser (TypeScript compiler API
/ ts-morph / swc / other), defines `EvidenceGraph`
fact shapes, pins fallback behaviour, confidence
metadata, test fixtures.

Implementation sequence after this audit:

1. JS/TS AST Evidence Adapter Decision (next).
2. JS/TS AST EvidenceGraph Provider v1 (runtime).
3. Post-AST coverage review.
4. `CapabilityMap` v2 high-confidence-only design
   decision.

Parallel follow-ups: canon-pack expansion v2,
phrase enrichment v2, additional cohort targets.

## TESTS / VERIFICATION

- **New 13-assertion docs test**
  `tests/docs/classic-scanner-ontology-parity-audit.test.mjs`
  pins:
  1. audit memo exists.
  2. codebase-intel is design prior art.
  3. JS/TS AST extraction should be primary where
     available.
  4. regex extraction is fallback, not primary, for
     JS/TS.
  5. `EvidenceGraph` remains repo-agnostic
     protocol.
  6. `GraphOntologyValidator` should not be ported
     wholesale.
  7. classic taxonomy extraction / split /
     discovery / normalization should be adapted.
  8. `CapabilityMap` v2 should wait until post-AST
     coverage is measured.
  9. memo includes classic method table.
  10. memo includes scanner parity table.
  11. memo includes next-step table.
  12. CHANGELOG mentions classic scanner/ontology
      parity audit.
  13. review packet exists and contains PURPOSE
      PRESERVATION CHECK.
- Expected full suite: 2472 pass (2459 + 13 new) /
  10 skipped / 0 fail.
- 9-command gate: typecheck / test / build / git
  diff --check / audit-package-exports /
  audit-license / publish-dry-run / install-smoke /
  install-tarball-smoke all expected green.

## INTENTIONALLY UNTOUCHED

- `EvidenceGraph` shape and protocol.
- `@rekon/capability-js-ts` regex extractor (stays
  in place until the AST decision memo lands).
- `CapabilityNormalizationReport` shape and
  semantics.
- `CapabilityPhraseReport` shape and projection
  rules.
- Splitter behaviour.
- Canon packs.
- Normalizer behaviour.
- Enrichment rules.
- Stable phrase threshold.
- `CapabilityMap` v2 (still deferred).
- `CapabilityNormalizationReviewLedger` and
  `CapabilityOntologySuggestionReport`.
- Publication shape.
- CLI commands.
- No new permission, role, or workflow YAML.
- No version bump. No npm publish. No git tag. No
  GitHub Release. No new branch.

## RISKS / FOLLOW-UP

Risks:

1. AST adapter slice never lands and Rekon's
   capability-ontology track stalls again.
   Mitigation: this memo explicitly names the next
   slice and pins the gates; the Follow-Up Work
   section lists the implementation sequence.
2. AST parser choice is wrong (install size,
   distribution model, performance). Mitigation:
   the next slice is a *decision memo*, not an
   implementation slice — the decision compares
   parsers explicitly before any runtime work.
3. Type-checker access becomes an implicit
   dependency. Mitigation: the audit explicitly
   pins **no type-checker dependency in v1**; AST
   alone closes most of the regex gap.
4. Operators expect AST extraction to ship in this
   batch. Mitigation: the audit and CHANGELOG
   explicitly state this batch is an *audit*, not
   an implementation slice.

Follow-up:

- **JS/TS AST Evidence Adapter Decision** (next
  slice).
- **JS/TS AST EvidenceGraph Provider v1** (runtime
  slice; conditioned on the decision memo).
- **Post-AST coverage review** (fourth coverage
  review).
- **`CapabilityMap` v2 high-confidence-only design
  decision** — gated on post-AST coverage.
- **Discovered-vocabulary artifact** (deferred).
- **`synonymsApplied` aggregate surfacing**
  (parallel polish).
- **System-derived verb expansion in base canon
  pack** (parallel; conditioned on AST shape).
- **Canon-pack expansion v2** (parallel; per-
  archetype).
- **Phrase enrichment v2** (parallel; framework /
  architecture-profile-derived).
- **`CapabilityContract` decision** (further
  future).

## NEXT STEP

Recommended: **JS/TS AST Evidence Adapter Decision**
— strategy memo that:

- picks a parser (TypeScript compiler API, ts-morph,
  swc, or alternative);
- defines emitted `EvidenceGraph` fact shapes
  (likely extending `export` / `symbol` / `import`
  with `function-signature` / `class-member` /
  `type-alias` / `enum-member`);
- pins fallback behaviour for non-JS/TS targets
  and AST-unavailable environments (regex stays
  available as fallback);
- pins per-fact confidence metadata;
- lists test fixtures;
- pins **no source writes**, **no LLM-only
  inference**, **no type-checker dependency in
  v1**;
- pins **AST adapter is the primary JS/TS scanner
  where available; regex is fallback**.

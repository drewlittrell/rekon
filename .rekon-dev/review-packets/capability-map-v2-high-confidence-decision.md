# Review Packet — CapabilityMap v2 High-Confidence-Only Decision

Strategy / architecture decision memo. **Twenty-seventh
slice on the capability-ontology track.** Commits
Rekon to an **additive** `CapabilityMap` v2
projection consuming **only stable high-confidence**
`CapabilityPhraseReport` claims. Implements the
recommendation from the
[Post-AST Cohort Re-Run](../../docs/strategy/post-ast-cohort-rerun.md)
(twenty-sixth slice). **No `CapabilityMap` mutation,
no `EvidenceGraph` mutation, no
`CapabilityNormalizationReport` mutation, no
`CapabilityPhraseReport` mutation, no
`CapabilityContract`, no architecture linting, no
resolver routing, no source writes, no LLM-only
inference, no npm publish, no version bump, no git
tag, no GitHub Release, no new branch.**

## CHANGES MADE

- **New strategy memo**
  `docs/strategy/capability-map-v2-high-confidence-decision.md`
  with the 11 required headings (Decision Summary,
  Why This Decision Exists, Current CapabilityMap
  Boundary, Evidence From Post-AST Cohort Re-Run,
  Options Considered, Recommendation, Eligibility
  Rules, Additive Shape, Freshness And Citations,
  CapabilityContract Boundary, What This Does Not
  Do, Implementation Sequence) plus four required
  tables (evidence / option / eligibility /
  boundary). Includes a fifth table (stale / sparse
  / missing) inside the Freshness section.
- **New 16-assertion docs test**
  `tests/docs/capability-map-v2-high-confidence-decision.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates** (10):
  - `docs/strategy/post-ast-cohort-rerun.md`
    Follow-Up Work marks the decision memo as
    shipped.
  - `docs/strategy/post-ast-capability-phrase-coverage-review.md`
    Follow-Up Work marks the readiness gate's
    downstream decision as shipped.
  - `docs/strategy/capability-phrase-report-safety-review.md`
    notes the `CapabilityMap` integration deferral
    is now resolved (decision recorded; runtime
    still not mutated).
  - `docs/strategy/capability-phrase-report-decision.md`
    cross-links the v2 decision.
  - `docs/artifacts/capability-phrase-report.md`
    upstream stable-density lever reflects the
    decision.
  - `docs/artifacts/capability-normalization-report.md`
    notes that `CapabilityMap` v2 explicitly does
    not consume raw normalization rows.
  - `docs/concepts/capability-ontology.md` Semantic
    Layer cross-links the v2 decision.
  - `docs/strategy/roadmap.md`
    twenty-seventh-slice entry.
  - `docs/strategy/classic-behavior-roadmap.md`
    twenty-seventh-slice entry.
  - `README.md` new comment block.
  - `CHANGELOG.md` top entry.

## PUBLIC API CHANGES

None. Strategy / docs / tests-only batch.

The memo *sketches* an additive type extension
(`CapabilityMapPhraseBackedCapability` +
`CapabilityMapV2Additions`) but does **not** ship
the type in this batch. The implementation slice
(next) ships the actual type extension in
`@rekon/kernel-repo-model`.

## PURPOSE PRESERVATION CHECK

- `CapabilityMap` v1 shape unchanged. The decision
  pins `CapabilityMap` v2 as **additive** —
  existing `entries[]` field stays, every existing
  v1 consumer keeps working.
- `EvidenceGraph` protocol unchanged.
- `CapabilityNormalizationReport` shape and
  semantics unchanged. The decision explicitly
  excludes raw normalization rows from v2.
- `CapabilityPhraseReport` shape and projection
  rules unchanged. v2 consumes phrases read-only.
- `CapabilityContract` not created. The decision
  explicitly pins the boundary: v2 surfaces
  capabilities; `CapabilityContract` (future) sets
  policy.
- `RefactorPreservationContract` not created.
- Canon packs, splitter, normalizer, enrichment
  rules unchanged.
- ADR 0004 reaffirmed: no classic code imported.
- Eight architectural reservations from the
  Capability Ontology Architecture Impact Review
  remain in force.
- All verbatim pins from the JS/TS AST Evidence
  Adapter Decision preserved.
- All verbatim pins from the CapabilityPhraseReport
  Safety Review preserved (stable high-confidence
  threshold, partials as context only, etc.).
- LLM-only inference remains rejected.
- Source writes remain unavailable.
- Architecture linting / resolver routing /
  verification planning by capability — none
  introduced by this decision.

## CODEBASE-INTEL ALIGNMENT

- **Aligned with
  [ADR 0004](../../docs/adr/0004-codebase-intel-classic-is-reference-not-dependency.md)**:
  classic remains design prior art; no classic code
  imported.
- **Aligned with the
  [Classic Scanner/Ontology Parity Audit](../../docs/strategy/classic-scanner-ontology-parity-audit.md)**:
  v2 evolves the layered model classic's
  `ExtractedName` / `SplitName` / taxonomy /
  ontology pipeline anticipated.
- **Aligned with the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md)**:
  the eight architectural reservations are
  preserved; `CapabilityMap` is the projection
  layer evolved here.
- **Aligned with the
  [CapabilityPhraseReport Decision](../../docs/strategy/capability-phrase-report-decision.md)**:
  Option B's separate-carrier choice makes additive
  `CapabilityMap` v2 consumption clean.
- **Aligned with the
  [CapabilityPhraseReport Safety Review](../../docs/strategy/capability-phrase-report-safety-review.md)**:
  the safety review's pinned "only stable
  high-confidence phrases are eligible for future
  `CapabilityMap` v2" is now the v2 eligibility
  rule.
- **Aligned with the
  [Post-AST Cohort Re-Run](../../docs/strategy/post-ast-cohort-rerun.md)**:
  the decision uses that review's evidence as the
  basis for committing to design now (rather than
  deferring further).

## EVIDENCE FROM POST-AST COHORT

| Target | Pre-AST Stable | Post-AST Stable | Lift |
| --- | ---: | ---: | ---: |
| target-1 | 16 | **37** | **+131.3%** |
| target-2 | 2 | 2 | 0% (no regression) |

**target-1 top stable verb:noun pairs** (post-AST):
`get:response` (14), `build:plan` (13),
`get:schema` (12), `get:session` (10),
`save:response` (8), `build:report` (8). These are
exactly the canonical capability phrases v2 will
project.

**Verdict from the cohort re-run review (already
recorded):** six readiness gates pass; the
"consistent across more than one real repo" gate is
partial; the narrower-evidence escape clause is
explicitly invoked; `CapabilityMap` v2 design is
ready to begin **conservatively** with high-
confidence-only eligibility.

## OPTIONS CONSIDERED

- **Option A: keep v1 only** — rejected (stable
  phrase evidence exists).
- **Option B: additive stable-phrase v2** —
  **selected** (preserves compatibility; uses the
  best available semantic purpose layer; respects
  the safety review's threshold).
- **Option C: include partial phrases** — rejected
  (partials are semantic context only).
- **Option D: consume raw `CapabilityNormalizationReport`
  rows** — rejected (blurs translation audit with
  projection).
- **Option E: wait for more dogfood** — rejected
  (enough evidence for a conservative design;
  implementation remains high-confidence-only).

## ELIGIBILITY RULES

Conjunctive filter:

- phrase `status === "stable"`
- phrase `confidence === "high"`
- `evidenceRefs` non-empty
- `sourceCandidateIds` non-empty
- `verb` and `noun` both present
- canonical-vocabulary lookup succeeds
- (anything excluded above is **not** projected
  into v2; the phrase remains visible in
  `CapabilityPhraseReport` and publications)

## ADDITIVE SHAPE

v1 fields unchanged. v2 adds optional
`phraseBackedCapabilities?[]`,
`phraseBackedSummary?`, `phraseSourceRef?` to the
`CapabilityMap` type. Per-entry shape:

```ts
{
  id: string;          // deterministic, derived from (verb, noun, qualifier?, domain?, pattern?, layer?)
  phraseRef: { report: ArtifactRef; phraseId: string };
  verb: string;
  noun: string;
  qualifier?: string[];
  domain?: string;
  pattern?: string;
  layer?: string;
  evidenceRefs: ArtifactRef[];
  sourceCandidateIds: string[];
  confidence: "high";  // literal type — filter guarantees it
  status: "stable";    // literal type — filter guarantees it
}
```

Section name decision: **`phraseBackedCapabilities`**
(not `normalizedCapabilities`). The map projects
*phrases*, not normalization rows; the name
reflects the actual upstream layer.

## FRESHNESS / CITATION MODEL

- `inputRefs` cite everything v1 cites
  (`ObservedRepo`, `OwnershipMap`, `EvidenceGraph`),
  unchanged, plus the consumed
  `CapabilityPhraseReport` when phrase-backed
  fields are populated.
- New invalidation rule
  `capability-phrases.changed` (implementation
  manifest) so `CapabilityMap` is stale when the
  upstream `CapabilityPhraseReport` changes.
- Sparse / missing / stale phrase report handling
  is pinned in the memo's Freshness table (empty
  arrays where appropriate; never read a stale
  report).
- Full citation chain walkable from `CapabilityMap`
  v2 entry → `CapabilityPhrase` →
  `CapabilityNormalizationReport` candidate →
  `EvidenceGraph` fact.

## TESTS / VERIFICATION

- **New 16-assertion docs test**
  `tests/docs/capability-map-v2-high-confidence-decision.test.mjs`
  pins:
  1. decision memo exists.
  2. all 11+ required headings present.
  3. selects additive stable-phrase v2.
  4. `CapabilityMap` v2 consumes
     `CapabilityPhraseReport`, not raw
     `CapabilityNormalizationReport` rows.
  5. only stable high-confidence
     `CapabilityPhrase` claims are eligible.
  6. partial phrases excluded.
  7. raw normalization rows excluded.
  8. `CapabilityMap` v2 is not
     `CapabilityContract`.
  9. v2 is additive and existing fields remain
     valid.
  10. `CapabilityMap` should be stale when the
      consumed `CapabilityPhraseReport` changes.
  11. evidence table present.
  12. option table present.
  13. eligibility table present.
  14. boundary table present.
  15. CHANGELOG mentions the decision.
  16. review packet exists with PURPOSE
      PRESERVATION CHECK.
- Expected full suite: 2570 pass (2554 + 16 new) /
  10 skipped / 0 fail.
- 9-command gate: typecheck / test / build / git
  diff --check / audit-package-exports /
  audit-license / publish-dry-run / install-smoke /
  install-tarball-smoke all expected green. No CLI
  smoke required for strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `CapabilityMap` runtime behavior.
- `CapabilityMap` v1 type / validators / writers.
- `@rekon/capability-model` producer.
- `@rekon/kernel-repo-model` schema.
- `EvidenceGraph` shape and protocol.
- `CapabilityNormalizationReport` shape and
  semantics.
- `CapabilityPhraseReport` shape and projection
  rules.
- Canon packs.
- Splitter behavior.
- Normalizer behavior.
- Enrichment rules.
- Stable phrase threshold (already at "stable +
  high-confidence" per the safety review).
- `CapabilityNormalizationReviewLedger` and
  `CapabilityOntologySuggestionReport`.
- Publication shape.
- CLI commands.
- No new permission, role, or workflow YAML.
- No version bump. No npm publish. No git tag. No
  GitHub Release. No new branch.
- **`docs/artifacts/capability-map.md` not
  created.** Documentation gap identified in this
  memo. The implementation slice creates the
  artifact reference (because the doc references
  the v2 shape that the implementation slice
  finalises).

## RISKS / FOLLOW-UP

Risks:

1. The implementation slice silently widens
   eligibility (e.g. accepts low-confidence
   phrases). **Mitigation:** the 16-assertion docs
   test pins the eligibility verbs; the
   implementation slice ships contract tests with
   the same fields.
2. Downstream consumers (architecture-summary
   publication, agent-contract publication) start
   reading `phraseBackedCapabilities` and treating
   it as policy. **Mitigation:** the memo
   explicitly pins "`CapabilityMap` v2 is not
   `CapabilityContract`" and the boundary table
   separates the two surfaces. The implementation
   slice's contract tests pin that consumers do not
   collapse the boundary.
3. `phraseSourceRef` freshness propagation breaks
   in some edge case (stale phrase report read).
   **Mitigation:** the Freshness table pins the
   "treat stale as missing" rule; the
   implementation slice's contract tests cover the
   matrix.
4. `id` field non-deterministic across runs (would
   break artifact comparisons). **Mitigation:** the
   memo pins `id` as deterministic; the
   implementation slice picks the exact digest
   shape (likely `digestJson({ verb, noun,
   qualifier, domain, pattern, layer }).slice(0,
   16)`).
5. `docs/artifacts/capability-map.md` gap left
   unfilled. **Mitigation:** explicitly assigned
   to the implementation slice; this review packet
   names it as a deferred task.
6. The narrower-evidence escape clause from the
   cohort re-run review is over-applied. **Mitigation:**
   v2 ships *conservatively* (stable + high-
   confidence only). A future broader-evidence
   review may relax eligibility; this decision
   does not pre-commit to that.

Follow-up:

- **`CapabilityMap` v2 high-confidence-only
  implementation** (next slice). Extends
  `@rekon/kernel-repo-model` `CapabilityMap` type,
  `@rekon/capability-model` producer, manifest
  invalidation rule, contract tests, and creates
  `docs/artifacts/capability-map.md`.
- **`CapabilityNormalizationReport` AST-metadata
  candidate integration** (parallel polish lane;
  selected in the cohort re-run). Independent of
  v2.
- **Post-`CapabilityMap`-v2 coverage review** —
  measure phrase-backed entry quality on the cohort
  + fixture; gates downstream consumer adoption.
- **`CapabilityContract` decision memo** — far
  future; gated on v2 stability + at least one
  full coverage review.
- **`RefactorPreservationContract`** — phase-5.
- **Canon-pack expansion v2** — deferred.
- **Phrase enrichment v2** — deferred.
- **JS/TS AST Provider v2 construct coverage** —
  deferred.

## NEXT STEP

Recommended: **`CapabilityMap` v2 high-confidence-
only implementation** — runtime slice that:

- extends the `CapabilityMap` type in
  `@rekon/kernel-repo-model` with optional
  `phraseBackedCapabilities` /
  `phraseBackedSummary` / `phraseSourceRef`
  fields;
- updates `createCapabilityMap` to accept +
  validate the new optional fields;
- updates `@rekon/capability-model` to read the
  latest `CapabilityPhraseReport`, filter per the
  eligibility table, emit the additive section,
  and cite the consumed report in `inputRefs`;
- adds `capability-phrases.changed` to the
  manifest invalidation rules;
- ships contract tests pinning the eligibility
  filter, the deterministic `id` derivation, the
  citation chain, and the stale / sparse / missing
  matrix;
- creates `docs/artifacts/capability-map.md`
  (artifact reference);
- pins **no source writes**, **no LLM-only
  inference**, **no `CapabilityContract` mutation**,
  **no resolver routing**, **no architecture
  linting**.

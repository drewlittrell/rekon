# Review Packet — CapabilityMap v2 Safety Review

Strategy / safety review batch. **Twenty-ninth slice
on the capability-ontology track.** Reviews the
end-to-end `CapabilityMap` v2 implementation
(`CapabilityPhraseReport` →
`phraseBackedCapabilities` / `phraseBackedSummary` /
`phraseSourceRef`) and confirms it is safe / stable
as an additive high-confidence projection.
**Recommendation: ship publication surfacing as the
next slice.** No runtime changes in this batch. No
`CapabilityMap` mutation. No `EvidenceGraph`
mutation. No `CapabilityNormalizationReport`
mutation. No `CapabilityPhraseReport` mutation. No
`CapabilityContract`. No architecture linting. No
resolver routing. No verification planning. No
source writes. No LLM-only inference. No npm
publish. No version bump. No git tag. No GitHub
Release. No new branch.

## CHANGES MADE

- **New strategy memo**
  `docs/strategy/capability-map-v2-safety-review.md`
  with the 11 required headings (Decision Summary,
  Why This Review Exists, Projection Path Reviewed,
  Eligibility Rule Review, Additive Shape Review,
  Citation And Freshness Review, Boundary Review,
  Options Considered, Recommendation, What This
  Does Not Do, Follow-Up Work) plus four required
  tables (projection path, eligibility, boundary,
  option).
- **New 14-assertion docs test**
  `tests/docs/capability-map-v2-safety-review.test.mjs`
  pinning the five required statements, the four
  required tables, the required headings, the
  CHANGELOG mention, and the review packet
  PURPOSE PRESERVATION CHECK.
- **New review packet** (this file).
- **Supporting doc updates** (9):
  - `docs/strategy/capability-map-v2-high-confidence-decision.md`
    — Implementation Sequence step 4 (safety
    review) marked ✅ shipped; cross-references
    updated.
  - `docs/artifacts/capability-map.md` — Related
    Documents now lists the safety review.
  - `docs/artifacts/capability-phrase-report.md`
    — semantic-purpose / projection boundary
    cross-link to the safety review.
  - `docs/concepts/capability-ontology.md`
    — Layer 6 entry references the safety review.
  - `docs/strategy/post-ast-cohort-rerun.md`
    — Follow-Up Work marks the safety review as
    shipped.
  - `docs/strategy/roadmap.md` — twenty-ninth-
    slice entry at the top.
  - `docs/strategy/classic-behavior-roadmap.md`
    — twenty-ninth-slice entry at the top.
  - `README.md` — new comment block at the top of
    the news section.
  - `CHANGELOG.md` — new top entry.

## PUBLIC API CHANGES

None. Strategy / safety review / docs / tests-only
batch. No type changes. No helper changes. No
producer changes. No manifest changes. No CLI
changes. No SDK changes. No runtime changes.

## PURPOSE PRESERVATION CHECK

The safety review explicitly preserves every pin
from the
[v2 decision memo](../../docs/strategy/capability-map-v2-high-confidence-decision.md)
and adds five required statements (asserted by the
docs test):

- **`CapabilityMap` v2 is additive; existing
  `entries[]` remain valid.** The review walked the
  producer + validator + type level and confirmed
  every v1 consumer path is intact. The kernel's
  `validateCapabilityMap` accepts a v1-only shape
  without surfacing any issue.
- **`CapabilityMap` v2 consumes
  `CapabilityPhraseReport`, not raw
  `CapabilityNormalizationReport` rows.** Verified
  by structural input typing (the helper takes
  `PhraseReportLike`, not a normalization-report
  shape) and by the producer (which calls
  `artifacts.list("CapabilityPhraseReport")`,
  never `list("CapabilityNormalizationReport")`
  for the v2 path).
- **Partial phrases are excluded from
  `phraseBackedCapabilities`.** Enforced at three
  layers: helper conjunctive guard, validator
  constraints, and TypeScript literal types.
- **`CapabilityMap` v2 is not `CapabilityContract`.**
  The v2 fields are read-only projections, not
  policy. No `required: true`, no
  `allowedLayers[]`, no `preservationRules[]`, no
  `requiredChecks[]`. No
  `CapabilityContract` artifact, type, helper, or
  registration exists in the codebase.
- **`CapabilityMap` v2 does not imply placement
  policy, ownership policy, resolver routing,
  architecture linting, verification planning, or
  source writes.** Each of these is independently
  re-confirmed as deferred / not introduced.

### Boundary preservation (negative properties)

- `EvidenceGraph` writes — not added.
- `CapabilityNormalizationReport` writes — not
  added.
- `CapabilityPhraseReport` writes — not added.
- `CapabilityMap` writes — not added (this is a
  review batch).
- Raw normalization row consumption by
  `CapabilityMap` — confirmed absent.
- Partial / low-confidence phrase consumption —
  confirmed absent (three enforcement layers).
- `CapabilityContract` — confirmed not introduced.
- `RefactorPreservationContract` — confirmed not
  introduced.
- Architecture linting — confirmed not introduced.
- Resolver routing by capability — confirmed not
  introduced.
- Verification planning by capability — confirmed
  not introduced.
- Source writes — confirmed not introduced.
- LLM-only inference — confirmed not introduced.
- npm publish — not done.
- Version bump — not done.
- Git tag — not done.
- GitHub Release — not done.
- New branch — not created.

## CODEBASE-INTEL ALIGNMENT

The safety review keeps Rekon aligned with the
`codebase-intel-classic` reference behaviour the
beta-readiness audit pinned:

- **Projection / policy split**: classic separated
  capability projection (the `intelligence-snapshot`
  layer) from policy (the architecture rulebook).
  v2 preserves this split — phrase-backed entries
  are projection, never policy.
- **Read-only producer surface**: classic never
  wrote source files from a projector. The
  v2 producer remains read-only over the source
  tree.
- **Citation chain**: classic required every claim
  to walk back to evidence. v2's citation chain
  (entry → phrase → candidate → fact) preserves
  this.
- **Operator-driven decisions**: classic deferred
  policy decisions until operators had visibility.
  Selecting publication surfacing as the next
  slice (before `CapabilityContract`) preserves
  this principle.

## PROJECTION PATH REVIEWED

| Step | Artifact / Helper | Role | Boundary |
| --- | --- | --- | --- |
| phrase project | `CapabilityPhraseReport` | semantic purpose projection | does not mutate `CapabilityMap` |
| model projection | `buildPhraseBackedCapabilityMapAdditions` | high-confidence projection | excludes partials |
| capability map | `CapabilityMap` | stable capability projection | additive v2 fields only |

Each step walked end-to-end. The helper is pure
(no I/O, no LLM, no source read). The producer's
`try`/`catch` around the phrase-report list call
means older runtimes emit a clean v1-shape artifact
on the absent-type path.

## ELIGIBILITY RULE REVIEW

Conjunctive filter enforced at three layers:

1. **Helper guard** in
   `packages/capability-model/src/phrase-backed.ts`
   short-circuits on every failure
   (`status !== "stable"`, `confidence !== "high"`,
   missing-verb, missing-noun, empty
   `evidenceRefs`, empty `sourceCandidateIds`,
   missing `id`).
2. **Validator guard** in
   `packages/kernel-repo-model/src/index.ts`
   rejects any v2 entry whose constraints don't
   hold. Even a hand-constructed map bypassing the
   helper cannot validate.
3. **Type-level guard** — `confidence: "high"` and
   `status: "stable"` are literal types on
   `CapabilityMapPhraseBackedCapability`.

Raw `CapabilityNormalizationReport` rows are never
consumed: the producer only reads
`CapabilityPhraseReport`, and the helper's input
type does not match a normalization-report shape.

## ADDITIVE SHAPE REVIEW

All three v2 fields are optional. The validator
accepts both shapes:

- Pure v1 (no v2 fields, emitted when no phrase
  report is found).
- v1 + v2 (all three v2 fields present together;
  the helper guarantees coherence).

Sorting is deterministic (verb asc, noun asc, id
asc; summary `byVerb` / `byNoun` keys
alphabetically sorted). JSON serialisation is
stable across runs.

## CITATION / FRESHNESS REVIEW

The citation chain is fully walkable:

```
CapabilityMap.phraseBackedCapabilities[i].phraseRef.report
    → CapabilityPhraseReport
        → CapabilityPhrase (by phraseId)
            → CapabilityNormalizationReportCandidate.id
                → CapabilityNormalizationReport
                    → EvidenceGraph fact
```

Every link is materialised: entry-level
`phraseRef`, top-level `phraseSourceRef`,
header-level `inputRefs`, and entry-level
`evidenceRefs[]`.

Freshness has two mechanisms: the
`capability-phrases.changed` manifest invalidation
rule, and digest tracking in
`CapabilityMap.header.inputRefs`. A stale or
missing phrase report produces a clean v1-shape
`CapabilityMap` (helper returns `{}`, producer
omits the v2 spread).

## BOUNDARY REVIEW

| Boundary | Decision |
| --- | --- |
| v1 `entries[]` compatibility | preserved |
| `CapabilityPhraseReport` vs `CapabilityMap` | projection boundary preserved |
| `CapabilityMap` vs `CapabilityContract` | policy boundary preserved |
| `CapabilityMap` vs source writes | no writes |

All four boundaries hold. The producer never
writes back to the phrase report. The phrase
report producer (in
`@rekon/capability-ontology`) does not depend on
`@rekon/capability-model` — cycle impossible. No
policy surface exists on the v2 fields. The
producer reads only artifacts (not source files)
and writes only the three expected artifacts
(`ObservedRepo`, `OwnershipMap`, `CapabilityMap`).

## RECOMMENDATION

`CapabilityMap` v2 is safe / stable as an additive
high-confidence projection. **No blockers.** Ship
publication surfacing as the next slice.

Deferred (gated on publication-surfacing operator
feedback):

- `CapabilityContract` decision
- architecture linting
- resolver routing by capability
- verification planning by capability

## TESTS / VERIFICATION

- New 14-assertion docs test passes.
- All previously-passing tests still pass (2610
  pass / 0 fail / 10 skipped baseline from the
  twenty-eighth slice).
- 9-command verification gate (typecheck, test,
  build, diff-check, audit-package-exports,
  audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke) passes.
- No CLI smoke required (strategy / safety review
  only).
- No new dependencies. No new exports. No new
  files outside the `docs/` / `tests/docs/` /
  `.rekon-dev/review-packets/` surfaces.

## INTENTIONALLY UNTOUCHED

- `packages/kernel-repo-model/src/index.ts` — v2
  type and validator stay frozen.
- `packages/capability-model/src/index.ts` —
  producer stays frozen.
- `packages/capability-model/src/phrase-backed.ts`
  — helper stays frozen.
- All other `packages/*/src/**` — no source
  changes.
- `tests/contract/capability-map-v2.test.mjs` —
  contract test stays frozen.
- `docs/artifacts/capability-map.md` — only
  cross-link additions, no semantic content
  changes.

## RISKS / FOLLOW-UP

- **Operator visibility gap**: until publication
  surfacing ships, operators cannot see
  phrase-backed entries in the architecture
  summary or agent contract. Mitigation: ship
  publication surfacing as the next slice.
- **`CapabilityContract` premature pull**: if a
  consumer requests resolver routing or
  architecture linting before publication
  surfacing has produced real-repo feedback,
  decline and cite this review.
- **Canon-pack coverage**: the cohort re-run
  measured small canon-vocabulary lift. A future
  coverage review (gated on publication
  surfacing) should re-measure phrase-backed
  entry quality at scale.

## NEXT STEP

**`CapabilityMap` v2 publication surfacing**
(thirtieth slice). Scope: extend
`@rekon/capability-docs` with a
`buildCapabilityMapV2PublicationSection` helper
(or equivalent), wire it into the architecture
summary publisher + agent contract publisher,
add the `consumes: CapabilityMap` /
`invalidatedBy: capability-map.changed` manifest
entries to those publishers, ship contract +
docs tests, cite this safety review as the gate.

After publication surfacing: post-`CapabilityMap`-
v2 coverage review (gated on real-repo operator
feedback).

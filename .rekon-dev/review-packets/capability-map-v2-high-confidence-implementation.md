# Review Packet — CapabilityMap v2 High-Confidence-Only Implementation

Product / capability batch. **Twenty-eighth slice on
the capability-ontology track.** Implements the
additive `CapabilityMap` v2 projection committed to
by the
[CapabilityMap v2 High-Confidence-Only Decision](../../docs/strategy/capability-map-v2-high-confidence-decision.md)
(twenty-seventh slice). **No `EvidenceGraph`
mutation, no `CapabilityNormalizationReport`
mutation, no `CapabilityPhraseReport` mutation, no
existing v1 `entries[]` field removed / renamed /
behaviour-changed, no partial-phrase consumption, no
low-confidence-phrase consumption, no raw
normalization row consumption, no
`CapabilityContract`, no architecture linting, no
resolver routing, no source writes, no LLM-only
inference, no npm publish, no version bump, no git
tag, no GitHub Release, no new branch.**

## CHANGES MADE

### Kernel type extension

- `packages/kernel-repo-model/src/index.ts` — added
  the optional `phraseBackedCapabilities?`,
  `phraseBackedSummary?`, and `phraseSourceRef?`
  fields to the `CapabilityMap` type. Added
  `CapabilityMapPhraseBackedCapability` and
  `CapabilityMapPhraseBackedSummary` types.
  Extended `createCapabilityMap` to normalize /
  sort / dedupe the v2 fields deterministically
  (verb asc, noun asc, id asc; summary record keys
  alphabetically sorted). Extended
  `validateCapabilityMap` to validate optional v2
  entries (non-empty `evidenceRefs`, non-empty
  `sourceCandidateIds`, literal
  `confidence: "high"`, literal `status: "stable"`).

### Phrase-backed projection helper

- `packages/capability-model/src/phrase-backed.ts`
  — new build helper
  `buildPhraseBackedCapabilityMapAdditions(input)`.
  Uses structural typing (`PhraseReportLike` /
  `PhraseLike`) so `@rekon/capability-model` does
  **not** depend on `@rekon/capability-ontology`.
  Implements the conjunctive eligibility filter
  exactly: `status === "stable"` AND
  `confidence === "high"` AND non-empty
  `verb` / `noun` / `evidenceRefs` /
  `sourceCandidateIds`. Returns an empty object
  when no report ref is supplied. Stamps the
  consumed report ref into every entry's
  `phraseRef.report` and into the top-level
  `phraseSourceRef`.

### Producer wiring

- `packages/capability-model/src/index.ts` — the
  `modelProjector` now reads the latest
  `CapabilityPhraseReport` (when present), spreads
  the helper's output into the
  `createCapabilityMap` call, and adds the report
  ref to the `CapabilityMap`-specific `inputRefs`.
  Manifest gains `consumes:
  ["EvidenceGraph", "CapabilityPhraseReport"]` and
  a second invalidation rule
  (`capability-phrases.changed`). Absence of a
  `CapabilityPhraseReport` is benign — the
  projector emits a clean v1-shape `CapabilityMap`.
  Older runtimes that don't know the type get a
  `try`/`catch` fallback.

### New artifact reference doc

- `docs/artifacts/capability-map.md` — new artifact
  reference. Pins all six verbatim guarantees from
  the decision memo. Carries the eligibility table
  (rule → required value), the layer / role table,
  the schema table (v1 + v2), the deterministic
  ordering rule, the freshness / citation section,
  and the producer-boundary list (what the
  projector reads / writes / never mutates).

### New tests

- **Contract test**
  `tests/contract/capability-map-v2.test.mjs` (19
  assertions): v1-shape validation, v2-shape
  validation, helper projects stable
  high-confidence only, helper excludes
  partial / low-confidence / missing-verb-noun /
  empty-evidenceRefs / empty-sourceCandidateIds,
  deterministic ordering (verb → noun → id),
  alphabetically-sorted byVerb / byNoun keys,
  `withDomain` / `withPattern` / `withLayer`
  counts, `phraseSourceRef` set, CLI smoke (v1
  when no phrase report; v2 when present;
  `inputRefs` include the consumed report;
  artifacts validate clean), helper does not
  mutate input, structural typing (no
  `@rekon/capability-ontology` dependency),
  mixed-status report (partials absent), validator
  rejects ineligible v2 entries (empty
  `evidenceRefs`, non-stable status).
- **Docs test**
  `tests/docs/capability-map-v2.test.mjs` (11
  assertions): artifact doc exists, all six
  verbatim pins present, eligibility / layer-role
  tables present, three additive v2 fields
  enumerated, deterministic ordering documented,
  `capability-phrase-report.md` links to the new
  doc, `capability-normalization-report.md` notes
  the v2 boundary, `concepts/capability-ontology.md`
  references v2 and the new doc, CHANGELOG
  mentions the implementation, review packet (this
  file) carries `PURPOSE PRESERVATION CHECK`.

### Supporting doc updates

- `docs/artifacts/capability-phrase-report.md` —
  marks the v2 integration as shipped; updated
  read-only-mutation note.
- `docs/artifacts/capability-normalization-report.md`
  — restates the v2 boundary (raw rows not
  consumed by v2; phrase report is the source).
- `docs/concepts/capability-ontology.md` — layer 6
  now references the shipped v2 fields and the new
  artifact doc.
- `docs/strategy/capability-map-v2-high-confidence-decision.md`
  — Implementation Sequence step 3 marked
  shipped; step 4 (coverage review) becomes the
  next slice.
- `docs/strategy/post-ast-cohort-rerun.md` —
  Follow-Up Work entry for v2 implementation
  marked shipped.
- `docs/strategy/roadmap.md` — new
  twenty-eighth-slice entry at the top.
- `docs/strategy/classic-behavior-roadmap.md` —
  new twenty-eighth-slice entry at the top.
- `README.md` — new comment block at the top of
  the news section.
- `CHANGELOG.md` — new top entry.

## PUBLIC API CHANGES

| Change | Layer | Direction |
| --- | --- | --- |
| `CapabilityMap.phraseBackedCapabilities?` | `@rekon/kernel-repo-model` type | additive (optional) |
| `CapabilityMap.phraseBackedSummary?` | `@rekon/kernel-repo-model` type | additive (optional) |
| `CapabilityMap.phraseSourceRef?` | `@rekon/kernel-repo-model` type | additive (optional) |
| `CapabilityMapPhraseBackedCapability` | `@rekon/kernel-repo-model` type | new export |
| `CapabilityMapPhraseBackedSummary` | `@rekon/kernel-repo-model` type | new export |
| `buildPhraseBackedCapabilityMapAdditions` | `@rekon/capability-model` helper | new export |
| `PhraseLike` / `PhraseReportLike` / `BuildPhraseBackedAdditionsInput` / `PhraseBackedAdditions` | `@rekon/capability-model` types | new export |
| `@rekon/capability-model` manifest `consumes` | manifest | adds `CapabilityPhraseReport` |
| `@rekon/capability-model` manifest `invalidatedBy` | manifest | adds `capability-phrases.changed` |

No removals. No renames. No behavioural change to
existing v1 `entries[]` field.

## PURPOSE PRESERVATION CHECK

- **`CapabilityMap` v2 consumes
  `CapabilityPhraseReport`, not raw
  `CapabilityNormalizationReport` rows.** Verified
  by the helper's input type (`PhraseReportLike`,
  not `CapabilityNormalizationReport`-like) and by
  the producer (which calls `artifacts.list("CapabilityPhraseReport")`,
  not `list("CapabilityNormalizationReport")` for
  the v2 path). Contract test pins that the
  builder accepts read-only normalization /
  evidence refs structurally without consuming
  them.
- **Only stable high-confidence `CapabilityPhrase`
  claims are eligible for `CapabilityMap` v2.**
  Verified by the conjunctive guard in
  `buildPhraseBackedCapabilityMapAdditions`
  (`raw.status !== "stable"` and
  `raw.confidence !== "high"` short-circuit) and
  by validator rejection of any v2 entry whose
  `status !== "stable"` or `confidence !== "high"`.
  Six contract assertions guard this rule
  (partial, low-confidence, empty `evidenceRefs`,
  empty `sourceCandidateIds`, missing verb / noun,
  validator rejection).
- **Partial phrases remain semantic context and
  are not `CapabilityMap`-ready ownership or
  placement policy.** Verified by the exclusion
  assertion and by the mixed-status contract test:
  partials in the input report never appear in the
  output `phraseBackedCapabilities[]`.
- **`CapabilityMap` v2 is not `CapabilityContract`.**
  The v2 fields are read-only projections, not
  policy. No enforcement layer was added. The
  producer never invokes `resolve.policy`, never
  routes a resolver, never plans verification.
  Documentation explicitly states this in the
  artifact reference's *What CapabilityMap v2 Does
  Not Do* section.
- **`CapabilityMap` v2 is additive and existing
  `CapabilityMap` fields remain valid.** Existing
  v1 consumers reading `entries[]` continue to
  validate (test 1 asserts a v1-only shape
  validates cleanly; the unchanged
  `2570 pass / 0 fail / 10 skipped` test baseline
  confirms no regression on the v1 surface).
- **`CapabilityMap` should be stale when the
  consumed `CapabilityPhraseReport` changes.**
  Verified by the new manifest invalidation rule
  `capability-phrases.changed` consuming
  `CapabilityPhraseReport`. Verified in the
  manifest emission in
  `packages/capability-model/src/index.ts`.

### Boundary preservation (negative properties)

- `EvidenceGraph` writes — not added.
- `CapabilityNormalizationReport` writes — not
  added.
- `CapabilityPhraseReport` writes — not added.
  The producer reads the phrase report and never
  mutates it.
- Raw `CapabilityNormalizationReport` row
  consumption by `CapabilityMap` — not added. The
  helper takes a `PhraseReportLike`, never a
  normalization-report shape.
- Partial-phrase consumption — not added.
- Low-confidence-phrase consumption — not added.
- `CapabilityContract` — not added (no policy
  surface, no enforcement rules, no required
  checks).
- `RefactorPreservationContract` — not added.
- Architecture linting — not added.
- Resolver routing by capability — not added.
- Verification planning by capability — not added.
- Source writes — not added.
- LLM-only inference — not added (the helper is
  pure functional; no model invocation, no remote
  call).
- npm publish — not done.
- Version bump — not done.
- Git tag — not done.
- GitHub Release — not done.
- New branch — not created.
- Cross-package dependency from
  `@rekon/capability-model` to
  `@rekon/capability-ontology` — not added.
  Structural typing
  (`PhraseLike` / `PhraseReportLike`) preserves
  the existing dependency graph.

## RECOMMENDED NEXT SLICE

`CapabilityMap` v2 high-confidence-only **safety
review** — a read-only audit of the additive
projection. Likely scope: eligibility enforcement
re-verification, citation chain walkability
(entry → phrase → normalization candidate →
evidence), freshness semantics under stale phrase
reports, structural-typing boundary (confirming no
runtime dependency on `@rekon/capability-ontology`),
`CapabilityContract` gap (what v2 still does not
do).

After the safety review: post-`CapabilityMap`-v2
coverage review (fifth coverage review on the
phrase track; measure phrase-backed entry quality
on cohort + fixture).

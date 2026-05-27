# Review Packet — CapabilityPhraseReport Safety Review

End-to-end review of the
`CapabilityNormalizationReport → CapabilityPhraseReport
→ architecture summary / agent contract publication
surfacing` path. Strategy / docs / tests-only. **No
runtime change. No `CapabilityMap` mutation. No phrase
projection rule change. No new artifact registration. No
new CLI command. No source writes. No LLM-only inference.
No npm publish. No version bump. No git tag. No GitHub
Release. No new branch.**

## CHANGES MADE

- **New strategy memo**:
  `docs/strategy/capability-phrase-report-safety-review.md`
  with the 14 required headings (Decision Summary, Why
  This Review Exists, Projection Path Reviewed, Artifact
  Boundary Review, Publication Surfacing Review, Input
  Refs And Citations, No-Mutation Guarantee, Proof Report
  Deferral, CapabilityMap Boundary, CapabilityContract
  Boundary, Options Considered, Recommendation, What
  This Does Not Do, Follow-Up Work) plus the three
  required diagnostic tables (projection path / option /
  boundary).
- **New 12-assertion docs test**:
  `tests/docs/capability-phrase-report-safety-review.test.mjs`.
- **New review packet** (this file).
- **Supporting doc updates**:
  - `docs/strategy/capability-phrase-report-decision.md`
    — implementation-sequence row notes the safety
    review has shipped.
  - `docs/strategy/capability-phrase-contract-architecture-decision.md`
    — Follow-Up bullets updated to reflect the review
    outcome.
  - `docs/artifacts/capability-phrase-report.md` —
    Forward Compatibility section cross-links the
    safety review.
  - `docs/concepts/capability-ontology.md` — Semantic
    Layer section cross-links the safety review.
  - `docs/strategy/roadmap.md` — sixteenth-slice entry.
  - `docs/strategy/classic-behavior-roadmap.md` — same.
  - `README.md` — new comment block.
  - `CHANGELOG.md` — top entry.

## PUBLIC API CHANGES

None. This is a strategy / docs / tests-only batch. No
types change, no exports change, no schemas change, no
CLI surface changes.

## PURPOSE PRESERVATION CHECK

- `CapabilityNormalizationReport` remains the
  translation audit. Shape unchanged across the entire
  phrase track.
- `CapabilityPhraseReport` is the semantic purpose
  projection. Strict v1 projection rules continue:
  high-confidence + normalized + high-confidence lexical
  split → emitted as `status === "stable"`. Unknown /
  ignored / low-confidence rows remain audit signal and
  never project.
- `CapabilityMap` v1 unchanged. v2 stays deferred
  pending real-repo phrase coverage measurement.
- Publications stay read-only. Architecture summary +
  agent contract surface the phrase report; neither
  mutates it.
- Proof report surfacing stays deferred —
  `CapabilityPhraseReport` is semantic context, not
  verification proof.
- `CapabilityContract` and
  `RefactorPreservationContract` remain reserved
  future layers.
- Source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

- Aligned with the
  [Capability Ontology Architecture Impact Review](../../docs/strategy/capability-ontology-architecture-impact-review.md):
  the eight architectural reservations are upheld;
  raw evidence stays separate from normalized purpose;
  normalization decisions are audited;
  `CapabilityMap` consumes only normalized claims via
  the phrase carrier.
- Aligned with the
  [Translation Layer Decision](../../docs/strategy/capability-ontology-translation-layer-decision.md):
  Layer 5b is now a measured, operator-visible
  surface. Layer 6 (`CapabilityMap`) consumption is
  pinned to phrase claims, not raw normalization rows.
- Aligned with the
  [CapabilityPhrase + CapabilityContract Architecture
  Decision](../../docs/strategy/capability-phrase-contract-architecture-decision.md):
  the architectural primitive is operator-visible and
  surrounded by read-only surfaces.
- Aligned with the
  [CapabilityPhraseReport Decision](../../docs/strategy/capability-phrase-report-decision.md):
  Option B (separate carrier) is doing exactly what the
  decision required — keeping translation audit and
  semantic projection distinct.
- Aligned with the
  [Capability Ontology Suggestion Safety Review](../../docs/strategy/capability-ontology-suggestion-safety-review.md):
  preview-only, operator-control, no auto-mutation.
  The phrase track follows the same posture.

## PROJECTION PATH REVIEWED

| Step | Artifact / Command | Role | Boundary |
| --- | --- | --- | --- |
| normalize | `CapabilityNormalizationReport` | translation audit | raw `EvidenceGraph` facts unchanged |
| phrase project | `CapabilityPhraseReport` | semantic purpose projection | `CapabilityMap` unchanged |
| architecture summary | `Publication` (architecture summary) | operator surface | read-only |
| agent contract | `Publication` (agent contract) | agent guidance | read-only |

Every arrow is additive. No downstream consumer mutates
an upstream artifact.

## ARTIFACT BOUNDARY REVIEW

- **`CapabilityNormalizationReport`** (Layer 5):
  translation audit only. Shape unchanged.
- **`CapabilityPhraseReport`** (Layer 5b): semantic
  purpose projection. v1 strict projection rules hold;
  partial / future fields stay absent without
  deterministic evidence.
- **`CapabilityMap`** (Layer 6): v1 derived from
  `ObservedRepo` + `OwnershipMap`, unchanged. v2
  deferred until real-repo phrase coverage is
  measured.
- **`CapabilityContract`** (Layer 7): reserved.
  Operator-authored, not observed. Distinct from
  `CapabilityPhraseReport`.

## PUBLICATION SURFACING

Both surfaces shipped at `6e2c0c2`. Both are strictly
read-only.

- **Architecture summary** carries a `## Capability
  Phrases` section with the deferred-`CapabilityMap`
  callout, summary counts, and a bounded phrase
  table.
- **Agent contract** carries a `### Capability
  Phrases` subsection with the same metadata, plus a
  `Do Not Do` reminder pinning that phrases are not
  `CapabilityMap` ownership or placement policy.
- **Proof report** surfacing is deliberately deferred.

## CAPABILITYMAP BOUNDARY

`CapabilityMap` v2 stays deferred until measured
coverage proves stable-phrase quality across canon-pack
archetypes. The safety review does not declare v2
ready; it pins the gate.

v2 will consume **only stable high-confidence**
`CapabilityPhrase` claims via the phrase report. Raw
normalization rows never enter the canonical
projection.

## RECOMMENDATION

Selected: **CapabilityPhraseReport is safe and stable
as the semantic purpose projection layer.
`CapabilityMap` v2 stays deferred until one real-repo
phrase coverage review measures stable-phrase quality.**

Recommended next slice: **CapabilityPhraseReport
real-repo coverage review** — measure phrase count
per archetype, stable-phrase ratio, evidence-ref
distribution, and publication usefulness on the
fixture + at least one real cohort target.

## TESTS / VERIFICATION

- **New 12-assertion docs test**
  `tests/docs/capability-phrase-report-safety-review.test.mjs`
  pins every verbatim guarantee + the three required
  diagnostic tables + CHANGELOG mention + this packet's
  PURPOSE PRESERVATION CHECK section.
- Expected full suite: 2361 pass (2349 + 12 new) / 10
  skipped / 0 fail.
- 9-command gate: typecheck / test / build /
  audit-package-exports / audit-license /
  publish-dry-run / install-smoke /
  install-tarball-smoke all green.
- No CLI smoke required for strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `CapabilityNormalizationReport` shape unchanged.
- `CapabilityPhraseReport` shape unchanged.
- `CapabilityMap` unchanged.
- `EvidenceGraph` unchanged.
- `CapabilityNormalizationReviewLedger` unchanged.
- `CapabilityOntologySuggestionReport` unchanged.
- Canon packs / overrides unchanged.
- Publication shape unchanged.
- CLI commands unchanged.
- Phrase projection rules unchanged.
- No new permission. No new role. No workflow YAML
  change. No version bump. No npm publish.

## RISKS / FOLLOW-UP

Risks:

1. Operators read the phrase publication section as
   `CapabilityMap` placement policy. Mitigation: the
   inline deferred-`CapabilityMap` callout + agent
   contract `Do Not Do` reminder + this safety
   review's verbatim pins.
2. `CapabilityMap` v2 ships before real-repo
   coverage. Mitigation: the safety review explicitly
   pins the gate; the recommended next slice is the
   coverage review.
3. Coverage data shows phrases collapse to 0 on
   real repos. Mitigation: enrichment slices per
   evidence source can land before v2; the safety
   review supports either ordering depending on
   coverage data.
4. AST adapters get prioritized before lexical
   evidence stabilizes. Mitigation: AST stays
   optional enrichment, per the architecture
   decision. The safety review re-pins it.

Follow-up:

- **CapabilityPhraseReport real-repo coverage review**
  (next slice).
- **Phrase confidence + status model decision**
  (after coverage review).
- **Per-evidence-source enrichment slices** (one per
  source).
- **`CapabilityMap` v2 design** (gated on coverage
  review).
- **`CapabilityContract` decision** (further future).

## NEXT STEP

Recommended: **CapabilityPhraseReport real-repo
coverage review** — strategy / docs / tests batch that
runs `refresh → normalize → phrase project` against
the fixture and at least one real cohort target and
records:

- phrase count by archetype
- stable-phrase ratio
- evidence-ref distribution
- publication usefulness
- whether high-confidence-only projection gives useful
  signal across multiple targets

Output drives the `CapabilityMap` v2 high-confidence-
only decision.

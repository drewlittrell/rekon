# Review Packet — CapabilityMap v2 Publication Safety Review

Strategy / safety review batch. **Thirty-first slice
on the capability-ontology track.** Reviews the
thirtieth slice's publication surfacing
(architecture summary + agent contract render
`CapabilityMap` v2 phrase-backed capabilities as
operator + agent context). **Recommendation:
publication surfacing is safe / stable as read-only
visibility. Ship `CapabilityContract` architecture
decision as the next slice.** No runtime changes in
this batch. No publisher mutation. No
`CapabilityMap` mutation. No
`CapabilityPhraseReport` /
`CapabilityNormalizationReport` / `EvidenceGraph`
mutation. No `CapabilityContract` artifact / type /
helper introduced. No architecture linting. No
resolver routing. No verification planning. No
source writes. No LLM-only inference. No npm
publish. No version bump. No git tag. No GitHub
Release. No new branch.

## CHANGES MADE

- **New strategy memo**
  `docs/strategy/capability-map-v2-publication-safety-review.md`
  with the 11 required headings (Decision Summary,
  Why This Review Exists, Publication Surfaces
  Reviewed, Read-Only Guarantee, Boundary Statement
  Review, Agent Contract Do Not Do Review, Proof
  Report Deferral, Options Considered,
  Recommendation, What This Does Not Do, Follow-Up
  Work) plus three required tables (surface,
  boundary, option).
- **New 13-assertion docs test**
  `tests/docs/capability-map-v2-publication-safety-review.test.mjs`
  pinning the five required statements, the three
  required tables, the eleven required headings,
  the CHANGELOG mention, and the review packet
  `PURPOSE PRESERVATION CHECK`.
- **New review packet** (this file).
- **Supporting doc updates** (13):
  - `docs/strategy/capability-map-v2-safety-review.md`
    — Follow-Up Work entry for publication
    surfacing tightened to add a pointer to this
    publication safety review.
  - `docs/strategy/capability-map-v2-high-confidence-decision.md`
    — Implementation Sequence step 6 marked ✅
    shipped (publication safety review); step 7
    (post-publication coverage review) becomes
    parallel / opportunistic; new step 8
    (`CapabilityContract` architecture decision)
    is the recommended next slice.
  - `docs/artifacts/capability-map.md` — Related
    Documents lists the publication safety review.
  - `docs/artifacts/capability-phrase-report.md`
    — cross-link to the publication safety review.
  - `docs/concepts/capability-ontology.md` — Layer
    6 entry references the publication safety
    review.
  - `docs/concepts/architecture-summary-publication.md`
    — CapabilityMap v2 Surfacing section gains a
    safety-review cross-link.
  - `docs/artifacts/architecture-summary-publication.md`
    — Cross-References list extended with the
    publication safety review.
  - `docs/concepts/agent-operating-contract.md` —
    Section Map row gains a safety-review pointer.
  - `docs/artifacts/agent-contract-publication.md`
    — CapabilityMap v2 section gains a
    safety-review cross-link.
  - `docs/concepts/proof-report-publication.md` —
    What This Is Not entry for v2 surfacing
    deferral re-cites the publication safety
    review.
  - `docs/artifacts/proof-report-publication.md`
    — What This Is Not entry tightened with a
    safety-review pointer.
  - `docs/strategy/roadmap.md` — new
    thirty-first-slice entry at the top.
  - `docs/strategy/classic-behavior-roadmap.md`
    — new thirty-first-slice entry at the top.
  - `README.md` — new comment block at the top
    of the news section.
  - `CHANGELOG.md` — new top entry.

## PUBLIC API CHANGES

None. Strategy / safety review / docs / tests-only
batch. No type changes. No helper changes. No
producer changes. No manifest changes. No CLI
changes. No SDK changes. No runtime changes.

## PURPOSE PRESERVATION CHECK

The publication safety review explicitly preserves
every pin from the
[publication surfacing batch](../../CHANGELOG.md)
and adds five required statements (asserted by the
docs test):

- **`CapabilityMap` v2 publication surfacing is
  read-only visibility.** Verified by the existing
  contract test's no-mutation properties
  (`CapabilityMap` / `CapabilityPhraseReport` /
  `CapabilityNormalizationReport` /
  `EvidenceGraph` all stay digest-stable across
  publication runs) and re-walked by the review
  against the helper's purity, the publisher's
  read-only paths, and the manifest's lack of new
  invalidation rules.
- **`CapabilityMap` v2 phrase-backed capabilities
  are projection context, not `CapabilityContract`
  policy.** The boundary statement is rendered in
  every section. The agent contract `Do Not Do`
  reminder restates this.
- **`CapabilityMap` v2 phrase-backed capabilities
  do not imply resolver routing, architecture
  linting, verification planning, source-write
  permission, or finding resolution.** The first
  four are enumerated in the section boundary
  statement and the `Do Not Do` reminder. Finding
  resolution is a low-priority follow-up (no
  current surface links v2 to findings; this
  review notes the additional reminder as
  optional).
- **Proof report surfacing remains deferred
  because `CapabilityMap` v2 is semantic
  projection, not verification proof.** Verified
  by the contract test's assertion that the proof
  report does not render a v2 section, and by the
  proof-report concept doc + artifact reference
  pinning the deferral.
- **`CapabilityContract` decision work may begin
  after this safety review if no blockers are
  found.** No blockers were found; the
  Recommendation section selects
  `CapabilityContract` architecture decision as
  the next slice.

### Boundary preservation (negative properties)

- `EvidenceGraph` writes — confirmed absent.
- `CapabilityNormalizationReport` writes —
  confirmed absent.
- `CapabilityPhraseReport` writes — confirmed
  absent.
- `CapabilityMap` writes — confirmed absent.
- Publication mutation of source files — confirmed
  absent.
- Publication invocation of CLI commands —
  confirmed absent.
- `CapabilityContract` artifact / type / helper —
  confirmed absent.
- Architecture linting — confirmed absent.
- Resolver routing by capability — confirmed
  absent.
- Verification planning by capability — confirmed
  absent.
- Source-write apply — confirmed absent.
- LLM-only inference — confirmed absent.
- New artifact type — confirmed absent.
- New invalidation rule — confirmed absent.
- npm publish — not done.
- Version bump — not done.
- Git tag — not done.
- GitHub Release — not done.
- New branch — not created.

## CODEBASE-INTEL ALIGNMENT

The review preserves Rekon's classic-parity
guarantees:

- **Projection / policy split**: the rendered
  surfaces are projection only. Policy stays with
  the (future) `CapabilityContract` artifact.
- **Read-only publishers**: publishers continue to
  read artifacts and write `Publication` artifacts
  only. They never run CLI commands, never mutate
  source, never touch upstream artifacts.
- **Operator visibility before policy**: the
  publication surfacing precedes the
  `CapabilityContract` decision. Operators see and
  validate v2 entries before policy uses them.
- **Citation chain preserved**: entries continue to
  carry `phraseRef.report` + `phraseRef.phraseId`
  plus `evidenceRefs[]`. The publication renders
  use these for human / agent attribution; they
  remain walkable to source evidence.

## PUBLICATION SURFACES REVIEWED

| Surface | Status | Boundary |
| --- | --- | --- |
| architecture summary | shipped | read-only operator visibility |
| agent contract | shipped | read-only agent guidance |
| proof report | deferred | semantic projection is not proof |

Each surface walked end-to-end. No mutation
surface introduced. Boundary statements rendered
in both shipped surfaces. Proof report deferral
preserved.

## READ-ONLY GUARANTEE

The helper
`buildCapabilityMapV2PublicationSection` is pure:

- No `fs.write*` call.
- No `artifacts.write` call.
- No `spawnSync` / `spawn` / `exec` call.
- No LLM invocation.
- No network call.
- Input is a structurally-typed
  `CapabilityMapV2Like` object; output is `{
  lines: string[], inputRef?: ArtifactRef }`.

The architecture summary and agent contract
publishers wrap the helper with
`readLatestArtifact<CapabilityMap>(...)` and emit
the helper's lines into the publication content.
Neither publisher writes back to `CapabilityMap`,
`CapabilityPhraseReport`,
`CapabilityNormalizationReport`, or
`EvidenceGraph`. The proof report does not call
the helper at all.

## BOUNDARY STATEMENT REVIEW

| Overclaim Risk | Guardrail |
| --- | --- |
| treated as `CapabilityContract` policy | explicit boundary statement |
| treated as resolver routing authority | agent Do Not Do reminder |
| treated as architecture lint finding | agent Do Not Do reminder |
| treated as verification requirement | agent Do Not Do reminder |
| treated as source-write permission | agent Do Not Do reminder |

The boundary statement enumerates every overclaim
risk identified. The agent contract `Do Not Do`
reminder restates these as a do-not-treat-as
list. Both surfaces emit the statements
unconditionally — even when v2 fields are absent,
the helper's empty-state path still emits the
boundary statement and the proof-report-deferral
line.

## AGENT CONTRACT DO NOT DO REVIEW

The agent contract gained a v2-specific
`Do Not Do` reminder in the thirtieth slice. The
review re-checks coverage:

| Surface | Covered? |
| --- | --- |
| `CapabilityContract` policy | ✅ |
| resolver routing authority | ✅ |
| architecture lint findings | ✅ |
| verification requirements | ✅ |
| source-write permission | ✅ |
| finding resolution | low-priority follow-up (no current path to overclaim) |

The existing CapabilityPhraseReport `Do Not Do`
entry was also updated in the thirtieth slice to
acknowledge that v2 has shipped (it previously
pinned `CapabilityMap` integration as deferred).
The review confirms the wording is accurate: v2
projection has shipped, `CapabilityContract`
policy remains deferred.

## PROOF REPORT DEFERRAL

Proof report surfacing of `CapabilityMap` v2
remains **deferred**. Rationale:

- `CapabilityMap` v2 is semantic capability
  projection, not verification proof.
- The proof report describes
  `VerificationPlan` / `VerificationResult` proof
  state. Surfacing v2 there would conflate
  semantic projection with verification proof and
  invite agents / operators to treat v2 entries as
  proof of completion.

Verified by the contract test (proof report
content does not include the v2 section) and by
the proof-report concept doc + artifact reference
(both document the deferral in their
`What This Is Not` lists).

The deferral remains correct. If a future slice
surfaces v2 in proof reports, it must ship its
own decision memo + safety review.

## RECOMMENDATION

`CapabilityMap` v2 publication surfacing is safe /
stable as read-only visibility. **No blockers.**
Ship `CapabilityContract` architecture decision as
the next slice.

Deferred (gated on
`CapabilityContract` decision + subsequent
implementation slices):

- Architecture linting from `CapabilityContract`.
- Resolver routing by capability.
- Verification planning by capability.
- Source-write apply.

## TESTS / VERIFICATION

- New 13-assertion docs test passes.
- All previously-passing tests still pass (2639
  pass / 0 fail / 10 skipped baseline from the
  thirtieth slice).
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

- `packages/capability-docs/src/index.ts` —
  helper + publishers stay frozen.
- `packages/kernel-repo-model/src/index.ts` —
  `CapabilityMap` type stays frozen.
- `packages/capability-model/src/**` — producer
  stays frozen.
- All other `packages/*/src/**` — no source
  changes.
- `tests/contract/capability-map-v2-publications.test.mjs`
  — contract test stays frozen.
- `tests/contract/capability-map-v2.test.mjs`
  — projection contract test stays frozen.
- All publication artifacts in `.rekon/` — not
  regenerated.

## RISKS / FOLLOW-UP

- **Finding-resolution overclaim risk (low).** No
  current surface links `CapabilityMap` v2
  entries to `FindingLifecycleReport` /
  `IssueAdjudicationReport`. If a future surface
  introduces such a link, the agent contract
  `Do Not Do` reminder should gain a
  finding-resolution clause.
- **Operator confusion between v1 entries[] and
  v2 phrase-backed entries (low; documented).**
  The architecture summary renders both sections
  separately (Ownership And Capabilities for v1
  entries; CapabilityMap v2 Phrase-Backed
  Capabilities for v2). The boundary statement
  helps disambiguate.
- **Premature `CapabilityContract` adoption
  (medium).** Operators or agents may try to
  enforce policy on v2 entries before
  `CapabilityContract` ships. Mitigation: the
  `Do Not Do` reminder explicitly prohibits this,
  and the next slice (`CapabilityContract`
  architecture decision) is strategy-only.

## NEXT STEP

**`CapabilityContract` architecture decision**
(thirty-second slice). Scope: strategy /
decision memo only. Pins policy / placement /
preservation semantics for the next layer of the
capability ontology:

- Allowed layers per capability.
- Allowed systems per capability.
- Forbidden layers per capability.
- Required checks (cross-link to
  `VerificationPlan` semantics).
- Required / forbidden neighbouring capabilities.
- Preservation rules (cross-link to
  `RefactorPreservationContract` placeholders).

No implementation, no linting, no routing, no
verification planning, no source writes. Strict
decision-memo only.

After the architecture decision:
`CapabilityContract` implementation slice (gated
on the decision).

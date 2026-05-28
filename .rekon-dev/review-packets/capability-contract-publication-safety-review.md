# Review packet — CapabilityContract publication safety review

**Slice:** thirty-sixth on the capability-ontology track.

**Scope:** end-to-end read-only audit of the
`CapabilityContract` publication surfacing shipped at
`ebf8b56`. Strategy / safety-review batch.

**Status:** Shipped.

## CHANGES MADE

- New strategy memo:
  [`docs/strategy/capability-contract-publication-safety-review.md`](../../docs/strategy/capability-contract-publication-safety-review.md)
  with 11 required headings and 3 required tables
  (surface, boundary, option).
- New docs test:
  `tests/docs/capability-contract-publication-safety-review.test.mjs`
  with 13 assertions.
- Updated cross-references in 12 supporting docs +
  README + CHANGELOG (v1 safety review memo,
  architecture decision memo, `CapabilityContract`
  artifact + concept docs, architecture-summary
  publication concept + artifact docs,
  agent-operating-contract concept + artifact docs,
  proof-report publication concept + artifact docs,
  roadmap + classic roadmap, README, CHANGELOG).
- This review packet at
  `.rekon-dev/review-packets/capability-contract-publication-safety-review.md`.

## PUBLIC API CHANGES

None. This is a strategy / safety-review batch. No
source files under `packages/` change. No artifact
type, helper, validator, CLI command, publication
surface, or permission is added, removed, or modified.

## PURPOSE PRESERVATION CHECK

The original purpose of `CapabilityContract`
publication surfacing is to make operator-authored
policy visible to operators and agents — without
making it executable. The thirty-fifth slice (the
implementation) committed to this in code; this slice
audits the commitment.

This safety review confirms:

- CapabilityContract publication surfacing is
  read-only visibility.
- CapabilityContract is policy, not projection or
  enforcement.
- CapabilityContract publication surfacing does not
  imply architecture linting, resolver routing,
  verification planning, finding resolution,
  `RefactorPreservationContract` behavior, or
  source-write permission.
- Publications read the latest CapabilityContract;
  they never generate it.
- Proof report surfacing remains deferred because
  CapabilityContract is policy context, not
  verification proof.
- Architecture linting decision work may begin after
  this safety review if no blockers are found.

## CODEBASE-INTEL ALIGNMENT

No codebase-intel surface changes. The publisher
boundary in `@rekon/capability-docs` continues to
enforce read-only-over-artifacts; the publisher
manifest's new `capability-contract.changed`
invalidation rule (added in the thirty-fifth slice)
remains correctly scoped to invalidation only — it
never re-runs `rekon capability contract generate` or
mutates the contract.

## PUBLICATION SURFACES REVIEWED

| Surface | Status | Boundary |
| --- | --- | --- |
| architecture summary | shipped | read-only operator visibility |
| agent contract | shipped | read-only agent guidance |
| proof report | deferred | policy context is not proof |

- **Architecture summary** — `## Capability
  Contracts` rendered after the CapabilityMap v2
  section; cites the latest `CapabilityContract` in
  `header.inputRefs`; carries the boundary
  statement; bounded contract table at 20 rows;
  no-contract guidance branch when absent.
- **Agent contract** — `### Capability Contracts`
  inside the operating-state group; mirrors the
  architecture summary content; carries the
  boundary statement; uses the same bounded table.
- **Proof report** — deferred; `CapabilityContract`
  is operator-authored policy context, not
  verification proof; re-evaluation requires its
  own decision + safety review pair.

## READ-ONLY GUARANTEE

The publication generation path may:

- Read the latest `CapabilityContract`.
- Render summary counts, the bounded contract
  table, and the boundary statement.
- Cite the contract in `header.inputRefs`.

The publication generation path **must not**:

- Run `rekon capability contract generate`.
- Mutate the `CapabilityContract` artifact.
- Mutate `.rekon/capability-contracts.json`.
- Mutate `CapabilityMap`,
  `CapabilityPhraseReport`, or `EvidenceGraph`.
- Mutate any other upstream artifact.
- Enforce policy.
- Create findings.
- Update lifecycle status.

The 19-assertion contract test
(`tests/contract/capability-contract-publications.test.mjs`)
pins each invariant. The
`buildCapabilityContractPublicationSection` helper
in `@rekon/capability-docs` is pure: JSON-shaped
input → string lines, no I/O.

## BOUNDARY STATEMENT REVIEW

The boundary statement is rendered verbatim:

> *"CapabilityContract is policy, not projection.
> CapabilityContract is policy visibility only; this
> publication does not enforce linting, routing,
> verification planning, or source writes."*

Covered overclaim risks (table in memo):

- architecture linting ✅
- resolver routing ✅
- verification planning ✅
- finding resolution ✅
- `RefactorPreservationContract` behavior ✅
- source-write permission ✅

## AGENT CONTRACT DO NOT DO REVIEW

Reminder added in the thirty-fifth slice:

> *"Do not treat CapabilityContract publication
> surfacing as architecture linting, resolver
> routing, verification planning, finding
> resolution, RefactorPreservationContract, or
> source-write permission. The CapabilityContract
> section in this contract is policy visibility
> only; configured / unmatched rows are
> operator-authored policy records, not enforced
> behavior."*

Coverage: all six overclaim risks named explicitly.
Phrasing pins the distinction between
*configured* (operator-authored, not enforced) and
*unmatched* (no current match in `CapabilityMap`
v2) row statuses. Ends with the explicit "not
enforced behavior" pin so any agent quoting the
reminder pulls that pin into its reasoning trace.

## PROOF REPORT DEFERRAL

Documented in three places (proof-report concept
doc, proof-report artifact doc, this memo).
Rationale: `CapabilityContract` is policy context,
not verification proof. Surfacing in the proof
report would conflate policy visibility with
verification proof. The proof-report publisher
source code does not read `CapabilityContract` and
does not render any section about it. Re-evaluation
requires its own decision + safety review pair.

## RECOMMENDATION

**Declare `CapabilityContract` publication
surfacing safe / stable as read-only visibility.**

**Begin the capability-aware architecture linting
decision as the next slice.** Strategy / decision
memo only. The memo must:

- Enumerate the surface options for policy-driven
  findings.
- Pin a recommended option with explicit boundary
  statements.
- Defer the actual linting implementation, resolver
  routing, verification planning, finding
  resolution, `RefactorPreservationContract`, and
  source writes.
- Carry its own safety-review pair before any
  enforcement-adjacent code lands.

## TESTS / VERIFICATION

- 13-assertion docs test
  `tests/docs/capability-contract-publication-safety-review.test.mjs`
  pins the verbatim guarantees in the safety review
  memo + CHANGELOG + review packet.
- The thirty-fifth slice's 19-assertion contract
  test (`tests/contract/capability-contract-publications.test.mjs`)
  + 11-assertion docs test (`tests/docs/capability-contract-publications.test.mjs`)
  still pass — this safety-review slice does not
  change runtime behavior.
- 9-command verification gate runs clean:
  typecheck · test · build · diff-check ·
  audit-package-exports · audit-license ·
  publish-dry-run · install-smoke ·
  install-tarball-smoke.

## INTENTIONALLY UNTOUCHED

- All source files under `packages/`.
- All artifact validators.
- All CLI command implementations.
- All publication surfaces (architecture summary,
  agent contract, proof report, GitHub Check, PR
  comment).
- The `.rekon/capability-contracts.json` shape.
- The `CapabilityContract` artifact shape.
- The `RefactorPreservationContract` layer.

## RISKS / FOLLOW-UP

Tracked, not gating:

- **Capability-aware architecture linting
  decision** (next slice).
- **Publication polish.** Per-row links to relevant
  source files; per-row link to the consumed
  `CapabilityMap` v2 entry. Refinement candidate
  after the linting decision lands.
- **Cohort dogfood pass.** Operator reactions to
  the new section. Parallel to the architecture
  linting decision.
- **Long-deferred enforcement consumers** remain in
  their own decision queues: resolver routing by
  capability · verification planning by
  capability · finding resolution ·
  `RefactorPreservationContract` · source writes.
- **`suggested`-row workflow.** Still reserved.

## NEXT STEP

Capability-aware architecture linting decision —
strategy / decision memo only. Pins whether and how
configured `CapabilityContract` policy ever becomes
findings or lint reports without shipping linting
itself. Still no resolver routing. Still no
verification planning. Still no finding resolution.
Still no source writes.

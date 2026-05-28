# Review Packet: CapabilityArchitectureLintReport Publication Safety Review

Forty-first slice on the codebase-intel-classic
capability-ontology track. Strategy / safety-review
batch. Read-only end-to-end audit of the
`CapabilityArchitectureLintReport` publication surfacing
shipped at `d01fe23`.

## CHANGES MADE

- New strategy memo
  `docs/strategy/capability-architecture-lint-publication-safety-review.md`
  with 11 required headings (Decision Summary, Why This
  Review Exists, Publication Surfaces Reviewed, Read-Only
  Guarantee, Boundary Statement Review, Agent Contract Do
  Not Do Review, Proof Report Deferral, Options
  Considered, Recommendation, What This Does Not Do,
  Follow-Up Work) and 3 required tables (surface /
  boundary / option).
- New review packet (this file).
- New docs test
  `tests/docs/capability-architecture-lint-publication-safety-review.test.mjs`
  (14 assertions).
- Cross-references added to 14 supporting docs + README +
  CHANGELOG.

## PUBLIC API CHANGES

None. Strategy / docs-only batch. No types, helpers, CLI
commands, publishers, artifact registrations, or runtime
behavior changed.

## PURPOSE PRESERVATION CHECK

Original problem:

> `CapabilityArchitectureLintReport` is now visible in
> the main operator/agent publications. Visibility is
> valuable, but architecture-lint wording is
> enforcement-adjacent. Before finding-bridge design
> begins, Rekon needs to verify that surfacing stays
> read-only and that the wording does not imply
> FindingReport, lifecycle, CoherencyDelta, routing,
> verification, preservation-contract, or source-write
> behavior.

This memo delivers that review. It preserves the product
guarantee:

- `CapabilityArchitectureLintReport` publication
  surfacing is visibility only.
- Publication generation is read-only.
- `findingCandidate` remains preview-only.
- Proof report remains proof-only and does not mix in
  lint/evaluation context.
- Finding bridge remains deferred to its own decision and
  safety review.

The review confirms each holds in the shipped surfacing
and recommends the finding-bridge **decision** (not
implementation) as the next slice.

## CODEBASE-INTEL ALIGNMENT

The review reuses the read-only-audit model proven by the
`CapabilityContract` publication safety review
(thirty-sixth slice): audit the shipped surface, assert
every boundary statement, confirm the proof-report
deferral, evaluate options, and recommend the next slice
that designs a boundary before adding behavior. It keeps
the capability-ontology stack on its disciplined cadence:
decision → implementation → safety review → surfacing →
**surfacing safety review** → (next) bridge decision.

## PUBLICATION SURFACES REVIEWED

- `buildCapabilityArchitectureLintPublicationSection`
  helper (pure, structural-typed).
- Architecture summary `## Capability Architecture
  Linting` section (cites lint report in inputRefs).
- Agent contract `### Capability Architecture Linting`
  section + `Do Not Do` reminder.
- Proof report deferral.
- 20-assertion contract test + 10-assertion docs test.
- Manifest consumes + `capability-architecture-lint.changed`
  invalidation rule.

Finding: surfacing is sound, read-only, and bounded.

## READ-ONLY GUARANTEE

Publishers read the latest lint report and render it;
they mutate nothing and never run `rekon capability lint
architecture`. The contract test snapshots the artifact
index before/after both publish commands and asserts
counts + digests unchanged for the lint report,
`CapabilityContract`, `CapabilityMap`, `FindingReport`,
`FindingLifecycleReport`, and `CoherencyDelta`, plus a
clean `artifacts validate`. Confirmed safe.

## BOUNDARY STATEMENT REVIEW

Both surfaces carry the verbatim boundary line
("evaluation visibility only; this publication does not
write findings, mutate lifecycle state, route resolvers,
generate verification plans, or write source files") plus
the evaluation guidance ("evaluation, not enforcement;
violation rows are policy-evaluation signals, not
governed findings; findingCandidate is preview-only").
Confirmed visible enough on both surfaces.

## AGENT CONTRACT DO NOT DO REVIEW

The agent-contract `Do Not Do` reminder covers all seven
overclaim risks: FindingReport mutation, lifecycle
mutation, CoherencyDelta remediation, resolver routing,
verification planning, RefactorPreservationContract, and
source-write permission. Coverage is complete.

## PROOF REPORT DEFERRAL

Proof-report surfacing remains deferred —
`CapabilityArchitectureLintReport` is evaluation context,
not verification proof. Documented in both proof-report
docs. Still correct.

## RECOMMENDATION

`CapabilityArchitectureLintReport` publication surfacing
is safe / stable as read-only visibility. Recommended
next slice: **CapabilityArchitectureLintReport →
FindingReport bridge decision** (strategy / decision memo
only). Bridge implementation and all governed-finding /
routing / verification / source-write behavior stay
deferred.

## TESTS / VERIFICATION

- New docs test
  `tests/docs/capability-architecture-lint-publication-safety-review.test.mjs`
  (14 assertions: doc presence, all required headings,
  seven boundary statements, three tables, CHANGELOG
  mention, review-packet PURPOSE PRESERVATION CHECK).
- Full 9-command gate (typecheck / test / build /
  diff-check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke /
  install-tarball-smoke) green. No CLI smoke required for
  a strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `buildCapabilityArchitectureLintPublicationSection`
  helper + publisher wiring.
- `CapabilityArchitectureLintReport` type / factory /
  validator / helper / CLI.
- `CapabilityContract`, `CapabilityMap`,
  `CapabilityPhraseReport`, `EvidenceGraph`.
- `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `CoherencyDelta`.
- Resolver routing, verification planning, source-write
  reconciliation, `RefactorPreservationContract`.
- Proof-report publication (deferred).

## RISKS / FOLLOW-UP

- The surfaced section is enforcement-adjacent in wording;
  the boundary statement + Do Not Do reminder mitigate
  misreading. The finding-bridge decision must preserve
  the finding-filter chain and adjudication checkpoint.
- System rules remain `not-evaluated` until phrase-backed
  capabilities gain a deterministic `system` field.
- The bridge decision is the highest-leverage deferred
  work; it must be a separate decision + safety review
  pair.

## NEXT STEP

Recommended next slice:
**CapabilityArchitectureLintReport → FindingReport bridge
decision**. Decide whether/how selected lint rows become
governed findings. Still no bridge implementation, no
FindingLifecycleReport mutation, no CoherencyDelta
mutation, no resolver routing, no verification planning,
no source writes.

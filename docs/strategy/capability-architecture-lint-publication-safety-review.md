# CapabilityArchitectureLintReport Publication Safety Review

**Slice:** forty-first on the codebase-intel-classic
capability-ontology track.

**Scope:** strategy / safety-review batch. Read-only
end-to-end audit of the
`CapabilityArchitectureLintReport` **publication
surfacing** shipped at `d01fe23`. No runtime behavior
changes. No publication behavior changes. No source
files under `packages/` modified beyond docs
cross-references.

## Decision Summary

**`CapabilityArchitectureLintReport` publication
surfacing is safe / stable as read-only visibility.**
The architecture summary and agent contract surface the
latest lint report through a pure, structural-typed
helper; both publishers read the report, render a
`Capability Architecture Linting` section, cite it in
`header.inputRefs`, and mutate nothing. The
evaluation-vs-enforcement boundary holds: `violation`
rows are policy-evaluation signals, not governed
findings, and `findingCandidate` stays preview-only.

**Recommended next slice:**
`CapabilityArchitectureLintReport` → `FindingReport`
**bridge decision**. The lint evaluation is now
generated, safety-reviewed, and visible; the next
boundary to design is whether and how selected lint rows
become governed findings. The bridge **implementation**,
and any `FindingLifecycleReport` / `CoherencyDelta` /
resolver-routing / verification-planning /
source-write behavior, stay deferred to that decision and
its own safety review.

## Why This Review Exists

`CapabilityArchitectureLintReport` is now visible in the
two main operator/agent publications. Visibility is
valuable, but architecture-lint wording
(`violation`, `findingCandidate`, severity, confidence)
is enforcement-adjacent — it reads close enough to a
governed finding that a careless consumer could treat a
surfaced row as a finding, a remediation item, or a
routing/verification signal. Before finding-bridge
design begins, Rekon needs to verify that the surfacing
stays read-only and that the rendered wording does not
imply `FindingReport`, `FindingLifecycleReport`,
`CoherencyDelta`, resolver-routing, verification-planning,
`RefactorPreservationContract`, or source-write behavior.

This review guards against **surface creep**: a future
slice (or an over-eager reading of the current one)
treating the surfaced section as enforcement rather than
visibility.

## Publication Surfaces Reviewed

Reviewed surfaces (all shipped at `d01fe23`):

- **Helper** —
  `buildCapabilityArchitectureLintPublicationSection`
  in `@rekon/capability-docs`. Pure, structural-typed
  (`CapabilityArchitectureLintReportLike` is a duck type,
  not a kernel import). Renders the report ref, source
  `CapabilityContract` + `CapabilityMap` refs, summary
  counts, optional byRule / bySeverity, a bounded
  (cap-20) lint-row table, evaluation guidance, and the
  boundary statement. Emits no-report guidance when the
  report is absent.
- **Architecture summary** — renders `## Capability
  Architecture Linting` after the Capability Contracts
  section and before the proof loop. Cites the lint
  report in `header.inputRefs`.
- **Agent contract** — renders `### Capability
  Architecture Linting` in the operating-state group,
  with the matching `Do Not Do` reminder elsewhere in
  the contract. Cites the lint report in
  `header.inputRefs`.
- **Proof report** — does **not** surface the lint
  report (deferred).
- **Tests** —
  `tests/contract/capability-architecture-lint-publications.test.mjs`
  (20 assertions, including six non-mutation guarantees
  and a clean `artifacts validate`) and
  `tests/docs/capability-architecture-lint-publications.test.mjs`
  (10 assertions).
- **Manifest** — `@rekon/capability-docs` `consumes`
  gains `CapabilityArchitectureLintReport`; new
  invalidation rule `capability-architecture-lint.changed`.

| Surface | Status | Boundary |
| --- | --- | --- |
| architecture summary | shipped | read-only operator visibility |
| agent contract | shipped | read-only agent guidance |
| proof report | deferred | evaluation context is not proof |

## Read-Only Guarantee

**`CapabilityArchitectureLintReport` publication
surfacing is read-only visibility.** The publishers read
the latest lint report and render it; they mutate
nothing. The contract test suite snapshots the artifact
index before and after both `publish` commands and
asserts counts + digests are unchanged for the lint
report, `CapabilityContract`, `CapabilityMap`,
`FindingReport`, `FindingLifecycleReport`, and
`CoherencyDelta`, plus a clean `artifacts validate`.

**Publications read the latest
`CapabilityArchitectureLintReport`; they never run
`rekon capability lint architecture`.** Generating a
fresh lint report stays an explicit operator action;
publication is a passive read of whatever report already
exists.

## Boundary Statement Review

Both surfaces carry the verbatim boundary line:
*"CapabilityArchitectureLintReport is evaluation
visibility only; this publication does not write
findings, mutate lifecycle state, route resolvers,
generate verification plans, or write source files."*
Plus the evaluation guidance: *"CapabilityArchitecture-
LintReport is evaluation, not enforcement. `violation`
rows are policy-evaluation signals, not governed
findings; `findingCandidate` is preview-only and writes
no FindingReport. `not-evaluated` rows mean Rekon lacks
deterministic context for that rule."*

**`CapabilityArchitectureLintReport` is evaluation, not
enforcement.** **`findingCandidate` is preview-only and
writes no `FindingReport`.** The rendered section never
implies a finding was created; the contract test
confirms no `FindingReport` is written by publication
generation.

| Overclaim Risk | Guardrail |
| --- | --- |
| treated as FindingReport mutation | explicit boundary statement + Do Not Do |
| treated as FindingLifecycleReport mutation | explicit boundary statement + Do Not Do |
| treated as CoherencyDelta mutation | explicit boundary statement + Do Not Do |
| treated as resolver routing | explicit boundary statement + Do Not Do |
| treated as verification planning | explicit boundary statement + Do Not Do |
| treated as RefactorPreservationContract | explicit boundary statement + Do Not Do |
| treated as source-write permission | explicit boundary statement + Do Not Do |

**`CapabilityArchitectureLintReport` publication
surfacing does not imply `FindingReport` mutation,
`FindingLifecycleReport` mutation, `CoherencyDelta`
mutation, resolver routing, verification planning,
`RefactorPreservationContract` behavior, or source-write
permission.**

## Agent Contract Do Not Do Review

The agent contract's `## Do Not Do` list carries the
verbatim reminder: *"Do not treat
`CapabilityArchitectureLintReport` publication surfacing
as FindingReport mutation, lifecycle mutation,
CoherencyDelta remediation, resolver routing,
verification planning, RefactorPreservationContract, or
source-write permission. The Capability Architecture
Linting section is evaluation visibility only; violation
rows are policy-evaluation signals, not governed
findings, and findingCandidate is preview-only."*

The reminder covers all seven overclaim risks in the
boundary table. **Finding:** coverage is complete — the
reminder enumerates every enforcement-adjacent behavior
the surfaced wording could be mistaken for.

## Proof Report Deferral

**Proof report surfacing remains deferred because
`CapabilityArchitectureLintReport` is evaluation context,
not verification proof.** Surfacing
violation / pass / not-evaluated rows in the proof report
would conflate policy evaluation with verification proof;
the architecture summary and agent contract carry the
read-only Capability Architecture Linting section
instead. The deferral is documented in both proof-report
docs and mirrors the `CapabilityContract` proof-report
deferral precedent. **Finding:** the deferral is still
correct.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare surfacing safe/stable | selected | read-only and bounded |
| finding-bridge decision next | selected | bridge boundary must be designed before behavior |
| more publication polish first | deferred | no blocker found |
| resolver routing next | rejected | routing should wait for governed finding bridge |
| verification planning next | rejected | planning should wait for governed finding bridge |

## Recommendation

Declare `CapabilityArchitectureLintReport` publication
surfacing **safe / stable as read-only visibility**.
**Finding-bridge decision work may begin after this
safety review** — no blocker was found. Proceed to the
`CapabilityArchitectureLintReport` → `FindingReport`
bridge **decision** (strategy / decision memo only): a
memo that decides whether and how selected lint rows
become governed findings, what severity / confidence
threshold a row must clear, and how the finding-filter
chain and adjudication checkpoint are preserved.

## What This Does Not Do

This memo is strategy only. It does not change runtime
behavior, does not modify the publication helper or
publishers, does not change
`CapabilityArchitectureLintReport` generation, does not
bridge lint rows into findings, does not add
`FindingReport` / `FindingFilterReport` /
`FindingLifecycleReport` / `CoherencyDelta` mutation,
does not add resolver routing or verification planning,
does not add `RefactorPreservationContract`, does not add
source writes, does not use LLM inference, does not
publish to npm, and does not bump versions.

## Follow-Up Work

Deferred, each gated on the bridge decision + its own
safety review where applicable:

- `CapabilityArchitectureLintReport` → `FindingReport`
  bridge **decision** (next slice).
- bridge implementation.
- `FindingLifecycleReport` integration.
- `CoherencyDelta` / remediation-queue integration.
- resolver routing by capability.
- verification planning by capability.
- deterministic `system` attribution on phrase-backed
  capabilities (un-defers `allowed-system` /
  `forbidden-system` evaluation).
- neighbor + preservation rule evaluation.
- `RefactorPreservationContract` (layer 7).
- source writes.

## Cross-References

- [Capability-Aware Architecture Linting Decision](capability-aware-architecture-linting-decision.md)
  — thirty-seventh slice; selects Option B.
- [`CapabilityArchitectureLintReport` safety review](capability-architecture-lint-report-safety-review.md)
  — thirty-ninth slice; declares the v1 artifact safe /
  stable.
- [`CapabilityArchitectureLintReport` artifact](../artifacts/capability-architecture-lint-report.md)
- [Capability-Aware Architecture Linting concept](../concepts/capability-aware-architecture-linting.md)
- [Architecture summary publication concept](../concepts/architecture-summary-publication.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md)
- [Proof report publication concept](../concepts/proof-report-publication.md)
- [`CapabilityContract` publication safety review](capability-contract-publication-safety-review.md)
  — the read-only-audit model this memo reuses.
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

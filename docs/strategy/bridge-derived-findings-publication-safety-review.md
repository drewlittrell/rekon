# Bridge-Derived Findings Publication Safety Review

> Fifty-fifth slice on the capability-ontology track. Strategy /
> safety-review batch. **Read-only review — no runtime behavior
> changes.** This follows
> [bridge-derived findings publication surfacing](bridge-derived-findings-publication-decision.md)
> shipped at `6ad2045`.

## Decision Summary

The bridge-derived findings publication surfacing (fifty-fourth
slice) has been reviewed end-to-end against the shipped
`@rekon/capability-docs` helper, both publishers, the agent-contract
`Do Not Do` reminder, the manifest, and the contract / docs tests.

**Bridge-derived findings publication surfacing is read-only
visibility.** It surfaces the governed `FindingReport` entries the
controlled `rekon capability lint write-findings
--confirm-finding-write` writer wrote, in the architecture summary
(`## Bridge-Derived Findings`) and the agent operating contract
(`### Bridge-Derived Findings`), with source provenance. The review
finds **no blocker**.

**Recommendation: the surfacing is safe / stable as read-only
visibility.** The next slice is the **bridge-derived findings
lifecycle / `CoherencyDelta` integration decision** (decision-only).

Pinned conclusions:

- Bridge-derived findings publication surfacing is read-only visibility.
- Bridge-derived findings are governed FindingReport entries, not FindingLifecycleReport status.
- Publication surfacing does not mutate FindingReport, FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta.
- Publication surfacing does not create WorkOrder or VerificationPlan.
- Publication surfacing does not imply resolver routing, verification planning, RefactorPreservationContract behavior, or source-write permission.
- Proof report surfacing remains deferred because bridge-derived findings are governance context, not verification proof.
- Lifecycle / CoherencyDelta integration decision work may begin after this safety review if no blockers are found.

## Why This Review Exists

Bridge-derived `FindingReport` entries are now **visible** in the
architecture summary and agent contract (fifty-fourth slice). That
visibility is useful, but it sits close to lifecycle / remediation
language — a reader could misread a surfaced finding as adjudicated,
lifecycle-tracked, or remediation-ready. Before the lifecycle /
`CoherencyDelta` integration boundary is designed, Rekon must verify
that the surfacing stays **read-only** and does not imply status,
adjudication, remediation, `WorkOrder`, `VerificationPlan`, or
source-write behavior.

The product guarantee this review confirms:

- Bridge-derived `FindingReport` entries are visible.
- Source provenance is visible.
- Publications remain read-only.
- Finding lifecycle remains downstream.
- Issue adjudication remains downstream.
- `CoherencyDelta` remains downstream.
- `WorkOrder` / `VerificationPlan` creation remains downstream.

## Publication Surfaces Reviewed

| Surface | Status | Boundary |
| --- | --- | --- |
| architecture summary | shipped | read-only operator visibility |
| agent contract | shipped | read-only agent guidance |
| proof report | deferred | governance context is not proof |

The architecture-summary publisher renders `## Bridge-Derived
Findings` (FindingReport ref, count, severity distribution, bounded
provenance table) immediately after the preview `## Capability Lint
Finding Bridge` section and before the proof loop. The agent-contract
publisher renders `### Bridge-Derived Findings` inside the
operating-state group plus a `Do Not Do` reminder. Both call the
shared pure helper `buildBridgeDerivedFindingsPublicationSection`
through a single `renderBridgeDerivedFindingsSection` wrapper.

Both publishers read the latest `FindingReport` via the same
`latestRef` + `read` + `inputRefs.push` pattern used for every other
capability-track section, citing the `FindingReport` in
`header.inputRefs` when present. The proof-report publisher is
unchanged.

## Source Identification Review

`isBridgeDerivedFinding` classifies a finding as bridge-derived when
**any** structural signal holds — never by title text alone:

| Signal | Decision |
| --- | --- |
| finding.type = capability_architecture_policy | primary category signal |
| details.source = capability-lint-bridge | source-provenance signal |
| sourceBridgeCandidateId | bridge provenance |
| sourceLintRowId | lint-row provenance |
| sourceContractId | contract provenance |
| sourcePhraseCapabilityId | phrase-capability provenance |
| title text alone | not sufficient |

These signals match exactly what the fifty-first slice writer
persists (`type` from the preview finding's `category`; `details.source
= "capability-lint-bridge"` plus the four `source*` trace fields). The
contract test pins that a decoy finding whose **title** mentions
`capability_architecture_policy` / `capability-lint-bridge` /
`sourceLintRowId` but whose `type` / `details` carry no bridge-derived
signal is **not** classified as bridge-derived. Identification is
specific enough.

## Read-Only Guarantee

Publication generation may read the latest `FindingReport`, filter
bridge-derived findings, render the section, and cite the
`FindingReport`. It does not do anything else. The contract test
proves, by before/after artifact-index count + digest comparison
across `publish architecture` + `publish agent-contract`, that publish:

- does not mutate `FindingReport`;
- does not mutate `FindingLifecycleReport`;
- does not mutate `IssueAdjudicationReport`;
- does not mutate `CoherencyDelta`;
- does not create `WorkOrder`;
- does not create `VerificationPlan`.

`rekon artifacts validate` stays clean after surfacing. The helper is
pure (no store, no I/O); the publishers never run `rekon capability
lint write-findings` or `rekon capability lint bridge-findings`. The
only artifact written by a publish is the `Publication`.

**Publication surfacing does not mutate FindingReport,
FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport,
or CoherencyDelta. Publication surfacing does not create WorkOrder or
VerificationPlan.**

## Boundary Statement Review

Both surfaces render the explicit boundary statement: *"Bridge-derived
findings are governed FindingReport entries, not lifecycle status;
this publication does not update lifecycle status, adjudication,
CoherencyDelta, WorkOrders, VerificationPlans, or source files."* The
helper also emits a proof-report-deferral line and the
governed-not-lifecycle guidance bullets.

**Bridge-derived findings are governed FindingReport entries, not
FindingLifecycleReport status.** The boundary statement is rendered
on every non-empty section, and the no-bridge-derived path still emits
the boundary + deferral lines, so the guardrail is visible even when
no findings exist.

| Overclaim Risk | Guardrail |
| --- | --- |
| treated as lifecycle status | explicit boundary statement + Do Not Do |
| treated as adjudication status | explicit boundary statement + Do Not Do |
| treated as CoherencyDelta remediation | explicit boundary statement + Do Not Do |
| treated as WorkOrder creation | explicit boundary statement + Do Not Do |
| treated as VerificationPlan creation | explicit boundary statement + Do Not Do |
| treated as resolver routing | explicit boundary statement + Do Not Do |
| treated as verification planning | explicit boundary statement + Do Not Do |
| treated as source-write permission | explicit boundary statement + Do Not Do |

**Publication surfacing does not imply resolver routing, verification
planning, RefactorPreservationContract behavior, or source-write
permission.**

## Agent Contract Do Not Do Review

The agent operating contract's `## Do Not Do` list carries a verbatim
reminder: *"Do not treat bridge-derived FindingReport entries as
lifecycle status, adjudication, CoherencyDelta remediation, WorkOrder
creation, VerificationPlan creation, resolver routing, verification
planning, RefactorPreservationContract, or source-write permission.
The Bridge-Derived Findings section surfaces governed FindingReport
entries written by the controlled `--confirm-finding-write` writer;
they are provenance-bearing findings, not lifecycle status, and
lifecycle / CoherencyDelta integration remain downstream."* This
single reminder covers every major overclaim risk in the boundary
table above. The contract test pins its presence.

## Proof Report Deferral

**Proof report surfacing remains deferred because bridge-derived
findings are governance context, not verification proof.** The
proof-report concept + artifact docs carry an explicit "Not a
bridge-derived findings surface" deferral, the contract test scans for
it, and the helper emits a proof-deferral line. This is consistent
with the deferral of every prior capability-track surface
(`CapabilityContract`, `CapabilityArchitectureLintReport`,
`CapabilityLintFindingBridgeReport`).

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare surfacing safe/stable | selected | read-only and source-provenanced |
| lifecycle / CoherencyDelta decision next | selected | next downstream boundary |
| more publication polish first | deferred | no blocker found |
| WorkOrder / VerificationPlan next | rejected | lifecycle / CoherencyDelta must come first |
| resolver routing next | rejected | routing should wait for lifecycle boundary |

## Recommendation

Proceed: **bridge-derived findings publication surfacing is safe /
stable as read-only visibility** — no blocker. **Lifecycle /
`CoherencyDelta` integration decision work may begin after this safety
review if no blockers are found**, and none were.

The next slice is the **bridge-derived findings lifecycle /
`CoherencyDelta` integration decision** (decision-only). Bridge-derived
findings are now written, safety-reviewed, visible, and
source-provenanced; the next boundary to design is how they enter
`FindingLifecycleReport`, `IssueAdjudicationReport`, and
`CoherencyDelta` — as a decision-only slice first, with no
implementation.

Answers to the required decision questions:

1. **Is the surfacing safe/stable?** Yes — read-only, source-
   provenanced, boundary-pinned.
2. **Is it read-only?** Yes — proven by no-mutation/no-creation
   contract assertions + clean `artifacts validate`.
3. **Is source identification specific enough?** Yes — structural
   `type` / `details.source*` signals, never title text alone.
4. **Are bridge-derived findings clearly distinguished from lifecycle
   status?** Yes — explicit boundary statement on both surfaces.
5. **Are boundary statements visible enough?** Yes — rendered on every
   section, including the no-findings path.
6. **Does the Do Not Do reminder cover all overclaim risks?** Yes —
   one reminder covers all eight risks in the boundary table.
7. **Is proof-report deferral still correct?** Yes — governance
   context, not verification proof.
8. **Should lifecycle / `CoherencyDelta` integration decision begin
   next?** Yes.
9. **Or more polish / dogfood first?** No blocker requires it.
10. **What is the next slice?** Bridge-derived findings lifecycle /
    `CoherencyDelta` integration decision (decision-only).

## What This Does Not Do

- It does **not** change publication behavior or any runtime behavior.
- It does **not** mutate `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`.
- It does **not** create `WorkOrder` or `VerificationPlan`.
- It does **not** add lifecycle integration, `CoherencyDelta`
  integration, resolver routing, verification planning, or a
  `RefactorPreservationContract`.
- It does **not** write source files or add LLM-only inference.
- It does **not** publish to npm or bump versions.
- It does **not** imply that lifecycle / `CoherencyDelta` integration
  exists.

## Follow-Up Work

The recommended next slice is the **bridge-derived findings lifecycle
/ `CoherencyDelta` integration decision** (decision-only): decide how
bridge-derived `FindingReport` entries should enter
`FindingLifecycleReport`, `IssueAdjudicationReport`, and
`CoherencyDelta`. Deferred until that decision (and its own
implementation slices) ship: lifecycle implementation,
`IssueAdjudicationReport` mutation, `CoherencyDelta` mutation,
`WorkOrder` creation, `VerificationPlan` creation, resolver routing,
verification planning, `RefactorPreservationContract`, and source
writes.

## Cross-References

- [Bridge-derived findings publication decision](bridge-derived-findings-publication-decision.md)
- [FindingReport writer safety review](capability-lint-finding-writer-safety-review.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [CapabilityLintFindingBridgeReport artifact](../artifacts/capability-lint-finding-bridge-report.md)
- [Capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Architecture summary publication concept](../concepts/architecture-summary-publication.md) +
  [artifact](../artifacts/architecture-summary-publication.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md) +
  [artifact](../artifacts/agent-contract-publication.md)
- [Proof report publication concept](../concepts/proof-report-publication.md) +
  [artifact](../artifacts/proof-report-publication.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

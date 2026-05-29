# CapabilityLintFindingBridgeReport Safety Review

**Slice:** forty-fourth on the codebase-intel-classic
capability-ontology track. Strategy / safety-review batch.
Follows `CapabilityLintFindingBridgeReport` v1 (shipped at
`166e07a`).

## Decision Summary

`CapabilityLintFindingBridgeReport` v1 is **safe / stable as a
preview bridge artifact.** The end-to-end review confirms the
artifact, factory, validator, builder, and CLI preserve the
evaluation → candidate → governed-finding boundary and mutate
no governance artifact.

**CapabilityLintFindingBridgeReport is preview, not
FindingReport.** **No FindingReport entries are written in v1.**
**CapabilityLintFindingBridgeReport does not mutate
FindingFilterReport, FindingLifecycleReport,
IssueAdjudicationReport, or CoherencyDelta.**
**CapabilityLintFindingBridgeReport does not create WorkOrder or
VerificationPlan.** **Only a later explicit writer decision may
allow eligible bridge candidates to become governed findings.**

Recommended next slice: **CapabilityLintFindingBridgeReport
publication surfacing.** **The next slice may surface
CapabilityLintFindingBridgeReport in publications, but must not
write findings.**

> **Update (forty-fifth slice):**
> `CapabilityLintFindingBridgeReport` publication surfacing has
> **shipped** — the architecture summary and agent contract now
> render a read-only `Capability Lint Finding Bridge` section.
> It writes no findings, mutates no governance artifact, creates
> no `WorkOrder` / `VerificationPlan`, and runs no bridge
> generation; proof-report surfacing stays deferred. The next
> slice is the **CapabilityLintFindingBridgeReport publication
> safety review**.

> **Update (forty-sixth slice):** the
> [`CapabilityLintFindingBridgeReport` publication safety review](capability-lint-finding-bridge-publication-safety-review.md)
> has **shipped** and declared the publication surfacing **safe
> / stable as read-only visibility** (no blocker). The next
> slice is the **`CapabilityLintFindingBridgeReport` →
> `FindingReport` writer decision**.

> **Update (forty-seventh slice):** the
> [`CapabilityLintFindingBridgeReport` → `FindingReport` writer
> decision](capability-lint-finding-writer-decision.md) has
> **shipped**. It selects **Option B** — a future, separate,
> opt-in `FindingReport` writer with required dry-run preview and
> explicit confirmation; **the writer is not implemented in that
> slice**. No `FindingReport` is written; the writer would write
> a new `FindingReport` artifact, and the finding filters,
> lifecycle, adjudication, `CoherencyDelta`, `WorkOrder`,
> `VerificationPlan`, and source writes all remain downstream and
> untouched. The next slice is the **`FindingReport` writer
> dry-run helper / CLI** (preview only).

## Why This Review Exists

`CapabilityArchitectureLintReport` rows can carry a
`findingCandidate` preview payload. The bridge report classifies
which of those rows would be *eligible* to become governed
findings later. Because governed findings drive the finding
filter chain, the status ledger, adjudication, `CoherencyDelta`,
remediation work orders, and verification plans downstream, the
preview bridge must be safety-reviewed **before** any
publication surfacing and **before** any `FindingReport` writer
decision. This memo is that gate.

## Artifact And CLI Reviewed

Reviewed surfaces, all shipped at `166e07a`:

| Surface | Status | Boundary |
| --- | --- | --- |
| CapabilityLintFindingBridgeReport artifact | shipped | preview only |
| CLI bridge-findings | shipped | writes bridge report only |
| proposedFinding | shipped | candidate payload only |
| publication surfacing | deferred | visibility only |

- **Type shape** (`@rekon/kernel-repo-model`):
  `CapabilityLintFindingBridgeReport = { header, source,
  summary, candidates[] }`. `source.lintReportRef` is required;
  `capabilityContractRef` / `capabilityMapRef` are optional and
  copied from the lint report. Each candidate carries
  `decision`, `reason`, copied `severity` / `confidence`, and an
  optional `proposedFinding`.
- **Factory** (`createCapabilityLintFindingBridgeReport`):
  dedupes candidates by `id`, sorts deterministically, and
  **recomputes the summary from the candidates** so a stale
  summary cannot be persisted. It re-classifies nothing; the
  decision/reason are authored upstream by the builder.
- **Validator / assert / schema**
  (`validateCapabilityLintFindingBridgeReport`): validates the
  header, source refs, every candidate, and re-derives the
  summary counts — rejecting any artifact whose supplied counts
  disagree with the candidates. A `proposedFinding` must carry a
  non-empty `evidenceRefs` array and a `sourceLintRowRef`.
- **Builder** (`buildCapabilityLintFindingBridgeReport`,
  `@rekon/capability-model`): consumes **only** a
  `CapabilityArchitectureLintReport`. Its imports are limited to
  `@rekon/kernel-artifacts` and `@rekon/kernel-repo-model`
  types; it reads no `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`, and writes nothing itself.
- **CLI** (`rekon capability lint bridge-findings`): reads the
  latest (or `--lint-report`-pinned)
  `CapabilityArchitectureLintReport`, writes a single
  `CapabilityLintFindingBridgeReport` under
  `.rekon/artifacts/actions/`, and prints an eligible /
  ineligible / needs-review summary plus "No FindingReport
  entries were written." It performs no other writes.

## Eligibility Rule Review

| Rule | V1 Behavior |
| --- | --- |
| violation + findingCandidate + high/medium confidence + high/medium severity + evidenceRefs | eligible |
| pass rows | ineligible |
| not-evaluated rows | ineligible |
| missing findingCandidate | ineligible |
| low confidence | ineligible |
| low severity | ineligible |
| missing evidenceRefs | ineligible |
| duplicate proposed finding id | needs-review |

The eligibility gate is **strict and conjunctive**: every
condition must hold for a row to be eligible. The ineligible
branch is evaluated in a fixed priority order
(`not-a-violation` → `not-evaluated` →
`missing-finding-candidate` → `low-confidence` →
`low-severity` → `missing-evidence`), so each ineligible row
carries exactly one deterministic reason. The bar (violation
status, an explicit `findingCandidate`, high/medium confidence
and severity, and non-empty evidence) is conservative — it
errs toward `ineligible`, which is the safe default for a
preview that may later feed governed findings. **Finding:
eligibility rules are strict enough for v1.**

## Duplicate Handling Review

Eligible candidates compute a deterministic proposed finding id.
The builder walks candidates in a stable key order
(`contractId`, then `lintRowId`, then `id`) and tracks claimed
finding ids: the first eligible candidate to claim an id keeps
`eligible`; any later eligible candidate with the same id flips
to `needs-review` with reason `duplicate-candidate` (and retains
its `proposedFinding` so a reviewer can see the collision). The
stable pre-sort makes "first" reproducible regardless of input
order, so the same lint report always yields the same
eligible/needs-review split. **Finding: duplicate handling is
deterministic enough for v1.**

## Proposed Finding Id Review

The proposed finding id is
`capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>`,
with each segment slug-normalized (lowercased,
non-alphanumeric runs collapsed to `-`, leading/trailing `-`
trimmed). It carries **no timestamp** and is therefore stable
across runs. Slug collisions across distinct rows are handled by
the duplicate logic above rather than silently merging. The id
is a preview value only — it describes what a future
`FindingReport` writer *could* emit, not a governed finding id.
**Finding: the proposed finding id policy is stable enough for
v1.**

## Governance Mutation Boundary

| Boundary | Decision |
| --- | --- |
| bridge report vs FindingReport | no FindingReport writes |
| bridge report vs FindingFilterReport | no filter mutation |
| bridge report vs FindingLifecycleReport | no lifecycle mutation |
| bridge report vs IssueAdjudicationReport | no adjudication mutation |
| bridge report vs CoherencyDelta | no remediation mutation |
| bridge report vs WorkOrder | no work-order creation |
| bridge report vs VerificationPlan | no verification-plan creation |

The boundary is enforced structurally: the builder's only input
is the lint report, and the CLI's only write is the bridge
report itself (category `actions`). Contract tests assert that
running `rekon capability lint bridge-findings` leaves
`FindingReport`, `FindingFilterReport`, `FindingLifecycleReport`,
and `CoherencyDelta` byte-identical and creates no new
`WorkOrder` or `VerificationPlan`. **Finding: the governance
mutation boundary holds.**

## WorkOrder / VerificationPlan Boundary

The bridge produces preview candidates only. It never derives a
`WorkOrder` and never derives a `VerificationPlan`; those remain
downstream of governed findings and `CoherencyDelta`, never of
capability-lint evaluation. **CapabilityLintFindingBridgeReport
does not create WorkOrder or VerificationPlan.** A dedicated
contract test confirms no `WorkOrder-` or `VerificationPlan-`
files appear after the bridge command runs.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable preview artifact | selected | strict eligibility + no mutations |
| publication surfacing next | selected | operators need visibility |
| FindingReport writer next | rejected/deferred | needs surfacing + safety first |
| lifecycle/CoherencyDelta integration next | rejected | writer boundary not pinned |

## Recommendation

`CapabilityLintFindingBridgeReport` v1 is **safe / stable as a
preview bridge artifact.** No blocker was found. Proceed to
**CapabilityLintFindingBridgeReport publication surfacing** so
operators and agents can inspect eligible / ineligible /
needs-review bridge candidates in the architecture summary and
agent contract before any `FindingReport` writer decision. **The
next slice may surface CapabilityLintFindingBridgeReport in
publications, but must not write findings.**

## What This Does Not Do

This review changes no runtime behavior. It does not modify the
bridge, add publication surfacing, or implement a `FindingReport`
writer. Restating the invariants:

- **CapabilityLintFindingBridgeReport is preview, not
  FindingReport.**
- **No FindingReport entries are written in v1.**
- **CapabilityLintFindingBridgeReport does not mutate
  FindingFilterReport, FindingLifecycleReport,
  IssueAdjudicationReport, or CoherencyDelta.**
- **CapabilityLintFindingBridgeReport does not create WorkOrder
  or VerificationPlan.**
- **Only a later explicit writer decision may allow eligible
  bridge candidates to become governed findings.**

## Follow-Up Work

Deferred, each gated behind its own decision and (where it
mutates governance) its own safety review:

- FindingReport writer decision.
- FindingReport mutation.
- FindingFilterReport / FindingLifecycleReport /
  IssueAdjudicationReport mutation.
- CoherencyDelta integration.
- WorkOrder / VerificationPlan creation.
- resolver routing by capability.
- verification planning by capability.
- RefactorPreservationContract.
- source writes.

Immediate next slice: **CapabilityLintFindingBridgeReport
publication surfacing** (architecture summary + agent contract,
read-only visibility; still no FindingReport mutation, no
lifecycle mutation, no CoherencyDelta mutation, no WorkOrder /
VerificationPlan creation, no source writes).

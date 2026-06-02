# Intent Status Work-Ready Transition Decision

> Status: Decided (slice 125). Decision-only batch — no implementation, no
> runtime change, no package bump, no npm publish. Follows the
> [Intent Operator Approval / Proof Acceptance Safety Review](./intent-operator-approval-proof-acceptance-safety-review.md)
> at `1f27162`.

## Decision Summary

**Selected Option B — an explicit status transition that writes a new
`IntentStatusReport` work-ready revision.** After `rekon intent approve` produces
an approved `PreparedIntentPlan`, a future `rekon intent status transition`
command will read that approved plan and the previous `IntentStatusReport`,
recheck freshness / drift / status context, and write **one new**
`IntentStatusReport` whose `status.value` is `work-ready`. The previous status
report is never mutated. Operator approval itself does **not** make status
work-ready — the transition is a separate, auditable step. WorkOrder /
VerificationPlan generation still requires both an approved plan **and** a
work-ready status; the transition enables that handoff without weakening any
proof gate, executing commands, writing source, or running Circe. `intent:go`
remains deferred.

## Why This Decision Exists

The [Intent Operator Approval / Proof Acceptance Implementation](./intent-operator-approval-proof-acceptance-implementation.md)
made `rekon intent approve` write a new approved `PreparedIntentPlan` revision
(`approval.status = approved`, `status.value = prepared`,
`downstreamHandoff.workOrderAllowed / verificationPlanAllowed = true`,
`sourceWriteAllowed = false`). The
[safety review](./intent-operator-approval-proof-acceptance-safety-review.md)
confirmed approval is safe/stable but deliberately left `status-not-work-ready`
as a **separate** downstream gate. The WorkOrder and VerificationPlan handoffs
require the `IntentStatusReport` to report `status.value === "work-ready"` (for
WorkOrder) or `work-ready / work-in-progress / verification-ready` (for
VerificationPlan). The status report produced before approval still reflects the
pre-approval `needs-review` state, so handoff generation still stops at
`status-not-work-ready`. Rekon needs an explicit, auditable status transition so
approval can be reflected in status **without** mutating prior reports or
weakening proof gates.

## Current Status Gap

Approval clears the plan approval gate (`plan-not-approved` no longer fires). It
does **not** create or update a status artifact that says the approved plan is
work-ready. The previous `IntentStatusReport` is immutable and reflects
pre-approval state; nothing currently transitions it. So
`rekon intent work-order generate` / `rekon intent verification-plan generate`
against the approved plan correctly clear `plan-not-approved` but still block on
`status-not-work-ready` — the gap this decision closes.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| approval updates status too | rejected | conflates approval and status |
| explicit status transition | selected | preserves auditability |
| generators ignore status after approval | rejected | weakens gates |
| mutate existing status | rejected | breaks immutability |
| auto-transition after approval | rejected/deferred | hidden side effect |

- **Option A — approval directly updates status:** `rekon intent approve` would
  also write a work-ready `IntentStatusReport`. **Rejected** — it conflates
  approval and status transition; the approval safety review explicitly left
  `status-not-work-ready` separate.
- **Option B — explicit status transition writes a new report:** a separate
  command writes a new status report after approval. **Selected** — it preserves
  auditability and separates approval from the readiness-state transition.
- **Option C — generators ignore status after approval:** if a plan is approved,
  skip the `IntentStatusReport` gate. **Rejected** — it would weaken existing
  handoff gates and lose status auditability.
- **Option D — mutate the existing report in place:** edit the prior status
  report to work-ready. **Rejected** — it breaks artifact immutability.
- **Option E — auto-transition latest status whenever approval exists:** the
  system automatically creates work-ready status after approval. **Rejected /
  deferred** — it would give approval hidden side effects and blur review
  boundaries.

## Recommendation

Implement (in the next slice) an explicit command:

```sh
rekon intent status transition \
  --prepared-plan <PreparedIntentPlan:id|type:id> \
  --previous-status <IntentStatusReport:id|type:id> \
  [--path-freshness <PathFreshnessReport:id|type:id>] \
  [--runtime-drift <RuntimeGraphDriftReport:id|type:id>] \
  --to work-ready \
  --reason "Operator approval accepted known proof gaps and status context was rechecked." \
  [--json]
```

It writes **one new** `IntentStatusReport` artifact with `status.value =
work-ready`; the previous report remains immutable. On a failed gate it prints
deterministic blockers, exits non-zero, and writes no report.

## Work-Ready Gate Model

Transition to `work-ready` is allowed only when **all** of the following hold:

| Gate | Required State |
| --- | --- |
| prepared plan | approved and prepared |
| accepted risks | recorded when gaps accepted |
| workOrderAllowed | true |
| verificationPlanAllowed | true |
| sourceWriteAllowed | false |
| previous status | exists and traceable |
| freshness | no stale scoped context |
| runtime drift | no new high-severity drift |
| transition reason | non-empty |

Spelled out, work-ready requires: an approved `PreparedIntentPlan` exists with
`approval.status === "approved"` and `status.value === "prepared"`;
`approval.acceptedRisks` records the accepted proof gaps when any were accepted;
`approval.proof.downstreamHandoff.workOrderAllowed === true` and
`verificationPlanAllowed === true` and `sourceWriteAllowed === false`; a previous
`IntentStatusReport` exists and is traceable to the same request / plan lineage;
no new high-severity freshness / drift blockers are present; and the operator
supplies a non-empty transition reason. Work-ready is **blocked** if the plan is
not approved, not prepared, missing `acceptedRisks` for accepted gaps, missing
the handoff-allowed flags, has `sourceWriteAllowed !== false`, the previous
status has unresolved high-severity blockers that were not accepted / rechecked,
the latest freshness is stale, the latest drift has new high-severity rows, or
the transition reason is empty.

## Status Semantics

After a successful transition:

- `IntentStatusReport.status.value = "work-ready"`.
- `IntentStatusReport.status.recommendedNextAction = "create-work-order"`.

Rationale: in the current handoff sequence a WorkOrder is generated before a
VerificationPlan, and `create-work-order` is an existing
`IntentStatusRecommendedNextAction` value. The VerificationPlan handoff also
becomes allowed (its gate accepts `work-ready`), but the recommended next action
points at WorkOrder. **A combined `create-work-order-and-verification-plan` value
does not exist in the current `IntentStatusRecommendedNextAction` enum and is not
introduced by this decision** — inventing it is deferred to (and gated by) the
implementation slice if ever needed.

## Recheck Model

The transition rechecks the same context the approval did, conservatively
(block when uncertain), reusing the existing patterns:

- **Status:** the previous `IntentStatusReport` must be traceable to the plan
  lineage and must not carry unresolved high-severity blockers that were not
  already accepted / rechecked.
- **Freshness:** a supplied `PathFreshnessReport` with any stale scoped path
  blocks; absence does not *prove* freshness.
- **Runtime drift:** a supplied `RuntimeGraphDriftReport` with new high-severity
  drift blocks; absence finds no new drift.

The transition does not re-open the proof-gap acceptance decision — the accepted
gaps already live on the approved `PreparedIntentPlan` (`approval.acceptedRisks`)
and are carried forward as evidence, not re-litigated.

## Resulting Status Report

| Field | Work-Ready Status Report |
| --- | --- |
| status.value | work-ready |
| recommendedNextAction | create-work-order |
| source.approvedPreparedIntentPlanRef | set |
| source.previousIntentStatusReportRef | set |
| proof.approvalStatus | approved |
| proof.acceptedRisks | carried forward |
| WorkOrder | not created |
| VerificationPlan | not created |

**Grounding note (actual field shapes).** The current
`IntentStatusReportSource` has `preparedIntentPlanRef?` (which carries the
approved plan ref) and the per-input optional refs (`pathFreshnessReportRef?`,
`runtimeGraphDriftReportRef?`, …) but has **no** `approvedPreparedIntentPlanRef`
or `previousIntentStatusReportRef`. The current `IntentStatusProof.preparation`
already has `approvalStatus?` but there is **no** `proof.acceptedRisks`. So the
implementation slice will: reuse `source.preparedIntentPlanRef` for the approved
plan; add an additive `source.previousIntentStatusReportRef` (and may add an
explicit `source.approvedPreparedIntentPlanRef`) for the prior report lineage;
set `proof.preparation.approvalStatus = "approved"`; and carry accepted-risk
evidence either by an additive `proof` field or by lineage through the approved
plan (`approval.acceptedRisks`). These additions are additive and backward
compatible; the table above states the intended logical shape.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| status transition vs approval | separate step |
| status transition vs mutation | new artifact |
| status transition vs WorkOrder | enables only |
| status transition vs VerificationPlan | enables only |
| status transition vs VerificationRun / Result | not created |
| status transition vs command execution | no commands |
| status transition vs source writes | no writes |
| status transition vs Circe | does not run Circe |
| status transition vs intent:go | deferred |

The boundary statements this decision pins:

- Status transition is explicit; approval does not automatically make status work-ready.
- Status transition creates a new IntentStatusReport artifact rather than mutating an existing report.
- Work-ready status requires an approved PreparedIntentPlan.
- Work-ready status preserves sourceWriteAllowed false.
- Status transition may enable WorkOrder and VerificationPlan handoff but does not create them.
- Status transition creates no WorkOrder.
- Status transition creates no VerificationPlan.
- Status transition creates no VerificationRun or VerificationResult.
- Status transition executes no commands.
- Status transition writes no source files.
- Status transition does not run Circe.
- Status transition does not implement intent:go.

## What This Does Not Do

This is a decision-only batch. It implements no status transition command,
mutates no `IntentStatusReport` or `PreparedIntentPlan`, relaxes no WorkOrder /
VerificationPlan gate, creates no WorkOrder / VerificationPlan / VerificationRun
/ VerificationResult, executes no commands, writes no source files, runs no
Circe, does not implement `intent:go`, does not auto-approve needs-review plans,
bumps no version, and publishes nothing to npm.

## Implementation Sequence

Next: **Intent Status Work-Ready Transition Implementation** — implement the
explicit public `rekon intent status transition` command that creates a new
work-ready `IntentStatusReport` from an approved plan plus rechecks, with the
gate and additive source/proof fields pinned above. The implementation still
creates no WorkOrder / VerificationPlan in the transition, executes no commands,
writes no source, and does not implement `intent:go`. Following that, the
WorkOrder / VerificationPlan handoffs proceed against the latest work-ready
status.

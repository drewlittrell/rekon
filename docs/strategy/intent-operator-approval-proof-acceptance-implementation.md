# Intent Operator Approval / Proof Acceptance Implementation

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Status: Implemented (slice 123). Implements the design pinned by the
> [Intent Operator Approval / Proof Acceptance Decision](./intent-operator-approval-proof-acceptance-decision.md).
> No package version bump and no npm publish.

## What Shipped

`rekon intent approve` turns a needs-review draft `PreparedIntentPlan` into a
**new approved `PreparedIntentPlan` revision** after a human operator explicitly
accepts the plan's known proof gaps and the command rechecks freshness, runtime
drift, and status context. The source draft is never mutated; approval writes
exactly one new artifact and leaves the draft byte-identical.

This is the explicit approval step that the
[Intent Prepare Needs-Review Planfulness Fix](./intent-prepare-needs-review-planfulness.md)
left open: a fresh-repo draft is implementation-bearing but stays needs-review,
and the WorkOrder / VerificationPlan handoffs stay blocked until an approved
revision exists. `rekon intent approve` produces that revision.

## Boundary

The implementation preserves every boundary the decision pinned:

- **Approval writes a new approved PreparedIntentPlan revision; it never mutates
  the source draft in place.** The source draft stays needs-review and
  byte-identical.
- **Approval is never automatic.** It is produced only when the operator passes
  an explicit `--reason` and accepts every required proof gap; nothing is
  inferred.
- **Approval enables but does not create the WorkOrder / VerificationPlan
  handoffs.** The approved revision flips `downstreamHandoff.workOrderAllowed`
  and `verificationPlanAllowed` to `true`; the handoffs still run separately.
- **Approval creates no WorkOrder, VerificationPlan, VerificationRun, or
  VerificationResult.**
- **Approval executes no commands and writes no source files.**
- **`sourceWriteAllowed` stays the literal `false`** on the approved revision's
  proof.
- **intent:go remains deferred.** Approval produces a plan revision, never a run.

## The Approval Gate

The pure helper `buildApprovedPreparedIntentPlan` (in
`@rekon/capability-model`, `src/intent-approval.ts`) reads no files, writes no
artifacts, executes no commands, and mutates no input. It returns `approved`
only when **all** of the following hold; otherwise it returns `blocked` with
deterministic blocker categories and writes no plan.

| Blocker category | Raised when |
| --- | --- |
| `missing-prepared-plan` | the source PreparedIntentPlan is absent |
| `missing-prepared-plan-ref` | no PreparedIntentPlan ref was supplied |
| `plan-already-approved` | the source plan approval is already `approved` |
| `plan-not-needs-review` | approval.status or status.value is not `needs-review` |
| `plan-not-implementation-bearing` | the plan has no modify or refactor phase |
| `missing-verification-requirements` | an implementation-bearing plan carries no verification requirements |
| `missing-intent-status` | no IntentStatusReport was supplied |
| `missing-intent-status-ref` | no IntentStatusReport ref was supplied |
| `status-has-high-blocker` | the IntentStatusReport has a high-severity blocker |
| `status-incompatible` | IntentStatusReport status.value is not `needs-review` or `work-ready` |
| `unknown-accepted-gap` | an accepted gap is outside the known vocabulary |
| `missing-required-accepted-gap` | a gap the source plan requires was not accepted |
| `missing-approval-reason` | no `--reason` was supplied |
| `freshness-stale` | the freshness recheck finds stale scoped context |
| `new-high-runtime-drift` | the drift recheck finds unaccepted high-severity drift |
| `source-write-boundary` | the source plan proof does not keep `sourceWriteAllowed === false` |

## Accepted Gap Model

A proof gap is something the draft could not prove. The operator accepts gaps
explicitly with `--accept`. The known accepted gaps are:

| Accepted gap (`--accept`) | Meaning | Required when source reason is |
| --- | --- | --- |
| `verification-proof-missing` | no verification proof results are present yet | `verification-proof-missing` |
| `runtime-drift-unresolved` | runtime drift is unresolved at approval time | `runtime-drift-unresolved` |
| `handoff-coverage-not-evaluated` | handoff coverage was not evaluated | `handoff-coverage-unresolved` |
| `freshness-not-proven` | scoped path freshness was not independently proven | `stale-assessment` |
| `manual-review-required` | manual review stands in for automated proof | (operator-optional) |

The **required accepted gaps** are exactly the source plan's
`approval.reasons` mapped through that table. An approval that omits a required
gap is blocked (`missing-required-accepted-gap`). An accepted gap outside the
known vocabulary is blocked (`unknown-accepted-gap`). Each accepted gap becomes
an `IntentOperatorAcceptedRisk` on the approved revision:
`id: accepted:<gap>`, `category: <gap>`, a fixed `message`, the operator
`reason`, an `acceptedAt` timestamp, an optional `acceptedBy`, and `sourceRefs`
pointing at the inputs the operator weighed.

## Recheck Model

Approval rechecks the handoff-time context conservatively — when uncertain, it
blocks:

| Recheck | Source | Behavior |
| --- | --- | --- |
| Status | IntentStatusReport | a high-severity blocker blocks; status.value must be `needs-review` or `work-ready` |
| Freshness | PathFreshnessReport (optional) | any stale scoped path blocks; absence does not claim freshness proof |
| Runtime drift | RuntimeGraphDriftReport (optional) | new high-severity drift blocks unless `runtime-drift-unresolved` is accepted; absence finds no new drift |

Absent freshness / drift reports never *prove* freshness or no-drift; they only
mean the recheck found no new blocking evidence. A required `freshness-not-proven`
or `runtime-drift-unresolved` gap must still be accepted explicitly.

## The Approved Revision

When the gate passes, the approved revision copies the source draft's request,
matched-context source, phases, obligations, and verification requirements
unchanged, and sets:

- `status.value = "prepared"`, `recommendedNextAction = "create-work-order"`.
- `approval.status = "approved"`, with reasons = the source reasons plus
  `explicit-operator-approval` and (when any gap is accepted)
  `manual-risk-acceptance`.
- `approval.acceptedRisks` = the accepted-risk records.
- `approval.proof.downstreamHandoff = { workOrderAllowed: true,
  verificationPlanAllowed: true, sourceWriteAllowed: false }`.

The new revision's header records the source PreparedIntentPlan, IntentStatusReport,
and any freshness / drift refs as `inputRefs` for traceability.

## Kernel Change (Additive)

`@rekon/kernel-repo-model` gains the `IntentOperatorAcceptedRisk` type and an
optional `approval.acceptedRisks` field on `PreparedIntentPlanApproval`. The
change is additive and backward-compatible: existing approved / needs-review
plans without `acceptedRisks` still validate. The normalizer preserves the field
when present, and the validator validates it when present (id, category, message,
acceptedAt, reason, and ArtifactRef sourceRefs).

## CLI Surface

```sh
rekon intent approve \
  --prepared-plan <PreparedIntentPlan:id|type:id> \
  [--intent-status <IntentStatusReport:id|type:id>] \
  [--path-freshness <PathFreshnessReport:id|type:id>] \
  [--runtime-drift <RuntimeGraphDriftReport:id|type:id>] \
  --accept <gap> [--accept <gap>...] \
  --reason <text> \
  [--accepted-by <name>] \
  [--root <path>] [--json]
```

When the gate passes the command writes exactly one new approved
`PreparedIntentPlan` and prints its ref; the original draft is unchanged. When
the gate fails it prints the blockers, exits non-zero, and writes no plan. In
neither case does it create a WorkOrder, VerificationPlan, VerificationRun, or
VerificationResult, execute commands, or write source files.

## Verification

Implementation is covered by `tests/contract/intent-operator-approval.test.mjs`
(36 assertions, full fresh-repo pipeline + blocked and approved approval paths)
and `tests/docs/intent-operator-approval.test.mjs`. The fresh-repo CLI smoke
confirms: a first approve that accepts only `verification-proof-missing` is
blocked on the unmet `runtime-drift-unresolved` gap; a second approve that
accepts both gaps writes one new approved revision; `intent work-order generate`
and `intent verification-plan generate` against the approved revision no longer
block on `plan-not-approved`; artifacts validate clean; and the source draft and
source files are unchanged.

## Next Step

Intent Operator Approval / Proof Acceptance Safety Review.

> Reviewed (slice 124): the [Intent Operator Approval / Proof Acceptance Safety Review](./intent-operator-approval-proof-acceptance-safety-review.md)
> confirmed `rekon intent approve` is safe/stable — approval is explicit (never auto-approved), accepted
> proof gaps are recorded (not erased), the source draft stays immutable, freshness / drift /
> IntentStatusReport are rechecked conservatively, `sourceWriteAllowed` remains `false`, and approval
> enables but does not create the WorkOrder / VerificationPlan handoffs (creating no WorkOrder /
> VerificationPlan / VerificationRun / VerificationResult, executing no commands, writing no source,
> running no Circe; `intent:go` deferred). `status-not-work-ready` remains a separate downstream gate.
> Next: Intent Status Work-Ready Transition Decision.

> Decided (slice 125): the remaining `status-not-work-ready` gate after approval is closed by the
> [Intent Status Work-Ready Transition Decision](./intent-status-work-ready-transition-decision.md) —
> an explicit `rekon intent status transition` (future) writes a new work-ready `IntentStatusReport`
> revision after rechecking freshness / drift / status, leaving prior reports immutable. Status
> transition enables but does not create the handoffs; `intent:go` deferred.
>
> Shipped (slice 126): `rekon intent status transition` now writes the work-ready revision — see the
> [Intent Status Work-Ready Transition Implementation](./intent-status-work-ready-transition-implementation.md).

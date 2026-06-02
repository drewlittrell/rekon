# Intent Operator Approval / Proof Acceptance Safety Review

> Status: Reviewed safe/stable (slice 124). Reviews the `rekon intent approve`
> implementation shipped at `bf15ead` (slice 123). Strategy / safety-review
> batch — no runtime, approval, or package change; no npm publish.

## Decision Summary

**Intent Operator Approval / Proof Acceptance is safe/stable.** The
`rekon intent approve` command shipped in slice 123 is an explicit, gated,
non-executing approval step. It turns a needs-review draft `PreparedIntentPlan`
into a **new approved revision** only when a human operator explicitly accepts
the draft's known proof gaps and a conservative freshness / runtime-drift /
status recheck passes. The source draft is never mutated, accepted gaps are
recorded rather than erased, and approval enables — but does not create — the
WorkOrder / VerificationPlan handoffs. No downstream artifacts are created, no
commands run, no source is written, no Circe is run, and `intent:go` stays
deferred. The end-to-end review found no blocker.

The one expected residual: after approval, WorkOrder / VerificationPlan
generation can still stop at `status-not-work-ready` — that is the separate
`IntentStatusReport` gate, not the approval gate, and it is the subject of the
recommended next slice.

## Why This Review Exists

The [Intent Prepare Needs-Review Planfulness Fix](./intent-prepare-needs-review-planfulness.md)
made a fresh-repo needs-review `PreparedIntentPlan` implementation-bearing, but
the WorkOrder / VerificationPlan handoffs require an **approved** plan. The
[Intent Operator Approval / Proof Acceptance Decision](./intent-operator-approval-proof-acceptance-decision.md)
chose Option B (a new approved revision, not in-place mutation), and the
[Intent Operator Approval / Proof Acceptance Implementation](./intent-operator-approval-proof-acceptance-implementation.md)
shipped it. Because approval is the operator's lever that opens the downstream
handoffs, it must be reviewed as a trust boundary: it must never auto-approve,
must record what was accepted, must preserve the draft, and must not itself
execute or create downstream artifacts. This memo confirms those properties
against the shipped code.

## Implementation Reviewed

Reviewed at `bf15ead`:

- `packages/kernel-repo-model/src/index.ts` — `IntentOperatorAcceptedRisk` type
  and the optional `approval.acceptedRisks?` field (additive), its normalizer
  (`preparedIntentNormalizeAcceptedRisks`, wired into
  `preparedIntentNormalizeApproval`), and the validate-when-present validator
  (`validateIntentOperatorAcceptedRisk`).
- `packages/capability-model/src/intent-approval.ts` — the pure
  `buildApprovedPreparedIntentPlan` helper.
- `packages/capability-model/src/index.ts` — barrel exports.
- `packages/cli/src/index.ts` — the `rekon intent approve` command branch.
- `tests/contract/intent-operator-approval.test.mjs` (36 assertions) +
  `tests/docs/intent-operator-approval.test.mjs` (11 assertions).

## Accepted Risk Review

`IntentOperatorAcceptedRisk` is `{ id, category, message, acceptedAt,
acceptedBy?, reason, sourceRefs }`. The optional `approval.acceptedRisks?` field
is **additive and backward-compatible**: the normalizer only emits it when
present, and the validator only checks it when present — existing approved /
needs-review plans without the field still validate. **Accepted proof gaps are
recorded, not erased.** Each accepted gap becomes one accepted-risk record
(`id: accepted:<gap>`) carrying the operator's `reason`, an `acceptedAt`
timestamp, an optional `acceptedBy`, and `sourceRefs` pointing at the inputs the
operator weighed. The gaps remain visible on the approved revision rather than
being silently cleared, so a reader can always see exactly which proof gaps a
human knowingly accepted.

## Approval Gate Review

`buildApprovedPreparedIntentPlan` is a pure function — it reads no files, writes
no artifacts, executes no commands, and mutates no input. It returns `approved`
only when every gate passes; any failure returns `blocked` with deterministic
blocker categories and writes no plan. Confirmed gates: source plan present and
needs-review (not already approved); implementation-bearing phases; verification
requirements present; IntentStatusReport present with no high-severity blocker
and a compatible status value; accepted gaps all known and covering every
required gap; a non-empty approval reason; a conservative freshness and
runtime-drift recheck; and `sourceWriteAllowed === false` preserved. **Approval
blocks unknown or missing required accepted gaps.** **Approval blocks empty
approval reasons** — an empty `--reason` raises `missing-approval-reason` and the
approved revision's `approval.reasons` is always non-empty (source reasons plus
`explicit-operator-approval`).

## Recheck Review

**Approval rechecks freshness, runtime drift, and IntentStatusReport context.**
The rechecks are conservative — they mirror the existing
`freshnessIsStale` / `countHighUnresolvedDrift` logic and block when uncertain:
a supplied `PathFreshnessReport` with any stale scoped path blocks; a supplied
`RuntimeGraphDriftReport` with new high-severity drift blocks unless
`runtime-drift-unresolved` is accepted; and an `IntentStatusReport` with a
high-severity blocker, or an incompatible status value, blocks. Absent
freshness / drift reports never *prove* freshness or no-drift — they only mean
the recheck found no new blocking evidence, and a required `freshness-not-proven`
or `runtime-drift-unresolved` gap must still be accepted explicitly.

## Approved Revision Review

When the gate passes, the approved revision copies the source draft's request,
matched-context source, phases, obligations, and verification requirements
unchanged, and sets `status.value=prepared`,
`recommendedNextAction=create-work-order`, `approval.status=approved` (reasons =
source reasons + `explicit-operator-approval` + `manual-risk-acceptance` when any
gap is accepted), `approval.acceptedRisks`, and
`downstreamHandoff = { workOrderAllowed: true, verificationPlanAllowed: true,
sourceWriteAllowed: false }`. **Approval creates a new PreparedIntentPlan
revision.** **The source draft PreparedIntentPlan remains immutable** — the
contract test confirms the draft file is byte-identical and its approval stays
needs-review after approval. **sourceWriteAllowed remains false** on the approved
revision's proof.

## CLI Review

`rekon intent approve --prepared-plan <ref> [--intent-status <ref>]
[--path-freshness <ref>] [--runtime-drift <ref>] --accept <gap> [--accept
<gap>...] --reason <text> [--accepted-by <name>] [--root <path>] [--json]`. The
blocked path sets a non-zero exit code, prints the blockers, and writes no plan.
The approved path writes exactly one new approved `PreparedIntentPlan` (via
`store.write(..., { category: "actions" })`), prints its ref, and leaves the
original draft unchanged. In neither path does the command create a WorkOrder,
VerificationPlan, VerificationRun, or VerificationResult, execute commands, or
write source.

## Boundary Review

The shipped command preserves every boundary the decision pinned:

- Operator approval is explicit; needs-review plans are never auto-approved.
- Accepted proof gaps are recorded, not erased.
- Approval creates a new PreparedIntentPlan revision.
- The source draft PreparedIntentPlan remains immutable.
- Approval rechecks freshness, runtime drift, and IntentStatusReport context.
- Approval blocks unknown or missing required accepted gaps.
- Approval blocks empty approval reasons.
- sourceWriteAllowed remains false.
- Approval may enable WorkOrder and VerificationPlan handoff but does not create them.
- Approval creates no WorkOrder.
- Approval creates no VerificationPlan.
- Approval creates no VerificationRun or VerificationResult.
- Approval executes no commands.
- Approval writes no source files.
- Approval runs no Circe.
- intent:go remains deferred.
- status-not-work-ready remains a separate downstream gate after approval.

### Surface

| Surface | Status | Safety Finding |
| --- | --- | --- |
| approval.acceptedRisks | shipped | additive / optional |
| buildApprovedPreparedIntentPlan | shipped | pure approval helper |
| rekon intent approve | shipped | explicit approval command |
| blocked path | shipped | exits non-zero / writes nothing |
| approved path | shipped | writes one new PreparedIntentPlan |
| source draft | preserved | immutable |
| downstream artifacts | absent | not created by approval |

### Gate

| Gate | Review Finding |
| --- | --- |
| source plan needs-review | required |
| implementation-bearing phases | required |
| verification requirements | required |
| accepted gaps | must match required known gaps |
| approval reason | required |
| freshness recheck | conservative |
| runtime drift recheck | conservative |
| IntentStatusReport recheck | conservative |
| sourceWriteAllowed | false |

### Boundary

| Boundary | Decision |
| --- | --- |
| approval vs auto-approval | explicit only |
| approval vs mutation | new revision |
| accepted risk vs erased risk | recorded risk |
| approval vs WorkOrder | enables only |
| approval vs VerificationPlan | enables only |
| approval vs VerificationRun / Result | not created |
| approval vs command execution | no execution |
| approval vs source writes | no writes |
| approval vs Circe | does not run Circe |
| approval vs intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare approval safe/stable | selected | gates and immutability hold |
| status work-ready transition next | selected | status-not-work-ready remains separate |
| post-approval handoff smoke only | deferred | status model still needs decision |
| auto-approve needs-review | rejected | hides proof gaps |
| create downstream artifacts during approval | rejected | conflates approval and handoff |

## Recommendation

Declare **Intent Operator Approval / Proof Acceptance safe/stable**. The
recommended next slice is **Intent Status Work-Ready Transition Decision**:
approval now clears the plan approval gate, but WorkOrder / VerificationPlan
generation may still stop at `status-not-work-ready`. The next decision should
define whether/how an approved `PreparedIntentPlan` updates or produces
`IntentStatusReport` state so handoff generation can proceed past the status
gate without weakening proof semantics. The alternative — **Intent WorkOrder /
VerificationPlan Post-Approval Handoff Smoke Decision** — is deferred: if some
path already provides a work-ready status, prove and document the exact
post-approval sequence instead. The default recommendation is the status
work-ready transition decision.

## What This Does Not Do

This review changes no runtime behavior, no approval behavior, and no gate. It
creates no WorkOrder, VerificationPlan, VerificationRun, or VerificationResult,
executes no commands, writes no source files, runs no Circe, and does not
implement `intent:go`. It does not auto-approve plans, does not relax the
IntentStatusReport gates, does not implement a status transition / work-ready
update, bumps no version, and publishes nothing to npm.

## Follow-Up Work

- **Intent Status Work-Ready Transition Decision** (next): define how an approved
  plan updates / produces IntentStatusReport state so handoff generation can move
  past `status-not-work-ready` without weakening proof semantics. Still no
  auto-approval, no source writes, no command execution, no `intent:go`.
- Stale-context acceptance policy remains deliberately unsupported; a separate
  decision is required before relaxing the freshness block.

> Decided (slice 125): the follow-up `status-not-work-ready` gate is addressed by the
> [Intent Status Work-Ready Transition Decision](./intent-status-work-ready-transition-decision.md) —
> a future `rekon intent status transition` writes a NEW work-ready `IntentStatusReport` from the
> approved plan + rechecks (previous report immutable; approval does not auto-transition). It enables
> but does not create the WorkOrder / VerificationPlan handoffs; no commands / source writes / Circe;
> `intent:go` deferred.

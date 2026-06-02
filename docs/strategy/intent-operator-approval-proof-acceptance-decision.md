# Intent Operator Approval / Proof Acceptance Decision

## Decision Summary

`rekon intent prepare` now produces an implementation-bearing **draft** plan when assessment is
`needs-review` with zero hard blockers (Intent Prepare Needs-Review Planfulness Fix at `204014a`), but
there is no public path for an operator to **approve** that draft. WorkOrder and VerificationPlan
handoff correctly require a proof-approved `PreparedIntentPlan`, so a reviewed-and-accepted draft stays
blocked. This decision selects **Option B — a new approved PreparedIntentPlan revision**: a future
`rekon intent approve` command reads a needs-review draft, rechecks freshness / drift / status,
records the operator's explicitly accepted proof gaps, and writes a **new** approved
`PreparedIntentPlan` artifact (the original draft is never mutated). **Operator approval is explicit;
needs-review plans are never auto-approved.** **Approval creates a new PreparedIntentPlan revision
rather than mutating the existing artifact.** **Approval accepts specific proof gaps; it does not erase
them.** **Approval must recheck freshness and runtime drift before enabling handoff.** **Approval may
enable WorkOrder and VerificationPlan handoff but does not create them.** **Approval does not create
VerificationRun or VerificationResult.** **Approval does not execute commands.** **Approval does not
write source files.** **Approval does not implement intent:go.** This is a decision-only batch: it
implements no command, mutates no artifact, and changes no runtime behavior.

The twenty decision questions, answered:

1. **What does operator approval mean?** An explicit, human-authorized acknowledgement that a
   needs-review draft plan is acceptable to hand off despite specific, named, recorded proof gaps —
   captured as a new approved artifact, not a mutation.
2. **What can an operator approve?** A single source `PreparedIntentPlan` whose `approval.status` is
   `needs-review` (not `not-approved`) and whose `status.value` is `needs-review`, with
   implementation-bearing phases.
3. **Which proof gaps can be explicitly accepted?** `verification-proof-missing`,
   `runtime-drift-unresolved`, `handoff-coverage-not-evaluated`, `freshness-not-proven`, and
   `manual-review-required` — only gaps already represented in the source plan's `approval.reasons` /
   proof record.
4. **Which proof gaps must remain unapprovable?** Hard blockers (a `blocked` / `not-approved` source
   plan, missing required artifacts, high-severity `IntentStatusReport` blockers, **new**
   high-severity runtime drift, and materially-changed freshness) cannot be accepted away — they must
   be resolved, not accepted.
5. **Should approval mutate an existing PreparedIntentPlan?** No. The source draft is immutable.
6. **Should approval create a new PreparedIntentPlan revision?** Yes — a new artifact carrying the
   approved envelope, with `inputRefs` to the source plan and rechecked proof refs.
7. **Should approval create a new IntentApprovalReport artifact instead?** Evaluated and rejected /
   deferred (Option D): a separate approval artifact creates dual-source approval state and would
   force every downstream gate to consult a second lookup path.
8. **Should WorkOrder / VerificationPlan generators read a separate approval artifact?** No — they
   keep reading `PreparedIntentPlan.approval`, so the approved revision flows through the existing
   gates unchanged.
9. **What freshness recheck is required before approval?** Compare the latest / pinned
   `PathFreshnessReport` against the source plan's `approval.proof.freshness` ref; if scoped paths are
   stale, block (v1 prefers blocking stale freshness).
10. **What runtime drift recheck is required before approval?** Compare the latest / pinned
    `RuntimeGraphDriftReport` against the source plan's `approval.proof.runtimeDrift` ref; if **new**
    high-severity drift appears, block; the same already-represented unresolved drift may be accepted.
11. **What IntentStatusReport recheck is required before approval?** Read the latest / pinned
    `IntentStatusReport`; if it carries high-severity blockers or its `status.value` is incompatible
    with approval, block.
12. **What source refs must be carried forward?** The source `PreparedIntentPlan`, the
    `IntentStatusReport`, the `PathFreshnessReport` (when used), the `RuntimeGraphDriftReport` (when
    used), and any other proof refs already on the source plan's proof record.
13. **How are accepted risks recorded?** As structured `IntentOperatorAcceptedRisk` entries (category,
    message, acceptedAt, optional acceptedBy, reason, sourceRefs) on the approved revision —
    preferably at `PreparedIntentPlan.approval.acceptedRisks` (additive).
14. **How does approval affect `status.value`?** It becomes `prepared` **only if** the approval gate
    passes.
15. **How does approval affect `approval.status`?** It becomes `approved` **only if** the approval
    gate passes; `approval.reasons` then include the explicit operator approval reason(s).
16. **How does approval affect `downstreamHandoff.workOrderAllowed` / `verificationPlanAllowed`?** Both
    become `true` on the approved revision; `sourceWriteAllowed` stays `false`.
17. **Does approval execute commands?** No.
18. **Does approval write source files?** No.
19. **Does approval implement intent:go?** No.
20. **What implementation slice follows?** **Intent Operator Approval / Proof Acceptance
    Implementation** — the explicit `rekon intent approve` command that writes the approved revision.

## Why This Decision Exists

The fresh-repo intent pipeline is now complete through a reviewable draft plan, but the proof model
deliberately keeps a needs-review draft blocked from WorkOrder / VerificationPlan handoff. That is
correct: handoff must be backed by a proof-approved plan. What is missing is the **explicit operator
path** to cross that boundary — a way for a human to review the draft, accept named proof gaps, and
produce an approved plan, with the acceptance traceable and the original draft preserved. Without it,
fresh-repo plans stay permanently blocked even after a competent review. This decision pins how that
approval works so the implementation slice that follows is safe: explicit, traceable, recheck-gated,
immutable-preserving, and strictly non-executing.

## Current Approval Gap

Grounded in `packages/capability-model/src/prepared-intent-plan.ts` at `204014a`:

- `PreparedIntentPlan.approval = { status, reasons, proof, blockers }`; `status =
  { value, recommendedNextAction }`.
- `approval.status` is one of `approved` / `needs-review` / `not-approved`; for a fresh-repo draft it
  is `needs-review` with `approval.reasons` such as `["verification-proof-missing",
  "runtime-drift-unresolved"]`.
- `approval.proof.downstreamHandoff = { workOrderAllowed: approvalStatus === "approved",
  verificationPlanAllowed: approvalStatus === "approved", sourceWriteAllowed: false }` — so the
  handoff gates are open only when `approval.status === "approved"`.
- `approval.proof` also carries `freshness { accepted, staleContext, pathFreshnessReportRef? }`,
  `runtimeDrift { accepted, unresolvedHighSeverity, runtimeGraphDriftReportRef? }`, `handoffCoverage`,
  `verification`, `planStructure`, and `intentAssessmentReportRef`.
- `IntentStatusReport.status = { value, recommendedNextAction }`; `value` includes `work-ready`, and
  the report already models high-severity blockers and a runtime-drift override.

The WorkOrder / VerificationPlan generators correctly block a needs-review plan
(`plan-not-approved`, `plan-not-prepared`, `next-action-not-work-order`, `status-not-work-ready`,
`handoff-not-allowed`). There is no command that turns a reviewed needs-review draft into an approved
plan. No field shape differs from this decision's assumptions.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| keep needs-review blocked forever | rejected | no operator path |
| new approved PreparedIntentPlan revision | selected | preserves gates and immutability |
| mutate existing plan | rejected | breaks auditability |
| separate IntentApprovalReport | rejected/deferred | dual-source approval state |
| inline approval in handoff generators | rejected | conflates approval and generation |
| auto-approve needs-review | rejected | hides proof gaps |

- **Option A — keep needs-review plans permanently blocked.** No public approval path. Rejected:
  operators need a safe, explicit path to approve reviewed draft plans.
- **Option B — new approved PreparedIntentPlan revision (selected).** The approval command writes a
  new `PreparedIntentPlan` with an approved envelope. Selected: it fits the existing WorkOrder /
  VerificationPlan gates without a second approval lookup path and preserves immutability.
- **Option C — mutate the existing PreparedIntentPlan in place.** Rejected: breaks artifact
  immutability and auditability.
- **Option D — add a separate IntentApprovalReport artifact.** Rejected / deferred: more flexible
  long-term but requires changing every downstream gate and creates dual-source approval state.
- **Option E — add `--approve` to the WorkOrder / VerificationPlan generators.** Rejected: conflates
  approval with handoff generation.
- **Option F — auto-approve needs-review plans.** Rejected: would flatten the proof model and hide
  accepted risk.

## Recommendation

Select **Option B — a new approved PreparedIntentPlan revision**. A future, explicit command (decided
here, implemented later):

```sh
rekon intent approve \
  --prepared-plan <PreparedIntentPlan:id|type:id> \
  --intent-status <IntentStatusReport:id|type:id> \
  [--path-freshness <PathFreshnessReport:id|type:id>] \
  [--runtime-drift <RuntimeGraphDriftReport:id|type:id>] \
  --accept verification-proof-missing \
  --accept runtime-drift-unresolved \
  --reason "Operator reviewed the draft plan and accepts these proof gaps." \
  [--json]
```

It writes **one new** `PreparedIntentPlan` artifact with the same request / phases / obligations /
verificationRequirements as the source plan; `inputRefs` point to the source `PreparedIntentPlan`, the
`IntentStatusReport`, and the `PathFreshnessReport` / `RuntimeGraphDriftReport` when used. The original
needs-review plan remains immutable.

## Approval Gate Model

| Gate | Required State |
| --- | --- |
| source plan | exists and is needs-review |
| implementation phases | present |
| verification requirements | present for implementation work |
| accepted gaps | match known proof gaps |
| approval reason | non-empty |
| freshness recheck | no stale scoped context |
| runtime drift recheck | no new high-severity drift |
| intent status | no high-severity blockers |
| source writes | sourceWriteAllowed remains false |

Approval **requires**: a source `PreparedIntentPlan` whose `approval.status` is `needs-review` (not
`not-approved`) and `status.value` is `needs-review`; implementation-bearing phases; verification
requirements present when implementation phases exist; an `IntentStatusReport` with no high-severity
blockers; a non-stale latest / pinned `PathFreshnessReport` for scoped paths; a latest / pinned
`RuntimeGraphDriftReport` with no new high-severity drift beyond what the operator accepts; accepted
reasons that exactly match known `approval.reasons` / known proof gaps; a non-empty operator approval
reason; and `sourceWriteAllowed` staying `false`.

Approval **must block** if: the source plan is not found, already approved, or `not-approved`; the
source plan has hard blockers encoded in status / issues; required proof refs are missing and not
explicitly accepted; latest freshness / drift state materially changed since the source plan; the
operator accepts an unknown gap; or the operator omits the approval reason.

## Accepted Risk Model

The approved plan records each accepted gap as a structured entry (sketched here; the implementation
slice decides the exact placement):

```ts
type IntentOperatorAcceptedRisk = {
  id: string;
  category:
    | "verification-proof-missing"
    | "runtime-drift-unresolved"
    | "handoff-coverage-not-evaluated"
    | "freshness-not-proven"
    | "manual-review-required"
    | "other";
  message: string;
  acceptedAt: string;
  acceptedBy?: string;
  reason: string;
  sourceRefs: ArtifactRef[];
};
```

Preferred placement: `PreparedIntentPlan.approval.acceptedRisks` (additive to the existing approval
object). An acceptable alternative is `PreparedIntentPlan.approval.proof.operatorAcceptedRisks`. Either
way the accepted gaps are **recorded, not erased** — the proof record still names every gap the
operator chose to accept.

## Recheck Model

Before approving, the future command rechecks:

- **Freshness.** Compare the latest / pinned `PathFreshnessReport` to the source plan's
  `approval.proof` freshness ref. If the latest is stale for scoped paths, block unless a future policy
  explicitly allows accepting `stale-context`. For v1 approval, prefer blocking stale freshness.
- **Runtime drift.** Compare the latest / pinned `RuntimeGraphDriftReport` to the source plan's
  `approval.proof` runtimeDrift ref. If new high-severity drift appears, block. If the same unresolved
  drift is already represented in `approval.reasons` and explicitly accepted, allow.
- **Intent status.** Read the latest / pinned `IntentStatusReport`. If it has high-severity blockers,
  block. If its status is incompatible with approval, block.

## Approved Revision Semantics

| Field | Approved Revision |
| --- | --- |
| status.value | prepared |
| approval.status | approved |
| approval.acceptedRisks | accepted proof gaps |
| downstreamHandoff.workOrderAllowed | true |
| downstreamHandoff.verificationPlanAllowed | true |
| downstreamHandoff.sourceWriteAllowed | false |
| WorkOrder | not created |
| VerificationPlan | not created |
| VerificationRun / VerificationResult | not created |

After approval succeeds: `status.value = prepared`; `approval.status = approved`; `approval.reasons`
include the explicit operator approval reason(s); `approval.acceptedRisks` records the accepted proof
gaps; `approval.proof.downstreamHandoff.workOrderAllowed = true` and `verificationPlanAllowed = true`;
`sourceWriteAllowed = false`; and `recommendedNextAction` allows the WorkOrder handoff. But still: no
WorkOrder, VerificationPlan, VerificationRun, or VerificationResult is created; no commands are
executed; no source files are written; `intent:go` remains deferred.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| approval vs auto-approval | explicit operator action only |
| approved revision vs mutation | new artifact revision |
| accepted risk vs erased risk | risk recorded, not hidden |
| approval vs WorkOrder handoff | enables, does not create |
| approval vs VerificationPlan handoff | enables, does not create |
| approval vs command execution | no commands |
| approval vs source writes | no writes |
| approval vs intent:go | deferred |

The pinned boundary statements:

- **Operator approval is explicit; needs-review plans are never auto-approved.**
- **Approval creates a new PreparedIntentPlan revision rather than mutating the existing artifact.**
- **Approval accepts specific proof gaps; it does not erase them.**
- **Approval must recheck freshness and runtime drift before enabling handoff.**
- **Approval may enable WorkOrder and VerificationPlan handoff but does not create them.**
- **Approval does not create VerificationRun or VerificationResult.**
- **Approval does not execute commands.**
- **Approval does not write source files.**
- **Approval does not implement intent:go.**

## What This Does Not Do

This is a decision-only batch. It does not implement the approval command, auto-approve needs-review
plans, mutate any existing `PreparedIntentPlan`, weaken the WorkOrder / VerificationPlan gates, create
WorkOrder / VerificationPlan / VerificationRun / VerificationResult, execute commands, write source
files, run Circe, implement `intent:go`, publish to npm, bump versions, or create a branch. It adds
this memo, a docs test, a review packet, and additive doc pointers.

## Implementation Sequence

1. **Intent Operator Approval / Proof Acceptance Implementation** (recommended next): implement
   `rekon intent approve` — read the needs-review draft, recheck freshness / drift / status, record
   the operator-accepted risks, and write a new approved `PreparedIntentPlan` revision. No
   auto-approval, no WorkOrder / VerificationPlan creation in approval, no command execution, no source
   writes, no `intent:go`.
2. **Operator Approval Safety Review** (after implementation): confirm the approval path is
   safe/stable — explicit, traceable, recheck-gated, immutable-preserving, non-executing.
3. **Stale-Context Acceptance Policy** (deferred): if operators need to accept stale freshness, decide
   that policy separately rather than relaxing the v1 block.

Still no auto-approval, no in-place mutation, no command execution, no source writes, and no
`intent:go`.

> Implemented (slice 123): `rekon intent approve` shipped exactly as decided — Option B (a new approved
> `PreparedIntentPlan` revision; the source draft stays immutable). It verifies the operator explicitly
> accepted the plan's known proof gaps (`--accept <gap>` + required `--reason`), rechecks freshness /
> runtime drift / status, records the accepted gaps as `approval.acceptedRisks[]`, and flips
> `downstreamHandoff.workOrderAllowed` / `verificationPlanAllowed` to `true` while keeping
> `sourceWriteAllowed` the literal `false`. Approval is never automatic, enables but does not create the
> handoffs, creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no
> commands, writes no source, and runs no Circe; `intent:go` remains deferred. Next: Intent Operator
> Approval / Proof Acceptance Safety Review. See
> [Intent Operator Approval / Proof Acceptance Implementation](./intent-operator-approval-proof-acceptance-implementation.md).

> Reviewed (slice 124): the [Intent Operator Approval / Proof Acceptance Safety Review](./intent-operator-approval-proof-acceptance-safety-review.md)
> declared the shipped `rekon intent approve` safe/stable — every boundary this decision pinned holds.
> `status-not-work-ready` remains a separate downstream gate after approval; next is the Intent Status
> Work-Ready Transition Decision.

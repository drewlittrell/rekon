# IntentStatusReport Safety Review

## Decision Summary

This review examines the newly shipped `IntentStatusReport` v1 (`6b1a806`)
end-to-end and finds it **safe and stable as a read-only intent status rollup**.
The artifact reports the current state of the intent spine — assessment,
preparation, approval, work, verification, freshness, and runtime drift — and
performs none of those steps. Its status vocabulary is close to execution
language (it can recommend `create-work-order`, `create-verification-plan`,
`run-verification`, or `resolve-blockers`), so the key question is whether
reporting ever becomes action. It does not: the helper reads only passed-in
artifact values, the CLI writes a single report, and the kernel validator gates
the one consequential status (`complete`) behind passed verification with no
high-severity blockers.

**IntentStatusReport is status reporting, not VerificationResult.**
**IntentStatusReport is not WorkOrder.** **IntentStatusReport does not create
WorkOrder or VerificationPlan.** **IntentStatusReport does not create
VerificationRun or VerificationResult.** **IntentStatusReport does not execute
commands.** **IntentStatusReport does not write source files.**
**IntentStatusReport does not implement intent:go.** **IntentStatusReport reports
PreparedIntentPlan approval state but does not approve plans.**
**VerificationResult is an input to status, not the status artifact itself.**
**WorkOrder / VerificationPlan generation remains deferred to a separate
decision.**

The recommended next slice is the **Intent Work / Proof Handoff Decision**.

## Why This Review Exists

`IntentStatusReport` is the reporting layer over the intent spine, and its
recommended-next-action vocabulary brushes against execution language. Before
Rekon decides whether and how a proof-approved `PreparedIntentPlan` may produce
downstream `WorkOrder` and `VerificationPlan` artifacts — and long before any
`intent:go` execution gate — the spine must confirm that status remains
read-only reporting and never becomes an action. This review is that
confirmation; it changes no runtime behavior.

## Artifact And CLI Reviewed

- **Artifact** `IntentStatusReport` (category `actions`) — types, the
  `createIntentStatusReport` factory + normalizers, and
  `validateIntentStatusReport` / `assertIntentStatusReport` /
  `intentStatusReportSchema` in `@rekon/kernel-repo-model`.
- **Helper** `@rekon/capability-model.buildIntentStatusReport` — reads the
  assessment, prepared plan, work order, verification plan/run/result, freshness,
  and drift VALUES; derives the overall status with freshness/drift overrides;
  builds the proof rollup and deterministic blocker / warning / stale-input /
  missing-input lists.
- **CLI** `rekon intent status [--root <path>] [--json]` plus the optional
  pinned-ref flags — reads latest-or-pinned artifacts, writes one
  `IntentStatusReport` under `.rekon/artifacts/actions/`, and prints a status
  summary.

| Surface | Status | Boundary |
| --- | --- | --- |
| IntentStatusReport artifact | shipped | read-only status rollup |
| intent status CLI | shipped | writes status report only |
| PreparedIntentPlan approval state | reported | not modified / not approved |
| VerificationResult | input | not status artifact itself |
| WorkOrder / VerificationPlan | deferred | not created by status |
| intent:go | deferred | no execution |

## Status Model Review

The 15-value status enum (`not-assessed` / `assessed` / `assessment-blocked` /
`prepared` / `preparation-blocked` / `needs-review` / `stale` / `work-ready` /
`work-in-progress` / `verification-ready` / `verification-running` /
`verification-passed` / `verification-failed` / `complete` / `unknown`) is
validator-enforced, and the derivation is deterministic: input presence plus each
input's recorded state produces a base status, then a stale `PathFreshnessReport`
overrides to `stale` and high-severity unresolved `RuntimeGraphDriftReport` rows
downgrade an advancing status to `needs-review`. The one consequential status,
`complete`, is gated by the kernel validator behind a passed verification result
and the absence of high-severity blockers, so a report cannot claim completion it
cannot back. The model is safe for v1.

| Status Area | V1 Behavior |
| --- | --- |
| assessment | reports readiness / blockers / warnings |
| preparation | reports status and approvalStatus |
| work | reports presence / status when available |
| verification | reports plan/run/result presence and resultStatus |
| freshness | reports stale state |
| runtime drift | reports highSeverityOpen / addedObserved / uncoveredHandoff / unresolvedContract |

## Proof Rollup Review

`proof` mirrors each input's recorded state — it copies values, it does not
re-derive proof. Each sub-block is present only when its input is present, and the
counts (assessment blockers/warnings, preparation phases/obligations/requirements,
drift severities) are read from the source artifacts. Because the rollup is a
copy, it cannot drift from or contradict the underlying artifacts, and it grants
no standing the inputs do not already hold. The rollup is safe.

## Prepared Plan Approval Boundary Review

The report reads `PreparedIntentPlan.approval.status` into
`proof.preparation.approvalStatus` and maps it to the overall status (approved →
`work-ready`, not-approved → `preparation-blocked`, needs-review →
`needs-review`). The contract test confirms the prepared-plan input is not mutated
and the report carries no `approval` field of its own. **IntentStatusReport
reports PreparedIntentPlan approval state but does not approve plans.** The
boundary holds.

## WorkOrder / VerificationPlan Boundary Review

The report reads `WorkOrder` presence and `VerificationPlan` presence and rolls
them into the status, but creates neither. The contract and CLI smoke confirm no
`WorkOrder` / `VerificationPlan` is written by `rekon intent status`.
**IntentStatusReport does not create WorkOrder or VerificationPlan.** **WorkOrder
/ VerificationPlan generation remains deferred to a separate decision.** The
boundary holds.

## Verification Boundary Review

`VerificationPlan`, `VerificationRun`, and `VerificationResult` are read-only
inputs whose presence and `resultStatus` feed `proof.verification` and the
overall status. The report neither runs verification nor records a proof outcome
of its own. **VerificationResult is an input to status, not the status artifact
itself.** **IntentStatusReport does not create VerificationRun or
VerificationResult.** **IntentStatusReport is status reporting, not
VerificationResult.** The boundary holds.

## Command / Source-Write Boundary Review

The helper reads only the materialized artifact values passed in by the CLI; it
opens no source or event files and runs nothing. The CLI reads files/store and
writes a single artifact. **IntentStatusReport does not execute commands.**
**IntentStatusReport does not write source files.** The boundary holds.

## Intent Go Boundary Review

Status is the reporting layer of the intent spine; the amendment implemented no
execution gate and no downstream generator. **IntentStatusReport does not
implement intent:go.** intent:go remains deferred; source-write behavior remains
unavailable. The boundary holds.

| Boundary | Decision |
| --- | --- |
| IntentStatusReport vs IntentAssessmentReport | reports assessment state |
| IntentStatusReport vs PreparedIntentPlan | reports preparation and approval state |
| IntentStatusReport vs WorkOrder | reports work state, creates nothing |
| IntentStatusReport vs VerificationPlan | reports proof-plan presence, creates nothing |
| IntentStatusReport vs VerificationRun | no command execution |
| IntentStatusReport vs VerificationResult | proof result is input, not status artifact |
| IntentStatusReport vs intent:go | execution deferred |
| IntentStatusReport vs source writes | no writes |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable status rollup | selected | read-only reporting holds |
| Work / Proof Handoff Decision next | selected | next boundary is downstream artifact generation |
| publication surfacing next | deferred | CLI visibility sufficient for now |
| WorkOrder / VerificationPlan implementation next | rejected | decision needed first |
| intent:go next | rejected | execution remains deferred |

- **Declare v1 safe/stable as read-only status reporting.** Selected: the helper,
  CLI, and validator all hold the read-only boundary.
- **Intent Work / Proof Handoff Decision next.** Selected: the status layer now
  reports when an intent is assessed, proof-approved, stale, blocked, work-ready,
  verification-ready, or verified; the next architecture slice should decide
  whether and how a proof-approved `PreparedIntentPlan` may be transformed into
  downstream `WorkOrder` and `VerificationPlan` artifacts.
- **IntentStatusReport publication / operator-surface decision next.** Deferred:
  the CLI already exposes the current state; richer surfacing can follow.
- **WorkOrder / VerificationPlan generation implementation next.** Rejected: a
  decision must precede implementation.
- **intent:go next.** Rejected: execution and source writes remain deferred.

## Recommendation

**IntentStatusReport v1 is safe/stable as read-only status reporting.** Proceed
to the **Intent Work / Proof Handoff Decision**: decide whether and how a
proof-approved `PreparedIntentPlan` may produce, or recommend producing,
downstream `WorkOrder` and `VerificationPlan` artifacts — including what
`PreparedIntentPlan.approval` proof is required, how `IntentStatusReport` status
gates generation, what prevents generation when approval is not approved or when
freshness/drift changed after preparation, and how generated refs trace back to
the prepared plan. Do not jump directly to `intent:go`. If caution is preferred,
an `IntentStatusReport` publication / operator-surface decision is the
alternative — but the default is the Work / Proof Handoff Decision because the
status artifact and CLI already expose the current state and the next major
boundary is artifact generation from proof-approved preparation.

## What This Does Not Do

This review changes no runtime behavior. It implements no `WorkOrder` /
`VerificationPlan` generation, no `IntentGoDecision`, and no `intent:go`. It
creates no `WorkOrder` / `VerificationPlan` / `VerificationRun` /
`VerificationResult`, executes nothing, writes no source, adds no source-write
apply, approves no `PreparedIntentPlan`, mutates no input artifact, imports
nothing from classic codebase-intel, bumps no version, and publishes nothing.

## Follow-Up Work

1. **Intent Work / Proof Handoff Decision** — decide how a proof-approved
   `PreparedIntentPlan` may lead to downstream `WorkOrder` and `VerificationPlan`.
   Still no `WorkOrder` / `VerificationPlan` implementation; still no command
   execution; still no source writes; still no `intent:go`.
2. Later, separately decided: WorkOrder / VerificationPlan generation
   implementation, then (much later) an `IntentGoDecision` execution gate +
   source-write policy.

## Cross-References

- [IntentStatusReport v1 decision](intent-status-report-v1-decision.md)
- [IntentStatusReport artifact](../artifacts/intent-status-report.md)
- [Intent status concept](../concepts/intent-status.md)
- [PreparedIntentPlan safety review](prepared-intent-plan-safety-review.md)
- [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md)
- [IntentAssessmentReport safety review](intent-assessment-report-safety-review.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [VerificationResult artifact](../artifacts/verification-result.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](intent-work-proof-handoff-decision.md).

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](intent-work-order-handoff-decision.md).

> Shipped (slice 90): the Intent WorkOrder handoff generator shipped — `rekon intent work-order generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck) and writes exactly one `WorkOrder` (`source: "intent-handoff"`) that traces back to the plan / status / assessment refs and the phase / obligation / verification-requirement ids. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; it creates no `VerificationPlan`, executes no commands, and writes no source files; intent:go remains deferred. See [intent WorkOrder handoff](../concepts/intent-work-order-handoff.md).

> Reviewed (slice 91): the Intent WorkOrder handoff is safe/stable as an explicit gated WorkOrder generator — `rekon intent work-order generate` requires a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck); the blocked path writes no `WorkOrder`, and the generated path writes exactly one `WorkOrder` that traces back to the plan. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; WorkOrder generation creates no `VerificationPlan` / `VerificationRun` / `VerificationResult`, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Decision. See [Intent WorkOrder Handoff Safety Review](./intent-work-order-handoff-safety-review.md).

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](./intent-verification-plan-handoff-decision.md).

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](../concepts/intent-verification-plan-handoff.md).

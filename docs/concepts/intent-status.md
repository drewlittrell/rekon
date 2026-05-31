# Intent Status

Intent status reporting answers the third question of the staged Rekon intent
spine: *given an assessment and a prepared plan, where does the intent currently
stand across work, proof, freshness, and drift?* `IntentStatusReport` is the
artifact that answers it, by reading the materialized intent / work / proof /
freshness / drift artifacts and rolling them up into a single status.

## Reporting, Not Acting

**IntentStatusReport is status reporting, not VerificationResult.** It reports
the *outcome* recorded by other artifacts; it never runs verification, creates
work, or executes anything. **IntentStatusReport is not WorkOrder** — a
`WorkOrder` is implementation guidance, while the status report is a read-only
rollup that may *recommend* creating one. **IntentStatusReport does not create
WorkOrder or VerificationPlan.** **IntentStatusReport does not execute
commands.** **IntentStatusReport does not write source files.**
**IntentStatusReport does not implement intent:go.**

## Approval Is Reported, Not Granted

The status report reads `PreparedIntentPlan.approval` and surfaces it in
`proof.preparation.approvalStatus`, mapping an approved plan to `work-ready`, a
not-approved plan to `preparation-blocked`, and a needs-review plan to
`needs-review`. But **IntentStatusReport reports PreparedIntentPlan approval
state but does not approve plans** — approval is decided by the prepared-plan
layer, never by status reporting. Likewise **VerificationResult is an input to
status, not the status artifact itself**: a passed result is one of several
signals the rollup reads, alongside freshness and drift.

## What It Reads, What It Emits

The report reads `IntentAssessmentReport`, `PreparedIntentPlan`, `WorkOrder`,
`VerificationPlan`, `VerificationRun`, `VerificationResult`,
`PathFreshnessReport`, `RuntimeGraphDriftReport`, and `HandoffCoverageReport`
when available — none is required, and an absent input is itself a status
signal. It emits an overall status (`not-assessed` … `complete` / `unknown`), a
recommended next action, summarized phases, a per-area proof rollup, and
deterministic blockers / warnings / stale-inputs / missing-inputs lists. It
reads no raw source or event files and writes nothing but the report.

## Precedence

Status precedence keeps the rollup honest: a stale `PathFreshnessReport`
overrides work/proof status to `stale`; high-severity unresolved
`RuntimeGraphDriftReport` rows downgrade an advancing status to `needs-review`;
and `complete` is reserved for a passed verification with no stale context and
no high-severity blockers.

## Boundaries

Intent status is the reporting layer of the intent spine, and it stays
read-only:

- **IntentStatusReport does not create WorkOrder or VerificationPlan.**
- **IntentStatusReport does not execute commands.**
- **IntentStatusReport does not write source files.**
- **IntentStatusReport does not implement intent:go.**
- intent:go remains deferred; source-write behavior remains unavailable.

## Cross-References

- [IntentStatusReport artifact](../artifacts/intent-status-report.md)
- [IntentStatusReport v1 decision](../strategy/intent-status-report-v1-decision.md)
- [Prepared intent plan concept](prepared-intent-plan.md)
- [Intent assessment concept](intent-assessment.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](../strategy/intent-status-report-safety-review.md).

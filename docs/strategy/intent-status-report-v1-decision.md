# IntentStatusReport v1 Decision

## Decision Summary

The staged Rekon intent spine now has two layers: `IntentAssessmentReport`
answers *can intent be prepared?* and `PreparedIntentPlan` answers *does a
proof-approved phase/gate plan exist?* The PreparedIntentPlan Safety Review
(`31abba4`) confirmed preparation is safe/stable as proof-approved preparation
and selected `IntentStatusReport` as the next layer. This decision pins the v1
artifact shape, inputs, status model, proof-rollup model, staleness model, and
implementation sequence for `IntentStatusReport`.

**The decision selects the artifact-backed status rollup (Option B).**
`IntentStatusReport` is a **read-only rollup status report** generated from the
existing intent, work, proof, freshness, and drift artifacts. It reports the
current intent state — assessed / prepared / blocked / stale / verified / failed
/ complete — across the whole spine, and it creates nothing.

**IntentStatusReport is status reporting, not VerificationResult.**
**IntentStatusReport is not WorkOrder.** **IntentStatusReport does not create
WorkOrder or VerificationPlan.** **IntentStatusReport does not execute
commands.** **IntentStatusReport does not write source files.**
**IntentStatusReport does not implement intent:go.** **IntentStatusReport
reports PreparedIntentPlan approval state but does not approve plans.**
**VerificationResult is an input to status, not the status artifact itself.**

This is a decision/architecture batch only — it implements nothing, registers no
artifact type, and adds no CLI command.

## Why This Decision Exists

`IntentAssessmentReport` answers whether intent can be prepared.
`PreparedIntentPlan` answers whether a proof-approved phase/gate plan exists.
Rekon now needs a status layer that reports the current intent state across
assessment, preparation, work guidance, verification, freshness, and runtime
drift — without becoming verification, execution, remediation, or source-write
behavior. Classic intent surfaces reported a rollup state derived from many
inputs; Rekon re-homes that as a read-only artifact over the materialized spine
rather than a side effect of running work. Pinning the status model now keeps
the next implementation slice honest: status reports, it does not act.

## Current Boundary

The intent spine is read-only and additive. `IntentAssessmentReport` and
`PreparedIntentPlan` consume materialized artifacts and mutate none of them;
preparation is proof-approved but creates no `WorkOrder` / `VerificationPlan`,
executes no commands, and writes no source. `IntentStatusReport` extends that
discipline: it is a reporting layer, not a creating or executing layer. It reads
the assessment, the prepared plan (including its approval/proof envelope), and
the downstream work/proof/freshness/drift artifacts when present, and it emits a
single status report.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| PreparedIntentPlan as status | rejected | preparation is one input |
| artifact-backed status rollup | selected | reports across intent/work/proof spine |
| VerificationResult as status | rejected | proof result is one input |
| WorkOrder as status | rejected | work guidance is one input |
| intent:go first | rejected | execution deferred |

- **Option A — use `PreparedIntentPlan.status` as the intent status.** Rejected:
  preparation status is one input; it does not include the downstream
  work/proof/freshness lifecycle.
- **Option B — artifact-backed status rollup.** Selected: `IntentStatusReport`
  consumes assessment, prepared plan, work/proof artifacts, freshness, and drift
  to report current state, preserving status as a read-only reporting layer.
- **Option C — use `VerificationResult` as the status.** Rejected:
  `VerificationResult` is a proof outcome; intent status also includes
  assessment, preparation, work, freshness, drift, and blockers.
- **Option D — use `WorkOrder` as the status.** Rejected: `WorkOrder` is
  implementation guidance, not a complete status rollup.
- **Option E — start with `intent:go`.** Rejected: execution remains deferred
  until status, proof, source-write policy, and governance gates are explicit.

## Recommendation

Adopt **Option B**: `IntentStatusReport` v1 is an artifact-backed rollup status
report generated from existing intent, work, proof, freshness, and drift
artifacts. It consumes them read-only, reports an overall status plus per-area
sub-statuses and blockers/warnings, and recommends a next action. It generates no
`WorkOrder` / `VerificationPlan` in v1. The next slice is the `IntentStatusReport`
v1 implementation.

## Input Model

All inputs are read as already-materialized Rekon artifacts (latest or pinned)
cited by `ArtifactRef`; the generator reads values, never raw source or event
files, and mutates nothing.

| Input | V1 Decision |
| --- | --- |
| IntentAssessmentReport | consumed when available |
| PreparedIntentPlan | consumed when available |
| WorkOrder | consumed when available |
| VerificationPlan | consumed when available |
| VerificationRun | consumed when available |
| VerificationResult | consumed when available |
| PathFreshnessReport | consumed when available |
| RuntimeGraphDriftReport | consumed when available |

`HandoffCoverageReport` and `FindingReport` /
`BridgeFindingLifecycleIntegrationReport` are also consumed when available as
secondary warning inputs. No input is required to exist; the absence of an input
is itself a status signal (e.g. no assessment → `not-assessed`).

## Status Model

| Status | Meaning |
| --- | --- |
| not-assessed | no assessment exists |
| assessed | assessment exists; no prepared plan yet |
| assessment-blocked | assessment cannot proceed |
| prepared | approved prepared plan exists |
| preparation-blocked | prepared plan not approved / blocked |
| needs-review | human review needed |
| stale | context freshness invalidates status |
| work-ready | ready for downstream WorkOrder handoff |
| verification-ready | ready for proof planning / run |
| verification-passed | proof passed |
| verification-failed | proof failed |
| complete | proof passed and no blocking drift/freshness |

The full v1 status enum is `not-assessed` / `assessed` / `assessment-blocked` /
`prepared` / `preparation-blocked` / `needs-review` / `stale` / `work-ready` /
`work-in-progress` / `verification-ready` / `verification-running` /
`verification-passed` / `verification-failed` / `complete` / `unknown`, paired
with a `recommendedNextAction` (`run-assessment` / `prepare-intent` /
`review-prepared-plan` / `create-work-order` / `create-verification-plan` /
`run-verification` / `resolve-blockers` / `refresh-context` / `human-review` /
`none`).

V1 status policy:

1. If no `IntentAssessmentReport` exists, status `not-assessed`.
2. If `IntentAssessmentReport` is blocked / stale / insufficient, status
   `assessment-blocked` or `stale`.
3. If no `PreparedIntentPlan` exists and assessment is ready, status `assessed`.
4. If `PreparedIntentPlan` exists but `approval.status` is `not-approved`, status
   `preparation-blocked`.
5. If `PreparedIntentPlan` exists with `approval.status` `needs-review`, status
   `needs-review`.
6. If `PreparedIntentPlan` exists with `approval.status` `approved` and no
   `WorkOrder` exists, status `work-ready`.
7. If `WorkOrder` exists and no `VerificationPlan` exists, status
   `work-in-progress` or `verification-ready` depending on `WorkOrder` fields.
8. If `VerificationPlan` exists and no `VerificationRun` / `VerificationResult`
   exists, status `verification-ready`.
9. If `VerificationRun` exists and no result exists, status
   `verification-running`.
10. If `VerificationResult` exists and status is failed / partial / not-run,
    status `verification-failed`.
11. If `VerificationResult` passed and no high runtime drift / stale context
    exists, status `complete` or `verification-passed` depending on whether
    completion is explicitly modeled.
12. If `PathFreshnessReport` says scoped context is stale, status `stale`
    overrides work/proof status.
13. If `RuntimeGraphDriftReport` has high-severity unresolved rows, status
    `needs-review` or `preparation-blocked` depending on the phase.
14. Do not create any missing artifacts.

## Proof Rollup Model

`IntentStatusReport.proof` is a non-authoritative rollup of each input's own
recorded state — it copies values, it does not re-derive proof:

- `assessment` — present / readiness / blocker + warning counts.
- `preparation` — present / status / `approvalStatus` / phase / obligation /
  verification-requirement counts.
- `work` — present / status.
- `verification` — planPresent / runPresent / resultPresent / resultStatus.
- `freshness` — present / stale.
- `runtimeDrift` — present / high-severity-open / added-observed /
  uncovered-handoff / unresolved-contract counts.

The rollup mirrors the source artifacts; **VerificationResult is an input to
status, not the status artifact itself.** **IntentStatusReport reports
PreparedIntentPlan approval state but does not approve plans.**

## Blocker / Warning Model

Blockers and warnings reuse a shared `IntentStatusIssue` shape (`id`, `category`,
`severity`, `message`, optional `sourceRefs`). Categories: `assessment-blocked`,
`preparation-not-approved`, `stale-context`, `runtime-drift`,
`handoff-coverage`, `work-missing`, `verification-plan-missing`,
`verification-not-run`, `verification-failed`, `missing-artifact`,
`unknown-state`. Blockers explain a non-advancing status; warnings flag
context that should be resolved but does not stop the current state. The report
also records `staleInputs` and `missingInputs` so reviewers can see what was
absent.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| IntentStatusReport vs IntentAssessmentReport | status consumes assessment |
| IntentStatusReport vs PreparedIntentPlan | status reports approval/preparation |
| IntentStatusReport vs WorkOrder | status reports work, does not create it |
| IntentStatusReport vs VerificationResult | status reports proof outcome |
| IntentStatusReport vs intent:go | execution deferred |
| IntentStatusReport vs source writes | no writes |

**IntentStatusReport is status reporting, not VerificationResult.**
**IntentStatusReport is not WorkOrder.** **IntentStatusReport does not create
WorkOrder or VerificationPlan.** **IntentStatusReport does not execute
commands.** **IntentStatusReport does not write source files.**
**IntentStatusReport does not implement intent:go.**

## Follow-On Artifacts

`IntentStatusReport` is the status layer of the intent spine. After it,
`IntentGoDecision` (a separately-decided execution gate) would decide whether
intent may proceed to action under an explicit source-write policy and
governance gates. v1 produces no follow-on artifacts: it reports status and
recommends a next action, and any `WorkOrder` / `VerificationPlan` creation
remains a separate, later-decided slice.

## What This Does Not Do

This decision implements no `IntentStatusReport`, registers no artifact type or
schema, and adds no CLI command. It creates no `WorkOrder` / `VerificationPlan`
/ `VerificationRun` / `VerificationResult`, executes nothing, writes no source,
implements no `intent:go`, mutates no `IntentAssessmentReport` /
`PreparedIntentPlan` / `WorkOrder` / `VerificationPlan` / `VerificationRun` /
`VerificationResult` / `PathFreshnessReport` / `RuntimeGraphDriftReport`, imports
nothing from classic codebase-intel, bumps no version, and publishes nothing.

## Implementation Sequence

1. **IntentStatusReport v1 Decision** (this memo).
2. **IntentStatusReport v1 implementation** — register `IntentStatusReport`
   (category `actions`), implement a read-only status-rollup generator from
   `IntentAssessmentReport`, `PreparedIntentPlan`, `WorkOrder`,
   `VerificationPlan`, `VerificationRun`, `VerificationResult`,
   `PathFreshnessReport`, and `RuntimeGraphDriftReport`, plus a `rekon intent
   status` CLI. Still no `WorkOrder` / `VerificationPlan` creation, no command
   execution, no source writes, no `intent:go`.
3. **IntentStatusReport safety review**, then (later, separately decided)
   **IntentGoDecision** execution gate + source-write policy.

## Cross-References

- [PreparedIntentPlan safety review](prepared-intent-plan-safety-review.md)
- [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md)
- [PreparedIntentPlan v1 decision](prepared-intent-plan-v1-decision.md)
- [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md)
- [IntentAssessmentReport safety review](intent-assessment-report-safety-review.md)
- [IntentAssessmentReport artifact](../artifacts/intent-assessment-report.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [VerificationResult artifact](../artifacts/verification-result.md)
- [Path freshness report artifact](../artifacts/path-freshness-report.md)
- [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](../artifacts/intent-status-report.md).

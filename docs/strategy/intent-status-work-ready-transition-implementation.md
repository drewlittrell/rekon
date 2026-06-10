# Intent Status Work-Ready Transition Implementation

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Status: Shipped (slice 126). Implements the
> [Intent Status Work-Ready Transition Decision](./intent-status-work-ready-transition-decision.md)
> (Option B) decided at `557fe2e`. Product-capability batch — additive kernel
> fields, one new capability helper, one new CLI command; no package bump, no npm
> publish.
>
> Reviewed safe/stable (slice 127): see the
> [Intent Status Work-Ready Transition Safety Review](./intent-status-work-ready-transition-safety-review.md).

## Decision Summary

**`rekon intent status transition` now writes one new work-ready
`IntentStatusReport` revision from an approved `PreparedIntentPlan` plus the
previous `IntentStatusReport`.** The command rechecks freshness / runtime drift /
status context conservatively, and on success writes a single new
`IntentStatusReport` whose `status.value` is `work-ready` and whose
`recommendedNextAction` is `create-work-order`. The previous status report is
never mutated, the approved plan is never mutated, and the transition creates no
WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no
commands, writes no source files, runs no Circe, and does not implement
`intent:go`. The work-ready revision **enables** — but does not create — the
WorkOrder and VerificationPlan handoffs, which still each require an approved
plan **and** a work-ready status.

## Why This Implementation Exists

The [Intent Operator Approval / Proof Acceptance Implementation](./intent-operator-approval-proof-acceptance-implementation.md)
made `rekon intent approve` write a new approved `PreparedIntentPlan`, and its
[safety review](./intent-operator-approval-proof-acceptance-safety-review.md)
confirmed approval clears `plan-not-approved` but deliberately left
`status-not-work-ready` as a separate downstream gate. The
[decision](./intent-status-work-ready-transition-decision.md) selected Option B:
an explicit status transition that writes a new work-ready status report rather
than auto-transitioning on approval or mutating the prior report. This slice
ships that command so handoff generation can proceed past the status gate without
weakening any proof semantics.

## Changes Made

- **`packages/kernel-repo-model/src/index.ts`** — additive, backward-compatible
  fields: `IntentStatusReportSource.approvedPreparedIntentPlanRef?` and
  `IntentStatusReportSource.previousIntentStatusReportRef?` (both registered in
  `INTENT_STATUS_SOURCE_FIELDS`, which drives both the factory and the
  validator), and `IntentStatusProof.preparation.acceptedRisks?` (carried by
  `normalizeIntentStatusProof` via `preparedIntentNormalizeAcceptedRisks` and
  validated when present by `validateIntentOperatorAcceptedRisk`).
- **`packages/capability-model/src/intent-status-transition.ts`** (new) — the
  pure `buildWorkReadyIntentStatusReport` helper plus its
  `IntentStatusTransitionResult` / `IntentStatusTransitionBlocker` model and the
  structural `*Like` input views.
- **`packages/capability-model/src/index.ts`** — barrel exports for the new
  helper, types, and `INTENT_STATUS_TRANSITION_TARGETS`.
- **`packages/cli/src/index.ts`** — the `rekon intent status transition` command
  branch plus usage / help and the canonical-flow update.

## Public API Changes

| Surface | Change | Compatibility |
| --- | --- | --- |
| IntentStatusReportSource.approvedPreparedIntentPlanRef | added (optional) | additive |
| IntentStatusReportSource.previousIntentStatusReportRef | added (optional) | additive |
| IntentStatusProof.preparation.acceptedRisks | added (optional) | additive |
| buildWorkReadyIntentStatusReport | added (pure helper) | new export |
| IntentStatusTransitionResult / IntentStatusTransitionBlocker | added | new export |
| INTENT_STATUS_TRANSITION_TARGETS | added (= ["work-ready"]) | new export |
| rekon intent status transition | added (CLI command) | new surface |

Every kernel field is optional and validated only when present; existing
`IntentStatusReport` artifacts without the new fields still validate and
round-trip unchanged.

## Purpose Preservation Check

Rekon prepares, proves, packages, and exports; Circe imports and orchestrates.
This slice keeps that boundary: the status transition is a preparation /
proof-state artifact step. It does not import or orchestrate, does not execute
the planned change, and does not run Circe. It enables the downstream handoffs
that Circe consumes without crossing into execution.

## Source Review

`buildWorkReadyIntentStatusReport` is a pure function: it reads no files, writes
no artifacts, executes no commands, runs no Circe, and mutates none of its
inputs. It returns `{ status: "work-ready", intentStatusReport, blockers: [] }`
only when every gate passes; any gate failure returns `{ status: "blocked",
blockers }` with deterministic blocker categories and **no** `intentStatusReport`.
The CLI command resolves the approved plan and previous status by ref (the
previous status is ref-only with no latest fallback, so an omitted
`--previous-status` blocks rather than silently selecting the latest report),
builds the new report header, calls the helper, and on `blocked` sets a non-zero
exit code and writes nothing.

## Work-Ready Gate Model

The transition emits one of fourteen deterministic blocker categories, covering
every gate the decision pinned:

| Blocker category | Fires when |
| --- | --- |
| missing-approved-plan | no approved PreparedIntentPlan supplied |
| missing-approved-plan-ref | no PreparedIntentPlan ref supplied |
| plan-not-approved | approval.status !== approved |
| plan-not-prepared | status.value !== prepared |
| missing-accepted-risks | proof gaps accepted but acceptedRisks empty |
| handoff-not-allowed | workOrderAllowed or verificationPlanAllowed not true |
| source-write-boundary | sourceWriteAllowed !== false |
| missing-previous-status | no previous IntentStatusReport supplied |
| missing-previous-status-ref | no previous IntentStatusReport ref supplied |
| previous-status-not-traceable | plan and previous-status request goals differ |
| previous-status-high-blocker | previous report has an uncovered high-severity blocker |
| freshness-stale | supplied PathFreshnessReport has stale scoped context |
| new-high-runtime-drift | supplied RuntimeGraphDriftReport has new high-severity drift |
| missing-transition-reason | --reason is empty |

The `previous-status-high-blocker` gate blocks **only** high-severity blockers
whose category is not already resolved by an approved plan — `preparation-not-approved`,
`runtime-drift`, `stale-context`, and `handoff-coverage` are treated as covered
by approval, so they do not re-block a plan the operator already approved.

## Recheck Model

The recheck mirrors the approval recheck and blocks when uncertain:

- **Status:** the previous `IntentStatusReport` must be traceable to the plan
  lineage (same request goal when both are present) and must not carry an
  uncovered high-severity blocker.
- **Freshness:** a supplied `PathFreshnessReport` with any stale scoped path
  blocks; absence does not *prove* freshness.
- **Runtime drift:** a supplied `RuntimeGraphDriftReport` with new high-severity
  drift blocks; absence finds no new drift.

The transition does not re-open the proof-gap acceptance decision — accepted gaps
already live on the approved plan (`approval.acceptedRisks`) and are carried
forward as evidence, not re-litigated.

## Work-Ready Report Model

| Field | Work-Ready Status Report |
| --- | --- |
| status.value | work-ready |
| recommendedNextAction | create-work-order |
| source.preparedIntentPlanRef | approved plan |
| source.approvedPreparedIntentPlanRef | approved plan |
| source.previousIntentStatusReportRef | previous report |
| proof.preparation.approvalStatus | approved |
| proof.preparation.acceptedRisks | carried forward |
| blockers / warnings | empty |
| WorkOrder / VerificationPlan | not created |

`recommendedNextAction` is `create-work-order` because a WorkOrder is generated
before a VerificationPlan and `create-work-order` is an existing
`IntentStatusRecommendedNextAction` value. **A combined
`create-work-order-and-verification-plan` value does not exist in the enum and is
not introduced by this slice.**

## CLI Surface

```sh
rekon intent status transition \
  --prepared-plan <PreparedIntentPlan:id|type:id> \
  --previous-status <IntentStatusReport:id|type:id> \
  [--path-freshness <PathFreshnessReport:id|type:id>] \
  [--runtime-drift <RuntimeGraphDriftReport:id|type:id>] \
  --to work-ready \
  --reason "Operator approval accepted known proof gaps and status context was rechecked." \
  [--root <path>] [--json]
```

`--to` must be `work-ready` (the only supported target in v1). On a passing gate
the command writes exactly one new `IntentStatusReport` (category `actions`),
prints its ref, and — in `--json` mode — reports a `boundaries` object whose every
flag (`createdWorkOrder`, `createdVerificationPlan`, `createdVerificationRun`,
`createdVerificationResult`, `executedCommands`, `wroteSourceFiles`, `ranCirce`,
`implementedIntentGo`) is `false`. On a failed gate it prints the blockers, exits
non-zero, and writes no report.

## Boundary Model

| Boundary | Implementation |
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

The boundary statements this implementation preserves:

- Status transition is explicit; approval does not automatically make status work-ready.
- Status transition creates a new IntentStatusReport artifact rather than mutating an existing report.
- The previous IntentStatusReport remains immutable.
- The approved PreparedIntentPlan remains immutable.
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

## Tests & Verification

- `tests/contract/intent-status-work-ready-transition.test.mjs` (35 assertions) —
  pure helper-gate cases (every blocker category, the approval-covered-blocker
  pass-through, the carried-forward acceptedRisks) plus an end-to-end CLI pipeline
  (scan → context prepare → assess → prepare → status → approve →
  `intent status transition` blocked without `--previous-status` →
  `intent status transition` work-ready with `--previous-status`), asserting the
  blocked path writes nothing, the work-ready path writes exactly one new report,
  the report validates, the previous report and approved plan are byte-identical,
  and no WorkOrder / VerificationPlan / source write results from the transition.
- `tests/docs/intent-status-work-ready-transition.test.mjs` (14 assertions) — this
  memo and the review packet.
- Full nine-command verification gate plus the documented CLI smoke matrix.

## Intentionally Untouched

`rekon intent approve` is unchanged — it still does not auto-transition status.
The WorkOrder / VerificationPlan generators are unchanged — they still require a
work-ready status and now read the work-ready report this command produces. No
existing artifact validator rule was loosened.

## What This Does Not Do

This slice mutates no existing `IntentStatusReport` or `PreparedIntentPlan`,
relaxes no WorkOrder / VerificationPlan gate, creates no WorkOrder /
VerificationPlan / VerificationRun / VerificationResult, executes no commands,
writes no source files, runs no Circe, does not implement `intent:go`, does not
auto-approve needs-review plans, does not auto-transition status on approval,
bumps no version, and publishes nothing to npm.

## Follow-Up Work

- **Intent Status Work-Ready Transition Safety Review** (next): review this
  shipped command as a trust boundary — confirm it never auto-transitions,
  preserves the previous report and approved plan, rechecks conservatively, and
  creates no downstream artifacts.
- Stale-context acceptance at transition time remains deliberately unsupported; a
  separate decision is required before relaxing the freshness block.

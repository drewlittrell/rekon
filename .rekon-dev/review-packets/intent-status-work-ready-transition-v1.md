# Review Packet — Intent Status Work-Ready Transition (v1, slice 126)

> Implements the
> [Intent Status Work-Ready Transition Decision](../../docs/strategy/intent-status-work-ready-transition-decision.md)
> (Option B). Full memo:
> [Intent Status Work-Ready Transition Implementation](../../docs/strategy/intent-status-work-ready-transition-implementation.md).
> Product-capability batch against `557fe2e`. No package bump, no npm publish.

## CHANGES MADE

- **`packages/kernel-repo-model/src/index.ts`** — additive fields:
  `IntentStatusReportSource.approvedPreparedIntentPlanRef?`,
  `IntentStatusReportSource.previousIntentStatusReportRef?` (both added to
  `INTENT_STATUS_SOURCE_FIELDS`, which feeds the factory and the validator), and
  `IntentStatusProof.preparation.acceptedRisks?` (carried by
  `normalizeIntentStatusProof`, validated when present).
- **`packages/capability-model/src/intent-status-transition.ts`** (new) — the
  pure `buildWorkReadyIntentStatusReport` helper plus `IntentStatusTransitionResult`,
  `IntentStatusTransitionBlocker`, the `*Like` input views, and
  `INTENT_STATUS_TRANSITION_TARGETS`.
- **`packages/capability-model/src/index.ts`** — barrel exports.
- **`packages/cli/src/index.ts`** — `rekon intent status transition` command plus
  usage / help and the canonical-flow update.

## PUBLIC API CHANGES

| Surface | Change | Compatibility |
| --- | --- | --- |
| IntentStatusReportSource.approvedPreparedIntentPlanRef | added (optional) | additive |
| IntentStatusReportSource.previousIntentStatusReportRef | added (optional) | additive |
| IntentStatusProof.preparation.acceptedRisks | added (optional) | additive |
| buildWorkReadyIntentStatusReport | new export | new |
| INTENT_STATUS_TRANSITION_TARGETS | new export (= ["work-ready"]) | new |
| rekon intent status transition | new CLI command | new |

All kernel fields are optional and validated only when present; pre-existing
`IntentStatusReport` artifacts still validate unchanged.

## PURPOSE PRESERVATION CHECK

Rekon prepares, proves, packages, and exports; Circe imports and orchestrates.
The status transition is a proof-state preparation step: it records that an
approved plan's status is work-ready so the downstream handoffs Circe consumes
become allowed. It imports nothing, orchestrates nothing, executes nothing, and
runs no Circe.

## SOURCE REVIEW

`buildWorkReadyIntentStatusReport` is pure — no file reads, no writes, no command
execution, no Circe, no input mutation. It returns work-ready only when every
gate passes and otherwise returns blocked with deterministic categories and no
report. The CLI command resolves the approved plan and previous status by ref
(previous status is ref-only with no latest fallback), builds the report header,
calls the helper, writes exactly one report on success, and on blocked sets a
non-zero exit and writes nothing.

## STATUS TRANSITION HELPER

`buildWorkReadyIntentStatusReport(input)` takes the new report header, the
approved `PreparedIntentPlan` (+ ref), the previous `IntentStatusReport` (+ ref),
optional `PathFreshnessReport` / `RuntimeGraphDriftReport` (+ refs), and a
`reason`. It returns `IntentStatusTransitionResult`. The structural `*Like` views
read inputs by shape, so the helper has no class dependency on the kernel
artifact instances.

## WORK-READY GATE MODEL

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

`previous-status-high-blocker` ignores blocker categories already resolved by an
approved plan (`preparation-not-approved`, `runtime-drift`, `stale-context`,
`handoff-coverage`).

## RECHECK MODEL

Conservative, block-when-uncertain, mirroring the approval recheck: previous
status must be traceable and free of uncovered high blockers; a supplied stale
`PathFreshnessReport` blocks; a supplied `RuntimeGraphDriftReport` with new high
drift blocks. Absence of a freshness / drift report never *proves* freshness or
no-drift. Accepted proof gaps are carried forward from the approved plan, not
re-litigated.

## WORK-READY REPORT MODEL

| Field | Value |
| --- | --- |
| status.value | work-ready |
| recommendedNextAction | create-work-order |
| source.preparedIntentPlanRef | approved plan |
| source.approvedPreparedIntentPlanRef | approved plan |
| source.previousIntentStatusReportRef | previous report |
| proof.preparation.approvalStatus | approved |
| proof.preparation.acceptedRisks | carried forward |
| blockers / warnings | empty |

No combined `create-work-order-and-verification-plan` value is invented — it does
not exist in the `IntentStatusRecommendedNextAction` enum.

## CLI SURFACE

```sh
rekon intent status transition \
  --prepared-plan <PreparedIntentPlan:id|type:id> \
  --previous-status <IntentStatusReport:id|type:id> \
  [--path-freshness <ref>] [--runtime-drift <ref>] \
  --to work-ready --reason <text> [--root <path>] [--json]
```

`--json` work-ready output includes `boundaries:{createdWorkOrder:false,
createdVerificationPlan:false, createdVerificationRun:false,
createdVerificationResult:false, executedCommands:false, wroteSourceFiles:false,
ranCirce:false, implementedIntentGo:false}`.

## BOUNDARY MODEL

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

## TESTS / VERIFICATION

- `tests/contract/intent-status-work-ready-transition.test.mjs` — 35 assertions
  (helper-gate cases + end-to-end CLI pipeline: blocked without `--previous-status`,
  work-ready with `--previous-status`, immutability, boundaries, downstream clears).
- `tests/docs/intent-status-work-ready-transition.test.mjs` — 14 assertions.
- Nine-command verification gate plus the CLI smoke matrix (scan → context prepare
  → assess → prepare → status → approve → transition blocked → transition
  work-ready → work-order generate → verification-plan generate → artifacts
  validate).

## INTENTIONALLY UNTOUCHED

`rekon intent approve` (still no auto-transition), the WorkOrder /
VerificationPlan generators (still gate on work-ready status), and every existing
validator rule.

## RISKS / FOLLOW-UP

- The recheck is conservative; an operator may need to refresh path freshness or
  resolve drift before transitioning. This is intentional.
- Stale-context acceptance at transition time is deliberately unsupported pending
  a separate decision.

## NEXT STEP

**Intent Status Work-Ready Transition Safety Review** — review this shipped
command as a trust boundary (no auto-transition, previous report and plan
preserved, conservative rechecks, no downstream artifacts).

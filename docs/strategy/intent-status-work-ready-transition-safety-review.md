# Intent Status Work-Ready Transition Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Status: Reviewed safe/stable (slice 127). Reviews the `rekon intent status
> transition` implementation shipped at `b466eed` (slice 126). Strategy /
> safety-review batch — no runtime, transition, or package change; no npm publish.

## Decision Summary

**Intent Status Work-Ready Transition is safe/stable.** The `rekon intent status
transition` command shipped in slice 126 is an explicit, gated, non-executing
status step. It reads an approved `PreparedIntentPlan` plus the previous
`IntentStatusReport`, rechecks freshness / runtime drift / prior-status context
conservatively, and writes exactly **one new** work-ready `IntentStatusReport`
revision only when every gate passes. The transition never runs automatically on
approval, the previous status report and the approved plan are never mutated, and
accepted proof gaps are carried forward into the new report rather than erased.
The work-ready revision closes the `status-not-work-ready` gap so the WorkOrder /
VerificationPlan handoffs can proceed — but the transition itself creates no
WorkOrder / VerificationPlan / VerificationRun / VerificationResult, runs no
commands, writes no source, and runs no Circe; `intent:go` stays deferred. The
end-to-end review found no blocker.

## Why This Review Exists

The [Intent Operator Approval / Proof Acceptance Implementation](./intent-operator-approval-proof-acceptance-implementation.md)
made `rekon intent approve` clear the plan approval gate, but its
[safety review](./intent-operator-approval-proof-acceptance-safety-review.md)
deliberately left `status-not-work-ready` as a **separate** downstream gate. The
[Intent Status Work-Ready Transition Decision](./intent-status-work-ready-transition-decision.md)
chose Option B (an explicit transition that writes a new work-ready report, not
in-place mutation or an approval side effect), and the
[implementation](./intent-status-work-ready-transition-implementation.md) shipped
it. Because the transition is the lever that opens WorkOrder / VerificationPlan
generation, it must be reviewed as a trust boundary: it must never auto-transition,
must preserve the prior report and the approved plan, must recheck context
conservatively, and must not itself execute or create downstream artifacts. This
memo confirms those properties against the shipped code.

## Implementation Reviewed

Reviewed at `b466eed`:

- `packages/kernel-repo-model/src/index.ts` — the additive optional
  `IntentStatusReportSource.approvedPreparedIntentPlanRef` /
  `previousIntentStatusReportRef` (registered in `INTENT_STATUS_SOURCE_FIELDS`,
  which feeds both the factory normalize and the validator) and
  `IntentStatusProof.preparation.acceptedRisks` (carried by
  `normalizeIntentStatusProof`, validated when present by
  `validateIntentOperatorAcceptedRisk`).
- `packages/capability-model/src/intent-status-transition.ts` — the pure
  `buildWorkReadyIntentStatusReport` helper plus its blocker / result model.
- `packages/capability-model/src/index.ts` — barrel exports.
- `packages/cli/src/index.ts` — the `rekon intent status transition` command.
- `tests/contract/intent-status-work-ready-transition.test.mjs` (35 assertions) +
  `tests/docs/intent-status-work-ready-transition.test.mjs` (14 assertions).

### Surface

| Surface | Status | Safety Finding |
| --- | --- | --- |
| IntentStatusReportSource.approvedPreparedIntentPlanRef | shipped | additive traceability |
| IntentStatusReportSource.previousIntentStatusReportRef | shipped | additive traceability |
| IntentStatusProof.preparation.acceptedRisks | shipped | accepted risk carry-forward |
| buildWorkReadyIntentStatusReport | shipped | pure transition helper |
| rekon intent status transition | shipped | explicit transition command |
| blocked path | shipped | exits non-zero / writes nothing |
| work-ready path | shipped | writes one new IntentStatusReport |
| previous status | preserved | immutable |
| approved plan | preserved | immutable |
| downstream artifacts | absent | not created by transition |

## Additive Field Review

The three new fields are **additive and backward-compatible**:
`IntentStatusReportSource.approvedPreparedIntentPlanRef` and
`previousIntentStatusReportRef` are optional artifact refs added to
`INTENT_STATUS_SOURCE_FIELDS`, so the factory only carries them when present and
the validator only checks them when present;
`IntentStatusProof.preparation.acceptedRisks` is an optional array validated
per-entry by `validateIntentOperatorAcceptedRisk` only when present. Existing
`IntentStatusReport` artifacts without these fields still validate and round-trip
unchanged. **Status transition carries acceptedRisks into IntentStatusReport
proof** — the accepted proof gaps recorded on the approved plan's
`approval.acceptedRisks` are copied onto the new report's
`proof.preparation.acceptedRisks` as forward evidence, not re-litigated and not
erased.

## Transition Gate Review

`buildWorkReadyIntentStatusReport` is a pure function — it reads no files, writes
no artifacts, executes no commands, runs no Circe, and mutates none of its
inputs. It returns `work-ready` only when every gate passes; any failure returns
`blocked` with deterministic blocker categories and writes no report. Confirmed
gates: an approved `PreparedIntentPlan` is present with `approval.status ===
"approved"` and `status.value === "prepared"`; `acceptedRisks` are recorded when
proof gaps were accepted; the plan proof's `downstreamHandoff.workOrderAllowed`
and `verificationPlanAllowed` are `true` and `sourceWriteAllowed` is `false`; a
previous `IntentStatusReport` is present and traceable to the plan lineage with no
uncovered high-severity blocker; the supplied freshness / runtime-drift rechecks
find no new blocking evidence; and a non-empty transition reason is supplied.
**Work-ready status requires an approved PreparedIntentPlan.** **Status transition
rechecks prior status, freshness, and runtime drift context** — the rechecks
mirror the approval rechecks and block when uncertain (a stale `PathFreshnessReport`
or a new high-severity `RuntimeGraphDriftReport` blocks; absence never *proves*
freshness or no-drift). **sourceWriteAllowed remains false.**

### Gate

| Gate | Review Finding |
| --- | --- |
| approved plan | required |
| plan status | prepared |
| approval status | approved |
| acceptedRisks | carried forward |
| workOrderAllowed | true |
| verificationPlanAllowed | true |
| sourceWriteAllowed | false |
| previous status | required |
| freshness recheck | conservative |
| runtime drift recheck | conservative |
| transition reason | required |

## Work-Ready Report Review

When the gate passes, the helper builds a new `IntentStatusReport` with
`status.value = "work-ready"` and `recommendedNextAction = "create-work-order"`,
a `source` carrying the approved-plan ref, the previous-status ref, and any
freshness / drift refs, and a `proof.preparation` block with `present: true`,
`status: "prepared"`, `approvalStatus: "approved"`, the phase / obligation /
verification-requirement counts, and the carried-forward `acceptedRisks`. Its
`blockers`, `warnings`, `staleInputs`, and `missingInputs` are empty. **Status
transition creates a new IntentStatusReport revision** — it never edits the prior
report. **The previous IntentStatusReport remains immutable** and **the approved
PreparedIntentPlan remains immutable** (the contract test confirms both files are
byte-identical after the transition). **recommendedNextAction is create-work-order**
(a WorkOrder is generated before a VerificationPlan; no combined
`create-work-order-and-verification-plan` value is invented — it does not exist in
the enum).

## CLI Review

`rekon intent status transition --prepared-plan <ref> --previous-status <ref>
[--path-freshness <ref>] [--runtime-drift <ref>] --to work-ready --reason <text>
[--root <path>] [--json]`. `--to` must be `work-ready` (the only supported target
in v1). The previous status is resolved by ref only with no latest fallback, so an
omitted `--previous-status` blocks rather than silently selecting the latest
report. The blocked path sets a non-zero exit code, prints the blockers, and writes
no report. The work-ready path writes exactly one new `IntentStatusReport` (via
`store.write(..., { category: "actions" })`), prints its ref, and — in `--json`
mode — reports a `boundaries` object whose every flag (`createdWorkOrder`,
`createdVerificationPlan`, `createdVerificationRun`, `createdVerificationResult`,
`executedCommands`, `wroteSourceFiles`, `ranCirce`, `implementedIntentGo`) is
`false`. In neither path does the command create a WorkOrder, VerificationPlan,
VerificationRun, or VerificationResult, execute commands, or write source.

## Handoff Gate Review

The work-ready revision is what the downstream handoff gates require. **WorkOrder
handoff proceeds past status-not-work-ready after transition** and
**VerificationPlan handoff proceeds past status-not-work-ready after transition** —
the slice-126 smoke confirmed both `rekon intent work-order generate` and `rekon
intent verification-plan generate`, run against the approved plan plus the new
work-ready status, returned `generated` with no `status-not-work-ready` blocker,
and `rekon artifacts validate` passed. The transition **enables** those handoffs;
it does not perform them. **Status transition creates no WorkOrder.** **Status
transition creates no VerificationPlan.** **Status transition creates no
VerificationRun or VerificationResult.**

## Boundary Review

The shipped command preserves every boundary the decision pinned:

- Status transition is explicit; approval does not automatically make status work-ready.
- Status transition creates a new IntentStatusReport revision.
- The previous IntentStatusReport remains immutable.
- The approved PreparedIntentPlan remains immutable.
- Work-ready status requires an approved PreparedIntentPlan.
- Status transition rechecks prior status, freshness, and runtime drift context.
- sourceWriteAllowed remains false.
- Status transition carries acceptedRisks into IntentStatusReport proof.
- recommendedNextAction is create-work-order.
- WorkOrder handoff proceeds past status-not-work-ready after transition.
- VerificationPlan handoff proceeds past status-not-work-ready after transition.
- Status transition creates no WorkOrder.
- Status transition creates no VerificationPlan.
- Status transition creates no VerificationRun or VerificationResult.
- Status transition executes no commands.
- Status transition writes no source files.
- Status transition runs no Circe.
- intent:go remains deferred.

### Boundary

| Boundary | Decision |
| --- | --- |
| transition vs automatic status | explicit only |
| transition vs mutation | new report |
| transition vs WorkOrder | enables only |
| transition vs VerificationPlan | enables only |
| transition vs VerificationRun / Result | not created |
| transition vs command execution | no execution |
| transition vs source writes | no writes |
| transition vs Circe | does not run Circe |
| transition vs intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare transition safe/stable | selected | gap closed with explicit report |
| fresh-repo end-to-end safety review next | selected | full path now exists |
| setup prompt decision next | deferred | polish after path review |
| auto-transition after approval | rejected | hidden side effect |
| create WorkOrder during transition | rejected | conflates status and handoff |

## Recommendation

Declare **Intent Status Work-Ready Transition safe/stable**. The recommended next
slice is the **Fresh Repo Intent Handoff End-to-End Safety Review**: the fresh-repo
operator path now has every required public transition —
`scan → intent context prepare → intent assess → intent prepare → intent approve →
intent status transition → intent work-order generate → intent verification-plan
generate → intent bundle write → Circe validates/imports the handoff`. Before
declaring the operator path complete, review the full path as a system: approval,
work-ready status, WorkOrder, VerificationPlan, bundle, Circe projection, and all
safety boundaries — still no Rekon-side command execution, no Rekon-side source
writes, no Rekon-side Circe execution, and no `intent:go`. The alternative —
**Rekon Interactive Setup Prompt Decision** — is deferred: install / setup polish
can continue once the core handoff path is system-reviewed. The default
recommendation is the fresh-repo end-to-end safety review because the status
transition completes the previously blocked operator path.

## What This Does Not Do

This review changes no runtime behavior, no status-transition behavior, and no
gate. It creates no WorkOrder, VerificationPlan, VerificationRun, or
VerificationResult, executes no commands, writes no source files, runs no Circe,
and does not implement `intent:go`. It does not auto-transition status after
approval, does not mutate any existing `IntentStatusReport` or `PreparedIntentPlan`,
does not relax the WorkOrder / VerificationPlan gates, bumps no version, and
publishes nothing to npm.

## Follow-Up Work

- **Fresh Repo Intent Handoff End-to-End Safety Review** (next): review the full
  public fresh-repo path as a system now that every transition exists, confirming
  the same boundaries hold end to end (no command execution, no source writes, no
  Circe execution, `intent:go` deferred).
- Stale-context acceptance at transition time remains deliberately unsupported; a
  separate decision is required before relaxing the freshness block.

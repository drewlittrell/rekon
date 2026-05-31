# Intent WorkOrder Handoff Safety Review

## Decision Summary

The Intent WorkOrder handoff generator shipped in the ninetieth slice
(`24f7389`) as the first downstream generator on the Rekon intent spine:
`rekon intent work-order generate` reads a proof-approved `PreparedIntentPlan`
(gated by `IntentStatusReport` and a handoff-time freshness / drift recheck) and
writes exactly one `WorkOrder`. Because that command is one CLI step away from
implementation guidance, it is reviewed here before any VerificationPlan handoff
or `intent:go` work begins.

This review finds the handoff **safe / stable as an explicit gated WorkOrder
generator** (no blocker). **Intent WorkOrder handoff is WorkOrder artifact
generation, not intent:go.** **WorkOrder generation requires a proof-approved
PreparedIntentPlan.** **IntentStatusReport gates WorkOrder generation but does
not generate WorkOrder.** **Blocked handoff writes no WorkOrder.** **Generated
WorkOrder must trace back to PreparedIntentPlan.** **WorkOrder generation does
not create VerificationPlan.** **WorkOrder generation does not create
VerificationRun or VerificationResult.** **WorkOrder generation does not execute
commands.** **WorkOrder generation does not write source files.** **intent:go
remains deferred.**

The recommended next slice is the **Intent VerificationPlan Handoff Decision** —
the second half of the selected separate-generator handoff model.

| Surface | Status | Boundary |
| --- | --- | --- |
| buildIntentWorkOrderHandoff helper | shipped | evaluates handoff gate |
| intent work-order generate CLI | shipped | writes WorkOrder only on pass |
| blocked path | shipped | writes no WorkOrder |
| generated WorkOrder intentHandoff block | shipped | traceability only |
| VerificationPlan | deferred | not created |
| intent:go | deferred | no execution |

## Why This Review Exists

`PreparedIntentPlan` is proof-approved phase/gate preparation, and
`IntentStatusReport` can now report a `work-ready` state. The WorkOrder handoff is
the first generator that consumes that approved preparation and emits a
downstream action artifact. Because a `WorkOrder` is implementation guidance —
close to action — the generator must be explicitly gated, traceable, and
read-only over its inputs before the proof-plan handoff or execution work is
unblocked. This review grounds those guarantees in the shipped code.

## Helper And CLI Reviewed

`buildIntentWorkOrderHandoff` (`packages/capability-model/src/intent-work-order-handoff.ts`)
is a pure function: it reads only the fields of the artifacts handed to it, runs
the generation gate, and returns either `{ status: "blocked", blockers }` (no
`workOrder`) or `{ status: "generated", workOrder, blockers: [] }`. It reads no
files, writes no artifacts itself, executes no commands, writes no source, and
mutates none of its inputs.

The CLI branch `rekon intent work-order generate`
(`packages/cli/src/index.ts`) resolves a required `PreparedIntentPlan`
(`--prepared-plan`, must reference a `PreparedIntentPlan`), the latest-or-pinned
`IntentStatusReport`, and the optional `PathFreshnessReport` /
`RuntimeGraphDriftReport`, builds a `WorkOrder` header, and calls the helper. On
`blocked` it sets a non-zero exit code and writes nothing; on `generated` it
persists exactly one `WorkOrder` via `store.write(..., { category: "actions" })`
and prints the ref. The legacy `intent work-order` branch is guarded with
`positional !== "generate"` so the new subcommand is not intercepted.

## Gate Review

The generation gate is allowed only when **all** of the following hold; any
failure produces a high-severity blocker and no WorkOrder.

| Gate | Required State |
| --- | --- |
| PreparedIntentPlan approval | approval.status approved |
| PreparedIntentPlan status | status.value prepared |
| PreparedIntentPlan next action | create-work-order |
| IntentStatusReport | work-ready |
| blockers | no high-severity blockers |
| freshness recheck | no stale scoped context after approval |
| drift recheck | no new high-severity drift after approval |
| downstream handoff | workOrderAllowed true and sourceWriteAllowed false |

The helper additionally requires the `PreparedIntentPlan` and its ref to be
present (`missing-prepared-plan` / `missing-source-ref`), the `IntentStatusReport`
and its ref to be present, and at least one phase (`empty-phases`). The gate
matches the slice-89 decision exactly.

## Blocked Path Review

When `blockers.length > 0 || !plan || !planRef`, the helper returns
`{ status: "blocked", blockers }` with no `workOrder`, and the CLI sets
`process.exitCode = 1` and writes nothing. The implementation-batch CLI smoke
confirmed this against a real `assess → prepare → status` spine: a not-approved
plan produced seven deterministic blockers, exit code 1, and **no WorkOrder, no
VerificationPlan, and no VerificationRun written**, with `artifacts validate`
clean and the source tree untouched. **Blocked handoff writes no WorkOrder.**

## Generated WorkOrder Review

On a passing gate the helper produces exactly one `WorkOrder` with
`source: "intent-handoff"`. The request goal becomes the WorkOrder goal; phase
paths and systems become unique-sorted `paths` / `ownerSystems`; obligation
messages and `"Do not start:"` blocked reasons become `riskNotes`; verification
requirements become `requiredChecks` *guidance strings* (command + reason, never
executed); and a fixed `successCriteria` set records that verification
requirements are proof obligations, not a VerificationPlan. The CLI persists this
single artifact and nothing else. **Generated WorkOrder must trace back to
PreparedIntentPlan.**

## Traceability Review

Every generated WorkOrder carries an `intentHandoff` block recording the
`preparedIntentPlanRef`, the `intentAssessmentReportRef` (from the plan's source),
the `intentStatusReportRef`, the optional `pathFreshnessReportRef` /
`runtimeGraphDriftReportRef`, the full `sourceRefs` list, and the `phaseIds` /
`obligationIds` / `verificationRequirementIds`. The header `inputRefs` carries the
same refs. Traceability is descriptive only — it grants no authority and triggers
no downstream action.

## Freshness / Drift Recheck Review

The handoff rechecks freshness and runtime drift at generation time. A supplied
or latest `PathFreshnessReport` whose `status` is `stale` (or whose entries are
`changed` / `missing`) blocks with `freshness-stale`; a `RuntimeGraphDriftReport`
with any high-severity row that is not `in-sync` / `not-evaluated` blocks with
`drift-changed`. Both inputs are optional — an absent report does not block —
matching the decision's "checked when available" rule. There is no override path.

## VerificationPlan Boundary Review

The handoff creates no `VerificationPlan`. Verification requirements travel into
the WorkOrder as guidance strings and `intentHandoff.verificationRequirementIds`
only; the `successCriteria` text explicitly states that verification requirements
are proof obligations, not a VerificationPlan. **WorkOrder generation does not
create VerificationPlan.** **WorkOrder generation does not create VerificationRun
or VerificationResult.** Proof planning remains a separate, not-yet-decided
handoff.

## Command / Source-Write Boundary Review

The helper is a pure data transform and the CLI's only side effect is one
`store.write` into the artifact store's `actions` category. No process is
spawned, no command string is executed, and no source path is opened for writing.
The generated WorkOrder's `intentHandoff.boundary` is literal-typed
`{ createsVerificationPlan: false, executesCommands: false, writesSourceFiles:
false }`, and the markdown restates the same. **WorkOrder generation does not
execute commands.** **WorkOrder generation does not write source files.**

## Intent Go Boundary Review

The handoff produces guidance, never execution. It does not start, schedule, or
run the work the WorkOrder describes, and it does not implement `intent:go`. The
generated artifact is an action *plan*, not an action. **intent:go remains
deferred.**

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare WorkOrder handoff safe/stable | selected | explicit gate holds |
| VerificationPlan handoff decision next | selected | second separate generator boundary |
| publication surfacing next | deferred | CLI visibility sufficient for now |
| VerificationPlan implementation next | rejected | decision needed first |
| intent:go next | rejected | execution remains deferred |

| Boundary | Decision |
| --- | --- |
| WorkOrder handoff vs intent:go | artifact generation, not execution |
| WorkOrder generator vs IntentStatusReport | status gates, generator writes |
| WorkOrder generator vs VerificationPlan | no proof-plan creation |
| WorkOrder generator vs VerificationRun / VerificationResult | no command/proof result creation |
| WorkOrder generator vs source writes | no writes |
| WorkOrder generator vs PreparedIntentPlan | consumes approved plan, mutates nothing |

## Recommendation

Adopt the finding: **Intent WorkOrder handoff is safe/stable as an explicit
gated WorkOrder generator.** The gate requires a proof-approved
`PreparedIntentPlan`, the blocked path writes no WorkOrder, the generated path
writes exactly one traceable WorkOrder, and the VerificationPlan / command /
source-write / `intent:go` boundaries all hold. Proceed to the **Intent
VerificationPlan Handoff Decision** — the remaining half of the selected
separate-generator model — which will pin the exact `VerificationPlan` generator
shape from `PreparedIntentPlan.verificationRequirements` without executing
commands. The alternative, an Intent WorkOrder Handoff publication / operator-
surface decision, is deferred: the generator is already CLI-visible and the
proof-handoff model selected separate generators, so the proof-plan boundary is
the higher-value next decision.

## What This Does Not Do

This review changes no runtime behavior. It implements no VerificationPlan
generation, creates no `VerificationPlan` / `VerificationRun` /
`VerificationResult`, executes no commands, writes no source files, and
implements no `intent:go`. It mutates no `PreparedIntentPlan`,
`IntentStatusReport`, `PathFreshnessReport`, `RuntimeGraphDriftReport`, or
existing `WorkOrder`. It bumps no versions and publishes nothing.

## Follow-Up Work

- **Next:** Intent VerificationPlan Handoff Decision (pin the VerificationPlan
  generator shape from `PreparedIntentPlan.verificationRequirements`; no
  implementation, no VerificationRun, no command execution, no source writes, no
  `intent:go`).
- **Deferred:** VerificationPlan handoff implementation; VerificationRun
  creation; command execution; source writes; `intent:go`; WorkOrder handoff
  publication / operator-surface decision.

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](./intent-verification-plan-handoff-decision.md).

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](../concepts/intent-verification-plan-handoff.md).

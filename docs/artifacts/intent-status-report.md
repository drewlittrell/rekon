# IntentStatusReport

## Purpose

`IntentStatusReport` is the third artifact of the staged Rekon intent spine, the
layer after `IntentAssessmentReport` and `PreparedIntentPlan`. It is a
**read-only rollup status report** generated from the existing Rekon intent,
work, proof, freshness, and runtime-drift artifacts. It reports where the intent
currently stands — assessed / prepared / blocked / stale / verified / failed /
complete — without performing any of those steps.

**IntentStatusReport is status reporting, not VerificationResult.**
**IntentStatusReport is not WorkOrder.** It consumes already-materialized Rekon
artifacts read-only and mutates none of them. **IntentStatusReport reports
PreparedIntentPlan approval state but does not approve plans.**
**VerificationResult is an input to status, not the status artifact itself.**

## What It Does Not Do

v1 reports current state only:

- **IntentStatusReport does not create WorkOrder or VerificationPlan.**
- **IntentStatusReport does not execute commands.**
- **IntentStatusReport does not write source files.**
- **IntentStatusReport does not implement intent:go.**
- It creates no `VerificationRun` / `VerificationResult`, approves no prepared
  plan, and creates no missing artifacts.

`intent:go` remains deferred; source-write behavior remains unavailable.

## Produced By

- `@rekon/capability-model.buildIntentStatusReport`
- the `rekon intent status` CLI command

## Inputs

All inputs are read as already-materialized Rekon artifacts (latest or pinned)
cited by `ArtifactRef`; the generator reads values, never raw source or event
files, and mutates nothing. No input is required — the absence of an input is
itself a status signal.

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
| HandoffCoverageReport | consumed when available |

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
| work-in-progress | WorkOrder exists; verification not complete |
| verification-ready | VerificationPlan exists; no run/result yet |
| verification-running | VerificationRun exists; result pending |
| verification-passed | proof passed |
| verification-failed | proof failed / partial / not-run |
| complete | proof passed and no blocking drift/freshness |
| unknown | inconsistent or insufficient inputs |

`status` carries a `recommendedNextAction` (`run-assessment` / `prepare-intent` /
`review-prepared-plan` / `create-work-order` / `create-verification-plan` /
`run-verification` / `resolve-blockers` / `refresh-context` / `human-review` /
`none`). The status is derived from input presence plus each input's recorded
state: a stale `PathFreshnessReport` overrides work/proof status to `stale`, and
high-severity unresolved `RuntimeGraphDriftReport` rows downgrade an advancing
status to `needs-review`. `complete` requires passed verification with no stale
context and no high-severity blockers.

## Proof Rollup Model

`proof` mirrors each input's recorded state — it copies values, it does not
re-derive proof. `assessment` (present / readiness / blocker + warning counts),
`preparation` (present / status / `approvalStatus` / phase / obligation /
verification-requirement counts), `work` (present / status), `verification`
(plan / run / result presence + `resultStatus`), `freshness` (present / stale),
and `runtimeDrift` (present / high-severity-open / added-observed /
uncovered-handoff / unresolved-contract counts). **VerificationResult is an
input to status, not the status artifact itself.**

## Blocker / Warning Model

`blockers`, `warnings`, `staleInputs`, and `missingInputs` reuse a shared
`IntentStatusIssue` shape (`id`, `category`, `severity`, `message`, optional
`sourceRefs`). Categories: `assessment-blocked`, `preparation-not-approved`,
`stale-context`, `runtime-drift`, `handoff-coverage`, `work-missing`,
`verification-plan-missing`, `verification-not-run`, `verification-failed`,
`missing-artifact`, `unknown-state`. Each list is deterministically ordered by
severity (high first), category, then id.

## Shape

- `source` — optional refs to each consumed artifact.
- `request` — optional `goal`, `kind`, `scope` (from the prepared plan or
  assessment).
- `status` — `value`, `recommendedNextAction`.
- `phases[]` — summarized prepared-plan phases (`id`, `title`, `status`).
- `proof` — the per-area rollup.
- `blockers[]` / `warnings[]` / `staleInputs[]` / `missingInputs[]`.

## CLI Surface

```sh
rekon intent status [--root <path>] [--json]
rekon intent status [--assessment <ref>] [--prepared-plan <ref>] [--work-order <ref>] [--verification-plan <ref>] [--verification-run <ref>] [--verification-result <ref>] [--path-freshness <ref>] [--runtime-drift <ref>] [--handoff-coverage <ref>]
```

Reads the latest available intent / work / proof / freshness / drift artifacts
(or the pinned refs), writes an `IntentStatusReport` under
`.rekon/artifacts/actions/`, and prints a status summary. It creates no
`WorkOrder` / `VerificationPlan` / `VerificationRun`, executes no commands, and
writes no source files.

## Boundary Summary

- **IntentStatusReport is status reporting, not VerificationResult.**
- **IntentStatusReport is not WorkOrder.**
- **IntentStatusReport does not create WorkOrder or VerificationPlan.**
- **IntentStatusReport does not execute commands.**
- **IntentStatusReport does not write source files.**
- **IntentStatusReport does not implement intent:go.**
- **IntentStatusReport reports PreparedIntentPlan approval state but does not approve plans.**
- **VerificationResult is an input to status, not the status artifact itself.**
- intent:go remains deferred; source-write behavior remains unavailable.

## Cross-References

- [Intent status concept](../concepts/intent-status.md)
- [IntentStatusReport v1 decision](../strategy/intent-status-report-v1-decision.md)
- [PreparedIntentPlan artifact](prepared-intent-plan.md)
- [PreparedIntentPlan safety review](../strategy/prepared-intent-plan-safety-review.md)
- [IntentAssessmentReport artifact](intent-assessment-report.md)
- [WorkOrder artifact](work-order.md)
- [VerificationPlan artifact](verification-plan.md)
- [VerificationResult artifact](verification-result.md)
- [Path freshness report artifact](path-freshness-report.md)
- [RuntimeGraphDriftReport artifact](runtime-graph-drift-report.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](../strategy/intent-status-report-safety-review.md).

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](../strategy/intent-work-proof-handoff-decision.md).

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](../strategy/intent-work-order-handoff-decision.md).

> Shipped (slice 90): the Intent WorkOrder handoff generator shipped — `rekon intent work-order generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck) and writes exactly one `WorkOrder` (`source: "intent-handoff"`) that traces back to the plan / status / assessment refs and the phase / obligation / verification-requirement ids. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; it creates no `VerificationPlan`, executes no commands, and writes no source files; intent:go remains deferred. See [intent WorkOrder handoff](../concepts/intent-work-order-handoff.md).

> Reviewed (slice 91): the Intent WorkOrder handoff is safe/stable as an explicit gated WorkOrder generator — `rekon intent work-order generate` requires a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck); the blocked path writes no `WorkOrder`, and the generated path writes exactly one `WorkOrder` that traces back to the plan. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; WorkOrder generation creates no `VerificationPlan` / `VerificationRun` / `VerificationResult`, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Decision. See [Intent WorkOrder Handoff Safety Review](../strategy/intent-work-order-handoff-safety-review.md).

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](../strategy/intent-verification-plan-handoff-decision.md).

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](../concepts/intent-verification-plan-handoff.md).

> Reviewed (slice 94): the Intent VerificationPlan handoff is safe/stable as an explicit gated VerificationPlan generator — `rekon intent verification-plan generate` requires a proof-approved `PreparedIntentPlan` with non-empty verification requirements (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, blocks unsafe / ambiguous commands, and writes exactly one `VerificationPlan` on pass; the blocked path writes none. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Plan bundle / LLM-agent handoff directory work is deferred to the next phase. Next: Intent Plan Bundle / Agent Handoff Directory Decision. See [Intent VerificationPlan Handoff Safety Review](../strategy/intent-verification-plan-handoff-safety-review.md).

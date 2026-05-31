# IntentAssessmentReport

## Purpose

`IntentAssessmentReport` is the first artifact of the staged Rekon intent
spine. It is a **read-only readiness assessment** of a requested user intent
against the existing Rekon context spine. **IntentAssessmentReport is
assessment, not WorkOrder.** It decides whether the repo context is ready to
*prepare* work safely — or whether the request is blocked, stale, ambiguous,
or missing critical context — and recommends a next action.

It consumes already-materialized Rekon artifacts and mutates none of them.
**RuntimeGraphDriftReport is an input to readiness, not the intent system
itself**: drift, handoff coverage, and source freshness feed the readiness
verdict but are not re-evaluated or owned here.

## What It Does Not Do

v1 assesses readiness only:

- **IntentAssessmentReport does not create WorkOrder or VerificationPlan.**
- **IntentAssessmentReport does not execute commands.**
- **IntentAssessmentReport does not write source files.**
- It prepares no phases, gates nothing, and triggers no generation of its
  input artifacts.

`PreparedIntentPlan` remains the next layer after assessment;
`IntentStatusReport` and `intent:go` remain deferred.

## Produced By

- `@rekon/capability-model.buildIntentAssessmentReport`
- the `rekon intent assess` CLI command

## Request Model

The request is the only required input:

- `goal` (required) — what the user wants to accomplish.
- `kind` — `bug` / `feature` / `refactor` / `investigation` / `migration` /
  `unknown` (defaults to `unknown`).
- `scope?` — optional `paths` / `systems` / `capabilities` / `steps` hints.
- `constraints?` / `nonGoals?` — optional declared constraints and explicit
  out-of-scope statements.

## Inputs

All artifact inputs are read as already-materialized Rekon artifacts (latest
available) and cited by `ArtifactRef`; the generator reads values, never raw
source or event files, and mutates nothing.

| Input | V1 Decision |
| --- | --- |
| user request / goal | required |
| CapabilityMap v2 | consumed when available |
| StepCapabilityGraph | expected |
| HandoffCoverageReport | consumed when available |
| RuntimeGraphDriftReport | expected |
| PathFreshnessReport | consumed when available |
| VerificationResult | consumed when available |
| WorkOrder | reference only, not produced |

`StepCapabilityGraph` and `RuntimeGraphDriftReport` are *expected*: when both
are absent, v1 emits high-severity `missing-artifact` blockers.
`CapabilityContract`, `HandoffContract`, `RuntimeGraphObservationReport`,
`FindingReport`, `BridgeFindingLifecycleIntegrationReport`,
`IntelligenceSnapshot`, and `VerificationRun` / `VerificationPlan` are consumed
as citation/context when available.

## Readiness Model

| Readiness | Meaning |
| --- | --- |
| ready-for-prepare | enough context to prepare safely |
| blocked | critical blocker present |
| needs-review | ambiguity / medium-risk blocker |
| insufficient-context | cannot map request to repo context |
| stale-context | freshness says context is stale |

Readiness carries an optional `score` and a required `recommendedNextAction`
(`prepare-intent` / `refresh-context` / `resolve-blockers` /
`ask-clarifying-question` / `run-verification` / `human-review`). Precedence:
`stale-context` > `blocked` > `insufficient-context` > `needs-review` >
`ready-for-prepare`.

## Blocker Model

`blockers`, `warnings`, and `missingContext` share one shape (`id`, `category`,
`severity`, `message`, optional `sourceRefs`). Categories: `missing-artifact`
/ `stale-context` / `runtime-drift` / `handoff-coverage` / `finding-governance`
/ `proof-missing` / `scope-ambiguous` / `source-write-unavailable`. `blockers`
gate readiness (any high-severity blocker → `blocked`); `warnings` inform;
`missingContext` records absent inputs. Each list is deterministically sorted
by severity (high first), then category, then id.

## V1 Assessment Policy

1. A non-empty `goal` is required.
2. Missing `StepCapabilityGraph` / `RuntimeGraphDriftReport` → high
   `missing-artifact` blockers (unless explicitly allowed).
3. High-severity `RuntimeGraphDriftReport` rows
   (`missing-expected` / `uncovered-handoff` / `unresolved-contract`) →
   `runtime-drift` blockers; `added-observed` → warning;
   `observation-missing` → warning.
4. `HandoffCoverageReport` `unresolvedContract` → blocker; `uncovered` →
   warning; `parseErrors` / `notEvaluated` → warnings.
5. `PathFreshnessReport` stale paths relevant to the request scope →
   `stale-context` readiness; stale paths outside scope → warning.
6. Missing `VerificationResult` → `proof-missing` warning; a failed result →
   `proof-missing` blocker; a passed result → no blocker.
7. An unmappable scope → `insufficient-context` readiness with a
   `scope-ambiguous` entry.

## Shape

- `request` — `goal`, `kind`, optional `scope` / `constraints` / `nonGoals`.
- `source` — optional refs for every consumed artifact (no raw payloads).
- `readiness` — `status`, optional `score`, `recommendedNextAction`.
- `matchedContext` — `systems` / `capabilities` / `steps` / `paths`.
- `blockers[]` / `warnings[]` / `missingContext[]` — assessment entries.

## CLI Surface

```sh
rekon intent assess --goal <text> [--root <path>] [--json]
rekon intent assess --goal <text> [--kind <bug|feature|refactor|investigation|migration|unknown>] [--path <p>] [--system <s>] [--capability <c>] [--step <s>] [--constraint <c>] [--non-goal <n>]
```

Reads the latest available context artifacts, writes an
`IntentAssessmentReport` under `.rekon/artifacts/actions/`, and prints a
readiness summary. It creates no `WorkOrder` / `VerificationPlan`, executes no
commands, and writes no source files.

## Boundary Summary

- **IntentAssessmentReport is assessment, not WorkOrder.**
- **IntentAssessmentReport does not create WorkOrder or VerificationPlan.**
- **IntentAssessmentReport does not execute commands.**
- **IntentAssessmentReport does not write source files.**
- **RuntimeGraphDriftReport is an input to readiness, not the intent system
  itself.**
- PreparedIntentPlan remains the next layer after assessment.
- IntentStatusReport remains deferred.
- intent:go remains deferred.

## Cross-References

- [Intent assessment concept](../concepts/intent-assessment.md)
- [IntentAssessmentReport v1 decision](../strategy/intent-assessment-report-v1-decision.md)
- [Intent Capability Spine Integration Review](../strategy/intent-capability-spine-integration-review.md)
- [RuntimeGraphDriftReport artifact](runtime-graph-drift-report.md)
- [HandoffCoverageReport artifact](handoff-coverage-report.md)
- [StepCapabilityGraph artifact](step-capability-graph.md)
- [WorkOrder artifact](work-order.md)
- [VerificationResult artifact](verification-result.md)
- [Path freshness report artifact](path-freshness-report.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [IntentAssessmentReport safety review](../strategy/intent-assessment-report-safety-review.md) — declares IntentAssessmentReport v1 safe / stable as read-only readiness assessment (no blocker): assessment, not WorkOrder; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; RuntimeGraphDriftReport is an input to readiness, not the intent system itself; PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. Recommended next slice: PreparedIntentPlan v1 decision.

> See also: [PreparedIntentPlan v1 decision](../strategy/prepared-intent-plan-v1-decision.md) — selects Option B: PreparedIntentPlan v1 as an artifact-backed phase/gate preparation artifact generated from IntentAssessmentReport plus existing Rekon context. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan artifact](prepared-intent-plan.md) — the read-only phase/gate preparation generated from an IntentAssessmentReport plus the Rekon context spine, via `rekon intent prepare`. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan Approval / Proof Model Decision](../strategy/prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.

> Shipped (slice 83): PreparedIntentPlan v1 now carries the required approval/proof envelope — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. See [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) and [PreparedIntentPlan Approval / Proof Model Decision](../strategy/prepared-intent-plan-approval-proof-decision.md).

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](../strategy/prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](../strategy/intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](intent-status-report.md).

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](../strategy/intent-status-report-safety-review.md).

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](../strategy/intent-work-proof-handoff-decision.md).

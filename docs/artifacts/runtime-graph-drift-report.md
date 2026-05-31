# RuntimeGraphDriftReport

## Purpose

`RuntimeGraphDriftReport` is the fifth and final artifact in the staged
step / handoff / runtime graph spine. **RuntimeGraphDriftReport is
expected-vs-observed runtime graph drift, not runtime observation.** It
compares the four already-materialized graph artifacts —
`StepCapabilityGraph` (expected topology), `HandoffContract` (declared baton
policy), `HandoffCoverageReport` (declared-vs-observed coverage), and
`RuntimeGraphObservationReport` (observed runtime graph) — into per-divergence
drift rows.

**RuntimeGraphDriftReport is not HandoffCoverageReport.** Coverage
interprets observed events against declared policy and emits coverage
verdicts; this artifact compares the *expected/declared* graph surfaces
against the *observed* runtime graph and reports divergence.
**RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
freshness** — freshness is source/artifact currency, while runtime graph
drift is observed runtime topology divergence.

## What It Does Not Do

v1 compares materialized artifacts only:

- **RuntimeGraphDriftReport v1 does not read raw handoff event logs
  directly** — `RuntimeGraphObservationReport` owns raw observation parsing.
- **RuntimeGraphDriftReport v1 does not create WorkOrder /
  VerificationPlan**.
- **Intent implementation remains deferred** and it gates nothing.
- It re-evaluates no coverage, marks no execution readiness, and mutates no
  upstream artifact.

## Produced By

- `@rekon/capability-model.buildRuntimeGraphDriftReport`
- the `rekon runtime graph drift` CLI command

## Inputs

- `StepCapabilityGraph` — expected workflow topology.
- `HandoffContract` — declared baton policy.
- `HandoffCoverageReport` — declared-vs-observed coverage rows (the primary
  declared-vs-observed handoff axis).
- `RuntimeGraphObservationReport` — observed runtime graph (nodes/edges).

All four are read as already-materialized Rekon artifacts (latest or
pinned). v1 **does not read** `.rekon/handoff-events.jsonl`; it never parses
raw runtime event files; it mutates nothing.

## Drift Model

| Status | Meaning |
| --- | --- |
| in-sync | expected and observed runtime graph align |
| missing-expected | expected runtime edge absent from observation |
| added-observed | observed edge/event absent from declared expectations |
| uncovered-handoff | declared handoff not observed |
| unresolved-contract | handoff contract unresolved |
| observation-missing | observation artifact absent or empty |
| not-evaluated | insufficient inputs |

Each `RuntimeGraphDriftRow` carries `id`, `kind`
(`step-edge`/`handoff`/`coverage`/`observation`/`contract`), `status`,
`severity` (`low`/`medium`/`high`), `message`, optional `stepId` /
`fromStepId` / `toStepId` / `handoffId` / `coverageRowId` / `observedEdgeId`,
optional `expectedRef` / `observedRef`, and `evidenceRefs` citing the
compared artifacts (no raw payloads are copied).

## V1 Drift Policy

1. If `RuntimeGraphObservationReport` is absent or has no observed graph,
   emit `observation-missing` rows rather than false drift.
2. `HandoffCoverageReport` `covered` → `in-sync`; `uncovered` →
   `uncovered-handoff`; `unresolved-contract` → `unresolved-contract`;
   `added-observed` → `added-observed`; `not-evaluated` → `not-evaluated`.
3. Observed `handoff` edges not represented in `HandoffContract` and not
   already represented by a coverage `added-observed` row → `added-observed`.
4. Declared `HandoffContract` handoffs with no coverage row (observation
   present) → `missing-expected`.
5. Missing inputs emit `not-evaluated` / `observation-missing` rows rather
   than crashing.

## Severity Policy

| Status | Severity |
| --- | --- |
| missing-expected | high |
| uncovered-handoff | high |
| unresolved-contract | medium |
| added-observed | medium |
| observation-missing | low |
| not-evaluated | low |
| in-sync | low |

## Shape

- `source` — `stepCapabilityGraphRef?`, `handoffContractRef?`,
  `handoffCoverageReportRef?`, `runtimeGraphObservationReportRef?` (no raw
  event-log path).
- `summary` — `total`, `inSync`, `missingExpected`, `addedObserved`,
  `uncoveredHandoff`, `unresolvedContract`, `observationMissing`,
  `notEvaluated`, `bySeverity` (all recomputed from `rows`).
- `rows[]` — the drift rows above, sorted by `(kind, status, id)`.

## CLI Surface

```sh
rekon runtime graph drift [--root <path>] [--json]
rekon runtime graph drift [--step-graph <ref>] [--handoff-contract <ref>] [--handoff-coverage-report <ref>] [--runtime-observation-report <ref>] [--json]
```

Reads the latest (or pinned) `StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, and `RuntimeGraphObservationReport`, writes a
`RuntimeGraphDriftReport` under `.rekon/artifacts/actions/`, and prints a
summary stating that no `WorkOrder` or `VerificationPlan` artifacts were
created.

## Boundary Summary

- **RuntimeGraphDriftReport is expected-vs-observed runtime graph drift, not
  runtime observation.**
- **RuntimeGraphDriftReport is not HandoffCoverageReport.**
- **RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
  freshness.**
- RuntimeGraphDriftReport v1 does not read raw handoff event logs directly.
- RuntimeGraphDriftReport v1 does not create WorkOrder / VerificationPlan.
- Intent implementation remains deferred.

## Cross-References

- [Runtime graph drift concept](../concepts/runtime-graph-drift.md)
- [RuntimeGraphDriftReport v1 decision](../strategy/runtime-graph-drift-report-v1-decision.md)
- [RuntimeGraphObservationReport artifact](runtime-graph-observation-report.md)
- [HandoffCoverageReport artifact](handoff-coverage-report.md)
- [HandoffContract artifact](handoff-contract.md)
- [StepCapabilityGraph artifact](step-capability-graph.md)
- [Path freshness report artifact](path-freshness-report.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [RuntimeGraphDriftReport safety review](../strategy/runtime-graph-drift-report-safety-review.md) — declares RuntimeGraphDriftReport v1 safe / stable as expected-vs-observed runtime graph drift (not runtime observation; not HandoffCoverageReport; not PathFreshnessReport or artifact lineage freshness): reads no raw handoff event logs, re-evaluates no coverage, creates no WorkOrder / VerificationPlan, implements no intent. The classic step/handoff/runtime-drift spine is now complete enough to unblock intent architecture work. Next: Intent Capability Spine Integration Review.

> See also: [Intent Capability Spine Integration Review](../strategy/intent-capability-spine-integration-review.md) — maps the classic intent surfaces (intent:assess / intent:prepare / intent:go / intent:status) onto the Rekon artifact spine: assess → IntentAssessmentReport, prepare → PreparedIntentPlan, status → IntentStatusReport, go deferred. Selects Option B (staged intent artifact spine); first target IntentAssessmentReport v1 decision. Classic intent did not consume the step/handoff/runtime-graph/drift spine; Rekon intent extends parity by wiring StepCapabilityGraph, HandoffContract, HandoffCoverageReport, RuntimeGraphObservationReport, and RuntimeGraphDriftReport into intent readiness. No intent implemented, no artifact registered, no CLI command, no source writes.

> See also: [IntentAssessmentReport v1 decision](../strategy/intent-assessment-report-v1-decision.md) — selects Option B: IntentAssessmentReport v1 as an artifact-backed readiness assessment generated from a user request plus existing Rekon context artifacts (CapabilityMap v2, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult when available). Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context; blocker categories missing-artifact / stale-context / runtime-drift / handoff-coverage / finding-governance / proof-missing / scope-ambiguous / source-write-unavailable. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. No artifact implemented or registered; no CLI; no source writes.

> See also: [IntentAssessmentReport artifact](intent-assessment-report.md) — the read-only readiness assessment of a user request against the Rekon context spine (CapabilityMap, StepCapabilityGraph, HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult), via `rekon intent assess`. Readiness: ready-for-prepare / blocked / needs-review / insufficient-context / stale-context. IntentAssessmentReport is assessment, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. RuntimeGraphDriftReport is an input to readiness, not the intent system itself. PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred.

> See also: [IntentAssessmentReport safety review](../strategy/intent-assessment-report-safety-review.md) — declares IntentAssessmentReport v1 safe / stable as read-only readiness assessment (no blocker): assessment, not WorkOrder; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; RuntimeGraphDriftReport is an input to readiness, not the intent system itself; PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. Recommended next slice: PreparedIntentPlan v1 decision.

> See also: [PreparedIntentPlan v1 decision](../strategy/prepared-intent-plan-v1-decision.md) — selects Option B: PreparedIntentPlan v1 as an artifact-backed phase/gate preparation artifact generated from IntentAssessmentReport plus existing Rekon context. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan artifact](prepared-intent-plan.md) — the read-only phase/gate preparation generated from an IntentAssessmentReport plus the Rekon context spine, via `rekon intent prepare`. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan Approval / Proof Model Decision](../strategy/prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](../strategy/prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](../strategy/intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](intent-status-report.md).

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](../strategy/intent-status-report-safety-review.md).

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](../strategy/intent-work-proof-handoff-decision.md).

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](../strategy/intent-work-order-handoff-decision.md).

> Reviewed (slice 91): the Intent WorkOrder handoff is safe/stable as an explicit gated WorkOrder generator — `rekon intent work-order generate` requires a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck); the blocked path writes no `WorkOrder`, and the generated path writes exactly one `WorkOrder` that traces back to the plan. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; WorkOrder generation creates no `VerificationPlan` / `VerificationRun` / `VerificationResult`, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Decision. See [Intent WorkOrder Handoff Safety Review](../strategy/intent-work-order-handoff-safety-review.md).

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](../strategy/intent-verification-plan-handoff-decision.md).

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](../concepts/intent-verification-plan-handoff.md).

> Reviewed (slice 94): the Intent VerificationPlan handoff is safe/stable as an explicit gated VerificationPlan generator — `rekon intent verification-plan generate` requires a proof-approved `PreparedIntentPlan` with non-empty verification requirements (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, blocks unsafe / ambiguous commands, and writes exactly one `VerificationPlan` on pass; the blocked path writes none. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Plan bundle / LLM-agent handoff directory work is deferred to the next phase. Next: Intent Plan Bundle / Agent Handoff Directory Decision. See [Intent VerificationPlan Handoff Safety Review](../strategy/intent-verification-plan-handoff-safety-review.md).

> Decided (slice 95): intent plan bundles project canonical artifacts into a repo-local `.rekon/intent/plans/<intent-id>/` directory (human-readable root files + agent handoff files under `agent/`), generated as a regenerable projection with a `manifest.json` recording source artifact refs / digests / staleness. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; agent handoff files live under `agent/`; bundle generation executes no commands, writes no source files, and implements no intent:go; stale bundles must not be treated as current handoff. Next: Intent Plan Bundle / Agent Handoff Implementation. See [Intent Plan Bundle / Agent Handoff Directory Decision](../strategy/intent-plan-bundle-agent-handoff-directory-decision.md).

> Shipped (slice 96): the Intent plan bundle generator shipped — `rekon intent bundle write` projects the canonical intent artifacts into a regenerable human + LLM-agent handoff bundle under `.rekon/intent/plans/<intent-id>/` (manifest + human files + `agent/` files), recording source refs / digests / staleness. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation executes no commands, writes no source files outside the bundle directory, creates no canonical artifacts, and does not implement intent:go; stale bundles must not be treated as current handoff. Next: Intent Plan Bundle / Agent Handoff Safety Review. See [intent plan bundle](../concepts/intent-plan-bundle.md).

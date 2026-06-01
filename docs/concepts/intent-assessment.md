# Intent Assessment

Intent assessment answers the question the staged Rekon intent spine opens
with: *is this requested change ready to be prepared?* `IntentAssessmentReport`
is the artifact that answers it, by reading a user request against the
already-materialized Rekon context spine and emitting a readiness verdict.

## Assessment, Not WorkOrder

**IntentAssessmentReport is assessment, not WorkOrder.** A `WorkOrder` is
implementation guidance produced *after* preparation; assessment decides
scope, readiness, and blockers *before* it. The two never overlap: assessment
captures request / scope / readiness / blockers / missing context, while
guidance and proof live in `WorkOrder`, `VerificationPlan`, and
`VerificationResult`.

## An Input To Readiness, Not The Intent System

**RuntimeGraphDriftReport is an input to readiness, not the intent system
itself.** Drift, handoff coverage, runtime observation, and source freshness
are *consumed* as readiness signals. A high-severity drift row, an
`uncovered-handoff`, an `observation-missing`, a failed proof, or a stale
request-relevant path makes the assessment surface a blocker or warning rather
than claim readiness — but assessment never re-evaluates or mutates those
inputs.

## What It Reads, What It Emits

The assessment reads the request plus the latest `CapabilityMap`,
`StepCapabilityGraph`, `HandoffCoverageReport`, `RuntimeGraphDriftReport`,
`PathFreshnessReport`, and `VerificationResult` when available. It emits a
readiness status (`ready-for-prepare` / `blocked` / `needs-review` /
`insufficient-context` / `stale-context`), blockers, warnings, missing
context, matched context, and a recommended next action. It reads no raw
source or event files and writes nothing but the report.

## Boundaries

Assessment is the front of the intent spine, and it stays a read-only report:

- **IntentAssessmentReport does not create WorkOrder or VerificationPlan.**
- **IntentAssessmentReport does not execute commands.**
- **IntentAssessmentReport does not write source files.**
- **PreparedIntentPlan remains the next layer after assessment.**
- **IntentStatusReport remains deferred.**
- **intent:go remains deferred.**

Preparation, status reporting, and execution are downstream,
separately-decided layers.

## Cross-References

- [IntentAssessmentReport artifact](../artifacts/intent-assessment-report.md)
- [IntentAssessmentReport v1 decision](../strategy/intent-assessment-report-v1-decision.md)
- [Intent Capability Spine Integration Review](../strategy/intent-capability-spine-integration-review.md)
- [Runtime graph drift concept](runtime-graph-drift.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [IntentAssessmentReport safety review](../strategy/intent-assessment-report-safety-review.md) — declares IntentAssessmentReport v1 safe / stable as read-only readiness assessment (no blocker): assessment, not WorkOrder; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; RuntimeGraphDriftReport is an input to readiness, not the intent system itself; PreparedIntentPlan remains the next layer; IntentStatusReport and intent:go remain deferred. Recommended next slice: PreparedIntentPlan v1 decision.

> See also: [PreparedIntentPlan v1 decision](../strategy/prepared-intent-plan-v1-decision.md) — selects Option B: PreparedIntentPlan v1 as an artifact-backed phase/gate preparation artifact generated from IntentAssessmentReport plus existing Rekon context. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) — the read-only phase/gate preparation generated from an IntentAssessmentReport plus the Rekon context spine, via `rekon intent prepare`. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan Approval / Proof Model Decision](../strategy/prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.

> Shipped (slice 83): PreparedIntentPlan v1 now carries the required approval/proof envelope — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. See [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) and [PreparedIntentPlan Approval / Proof Model Decision](../strategy/prepared-intent-plan-approval-proof-decision.md).

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](../strategy/prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](../strategy/intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](../artifacts/intent-status-report.md).

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](../strategy/intent-status-report-safety-review.md).

> Shipped (slice 90): the Intent WorkOrder handoff generator shipped — `rekon intent work-order generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck) and writes exactly one `WorkOrder` (`source: "intent-handoff"`) that traces back to the plan / status / assessment refs and the phase / obligation / verification-requirement ids. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; it creates no `VerificationPlan`, executes no commands, and writes no source files; intent:go remains deferred. See [intent WorkOrder handoff](./intent-work-order-handoff.md).

> Fixed (slice 113) / Reviewed (slice 114): a fresh repo prepares the intent-assessment context with `rekon intent context prepare` (after `rekon scan`), which builds the `StepCapabilityGraph` + runtime / handoff context this report reads — so `rekon intent assess` is no longer blocked by missing `StepCapabilityGraph` / `RuntimeGraphDriftReport` on a fresh repo, and reports `needs-review` with honest warnings rather than `blocked`. Missing runtime / handoff evidence is recorded as not-evaluated / observation-missing, not false success. The [Fresh Repo Intent Readiness Safety Review](../strategy/fresh-repo-intent-readiness-safety-review.md) confirmed this path is safe/stable; `rekon scan` / `rekon refresh` and the assess severity policy are unchanged, Rekon runs no Circe and writes no source, and intent:go remains deferred.

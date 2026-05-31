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

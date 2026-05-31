# Prepared Intent Plan

Prepared intent planning answers the second question of the staged Rekon intent
spine: *given a safe assessment, what are the planned phases, obligations, and
verification requirements?* `PreparedIntentPlan` is the artifact that answers
it, by reading an `IntentAssessmentReport` against the already-materialized
Rekon context spine.

## Preparation, Not Implementation Guidance

**PreparedIntentPlan is phase/gate preparation, not WorkOrder.** A `WorkOrder`
is implementation guidance produced *after* preparation; the prepared plan
structures phases and obligations *before* it and can feed a later `WorkOrder`
slice. The two never overlap — preparation never produces work guidance, proof
plans, command runs, or source writes.

## Requirements, Not Proof Plans

**Verification requirements are not VerificationPlan.** A prepared plan proposes
what would need to be proven if the work were carried out — typecheck, test,
build, or "document findings" — as requirements with optional suggested
commands. It never materializes a `VerificationPlan`, never runs a command, and
never creates a `VerificationRun` or `VerificationResult`. **Verification
requirements are proof obligations, not VerificationPlan.**

## Approval, Not Just Generation

**PreparedIntentPlan must be proof-approved, not merely generated.** A generated
plan is not authorized just because the assessment was `ready-for-prepare`: the
plan carries a required `approval` envelope — `approval.status`,
authorizing/blocking `approval.reasons`, an `approval.proof` record, and
`approval.blockers` — and **PreparedIntentPlan.status.value can be prepared only
when approval.status is approved.** **A plan with phases but without approval is
not prepared.** The proof re-checks assessment readiness, required context,
runtime drift, handoff coverage, freshness, verification requirements/results,
plan structure, and the downstream handoff (with `sourceWriteAllowed` fixed at
`false`); high-severity unresolved drift, uncovered/unresolved handoff coverage,
and stale freshness each block approval. `explicit-operator-approval` and
`manual-risk-acceptance` are reserved reasons — preparation invents no override
behavior in v1.

## What It Reads, What It Emits

The plan reads the assessment plus the latest `CapabilityMap`,
`StepCapabilityGraph`, `HandoffCoverageReport`, `RuntimeGraphDriftReport`,
`PathFreshnessReport`, and `VerificationResult` when available. It emits a
prepared status (`prepared` / `blocked` / `needs-review` / `stale-assessment` /
`insufficient-assessment`), phases, obligations, verification requirements,
blocked reasons, and a recommended next action. It reads no raw source or event
files and writes nothing but the plan.

## Boundaries

Preparation is the middle of the intent spine, and it stays a read-only plan:

- **PreparedIntentPlan does not create WorkOrder or VerificationPlan.**
- **PreparedIntentPlan does not execute commands.**
- **PreparedIntentPlan does not write source files.**
- **IntentStatusReport remains the next layer after preparation.**
- **intent:go remains deferred.**
- **Source-write behavior remains unavailable.**

Status reporting and execution are downstream, separately-decided layers.

## Cross-References

- [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md)
- [PreparedIntentPlan v1 decision](../strategy/prepared-intent-plan-v1-decision.md)
- [Intent assessment concept](intent-assessment.md)
- [IntentAssessmentReport safety review](../strategy/intent-assessment-report-safety-review.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [PreparedIntentPlan Approval / Proof Model Decision](../strategy/prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.

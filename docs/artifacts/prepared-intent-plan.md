# PreparedIntentPlan

## Purpose

`PreparedIntentPlan` is the second artifact of the staged Rekon intent spine,
the layer after `IntentAssessmentReport`. It is a **read-only phase/gate
preparation artifact** generated from an `IntentAssessmentReport` plus the
existing Rekon context spine. It turns a safe assessment into planned
implementation phases, touched paths, capability / step / handoff / drift
obligations, preservation constraints, and proposed verification requirements.

**PreparedIntentPlan is phase/gate preparation, not WorkOrder.** It consumes
already-materialized Rekon artifacts and mutates none of them. **Verification
requirements are not VerificationPlan** — they describe what would need to be
proven, not a proof command artifact.

## What It Does Not Do

v1 prepares phases and obligations only:

- **PreparedIntentPlan does not create WorkOrder or VerificationPlan.**
- **PreparedIntentPlan does not execute commands.**
- **PreparedIntentPlan does not write source files.**
- It prepares no work guidance, runs nothing, and triggers no generation of its
  input artifacts.

`IntentStatusReport` remains the next layer after preparation; `intent:go`
remains deferred; source-write behavior remains unavailable.

## Produced By

- `@rekon/capability-model.buildPreparedIntentPlan`
- the `rekon intent prepare` CLI command

## Inputs

`IntentAssessmentReport` is required. All inputs are read as already-materialized
Rekon artifacts (latest or pinned) cited by `ArtifactRef`; the generator reads
values, never raw source or event files, and mutates nothing.

| Input | V1 Decision |
| --- | --- |
| IntentAssessmentReport | required |
| CapabilityMap v2 | consumed when available |
| StepCapabilityGraph | consumed through assessment/source refs |
| HandoffCoverageReport | consumed when available |
| RuntimeGraphDriftReport | consumed when available |
| PathFreshnessReport | consumed when available |
| VerificationResult | consumed when available |
| WorkOrder | not input to v1 |

## Prepared Status Model

| Prepared Status | Meaning |
| --- | --- |
| prepared | safe to create downstream work guidance |
| blocked | blocker prevents preparation |
| needs-review | review needed before work guidance |
| stale-assessment | assessment or context is stale |
| insufficient-assessment | assessment lacks scope/context |

`status` carries a `recommendedNextAction` (`create-work-order` /
`resolve-blockers` / `refresh-context` / `human-review` / `run-assessment` /
`defer`). The assessment's readiness drives the prepared status:
`ready-for-prepare` → `prepared`, `blocked` → `blocked`, `needs-review` →
`needs-review`, `insufficient-context` → `insufficient-assessment`,
`stale-context` → `stale-assessment`. `create-work-order` is recommended only
when status is `prepared` — and it is a recommendation, not a `WorkOrder`.

## Phase Model

Phases structure planned work without performing it: `id`, `title`, `kind`
(`investigate` / `modify` / `refactor` / `verify` / `review`), `status`
(`planned` / `blocked` / `needs-review`), `goal`, `paths`, `systems`,
`capabilities`, `steps`, `constraints`, `obligations`,
`verificationRequirements`, `sourceRefs`. A `prepared` plan emits
`investigate` + (`modify` for bug/feature/migration, `refactor` for refactor) +
`verify` + `review`; investigation/unknown emit `investigate` + `review`. A
`needs-review` plan emits a single `review` phase; `blocked` /
`stale-assessment` / `insufficient-assessment` emit no implementation phases.

## Obligation Model

Obligations record what preparation must preserve or satisfy (`id`, `category`,
`severity`, `message`, optional `sourceRefs`). Categories:
`capability-preservation` / `step-preservation` / `handoff-preservation` /
`runtime-drift` / `finding-governance` / `freshness` / `verification` /
`source-write-boundary`. A `source-write-boundary` obligation is always present.
`blockedReasons` reuse the same shape to explain a non-`prepared` status. Each
list is deterministically ordered by severity (high first), category, then id.

## Verification Requirement Model

`verificationRequirements` express what would need to be proven if the work were
carried out — requirements, not a proof artifact. Each carries `id`, an optional
suggested `command`, a `reason`, and optional `sourceRefs`. **Verification
requirements are not VerificationPlan**: the generator materializes no
`VerificationPlan`, executes no command, and creates no `VerificationRun` /
`VerificationResult`.

## Shape

- `source` — `intentAssessmentReportRef` (required) + optional context refs.
- `request` — `goal`, `kind`, optional `scope`.
- `status` — `value`, `recommendedNextAction`.
- `phases[]` / `obligations[]` / `verificationRequirements[]` /
  `blockedReasons[]`.

## CLI Surface

```sh
rekon intent prepare --assessment <IntentAssessmentReport:id|type:id> [--root <path>] [--json]
rekon intent prepare --assessment <ref> [--capability-map <ref>] [--step-graph <ref>] [--handoff-coverage-report <ref>] [--runtime-observation-report <ref>] [--runtime-drift-report <ref>] [--path-freshness-report <ref>] [--verification-result <ref>]
```

Reads the required `IntentAssessmentReport` and the latest available context,
writes a `PreparedIntentPlan` under `.rekon/artifacts/actions/`, and prints a
status summary. It creates no `WorkOrder` / `VerificationPlan`, executes no
commands, and writes no source files.

## Boundary Summary

- **PreparedIntentPlan is phase/gate preparation, not WorkOrder.**
- **PreparedIntentPlan does not create WorkOrder or VerificationPlan.**
- **PreparedIntentPlan does not execute commands.**
- **PreparedIntentPlan does not write source files.**
- **Verification requirements are not VerificationPlan.**
- IntentStatusReport remains the next layer after preparation.
- intent:go remains deferred.
- Source-write behavior remains unavailable.

## Cross-References

- [Prepared intent plan concept](../concepts/prepared-intent-plan.md)
- [PreparedIntentPlan v1 decision](../strategy/prepared-intent-plan-v1-decision.md)
- [IntentAssessmentReport artifact](intent-assessment-report.md)
- [IntentAssessmentReport safety review](../strategy/intent-assessment-report-safety-review.md)
- [WorkOrder artifact](work-order.md)
- [VerificationPlan artifact](verification-plan.md)
- [RuntimeGraphDriftReport artifact](runtime-graph-drift-report.md)
- [Path freshness report artifact](path-freshness-report.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [PreparedIntentPlan Approval / Proof Model Decision](../strategy/prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.

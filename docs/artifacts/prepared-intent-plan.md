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

**PreparedIntentPlan must be proof-approved, not merely generated.** v1 carries a
required `approval` envelope with an `approval.status`, authorizing/blocking
`approval.reasons`, an `approval.proof` record, and `approval.blockers`.
**PreparedIntentPlan.status.value can be prepared only when approval.status is
approved.** **A plan with phases but without approval is not prepared.**
**Verification requirements are proof obligations, not VerificationPlan.**

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

## Approval / Proof Envelope

`approval` is required. It records whether preparation is authorized and the
proof behind that decision:

- `approval.status` — `approved` / `not-approved` / `needs-review`.
- `approval.reasons` — authorizing reasons (`assessment-ready-for-prepare`,
  `explicit-operator-approval`, `intake-sufficient`, `manual-risk-acceptance`)
  and blocking reasons (`blocked-assessment`, `stale-assessment`,
  `insufficient-context`, `runtime-drift-unresolved`,
  `handoff-coverage-unresolved`, `verification-proof-missing`).
- `approval.proof` — an evidence record that re-checks assessment readiness,
  required context, runtime drift, handoff coverage, freshness, verification
  requirements/results, plan structure, and the downstream handoff. Its
  `intentAssessmentReportRef` cites the source assessment, and
  `downstreamHandoff.sourceWriteAllowed` is the literal `false`.
- `approval.blockers` — `PreparedIntentObligation` entries derived from blocking
  reasons; reused as `blockedReasons` when the plan is not prepared.

The helper downgrades the prepared status from the FINAL approval decision:
`ready-for-prepare` + `approved` → `prepared`; `ready-for-prepare` +
`needs-review` → `needs-review`; `ready-for-prepare` + `not-approved` →
`blocked`. High-severity unresolved runtime drift, uncovered / unresolved
handoff coverage, and stale freshness each block approval; an unknown-kind
request requires review unless an explicit operator approval reason is present
(`explicit-operator-approval` / `intake-sufficient` / `manual-risk-acceptance`
are reserved in v1). `explicit-operator-approval` and `manual-risk-acceptance`
are reserved reasons; the CLI invents no override behavior.

**PreparedIntentPlan must be proof-approved, not merely generated.**
**PreparedIntentPlan.status.value can be prepared only when approval.status is
approved.** **A plan with phases but without approval is not prepared.**

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
requirements are proof obligations, not VerificationPlan**: the generator
materializes no `VerificationPlan`, executes no command, and creates no
`VerificationRun` / `VerificationResult`. **Verification requirements are not
VerificationPlan.** Implementation-bearing prepared plans must carry verification
requirements and a `verify` phase, recorded in `approval.proof.verification` and
`approval.proof.planStructure`.

## Shape

- `source` — `intentAssessmentReportRef` (required) + optional context refs.
- `request` — `goal`, `kind`, optional `scope`.
- `status` — `value`, `recommendedNextAction`.
- `approval` — `status`, `reasons[]`, `proof`, `blockers[]` (required).
- `phases[]` / `obligations[]` / `verificationRequirements[]` /
  `blockedReasons[]`.

## CLI Surface

```sh
rekon intent prepare --assessment <IntentAssessmentReport:id|type:id> [--root <path>] [--json]
rekon intent prepare --assessment <ref> [--capability-map <ref>] [--step-graph <ref>] [--handoff-coverage-report <ref>] [--runtime-observation-report <ref>] [--runtime-drift-report <ref>] [--path-freshness-report <ref>] [--verification-result <ref>]
```

Reads the required `IntentAssessmentReport` and the latest available context —
including runtime drift, handoff coverage, freshness, and verification-result
VALUES so approval proof can re-check them — writes a `PreparedIntentPlan` under
`.rekon/artifacts/actions/`, and prints a status summary that includes
`Approval:` and `Approval reasons:` (and `approval.status` / `approval.reasons`
in `--json`). It creates no `WorkOrder` / `VerificationPlan`, executes no
commands, and writes no source files.

## Boundary Summary

- **PreparedIntentPlan must be proof-approved, not merely generated.**
- **PreparedIntentPlan.status.value can be prepared only when approval.status is approved.**
- **A plan with phases but without approval is not prepared.**
- **PreparedIntentPlan is phase/gate preparation, not WorkOrder.**
- **PreparedIntentPlan does not create WorkOrder or VerificationPlan.**
- **PreparedIntentPlan does not execute commands.**
- **PreparedIntentPlan does not write source files.**
- **Verification requirements are not VerificationPlan.**
- **Verification requirements are proof obligations, not VerificationPlan.**
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

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](../strategy/prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](../strategy/intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](intent-status-report.md).

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](../strategy/intent-status-report-safety-review.md).

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](../strategy/intent-work-proof-handoff-decision.md).

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](../strategy/intent-work-order-handoff-decision.md).

> Shipped (slice 90): the Intent WorkOrder handoff generator shipped — `rekon intent work-order generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck) and writes exactly one `WorkOrder` (`source: "intent-handoff"`) that traces back to the plan / status / assessment refs and the phase / obligation / verification-requirement ids. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; it creates no `VerificationPlan`, executes no commands, and writes no source files; intent:go remains deferred. See [intent WorkOrder handoff](../concepts/intent-work-order-handoff.md).

> Reviewed (slice 91): the Intent WorkOrder handoff is safe/stable as an explicit gated WorkOrder generator — `rekon intent work-order generate` requires a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck); the blocked path writes no `WorkOrder`, and the generated path writes exactly one `WorkOrder` that traces back to the plan. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; WorkOrder generation creates no `VerificationPlan` / `VerificationRun` / `VerificationResult`, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Decision. See [Intent WorkOrder Handoff Safety Review](../strategy/intent-work-order-handoff-safety-review.md).

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](../strategy/intent-verification-plan-handoff-decision.md).

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](../concepts/intent-verification-plan-handoff.md).

> Reviewed (slice 94): the Intent VerificationPlan handoff is safe/stable as an explicit gated VerificationPlan generator — `rekon intent verification-plan generate` requires a proof-approved `PreparedIntentPlan` with non-empty verification requirements (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, blocks unsafe / ambiguous commands, and writes exactly one `VerificationPlan` on pass; the blocked path writes none. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Plan bundle / LLM-agent handoff directory work is deferred to the next phase. Next: Intent Plan Bundle / Agent Handoff Directory Decision. See [Intent VerificationPlan Handoff Safety Review](../strategy/intent-verification-plan-handoff-safety-review.md).

> Decided (slice 95): intent plan bundles project canonical artifacts into a repo-local `.rekon/intent/plans/<intent-id>/` directory (human-readable root files + agent handoff files under `agent/`), generated as a regenerable projection with a `manifest.json` recording source artifact refs / digests / staleness. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; agent handoff files live under `agent/`; bundle generation executes no commands, writes no source files, and implements no intent:go; stale bundles must not be treated as current handoff. Next: Intent Plan Bundle / Agent Handoff Implementation. See [Intent Plan Bundle / Agent Handoff Directory Decision](../strategy/intent-plan-bundle-agent-handoff-directory-decision.md).

> Shipped (slice 96): the Intent plan bundle generator shipped — `rekon intent bundle write` projects the canonical intent artifacts into a regenerable human + LLM-agent handoff bundle under `.rekon/intent/plans/<intent-id>/` (manifest + human files + `agent/` files), recording source refs / digests / staleness. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation executes no commands, writes no source files outside the bundle directory, creates no canonical artifacts, and does not implement intent:go; stale bundles must not be treated as current handoff. Next: Intent Plan Bundle / Agent Handoff Safety Review. See [intent plan bundle](../concepts/intent-plan-bundle.md).

> Reviewed (slice 97): the Intent plan bundle generator is safe/stable as a human + LLM-agent filesystem projection — `rekon intent bundle write` writes the bundle only under `.rekon/intent/plans/<intent-id>/` with path-traversal safety on the intent id and every file path. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation creates no canonical artifacts, executes no commands, and writes no source files; stale bundles must not be treated as current handoff; intent:go remains deferred. Next: Intent Go / Execution Boundary Decision. See [Intent Plan Bundle / Agent Handoff Safety Review](../strategy/intent-plan-bundle-agent-handoff-safety-review.md).

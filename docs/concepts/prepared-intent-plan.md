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

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](../strategy/prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](../strategy/intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](../artifacts/intent-status-report.md).

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](../strategy/intent-status-report-safety-review.md).

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](../strategy/intent-work-proof-handoff-decision.md).

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](../strategy/intent-work-order-handoff-decision.md).

> Shipped (slice 90): the Intent WorkOrder handoff generator shipped — `rekon intent work-order generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck) and writes exactly one `WorkOrder` (`source: "intent-handoff"`) that traces back to the plan / status / assessment refs and the phase / obligation / verification-requirement ids. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; it creates no `VerificationPlan`, executes no commands, and writes no source files; intent:go remains deferred. See [intent WorkOrder handoff](./intent-work-order-handoff.md).

> Reviewed (slice 91): the Intent WorkOrder handoff is safe/stable as an explicit gated WorkOrder generator — `rekon intent work-order generate` requires a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck); the blocked path writes no `WorkOrder`, and the generated path writes exactly one `WorkOrder` that traces back to the plan. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; WorkOrder generation creates no `VerificationPlan` / `VerificationRun` / `VerificationResult`, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Decision. See [Intent WorkOrder Handoff Safety Review](../strategy/intent-work-order-handoff-safety-review.md).

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](../strategy/intent-verification-plan-handoff-decision.md).

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](./intent-verification-plan-handoff.md).

> Reviewed (slice 94): the Intent VerificationPlan handoff is safe/stable as an explicit gated VerificationPlan generator — `rekon intent verification-plan generate` requires a proof-approved `PreparedIntentPlan` with non-empty verification requirements (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, blocks unsafe / ambiguous commands, and writes exactly one `VerificationPlan` on pass; the blocked path writes none. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Plan bundle / LLM-agent handoff directory work is deferred to the next phase. Next: Intent Plan Bundle / Agent Handoff Directory Decision. See [Intent VerificationPlan Handoff Safety Review](../strategy/intent-verification-plan-handoff-safety-review.md).

> Decided (slice 95): intent plan bundles project canonical artifacts into a repo-local `.rekon/intent/plans/<intent-id>/` directory (human-readable root files + agent handoff files under `agent/`), generated as a regenerable projection with a `manifest.json` recording source artifact refs / digests / staleness. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; agent handoff files live under `agent/`; bundle generation executes no commands, writes no source files, and implements no intent:go; stale bundles must not be treated as current handoff. Next: Intent Plan Bundle / Agent Handoff Implementation. See [Intent Plan Bundle / Agent Handoff Directory Decision](../strategy/intent-plan-bundle-agent-handoff-directory-decision.md).

> Shipped (slice 96): the Intent plan bundle generator shipped — `rekon intent bundle write` projects the canonical intent artifacts into a regenerable human + LLM-agent handoff bundle under `.rekon/intent/plans/<intent-id>/` (manifest + human files + `agent/` files), recording source refs / digests / staleness. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation executes no commands, writes no source files outside the bundle directory, creates no canonical artifacts, and does not implement intent:go; stale bundles must not be treated as current handoff. Next: Intent Plan Bundle / Agent Handoff Safety Review. See [intent plan bundle](./intent-plan-bundle.md).

> Reviewed (slice 97): the Intent plan bundle generator is safe/stable as a human + LLM-agent filesystem projection — `rekon intent bundle write` writes the bundle only under `.rekon/intent/plans/<intent-id>/` with path-traversal safety on the intent id and every file path. **Intent plan bundle is a projection, not canonical artifact truth**; canonical source of truth remains `.rekon/artifacts/`; bundle generation creates no canonical artifacts, executes no commands, and writes no source files; stale bundles must not be treated as current handoff; intent:go remains deferred. Next: Intent Go / Execution Boundary Decision. See [Intent Plan Bundle / Agent Handoff Safety Review](../strategy/intent-plan-bundle-agent-handoff-safety-review.md).

> Fixed (slice 113) / Reviewed (slice 114): on a fresh repo, run `rekon intent context prepare` after `rekon scan` to build the intent-readiness context (`StepCapabilityGraph` + runtime / handoff context, recorded as not-evaluated where there is no event log) before preparing a plan — the public sequence `rekon scan → rekon intent context prepare → rekon intent assess → … → rekon intent bundle write` then works with no manual `.rekon/artifacts` seeding. The [Fresh Repo Intent Readiness Safety Review](../strategy/fresh-repo-intent-readiness-safety-review.md) confirmed this path is safe/stable; `rekon scan` / `rekon refresh` are unchanged, missing runtime evidence stays not-evaluated (not false success), Rekon runs no Circe and writes no source, and intent:go remains deferred.

> Fixed (slice 121): a needs-review PreparedIntentPlan with zero hard blockers is now an implementation-bearing **draft** — `rekon intent prepare` emits investigate / modify (or refactor) / verify / review phases plus safe verification requirements derived from `package.json` scripts (attached to the implementation + verify phases), instead of a bare `phase:review`. The draft stays `needs-review` (approval is never auto-elevated); WorkOrder / VerificationPlan generation remain blocked until explicit approval; no commands execute, no VerificationRun / VerificationResult is created, no source is written, and `intent:go` remains deferred. See [Intent Prepare Needs-Review Planfulness Fix](../strategy/intent-prepare-needs-review-planfulness.md).

> Decided (slice 122): the explicit operator approval path is pinned — **Intent Operator Approval / Proof Acceptance Decision** selects a new approved `PreparedIntentPlan` revision (the source needs-review draft stays immutable). A future `rekon intent approve` rechecks freshness / drift / status and records the operator's accepted proof gaps (preferably at `approval.acceptedRisks`); approval is explicit (never auto-approved), enables but does not create the WorkOrder / VerificationPlan handoff, runs no commands, and writes no source. See [Intent Operator Approval / Proof Acceptance Decision](../strategy/intent-operator-approval-proof-acceptance-decision.md).

> Shipped (slice 123): a needs-review draft becomes approved through `rekon intent approve`, which
> writes a **new approved revision** (never mutating the draft) after the operator explicitly accepts
> the draft's known proof gaps. The approved revision records those acceptances as
> `approval.acceptedRisks[]` (each `{ id: accepted:<gap>, category, message, acceptedAt, acceptedBy?,
> reason, sourceRefs }`) — an additive, backward-compatible field; plans without it still validate.
> Accepted risks are evidence of an explicit human decision, not a substitute for proof. See
> [Intent Operator Approval / Proof Acceptance Implementation](../strategy/intent-operator-approval-proof-acceptance-implementation.md).

> Reviewed (slice 124): the `rekon intent approve` path that writes the approved revision (recording
> `approval.acceptedRisks[]`) was reviewed safe/stable in the
> [Intent Operator Approval / Proof Acceptance Safety Review](../strategy/intent-operator-approval-proof-acceptance-safety-review.md)
> — explicit approval, recorded (not erased) accepted gaps, immutable source draft, conservative
> rechecks, and `sourceWriteAllowed` false; approval creates no downstream artifacts.

> Decided (slice 125): once a plan is approved, a future `rekon intent status transition` writes a new
> work-ready `IntentStatusReport` revision (reading `approval.status`, `acceptedRisks`, and
> `downstreamHandoff.*`) so WorkOrder / VerificationPlan generation can move past
> `status-not-work-ready`. The approved plan is read, never mutated; the transition creates no
> downstream artifacts. See
> [Intent Status Work-Ready Transition Decision](../strategy/intent-status-work-ready-transition-decision.md).
>
> Shipped (slice 126): the transition is `rekon intent status transition` — see the
> [Intent Status Work-Ready Transition Implementation](../strategy/intent-status-work-ready-transition-implementation.md).
> Reviewed safe/stable (slice 127): see the
> [Intent Status Work-Ready Transition Safety Review](../strategy/intent-status-work-ready-transition-safety-review.md).

> Next (slice 128): a report-first `IntentPlanActionabilityReport` will sit before
> approval, normalizing a plan and reporting exactly what must change (objective /
> deliverables / acceptance criteria / touched paths / verification evidence / scope
> ambiguity / non-goals / evidence gates). See the
> [Classic Intent Plan Compiler / Elicitation Parity Decision](../strategy/classic-intent-plan-compiler-elicitation-parity-decision.md).
> Report-only; no plan mutation, no source writes, no command execution, no Circe.

> Shipped (slice 129): the report-first `IntentPlanActionabilityReport` shipped as
> `rekon intent plan review` — it normalizes a plan into phase drafts, evaluates actionability over
> eight per-phase requirements, and emits findings + elicitation questions + an operator-or-LLM revision
> prompt with status actionable / needs-revision / blocked. It is the intent plan compiler's front door,
> upstream of preparation/approval. **Report-only: it creates no PreparedIntentPlan, executes no
> commands, writes no source, runs no Circe, and does not implement intent:go** (boundaries forced +
> validated all-false); answer / merge-back and approval remain deferred. See the
> [IntentPlanActionabilityReport artifact](../artifacts/intent-plan-actionability-report.md) and the
> [intent plan compiler](./intent-plan-compiler.md).

> Reviewed (slice 130): the `IntentPlanActionabilityReport` / `rekon intent plan review` plan-compiler layer is safe/stable as read / transform / report-only — it reviews raw plans before approval, normalizes them into phase drafts, surfaces missing requirements as findings + questions, and emits an operator-or-LLM revision prompt, while creating no PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executing no commands, writing no source, and running no Circe; intent:go remains deferred. Next: Intent Prepare Integration With Actionability Report. See [Intent Plan Actionability Report Safety Review](../strategy/intent-plan-actionability-report-safety-review.md).

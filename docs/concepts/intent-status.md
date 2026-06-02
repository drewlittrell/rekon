# Intent Status

Intent status reporting answers the third question of the staged Rekon intent
spine: *given an assessment and a prepared plan, where does the intent currently
stand across work, proof, freshness, and drift?* `IntentStatusReport` is the
artifact that answers it, by reading the materialized intent / work / proof /
freshness / drift artifacts and rolling them up into a single status.

## Reporting, Not Acting

**IntentStatusReport is status reporting, not VerificationResult.** It reports
the *outcome* recorded by other artifacts; it never runs verification, creates
work, or executes anything. **IntentStatusReport is not WorkOrder** — a
`WorkOrder` is implementation guidance, while the status report is a read-only
rollup that may *recommend* creating one. **IntentStatusReport does not create
WorkOrder or VerificationPlan.** **IntentStatusReport does not execute
commands.** **IntentStatusReport does not write source files.**
**IntentStatusReport does not implement intent:go.**

## Approval Is Reported, Not Granted

The status report reads `PreparedIntentPlan.approval` and surfaces it in
`proof.preparation.approvalStatus`, mapping an approved plan to `work-ready`, a
not-approved plan to `preparation-blocked`, and a needs-review plan to
`needs-review`. But **IntentStatusReport reports PreparedIntentPlan approval
state but does not approve plans** — approval is decided by the prepared-plan
layer, never by status reporting. Likewise **VerificationResult is an input to
status, not the status artifact itself**: a passed result is one of several
signals the rollup reads, alongside freshness and drift.

## What It Reads, What It Emits

The report reads `IntentAssessmentReport`, `PreparedIntentPlan`, `WorkOrder`,
`VerificationPlan`, `VerificationRun`, `VerificationResult`,
`PathFreshnessReport`, `RuntimeGraphDriftReport`, and `HandoffCoverageReport`
when available — none is required, and an absent input is itself a status
signal. It emits an overall status (`not-assessed` … `complete` / `unknown`), a
recommended next action, summarized phases, a per-area proof rollup, and
deterministic blockers / warnings / stale-inputs / missing-inputs lists. It
reads no raw source or event files and writes nothing but the report.

## Precedence

Status precedence keeps the rollup honest: a stale `PathFreshnessReport`
overrides work/proof status to `stale`; high-severity unresolved
`RuntimeGraphDriftReport` rows downgrade an advancing status to `needs-review`;
and `complete` is reserved for a passed verification with no stale context and
no high-severity blockers.

## Boundaries

Intent status is the reporting layer of the intent spine, and it stays
read-only:

- **IntentStatusReport does not create WorkOrder or VerificationPlan.**
- **IntentStatusReport does not execute commands.**
- **IntentStatusReport does not write source files.**
- **IntentStatusReport does not implement intent:go.**
- intent:go remains deferred; source-write behavior remains unavailable.

## Cross-References

- [IntentStatusReport artifact](../artifacts/intent-status-report.md)
- [IntentStatusReport v1 decision](../strategy/intent-status-report-v1-decision.md)
- [Prepared intent plan concept](prepared-intent-plan.md)
- [Intent assessment concept](intent-assessment.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

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

> Fixed (slice 113) / Reviewed (slice 114): on a fresh repo, run `rekon intent context prepare` after `rekon scan` to build the intent-readiness context (`StepCapabilityGraph` + runtime / handoff context, recorded as not-evaluated where there is no event log) before reporting status — the public sequence `rekon scan → rekon intent context prepare → rekon intent assess → … → rekon intent bundle write` then works with no manual `.rekon/artifacts` seeding. The [Fresh Repo Intent Readiness Safety Review](../strategy/fresh-repo-intent-readiness-safety-review.md) confirmed this path is safe/stable; `rekon scan` / `rekon refresh` are unchanged, missing runtime evidence stays not-evaluated (not false success), Rekon runs no Circe and writes no source, and intent:go remains deferred.

> Decided (slice 125): a future `rekon intent status transition` will write a NEW `IntentStatusReport`
> work-ready revision from an approved `PreparedIntentPlan` plus freshness / drift / status rechecks
> (the previous report stays immutable). The work-ready report sets `status.value = work-ready` and
> `recommendedNextAction = create-work-order`. The transition enables but does not create the WorkOrder
> / VerificationPlan handoffs, creates no VerificationRun / VerificationResult, executes no commands,
> writes no source, and runs no Circe; `intent:go` remains deferred. See
> [Intent Status Work-Ready Transition Decision](../strategy/intent-status-work-ready-transition-decision.md).
>
> Shipped (slice 126): `rekon intent status transition` now writes that work-ready revision — see the
> [Intent Status Work-Ready Transition Implementation](../strategy/intent-status-work-ready-transition-implementation.md).
> Reviewed safe/stable (slice 127): see the
> [Intent Status Work-Ready Transition Safety Review](../strategy/intent-status-work-ready-transition-safety-review.md).

> Related (slice 128): the upstream plan-intelligence gap (intake / normalization /
> actionability / elicitation) is addressed by the
> [Classic Intent Plan Compiler / Elicitation Parity Decision](../strategy/classic-intent-plan-compiler-elicitation-parity-decision.md).

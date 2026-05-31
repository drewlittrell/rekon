# PreparedIntentPlan Approval / Proof Model Decision

## Decision Summary

The PreparedIntentPlan v1 Decision (`a7feb33`) specified `PreparedIntentPlan`
as phase/gate preparation, and v1 implementation shipped at `decc93c`. That
implementation lets a plan reach `status.value === "prepared"` from a
`ready-for-prepare` assessment **without an explicit approval/proof record**.
This decision amends the architecture so a plan cannot be considered prepared
unless it carries explicit approval backed by proof.

**The decision selects the required approval/proof envelope option (Option B).**
`PreparedIntentPlan` gains a required `approval` envelope with an
`approval.status`, `approval.reasons`, an `approval.proof` record, and
`approval.blockers`. **PreparedIntentPlan must be proof-approved, not merely
generated.** **PreparedIntentPlan.status.value can be prepared only when
approval.status is approved.** **A plan with phases but without approval is not
prepared.**

The existing boundaries hold and tighten: **Verification requirements are proof
obligations, not VerificationPlan.** **PreparedIntentPlan does not create
WorkOrder or VerificationPlan.** **PreparedIntentPlan does not execute
commands.** **PreparedIntentPlan does not write source files.** **intent:go
remains deferred.**

This is a decision/architecture batch only — it implements nothing, registers
no schema, and adds no CLI command. Because the shipped v1 implementation
(`decc93c`) predates this amendment, the **next** slice is *PreparedIntentPlan
v1 implementation, amended with the approval/proof envelope*; the un-amended
implementation must not be treated as a finished, proof-bearing preparation
layer until that amendment ships.

## Why This Decision Exists

PreparedIntentPlan v1 was specified, and shipped, as "generate phases +
obligations + verification requirements from a safe assessment." That is too
weak: it lets a generated plan be marked `prepared` purely because the source
assessment was `ready-for-prepare`, with no record of *why* preparation is
authorized or *what proof* backs it. Classic intent preparation never worked
that way — plan output was gated behind explicit authorization and intake
sufficiency, and planning while not-ready without an approved reason was a
critical violation. Rekon must not weaken that proof-before-plan standard while
re-homing preparation into the artifact-first spine. This amendment makes the
future implementation proof-approved from day one.

## Classic Proof Discipline

Grounded by the integration review's recorded classic-source findings (cited
here, not re-copied):

- **Plan output authorization.** Classic allowed plan output only through
  explicit authorization or intake sufficiency
  (`core/domain/turnPlan/PlanIntakeSufficiency.ts`,
  `core/tests/domain/turnPlan/PlanIntakeSufficiency.test.ts`).
- **Intake sufficiency = desire + structure + grounding.** Placeholder or empty
  data does not satisfy it; a plan built on absent intake is not authorized.
- **No premature plan.** Planning while readiness is `not_ready` without an
  approved reason was a critical violation
  (`core/tests/config/gates/itoReadiness.test.ts`).
- **Minimum plan structure.** Plan output required minimum structure unless a
  canonical plan artifact/frontier satisfied it.
- **Post-stream proof expectations.** Trajectory changes, plan-review reasons,
  evaluator recordings, domain events, and added evidence were expected
  (`tools/evals/ito/judge-run.ts`,
  `config.project/references/evals/ito.criteria.yaml`).

**Rekon preserves classic's proof-before-plan discipline and improves it with
the Rekon graph spine** — `IntentAssessmentReport` readiness,
`RuntimeGraphDriftReport`, `HandoffCoverageReport`, `PathFreshnessReport`, and
`VerificationResult` / `VerificationRun` / `VerificationPlan` refs — rather than
literally copying classic code.

## Current PreparedIntentPlan Boundary

`PreparedIntentPlan` is phase/gate preparation: it consumes an
`IntentAssessmentReport` plus context and emits phases, obligations, and
verification requirements. It is not `WorkOrder` (implementation guidance), not
`VerificationPlan` (proof command planning), and not execution. This amendment
keeps all of that and adds a required approval/proof envelope so "prepared"
means "authorized with proof," not just "generated."

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| keep prior v1 shape | rejected | weakens proof-before-plan discipline |
| required approval/proof envelope | selected | preserves classic plan authorization |
| approval only in assessment | rejected | prepared plan needs own proof |
| defer proof to WorkOrder | rejected | WorkOrder should consume approved plan |
| defer proof to VerificationPlan | rejected | proof command planning cannot authorize preparation |

- **Option A — keep PreparedIntentPlan v1 as previously decided** (phases /
  obligations / verification requirements only, no approval). Rejected: weakens
  classic proof-before-plan discipline.
- **Option B — add a required approval/proof envelope.** Selected: preserves
  classic plan authorization discipline and improves it with Rekon's graph
  spine.
- **Option C — put approval only in `IntentAssessmentReport`.** Rejected:
  assessment readiness is source proof, but the prepared plan needs its own
  proof that the plan structure, obligations, and downstream handoff are valid.
- **Option D — defer proof until `WorkOrder`.** Rejected: a `WorkOrder` should
  consume an approved prepared plan, not discover that preparation was unsafe.
- **Option E — defer proof until `VerificationPlan`.** Rejected:
  `VerificationPlan` is downstream proof command planning; it cannot authorize
  preparation retroactively.

## Recommendation

Adopt **Option B**: `PreparedIntentPlan` v1 must include a required
approval/proof envelope, and `status.value` can be `prepared` only when
`approval.status` is `approved`. Approval must cite the `IntentAssessmentReport`,
record explicit authorization reasons, and record readiness, graph-spine,
freshness, verification, and source-write-boundary proof. The next slice is the
amended `PreparedIntentPlan` v1 implementation.

## Approval Model

Sketch only; not implemented in this batch. Added to `PreparedIntentPlan`:

```ts
type PreparedIntentPlanApprovalStatus =
  | "approved"
  | "not-approved"
  | "needs-review";

type PreparedIntentPlanApprovalReason =
  | "assessment-ready-for-prepare"
  | "explicit-operator-approval"
  | "intake-sufficient"
  | "manual-risk-acceptance"
  | "blocked-assessment"
  | "stale-assessment"
  | "insufficient-context"
  | "runtime-drift-unresolved"
  | "handoff-coverage-unresolved"
  | "verification-proof-missing";

type PreparedIntentPlanApproval = {
  status: PreparedIntentPlanApprovalStatus;
  reasons: PreparedIntentPlanApprovalReason[];
  proof: PreparedIntentPlanApprovalProof;
  blockers: PreparedIntentObligation[];
};
```

`reasons` carry both *authorizing* reasons (e.g. `assessment-ready-for-prepare`,
`explicit-operator-approval`, `intake-sufficient`, `manual-risk-acceptance`) and
*blocking* reasons (e.g. `blocked-assessment`, `stale-assessment`,
`insufficient-context`, `runtime-drift-unresolved`, `handoff-coverage-unresolved`,
`verification-proof-missing`). `blockers` reuse the existing
`PreparedIntentObligation` shape.

## Proof Model

```ts
type PreparedIntentPlanApprovalProof = {
  intentAssessmentReportRef: ArtifactRef;

  assessmentReadiness: string;
  assessmentApprovedForPrepare: boolean;

  requiredContextPresent: boolean;
  missingContext: string[];

  intakeSufficiency?: {
    present: boolean;
    satisfied: string[];
    missing: string[];
    sourceRefs: ArtifactRef[];
  };

  runtimeDrift: {
    accepted: boolean;
    unresolvedHighSeverity: number;
    runtimeGraphDriftReportRef?: ArtifactRef;
  };

  handoffCoverage: {
    accepted: boolean;
    uncovered: number;
    unresolvedContract: number;
    notEvaluated: number;
    handoffCoverageReportRef?: ArtifactRef;
  };

  freshness: {
    accepted: boolean;
    staleContext: boolean;
    pathFreshnessReportRef?: ArtifactRef;
  };

  verification: {
    requirementsPresent: boolean;
    proofResultsPresent: boolean;
    verificationRefs: ArtifactRef[];
  };

  planStructure: {
    phasesPresent: boolean;
    minimumPhaseCountMet: boolean;
    hasInvestigation: boolean;
    hasImplementationOrRefactor: boolean;
    hasVerification: boolean;
    hasReview: boolean;
  };

  downstreamHandoff: {
    workOrderAllowed: boolean;
    verificationPlanAllowed: boolean;
    sourceWriteAllowed: false;
  };
};
```

The proof record consumes each input by ref: `IntentAssessmentReport` (readiness
+ approved-for-prepare), `RuntimeGraphDriftReport` (unresolved high-severity
count + acceptance), `HandoffCoverageReport` (uncovered / unresolved-contract /
not-evaluated counts + acceptance), `PathFreshnessReport` (stale-context state +
acceptance), and `VerificationResult` / `VerificationRun` / `VerificationPlan`
(proof refs). `downstreamHandoff.sourceWriteAllowed` is the literal `false`.

## Prepared Status Rule

**PreparedIntentPlan.status.value can be prepared only when approval.status is
approved.** Equivalently: **A plan with phases but without approval is not
prepared.** A generated plan whose `approval.status` is `not-approved` or
`needs-review` must carry a non-`prepared` `status.value`
(`blocked` / `needs-review` / `stale-assessment` / `insufficient-assessment`).
Phases and obligations may still be emitted for visibility, but they confer no
"prepared" standing without an `approved` envelope.

## Approval Policy

1. `IntentAssessmentReport` is required.
2. `prepared` status requires `approval.status` `approved`.
3. `approval.status` `approved` requires assessment readiness
   `ready-for-prepare` **or** an explicit accepted approval reason
   (`explicit-operator-approval` / `intake-sufficient` / `manual-risk-acceptance`).
4. `blocked` assessment → `approval.status` `not-approved`.
5. `stale-context` assessment → `approval.status` `not-approved`.
6. `insufficient-context` assessment → `approval.status` `not-approved`.
7. `needs-review` assessment → `approval.status` `needs-review` unless an
   explicit operator approval exists.
8. `RuntimeGraphDriftReport` high-severity unresolved drift blocks approval
   unless explicitly accepted.
9. `HandoffCoverageReport` `uncovered` / `unresolved-contract` rows block
   approval unless explicitly accepted.
10. `PathFreshnessReport` stale context blocks approval unless explicitly
    accepted.
11. Verification requirements must exist for implementation-bearing work.
12. Verification requirements are proof obligations, not `VerificationPlan`.
13. Source-write permission is always `false`.

## Plan Structure Proof

- prepared plans must have phases.
- implementation-bearing plans must include a `verify` phase.
- `refactor` requests must include a `refactor` phase.
- `bug` / `feature` / `migration` requests must include a `modify` phase.
- `investigation` requests may include `investigate` + `review` only.
- `unknown` requests require `needs-review` unless explicitly approved.

`approval.proof.planStructure` records these as booleans
(`phasesPresent` / `minimumPhaseCountMet` / `hasInvestigation` /
`hasImplementationOrRefactor` / `hasVerification` / `hasReview`); a
`prepared` plan must satisfy the structure proof for its request kind.

## Verification Proof

`verificationRequirements` are distinct from `VerificationPlan`,
`VerificationRun`, and `VerificationResult`:

- `verificationRequirements` are obligations; **Verification requirements are
  proof obligations, not VerificationPlan.**
- they do not execute commands.
- they do not create `VerificationPlan`.
- proof results, when available, are cited as refs in
  `approval.proof.verification.verificationRefs`.
- missing proof *results* may be acceptable at preparation time, but missing
  *requirements* are not acceptable for implementation-bearing plans.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| approval vs assessment | assessment is source proof, approval belongs to plan |
| approval vs WorkOrder | no work artifact creation |
| approval vs VerificationPlan | requirements only, no proof-plan artifact |
| approval vs VerificationRun | no command execution |
| approval vs source writes | sourceWriteAllowed=false |
| approval vs intent:go | execution deferred |

**PreparedIntentPlan does not create WorkOrder or VerificationPlan.**
**PreparedIntentPlan does not execute commands.** **PreparedIntentPlan does not
write source files.** **intent:go remains deferred.** The approval envelope adds
proof; it does not relax any downstream boundary.

## Proof Requirements

| Proof Area | Required Evidence |
| --- | --- |
| assessment | IntentAssessmentReport ref + readiness |
| graph drift | RuntimeGraphDriftReport ref + unresolved count |
| handoff coverage | HandoffCoverageReport ref + uncovered/unresolved counts |
| freshness | PathFreshnessReport ref + stale-context state |
| verification | verification requirements + optional proof refs |
| plan structure | phase count + required phase kinds |
| downstream handoff | WorkOrder/VerificationPlan allowed flags, sourceWriteAllowed=false |

| Condition | Approval Decision |
| --- | --- |
| assessment ready-for-prepare and proof passes | approved |
| blocked assessment | not-approved |
| stale assessment | not-approved |
| insufficient assessment | not-approved |
| needs-review assessment | needs-review |
| high runtime drift unresolved | not-approved unless accepted |
| uncovered / unresolved handoff coverage | not-approved unless accepted |
| implementation work without verification requirements | not-approved |

## What This Does Not Do

This decision implements no `PreparedIntentPlan`, registers no artifact type or
schema, changes no schema, and adds no CLI command. It creates no `WorkOrder` /
`VerificationPlan` / `VerificationRun` / `VerificationResult`, executes nothing,
writes no source, implements no `IntentStatusReport` / `intent:go`, mutates no
`IntentAssessmentReport` / `RuntimeGraphDriftReport` / `HandoffCoverageReport` /
`PathFreshnessReport`, imports nothing from classic codebase-intel, bumps no
version, and publishes nothing.

## Implementation Sequence

1. **PreparedIntentPlan Approval / Proof Model Decision** (this memo).
2. **PreparedIntentPlan v1 implementation, amended with the approval/proof
   envelope** — amend the already-shipped `PreparedIntentPlan` (`decc93c`) to
   add the required `approval` envelope and proof record, enforce that
   `status.value === "prepared"` requires `approval.status === "approved"`, and
   update the helper / CLI / tests / docs accordingly. Still no `WorkOrder` /
   `VerificationPlan` creation, no command execution, no source writes.
3. **PreparedIntentPlan safety review**, then **IntentStatusReport** → (later,
   separately decided) **IntentGoDecision** execution gate + source-write
   policy.

## Cross-References

- [PreparedIntentPlan v1 decision](prepared-intent-plan-v1-decision.md)
- [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md)
- [IntentAssessmentReport safety review](intent-assessment-report-safety-review.md)
- [IntentAssessmentReport artifact](../artifacts/intent-assessment-report.md)
- [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md)
- [HandoffCoverageReport artifact](../artifacts/handoff-coverage-report.md)
- [Path freshness report artifact](../artifacts/path-freshness-report.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> Shipped (slice 83): PreparedIntentPlan v1 now carries the required approval/proof envelope — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Approval proof re-checks runtime drift, handoff coverage, freshness, and verification from artifact values; `downstreamHandoff.sourceWriteAllowed` is the literal `false`; `explicit-operator-approval` / `manual-risk-acceptance` are reserved reasons. It creates no WorkOrder / VerificationPlan, executes no commands, and writes no source; intent:go remains deferred. See [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) and [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md).

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](../artifacts/intent-status-report.md).

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](intent-status-report-safety-review.md).

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](intent-work-proof-handoff-decision.md).

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](intent-work-order-handoff-decision.md).

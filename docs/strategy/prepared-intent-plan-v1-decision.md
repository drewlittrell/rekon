# PreparedIntentPlan v1 Decision

## Decision Summary

The IntentAssessmentReport Safety Review (`2b29e46`) confirmed
`IntentAssessmentReport` v1 is safe/stable as read-only readiness assessment
and named `PreparedIntentPlan` the next layer. This memo fixes the v1 shape,
inputs, prepared-status model, phase model, obligation model, verification
requirement model, and implementation sequence for `PreparedIntentPlan` before
any code is written.

**The decision selects the artifact-backed PreparedIntentPlan option
(Option B):** `PreparedIntentPlan` v1 is a read-only phase/gate preparation
artifact generated from a `IntentAssessmentReport` plus the existing Rekon
context artifacts. It turns a *safe* assessment into planned implementation
phases, touched paths, capability / step / handoff / drift obligations,
preservation constraints, and proposed verification requirements — and it stops
there.

The boundaries are pinned. **PreparedIntentPlan is phase/gate preparation, not
WorkOrder.** **PreparedIntentPlan does not create WorkOrder or
VerificationPlan.** **PreparedIntentPlan does not execute commands.**
**PreparedIntentPlan does not write source files.** **Verification
requirements are not VerificationPlan.** **IntentStatusReport remains the next
layer after preparation.** **intent:go remains deferred.** **Source-write
behavior remains unavailable.**

This is a decision/architecture batch only. No artifact type is registered, no
generator is implemented, and no CLI command is added.

## Why This Decision Exists

`IntentAssessmentReport` can already assess readiness, blockers, missing
context, matched scope, drift, freshness, and proof state. What Rekon lacks is
a *prepared intent* layer that turns a safe assessment into planned
implementation phases, constraints, gates, obligations, and verification
requirements — without becoming a `WorkOrder` (implementation guidance) or a
`VerificationPlan` (proof command planning), and without crossing into
execution or source writes.

The integration review recorded that classic intent's `intent:prepare` produced
`PreparedPhaseArtifact`s (objective, deliverables, acceptance criteria,
actionability, touched paths, gates, outcomes, implementation constraints,
codebase baseline) and wrote phase JSON/MD plus a manifest, but executed
nothing. Rekon's `PreparedIntentPlan` re-homes that preparation into the
artifact-first spine and additionally consumes the step/handoff/runtime-drift
graph spine as obligations — a Rekon-native extension, recorded honestly, not
literal classic behavior. This memo pins the shape so implementation does not
drift into WorkOrder, VerificationPlan, or execution.

## Current Boundary

`IntentAssessmentReport` answers "is this request ready to prepare?" `WorkOrder`
is implementation guidance produced after preparation. `VerificationPlan` is
proof command planning. `IntentStatusReport` and `IntentGoDecision` do not
exist yet and remain deferred. `PreparedIntentPlan` fills the gap between
assessment and work guidance: it structures phases and obligations from a safe
assessment without producing any of those downstream artifacts.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| assessment as plan | rejected | assessment is not phase preparation |
| artifact-backed PreparedIntentPlan | selected | preserves assess→prepare boundary |
| WorkOrder as plan | rejected | implementation guidance is downstream |
| VerificationPlan as plan | rejected | proof command plan is downstream |
| intent:go first | rejected | execution deferred |

- **Option A — treat `IntentAssessmentReport` as the prepared plan.** Rejected:
  assessment answers whether preparation is safe; it does not structure
  implementation phases or obligations.
- **Option B — artifact-backed `PreparedIntentPlan`.** Selected: consumes the
  assessment plus context and emits phases, obligations, gates, and
  verification requirements, preserving the assess → prepare boundary while
  creating the missing phase/gate planning surface.
- **Option C — `WorkOrder` as `PreparedIntentPlan`.** Rejected: `WorkOrder` is
  implementation guidance; `PreparedIntentPlan` is intent-phase preparation and
  can feed later `WorkOrder` generation.
- **Option D — `VerificationPlan` as `PreparedIntentPlan`.** Rejected:
  `VerificationPlan` is proof command planning, not implementation phase
  preparation.
- **Option E — start with `intent:go`.** Rejected: execution remains deferred
  until assessment, preparation, status, proof, and a source-write policy
  exist.

## Recommendation

Adopt **Option B**. `PreparedIntentPlan` v1 is an artifact-backed phase/gate
preparation artifact generated from `IntentAssessmentReport` plus existing
Rekon context artifacts. It emits a prepared status, phases, obligations, and
verification requirements (as requirements, not a `VerificationPlan`). It
**does not** create `WorkOrder` or `VerificationPlan`, execute commands, or
write source. The next slice is `PreparedIntentPlan` v1 implementation
(read-only generator); the slice after preparation is `IntentStatusReport`.

## Input Model

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

All inputs are read as already-materialized Rekon artifacts (latest or pinned)
and cited by `ArtifactRef`; the generator reads values, never raw source or
event files, and mutates nothing. Beyond the table, v1 may also consume
`CapabilityContract`, `HandoffContract`, `RuntimeGraphObservationReport`,
`FindingReport`, and `VerificationRun` / `VerificationPlan` as citation/context
when available. `WorkOrder` is intentionally not an input: preparation precedes
work guidance.

## Prepared Status Model

| Prepared Status | Meaning |
| --- | --- |
| prepared | safe to create downstream work guidance |
| blocked | blocker prevents preparation |
| needs-review | review needed before work guidance |
| stale-assessment | assessment or context is stale |
| insufficient-assessment | assessment lacks scope/context |

`status` carries the value plus a `recommendedNextAction`
(`create-work-order` / `resolve-blockers` / `refresh-context` / `human-review`
/ `run-assessment` / `defer`). The v1 preparation policy keys off the source
assessment's readiness:

1. `IntentAssessmentReport` is required.
2. assessment `stale-context` → `stale-assessment`, no implementation phases.
3. assessment `blocked` → `blocked`, no implementation phases.
4. assessment `insufficient-context` → `insufficient-assessment`, no
   implementation phases.
5. assessment `needs-review` → `needs-review` with a `review` phase only.
6. assessment `ready-for-prepare` → `prepared` with planned phases.
7. matchedContext from the assessment seeds initial paths / systems /
   capabilities / steps.
8. `RuntimeGraphDriftReport` rows seed drift obligations.
9. `HandoffCoverageReport` rows seed handoff obligations.
10. `CapabilityContract` / `CapabilityMap` seed capability-preservation
    obligations when deterministic.
11. `verificationRequirements` are emitted as requirements only; no
    `VerificationPlan` is created.
12. `create-work-order` is recommended only when status is `prepared`.

## Phase Model

Phases structure the planned work without performing it. Phase kinds:
`investigate` / `modify` / `refactor` / `verify` / `review`. Sketch:

```ts
type PreparedIntentPhase = {
  id: string;
  title: string;
  kind: "investigate" | "modify" | "refactor" | "verify" | "review";
  status: "planned" | "blocked" | "needs-review";
  goal: string;
  paths: string[];
  systems: string[];
  capabilities: string[];
  steps: string[];
  constraints: string[];
  obligations: string[];
  verificationRequirements: string[];
  sourceRefs: ArtifactRef[];
};
```

v1 may generate one coarse phase when detailed decomposition is not
deterministic. A `blocked` / `needs-review` / `stale-assessment` /
`insufficient-assessment` plan emits at most a `review` phase (or none), never
`modify` / `refactor` phases.

## Obligation Model

Obligations record what preparation must preserve or satisfy; they are
descriptive, not executable. Categories: `capability-preservation` /
`step-preservation` / `handoff-preservation` / `runtime-drift` /
`finding-governance` / `freshness` / `verification` / `source-write-boundary`.
Sketch:

```ts
type PreparedIntentObligation = {
  id: string;
  category:
    | "capability-preservation"
    | "step-preservation"
    | "handoff-preservation"
    | "runtime-drift"
    | "finding-governance"
    | "freshness"
    | "verification"
    | "source-write-boundary";
  severity: "low" | "medium" | "high";
  message: string;
  sourceRefs?: ArtifactRef[];
};
```

`blockedReasons` reuse the same shape to explain a non-`prepared` status. A
`source-write-boundary` obligation always records that preparation does not
authorize source writes.

## Verification Requirement Model

`verificationRequirements` express *what would need to be proven* if the work
were carried out — they are requirements, not a proof artifact. **Verification
requirements are not VerificationPlan.** Each carries an `id`, an optional
suggested `command`, a `reason`, and optional `sourceRefs`. The generator
proposes these from the assessment's proof state and obligations; it never
materializes a `VerificationPlan`, never executes a command, and never creates
a `VerificationRun` / `VerificationResult`.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| PreparedIntentPlan vs IntentAssessmentReport | preparation after assessment |
| PreparedIntentPlan vs WorkOrder | phase/gate plan vs implementation guidance |
| PreparedIntentPlan vs VerificationPlan | requirements vs proof command artifact |
| PreparedIntentPlan vs IntentStatusReport | prepared plan before status reporting |
| PreparedIntentPlan vs intent:go | execution deferred |
| PreparedIntentPlan vs source writes | no writes |

**PreparedIntentPlan is phase/gate preparation, not WorkOrder.** It consumes
`IntentAssessmentReport` and emits phase/obligation structure that a later
`WorkOrder` slice can use; it never produces that `WorkOrder` itself.
**Verification requirements are not VerificationPlan** — the proof command
artifact is a separate, downstream surface. **Source-write behavior remains
unavailable.**

## Follow-On Artifacts

**IntentStatusReport remains the next layer after preparation** — it will
report whether assessed/prepared intent is blocked, stale, verified, or
complete over the assessment / plan / proof / freshness inputs.
**intent:go remains deferred** as a future execution gate, contingent on a
separately-decided source-write and execution policy. `WorkOrder` and
`VerificationPlan` generation from a prepared plan are downstream,
separately-decided layers.

## What This Does Not Do

This decision implements no `PreparedIntentPlan`, registers no artifact type,
adds no CLI command, and implements no `IntentStatusReport` /
`IntentGoDecision`. It mutates no `IntentAssessmentReport`, `WorkOrder`,
`VerificationPlan`, `RuntimeGraphDriftReport`, or `PathFreshnessReport`; creates
no `WorkOrder` / `VerificationPlan` / `VerificationRun` / `VerificationResult`;
executes nothing; writes no source; imports nothing from classic
codebase-intel; bumps no version; and publishes nothing.

## Implementation Sequence

1. **PreparedIntentPlan v1 decision** (this memo).
2. **PreparedIntentPlan v1 implementation** — register the artifact type and a
   read-only generator from `IntentAssessmentReport` plus existing Rekon
   artifacts, emitting prepared status / phases / obligations / verification
   requirements / blocked reasons. No `WorkOrder` / `VerificationPlan`
   creation, no execution, no source writes.
3. **PreparedIntentPlan safety review**, then **IntentStatusReport** → (later,
   separately decided) **IntentGoDecision** execution gate + source-write
   policy.

## Cross-References

- [IntentAssessmentReport safety review](intent-assessment-report-safety-review.md)
- [IntentAssessmentReport v1 decision](intent-assessment-report-v1-decision.md)
- [Intent Capability Spine Integration Review](intent-capability-spine-integration-review.md)
- [IntentAssessmentReport artifact](../artifacts/intent-assessment-report.md)
- [Intent assessment concept](../concepts/intent-assessment.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md)
- [Path freshness report artifact](../artifacts/path-freshness-report.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) — the read-only phase/gate preparation generated from an IntentAssessmentReport plus the Rekon context spine, via `rekon intent prepare`. Prepared status: prepared / blocked / needs-review / stale-assessment / insufficient-assessment; phases investigate / modify / refactor / verify / review; obligation categories capability-preservation / step-preservation / handoff-preservation / runtime-drift / finding-governance / freshness / verification / source-write-boundary. PreparedIntentPlan is phase/gate preparation, not WorkOrder; it does not create WorkOrder / VerificationPlan, execute commands, or write source. Verification requirements are not VerificationPlan. IntentStatusReport is the next layer; intent:go deferred; source-write behavior remains unavailable.

> See also: [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md) — amends the PreparedIntentPlan architecture so a plan cannot be prepared without an explicit approval/proof envelope. PreparedIntentPlan.status.value can be prepared only when approval.status is approved; a plan with phases but without approval is not prepared. Approval cites the IntentAssessmentReport and records readiness, runtime-drift, handoff-coverage, freshness, verification, plan-structure, and source-write-boundary proof. Verification requirements are proof obligations, not VerificationPlan. PreparedIntentPlan does not create WorkOrder / VerificationPlan, execute commands, or write source; intent:go remains deferred. The shipped v1 implementation must be amended to add this envelope before it is treated as proof-bearing.

> Shipped (slice 83): PreparedIntentPlan v1 now carries the required approval/proof envelope — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Approval proof re-checks runtime drift, handoff coverage, freshness, and verification from artifact values; `downstreamHandoff.sourceWriteAllowed` is the literal `false`; `explicit-operator-approval` / `manual-risk-acceptance` are reserved reasons. It creates no WorkOrder / VerificationPlan, executes no commands, and writes no source; intent:go remains deferred. See [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md) and [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md).

> Reviewed (slice 84): PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation — `status.value` can be prepared only when `approval.status` is approved, and a plan with phases but without approval is not prepared. Verification requirements are proof obligations, not VerificationPlan; preparation creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, and writes no source; IntentStatusReport remains the next layer and intent:go remains deferred. See [PreparedIntentPlan safety review](prepared-intent-plan-safety-review.md).

> IntentStatusReport v1 decision (slice 85): the next intent layer is an artifact-backed status rollup generated read-only from IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport v1 decision](intent-status-report-v1-decision.md).

> IntentStatusReport v1 (slice 86): the intent status layer has shipped as a read-only rollup status report (`rekon intent status`) over IntentAssessmentReport, PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself. It creates no WorkOrder / VerificationPlan / VerificationRun, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport artifact](../artifacts/intent-status-report.md).

> Reviewed (slice 87): IntentStatusReport v1 is safe/stable as read-only status reporting — it reports assessment / preparation / approval / work / verification / freshness / drift state but performs none of those steps. IntentStatusReport is status reporting, not VerificationResult; it is not WorkOrder; it reports PreparedIntentPlan approval state but does not approve plans; VerificationResult is an input to status, not the status artifact itself; WorkOrder / VerificationPlan generation remains deferred to a separate decision. It creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes no source, and does not implement intent:go. See [IntentStatusReport safety review](intent-status-report-safety-review.md).

> Decided (slice 88): the intent work/proof handoff uses separate, explicit, gated generators — PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan, each decided / implemented / safety-reviewed on its own. Intent work/proof handoff is artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; VerificationPlan generation must require PreparedIntentPlan verification requirements; IntentStatusReport gates handoff but does not generate downstream artifacts; generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan; handoff generation does not execute commands or write source files; intent:go remains deferred. See [Intent Work / Proof Handoff Decision](intent-work-proof-handoff-decision.md).

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](intent-work-order-handoff-decision.md).

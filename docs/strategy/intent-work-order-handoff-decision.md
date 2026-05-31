# Intent WorkOrder Handoff Decision

## Decision Summary

The Intent Work / Proof Handoff Decision (`449a17d`) selected separate, explicit,
gated generators: `PreparedIntentPlan → WorkOrder` and
`PreparedIntentPlan → VerificationPlan`. This decision pins the first of those —
the exact `WorkOrder` generator shape, gate model, freshness/drift recheck,
traceability model, content mapping, source policy, and implementation sequence
for generating a `WorkOrder` from a proof-approved `PreparedIntentPlan`.

**The decision selects the explicit gated WorkOrder generator (Option B).** A
future `rekon intent work-order generate` command reads a proof-approved
`PreparedIntentPlan` (gated by `IntentStatusReport` and a handoff-time freshness /
drift recheck) and writes exactly one new `WorkOrder` artifact — it generates no
`VerificationPlan`, executes no commands, and writes no source. This batch decides
the shape only; it implements no generator.

**Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go.**
**WorkOrder generation must require a proof-approved PreparedIntentPlan.**
**IntentStatusReport gates WorkOrder generation but does not generate WorkOrder.**
**WorkOrder generation must recheck freshness and runtime drift at handoff
time.** **Generated WorkOrder must trace back to PreparedIntentPlan.** **WorkOrder
generation does not create VerificationPlan.** **WorkOrder generation does not
execute commands.** **WorkOrder generation does not write source files.**
**intent:go remains deferred.**

## Why This Decision Exists

`PreparedIntentPlan` is now proof-approved phase/gate preparation, and
`IntentStatusReport` can report a `work-ready` status. The next boundary is
converting a proof-approved prepared plan into implementation guidance — a
`WorkOrder`. That conversion is close to action, so the generator must be
explicitly gated, traceable, and read-only over its inputs. Classic intent never
let plan output silently become work guidance without authorization; Rekon
preserves that discipline by pinning the gate, the recheck, and the traceability
before any generator is built.

## Current Boundary

The intent spine is read-only and additive: assessment, preparation, and status
consume materialized artifacts and mutate none of them, and status only reports.
This decision adds the *shape* of a generator that would read a proof-approved
`PreparedIntentPlan` (with `IntentStatusReport`, `PathFreshnessReport`, and
`RuntimeGraphDriftReport` as gating inputs) and write a downstream `WorkOrder`
artifact — never executing commands, never writing source, never creating a
`VerificationPlan`, and never mutating its inputs.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| manual WorkOrder only | rejected/deferred | leaves intent spine incomplete |
| explicit gated WorkOrder generator | selected | completes proof-approved preparation to work guidance |
| combined WorkOrder + VerificationPlan generator | rejected | proof planning is a separate handoff |
| IntentStatusReport generates WorkOrder | rejected | status is read-only |
| intent:go creates WorkOrder | rejected | execution deferred |

- **Option A — manual WorkOrder only.** Rejected/deferred: manual handoff
  preserves safety but leaves the intent spine incomplete and duplicates operator
  work.
- **Option B — explicit gated WorkOrder generator.** Selected: a future generator
  creates one `WorkOrder` from a proof-approved `PreparedIntentPlan` after the
  status / freshness / drift gates pass, completing the
  assessment → preparation → work-guidance handoff while preserving explicit
  gates.
- **Option C — combined `WorkOrder` + `VerificationPlan` generator.** Rejected:
  work guidance and proof planning are separate downstream artifacts with
  different gates.
- **Option D — `IntentStatusReport` generates `WorkOrder`.** Rejected:
  `IntentStatusReport` is read-only status reporting.
- **Option E — `intent:go` creates `WorkOrder`.** Rejected: `intent:go` remains
  deferred; WorkOrder generation must be explicit and non-executing.

## Recommendation

Adopt **Option B**: an explicit gated Intent WorkOrder generator. The future
command shape is:

```sh
rekon intent work-order generate \
  --prepared-plan <PreparedIntentPlan:id|type:id> \
  [--intent-status <IntentStatusReport:id|type:id>] \
  [--path-freshness <PathFreshnessReport:id|type:id>] \
  [--runtime-drift <RuntimeGraphDriftReport:id|type:id>]
```

Inputs: `PreparedIntentPlan` (required); `IntentStatusReport` (required, or the
latest generated if absent); `PathFreshnessReport` (optional, checked when
available); `RuntimeGraphDriftReport` (optional, checked when available);
`IntentAssessmentReport` via the prepared plan's source refs. Output: exactly one
new `WorkOrder` artifact. It outputs no `VerificationPlan` / `VerificationRun` /
`VerificationResult` and no source files. The next slice is the Intent WorkOrder
Handoff Implementation.

## WorkOrder Generation Gate

WorkOrder generation is allowed only when **all** are true:

1. `PreparedIntentPlan.approval.status === "approved"`.
2. `PreparedIntentPlan.status.value === "prepared"`.
3. `PreparedIntentPlan.status.recommendedNextAction === "create-work-order"`.
4. `IntentStatusReport.status.value === "work-ready"`.
5. `IntentStatusReport` has no high-severity blockers.
6. `PreparedIntentPlan.approval.proof.downstreamHandoff.workOrderAllowed === true`.
7. `PreparedIntentPlan.approval.proof.downstreamHandoff.sourceWriteAllowed === false`.
8. Freshness recheck passes.
9. Runtime drift recheck passes.

| Gate | Required State |
| --- | --- |
| PreparedIntentPlan approval | approval.status approved |
| PreparedIntentPlan status | status.value prepared |
| PreparedIntentPlan next action | create-work-order |
| IntentStatusReport | work-ready |
| blockers | no high-severity blockers |
| freshness recheck | no stale scoped context after approval |
| drift recheck | no new high-severity drift after approval |
| downstream handoff | workOrderAllowed true and sourceWriteAllowed false |

## Blocks WorkOrder Generation

Generation is blocked by any of: missing `PreparedIntentPlan`;
`approval.status !== "approved"`; `status.value !== "prepared"`;
`recommendedNextAction !== "create-work-order"`;
`IntentStatusReport.status.value !== "work-ready"`; an `IntentStatusReport`
high-severity blocker; a stale scoped `PathFreshnessReport` after plan approval; a
new high-severity `RuntimeGraphDriftReport` drift after plan approval; missing
required source refs; an empty `PreparedIntentPlan.phases` list;
`downstreamHandoff.workOrderAllowed !== true`; or
`downstreamHandoff.sourceWriteAllowed !== false`. **WorkOrder generation must
require a proof-approved PreparedIntentPlan.**

## Freshness And Drift Recheck

The generator must compare the latest or pinned `PathFreshnessReport` and
`RuntimeGraphDriftReport` against the proof refs recorded in
`PreparedIntentPlan.approval.proof`. If the latest freshness or drift state
differs materially from the approved proof state, generation blocks unless a
future explicit accepted-risk override exists. For this decision, **no override is
implemented and no override is assumed**. **WorkOrder generation must recheck
freshness and runtime drift at handoff time.**

## Traceability Model

A generated `WorkOrder` must cite: `preparedIntentPlanRef`,
`intentAssessmentReportRef`, `intentStatusReportRef`, the
`PreparedIntentPlan.approval.proof` refs, the selected phase ids, the selected
obligation ids, and the selected `verificationRequirement` ids. It must include
trace fields:

```ts
type IntentWorkOrderSource = {
  preparedIntentPlanRef: ArtifactRef;
  intentAssessmentReportRef?: ArtifactRef;
  intentStatusReportRef?: ArtifactRef;
  runtimeGraphDriftReportRef?: ArtifactRef;
  pathFreshnessReportRef?: ArtifactRef;
};
```

**Generated WorkOrder must trace back to PreparedIntentPlan.** The generator
mutates nothing it reads.

## WorkOrder Content Mapping

`PreparedIntentPlan` maps into `WorkOrder` as follows:

| PreparedIntentPlan Surface | WorkOrder Mapping |
| --- | --- |
| request goal | WorkOrder summary / goal |
| phases | ordered implementation guidance |
| phase paths | touched paths |
| systems / capabilities / steps | implementation context |
| obligations | preservation checks / constraints |
| blockedReasons | do-not-start reasons |
| verificationRequirements | verification guidance only |
| source refs | traceability |

`PreparedIntentPlan.request.goal` → WorkOrder goal / summary; `phases` → ordered
implementation sections / steps; `phase.paths` → touched paths / scope;
`phase.systems` / `capabilities` / `steps` → capability / system / step context;
`obligations` → preservation checks / constraints; `blockedReasons` → blockers /
do-not-start reasons; `verificationRequirements` → verification guidance summary
only (it does not create a `VerificationPlan`); `request.scope` / constraints /
non-goals → scope / constraints / non-goals.

The current `WorkOrder` shape is narrower than the prepared plan, so where a
prepared-plan surface has no direct `WorkOrder` field, the implementation will
either embed the additional material as structured metadata if available or
reserve a generator-specific WorkOrder details section. The generator must not
invent `WorkOrder` fields that the artifact cannot support.

## Verification Requirement Boundary

**Verification requirements may be copied into WorkOrder as guidance, but
WorkOrder generation does not create VerificationPlan.** This matters because
`VerificationPlan` generation is a separate future handoff with its own gate and
safety review; the WorkOrder generator only summarizes the requirements as
guidance and cites their ids for traceability. **WorkOrder generation does not
create VerificationPlan.**

## Boundary Model

| Boundary | Decision |
| --- | --- |
| WorkOrder handoff vs intent:go | artifact generation, not execution |
| WorkOrder generator vs IntentStatusReport | status gates, generator writes |
| WorkOrder generator vs VerificationPlan | no proof-plan creation |
| WorkOrder generator vs command execution | no commands |
| WorkOrder generator vs source writes | no writes |
| WorkOrder generator vs PreparedIntentPlan | consumes approved plan, mutates nothing |

**Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go.**
**WorkOrder generation does not execute commands.** **WorkOrder generation does
not write source files.** **intent:go remains deferred.**

## What This Does Not Do

This decision implements no `WorkOrder` generation. It creates no `WorkOrder` /
`VerificationPlan` / `VerificationRun` / `VerificationResult`, executes nothing,
writes no source, implements no `intent:go`, registers no artifact type, adds no
CLI command, mutates no `IntentAssessmentReport` / `PreparedIntentPlan` /
`IntentStatusReport` / `WorkOrder` / `VerificationPlan` / `PathFreshnessReport` /
`RuntimeGraphDriftReport`, imports nothing from classic codebase-intel, bumps no
version, and publishes nothing.

## Implementation Sequence

1. **Intent WorkOrder Handoff Decision** (this memo).
2. **Intent WorkOrder Handoff Implementation** — implement the explicit gated
   `WorkOrder` generator + `rekon intent work-order generate` CLI from a
   proof-approved `PreparedIntentPlan`. Still no `VerificationPlan` generation, no
   command execution, no source writes, no `intent:go`.
3. **Intent WorkOrder Handoff Safety Review**, then the VerificationPlan handoff
   decision → implementation → safety review; then (much later) `intent:go`.

## Cross-References

- [Intent Work / Proof Handoff Decision](intent-work-proof-handoff-decision.md)
- [IntentStatusReport safety review](intent-status-report-safety-review.md)
- [IntentStatusReport artifact](../artifacts/intent-status-report.md)
- [PreparedIntentPlan safety review](prepared-intent-plan-safety-review.md)
- [PreparedIntentPlan Approval / Proof Model Decision](prepared-intent-plan-approval-proof-decision.md)
- [PreparedIntentPlan artifact](../artifacts/prepared-intent-plan.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Path freshness report artifact](../artifacts/path-freshness-report.md)
- [RuntimeGraphDriftReport artifact](../artifacts/runtime-graph-drift-report.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> Shipped (slice 90): the Intent WorkOrder handoff generator shipped — `rekon intent work-order generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck) and writes exactly one `WorkOrder` (`source: "intent-handoff"`) that traces back to the plan / status / assessment refs and the phase / obligation / verification-requirement ids. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; it creates no `VerificationPlan`, executes no commands, and writes no source files; intent:go remains deferred. See [intent WorkOrder handoff](../concepts/intent-work-order-handoff.md).

> Reviewed (slice 91): the Intent WorkOrder handoff is safe/stable as an explicit gated WorkOrder generator — `rekon intent work-order generate` requires a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck); the blocked path writes no `WorkOrder`, and the generated path writes exactly one `WorkOrder` that traces back to the plan. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; WorkOrder generation creates no `VerificationPlan` / `VerificationRun` / `VerificationResult`, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Decision. See [Intent WorkOrder Handoff Safety Review](./intent-work-order-handoff-safety-review.md).

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](./intent-verification-plan-handoff-decision.md).

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](../concepts/intent-verification-plan-handoff.md).

> Reviewed (slice 94): the Intent VerificationPlan handoff is safe/stable as an explicit gated VerificationPlan generator — `rekon intent verification-plan generate` requires a proof-approved `PreparedIntentPlan` with non-empty verification requirements (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, blocks unsafe / ambiguous commands, and writes exactly one `VerificationPlan` on pass; the blocked path writes none. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Plan bundle / LLM-agent handoff directory work is deferred to the next phase. Next: Intent Plan Bundle / Agent Handoff Directory Decision. See [Intent VerificationPlan Handoff Safety Review](./intent-verification-plan-handoff-safety-review.md).

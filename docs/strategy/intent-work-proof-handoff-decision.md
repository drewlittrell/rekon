# Intent Work / Proof Handoff Decision

## Decision Summary

The staged Rekon intent spine now reports through three layers:
`IntentAssessmentReport` (can intent be prepared?), `PreparedIntentPlan` (does a
proof-approved phase/gate plan exist?), and `IntentStatusReport` (where does the
intent currently stand?). The IntentStatusReport Safety Review (`1d19a4f`)
confirmed status reporting is read-only and selected this handoff decision as the
next boundary: whether and how a proof-approved `PreparedIntentPlan` may lead to
the existing downstream `WorkOrder` and `VerificationPlan` artifacts.

**The decision selects separate, explicit, gated generators (Option B):** a
future `PreparedIntentPlan → WorkOrder` handoff and a separate future
`PreparedIntentPlan → VerificationPlan` handoff. `WorkOrder` is implementation
guidance; `VerificationPlan` is proof command planning; each gets its own gate,
traceability, and safety review. This batch decides the shape only — it
implements no generator.

**Intent work/proof handoff is artifact generation, not intent:go.** **WorkOrder
generation must require a proof-approved PreparedIntentPlan.** **VerificationPlan
generation must require PreparedIntentPlan verification requirements.**
**IntentStatusReport gates handoff but does not generate downstream artifacts.**
**WorkOrder and VerificationPlan generation must be separate explicit steps.**
**Generated WorkOrder and VerificationPlan must trace back to
PreparedIntentPlan.** **Handoff generation does not execute commands.** **Handoff
generation does not write source files.** **intent:go remains deferred.**

## Why This Decision Exists

`IntentAssessmentReport` assesses readiness; `PreparedIntentPlan` prepares a
proof-approved phase/gate plan; `IntentStatusReport` reports the current state.
The next boundary is whether a proof-approved plan can be handed off to the
existing downstream work/proof artifacts. That handoff is close to action — a
generator turns a plan into work guidance and proof planning — so it must be
decided explicitly, with gates and traceability, before any generator is built.
Classic intent never let plan output silently become work or proof execution;
Rekon preserves that discipline by deciding the handoff as a separate, gated step
over the materialized spine.

## Current Boundary

The intent spine is read-only and additive. `IntentAssessmentReport`,
`PreparedIntentPlan`, and `IntentStatusReport` consume materialized artifacts and
mutate none of them; preparation is proof-approved but creates no `WorkOrder` /
`VerificationPlan`, and status only reports. This decision keeps all of that and
adds the *shape* of two future generators that would read a proof-approved
`PreparedIntentPlan` (gated by `IntentStatusReport` and re-checked freshness /
drift) and write a downstream `WorkOrder` or `VerificationPlan` artifact — never
executing commands, never writing source, never mutating their inputs.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| manual handoff only | rejected/deferred | leaves intent spine incomplete |
| separate gated generators | selected | separates work guidance from proof planning |
| combined generator | rejected/deferred | too much blast radius |
| status report generates artifacts | rejected | status is read-only |
| intent:go now | rejected | execution deferred |

- **Option A — keep handoff manual.** Rejected/deferred: manual handoff preserves
  safety but leaves the intent spine incomplete and duplicates operator work.
- **Option B — separate, explicit, gated generators.** Selected: a future
  generator creates `WorkOrder` from an approved `PreparedIntentPlan`, and a
  separate future generator creates `VerificationPlan` from the plan's
  verification requirements. Preserves the `WorkOrder` vs `VerificationPlan`
  boundary and allows separate gates and safety reviews.
- **Option C — one combined `WorkOrder` + `VerificationPlan` generator.**
  Rejected/deferred: too much blast radius; work guidance and proof planning need
  separate gates.
- **Option D — let `IntentStatusReport` generate downstream artifacts.**
  Rejected: `IntentStatusReport` is read-only status reporting.
- **Option E — jump to `intent:go`.** Rejected: execution remains deferred until
  work/proof generation, command execution, source-write policy, and governance
  are explicitly decided.

## Recommendation

Adopt **Option B**: separate, explicit, gated generators —
`PreparedIntentPlan → WorkOrder` and `PreparedIntentPlan → VerificationPlan` —
each decided, implemented, and safety-reviewed on its own. The recommended
sequence is: Intent WorkOrder Handoff Decision → implementation → safety review,
then Intent VerificationPlan Handoff Decision → implementation → safety review,
then an `IntentStatusReport` update / safety review if needed. `intent:go`
remains deferred until after all handoff and execution policies are explicit. The
next slice is the **Intent WorkOrder Handoff Decision**.

## WorkOrder Handoff Gate

Required inputs: `PreparedIntentPlan`, `IntentStatusReport`, optional latest
`PathFreshnessReport`, optional latest `RuntimeGraphDriftReport`.

Required state:

- `PreparedIntentPlan.approval.status === "approved"`.
- `PreparedIntentPlan.status.value === "prepared"`.
- `PreparedIntentPlan.status.recommendedNextAction === "create-work-order"`.
- `IntentStatusReport.status.value` is `work-ready` (or a future explicitly
  allowed equivalent).
- `IntentStatusReport` must not have high-severity blockers.
- `PathFreshnessReport` must not indicate stale scoped context, unless explicitly
  accepted in the prepared plan approval.
- `RuntimeGraphDriftReport` must not have new high-severity drift after the
  prepared plan, unless explicitly accepted in the prepared plan approval.

Blocks WorkOrder generation: `approval.status` not approved; `PreparedIntentPlan`
blocked / stale / insufficient / needs-review; `IntentStatusReport` stale /
assessment-blocked / preparation-blocked / verification-failed / needs-review;
freshness changed since plan approval; drift changed since plan approval; missing
required source refs. **WorkOrder generation must require a proof-approved
PreparedIntentPlan.**

## VerificationPlan Handoff Gate

Required inputs: `PreparedIntentPlan`, `IntentStatusReport`, optional `WorkOrder`
if generated.

Required state:

- `PreparedIntentPlan.approval.status === "approved"`.
- `PreparedIntentPlan.verificationRequirements` are present.
- `IntentStatusReport.status.value` is `work-ready`, `work-in-progress`, or
  `verification-ready`.
- VerificationPlan generation must preserve every verification requirement as
  traceable commands / checks.

Blocks VerificationPlan generation: no `verificationRequirements`;
`approval.status` not approved; intent status stale / blocked / needs-review
unless explicitly accepted; verification requirements ambiguous or unsafe.
**VerificationPlan generation must require PreparedIntentPlan verification
requirements.**

| Gate | Required State |
| --- | --- |
| WorkOrder generation | approved PreparedIntentPlan + work-ready status |
| VerificationPlan generation | approved PreparedIntentPlan + verification requirements |
| freshness recheck | no stale scoped context after approval |
| drift recheck | no new high-severity drift after approval |
| not-approved plan | generation blocked |
| needs-review status | generation blocked unless future explicit override exists |

## Freshness And Drift Recheck

Approval proof is captured at preparation time, so both generators must re-check
freshness and drift at handoff time. If `PathFreshnessReport` indicates stale
scoped context after approval, or `RuntimeGraphDriftReport` shows new
high-severity drift after approval, generation is blocked unless the prepared
plan's approval explicitly accepted that risk. This prevents a stale or drifted
plan from being handed off to downstream work or proof artifacts.

## Traceability Model

Generated `WorkOrder` must cite: `preparedIntentPlanRef`,
`intentAssessmentReportRef`, `intentStatusReportRef`, the source proof refs from
`PreparedIntentPlan.approval.proof`, and the phase ids / obligation ids used to
build guidance.

Generated `VerificationPlan` must cite: `preparedIntentPlanRef`,
`intentAssessmentReportRef`, `intentStatusReportRef`, the verification-requirement
ids used to build the plan, and the source proof refs from
`PreparedIntentPlan.approval.proof.verification`.

Neither generator may mutate `PreparedIntentPlan`, mutate `IntentStatusReport`,
mark anything complete, execute commands, or write source files. **Generated
WorkOrder and VerificationPlan must trace back to PreparedIntentPlan.**

## WorkOrder Generation Model

Sketch only; not implemented in this batch.

```ts
type IntentWorkOrderSource = {
  preparedIntentPlanRef: ArtifactRef;
  intentAssessmentReportRef?: ArtifactRef;
  intentStatusReportRef?: ArtifactRef;
  runtimeGraphDriftReportRef?: ArtifactRef;
  pathFreshnessReportRef?: ArtifactRef;
};

type IntentWorkOrderGenerationPolicy = {
  requiredApprovalStatus: "approved";
  allowedIntentStatuses: ["work-ready"];
  requireFreshnessRecheck: true;
  requireDriftRecheck: true;
  sourceWriteAllowed: false;
};
```

Generated `WorkOrder` content should include: goal; selected phases; touched
paths; capability / step / handoff obligations; preservation constraints; a
verification-requirement summary; explicit non-goals; and source refs.

## VerificationPlan Generation Model

Sketch only; not implemented in this batch.

```ts
type IntentVerificationPlanSource = {
  preparedIntentPlanRef: ArtifactRef;
  intentAssessmentReportRef?: ArtifactRef;
  intentStatusReportRef?: ArtifactRef;
  workOrderRef?: ArtifactRef;
};

type IntentVerificationPlanGenerationPolicy = {
  requiredApprovalStatus: "approved";
  requireVerificationRequirements: true;
  executeCommands: false;
  sourceWriteAllowed: false;
};
```

Generated `VerificationPlan` should include: commands / checks derived from
`PreparedIntentPlan.verificationRequirements`; the reason for each command /
check; source refs; the expected result type; and no execution result.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| handoff vs intent:go | artifact generation, not execution |
| WorkOrder vs VerificationPlan | separate downstream artifacts |
| IntentStatusReport vs generators | status gates, does not generate |
| PreparedIntentPlan vs WorkOrder | proof-approved plan feeds guidance |
| PreparedIntentPlan vs VerificationPlan | requirements feed proof plan |
| generator vs source writes | no writes |

**Intent work/proof handoff is artifact generation, not intent:go.** **Handoff
generation does not execute commands.** **Handoff generation does not write
source files.** **intent:go remains deferred.**

## What This Does Not Do

This decision implements no `WorkOrder` generation and no `VerificationPlan`
generation. It creates no `WorkOrder` / `VerificationPlan` / `VerificationRun` /
`VerificationResult`, executes nothing, writes no source, implements no
`intent:go`, registers no artifact type, adds no CLI command, mutates no
`IntentAssessmentReport` / `PreparedIntentPlan` / `IntentStatusReport` /
`WorkOrder` / `VerificationPlan` / `VerificationRun` / `VerificationResult` /
`PathFreshnessReport` / `RuntimeGraphDriftReport`, imports nothing from classic
codebase-intel, bumps no version, and publishes nothing.

## Implementation Sequence

| Future Slice | Role |
| --- | --- |
| Intent WorkOrder Handoff Decision | decide WorkOrder generator shape |
| Intent WorkOrder Handoff Implementation | create WorkOrder from approved plan |
| Intent WorkOrder Handoff Safety Review | review generator |
| Intent VerificationPlan Handoff Decision | decide VerificationPlan generator shape |
| Intent VerificationPlan Handoff Implementation | create VerificationPlan from requirements |
| Intent VerificationPlan Handoff Safety Review | review generator |
| intent:go | still deferred |

1. **Intent Work / Proof Handoff Decision** (this memo).
2. **Intent WorkOrder Handoff Decision** — decide the exact `WorkOrder` generator
   shape from a proof-approved `PreparedIntentPlan`. Still no implementation.
3. WorkOrder handoff implementation → safety review; then the VerificationPlan
   handoff decision → implementation → safety review; then (much later)
   `intent:go`.

## Cross-References

- [IntentStatusReport safety review](intent-status-report-safety-review.md)
- [IntentStatusReport v1 decision](intent-status-report-v1-decision.md)
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

> Decided (slice 89): the Intent WorkOrder handoff uses an explicit gated WorkOrder generator (rekon intent work-order generate) that creates one WorkOrder from a proof-approved PreparedIntentPlan after the approval / IntentStatusReport work-ready / freshness / drift gates pass. Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go; WorkOrder generation must require a proof-approved PreparedIntentPlan; IntentStatusReport gates WorkOrder generation but does not generate WorkOrder; generated WorkOrder must trace back to PreparedIntentPlan; WorkOrder generation does not create VerificationPlan, execute commands, or write source files; intent:go remains deferred. See [Intent WorkOrder Handoff Decision](intent-work-order-handoff-decision.md).

> Shipped (slice 90): the Intent WorkOrder handoff generator shipped — `rekon intent work-order generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck) and writes exactly one `WorkOrder` (`source: "intent-handoff"`) that traces back to the plan / status / assessment refs and the phase / obligation / verification-requirement ids. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; it creates no `VerificationPlan`, executes no commands, and writes no source files; intent:go remains deferred. See [intent WorkOrder handoff](../concepts/intent-work-order-handoff.md).

> Reviewed (slice 91): the Intent WorkOrder handoff is safe/stable as an explicit gated WorkOrder generator — `rekon intent work-order generate` requires a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready + a handoff-time freshness / drift recheck); the blocked path writes no `WorkOrder`, and the generated path writes exactly one `WorkOrder` that traces back to the plan. **Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go**; WorkOrder generation creates no `VerificationPlan` / `VerificationRun` / `VerificationResult`, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Decision. See [Intent WorkOrder Handoff Safety Review](./intent-work-order-handoff-safety-review.md).

> Decided (slice 92): the Intent VerificationPlan handoff uses an explicit gated `VerificationPlan` generator (`rekon intent verification-plan generate`) that creates one `VerificationPlan` from a proof-approved `PreparedIntentPlan`'s verification requirements after the approval / IntentStatusReport (work-ready / work-in-progress / verification-ready) / `verificationPlanAllowed` / freshness / drift gates pass. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; it requires a proof-approved PreparedIntentPlan and non-empty verification requirements; IntentStatusReport gates generation but does not generate VerificationPlan; generated VerificationPlan must trace back to PreparedIntentPlan; VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. WorkOrder is optional in v1 (cited when available). Next: Intent VerificationPlan Handoff Implementation. See [Intent VerificationPlan Handoff Decision](./intent-verification-plan-handoff-decision.md).

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](../concepts/intent-verification-plan-handoff.md).

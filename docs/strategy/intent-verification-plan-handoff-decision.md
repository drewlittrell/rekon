# Intent VerificationPlan Handoff Decision

## Decision Summary

The Intent Work / Proof Handoff Decision (`1d19a4f`) selected separate, explicit,
gated generators: `PreparedIntentPlan → WorkOrder` and
`PreparedIntentPlan → VerificationPlan`. The first half shipped and was
safety-reviewed (`f6ad00c`). This decision pins the second half — the exact
`VerificationPlan` generator shape, gate model, freshness / drift recheck,
verification-requirement mapping, traceability model, command-safety posture, and
implementation sequence for generating a `VerificationPlan` from
`PreparedIntentPlan.verificationRequirements`.

**The decision selects the explicit gated VerificationPlan generator
(Option B).** A future `rekon intent verification-plan generate` command reads a
proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` and a
handoff-time freshness / drift recheck) and writes exactly one new
`VerificationPlan` artifact — it executes no commands, creates no
`VerificationRun` / `VerificationResult`, generates no `WorkOrder`, and writes no
source. This batch decides the shape only; it implements no generator.

**Intent VerificationPlan handoff is VerificationPlan artifact generation, not
intent:go.** **VerificationPlan generation must require a proof-approved
PreparedIntentPlan.** **VerificationPlan generation must require PreparedIntentPlan
verification requirements.** **IntentStatusReport gates VerificationPlan generation
but does not generate VerificationPlan.** **Generated VerificationPlan must trace
back to PreparedIntentPlan.** **VerificationPlan generation does not create
WorkOrder.** **VerificationPlan generation does not create VerificationRun or
VerificationResult.** **VerificationPlan generation does not execute commands.**
**VerificationPlan generation does not write source files.** **intent:go remains
deferred.**

## Why This Decision Exists

`PreparedIntentPlan` emits `verificationRequirements` as proof obligations, and
the WorkOrder handoff now maps an approved plan into implementation guidance. The
remaining boundary is converting those proof obligations into a `VerificationPlan`
artifact — a list of verification commands that *prove* the work is correct. That
conversion is close to command execution, so the generator must be explicitly
gated, traceable, command-safe, and read-only over its inputs. Classic intent kept
proof planning explicit and never executed commands as a side effect of planning;
Rekon preserves that discipline by pinning the gate, the recheck, the mapping, and
the command-safety posture before any generator is built.

## Current Boundary

The intent spine is read-only and additive: assessment, preparation, status, and
the WorkOrder handoff consume materialized artifacts and mutate none of them. The
shipped proof envelope already records
`approval.proof.downstreamHandoff.verificationPlanAllowed` (true only when
`approval.status === "approved"`) and `sourceWriteAllowed` (always false), and
`IntentStatusReport.status.value` already includes `work-ready`,
`work-in-progress`, and `verification-ready`. This decision adds only the *shape*
of a generator that would read a proof-approved `PreparedIntentPlan` (with
`IntentStatusReport`, optional `WorkOrder`, `PathFreshnessReport`, and
`RuntimeGraphDriftReport` as gating / context inputs) and write a downstream
`VerificationPlan` — never executing commands, never writing source, never
creating a `VerificationRun` / `VerificationResult` / `WorkOrder`, and never
mutating its inputs.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| manual VerificationPlan only | rejected/deferred | leaves proof planning disconnected |
| explicit gated VerificationPlan generator | selected | completes separate proof-planning handoff |
| require WorkOrder first | rejected/deferred | WorkOrder is useful context, not always prerequisite |
| combined WorkOrder + VerificationPlan generator | rejected | separate gates are safer |
| create VerificationRun directly | rejected | execution/proof result boundary |
| intent:go creates VerificationPlan | rejected | execution deferred |

- **Option A — manual VerificationPlan only.** Rejected/deferred: manual handoff
  preserves safety but leaves proof planning disconnected from the intent spine
  and duplicates operator work.
- **Option B — explicit gated VerificationPlan generator.** Selected: a future
  generator creates one `VerificationPlan` from a proof-approved
  `PreparedIntentPlan`'s verification requirements after the status / freshness /
  drift gates pass, completing the proof-planning half of the separate-generator
  model while preserving explicit gates.
- **Option C — require WorkOrder first.** Rejected/deferred: verification
  requirements originate in `PreparedIntentPlan` and can be planned independently;
  `WorkOrder` is useful context, not a prerequisite. The existing `VerificationPlan`
  schema makes `workOrderRef` **optional** (`workOrderRef?: ArtifactRef`; the
  runtime validates headers only), so nothing forces WorkOrder linkage. WorkOrder
  is therefore **optional in v1**, cited for traceability and status context when
  available.
- **Option D — combined `WorkOrder` + `VerificationPlan` generator.** Rejected:
  work guidance and proof planning are separate downstream artifacts with
  different gates and safety reviews.
- **Option E — create `VerificationRun` directly.** Rejected: `VerificationRun`
  is execution / proof-result territory; this slice decides proof planning only.
- **Option F — `intent:go` creates `VerificationPlan`.** Rejected: `intent:go`
  remains deferred; VerificationPlan generation must be explicit and non-executing.

## Recommendation

Adopt **Option B**: an explicit gated Intent VerificationPlan generator. The
future command shape is:

```sh
rekon intent verification-plan generate \
  --prepared-plan <PreparedIntentPlan:id|type:id> \
  [--intent-status <IntentStatusReport:id|type:id>] \
  [--work-order <WorkOrder:id|type:id>] \
  [--path-freshness <PathFreshnessReport:id|type:id>] \
  [--runtime-drift <RuntimeGraphDriftReport:id|type:id>]
```

Inputs: `PreparedIntentPlan` (required); `IntentStatusReport` (required, or the
latest generated if absent); `WorkOrder` (optional, cited when available);
`PathFreshnessReport` (optional, checked when available); `RuntimeGraphDriftReport`
(optional, checked when available); `IntentAssessmentReport` via the prepared
plan's source refs. Output: exactly one new `VerificationPlan` artifact. It outputs
no `WorkOrder`, no `VerificationRun`, no `VerificationResult`, and no source files.
The next slice is the Intent VerificationPlan Handoff Implementation.

## VerificationPlan Generation Gate

VerificationPlan generation is allowed only when **all** are true:

1. `PreparedIntentPlan` exists.
2. `PreparedIntentPlan.approval.status === "approved"`.
3. `PreparedIntentPlan.status.value === "prepared"`.
4. `PreparedIntentPlan.verificationRequirements` is non-empty.
5. `IntentStatusReport` exists.
6. `IntentStatusReport.status.value` is one of `work-ready`, `work-in-progress`,
   `verification-ready`.
7. `IntentStatusReport` has no high-severity blockers.
8. `PreparedIntentPlan.approval.proof.downstreamHandoff.verificationPlanAllowed === true`.
9. `PreparedIntentPlan.approval.proof.downstreamHandoff.sourceWriteAllowed === false`.
10. Freshness recheck passes.
11. Runtime drift recheck passes.

| Gate | Required State |
| --- | --- |
| PreparedIntentPlan approval | approval.status approved |
| PreparedIntentPlan status | status.value prepared |
| verification requirements | non-empty and safe |
| IntentStatusReport | work-ready / work-in-progress / verification-ready |
| blockers | no high-severity blockers |
| freshness recheck | no stale scoped context after approval |
| drift recheck | no new high-severity drift after approval |
| downstream handoff | verificationPlanAllowed true and sourceWriteAllowed false |

The proof-planning status set is broader than the WorkOrder handoff's
(`work-ready` only) because proof planning is also meaningful once work is in
progress or verification-ready — but the approval, prepared, `verificationPlanAllowed`,
and freshness / drift gates remain identical in spirit.

## Blocks VerificationPlan Generation

Generation is blocked (and writes no `VerificationPlan`) by any of:

- missing `PreparedIntentPlan`.
- `PreparedIntentPlan.approval.status !== "approved"`.
- `PreparedIntentPlan.status.value !== "prepared"`.
- `PreparedIntentPlan.verificationRequirements` empty.
- missing `IntentStatusReport`.
- `IntentStatusReport.status.value` not allowed for proof planning.
- `IntentStatusReport` high-severity blocker.
- stale scoped `PathFreshnessReport` after plan approval.
- new high-severity `RuntimeGraphDriftReport` drift after plan approval.
- missing required source refs.
- ambiguous verification requirement.
- unsafe verification command.
- `PreparedIntentPlan.approval.proof.downstreamHandoff.verificationPlanAllowed !== true`.
- `PreparedIntentPlan.approval.proof.downstreamHandoff.sourceWriteAllowed !== false`.

Each block is a deterministic, stable-category blocker; a blocked handoff sets a
non-zero exit code and writes no `VerificationPlan`.

## Freshness And Drift Recheck

The generator must compare the latest or pinned `PathFreshnessReport` and
`RuntimeGraphDriftReport` against the proof refs recorded in
`PreparedIntentPlan.approval.proof` (`freshness.pathFreshnessReportRef`,
`runtimeDrift.runtimeGraphDriftReportRef`). If the latest freshness state reports
stale scoped context, or the latest drift state has new high-severity drift, after
plan approval, generation blocks. Both inputs are optional — an absent report does
not block — matching the WorkOrder handoff's "checked when available" rule.

For this decision **no override is implemented and no override is assumed.** A
future explicit accepted-risk override is out of scope.

## Verification Requirement Mapping

`PreparedIntentPlan.verificationRequirements` (shape
`{ id, command?, reason, sourceRefs }`) maps into the `VerificationPlan` as follows:

| PreparedIntentPlan Surface | VerificationPlan Mapping |
| --- | --- |
| verification requirement id | check / trace id |
| verification requirement command | command / check text |
| verification requirement reason | rationale |
| verification requirement sourceRefs | evidence / refs |
| request goal | verification scope |
| phases | coverage context |
| obligations | preservation / proof context |
| source refs | traceability |

The existing `VerificationPlan` carries `workOrderRef?`, `commands` (a list of
shell-command strings), `successCriteria`, and `source`. Requirement `command`
values populate `commands`; requirement `reason` values populate
`successCriteria` / rationale. A requirement **without** a command (e.g.
`verify:document-findings`) maps to a guidance check / success criterion only — it
contributes no executable command string.

Because the existing `VerificationPlan` shape is narrower than the full intent
context, the implementation should mirror the WorkOrder handoff: add an additive
`source: "intent-handoff"` value and a single additive, backwards-compatible
`intentHandoff` block (the runtime validates headers only, so additive
`VerificationPlan` body fields keep `artifacts validate` clean):

```ts
intentHandoff?: {
  preparedIntentPlanRef: ArtifactRef;
  intentAssessmentReportRef?: ArtifactRef;
  intentStatusReportRef?: ArtifactRef;
  workOrderRef?: ArtifactRef;
  verificationRequirementIds: string[];
  phaseIds: string[];
  obligationIds: string[];
  boundary: {
    createsVerificationRun: false;
    executesCommands: false;
    writesSourceFiles: false;
  };
};
```

Do not invent fields the existing `VerificationPlan` cannot support without the
additive block.

## Traceability Model

Every generated `VerificationPlan` must cite:

- `preparedIntentPlanRef`.
- `intentAssessmentReportRef` (via the prepared plan's source refs).
- `intentStatusReportRef`.
- `workOrderRef` when available.
- the `PreparedIntentPlan.approval.proof` refs (freshness / drift) it was gated by.
- the `verificationRequirement` ids used to build checks.
- the phase ids used for coverage context.
- the obligation ids used for proof context.

The header `inputRefs` carries the same refs. Traceability is descriptive only —
it grants no authority and triggers no downstream action. The generated plan must
also include boundary fields or text stating that it was generated from a
proof-approved `PreparedIntentPlan`, that it does not create `VerificationRun`,
does not execute commands, and does not write source files.

## Verification Command Safety

VerificationPlan generation may include commands / checks **as text**; it must
**not execute** them, and it must reject or flag unsafe / ambiguous commands.

v1 safety posture: allow deterministic command strings copied verbatim from
`PreparedIntentPlan.verificationRequirements[].command`. Reject or mark
needs-review:

- an empty command when a command is required by the requirement.
- commands containing shell control operators (`;`, `&&`, `||`, `|`, backticks,
  `$(`, redirects) unless already permitted by existing `VerificationPlan`
  convention.
- commands containing source-write or destructive tokens (`rm `, `>` redirects,
  `git push`, `npm publish`, `--write`, etc.).
- anything not representable as a clear single command / check string.

Because command safety cannot be fully enforced at decision time, the
implementation must include a conservative command sanitizer that classifies each
requirement command as safe / needs-review / rejected, blocks generation on a
rejected command, and surfaces needs-review commands in the plan without executing
them.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| VerificationPlan handoff vs intent:go | artifact generation, not execution |
| VerificationPlan generator vs IntentStatusReport | status gates, generator writes |
| VerificationPlan generator vs WorkOrder | no work guidance creation |
| VerificationPlan generator vs VerificationRun / VerificationResult | no command/proof result creation |
| VerificationPlan generator vs command execution | no commands are run |
| VerificationPlan generator vs source writes | no writes |
| VerificationPlan generator vs PreparedIntentPlan | consumes approved plan, mutates nothing |

## What This Does Not Do

This decision implements no generator. It creates no `VerificationPlan`, no
`VerificationRun`, no `VerificationResult`, and no `WorkOrder`; it executes no
commands and writes no source files. It mutates no `IntentAssessmentReport`,
`PreparedIntentPlan`, `IntentStatusReport`, `WorkOrder`, `VerificationPlan`,
`VerificationRun`, `VerificationResult`, `PathFreshnessReport`, or
`RuntimeGraphDriftReport`. It implements no `intent:go`. It bumps no versions and
publishes nothing.

## Implementation Sequence

1. **Intent VerificationPlan Handoff Implementation** (next slice): a
   `buildIntentVerificationPlanHandoff` helper + `rekon intent verification-plan
   generate` CLI that runs the gate above, maps requirements → commands with the
   conservative sanitizer, and writes exactly one `VerificationPlan`
   (`source: "intent-handoff"` + additive `intentHandoff` block) on a passing
   gate; blocked otherwise. Reuse the existing `VerificationPlan` artifact type
   (no new registration); additive optional fields only.
2. **Intent VerificationPlan Handoff Safety Review**: ground review of the shipped
   generator.
3. Deferred beyond this track: `VerificationRun` generation, command execution,
   source writes, and `intent:go`.

> Shipped (slice 93): the Intent VerificationPlan handoff generator shipped — `rekon intent verification-plan generate` reads a proof-approved `PreparedIntentPlan` (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, and writes exactly one `VerificationPlan` (`source: "intent-handoff"`) that traces back to the plan; the blocked gate writes none. **Intent VerificationPlan handoff generates VerificationPlan only from a proof-approved PreparedIntentPlan**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Next: Intent VerificationPlan Handoff Safety Review. See [intent VerificationPlan handoff](../concepts/intent-verification-plan-handoff.md).

> Reviewed (slice 94): the Intent VerificationPlan handoff is safe/stable as an explicit gated VerificationPlan generator — `rekon intent verification-plan generate` requires a proof-approved `PreparedIntentPlan` with non-empty verification requirements (gated by `IntentStatusReport` work-ready / work-in-progress / verification-ready + a handoff-time freshness / drift recheck), classifies each requirement command for safety, blocks unsafe / ambiguous commands, and writes exactly one `VerificationPlan` on pass; the blocked path writes none. **Intent VerificationPlan handoff is VerificationPlan artifact generation, not intent:go**; WorkOrder is optional in v1 (cited when available); VerificationPlan generation creates no WorkOrder / VerificationRun / VerificationResult, executes no commands, and writes no source files; intent:go remains deferred. Plan bundle / LLM-agent handoff directory work is deferred to the next phase. Next: Intent Plan Bundle / Agent Handoff Directory Decision. See [Intent VerificationPlan Handoff Safety Review](./intent-verification-plan-handoff-safety-review.md).

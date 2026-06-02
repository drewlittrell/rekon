# Intent Prepare Actionability Integration Safety Review

## Decision Summary

The slice-131 integration between `IntentPlanActionabilityReport` and `rekon intent
prepare` is **safe/stable**. Grounded in the shipped code at `73c2519`, prepare now
respects plan actionability without gaining any execution power or approval authority.
**`intent prepare` respects IntentPlanActionabilityReport.** A non-actionable report
turns preparation into a blocked, revision-guidance response; an actionable report only
shapes the *structure* of a `PreparedIntentPlan`. No blocker was found.

Recommended decision: **Intent Prepare Integration With Actionability Report is
safe/stable.** Recommended next slice: **Plan Actionability Answer / Merge-Back
Decision** — restore the classic `askPreparedPhaseQuestions` /
`answerPreparedPhaseQuestions` loop (questions → answers → revised report → actionable
plan) so the compiler loop reaches parity. **Answer/merge-back remains deferred.**

## Why This Review Exists

Rekon restored a report-only plan compiler (`rekon intent plan review` →
`IntentPlanActionabilityReport`, slice 129; safety-reviewed slice 130), and slice 131
wired that report into `rekon intent prepare`. Wiring a *gate* into preparation is the
kind of change that can quietly leak authority — auto-approving plans, letting weak
plans become handoff candidates, or coupling a structural input to the approval/proof
envelope. This review re-reads the shipped implementation to confirm the gate holds and
the boundary is intact before the next compiler-loop slice (answer/merge-back) is built
on top of it.

The original problem: Rekon had report-only plan review, but prepare still needed to
*respect* it; weak plans should not silently become handoff candidates, and actionable
review output should be usable by prepare **without** granting approval. This review
confirms those guarantees survived implementation.

## Implementation Reviewed

Reviewed at `73c2519`:

- `packages/capability-model/src/prepared-intent-plan.ts` — the
  `PreparedIntentActionabilityReportLike` structural type, the two optional additive
  inputs (`intentPlanActionabilityReport`, `intentPlanActionabilityReportRef`),
  `mapReportPhaseKind`, the report-ref push into the plan's `refList`, and the
  actionable-report phase/verification override block.
- `packages/capability-model/src/index.ts` — barrel re-export of the new `Like` type.
- `packages/cli/src/index.ts` — the `intent prepare` branch: flag resolution
  (`--actionability-report` / `--plan-actionability-report`), the type check, the
  non-actionable blocked path, the `inputRefs` wiring, the `buildPreparedIntentPlan`
  call, the success output, and `usage()`.
- Tests `tests/contract/intent-prepare-actionability-integration.test.mjs` (27
  assertions) and `tests/docs/intent-prepare-actionability-integration.test.mjs` (12
  assertions), plus the slice-131 strategy memo + review packet.

Two structural facts make the gate sound:

1. In the CLI, the non-actionable block runs **before** the `buildPreparedIntentPlan`
   call and `return`s. The helper therefore only ever sees an actionable report (or
   none). The helper itself is pure: it reads no files, executes nothing, and mutates
   no input.
2. The helper's actionable-report override only rewrites the local `phases` and
   `verificationRequirements` arrays. It never touches `approval` or `status` — so an
   actionable report cannot elevate approval.

## Non-Actionable Report Path Review

When a report is supplied whose `status.value` is not `actionable` (i.e.
`needs-revision` or `blocked`), the CLI sets `process.exitCode = 1` and returns a
blocked response without writing any artifact. **Non-actionable reports block
preparation.** **Blocked preparation writes no PreparedIntentPlan.** The JSON response
is `{ status: "blocked", reason: "plan-actionability-<status>", actionabilityReport:
{type,id}, summary: {findings, questions}, revisionPrompt, boundaries }`, where every
one of the nine boundary booleans is `false`. The `revisionPrompt` is read verbatim
from the report (`revisionPrompt.prompt`), and the findings/questions counts come from
`summary` — so **blocked preparation preserves revisionPrompt** and exposes the
findings/questions summary the operator (or their agent) needs to revise and re-run.
The human-readable branch prints the same facts plus the explicit sentence that no
`PreparedIntentPlan`, `WorkOrder`, `VerificationPlan`, `VerificationRun`,
`VerificationResult`, commands, source writes, Circe run, or `intent:go` were created.

## Actionable Report Path Review

When the report's `status.value` is `actionable` and the plan is implementation-bearing
(status `prepared`, or a needs-review draft with implementation phases), the helper
derives prepared phases and verification requirements from the report's
`normalizedPhases`. **Actionable reports may feed PreparedIntentPlan generation.** The
override is gated on `useReportPhases = status.value === "actionable" && drafts.length >
0 && (statusValue === "prepared" || draftImplementationBearing)` — an actionable report
attached to a non-implementation plan does not fabricate phases. Crucially, the override
replaces only `phases` and `verificationRequirements`; the approval envelope, the proof
record, and `status.value` are computed exactly as in the assessment-only path. An
actionable report attached to a needs-review draft yields phases with status
`needs-review` and an unchanged `approval.status` of `needs-review`. **Prepare does not
auto-approve.**

## Prepared Plan Mapping Review

The report ref is pushed into the plan's `refList`, which becomes both the plan's
`header.inputRefs` (via the CLI `inputRefs` array) and each derived phase's / verification
requirement's `sourceRefs`.
**PreparedIntentPlan records the IntentPlanActionabilityReport ref.**
Each `normalizedPhases[i]` maps to one `PreparedIntentPhase`: draft order
is preserved by zero-padded ids (`phase:plan-001`, `phase:plan-002`, …) so the factory's
id-sort is stable; `kind` is mapped through `mapReportPhaseKind` (unknown / unexpected →
`modify`); `objective` becomes the phase `goal` (falling back to the request goal when
empty); `touchedPaths` become the phase `paths`; per-phase `verificationCommands` and
`evidenceArtifacts` become `verificationRequirements`. Deliverables and acceptance
criteria — which have no dedicated kernel field — are carried into phase `constraints`
with `deliverable:` / `acceptance:` prefixes (a documented limitation, not a regression).
Kernel `PreparedIntentPlan` types, factory, and validator are unchanged.

## CLI Review

`rekon intent prepare --assessment <ref> [--actionability-report <ref>] [--root <path>]
[--json]` accepts `--actionability-report` (canonical) and `--plan-actionability-report`
(alias). The referenced artifact is type-checked: a non-`IntentPlanActionabilityReport`
ref throws before any plan is written. Absent the flag, behavior is unchanged
(backward-compatible) — the non-actionable block is guarded on `actionabilityValue &&
actionabilityRef`, so a missing flag skips it. Success output (JSON + human) surfaces the
actionability report ref when present. `usage()` and the canonical flow line both show
the optional flag. No CLI surface executes commands, writes source, or runs Circe.

## Boundary Review

The integration adds no execution power. **Prepare creates no WorkOrder.** **Prepare
creates no VerificationPlan.** **Prepare creates no VerificationRun or
VerificationResult.** **Prepare executes no commands.** **Prepare writes no source
files.** **Prepare runs no Circe.** **intent:go remains deferred.** Downstream WorkOrder
/ VerificationPlan generation still require explicit approval and a work-ready status,
exactly as before. The source plan file and the `IntentPlanActionabilityReport` are read,
never mutated. The blocked path writes nothing at all; the actionable path writes exactly
one `PreparedIntentPlan` and no other artifact.

### Surface table

| Surface | Status | Safety Finding |
| --- | --- | --- |
| --actionability-report | shipped | explicit prepare input |
| --plan-actionability-report | shipped | alias |
| non-actionable report path | shipped | blocks / writes no plan |
| actionable report path | shipped | writes one PreparedIntentPlan |
| header.inputRefs | shipped | report ref recorded |
| revisionPrompt | shipped | preserved on block |
| approval | unchanged | no auto-approval |

### Mapping table

| Report Field | PreparedIntentPlan Mapping |
| --- | --- |
| normalizedPhases[].order | zero-padded phase id ordering |
| normalizedPhases[].kind | PreparedIntentPhase.kind |
| normalizedPhases[].objective | PreparedIntentPhase.goal |
| normalizedPhases[].touchedPaths | PreparedIntentPhase.paths |
| normalizedPhases[].verificationCommands | verificationRequirements |
| report ref | header.inputRefs |

### Boundary table

| Boundary | Decision |
| --- | --- |
| non-actionable report | no PreparedIntentPlan |
| actionable report | PreparedIntentPlan allowed |
| prepare vs approval | no auto-approval |
| prepare vs WorkOrder | not created |
| prepare vs VerificationPlan | not created |
| prepare vs VerificationRun / Result | not created |
| prepare vs command execution | no execution |
| prepare vs source writes | no writes |
| prepare vs Circe | does not run Circe |
| prepare vs intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare integration safe/stable | selected | actionability gate holds |
| answer/merge-back next | selected | restores old iterative loop |
| full handoff review next | deferred | useful after merge-back or as system review |
| auto-approve actionable reports | rejected | approval remains explicit |
| silently prepare non-actionable reports | rejected | would bypass compiler loop |

## Recommendation

**Intent Prepare Integration With Actionability Report is safe/stable.** No blocker.
The default next slice is **Plan Actionability Answer / Merge-Back Decision**: Rekon now
produces elicitation questions and blocks non-actionable preparation, but still needs the
answer/merge-back loop (questions → answers → revised report / actionable plan → prepare
consumes actionable report) to reach parity with the old plan compiler's
`askPreparedPhaseQuestions` / `answerPreparedPhaseQuestions`. The alternative —
**Fresh Repo Intent Handoff End-to-End Safety Review** — is a useful whole-path review
but is deferred, because compiler-loop parity still requires merge-back first.

## What This Does Not Do

This review changes no runtime behavior and no implementation. It does not change the
prepare integration, does not change `IntentPlanActionabilityReport` behavior, does not
implement answer/merge-back, does not auto-approve, and does not relax approval gates. It
creates no `WorkOrder`, `VerificationPlan`, `VerificationRun`, or `VerificationResult`;
executes no commands; writes no source files; runs no Circe; and does not implement
`intent:go`. No version bump, no npm publish, no branch.

## Follow-Up Work

1. **Plan Actionability Answer / Merge-Back Decision** (decided — slice 133) — selected
   Option B: a future `rekon intent plan answer` writes a new
   `IntentPlanActionabilityReport` revision (source report + plan file immutable;
   answers tied to question ids; re-runs actionability). Still no source writes, no
   command execution, no auto-approval, no `intent:go`. See
   [`plan-actionability-answer-merge-back-decision.md`](./plan-actionability-answer-merge-back-decision.md) (shipped: [`plan-actionability-answer-merge-back-implementation.md`](./plan-actionability-answer-merge-back-implementation.md)).
2. **Fresh Repo Intent Handoff End-to-End Safety Review** (alternative) — a whole-path
   review of scan → context → review → assess → prepare → status → approve → work-order
   / verification-plan → bundle → Circe projection.

## Related

- Integration: [`intent-prepare-actionability-integration.md`](./intent-prepare-actionability-integration.md)
- Report safety review: [`intent-plan-actionability-report-safety-review.md`](./intent-plan-actionability-report-safety-review.md)
- Report implementation: [`intent-plan-actionability-report-implementation.md`](./intent-plan-actionability-report-implementation.md)
- Compiler concept: [`intent-plan-compiler.md`](../concepts/intent-plan-compiler.md)
- Artifacts: [`IntentPlanActionabilityReport`](../artifacts/intent-plan-actionability-report.md), [`PreparedIntentPlan`](../concepts/prepared-intent-plan.md)
- Review packet: [`intent-prepare-actionability-integration-safety-review.md`](../../.rekon-dev/review-packets/intent-prepare-actionability-integration-safety-review.md)

> **Loop closure (slice 135):** the full plan compiler loop (review → answer → merge-back → prepare) is proven end-to-end on a fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle handoff — see [`plan-compiler-loop-closure.md`](./plan-compiler-loop-closure.md).

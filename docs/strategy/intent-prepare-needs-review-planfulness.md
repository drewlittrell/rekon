# Intent Prepare Needs-Review Planfulness Fix

## Summary

On a fresh repository, `rekon intent assess` can reach `needs-review` with **zero hard blockers**,
yet `rekon intent prepare` previously produced only a `phase:review` plan with zero verification
requirements — leaving an operator with nothing implementation-bearing to review or later approve.
This fix makes `rekon intent prepare` produce a useful, reviewable **draft plan** in that case.
**Needs-review assessments with zero hard blockers produce implementation-bearing draft plans.**
**Draft plans remain needs-review until explicit approval.** **`intent prepare` must not auto-approve
needs-review plans.** The downstream handoff gates are untouched: **WorkOrder generation remains
blocked until explicit approval.** **VerificationPlan generation remains blocked until explicit
approval.** And the V1 boundary holds: **No commands are executed.** **No source files are written.**

## The Gap

After the fresh-repo context fixes (StepCapabilityGraph, RuntimeGraphObservationReport,
RuntimeGraphDriftReport, HandoffCoverageReport all present), the documented fresh-repo path works
through context generation:

```
rekon scan → rekon intent context prepare → rekon intent assess
```

`rekon intent assess` returns `readiness = needs-review` with **no hard blockers** (warnings only).
But `rekon intent prepare` then returned:

```
status.value          = needs-review
approval.status       = needs-review
approval.reasons      = [verification-proof-missing, runtime-drift-unresolved]
phases                = [phase:review]
verificationRequirements = (none)
```

The handoff commands then correctly blocked (`plan-not-approved`, `plan-not-prepared`,
`next-action-not-work-order`, `status-not-work-ready`, `handoff-not-allowed`) — but the operator had
no implementation-bearing plan to act on. The context-generation problem was fixed; the remaining
problem was a **planfulness gap**.

## Root Cause

In `@rekon/capability-model`'s `buildPreparedIntentPlan`, both the verification-requirement block and
the implementation-phase block were gated on `statusValue === "prepared"`. Any `needs-review` plan —
even one with an implementation-bearing request and matched context and zero hard blockers — fell
through to a single `phase:review` with no requirements. The approval/proof envelope was already
correct (it keeps the plan `needs-review` because runtime drift is unaccepted and verification proof
results are missing); only the **plan structure** was impoverished.

## Planfulness Policy

An assessment with **hard blockers** remains blocked and may produce only review / blocker guidance.

An assessment with readiness `needs-review` and **zero hard blockers** now produces an
implementation-bearing draft plan when the request is implementation-bearing (`feature`, `bug`,
`refactor`, `migration`) and its matched context is present. The plan still reports:

```
status.value    = needs-review
approval.status = needs-review
```

`approval.reasons` continue to include the unresolved proof issues (e.g. `verification-proof-missing`,
`runtime-drift-unresolved`). The plan does **not** become `prepared`, does **not** become `approved`,
and its `recommendedNextAction` stays `human-review` — never `create-work-order` — until a future
explicit approval bridge exists.

## Phase Model

For an implementation-bearing draft, the plan includes:

| Request kind | Draft phases |
| --- | --- |
| feature | investigate, modify, verify, review |
| bug | investigate, modify, verify, review |
| refactor | investigate, refactor, verify, review |
| migration | investigate, modify, verify, review |
| documentation / unknown | review only |

**Draft plans include implementation phases when the request requires work.** All draft phases carry
`needs-review` status; they are a reviewable proposal, not an approved plan.

## Verification Requirement Model

Safe default verification requirements are derived from the repository's `package.json` scripts.
**Draft plans include verification requirements when safe repository scripts exist.** Only command
**strings** are recorded — nothing is executed.

| Script present | Requirement | Command |
| --- | --- | --- |
| `typecheck` | verify:typecheck | `npm run typecheck` |
| `test` | verify:test | `npm test` |
| `build` | verify:build | `npm run build` |

When the script set is unknown, the standard safe trio is assumed. When a known script list contains
none of these, a manual reviewer-gated requirement (`verify:manual-review`, no command) is recorded
instead — an implementation-bearing draft is never left empty, and missing proof is recorded as
needs-review rather than invented.

## Phase Attachment

Safe verification requirements attach to the implementation phase (`phase:modify` / `phase:refactor`)
and the `phase:verify` phase; `phase:investigate` and `phase:review` stay reviewer-gated unless
explicit requirements apply. This makes the existing phase-level verification posture do the right
thing: `phase-modify` gains executable posture when a safe command requirement applies, `phase-verify`
carries final verification, and manual phases stay explicit.

## Approval Boundary

This fix changes only the **plan structure** that `intent prepare` emits. It does not weaken
approval or proof semantics:

- The approval status / reasons / blockers are computed exactly as before; a needs-review plan stays
  needs-review.
- `approval.proof.downstreamHandoff.workOrderAllowed` and `verificationPlanAllowed` stay `false`
  (they require `approval.status === "approved"`).
- **WorkOrder generation remains blocked until explicit approval.** **VerificationPlan generation
  remains blocked until explicit approval.**
- No VerificationRun / VerificationResult is created; missing runtime proof is never treated as
  success.

## Fresh-Repo Acceptance Proof

On the fresh fixture (`package.json` with `typecheck` / `test` / `build`, `src/index.ts`,
`plans/add-marker.md`), after `scan` → `intent context prepare` → `intent assess` (needs-review, zero
hard blockers):

- `intent prepare` succeeds; `status.value = needs-review`; `approval.status = needs-review`.
- Phases: `phase:investigate`, `phase:modify`, `phase:verify`, `phase:review`.
- `verificationRequirements`: `verify:typecheck` (`npm run typecheck`), `verify:test` (`npm test`),
  `verify:build` (`npm run build`); attached to `phase:modify` and `phase:verify`.
- `intent work-order generate` remains blocked (`plan-not-approved`).
- `intent verification-plan generate` remains blocked.
- `artifacts validate` is clean; `src/index.ts` is unchanged.

## What This Does Not Do

This fix does not auto-approve needs-review plans, change WorkOrder / VerificationPlan generation
gates, implement an operator approval command, create WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, run Circe, execute commands, write source files, implement `intent:go`, weaken
approval / proof semantics, treat missing runtime proof as success, publish to npm, or bump versions.
**No commands are executed.** **No source files are written.**

## Follow-Up

The natural next step is **Intent Operator Approval / Proof Acceptance Decision** — the explicit
public command path for an operator to approve a needs-review `PreparedIntentPlan` by accepting
specific proof gaps after rechecking freshness / drift. Still no auto-approval, no source writes, no
command execution, no `intent:go`.

> Decided (slice 122): the explicit operator approval path is now pinned — **Intent Operator Approval
> / Proof Acceptance Decision** selects a new approved `PreparedIntentPlan` revision (the source
> needs-review draft stays immutable). A future `rekon intent approve` rechecks freshness / drift /
> status and records the operator's accepted proof gaps; approval is explicit (never auto-approved),
> enables but does not create the WorkOrder / VerificationPlan handoff, runs no commands, and writes no
> source. Next: Intent Operator Approval / Proof Acceptance Implementation. See [Intent Operator
> Approval / Proof Acceptance Decision](./intent-operator-approval-proof-acceptance-decision.md).

> Implemented (slice 123): the explicit approval step now exists. `rekon intent approve` turns this
> needs-review draft into a new approved `PreparedIntentPlan` revision once the operator accepts the
> draft's known proof gaps and the freshness / drift / status recheck passes; the draft stays immutable
> and the WorkOrder / VerificationPlan handoffs open only on the approved revision. See
> [Intent Operator Approval / Proof Acceptance Implementation](./intent-operator-approval-proof-acceptance-implementation.md).

> Reviewed (slice 124): the approval step that promotes this needs-review draft —
> `rekon intent approve` — was reviewed safe/stable in the
> [Intent Operator Approval / Proof Acceptance Safety Review](./intent-operator-approval-proof-acceptance-safety-review.md):
> explicit, recheck-gated, draft-immutable, and non-executing; it enables but does not create the
> downstream handoffs.

# Intent Prepare Integration With Actionability Report

## Status

Shipped (slice 131). Integrates the `IntentPlanActionabilityReport` (the plan
compiler's review output) into `rekon intent prepare`, so a written plan's
actionability gates preparation. Implements the follow-up recommended by the
[Intent Plan Actionability Report Safety Review](./intent-plan-actionability-report-safety-review.md)
at `fc3e1c2`.

## Why This Exists

Slice 129 added the report-only plan compiler (`rekon intent plan review` →
`IntentPlanActionabilityReport`) and slice 130 safety-reviewed it. But `intent
prepare` did not yet *consult* that review: a non-actionable raw plan could still
flow into a `PreparedIntentPlan` and onward toward approval/handoff. This slice
closes that gap. **`intent prepare` respects `IntentPlanActionabilityReport`.**

## Behavior

`rekon intent prepare --assessment <ref> [--actionability-report <ref>]
[--root <path>] [--json]`. The `--plan-actionability-report` alias is accepted;
`--actionability-report` is canonical.

- **Actionable report supplied.** **Actionable reports may feed PreparedIntentPlan
  generation.** For an implementation-bearing plan, the prepared phases and
  verification requirements are derived from the report's normalized phase drafts —
  preserving draft order, kind, objective, and touched paths, and carrying
  deliverables and acceptance criteria into phase constraints. The report ref is
  recorded in the prepared plan's input refs.
- **Non-actionable report supplied (needs-revision / blocked).** **Blocked or
  needs-revision reports prevent or downgrade preparation.** `intent prepare`
  writes **no** `PreparedIntentPlan`, exits non-zero, and prints the report's
  findings, questions, and revision prompt so the operator (or their agent) can
  revise the plan and re-run. **Revision guidance is preserved.** **Non-actionable
  plans are not silently prepared for approval.**
- **No report supplied.** Existing assessment-only behavior is unchanged
  (backward-compatible). Docs and help prefer `intent plan review` before `intent
  prepare` for raw or pasted plans.

In every case, the report informs *structure*, never *approval*. **Prepare does not
auto-approve.** Approval status continues to come from the assessment + proof gates;
an actionable report does not elevate it.

## Boundaries

This integration adds no execution power. **Prepare creates no WorkOrder or
VerificationPlan.** It creates no `VerificationRun` / `VerificationResult`. **Prepare
executes no commands.** **Prepare writes no source files.** It runs no Circe.
**intent:go remains deferred.** Downstream WorkOrder / VerificationPlan generation
still require explicit approval and a work-ready status — exactly as before. The
source plan file and the `IntentPlanActionabilityReport` are read, never mutated;
answer / merge-back remains out of scope.

## Implementation Notes

- Kernel `PreparedIntentPlan` is unchanged. The actionability report ref is carried
  via the prepared plan's header `inputRefs` (and the phases' `sourceRefs`); rich
  report fields without a direct PreparedIntentPlan home (deliverables, acceptance
  criteria) are preserved in phase `constraints` with clear prefixes. This avoids a
  risky change to the heavily-tested kernel artifact; the limitation is documented
  here and in the review packet.
- `@rekon/capability-model.buildPreparedIntentPlan` gained two optional inputs
  (`intentPlanActionabilityReport`, `intentPlanActionabilityReportRef`). The helper
  stays pure: it reads no files, executes nothing, and mutates no input. The
  non-actionable block is enforced at the CLI layer (the helper only ever sees an
  actionable report).
- Report phase ids are zero-padded (`phase:plan-001`, …) so the kernel factory's
  id-sort preserves normalized draft order.

## Verification

Full gate green; contract test
`tests/contract/intent-prepare-actionability-integration.test.mjs` and docs test
`tests/docs/intent-prepare-actionability-integration.test.mjs`. CLI smoke: a
brain-dump plan reviews non-actionable and blocks prepare (no plan written); a
structured plan reviews actionable and prepares one not-auto-approved plan whose
phases preserve order/kind/paths and whose verification requirements reflect the
report; WorkOrder generation remains blocked until approval; source and plan files
are unchanged.

## Follow-Up Work

1. **Intent Prepare Integration With Actionability Report Safety Review** (shipped —
   slice 132) — ground-the-review pass over this slice declared it safe/stable. See
   [`intent-prepare-actionability-integration-safety-review.md`](./intent-prepare-actionability-integration-safety-review.md).
2. **Plan Actionability Answer / Merge-Back Decision** (recommended next) — restore the
   classic ask/answer/merge-back loop (questions → answers → merged plan → re-review).

## Related

- Safety review: [`intent-plan-actionability-report-safety-review.md`](./intent-plan-actionability-report-safety-review.md)
- Implementation: [`intent-plan-actionability-report-implementation.md`](./intent-plan-actionability-report-implementation.md)
- Concept: [`intent-plan-compiler.md`](../concepts/intent-plan-compiler.md)
- Artifacts: [`IntentPlanActionabilityReport`](../artifacts/intent-plan-actionability-report.md), [`PreparedIntentPlan`](../artifacts/prepared-intent-plan.md)
- Review packet: [`intent-prepare-actionability-integration.md`](../../.rekon-dev/review-packets/intent-prepare-actionability-integration.md)

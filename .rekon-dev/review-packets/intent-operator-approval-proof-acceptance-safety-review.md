# Review Packet — Intent Operator Approval / Proof Acceptance Safety Review (slice 124)

## CHANGES MADE

- New safety-review memo `docs/strategy/intent-operator-approval-proof-acceptance-safety-review.md`.
- This review packet.
- New docs test `tests/docs/intent-operator-approval-proof-acceptance-safety-review.test.mjs` (25
  assertions).
- Additive cross-reference pointers in the implementation memo, decision memo, planfulness fix, three
  concept docs (prepared-intent-plan, intent-work-order-handoff, intent-verification-plan-handoff), the
  v1 release-notes, the v1 migration-notes, README, CHANGELOG, and both roadmaps.
- **Docs-only batch.** No source, no runtime, no approval behavior, no package version, no npm publish.

## PUBLIC API CHANGES

None. This is a strategy / safety-review batch. No types, helpers, CLI surfaces, or schemas changed.

## PURPOSE PRESERVATION CHECK

Original problem: a needs-review `PreparedIntentPlan` can now be implementation-bearing, but the
WorkOrder / VerificationPlan handoffs require approval, and operators needed an explicit public approval
path that records accepted proof gaps and preserves the draft. Slice 123 shipped `rekon intent approve`.
This review confirms the product guarantee holds end-to-end: approval is explicit (never auto-approved);
accepted risks are recorded (not erased); the source draft is immutable; approval produces a new
approved revision; approval enables but does not create downstream artifacts; approval executes nothing
and writes no source; and `intent:go` remains deferred. No blocker found.

## CODEBASE-INTEL ALIGNMENT

Rekon prepares, proves, packages, and exports; Circe imports and orchestrates. `rekon intent approve`
sits on Rekon's side of the boundary: it produces a proof-approved plan revision that *Circe* (not
Rekon) would later orchestrate. Approval flips the downstream handoff booleans but creates no WorkOrder
/ VerificationPlan / VerificationRun / VerificationResult, runs no Circe, and writes no source — the V1
non-executing boundary is intact.

## IMPLEMENTATION REVIEWED

Reviewed at `bf15ead`: kernel `IntentOperatorAcceptedRisk` type + `approval.acceptedRisks?` field +
normalizer + validate-when-present; `buildApprovedPreparedIntentPlan` in
`packages/capability-model/src/intent-approval.ts`; the barrel exports; the `rekon intent approve` CLI
branch; and the 36 contract + 11 docs assertions.

## ACCEPTED RISK REVIEW

`IntentOperatorAcceptedRisk = { id, category, message, acceptedAt, acceptedBy?, reason, sourceRefs }`.
The `approval.acceptedRisks?` field is additive and backward-compatible — existing plans without it
still validate (the normalizer emits it only when present; the validator checks it only when present).
Accepted gaps are recorded as `accepted:<gap>` records carrying the operator reason and source refs, so
the gaps stay visible rather than being erased.

## APPROVAL GATE REVIEW

`buildApprovedPreparedIntentPlan` is pure (reads no files, writes no artifacts, executes no commands,
mutates no input). Blockers are deterministic: `missing-prepared-plan`, `missing-prepared-plan-ref`,
`plan-already-approved`, `plan-not-needs-review`, `plan-not-implementation-bearing`,
`missing-verification-requirements`, `missing-intent-status`, `missing-intent-status-ref`,
`status-has-high-blocker`, `status-incompatible`, `unknown-accepted-gap`,
`missing-required-accepted-gap`, `missing-approval-reason`, `freshness-stale`, `new-high-runtime-drift`,
`source-write-boundary`. Required accepted gaps are the source plan's `approval.reasons` mapped to gap
ids; unknown gaps and missing required gaps block; an empty `--reason` blocks.

## RECHECK REVIEW

Conservative, block-when-uncertain. Freshness mirrors `freshnessIsStale` (stale path → block); runtime
drift mirrors `countHighUnresolvedDrift` (new high-severity drift → block unless `runtime-drift-unresolved`
accepted); IntentStatusReport: high-severity blocker or incompatible status value → block. Absent
freshness / drift reports never claim proof.

## APPROVED REVISION REVIEW

Copies request / matched-context source / phases / obligations / verification requirements from the
source draft; sets `status.value=prepared`, `recommendedNextAction=create-work-order`,
`approval.status=approved` (reasons + `explicit-operator-approval` + `manual-risk-acceptance`),
`approval.acceptedRisks`, and `downstreamHandoff = { workOrderAllowed: true, verificationPlanAllowed:
true, sourceWriteAllowed: false }`. The contract test confirms the source draft stays needs-review and
byte-identical.

## CLI REVIEW

`rekon intent approve` blocked path: non-zero exit, prints blockers, writes no plan. Approved path:
writes exactly one new approved `PreparedIntentPlan` under `store.write(..., { category: "actions" })`,
prints the ref, leaves the original draft unchanged. Neither path creates downstream artifacts, executes
commands, or writes source.

## BOUNDARY REVIEW

All boundaries hold: explicit approval only; new revision (no in-place mutation); recorded (not erased)
accepted risks; enables but does not create the WorkOrder / VerificationPlan handoffs; creates no
WorkOrder / VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no
source; runs no Circe; keeps `sourceWriteAllowed` the literal `false`; `intent:go` deferred.
`status-not-work-ready` remains a separate downstream gate after approval.

## RECOMMENDATION

**Intent Operator Approval / Proof Acceptance is safe/stable.** Proceed to **Intent Status Work-Ready
Transition Decision**.

## TESTS / VERIFICATION

- New docs test (25 assertions): headings, the 17 boundary statements, all four tables, the CHANGELOG
  mention, and the review-packet PURPOSE PRESERVATION CHECK.
- Slice-123 tests remain green (36 contract + 11 docs assertions).
- Full 9-command gate (typecheck / test / build / diff-check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke / install-tarball-smoke). No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

The `rekon intent approve` command and `buildApprovedPreparedIntentPlan`; the kernel acceptedRisks
type / field / normalizer / validator; the IntentStatusReport producer and its gates; the WorkOrder /
VerificationPlan generators; package versions; npm publish.

## RISKS / FOLLOW-UP

- `status-not-work-ready` remains the next gate after approval — resolved by the recommended Intent
  Status Work-Ready Transition Decision, which must not weaken proof semantics.
- Stale-context acceptance remains deliberately unsupported (a stale freshness report still blocks); a
  separate policy decision is required before relaxing it.

## NEXT STEP

Intent Status Work-Ready Transition Decision.

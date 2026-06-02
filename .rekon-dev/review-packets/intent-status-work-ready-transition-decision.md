# Review Packet — Intent Status Work-Ready Transition Decision (slice 125)

## CHANGES MADE

- New decision memo `docs/strategy/intent-status-work-ready-transition-decision.md` (12 sections, 4
  tables).
- This review packet.
- New docs test `tests/docs/intent-status-work-ready-transition-decision.test.mjs` (21 assertions).
- Additive cross-reference pointers in the approval safety-review / implementation / decision memos,
  the intent-status concept doc, prepared-intent-plan, the two handoff concept docs, the v1 release +
  migration notes, README, CHANGELOG, and both roadmaps.
- **Decision-only / docs-only batch.** No source, no runtime, no approval change, no package version, no
  npm publish.

## PUBLIC API CHANGES

None. No types, helpers, CLI surfaces, or schemas changed. The memo *proposes* additive
`IntentStatusReportSource` / `IntentStatusProof` fields for the implementation slice but introduces none
now.

## PURPOSE PRESERVATION CHECK

Original problem: operator approval now writes a new approved `PreparedIntentPlan` revision, but
WorkOrder / VerificationPlan generation also requires the `IntentStatusReport` to be work-ready, and the
prior status report reflects pre-approval state — so handoff still stops at `status-not-work-ready`.
Rekon needs an explicit status transition so approval can be reflected without mutating prior reports or
weakening proof gates. This decision pins that model: status transition is explicit and auditable, reads
the approved plan and rechecks proof context, writes a **new** `IntentStatusReport` (existing reports
immutable), and WorkOrder / VerificationPlan proceed only after **both** approval and work-ready status.
No proof gate is weakened.

## CODEBASE-INTEL ALIGNMENT

Rekon prepares, proves, packages, and exports; Circe imports and orchestrates. The status transition
stays on Rekon's side: it produces a status artifact that authorizes the downstream handoff but creates
no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, runs no Circe, and writes no
source. The V1 non-executing boundary holds; `intent:go` stays deferred.

## CURRENT STATUS GAP

`rekon intent approve` clears `plan-not-approved` but does not create/update a work-ready status. The
prior `IntentStatusReport` is immutable and pre-approval, so
`rekon intent work-order generate` / `verification-plan generate` against the approved plan still block
on `status-not-work-ready`.

## OPTIONS CONSIDERED

A (approval updates status) — rejected (conflates approval + status). **B (explicit status transition) —
selected** (preserves auditability). C (generators ignore status after approval) — rejected (weakens
gates). D (mutate existing status) — rejected (breaks immutability). E (auto-transition after approval) —
rejected/deferred (hidden side effect).

## WORK-READY GATE MODEL

Transition to work-ready requires: approved + prepared `PreparedIntentPlan`; `acceptedRisks` recorded
when gaps accepted; `downstreamHandoff.workOrderAllowed === true` + `verificationPlanAllowed === true` +
`sourceWriteAllowed === false`; a previous `IntentStatusReport` that exists and is traceable to the plan
lineage; no new high-severity freshness / drift blockers; and a non-empty transition reason. Any failure
blocks and writes no report.

## STATUS SEMANTICS

On success: `status.value = "work-ready"`, `recommendedNextAction = "create-work-order"` (both existing
enum values). A combined `create-work-order-and-verification-plan` value does **not** exist in
`IntentStatusRecommendedNextAction` and is not introduced by this decision.

## RECHECK MODEL

Conservative (block when uncertain), reusing the approval rechecks: status lineage + no unresolved
high-severity blockers; stale freshness blocks; new high-severity drift blocks. Accepted gaps are
carried forward as evidence (from `approval.acceptedRisks`), not re-litigated.

## RESULTING STATUS REPORT

`status.value = work-ready`; `recommendedNextAction = create-work-order`; source carries the approved
plan + previous status + freshness/drift refs; proof records approval state + accepted risks; no
WorkOrder / VerificationPlan created. **Grounding:** current `IntentStatusReportSource` has
`preparedIntentPlanRef?` (no `approvedPreparedIntentPlanRef` / `previousIntentStatusReportRef`) and
`IntentStatusProof.preparation` has `approvalStatus?` (no `proof.acceptedRisks`); the implementation
slice adds the missing refs/fields additively or carries them by plan lineage.

## BOUNDARY MODEL

Explicit (not auto); new artifact (no mutation); enables but does not create the WorkOrder /
VerificationPlan handoffs; creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult;
executes no commands; writes no source; runs no Circe; `intent:go` deferred; `sourceWriteAllowed` stays
`false`.

## TESTS / VERIFICATION

- New docs test (21 assertions): headings, Option B selection, the 12 boundary statements, the option /
  gate / result / boundary tables, the CHANGELOG mention, and this packet's PURPOSE PRESERVATION CHECK.
- Full 9-command gate (typecheck / test / build / diff-check / audit-package-exports / audit-license /
  publish-dry-run / install-smoke / install-tarball-smoke). No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

`rekon intent approve` + `buildApprovedPreparedIntentPlan`; `IntentStatusReport` producer + types; the
WorkOrder / VerificationPlan generators and their gates; package versions; npm publish.

## RISKS / FOLLOW-UP

- The implementation slice must add `source.previousIntentStatusReportRef` (and optionally
  `source.approvedPreparedIntentPlanRef`) additively without breaking existing IntentStatusReport
  validation.
- Carrying accepted-risk evidence onto the work-ready proof is a proposed additive field; if deferred,
  lineage through `source.preparedIntentPlanRef` → `approval.acceptedRisks` must remain sufficient for
  auditability.
- Auto-transition (Option E) stays rejected to keep approval side-effect-free.

## NEXT STEP

Intent Status Work-Ready Transition Implementation.

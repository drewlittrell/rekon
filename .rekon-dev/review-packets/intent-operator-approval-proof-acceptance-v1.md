# Review Packet — Intent Operator Approval / Proof Acceptance v1 (slice 123)

## CHANGES MADE

- **Kernel (`@rekon/kernel-repo-model`, `src/index.ts`, additive):** added the
  `IntentOperatorAcceptedRiskCategory` + `IntentOperatorAcceptedRisk` types and an optional
  `approval.acceptedRisks?: IntentOperatorAcceptedRisk[]` field on `PreparedIntentPlanApproval`. Added a
  category set + `preparedIntentNormalizeAcceptedRisks` normalizer (wired into
  `preparedIntentNormalizeApproval` so the field survives `createPreparedIntentPlan`), and a
  validate-when-present `validateIntentOperatorAcceptedRisk` (wired into `validatePreparedIntentApproval`).
- **capability-model (`@rekon/capability-model`, new `src/intent-approval.ts`):** the pure
  `buildApprovedPreparedIntentPlan(input)` helper that runs the approval gate and either returns a
  `blocked` result (deterministic blockers, no plan) or an `approved` result with a new approved
  `PreparedIntentPlan` revision. Exported from the package barrel.
- **CLI (`@rekon/cli`, `src/index.ts`):** added the `rekon intent approve` command branch, the
  `buildApprovedPreparedIntentPlan` import, and three help/usage updates (intent-flow list, the
  command-signature list, and the flow line).
- **Tests:** `tests/contract/intent-operator-approval.test.mjs` (36) +
  `tests/docs/intent-operator-approval.test.mjs` (11).
- **Docs:** new implementation memo + this review packet; additive pointers in the decision memo,
  planfulness fix, three concept docs (prepared-intent-plan, intent-work-order-handoff,
  intent-verification-plan-handoff), the v1 release-notes, the v1 migration-notes, README, and CHANGELOG.

## PUBLIC API CHANGES

- New kernel exports: `IntentOperatorAcceptedRisk`, `IntentOperatorAcceptedRiskCategory`.
- New kernel optional field: `PreparedIntentPlanApproval.acceptedRisks?`. **Additive and
  backward-compatible** — existing approved / needs-review plans without the field still validate.
- New capability-model exports: `buildApprovedPreparedIntentPlan`, `BuildApprovedPreparedIntentPlanInput`,
  `IntentApprovalResult`, `IntentApprovalAcceptedGap`, `IntentApprovalBlocker`,
  `IntentApprovalBlockerCategory`, and the `IntentApproval*Like` input views.
- New CLI command: `rekon intent approve`.

## PURPOSE PRESERVATION CHECK

The V1 boundary holds: Rekon prepares, proves, packages, and exports; it does not execute commands,
write source, or run Circe, and `intent:go` stays deferred. Approval produces a plan revision, never a
run. It does not weaken any existing handoff gate — it satisfies the existing WorkOrder / VerificationPlan
`plan-not-approved` / `next-action-not-work-order` / `handoff-not-allowed` conditions only by writing a
genuinely approved revision; the status (`work-ready`) and freshness / drift gates on those handoffs are
untouched.

## SOURCE REVIEW (grounded fields)

Confirmed against actual code before implementing:

- `PreparedIntentPlanApproval = { status, reasons, proof, blockers }` (kernel ~4722). `acceptedRisks?`
  added additively.
- `PreparedIntentPlanApprovalReason` already includes `explicit-operator-approval` and
  `manual-risk-acceptance` — reused for the approved revision's reasons.
- `validatePreparedIntentApproval` is permissive (checks known fields, does not reject unknowns), so the
  field needed normalizer support to survive the factory; validation added for correctness.
- `IntentStatusReport.status.value: IntentStatusValue` (includes `needs-review`, `work-ready`);
  `blockers: IntentStatusIssue[]` with `severity: "low"|"medium"|"high"`.
- WorkOrder handoff gate (`intent-work-order-handoff.ts`): `plan-not-approved` clears on
  `approval.status==="approved"`; `next-action-not-work-order` clears on
  `recommendedNextAction==="create-work-order"`; `handoff-not-allowed` clears on
  `downstreamHandoff.workOrderAllowed===true`. `status-not-work-ready` is a separate IntentStatusReport
  gate (expected to remain on a fresh-repo needs-review status).
- Freshness staleness mirrors `freshnessIsStale` (`status==="stale"` or any entry `changed`/`missing`);
  high-severity drift mirrors `countHighUnresolvedDrift` (`severity==="high"` and status not `in-sync` /
  `not-evaluated`). No decision-memo field differed from the actual shapes.

## APPROVAL HELPER

`buildApprovedPreparedIntentPlan` is a pure function: reads no files, writes no artifacts, executes no
commands, mutates no input. It collects blockers; if any exist it returns `{ status: "blocked",
blockers, acceptedRisks, requiredGaps, acceptedGaps }` and writes nothing. Otherwise it builds the
approved revision via `createPreparedIntentPlan` and returns it.

## ACCEPTED GAP MODEL

Known gaps (`--accept`): `verification-proof-missing`, `runtime-drift-unresolved`,
`handoff-coverage-not-evaluated`, `freshness-not-proven`, `manual-review-required`. Required gaps = the
source plan's `approval.reasons` mapped through `REASON_TO_REQUIRED_GAP`
(`verification-proof-missing`→same, `runtime-drift-unresolved`→same,
`handoff-coverage-unresolved`→`handoff-coverage-not-evaluated`, `stale-assessment`→`freshness-not-proven`).
An unknown accepted gap blocks (`unknown-accepted-gap`); a missing required gap blocks
(`missing-required-accepted-gap`). Each accepted gap becomes an `IntentOperatorAcceptedRisk`
(`id: accepted:<gap>`).

## RECHECK MODEL

Conservative — block when uncertain. Status: high-severity IntentStatusReport blocker blocks;
status.value must be `needs-review` or `work-ready`. Freshness: a supplied PathFreshnessReport with any
stale scoped path blocks; absence does not prove freshness. Runtime drift: a supplied
RuntimeGraphDriftReport with new high-severity drift blocks unless `runtime-drift-unresolved` is
accepted; absence finds no new drift.

## APPROVED REVISION MODEL

Copies request / matched-context source / phases / obligations / verificationRequirements from the
source draft. Sets `status.value=prepared`, `recommendedNextAction=create-work-order`,
`approval.status=approved`, reasons = source reasons + `explicit-operator-approval` (+
`manual-risk-acceptance` when any gap is accepted), `approval.acceptedRisks` = the accepted-risk records,
and `downstreamHandoff = { workOrderAllowed: true, verificationPlanAllowed: true, sourceWriteAllowed:
false }`. The header records the source plan / status / freshness / drift refs as `inputRefs`.

## CLI SURFACE

`rekon intent approve --prepared-plan <ref> [--intent-status <ref>] [--path-freshness <ref>]
[--runtime-drift <ref>] --accept <gap> [--accept <gap>...] --reason <text> [--accepted-by <name>]
[--root <path>] [--json]`. Blocked → non-zero exit, no plan written, blockers printed. Approved → one new
approved `PreparedIntentPlan` written, new ref printed, original draft unchanged.

## BOUNDARY MODEL

Approval is never automatic; enables but does not create the handoffs; creates no WorkOrder /
VerificationPlan / VerificationRun / VerificationResult; executes no commands; writes no source; runs no
Circe; keeps `sourceWriteAllowed` the literal `false`; `intent:go` deferred.

## TESTS / VERIFICATION

- `tests/contract/intent-operator-approval.test.mjs` — 36 assertions: full fresh-repo pipeline; blocked
  approvals (missing required gap, unknown gap, missing reason) write no plan and mutate nothing; the
  approved approval writes exactly one new revision with the right status / reasons / acceptedRisks /
  downstream handoff; the source draft stays needs-review and byte-identical; no WorkOrder /
  VerificationPlan / VerificationRun / VerificationResult is created; and downstream gates clear
  `plan-not-approved` while artifacts validate clean. **36/36 pass.**
- `tests/docs/intent-operator-approval.test.mjs` — 11 assertions on the memo + CHANGELOG/README. **11/11
  pass.**
- Full 9-command gate + fresh-repo CLI smoke (scan → context prepare → assess → prepare → status →
  approve BLOCKED on missing `runtime-drift-unresolved` → approve APPROVED with both gaps → work-order
  generate / verification-plan generate clear `plan-not-approved` → artifacts validate → `git diff
  src/index.ts` clean).

## INTENTIONALLY UNTOUCHED

WorkOrder / VerificationPlan / VerificationRun / VerificationResult generators; the IntentStatusReport
producer; the PathFreshness / RuntimeGraphDrift producers; the `intent prepare` draft builder; package
versions (no bump); npm publish (none).

## RISKS / FOLLOW-UP

- The status-value compatibility allow-set is `{ needs-review, work-ready }`; if a future IntentStatus
  value should also be approvable, widen the set in `buildApprovedPreparedIntentPlan`.
- Stale-context acceptance is deliberately not supported (a stale freshness report still blocks); a
  separate policy decision is required before relaxing it (recorded in the decision memo).

## NEXT STEP

Intent Operator Approval / Proof Acceptance Safety Review.

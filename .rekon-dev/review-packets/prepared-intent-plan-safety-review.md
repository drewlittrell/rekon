# Review Packet — PreparedIntentPlan Safety Review

Eighty-fourth slice on the capability-ontology track. Strategy / safety-review
batch reviewing the amended PreparedIntentPlan v1 implementation at `0d3957e`.
No runtime behavior is changed.

## CHANGES MADE

- New `docs/strategy/prepared-intent-plan-safety-review.md` (14 sections + 4
  tables): Decision Summary, Why This Review Exists, Artifact And CLI Reviewed,
  Approval / Proof Envelope Review, Prepared Status Rule Review, Plan Structure
  Proof Review, Verification Requirement Review, WorkOrder / VerificationPlan
  Boundary Review, Command / Source-Write Boundary Review, Intent Boundary
  Review, Options Considered, Recommendation, What This Does Not Do, Follow-Up
  Work.
- New `tests/docs/prepared-intent-plan-safety-review.test.mjs` (18 assertions).
- This review packet.
- Cross-reference updates to the intent + verification + spine docs, roadmaps,
  README, and CHANGELOG.

## PUBLIC API CHANGES

None. No types, helpers, CLI commands, schemas, or artifacts changed. This is a
documentation/review-only batch.

## PURPOSE PRESERVATION CHECK

The original problem: the first PreparedIntentPlan implementation emitted
phase/gate preparation that could be `prepared` without proof; the amendment
added a required approval/proof envelope. Before IntentStatusReport, Rekon must
confirm a prepared plan cannot be treated as safe unless its approval proof says
it is approved. This review confirms the product guarantee end-to-end:
PreparedIntentPlan is proof-approved preparation, a generated plan is not enough,
approval cites the assessment and proof inputs, verification requirements remain
proof obligations (not VerificationPlan), and WorkOrder / VerificationPlan /
VerificationRun / execution / source writes remain unavailable.

## CODEBASE-INTEL ALIGNMENT

Classic allowed plan output only through explicit authorization or intake
sufficiency, treated planning while not-ready without an approved reason as a
critical violation, and required minimum plan structure. The shipped approval
envelope re-homes that proof-before-plan discipline onto the Rekon graph spine
(assessment readiness + runtime drift + handoff coverage + freshness +
verification proof) without importing classic code. The review confirms the
alignment holds.

## ARTIFACT / CLI REVIEWED

`PreparedIntentPlan` (category `actions`) — required `approval` envelope, factory
+ normalizers, validator/assert/schema; `@rekon/capability-model.buildPreparedIntentPlan`;
and `rekon intent prepare`. All read-only over materialized artifacts; the CLI
writes a single `PreparedIntentPlan` and prints approval status + reasons.

## APPROVAL / PROOF ENVELOPE REVIEW

`approval` is required (a plan without it fails validation). `approval.proof`
cites the assessment ref and re-checks readiness, required context, runtime drift
(unresolved high-severity count), handoff coverage (uncovered /
unresolved-contract / not-evaluated), freshness (stale-context), verification
(requirements + optional proof refs), plan structure (phase-kind booleans), and
the downstream handoff (`sourceWriteAllowed` literal `false`). The helper
computes approval from input VALUES; high drift / uncovered handoff / stale
freshness each force `not-approved`. Reserved reasons add no override behavior.
Verdict: sound.

## PREPARED STATUS RULE REVIEW

Enforced in the kernel and the helper. `validatePreparedIntentPlan` rejects
`prepared` without `approval.status === "approved"`, and rejects `approved` on a
`blocked` / `stale-assessment` / `insufficient-assessment` plan. The helper
downgrades: ready-for-prepare + approved → prepared; + needs-review →
needs-review; + not-approved → blocked. A plan with phases but without approval
is not prepared. Verdict: holds in both layers.

## PLAN STRUCTURE PROOF REVIEW

A prepared plan needs ≥1 phase; implementation-bearing kinds require a `verify`
phase; refactor requires a `refactor` phase; bug/feature/migration require a
`modify` phase; unknown cannot be prepared without an explicit approval reason
(routed to needs-review). `approval.proof.planStructure` records the phase-kind
booleans. Verdict: consistent with the phase generator.

## VERIFICATION REQUIREMENT REVIEW

`verificationRequirements` are obligations (id + optional command + reason +
optional sourceRefs), emitted only for prepared plans. Verification requirements
are proof obligations, not VerificationPlan: no VerificationPlan is materialized,
no command runs, no VerificationRun/VerificationResult is created. Missing proof
results are acceptable; missing requirements for implementation-bearing prepared
plans are rejected by the validator. Verdict: safe.

## WORKORDER / VERIFICATIONPLAN BOUNDARY

`downstreamHandoff.workOrderAllowed` / `verificationPlanAllowed` are advisory
permission flags (true only when approved), not creation. The CLI smoke from the
implementation batch confirmed no WorkOrder / VerificationPlan / VerificationRun
is written. Verdict: intact.

## COMMAND / SOURCE-WRITE BOUNDARY

The helper reads only passed-in values and runs nothing; the CLI writes one
artifact. `sourceWriteAllowed` is the literal `false` (proof-validator enforced),
and a `source-write-boundary` obligation is always present. Verdict: intact.

## INTENT BOUNDARY

IntentStatusReport remains the next layer after preparation; intent:go remains
deferred; source-write behavior remains unavailable. The amendment implemented
no downstream layer. Verdict: intact.

## RECOMMENDATION

PreparedIntentPlan v1 is safe/stable as proof-approved phase/gate preparation.
Proceed to the **IntentStatusReport v1 decision**. Defer IntentStatusReport
implementation, intent:go, WorkOrder/VerificationPlan creation from intent,
command execution, and source writes. Alternative if caution is preferred:
PreparedIntentPlan publication / operator-surface decision.

## TESTS / VERIFICATION

- `tests/docs/prepared-intent-plan-safety-review.test.mjs` — 18 assertions
  (headings, required statements, four tables, CHANGELOG, review packet).
- Full 9-command gate: typecheck, test, build, `git diff --check`,
  audit-package-exports, audit-license, publish-dry-run, install-smoke,
  install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

No runtime behavior, no `IntentStatusReport` / `intent:go`, no WorkOrder /
VerificationPlan / VerificationRun / VerificationResult creation, no command
execution, no source writes, no source-write apply, no classic codebase-intel
imports, no version bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- Approval gates are conservative (drift / coverage / freshness block unless
  accepted; v1 exposes no acceptance input). Reserved reasons leave room for a
  future operator-approval gate without relaxing the source-write boundary.
- Next: IntentStatusReport v1 decision — decide how Rekon reports assessed /
  prepared / blocked / stale / verified / complete intent state across the spine.

## NEXT STEP

Recommend **IntentStatusReport v1 decision** (strategy/decision batch, no
implementation): decide how intent status is reported across IntentAssessmentReport,
PreparedIntentPlan, WorkOrder, VerificationPlan, VerificationRun,
VerificationResult, PathFreshnessReport, and RuntimeGraphDriftReport. Still no
IntentStatusReport implementation, no WorkOrder/VerificationPlan creation from
intent, no command execution, no source writes.

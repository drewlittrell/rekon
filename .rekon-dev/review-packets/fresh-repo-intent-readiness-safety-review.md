# Review Packet — Fresh Repo Intent Readiness Safety Review

## CHANGES MADE

Strategy / safety-review batch. Reviews the shipped Fresh Repo Intent Readiness / Proof Context
Fix (`def20b8`) end-to-end and finds it safe/stable. New
`docs/strategy/fresh-repo-intent-readiness-safety-review.md`, a 19-assertion docs test, this
review packet, the deferred slice-113 concept/strategy cross-links, and additive doc pointers +
CHANGELOG. No code, CLI, package, or runtime change.

## PUBLIC API CHANGES

None. No code, CLI command, flag, artifact type, `package.json`, version, or runtime behavior
changed. `rekon intent context prepare`, `rekon scan`, `rekon refresh`, and the producers are
unchanged.

## PURPOSE PRESERVATION CHECK

Original problem: fresh repos could run scan/refresh but `intent assess` blocked on missing
StepCapabilityGraph and RuntimeGraphDriftReport; the producer commands existed and worked but
were not discoverable or documented. Product guarantee re-confirmed by this review: a fresh repo
has a documented public path (`scan → intent context prepare → intent assess → …`) to prepare
enough context for intent assessment; the path requires no private artifact seeding;
runtime/handoff absence is represented honestly (not-evaluated / observation-missing); Rekon
does not treat missing runtime evidence as success; Rekon still prepares/proves/packages and
Circe still orchestrates. The review records the assessment and changes nothing.

## CODEBASE-INTEL ALIGNMENT

Grounded in the shipped `prepareIntentContext` helper + `rekon intent context prepare` branch in
`packages/cli/src/index.ts`, the two reworded `IntentAssessmentReport` blocker messages in
`packages/capability-model/src/intent-assessment-report.ts`, the slice-113 contract test
(`cli-fresh-repo-intent-context.test.mjs`) + docs test, and the slice-113 review packet +
acceptance proof.

## HELPER / CLI REVIEWED

`prepareIntentContext(root)` runs the five producers by re-entering `main()` (best-effort,
output suppressed, sub-failures recorded, caller `process.exitCode` preserved). The `intent
context prepare` branch reports per-step results + summary + six boundary booleans (all false) +
next action. The blocker messages point at the one-step command and state the not-evaluated
honesty. No change to `runRefresh`, the scan branch, or the assess severity policy.

## ROOT CAUSE REVIEW

`scan` (= `runRefresh`) builds the core substrate but not the intent prerequisites; producers
were undiscoverable + undocumented; blocker messages named individual commands. The fix closes
all three additively, without touching scan/refresh or the severity policy.

## CONTEXT PREPARATION REVIEW

Producers run in dependency order (step graph → handoff contract → runtime observe → runtime
drift → handoff coverage); builders tolerate missing dependencies (emitting not-evaluated
context), so the orchestration is robust + idempotent on a fresh repo. Writes only `.rekon/`
artifacts; creates no WorkOrder / VerificationPlan / docs / agent handoff / CI surface.

## ARTIFACT PRODUCER REVIEW

StepCapabilityGraph (rekon step graph build): topology from scan context. HandoffContract (rekon
handoff contract build): zero declared handoffs without config. RuntimeGraphObservationReport
(rekon runtime graph observe): empty observation without event log. RuntimeGraphDriftReport
(rekon runtime graph drift): observation-missing / not-evaluated. HandoffCoverageReport (rekon
handoff coverage report): not-evaluated without event log. All exit 0 on a fresh repo and write
honest not-evaluated runtime/handoff context.

## INTENT ASSESSMENT REVIEW

`intent assess` reads the latest of each context artifact. With the substrate present the two
high-severity missing-artifact blockers do not fire; per-row drift blockers still fire for
genuine high-severity unresolved drift (unchanged). On a fresh repo the result is `needs-review`
with warnings, never a false `ready`. No change to the severity policy.

## RUNTIME / HANDOFF HONESTY REVIEW

With no event log, the observation is empty and the drift rows are `observation-missing` /
`not-evaluated` (low severity, zero high-severity verdicts); coverage rows are `not-evaluated`.
None reads as clean/proven; the assessment surfaces this as warnings. Missing runtime evidence
is explicit, not hidden.

## FRESH REPO ACCEPTANCE PROOF

Recorded from slice 113: a fresh temp repo (no manual `.rekon/artifacts` seeding) ran `scan`
(passed) → `intent context prepare` (built 5/5) → `intent assess` (**0 blockers, needs-review,
honest warnings**) → `intent prepare` → `intent status` → `intent work-order generate` →
`intent verification-plan generate` → `intent bundle write`; the bundle emitted
`.rekon/intent/plans/<intent-id>/circe/handoff.json`; `artifacts validate` was `valid: true`;
the source file was unchanged. Circe was not run by Rekon.

## PHASE-LEVEL VERIFICATION FINDING

Phase-level VerificationPlan behavior remains a recorded follow-up. The Circe dogfood observed a
VerificationPlan only for `phase-verify`, with earlier phases running under skipped Rekon
verification. Follow-up slice **Intent Bundle Phase-Level Verification Policy / Implementation**
will make `phase-modify` carry executable verification when possible, keep `phase-verify` for
final verification, mark `phase-investigate` / `phase-review` as explicit manual / reviewer-gated
phases, and ensure skipped verification never looks like proof. Not changed here.

## BOUNDARY REVIEW

context prep vs scan/refresh (separate command; both unchanged); missing runtime evidence
(not-evaluated / observation-missing); context prep vs Circe (does not run Circe); vs source
writes (none — only `.rekon/`); vs intent:go (deferred).

## RECOMMENDATION

**Fresh Repo Intent Readiness / Proof Context Fix is safe/stable.** No blocker found. Next:
**Intent Bundle Phase-Level Verification Policy / Implementation**. A **Scan Auto Context
Preparation Decision** is a deferred alternative (scan was just safety-reviewed).

## TESTS / VERIFICATION

New `tests/docs/fresh-repo-intent-readiness-safety-review.test.mjs` (19 assertions: title, 15
headings, the eleven boundary statements, four tables, CHANGELOG mention, review packet PURPOSE
PRESERVATION CHECK). Full nine-command gate: typecheck, test, build, `git diff --check`,
audit-package-exports, audit-license, publish-dry-run (no publish), install-smoke,
install-tarball-smoke. No CLI smoke (strategy-only batch); Circe not rerun.

## INTENTIONALLY UNTOUCHED

No change to `scan` / `refresh` / `intent context prepare` / the assess blockers, no
scan-auto-context-prep, no phase-level VerificationPlan policy, no Circe execution, no
source-changing commands, no `intent:go`, no npm publish, no version bump, no branch. Beyond the
review docs/test/packet, the only changes are the deferred slice-113 concept/strategy cross-links
and additive doc pointers.

## RISKS / FOLLOW-UP

- The orchestrator re-enters the CLI dispatch best-effort; sub-failures are recorded and do not
  fail the orchestrator. The slice-113 contract + acceptance tests exercise the happy path;
  failure-mode behavior is best-effort by design.
- Phase-level VerificationPlan coverage is the recorded follow-up (above).
- Scan-auto-context-prep is deferred to a separate decision.

## NEXT STEP

Intent Bundle Phase-Level Verification Policy / Implementation — make phase-level verification
explicit in bundles and Circe projections so skipped verification never looks like proof. Still
no `intent:go`, no Rekon-side source writes, no Circe execution by Rekon.

# Review Packet — Plan Compiler Loop Closure / Fresh Repo End-to-End Proof (slice 135)

## CHANGES MADE

- **capability-model** (`packages/capability-model/src/prepared-intent-plan.ts`):
  loop-closure repair in the actionability-report → prepare phase mapping — when the
  report's normalized drafts are all implementation-bearing with no `verify` phase,
  synthesize a verify phase wired to the report-derived verification requirements
  (mirrors the non-actionability prepare path). Additive structure only.
- **tests** (`tests/contract/intent-prepare-actionability-integration.test.mjs`):
  updated the single phase-count assertion to expect the synthesized verify phase
  (the prior expectation asserted a structurally-invalid implementation-bearing plan
  with no verify phase — the latent gap the proof exposed).
- **new** `tests/contract/plan-compiler-loop-closure.test.mjs` (22 assertions) — the
  full fresh-repo end-to-end proof.
- **new** `tests/docs/plan-compiler-loop-closure.test.mjs` (16 assertions).
- **new** `docs/strategy/plan-compiler-loop-closure.md` + this review packet; doc
  cross-reference updates.

## PUBLIC API CHANGES

None. No new artifact, type, helper signature, or CLI command. The repair is internal
to `buildPreparedIntentPlan`'s actionability-report path and produces the same
`PreparedIntentPlan` shape (now always including a verify phase for implementation-
bearing plans).

## PURPOSE PRESERVATION CHECK

The classic codebase-intelligence loop — take a rough plan, decompose it, ask/answer
missing details, iterate toward executable phases — is now provably end-to-end in
Rekon: review asks, answer merges and re-scores, an actionable revision feeds prepare,
and the existing gated handoff path carries it to a Circe-importable bundle. The loop
stays evidence-bound and never crosses into execution / source-write / Circe.

## SOURCE REVIEW

The non-actionability prepare path always pushes `phase:verify`; the actionability path
(slice 131) replaced `phases` with report-derived phases and never added one. A single-
phase rough plan (one `modify` phase) therefore produced an implementation-bearing plan
with no verify phase — invalid per kernel validator `$.phases` rule, surfaced only on
`approve`'s strict re-validation. The repair restores parity between the two paths.

## LOOP CLOSURE MODEL

review → answer → merge-back → prepare → approve → status transition (work-ready) →
WorkOrder / VerificationPlan generate → bundle write → Circe projection. Each downstream
step stays gated; the loop itself is the review/answer/merge-back/prepare segment.

## END-TO-END PROOF

Fresh temp repo, rough plan with a `TODO`. First review non-actionable (8 questions);
answer writes a new actionable revision (source report byte-identical, answerTrace
present); prepare consumes it (no auto-approve); approve with the required gaps
(`verification-proof-missing`, `runtime-drift-unresolved`); work-ready transition;
WorkOrder + VerificationPlan generate past the approval/status gates; bundle write emits
`circe/handoff.json` + `circe/rekon-proof.json`; `artifacts validate` clean; source +
plan files unchanged; no VerificationRun / VerificationResult exist.

## EMBEDDED SAFETY REVIEW

This closure batch replaces a separate immediate safety-review slice because it
introduces no new execution/source-write/Circe boundary beyond the already-reviewed
components. The only change is additive verify-phase structure.

## ANSWER / MERGE-BACK BOUNDARY

Unchanged from slice 134: deterministic merge into copies; new report revision; source
report immutable; no execution.

## PREPARE INTEGRATION BOUNDARY

Unchanged except the additive verify-phase synthesis. Still derives a `PreparedIntentPlan`
only; no approval side effect; report is read, never mutated.

## APPROVAL BOUNDARY

Unchanged: explicit accepted gaps + reason; prepare does not auto-approve; approval gates
hold.

## STATUS TRANSITION BOUNDARY

Unchanged: work-ready is an explicit operator transition.

## HANDOFF BOUNDARY

Unchanged: WorkOrder / VerificationPlan generation proceed only after approval + work-
ready; no VerificationRun / VerificationResult; no command execution.

## BUNDLE / CIRCE PROJECTION BOUNDARY

Unchanged: writes the bundle + Circe projection under `.rekon/`; Rekon never runs Circe.

## TESTS / VERIFICATION

Contract (22) + docs (16) + existing prepare-actionability/answer suites green; full
9-command gate green; CLI smoke = the end-to-end proof.

## INTENTIONALLY UNTOUCHED

Kernel validators, approval/status/handoff gate logic, answer/merge-back helper, bundle
renderer, Circe projection shape. No version bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- The synthesized verify phase carries the report's verification requirements; if a
  report supplies no verification commands, it carries the safe-default requirements
  already computed for implementation-bearing drafts.
- Follow-on: Fresh Repo Intent Handoff / Circe Dogfood Review.

## NEXT STEP

**Fresh Repo Intent Handoff / Circe Dogfood Review.** Do not restart the micro-slice
pattern; if closure regresses, take a single blocker-specific fix slice only.

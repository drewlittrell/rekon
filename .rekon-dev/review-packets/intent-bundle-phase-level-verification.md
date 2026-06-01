# Review Packet — Intent Bundle Phase-Level Verification Policy / Implementation

## CHANGES MADE

Product-capability batch. Makes phase-level verification explicit in the intent plan bundle
and its Circe projection so skipped verification never reads as proof. Adds a per-phase
`verificationPosture` (`executable` / `manual-review` / `final-verification` / `needs-review`)
derived in the bundle projection layer (`packages/capability-docs/src/intent-plan-bundle.ts`),
maps the plan's safe executable verification requirements onto implementation phases, emits a
per-phase VerificationPlan only for executable / final-verification phases, surfaces posture in
`circe/rekon-proof.json` `phaseGates[]`, `circe/phase-plan.json` `rekon`, `verification-plan.md`,
and `agent/verification.json`, and reports a `phaseVerification` summary from `rekon intent
bundle write`. No canonical artifact, approval/proof policy, or runtime-execution change.

## PUBLIC API CHANGES

Additive only. New exported type `IntentPhaseVerificationPosture` in `@rekon/capability-docs`.
New additive fields in the Circe projection: `phaseGates[].verificationPosture` / `manualGate` /
`needsReview` / `reason` / `verificationPlanPath`, `phase-plan.json` `phases[].rekon.verificationPosture`,
WorkOrder / VerificationPlan `intentHandoff.verificationPosture`, `manifest.circe.phaseVerification`,
`agent/verification.json` `phaseVerification` + `phases[]`. No CLI command / flag added; `rekon
intent bundle write` gains a `phaseVerification` summary in JSON + one human line. All fields are
Circe-ignored-on-import (unknown-field tolerant); schemas stay valid.

## PURPOSE PRESERVATION CHECK

Original problem: the Circe dogfood bundle emitted a VerificationPlan only for `phase-verify`;
earlier phases ran under skipped Rekon verification, which is acceptable only if those phases are
explicitly marked manual / reviewer-gated, and `phase-modify` should carry executable verification
where possible. Product guarantee delivered: every phase now carries an explicit verification
posture; `phase-modify` / `phase-refactor` carry executable verification when a safe requirement
applies (else `needs-review`); `phase-verify` carries final verification; `phase-investigate` /
`phase-review` are reviewer-gated `manual-review`; a phase without executable verification is
recorded as `manual-review` or `needs-review`, never silently treated as verified. Rekon still
prepares / proves / packages; Circe still orchestrates. No `intent:go`, no command execution, no
source writes, no VerificationRun / VerificationResult.

## CODEBASE-INTEL ALIGNMENT

Grounded in the real renderer (`renderCirceProjection` / `buildIntentPlanBundle`), the canonical
`PreparedIntentPhase.kind` values (investigate / modify / refactor / verify / review), the slice-101
proof/gate sidecar, and the Circe `normalizeRekonWorkOrder` / `normalizeRekonVerificationPlan` /
`normalizePhasePlan` unknown-field tolerance.

## SOURCE SHAPE REVIEW

`PreparedIntentPlan.phases[]` carry `kind` and `verificationRequirements` (ids). The canonical
plan attaches executable requirements (`verify:typecheck` / `verify:test` / `verify:build`, each
with a `command`) only to the verify phase; `phase:modify` carries `[]`. The bundle projection now
maps the plan's safe executable requirement ids (those with a non-empty `command`) onto
implementation phases to derive posture and per-phase VerificationPlans, without mutating the
canonical artifact.

## PHASE VERIFICATION POLICY

- `verify`: `final-verification` when an executable requirement applies; else `needs-review`.
- `modify` / `refactor`: `executable` when a safe executable requirement applies; else `needs-review`.
- `investigate` / `review`: `manual-review` (reviewer-gated) unless an explicit executable
  requirement attaches, in which case `executable`.
- unknown kind: `manual-review` by default unless an explicit executable requirement attaches.

## POSTURE MODEL

`IntentPhaseVerificationPosture = "executable" | "manual-review" | "final-verification" |
"needs-review"`. Each phase gate carries `verificationPosture`, `manualGate`, `needsReview`,
`reason`, and (when emitted) `verificationPlanPath`. A per-phase VerificationPlan is emitted only
for `executable` / `final-verification` postures (which always resolve to ≥1 executable command).

## CIRCE PROJECTION CHANGES

`circe/rekon-proof.json` `phaseGates[]` gain the posture fields. `circe/phase-plan.json`
`phases[].rekon` gains `verificationPosture` / `manualGate` / `needsReview` (Circe ignores unknown
phase fields). `circe/verification-plans/<phase>.verification-plan.json` are now emitted for each
executable / final-verification phase (e.g. `phase-modify` + `phase-verify`), not only the verify
phase. `needs-review` phases emit a handoff warning; `manual-review` phases are by-design silent
in `handoff.warnings`.

## HUMAN / AGENT BUNDLE CHANGES

`verification-plan.md` gains a "Phase verification posture" section listing each phase's posture +
reason and stating that skipped verification is not proof. `agent/verification.json` gains a
`phaseVerification` summary and a `phases[]` array (phaseId / verificationPosture / manualGate /
needsReview / verificationPlanPath).

## SCHEMA COMPATIBILITY

`circe/handoff.json`, `circe/phase-plan.json`, and the per-phase WorkOrder / VerificationPlan
stay schema-compatible: all new fields are additive and tolerated by Circe's normalizers. Covered
by contract assertions PV14 / PV15 / PV16.

## BOUNDARY MODEL

Projection-layer only: no canonical `PreparedIntentPlan` / `WorkOrder` / `VerificationPlan`
artifact change; no approval/proof severity change; no command execution; no source writes; no
Circe run by Rekon; no VerificationRun / VerificationResult; `intent:go` deferred.

## TESTS / VERIFICATION

`tests/contract/intent-plan-bundle.test.mjs`: 20 new phase-verification assertions (PV1–PV20) +
3 updated existing assertions (C4 / C16 / C17) — 105 tests pass. New
`tests/docs/intent-bundle-phase-level-verification.test.mjs` (8 assertions). Full nine-command
gate + a fresh-repo CLI smoke (`scan → intent context prepare → assess → prepare → status → bundle
write → artifacts validate`) inspecting `rekon-proof.json` phaseGates.

## INTENTIONALLY UNTOUCHED

The canonical `PreparedIntentPlan` phase/requirement attachment (still verify-phase only), the
`intent assess` approval/proof policy, scan / refresh, `intent:go`, VerificationRun /
VerificationResult, npm publish, version bump, branch creation.

## RISKS / FOLLOW-UP

- The modify/refactor mapping uses the plan's safe executable requirements (commands only); a
  plan that declares no executable requirement yields `needs-review`, surfaced explicitly.
- Per-phase VerificationPlans duplicate the executable commands across modify + verify by design
  (phase gates are independent); this is intended, not redundant proof.
- Follow-up: **Intent Bundle Phase-Level Verification Safety Review**.

## NEXT STEP

Intent Bundle Phase-Level Verification Safety Review — review the per-phase posture model
end-to-end before any further execution-boundary work. Still no `intent:go`, no Rekon-side source
writes, no Circe execution by Rekon.

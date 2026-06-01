# Review Packet — Intent Bundle Phase-Level Verification Safety Review

## CHANGES MADE

Strategy / safety-review batch. Reviews the shipped Intent Bundle Phase-Level Verification Policy /
Implementation (`4a944d3`) end-to-end and finds it safe/stable. New
`docs/strategy/intent-bundle-phase-level-verification-safety-review.md`, a 22-assertion docs test,
this review packet, and additive doc pointers + CHANGELOG. No code, CLI, package, or runtime
change.

## PUBLIC API CHANGES

None. No code, CLI command, flag, artifact type, `package.json`, version, or runtime behavior
changed. The phase posture derivation, per-phase VerificationPlan emission, and all bundle / Circe
surfaces are unchanged.

## PURPOSE PRESERVATION CHECK

Original problem: the Circe dogfood bundle emitted a VerificationPlan only for `phase-verify`,
leaving earlier phases under skipped Rekon verification — ambiguous unless those phases are
explicitly marked manual / reviewer-gated. Product guarantee re-confirmed by this review: every
phase has explicit verification posture; `phase-modify` / `phase-refactor` receive executable
verification when safe requirements exist (else `needs-review`); `phase-verify` carries final
verification; `phase-investigate` / `phase-review` are explicit manual / reviewer gates; a phase
without executable verification is never silently verified; skipped verification is never presented
as proof. Posture is projection metadata, not a VerificationRun. The review records the assessment
and changes nothing.

## CODEBASE-INTEL ALIGNMENT

Grounded in `renderCirceProjection` / `buildIntentPlanBundle` in
`packages/capability-docs/src/intent-plan-bundle.ts` (posture type at L171, kind-based derivation
L353–381, `emitVerificationPlan` L396, summary L630), the slice-115 contract test (105 assertions
incl. PV1–PV20), the slice-115 docs test (8 assertions), and the slice-115 review packet.

## IMPLEMENTATION REVIEWED

Per-phase `IntentPhaseVerificationPosture` (`executable` / `final-verification` / `manual-review` /
`needs-review`) derived from phase `kind` + the plan's safe executable requirement ids (those with
a command). Projection-only: reads canonical phases / requirements, mutates no canonical artifact,
does not touch the assess approval/proof policy. Per-phase VerificationPlan emitted only for
`executable` / `final-verification`. Surfaced in `circe/rekon-proof.json` `phaseGates[]`,
`circe/phase-plan.json` `phases[].rekon`, `verification-plan.md`, `agent/verification.json`, and the
`rekon intent bundle write` `phaseVerification` summary.

## PHASE POSTURE REVIEW

`verify` → `final-verification` (else `needs-review`); `modify` / `refactor` → `executable` when a
safe executable requirement applies, else `needs-review`; `investigate` / `review` →
`manual-review` unless explicit executable requirements attach; unknown kind → `manual-review`. Each
branch records a `reason`. Posture is a derived label, never an execution result.

## PER-PHASE VERIFICATIONPLAN REVIEW

A `circe/verification-plans/<phase-id>.verification-plan.json` is emitted only when posture is
`executable` / `final-verification` and ≥1 executable command resolves. `phase-modify` /
`phase-refactor` ship one when the plan's safe requirements map; `phase-verify` ships the final
plan; `manual-review` / `needs-review` phases ship none. The mapped plan keeps the canonical Rekon
shape accepted by `normalizeRekonVerificationPlan`.

## HUMAN / AGENT BUNDLE REVIEW

`verification-plan.md` gains a "Phase verification posture" section (per-phase posture + reason +
"skipped verification is not proof"). `agent/verification.json` gains a `phaseVerification` summary
and a per-phase `phases[]` array, so an LLM agent sees the same posture as a human and Circe.

## CIRCE PROJECTION REVIEW

`circe/rekon-proof.json` `phaseGates[]` and `circe/phase-plan.json` `phases[].rekon` carry the
posture additively; Circe's `normalizeHandoffManifest` / `normalizePhasePlan` /
`normalizeRekonWorkOrder` / `normalizeRekonVerificationPlan` ignore unknown fields, so all four
surfaces stay schema-valid. The proof sidecar is Rekon-owned and never overclaims approval /
readiness.

## BOUNDARY REVIEW

posture vs VerificationRun (projection metadata, not execution); skipped verification vs proof
(skipped is not proof); manual phases (explicit reviewer gate); needs-review phases (explicit
verification gap); command execution (none); source writes (none); Circe execution (Rekon does not
run Circe); intent:go (deferred).

## RECOMMENDATION

**Intent Bundle Phase-Level Verification is safe/stable.** No blocker found. Next: **Rekon Install
/ Setup / ASCII Art UX Decision**. **Scan Auto Context Preparation Decision** is a deferred
alternative.

## TESTS / VERIFICATION

New `tests/docs/intent-bundle-phase-level-verification-safety-review.test.mjs` (22 assertions:
title, 12 headings, the fourteen boundary statements, four tables, CHANGELOG mention, review packet
PURPOSE PRESERVATION CHECK). Full nine-command gate: typecheck, test, build, `git diff --check`,
audit-package-exports, audit-license, publish-dry-run (no publish), install-smoke,
install-tarball-smoke. No CLI smoke (strategy-only batch); the slice-115 fresh-repo smoke + 105
contract assertions stand.

## INTENTIONALLY UNTOUCHED

No change to the phase posture logic, per-phase VerificationPlan emission, `PreparedIntentPlan`
generation, the assess approval/proof policy, scan / refresh, VerificationRun / VerificationResult,
Circe execution, `intent:go`, npm publish, version, or branch. Only the review memo / test / packet
and additive doc pointers are added.

## RISKS / FOLLOW-UP

- The modify/refactor mapping uses the plan's safe executable requirements; a plan with no
  executable requirement yields `needs-review`, surfaced explicitly (not a silent skip).
- Per-phase VerificationPlans duplicate executable commands across modify + verify by design (phase
  gates are independent) — intended, not redundant proof.
- Follow-up: **Rekon Install / Setup / ASCII Art UX Decision** (recommended); **Scan Auto Context
  Preparation Decision** (deferred alternative).

## NEXT STEP

Rekon Install / Setup / ASCII Art UX Decision — decide the polished install / first-run setup UX
(banner vs compact mark, ASCII resources, setup-command posture, create-rekon decision, non-TTY /
`--json` / `NO_COLOR` rules, post-scan copy). Still no setup implementation, no ASCII art
implementation, no prompts before scan, no `intent:go`.

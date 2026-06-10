# Intent Bundle Phase-Level Verification Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

## Decision Summary

The Intent Bundle Phase-Level Verification Policy / Implementation (shipped at `4a944d3`) is
reviewed end-to-end and found **safe and stable**. **Every phase has explicit verification
posture.** Each phase carries one of `executable`, `final-verification`, `manual-review`, or
`needs-review` in `circe/rekon-proof.json` `phaseGates[]`, mirrored on `circe/phase-plan.json`
`phases[].rekon`, and summarized in `verification-plan.md` and `agent/verification.json`.
**`phase-modify` gets executable verification when safe requirements exist.** **`phase-refactor`
gets executable verification when safe requirements exist.** **`phase-verify` carries final
verification.** **`phase-investigate` and `phase-review` may be manual/reviewer-gated.**
**Manual-only phases are explicit.** **A phase without executable verification is never silently
treated as verified.** **Skipped verification is not proof.** This review changes no behavior; it
records the assessment and recommends the install / setup / ASCII-art UX decision next.

The nineteen review questions, answered:

1. **Is phase-level verification posture safe/stable?** Yes — the posture is derived purely in the
   bundle projection layer, covered by 105 contract assertions (incl. PV1–PV20) and 8 docs
   assertions, with a fresh-repo CLI smoke confirming the end-to-end wiring.
2. **Does every phase now have explicit verification posture?** Yes — every phase gate carries a
   `verificationPosture` plus `manualGate` / `needsReview` / `reason` (and a `verificationPlanPath`
   when one is emitted).
3. **Does `phase-modify` get executable verification when safe requirements exist?** Yes — it maps
   the plan's safe executable requirements (those with a command) and ships a per-phase
   VerificationPlan, posture `executable`.
4. **Does `phase-refactor` get executable verification when safe requirements exist?** Yes —
   identical mapping to `phase-modify`.
5. **Does `phase-verify` carry final verification?** Yes — posture `final-verification` carrying the
   executable verification requirements; `needs-review` only if none exist.
6. **Are `phase-investigate` and `phase-review` explicitly manual/reviewer-gated by default?** Yes
   — posture `manual-review` (`manualGate: true`) unless explicit executable requirements attach.
7. **Are implementation phases with no safe verification marked needs-review?** Yes —
   `modify` / `refactor` with no safe executable requirement become `needs-review` (`needsReview:
   true`) with a handoff warning, not a silent skip.
8. **Is skipped verification prevented from looking like proof?** Yes — `manual-review` and
   `needs-review` phases ship no VerificationPlan and record why; nothing in the bundle treats them
   as verified.
9. **Does `circe/rekon-proof.json` carry phase posture?** Yes — `phaseGates[]` carry
   `verificationPosture` / `manualGate` / `needsReview` / `reason` / `verificationPlanPath`.
10. **Does `circe/phase-plan.json` carry per-phase Rekon metadata without breaking Circe
    compatibility?** Yes — `phases[].rekon.verificationPosture` (+ `manualGate` / `needsReview`) is
    additive; Circe's `normalizePhasePlan` ignores unknown phase fields.
11. **Does the per-phase VerificationPlan projection remain schema-compatible?** Yes — the mapped
    per-phase VerificationPlan keeps the canonical Rekon shape accepted by
    `normalizeRekonVerificationPlan`; new fields ride in `intentHandoff` (ignored on import).
12. **Does `agent/verification.json` expose posture for LLM agents?** Yes — a `phaseVerification`
    summary plus a `phases[]` array (phaseId / verificationPosture / manualGate / needsReview /
    verificationPlanPath).
13. **Does human `verification-plan.md` explain manual/reviewer-gated phases?** Yes — a "Phase
    verification posture" section lists each phase's posture + reason and states that skipped
    verification is not proof.
14. **Does the implementation avoid command execution?** Yes. **No commands are executed.**
15. **Does the implementation avoid VerificationRun / VerificationResult creation?** Yes. **No
    VerificationRun or VerificationResult is created.**
16. **Does the implementation avoid source writes?** Yes. **No source files are written.**
17. **Does Rekon still avoid running Circe?** Yes. **Rekon does not run Circe.**
18. **Does intent:go remain deferred?** Yes. **intent:go remains deferred.**
19. **What slice follows?** **Rekon Install / Setup / ASCII Art UX Decision** — the plan-quality
    gap is closed and reviewed, so the remaining V1 / operator-readiness work is install / setup
    polish. **Scan Auto Context Preparation Decision** is a deferred alternative.

## Why This Review Exists

The Circe operator dogfood found that a bundle could emit a VerificationPlan only for
`phase-verify`, leaving earlier phases running under skipped Rekon verification — acceptable only
if those phases are explicitly marked manual / reviewer-gated. The implementation added an explicit
per-phase verification posture so every phase clearly states whether it has executable
verification, final verification, a manual / reviewer gate, or a needs-review gap. Before building
on it (install / setup polish, any later execution-boundary work), Rekon must confirm the posture
is safe and that skipped verification can never be mistaken for proof. This review provides that
confirmation against the shipped implementation and its tests.

## Implementation Reviewed

`renderCirceProjection` in `packages/capability-docs/src/intent-plan-bundle.ts` derives, per phase,
a `IntentPhaseVerificationPosture` (`executable` / `final-verification` / `manual-review` /
`needs-review`) from the phase `kind` and the plan's safe executable requirement ids (those that
carry a command). The derivation is projection-only: it reads the canonical `PreparedIntentPlan`
phases / requirements but mutates no canonical artifact and does not touch the `intent assess`
approval/proof policy. A per-phase VerificationPlan is emitted only for `executable` /
`final-verification` postures; `manual-review` / `needs-review` phases emit none and record why.
The posture is surfaced in the proof sidecar, the phase plan, the per-phase VerificationPlan,
`verification-plan.md`, `agent/verification.json`, and the `rekon intent bundle write`
`phaseVerification` summary. New exported type `IntentPhaseVerificationPosture`; all projection
fields are additive and Circe-schema-compatible.

## Phase Posture Review

**Phase-level verification posture is projection metadata, not VerificationRun.** The posture is a
derived label on the projection, not an execution result: it says what verification a phase carries
or is gated on, never that verification ran. `verify` → `final-verification` (else `needs-review`);
`modify` / `refactor` → `executable` when a safe executable requirement applies, else
`needs-review`; `investigate` / `review` → `manual-review` unless explicit executable requirements
attach; any unknown kind defaults to `manual-review`. Each branch records a `reason`, so the gate
is always explained.

## Per-Phase VerificationPlan Review

A per-phase `circe/verification-plans/<phase-id>.verification-plan.json` is emitted only when the
posture is `executable` or `final-verification` and at least one executable command resolves. So
`phase-modify` / `phase-refactor` ship a VerificationPlan when the plan's safe executable
requirements map onto them, `phase-verify` ships the final VerificationPlan, and
`phase-investigate` / `phase-review` / any `needs-review` phase ship none. The mapped per-phase
VerificationPlan keeps the canonical Rekon shape (header / workOrderRef / commands /
successCriteria / source), so it remains schema-compatible with Circe's
`normalizeRekonVerificationPlan`.

## Human / Agent Bundle Review

`verification-plan.md` gains a "Phase verification posture" section that lists each phase's posture
and reason and states that a phase without an executable VerificationPlan is never treated as
verified. `agent/verification.json` gains a `phaseVerification` summary and a per-phase `phases[]`
array (phaseId / verificationPosture / manualGate / needsReview / verificationPlanPath), so an LLM
agent reading the bundle sees the same posture as a human and Circe.

## Circe Projection Review

`circe/rekon-proof.json` `phaseGates[]` carry the posture fields; `circe/phase-plan.json`
`phases[].rekon` carries `verificationPosture` / `manualGate` / `needsReview`. Both are additive
and tolerated by Circe's `normalizeHandoffManifest` / `normalizePhasePlan` /
`normalizeRekonWorkOrder` / `normalizeRekonVerificationPlan` (unknown fields ignored), so
`handoff.json`, `phase-plan.json`, and the per-phase WorkOrder / VerificationPlan stay
schema-valid. The proof sidecar is Rekon-owned and never claims approval / readiness the source
artifacts do not support.

## Boundary Review

| Boundary | Decision |
| --- | --- |
| posture vs VerificationRun | projection metadata, not execution |
| skipped verification vs proof | skipped is not proof |
| manual phases | explicit reviewer gate |
| needs-review phases | explicit verification gap |
| command execution | no commands run |
| source writes | no source writes |
| Circe execution | Rekon does not run Circe |
| intent:go | deferred |

## Options Considered

| Surface | Status | Safety Finding |
| --- | --- | --- |
| phaseGates[].verificationPosture | shipped | every phase explicit |
| phaseGates[].manualGate | shipped | manual phases explicit |
| phaseGates[].needsReview | shipped | gaps explicit |
| circe/phase-plan.json phases[].rekon | shipped | projection metadata |
| per-phase VerificationPlan projection | shipped | emitted when executable/final requirements exist |
| verification-plan.md | shipped | human posture summary |
| agent/verification.json | shipped | agent-readable posture |

| Phase Kind | V1 Posture |
| --- | --- |
| investigate | manual-review unless explicit requirements attach |
| modify | executable when safe requirements exist; otherwise needs-review |
| refactor | executable when safe requirements exist; otherwise needs-review |
| verify | final-verification |
| review | manual-review unless explicit requirements attach |

| Option | Decision | Reason |
| --- | --- | --- |
| declare phase verification safe/stable | selected | posture is explicit and tested |
| install/setup/ascii UX decision next | selected | operator polish can proceed |
| scan auto context prep decision next | deferred | UX enhancement, not proof blocker |
| require VerificationRun now | rejected | execution boundary remains deferred |
| intent:go next | rejected | execution boundary not ready |

## Recommendation

**Intent Bundle Phase-Level Verification is safe/stable.** No blocker was found: every phase
carries explicit posture, `phase-modify` / `phase-refactor` carry executable verification when safe
requirements exist, `phase-verify` carries final verification, `phase-investigate` / `phase-review`
are explicit manual / reviewer gates, implementation phases without safe verification are
`needs-review` (never silently verified), and the posture is projection metadata only. No commands
are executed, no VerificationRun / VerificationResult is created, no source files are written, Rekon
runs no Circe, and intent:go remains deferred. The recommended next slice is **Rekon Install /
Setup / ASCII Art UX Decision** — the major plan-quality gap from the Circe dogfood is closed and
reviewed, so the remaining V1 / operator-readiness work is install / setup polish. A **Scan Auto
Context Preparation Decision** is a reasonable alternative but is deferred (it is a UX enhancement,
not a proof blocker, and scan was already safety-reviewed).

## What This Does Not Do

This is a strategy / safety review. It changes no runtime behavior; it does not change the phase
posture logic, does not implement VerificationRun, executes no commands, runs no Circe, writes no
source files, does not change `PreparedIntentPlan` generation, does not weaken approval/proof
semantics, does not implement `intent:go`, bumps no versions, and publishes nothing. It adds this
memo, a docs test, a review packet, and additive doc pointers.

## Follow-Up Work

- **Rekon Install / Setup / ASCII Art UX Decision** (recommended next): decide the polished install
  / first-run setup UX — banner vs compact mark, ASCII resources, setup-command posture,
  `create-rekon` decision, non-TTY / `--json` / `NO_COLOR` rules, and post-scan next-action copy.
  Still no setup implementation, no ASCII art implementation, no prompts before scan, no
  `intent:go`.
- **Scan Auto Context Preparation Decision** (alternative, deferred): decide whether `rekon scan`
  should auto-run the intent-context prep — a UX enhancement, not a proof blocker, decided
  separately because scan was already safety-reviewed.

> Update (slice 117): the recommended-next slice — **Rekon Install / Setup / ASCII Art UX Decision**
> — is now decided (staged install/setup polish). Next: Rekon Setup / Welcome UI Implementation. See
> [Rekon Install / Setup / ASCII Art UX Decision](./rekon-install-setup-ascii-ux-decision.md).

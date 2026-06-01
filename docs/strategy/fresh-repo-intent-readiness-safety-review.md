# Fresh Repo Intent Readiness Safety Review

## Decision Summary

The Fresh Repo Intent Readiness / Proof Context Fix (shipped at `def20b8`) is reviewed
end-to-end and found **safe and stable**. A fresh repo can now reach the public Rekon intent
preparation path without private artifact seeding by running `rekon scan` → `rekon intent
context prepare` → `rekon intent assess` → `rekon intent prepare` → `rekon intent status` →
`rekon intent work-order generate` → `rekon intent verification-plan generate` → `rekon intent
bundle write`. **Fresh repo intent readiness now has a public context-prep path.** **`rekon
intent context prepare` uses existing producer commands in dependency order.** **`rekon scan`
remains unchanged.** **`rekon refresh` remains unchanged.** Missing runtime/handoff evidence is
preserved honestly. This review changes no behavior; it records the assessment, adds the
deferred slice-113 cross-links, and recommends the phase-level VerificationPlan policy slice
next.

The sixteen review questions, answered:

1. **Is the fresh-repo intent context fix safe/stable?** Yes — the full public sequence passes
   on a fresh repo, covered by a contract test and the slice-113 acceptance proof.
2. **Does `rekon intent context prepare` use existing producer commands rather than duplicating
   builder logic?** Yes — it re-enters the CLI dispatch for `step graph build`, `handoff
   contract build`, `runtime graph observe`, `runtime graph drift`, and `handoff coverage
   report` (best-effort), with no duplicated builder wiring.
3. **Does it produce StepCapabilityGraph on a fresh repo?** Yes — a static topology projection
   from the scan-produced EvidenceGraph + CapabilityMap.
4. **Does it produce RuntimeGraphObservationReport / RuntimeGraphDriftReport honestly?** Yes —
   an empty observation (0 nodes/edges/events) and a drift report whose rows are
   `observation-missing` / `not-evaluated` (low severity) when there is no runtime evidence.
5. **Does it produce HandoffContract / HandoffCoverageReport honestly?** Yes — a contract with
   zero declared handoffs absent config, and a coverage report whose rows are `not-evaluated`
   absent an event log.
6. **Does intent assess avoid the missing StepCapabilityGraph / RuntimeGraphDriftReport hard
   blockers after context prep?** Yes — both artifacts now exist, so the two missing-artifact
   blockers do not fire; assess reports `needs-review` with honest warnings, not `blocked`.
7. **Does missing runtime/handoff evidence remain not-evaluated / observation-missing instead
   of false-clean?** Yes. **Missing runtime evidence is represented as not-evaluated /
   observation-missing, not false success.**
8. **Are blocker messages now accurate and actionable?** Yes — they point at `rekon intent
   context prepare` (one step) after `rekon scan`, and state that runtime/handoff context with
   no event log is not-evaluated, not proof.
9. **Are producer commands discoverable in help?** Yes — the orchestrator and the five
   producers are now listed in top-level help, with a fresh-repo flow note.
10. **Does the fresh-repo sequence work without private seeding?** Yes. **The fresh-repo path
    does not require private artifact seeding.**
11. **Does the fix preserve scan / refresh behavior?** Yes — neither `runRefresh` nor the scan
    branch changed.
12. **Does the fix avoid source writes?** Yes. **Rekon does not write source files in this
    path.**
13. **Does the fix avoid command execution beyond existing Rekon artifact generation?** Yes —
    it runs only Rekon's own artifact producers; no user/verification commands.
14. **Does the fix avoid running Circe?** Yes. **Rekon does not run Circe in this path.**
15. **Does the fix avoid intent:go?** Yes. **intent:go remains deferred.**
16. **Should phase-level VerificationPlan policy happen next, or scan-auto-context-prep?**
    Phase-level VerificationPlan policy — it directly affects plan quality and Circe/admin proof
    semantics; scan-auto-context-prep is deferred to a separate decision (scan was just
    safety-reviewed).

## Why This Review Exists

Circe operator dogfood found that a fresh repo could run `scan` / `refresh` but then `intent
assess` blocked on missing StepCapabilityGraph and RuntimeGraphDriftReport; the producer
commands existed and worked but were undiscoverable and not in the documented path. The fix
added `rekon intent context prepare` to make the public path usable without private seeding.
Before building on it (phase-level verification, install/UX polish), Rekon must confirm the fix
is safe and that missing runtime/handoff evidence is represented honestly. This review provides
that confirmation against the shipped implementation and its tests.

## Helper And CLI Reviewed

`prepareIntentContext(root)` in `packages/cli/src/index.ts` runs the five producers by
re-entering `main()` (best-effort, per-step output suppressed, sub-failures recorded and never
fail the orchestrator; the caller's `process.exitCode` is preserved). The `rekon intent context
prepare` branch reports the per-step results, a `summary`, six boundary booleans (all false),
and the recommended next action. The two `IntentAssessmentReport` blocker messages in
`packages/capability-model/src/intent-assessment-report.ts` now point at the one-step command
and state the not-evaluated honesty. No change to `runRefresh`, the scan branch, or the assess
severity policy.

## Root Cause Review

`rekon scan` (= `runRefresh`) builds the core substrate but not the intent prerequisites; the
producers existed and worked but were not discoverable or documented; the two missing-artifact
blockers fired with messages that named individual commands rather than a one-step public path.
The fix closes all three gaps additively without touching scan/refresh or the severity policy.

## Context Preparation Review

`rekon intent context prepare` runs the producers in dependency order (step graph → handoff
contract → runtime observe → runtime drift → handoff coverage). Because the builders tolerate
missing dependencies (emitting not-evaluated context), the orchestration is robust on a fresh
repo and idempotent across reruns. It writes only `.rekon/` artifacts; it creates no WorkOrder,
VerificationPlan, docs, agent handoff, or CI surface.

## Artifact Producer Review

| Artifact | Producer Command | Fresh Repo Behavior |
| --- | --- | --- |
| StepCapabilityGraph | rekon step graph build | emits topology from scan context |
| HandoffContract | rekon handoff contract build | emits zero declared handoffs without config |
| RuntimeGraphObservationReport | rekon runtime graph observe | emits empty observation without event log |
| RuntimeGraphDriftReport | rekon runtime graph drift | emits observation-missing / not-evaluated |
| HandoffCoverageReport | rekon handoff coverage report | emits not-evaluated without event log |

## Intent Assessment Review

`rekon intent assess` reads the latest of each context artifact from the store. With the
substrate present, `stepGraphPresent` and `driftPresent` are true, so the two high-severity
missing-artifact blockers are not pushed; per-row drift blockers still fire for genuine
high-severity unresolved drift (unchanged). On a fresh repo the result is `readiness:
needs-review` with warnings (proof / runtime not yet proven) — never a false `ready`. **`rekon
intent assess` is no longer blocked by missing StepCapabilityGraph / RuntimeGraphDriftReport
after context prep.**

## Runtime / Handoff Honesty Review

With no runtime/handoff event log, the RuntimeGraphObservationReport is an empty observation and
the RuntimeGraphDriftReport rows are `observation-missing` / `not-evaluated` (low severity, zero
high-severity verdicts); the HandoffCoverageReport rows are `not-evaluated`. None of these read
as a clean / proven runtime. The assessment surfaces this as warnings, so the absence of runtime
evidence is explicit, not hidden. **Missing runtime evidence is represented as not-evaluated /
observation-missing, not false success.**

## Fresh Repo Acceptance Proof

Recorded from slice 113: a fresh temp repo (no manual `.rekon/artifacts` seeding) ran `scan`
(passed) → `intent context prepare` (built 5/5) → `intent assess` (**0 blockers, needs-review,
honest warnings**) → `intent prepare` → `intent status` → `intent work-order generate` →
`intent verification-plan generate` → `intent bundle write`. The bundle emitted
`.rekon/intent/plans/<intent-id>/circe/handoff.json`; `artifacts validate` returned
`valid: true`; the source file was byte-for-byte unchanged. Circe was not run by Rekon.

## Phase-Level Verification Finding

**Phase-level VerificationPlan behavior remains a recorded follow-up.** The Circe dogfood
observed the bundle emitted a VerificationPlan only for `phase-verify`, with earlier phases
running in Circe under skipped Rekon verification. Preferred future policy: `phase-modify`
should carry an executable VerificationPlan when possible; `phase-verify` carries final
verification; `phase-investigate` / `phase-review` are explicit manual / reviewer-gated phases;
manual-only phases must be explicitly marked so skipped verification does not look like proof.
This is owned by the follow-up slice **Intent Bundle Phase-Level Verification Policy /
Implementation**, not changed here.

## Boundary Review

| Boundary | Decision |
| --- | --- |
| context prep vs scan | separate command; scan unchanged |
| context prep vs refresh | refresh unchanged |
| missing runtime evidence | not-evaluated / observation-missing |
| context prep vs Circe | does not run Circe |
| context prep vs source writes | no source writes |
| context prep vs intent:go | deferred |

## Options Considered

| Surface | Status | Safety Finding |
| --- | --- | --- |
| rekon intent context prepare | shipped | public context-prep path |
| StepCapabilityGraph producer | shipped | creates expected topology |
| HandoffContract producer | shipped | declared policy / zero handoffs if none |
| HandoffCoverageReport producer | shipped | not-evaluated when no event log |
| RuntimeGraphObservationReport producer | shipped | empty observation when no events |
| RuntimeGraphDriftReport producer | shipped | observation-missing / not-evaluated, not false-clean |
| intent assess after context prep | shipped | no missing spine blockers |

| Option | Decision | Reason |
| --- | --- | --- |
| declare fix safe/stable | selected | fresh-repo path works honestly |
| phase-level verification policy next | selected | remaining proof-quality gap |
| scan auto context prep next | deferred | scan was just reviewed; decide separately |
| weaken assess blockers silently | rejected | would hide missing context |
| require private artifact seeding | rejected | not operator-usable |

## Recommendation

**Fresh Repo Intent Readiness / Proof Context Fix is safe/stable.** No blocker was found: the
fresh-repo public path works without private seeding, runtime/handoff absence is honest
not-evaluated context, `scan` / `refresh` and the assess severity policy are unchanged, and
Rekon runs no Circe, writes no source, and does not implement `intent:go`. The recommended next
slice is **Intent Bundle Phase-Level Verification Policy / Implementation** — make `phase-modify`
carry executable verification when possible while `phase-investigate` / `phase-review` are
explicit manual/reviewer-gated phases, so skipped verification never looks like proof. A
**Scan Auto Context Preparation Decision** is a reasonable alternative but is deferred (scan was
just safety-reviewed); the default recommendation is the phase-level verification policy because
it directly affects plan quality and Circe/admin proof semantics.

## What This Does Not Do

This is a strategy / safety review. It changes no runtime behavior; it does not change `scan` /
`refresh` / `intent context prepare` / the assess blockers, does not auto-run context prep from
scan, does not implement phase-level VerificationPlan policy, runs no Circe, executes no
source-changing commands, does not implement `intent:go`, bumps no versions, and publishes
nothing. It adds this memo, a docs test, a review packet, the deferred slice-113 concept /
strategy cross-links, and additive doc pointers.

## Follow-Up Work

- **Intent Bundle Phase-Level Verification Policy / Implementation** (recommended next): make
  phase-level verification explicit in bundles and Circe projections — `phase-modify` gets
  executable verification when possible, `phase-verify` carries final verification,
  `phase-investigate` / `phase-review` are explicit manual / reviewer-gated, and skipped
  verification never looks like proof. Still no `intent:go`, no Rekon-side source writes, no
  Circe execution by Rekon.
- **Scan Auto Context Preparation Decision** (alternative, deferred): decide whether `rekon
  scan` should auto-run the intent-context prep — separate from this review because scan was
  just safety-reviewed.

> Update (slice 115): the recommended follow-up — **Intent Bundle Phase-Level Verification Policy /
> Implementation** — has shipped. Phase-level verification is now explicit in the intent plan
> bundle and its Circe projection (per-phase `verificationPosture`), so skipped verification never
> reads as proof. Next: Intent Bundle Phase-Level Verification Safety Review. See
> [intent plan bundle](../concepts/intent-plan-bundle.md).

> Update (slice 116): that safety review shipped — **Intent Bundle Phase-Level Verification is
> safe/stable**. Next: Rekon Install / Setup / ASCII Art UX Decision. See
> [Intent Bundle Phase-Level Verification Safety Review](./intent-bundle-phase-level-verification-safety-review.md).

> Update (slice 117): that next slice — **Rekon Install / Setup / ASCII Art UX Decision** — is now
> decided (staged install/setup polish, scan-first, non-interactive install). See
> [Rekon Install / Setup / ASCII Art UX Decision](./rekon-install-setup-ascii-ux-decision.md).

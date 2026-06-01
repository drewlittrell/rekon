# Review Packet — Fresh Repo Intent Readiness / Proof Context Fix

## CHANGES MADE

Product-capability batch fixing the fresh-repo intent-preparation gap exposed by Circe operator
dogfood: a fresh repo running `rekon scan` → `rekon intent assess` was blocked by missing
`StepCapabilityGraph` and `RuntimeGraphDriftReport`. Adds a single orchestrator command
**`rekon intent context prepare`** that builds the intent-readiness context substrate by running
the existing producer commands (step graph build, handoff contract build, runtime graph
observe, runtime graph drift, handoff coverage report) in dependency order; makes the
orchestrator and producers discoverable in top-level help; and rewrites the two `intent assess`
blocker messages to point at the one-step command and be honest about runtime "not-evaluated".
No change to `scan` / `refresh` / `runRefresh`, no change to the assess approval/proof
severity policy, no new artifact type, no source-execution.

## PUBLIC API CHANGES

New CLI command `rekon intent context prepare [--root <path>] [--json]`. New help lines for the
orchestrator and the five producer commands, and an updated intent-flow note. Two
`IntentAssessmentReport` blocker messages reworded. No artifact type, schema, `package.json`,
or version change; producer command behavior unchanged.

## PURPOSE PRESERVATION CHECK

Original problem: the public Rekon intent path was not usable from a fresh repo without private
test seeding — `intent assess` hard-blocked on context artifacts that `scan` does not produce
and whose producers were undiscoverable. Product guarantee restored and proven: a fresh
operator can run the documented sequence `rekon scan → rekon intent context prepare → rekon
intent assess → … → rekon intent bundle write` with **no manual `.rekon/artifacts` seeding**,
get a Circe-importable handoff, and keep the boundary intact — Rekon prepares/proves/packages/
exports; Circe imports/orchestrates; Rekon executes no source changes, runs no Circe, and
`intent:go` remains deferred. Missing runtime/handoff context is represented as honest
not-evaluated state, never false proof.

## ROOT CAUSE

`rekon scan` (= `runRefresh`) produces the core substrate (EvidenceGraph, CapabilityMap,
IntelligenceSnapshot, FindingReport, …) but not the intent prerequisites
(StepCapabilityGraph + runtime/handoff context). `rekon intent assess` reads the latest of each
context artifact from the store and pushes a **high-severity blocker** for a missing
StepCapabilityGraph and a missing RuntimeGraphDriftReport (`allowMissingSpine` defaults off).
The five producer commands exist and work on a fresh repo, but were **not listed in top-level
help** and not part of the documented public path — so a fresh operator hit the blocker with no
discoverable way forward.

## ARTIFACT PRODUCER MAP

| Artifact | Producer Command | Exists | In Help | Fresh Repo Behavior |
| --- | --- | --- | --- | --- |
| StepCapabilityGraph | rekon step graph build | yes | now (added) | static spine from EvidenceGraph + CapabilityMap (scan substrate); builds cleanly |
| HandoffContract | rekon handoff contract build | yes | now (added) | from latest StepCapabilityGraph; zero handoffs without optional config |
| HandoffCoverageReport | rekon handoff coverage report | yes | now (added) | from HandoffContract; not-evaluated rows when no event log |
| RuntimeGraphObservationReport | rekon runtime graph observe | yes | now (added) | empty observation (0 nodes/edges/events) when no event log |
| RuntimeGraphDriftReport | rekon runtime graph drift | yes | now (added) | not-evaluated / observation-missing rows (low severity) when no runtime evidence |
| PathFreshnessReport | rekon paths freshness | yes | yes (prior) | source fingerprint diff; works on a fresh repo |
| VerificationResult | (none in V1 — Circe/runner) | n/a | n/a | deferred; surfaces as a warning at preparation time, not a blocker |

All producer commands return exit 0 on a fresh repo and write honest not-evaluated
runtime/handoff context.

## INTENT ASSESSMENT BLOCKER POLICY

Hard blockers (`severity: high`): missing StepCapabilityGraph, missing RuntimeGraphDriftReport
(unless `allowMissingSpine`), plus per-row high-severity unresolved runtime drift and
unresolved-contract coverage. Warnings: missing HandoffCoverageReport / RuntimeGraphObservation
/ VerificationResult, and observed-only / observation-missing drift rows. This slice does **not**
weaken that policy: once `rekon intent context prepare` writes the substrate, the two
missing-artifact blockers clear because the artifacts now exist; the runtime/handoff artifacts
honestly say "not-evaluated", so `intent assess` reports `readiness: needs-review` with warnings
(runtime not proven), never a false "ready".

## COMMAND HELP / MESSAGE REVIEW

The blocker messages previously said `Run \`rekon step graph build\`` / `Run \`rekon runtime
graph drift\`` — real commands, but absent from help. Now: the messages point at `rekon intent
context prepare` (one step) after `rekon scan`, and note that with no runtime/handoff event log
the runtime/handoff context is recorded as not-evaluated, not proof. The orchestrator and the
five producers are now listed in top-level help, and the intent-flow note shows `scan → intent
context prepare → intent assess → …`.

## FRESH REPO ACCEPTANCE PROOF

A fresh temp repo (`package.json`, `src/index.ts`, `plans/add-marker.md`), with no manual
artifact seeding, ran: `scan` (passed) → `intent context prepare` (built 5/5) → `intent assess`
(**readiness needs-review, 0 blockers, 2 warnings — not blocked**) → `intent prepare` (ok) →
`intent status` (ok) → `intent work-order generate` (ok) → `intent verification-plan generate`
(ok) → `intent bundle write` (ok). `intent bundle write` emitted
`.rekon/intent/plans/<intent-id>/circe/handoff.json`; `artifacts validate` returned
`valid: true`; `src/index.ts` was byte-for-byte unchanged. No commands were executed and Circe
was not run by Rekon.

## PHASE-LEVEL VERIFICATION FINDING

Recorded honestly (not fixed in this slice — this slice scoped to the readiness/context fix).
The Circe dogfood observed that the successful bundle emitted a VerificationPlan only for
`phase-verify`; earlier phases ran in Circe with skipped Rekon verification.
1. Why only phase-verify? The intent VerificationPlan generation appears to attach executable
   verification requirements to the verify phase only; not deeply investigated here.
2. Are requirements attached only to phase-verify? The dogfood evidence indicates so; confirm in
   the verification-plan generation phase-requirement mapping.
3. Can phase-modify requirements be generated safely? Plausibly, but needs a dedicated policy +
   implementation decision.
4. Do manual-only phases carry explicit metadata? Unknown — to be investigated; if absent, a
   skipped verification could read as proof.
5. Does Circe/admin distinguish manual/reviewer-gated from skipped proof? Unknown — to be
   investigated.
Follow-up slice: **Intent Bundle Phase-Level Verification Policy / Implementation** — make
`phase-modify` carry an executable VerificationPlan or an explicit manual/needs-review marker,
ensure manual-only phases are explicitly marked, and confirm Circe/admin distinguishes
manual/reviewer-gated from skipped proof.

## BOUNDARY MODEL

Rekon prepares/proves/packages/exports; Circe imports/orchestrates. `rekon intent context
prepare` builds intelligence-substrate artifacts only; its `--json` carries boundary booleans
all false (`executedCommands`, `wroteSourceFiles`, `ranCirce`, `createdWorkOrder`,
`createdVerificationPlan`, `implementedIntentGo`). No Rekon-side source execution, no Circe run,
no `intent:go`. Missing proof is never shown as proof.

## TESTS / VERIFICATION

New `tests/contract/cli-fresh-repo-intent-context.test.mjs` (fresh-repo sequence not blocked +
boundaries; runtime drift honest not-evaluated; full sequence emits circe/handoff.json +
validates clean + no source writes; help lists orchestrator + producers). New
`tests/docs/fresh-repo-intent-readiness-context.test.mjs` (README path, CHANGELOG, producer-map
table, not-evaluated honesty, phase-level follow-up). Full nine-command gate + the fresh-repo
CLI smoke. Circe was not run as part of verification.

## INTENTIONALLY UNTOUCHED

No change to `scan` / `refresh` / `runRefresh`, no change to the `intent assess` approval/proof
severity policy, no Rekon-side source execution, no Circe execution by Rekon, no new artifact
type, no `intent:go`, no npm publish, no version bump, no branch. The phase-level VerificationPlan
behavior is recorded as a follow-up, not changed here.

## RISKS / FOLLOW-UP

- `rekon intent context prepare` re-enters the CLI dispatch for each producer (best-effort,
  output suppressed); a producer failure is recorded and does not fail the orchestrator. The
  fresh-repo acceptance + contract tests exercise the happy path.
- Scan was deliberately left unchanged (Outcome 2: explicit one-step context prep) to protect
  the just-shipped/safety-reviewed first-run command; auto-running context prep inside `scan`
  (Outcome 1) is a possible future enhancement.
- Phase-level VerificationPlan coverage is a recorded follow-up (above).

## NEXT STEP

Fresh Repo Intent Readiness Safety Review, or — if the phase behavior is prioritized — Intent
Bundle Phase-Level Verification Policy / Implementation. Still no `intent:go`, no Rekon-side
source writes, no Circe execution by Rekon.

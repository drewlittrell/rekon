# Review Packet — Fresh Repo Intent Handoff / Circe Dogfood Review (slice 136)

## CHANGES MADE

- **new** `docs/strategy/fresh-repo-intent-handoff-circe-dogfood-review.md` — the
  dogfood review of record.
- **new** `tests/contract/fresh-repo-intent-handoff-dogfood.test.mjs` (29
  assertions) — full public path on a realistic fresh TS repo + bundle / Circe
  projection / boundary / proof / immutability inspection.
- **new** `tests/docs/fresh-repo-intent-handoff-circe-dogfood-review.test.mjs`
  (12 assertions).
- **new** this review packet.
- **docs** — cross-reference updates to the loop-closure / answer-merge-back
  strategy docs, the three intent concept docs, the actionability-report artifact
  doc, the v1 release/migration notes, README, and CHANGELOG.
- **No source change.** The shipped public path already produced a complete,
  Circe-importable handoff with every boundary explicit; no doc / proof-harness /
  projection / path-ref / CLI-JSON-field fix was required.

## PUBLIC API CHANGES

None. No new artifact family, type, helper signature, parser, source-plan writer,
LLM wiring, command execution, Rekon-driven Circe runner, or `intent:go`. This is
a review/proof slice.

## PURPOSE PRESERVATION CHECK

A fresh-repo operator can go from a rough plan to a Circe-importable handoff using
only public Rekon commands, with all proof gates explicit, and without Rekon
executing commands, writing source/plan files, running Circe, or implementing
`intent:go`. Confirmed end-to-end on a realistic TS package and by a real Circe
import from outside Rekon.

## DOGFOOD REPOSITORY

Small TypeScript package: `src/index.ts` (existing `export const existing` +
`greet(name: string): string`), `test/index.test.ts` (a `node:test` greet test),
`tsconfig.json` (`strict`, `noEmit`), `package.json` (typecheck/test/build
scripts + `typescript` devDep, never installed), and `plans/add-marker-rough.md`
(a rough plan with a `TODO` and a `Non-goals` section). More realistic than the
slice-135 minimal fixture.

## PUBLIC SEQUENCE

`scan → intent context prepare → intent plan review → intent plan answer →
intent assess (--path ×2, --constraint ×2) → intent prepare
(--actionability-report) → intent status → intent approve (--accept ×2) →
intent status transition (--to work-ready) → intent work-order generate →
intent verification-plan generate → intent bundle write → artifacts validate`.
All public commands; no private/dev surface used.

## END-TO-END RESULT

Review non-actionable (8 questions) → answer writes a new actionable revision
(source report byte-identical, `answerTrace` present) → assess records both paths
and both constraints → prepare writes a `PreparedIntentPlan` (kinds `modify`,
`verify`; no auto-approve; `needs-review` with required gaps
`verification-proof-missing` + `runtime-drift-unresolved`) → approve succeeds on
accepting those gaps → work-ready transition → WorkOrder + VerificationPlan
generate with no `plan-not-approved` / `status-not-work-ready` blockers → bundle
write emits the full handoff → `artifacts validate` clean. `src/index.ts`,
`test/index.test.ts`, and `plans/add-marker-rough.md` are byte-identical
afterward; zero `VerificationRun` / `VerificationResult` artifacts exist.

## BUNDLE / CIRCE PROJECTION INSPECTION

Present in `.rekon/intent/plans/<intent-id>/`: `manifest.json`,
`prepared-plan.md`, `verification-plan.md`, `agent/verification.json`,
`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json`,
`circe/work-orders/*` (2), `circe/verification-plans/*` (2).
`circe/handoff.json.artifacts` references each per-phase WorkOrder and
VerificationPlan by `path` + `artifactId`. `handoff.producer.system` is
`"rekon"`. `manifest.json.circe.phaseVerification` summarizes posture counts
(`executable: 1`, `manualReview: 0`, `finalVerification: 1`, `needsReview: 0`).

## PROOF SIDECAR + PHASE POSTURE

`circe/rekon-proof.json` carries the `approval` envelope, a `proof` block, and
`phaseGates[]`. Each phase gate has a string `verificationPosture` and boolean
`manualGate` / `needsReview`; manual and needs-review phases are surfaced, not
hidden. The gates block asserts `sourceWriteAllowed: false`,
`commandsExecuted: false`, `intentGoDeferred: true` at top level and per phase.

## ACCEPTED-RISK TRACEABILITY

The accepted proof gaps are traceable, not asserted bare:
`proof.proof.runtimeDrift.accepted` is `true` with a `ref` back to the source
`RuntimeGraphDriftReport`, and the `approval` envelope (with the operator's
accepted gaps and reason) is present in the sidecar.

## OPTIONAL CIRCE IMPORT VALIDATION

Circe (v0.1.0, `/Users/andrewlittrell/Code/Circe`) exposes `circe import
rekon-phase-plan` and `circe import rekon-work-order` (the latter accepting
`--verification-plan`). Run from outside Rekon against an **isolated**
`--store-root`, both accepted the dogfood projection (`{ ok: true }`) and created
native work items + events. The Circe checkout was not modified. This is real,
recorded, and **non-blocking**; it lives outside the hermetic contract test.

## EMBEDDED SAFETY REVIEW

**The dogfood review does not introduce a new execution/source-write/Circe
boundary; it reviews the already-shipped public path end-to-end.** The seven
validator-forced `IntentPlanActionabilityReport` boundaries remain all-false; the
bundle's `manifest.boundaries` and `circe/rekon-proof.json` gates remain as
shipped; `intent:go` stays deferred. The seven boundary subsections below record
the confirmation.

## BOUNDARY — executedCommands = false

The review/answer artifacts never execute commands; the whole path runs without
producing any `VerificationRun` / `VerificationResult`; `agent/verification.json`
sets `executesCommands: false` and lists commands as text. Verification commands
are carried for Circe to run later, never run by Rekon.

## BOUNDARY — wroteSourceFiles = false

`src/index.ts` and `test/index.test.ts` are byte-identical before and after the
full path. `manifest.boundaries.writesSourceFiles` and proof
`gates.sourceWriteAllowed` are both `false`.

## BOUNDARY — createdPreparedIntentPlan = false (review/answer)

`intent plan review` and `intent plan answer` create no `PreparedIntentPlan`;
the plan is created only by the separate, explicit `intent prepare` command,
which consults the answered report and does not auto-approve.

## BOUNDARY — createdWorkOrder = false (review/answer)

Review/answer create no `WorkOrder`. WorkOrders are produced only by the explicit
`intent work-order generate` command, gated on approval + work-ready status.

## BOUNDARY — createdVerificationPlan = false (review/answer)

Review/answer create no `VerificationPlan`. VerificationPlans are produced only by
the explicit `intent verification-plan generate` command, gated on approval +
work-ready status.

## BOUNDARY — ranCirce = false

Rekon does not run Circe during bundle generation. The bundle is a projection
written by Rekon (`handoff.producer.system: "rekon"`) with **no Circe-run record
anywhere** (no `ranCirce`, `runsCirce`, `circeExecuted`, `importedAt`). The
optional Circe import was performed separately, by Circe, from outside Rekon.

## BOUNDARY — implementedIntentGo = false

`intent:go` (the source-write step) remains deferred behind its existing gate.
Proof `gates.intentGoDeferred` is `true`; `manifest.boundaries.implementsIntentGo`
is `false`. Nothing in this slice implements or relaxes it.

## TESTS / VERIFICATION

Contract (29) + docs (12) green. Full 9-command gate green. CLI dogfood = the
realistic-repo end-to-end run. Optional Circe import (non-blocking) succeeded
from outside Rekon. No source change, so no rebuild semantics changed.

## INTENTIONALLY UNTOUCHED / RISKS / NEXT STEP

Untouched: kernel validators, approval / status / handoff gate logic,
answer/merge-back helper, bundle renderer, Circe projection shape, the
verify-phase synthesis from slice 135. No version bump, no npm publish, no branch,
no Circe modification. Risk: the Circe importer surface (`rekon-phase-plan` /
`rekon-work-order`) is an external dependency; this review pins the commands and
flags observed at Circe v0.1.0 but does not couple the hermetic test to them.
**Next step: V1 Publish Readiness Reconciliation / npm Release Decision.** Do not
start it without a new confirmed Work Order against the new SHA.

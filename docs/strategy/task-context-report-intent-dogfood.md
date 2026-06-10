# TaskContextReport Intent Dogfood

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **Broader-workflow role decided (slice 176):** TaskContextReport is the standard
> pre-intent / pre-work context substrate — context only, never proof/approval;
> consumption stays explicit; the deterministic spine stays separately gated;
> intent:go deferred. Next: TaskContextReport Human/Agent Context Export. See
> [`task-context-report-broader-workflow-decision.md`](./task-context-report-broader-workflow-decision.md).

> **Provider-default UX fixed (slice 175):** `rekon context task` with an existing
> embeddings index, no `--path`, and an implicitly-defaulted provider whose key is
> missing now degrades to a graph + lexical context fallback instead of exiting
> non-zero; explicit-provider failures stay strict; task context stays
> proposal/context, not proof; intent:go deferred. See
> [`intent-planning-ux-context-quality-fix.md`](./intent-planning-ux-context-quality-fix.md).

> **Safety-reviewed (slice 174):** this dogfood was reviewed end-to-end and declared
> safe/stable — the full path completed because the existing readiness / actionability /
> approval / status / handoff gates held, not because task context weakened any boundary;
> intent:go deferred. Next: Intent Planning UX / Context Quality Fix. See
> [`task-context-report-intent-dogfood-safety-review.md`](./task-context-report-intent-dogfood-safety-review.md).

> **Slice 173 · product dogfood / review batch.** Base `5f76d89`. Ran the full
> operator path using TaskContextReport as opt-in context for intent planning:
> `context task` → `intent assess --task-context` → `intent plan review
> --task-context` → `plan answer` → `prepare` → `approve` → `status transition` →
> `work-order generate` → `verification-plan generate` → `bundle write`. Verdict:
> task context usefully grounds planning while every readiness / actionability /
> approval / status / handoff gate holds. No source change shipped.

## Summary

The shipped slice-171 opt-in TaskContextReport consumption was dogfooded end-to-end on
two fresh fixtures. The full intent path completes; task context measurably improves
the assessment and revision surfaces without weakening any deterministic gate. The
findings below are captured by a 26-assertion contract test that replays the path
keyless. **TaskContextReport improved matchedContext** and **TaskContextReport
improved revisionPrompt**, and it remained proposal/context, not proof, throughout.

## Why This Dogfood Exists

TaskContextReport was decided (slice 170), implemented (slice 171), and safety-reviewed
(slice 172). The remaining question is whether it improves the *real* operator path —
not just whether the boundary holds in code. This dogfood answers that on realistic
tasks before any deeper automation or broader workflow use.

## Scenario A — Full Operator Path (Explicit Context)

A fresh repo (`src/index.ts` exporting `greet`, `plans/rough.md` asking for a marker
export with "Do not change greet behavior. Verify marker behavior.") was walked through
the entire path with `--task-context-ref <TaskContextReport>` on assess and plan review.

- **context task** wrote a TaskContextReport (do-not-touch "Do not change greet
  behavior.", verification hint "Verify marker behavior." as a `manual-verification`
  hint with no command inferred).
- **intent assess** returned `taskContext.used = 1`, readiness `needs-review`, zero
  suppressed blockers, and `matchedContext.paths` now included `src/index.ts` (from the
  used report). **task context did not make readiness ready by itself.**
- **intent plan review** returned `taskContext.used = 1`, status `needs-revision`, and
  the written `revisionPrompt` grew a "Task context (proposal/context, not proof)"
  section listing relevant paths, the do-not-touch constraint, and the verification
  hint (rendered "(hint, not an executed command)"). **do-not-touch guidance survived
  into plan review** and **verification-hint guidance survived into plan review.**
- **plan answer** (six elicitation answers) produced an `actionable` report. **task
  context did not make actionability actionable by itself** — the operator's answers
  did.
- **prepare** consumed `--assessment` + `--actionability-report` only and produced a
  needs-review PreparedIntentPlan with two implementation-bearing phases. **prepare
  remained lineage-only.**
- **approve** without `--accept` returned `blocked`; with the plan's required accepted
  risks (`verification-proof-missing`, `runtime-drift-unresolved`) it wrote a new
  `approved` PreparedIntentPlan revision. **approval still required explicit accepted
  risks.**
- **status transition --to work-ready** wrote a `work-ready` IntentStatusReport.
- **work-order generate** and **verification-plan generate** both succeeded (`status:
  generated`) against the approved plan + work-ready status. **WorkOrder /
  VerificationPlan generated only after approve + work-ready status.**
- **bundle write** succeeded (`ok: true`) and reported `bundlePath`, `handoffPath`,
  `phasePlanPath`, and `rekonProofPath`. **bundle write emitted handoff paths.**
- **artifacts validate** was clean; the working tree stayed clean. **source and plan
  files were unchanged** and **no commands were executed** (no VerificationRun was
  produced by the path). **intent:go remains deferred** (no IntentGo artifact exists).

## Scenario B — Retrieval-Assisted Context

A second fixture (`src/users/profile.ts`, `src/sms/route-message.ts`,
`plans/sms.md` asking to update SMS routing and "Do not change profile label
behavior. Verify routing behavior.") exercised retrieval. With `embeddings index
--provider mock` and `context task --provider mock`, the report came back `partial`
with a clear `retrieval-low-signal` warning ("all 8 embedding neighbor(s) scored below
the useful band"), and still captured do-not-touch ("Do not change profile label
behavior.") and a `manual-verification` hint. Source unchanged.

## Retrieval-Assisted Result (Live Voyage, Non-Blocking Evidence)

Run only with an explicit Voyage key (not committed; loaded by length, never printed).
With `voyage-code-3`, `context task` surfaced `src/sms/route-message.ts` as context
items (band `weak`, scores ~0.59) — more useful than the lexical mock (which selected
none) — while honestly labelling the result `retrieval-low-signal` on this tiny
fixture. do-not-touch and verification hints were preserved. This shows real retrieval
improves the context surface without making weak retrieval look strong.

## Decision Questions

1. Improves assess matchedContext — yes (`src/index.ts` added). 2. Improves plan-review
revisionPrompt — yes (Task context section). 3. do-not-touch survives — yes. 4.
verification-hint survives — yes. 5. Helps plan answer — yes, the revisionPrompt's
task-context grounding orients the operator's answers (answers remain operator-driven).
6. Makes a readiness/proof gate more permissive — no. 7. Makes actionability more
permissive by itself — no. 8. Prepare lineage-only — yes. 9. Approval requires explicit
accepted risks — yes. 10. WorkOrder/VerificationPlan only after approve + work-ready —
yes. 11. Bundle emits handoff paths — yes. 12. Source/plan unchanged — yes. 13.
Retrieval-assisted context useful / low-signal — mock: low-signal (clear warning);
live Voyage: surfaces the relevant file, still weak-band on the tiny fixture. 14.
Useful in broader intent workflows — yes; the additive boundary held throughout. 15.
Should be used more broadly — yes, after a safety review of the dogfood path. 16.
Follow-up — TaskContextReport Intent Dogfood Safety Review.

## Findings

- **Useful, additive grounding.** Task context improved both consumer surfaces
  (matchedContext, revisionPrompt) and preserved do-not-touch and verification-hint
  guidance into planning — exactly the intended value — with no gate weakened.
- **Boundary held end-to-end.** Readiness, actionability, approval (explicit accepted
  risks), status transition, and handoff generation all required their normal inputs;
  task context never short-circuited any of them.
- **Ergonomics note (non-blocking).** `context task` with no `--path` and an existing
  embeddings index defaults to the configured embedding provider (voyage) and exits
  non-zero on a missing key, rather than degrading to a graph + lexical report. Passing
  `--provider mock` (or `--path`, or running without an index) produces a clean
  low-signal report. Candidate for an **Intent Planning UX / Context Quality Fix**;
  does not block this dogfood (the documented path uses an explicit provider or paths).

## What This Does Not Do

No automatic consumption; no treating task context as proof; no plan approval by
context; no proof-gate satisfaction by context; no approval-policy change; no
status-policy change; no hint execution; no command execution; no source writes; no
WorkOrder / VerificationPlan creation from task context; no Circe; no intent:go; no
duplicate detection; no canonical recommendations; no npm publish; no version bump; no
branch.

## Recommendation / Next Step

The path is healthy and task context is useful. Recommended next slice:
**TaskContextReport Intent Dogfood Safety Review** — review the full task-context
intent path before broader agent/operator workflow use. Alternative (only on the
concrete ergonomics finding above): **Intent Planning UX / Context Quality Fix**.

## Related

- [TaskContextReport Intent Integration Safety Review](./task-context-report-intent-integration-safety-review.md)
- [TaskContextReport Intent Integration Implementation](./task-context-report-intent-integration-implementation.md)
- [TaskContextReport Selection Quality Fix](./task-context-report-selection-quality-fix.md)
- [TaskContextReport Dogfood Review](./task-context-report-dogfood-review.md)

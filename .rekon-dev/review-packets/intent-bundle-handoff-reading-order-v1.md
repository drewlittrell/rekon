# Review Packet — Intent Bundle Handoff Reading Order Implementation (slice 193, base 01cda30)

Implements: [TaskContextReport Bundle Handoff Broader Workflow Decision](../../docs/strategy/task-context-report-bundle-handoff-broader-workflow-decision.md) (Option B).
Memo: [intent-bundle-handoff-reading-order-implementation.md](../../docs/strategy/intent-bundle-handoff-reading-order-implementation.md)

## CHANGES MADE

- Source: four additive, always-rendered renderer changes in
  `packages/capability-docs/src/intent-plan-bundle.ts` — a "## Handoff reading order"
  section in `README.md`, a "## Reading order" section in `agent/instructions.md`, a "##
  Reading order" section in `agent/handoff.md`, and an additive `handoffReadingOrder`
  metadata block in `agent/context.json`.
- New contract test `tests/contract/intent-bundle-handoff-reading-order.test.mjs` (35
  assertions) + docs test `tests/docs/intent-bundle-handoff-reading-order.test.mjs` (22
  assertions).
- New implementation memo + this review packet; README banner + CHANGELOG entry; guarded
  cross-refs across the TaskContextReport family docs + roadmaps.

## PUBLIC API CHANGES

Additive only. Bundle `README.md` / `agent/instructions.md` / `agent/handoff.md` gain a
reading-order section; `agent/context.json` gains a `handoffReadingOrder` key. No type, CLI
flag, artifact, Circe schema, actor-contract content, or gate changed. No existing
`agent/context.json` field changed (the key is additive; no test asserts exact key sets).

## PURPOSE PRESERVATION CHECK

The bundle now contains task context, source/verification authority (incl. phase
source-change posture), and the Circe contract layer. Humans and agents needed a clear
reading order so context is not over-weighted and authority surfaces are not under-read.
This implementation makes the bundle self-guiding without granting any new authority —
TaskContextReport stays optional context, gates stay authoritative, source-change posture
stays handoff evidence (not approval), actor contracts stay role/return guidance, and
operator-only Circe commands stay operator-only.

## SOURCE REVIEW

Grounded the four renderers in `intent-plan-bundle.ts` (the `readme` / `agentHandoff` /
`agentContext` / `agentInstructions` builders), the guarded slice-185/188 task-context
sections, the `BOUNDARY_NOTE` + `TASK_CONTEXT_SIDECAR_*` constants, and the `e91dc087`
phase source-change posture threaded through `CircePhaseGate` /
`agent/verification.json.phases[].sourceChange` / `circe/rekon-proof.json`. The reading-order
additions are always-on and additive; the gate booleans and Circe files are untouched.

## BUNDLE README READING ORDER

`README.md` "## Handoff reading order" renders a human list (README → context/task-context.md
if present → verification-plan.md → WorkOrder/source refs/agent files → actor contracts only
for Circe-facing handoffs) and an agent list (instructions → handoff → context.json →
task-context.agent.json if present → source-refs.json → verification.json → WorkOrder /
VerificationPlan + phase source-change posture → Circe handoff + actor contracts if
Circe-targeted), plus the boundary notes.

## AGENT INSTRUCTIONS READING ORDER

`agent/instructions.md` "## Reading order" ("Read these before acting:") lists the ordered
agent reads and states the boundary notes (task context not proof; verification hints are
hints; do-not-touch is guidance; WorkOrder/VerificationPlan authoritative; source-change
posture in the source/verification layer; actor contracts role/return guidance; operator-only
Circe commands must not be run as worker verification).

## AGENT HANDOFF READING ORDER

`agent/handoff.md` "## Reading order" points at `agent/context.json`,
`context/task-context.agent.json` (if present), `agent/source-refs.json`,
`agent/verification.json`, and Circe handoff + actor contracts (if Circe-targeted), and states
gates remain authoritative.

## AGENT CONTEXT METADATA

Implemented (not deferred). `agent/context.json.handoffReadingOrder` = `{ agent: [...ordered
reads...], authority: { taskContext: "context-only", workOrder: "authoritative-work",
verificationPlan: "authoritative-verification", sourceChangePosture:
"handoff-evidence-not-approval", actorContracts: "role-return-guidance-not-execution" } }`.
Additive top-level key; existing fields preserved; no test asserts exact keys.

## SOURCE-CHANGE POSTURE

The reading order places phase source-change posture in the source / verification authority
layer and classifies it `handoff-evidence-not-approval` in the agent metadata. The
`e91dc087` posture (`agent/verification.json.phases[].sourceChange`, rekon-proof phase gates)
is unchanged; the reading order references it, it does not modify it. TaskContextReport
sidecars must not override sourceChange posture.

## ACTOR CONTRACT BOUNDARY

The reading order classifies actor contracts as role/return guidance (not execution) and
reiterates the Operator Command Boundary (operator-only inspection, not worker verification).
`circe/actor-contracts/*` contents and `circe/handoff.json` are unchanged.

## WITH-CONTEXT RESULT

With task context, the bundle renders all four reading-order surfaces plus the slice-185/188
task-context sections and the `taskContext` metadata; the contract test confirms the
reading-order content, the `handoffReadingOrder` metadata, present phase source-change
posture, unchanged gates/Circe, and unchanged source/plan.

## WITHOUT-CONTEXT RESULT

Without task context, the reading order still renders (phrased "if present"), no `context/`
sidecars are created, `agent/context.json` has no `taskContext` key, and the bundle validates
clean.

## BOUNDARY MODEL

Guidance only — no proof, no approval, no command execution, no source writes, no Circe
execution, no intent:go. WorkOrder / VerificationPlan + phase gates + agent verification +
source refs authoritative; source-change posture is evidence not approval; actor contracts
role/return guidance; operator Circe commands operator-only.

## TESTS / VERIFICATION

- `tests/contract/intent-bundle-handoff-reading-order.test.mjs` (35 assertions).
- `tests/docs/intent-bundle-handoff-reading-order.test.mjs` (22 assertions).
- Existing `intent-plan-bundle`, `task-context-bundle-handoff-dogfood`,
  `task-context-bundle-handoff-guidance`, bundle-context tests remain green.
- Full keyless gate: typecheck, `npm test`, build, `git diff --check`, export/license audits,
  publish dry-run, both install smokes.
- CLI smoke: compact with-context / without-context bundle render.

## INTENTIONALLY UNTOUCHED

Circe handoff schema, actor-contract contents, source-change classification, WorkOrder /
VerificationPlan / phase-gate generation, proof / approval semantics, the bundle sidecar
format, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: additive presentation guidance, covered by contract + docs tests. Residual risk is
wording drift, covered by the docs test. Follow-up is the reading-order safety review.

## NEXT STEP

Recommend **Intent Bundle Handoff Reading Order Safety Review** as the next slice.

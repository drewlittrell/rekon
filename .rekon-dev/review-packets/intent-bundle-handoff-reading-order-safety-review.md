# Review Packet — Intent Bundle Handoff Reading Order Safety Review (slice 194, base a227f2d)

Reviews: [Intent Bundle Handoff Reading Order Implementation](../../docs/strategy/intent-bundle-handoff-reading-order-implementation.md) (slice 193, `a227f2d`).
Memo: [intent-bundle-handoff-reading-order-safety-review.md](../../docs/strategy/intent-bundle-handoff-reading-order-safety-review.md)

## CHANGES MADE

- New safety-review memo `docs/strategy/intent-bundle-handoff-reading-order-safety-review.md`
  (14 headings, 21 required statements, 4 tables, 26 answered review questions).
- New docs test `tests/docs/intent-bundle-handoff-reading-order-safety-review.test.mjs` (29
  assertions).
- This review packet; README banner + CHANGELOG entry; guarded cross-refs across the
  TaskContextReport family docs + roadmaps.
- No source, no runtime, no test-harness, no Circe, no gate change.

## PUBLIC API CHANGES

None. Docs + docs-test only. No type, CLI flag, artifact, schema, renderer, or gate changed.

## PURPOSE PRESERVATION CHECK

Slice 193 promoted a reading order so humans and agents know what to inspect first. This review
confirms the reading order improves usability without creating automation, proof, approval,
execution, or source-write authority. Reading order is guidance only; humans and agents are
guided toward authoritative surfaces; TaskContextReport stays optional context; WorkOrder /
VerificationPlan stay authoritative; phase source-change posture informs source-edit
expectations but does not approve work; actor contracts stay role/return-shape guidance;
operator-only Circe commands stay operator-only. The guarantee holds.

## CODEBASE-INTEL ALIGNMENT

Rekon is a read-only codebase-intelligence substrate that produces auditable artifacts and never
acts on the target repo. The reading order is consistent with that posture: it orders *reads* of
already-emitted bundle surfaces and classifies their authority, but it issues no writes, runs no
commands, and runs no Circe. The authority map encodes the substrate's existing boundary
(context-only vs authoritative-work/verification vs handoff-evidence vs role-return-guidance), so
the guidance reinforces — rather than redraws — the intelligence/execution boundary.

## IMPLEMENTATION REVIEWED

Grounded the four always-rendered renderer additions in `intent-plan-bundle.ts` at `a227f2d`:
README `## Handoff reading order` (human list + agent list + 5 boundary bullets), agent
`## Reading order` in `agent/instructions.md` (7 ordered reads + 7 boundary bullets) and
`agent/handoff.md` (5 pointers + gates-authoritative), and the additive
`agent/context.json.handoffReadingOrder` (ordered `agent` array + `authority` map) placed after
`artifactRefs` and before the optional `taskContext` block. Contract test (35) + existing bundle
tests green.

## README READING ORDER REVIEW

Human guidance only. Renders a human list and an agent list plus boundary bullets ("Task context
is optional context, not proof.", "WorkOrder / VerificationPlan remain authoritative.", "Phase
source-change posture is handoff evidence, not approval.", "Actor contracts are role/return-shape
guidance, not executed workers.", "Operator Circe commands are operator-only inspection, not
worker verification."). Task-context entry phrased "if present".

## AGENT INSTRUCTIONS REVIEW

Agent guidance only. `## Reading order` ("Read these before acting:") with the ordered reads and
the boundary bullets (task context not proof; verification hints are hints; do-not-touch is
guidance; WorkOrder/VerificationPlan authoritative; source-change posture in the
source/verification layer; actor contracts role/return guidance; operator-only Circe commands
must not be run as worker verification).

## AGENT HANDOFF REVIEW

Points agents at `agent/context.json`, `context/task-context.agent.json` (if present),
`agent/source-refs.json`, `agent/verification.json`, and Circe handoff + actor contracts (if
Circe-targeted); states WorkOrder / VerificationPlan / phase gates remain authoritative.

## AGENT CONTEXT METADATA REVIEW

Additive `handoffReadingOrder` = `{ agent: [...8 ordered reads...], authority: { taskContext:
context-only, workOrder: authoritative-work, verificationPlan: authoritative-verification,
sourceChangePosture: handoff-evidence-not-approval, actorContracts:
role-return-guidance-not-execution } }`. Every existing field preserved; key emitted for every
bundle (with or without task context); the optional `taskContext` block remains separate and
present only when a report is attached.

## AUTHORITY LAYER REVIEW

The reading order distinguishes context from authority and moves no authority. WorkOrder /
VerificationPlan remain the authoritative work/verification gates; `agent/verification.json`
remains authoritative for verification posture; `agent/source-refs.json` remains authoritative
for source refs; phase source-change posture remains handoff evidence, not approval, on the
authoritative source/verification layer; rekon-proof gates remain the proof/boundary state.

## CIRCE AND ACTOR CONTRACT REVIEW

`circe/handoff.json` / `circe/phase-plan.json` / `circe/rekon-proof.json` /
`circe/actor-contracts/*` are byte-unchanged. Circe handoff JSON remains the machine handoff
contract; actor contracts remain role/return-shape guidance, not executed workers; the Operator
Command Boundary remains operator-only inspection guidance. Rekon does not run Circe.

## BOUNDARY MODEL

Guidance only — no automation, no proof, no approval, no command execution, no source writes, no
VerificationRun/VerificationResult, no Circe execution, no intent:go. Without-context bundle stays
safe ("if present" wording, no sidecars, no `taskContext`, `handoffReadingOrder` still present).

## RECOMMENDATION

Declare Intent Bundle Handoff Reading Order safe/stable. Recommend **Intent Bundle Handoff
Reading Order Dogfood** next.

## TESTS / VERIFICATION

- `tests/docs/intent-bundle-handoff-reading-order-safety-review.test.mjs` (29 assertions).
- Full keyless gate: typecheck, `npm test`, build, `git diff --check`, export/license audits,
  publish dry-run, both install smokes. No CLI smoke (strategy/safety-review batch).

## INTENTIONALLY UNTOUCHED

Reading-order implementation, bundle renderer, Circe handoff schema, actor-contract contents,
source-change posture implementation, WorkOrder / VerificationPlan / phase-gate generation, proof
/ approval semantics, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: review-only, no behavior change. Residual risk is wording drift, covered by the docs
test. Follow-up is the reading-order dogfood.

## NEXT STEP

Recommend **Intent Bundle Handoff Reading Order Dogfood** as the next slice (alternative: UX Fix,
only if a concrete wording/discoverability issue surfaces).

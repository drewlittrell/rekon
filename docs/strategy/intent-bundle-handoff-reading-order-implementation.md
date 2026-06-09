# Intent Bundle Handoff Reading Order Implementation

This memo records the implementation of the reading-order policy selected by the
[TaskContextReport Bundle Handoff Broader Workflow
Decision](task-context-report-bundle-handoff-broader-workflow-decision.md) (slice 192,
Option B). The intent plan bundle now promotes the recommended human and agent reading
order directly inside its surfaces. The change is presentation-only and grants no
authority: it changes no Circe handoff schema, no actor-contract contents, no
source-change classification, and no gate.

## What Shipped

Four additive, always-rendered renderer changes in
`packages/capability-docs/src/intent-plan-bundle.ts`:

- `README.md` gains a "## Handoff reading order" section with a human reading order and an
  agent reading order, plus the boundary notes.
- `agent/instructions.md` gains a "## Reading order" section ("Read these before acting:")
  with the ordered agent reads and the boundary notes.
- `agent/handoff.md` gains a "## Reading order" section pointing at the structured-handoff
  and authority surfaces, stating that gates remain authoritative.
- `agent/context.json` gains an additive `handoffReadingOrder` metadata block — an ordered
  `agent` array plus an `authority` map classifying each surface (`taskContext:
  context-only`, `workOrder: authoritative-work`, `verificationPlan:
  authoritative-verification`, `sourceChangePosture: handoff-evidence-not-approval`,
  `actorContracts: role-return-guidance-not-execution`).

All four are rendered for every bundle (with or without task context). Task-context entries
are phrased "if present" / "when present" so a without-context bundle's reading order never
claims task context is available; the without-context bundle creates no `context/` sidecars
and carries no `taskContext` metadata key.

## Reading Order

Humans should inspect README.md first, then context/task-context.md when present.
Agents should inspect agent/instructions.md first, then agent/handoff.md, then
agent/context.json, and then context/task-context.agent.json when present. The handoff has
four layers: operator orientation; agent structured handoff; source / verification
authority (WorkOrder, VerificationPlan, phase source-change posture, agent/source-refs.json,
agent/verification.json); and the Circe contract layer.

## Boundary Model

The reading order grants no new authority. Every boundary holds:

- TaskContextReport sidecars are optional context, not proof.
- WorkOrder and VerificationPlan remain the authoritative work and verification gates.
- agent/verification.json remains authoritative for verification posture.
- agent/source-refs.json remains authoritative for source refs.
- Phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer.
- Source-change posture is handoff evidence, not approval.
- TaskContextReport sidecars must not override sourceChange posture.
- Circe handoff JSON remains the machine handoff contract.
- Actor contracts are role/return-shape guidance, not executed workers.
- The Operator Command Boundary is operator-only inspection guidance, not worker execution guidance.
- Worker requests to run operator-only Circe commands are plan-quality concerns.
- TaskContextReport sidecars must not approve plans.
- TaskContextReport sidecars must not execute commands.
- TaskContextReport sidecars must not write source files.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- intent:go remains deferred.

## Verification

- `tests/contract/intent-bundle-handoff-reading-order.test.mjs` (35 assertions) drives the
  full operator path keyless and asserts the README / agent-instructions / agent-handoff
  reading-order sections, the `agent/context.json.handoffReadingOrder` metadata, the
  unchanged Circe handoff / actor contracts / gate booleans, the present phase source-change
  posture, and the clean without-context bundle (no sidecars, no `taskContext`, reading
  order phrased "if present").
- `tests/docs/intent-bundle-handoff-reading-order.test.mjs` (22 assertions) locks this memo's
  reading-order and boundary language.
- The existing `intent-plan-bundle`, `task-context-bundle-handoff-dogfood`,
  `task-context-bundle-handoff-guidance`, and bundle-context tests remain green (the
  reading-order additions are additive).
- CLI smoke: a compact with-context / without-context bundle render confirms the sections
  and metadata appear, the without-context bundle stays valid with no sidecars, the Circe
  files are unchanged, and source + plan are unchanged.

## What This Does Not Do

This implementation changes no Circe handoff schema, no actor-contract contents, no
source-change classification, no WorkOrder / VerificationPlan gate, and no phase gate. It
executes no commands, writes no source, creates no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult, and runs no Circe. It does not make TaskContextReport
required or proof, treat source-change posture as approval, treat actor contracts as
executable workers, or let actors execute operator-only Circe commands. intent:go remains
deferred.

## Next Step

The recommended follow-up is an **Intent Bundle Handoff Reading Order Safety Review** —
review the implemented reading-order guidance before broader handoff workflow use.
Alternative: an **Intent Bundle Handoff Reading Order Dogfood** if implementation reveals a
usability concern needing a dogfood pass first.

> Update (slice 194 · Intent Bundle Handoff Reading Order Safety Review): the slice-193 bundle handoff reading order was reviewed end-to-end and declared safe/stable — guidance, not automation. The README / agent-instructions / agent-handoff reading-order sections and the additive `agent/context.json.handoffReadingOrder` metadata (which preserves every existing field) guide humans and agents toward authoritative surfaces while every boundary holds: TaskContextReport sidecars stay optional context (not proof); WorkOrder / VerificationPlan stay authoritative; phase source-change posture stays handoff evidence, not approval; actor contracts stay role/return-shape guidance; the Operator Command Boundary stays operator-only; `circe/*` is byte-unchanged; intent:go deferred. See [`intent-bundle-handoff-reading-order-safety-review`](intent-bundle-handoff-reading-order-safety-review.md).

> Update (slice 195 · Intent Bundle Handoff Reading Order Dogfood): the shipped reading order was dogfooded end-to-end from four perspectives (human operator, general agent, task-context-aware agent, Circe-targeted actor) via the full operator path + a without-context comparison. The reading order is practically useful and every boundary held — README / agent-instructions / agent-handoff reading orders and `agent/context.json.handoffReadingOrder` (preserving every existing field) guide humans and agents toward the authoritative surfaces; TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; source-change posture stays handoff evidence, not approval; actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; the without-context bundle stays clean; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go deferred. See [`intent-bundle-handoff-reading-order-dogfood`](intent-bundle-handoff-reading-order-dogfood.md).

> Update (slice 196 · Intent Bundle Handoff Reading Order Dogfood Safety Review): the slice-195 dogfood result was reviewed end-to-end and declared safe/stable — rebased onto `d975d3e` ("keep Circe verification commands executable") so the verification-posture / Circe-projection claims re-ground against the current producer; the 41-assertion dogfood contract test re-ran green. Intent bundle handoff reading order is guidance, not automation. The new `isSafeExecutableVerificationCommand` projection preserves only a bounded safe subset and rejects shell-metacharacter command strings — safe executable verification-command projection is handoff data, not execution: `circe/phase-plan.json` may describe verification commands but Rekon does not execute them, and `circe/rekon-proof.json` keeps commandsExecuted:false. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; source-change posture stays handoff evidence, not approval; actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; the without-context bundle stays clean; intent:go deferred. See [`intent-bundle-handoff-reading-order-dogfood-safety-review`](intent-bundle-handoff-reading-order-dogfood-safety-review.md).

> Update (slice 197 · Intent Bundle Handoff Reading Order Broader Workflow Decision): decided how broader operator/agent workflow docs should treat the final reading order — Option B, a recommended (not required) broader handoff reading-order policy. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. First implementation: Intent Bundle Handoff Workflow Guide. See [`intent-bundle-handoff-reading-order-broader-workflow-decision`](intent-bundle-handoff-reading-order-broader-workflow-decision.md).

> Update (slice 198 · Intent Bundle Handoff Workflow Guide): shipped the slice-197 Option-B product-docs step — two reader guides ([`intent-bundle-handoff-workflow`](../guides/intent-bundle-handoff-workflow.md) and the agent reading-order companion) plus an implementation note that teach humans and agents how to consume an intent plan bundle using its handoff reading order. Documentation only. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. Next: Intent Bundle Handoff Workflow Guide Safety Review. See [`intent-bundle-handoff-workflow-guide`](intent-bundle-handoff-workflow-guide.md).

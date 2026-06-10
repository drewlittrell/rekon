# Intent Bundle Handoff Workflow Guide Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

This memo reviews the shipped [Intent Bundle Handoff Workflow
Guide](intent-bundle-handoff-workflow-guide.md) (slice 198) end-to-end and declares it safe and
stable before recommending it as the default broader operator / agent handoff practice. It is a
review only: it changes no runtime behavior, no bundle generation, no reading-order
implementation, no safe executable verification-command projection, no Circe handoff schema, no
actor contracts, no source-change posture implementation, and no gate.

## Decision Summary

Intent Bundle Handoff Workflow Guide is safe/stable. Intent bundle handoff reading order is
guidance, not automation. The two reader guides ([Intent Bundle Handoff
Workflow](../guides/intent-bundle-handoff-workflow.md), [Intent Bundle Agent Reading
Order](../guides/intent-bundle-agent-reading-order.md)) and the implementation note teach humans
and agents how to consume a generated bundle in a safe order while every boundary holds. The
workflow guide introduces no runtime behavior changes. Humans should inspect README.md first, then
context/task-context.md when present. Agents should inspect agent/instructions.md first, then
agent/handoff.md, then agent/context.json, and then context/task-context.agent.json when present.

## Why This Review Exists

Slice 197 decided (Option B) that broader workflows should recommend the handoff reading order,
and slice 198 shipped the reader-facing guides that teach it. Because workflow guidance sits close
to where humans and agents act on a bundle, this review confirms the guides teach correct *use* —
recommended reading order, classified authority, preserved boundaries — without turning the
reading order into proof, approval, automation, command execution, source writes, or intent:go,
before the guide is dogfooded and recommended as the default handoff practice.

## Documentation Reviewed

Reviewed the three shipped docs (`docs/guides/intent-bundle-handoff-workflow.md`,
`docs/guides/intent-bundle-agent-reading-order.md`,
`docs/strategy/intent-bundle-handoff-workflow-guide.md`) plus the review packet and the
30-assertion docs test, grounded against the producer surfaces at `8bd0144`. A light source review
confirmed the referenced surfaces still exist and are unchanged: the README `## Handoff reading
order`, the agent `## Reading order` sections, `agent/context.json.handoffReadingOrder`, the
`isSafeExecutableVerificationCommand` projection in `intent-plan-bundle.ts`, and the
`circe/rekon-proof.json` gate booleans. The guides are reader-facing documentation; they add no
type, CLI flag, help text, artifact, schema, renderer, projection, or gate.

| Surface | Status | Safety Finding |
| --- | --- | --- |
| intent-bundle-handoff-workflow.md | shipped | human/agent workflow guidance |
| intent-bundle-agent-reading-order.md | shipped | agent-specific guidance |
| implementation note | shipped | no runtime behavior |
| README pointer | shipped | broader workflow visible |
| reading order policy | shipped | recommended, not required |

## Human Workflow Review

The human workflow guidance is safe: it instructs the operator to open `README.md`, follow the
Handoff reading order, read `context/task-context.md` when present, read `verification-plan.md`,
and inspect WorkOrder / source refs / proof surfaces for authority, consulting actor contracts only
for Circe-facing handoff preparation. It frames `context/task-context.md` as "guidance, not proof"
and the verification-plan as scope, not executed results. It never tells a human to execute a
command or write source from the guide. TaskContextReport sidecars are optional context, not proof.

## Agent Workflow Review

The agent workflow guidance is safe: it instructs the agent to read `agent/instructions.md`, then
`agent/handoff.md`, then `agent/context.json` (with `handoffReadingOrder` as the structured map),
then `context/task-context.agent.json` when present, then `agent/source-refs.json`,
`agent/verification.json`, WorkOrder / VerificationPlan / phase source-change posture, and the
Circe layer only when Circe-targeted. The agent guide's "What Agents Must Not Do" section is
explicit: do not treat the reading order as proof/approval/gate; do not approve plans from
TaskContextReport sidecars; do not execute verification hints or projected verification commands;
do not run operator-only Circe commands; do not write source by implication; do not invoke
intent:go.

## Authority Model Review

The guides classify authority and move none. WorkOrder and VerificationPlan remain the
authoritative work and verification gates. agent/verification.json remains authoritative for
verification posture. agent/source-refs.json remains authoritative for source refs. Phase
source-change posture belongs to the authoritative source / verification layer, not the
task-context layer. Source-change posture is handoff evidence, not approval.

| Surface | Review Finding |
| --- | --- |
| TaskContextReport sidecars | optional context |
| WorkOrder | authoritative work scope |
| VerificationPlan | authoritative verification scope |
| agent/verification.json | authoritative verification posture |
| agent/source-refs.json | authoritative source refs |
| phase source-change posture | handoff evidence, not approval |
| safe executable verification-command projection | handoff data, not execution |
| actor contracts | role/return guidance |

## Safe Verification Command Projection Review

The guides describe the projection correctly. Safe executable verification-command projection is
handoff data, not execution. circe/phase-plan.json may describe verification commands, but Rekon
does not execute them. circe/rekon-proof.json keeps commandsExecuted:false. The guides instruct
agents and operators to treat projected commands as candidate verification instructions, not
evidence that commands ran — matching the `isSafeExecutableVerificationCommand` bounded safe-subset
projection in the producer.

## Actor Contract And Operator Command Boundary Review

The guides keep the Circe layer as guidance. Actor contracts are role/return-shape guidance, not
executed workers. The Operator Command Boundary is operator-only inspection guidance, not worker
execution guidance. Worker requests to run operator-only Circe commands are plan-quality concerns.
Circe handoff JSON remains the machine handoff contract; Rekon does not run Circe.

## Boundary Review

Every boundary holds. The workflow guide introduces no runtime behavior changes — it adds
reader-facing documentation only. The required boundary statements, verbatim:

- Intent bundle handoff reading order is guidance, not automation.
- Broader workflows should recommend the handoff reading order, not require it as proof.
- Humans should inspect README.md first, then context/task-context.md when present.
- Agents should inspect agent/instructions.md first, then agent/handoff.md, then agent/context.json, and then context/task-context.agent.json when present.
- TaskContextReport sidecars are optional context, not proof.
- WorkOrder and VerificationPlan remain the authoritative work and verification gates.
- agent/verification.json remains authoritative for verification posture.
- agent/source-refs.json remains authoritative for source refs.
- Phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer.
- Source-change posture is handoff evidence, not approval.
- Safe executable verification-command projection is handoff data, not execution.
- circe/phase-plan.json may describe verification commands, but Rekon does not execute them.
- circe/rekon-proof.json keeps commandsExecuted:false.
- Actor contracts are role/return-shape guidance, not executed workers.
- The Operator Command Boundary is operator-only inspection guidance, not worker execution guidance.
- Worker requests to run operator-only Circe commands are plan-quality concerns.
- TaskContextReport sidecars must not approve plans.
- TaskContextReport sidecars must not execute commands.
- TaskContextReport sidecars must not write source files.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- The workflow guide introduces no runtime behavior changes.
- intent:go remains deferred.

| Boundary | Decision |
| --- | --- |
| guide vs automation | guidance only |
| task context vs proof | optional context |
| source-change posture vs approval | evidence, not approval |
| verification-command projection vs execution | handoff data only |
| actor contracts vs execution | role/return guidance |
| operator Circe commands | operator-only |
| command execution | none |
| source writes | none |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare guide safe/stable | selected | guidance boundary holds |
| dogfood next | selected | practical usability needs review |
| quality fix next | deferred | only if issue found |
| automate handoff next | rejected/deferred | needs separate policy |
| make guide authoritative | rejected | guide is documentation |

## Recommendation

Intent Bundle Handoff Workflow Guide is safe/stable. Recommended next slice: **Intent Bundle
Handoff Workflow Guide Dogfood** — dogfood the broader guide from the perspective of a human
operator and an agent using the docs to consume a generated bundle, evaluating whether the guide
is useful enough to become the default handoff practice. Alternative: **Intent Bundle Handoff
Workflow Guide Quality Fix**, only if a concrete clarity / wording issue surfaces (none was found).

## What This Does Not Do

This review changes no runtime behavior, no guide content (except additive safety-review
pointers), no bundle generation, no reading-order implementation, no safe executable
verification-command projection, no Circe handoff schema, no actor contracts, no source-change
posture implementation, and no gate. It executes no commands, writes no source, creates no
WorkOrder / VerificationPlan / VerificationRun / VerificationResult, and runs no Circe. intent:go
remains deferred.

## Follow-Up Work

The recommended follow-up is **Intent Bundle Handoff Workflow Guide Dogfood**. Alternative:
**Intent Bundle Handoff Workflow Guide Quality Fix**, only if this review (or later use) finds
concrete clarity / wording issues — none were found.

# Intent Bundle Handoff Workflow Guide

This note records the implementation of the workflow guidance selected by the [Intent Bundle
Handoff Reading Order Broader Workflow
Decision](intent-bundle-handoff-reading-order-broader-workflow-decision.md) (Option B). It ships
two reader-facing guides — the [Intent Bundle Handoff
Workflow](../guides/intent-bundle-handoff-workflow.md) and the [Intent Bundle Agent Reading
Order](../guides/intent-bundle-agent-reading-order.md) — that teach operators and agents how to
consume an intent plan bundle using its handoff reading order. It is documentation only: it
changes no runtime behavior, no bundle generation, no reading-order implementation, and no gate.

## Summary

The handoff reading order is implemented, safety-reviewed, dogfooded, dogfood-safety-reviewed, and
selected as the recommended broader workflow policy. This slice teaches humans and agents how to
use it. Intent bundle handoff reading order is guidance, not automation. Broader workflows should
recommend the handoff reading order, not require it as proof.

## Source Review

Grounded the documented surfaces at `7cbeb5c`: the README `## Handoff reading order`, the agent
`## Reading order` sections, the additive `agent/context.json.handoffReadingOrder` metadata, the
`isSafeExecutableVerificationCommand` projection in `intent-plan-bundle.ts`, and the
`circe/rekon-proof.json` gate booleans (`sourceWriteAllowed`/`commandsExecuted`/`runsCirce`/
`intentGoDeferred`). All unchanged; this slice adds reader-facing docs only.

## What Shipped

- `docs/guides/intent-bundle-handoff-workflow.md` — the human + agent workflow guide (what to read
  first, authority surfaces, task-context sidecars, source-change posture, verification-command
  projection, Circe actor contracts, boundaries), with the workflow / authority / boundary tables.
- `docs/guides/intent-bundle-agent-reading-order.md` — the agent-focused reading-order companion.
- This implementation note + a review packet + a docs test.

## Human Workflow

Humans should inspect README.md first, then context/task-context.md when present, then
`verification-plan.md`, then WorkOrder / source refs / proof surfaces for authority, and Circe
actor contracts only for Circe-facing handoff preparation.

## Agent Workflow

Agents should inspect agent/instructions.md first, then agent/handoff.md, then agent/context.json,
and then context/task-context.agent.json when present, then `agent/source-refs.json`,
`agent/verification.json`, WorkOrder / VerificationPlan / phase source-change posture, and the
Circe layer when Circe-targeted, using `handoffReadingOrder` as the structured map.

## Authority Model

TaskContextReport sidecars are optional context; WorkOrder is authoritative work scope;
VerificationPlan is authoritative verification scope; agent/verification.json is authoritative
verification posture; agent/source-refs.json is authoritative source references; phase
source-change posture is handoff evidence, not approval; safe executable verification-command
projection is handoff data, not execution; circe/rekon-proof.json is proof/boundary state; actor
contracts are role/return guidance.

## Safe Verification Command Projection

Safe executable verification-command projection is handoff data, not execution. circe/phase-plan.json
may describe verification commands, but Rekon does not execute them. circe/rekon-proof.json keeps
commandsExecuted:false. Projected commands are candidate verification instructions, not evidence
that commands ran.

## Actor Contract And Operator Command Boundary

Actor contracts are role/return-shape guidance, not executed workers. The Operator Command
Boundary is operator-only inspection guidance, not worker execution guidance. Worker requests to
run operator-only Circe commands are plan-quality concerns. Circe handoff JSON remains the machine
handoff contract.

## Boundary Model

The guide adds documentation guidance only; every boundary holds:

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
- intent:go remains deferred.

## What This Does Not Do

This slice adds no automation, changes no bundle generation, no reading-order implementation, no
TaskContextReport sidecars, no Circe handoff schema, no actor contracts, no source-change posture
implementation, no safe executable verification-command projection, no WorkOrder / VerificationPlan
gate, and no phase gate. It executes no commands, writes no source, creates no WorkOrder /
VerificationPlan / VerificationRun / VerificationResult, and runs no Circe. intent:go remains
deferred.

## Follow-Up Work

The recommended follow-up is **Intent Bundle Handoff Workflow Guide Safety Review** — review the
broader workflow guide before recommending it as the default handoff practice. Alternative:
**Intent Bundle Handoff Workflow Guide Quality Fix**, only if the guide exposes a clarity issue.

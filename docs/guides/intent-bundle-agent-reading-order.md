# Intent Bundle Agent Reading Order

This guide is the agent-focused companion to the [Intent Bundle Handoff
Workflow](intent-bundle-handoff-workflow.md). It tells an agent what to read, in what order, and
how to classify each surface when picking up an intent plan bundle.

## Purpose

Intent bundle handoff reading order is guidance, not automation. The reading order helps an agent
consume a bundle in a safe order — orientation, then structured handoff, then authority, then the
Circe contract layer — without confusing context for proof or projection for execution. Broader
workflows should recommend the handoff reading order, not require it as proof.

## Read First

Agents should inspect agent/instructions.md first, then agent/handoff.md, then agent/context.json,
and then context/task-context.agent.json when present. After that: `agent/source-refs.json`,
`agent/verification.json`, WorkOrder / VerificationPlan / phase source-change posture, and — only
when Circe-targeted — `circe/handoff.json` and `circe/actor-contracts/*`. The
`agent/context.json.handoffReadingOrder` block carries this ordered read list plus an `authority`
map.

## Task Context

`context/task-context.agent.json` (and the human `context/task-context.md`) are present only when a
TaskContextReport is attached. TaskContextReport sidecars are optional context, not proof.
TaskContextReport sidecars must not approve plans. TaskContextReport sidecars must not execute
commands. TaskContextReport sidecars must not write source files.

## Source References

`agent/source-refs.json` remains authoritative for source refs — it carries the canonical source
artifacts the bundle was derived from. agent/source-refs.json remains authoritative for source
refs.

## Verification Posture

`agent/verification.json` remains authoritative for verification posture — commands, success
criteria, per-phase posture, and `executesCommands: false`. agent/verification.json remains
authoritative for verification posture. WorkOrder and VerificationPlan remain the authoritative
work and verification gates. Verification hints remain hints, not executed commands.

## Source-Change Posture

Phase source-change posture belongs to the authoritative source / verification layer, not the
task-context layer. Source-change posture is handoff evidence, not approval: it tells the agent
whether a phase is expected to change source, not that the change is approved. Do-not-touch zones
remain guidance/context, not enforcement.

## Safe Verification Command Projection

Safe executable verification-command projection is handoff data, not execution. circe/phase-plan.json
may describe verification commands, but Rekon does not execute them. circe/rekon-proof.json keeps
commandsExecuted:false. An agent should treat projected commands as candidate verification
instructions, not evidence that commands ran.

## Circe Actor Contracts

Actor contracts are role/return-shape guidance, not executed workers. Each describes the fields the
corresponding Circe actor must *return*; Rekon emits them and runs no Circe. Circe handoff JSON
remains the machine handoff contract.

## Operator Command Boundary

The Operator Command Boundary is operator-only inspection guidance, not worker execution guidance.
Worker requests to run operator-only Circe commands are plan-quality concerns — an agent acting as
a worker should report such a request rather than run the command.

## Boundaries

The reading order grants no new authority. TaskContextReport sidecars are optional context, not
proof. WorkOrder and VerificationPlan remain authoritative. Source-change posture is handoff
evidence, not approval. Safe executable verification-command projection is handoff data, not
execution. Actor contracts are role/return-shape guidance, not executed workers. intent:go remains
deferred.

## What Agents Must Not Do

An agent must not treat the reading order as proof, approval, or a gate; must not approve plans
from TaskContextReport sidecars; must not execute verification hints or projected verification
commands; must not run operator-only Circe commands as worker verification; must not write source
outside the scoped paths by implication of any bundle surface; and must not invoke intent:go.

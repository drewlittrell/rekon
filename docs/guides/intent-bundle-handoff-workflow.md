# Intent Bundle Handoff Workflow

This guide teaches operators and agents how to consume an intent plan bundle using the bundle's
handoff reading order. It implements the [Intent Bundle Handoff Reading Order Broader Workflow
Decision](../strategy/intent-bundle-handoff-reading-order-broader-workflow-decision.md) (Option B):
the reading order is the **recommended** way to consume a bundle — recommended, not required, and
guidance, not automation.

## What This Is

The intent plan bundle is a projection of an approved intent into reviewable files. It now
promotes a handoff reading order directly inside its surfaces: a `## Handoff reading order`
section in `README.md`, a `## Reading order` section in `agent/instructions.md` and
`agent/handoff.md`, and an additive `agent/context.json.handoffReadingOrder` metadata block (an
ordered `agent` read list plus an `authority` map). The reading order exists so humans and agents
do not confuse context, authority, proof, and execution. Intent bundle handoff reading order is
guidance, not automation. Broader workflows should recommend the handoff reading order, not
require it as proof.

## Handoff Reading Order

The handoff has four layers: operator orientation (README, task-context brief, verification
plan); agent structured handoff (agent/instructions, agent/handoff, agent/context.json); source /
verification authority (WorkOrder, VerificationPlan, phase source-change posture,
agent/source-refs.json, agent/verification.json); and the Circe contract layer (circe/handoff.json
+ actor contracts). Humans should inspect README.md first, then context/task-context.md when
present. Agents should inspect agent/instructions.md first, then agent/handoff.md, then
agent/context.json, and then context/task-context.agent.json when present.

| Consumer | Recommended Reads |
| --- | --- |
| human operator | README.md, context/task-context.md, verification-plan.md |
| general agent | agent/instructions.md, agent/handoff.md, agent/context.json |
| task-context-aware agent | context/task-context.agent.json |
| verifier/planner | agent/verification.json, verification-plan.md, phase source-change posture |
| Circe-targeted actor | circe/handoff.json, circe/actor-contracts/* |

## Human Operator Workflow

1. Open `README.md`.
2. Follow the Handoff reading order.
3. Read `context/task-context.md` when present.
4. Read `verification-plan.md`.
5. Inspect WorkOrder / source refs / proof surfaces for authority.
6. Consult actor contracts only for Circe-facing handoff preparation.

The README task-context section, when present, is framed "guidance, not proof"; the
verification-plan carries the verification scope, not executed results.

## Agent Workflow

1. Read `agent/instructions.md`.
2. Read `agent/handoff.md`.
3. Read `agent/context.json`.
4. Read `context/task-context.agent.json` when present.
5. Read `agent/source-refs.json`.
6. Read `agent/verification.json`.
7. Read WorkOrder / VerificationPlan / phase source-change posture.
8. Read `circe/handoff.json` and actor contracts only when Circe-targeted.

`agent/context.json.handoffReadingOrder` is the structured map of this same order, with an
`authority` map classifying each surface.

## Authority Surfaces

The reading order classifies authority; it moves none. WorkOrder and VerificationPlan remain the
authoritative work and verification gates. agent/verification.json remains authoritative for
verification posture. agent/source-refs.json remains authoritative for source refs.

| Surface | Authority |
| --- | --- |
| TaskContextReport sidecars | optional context |
| WorkOrder | authoritative work scope |
| VerificationPlan | authoritative verification scope |
| agent/verification.json | authoritative verification posture |
| agent/source-refs.json | authoritative source refs |
| phase source-change posture | handoff evidence, not approval |
| safe executable verification-command projection | handoff data, not execution |
| circe/rekon-proof.json | proof/boundary state |
| actor contracts | role/return guidance |

## Task Context Sidecars

TaskContextReport sidecars are optional context, not proof. `context/task-context.md` (human
brief), `context/task-context.agent.json` (agent JSON), and `context/task-context.refs.json`
(refs) are present only when a TaskContextReport is attached; the reading order references them
"if present". TaskContextReport sidecars must not approve plans. TaskContextReport sidecars must
not execute commands. TaskContextReport sidecars must not write source files.

## Source-Change Posture

Phase source-change posture belongs to the authoritative source / verification layer, not the
task-context layer. It is carried per phase in `agent/verification.json.phases[].sourceChange` and
in the Circe phase gates. Source-change posture is handoff evidence, not approval — it tells a
worker whether a phase is expected to change source, but it does not approve the work.

## Verification Command Projection

Safe executable verification-command projection is handoff data, not execution. The Circe
projection copies only a bounded safe subset of command strings into each phase's executable
VerificationPlan. circe/phase-plan.json may describe verification commands, but Rekon does not
execute them. circe/rekon-proof.json keeps commandsExecuted:false. Agents and operators should
treat projected commands as candidate verification instructions, not evidence that commands ran.

## Circe Actor Contracts

Actor contracts are role/return-shape guidance, not executed workers — each describes the fields a
Circe actor must *return*. Circe handoff JSON remains the machine handoff contract. The Operator
Command Boundary is operator-only inspection guidance, not worker execution guidance: worker
requests to run operator-only Circe commands are plan-quality concerns. Rekon does not run Circe.

## Boundaries

| Boundary | Decision |
| --- | --- |
| reading order vs automation | guidance only |
| task context vs proof | optional context |
| source-change posture vs approval | evidence, not approval |
| verification-command projection vs execution | handoff data only |
| actor contracts vs execution | role/return guidance |
| operator Circe commands | operator-only |
| command execution | none |
| source writes | none |
| intent:go | deferred |

Verification hints remain hints, not executed commands. Do-not-touch zones remain
guidance/context, not enforcement. intent:go remains deferred.

## What This Does Not Do

This guide adds no automation, changes no bundle generation, no reading-order implementation, no
TaskContextReport sidecars, no Circe handoff schema, no actor contracts, no source-change posture
implementation, no safe executable verification-command projection, no WorkOrder /
VerificationPlan gate, and no phase gate. It executes no commands, writes no source, and runs no
Circe. It does not make the reading order required, make TaskContextReport required or proof, treat
source-change posture as approval, treat verification-command projection as execution, treat actor
contracts as executable workers, or let workers run operator-only Circe commands. intent:go remains
deferred.

> Update (slice 199 · Intent Bundle Handoff Workflow Guide Safety Review): reviewed the slice-198 workflow guide end-to-end and declared it safe/stable before recommending it as the default broader operator/agent handoff practice. The workflow guide introduces no runtime behavior changes. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. The human/agent workflow guidance, authority model, safe verification-command projection guidance, and actor-contract / Operator-Command-Boundary guidance all hold; the guides never tell a human or agent to execute commands or write source from the guide. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. Next: Intent Bundle Handoff Workflow Guide Dogfood. See [`intent-bundle-handoff-workflow-guide-safety-review`](../strategy/intent-bundle-handoff-workflow-guide-safety-review.md).

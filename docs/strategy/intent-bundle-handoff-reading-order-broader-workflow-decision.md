# Intent Bundle Handoff Reading Order Broader Workflow Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

This memo decides how broader operator / agent workflow docs and handoff policy should treat the
final intent bundle handoff reading order — now implemented (slice 193), safety-reviewed (slice
194), dogfooded (slice 195), and dogfood-safety-reviewed (slice 196, which also re-grounded the
new safe executable verification-command projection from `d975d3e`). It is decision-only: it
changes no runtime behavior, no bundle implementation, no reading-order implementation, no
verification-command projection, no Circe handoff schema, no actor contracts, no source-change
posture implementation, and no gate.

## Decision Summary

Select **Option B — a recommended broader handoff reading-order policy**. The reading order
becomes the recommended human/agent way to consume intent bundles; it is recommended, not
required. Intent bundle handoff reading order is guidance, not automation. Broader workflows
should recommend the handoff reading order, not require it as proof. Humans should inspect
README.md first, then context/task-context.md when present. Agents should inspect
agent/instructions.md first, then agent/handoff.md, then agent/context.json, and then
context/task-context.agent.json when present. The decision recommends an implementation:
**Intent Bundle Handoff Workflow Guide**, which teaches the reading order in workflow docs
without changing runtime behavior.

## Why This Decision Exists

The bundle output already contains a tested reading order; the dogfood and dogfood safety review
proved it is practically useful and boundary-safe across humans, general agents,
task-context-aware agents, and Circe-targeted actors — including under the new safe executable
verification-command projection. The remaining question is product policy: when and how should
broader operator / agent workflow docs, handoff guidance, and future workflow surfaces treat
this reading order, without turning it into proof, approval, execution, or source-write
authority? This memo answers that.

## Current Handoff Surface

The intent plan bundle promotes the reading order in four always-rendered surfaces (grounded at
`6983e15`): the README `## Handoff reading order` section, the `## Reading order` sections in
`agent/instructions.md` and `agent/handoff.md`, and the additive
`agent/context.json.handoffReadingOrder` metadata (an ordered `agent` read list + an `authority`
map). The `d975d3e` producer also adds `isSafeExecutableVerificationCommand`, which bounds the
Circe per-phase VerificationPlan executable command list to a safe subset. All gate booleans —
`sourceWriteAllowed: false`, `commandsExecuted: false`, `runsCirce: false`, `intentGoDeferred:
true` — are unchanged.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| keep reading order bundle-only | rejected/deferred | users need to learn the workflow |
| recommend reading order broadly | selected | improves handoff reliability without automation |
| require reading order as proof/gate | rejected | reading order is guidance |
| automate handoff consumption | rejected/deferred | separate workflow policy needed |
| require TaskContextReport sidecars | rejected | context remains optional |

- **Option A (keep bundle-only)** — rejected/deferred: the dogfood proved the reading order is
  useful, so users should be taught it.
- **Option B (recommend broadly)** — selected: improves workflow reliability without automation.
- **Option C (require as a gate)** — rejected: reading order is guidance, not proof or gate
  authority.
- **Option D (automate consumption)** — rejected/deferred: needs separate workflow/agent policy
  and must not execute commands or write source by implication.
- **Option E (require TaskContextReport)** — rejected: TaskContextReport sidecars are optional
  context, not proof.

## Recommendation

Adopt Option B. Broader workflow docs should recommend (not require) the reading order, teaching
humans to begin with README.md and agents to begin with agent/instructions.md, with
`agent/context.json.handoffReadingOrder` as the structured map. No bundle surface executes
anything by itself. The recommended first implementation is the **Intent Bundle Handoff Workflow
Guide**.

## Broader Workflow Model

For humans:

1. Open bundle README.md.
2. Follow the Handoff reading order.
3. Read context/task-context.md if present.
4. Read verification-plan.md.
5. Use WorkOrder / source refs / proof surfaces for authority.
6. Use Circe actor contracts only for Circe-facing handoff preparation.

For agents:

1. Read agent/instructions.md.
2. Read agent/handoff.md.
3. Read agent/context.json and handoffReadingOrder.
4. Read context/task-context.agent.json if present.
5. Read agent/source-refs.json.
6. Read agent/verification.json.
7. Read WorkOrder / VerificationPlan / phase source-change posture.
8. If Circe-targeted, read circe/handoff.json and actor contracts.

| Consumer | Recommended Reads |
| --- | --- |
| human operator | README.md, context/task-context.md, verification-plan.md |
| general agent | agent/instructions.md, agent/handoff.md, agent/context.json |
| task-context-aware agent | context/task-context.agent.json |
| verifier/planner | agent/verification.json, verification-plan.md, phase source-change posture |
| Circe-targeted actor | circe/handoff.json, circe/actor-contracts/* |

## Authority Model

The reading order orders *reads* and classifies authority; it moves no authority. TaskContextReport
sidecars are optional context. WorkOrder is authoritative work scope. VerificationPlan is
authoritative verification scope. agent/verification.json is authoritative verification posture.
agent/source-refs.json is authoritative source references. phase source-change posture is handoff
evidence, not approval. safe executable verification-command projection is handoff data, not
execution. circe/rekon-proof.json is proof/boundary state. actor contracts are role/return-shape
guidance. The Operator Command Boundary is operator-only inspection guidance.

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

## Safe Verification Command Projection Policy

Safe executable verification-command projection is handoff data, not execution. circe/phase-plan.json
may describe verification commands, but Rekon does not execute them. circe/rekon-proof.json keeps
commandsExecuted:false. Shell-metacharacter command strings are rejected from the executable
verification-command projection. Agents/operators should treat projected commands as candidate
verification instructions, not evidence that commands ran.

## Actor Contract And Operator Command Boundary Policy

Actor contracts are role/return-shape guidance, not executed workers. The Operator Command
Boundary is operator-only inspection guidance, not worker execution guidance. Worker requests to
run operator-only Circe commands are plan-quality concerns. Circe handoff JSON remains the machine
handoff contract. Rekon does not run Circe.

## Boundary Model

The decision adds policy guidance only; every boundary holds:

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

## What This Does Not Do

This decision implements no broader workflow changes, changes no bundle implementation, no
reading-order implementation, no verification-command projection, no Circe handoff schema, no
actor contracts, no source-change posture implementation, no WorkOrder / VerificationPlan gate,
and no phase gate. It executes no commands, writes no source, creates no WorkOrder /
VerificationPlan / VerificationRun / VerificationResult, and runs no Circe. It does not make
TaskContextReport required, make the reading order proof, treat source-change posture as approval,
treat verification-command projection as execution, treat actor contracts as executable workers,
or let workers run operator-only Circe commands. intent:go remains deferred.

## Implementation Sequence

1. **Intent Bundle Handoff Workflow Guide** (recommended first implementation) — teach broader
   operator/agent workflows how to use the reading order (what humans read first, what agents read
   first, how to treat TaskContextReport sidecars / WorkOrder / VerificationPlan / phase
   source-change posture / safe executable verification-command projection / actor contracts /
   operator-only Circe commands), with no automation, no proof/approval authority, no command
   execution, no source writes, and no intent:go.
2. A safety review of that workflow guide, before broader workflow use builds on it.

Alternative first step: **Intent Bundle Handoff Reading Order UX Fix**, only if a concrete
wording/discoverability issue surfaces — none has.

> Update (slice 198 · Intent Bundle Handoff Workflow Guide): shipped the slice-197 Option-B product-docs step — two reader guides ([`intent-bundle-handoff-workflow`](../guides/intent-bundle-handoff-workflow.md) and the agent reading-order companion) plus an implementation note that teach humans and agents how to consume an intent plan bundle using its handoff reading order. Documentation only. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. Next: Intent Bundle Handoff Workflow Guide Safety Review. See [`intent-bundle-handoff-workflow-guide`](intent-bundle-handoff-workflow-guide.md).

> Update (slice 199 · Intent Bundle Handoff Workflow Guide Safety Review): reviewed the slice-198 workflow guide end-to-end and declared it safe/stable before recommending it as the default broader operator/agent handoff practice. The workflow guide introduces no runtime behavior changes. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. The human/agent workflow guidance, authority model, safe verification-command projection guidance, and actor-contract / Operator-Command-Boundary guidance all hold; the guides never tell a human or agent to execute commands or write source from the guide. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. Next: Intent Bundle Handoff Workflow Guide Dogfood. See [`intent-bundle-handoff-workflow-guide-safety-review`](intent-bundle-handoff-workflow-guide-safety-review.md).

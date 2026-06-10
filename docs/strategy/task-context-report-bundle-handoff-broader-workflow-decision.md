# TaskContextReport Bundle Handoff Broader Workflow Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

This memo decides how broader operator / agent handoff workflows should use the bundle
surfaces now shipped: the `TaskContextReport` sidecars, the agent-facing handoff files,
the Circe actor contracts + Operator Command Boundary, and — added in `e91dc087` — the
per-phase source-change posture. It is decision-only: it implements no broader handoff
workflow change, no bundle behavior change, no Circe schema change, and no gate change.
TaskContextReport remains optional context, not proof.

## Decision Summary

Select **Option B — an explicit broader handoff reading-order policy.** Bundles are now
rich enough that humans and agents need a defined reading order and a clear separation
between orientation, structured handoff, authoritative source/verification authority, and
the Circe contract layer. TaskContextReport sidecars are optional context, not proof.
Phase source-change posture belongs to the authoritative source / verification layer, not
the task-context layer. The first implementation slice is **Intent Bundle Handoff Reading
Order Implementation**.

## Why This Decision Exists

The bundle handoff surface is implemented, safety-reviewed, dogfooded, and
dogfood-safety-reviewed. It now carries TaskContextReport sidecars, agent handoff files,
Circe actor contracts, the Operator Command Boundary, and the new phase source-change
posture (`required` / `allowed` / `forbidden`) threaded through PreparedIntentPlan and the
Circe handoff projection. The remaining product question is how broader operator and agent
handoff workflows should teach humans and agents to read these surfaces together — without
confusing context, contracts, proof, gates, source-change posture, or execution. This memo
answers that, decision-only.

## Current Handoff Surface

A bundle can contain: `README.md`, `manifest.json`, `work-order.md` / `verification-plan.md`,
the agent files (`agent/instructions.md`, `agent/handoff.md`, `agent/context.json`,
`agent/verification.json`, `agent/source-refs.json`), the TaskContextReport sidecars
(`context/task-context.md`, `context/task-context.agent.json`,
`context/task-context.refs.json`), and the Circe layer (`circe/handoff.json`,
`circe/phase-plan.json`, `circe/rekon-proof.json`, `circe/actor-contracts/*`). The
TaskContextReport sidecars are optional, additive, `proof: false`,
`role: optional-agent-context`. The actor contracts are passive return-shape guidance with
the Operator Command Boundary appended. The `e91dc087` change adds a **per-phase
source-change posture**: `sourceChangeForPhaseKind` classifies each phase as `required`
(modify / implement / refactor), `forbidden` (investigate / review / verify), or `allowed`
(otherwise), overridable by an explicit `phase.sourceChange`; it is threaded through the
`CircePhaseGate`, the phase plans, WorkOrders, VerificationPlans, the `circe/rekon-proof.json`
phase gates, and the agent verification summaries. The `circe/rekon-proof.json` gate
booleans (`sourceWriteAllowed: false`, `commandsExecuted: false`, `runsCirce: false`,
`intentGoDeferred: true`) are unchanged, and the source-change posture is independent of the
TaskContextReport sidecars.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| leave bundle docs as-is | rejected/deferred | reading order should be explicit |
| explicit reading-order policy | selected | improves human/agent handoff use |
| TaskContextReport as primary authority | rejected | context is not proof |
| actor contracts as primary input | rejected/deferred | contracts are role/return guidance only |
| Circe consumes TaskContextReport internals | rejected/deferred | avoid schema coupling |

- **Option A — leave bundle docs as-is:** rejected/deferred. The dogfood proved the
  surfaces are useful; broader workflows need an explicit reading order.
- **Option B — explicit handoff reading-order policy:** selected. Improves usability
  without automation or new authority.
- **Option C — make TaskContextReport the primary bundle artifact:** rejected. Task context
  is orientation, not proof or gate authority.
- **Option D — make actor contracts the primary agent input:** rejected/deferred. Actor
  contracts define role/return boundaries, but agents still need WorkOrder, source refs,
  verification posture, source-change posture, and context.
- **Option E — wire TaskContextReport into Circe import:** rejected/deferred. Avoid schema
  coupling; Rekon-side sidecars are sufficient in v1.

## Recommendation

Adopt Option B. Define a recommended human and agent reading order, promoted in the bundle
`README.md`, `agent/instructions.md`, and `agent/handoff.md` (and optionally
`agent/context.json` metadata). The order keeps task context as orientation, keeps the
WorkOrder / VerificationPlan / phase-gate / source-change posture as the authoritative
source/verification layer, keeps actor contracts as role/return guidance, and keeps the
operator-only commands operator-only. The first implementation slice is **Intent Bundle
Handoff Reading Order Implementation**, scoped to promoting the reading order in bundle
surfaces; it changes no proof/gate semantics.

## Broader Handoff Model

Handoff has four layers:

1. Operator-facing orientation: `README.md`, `context/task-context.md`, `verification-plan.md`.
2. Agent-facing structured handoff: `agent/instructions.md`, `agent/handoff.md`,
   `agent/context.json`, `context/task-context.agent.json`.
3. Source / verification authority: `WorkOrder`, `VerificationPlan`, phase source-change
   posture, `agent/source-refs.json`, `agent/verification.json`.
4. Circe contract layer: `circe/handoff.json`, `circe/phase-plan.json`,
   `circe/rekon-proof.json`, `circe/actor-contracts/*`.

Relationship: TaskContextReport sidecars explain the task; WorkOrder / VerificationPlan
define allowed work and verification posture; phase source-change posture is evidence of
which phases may change source; actor contracts define Circe actor role/return boundaries;
rekon-proof defines the proof/gate boundaries. None of these execute anything by
themselves. Source-change posture is handoff evidence, not approval.

| Layer | Surfaces | Purpose |
| --- | --- | --- |
| operator orientation | README.md, context/task-context.md, verification-plan.md | human orientation |
| agent structured handoff | agent/instructions.md, agent/handoff.md, agent/context.json, context/task-context.agent.json | agent guidance |
| source / verification authority | WorkOrder, VerificationPlan, phase source-change posture, agent/source-refs.json, agent/verification.json | authoritative refs/posture |
| Circe contract layer | circe/handoff.json, circe/phase-plan.json, circe/rekon-proof.json, circe/actor-contracts/* | target contracts / proof boundaries |

| Consumer | First Reads |
| --- | --- |
| human operator | README.md, then context/task-context.md |
| general agent | agent/instructions.md, agent/handoff.md, agent/context.json |
| task-context-aware agent | context/task-context.agent.json |
| verifier/planner | agent/verification.json, verification-plan.md |
| Circe-targeted actor | circe/handoff.json and actor contracts |

## Human Handoff Policy

Humans should inspect README.md first, then context/task-context.md when present. Humans
should use TaskContextReport as orientation, not proof, and rely on WorkOrder /
VerificationPlan / proof surfaces for authority. Humans should treat verification hints as
suggestions and do-not-touch zones as guidance/context. Humans should inspect the phase
source-change posture in the source / verification authority layer (WorkOrder /
VerificationPlan / phase gates), not as task context. Source-change posture is handoff
evidence, not approval.

## Agent Handoff Policy

Agents should inspect agent/instructions.md first, then agent/handoff.md, then
agent/context.json, and then context/task-context.agent.json when present. Agents should use
agent/source-refs.json for source refs and agent/verification.json for verification posture.
Agents should treat actor contracts as role/return-shape guidance, must not run operator-only
Circe commands as worker verification, and must not execute verification hints unless
separately instructed. Agents should read the phase source-change posture from the source /
verification authority layer; TaskContextReport sidecars must not override sourceChange
posture.

## Circe And Actor Contract Policy

Circe handoff JSON remains the machine handoff contract. Actor contracts are role/return-shape
guidance, not executed workers, and are independent of TaskContextReport. Circe should not be
required to understand TaskContextReport internals in v1. The Operator Command Boundary is
operator-only inspection guidance, not worker execution guidance, and worker requests to run
operator-only Circe commands are plan-quality concerns. The phase source-change posture is
projected into the Circe layer (phase plans, WorkOrders, VerificationPlans, rekon-proof phase
gates) as evidence; it does not execute anything and does not depend on TaskContextReport.

## Boundary Model

The reading-order policy grants no new authority. Every boundary holds:

- TaskContextReport sidecars are optional context, not proof.
- Phase source-change posture belongs to the authoritative source / verification layer, not the task-context layer.
- Source-change posture is handoff evidence, not approval.
- TaskContextReport sidecars must not override sourceChange posture.
- WorkOrder and VerificationPlan remain the authoritative work and verification gates.
- agent/verification.json remains authoritative for verification posture.
- agent/source-refs.json remains authoritative for source refs.
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

| Boundary | Decision |
| --- | --- |
| task context vs proof | optional context only |
| source-change posture vs approval | evidence, not approval |
| actor contracts vs execution | role/return guidance only |
| WorkOrder / VerificationPlan | authoritative gates |
| agent verification | authoritative posture |
| source refs | authoritative source refs |
| operator Circe commands | operator-only |
| command execution | none |
| source writes | none |
| intent:go | deferred |

## Decision Questions

1. Should broader handoff workflows standardize a bundle reading order? Yes.
2. What should humans inspect first? README.md, then context/task-context.md when present.
3. What should agents inspect first? agent/instructions.md, then agent/handoff.md, then
   agent/context.json, then context/task-context.agent.json when present.
4. Should TaskContextReport sidecars be promoted as context in the handoff flow? Yes —
   optional context only.
5. Should actor contracts be promoted as actor return-shape/boundary contracts? Yes — as
   role/return guidance, not execution.
6. How should TaskContextReport sidecars relate to Circe actor contracts? Independent:
   sidecars explain the task; actor contracts define Circe actor return boundaries.
7. How should Circe import treat TaskContextReport sidecars? As optional Rekon-side context
   only; not required.
8. How should Circe import treat actor contracts? As passive role/return contracts to honor,
   not commands Rekon executes.
9. Should Circe be required to understand TaskContextReport internals? No.
10. Should TaskContextReport sidecars ever be proof? No.
11. Should actor contracts ever be executed by Rekon? No.
12. How should operator-only Circe commands be represented? As the Operator Command Boundary
    in the actor contracts — operator-only inspection, not worker verification.
13. Should workers run operator-only Circe commands? No.
14. Should a plan that asks workers to run operator-only Circe commands be flagged? Yes — a
    plan-quality concern.
15. Should WorkOrder / VerificationPlan gates remain authoritative? Yes.
16. Should phase gates remain authoritative? Yes.
17. Should agent/verification.json remain authoritative for verification posture? Yes.
18. Should agent/source-refs.json remain authoritative for source refs? Yes.
19. Should bundle README promote the handoff reading order? Yes.
20. Should agent/instructions.md promote the handoff reading order? Yes.
21. Should future implementation change Circe handoff schema? No in v1.
22. How should phase source-change posture fit into the handoff reading order? In the source /
    verification authority layer (WorkOrder / VerificationPlan / phase gates), not the
    task-context layer.
23. Should source-change posture be treated as task context? No.
24. Should source-change posture be treated as approval? No — it is handoff evidence.
25. Should TaskContextReport sidecars override sourceChange posture? No.
26. Where should humans and agents inspect source-change posture? In the source / verification
    authority layer.
27. What implementation slice follows? Intent Bundle Handoff Reading Order Implementation.

## What This Does Not Do

This decision implements no broader handoff workflow change. It changes no bundle
implementation, no TaskContextReport sidecars, no agent-file rendering, no Circe
actor-contract implementation, no Circe handoff schema, no WorkOrder / VerificationPlan gate,
no phase gate, and no source-change classification. It does not make TaskContextReport
required or proof, treat actor contracts as execution, let actors execute operator-only Circe
commands, approve plans, execute verification hints or target-repo commands, write source,
create a WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or run Circe.
intent:go remains deferred.

## Implementation Sequence

1. **Intent Bundle Handoff Reading Order Implementation** (recommended next) — promote the
   reading order directly in `README.md`, `agent/instructions.md`, `agent/handoff.md` (and
   optionally `agent/context.json` metadata), distinguishing task context, WorkOrder /
   VerificationPlan authority, phase source-change posture, agent verification posture, source
   refs, Circe actor contracts, and operator-only Circe commands — with no proof authority, no
   approval authority, no command execution, no source writes, no Circe execution, and no
   intent:go.
2. **TaskContextReport Bundle Handoff UX Fix** (alternative) — only if the decision uncovers a
   narrower discoverability issue.

> Update (slice 193 · Intent Bundle Handoff Reading Order Implementation): the intent plan bundle now promotes the handoff reading order directly in its surfaces — a "## Handoff reading order" section in `README.md` (human + agent lists), a "## Reading order" section in `agent/instructions.md` and `agent/handoff.md`, and an additive `handoffReadingOrder` metadata block in `agent/context.json`. Always rendered; task-context entries say "if present". Guidance only — no Circe handoff schema, actor-contract, source-change-classification, or gate change; TaskContextReport stays optional context, WorkOrder / VerificationPlan stay authoritative, source-change posture stays handoff evidence not approval, intent:go stays deferred. See [`intent-bundle-handoff-reading-order-implementation`](intent-bundle-handoff-reading-order-implementation.md).

> Update (slice 194 · Intent Bundle Handoff Reading Order Safety Review): the slice-193 bundle handoff reading order was reviewed end-to-end and declared safe/stable — guidance, not automation. The README / agent-instructions / agent-handoff reading-order sections and the additive `agent/context.json.handoffReadingOrder` metadata (which preserves every existing field) guide humans and agents toward authoritative surfaces while every boundary holds: TaskContextReport sidecars stay optional context (not proof); WorkOrder / VerificationPlan stay authoritative; phase source-change posture stays handoff evidence, not approval; actor contracts stay role/return-shape guidance; the Operator Command Boundary stays operator-only; `circe/*` is byte-unchanged; intent:go deferred. See [`intent-bundle-handoff-reading-order-safety-review`](intent-bundle-handoff-reading-order-safety-review.md).

> Update (slice 195 · Intent Bundle Handoff Reading Order Dogfood): the shipped reading order was dogfooded end-to-end from four perspectives (human operator, general agent, task-context-aware agent, Circe-targeted actor) via the full operator path + a without-context comparison. The reading order is practically useful and every boundary held — README / agent-instructions / agent-handoff reading orders and `agent/context.json.handoffReadingOrder` (preserving every existing field) guide humans and agents toward the authoritative surfaces; TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; source-change posture stays handoff evidence, not approval; actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; the without-context bundle stays clean; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go deferred. See [`intent-bundle-handoff-reading-order-dogfood`](intent-bundle-handoff-reading-order-dogfood.md).

> Update (slice 196 · Intent Bundle Handoff Reading Order Dogfood Safety Review): the slice-195 dogfood result was reviewed end-to-end and declared safe/stable — rebased onto `d975d3e` ("keep Circe verification commands executable") so the verification-posture / Circe-projection claims re-ground against the current producer; the 41-assertion dogfood contract test re-ran green. Intent bundle handoff reading order is guidance, not automation. The new `isSafeExecutableVerificationCommand` projection preserves only a bounded safe subset and rejects shell-metacharacter command strings — safe executable verification-command projection is handoff data, not execution: `circe/phase-plan.json` may describe verification commands but Rekon does not execute them, and `circe/rekon-proof.json` keeps commandsExecuted:false. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; source-change posture stays handoff evidence, not approval; actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; the without-context bundle stays clean; intent:go deferred. See [`intent-bundle-handoff-reading-order-dogfood-safety-review`](intent-bundle-handoff-reading-order-dogfood-safety-review.md).

> Update (slice 197 · Intent Bundle Handoff Reading Order Broader Workflow Decision): decided how broader operator/agent workflow docs should treat the final reading order — Option B, a recommended (not required) broader handoff reading-order policy. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. First implementation: Intent Bundle Handoff Workflow Guide. See [`intent-bundle-handoff-reading-order-broader-workflow-decision`](intent-bundle-handoff-reading-order-broader-workflow-decision.md).

# Intent Bundle Handoff Reading Order Safety Review

This memo reviews the shipped [Intent Bundle Handoff Reading Order
Implementation](intent-bundle-handoff-reading-order-implementation.md) (slice 193, `a227f2d`)
end-to-end and declares the reading-order guidance safe and stable before broader handoff
workflow use. It is a review only: it changes no runtime behavior, no reading-order
implementation, no README / `agent/instructions.md` / `agent/handoff.md` / `agent/context.json`
rendering, no Circe handoff schema, no actor-contract implementation, no source-change posture
implementation, and no gate.

## Decision Summary

Intent Bundle Handoff Reading Order is safe/stable. Intent bundle handoff reading order is
guidance, not automation. The reading order promoted into the bundle surfaces guides humans and
agents toward the authoritative surfaces in a safe order while every boundary holds. Humans
should inspect README.md first, then context/task-context.md when present. Agents should inspect
agent/instructions.md first, then agent/handoff.md, then agent/context.json, and then
context/task-context.agent.json when present. TaskContextReport sidecars are optional context,
not proof.

## Why This Review Exists

Slice 193 implemented the slice-192 decision (Option B): the intent plan bundle now promotes a
human reading order and an agent reading order directly inside `README.md`,
`agent/instructions.md`, `agent/handoff.md`, and `agent/context.json`. Because bundle/handoff
surfaces sit close to execution orchestration, this review confirms the reading order improves
usability without creating automation, proof, approval, execution, or source-write authority —
before the reading order is dogfooded and built upon.

## Implementation Reviewed

Reviewed the four shipped, always-rendered renderer additions in
`packages/capability-docs/src/intent-plan-bundle.ts` (grounded at `a227f2d`): the README
`## Handoff reading order` section, the `agent/instructions.md` `## Reading order` section, the
`agent/handoff.md` `## Reading order` section, and the additive
`agent/context.json.handoffReadingOrder` metadata. Reviewed the new contract test
`tests/contract/intent-bundle-handoff-reading-order.test.mjs` (35 assertions) and the existing
`task-context-bundle-handoff-dogfood`, `task-context-bundle-handoff-guidance`, and
`intent-plan-bundle` tests — all green. The additions are additive presentation guidance; gate
booleans and Circe files are untouched.

| Surface | Status | Safety Finding |
| --- | --- | --- |
| README.md reading order | shipped | human guidance only |
| agent/instructions.md reading order | shipped | agent guidance only |
| agent/handoff.md reading order | shipped | gates stay authoritative |
| agent/context.json handoffReadingOrder | shipped | additive metadata |
| without-context bundle | shipped | safe "if present" wording |
| Circe handoff | unchanged | machine contract |

## README Reading Order Review

README.md guides humans to inspect bundle surfaces in a safe order. The `## Handoff reading
order` section renders a human list (README → `context/task-context.md` if present →
`verification-plan.md` → `work-order.md` / source refs / agent files → `circe/actor-contracts/*`
only for Circe-facing handoffs) and an agent list, plus boundary bullets. README.md keeps task
context as optional context, not proof: the section states "Task context is optional context,
not proof." and "WorkOrder / VerificationPlan remain authoritative." The task-context entry is
phrased "if present", so the section never claims task context is available.

## Agent Instructions Review

agent/instructions.md guides agents to inspect surfaces in a safe order. Its `## Reading order`
section ("Read these before acting:") lists the ordered agent reads — `agent/handoff.md`,
`agent/context.json`, `context/task-context.agent.json` when present, `agent/source-refs.json`,
`agent/verification.json`, `work-order.md` / `verification-plan.md` / phase source-change
posture, and `circe/handoff.json` + actor contracts when Circe-targeted. It preserves
verification hints as hints and operator-only Circe commands as operator-only: Verification
hints remain hints, not executed commands. Do-not-touch zones remain guidance/context, not
enforcement. The Operator Command Boundary is operator-only inspection guidance, not worker
execution guidance.

## Agent Handoff Review

agent/handoff.md guides agents to the structured-handoff and authority surfaces. Its
`## Reading order` section points at `agent/context.json`, `context/task-context.agent.json` (if
present), `agent/source-refs.json`, `agent/verification.json`, and `circe/handoff.json` +
`circe/actor-contracts/*` (if Circe-targeted), and states that WorkOrder / VerificationPlan /
phase gates remain authoritative. The reading order preserves gates as authoritative — it points
to the authority surfaces but grants them no new power and removes none.

## Agent Context Metadata Review

agent/context.json carries additive handoffReadingOrder metadata and preserves every existing
field. handoffReadingOrder metadata is additive and preserves existing agent/context.json
fields. The block carries an ordered `agent` read array and an `authority` map. The metadata is
placed after `artifactRefs` and before the optional `taskContext` block; `intentId`, `goal`,
`status`, `scope`, `capabilities`, `steps`, `phases`, `obligations`, and `artifactRefs` are all
preserved. Worker requests to run operator-only Circe commands are plan-quality concerns.

## Authority Layer Review

The reading order distinguishes context from authority and does not move authority. WorkOrder and
VerificationPlan remain the authoritative work and verification gates. agent/verification.json
remains authoritative for verification posture. agent/source-refs.json remains authoritative for
source refs. The `handoffReadingOrder.authority` map classifies each surface — `taskContext:
context-only`, `workOrder: authoritative-work`, `verificationPlan: authoritative-verification`,
`sourceChangePosture: handoff-evidence-not-approval`, `actorContracts:
role-return-guidance-not-execution` — distinguishing task context from authority, source-change
posture from approval, and actor contracts from execution. Phase source-change posture belongs to
the authoritative source / verification layer, not the task-context layer. Source-change posture
is handoff evidence, not approval. TaskContextReport sidecars must not override sourceChange
posture.

| Surface | Authority |
| --- | --- |
| TaskContextReport sidecars | optional context |
| WorkOrder | authoritative work gate |
| VerificationPlan | authoritative verification gate |
| phase source-change posture | handoff evidence, not approval |
| agent/verification.json | verification posture |
| agent/source-refs.json | source references |
| actor contracts | role/return-shape guidance |
| rekon-proof gates | proof/boundary state |

## Circe And Actor Contract Review

The Circe handoff surface is unchanged and stable. Circe handoff JSON remains the machine handoff
contract. `circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json`, and
`circe/actor-contracts/*` are byte-unchanged by the reading order — the reading order only
references them. Actor contracts are role/return-shape guidance, not executed workers. The
`circe/rekon-proof.json` gate booleans remain `sourceWriteAllowed: false`, `commandsExecuted:
false`, `runsCirce: false`, `intentGoDeferred: true`. Rekon did not run Circe.

## Boundary Review

Every boundary holds. TaskContextReport sidecars must not approve plans. TaskContextReport
sidecars must not execute commands. TaskContextReport sidecars must not write source files. The
without-context bundle remains safe: the reading order still renders (phrased "if present"), no
`context/` sidecars are created, no `taskContext` key is present, and `handoffReadingOrder`
metadata remains present. No source files are written, no commands are executed, no
VerificationRun or VerificationResult is created, Rekon does not run Circe, and intent:go remains
deferred.

| Boundary | Review Finding |
| --- | --- |
| reading order vs automation | guidance only |
| task context vs proof | optional context only |
| source-change posture vs approval | evidence, not approval |
| actor contracts vs execution | guidance, not workers |
| WorkOrder / VerificationPlan | authoritative gates |
| command execution | none |
| source writes | none |
| VerificationRun / Result | none |
| Circe | not run by Rekon |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare reading order safe/stable | selected | guidance boundary holds |
| dogfood next | selected | usefulness needs final handoff review |
| UX fix next | deferred | only if issue found |
| broader automation next | rejected/deferred | needs separate decision |
| make reading order authoritative | rejected | reading order is guidance |

## Recommendation

Intent Bundle Handoff Reading Order is safe/stable. The reading order is guidance only and the
boundary holds across all four surfaces and the without-context bundle. Recommended next slice:
**Intent Bundle Handoff Reading Order Dogfood** — dogfood the final handoff reading order from a
human-operator and an agent perspective and verify whether it improves practical bundle
consumption without weakening gates.

## What This Does Not Do

This review changes no runtime behavior, no reading-order implementation, no bundle
implementation, no README / agent-file / `agent/context.json` rendering, no Circe handoff schema,
no actor-contract implementation, no source-change posture implementation, no WorkOrder /
VerificationPlan gate, and no phase gate. It executes no commands, writes no source, creates no
WorkOrder / VerificationPlan / VerificationRun / VerificationResult, and runs no Circe. It does
not make TaskContextReport required or proof, treat source-change posture as approval, or treat
actor contracts as executable workers.

## Follow-Up Work

The recommended follow-up is **Intent Bundle Handoff Reading Order Dogfood** (default): dogfood
the final bundle handoff reading order across `README.md`, `agent/instructions.md`,
`agent/handoff.md`, `agent/context.json`, `context/task-context.agent.json`,
`agent/source-refs.json`, `agent/verification.json`, `circe/handoff.json`, and
`circe/actor-contracts/*`, evaluating whether the reading order improves practical consumption
without weakening gates. Alternative: **Intent Bundle Handoff Reading Order UX Fix**, only if this
review (or the dogfood) finds concrete wording / discoverability issues.

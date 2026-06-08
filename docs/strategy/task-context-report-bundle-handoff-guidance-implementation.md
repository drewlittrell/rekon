# TaskContextReport Bundle Handoff Guidance Implementation

This memo records the implementation of the [TaskContextReport Bundle Broader
Handoff Decision](task-context-report-bundle-broader-handoff-decision.md) (Option B).
When a `TaskContextReport` is attached to an intent plan bundle, the agent-facing
bundle files now promote the optional context sidecars. The change is additive and
guarded behind sidecar presence; it grants no authority. TaskContextReport sidecars
are optional context, not proof.

## What Shipped

Three additive, guarded renderer changes in
`packages/capability-docs/src/intent-plan-bundle.ts`, each rendered **only when a
TaskContextReport is attached** (the bundle is byte-identical otherwise):

- `agent/instructions.md` gains a "## Task context" section:
  - "Task context is optional context, not proof."
  - "Read context/task-context.agent.json before editing."
  - "Read context/task-context.md for the human-oriented brief."
  - "Verification hints are hints, not executed commands."
  - "Do-not-touch zones are guidance/context, not enforcement."
  - "WorkOrder / VerificationPlan / phase gates remain authoritative."
- `agent/handoff.md` gains a "## Task context" section:
  - "Optional task context is available."
  - "Use context/task-context.agent.json for structured context."
  - "Use context/task-context.md for the readable brief."
  - "This context is not proof and does not change the handoff gates."
- `agent/context.json` gains an additive `taskContext` metadata block:
  `{ available: true, reports: [{ ref, role: "optional-agent-context", proof: false,
  sidecars: { markdown, agentJson, refsJson } }] }`. The block is omitted entirely
  when no task context is attached, and every existing field (`intentId`, `goal`,
  `status`, `phases`, …) is preserved.

The bundle README "## Task context" section (slice 185) is unchanged. The three
`context/` sidecars are unchanged. The Circe handoff trio (`circe/handoff.json`,
`circe/phase-plan.json`, `circe/rekon-proof.json`) is unchanged and free of task
context.

## Why This Is Safe

The change is presentation only and additive. With no task context, the agent files
are byte-identical to the prior release: no "## Task context" section, no
`taskContext` metadata. The guidance points readers at the optional sidecars and
explicitly frames them as not-proof; it grants no authority. Humans should inspect
context/task-context.md when present. Agents should read
context/task-context.agent.json when present.

## Boundary Model

- TaskContextReport sidecars are optional context, not proof.
- humans should inspect context/task-context.md when present.
- agents should read context/task-context.agent.json when present.
- verification hints remain hints, not executed commands.
- do-not-touch zones remain guidance/context, not enforcement.
- WorkOrder and VerificationPlan gates remain authoritative.
- phase gates remain authoritative.
- Circe handoff JSON remains the machine handoff contract.
- Circe should not be required to understand TaskContextReport internals.
- TaskContextReport sidecars must not approve plans.
- TaskContextReport sidecars must not execute commands.
- TaskContextReport sidecars must not write source files.
- intent:go remains deferred.

| Surface | Behavior |
| --- | --- |
| agent/instructions.md | "## Task context" section when sidecars present; tells agent to read the agent JSON; gates authoritative |
| agent/handoff.md | "## Task context" section when sidecars present; points at the sidecars; not proof, gates unchanged |
| agent/context.json | additive `taskContext` metadata (`proof: false`, `role: optional-agent-context`) when sidecars present |
| README.md | unchanged (slice-185 "## Task context" section) |
| context/ sidecars | unchanged |
| circe/ trio | unchanged; no task-context dependency |
| WorkOrder / VerificationPlan / phase gates | unchanged, authoritative |

## What This Does Not Do

This implementation changes no Circe handoff schema, no WorkOrder / VerificationPlan
gate, and no phase gate. It does not make TaskContextReport required to write a
bundle, treat it as proof, approve a plan, execute a verification hint or any
target-repo command, write source, create a WorkOrder or VerificationPlan, or run
Circe. The agent guidance never implies that an agent may execute verification
hints automatically, ignore WorkOrder / VerificationPlan, or treat TaskContextReport
as approval. intent:go remains deferred.

## Verification

- `tests/contract/task-context-bundle-handoff-guidance.test.mjs` (24 assertions)
  replays the full operator path and asserts the agent-file sections, the
  `agent/context.json` metadata, the unchanged without-context surfaces, the
  unchanged Circe trio, and the no-source / no-command / no-go invariants.
- `tests/docs/task-context-bundle-handoff-guidance.test.mjs` locks the boundary
  language.
- The existing `intent-plan-bundle.test.mjs`, `task-context-bundle-context.test.mjs`,
  and `task-context-bundle-context-dogfood.test.mjs` remain green (the
  `agent/context.json` change is additive).

## Next Step

The recommended follow-up is a **TaskContextReport Bundle Handoff Guidance Safety
Review**: review the promoted handoff guidance before broader handoff workflow use.

> Update (slice 189 · TaskContextReport Bundle Handoff Guidance Safety Review): the slice-188 agent-facing handoff guidance was reviewed end-to-end and declared safe/stable. TaskContextReport sidecars are optional context, not proof; `agent/instructions.md` + `agent/handoff.md` promote the optional task context only when sidecars are present; `agent/context.json` carries additive `taskContext` metadata (`proof:false`, `role: optional-agent-context`) when present and preserves every existing field; without-context bundles are byte-identical. Agents should read `context/task-context.agent.json` when present; humans should inspect `context/task-context.md` when present; verification hints remain hints; do-not-touch stays guidance; WorkOrder / VerificationPlan + phase gates remain authoritative; the Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; sidecars must not approve plans, execute commands, or write source; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Dogfood. See [`task-context-report-bundle-handoff-guidance-safety-review.md`](task-context-report-bundle-handoff-guidance-safety-review.md).

> Update (slice 190 · TaskContextReport Bundle Handoff Dogfood — rebased on 4cc34b73 Circe actor contracts): the promoted handoff guidance was re-dogfooded from both the human-operator and the agent perspective against the current bundle producer after `4cc34b73` ("feat: emit target-specific Circe actor contracts"). A human can discover task context from `README.md`; `context/task-context.md` + `context/task-context.refs.json` were useful; an agent can discover it from `agent/instructions.md` + `agent/handoff.md`; `agent/context.json` `taskContext` metadata + `context/task-context.agent.json` were useful; `agent/verification.json` stayed authoritative for verification posture and `agent/source-refs.json` for source refs. The Circe handoff trio stayed stable and independent of TaskContextReport — `circe/handoff.json` now carries an additive `actorContracts` block. The new `circe/actor-contracts/` artifacts (3 contract Markdown + 3 JSON Schema, default `circe` target) were present and non-executing (return-shape guidance/artifacts, not executed workers) and identical in the without-context bundle. WorkOrder / VerificationPlan + phase gates remained authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle omitted every task-context surface. No fix needed. Next: TaskContextReport Bundle Handoff Dogfood Safety Review. See [`task-context-report-bundle-handoff-dogfood.md`](task-context-report-bundle-handoff-dogfood.md).

> Update (slice 191 · TaskContextReport Bundle Handoff Dogfood Safety Review): the shipped slice-190 handoff dogfood (`c5acc07`) — including the `circe/actor-contracts` surface and the new Circe Operator Command Boundary added in `11a209fd` — was reviewed end-to-end and declared **safe/stable** before broader handoff workflow use. Strategy/safety-review batch; no runtime/API/CLI/agent-file-rendering/actor-contract-generation/operator-boundary-generation/Circe-schema/gate change. TaskContextReport sidecars are optional context, not proof; the full handoff dogfood path completed successfully; the human + agent task-context surfaces stay discoverable and non-authoritative; `agent/verification.json` + `agent/source-refs.json` stay authoritative; the Circe handoff JSON stays stable and independent of TaskContextReport; Circe actor-contract artifacts were present and non-executing (guidance/artifacts, not executed workers); the new Operator Command Boundary is operator-only inspection guidance, not worker execution guidance — it reinforces that Rekon does not run Circe and treats worker requests to run Circe operator commands as plan-quality concerns; WorkOrder / VerificationPlan + phase gates remain authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle stayed clean. Next: TaskContextReport Bundle Handoff Broader Workflow Decision (alternative: Handoff UX Fix). See [`task-context-report-bundle-handoff-dogfood-safety-review.md`](task-context-report-bundle-handoff-dogfood-safety-review.md).

> Update (slice 192 · TaskContextReport Bundle Handoff Broader Workflow Decision): decided how broader operator/agent handoff workflows should use the bundle surfaces — **Option B, an explicit reading-order policy** — rebased onto `e91dc087` ("feat: classify phase source-change intent") to include the new per-phase source-change posture. Decision-only; no runtime/API/CLI/bundle/Circe-schema/gate change. Humans inspect `README.md` first, then `context/task-context.md` when present; agents inspect `agent/instructions.md` first, then `agent/handoff.md`, then `agent/context.json`, then `context/task-context.agent.json` when present. Four handoff layers: operator orientation; agent structured handoff; source/verification authority (WorkOrder, VerificationPlan, **phase source-change posture**, `agent/source-refs.json`, `agent/verification.json`); Circe contract layer. TaskContextReport sidecars are optional context, not proof; phase source-change posture belongs to the authoritative source/verification layer, not the task-context layer — it is handoff evidence, not approval, and TaskContextReport sidecars must not override `sourceChange` posture; WorkOrder/VerificationPlan + phase gates + agent verification + source refs remain authoritative; Circe handoff JSON remains the machine handoff contract; actor contracts are role/return-shape guidance, not executed workers; the Operator Command Boundary stays operator-only; verification hints stay hints; do-not-touch stays guidance; intent:go deferred. First implementation: Intent Bundle Handoff Reading Order Implementation. See [`task-context-report-bundle-handoff-broader-workflow-decision.md`](task-context-report-bundle-handoff-broader-workflow-decision.md).

# TaskContextReport Bundle Handoff Guidance Safety Review

This memo reviews the shipped [TaskContextReport Bundle Handoff Guidance
Implementation](task-context-report-bundle-handoff-guidance-implementation.md)
(slice 188, `1687749`) end-to-end and declares the promoted agent-facing handoff
guidance safe and stable. It is a review only: it changes no runtime behavior, no
handoff guidance implementation, no agent-file rendering, no Circe handoff schema,
and no gate.

## Decision Summary

TaskContextReport Bundle Handoff Guidance is safe/stable. When a TaskContextReport
is attached to an intent plan bundle, the agent-facing bundle files promote the
optional context sidecars, and every boundary holds. TaskContextReport sidecars are
optional context, not proof. The promotion is additive and guarded behind sidecar
presence: with no task context the agent files are byte-identical to the prior
release.

## Why This Review Exists

Slice 187 decided broader handoff surfaces should promote the optional sidecars;
slice 188 implemented that promotion in `agent/instructions.md`, `agent/handoff.md`,
and `agent/context.json`. Because bundle/handoff surfaces sit close to execution
orchestration, this review confirms the promotion is guidance-only and does not
alter the proof / gate / execution / source-write boundaries before broader handoff
workflow use builds on it.

## Implementation Reviewed

Reviewed source (grounded in the shipped tree at `1687749`):
`packages/capability-docs/src/intent-plan-bundle.ts` — three additive, guarded
renderer changes (each a `...(taskContext ? … : [])` / `...(taskContext ? … : {})`
spread, a no-op without task context): a "## Task context" section in the
`agentHandoff` array, a `taskContext` metadata key in the `agentContext` JSON
object, and a "## Task context" section in the `agentInstructions` array. Reviewed
tests `tests/contract/task-context-bundle-handoff-guidance.test.mjs` (24),
`task-context-bundle-context.test.mjs` (27), `task-context-bundle-context-dogfood.test.mjs`
(33), `intent-plan-bundle.test.mjs` (106) — all green.

## Agent Instructions Review

agent/instructions.md promotes optional task context only when sidecars are present.
The "## Task context" section says: "Task context is optional context, not proof.",
"Read context/task-context.agent.json before editing.", "Read context/task-context.md
for the human-oriented brief.", "Verification hints are hints, not executed
commands.", "Do-not-touch zones are guidance/context, not enforcement.", "WorkOrder /
VerificationPlan / phase gates remain authoritative." It points agents at
`context/task-context.agent.json` and never implies an agent may execute hints,
ignore gates, or treat context as approval.

## Agent Handoff Review

agent/handoff.md promotes optional task context only when sidecars are present. The
"## Task context" section says: "Optional task context is available.", "Use
context/task-context.agent.json for structured context.", "Use context/task-context.md
for the readable brief.", "This context is not proof and does not change the handoff
gates." It points agents at the sidecars and states the handoff gates remain
unchanged.

## Agent Context Metadata Review

agent/context.json carries additive taskContext metadata when sidecars are present.
The metadata is `{ available: true, reports: [{ ref, role: "optional-agent-context",
proof: false, sidecars: { markdown, agentJson, refsJson } }] }`. taskContext metadata
marks proof:false. taskContext metadata marks role optional-agent-context.
agent/context.json preserves existing fields (`intentId`, `goal`, `status`, `phases`,
…). The metadata is omitted entirely when no task context is attached.

## Without-Context Bundle Review

Without a TaskContextReport, the agent files are byte-identical: `agent/instructions.md`
and `agent/handoff.md` carry no "## Task context" section, and `agent/context.json`
carries no `taskContext` key (but keeps every existing field). No `context/` sidecars
are created. Bundle behavior is unchanged.

## Circe Boundary Review

Circe handoff JSON remains the machine handoff contract. The handoff trio
(`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json`) is unchanged
and free of task context; the contract test masks the repo path and asserts no
`task-context` substring. Circe should not be required to understand TaskContextReport
internals.

## Gate Review

WorkOrder and VerificationPlan gates remain authoritative — `work-order.md` and
`verification-plan.md` are produced by the same code paths and never reference the
sidecars. Phase gates remain authoritative (the per-phase verification posture is
unchanged). Source and plan files were unchanged; no commands were executed; no
VerificationRun or VerificationResult was created.

## Boundary Review

TaskContextReport sidecars are optional context, not proof. Every boundary holds:

- Agents should read context/task-context.agent.json when it is present in a bundle.
- Humans should inspect context/task-context.md when it is present in a bundle.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- WorkOrder and VerificationPlan gates remain authoritative.
- Phase gates remain authoritative.
- Circe handoff JSON remains the machine handoff contract.
- Circe should not be required to understand TaskContextReport internals.
- TaskContextReport sidecars must not approve plans.
- TaskContextReport sidecars must not execute commands.
- TaskContextReport sidecars must not write source files.
- intent:go remains deferred.

| Surface | Status | Safety Finding |
| --- | --- | --- |
| agent/instructions.md | shipped | task-context guidance when present |
| agent/handoff.md | shipped | task-context guidance when present |
| agent/context.json | shipped | additive taskContext metadata |
| without-context bundle | shipped | no task-context guidance |
| Circe handoff trio | unchanged | no task-context dependency |

| Agent Surface | Review Finding |
| --- | --- |
| agent/instructions.md | tells agents to read context/task-context.agent.json |
| agent/handoff.md | points agents to optional context |
| agent/context.json | carries refs/metadata only |
| context/task-context.agent.json | structured task context |
| context/task-context.refs.json | traceability refs |

| Boundary | Decision |
| --- | --- |
| context vs proof | optional context only |
| context vs approval | no approval |
| context vs WorkOrder / VerificationPlan | no gate authority |
| context vs phase gates | no authority |
| command execution | no execution |
| source writes | no writes |
| Circe | no required internals |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare guidance safe/stable | selected | additive guidance boundary holds |
| handoff dogfood next | selected | usefulness/discoverability needs review |
| guidance UX fix next | deferred | only if review finds issue |
| require task context | rejected | context is not proof |
| change Circe schema | rejected | machine handoff stays stable |

## Recommendation

TaskContextReport Bundle Handoff Guidance is safe/stable. The next slice is
**TaskContextReport Bundle Handoff Dogfood** — run a realistic bundle handoff from
the perspective of a human operator and an agent reading `README.md`,
`agent/instructions.md`, `agent/handoff.md`, `agent/context.json`,
`context/task-context.md`, `context/task-context.agent.json`, and
`context/task-context.refs.json`, evaluating discoverability and usefulness (not
proof/gate behavior). Fall back to a **TaskContextReport Bundle Handoff Guidance UX
Fix** only if this review or the dogfood finds concrete guidance/discoverability
issues.

## Review Questions

1. Is the guidance safe/stable? Yes.
2. Do agent instructions mention optional task context only when sidecars exist? Yes.
3. Do agent instructions point to `context/task-context.agent.json`? Yes.
4. Do agent instructions say task context is not proof? Yes.
5. Do agent instructions preserve verification hints as hints? Yes.
6. Do agent instructions preserve WorkOrder / VerificationPlan / phase gates as
   authoritative? Yes.
7. Does agent handoff mention optional task context only when sidecars exist? Yes.
8. Does agent handoff point to `context/task-context.agent.json`? Yes.
9. Does agent handoff say handoff gates remain unchanged? Yes.
10. Does `agent/context.json` include additive `taskContext` metadata when present? Yes.
11. Does `agent/context.json` preserve existing fields? Yes.
12. Does `taskContext` metadata carry `proof:false`? Yes.
13. Does `taskContext` metadata carry `role: optional-agent-context`? Yes.
14. Are without-context bundles unchanged? Yes.
15. Is Circe handoff JSON unchanged / not dependent on task context? Yes.
16. Are WorkOrder / VerificationPlan gates unchanged? Yes.
17. Are phase gates unchanged? Yes.
18. Are source and plan files unchanged in dogfood coverage? Yes.
19. Were commands not executed? Correct — none.
20. Was no VerificationRun / VerificationResult created? Correct — none.
21. Did Rekon not run Circe? Correct — it did not.
22. Does intent:go remain deferred? Yes.
23. What slice follows? TaskContextReport Bundle Handoff Dogfood.

## What This Does Not Do

This review changes no runtime behavior, no handoff guidance implementation, no
agent-file rendering, no Circe handoff schema, and no gate. It does not make
TaskContextReport required, treat it as proof, approve a plan, satisfy a WorkOrder /
VerificationPlan / phase gate, execute a verification hint or any target-repo
command, write source, create a WorkOrder or VerificationPlan, or run Circe.
intent:go remains deferred.

## Follow-Up Work

- **TaskContextReport Bundle Handoff Dogfood** (recommended next) — evaluate
  discoverability and usefulness of the promoted guidance on a real handoff.
- **TaskContextReport Bundle Handoff Guidance UX Fix** (alternative) — only if a
  concrete guidance/discoverability issue surfaces.

> Update (slice 190 · TaskContextReport Bundle Handoff Dogfood — rebased on 4cc34b73 Circe actor contracts): the promoted handoff guidance was re-dogfooded from both the human-operator and the agent perspective against the current bundle producer after `4cc34b73` ("feat: emit target-specific Circe actor contracts"). A human can discover task context from `README.md`; `context/task-context.md` + `context/task-context.refs.json` were useful; an agent can discover it from `agent/instructions.md` + `agent/handoff.md`; `agent/context.json` `taskContext` metadata + `context/task-context.agent.json` were useful; `agent/verification.json` stayed authoritative for verification posture and `agent/source-refs.json` for source refs. The Circe handoff trio stayed stable and independent of TaskContextReport — `circe/handoff.json` now carries an additive `actorContracts` block. The new `circe/actor-contracts/` artifacts (3 contract Markdown + 3 JSON Schema, default `circe` target) were present and non-executing (return-shape guidance/artifacts, not executed workers) and identical in the without-context bundle. WorkOrder / VerificationPlan + phase gates remained authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle omitted every task-context surface. No fix needed. Next: TaskContextReport Bundle Handoff Dogfood Safety Review. See [`task-context-report-bundle-handoff-dogfood.md`](task-context-report-bundle-handoff-dogfood.md).

# TaskContextReport Bundle Broader Handoff Decision

This memo decides how broader operator/agent handoff workflows should use the
optional `TaskContextReport` bundle-context sidecars shipped and dogfooded in
slices 183–186. It is decision-only: it implements no broader handoff workflow
changes, no bundle behavior change, and no Circe schema change. TaskContextReport
remains optional context, not proof.

## Decision Summary

Select **Option B — promote optional TaskContextReport sidecars in broader handoff
docs and agent-facing bundle guidance.** The dogfood proved the sidecars are useful
and discoverable; broader handoff workflows should teach humans and agents to read
them, while keeping them optional and non-authoritative. TaskContextReport sidecars
are optional context, not proof. TaskContextReport sidecars must not be required to
write an intent bundle. The first implementation slice is **TaskContextReport Bundle
Handoff Guidance Implementation**.

## Why This Decision Exists

TaskContextReport bundle context is now implemented, safety-reviewed, dogfooded, and
safety-reviewed again. The dogfood showed `manifest.context.taskContextReports` is
discoverable, the `context/task-context.md` human brief is useful to operators, the
`context/task-context.agent.json` agent view is useful to agents, the
`context/task-context.refs.json` index is useful for traceability, the bundle README
points to the sidecars, and every boundary held (Circe handoff unchanged, gates
unchanged, no source write / command / VerificationRun / VerificationResult / Circe /
intent:go). The remaining product question is how broader handoff workflows should
teach humans and agents to use these optional context sidecars — which this memo
answers.

## Current Bundle Context Surface

`rekon intent bundle write --task-context-ref <TaskContextReport ref>` attaches
optional context. The bundle carries:

- `manifest.context.taskContextReports[]` — `{ ref, role: "optional-agent-context",
  proof: false, sidecars: { markdown, agentJson } }`.
- `context/task-context.md` — human brief, opens "This context is optional guidance,
  not proof."
- `context/task-context.agent.json` — agent view with `agentContext` + all-false
  `boundaries` + `proof: false`.
- `context/task-context.refs.json` — `{ ref, role: "optional-agent-context",
  proof: false }`.
- A bundle README "## Task context" section (slice 185) that points humans to the
  sidecars only when context is attached.
- The agent-facing files `agent/handoff.md`, `agent/instructions.md`,
  `agent/context.json` (which today do not mention task context).
- The Circe handoff trio `circe/handoff.json`, `circe/phase-plan.json`,
  `circe/rekon-proof.json` (free of task context).

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| manifest/README only | rejected/deferred | agents need explicit instruction |
| promote sidecars in handoff guidance | selected | improves usability without authority |
| require task context for bundles | rejected | context is not proof |
| add to Circe schema | rejected/deferred | avoid schema coupling |
| execute verification hints | rejected | hints are not commands |

- **Option A — manifest/README only:** rejected/deferred. The dogfood showed the
  sidecars are useful; agents should be told to read them, not left to discover them.
- **Option B — promote sidecars in human/agent handoff guidance:** selected. Improves
  handoff usability without changing proof/gate boundaries.
- **Option C — require task context for every bundle:** rejected. Task context is not
  proof and should not gate bundle packaging.
- **Option D — add TaskContextReport to the Circe handoff schema:** rejected/deferred.
  Avoid Circe schema coupling; Rekon-side sidecars are sufficient in v1.
- **Option E — let agents execute verification hints from sidecars:** rejected.
  Verification hints are hints, not executed commands.

## Recommendation

Adopt Option B. TaskContextReport sidecars become the recommended context surface for
humans and agents receiving a bundle, promoted in the bundle README, in
`agent/instructions.md`, in `agent/handoff.md` (or equivalent agent-facing docs), and
in external workflow docs. They remain optional, non-proof, non-authoritative for
approval/gates, non-executing, and non-source-writing. The first implementation slice
is **TaskContextReport Bundle Handoff Guidance Implementation**, scoped to: strengthen
the bundle README sidecar guidance if needed; add a task-context pointer to
`agent/instructions.md`; add a task-context pointer to `agent/handoff.md`; optionally
add context refs to `agent/context.json` as metadata; change no Circe schema; change
no gate.

## Broader Handoff Model

1. Operator generates a TaskContextReport before intent planning.
2. TaskContextReport flows through assessment / plan review lineage or an explicit
   bundle ref.
3. Bundle write attaches optional context sidecars.
4. Human operator opens `README.md` and `context/task-context.md`.
5. Agent reads `agent/instructions.md`, `agent/handoff.md`, and
   `context/task-context.agent.json`.
6. Circe import continues using `circe/handoff.json` without requiring
   TaskContextReport internals.
7. WorkOrder / VerificationPlan / phase gates remain authoritative.

| Consumer | Policy |
| --- | --- |
| human operator | read README + context/task-context.md |
| agent | read agent instructions + context/task-context.agent.json |
| Circe | use circe/handoff.json; task context optional only |
| WorkOrder / VerificationPlan | remain authoritative gates |
| bundle manifest | lists optional refs |

| Surface | Future Role |
| --- | --- |
| README.md | point humans to task context |
| agent/instructions.md | tell agents to read task context |
| agent/handoff.md | mention optional task context |
| agent/context.json | may include refs/metadata |
| context/task-context.md | human context sidecar |
| context/task-context.agent.json | agent context sidecar |
| context/task-context.refs.json | traceability refs |
| circe/handoff.json | unchanged machine handoff |

## Human Handoff Policy

Humans receiving a bundle should open `README.md`, inspect the "Task context" section
if present, read `context/task-context.md`, use the context as orientation, treat
verification hints as suggestions, treat do-not-touch zones as guidance, and rely on
WorkOrder / VerificationPlan / Rekon proof artifacts for gates. Humans should inspect
context/task-context.md when it is present in a bundle.

## Agent Handoff Policy

Agents receiving a bundle should read `agent/instructions.md`, read `agent/handoff.md`,
read `context/task-context.agent.json` if present, treat `doNotTouch` as
guidance/constraints, treat `verificationHints` as hints only, not execute
verification hints unless separately instructed, not treat task context as approval,
not treat task context as proof, and not ignore WorkOrder / VerificationPlan / phase
gates. Agents should read context/task-context.agent.json when it is present in a
bundle.

## Circe Boundary

Circe handoff JSON remains the machine handoff contract. TaskContextReport sidecars
are Rekon-side optional context in v1. Circe should not be required to understand
TaskContextReport internals. Circe should not execute verification hints from
TaskContextReport. Circe should not alter phase/proof status because of
TaskContextReport.

## Boundary Model

- TaskContextReport sidecars are optional context, not proof.
- TaskContextReport sidecars must not be required to write an intent bundle.
- Humans should inspect context/task-context.md when it is present in a bundle.
- Agents should read context/task-context.agent.json when it is present in a bundle.
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

| Boundary | Decision |
| --- | --- |
| context vs proof | optional context only |
| context vs approval | no approval |
| context vs command execution | no execution |
| context vs source writes | no writes |
| context vs WorkOrder / VerificationPlan | no gate authority |
| context vs Circe | no schema requirement |
| verification hints | hints only |
| do-not-touch zones | guidance/context |
| intent:go | deferred |

## Decision Questions

1. Should broader handoff workflows promote TaskContextReport sidecars? Yes (Option B).
2. Should sidecar inclusion be recommended or required? Recommended, never required.
3. Should the bundle README point humans to task-context sidecars? Yes (already does).
4. Should `agent/instructions.md` point agents to task-context sidecars? Yes (follow-up).
5. Should `agent/handoff.md` point agents to task-context sidecars? Yes (follow-up).
6. Should `agent/context.json` reference task context? Optionally, as metadata only.
7. Should Circe handoff JSON reference task context? No, not in v1.
8. Should Circe import require TaskContextReport? No.
9. Should agents treat task-context sidecars as proof? No.
10. Should WorkOrder / VerificationPlan gates depend on sidecars? No.
11. Should task-context sidecars be included automatically from lineage? Yes — lineage
    discovery stays as shipped, still optional and de-duplicated.
12. Should explicit `--task-context-ref` remain supported? Yes.
13. Should no-context bundles remain valid? Yes.
14. How should humans inspect sidecars? README "Task context" section →
    `context/task-context.md`.
15. How should agents consume sidecars? `agent/instructions.md` →
    `context/task-context.agent.json`.
16. What should bundle docs say about verification hints? They remain hints, not
    executed commands.
17. What should bundle docs say about do-not-touch zones? They remain guidance/context,
    not enforcement.
18. What implementation slice follows? TaskContextReport Bundle Handoff Guidance
    Implementation.

## What This Does Not Do

This decision implements no broader handoff workflow changes. It does not change
`intent bundle write` behavior, the bundle sidecar format, the Circe handoff schema,
the WorkOrder / VerificationPlan gates, or the phase gates. It does not make
TaskContextReport required, treat it as proof, approve a plan, execute a verification
hint or any target-repo command, write source, create a WorkOrder / VerificationPlan,
or run Circe. intent:go remains deferred.

## Implementation Sequence

1. **TaskContextReport Bundle Handoff Guidance Implementation** (recommended next) —
   promote the optional sidecars in the bundle README, `agent/instructions.md`,
   `agent/handoff.md`, and optionally `agent/context.json` refs/metadata; no Circe
   schema change, no gate change, no proof authority, no command execution, no source
   writes, no intent:go.
2. Alternative: **Intent Bundle Context UX Fix** — only if this decision uncovers a
   narrower discoverability issue that should be fixed first.

> Update (slice 188 · TaskContextReport Bundle Handoff Guidance Implementation): when a `TaskContextReport` is attached to an intent plan bundle, the agent-facing bundle files now promote the optional context sidecars. `agent/instructions.md` and `agent/handoff.md` gain a "## Task context" section (only when a TaskContextReport is attached) pointing at `context/task-context.agent.json` / `context/task-context.md`, framing context as not-proof and keeping WorkOrder / VerificationPlan / phase gates authoritative; `agent/context.json` gains an additive `taskContext` metadata block (`available:true`, `proof:false`, `role: optional-agent-context`) with every existing field preserved. With no task context the agent files are byte-identical. The bundle README section, the `context/` sidecars, and the Circe handoff trio are unchanged. TaskContextReport sidecars are optional context, not proof — humans should inspect context/task-context.md when present; agents should read context/task-context.agent.json when present; verification hints remain hints; do-not-touch stays guidance; Circe handoff JSON remains the machine handoff contract; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Guidance Safety Review. See [`task-context-report-bundle-handoff-guidance-implementation.md`](task-context-report-bundle-handoff-guidance-implementation.md).

> Update (slice 189 · TaskContextReport Bundle Handoff Guidance Safety Review): the slice-188 agent-facing handoff guidance was reviewed end-to-end and declared safe/stable. TaskContextReport sidecars are optional context, not proof; `agent/instructions.md` + `agent/handoff.md` promote the optional task context only when sidecars are present; `agent/context.json` carries additive `taskContext` metadata (`proof:false`, `role: optional-agent-context`) when present and preserves every existing field; without-context bundles are byte-identical. Agents should read `context/task-context.agent.json` when present; humans should inspect `context/task-context.md` when present; verification hints remain hints; do-not-touch stays guidance; WorkOrder / VerificationPlan + phase gates remain authoritative; the Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; sidecars must not approve plans, execute commands, or write source; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Dogfood. See [`task-context-report-bundle-handoff-guidance-safety-review.md`](task-context-report-bundle-handoff-guidance-safety-review.md).

> Update (slice 190 · TaskContextReport Bundle Handoff Dogfood — rebased on 4cc34b73 Circe actor contracts): the promoted handoff guidance was re-dogfooded from both the human-operator and the agent perspective against the current bundle producer after `4cc34b73` ("feat: emit target-specific Circe actor contracts"). A human can discover task context from `README.md`; `context/task-context.md` + `context/task-context.refs.json` were useful; an agent can discover it from `agent/instructions.md` + `agent/handoff.md`; `agent/context.json` `taskContext` metadata + `context/task-context.agent.json` were useful; `agent/verification.json` stayed authoritative for verification posture and `agent/source-refs.json` for source refs. The Circe handoff trio stayed stable and independent of TaskContextReport — `circe/handoff.json` now carries an additive `actorContracts` block. The new `circe/actor-contracts/` artifacts (3 contract Markdown + 3 JSON Schema, default `circe` target) were present and non-executing (return-shape guidance/artifacts, not executed workers) and identical in the without-context bundle. WorkOrder / VerificationPlan + phase gates remained authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle omitted every task-context surface. No fix needed. Next: TaskContextReport Bundle Handoff Dogfood Safety Review. See [`task-context-report-bundle-handoff-dogfood.md`](task-context-report-bundle-handoff-dogfood.md).

# TaskContextReport Bundle Context Dogfood

This memo records a dogfood of the optional `TaskContextReport` bundle-context
sidecars (shipped in slice 183, safety-reviewed in slice 184) on a realistic
operator/agent handoff path. The dogfood ran the full public operator sequence
keyless against the built CLI and inspected the resulting intent plan bundle. The
sidecars are useful and discoverable, every boundary held, and one narrow
human-discoverability gap was found and fixed.

## Dogfood Scenario

A fresh `task-context-bundle-dogfood` fixture (`src/index.ts` with `existing` +
`greet`, `plans/rough.md`) was driven through:
`scan` → `intent context prepare` → `capability graph build` → `context task`
(`--path src/index.ts`) → `intent assess --task-context-ref` →
`intent plan review --task-context-ref` → `intent plan answer` (real question ids)
→ `intent prepare` → `intent status` → `intent approve` (accepting the prepared
plan's own proof-gap reasons) → `intent status transition --to work-ready` →
`intent work-order generate` → `intent verification-plan generate` →
`intent bundle write --task-context-ref` → `artifacts validate` →
`git diff -- src/index.ts plans/rough.md`.

The path completed cleanly: approve → `approved`, transition → `work-ready`,
work-order → `generated`, verification-plan → `generated`, bundle write → `ok`,
validate → clean, and the working tree stayed clean. bundle write succeeded with
--task-context-ref.

## Bundle Result

All sixteen expected bundle files were present:
`manifest.json`, `README.md`, `verification-plan.md`, `work-order.md`,
`agent/{handoff.md,context.json,instructions.md,constraints.md,verification.json,source-refs.json}`,
`circe/{handoff.json,phase-plan.json,rekon-proof.json}`, and
`context/{task-context.md,task-context.agent.json,task-context.refs.json}`.

The bundle JSON reported `taskContext`:
`{ "included": true, "count": 1, "refs": ["TaskContextReport:…"], "sidecars":
["context/task-context.md","context/task-context.agent.json","context/task-context.refs.json"],
"proof": false }`. bundle JSON reported taskContext sidecars.

## Manifest Review

`manifest.context.taskContextReports[0]` was
`{ ref: { type: "TaskContextReport", id: … }, role: "optional-agent-context",
proof: false, sidecars: { markdown: "context/task-context.md", agentJson:
"context/task-context.agent.json" } }`. manifest.context.taskContextReports was
discoverable, marked `proof: false` and `role: optional-agent-context`. The agent /
machine path to the sidecars is therefore the manifest.

## Sidecar Review

- `context/task-context.md` opened with "This context is optional guidance, not
  proof.", then "Read This Before Editing", a "Do Not Touch" list ("Do not change
  greet behavior. (guidance, not enforced)"), a "Verification Hints" list ("(hint,
  not executed)"), and an all-false "Boundaries" list. context/task-context.md was
  useful to a human operator.
- `context/task-context.agent.json` carried the report's `agentContext` (task,
  core/supporting context, do-not-touch `enforced:false`, verification hints
  `executed:false`, evidence, boundaries) with `proof: false` and a top-level
  all-false `boundaries` block. context/task-context.agent.json was useful to an
  agent.
- `context/task-context.refs.json` carried `{ ref, role: "optional-agent-context",
  proof: false }`. context/task-context.refs.json was useful for traceability.

## Discoverability Finding And Fix

The machine path (`manifest.context.taskContextReports`) made the sidecars
discoverable to agents, but the human-facing bundle `README.md` listed only
Canonical truth / Source artifacts / Boundaries — it did not point to the
`context/` sidecars. Under the work order's allowed-fix policy ("if sidecars are
hard to discover: allowed to add a tiny README/manifest visibility fix if narrow
and covered by tests"), the bundle README now renders a "## Task context" section
**only when a TaskContextReport is attached**, listing the report refs and the
three sidecar paths and framing them as "guidance, not proof. It does not approve
the plan, satisfy any gate, execute commands, or write source." With no task
context the README is unchanged. The fix is additive, descriptive only, and covered
by the dogfood contract test.

## Circe Handoff Review

`circe/handoff.json`, `circe/phase-plan.json`, and `circe/rekon-proof.json` were
present and stable; the handoff JSON (with the repo path masked) contained no
task-context reference, and `manifest.circe` was likewise free of it. Circe handoff
JSON remains unchanged / not dependent on task context. Rekon did not run Circe.

## Gate Review

`work-order.md` and `verification-plan.md` were present and unchanged by task
context; the per-phase verification posture was unchanged. WorkOrder /
VerificationPlan gates remain unchanged. phase gates remain unchanged.

## Boundary Review

source and plan files were unchanged. no commands were executed. no VerificationRun
or VerificationResult was created. intent:go remains deferred. Task context stayed
optional context, not proof, and never approved a plan, satisfied a gate, executed,
or wrote source.

## Review Questions

1. Does bundle write succeed with `--task-context-ref`? Yes.
2. Does bundle write still succeed without task context? Yes — `included: false`,
   no `context/` sidecars, no `manifest.context`.
3. Is `manifest.context.taskContextReports` discoverable? Yes.
4. Does it mark `proof:false`? Yes.
5. Does it mark `role: optional-agent-context`? Yes.
6. Is `context/task-context.md` useful to a human operator? Yes.
7. Is `context/task-context.agent.json` useful to an agent? Yes.
8. Is `context/task-context.refs.json` useful for traceability? Yes.
9. Does bundle JSON report `taskContext` sidecars? Yes.
10. Is the bundle README / manifest enough to discover the sidecars? After the
    narrow README fix, yes from both the README and the manifest.
11. Is the Circe handoff JSON unchanged / not dependent on task context? Yes.
12. Are WorkOrder / VerificationPlan gates unchanged? Yes.
13. Are phase gates unchanged? Yes.
14. Are source and plan files unchanged? Yes.
15. Are any commands executed? No.
16. Is any VerificationRun / VerificationResult created? No.
17. Is Circe run by Rekon? No.
18. Does intent:go remain deferred? Yes.
19. Should bundle context be used in broader agent/operator handoffs? Yes — the
    sidecars are useful and discoverable and hold every boundary.
20. What follow-up slice is recommended? TaskContextReport Bundle Context Dogfood
    Safety Review.

## Findings

- bundle write succeeded with --task-context-ref.
- manifest.context.taskContextReports was discoverable.
- context/task-context.md was useful to a human operator.
- context/task-context.agent.json was useful to an agent.
- context/task-context.refs.json was useful for traceability.
- bundle JSON reported taskContext sidecars.
- Circe handoff JSON remains unchanged / not dependent on task context.
- WorkOrder / VerificationPlan gates remain unchanged.
- phase gates remain unchanged.
- source and plan files were unchanged.
- no commands were executed.
- no VerificationRun or VerificationResult was created.
- Rekon did not run Circe.
- intent:go remains deferred.

## Recommendation

Bundle context sidecars are useful and discoverable and ready for broader
agent/operator handoff use. The only change this batch made was a narrow,
additive bundle-README discoverability section guarded behind task-context
presence and covered by tests. Recommended next slice: **TaskContextReport Bundle
Context Dogfood Safety Review** (review the dogfood + the README fix before broader
handoff use). Alternative: **Intent Bundle Context UX Fix**, only if further
discoverability/usability issues surface.

## What This Does Not Do

This dogfood changed no bundle architecture, no Circe handoff schema, no WorkOrder /
VerificationPlan or phase gate, no proof or approval semantics. It executed no
target-repo commands, wrote no source, created no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult from task context, and did not run Circe or
bring intent:go forward.

> Update (slice 186 · TaskContextReport Bundle Context Dogfood Safety Review): the slice-185 dogfood result + the narrow bundle-README discoverability fix were reviewed end-to-end and declared safe/stable. TaskContextReport bundle context is optional context, not proof; the full bundle-context dogfood path completed successfully; `manifest.context.taskContextReports` was discoverable (`proof:false`, `role: optional-agent-context`); the `context/task-context.md` / `.agent.json` / `.refs.json` sidecars were useful to humans, agents, and traceability; the bundle README now points to the sidecars (guidance, not proof) when context is attached and is omitted otherwise; Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. Bundle context is ready for broader handoff use. Next: TaskContextReport Bundle Context Broader Handoff Decision. See [`task-context-report-bundle-context-dogfood-safety-review.md`](task-context-report-bundle-context-dogfood-safety-review.md).

> Update (slice 187 · TaskContextReport Bundle Broader Handoff Decision): decided how broader operator/agent handoff workflows should use the optional bundle-context sidecars (Option B — promote them in human/agent handoff guidance, recommended not required). Humans should inspect `context/task-context.md` when present; agents should read `context/task-context.agent.json` when present; the follow-up will point `agent/instructions.md` + `agent/handoff.md` (and optionally `agent/context.json` metadata) at the sidecars. TaskContextReport sidecars are optional context, not proof — must not be required to write an intent bundle, approve plans, execute commands, write source, or satisfy WorkOrder/VerificationPlan or phase gates; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; intent:go remains deferred. First implementation: TaskContextReport Bundle Handoff Guidance Implementation. See [`task-context-report-bundle-broader-handoff-decision.md`](task-context-report-bundle-broader-handoff-decision.md).

> Update (slice 188 · TaskContextReport Bundle Handoff Guidance Implementation): when a `TaskContextReport` is attached to an intent plan bundle, the agent-facing bundle files now promote the optional context sidecars. `agent/instructions.md` and `agent/handoff.md` gain a "## Task context" section (only when a TaskContextReport is attached) pointing at `context/task-context.agent.json` / `context/task-context.md`, framing context as not-proof and keeping WorkOrder / VerificationPlan / phase gates authoritative; `agent/context.json` gains an additive `taskContext` metadata block (`available:true`, `proof:false`, `role: optional-agent-context`) with every existing field preserved. With no task context the agent files are byte-identical. The bundle README section, the `context/` sidecars, and the Circe handoff trio are unchanged. TaskContextReport sidecars are optional context, not proof — humans should inspect context/task-context.md when present; agents should read context/task-context.agent.json when present; verification hints remain hints; do-not-touch stays guidance; Circe handoff JSON remains the machine handoff contract; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Guidance Safety Review. See [`task-context-report-bundle-handoff-guidance-implementation.md`](task-context-report-bundle-handoff-guidance-implementation.md).

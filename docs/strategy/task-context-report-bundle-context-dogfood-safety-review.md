# TaskContextReport Bundle Context Dogfood Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

This memo reviews the [TaskContextReport Bundle Context
Dogfood](task-context-report-bundle-context-dogfood.md) (slice 185, `83185a3`) and
the narrow bundle-README discoverability fix shipped with it, and declares the
optional bundle-context surface safe and stable after realistic dogfood. It is a
review only: it changes no runtime behavior, no bundle-context implementation, no
bundle-README rendering, no Circe handoff schema, and no gate.

## Decision Summary

TaskContextReport bundle context is optional context, not proof. The full
bundle-context dogfood path completed successfully, the sidecars were useful and
discoverable, and every boundary held. The only change the dogfood made was a
narrow, additive bundle-README "## Task context" section that points humans to the
`context/` sidecars when a report is attached. The dogfood is safe/stable and the
sidecars are ready for broader operator/agent handoff use.

## Why This Review Exists

The dogfood exercised the optional sidecars on a realistic operator/agent handoff
path and found one human-discoverability gap (the bundle README did not point to
the sidecars), which was fixed in slice 185. Because bundle/handoff surfaces sit
close to execution orchestration, this review confirms both the dogfood evidence
and the README fix keep context optional and non-authoritative before any broader
handoff policy builds on them.

## Dogfood Reviewed

The dogfood drove a fresh fixture through the full public operator path keyless
against the built CLI: `scan` → `intent context prepare` → `capability graph build`
→ `context task` → `intent assess --task-context-ref` → `intent plan review
--task-context-ref` → `intent plan answer` → `intent prepare` → `intent status` →
`intent approve` → `intent status transition` → `intent work-order generate` →
`intent verification-plan generate` → `intent bundle write --task-context-ref` →
`artifacts validate`. The full bundle-context dogfood path completed successfully:
approve → approved, transition → work-ready, work-order + verification-plan →
generated, bundle write → ok, validate → clean, working tree clean. bundle JSON
reported taskContext sidecars (`{ included: true, count: 1, refs, sidecars, proof:
false }`).

## Manifest Review

manifest.context.taskContextReports was discoverable. Each entry is
`{ ref: { type, id }, role: "optional-agent-context", proof: false, sidecars:
{ markdown, agentJson } }`. manifest.context.taskContextReports marks proof:false.
manifest.context.taskContextReports marks role optional-agent-context. With no task
context attached the section is omitted and the bundle is byte-identical.

## Sidecar Review

context/task-context.md was useful to a human operator — it opened "This context is
optional guidance, not proof.", then rendered "Read This Before Editing", a "Do Not
Touch" list ("(guidance, not enforced)"), a "Verification Hints" list ("(hint, not
executed)"), and an all-false "Boundaries" list. context/task-context.agent.json was
useful to an agent — it carried the report's `agentContext` (task, core/supporting
context, do-not-touch `enforced:false`, hints `executed:false`, evidence,
boundaries), `proof: false`, and a top-level all-false `boundaries` block.
context/task-context.refs.json was useful for traceability — `{ ref, role:
"optional-agent-context", proof: false }`.

## README Discoverability Review

The bundle README now points to the task-context sidecars when context is attached:
slice 185 added an additive "## Task context" section that lists the report refs and
the three `context/` sidecar paths. The README task-context section is guidance, not
proof — it states it "does not approve the plan, satisfy any gate, execute commands,
or write source." The README task-context section is omitted when no
TaskContextReport is attached, leaving the README byte-identical to the prior
release. The fix is additive and context-only; it reuses the already-computed
sidecar render result and grants no authority.

## Circe Handoff Review

Circe handoff JSON remains unchanged / not dependent on task context. The handoff
trio (`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json`) was
present and stable; the handoff JSON (repo path masked) and `manifest.circe`
carried no task-context reference. Rekon did not run Circe.

## Gate Review

WorkOrder / VerificationPlan gates remain unchanged — `work-order.md` and
`verification-plan.md` were present and unaffected by task context, and never
referenced the sidecars. Phase gates remain unchanged (the per-phase verification
posture was unaffected). Source and plan files were unchanged. No commands were
executed. No VerificationRun or VerificationResult was created.

## Boundary Review

TaskContextReport bundle context is optional context, not proof. Every boundary
held under dogfood and review:

| Boundary | Review Finding |
| --- | --- |
| context vs proof | optional context only |
| context vs approval | no approval |
| context vs WorkOrder / VerificationPlan gates | unchanged |
| context vs phase gates | unchanged |
| command execution | none |
| source writes | none |
| VerificationRun / Result | none |
| Circe | not run by Rekon |
| intent:go | deferred |

| Surface | Dogfood Finding | Safety Finding |
| --- | --- | --- |
| intent bundle write --task-context-ref | succeeded | optional context only |
| manifest.context.taskContextReports | discoverable | proof:false / optional-agent-context |
| context/task-context.md | useful to human operator | guidance, not proof |
| context/task-context.agent.json | useful to agent | all-false boundaries |
| context/task-context.refs.json | useful for traceability | refs / proof:false |
| bundle README | fixed | sidecars discoverable |
| Circe handoff trio | stable | no task-context dependency |

| Finding | Severity | Resolution |
| --- | --- | --- |
| full dogfood path completed | positive | proceed |
| sidecars useful | positive | proceed |
| manifest discoverable | positive | proceed |
| README sidecar discoverability missing | narrow UX issue | fixed in slice 185 |
| without-context bundle unchanged | positive | proceed |

intent:go remains deferred.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare dogfood safe/stable | selected | full path and boundaries held |
| broader handoff decision next | selected | sidecars ready for handoff policy |
| UX fix next | deferred | README issue already fixed |
| make context required | rejected | context is not proof |
| change Circe schema | rejected | v1 sidecars are enough |

## Recommendation

TaskContextReport Bundle Context Dogfood is safe/stable. The next slice is
**TaskContextReport Bundle Context Broader Handoff Decision** — define how broader
operator/agent handoff workflows should use the optional context sidecars (when to
include, how agents read, how humans inspect, relation to Circe import, whether
bundle README / agent instructions should promote them) without turning them into
proof or automation. Fall back to an **Intent Bundle Context UX Fix** only if
further discoverability/usability issues surface.

## Review Questions

1. Is the dogfood safe/stable? Yes.
2. Did the full operator path complete? Yes.
3. Did bundle write succeed with `--task-context-ref`? Yes.
4. Did bundle write still succeed without task context? Yes — `included: false`, no
   sidecars, no `manifest.context`.
5. Was `manifest.context.taskContextReports` discoverable? Yes.
6. Did manifest context mark `proof:false`? Yes.
7. Did manifest context mark `role: optional-agent-context`? Yes.
8. Was `context/task-context.md` useful to a human operator? Yes.
9. Was `context/task-context.agent.json` useful to an agent? Yes.
10. Was `context/task-context.refs.json` useful for traceability? Yes.
11. Did bundle JSON report `taskContext` sidecars? Yes.
12. Did the bundle README expose the sidecars after the fix? Yes.
13. Is the README fix additive and context-only? Yes.
14. Did Circe handoff JSON remain unchanged / not dependent on task context? Yes.
15. Did WorkOrder / VerificationPlan gates remain unchanged? Yes.
16. Did phase gates remain unchanged? Yes.
17. Were source and plan files unchanged? Yes.
18. Were any commands executed? No.
19. Was any VerificationRun or VerificationResult created? No.
20. Did Rekon run Circe? No.
21. Does intent:go remain deferred? Yes.
22. Is bundle context ready for broader handoff use? Yes.
23. What slice follows? TaskContextReport Bundle Context Broader Handoff Decision.

## What This Does Not Do

This review changes no runtime behavior, no bundle-context implementation, no
bundle-README rendering, no Circe handoff schema, and no gate. It does not make
TaskContextReport required, treat it as proof, approve a plan, satisfy a WorkOrder /
VerificationPlan / phase gate, execute a verification hint or any target-repo
command, write source, create a WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, or run Circe. intent:go remains deferred.

## Follow-Up Work

- **TaskContextReport Bundle Context Broader Handoff Decision** (recommended next) —
  define broader handoff usage of the optional sidecars without granting authority.
- **Intent Bundle Context UX Fix** (alternative) — only if further
  discoverability/usability issues surface.

> Update (slice 187 · TaskContextReport Bundle Broader Handoff Decision): decided how broader operator/agent handoff workflows should use the optional bundle-context sidecars (Option B — promote them in human/agent handoff guidance, recommended not required). Humans should inspect `context/task-context.md` when present; agents should read `context/task-context.agent.json` when present; the follow-up will point `agent/instructions.md` + `agent/handoff.md` (and optionally `agent/context.json` metadata) at the sidecars. TaskContextReport sidecars are optional context, not proof — must not be required to write an intent bundle, approve plans, execute commands, write source, or satisfy WorkOrder/VerificationPlan or phase gates; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; intent:go remains deferred. First implementation: TaskContextReport Bundle Handoff Guidance Implementation. See [`task-context-report-bundle-broader-handoff-decision.md`](task-context-report-bundle-broader-handoff-decision.md).

> Update (slice 188 · TaskContextReport Bundle Handoff Guidance Implementation): when a `TaskContextReport` is attached to an intent plan bundle, the agent-facing bundle files now promote the optional context sidecars. `agent/instructions.md` and `agent/handoff.md` gain a "## Task context" section (only when a TaskContextReport is attached) pointing at `context/task-context.agent.json` / `context/task-context.md`, framing context as not-proof and keeping WorkOrder / VerificationPlan / phase gates authoritative; `agent/context.json` gains an additive `taskContext` metadata block (`available:true`, `proof:false`, `role: optional-agent-context`) with every existing field preserved. With no task context the agent files are byte-identical. The bundle README section, the `context/` sidecars, and the Circe handoff trio are unchanged. TaskContextReport sidecars are optional context, not proof — humans should inspect context/task-context.md when present; agents should read context/task-context.agent.json when present; verification hints remain hints; do-not-touch stays guidance; Circe handoff JSON remains the machine handoff contract; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Guidance Safety Review. See [`task-context-report-bundle-handoff-guidance-implementation.md`](task-context-report-bundle-handoff-guidance-implementation.md).

> Update (slice 189 · TaskContextReport Bundle Handoff Guidance Safety Review): the slice-188 agent-facing handoff guidance was reviewed end-to-end and declared safe/stable. TaskContextReport sidecars are optional context, not proof; `agent/instructions.md` + `agent/handoff.md` promote the optional task context only when sidecars are present; `agent/context.json` carries additive `taskContext` metadata (`proof:false`, `role: optional-agent-context`) when present and preserves every existing field; without-context bundles are byte-identical. Agents should read `context/task-context.agent.json` when present; humans should inspect `context/task-context.md` when present; verification hints remain hints; do-not-touch stays guidance; WorkOrder / VerificationPlan + phase gates remain authoritative; the Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; sidecars must not approve plans, execute commands, or write source; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Dogfood. See [`task-context-report-bundle-handoff-guidance-safety-review.md`](task-context-report-bundle-handoff-guidance-safety-review.md).

> Update (slice 190 · TaskContextReport Bundle Handoff Dogfood — rebased on 4cc34b73 Circe actor contracts): the promoted handoff guidance was re-dogfooded from both the human-operator and the agent perspective against the current bundle producer after `4cc34b73` ("feat: emit target-specific Circe actor contracts"). A human can discover task context from `README.md`; `context/task-context.md` + `context/task-context.refs.json` were useful; an agent can discover it from `agent/instructions.md` + `agent/handoff.md`; `agent/context.json` `taskContext` metadata + `context/task-context.agent.json` were useful; `agent/verification.json` stayed authoritative for verification posture and `agent/source-refs.json` for source refs. The Circe handoff trio stayed stable and independent of TaskContextReport — `circe/handoff.json` now carries an additive `actorContracts` block. The new `circe/actor-contracts/` artifacts (3 contract Markdown + 3 JSON Schema, default `circe` target) were present and non-executing (return-shape guidance/artifacts, not executed workers) and identical in the without-context bundle. WorkOrder / VerificationPlan + phase gates remained authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle omitted every task-context surface. No fix needed. Next: TaskContextReport Bundle Handoff Dogfood Safety Review. See [`task-context-report-bundle-handoff-dogfood.md`](task-context-report-bundle-handoff-dogfood.md).

> Update (slice 191 · TaskContextReport Bundle Handoff Dogfood Safety Review): the shipped slice-190 handoff dogfood (`c5acc07`) — including the `circe/actor-contracts` surface and the new Circe Operator Command Boundary added in `11a209fd` — was reviewed end-to-end and declared **safe/stable** before broader handoff workflow use. Strategy/safety-review batch; no runtime/API/CLI/agent-file-rendering/actor-contract-generation/operator-boundary-generation/Circe-schema/gate change. TaskContextReport sidecars are optional context, not proof; the full handoff dogfood path completed successfully; the human + agent task-context surfaces stay discoverable and non-authoritative; `agent/verification.json` + `agent/source-refs.json` stay authoritative; the Circe handoff JSON stays stable and independent of TaskContextReport; Circe actor-contract artifacts were present and non-executing (guidance/artifacts, not executed workers); the new Operator Command Boundary is operator-only inspection guidance, not worker execution guidance — it reinforces that Rekon does not run Circe and treats worker requests to run Circe operator commands as plan-quality concerns; WorkOrder / VerificationPlan + phase gates remain authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle stayed clean. Next: TaskContextReport Bundle Handoff Broader Workflow Decision (alternative: Handoff UX Fix). See [`task-context-report-bundle-handoff-dogfood-safety-review.md`](task-context-report-bundle-handoff-dogfood-safety-review.md).

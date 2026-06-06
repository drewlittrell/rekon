# TaskContextReport Workflow Guide Safety Review

> **Slice 181 · strategy / safety-review batch.** Base `7145945`. Reviews the
> slice-180 TaskContextReport workflow guide and agent instructions end-to-end and
> declares the docs/product surface safe/stable, before any workflow automation,
> bundle-context integration, or broader operator/agent workflow use. Docs-only —
> no runtime behavior change, no source change, no new artifact, no CLI command, no
> CLI smoke.

## Decision Summary

The slice-180 workflow guide is **safe/stable**. `docs/guides/task-context-workflow.md`
and `docs/guides/agent-context-instructions.md` teach the context-first workflow
(context first, plan second, approval third, handoff fourth) as **guidance, not
automation**. They instruct humans to read the markdown brief before editing and
agents to consume `agentContext` before editing, and they preserve every boundary:
context not proof, hints not executed, do-not-touch as guidance, explicit
consumption, separately gated prepare/approve/status/handoff, optional bundle
inclusion as context only, and intent:go deferred. The workflow guide introduces no
runtime behavior changes. The recommendation is to declare the guide safe/stable and
proceed to the **TaskContextReport Bundle Context Decision**.

## Why This Review Exists

Slice 180 turned a workflow *policy* into a product *surface* — the first
documentation an operator or agent reads to learn how to use context. A guide that
quietly told an agent to execute a hint, write source from context alone, or treat
context as approval would convert a safe substrate into an unsafe habit. This
review reads the shipped guides and confirms they teach the workflow without
crossing any boundary, and that every command they document still exists in the
CLI.

## Documentation Reviewed

- `docs/guides/task-context-workflow.md` — human-facing workflow guide (9 sections
  + workflow / human-agent / boundary tables).
- `docs/guides/agent-context-instructions.md` — agent-facing instruction set (11
  sections).
- `docs/strategy/task-context-workflow-guide-agent-instructions.md` — the slice-180
  implementation note, and its review packet.
- The slice-179 workflow integration decision, the export memo + its safety review,
  and the task-context v1 / artifact / concept docs.
- Light source review (`packages/cli/src/index.ts` + the task-context contract
  tests) confirmed every documented command still exists: `rekon context task`,
  `rekon artifacts latest --type <ArtifactType> [--id-only] [--allow-missing]`, and
  `rekon intent assess` / `rekon intent plan review --task-context-ref`. No runtime
  or help-text change was made or needed.

## Human Guide Review

Humans should read the TaskContextReport markdown before editing. The guide directs
readers to Core Context, Related / Supporting Context, Do Not Touch, Verification
Hints, Warnings, and Evidence, and frames do-not-touch zones as strong guidance,
verification hints as suggested checks (not executed proof), warnings as
context-quality notes, and evidence refs as traceability. Nothing in the human
guide instructs a reader to treat context as approval or to skip the existing
approval/handoff gates.

## Agent Instructions Review

Agents should consume agentContext before editing. The instructions tell agents to
prefer `coreContext` exact paths/symbols, treat `supportingContext` as lower
priority, obey `doNotTouch` unless the operator explicitly overrides it, and treat
`verificationHints` as suggestions only. The "What Agents Must Not Do" section is
explicit: must not treat the report as approval; must not write source files based
on the report alone; must not execute verification hints (or any target-repo
command) unless a separate operator/workflow command explicitly asks; must not
create a WorkOrder or VerificationPlan from context; must not run Circe or bring
intent:go forward. No instruction tells an agent to execute commands or write source
from context alone.

## Workflow Model Review

The documented workflow is context first, plan second, approval third, handoff
fourth. Each step is presented as guidance: build evidence, build context, human
reads markdown, agent reads `agentContext`, optionally pass the report to
`intent assess` / `intent plan review` via the existing explicit `--task-context`
flags, and keep prepare / approve / status / handoff separate. The guide does not
auto-generate context, does not gate any command on context, and does not add
bundle/handoff inclusion.

## Boundary Review

The review confirms every boundary holds in the documentation:

- TaskContextReport is the standard pre-work context substrate, not a proof artifact.
- Context-first means context before planning or editing, not context as approval.
- Humans should read the TaskContextReport markdown before editing.
- Agents should consume agentContext before editing.
- TaskContextReport must not approve plans.
- TaskContextReport must not execute commands.
- TaskContextReport must not write source files.
- TaskContextReport must not create WorkOrder or VerificationPlan.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- TaskContextReport consumption remains explicit unless a future decision changes it.
- Prepare / approve / status / handoff remain separately gated.
- TaskContextReport may be included in bundles only as optional context, not proof.
- intent:go remains deferred.
- The workflow guide introduces no runtime behavior changes.

| Surface | Status | Safety Finding |
| --- | --- | --- |
| task context workflow guide | shipped | docs/product surface only |
| agent context instructions | shipped | guidance for agents |
| implementation note | shipped | no runtime behavior |
| README pointer | shipped | context-first workflow visible |
| human markdown guidance | shipped | read before editing |
| agentContext guidance | shipped | consume before editing |

| Step | Review Finding |
| --- | --- |
| build evidence | guidance only |
| build context | explicit command |
| human read | markdown orientation |
| agent read | structured agentContext |
| intent assess / plan review | explicit context ref |
| prepare / approve / status / handoff | separately gated |

| Boundary | Decision |
| --- | --- |
| context vs proof | context only |
| context vs approval | no approval |
| context vs command execution | no execution |
| context vs source writes | no writes |
| context vs WorkOrder / VerificationPlan | not created |
| verification hints | hints only |
| do-not-touch zones | guidance/context |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare guide safe/stable | selected | documentation boundary holds |
| bundle context decision next | selected | next context/handoff question |
| guide quality fix next | deferred | only if review finds issue |
| workflow automation next | rejected/deferred | needs separate decision |
| automatic context generation | rejected | explicit context remains safer |

The review found no guide-clarity or agent-instruction defect, so the quality fix
is not needed; workflow automation and automatic context generation stay rejected
/ deferred.

## Recommendation

Declare **TaskContextReport Workflow Guide / Agent Instructions safe/stable.**
Recommended next slice: **TaskContextReport Bundle Context Decision** — decide
whether optional `TaskContextReport` refs should appear in intent bundles /
handoffs as context for agents and operators, while remaining non-proof.
Alternative: **TaskContextReport Workflow Guide Quality Fix**, only if a concrete
guide or agent-instruction issue is found (none was).

### Review questions

1. Guide safe/stable? Yes. 2. Docs/product-surface only? Yes. 3. Preserves
context-first without making context approval? Yes. 4. Instructs humans to read
markdown before editing? Yes. 5. Instructs agents to consume `agentContext` before
editing? Yes. 6. Keeps TaskContextReport context, not proof? Yes. 7. Hints stay
hints, not executed? Yes. 8. Do-not-touch stays guidance/context, not enforcement?
Yes. 9. Consumption stays explicit? Yes. 10. Prepare / approve / status / handoff
separately gated? Yes. 11. Bundle inclusion described as context only, not proof?
Yes. 12. Avoids telling agents to execute commands? Yes. 13. Avoids telling agents
to write source from context alone? Yes. 14. Avoids WorkOrder / VerificationPlan
semantics? Yes. 15. intent:go deferred? Yes. 16. Next slice? TaskContextReport
Bundle Context Decision.

## What This Does Not Do

This review changes no runtime behavior, adds no workflow automation, no automatic
context generation, and no bundle changes. It edits the guides only with additive
safety-review pointers. It executes no command, writes no source, creates no
WorkOrder or VerificationPlan, runs no Circe, and does not bring intent:go forward.

## Follow-Up Work

- **TaskContextReport Bundle Context Decision** (recommended next): how optional
  `TaskContextReport` refs appear in intent bundles / handoffs as optional context
  with no proof / approval / execution / source-write authority and no intent:go.
- **TaskContextReport Workflow Guide Quality Fix** — only if a concrete
  guide/agent-instruction issue surfaces (none did).

> Update (slice 182 · TaskContextReport Bundle Context Decision): intent bundles may carry optional `TaskContextReport` refs as context for agents/operators (Option B + E) — an additive `manifest.context.taskContextReports[]` section plus Rekon-side `context/` sidecars, with the Circe handoff schema unchanged in v1. Inclusion is optional, never required; context stays context, not proof — it must not approve plans, satisfy WorkOrder/VerificationPlan gates, change phase gates, execute commands, write source, or run Circe; hints stay hints; do-not-touch stays guidance; Circe is not required to know TaskContextReport internals in v1; intent:go deferred. First implementation: TaskContextReport Bundle Context Implementation. See [`task-context-report-bundle-context-decision.md`](task-context-report-bundle-context-decision.md).

> Update (slice 183 · TaskContextReport Bundle Context Implementation): `rekon intent bundle write` now attaches optional `TaskContextReport` refs via a repeatable `--task-context-ref` (plus bounded lineage discovery from prepared-plan / assessment `inputRefs`) as an additive `manifest.context.taskContextReports[]` section (`role: optional-agent-context`, `proof: false`) plus three Rekon-side `context/` sidecars (`task-context.md` / `task-context.agent.json` / `task-context.refs.json`). With no ref the bundle is byte-identical; a missing / wrong-type ref fails cleanly. The Circe handoff projection (`circe/handoff.json` etc.) and the WorkOrder / VerificationPlan / phase-gate files are unchanged and never carry task context. TaskContextReport may be included in bundles only as optional context, not proof — it must not be required to write an intent bundle, approve plans, satisfy WorkOrder/VerificationPlan or phase gates, execute commands, write source, or run Circe; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON is unchanged in v1; intent:go remains deferred. Implements the slice-182 decision (Option B + E). See [`task-context-report-bundle-context-implementation.md`](task-context-report-bundle-context-implementation.md).

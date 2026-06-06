# Agent Context Instructions

How an agent should consume a `TaskContextReport` before doing work. This is the
agent-facing half of the [Task Context Workflow](task-context-workflow.md).

## Purpose

`rekon context task --json` emits an additive `agentContext` block — the structured
source of truth for an agent about to edit. It gives you the task, the context
partitioned into core and supporting, the do-not-touch zones, the verification
hints, warnings, evidence refs, and an all-false boundaries block. Use it to orient
precisely; never to act on authority it does not carry.

## Before Editing

Agents should consume agentContext before editing. Read the whole block first, then
plan against it:

1. Read `task` (text, paths, goal) to confirm scope.
2. Read `coreContext` for the exact paths and symbols to work in.
3. Read `doNotTouch` and respect it.
4. Read `verificationHints` for suggested checks.
5. Read `warnings` for context-quality caveats.
6. Only then propose or make edits.

## How To Use agentContext

Prefer the exact paths and symbols in `coreContext`. Treat `supportingContext` as
useful but lower priority. Obey `doNotTouch` guidance unless the operator
explicitly overrides it. Treat `verificationHints` as suggestions only. Never treat
the `boundaries` block (all false) as permission to write, approve, or execute —
it documents limits, not capabilities.

## Core Context

`coreContext` holds operator input and deterministic graph facts — the highest-
trust context. Each entry carries `ref`, `kind`, `source`, `reason`, and
`evidenceRefs` (plus optional `path` / `symbolId` / `capabilityId` / `score` /
`scoreBand`). These are the paths and symbols you should prefer when editing.

## Supporting Context

`supportingContext` holds embedding-retrieval and semantic-understanding neighbors
— proposal-grade support, not proof. Use it to widen your understanding, but rank
it below `coreContext`. Deterministic graph facts outrank embedding similarity.

## Do Not Touch

`doNotTouch` zones carry `enforced: false`. They are strong guidance derived from
explicit task constraints ("do not change X"), not gates. Obey them unless the
operator explicitly overrides them. Do-not-touch zones remain guidance/context, not
enforcement.

## Verification Hints

`verificationHints` carry `executed: false`. They are suggested checks (e.g.
`npm run typecheck`, `npm test`) extracted from the task text. Verification hints
remain hints, not executed commands. Agents must not execute commands unless a
separate operator/workflow command explicitly asks them to.

## Warnings

`warnings` describe context-quality conditions (retrieval unavailable, low-signal
embeddings, graph + lexical fallback used). Read them before trusting the context
depth; weak context means lean harder on `coreContext` and explicit paths.

## Boundaries

- TaskContextReport is the standard pre-work context substrate, not a proof artifact.
- Agents should consume agentContext before editing.
- TaskContextReport must not approve plans.
- TaskContextReport must not execute commands.
- TaskContextReport must not write source files.
- TaskContextReport must not create WorkOrder or VerificationPlan.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- Prepare / approve / status / handoff remain separately gated.
- intent:go remains deferred.

## What Agents Must Not Do

- Must not treat TaskContextReport as approval.
- Must not write source files based on TaskContextReport alone.
- Must not execute verification hints (or any target-repo command) unless a
  separate operator/workflow command explicitly asks for it.
- Must not create a WorkOrder or VerificationPlan from context.
- Must not run Circe or bring intent:go forward.

> Update (slice 181 · TaskContextReport Workflow Guide Safety Review): the slice-180 workflow guide + agent instructions were reviewed end-to-end and declared safe/stable — docs/product surface only, guidance not automation. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; every documented command was confirmed against the live CLI. TaskContextReport stays context, not proof — no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; bundle inclusion optional context only; intent:go deferred; the workflow guide introduces no runtime behavior changes. See [`task-context-workflow-guide-safety-review.md`](../strategy/task-context-workflow-guide-safety-review.md).

> Update (slice 182 · TaskContextReport Bundle Context Decision): intent bundles may carry optional `TaskContextReport` refs as context for agents/operators (Option B + E) — an additive `manifest.context.taskContextReports[]` section plus Rekon-side `context/` sidecars, with the Circe handoff schema unchanged in v1. Inclusion is optional, never required; context stays context, not proof — it must not approve plans, satisfy WorkOrder/VerificationPlan gates, change phase gates, execute commands, write source, or run Circe; hints stay hints; do-not-touch stays guidance; Circe is not required to know TaskContextReport internals in v1; intent:go deferred. First implementation: TaskContextReport Bundle Context Implementation. See [`task-context-report-bundle-context-decision.md`](../strategy/task-context-report-bundle-context-decision.md).

> Update (slice 183 · TaskContextReport Bundle Context Implementation): `rekon intent bundle write` now attaches optional `TaskContextReport` refs via a repeatable `--task-context-ref` (plus bounded lineage discovery from prepared-plan / assessment `inputRefs`) as an additive `manifest.context.taskContextReports[]` section (`role: optional-agent-context`, `proof: false`) plus three Rekon-side `context/` sidecars (`task-context.md` / `task-context.agent.json` / `task-context.refs.json`). With no ref the bundle is byte-identical; a missing / wrong-type ref fails cleanly. The Circe handoff projection (`circe/handoff.json` etc.) and the WorkOrder / VerificationPlan / phase-gate files are unchanged and never carry task context. TaskContextReport may be included in bundles only as optional context, not proof — it must not be required to write an intent bundle, approve plans, satisfy WorkOrder/VerificationPlan or phase gates, execute commands, write source, or run Circe; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON is unchanged in v1; intent:go remains deferred. Implements the slice-182 decision (Option B + E). See [`task-context-report-bundle-context-implementation.md`](../strategy/task-context-report-bundle-context-implementation.md).

> Update (slice 184 · TaskContextReport Bundle Context Safety Review): the slice-183 bundle-context implementation was reviewed end-to-end and declared safe/stable — optional `TaskContextReport` context in intent bundles holds every boundary. TaskContextReport may be included in bundles only as optional context, not proof, and is not required to write an intent bundle: a bundle with no ref is byte-identical; a bundle with a ref adds only `manifest.context.taskContextReports[]` (`proof: false`, `role: optional-agent-context`) and the `context/` sidecars (`task-context.md` optional guidance not proof, `task-context.agent.json` all-false boundaries, `task-context.refs.json` refs + `proof:false`). The Circe handoff JSON is unchanged in v1; WorkOrder / VerificationPlan / phase gates unchanged; missing + wrong-type refs fail cleanly; lineage discovery stays bounded and optional. No approval / command execution / source write / WorkOrder / VerificationPlan / Circe; verification hints stay hints; do-not-touch stays guidance; intent:go remains deferred. Recommended next: TaskContextReport Bundle Context Dogfood. See [`task-context-report-bundle-context-safety-review.md`](../strategy/task-context-report-bundle-context-safety-review.md).

> Update (slice 185 · TaskContextReport Bundle Context Dogfood): the optional bundle-context sidecars were dogfooded on a realistic operator/agent handoff path (full intent path → `intent bundle write --task-context-ref` → validate). bundle write succeeded; `manifest.context.taskContextReports` (`proof:false`, `role: optional-agent-context`) was discoverable; the `context/task-context.md` human brief, `context/task-context.agent.json` agent view, and `context/task-context.refs.json` traceability index were all useful; bundle JSON reported the `taskContext` sidecars; the Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. One narrow human-discoverability gap was fixed: the bundle `README.md` now renders an additive "## Task context" section (guidance, not proof) only when a TaskContextReport is attached. Sidecars are ready for broader handoff use. Next: TaskContextReport Bundle Context Dogfood Safety Review. See [`task-context-report-bundle-context-dogfood.md`](../strategy/task-context-report-bundle-context-dogfood.md).

> Update (slice 186 · TaskContextReport Bundle Context Dogfood Safety Review): the slice-185 dogfood result + the narrow bundle-README discoverability fix were reviewed end-to-end and declared safe/stable. TaskContextReport bundle context is optional context, not proof; the full bundle-context dogfood path completed successfully; `manifest.context.taskContextReports` was discoverable (`proof:false`, `role: optional-agent-context`); the `context/task-context.md` / `.agent.json` / `.refs.json` sidecars were useful to humans, agents, and traceability; the bundle README now points to the sidecars (guidance, not proof) when context is attached and is omitted otherwise; Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. Bundle context is ready for broader handoff use. Next: TaskContextReport Bundle Context Broader Handoff Decision. See [`task-context-report-bundle-context-dogfood-safety-review.md`](../strategy/task-context-report-bundle-context-dogfood-safety-review.md).

> Update (slice 187 · TaskContextReport Bundle Broader Handoff Decision): decided how broader operator/agent handoff workflows should use the optional bundle-context sidecars (Option B — promote them in human/agent handoff guidance, recommended not required). Humans should inspect `context/task-context.md` when present; agents should read `context/task-context.agent.json` when present; the follow-up will point `agent/instructions.md` + `agent/handoff.md` (and optionally `agent/context.json` metadata) at the sidecars. TaskContextReport sidecars are optional context, not proof — must not be required to write an intent bundle, approve plans, execute commands, write source, or satisfy WorkOrder/VerificationPlan or phase gates; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; intent:go remains deferred. First implementation: TaskContextReport Bundle Handoff Guidance Implementation. See [`task-context-report-bundle-broader-handoff-decision.md`](../strategy/task-context-report-bundle-broader-handoff-decision.md).

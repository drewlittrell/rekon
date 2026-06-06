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

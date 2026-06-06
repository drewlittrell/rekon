# TaskContextReport Workflow Guide / Agent Instructions

> **Slice 180 · product documentation / workflow-surface batch.** Base `3bb6375`.
> Implements the docs/product-surface step selected by the slice-179
> [TaskContextReport Workflow Integration
> Decision](task-context-report-workflow-integration-decision.md) (Option B —
> context-first workflow policy). Docs only — no runtime behavior change, no source
> change, no new artifact, no CLI command, no CLI smoke.

## Summary

Slice 179 decided that `TaskContextReport` is the standard pre-work context
substrate and that the standard workflow is **context first, plan second, approval
third, handoff fourth**. The artifact, `rekon context task`, the human "Read this
before editing." markdown, and the `agentContext` JSON already exist. This batch
turns that policy into a usable product surface: a human-facing workflow guide and
an agent-facing instruction set, plus this implementation note. It teaches *when*
to build context and *how* each reader uses it, without adding any automation.

## Source Review

Reviewed lightly to confirm no runtime work is needed: `packages/cli/src/index.ts`
(the `context task` branch, the `intent assess` / `intent plan review` usage lines
with `--task-context` / `--task-context-ref`, and `rekon artifacts latest --type
<ArtifactType> [--id-only] [--allow-missing]`), `packages/capability-model/src/
task-context-report.ts` + `task-context.ts` (builder + shapes), and the
task-context contract tests. All commands the guide documents already exist; the
canonical command sequence (`scan` → `capability graph build` → `context task` →
`artifacts latest --type TaskContextReport --id-only` → `intent assess` /
`intent plan review --task-context-ref`) is valid as written. No help text needed
to change.

## What Shipped

- `docs/guides/task-context-workflow.md` — the human-facing context-first workflow
  guide (what it is, the workflow, the canonical command sequence, human reading
  guide, agent consumption guide, intent integration, optional evidence
  enrichment, boundaries; workflow / human-agent / boundary tables).
- `docs/guides/agent-context-instructions.md` — the agent-facing instruction set
  (before editing, how to use `agentContext`, core / supporting context,
  do-not-touch, verification hints, warnings, boundaries, what agents must not do).
- This implementation note + a review packet + a 22-assertion docs test.

## Human Guide

Humans should read the TaskContextReport markdown before editing. The guide directs
them to read Core Context, Related / Supporting Context, Do Not Touch, Verification
Hints, Warnings, and Evidence, and to treat do-not-touch zones as strong guidance,
verification hints as suggested checks (not executed proof), warnings as
context-quality notes, and evidence refs as traceability.

## Agent Instructions

Agents should consume agentContext before editing. The instructions direct agents
to prefer the exact paths and symbols in `coreContext`, treat `supportingContext`
as useful but lower priority, obey `doNotTouch` guidance unless the operator
explicitly overrides it, treat `verificationHints` as suggestions only, never
execute commands unless a separate operator/workflow command explicitly asks,
never treat the report as approval, and never write source files based on the
report alone.

## Boundary Model

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

## What This Does Not Do

No runtime behavior change, no automatic context generation, no bundle/handoff
changes, no command execution, no source writes, no WorkOrder / VerificationPlan,
no Circe, no intent:go. The guides document the existing surface; they add no new
capability.

## Follow-Up Work

Recommended next: **TaskContextReport Workflow Guide Safety Review** — review the
human/agent workflow documentation before any workflow automation or
bundle-context implementation. Alternative: **TaskContextReport Bundle Context
Decision** — decide how optional `TaskContextReport` refs appear in intent bundles
/ handoffs.

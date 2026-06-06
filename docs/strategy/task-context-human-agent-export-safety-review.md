# TaskContextReport Human/Agent Export Safety Review

> **Slice 178 · strategy / safety-review batch.** Base `b0e80b9`. Reviews the
> slice-177 TaskContextReport human/agent context export end-to-end and declares
> it safe/stable. Docs-only — no runtime behavior change, no source change, no new
> artifact, no CLI command, no CLI smoke. Confirms the improved `rekon context
> task` presentation layer preserves every proof / approval / execution /
> source-write boundary.

> **Base note:** `b0e80b9` ("fix: harden source scan traversal") landed after
> slice 177 and before this safety review. It is out of scope for this review
> because it touches source scan traversal in `capability-js-ts`, not the
> TaskContextReport human/agent export presentation layer. The slice-177 export
> subject is intact at `b0e80b9` (verified: the `context task` human renderer,
> the `agentContext` block, and all four slice-177 deliverables are present and
> unchanged at this tip).

## Decision Summary

The slice-177 export is **safe/stable**. `rekon context task` now presents the
existing `TaskContextReport` two ways — a human "read this before editing"
markdown brief and an additive `agentContext` block on the `--json` payload — and
both are pure projections of the same report. The review found no boundary
crossing: no approval, no command execution, no source write, no WorkOrder /
VerificationPlan / Circe, and intent:go remains deferred.

The TaskContextReport artifact is canonical. Human markdown is a rendered view.
Agent JSON is the structured source of truth. agentContext is additive and
preserves existing top-level JSON fields. The recommendation is to declare the
export safe/stable and proceed to the **TaskContextReport Workflow Integration
Decision**.

## Why This Review Exists

Slice 177 changed how a reviewed, dogfooded, intent-integrated artifact is
*presented*. Presentation changes are low-risk by intent but high-leverage in
practice: a human brief or an agent block that quietly implied authority,
executed a hint, or dropped a boundary would undermine the whole "context, not
proof" guarantee. This review re-reads the shipped presentation code at the
current tip and confirms the guarantee holds verbatim.

## Implementation Reviewed

Reviewed at `b0e80b9`:

- `packages/cli/src/index.ts` — the `rekon context task` branch: the shared
  presentation block (core/supporting partition, deduped+sorted evidence,
  `agentContext` object), the `--json` success payload, the human renderer, and
  the `usage()` line.
- `packages/capability-model/src/task-context-report.ts` and `task-context.ts` —
  the `buildTaskContextReport` builder and the report shape the presentation
  reads.
- `packages/kernel-repo-model/src/index.ts` — the canonical `TaskContextReport`
  type and the factory `createTaskContextReport`, which forces every `boundaries`
  field false and is rejected by the validator if any is non-false.
- Tests: `tests/contract/task-context-human-agent-export.test.mjs` (26),
  `task-context-report.test.mjs`, `task-context-report-dogfood.test.mjs`,
  `task-context-report-selection-quality.test.mjs`,
  `task-context-intent-dogfood.test.mjs`.

The presentation layer reads `report.*` only. It performs no filesystem writes
beyond the report artifact that `context task` already persisted, runs no child
process, and makes no network call.

## Human Markdown Review

The human brief is a rendered view. The human view says "Read this before
editing." It opens with `# Task Context`, then a
blockquote leading with **"Read this before editing."**, then `Task:` (plus
optional `Goal:` / `Paths:`). It always renders `## Core Context` (operator input
+ deterministic graph), `## Related / Supporting Context` (embedding + semantic,
proposal-grade), `## Do Not Touch` (each zone tagged "(guidance, not enforced)"),
`## Verification Hints` (each tagged "(hint, not executed)"), and `## Evidence`
(deduped, sorted refs) — each with an explicit `(none)` fallback. `## Warnings`
renders only when present. The footer restates the proposal-not-proof boundary
and points to `--json`. No section asserts authority; the do-not-touch and
verification-hint tags make the non-enforcement / non-execution explicit in the
text itself.

## Agent JSON Review

agentContext is additive and preserves existing top-level JSON fields: the
`--json` payload still emits `command, status, provider, providerExplicit, model,
retrieval, artifact, task, selection, summary, contextItems, graphNeighborhood,
doNotTouch, verificationHints, warnings, boundaries, note` unchanged, and adds
`agentContext` before `note`. The block contains `readBeforeEditing`, `task`
(`report.task`), `coreContext` / `supportingContext` (the same items partitioned
by source), `doNotTouch` (each zone with `enforced:false`), `verificationHints`
(each hint with `executed:false`), `warnings`, `evidence` (deduped + sorted
refs), and `boundaries` (`report.boundaries`). The `enforced` and `executed`
flags are pinned constants; the boundaries object is the factory-forced all-false
block. agentContext is structured context for an agent to read, not authority for
an agent to act on.

## Evidence Review

Evidence refs are preserved. Both the human `## Evidence` section and the agent
`evidence` array are built from the union of every context item's, do-not-touch
zone's, and verification hint's `evidenceRefs`, deduped and sorted. The
underlying per-item `evidenceRefs` also remain intact in the existing
`contextItems` / `doNotTouch` / `verificationHints` JSON. Presentation neither
drops nor invents an evidence ref. Contract assertion 20 locks in that the
`evidence` array is non-empty, all strings, unique, and sorted.

## Boundary Review

agentContext includes all-false boundaries — `retrievalIsProof`, `approvedPlans`,
`executedCommands`, `wroteSourceFiles`, `createdPreparedIntentPlan`,
`createdWorkOrder`, `createdVerificationPlan`, `ranCirce`, `implementedIntentGo`,
each false — copied verbatim from `report.boundaries`, which the factory forces
and the validator guards. Verification hints remain hints, not executed commands,
and `agentContext` verification hints carry `executed:false`. Do-not-touch zones
remain guidance/context, not enforcement, and `agentContext` do-not-touch zones
carry `enforced:false`. The review confirms: TaskContextReport must not approve
plans; TaskContextReport must not execute commands; TaskContextReport must not
write source files; TaskContextReport must not create WorkOrder or
VerificationPlan; TaskContextReport must not run Circe; intent:go remains
deferred.

| Surface | Status | Safety Finding |
| --- | --- | --- |
| human markdown | shipped | rendered view |
| agentContext JSON | shipped | additive structured context |
| existing JSON fields | preserved | backward-compatible |
| verification hints | shipped | executed:false / hints only |
| do-not-touch zones | shipped | enforced:false / guidance only |
| evidence refs | shipped | preserved |
| boundaries | shipped | all false |

| Output | Review Finding |
| --- | --- |
| TaskContextReport artifact | canonical |
| human markdown | rendered view |
| agent JSON | structured source of truth |
| --json top-level fields | preserved |
| agentContext | additive |
| --format | deferred |
| export command | deferred |

| Boundary | Decision |
| --- | --- |
| context vs proof | context only |
| context vs approval | no approval |
| context vs command execution | no execution |
| context vs source writes | no writes |
| context vs WorkOrder / VerificationPlan | not created |
| context vs Circe | not run |
| verification hints | hints only |
| do-not-touch zones | guidance only |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare export safe/stable | selected | presentation-only boundary holds |
| workflow integration decision next | selected | broader use now needs policy |
| export quality fix next | deferred | only if review finds issue |
| add --format now | deferred | not needed for v1 |
| separate export command now | deferred | not needed for v1 |

The review found no presentation or JSON defect, so the export quality fix is not
needed. `--format` and a separate export command stay deferred.

## Recommendation

Declare **TaskContextReport Human/Agent Context Export safe/stable.** Recommended
next slice: **TaskContextReport Workflow Integration Decision** — decide how this
context substrate appears in broader operator/agent workflows (when to generate,
when to require, how agents consume it, whether it belongs in handoff/bundle
context) while staying context, not proof, with no automatic approval, no command
execution, no source writes, and no intent:go. Alternative: **TaskContextReport
Human/Agent Export Quality Fix**, only if a concrete presentation/JSON issue is
found (none was).

### Decision questions

1. Is the export safe/stable? Yes. 2. Is human markdown only a rendered view? Yes.
3. Is agentContext additive and backward-compatible? Yes. 4. Are existing
top-level JSON fields preserved? Yes. 5. Does human output clearly say "Read this
before editing"? Yes. 6. Does human output include core context? Yes. 7. Related /
supporting context? Yes. 8. Do-not-touch guidance? Yes. 9. Verification hints?
Yes. 10. Warnings when present? Yes. 11. Evidence refs / summary? Yes. 12.
agentContext task details? Yes. 13. coreContext / supportingContext? Yes. 14.
doNotTouch with `enforced:false`? Yes. 15. verificationHints with `executed:false`?
Yes. 16. warnings? Yes. 17. evidence refs? Yes. 18. all-false boundaries? Yes. 19.
Verification hints still hints, not executed? Yes. 20. Do-not-touch still
guidance/context, not enforcement? Yes. 21. Source files unchanged? Yes. 22.
Commands not executed? Yes. 23. WorkOrder / VerificationPlan not created? Yes. 24.
Circe not run? Yes. 25. intent:go deferred? Yes. 26. Next slice? TaskContextReport
Workflow Integration Decision.

## What This Does Not Do

This review changes no runtime behavior, no human/agent export code, and no
artifact shape. It adds no `--format` flag and no export command. It executes no
command, writes no source file, creates no WorkOrder or VerificationPlan, runs no
Circe, and does not bring intent:go forward. It does not review `b0e80b9` (source
scan traversal hardening), which is out of scope.

## Follow-Up Work

- **TaskContextReport Workflow Integration Decision** (recommended next): policy
  for when/where the substrate appears in operator/agent workflows.
- A `--format markdown|json|agent-json` flag and a dedicated `context task export`
  command remain deferred until a non-`--json` machine format is requested.

> Update (slice 179 · TaskContextReport Workflow Integration Decision): the standard Rekon workflow is now context first, plan second, approval third, handoff fourth (Option B). `TaskContextReport` is the standard pre-work context substrate, not a proof artifact — recommended (not required, not automatic) before human/agent implementation and before `intent assess` / `intent plan review`; humans read the markdown brief, agents consume `agentContext`. Consumption stays explicit; `intent prepare` stays lineage-only; prepare / approve / status / handoff stay separately gated; bundle inclusion is optional context only (deferred); no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. First implementation: TaskContextReport Workflow Guide / Agent Instructions. See [`task-context-report-workflow-integration-decision.md`](task-context-report-workflow-integration-decision.md).

> Update (slice 180 · TaskContextReport Workflow Guide / Agent Instructions): the context-first workflow is now documented for humans and agents. The canonical pre-work sequence is `rekon scan` → `rekon capability graph build` → `rekon context task` → `rekon artifacts latest --type TaskContextReport --id-only` → `rekon intent assess` / `rekon intent plan review --task-context-ref`. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; TaskContextReport stays context, not proof — no approval / execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; intent:go deferred. See [`task-context-workflow.md`](../guides/task-context-workflow.md).

> Update (slice 181 · TaskContextReport Workflow Guide Safety Review): the slice-180 workflow guide + agent instructions were reviewed end-to-end and declared safe/stable — docs/product surface only, guidance not automation. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; every documented command was confirmed against the live CLI. TaskContextReport stays context, not proof — no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; bundle inclusion optional context only; intent:go deferred; the workflow guide introduces no runtime behavior changes. See [`task-context-workflow-guide-safety-review.md`](task-context-workflow-guide-safety-review.md).

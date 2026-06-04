# TaskContextReport Intent Integration Implementation

> **Slice 171 · product capability batch.** Base `9345145`. Implements the explicit
> opt-in TaskContextReport consumption selected by the
> [TaskContextReport Intent Integration Decision](./task-context-report-intent-integration-decision.md)
> (slice 170): `rekon intent assess` and `rekon intent plan review` now accept
> `--task-context latest|<ref>`. Mirrors the shipped Semantic File Understanding
> intent-context pattern (slice 150). Task context stays proposal/context, never
> proof.

## Summary

`rekon intent assess` and `rekon intent plan review` now optionally consume a
TaskContextReport as context. A new pure selector — `selectTaskContextReports`
(`@rekon/capability-model`) — turns resolved reports into a `TaskContextSelection`
(`usedReports`, `staleReports`, `missingReports`, `warnings`), enforcing the
staleness / relevance model. The two builders consume that selection AFTER their
verdict is decided, so it never changes the verdict:

- **`buildIntentAssessmentReport`** enriches `matchedContext.paths` +
  `matchedContext.capabilities` from used reports and adds low-severity warnings
  (do-not-touch zones, `retrieval-low-signal`, stale) — after readiness is computed,
  so readiness never flips and no blocker is suppressed.
- **`buildIntentPlanActionabilityReport`** appends task-context grounding (relevant
  paths, do-not-touch constraints, verification-hint guidance) to `revisionPrompt`
  and warnings to `normalizationTrace.warnings` — after `status`/`findings` are
  decided, so a weak plan never becomes actionable and no finding is added/removed.

`rekon intent prepare` gains no flag: a PreparedIntentPlan receives task context
only by lineage through the assessment / actionability reports it consumes.
**TaskContextReport is proposal/context, not proof.** **TaskContextReport consumption
is explicit, not automatic.**

## Why This Batch Exists

The decision pinned explicit, opt-in consumption. This batch implements it for the
two selected surfaces while keeping every trust boundary intact, so task-shaped
context can improve grounding and revision guidance without being confused for proof
or planning approval.

## Selection Model

`selectTaskContextReports({ reports, mode, goal, planText, requestedPaths })`:

- **Boundary gate** — a report whose `boundaries` are not all-false is rejected
  (recorded `staleReports` with reason `boundaries-not-clean`) and never consumed.
- **Relevance** — path overlap with `requestedPaths`, path mention in the plan text,
  or lexical overlap of the report's task text/goal with the goal/plan. In `latest`
  mode only the single most relevant report is used; non-relevant candidates are
  recorded stale (`not-relevant`) and warned. In `explicit` mode (named refs) every
  boundary-clean report is used; an irrelevant one is still used but warned.
- **Honesty** — a used report with no context items, or with a provider but no
  embedding-retrieval items (`retrieval-low-signal`), is consumed but warned — never
  failed. `missingReports` (requested-but-unresolved) pass through with a warning.

The CLI resolver (`resolveTaskContextSelection`) reads stored TaskContextReports; a
`--task-context-ref` that does not resolve throws so the command fails cleanly.

## Intent Assessment Consumption

`rekon intent assess --task-context latest|<ref>` enriches `matchedContext`
(paths/capabilities) and adds low-severity warnings (do-not-touch as
`scope-ambiguous` guidance; `retrieval-low-signal`; stale). It runs after readiness
is decided, so **TaskContextReport must not satisfy proof gates by itself**, it never
marks readiness ready-for-prepare by itself, and **TaskContextReport must not replace
deterministic evidence artifacts**.

## Plan Actionability Consumption

`rekon intent plan review --task-context latest|<ref>` appends a "Task context
(proposal/context, not proof)" section to `revisionPrompt` with relevant paths,
do-not-touch constraints, and verification-hint guidance, plus warnings to
`normalizationTrace.warnings`. It runs after status/findings are decided, so it never
makes a weak plan actionable, never invents paths, never adds/removes a finding, and
never auto-approves. **TaskContextReport must not approve plans.**

## Prepared Plan Lineage

`rekon intent prepare` consumes the assessment / actionability reports, not
TaskContextReport. **PreparedIntentPlan receives TaskContextReport only by lineage,
not direct proof** — via `header.inputRefs` through the reports that consumed it. It
never satisfies `approval.proof` or enables WorkOrder / VerificationPlan handoff.

## Staleness And Relevance Model

Consume only on explicit ref / explicit latest, with all-false boundaries, and
relevance to the current goal/plan. Stale or boundary-invalid reports are warned and
not consumed silently; **retrieval-low-signal remains a warning, not an approval
blocker**; an empty-context report warns but does not fail.

## CLI Surface

```bash
rekon intent assess --goal "<text>" --task-context latest
rekon intent assess --goal "<text>" --task-context-ref <TaskContextReport:id>
rekon intent plan review --plan <path> --task-context latest
rekon intent plan review --plan <path> --task-context-ref <TaskContextReport:id>
```

`--json` adds a `taskContext` summary (`requested`, `used`, `stale`, `missing`,
`warnings`); human output adds a `Task context: N used, M stale, K missing` line.

## Output Surface

`taskContext` JSON summary + human line, for both commands. The selection's warnings
(do-not-touch, retrieval-low-signal, stale, empty, missing) surface there and, for
the consumers, as low-severity assessment warnings / normalization-trace notes.

## Boundary Model

Task context is consumed as context only. **TaskContextReport must not execute
commands.** **TaskContextReport must not write source files.** **TaskContextReport
must not create WorkOrder or VerificationPlan.** **TaskContextReport must not run
Circe.** **Verification hints remain hints, not executed commands.** **Do-not-touch
zones are constraints/context, not enforcement.** No approval is granted, and
**intent:go remains deferred.**

## What This Does Not Do

No direct prepare consumption; no approval; no proof-gate satisfaction; no
deterministic-evidence replacement; no command execution; no source writes; no
WorkOrder / VerificationPlan; no Circe; no duplicate detection; no canonical
recommendations; no version bump; no npm publish; no branch.

## Implementation Sequence / Next Step

The recommended next slice is **TaskContextReport Intent Integration Safety Review**
— review this assess/plan-review integration before task context is used in broader
intent workflows, with the same boundaries intact. An alternative follow-up is a
**TaskContextReport Intent Dogfood** running the full `context task` → `intent
assess` → `plan review` path on realistic tasks.

## Related

- [TaskContextReport Intent Integration Decision](./task-context-report-intent-integration-decision.md)
- [TaskContextReport Selection Quality Fix](./task-context-report-selection-quality-fix.md)
- [TaskContextReport v1](./task-context-report-v1.md)
- [Intent Assessment](../concepts/intent-assessment.md)
- [Intent Plan Compiler](../concepts/intent-plan-compiler.md)
- [Prepared Intent Plan](../concepts/prepared-intent-plan.md)

# TaskContextReport Intent Integration Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **Safety-reviewed (slice 172):** the slice-171 intent integration was reviewed
> end-to-end and declared safe/stable — additive context only (never proof/approval),
> prepare by lineage; intent:go deferred. See
> [`task-context-report-intent-integration-safety-review.md`](./task-context-report-intent-integration-safety-review.md).

> **Implemented (slice 171):** `rekon intent assess` and `rekon intent plan review`
> now accept opt-in `--task-context latest|<ref>` — additive context only (readiness /
> status decided first; never proof, never approval). See
> [`task-context-report-intent-integration-implementation.md`](./task-context-report-intent-integration-implementation.md).

> **Slice 170 · strategy / architecture decision batch.** Base `18086b1`.
> Decision-only — no runtime behavior change, no source change, no new artifact,
> no CLI command. Decides how the shipped
> [TaskContextReport](./task-context-report-v1.md)
> ([dogfooded](./task-context-report-dogfood-review.md),
> [quality-fixed](./task-context-report-selection-quality-fix.md)) should optionally
> feed Rekon intent planning, while keeping it context, never proof.

## Decision Summary

**Select Option B — explicit, opt-in TaskContextReport consumption by `rekon intent
assess` and `rekon intent plan review`.** TaskContextReport is supplied explicitly
(by `--task-context-ref <ref>` or `--task-context latest`); it is never consumed
automatically. `rekon intent prepare` does **not** consume TaskContextReport
directly — a PreparedIntentPlan receives it only by lineage through the assessment /
actionability reports that consumed it. **TaskContextReport is proposal/context, not
proof.** It may enrich `matchedContext`, add warnings, surface do-not-touch zones as
non-goals/constraints, ground normalized phases, and inform revision guidance — but
it never suppresses a deterministic blocker, satisfies a proof gate, or approves a
plan. If a single first consumer is needed to manage risk, **start with `rekon
intent plan review`**, because TaskContextReport most naturally improves plan
actionability (path grounding, revision prompts, do-not-touch constraints,
verification hints); support `rekon intent assess` as well.

This is decision-only. No integration is implemented in this batch.

## Why This Decision Exists

TaskContextReport now produces a compact, evidence-backed context bundle for a
concrete task — operator paths, graph facts, embedding neighbors, do-not-touch
zones, verification hints (command and free-form `manual-verification`), warnings,
and an all-false `boundaries` block — and the selection-quality fix made it reliable
enough to feed intent planning. The open question is *how* the intent surfaces
(`assess`, `plan review`, `prepare`, and downstream approval/handoff) should consume
it without confusing context with proof or planning approval. This memo pins that
model before any implementation slice.

## Current Task Context Surface

Grounded in the shipped artifact (`@rekon/kernel-repo-model`) and helper
(`buildTaskContextReport`, `@rekon/capability-model`):

| Field | Shape (today) |
| --- | --- |
| `task` | `{ text, paths[], goal? }` |
| `contextItems` | `{ kind, path?/symbolId?/capabilityId?, reason, score?, scoreBand?, evidenceRefs[], source }[]` — sources: operator_input / deterministic_graph / semantic_file_understanding / embedding_retrieval |
| `graphNeighborhood` | `{ nodes[], claims[] }` |
| `doNotTouch` | `{ reason, path?, symbolId?, evidenceRefs[] }[]` |
| `verificationHints` | `{ command? | artifact?, reason, evidenceRefs[] }[]` — command hints and free-form `manual-verification` hints |
| `warnings` | CLI-level strings (e.g. `retrieval-unavailable`, `retrieval-low-signal`) |
| `boundaries` | nine all-`false` flags (factory-forced, validator-enforced) |

The intent consumers (grounded by source review) expose:
`IntentAssessmentReport.{ readiness.status (ready-for-prepare | blocked |
needs-review | insufficient-context | stale-context), matchedContext{ systems,
capabilities, steps, paths }, blockers[], warnings[], missingContext[] }`;
`IntentPlanActionabilityReport.{ normalizedPhases[], findings[],
elicitationQuestions[], revisionPrompt{ prompt, requiredChanges[] }, evidenceGates[],
normalizationTrace, status, summary, boundaries }`;
`PreparedIntentPlan.{ approval{ status, proof{ intentAssessmentReportRef,
assessmentReadiness, … }, … }, header.inputRefs[] }`. Lineage to a PreparedIntentPlan
flows through `header.inputRefs` and `approval.proof.intentAssessmentReportRef`.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| no integration | rejected/deferred | context would not improve intent planning |
| explicit assess + plan review consumption | selected | useful and opt-in |
| automatic latest consumption | rejected | stale/surprise risk |
| direct prepare consumption | rejected/deferred | prepare should use lineage |
| context as proof | rejected | context is not proof |

## Recommendation

Adopt **explicit consumption by `rekon intent assess` and `rekon intent plan
review`**, opt-in via a ref or `latest`. **TaskContextReport consumption is explicit,
not automatic.** Implementation may begin with `rekon intent plan review` if risk
requires, then extend to `rekon intent assess`. TaskContextReport never reaches
`rekon intent prepare` directly.

## Intent Assessment Consumption

When supplied explicitly to `rekon intent assess`, TaskContextReport **may**: enrich
`matchedContext` (its `contextItems` become candidate systems/capabilities/steps/
paths); add `warnings` (including surfacing `retrieval-low-signal` or stale-context);
and surface `doNotTouch` zones as non-goal/context notes.

It **must not**: suppress deterministic `blockers`; satisfy a proof gate; mark
`readiness.status` ready-for-prepare by itself; or replace StepCapabilityGraph /
RuntimeGraphDriftReport / HandoffCoverageReport / PathFreshnessReport. **TaskContextReport
must not replace deterministic evidence artifacts.**

## Plan Actionability Consumption

When supplied explicitly to `rekon intent plan review`, TaskContextReport **may**:
add context to the `revisionPrompt`; reduce unnecessary path `elicitationQuestions`
when explicit context paths already cover them; add `doNotTouch` zones as
constraints/non-goals; add verification hints to elicitation/revision guidance; and
ground `normalizedPhases` in `contextItems`.

It **must not**: make a weak plan actionable by itself; invent source paths; convert
hints into executed commands; convert `manual-verification` hints into command
requirements or evidence gates; or auto-approve. **Verification hints remain hints,
not executed commands.** **Do-not-touch zones are constraints/context, not
enforcement.**

## Prepared Plan Lineage

`rekon intent prepare` consumes the assessment and actionability reports, not
TaskContextReport. A TaskContextReport that was consumed by those reports appears in
the PreparedIntentPlan only through `header.inputRefs` lineage. **PreparedIntentPlan
should receive TaskContextReport only by lineage, not direct proof.** It must not be
consumed directly by prepare in v1, must not satisfy `approval.proof`, and must not
enable WorkOrder / VerificationPlan handoff. **TaskContextReport must not approve
plans.** **TaskContextReport must not satisfy proof gates by itself.**

## Staleness And Relevance Model

A TaskContextReport may be consumed only when: an explicit ref resolves, or `latest`
is explicitly requested; its `boundaries` are all false; and its `task.text` / paths
are relevant to the current intent goal or plan file. If the report is stale or
mismatched, the consumer warns and does not consume it silently, and stale context
never improves readiness/actionability. If `retrieval-low-signal` is present, the
consumer surfaces the warning but does not block by default — **retrieval-low-signal
remains a warning, not an approval blocker.** If there are no `contextItems`, the
consumer warns but does not fail solely because the report is sparse.

## CLI Surface

The implementation slice will add opt-in flags (no behavior change to existing
invocations):

```bash
rekon intent assess \
  --task-context latest \
  --task-context-ref <TaskContextReport ref>

rekon intent plan review \
  --task-context latest \
  --task-context-ref <TaskContextReport ref>
```

`rekon intent prepare` gains no TaskContextReport flag; it relies on assessment /
actionability lineage.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| task context vs proof | proposal/context |
| task context vs approval | no approval |
| task context vs deterministic evidence | does not replace |
| task context vs command execution | no execution |
| task context vs source writes | no writes |
| task context vs WorkOrder / VerificationPlan | not created |
| task context vs Circe | not run |
| intent:go | deferred |

Consumer scope:

| Consumer | Decision |
| --- | --- |
| intent assess | allowed explicit context |
| intent plan review | allowed explicit context |
| intent prepare | lineage only, no direct consumption |
| approval | no consumption |
| WorkOrder / VerificationPlan | no direct consumption |

Field mapping:

| TaskContextReport Field | Intent Use |
| --- | --- |
| contextItems | matchedContext / plan grounding |
| graphNeighborhood | context explanation |
| doNotTouch | non-goals / constraints |
| verificationHints | revision guidance / optional verification suggestions |
| warnings | report warnings |
| boundaries | safety check only |

**TaskContextReport must not execute commands.** **TaskContextReport must not write
source files.** **TaskContextReport must not create WorkOrder or VerificationPlan.**
**TaskContextReport must not run Circe.**

## What This Does Not Do

This batch implements nothing. It does not change `rekon intent assess`, `rekon
intent plan review`, `rekon intent prepare`, approval, or status transitions; does
not make task context automatic; does not treat TaskContextReport as proof; does not
implement duplicate detection or canonical recommendations; executes no commands;
writes no source; creates no PreparedIntentPlan / WorkOrder / VerificationPlan; runs
no Circe; bumps no version; publishes nothing. **intent:go remains deferred.**

## Implementation Sequence

1. **TaskContextReport Intent Integration Implementation** — add the opt-in
   `--task-context latest|<ref>` flags to `rekon intent assess` and `rekon intent
   plan review`; map `contextItems` → `matchedContext`/plan grounding, `doNotTouch`
   → constraints/non-goals, `verificationHints` → revision guidance, `warnings`
   (incl. `retrieval-low-signal`/staleness) → report warnings; enforce the staleness
   / relevance model. Still no approval, command execution, source writes, WorkOrder /
   VerificationPlan, Circe, or intent:go.
2. A safety review of that implementation follows.

## Decision Questions Answered

1. **Should TaskContextReport feed intent planning?** Yes — explicitly, as context.
2. **Which surfaces first?** `intent assess` and `intent plan review` (start with
   plan review if risk requires).
3. **Should intent assess consume it?** Yes — explicit, opt-in.
4. **Should intent plan review consume it?** Yes — explicit, opt-in.
5. **Should intent prepare consume it directly?** No — lineage only.
6. **Should it satisfy proof gates?** No.
7. **Should approval be possible?** No.
8. **How do do-not-touch zones map?** To intent constraints / non-goals (context,
   not enforcement).
9. **How do verification hints map?** To revision/elicitation guidance and optional
   verification suggestions — never executed, never converted to evidence gates.
10. **How do contextItems affect matchedContext / grounding?** As candidate
    systems/capabilities/steps/paths and phase grounding; they never invent paths.
11. **How do warnings surface?** As report warnings (incl. `retrieval-low-signal`
    and staleness).
12. **How are stale reports handled?** Warn, do not consume silently, never improve
    readiness/actionability from stale context.
13. **Explicit by ref/latest?** Yes.
14. **Automatic when present?** No.
15. **Should retrieval-low-signal downgrade/block intent?** No — warning/context
    first.
16. **Should it influence prepare phase structure?** Only via actionability-review
    lineage, never as direct proof.
17. **What slice follows?** TaskContextReport Intent Integration Implementation.

## Related

- [TaskContextReport v1](./task-context-report-v1.md)
- [TaskContextReport Safety Review](./task-context-report-safety-review.md)
- [TaskContextReport Dogfood Review](./task-context-report-dogfood-review.md)
- [TaskContextReport Selection Quality Fix](./task-context-report-selection-quality-fix.md)
- [Intent Assessment](../concepts/intent-assessment.md)
- [Intent Plan Compiler](../concepts/intent-plan-compiler.md)
- [Prepared Intent Plan](../concepts/prepared-intent-plan.md)

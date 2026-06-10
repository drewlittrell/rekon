# TaskContextReport Intent Integration Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **Broader-workflow role decided (slice 176):** TaskContextReport is the standard
> pre-intent / pre-work context substrate — context only, never proof/approval;
> consumption stays explicit; the deterministic spine stays separately gated;
> intent:go deferred. Next: TaskContextReport Human/Agent Context Export. See
> [`task-context-report-broader-workflow-decision.md`](./task-context-report-broader-workflow-decision.md).

> **Intent dogfood safety-reviewed (slice 174):** the slice-173 dogfood was reviewed
> end-to-end and declared safe/stable — completion came from the existing readiness /
> actionability / approval / status / handoff gates, not from task context weakening any
> boundary; intent:go deferred. Next: Intent Planning UX / Context Quality Fix. See
> [`task-context-report-intent-dogfood-safety-review.md`](./task-context-report-intent-dogfood-safety-review.md).

> **Dogfooded (slice 173):** the full operator path (`context task` → assess → plan
> review → answer → prepare → approve → status → work-order → verification-plan →
> bundle) was run with opt-in task context — it improved matchedContext / revisionPrompt
> while every gate held; source unchanged. See
> [`task-context-report-intent-dogfood.md`](./task-context-report-intent-dogfood.md).

> **Slice 172 · strategy / safety-review batch.** Base `cc9f254`. Reviews the
> slice-171 [TaskContextReport Intent Integration Implementation](./task-context-report-intent-integration-implementation.md)
> end-to-end. No runtime behavior change, no source change, no new artifact, no CLI
> command. Verdict: the integration is safe/stable and remains additive context
> only. Recommended next: **TaskContextReport Intent Dogfood**.

## Decision Summary

The shipped opt-in TaskContextReport consumption by `rekon intent assess` and `rekon
intent plan review` was reviewed against the actual source (`task-context.ts`, both
intent builders, `prepared-intent-plan.ts`, the CLI). It holds the intended boundary:
task context is consumed only as proposal/context, only when explicitly requested,
and only as additive enrichment computed *after* the deterministic verdict is
decided. **TaskContextReport is proposal/context, not proof.** **TaskContextReport
consumption is explicit, not automatic.** The integration is declared safe/stable;
no blocker was found.

## Why This Review Exists

Slice 171 made TaskContextReport — until then a standalone artifact produced by
`rekon context task` — consumable by the intent spine. That is the first time
task-shaped retrieval context feeds planning surfaces that gate work. This review
confirms the context enriches planning without becoming proof, approval, execution,
or source mutation, before the integration is exercised on realistic tasks
(dogfood) or extended.

## Implementation Reviewed

- `packages/capability-model/src/task-context.ts` — pure selector
  `selectTaskContextReports` + `summarizeTaskContext` (no fs, no providers, no
  clock; only an `ArtifactRef` type import).
- `packages/capability-model/src/intent-assessment-report.ts` — optional
  `taskContext` input; enrichment block runs after the `readiness` block is built.
- `packages/capability-model/src/intent-plan-actionability-report.ts` — optional
  `taskContext` input; enrichment appends after `status` / `findings` are decided.
- `packages/capability-model/src/prepared-intent-plan.ts` — no task-context
  reference (grep-confirmed: none).
- `packages/cli/src/index.ts` — `resolveTaskContextSelection` + flags on assess and
  plan review only; `prepare` takes `--assessment` / `--actionability-report` only.
- `packages/capability-model/src/index.ts`, `packages/kernel-repo-model/src/index.ts`
  — export surface, no new artifact registration.

## Selection Model Review

`selectTaskContextReports` is pure and conservative:

- **Boundary all-false gate** — a report whose `boundaries` are absent, empty, or
  carry any non-false value is recorded in `staleReports` (`boundaries-not-clean`)
  and warned; it is never added to the consumable set. Only an explicit, present,
  all-false boundary record passes.
- **Relevance** — path overlap with requested paths (+3), plan-text path mention
  (+2), lexical token overlap of the report's task text/goal with the goal/plan
  (+1). `mode: "latest"` uses only the single most relevant boundary-clean report;
  non-relevant candidates become `staleReports` (`not-relevant`) and are warned.
  `mode: "explicit"` (named refs) uses every boundary-clean report but warns when a
  named report scores zero relevance.
- **Honesty** — a used report with no context items, or with a provider but no
  embedding-retrieval items, is consumed but warned (the latter carries
  `retrieval-low-signal: … (proposal/context, not proof)`). `missingRefs` pass
  through to `missingReports` with a warning.

**Stale or irrelevant task context is not consumed silently.** **Missing explicit
task-context refs fail cleanly** (the CLI resolver throws before any report is
selected). **Retrieval-low-signal remains a warning, not an approval blocker.**

## Intent Assessment Review

`buildIntentAssessmentReport` computes the `readiness` block, `blockers`, and
warnings from the deterministic spine first. The task-context enrichment block runs
strictly after that: it appends used-report paths to `matchedContext.paths`, used-
report capabilities to `matchedContext.capabilities`, and low-severity warnings
(do-not-touch as `scope-ambiguous` guidance, `retrieval-low-signal`, staleness). It
never reads or mutates `readiness`, never touches the `blockers` array, and never
short-circuits the missing-spine high blockers. **IntentAssessmentReport readiness
remains governed by existing readiness gates.** **TaskContextReport must not suppress
deterministic blockers.** **TaskContextReport must not satisfy proof gates by
itself.** **TaskContextReport must not replace deterministic evidence artifacts.**

## Plan Actionability Review

`buildIntentPlanActionabilityReport` derives per-phase actionability `status` and
`findings` from the deterministic parse plus the source-grounded recheck (unsupported
paths/commands and dropped non-goals become findings *before* status is derived). The
task-context enrichment appends to `revisionPrompt` (relevant paths, do-not-touch
constraints, verification-hint guidance rendered as hints) and to
`normalizationTrace.warnings` — after status and findings are fixed. It adds no
finding, removes no finding, and changes no status. **IntentPlanActionabilityReport
status remains governed by plan actionability, not task context alone.**
**TaskContextReport must not approve plans.** **Verification hints remain hints, not
executed commands.** **Do-not-touch zones are constraints/context, not enforcement.**

## Prepared Plan Lineage Review

`rekon intent prepare` consumes `--assessment` and `--actionability-report` and has
no `--task-context` flag; `prepared-intent-plan.ts` contains no task-context
reference. A PreparedIntentPlan therefore inherits task context only transitively,
through the assessment / actionability reports recorded in its `inputRefs`. **intent
prepare has no direct task-context flag.** **PreparedIntentPlan receives
TaskContextReport only by lineage, not direct proof.** **TaskContextReport creates no
PreparedIntentPlan.**

## CLI Review

`--task-context latest` and `--task-context-ref <TaskContextReport:id>` are opt-in on
assess and plan review only; `resolveTaskContextSelection` reads stored reports,
passes mode/goal/planText/requestedPaths to the selector, and throws
`rekon could not resolve --task-context-ref …` when a named ref is absent. `--json`
adds a `taskContext` summary (`requested`, `used`, `stale`, `missing`, `warnings`);
human output adds a `Task context: N used, M stale, K missing` line. No flag → no
`taskContext` key and byte-identical prior output. The enrichment is additive only,
so **TaskContextReport enrichment is additive after readiness/status decisions.**

## Boundary Review

Task context performs no work and grants no authority. **TaskContextReport creates no
WorkOrder.** **TaskContextReport creates no VerificationPlan.** **TaskContextReport
executes no commands.** **TaskContextReport writes no source files.**
**TaskContextReport runs no Circe.** No approval is granted, and **intent:go remains
deferred.**

### Surface table

| Surface | Status | Safety Finding |
| --- | --- | --- |
| --task-context latest | shipped | explicit opt-in |
| --task-context-ref | shipped | explicit refs |
| selectTaskContextReports | shipped | boundary + relevance gated |
| intent assess integration | shipped | additive matchedContext / warnings |
| intent plan review integration | shipped | additive revisionPrompt / warnings |
| intent prepare | unchanged | lineage only |
| missing refs | shipped | clean failure |

### Consumer table

| Consumer | Review Finding |
| --- | --- |
| IntentAssessmentReport | context enrichment after readiness |
| IntentPlanActionabilityReport | revision grounding after status/findings |
| PreparedIntentPlan | lineage only |
| approval | no task-context authority |
| WorkOrder / VerificationPlan | no direct consumption |

### Boundary table

| Boundary | Decision |
| --- | --- |
| task context vs proof | proposal/context |
| task context vs approval | no approval |
| task context vs readiness | does not satisfy by itself |
| task context vs blockers | does not suppress |
| task context vs actionability | does not make actionable alone |
| task context vs command execution | no execution |
| task context vs source writes | no writes |
| task context vs WorkOrder / VerificationPlan | not created |
| task context vs Circe | not run |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare integration safe/stable | selected | additive boundary holds |
| intent dogfood next | selected | usefulness needs realistic path test |
| deeper automation next | deferred | dogfood first |
| direct prepare consumption | rejected | lineage-only model |
| task context as proof | rejected | context-only boundary |

## Recommendation

**TaskContextReport Intent Integration is safe/stable.** The additive boundary holds
across the selector, both builders, the prepare lineage, and the CLI. Proceed to
**TaskContextReport Intent Dogfood** to evaluate practical usefulness on realistic
tasks before any deeper automation or release work. (Alternative: **Intent Planning
UX / Context Quality Fix**, only if the dogfood or this review surfaced a concrete
usability or warning-surface issue — none was found here.)

### Decision questions

1. Safe/stable — yes. 2. Explicit, not automatic — yes (opt-in flags). 3. Missing
explicit ref fails cleanly — yes (resolver throws). 4. Stale/irrelevant warns rather
than silently improves — yes. 5. Assess uses task context only as proposal/context —
yes. 6. Assess readiness governed by existing gates — yes. 7. Assess does not suppress
deterministic blockers — yes. 8. matchedContext enrichment additive — yes. 9. Plan
review uses task context only as proposal/context — yes. 10. Plan actionability status
governed by actionability — yes. 11. No required findings removed — yes. 12. No weak
plan made actionable by task context — yes. 13. Verification hints stay hints — yes.
14. Do-not-touch stays constraints/context — yes. 15. Prepare avoids direct
consumption — yes. 16. PreparedIntentPlan gets task context only by lineage — yes. 17.
No PreparedIntentPlan created — yes. 18. No WorkOrder — yes. 19. No VerificationPlan —
yes. 20. No commands executed — yes. 21. No source files written — yes. 22. No Circe —
yes. 23. intent:go deferred — yes. 24. Next slice — TaskContextReport Intent Dogfood.

## What This Does Not Do

No runtime behavior change; no change to the task-context integration; no new
task-context consumer; no direct prepare consumption; no automatic consumption; no
treating TaskContextReport as proof; no plan approval; no hint execution; no command
execution; no source writes; no PreparedIntentPlan / WorkOrder / VerificationPlan
creation; no Circe; no intent:go; no duplicate detection; no canonical
recommendations; no npm publish; no version bump; no branch.

## Follow-Up Work

- **TaskContextReport Intent Dogfood** (recommended next) — run `context task` →
  `intent assess --task-context` → `intent plan review --task-context` → `plan
  answer` → `prepare` → approve/status/handoff on realistic tasks; evaluate
  matchedContext usefulness, revisionPrompt usefulness, do-not-touch preservation,
  and verification-hint guidance, with no automatic consumption, no approval by
  context, no command execution, no source writes, no intent:go.
- **Intent Planning UX / Context Quality Fix** (alternative) — only if a concrete
  usability or warning-surface issue is found.

## Related

- [TaskContextReport Intent Integration Implementation](./task-context-report-intent-integration-implementation.md)
- [TaskContextReport Intent Integration Decision](./task-context-report-intent-integration-decision.md)
- [TaskContextReport Selection Quality Fix](./task-context-report-selection-quality-fix.md)
- [TaskContextReport Safety Review](./task-context-report-safety-review.md)
- [TaskContextReport v1](./task-context-report-v1.md)

> Update (slice 177 · TaskContextReport Human/Agent Context Export): `rekon context task` now prints a human "read this before editing" brief (Core Context, Related / Supporting Context, Do Not Touch, Verification Hints, Evidence) and adds an additive `agentContext` block to its `--json` payload. Presentation only — the TaskContextReport artifact stays canonical, human markdown is a rendered view, agent JSON is the structured source of truth; every existing JSON field preserved; verification hints stay hints, do-not-touch stays guidance, evidence preserved; no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export.md`](task-context-human-agent-export.md).

> Update (slice 182 · TaskContextReport Bundle Context Decision): intent bundles may carry optional `TaskContextReport` refs as context for agents/operators (Option B + E) — an additive `manifest.context.taskContextReports[]` section plus Rekon-side `context/` sidecars, with the Circe handoff schema unchanged in v1. Inclusion is optional, never required; context stays context, not proof — it must not approve plans, satisfy WorkOrder/VerificationPlan gates, change phase gates, execute commands, write source, or run Circe; hints stay hints; do-not-touch stays guidance; Circe is not required to know TaskContextReport internals in v1; intent:go deferred. First implementation: TaskContextReport Bundle Context Implementation. See [`task-context-report-bundle-context-decision.md`](task-context-report-bundle-context-decision.md).

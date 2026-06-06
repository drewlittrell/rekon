# TaskContextReport Intent Dogfood Safety Review

> **Broader-workflow role decided (slice 176):** TaskContextReport is the standard
> pre-intent / pre-work context substrate — context only, never proof/approval;
> consumption stays explicit; the deterministic spine stays separately gated;
> intent:go deferred. Next: TaskContextReport Human/Agent Context Export. See
> [`task-context-report-broader-workflow-decision.md`](./task-context-report-broader-workflow-decision.md).

> **Provider-default UX fixed (slice 175):** `rekon context task` with an existing
> embeddings index, no `--path`, and an implicitly-defaulted provider whose key is
> missing now degrades to a graph + lexical context fallback instead of exiting
> non-zero; explicit-provider failures stay strict; task context stays
> proposal/context, not proof; intent:go deferred. See
> [`intent-planning-ux-context-quality-fix.md`](./intent-planning-ux-context-quality-fix.md).

> **Slice 174 · strategy / safety-review batch.** Base `cc926a2`. Reviews the slice-173
> [TaskContextReport Intent Dogfood](./task-context-report-intent-dogfood.md)
> end-to-end. No runtime behavior change, no source change, no new artifact, no CLI
> command. Verdict: the full task-context intent path is safe/stable — success came from
> the existing explicit gates, not from any weakened boundary. Recommended next:
> **Intent Planning UX / Context Quality Fix**.

## Decision Summary

The slice-173 dogfood ran the full public operator path with opt-in TaskContextReport
context and it completed. This review confirms that completion came from the
deterministic spine — readiness gates, the actionability evaluation, explicit operator
answers, explicit accepted-risk approval, an explicit work-ready transition, and the
post-approval handoff gates — and **not** from task context weakening any boundary. The
reviewed source (`task-context.ts` and both intent builders) is unchanged since slice
171 (`cc9f254`); the bundle stamps `sourceWriteAllowed: false`, `commandsExecuted:
false`, `runsCirce: false`, `intentGoDeferred: true`; and the dogfood contract test
asserts no VerificationRun, no IntentGo, and a clean working tree. **TaskContextReport is
proposal/context, not proof.** Declared safe/stable; no blocker found.

## Why This Review Exists

A dogfood that *completes* is necessary but not sufficient evidence of safety — the path
could have completed because a gate was bypassed. This review re-reads the gates the
path traversed to confirm each still required its normal deterministic input, so broader
agent/operator workflow use can be considered with confidence.

## Dogfood Reviewed

Scenario A (full path, explicit `--task-context-ref`), Scenario B (mock retrieval), and
an optional live-Voyage run, captured by a 26-assertion keyless contract test
(`tests/contract/task-context-intent-dogfood.test.mjs`) that replays the path and a
16-assertion docs test. Source reviewed: `task-context.ts`, both intent builders,
`prepared-intent-plan.ts`, `intent-approval.ts`, `intent-status-transition.ts`,
`intent-plan-bundle.ts`, the CLI, kernel exports.

### Surface table

| Surface | Dogfood Finding | Safety Finding |
| --- | --- | --- |
| context task | produced TaskContextReport | context only |
| intent assess --task-context-ref | matchedContext improved | readiness unchanged by context alone |
| intent plan review --task-context-ref | revisionPrompt improved | actionability unchanged by context alone |
| plan answer | actionable after answers | operator-driven |
| intent prepare | implementation-bearing phases | approval remained needs-review |
| intent approve | approved with accepted risks | explicit approval |
| status transition | work-ready after explicit transition | explicit state change |
| work-order / verification-plan | generated after approve/status | gates held |
| bundle write | handoff paths emitted | proof boundaries held |

## Assess Result Review

`intent assess --task-context-ref` returned `taskContext.used = 1` and added the used
report's path to `matchedContext.paths`, while readiness stayed `needs-review` and no
deterministic blocker was suppressed. The enrichment runs after readiness is computed.
**TaskContextReport improved matchedContext without making readiness ready by itself.**

## Plan Review Result Review

`intent plan review --task-context-ref` returned `taskContext.used = 1` and grew
`revisionPrompt` with a "Task context (proposal/context, not proof)" section (relevant
paths, do-not-touch constraint, verification hint), while status stayed `needs-revision`
and no finding was added or removed. **TaskContextReport improved revisionPrompt without
making actionability actionable by itself.** **Do-not-touch guidance survived into plan
review.** **Verification-hint guidance survived into plan review as hints, not executed
commands.**

## Plan Answer Result Review

The report became `actionable` only after six explicit operator answers were supplied
via `intent plan answer`; task context did not flip the status. **Plan answer became
actionable only after explicit operator answers.**

## Prepare Result Review

`intent prepare` consumed `--assessment` and `--actionability-report` only (no
task-context flag) and produced a needs-review PreparedIntentPlan with
implementation-bearing phases. **Prepare remained lineage-only.** **Prepare approval
remained needs-review before explicit approval.**

## Approval And Status Review

`intent approve` without `--accept` returned `blocked` (`missing-required-accepted-gap`);
with the plan's required accepted risks it wrote a new `approved` PreparedIntentPlan
revision. `intent status transition --to work-ready` wrote a new work-ready
IntentStatusReport. **Approval required explicit accepted risks.** **Status transition
required explicit work-ready transition.**

## WorkOrder / Verification Result Review

`intent work-order generate` and `intent verification-plan generate` both succeeded only
against the approved plan plus the work-ready status. No VerificationRun or
VerificationResult artifact was produced by any step. **WorkOrder and VerificationPlan
generated only after approve plus work-ready status.** **No VerificationRun or
VerificationResult was created.**

## Bundle Result Review

`intent bundle write` emitted `bundlePath`, `handoffPath`, `phasePlanPath`, and
`rekonProofPath`, and stamped `sourceWriteAllowed: false`, `commandsExecuted: false`,
`runsCirce: false`, with `canonicalTruth: ".rekon/artifacts"`. The working tree stayed
clean. **Bundle write emitted handoff paths.** **Source and plan files were unchanged.**
**No commands were executed.** **Rekon did not run Circe.**

## Retrieval-Assisted Context Review

Mock retrieval produced a `partial` report with a clear `retrieval-low-signal` warning,
preserving do-not-touch and verification hints. Live Voyage surfaced
`src/sms/route-message.ts` (band `weak`) — more useful than mock — while still labelling
the result low-signal. Retrieval is useful but the mock band stays low-signal; the
explicit `--path` / live-provider routes remain preferred, which is a UX follow-up, not
a safety issue. **The context task provider-default finding is non-blocking but should be
fixed before broader workflow use.**

## Boundary Review

No boundary was weakened by task context. **intent:go remains deferred.**

### Boundary table

| Boundary | Review Finding |
| --- | --- |
| task context vs proof | proposal/context |
| readiness | not made ready by context alone |
| actionability | not made actionable by context alone |
| approval | explicit accepted risks required |
| status | explicit work-ready transition required |
| command execution | none |
| source writes | none |
| VerificationRun / Result | none |
| Circe | not run by Rekon |
| intent:go | deferred |

## Options Considered

### Finding table

| Finding | Severity | Recommendation |
| --- | --- | --- |
| full path succeeds | positive | proceed after safety review |
| task context improves assess/review | positive | keep opt-in context path |
| provider-default missing-key behavior | non-blocking UX issue | Intent Planning UX / Context Quality Fix |
| mock retrieval remains low-signal | known limitation | live Voyage / explicit path remains preferred |

### Option table

| Option | Decision | Reason |
| --- | --- | --- |
| declare dogfood safe/stable | selected | gates held end-to-end |
| UX/context quality fix next | selected | one concrete ergonomics issue remains |
| broader workflow use now | deferred | fix provider-default behavior first |
| automatic task context consumption | rejected | explicit opt-in remains required |
| context as proof | rejected | proposal/context only |

## Recommendation

**TaskContextReport Intent Dogfood is safe/stable.** Proceed to **Intent Planning UX /
Context Quality Fix** — the one concrete ergonomics finding (context task with no
`--path` and an existing embeddings index defaults to the embedding provider and exits on
a missing key instead of degrading to graph + lexical context) should be fixed before
broader agent/operator workflow use. Alternative: **TaskContextReport Broader Workflow
Decision**, only if the team accepts the provider-default behavior as-is.

### Decision questions

1. Safe/stable — yes. 2. Improved assess matchedContext — yes. 3. Readiness still
gate-governed — yes. 4. Readiness not made ready by itself — yes. 5. Improved
revisionPrompt — yes. 6. do-not-touch survived — yes. 7. verification hint survived —
yes. 8. Actionable only after answers — yes. 9. Prepare lineage-only — yes. 10. Approval
needs-review before approve — yes. 11. Approval required accepted risks — yes. 12. Status
required work-ready — yes. 13. WorkOrder needs approved + work-ready — yes. 14.
VerificationPlan needs approved + work-ready — yes. 15. Bundle emitted handoff paths —
yes. 16. Bundle preserved proof boundaries — yes. 17. Source/plan unchanged — yes. 18. No
commands executed — yes. 19. No VerificationRun/Result — yes. 20. Circe not run — yes. 21.
intent:go deferred — yes. 22. Retrieval useful, but provider-default is a UX follow-up.
23. Broader use after the UX fix. 24. Next slice — Intent Planning UX / Context Quality
Fix.

## What This Does Not Do

No runtime behavior change; no change to the task-context intent integration; no UX fix
(deferred to the next slice); no plan approval; no command execution; no source writes;
no PreparedIntentPlan / WorkOrder / VerificationPlan creation from task context; no
Circe; no intent:go; no automatic consumption; no duplicate detection; no canonical
recommendations; no npm publish; no version bump; no branch.

## Follow-Up Work

- **Intent Planning UX / Context Quality Fix** (recommended next) — make `context task`
  degrade to a graph + lexical report (or warn clearly) when an embeddings index exists
  but no embedding key is available, instead of exiting non-zero; keep explicit task
  context, no proof/approval semantics, no command execution, no source writes, no
  intent:go.
- **TaskContextReport Broader Workflow Decision** (alternative) — only if the
  provider-default behavior is accepted as-is.

## Related

- [TaskContextReport Intent Dogfood](./task-context-report-intent-dogfood.md)
- [TaskContextReport Intent Integration Safety Review](./task-context-report-intent-integration-safety-review.md)
- [TaskContextReport Intent Integration Implementation](./task-context-report-intent-integration-implementation.md)

> Update (slice 177 · TaskContextReport Human/Agent Context Export): `rekon context task` now prints a human "read this before editing" brief (Core Context, Related / Supporting Context, Do Not Touch, Verification Hints, Evidence) and adds an additive `agentContext` block to its `--json` payload. Presentation only — the TaskContextReport artifact stays canonical, human markdown is a rendered view, agent JSON is the structured source of truth; every existing JSON field preserved; verification hints stay hints, do-not-touch stays guidance, evidence preserved; no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export.md`](task-context-human-agent-export.md).

> Update (slice 178 · TaskContextReport Human/Agent Export Safety Review): the slice-177 `rekon context task` human/agent export was reviewed end-to-end and declared safe/stable — presentation only. The TaskContextReport artifact is canonical, human markdown is a rendered view, agent JSON (`agentContext`) is the structured source of truth and is additive (every existing top-level JSON field preserved); verification hints stay hints (`executed:false`), do-not-touch zones stay guidance (`enforced:false`), evidence refs are preserved, boundaries stay all-false; no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export-safety-review.md`](task-context-human-agent-export-safety-review.md).

> Update (slice 179 · TaskContextReport Workflow Integration Decision): the standard Rekon workflow is now context first, plan second, approval third, handoff fourth (Option B). `TaskContextReport` is the standard pre-work context substrate, not a proof artifact — recommended (not required, not automatic) before human/agent implementation and before `intent assess` / `intent plan review`; humans read the markdown brief, agents consume `agentContext`. Consumption stays explicit; `intent prepare` stays lineage-only; prepare / approve / status / handoff stay separately gated; bundle inclusion is optional context only (deferred); no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. First implementation: TaskContextReport Workflow Guide / Agent Instructions. See [`task-context-report-workflow-integration-decision.md`](task-context-report-workflow-integration-decision.md).

> Update (slice 182 · TaskContextReport Bundle Context Decision): intent bundles may carry optional `TaskContextReport` refs as context for agents/operators (Option B + E) — an additive `manifest.context.taskContextReports[]` section plus Rekon-side `context/` sidecars, with the Circe handoff schema unchanged in v1. Inclusion is optional, never required; context stays context, not proof — it must not approve plans, satisfy WorkOrder/VerificationPlan gates, change phase gates, execute commands, write source, or run Circe; hints stay hints; do-not-touch stays guidance; Circe is not required to know TaskContextReport internals in v1; intent:go deferred. First implementation: TaskContextReport Bundle Context Implementation. See [`task-context-report-bundle-context-decision.md`](task-context-report-bundle-context-decision.md).

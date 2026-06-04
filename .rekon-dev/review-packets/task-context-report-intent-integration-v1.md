# Review Packet — TaskContextReport Intent Integration (v1)

Slice 171 · product capability batch · base `9345145`.

Implements the explicit opt-in TaskContextReport consumption selected by the
slice-170 decision: `rekon intent assess` and `rekon intent plan review` gain
`--task-context latest|<ref>`, backed by a new pure selector. Task context stays
proposal/context, never proof.

## CHANGES MADE

- **NEW** `packages/capability-model/src/task-context.ts` — pure selection module:
  `TaskContextReportLike`, `TaskContextSelectionReport`, `TaskContextStaleReason`,
  `TaskContextStaleWarning`, `TaskContextSelection`, `normalizeTaskContextPath`,
  `selectTaskContextReports`, `summarizeTaskContext`. Mirrors `semantic-file-context.ts`.
- `packages/capability-model/src/index.ts` — re-exports the new types + helpers.
- `packages/capability-model/src/intent-assessment-report.ts` — optional
  `taskContext?: TaskContextSelection` input; post-readiness enrichment of
  `matchedContext` + low-severity warnings.
- `packages/capability-model/src/intent-plan-actionability-report.ts` — optional
  `taskContext?: TaskContextSelection` input; post-status grounding of
  `revisionPrompt` + `normalizationTrace.warnings`.
- `packages/cli/src/index.ts` — `resolveTaskContextSelection` resolver +
  `--task-context latest|<ref>` / `--task-context-ref <id>` flags on assess and plan
  review; `taskContext` JSON summary + human line; usage() updates.
- **NEW** `tests/contract/task-context-intent-integration.test.mjs` (28 assertions).
- **NEW** `tests/docs/task-context-intent-integration.test.mjs` (17 assertions).
- **NEW** memo `docs/strategy/task-context-report-intent-integration-implementation.md`.
- Doc cross-refs across the intent + task-context surface; CHANGELOG + README.

## PUBLIC API CHANGES

- `@rekon/capability-model` adds `selectTaskContextReports`, `summarizeTaskContext`,
  `normalizeTaskContextPath` + 5 types. Both intent builders accept a new OPTIONAL
  `taskContext` input (additive; omitted → byte-identical to prior behavior).
- CLI adds OPTIONAL `--task-context` / `--task-context-ref` to two commands. No flag
  → unchanged output (the `taskContext` JSON key and human line appear only when a
  selection is requested).
- No artifact schema change, no registration change, no version bump.

## PURPOSE PRESERVATION CHECK

TaskContextReport's purpose is task-shaped *context* (a proposal of relevant files,
capabilities, do-not-touch zones, and verification hints) — never proof, never
approval. This batch preserves that:

- Consumption is **opt-in** (a flag), **explicit, not automatic**.
- Both builders enrich **after** their verdict is computed: assessment readiness and
  blockers are decided first; actionability status and findings are decided first.
  Task context only **appends** warnings / matched paths / revision grounding.
- Readiness can never be flipped to ready, no blocker is suppressed, no finding is
  added or removed, no weak plan becomes actionable.
- `retrieval-low-signal` stays a warning, do-not-touch stays a constraint, hints stay
  hints. No command runs, no file is written, no WorkOrder / VerificationPlan is
  created, Circe is never invoked, and `intent:go` stays deferred.
- PreparedIntentPlan still receives task context **only by lineage** through the
  reports it consumes — never as direct proof.

## SOURCE REVIEW

`selectTaskContextReports` is pure (no fs, no clock, no network). It gates on
all-false boundaries, scores relevance (path overlap / plan-text mention / lexical
overlap), and emits `usedReports` / `staleReports` / `missingReports` / `warnings`.
Builder enrichment blocks are strictly additive and run last. The CLI resolver is the
only fs touch: it reads stored reports and throws on an unresolved explicit ref.

## SELECTION MODEL

`{ reports, mode: "explicit" | "latest", goal?, planText?, requestedPaths?, missingRefs? }`.
`explicit` (named refs) uses every boundary-clean report (irrelevant → warn);
`latest` uses the single most relevant (ties → last), recording the rest stale
(`not-relevant`). Boundary-dirty → stale (`boundaries-not-clean`), never used.

## INTENT ASSESSMENT INTEGRATION

`matchedContext.paths` / `matchedContext.capabilities` gain used-report entries;
warnings gain do-not-touch (`scope-ambiguous`, low), `retrieval-low-signal`, and
stale (`stale-context`) entries, each carrying `sourceRefs: [used.ref]` when present.
Runs after readiness — readiness and blockers are untouched.

## PLAN ACTIONABILITY INTEGRATION

`revisionPrompt.prompt` gains a "Task context (proposal/context, not proof)" section
(relevant paths, do-not-touch constraints, verification-hint guidance rendered as
hints, not commands); `normalizationTrace.warnings` gains the selection warnings.
Runs after status/findings — status and findings are untouched.

## PREPARED PLAN LINEAGE

`rekon intent prepare` gains no task-context flag. A PreparedIntentPlan inherits task
context only transitively, through the assessment / actionability reports in its
`inputRefs`. It never satisfies `approval.proof`.

## STALE / RELEVANCE MODEL

Boundary-dirty and non-relevant reports are recorded stale and warned, never silently
consumed. Empty-context and `retrieval-low-signal` reports are consumed with a
warning, never failed. Requested-but-unresolved refs become `missingReports` + a
warning.

## CLI SURFACE

`rekon intent assess --task-context latest|--task-context-ref <id>` and
`rekon intent plan review --task-context latest|--task-context-ref <id>`. `--json`
adds `taskContext{requested,used,stale,missing,warnings}`; human adds
`Task context: N used, M stale, K missing`. Unresolved explicit ref → clean exit 1.

## BOUNDARY MODEL

Context only. No command execution, no source writes, no WorkOrder /
VerificationPlan, no Circe, no approval. Hints stay hints; do-not-touch stays a
constraint; `retrieval-low-signal` stays a warning; `intent:go` stays deferred.

## TESTS / VERIFICATION

- Contract `task-context-intent-integration.test.mjs` — 28 assertions: selector
  purity (5), assess builder additive behavior (10/11/12 confirm readiness +
  blockers preserved), plan-review builder additive behavior (18 confirms status
  preserved), CLI end-to-end incl. missing-ref exit 1 and help listing.
- Docs `task-context-intent-integration.test.mjs` — 17 assertions on the boundary
  narrative + CHANGELOG + this packet.
- Full keyless 9-command gate + CLI smoke (assess + plan review with
  `--task-context-ref`, artifacts valid, source unchanged).

## INTENTIONALLY UNTOUCHED

Assessment readiness policy; blocker factory; actionability status/findings policy;
PreparedIntentPlan approval/proof; WorkOrder / VerificationPlan handoff; Circe
projection; artifact schemas + registration; `intent prepare` flags; version.

## RISKS / FOLLOW-UP

- Relevance is lexical/path-based, not semantic — a genuinely relevant report with no
  token/path overlap may be recorded `not-relevant` in `latest` mode. Mitigation:
  `--task-context-ref` forces explicit use. Follow-up: a future embedding-backed
  relevance pass (out of scope here).
- Recommended next slice: **TaskContextReport Intent Integration Safety Review**.

## NEXT STEP

Ship slice 171. Then run the **TaskContextReport Intent Integration Safety Review**
to audit the assess/plan-review integration against these boundaries before task
context is used in broader intent workflows.

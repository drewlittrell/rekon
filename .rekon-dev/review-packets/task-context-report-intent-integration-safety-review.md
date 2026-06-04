# Review Packet — TaskContextReport Intent Integration Safety Review

Slice 172 · strategy / safety-review batch · base `cc9f254`.

Reviews the slice-171 TaskContextReport intent integration end-to-end against the
actual shipped source. Verdict: safe/stable; additive boundary holds. No runtime or
source change in this batch.

## CHANGES MADE

- **NEW** `docs/strategy/task-context-report-intent-integration-safety-review.md` —
  13-section safety-review memo with all required boundary statements + surface /
  consumer / boundary / option tables.
- **NEW** `.rekon-dev/review-packets/task-context-report-intent-integration-safety-review.md`
  (this file).
- **NEW** `tests/docs/task-context-report-intent-integration-safety-review.test.mjs`
  (31 assertions).
- Cross-ref banners + CHANGELOG/README narrative entry across the task-context +
  intent surface. Docs only; no source touched.

## PUBLIC API CHANGES

None. No type, artifact, schema, CLI command, flag, or version change. Documentation
and a docs test only.

## PURPOSE PRESERVATION CHECK

TaskContextReport's purpose is task-shaped *context* — a proposal of relevant files,
capabilities, do-not-touch zones, and verification hints — never proof, approval,
execution, or source mutation. This review confirms the slice-171 integration
preserves that:

- task context helps humans and agents reason about an intent;
- task context can improve `matchedContext` and revision guidance;
- deterministic evidence and proof artifacts remain authoritative;
- task context never performs work;
- task context never approves work.

The review found the additive boundary intact across the selector, both intent
builders, the prepare lineage, and the CLI. **TaskContextReport is proposal/context,
not proof.** **TaskContextReport consumption is explicit, not automatic.**

## CODEBASE-INTEL ALIGNMENT

The integration mirrors the old codebase-intel "context packet" role: retrieval /
task-shaped context is supplied to a planning surface as *input to reasoning*, never
as the authority that gates the work. As in classic, the deterministic spine
(readiness gates, actionability evaluation, proof artifacts) stays authoritative;
task context is the codebase-intel context-packet analogue layered on top, opt-in and
additive. This matches the slice-170 decision (Option B) and the slice-150 semantic-
file-context precedent.

## IMPLEMENTATION REVIEWED

`task-context.ts` (selector), `intent-assessment-report.ts` +
`intent-plan-actionability-report.ts` (builder enrichment), `prepared-intent-plan.ts`
(no reference), `cli/src/index.ts` (resolver + flags on assess/plan-review only;
prepare untouched), `capability-model/src/index.ts` + `kernel-repo-model/src/index.ts`
(exports). Grounded by direct read, not summary.

## SELECTION MODEL REVIEW

`selectTaskContextReports` is pure (no fs/providers/clock). Boundary all-false gate
rejects non-clean reports to `staleReports` (never consumed). Relevance scores path
overlap / plan-text mention / lexical overlap; `latest` uses the single most relevant,
`explicit` uses every boundary-clean named report (warns on zero relevance). Empty-
context and `retrieval-low-signal` reports are consumed with a warning, never failed.
`missingRefs` pass through to `missingReports` + warning. **Stale or irrelevant task
context is not consumed silently. Missing explicit task-context refs fail cleanly.**

## INTENT ASSESSMENT REVIEW

Enrichment runs after the `readiness` block + `blockers` are decided; it only appends
to `matchedContext.paths` / `matchedContext.capabilities` and low-severity warnings.
Readiness is never flipped, no blocker is suppressed, no proof gate is satisfied.
**IntentAssessmentReport readiness remains governed by existing readiness gates.**

## PLAN ACTIONABILITY REVIEW

Enrichment appends to `revisionPrompt` + `normalizationTrace.warnings` after `status`
and `findings` are decided (the source-grounded recheck feeds findings *before*
status). No finding added/removed; no status changed; hints rendered as hints.
**IntentPlanActionabilityReport status remains governed by plan actionability, not
task context alone.** **Verification hints remain hints, not executed commands.**

## PREPARED PLAN LINEAGE REVIEW

`prepared-intent-plan.ts` has no task-context reference; `intent prepare` takes
`--assessment` / `--actionability-report` only. **PreparedIntentPlan receives
TaskContextReport only by lineage, not direct proof. intent prepare has no direct
task-context flag.**

## CLI REVIEW

`--task-context latest|<ref>` opt-in on assess + plan review only; resolver throws on
an unresolved named ref; `--json` adds `taskContext` summary; human adds one line; no
flag → byte-identical prior output. **TaskContextReport enrichment is additive after
readiness/status decisions.**

## BOUNDARY REVIEW

No approval, no command execution, no source writes, no WorkOrder / VerificationPlan,
no Circe, no PreparedIntentPlan creation by task context; `intent:go` deferred. Do-
not-touch stays a constraint; `retrieval-low-signal` stays a warning.

## RECOMMENDATION

**TaskContextReport Intent Integration is safe/stable.** Proceed to
**TaskContextReport Intent Dogfood** (alternative: Intent Planning UX / Context
Quality Fix only on a concrete finding — none here).

## TESTS / VERIFICATION

- Docs test `task-context-report-intent-integration-safety-review.test.mjs` — 31
  assertions (headings, all boundary statements, 4 tables, CHANGELOG, packet).
- Full keyless 9-command gate (typecheck, test, build, diff-check, package-exports,
  license, publish-dry-run, install-smoke, install-tarball-smoke). No CLI smoke
  required (strategy-only).

## INTENTIONALLY UNTOUCHED

`task-context.ts`; both intent builders; `prepared-intent-plan.ts`; the CLI; artifact
schemas + registration; readiness/actionability policy; approval/proof; Circe
projection; versions. This batch is review + docs only.

## RISKS / FOLLOW-UP

- Relevance remains lexical/path-based (a genuinely relevant report with no token/path
  overlap may be recorded `not-relevant` in `latest` mode); `--task-context-ref`
  forces explicit use. A future embedding-backed relevance pass is out of scope.
- The dogfood (next slice) will exercise practical usefulness on realistic tasks.

## NEXT STEP

Ship slice 172 (review + docs). Then run **TaskContextReport Intent Dogfood**:
`context task` → `intent assess --task-context` → `intent plan review --task-context`
→ `plan answer` → `prepare` → approve/status/handoff, evaluating context usefulness
with no automatic consumption, no approval by context, no execution, no source writes,
no intent:go.

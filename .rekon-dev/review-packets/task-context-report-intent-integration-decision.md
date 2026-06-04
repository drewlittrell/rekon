# Review Packet — TaskContextReport Intent Integration Decision (slice 170)

Base `18086b1`. Strategy / architecture decision batch. Decision-only — no source
change, no runtime behavior change, no new artifact, no CLI command.

## CHANGES MADE

- `docs/strategy/task-context-report-intent-integration-decision.md` (NEW) — the
  decision memo (13 required headings, option/consumer/mapping/boundary tables, all
  17 decision questions answered).
- `.rekon-dev/review-packets/task-context-report-intent-integration-decision.md`
  (NEW) — this packet.
- `tests/docs/task-context-report-intent-integration-decision.test.mjs` (NEW, 22
  assertions).
- Cross-ref updates to the TaskContextReport doc set, the intent concept docs,
  releases, roadmaps, README, CHANGELOG.

## PUBLIC API CHANGES

None. No type, artifact, CLI command, or flag changed. The memo *describes* a future
opt-in CLI surface (`--task-context latest|<ref>` on `rekon intent assess` /
`rekon intent plan review`) but implements nothing.

## PURPOSE PRESERVATION CHECK

- Original problem: raw retrieval is not enough; TaskContextReport turns graph +
  retrieval + operator constraints into task-shaped context; now that quality is
  acceptable it should feed intent planning — without confusing context with proof
  or planning approval.
- Product guarantee preserved: TaskContextReport may improve context and plan
  grounding but remains proposal/context; deterministic evidence and proof artifacts
  remain authoritative; verification hints remain hints, not executed commands;
  do-not-touch zones become constraints/context, not enforcement; no approval,
  command execution, source writes, WorkOrder, VerificationPlan, Circe, or intent:go.

## SOURCE REVIEW

Grounded (read-only) in the shipped TaskContextReport surface and the intent
consumers. Confirmed actual field names:
- `IntentAssessmentReport.{ readiness.status (ready-for-prepare | blocked |
  needs-review | insufficient-context | stale-context), matchedContext{ systems,
  capabilities, steps, paths }, blockers[], warnings[], missingContext[] }`.
- `IntentPlanActionabilityReport.{ normalizedPhases[], findings[],
  elicitationQuestions[], revisionPrompt{ prompt, requiredChanges[] }, evidenceGates[],
  normalizationTrace, status, summary, boundaries }`.
- `PreparedIntentPlan.{ approval{ status, proof{ intentAssessmentReportRef,
  assessmentReadiness, … } }, header.inputRefs[] }` — lineage via `header.inputRefs`
  + `approval.proof.intentAssessmentReportRef`.
- CLI commands exact: `rekon intent assess`, `rekon intent plan review`,
  `rekon intent prepare` (also `intent context prepare`, `plan answer`, `approve`,
  `status`).
- No field-name differences from the WO's expectations were found; the WO's field
  names match the source.

## CURRENT TASK CONTEXT SURFACE

`task{text,paths,goal?}`, `contextItems[]` (operator_input / deterministic_graph /
semantic_file_understanding / embedding_retrieval; with scoreBand + evidenceRefs),
`graphNeighborhood{nodes,claims}`, `doNotTouch[]`, `verificationHints[]` (command +
free-form `manual-verification`), CLI `warnings[]`, all-false `boundaries`.

## OPTIONS CONSIDERED

A no-integration (reject/defer), **B explicit assess + plan-review consumption
(SELECT)**, C automatic latest (reject — stale/surprise), D direct prepare consume
(reject/defer — lineage only), E context as proof (reject).

## INTENT ASSESSMENT CONSUMPTION

May enrich matchedContext, add warnings, surface do-not-touch as non-goal notes.
Must not suppress deterministic blockers, satisfy proof gates, mark readiness
ready-for-prepare by itself, or replace deterministic evidence artifacts.

## PLAN ACTIONABILITY CONSUMPTION

May add revisionPrompt context, reduce redundant path elicitation questions, add
do-not-touch constraints/non-goals, add verification hints to guidance, ground
normalizedPhases. Must not make a weak plan actionable by itself, invent paths,
execute hints, convert manual-verification hints to command/evidence requirements,
or auto-approve.

## PREPARED PLAN LINEAGE

Prepare consumes assessment/actionability reports, not TaskContextReport. The report
appears in PreparedIntentPlan only via `header.inputRefs` lineage; it must not be
consumed directly, satisfy `approval.proof`, or enable WorkOrder / VerificationPlan
handoff.

## STALE / RELEVANCE MODEL

Consume only on explicit ref / explicit latest, boundaries all false, and relevance
to the current goal/plan. Stale/mismatched → warn, no silent consumption, no
readiness/actionability improvement. `retrieval-low-signal` → warn, do not block.
No contextItems → warn, do not fail.

## CLI SURFACE

Future opt-in: `rekon intent assess --task-context latest|<ref>`,
`rekon intent plan review --task-context latest|<ref>`. `rekon intent prepare` gains
no flag.

## BOUNDARY MODEL

proposal/context not proof; explicit not automatic; no approval; does not replace
deterministic evidence; no command execution; no source writes; no WorkOrder /
VerificationPlan; no Circe; prepare by lineage only; intent:go deferred.

## TESTS / VERIFICATION

- New docs test (22 assertions): headings, 14 boundary statements, 4 tables,
  CHANGELOG mention, packet PURPOSE PRESERVATION CHECK.
- Full keyless 9-command gate (decision-only; no CLI smoke required).

## INTENTIONALLY UNTOUCHED

All intent source (`intent-assessment-report.ts`, `intent-plan-actionability-report.ts`,
`prepared-intent-plan.ts`, `intent-approval.ts`, `intent-status-transition.ts`), the
TaskContextReport builder/CLI, and all runtime behavior. No code changed.

## RISKS / FOLLOW-UP

- Risk: an implementation could over-trust task context. Mitigation: this memo pins
  context-only consumption, explicit opt-in, and the staleness/relevance gate before
  implementation begins.
- Follow-up: implement the opt-in flags + mapping, then a safety review.

## NEXT STEP

**TaskContextReport Intent Integration Implementation** — add the opt-in
`--task-context latest|<ref>` flags to `rekon intent assess` and `rekon intent plan
review`, with the field mapping and staleness gate above; still no approval, command
execution, source writes, WorkOrder / VerificationPlan, Circe, or intent:go.

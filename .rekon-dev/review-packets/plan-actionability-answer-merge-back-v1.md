# Review Packet — Plan Actionability Answer / Merge-Back (v1, slice 134)

## CHANGES MADE

- **kernel-repo-model** (`packages/kernel-repo-model/src/index.ts`): added additive
  types `IntentPlanAnswer`, `IntentPlanUnappliedAnswer`, `IntentPlanMergeTrace`, and
  an optional `answerTrace?: IntentPlanMergeTrace` field on
  `IntentPlanActionabilityReport`. Extended `createIntentPlanActionabilityReport`
  (explicit `answerTrace` normalization block, mirroring the existing `request`
  block) and `validateIntentPlanActionabilityReport` (additive `answerTrace`
  validation; reports without it still validate). Boundaries stay validator-forced
  all-false.
- **capability-model**
  (`packages/capability-model/src/intent-plan-actionability-report.ts`): extracted
  the shared `evaluatePlanPhases` evaluator from `buildIntentPlanActionabilityReport`
  and added `buildAnsweredIntentPlanActionabilityReport` plus answer-shape parsers.
  Taught `evaluatePhase` that an explicit `clarification:` constraint clears
  ambiguity. Barrel re-exports the new helper and types.
- **cli** (`packages/cli/src/index.ts`): added the `rekon intent plan answer`
  branch, the usage line, the workflow list entry, and the canonical-flow update.

## PUBLIC API CHANGES

- New exported helper `buildAnsweredIntentPlanActionabilityReport(input)` and types
  `IntentPlanAnswerInput`, `IntentPlanAnswerBlocker`, `IntentPlanAnswerBlockerCategory`,
  `IntentPlanAnswerResult`, `BuildAnsweredIntentPlanActionabilityReportInput` from
  `@rekon/capability-model`.
- New kernel types `IntentPlanAnswer`, `IntentPlanUnappliedAnswer`,
  `IntentPlanMergeTrace`; new optional `IntentPlanActionabilityReport.answerTrace`.
- New CLI command `rekon intent plan answer`.
- All changes are additive; no existing signature changed.

## PURPOSE PRESERVATION CHECK

Restores the classic `askPreparedPhaseQuestions` / `answerPreparedPhaseQuestions` /
`mergeElicitationAnswersIntoDraft` loop: review asks, answer merges and re-scores,
the revision feeds prepare. The loop is deterministic and evidence-bound, matching
the substrate's "prepare, prove, package, export" purpose without crossing into
execution.

## SOURCE REVIEW

The shipped evaluator (`evaluatePhase`) keys findings/questions off the phase id, so
question ids are stable across revisions. `phaseText` includes source-evidence
excerpts, so the original ambiguous wording (e.g. a `TODO`) persists; merge cannot
and must not erase it. The clarification-constraint signal is the minimal, correct
way to let an answered report clear ambiguity without rewriting source evidence.

## ANSWER TRACE MODEL

`answerTrace = { sourceReportRef, answers[], appliedRequirements[], unappliedAnswers[],
method: "deterministic" }`. Additive and optional; the validator accepts reports
with or without it.

## ANSWER VALIDATION MODEL

Blocker categories: `missing-report`, `missing-report-ref`, `unknown-question`,
`empty-answer`, `invalid-answer-shape`, `duplicate-answer`, `unsupported-requirement`,
`no-applicable-phase`. Any blocker blocks the whole merge; no revision is written.
Shapes are parsed conservatively; a `paths` answer must contain a path-like token but
file existence is not required.

## MERGE-BACK MODEL

Additive merge into phase-draft copies: dedupe, preserve order / source evidence /
non-goals / existing constraints. Sentence → objective or clarification; bullets →
deliverables / acceptance / constraints by requirement; paths → touchedPaths;
command-or-artifact → verificationCommands + evidenceArtifacts. Redundant answers are
recorded as unapplied, never invented.

## RE-EVALUATION MODEL

`evaluatePlanPhases` (shared with the initial review) re-runs over the merged drafts
and regenerates findings, questions, revision prompt, evidence gates, summary, and
status. No duplicated actionability logic.

## CLI SURFACE

`rekon intent plan answer --report <ref> --answer <qid>=<a> [--answer ...] [--answers
<json>] [--answered-by <name>] [--root <path>] [--json]`. Blocked → non-zero exit, no
report. Merged → one new report; JSON success carries a 9-field all-false boundary
block and a summary `{ findings, questions, appliedAnswers, unappliedAnswers }`.

## PREPARE INTEGRATION PATH

An answered revision that reaches `actionable` is a normal
`IntentPlanActionabilityReport` and can be passed to
`rekon intent prepare --actionability-report <ref>` exactly like an initial review.

## BOUNDARY MODEL

The 13 boundary statements in
[plan-actionability-answer-merge-back-implementation.md](../../docs/strategy/plan-actionability-answer-merge-back-implementation.md):
reads the report; no source-plan edit; no in-place source-report mutation; exactly one
new revision; no revised markdown plan; no separate `IntentPlanAnswerSet`; deterministic
(no LLM-only) merge; no auto-approve; no PreparedIntentPlan / WorkOrder /
VerificationPlan / VerificationRun / VerificationResult; no command execution or source
writes; no Circe; no intent:go.

## TESTS / VERIFICATION

`tests/contract/intent-plan-answer-merge-back.test.mjs` (25 blocks / 51 assertions) +
`tests/docs/plan-actionability-answer-merge-back.test.mjs` (15 assertions). Full
9-command gate green. CLI smoke: rough plan → review (blocked, 8 questions) → answer
(actionable, source byte-identical) → unknown-question blocks with exit 1.

## INTENTIONALLY UNTOUCHED

`intent prepare`, approval, status, work-order, verification, bundle, and Circe
projection surfaces. No version bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- The clarification-constraint ambiguity signal also applies to the initial review,
  but no realistic plan authors a literal `clarification:` constraint, so existing
  behavior is unchanged (all existing tests pass).
- Follow-on: Plan Actionability Answer / Merge-Back Safety Review.

## NEXT STEP

Recommend a **Plan Actionability Answer / Merge-Back Safety Review**. Do not start it
without a new confirmed Work Order against the new SHA.

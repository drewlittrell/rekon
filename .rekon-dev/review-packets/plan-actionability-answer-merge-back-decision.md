# Review Packet — Plan Actionability Answer / Merge-Back Decision

Slice 133 on the intent-spine track. Strategy / architecture decision batch (docs-only;
no runtime change). Decides how Rekon restores the classic `askPreparedPhaseQuestions` /
`answerPreparedPhaseQuestions` loop. Follows Intent Prepare Actionability Integration
Safety Review at `08bbea6`.

## CHANGES MADE

- New strategy memo `docs/strategy/plan-actionability-answer-merge-back-decision.md`
  (13 headings; selects Option B; 4 tables; 13 boundary statements; 19 decision questions
  answered).
- New docs test `tests/docs/plan-actionability-answer-merge-back-decision.test.mjs`
  (22 assertions).
- This review packet.
- Cross-references across 10 intent-spine docs + CHANGELOG + README (and the two
  roadmaps).

No source, no new artifact, no runtime change.

## PUBLIC API CHANGES

None. Decision-only. No kernel type / validator / factory change, no CLI change, no
helper change. The memo *describes* a future `rekon intent plan answer` command and a
future additive `answerTrace` field; neither is implemented in this batch.

## PURPOSE PRESERVATION CHECK

The old codebase-intel plan compiler was iterative: questions → answers → merged draft →
re-review → actionable report → prepare (`askPreparedPhaseQuestions` /
`answerPreparedPhaseQuestions` / `mergeElicitationAnswersIntoDraft`). Rekon restored the
critique half (slice 129 review → `IntentPlanActionabilityReport` with
`elicitationQuestions`) and wired actionable reports into prepare (slice 131), but cannot
yet accept answers and merge them back. This decision pins the missing half while
preserving the product guarantee: answers are explicit and traceable to questions; answers
merge into a new report revision, not an in-place mutation; merge-back never edits source
plan files; merge-back never approves; merge-back executes no commands and writes no
source; weak answers remain non-actionable with further questions.

## CODEBASE-INTEL ALIGNMENT

Old references captured in the slice-128 parity decision: `askPreparedPhaseQuestions`,
`answerPreparedPhaseQuestions`, `PreparedPhaseElicitationQuestion`,
`PreparedPhaseElicitationAnswer`, `PreparedPhaseElicitationState`,
`mergeElicitationAnswersIntoDraft`. Rekon already computes the equivalent of the question
set (`elicitationQuestions` with stable ids `question-<phaseId>-<requirement>` and an
`answerShape`); this decision restores `answerPreparedPhaseQuestions` +
`mergeElicitationAnswersIntoDraft` as a single deterministic merge that emits a new report
revision rather than a mutable elicitation state object.

## CURRENT GAP

Grounded at `08bbea6` (`packages/capability-model/src/intent-plan-actionability-report.ts`,
`@rekon/kernel-repo-model`): the report carries `status`, `normalizedPhases`, `findings`,
`elicitationQuestions`, `revisionPrompt`, `evidenceGates`, `sourcePlan`,
`normalizationTrace`, `boundaries`. Questions are
`{ id: "question-<phaseId>-<requirement>", phaseId, requirement, question, answerShape,
whyAsked, priority }`; `answerShape` ∈ sentence / bullets / paths / command-or-artifact.
The inputs for merge-back already exist; only a command to consume answers and re-review
is missing.

## OPTIONS CONSIDERED

A critique-only (rejected); **B new report revision (selected)**; C separate
`IntentPlanAnswerSet` artifact (deferred); D mutate existing report (rejected); E rewrite
source plan (deferred — needs source-write policy); F LLM-only merge-back (rejected —
deterministic baseline first).

## REPORT REVISION MODEL

New `IntentPlanActionabilityReport` artifact citing the source report by ref; merged
`normalizedPhases`; recalculated `findings` / `elicitationQuestions` / `revisionPrompt` /
`evidenceGates`; updated `status`; preserved `sourcePlan`; additive `answerTrace`
(`IntentPlanMergeTrace`); `boundaries` all-`false`. Preferred field is `answerTrace`;
fallback is `normalizationTrace.warnings` / `revisionPrompt` / `findings`.

## ANSWER SHAPE MODEL

sentence → objective / ambiguity clarification; bullets → deliverables / acceptance
criteria / constraints; paths → touchedPaths; command-or-artifact → verificationCommands /
evidenceArtifacts. Validity: question id must exist; answer non-empty; shape must match;
invalid/unsupported answers stay unapplied + produce a finding; answers cannot erase
source evidence or remove non-goals.

## MERGE-BACK MODEL

Deterministic for v1. Resolve target phase by `phaseId`, target field by
`requirement`/`answerShape`, append answer-derived material additively. Record applied
answers (`answerTrace.answers` + `appliedRequirements`) and rejected answers
(`unappliedAnswers` with reasons). Semantic merge deferred (Option F).

## RE-EVALUATION MODEL

Re-run per-phase actionability checks on merged drafts; preserve prior source evidence;
regenerate findings/questions/revisionPrompt; recalculate status (actionable /
needs-revision / blocked). Incomplete answers keep the report needs-revision or blocked.

## CLI MODEL

Future `rekon intent plan answer --report <ref> --answer <question-id>=<answer> ...
[--answers <json>] [--answered-by <name>] [--json]`. Blocked output `{ status:"blocked",
reason:"invalid-answer", blockers:[...] }`; success output cites the new artifact + the
source report + a summary + all-`false` boundaries.

## BOUNDARY MODEL

New report revision (not mutation); no source-plan write; no PreparedIntentPlan / WorkOrder
/ VerificationPlan / VerificationRun / VerificationResult; no command execution; no source
writes; no Circe; no auto-approval; `intent:go` deferred.

## TESTS / VERIFICATION

New docs test asserts the memo headings, the Option B selection, the 13 boundary
statements, the 4 tables, the CHANGELOG mention, and this packet's PURPOSE PRESERVATION
CHECK. Full 9-command gate (typecheck / test / build / git diff --check /
audit-package-exports / audit-license / publish-dry-run / install-smoke /
install-tarball-smoke). No CLI smoke (decision-only).

## INTENTIONALLY UNTOUCHED

All runtime code: the report builder, the kernel `IntentPlanActionabilityReport` type /
factory / validator, `rekon intent plan review`, `rekon intent prepare`, and every other
command. No new artifact, no version bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- The additive `answerTrace` field is a future implementation choice; the decision prefers
  it but allows a fallback to existing fields if adding one is deemed too much.
- A standalone `IntentPlanAnswerSet` artifact (Option C) and a bounded semantic merge
  (Option F) remain available as later, separately-decided slices.
- Source-plan export (Option E) needs its own write-policy decision.

## NEXT STEP

Confirm and run **Plan Actionability Answer / Merge-Back Implementation** against the SHA
produced by this batch.

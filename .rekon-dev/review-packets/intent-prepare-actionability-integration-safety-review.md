# Review Packet — Intent Prepare Actionability Integration Safety Review

Slice 132 on the intent-spine track. Strategy / safety-review batch (docs-only; no
runtime change). Re-reads the slice-131 integration between `IntentPlanActionabilityReport`
and `rekon intent prepare` at `73c2519` and declares it safe/stable.

## CHANGES MADE

- New strategy memo `docs/strategy/intent-prepare-actionability-integration-safety-review.md`.
- New docs test `tests/docs/intent-prepare-actionability-integration-safety-review.test.mjs`
  (23 assertions).
- This review packet.
- Cross-references across 13 intent-spine docs + CHANGELOG + README (and optionally the
  two roadmaps).

No source, no tests besides the docs test, no runtime change.

## PUBLIC API CHANGES

None. This is a review-only batch. No kernel type / validator / factory change, no CLI
change, no helper signature change.

## PURPOSE PRESERVATION CHECK

The old codebase-intel system compiled, critiqued, and interrogated plans before
approval; Rekon restored a report-only plan compiler (slice 129), safety-reviewed it
(slice 130), and wired it into `intent prepare` (slice 131). This review confirms the
wiring preserved the product guarantee: non-actionable plans produce revision guidance,
not a `PreparedIntentPlan` handoff; actionable reports can structure a `PreparedIntentPlan`;
prepare remains read/generate only; prepare never auto-approves; and downstream handoff
still requires explicit approval and work-ready status. Verified against the shipped code,
not just the slice-131 docs.

## CODEBASE-INTEL ALIGNMENT

The old plan compiler paired plan critique with an elicitation loop
(`askPreparedPhaseQuestions` / `answerPreparedPhaseQuestions`). Rekon now produces
elicitation questions (in the report) and blocks non-actionable preparation, but the
answer/merge-back half of the loop is not yet built. This review names
**Plan Actionability Answer / Merge-Back Decision** as the next slice to reach parity,
keeping the report-only / no-source-write boundary until a later explicitly-approved
slice.

## IMPLEMENTATION REVIEWED

Grounded at `73c2519`:
- `prepared-intent-plan.ts`: `PreparedIntentActionabilityReportLike`; the two optional
  additive inputs; `mapReportPhaseKind` (unknown → modify); the report-ref push into
  `refList`; the `useReportPhases` override that rewrites only `phases` +
  `verificationRequirements`, never `approval` / `status`.
- `cli/src/index.ts` intent-prepare branch: flag resolution + alias; the
  type check; the non-actionable blocked `return` (before any plan write); the
  `inputRefs` array including the report ref; the `buildPreparedIntentPlan` call; success
  output; `usage()` + flow line.
- The slice-131 contract test (27) + docs test (12).

## NON-ACTIONABLE REPORT PATH REVIEW

The CLI's non-actionable block runs before `buildPreparedIntentPlan` and `return`s:
`process.exitCode = 1`; JSON `{ status:"blocked", reason:"plan-actionability-<status>",
actionabilityReport, summary:{findings,questions}, revisionPrompt, boundaries(9× false) }`;
human output ends with the explicit no-downstream sentence. No `PreparedIntentPlan` is
written; `revisionPrompt` is preserved verbatim.

## ACTIONABLE REPORT PATH REVIEW

`useReportPhases` requires `status.value === "actionable"`, at least one normalized draft,
and an implementation-bearing plan. The override replaces only `phases` and
`verificationRequirements`; the approval envelope, proof record, and `status.value` are
unchanged. A needs-review draft with an actionable report stays `needs-review` and
unapproved. Non-actionable reports never reach the helper.

## PREPARED PLAN MAPPING REVIEW

order → zero-padded phase ids; kind → `mapReportPhaseKind` (unknown → modify); objective →
goal (fallback request goal); touchedPaths → paths; verificationCommands / evidenceArtifacts
→ verificationRequirements; deliverables / acceptance criteria → phase constraints; report
ref → `refList` → `header.inputRefs` + phase / requirement `sourceRefs`.

## CLI REVIEW

`--actionability-report` canonical, `--plan-actionability-report` alias; type-checked to
`IntentPlanActionabilityReport`; absent flag = backward-compatible; success output surfaces
the ref; help + flow updated. No execution, no source writes, no Circe.

## BOUNDARY REVIEW

No PreparedIntentPlan on the blocked path; no WorkOrder / VerificationPlan / VerificationRun
/ VerificationResult on either path; no command execution; no source writes; no Circe; no
auto-approval; `intent:go` deferred; answer/merge-back deferred. Confirmed by re-reading the
shipped code and by the slice-131 contract test + CLI smoke evidence.

## RECOMMENDATION

Intent Prepare Integration With Actionability Report is **safe/stable** (no blocker).
Default next slice: **Plan Actionability Answer / Merge-Back Decision**. Alternative:
**Fresh Repo Intent Handoff End-to-End Safety Review** (deferred).

## TESTS / VERIFICATION

New docs test asserts the memo's headings, the 15 required statements, the 4 tables, the
CHANGELOG mention, and the review packet's PURPOSE PRESERVATION CHECK. Full 9-command gate:
typecheck, test, build, `git diff --check`, audit-package-exports, audit-license,
publish-dry-run, install-smoke, install-tarball-smoke. No CLI smoke required (strategy-only).

## INTENTIONALLY UNTOUCHED

All runtime code: `prepared-intent-plan.ts`, the CLI intent-prepare branch, the kernel
`PreparedIntentPlan` type/factory/validator, `IntentPlanActionabilityReport`, approval
policy, and every other command. No version bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- Deliverables / acceptance criteria live in phase constraints (no dedicated kernel field);
  documented limitation carried forward from slice 131.
- The slice-129 parser can preserve a touched path with a trailing period in some prose
  cases; pre-existing and out of scope here.
- Answer / merge-back remains unimplemented — the recommended next slice.

## NEXT STEP

Confirm and run **Plan Actionability Answer / Merge-Back Decision** against the SHA
produced by this batch.

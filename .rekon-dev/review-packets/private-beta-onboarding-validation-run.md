# Review Packet — Private Beta Onboarding Validation Run

**Slice:** `private-beta-onboarding-validation-run`
**Sequence position:** First post-quickstart
validation batch. Follows the Private Beta
Onboarding Quickstart slice + the
Private Beta Support Playbook slice.
**Batch type:** Strategy / docs / tests only.
**Outcome:** `intake-blocked` — operator did
not supply the required target repo /
representative path / description /
install-build hint / sensitive paths fields,
so per the work order's explicit stop
condition this batch ships a short intake
request memo instead of a full validation
report.
**Strict no-go list:** no npm publish, no
version bump, no git tag, no GitHub Release,
no runtime behaviour change, no new CLI
command, no new helper, no schema change, no
new artifact type, no new permission, no new
role, no workflow YAML, no validator profile
change, no GitHub API call, no `package.json`
/ `package-lock.json` mutation, no
source-file mutation in any
`packages/*/src/*`, no mutation of any
operator repo (none was supplied), no
network I/O, no new branch.

## CHANGES MADE

1. **New
   `docs/beta/private-beta-onboarding-validation-intake-request.md`**
   — short intake request memo recording the
   work order's stop condition, the
   pre-validation gate results on commit
   `8771cf5`, the required intake
   questionnaire (5 fields), operator
   selection guidance, anonymization
   posture, what happens next, and the
   `intake-blocked` outcome classification.
   Required verbatim statements all present:
   *"This batch does not publish to npm."*,
   *"This batch does not change package
   versions."*, *"This batch does not create
   a git tag."*, *"This batch does not
   create a GitHub Release."*, *"The
   validation run, when executed, used a
   temp copy of a non-Rekon repository."*,
   *"Rekon artifacts remain canonical;
   GitHub dry-runs are downstream previews."*
2. **New review packet (this file)** with
   PURPOSE PRESERVATION CHECK + all 14
   required sections.
3. **New docs test
   `tests/docs/private-beta-onboarding-validation-run.test.mjs`**
   with all 16 work-order-required
   assertions, adapted for the
   intake-blocked mode (the validation
   report file does not exist — the intake
   request memo is the canonical artifact
   this batch produces).
4. **Supporting doc cross-links** updated:
   `docs/beta/private-beta-onboarding-quickstart.md`,
   `docs/beta/private-beta-support-playbook.md`,
   `docs/beta/private-beta-bug-report-template.md`,
   `docs/strategy/no-npm-beta-distribution-policy.md`,
   `docs/strategy/roadmap.md`,
   `docs/strategy/classic-behavior-roadmap.md`,
   `README.md`, `CHANGELOG.md`.

## PUBLIC API CHANGES

**None.** This batch is strategy / docs /
tests only. No type added, removed, renamed,
narrowed, or exported. No CLI surface added
or modified. No runtime behaviour change.
No schema change. No new artifact type. No
new permission. No new role. No workflow
YAML installed. No `package.json` mutation
in any workspace.

## PURPOSE PRESERVATION CHECK

Original problem (per the work order):

> The onboarding quickstart exists, but it
> has not yet been followed end-to-end by
> an operator against a non-Rekon repo.
> Private beta support quality depends on
> whether a real user can follow the docs
> without hidden tribal knowledge. Any
> confusing step should be captured before
> broader private beta onboarding.

Stop condition (per the work order):

> If no non-Rekon target repo is provided,
> stop with intake request.

This batch executes the stop condition
faithfully: no target was supplied, so no
target-side run was performed and no fake
target was invented. The intake-request
memo preserves the full validation surface
for the next batch by:

- Listing the five required intake fields
  verbatim from the work order so the
  operator can answer them in a single
  message.
- Pinning the work order's rules on the
  target (must not be Rekon, must run
  against temp copy, must not mutate the
  original target).
- Pinning the work order's anonymization
  posture (named sensitive paths, neutral
  target label, no full host-side paths in
  any artifact).
- Pinning the work order's outcome
  classification matrix (`pass` /
  `pass-with-known-limitations` /
  `blocked`) and adding `intake-blocked`
  as the explicit pre-execution state for
  this batch.
- Capturing the pre-validation gate
  results on commit `8771cf5` so the
  next batch starts from a verified Rekon
  state.

Product guarantees preserved (each pinned
verbatim in the memo + asserted by the
docs test):

- **No npm publish during beta.** Memo
  pins *"This batch does not publish to
  npm."* The no-NPM private-beta posture
  from the
  [No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md)
  is unchanged.
- **No version bump.** Memo pins *"This
  batch does not change package
  versions."* Rekon remains at
  `0.1.0-beta.0`.
- **No git tag, no GitHub Release.** Memo
  pins both verbatim.
- **Validation run uses temp copy of
  non-Rekon repo.** Memo pins this for
  the eventual validation execution; the
  current intake-blocked batch did not
  mutate any operator repo because no
  target was supplied.
- **Rekon artifacts canonical; GitHub
  dry-runs downstream previews.** Memo
  pins this verbatim, continuing the
  canonical contract from the
  [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)
  and the
  [Private Beta Support Playbook](private-beta-support-playbook.md).

## CODEBASE-INTEL ALIGNMENT

The intake request memo aligns with the
existing operator-support surface:

- **Quickstart is the canonical onboarding
  reference.** The memo links to it for
  install / temp-copy / first-scan /
  publication / path-freshness / optional
  verification / dry-run-GitHub flows.
- **Support playbook is the canonical
  blocker / acceptable-outcome reference.**
  The memo links to it for the redaction
  policy + blocker taxonomy.
- **Bug-report template is the canonical
  artifact-attachment reference.** The
  memo links to it for the reporting flow
  the validation run will produce if any
  blocker is discovered.
- **Real-repo cohort intake-request memo
  is the precedent for this pattern.** The
  earlier
  [Real-Repo Dogfood Cohort Intake Request](../strategy/real-repo-cohort-intake-request.md)
  established the intake-blocked posture
  for the cohort-execution batch; this
  memo follows the same shape.

No assumption about behaviour that does
not already ship.

## TARGET REPOSITORY

**Not supplied.** The validation run was
not executed because the operator did not
provide a target repository in the work
order prompt. The memo documents the five
required intake fields so the next batch
can run.

The work order's rules on the target are
preserved verbatim in the memo:

- Target must not be Rekon itself.
- Run against a temp copy only.
- Do not mutate the operator's original
  repo.
- If no target repo is provided, stop
  after writing a short intake request.
  Do not invent a target.

## COMMAND MATRIX

**No target-side commands were executed.**
The pre-validation gate (mandatory before
target-side work) ran on commit `8771cf5`
and is recorded in the memo:

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` | pass (1927 / 1 skipped) |
| `npm run build` | pass |
| `git diff --check` | clean |
| `node scripts/audit-package-exports.mjs` | pass (20 packages, no issues) |
| `node scripts/audit-license.mjs` | pass (20 packages, Apache-2.0 match) |
| `node scripts/publish-dry-run.mjs` | pass (20 packages, no publish attempted) |
| `node scripts/install-smoke.mjs` | pass |
| `node scripts/install-tarball-smoke.mjs` | pass (20 tarballs, 13 artifacts) |

## OUTPUT SUMMARY

**Not applicable.** No `rekon` command was
executed against a target, so no
`ObservedRepo`, `EvidenceGraph`,
`IntelligenceSnapshot`, `FindingReport`,
`FindingFilterReport`, `PathFreshnessReport`,
`VerificationPlan`, `VerificationRun`,
`VerificationResult`, or publication
artifact was produced.

The post-intake batch will produce these
artifacts inside the temp-copy target's
`.rekon/` directory + record their
publication IDs in the canonical
`docs/beta/private-beta-onboarding-validation-report.md`.

## QUICKSTART GAPS

**Not recorded this batch.** No quickstart
steps were executed against a target, so
no gaps could be observed. The next batch
will execute the full quickstart command
matrix verbatim and record any:

- confusing commands
- missing docs
- unclear outputs
- support-template gaps
- artifact-sharing risks

## SUPPORT TEMPLATE GAPS

**Not recorded this batch.** No bug report
was filed (no blockers observed), so no
support-template gaps were exercised. The
next batch will surface any gaps if the
validation run discovers a blocker the
template does not handle cleanly.

## OUTCOME CLASSIFICATION

**`intake-blocked`.**

The work order's classification matrix
defines three outcomes for an executed
validation run: `pass`,
`pass-with-known-limitations`, `blocked`.
This batch did not execute a validation
run, so none of those classifications
apply. The intake-request memo adds
`intake-blocked` as the explicit
pre-execution state and the docs test
asserts that this classification appears
in the memo's *Outcome Classification*
section.

`intake-blocked` is the right state because:

- Rekon side is verifiably ready (9
  pre-validation commands all pass on
  `8771cf5`).
- The blocker is operator input, not
  Rekon state.
- The work order's stop condition
  required this state when no target is
  supplied.

The next batch will produce one of
`pass` / `pass-with-known-limitations` /
`blocked` per the canonical matrix once
the operator answers the intake
questionnaire.

## TESTS / VERIFICATION

- `tests/docs/private-beta-onboarding-validation-run.test.mjs`
  — 16 assertions covering: intake-request
  memo exists, all required headings
  present, the six required verbatim
  statements present, intake questionnaire
  present with all five fields,
  pre-validation gate result table
  present, outcome classification recorded
  as `intake-blocked`, cross-links to
  quickstart + support playbook,
  CHANGELOG mentions the validation run,
  review packet exists with PURPOSE
  PRESERVATION CHECK heading.
- **Full 9-command verification gate**
  runs post-edit on commit, then again
  after ff-merge to primary main:
  `npm run typecheck`, `npm test`,
  `npm run build`, `git diff --check`,
  `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`,
  `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`.
- No new contract tests required — there
  is no new runtime helper, CLI,
  validator, or publisher in this batch.

## INTENTIONALLY UNTOUCHED

The following surfaces were **intentionally
not** modified in this batch:

- `packages/*/src/*` — no source change in
  any workspace.
- `packages/cli/src/*` — no new CLI
  command, no new flag.
- `packages/capability-docs/src/*` — no
  new publisher, no new builder.
- `packages/capability-verify/src/*` — no
  new runner behaviour.
- Any `package.json`,
  `package-lock.json`, or `tsconfig.json`
  — no dependency change, no version bump
  (Rekon remains at `0.1.0-beta.0`).
- `.github/workflows/*.yml` — no active
  workflow installed (workflow templates
  remain reference-only under
  `docs/examples/workflows/`).
- The artifact registry, schema set, and
  permission model — no change.
- `docs/beta/private-beta-onboarding-quickstart.md`
  body — only a single cross-link added
  pointing at the new intake-request memo;
  the canonical quickstart content is
  unchanged so the next validation batch
  is testing the same artifact this batch
  intake-blocked against.
- `docs/beta/private-beta-support-playbook.md`
  body — only a single cross-link added.
- `docs/beta/private-beta-bug-report-template.md`
  body — only a single cross-link added.
- Any operator repo — none was supplied,
  so no `mktemp -d` clone exists for this
  batch.

## RISKS / FOLLOW-UP

**Risks (all low):**

- *Stale intake on resume.* If the
  operator answers the intake
  questionnaire days or weeks later, the
  Rekon side may have advanced past
  `8771cf5`. Mitigation: the memo's
  *What Happens Next* section pins
  "confirm Rekon state still matches
  `HEAD = main = origin/main = 8771cf5`
  (or whatever the latest committed
  state is at that time) and re-run the
  full pre-validation gate" so the next
  batch always re-verifies before
  running any target-side command.
- *Operator picks Rekon as target.* The
  work order forbids this. Mitigation:
  the memo pins "Target must not be
  Rekon itself" in two places (Decision
  Summary + What The Operator Needs To
  Supply) and the docs test asserts the
  rule appears in the memo.
- *Operator supplies a sensitive
  target.* The redaction policy from the
  [Private Beta Support Playbook](private-beta-support-playbook.md)
  is the canonical reference; the memo
  references it explicitly in the
  *Anonymization Posture* section.

**Follow-up (next batch):**

- *Private beta onboarding validation
  run.* The post-intake validation
  batch. Required deliverables (per the
  work order) are
  `docs/beta/private-beta-onboarding-validation-report.md`,
  this review packet's namesake (the
  full validation review packet), and an
  extended docs test that asserts the
  full validation report structure.

## NEXT STEP

**Operator answers the intake
questionnaire** with the five required
fields:

```text
Target repo path:
Representative path inside target:
Target repo description:
Any expected install/build command:
Any sensitive paths or artifacts that must be anonymized:
```

The post-intake batch will then run the
full quickstart end-to-end against a
temp copy of the supplied target,
produce the canonical validation report,
classify the outcome, and update the
roadmaps with the result. The full
validation review packet at
`.rekon-dev/review-packets/private-beta-onboarding-validation-run.md`
will be re-written in that batch with the
real CHANGES MADE / OUTPUT SUMMARY /
QUICKSTART GAPS / SUPPORT TEMPLATE GAPS /
OUTCOME CLASSIFICATION sections.

Until the operator answers, the
validation track stays at
`intake-blocked`.

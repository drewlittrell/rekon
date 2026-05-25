# Review Packet — Private Beta Onboarding Validation Run

**Slice:** `private-beta-onboarding-validation-run`
**Sequence position:** Post-intake validation
batch. The prior intake-blocked batch shipped
the
[Private Beta Onboarding Validation Intake
Request](../../docs/beta/private-beta-onboarding-validation-intake-request.md);
this batch runs the validation end-to-end
against the operator-authorised target and
produces the canonical
[Private Beta Onboarding Validation Report](../../docs/beta/private-beta-onboarding-validation-report.md).
**Batch type:** Strategy / docs / tests only.
**Outcome:** `pass-with-known-limitations`.
The quickstart was followed verbatim against
a temp copy of one non-Rekon target
(anonymized as `target-1`). All required
first-scan commands ran without crashing.
`artifacts validate` returned `valid: true`.
Path freshness produced `unknown` on the
first run (no baseline) and `fresh` on the
second run (295 / 295 paths). The optional
verification chain ran honestly — all 3
commands recorded `failed` because the
temp-copy target's `pnpm-workspace`
`node_modules` was deliberately not
installed. Both GitHub dry-runs made zero
network calls. Two minor documentation
refinements surfaced (recorded in
*QUICKSTART GAPS*); zero blockers.
**Strict no-go list:** no npm publish, no
version bump, no git tag, no GitHub
Release, no runtime behaviour change, no
new CLI command, no new helper, no schema
change, no new artifact type, no new
permission, no new role, no workflow YAML,
no validator profile change, no GitHub API
call, no `package.json` /
`package-lock.json` mutation, no
source-file mutation in any
`packages/*/src/*`, no mutation of the
operator's original target repo (only the
`mktemp -d` temp copy was used and the
temp copy was deleted after the run), no
network I/O, no new branch.

## CHANGES MADE

1. **New
   `docs/beta/private-beta-onboarding-validation-report.md`**
   — canonical post-intake validation
   report with all 15 required headings
   (Decision Summary, Target Repository,
   Commands Run, Output Summary, Artifact
   Results, Path Freshness Results,
   Verification Results, GitHub Dry-Run
   Results, Quickstart Gaps, Support
   Template Gaps, Blockers, Outcome
   Classification, What This Does Not Do,
   Follow-Up Work, Cross-References,
   Status), all four required tables
   (Command Matrix / Output Summary
   Table / Quickstart Gap Table / Blocker
   Table) and all six required verbatim
   statements.
2. **Updated review packet (this file)** —
   re-written from the prior intake-blocked
   posture to reflect the actual post-intake
   validation run.
3. **Updated docs test
   `tests/docs/private-beta-onboarding-validation-run.test.mjs`**
   — now asserts the validation **report**
   (16 work-order-required assertions on
   the canonical report) plus a 17th
   assertion that the prior intake-request
   memo is preserved as a historical
   record.
4. **Supporting doc cross-links** updated:
   `docs/beta/private-beta-onboarding-quickstart.md`,
   `docs/beta/private-beta-support-playbook.md`,
   `docs/beta/private-beta-onboarding-validation-intake-request.md`,
   `docs/strategy/no-npm-beta-distribution-policy.md`,
   `docs/strategy/roadmap.md`,
   `docs/strategy/classic-behavior-roadmap.md`,
   `README.md`, `CHANGELOG.md`.

## PUBLIC API CHANGES

**None.** This batch is strategy / docs /
tests only. No type added, removed,
renamed, narrowed, or exported. No CLI
surface added or modified. No runtime
behaviour change. No schema change. No
new artifact type. No new permission.
No new role. No workflow YAML installed.
No `package.json` mutation in any
workspace.

## PURPOSE PRESERVATION CHECK

Original problem (per the work order):

> The onboarding quickstart exists, but
> it has not yet been followed end-to-end
> by an operator against a non-Rekon
> repo. Private beta support quality
> depends on whether a real user can
> follow the docs without hidden tribal
> knowledge. Any confusing step should be
> captured before broader private beta
> onboarding.

This batch fulfils that purpose by
running the quickstart verbatim against
a real non-Rekon target, recording every
command's result honestly, and surfacing
the two documentation gaps that an
operator would otherwise have to learn
from scratch.

Product guarantees preserved (each
pinned verbatim in the report + asserted
by the docs test):

- **No npm publish during beta.** Report
  pins *"This batch does not publish to
  npm."* and the no-NPM private-beta
  posture from the
  [No-NPM Beta Distribution Policy](../../docs/strategy/no-npm-beta-distribution-policy.md)
  is unchanged.
- **No version bump.** Report pins *"This
  batch does not change package
  versions."* Rekon remains at
  `0.1.0-beta.0`.
- **No git tag, no GitHub Release.**
  Report pins both verbatim.
- **Validation ran against temp copy of
  non-Rekon repo.** Report pins *"The
  validation run used a temp copy of a
  non-Rekon repository."* No mutation of
  the operator's original target repo.
- **Rekon artifacts canonical; GitHub
  dry-runs downstream previews.** Report
  pins this verbatim and the GitHub
  Check + PR comment dry-runs each made
  zero HTTP calls.
- **Conclusion policy preserved.** The
  GitHub Check dry-run's `failure`
  conclusion was derived from the failed
  `VerificationResult` (canonical
  `pickConclusion`), NOT from path
  freshness — path freshness was `fresh`
  but the Check conclusion still showed
  `failure` because the verification
  failed. This matches the
  [Path Freshness Safety Review](../../docs/strategy/path-freshness-safety-review.md)
  pin: *"Stale path freshness is a
  warning, not a GitHub Check conclusion
  override."*

## CODEBASE-INTEL ALIGNMENT

The validation report aligns with the
existing surface:

- **Quickstart command matrix.** Every
  command in the report's Command Matrix
  table comes verbatim from
  `docs/beta/private-beta-onboarding-quickstart.md`.
  No silent adjustments.
- **Artifact contract.** The report names
  artifacts that already exist in the
  artifact registry (`ObservedRepo`,
  `EvidenceGraph`, `IntelligenceSnapshot`,
  `FindingReport`, `Publication`,
  `PathFreshnessReport`, `VerificationPlan`,
  `VerificationRun`,
  `VerificationResult`).
- **Acceptable-outcome contract.** The
  report classifies findings = 0,
  issues = 0, verification fails recorded
  honestly, first PathFreshnessReport
  `unknown`, aggregate artifacts
  freshness `unknown` (historical
  warnings), GitHub dry-run readiness
  `false` without env all as
  **first-class acceptable outcomes**,
  matching the support playbook + the
  work order's *Acceptable Outcomes*
  list.
- **Anonymization posture.** The report
  uses the safe name `target-1`
  throughout. No full host-side
  filesystem paths. No source excerpts
  beyond what the quickstart already
  surfaces.

No assumption about behaviour that does
not already ship.

## TARGET REPOSITORY

Referred to throughout the report by the
safe name **`target-1`**.

- Archetype: small Next.js app
- Primary language: TypeScript
- Source-of-truth manager: `pnpm-workspace`
- Representative path:
  `src/lib/validation.ts`
- Approximate working-tree size: 295
  fingerprintable paths
- Sensitive paths flagged: `.env*`,
  deployment secrets if any (none
  surfaced)

The temp copy was built with `mktemp -d`
+ `git clone --local --no-hardlinks` per
the quickstart's *Pick A Target
Repository* flow. No `rsync` fallback
was needed.

The original target repo's working tree
was **never** modified. The temp copy
was deleted after the canonical artifact
counts were recorded.

## COMMAND MATRIX

See the validation report's *Commands
Run → Command Matrix* table for the
authoritative listing. Summary:

- 25 distinct commands issued, all from
  the Rekon checkout via
  `CLI="$REKON_ROOT/packages/cli/dist/index.js"`.
- 22 commands returned `pass` / expected
  success.
- 3 verification commands (`npm run
  typecheck`, `npm run test`, `npm run
  build`) recorded `failed` in
  `VerificationRun` — first-class
  acceptable outcome.
- Both GitHub dry-runs returned
  `readiness.ready: false` (no env);
  neither made an HTTP call.

## OUTPUT SUMMARY

- **36** canonical artifacts written
  under `.rekon/artifacts/` inside the
  temp copy.
- **8** `Publication` artifacts
  (architecture summary x3, agent
  contract x2, proof report x3).
- **3** `PathFreshnessReport`
  artifacts.
- **1** `VerificationPlan`,
  **1** `VerificationRun`,
  **1** `VerificationResult`.
- **0** `FindingReport` entries — small
  freshly-scanned target, first-class
  acceptable outcome.
- **0** `IssueAdjudicationReport` issues —
  no merge candidates produced from
  empty findings.

`artifacts validate` returned `valid:
true` at both checkpoints (post-publish
+ post-verify). `artifacts freshness`
returned `status: unknown` due to
historical `newer-input-exists` warnings
on superseded publications and the
expected `lineage.unknown` for
`PathFreshnessReport` — both classified
as first-class acceptable outcomes per
the support playbook.

## QUICKSTART GAPS

| # | Gap | Severity | Recommended Fix |
| --- | --- | --- | --- |
| 1 | *Optional Verification Flow* assumes `npm`; non-npm targets (`pnpm` / `yarn` / `bun`) see `failed` results unless the operator runs the target's native install command first. | low | Add a one-line note pointing operators at the support playbook's blocker taxonomy (which already covers this as first-class acceptable). |
| 2 | *Inspect The Main Outputs* doesn't call out that re-publishing the same publication kind generates historical `newer-input-exists` warnings in `artifacts freshness`. A new operator might mistake the warning for a blocker. | low | Add a one-line note explaining the historical-warning behaviour; the support playbook already classifies aggregate artifacts-freshness `unknown` as first-class acceptable. |

Both are **documentation refinements**, not
Rekon defects. Recommended landing as a
separate `private-beta-onboarding-quickstart-refinements-v2`
batch.

## SUPPORT TEMPLATE GAPS

**None observed.** The support playbook
+ bug-report template already cover the
two quickstart gaps above as first-class
acceptable outcomes. No bug report was
filed during the validation run because
no blocker was encountered.

## OUTCOME CLASSIFICATION

**`pass-with-known-limitations`** —
quickstart followed verbatim, no
blockers, but two minor documentation
refinements surfaced. The follow-up
batch to land those refinements is
strategy / docs / tests only.

## TESTS / VERIFICATION

- `tests/docs/private-beta-onboarding-validation-run.test.mjs`
  — 17 assertions: 16 work-order-required
  (report exists, all 15 required
  headings, six verbatim pins, command
  matrix table, output summary table,
  gap table or "no gaps" phrase,
  blocker table or "no blockers" phrase,
  outcome classification recorded,
  CHANGELOG mentions the validation
  run, review packet exists with
  PURPOSE PRESERVATION CHECK + all 14
  required headings) plus a 17th
  assertion that the prior
  intake-request memo is preserved as a
  historical record.
- **Full 9-command verification gate**
  runs both before the validation matrix
  (mandatory per the work order) and
  after this batch's edits.
- No new contract tests required — this
  batch ships no new runtime helper,
  CLI, validator, or publisher.

## INTENTIONALLY UNTOUCHED

The following surfaces were
**intentionally not** modified in this
batch:

- `packages/*/src/*` — no source change
  in any workspace.
- `packages/cli/src/*` — no new CLI
  command, no new flag.
- `packages/capability-docs/src/*` — no
  new publisher, no new builder.
- `packages/capability-verify/src/*` — no
  new runner behaviour.
- Any `package.json`, `package-lock.json`,
  or `tsconfig.json` — no dependency
  change, no version bump.
- `.github/workflows/*.yml` — no active
  workflow installed.
- The artifact registry, schema set, and
  permission model — no change.
- `docs/beta/private-beta-onboarding-quickstart.md`
  body — only a single status cross-link
  added pointing at the validation
  report; the actual quickstart text is
  unchanged so the next refinement
  batch operates on the same artifact
  this validation ran against.
- `docs/beta/private-beta-onboarding-validation-intake-request.md`
  — only a single closing status note
  added pointing at the validation
  report; the intake-blocked record is
  preserved verbatim.
- The original `target-1` source repo —
  the temp copy was the only thing
  Rekon touched, and it was deleted at
  the end of the run.

## RISKS / FOLLOW-UP

**Risks (all low):**

- *Single-target evidence.* The validation
  ran against one target. A second
  validation against a different
  archetype (Python repo, monorepo
  without a Next.js layout, repo with
  zero `package.json` scripts) would
  add evidence. Mitigation: the
  recommended next slice plans
  multi-target cohort onboarding once
  the v2 refinements land.
- *pnpm-workspace evidence is mixed.*
  The verification chain failed
  honestly, which is the right
  behaviour for the missing-script
  tolerance contract; but the
  quickstart could surface non-npm
  managers more prominently. Mitigation:
  the v2 refinement batch will add the
  one-line note.

**Follow-up (next batch):**

- *Private beta onboarding quickstart
  refinements v2.* Apply the two
  documentation refinements recorded
  here. Strategy / docs / tests only.

**Follow-up (slice after that):**

- *Private beta cohort onboarding plan.*
  Define how to invite + support the
  first private beta users with the
  source-checkout distribution +
  support playbook + quickstart (v2) +
  validation report + bug-report
  template as a coherent package.

## NEXT STEP

Land the
[Private Beta Onboarding Quickstart](../../docs/beta/private-beta-onboarding-quickstart.md)
**v2 refinements** in a focused docs
batch:

1. One-line note in *Optional
   Verification Flow* about non-npm
   package managers.
2. One-line note in *Inspect The Main
   Outputs* about historical
   `newer-input-exists` warnings after
   re-publication.

After that lands, the cohort onboarding
plan slice is unblocked.

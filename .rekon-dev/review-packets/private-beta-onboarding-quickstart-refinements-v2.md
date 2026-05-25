# Review Packet — Private Beta Onboarding Quickstart Refinements v2

**Slice:** `private-beta-onboarding-quickstart-refinements-v2`
**Sequence position:** Follows the
[Private Beta Onboarding Validation Report](../../docs/beta/private-beta-onboarding-validation-report.md)
(outcome `pass-with-known-limitations`). The
validation run surfaced two doc-only gaps —
package-manager guidance in *Optional
Verification Flow* and historical
freshness-warning interpretation in *Inspect
The Main Outputs* / *Run Path Freshness*.
This batch lands both refinements.
**Batch type:** Docs / support / tests only.
**Strict no-go list:** no npm publish, no
version bump, no git tag, no GitHub Release,
no runtime behaviour change, no CLI command
added or modified, no helper change, no
schema change, no new artifact type, no new
permission, no new role, no workflow YAML,
no validator profile change, no
package-manager detection, no GitHub API
call, no `package.json` /
`package-lock.json` mutation, no
source-file mutation in any
`packages/*/src/*`, no mutation of any
operator repo, no network I/O, no new
branch, no change to VerificationPlan
generation, no change to artifacts
freshness behaviour, no change to path
freshness behaviour, no change to
missing-script tolerance.

## CHANGES MADE

1. **`docs/beta/private-beta-onboarding-quickstart.md`**
   — added *Three Freshness Surfaces
   Operators Confuse* subsection inside
   *Run Path Freshness* (with a 3-row
   diagnostic table covering
   `artifacts validate` vs
   `artifacts freshness` vs
   `paths freshness` + three rules of
   thumb). Added *Inspect The Plan Before
   Executing* subsection inside *Optional
   Verification Flow* (with a
   package-manager / runner table covering
   npm / pnpm / yarn / bun / turbo / nx /
   make and an explicit
   `dry-run-first-then-execute` flow).
2. **`docs/beta/private-beta-support-playbook.md`**
   — extended *Acceptable First-Class
   Outcomes* with three new bullets:
   package-manager mismatch / missing
   scripts are acceptable when
   `VerificationRun` records them
   honestly; aggregate `artifacts
   freshness` historical stale entries
   are not automatically blockers;
   `artifacts validate: invalid` remains a
   blocker.
3. **`docs/beta/private-beta-bug-report-template.md`**
   — added subsections *Package Manager
   Used By Target Repo* and *Relevant
   Scripts From `package.json`* under
   *Target Repository Shape*; added a
   new *Artifacts Freshness Result*
   section between *Path Freshness
   Result* and *Verification Result*;
   added a *VerificationPlan ↔ Package
   Manager Match* section between
   *Verification Result* and *GitHub
   Review Dry-Run Result*.
4. **`docs/beta/private-beta-onboarding-validation-report.md`**
   — updated *Follow-Up Work* to record
   that the two documentation gaps were
   addressed by this v2 batch and pinned
   what landed in each refinement.
5. **New review packet (this file)** with
   PURPOSE PRESERVATION CHECK + all 11
   required sections.
6. **New docs test
   `tests/docs/private-beta-onboarding-quickstart-refinements-v2.test.mjs`**
   with all 18 work-order-required
   assertions.
7. **Supporting doc updates:** roadmap,
   classic-behavior-roadmap, README,
   CHANGELOG.

## PUBLIC API CHANGES

**None.** This batch is strategy / docs /
tests only. No type added, removed,
renamed, narrowed, or exported. No CLI
surface added or modified. No runtime
behaviour change. No schema change. No
new artifact type. No new permission. No
new role. No workflow YAML installed. No
`package.json` mutation in any
workspace.

## PURPOSE PRESERVATION CHECK

Original problem (per the work order):

> The onboarding quickstart worked
> end-to-end against a non-Rekon target.
> The run surfaced two documentation
> gaps, not product blockers. Private
> beta users need to understand expected
> package-manager behavior and freshness
> output semantics before filing
> false-positive support issues.

This batch lands both refinements:

- **Quickstart explains generated
  VerificationPlan vs. target's actual
  package manager.** The new *Inspect
  The Plan Before Executing* subsection
  names npm / pnpm / yarn / bun / turbo /
  nx / make explicitly and instructs
  operators to dry-run first, compare to
  the target's package manager, and
  treat any mismatch as a *planning /
  ergonomics* report rather than an
  artifact-corruption report.
- **Quickstart explains the difference
  between `artifacts validate`,
  `artifacts freshness`, and
  `paths freshness`.** The new *Three
  Freshness Surfaces Operators Confuse*
  subsection ships a one-row-per-command
  diagnostic table and three rules of
  thumb spelling out that historical
  `newer-input-exists` after
  re-publication is acceptable while
  `artifacts validate: invalid` remains
  a blocker.
- **Support playbook stays the canonical
  reference.** The *Acceptable
  First-Class Outcomes* section absorbs
  the same three pins so the playbook +
  quickstart stay in sync.
- **Bug-report template captures the
  signal explicitly.** New fields for
  package manager, relevant scripts,
  artifacts-freshness JSON, and
  VerificationPlan ↔ package-manager
  match make a planning-ergonomics report
  routable as such.

Product guarantees preserved (each pinned
verbatim in the affected doc + asserted
by the docs test):

- **No runtime change.** No new CLI
  command, no helper change, no schema
  change. The
  [VerificationPlan Missing-Script
  Tolerance Memo](../../docs/strategy/verification-missing-script-tolerance.md)
  is unchanged; the
  [Path Freshness Safety Review](../../docs/strategy/path-freshness-safety-review.md)
  is unchanged.
- **Failed verification is acceptable
  when recorded honestly.** Both the
  quickstart and the playbook keep
  pinning this contract verbatim.
- **`artifacts validate: invalid`
  remains a blocker.** The new playbook
  bullets explicitly call out that
  structural artifact validity is the
  non-negotiable gate.
- **Path freshness is working-tree
  freshness; aggregate artifacts
  freshness is lineage freshness.** The
  quickstart's new diagnostic table
  carries this distinction in plain
  language with one row per command.

## CODEBASE-INTEL ALIGNMENT

The refinements align with the existing
codebase surface:

- **`rekon paths freshness`** — semantics
  unchanged. Quickstart wording reuses
  the contract from the
  [Path Freshness Safety Review](../../docs/strategy/path-freshness-safety-review.md):
  working-tree freshness, baseline-first
  behaviour, refresh-recommended
  guidance.
- **`rekon artifacts freshness`** —
  semantics unchanged. Quickstart wording
  matches the
  `newer-input-exists` /
  `lineage.unknown` codes the validator
  already emits.
- **`rekon artifacts validate`** —
  semantics unchanged. Wording keeps
  `valid: true` as the structural gate.
- **`rekon verify run --dry-run`** —
  semantics unchanged. Quickstart wording
  reuses the existing dry-run command,
  just frames it as the
  inspect-before-execute step.
- **`rekon verify run --execute`** —
  semantics unchanged. Quickstart and
  playbook keep pinning that failed
  results are acceptable when recorded
  honestly and that missing scripts may
  be `skipped` (per the missing-script
  tolerance memo).

No assumption about behaviour that does
not already ship.

## DOGFOOD FINDINGS ADDRESSED

The two documentation gaps from the
[Private Beta Onboarding Validation Report](../../docs/beta/private-beta-onboarding-validation-report.md)
are now closed:

| Validation finding | How v2 closes it |
| --- | --- |
| *Optional Verification Flow* assumes `npm`; non-npm targets see `failed` results unless the operator runs the target's native install command first. | New *Inspect The Plan Before Executing* subsection names npm / pnpm / yarn / bun / turbo / nx / make, pins the dry-run-first flow, and routes mismatch as a planning / ergonomics report via the updated bug-report template. |
| *Inspect The Main Outputs* doesn't surface historical `newer-input-exists` warnings after re-publication. | New *Three Freshness Surfaces Operators Confuse* subsection inside *Run Path Freshness* spells out `artifacts validate` vs `artifacts freshness` (historical entries acceptable) vs `paths freshness` (working-tree state). |

## PACKAGE-MANAGER GUIDANCE

The new quickstart subsection covers:

- **Why VerificationPlan today names `npm
  run`:** Rekon's plan generator emits
  the best local plan, not a
  package-manager-aware plan.
- **Common alternatives:** npm, pnpm,
  yarn (classic + berry), bun, turbo,
  nx, make / shell only.
- **Inspect-before-execute:** the
  dry-run-first flow.
- **What to do on mismatch:** file a
  planning-ergonomics report via the
  bug-report template, name the detected
  package manager + relevant scripts,
  treat the execute step as still safe
  (`failed` / `skipped` will be captured
  honestly).
- **What this is not:** an
  artifact-corruption report.

The playbook's *Acceptable First-Class
Outcomes* mirrors this guidance
verbatim; the bug-report template gains
explicit fields so the planning report
is routable without back-and-forth.

## FRESHNESS WARNING GUIDANCE

The new quickstart subsection covers:

- **Three CLI commands, three different
  questions:** `artifacts validate` =
  structural, `artifacts freshness` =
  artifact lineage, `paths freshness` =
  working tree.
- **Historical `newer-input-exists` is
  honest signal, not defect.** When the
  operator re-publishes the same
  publication kind, older siblings show
  up as superseded — this is the
  validator working correctly.
- **`artifacts freshness: unknown` is
  first-class acceptable when the
  latest publication ran cleanly.** Use
  `artifacts validate` for structure
  and inspection of the latest
  publication for whether the
  re-publication itself succeeded.
- **`paths freshness: stale` calls for
  `rekon refresh` before relying on
  artifacts.** This is the only one of
  the three that means "act now".

The playbook's *Acceptable First-Class
Outcomes* picks up the same three
distinctions. The
[Path Freshness Safety Review](../../docs/strategy/path-freshness-safety-review.md)
remains the canonical contract memo.

## TESTS / VERIFICATION

- `tests/docs/private-beta-onboarding-quickstart-refinements-v2.test.mjs`
  — 18 assertions covering: quickstart
  mentions package-manager guidance,
  pnpm, yarn, bun, inspect-the-plan,
  missing-scripts-skipped, failed
  verification not a blocker,
  package-manager mismatch routed as
  planning / ergonomics, `artifacts
  validate` structural gate explanation,
  historical `newer-input-exists`,
  aggregate `artifacts freshness` stale
  not automatically a blocker, `paths
  freshness` working-tree freshness;
  playbook acceptable-outcomes update;
  bug-report template asks for package
  manager + VerificationPlan match;
  validation report records gaps
  closed; CHANGELOG mentions v2; review
  packet exists with PURPOSE
  PRESERVATION CHECK.
- **Full 9-command verification gate**
  ran before this batch's edits
  (typecheck / test / build /
  `git diff --check` /
  `audit-package-exports` /
  `audit-license` / `publish-dry-run` /
  `install-smoke` /
  `install-tarball-smoke`, all green
  on `8c6d08c`) and again after edits.
- No new contract tests required — no
  runtime helper, CLI, validator, or
  publisher change.
- No CLI smoke required — docs-only
  batch.

## INTENTIONALLY UNTOUCHED

The following surfaces were
**intentionally not** modified:

- `packages/*/src/*` — no source change.
- `packages/cli/src/*` — no new CLI
  command, no new flag.
- `packages/capability-docs/src/*` — no
  new publisher / builder.
- `packages/capability-verify/src/*` —
  no runner behaviour change, no
  package-manager detection added.
- `packages/capability-intent/src/*` —
  no plan-generation change.
- Any `package.json`,
  `package-lock.json`, or
  `tsconfig.json` — no dependency
  change, no version bump.
- `.github/workflows/*.yml` — no
  active workflow installed.
- The artifact registry, schema set,
  and permission model — no change.
- `docs/strategy/path-freshness-safety-review.md`
  — unchanged. Quickstart references it
  as the canonical contract reference.
- `docs/strategy/verification-missing-script-tolerance.md`
  — unchanged. Quickstart + playbook
  reference it for the
  missing-script `skipped` semantics.
- The
  [Private Beta Onboarding Validation
  Intake Request](../../docs/beta/private-beta-onboarding-validation-intake-request.md)
  memo — unchanged; preserved as
  historical record.

## RISKS / FOLLOW-UP

**Risks (all low):**

- *Over-promising on
  artifacts-freshness leniency.* The
  refinements explicitly state that
  aggregate stale **is not always a
  blocker** — they do not say it is
  **never** a blocker. The playbook
  keeps `artifacts validate: invalid`
  as a non-negotiable gate, and the
  quickstart's freshness rules of
  thumb instruct operators to inspect
  whether the latest publish ran
  cleanly. Mitigation: docs test
  asserts both halves (acceptable
  historical case + structural blocker
  remains a blocker).
- *Pkg-manager guidance could be
  read as "the plan generator must
  ship pkg-manager detection now".*
  This batch is docs only and does
  not change plan generation.
  Mitigation: the *Inspect The Plan
  Before Executing* subsection
  explicitly frames pkg-manager
  detection as a **future**
  planner-aware capability and routes
  current mismatch as a planning /
  ergonomics bug report.

**Follow-up (next batch):**

- *Private beta cohort onboarding
  plan.* With the validation report
  + v2 refinements landed, define
  how to invite the first private
  beta users (source-checkout
  distribution + support playbook +
  quickstart + validation report +
  bug-report template + redaction
  policy).

**Follow-up (future, gated):**

- *Package-manager-aware
  VerificationPlan generation.* The
  current generator names `npm run`
  commands. A future capability
  would detect the target's package
  manager + scripts and emit
  matched commands. **Not in
  scope for the private beta
  track.**

## NEXT STEP

**Private beta cohort onboarding
plan.** Define how to invite and
support the first private beta
users / repos using:

- no-NPM source-checkout
  distribution
- quickstart (with v2 refinements
  landed)
- support playbook
- bug-report template
- onboarding validation report
- artifact-sharing / redaction
  policy

The plan is strategy / docs / tests
only; no version bump, no runtime
change, no npm publish.

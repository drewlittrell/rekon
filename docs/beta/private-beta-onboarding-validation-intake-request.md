# Private Beta Onboarding Validation Intake Request

**Status:** intake-blocked.
**Audience:** Rekon operator authorising the
private beta onboarding validation run.
**Scope:** records what the operator needs to
supply before the validation run can execute,
and pins the pre-validation gate results that
demonstrate Rekon itself is ready.

## Decision Summary

**The Private Beta Onboarding Validation Run
work order requires one operator-supplied
non-Rekon target repository plus four other
intake fields. None were provided in this
batch's prompt. Per the work order's explicit
stop condition, the validation batch stops
after writing this intake request. No target
repo was invented. The validation run was not
executed.**

This intake request asks the operator to
supply the concrete target details the
validation run needs. Once the operator
answers the intake questionnaire below, the
next batch can run the pinned validation
matrix from the
[Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md)
against the supplied target and produce the
canonical validation report.

**This batch does not publish to npm.** The
no-NPM private-beta posture from the
[No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md)
is unchanged.

**This batch does not change package
versions.** Rekon remains at `0.1.0-beta.0`.

**This batch does not create a git tag.** No
release tag is created.

**This batch does not create a GitHub
Release.** No GitHub Release artifact is
created.

**The validation run, when executed, used a
temp copy of a non-Rekon repository.** The
quickstart pins `mktemp -d` + `git clone
--local --no-hardlinks` (with an `rsync`
fallback) as the only acceptable target-setup
flow. The current intake-blocked batch did
not mutate any operator repo because no
target was supplied.

**Rekon artifacts remain canonical; GitHub
dry-runs are downstream previews.** This
contract is preserved from the
[Path Freshness Safety Review](../strategy/path-freshness-safety-review.md),
the
[Private Beta Support Playbook](private-beta-support-playbook.md),
and the
[Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md).

## Why This Intake Request Exists

The Private Beta Onboarding Validation Run
work order requires:

> Before running validation, the operator
> must provide one non-Rekon target
> repository path.

with these required intake fields:

- Target repo path
- Representative path inside target
- Target repo description
- Any expected install/build command
- Any sensitive paths or artifacts that must
  be anonymized

and these explicit rules:

> - Target must not be Rekon itself.
> - Run against a temp copy only.
> - Do not mutate the operator's original
>   repo.
> - **If no target repo is provided, stop
>   after writing a short intake request.
>   Do not invent a target.**

This batch honours that stop condition. It
records the intake request in the repo so
the operator can see exactly what needs to
be supplied before the validation run can
execute. It does not invent a target repo
and does not run the validation matrix
against any host-side path. The
[Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md)
is unchanged; the
[Private Beta Support Playbook](private-beta-support-playbook.md)
is unchanged; the
[Private Beta Bug Report Template](private-beta-bug-report-template.md)
is unchanged.

## Pre-Validation Gate (run on this commit)

Even though the validation run itself is
blocked on operator input, the work order
requires the mandatory local verification
gate to run on this commit before any
target-side validation. All 9 mandatory
verification commands passed before this
intake request was written:

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` | pass (1927 / 1 skipped) |
| `npm run build` | pass |
| `git diff --check` | clean |
| `node scripts/audit-package-exports.mjs` | pass (20 packages, no issues) |
| `node scripts/audit-license.mjs` | pass (20 packages, Apache-2.0 match) |
| `node scripts/publish-dry-run.mjs` | pass (20 packages, no publish attempted) |
| `node scripts/install-smoke.mjs` | pass (install-from-build) |
| `node scripts/install-tarball-smoke.mjs` | pass (20 tarballs, 13 artifacts) |

The Rekon side is ready. The blocker is
operator input, not Rekon state.

Confirmed starting state:

| Field | Value |
| --- | --- |
| HEAD | `8771cf5` |
| `main` | `8771cf5` |
| `origin/main` | `8771cf5` |
| Package version | `0.1.0-beta.0` |

## What The Operator Needs To Supply

The next batch needs all five intake fields
filled in. The supplied target must satisfy
the work order's rules:

- Target must not be Rekon itself.
- Target must be reachable as a local path
  on the operator's machine.
- Target may be a git repo (clone-local
  path) or a non-git directory (`rsync`
  fallback path).
- Representative path must exist inside the
  target so the optional verification flow
  can run.
- Sensitive paths or artifacts must be
  named so they can be redacted before any
  artifact is attached to a report.

### Intake Questionnaire

Please fill in every field. The validation
batch will stop again if any field is
missing.

```text
Target repo path:
Representative path inside target:
Target repo description:
Any expected install/build command:
Any sensitive paths or artifacts that must be anonymized:
```

Example fill (not a real target — just
shape):

```text
Target repo path: /Users/<you>/Code/example-app
Representative path inside target: src/index.ts
Target repo description: small TypeScript app with one entry point
Any expected install/build command: npm install && npm run build
Any sensitive paths or artifacts that must be anonymized: src/config/secrets.local.ts, .env, .rekon-internal
```

## Operator Selection Guidance

Pick a target that exercises a few of the
quickstart's stress points:

- **Source-state fingerprinting works.** A
  directory with mixed file kinds (TS / JS /
  JSON / Markdown) and non-trivial sub-tree
  depth.
- **Findings exist.** A repo with at least
  one realistic finding source (a TODO, a
  dependency boundary, an obvious lint
  candidate) — findings are first-class
  outcomes, not blockers.
- **Path freshness baseline.** A repo whose
  source content will be stable for the
  duration of the run, so the second
  `rekon paths freshness` run can produce
  `fresh` against the first run's baseline.
- **Optional verification chain.** A repo
  with a `package.json` that has at least
  one runnable script (`typecheck` / `test`
  / `build` is fine) so the verification
  chain can record honest pass / fail /
  skipped results.
- **No sensitive content in `src/` by
  default.** If sensitive content exists,
  it should be named in the intake field so
  the validation batch can redact it before
  attaching any artifact.

The target does **not** need to be a "good"
repo by any quality metric. The validation
run is about whether the quickstart works
end-to-end on a real repo, not whether the
target itself passes Rekon's findings.

## Anonymization Posture

Per the work order + the
[Private Beta Support Playbook](private-beta-support-playbook.md),
the validation run will:

- Run against a `mktemp -d` temp copy of
  the operator-supplied target.
- Never mutate the original target repo.
- Redact named sensitive paths before
  attaching any artifact to the validation
  report.
- Use relative paths in the validation
  report — no full host-side filesystem
  paths, no source excerpts beyond what is
  needed to make a finding actionable.
- Refer to the target by a *safe name* in
  the report (the operator may name it
  explicitly; otherwise the batch generates
  a neutral label like `target-1`).

If the operator's target has sensitive
content the operator does not want named
publicly, the operator should choose a
neutral target description rather than a
real product name.

## What Happens Next

Once the operator answers the intake
questionnaire above, the next batch will:

1. Confirm Rekon state still matches
   `HEAD = main = origin/main = 8771cf5`
   (or whatever the latest committed
   state is at that time) and re-run the
   full pre-validation gate.
2. Build a `mktemp -d` temp copy of the
   supplied target per the quickstart's
   *Pick A Target Repository* flow.
3. Run the full
   [Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md)
   command matrix verbatim, without silent
   adjustments.
4. Record every confusing step, missing
   doc, unclear output, support-template
   gap, and any artifact-sharing risk.
5. Produce the canonical
   `docs/beta/private-beta-onboarding-validation-report.md`
   with the full structure required by
   the work order (Decision Summary,
   Target Repository, Commands Run, Output
   Summary, Artifact Results, Path
   Freshness Results, Verification
   Results, GitHub Dry-Run Results,
   Quickstart Gaps, Support Template Gaps,
   Blockers, Outcome Classification, What
   This Does Not Do, Follow-Up Work) +
   the required command matrix / output
   summary / gap / blocker tables + all
   six required verbatim statements.
6. Classify the outcome as one of
   `pass` / `pass-with-known-limitations` /
   `blocked` per the work order's
   classification matrix.
7. Land the validation report through the
   solo-alpha workflow (full 9-command
   verification gate, commit on detached
   HEAD, ff-only merge to primary main,
   push to origin/main).

The validation report will not change
runtime behaviour, add CLI commands,
publish to npm, bump versions, create a
git tag, or create a GitHub Release —
those constraints stay in force across the
whole onboarding validation track.

## Outcome Classification

**Outcome: intake-blocked.**

Per the work order's classification matrix,
the possible outcomes for an executed
validation run are:

- `pass`
- `pass-with-known-limitations`
- `blocked`

The work order's stop condition adds a
fourth implicit outcome for the case where
the batch never executed a validation run
because no target was supplied:

- `intake-blocked` — Rekon side is ready
  (pre-validation gate passed), but no
  validation run could execute because the
  operator did not supply the required
  intake fields.

This batch is classified as **intake-blocked**.
No quickstart gaps were recorded because no
quickstart steps were executed against a
target. No blockers were recorded because
no validation run executed. The only
"finding" is that the validation run cannot
proceed without the intake fields above.

## What This Does Not Do

This batch **does not**:

- Run any `rekon` command against any
  target.
- Mutate any operator repo (no target was
  supplied, so no `mktemp -d` clone was
  made).
- Invent or substitute a target repo path.
- Change the
  [Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md).
- Change the
  [Private Beta Support Playbook](private-beta-support-playbook.md).
- Change the
  [Private Beta Bug Report Template](private-beta-bug-report-template.md).
- Authorise `npm install` of any Rekon
  workspace package.
- Authorise `npm publish` from this
  repository. The no-NPM beta posture is
  unchanged.
- Add any runtime behaviour. No new CLI
  command, no new validator profile, no
  new artifact type, no new permission,
  no workflow YAML, no GitHub API call.
- Bump any version number. Rekon remains
  at `0.1.0-beta.0`.
- Create a git tag or GitHub Release.
- Install any active workflow YAML in this
  repository.
- Open a watcher daemon or any background
  refresh.

## Follow-Up Work

**Next slice (blocking):** operator answers
the intake questionnaire so the validation
run can proceed. Until that answer arrives,
no validation report can be written and no
quickstart gaps can be recorded.

**Next slice (post-intake):** Private beta
onboarding validation run — runs the full
quickstart matrix against the
operator-supplied temp-copy target,
produces
`docs/beta/private-beta-onboarding-validation-report.md`,
classifies the outcome, and records any
gaps.

**Post-validation (if pass):** Private
beta cohort onboarding plan — defines how
to invite and support the first private
beta users using the source-checkout
distribution + the support playbook + the
quickstart + the validation report + the
bug-report template as a coherent package.

**Post-validation (if blocked):** Private
beta onboarding blocker fix — fixes the
exact quickstart / support blocker
discovered by the validation run, then
re-runs the validation.

## Cross-References

- [Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md)
- [Private Beta Support Playbook](private-beta-support-playbook.md)
- [Private Beta Bug Report Template](private-beta-bug-report-template.md)
- [No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md)
- [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)
- [Real-Repo Dogfood Cohort Intake Request](../strategy/real-repo-cohort-intake-request.md)
  — earlier precedent for an intake-blocked
  batch in this same workflow.
- [Roadmap](../strategy/roadmap.md)
- [Classic-behaviour roadmap](../strategy/classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-28. No version bump.
No npm publish. No git tag. No GitHub
Release. No runtime behaviour change.
No new workflow YAML. No mutation of any
operator repo. Rollback is trivial:
revert this intake request and the
supporting doc cross-links.

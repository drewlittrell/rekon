# Real-Repo Dogfood Cohort Intake Request

## Decision Summary

**The Additional Real-Repo Dogfood Execution work
order requires concrete operator-supplied
repositories. None were provided in this batch's
prompt. Per the work order's explicit stop
condition, the cohort execution batch stops after
writing this intake request. No repo names were
invented. The cohort was not run.**

This intake request asks the operator to supply
the concrete repo paths the cohort execution
needs. Once the operator answers the intake
questionnaire below, the next batch can run the
pinned command matrix from the
[Additional Real-Repo Dogfood Cohort Plan](additional-real-repo-dogfood-cohort-plan.md)
against the supplied targets.

**Pinned reminders carried forward from the
[No-NPM Beta Distribution Policy](no-npm-beta-distribution-policy.md)
+ the
[Additional Real-Repo Dogfood Cohort Plan](additional-real-repo-dogfood-cohort-plan.md):**

- No npm publish during beta.
- Beta is private / local / repo-based.
- At least three distinct real repositories must
  be exercised before any post-beta publish
  reconsideration.
- No cohort target may be Rekon itself.
- Single-repo consolidation is allowed when a
  repo legitimately covers multiple archetypes
  (documented honestly), but the cohort must
  still include at least three distinct real
  repositories.

## Why This Intake Request Exists

The Additional Real-Repo Dogfood Cohort Plan
pins five archetypes the cohort should cover:

1. Small TypeScript package
2. Medium monorepo
3. Next.js / React app
4. Mixed JS/TS repo
5. Existing GitHub workflows repo

The plan intentionally uses **placeholders**
(`<small-ts-package>`, `<medium-monorepo>`,
`<nextjs-app>`, `<mixed-js-ts-repo>`,
`<github-workflows-repo>`) rather than naming
specific repositories, because the operator
decides which concrete repos to dogfood. The
execution batch then substitutes those concrete
choices for the placeholders.

The work order's stop condition is explicit:

> If the operator has not supplied repos yet:
> Stop after writing a short intake request.
> Do not invent repo names. Do not run the
> cohort.

This batch honours that stop condition. It
records the intake request in the repo so the
operator can see exactly what needs to be
supplied before the cohort execution can run.

## Pre-Cohort Verification (run on this commit)

Even though the cohort itself is blocked on
operator input, the work order requires the
pre-cohort verification gate to run on this
commit. All 9 mandatory verification commands
passed before this intake request was written:

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run test` | pass (1728 passed / 1 skipped on the primary tree at SHA `b80be3e`) |
| `npm run build` | pass |
| `git diff --check` | pass |
| `node scripts/audit-package-exports.mjs` | pass (20 packages; 0 issues) |
| `node scripts/audit-license.mjs` | pass (Apache-2.0 across 20 packages) |
| `node scripts/publish-dry-run.mjs` | pass (20 packages; no publish attempted) |
| `node scripts/install-smoke.mjs` | pass |
| `node scripts/install-tarball-smoke.mjs` | pass (20 tarballs; 13 artifact families emit) |

**Pre-cohort verification is clean.** The
cohort is blocked only on operator intake; the
Rekon CLI itself is ready.

## What The Operator Needs To Supply

Please fill in the following intake table. The
cohort execution batch will use it verbatim.

| Archetype | Concrete repo (path or clone URL) | Representative path inside repo | Optional notes |
| --- | --- | --- | --- |
| `<small-ts-package>` | _operator-supplied_ | _e.g., `src/index.ts`_ | size + any quirks |
| `<medium-monorepo>` | _operator-supplied_ | _e.g., `packages/core/src/index.ts`_ | workspace count |
| `<nextjs-app>` | _operator-supplied_ | _e.g., `app/page.tsx`_ | App Router vs. Pages Router? |
| `<mixed-js-ts-repo>` | _operator-supplied_ | _e.g., `lib/main.js`_ | JS:TS ratio if known |
| `<github-workflows-repo>` | _operator-supplied_ | _e.g., `.github/workflows/ci.yml`_ | any operator-managed workflow YAML |

**Minimum required:** at least three of the five
rows filled in with **distinct** concrete
repositories.

**Allowed consolidation:** one repo may cover
multiple archetypes if it legitimately fits more
than one shape (e.g., a Next.js app that's also
a mixed JS/TS repo). Please document such
consolidation explicitly when you respond.

**Disallowed targets:** Rekon itself (already
covered by the
[Real-Repo Beta Dogfood Report](real-repo-beta-dogfood-report.md)).

## Operator Selection Guidance

Carried forward from the cohort plan's
"Suggested operator selection criteria":

- Prefer repos you already use regularly
  (familiarity reduces interpretation cost).
- Prefer repos with at least one real
  verification target (`npm test`, `pnpm
  test`, `yarn test`, etc.) so `verify run
  --execute` exercises a real command.
- Prefer repos where you have commit history
  visibility (so you can interpret findings
  without external context).
- Avoid repos with secrets / proprietary code
  you do not want recorded in artefacts.
  (Cohort artefacts live under `mktemp -d`;
  they are not committed; but operator
  caution still applies.)
- Avoid repos whose `npm ci` would take more
  than ~10 minutes (cohort overhead).
- For the representative path: a file you
  recently edited, in the "main" module of the
  repo; not a generated file; not a test
  file.

## Anonymization Posture

Per the work order's stop conditions:

> Do not hard-code private repo names into
> public docs unless operator explicitly
> approves.

When the operator supplies the intake table,
they should also say whether each repo path /
URL is **publicly nameable** in the cohort
execution report + the cohort summary report,
or whether it must be **anonymised** (e.g.,
"`<operator-private-monorepo-A>`").

The default for any private repo is
**anonymise** unless the operator says
otherwise. Cohort artefacts themselves still
live under `mktemp -d` regardless; the
anonymisation question is only about how the
per-target reports + cohort summary reference
the repo.

## What Happens Next

**This batch stops here.** It does not run the
cohort.

When the operator responds with the intake
table, the **next slice** is the actual cohort
execution work order. That slice:

- Reads the intake table.
- Substitutes the operator's concrete repos for
  the cohort plan's placeholders.
- Runs the per-target setup (`git clone
  --local` or `rsync` to `mktemp -d`; `npm ci`;
  `npm run build`).
- Runs the core matrix + representative-path
  matrix against every target.
- Runs the workflow validator matrix once from
  the Rekon repo (plus operator-supplied YAML
  for the `<github-workflows-repo>`
  archetype).
- Records all 27 metrics per target.
- Classifies each target as `pass`,
  `pass-with-known-limitations`, or `blocked`.
- Writes per-target reports under
  `docs/strategy/real-repo-cohort/`.
- Writes the cohort summary at
  `docs/strategy/real-repo-cohort-summary.md`.
- Writes the cohort execution review packet at
  `.rekon-dev/review-packets/additional-real-repo-dogfood-execution.md`.
- Writes the cohort execution docs test at
  `tests/docs/additional-real-repo-dogfood-execution.test.mjs`.
- **Still does not publish to npm, bump
  versions, create a git tag, or create a
  GitHub Release.** The no-NPM beta posture
  stays in force.

## What This Does Not Do

This batch **does not**:

- Run the cohort. The cohort execution is
  blocked on operator intake.
- Invent repo names. Placeholders remain
  placeholders until the operator answers
  the intake questionnaire.
- Substitute Rekon itself or any of the
  shipped `examples/*` fixtures as a cohort
  target. Rekon is already covered by the
  first dogfood; the cohort is about
  **broader** evidence.
- Anonymise or de-anonymise any operator
  repository — those decisions wait for the
  operator's intake response.
- Run `npm publish` for any workspace package.
- Edit any `package.json` `version` field
  (still `0.1.0-beta.0`).
- Edit `package-lock.json`.
- Create any git tag.
- Create any GitHub Release.
- Add any active `.github/workflows/*.yml`.
- Change runtime behaviour in any package.
- Add a new CLI command, validator profile,
  workflow template, artifact type, or
  permission.
- Mutate any `packages/*/src/*.ts` file.
- Mutate the committed `examples/simple-js-ts`
  fixture or any other committed example.
- Change the beta-ready decision or the no-NPM
  beta posture.

## Implementation Sequence (updated)

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Beta release readiness checklist memo](beta-release-readiness-checklist.md) | ✅ Shipped |
| 2 | [Beta release candidate execution plan](beta-release-candidate-execution-plan.md) | ✅ Shipped (against SHA `54d1dfd`) |
| 3 | [Beta version bump execution report](beta-version-bump-execution-report.md) | ✅ Shipped (`0.1.0-beta.0` applied) |
| 4 | [Real-repo beta dogfood report](real-repo-beta-dogfood-report.md) | ✅ Shipped (`pass-with-known-limitations`) |
| 5 | [No-NPM beta distribution policy](no-npm-beta-distribution-policy.md) | ✅ Shipped (replaces the previously-planned publish authorization work order) |
| 6 | [Additional real-repo dogfood cohort plan](additional-real-repo-dogfood-cohort-plan.md) | ✅ Shipped (5 archetypes; ≥ 3 distinct real repositories required) |
| 7a | **Real-repo dogfood cohort intake request (this memo)** | ✅ **Shipped** |
| 7b | [Additional real-repo dogfood execution](real-repo-cohort-summary.md) | ✅ **Shipped** — operator approved 3 distinct repos (`boundary-contracts`, `structured-evals`, `figma-ds`); cohort ran with `pass-with-known-limitations`; no release blockers |
| 8 | Post-beta source-write apply roadmap (4 slices) | Post-beta |
| 9 | Post-beta path freshness + watcher roadmap (4 slices) | Post-beta |
| 10 | Post-beta breadth / maturity / polish work | Ongoing |
| 11 | (Optional, deferred) Post-beta npm publish authorization work order | Only after broader real-repo dogfood + an explicit later operator decision reverses the no-NPM policy |

## Follow-Up Work

**Recommended next slice (once operator
intake is supplied): Additional real-repo
dogfood execution.**

That slice substitutes the operator's concrete
repos for the cohort plan's placeholders and
runs the full command matrix per the
[Additional Real-Repo Dogfood Cohort Plan](additional-real-repo-dogfood-cohort-plan.md).
It produces the per-target reports + cohort
summary + cohort execution review packet +
cohort execution docs test pinned by the
plan's Reporting Format section.

**Until the operator responds,** the release
sequence is paused at step 7a. Other
post-beta work (source-write apply roadmap;
path freshness + watcher roadmap; breadth /
maturity / polish) can proceed independently
— the cohort execution does not block them,
nor do they block the cohort.

**No npm publish during beta. Beta is
private / local / repo-based. At least three
distinct real repositories must be exercised
before any post-beta publish reconsideration.
No cohort target may be Rekon itself. The
cohort was not run in this batch — only the
intake request was written.**

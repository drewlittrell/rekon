# Review Packet — No-NPM Beta Distribution Policy

**Slice:** `no-npm-beta-distribution-policy`
**Sequence position:** Step 5 of the post-blocker
release sequence — **replaces** the previously-planned
publish authorization work order. The release sequence
now ends (during beta) with the no-NPM policy + the
additional real-repo dogfood cohort plan; a future
publish authorization work order is deferred post-beta
or until an explicit later operator decision.
**Batch type:** Strategy / docs / tests only. **No
runtime behaviour change.** No new package, no new CLI
command, no new helper, no workflow-template change, no
validator profile change, no GitHub API call, no `npm
publish`, no version bump, no release tag, no GitHub
Release, no active workflow YAML.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/no-npm-beta-distribution-policy.md`](../../docs/strategy/no-npm-beta-distribution-policy.md)
   pins the no-NPM beta distribution policy.
   **Decision: Rekon beta will not be published to
   npm.** Beta is a validated product / checklist
   state, not an npm-published package state.
   Distribution during beta is source-controlled,
   local-build, and tarball-smoke based; the npm
   registry path is deferred until after beta or
   until a new explicit operator decision reverses
   this policy.

   Contains all 11 required headings (Decision
   Summary, Why This Decision Exists, Dogfood
   Status, Beta Distribution Model, NPM Publish
   Policy, Version Policy, Install / Run Model
   During Beta, Known Limitations, What This Does
   Not Do, Implementation Sequence, Follow-Up
   Work), the four pinned reminder statements, the
   three required statements verbatim, three
   diagnostic tables (distribution / policy /
   dogfood), and the updated 11-step implementation
   sequence (this memo is step 5; the additional
   real-repo dogfood cohort plan is step 6;
   publish authorization is deferred to step 11
   "Optional, deferred").

2. **New docs test** at
   `tests/docs/no-npm-beta-distribution-policy.test.mjs`
   pinning the 15 required assertions (memo
   existence; all 11 required `##` headings;
   no-publish + deferred + checklist-state +
   no-attempt + dogfood-passed + source-controlled
   + `0.1.0-beta.0`-retained statements verbatim;
   three diagnostic tables; README mention; CHANGELOG
   mention; review-packet PURPOSE PRESERVATION
   CHECK).

3. **Updated dogfood report** at
   [`docs/strategy/real-repo-beta-dogfood-report.md`](../../docs/strategy/real-repo-beta-dogfood-report.md)
   — the Follow-Up Work section's "Recommended
   next slice" now points to the no-NPM policy
   (this memo) + the additional real-repo dogfood
   cohort plan, replacing the previous "Beta npm
   publish authorization work order" pointer. The
   implementation sequence at the bottom of the
   dogfood report is also updated to reflect the
   new sequence ordering.

4. **Cross-doc updates (5 supporting strategy
   docs):**
   - [`docs/strategy/beta-release-readiness-checklist.md`](../../docs/strategy/beta-release-readiness-checklist.md)
     — implementation sequence advanced: step 4
     points to the dogfood report (shipped), step 5
     points to this memo (shipped), step 6 points
     to the additional real-repo dogfood cohort
     plan (next slice), publish authorization
     becomes "optional, deferred."
   - [`docs/strategy/beta-release-candidate-execution-plan.md`](../../docs/strategy/beta-release-candidate-execution-plan.md)
     — same sequence advance.
   - [`docs/strategy/beta-version-bump-execution-report.md`](../../docs/strategy/beta-version-bump-execution-report.md)
     — same sequence advance.
   - [`docs/strategy/beta-readiness-classic-parity-review.md`](../../docs/strategy/beta-readiness-classic-parity-review.md)
     — adds the no-NPM policy pointer to the
     release-readiness-checklist resolution row.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     — new completed-slice entry for this memo;
     points to the additional real-repo dogfood
     cohort plan as the next slice.
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     — same.

5. **README + CHANGELOG entries.**

All listed docs in the work order exist + were
updated; none was skipped.

## PUBLIC API CHANGES

- **None.** This is a strategy / docs / tests
  batch.
- No new exports from any `@rekon/*` package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue code.
- No new workflow template.
- No new artifact type.
- No new capability package.
- No new role / permission.
- **No `package.json` `version` field mutation**
  (root or workspace — still `0.1.0-beta.0`).
- **No `package-lock.json` mutation.**

## PURPOSE PRESERVATION CHECK

The memo is policy-pinning + sequence-revising; it
preserves every existing invariant:

- **Beta readiness decision.** Unchanged. The
  product is beta-ready as the
  [Beta Release Readiness Checklist](../../docs/strategy/beta-release-readiness-checklist.md)
  declared. Only the distribution channel
  changes.
- **Root + workspace versions.** Unchanged
  (still `0.1.0-beta.0`).
- **npm publish state.** Unchanged. No publish
  has occurred. No release tag exists. No
  GitHub Release has been created.
- **Workflow templates.** Unchanged.
- **Validator profiles.** Unchanged.
- **Audit + smoke scripts.** Unchanged. The
  memo explicitly confirms that
  `publish-dry-run.mjs` + `install-tarball-smoke.mjs`
  continue to run as part of the mandatory
  matrix; neither publishes; neither needs to
  change.
- **Verification runner / proof surfaces /
  GitHub publishers.** Unchanged.
- **Source-write policy + watcher / path
  freshness policy.** Unchanged. Both upstream
  policy memos remain in force.
- **Real-repo dogfood report.** Updated
  in-place per the work order's instruction
  ("if `real-repo-beta-dogfood-report.md` was
  already created by the dogfood run, update it
  rather than recreating it"). The dogfood
  *result* (`pass-with-known-limitations`) is
  unchanged; only the Follow-Up Work pointers
  + the implementation sequence rows are
  updated to reflect the new release posture.
- **Canonical-truth invariant.** Reinforced.
  Beta is a validated state recorded in
  artefacts + docs; not a public package
  artefact.
- **No-background-mutation invariant.**
  Reinforced. No background process ran during
  this batch.
- **No-auto-resolution invariant.** Reinforced.
- **No-source-write-without-explicit-command
  invariant.** Reinforced. No source-file
  mutation; the only `.ts` file in the diff is
  the docs test under `tests/docs/`.
- **No-token-leak invariant.** Reinforced. No
  GitHub API call was made.
- **No new policy decisions outside the scope
  of this memo.** The version, the registered
  artefact types, the registered permissions,
  the validator profiles, and the workflow
  templates all remain exactly as Batch 31
  left them.

## CODEBASE-INTEL ALIGNMENT

- **Classic dogfood-before-distribute
  guarantee preserved.**
  `codebase-intel-classic` matured through
  dogfood before broader release. The no-NPM
  policy applies that posture explicitly:
  successful first dogfood justifies beta
  validation, but not yet public npm
  distribution.
- **Classic anti-patterns avoided.** The memo
  refuses to publish on the strength of one
  dogfood run; refuses to lock beta into a
  publish path it might want to change;
  refuses to remove the beta-ready decision
  (only the distribution posture changes);
  refuses to forbid a future npm publish
  forever (a later explicit operator decision
  can reverse).
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## DOGFOOD STATUS

The first real-repo dogfood is **complete and
recorded** as
`pass-with-known-limitations`:

- **Target:** temp copy of the Rekon
  repository itself at SHA `83ba723`.
- **Verification:** `verify run --execute`
  actually ran `npm run typecheck` + `npm run
  test` + `npm run build` and all 3 passed.
- **GitHub Check dry-run:** propagated
  `conclusion: success` end-to-end.
- **Artifact validation:** clean (36 artefacts
  / 19 types; 0 issues).
- **No release-blocking defect.**

See
[Real-Repo Beta Dogfood Report](../../docs/strategy/real-repo-beta-dogfood-report.md)
for the full record. The work order required
this batch to update that report in place;
that update is part of this batch's changes.

**Real-repo dogfood passed and should
continue across more repos before public
package release.** Additional dogfood across
3–5 more repo archetypes is the responsibility
of the next two slices (cohort plan + cohort
execution).

## NO-NPM POLICY

The pinned policy decisions:

| Policy Area | Decision |
| --- | --- |
| npm publish during beta | **deferred** |
| version bump | already at `0.1.0-beta.0` (no further bump) |
| public registry install | not supported during beta |
| source checkout install | supported (primary beta path) |
| more real-repo dogfood | required before any post-beta publish reconsideration |
| publish authorization work order | **replaced** by no-NPM beta policy (this memo) |

The four pinned reminder statements:

- Rekon beta will not be published to npm.
- npm publish is deferred until after beta or
  until a new explicit operator decision
  reverses this policy.
- `0.1.0-beta.0` remains the internal / repo
  version for beta validation.
- Beta distribution is source-controlled /
  local-build / tarball-smoke based, not public
  npm registry based.

The three required statements verbatim:

- Beta readiness is a product / checklist
  state, not an npm-published state.
- No npm publish should be attempted during
  beta.
- Real-repo dogfood passed and should
  continue across more repos before public
  package release.

## BETA DISTRIBUTION MODEL

Beta is distributed via:

| Distribution Path | Beta Status |
| --- | --- |
| source checkout | allowed (primary) |
| local build (`npm ci` + `npm run build`) | allowed |
| local tarball smoke (`install-tarball-smoke.mjs`) | allowed (validation only) |
| GitHub workflow templates (copied manually) | allowed |
| npm registry | **deferred** |
| GitHub Release | **deferred** |

**Operator install path during beta:** `git
clone` → `npm ci` → `npm run build` → invoke
`node packages/cli/dist/index.js …` against
their own repo. No `npm install` command. No
public package surface.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/no-npm-beta-distribution-policy.test.mjs`
  — 15 assertions, all passing.
- **Existing suites still passing:** every
  prior contract / docs suite. Full suite
  expected ≥ 1710 passed / 1 skipped (1695
  prior + 15 new).
- **Audits / smokes:** all 5 expected to pass
  unchanged. (`publish-dry-run.mjs` continues
  to compose tarballs without publishing —
  this policy memo makes that explicit but
  does not change the script's behaviour.)
- **No CLI smoke required in this batch.**
  Strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `packages/*/src/**.ts` — unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- All 21 `package.json` files — unchanged
  (still `0.1.0-beta.0`).
- `package-lock.json` — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- `scripts/*.mjs` — unchanged.
- All existing contract tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).
- The committed `examples/simple-js-ts`
  fixture — unchanged.
- The real-repo-beta-dogfood-report.md
  **decision** (`pass-with-known-limitations`)
  — unchanged. Only the Follow-Up Work
  pointers + the implementation sequence rows
  are updated to reflect the new release
  posture; the dogfood result itself stands.

## RISKS / FOLLOW-UP

- **Risk: an accidental `npm publish` happens
  despite the no-NPM policy.** Mitigated by
  the verbatim "Rekon beta will not be
  published to npm" + "No npm publish should
  be attempted during beta" statements, pinned
  by the docs test, plus the explicit "No
  GitHub Actions workflow under
  `.github/workflows/` is allowed to invoke
  `npm publish`" policy in the NPM Publish
  Policy section. Operationally also mitigated
  by the no-automated-publish-triggers policy
  carried forward from earlier batches.
- **Risk: the no-NPM policy is read as
  "Rekon is not beta-ready."** Mitigated by
  the verbatim "Beta readiness is a product /
  checklist state, not an npm-published
  state" statement, plus the explicit
  preservation of the beta-ready decision in
  the Purpose Preservation Check.
- **Risk: the deferral is treated as a
  forever ban.** Mitigated by the explicit
  "until after beta or until a new explicit
  operator decision reverses this policy"
  qualifier in every pinned statement, plus
  the Implementation Sequence's step 11
  "(Optional, deferred) Post-beta npm publish
  authorization work order — Only after
  broader real-repo dogfood + an explicit
  later operator decision reverses the no-NPM
  policy."
- **Risk: operators don't know how to install
  beta without npm.** Mitigated by the
  Install / Run Model During Beta section's
  explicit `git clone` + `npm ci` + `npm run
  build` walkthrough, plus the README's
  no-NPM posture note.
- **Risk: future versions slip without
  matching CHANGELOG / dogfood updates.**
  Mitigated by the existing
  `release-readiness.test.mjs` (which pins
  the `EXPECTED_VERSION = "0.1.0-beta.0"`)
  + the per-batch mandatory verification
  matrix.
- **Follow-up — Additional real-repo dogfood
  cohort plan (next slice).** Defines 3–5
  more real repositories / repo archetypes
  to dogfood.
- **Follow-up — Additional real-repo dogfood
  execution.** Performs the cohort runs.
- **Follow-up — Post-beta source-write apply
  roadmap (4 slices).**
- **Follow-up — Post-beta path freshness +
  watcher roadmap (4 slices).**
- **Follow-up — Post-beta breadth / maturity
  / polish work.**
- **(Optional, deferred) Follow-up — Post-beta
  npm publish authorization work order.** Only
  after broader real-repo dogfood + an
  explicit later operator decision reverses
  the no-NPM policy.

## NEXT STEP

**Additional real-repo dogfood cohort plan.**

That slice's purpose:

- Define 3–5 more real repositories / repo
  archetypes to dogfood before any post-beta
  publish is reconsidered.
- Candidate archetypes: small TS package;
  medium monorepo; Next.js app; mixed JS/TS
  repo; repo with existing GitHub workflows.
- Author the operating procedure for each
  cohort target (how to clone / install / run
  the CLI / record results).
- Define the per-target pass criteria + the
  cohort-wide pass-with-known-limitations
  criterion.
- Specify what the cohort-execution slice
  produces (per-target dogfood report or a
  combined cohort report).

After the cohort plan ships, the cohort
execution slice performs the runs. **Only
after the cohort completes** can the operator
revisit the no-NPM posture (which a later
explicit operator decision could reverse).

**`0.1.0-beta.0` remains the internal beta
version. Beta readiness is a product /
checklist state, not an npm-published state.
No npm publish should be attempted during
beta. Real-repo dogfood passed and should
continue across more repos before public
package release.**

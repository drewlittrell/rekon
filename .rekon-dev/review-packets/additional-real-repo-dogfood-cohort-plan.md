# Review Packet — Additional Real-Repo Dogfood Cohort Plan

**Slice:** `additional-real-repo-dogfood-cohort-plan`
**Sequence position:** Step 6 of the post-blocker
release sequence pinned by the
[Beta Release Readiness Checklist](../../docs/strategy/beta-release-readiness-checklist.md)
+ advanced by the
[No-NPM Beta Distribution Policy](../../docs/strategy/no-npm-beta-distribution-policy.md).
**Batch type:** Strategy / docs / tests only. **No
runtime behaviour change. Does not run the cohort.**
No new package, no new CLI command, no new helper, no
workflow-template change, no validator profile
change, no GitHub API call, no `npm publish`, no
version bump, no release tag, no GitHub Release, no
active workflow YAML, no `package.json` /
`package-lock.json` mutation, no source-file
mutation.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/additional-real-repo-dogfood-cohort-plan.md`](../../docs/strategy/additional-real-repo-dogfood-cohort-plan.md)
   defines the 5-archetype cohort plan. Contains
   all 11 required headings (Decision Summary, Why
   This Plan Exists, Current Beta Distribution
   Posture, Cohort Archetypes, Command Matrix,
   Metrics To Record, Success Criteria, Release
   Blocker Taxonomy, Reporting Format, What This
   Does Not Do, Follow-Up Work), three diagnostic
   tables (cohort archetype: 5 rows; success /
   blocker: 7-row success vs. 6-row acceptable vs.
   9-row blocker; metrics: 27-row required-metric
   list), all five required archetypes (small TS
   package; medium monorepo; Next.js / React app;
   mixed JS/TS repo; existing-workflows repo), the
   at-least-three-distinct-real-repositories
   constraint, the core + representative-path
   command matrix, success criteria, release
   blocker taxonomy, reporting format (per-target
   + cohort summary + execution review packet +
   execution docs test), and the updated 11-step
   implementation sequence.

2. **New docs test** at
   `tests/docs/additional-real-repo-dogfood-cohort-plan.test.mjs`
   pinning the 18 required assertions (memo
   existence; all 11 required `##` headings;
   no-NPM-during-beta + private-local-repo-based
   verbatim; all 5 archetype names; at-least-three-
   distinct-repositories statement; command
   matrix presence; metrics-to-record presence;
   success criteria; release blocker taxonomy;
   findings-acceptable + failed-verification-
   acceptable + validate-invalid-is-blocker
   statements; three diagnostic tables; CHANGELOG
   mention; review-packet PURPOSE PRESERVATION
   CHECK).

3. **Cross-doc updates (6 supporting strategy
   docs):**
   - [`docs/strategy/no-npm-beta-distribution-policy.md`](../../docs/strategy/no-npm-beta-distribution-policy.md)
     implementation sequence advances to mark step
     6 (cohort plan) shipped + step 7 (cohort
     execution) as the next slice.
   - [`docs/strategy/real-repo-beta-dogfood-report.md`](../../docs/strategy/real-repo-beta-dogfood-report.md)
     implementation sequence + Follow-Up Work
     advance to mark step 6 shipped + step 7 next.
   - [`docs/strategy/beta-release-readiness-checklist.md`](../../docs/strategy/beta-release-readiness-checklist.md)
     implementation sequence advances.
   - [`docs/strategy/beta-readiness-classic-parity-review.md`](../../docs/strategy/beta-readiness-classic-parity-review.md)
     release-checklist-resolution row gains the
     cohort plan pointer.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     new completed-slice entry.
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     new completed-slice entry.

4. **README + CHANGELOG entries.**

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
  (still `0.1.0-beta.0`).
- **No `package-lock.json` mutation.**

## PURPOSE PRESERVATION CHECK

The cohort plan is informational + planning; it
preserves every existing invariant:

- **Beta readiness decision.** Unchanged. The
  product is beta-ready as the
  [Beta Release Readiness Checklist](../../docs/strategy/beta-release-readiness-checklist.md)
  declared. The cohort plan adds evidence
  gathering, not a readiness reset.
- **No-NPM beta posture.** Unchanged. The plan
  explicitly carries forward every pinned
  reminder from the
  [No-NPM Beta Distribution Policy](../../docs/strategy/no-npm-beta-distribution-policy.md):
  no npm publish during beta; beta is private /
  local / repo-based; `0.1.0-beta.0` remains
  the internal version; source-controlled
  distribution.
- **Root + workspace versions.** Unchanged
  (still `0.1.0-beta.0`).
- **npm publish state.** Unchanged. No
  publish has occurred. No release tag
  exists. No GitHub Release has been created.
- **Workflow templates.** Unchanged.
- **Validator profiles.** Unchanged.
- **Audit + smoke scripts.** Unchanged.
- **Verification runner / proof surfaces /
  GitHub publishers.** Unchanged.
- **Source-write policy + watcher / path
  freshness policy.** Unchanged.
- **Beta release readiness checklist.**
  Unchanged.
- **Real-repo beta dogfood report.** Updated
  only at the implementation sequence + Follow-
  Up Work pointers; the recorded dogfood
  result (`pass-with-known-limitations`)
  is unchanged.
- **Canonical-truth invariant.** Reinforced.
  The cohort produces artefacts + reports;
  not public package artefacts.
- **No-background-mutation invariant.**
  Reinforced. The plan documents that all
  cohort artefacts live under `mktemp -d`; no
  background mutation of the primary repo's
  artefact store.
- **No-auto-resolution invariant.**
  Reinforced. The plan classifies findings as
  acceptable outcomes (Rekon's job is to
  surface them) — not auto-resolve them.
- **No-source-write-without-explicit-command
  invariant.** Reinforced. The plan documents
  that source mutation outside the temp copy
  is a release blocker.
- **No-token-leak invariant.** Reinforced. The
  plan documents that any `GITHUB_TOKEN`-shaped
  string in any output is a release blocker.
- **No new policy decisions.** The plan
  authors the cohort but does not reverse
  any earlier decision; the cohort execution
  is what produces new evidence.

## CODEBASE-INTEL ALIGNMENT

- **Classic broad-repo dogfood guarantee
  preserved.** `codebase-intel-classic`
  matured across real codebases. The cohort
  plan applies that posture explicitly:
  successful first dogfood (Rekon itself)
  justifies beta validation; broader cohort
  evidence justifies a future publish
  reconsideration.
- **Classic anti-patterns avoided.** The plan
  refuses to pre-authorise a publish; refuses
  to lock the cohort into self-confirming
  targets; refuses to hide expected outcomes
  (findings, failed verification, freshness
  stale entries) as failures; refuses to
  silently broaden the cohort beyond the
  archetypes the operator selects.
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## COHORT ARCHETYPES

Five archetypes defined; at least three
distinct real repositories required.
Placeholders (`<small-ts-package>`,
`<medium-monorepo>`, `<nextjs-app>`,
`<mixed-js-ts-repo>`, `<github-workflows-repo>`)
are intentional — the operator substitutes
concrete repos at cohort execution time.

| Archetype | Placeholder | Why It Matters |
| --- | --- | --- |
| Small TypeScript package | `<small-ts-package>` | package-scale local loop |
| Medium monorepo | `<medium-monorepo>` | workspace / package breadth |
| Next.js / React app | `<nextjs-app>` | route / app / front-end patterns |
| Mixed JS/TS repo | `<mixed-js-ts-repo>` | language-mix behaviour |
| Existing GitHub workflows repo | `<github-workflows-repo>` | workflow-adjacent review surfaces |

Single-repo consolidation is allowed when a
repo legitimately covers multiple archetypes,
but the cohort must still include at least
three distinct real repositories. No cohort
target may be Rekon itself (the first dogfood
already covered that).

## COMMAND MATRIX

Per-target setup (operator-substituted):

- `git clone --local --no-hardlinks` (preferred)
  or `rsync` copy to `mktemp -d`.
- `( cd "$ROOT" && npm ci && npm run build )`
  inside the temp copy.

Core matrix (every target):

- `init`, `refresh`, `artifacts validate`,
  `artifacts freshness`, `findings filter`,
  `findings filter-health`, `findings list`,
  `issues adjudicate`, `issues list`, `coherency
  delta`, `publish proof`, `publish architecture`,
  `publish agent-contract`.

Representative-path matrix (one path per target):

- `resolve preflight`, `intent work-order`,
  `verify run --dry-run`, `verify run --execute`,
  `verify result from-run`, republish all three,
  `publish github-check --dry-run`, `publish
  pr-comment --dry-run`, final `artifacts
  validate`, final `artifacts freshness`.

Workflow validator matrix (once from the Rekon
repo, plus the `<github-workflows-repo>`
archetype additionally validates operator-
supplied workflow YAML).

**No `--send` flow anywhere.** No GitHub API
call. No npm publish. No version bump. No
source mutation outside the temp copy.

## SUCCESS CRITERIA

The cohort is successful if every target:

- `refresh` completes (`status: passed`).
- `artifacts validate` is clean.
- All three publications render.
- Both GitHub dry-runs render without network.
- No CLI crash.
- No artefact corruption.
- No token leak.
- No source mutation outside temp copy.

Acceptable non-failure outcomes documented in
the plan (findings exist; failed `verify run
--execute` recorded honestly; aggregate
freshness stale; PR comment readiness gaps
without env; etc.).

## RELEASE BLOCKERS

Any of the following in any target stops the
cohort + triggers a dogfood blocker fix
batch:

- `refresh` crash.
- `artifacts validate` returns `valid: false`.
- Malformed artefact.
- Publication render failure.
- CLI crash.
- Token / log leak.
- Source mutation outside temp copy.
- Workflow validator returns invalid for a
  Rekon-supplied template.
- `verify run --dry-run` mode actually
  executes commands.
- GitHub `--dry-run` makes a network call.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/additional-real-repo-dogfood-cohort-plan.test.mjs`
  — 18 assertions, all passing.
- **Existing suites still passing:** every
  prior contract / docs suite. Full suite
  expected ≥ 1728 passed / 1 skipped (1710
  prior + 18 new).
- **Audits / smokes:** all 5 expected to pass
  unchanged.
- **No CLI smoke required in this batch.**
  Strategy-only batch. The cohort execution
  (next slice) is what runs the matrix.

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
- The recorded dogfood result
  (`pass-with-known-limitations`) — unchanged.

## RISKS / FOLLOW-UP

- **Risk: the cohort plan gets read as
  authorisation to run the cohort
  immediately.** Mitigated by the verbatim
  "this batch does not run the cohort"
  statement in the Decision Summary + the
  explicit "the cohort execution is the next
  slice's responsibility" pointer in the
  Follow-Up Work section.
- **Risk: cohort archetypes get hard-coded
  to private operator repos.** Mitigated by
  the intentional placeholder usage
  (`<small-ts-package>`, etc.) + the explicit
  "the operator substitutes concrete repos at
  cohort-execution time" guidance.
- **Risk: successful cohort gets read as
  publish authorization.** Mitigated by the
  Follow-Up Work section's explicit "revisiting
  the no-NPM policy requires a separate
  explicit operator decision" pinning.
- **Risk: blocked cohort silently stalls
  beta.** Mitigated by the Release Blocker
  Taxonomy's explicit "any release blocker
  in any target stops the cohort and triggers
  a dogfood blocker fix batch" framing, plus
  the Follow-Up Work section's "if the cohort
  is `blocked`, the operator authors a
  dogfood blocker fix batch" pointer.
- **Risk: cohort consolidates onto fewer
  than three repos.** Mitigated by the
  cohort archetype section's verbatim "the
  cohort must include at least three distinct
  real repositories" rule.
- **Risk: cohort hides failures behind
  "acceptable" classifications.** Mitigated
  by the explicit Acceptable Outcomes table
  enumerating exactly which outcomes are
  acceptable + the Release Blocker Taxonomy
  enumerating which are blockers; ambiguity
  surfaces explicitly.
- **Follow-up — Additional real-repo dogfood
  execution (next slice).** Runs the cohort.
- **Follow-up (optional) — Cohort summary
  classification.** Produced inside the
  cohort execution work order; informs
  whether dogfood blocker fix batches are
  needed.
- **Follow-up (post-cohort, optional) —
  No-NPM-policy revision work order.** Only
  with explicit operator decision after the
  cohort summary lands.
- **Follow-up — Post-beta source-write apply
  roadmap (4 slices).**
- **Follow-up — Post-beta path freshness +
  watcher roadmap (4 slices).**
- **Follow-up — Post-beta breadth / maturity
  / polish work.**

## NEXT STEP

**Additional real-repo dogfood execution.**

That work order:

- Substitutes operator-selected concrete
  repositories for each archetype placeholder
  (or documents archetype consolidation
  honestly).
- Runs the command matrix defined in this
  plan against every target.
- Records the metrics defined in this plan
  for every target.
- Classifies outcomes using the success /
  blocker taxonomy defined in this plan.
- Writes the per-target dogfood reports + the
  cohort summary report + the cohort
  execution review packet + the cohort
  execution docs test.
- Still does not publish to npm, bump
  versions, create a git tag, or create a
  GitHub Release. The no-NPM beta posture
  stays in force.

After the cohort execution lands, the
operator decides whether to revisit the
no-NPM posture, ship dogfood blocker fixes,
or continue beta indefinitely.

**No npm publish during beta. Beta is private
/ local / repo-based. At least three distinct
real repositories must be exercised before
any post-beta publish reconsideration.
Findings are acceptable outcomes. Failed
verification is acceptable when recorded
honestly. `artifacts validate: invalid` is a
release blocker.**

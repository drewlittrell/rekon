# Review Packet — Additional Real-Repo Dogfood Execution

**Slice:** `additional-real-repo-dogfood-execution`
**Sequence position:** Step 7b of the post-blocker
release sequence — the cohort execution itself,
following the operator's approved intake table.
**Batch type:** Release-validation (cohort
execution) + docs. **No runtime behaviour
change.** No new package, no new CLI command, no
new helper, no workflow-template change, no
validator profile change, no GitHub API call, no
`npm publish`, no version bump, no release tag,
no GitHub Release, no active workflow YAML, no
`package.json` / `package-lock.json` mutation,
no source-file mutation, no mutation of any
target repo's source tree outside `mktemp -d`
copies.

## CHANGES MADE

1. **Executed the cohort against three distinct
   operator-approved repositories** covering all
   five archetypes via two documented
   consolidations:
   - `boundary-contracts` → `<small-ts-package>`
     + `<github-workflows-repo>` (consolidated)
   - `structured-evals` → `<medium-monorepo>`
   - `figma-ds` → `<nextjs-app>` +
     `<mixed-js-ts-repo>` (consolidated)
2. **Three new per-target reports** under
   `docs/strategy/real-repo-cohort/`:
   - [`boundary-contracts.md`](../../docs/strategy/real-repo-cohort/boundary-contracts.md)
     — `pass` (3/3 commands passed; conclusion
     `success`)
   - [`structured-evals.md`](../../docs/strategy/real-repo-cohort/structured-evals.md)
     — `pass-with-known-limitations` (monorepo
     missing root `build` script; honest
     failure)
   - [`figma-ds.md`](../../docs/strategy/real-repo-cohort/figma-ds.md)
     — `pass-with-known-limitations` (real TS
     errors in source; honest failure)
3. **New cohort summary** at
   [`docs/strategy/real-repo-cohort-summary.md`](../../docs/strategy/real-repo-cohort-summary.md)
   classifies the cohort decision as
   `pass-with-known-limitations` with **no
   release blockers found**. Contains all 11
   required headings + 4 required tables
   (cohort target / per-target summary / blocker
   / known-limitations).
4. **New docs test** at
   `tests/docs/additional-real-repo-dogfood-execution.test.mjs`
   pinning 15 required assertions (summary
   existence; all 11 required `##` headings;
   "this batch does not publish to npm" + "this
   batch does not change package versions" +
   "this batch does not create a git tag" +
   "this batch does not create a GitHub Release"
   + "targets ran from temp copies" verbatim;
   cohort target table + per-target summary
   table + blocker table or "No release blockers
   found"; Dogfood Decision recorded; at least
   three per-target reports exist; each report
   contains required headings + metrics table;
   CHANGELOG mention; review-packet PURPOSE
   PRESERVATION CHECK).
5. **Cross-doc updates (6 supporting strategy
   docs):**
   - [`docs/strategy/additional-real-repo-dogfood-cohort-plan.md`](../../docs/strategy/additional-real-repo-dogfood-cohort-plan.md)
     implementation sequence advances to mark
     step 7b shipped.
   - [`docs/strategy/real-repo-cohort-intake-request.md`](../../docs/strategy/real-repo-cohort-intake-request.md)
     same advance.
   - [`docs/strategy/no-npm-beta-distribution-policy.md`](../../docs/strategy/no-npm-beta-distribution-policy.md)
     same advance.
   - [`docs/strategy/real-repo-beta-dogfood-report.md`](../../docs/strategy/real-repo-beta-dogfood-report.md)
     same advance.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     new completed-slice entry.
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     same.
6. **README + CHANGELOG entries.**

All targets' `.rekon/**` artefacts live under
`mktemp -d` directories and are **not
committed** to this repo. The temp directories
are intentionally ephemeral.

## PUBLIC API CHANGES

- **None.** This is a release-validation +
  docs batch.
- No new exports from any `@rekon/*` package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue
  code.
- No new workflow template.
- No new artifact type.
- No new capability package.
- No new role / permission.
- **No `package.json` `version` field
  mutation** (still `0.1.0-beta.0`).
- **No `package-lock.json` mutation.**

## PURPOSE PRESERVATION CHECK

The cohort execution validates + records
observations; it preserves every existing
invariant:

- **Beta readiness decision.** Unchanged.
- **No-NPM beta posture.** Unchanged.
- **Root + workspace versions.** Unchanged
  (still `0.1.0-beta.0`).
- **npm publish state.** Unchanged. No
  publish has occurred. No release tag
  exists. No GitHub Release has been created.
- **Workflow templates.** Unchanged. All
  four validated clean against their
  corresponding profiles.
- **Validator profiles.** Unchanged.
- **Audit + smoke scripts.** Unchanged.
- **Verification runner / proof surfaces /
  GitHub publishers.** Unchanged. The cohort
  proves they behave correctly end-to-end
  on three different real repo shapes,
  including both passing and failing
  verification paths.
- **Source-write policy + watcher / path
  freshness policy.** Unchanged. The cohort
  made zero source writes; refresh was an
  explicit operator command on every
  target.
- **Beta release readiness checklist.**
  Unchanged.
- **No-NPM beta distribution policy.**
  Unchanged. Cohort success does not
  automatically trigger publish; revisiting
  the no-NPM posture requires a separate
  explicit operator decision after this
  summary lands.
- **Cohort plan archetypes + command matrix
  + metrics + success criteria + release
  blocker taxonomy + reporting format.**
  Unchanged. The execution applied them
  verbatim per target.
- **Real-repo beta dogfood report.**
  Unchanged at the recorded result level;
  only the implementation sequence pointer
  is advanced.
- **Canonical-truth invariant.** Reinforced.
  Cohort artefacts live under `mktemp -d`;
  no operator repo's source tree was
  mutated; no `.rekon/**` from any target
  was committed.
- **No-background-mutation invariant.**
  Reinforced.
- **No-auto-resolution invariant.**
  Reinforced. The two honest verification
  failures (structured-evals / figma-ds)
  propagated honestly through the proof
  chain; no auto-resolution.
- **No-source-write-without-explicit-command
  invariant.** Reinforced.
- **No-token-leak invariant.** Reinforced.
  No GitHub API call was made for any
  target; both publishers ran in `--dry-run`
  mode for every target.
- **Anonymization posture.** Honoured. Per
  the intake's default and the operator's
  approval, repo names are reported with
  relative names only; no full filesystem
  paths; no source excerpts in any report.
- **No invented repo names.** Honoured.
  Every target was operator-approved.

## CODEBASE-INTEL ALIGNMENT

- **Classic broad-repo dogfood guarantee
  delivered.** `codebase-intel-classic`
  matured across real codebases. The cohort
  applies that posture explicitly:
  successful first dogfood (Rekon itself) +
  cohort dogfood (3 additional distinct
  repos) collectively validate the product
  loop across four real targets, including
  two with honest verification failures.
- **Classic anti-patterns avoided.** The
  cohort refused to hide failures; refused
  to pre-authorise publish; refused to
  mutate operator source trees; refused to
  commit cohort artefacts back into the
  primary repo; refused to substitute Rekon
  itself or any committed example fixture.
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## COHORT TARGETS

Three distinct operator-approved real
repositories covering all five archetypes
via two documented consolidations:

| Archetype | Target | Representative Path | SHA | Outcome |
| --- | --- | --- | --- | --- |
| `<small-ts-package>` + `<github-workflows-repo>` | `boundary-contracts` | `src/index.ts` | `884abb40` | `pass` |
| `<medium-monorepo>` | `structured-evals` | `packages/core/src/index.ts` | `e60ceadf` | `pass-with-known-limitations` |
| `<nextjs-app>` + `<mixed-js-ts-repo>` | `figma-ds` | `app/page.tsx` | `0771d984` | `pass-with-known-limitations` |

## COMMAND MATRIX

Per the cohort plan, the same matrix ran
against every target (no exceptions). Setup
via `git clone --local --no-hardlinks` to
`mktemp -d`; `npm ci` + `npm run build` (or
script-absence honestly recorded) inside the
temp copy. Core matrix + representative-path
matrix run for every target. Workflow
validator matrix ran once from the Rekon
repo. No `--send` flow. No GitHub API call.
No npm publish. No source mutation outside
any temp copy.

## ARTIFACT RESULTS

**Aggregate: 102 artefacts across 19 types
(34 per target × 3 targets).** Every
artefact validated clean at every checkpoint
in every target; no corruption; no
unreadable publication; no token leak; no
malformed header.

## VERIFICATION RESULTS

| Target | Pre-execute dry-run | Execute outcome | Per-command detail |
| --- | --- | --- | --- |
| `boundary-contracts` | 3/3 `not-run`, `executed: false` | **`passed`** | typecheck exit 0 / 680 ms; test exit 0 / 1 701 ms; build exit 0 / 602 ms |
| `structured-evals` | 3/3 `not-run` | `failed` (acceptable) | typecheck exit 0 / 1 150 ms; test exit 0 / 1 675 ms; build exit 1 / 104 ms (missing `build` script) |
| `figma-ds` | 3/3 `not-run` | `failed` (acceptable) | typecheck exit 2 / 2 286 ms (real TS errors); test exit 1 / 110 ms (missing `test` script); build exit 0 / 370 ms |

The two `failed` cases propagated honestly
through VerificationResult → proof → Check
dry-run; per the cohort plan's success
criteria they are acceptable, not release
blockers.

## GITHUB DRY-RUN RESULTS

| Target | github-check `conclusion` | pr-comment `wouldPublish` | pr-comment readiness gaps |
| --- | --- | --- | ---: |
| `boundary-contracts` | `success` (Verification: passed (fresh)) | `false` | 5 |
| `structured-evals` | `failure` (Verification: failed) | `false` | 5 |
| `figma-ds` | `failure` (Verification: failed) | `false` | 5 |

**No network call** in any GitHub dry-run.
The github-check payload propagates
verification state honestly in both
directions (success when verification
passes; failure when it fails). The
pr-comment readiness gaps are the documented
"5 gaps without GitHub env" expected
behaviour.

## DOGFOOD DECISION

**`pass-with-known-limitations`.** No
release blockers found. Two targets recorded
honest verification failures from their own
scripts; both failures propagated truthfully
through the proof chain. The Rekon CLI
itself behaved correctly on three different
real repo shapes.

The successful cohort **does not
automatically trigger npm publish**. Per the
no-NPM beta distribution policy, revisiting
the no-NPM posture requires a separate
explicit operator decision after this
summary lands.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/additional-real-repo-dogfood-execution.test.mjs`
  — 15 assertions, all passing.
- **Existing suites still passing:** every
  prior contract / docs suite. Full suite
  expected ≥ 1753 passed / 1 skipped (1738
  prior + 15 new).
- **Audits / smokes:** all 5 pass on the
  primary tree at every gate (pre-cohort
  + post-cohort-doc-drop).
- **No additional CLI smoke required in the
  docs-finalisation pass.** The cohort
  matrix already ran per target and is
  recorded in the per-target reports + the
  summary.

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
- `.github/workflows/*.yml` in the Rekon
  repo — unchanged (still empty).
- The committed `examples/simple-js-ts`
  fixture and all other committed examples —
  unchanged.
- **Every cohort target's actual source
  tree** — unchanged (`/Users/andrewlittrell/Code/boundary-contracts/`,
  `…/structured-evals/`, `…/figma-ds/` were
  never modified; only `mktemp -d` copies
  were).
- **Every cohort target's `.rekon/**`
  artefacts** — not committed (live under
  the temp directories, intentionally
  ephemeral).

## RISKS / FOLLOW-UP

- **Risk: a future agent reads "cohort
  passed" and tries to publish.** Mitigated
  by the verbatim "successful cohort does
  not automatically trigger publish" + "the
  no-NPM beta posture stays in force" +
  "revisiting the no-NPM policy requires a
  separate explicit operator decision"
  statements, pinned by the docs test +
  carried forward from the cohort plan +
  no-NPM policy memos.
- **Risk: the two recorded failures get
  read as Rekon defects.** Mitigated by the
  explicit "acceptable outcome per the
  cohort plan" framing in each per-target
  report, plus the Cross-Target Findings
  section explaining the
  missing-script + real-TS-error patterns.
- **Risk: cohort target identities leak via
  the per-target report files committed to
  the public repo.** Per the intake's
  default-anonymise posture, the operator
  approved relative-name-only disclosure
  (e.g., `boundary-contracts` rather than
  the full filesystem path). Source excerpts
  + diagnostic details from operator code
  are not recorded.
- **Risk: cohort `.rekon/**` artefacts get
  accidentally committed.** Mitigated by
  using `mktemp -d` directories outside the
  primary worktree.
- **Risk: future Rekon batches re-run the
  cohort against different commits without
  re-verification.** Each cohort target's
  source SHA is recorded in its per-target
  report; future cohort batches start from
  scratch with their own `mktemp -d`
  copies.
- **Follow-up — Operator decision.** The
  no-NPM beta posture defers this
  explicitly: continue beta with the no-NPM
  posture indefinitely; add more cohort
  targets; pivot to post-beta tracks; or
  open a no-NPM-policy-revision work
  order.
- **Follow-up (post-beta polish, surfaced
  by this cohort) — VerificationPlan
  adaptation for missing scripts.** When
  `test` or `build` is not defined, the
  plan could mark `not-applicable` instead
  of `failed`. Honest-failure recording is
  correct today; this would be a
  signal-to-noise improvement post-beta.
  Not a release blocker.
- **Follow-up — Post-beta source-write
  apply roadmap (4 slices).** Independent
  of cohort.
- **Follow-up — Post-beta path freshness +
  watcher roadmap (4 slices).** Independent.
- **Follow-up — Post-beta breadth /
  maturity / polish work.** Independent.

## NEXT STEP

**Operator decision** about the next slice.
The cohort summary explicitly defers the
"what now" question to the operator:

- Continue beta with the no-NPM posture
  indefinitely.
- Author additional cohort batches (more
  repos / different archetypes).
- Pivot to post-beta tracks
  (source-write / watcher / breadth /
  polish).
- Open a no-NPM-policy-revision work order
  (requires a new explicit operator
  decision; this summary does not
  pre-authorise one).

Whichever the operator picks, **this batch
does not publish to npm, change package
versions, create a git tag, or create a
GitHub Release**. The no-NPM beta posture
stays in force.

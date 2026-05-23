# Review Packet — Beta Release Candidate Execution Plan

**Slice:** `beta-release-candidate-execution-plan`
**Sequence position:** Step 2 of the post-blocker
release sequence pinned by
[Beta Release Readiness Checklist](../../docs/strategy/beta-release-readiness-checklist.md)
(step 1 was the checklist; this step is the
execution against main).
**Batch type:** Release-candidate execution + docs.
**No runtime behaviour change.** No new package, no
new CLI command, no new helper, no workflow-template
change, no validator profile change, no GitHub API
call, no `npm publish`, no version bump, no release
tag, no active workflow YAML.

## CHANGES MADE

1. **Executed the pinned checklist against main on
   SHA `54d1dfd`** — all 9 mandatory verification
   commands + the full CLI smoke matrix (15 entries).
   Every result was recorded honestly (including the
   two documented first-class behaviours: failed
   `verify run --execute` against a fixture with no
   real test commands, and `pr-comment --dry-run`
   readiness reporting the expected gaps with no
   GitHub env set).
2. **New execution plan memo** at
   [`docs/strategy/beta-release-candidate-execution-plan.md`](../../docs/strategy/beta-release-candidate-execution-plan.md).
   Contains all 11 required headings (Decision
   Summary, Release Candidate SHA, Package And
   Version State, Mandatory Verification Results,
   CLI Smoke Matrix Results, Known Beta Limitations,
   Release Stop Conditions, Beta Version
   Recommendation, Release Work Order Preview, What
   This Does Not Do, Follow-Up Work). Contains the
   git state table (3 rows), mandatory verification
   table (9 rows), CLI smoke matrix table (17 rows
   covering 15 distinct smokes + the two final
   validation passes), known limitations table (7
   primary rows + 8 carried forward). Records the
   recommended beta version `0.1.0-beta.0`. Pins the
   release work order preview as an 8-step sequence
   gated by operator authorisation before publish.
3. **New docs test** at
   `tests/docs/beta-release-candidate-execution-plan.test.mjs`
   pinning the 18 required assertions (memo
   existence; all 11 required headings; release-
   candidate-qualifies statement; no-publish + no-
   version-bump + no-release-tag verbatim
   statements; beta version recommendation;
   diagnostic tables; mandatory verification
   commands; CLI smoke matrix entries; CHANGELOG
   mention; review-packet PURPOSE PRESERVATION
   CHECK).
4. **Cross-doc updates:**
   - [`docs/strategy/beta-release-readiness-checklist.md`](../../docs/strategy/beta-release-readiness-checklist.md)
     marks the execution plan as shipped + advances
     the implementation sequence's next-slice
     pointer.
   - [`docs/strategy/beta-readiness-classic-parity-review.md`](../../docs/strategy/beta-readiness-classic-parity-review.md)
     adds an execution-plan pointer.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the execution plan.
5. **README + CHANGELOG entries.**

All 4 supporting strategy docs + CHANGELOG + README
were updated; the work order's 6-doc update target
is satisfied.

## PUBLIC API CHANGES

- **None.** This is a release-candidate execution +
  docs batch.
- No new exports from any `@rekon/*` package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue code.
- No new workflow template.
- No new artifact type.
- No new capability package.
- No new role / permission.
- **No `package.json` `version` field mutation**
  (root or workspace).

## PURPOSE PRESERVATION CHECK

The memo records observations + advances the release
sequence; it preserves every existing invariant:

- **Root + workspace versions.** Unchanged. The
  memo confirms every workspace package still
  shares `0.1.0-alpha.1`.
- **npm publish state.** Unchanged. No publish has
  occurred. No release tag exists. No GitHub
  Release has been created.
- **Workflow templates.** Unchanged. The smoke
  matrix validates the four shipped templates;
  none was modified.
- **Validator profiles.** Unchanged. The smoke
  matrix exercises all three profiles
  (`read-only`, `github-check-send`,
  `github-pr-comment-send`); each passed with 0
  issues against its corresponding template.
- **Audit + smoke scripts.** Unchanged. All five
  scripts ran successfully on the candidate SHA.
- **Verification runner / proof surfaces / GitHub
  publishers.** Unchanged. The smoke matrix
  exercised every surface; results match the
  documented contracts (failed VerificationRun is
  first-class; PR comment readiness reports gaps
  honestly).
- **Source-write policy + watcher / path
  freshness policy.** Unchanged. Both upstream
  policy memos remain in force; the execution
  plan does not re-litigate either.
- **Beta release readiness checklist.**
  Unchanged. The execution plan executes the
  checklist; it does not modify it.
- **Canonical-truth invariant.** Reinforced. The
  GitHub Check dry-run payload includes the
  "GitHub status is not canonical truth; Rekon
  artifacts remain canonical" reminder verbatim.
- **No-background-mutation invariant.**
  Reinforced. No background process ran during
  the smoke matrix.
- **No-auto-resolution invariant.** Reinforced.
  The failed VerificationRun → failed
  VerificationResult → failed proof chain
  propagates honestly through every downstream
  surface.
- **No-source-write-without-explicit-command
  invariant.** Reinforced. No surface mutated
  source files; only `.rekon/artifacts/**` was
  written (and only in the temp fixture root).
- **No-token-leak invariant.** Reinforced. No
  GitHub API call was made.
- **No new policy decisions outside the scope of
  this batch.** The version bump and the publish
  remain the responsibility of separate explicit
  work orders.

## CODEBASE-INTEL ALIGNMENT

- **Classic product loop demonstrated.** The
  smoke matrix walked the full codebase-intel-
  classic-equivalent loop on a fixture root:
  observe → project → snapshot → evaluate →
  filter → adjudicate → coherency → reconcile
  (intent work-order) → verify (dry-run +
  execute) → result → publish (proof +
  architecture + agent-contract + github-check
  + pr-comment) → workflow validate. Every step
  produced its expected artefact or honest
  failure-status output.
- **Classic anti-patterns avoided.** The memo
  refuses to hide failed smoke results; refuses
  to declare beta-ready without recording the
  actual SHA; refuses to publish autonomously;
  refuses to bump versions in the wrong batch.
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## RELEASE CANDIDATE SHA

| Ref | SHA |
| --- | --- |
| HEAD | `54d1dfd2cd360434a82738d3963ec9cbb5b709f2` |
| main | `54d1dfd2cd360434a82738d3963ec9cbb5b709f2` |
| origin/main | `54d1dfd2cd360434a82738d3963ec9cbb5b709f2` |

Detached-HEAD worktree; `main` fast-forwarded to
match `HEAD` before this memo itself lands.
Working tree clean before final commit.

## PACKAGE / VERSION STATE

- **Workspace package count:** 20.
- **Root version:** `0.1.0-alpha.1`.
- **Workspace versions:** every one of the 20
  workspace packages also at `0.1.0-alpha.1`.
- **Recommended beta target:** `0.1.0-beta.0`
  (deferred to the version bump work order).

## MANDATORY VERIFICATION

All 9 commands pinned by the
[Beta Release Readiness Checklist](../../docs/strategy/beta-release-readiness-checklist.md)
passed:

- `npm run typecheck`
- `npm run test` (1644 passed / 1 skipped)
- `npm run build`
- `git diff --check`
- `node scripts/audit-package-exports.mjs` (20
  packages; 0 issues)
- `node scripts/audit-license.mjs` (20 packages;
  Apache-2.0 across root + workspaces)
- `node scripts/publish-dry-run.mjs` (20
  packages; no publish attempted)
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs` (20
  tarballs installed; 13 artifact families
  emitted)

## CLI SMOKE MATRIX

All 15 smokes plus 2 post-matrix validation
passes were exercised on a temporary fixture
root (`mktemp -d` copy of
`examples/simple-js-ts`). The matrix's
`verify run --execute` and `publish pr-comment
--dry-run` results recorded the documented
first-class behaviours honestly:

- `verify run --execute` failed because the
  fixture has no real test commands; the
  VerificationRun was written; `artifacts
  validate` remained clean. **First-class
  behaviour per `docs/concepts/verification-runs.md`.**
- `publish pr-comment --dry-run` readiness
  reported the expected gaps (`not-enabled`,
  `missing-repository`, `missing-pr-number`,
  `missing-token`,
  `write-permission-not-confirmed`) with no
  network call. **First-class behaviour per
  `docs/concepts/pr-comment-publisher-readiness.md`.**

Both behaviours are documented in the memo's
CLI Smoke Matrix Results table. No smoke
succeeded by hiding a failure.

## KNOWN LIMITATIONS

All limitations carried forward from the
checklist remain accurate:

- source-write apply: not available.
- watcher daemon: not available.
- hosted GitHub App: not available.
- active workflows: not installed automatically.
- GitHub writes: opt-in only.
- Windows process-tree kill: direct-child-only.
- full classic parity: not claimed.
- `PathFreshnessReport`: reserved but not
  implemented.
- `ReconciliationApplyReport`: reserved but not
  implemented.
- `source:write`: reserved but not registered.
- `paths` / `events` invalidation rules: public
  intent only.
- PR comment publisher bounded-retry: post-beta
  polish.
- Same-repo `pull_request` guard enforcement:
  post-beta polish.
- Memory promotion / supersession: post-beta
  maturity work.
- Deeper rule catalog expansion: post-beta
  breadth work.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/beta-release-candidate-execution-plan.test.mjs`
  — 18 assertions, all passing.
- **Existing suites still passing:** every prior
  contract / docs suite. Full suite expected ≥
  1662 passed / 1 skipped (1644 prior + 18 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass
  unchanged (and recorded passing as part of the
  execution itself).
- **No CLI smoke required in this docs-finalisation
  pass.** The full matrix already ran during the
  execution and is recorded in the memo. The
  documentation drop itself is a strategy-only
  batch.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged.
- `packages/capability-verify/src/index.ts` —
  unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- Every workspace `package.json` `version` field —
  unchanged (still `0.1.0-alpha.1`).
- Root `package.json` `version` field — unchanged
  (still `0.1.0-alpha.1`).
- `scripts/audit-package-exports.mjs`,
  `scripts/audit-license.mjs`,
  `scripts/publish-dry-run.mjs`,
  `scripts/install-smoke.mjs`,
  `scripts/install-tarball-smoke.mjs` — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- All existing contract tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).
- The `examples/simple-js-ts` fixture — unchanged
  (smokes ran against a temp `mktemp -d` copy).

## RISKS / FOLLOW-UP

- **Risk: the recommended beta version
  (`0.1.0-beta.0`) gets applied in the wrong
  batch.** Mitigated by the verbatim "no version
  bump in this batch" statement, pinned by the
  docs test, plus the explicit Release Work Order
  Preview section documenting that step 2 is the
  bump (in a separate work order).
- **Risk: an accidental `npm publish` happens
  before the operator authorises it.** Mitigated
  by the verbatim "no `npm publish` in this
  batch" statement, the Release Work Order
  Preview's step 4 operator-authorisation gate,
  and the no-automated-publish-triggers policy
  carried forward from the checklist.
- **Risk: a release tag is pushed before
  publish.** Mitigated by the Release Work
  Order Preview's step 6 (tag only after
  successful publish).
- **Risk: a future contributor reads the
  execution plan and concludes Rekon is
  already published.** Mitigated by the
  Decision Summary's "this batch does not
  publish to npm, does not bump versions, and
  does not tag a release" statement, pinned by
  the docs test.
- **Risk: the failed `verify run --execute`
  result is misread as a regression.**
  Mitigated by the explicit "first-class
  behaviour per `docs/concepts/verification-runs.md`"
  framing in the CLI Smoke Matrix Results
  table.
- **Follow-up — Beta version bump work order
  (next slice).** Applies `0.1.0-beta.0` to
  root + every workspace package; re-runs
  audits + smokes on the bumped SHA.
- **Follow-up — Beta release work order.**
  Explicit operator authorisation;
  `npm publish --provenance`; git tag; GitHub
  Release.
- **Follow-up — Post-beta source-write apply
  roadmap (4 slices).**
- **Follow-up — Post-beta path freshness +
  watcher roadmap (4 slices).**
- **Follow-up — Post-beta breadth / maturity /
  polish work.**

## NEXT STEP

**Beta version bump work order.**

That work order:

- Applies the operator-approved beta version
  (`0.1.0-beta.0` recommended) to `package.json`
  (root) and every `packages/*/package.json` in a
  single coordinated commit.
- Re-runs the mandatory verification commands +
  the CLI smoke matrix on the bumped SHA.
- Prepares the explicit `npm publish` step for
  operator authorisation.
- **Still avoids `npm publish` unless the
  operator explicitly authorises it in that
  work order.**

After the bump work order, the beta release work
order (explicit operator authorisation) performs
the publish + tag + GitHub Release steps. After
that, post-beta source-write apply / path
freshness + watcher / breadth + maturity + polish
work proceeds against the deferred surfaces.

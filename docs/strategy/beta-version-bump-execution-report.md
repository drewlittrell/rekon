# Beta Version Bump Execution Report

## Decision Summary

**Version `0.1.0-beta.0` has been applied
coherently across the root package and all 20
workspace packages.** The lockfile reflects the
bump (workspace versions + `@rekon/*` dependency
pins). All 9 mandatory verification commands pass
on the bumped tree. The 15-entry CLI smoke matrix
ran on a temporary fixture root with the same
honest results as the release-candidate execution
plan (Batch 30) — including the two documented
first-class behaviours (failed `verify run
--execute` against a fixture with no real test
command; `pr-comment --dry-run` readiness
reporting expected gaps with no GitHub env set).

**This batch does not publish to npm.**

**This batch does not create a git tag.**

**This batch does not create a GitHub Release.**

**The next publish step requires explicit
operator authorization.**

The next slice is the beta npm publish
authorization work order — the first slice that
is allowed to invoke `npm publish --provenance`,
and only with explicit operator authorization.

## Starting State

| Ref | SHA |
| --- | --- |
| starting HEAD | `a91ee0a6768b1ee7dc8e64afc7ef83691b78cce3` |
| bumped HEAD | (this batch's commit on `main`) |
| main | (advances to the bumped HEAD before push) |
| origin/main | (advances to the bumped HEAD after push) |

The bumped HEAD is the SHA produced by this
batch's commit; `main` and `origin/main` are
fast-forwarded to match before the report is
considered ground truth.

The starting working tree was clean (no
uncommitted changes). The worktree is operating
in detached-HEAD mode; the primary `main` ref is
fast-forwarded to match `HEAD` before push.

## Version Applied

**Version `0.1.0-beta.0`** has been applied to:

- `package.json` (root).
- `packages/*/package.json` (every workspace
  package — 20 packages).
- `package-lock.json` (root `version` field +
  workspace `version` entries + every `@rekon/*`
  dependency pin inside `lock.packages`).
- Each workspace `package.json`'s
  `dependencies` / `devDependencies` /
  `peerDependencies` / `optionalDependencies`
  entries that reference another `@rekon/*`
  package.

The bump was applied via a deterministic Node
script (not `npm version` and not `npm publish`).
The `npm install --package-lock-only` flow was
not used because the lockfile contained
unpublished `@rekon/*` references that would
have triggered registry lookups. The lockfile
rewrite walked `lock.packages` and updated only
Rekon-internal version + dependency pin entries
matching `0.1.0-alpha.1`, leaving all third-party
package metadata untouched.

## Package Version Matrix

| Scope | Version | Status |
| --- | --- | --- |
| root package | `0.1.0-beta.0` | pass |
| workspace packages (20) | `0.1.0-beta.0` | pass |
| package-lock | `0.1.0-beta.0` | pass |
| `@rekon/*` dependency pins in workspace `package.json` files | `0.1.0-beta.0` (70 pins) | pass |
| `@rekon/*` dependency pins in `package-lock.json` | `0.1.0-beta.0` (70 pins) | pass |

The deterministic coherence checks (a
post-bump script that walks every workspace
`package.json` + the lockfile) report no
mismatches. Zero `0.1.0-alpha.1` references
remain in any `package.json` or
`package-lock.json`.

**Test infrastructure:**
`tests/docs/release-readiness.test.mjs`'s
`EXPECTED_VERSION` constant was bumped from
`0.1.0-alpha.1` to `0.1.0-beta.0`, and its test
description was updated to match. The alpha-
release-document existence assertions
(`docs/release/0.1.0-alpha.1.md`,
`docs/release/alpha-release-checklist.md`, etc.)
remain intact because those documents are
historical artefacts of the alpha release prep
and continue to be useful as references.

## Mandatory Verification Results

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run test` | pass (1662 passed / 1 skipped) |
| `npm run build` | pass |
| `git diff --check` | pass |
| `node scripts/audit-package-exports.mjs` | pass (20 packages inspected; 0 issues) |
| `node scripts/audit-license.mjs` | pass (20 packages; root + per-package licenses match `Apache-2.0`) |
| `node scripts/publish-dry-run.mjs` | pass (20 packages inspected; no publish attempted) |
| `node scripts/install-smoke.mjs` | pass (install-from-build) |
| `node scripts/install-tarball-smoke.mjs` | pass (20 tarballs installed; 13 artifact families emitted) |

**All 9 mandatory commands passed on the
bumped tree.** The test count matches Batch 30's
post-bump run (1662 passed / 1 skipped) — the
bump introduces no test regressions and no test
that depends on the version string outside the
already-updated `release-readiness.test.mjs`.

The optional `codebase-intel-classic` dogfood
regression remains gated by
`REKON_DOGFOOD_CLASSIC_ROOT` and is the one
skipped test.

## CLI Smoke Matrix Results

Executed against a temporary fixture root
(`mktemp -d` copy of
`examples/simple-js-ts`); the committed example
was not mutated.

| Smoke | Result | Notes |
| --- | --- | --- |
| `refresh` | pass | 14 lifecycle steps; status `passed`; no missing artifact families |
| `artifacts validate` (post-refresh) | pass | `valid: true`, 0 issues |
| `artifacts freshness` (post-refresh) | aggregate `stale` | 1564 `newer-input-exists` issues against historical artifacts; documented latest-major pattern, not a release blocker |
| `intent work-order` | pass | produced `IntentMap` + `WorkOrder` + `VerificationPlan` (`verification-plan-…`) |
| `verify run --dry-run` | pass | 3 commands, all `not-run`, `executed: false`; VerificationRun written |
| `verify run --execute` | recorded failure | 3 commands, all `failed` (fixture has no real test command); VerificationRun written; failed command status is first-class; `artifacts validate` remains clean |
| `verify result from-run` | pass (failed status) | VerificationResult derived honestly with `status: failed`; 3 commands; downstream surfaces will reflect the failure |
| `publish proof` | pass | Publication `proof-report-…` written under `.rekon/artifacts/publications/` |
| `publish architecture` | pass | Publication `architecture-summary-…` written |
| `publish agent-contract` | pass | Publication `agent-contract-…` written |
| `publish github-check --dry-run` | pass | payload computed (`conclusion: failure` reflecting the failed VerificationResult); 6 cited refs; no network call |
| `publish pr-comment --dry-run` | pass | readiness reports 5 expected gaps; `wouldPublish: false`; no network call |
| `verify github-workflow validate --profile read-only` (`rekon-verification.yml`) | pass | `valid: true`, 0 issues |
| `verify github-workflow validate --profile read-only` (`rekon-verification-dry-run.yml`) | pass | `valid: true`, 0 issues |
| `verify github-workflow validate --profile github-check-send` | pass | `valid: true`, 0 issues |
| `verify github-workflow validate --profile github-pr-comment-send` | pass | `valid: true`, 0 issues |
| Final `artifacts validate` (after all smokes) | pass | `valid: true`, 0 issues |
| Final `artifacts freshness` (after all smokes) | aggregate `stale` | 1571 `newer-input-exists` issues against historical artifacts; latest-major check inside `refresh` already filters these. Not a release blocker. |

**Interpretation:** identical to Batch 30's
results. The two recorded first-class behaviours
(failed `verify run --execute`; `pr-comment
--dry-run` readiness gaps) are documented in
`docs/concepts/verification-runs.md` and the PR
comment publisher readiness contract. Neither
triggered a release stop condition. The version
bump introduces no behavioural change in any CLI
surface; every smoke produced the same shape it
did against the pre-bump SHA.

## Publish Posture

**No `npm publish` invocation in this batch.**

**No release tag created in this batch.**

**No GitHub Release created in this batch.**

The bump is **published to git** (committed +
pushed to `origin/main`) but **not published to
npm**. The next publish step is the beta npm
publish authorization work order, which:

- Is the first slice allowed to invoke
  `npm publish`.
- Requires **explicit operator authorization**
  immediately before invoking publish.
- Re-runs the mandatory verification commands +
  the CLI smoke matrix on the publish SHA
  (which is the SHA this batch commits).
- Publishes each workspace package in dependency
  order using `npm publish --provenance`.
- Pushes the `v0.1.0-beta.0` git tag only after
  every workspace package has published
  successfully.
- Creates the GitHub Release with the beta
  CHANGELOG entry as the body.
- Confirms a post-publish smoke (install
  `@rekon/cli` from npm in a throwaway temp
  project).

**Reversibility:** the bump itself is reversible
up to the point of `npm publish`. Once any
workspace package is published, that prerelease
semver is consumed and cannot be reused. The
publish authorization work order must explicitly
state that fact and require operator
authorization at the point of no return.

## Known Limitations

All limitations carried forward from the
[Beta Release Readiness Checklist](beta-release-readiness-checklist.md)
remain accurate after the bump:

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

The bump is a version-coherence operation. It
does **not** resolve any limitation, register any
deferred artifact type, register any deferred
permission, ship a watcher daemon, ship a
source-write applier, or change any runtime
behaviour. Every "not available" / "reserved" /
"post-beta" entry above remains accurate.

## Release Work Order Preview

**Next slice: Beta npm publish authorization
work order.**

Step-by-step preview (taken from the
[Beta Release Candidate Execution Plan](beta-release-candidate-execution-plan.md)'s
Release Work Order Preview, advanced one step
because the bump has now happened):

1. **Pre-flight on the bumped SHA** (this
   batch's commit). Re-run the 9 mandatory
   verification commands. Any failure aborts.
2. ~~Version bump.~~ ✅ Completed by this batch.
3. ~~Re-run audits + smokes on bumped SHA.~~
   ✅ Completed by this batch (results recorded
   above).
4. **Operator authorization gate.** The work
   order must explicitly ask for operator
   confirmation before invoking
   `npm publish --provenance`. No automated
   publish step.
5. **Publish.** `npm publish --provenance` for
   each workspace package, in dependency order.
6. **Tag.** Push `v0.1.0-beta.0` only after
   every workspace package has published
   successfully.
7. **GitHub Release.** Create the GitHub
   Release with the beta CHANGELOG entry as the
   release body. Manual + explicit.
8. **Post-publish smoke.** Install `@rekon/cli`
   from npm in a throwaway temp project;
   confirm the binary runs.

Steps 1, 4–8 remain. Step 4 is the point of
operator authorization; steps 5–8 are
operator-authorized actions.

## What This Does Not Do

This batch **does not**:

- Run `npm publish` for any workspace package.
- Run `npm publish --provenance`.
- Create any git tag.
- Create any GitHub Release.
- Add any active `.github/workflows/*.yml`.
- Change runtime behaviour in any package.
- Add a new CLI command, validator profile,
  workflow template, artifact type, or
  permission.
- Mutate the committed `examples/simple-js-ts`
  fixture (smokes ran against a `mktemp -d`
  copy).
- Hide any smoke result. Every result above
  matches what actually happened on the bumped
  tree.

## Follow-Up Work

**Recommended next slice: Beta npm publish
authorization work order.**

That work order:

- Re-runs the mandatory verification commands +
  the CLI smoke matrix one more time on the
  publish SHA (which equals this batch's commit).
- Requires explicit operator authorization
  immediately before `npm publish`.
- Invokes `npm publish --provenance` for each
  workspace package in dependency order.
- Pushes the `v0.1.0-beta.0` git tag only after
  publish succeeds.
- Creates the GitHub Release.
- Confirms the post-publish smoke install from
  npm.

After the publish work order, the beta release
is live and post-beta work proceeds against the
deferred surfaces (source-write apply roadmap;
path freshness + watcher roadmap; breadth +
maturity + polish).

**Implementation Sequence (updated):**

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Beta release readiness checklist memo](beta-release-readiness-checklist.md) | ✅ Shipped |
| 2 | [Beta release candidate execution plan](beta-release-candidate-execution-plan.md) | ✅ Shipped — checklist executed against SHA `54d1dfd` |
| 3 | **Beta version bump execution report (this report)** | ✅ **Shipped** — version `0.1.0-beta.0` applied; mandatory verification + CLI smoke matrix re-run on the bumped tree |
| 4 | [Real-repo beta dogfood report](real-repo-beta-dogfood-report.md) | ✅ **Shipped** — `pass-with-known-limitations` against the Rekon repo itself |
| 5 | [No-NPM beta distribution policy](no-npm-beta-distribution-policy.md) | ✅ **Shipped** — replaces the previously-planned publish authorization work order; beta distribution is source-checkout / local-build / tarball-smoke based; npm publish deferred |
| 6 | Additional real-repo dogfood cohort plan | Next slice — 3–5 more real repositories / repo archetypes |
| 7 | (Optional, deferred) Post-beta npm publish authorization work order | Only after broader real-repo dogfood + an explicit later operator decision reverses the no-NPM policy |
| 5 | Post-beta source-write apply roadmap (4 slices) | Post-beta |
| 6 | Post-beta path freshness + watcher roadmap (4 slices) | Post-beta |
| 7 | Post-beta breadth / maturity / polish work | Ongoing |

**The next slice is the beta npm publish
authorization work order**, which is the first
slice in the entire Rekon sequence allowed to
invoke `npm publish`, and only with explicit
operator authorization.

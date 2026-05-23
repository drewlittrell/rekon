# Beta Release Candidate Execution Plan

## Decision Summary

**The current `main` SHA qualifies as a beta
release candidate under the pinned
[Beta Release Readiness Checklist](beta-release-readiness-checklist.md).**

Every mandatory verification command passed. The
CLI smoke matrix exercised every surface the
checklist named, on a temporary fixture root, with
the documented results recorded below. Package and
version state are coherent across all 20 workspace
packages. Known beta limitations remain disclosed.

**This batch does not publish to npm, does not
bump versions, and does not tag a release.**
Those actions remain the responsibility of a
separate, explicitly authorized release work
order (see the Release Work Order Preview
section below).

**Recommended beta version: `0.1.0-beta.0`.**

**Pinned reminders carried forward from the
checklist:**

- Beta readiness is a checklist state, not an npm
  publish event.
- npm publish requires a separate explicit
  release work order.
- No version bump occurs in this batch.
- Known beta limitations remain documented.

## Release Candidate SHA

| Ref | SHA |
| --- | --- |
| HEAD | 54d1dfd2cd360434a82738d3963ec9cbb5b709f2 |
| main | 54d1dfd2cd360434a82738d3963ec9cbb5b709f2 |
| origin/main | 54d1dfd2cd360434a82738d3963ec9cbb5b709f2 |

The worktree is operating in detached-HEAD mode
(no current branch); the primary `main` is
fast-forwarded to match `HEAD` before this memo
itself lands. Working tree was clean before the
final commit.

## Package And Version State

**Workspace package count: 20.** Every published
workspace package shares the same root version.

| Package | Version |
| --- | --- |
| root (`rekon`) | `0.1.0-alpha.1` |
| `@rekon/capability-docs` | `0.1.0-alpha.1` |
| `@rekon/capability-graph` | `0.1.0-alpha.1` |
| `@rekon/capability-intent` | `0.1.0-alpha.1` |
| `@rekon/capability-js-ts` | `0.1.0-alpha.1` |
| `@rekon/capability-memory` | `0.1.0-alpha.1` |
| `@rekon/capability-model` | `0.1.0-alpha.1` |
| `@rekon/capability-policy` | `0.1.0-alpha.1` |
| `@rekon/capability-reconcile` | `0.1.0-alpha.1` |
| `@rekon/capability-resolver` | `0.1.0-alpha.1` |
| `@rekon/capability-verify` | `0.1.0-alpha.1` |
| `@rekon/cli` | `0.1.0-alpha.1` |
| `@rekon/kernel-artifacts` | `0.1.0-alpha.1` |
| `@rekon/kernel-evidence` | `0.1.0-alpha.1` |
| `@rekon/kernel-findings` | `0.1.0-alpha.1` |
| `@rekon/kernel-graph` | `0.1.0-alpha.1` |
| `@rekon/kernel-repo-model` | `0.1.0-alpha.1` |
| `@rekon/kernel-rulebook` | `0.1.0-alpha.1` |
| `@rekon/kernel-snapshot` | `0.1.0-alpha.1` |
| `@rekon/runtime` | `0.1.0-alpha.1` |
| `@rekon/sdk` | `0.1.0-alpha.1` |

**No version bump is applied in this batch.** The
recommended beta target — `0.1.0-beta.0` — is
applied by the release work order if the operator
authorizes it. Workspace coherence (every package
matches the root) is verified by
`scripts/publish-dry-run.mjs` and must be
re-verified after the bump.

## Mandatory Verification Results

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run test` | pass (1644 passed / 1 skipped) |
| `npm run build` | pass |
| `git diff --check` | pass |
| `node scripts/audit-package-exports.mjs` | pass (20 packages inspected; 0 issues) |
| `node scripts/audit-license.mjs` | pass (20 packages; root + per-package licenses match `Apache-2.0`) |
| `node scripts/publish-dry-run.mjs` | pass (20 packages inspected; no publish attempted) |
| `node scripts/install-smoke.mjs` | pass (install-from-build) |
| `node scripts/install-tarball-smoke.mjs` | pass (20 tarballs installed; 13 artifact families emitted) |

**All 9 mandatory commands passed on the
candidate SHA.** Per the checklist's release
stop conditions, any failure here would have
blocked release-candidate approval. There were
none.

**Test count growth:** the test suite has grown
batch-by-batch (1568 → 1587 → 1605 → 1622 → 1644
across the last five strategy batches). The
optional `codebase-intel-classic` dogfood
regression remains gated by
`REKON_DOGFOOD_CLASSIC_ROOT` and is the one
skipped test.

## CLI Smoke Matrix Results

Executed against a temporary fixture root
(`mktemp -d` copy of `examples/simple-js-ts`)
so committed examples were not mutated.

| Smoke | Result | Notes |
| --- | --- | --- |
| `refresh` | pass | 14 lifecycle steps; status `passed`; no missing artifact families |
| `artifacts validate` (post-refresh) | pass | `valid: true`, 0 issues |
| `artifacts freshness` (post-refresh) | aggregate `stale` | 1564 `newer-input-exists` issues against historical artifacts; documented latest-major pattern, not a release blocker. The refresh's own `artifacts.freshness` step (step 14) applied the latest-major interpretation and passed. |
| `intent work-order --path src/index.ts --goal "Smoke test verify pipeline"` | pass | produced `IntentMap` + `WorkOrder` + `VerificationPlan` |
| `verify run --dry-run` | pass | 3 commands, all `not-run`, `executed: false`; VerificationRun written; cites VerificationPlan + WorkOrder in `inputRefs` |
| `verify run --execute` | recorded failure | 3 commands, all `failed` (fixture has no real test command); VerificationRun written; failed command status is first-class; `artifacts validate` remains clean; documented behaviour per `docs/concepts/verification-runs.md` |
| `verify result from-run` | pass (failed status) | VerificationResult derived from the failed run; `status: failed`; 3 commands recorded; failed proof leaves visible failed status downstream |
| `publish proof` | pass | Publication `proof-report-…` written under `.rekon/artifacts/publications/` |
| `publish architecture` | pass | Publication `architecture-summary-…` written |
| `publish agent-contract` | pass | Publication `agent-contract-…` written |
| `publish github-check --dry-run` | pass | payload computed (`conclusion: failure` reflecting the failed VerificationResult); cited refs include VerificationResult + VerificationRun + VerificationPlan + 3 publications; no network call; `dryRun: true` |
| `publish pr-comment --dry-run` | pass | readiness reports expected gaps (no env, no token, no PR number, write-permission-not-confirmed); no network call; `dryRun: true`, `wouldPublish: false` |
| `verify github-workflow validate --profile read-only` (`rekon-verification.yml`) | pass | `valid: true`, 0 issues |
| `verify github-workflow validate --profile read-only` (`rekon-verification-dry-run.yml`) | pass | `valid: true`, 0 issues |
| `verify github-workflow validate --profile github-check-send` (`rekon-verification-check-send.yml`) | pass | `valid: true`, 0 issues |
| `verify github-workflow validate --profile github-pr-comment-send` (`rekon-pr-comment-send.yml`) | pass | `valid: true`, 0 issues |
| Final `artifacts validate` (after all smokes) | pass | `valid: true`, 0 issues |
| Final `artifacts freshness` (after all smokes) | aggregate `stale` | 1571 `newer-input-exists` issues against historical artifacts; latest-major check inside `refresh` already filters these. Not a release blocker. |

**Interpretation of the two `recorded failure`
entries:**

- The `verify run --execute` step failed because
  the fixture's working tree does not provide
  the `npm test`-style commands the
  auto-generated `VerificationPlan` enumerates.
  Per `docs/concepts/verification-runs.md`,
  this is **first-class behaviour**: the
  VerificationRun is still written; its
  `status: failed` is honest; the downstream
  VerificationResult / proof / Check / PR
  comment all reflect the failure rather than
  silently pretend success. **Artifacts
  validate remains clean.** A release work
  order against a real repo (with real test
  commands) would see this as `passed`.
- The `publish pr-comment --dry-run` readiness
  reports the expected gaps (`not-enabled`,
  `missing-repository`, `missing-pr-number`,
  `missing-token`, `write-permission-not-confirmed`).
  No GitHub environment is set in this smoke;
  the readiness contract is doing its job by
  surfacing every gap explicitly without making
  a network call.

**No CLI smoke succeeded by hiding a failure.**
Every result is recorded as it actually
happened.

## Known Beta Limitations

| Limitation | Status |
| --- | --- |
| source-write apply | not available |
| watcher daemon | not available |
| hosted GitHub App | not available |
| active workflows | not installed automatically |
| GitHub writes | opt-in only |
| Windows process-tree kill | direct-child-only |
| full classic parity | not claimed |

Additional limitations carried forward (per the
checklist):

- `PathFreshnessReport` reserved but not
  implemented.
- `ReconciliationApplyReport` reserved but not
  implemented.
- `source:write` reserved but not registered.
- `paths` / `events` invalidation rules remain
  public intent only.
- PR comment publisher bounded-retry is
  post-beta polish.
- Same-repo `pull_request` guard enforcement is
  post-beta polish.
- Memory promotion / supersession remains
  post-beta maturity work.
- Deeper rule catalog expansion remains
  post-beta breadth work.

**Every limitation listed in the
[Beta Release Readiness Checklist](beta-release-readiness-checklist.md)
remains documented and accurate.** No
limitation listed there has been silently
resolved by behaviour drift, and no new
limitation has been introduced by this batch
that the checklist does not already cover.

## Release Stop Conditions

| Stop Condition | Outcome |
| --- | --- |
| any required audit fails | none failed → not triggered |
| any required smoke fails | no unexpected smoke failure → not triggered (the `verify run --execute` and `pr-comment --dry-run` results above are documented first-class behaviour, not regressions) |
| version bump missing in release slice | not applicable to this batch — this batch does not bump versions; the release work order will |
| known limitations not documented | every limitation listed remains documented → not triggered |
| accidental npm publish | no `npm publish` invocation → not triggered |
| hidden source-write behaviour | none → not triggered |
| hidden background refresh | none → not triggered |
| hidden artifact mutation | none → not triggered |
| mixed-version workspace | all 20 packages match root `0.1.0-alpha.1` → not triggered |
| audit-mismatched exports | 0 issues → not triggered |
| license drift | every package + root match `Apache-2.0` → not triggered |

**No release stop condition was triggered.** The
release candidate is clear of every gate the
checklist defined.

## Beta Version Recommendation

**Recommended beta version: `0.1.0-beta.0`.**

Rationale:

- The current root version is `0.1.0-alpha.1`.
  Every workspace package shares it. The natural
  semver prerelease advance from `alpha.1` to a
  beta prerelease is the `0.1.0-beta.0` form.
- `0.1.0-beta.0` is unambiguous about what is
  shipping (still `0.1.0` major.minor.patch;
  prerelease identifier shifts from `alpha.1` to
  `beta.0`).
- Subsequent beta release candidates (if needed)
  advance to `0.1.0-beta.1`, `.2`, etc., until
  the actual `0.1.0` general-availability
  release.
- The choice is overridable by the release work
  order if the operator prefers a different
  identifier (e.g., `0.1.0-beta.20260522` or
  similar), but the default recommendation is
  `0.1.0-beta.0`.

**No version bump is applied in this batch.**
The release work order applies the bump to
every workspace package + the root in a single
coordinated edit, then re-runs the audit /
smoke matrix on the bumped SHA before any
`npm publish` is considered.

## Release Work Order Preview

If the operator authorises the beta release,
the release work order must perform — in this
exact order:

1. **Pre-flight on release SHA.** Re-run the 9
   mandatory verification commands on the
   release SHA (which will be the SHA after
   this execution-plan memo lands, plus the
   version-bump commit). Any failure aborts.
2. **Version bump.** Edit `package.json`
   (root) and every `packages/*/package.json`
   `version` field to `0.1.0-beta.0` in a single
   coordinated commit. No other code change in
   the bump commit.
3. **Re-run audits + smokes on the bumped
   SHA.** Mandatory verification commands
   re-run. Any failure aborts and triggers a
   bump-revert.
4. **Operator authorisation gate.** The work
   order must explicitly ask for operator
   confirmation before invoking
   `npm publish --provenance`. No automated
   publish step. No CI workflow may invoke
   publish for beta.
5. **Publish.** `npm publish --provenance`
   for each workspace package, in dependency
   order. The release work order documents
   the exact publish order based on the
   workspace graph.
6. **Tag.** Push the `v0.1.0-beta.0` git tag
   only after every workspace package has
   published successfully.
7. **GitHub Release.** Create the GitHub
   Release with the beta-readiness CHANGELOG
   entry as the release body. This step is
   manual and explicit; no automation.
8. **Post-publish smoke.** Install the
   published `@rekon/cli` from npm in a
   throwaway temp project; confirm the binary
   runs.

**Each step must be reversible up to step 5.**
Once `npm publish` runs for any workspace
package, that prerelease semver is consumed
and cannot be reused. The release work order
must explicitly state that fact and require
operator authorisation immediately before the
publish step.

**This execution-plan memo does not perform
any of the steps above.** It records that the
release candidate qualifies; the work order is
where they execute, with operator
authorisation gating the publish.

## What This Does Not Do

This batch **does not**:

- Run `npm publish` for any workspace package.
- Edit any `package.json` `version` field
  (root or workspace).
- Create any git tag.
- Create any GitHub Release.
- Add any active `.github/workflows/*.yml`.
- Change runtime behaviour in any package.
- Add a new CLI command, validator profile,
  workflow template, artifact type, or
  permission.
- Mutate any committed example fixture
  (smokes ran against a temp `mktemp -d`
  copy).
- Hide any smoke result. Every result above
  matches what actually happened on the
  candidate SHA.

## Follow-Up Work

**Recommended next slice: beta version bump
work order.**

That work order's purpose:

- Apply `0.1.0-beta.0` (or the
  operator-approved successor) to root +
  every workspace package.
- Re-run the audit / smoke matrix on the
  bumped SHA.
- Prepare the explicit `npm publish` step
  for operator authorisation.
- Still avoid `npm publish` unless the
  operator explicitly authorises it in that
  work order.

After the version bump work order, the actual
beta release work order (explicit operator
authorisation) performs the publish + tag +
GitHub Release steps.

**Implementation Sequence (updated):**

| Step | Slice | Status |
| --- | --- | --- |
| 1 | [Beta release readiness checklist memo](beta-release-readiness-checklist.md) | ✅ Shipped |
| 2 | **Beta release candidate execution plan (this memo)** | ✅ **Shipped** |
| 3 | [Beta version bump execution report](beta-version-bump-execution-report.md) | ✅ **Shipped** — `0.1.0-beta.0` applied coherently; mandatory verification + CLI smoke matrix re-run on the bumped tree |
| 4 | [Real-repo beta dogfood report](real-repo-beta-dogfood-report.md) | ✅ **Shipped** — `pass-with-known-limitations` against the Rekon repo itself; verify run --execute + publish github-check --dry-run both passed end-to-end |
| 5 | Beta npm publish authorization work order | Next slice — explicit operator authorisation; `npm publish --provenance`; git tag; GitHub Release |
| 5 | Post-beta source-write apply roadmap | 4 post-beta slices (patch preview → permission + rollback design → apply implementation → safety review) |
| 6 | Post-beta path freshness + watcher roadmap | 4 post-beta slices (path freshness artefact → daemon design → daemon implementation → safety review) |
| 7 | Post-beta breadth / maturity / polish work | Ongoing (hosted GitHub App; deeper rule catalog; memory promotion; PR comment refinements; Windows process-tree kill) |

**The next slice is the beta version bump
work order**, not the beta release work order
itself. The publish remains the explicit
operator action the bump work order produces.

# Review Packet — Beta Version Bump

**Slice:** `beta-version-bump`
**Sequence position:** Step 3 of the post-blocker
release sequence pinned by the
[Beta Release Readiness Checklist](../../docs/strategy/beta-release-readiness-checklist.md)
(steps 1–2 were the checklist + execution plan;
this step bumps the version).
**Batch type:** Release-prep (version-coherence)
batch. **No runtime behaviour change.** No new
package, no new CLI command, no new helper, no
workflow-template change, no validator profile
change, no GitHub API call, no `npm publish`, no
release tag, no GitHub Release, no active
workflow YAML. **Does mutate `package.json`
`version` fields + `package-lock.json` —
intentionally, exactly per the version bump scope.**

## CHANGES MADE

1. **Applied version `0.1.0-beta.0` to root +
   all 20 workspace packages.** A deterministic
   Node script walked
   `package.json` + every `packages/*/package.json`
   and wrote the new version. Re-running the
   script on a `package.json` is idempotent.
2. **Bumped every `@rekon/*` dependency pin
   inside workspace `package.json` files** (70
   pin entries across the 20 workspaces). The
   pre-bump state pinned every internal
   dependency at `0.1.0-alpha.1`; the post-bump
   state pins them at `0.1.0-beta.0`.
3. **Rewrote `package-lock.json` deterministically**
   to update:
   - Root `version` field.
   - Every workspace's `version` entry under
     `lock.packages` (21 entries: root +
     20 workspace).
   - Every `@rekon/*` dependency pin inside
     `lock.packages[*].dependencies` /
     `devDependencies` / `peerDependencies` /
     `optionalDependencies` (70 pins).
   - `npm install --package-lock-only` was
     **not** used because it would have triggered
     registry lookups for unpublished
     `@rekon/*@0.1.0-alpha.1` references. The
     direct JSON rewrite is the correct primitive
     for an unpublished monorepo's version bump.
4. **Updated `tests/docs/release-readiness.test.mjs`**
   to expect `0.1.0-beta.0` instead of
   `0.1.0-alpha.1` (one `EXPECTED_VERSION`
   constant + one test description). The alpha-
   release-document existence assertions remain
   intact because those documents are historical
   artefacts of the alpha release prep and
   continue to be useful as references.
5. **New strategy memo** at
   [`docs/strategy/beta-version-bump-execution-report.md`](../../docs/strategy/beta-version-bump-execution-report.md)
   records the bump + the re-verification
   results. Contains all 10 required headings
   (Decision Summary, Starting State, Version
   Applied, Package Version Matrix, Mandatory
   Verification Results, CLI Smoke Matrix
   Results, Publish Posture, Known Limitations,
   Release Work Order Preview, What This Does
   Not Do, Follow-Up Work). Contains the git
   state table, package version table, mandatory
   verification table, CLI smoke matrix table.
   Pins the four required statements: "Version
   `0.1.0-beta.0` has been applied coherently";
   "this batch does not publish to npm"; "this
   batch does not create a git tag"; "this batch
   does not create a GitHub Release"; "the next
   publish step requires explicit operator
   authorization."
6. **New docs test** at
   `tests/docs/beta-version-bump-execution-report.test.mjs`
   pinning the 18 required assertions (memo
   existence; all 10 required headings; four
   required statements verbatim; six diagnostic-
   table assertions; CHANGELOG mention; review-
   packet PURPOSE PRESERVATION CHECK).
7. **Cross-doc updates:**
   - [`docs/strategy/beta-release-candidate-execution-plan.md`](../../docs/strategy/beta-release-candidate-execution-plan.md)
     advances its implementation sequence to
     mark step 3 (the bump) shipped + step 4
     (publish) as the next slice.
   - [`docs/strategy/beta-release-readiness-checklist.md`](../../docs/strategy/beta-release-readiness-checklist.md)
     advances its implementation sequence to
     match.
   - [`docs/strategy/beta-readiness-classic-parity-review.md`](../../docs/strategy/beta-readiness-classic-parity-review.md)
     adds the bump-execution-report pointer.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the bump.
8. **README + CHANGELOG entries.**

## PUBLIC API CHANGES

- **None at the source / runtime / artifact
  level.** No new exports, no new CLI commands,
  no new flags, no new validator profiles, no
  new workflow templates, no new artifact
  types, no new permissions.
- **Yes at the package-version level.** Every
  workspace package now declares
  `0.1.0-beta.0`. Downstream consumers that
  install from the published tarballs will see
  the new version; this is the intended effect
  of a version bump.

## PURPOSE PRESERVATION CHECK

The bump is a version-coherence operation; it
preserves every existing invariant:

- **Runtime behaviour.** Unchanged. No `.ts`
  file under `packages/*/src/` was touched. The
  only mutations are `package.json` `version` +
  dependency pin fields and the lockfile.
- **Artifact schemas.** Unchanged.
- **CLI surface.** Unchanged.
- **Workflow templates.** Unchanged. The smoke
  matrix validated all four templates against
  their three profiles; every result is
  `valid: true`, 0 issues.
- **Validator profiles.** Unchanged.
- **Audit + smoke scripts.** Unchanged.
- **Verification runner / proof surfaces /
  GitHub publishers.** Unchanged.
- **Source-write policy + watcher / path
  freshness policy.** Unchanged.
- **Beta release readiness checklist.**
  Unchanged. The bump executes step 3 of the
  release sequence the checklist + execution
  plan defined; it does not modify the
  contract.
- **Canonical-truth invariant.** Reinforced.
  Workspace versions are coherent;
  downstream artefact citations (GitHub Check
  payload, PR comment body) still reflect
  Rekon-internal artefacts as canonical.
- **No-background-mutation invariant.**
  Reinforced. No background process ran during
  the bump.
- **No-auto-resolution invariant.** Reinforced.
- **No-source-write-without-explicit-command
  invariant.** Reinforced. The version-bump
  operation is an explicit operator-style edit
  to package metadata, not source-code writes.
- **No-token-leak invariant.** Reinforced. No
  GitHub API call was made.

## CODEBASE-INTEL ALIGNMENT

- **Classic packaging guarantee preserved.**
  `codebase-intel-classic`'s product value
  depended on coherent packaging across release
  artefacts; Rekon's beta-readiness guarantee
  (per the checklist) requires the same
  workspace-wide coherence. The bump executes
  that requirement with a deterministic + audited
  operation.
- **Classic anti-patterns avoided.** The memo
  refuses to bump without re-running the
  mandatory verification; refuses to use
  `npm install` against an unpublished monorepo
  (which would have failed with registry
  lookups); refuses to publish; refuses to tag.
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## VERSION BUMP

- **From:** `0.1.0-alpha.1`.
- **To:** `0.1.0-beta.0`.
- **Scope:** root `package.json` + 20 workspace
  `package.json` + `package-lock.json` (workspace
  versions + `@rekon/*` dependency pins).
- **Method:** deterministic Node JSON rewrite
  (not `npm version`; not `npm install
  --package-lock-only` — the lockfile was
  rewritten directly to avoid registry lookups
  for unpublished `@rekon/*` packages).
- **Verification:** post-bump coherence script
  walks every workspace + the lockfile and
  reports no mismatches. `grep -c
  "0.1.0-alpha.1"` returns 0 across every
  `package.json` and `package-lock.json`.

## PACKAGE / LOCKFILE STATE

| Scope | Pre-bump | Post-bump |
| --- | --- | --- |
| root `package.json` `version` | `0.1.0-alpha.1` | `0.1.0-beta.0` |
| 20 workspace `package.json` `version` fields | `0.1.0-alpha.1` | `0.1.0-beta.0` |
| 70 `@rekon/*` dependency pins inside workspace `package.json` files | `0.1.0-alpha.1` | `0.1.0-beta.0` |
| `package-lock.json` top-level `version` | `0.1.0-alpha.1` | `0.1.0-beta.0` |
| `package-lock.json` workspace `version` entries (21) | `0.1.0-alpha.1` | `0.1.0-beta.0` |
| `package-lock.json` `@rekon/*` dependency pins (70) | `0.1.0-alpha.1` | `0.1.0-beta.0` |
| Total `0.1.0-alpha.1` references in package.json / lockfile after bump | (n/a) | **0** |
| Total `0.1.0-beta.0` references after bump | (n/a) | matching count |

No drift. No mixed versions.

## MANDATORY VERIFICATION

All 9 commands pinned by the
[Beta Release Readiness Checklist](../../docs/strategy/beta-release-readiness-checklist.md)
passed on the bumped tree:

- `npm run typecheck` (reports `rekon@0.1.0-beta.0`)
- `npm run test` (1662 passed / 1 skipped —
  same count as Batch 30's post-doc-drop run,
  confirming the bump introduces no test
  regression)
- `npm run build` (reports `@rekon/sdk@0.1.0-beta.0`)
- `git diff --check`
- `node scripts/audit-package-exports.mjs` (20
  packages; 0 issues)
- `node scripts/audit-license.mjs` (20
  packages; Apache-2.0)
- `node scripts/publish-dry-run.mjs` (20
  packages; no publish attempted — and now
  reports `0.1.0-beta.0` per workspace)
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs` (20
  tarballs; 13 artifact families emit)

## CLI SMOKE MATRIX

All 15 smokes + 2 final validations were
exercised on a temporary fixture root. Results
identical in shape to Batch 30's run; the
version bump introduces no behavioural
change. The two recorded first-class
behaviours (failed `verify run --execute`
against a fixture with no real test command;
`pr-comment --dry-run` readiness reporting
expected gaps with no GitHub env set) are
documented in the memo and were already
documented in the release-candidate execution
plan.

## PUBLISH POSTURE

- **No `npm publish` invocation in this batch.**
- **No release tag in this batch.**
- **No GitHub Release in this batch.**
- **The next publish step requires explicit
  operator authorization.**

The bump is published to **git** (committed +
pushed to `origin/main`) but **not to npm**.
The next slice (beta npm publish authorization
work order) is the first slice allowed to
invoke `npm publish`, and only with explicit
operator authorization.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/beta-version-bump-execution-report.test.mjs`
  — 18 assertions, all passing.
- **Existing suites still passing:** every
  prior contract / docs suite. Full suite
  expected ≥ 1680 passed / 1 skipped (1662
  prior + 18 new).
- **One existing test updated:**
  `tests/docs/release-readiness.test.mjs`
  `EXPECTED_VERSION` constant bumped from
  `0.1.0-alpha.1` to `0.1.0-beta.0`; one test
  description updated to match. Same number of
  assertions; same shape; updated only the
  version string.
- **Audits / smokes:** all 5 pass.
- **No CLI smoke required in this final
  docs-finalisation pass.** The matrix already
  ran on the bumped tree during step 3 of the
  batch and is recorded in the memo.

## INTENTIONALLY UNTOUCHED

- `packages/*/src/**.ts` — unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- `ArtifactHeader` shape — unchanged.
- `IntelligenceSnapshot` / `EvidenceGraph` /
  `ObservedRepo` / `FindingReport` /
  `VerificationRun` schemas — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- `scripts/audit-package-exports.mjs`,
  `scripts/audit-license.mjs`,
  `scripts/publish-dry-run.mjs`,
  `scripts/install-smoke.mjs`,
  `scripts/install-tarball-smoke.mjs` —
  unchanged.
- All existing contract tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).
- The `examples/simple-js-ts` fixture —
  unchanged.

## RISKS / FOLLOW-UP

- **Risk: an accidental `npm publish` happens
  before the operator authorises it.**
  Mitigated by the verbatim "this batch does
  not publish to npm" + "the next publish step
  requires explicit operator authorization"
  statements, pinned by the docs test.
- **Risk: a release tag is created
  prematurely.** Mitigated by the verbatim
  "this batch does not create a git tag"
  statement and the Release Work Order
  Preview's step ordering (tag only after
  publish succeeds).
- **Risk: a GitHub Release is announced before
  publish succeeds.** Mitigated by the
  verbatim "this batch does not create a
  GitHub Release" statement.
- **Risk: a future contributor reads the
  execution report and concludes Rekon is
  already published to npm.** Mitigated by the
  Decision Summary's three explicit "does not
  publish / tag / release" statements, pinned
  by the docs test.
- **Risk: future version bumps drift the
  workspace.** Mitigated by the deterministic
  Node-script approach and the post-bump
  coherence checks, which the next bump can
  re-use without modification.
- **Risk: the alpha release notes
  (`docs/release/0.1.0-alpha.1.md`) become
  stale references.** They're historical
  artefacts of the alpha release prep; they
  remain accurate **for the alpha** and don't
  claim anything about beta. The beta will
  produce its own release notes in the publish
  work order.
- **Follow-up — Beta npm publish authorization
  work order (next slice).** First slice
  allowed to invoke `npm publish`, with
  explicit operator authorization.
- **Follow-up — Post-beta source-write apply
  roadmap (4 slices).**
- **Follow-up — Post-beta path freshness +
  watcher roadmap (4 slices).**
- **Follow-up — Post-beta breadth / maturity /
  polish work.**

## NEXT STEP

**Beta npm publish authorization work order.**

That work order:

- Re-runs the mandatory verification commands
  + the CLI smoke matrix one more time on the
  publish SHA (which equals this batch's
  commit).
- Requires explicit operator authorization
  immediately before `npm publish`.
- Invokes `npm publish --provenance` for each
  workspace package in dependency order.
- Pushes the `v0.1.0-beta.0` git tag only
  after publish succeeds.
- Creates the GitHub Release with the beta
  CHANGELOG entry as the body.
- Confirms the post-publish smoke install from
  npm.

This next work order is the first one allowed
to publish.

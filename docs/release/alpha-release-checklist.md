# Alpha Release Checklist

Target version: **`0.1.0-alpha.1`**.

This checklist gates the first publishable alpha. Nothing on this list
publishes packages by itself. The intent is to verify every public surface
before the release commit that actually publishes.

All workspace packages are now at `0.1.0-alpha.1`. Publishing requires
manual approval (see [npm-publish-plan.md](npm-publish-plan.md)).

## Required Checks

These commands must all succeed on the release commit:

- [x] `npm install`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`
- [x] `git diff --check`
- [x] `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- [x] `node scripts/audit-package-exports.mjs`
- [x] `node scripts/publish-dry-run.mjs`
- [x] `node scripts/install-smoke.mjs`
- [x] `node scripts/install-tarball-smoke.mjs`
- [x] `node scripts/audit-license.mjs`
- [ ] Optional: `REKON_DOGFOOD_CLASSIC_ROOT=<classic-checkout> npm run test`

## Package Readiness

- [x] Every `packages/*/package.json` has `name`, `version`, `type: module`,
      `license: Apache-2.0`.
- [x] Every package has a README.md.
- [x] Every package README declares a stability label per
      [docs/concepts/stability.md](../concepts/stability.md).
- [x] Decide which packages are public for `0.1.0-alpha.1`. Recorded in
      [public-package-boundaries.md](public-package-boundaries.md). All 19
      packages are scheduled to publish at `0.1.0-alpha.1`.
- [x] No package references `.codebase-intel` or `CODEBASE_INTEL` outside
      of guardrail strings.
- [x] No package imports from `codebase-intel-classic`.
- [x] Built-in capabilities use only `@rekon/sdk` and kernel packages.
- [x] Package versions are consistent across the workspace at
      `0.1.0-alpha.1`.
- [x] `.tsbuildinfo` is excluded from publish tarballs.

## Docs Readiness

- [x] [docs/strategy/north-star.md](../strategy/north-star.md) is current.
- [x] [docs/strategy/capability-model.md](../strategy/capability-model.md) is
      current.
- [x] [docs/strategy/roadmap.md](../strategy/roadmap.md) reflects the alpha
      spine and committed direction.
- [x] [docs/strategy/codebase-intel-classic-migration.md](../strategy/codebase-intel-classic-migration.md)
      reflects current mapping.
- [x] README links strategy docs and the alpha release checklist.
- [x] AGENTS.md and CONTRIBUTING.md point contributors to the NorthStar.
- [x] `docs/getting-started/first-10-minutes.md` works end-to-end against
      a clean checkout.
- [x] [public-package-boundaries.md](public-package-boundaries.md) records the
      publish decision.
- [x] [npm-publish-plan.md](npm-publish-plan.md) describes the publish
      sequence and requires manual approval.
- [x] [0.1.0-alpha.1.md](0.1.0-alpha.1.md) release notes drafted.

## Examples Readiness

- [x] `examples/simple-js-ts` runs through the golden CLI flow without
      manual fixes.
- [x] `examples/custom-capability` builds and conforms with the SDK
      conformance helpers.
- [x] Example READMEs reflect current CLI behavior.

## Changelog

- [x] `CHANGELOG.md` has an entry for `0.1.0-alpha.1` summarizing:
      strategy docs, stability labels, audit scripts, install smoke, release
      checklist, and any runtime/artifact changes that landed before release.
- [x] No breaking public API change is hidden in implementation-only
      commits.

## Known Limitations

Document the following before release:

- [x] No watcher or freshness engine beyond current artifact metadata.
- [x] No package marketplace or discovery layer.
- [x] No hosted dashboard or GitHub app.
- [x] No source-writing reconciliation by default.
- [x] No full `codebase-intel-classic` behavioral parity.
- [x] Lightweight, dependency-free schema validation only.

## Do Not Publish Until

- [x] Every required check passes locally (CI verification follows the
      direct push to main).
- [x] The package-publish dry-run has zero blocking issues.
- [x] The install smoke (build) validates artifacts on a clean temp
      workspace.
- [x] The install smoke (tarball) validates artifacts after installing 19
      packed tarballs into a separate consumer project.
- [x] License audit clears across root and every package.
- [x] A decision is recorded for which `@rekon/*` packages are public
      (see [public-package-boundaries.md](public-package-boundaries.md)).
- [x] Workspace version is exactly `0.1.0-alpha.1`.
- [ ] A maintainer with `@rekon/*` publish rights has manually approved
      the publish per [npm-publish-plan.md](npm-publish-plan.md).
- [ ] A release commit / tag exists for `0.1.0-alpha.1`.

## Rollback Notes

- Publishing is the irreversible step. Until `npm publish` runs, every
  other action is local and can be undone with `git revert` or by
  rebuilding.
- If a published tarball is broken, deprecate the version with
  `npm deprecate` and publish a fixed `0.1.0-alpha.2`. Do not unpublish
  unless absolutely necessary.
- Keep the release commit and tag immutable. Bug fixes ship as a new
  alpha version.

## Next Batch

Release readiness work for `0.1.0-alpha.1` is complete. The next batch is
the **Manual Publish Decision**:

- Inspect the latest tarball and install-smoke results.
- Confirm `@rekon` scope availability and publisher npm permissions.
- Confirm npm 2FA / auth posture.
- Decide publish vs defer.
- If publish: follow [npm-publish-plan.md](npm-publish-plan.md) end-to-end
  and tag the release commit.
- If defer: open a precise blocker list and target `0.1.0-alpha.2` or
  later.

Until that batch runs, no `@rekon/*` package should be published.

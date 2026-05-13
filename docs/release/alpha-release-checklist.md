# Alpha Release Checklist

Target version: **`0.1.0-alpha.1`**.

This checklist gates the first publishable alpha. Nothing on this list
publishes packages by itself. The intent is to verify every public surface
before the release commit that actually bumps versions and publishes.

The current root version is `0.1.0-alpha.0`. The actual version bump to
`0.1.0-alpha.1` should happen in the final release commit alongside any
package-level version moves. Premature version churn while these checks fail
is wasted noise; resolve the issues first.

## Required Checks

These commands must all succeed on the release commit:

- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- [ ] `node scripts/audit-package-exports.mjs`
- [ ] `node scripts/publish-dry-run.mjs`
- [ ] `node scripts/install-smoke.mjs`
- [ ] `node scripts/audit-license.mjs`
- [ ] Optional: `REKON_DOGFOOD_CLASSIC_ROOT=<classic-checkout> npm run test`

## Package Readiness

- [ ] Every `packages/*/package.json` has `name`, `version`, `type: module`,
      `license: Apache-2.0`.
- [ ] Every package has a README.md.
- [ ] Every package README declares a stability label per
      [docs/concepts/stability.md](../concepts/stability.md).
- [ ] Decide which packages are public for `0.1.0-alpha.1` and which (if
      any) remain `private: true`. Document the decision in the release
      commit.
- [ ] No package references `.codebase-intel` or `CODEBASE_INTEL` outside
      of guardrail strings.
- [ ] No package imports from `codebase-intel-classic`.
- [ ] Built-in capabilities use only `@rekon/sdk` and kernel packages.
- [ ] Package versions are consistent across the workspace (or
      intentional version drift is documented).

## Docs Readiness

- [ ] [docs/strategy/north-star.md](../strategy/north-star.md) is current.
- [ ] [docs/strategy/capability-model.md](../strategy/capability-model.md) is
      current.
- [ ] [docs/strategy/roadmap.md](../strategy/roadmap.md) reflects the alpha
      spine and committed direction.
- [ ] [docs/strategy/codebase-intel-classic-migration.md](../strategy/codebase-intel-classic-migration.md)
      reflects current mapping.
- [ ] README links strategy docs and the alpha release checklist.
- [ ] AGENTS.md and CONTRIBUTING.md point contributors to the NorthStar.
- [ ] `docs/getting-started/first-10-minutes.md` works end-to-end against
      a clean checkout.

## Examples Readiness

- [ ] `examples/simple-js-ts` runs through the golden CLI flow without
      manual fixes.
- [ ] `examples/custom-capability` builds and conforms with the SDK
      conformance helpers.
- [ ] Example READMEs reflect current CLI behavior.

## Changelog

- [ ] `CHANGELOG.md` has an entry for `0.1.0-alpha.1` summarizing:
      strategy docs, stability labels, audit scripts, install smoke, release
      checklist, and any runtime/artifact changes that landed before release.
- [ ] No breaking public API change is hidden in implementation-only
      commits.

## Known Limitations

Document the following before release:

- [ ] No watcher or freshness engine beyond current artifact metadata.
- [ ] No package marketplace or discovery layer.
- [ ] No hosted dashboard or GitHub app.
- [ ] No source-writing reconciliation by default.
- [ ] No full `codebase-intel-classic` behavioral parity.
- [ ] Lightweight, dependency-free schema validation only.

## Do Not Publish Until

- [ ] Every required check passes locally and in CI.
- [ ] The package-publish dry-run has zero blocking issues.
- [ ] The install smoke validates artifacts on a clean temp workspace.
- [ ] License audit clears across root and every package.
- [ ] A decision is recorded for which `@rekon/*` packages are public and
      which remain `private: true`.
- [ ] The release commit bumps `0.1.0-alpha.0` to `0.1.0-alpha.1` across
      the workspace, deliberately, in one commit.

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

The `0.1.0-alpha.1` release prep batch should:

- Decide which `@rekon/*` packages are public and which remain
  `private: true`.
- Bump the workspace version to `0.1.0-alpha.1`.
- Establish npm auth and publish access for the publishing account.
- Add release notes that quote the relevant CHANGELOG sections.
- Run a real install-from-tarball smoke (today's smoke installs from the
  workspace build output).
- Draft a GitHub release (optional but recommended).

The current batch is the predecessor: it makes every check above
verifiable without publishing anything.

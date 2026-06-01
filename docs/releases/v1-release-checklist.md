# Rekon V1 Release Checklist

> Checklist prepared by V1 Release Prep Implementation. **No version bump occurs in this
> prep slice. No npm publish occurs in this prep slice.** This checklist records the gates
> for the later, separate, explicitly-approved release slices.

## Package State

**Current packages remain at 0.1.0-beta.0 in this prep slice.** The workspace is a private
root `rekon` (not published) plus 21 public packages, all lockstep at `0.1.0-beta.0`, none
private. The intended release target is `1.0.0` applied lockstep, deferred to an explicit
versioning slice. No `package.json` version is edited here.

## Before Version Bump

- V1 Readiness / Release Review shipped.
- V1 Release Mechanics / Versioning Decision shipped.
- V1 release notes drafted (`docs/releases/v1-release-notes.md`).
- V1 migration notes drafted (`docs/releases/v1-migration-notes.md`).
- Full nine-command gate green (see Required Verification Commands).
- CHANGELOG / README V1 scope updated.

## Before Git Tag

- The version-bump commit exists (all 21 public packages lockstep at the approved target).
- Full nine-command gate green after the version bump.
- Release notes finalized.
- No dirty worktree.

## Before npm Publish

- Explicit publish approval obtained.
- `node scripts/publish-dry-run.mjs` green from the exact tagged commit.
- Package tarballs verified (`node scripts/install-tarball-smoke.mjs`).
- Registry target confirmed.
- No unpublished local changes; no force-push / history rewrite.

## Required Verification Commands

```bash
npm run typecheck
npm run test
npm run build
git diff --check
node scripts/audit-package-exports.mjs
node scripts/audit-license.mjs
node scripts/publish-dry-run.mjs
node scripts/install-smoke.mjs
node scripts/install-tarball-smoke.mjs
```

## Release Notes

`docs/releases/v1-release-notes.md` — V1 definition, included surfaces/commands, the
Rekon/Circe boundary, proof and safety evidence (including the external Circe serve-loop
proof, pass 1 / fail 0), explicit exclusions, known limitations, package scope, and
verification gates.

## Migration Notes

`docs/releases/v1-migration-notes.md` — legacy beta surfaces superseded, the V1 canonical
flow, the intent bundle and Circe projection directories, the legacy `.rekon/handoffs`
path, a command mapping, and what does / does not change (`.rekon/artifacts/` remains
canonical truth; `intent:go` is not available in V1).

## Stop Conditions

Do not proceed to a version bump, tag, or publish if any of the following hold:

- dirty worktree.
- failing gate.
- package version mismatch.
- missing release notes.
- missing migration notes.
- missing explicit publish approval.

## Approval

- Version bump: requires the **V1 Versioning Decision / Implementation** slice.
- Git tag: requires a separate, explicit tag slice after the version-bump gates pass.
- npm publish: requires explicit publish approval and a separate publish slice after the
  before-publish gates pass. **No npm publish occurs in this prep slice. No version bump
  occurs in this prep slice.**

## Update — V1 Versioning (slice 108)

The version bump has since been executed by **V1 Versioning Implementation** (slice 108):
all 21 public packages and the private root are now at **`1.0.0`** (lockstep; internal
`@rekon/*` pins and `package-lock.json` updated to match). **No git tag occurred and no npm
publish occurred** in that slice — those remain separate, explicitly-approved slices. The
"prep slice" statements above are retained as the historical record of the prep step. See
[V1 Versioning Implementation](../strategy/v1-versioning-implementation.md).

## Update — V1 Tagging (slice 109)

The V1 release commit has since been tagged by **V1 Tagging Decision / Implementation**
(slice 109): an annotated `v1.0.0` git tag was created from the verified final commit and
pushed to origin after the full nine-command gate passed. **No npm publish occurred** —
publish remains a separate, explicitly-approved slice. See
[V1 Tagging Decision](../strategy/v1-tagging-decision.md).

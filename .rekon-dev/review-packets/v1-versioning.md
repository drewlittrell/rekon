# Review Packet — V1 Versioning Implementation

## CHANGES MADE

Release-mechanics product batch executing the lockstep package version bump
`0.1.0-beta.0` → `1.0.0` across the workspace: root `package.json` + all 21
`packages/*/package.json` (version fields + internal `@rekon/*` exact-version dependency
pins), with `package-lock.json` regenerated to match. Updated the live coherence test
(`release-readiness.test.mjs` `EXPECTED_VERSION` → `1.0.0`), added a package-state test, and
wrote the versioning memo + this review packet + supporting doc updates. No tag, no publish,
no runtime change.

## PUBLIC API CHANGES

Package versions change `0.1.0-beta.0` → `1.0.0` (the V1 release target). No code, CLI
command, artifact type, flag, dependency range, or runtime behavior changed. Internal
`@rekon/*` exact pins moved with the version bump (required because they pin exact versions).

## PURPOSE PRESERVATION CHECK

V1 readiness is approved, mechanics are decided, and release-prep docs exist; the next staged
step is package versioning. Versioning must be intentional, lockstep, audited, reversible by
normal git history, and separated from tag/publish. This slice does exactly that: an explicit
lockstep bump to the documented `1.0.0` target, confined to package metadata + lockfile +
the coherence test + docs/tests, enforced by tests, with **no npm publish** and **no git
tag**. V1 boundaries remain non-executing.

## CODEBASE-INTEL ALIGNMENT

Grounded in the V1 Release Mechanics / Versioning Decision (intended `1.0.0` lockstep
target), the V1 Release Prep materials, and the real package files + `package-lock.json` +
`release-readiness.test.mjs` coherence gate re-inspected at `8c6510f`. The bump only
proceeded after confirming every `0.1.0-beta.0` in the 22 package.json files was the version
field or an `@rekon/*` pin (no external dep at beta).

## PACKAGE STATE BEFORE

root `rekon` `0.1.0-beta.0` `private: true`; 21 public packages all `0.1.0-beta.0`, none
private; internal `@rekon/*` deps pinned exactly to `0.1.0-beta.0`; `package-lock.json`
tracked and coherent at `0.1.0-beta.0`. Matches slice 106/107 recording.

## PACKAGE STATE AFTER

root `rekon` `1.0.0` `private: true`; all 21 public packages `1.0.0`; all internal `@rekon/*`
pins `1.0.0`; `package-lock.json` regenerated (21 workspace entries + root at `1.0.0`, `npm
install` reported "up to date" — no deps added/removed); zero `0.1.0-beta.0` references
remain in any package.json or the lockfile.

## INTERNAL DEPENDENCY REVIEW

Internal `@rekon/*` dependencies are pinned to the **exact** version (not `workspace:*` /
`file:` / local path), so they were bumped to `1.0.0` alongside the versions — consistent and
required. No external dependency range changed; no dependency was added or removed. The bump
was a textual `0.1.0-beta.0` → `1.0.0` replace confined to package.json files, pre-verified
to touch only version fields and `@rekon/*` pins.

## VERSIONING DECISION

Option B — lockstep `1.0.0` for all 21 public packages + private root alignment. Root is
aligned (not published, but the coherence test asserts `root.version === EXPECTED_VERSION`,
the existing convention). No package excluded. Tag and publish deferred.

## BOUNDARY MODEL

V1 = prepare/prove/package/export, not Rekon-side execution; Circe owns orchestration;
`intent:go` remains deferred; no Rekon command execution / source writes / VerificationRun /
VerificationResult. **No git tag occurs in this slice. No npm publish occurs in this slice.**

## TESTS / VERIFICATION

Updated `tests/docs/release-readiness.test.mjs` (`EXPECTED_VERSION = "1.0.0"`, title) — the
lockstep + internal-dep-pin coherence gate. New `tests/docs/v1-versioning.test.mjs` (10
assertions: root `1.0.0` + private; all packages `1.0.0`; count 21; zero private; no beta
remaining; memo says no-publish / no-tag / intent:go-deferred; CHANGELOG mention; review
packet PURPOSE PRESERVATION CHECK). Full gate: typecheck, build, test (full suite),
`git diff --check`, audit-package-exports, audit-license, publish-dry-run (packs `1.0.0`
tarballs, no publish), install-smoke, install-tarball-smoke. No CLI smoke (versioning batch).

## INTENTIONALLY UNTOUCHED

No git tag, no npm publish, no release tooling, no `intent:go`, no VerificationRun/Result, no
command execution, no source writes outside package metadata / docs / tests / review packet,
no new CLI command or artifact type, no runtime behavior change, no dependency range change,
no branch. Historical beta-era doc/test references to `0.1.0-beta.0` (CHANGELOG history,
beta-bump report, no-npm policy, the slice-107 prep statements) are intentionally left
intact.

## RISKS / FOLLOW-UP

- The version is now `1.0.0` but **nothing is tagged or published** — "versioned" must not be
  read as "released". Tag and publish are separate, approval-gated slices.
- `package-lock.json` was regenerated; if the lock drifts in a later environment, re-run
  `npm install` and re-verify the coherence test.
- A pre-existing `EBADENGINE` warning (node 25 vs declared `^20||^22||^24` engines) is
  environmental and unaffected by the version bump.

## NEXT STEP

V1 Tagging Decision / Implementation — decide and, if explicitly approved, create a V1 git
tag from the verified `1.0.0` commit. Still no npm publish unless separately approved.

# V1 Versioning Implementation

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

## Decision Summary

Per the V1 Release Mechanics / Versioning Decision (staged Option B), this slice executes
the **lockstep package version bump**: all 21 public workspace packages — and the private
workspace root `rekon` — move from `0.1.0-beta.0` to **`1.0.0`**, with every internal
`@rekon/*` dependency pin updated consistently from `0.1.0-beta.0` to `1.0.0` and
`package-lock.json` regenerated to match. **Versioning is lockstep.** **Package versions are
updated to 1.0.0.** No package is excluded. This is the versioning stage only:
**No git tag occurs in this slice. No npm publish occurs in this slice.** **V1 remains
prepare/prove/package/export, not Rekon-side execution; intent:go remains deferred.**

The eight versioning questions, answered:

1. **Should the 21 public packages move lockstep to 1.0.0 now?** Yes.
2. **Should the private workspace root version move to 1.0.0 too?** Yes — root alignment is
   selected. The root is not published, but the release-readiness coherence test asserts
   `root.version === EXPECTED_VERSION`, so keeping the root aligned is the existing repo
   convention and reduces operator confusion.
3. **Are any packages excluded from versioning?** No — slice 106 recorded lockstep package
   state and intended lockstep release; all 22 package.json files move together.
4. **Should lockstep be enforced by a test?** Yes — the existing
   `tests/docs/release-readiness.test.mjs` (its `EXPECTED_VERSION` is updated to `1.0.0`)
   asserts root + every package + every internal `@rekon/*` dep is exactly the target, and a
   new `tests/docs/v1-versioning.test.mjs` adds a package-state check.
5. **Should package-lock / lock metadata be updated if npm updates it?** Yes —
   `package-lock.json` is tracked and was regenerated (`npm install`) so its workspace
   entries and root version read `1.0.0`. No dependencies were added or removed.
6. **Should git tag happen now?** No. **No git tag occurs in this slice.**
7. **Should npm publish happen now?** No. **No npm publish occurs in this slice.**
8. **What release slice follows?** V1 Tagging Decision / Implementation (create a V1 git tag
   from the verified `1.0.0` commit, only if explicitly approved).

## Why This Versioning Exists

V1 readiness is conditionally approved, the release mechanics are decided (staged), and the
release-prep docs (notes / migration / checklist) exist. The next staged release step is
package versioning. Versioning must be explicit, lockstep, audited, reversible by normal git
history, and separated from tag/publish. This slice performs exactly that bump and updates
the coherence test and docs, while leaving tag and publish to later, separately-approved
slices.

## Package State Before

Re-confirmed at `8c6510f` (slice 106/107 recording): root `rekon`, `0.1.0-beta.0`,
`private: true`, `workspaces: ["packages/*"]`; 21 public packages, all `0.1.0-beta.0`, none
private; internal `@rekon/*` dependencies pinned to the exact version `0.1.0-beta.0`;
`package-lock.json` tracked and coherent at `0.1.0-beta.0`.

## Versioning Decision

Select **Option B — lockstep bump to `1.0.0` for all 21 public packages, with the private
root version also moved to `1.0.0` for workspace consistency.** Internal `@rekon/*`
dependency pins are updated `0.1.0-beta.0` → `1.0.0` (they pin exact versions, so they must
move with the package versions). No dependency *ranges* are otherwise changed, no
dependencies are added or removed, and no package is excluded. Tag and publish remain
deferred.

## Package State After

Root `rekon`: version `1.0.0`, still `private: true`. All 21 public packages: version
`1.0.0`. All internal `@rekon/*` dependency pins: `1.0.0`. `package-lock.json`: all 21
workspace entries and the root at `1.0.0`; zero `0.1.0-beta.0` references remain anywhere in
the package metadata or the lockfile. Lockstep is enforced by
`tests/docs/release-readiness.test.mjs` (`EXPECTED_VERSION = "1.0.0"`) and
`tests/docs/v1-versioning.test.mjs`.

## Internal Dependency Review

Before editing, the internal dependency references were inspected: every `@rekon/*`
dependency is pinned to the **exact** version string `0.1.0-beta.0` (not `workspace:*`,
`workspace:^`, `file:`, or a local path). Per the release-mechanics decision, exact internal
pins must move with the version bump, so each was updated to `1.0.0`. The bump was a
verified textual replace confined to package.json files — every `0.1.0-beta.0` occurrence in
those files was confirmed to be either the `version` field or an `@rekon/*` dependency pin
before editing, so no external dependency range was touched.

## Boundary Model

V1 is prepare/prove/package/export, not Rekon-side execution; Circe owns orchestration;
`intent:go` remains deferred; Rekon does not execute commands or write source files;
VerificationRun / VerificationResult generation remain deferred. Versioning vs tagging =
this slice does not tag; versioning vs publishing = this slice does not publish. The bump
changes only package metadata, the lockfile, the coherence test, and docs — no runtime
behavior, no CLI command, no artifact type.

## What This Does Not Do

This slice does not create or push a git tag, does not run or schedule `npm publish`, does
not implement release tooling, does not implement `intent:go`, does not create a
VerificationRun or VerificationResult, does not execute commands beyond the verification
gates, does not change runtime behavior, and adds no CLI command or artifact type. It edits
only package metadata (`package.json` × 22 + `package-lock.json`), one coherence test, one
new test, the versioning memo, a review packet, and supporting docs.

## Follow-Up Work

- **V1 Tagging Decision / Implementation** (recommended next): decide and, if explicitly
  approved, create a V1 git tag from the verified `1.0.0` version commit — still no npm
  publish unless separately approved. **Shipped (slice 109): an annotated `v1.0.0` git tag
  was created from the verified final commit and pushed to origin after the full gate passed;
  no version change and no npm publish. See [V1 Tagging Decision](./v1-tagging-decision.md).**
- **V1 Publish** (explicit, approval-gated, later): npm publish from the tagged commit once
  the before-publish gates pass — the only slice that publishes.
- `intent:go` / Rekon-side execution remain out of V1 and are a later, separate decision.

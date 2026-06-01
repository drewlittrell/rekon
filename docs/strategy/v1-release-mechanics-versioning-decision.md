# V1 Release Mechanics / Versioning Decision

## Decision Summary

Select **Option B — staged V1 release mechanics**. This is a decision-only batch: it pins
*how* a V1 release will happen without taking any release action. **V1 release mechanics do
not publish to npm in this slice. V1 release mechanics do not bump versions in this slice.**
Release actions are split into separate, individually gated slices — release-prep (notes /
migration / metadata), an explicit versioning slice (the only place package versions
change), and an explicit tag/publish slice (the only place a tag or npm publish happens,
and only with explicit approval). The V1 product boundary set by the V1 Readiness / Release
Review is reaffirmed and unchanged: **V1 means prepare/prove/package/export, not Rekon-side
execution; Circe owns orchestration for V1**; `intent:go`, Rekon-side command execution,
Rekon-side source writes, and Rekon-side VerificationRun / VerificationResult generation
remain excluded/deferred beyond V1.

The intended release target is **package `1.0.0`** for the V1 surface, but the actual bump
is deferred to a dedicated versioning slice; this decision does not edit any package
metadata.

The sixteen decision questions, answered:

1. **What does V1 release mean after the readiness review?** A concrete, gated path from the
   conditionally-approved V1 product surface to an eventual tagged/published release —
   staged so no version bump, tag, or publish happens by accident.
2. **Should the package version become 1.0.0, or product-scope only first?** Product scope
   is approved now; `1.0.0` is the *intended* version target but the bump is deferred to an
   explicit versioning slice. This decision does not set `1.0.0`.
3. **Should release mechanics be staged?** Yes — decision → release-prep → versioning →
   tag/publish, each independently gated.
4. **Should version bump and npm publish happen in the same slice?** No. They are separate
   slices with separate gates and separate approvals.
5. **Should tagging happen before or after package verification?** After: a tag is cut only
   from a version-bumped commit whose full gate is green and whose release notes are final.
6. **What gates must pass before version bump?** See the Release Gate Model (readiness +
   this decision shipped, full 9-command gate green, V1 docs + migration notes drafted).
7. **What gates must pass before tag?** Version-bump commit exists, package versions
   consistent (lockstep), full gate green post-bump, release notes finalized, clean
   worktree.
8. **What gates must pass before npm publish?** Explicit publish approval, publish-dry-run
   green from the exact tagged commit, tarballs verified, registry target confirmed, no
   unpublished local changes, no force-push / history rewrite.
9. **Which packages are included in the release decision?** All 21 public workspace packages
   (the private root `rekon` is the workspace container and is not published).
10. **Should all 21 packages move together?** Yes — lockstep, matching the real current
    state (all 21 already share `0.1.0-beta.0`).
11. **What release notes are required?** V1 definition, included commands/artifacts, the
    Rekon/Circe boundary, excluded execution behavior, known limitations, migration from the
    beta workflow, and exact verification evidence (see Release Notes Model).
12. **What migration notes are required?** The canonical intent flow and Circe import path,
    that legacy `rekon prepare plan` / `.rekon/handoffs` direction is superseded by
    `.rekon/intent/plans/<intent-id>/circe/`, and that `intent:go` is not available (see
    Migration Notes Model).
13. **How should beta users understand the V1 boundary?** V1 is the non-executing
    prepare/prove/package/export product; Circe orchestrates; nothing Rekon-side executes or
    writes source.
14. **Is intent:go included in V1?** No. **intent:go remains deferred beyond V1.**
15. **Is Rekon-side execution included in V1?** No. **Rekon does not execute commands in
    V1.** **Rekon does not write source files in V1.**
16. **What implementation / release slice follows?** V1 Release Prep Implementation
    (release notes / migration notes / package metadata if approved) — still no tag, still
    no npm publish, still no `intent:go`.

## Why This Decision Exists

The V1 Readiness / Release Review (`836461e`) conditionally approved the non-executing
Rekon → Circe prepared-plan handoff as V1 but deliberately deferred release mechanics. Rekon
needs an explicit decision covering version bump, tag, publish, release notes, package
readiness, migration notes, and release gating — one that makes the release path concrete
while preventing an accidental npm publish or version bump. This decision provides that
gating without touching package metadata or runtime/source state.

## Current Release State

- V1 product scope is conditionally approved (V1 Readiness / Release Review).
- Every intent layer has a shipped safety review; top-level help lists the rich intent
  workflow; the external Circe serve-loop proof passed (pass 1 / fail 0).
- No version bump, tag, or npm publish has occurred for V1; the project remains at the beta
  version.
- A prior **no-NPM beta distribution policy** (`docs/strategy/no-npm-beta-distribution-policy.md`)
  already keeps npm publish out of scope for the beta; this decision keeps publish gated and
  deferred for V1 as well.
- Prior beta release-mechanics machinery exists for reference
  (`beta-release-readiness-checklist.md`, `beta-version-bump-execution-report.md`,
  `beta-release-candidate-execution-plan.md`).

## Package State Reviewed

Inspected the real package files at `836461e` (recorded, not edited):

- Root `package.json`: name `rekon`, version `0.1.0-beta.0`, **`private: true`**,
  `workspaces: ["packages/*"]` — the workspace container, not a published package.
- **21 workspace packages**, every one at **`0.1.0-beta.0`**, and **none marked
  `private`** — i.e. all 21 are public and already version-locked together: the 11
  `@rekon/capability-*` packages, the 7 `@rekon/kernel-*` packages, plus `@rekon/sdk`,
  `@rekon/runtime`, and `@rekon/cli`.

So the real state is a private root + 21 public, lockstep-versioned packages. There are no
private/internal packages among the 21 to exclude. **This decision edits none of these
files.**

| Package Surface | Decision |
| --- | --- |
| public packages | included in release mechanics |
| private packages | inspect and record |
| experimental artifacts | allowed if documented |
| package versioning | intended lockstep unless metadata says otherwise |
| npm publish | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| keep beta indefinitely | rejected/deferred | V1 readiness needs a release path |
| staged release mechanics | selected | gates version/tag/publish separately |
| bump versions now | rejected | decision slice cannot edit package metadata |
| tag and publish now | rejected | publish requires explicit approval |
| wait for intent:go | rejected | V1 excludes Rekon execution |

- **A. Keep beta indefinitely** — Reject/defer: V1 readiness has been conditionally
  approved and needs a concrete release path.
- **B. Staged V1 release mechanics** — **Select**: decide mechanics now; implement
  version/tag/publish in later explicit slices, keeping each release action gated and
  avoiding accidental version bump or npm publish.
- **C. Bump to 1.0.0 in this decision slice** — Reject: a decision slice must not change
  package metadata or runtime/source state.
- **D. Tag and publish immediately** — Reject: publish requires explicit release
  implementation approval and final gates.
- **E. Wait for intent:go before V1** — Reject: V1 scope is non-executing
  prepare/prove/package/export; Circe owns orchestration.

## Recommendation

Select **Option B — staged V1 release mechanics**. The intended release target is package
`1.0.0` for the V1 surface, with lockstep versioning across all 21 public packages, but the
actual version bump is deferred to a dedicated versioning slice and the tag/publish to a
dedicated, explicitly-approved tag/publish slice. **V1 release mechanics do not publish to
npm in this slice. V1 release mechanics do not bump versions in this slice.**

## Release Gate Model

| Gate | Required Before |
| --- | --- |
| version bump | readiness + release mechanics + full gates |
| git tag | version bump + full gates + release notes |
| npm publish | explicit approval + dry-run + tarball smoke |
| V1 docs | release notes + migration notes |
| Circe handoff claim | serve-loop proof + projection safety review |

**Before version bump:** V1 readiness review shipped; this release-mechanics decision
shipped; full 9-command Rekon gate green; package export audit green; license audit green;
publish dry-run green; install smoke green; install-tarball smoke green; CHANGELOG / README
V1 scope updated; migration notes drafted.

**Before git tag:** the version-bump commit exists; all package versions consistent
(monorepo lockstep); full gate green after the version bump; release notes finalized; no
dirty worktree.

**Before npm publish:** explicit publish approval; publish dry-run green from the exact
tagged commit; package tarballs verified; registry target confirmed; no unpublished local
changes; no force-push / history rewrite.

## Package Versioning Model

Lockstep release for all 21 public packages — matching the real current state, where every
package shares `0.1.0-beta.0`. The private root `rekon` is the workspace container and is
not published. No package is published in this slice, and no `package.json` version is
edited. The intended target version is `1.0.0`, applied lockstep, but only by a later
explicit versioning slice. Experimental artifact types remain allowed under V1 as long as
they are documented as experimental in the V1 docs.

## Tagging Model

A git tag for V1 is cut only after the version-bump commit exists, the full gate is green
post-bump, release notes are finalized, and the worktree is clean. Tagging happens after
package verification, not before, and is its own explicitly-approved step — not part of this
decision and not part of the version-bump slice.

## Publish Model

npm publish is **deferred** and gated. It happens only in a dedicated, explicitly-approved
tag/publish slice, only from the exact tagged commit, only after publish-dry-run and tarball
smoke pass against that commit, with the registry target confirmed and the worktree clean.
This is consistent with the existing no-NPM beta distribution policy. **No npm publish
occurs in this slice**, and `npm publish` is not run.

## Release Notes Model

V1 release notes must include: the V1 definition; the included commands (`rekon intent
assess` / `prepare` / `status` / `work-order generate` / `verification-plan generate` /
`bundle write`); the included artifacts (IntentAssessmentReport, PreparedIntentPlan,
IntentStatusReport, WorkOrder + VerificationPlan handoffs, plan bundle, Circe proof/gate
projection); the Rekon / Circe boundary; the excluded execution behavior; known limitations;
migration from the beta workflow; and the exact verification evidence (full suite + package
gates + Circe schema validation + serve-loop proof).

## Migration Notes Model

V1 migration notes must include:

- Legacy `rekon prepare plan` / `.rekon/handoffs` direction is superseded by
  `.rekon/intent/plans/<intent-id>/circe/`.
- The new canonical flow: `rekon intent assess` → `rekon intent prepare` → `rekon intent
  status` → `rekon intent work-order generate` → `rekon intent verification-plan generate`
  → `rekon intent bundle write`.
- The Circe import path: `circe rekon-handoff validate/routes/import`.
- `intent:go` is not available.

If any legacy commands still exist (e.g. the legacy `intent work-order --path --goal` /
`intent remediation`), they are documented as legacy / compatibility surfaces, not the V1
recommended path.

## Boundary Model

| Boundary | V1 Decision |
| --- | --- |
| release decision vs version bump | decision only |
| release decision vs npm publish | no publish |
| Rekon vs Circe | prepare/export vs orchestrate/execute |
| Rekon vs command execution | no execution |
| Rekon vs source writes | no writes |
| intent:go | deferred |

Boundary statements pinned by this decision:

- **V1 release mechanics do not publish to npm in this slice.**
- **V1 release mechanics do not bump versions in this slice.**
- **V1 means prepare/prove/package/export, not Rekon-side execution.**
- **Circe owns orchestration for V1.**
- **intent:go remains deferred beyond V1.**
- **Rekon does not execute commands in V1.**
- **Rekon does not write source files in V1.**
- **VerificationRun and VerificationResult generation remain deferred beyond V1.**

## What This Does Not Do

This decision does not bump any package version, edit any `package.json`, tag a release, run
or schedule `npm publish`, or implement release tooling. It does not implement `intent:go`,
create a VerificationRun or VerificationResult, execute commands beyond the verification
gates, change runtime behavior, add a CLI command or artifact type, or create a branch. It
only adds this memo, a docs test, a review packet, and cross-reference / pointer updates to
existing docs.

## Implementation Sequence

1. **V1 Release Prep Implementation** (recommended next): draft/finalize release notes and
   migration notes and prepare package-metadata changes *if approved* — still no tag, still
   no publish, still no version bump beyond what an explicit versioning slice authorizes.
   **Shipped (slice 107): `docs/releases/` now holds the
   [V1 Release Notes](../releases/v1-release-notes.md),
   [V1 Migration Notes](../releases/v1-migration-notes.md), and
   [V1 Release Checklist](../releases/v1-release-checklist.md); packages remain at
   `0.1.0-beta.0` — no version bump, tag, or publish occurred.**
2. **V1 Versioning** (explicit, later): bump all 21 public packages lockstep to the approved
   target (`1.0.0`) once the before-version-bump gates pass — the only slice that edits
   package versions. **Shipped (slice 108): all 21 public packages + the private root are now
   at `1.0.0` (internal `@rekon/*` pins + `package-lock.json` updated); no tag, no publish.
   See [V1 Versioning Implementation](./v1-versioning-implementation.md).**
3. **V1 Tag** (explicit, later): cut the V1 tag from the version-bump commit once the
   before-tag gates pass. **Shipped (slice 109): an annotated `v1.0.0` git tag was created
   from the verified final commit and pushed to origin after the full gate passed — no npm
   publish and no version change. See [V1 Tagging Decision](./v1-tagging-decision.md).**
4. **V1 Publish** (explicit, approval-gated, later): npm publish from the tagged commit once
   the before-publish gates pass — the only slice that publishes, and only with explicit
   approval.

Related (separate track): the install / first-run onboarding model is decided in
[Rekon First-Run Scan / Install Onboarding Decision](./rekon-first-run-scan-onboarding-decision.md)
(slice 110) — the public first-run verb is `rekon scan`, not `refresh`. That decision changes
onboarding vocabulary only; it does not bump versions, tag, or publish.

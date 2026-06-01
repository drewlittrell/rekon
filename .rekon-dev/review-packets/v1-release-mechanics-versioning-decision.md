# Review Packet — V1 Release Mechanics / Versioning Decision

## CHANGES MADE

Strategy / release-mechanics decision batch — no runtime change, no package metadata change.
New `docs/strategy/v1-release-mechanics-versioning-decision.md` (selects staged V1 release
mechanics; pins version/tag/publish gates, lockstep versioning, release + migration notes
models), a 17-assertion docs test, this review packet, and cross-reference / pointer updates
to the V1 readiness review, listed safety reviews, both roadmaps, README, and CHANGELOG.

## PUBLIC API CHANGES

None. No code, CLI command, artifact type, flag, `package.json`, version, tag, publish, or
runtime behavior changed.

## PURPOSE PRESERVATION CHECK

V1 readiness was conditionally approved but release mechanics were deferred. Rekon needs an
explicit, gated decision for version bump, tag, publish, release notes, package readiness,
and migration notes that makes the release path concrete **without** risking an accidental
npm publish or version bump. This decision does exactly that: it stages release mechanics,
pins the gates for each release action, keeps V1 scope as non-executing
prepare/prove/package/export, and forbids npm publish and version bumps in this slice. Any
publish/tag/version action requires a later explicit slice; **npm publish remains forbidden
here**.

## CODEBASE-INTEL ALIGNMENT

Grounded in the V1 Readiness / Release Review, the eight shipped intent safety reviews, the
existing no-NPM beta distribution policy and prior beta release-mechanics docs, and the real
package files inspected at `836461e` (private root + 21 public lockstep packages). No
readiness or package claim was invented; package versions were recorded, not edited.

## CURRENT RELEASE STATE

V1 product scope conditionally approved; every intent layer safety-reviewed; help aligned;
Circe serve-loop proof passed (pass 1 / fail 0). No version bump / tag / npm publish has
occurred; the project remains at the beta version. A prior no-NPM beta distribution policy
already keeps npm publish out of scope for the beta.

## PACKAGE STATE REVIEWED

Root `package.json`: `rekon`, `0.1.0-beta.0`, **`private: true`**, `workspaces:
["packages/*"]` — workspace container, not published. **21 workspace packages, all at
`0.1.0-beta.0`, none `private`** — already lockstep and all public (11 `@rekon/capability-*`,
7 `@rekon/kernel-*`, plus `@rekon/sdk` / `@rekon/runtime` / `@rekon/cli`). No
private/internal packages to exclude. None of these files were edited.

## OPTIONS CONSIDERED

A. Keep beta indefinitely — Reject/defer (readiness needs a release path). B. Staged release
mechanics — **Select** (gates version/tag/publish separately; avoids accidental bump or
publish). C. Bump to 1.0.0 now — Reject (decision slice cannot edit package metadata). D. Tag
and publish now — Reject (publish requires explicit approval + final gates). E. Wait for
intent:go — Reject (V1 excludes Rekon execution).

## RELEASE GATE MODEL

Before version bump: readiness + this decision shipped, full 9-command gate green, V1 docs +
migration notes drafted. Before tag: version-bump commit exists, lockstep versions
consistent, full gate green post-bump, release notes final, clean worktree. Before npm
publish: explicit approval, publish-dry-run green from the exact tagged commit, tarballs
verified, registry confirmed, no unpublished changes, no force-push. (Gate table in the
memo.)

## PACKAGE VERSIONING MODEL

Lockstep across all 21 public packages (matching the real state where all share
`0.1.0-beta.0`); private root not published; intended target `1.0.0` applied lockstep by a
later explicit versioning slice. No version edited here.

## TAGGING MODEL

A V1 tag is cut only after the version-bump commit exists, the full gate is green post-bump,
release notes are final, and the worktree is clean — after package verification, as its own
explicitly-approved step. Not done here.

## PUBLISH MODEL

npm publish deferred and gated: only in a dedicated, explicitly-approved tag/publish slice,
only from the exact tagged commit, only after dry-run + tarball smoke pass against that
commit, with the registry confirmed and the worktree clean. Consistent with the no-NPM beta
distribution policy. **No npm publish occurs in this slice.**

## RELEASE NOTES MODEL

V1 release notes must include the V1 definition, included commands/artifacts, the
Rekon/Circe boundary, excluded execution behavior, known limitations, migration from the
beta workflow, and exact verification evidence.

## MIGRATION NOTES MODEL

V1 migration notes must include: legacy `rekon prepare plan` / `.rekon/handoffs` superseded
by `.rekon/intent/plans/<intent-id>/circe/`; the canonical flow (`intent assess` → … →
`intent bundle write`); the Circe import path (`circe rekon-handoff validate/routes/import`);
and that `intent:go` is not available. Legacy commands, if present, are documented as
legacy/compatibility surfaces, not the V1 recommended path.

## BOUNDARY MODEL

Release decision vs version bump = decision only; vs npm publish = no publish. Rekon
prepares/exports; Circe orchestrates/executes; no Rekon command execution; no Rekon source
writes; `intent:go` deferred. **V1 release mechanics do not publish to npm in this slice. V1
release mechanics do not bump versions in this slice. V1 means prepare/prove/package/export,
not Rekon-side execution. Circe owns orchestration for V1. intent:go remains deferred beyond
V1. Rekon does not execute commands in V1. Rekon does not write source files in V1.
VerificationRun and VerificationResult generation remain deferred beyond V1.** (Boundary
table in the memo.)

## TESTS / VERIFICATION

New `tests/docs/v1-release-mechanics-versioning-decision.test.mjs` (17 assertions: title, 15
headings, selected option, 8 boundary statements, 4 tables, CHANGELOG mention, review packet
PURPOSE PRESERVATION CHECK). Full gate: typecheck, build, test (full suite), `git diff
--check`, audit-package-exports, audit-license, publish-dry-run, install-smoke,
install-tarball-smoke. No CLI smoke (strategy-only batch). No publish, no version bump.

## INTENTIONALLY UNTOUCHED

No `package.json` edit, no version bump, no tag, no publish, no release tooling, no
`intent:go`, no VerificationRun/Result, no command execution, no source writes outside
docs/tests/review packet, no new CLI command or artifact type, no runtime behavior change, no
branch.

## RISKS / FOLLOW-UP

- "Staged mechanics decided" must not be read as "released" — version bump, tag, and publish
  are each separate, gated, later slices.
- The intended `1.0.0` target is a recommendation, not an applied version; the versioning
  slice owns the actual bump.
- npm publish stays forbidden until an explicit, approval-gated publish slice.

## NEXT STEP

V1 Release Prep Implementation — draft/finalize release notes and migration notes and prepare
package-metadata changes if approved; still no tag, still no npm publish, still no version
bump beyond what an explicit versioning slice authorizes, still no `intent:go`.

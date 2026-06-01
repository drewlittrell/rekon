# Review Packet — V1 Release Prep Implementation

## CHANGES MADE

Release-prep documentation batch — no runtime or package-metadata change. New
`docs/releases/` directory with `v1-release-notes.md`, `v1-migration-notes.md`,
`v1-release-checklist.md`, and an index `README.md`; a 18-assertion docs test; this review
packet; and cross-reference / pointer updates to the two V1 strategy docs, both roadmaps,
README, and CHANGELOG. No version bump, no tag, no npm publish.

## PUBLIC API CHANGES

None. No code, CLI command, artifact type, flag, `package.json`, version, tag, publish, or
runtime behavior changed.

## PURPOSE PRESERVATION CHECK

V1 readiness is conditionally approved and the release mechanics are decided (staged). Before
versioning / tagging / publish, operators and maintainers need concrete release notes,
migration notes, and a release checklist that make the V1 release legible **without** taking
irreversible release actions. This slice delivers exactly that: release notes explain V1's
inclusions/exclusions and the Rekon/Circe boundary; migration notes explain moving from the
legacy `rekon prepare plan` / `.rekon/handoffs` direction to the intent bundle + Circe
projection flow; the checklist records the gates required before version bump, tag, and
publish. Package state is documented, not changed; no publish, tag, or version bump occurs.

## CODEBASE-INTEL ALIGNMENT

Grounded in the V1 Release Mechanics / Versioning Decision and V1 Readiness / Release Review,
the eight shipped intent safety reviews, and the real package files re-inspected at
`317ef23`. The recorded package state was re-confirmed to match slice 106 before any release
claim was written.

## PACKAGE STATE REVIEWED

Re-confirmed at `317ef23` (recorded, not edited): root `rekon`, `0.1.0-beta.0`,
`private: true`, `workspaces: ["packages/*"]`; **21 public packages, all lockstep at
`0.1.0-beta.0`, none private** — identical to slice 106's recording. No `package.json` was
edited.

## RELEASE NOTES

`docs/releases/v1-release-notes.md` — V1 definition (prepare/prove/package/export, not
Rekon-side execution), included surfaces and commands (the six rich `rekon intent ...`
commands), the Rekon/Circe boundary, proof and safety evidence (full suite + package gates +
Circe schema validation + the external serve-loop proof, pass 1 / fail 0 + eight safety
reviews), explicit exclusions, known limitations, package scope, and verification gates.

## MIGRATION NOTES

`docs/releases/v1-migration-notes.md` — legacy beta surfaces superseded (legacy
`rekon prepare plan` / `.rekon/handoffs` → `.rekon/intent/plans/<intent-id>/circe/`), the V1
canonical flow (six `rekon intent ...` commands + `circe rekon-handoff validate` / `routes`
/ `import`), the intent bundle and Circe projection directories, a command mapping, and what
does / does not change (`.rekon/artifacts/` remains canonical truth; `intent:go` is not
available in V1).

## RELEASE CHECKLIST

`docs/releases/v1-release-checklist.md` — package state (packages remain at `0.1.0-beta.0`),
before-version-bump / before-git-tag / before-npm-publish gates, the nine required
verification commands, release-notes and migration-notes references, stop conditions, and the
approval model. States no version bump and no npm publish occur in this prep slice.

## BOUNDARY MODEL

V1 means prepare/prove/package/export, not Rekon-side execution; Circe owns orchestration;
`intent:go` deferred; Rekon does not execute commands or write source files;
VerificationRun/VerificationResult generation deferred. Release-prep vs version bump =
docs only; release-prep vs npm publish = no publish. The bundle/projection are projections;
canonical truth remains `.rekon/artifacts/`.

## TESTS / VERIFICATION

New `tests/docs/v1-release-prep.test.mjs` (18 assertions: the three release docs exist; the
release-notes boundary statements + six commands + serve-loop proof; the migration-notes
legacy-superseded statement + canonical flow + intent:go-not-available + artifacts-canonical;
the checklist packages-remain / no-publish / no-bump statements + nine gate commands;
CHANGELOG mention; review packet PURPOSE PRESERVATION CHECK). Full gate: typecheck, build,
test (full suite), `git diff --check`, audit-package-exports, audit-license, publish-dry-run,
install-smoke, install-tarball-smoke. No CLI smoke (release-prep docs batch). No publish, no
version bump.

## INTENTIONALLY UNTOUCHED

No `package.json` edit, no version bump, no tag, no publish, no release tooling beyond
docs/checklists, no `intent:go`, no VerificationRun/Result, no command execution, no source
writes outside docs/tests/review packet, no new CLI command or artifact type, no runtime
behavior change, no branch.

## RISKS / FOLLOW-UP

- "Release prep done" must not be read as "released" — version bump, tag, and publish are
  each separate, gated, later slices.
- The release notes / migration notes describe the *intended* `1.0.0` target; the actual
  bump is owned by the versioning slice. If package state ever diverges from `0.1.0-beta.0`
  lockstep, the notes and checklist must be re-confirmed.

## NEXT STEP

V1 Versioning Decision / Implementation — decide and, if approved, bump all 21 public
packages lockstep from `0.1.0-beta.0` to `1.0.0`. Still no npm publish unless separately
approved; still no git tag unless separately approved.

# Review Packet — V1 Tagging Decision / Implementation

## CHANGES MADE

Release-mechanics batch. Decides and (after the full gate passes) creates an **annotated
`v1.0.0` git tag** from this slice's final commit and pushes it to origin. New
`docs/strategy/v1-tagging-decision.md`, a 13-assertion docs test, this review packet, and
supporting doc updates. No package version change, no npm publish, no runtime change.

## PUBLIC API CHANGES

None. No code, CLI command, artifact type, flag, `package.json`, version, or runtime
behavior changed. The only repository-state change beyond docs/tests is the new annotated
`v1.0.0` tag.

## PURPOSE PRESERVATION CHECK

V1 package versions are lockstep at `1.0.0` and verified; the next release-mechanics stage
is creating a git tag from that verified commit as a durable release anchor, separated from
npm publish. This slice does exactly that: an explicit, gated, annotated `v1.0.0` tag created
only after the full gate passes, pointing at the slice's final commit. The V1 git tag points
to the exact verified `1.0.0` commit; npm publish remains deferred; no package versions
change; no runtime behavior changes.

## CODEBASE-INTEL ALIGNMENT

Grounded in V1 Versioning Implementation (`1.0.0` lockstep), the V1 Release Mechanics /
Versioning Decision (staged release path), and the real package state + tag state
re-inspected at `bea03a4` (root + 21 packages at `1.0.0`; no local or remote `v1.0.0` tag).

## CURRENT VERSION STATE

root `rekon` `1.0.0` `private: true`; 21 public packages all `1.0.0`; internal `@rekon/*`
pins all `1.0.0`; `package-lock.json` coherent at `1.0.0`; no `v1.0.0` tag locally or
remotely. No package version edited in this slice.

## OPTIONS CONSIDERED

A. Do not tag yet — Reject/defer (version commit needs a release anchor). B. Annotated
`v1.0.0` tag — **Select** (durable V1 release marker). C. Lightweight tag — Reject (no
release message). D. Tag and publish now — Reject (publish needs separate approval). E. Tag
after more dogfood — Reject/defer (tag does not publish).

## TAG MODEL

Annotated tag `v1.0.0` (`git tag -a v1.0.0 -m "..."`) on this slice's final commit, pushed
with `git push origin v1.0.0`. Message:

```
Rekon v1.0.0

V1 scope: prepare/prove/package/export. Circe owns orchestration.
No Rekon-side command execution, source writes, VerificationRun generation, or intent:go.
```

## GATE MODEL

Before tag: package versions root + 21 at `1.0.0`; clean worktree (only untracked
`pnpm-lock.yaml`); full nine-command gate green; release + migration notes present; npm
publish not run. The gate runs on the slice's final commit content before the tag is
created.

## PUBLISH BOUNDARY

npm publish deferred to a separate, explicitly-approved V1 Publish Decision / Implementation
slice (publishing the 21 public `1.0.0` packages from the `v1.0.0` tag). **npm publish does
not occur in this slice.**

## BOUNDARY MODEL

Tag only, no npm publish; versions already bumped; no Rekon execution; no source writes;
`intent:go` deferred. **V1 means prepare/prove/package/export, not Rekon-side execution;
Circe owns orchestration for V1; intent:go remains deferred.**

## TESTS / VERIFICATION

New `tests/docs/v1-tagging.test.mjs` (13 assertions: memo title, 11 headings, annotated
selection, the no-publish / versions-remain-1.0.0 / boundary statements, 3 tables, CHANGELOG
mention, review packet PURPOSE PRESERVATION CHECK — it does not assert the tag, since tests
run before tag creation). Full gate before tag: typecheck, build, test, `git diff --check`,
audit-package-exports, audit-license, publish-dry-run (no publish), install-smoke,
install-tarball-smoke. After tag: `git rev-parse v1.0.0` + `git ls-remote --tags origin
refs/tags/v1.0.0`.

## INTENTIONALLY UNTOUCHED

No npm publish, no package version edit, no `package.json` / `package-lock.json` change, no
release tooling, no `intent:go`, no VerificationRun/Result, no command execution, no source
writes outside docs/tests/review packet + the annotated tag, no new CLI command or artifact
type, no runtime behavior change, no branch.

## TAG (expected)

- expected local tag: `v1.0.0` (annotated)
- expected remote tag: `refs/tags/v1.0.0`
- expected tag target: this slice's final commit (the docs/test/review-packet commit)

Actual tag proof (commit SHA, local tag, remote tag) is recorded in the slice's final
response after the tag is created and pushed (recording it here would require retagging).

## RISKS / FOLLOW-UP

- A tag is created and pushed — "tagged" must not be read as "published". npm publish is a
  separate, approval-gated slice.
- The tag is annotated and points at the verified final commit; if the commit must change
  after tagging, the tag would need to be recreated (avoided by tagging last).

## NEXT STEP

V1 Publish Decision / Implementation — decide and, if explicitly approved, publish the 21
public `1.0.0` packages to npm from the `v1.0.0` tag. Still no `intent:go`, no Rekon-side
execution, no source writes.

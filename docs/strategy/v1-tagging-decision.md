# V1 Tagging Decision

## Decision Summary

Select **Option B — create an annotated `v1.0.0` git tag** from the verified `1.0.0`
commit, then push the tag to origin. Package metadata is already at `1.0.0` (lockstep)
from V1 Versioning Implementation; the next release-mechanics stage is a durable, gated
release anchor. This slice creates and pushes the tag **only after** the full nine-command
gate passes, and the tag points at this slice's final commit (which records the tag
decision). **npm publish does not occur in this slice. package versions remain 1.0.0.**
**V1 means prepare/prove/package/export, not Rekon-side execution. Circe owns orchestration
for V1. intent:go remains deferred.**

The seven tagging questions, answered:

1. **Should tag `v1.0.0` be created from the verified `1.0.0` commit?** Yes — from this
   slice's final commit (the docs/test/review-packet commit), which carries the verified
   `1.0.0` package metadata and records the tag decision.
2. **Should the tag be lightweight or annotated?** Annotated — it carries the V1 release
   message and is the durable release marker.
3. **Should the tag be pushed to origin?** Yes, after the local annotated tag is created.
4. **Should npm publish happen in this slice?** No. **npm publish does not occur in this
   slice.**
5. **What gates must pass before tag creation?** The full nine-command gate (typecheck,
   test, build, `git diff --check`, the four package/audit/smoke scripts), a clean
   worktree (only the intentionally-untracked `pnpm-lock.yaml`), package state at `1.0.0`
   lockstep, release + migration notes present, and no existing `v1.0.0` tag. See the gate
   table.
6. **What gates must pass before tag push?** The annotated tag exists locally and points at
   the verified final commit; no remote `v1.0.0` tag pre-exists; `main` is already pushed.
7. **What publish slice follows?** V1 Publish Decision / Implementation — publish the 21
   public `1.0.0` packages to npm from the `v1.0.0` tag, only if explicitly approved.

## Why This Tagging Exists

V1 package versions are now lockstep at `1.0.0` and verified. The next release-mechanics
stage is creating a git tag from that verified commit so V1 has a stable, durable release
anchor — separated from npm publish. Tagging must be explicit, gated, and reversible by
normal git history; this slice provides that without publishing or changing versions.

## Current Version State

Re-confirmed at `bea03a4`: root `rekon` `1.0.0` `private: true`; 21 public packages all
`1.0.0`; internal `@rekon/*` dependency pins all `1.0.0`; `package-lock.json` coherent at
`1.0.0`; no `v1.0.0` tag exists locally or remotely. **This slice does not edit any package
version.**

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| do not tag yet | rejected/deferred | version commit needs release anchor |
| annotated v1.0.0 tag | selected | durable V1 release marker |
| lightweight tag | rejected | lacks release message |
| tag and publish now | rejected | publish needs separate approval |
| tag after more dogfood | rejected/deferred | tag does not publish |

- **A. Do not tag yet** — Reject/defer: the version commit has passed gates and needs a
  stable release anchor before publish decisions.
- **B. Annotated `v1.0.0` tag** — **Select**: captures release intent and preserves a
  durable V1 anchor.
- **C. Lightweight `v1.0.0` tag** — Reject: a V1 release should carry an annotated message.
- **D. Tag and publish now** — Reject: publish requires explicit publish approval from the
  tagged commit.
- **E. Tag after more dogfood** — Reject/defer: dogfood can continue after a V1 tag; the tag
  does not publish packages.

## Recommendation

Select **Option B**: create an annotated `v1.0.0` tag after the full gate passes, then push
it to origin. The annotated tag message is:

```
Rekon v1.0.0

V1 scope: prepare/prove/package/export. Circe owns orchestration.
No Rekon-side command execution, source writes, VerificationRun generation, or intent:go.
```

## Tag Model

- Tag name: `v1.0.0`.
- Type: **annotated** (`git tag -a v1.0.0 -m "..."`).
- Target: this slice's final commit (the docs/test/review-packet commit), which carries the
  verified `1.0.0` package metadata.
- Push: `git push origin v1.0.0` after the local tag is created and `main` is pushed.
- The tag is a release anchor only; it does not publish, does not change versions, and does
  not change runtime behavior.

## Gate Model

| Gate | Required Before Tag |
| --- | --- |
| package versions | root + 21 packages at 1.0.0 |
| worktree | no tracked changes |
| full verification | 9-command gate green |
| release notes | present |
| migration notes | present |
| npm publish | not run |

The full nine-command gate runs on the slice's final commit content **before** the tag is
created; the tag is created only if every gate is green.

## Publish Boundary

npm publish is **deferred** and remains gated to a separate, explicitly-approved **V1
Publish Decision / Implementation** slice, which would publish the 21 public `1.0.0`
packages from the `v1.0.0` tag. **npm publish does not occur in this slice**, and
`npm publish` is not run here.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| tag vs publish | tag only, no npm publish |
| tag vs version bump | versions already bumped |
| V1 vs execution | no Rekon execution |
| V1 vs source writes | no source writes |
| V1 vs intent:go | deferred |

**V1 means prepare/prove/package/export, not Rekon-side execution. Circe owns orchestration
for V1. intent:go remains deferred.** Rekon does not execute commands or write source files;
VerificationRun / VerificationResult generation remain deferred.

## What This Does Not Do

This slice does not run or schedule `npm publish`, does not edit any package version or
`package.json`, does not implement release tooling, does not implement `intent:go`, does not
create a VerificationRun or VerificationResult, does not execute commands beyond the
verification gates, and changes no runtime behavior, CLI command, or artifact type. Its only
non-doc/test effect is creating and pushing the annotated `v1.0.0` git tag.

## Implementation Sequence

1. Write the tagging memo, docs test, review packet, and supporting doc updates.
2. Run the full nine-command gate on the slice's final commit content.
3. Commit the docs/test/review-packet changes and fast-forward `main`; push `main`.
4. Create the annotated `v1.0.0` tag on that final commit (`git tag -a v1.0.0 -m "..."`).
5. Push the tag (`git push origin v1.0.0`) and verify it locally and remotely.
6. **V1 Publish Decision / Implementation** (recommended next, explicit + approval-gated):
   publish the 21 public `1.0.0` packages to npm from the `v1.0.0` tag.

# Agent Contract Export — Land On Main

## Context

The previous Agent Contract Export Command batch shipped as `4df7dea`
on the worktree branch `claude/crazy-heyrovsky-671c8a`. At the time
the builder believed local `main` had diverged from the feature
branch by 5 commits. That belief was incorrect — it was a misread of
`git log --graph --all` output. This batch reconciles the
misunderstanding and lands the export feature on `main` safely.

## CHANGES MADE

- Fast-forwarded local `main` from `ca1572c` to `4df7dea`.
- Re-ran the full verification suite against the post-merge tree.
- Re-ran the prescribed export CLI smoke against
  `examples/simple-js-ts`.
- Cleaned up the smoke output files
  (`examples/simple-js-ts/AGENTS.rekon.md` and `AGENTS.md` were
  written by smoke step 6; both removed by smoke step 7).
- Wrote this merge review packet at
  `.rekon-dev/review-packets/agent-contract-export-merge.md`.

No source code, test, or doc changes were made on top of the
existing `4df7dea` commit. The fast-forward made every commit
between `ca1572c` and `4df7dea` (inclusive of the export work)
reachable from `main`.

## MERGE / CHERRY-PICK STRATEGY

**Fast-forward only.** No merge commit. No cherry-pick.

The apparent "5 commits ahead" reading from the previous builder
turn was a misread of `git log --oneline --decorate --graph --all`
output. The graph was linear (single `*` column), and the commits I
called "newer commits on local main" (`8aa95ec`, `c7b2cf3`,
`c179a2c`, `0e1440b`, `ca1572c`) were the *oldest* visible commits
on the branch, not the newest. Local main was simply stale — sitting
on `ca1572c` while origin/main had advanced to `c551486` (25 commits
later) and the feature branch had advanced to `4df7dea` (26 commits
later).

Verified by `git merge-base --is-ancestor`:
- `main IS ancestor of 4df7dea`
- `main IS ancestor of origin/main`
- `merge-base main 4df7dea` = `ca1572c` (= main itself)
- `git log main ^4df7dea` returned no commits (nothing on main that
  isn't already on the feature branch).

Because of this strict ancestry, `git merge --ff-only 4df7dea` was
safe and completed cleanly. No working-tree changes were made by
the fast-forward in the worktree this commit was authored from
(that worktree was already at `4df7dea`); the primary worktree at
`/Users/andrewlittrell/Code/rekon` advanced its `main` ref and
updated 186 files / 33113 insertions to match the feature branch's
state.

## FINAL MAIN SHA

`main` will point at the new commit created by this packet (the
"Land Agent Contract Export on main" commit). That SHA is reported
in the final assistant message after the commit and push complete.

## CONFLICTS RESOLVED

None. The fast-forward was clean. `git status --short` after the
fast-forward showed only the untracked `.claude/` worktree
directory, which is not tracked by the repo.

## TESTS / VERIFICATION

Re-run against the post-fast-forward tree. All results match the
pre-fast-forward run (the code is identical):

- `npm run typecheck` ✓
- `npm run build` ✓
- `git diff --check` ✓ (no whitespace issues)
- `npm run test` ✓ (333 passed, 1 skipped, 0 failed; includes the 15
  agent-contract-export contract tests added in `4df7dea`)
- `node scripts/audit-license.mjs` ✓ (19 packages)
- `node scripts/audit-package-exports.mjs` ✓ (19 packages)
- `node scripts/publish-dry-run.mjs` ✓ (19 packages, no
  `.tsbuildinfo` leaks, no forbidden tokens)
- `node scripts/install-smoke.mjs` ✓ (full CLI flow against a
  packed-tree consumer)
- `node scripts/install-tarball-smoke.mjs` ✓ (19 tarballs installed
  into a fresh consumer; 13 artifacts emitted; `artifacts validate`
  passed)

## EXPORT SMOKE RESULTS

Per work order step 6, run against `examples/simple-js-ts`:

| Command | Result |
| --- | --- |
| `rekon refresh --root examples/simple-js-ts --json` | status `passed` |
| `rekon publish agent-contract --root examples/simple-js-ts --json` | wrote `Publication:agent-contract-<timestamp>` |
| `rekon agent-contract export --root examples/simple-js-ts --output AGENTS.rekon.md --json` | `outputPath: AGENTS.rekon.md`, `protectedPath: false`, `wrote: true`, `publicationRef.id` matches the just-written Publication |
| `rekon agent-contract export --root examples/simple-js-ts --output AGENTS.md --json` (no `--force`) | exit 1, stderr `Refusing to overwrite protected agent instruction file AGENTS.md without --force.` (expected refusal) |
| `rekon artifacts validate --root examples/simple-js-ts --json` | `valid: true` |

Cleanup per step 7: `rm -f examples/simple-js-ts/AGENTS.rekon.md
examples/simple-js-ts/AGENTS.md` — both removed; `git status` clean.

## INTENTIONALLY UNTOUCHED

- The `4df7dea` commit content is unchanged. No amend, no rebase, no
  squash. Its SHA is preserved.
- The `c551486` commit (Agent Operating Contract Publication v1) and
  every other ancestor commit are unchanged. The fast-forward only
  advanced the `main` ref.
- No npm publish. No npm package version bump. The release remains
  `0.1.0-alpha.1` and remains in the manual-publish-deferred state
  recorded in `.rekon-dev/review-packets/manual-publish-decision.md`.
- No remote history rewrite. `origin/main` will advance only via
  fast-forward push.

## RISKS / FOLLOW-UP

- Risk: a future builder again mis-reads `git log --graph --all` and
  invents a divergence that does not exist. Mitigation: future
  branch-state inspection should run `git merge-base
  --is-ancestor main <feature>` and `git log main ^<feature>` to
  prove ancestry rather than inferring it from the visual graph.
  Treat the visual graph as advisory until the ancestor check
  confirms it. This rule is now captured in this packet for future
  reference and could be promoted into `AGENTS.md` in a later batch
  if the failure mode recurs.
- Follow-up: in a future batch, consider adding `git fetch origin &&
  git status -uno` to the "Process" section of `AGENTS.md` so the
  divergence question is answered concretely before assuming a
  divergence exists.
- No source-write actuator. No watcher. No CI publisher surface.

## NEXT STEP

Push `main` to `origin/main` (fast-forward). After the push lands,
delete the obsolete `claude/crazy-heyrovsky-671c8a` feature branch
locally (the worktree itself is the user's harness; deletion of the
branch ref is safe because the commits are reachable from `main`).
The next implementation slice per the user's instruction is
**Memory usage evidence / curation v1**, queued as a fresh work
order. Do not start that batch until this packet's push completes
and the user confirms the new `main` SHA.

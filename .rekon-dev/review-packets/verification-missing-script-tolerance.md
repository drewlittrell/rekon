# Review Packet — VerificationPlan Missing-Script Tolerance

**Slice:** `verification-missing-script-tolerance`
**Sequence position:** First post-beta polish slice
surfaced by the real-repo cohort
(`additional-real-repo-dogfood-execution`).
**Batch type:** Runtime polish + tests + docs.
**Strict no-go list:** no new package, no new CLI
command, no new permission, no new artifact type,
no schema change, no workflow-template change, no
validator profile change, no GitHub API call, no
`npm publish`, no version bump, no release tag, no
GitHub Release, no active workflow YAML, no
`package.json` / `package-lock.json` mutation, no
source-file mutation in any target repo, no
network I/O.

## CHANGES MADE

1. **New exported helper
   `detectMissingScriptCommands(commands, cwd)`**
   in `packages/capability-verify/src/index.ts`.
   Pure. Reads exactly one file
   (`<cwd>/package.json`) with guarded `try`.
   Returns a `Map<index, { scriptName,
   packageManager }>` for `npm | pnpm | yarn run
   <name>` argv shapes whose `<name>` is provably
   absent. Falls through silently when
   `package.json` is missing / unreadable /
   malformed / has no `scripts` field.
2. **One-statement wire-in** in
   `executeVerificationRun`. Pre-flight: for each
   indexed missing-script command, append to
   `executed[]` with `status: "skipped"` and a
   `notes` string of the form
   `missing-script: <name> (no "<name>" script
   in <pkgmgr>'s package.json scripts)`. No
   process spawn. The remaining spawn / timeout
   / redaction / digest path is unchanged.
3. **New contract test
   `tests/contract/verification-missing-script-tolerance.test.mjs`**
   (15 cases): 7 helper unit cases + 7
   `executeVerificationRun` integration cases +
   1 derivation case for
   `deriveVerificationResultFromRun`.
4. **New strategy memo
   `docs/strategy/verification-missing-script-tolerance.md`.**
5. **New docs test
   `tests/docs/verification-missing-script-tolerance.test.mjs`**
   (~12 assertions) pinning the memo's headers
   and cross-references.
6. **Concept-doc update** to
   `docs/concepts/verification-runs.md` — a new
   "Missing-Script Tolerance" subsection under
   the runner's Execution section.
7. **CHANGELOG + README** updated to record the
   slice.

## NOT CHANGED

- `VerificationCommandRunStatus` enum (already
  defined `skipped`).
- `deriveRunStatus` aggregator (already
  understood `skipped`).
- `mapRunCommandStatusToResult` (already mapped
  `skipped → skipped`).
- `VerificationResultSummary` schema (already
  has `skipped: number`).
- Spawn, timeout, redaction, digest, and
  process-tree-kill paths for every non-skipped
  command.
- Public CLI surface (`rekon verify run --execute`
  and `rekon verify result from-run` behave
  identically for any plan whose scripts all
  exist).
- Any workflow YAML, validator profile, or
  GitHub publisher.
- `package.json`, `package-lock.json`, version
  number, or any release artifact.

## EVIDENCE

- All 15 new contract-test cases pass.
- Pre-existing 25 cases in
  `verification-run-execution.test.mjs` still
  pass.
- `pnpm typecheck`, `pnpm build`, `pnpm test`,
  `pnpm audit:exports`, `pnpm audit:doc-paths`,
  `pnpm audit:json-fixtures`, and the CLI smoke
  fixture all clean (run as part of the final
  verification gate before commit).
- Helper is conservative by construction:
  guarded `try` reading exactly one file, only
  acts on `npm/pnpm/yarn run <name>` argv shapes,
  never speculates.

## OPERATOR IMPACT

- Plans like the runner default (`npm run
  typecheck` / `npm run test` / `npm run build`)
  now record `skipped` instead of `failed` for
  scripts the operator's `package.json` doesn't
  define. The aggregate run status becomes
  `partial` (when some commands passed) or
  `not-run` (when all are skipped), not
  `failed`. Real failures (typecheck errors,
  test failures, build errors) are still
  `failed`.
- The `notes` field carries a human-readable
  reason starting with `missing-script:` so
  proof-report consumers and reviewers can tell
  pre-flight skips apart from operator-authored
  skips.
- No operator action required to adopt. Existing
  plans behave identically when every script
  exists.

## SAFETY

- Read-only file access; one file per run.
- No new permission, no new role, no new
  artifact type, no new manifest export.
- No source writes anywhere.
- No network.
- No mutation of target repos outside `mktemp
  -d` test fixtures.
- Capability conformance unchanged (verified by
  the existing audit suite).

## ROLLBACK

Single revert. The change is one helper + one
wire-in statement + one new test file + one new
docs file + one docs-test file + small concept-doc
+ CHANGELOG/README append. No data migration, no
artifact format change, no operator workflow
change.

## CROSS-REFERENCES

- Memo:
  `docs/strategy/verification-missing-script-tolerance.md`
- Concept doc:
  `docs/concepts/verification-runs.md` (new
  Missing-Script Tolerance subsection)
- Contract tests:
  `tests/contract/verification-missing-script-tolerance.test.mjs`
- Docs tests:
  `tests/docs/verification-missing-script-tolerance.test.mjs`
- Source of evidence:
  `docs/strategy/real-repo-cohort-summary.md`
- Cohort plan:
  `docs/strategy/additional-real-repo-dogfood-cohort-plan.md`
- Runner contract:
  `docs/strategy/verification-runner-v1-decision.md`

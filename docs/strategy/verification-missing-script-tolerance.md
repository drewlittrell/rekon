# VerificationPlan Missing-Script Tolerance

**Status:** shipped (post-beta polish slice surfaced by
the first real-repo cohort).
**Owner:** `@rekon/capability-verify` runner.
**Scope:** pre-flight detection of `npm | pnpm | yarn run
<script>` plan commands whose script is absent from the
operator's `package.json`. Emit `skipped` (not
`failed`) so the proof surface stays honest.

## Why

The first real-repo cohort
([summary](real-repo-cohort-summary.md)) ran the
default `npm run typecheck` / `npm run test` / `npm run
build` plan against three operator repos. Two of them
do not define every script:

- `structured-evals` (medium monorepo): no root
  `build` script — packages build per-workspace.
- `figma-ds` (Next.js + mixed JS/TS): no `test`
  script at all.

In both cases `executeVerificationRun` spawned npm,
npm exited non-zero with `Missing script: <name>`,
and the runner recorded the command as `failed`. The
cohort summary called this out:

> The runner's default command set
> (`npm run typecheck` / `test` / `build`) is reasonable
> but not universal across real repos. At least one of
> those scripts is missing on at least one cohort target.

Recording a missing script as `failed` is technically
honest (the command did fail) but operationally
misleading. A missing `build` script is not the same
class of problem as a `build` that ran and produced
type errors. The cohort summary recorded this as
acceptable for beta but flagged the polish work:

> A small post-beta runner enhancement could detect
> missing scripts pre-flight and report `skipped`
> instead of `failed`, keeping the proof surface
> honest about what actually got verified.

This memo closes that loop.

## What Ships

A pure helper plus a one-statement wire-in. No schema
change. No public-API change. No new permission. No
network. No source writes.

### `detectMissingScriptCommands(commands, cwd)`

New exported function in
`packages/capability-verify/src/index.ts`. Given:

- A list of dry-run-validated commands (each carries
  the safe `argv: ReadonlyArray<string>`).
- The cwd the runner will spawn them in.

It returns a `Map<index, { scriptName, packageManager }>`
naming the commands whose script is provably missing
from `<cwd>/package.json`.

It is conservative by construction:

- Only `npm | pnpm | yarn` (no `bunx`, no
  `corepack`, no shims). Yarn berry's `yarn run
  <script>` matches the same shape.
- Only the `argv[0] argv[1]=="run" argv[2]==<name>`
  shape (no `npm test` shortcut, no `yarn <script>`
  shortcut). The runner never speculates.
- Falls through silently when `package.json` is
  absent, unreadable, malformed JSON, or has no
  `scripts` field — these are all valid operator
  configurations that should not be flagged.
- Reads only `package.json` from the runner's cwd.
  No directory walk, no monorepo workspace
  resolution.

### Wire-In

`executeVerificationRun` calls the helper once after
the dry-run preview and before the spawn loop. For
each pre-detected missing-script command:

- The command is appended to `executed[]` with
  `status: "skipped"`.
- A `notes` string of the form
  `missing-script: <name> (no "<name>" script in
  <pkgmgr>'s package.json scripts)` is attached so
  the run carries a plain-English reason.
- **No process is spawned.** The package manager
  never runs; there is no exit-code noise, no
  `Missing script` stderr to redact.

Existing per-command timeout, per-plan timeout, and
spawn behaviour are untouched for every other command.

### Aggregate Status

The runner's `deriveRunStatus` already understood
`skipped`. The existing rules apply unchanged:

| Composition | Run status |
| --- | --- |
| `>=1 failed` | `failed` |
| `>=1 killed` | `killed` |
| `>=1 timeout` | `timeout` |
| `>=1 passed` + `>=1 skipped` (no failed/killed/timeout) | `partial` |
| `all skipped` | `not-run` |
| `all passed` | `passed` |

Real-world: the same `figma-ds` plan that was
`failed` pre-change (because `test` was missing)
now records `partial` (typecheck passed, test
skipped, build passed). The same `structured-evals`
plan that was `failed` (because `build` was missing)
now records `partial` (typecheck passed, test
passed, build skipped). The cohort decision
becomes `pass` rather than `pass-with-known-limitations`
on the runner row.

### Derivation

`deriveVerificationResultFromRun` already mapped
`skipped → skipped` via `mapRunCommandStatusToResult`.
No change. The `VerificationResult` summary now
records `summary.skipped >= 1` where appropriate and
the overall result status follows the existing
`partial` rule.

The runner notes (`missing-script: ...`) propagate
into `VerificationCommandResult.notes` via the
existing note-passing path. Proof-report consumers
already render notes, so the skip reason surfaces
in publications without additional changes.

## Out Of Scope

- **No new "auto-fix" or plan-rewrite behaviour.**
  The runner does not edit the `VerificationPlan`,
  does not suggest commands, does not synthesize a
  `build` script. Missing scripts are an operator
  decision; the runner just records honestly.
- **No directory walk or workspace resolution.**
  Monorepo plans that run `pnpm -r build` are not
  in scope — they invoke `pnpm` directly (not `pnpm
  run <name>`) and the existing failure path is
  fine. If a future plan command uses `pnpm -F
  <pkg> run <script>` we may revisit, but it's not
  surfaced by the cohort.
- **No new package-manager support.** `bunx`,
  `deno task`, `make`, `just`, etc. are all
  treated normally (spawn → exit code). The
  cohort surfaced npm and pnpm only.
- **No change to `not-run`.** `not-run` still
  means "the runner never reached this command"
  (per-plan timeout, plan validation failure).
  `skipped` means "the runner decided not to run
  this command for a known reason (script absent
  pre-flight)." The two are intentionally
  distinct.

## Safety

- **Read-only.** The helper reads exactly one file
  (`<cwd>/package.json`) per run, with a guarded
  `try` that swallows every error to `null` so a
  missing or malformed file is indistinguishable
  from "no scripts to check."
- **No source writes.**
- **No additional permission.** The runner already
  reads the cwd to spawn commands; reading
  `package.json` is strictly within the existing
  boundary.
- **Capability-conformance unchanged.** No new
  `apply:*` permission, no new artifact type,
  no new exported manifest fields. The
  conformance harness should be a no-op pass.
- **Honest skips.** The skip carries a
  machine-readable note prefix
  (`missing-script:`) and a human-readable
  reason. Audit reviewers can distinguish
  pre-flight skips from "the operator wrote
  `--skip` somewhere."

## Tests

- New: `tests/contract/verification-missing-script-tolerance.test.mjs`
  (15 cases, all passing):
  - 7 helper unit cases — npm/pnpm/yarn detection,
    present-script fall-through, non-package-manager
    argv fall-through, missing/malformed
    `package.json` fall-through, no-scripts-field
    fall-through.
  - 7 `executeVerificationRun` integration cases
    — single missing script marks `skipped` and
    spawns nothing, mixed pass + skip yields
    run-status `partial`, all-skipped yields
    `not-run`, failed + skipped yields `failed`
    (failure dominates), prior behaviour preserved
    when `package.json` is absent or the script
    exists but fails at runtime, non-package-manager
    argv is never skipped.
  - 1 derivation case — `deriveVerificationResultFromRun`
    maps `skipped` through to
    `VerificationResult.commandResults` honestly and
    surfaces overall status `partial`.

- Pre-existing 25 cases in
  `verification-run-execution.test.mjs` still
  pass (no regression on the spawn / timeout /
  redaction / digest path).

## Decision Log

- **Why pre-flight, not post-spawn classification
  of the npm error?** A pre-flight check costs one
  `readFileSync` per run, gives a clean
  `skipped` with a clean note, and never invokes
  the package manager. Post-spawn classification
  would require parsing npm's English stderr and
  would still spawn npm just to read the error.
  Pre-flight is simpler and more honest.
- **Why no schema change?** The
  `VerificationCommandRunStatus` enum already
  defines `skipped`. The aggregator already
  understands it. The result mapper already
  handles it. The schema was already correct —
  the runner just wasn't emitting `skipped` for
  this case. The polish is a wire-in, not a
  protocol change.
- **Why not also handle `pnpm -r <script>` or
  workspace filters?** None of the cohort
  targets surfaced that pattern. Adding it
  speculatively would expand the helper's
  scope beyond what's been observed in the
  wild. If a future operator's plan needs it,
  we'll add it on evidence.
- **Why not silently treat all `npm: ENOENT`-class
  failures as `skipped`?** That would conflate
  "missing script" (a known recoverable shape)
  with "npm itself is not on PATH" (an
  environment configuration problem the
  operator probably wants to see as `failed`).

## Cross-References

- [Real-repo cohort summary](real-repo-cohort-summary.md)
  — where this work was surfaced.
- [Cohort plan](additional-real-repo-dogfood-cohort-plan.md)
  — the dogfood matrix that surfaced it.
- [Verification runs concept doc](../concepts/verification-runs.md)
  — adds a Missing-Script Tolerance subsection.
- [`@rekon/capability-verify` package](../../packages/capability-verify/src/index.ts)
  — the helper + wire-in.
- [Verification-runner v1 decision memo](verification-runner-v1-decision.md)
  — the original runner contract (`skipped`
  enum value pre-existed there).
- [Roadmap](roadmap.md) / [Classic behaviour roadmap](classic-behavior-roadmap.md)
  — record this as the first post-beta polish
  slice shipped on evidence from a real cohort.

## Status

Shipped on 2026-05-23. No version bump (still
`0.1.0-beta.0`). No npm publish. No new
workflow YAML. The change is a pure helper plus
a one-statement runner wire-in; rollback is a
single revert.

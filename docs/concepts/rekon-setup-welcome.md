# Rekon Setup / Welcome UI

The `rekon welcome` and `rekon setup` commands are the non-interactive-safe
welcome / setup UI foundation decided by the
[Rekon Install / Setup / ASCII Art UX Decision](../strategy/rekon-install-setup-ascii-ux-decision.md).
They make the first-run experience polished without prompting, executing
anything, or polluting machine-readable output.

## `rekon welcome`

```sh
rekon welcome [--json] [--no-banner]
```

**`rekon welcome` introduces the Scan → Snapshot → Act lifecycle.** It prints a
branded introduction: the lifecycle, the first-run command (`rekon scan`), the
full intent workflow (`rekon scan` → `rekon intent context prepare` → … →
`rekon intent bundle write`), and the V1 boundaries. It reads nothing, writes
nothing, runs no scan, and executes no commands.

`rekon welcome --json` emits a structured object (`command`, `lifecycle`,
`firstRun`, `intentWorkflow`, `boundaries`) with no branding. **ASCII art never
appears in `--json` output.**

## `rekon setup`

```sh
rekon setup [--root <path>] [--json] [--no-banner]
```

**`rekon setup` is deterministic and non-interactive.** It detects the
workspace state (`not_initialized` / `initialized_without_snapshot` /
`snapshot_ready`) and prints a deterministic plan of recommended next actions.
It does not prompt. **`rekon setup` does not run scan.** **`rekon setup` does
not generate docs, agent context, or CI before the first scan.** When the
workspace is not initialized it reads only whether `.rekon/` exists and touches
nothing else, so setup never creates `.rekon/` before the first scan.

Recommended next actions by state:

| Workspace state | Recommended next action |
| --- | --- |
| not_initialized | `rekon scan` |
| initialized_without_snapshot | `rekon scan` |
| snapshot_ready | `rekon intent context prepare`, then `rekon intent assess`, `rekon publish agents`, `rekon artifacts list` |

`rekon setup --json` emits `{ command, workspace: { state, root },
recommendedNextActions, boundaries }`, banner-free, where every boundary boolean
(`runsScan`, `createdDocs`, `createdAgentHandoff`, `createdCi`,
`createdVerificationPlan`, `runsCirce`, `executesCommands`, `writesSourceFiles`,
`implementsIntentGo`) is `false`.

## Banner / color model

The big banner appears only in an interactive TTY welcome / setup; a non-TTY
human invocation shows the compact mark instead, and `--json` shows neither.

- **`NO_COLOR` disables color.** (No ANSI color is emitted; the convention is
  respected for completeness.)
- **`REKON_NO_BANNER` disables the banner.** With `REKON_NO_BANNER` (or
  `--no-banner`) no big banner and no compact mark are printed — only the body.
- **Non-TTY setup must not prompt.** In non-TTY / CI contexts neither command
  prompts, and the big banner is off by default.

## Boundaries

These commands are read-only onboarding. **Onboarding does not imply Rekon runs
Circe.** Rekon prepares, proves, packages, and exports; Circe imports and
orchestrates. Neither `rekon welcome` nor `rekon setup` executes commands,
writes source files, runs scan, creates `.rekon/`, runs Circe, or adds
prompts. **intent:go remains deferred.**

---

_Implemented (slice 118): the welcome / setup UI foundation. No interactive
prompts, no `create-rekon`, no postinstall onboarding, no `intent:go`. Next:
Rekon Setup / Welcome UI Safety Review._

_Reviewed (slice 119): `rekon welcome` / `rekon setup` are **safe/stable** — explanatory,
deterministic, non-interactive; setup does not run scan or create `.rekon/` before scan; `--json` is
banner-free; onboarding implies no command execution, source writes, or Circe run; `intent:go`
deferred. Next: Rekon Interactive Setup Prompt Decision. See
[Rekon Setup / Welcome UI Safety Review](../strategy/rekon-setup-welcome-ui-safety-review.md)._

# Rekon Setup / Welcome UI Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

## Decision Summary

The Rekon Setup / Welcome UI Implementation (shipped at `00279d4`) is reviewed end-to-end and found
**safe and stable**. `rekon welcome` and `rekon setup` are the non-interactive-safe welcome / setup
UI foundation: they explain the lifecycle and recommend the next action without taking it. **`rekon
welcome` is explanatory, not action-taking.** **`rekon setup` is deterministic and
non-interactive.** **`rekon setup` does not run scan.** **`rekon setup` does not create `.rekon/`
before scan.** **`rekon setup` does not generate docs, agent handoff, CI, or VerificationPlan.**
Branding is suppressed in machine-readable and suppressed modes, and no command prompts. This review
changes no behavior; it records the assessment and recommends the interactive setup prompt decision
next.

The seventeen review questions, answered:

1. **Is `rekon welcome` safe/stable?** Yes — it reads nothing, writes nothing, runs no scan, and
   executes no commands; it only prints a branded lifecycle introduction (covered by contract +
   docs tests).
2. **Is `rekon setup` safe/stable?** Yes — it is deterministic, non-interactive, read-only with
   respect to `.rekon/` when uninitialized, and emits an explicit boundary-false plan.
3. **Does welcome explain Scan → Snapshot → Act without executing anything?** Yes — the human and
   JSON outputs present the lifecycle, first-run command, intent workflow, and boundaries, with no
   side effects.
4. **Does setup remain deterministic and non-interactive?** Yes — given a workspace state it always
   produces the same plan; it never prompts.
5. **Does setup avoid running scan?** Yes — it recommends `rekon scan` but never invokes
   `runRefresh` or any scan.
6. **Does setup avoid creating `.rekon/` before scan?** Yes — `detectSetupWorkspaceState` touches
   the filesystem only when `.rekon/` already exists; when it is absent it returns
   `not_initialized` without writing anything (a contract test asserts no `.rekon/` is created).
7. **Does setup avoid docs / agent / CI / VerificationPlan generation?** Yes — it produces only a
   plan of recommended commands; every boundary boolean (`createdDocs`, `createdAgentHandoff`,
   `createdCi`, `createdVerificationPlan`, …) is false.
8. **Does `--json` output avoid ASCII / banner output?** Yes. **ASCII art never appears in --json
   output.**
9. **Does `REKON_NO_BANNER` suppress banner output?** Yes. **REKON_NO_BANNER suppresses banner
   output.**
10. **Does `NO_COLOR` suppress ANSI color?** Yes. **NO_COLOR suppresses ANSI color.** (No ANSI color
    is emitted at all; the convention is respected for completeness.)
11. **Does non-TTY setup avoid prompts?** Yes. **Non-TTY setup does not prompt.** Neither command
    prompts in any mode — no prompt machinery exists this slice.
12. **Does onboarding avoid implying Rekon runs Circe?** Yes. **Onboarding does not imply Rekon runs
    Circe.**
13. **Does onboarding avoid implying Rekon executes commands or writes source files?** Yes.
    **Onboarding does not imply Rekon executes commands or writes source files.**
14. **Does intent:go remain deferred?** Yes. **intent:go remains deferred.**
15. **Should interactive setup prompts be decided next?** Yes — setup exists but intentionally does
    not prompt, so the prompt policy is the natural next decision.
16. **Or should create-rekon be decided next?** Deferred — a `create-rekon` / `@rekon/create`
    initializer should reuse the decided prompt model, so prompts come first.
17. **What slice follows?** **Rekon Interactive Setup Prompt Decision** — decide which questions are
    allowed before / after scan, TTY / CI / `--json` / `--yes` behavior, cancellation behavior, and
    persistence boundaries.

## Why This Review Exists

`rekon scan` became the canonical first-run command, and the Rekon Install / Setup / ASCII Art UX
Decision pinned a staged install/setup polish. The first implementation step — `rekon welcome` and
`rekon setup` — shipped as a non-interactive-safe foundation. Before adding interactive prompts or a
`create-rekon` initializer, Rekon must confirm the foundation is safe: explanatory rather than
action-taking, deterministic, machine-safe in `--json`, and free of any implied execution / source
write / Circe run. This review provides that confirmation against the shipped implementation and its
tests.

## Implementation Reviewed

In `packages/cli/src/index.ts`: the `welcome` branch (prints the lifecycle / first-run / intent
workflow / boundaries; JSON `{ command, lifecycle, firstRun, intentWorkflow, boundaries }`), the
`setup` branch (read-only state detection + deterministic plan), and the branding helpers
(`shouldUseColor`, `shouldShowBanner`, `rekonBrandPrefix`, `renderRekonBanner`,
`renderRekonCompactMark`). `detectSetupWorkspaceState` opens the artifact store only when `.rekon/`
exists; `buildSetupPlan` maps state to recommended next actions with all boundary booleans false.
The shared intent-workflow list is a hoisted function (`rekonIntentWorkflow()`), not a module
`const`, because `main()` runs synchronously into the welcome branch during module load — a correct,
TDZ-safe choice. `usage()` lists both commands. No prompt, scan, store-write-before-scan, or
execution path exists.

## Welcome Command Review

`rekon welcome [--json] [--no-banner]` is read-only and side-effect-free: it prints the Scan →
Snapshot → Act lifecycle, the first-run command, the full intent workflow, and the V1 boundaries
("Rekon does not run Circe / execute commands / write source files; intent:go remains deferred"). In
`--json` it emits a structured object with no branding. It performs no I/O beyond stdout.

## Setup Command Review

`rekon setup [--root <path>] [--json] [--no-banner]` detects the workspace state without side
effects and prints a deterministic plan. `not_initialized` / `initialized_without_snapshot` →
recommend `rekon scan`; `snapshot_ready` → recommend `rekon intent context prepare` (+ assess /
publish agents / artifacts). It never prompts, never runs scan, never creates `.rekon/` before scan,
and creates no docs / agent handoff / CI / VerificationPlan. The JSON plan carries `workspace.state`
and a `boundaries` object whose every field is false.

## Output Mode Review

| Mode | V1 Behavior |
| --- | --- |
| human TTY | banner allowed |
| human non-TTY | compact mark / no prompt |
| --json | no banner / no ASCII |
| REKON_NO_BANNER=1 | no banner |
| NO_COLOR=1 | no ANSI color |
| CI | no prompt |

`rekonBrandPrefix` returns the big banner only in an interactive TTY, the compact mark in non-TTY
human output, and nothing under `--json` / `--no-banner` / `REKON_NO_BANNER`. No ANSI color is
emitted in any mode, so `NO_COLOR` holds by construction.

## Help Surface Review

`usage()` lists `rekon welcome [--json] [--no-banner]` and `rekon setup [--root <path>] [--json]
[--no-banner]`, plus a First-run note for each, while keeping `rekon scan` (canonical first-run),
`rekon refresh` (expert / compatibility), and the rich intent workflow. No `intent:go` command is
listed.

## Boundary Review

| Boundary | Decision |
| --- | --- |
| welcome/setup vs scan | setup recommends scan, does not run it |
| setup vs .rekon creation | no .rekon before scan |
| setup vs docs/agents/CI | no generated outputs |
| setup vs VerificationPlan | no proof plan created |
| setup vs Circe | does not run Circe |
| setup vs command execution | no execution |
| setup vs source writes | no source writes |
| setup vs intent:go | deferred |

## Options Considered

| Surface | Status | Safety Finding |
| --- | --- | --- |
| rekon welcome | shipped | explanatory only |
| rekon setup | shipped | deterministic / non-interactive |
| read-only workspace detection | shipped | setup does not create .rekon |
| --json behavior | shipped | no banner / no ASCII |
| REKON_NO_BANNER | shipped | suppresses banner |
| NO_COLOR | shipped | suppresses ANSI color |
| help entries | shipped | welcome/setup discoverable |
| prompts | absent | deferred |

| Option | Decision | Reason |
| --- | --- | --- |
| declare welcome/setup safe/stable | selected | non-actioning UI foundation holds |
| interactive setup prompt decision next | selected | prompts need policy before implementation |
| create-rekon decision next | deferred | initializer should reuse decided prompt model |
| add prompts immediately | rejected | prompt policy not decided |
| postinstall onboarding | rejected | install must stay non-interactive |

## Recommendation

**Rekon Setup / Welcome UI v1 is safe/stable.** No blocker was found: welcome is explanatory and
side-effect-free, setup is deterministic and non-interactive, setup recommends but never runs scan
and never creates `.rekon/` before scan, no docs / agent / CI / VerificationPlan is generated,
`--json` is banner- and ASCII-free, `REKON_NO_BANNER` / `NO_COLOR` are respected, non-TTY does not
prompt, and onboarding implies no command execution, source writes, or Circe run. The recommended
next slice is **Rekon Interactive Setup Prompt Decision** — setup exists but intentionally does not
prompt, so the prompt policy (questions allowed before / after scan, TTY / CI / `--json` / `--yes`,
cancellation, persistence boundaries) is the natural next decision. A **create-rekon /
@rekon/create Decision** is a reasonable alternative but is deferred: the initializer should reuse
the decided-and-tested prompt model.

## What This Does Not Do

This is a strategy / safety review. It changes no runtime behavior; it does not change welcome /
setup behavior, add prompts, add `create-rekon`, add postinstall onboarding, add dependencies,
change scan / refresh, implement `intent:go`, run Circe, execute commands, write source files, bump
versions, or publish. It adds this memo, a docs test, a review packet, and additive doc pointers.

## Follow-Up Work

- **Rekon Interactive Setup Prompt Decision** (recommended next): decide prompt policy before adding
  interactive setup — questions allowed before scan, questions allowed after scan, TTY / CI /
  `--json` / `--yes` behavior, cancellation behavior, and persistence boundaries. Still no prompts
  implemented, no `create-rekon`, no postinstall onboarding, no `intent:go`.
- **create-rekon / @rekon/create Decision** (alternative, deferred): an `npm init`-native
  initializer that reuses the decided prompt / welcome / setup model.

> Decided (slice 120): the prompt policy is now pinned — **Rekon Interactive Setup Prompt Decision**
> selects TTY-only scan-first prompts (`--json` / non-TTY / CI never prompt; `--yes` runs the first
> scan only; no persistence; setup never runs Circe, executes commands, or writes source; `intent:go`
> deferred). Next: Rekon Interactive Setup Prompt Implementation. See
> [Rekon Interactive Setup Prompt Decision](./rekon-interactive-setup-prompt-decision.md).

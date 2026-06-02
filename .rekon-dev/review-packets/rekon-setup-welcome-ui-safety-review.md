# Review Packet — Rekon Setup / Welcome UI Safety Review

## CHANGES MADE

Strategy / safety-review batch. Reviews the shipped Rekon Setup / Welcome UI Implementation
(`00279d4`) end-to-end and finds it safe/stable. New
`docs/strategy/rekon-setup-welcome-ui-safety-review.md`, a 20-assertion docs test, this review
packet, and additive doc pointers + CHANGELOG. No code, CLI, package, or runtime change.

## PUBLIC API CHANGES

None. No CLI command / flag, `package.json` field, dependency, artifact type, version, or runtime
behavior changed. `rekon welcome` / `rekon setup` and the branding helpers are unchanged.

## PURPOSE PRESERVATION CHECK

Original problem: Rekon needed polished setup/welcome UX after `rekon scan` became the canonical
first-run command, and the UI foundation needed to help operators understand the lifecycle without
taking action for them, staying safe before any interactive prompts or `create-rekon` initializer.
Product guarantee re-confirmed by this review: welcome/setup are explanatory, not action-taking;
setup is deterministic and non-interactive; setup recommends scan but does not run it; setup does
not create `.rekon/` before scan; `--json` is machine-safe and banner-free; onboarding implies no
command execution, source writes, Circe execution, or intent:go. The review records the assessment
and changes nothing.

## CODEBASE-INTEL ALIGNMENT

Grounded in the real CLI at `00279d4`: the `welcome` branch (L644), the `setup` branch (L676),
`shouldUseColor` / `shouldShowBanner` / `rekonBrandPrefix`, the hoisted `rekonIntentWorkflow()`,
`detectSetupWorkspaceState` (L449, read-only when `.rekon/` is absent), `buildSetupPlan` (L468), the
`usage()` entries, and the contract test's no-`.rekon`-before-scan assertion (L177).

## IMPLEMENTATION REVIEWED

`welcome` prints the lifecycle / first-run / intent workflow / boundaries (JSON `{ command,
lifecycle, firstRun, intentWorkflow, boundaries }`, banner-free). `setup` detects state read-only
and prints a deterministic plan with all boundary booleans false. Branding helpers gate the banner
by `--json` / `--no-banner` / `REKON_NO_BANNER` / TTY; no ANSI color is emitted. The shared
intent-workflow list is a hoisted function (TDZ-safe because `main()` runs synchronously into the
welcome branch during module load).

## WELCOME COMMAND REVIEW

Read-only and side-effect-free: prints the Scan → Snapshot → Act lifecycle, the first-run command,
the intent workflow, and the boundaries; `--json` emits structured output with no branding. No I/O
beyond stdout; no scan, execution, or source write.

## SETUP COMMAND REVIEW

Deterministic, non-interactive, read-only with respect to `.rekon/` when uninitialized.
`not_initialized` / `initialized_without_snapshot` → recommend `rekon scan`; `snapshot_ready` →
recommend `rekon intent context prepare` (+ assess / publish agents / artifacts). Never prompts,
never runs scan, never creates `.rekon/` before scan, never generates docs / agent handoff / CI /
VerificationPlan. Every JSON boundary boolean is false.

## OUTPUT MODE REVIEW

Big banner only in interactive TTY; compact mark in non-TTY human output; nothing under `--json` /
`--no-banner` / `REKON_NO_BANNER`. No ANSI color in any mode, so `NO_COLOR` holds by construction.
Non-TTY / CI never prompt (no prompt machinery exists this slice).

## HELP SURFACE REVIEW

`usage()` lists both commands plus a First-run note, while keeping `rekon scan` (canonical
first-run), `rekon refresh` (expert / compatibility), and the intent workflow. No `intent:go`
command is listed.

## BOUNDARY REVIEW

welcome/setup vs scan (recommends, does not run); setup vs `.rekon/` creation (none before scan);
setup vs docs/agents/CI (no outputs); setup vs VerificationPlan (none); setup vs Circe (does not
run); setup vs command execution (none); setup vs source writes (none); setup vs intent:go
(deferred).

## RECOMMENDATION

**Rekon Setup / Welcome UI v1 is safe/stable.** No blocker found. Next: **Rekon Interactive Setup
Prompt Decision**. **create-rekon / @rekon/create Decision** is a deferred alternative.

## TESTS / VERIFICATION

New `tests/docs/rekon-setup-welcome-ui-safety-review.test.mjs` (20 assertions: title, 12 headings,
the twelve boundary statements, four tables, CHANGELOG mention, review packet PURPOSE PRESERVATION
CHECK). Full nine-command gate: typecheck, test, build, `git diff --check`, audit-package-exports,
audit-license, publish-dry-run (no publish), install-smoke, install-tarball-smoke. No CLI smoke
(strategy-only batch); the slice-118 32-assertion contract test + CLI smoke stand.

## INTENTIONALLY UNTOUCHED

No change to the welcome / setup branches, branding helpers, `detectSetupWorkspaceState`,
`usage()`, scan / refresh, prompts, `create-rekon`, postinstall, dependencies, `intent:go`, npm
publish, version, or branch.

## RISKS / FOLLOW-UP

- The banner/mark currently surfaces in human output; interactive-TTY rendering is exercised by the
  helper but the test harness is non-TTY (so tests observe the compact-mark path).
- Interactive prompts and `npm init rekon` remain deferred to separate, separately-approved slices.
- Follow-up: **Rekon Interactive Setup Prompt Decision** (recommended); **create-rekon /
  @rekon/create Decision** (deferred alternative).

## NEXT STEP

Rekon Interactive Setup Prompt Decision — decide prompt policy before adding interactive setup
(questions allowed before / after scan, TTY / CI / `--json` / `--yes`, cancellation, persistence
boundaries). Still no prompts, no `create-rekon`, no postinstall onboarding, no `intent:go`.

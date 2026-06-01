# Review Packet — Rekon Setup / Welcome UI Implementation

## CHANGES MADE

Product-capability batch. Implements the non-interactive-safe welcome / setup UI foundation decided
by the Rekon Install / Setup / ASCII Art UX Decision: two new CLI commands (`rekon welcome`, `rekon
setup`), banner/color helpers (`shouldUseColor`, `shouldShowBanner`, `rekonBrandPrefix`,
`renderRekonBanner`, `renderRekonCompactMark`, `renderWelcome`, `buildSetupPlan`,
`detectSetupWorkspaceState`), and `usage()` entries — all in `packages/cli/src/index.ts`. No new
dependency, no prompts, no ASCII art in `--json`, no postinstall behavior.

## PUBLIC API CHANGES

Additive: two new top-level CLI commands, `rekon welcome [--json] [--no-banner]` and `rekon setup
[--root <path>] [--json] [--no-banner]`, plus their `usage()` lines. New exported behavior only via
the CLI; no library export, artifact type, `package.json` field, or version change.

## PURPOSE PRESERVATION CHECK

Original problem: Rekon has the correct first-run verb (`scan`) but a plain setup/welcome surface;
operators need a polished but safe entry point that explains the lifecycle without executing
anything, and branding must not pollute scripts or JSON. Product guarantee delivered: `rekon
welcome` prints a branded lifecycle introduction; `rekon setup` gives a deterministic, prompt-free
setup plan; `--json` is structured and banner-free; `NO_COLOR` / `REKON_NO_BANNER` are respected;
non-TTY does not prompt; no scan / docs / agent / CI / verification action runs; setup never creates
`.rekon/` before the first scan; nothing implies Rekon executes commands, writes source, or runs
Circe; intent:go remains deferred.

## CODEBASE-INTEL ALIGNMENT

Grounded in the real CLI at `24f7e4a`: `main()` dispatch + `writeOutput` (json→stringify,
string→log), the scan branch's `not_initialized` / `initialized_without_snapshot` /
`snapshot_ready` model (reused read-only for setup), `usage()`, and the fact that `@rekon/cli` ships
no postinstall and had no setup/welcome/ASCII surface.

## SOURCE REVIEW

`main()` at L335 calls `parseArgs` then dispatches on `[command, subcommand, positional]`; `json =
Boolean(flags.json)`. The CLI invokes `main(process.argv.slice(2))` near L260, which runs
synchronously into the dispatch — so the shared intent-workflow list is a hoisted function
(`rekonIntentWorkflow()`), not a module `const`, to avoid a temporal-dead-zone error in the
welcome branch (which has no preceding await). The scan branch's `detectSnapshotReady` calls
`store.init()` (which creates `.rekon/`), so setup uses a separate `detectSetupWorkspaceState` that
touches the filesystem only when `.rekon/` already exists.

## WELCOME COMMAND

`rekon welcome [--json] [--no-banner]`. Human: brand prefix (banner / compact mark / none) + the
lifecycle, first-run command, intent workflow, and boundaries. JSON: `{ command: "welcome",
lifecycle: ["scan","snapshot","act"], firstRun: "rekon scan", intentWorkflow: [...8],
boundaries: { runsCirce, executesCommands, writesSourceFiles, implementsIntentGo } }` — all
boundary booleans false, no ASCII art.

## SETUP COMMAND

`rekon setup [--root <path>] [--json] [--no-banner]`. Detects workspace state read-only (no scan, no
`.rekon/` creation when absent), then prints a deterministic plan. `not_initialized` /
`initialized_without_snapshot` recommend `rekon scan`; `snapshot_ready` recommends `rekon intent
context prepare` (+ assess / publish agents / artifacts list). JSON: `{ command: "setup", workspace:
{ state, root }, recommendedNextActions, boundaries }` — every boundary boolean false.

## BANNER / COLOR MODEL

`rekonBrandPrefix`: big banner in interactive TTY, compact mark in non-TTY human output, nothing
under `--json` / `--no-banner` / `REKON_NO_BANNER`. `shouldUseColor` respects `NO_COLOR`; no ANSI
color is emitted in any case. The big banner uses a distinct double-line frame (`╔`); the compact
mark uses `┌─ Rekon`.

## NON-TTY / JSON MODEL

`--json` disables all branding and emits structured output. Non-TTY (CI / piped) shows the compact
mark for human output and never the big banner, and neither command prompts in any mode (no prompts
are implemented this slice at all).

## HELP SURFACE

`usage()` lists `rekon welcome` and `rekon setup` and adds a First-run note for each; it still lists
`rekon scan` (canonical first-run), `rekon refresh` (expert / compatibility), and the rich intent
workflow. No `intent:go` command is listed.

## BOUNDARY MODEL

No prompts; no scan; no `.rekon/` creation before scan; no docs / agent / CI / verification
generation; no command execution; no source writes; no Circe run; no postinstall; no `create-rekon`;
no dependency; intent:go deferred.

## TESTS / VERIFICATION

New `tests/contract/cli-welcome-setup.test.mjs` (32 assertions: welcome exit/human/JSON/boundaries,
banner + `REKON_NO_BANNER` + `NO_COLOR` gating, setup state detection / recommendations / boundary
booleans / no-`.rekon`-before-scan, help lists welcome+setup, no intent:go). New
`tests/docs/rekon-setup-welcome-ui.test.mjs` (12 assertions). Full nine-command gate + CLI smoke
(welcome / welcome --json / REKON_NO_BANNER / NO_COLOR / setup --json / help greps).

## INTENTIONALLY UNTOUCHED

No change to scan / refresh / init behavior, no prompts, no ASCII art beyond the welcome/setup
banner/mark, no `@inquirer/prompts` / figlet, no `create-rekon`, no postinstall, no `package.json`
metadata, no `intent:go`, no version bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

- The banner/mark currently shows only in non-`--json` human output; interactive-TTY rendering is
  exercised by the helper but the test harness is non-TTY (so the compact-mark path is what tests
  observe).
- Interactive prompts and `npm init rekon` remain deferred to separate, separately-approved slices.
- Follow-up: **Rekon Setup / Welcome UI Safety Review**.

## NEXT STEP

Rekon Setup / Welcome UI Safety Review — review welcome/setup before adding interactive prompts or
`create-rekon`. Still no prompts, no `create-rekon`, no postinstall onboarding, no `intent:go`.

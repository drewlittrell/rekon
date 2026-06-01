# Review Packet — CLI Intent Help Surface Alignment

## CHANGES MADE

Product-polish batch. Top-level `rekon help` (the `usage()` string in
`packages/cli/src/index.ts`) now lists the six shipped rich intent commands, states the
canonical intent flow, and restates the Rekon → Circe boundary. The only source change is
the `usage()` string; one new contract test asserts the surface. Docs updated: README,
CHANGELOG, `docs/strategy/roadmap.md`, `docs/strategy/classic-behavior-roadmap.md`, and the
slice-103 memo (help-gap section marked resolved). This resolves the stale-help
discoverability gap recorded by the slice-103 re-review at `2cb5bdc`.

## PUBLIC API CHANGES

None to command behavior, flags, artifacts, or exit codes. The only observable change is
additional lines in `rekon help` / `rekon --help` / no-arg usage output. No new command;
`intent go` is **not** added or listed.

## PURPOSE PRESERVATION CHECK

Original problem: the rich intent workflow works directly and the Rekon → Circe execution
proof passed, but operators could not discover the workflow from top-level help; for
V1/operator-ready release, help must expose the canonical non-executing
prepare/prove/package/export path. Product guarantee preserved: CLI help now accurately
lists the shipped commands, clearly distinguishes preparation/export from execution (the
boundary note), does not imply `intent:go` exists, and does not imply Rekon executes
commands or writes source. The six commands' behavior is unchanged — this is a help
surface only.

## CODEBASE-INTEL ALIGNMENT

The six usage lines were transcribed from the real per-command usage comments and flag
parsing in `packages/cli/src/index.ts` (assess @3728, prepare @3898, status @4067,
work-order generate @4197, verification-plan generate @4336, bundle write @4482), not
inferred from filenames. The dispatch confirms `intent go` has no branch — `intent:go`
appears only in deferral comments. Help is rendered by `usage()` (@9915) and dispatched at
the `!command || command === "help" || flags.help` branch (@288), which returns normally
(exit 0).

## HELP SURFACE REVIEW

`usage()` returns an array of command lines joined by `\n`. The six rich intent commands
are inserted ahead of the legacy `intent work-order --path --goal` / `intent remediation`
lines (both retained). A trailing note block adds the `Intent flow:` line, the Circe
handoff line, and the two boundary lines. `writeOutput(usage(), json)` prints the plain
string for `rekon help`; the unknown-command path (`throw "Unknown command"`) is separate
and does not carry the note.

## INTENT FLOW DOCUMENTED

Help states: `intent assess → intent prepare → intent status → intent work-order generate
→ intent verification-plan generate → intent bundle write`, then
`The bundle can then be handed to Circe via: circe rekon-handoff validate/routes/import.`
The six full usage lines (with flags) are also listed individually for direct
discoverability.

## BOUNDARY MODEL

Help restates: `Rekon prepares, proves, packages, and exports; Circe imports and
orchestrates.` and `Rekon does not run Circe, does not execute commands, and does not write
source files, and does not implement intent:go.` These exact substrings are asserted by the
contract test. `intent:go` is named only as deferred; `intent go` (a shipped command) is
asserted absent.

## TESTS / VERIFICATION

New `tests/contract/cli-intent-help-surface.test.mjs` (12 assertions, spawns the built CLI
`help`): exit 0; each of the six commands present; the Circe handoff
(`validate/routes/import`) note present; the three boundary statements present; `intent go`
absent. CLI smoke: the WO's six positive greps + the `intent go` negative all pass against
the live build. Full gate: typecheck, test (full suite), build, `git diff --check`,
audit-package-exports, audit-license, publish-dry-run, install-smoke,
install-tarball-smoke.

## INTENTIONALLY UNTOUCHED

No command behavior, no new command, no `intent:go`, no Circe execution, no command
execution, no source writes outside the help string + test + docs, no artifact schema
change, no version bump, no publish, no branch. Legacy intent help lines retained.

## RISKS / FOLLOW-UP

- Low risk: a help string + a help-asserting contract test. If the boundary wording is
  later reworded, the 12 substring assertions must be kept in sync.
- The note rides in the same flat command list as the usage lines; if the help surface is
  later restructured into grouped sections, the note placement should move with it.

## NEXT STEP

V1 Readiness / Release Review — decide whether the non-executing Rekon → Circe plan handoff
is ready to call V1 (Rekon prepares/proves/packages/exports; Circe imports/orchestrates;
no `intent:go`, no Rekon-side VerificationRun generation, no source writes).

# Review Packet — Rekon First-Run Scan Safety Review

## CHANGES MADE

Strategy / safety-review batch. Reviews the shipped `rekon scan` implementation
(`4041390`) end-to-end and finds it safe/stable as the canonical first-run command. New
`docs/strategy/rekon-first-run-scan-safety-review.md`, a 19-assertion docs test, this review
packet, and additive doc pointers + CHANGELOG. No code, CLI, package, or runtime change.

## PUBLIC API CHANGES

None. No code, CLI command, flag, artifact type, `package.json`, version, or runtime behavior
changed. `rekon scan` and `rekon refresh` are unchanged.

## PURPOSE PRESERVATION CHECK

Original problem: new users needed a first-run command, and `refresh` was semantically wrong
before the first repository scan; `rekon scan` now creates the first repository intelligence
substrate and keeps `refresh` as an expert/compatibility term; before install/setup/ASCII
polish, Rekon must confirm scan is safe as the first public onboarding verb. Product guarantee
re-confirmed by this review against the shipped code + tests: scan is safe before and after
`.rekon/` exists; scan creates operational state only under `.rekon/`; scan does not generate
docs / agent handoff / CI / verification before scan; scan executes no user commands and writes
no source files; scan does not implement `intent:go`; `scan --json` emits no ASCII art. The
review records the assessment and changes nothing.

## CODEBASE-INTEL ALIGNMENT

Grounded in the shipped scan dispatch branch in `packages/cli/src/index.ts` (workspace-state
detection via `access` before init; `runRefresh(root, {})`; snapshot re-check; seven boundary
booleans; human + JSON output; non-zero exit on failed refresh), the reused self-initializing
`runRefresh` pipeline, `writeConfigIfMissing`, the 25-assertion contract test
(`cli-scan-first-run.test.mjs`), and the slice-111 CLI smoke evidence.

## COMMAND REVIEWED

`rekon scan [--root <path>] [--json]` — detects state, runs the full `runRefresh` substrate
pipeline (no skips), re-checks the snapshot, and reports state + artifact count + next actions +
boundaries; exits non-zero on a failed refresh, mirroring `refresh`.

## WORKSPACE STATE REVIEW

`not_initialized` (no `.rekon/`) → initialize + build; `initialized_without_snapshot` → build;
`snapshot_ready` → update. `stateBefore` is detected with `access` before any init, so the
not-initialized detection is side-effect-free; `stateAfter` re-checks the snapshot.

## FIRST-RUN BEHAVIOR REVIEW

On a clean repo, scan creates `.rekon/` + default config, runs the pipeline, and builds the
first substrate; JSON reports `command: "scan"`, `stateBefore: not_initialized`, `stateAfter:
snapshot_ready`, `initialized: true`, `snapshot.ready: true`, non-zero artifacts, three
nextActions, all boundaries false; human output: `Rekon scan` / `Workspace: initialized` /
`First scan complete.` + next actions + boundary statement. Verified by contract test + smoke.

## REPEAT-SCAN BEHAVIOR REVIEW

A repeat scan succeeds with `stateBefore: snapshot_ready`, `initialized: false`, and an intact
(non-destructive) config; human output: `Workspace: existing` / `Scan complete.`. The existing
`refresh-command` test also proves a repeat refresh on a fresh repo passes.

## HELP SURFACE REVIEW

`rekon help` lists `rekon scan` first, still lists `rekon refresh`, and frames `refresh` as the
expert / compatibility update command (the same lifecycle pipeline scan shares). `refresh` is
not removed.

## CONFIG NORMALIZATION REVIEW

After a one-shot fresh scan, `config.capabilities` is normalized to `[]` (= "use default
capabilities"); `init` alone enumerates the ten defaults. Existing refresh behavior, surfaced
(not introduced) by scan; the repeat path works with it. **Acceptable for v1.** A representation
cleanup across init/refresh is an optional, separate refresh concern, not a blocker.

## BOUNDARY REVIEW

scan vs refresh (first-run vs expert/compat), scan vs docs/agent/CI/verification (none before
scan), scan vs command execution (none), scan vs source writes (none — only `.rekon/`), scan
vs intent:go (deferred). `scan --json` emits no ASCII art. All boundary statements affirmed.

## RECOMMENDATION

**Rekon scan v1 is safe/stable as the canonical first-run command.** No blocker found. Next:
**Rekon Install / Setup / ASCII Art UX Decision** — banner/compact branding, ASCII resources,
interactive setup posture, `create-rekon` decision, non-TTY / `--json` / `NO_COLOR` rules,
post-scan copy. More dogfood is a cautious alternative but not required (contract + smoke cover
v1); dogfood can continue in parallel.

## TESTS / VERIFICATION

New `tests/docs/rekon-first-run-scan-safety-review.test.mjs` (19 assertions: title, 13
headings, the eleven boundary statements, four tables, CHANGELOG mention, review packet PURPOSE
PRESERVATION CHECK). Full nine-command gate: typecheck, test, build, `git diff --check`,
audit-package-exports, audit-license, publish-dry-run (no publish), install-smoke,
install-tarball-smoke. No CLI smoke (strategy-only batch).

## INTENTIONALLY UNTOUCHED

No scan/refresh behavior change, no setup wizard, no prompts, no ASCII art, no `create-rekon`,
no package version edit, no npm publish, no `intent:go`, no command execution beyond the gates,
no source writes outside this memo, its docs test, this review packet, and additive doc
pointers, no branch.

## RISKS / FOLLOW-UP

- The config.capabilities normalization (`[]` = defaults) is existing refresh behavior; if a
  future operator inspects the on-disk config and expects the enumerated init defaults, the
  representation differs. Functionally equivalent; a consistency cleanup is an optional refresh
  follow-up.
- This review asserts safety from contract + smoke evidence; broader real-repo dogfood remains
  available in parallel and does not block the next UX-decision slice.

## NEXT STEP

Rekon Install / Setup / ASCII Art UX Decision — decide the polished install / first-run setup
UX. Still no setup implementation, no ASCII art implementation, no prompts before scan, no
`intent:go`.

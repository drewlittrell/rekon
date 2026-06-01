# Review Packet — Rekon First-Run Scan Implementation

## CHANGES MADE

Product-capability batch. Implements `rekon scan [--root <path>] [--json]` as the canonical
first-run command (Rekon First-Run Scan / Install Onboarding Decision, `2524df6`). scan is a
thin wrapper over the existing `runRefresh` substrate pipeline: it initializes `.rekon/` if
needed (runRefresh's first step), runs the scan, and reports the workspace state, artifact
count, post-scan next actions, and boundary booleans. Adds a contract test (25 assertions), a
docs test (9 assertions), this review packet, top-level help, and doc updates. `refresh` is
unchanged and retained as the expert / compatibility verb.

## PUBLIC API CHANGES

New CLI command `rekon scan [--root <path>] [--json]`. New top-level help lines (a `rekon
scan` entry plus a "First run:" note describing scan vs refresh vs init). No artifact type,
schema, `package.json`, version, or runtime-library change. `rekon init` and `rekon refresh`
behavior is unchanged.

## PURPOSE PRESERVATION CHECK

Original problem: new users should not have to understand `refresh`, which is semantically
wrong before a first scan exists; Rekon needs a public first-run command that initializes if
needed and creates the first intelligence substrate. Product guarantee preserved and proven by
tests: `rekon scan` is safe to run in a repo with no `.rekon/` (it initializes), safe to run
again after the first scan, and produces the same substrate `rekon refresh` produces (it calls
the same `runRefresh`). scan does not prompt or offer docs/agent/CI/verification generation
before the first scan, `scan --json` emits no ASCII art or interactive text, and scan does not
imply command execution or source writes (it writes only `.rekon/` operational state +
`.rekon/artifacts/`). `refresh` remains available as the expert / compatibility verb.

## CODEBASE-INTEL ALIGNMENT

Grounded in the real CLI at `2524df6`: `runRefresh` (the `rekon refresh` implementation)
self-initializes in its first step (`createLocalArtifactStore(root).init()` +
`writeConfigIfMissing(root)` when config is missing), so it already works before `.rekon/`
exists. scan reuses it verbatim and adds only workspace-state detection + scan-flavored
reporting. The `refresh-command` contract test already proves a repeat refresh on a fresh repo
(the scan scenario) passes, so the shared pipeline is exercised.

## CURRENT INIT / REFRESH BEHAVIOR

Recorded as required. `rekon init` runs `store.init()` + `writeConfigIfMissing(root)` only: it
writes a default `.rekon/config.json` enumerating the default capability packages
(`DEFAULT_CAPABILITIES`, ten `@rekon/capability-*` entries) and stops — it does not scan or
build a snapshot. `rekon refresh` (= `runRefresh`) runs the full lifecycle (init → config
validate → observe → project → snapshot → evaluate → findings.* → issues.adjudicate →
coherency.delta → publish.architecture → artifacts.validate → artifacts.freshness).

**Observed (unexpected-at-first) behavior, recorded:** after a one-shot run on a fresh repo
(the scan / first-`refresh` scenario), `config.capabilities` is normalized to `[]`, whereas
`init` alone leaves the enumerated ten. An empty `capabilities` array means "use the default
capabilities" — the existing `refresh-command` test confirms a repeat refresh on a fresh repo
still passes with the empty-capabilities config and produces all expected artifact families.
This is existing refresh-pipeline behavior, surfaced (not introduced) by scan; scan changes no
refresh semantics. The "default posture" (default capabilities) is therefore the same for init
and scan; only the representation differs (enumerated vs empty = defaults).

## SCAN COMMAND MODEL

`rekon scan [--root <path>] [--json]` (recommended v1 flag set; no extra flags invented). It
detects `stateBefore`, runs `runRefresh(root, {})` (full pipeline, no skips), detects
`stateAfter` + `snapshot.ready`, and reports. On `refresh.status === "failed"` it sets exit
code 1 (mirroring `refresh`).

## WORKSPACE STATE MODEL

```
type RekonWorkspaceState = "not_initialized" | "initialized_without_snapshot" | "snapshot_ready";
```

Detection: `not_initialized` when `.rekon/` is absent (checked with `access` BEFORE any
init, so detection never creates the directory); otherwise the store is listed for
`IntelligenceSnapshot` — present ⇒ `snapshot_ready`, absent ⇒ `initialized_without_snapshot`.
`stateAfter` re-checks the snapshot after the scan.

## FIRST-RUN BEHAVIOR

On a repo with no `.rekon/`: scan creates `.rekon/` + default config (via runRefresh's init
step), runs the scan, and builds the first substrate. JSON reports `command: "scan"`,
`workspace.stateBefore: "not_initialized"`, `workspace.stateAfter: "snapshot_ready"`,
`workspace.initialized: true`, `snapshot.ready: true`, `summary.artifacts: <n>`, the three
`nextActions`, and all seven `boundaries` false. Human output says `Workspace: initialized`
and `First scan complete.` plus the next actions and the boundary statement.

## REPEAT-SCAN BEHAVIOR

Running scan again succeeds, reports `stateBefore: "snapshot_ready"` and `initialized: false`,
and does not recreate config destructively (runRefresh only calls `writeConfigIfMissing` when
config is absent; an existing config is left intact — verified byte-for-byte across a repeat
scan). Human output says `Workspace: existing` and `Scan complete.`.

## HELP SURFACE

`usage()` now lists `rekon scan [--root <path>] [--json]` as the first command (before `init`
/ `refresh`) and adds a "First run:" note: scan = canonical first-run; `refresh` = expert /
compatibility update command (the same lifecycle pipeline scan shares); `init` = create
`.rekon/` + config only. `refresh` is not removed.

## BOUNDARY MODEL

`scan --json` includes a `boundaries` object with seven booleans, all false: `createdDocs`,
`createdAgentHandoff`, `createdCi`, `createdVerificationPlan`, `executedCommands`,
`wroteSourceFiles`, `implementedIntentGo`. scan builds the intelligence substrate only; it
does not perform the post-scan "act" surfaces, execute user/verification commands, write
source files (only `.rekon/`), or implement `intent:go`. No ASCII art appears in `--json`.
(The architecture-summary Publication the refresh pipeline always produces is part of the
substrate under `.rekon/artifacts/`, not an onboarding docs-generation action.)

## TESTS / VERIFICATION

New `tests/contract/cli-scan-first-run.test.mjs` (25 assertions: first-run init + substrate +
state + boundaries, config default posture vs init, repeat scan + non-destructive config,
human output, help lists scan + refresh-as-expert, no ASCII art in `--json`). New
`tests/docs/rekon-scan-first-run.test.mjs` (9 assertions). Full nine-command gate + the scan
CLI smoke (first scan initializes + builds substrate, `artifacts validate` clean, repeat scan
succeeds, help lists scan + refresh).

## INTENTIONALLY UNTOUCHED

No interactive setup wizard, no prompts, no ASCII art, no `create-rekon`, no npm publish, no
version bump, no `intent:go`, no change to `refresh` / `init` semantics (scan only shares the
existing `runRefresh` helper), no new artifact type, no source writes outside `.rekon/`
operational state, no branch.

## RISKS / FOLLOW-UP

- The shared refresh pipeline normalizes `config.capabilities` to `[]` (= defaults) on a
  one-shot fresh scan; this is existing, functional behavior (documented above), not a scan
  regression. A future cleanup could make init/refresh config representation consistent, but
  that is a refresh concern, out of scope here.
- scan runs the full pipeline; on a malformed config it reports `status: "failed"` and exits
  non-zero, exactly like `refresh`.

## NEXT STEP

Rekon First-Run Scan Safety Review — review `rekon scan` before any interactive setup /
ASCII-art install polish. Still no prompts, no ASCII art, no source writes, no `intent:go`.

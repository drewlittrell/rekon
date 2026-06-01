# Rekon First-Run Scan Safety Review

## Decision Summary

`rekon scan` (shipped in Rekon First-Run Scan Implementation, `4041390`) is reviewed
end-to-end and found **safe and stable as the canonical first-run command**. It initializes
`.rekon/` when needed, creates the first repository intelligence substrate by reusing the
existing self-initializing `runRefresh` pipeline, works repeatedly after a snapshot exists,
preserves `refresh` as the expert / compatibility verb, and offers no docs / agent / CI /
verification generation before the first scan. **`rekon scan` is the canonical first-run
command.** **`rekon scan` does not execute commands or write source files.** **`rekon scan`
does not implement intent:go.** This review changes no behavior; it records the assessment and
recommends the install / setup / ASCII-art UX decision as the next slice.

The fifteen review questions, answered:

1. **Is `rekon scan` safe/stable as canonical first-run?** Yes — the first-run and repeat
   paths are covered by a 25-assertion contract test and the slice-111 CLI smoke, both green.
2. **Does scan work before `.rekon/` exists?** Yes. **`rekon scan` works before `.rekon/`
   exists** — `runRefresh`'s first step creates `.rekon/` + default config when missing; the
   first run reports `stateBefore: not_initialized` → `stateAfter: snapshot_ready`.
3. **Does scan initialize the workspace safely?** Yes — it reuses `store.init()` +
   `writeConfigIfMissing` (idempotent); state detection checks `.rekon/` with `access` **before**
   any init, so detection never prematurely creates the directory.
4. **Does scan create the first repository intelligence substrate?** Yes. **`rekon scan`
   creates the first repository intelligence substrate** — the full pipeline runs and
   `snapshot.ready` is `true` with a non-zero artifact count.
5. **Does scan work repeatedly after snapshot exists?** Yes. **`rekon scan` works repeatedly
   after the first scan** — a repeat scan reports `stateBefore: snapshot_ready`,
   `initialized: false`, and leaves an existing config intact (non-destructive).
6. **Does scan preserve refresh as expert/compatibility behavior?** Yes. **`refresh` remains an
   expert or compatibility term, not the first-run UX** — `refresh` is unchanged and shares the
   same `runRefresh` pipeline; scan changes no refresh semantics.
7. **Does scan avoid docs / agent / CI / verification prompts before first scan?** Yes.
   **Docs generation is not offered before the first scan. Agent handoff generation is not
   offered before the first scan. Verification planning is not offered before the first scan.**
   scan builds the intelligence substrate only; all boundary booleans are false.
8. **Does scan write only `.rekon/` operational state?** Yes — it writes `.rekon/` operational
   state and `.rekon/artifacts/` (canonical truth); no source files.
9. **Does scan execute no user commands?** Yes — it runs only Rekon's internal analysis
   pipeline; it executes no user / verification commands. `executedCommands` is false.
10. **Does scan write no source files?** Yes — `wroteSourceFiles` is false.
11. **Does `scan --json` avoid ASCII art?** Yes. **`rekon scan --json` emits no ASCII art** —
    output is pure `JSON.stringify`; the contract test asserts no box-drawing characters and a
    pure-JSON payload.
12. **Is the config.capabilities normalization acceptable for v1?** Yes — see the config
    normalization review. `[]` means "use default capabilities"; this is existing refresh
    behavior, surfaced (not introduced) by scan, and the repeat path works with it. Acceptable
    for v1; a representation cleanup is an optional later refresh concern.
13. **Should install/setup/ASCII polish begin next?** Yes — the first-run lifecycle is correct,
    so the next product layer is the polished install / setup / branding UX **decision**.
14. **Or should more scan dogfood happen first?** Deferred — contract coverage + CLI smoke
    cover v1 behavior; dogfood can continue in parallel and does not block the UX decision.
15. **What implementation / strategy slice follows?** Rekon Install / Setup / ASCII Art UX
    Decision.

## Why This Review Exists

New users needed a first-run command, and `refresh` was semantically wrong before the first
repository scan. `rekon scan` now creates the first repository intelligence substrate and keeps
`refresh` as an expert / compatibility term. Before moving into install polish / ASCII / setup
UX, Rekon must confirm scan is safe as the first public onboarding verb. This review provides
that confirmation against the real shipped implementation and its tests, and pins the boundary
so the next (UX-decision) slice can act on a settled, safe first-run command.

## Command Reviewed

`rekon scan [--root <path>] [--json]` — the canonical first-run command. Its dispatch branch
detects the workspace state, runs `runRefresh(root, {})` (the full substrate pipeline, no
skips), re-checks the snapshot, and reports the state, artifact count, post-scan next actions,
and seven boundary booleans. On a failed refresh it exits non-zero, mirroring `refresh`. The
reused `runRefresh` self-initializes (`store.init()` + `writeConfigIfMissing` when config is
missing) before running observe → project → snapshot → … → artifacts.freshness.

## Workspace State Review

| State | V1 Behavior |
| --- | --- |
| not_initialized | scan initializes and builds substrate |
| initialized_without_snapshot | scan builds substrate |
| snapshot_ready | scan updates substrate |

`stateBefore` is detected before any init: `.rekon/` absent ⇒ `not_initialized`; otherwise the
store is listed for `IntelligenceSnapshot` (present ⇒ `snapshot_ready`, else
`initialized_without_snapshot`). `stateAfter` re-checks the snapshot after the scan. The
detection is side-effect-free for the not-initialized case (it never creates `.rekon/` just to
look).

## First-Run Behavior Review

On a repo with no `.rekon/`: scan creates `.rekon/` + default config, runs the pipeline, and
builds the first substrate. JSON reports `command: "scan"`, `workspace.stateBefore:
"not_initialized"`, `workspace.stateAfter: "snapshot_ready"`, `workspace.initialized: true`,
`snapshot.ready: true`, a non-zero `summary.artifacts`, the three `nextActions`, and all seven
`boundaries` false. Human output shows `Rekon scan`, `Workspace: initialized`, `First scan
complete.`, the next actions, and the boundary statement. Verified by the contract test and the
slice-111 CLI smoke (first scan initialized + built substrate; `artifacts validate` clean).

## Repeat-Scan Behavior Review

Running scan again succeeds, reports `stateBefore: "snapshot_ready"` and `initialized: false`,
and does not recreate config destructively (`writeConfigIfMissing` only writes when config is
absent; an existing config is left byte-for-byte intact, verified by the contract test). Human
output shows `Workspace: existing` and `Scan complete.`. The existing `refresh-command` test
also proves a repeat refresh on a fresh repo (the scan scenario) passes.

## Help Surface Review

Top-level `rekon help` lists `rekon scan [--root <path>] [--json]` first, still lists `rekon
refresh [...]`, and frames `refresh` in the "First run:" note as the **expert / compatibility
update command** (the same lifecycle pipeline scan shares). `init` is described as
workspace-and-config only. `refresh` is not removed.

## Config Normalization Review

Recorded in slice 111 and re-affirmed here: after a one-shot fresh scan, `config.capabilities`
is normalized to `[]`, whereas `init` alone enumerates the ten defaults. An empty `capabilities`
array means **"use default capabilities"** — this is existing refresh-pipeline behavior,
surfaced (not introduced) by scan, and a repeat scan / refresh works correctly with it (the
`refresh-command` test confirms). The "default posture" is therefore the same for init and
scan; only the on-disk representation differs. **This is acceptable for v1.** Making the
representation consistent across init/refresh is an optional, separate refresh cleanup, not a
scan change and not a blocker.

## Boundary Review

| Boundary | Decision |
| --- | --- |
| scan vs refresh | scan is first-run; refresh is expert/compatibility |
| scan vs docs generation | no docs generated before scan |
| scan vs agent handoff | no agent handoff before scan |
| scan vs verification planning | no VerificationPlan created |
| scan vs command execution | no user command execution |
| scan vs source writes | no source writes |
| scan vs intent:go | deferred |

Boundary statements affirmed by this review:

- **`rekon scan` is the canonical first-run command.**
- **`rekon scan` works before `.rekon/` exists.**
- **`rekon scan` creates the first repository intelligence substrate.**
- **`rekon scan` works repeatedly after the first scan.**
- **`refresh` remains an expert or compatibility term, not the first-run UX.**
- **Docs generation is not offered before the first scan.**
- **Agent handoff generation is not offered before the first scan.**
- **Verification planning is not offered before the first scan.**
- **`rekon scan --json` emits no ASCII art.**
- **`rekon scan` does not execute commands or write source files.**
- **`rekon scan` does not implement intent:go.**

## Options Considered

| Surface | Status | Boundary |
| --- | --- | --- |
| rekon scan | shipped | canonical first-run command |
| runRefresh reuse | shipped | existing substrate pipeline |
| .rekon initialization | shipped | operational state only |
| JSON output | shipped | no ASCII / structured state |
| human output | shipped | next actions after scan |
| refresh | retained | expert / compatibility update command |
| intent:go | deferred | no execution |

| Option | Decision | Reason |
| --- | --- | --- |
| declare scan safe/stable | selected | first-run and repeat paths pass |
| install/setup/ASCII UX decision next | selected | first-run substrate now exists |
| more scan dogfood first | deferred | contract + smoke cover v1 behavior |
| make refresh first-run again | rejected | confusing before first scan |
| interactive setup next without decision | rejected | UX policy should be decided first |

## Recommendation

**Rekon scan v1 is safe/stable as the canonical first-run command.** No blocker was found:
the first-run path (initialize + build substrate) and the repeat path (update substrate,
non-destructive config) both pass; `refresh` is preserved as expert / compatibility; the
JSON / ASCII and execution / source-write boundaries hold; and the config.capabilities
normalization is acceptable for v1. The recommended next slice is the **Rekon Install / Setup /
ASCII Art UX Decision** — banner vs compact mark, ASCII resources, interactive setup posture,
the `create-rekon` package decision, non-TTY / `--json` / `NO_COLOR` rules, and post-scan
copy — because scan now reliably creates the substrate before any dependent output is offered.
More scan dogfood is a reasonable cautious alternative but is not required to proceed, since
scan has contract coverage and CLI smoke; dogfood can continue in parallel.

## What This Does Not Do

This is a strategy / safety review. It changes no runtime behavior; it does not change scan or
refresh, implement a setup wizard, add prompts, add ASCII art, add `create-rekon`, bump
versions, publish to npm, implement `intent:go`, execute commands beyond the verification
gates, or write source files outside this memo, its docs test, the review packet, and additive
doc pointers.

## Follow-Up Work

- **Rekon Install / Setup / ASCII Art UX Decision** (recommended next): decide the polished
  install / first-run setup UX — banner vs compact mark, ASCII resources, interactive setup
  posture, `create-rekon` package decision, non-TTY / `--json` / `NO_COLOR` rules, and
  post-scan next-action copy. Still no setup implementation, no ASCII art implementation, no
  prompts before scan, no `intent:go`.
- Optional: continue scan dogfood against real repos (does not block the UX decision).
- Optional, later (a refresh concern, not scan): make the init/refresh `config.capabilities`
  on-disk representation consistent.
- **Fresh Repo Intent Readiness** (shipped slice 113, reviewed slice 114): the fresh-repo
  intent-preparation gap downstream of `rekon scan` was closed with `rekon intent context
  prepare` and reviewed safe/stable; `rekon scan` itself is unchanged by that work. See
  [Fresh Repo Intent Readiness Safety Review](./fresh-repo-intent-readiness-safety-review.md).
- **Rekon Install / Setup / ASCII Art UX Decision** (decided slice 117): the recommended-next
  install / setup polish is now decided — staged install/setup polish, scan-first, non-interactive
  install, no ASCII in `--json`, `intent:go` still deferred. `rekon scan` remains the documented
  first-run command. See
  [Rekon Install / Setup / ASCII Art UX Decision](./rekon-install-setup-ascii-ux-decision.md).

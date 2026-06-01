# Review Packet — Rekon Install / Setup / ASCII Art UX Decision

## CHANGES MADE

Strategy / product UX decision batch. Decides the polished V1 install + first-run setup + ASCII /
branding experience and selects **Option B — staged install/setup polish** (decide now, implement
later in non-interactive-safe slices). New
`docs/strategy/rekon-install-setup-ascii-ux-decision.md`, a 20-assertion docs test, this review
packet, and additive doc pointers + CHANGELOG. No code, CLI, package, or runtime change; no
dependency added.

## PUBLIC API CHANGES

None. No CLI command / flag, `package.json` field, dependency, postinstall script, artifact type,
version, or runtime behavior changed. The decision defines a future `rekon setup` / `rekon welcome`
surface and a future `npm init rekon` initializer but implements none of them.

## PURPOSE PRESERVATION CHECK

Original problem: Rekon is at a V1-ready product boundary, but the install / first-run experience is
not yet polished. `rekon scan` fixed the first-run verb; fresh-repo intent readiness and phase-level
verification are safety-reviewed. The next operator-readiness layer is install / setup UX. Product
guarantee preserved: the install path starts with a safe first scan; setup prompts are never shown
before scan-dependent outputs are possible; ASCII art is limited, optional, and disabled in
machine-readable modes; onboarding never implies Rekon executes commands, writes source, runs Circe,
or implements `intent:go`. The decision records the model and changes nothing.

## CODEBASE-INTEL ALIGNMENT

Grounded in the actual repo at `648fef3`: `@rekon/cli` (`bin.rekon = ./dist/index.js`, `files:
["dist"]`, no `postinstall` / `engines` / `keywords` / `repository`), the CLI dispatch
(`packages/cli/src/index.ts`) exposing `init` / `scan` / `refresh` with no `setup` / `welcome` /
`doctor` / `demo` / `banner` command and no ASCII / `NO_COLOR` / `REKON_NO_BANNER` / TTY handling,
and the prior scan-first onboarding decision + safety reviews.

## CURRENT INSTALL SURFACE

`@rekon/cli` v1.0.0; `bin.rekon → ./dist/index.js`; `files: ["dist"]`. No postinstall / preinstall /
prepublish script in any workspace package — `npm install` runs nothing beyond fetching files, so
install is already non-interactive and safe. No `engines` / `keywords` / `repository` field (optional
metadata-polish candidates for later, not this slice). Root `rekon` is private, not published.

## CURRENT FIRST-RUN SURFACE

CLI exposes `init` / `scan` / `refresh`; `rekon scan` is the canonical first-run verb; `rekon
refresh` is the expert / compatibility update verb. No `setup` / `welcome` / `doctor` / `demo` /
`banner` command and no ASCII / banner / TTY-gating code yet — a clean slate. Fresh-repo intent
context is prepared explicitly via `rekon intent context prepare`.

## OPTIONS CONSIDERED

A (minimal install docs only): rejected/deferred — safe but not polished. **B (staged install/setup
polish): selected — design first, implement safely.** C (immediate interactive setup): rejected —
needs explicit prompt policy. D (ASCII-heavy CLI): rejected — noisy and unsafe for machine output. E
(postinstall onboarding): rejected — install should be non-interactive. F (create-rekon first):
rejected/deferred — initializer should reuse the decided setup UX.

## INSTALL MODEL

Primary: `npm install -D @rekon/cli` then `npx rekon scan`. Global supported: `npm install -g
@rekon/cli` then `rekon scan`. Future: `npm init rekon`. Postinstall: rejected. Install must not run
onboarding; install docs must not tell users to run `refresh` first; `rekon scan` stays the first
useful command.

## SETUP MODEL

A future, explicit, optional `rekon setup` command — decided here, not implemented. Before scan it
may ask only "Run the first scan now?"; after scan it offers post-scan next actions; in non-TTY it
prompts nothing; in `--json` it prints no prompt and no banner. Setup never implies command
execution, source writes, `intent:go`, or Circe execution by Rekon.

## FIRST-RUN PROMPT MODEL

Before the first scan, setup may ask only "Run the first scan now?" and must not offer docs / agent
context / CI / verification plan / architecture publish / Circe. First-run setup starts with scan;
non-TTY setup does not prompt.

## POST-SCAN PROMPT MODEL

After a successful scan (`snapshot_ready`), setup may offer: prepare an intent / plan handoff,
generate agent context, publish an architecture summary, inspect artifacts, add package scripts, add
a CI dry-run workflow, or exit. These present existing post-scan next actions; setup performs no
execution of its own.

## ASCII ART AND BRANDING MODEL

Big ASCII wordmark only in first-run / welcome / setup; everyday commands use a compact mark or no
branding. No ASCII art in `--json`; no banner by default in non-TTY / CI; `NO_COLOR` and
`REKON_NO_BANNER` respected. Recommended brand line `REKON` / `Scan → Snapshot → Act` and a compact
framed mark; art is not implemented this slice.

## RESOURCE PLAN

Candidates only (no dependency added): figlet (wordmark candidates), picocolors (color), string-width
(Unicode alignment), @inquirer/prompts (future setup), node:readline/promises (zero-dependency
fallback), boxen / hand-rolled boxes (framed output), supports-color / TTY checks (gating). Prefer
the zero-dependency `node:readline/promises` + hand-rolled output path when implementing.

## BOUNDARY MODEL

Install must not run onboarding automatically; first-run setup must start with scan; docs / agent /
verification options are not offered before the first scan; ASCII art must never appear in `--json`
output; non-TTY setup must not prompt; onboarding must not imply Rekon executes commands or writes
source files; onboarding must not imply Rekon runs Circe; `intent:go` remains deferred.

## TESTS / VERIFICATION

New `tests/docs/rekon-install-setup-ascii-ux-decision.test.mjs` (20 assertions: title, 15 headings,
Option B selection, the ten boundary statements, five tables, CHANGELOG mention, review packet
PURPOSE PRESERVATION CHECK). Full nine-command gate: typecheck, test, build, `git diff --check`,
audit-package-exports, audit-license, publish-dry-run (no publish), install-smoke,
install-tarball-smoke. No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

No `rekon setup` / `welcome` implementation, no prompts, no ASCII art, no `create-rekon` /
`@rekon/create`, no dependency, no postinstall behavior, no `package.json` metadata change, no
scan / refresh / init behavior change, no `intent:go`, no npm publish, no version bump, no branch.

## RISKS / FOLLOW-UP

- The setup / welcome model is decided but unverified until implemented; the implementation slice
  must keep `npm install` non-interactive and machine output banner-free.
- A future `npm init rekon` should reuse the decided-and-tested welcome / setup model, not precede
  it.
- Optional package metadata polish (`engines` / `keywords` / `repository`) is deferred.

## NEXT STEP

Rekon Setup / Welcome UI Implementation — implement the non-interactive-safe welcome / setup UI
foundation (compact mark / optional banner, `rekon welcome`, setup plan output, `NO_COLOR` /
`REKON_NO_BANNER` behavior, no ASCII in `--json`, no prompts unless separately approved). Still no
postinstall onboarding, no `create-rekon`, no `intent:go`.

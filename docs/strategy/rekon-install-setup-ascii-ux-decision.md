# Rekon Install / Setup / ASCII Art UX Decision

## Decision Summary

This decision defines the polished V1 install and first-run setup experience now that V1
prepare/prove/package/export is ready, `rekon scan` is shipped and safety-reviewed, fresh-repo
intent context prep is shipped and safety-reviewed, and phase-level verification posture is shipped
and safety-reviewed. We select **Option B — staged install/setup polish**: decide the setup / banner
/ branding UX now and implement it later in small, non-interactive-safe slices. The V1 install path
stays scriptable — `npm install -D @rekon/cli` then `npx rekon scan` — and a future optional `rekon
setup` (and, later, `npm init rekon`) layers interactive guidance on top without changing the safe
scan-first model. **Install must not run onboarding automatically.** **First-run setup must start
with scan.** **intent:go remains deferred.** This is a decision-only batch: it implements no setup,
no prompts, no ASCII art, no initializer, no postinstall behavior, and adds no dependencies.

The seventeen decision questions, answered:

1. **What should the ideal V1 install path be?** A scriptable, non-interactive local install
   (`npm install -D @rekon/cli`) followed by a first scan (`npx rekon scan`); global install is
   supported; an `npm init rekon` initializer is a future option.
2. **Should the primary install path be `npm install -D @rekon/cli` + `npx rekon scan`?** Yes — it
   is dev-dependency-scoped, scriptable, and runs nothing on install.
3. **Should global install be supported as `npm install -g @rekon/cli` + `rekon scan`?** Yes —
   supported and documented for operators who want a global `rekon` binary.
4. **Should a future `npm init rekon` / `create-rekon` package exist?** Yes, but deferred — it
   should reuse the decided-and-tested setup / welcome model, not precede it.
5. **Should `rekon setup` exist?** Yes — as a future, explicit, optional command (decided now,
   implemented in a later slice), never run automatically.
6. **What should `rekon setup` ask before first scan?** Only "Run the first scan now?" — nothing
   else.
7. **What should `rekon setup` ask after first scan?** Post-scan next actions only: prepare an
   intent / plan handoff, generate agent context, publish an architecture summary, inspect
   artifacts, add package scripts, add a CI dry-run workflow, or exit.
8. **Should docs / agent / CI / verification options be offered before scan?** No. **Docs
   generation is not offered before the first scan.** **Agent handoff generation is not offered
   before the first scan.** **Verification planning is not offered before the first scan.**
9. **Where should ASCII art appear?** Only in the first-run / welcome / setup surfaces; everyday
   commands use a compact mark or no branding.
10. **What ASCII art style should Rekon use?** A small, restrained wordmark plus the brand line
    `REKON` / `Scan → Snapshot → Act`, and a compact framed mark for non-welcome surfaces — never
    large art in everyday output.
11. **What resources / packages are needed to design ASCII art?** Candidates only (no dependency
    added this slice): `figlet` for wordmark candidates, `picocolors` for lightweight color,
    `string-width` for Unicode box alignment, `@inquirer/prompts` for future interactive setup,
    `node:readline/promises` as a zero-dependency prompt fallback, `boxen` or hand-rolled boxes for
    framed output, and `supports-color` / TTY checks for gating.
12. **How should non-TTY / CI behave?** No prompts and no banner by default. **Non-TTY setup must
    not prompt.**
13. **How should `--json` behave?** No prompt, no banner, and no ASCII art. **ASCII art must never
    appear in --json output.**
14. **How should `NO_COLOR` / no-banner behavior work?** `NO_COLOR` is respected (no color) and a
    `REKON_NO_BANNER` env var suppresses the banner; both gate independently of TTY detection.
15. **Should `refresh` appear in onboarding?** No — `rekon refresh` stays an expert / compatibility
    command and is not part of the install / onboarding copy.
16. **Should postinstall run onboarding?** No. **Install must not run onboarding automatically.**
    `@rekon/cli` ships no postinstall / preinstall script today, and none should be added.
17. **What implementation slice follows?** **Rekon Setup / Welcome UI Implementation** — the
    non-interactive-safe welcome / setup UI foundation (compact mark / optional banner, `rekon
    welcome`, setup plan output), with no prompts unless separately approved.

## Why This Decision Exists

Rekon is at a V1-ready product boundary: it prepares, proves, packages, and exports a non-executing
Rekon → Circe plan handoff. `rekon scan` fixed the first-run lifecycle verb; fresh-repo intent
readiness and phase-level verification quality are now safety-reviewed. The remaining
operator-readiness layer is install / setup UX — how someone installs Rekon, runs the first scan,
understands what to do next, and optionally sees branding without harming scripts or machine output.
This decision pins that UX so the implementation slices that follow stay safe and intentional.

## Current Install Surface

Grounded in the repository at `648fef3`:

- The published CLI is `@rekon/cli` (version `1.0.0`), exposing the `rekon` binary via
  `bin.rekon = ./dist/index.js`; the package `files` allowlist is `["dist"]`.
- **There is no `postinstall` / `preinstall` / `prepublish` script in any workspace package** — `npm
  install` runs nothing beyond fetching files. Install is already non-interactive and safe.
- `@rekon/cli` has no `engines` constraint, `keywords`, or `repository` field today; these are
  optional metadata-polish candidates for a later slice, not part of this decision.
- The root workspace `rekon` is private and is not published.

## Current First-Run Surface

- The CLI dispatch (`packages/cli/src/index.ts`) exposes `init`, `scan`, and `refresh`. `rekon scan`
  is the canonical first-run command (Rekon First-Run Scan Onboarding Decision + Implementation +
  Safety Review); `rekon refresh` is the expert / compatibility update verb.
- **No `setup`, `welcome`, `doctor`, `demo`, or `banner` command exists**, and there is no ASCII /
  banner / `NO_COLOR` / `REKON_NO_BANNER` / TTY-gating code yet — a clean slate for this decision.
- Fresh-repo intent context is prepared explicitly with `rekon intent context prepare`; missing
  context is never seeded privately.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| minimal install docs only | rejected/deferred | safe but not polished |
| staged install/setup polish | selected | design first, implement safely |
| immediate interactive setup | rejected | needs explicit prompt policy |
| ASCII-heavy CLI | rejected | noisy and unsafe for machine output |
| postinstall onboarding | rejected | install should be non-interactive |
| create-rekon first | rejected/deferred | initializer should reuse decided setup UX |

## Recommendation

Select **Option B — staged install/setup polish**. Decide the setup / branding UX now; implement it
later in small, non-interactive-safe slices. This preserves the shipped scan-first model while making
onboarding intentional, keeps `npm install` non-interactive, and keeps machine-readable output clean.
The primary public lifecycle is **Scan → Snapshot → Act**.

## Install Model

| Surface | Decision |
| --- | --- |
| npm install -D @rekon/cli | primary local install |
| npx rekon scan | primary first run |
| npm install -g @rekon/cli | supported global install |
| npm init rekon | future initializer |
| postinstall | rejected |

Rules: `npm install` must not run onboarding; postinstall scripts must not be used for interactive
setup; setup must be explicit; `rekon scan` remains the first useful command; install docs must not
tell users to run `refresh` first.

## Setup Model

A future, explicit, optional command — defined here, not implemented:

```sh
rekon setup
```

| Stage | Allowed Prompt |
| --- | --- |
| before scan | run first scan now |
| after scan | intent / agent context / architecture / artifacts / scripts / CI |
| non-TTY | no prompt |
| --json | no prompt / no banner |

`rekon setup` must never imply command execution, source writes, `intent:go`, or Circe execution by
Rekon.

## First-Run Prompt Model

Before the first scan, setup may ask only **"Run the first scan now?"**. It must not ask, before
scan, to generate docs, generate agent context, add CI, create a verification plan, publish
architecture, or run Circe. **First-run setup must start with scan.** **Non-TTY setup must not
prompt** — in non-TTY / CI it prints guidance and exits without asking anything.

## Post-Scan Prompt Model

After a successful scan (`snapshot_ready`), setup may offer: prepare an intent / plan handoff;
generate agent context; publish an architecture summary; inspect artifacts; add package scripts; add
a CI dry-run workflow; or exit. These are presentation of post-scan next actions only — selecting one
runs the corresponding existing Rekon command (which itself executes nothing and writes no source);
setup performs no execution of its own.

## ASCII Art And Branding Model

| Surface | Branding Decision |
| --- | --- |
| first run / setup | banner allowed |
| everyday commands | compact mark or none |
| --json | no ASCII art |
| non-TTY | no banner by default |
| CI | no banner by default |
| NO_COLOR | respected |
| REKON_NO_BANNER | respected |

Recommended brand line:

```
REKON
Scan → Snapshot → Act
```

Recommended compact mark:

```
┌─ Rekon ─────────────────────────────┐
│ scan → snapshot → act               │
└─────────────────────────────────────┘
```

The big ASCII wordmark appears only in first-run / welcome / setup. Everyday commands use the compact
mark or no branding. Art is not implemented in this slice.

## Resource Plan

| Resource | Use |
| --- | --- |
| figlet | wordmark candidates |
| picocolors | lightweight color |
| string-width | Unicode alignment |
| @inquirer/prompts | future interactive setup |
| node:readline/promises | zero-dependency fallback |
| boxen / hand-rolled boxes | framed output |
| supports-color / TTY checks | color and banner gating |

These are candidates only. No dependency is added in this decision slice; package additions (if any)
are decided when the welcome / setup UI is implemented, preferring the zero-dependency
`node:readline/promises` + hand-rolled output path where practical.

## Boundary Model

- **Install must not run onboarding automatically.**
- **First-run setup must start with scan.**
- **Docs generation is not offered before the first scan.**
- **Agent handoff generation is not offered before the first scan.**
- **Verification planning is not offered before the first scan.**
- **ASCII art must never appear in --json output.**
- **Non-TTY setup must not prompt.**
- **Onboarding must not imply Rekon executes commands or writes source files.**
- **Onboarding must not imply Rekon runs Circe.**
- **intent:go remains deferred.**

## What This Does Not Do

This is a decision-only batch. It does not implement `rekon setup`, add prompts, add ASCII art, add
`create-rekon` / `@rekon/create`, add dependencies, add postinstall behavior, publish to npm, bump
versions, implement `intent:go`, execute commands beyond the verification gates, change runtime
behavior, or write source files outside docs / tests / the review packet. It adds this memo, a docs
test, a review packet, and additive doc pointers.

## Implementation Sequence

1. **Rekon Setup / Welcome UI Implementation** (recommended next): implement the
   non-interactive-safe welcome / setup UI foundation — compact mark / optional banner, `rekon
   welcome`, setup plan output, `NO_COLOR` / `REKON_NO_BANNER` behavior, no ASCII in `--json`, and
   no prompts unless separately approved.
2. **Interactive Setup Prompts** (separately approved): add the before-scan / after-scan prompt
   flow under explicit non-TTY-safe rules.
3. **`npm init rekon` Initializer** (deferred): an `npm init`-native onboarding package that reuses
   the decided-and-tested setup / welcome model.
4. Optional package metadata polish (`engines`, `keywords`, `repository`) when convenient.

Still no postinstall onboarding, no `create-rekon` before the setup UI is decided, and no
`intent:go`.

> Update (slice 118): step 1 — **Rekon Setup / Welcome UI Implementation** — shipped. `rekon
> welcome` and `rekon setup` are implemented as non-interactive-safe, prompt-free, banner-gated
> commands (no ASCII in `--json`, `NO_COLOR` / `REKON_NO_BANNER` respected, setup never runs scan or
> creates `.rekon/`). Next: Rekon Setup / Welcome UI Safety Review. See
> [Rekon Setup / Welcome UI](../concepts/rekon-setup-welcome.md).

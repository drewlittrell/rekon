# Rekon First-Run Scan / Install Onboarding Decision

## Decision Summary

Select **Option B** — make `rekon scan` the canonical first-run command. A brand-new
user installs Rekon and runs one verb, `rekon scan`, which initializes `.rekon/` if needed
and performs the first repository scan, producing the first intelligence/snapshot substrate.
Only after that substrate exists are dependent actions — docs/agent-context publication,
change preflight, verification guidance, and the intent handoff flow — offered. **First-run
onboarding must start with scan, not refresh.** The current first-run verb in help and in
the README "First 10 Minutes" is `refresh`, which presupposes a snapshot that a new user
does not have; this decision corrects that public vocabulary. **This slice decides the model
only. It does not implement `rekon scan`, change any CLI behavior, add prompts, or add ASCII
art.**

The public lifecycle is **Scan → Snapshot → Act**:

- **scan**: create or update local repository intelligence (initialize `.rekon/` if missing).
- **snapshot**: canonical Rekon artifacts now exist under `.rekon/artifacts/`.
- **act**: publish docs / agent context, run preflight, prepare intent, create bundles, hand
  off to Circe.

The fifteen onboarding questions, answered:

1. **What public command should a new user run first?** `rekon scan`.
2. **Why is `refresh` the wrong first-run verb?** "Refresh" implies something already exists;
   a new user has no scan, no snapshot, and no Rekon substrate yet, so "refresh" misdescribes
   the very first run.
3. **What should `rekon scan` do when `.rekon/` does not exist?** Initialize the `.rekon/`
   workspace (as `rekon init` does today) and then perform the first repository scan and
   snapshot — one command, no separate init step required.
4. **What should `rekon scan` do when `.rekon/` exists but no snapshot exists?** Perform the
   scan and create the first intelligence snapshot.
5. **What should `rekon scan` do after a snapshot exists?** Re-scan and update the snapshot
   idempotently (the behavior `rekon refresh` performs today).
6. **Which commands require a completed first scan?** Publish / docs / agent-context,
   resolve / preflight, verify / verification-plan, and the intent prepare → bundle flow
   (which need their source artifacts). See the command table and the command requirement
   model.
7. **What should blocked commands print before first scan?** A helpful pre-scan message that
   names `rekon scan`, not a generic error. See the required pre-scan message.
8. **When should docs / agent / CI / verification options be offered?** Only after the first
   scan succeeds (state `snapshot_ready`) — never before.
9. **Should `refresh` remain as an alias or expert command?** Yes — `refresh` remains an
   expert / compatibility verb; it is not the first-run UX.
10. **What should the install wizard ask before scan?** Only "Run the first scan now?" — no
    docs / agent / CI / verification questions before any scan exists.
11. **What should it ask after scan?** It offers the post-scan actions (generate agent
    context, run change preflight, create / inspect verification guidance, view artifacts,
    exit).
12. **Where does ASCII art belong?** First-run / welcome / setup only (big wordmark); a
    compact mark in everyday output; never in `--json`; not in non-TTY by default; respect
    `NO_COLOR` and `REKON_NO_BANNER`.
13. **Which ASCII art resources are needed?** A big wordmark and a compact boxed mark; the
    candidate tooling (figlet, picocolors, string-width, @inquirer/prompts) is recorded in the
    resource plan and evaluated — not added — in implementation.
14. **Should create-rekon be a future package?** Deferred — an `npm init rekon` initializer is
    plausible future work, evaluated in a later implementation slice, not part of V1.
15. **What implementation slice follows?** Rekon First-Run Scan Implementation.

## Why This Decision Exists

Rekon wants a polished npm install / first-run experience. But every useful Rekon output —
generated docs, agent context, verification guidance, CI surfaces, the intent handoff — is
derived from an evidence/snapshot pass over the repository. Asking onboarding questions about
docs / agents / CI before a first scan exists is backwards: it requests outputs before the
evidence layer that produces them. The product needs a public lifecycle vocabulary that
matches a new user's mental model: install, scan, then act. This decision pins that vocabulary
and the command-gating model so a later implementation slice can build `rekon scan` against a
settled definition.

## Current Onboarding Gap

Recorded from the real CLI and docs at `6297d69`:

- **No `rekon scan` command exists.** The CLI has no `scan` verb today.
- **`usage()` leads with `rekon init` then `rekon refresh`.** Those are the first two command
  lines in top-level help, so `refresh` reads as the primary lifecycle verb.
- **`rekon init`** creates the `.rekon/` workspace and config only; it does not scan or
  produce a snapshot.
- **`rekon refresh`** runs the full lifecycle (observe → project → snapshot → publish +
  freshness) and is the verb that actually creates/updates the intelligence substrate — but
  its name presupposes a prior snapshot.
- **The README "First 10 Minutes"** leads with `npm install` and then `rekon refresh` as the
  first real command, so the documented first-run path uses the wrong verb.

**Recorded UX gap:** package and CLI docs present `refresh` as the de-facto first-run command,
even though "refresh" implies a state a new user does not have. The canonical first-run verb
should be `rekon scan`; `refresh` should be retained as an expert / compatibility alias.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| refresh first | rejected | confusing before any scan exists |
| scan first | selected | matches first-run mental model |
| init only | rejected/deferred | does not create intelligence substrate |
| setup wizard first | deferred | useful after scan semantics are pinned |
| docs/agent/CI prompts before scan | rejected | outputs depend on scan |

- **A. Keep `rekon refresh` as first-run** — Reject: "refresh" implies an existing
  scan/snapshot; it is confusing before the first run.
- **B. Add `rekon scan` as canonical first-run** — **Select**: `rekon scan` initializes if
  needed and performs the first repository scan, matching the new user's mental model and
  creating the substrate dependent actions require.
- **C. Use `rekon init` as first-run** — Reject/defer: init alone does not create the
  evidence/snapshot layer users need to do anything useful.
- **D. Make `rekon setup` the first-run command** — Defer: an interactive wizard is useful
  later, but first the non-interactive lifecycle must be clear and scriptable.
- **E. Ask docs/agent/CI questions before scan** — Reject: docs, agent context, verification,
  and CI options all depend on evidence created by scan.

## Recommendation

Select **Option B** — make `rekon scan` the canonical first-run command. The V1 first-run path
is:

```bash
npm install -D @rekon/cli
npx rekon scan
```

with a possible future initializer path:

```bash
npm init rekon
```

The public lifecycle is **Scan → Snapshot → Act**. `rekon scan` creates or updates local
repository intelligence (initializing `.rekon/` if needed); once a snapshot exists, the act
surfaces — publish docs / agent context, run preflight, prepare intent, create bundles, hand
off to Circe — become available. `refresh` is retained as an expert / compatibility verb.

## Workspace State Model

Three workspace states gate command availability:

```ts
type RekonWorkspaceState =
  | "not_initialized"
  | "initialized_without_snapshot"
  | "snapshot_ready";
```

| State | Meaning | Allowed Next Action |
| --- | --- | --- |
| not_initialized | no .rekon workspace | rekon scan |
| initialized_without_snapshot | workspace exists, no snapshot | rekon scan |
| snapshot_ready | first scan complete | publish / preflight / intent / bundle flows |

## Command Requirement Model

- **scan**: allowed in all states (it is the way to advance state).
- **init**: allowed in all states, but is not the canonical first-run.
- **status**: requires an initialized workspace.
- **publish / docs / agent context**: requires `snapshot_ready`.
- **resolve / preflight**: requires `snapshot_ready`.
- **verify / verification plan**: requires `snapshot_ready`.
- **intent assess**: may require `snapshot_ready` unless a raw plan-only assessment mode is
  explicitly decided later.
- **intent prepare / status / work-order / verification-plan / bundle**: require their source
  artifacts, therefore require a prior scan / assessment.

**Required pre-scan message.** Commands that require a scan must print a helpful message, not a
generic error. When no snapshot exists:

```text
Rekon has not scanned this repo yet.

Run:
  rekon scan

After the first scan, this command can use the repository intelligence snapshot.
```

When `.rekon/` exists but no snapshot exists:

```text
This Rekon workspace exists, but no intelligence snapshot was found.

Run:
  rekon scan
```

## First-Run UX

Install Rekon, then run the first scan, then offer next actions — in that order. Before the
first scan, the install / onboarding flow asks only:

```text
Run the first scan now?
```

It does **not** ask, before any scan exists, to generate docs, generate agent context, add CI,
create a verification plan, or publish architecture. **Docs generation is not offered before
the first scan. Agent handoff generation is not offered before the first scan. Verification
planning is not offered before the first scan.** For V1 the documented path is non-interactive:

```bash
npx rekon scan
npx rekon intent assess ...
```

Interactive setup is future work.

## Post-Scan UX

After the first scan succeeds (`snapshot_ready`), the flow offers:

```text
Generate agent context
Run change preflight
Create / inspect verification guidance
View artifacts
Exit
```

These are the **act** surfaces; they are only offered once the snapshot substrate exists.

## ASCII Art And Branding Model

The branding posture is decided here but not implemented:

- The big wordmark appears only in first-run / welcome / setup output.
- A compact mark appears in everyday command output.
- **ASCII art must never appear in `--json` output.**
- No color / art in non-TTY unless explicitly allowed.
- `NO_COLOR` is respected.
- `REKON_NO_BANNER` is respected.

Recommended visual language:

```text
REKON
Scan → Snapshot → Act
```

or compact:

```text
┌─ Rekon ─────────────────────────────┐
│ scan → snapshot → act               │
└─────────────────────────────────────┘
```

## Resource Plan

Resources to **evaluate** (not add) during implementation:

- `figlet` — candidate wordmark generation.
- `picocolors` — lightweight color.
- `string-width` — aligned Unicode boxes.
- `@inquirer/prompts` — future create-rekon / setup wizard, not necessarily core CLI.

`create-rekon` (`npm init rekon`) is a plausible future initializer package; it is deferred and
evaluated in a later slice, not part of V1.

## Boundary Model

| Surface | Branding Decision |
| --- | --- |
| first run | banner allowed |
| everyday commands | compact mark only |
| --json | no banner |
| non-TTY | no prompt / no banner by default |
| NO_COLOR | respected |

The command surfaces this decision governs:

| Command Surface | First-Run Decision |
| --- | --- |
| rekon scan | canonical first-run |
| rekon init | compatibility / explicit initialization |
| rekon refresh | expert / compatibility alias |
| publish docs / agents | after scan |
| resolve preflight | after scan |
| intent prepare / bundle | after assessment / scan |

Boundary statements pinned by this decision:

- **First-run onboarding must start with scan, not refresh.**
- **Docs generation is not offered before the first scan.**
- **Agent handoff generation is not offered before the first scan.**
- **Verification planning is not offered before the first scan.**
- **`rekon scan` creates the first repository intelligence substrate.**
- **`refresh` remains an expert or compatibility term, not the first-run UX.**
- **ASCII art must never appear in `--json` output.**
- **Onboarding must not imply Rekon executes commands or writes source files.**

## What This Does Not Do

This is a strategy / product-UX decision. It does not implement `rekon scan`, does not change
any CLI behavior, adds no prompts, adds no ASCII art, adds no `create-rekon` package, does not
modify package versions, does not publish to npm, does not implement `intent:go`, and writes no
source files outside this memo, its docs test, the review packet, and additive doc pointers.
Onboarding described here does not imply Rekon executes commands or writes source files: `scan`
reads the repository and writes only `.rekon/` operational state and `.rekon/artifacts/`
intelligence; canonical truth remains `.rekon/artifacts/`.

## Implementation Sequence

1. Write this decision memo, its docs test, the review packet, and additive doc pointers.
2. Run the full nine-command verification gate (no CLI smoke — decision-only batch).
3. Commit the docs/test/review-packet changes, fast-forward `main`, and push.
4. **Rekon First-Run Scan Implementation** (recommended next): implement `rekon scan` as the
   canonical first-run command — initialize `.rekon/` if needed, run the first repository
   scan, create the first intelligence substrate, and show post-scan next actions. Still no
   docs / agent / CI prompts before scan; still no source writes beyond `.rekon/` operational
   state; still no `intent:go`.

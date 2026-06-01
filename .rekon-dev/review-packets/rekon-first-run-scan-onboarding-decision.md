# Review Packet — Rekon First-Run Scan / Install Onboarding Decision

## CHANGES MADE

Strategy / product-UX decision batch. Decides the V1 install and first-run onboarding model:
the public first-run verb is `rekon scan` (Option B), the workspace state model gating command
availability, the pre-scan messaging, the post-scan action sequence, and the ASCII/branding
posture. New `docs/strategy/rekon-first-run-scan-onboarding-decision.md`, a 17-assertion docs
test, this review packet, and additive pointers in supporting docs + CHANGELOG. No code, CLI
behavior, package version, or runtime change.

## PUBLIC API CHANGES

None. No code, CLI command, flag, artifact type, `package.json`, version, or runtime behavior
changed. `rekon scan` is **decided, not implemented**; `rekon refresh` and `rekon init` are
unchanged.

## PURPOSE PRESERVATION CHECK

Original problem: Rekon wants a polished npm install / first-run experience, but useful Rekon
outputs require a first evidence/snapshot pass, so asking onboarding questions about docs /
agents / CI before a first scan is backwards. Product guarantee preserved: first-run UX starts
with scan; scan initializes local Rekon state if needed and produces the first repository
intelligence substrate; docs / agent / verification / CI options are offered after scan, not
before; `refresh` may remain an expert/internal alias but is not the first-run UX. This memo
encodes exactly that: `rekon scan` is the canonical first-run verb, dependent surfaces are
gated to `snapshot_ready`, and `refresh` is demoted to an expert/compatibility alias — with no
implementation, no CLI change, and no source writes beyond docs/tests/packet.

## CODEBASE-INTEL ALIGNMENT

Grounded in the real CLI and docs at `6297d69`: `rekon scan` does not exist; `rekon init`
(creates `.rekon/` + config only) and `rekon refresh` (observe → project → snapshot → publish
+ freshness) are the first two lines of `usage()`; the README "First 10 Minutes" leads with
`rekon refresh`. Recorded UX gap: `refresh` is the de-facto first-run verb but presupposes a
snapshot a new user does not have.

## OPTIONS CONSIDERED

A. Keep `refresh` first — Reject (confusing before any scan exists). B. Add `rekon scan` as
canonical first-run — **Select** (matches first-run mental model; creates the substrate). C.
Use `rekon init` as first-run — Reject/defer (init does not create the snapshot layer). D.
`rekon setup` wizard first — Defer (useful after scan semantics are pinned). E. Ask
docs/agent/CI questions before scan — Reject (outputs depend on scan).

## WORKSPACE STATE MODEL

`not_initialized` (no `.rekon/`) → `rekon scan`; `initialized_without_snapshot` (workspace
exists, no snapshot) → `rekon scan`; `snapshot_ready` (first scan complete) → publish /
preflight / intent / bundle flows.

## COMMAND REQUIREMENT MODEL

`scan` allowed in all states; `init` allowed in all states but not canonical first-run;
`status` requires an initialized workspace; publish/docs/agent-context, resolve/preflight,
verify/verification-plan all require `snapshot_ready`; `intent assess` may require
`snapshot_ready` (raw plan-only mode is a separate later decision); the rest of the intent
flow requires its source artifacts (therefore a prior scan/assessment). Blocked commands print
a helpful pre-scan message naming `rekon scan`, not a generic error.

## FIRST-RUN UX

install → first scan → then offer next actions. Before the first scan, ask only "Run the first
scan now?" — no docs / agent / CI / verification prompts. V1 documented path is non-interactive
(`npx rekon scan` then `npx rekon intent assess ...`).

## POST-SCAN UX

After scan succeeds: offer Generate agent context / Run change preflight / Create-inspect
verification guidance / View artifacts / Exit. These are the **act** surfaces, available only
once the snapshot substrate exists.

## ASCII ART AND BRANDING MODEL

Big wordmark only in first-run / welcome / setup; compact mark in everyday output; **no ASCII
art in `--json`**; no color/art in non-TTY by default; `NO_COLOR` and `REKON_NO_BANNER`
respected. Visual language: `REKON` / `Scan → Snapshot → Act` (or a compact boxed mark).

## RESOURCE PLAN

Evaluate (not add) in implementation: `figlet` (wordmark), `picocolors` (color), `string-width`
(aligned boxes), `@inquirer/prompts` (future setup wizard). `create-rekon` (`npm init rekon`)
is a deferred future initializer, not part of V1.

## BOUNDARY MODEL

First-run onboarding must start with scan, not refresh. Docs / agent-handoff / verification
generation are not offered before the first scan. `rekon scan` creates the first repository
intelligence substrate. `refresh` remains an expert/compatibility term, not the first-run UX.
ASCII art must never appear in `--json` output. Onboarding must not imply Rekon executes
commands or writes source files (scan writes only `.rekon/` operational state and
`.rekon/artifacts/`; canonical truth remains `.rekon/artifacts/`).

## TESTS / VERIFICATION

New `tests/docs/rekon-first-run-scan-onboarding-decision.test.mjs` (17 assertions: memo title,
14 headings, scan-first selection, the four "not offered before scan" / substrate / refresh /
`--json` / no-execution boundary statements, four tables, CHANGELOG mention, review packet
PURPOSE PRESERVATION CHECK). Full nine-command gate: typecheck, test, build, `git diff
--check`, audit-package-exports, audit-license, publish-dry-run (no publish), install-smoke,
install-tarball-smoke. No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

No `rekon scan` implementation, no CLI behavior change, no prompts, no ASCII art, no
`create-rekon`, no package version edit, no npm publish, no `intent:go`, no VerificationRun /
Result, no command execution beyond verification gates, no source writes outside this memo, its
docs test, this review packet, and additive doc pointers, no branch.

## RISKS / FOLLOW-UP

- This is a vocabulary/UX decision; until `rekon scan` is implemented, the README "First 10
  Minutes" and `usage()` still lead with `refresh`. The follow-up implementation slice closes
  that gap; this slice records the direction without changing behavior.
- The `intent assess` gating ("may require `snapshot_ready`") is intentionally left open for a
  separate raw plan-only-mode decision.

## NEXT STEP

Rekon First-Run Scan Implementation — implement `rekon scan` as the canonical first-run
command (initialize `.rekon/` if needed, run the first scan, create the first substrate, show
post-scan actions). Still no docs/agent/CI prompts before scan, no source writes beyond
`.rekon/` operational state, no `intent:go`.

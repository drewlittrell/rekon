# Rekon Interactive Setup Prompt Decision

## Decision Summary

This decision pins the interactive prompt policy for `rekon setup` now that the non-interactive
welcome / setup foundation is shipped and safety-reviewed (Rekon Setup / Welcome UI Implementation +
Safety Review at `6e7c007`). We **select Option B — TTY-only scan-first prompts**: `rekon setup` may
become interactive **only in human TTY mode**, and only within the already-decided scan-first
boundaries. **Interactive setup prompts are allowed only in human TTY mode.** Machine and automation
surfaces stay prompt-free: **`rekon setup --json` must never prompt.** **Non-TTY setup must never
prompt.** **CI setup must never prompt.** Before the first scan, setup may ask exactly one question —
whether to run the first scan: **Before scan, setup may ask only whether to run the first scan.** A
`--yes` flag is decided here (not implemented in this batch) whose only effect before scan is to
choose the safe default and run the first scan: **--yes may run the first scan but must not perform
downstream actions automatically.** Prompt answers are onboarding guidance, not configuration:
**Prompt answers are not persisted in v1.** The V1 boundary stays intact: **Setup must not run
Circe.** **Setup must not execute arbitrary commands.** **Setup must not write source files.** And
**intent:go remains deferred.** This is a decision-only batch: it implements no prompts, adds no
dependencies, adds no `create-rekon`, adds no postinstall onboarding, changes no CLI behavior, and
publishes nothing.

The eighteen decision questions, answered:

1. **Should `rekon setup` become interactive in human TTY mode?** Yes — but only in an interactive
   human TTY, and only within the scan-first boundaries. **Interactive setup prompts are allowed only
   in human TTY mode.**
2. **What prompt is allowed before the first scan?** Exactly one: "Run the first scan now?".
   **Before scan, setup may ask only whether to run the first scan.**
3. **What prompts are allowed after a snapshot exists?** Post-scan next-action selection only
   (prepare an intent / plan handoff, generate agent context, publish an architecture summary,
   inspect artifacts, add package scripts, add a CI dry-run workflow, or exit) — presented as explicit
   choices, never auto-run.
4. **Should setup ever prompt in `--json`?** No. **`rekon setup --json` must never prompt.**
5. **Should setup ever prompt in non-TTY?** No. **Non-TTY setup must never prompt.**
6. **Should setup ever prompt in CI?** No. **CI setup must never prompt.**
7. **Should setup support `--yes`?** Yes — as a decided flag (implemented in a later slice) that
   removes the first-scan prompt only.
8. **What should `--yes` do before scan?** Choose the safe default and run the first scan.
   **--yes may run the first scan but must not perform downstream actions automatically.**
9. **What should `--yes` do after scan?** Nothing automatic — it prints the recommended next actions;
   it does not perform dependent actions.
10. **What should cancellation do?** Exit cleanly with a non-zero status, persist nothing, run no
    actions, and tell the user they can run `rekon scan` manually.
11. **Should prompt answers be persisted?** No. **Prompt answers are not persisted in v1.**
12. **If persisted, where?** Not applicable in v1; a future, separately-decided `.rekon/config.json`
    setup-preferences model is the only candidate location, gated by its own config decision.
13. **Should setup be allowed to run scan after an explicit prompt?** Yes — `rekon scan` may run only
    after explicit confirmation or `--yes`.
14. **Should setup be allowed to generate docs / agent context / CI / VerificationPlan after an
    explicit prompt?** Not before scan; after scan these are next-action choices only, each gated by
    its own future slice. **Docs generation is not offered before the first scan.** **Agent handoff
    generation is not offered before the first scan.** **Verification planning is not offered before
    the first scan.**
15. **Should setup ever run Circe?** No. **Setup must not run Circe.**
16. **Should setup ever execute arbitrary commands?** No. **Setup must not execute arbitrary
    commands.**
17. **Should setup ever write source files?** No. **Setup must not write source files.**
18. **What implementation slice follows?** **Rekon Interactive Setup Prompt Implementation** —
    TTY-only scan-first prompts with `--yes`, no prompts in `--json` / non-TTY / CI, no persistence,
    no Circe, no `intent:go`.

## Why This Decision Exists

`rekon setup` exists today but intentionally does not prompt — it is a deterministic,
machine-safe setup-plan command. Before adding any interactivity, Rekon needs an explicit prompt
policy that preserves the two guarantees the welcome / setup foundation was reviewed safe against:
the **scan-first** model (the first useful action is always `rekon scan`) and **machine-safe output**
(`--json`, non-TTY, and CI never change behavior or block on input). Without a pinned policy, an
implementation slice could drift into prompting in scripts, auto-generating artifacts before scan, or
running Circe — each of which would break automation or violate the V1 boundary. This decision fixes
the TTY / CI / `--json` / `--yes` / cancellation / persistence rules now so the implementation slice
that follows stays safe and intentional. It follows the Rekon Setup / Welcome UI Safety Review and
the Rekon Install / Setup / ASCII Art UX Decision, which already established that first-run setup must
start with scan and that ASCII art never appears in `--json`.

## Current Setup Surface

Grounded in `packages/cli/src/index.ts` and `tests/contract/cli-welcome-setup.test.mjs` at `6e7c007`:

- `rekon setup [--root <path>] [--json] [--no-banner]` is **deterministic and non-interactive**. The
  CLI contains no `readline`, `@inquirer/prompts`, or stdin-prompt code (a source scan finds none);
  setup only detects state and prints a plan.
- `detectSetupWorkspaceState` reads only whether `.rekon/` exists; when it does not, it returns
  `not_initialized` **without** initializing the store, so **setup does not create `.rekon/` before
  the first scan**. The contract test `setup does not create .rekon/ when run before scan` asserts
  this with `assert.rejects(stat(join(dir, ".rekon")))`.
- `buildSetupPlan` returns recommended next actions plus a `boundaries` object whose nine booleans
  (`runsScan`, `createdDocs`, `createdAgentHandoff`, `createdCi`, `createdVerificationPlan`,
  `runsCirce`, `executesCommands`, `writesSourceFiles`, `implementsIntentGo`) are all `false`.
- `rekon setup --json` emits the plan **banner-free**; `--no-banner` and `REKON_NO_BANNER` suppress
  the banner; `NO_COLOR` suppresses ANSI color; a non-TTY human invocation shows the compact mark,
  not the big banner. Output-mode helpers `shouldUseColor`, `shouldShowBanner`, `rekonBrandPrefix`,
  `renderRekonBanner`, and `renderRekonCompactMark` exist and gate branding independently of
  prompting.

No current behavior differs from the decided model. This decision adds only the prompt policy that a
later implementation slice will honor; it changes nothing now.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| keep setup non-interactive forever | rejected/deferred | safe but less polished |
| TTY-only scan-first prompts | selected | improves UX while preserving automation safety |
| prompt in all modes | rejected | breaks CI/scripts |
| --yes performs all actions | rejected | too surprising |
| postinstall launches setup | rejected | install must remain non-interactive |
| setup runs Circe import | rejected | Circe boundary remains external |

- **Option A — keep setup non-interactive forever.** Setup stays deterministic, plan-only. Rejected /
  deferred: safe, but it leaves the first-run UX flat now that the foundation is reviewed; a guarded
  prompt adds real value without weakening safety.
- **Option B — TTY-only prompts with a strict scan-first policy (selected).** Setup prompts only in a
  human TTY and only within the decided scan-first boundaries. Selected: it improves onboarding while
  preserving machine-safe and scan-first behavior.
- **Option C — prompt in all modes.** Prompt even in non-TTY / CI / scripts. Rejected: it would block
  automation and contradict V1 CLI safety.
- **Option D — `--yes` performs all post-scan actions.** Automatically generate docs / agent context
  / CI / VerificationPlan after scan. Rejected: too surprising; `--yes` must stay safe and only
  remove the first-scan prompt.
- **Option E — postinstall launches setup.** Start setup from `npm install`. Rejected: install must
  remain non-interactive.
- **Option F — setup runs Circe import.** Prompt to run Circe validate / routes / import. Rejected:
  Circe execution / import remains outside Rekon setup.

## Recommendation

Select **Option B — TTY-only scan-first prompts**. `rekon setup` becomes interactive only in human
TTY mode, and only within the scan-first boundaries: before scan it may ask exactly one question
("Run the first scan now?"); after a snapshot exists it may present post-scan next actions as explicit
choices, never auto-running them. A `--yes` flag removes the first-scan prompt only. Prompts never
appear in `--json`, non-TTY, or CI. Nothing is persisted. Setup never runs Circe, executes arbitrary
commands, or writes source files, and `intent:go` remains deferred. This preserves the shipped
scan-first model and machine-safe output while making first-run onboarding interactive and friendly.

## Prompt Model

| State | Allowed Prompt |
| --- | --- |
| not_initialized | run first scan now |
| initialized_without_snapshot | run first scan now |
| snapshot_ready | post-scan next-action selection |
| --json | no prompt |
| non-TTY / CI | no prompt |

### Before scan

The only allowed pre-scan prompt is a single yes/no:

```
Run the first scan now?
```

Allowed responses:

- **Yes** — run `rekon scan`.
- **No** — print the command to run manually (`rekon scan`) and exit.

No other pre-scan prompts are allowed. Specifically **not** allowed before scan: generate docs?,
generate agent context?, add CI?, create a verification plan?, run Circe?, or prepare intent?.
**Docs generation is not offered before the first scan.** **Agent handoff generation is not offered
before the first scan.** **Verification planning is not offered before the first scan.**

### After scan

Once a snapshot exists (`snapshot_ready`), setup may present these as explicit next-action choices:
prepare an intent / plan handoff; generate agent context; publish an architecture summary; inspect
artifacts; add package scripts; add a CI dry-run workflow; or exit. In the **recommended v1 prompt
implementation**, setup **prints** these choices as next actions but does **not** execute them
automatically; whether each becomes a do-it-now action is decided by its own future slice. Selecting a
choice, when implemented, runs the corresponding existing Rekon command (which itself executes nothing
and writes no source); setup performs no execution of its own.

## Output Mode Rules

- `--json`: no prompts. no banner. no ASCII art.
- non-TTY: no prompts. no banner by default.
- CI: no prompts. no banner by default.
- `NO_COLOR`: no ANSI color.
- `REKON_NO_BANNER`: no banner.
- `--no-banner`: no banner.

These rules are non-negotiable: **`rekon setup --json` must never prompt.** **Non-TTY setup must
never prompt.** **CI setup must never prompt.** They gate independently of one another and of TTY
detection.

## Yes Flag Model

| Flag / Environment | Decision |
| --- | --- |
| --json | no prompt / no banner |
| --yes | run first scan only; no downstream actions |
| --no-banner | no banner |
| NO_COLOR | no ANSI color |
| REKON_NO_BANNER | no banner |
| CI | no prompt / no banner |

`--yes` is the only new flag this decision introduces. Its meaning:

- **Before scan:** choose the safe default and run the first scan (equivalent to answering "Yes" to
  the single pre-scan prompt).
- **After scan:** do **not** perform dependent actions automatically; print the recommended next
  actions and exit.

Rationale: `--yes` must not cause surprising downstream outputs. It should only remove the prompt for
the first scan. **--yes may run the first scan but must not perform downstream actions automatically.**

## Persistence Model

**Prompt answers are not persisted in v1.** Prompts are onboarding guidance, not configuration policy,
so there is no answer file, no cached "don't ask again", and no written preferences. The only future
alternative — persisting explicit setup preferences under `.rekon/config.json` — is deferred to a
separate config decision and is out of scope here. For this decision: **no persistence**.

## Cancellation Model

- Ctrl-C (or any cancellation) exits cleanly with a non-zero exit status.
- Partial answers are not persisted.
- No actions are run after cancellation.
- Output tells the user they can run `rekon scan` manually.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| prompts before scan | only first-scan prompt |
| prompts after scan | next-action selection only |
| setup vs docs/agents/CI | no pre-scan generation |
| setup vs Circe | does not run Circe |
| setup vs command execution | no arbitrary commands |
| setup vs source writes | no source writes |
| setup vs intent:go | deferred |

The pinned boundary statements:

- **Interactive setup prompts are allowed only in human TTY mode.**
- **`rekon setup --json` must never prompt.**
- **Non-TTY setup must never prompt.**
- **CI setup must never prompt.**
- **Before scan, setup may ask only whether to run the first scan.**
- **Docs generation is not offered before the first scan.**
- **Agent handoff generation is not offered before the first scan.**
- **Verification planning is not offered before the first scan.**
- **--yes may run the first scan but must not perform downstream actions automatically.**
- **Prompt answers are not persisted in v1.**
- **Setup must not run Circe.**
- **Setup must not execute arbitrary commands.**
- **Setup must not write source files.**
- **intent:go remains deferred.**

## What This Does Not Do

This is a decision-only batch. It does not implement prompts, add `@inquirer/prompts`, add `readline`
prompt logic, add `create-rekon` / `@rekon/create`, add postinstall onboarding, add dependencies,
change `rekon setup` or `rekon welcome` behavior, change scan / refresh behavior, implement
`intent:go`, run Circe, execute commands beyond the verification gates, publish to npm, bump versions,
create a branch, or write source files outside docs / tests / the review packet. It adds this memo, a
docs test, a review packet, and additive doc pointers.

## Implementation Sequence

1. **Rekon Interactive Setup Prompt Implementation** (recommended next): implement TTY-only
   scan-first prompts — before scan ask only whether to run the first scan; `--yes` may run the first
   scan; after scan show next-action selection without auto-running downstream actions unless
   separately approved; no prompts in `--json` / non-TTY / CI; no prompt persistence; no Circe
   execution; no `intent:go`.
2. **Post-Scan Action Wiring** (separately approved, per-action): decide and implement which post-scan
   next actions become do-it-now choices, each as its own small slice.
3. **Setup Preferences Config** (deferred): if persistence is ever wanted, a separate
   `.rekon/config.json` setup-preferences decision precedes any persisted answers.
4. **`npm init rekon` Initializer** (deferred): reuse the decided-and-tested setup / welcome / prompt
   model.

Still no postinstall onboarding, no `create-rekon` before the prompt UI is implemented, and no
`intent:go`.

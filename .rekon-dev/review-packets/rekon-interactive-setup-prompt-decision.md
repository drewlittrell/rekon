# Review Packet — Rekon Interactive Setup Prompt Decision (slice 120)

Strategy / product-UX **decision-only** batch. Pins the interactive prompt policy for `rekon setup`
on top of the shipped-and-reviewed non-interactive welcome / setup foundation. No code, CLI, package,
version, or runtime behavior change.

## CHANGES MADE

- Added `docs/strategy/rekon-interactive-setup-prompt-decision.md` — the decision memo (13 `##`
  sections; answers all 18 decision questions; option / prompt / flag / boundary tables; 14 pinned
  boundary statements). Selects **Option B — TTY-only scan-first prompts**.
- Added `tests/docs/rekon-interactive-setup-prompt-decision.test.mjs` — 23 docs-contract assertions.
- Added this review packet.
- Additive doc pointers in: `docs/strategy/rekon-setup-welcome-ui-safety-review.md`,
  `docs/strategy/rekon-install-setup-ascii-ux-decision.md`, `docs/concepts/rekon-setup-welcome.md`,
  `docs/releases/v1-release-notes.md`, `docs/releases/v1-migration-notes.md`,
  `docs/strategy/roadmap.md`, `docs/strategy/classic-behavior-roadmap.md`, `README.md`, `CHANGELOG.md`.

## PUBLIC API CHANGES

None. No CLI flags, commands, exports, types, or schemas changed. `--yes` is **decided** (documented)
but **not implemented**; `rekon setup` and `rekon welcome` behave exactly as at `6e7c007`.

## PURPOSE PRESERVATION CHECK

- **Original problem:** `rekon setup` exists but intentionally does not prompt. Before adding prompts,
  Rekon needs a prompt policy that preserves the scan-first model and machine-safe output, specifying
  TTY / CI / `--json` / `--yes` / cancellation behavior and persistence boundaries.
- **Product guarantee preserved:** prompts are allowed only in interactive TTY human mode; never in
  `--json`; never in CI / non-TTY; before scan setup may ask only to run the first scan; after scan
  setup may present dependent actions as choices; prompts never imply command execution, source
  writes, Circe execution, or `intent:go`.
- **Verdict:** preserved. The decision encodes exactly these guarantees and adds nothing that could
  weaken them. It is documentation only — the runtime is untouched.

## CODEBASE-INTEL ALIGNMENT

- Rekon's substrate role is unchanged: it prepares, proves, packages, and exports; Circe imports and
  orchestrates. The decision explicitly keeps Circe execution / import outside `rekon setup`.
- The decision is consistent with the Rekon Install / Setup / ASCII Art UX Decision (staged polish,
  scan-first, no postinstall, ASCII never in `--json`) and the Rekon Setup / Welcome UI Safety Review
  (welcome explanatory, setup deterministic / non-interactive / no `.rekon/` before scan).
- It sequences cleanly into the next capability slice (Rekon Interactive Setup Prompt Implementation)
  without expanding Rekon's authority.

## CURRENT SETUP SURFACE

Grounded at `6e7c007` in `packages/cli/src/index.ts` + `tests/contract/cli-welcome-setup.test.mjs`:

- No prompt code exists (no `readline` / `@inquirer/prompts` / stdin prompts) — source scan returns
  none.
- `rekon setup [--root <path>] [--json] [--no-banner]` is deterministic and non-interactive.
- `detectSetupWorkspaceState` only `access()`es `.rekon/`; `not_initialized` returns without
  `store.init()`, so setup creates no `.rekon/` before scan (proven by the contract test
  `setup does not create .rekon/ when run before scan`).
- `buildSetupPlan` emits a `boundaries` object with all nine booleans `false`.
- `--json` is banner-free; `--no-banner` / `REKON_NO_BANNER` suppress the banner; `NO_COLOR`
  suppresses ANSI color; output-mode helpers (`shouldUseColor`, `shouldShowBanner`, `rekonBrandPrefix`,
  `renderRekonBanner`, `renderRekonCompactMark`) exist. No behavior differs from the decided model.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| keep setup non-interactive forever | rejected/deferred | safe but less polished |
| TTY-only scan-first prompts | selected | improves UX while preserving automation safety |
| prompt in all modes | rejected | breaks CI/scripts |
| --yes performs all actions | rejected | too surprising |
| postinstall launches setup | rejected | install must remain non-interactive |
| setup runs Circe import | rejected | Circe boundary remains external |

## PROMPT MODEL

- **Before scan:** one prompt only — "Run the first scan now?" (Yes → `rekon scan`; No → print the
  manual command). No docs / agent / CI / verification / Circe / intent prompts before scan.
- **After scan (`snapshot_ready`):** present post-scan next actions as explicit choices (prepare
  intent / plan handoff, generate agent context, publish architecture summary, inspect artifacts, add
  package scripts, add CI dry-run, exit). Recommended v1: print choices, do not auto-run; each
  do-it-now action is gated by its own future slice.

## OUTPUT MODE RULES

- `--json`: no prompts, no banner, no ASCII art.
- non-TTY: no prompts, no banner by default.
- CI: no prompts, no banner by default.
- `NO_COLOR`: no ANSI color. `REKON_NO_BANNER` / `--no-banner`: no banner.

## YES FLAG MODEL

`--yes` is the only new (decided, unimplemented) flag. Before scan: choose the safe default and run
the first scan. After scan: no automatic dependent actions — print recommended next actions and exit.
Rationale: `--yes` removes the first-scan prompt only and must never cause surprising downstream
outputs.

## PERSISTENCE MODEL

No persistence in v1. Prompts are onboarding guidance, not configuration. No answer file, no cached
"don't ask again". A future `.rekon/config.json` setup-preferences model is deferred to a separate
config decision.

## CANCELLATION MODEL

Ctrl-C / cancellation exits cleanly with a non-zero status; partial answers are not persisted; no
actions run after cancellation; output tells the user they can run `rekon scan` manually.

## BOUNDARY MODEL

| Boundary | Decision |
| --- | --- |
| prompts before scan | only first-scan prompt |
| prompts after scan | next-action selection only |
| setup vs docs/agents/CI | no pre-scan generation |
| setup vs Circe | does not run Circe |
| setup vs command execution | no arbitrary commands |
| setup vs source writes | no source writes |
| setup vs intent:go | deferred |

Pinned: prompts only in human TTY; never in `--json` / non-TTY / CI; before scan only the first-scan
prompt; `--yes` runs first scan only; no persistence; setup does not run Circe, execute arbitrary
commands, or write source files; `intent:go` deferred.

## TESTS / VERIFICATION

- New docs test: `tests/docs/rekon-interactive-setup-prompt-decision.test.mjs` (23 assertions) — title,
  13 headings, TTY-only-scan-first selection, all 14 boundary statements, 4 tables, CHANGELOG mention,
  review-packet PURPOSE PRESERVATION CHECK.
- Full 9-command gate: `npm run typecheck`, `npm run build`, `npm test`, `git diff --check`,
  `node scripts/audit-package-exports.mjs`, `node scripts/audit-license.mjs`,
  `node scripts/publish-dry-run.mjs`, `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`. No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

- `packages/cli/src/index.ts` and all source — no prompt code added; `rekon setup` / `rekon welcome`
  unchanged.
- `tests/contract/cli-welcome-setup.test.mjs` — behavior unchanged, so its assertions still hold.
- No dependencies, no `create-rekon`, no postinstall, no version bump, no npm publish, no `intent:go`,
  no scan / refresh changes, no branch.

## RISKS / FOLLOW-UP

- **Risk:** an implementation slice could drift into prompting in `--json` / non-TTY / CI or auto-run
  downstream actions. **Mitigation:** the docs test pins the boundaries; the implementation slice must
  honor them and add its own contract tests.
- **Follow-up:** Rekon Interactive Setup Prompt Implementation (TTY-only scan-first prompts + `--yes`),
  then per-action post-scan wiring, then (only if wanted) a setup-preferences config decision.

## NEXT STEP

**Rekon Interactive Setup Prompt Implementation** — implement TTY-only scan-first prompts: before
scan ask only whether to run the first scan; `--yes` may run the first scan; after scan show
next-action selection without auto-running downstream actions unless separately approved; no prompts
in `--json` / non-TTY / CI; no prompt persistence; no Circe execution; no `intent:go`.

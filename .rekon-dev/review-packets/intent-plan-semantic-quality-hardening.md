# Review Packet — Intent Plan Semantic Normalization Quality Hardening (slice 142)

Base SHA: `09019bb`. Branch: none (push to main after the gate). Path B.

## CHANGES MADE

- `packages/capability-model/src/intent-plan-actionability-report.ts` — added a
  deterministic semantic quality guard (`evaluateSemanticQuality` + helpers
  `extractSourceNonGoals` / `nonGoalPreserved` / `pathSupported` /
  `commandSupported`), threaded it through `evaluatePlanPhases` (new optional
  `ctx.semanticQuality`; returns `semanticWarnings`) and wired it into
  `buildIntentPlanActionabilityReport` for the `semantic-llm` path only. Extended
  `BuildIntentPlanActionabilityReportInput` with `providedPaths?` / `packageScripts?`.
- `packages/cli/src/index.ts` — hardened the semantic prompt rules; added
  `readPackageScriptForms(root)`; `intent plan review` now passes operator
  `--path` (repeatable) and package-script command forms; usage line + help updated.
- `tests/contract/intent-plan-semantic-quality-hardening.test.mjs` — new, 21 tests
  (17 key-free + 4 live-gated).
- `tests/docs/intent-plan-semantic-quality-hardening.test.mjs` — new, 13 assertions.
- `docs/strategy/intent-plan-semantic-quality-hardening.md` — new strategy doc.
- `.rekon-dev/review-packets/...` — new (this).
- Doc updates: 2 strategy + 2 concepts + 1 artifact + 2 release + README + CHANGELOG.

## PUBLIC API CHANGES

- `rekon intent plan review` accepts a repeatable `--path <file>` (operator-declared
  supported paths for the semantic guard). Additive.
- `buildIntentPlanActionabilityReport` input gains optional `providedPaths` /
  `packageScripts`. Additive.
- No flags removed; no JSON field renamed; the slice-141 `normalization` JSON block
  is reused unchanged.

## PURPOSE PRESERVATION CHECK

Original concern: deterministic parsing is not enough for real rough plans, so
LLM-backed semantic normalization exists — but a live provider is only safe in
operator workflows if it cannot invent unsupported paths/commands, drop non-goals,
or make a weak plan look actionable. This slice adds exactly those guards while
keeping every guarantee: semantic output is a proposal, schema-validated, and
deterministically re-checked; unsupported content becomes findings/warnings;
non-goals are preserved or warned; source/plan files are untouched; no commands
run; no Circe runs; intent:go stays deferred. Purpose preserved and hardened.

## SOURCE REVIEW

Grounded in the shipped code at `09019bb`: `evaluatePlanPhases` (capability-model)
aggregates per-phase `evaluatePhase` findings and derives status; the merge-back
path reuses it. The guard hooks in there for the semantic-llm path only — the
deterministic (`off`) and answered (merge-back) paths pass no context and are
unchanged. Non-goals are represented as `constraints` (deterministic parser uses a
`non-goal:` prefix). `IntentPlanActionabilityFinding` requires `{ id, severity,
requirement, phaseId, message, sourceEvidence, suggestedFix }`; the requirement
enum has no dedicated non-goal value, so dropped-non-goal findings reuse
`implementation-scope` (recorded here as a deliberate minimal choice — no kernel
type change).

## QUALITY GUARD MODEL

After `coercePhaseDrafts`, `evaluateSemanticQuality(evaluatedPhases, ctx)` runs and
returns `{ warnings, findings }`. Findings merge into the report's findings BEFORE
status derivation (so they can only make a plan *less* actionable, never more);
warnings append to `normalizationTrace.warnings`. The guard runs ONLY when
`method === "semantic-llm"`.

## SUPPORTED PATH POLICY

A provider touched path is supported if it appears (substring, case-insensitive,
or by extension-stripped basename) in the plan text, the goal, or the operator
`--path` set. Unsupported → `implementation-scope` finding + warning. If repo
context is not passed, the guard requires plan/goal/`--path` support and does NOT
infer from repo files.

## SUPPORTED COMMAND POLICY

A provider verification command is supported if it appears in the plan text or
matches a known package-script form (`npm run <name>`, `npm test`, etc., read
best-effort from the repo's `package.json`). Unsupported → `verification-evidence`
finding + warning.

## NON-GOAL PRESERVATION

`extractSourceNonGoals` extracts stated non-goals (Non-goals / "Do not" sections +
inline "do not" bullets). Each must survive in the phases' constraints (matched by
a distinctive content token). A dropped non-goal → warning + `implementation-scope`
finding. Extraction is conservative (a missed non-goal under-warns; it never
false-warns).

## PROMPT HARDENING

The semantic prompt now lists explicit rules: preserve non-goals/constraints
verbatim; do NOT invent touched paths; do NOT invent verification commands; do NOT
invent acceptance criteria; leave implied-but-unstated fields empty for the
deterministic reviewer; return only source-supported phase drafts.

## CLI JSON VISIBILITY

The slice-141 `normalization` block (`method`, `invokedSemanticNormalization`,
`provider?`, `model?`, `warnings`) already exposes quality data; guard warnings now
flow into `warnings`. No further CLI JSON change was needed.

## DOGFOOD RESULT

- BAD phase (invented path+command, dropped non-goals) → 4 guard findings + 5
  warnings, status `needs-revision`.
- GOOD phase (supported path, preserved non-goals, source evidence) → 0 guard
  findings, 0 guard warnings.
- No-key CLI smoke: off deterministic; auto fallback; required hard-fail; validate
  clean; source/plan unchanged.
- Live OpenAI (`gpt-4o-mini`) on the non-goals fixture: non-goals preserved, no
  invented paths/commands, provider/model recorded, source/plan unchanged.

## EMBEDDED SAFETY REVIEW

> This hardening adds deterministic post-provider quality guards and prompt/CLI tightening; it does not introduce a new execution/source-write/Circe boundary and keeps semantic output behind the already-shipped proposal-not-proof model.

Reviewed: provider-selection (unchanged), schema-validation (unchanged),
deterministic-recheck (now authoritative over guard findings too),
hallucination/invention (now guarded), no-source-write, no-command-execution — all
intact or tightened.

## BOUNDARY MODEL

schema-gated → deterministically re-checked → guard re-checks vs source → status
from merged findings (never auto-actionable) · no source/plan writes · no command
execution · no downstream artifacts · no Circe · intent:go deferred.

## TESTS / VERIFICATION

- Contract: 21 (17 key-free + 4 live). No-key: 17 pass / 4 skip; live (key set):
  21 pass / 0 fail.
- Docs: 13 assertions.
- Regression: existing semantic/plan contract tests pass unchanged (13 / 11 / 32 / 22).
- Full 9-command gate: green (live tests skip in the gate — reproducible).

## INTENTIONALLY UNTOUCHED

No new provider family (only the existing OpenAI-compatible adapter); no embeddings;
no kernel requirement-enum change (dropped-non-goal reuses `implementation-scope`);
no approval/status/handoff gate changes; no source/plan writes; no command
execution; no Circe; no intent:go; no version bump; no branch.

## RISKS / FOLLOW-UP

- The non-goal extractor + token-match preservation check are heuristic; tuned to
  be conservative (under-warn rather than false-warn). A future slice could add a
  dedicated `non-goal-preservation` requirement to the kernel enum if richer
  surfacing is wanted.
- Path/command "support" is substring-based; a dedicated requirement or repo-aware
  resolver could tighten it further.

## NEXT STEP

Return to **Fresh Repo Intent Handoff / Circe Dogfood Review** with the hardened
semantic path (do not start without a confirmed Work Order against the new SHA).

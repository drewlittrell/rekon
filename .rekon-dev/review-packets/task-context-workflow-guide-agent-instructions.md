# Review Packet — TaskContextReport Workflow Guide / Agent Instructions (slice 180)

Base `3bb6375`. Product documentation / workflow-surface batch. Docs only —
implements the docs/product surface for the slice-179 context-first workflow
policy. No runtime change, no source change, no CLI smoke.

## CHANGES MADE

- `docs/guides/task-context-workflow.md` — NEW human-facing workflow guide (also
  created the `docs/guides/` directory).
- `docs/guides/agent-context-instructions.md` — NEW agent-facing instruction set.
- `docs/strategy/task-context-workflow-guide-agent-instructions.md` — NEW
  implementation note.
- `.rekon-dev/review-packets/task-context-workflow-guide-agent-instructions.md` —
  NEW (this file).
- `tests/docs/task-context-workflow-guide-agent-instructions.test.mjs` — NEW, 22
  assertions.
- Cross-ref pointers added to the workflow integration decision, the export memo +
  safety review, the task-context v1 / artifact / concept docs, the two intent
  concept docs, the two v1 release docs, README, CHANGELOG, and the two roadmaps.
- No source, contract test, or runtime files changed.

## PUBLIC API CHANGES

None. Documentation only. `rekon context task`, the intent commands, `rekon
artifacts latest`, the `TaskContextReport` artifact, and every package export are
unchanged. No help text changed.

## PURPOSE PRESERVATION CHECK

`TaskContextReport` guides humans and agents and does not decide or execute. This
batch teaches that habit without changing it: context guides planning and editing;
context does not approve or execute; humans and agents read context before editing;
proof and approval remain separate; verification hints remain hints; do-not-touch
zones remain guidance/context; intent:go remains deferred.

## SOURCE REVIEW

Confirmed (read-only) that every command the guides document already exists and
behaves as described: `rekon context task` (human markdown + `agentContext` JSON),
`rekon intent assess` / `rekon intent plan review` (explicit `--task-context` /
`--task-context-ref`), `rekon intent prepare` (no task-context flag — lineage
only), and `rekon artifacts latest --type <ArtifactType> [--id-only]
[--allow-missing]`. No runtime or help-text change was required.

## GUIDE SURFACE

Two guides under `docs/guides/`: `task-context-workflow.md` (human-facing, 9
sections + workflow / human-agent / boundary tables) and
`agent-context-instructions.md` (agent-facing, 11 sections). An implementation note
under `docs/strategy/` records what shipped and the boundary model.

## HUMAN GUIDE

Read Core Context, Related / Supporting Context, Do Not Touch, Verification Hints,
Warnings, Evidence. Treat do-not-touch as strong guidance, verification hints as
suggested checks (not executed proof), warnings as context-quality notes, evidence
refs as traceability. "Humans should read the TaskContextReport markdown before
editing."

## AGENT INSTRUCTIONS

Consume `agentContext` before editing; prefer `coreContext` exact paths/symbols;
treat `supportingContext` as lower priority; obey `doNotTouch` unless the operator
overrides; treat `verificationHints` as suggestions only; never execute commands
unless explicitly asked; never treat the report as approval; never write source
from the report alone. "Agents should consume agentContext before editing."

## INTENT WORKFLOW RELATIONSHIP

`intent assess` / `plan review` accept the report explicitly via `--task-context` /
`--task-context-ref` (enriching `matchedContext` / `revisionPrompt` as additive
context, never proof); they do not auto-generate it. `intent prepare` stays
lineage-only. Prepare / approve / status / handoff remain separately gated.
Consumption stays explicit unless a future decision changes it.

## BOUNDARY MODEL

Context only, no approval, no execution, no source writes, no WorkOrder /
VerificationPlan, no Circe; hints stay hints; do-not-touch stays guidance; bundle
inclusion optional context only; intent:go deferred. All 14 boundary statements
appear verbatim in the implementation note and the guides.

## TESTS / VERIFICATION

- New docs test: 22/22.
- Full keyless 9-command gate: `npm test`, `npm run typecheck`, `npm run build`,
  `git diff --check`, audit-package-exports, audit-license, publish-dry-run,
  install-smoke, install-tarball-smoke. No CLI smoke (docs-only; no help text
  changed).

## INTENTIONALLY UNTOUCHED

`rekon context task` runtime; intent assess / plan review / prepare behavior;
`rekon artifacts latest`; the `TaskContextReport` artifact / factory / validator /
builder; bundle / handoff code; approval / status / handoff gates; usage()/help
text.

## RISKS / FOLLOW-UP

- Risk: a recommendation read as a requirement, or the command sequence drifting
  from the CLI. Mitigation: the guides state context is recommended (not required,
  not automatic), and the documented flags were verified against the current CLI.
- Follow-up: TaskContextReport Workflow Guide Safety Review (next); the Bundle
  Context Decision (later).

## NEXT STEP

Recommended: **TaskContextReport Workflow Guide Safety Review**. Alternative:
**TaskContextReport Bundle Context Decision**.

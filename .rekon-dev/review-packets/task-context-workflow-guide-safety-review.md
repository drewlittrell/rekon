# Review Packet — TaskContextReport Workflow Guide Safety Review (slice 181)

Base `7145945`. Strategy / safety-review batch. Docs-only — reviews the slice-180
workflow guide + agent instructions. No runtime change, no source change, no CLI
smoke.

## CHANGES MADE

- `docs/strategy/task-context-workflow-guide-safety-review.md` — NEW memo.
- `.rekon-dev/review-packets/task-context-workflow-guide-safety-review.md` — NEW
  (this file).
- `tests/docs/task-context-workflow-guide-safety-review.test.mjs` — NEW, 23
  assertions.
- Additive safety-review pointers appended to the two guides, the slice-180
  implementation note, the workflow integration decision, the export memo + safety
  review, the task-context v1 / artifact / concept docs, the two intent concept
  docs, the two v1 release docs, README, CHANGELOG, and the two roadmaps.
- No source, contract test, or runtime files changed. The guides were edited only
  with additive pointers (no guidance text changed).

## PUBLIC API CHANGES

None. Documentation only. `rekon context task`, the intent commands, `rekon
artifacts latest`, the `TaskContextReport` artifact, and every package export are
unchanged. No help text changed.

## PURPOSE PRESERVATION CHECK

The slice-180 guide improves human/agent use of context without adding automation
or changing runtime behavior; this review confirms it preserves all proof,
approval, execution, source-write, handoff, and intent:go boundaries. Context
guides planning and editing; it does not decide or execute; proof and approval stay
separate; hints stay hints; do-not-touch stays guidance.

## CODEBASE-INTEL ALIGNMENT

The conceptual ancestor (`/Users/andrewlittrell/Code/codebase-intel`) split
orientation from implementation and shipped an agent context output, intent-
preparation context queries, resolver context, and a `mustNot` / `checkMatrix`
constraint vocabulary. The slice-180 guides mirror that orientation-before-
implementation split (build context → orient human and agent → plan) while keeping
Rekon's stricter framing: `mustNot` / do-not-touch stays guidance, not enforcement;
nothing executes; context is never proof. The ancestor informs the language but
does not bind the boundary model.

## DOCUMENTATION REVIEWED

`docs/guides/task-context-workflow.md`, `docs/guides/agent-context-instructions.md`,
`docs/strategy/task-context-workflow-guide-agent-instructions.md` + its review
packet, the slice-179 decision, the export memo + safety review, and the
task-context family docs. Light source review confirmed every documented command
still exists in `packages/cli/src/index.ts`.

## HUMAN GUIDE REVIEW

Directs humans to Core Context, Related / Supporting Context, Do Not Touch,
Verification Hints, Warnings, Evidence; frames do-not-touch as strong guidance,
hints as suggested checks, warnings as quality notes, evidence as traceability.
"Humans should read the TaskContextReport markdown before editing." No approval or
gate-skipping implied.

## AGENT INSTRUCTIONS REVIEW

Directs agents to consume `agentContext`, prefer `coreContext`, treat
`supportingContext` as lower priority, obey `doNotTouch` unless overridden, treat
`verificationHints` as suggestions. "What Agents Must Not Do" forbids treating the
report as approval, writing source from the report alone, executing hints/commands
unless explicitly asked, creating WorkOrder/VerificationPlan, running Circe, or
intent:go. "Agents should consume agentContext before editing."

## WORKFLOW MODEL REVIEW

Context first, plan second, approval third, handoff fourth — all guidance. No
auto-generation, no gating on context, no bundle changes. `intent assess` / `plan
review` accept context via the existing explicit `--task-context` flags; `intent
prepare` stays lineage-only; prepare / approve / status / handoff stay separately
gated.

## BOUNDARY MODEL

Context only, no approval, no execution, no source writes, no WorkOrder /
VerificationPlan, no Circe; hints stay hints; do-not-touch stays guidance; bundle
inclusion optional context only; intent:go deferred; no runtime behavior change.
All 15 required statements appear verbatim in the memo's Boundary Review.

## RECOMMENDATION

Declare the guide safe/stable. Next: **TaskContextReport Bundle Context Decision**.
Alternative (only if a defect were found, none was): **TaskContextReport Workflow
Guide Quality Fix**.

## TESTS / VERIFICATION

- New docs test: 23/23.
- Full keyless 9-command gate: `npm test`, `npm run typecheck`, `npm run build`,
  `git diff --check`, audit-package-exports, audit-license, publish-dry-run,
  install-smoke, install-tarball-smoke. No CLI smoke (docs-only).

## INTENTIONALLY UNTOUCHED

`rekon context task` runtime; intent assess / plan review / prepare behavior;
`rekon artifacts latest`; the `TaskContextReport` artifact / factory / validator /
builder; bundle / handoff code; approval / status / handoff gates; the guides'
guidance text (only additive pointers added).

## RISKS / FOLLOW-UP

- Risk: future guide edits drifting toward automation language. Mitigation: this
  review pins the boundary statements; the next batch is a *decision*, not
  automation.
- Follow-up: TaskContextReport Bundle Context Decision (next).

## NEXT STEP

Recommended: **TaskContextReport Bundle Context Decision**.

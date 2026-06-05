# Review Packet — TaskContextReport Workflow Integration Decision (slice 179)

Base `af26127`. Strategy / architecture decision batch. Docs-only — decides the
workflow model for `TaskContextReport`; implements nothing. No runtime change, no
source change, no CLI smoke.

## CHANGES MADE

- `docs/strategy/task-context-report-workflow-integration-decision.md` — NEW memo.
- `.rekon-dev/review-packets/task-context-report-workflow-integration-decision.md`
  — NEW (this file).
- `tests/docs/task-context-report-workflow-integration-decision.test.mjs` — NEW,
  22 assertions.
- Cross-ref pointers added to the export safety review, the export memo, the
  broader-workflow decision, the task-context v1 / artifact / concept docs, the
  intent dogfood safety review, the two v1 release docs, README, CHANGELOG, and
  the two roadmaps.
- No source, contract test, or runtime files changed.

## PUBLIC API CHANGES

None. Documentation only. `rekon context task`, the intent commands, the
`TaskContextReport` artifact, and every package export are unchanged.

## PURPOSE PRESERVATION CHECK

`TaskContextReport` guides humans and agents and does not decide or execute. This
decision preserves that: it adopts a context-first *recommendation* (not a gate),
keeps proof and approval separate, keeps consumption explicit, and defers
automation and bundle changes. Humans and agents get exact paths, constraints,
hints, warnings, and evidence; intent:go remains deferred.

## CODEBASE-INTEL ALIGNMENT

The conceptual ancestor (`/Users/andrewlittrell/Code/codebase-intel`, present)
split orientation from implementation and produced context bundles, an agent
context output (`tools/agent-docs/generator.ts`), intent-preparation context
queries (`tests/lib/intent-preparation-context-query.test.ts`), resolver context
(`tests/lib/resolver-context.test.ts`), and constraint vocabulary (`mustNot`,
`checkMatrix`). The context-first workflow mirrors that orientation-before-
implementation split: build context, orient human and agent, then plan. Rekon
keeps the stricter boundary model — context is recommended, never proof; `mustNot`/
do-not-touch stays guidance, not enforcement; nothing executes. The codebase-intel
context informs this decision but does not bind it.

## SOURCE REVIEW

Reviewed `packages/capability-model/src/task-context-report.ts` + `task-context.ts`
(builder + shapes), `intent-assessment-report.ts`, `intent-plan-actionability-
report.ts`, `prepared-intent-plan.ts`, `packages/cli/src/index.ts` (context task +
intent assess/plan review/prepare usage and wiring), `packages/kernel-repo-model/
src/index.ts` (TaskContextReport type + all-false factory), and the task-context
contract tests. Confirmed the current workflow surface (below) matches the memo.

## CURRENT WORKFLOW SURFACE

`rekon context task` writes the report + renders markdown + emits `agentContext`.
`rekon intent assess` / `rekon intent plan review` consume it **explicitly** via
`--task-context latest` / `--task-context-ref` (opt-in; `resolveTaskContextSelection`
→ `selectTaskContextReports`). `rekon intent prepare` has **no** task-context flag
— context by lineage only (`--assessment` / `--actionability-report`). Approve /
status / work-order / verification-plan / bundle remain separately gated.

## OPTIONS CONSIDERED

A ad hoc command only (rejected/deferred — undersells substrate); B context-first
workflow policy (**selected** — improves work without automation); C auto-generate
in intent commands (rejected — surprise/staleness/provider risk); D require context
for handoff (rejected/deferred — context is not proof); E optional bundle context
(selected/deferred — useful context, no authority).

## CONTEXT-FIRST WORKFLOW

build/refresh evidence → `context task` → human reads markdown brief → agent reads
`agentContext` → operator passes context explicitly to assess / plan review →
prepare/approve/status/handoff remain separate.

## HUMAN AND AGENT POLICY

Humans read the markdown brief (Core Context, respect Do Not Touch, treat
Verification Hints as suggestions, inspect Warnings). Agents consume `agentContext`
(only touch listed/justified paths, treat doNotTouch as strong guidance, never
execute hints unless a separate workflow commands it, never treat boundaries as
permission to write).

## INTENT WORKFLOW RELATIONSHIP

assess / plan review *recommend* context first and accept it via existing explicit
flags; they do not auto-generate it. prepare stays lineage-only. approve / status /
handoff stay separately gated. Consumption stays explicit unless a future decision
changes it.

## BUNDLE AND HANDOFF CONTEXT

`TaskContextReport` may appear in future bundles only as optional context, not
proof (e.g. `contextRefs` or an `agentContext`/`taskContext` section). It must not
be required proof, must not unlock WorkOrder / VerificationPlan, must not change
approval, and must not change `sourceWriteAllowed` / `commandsExecuted` /
`runsCirce`. Implementation deferred to a dedicated Bundle Context Decision.

## BOUNDARY MODEL

Context only, no approval, no execution, no source writes, no WorkOrder /
VerificationPlan, hints stay hints, do-not-touch stays guidance, intent:go
deferred. Bundle inclusion optional context only.

## TESTS / VERIFICATION

- New docs test: 22/22.
- Full keyless 9-command gate: `npm test`, `npm run typecheck`, `npm run build`,
  `git diff --check`, audit-package-exports, audit-license, publish-dry-run,
  install-smoke, install-tarball-smoke. No CLI smoke (decision-only).

## INTENTIONALLY UNTOUCHED

`rekon context task` runtime; intent assess / plan review / prepare behavior; the
`TaskContextReport` artifact / factory / validator / builder; bundle / handoff
code; approval / status / handoff gates.

## RISKS / FOLLOW-UP

- Risk: a recommendation read as a requirement. Mitigation: the memo and the
  follow-up workflow guide state context is recommended, not required, and not
  automatic.
- Follow-up: TaskContextReport Workflow Guide / Agent Instructions (next); the
  Bundle Context Decision (later); stale-context guidance ("regenerate after the
  repo changes") in the workflow guide.

## NEXT STEP

Recommended: **TaskContextReport Workflow Guide / Agent Instructions**.
Alternative: **TaskContextReport Bundle Context Decision**.

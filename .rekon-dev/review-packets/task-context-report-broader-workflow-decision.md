# Review Packet — TaskContextReport Broader Workflow Decision

Slice 176 · strategy / architecture decision batch · base `c3e94fd`.

Decides where TaskContextReport becomes the standard context substrate for humans,
agents, and future intent/operator workflows. **Selected: Option B — standard
pre-intent / pre-work context substrate.** First implementation: TaskContextReport
Human/Agent Context Export. Decision-only — no runtime/source/artifact/command
change.

## CHANGES MADE

- **NEW** `docs/strategy/task-context-report-broader-workflow-decision.md` —
  11-section decision memo (Decision Summary, Why This Decision Exists, Current Task
  Context Surface, Options Considered, Recommendation, Workflow Model, Human And
  Agent Output, Bundle And Handoff Model, Boundary Model, What This Does Not Do,
  Implementation Sequence) with all 10 boundary statements + option/workflow/output/
  boundary tables + 15 answered decision questions.
- **NEW** `.rekon-dev/review-packets/task-context-report-broader-workflow-decision.md`
  (this file).
- **NEW** `tests/docs/task-context-report-broader-workflow-decision.test.mjs`
  (18 assertions).
- Cross-ref banners + CHANGELOG/README narrative across the task-context + intent
  surface. Docs only; no source touched.

## PUBLIC API CHANGES

None. No type, artifact, schema, CLI command, flag, or version change.

## PURPOSE PRESERVATION CHECK

TaskContextReport has matured from concept to a useful, safety-reviewed context
substrate; the risk is adding isolated features without a product role, or quietly
crossing the proof/approval/execution/source-write boundaries. This decision fixes
the role: TaskContextReport becomes a **standard context substrate, not an
automation engine** — humans and agents get better context before planning or
editing, while proof, approval, source-write, and execution boundaries stay
separate and explicit. Context may guide; it must not approve, execute, mutate, or
claim proof.

## SOURCE REVIEW

Reviewed `task-context-report.ts` (factory forces all seven boundary flags false:
`retrievalIsProof`, `executedCommands`, `wroteSourceFiles`,
`createdPreparedIntentPlan`, `createdWorkOrder`, `createdVerificationPlan`,
`ranCirce`), `task-context.ts` (the intent selector), the `context task` CLI branch
(read-only producer; slice-175 graph + lexical fallback), and the intent assess /
plan review opt-in consumption (`selectTaskContextReports` /
`resolveTaskContextSelection`, `--task-context` / `--task-context-ref`). Confirmed
prepare / approve / status / handoff do **not** consume TaskContextReport directly.
The old `/Users/andrewlittrell/Code/codebase-intel` is available and was used as the
conceptual ancestor (orientation/implementation split, context bundles, agent
context output, resolver packets, `mustNot`, `checkMatrix`); its context packet
informed the worker but never approved or executed — this decision keeps that
boundary. No helper-name drift to record.

## CURRENT TASK CONTEXT SURFACE

`rekon context task` produces a canonical `TaskContextReport` (JSON + human
markdown) from the graph + retrieval + lexical fallback; `intent assess` /
`intent plan review` consume it explicitly and additively; the deterministic spine
(prepare/approve/status/handoff) stays separately gated.

## OPTIONS CONSIDERED

A CLI-only helper (rejected/deferred — undersells); **B standard pre-work context
substrate (selected)**; C automatic consumption everywhere (rejected — stale/surprise
risk); D enforcement artifact (rejected/deferred — needs separate gate design); E
duplicate/canonical next (deferred — higher-risk recommendations). Captured in the
memo's option table.

## WORKFLOW MODEL

context first, plan second, approval third, handoff fourth: build graph/evidence →
`context task` → human markdown review → agent JSON read → optional explicit intent
assess / plan review → separately-gated prepare/approve/status/handoff.

## HUMAN AND AGENT OUTPUT

TaskContextReport artifact is canonical; human markdown is a rendered view; agent
JSON is the structured source of truth; a dedicated export/render surface is added
only if needed (v1 improves existing `context task` output).

## BUNDLE AND HANDOFF MODEL

TaskContextReport may be included as optional context in future intent bundles /
handoffs (by ref), but must never be required proof, never carry approval authority,
and never act as a gate.

## BOUNDARY MODEL

Context only, no approval, no execution, no source writes, no WorkOrder /
VerificationPlan creation; do-not-touch zones are guidance/context; verification
hints are hints only; consumption stays explicit; intent prepare / approve / status
/ handoff remain separately gated; intent:go deferred. Captured in the memo's
boundary table + ten boundary statements.

## TESTS / VERIFICATION

18-assertion docs test (`tests/docs/task-context-report-broader-workflow-decision.test.mjs`)
locking the headings, the ten boundary statements, the four tables, the CHANGELOG
mention, and this packet's PURPOSE PRESERVATION CHECK. Full keyless 9-command gate.
No CLI smoke (decision-only).

## INTENTIONALLY UNTOUCHED

`task-context-report.ts`; `task-context.ts`; the CLI; intent assess / plan review /
prepare / approve / status / handoff code; artifact schemas + registration;
versions. Decision + docs only.

## RISKS / FOLLOW-UP

- The decision commits to a context-substrate role; the export slice must keep
  improving consumption without crossing into automation/enforcement.
- Follow-up: **TaskContextReport Human/Agent Context Export** (recommended next).
  Alternative: **TaskContextReport Workflow Integration Decision** if another
  decision layer is wanted first.

## NEXT STEP

Ship slice 176. Then **TaskContextReport Human/Agent Context Export** — stronger
markdown rendering, agent JSON, "read this before editing" output (or an optional
export command), with no execution, no source writes, no proof/approval semantics.

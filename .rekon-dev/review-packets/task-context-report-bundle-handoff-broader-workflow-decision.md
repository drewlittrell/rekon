# Review Packet — TaskContextReport Bundle Handoff Broader Workflow Decision (slice 192, base e91dc087)

Decision memo: [task-context-report-bundle-handoff-broader-workflow-decision.md](../../docs/strategy/task-context-report-bundle-handoff-broader-workflow-decision.md)
Follows: the TaskContextReport bundle context + handoff + dogfood + safety-review family, the Circe actor contracts + Operator Command Boundary, and `e91dc087` (phase source-change posture).

## CHANGES MADE

- New decision memo `docs/strategy/task-context-report-bundle-handoff-broader-workflow-decision.md`
  (selects Option B — explicit reading-order policy; folds in phase source-change posture).
- New docs test `tests/docs/task-context-bundle-handoff-broader-workflow-decision.test.mjs`
  (27 assertions — headings, statements incl. the 3 source-change posture statements,
  tables, CHANGELOG, packet).
- Cross-refs across the TaskContextReport family docs + roadmaps; README banner + CHANGELOG
  entry.
- No source change. Decision-only batch — no runtime behavior change, no CLI smoke.

## PUBLIC API CHANGES

None. This is a strategy / architecture decision batch. No type, helper, CLI flag, artifact,
manifest field, agent-file rendering, sidecar format, actor-contract generation,
operator-command-boundary, source-change classification, or Circe schema changed. The
source-change posture reviewed here shipped in `e91dc087`.

## PURPOSE PRESERVATION CHECK

The bundle surfaces exist so humans and agents can orient (task context), act within
authority (WorkOrder / VerificationPlan / source-change posture), and hand off to Circe
(actor contracts) — without any surface becoming proof, approval, or execution authority it
is not. This decision pins a reading order and the layer separation so the surfaces stay
useful together. TaskContextReport remains optional context, not proof; source-change
posture is handoff evidence, not approval.

## CODEBASE-INTEL ALIGNMENT

Grounded against the shipped tree at `e91dc087`. `packages/capability-docs/src/intent-plan-bundle.ts`:
`CircePhaseGate` now carries `sourceChange` + `classificationSource`; `sourceChangeForPhaseKind`
classifies `modify`/`implement`/`refactor` → `required`, `investigate`/`review`/`verify` →
`forbidden`, else `allowed`; `phaseSourceChangePolicy` honors an explicit `phase.sourceChange`
override; the posture is threaded through the phase gates, phase plans, WorkOrders,
VerificationPlans, `circe/rekon-proof.json` phase gates, and agent verification summaries.
`prepared-intent-plan.ts` / `intent-plan-actionability-report.ts` / `intent-approval.ts` /
`kernel-repo-model/src/index.ts` thread the phase-kind + source-change classification. The
`circe/rekon-proof.json` gate booleans (`sourceWriteAllowed: false`, `commandsExecuted: false`,
`runsCirce: false`, `intentGoDeferred: true`), the operator-command boundary, the
actor-contract renderers, and the TaskContextReport sidecar renderers are unchanged.

## SOURCE REVIEW

Reviewed `intent-plan-bundle.ts` (source-change helpers + threading), `prepared-intent-plan.ts`,
`intent-plan-actionability-report.ts`, `intent-approval.ts`, `kernel-repo-model/src/index.ts`,
`tests/contract/intent-plan-bundle.test.mjs`, and `docs/concepts/intent-plan-bundle.md`, plus
the prior TaskContextReport handoff family docs. The source-change posture is per-phase
evidence on the authoritative source/verification layer; it is independent of the
TaskContextReport sidecars and changes no gate booleans.

## CURRENT HANDOFF SURFACE

Bundles carry README, manifest, WorkOrder/VerificationPlan, agent files, the three
TaskContextReport sidecars, and the Circe layer (handoff/phase-plan/rekon-proof +
actor-contracts). `e91dc087` adds per-phase `sourceChange` (`required`/`allowed`/`forbidden`)
posture threaded through the phase gates / WorkOrders / VerificationPlans / rekon-proof /
agent verification summaries.

## OPTIONS CONSIDERED

Option B (explicit reading-order policy) selected. Options A (leave as-is), C (TaskContextReport
as primary authority), D (actor contracts as primary agent input), E (Circe consumes
TaskContextReport internals) rejected/deferred.

## BROADER HANDOFF MODEL

Four layers: operator orientation; agent structured handoff; source / verification authority
(now including phase source-change posture); Circe contract layer. None execute anything.

## HUMAN HANDOFF POLICY

Humans inspect README.md first, then context/task-context.md when present; rely on WorkOrder /
VerificationPlan / proof for authority; inspect source-change posture in the source /
verification authority layer; treat source-change posture as evidence, not approval.

## AGENT HANDOFF POLICY

Agents inspect agent/instructions.md first, then agent/handoff.md, then agent/context.json,
then context/task-context.agent.json when present; use agent/source-refs.json + agent/verification.json
for authority; read source-change posture from the source/verification authority layer; do not
let TaskContextReport sidecars override sourceChange posture; do not run operator-only Circe
commands as worker verification.

## CIRCE AND ACTOR CONTRACT POLICY

Circe handoff JSON remains the machine handoff contract; actor contracts are role/return-shape
guidance, not executed workers; Circe is not required to understand TaskContextReport internals
in v1; the Operator Command Boundary stays operator-only; source-change posture is projected as
evidence into the Circe layer and executes nothing.

## BOUNDARY MODEL

Optional context only; source-change posture is evidence not approval; actor contracts are
role/return guidance only; WorkOrder/VerificationPlan + phase gates + agent verification + source
refs authoritative; operator Circe commands operator-only; no command execution; no source
writes; intent:go deferred.

## TESTS / VERIFICATION

- `tests/docs/task-context-bundle-handoff-broader-workflow-decision.test.mjs` (27 assertions).
- Existing handoff-dogfood, handoff-guidance, bundle-context, and the `e91dc087`-updated
  `intent-plan-bundle.test.mjs` remain green.
- Full keyless gate: `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`,
  export/license audits, publish dry-run, both install smokes.
- No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

Bundle implementation, TaskContextReport sidecars, agent-file rendering, Circe actor-contract
implementation, the operator-command boundary, the phase source-change classification, Circe
handoff schema, WorkOrder / VerificationPlan / phase-gate generation, proof / approval
semantics, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: decision-only, no source change. Residual risk is documentation drift, covered by the
boundary docs test. Follow-up is the reading-order implementation.

## NEXT STEP

Recommend **Intent Bundle Handoff Reading Order Implementation** as the next slice.

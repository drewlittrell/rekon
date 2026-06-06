# Review Packet — TaskContextReport Bundle Broader Handoff Decision (slice 187)

Follows: [Bundle Context Decision](../../docs/strategy/task-context-report-bundle-context-decision.md) → [Implementation](../../docs/strategy/task-context-report-bundle-context-implementation.md) → [Safety Review](../../docs/strategy/task-context-report-bundle-context-safety-review.md) → [Dogfood](../../docs/strategy/task-context-report-bundle-context-dogfood.md) → [Dogfood Safety Review](../../docs/strategy/task-context-report-bundle-context-dogfood-safety-review.md)
Memo: [task-context-report-bundle-broader-handoff-decision.md](../../docs/strategy/task-context-report-bundle-broader-handoff-decision.md)

## CHANGES MADE

- New decision memo `docs/strategy/task-context-report-bundle-broader-handoff-decision.md`.
- New review packet (this file).
- New docs test `tests/docs/task-context-report-bundle-broader-handoff-decision.test.mjs` (22 assertions).
- Cross-ref Update lines across the TaskContextReport family docs + roadmaps; README
  banner + CHANGELOG entry.
- No source, runtime, CLI, bundle, schema, or gate change.

## PUBLIC API CHANGES

None. This is a documentation / decision-only batch. No type, helper, CLI flag,
artifact, manifest field, bundle file, or Circe schema changed.

## PURPOSE PRESERVATION CHECK

The bundle-context sidecars exist so humans and agents receiving a bundle can inspect
the same context that guided planning, without that context becoming proof, approval,
execution, or source-write authority. This decision keeps that guarantee: it promotes
the optional sidecars in handoff guidance (recommended, never required) and pins the
human, agent, and Circe policies — visibility, not authority. Context stays optional
context, not proof.

## CODEBASE-INTEL ALIGNMENT

Rekon keeps proof and context distinct: deterministic graph claims and verification
results are proof; task-shaped context is orientation. Promoting the sidecars in
handoff guidance surfaces more context to readers without granting it authority — the
sidecars stay `proof: false` / `role: optional-agent-context`, the Circe handoff
remains the machine contract, and the WorkOrder / VerificationPlan / phase gates stay
authoritative. The decision aligns with the codebase-intelligence model.

## SOURCE REVIEW

Grounded in `packages/capability-docs/src/intent-plan-bundle.ts`: the bundle emits
`agent/handoff.md` (line ~1330), `agent/context.json` (~1331), `agent/instructions.md`
(~1332), the `context/` sidecars, the README "## Task context" section (slice 185),
and the Circe trio; `manifest.context.taskContextReports` carries `role:
optional-agent-context` / `proof: false`. The follow-up implementation will touch only
the agent-facing docs + README guidance, not the gates or Circe.

## CURRENT BUNDLE CONTEXT SURFACE

`--task-context-ref` attaches optional context: `manifest.context.taskContextReports[]`
+ `context/task-context.md` / `.agent.json` / `.refs.json` + a guarded README "## Task
context" section. `agent/handoff.md` / `agent/instructions.md` / `agent/context.json`
do not yet mention task context. The Circe trio is free of task context.

## OPTIONS CONSIDERED

A (manifest/README only) rejected/deferred; **B (promote in handoff guidance)
selected**; C (require for bundles) rejected; D (add to Circe schema)
rejected/deferred; E (execute hints) rejected.

## BROADER HANDOFF MODEL

Operator builds TaskContextReport → flows via lineage/explicit ref → bundle attaches
sidecars → human reads README + `context/task-context.md` → agent reads
`agent/instructions.md` + `agent/handoff.md` + `context/task-context.agent.json` →
Circe imports `circe/handoff.json` without TaskContextReport internals → gates remain
authoritative.

## HUMAN HANDOFF POLICY

Humans should inspect `context/task-context.md` when it is present in a bundle; use it
as orientation; treat verification hints as suggestions and do-not-touch zones as
guidance; rely on WorkOrder / VerificationPlan / Rekon proof artifacts for gates.

## AGENT HANDOFF POLICY

Agents should read `context/task-context.agent.json` when it is present; treat
`doNotTouch` as guidance and `verificationHints` as hints only; not execute hints
unless separately instructed; not treat task context as approval or proof; not ignore
WorkOrder / VerificationPlan / phase gates.

## CIRCE BOUNDARY

Circe handoff JSON remains the machine handoff contract. TaskContextReport sidecars are
Rekon-side optional context in v1. Circe should not be required to understand
TaskContextReport internals, should not execute verification hints, and should not
alter phase/proof status because of TaskContextReport.

## BOUNDARY MODEL

Optional context only — no proof, no approval, no WorkOrder/VerificationPlan/phase gate
authority, no command execution, no source write, no Circe schema requirement;
verification hints stay hints; do-not-touch stays guidance; intent:go deferred.

## TESTS / VERIFICATION

- New docs test (22 assertions): doc + headings, 14 boundary statements, 4 tables,
  CHANGELOG, packet.
- Full keyless gate: `npm run typecheck`, `npm test`, `npm run build`,
  `git diff --check`, export/license audits, publish dry-run, both install smokes.
- No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

`intent bundle write` behavior, bundle sidecar format, Circe handoff schema, WorkOrder /
VerificationPlan / phase-gate generation, proof / approval semantics, and intent:go
(deferred). No agent-facing doc is changed in this batch — that is the follow-up.

## RISKS / FOLLOW-UP

Low risk: decision-only, no runtime change. Residual risk is documentation drift,
covered by the boundary docs test. Follow-up is the guidance implementation.

## NEXT STEP

Recommend **TaskContextReport Bundle Handoff Guidance Implementation** as the next
slice.

# Review Packet — TaskContextReport Bundle Handoff Guidance Safety Review (slice 189)

Reviews: [Handoff Guidance Implementation](../../docs/strategy/task-context-report-bundle-handoff-guidance-implementation.md) (slice 188, `1687749`)
Memo: [task-context-report-bundle-handoff-guidance-safety-review.md](../../docs/strategy/task-context-report-bundle-handoff-guidance-safety-review.md)

## CHANGES MADE

- New safety-review memo `docs/strategy/task-context-report-bundle-handoff-guidance-safety-review.md`.
- New review packet (this file).
- New docs test `tests/docs/task-context-report-bundle-handoff-guidance-safety-review.test.mjs` (27 assertions).
- Cross-ref Update lines across the TaskContextReport family docs + roadmaps; README
  banner + CHANGELOG entry.
- No source, runtime, CLI, agent-file rendering, schema, or gate change.

## PUBLIC API CHANGES

None. This is a documentation / safety-review batch. No type, helper, CLI flag,
artifact, manifest field, agent-file rendering, or Circe schema changed.

## PURPOSE PRESERVATION CHECK

The sidecars exist so an agent/operator receiving a bundle can discover and use the
same context that guided planning, without that context becoming proof, approval,
execution, or source-write authority. Slice 188 promoted the optional sidecars in the
agent-facing bundle files; this review confirms that promotion is guidance-only —
additive, guarded behind sidecar presence, and powerless to act. Context stays
optional context, not proof.

## CODEBASE-INTEL ALIGNMENT

Rekon keeps proof and context distinct: deterministic graph claims and verification
results are proof; task-shaped context is orientation. The promoted guidance surfaces
more context to readers without granting it authority — the agent files frame context
as not-proof, point at `proof: false` sidecars, and keep the Circe handoff and the
WorkOrder / VerificationPlan / phase gates authoritative. The review aligns with the
codebase-intelligence model.

## IMPLEMENTATION REVIEWED

`packages/capability-docs/src/intent-plan-bundle.ts`: three additive, guarded renderer
changes — a "## Task context" section in `agentHandoff`, a `taskContext` metadata key
in the `agentContext` JSON object, and a "## Task context" section in
`agentInstructions`. Each is a spread that is a no-op without task context. Tests:
handoff-guidance (24), bundle-context (27), dogfood (33), intent-plan-bundle (106) —
all green.

## AGENT INSTRUCTIONS REVIEW

"## Task context" section (present only with sidecars): "not proof", read the agent
JSON before editing, read the markdown brief, hints are hints / not executed commands,
do-not-touch is guidance, WorkOrder / VerificationPlan / phase gates authoritative.
Never implies executing hints, ignoring gates, or treating context as approval.

## AGENT HANDOFF REVIEW

"## Task context" section (present only with sidecars): optional task context
available, use the agent JSON for structured context, use the markdown for the
readable brief, "not proof and does not change the handoff gates".

## AGENT CONTEXT METADATA REVIEW

Additive `taskContext` metadata (present only with sidecars): `{ available: true,
reports: [{ ref, role: "optional-agent-context", proof: false, sidecars: { markdown,
agentJson, refsJson } }] }`. Marks `proof: false` and `role: optional-agent-context`;
preserves every existing field (`intentId`, `goal`, `status`, `phases`, …).

## WITHOUT-CONTEXT BUNDLE REVIEW

No "## Task context" section in `agent/instructions.md` / `agent/handoff.md`; no
`taskContext` key in `agent/context.json` (existing fields kept); no `context/`
sidecars. Byte-identical to the prior release.

## CIRCE BOUNDARY REVIEW

`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json` unchanged and
free of task context (contract test masks the repo path and asserts no `task-context`
substring). Circe handoff JSON remains the machine handoff contract; Circe not required
to understand TaskContextReport internals.

## GATE REVIEW

`work-order.md` + `verification-plan.md` present and unchanged by task context;
per-phase verification posture unchanged. Source + plan unchanged; no command executed;
no VerificationRun / VerificationResult.

## BOUNDARY MODEL

Optional context only — no proof, no approval, no WorkOrder/VerificationPlan/phase gate
authority, no command execution, no source write, no Circe schema requirement;
verification hints stay hints; do-not-touch stays guidance; intent:go deferred. The
guidance is visibility, not authority.

## RECOMMENDATION

Declare TaskContextReport Bundle Handoff Guidance safe/stable. Next slice:
TaskContextReport Bundle Handoff Dogfood (evaluate discoverability + usefulness on a
real handoff). Alternative: Handoff Guidance UX Fix, only if a concrete issue surfaces.

## TESTS / VERIFICATION

- New docs test (27 assertions): doc + headings, 19 boundary statements, 4 tables,
  CHANGELOG, packet.
- Full keyless gate: `npm run typecheck`, `npm test`, `npm run build`,
  `git diff --check`, export/license audits, publish dry-run, both install smokes.
- No CLI smoke (strategy / safety-review batch). The slice-188 implementation is
  covered by its contract test.

## INTENTIONALLY UNTOUCHED

The handoff guidance implementation, the agent-file rendering, the Circe handoff
schema, WorkOrder / VerificationPlan / phase-gate generation, the bundle sidecar
format, the README "## Task context" section, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: review-only, no runtime change. Residual risk is documentation drift,
covered by the boundary docs test. Follow-up is the handoff dogfood.

## NEXT STEP

Recommend **TaskContextReport Bundle Handoff Dogfood** as the next slice.

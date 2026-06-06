# Review Packet — TaskContextReport Bundle Handoff Guidance Implementation (v1, slice 188)

Implements: [Bundle Broader Handoff Decision](../../docs/strategy/task-context-report-bundle-broader-handoff-decision.md) (Option B)
Memo: [task-context-report-bundle-handoff-guidance-implementation.md](../../docs/strategy/task-context-report-bundle-handoff-guidance-implementation.md)

## CHANGES MADE

- `packages/capability-docs/src/intent-plan-bundle.ts`: three additive, guarded
  renderer changes (rendered only when a TaskContextReport is attached) — a
  "## Task context" section in `agent/instructions.md`, a "## Task context" section
  in `agent/handoff.md`, and an additive `taskContext` metadata block in
  `agent/context.json`.
- New `tests/contract/task-context-bundle-handoff-guidance.test.mjs` (24 assertions)
  + `tests/docs/task-context-bundle-handoff-guidance.test.mjs` (16 assertions).
- New impl memo + this packet + cross-refs + README banner + CHANGELOG.

## PUBLIC API CHANGES

- `agent/instructions.md` and `agent/handoff.md` gain a "## Task context" section
  when a TaskContextReport is attached (byte-identical otherwise).
- `agent/context.json` gains an additive `taskContext` metadata key when a
  TaskContextReport is attached: `{ available: true, reports: [{ ref, role:
  "optional-agent-context", proof: false, sidecars: { markdown, agentJson, refsJson }
  }] }`. Omitted otherwise; every existing field preserved. No CLI flag, artifact,
  manifest field, sidecar format, or Circe schema changed.

## PURPOSE PRESERVATION CHECK

The sidecars exist so an agent/operator receiving a bundle can discover and use the
same context that guided planning, without that context becoming proof, approval,
execution, or source-write authority. This slice promotes the optional sidecars in
the agent-facing bundle files exactly as the slice-187 decision directed — visibility,
not authority. The guidance is additive, frames context as not-proof, and keeps every
gate authoritative. Context stays optional context, not proof.

## SOURCE REVIEW

Re-read the `agentHandoff`, `agentContext` (JSON), and `agentInstructions` renderers
in `intent-plan-bundle.ts`; the `taskContext` render result (from
`renderTaskContextSidecars`) is in scope at each. Each change is a `...(taskContext ?
[...] : [])` / `...(taskContext ? {...} : {})` spread — a no-op without task context.
The existing `intent-plan-bundle.test.mjs` `agent/context.json` assertion checks
specific fields (`intentId`/`goal`/`status`/`phases`) via `.equal`/`.ok`, not
exact-equality, so the additive `taskContext` key is safe — confirmed green (106/106).

## AGENT INSTRUCTIONS GUIDANCE

`agent/instructions.md` "## Task context": "Task context is optional context, not
proof.", "Read context/task-context.agent.json before editing.", "Read
context/task-context.md for the human-oriented brief.", "Verification hints are
hints, not executed commands.", "Do-not-touch zones are guidance/context, not
enforcement.", "WorkOrder / VerificationPlan / phase gates remain authoritative."

## AGENT HANDOFF GUIDANCE

`agent/handoff.md` "## Task context": "Optional task context is available.", "Use
context/task-context.agent.json for structured context.", "Use context/task-context.md
for the readable brief.", "This context is not proof and does not change the handoff
gates."

## AGENT CONTEXT METADATA

IMPLEMENTED (low-risk and additive). `agent/context.json` gains `taskContext.available
= true` + `reports[]` (each `ref`, `role: "optional-agent-context"`, `proof: false`,
`sidecars: { markdown, agentJson, refsJson }`) only when task context is attached.
The smoke + contract test confirm the existing fields are preserved and the key is
absent without task context.

## CIRCE BOUNDARY

`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json` are unchanged
and free of task context (contract test masks the repo path and asserts no
`task-context` substring). Circe handoff JSON remains the machine handoff contract;
Circe is not required to understand TaskContextReport internals.

## BUNDLE WITH-CONTEXT RESULT

Smoke: `agent/instructions.md` + `agent/handoff.md` carry the "## Task context"
sections pointing at the sidecars; `agent/context.json.taskContext` is present
(`available: true`, `proof: false`, `role: optional-agent-context`, `refsJson`
sidecar) with `intentId`/`goal`/`phases` preserved; Circe handoff clean.

## BUNDLE WITHOUT-CONTEXT RESULT

Smoke: `agent/instructions.md` + `agent/handoff.md` have no "## Task context";
`agent/context.json` has no `taskContext` key (still keeps `intentId`); no `context/`
sidecars. Bundle behavior unchanged.

## BOUNDARY MODEL

Optional context only — no proof, no approval, no WorkOrder/VerificationPlan/phase gate
authority, no command execution, no source write, no Circe schema requirement;
verification hints stay hints; do-not-touch stays guidance; intent:go deferred. The
guidance never implies an agent may execute hints, ignore gates, or treat context as
approval.

## TESTS / VERIFICATION

- `tests/contract/task-context-bundle-handoff-guidance.test.mjs` (24 assertions).
- `tests/docs/task-context-bundle-handoff-guidance.test.mjs` (16 assertions).
- Existing `intent-plan-bundle.test.mjs` (106), `task-context-bundle-context.test.mjs`
  (27), `task-context-bundle-context-dogfood.test.mjs` (33) remain green.
- Full keyless gate: typecheck, test, build, `git diff --check`, export/license audits,
  publish dry-run, both install smokes.
- CLI smoke: with-context + without-context bundle checks.

## INTENTIONALLY UNTOUCHED

The Circe handoff schema, WorkOrder / VerificationPlan / phase-gate generation, the
bundle sidecar format, the manifest context section, the slice-185 README "## Task
context" section, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: presentation-only, additive, guarded behind sidecar presence, covered by
tests. Residual risk is documentation drift, covered by the boundary docs test.
Follow-up is a safety review of the promoted guidance.

## NEXT STEP

Recommend **TaskContextReport Bundle Handoff Guidance Safety Review** as the next
slice.

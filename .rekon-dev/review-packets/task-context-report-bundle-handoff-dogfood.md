# Review Packet — TaskContextReport Bundle Handoff Dogfood (slice 190, rebased to 4cc34b73)

Dogfoods: [Handoff Guidance Implementation](../../docs/strategy/task-context-report-bundle-handoff-guidance-implementation.md) (slice 188) + [Safety Review](../../docs/strategy/task-context-report-bundle-handoff-guidance-safety-review.md) (slice 189), on the `4cc34b73` actor-contracts producer.
Memo: [task-context-report-bundle-handoff-dogfood.md](../../docs/strategy/task-context-report-bundle-handoff-dogfood.md)

## CHANGES MADE

- New dogfood memo `docs/strategy/task-context-report-bundle-handoff-dogfood.md`
  (re-run against `4cc34b73`; adds an Actor Contract Review + a Why This Dogfood Was
  Re-Run section).
- New contract test `tests/contract/task-context-bundle-handoff-dogfood.test.mjs`
  (37 assertions — full handoff path WITH task context; human + agent + Circe + gate +
  actor-contract inspection; without-context comparison written to a separate intent
  id).
- New docs test `tests/docs/task-context-bundle-handoff-dogfood.test.mjs` (21 assertions).
- Cross-refs across the TaskContextReport family docs + roadmaps (including the new
  `docs/concepts/rekon-circe-handoffs.md`); README banner + CHANGELOG entry.
- No source change: the dogfood was fully green and needed no fix.

## PUBLIC API CHANGES

None. This is a dogfood / review batch. No type, helper, CLI flag, artifact, manifest
field, agent-file rendering, sidecar format, actor-contract generation, or Circe schema
changed. The actor-contract surface reviewed here shipped in `4cc34b73`.

## PURPOSE PRESERVATION CHECK

The sidecars + promoted guidance exist so a human operator and an agent can discover
and use the same context that guided planning, without that context becoming proof,
approval, execution, or source-write authority. This dogfood verifies usability and
discoverability from both perspectives on the new producer, confirms the new
`circe/actor-contracts` artifacts are guidance/artifacts (not executed workers) and
independent of task context, and confirms every boundary holds — it changed no
authority. Context stays optional context, not proof.

## SOURCE REVIEW

Re-read the agent renderers, the `circe/handoff.json` / `manifest.circe` projection,
the `renderCirceActorContractFiles()` emitter + `CIRCE_ACTOR_CONTRACT_REFS`, and the
`rekon-proof` projection in `intent-plan-bundle.ts` at `4cc34b73`: target defaults to
`circe`; the `gates` block carries `sourceWriteAllowed: false`, `commandsExecuted:
false`, `runsCirce: false`, `intentGoDeferred: true`; the agent-file task-context
sections and the `agent/context.json` metadata are the slice-188 additive renderers;
`agent/verification.json` and `agent/source-refs.json` are independent of task context;
the actor contracts are return-shape Markdown + JSON Schema constants.

## DOGFOOD SCENARIO

Fresh `task-context-bundle-handoff-dogfood` fixture driven through the full public
operator path (scan → … → `intent bundle write --task-context-ref` → validate), keyless
against the freshly built CLI, plus a without-context comparison bundle written from the
same approved plan to a separate intent id. Source + plan SHA-256 unchanged.

## HUMAN HANDOFF REVIEW

README "## Task context" section (discoverable, "guidance, not proof"); `context/task-context.md`
("optional guidance, not proof"; Do Not Touch; Verification Hints);
`context/task-context.refs.json` (ref, `role: optional-agent-context`, `proof: false`).
A human sees the gates remain authoritative.

## AGENT HANDOFF REVIEW

`agent/instructions.md` + `agent/handoff.md` "## Task context" sections (point at the
agent JSON, "not proof", hints-are-hints, gates authoritative / unchanged).

## AGENT CONTEXT REVIEW

`agent/context.json.taskContext` (`available: true`, `proof: false`, `role:
optional-agent-context`, sidecar paths, existing fields preserved);
`context/task-context.agent.json` (per-report `agentContext` + all-false boundaries).
`agent/verification.json` (`executesCommands: false`, no task context) +
`agent/source-refs.json` (no task context) stay authoritative.

## TRACEABILITY REVIEW

`context/task-context.refs.json` + `manifest.context.taskContextReports[]` give a clean
ref-back path (`role: optional-agent-context`, `proof: false`) without authority.

## CIRCE HANDOFF REVIEW

`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json` present and
(repo path masked) free of task context. `circe/handoff.json` now carries an additive
`actorContracts` block (relative `circe/actor-contracts/` pointers), still free of
task-context dependency. rekon-proof gate booleans: `sourceWriteAllowed: false`,
`commandsExecuted: false`, `runsCirce: false`, `intentGoDeferred: true`. Rekon did not
run Circe.

## ACTOR CONTRACT REVIEW

`4cc34b73`'s default `circe` target emits six `circe/actor-contracts/` files
(`implementer.md`, `reviewer.md`, `planner-verifier.md` + three `*.schema.json`),
linked from `circe/handoff.json.actorContracts` and `manifest.circe.actorContracts`
(`actorContractsDir: "circe/actor-contracts"`). They are return-shape completion
contracts + JSON Schema — guidance/artifacts, not execution results: no VerificationRun
/ VerificationResult, no command output, no committed changes. Rekon emits them and runs
no Circe. They are independent of TaskContextReport and appear identically in the
without-context bundle.

## GATE REVIEW

`work-order.md` + `verification-plan.md` present and unchanged by task context; phase
gates unchanged; source + plan unchanged; no command executed; no VerificationRun /
VerificationResult; no IntentGoReport.

## WITHOUT-CONTEXT REVIEW

Without-context bundle (separate intent id) wrote ok and omitted every task-context
surface: no "## Task context" in README / agent files, no `taskContext` metadata, no
`manifest.context`, no `context/` sidecars — while still carrying the full canonical set
and the same `circe/actor-contracts/`.

## BOUNDARY MODEL

Optional context only — no proof, no approval, no WorkOrder/VerificationPlan/phase gate
authority, no command execution, no source write, no Circe; verification hints stay
hints; do-not-touch stays guidance; actor contracts are artifacts/guidance, not executed
workers; intent:go deferred.

## TESTS / VERIFICATION

- `tests/contract/task-context-bundle-handoff-dogfood.test.mjs` (37 assertions).
- `tests/docs/task-context-bundle-handoff-dogfood.test.mjs` (21 assertions).
- Existing handoff-guidance, bundle-context, bundle-context-dogfood, and
  `intent-plan-bundle` tests remain green (the actor-contract surface shipped in
  `4cc34b73`).
- Full keyless gate: `npm run typecheck`, `npm test`, `npm run build`,
  `git diff --check`, export/license audits, publish dry-run, both install smokes.
- CLI dogfood replay (with + without context) on the `4cc34b73`-built CLI — this
  batch's primary evidence.

## INTENTIONALLY UNTOUCHED

Bundle architecture, Circe handoff schema, actor-contract generation, WorkOrder /
VerificationPlan / phase-gate generation, the agent-file rendering, the bundle sidecar
format, proof / approval semantics, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: dogfood/review-only, no source change. Residual risk is documentation drift,
covered by the boundary docs test. Follow-up is the handoff dogfood safety review
(now including the actor-contract surface).

## NEXT STEP

Recommend **TaskContextReport Bundle Handoff Dogfood Safety Review** as the next slice.

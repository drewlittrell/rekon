# Review Packet — TaskContextReport Bundle Handoff Dogfood Safety Review (slice 191, rebased to 11a209fd)

Reviews: [TaskContextReport Bundle Handoff Dogfood](../../docs/strategy/task-context-report-bundle-handoff-dogfood.md) (slice 190, `c5acc07`), re-grounded on the `11a209fd` operator-command-boundary producer.
Memo: [task-context-report-bundle-handoff-dogfood-safety-review.md](../../docs/strategy/task-context-report-bundle-handoff-dogfood-safety-review.md)

## CHANGES MADE

- New safety-review memo `docs/strategy/task-context-report-bundle-handoff-dogfood-safety-review.md`
  (re-grounded on `11a209fd`; adds an Operator Command Boundary Review).
- New docs test `tests/docs/task-context-bundle-handoff-dogfood-safety-review.test.mjs`
  (33 assertions — headings, statements incl. the operator-command boundary, tables,
  CHANGELOG, packet).
- Cross-refs across the TaskContextReport family docs + roadmaps; README banner +
  CHANGELOG entry.
- No source change. Strategy / safety-review batch — no runtime behavior change, no CLI
  smoke.

## PUBLIC API CHANGES

None. This is a strategy / safety-review batch. No type, helper, CLI flag, artifact,
manifest field, agent-file rendering, sidecar format, actor-contract generation,
operator-command-boundary generation, or Circe schema changed. The actor-contract surface
shipped in `4cc34b73`; the operator-command boundary shipped in `11a209fd`; the dogfood
evidence shipped in `c5acc07`.

## PURPOSE PRESERVATION CHECK

The sidecars + promoted guidance exist so a human operator and an agent can discover and
use the same context that guided planning, without that context becoming proof, approval,
execution, or source-write authority; the actor contracts exist so Circe's own actors know
what to return, without Rekon running Circe; the operator-command boundary exists so actors
do not mistake operator inspection commands for worker verification. This review confirms
the slice-190 dogfood result can be trusted — all three surfaces remain guidance/context,
every boundary holds, and it changed no authority. Context stays optional context, not
proof.

## CODEBASE-INTEL ALIGNMENT

Re-grounded against the shipped tree at `11a209fd`.
`packages/capability-docs/src/intent-plan-bundle.ts`: `rekon-proof` gates block unchanged
(`sourceWriteAllowed: false`, `commandsExecuted: false`, `runsCirce: false`,
`intentGoDeferred: true`); `CIRCE_ACTOR_CONTRACT_REFS` + `renderCirceActorContractFiles()`
emit the six `circe/actor-contracts/` files; new `CIRCE_OPERATOR_COMMAND_BOUNDARY` constant
appended to all three contract strings (implementer / reviewer / planner-verifier);
`circe/handoff.json.actorContracts` + `manifest.circe.actorContracts` reference them;
`target` defaults to `circe`; the guarded `if (taskContext)` renderers add the agent-file
sections + `agent/context.json.taskContext` only when a TaskContextReport is attached.

## DOGFOOD REVIEWED

Slice 190 drove the full public operator path (`scan` → … → `intent bundle write
--task-context-ref` → `artifacts validate`, `valid: true`) keyless against the built CLI,
plus a without-context comparison bundle from the same approved plan to a separate intent
id. Source + plan SHA-256 unchanged.

## HUMAN HANDOFF REVIEW

README "## Task context" (discoverable, "guidance, not proof"); `context/task-context.md`
("optional guidance, not proof"; Do Not Touch; Verification Hints);
`context/task-context.refs.json` (ref, `role: optional-agent-context`, `proof: false`).
Gates remain authoritative to the human.

## AGENT HANDOFF REVIEW

`agent/instructions.md` + `agent/handoff.md` "## Task context" sections (point at the agent
JSON, "not proof", hints-are-hints, gates authoritative / unchanged), rendered only when a
TaskContextReport is attached.

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

`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json` present and (repo
path masked) free of task context. `circe/handoff.json` carries an additive `actorContracts`
block (relative `circe/actor-contracts/` pointers), still free of task-context dependency.
rekon-proof gate booleans: `sourceWriteAllowed: false`, `commandsExecuted: false`,
`runsCirce: false`, `intentGoDeferred: true`. Rekon did not run Circe.

## ACTOR CONTRACT REVIEW

The default `circe` target emits six `circe/actor-contracts/` files (`implementer.md`,
`reviewer.md`, `planner-verifier.md` + three `*.schema.json`), linked from
`circe/handoff.json.actorContracts` and `manifest.circe.actorContracts`. Return-shape
completion contracts + JSON Schema — guidance/artifacts, not execution results. Rekon emits
them and runs no Circe. Independent of TaskContextReport; identical in the without-context
bundle.

## OPERATOR COMMAND BOUNDARY REVIEW

`11a209fd` appends a `CIRCE_OPERATOR_COMMAND_BOUNDARY` ("## Operator Command Boundary"
section) to each of the three actor contracts. It tells actors not to run Circe
cockpit/report/admin commands (`circe handoffs show`, `circe phase report`, `circe handoffs
trace`, `circe admin attention`, `circe workers status`, `circe actors pipeline`) inside the
worker phase — they are operator inspection commands — and to report a plan that asks a
worker to run them as a plan-quality concern. It is operator-only inspection guidance, not
worker execution guidance; it reinforces that Rekon does not run Circe (passive contract
text, never executed); and it treats worker requests to run Circe operator commands as
plan-quality concerns. Additive guidance text only — no command execution, gate, proof, or
Circe run; `circe/handoff.json`, `manifest.circe`, and the rekon-proof gate block are
unchanged.

## GATE REVIEW

`work-order.md` + `verification-plan.md` present and unchanged by task context; phase gates
unchanged; source + plan unchanged; no command executed; no VerificationRun /
VerificationResult; no IntentGoReport; intent:go deferred.

## WITHOUT-CONTEXT REVIEW

Without-context bundle (separate intent id) omitted every task-context surface (no "## Task
context" in README / agent files, no `taskContext` metadata, no `manifest.context`, no
`context/` sidecars) while still carrying the full canonical set and the same
`circe/actor-contracts/` (including the Operator Command Boundary).

## BOUNDARY MODEL

Optional context only — no proof, no approval, no WorkOrder/VerificationPlan/phase gate
authority, no command execution, no source write, no Circe; verification hints stay hints;
do-not-touch stays guidance; actor contracts are artifacts/guidance, not executed workers;
the operator-command boundary is operator-only inspection guidance, not worker execution;
intent:go deferred.

## RECOMMENDATION

Declare TaskContextReport Bundle Handoff Dogfood safe/stable. Next slice:
**TaskContextReport Bundle Handoff Broader Workflow Decision** (alternative: Handoff UX Fix,
only if a concrete issue surfaces — none found).

## TESTS / VERIFICATION

- `tests/docs/task-context-bundle-handoff-dogfood-safety-review.test.mjs` (33 assertions).
- Existing handoff-dogfood (37), handoff-guidance, bundle-context, bundle-context-dogfood,
  and the `11a209fd`-updated `intent-plan-bundle.test.mjs` remain green.
- Full keyless gate: `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`,
  export/license audits, publish dry-run, both install smokes.
- No CLI smoke (strategy / safety-review batch).

## INTENTIONALLY UNTOUCHED

Bundle architecture, the bundle handoff guidance implementation, the bundle context
implementation, Circe actor-contract generation, the operator-command-boundary generation,
Circe handoff schema, WorkOrder / VerificationPlan / phase-gate generation, the agent-file
rendering, the bundle sidecar format, proof / approval semantics, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: review-only, no source change. Residual risk is documentation drift, covered by
the boundary docs test. Follow-up is the broader workflow decision.

## NEXT STEP

Recommend **TaskContextReport Bundle Handoff Broader Workflow Decision** as the next slice.

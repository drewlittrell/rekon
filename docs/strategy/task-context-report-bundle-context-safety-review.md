# TaskContextReport Bundle Context Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

This memo reviews the shipped [TaskContextReport Bundle Context
Implementation](task-context-report-bundle-context-implementation.md) (slice 183,
`44add36`) end-to-end and declares the optional bundle-context surface safe and
stable. It is a review only: it changes no runtime behavior, no bundle-context
implementation, no Circe handoff schema, and no gate.

## Decision Summary

TaskContextReport bundle context is safe/stable. `rekon intent bundle write` may
carry one or more `TaskContextReport` refs as optional context for agents and
operators, and every boundary holds. TaskContextReport may be included in bundles
only as optional context, not proof. TaskContextReport is not required to write an
intent bundle. With no ref attached the bundle is byte-identical; with a ref it
adds only `manifest.context.taskContextReports[]` and three Rekon-side `context/`
sidecars. The Circe handoff projection and the WorkOrder / VerificationPlan /
phase-gate surfaces are untouched.

## Why This Review Exists

Bundle and handoff surfaces sit close to execution orchestration: an agent or
operator who receives a bundle should see the same task context that informed
planning, but that context must never become authority. This review confirms the
slice-183 implementation keeps context optional and non-authoritative — useful to
read, powerless to act — before any dogfood or broader-workflow work builds on it.

## Implementation Reviewed

Reviewed source (grounded in the shipped tree at `44add36`):

- `packages/capability-docs/src/intent-plan-bundle.ts` — `BuildIntentPlanBundleInput.taskContextReports`,
  `projectTaskContextAgent`, `renderTaskContextSidecars`, the `TASK_CONTEXT_BOUNDARIES`
  constant, the three `TASK_CONTEXT_SIDECAR_*` path constants, and the guarded wiring
  into `files`, `bundleFiles`, and `manifest.context`.
- `packages/cli/src/index.ts` — the `--task-context-ref` resolution block, bounded
  lineage discovery from `header.inputRefs`, the `taskContext` JSON block, the human
  output line, and the `usage()` help entry.
- `tests/contract/task-context-bundle-context.test.mjs` (27 assertions),
  `tests/contract/intent-plan-bundle.test.mjs`, `tests/contract/task-context-intent-dogfood.test.mjs`.

The implementation is purely additive. `renderTaskContextSidecars` returns
`undefined` for empty input, so every wiring point is a no-op when no task context
is attached.

## Manifest Context Review

When task context is attached, the producer adds `manifest.context.taskContextReports[]`.
Each entry is `{ ref: { type, id }, role: "optional-agent-context", proof: false,
sidecars: { markdown, agentJson } }`. `manifest.context.taskContextReports` marks
proof:false. `manifest.context.taskContextReports` marks role optional-agent-context.
The section is omitted entirely when no task context is attached, leaving
`manifest` byte-identical to the prior release (`manifest.circe` and every other
key untouched).

## Sidecar Review

Three Rekon-side sidecars are written only when task context is present:

- `context/task-context.md` — opens "This context is optional guidance, not proof.",
  then per report renders "Read This Before Editing", a "Do Not Touch" list tagged
  "(guidance, not enforced)", a "Verification Hints" list tagged "(hint, not
  executed)", and an all-false "Boundaries" list. `context/task-context.md` is
  optional guidance, not proof.
- `context/task-context.agent.json` — `{ taskContextReports: [{ ref, agentContext,
  proof: false }], boundaries }` where `boundaries` is `TASK_CONTEXT_BOUNDARIES`
  (`proof`, `approvesPlans`, `executesCommands`, `writesSourceFiles`, `runsCirce`,
  `implementsIntentGo`, all `false`). `context/task-context.agent.json` carries
  all-false boundaries. Inside `agentContext`, do-not-touch zones carry `enforced:
  false` and verification hints carry `executed: false`.
- `context/task-context.refs.json` — `{ taskContextReports: [{ ref, role:
  "optional-agent-context", proof: false }] }`. `context/task-context.refs.json`
  carries refs and proof:false.

The sidecars are projections of an already-built TaskContextReport; they create no
new authority and re-assert the all-false boundary block independent of the source
report.

## Circe Handoff Review

The Circe handoff projection — `circe/handoff.json`, `circe/phase-plan.json`,
`circe/rekon-proof.json` — is produced by the same adapters as before and never
references task context. The slice-183 contract test asserts the handoff JSON
contains no `task-context` / `taskContext` substring and that `manifest.circe` is
likewise free of it. Circe handoff JSON is unchanged in v1; Circe is not required
to know TaskContextReport internals.

## Gate Review

Task context lives only under `context/` and in `manifest.context`. The WorkOrder
file (`work-order.md`) and VerificationPlan file (`verification-plan.md`) are
generated by the same code paths and never reference the sidecars; the contract
test confirms neither file mentions `context/task-context`. The per-phase
verification posture (`manifest.phaseVerification`) is unchanged. TaskContextReport
must not satisfy WorkOrder or VerificationPlan gates. TaskContextReport must not
change phase gates.

## CLI Review

`rekon intent bundle write` accepts a repeatable `--task-context-ref <TaskContextReport
ref>`. Each explicit ref is resolved from the artifact store before the producer
runs: a missing ref fails cleanly (`Artifact not found: <ref>`) and a wrong-type ref
fails cleanly (`must reference a TaskContextReport`), both before any file is
written. Bounded lineage discovery attaches `TaskContextReport` refs already
recorded in the prepared-plan / assessment `header.inputRefs`, reading only those
two arrays and skipping a ref that no longer resolves; explicit and lineage refs are
de-duplicated by id. `--json` reports an additive `taskContext` block (`{ included,
count, refs, sidecars, proof: false }` or `{ included: false }`) without removing
any existing field, and human output adds one line — "Task context: N optional
context report(s) included (context/, not proof)." — when context is present.

## Boundary Review

Every boundary from the decision holds in the shipped code:

- TaskContextReport may be included in bundles only as optional context, not proof.
- TaskContextReport is not required to write an intent bundle.
- TaskContextReport must not approve plans.
- TaskContextReport must not satisfy WorkOrder or VerificationPlan gates.
- TaskContextReport must not change phase gates.
- TaskContextReport must not execute commands.
- TaskContextReport must not write source files.
- TaskContextReport must not run Circe.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- intent:go remains deferred.

| Surface | Status | Safety Finding |
| --- | --- | --- |
| --task-context-ref | shipped | explicit optional refs |
| lineage discovery | shipped | bounded / optional |
| manifest.context.taskContextReports | shipped | optional context / proof:false |
| context/task-context.md | shipped | guidance, not proof |
| context/task-context.agent.json | shipped | structured context / all-false boundaries |
| context/task-context.refs.json | shipped | refs / proof:false |
| Circe handoff JSON | unchanged | no schema requirement |

| Boundary | Decision |
| --- | --- |
| context vs proof | optional context only |
| context vs approval | no approval |
| context vs WorkOrder / VerificationPlan gates | no gate authority |
| context vs phase gates | no phase gate authority |
| command execution | no execution |
| source writes | no writes |
| Circe | no required internals |
| intent:go | deferred |

| Failure Case | Review Finding |
| --- | --- |
| missing explicit ref | clean failure |
| wrong artifact type | clean failure |
| no context supplied | bundle still writes |
| lineage absent | bundle still writes |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare bundle context safe/stable | selected | optional sidecar boundary holds |
| bundle context dogfood next | selected | usefulness/discoverability needs review |
| UX fix next | deferred | only if review finds issue |
| make context required | rejected | context is not proof |
| put agentContext in Circe handoff | rejected | schema coupling / proof confusion |

## Recommendation

TaskContextReport Bundle Context is safe/stable. The next slice is **TaskContextReport
Bundle Context Dogfood** — run a realistic operator/agent handoff path with the
sidecars and evaluate manifest discoverability and sidecar usefulness before broader
workflow or release work. Fall back to an **Intent Bundle Context UX Fix** only if
the dogfood surfaces concrete presentation/discoverability issues.

## What This Does Not Do

This review changes no runtime behavior, no bundle-context implementation, no Circe
handoff schema, and no gate. It does not make TaskContextReport required, treat it
as proof, approve a plan, satisfy a WorkOrder / VerificationPlan / phase gate,
execute a verification hint or any target-repo command, write source, create a
WorkOrder or VerificationPlan, or run Circe. intent:go remains deferred.

## Follow-Up Work

- **TaskContextReport Bundle Context Dogfood** (recommended next) — evaluate sidecar
  usefulness and manifest discoverability on a real handoff path.
- **Intent Bundle Context UX Fix** (alternative) — only if the dogfood finds
  concrete sidecar/manifest issues.

> Update (slice 185 · TaskContextReport Bundle Context Dogfood): the optional bundle-context sidecars were dogfooded on a realistic operator/agent handoff path (full intent path → `intent bundle write --task-context-ref` → validate). bundle write succeeded; `manifest.context.taskContextReports` (`proof:false`, `role: optional-agent-context`) was discoverable; the `context/task-context.md` human brief, `context/task-context.agent.json` agent view, and `context/task-context.refs.json` traceability index were all useful; bundle JSON reported the `taskContext` sidecars; the Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. One narrow human-discoverability gap was fixed: the bundle `README.md` now renders an additive "## Task context" section (guidance, not proof) only when a TaskContextReport is attached. Sidecars are ready for broader handoff use. Next: TaskContextReport Bundle Context Dogfood Safety Review. See [`task-context-report-bundle-context-dogfood.md`](task-context-report-bundle-context-dogfood.md).

> Update (slice 186 · TaskContextReport Bundle Context Dogfood Safety Review): the slice-185 dogfood result + the narrow bundle-README discoverability fix were reviewed end-to-end and declared safe/stable. TaskContextReport bundle context is optional context, not proof; the full bundle-context dogfood path completed successfully; `manifest.context.taskContextReports` was discoverable (`proof:false`, `role: optional-agent-context`); the `context/task-context.md` / `.agent.json` / `.refs.json` sidecars were useful to humans, agents, and traceability; the bundle README now points to the sidecars (guidance, not proof) when context is attached and is omitted otherwise; Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. Bundle context is ready for broader handoff use. Next: TaskContextReport Bundle Context Broader Handoff Decision. See [`task-context-report-bundle-context-dogfood-safety-review.md`](task-context-report-bundle-context-dogfood-safety-review.md).

> Update (slice 187 · TaskContextReport Bundle Broader Handoff Decision): decided how broader operator/agent handoff workflows should use the optional bundle-context sidecars (Option B — promote them in human/agent handoff guidance, recommended not required). Humans should inspect `context/task-context.md` when present; agents should read `context/task-context.agent.json` when present; the follow-up will point `agent/instructions.md` + `agent/handoff.md` (and optionally `agent/context.json` metadata) at the sidecars. TaskContextReport sidecars are optional context, not proof — must not be required to write an intent bundle, approve plans, execute commands, write source, or satisfy WorkOrder/VerificationPlan or phase gates; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; intent:go remains deferred. First implementation: TaskContextReport Bundle Handoff Guidance Implementation. See [`task-context-report-bundle-broader-handoff-decision.md`](task-context-report-bundle-broader-handoff-decision.md).

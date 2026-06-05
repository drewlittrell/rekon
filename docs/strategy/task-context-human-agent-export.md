# TaskContextReport Human/Agent Context Export

> **Slice 177 · product capability batch.** Base `b1073c4`. Improves how the
> existing `TaskContextReport` is CONSUMED by its two readers — a human "read this
> before editing" markdown brief and an additive `agentContext` block on the
> `rekon context task --json` payload. Presentation only: no new artifact, no new
> command, no schema change, no executed command, no source write. Implements the
> first step of the slice-176 decision (Option B — TaskContextReport as the
> standard pre-intent / pre-work context substrate).

## Summary

`rekon context task` already builds one `TaskContextReport` and prints it. Before
this slice the human output was a thin heading list and the JSON was the raw
report plus boundary block. Neither reader got a clear, self-documenting "here is
what you need to know before you touch code" surface.

This slice makes both readers first-class **without changing what the report
contains or what the command does**:

- **Humans** get a stable "read this before editing" brief: a lead notice, the
  task, then `Core Context`, `Related / Supporting Context`, `Do Not Touch`,
  `Verification Hints`, optional `Warnings`, and `Evidence` — each section always
  rendered with an explicit `(none)` fallback so the skeleton never silently
  collapses.
- **Agents** get a new `agentContext` block on the `--json` payload: a structured
  projection (task, core/supporting context, do-not-touch, verification hints,
  warnings, evidence, boundaries) with the limits pinned as constants
  (`enforced: false` on zones, `executed: false` on hints, all-false `boundaries`).

The `TaskContextReport` artifact is canonical. The human markdown is a rendered
view of that artifact, and the agent JSON `agentContext` block is the structured
source of truth an agent consumes — both are projections of the same report, never
a second source of record.

## Why This Exists

The slice-176 decision selected TaskContextReport as the standard context
substrate for humans, agents, and future intent/operator workflows, and named
**Human/Agent Context Export** as the first implementation. For that substrate to
be useful, each consumer needs an ergonomic, predictable surface:

- A human skimming a task needs the constraints and the "where to look" up front,
  phrased as guidance, not as a wall of JSON.
- An agent assembling working context needs a stable, typed block it can read
  without re-deriving the partition between deterministic core context and
  proposal-grade supporting context, and without guessing the boundaries.

Both already existed implicitly inside the report. This slice surfaces them
explicitly and identically, so the human view and the agent view never drift.

## What Shipped

- `rekon context task` human renderer rewritten into the "read this before
  editing" brief (sections above; always-rendered skeleton; `--json` pointer in
  the footer).
- `rekon context task --json` gains an additive `agentContext` block. Every
  pre-existing top-level field is preserved unchanged.
- `usage()` help for `context task` now describes the human brief and the
  `agentContext` block.
- Contract test (`tests/contract/task-context-human-agent-export.test.mjs`, 26
  assertions) and docs test (`tests/docs/task-context-human-agent-export.test.mjs`,
  16 assertions).

## Human Markdown View

The human brief is a rendered VIEW of the report. It opens with the literal
notice **"Read this before editing."** so the reader knows the document's job
before the first section. `Core Context` lists operator paths and deterministic
graph facts (the context that outranks similarity). `Related / Supporting Context`
lists embedding/semantic neighbors as proposal-grade support. `Do Not Touch` marks
each zone "(guidance, not enforced)". `Verification Hints` marks each hint
"(hint, not executed)". `Evidence` lists the deduped, sorted evidence refs.

## Agent JSON View

The `agentContext` block is the structured source of truth for an agent. It
partitions the report's context items into `coreContext` (operator input +
deterministic graph) and `supportingContext` (embedding retrieval + semantic
understanding), copies the do-not-touch zones with `enforced: false`, copies the
verification hints with `executed: false`, lists the deduped/sorted `evidence`
refs, and embeds the report's all-false `boundaries` block verbatim. It is
additive: it adds no field to and removes no field from the existing JSON.

## Boundary Model

This slice is presentation only. Every boundary the report already guaranteed is
preserved and surfaced, not relaxed:

- The TaskContextReport artifact is canonical.
- The human markdown is a rendered view; the agent JSON `agentContext` block is
  the structured source of truth.
- The brief includes "Read this before editing." as a notice, not an instruction
  to act.
- Verification hints are hints, not executed commands.
- Do-not-touch zones are guidance and context, not enforcement.
- Evidence refs are preserved across every context item, zone, and hint.
- TaskContextReport must not approve plans.
- No commands are executed.
- No source files are written.
- No WorkOrder or VerificationPlan is created.
- No Circe is run.
- intent:go remains deferred — this slice does not bring it forward.

## Evidence Preservation

Evidence refs are preserved. The human `Evidence` section and the agent
`evidence` array are both built from the union of every context item's, zone's,
and hint's `evidenceRefs`, deduped and sorted. Presentation never drops or invents
an evidence ref; the underlying report's per-item `evidenceRefs` are also left
intact in the existing `contextItems` / `doNotTouch` / `verificationHints` JSON.

## What This Does Not Do

- Does not change the `TaskContextReport` schema, factory, validator, or builder.
- Does not add a `--format` flag (deferred; see below) or an export command.
- Does not execute, approve, write source, create a WorkOrder / VerificationPlan,
  or run Circe.
- Does not change retrieval, selection, scoring, the graph + lexical fallback, or
  the strict no-index / no-path failure path.

## Deferred Options

- **`--format markdown|json|agent-json`**: deferred. The existing `--json` flag
  already toggles between the human brief and the structured payload, and
  `agentContext` is embedded in that payload, so a separate format selector would
  add surface area without new capability in v1.
- **A separate `context task export` command**: deferred. The report is already
  persisted to the artifact store and printed; a dedicated export command is a
  later convenience, not a v1 need.

## Verification

Full keyless 9-command gate plus a CLI smoke on a `task-context-export` fixture
(graph build → `context task` JSON and human → `artifacts validate` → source
diff). The JSON carries `agentContext` (with `doNotTouch`, `verificationHints`,
`boundaries`); the human brief includes "Read this before editing." plus Core
Context / Do Not Touch / Verification Hints; validation is clean; source is
unchanged.

## Next Step

Recommended next slice: **TaskContextReport Human/Agent Export Safety Review** — a
docs-only review that re-reads the shipped presentation code and confirms the
boundary model holds (no execution, no writes, no approval, evidence preserved,
intent:go still deferred). Alternative: **TaskContextReport Workflow Integration
Decision** (where the export surface plugs into the broader intent/operator flow).

> Update (slice 178 · TaskContextReport Human/Agent Export Safety Review): the slice-177 `rekon context task` human/agent export was reviewed end-to-end and declared safe/stable — presentation only. The TaskContextReport artifact is canonical, human markdown is a rendered view, agent JSON (`agentContext`) is the structured source of truth and is additive (every existing top-level JSON field preserved); verification hints stay hints (`executed:false`), do-not-touch zones stay guidance (`enforced:false`), evidence refs are preserved, boundaries stay all-false; no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export-safety-review.md`](task-context-human-agent-export-safety-review.md).

> Update (slice 179 · TaskContextReport Workflow Integration Decision): the standard Rekon workflow is now context first, plan second, approval third, handoff fourth (Option B). `TaskContextReport` is the standard pre-work context substrate, not a proof artifact — recommended (not required, not automatic) before human/agent implementation and before `intent assess` / `intent plan review`; humans read the markdown brief, agents consume `agentContext`. Consumption stays explicit; `intent prepare` stays lineage-only; prepare / approve / status / handoff stay separately gated; bundle inclusion is optional context only (deferred); no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. First implementation: TaskContextReport Workflow Guide / Agent Instructions. See [`task-context-report-workflow-integration-decision.md`](task-context-report-workflow-integration-decision.md).

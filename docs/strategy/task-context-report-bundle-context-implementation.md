# TaskContextReport Bundle Context Implementation

This memo records the first implementation of the [TaskContextReport Bundle
Context Decision](task-context-report-bundle-context-decision.md) (Option B + E).
`rekon intent bundle write` can now attach one or more `TaskContextReport` refs to
an intent plan bundle as **optional context** — an additive
`manifest.context.taskContextReports[]` section plus Rekon-side `context/`
sidecars — with the Circe handoff projection unchanged. TaskContextReport may be
included in bundles only as optional context, not proof.

## What Shipped

- A repeatable `--task-context-ref <TaskContextReport ref>` flag on
  `rekon intent bundle write`. Each ref is resolved from the artifact store; a
  missing ref fails cleanly (`Artifact not found: <ref>`) and a wrong-type ref
  fails cleanly (`must reference a TaskContextReport`).
- Bounded lineage discovery: `TaskContextReport` refs already recorded in the
  prepared-plan / assessment `header.inputRefs` are attached automatically. The
  discovery reads only those two arrays and silently skips a ref that no longer
  resolves in the store. Explicit refs and lineage refs are de-duplicated by id.
- An additive `manifest.context.taskContextReports[]` section in `manifest.json`.
  Each entry carries `ref`, `role: "optional-agent-context"`, `proof: false`, and
  `sidecars: { markdown, agentJson }`. The section is omitted entirely when no
  task context is attached, leaving the manifest byte-identical to before.
- Three Rekon-side `context/` sidecars, written only when task context is present:
  - `context/task-context.md` — a human brief that opens "This context is optional
    guidance, not proof." and renders, per report, a "Read This Before Editing"
    section, a "Do Not Touch" list tagged "(guidance, not enforced)", a
    "Verification Hints" list tagged "(hint, not executed)", and an all-false
    "Boundaries" list.
  - `context/task-context.agent.json` — the structured agent view. Each entry
    carries the report's `agentContext` block and `proof: false`; the file also
    carries a top-level all-false `boundaries` block.
  - `context/task-context.refs.json` — a minimal ref index marking each report
    `role: "optional-agent-context"`, `proof: false`.
- `rekon intent bundle write --json` reports the attachment under a `taskContext`
  block (`{ included, count, refs, sidecars, proof: false }`, or
  `{ included: false }` when none is attached) without removing any existing field.
  Human output adds one line: "Task context: N optional context report(s)
  included (context/, not proof)." when context is present.

## Why This Is Safe

The producer change is purely additive. With no task context, the bundle is
byte-identical: no `context/` directory, no `manifest.context`, and the
`taskContext` JSON block reports `included: false`. The Circe projection
(`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json`) is built
from the same adapters as before and never references task context — Circe handoff
JSON is unchanged in v1. WorkOrder and VerificationPlan gate files are produced by
the same code paths; task context lives only under `context/` and never appears in
`work-order.md` or `verification-plan.md`.

Task context is context for a human or agent about to edit. It is never proof,
never a gate input, and never an instruction to act.

## Surfaces

| Surface | Behavior |
| --- | --- |
| `--task-context-ref` flag | repeatable; optional; missing/wrong-type fails cleanly |
| lineage discovery | attaches `TaskContextReport` refs from prepared-plan / assessment `inputRefs` |
| `manifest.context.taskContextReports[]` | additive; `role: optional-agent-context`, `proof: false`, sidecar paths |
| `context/task-context.md` | human brief; "optional guidance, not proof" |
| `context/task-context.agent.json` | per-report `agentContext` + all-false boundaries |
| `context/task-context.refs.json` | ref index; `role: optional-agent-context`, `proof: false` |
| `circe/handoff.json` + `circe/phase-plan.json` + `circe/rekon-proof.json` | unchanged; never carries task context |
| `work-order.md` / `verification-plan.md` | unchanged by task context |
| bundle `--json` | additive `taskContext` block; existing fields preserved |

## Boundary Model

- TaskContextReport may be included in bundles only as optional context, not proof.
- TaskContextReport must not be required to write an intent bundle.
- TaskContextReport must not approve plans.
- TaskContextReport must not satisfy WorkOrder or VerificationPlan gates.
- TaskContextReport must not change phase gates.
- TaskContextReport must not execute commands.
- TaskContextReport must not write source files.
- TaskContextReport must not run Circe.
- verification hints remain hints, not executed commands.
- do-not-touch zones remain guidance/context, not enforcement.
- Circe handoff JSON is unchanged in v1.
- intent:go remains deferred.

| Boundary | Decision |
| --- | --- |
| context vs proof | context only |
| required to write a bundle | never required |
| approval | no approval |
| WorkOrder / VerificationPlan gates | not satisfied by context |
| phase gates | unchanged |
| command execution | none |
| source writes | none |
| Circe handoff JSON | unchanged in v1 |
| verification hints | hints only |
| do-not-touch zones | guidance/context |
| intent:go | deferred |

## What This Does Not Do

This implementation adds no automation and changes no runtime gate. It does not
make task context required to write a bundle, does not let context approve a plan,
does not let context satisfy a WorkOrder, VerificationPlan, or phase gate, does not
execute a verification hint or any target-repo command, does not write source, and
does not run Circe or bring intent:go forward. The Circe handoff projection is
unchanged; Circe is not required to know TaskContextReport internals in v1.

## Verification

- `tests/contract/task-context-bundle-context.test.mjs` replays the full operator
  path keyless and asserts the manifest section, the three sidecars, the markdown
  framing, the unchanged Circe / WorkOrder / VerificationPlan surfaces, the
  clean-failure cases, the no-source / no-command / no-go invariants, and the
  help surface.
- `tests/docs/task-context-report-bundle-context.test.mjs` locks the boundary
  language in this memo, the CHANGELOG entry, and the review packet.

## Next Step

The recommended follow-up is a **TaskContextReport Bundle Context Safety Review**:
re-read the shipped producer + CLI surfaces end-to-end and confirm the additive,
context-only, Circe-unchanged guarantees hold under review.

> Update (slice 184 · TaskContextReport Bundle Context Safety Review): the slice-183 bundle-context implementation was reviewed end-to-end and declared safe/stable — optional `TaskContextReport` context in intent bundles holds every boundary. TaskContextReport may be included in bundles only as optional context, not proof, and is not required to write an intent bundle: a bundle with no ref is byte-identical; a bundle with a ref adds only `manifest.context.taskContextReports[]` (`proof: false`, `role: optional-agent-context`) and the `context/` sidecars (`task-context.md` optional guidance not proof, `task-context.agent.json` all-false boundaries, `task-context.refs.json` refs + `proof:false`). The Circe handoff JSON is unchanged in v1; WorkOrder / VerificationPlan / phase gates unchanged; missing + wrong-type refs fail cleanly; lineage discovery stays bounded and optional. No approval / command execution / source write / WorkOrder / VerificationPlan / Circe; verification hints stay hints; do-not-touch stays guidance; intent:go remains deferred. Recommended next: TaskContextReport Bundle Context Dogfood. See [`task-context-report-bundle-context-safety-review.md`](task-context-report-bundle-context-safety-review.md).

> Update (slice 185 · TaskContextReport Bundle Context Dogfood): the optional bundle-context sidecars were dogfooded on a realistic operator/agent handoff path (full intent path → `intent bundle write --task-context-ref` → validate). bundle write succeeded; `manifest.context.taskContextReports` (`proof:false`, `role: optional-agent-context`) was discoverable; the `context/task-context.md` human brief, `context/task-context.agent.json` agent view, and `context/task-context.refs.json` traceability index were all useful; bundle JSON reported the `taskContext` sidecars; the Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. One narrow human-discoverability gap was fixed: the bundle `README.md` now renders an additive "## Task context" section (guidance, not proof) only when a TaskContextReport is attached. Sidecars are ready for broader handoff use. Next: TaskContextReport Bundle Context Dogfood Safety Review. See [`task-context-report-bundle-context-dogfood.md`](task-context-report-bundle-context-dogfood.md).

> Update (slice 186 · TaskContextReport Bundle Context Dogfood Safety Review): the slice-185 dogfood result + the narrow bundle-README discoverability fix were reviewed end-to-end and declared safe/stable. TaskContextReport bundle context is optional context, not proof; the full bundle-context dogfood path completed successfully; `manifest.context.taskContextReports` was discoverable (`proof:false`, `role: optional-agent-context`); the `context/task-context.md` / `.agent.json` / `.refs.json` sidecars were useful to humans, agents, and traceability; the bundle README now points to the sidecars (guidance, not proof) when context is attached and is omitted otherwise; Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. Bundle context is ready for broader handoff use. Next: TaskContextReport Bundle Context Broader Handoff Decision. See [`task-context-report-bundle-context-dogfood-safety-review.md`](task-context-report-bundle-context-dogfood-safety-review.md).

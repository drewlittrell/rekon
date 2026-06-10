# TaskContextReport Bundle Context Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **Slice 182 · strategy / architecture decision batch.** Base `300c6ee`.
> Decision-only — no runtime behavior change, no source change, no new artifact, no
> CLI command, no Circe schema change. Decides whether and how optional
> `TaskContextReport` refs should appear in intent bundles / handoffs as context for
> agents and operators. **Selected: Option B + E — optional `TaskContextReport`
> bundle context via additive `manifest.context` refs and Rekon-side `context/`
> sidecars, with the Circe handoff schema unchanged.** First implementation:
> **TaskContextReport Bundle Context Implementation**.

## Decision Summary

`TaskContextReport` is the standard pre-work context substrate. It already feeds
`intent assess` / `intent plan review` by explicit ref, but `rekon intent bundle
write` does not yet carry it forward. An agent receiving a bundle handoff would
benefit from the same context a human used pre-work.

**Decision: Option B + E.** Intent bundles *may* include `TaskContextReport`
references and rendered context as **optional context for agents/operators**,
surfaced as (1) an additive `manifest.context.taskContextReports[]` ref list and
(2) Rekon-side sidecar files under `context/`. The Circe handoff JSON
(`circe/handoff.json` / `phase-plan.json` / `rekon-proof.json`) stays unchanged in
v1. `TaskContextReport` remains context, not proof; optional, not required;
non-authoritative for approval, WorkOrder / VerificationPlan, and phase gates;
non-executing; non-source-writing. The first implementation slice is the
**TaskContextReport Bundle Context Implementation**.

## Why This Decision Exists

The context-first workflow (context first, plan second, approval third, handoff
fourth) is documented and safety-reviewed. The remaining architecture question is
the *handoff* edge: a bundle is closer to execution orchestration than a pre-work
brief, so carrying context into it must not let context masquerade as proof,
approval, or a gate. This decision draws that line before any implementation:
context may *accompany* a bundle, but it must never *authorize* the work the bundle
hands off.

## Current Bundle Surface

Grounded in `packages/capability-docs/src/intent-plan-bundle.ts` (no
`TaskContextReport` reference exists today — 0 hits):

- **`manifest.json`** is a `Record<string, unknown>` with
  `schemaVersion: "0.1.0"`, `bundleKind: "intent-plan"`, `intentId`,
  `generatedAt`, `status`, `sourceArtifacts` (the input artifact-ref map surfaced
  in the README "## Source refs"), `staleness`, `files`, and
  `boundaries: { canonicalTruth: ".rekon/artifacts", executesCommands: false,
  writesSourceFiles: false, implementsIntentGo: false }`. It already carries an
  additive `manifest.circe` section — so a new additive `manifest.context` section
  is feasible without schema breakage.
- **Files emitted:** `manifest.json`, `README.md`, `verification-plan.md`,
  `agent/{handoff.md, context.json, instructions.md, constraints.md,
  verification.json, source-refs.json}`, `circe/{handoff.json, phase-plan.json,
  rekon-proof.json}`. (The existing `agent/context.json` is the bundle's
  agent-handoff context, distinct from a `TaskContextReport`'s `agentContext`; new
  task-context sidecars use distinct `context/` paths to avoid collision.)
- **Circe projection (`manifestCirce`):** `artifacts: { workOrders,
  verificationPlans }`, `phaseGates`, `phaseVerification`, and per-phase
  `phaseBoundaries: { sourceWriteAllowed: false, commandsExecuted: false,
  intentGoDeferred: true }`. It never claims approval. Its schema is derived from
  real Circe adapters (`src/adapters/rekon-handoff.ts`, `rekon-phase-plan-import.ts`,
  etc.), so it must stay stable.
- **CLI:** `rekon intent bundle write [--intent-id] [--assessment]
  [--prepared-plan] [--intent-status] [--work-order] [--verification-plan]
  [--path-freshness] [--runtime-drift] [--root] [--json]` — **no
  `--task-context-ref` today.**

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| no bundle inclusion | rejected/deferred | handoff agents lose context |
| optional context refs | selected | useful without proof authority |
| required context | rejected | context is not proof |
| embed full agentContext in Circe handoff | rejected/deferred | schema coupling / bloat |
| Rekon-side sidecar context | selected | compatible and inspectable |

- **Option A (no inclusion)** — rejected/deferred: an agent handed a bundle should
  see the same context the human used.
- **Option B (optional context refs)** — selected: improves agent/operator handoffs
  without proof authority.
- **Option C (required context)** — rejected: context is not proof and must not gate
  bundle packaging.
- **Option D (embed full agentContext into Circe handoff)** — rejected/deferred:
  couples Circe to the Rekon context shape and bloats the import package; prefer
  refs or sidecars first.
- **Option E (Rekon-side sidecar)** — selected (with B): the best compatibility
  path — context is available to agents/operators without changing what Circe must
  import.

## Recommendation

Adopt **Option B + E**. Carry optional `TaskContextReport` refs in
`manifest.context.taskContextReports[]` and render Rekon-side sidecar context under
`context/`, keeping the Circe handoff schema stable. Discover refs from the
PreparedIntentPlan / IntentAssessmentReport / IntentPlanActionabilityReport lineage
and accept an explicit `--task-context-ref`; defer `--include-task-context latest`
unless it is clearly low-risk. A bundle with no `TaskContextReport` still works.
First implementation: **TaskContextReport Bundle Context Implementation**.

### Decision questions

1. Include refs in bundles? Yes — optional. 2. Optional or required? **Optional.**
3. Automatic when lineage includes it? Yes, lineage-discovered refs may be included
automatically as optional context. 4. Explicit operator ref to bundle write? Yes —
`--task-context-ref`. 5. Where? `manifest.context.taskContextReports[]` + README +
`context/` sidecars. 6. Copy `agentContext` or reference? Both: a ref in the
manifest and an optional rendered `context/task-context.agent.json` sidecar
(copied, but marked non-proof). 7. Render human markdown into the bundle? Yes,
optional `context/task-context.md` sidecar. 8. Appear in Circe handoff JSON? **No
in v1.** 9. Only in Rekon-side bundle docs? Yes in v1. 10. Circe treats it as
context only? Yes. 11. WorkOrder generation depend on it? **No.** 12.
VerificationPlan generation depend on it? **No.** 13. Affect phase gates? **No.**
14. Affect proof status? **No.** 15. Affect approval? **No.** 16.
Stale/missing refs? Tolerate — include a `context/task-context.refs.json` listing
refs with a `proof: false` role; a missing report is a no-op (bundle still
writes), and a stale report is surfaced as a warning, never a blocker. 17. Agent
output use inside a bundle? Read the `context/` sidecars as orientation only, under
the same agent instructions (consume before editing, never as authority). 18. Next
slice? **TaskContextReport Bundle Context Implementation.**

## Bundle Context Model

`TaskContextReport` bundle context appears as:

- artifact refs in the bundle manifest (`manifest.context.taskContextReports[]`)
  and the README "## Source refs" / a context summary;
- an optional rendered markdown sidecar (`context/task-context.md`);
- an optional agent JSON sidecar (`context/task-context.agent.json`);
- an optional refs sidecar (`context/task-context.refs.json`);
- **not** as required Circe schema fields in v1.

Suggested manifest section:

```json
{
  "context": {
    "taskContextReports": [
      {
        "ref": { "type": "TaskContextReport", "id": "..." },
        "role": "optional-agent-context",
        "proof": false
      }
    ]
  }
}
```

The `proof: false` / `role: "optional-agent-context"` markers make the
non-authoritative status explicit in the data, mirroring the existing all-false
`manifest.boundaries`.

## Handoff And Circe Boundary

Circe should not be required to know TaskContextReport internals in v1. The Circe
handoff schema (`circe/handoff.json` / `phase-plan.json` / `rekon-proof.json`) stays
stable; Rekon-side sidecars and manifest context refs come first. If a later
decision lets Circe read context, it may read the optional sidecar — but Circe must
not treat it as proof, must not execute verification hints from it automatically,
and must not override WorkOrder / VerificationPlan gates because of it.

## Consumer Model

| Consumer | Use |
| --- | --- |
| human operator | read markdown sidecar |
| agent | read agent JSON sidecar |
| Rekon proof review | see context refs |
| Circe | optional sidecar only, no requirement |
| WorkOrder / VerificationPlan | no direct consumption |

## Boundary Model

- TaskContextReport may be included in bundles only as optional context, not proof.
- TaskContextReport must not be required to write an intent bundle.
- TaskContextReport must not approve plans.
- TaskContextReport must not satisfy WorkOrder or VerificationPlan gates.
- TaskContextReport must not change phase gates.
- TaskContextReport must not execute commands.
- TaskContextReport must not write source files.
- TaskContextReport must not run Circe.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- Circe should not be required to know TaskContextReport internals in v1.
- intent:go remains deferred.

| Option | Decision | Reason |
| --- | --- | --- |
| no bundle inclusion | rejected/deferred | handoff agents lose context |
| optional context refs | selected | useful without proof authority |
| required context | rejected | context is not proof |
| embed full agentContext in Circe handoff | rejected/deferred | schema coupling / bloat |
| Rekon-side sidecar context | selected | compatible and inspectable |

| Bundle Surface | Decision |
| --- | --- |
| manifest | optional TaskContextReport refs |
| README / summary | mention context refs |
| markdown sidecar | optional rendered context |
| agent JSON sidecar | optional structured context |
| Circe handoff JSON | unchanged in v1 |
| WorkOrder / VerificationPlan | unchanged |

| Boundary | Decision |
| --- | --- |
| context vs proof | optional context only |
| context vs approval | no approval |
| context vs gates | no WorkOrder / VerificationPlan gate authority |
| context vs phase gates | no phase gate authority |
| command execution | no execution |
| source writes | no writes |
| Circe | not required to know internals |
| intent:go | deferred |

| Consumer | Use |
| --- | --- |
| human operator | read markdown sidecar |
| agent | read agent JSON sidecar |
| Rekon proof review | see context refs |
| Circe | optional sidecar only, no requirement |
| WorkOrder / VerificationPlan | no direct consumption |

## What This Does Not Do

This decision implements no bundle changes. It changes no runtime behavior, no
`intent bundle write` behavior, no Circe handoff schema, no WorkOrder generation,
and no VerificationPlan generation. It does not make `TaskContextReport` required
proof or automatic, does not approve plans, does not execute hints or commands,
does not write source, does not create WorkOrder / VerificationPlan, does not run
Circe, and does not bring intent:go forward.

## Implementation Sequence

1. **TaskContextReport Bundle Context Implementation** (next): add
   `--task-context-ref` to `intent bundle write`, lineage-discover context refs
   when safe, render `context/` sidecars, add `manifest.context.taskContextReports[]`
   — with no Circe schema requirement and no proof authority.
2. **TaskContextReport Bundle Context Safety Review** (after implementation):
   confirm the bundle context surface crosses no boundary.
3. Deferred unless re-decided: embedding `agentContext` into the Circe handoff
   JSON, `--include-task-context latest`, any gate/approval dependency, intent:go.

> Update (slice 183 · TaskContextReport Bundle Context Implementation): `rekon intent bundle write` now attaches optional `TaskContextReport` refs via a repeatable `--task-context-ref` (plus bounded lineage discovery from prepared-plan / assessment `inputRefs`) as an additive `manifest.context.taskContextReports[]` section (`role: optional-agent-context`, `proof: false`) plus three Rekon-side `context/` sidecars (`task-context.md` / `task-context.agent.json` / `task-context.refs.json`). With no ref the bundle is byte-identical; a missing / wrong-type ref fails cleanly. The Circe handoff projection (`circe/handoff.json` etc.) and the WorkOrder / VerificationPlan / phase-gate files are unchanged and never carry task context. TaskContextReport may be included in bundles only as optional context, not proof — it must not be required to write an intent bundle, approve plans, satisfy WorkOrder/VerificationPlan or phase gates, execute commands, write source, or run Circe; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON is unchanged in v1; intent:go remains deferred. Implements the slice-182 decision (Option B + E). See [`task-context-report-bundle-context-implementation.md`](task-context-report-bundle-context-implementation.md).

> Update (slice 184 · TaskContextReport Bundle Context Safety Review): the slice-183 bundle-context implementation was reviewed end-to-end and declared safe/stable — optional `TaskContextReport` context in intent bundles holds every boundary. TaskContextReport may be included in bundles only as optional context, not proof, and is not required to write an intent bundle: a bundle with no ref is byte-identical; a bundle with a ref adds only `manifest.context.taskContextReports[]` (`proof: false`, `role: optional-agent-context`) and the `context/` sidecars (`task-context.md` optional guidance not proof, `task-context.agent.json` all-false boundaries, `task-context.refs.json` refs + `proof:false`). The Circe handoff JSON is unchanged in v1; WorkOrder / VerificationPlan / phase gates unchanged; missing + wrong-type refs fail cleanly; lineage discovery stays bounded and optional. No approval / command execution / source write / WorkOrder / VerificationPlan / Circe; verification hints stay hints; do-not-touch stays guidance; intent:go remains deferred. Recommended next: TaskContextReport Bundle Context Dogfood. See [`task-context-report-bundle-context-safety-review.md`](task-context-report-bundle-context-safety-review.md).

> Update (slice 185 · TaskContextReport Bundle Context Dogfood): the optional bundle-context sidecars were dogfooded on a realistic operator/agent handoff path (full intent path → `intent bundle write --task-context-ref` → validate). bundle write succeeded; `manifest.context.taskContextReports` (`proof:false`, `role: optional-agent-context`) was discoverable; the `context/task-context.md` human brief, `context/task-context.agent.json` agent view, and `context/task-context.refs.json` traceability index were all useful; bundle JSON reported the `taskContext` sidecars; the Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. One narrow human-discoverability gap was fixed: the bundle `README.md` now renders an additive "## Task context" section (guidance, not proof) only when a TaskContextReport is attached. Sidecars are ready for broader handoff use. Next: TaskContextReport Bundle Context Dogfood Safety Review. See [`task-context-report-bundle-context-dogfood.md`](task-context-report-bundle-context-dogfood.md).

> Update (slice 186 · TaskContextReport Bundle Context Dogfood Safety Review): the slice-185 dogfood result + the narrow bundle-README discoverability fix were reviewed end-to-end and declared safe/stable. TaskContextReport bundle context is optional context, not proof; the full bundle-context dogfood path completed successfully; `manifest.context.taskContextReports` was discoverable (`proof:false`, `role: optional-agent-context`); the `context/task-context.md` / `.agent.json` / `.refs.json` sidecars were useful to humans, agents, and traceability; the bundle README now points to the sidecars (guidance, not proof) when context is attached and is omitted otherwise; Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. Bundle context is ready for broader handoff use. Next: TaskContextReport Bundle Context Broader Handoff Decision. See [`task-context-report-bundle-context-dogfood-safety-review.md`](task-context-report-bundle-context-dogfood-safety-review.md).

> Update (slice 187 · TaskContextReport Bundle Broader Handoff Decision): decided how broader operator/agent handoff workflows should use the optional bundle-context sidecars (Option B — promote them in human/agent handoff guidance, recommended not required). Humans should inspect `context/task-context.md` when present; agents should read `context/task-context.agent.json` when present; the follow-up will point `agent/instructions.md` + `agent/handoff.md` (and optionally `agent/context.json` metadata) at the sidecars. TaskContextReport sidecars are optional context, not proof — must not be required to write an intent bundle, approve plans, execute commands, write source, or satisfy WorkOrder/VerificationPlan or phase gates; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; intent:go remains deferred. First implementation: TaskContextReport Bundle Handoff Guidance Implementation. See [`task-context-report-bundle-broader-handoff-decision.md`](task-context-report-bundle-broader-handoff-decision.md).

# TaskContextReport Workflow Integration Decision

> **Slice 179 · strategy / architecture decision batch.** Base `af26127`.
> Decision-only — no runtime behavior change, no source change, no new artifact,
> no CLI command. Decides how `TaskContextReport` appears in broader operator and
> agent workflows now that the artifact, the `rekon context task` command, the
> intent integration, the dogfood, the provider-fallback fix, and the human/agent
> export (with its safety review) are all shipped. **Selected: Option B —
> context-first workflow policy.** First implementation: **TaskContextReport
> Workflow Guide / Agent Instructions**.

## Decision Summary

`TaskContextReport` is the standard pre-work context substrate, not a proof
artifact. It is built by `rekon context task`, rendered as a human "read this
before editing" markdown brief, and emitted as a structured `agentContext` JSON
block. The remaining question is workflow policy: where this context surface
belongs in everyday Rekon use.

**Decision: Option B — context-first workflow policy.** The standard workflow
becomes **context first, plan second, approval third, handoff fourth**.
`TaskContextReport` is *recommended* (not required, not automatic) before human
implementation, agent implementation, `intent assess`, `intent plan review`, and
plan answering/refinement. It stays optional context, never proof, approval,
execution, or source mutation. Consumption stays explicit. Bundle/handoff
inclusion is approved in principle as optional context only, with implementation
deferred. The first implementation slice is the **TaskContextReport Workflow
Guide / Agent Instructions** (documentation/product surface; no runtime change).

## Why This Decision Exists

The artifact and CLI already exist and are safety-reviewed. The next product step
is not more machinery — it is *policy*: teaching humans and agents to use the
context surface consistently before adding automation or bundle changes. Without a
decision, `rekon context task` stays an ad hoc command users discover by accident,
which undersells a now-reviewed substrate. Context-first means context before
planning or editing, not context as approval — a workflow habit, not a new gate.

## Current Workflow Surface

- `rekon context task` writes one `TaskContextReport`, renders the human markdown
  brief ("Read this before editing."), and emits `agentContext` JSON (task,
  core/supporting context, do-not-touch with `enforced:false`, verification hints
  with `executed:false`, warnings, deduped evidence, all-false boundaries).
- `rekon intent assess` and `rekon intent plan review` consume `TaskContextReport`
  **explicitly** via `--task-context latest` / `--task-context-ref <ref>` (opt-in;
  resolved through `resolveTaskContextSelection` → `selectTaskContextReports`).
  Used reports enrich assessment `matchedContext` and plan-review `revisionPrompt`
  as additive context — never readiness, never proof.
- `rekon intent prepare` does **not** consume `TaskContextReport` directly. It
  takes `--assessment` / `--actionability-report` and receives context only by
  lineage through those artifacts.
- `intent approve` / `intent status` / `intent work-order generate` /
  `intent verification-plan generate` / `intent bundle write` remain separately
  gated; none depend on `TaskContextReport`.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| ad hoc context command only | rejected/deferred | undersells reviewed substrate |
| context-first workflow policy | selected | improves work without automation |
| automatic context generation | rejected | surprise/staleness/provider risk |
| require context for handoff | rejected/deferred | context is not proof |
| optional bundle context | selected/deferred | useful context, no authority |

- **Option A (ad hoc command only)** — rejected/deferred: leaves a reviewed
  substrate undiscovered.
- **Option B (context-first workflow policy)** — selected: improves human/agent
  work without adding automation, cost surprises, or new gates.
- **Option C (auto-generate context in intent commands)** — rejected: surprising
  provider cost, staleness, and behavior; explicit context is safer.
- **Option D (require context for WorkOrder/VerificationPlan)** — rejected/
  deferred: `TaskContextReport` is context, not proof, and must not gate handoffs.
- **Option E (optional bundle context)** — selected in principle / deferred to
  implementation: useful for agents and operators, but must remain optional
  context with no authority.

## Recommendation

Adopt **Option B**. Make `TaskContextReport` the recommended pre-work artifact for
humans and agents, document the context-first workflow, and pin the human and
agent consumption policies. Keep consumption explicit and bundle inclusion
deferred. First implementation: **TaskContextReport Workflow Guide / Agent
Instructions**.

### Decision questions

1. Standard operator workflow? Yes — recommended, not required. 2. Standard agent
workflow? Yes — recommended. 3. When recommended? Before planning or editing
(human or agent), and before `intent assess` / `intent plan review`. 4. When
required? Not required in v1 — recommended only. 5. Is `rekon context task` the
canonical pre-work command? Yes. 6. Should README / onboarding teach context-first
workflows? Yes (first implementation). 7. Should agents read `agentContext` before
editing? Yes. 8. Should humans read the markdown brief before editing? Yes. 9.
Should assess / plan review recommend generating context first? Yes (guidance). 10.
Should assess / plan review auto-generate it? **No.** 11. Bundle / handoff
inclusion? Optional context, deferred to a later decision/implementation. 12.
Optional context or required proof if included? **Optional context.** 13. Should
WorkOrder / VerificationPlan depend on it? **No.** 14. Should verification hints
ever execute? **No.** 15. Should do-not-touch zones become gates? **No, not yet.**
16. Stale `TaskContextReport`s? Treat as guidance; recommend regenerating after
material source change (path-freshness/graph rebuild). The workflow guide should
say "regenerate context if the repo changed"; no automatic invalidation in v1. 17.
First implementation slice? **TaskContextReport Workflow Guide / Agent
Instructions.** 18. Deferred? Auto-generation, bundle/handoff inclusion,
do-not-touch enforcement, required-context gating, intent:go.

## Context-First Workflow

The standard workflow is **context first, plan second, approval third, handoff
fourth**:

1. **Build / refresh evidence:** `rekon scan`; `rekon capability graph build`;
   optional `rekon scan --semantic-files auto`; optional
   `rekon embeddings index --changed`.
2. **Build task context:** `rekon context task --task "<task>" [--path <path>] --json`.
3. **Human reads the markdown brief:** "Read this before editing." — Core Context,
   Related / Supporting Context, Do Not Touch, Verification Hints, Warnings,
   Evidence.
4. **Agent reads `agentContext`:** paths, constraints, do-not-touch zones,
   verification hints, warnings, evidence refs, boundaries.
5. **Operator passes context explicitly:**
   `rekon intent assess --task-context-ref <ref>`;
   `rekon intent plan review --task-context-ref <ref>`.
6. **Prepare / approve / status / handoff remain separate:** no task-context proof
   or approval authority.

## Human And Agent Policy

Humans use the markdown brief for orientation; agents use the `agentContext` JSON
for structured behavior. Humans should read the markdown brief before editing.
Agents should consume agentContext before editing.

- **Human policy:** read "Core Context"; respect "Do Not Touch"; treat
  "Verification Hints" as suggestions; inspect warnings before editing.
- **Agent policy:** consume `agentContext`; only touch listed/justified paths
  unless instructed otherwise; treat `doNotTouch` as strong guidance; never
  execute hints unless a separate workflow explicitly commands it; never treat
  boundaries as permission to write.

## Intent Workflow Relationship

`rekon intent assess` and `rekon intent plan review` should *recommend* generating
a `TaskContextReport` first and accept it via the existing explicit
`--task-context` flags. They must not auto-generate it. `rekon intent prepare`
continues to receive context by lineage only (through assessment / actionability
artifacts) and gains no task-context dependency. Prepare / approve / status /
handoff remain separately gated. TaskContextReport consumption remains explicit
unless a future decision changes it.

## Bundle And Handoff Context

`TaskContextReport` may be included in future bundles only as optional context,
not proof. A future bundle could carry a `contextRefs: [TaskContextReport ref]`
list or an `agentContext` / `taskContext` section. Such inclusion must not be
required proof, must not unlock WorkOrder / VerificationPlan generation, must not
change approval, and must not change the `sourceWriteAllowed` / `commandsExecuted`
/ `runsCirce` gates. Implementation is deferred to a dedicated **TaskContextReport
Bundle Context Decision**.

## Boundary Model

- TaskContextReport is the standard pre-work context substrate, not a proof artifact.
- Context-first means context before planning or editing, not context as approval.
- Humans should read the markdown brief before editing.
- Agents should consume agentContext before editing.
- TaskContextReport must not approve plans.
- TaskContextReport must not execute commands.
- TaskContextReport must not write source files.
- TaskContextReport must not create WorkOrder or VerificationPlan.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- TaskContextReport consumption remains explicit unless a future decision changes it.
- Prepare / approve / status / handoff remain separately gated.
- TaskContextReport may be included in bundles only as optional context, not proof.
- intent:go remains deferred.

| Workflow Step | Decision |
| --- | --- |
| build evidence | scan / graph / optional semantic / optional embeddings |
| build task context | context task |
| human orientation | markdown brief |
| agent orientation | agentContext JSON |
| intent assessment/review | explicit task-context refs |
| prepare / approve / status / handoff | separately gated |

| Consumer | Uses |
| --- | --- |
| human | markdown brief |
| agent | agentContext JSON |
| intent assess | optional explicit context |
| intent plan review | optional explicit context |
| bundle/handoff | optional context refs later |

| Boundary | Decision |
| --- | --- |
| context vs proof | context only |
| context vs approval | no approval |
| context vs command execution | no execution |
| context vs source writes | no writes |
| context vs WorkOrder / VerificationPlan | not created |
| verification hints | hints only |
| do-not-touch zones | guidance/context |
| intent:go | deferred |

## What This Does Not Do

This decision implements no workflow integration. It changes no runtime behavior,
no `context task` behavior, and no `intent assess` / `plan review` / `prepare`
behavior. It does not make `TaskContextReport` automatic anywhere, does not make it
proof, does not approve plans, does not execute hints or commands, does not write
source, does not create WorkOrder / VerificationPlan, does not run Circe, does not
add bundle changes, and does not bring intent:go forward.

## Implementation Sequence

1. **TaskContextReport Workflow Guide / Agent Instructions** (next): a docs /
   product surface for context-first work — README / docs workflow guide, agent
   instruction text, "run context task before editing" guidance, optional
   examples; no runtime change unless small help-text improvements are needed.
2. **TaskContextReport Bundle Context Decision** (later): decide how optional
   `TaskContextReport` refs appear in intent bundles / handoffs as optional
   context.
3. Deferred indefinitely unless re-decided: auto-generation in intent commands,
   do-not-touch enforcement, required-context gating, intent:go.

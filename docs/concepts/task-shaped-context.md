# Task-Shaped Context

> **Broader-workflow role decided (slice 176):** TaskContextReport is the standard
> pre-intent / pre-work context substrate — context only, never proof/approval;
> consumption stays explicit; the deterministic spine stays separately gated;
> intent:go deferred. See
> [TaskContextReport Broader Workflow Decision](../strategy/task-context-report-broader-workflow-decision.md).

> **Provider-default UX fixed (slice 175):** `rekon context task` with an existing
> embeddings index, no `--path`, and an implicitly-defaulted provider whose key is
> missing now degrades to a graph + lexical context fallback instead of exiting
> non-zero; explicit-provider failures stay strict; task context stays
> proposal/context, not proof; intent:go deferred. See
> [Intent Planning UX / Context Quality Fix](../strategy/intent-planning-ux-context-quality-fix.md).

> **Intent dogfood safety-reviewed (slice 174):** the slice-173 dogfood was reviewed
> end-to-end and declared safe/stable — completion came from the existing readiness /
> actionability / approval / status / handoff gates, not from task context weakening any
> boundary; intent:go deferred. See
> [TaskContextReport Intent Dogfood Safety Review](../strategy/task-context-report-intent-dogfood-safety-review.md).

> **Intent path dogfooded (slice 173):** the full operator path was run with opt-in task
> context — it improved matchedContext / revisionPrompt while every readiness /
> actionability / approval / status / handoff gate held; source unchanged. See
> [TaskContextReport Intent Dogfood](../strategy/task-context-report-intent-dogfood.md).

> **Intent integration safety-reviewed (slice 172):** the slice-171 opt-in consumption
> by `rekon intent assess` / `rekon intent plan review` was reviewed end-to-end and
> declared safe/stable — additive context only (never proof/approval), prepare by
> lineage; intent:go deferred. See
> [TaskContextReport Intent Integration Safety Review](../strategy/task-context-report-intent-integration-safety-review.md).

> **Intent integration implemented (slice 171):** `rekon intent assess` and `rekon
> intent plan review` now accept opt-in `--task-context latest|<ref>` — additive
> context only (readiness / status decided first; never proof, never approval). See
> [TaskContextReport Intent Integration Implementation](../strategy/task-context-report-intent-integration-implementation.md).

> **Intent integration decided (slice 170):** TaskContextReport will be explicit,
> opt-in context for `rekon intent assess` and `rekon intent plan review` (prepare by
> lineage only); context, not proof. See
> [TaskContextReport Intent Integration Decision](../strategy/task-context-report-intent-integration-decision.md).

> **Selection quality fixed (slice 169):** free-form verification intent now creates
> a hint (no command invented); weak-band retrieval is gated to labelled supporting
> context with `retrieval-low-signal` kept visible. See
> [TaskContextReport Selection Quality Fix](../strategy/task-context-report-selection-quality-fix.md).

> **Dogfooded (slice 168):** dogfooded on explicit-path and retrieval scenarios —
> the explicit-path + graph baseline is useful and reliable; the lexical mock
> retrieval path is low-signal (a real embedding provider is needed). Context, not
> proof. See
> [TaskContextReport Dogfood Review](../strategy/task-context-report-dogfood-review.md).

> **Safety-reviewed (slice 167):** task-shaped context found safe/stable as
> proposal/context. See
> [TaskContextReport Safety Review](../strategy/task-context-report-safety-review.md).

> **Shipped (slice 166):** task-shaped context is the first product consumer of
> embedding retrieval — the `TaskContextReport` artifact and the
> `rekon context task` command. See
> [TaskContextReport](../artifacts/task-context-report.md) and the
> [Task-Shaped Context / Embedding Retrieval Decision](../strategy/task-shaped-context-embedding-retrieval-decision.md).

## What it is

Task-shaped context turns a concrete task ("add a marker export; do not change
greet; verify with typecheck") into a compact, explainable bundle of the facts,
neighbors, constraints, and verification hints an implementer (human or agent)
needs before working it — not a generic file list, and not proof.

It combines:

- **deterministic graph facts** — files, symbols, capabilities, and claims from
  the `CapabilityEvidenceGraph` connected to the task's paths;
- **embedding-retrieval neighbors** — score-banded nearest chunks (strong / useful
  / weak / ignored) from the embedding cache;
- **operator-provided paths** — always included, high priority;
- **do-not-touch zones** — surfaced from explicit task constraints;
- **verification hints** — suggested commands or artifacts, surfaced as hints.

Every context item, do-not-touch zone, and verification hint carries `evidenceRefs`
that point back at graph evidence/claims, retrieval chunks, or operator input.

## How selection works

1. Operator-provided paths are included as high-priority context.
2. Strong and useful embedding neighbors are included; weak neighbors are
   optional/supporting; ignored neighbors are excluded by default.
3. Selected paths are expanded through the `CapabilityEvidenceGraph`; deterministic
   facts are admitted even when the embedding score is lower.

The artifact is canonical structured JSON; the human/markdown view is a rendering
of it. So humans and agents never diverge on facts.

## Boundaries

Task-shaped context is **context**, not judgment or automation:

- **Task-shaped context is proposal/context, not proof.**
- **Embedding retrieval is proposal/context, not proof.**
- **CapabilityEvidenceGraph remains the evidence substrate.**
- **Deterministic graph facts outrank embedding similarity.**
- **Task context must not approve plans.**
- **Task context must not execute commands.**
- **Task context must not write source files.**
- **Task context must not create WorkOrder or VerificationPlan.**
- **Task context must not run Circe.**
- **Task context must preserve evidence refs.**
- **Verification hints are hints, not executed commands.**
- **Duplicate detection remains deferred.**
- **Canonical recommendations remain deferred.**
- **intent:go remains deferred.**

## See also

- Artifact: [TaskContextReport](../artifacts/task-context-report.md)
- Concept: [Capability Evidence Graph](./capability-evidence-graph.md)
- Concept: [Embedding Provider / Index](./embedding-provider-index.md)

> Update (slice 177 · TaskContextReport Human/Agent Context Export): `rekon context task` now prints a human "read this before editing" brief (Core Context, Related / Supporting Context, Do Not Touch, Verification Hints, Evidence) and adds an additive `agentContext` block to its `--json` payload. Presentation only — the TaskContextReport artifact stays canonical, human markdown is a rendered view, agent JSON is the structured source of truth; every existing JSON field preserved; verification hints stay hints, do-not-touch stays guidance, evidence preserved; no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export.md`](../strategy/task-context-human-agent-export.md).

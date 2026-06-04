# Task-Shaped Context

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

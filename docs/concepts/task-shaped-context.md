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

> Update (slice 178 · TaskContextReport Human/Agent Export Safety Review): the slice-177 `rekon context task` human/agent export was reviewed end-to-end and declared safe/stable — presentation only. The TaskContextReport artifact is canonical, human markdown is a rendered view, agent JSON (`agentContext`) is the structured source of truth and is additive (every existing top-level JSON field preserved); verification hints stay hints (`executed:false`), do-not-touch zones stay guidance (`enforced:false`), evidence refs are preserved, boundaries stay all-false; no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export-safety-review.md`](../strategy/task-context-human-agent-export-safety-review.md).

> Update (slice 179 · TaskContextReport Workflow Integration Decision): the standard Rekon workflow is now context first, plan second, approval third, handoff fourth (Option B). `TaskContextReport` is the standard pre-work context substrate, not a proof artifact — recommended (not required, not automatic) before human/agent implementation and before `intent assess` / `intent plan review`; humans read the markdown brief, agents consume `agentContext`. Consumption stays explicit; `intent prepare` stays lineage-only; prepare / approve / status / handoff stay separately gated; bundle inclusion is optional context only (deferred); no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. First implementation: TaskContextReport Workflow Guide / Agent Instructions. See [`task-context-report-workflow-integration-decision.md`](../strategy/task-context-report-workflow-integration-decision.md).

> Update (slice 180 · TaskContextReport Workflow Guide / Agent Instructions): the context-first workflow is now documented for humans and agents. The canonical pre-work sequence is `rekon scan` → `rekon capability graph build` → `rekon context task` → `rekon artifacts latest --type TaskContextReport --id-only` → `rekon intent assess` / `rekon intent plan review --task-context-ref`. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; TaskContextReport stays context, not proof — no approval / execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; intent:go deferred. See [`task-context-workflow.md`](../guides/task-context-workflow.md).

> Update (slice 181 · TaskContextReport Workflow Guide Safety Review): the slice-180 workflow guide + agent instructions were reviewed end-to-end and declared safe/stable — docs/product surface only, guidance not automation. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; every documented command was confirmed against the live CLI. TaskContextReport stays context, not proof — no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; bundle inclusion optional context only; intent:go deferred; the workflow guide introduces no runtime behavior changes. See [`task-context-workflow-guide-safety-review.md`](../strategy/task-context-workflow-guide-safety-review.md).

> Update (slice 182 · TaskContextReport Bundle Context Decision): intent bundles may carry optional `TaskContextReport` refs as context for agents/operators (Option B + E) — an additive `manifest.context.taskContextReports[]` section plus Rekon-side `context/` sidecars, with the Circe handoff schema unchanged in v1. Inclusion is optional, never required; context stays context, not proof — it must not approve plans, satisfy WorkOrder/VerificationPlan gates, change phase gates, execute commands, write source, or run Circe; hints stay hints; do-not-touch stays guidance; Circe is not required to know TaskContextReport internals in v1; intent:go deferred. First implementation: TaskContextReport Bundle Context Implementation. See [`task-context-report-bundle-context-decision.md`](../strategy/task-context-report-bundle-context-decision.md).

> Update (slice 183 · TaskContextReport Bundle Context Implementation): `rekon intent bundle write` now attaches optional `TaskContextReport` refs via a repeatable `--task-context-ref` (plus bounded lineage discovery from prepared-plan / assessment `inputRefs`) as an additive `manifest.context.taskContextReports[]` section (`role: optional-agent-context`, `proof: false`) plus three Rekon-side `context/` sidecars (`task-context.md` / `task-context.agent.json` / `task-context.refs.json`). With no ref the bundle is byte-identical; a missing / wrong-type ref fails cleanly. The Circe handoff projection (`circe/handoff.json` etc.) and the WorkOrder / VerificationPlan / phase-gate files are unchanged and never carry task context. TaskContextReport may be included in bundles only as optional context, not proof — it must not be required to write an intent bundle, approve plans, satisfy WorkOrder/VerificationPlan or phase gates, execute commands, write source, or run Circe; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON is unchanged in v1; intent:go remains deferred. Implements the slice-182 decision (Option B + E). See [`task-context-report-bundle-context-implementation.md`](../strategy/task-context-report-bundle-context-implementation.md).

> Update (slice 184 · TaskContextReport Bundle Context Safety Review): the slice-183 bundle-context implementation was reviewed end-to-end and declared safe/stable — optional `TaskContextReport` context in intent bundles holds every boundary. TaskContextReport may be included in bundles only as optional context, not proof, and is not required to write an intent bundle: a bundle with no ref is byte-identical; a bundle with a ref adds only `manifest.context.taskContextReports[]` (`proof: false`, `role: optional-agent-context`) and the `context/` sidecars (`task-context.md` optional guidance not proof, `task-context.agent.json` all-false boundaries, `task-context.refs.json` refs + `proof:false`). The Circe handoff JSON is unchanged in v1; WorkOrder / VerificationPlan / phase gates unchanged; missing + wrong-type refs fail cleanly; lineage discovery stays bounded and optional. No approval / command execution / source write / WorkOrder / VerificationPlan / Circe; verification hints stay hints; do-not-touch stays guidance; intent:go remains deferred. Recommended next: TaskContextReport Bundle Context Dogfood. See [`task-context-report-bundle-context-safety-review.md`](../strategy/task-context-report-bundle-context-safety-review.md).

> Update (slice 185 · TaskContextReport Bundle Context Dogfood): the optional bundle-context sidecars were dogfooded on a realistic operator/agent handoff path (full intent path → `intent bundle write --task-context-ref` → validate). bundle write succeeded; `manifest.context.taskContextReports` (`proof:false`, `role: optional-agent-context`) was discoverable; the `context/task-context.md` human brief, `context/task-context.agent.json` agent view, and `context/task-context.refs.json` traceability index were all useful; bundle JSON reported the `taskContext` sidecars; the Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. One narrow human-discoverability gap was fixed: the bundle `README.md` now renders an additive "## Task context" section (guidance, not proof) only when a TaskContextReport is attached. Sidecars are ready for broader handoff use. Next: TaskContextReport Bundle Context Dogfood Safety Review. See [`task-context-report-bundle-context-dogfood.md`](../strategy/task-context-report-bundle-context-dogfood.md).

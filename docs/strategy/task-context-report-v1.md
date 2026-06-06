# TaskContextReport v1

> **Broader-workflow role decided (slice 176):** TaskContextReport is the standard
> pre-intent / pre-work context substrate — context only, never proof/approval;
> consumption stays explicit; the deterministic spine stays separately gated;
> intent:go deferred. Next: TaskContextReport Human/Agent Context Export. See
> [`task-context-report-broader-workflow-decision.md`](./task-context-report-broader-workflow-decision.md).

> **Provider-default UX fixed (slice 175):** `rekon context task` with an existing
> embeddings index, no `--path`, and an implicitly-defaulted provider whose key is
> missing now degrades to a graph + lexical context fallback instead of exiting
> non-zero; explicit-provider failures stay strict; task context stays
> proposal/context, not proof; intent:go deferred. See
> [`intent-planning-ux-context-quality-fix.md`](./intent-planning-ux-context-quality-fix.md).

> **Safety-reviewed (slice 172):** the slice-171 intent integration was reviewed
> end-to-end and declared safe/stable — additive context only (never proof/approval),
> prepare by lineage; intent:go deferred. See
> [`task-context-report-intent-integration-safety-review.md`](./task-context-report-intent-integration-safety-review.md).

> **Implemented (slice 171):** `rekon intent assess` and `rekon intent plan review`
> now accept opt-in `--task-context latest|<ref>` — additive context only (readiness /
> status decided first; never proof, never approval). See
> [`task-context-report-intent-integration-implementation.md`](./task-context-report-intent-integration-implementation.md).

> **Intent integration decided (slice 170):** TaskContextReport will be explicit,
> opt-in context for `rekon intent assess` and `rekon intent plan review` (prepare by
> lineage only); context, not proof. See
> [TaskContextReport Intent Integration Decision](./task-context-report-intent-integration-decision.md).

> **Selection quality fixed (slice 169):** free-form verification intent now creates
> a hint (no command invented) and weak-band retrieval is gated to supporting
> context with `retrieval-low-signal` kept visible. Context, not proof. See
> [TaskContextReport Selection Quality Fix](./task-context-report-selection-quality-fix.md).

> **Dogfooded (slice 168):** task-shaped context was dogfooded on explicit-path and
> retrieval scenarios — the explicit-path + graph baseline is useful and reliable,
> the lexical mock retrieval path is low-signal (a real embedding provider is
> needed), context not proof. One tiny output-visibility fix (a
> `retrieval-low-signal` warning). See
> [TaskContextReport Dogfood Review](./task-context-report-dogfood-review.md).

> **Safety-reviewed (slice 167):** TaskContextReport v1 was re-read end-to-end and
> found safe/stable as proposal/context. See
> [TaskContextReport Safety Review](./task-context-report-safety-review.md).

> **Slice 166 · product capability batch.** Base `3721523`. Implements the first
> product consumer of embedding retrieval — task-shaped context — selected by the
> [Task-Shaped Context / Embedding Retrieval Decision](./task-shaped-context-embedding-retrieval-decision.md):
> the `TaskContextReport` artifact, the pure `buildTaskContextReport` helper, and
> the `rekon context task` command.

## What shipped

- **`TaskContextReport` artifact** (`@rekon/kernel-repo-model`) — registered in the
  SDK (`BUILT_IN_ARTIFACT_TYPES`) and runtime (`actions` category), with a factory
  (`createTaskContextReport`), validator (`validateTaskContextReport` /
  `assertTaskContextReport`), and schema (`taskContextReportSchema`). The factory
  forces every `boundaries` field false and recomputes `summary`; the validator
  rejects any non-false boundary, empty task text, a context item without a reason,
  and a mismatched summary.
- **`buildTaskContextReport`** (`@rekon/capability-model`) — a pure helper. It reads
  no files, calls no providers, executes no commands, and creates no
  PreparedIntentPlan / WorkOrder / VerificationPlan. It consumes an already-built
  `CapabilityEvidenceGraph` plus already-computed embedding retrieval results and
  emits context items, graph-neighborhood nodes/claims, do-not-touch zones, and
  verification hints.
- **`rekon context task`** — reads the latest `CapabilityEvidenceGraph` and the
  embedding cache (when present), runs retrieval when the cache + provider are
  available, and writes one `TaskContextReport`. Best-effort retrieval: with no
  cache or no usable provider it records a `retrieval-unavailable` warning and
  builds from graph + explicit paths only; with no retrieval **and** no explicit
  paths it fails cleanly with `context-retrieval-unavailable`. JSON output is the
  agent-facing structured summary; human output is a `# Task Context` markdown
  rendering.

## Selection policy

1. Operator-provided paths are high-priority context, included even if retrieval
   misses them.
2. Strong and useful embedding neighbors are included; weak neighbors are
   optional/supporting; ignored neighbors are excluded by default.
3. Selected paths are expanded through the `CapabilityEvidenceGraph` (bounded per
   path for v1); deterministic facts are admitted even when the embedding score is
   lower. Richer graph-neighborhood expansion is a documented follow-up.
4. Do-not-touch zones are surfaced from explicit task-text constraints ("do not …",
   "must not …", "never …").
5. Verification hints are surfaced from task-text command mentions
   (`npm run <script>`, `npm test`, typecheck/build/lint/test keywords) as hints.

## Output model

The artifact is canonical structured JSON; the human/markdown view is a rendering
of it. Every context item, do-not-touch zone, and verification hint preserves
`evidenceRefs`.

## Boundaries

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

## What this does not do

- It does not implement duplicate detection or canonical recommendations.
- It does not add ANN/HNSW, change the embedding ranking policy, or change the
  provider architecture.
- It does not run live providers as a requirement (retrieval is best-effort),
  execute project commands, write source files, approve plans, create a
  PreparedIntentPlan / WorkOrder / VerificationPlan, or run Circe.
- It does not publish to npm, bump versions, or create a branch.

## Verification

Full keyless 9-command gate; a 27-assertion contract test
(`tests/contract/task-context-report.test.mjs`) covering the pure builder, the
factory/validator boundary rules, and the CLI end-to-end; an 18-assertion docs test
(`tests/docs/task-context-report.test.mjs`); and a CLI smoke on a temp fixture.

## Next step

**TaskContextReport Safety Review** — review task-shaped context before it is used
in agent/operator workflows or intent preparation. Still no duplicate detection, no
canonical recommendations, no approval, no source writes, no command execution, no
`intent:go`.

## See also

- Artifact: [TaskContextReport](../artifacts/task-context-report.md)
- Concept: [Task-Shaped Context](../concepts/task-shaped-context.md)
- Decision: [Task-Shaped Context / Embedding Retrieval Decision](./task-shaped-context-embedding-retrieval-decision.md)

> Update (slice 177 · TaskContextReport Human/Agent Context Export): `rekon context task` now prints a human "read this before editing" brief (Core Context, Related / Supporting Context, Do Not Touch, Verification Hints, Evidence) and adds an additive `agentContext` block to its `--json` payload. Presentation only — the TaskContextReport artifact stays canonical, human markdown is a rendered view, agent JSON is the structured source of truth; every existing JSON field preserved; verification hints stay hints, do-not-touch stays guidance, evidence preserved; no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export.md`](task-context-human-agent-export.md).

> Update (slice 178 · TaskContextReport Human/Agent Export Safety Review): the slice-177 `rekon context task` human/agent export was reviewed end-to-end and declared safe/stable — presentation only. The TaskContextReport artifact is canonical, human markdown is a rendered view, agent JSON (`agentContext`) is the structured source of truth and is additive (every existing top-level JSON field preserved); verification hints stay hints (`executed:false`), do-not-touch zones stay guidance (`enforced:false`), evidence refs are preserved, boundaries stay all-false; no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export-safety-review.md`](task-context-human-agent-export-safety-review.md).

> Update (slice 179 · TaskContextReport Workflow Integration Decision): the standard Rekon workflow is now context first, plan second, approval third, handoff fourth (Option B). `TaskContextReport` is the standard pre-work context substrate, not a proof artifact — recommended (not required, not automatic) before human/agent implementation and before `intent assess` / `intent plan review`; humans read the markdown brief, agents consume `agentContext`. Consumption stays explicit; `intent prepare` stays lineage-only; prepare / approve / status / handoff stay separately gated; bundle inclusion is optional context only (deferred); no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. First implementation: TaskContextReport Workflow Guide / Agent Instructions. See [`task-context-report-workflow-integration-decision.md`](task-context-report-workflow-integration-decision.md).

> Update (slice 180 · TaskContextReport Workflow Guide / Agent Instructions): the context-first workflow is now documented for humans and agents. The canonical pre-work sequence is `rekon scan` → `rekon capability graph build` → `rekon context task` → `rekon artifacts latest --type TaskContextReport --id-only` → `rekon intent assess` / `rekon intent plan review --task-context-ref`. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; TaskContextReport stays context, not proof — no approval / execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; intent:go deferred. See [`task-context-workflow.md`](../guides/task-context-workflow.md).

> Update (slice 181 · TaskContextReport Workflow Guide Safety Review): the slice-180 workflow guide + agent instructions were reviewed end-to-end and declared safe/stable — docs/product surface only, guidance not automation. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; every documented command was confirmed against the live CLI. TaskContextReport stays context, not proof — no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; bundle inclusion optional context only; intent:go deferred; the workflow guide introduces no runtime behavior changes. See [`task-context-workflow-guide-safety-review.md`](task-context-workflow-guide-safety-review.md).

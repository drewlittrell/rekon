# TaskContextReport v1

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

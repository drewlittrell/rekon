# Review Packet — TaskContextReport v1 (slice 166)

**Base:** `3721523`
**Batch type:** product capability (changes source)
**Goal:** implement the first task-shaped context artifact + command selected by the
Task-Shaped Context / Embedding Retrieval Decision (slice 165).

## CHANGES MADE

- **Artifact** — `TaskContextReport` in `@rekon/kernel-repo-model`: types, factory
  `createTaskContextReport`, validator `validateTaskContextReport` /
  `assertTaskContextReport`, schema `taskContextReportSchema`. Registered in the SDK
  `BUILT_IN_ARTIFACT_TYPES` and the runtime `ARTIFACT_CATEGORY_BY_TYPE` (`actions`).
- **Builder** — new `packages/capability-model/src/task-context-report.ts`:
  `buildTaskContextReport` (pure) + input/Like types + re-export from the package
  index.
- **CLI** — new `rekon context task` command (new top-level `context` namespace),
  usage line, and capability-model import additions.
- **Tests** — `tests/contract/task-context-report.test.mjs` (27 assertions),
  `tests/docs/task-context-report.test.mjs` (18 assertions).
- **Docs** — 3 new (`docs/artifacts/task-context-report.md`,
  `docs/concepts/task-shaped-context.md`, `docs/strategy/task-context-report-v1.md`)
  + 9 cross-ref updates + both roadmaps + README + CHANGELOG + this review packet.

## PUBLIC API CHANGES

Additive only. New exports: `TaskContextReport` (+ nested types),
`createTaskContextReport`, `validateTaskContextReport`, `assertTaskContextReport`,
`taskContextReportSchema` (`@rekon/kernel-repo-model`); `buildTaskContextReport`,
`TASK_CONTEXT_REPORT_ARTIFACT_ID_PREFIX`, and `TaskContext*Like` /
`BuildTaskContextReportInput` types (`@rekon/capability-model`). New CLI command
`rekon context task`. No existing command, type, or behavior changed.

## PURPOSE PRESERVATION CHECK

- **Original problem:** embedding retrieval is useful but raw nearest-neighbor
  output is not the product; humans and agents need compact task-shaped context
  that preserves evidence and constraints without becoming proof or automation. —
  **Preserved.** `TaskContextReport` is an explainable bundle, not a flat list.
- **TaskContextReport is context, not proof.** — Preserved: the `boundaries` block
  is all-false (factory forces, validator rejects non-false).
- **Retrieval results are proposal/context.** — Preserved; ignored neighbors
  excluded, weak optional, strong/useful included.
- **Deterministic graph facts outrank embedding similarity.** — Preserved: graph
  facts are admitted regardless of embedding score.
- **Evidence refs are preserved.** — Preserved on every context item, do-not-touch
  zone, and verification hint.
- **Verification hints are hints only.** — Preserved: hints carry a command/reason,
  never executed.
- **Do-not-touch zones included when supported.** — Preserved from explicit task
  constraints (graph-evidence-supported zones are a follow-up).
- **No commands executed; no source files written.** — Preserved: builder is pure;
  CLI writes only the artifact (verified by contract test: src unchanged,
  boundaries false, no PreparedIntentPlan/WorkOrder/VerificationPlan in the store).

## SOURCE REVIEW

Grounded at `3721523` against real source (three read-only Explore passes). The
real `ArtifactHeader` is non-generic (`{artifactType, artifactId, schemaVersion,
generatedAt, subject, producer, inputRefs, freshness?, provenance?}`);
`CapabilityEvidenceGraph` carries `header: ArtifactHeader` + a top-level
`schemaVersion: "0.1.0"` — `TaskContextReport` conforms to that real shape (not the
decision sketch's `ArtifactHeader<"...">`). Factory/validator/schema mirror
`RuntimeGraphDriftReport`; the boundary-false validation mirrors
`SemanticFileUnderstandingReport` (`for key: if boundaries[key] !== false → "Expected
false."`). The CLI command mirrors the `embeddings query` retrieval pipeline
(`resolveEmbeddingProvider`, `readEmbeddingIndexRecords`, `readEmbeddingVector`,
`cosineSimilarity`, `classifyEmbeddingSimilarityScore`) and the `store.list` /
`store.read` / `store.write` artifact pattern.

## ARTIFACT MODEL

Canonical structured JSON: `task`, `selection` (query/provider/model/topK/scoreBands),
`contextItems` (kind, path?, symbolId?, capabilityId?, reason, score?, scoreBand?,
evidenceRefs, source), `graphNeighborhood` (nodes, claims), `doNotTouch`,
`verificationHints`, `summary` (six recomputed counts), and an all-false
`boundaries` block. Human/markdown output is a rendering of the artifact.

## BUILDER MODEL

`buildTaskContextReport(input)` — pure: operator paths → context items; embedding
results → score-banded items (ignored excluded); selected paths expanded through
graph claims (bounded) + capabilities; do-not-touch from task constraints;
verification hints from task command mentions. Artifact id is a content hash of
task text + paths + generatedAt. Calls `createTaskContextReport` (forces boundaries
+ recomputes summary).

## CLI SURFACE

`rekon context task --task <text> [--path <path> …] [--provider voyage|mock]
[--model <m>] [--top-k <n>] [--root <path>] [--json]`. Default top-k 8 / max 20
(invalid `--top-k` fails cleanly). Requires a `CapabilityEvidenceGraph`. Best-effort
retrieval with `retrieval-unavailable` warning; `context-retrieval-unavailable`
clean failure when there is neither retrieval nor an explicit path.

## SELECTION POLICY

Operator paths included; strong + useful included; weak optional/supporting; ignored
excluded by default; graph expansion admits deterministic facts regardless of score.

## HUMAN AND AGENT OUTPUT

Human: `# Task Context` markdown (Core Context / Related Context / Do Not Touch /
Verification Hints / Warnings). Agent: structured JSON (artifact ref, summary,
contextItems, graphNeighborhood, doNotTouch, verificationHints, warnings,
boundaries). Both render the same artifact.

## BOUNDARY MODEL

All-false boundaries (`retrievalIsProof`, `approvedPlans`, `executedCommands`,
`wroteSourceFiles`, `createdPreparedIntentPlan`, `createdWorkOrder`,
`createdVerificationPlan`, `ranCirce`, `implementedIntentGo`). Task-shaped context is
proposal/context, not proof; deterministic graph facts outrank embedding similarity;
verification hints are hints, not executed commands; duplicate detection, canonical
recommendations, and intent:go remain deferred.

## TESTS / VERIFICATION

27-assertion contract test + 18-assertion docs test; full keyless 9-command gate;
CLI smoke on a temp fixture (TaskContextReport written, contextItems/doNotTouch/
verificationHints present, boundaries false, artifacts validate, source unchanged,
help lists `context task`).

## INTENTIONALLY UNTOUCHED

No duplicate detection, no canonical recommendations, no ANN/HNSW, no ranking-policy
change, no provider-architecture change, no live-provider requirement, no command
execution, no source writes, no PreparedIntentPlan/WorkOrder/VerificationPlan, no
Circe, no intent:go, no npm publish, no version bump, no branch.

## RISKS / FOLLOW-UP

- **Risk:** graph expansion could be noisy on large graphs. *Mitigation:* per-path
  cap + score-band filtering; richer expansion is a documented follow-up.
- **Risk:** do-not-touch extraction is constraint-text-only in v1. *Follow-up:*
  evidence-supported graph-claim zones.
- **Follow-up:** default removal of ignored neighbors already in effect; deeper
  graph-neighborhood richness and semantic-summary surfacing deferred.

## NEXT STEP

**TaskContextReport Safety Review** — review task-shaped context before agent/operator
workflow or intent-preparation use. Still no duplicate detection, no canonical
recommendations, no approval, no source writes, no command execution, no intent:go.

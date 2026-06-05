# TaskContextReport

> **Provider-default UX fixed (slice 175):** `rekon context task` with an existing
> embeddings index, no `--path`, and an implicitly-defaulted provider whose key is
> missing now degrades to a graph + lexical context fallback instead of exiting
> non-zero; explicit-provider failures stay strict; task context stays
> proposal/context, not proof; intent:go deferred. See
> [Intent Planning UX / Context Quality Fix](../strategy/intent-planning-ux-context-quality-fix.md).

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
> a `manual-verification` hint (no command invented); weak-band retrieval is gated
> to labelled supporting context with `retrieval-low-signal` kept visible. See
> [TaskContextReport Selection Quality Fix](../strategy/task-context-report-selection-quality-fix.md).

> **Dogfooded (slice 168):** dogfooded on explicit-path and retrieval scenarios —
> the explicit-path + graph baseline is useful and reliable; the lexical mock
> retrieval path is low-signal (a real embedding provider is needed). Context, not
> proof. See
> [TaskContextReport Dogfood Review](../strategy/task-context-report-dogfood-review.md).

> **Safety-reviewed (slice 167):** found safe/stable as proposal/context. See
> [TaskContextReport Safety Review](../strategy/task-context-report-safety-review.md).

> **Slice 166 · product capability batch.** Base `3721523`. The first product
> consumer of embedding retrieval — task-shaped context — shipped as the
> `TaskContextReport` artifact and the `rekon context task` command, selected by
> the [Task-Shaped Context / Embedding Retrieval Decision](../strategy/task-shaped-context-embedding-retrieval-decision.md).

`TaskContextReport` is a canonical, structured-JSON artifact that turns a concrete
task into a compact, explainable **context bundle**: deterministic graph facts,
embedding-retrieval neighbors, do-not-touch zones, and verification hints, each
with preserved evidence refs. The human/markdown view is a rendering of this
artifact.

**Task-shaped context is proposal/context, not proof.**

## Producer

- Builder: `buildTaskContextReport` (`@rekon/capability-model`) — a pure helper.
- CLI: `rekon context task --task <text> [--path <path>] [--provider voyage|mock]
  [--model <m>] [--top-k <n>] [--root <path>] [--json]`.
- Category: `actions`. Schema version: `0.1.0`.

## Shape

```ts
type TaskContextReport = {
  header: ArtifactHeader;          // artifactType "TaskContextReport"
  schemaVersion: "0.1.0";
  task: { text: string; paths: string[]; goal?: string };
  selection: {
    query: string;
    provider?: string;
    model?: string;
    topK: number;
    scoreBands: { strong: number; useful: number; weak: number; ignored: number };
  };
  contextItems: Array<{
    id: string;
    kind: "file" | "symbol" | "capability" | "semantic_summary"
        | "verification_hint" | "do_not_touch" | "risk";
    path?: string;
    symbolId?: string;
    capabilityId?: string;
    reason: string;                // every item carries a reason
    score?: number;
    scoreBand?: "strong" | "useful" | "weak" | "ignored";
    evidenceRefs: string[];        // preserved
    source: "deterministic_graph" | "semantic_file_understanding"
          | "embedding_retrieval" | "operator_input";
  }>;
  graphNeighborhood: { nodes: Array<{ kind: string; id: string }>; claims: string[] };
  doNotTouch: Array<{ reason: string; path?: string; symbolId?: string; evidenceRefs: string[] }>;
  verificationHints: Array<{ command?: string; artifact?: string; reason: string; evidenceRefs: string[] }>;
  summary: {
    contextItems: number; graphNodes: number; graphClaims: number;
    doNotTouch: number; verificationHints: number; embeddingNeighbors: number;
  };
  boundaries: {
    retrievalIsProof: false; approvedPlans: false; executedCommands: false;
    wroteSourceFiles: false; createdPreparedIntentPlan: false; createdWorkOrder: false;
    createdVerificationPlan: false; ranCirce: false; implementedIntentGo: false;
  };
};
```

## Rules

- The factory (`createTaskContextReport`) forces every `boundaries` field to
  `false` and recomputes `summary`.
- The validator (`validateTaskContextReport`) rejects any non-false boundary,
  empty task text, a context item missing a reason, and a mismatched summary.
- `evidenceRefs` reference graph evidence/claim ids and retrieval chunk ids.

## Selection

1. Operator-provided paths are high-priority context.
2. Strong and useful embedding neighbors are included; weak neighbors are
   optional/supporting; ignored neighbors are excluded by default.
3. Selected paths are expanded through `CapabilityEvidenceGraph`; deterministic
   facts are admitted even when the embedding score is lower.

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

## See also

- Concept: [Task-Shaped Context](../concepts/task-shaped-context.md)
- Strategy: [TaskContextReport v1](../strategy/task-context-report-v1.md)
- Decision: [Task-Shaped Context / Embedding Retrieval Decision](../strategy/task-shaped-context-embedding-retrieval-decision.md)

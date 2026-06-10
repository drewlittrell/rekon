# Task-Shaped Context / Embedding Retrieval Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **Dogfooded (slice 168):** task-shaped context was dogfooded on explicit-path and
> retrieval scenarios — the explicit-path + graph baseline is useful and reliable,
> the lexical mock retrieval path is low-signal (a real embedding provider is
> needed), context not proof. See
> [TaskContextReport Dogfood Review](./task-context-report-dogfood-review.md).

> **Safety-reviewed (slice 167):** the shipped implementation was re-read and found
> safe/stable as proposal/context. See
> [TaskContextReport Safety Review](./task-context-report-safety-review.md).

> **Implemented (slice 166):** this decision shipped — the `TaskContextReport`
> artifact, the pure `buildTaskContextReport` helper, and the `rekon context task`
> command. See [TaskContextReport v1](./task-context-report-v1.md).

> **Slice 165 · strategy / architecture decision batch.** Base `4bd331f`. No
> runtime behavior changes, no source changes, no new artifact, no CLI command,
> no Voyage calls. This memo decides the **first product consumer** of embedding
> retrieval — **task-shaped context** — as a future `TaskContextReport` artifact
> and `rekon context task` command, after
> [Embedding Query Input-Type / Ranking Policy Implementation](./embedding-query-input-type-ranking-policy-implementation.md)
> shipped the ranking policy it consumes. Implementation lands in the next slice
> (TaskContextReport v1); this slice only pins the shape, selection policy, output
> model, and boundaries.

## Decision Summary

**Adopt `TaskContextReport` as the first retrieval consumer (Option B).**
Retrieval now works — `rekon embeddings query` embeds with `input_type=query`,
returns score-banded neighbors (strong/useful/weak/ignored), default top-k 8 /
max 20, with provider/model/explanation provenance — but a raw nearest-neighbor
list is **not the product**. The product step is to convert retrieval into a
compact, explainable **context bundle for a concrete task**: deterministic graph
facts, semantic file understanding, embedding neighbors, constraints, and
verification hints, assembled for both humans and agents.

Task-shaped context is selected first because **retrieval results are context,
not judgment**: a false positive in context is extra reading an operator or agent
can ignore, whereas a false positive in duplicate detection or canonical
recommendation is a trust failure. This decision pins (1) `TaskContextReport` as a
canonical structured-JSON artifact with a rendered markdown view; (2) a selection
policy that starts from score-banded retrieval, expands through
**CapabilityEvidenceGraph**, and always admits deterministic facts and operator
paths; (3) required evidence refs on every context item; (4) explicit
**do-not-touch zones** and **verification hints** (hints, not executed commands);
and (5) hard boundaries keeping task context proposal/context, never proof,
approval, execution, source writes, or `intent:go`. **Duplicate detection and
canonical recommendations remain deferred.** No code changes here.

## Why This Decision Exists

Rekon has assembled the substrate — `CapabilityEvidenceGraph`,
`SemanticFileUnderstandingReport`, the semantic-report-to-graph integration,
Voyage embeddings, an embedding cache/index, `embeddings query`, the score-band
ranking policy, `input_type=query` for queries / `input_type=document` for
indexing, and per-result explanation fields. What it does **not** have is a way to
turn all of that into context shaped for a *task*. `rekon embeddings query` is a
raw query surface: it answers "what is near this text," not "what does an
implementer need to know before touching this task."

The predecessor decision
([Embedding Retrieval / Similarity Ranking Decision](./embedding-retrieval-similarity-ranking-decision.md))
already selected task-shaped context as the first consumer and deferred duplicate
detection and canonical recommendations. This memo follows through: it specifies
*what task-shaped context is*, *what it accepts*, *how it selects and ranks*, *how
it explains itself*, and *what it must never do* — so the implementation slice
inherits one calibrated design instead of inventing an ad hoc bundle format. It
also keeps retrieval aligned with the graph-first North Star: task context is
graph-grounded evidence assembled for a task, not a parallel black-box search
product.

## Current Retrieval Surface

Grounded at `4bd331f`:

- **`rekon embeddings query`** — embeds query text with `input_type=query`;
  default top-k **8**, max **20**; returns results carrying `score`, `scoreBand`
  (`strong` ≥ 0.78 / `useful` 0.65–0.78 / `weak` 0.50–0.65 / `ignored` < 0.50),
  `chunk` (id/kind/path/symbolId), and `explanation`
  (provider/model/policyVersion/textPreview). `matches` + flat path/kind/score are
  retained for back-compat. Output is a CLI envelope with a `boundaries` block —
  retrieval is proposal/context, not proof.
- **`rekon embeddings index`** — embeds chunks with `input_type=document`.
- **`classifyEmbeddingSimilarityScore`** (`@rekon/capability-model`) — the pure
  band classifier the report will reuse, with the
  `EMBEDDING_SCORE_BAND_STRONG/USEFUL/WEAK` thresholds.
- **`CapabilityEvidenceGraph`** — file / symbol / capability nodes, evidence rows
  (`embedding_similarity`), and inference claims (`embedding`), each an
  `ArtifactHeader`-stamped artifact at `schemaVersion: "0.1.0"`.
- **`SemanticFileUnderstandingReport`** — LLM-derived file summaries that enter
  the graph as evidence/claims.

**codebase-intel precedent** (`/Users/andrewlittrell/Code/codebase-intel`,
reviewed for this decision): the old system's `ContextBundleSchema` carried
`query`, `budget`, `architecture`, ranked `files` (path, adjusted score, tldr,
capabilities, layer/system, exports), `symbols`, `learnings`, and `warnings`; its
`ContextResolvePacketSchema` carried `routing` (`changeHere` / `avoidHere`),
`mustNot` (protected regions), and a `checkMatrix` of verification `commands` per
requirement with matched paths and rationale. Representative selection took the
top-5 by score then filled remaining slots for `system::layer` diversity; source
was requested in `tldr` mode for orientation and `full` mode for implementation.
Rekon's `TaskContextReport` adopts these shapes (graph-grounded equivalents of
`mustNot` → do-not-touch, `checkMatrix` → verification hints, representative
diversity → selection), while keeping similarity-only canonical scoring deferred.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| raw embeddings query only | rejected | not enough context |
| TaskContextReport | selected | evidence-backed task bundle |
| markdown-only output | rejected/deferred | lacks artifact traceability |
| duplicate detection first | deferred | precision risk |
| canonical recommendations first | deferred | needs corroboration |

- **Option A — raw embeddings query only.** Rejected. Keeping `rekon embeddings
  query` as the product surface leaves humans and agents with a flat
  nearest-chunk list and no graph facts, constraints, or verification hints.
  Nearest chunks alone are not enough context for either consumer.
- **Option B — `TaskContextReport`.** Selected. A structured, evidence-backed
  bundle for a task preserves provenance, supports both humans (markdown) and
  agents (JSON), and keeps retrieval contextual rather than authoritative.
- **Option C — markdown-only context output.** Rejected/deferred. A markdown
  context blob with no artifact has no provenance, no validation, and no
  traceability; the markdown view should be a *rendering of* the canonical
  artifact, not a substitute for it.
- **Option D — duplicate detection first.** Deferred. A duplicate detector emits
  judgments and carries a high precision burden; a false positive erodes trust.
- **Option E — canonical recommendations first.** Deferred. Canonical ranking
  needs fan-in, ownership, runtime, and deterministic corroboration — not
  similarity alone (exactly what codebase-intel's `base + log2(fanIn+1)*5` scoring
  relied on).

## Recommendation

**Option B — `TaskContextReport` as the first retrieval consumer.** Add a future
artifact and command:

```text
rekon context task \
  --task <text> \
  [--path <path>] \
  [--root <path>] \
  [--json]
```

The report combines embedding retrieval neighbors, `CapabilityEvidenceGraph`
neighborhood facts, semantic file understanding summaries, deterministic
imports/exports/symbols, constraints / do-not-touch zones, and verification hints
into one bundle. **Task context is context, not proof.** It does not approve,
execute, write, or run Circe. Implementation lands in the next slice
(TaskContextReport v1); duplicate detection and canonical recommendations stay
deferred until similarity is corroborated by deterministic evidence.

## Decision Questions Answered

1. **What is task-shaped context?** A compact, explainable bundle of the facts,
   neighbors, constraints, and verification hints an implementer (human or agent)
   needs before working a concrete task — not a generic file list, not proof.
2. **What input should a task context command accept?** Required `--task` text;
   optional `--path` (high priority), `--root`, and `--json`. The embedding index
   and `CapabilityEvidenceGraph` are read from the workspace when present.
3. **Embedding retrieval, graph expansion, or both?** **Both.** Retrieval seeds
   candidates; graph neighborhood expansion grounds and extends them. Neither
   alone is sufficient.
4. **How should strong/useful/weak bands affect inclusion?** Strong and useful
   neighbors are included; weak neighbors are optional/supporting only; ignored
   neighbors are excluded by default.
5. **How should deterministic graph facts affect ranking?** They **outrank**
   embedding similarity: a connected deterministic neighbor is included even when
   its embedding score is lower, and similarity never overrides a deterministic
   fact.
6. **How should semantic file understanding affect ranking?** Semantic summaries
   are included as context through graph evidence; they enrich and explain items
   but do not by themselves promote an item above deterministic facts.
7. **How should context explain inclusion?** Every context item carries a
   human-readable `reason`, a `source` tag (deterministic / semantic / retrieval /
   operator), optional `score` + `scoreBand`, and `evidenceRefs`.
8. **Human output format?** A concise markdown summary: top items, why included,
   risks / do-not-touch, verification hints.
9. **Agent output format?** Structured JSON: exact paths, symbols, constraints,
   evidence refs, do-not-touch zones, verification hints.
10. **Should it include do-not-touch zones?** Yes — when evidence supports them.
11. **Should it include verification hints?** Yes — as **hints**, never executed.
12. **Should it include ownership/capability notes?** Yes, as context items of
    kind `capability` sourced from graph claims; ownership remains advisory.
13. **Should it create artifacts?** It produces exactly one `TaskContextReport`
    artifact; it writes **no source files** and creates no WorkOrder /
    VerificationPlan.
14. **Should it be cacheable?** Yes — the report is deterministic given its
    inputs and may be cached/keyed by task text + input fingerprints; this is a
    follow-up, not required for v1.
15. **How should stale embedding results be handled?** Per the ranking policy:
    stale (chunk-text-changed) and policy-changed vectors are excluded by default;
    retrieval warns and skips rather than silently using a stale neighbor.
16. **How should stale graph / semantic reports be handled?** Surface a freshness
    warning and still assemble from available facts; never fabricate. Path
    freshness signals feed the warnings list.
17. **What boundaries are required?** Those pinned in the Boundary Model below —
    proposal/context, no approval, no execution, no source writes, no WorkOrder /
    VerificationPlan, no Circe, evidence refs preserved, `intent:go` deferred.
18. **What implementation slice follows?** **TaskContextReport v1** — the artifact
    + `rekon context task` command, retrieval candidates, graph expansion, evidence
    refs, human markdown view, agent JSON view, no proof/approval semantics.

## TaskContextReport Shape

Sketch, not implementation. `ArtifactHeader` and `schemaVersion` follow Rekon's
artifact convention (`@rekon/kernel-artifacts`, `schemaVersion: "0.1.0"`); `score`
/ `scoreBand` reuse the existing `EmbeddingScoreBand`; graph references reuse the
graph's ref type:

```ts
type TaskContextReport = {
  header: ArtifactHeader<"TaskContextReport">;
  schemaVersion: "0.1.0";

  task: {
    text: string;
    paths: string[];
    goal?: string;
  };

  selection: {
    query: string;
    provider?: string;
    model?: string;
    topK: number;
    scoreBands: {
      strong: number;
      useful: number;
      weak: number;
      ignored: number;
    };
  };

  contextItems: Array<{
    id: string;
    kind:
      | "file"
      | "symbol"
      | "capability"
      | "semantic_summary"
      | "verification_hint"
      | "do_not_touch"
      | "risk";
    path?: string;
    symbolId?: string;
    capabilityId?: string;
    reason: string;
    score?: number;
    scoreBand?: "strong" | "useful" | "weak" | "ignored";
    evidenceRefs: string[];
    source:
      | "deterministic_graph"
      | "semantic_file_understanding"
      | "embedding_retrieval"
      | "operator_input";
  }>;

  graphNeighborhood: {
    nodes: GraphRef[];
    claims: string[];
  };

  doNotTouch: Array<{
    reason: string;
    path?: string;
    symbolId?: string;
    evidenceRefs: string[];
  }>;

  verificationHints: Array<{
    command?: string;
    artifact?: string;
    reason: string;
    evidenceRefs: string[];
  }>;

  boundaries: {
    retrievalIsProof: false;
    approvedPlans: false;
    executedCommands: false;
    wroteSourceFiles: false;
    createdWorkOrder: false;
    createdVerificationPlan: false;
    ranCirce: false;
    implementedIntentGo: false;
  };
};
```

**The artifact is canonical structured JSON; the markdown / human summary is a
rendered view.** Every `contextItem`, `doNotTouch` entry, and `verificationHint`
carries `evidenceRefs`, so each line of the bundle is traceable back to graph
evidence, a semantic report, a retrieval result, or explicit operator input.

## Selection Policy

The decision pins the selection order:

1. **Start with embedding retrieval** using the existing ranking policy
   (`input_type=query`, default top-k 8 / max 20, `classifyEmbeddingSimilarityScore`
   bands).
2. **Include strong and useful neighbors.**
3. **Include weak neighbors only as optional/supporting context.**
4. **Expand selected chunks through `CapabilityEvidenceGraph`:** file node;
   symbol node; capability node; imports/exports; direct owning/implements claims;
   semantic summary claims.
5. **Add deterministic graph facts even when the embedding score is lower** —
   deterministic facts outrank similarity.
6. **Add operator-provided paths even if retrieval misses them.**
7. **Exclude ignored-score results by default.**

| Candidate Source | Role |
| --- | --- |
| strong embedding neighbor | include |
| useful embedding neighbor | include |
| weak embedding neighbor | optional/supporting |
| ignored embedding neighbor | exclude by default |
| operator path | include |
| deterministic graph neighbor | include when connected |
| semantic file summary | include as context |

| Input | Decision |
| --- | --- |
| task text | required |
| explicit paths | optional but high priority |
| embedding index | used when available |
| CapabilityEvidenceGraph | required for graph expansion |
| semantic file reports | used through graph evidence when present |

Following codebase-intel's representative selection, the implementation should
favor `system`/`layer` (or capability) **diversity** when filling remaining slots,
rather than returning many near-identical neighbors from one module.

## Human And Agent Output

Both views render the same canonical artifact.

**Human output** — a concise markdown summary:

- top context items;
- why each was included (`reason` + `source`);
- risks / do-not-touch zones;
- verification hints.

**Agent output** — structured JSON:

- exact paths and symbol ids;
- constraints;
- evidence refs;
- do-not-touch zones;
- verification hints.

| Output | Decision |
| --- | --- |
| artifact | TaskContextReport |
| human view | markdown summary |
| agent view | structured JSON |
| evidence refs | required |
| do-not-touch zones | included when supported |
| verification hints | hints only |

**The artifact is canonical structured JSON; markdown/human summary is a rendered
view.** Humans and agents never diverge on facts because they read the same
artifact.

## Evidence And Graph Expansion

`CapabilityEvidenceGraph` remains the evidence substrate. Retrieval seeds the
bundle, but the graph grounds it: each retrieval hit is resolved to its graph
node(s), then expanded across imports/exports, owning/implements claims, and
semantic-summary claims. Deterministic graph facts (imports, exports, symbols,
capability membership) are admitted regardless of embedding score and **outrank**
similarity-derived items. Semantic file understanding summaries enter as context
through graph evidence, explaining items without promoting them above
deterministic facts.

Every context item, do-not-touch entry, and verification hint **preserves evidence
refs** pointing at the underlying graph evidence row, semantic report, retrieval
result, or operator input. Do-not-touch zones are emitted only when evidence
supports them (e.g. a graph claim marking a protected boundary, or a path-freshness
/ contract signal). Verification hints mirror codebase-intel's `checkMatrix`: a
suggested command or artifact with a rationale and evidence refs — surfaced as a
**hint**, never executed.

Stale and policy-changed embedding vectors are excluded by default (the ranking
policy's staleness rule); stale graph or semantic reports surface a freshness
warning while the bundle is still assembled from available facts. Nothing is
fabricated.

## Boundary Model

| Boundary | Decision |
| --- | --- |
| task context vs proof | proposal/context |
| task context vs approval | no approval |
| task context vs command execution | no execution |
| task context vs source writes | no writes |
| task context vs WorkOrder / VerificationPlan | not created |
| task context vs Circe | not run |
| duplicate detection | deferred |
| canonical recommendations | deferred |
| intent:go | deferred |

The boundary statements this decision pins, verbatim:

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
- **Task context should include do-not-touch zones when evidence supports them.**
- **Task context should include verification hints as hints, not executed commands.**
- **Duplicate detection remains deferred.**
- **Canonical recommendations remain deferred.**
- **intent:go remains deferred.**

## What This Does Not Do

- It does not implement `TaskContextReport` or the `rekon context task` command.
- It does not change retrieval behavior, the ranking policy, or the Voyage adapter.
- It does not implement duplicate detection.
- It does not implement canonical recommendations.
- It does not add ANN/HNSW or a provider architecture.
- It does not run live providers, execute commands, or write source files.
- It does not approve plans, create a WorkOrder or VerificationPlan, or run Circe.
  **intent:go remains deferred.**
- It does not publish to npm, bump versions, or create a branch.

## Implementation Sequence

1. **TaskContextReport v1** — register the `TaskContextReport` artifact; add a
   `buildTaskContextReport` helper that takes task text (+ optional paths),
   gathers embedding-retrieval candidates, expands them through
   `CapabilityEvidenceGraph`, attaches evidence refs, and emits context items,
   do-not-touch zones, and verification hints; add `rekon context task` with a
   human markdown view and an agent JSON view. No proof/approval semantics, no
   source writes, no command execution, no Circe, no `intent:go`.
2. **TaskContextReport publication / safety review** — surface task context on
   the existing publication surfaces (architecture summary / agent contract) and
   review the boundary guarantees end-to-end.
3. Later, gated on precision evidence: duplicate-candidate detection (strong band
   + deterministic corroboration), then canonical recommendations (strong band +
   fan-in/ownership/runtime corroboration).

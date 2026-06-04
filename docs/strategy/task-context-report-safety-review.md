# TaskContextReport Safety Review

> **Selection quality fixed (slice 169):** free-form verification intent now creates
> a hint (no command invented) and weak-band retrieval is gated to supporting
> context with `retrieval-low-signal` kept visible. Context, not proof. See
> [TaskContextReport Selection Quality Fix](./task-context-report-selection-quality-fix.md).

> **Dogfooded (slice 168):** task-shaped context was dogfooded on explicit-path and
> retrieval scenarios — the explicit-path + graph baseline is useful and reliable,
> the lexical mock retrieval path is low-signal (a real embedding provider is
> needed), context not proof. See
> [TaskContextReport Dogfood Review](./task-context-report-dogfood-review.md).

> **Slice 167 · strategy / safety-review batch.** Base `df36432`. No runtime
> behavior changes, no source changes, no TaskContextReport changes. This memo
> re-reads the shipped [TaskContextReport v1](./task-context-report-v1.md)
> (slice 166) end-to-end and confirms task-shaped context is safe/stable as
> proposal/context before it is used in agent/operator workflows or intent
> preparation.

## Decision Summary

**TaskContextReport v1 is safe/stable.** The shipped artifact, pure builder, and
`rekon context task` command hold the context-only boundary: the factory forces
every `boundaries` field false and recomputes `summary`; the validator rejects any
non-false boundary, empty task text, and reasonless context item;
`buildTaskContextReport` is a pure helper that calls no providers, executes no
commands, writes no source files, and creates no PreparedIntentPlan / WorkOrder /
VerificationPlan; the CLI writes exactly one report artifact and nothing else. The
review found no blocker. **TaskContextReport is proposal/context, not proof.** The
recommended next slice is **TaskContextReport Dogfood Review** — run task-shaped
context against a realistic repo/task to assess usefulness before any consumer or
intent integration.

## Why This Review Exists

Slice 166 shipped the first product consumer of embedding retrieval. Before
task-shaped context is wired into agent/operator workflows or intent preparation,
a deliberate review must confirm it remains **context only** and does not cross
into automation, proof, approval, command execution, or source mutation — exactly
the trust boundary the Task-Shaped Context / Embedding Retrieval Decision pinned.
This memo is that confirmation, grounded in a direct re-read of the shipped source.

## Implementation Reviewed

Re-read at `df36432`: `packages/kernel-repo-model/src/index.ts` (TaskContextReport
type, `createTaskContextReport`, `validateTaskContextReport`, schema),
`packages/capability-model/src/task-context-report.ts` (`buildTaskContextReport`),
`packages/capability-model/src/index.ts`, `packages/cli/src/index.ts`
(`context task`), `packages/sdk/src/index.ts`, `packages/runtime/src/index.ts`,
`tests/contract/task-context-report.test.mjs`, `tests/docs/task-context-report.test.mjs`,
and the artifact/concept/strategy/decision docs.

### Decision Questions Answered

1. **Is TaskContextReport v1 safe/stable?** Yes — no blocker found.
2. **Proposal/context, not proof?** Yes — the all-false `boundaries` block and the
   docs assert it.
3. **Does the factory force boundaries false?** Yes — `createTaskContextReport`
   constructs every boundary field as `false` regardless of input.
4. **Does the validator reject non-false boundaries?** Yes — it iterates
   `TASK_CONTEXT_REPORT_BOUNDARY_KEYS` and pushes `Expected false.` for any field
   that is not `false`.
5. **Does the validator reject empty task text?** Yes — `task.text` must be a
   non-empty (trimmed) string.
6. **Does the validator reject reasonless context items?** Yes — each context item
   `reason` must be a non-empty string ("context items must carry a reason").
7. **Does the factory recompute summary counts?** Yes — `summary` is recomputed
   from the arrays; the validator re-checks each count `(recomputed)`.
8. **Is buildTaskContextReport pure?** Yes.
9. **Does the builder call no providers?** Yes — it imports only `node:crypto`
   (`createHash`) and kernel types; no provider/network.
10. **Does the builder execute no commands?** Yes — no `child_process`/exec/spawn.
11. **Does the builder write no source files?** Yes — no `node:fs`/write.
12. **Does the builder create no PreparedIntentPlan?** Yes.
13. **Does the builder create no WorkOrder?** Yes.
14. **Does the builder create no VerificationPlan?** Yes.
15. **Does deterministic graph context outrank embedding similarity?** Yes —
    deterministic graph facts are admitted regardless of embedding score.
16. **Are ignored-score neighbors excluded by default?** Yes.
17. **Are evidenceRefs preserved?** Yes — on every context item, do-not-touch
    zone, and verification hint.
18. **Are do-not-touch zones guidance/context only?** Yes — they are reasons +
    optional path/symbol refs, never source enforcement.
19. **Are verification hints hints only?** Yes — a suggested command/artifact +
    reason, never executed.
20. **Does the CLI fail cleanly when neither retrieval nor `--path` exists?** Yes —
    it exits non-zero with `context-retrieval-unavailable`.
21. **Does CLI JSON expose contextItems / doNotTouch / verificationHints /
    boundaries?** Yes.
22. **Does human output render `# Task Context`?** Yes.
23. **Does source remain unchanged?** Yes — the CLI writes only the report
    artifact to the `.rekon/` store; the contract test confirms src unchanged.
24. **Does intent:go remain deferred?** Yes.
25. **What slice follows?** TaskContextReport Dogfood Review.

## Artifact Model Review

`TaskContextReport` is a canonical structured-JSON artifact (`actions` category,
`schemaVersion 0.1.0`). **TaskContextReport boundaries are forced false by the
factory.** **Summary counts are recomputed by the factory.** **The validator
rejects non-false boundaries.** **The validator rejects empty task text.** **The
validator rejects reasonless context items.** Evidence refs are carried on every
context item, do-not-touch zone, and verification hint. **CapabilityEvidenceGraph
remains the evidence substrate.**

## Builder Review

`buildTaskContextReport` consumes an already-built graph + already-computed
retrieval results and returns a `TaskContextReport`. **buildTaskContextReport is
pure.** **buildTaskContextReport calls no providers.** **buildTaskContextReport
executes no commands.** **buildTaskContextReport writes no source files.**
**buildTaskContextReport creates no PreparedIntentPlan.** **buildTaskContextReport
creates no WorkOrder.** **buildTaskContextReport creates no VerificationPlan.** Its
only import beyond kernel types is `node:crypto` for a deterministic artifact id.
Deterministic facts are admitted regardless of embedding score, and ignored-score
neighbors are excluded by default. **Deterministic graph facts outrank embedding
similarity.** **Embedding retrieval is proposal/context, not proof.**

## CLI Review

`rekon context task` reads the latest `CapabilityEvidenceGraph` and the embedding
cache (when present), runs retrieval best-effort, and writes exactly one
`TaskContextReport` (and nothing else). With neither retrieval nor an explicit
`--path` it fails cleanly with `context-retrieval-unavailable`. It executes no
project commands and writes no source files. **TaskContextReport creates no
WorkOrder or VerificationPlan.** **TaskContextReport runs no Circe.**

## Human And Agent Output Review

Human output renders a `# Task Context` markdown view (Core Context / Related
Context / Do Not Touch / Verification Hints / Warnings); agent output is the
structured JSON (artifact ref, summary, contextItems, graphNeighborhood,
doNotTouch, verificationHints, warnings, boundaries). Both render the same
artifact. **Do-not-touch zones are guidance/context, not enforcement.**
**Verification hints are hints, not executed commands.**

## Boundary Review

| Surface | Status | Safety Finding |
| --- | --- | --- |
| TaskContextReport | shipped | context only |
| createTaskContextReport | shipped | forces boundaries / recomputes summary |
| validateTaskContextReport | shipped | rejects bad boundaries / empty task / reasonless items |
| buildTaskContextReport | shipped | pure helper |
| context task CLI | shipped | writes one report |
| human output | shipped | rendered view |
| JSON output | shipped | agent-facing structure |

| Boundary | Decision |
| --- | --- |
| task context vs proof | proposal/context |
| task context vs approval | no approval |
| task context vs command execution | no execution |
| task context vs source writes | no writes |
| task context vs PreparedIntentPlan | not created |
| task context vs WorkOrder | not created |
| task context vs VerificationPlan | not created |
| task context vs Circe | not run |
| intent:go | deferred |

| Selection Source | Review Finding |
| --- | --- |
| operator path | high-priority context |
| strong/useful embedding neighbor | included |
| weak embedding neighbor | optional/supporting |
| ignored embedding neighbor | excluded |
| deterministic graph fact | admitted regardless of score |
| graph claims/capabilities | bounded expansion |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare TaskContextReport safe/stable | selected | context-only boundary holds |
| dogfood next | selected | usefulness needs real-task review |
| intent integration next | deferred | dogfood first |
| duplicate detection next | deferred | separate higher-risk consumer |
| canonical recommendations next | deferred | requires stronger corroboration |

## Recommendation

**TaskContextReport v1 is safe/stable.** Proceed to **TaskContextReport Dogfood
Review** — run task-shaped context against a realistic repo/task to assess
context, do-not-touch, and verification-hint quality before any consumer or intent
integration. **Duplicate detection remains deferred.** **Canonical recommendations
remain deferred.** **intent:go remains deferred.**

## What This Does Not Do

- It does not change runtime behavior, TaskContextReport, or any source.
- It does not add task-context consumers or integrate task context into intent
  preparation.
- It does not implement duplicate detection or canonical recommendations.
- It does not execute verification hints, write source files, approve plans, create
  a PreparedIntentPlan / WorkOrder / VerificationPlan, or run Circe.
- It does not publish to npm, bump versions, or create a branch.

## Follow-Up Work

1. **TaskContextReport Dogfood Review** — realistic-task quality assessment
   (context usefulness, do-not-touch quality, verification-hint quality, human
   markdown + agent JSON usefulness, retrieval/graph-expansion tuning).
2. Later: **TaskContextReport Intent Integration Decision** — only after dogfood,
   decide how task context feeds intent planning.
3. Gated on precision evidence: duplicate-candidate detection, then canonical
   recommendations.

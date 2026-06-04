# TaskContextReport Dogfood Review

> **Selection quality fixed (slice 169):** the two gaps found here are closed —
> free-form verification intent now creates a hint (no command invented), and
> weak-band retrieval is gated to labelled supporting context with
> `retrieval-low-signal` kept visible. See
> [TaskContextReport Selection Quality Fix](./task-context-report-selection-quality-fix.md).

> **Slice 168 · product dogfood / review batch.** Base `503b632`. One tiny
> output-visibility fix only (a `retrieval-low-signal` warning); no new
> architecture, no artifact-model change, no selection-logic change. This memo
> runs the shipped [TaskContextReport v1](./task-context-report-v1.md) (slice 166,
> [safety-reviewed](./task-context-report-safety-review.md) slice 167) against two
> realistic scenarios and reports honestly on whether task-shaped context is
> useful enough to become an agent/operator workflow input.

## Decision Summary

**TaskContextReport was dogfooded on explicit-path and retrieval scenarios.** The
explicit-path baseline is **useful and reliable**: operator paths become core
context, deterministic graph expansion adds the symbols the file exposes,
do-not-touch zones and verification hints are extracted from the task text, and
every selected item carries evidence refs. The embedding-retrieval path, run with
the **lexical mock provider**, is **low-signal on these fixtures** — the mock
scores every neighbor below the useful band, so pure retrieval (no `--path`)
selects zero embedding context items. That is a **provider limitation, not a
TaskContextReport defect**: the artifact, builder, and CLI behave correctly, and
the reliable baseline (explicit paths + deterministic graph expansion) is already
integration-ready. **Task-shaped context is proposal/context, not proof.**

Two concrete, small gaps surfaced — neither requires architecture work:

1. **Silent empty retrieval.** Pure mock retrieval returned `status: "ok"` with an
   empty `contextItems` array and no warning. This batch ships one tiny
   output-visibility fix: a `retrieval-low-signal` warning when retrieval ran but
   every neighbor scored below the useful band. Selection logic is unchanged; an
   ignored neighbor is never promoted into context.
2. **Verification-hint extraction is keyword-based.** The task phrase "Verify
   routing behavior" produced no hint because the extractor matches command
   keywords (`typecheck`, `test`, `build`, `lint`, `npm …`), not free-form intent.
   This is recorded as a selection-quality follow-up, **not** changed here.

**Recommendation: the next slice is [TaskContextReport Selection Quality
Fix](#recommendation)** — broaden verification-hint extraction and run a live
Voyage retrieval dogfood (or surface weak-band neighbors as related context)
before relying on embedding retrieval for intent context. The explicit-path +
graph path is solid enough that **TaskContextReport Intent Integration Decision**
can follow once the selection-quality fix lands.

## Why This Dogfood Exists

Slice 167 proved task-shaped context is *safe*. Safety is not usefulness. Before
wiring task context into intent preparation or broader agent/operator workflows,
Rekon needs evidence that the report selects the right files/symbols/capabilities,
preserves evidence refs, and produces human markdown and agent JSON a developer or
agent can actually act on. This memo is that evidence, gathered by running
`rekon context task` on two fixtures that mirror real edit tasks.

## What Was Dogfooded

Both scenarios were run against the CLI built at `503b632` (`rekon context task`),
keyless, with the deterministic capability graph built first.

| Scenario | Task | Inputs | Purpose |
| --- | --- | --- | --- |
| **A — explicit path** | "Add a marker export to `src/index.ts`. Do not change greet behavior. Verify with typecheck and tests." | `--path src/index.ts`, no embeddings | Prove explicit operator paths create useful core context even without retrieval. |
| **B — retrieval + graph** | "Update inbound SMS routing while preserving outbound SMS formatting. Do not change user profile or order creation code. Verify routing behavior." | mock embedding index over a 6-file repo (users / orders / sms / unrelated) | Prove task context can use retrieval neighbors and graph expansion for a realistic task. |

## Scenario A — Explicit Path Result

**Useful and reliable.** The report selected four context items and extracted the
constraint and verification intent cleanly:

| Surface | Result |
| --- | --- |
| `contextItems` | 4 — one `operator_input` (`src/index.ts`) + three `deterministic_graph` claims (`exposes` existing / greet / marker) |
| `doNotTouch` | 1 — "Do not change greet behavior." |
| `verificationHints` | 2 — `npm run typecheck`, `npm test` (hints only) |
| `graphNeighborhood` | 1 node / 3 claims |
| `evidenceRefs` | present on every graph-derived item |
| `boundaries` | all `false` |
| human output | clean `# Task Context` with Core Context / Do Not Touch / Verification Hints sections |
| `artifacts validate` | clean; source + tests unchanged |

The only warning was the expected `retrieval-unavailable` (no embeddings indexed
in this scenario) — the report correctly fell back to graph + explicit paths.

## Scenario B — Retrieval Result

**Honest finding: low-signal with the mock provider.** The mock embedding index
contained 32 chunks. Cosine similarity of the SMS task against those chunks scored
the best neighbor at ~0.57 (weak band) on a trimmed probe and below the weak floor
on the full 6-file fixture; every other neighbor was `ignored` (< 0.5). Because the
ranking policy excludes `ignored` neighbors and the scenario passed no `--path`,
the report selected **zero** embedding context items and an empty graph
neighborhood. The do-not-touch constraint was still extracted from the task text.

| Surface | Result (pure retrieval, mock) |
| --- | --- |
| `contextItems` | 0 |
| `embeddingNeighbors` | 0 (all below the useful band) |
| `doNotTouch` | 1 — "Do not change user profile or order creation code." |
| `verificationHints` | 0 — "Verify routing behavior" matched no command keyword |
| `graphNeighborhood` | 0 / 0 (nothing to seed expansion) |
| `warnings` | `retrieval-low-signal` (after this batch's fix) |
| `boundaries` | all `false`; source unchanged; `artifacts validate` clean |

When the same scenario is run **with an explicit SMS path** (`--path
src/sms/route-message.ts`), graph expansion immediately supplies context items,
graph nodes/claims, and evidence refs — confirming the reliable path works and the
gap is purely the provider's semantic signal. **This is not pretended to be
stronger than it is:** the lexical mock is a deterministic test double, not a
semantic model. Slice 162's live-Voyage dogfood measured 0.75–0.81 cosine on
same-domain paraphrase, which is well inside the useful band — so a live Voyage
retrieval dogfood is the right way to evaluate the retrieval path.

## The One Fix This Batch

`packages/cli/src/index.ts` — `rekon context task` now appends a
`retrieval-low-signal` warning when the embedding cache and provider were present
and consulted but **every** retrieved neighbor scored below the useful band
(`records.length > 0 && retrievalResults.length > 0 && summary.embeddingNeighbors
=== 0`). This replaces a silent `status: "ok"` empty result with an explicit,
honest signal. It is **visibility only**: the selection itself is unchanged, and an
`ignored` neighbor is never promoted into context. This is the only source change
in the batch.

## Human Markdown Review

**Human markdown usefulness was reviewed.** The `# Task Context` output is readable
and scannable: a one-line task echo, then `## Core Context` (operator paths + graph
facts), `## Related Context` (retrieval neighbors when present), `## Do Not Touch`,
and `## Verification Hints`. Each line names the file/symbol and a short reason, so
a developer can act without opening the JSON. In Scenario A it gave a complete,
correct working set; in low-signal Scenario B it correctly degraded to the
do-not-touch section plus the warning rather than inventing context.

## Agent JSON Review

**Agent JSON usefulness was reviewed.** The JSON payload exposes `task`,
`selection` (provider / model / topK), `summary` counts, `contextItems` (with
`kind`, `source`, `path`/`symbolId`, `scoreBand`, `reason`, `evidenceRefs`),
`graphNeighborhood`, `doNotTouch`, `verificationHints`, `warnings`, and the
all-`false` `boundaries` block. That is exact enough for an agent to resolve
precise paths, symbols, and constraints and to see — via `boundaries` and
`warnings` — that the report is context, not an instruction to act.

## Do-Not-Touch Review

**Do-not-touch zones are guidance/context, not enforcement.** Both scenarios
extracted the explicit "Do not change …" constraint from the task text into a
`doNotTouch` zone with a human-readable reason. The zones are advisory: nothing in
the command blocks, gates, or rejects edits to those files — they are surfaced so a
human or agent *chooses* not to touch them.

## Verification-Hint Review

**Verification hints are hints, not executed commands.** Scenario A produced
`npm run typecheck` and `npm test` hints, each with empty `evidenceRefs` and the
`executedCommands` boundary `false`; no command ran and no source changed. Scenario
B exposed the extraction gap: "Verify routing behavior" carries no recognized
command keyword, so no hint was produced. The hint extractor is intentionally
conservative (it would rather emit nothing than guess a command), and broadening it
is the headline item of the recommended selection-quality follow-up.

## Evidence-Ref Review

**evidenceRefs were inspected** on the selected context items. Deterministic graph
items preserve the originating claim id (e.g. the `exposes` claim), and — when
retrieval contributes — embedding items preserve the chunk id. Evidence refs flow
through from the CapabilityEvidenceGraph into the report unchanged, so every
proposal remains traceable to its evidence. **CapabilityEvidenceGraph remains the
evidence substrate; task-shaped context only points at it.**

## Boundary Review

The dogfood confirmed every boundary held across both scenarios:

| Boundary | Observed |
| --- | --- |
| writes source files | No — `No source files were written.` (git clean except the `.rekon/` store) |
| executes project commands | No — `executedCommands` false; verification hints are hints |
| runs Circe | No — `No Circe was run.` |
| creates PreparedIntentPlan | No |
| creates WorkOrder / VerificationPlan | No — `No WorkOrder or VerificationPlan was created.` |
| approves a plan | No |
| invokes intent:go | No — `intent:go remains deferred.` |
| retrieval is proof | No — retrieval is proposal/context; graph facts outrank similarity |

## The 20 Review Questions Answered

1. **Useful context for an explicit-path task?** Yes — Scenario A produced a
   complete, correct working set (operator path + graph expansion + constraint +
   hints).
2. **Useful context from embedding retrieval?** Not with the lexical mock — it
   scores below the useful band; a live semantic provider is needed.
3. **Selects relevant files/symbols/capabilities?** Yes for explicit-path + graph;
   retrieval selection is provider-bound.
4. **Too much unrelated noise?** No — unrelated `colors` never dominated; low
   scores were excluded, not surfaced.
5. **Are do-not-touch zones useful?** Yes — both scenarios extracted the explicit
   constraint as guidance.
6. **Are verification hints useful?** Useful when the task names a command (A);
   missed free-form "verify routing behavior" (B) — a known extraction gap.
7. **Is human markdown useful?** Yes — readable, scannable, degrades gracefully.
8. **Is agent JSON useful?** Yes — exact paths, symbols, reasons, evidence refs,
   boundaries, warnings.
9. **Are evidenceRefs preserved and meaningful?** Yes — claim/chunk ids flow
   through unchanged.
10. **Does graph expansion add value beyond raw embedding results?** Yes — it is
    the reliable source of context here and outranks similarity.
11. **Proposal/context, not proof?** Yes — all boundaries `false`; docs and output
    say so.
12. **Executes no commands?** Yes — confirmed.
13. **Writes no source files?** Yes — confirmed (git clean).
14. **Creates no WorkOrder or VerificationPlan?** Yes — confirmed.
15. **Runs no Circe?** Yes — confirmed.
16. **Is mock retrieval sufficient for product dogfood?** No — sufficient for
    determinism/CI, not for evaluating semantic retrieval quality.
17. **Is live Voyage needed before intent integration?** Yes for the retrieval
    path; the explicit-path path does not need it.
18. **Should TaskContextReport feed intent planning next?** The explicit-path path
    is ready; gate the retrieval path behind the selection-quality fix.
19. **Or should context selection quality be improved first?** Yes — fix
    verification-hint extraction and validate retrieval with a live provider first.
20. **What follow-up slice is recommended?** TaskContextReport Selection Quality
    Fix (then Intent Integration Decision).

## Recommendation

Run **TaskContextReport Selection Quality Fix** next:

- broaden verification-hint extraction to recognize free-form verification intent
  (e.g. "verify routing behavior") without inventing commands;
- run a **live Voyage** retrieval dogfood (opt-in env) to measure the retrieval
  path with a real semantic provider, and decide whether weak-band neighbors should
  be surfaced as clearly-labelled *related* context;
- keep every boundary intact (no approval, command execution, source writes,
  WorkOrder/VerificationPlan, Circe, or intent:go).

The explicit-path + deterministic-graph path is already integration-ready, so
**TaskContextReport Intent Integration Decision** is the natural slice after the
quality fix.

## What This Does Not Do

This batch does not integrate TaskContextReport into intent prepare, implement
duplicate detection or canonical recommendations, add ANN/HNSW, change provider
architecture, execute verification hints, execute any command, write source files,
approve plans, create a PreparedIntentPlan / WorkOrder / VerificationPlan, run
Circe, or implement intent:go. **intent:go remains deferred.** It ships exactly one
tiny output-visibility fix (the `retrieval-low-signal` warning) plus dogfood
documentation and tests.

## Follow-Up Work

- **TaskContextReport Selection Quality Fix** (recommended next) — verification-hint
  extraction + live-provider retrieval dogfood.
- **TaskContextReport Intent Integration Decision** — how task context optionally
  feeds intent assess / plan review as context, not proof (after the quality fix).
- **Live Voyage task-context dogfood** — non-blocking evidence run with
  `REKON_RUN_LIVE_EMBEDDING_TESTS=1` + `VOYAGE_API_KEY`.

## Related

- [Task-Shaped Context / Embedding Retrieval Decision](./task-shaped-context-embedding-retrieval-decision.md)
- [TaskContextReport v1](./task-context-report-v1.md)
- [TaskContextReport Safety Review](./task-context-report-safety-review.md)
- [Task-Shaped Context](../concepts/task-shaped-context.md)
- [TaskContextReport artifact](../artifacts/task-context-report.md)
- [Embedding Provider Index](../concepts/embedding-provider-index.md)
- [Capability Evidence Graph](../concepts/capability-evidence-graph.md)

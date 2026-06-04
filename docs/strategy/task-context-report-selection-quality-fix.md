# TaskContextReport Selection Quality Fix

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

> **Slice 169 · product capability batch.** Base `50f63f2`. Focused quality fix —
> no new architecture track, no new artifact, no new CLI command. Closes the two
> selection-quality gaps found by the
> [TaskContextReport Dogfood Review](./task-context-report-dogfood-review.md)
> (slice 168): free-form verification intent now produces a hint, and weak-band
> retrieval is gated + kept honest. Task-shaped context stays proposal/context,
> never proof.

## Summary

The dogfood review proved the explicit-path + deterministic-graph path is reliable,
but exposed two gaps: free-form verification intent like "Verify routing behavior"
produced **zero** hints, and the weak-band retrieval policy needed gating plus a
clearer low-signal signal. This slice fixes both inside the existing boundaries.

- **Free-form verification intent creates verification hints without inventing
  commands.** `buildTaskContextReport` now detects verification verbs (verify,
  confirm, validate, ensure, make sure, check) in task-text clauses that name no
  command, and emits a hint with `artifact: "manual-verification"`, **no `command`
  field**, and a reason that quotes the operator's clause. Clauses that already map
  to a command keyword (typecheck / build / lint / test / `npm …`) keep producing
  command hints and do **not** also emit a free-form hint.
- **Explicit command-hint behavior is preserved.** "Verify with typecheck and
  tests", "Run npm test", "Use npm run build" still produce `npm run typecheck` /
  `npm test` / `npm run build` command hints exactly as before.
- **Weak retrieval neighbors are labelled supporting context or excluded with a
  warning.** Weak-band neighbors are now included as clearly-labelled supporting
  context **only when there are no strong/useful neighbors** (so weak never dilutes
  stronger signal and is never presented as core context); otherwise they are
  excluded. Either way **retrieval-low-signal remains visible**: the CLI warns when
  retrieval ran but selected no embedding context (now with the top candidate's
  score/band), and also when the only selected embedding context is weak-band.

**Verification hints are hints, not executed commands.** Nothing in this slice
executes a command, writes source, or changes a boundary.

## Why This Batch Exists

Slice 168 dogfooded TaskContextReport and recommended this fix. Free-form
verification intent was silently dropped, and weak retrieval — while already
included — was neither gated against stronger signal nor surfaced with a clear
low-signal warning when it was all the report had. Both are selection-quality
issues that should be fixed before TaskContextReport feeds intent planning, and
both can be fixed without crossing into automation or proof.

## Implementation

### Free-form verification-hint extraction

`extractVerificationHints` (in `packages/capability-model/src/task-context-report.ts`)
now runs two passes:

1. **Command hints** — unchanged: explicit `npm run <script>` / `npm test` mentions
   plus keyword-mapped scripts (`typecheck` → `npm run typecheck`, `build`/`compile`
   → `npm run build`, `lint` → `npm run lint`, `test`/`tests` → `npm test`).
2. **Free-form intent hints** — each task-text clause matching a verification verb
   (`verify`, `confirm`, `validate`, `ensure`, `make sure`, `double-check`,
   `sanity-check`, `check`) but **not** matching a command keyword produces one
   hint of the shape:

   ```json
   {
     "artifact": "manual-verification",
     "reason": "operator asked to verify (free-form verification intent extracted from the task text; no command was inferred or executed): \"Verify routing behavior.\"",
     "evidenceRefs": []
   }
   ```

   No command is inferred or executed; the hint carries no `command` field. The
   kernel `TaskContextVerificationHint` type already allows an `artifact`-only hint
   and the validator accepts it (both `command` and `artifact` are optional).

### Weak-band gating + honesty

The retrieval loop classifies every non-ignored neighbor, then includes weak-band
neighbors **only when no strong/useful neighbor is present**. Weak items keep
`scoreBand: "weak"` and a reason that says "weak supporting embedding neighbor (no
strong or useful neighbor present; low-confidence supporting context)". The
`rekon context task` `retrieval-low-signal` warning was broadened: it fires when
retrieval ran but selected zero embedding context items (now including the top
candidate's score and band), and additionally when every selected embedding
neighbor is weak-band.

## Dogfood Result

Re-running the slice-168 scenarios against the rebuilt CLI:

| Scenario | Before (slice 168) | After (slice 169) |
| --- | --- | --- |
| Explicit-path "…Verify with typecheck and tests." | 2 command hints | unchanged — 2 command hints, no free-form duplicate |
| Retrieval "…Verify routing behavior." | 0 verification hints | 1 free-form `manual-verification` hint quoting the clause |
| Pure mock retrieval (no `--path`) | `retrieval-low-signal` (empty) | `retrieval-low-signal` with top-candidate score/band |
| Weak-only retrieval (synthetic) | weak included (ungated) | weak included as labelled supporting context; warned as all-weak |
| Strong + weak retrieval (synthetic) | both included | weak gated out; only strong/useful kept |

Source remained unchanged in every scenario; `artifacts validate` clean.

## Live Voyage

The optional live Voyage retrieval dogfood is gated behind
`REKON_RUN_LIVE_EMBEDDING_TESTS=1` + `VOYAGE_API_KEY`. It was **not run** in this
batch (no env opt-in); the contract test's four live assertions skip cleanly when
the env is absent, so the keyless gate is unaffected. A live Voyage run remains a
recommended non-blocking follow-up to measure the retrieval path with a real
semantic provider.

## Boundary Model

This slice changes selection quality only; every boundary is intact:

- **source files are not written** — the builder is pure and the CLI writes only
  the report artifact;
- **no commands are executed** — verification hints (command or free-form) are
  hints; `boundaries.executedCommands` is false;
- **no Circe is run**;
- **no WorkOrder or VerificationPlan is created**, and no PreparedIntentPlan;
- no approval is granted, and **intent:go remains deferred**;
- retrieval stays proposal/context, never proof; deterministic graph facts outrank
  embedding similarity.

## What This Does Not Do

No intent integration, no duplicate detection, no canonical recommendations, no
broader agent workflows, no ANN/HNSW, no provider-architecture change, no version
bump, no npm publish, no branch. Verification hints are never executed and weak
neighbors are never presented as core context.

## Recommendation / Next Step

With free-form verification intent captured and weak retrieval gated + honest, the
explicit-path and graph paths are integration-ready and the retrieval path degrades
predictably. The recommended next slice is **TaskContextReport Intent Integration
Decision** — decide how task context optionally feeds intent assess / plan review as
context (not proof), with no approval, command execution, source writes, or
intent:go. A live Voyage retrieval dogfood is the recommended non-blocking
companion run.

## Related

- [TaskContextReport Dogfood Review](./task-context-report-dogfood-review.md)
- [TaskContextReport Safety Review](./task-context-report-safety-review.md)
- [TaskContextReport v1](./task-context-report-v1.md)
- [Task-Shaped Context / Embedding Retrieval Decision](./task-shaped-context-embedding-retrieval-decision.md)
- [Task-Shaped Context](../concepts/task-shaped-context.md)
- [TaskContextReport artifact](../artifacts/task-context-report.md)

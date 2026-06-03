# Rekon LLM Provider Routing — Implementation

> **LLM-semantic parity decided (slice 143):** an audit of the old codebase-intel system separated Track A (finish LLM-backed semantic parsing — the one real non-embedding gap is per-file semantic file understanding) from Track B (embeddings, deferred). Semantic output stays proposal-not-proof; no approval/execution/source-writes/Circe. See [`classic-llm-semantic-parsing-parity-decision.md`](./classic-llm-semantic-parsing-parity-decision.md).

Status: implemented (slice 138). Decision of record:
[rekon-llm-provider-routing-semantic-normalization-decision.md](./rekon-llm-provider-routing-semantic-normalization-decision.md).

> **Re-dogfooded end-to-end (slice 140):** the router-bound provider was exercised
> through the full fresh-repo operator path and the bundle imported into Circe —
> see [`fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](./fresh-repo-intent-handoff-circe-dogfood-review-semantic.md).

This memo records *how* the shared provider routing foundation was built and the
boundaries it preserves. It implements **Option B** — a shared provider router
with task-specific routes and injected adapters — without wiring any live hosted
provider.

> **Real provider wired (slice 139):** the first real completion provider,
> `createOpenAiLlmProvider(...)` (fetch-based, no SDK), is now registered behind
> the router in `rekon intent plan review`, with the API key read from the
> environment by the CLI only — semantic normalization is usable with a routed
> provider, and provider output stays proposal-not-proof. See
> [`intent-plan-compiler-semantic-normalization-dogfood.md`](./intent-plan-compiler-semantic-normalization-dogfood.md).

## What shipped

- **`@rekon/llm-provider`** (new 22nd public package): `RekonLlmProvider` /
  `RekonEmbeddingProvider` interfaces, the `RekonLlmRouter`, `createMockLlmProvider`
  / `createMockEmbeddingProvider` / `createDisabledLlmRouter`, and `coercePhaseDrafts`
  (a structural schema gate). No external runtime dependencies, no network calls.
- **CLI integration** (`rekon intent plan review`): `--llm-provider <id>` /
  `--llm-model <model>` flags plus `REKON_LLM_PROVIDER` / `REKON_LLM_MODEL` /
  `REKON_LLM_ENABLED` env resolution. The CLI builds a router-bound adapter and
  injects it into the existing `IntentPlanSemanticNormalizationAdapter` seam.
- **`@rekon/capability-model` stays pure** — it still accepts an injected
  semantic adapter and reads no environment and makes no network calls.

## Router model

`RekonLlmRouter.completeJson(input, override?)` resolves a `RekonLlmTask` to a
route using **CLI override → task-specific route → default route → fallback**,
then calls the selected provider. Rules:

- `off` → `ok: false` with a deterministic-fallback warning.
- `auto` with no provider → `ok: false` fallback warning (not a hard failure).
- `required` with no provider → `ok: false` hard error.
- unknown provider → `ok: false`.
- a provider `ok: false` result is propagated.

## Plan review integration

For `intent plan review`, the CLI builds an adapter for `plan.semantic-normalize`:

- `off` → no adapter is passed (purely deterministic).
- `auto` → the adapter returns no phases on router failure or schema-invalid
  output, so the builder records a `deterministic-fallback` warning and still
  writes a report.
- `required` → the adapter **throws** on router failure or schema-invalid output,
  so `buildIntentPlanActionabilityReport` rejects, the CLI exits non-zero, and
  **no report is written**.

Provider output is gated by `coercePhaseDrafts` (a non-empty array of phase-draft
records) and then **deterministically re-checked** by the same actionability
evaluator the deterministic path uses. Provider output is a **proposal, not
proof**.

## Boundary model

LLM providers may **read / transform / critique text** only. They **may not
approve plans, execute commands, write source files, run Circe, or implement
intent:go.** LLM output is **proposal, not proof** and is **schema-validated and
deterministically re-checked**. `intent plan review` still creates no
`PreparedIntentPlan` / `WorkOrder` / `VerificationPlan` / `VerificationRun` /
`VerificationResult`, runs no commands, and writes no source — semantic
normalization changes none of that.

## No live provider in this slice

This slice registers **no live providers**. The router is the routing/fallback
skeleton plus a mock provider for tests. So `--llm-provider <id>` always resolves
to an unknown provider: `auto` deterministically falls back, `required` fails
clearly. A real hosted provider adapter is the recommended follow-on. No OpenAI /
Anthropic / Google SDK dependency was added; no network call is made; no live
default exists.

## Tests / verification

- `packages/llm-provider/test/llm-provider.test.mjs` (10 assertions) — mock,
  router resolution order, mode fallback/hard-error/off, unknown-provider block,
  error propagation, embedding shape, `coercePhaseDrafts` gate.
- `tests/contract/intent-plan-review-llm-routing.test.mjs` (12 assertions) — the
  three CLI modes, help flags, helper-level semantic-llm trace, schema-invalid
  fallback, actionability re-check, and the no-downstream-artifact / no-execution
  / no-source-write boundaries.
- `tests/docs/rekon-llm-provider-routing.test.mjs` (15 assertions).

## Next step

The recommended follow-on is **Intent Plan Compiler Semantic Normalization /
Dogfood** — wire one real provider adapter behind the router and dogfood the
fresh-repo plan-compiler + Circe-handoff path on real rough plans, still with no
source writes, no command execution, no Circe execution by Rekon, and no
`intent:go`. Do not start it without a new confirmed Work Order against the new
SHA.

## Related

- Decision: [rekon-llm-provider-routing-semantic-normalization-decision.md](./rekon-llm-provider-routing-semantic-normalization-decision.md)
- Concept: [rekon-llm-provider-routing.md](../concepts/rekon-llm-provider-routing.md)
- Consumers: [intent-plan-actionability-report-implementation.md](./intent-plan-actionability-report-implementation.md),
  [plan-actionability-answer-merge-back-implementation.md](./plan-actionability-answer-merge-back-implementation.md)
- Review packet: [rekon-llm-provider-routing-v1.md](../../.rekon-dev/review-packets/rekon-llm-provider-routing-v1.md)

## Semantic File Understanding v1

Rekon has a per-file semantic understanding capability (slice 144): `rekon semantic file understand` produces a `SemanticFileUnderstandingReport`. Deterministic structural extraction (language, line/byte counts, imports, public exports, responsibilities) is always on and authoritative for imports/exports (the hallucination guard); optional LLM semantic understanding is a schema-validated, deterministically-rechecked proposal, not proof. It executes no commands, writes no source files, generates no embeddings, creates no PreparedIntentPlan / WorkOrder / VerificationPlan, runs no Circe, and intent:go remains deferred. See [Semantic File Understanding v1](./semantic-file-understanding-v1.md) and the [concept](../concepts/semantic-file-understanding.md).

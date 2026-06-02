# Rekon LLM Provider Routing — Implementation

Status: implemented (slice 138). Decision of record:
[rekon-llm-provider-routing-semantic-normalization-decision.md](./rekon-llm-provider-routing-semantic-normalization-decision.md).

This memo records *how* the shared provider routing foundation was built and the
boundaries it preserves. It implements **Option B** — a shared provider router
with task-specific routes and injected adapters — without wiring any live hosted
provider.

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

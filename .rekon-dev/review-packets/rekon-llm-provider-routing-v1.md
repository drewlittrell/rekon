# Review Packet — Rekon LLM Provider Routing Implementation (slice 138)

## CHANGES MADE

- **new package** `@rekon/llm-provider` (`packages/llm-provider/`): src, README,
  package.json, tsconfig, 10-assertion package test. Interfaces + router + mocks.
- **CLI** (`packages/cli/src/index.ts`): `--llm-provider` / `--llm-model` flags +
  `REKON_LLM_*` env resolution + a router-bound adapter injected into
  `intent plan review`'s existing semantic seam; help line updated.
- **build wiring**: root tsconfig reference, cli tsconfig reference, cli dependency,
  package-lock.json.
- **tests**: `tests/contract/intent-plan-review-llm-routing.test.mjs` (12),
  `tests/docs/rekon-llm-provider-routing.test.mjs` (15).
- **docs**: 2 new (concept + implementation), this review packet, 9 doc updates +
  CHANGELOG.

## PUBLIC API CHANGES

New public package `@rekon/llm-provider` exporting `RekonLlmProvider`,
`RekonEmbeddingProvider`, `RekonLlmRouter`, `createMockLlmProvider`,
`createMockEmbeddingProvider`, `createDisabledLlmRouter`, `coercePhaseDrafts`, and
their types. New CLI flags `--llm-provider` / `--llm-model` on
`rekon intent plan review`. No artifact schema change; `capability-model`'s public
surface is unchanged (it still accepts the existing injected adapter).

## PURPOSE PRESERVATION CHECK

Rekon needed LLM-backed semantic parsing in multiple places without direct
provider calls inside capability builders and without weakening any boundary.
This slice centralizes provider routing in `@rekon/llm-provider`, keeps
`capability-model` pure (no env, no network), lets the CLI/orchestration own
provider resolution, keeps provider output schema-constrained and deterministically
re-checked, and requires no live network provider for tests (a mock provider gives
deterministic coverage). Provider output remains proposal, not proof.

## SOURCE REVIEW

Confirmed: the audit auto-discovers `packages/*` (no script edit for a 22nd
package); `tests/docs/release-readiness.test.mjs` enumerates packages and asserts
each is 1.0.0 with 1.0.0 internal deps (the new pure package passes trivially); the
existing `IntentPlanSemanticNormalizationAdapter` seam + `semanticMode` +
`normalizationTrace` (semantic-llm / deterministic-fallback) were preserved; the
builder rejects when the injected adapter throws (used for `required` mode); and
flags parse as dashed keys (`parsed.flags["llm-provider"]`).

## PACKAGE MODEL

`@rekon/llm-provider` is a public, `@rekon/`-scoped, Apache-2.0, ESM package with
an object exports map, a README, `files: ["dist"]`, and **no external runtime
dependencies and no `@rekon/*` dependencies**. It is a pure standalone library.

## PROVIDER INTERFACES

`RekonLlmTask`, `RekonLlmProviderInput`, discriminated `RekonLlmProviderResult`
(`ok:true` with `data` / `ok:false` with `error`), `RekonLlmProvider.completeJson`.
Embeddings are **separate**: `RekonEmbeddingTask`, `RekonEmbeddingProviderInput`,
`RekonEmbeddingProviderResult`, `RekonEmbeddingProvider.embed`.

## ROUTER MODEL

`RekonLlmRouter.completeJson(input, override?)` resolves a task via **CLI override
→ task route → default route → fallback**. `off` → ok:false fallback; `auto` with
no provider → ok:false fallback warning; `required` with no provider → ok:false
hard error; unknown provider → ok:false; provider ok:false propagated. A disabled
router (`config.enabled === false`) behaves as if no provider is available.

## MOCK PROVIDER

`createMockLlmProvider({ id, model, data, error, warnings })` returns configured
data (ok:true) or a configured error (ok:false). `createMockEmbeddingProvider`
mirrors it for embeddings. `createDisabledLlmRouter()` returns a permanently
disabled router. These give deterministic tests with no network.

## CLI CONFIG / ENV BRIDGE

The CLI resolves provider/model from `--llm-provider` / `--llm-model` then
`REKON_LLM_PROVIDER` / `REKON_LLM_MODEL`, and an `enabled` gate from
`REKON_LLM_ENABLED`. **This slice registers no live providers** — only the routing
skeleton. Secrets stay in the environment, never in repo config.

## PLAN REVIEW INTEGRATION

`createPlanSemanticNormalizationAdapter(mode, flagProvider, flagModel)` builds a
router-bound `IntentPlanSemanticNormalizationAdapter` for `plan.semantic-normalize`.
`off` → no adapter (deterministic). `auto` → returns no phases on router-failure /
schema-invalid output (builder records `deterministic-fallback` + warning, writes a
report). `required` → throws on router-failure / schema-invalid output
(`buildIntentPlanActionabilityReport` rejects → CLI exits non-zero, writes no
report). Provider output is gated by `coercePhaseDrafts` then re-checked by the
deterministic actionability evaluator.

## SEMANTIC NORMALIZATION BOUNDARY

Provider output is a **proposal, not proof**: schema-validated (`coercePhaseDrafts`)
and deterministically re-checked (`evaluatePlanPhases`). It never bypasses
actionability evaluation; invalid output falls back or fails per mode. Empirically:
`off` and `auto+missing` write exactly one report; `required+missing` writes none.

## BOUNDARY MODEL

LLM providers may read / transform / critique text only; they may not approve
plans, execute commands, write source files, run Circe, or implement `intent:go`.
`intent plan review` still creates no `PreparedIntentPlan` / `WorkOrder` /
`VerificationPlan` / `VerificationRun` / `VerificationResult`, runs no commands,
and writes no source (contract-tested). `capability-model` reads no env and makes
no network calls.

## TESTS / VERIFICATION

Package (10), contract (12), docs (15) green. Full 9-command gate green. CLI smoke:
`off` → deterministic report; `auto --llm-provider missing` → deterministic-fallback
report with warning; `required --llm-provider missing` → non-zero exit, no report;
`artifacts validate` clean; source + plan unchanged.

## INTENTIONALLY UNTOUCHED

No live hosted provider; no OpenAI / Anthropic / Google SDK dependency; no network
call; no live LLM default. No approval semantics, no auto-approve, no command
execution, no source writes, no Circe run, no `intent:go`. No version bump, no npm
publish, no branch. The existing adapter seam, `semanticMode`, and
`normalizationTrace` are unchanged in shape.

## RISKS / FOLLOW-UP

The router pins `RekonLlmProvider.completeJson`'s JSON contract; a real provider's
JSON-mode response may need a minor additive shape adjustment at adapter time
(caller-side `coercePhaseDrafts` already absorbs variance). Helper-level tests
cover the ok:true provider path (the CLI registers no live provider, as the WO
permits) — documented here.

## NEXT STEP

**Intent Plan Compiler Semantic Normalization / Dogfood** — wire one real provider
adapter behind the router and dogfood the fresh-repo plan-compiler + Circe-handoff
path on real rough plans, still with no source writes, no command execution, no
Circe execution by Rekon, and no `intent:go`. Do not start it without a new
confirmed Work Order against the new SHA.

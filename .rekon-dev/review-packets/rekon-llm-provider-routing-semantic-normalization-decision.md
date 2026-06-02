# Review Packet — Rekon LLM Provider Routing / Semantic Normalization Decision

## CHANGES MADE

- **new** `docs/strategy/rekon-llm-provider-routing-semantic-normalization-decision.md`
  — the decision of record.
- **new** this review packet.
- **new** `tests/docs/rekon-llm-provider-routing-semantic-normalization-decision.test.mjs`.
- **docs** — cross-reference updates to the classic parity decision, the two
  implementation strategy docs, the intent-plan-compiler concept doc, the
  actionability-report artifact doc, the v1 release/migration notes, README, and
  CHANGELOG.
- **No code change.** Decision-only batch; no provider, router, package, type,
  helper, or CLI flag was implemented.

## PUBLIC API CHANGES

None. No new artifact, type, helper, CLI command, or flag. This batch decides an
architecture and defers all implementation to the recommended follow-on.

## DECISION

**Option B — a shared provider router with task-specific routes and injected
adapters.** Direct LLM calls do not go inside `IntentPlanActionabilityReport`
logic or any capability builder. A small provider/routing layer sits above the
pure builders: CLI/orchestration → router → provider → schema-constrained result
→ deterministic re-check → artifact.

## BOUNDARY MODEL

LLM providers may read/transform/critique text; they may not approve plans,
execute commands, write source files, run Circe, or implement `intent:go`. LLM
output is **proposal, not proof**, and must be **schema-validated and
deterministically re-checked**. These carry forward every existing
plan-compiler boundary unchanged.

## PROVIDER MODEL

Defines `RekonLlmTask`, `RekonLlmProvider.completeJson(...)`,
`RekonEmbeddingProvider.embed(...)`, and a `RekonLlmRouter` that resolves a task
to a route, selects a provider, and owns fallback + provenance. Completion and
embedding providers are **separate** (different safety/caching/cost/storage).

## TASK ROUTES

Minimum: `plan.semantic-normalize`, `plan.answer-merge`, `plan.critique`,
`plan.revision-prompt`, `artifact.summary`, `intent.classify`. Later:
`code.embedding`, `plan.similarity`, `artifact.retrieval`.

## ROUTING MODEL

Priority: **CLI flags → repo config → environment defaults → built-in
disabled/fallback.** Repo config stores only provider IDs, model names, and route
policy; secrets come from env. CLI adds `--llm-provider` / `--llm-model` beside
the existing `--semantic off|auto|required`. The artifact records the resolved
provider/model, never secrets.

## SAFETY MODEL

Provider output is schema-validated, provenance-tagged, source-evidence-linked
when possible, deterministically re-checked, and blocked if it invents
paths/commands/criteria without support. Provenance is recorded on
`normalizationTrace` (`method: "semantic-llm"` with provider/model, or
`method: "deterministic-fallback"` with `invokedSemanticNormalization: false`
and a warning).

## PACKAGE PLACEMENT

`packages/llm-provider` (interfaces, router, config normalization, mock
provider, adapters) — new. `packages/capability-model` stays pure: accepts an
optional injected adapter, reads no env, makes no network calls.
`packages/cli` reads config/env, chooses the provider via the router, and
injects a router-bound adapter into the builder.

## RELATIONSHIP TO SHIPPED CODE

The injectable seam already exists and is preserved, not replaced.
`@rekon/capability-model` already exports `IntentPlanSemanticNormalizationAdapter`
(`(input: { planText, goal?, kind? }) → { phases, warnings?, model?, provider? }`),
`IntentPlanSemanticMode`, and a provenance-tagged `normalizationTrace` with
deterministic fallback; `buildIntentPlanActionabilityReport` already accepts
`semanticNormalization` + `semanticMode`; `rekon intent plan review` already
exposes `--semantic off|auto|required`. New here: the shared `RekonLlmRouter` +
provider/embedding interfaces, the route/config/env/CLI provider-selection model,
and the rule that `intent plan answer` and future summarizers consume the **same**
router rather than each growing a separate adapter.

## OPTIONS CONSIDERED

A (one-off call inside the builder) — rejected: repeats wiring, impure core.
**B (shared router) — selected.** C (LLM-first, no deterministic baseline) —
rejected: must always re-validate deterministically. D (embeddings folded into
the completion provider) — rejected: separate interface.

## ROADMAP IMPACT

Revises the next step away from V1 publish reconciliation. Three slices, not ten:
(1) this decision; (2) Provider Routing Implementation; (3) Semantic
Normalization Integration / Dogfood (re-run fresh-repo + Circe dogfood on real
rough plans). Provider routing is infrastructure, but provider output stays
inside the same non-executing plan-compiler boundary.

## TESTS / VERIFICATION

Docs test (covers decision, boundaries, provider/embedding split, routing
priority, safety model, package placement, recommended next). Full 9-command
gate green. No source change, so no contract test and no rebuild semantics
changed.

## INTENTIONALLY UNTOUCHED

No `packages/llm-provider` created; no provider/router/config/CLI-flag code; the
existing `--semantic` flag, adapter seam, and `normalizationTrace` are unchanged.
No version bump, no npm publish, no branch.

## RISKS / FOLLOW-UP

Risk: the decision pins interfaces that implementation must honor; if a real
provider's JSON-mode contract differs, the `completeJson` shape may need a minor
additive revision at implementation time (caller-side schema validation already
absorbs provider variance). **Next step: Rekon LLM Provider Routing
Implementation.** Do not start it without a new confirmed Work Order against the
new SHA.

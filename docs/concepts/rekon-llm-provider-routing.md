# Rekon LLM Provider Routing

## What it is

Rekon routes LLM-backed semantic tasks through a **shared provider router**
rather than calling a model directly inside a capability builder. The router
lives in `@rekon/llm-provider`; the CLI owns provider selection and injects a
router-bound adapter into the pure builders.

```
CLI / orchestration
→ RekonLlmRouter        (resolves task → route → provider)
→ selected provider     (mock today; hosted providers later)
→ schema-constrained result
→ deterministic re-check (the actionability evaluator)
→ artifact
```

## The boundary

Providers **may read / transform / critique text**. Providers **may not approve
plans**, **may not execute commands**, **may not write source files**, **may not
run Circe**, and **may not implement intent:go**. **LLM output is proposal, not
proof:** every result is **schema-validated and deterministically re-checked**
before it is trusted. The router holds no execution power — it only routes text
in and structured proposals out, behind the existing non-executing
plan-compiler gates.

## Providers

`RekonLlmProvider` exposes `completeJson(input)` and returns a discriminated
`{ ok: true, data, ... } | { ok: false, error, ... }`. `RekonEmbeddingProvider`
exposes `embed(input)` and returns vectors. **Embeddings are separate from
completions** — they have different safety, caching, cost, and storage
implications and must not be mixed into one provider interface.

## Tasks and routes

Providers are **routed by task**, not hard-coded. Completion task routes:

```
plan.semantic-normalize
plan.answer-merge
plan.critique
plan.revision-prompt
artifact.summary
intent.classify
```

Embedding task routes (separate): `code.embedding`, `plan.similarity`,
`artifact.retrieval`.

The `RekonLlmRouter` resolves a task to a provider/model/mode using the priority
order **CLI override → task-specific route → default route → fallback**.

## Modes and fallback

`--semantic off|auto|required` controls how the router result is used:

- `off` — deterministic only; no adapter is built.
- `auto` — use a provider if configured and available; otherwise fall back
  deterministically with a recorded warning.
- `required` — fail clearly (non-zero exit, no report) when no provider is
  available or the result is unusable.

The report records provenance on `normalizationTrace` (`semantic-llm` with
provider/model, or `deterministic-fallback` with a warning).

## CLI

`rekon intent plan review` supports per-command overrides beside `--semantic`:

```bash
rekon intent plan review --plan <path> --semantic off|auto|required \
  --llm-provider <id> --llm-model <model> --json
```

Provider IDs and model names also come from the `REKON_LLM_PROVIDER`,
`REKON_LLM_MODEL`, and `REKON_LLM_ENABLED` environment variables. **Secrets
(API keys) live in the environment, never in repo config.** This slice registers
no live providers, so `--llm-provider <id>` deterministically falls back
(`auto`) or fails clearly (`required`) until a real provider adapter is wired.

## Related

- Decision: [`rekon-llm-provider-routing-semantic-normalization-decision.md`](../strategy/rekon-llm-provider-routing-semantic-normalization-decision.md)
- Implementation: [`rekon-llm-provider-routing-implementation.md`](../strategy/rekon-llm-provider-routing-implementation.md)
- Package: `@rekon/llm-provider`
- Consumer: [`intent-plan-compiler.md`](./intent-plan-compiler.md)

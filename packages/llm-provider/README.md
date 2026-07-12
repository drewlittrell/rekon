# `@rekon/llm-provider`

Shared Rekon LLM provider routing foundation.

Live adapters call the network only when the caller supplies an API key. The
package does not read environment variables or persist credentials.

## What it provides

- `RekonLlmProvider` / `RekonEmbeddingProvider` — completion and embedding
  provider interfaces, kept **separate** on purpose (different safety, caching,
  cost, and storage implications).
- `RekonLlmRouter` — resolves a `RekonLlmTask` to a provider/model/mode using
  the priority order **CLI override → task-specific route → default route →
  fallback**, then calls the selected provider.
- `createMockLlmProvider` / `createMockEmbeddingProvider` — deterministic test
  doubles.
- `createOpenAiLlmProvider` — OpenAI-compatible Chat Completions.
- `createOpenAiResponsesLlmProvider` — OpenAI Responses with structured output,
  effort controls, and detailed usage.
- `createAnthropicLlmProvider` — Anthropic Messages with structured output,
  effort controls, and detailed usage.
- `createVoyageEmbeddingProvider` — Voyage embeddings with output-dimension
  enforcement and token usage.
- `createDisabledLlmRouter` — a router that always falls back / fails per mode.
- `coercePhaseDrafts` — a structural schema gate for provider output.

The default Voyage profile is `voyage-4` at 512 dimensions. The evaluated
economy model is `voyage-4-lite`. Voyage 4 model-space compatibility is exposed
through `areVoyageEmbeddingModelsCompatible()`; older `voyage-code-3` vectors
are intentionally isolated.

## The boundary

Provider output is a **proposal, not proof.** Callers must schema-validate and
deterministically re-check every result before trusting it. Providers may
**read / transform / critique text** only. They never approve plans, execute
commands, write source files, or invoke downstream execution adapters. This
package holds no execution power; it only routes text in and structured
proposals out.

## Modes

- `off` — deterministic only; the router returns a fallback result.
- `auto` — use a provider if one is configured and available; otherwise fall
  back deterministically with a warning.
- `required` — fail clearly when no provider is available or the result is
  unusable.

## Stability

Label: `experimental, public`.

The provider and embedding interfaces, router, mock providers, and live adapter
factories are `experimental`. Internal helpers may change without notice. The
public surface follows the
[stability concept](../../docs/concepts/stability.md).

## Related

- Concept: `docs/concepts/rekon-llm-provider-routing.md`

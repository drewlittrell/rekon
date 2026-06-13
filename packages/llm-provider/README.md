# `@rekon/llm-provider`

Shared Rekon **LLM provider routing foundation.**

> **No live providers. No network calls.** This package ships the provider and
> embedding interfaces, a task-routed `RekonLlmRouter` with deterministic
> fallback, and a mock provider for tests. Wiring a real hosted provider is a
> later, opt-in step.

## What it provides

- `RekonLlmProvider` / `RekonEmbeddingProvider` — completion and embedding
  provider interfaces, kept **separate** on purpose (different safety, caching,
  cost, and storage implications).
- `RekonLlmRouter` — resolves a `RekonLlmTask` to a provider/model/mode using
  the priority order **CLI override → task-specific route → default route →
  fallback**, then calls the selected provider.
- `createMockLlmProvider` / `createMockEmbeddingProvider` — deterministic test
  doubles.
- `createDisabledLlmRouter` — a router that always falls back / fails per mode.
- `coercePhaseDrafts` — a structural schema gate for provider output.

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

The provider / embedding interfaces, `RekonLlmRouter`, the route-resolution
order, and the mock providers are `experimental` and published so external
callers can wire their own provider adapters against a stable shape. No live
provider ships in this package, so there is no network surface to stabilize yet.
Internal helpers may change without notice. The public surface (the exported
interfaces, the router, `createMockLlmProvider` / `createMockEmbeddingProvider`,
`createDisabledLlmRouter`, and `coercePhaseDrafts`) follows the
[stability concept](../../docs/concepts/stability.md).

## Related

- Concept: `docs/concepts/rekon-llm-provider-routing.md`

# @rekon/kernel-evidence

Pure TypeScript contracts and helpers for Rekon evidence.

## Stability

Label: `experimental, public`.

The core `EvidenceFact`, `EvidenceGraph`, and `EvidenceProvider` contracts are
the current public surface and are scheduled to harden toward `stable`. Symbols
not re-exported from the package root are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

This package owns the input evidence model:

- `EvidenceFact`
- `EvidenceGraph`
- `ProviderContext`
- `EvidenceProvider`
- evidence fact validation
- evidence graph validation
- deterministic evidence deduplication helpers

## Lifecycle Fit

Evidence is produced during `Observe` and consumed by projectors, graph
builders, evaluators, and fallback resolvers.

## Public Surface

Evidence graphs are typed Rekon artifacts and use `ArtifactHeader` from `@rekon/kernel-artifacts`.

Unknown evidence fact kinds are allowed. Community and external kinds should be namespaced, for example `openapi:route` or `my-pack/custom_fact`.

## Import Boundary

Import evidence contracts from this package root. Do not put language-specific
extractor logic here; that belongs in capabilities such as
`@rekon/capability-js-ts` or community packages.

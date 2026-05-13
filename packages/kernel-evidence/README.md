# @rekon/kernel-evidence

Pure TypeScript contracts and helpers for Rekon evidence.

This package owns:

- `EvidenceFact`
- `EvidenceGraph`
- `ProviderContext`
- `EvidenceProvider`
- evidence fact validation
- evidence graph validation
- deterministic evidence deduplication helpers

Evidence graphs are typed Rekon artifacts and use `ArtifactHeader` from `@rekon/kernel-artifacts`.

Unknown evidence fact kinds are allowed. Community and external kinds should be namespaced, for example `openapi:route` or `my-pack/custom_fact`.

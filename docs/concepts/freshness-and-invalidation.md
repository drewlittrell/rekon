# Freshness And Invalidation

Rekon records freshness in artifact headers and validates artifact relationships
through refs and indexes.

Freshness statuses:

- `fresh`
- `stale`
- `partial`
- `unknown`

Capabilities declare invalidation rules so future runtimes and current tooling
can understand which inputs should cause regeneration.

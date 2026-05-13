# Capability Migration Backlog

| Classic capability | Rekon role | Priority | Notes |
| --- | --- | --- | --- |
| JS/TS pack | evidence-provider | P0 | Initial built-in. |
| Observed repo | projector | P0 | Implemented as `@rekon/capability-model`. |
| Context resolver | resolver | P0 | Initial `resolve.preflight` implemented. |
| Docs generation | publisher | P1 | Initial docs publisher writes publication artifacts. |
| Rule evaluators | evaluator | P1 | Initial import/generated/unknown-system rules implemented. |
| Graph producers | projector | P1 | Initial import, symbol, and ownership graph slices implemented. |
| Memory | learner/resolver enrichment | P1 | Minimal feedback and deterministic selection implemented. |
| Intent | actuator/governor | P2 | Initial work-order artifacts implemented. |
| Reconciliation | actuator | P2 | Initial artifact-only dry-run implemented. |
| Watcher | lifecycle/runtime | P2 | Future freshness engine. |
| GitHub app | publisher/surface | P3 | Later. |
| Dashboard | publisher/surface | P3 | Later. |

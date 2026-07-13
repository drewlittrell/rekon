# Freshness And Invalidation

`rekon artifacts freshness` checks four causes of invalidation:

- tracked source or configuration content changed or disappeared;
- a newer artifact exists for an `inputRef`;
- an `inputRef` is missing;
- a recorded capability or handler version differs from the registered version.

For artifact types with multiple independent streams, producers declare
`header.supersession.key`. A newer artifact invalidates an input only when its
artifact type and supersession key both match. Examples include graph slice
types, publication kinds, resolver requests, source-report paths, memory
queries, and intent lineages. Repository-wide models and append-only ledgers
remain type-wide.

Snapshot construction applies the same identity rule: it retains the newest
artifact in every keyed stream and one newest generation for an unkeyed,
type-wide stream. This prevents a new import graph, resolver query, or
publication from evicting an unrelated stream of the same artifact type.
Only snapshot inputs, projections, and evaluations participate in snapshot
lineage and freshness. Publications and actions are upper-layer outputs and
cannot silently become lower-layer dependencies.

Artifacts record tracked files and producer versions in
`header.invalidation`. Derived artifacts continue to use `inputRefs` for
artifact lineage.

| Status | Meaning |
| --- | --- |
| `fresh` | All recorded inputs and versions still match. |
| `stale` | A tracked input, upstream artifact, or producer changed. |
| `partial` | Required lineage is missing. |
| `unknown` | Rekon cannot establish lineage or read the artifact. |

Incremental observation writes a complete latest-state `EvidenceGraph`: it
replaces changed or deleted file facts, retains unchanged facts, and recomputes
repository-wide manifest and TypeScript diagnostic evidence. The prior graph is
an `inputRef`.

Freshness checks only inputs recorded by the producer. Detecting newly added
unobserved files requires another observe run or an external changed-file list.
A watcher remains deferred until these rules have broader large-repository
evidence.

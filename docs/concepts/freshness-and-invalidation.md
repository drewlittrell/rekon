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

`rekon refresh` judges the artifacts emitted by that refresh. Its architecture
publication does not automatically attach WorkOrder or verification artifacts
from an earlier intent. Those artifacts remain indexed and inspectable, but a
new intent consumes proof only when the operator selects that lineage
explicitly.

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
an `inputRef` for provenance. That same-type predecessor is historical input,
so its supersession does not invalidate the current graph; the current graph's
own tracked-input baseline determines freshness.

`rekon context task` and CLI-hosted MCP `context_for_task` compare known source
digests and Git changed or untracked paths before compiling context. A stale or
missing graph triggers a deterministic refresh, scoped to changed files when
possible. This is an on-demand check, not a watcher.

After verified edits, agents record a digest-bound `ProofGateReport` and pass it
to `rekon refresh --proof-gate <ref>`. The report supplies the changed paths;
refresh rejects it when its repository identity differs, proof freshness is
unknown, or current source no longer matches. The gate becomes an input ref on
the new `EvidenceGraph`, so accepted projections and the snapshot retain a
transitive proof root. If no previous graph exists, the incremental request is
promoted to a full observation; otherwise unchanged facts are retained.

A proof gate also forms the freshness boundary between pre-change planning and
post-change maintenance. Refresh intentionally supersedes the task context and
planning artifacts that produced the gate. When a `ProofGateReport` is stale
only because those inputs became stale, that transitive status does not
invalidate the new generation rooted in the gate. Missing or unreadable proof,
or a gate with direct source, configuration, or producer invalidation, still
propagates. Proof-gated refresh revalidates the gate's source binding both
before observation and after all maintained writes.

Proof mode cannot skip publication or freshness checks. Existing adopted
repository law is reconciled against the new projection before snapshot
construction, and confirmed drift blocks acceptance. The refresh regenerates
the local guidance, repository summary, architecture summary, proof report,
agent contract, and managed agent instructions. Cached embedding records are
used only when their derived chunk digest exists in the current capability
graph; stale records are ignored without a provider call. The gate and source
bytes are validated again after the final write. Repositories without an
effective contract registry do not gain implicit law during refresh.

Verification proof uses the same byte-level rule before the gate is recorded.
An executed `VerificationRun` captures its bounded source state before and
after commands; a derived `VerificationResult` inherits the stable post-run
digest. `validate_change` compares that digest with the current change state.
Artifact timestamps remain provenance and display metadata and do not make
proof fresh.

`ContextUsageEvent` and `OutcomeEvent` are immutable historical records. Their
exact input refs must remain readable, but later repository generations do not
rewrite what was delivered or observed at that time. Current-state staleness
therefore stops at those event boundaries. Grounded evaluation remains a
derived artifact and must be regenerated when new events are accepted.

Proof-gated refresh synchronizes the managed instruction block before source
observation, records the accepted outcome, curates memory, and then writes the
snapshot and maintained publications. Repo-wide publications omit unrelated
task-local resolver, work-order, verification, and memory-selection lineage.
The maintained proof report cites the explicit `ProofGateReport` instead. A
final digest check still runs after artifact validation and freshness.

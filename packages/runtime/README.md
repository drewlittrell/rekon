# @rekon/runtime

Local filesystem runtime for Rekon.

## Stability

Label: `experimental, public`.

The artifact store, index validation, and lifecycle execution helpers are
public surfaces. Symbols not re-exported from the package root are
`internal`. See [docs/concepts/stability.md](../../docs/concepts/stability.md).

Current responsibilities:

- initialize `.rekon/`
- write and read typed JSON artifacts
- maintain `.rekon/registry/artifacts.index.json`
- validate artifact index entries, headers, paths, digests, and supersession
  identities
- validate source, config, artifact-lineage, and producer-version freshness
- load built-in capability objects directly
- enforce manifest-requested permissions
- run evidence providers
- run projectors
- run evaluators
- create an `IntelligenceSnapshot`
- run registered resolvers
- run publishers, learners, and actuators

## Lifecycle Fit

The runtime executes the local lifecycle against `.rekon/`:

`Observe -> Project -> Snapshot -> Evaluate -> Resolve -> Publish -> Learn -> Act`

Observation includes test files by default. Call `runObserve({ includeTests:
false })` for a source-only evidence graph; evidence providers are required to
honor that scope.

## Public Concepts

- `createRuntime()`
- `createLocalArtifactStore()`
- `ArtifactStore`
- `validateArtifactIndex()`
- `validateArtifactFreshness()`
- `loadRepositoryContractSources()`
- `PermissionPolicy`
- lifecycle run methods

`ArtifactStore.list(type, { order, limit })` orders by index `writtenAt` and
applies the limit after ordering. The SDK exposes the same option to capability
handlers; artifact ids are identities, not timestamps.

Freshness treats `ContextUsageEvent` and `OutcomeEvent` as immutable historical
records. Their exact refs remain integrity-checked, while current-state
staleness from an older repository generation does not propagate through the
event into a newly computed learning report.

Contract source discovery rejects traversal, symlinks, generated workspaces,
duplicate source IDs, and invalid documents.

Incremental observe retains unchanged evidence, replaces changed or deleted
file evidence, refreshes repository-wide facts, and records the prior graph as
lineage. If no prior graph exists, the runtime promotes the request to a full
observation so the first generation is complete. Callers may pass
`runObserve({ inputRefs })` to retain authorization or provenance artifacts in
the new graph header; those refs do not change provider inputs or fact
semantics.

Snapshots retain the newest artifact in each declared supersession family,
rather than one artifact per type. This keeps independent graph slices,
resolver queries, publications, and community artifact streams available at the
same time. Snapshot header lineage contains the selected inputs, projections,
and evaluations. Publications and actions are indexed for discoverability but
remain upper-layer outputs, not snapshot dependencies.

`runSnapshot({ artifactRefs })` restricts membership to an explicit candidate
set. The scan/refresh lifecycle uses this form so a current repository scan
does not inherit optional context or intent artifacts from an earlier run.
Omitting the option preserves the store-wide latest-family behavior for direct
snapshot callers.

New index entries cache `header.supersession.key` as `supersessionKey` and use
`null` for type-wide streams. Header/index agreement is validated. Store
initialization backfills valid legacy entries; unreadable entries remain
untouched for normal integrity validation to report.

## Import Boundary

Use runtime APIs for local artifact execution. Do not import package-private
helpers from `dist/` paths. The runtime receives capability objects; the CLI is
responsible for loading package names from `.rekon/config.json`.

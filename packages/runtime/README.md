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
- validate artifact index entries, headers, paths, and digests
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
- `PermissionPolicy`
- lifecycle run methods

## Import Boundary

Use runtime APIs for local artifact execution. Do not import package-private
helpers from `dist/` paths. The runtime receives capability objects; the CLI is
responsible for loading package names from `.rekon/config.json`.

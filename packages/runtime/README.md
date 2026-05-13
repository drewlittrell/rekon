# @rekon/runtime

Local filesystem runtime for Rekon.

## Stability

Experimental alpha.

Current alpha responsibilities:

- initialize `.rekon/`
- write and read typed JSON artifacts
- maintain `.rekon/registry/artifacts.index.json`
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

## Public Concepts

- `createRuntime()`
- `createLocalArtifactStore()`
- `ArtifactStore`
- `PermissionPolicy`
- lifecycle run methods

## Import Boundary

Use runtime APIs for local artifact execution. Do not import package-private
helpers from `dist/` paths. The runtime receives capability objects; the CLI is
responsible for loading package names from `.rekon/config.json`.

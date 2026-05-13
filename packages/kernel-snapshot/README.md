# @rekon/kernel-snapshot

Public IntelligenceSnapshot contract for Rekon.

## Stability

Stable alpha. The snapshot shape is a public kernel contract.

## Purpose

The snapshot is the central index of repository intelligence. It does not contain every artifact inline. It points to typed artifacts by `ArtifactRef` across these categories:

- inputs
- projections
- evaluations
- publications
- actions

## Lifecycle Fit

Snapshots are written after `Observe`, `Project`, `Evaluate`, `Publish`,
`Learn`, or `Act` runs. Resolvers consume snapshots instead of scanning the
workspace directly.

## Public Surface

The package exports:

- `IntelligenceSnapshot`
- `SnapshotCategory`
- `createIntelligenceSnapshot()`
- `validateIntelligenceSnapshot()`
- `refsForType()`
- `latestRefForType()`

## Import Boundary

Runtime writes snapshots under `.rekon/artifacts/snapshots`, but this package owns the public type, validation, and helper API.

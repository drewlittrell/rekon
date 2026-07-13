# @rekon/kernel-snapshot

Public IntelligenceSnapshot contract for Rekon.

## Stability

Label: `experimental, public`.

The snapshot shape is a public kernel contract and is scheduled to harden
toward `stable`. Symbols not re-exported from the package root are
`internal`. See [docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

The snapshot is the central index of repository intelligence. It does not contain every artifact inline. It points to typed artifacts by `ArtifactRef` across these categories:

- inputs
- projections
- evaluations
- publications
- actions

Each type may contain more than one ref when the artifacts declare independent
`header.supersession.key` streams. The runtime retains the newest generation of
each stream. Inputs, projections, and evaluations enter snapshot header
lineage; publications and actions remain indexed upper-layer outputs.

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

# @rekon/kernel-snapshot

Public IntelligenceSnapshot contract for Rekon.

The snapshot is the central index of repository intelligence. It does not contain every artifact inline. It points to typed artifacts by `ArtifactRef` across these categories:

- inputs
- projections
- evaluations
- publications
- actions

Runtime writes snapshots under `.rekon/artifacts/snapshots`, but this package owns the public type, validation, and helper API.

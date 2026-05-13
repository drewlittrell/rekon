# @rekon/kernel-repo-model

Public repository model artifact contracts for Rekon.

This package owns deterministic model artifacts derived from evidence:

- `ObservedRepo`
- `ObservedSystem`
- `OwnershipMap`
- `CapabilityMap`

These are projections, not canonical input truth. They must point back to evidence with `ArtifactRef`s.

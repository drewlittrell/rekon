# @rekon/kernel-repo-model

Public repository model artifact contracts for Rekon.

## Stability

Experimental alpha.

## Purpose

This package owns deterministic model artifacts derived from evidence:

- `ObservedRepo`
- `ObservedSystem`
- `OwnershipMap`
- `CapabilityMap`

## Lifecycle Fit

Model artifacts are produced during `Project` and consumed by resolvers,
policy, docs, and intent/work-order generation.

## Public Surface

The package also exports validation helpers and normalization helpers for
systems and paths.

## Import Boundary

These are projections, not canonical input truth. They must point back to evidence with `ArtifactRef`s.

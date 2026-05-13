# Observed Repo

ObservedRepo, OwnershipMap, and CapabilityMap are Rekon model projection artifacts.

They are derived from evidence and must include:

- an `ArtifactHeader`
- evidence refs for every derived system, ownership entry, or capability entry
- confidence values
- deterministic ordering for paths, layers, systems, and capabilities

Resolvers should prefer these model projections over raw evidence when both are available.

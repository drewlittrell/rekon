# Observed Repo

ObservedRepo, OwnershipMap, and CapabilityMap are Rekon model projection artifacts.

They are derived from evidence and must include:

- an `ArtifactHeader`
- evidence refs for every derived system, ownership entry, or capability entry
- confidence values
- deterministic ordering for paths, layers, systems, and capabilities

`OwnershipMap.entries[].basis` distinguishes `declared` ownership from
`inferred` grouping. Rekon's built-in JS/TS projection marks first-directory
ownership hints as inferred. Those entries support navigation and fallback,
but policy must not reinterpret them as operator-declared architecture.

Resolvers should prefer these model projections over raw evidence when both are available.

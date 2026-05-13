# Artifact Model

Rekon artifacts are typed JSON outputs with headers, provenance, and input refs.
They live under `.rekon/artifacts/` and are indexed by
`.rekon/registry/artifacts.index.json`.

## Layers

- inputs: `EvidenceGraph`
- projections: `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `GraphSlice`
- evaluations: `FindingReport`
- resolved outputs: `ResolverPacket`
- publications: `Publication`, `MemorySelection`
- actions: `WorkOrder`, `VerificationPlan`, `ReconciliationPlan`,
  `ReconciliationLog`, `ActionLog`

Lower layers may feed upper layers. Upper layers may not silently become
lower-layer truth.

## Required Header Fields

Every artifact includes:

- `artifactType`
- `artifactId`
- `schemaVersion`
- `generatedAt`
- `subject.repoId`
- `producer.id`
- `producer.version`
- `inputRefs`

See [artifact-header.md](./artifact-header.md).

## Artifact Docs

- [Artifact header](./artifact-header.md)
- [EvidenceGraph](./evidence-graph.md)
- [IntelligenceSnapshot](./intelligence-snapshot.md)
- [ObservedRepo](./observed-repo.md)
- [GraphSlice](./graph-slice.md)
- [FindingReport](./finding-report.md)
- [ResolverPacket](./resolver-packet.md)
- [Memory artifacts](./memory-artifacts.md)
- [WorkOrder](./work-order.md)
- [ReconciliationLog](./reconciliation-log.md)

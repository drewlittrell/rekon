# Artifact Model

Rekon artifacts are typed outputs written under `.rekon/artifacts`. They are
the durable interface between observation, projection, evaluation, resolution,
publication, and action.

Every artifact should include:

- `header.artifactType`
- `header.artifactId`
- `header.schemaVersion`
- `header.generatedAt`
- `header.subject`
- `header.producer`
- `header.inputRefs`
- `header.freshness`
- provenance where the producer can provide it

Common references:

- [Artifact contract](artifact-contract.md)
- [Artifact header](artifact-header.md)
- [EvidenceGraph](evidence-graph.md)
- [ObservedRepo](observed-repo.md)
- [IntelligenceSnapshot](intelligence-snapshot.md)
- [ResolverPacket](resolver-packet.md)
- [Memory artifacts](memory-artifacts.md)
- [ReconciliationLog](reconciliation-log.md)

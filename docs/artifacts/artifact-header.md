# Artifact Header

## Purpose

`ArtifactHeader` is the shared metadata contract for every Rekon artifact.

## Produced By

Every artifact producer: runtime, evidence providers, projectors, evaluators,
resolvers, publishers, learners, and actuators.

## Consumed By

The runtime artifact store, snapshot writer, resolvers, publishers, conformance
tests, and users inspecting `.rekon/artifacts`.

## Required Fields

- `artifactType`
- `artifactId`
- `schemaVersion`
- `generatedAt`
- `subject.repoId`
- `producer.id`
- `producer.version`
- `inputRefs`

## Common Fields

- `snapshotId`
- `subject.paths`
- `subject.systems`
- `freshness.status`
- `freshness.invalidatedBy`
- `provenance.confidence`
- `provenance.notes`

## Example

```json
{
  "artifactType": "ResolverPacket",
  "artifactId": "preflight-123",
  "schemaVersion": "0.1.0",
  "generatedAt": "2026-05-13T18:00:00.000Z",
  "subject": {
    "repoId": "simple-js-ts",
    "paths": ["src/index.ts"],
    "systems": ["src"]
  },
  "producer": {
    "id": "@rekon/capability-resolver",
    "version": "0.1.0"
  },
  "inputRefs": [
    { "type": "IntelligenceSnapshot", "id": "snapshot-123", "schemaVersion": "0.1.0" }
  ],
  "freshness": { "status": "fresh" },
  "provenance": { "confidence": 0.8 }
}
```

## Freshness And Provenance

Freshness describes whether an artifact is current relative to its declared
inputs. Provenance explains who produced the artifact and how much confidence
the producer has in the output.

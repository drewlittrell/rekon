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
- `invalidation.inputs`
- `invalidation.producers`
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
  "invalidation": {
    "inputs": [
      { "kind": "source", "path": "src/index.ts", "digest": "sha256" }
    ],
    "producers": [
      { "id": "@rekon/capability-resolver", "version": "1.0.0" }
    ]
  },
  "freshness": { "status": "fresh" },
  "provenance": { "confidence": 0.8 }
}
```

## Freshness And Provenance

Freshness describes whether an artifact is current relative to its declared
inputs. Provenance explains who produced the artifact and how much confidence
the producer has in the output.

`invalidation.inputs` binds an artifact to source or configuration content.
`invalidation.producers` binds it to capability or handler versions. Both are
optional because some canonical operator inputs have no repository file
dependency.

`freshness.status` is a per-artifact declaration set by the producer at
write time. It is not a runtime evaluation. Today's runtime evaluates
freshness after the fact, against the artifact index, via
`validateArtifactFreshness()` (`rekon artifacts freshness`). The per-artifact
`status` field reflects what the producer thought was true when it wrote
the artifact; the index-wide check tells you what is still true now.

`supersession.key` identifies the logical stream an artifact belongs to. A
newer artifact supersedes only older artifacts with the same type and key.
Types without a key retain type-wide supersession behavior.

See [docs/concepts/freshness-and-invalidation.md](../concepts/freshness-and-invalidation.md)
for the full statuses, checks, and CLI surface.

## Integrity Versus Freshness

`rekon artifacts validate` and `rekon artifacts freshness` answer
different questions:

- `validate` — index/header/digest integrity. An artifact can be valid
  but stale.
- `freshness` — does the artifact's lineage still match the latest
  inputs? Reports `fresh`, `stale`, `partial`, or `unknown` per artifact
  and in aggregate.

## Index Integrity

The artifact header is cross-checked against
`.rekon/registry/artifacts.index.json`. The index entry type, id, schema
version, path, digest, and optional supersession key must match the artifact on
disk. Run:

```sh
node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json
```

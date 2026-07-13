# IntelligenceSnapshot

## Purpose

`IntelligenceSnapshot` is Rekon's shared index of repository intelligence. It
points to the latest known artifact in each supersession family by
`ArtifactRef`; it does not embed artifacts inline. Independent streams of the
same type, such as import and ownership graph slices, remain present together.

## Produced By

- `@rekon/runtime.snapshot`

## Consumed By

- `@rekon/capability-resolver`
- `@rekon/capability-docs`
- future publishers, evaluators, and actuators

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`IntelligenceSnapshot`.

## Common Fields

- `repo`
- `inputs`
- `projections`
- `evaluations`
- `publications`
- `actions`
- `status.freshness`
- `status.warnings`
- `status.blockedReasons`

## Example

```json
{
  "header": {
    "artifactType": "IntelligenceSnapshot",
    "artifactId": "snapshot-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/runtime.snapshot", "version": "0.1.0" },
    "inputRefs": [
      { "type": "EvidenceGraph", "id": "evidence-123", "schemaVersion": "0.1.0", "digest": "..." },
      { "type": "OwnershipMap", "id": "ownership-123", "schemaVersion": "0.1.0", "digest": "..." }
    ]
  },
  "repo": { "id": "simple-js-ts", "root": "examples/simple-js-ts" },
  "inputs": { "EvidenceGraph": [] },
  "projections": { "OwnershipMap": [] },
  "evaluations": { "FindingReport": [], "AssessmentReport": [] },
  "publications": {},
  "actions": {},
  "status": {
    "freshness": "fresh",
    "warnings": [],
    "blockedReasons": []
  }
}
```

## Freshness And Provenance

The snapshot status summarizes the runtime's view at write time:

- `fresh`: latest evidence exists and index validation produced no warnings
- `unknown`: no `EvidenceGraph` is indexed
- `partial`: evidence exists, but index validation failed or an expected
  projection family is incomplete after projection started
- `stale`: the latest evidence has changed tracked source, configuration, or
  producer inputs

Snapshot warnings explicitly name missing evidence, malformed index entries, or
missing expected projection artifacts. Publications and memory may enrich
resolver output, but they do not rewrite lower-layer facts.

The snapshot header cites every ref selected into `inputs`, `projections`, and
`evaluations`. Publications and actions remain indexed in the body for
discoverability, but they are upper-layer outputs rather than snapshot inputs.
This avoids circular lineage when a publication consumes a snapshot. Prior
snapshots are excluded. Artifact types unknown to the built-in runtime are
retained under `actions`, which keeps community artifacts discoverable without
requiring runtime-specific registration.

The snapshot records the freshness of every selected member when written;
obsolete history does not affect its status. The index-wide
`rekon artifacts freshness` command re-evaluates every indexed artifact later
and can mark a snapshot stale once its selected inputs change. See
[docs/concepts/freshness-and-invalidation.md](../concepts/freshness-and-invalidation.md).

# IntelligenceSnapshot

## Purpose

`IntelligenceSnapshot` is Rekon's shared index of repository intelligence. It
points to the latest known artifacts by `ArtifactRef`; it does not embed every
artifact inline.

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
      { "type": "EvidenceGraph", "id": "evidence-123", "schemaVersion": "0.1.0" }
    ]
  },
  "repo": { "id": "simple-js-ts", "root": "examples/simple-js-ts" },
  "inputs": { "EvidenceGraph": [] },
  "projections": { "OwnershipMap": [] },
  "evaluations": { "FindingReport": [] },
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
- `stale`: reserved for future file-change invalidation work informed by
  `validateArtifactFreshness()`

Snapshot warnings explicitly name missing evidence, malformed index entries, or
missing expected projection artifacts. Publications and memory may enrich
resolver output, but they do not rewrite lower-layer facts.

The per-snapshot `status.freshness` is independent of the index-wide
`rekon artifacts freshness` check. The snapshot status reflects what the
runtime thought when it wrote the snapshot. `rekon artifacts freshness`
re-evaluates lineage across every indexed artifact after the fact and can
mark older snapshots `stale` once newer artifacts arrive. See
[docs/concepts/freshness-and-invalidation.md](../concepts/freshness-and-invalidation.md).

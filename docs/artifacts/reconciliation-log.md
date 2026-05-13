# ReconciliationLog

## Purpose

`ReconciliationLog` records dry-run or applied reconciliation operations. In
the current alpha, reconciliation is artifact-only and dry-run by default.

## Produced By

- `@rekon/capability-reconcile`

## Consumed By

- users reviewing planned or applied operations
- future publishers and verification tools

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`ReconciliationLog`.

## Common Fields

- `planRef`
- `applied`
- `deferred`

Related action artifacts:

- `ReconciliationPlan`
- `ActionLog`

## Example

```json
{
  "header": {
    "artifactType": "ReconciliationLog",
    "artifactId": "reconciliation-log-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-reconcile", "version": "0.1.0" },
    "inputRefs": [
      { "type": "ReconciliationPlan", "id": "reconciliation-plan-123", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 1 }
  },
  "applied": [],
  "deferred": ["docs_regeneration"]
}
```

## Freshness And Provenance

Reconciliation logs must point to their plan. Source-writing and command-running
operations are denied by default in the current alpha.

# ReconciliationLog

## Purpose

`ReconciliationLog` records the operations a `ReconciliationPlan`
considered, grouped by their final status. In the current alpha,
reconciliation is artifact-only by default; source-writing and command
operations always end up in the `deferred` bucket.

## Produced By

- `@rekon/capability-reconcile`

## Consumed By

- users and agents reviewing planned, applied, or deferred operations
- future publishers, dashboards, and verification recorders

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`ReconciliationLog`. `inputRefs` includes at least the
`ReconciliationPlan` this log records and, for suggestion-mode logs,
the upstream `WorkOrder` and/or `CoherencyDelta`.

## Common Fields

- `planRef` — the `ReconciliationPlan` artifact this log covers.
- `applied` — operations whose final status is `applied` (operation
  name strings).
- `deferred` — operations whose final status is `deferred` (operation
  name strings).
- `planned` — optional, `ReconciliationPlanOperation[]` detail for
  operations whose final status is `planned`.
- `denied` — optional, `ReconciliationPlanOperation[]` detail for
  operations whose final status is `denied`.

`applied` and `deferred` retain the original string-array shape for
backwards compatibility with the alpha. Detailed per-operation
status, class, and permission requirements live in
`ReconciliationPlan.operations`.

## Example — manual mode (artifact-only)

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
  "planRef": { "type": "ReconciliationPlan", "id": "reconciliation-plan-123", "schemaVersion": "0.1.0" },
  "applied": [],
  "deferred": ["docs_regeneration"],
  "planned": [{ "operation": "docs_regeneration", "status": "planned", "class": "artifact-only" }],
  "denied": []
}
```

## Example — suggestion mode

```json
{
  "header": {
    "artifactType": "ReconciliationLog",
    "artifactId": "reconciliation-log-456",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-14T12:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-reconcile", "version": "0.1.0" },
    "inputRefs": [
      { "type": "ReconciliationPlan", "id": "reconciliation-plan-456", "schemaVersion": "0.1.0" },
      { "type": "WorkOrder", "id": "work-order-...", "schemaVersion": "0.1.0" },
      { "type": "CoherencyDelta", "id": "coherency-delta-...", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.8 }
  },
  "planRef": { "type": "ReconciliationPlan", "id": "reconciliation-plan-456", "schemaVersion": "0.1.0" },
  "applied": [],
  "deferred": ["safe_import_rewrite", "safe_import_rewrite", "safe_import_rewrite"],
  "planned": [],
  "denied": []
}
```

## Freshness And Provenance

Reconciliation logs must point to their plan. Source-writing and
command-running operations are deferred by default in the current
alpha. `rekon artifacts freshness` will mark a log `stale` when its
plan or any of its upstream governance artifacts changes.

## Cross-References

- [ReconciliationPlan](reconciliation-plan.md)
- [Reconciliation plans concept](../concepts/reconciliation-plans.md)
- [WorkOrder](work-order.md)
- [CoherencyDelta](coherency-delta.md)

# ReconciliationLog

`ReconciliationLog` records the result of a reconciliation operation.

## Produced By

- reconciliation actuators

## Common Fields

- `header`
- `operation`
- `status`
- `applied`
- `deferred`
- `warnings`

Reconciliation remains permissioned and artifact-first. Source writes require
explicit permission.

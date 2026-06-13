# FindingReport

`FindingReport` groups findings emitted by evaluators.

## Produced By

- policy and evaluator capabilities

## Consumed By

- resolvers
- publications
- work-order and remediation flows

## Common Fields

- `header`
- `summary`
- `findings[]`

Findings should include severity, subjects, affected files when known,
evidence refs, and status when available.

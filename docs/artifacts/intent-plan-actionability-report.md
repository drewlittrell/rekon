# IntentPlanActionabilityReport

`IntentPlanActionabilityReport` reviews a rough plan before it becomes prepared
work. It identifies missing scope, acceptance criteria, verification evidence,
and ambiguity.

It is a review artifact, not an approval.

## Produced By

- `rekon intent plan review`

## Common Fields

- `header`
- `status`
- `sourcePlan`
- `normalizedPhases`
- `findings`
- `elicitationQuestions`
- `revisionPrompt`
- `summary`
- `boundaries`

## Status Values

- `actionable`
- `needs-revision`
- `blocked`

## Boundaries

The report does not approve plans, create a prepared plan, create work orders,
create verification plans, execute commands, or write source files.

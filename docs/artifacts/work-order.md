# WorkOrder

## Purpose

`WorkOrder` is an action-oriented artifact derived from a preflight packet. It
turns resolved intelligence into scoped work guidance and verification
requirements.

## Produced By

- `@rekon/capability-intent`

## Consumed By

- users and agents executing work
- future verification recorders and publishers

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`WorkOrder`.

## Common Fields

- `goal`
- `paths`
- `ownerSystems`
- `riskNotes`
- `requiredChecks`
- `successCriteria`
- `relevantFindings`
- `relevantMemory`
- `antiGamingInstruction`
- `markdown`

## Example

```json
{
  "header": {
    "artifactType": "WorkOrder",
    "artifactId": "work-order-123",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-13T18:00:00.000Z",
    "subject": {
      "repoId": "simple-js-ts",
      "paths": ["src/index.ts"],
      "systems": ["src"]
    },
    "producer": { "id": "@rekon/capability-intent", "version": "0.1.0" },
    "inputRefs": [
      { "type": "ResolverPacket", "id": "preflight-123", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.8 }
  },
  "goal": "modify bootstrap",
  "paths": ["src/index.ts"],
  "ownerSystems": ["src"],
  "requiredChecks": ["npm run typecheck", "npm run test", "npm run build"],
  "antiGamingInstruction": "Do not bypass failing checks, delete tests, or weaken validation to make verification pass."
}
```

## Freshness And Provenance

Work orders are invalid when their input preflight packet changes. They are
guidance artifacts, not source changes.

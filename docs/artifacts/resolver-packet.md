# ResolverPacket

## Purpose

`ResolverPacket` is a resolved output artifact.

The initial packet is `resolve.preflight`, which takes a goal and path, then
returns owner systems, matched scopes, risk, required checks, relevant findings,
recommended context, applicable memory, warnings, resolution trace, and next
steps.

## Produced By

- `@rekon/capability-resolver`

## Consumed By

- `@rekon/capability-docs`
- `@rekon/capability-intent`
- users and agents preparing scoped work

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`ResolverPacket`.

## Common Fields

- `goal`
- `paths`
- `ownerSystems`
- `matchedScopes`
- `risk`
- `requiredChecks`
- `relevantFindings`
- `recommendedContext`
- `applicableMemory`
- `warnings`
- `resolutionTrace`
- `nextSteps`

`resolutionTrace` explains why the packet contains its ownership and risk
answers. Trace entries include:

- `step`
- `sourceType`
- `sourceRef` when a concrete artifact was checked or used
- `status`
- `message`
- optional `paths`, `systems`, `confidence`, and `details`

For `resolve.preflight`, ownership resolution checks sources in this order:

1. `OwnershipMap`
2. `ObservedRepo`
3. ownership `GraphSlice`
4. raw `EvidenceGraph` `ownership_hint` facts

Fallbacks are recorded explicitly. Silent fallback is not acceptable for
resolver packets.

## Example Resolution Trace

```json
{
  "step": "ownership.resolve",
  "sourceType": "OwnershipMap",
  "sourceRef": {
    "type": "OwnershipMap",
    "id": "ownership-map-123",
    "schemaVersion": "0.1.0"
  },
  "status": "used",
  "message": "Resolved owner system from OwnershipMap.",
  "paths": ["src/index.ts"],
  "systems": ["src"],
  "confidence": 0.9,
  "details": {
    "matches": [
      {
        "path": "src/index.ts",
        "matchedPath": "src/index.ts",
        "owner": "src",
        "confidence": 0.9
      }
    ]
  }
}
```

## Risk Trace

Risk rules also write trace entries. For example, multiple owner systems produce
a high-risk trace with `details.rule` set to `multiple_owner_systems`.

## Freshness And Provenance

Resolver packets point to the snapshot and artifacts they used through
`inputRefs`. If they fall back to raw evidence, the fallback appears in
`resolutionTrace` and `warnings`.
